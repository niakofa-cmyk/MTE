export interface ExtractionHoldStatus {
  inRange: boolean;
  progress: number;
  ready: boolean;
  settled: boolean;
}

export class ExtractionHold {
  private startedAtNs: bigint | null = null;
  private settled = false;

  update(inRange: boolean, nowNs: bigint, requiredSeconds: number): ExtractionHoldStatus {
    if (nowNs < 0n) throw new Error("Extraction clock must be non-negative.");
    if (!Number.isFinite(requiredSeconds) || requiredSeconds <= 0 || requiredSeconds > 120) {
      throw new Error("Extraction hold duration is invalid.");
    }
    if (this.settled) {
      return { inRange: true, progress: 1, ready: true, settled: true };
    }
    if (!inRange) {
      this.startedAtNs = null;
      return { inRange: false, progress: 0, ready: false, settled: false };
    }
    this.startedAtNs ??= nowNs;
    const elapsedNs = nowNs >= this.startedAtNs ? nowNs - this.startedAtNs : 0n;
    const requiredNs = BigInt(Math.ceil(requiredSeconds * 1_000_000_000));
    const progress = Math.min(1, Number(elapsedNs) / Number(requiredNs));
    const ready = elapsedNs >= requiredNs;
    return { inRange: true, progress, ready, settled: false };
  }

  markSettled(): void {
    this.settled = true;
    this.startedAtNs = null;
  }
}
