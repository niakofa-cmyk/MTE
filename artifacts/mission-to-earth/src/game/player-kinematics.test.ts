import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boostSlideVelocity,
  maxMovementSpeed,
  stepHorizontalVelocity,
  stepVerticalVelocity,
} from "./player-kinematics.ts";

describe("player kinematics", () => {
  it("applies movement tuning in the same order as the mission engine", () => {
    assert.equal(
      maxMovementSpeed({
        operator: "bodhi",
        weaponMove: 1,
        inUnravel: true,
        raActive: false,
        crouched: false,
        sliding: false,
        sprinting: true,
        aiming: false,
        dropping: false,
      }),
      5.6 * 1.12 * 1.5 * 1.5,
    );
    assert.equal(
      maxMovementSpeed({
        operator: "khensu",
        weaponMove: 1,
        inUnravel: false,
        raActive: true,
        crouched: true,
        sliding: false,
        sprinting: true,
        aiming: true,
        dropping: false,
      }),
      5.6 * 0.92 * 0.55 * 0.56 * 0.62,
    );
  });

  it("keeps the parachute drop speed override", () => {
    assert.equal(
      maxMovementSpeed({
        operator: "nefret",
        weaponMove: 0.8,
        inUnravel: true,
        raActive: true,
        crouched: true,
        sliding: false,
        sprinting: true,
        aiming: true,
        dropping: true,
      }),
      17,
    );
  });

  it("boosts slide momentum without changing its direction", () => {
    assert.deepEqual(boostSlideVelocity(3, -4), { vx: 3.9000000000000004, vz: -5.2 });
  });

  it("uses exponential acceleration for ordinary ground and air movement", () => {
    const dt = 0.1;
    const blend = 1 - Math.exp(-13 * dt);
    assert.deepEqual(
      stepHorizontalVelocity({
        vx: 0,
        vz: 0,
        wishX: 1,
        wishZ: 0,
        maxSpeed: 6,
        acceleration: 13,
        dt,
        sliding: false,
        slideDrag: 0.85,
        slideSteer: 8,
      }),
      { vx: 6 * blend, vz: 0 },
    );
  });

  it("applies slide drag and operator-specific steering", () => {
    const dt = 0.2;
    const decay = Math.exp(-0.18 * dt);
    assert.deepEqual(
      stepHorizontalVelocity({
        vx: 5,
        vz: 0,
        wishX: 0,
        wishZ: 1,
        maxSpeed: 6,
        acceleration: 13,
        dt,
        sliding: true,
        slideDrag: 0.18,
        slideSteer: 4,
      }),
      { vx: 5 * decay, vz: 0.8 },
    );
  });

  it("slows wall-run descent and caps fast falls while jump is held", () => {
    assert.equal(stepVerticalVelocity(0, 0.1, 30, false, false), -3);
    assert.equal(stepVerticalVelocity(0, 0.1, 30, true, false), -0.9);
    assert.equal(stepVerticalVelocity(-20, 0.1, 30, false, true), -11);
  });
});
