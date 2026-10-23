import assert from "node:assert/strict";
import test from "node:test";
import { StaticWorldCollisionMap } from "../src/lib/static-world-collision-map.ts";

function mapWithBox(box, maxColliders = 4_096) {
  const map = new StaticWorldCollisionMap(100, maxColliders);
  map.addStaticBounds(box);
  return map;
}

test("copies validated bounds and rejects malformed or out-of-world geometry", () => {
  const bounds = {
    min: { x: 1, y: 0, z: -2 },
    max: { x: 2, y: 3, z: 2 },
  };
  const map = mapWithBox(bounds);
  bounds.min.x = 50;

  assert.equal(map.size, 1);
  assert.equal(map.isPositionClear({ x: 1.5, y: 0, z: 0 }), false);
  assert.equal(map.isPositionClear({ x: 0, y: 0, z: 0 }), true);

  assert.throws(
    () =>
      map.addStaticBounds({
        min: { x: 3, y: 0, z: 0 },
        max: { x: 2, y: 1, z: 1 },
      }),
    /positive volume/,
  );
  assert.throws(
    () =>
      map.addStaticBounds({
        min: { x: 0, y: 0, z: 0 },
        max: { x: 101, y: 1, z: 1 },
      }),
    /world bounds/,
  );
  assert.throws(
    () =>
      map.addStaticBounds({
        min: { x: 0, y: 0, z: 0 },
        max: { x: Number.NaN, y: 1, z: 1 },
      }),
    /finite/,
  );
});

test("caps collider count and rejects invalid player body queries", () => {
  const map = mapWithBox(
    { min: { x: 1, y: 0, z: 1 }, max: { x: 2, y: 2, z: 2 } },
    1,
  );
  assert.throws(
    () =>
      map.addStaticBounds({
        min: { x: 3, y: 0, z: 3 },
        max: { x: 4, y: 2, z: 4 },
      }),
    /capacity/,
  );
  assert.throws(
    () => map.isPositionClear({ x: 0, y: 0, z: 0 }, -1),
    /dimensions/,
  );
});

test("blocks swept horizontal movement while allowing a slide along the wall", () => {
  const map = mapWithBox({
    min: { x: 1, y: 0, z: -3 },
    max: { x: 1.2, y: 2, z: 3 },
  });

  const result = map.resolveHorizontalMovement(
    { x: 0, y: 0, z: 0 },
    3,
    2,
  );

  assert.equal(result.blockedX, true);
  assert.equal(result.blockedZ, false);
  assert.ok(Math.abs(result.position.x - 0.65) < 1e-9);
  assert.equal(result.position.z, 2);
});

test("recovers movement that begins inside static geometry", () => {
  const map = mapWithBox({
    min: { x: 1, y: 0, z: -3 },
    max: { x: 2, y: 2, z: 3 },
  });

  const result = map.resolveHorizontalMovement(
    { x: 1.2, y: 0, z: 0 },
    0,
    -1,
  );

  assert.equal(result.blockedX, true);
  assert.equal(result.blockedZ, false);
  assert.equal(result.position.x, 0.65);
  assert.equal(result.position.z, -1);
  assert.equal(map.isPositionClear(result.position), true);
});

test("ray slabs handle parallel and vertical directions and nearest range", () => {
  const map = mapWithBox({
    min: { x: 1, y: 0, z: 1 },
    max: { x: 2, y: 3, z: 2 },
  });

  assert.equal(
    map.traceRay(
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      10,
    ),
    null,
  );
  assert.equal(
    map.traceRay(
      { x: 0, y: 1, z: 1.5 },
      { x: 5, y: 0, z: 0 },
      10,
    ),
    1,
  );
  assert.equal(
    map.traceRay(
      { x: 1.5, y: -1, z: 1.5 },
      { x: 0, y: 8, z: 0 },
      10,
    ),
    1,
  );
  assert.equal(
    map.traceRay(
      { x: 0, y: 1, z: 1.5 },
      { x: 1, y: 0, z: 0 },
      0.5,
    ),
    null,
  );
  assert.equal(
    map.traceRay(
      { x: 1.5, y: 1, z: 1.5 },
      { x: 1, y: 0, z: 0 },
      10,
    ),
    0,
  );
  assert.throws(
    () =>
      map.traceRay(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        10,
      ),
    /non-zero/,
  );
});
