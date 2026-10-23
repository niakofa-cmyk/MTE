import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  exportStaticWorldGeometry,
  serializeStaticLevelGeometry,
} from "./level-geometry-export.ts";
import type { WorldData } from "./world.ts";

function box(overrides: Partial<WorldData["buildings"][number]> = {}) {
  return {
    minX: 10,
    maxX: 16,
    minZ: -8,
    maxZ: -2,
    h: 4,
    alive: true,
    destructible: false,
    hp: 100,
    maxHp: 100,
    tag: "building",
    glow: "cyan" as const,
    reinforced: false,
    ...overrides,
  };
}

describe("static level geometry export", () => {
  it("maps simulation bounds into centered server footprints", () => {
    const nodes = exportStaticWorldGeometry({
      buildings: [box()],
      covers: [],
    });

    assert.deepEqual(nodes, [
      {
        id: 1_000,
        type: "building",
        posX: 13,
        posY: 2,
        posZ: -5,
        sizeX: 6,
        sizeY: 4,
        sizeZ: 6,
      },
    ]);
  });

  it("omits destroyed and destructible boxes from the static map", () => {
    const nodes = exportStaticWorldGeometry({
      buildings: [
        box(),
        box({ minX: 20, maxX: 21, destructible: true }),
        box({ minX: 30, maxX: 31, alive: false }),
      ],
      covers: [box({ minX: 40, maxX: 41, destructible: true })],
    });

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]?.id, 1_000);
  });

  it("serializes deterministically and rejects invalid manifests", () => {
    const nodes = exportStaticWorldGeometry({
      buildings: [box()],
      covers: [],
    });
    const serialized = serializeStaticLevelGeometry(nodes);
    assert.equal(serialized, serializeStaticLevelGeometry(nodes));
    assert.ok(serialized.endsWith("\n"));
    assert.throws(
      () =>
        serializeStaticLevelGeometry([
          nodes[0]!,
          { ...nodes[0]!, id: nodes[0]!.id },
        ]),
      /duplicate id/,
    );
    assert.throws(
      () =>
        exportStaticWorldGeometry({
          buildings: [box({ h: Number.POSITIVE_INFINITY })],
          covers: [],
        }),
      /invalid posY/,
    );
  });
});
