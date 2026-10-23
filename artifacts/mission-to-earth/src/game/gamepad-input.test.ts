import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GAMEPAD_LOOK_PIXELS_PER_SECOND,
  readGamepadInput,
} from "./gamepad-input.ts";

function gamepad(axes: number[], buttons: { pressed: boolean; value: number }[] = []) {
  return { axes, buttons };
}

describe("standard gamepad controls", () => {
  it("uses the left stick for 2D translation and the full right stick for look", () => {
    const input = readGamepadInput(gamepad([-1, -1, 1, -1]), 0.1);

    assert.equal(input.moveX, -1);
    assert.equal(input.moveY, 1);
    assert.equal(input.lookX, GAMEPAD_LOOK_PIXELS_PER_SECOND * 0.1);
    assert.equal(input.lookY, -GAMEPAD_LOOK_PIXELS_PER_SECOND * 0.1);
  });

  it("maps left and right triggers to separate hands and right-stick click to focus", () => {
    const buttons = Array.from({ length: 12 }, () => ({ pressed: false, value: 0 }));
    buttons[6] = { pressed: false, value: 0.8 };
    buttons[7] = { pressed: true, value: 0.35 };
    buttons[11] = { pressed: true, value: 1 };
    const input = readGamepadInput(gamepad([0, 0, 0, 0], buttons), 1 / 60);

    assert.equal(input.fireLeft, true);
    assert.equal(input.fireRight, true);
    assert.equal(input.focus, true);
  });

  it("returns neutral input when disconnected and filters stick drift", () => {
    assert.deepEqual(readGamepadInput(null, 1 / 60), {
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      fireRight: false,
      fireLeft: false,
      focus: false,
    });
    assert.equal(readGamepadInput(gamepad([0.1, 0, 0, 0]), 1 / 60).moveX, 0);
  });
});
