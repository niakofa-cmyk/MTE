import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TouchControllerLayer,
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
