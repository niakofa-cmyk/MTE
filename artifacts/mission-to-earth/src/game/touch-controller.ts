import { GoldDiscController, type DiscCommand } from "./gold-disc.ts";

export type TouchZone =
  | "MOVEMENT"
  | "PARKOUR"
  | "LOOK_COMBAT"
  | "UTILITY"
  | "FIRE"
  | "FIRE_LEFT"
  | "FOCUS"
  | "INTERACT";

export const STICK_RADIUS = 56;
export const FLICK_PX = 15;
export const FLICK_MS = 220;
export const STILL_FIRE_MS = 180;
export const LOOK_BREAK_PX = 4;
export const LOOK_GAIN = 1.7;
export const SPRINT_SHOVE_PX = 75;
export const DOUBLE_TAP_MS = 250;

export type PulseKey = "ability" | "ult" | "reload" | "slide" | "blood" | "mass" | "swap";

export type TouchCommand =
  | { type: "move"; ax: number; ay: number; sprint: boolean }
  | { type: "stop-move" }
  | { type: "jump"; down: boolean; latch?: boolean }
  | { type: "crouch"; down: boolean }
  | { type: "look"; dx: number; dy: number }
  | { type: "fire"; down: boolean }
  | { type: "fire-left"; down: boolean }
  | { type: "focus-toggle" }
  | { type: "rearm" }
  | { type: "aim" }
  | { type: "interact"; down: boolean }
  | { type: "look-held"; down: boolean }
  | { type: "pulse"; key: PulseKey }
  | DiscCommand;

export type TouchSink = {
  ax: number;
  ay: number;
  lookX: number;
  lookY: number;
  fire: boolean;
  fireLeft: boolean;
  aim: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  reload: boolean;
  ability: boolean;
  ult: boolean;
  interact: boolean;
  slide: boolean;
  blood: boolean;
  mass: boolean;
  swap: boolean;
  lookHeld: boolean;
};

type Track = {
  zone: TouchZone;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t: number;
  look: "pending" | "look" | "fire" | "aim";
  firing: boolean;
  flicked: boolean;
  held: boolean;
  pick: "blood" | "ult" | "reload" | "swap" | null;
};

export function classifyZone(x: number, y: number, width: number, _height: number): TouchZone {
  return x < width * 0.5 ? "MOVEMENT" : "LOOK_COMBAT";
}

export function stickFromDrag(dx: number, dy: number, sprintShove = SPRINT_SHOVE_PX) {
  const mag = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, STICK_RADIUS / mag);
  const ax = (dx * scale) / STICK_RADIUS;
  const ay = (-dy * scale) / STICK_RADIUS;
  return { ax, ay, sprint: -dy >= sprintShove };
}

export function applyTouchCommand(sink: TouchSink, command: TouchCommand, later: (ms: number, run: () => void) => void = () => {}) {
  if (command.type === "move") {
    sink.ax = command.ax;
    sink.ay = command.ay;
    sink.sprint = command.sprint;
  } else if (command.type === "stop-move") {
    sink.ax = 0;
    sink.ay = 0;
    sink.sprint = false;
    sink.crouch = false;
  } else if (command.type === "jump") {
    if (command.latch) {
      sink.jump = true;
      later(100, () => {
        sink.jump = false;
      });
    } else sink.jump = command.down;
  } else if (command.type === "crouch") sink.crouch = command.down;
  else if (command.type === "look") {
    sink.lookX += command.dx;
    sink.lookY += command.dy;
  } else if (command.type === "fire") sink.fire = command.down;
  else if (command.type === "fire-left") sink.fireLeft = command.down;
  else if (command.type === "focus-toggle") sink.aim = !sink.aim;
  else if (command.type === "aim") sink.aim = !sink.aim;
  else if (command.type === "interact") sink.interact = command.down;
  else if (command.type === "look-held") sink.lookHeld = command.down;
  else if (command.type === "await-tap" || command.type === "rearm") return;
  else if (command.type === "pulse") {
    sink[command.key] = true;
    later(90, () => {
      sink[command.key] = false;
    });
  }
}

export class TouchControllerLayer {
  flickVelocityThreshold = FLICK_PX;
  flickWindowMs = FLICK_MS;
  stillHoldPixelRadius = LOOK_BREAK_PX;
  stillFireDelayMs = STILL_FIRE_MS;
  sprintShoveThreshold = SPRINT_SHOVE_PX;
  lookSensitivity = LOOK_GAIN;
  doubleTapMs = DOUBLE_TAP_MS;
  private disc = new GoldDiscController();

  private tracks = new Map<number, Track>();
  private lookTap = { t: 0, x: 0, y: 0, clean: false };

  begin(id: number, zone: TouchZone, x: number, y: number, now: number): TouchCommand[] {
    let look: Track["look"] = "pending";
    const commands: TouchCommand[] = [];
    if (zone === "FIRE") commands.push({ type: "fire", down: true });
    if (zone === "FIRE_LEFT") commands.push({ type: "fire-left", down: true });
    if (zone === "FOCUS") commands.push({ type: "focus-toggle" });
    if (zone === "INTERACT") commands.push({ type: "interact", down: true });
    if (zone === "UTILITY") commands.push(...this.disc.begin(x, y, now));
    if (zone === "LOOK_COMBAT") {
      commands.push({ type: "look-held", down: true });
      const quick =
        this.lookTap.clean && now - this.lookTap.t < this.doubleTapMs && Math.hypot(x - this.lookTap.x, y - this.lookTap.y) < 36;
      this.lookTap = { t: 0, x: 0, y: 0, clean: false };
      if (quick) {
        look = "aim";
        commands.push({ type: "aim" });
      }
    }
    this.tracks.set(id, { zone, x0: x, y0: y, x, y, t: now, look, firing: false, flicked: false, held: false, pick: null });
    return commands;
  }

  move(id: number, x: number, y: number, now: number, _force = 0): TouchCommand[] {
    const track = this.tracks.get(id);
    if (!track) return [];
    const dx = x - track.x0;
    const dy = y - track.y0;
    const commands: TouchCommand[] = [];
    if (track.zone === "MOVEMENT") {
      commands.push({ type: "move", ...stickFromDrag(dx, dy, this.sprintShoveThreshold) });
    } else if (track.zone === "PARKOUR") {
      if (dy < -this.flickVelocityThreshold) commands.push({ type: "jump", down: true });
      if (dy > this.flickVelocityThreshold && !track.flicked) {
        track.flicked = true;
        commands.push({ type: "pulse", key: "slide" });
        commands.push({ type: "crouch", down: true });
      }
    } else if (track.zone === "LOOK_COMBAT") {
      if (track.look !== "aim") track.look = "look";
      commands.push({ type: "look", dx: (x - track.x) * this.lookSensitivity, dy: (y - track.y) * this.lookSensitivity });
    } else if (track.zone === "UTILITY") this.disc.move(x, y);
    track.x = x;
    track.y = y;
    return commands;
  }

  hold(id: number, now: number): TouchCommand[] {
    const track = this.tracks.get(id);
    if (!track) return [];
    if (track.zone === "UTILITY") return this.disc.hold(now);
    return [];
  }

  end(id: number, x: number, y: number, now: number): TouchCommand[] {
    const track = this.tracks.get(id);
    this.tracks.delete(id);
    if (!track) return [];
    const dx = x - track.x0;
    const dy = y - track.y0;
    const commands: TouchCommand[] = [];
    if (track.zone === "MOVEMENT" || track.zone === "PARKOUR") {
      commands.push({ type: "stop-move" });
      const rapid = now - track.t <= this.flickWindowMs;
      if (rapid && -dy > this.flickVelocityThreshold) commands.push({ type: "jump", down: true, latch: true });
      else if (rapid && dy > this.flickVelocityThreshold) commands.push({ type: "pulse", key: "slide" });
      else commands.push({ type: "jump", down: false });
    }
    if (track.zone === "LOOK_COMBAT") {
      const clean = Math.hypot(dx, dy) < 18 && now - track.t < 240;
      this.lookTap = { t: now, x, y, clean };
      commands.push({ type: "look-held", down: false });
    }
    if (track.zone === "FIRE") commands.push({ type: "fire", down: false });
    if (track.zone === "FIRE_LEFT") commands.push({ type: "fire-left", down: false });
    if (track.zone === "INTERACT") commands.push({ type: "interact", down: false });
    if (track.zone === "UTILITY") commands.push(...this.disc.end(x, y, now));
    return commands;
  }

  flushDisc(now: number) {
    return this.disc.flush(now);
  }

  discHoldDelay() {
    return this.disc.holdDelayMs;
  }

  discDoubleTapMs() {
    return this.disc.doubleTapMs;
  }

  utilityLabel(id: number) {
    const track = this.tracks.get(id);
    if (!track || track.zone !== "UTILITY") return null;
    return this.disc.label();
  }
}
