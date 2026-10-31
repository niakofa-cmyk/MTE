import assert from "node:assert/strict";
import test from "node:test";
import { shouldRecommendLandscape } from "./landscape-presentation.ts";

test("landscape recommendation is limited to touch-first portrait viewports", () => {
  assert.equal(shouldRecommendLandscape(true, 390, 844), true);
  assert.equal(shouldRecommendLandscape(true, 844, 390), false);
  assert.equal(shouldRecommendLandscape(false, 390, 844), false);
});

test("landscape recommendation ignores invalid viewport dimensions", () => {
  assert.equal(shouldRecommendLandscape(true, 0, 844), false);
  assert.equal(shouldRecommendLandscape(true, 390, Number.NaN), false);
});
