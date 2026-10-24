import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BEACON_HOLD_SECONDS,
  getExtractionHudState,
  RECOVERY_LOCK_SECONDS,
  type ExtractionHudInput,
} from "./extraction-hud.ts";

const base: ExtractionHudInput = {
  missionActive: true,
  descendantsRescued: true,
  beaconRaised: false,
  beaconChannelSeconds: 0,
  inBeaconRadius: false,
  recoveryLockSeconds: 0,
  inRecoveryRadius: false,
  counterPushStarted: false,
  activeHostileCount: 0,
};

describe("extraction HUD state", () => {
  it("stays hidden until the mission and both descendant rescues are active", () => {
    assert.equal(getExtractionHudState({ ...base, missionActive: false }).visible, false);
    assert.equal(getExtractionHudState({ ...base, descendantsRescued: false }).visible, false);
    assert.equal(getExtractionHudState(base).visible, false);
  });

  it("shows the real beacon hold duration inside the beacon radius", () => {
    const state = getExtractionHudState({ ...base, inBeaconRadius: true });
    assert.equal(state.stage, "beacon");
    assert.equal(state.title, "BEACON CHANNEL");
    assert.equal(state.countdown, `${BEACON_HOLD_SECONDS.toFixed(1)}s`);
    assert.equal(state.status, "HOLD E TO RAISE THE BEACON");
    assert.equal(state.percent, 0);
  });

  it("shows remaining beacon time, progress, and incoming counter-push status", () => {
    const state = getExtractionHudState({
      ...base,
      inBeaconRadius: true,
      beaconChannelSeconds: 1.6,
    });
    assert.equal(state.countdown, "3.0s");
    assert.equal(state.percent, (1.6 / BEACON_HOLD_SECONDS) * 100);
    assert.equal(state.threats, "COUNTER-PUSH EXPECTED");
  });

  it("warns when beacon charge is decaying outside the hold radius", () => {
    const state = getExtractionHudState({
      ...base,
      beaconChannelSeconds: 2,
      activeHostileCount: 3,
      counterPushStarted: true,
    });
    assert.equal(state.visible, true);
    assert.equal(state.boundaryWarning, true);
    assert.equal(state.status, "OUTSIDE BEACON RADIUS · CHARGE DECAYING");
    assert.equal(state.threats, "COUNTER-PUSH · 3 HOSTILES");
  });

  it("hides the beacon panel when its abandoned progress has decayed away", () => {
    assert.equal(
      getExtractionHudState({ ...base, beaconChannelSeconds: 0.05 }).visible,
      false,
    );
  });

  it("shows the recovery countdown and contact count inside the actual pad radius", () => {
    const state = getExtractionHudState({
      ...base,
      beaconRaised: true,
      inRecoveryRadius: true,
      recoveryLockSeconds: 2.5,
      counterPushStarted: true,
      activeHostileCount: 1,
    });
    assert.equal(state.stage, "recovery");
    assert.equal(state.title, "RECOVERY LOCK");
    assert.equal(state.countdown, "3.5s");
    assert.equal(state.status, "HOLD INSIDE THE RECOVERY PAD");
    assert.equal(state.threats, "EXTRACTION CONTACT · 1 HOSTILE");
    assert.equal(state.percent, (2.5 / RECOVERY_LOCK_SECONDS) * 100);
    assert.equal(state.hasThreats, true);
  });

  it("warns when recovery-lock progress is decaying outside the pad", () => {
    const state = getExtractionHudState({
      ...base,
      beaconRaised: true,
      recoveryLockSeconds: 4,
    });
    assert.equal(state.visible, true);
    assert.equal(state.boundaryWarning, true);
    assert.equal(state.status, "OUTSIDE PAD RADIUS · LOCK PROGRESS DECAYING");
  });

  it("clamps progress and ignores non-finite counters", () => {
    const state = getExtractionHudState({
      ...base,
      inBeaconRadius: true,
      beaconChannelSeconds: Number.POSITIVE_INFINITY,
      activeHostileCount: Number.NaN,
    });
    assert.equal(state.countdown, "4.6s");
    assert.equal(state.percent, 0);
    assert.equal(state.hasThreats, false);
    assert.equal(state.threats, "COUNTER-PUSH EXPECTED");
  });

  it("clamps progress beyond the recovery duration", () => {
    const state = getExtractionHudState({
      ...base,
      beaconRaised: true,
      inRecoveryRadius: true,
      recoveryLockSeconds: 99,
    });
    assert.equal(state.countdown, "0.0s");
    assert.equal(state.percent, 100);
  });
});
