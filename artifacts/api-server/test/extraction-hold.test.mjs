import assert from "node:assert/strict";
import test from "node:test";
import { ExtractionHold } from "../src/lib/extraction-hold.ts";

test("server extraction requires a continuous in-zone hold", () => {
  const hold = new ExtractionHold();
  assert.deepEqual(hold.update(true, 1_000_000_000n, 6), {
    inRange: true,
    progress: 0,
    ready: false,
    settled: false,
  });
  assert.equal(hold.update(true, 6_999_999_999n, 6).ready, false);
  assert.equal(hold.update(true, 7_000_000_000n, 6).ready, true);
});

test("leaving the extraction area resets the hold and only settled runs stay complete", () => {
  const hold = new ExtractionHold();
  hold.update(true, 1_000_000_000n, 6);
  assert.deepEqual(hold.update(false, 4_000_000_000n, 6), {
    inRange: false,
    progress: 0,
    ready: false,
    settled: false,
  });
  assert.equal(hold.update(true, 4_100_000_000n, 6).progress, 0);
  assert.equal(hold.update(true, 10_100_000_000n, 6).ready, true);
  hold.markSettled();
  assert.deepEqual(hold.update(false, 10_200_000_000n, 6), {
    inRange: true,
    progress: 1,
    ready: true,
    settled: true,
  });
});

test("invalid hold clocks and durations fail explicitly", () => {
  const hold = new ExtractionHold();
  assert.throws(() => hold.update(true, -1n, 6), /clock/);
  assert.throws(() => hold.update(true, 0n, Number.NaN), /duration/);
  assert.throws(() => hold.update(true, 0n, 0), /duration/);
});
