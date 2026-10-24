import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { advanceSafeZoneCenter, shouldCollapseSafeZone } from "./safe-zone.ts";

describe("safe-zone collapse timing", () => {
  it("keeps the rescue phase intact until the beacon is raised", () => {
    assert.equal(shouldCollapseSafeZone(false, false, 300), false);
    assert.equal(shouldCollapseSafeZone(true, false, 300), false);
  });

  it("starts collapsing after the grace period once extraction is ready", () => {
    assert.equal(shouldCollapseSafeZone(true, true, 18), false);
    assert.equal(shouldCollapseSafeZone(true, true, 18.01), true);
  });

  it("rejects invalid timing values", () => {
    assert.equal(shouldCollapseSafeZone(true, true, Number.NaN), false);
    assert.equal(shouldCollapseSafeZone(true, true, 30, Number.NaN), false);
    assert.equal(shouldCollapseSafeZone(true, true, 30, -1), false);
  });
});

describe("safe-zone movement", () => {
  it("does not leave a stationary player behind when an objective changes", () => {
    const center = { x: 12, z: -8 };
    const next = advanceSafeZoneCenter(
      center,
      { x: -80, z: 80 },
      { x: 0, z: 0 },
      12,
    );

    assert.deepEqual(next, center);
  });

  it("advances no faster than the player's progress toward the objective", () => {
    const next = advanceSafeZoneCenter(
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 4, z: 0 },
      5,
    );

    assert.deepEqual(next, { x: 20, z: 0 });
  });

  it("does not advance when the player moves across or away from the route", () => {
    const center = { x: 0, z: 0 };
    const target = { x: 100, z: 0 };

    assert.deepEqual(
      advanceSafeZoneCenter(center, target, { x: 0, z: 4 }, 3),
      center,
    );
    assert.deepEqual(
      advanceSafeZoneCenter(center, target, { x: -4, z: 0 }, 3),
      center,
    );
  });

  it("respects the speed cap, target distance, and invalid timing values", () => {
    assert.deepEqual(
      advanceSafeZoneCenter(
        { x: 0, z: 0 },
        { x: 100, z: 0 },
        { x: 20, z: 0 },
        2,
        3,
      ),
      { x: 6, z: 0 },
    );
    assert.deepEqual(
      advanceSafeZoneCenter(
        { x: 0, z: 0 },
        { x: 2, z: 0 },
        { x: 20, z: 0 },
        10,
      ),
      { x: 2, z: 0 },
    );

    const center = { x: 3, z: 4 };
    assert.deepEqual(
      advanceSafeZoneCenter(center, { x: 100, z: 0 }, { x: 5, z: 0 }, Number.NaN),
      center,
    );
  });
});
