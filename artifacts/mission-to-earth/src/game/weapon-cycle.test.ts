import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WeaponCycle } from "./weapon-cycle.ts";

describe("weapon cycle", () => {
  it("gates semi-automatic shots on a new press and automatic shots by rate", () => {
    const semi = new WeaponCycle();
    const shot = {
      automatic: false,
      wanted: true,
      now: 0,
      interval: 0.1,
      magazine: 3,
    };

    assert.equal(semi.attemptShot(shot), "shot");
    assert.equal(semi.attemptShot({ ...shot, now: 0.2 }), "wait");
    assert.equal(
      semi.attemptShot({ ...shot, wanted: false, now: 0.2 }),
      "wait",
    );
    assert.equal(semi.attemptShot({ ...shot, now: 0.2 }), "shot");

    const automatic = new WeaponCycle();
    const autoShot = { ...shot, automatic: true };
    assert.equal(automatic.attemptShot(autoShot), "shot");
    assert.equal(automatic.attemptShot({ ...autoShot, now: 0.05 }), "wait");
    assert.equal(automatic.attemptShot({ ...autoShot, now: 0.1 }), "shot");
  });

  it("reports empty magazines separately and blocks firing during a reload", () => {
    const cycle = new WeaponCycle();
    const shot = {
      automatic: true,
      wanted: true,
      now: 0,
      interval: 0.1,
      magazine: 0,
    };

    assert.equal(cycle.attemptShot(shot), "empty");
    assert.equal(cycle.beginReload(0, 10, 15, 2), true);
    assert.equal(cycle.attemptShot({ ...shot, magazine: 5 }), "wait");
  });

  it("shows reload progress and transfers only the rounds the magazine needs", () => {
    const cycle = new WeaponCycle();

    assert.equal(cycle.beginReload(4, 10, 12, 2), true);
    assert.equal(cycle.reloadProgress, 0);
    assert.equal(cycle.tickReload(1, 4, 12, 10), null);
    assert.equal(cycle.reloadProgress, 0.5);
    assert.deepEqual(cycle.tickReload(1, 4, 12, 10), {
      magazine: 10,
      reserve: 6,
    });
    assert.equal(cycle.isReloading, false);
    assert.equal(cycle.reloadProgress, 0);
  });

  it("does not start for full magazines or empty reserve, and cancels cleanly", () => {
    const cycle = new WeaponCycle();

    assert.equal(cycle.beginReload(10, 10, 5, 2), false);
    assert.equal(cycle.beginReload(2, 10, 0, 2), false);
    assert.equal(cycle.beginReload(2, 10, 5, 2), true);

    cycle.cancelReload();
    assert.equal(cycle.isReloading, false);
    assert.equal(cycle.reloadProgress, 0);
    assert.equal(cycle.tickReload(2, 2, 5, 10), null);
  });
});
