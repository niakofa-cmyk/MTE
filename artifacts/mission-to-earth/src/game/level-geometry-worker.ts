import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { persistAtomicJson } from "./atomic-json-worker.ts";
import {
  serializeStaticLevelGeometry,
  type SerializedStaticNode,
} from "./level-geometry-export.ts";

const MAX_ASSET_BYTES = 1_048_576;
const DEFAULT_OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../api-server/src/data/generated/nod-level-geometry.json",
);

export interface LevelAssetWriteResult {
  path: string;
  byteLength: number;
  nodeCount: number;
}

/**
 * Persist generated level data by writing a sibling temp file and atomically
 * renaming it into place. The caller supplies locally generated geometry, never
 * client-uploaded map data.
 */
export async function persistWorldGeometry(
  nodes: readonly SerializedStaticNode[],
  outputPath = DEFAULT_OUTPUT_PATH,
): Promise<LevelAssetWriteResult> {
  const json = serializeStaticLevelGeometry(nodes);
  const result = await persistAtomicJson(json, outputPath, MAX_ASSET_BYTES);

  return {
    ...result,
    nodeCount: nodes.length,
  };
}
