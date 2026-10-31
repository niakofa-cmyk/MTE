export function supportsWebGL2Context(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): boolean {
  try {
    const context = createCanvas().getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
