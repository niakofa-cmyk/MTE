import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LOOK_SENSITIVITY,
  MAX_LOOK_SENSITIVITY,
  MIN_LOOK_SENSITIVITY,
  normalizeLookSensitivity,
  parseLookSensitivity,
} from "./settings.ts";

describe("look sensitivity settings", () => {
  it("uses the default when no saved value exists or storage is malformed", () => {
    assert.equal(parseLookSensitivity(null), DEFAULT_LOOK_SENSITIVITY);
    assert.equal(parseLookSensitivity(""), DEFAULT_LOOK_SENSITIVITY);
    assert.equal(parseLookSensitivity("fast"), DEFAULT_LOOK_SENSITIVITY);
  });

  it("clamps saved values to the supported range", () => {
    assert.equal(parseLookSensitivity("0.1"), MIN_LOOK_SENSITIVITY);
    assert.equal(parseLookSensitivity("5"), MAX_LOOK_SENSITIVITY);
  });

  it("rounds to slider increments and rejects non-finite values", () => {
    assert.equal(normalizeLookSensitivity(1.26), 1.3);
    assert.equal(normalizeLookSensitivity(Number.NaN), DEFAULT_LOOK_SENSITIVITY);
    assert.equal(parseLookSensitivity("Infinity"), DEFAULT_LOOK_SENSITIVITY);
  });
});
