import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  AuthoritativeMatch,
  DEFAULT_MATCH_CONFIG,
  type MatchConfig,
} from "./authoritative-match.ts";
import {
  loadGameplayRegistryAsset,
  type GameplayRegistryAsset,
} from "./gameplay-registry.ts";

export const DEFAULT_NOD_LEVEL_ASSET_PATH = resolve(
  process.cwd(),
  "dist/data/generated/nod-level-geometry.json",
);
export const DEFAULT_NOD_GAMEPLAY_REGISTRY_PATH = resolve(
  process.cwd(),
  "dist/data/generated/nod-gameplay-registry.json",
);
export const DEFAULT_CINDER_ROW_LEVEL_ASSET_PATH = resolve(
  process.cwd(),
  "dist/data/generated/cinder-row-blackout-level-geometry.json",
);
export const DEFAULT_CINDER_ROW_GAMEPLAY_REGISTRY_PATH = resolve(
  process.cwd(),
  "dist/data/generated/cinder-row-blackout-gameplay-registry.json",
);

/**
 * Build a server match only after reading and validating the generated,
 * server-owned static geometry asset. The caller can register players only
 * after this promise resolves.
 */
export async function createNodAuthoritativeMatch(
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
  assetPath = DEFAULT_NOD_LEVEL_ASSET_PATH,
  gameplayRegistryPath?: string,
): Promise<{
  match: AuthoritativeMatch;
  loadedGeometryCount: number;
  gameplayRegistry: GameplayRegistryAsset;
}> {
  const resolvedGameplayRegistryPath =
    gameplayRegistryPath ??
    (assetPath === DEFAULT_NOD_LEVEL_ASSET_PATH
      ? DEFAULT_NOD_GAMEPLAY_REGISTRY_PATH
      : resolve(dirname(assetPath), "nod-gameplay-registry.json"));
  const [json, gameplayJson] = await Promise.all([
    readFile(assetPath, "utf8"),
    readFile(resolvedGameplayRegistryPath, "utf8"),
  ]);
  const match = new AuthoritativeMatch(config);
  const loadedGeometryCount = match.loadLevelGeometryAsset(json);
  const gameplayRegistry = loadGameplayRegistryAsset(gameplayJson);
  return { match, loadedGeometryCount, gameplayRegistry };
}

export async function createCinderRowAuthoritativeMatch(
  config: MatchConfig = {
    ...DEFAULT_MATCH_CONFIG,
    maxPlayers: 8,
    worldHalfExtent: 40,
  },
  assetPath = DEFAULT_CINDER_ROW_LEVEL_ASSET_PATH,
  gameplayRegistryPath?: string,
): Promise<{
  match: AuthoritativeMatch;
  loadedGeometryCount: number;
  gameplayRegistry: GameplayRegistryAsset;
}> {
  const resolvedGameplayRegistryPath =
    gameplayRegistryPath ??
    (assetPath === DEFAULT_CINDER_ROW_LEVEL_ASSET_PATH
      ? DEFAULT_CINDER_ROW_GAMEPLAY_REGISTRY_PATH
      : resolve(dirname(assetPath), "cinder-row-blackout-gameplay-registry.json"));
  const [json, gameplayJson] = await Promise.all([
    readFile(assetPath, "utf8"),
    readFile(resolvedGameplayRegistryPath, "utf8"),
  ]);
  const match = new AuthoritativeMatch(config);
  const loadedGeometryCount = match.loadLevelGeometryAsset(json);
  const gameplayRegistry = loadGameplayRegistryAsset(gameplayJson);
  return { match, loadedGeometryCount, gameplayRegistry };
}
