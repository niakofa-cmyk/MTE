import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TouchControllerLayer,
  SPRINT_SHOVE_PX,
  applyTouchCommand,
  classifyZone,
  stickFromDrag,
  type TouchSink,
} from "./touch-controller.ts";

function sink(): TouchSink {
  return {
    ax: 0,
    ay: 0,
    lookX: 0,
    lookY: 0,
    fire: false,
    fireLeft: false,
    aim: false,
    jump: false,
    sprint: false,
    crouch: false,
    reload: false,
    ability: false,
    ult: false,
    interact: false,
    slide: false,
    blood: false,
    mass: false,
    swap: false,
    lookHeld: false,
  };
}

describe("touch controller", () => {
  it("splits the phone into a left stick and a right look pad", () => {
    assert.equal(classifyZone(40, 80, 400, 800), "MOVEMENT");
    assert.equal(classifyZone(40, 700, 400, 800), "MOVEMENT");
    assert.equal(classifyZone(300, 500, 400, 800), "LOOK_COMBAT");
    assert.equal(classifyZone(210, 80, 400, 800), "LOOK_COMBAT");
  });

  it("sprints only when the stick is shoved past the pixel gate", () => {
    assert.equal(stickFromDrag(0, -80).sprint, true);
    assert.equal(stickFromDrag(0, -40).sprint, false);
  });

  it("starts sprint at 85% of the movement stick radius", () => {
    const layer = new TouchControllerLayer();
    layer.begin(1, "MOVEMENT", 40, 400, 0);
    const justBelow = layer.move(1, 40, 400 - (SPRINT_SHOVE_PX - 1), 20);
    assert.equal(justBelow.some((command) => command.type === "move" && command.sprint), false);

    const sprint = layer.move(1, 40, 400 - SPRINT_SHOVE_PX, 20);
    assert.equal(sprint.some((command) => command.type === "move" && command.sprint), true);
  });

  it("looks without firing, even if the thumb stops or presses hard", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    layer.begin(1, "LOOK_COMBAT", 200, 400, 0);
    assert.equal(layer.hold(1, 400).some((command) => command.type === "fire"), false);
    const dragged = layer.move(1, 248, 430, 80, 1);
    assert.equal(dragged.some((command) => command.type === "look"), true);
    assert.equal(dragged.some((command) => command.type === "fire"), false);
    applyTouchCommand(pad, dragged.find((command) => command.type === "look")!);
    assert.equal(pad.fire, false);
    assert.notEqual(pad.lookX, 0);
    assert.notEqual(pad.lookY, 0);
  });

  it("fires only while the fire pad is held", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    for (const command of layer.begin(1, "FIRE", 300, 600, 0)) applyTouchCommand(pad, command);
    assert.equal(pad.fire, true);
    layer.move(1, 340, 640, 40, 1);
    assert.equal(pad.fire, true);
    for (const command of layer.end(1, 340, 640, 80)) applyTouchCommand(pad, command);
    assert.equal(pad.fire, false);
  });

  it("keeps a shared fire action active until its last pointer releases", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    for (const command of layer.begin(10, "FIRE", 300, 600, 0)) applyTouchCommand(pad, command);
    for (const command of layer.begin(11, "FIRE", 310, 600, 10)) applyTouchCommand(pad, command);
    assert.equal(pad.fire, true);

    const firstRelease = layer.cancel(10);
    assert.equal(firstRelease.some((command) => command.type === "fire" && !command.down), false);
    for (const command of firstRelease) applyTouchCommand(pad, command);
    assert.equal(pad.fire, true);

    for (const command of layer.end(11, 310, 600, 40)) applyTouchCommand(pad, command);
    assert.equal(pad.fire, false);
  });

  it("allows one movement and one look pointer while rejecting extra owners", () => {
    const layer = new TouchControllerLayer();
    layer.begin(20, "MOVEMENT", 40, 400, 0);
    layer.begin(21, "LOOK_COMBAT", 300, 400, 0);
    layer.begin(22, "MOVEMENT", 50, 410, 10);
    layer.begin(23, "LOOK_COMBAT", 310, 410, 10);

    assert.equal(layer.ownsPointer(20), true);
    assert.equal(layer.ownsPointer(21), true);
    assert.equal(layer.ownsPointer(22), false);
    assert.equal(layer.ownsPointer(23), false);
    assert.deepEqual(layer.move(22, 60, 430, 20), []);
  });

  it("routes simultaneous movement and full two-axis look through separate pointers", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();

    for (const command of layer.begin(24, "MOVEMENT", 40, 400, 0)) applyTouchCommand(pad, command);
    for (const command of layer.begin(25, "LOOK_COMBAT", 300, 400, 0)) applyTouchCommand(pad, command);
    for (const command of layer.move(24, 40, 340, 80)) applyTouchCommand(pad, command);
    for (const command of layer.move(25, 360, 370, 80)) applyTouchCommand(pad, command);

    assert.equal(pad.ay, 1);
    assert.equal(pad.ax, 0);
    assert.equal(pad.lookX, 60 * layer.lookSensitivity);
    assert.equal(pad.lookY, -30 * layer.lookSensitivity);
    assert.equal(pad.lookHeld, true);

    for (const command of layer.end(24, 40, 340, 120)) applyTouchCommand(pad, command);
    assert.equal(pad.ay, 0);
    assert.equal(pad.lookHeld, true);
    for (const command of layer.end(25, 360, 370, 120)) applyTouchCommand(pad, command);
    assert.equal(pad.lookHeld, false);
  });

  it("holds and releases interaction through the extraction action control", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();

    for (const command of layer.begin(26, "INTERACT", 190, 600, 0)) applyTouchCommand(pad, command);
    assert.equal(pad.interact, true);
    for (const command of layer.end(26, 190, 600, 600)) applyTouchCommand(pad, command);
    assert.equal(pad.interact, false);
  });

  it("cancels all touch input without triggering flick actions", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    for (const command of layer.begin(30, "MOVEMENT", 40, 400, 0)) applyTouchCommand(pad, command);
    for (const command of layer.move(30, 40, 440, 20)) applyTouchCommand(pad, command);
    for (const command of layer.begin(31, "LOOK_COMBAT", 300, 400, 0)) applyTouchCommand(pad, command);
    for (const command of layer.begin(32, "FIRE_LEFT", 40, 700, 0)) applyTouchCommand(pad, command);
    for (const command of layer.begin(33, "UTILITY", 300, 700, 0)) applyTouchCommand(pad, command);
    for (const command of layer.hold(33, 400)) applyTouchCommand(pad, command);
    for (const command of layer.begin(34, "FOCUS", 350, 60, 10)) applyTouchCommand(pad, command);
    pad.ability = true;
    assert.equal(pad.interact, true);
    assert.equal(pad.aim, true);

    const cancelled = layer.cancelAll();
    assert.equal(cancelled.some((command) => command.type === "pulse"), false);
    for (const command of cancelled) applyTouchCommand(pad, command);

    assert.deepEqual(
      [pad.ax, pad.ay, pad.lookX, pad.lookY, pad.fire, pad.fireLeft, pad.jump, pad.sprint, pad.crouch, pad.ability, pad.lookHeld, pad.interact],
      [0, 0, 0, 0, false, false, false, false, false, false, false, false],
    );
    assert.equal(pad.aim, false);
    assert.equal(layer.ownsPointer(30), false);
    assert.equal(layer.ownsPointer(31), false);
    assert.equal(layer.ownsPointer(32), false);
    assert.equal(layer.ownsPointer(33), false);
    assert.equal(layer.ownsPointer(34), false);
    assert.deepEqual(layer.flushDisc(500), []);
  });

  it("cancels an interrupted touch without interpreting it as a flick", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    for (const command of layer.begin(40, "MOVEMENT", 40, 400, 0)) applyTouchCommand(pad, command);
    for (const command of layer.move(40, 40, 350, 30)) applyTouchCommand(pad, command);

    const cancelled = layer.cancel(40);
    assert.equal(cancelled.some((command) => command.type === "pulse" || (command.type === "jump" && command.latch)), false);
    for (const command of cancelled) applyTouchCommand(pad, command);
    assert.equal(pad.ay, 0);
    assert.equal(pad.jump, false);
  });

  it("fires the off-hand independently and toggles focus without interrupting right-stick look", () => {
    const layer = new TouchControllerLayer();
    const pad = sink();
    for (const command of layer.begin(1, "FIRE_LEFT", 40, 700, 0)) applyTouchCommand(pad, command);
    assert.equal(pad.fireLeft, true);
    assert.equal(pad.fire, false);
    for (const command of layer.end(1, 40, 700, 80)) applyTouchCommand(pad, command);
    assert.equal(pad.fireLeft, false);

    for (const command of layer.begin(2, "FOCUS", 350, 60, 100)) applyTouchCommand(pad, command);
    assert.equal(pad.aim, true);
    layer.begin(4, "FOCUS", 350, 60, 105);
    assert.equal(layer.ownsPointer(4), false);
    assert.equal(pad.aim, true);
    for (const command of layer.end(2, 350, 60, 120)) applyTouchCommand(pad, command);
    for (const command of layer.begin(3, "FOCUS", 350, 60, 200)) applyTouchCommand(pad, command);
    assert.equal(pad.aim, false);
  });

  it("flicks the left stick into a slide only when the gesture is short", () => {
    const layer = new TouchControllerLayer();
    layer.begin(1, "MOVEMENT", 40, 400, 0);
    const slide = layer.end(1, 40, 430, 80);
    assert.equal(slide.some((command) => command.type === "pulse" && command.key === "slide"), true);
    layer.begin(2, "MOVEMENT", 40, 400, 0);
    const held = layer.end(2, 40, 490, 500);
    assert.equal(held.some((command) => command.type === "pulse"), false);
    layer.begin(3, "UTILITY", 300, 80, 0);
    layer.move(3, 300, 20, 30);
    const end = layer.end(3, 300, 20, 40);
    assert.equal(end.some((command) => command.type === "pulse" && command.key === "ult"), true);
  });
});
