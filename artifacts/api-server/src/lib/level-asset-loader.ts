import {
  StaticWorldCollisionMap,
  type StaticAabb,
} from "./static-world-collision-map.ts";

const MAX_LEVEL_ASSET_BYTES = 1_048_576;
const MAX_LEVEL_STRUCTURES = 4_096;
const ASSET_KEYS = [
  "id",
  "type",
  "posX",
  "posY",
  "posZ",
  "sizeX",
  "sizeY",
  "sizeZ",
] as const;

export interface LevelGeometryAsset {
  id: number;
  type: string;
  posX: number;
  posY: number;
  posZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAssetEntry(value: unknown, index: number): LevelGeometryAsset {
  if (!isRecord(value)) {
    throw new Error(`Level structure ${index} must be an object.`);
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [...ASSET_KEYS].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
  ) {
    throw new Error(`Level structure ${index} has an invalid schema.`);
  }

  const { id, type, posX, posY, posZ, sizeX, sizeY, sizeZ } = value;
  if (!Number.isSafeInteger(id) || (id as number) < 0) {
    throw new Error(`Level structure ${index} has an invalid id.`);
  }
  if (
    typeof type !== "string" ||
    !/^[a-z][a-z0-9_-]{0,63}$/i.test(type)
  ) {
    throw new Error(`Level structure ${index} has an invalid type.`);
  }
  for (const [field, number] of Object.entries({
    posX,
    posY,
    posZ,
    sizeX,
    sizeY,
    sizeZ,
  })) {
    if (typeof number !== "number" || !Number.isFinite(number)) {
      throw new Error(`Level structure ${index} has a non-finite ${field}.`);
    }
  }
  if ((sizeX as number) <= 0 || (sizeY as number) <= 0 || (sizeZ as number) <= 0) {
    throw new Error(`Level structure ${index} dimensions must be positive.`);
  }

  return {
    id: id as number,
    type,
    posX: posX as number,
    posY: posY as number,
    posZ: posZ as number,
    sizeX: sizeX as number,
    sizeY: sizeY as number,
    sizeZ: sizeZ as number,
  };
}

/**
 * Load trusted, lightweight collision footprints into the bounded server map.
 * Parsing and validation complete before the collision map is mutated.
 */
export function loadLevelGeometryAsset(
  jsonStream: string,
  targetMap: StaticWorldCollisionMap,
): number {
  if (typeof jsonStream !== "string") {
    throw new Error("Level geometry asset must be a JSON string.");
  }
  if (Buffer.byteLength(jsonStream, "utf8") > MAX_LEVEL_ASSET_BYTES) {
    throw new Error("Level geometry asset exceeds the 1 MiB size limit.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStream);
  } catch {
    throw new Error("Level geometry asset contains malformed JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Level geometry asset must contain an array.");
  }
  if (parsed.length > MAX_LEVEL_STRUCTURES) {
    throw new Error("Level geometry asset exceeds the structure limit.");
  }

  const ids = new Set<number>();
  const bounds: StaticAabb[] = [];
  for (const [index, entry] of parsed.entries()) {
    const structure = parseAssetEntry(entry, index);
    if (ids.has(structure.id)) {
      throw new Error(`Level geometry asset contains duplicate id ${structure.id}.`);
    }
    ids.add(structure.id);

    const halfX = structure.sizeX / 2;
    const halfY = structure.sizeY / 2;
    const halfZ = structure.sizeZ / 2;
    bounds.push({
      min: {
        x: structure.posX - halfX,
        y: structure.posY - halfY,
        z: structure.posZ - halfZ,
      },
      max: {
        x: structure.posX + halfX,
        y: structure.posY + halfY,
        z: structure.posZ + halfZ,
      },
    });
  }

  targetMap.addStaticBoundsBatch(bounds);
  return bounds.length;
}
