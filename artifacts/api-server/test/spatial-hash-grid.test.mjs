import assert from "node:assert/strict";
import test from "node:test";
import { SpatialHashGrid } from "../src/lib/spatial-hash-grid.ts";

function item(id, x, z) {
  return { id, position: { x, z } };
}

test("queries return only points within exact radius, including negative cells", () => {
  const grid = new SpatialHashGrid(10);
  const near = item("near", -3, -1);
  const edge = item("edge", 3, 4);
  const diagonalOutside = item("outside", 9, 9);
  grid.insert(near);
  grid.insert(edge);
  grid.insert(diagonalOutside);

  const out = [item("stale", 0, 0)];
  const count = grid.queryRadius(0, 0, 5, out);

  assert.equal(count, 2);
  assert.deepEqual(new Set(out.map((entry) => entry.id)), new Set(["near", "edge"]));
});

test("nested cell coordinates do not wrap and collide like 16-bit packed keys", () => {
  const grid = new SpatialHashGrid(64);
  const origin = item("origin", 1, 1);
  const far = item("far", 64 * 65_536 + 1, 1);
  grid.insert(origin);
  grid.insert(far);

  const out = [];
  grid.queryRadius(1, 1, 2, out);
  assert.deepEqual(out.map((entry) => entry.id), ["origin"]);
});

test("finds local candidates in a five-thousand-item index", () => {
  const grid = new SpatialHashGrid(64);
  const targetIndex = 2_345;
  let target;
  for (let index = 0; index < 5_000; index += 1) {
    const entry = item(
      `player-${index}`,
      (index % 100) * 100,
      Math.floor(index / 100) * 100,
    );
    if (index === targetIndex) target = entry;
    grid.insert(entry);
  }

  const out = [];
  const count = grid.queryRadius(
    target.position.x,
    target.position.z,
    20,
    out,
  );
  assert.equal(grid.size, 5_000);
  assert.equal(count, 1);
  assert.equal(out[0].id, `player-${targetIndex}`);
});

test("updates move items between cells and removal releases empty cells", () => {
  const grid = new SpatialHashGrid(10);
  const moving = item("moving", 9, 0);
  grid.insert(moving);

  moving.position.x = 11;
  grid.update(moving);
  const oldCell = [];
  const newCell = [];
  grid.queryRadius(9, 0, 0.5, oldCell);
  grid.queryRadius(11, 0, 0.5, newCell);
  assert.equal(oldCell.length, 0);
  assert.deepEqual(newCell.map((entry) => entry.id), ["moving"]);

  assert.equal(grid.remove(moving), true);
  assert.equal(grid.remove(moving), false);
  assert.equal(grid.size, 0);
  grid.queryRadius(11, 0, 1, newCell);
  assert.equal(newCell.length, 0);
});

test("rejects invalid coordinates and pathological query ranges", () => {
  const grid = new SpatialHashGrid(10, 16);
  assert.throws(() => grid.insert(item("nan", Number.NaN, 0)), /finite/);
  assert.throws(() => grid.queryRadius(0, 0, -1, []), /finite/);
  assert.throws(() => grid.queryRadius(0, 0, 1_000, []), /cell limit/);
});
