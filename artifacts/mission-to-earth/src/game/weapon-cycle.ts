export type ShotAttempt = "wait" | "empty" | "shot";

export type ReloadAmmo = {
  magazine: number;
  reserve: number;
};

export class WeaponCycle {
  private fireWas = false;
  private nextShot = 0;
  private reloadRemaining = 0;
  private reloadDuration = 0;

  get isReloading() {
    return this.reloadRemaining > 0;
  }

  get reloadProgress() {
    if (!this.isReloading || this.reloadDuration <= 0) return 0;
    return Math.max(
      0,
      Math.min(1, 1 - this.reloadRemaining / this.reloadDuration),
    );
  }

  get nextShotAt() {
    return this.nextShot;
  }

  attemptShot(options: {
    automatic: boolean;
    wanted: boolean;
    now: number;
    interval: number;
    magazine: number;
  }): ShotAttempt {
    const trigger = options.automatic
      ? options.wanted
      : options.wanted && !this.fireWas;
    this.fireWas = options.wanted;

    if (!trigger || this.isReloading) return "wait";
    if (options.magazine <= 0) return "empty";
    if (options.now < this.nextShot) return "wait";

    this.nextShot = options.now + options.interval;
    return "shot";
  }

  beginReload(
    magazine: number,
    capacity: number,
    reserve: number,
    duration: number,
  ) {
    if (
      this.isReloading ||
      magazine >= capacity ||
      reserve <= 0 ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return false;
    }
    this.reloadRemaining = duration;
    this.reloadDuration = duration;
    return true;
  }

  tickReload(
    dt: number,
    magazine: number,
    reserve: number,
    capacity: number,
  ): ReloadAmmo | null {
    if (!this.isReloading) return null;
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.reloadRemaining = Math.max(0, this.reloadRemaining - elapsed);
    if (this.isReloading) return null;

    const roundsLoaded = Math.min(
      Math.max(0, capacity - magazine),
      Math.max(0, reserve),
    );
    this.reloadDuration = 0;
    return {
      magazine: magazine + roundsLoaded,
      reserve: reserve - roundsLoaded,
    };
  }

  cancelReload() {
    this.reloadRemaining = 0;
    this.reloadDuration = 0;
  }
}
