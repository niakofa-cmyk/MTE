import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { persistAtomicJson } from "./atomic-json-worker.ts";
import {
  serializeGameplayRegistry,
  type GameplayRegistryAsset,
} from "./gameplay-registry-export.ts";

const MAX_ASSET_BYTES = 1_048_576;
const DEFAULT_OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../api-server/src/data/generated/nod-gameplay-registry.json",
);

export interface GameplayRegistryWriteResult {
  path: string;
  byteLength: number;
  lootSpawnCount: number;
  terminalCount: number;
  objectiveCount: number;
}

export async function persistGameplayRegistry(
  asset: GameplayRegistryAsset,
  outputPath = DEFAULT_OUTPUT_PATH,
): Promise<GameplayRegistryWriteResult> {
  const result = await persistAtomicJson(
    serializeGameplayRegistry(asset),
    outputPath,
    MAX_ASSET_BYTES,
  );
  return {
    ...result,
    lootSpawnCount: asset.lootSpawns.length,
    terminalCount: asset.terminals.length,
    objectiveCount: asset.objectives.length,
  };
}
