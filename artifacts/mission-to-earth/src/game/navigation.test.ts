import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findNavigationPath } from "./navigation.ts";

const worldLimit = 30;

function pointBlockedByRectangles(x: number, z: number, rectangles: Array<[number, number, number, number]>) {
  return rectangles.some(([minX, maxX, minZ, maxZ]) => x > minX && x < maxX && z > minZ && z < maxZ);
}

describe("guard navigation", () => {
  it("uses a direct waypoint when the last-known position is reachable in a straight line", () => {
    const path = findNavigationPath(0, 0, 10, 4, () => true, worldLimit);
    assert.deepEqual(path, [{ x: 10, z: 4 }]);
  });

  it("routes around an obstacle instead of walking into it", () => {
    const wall: Array<[number, number, number, number]> = [[3, 7, -5, 5]];
    const canStand = (x: number, z: number) => !pointBlockedByRectangles(x, z, wall);
    const path = findNavigationPath(0, 0, 10, 0, canStand, worldLimit);
    assert.ok(path && path.length > 1);
    assert.ok(path.every((point) => canStand(point.x, point.z)));
    assert.ok(path.some((point) => Math.abs(point.z) >= 6));
    let previous = { x: 0, z: 0 };
    for (const point of path) {
      const distance = Math.hypot(point.x - previous.x, point.z - previous.z);
      const samples = Math.ceil(distance / 0.25);
      for (let i = 0; i <= samples; i++) {
        const t = i / Math.max(1, samples);
        assert.ok(canStand(previous.x + (point.x - previous.x) * t, previous.z + (point.z - previous.z) * t));
      }
      previous = point;
    }
  });

  it("does not cut diagonally through a blocked corner", () => {
    const blocks: Array<[number, number, number, number]> = [
      [-1, 1, 1, 3],
      [1, 3, -1, 1],
    ];
    const canStand = (x: number, z: number) => !pointBlockedByRectangles(x, z, blocks);
    const path = findNavigationPath(0, 0, 6, 6, canStand, worldLimit);
    assert.ok(path);
    for (const point of path) assert.ok(canStand(point.x, point.z));
  });

  it("returns null when a closed obstacle surrounds the last-known position", () => {
    const walls: Array<[number, number, number, number]> = [
      [-2, 2, 1, 3],
      [-2, 2, -3, -1],
      [-3, -1, -2, 2],
      [1, 3, -2, 2],
    ];
    const canStand = (x: number, z: number) => !pointBlockedByRectangles(x, z, walls);
    assert.equal(findNavigationPath(-8, 0, 0, 0, canStand, worldLimit), null);
  });
});
