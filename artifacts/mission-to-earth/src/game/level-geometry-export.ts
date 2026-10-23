import type { Box, WorldData } from "./world.ts";

export interface SerializedStaticNode {
  id: number;
  type: string;
  posX: number;
  posY: number;
  posZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

const MAX_STATIC_NODES = 4_096;
const TYPE_SLUG = /^[a-z][a-z0-9_-]{0,63}$/i;

function roundCoordinate(value: number): number {
  return Number(value.toFixed(3));
}

function validateStaticNode(node: SerializedStaticNode, index: number): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`Static level node ${index} must be an object.`);
  }
  const expectedKeys = [
    "id",
    "type",
    "posX",
    "posY",
    "posZ",
    "sizeX",
    "sizeY",
    "sizeZ",
  ].sort();
  const keys = Object.keys(node).sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
  ) {
    throw new Error(`Static level node ${index} has an invalid schema.`);
  }
  if (!Number.isSafeInteger(node.id) || node.id < 0) {
    throw new Error(`Static level node ${index} has an invalid id.`);
  }
  if (typeof node.type !== "string" || !TYPE_SLUG.test(node.type)) {
    throw new Error(`Static level node ${index} has an invalid type.`);
  }
  for (const [field, value] of Object.entries(node)) {
    if (field === "id" || field === "type") continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Static level node ${index} has an invalid ${field}.`);
    }
  }
  if (node.sizeX <= 0 || node.sizeY <= 0 || node.sizeZ <= 0) {
    throw new Error(`Static level node ${index} dimensions must be positive.`);
  }
}

function toStaticNode(box: Box, id: number): SerializedStaticNode {
  const node = {
    id,
    type: box.tag,
    posX: roundCoordinate((box.minX + box.maxX) / 2),
    posY: roundCoordinate(box.h / 2),
    posZ: roundCoordinate((box.minZ + box.maxZ) / 2),
    sizeX: roundCoordinate(box.maxX - box.minX),
    sizeY: roundCoordinate(box.h),
    sizeZ: roundCoordinate(box.maxZ - box.minZ),
  };
  validateStaticNode(node, id);
  return node;
}

/**
 * Export the exact collision boxes used by the game simulation.
 * Breakable cover is omitted until the server has matching dynamic-destruction
 * state; world buildings and non-destructible cover remain canonical blockers.
 */
export function exportStaticWorldGeometry(
  world: Pick<WorldData, "buildings" | "covers">,
): SerializedStaticNode[] {
  const staticBoxes = [...world.buildings, ...world.covers].filter(
    (box) => box.alive && !box.destructible,
  );
  if (staticBoxes.length > MAX_STATIC_NODES) {
    throw new Error("Generated level exceeds the static geometry node limit.");
  }

  const ids = new Set<number>();
  const nodes = staticBoxes.map((box, index) => {
    const id = 1_000 + index;
    if (ids.has(id)) throw new Error(`Generated level has duplicate node id ${id}.`);
    ids.add(id);
    return toStaticNode(box, id);
  });
  return nodes;
}

export function serializeStaticLevelGeometry(
  nodes: readonly SerializedStaticNode[],
): string {
  if (!Array.isArray(nodes) || nodes.length > MAX_STATIC_NODES) {
    throw new Error("Static level geometry has an invalid node count.");
  }
  const ids = new Set<number>();
  nodes.forEach((node, index) => {
    validateStaticNode(node, index);
    if (ids.has(node.id)) {
      throw new Error(`Static level geometry contains duplicate id ${node.id}.`);
    }
    ids.add(node.id);
  });
  return `${JSON.stringify(nodes, null, 2)}\n`;
}
