import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TOUCH_TUNING,
  DEFAULT_TOUCH_LAYOUT,
  parseTouchTuning,
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

test("touch calibration defaults safely when saved data is missing or malformed", () => {
  assert.deepEqual(parseTouchTuning(null), DEFAULT_TOUCH_TUNING);
  assert.deepEqual(parseTouchTuning("not-json"), DEFAULT_TOUCH_TUNING);
  assert.deepEqual(parseTouchTuning(JSON.stringify([])), DEFAULT_TOUCH_TUNING);
});

test("touch calibration clamps unsafe values and ignores non-finite fields", () => {
  assert.deepEqual(
    parseTouchTuning(
      JSON.stringify({
        flick: 1,
        shove: 900,
        look: Number.NaN,
        disc: 20,
        discRight: -1,
        discTop: 56,
        cone: 80,
        magnet: 0.33,
        drag: "fast",
      }),
    ),
    {
      ...DEFAULT_TOUCH_TUNING,
      flick: 8,
      shove: 120,
      disc: 1.4,
      discRight: 8,
      discTop: 56,
      cone: 14,
      magnet: 0.35,
    },
  );
});

test("touch calibration migrates the legacy sprint threshold", () => {
  assert.equal(parseTouchTuning(JSON.stringify({ shove: 75 })).shove, DEFAULT_TOUCH_TUNING.shove);
});
