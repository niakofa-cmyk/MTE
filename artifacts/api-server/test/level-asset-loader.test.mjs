import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createNodAuthoritativeMatch,
} from "../src/lib/match-bootstrap.ts";
import { DEFAULT_MATCH_CONFIG } from "../src/lib/authoritative-match.ts";
import { loadLevelGeometryAsset } from "../src/lib/level-asset-loader.ts";
import { StaticWorldCollisionMap } from "../src/lib/static-world-collision-map.ts";

function structure(overrides = {}) {
  return {
    id: 1,
    type: "building",
    posX: 5,
    posY: 1,
    posZ: 4,
    sizeX: 2,
    sizeY: 2,
    sizeZ: 2,
    ...overrides,
  };
}

test("loads center-and-size footprints into the bounded collision map", () => {
  const map = new StaticWorldCollisionMap(100);
  const count = loadLevelGeometryAsset(JSON.stringify([structure()]), map);

  assert.equal(count, 1);
  assert.equal(map.size, 1);
  assert.equal(
    map.traceRay(
      { x: 0, y: 1, z: 4 },
      { x: 1, y: 0, z: 0 },
      10,
    ),
    4,
  );
});

test("rejects malformed, duplicate, unknown-field, and invalid-size structures", () => {
  const map = new StaticWorldCollisionMap(100);
  assert.throws(() => loadLevelGeometryAsset("{", map), /malformed JSON/);
  assert.throws(() => loadLevelGeometryAsset("{}", map), /must contain an array/);
  assert.throws(
    () => loadLevelGeometryAsset(JSON.stringify([structure(), structure()]), map),
    /duplicate id/,
  );
  assert.throws(
    () => loadLevelGeometryAsset(JSON.stringify([structure({ sizeX: 0 })]), map),
    /dimensions must be positive/,
  );
  assert.throws(
    () => loadLevelGeometryAsset(JSON.stringify([{ ...structure(), extra: true }]), map),
    /invalid schema/,
  );
  assert.equal(map.size, 0);
});

test("validates the entire asset before changing map state and enforces limits", () => {
  const map = new StaticWorldCollisionMap(10, 2);
  assert.throws(
    () =>
      loadLevelGeometryAsset(
        JSON.stringify([
          structure({ id: 1, posX: 0, posZ: 0 }),
          structure({ id: 2, posX: 20, posZ: 0 }),
        ]),
        map,
      ),
    /inside world bounds/,
  );
  assert.equal(map.size, 0);

  const oneColliderMap = new StaticWorldCollisionMap(100, 1);
  assert.throws(
    () =>
      loadLevelGeometryAsset(
        JSON.stringify([
          structure({ id: 1 }),
          structure({ id: 2, posX: 10 }),
        ]),
        oneColliderMap,
      ),
    /capacity/,
  );
  assert.equal(oneColliderMap.size, 0);

  assert.throws(
    () => loadLevelGeometryAsset(" ".repeat(1_048_577), map),
    /1 MiB size limit/,
  );
  assert.throws(
    () => loadLevelGeometryAsset(JSON.stringify(Array(4_097).fill(null)), map),
    /structure limit/,
  );
});

test("boots an authoritative match from the generated Nod geometry file", async () => {
  const assetPath = fileURLToPath(
    new URL("../src/data/generated/nod-level-geometry.json", import.meta.url),
  );
  const json = await readFile(assetPath, "utf8");
  const structures = JSON.parse(json);
  const { match, loadedGeometryCount } = await createNodAuthoritativeMatch(
    DEFAULT_MATCH_CONFIG,
    assetPath,
  );

  assert.equal(loadedGeometryCount, structures.length);
  assert.ok(loadedGeometryCount > 0);
  assert.throws(
    () =>
      match.registerPlayer("blocked-by-map", {
        x: structures[0].posX,
        y: 0,
        z: structures[0].posZ,
      }),
    /intersects static world geometry/,
  );
  match.registerPlayer("clear-spawn", { x: 1_000, y: 0, z: 1_000 });
});
