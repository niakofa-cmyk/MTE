import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RADIUS,
  STEP,
  applyCoverDamage,
  firstSolidRayHit,
  floorHeight,
  movementBlocked,
  separateAabbOverlap,
  xzHit,
} from "./world-physics.ts";

function box(overrides: Partial<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
  alive: boolean;
  destructible: boolean;
  hp: number;
  tag: string;
  reinforced: boolean;
}> = {}) {
  return {
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
    h: 2,
    alive: true,
    destructible: true,
    hp: 50,
    tag: "solid",
    reinforced: false,
    ...overrides,
  };
}

describe("world collision and cover damage", () => {
  it("keeps the existing strict edge-contact behavior for box overlap", () => {
    const solid = box();

    assert.equal(xzHit(0, 0, 0.1, solid), true);
    assert.equal(xzHit(1.1, 0, 0.1, solid), false);
  });

  it("blocks tall live boxes but allows step-height and destroyed boxes", () => {
    const tall = box({ h: STEP + 0.01 });
    const step = box({ h: STEP });
    const destroyed = box({ alive: false });

    assert.equal(movementBlocked(0, 0, 0, [tall]), tall);
    assert.equal(movementBlocked(0, 0, 0, [step]), null);
    assert.equal(movementBlocked(0, 0, 0, [destroyed]), null);
    assert.equal(RADIUS, 0.42);
  });

  it("finds the highest nearby walkable surface within the step limit", () => {
    const low = box({ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5, h: 0.4 });
    const tooHigh = box({ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5, h: 1 });

    assert.equal(floorHeight(0, 0, 0, [low, tooHigh]), 0.4);
    assert.equal(floorHeight(4, 4, 0, [low]), 0);
  });

  it("separates from the shallowest side and keeps stable tie-breaking", () => {
    assert.deepEqual(separateAabbOverlap(1.1, 0, 0.5, box()), { x: 1.52, z: 0 });
    assert.deepEqual(separateAabbOverlap(-1.1, 0, 0.5, box()), { x: -1.52, z: 0 });
    assert.deepEqual(separateAabbOverlap(0, 1.1, 0.5, box()), { x: 0, z: 1.52 });
    assert.deepEqual(separateAabbOverlap(0, -1.1, 0.5, box()), { x: 0, z: -1.52 });
    assert.deepEqual(separateAabbOverlap(0, 0, 0.5, box()), { x: -1.52, z: 0 });
    assert.deepEqual(separateAabbOverlap(4, 4, 0.5, box()), { x: 4, z: 4 });
  });

  it("reports when cover damage crosses the break threshold without handling effects", () => {
    const cover = box({ hp: 12 });

    assert.equal(applyCoverDamage(cover, 5), false);
    assert.equal(cover.hp, 7);
    assert.equal(applyCoverDamage(cover, 8), true);
    assert.equal(cover.alive, true);
    assert.equal(cover.hp, -1);
  });

  it("does not damage non-destructible, dead, or invalid targets", () => {
    const solid = box({ destructible: false });
    const destroyed = box({ alive: false });
    const cover = box();

    assert.equal(applyCoverDamage(solid, 10), false);
    assert.equal(applyCoverDamage(destroyed, 10), false);
    assert.equal(applyCoverDamage(cover, Number.NaN), false);
    assert.equal(cover.hp, 50);
  });

  it("forgives a small miss around a live prison-door edge when unobstructed", () => {
    const door = box({
      minX: -1,
      maxX: 1,
      minZ: 5,
      maxZ: 6,
      h: 4.4,
      tag: "door",
    });

    const hit = firstSolidRayHit(
      { x: 1.1, y: 4.55, z: 0 },
      { x: 0, y: 0, z: 1 },
      [door],
      10,
    );

    assert.equal(hit?.box, door);
    assert.equal(hit?.distance, 5);
  });

  it("keeps adjacent solid geometry in front of the forgiving door hit volume", () => {
    const door = box({
      minX: -1,
      maxX: 1,
      minZ: 5,
      maxZ: 6,
      h: 4.4,
      tag: "door",
    });
    const wall = box({
      minX: 1,
      maxX: 3,
      minZ: 5,
      maxZ: 6,
      h: 8,
      destructible: false,
    });

    const hit = firstSolidRayHit(
      { x: 1.1, y: 1.5, z: 0 },
      { x: 0, y: 0, z: 1 },
      [door, wall],
      10,
    );

    assert.equal(hit?.box, wall);
  });

  it("does not let a door's forgiving hit volume bypass a nearer wall", () => {
    const door = box({
      minX: -1,
      maxX: 1,
      minZ: 5,
      maxZ: 6,
      h: 4.4,
      tag: "door",
    });
    const wall = box({
      minX: -2,
      maxX: 2,
      minZ: 2,
      maxZ: 3,
      h: 8,
      destructible: false,
    });

    const hit = firstSolidRayHit(
      { x: 0, y: 1.5, z: 0 },
      { x: 0, y: 0, z: 1 },
      [door, wall],
      10,
    );

    assert.equal(hit?.box, wall);
    assert.equal(hit?.distance, 2);
  });
});
