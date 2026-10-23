import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AuthoritativeMatch,
  DEFAULT_MATCH_CONFIG,
  type MatchConfig,
} from "./authoritative-match.ts";

export const DEFAULT_NOD_LEVEL_ASSET_PATH = resolve(
  process.cwd(),
  "dist/data/generated/nod-level-geometry.json",
);

/**
 * Build a server match only after reading and validating the generated,
 * server-owned static geometry asset. The caller can register players only
 * after this promise resolves.
 */
export async function createNodAuthoritativeMatch(
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
  assetPath = DEFAULT_NOD_LEVEL_ASSET_PATH,
): Promise<{ match: AuthoritativeMatch; loadedGeometryCount: number }> {
  const json = await readFile(assetPath, "utf8");
  const match = new AuthoritativeMatch(config);
  const loadedGeometryCount = match.loadLevelGeometryAsset(json);
  return { match, loadedGeometryCount };
}
