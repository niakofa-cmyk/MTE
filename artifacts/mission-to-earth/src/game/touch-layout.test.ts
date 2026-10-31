import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TOUCH_LAYOUT,
  parseTouchLayout,
  TOUCH_CONTROL_PRESETS,
  touchZoneForScreenSide,
} from "./touch-layout.ts";

test("touch layout defaults to tactical right-handed controls", () => {
  assert.deepEqual(parseTouchLayout(null), DEFAULT_TOUCH_LAYOUT);
  assert.deepEqual(parseTouchLayout("not-json"), DEFAULT_TOUCH_LAYOUT);
});

test("touch layout accepts valid saved settings and rejects invalid values", () => {
  assert.deepEqual(
    parseTouchLayout(JSON.stringify({ profile: "advanced", handedness: "left" })),
    { profile: "advanced", handedness: "left" },
  );
  assert.deepEqual(
    parseTouchLayout(JSON.stringify({ profile: "unlisted", handedness: "middle" })),
    DEFAULT_TOUCH_LAYOUT,
  );
});

test("left and right screen zones swap movement and look for handedness", () => {
  assert.equal(touchZoneForScreenSide("left", "right"), "MOVEMENT");
  assert.equal(touchZoneForScreenSide("right", "right"), "LOOK_COMBAT");
  assert.equal(touchZoneForScreenSide("left", "left"), "LOOK_COMBAT");
  assert.equal(touchZoneForScreenSide("right", "left"), "MOVEMENT");
});

test("touch presets provide bounded values for each skill level", () => {
  assert.equal(TOUCH_CONTROL_PRESETS.tactical.look, 1.7);
  assert.ok(TOUCH_CONTROL_PRESETS.beginner.look < TOUCH_CONTROL_PRESETS.advanced.look);
  assert.ok(TOUCH_CONTROL_PRESETS.beginner.cone > TOUCH_CONTROL_PRESETS.advanced.cone);
});
