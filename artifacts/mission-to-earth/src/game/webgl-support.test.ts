import assert from "node:assert/strict";
import test from "node:test";

import { supportsWebGL2Context } from "./webgl-support.ts";

test("WebGL capability probe releases a temporary context after success", () => {
  let released = false;
  const context = {
    getExtension: (name: string) => {
      assert.equal(name, "WEBGL_lose_context");
      return { loseContext: () => { released = true; } };
    },
  } as unknown as WebGL2RenderingContext;
  const canvas = {
    getContext: (name: string) => {
      assert.equal(name, "webgl2");
      return context;
    },
  } as unknown as HTMLCanvasElement;

  assert.equal(supportsWebGL2Context(() => canvas), true);
  assert.equal(released, true);
});

test("WebGL capability probe handles missing contexts and browser exceptions", () => {
  const missingCanvas = {
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
  const throwingCanvas = {
    getContext: () => {
      throw new Error("WebGL blocked");
    },
  } as unknown as HTMLCanvasElement;

  assert.equal(supportsWebGL2Context(() => missingCanvas), false);
  assert.equal(supportsWebGL2Context(() => throwingCanvas), false);
});
