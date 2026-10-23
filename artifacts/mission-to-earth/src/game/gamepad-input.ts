export type GamepadLike = {
  axes: ArrayLike<number>;
  buttons: ArrayLike<{ pressed: boolean; value: number }>;
};

export type GamepadInput = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  fireRight: boolean;
  fireLeft: boolean;
  focus: boolean;
};

export const GAMEPAD_LOOK_PIXELS_PER_SECOND = 800;
export const GAMEPAD_DEADZONE = 0.14;

function deadzone(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) <= GAMEPAD_DEADZONE) return 0;
  const scaled = (Math.abs(value) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
  return Math.sign(value) * scaled;
}

function buttonPressed(gamepad: GamepadLike, index: number) {
  return (gamepad.buttons[index]?.value ?? 0) > 0.35 || gamepad.buttons[index]?.pressed === true;
}

export function readGamepadInput(
  gamepad: GamepadLike | null | undefined,
  dt: number,
): GamepadInput {
  if (!gamepad) {
    return {
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      fireRight: false,
      fireLeft: false,
      focus: false,
    };
  }
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return {
    moveX: deadzone(gamepad.axes[0] ?? 0),
    moveY: -deadzone(gamepad.axes[1] ?? 0),
    lookX: deadzone(gamepad.axes[2] ?? 0) * GAMEPAD_LOOK_PIXELS_PER_SECOND * elapsed,
    lookY: deadzone(gamepad.axes[3] ?? 0) * GAMEPAD_LOOK_PIXELS_PER_SECOND * elapsed,
    fireLeft: buttonPressed(gamepad, 6),
    fireRight: buttonPressed(gamepad, 7),
    focus: gamepad.buttons[11]?.pressed === true,
  };
}
