import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  const byteLength = Buffer.byteLength(json, "utf8");
  if (byteLength > MAX_ASSET_BYTES) {
    throw new Error("Generated level geometry exceeds the 1 MiB file limit.");
  }

  const targetPath = resolve(outputPath);
  const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(dirname(targetPath), { recursive: true });

  try {
    await writeFile(temporaryPath, json, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    path: targetPath,
    byteLength,
    nodeCount: nodes.length,
  };
}
