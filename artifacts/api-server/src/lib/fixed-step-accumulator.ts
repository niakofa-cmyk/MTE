export interface FixedStepAdvanceResult {
  stepsRun: number;
  droppedSeconds: number;
  remainderSeconds: number;
}

/**
 * Converts elapsed monotonic time into bounded, deterministic simulation steps.
 *
 * This class does not create a timer or spin a worker. The server scheduler
 * should pass process.hrtime.bigint() values to advanceFromMonotonicNs and
 * monitor droppedSeconds for overload.
 */
export class FixedStepAccumulator {
  private accumulatorSeconds = 0;
  private lastTimeNs: bigint | null = null;
  readonly stepSeconds: number;
  readonly maxCatchUpSteps: number;
  readonly maxFrameSeconds: number;

  constructor(
    stepSeconds = 1 / 60,
    maxCatchUpSteps = 5,
    maxFrameSeconds = 0.25,
  ) {
    this.stepSeconds = stepSeconds;
    this.maxCatchUpSteps = maxCatchUpSteps;
    this.maxFrameSeconds = maxFrameSeconds;
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new Error("stepSeconds must be a positive finite number.");
    }
    if (!Number.isInteger(maxCatchUpSteps) || maxCatchUpSteps < 1) {
      throw new Error("maxCatchUpSteps must be a positive integer.");
    }
    if (!Number.isFinite(maxFrameSeconds) || maxFrameSeconds <= 0) {
      throw new Error("maxFrameSeconds must be a positive finite number.");
    }
  }

  advance(
    elapsedSeconds: number,
    runStep: (stepSeconds: number) => void,
  ): FixedStepAdvanceResult {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error("elapsedSeconds must be finite and non-negative.");
    }

    let droppedSeconds = Math.max(
      0,
      elapsedSeconds - this.maxFrameSeconds,
    );
    this.accumulatorSeconds += Math.min(elapsedSeconds, this.maxFrameSeconds);

    let stepsRun = 0;
    while (
      this.accumulatorSeconds + this.stepSeconds * 1e-9 >= this.stepSeconds &&
      stepsRun < this.maxCatchUpSteps
    ) {
      this.accumulatorSeconds -= this.stepSeconds;
      if (this.accumulatorSeconds < 0) this.accumulatorSeconds = 0;
      runStep(this.stepSeconds);
      stepsRun += 1;
    }

    if (this.accumulatorSeconds >= this.stepSeconds) {
      const skippedSteps = Math.floor(
        this.accumulatorSeconds / this.stepSeconds,
      );
      const skippedSeconds = skippedSteps * this.stepSeconds;
      this.accumulatorSeconds -= skippedSeconds;
      droppedSeconds += skippedSeconds;
    }

    return {
      stepsRun,
      droppedSeconds,
      remainderSeconds: this.accumulatorSeconds,
    };
  }

  advanceFromMonotonicNs(
    nowNs: bigint,
    runStep: (stepSeconds: number) => void,
  ): FixedStepAdvanceResult {
    if (nowNs < 0n) {
      throw new Error("Monotonic timestamp must be non-negative.");
    }
    if (this.lastTimeNs === null) {
      this.lastTimeNs = nowNs;
      return {
        stepsRun: 0,
        droppedSeconds: 0,
        remainderSeconds: this.accumulatorSeconds,
      };
    }
    if (nowNs < this.lastTimeNs) {
      throw new Error("Monotonic timestamp cannot move backwards.");
    }

    const elapsedSeconds = Number(nowNs - this.lastTimeNs) / 1_000_000_000;
    this.lastTimeNs = nowNs;
    return this.advance(elapsedSeconds, runStep);
  }

  reset(): void {
    this.accumulatorSeconds = 0;
    this.lastTimeNs = null;
  }
}
