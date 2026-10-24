import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectiveNavigator } from "./objective-navigation.ts";
import { isNavigationSegmentClear } from "./navigation.ts";

const worldLimit = 160;
const extractionLaneCover: Array<[number, number, number, number]> = [
  [21.8, 24.6, -20.38, -19.62],
];
const playerRadius = 0.42;

function canStand(x: number, z: number) {
  return !extractionLaneCover.some(
    ([minX, maxX, minZ, maxZ]) =>
      x + playerRadius > minX &&
      x - playerRadius < maxX &&
      z + playerRadius > minZ &&
      z - playerRadius < maxZ,
  );
}

describe("objective navigation", () => {
  it("routes the extraction bearing around the cover that blocks the direct approach", () => {
    const start = { x: 22.5, z: -19.2 };
    const extraction = { x: 0, z: -138 };
    const navigator = new ObjectiveNavigator();
    const guidance = navigator.update(start, extraction, canStand, worldLimit);

    assert.equal(canStand(start.x, start.z), true);
    assert.equal(canStand(extraction.x, extraction.z), true);
    assert.equal(
      isNavigationSegmentClear(start.x, start.z, extraction.x, extraction.z, canStand),
      false,
    );
    assert.equal(guidance.reachable, true);
    assert.equal(guidance.requiresDetour, true);
    assert.notDeepEqual(guidance.target, extraction);
    assert.equal(
      isNavigationSegmentClear(
        start.x,
        start.z,
        guidance.target.x,
        guidance.target.z,
        canStand,
      ),
      true,
    );
    assert.ok(guidance.points.length > 1);
  });

  it("advances to the next safe waypoint after the player reaches one", () => {
    const navigator = new ObjectiveNavigator();
    const goal = { x: 0, z: -138 };
    const first = navigator.update({ x: 22.5, z: -19.2 }, goal, canStand, worldLimit);
    const second = navigator.update(first.target, goal, canStand, worldLimit);

    assert.notDeepEqual(second.target, first.target);
    assert.equal(
      isNavigationSegmentClear(
        first.target.x,
        first.target.z,
        second.target.x,
        second.target.z,
        canStand,
      ),
      true,
    );
  });

  it("rebuilds a safe route when the player leaves the suggested path", () => {
    const navigator = new ObjectiveNavigator();
    const goal = { x: 0, z: -138 };
    const initial = navigator.update({ x: 22.5, z: -19.2 }, goal, canStand, worldLimit);
    const offRouteStart = { x: 26, z: -20 };
    const rerouted = navigator.update(offRouteStart, goal, canStand, worldLimit);

    assert.equal(rerouted.reachable, true);
    assert.notDeepEqual(rerouted.target, initial.target);
    assert.equal(
      isNavigationSegmentClear(
        offRouteStart.x,
        offRouteStart.z,
        rerouted.target.x,
        rerouted.target.z,
        canStand,
      ),
      true,
    );
  });

  it("rebuilds the route when the objective changes", () => {
    const navigator = new ObjectiveNavigator();
    const start = { x: 22.5, z: -19.2 };
    const firstGoal = { x: 0, z: -138 };
    const secondGoal = { x: 40, z: 80 };
    const first = navigator.update(start, firstGoal, canStand, worldLimit);
    const second = navigator.update(start, secondGoal, canStand, worldLimit);

    assert.notDeepEqual(second.target, first.target);
    assert.equal(second.points.at(-1)?.x, secondGoal.x);
    assert.equal(second.points.at(-1)?.z, secondGoal.z);
  });
});
