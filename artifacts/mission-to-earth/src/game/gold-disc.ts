export type DiscPulse = "ability" | "ult" | "reload" | "swap" | "blood" | "mass";

export type DiscCommand =
  | { type: "pulse"; key: DiscPulse }
  | { type: "interact"; down: boolean }
  | { type: "await-tap" };

type Frame = { x0: number; y0: number; x: number; y: number; t: number; held: boolean };

export function discSwipe(dx: number, dy: number, minDistance = 30): "ult" | "reload" | "swap" | "blood" | null {
  if (Math.hypot(dx, dy) < minDistance) return null;
  const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (deg >= 45 && deg < 135) return "ult";
  if (deg >= -45 && deg < 45) return "reload";
  if (deg >= -135 && deg < -45) return "swap";
  return "blood";
}

export class GoldDiscController {
  readonly swipeMinDistance = 30;
  readonly holdDelayMs = 300;
  readonly doubleTapMs = 250;

  private frame: Frame | null = null;
  private pendingTap: number | null = null;
  private swallow = false;

  begin(x: number, y: number, now: number): DiscCommand[] {
    if (this.pendingTap != null && now - this.pendingTap < this.doubleTapMs) {
      this.pendingTap = null;
      this.swallow = true;
      this.frame = null;
      return [{ type: "pulse", key: "mass" }];
    }
    this.swallow = false;
    this.frame = { x0: x, y0: y, x, y, t: now, held: false };
    return [];
  }

  move(x: number, y: number) {
    if (!this.frame) return;
    this.frame.x = x;
    this.frame.y = y;
  }

  hold(now: number): DiscCommand[] {
    const frame = this.frame;
    if (!frame || frame.held || now - frame.t < this.holdDelayMs) return [];
    if (Math.hypot(frame.x - frame.x0, frame.y - frame.y0) >= this.swipeMinDistance) return [];
    frame.held = true;
    return [{ type: "interact", down: true }];
  }

  end(x: number, y: number, now: number): DiscCommand[] {
    if (this.swallow) {
      this.swallow = false;
      return [];
    }
    const frame = this.frame;
    this.frame = null;
    if (!frame) return [];
    const swipe = discSwipe(x - frame.x0, y - frame.y0, this.swipeMinDistance);
    if (frame.held) {
      const commands: DiscCommand[] = [{ type: "interact", down: false }];
      if (swipe) commands.push({ type: "pulse", key: swipe });
      return commands;
    }
    if (swipe === "ult") return [{ type: "pulse", key: "ult" }];
    if (swipe === "reload") return [{ type: "pulse", key: "reload" }];
    if (swipe === "swap") return [{ type: "pulse", key: "swap" }];
    if (swipe === "blood") return [{ type: "pulse", key: "blood" }];
    this.pendingTap = now;
    return [{ type: "await-tap" }];
  }

  cancel(): DiscCommand[] {
    const releaseInteract = this.frame?.held === true;
    this.frame = null;
    this.pendingTap = null;
    this.swallow = false;
    return releaseInteract ? [{ type: "interact", down: false }] : [];
  }

  flush(now: number): DiscCommand[] {
    if (this.pendingTap == null || now - this.pendingTap < this.doubleTapMs) return [];
    this.pendingTap = null;
    return [{ type: "pulse", key: "ability" }];
  }

  label() {
    const frame = this.frame;
    if (!frame) return null;
    if (frame.held) return "E";
    const swipe = discSwipe(frame.x - frame.x0, frame.y - frame.y0, this.swipeMinDistance);
    if (swipe === "ult") return "F";
    if (swipe === "reload") return "R";
    if (swipe === "swap") return "SWAP";
    if (swipe === "blood") return "B";
    return "Q";
  }
}
