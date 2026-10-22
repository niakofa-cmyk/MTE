import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAimAssist } from "./aim-assist.ts";

const eye = { x: 0, y: 1.6, z: 0 };

describe("aim assist", () => {
  it("slows the look when a target sits in the cone and does not pull past it", () => {
    const assisted = applyAimAssist({
      origin: eye,
      yaw: 0,
      pitch: 0,
      lookX: 10,
      lookY: 4,
      targets: [{ x: 0, y: 1.6, z: -12 }],
      dt: 1 / 60,
    });
    assert.equal(assisted.locked, true);
    assert.ok(Math.abs(assisted.lookX - 6) < 0.001);
    assert.ok(Math.abs(assisted.yawPull) < 0.001);
  });

  it("eases toward a target just off the crosshair", () => {
    const assisted = applyAimAssist({
      origin: eye,
      yaw: 0,
      pitch: 0,
      lookX: 0,
      lookY: 0,
      targets: [{ x: 0.9, y: 1.6, z: -10 }],
      dt: 1 / 60,
    });
    assert.equal(assisted.locked, true);
    assert.ok(assisted.yawPull < 0);
  });

  it("ignores targets outside the cone or past the range", () => {
    const wide = applyAimAssist({
      origin: eye,
      yaw: 0,
      pitch: 0,
      lookX: 10,
      lookY: 0,
      targets: [{ x: 8, y: 1.6, z: -10 }],
      dt: 1 / 60,
    });
    assert.equal(wide.locked, false);
    assert.equal(wide.lookX, 10);
    const far = applyAimAssist({
      origin: eye,
      yaw: 0,
      pitch: 0,
      lookX: 10,
      lookY: 0,
      targets: [{ x: 0, y: 1.6, z: -180 }],
      dt: 1 / 60,
    });
    assert.equal(far.locked, false);
  });

  it("scales a 10px look delta to 6 when the target is on the sightline", () => {
    const assisted = applyAimAssist({
      origin: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      lookX: 10,
      lookY: 0,
      targets: [{ x: 0, y: 1.2, z: -20 }],
      dt: 1 / 60,
    });
    assert.equal(assisted.locked, true);
    assert.equal(assisted.lookX, 6);
  });

  it("passes the raw look delta when the target is outside the cone", () => {
    const assisted = applyAimAssist({
      origin: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      lookX: 10,
      lookY: 5,
      targets: [{ x: 40, y: 0, z: -5 }],
      dt: 1 / 60,
    });
    assert.equal(assisted.locked, false);
    assert.equal(assisted.lookX, 10);
    assert.equal(assisted.lookY, 5);
    assert.equal(assisted.yawPull, 0);
    assert.equal(assisted.pitchPull, 0);
  });
});
