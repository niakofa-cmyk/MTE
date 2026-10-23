import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEARCH_SECONDS } from "./enemy-ai.ts";
import {
  chooseFlankPosition,
  coordinatedCombatRole,
  findCoverPlans,
  searchWaypoint,
  selectSquadSignal,
  stepCoverExposure,
  type CoverObstacle,
} from "./enemy-tactics.ts";

describe("enemy tactics", () => {
  it("searches a bounded eight-point area for the whole search window", () => {
    const points = Array.from({ length: 8 }, (_, index) =>
      searchWaypoint(20, -10, index * (SEARCH_SECONDS / 8), 0),
    );
    assert.equal(new Set(points.map(({ x, z }) => `${x.toFixed(2)},${z.toFixed(2)}`)).size, 8);
    for (const point of points) {
      assert.ok(Math.abs(Math.hypot(point.x - 20, point.z + 10) - 7) < 1e-8);
    }
    assert.deepEqual(searchWaypoint(20, -10, SEARCH_SECONDS, 0), points[7]);
    assert.notDeepEqual(searchWaypoint(20, -10, 0, 1), points[0]);
  });

  it("chooses a cover slot between the guard and a threat, with a clear peek point", () => {
    const cover: CoverObstacle = {
      minX: -1.4,
      maxX: 1.4,
      minZ: -0.38,
      maxZ: 0.38,
      alive: true,
      tag: "cover",
    };
    const canStand = (x: number, z: number) => !(x > -1.4 && x < 1.4 && z > -0.38 && z < 0.38);
    const plans = findCoverPlans(-9, 2, 0, -10, [cover], canStand);
    assert.equal(plans.length, 1);
    const [plan] = plans;
    assert.ok(plan);
    assert.ok(plan.hide.z > 0);
    assert.ok(Math.abs(plan.peek.x) > Math.abs(plan.hide.x));
    assert.ok(canStand(plan.hide.x, plan.hide.z));
    assert.ok(canStand(plan.peek.x, plan.peek.z));
  });

  it("ignores destroyed cover and doors", () => {
    const plans = findCoverPlans(
      -9,
      2,
      0,
      -10,
      [
        { minX: -1, maxX: 1, minZ: -0.4, maxZ: 0.4, alive: false, tag: "cover" },
        { minX: -1, maxX: 1, minZ: -0.4, maxZ: 0.4, alive: true, tag: "door" },
      ],
      () => true,
    );
    assert.deepEqual(plans, []);
  });

  it("alternates covered holds and short exposed firing windows", () => {
    const peeking = stepCoverExposure("hide", 1.4, 0.1);
    assert.equal(peeking.phase, "peek");
    assert.ok(Math.abs(peeking.elapsed - 0.05) < 1e-8);
    const hidden = stepCoverExposure(peeking.phase, peeking.elapsed, 0.91);
    assert.equal(hidden.phase, "hide");
    assert.ok(hidden.elapsed < 0.02);
  });

  it("finds a flank point on the requested side of the threat", () => {
    const left = chooseFlankPosition(0, 0, 0, -10, -1, () => true);
    const right = chooseFlankPosition(0, 0, 0, -10, 1, () => true);
    assert.ok(left && right);
    assert.ok(left.x < 0);
    assert.ok(right.x > 0);
    assert.ok(Math.hypot(left.x, left.z + 10) > 7);
    assert.ok(Math.hypot(right.x, right.z + 10) > 7);
  });

  it("skips unreachable flank candidates", () => {
    const point = chooseFlankPosition(0, 0, 0, -10, -1, () => true, (x) => x < -2);
    assert.ok(point && point.x < -2);
  });

  it("shares the highest-priority nearby contact and ignores distant contacts", () => {
    const signals = [
      { senderId: 1, senderX: 4, senderZ: 0, targetX: 8, targetZ: 0, state: "investigate" as const, seenNow: false },
      { senderId: 2, senderX: 8, senderZ: 0, targetX: 9, targetZ: 1, state: "engage" as const, seenNow: false },
      { senderId: 3, senderX: 100, senderZ: 0, targetX: 100, targetZ: 1, state: "engage" as const, seenNow: true },
    ];
    const signal = selectSquadSignal(0, 0, 0, signals, 20);
    assert.equal(signal?.senderId, 2);
    assert.equal(selectSquadSignal(0, 0, 0, signals, 3), null);
  });

  it("assigns one close guard to hold and the others to flank", () => {
    const participants = [
      { id: 2, x: 8, z: 0 },
      { id: 3, x: 3, z: 0 },
      { id: 4, x: 12, z: 0 },
    ];
    assert.equal(coordinatedCombatRole(3, 0, 0, participants), "anchor");
    assert.equal(coordinatedCombatRole(2, 0, 0, participants), "flanker");
  });
});
