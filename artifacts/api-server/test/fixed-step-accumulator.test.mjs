import assert from "node:assert/strict";
import test from "node:test";
import { FixedStepAccumulator } from "../src/lib/fixed-step-accumulator.ts";

test("retains fractional time and runs fixed-sized steps", () => {
  const clock = new FixedStepAccumulator(0.02, 4, 0.25);
  const steps = [];
  const first = clock.advance(0.01, (step) => steps.push(step));
  assert.equal(first.stepsRun, 0);
  assert.ok(Math.abs(first.remainderSeconds - 0.01) < 1e-9);

  const second = clock.advance(0.01, (step) => steps.push(step));
  assert.equal(second.stepsRun, 1);
  assert.equal(steps.length, 1);
  assert.equal(steps[0], 0.02);
  assert.ok(second.remainderSeconds < 1e-9);
});

test("caps catch-up work and reports discarded time rather than spinning", () => {
  const clock = new FixedStepAccumulator(0.05, 2, 0.25);
  const steps = [];
  const result = clock.advance(1, (step) => steps.push(step));

  assert.equal(result.stepsRun, 2);
  assert.equal(steps.length, 2);
  assert.ok(Math.abs(result.droppedSeconds - 0.9) < 1e-9);
  assert.ok(result.remainderSeconds < 1e-9);
});

test("uses monotonic nanosecond timestamps and rejects time regression", () => {
  const clock = new FixedStepAccumulator(0.01, 4, 0.25);
  const steps = [];
  assert.equal(clock.advanceFromMonotonicNs(100n, () => {}).stepsRun, 0);
  const result = clock.advanceFromMonotonicNs(20_000_100n, (step) => {
    steps.push(step);
  });
  assert.equal(result.stepsRun, 2);
  assert.equal(steps.length, 2);
  assert.throws(
    () => clock.advanceFromMonotonicNs(20_000_000n, () => {}),
    /backwards/,
  );
});

test("validates elapsed time and resets its baseline", () => {
  const clock = new FixedStepAccumulator();
  assert.throws(() => clock.advance(-1, () => {}), /non-negative/);
  clock.advanceFromMonotonicNs(5_000_000n, () => {});
  clock.reset();
  assert.equal(clock.advanceFromMonotonicNs(1n, () => {}).stepsRun, 0);
});
