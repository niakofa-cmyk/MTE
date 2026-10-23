import { EXTRACTION_REGISTRY } from "./extraction-loot.ts";
import { sectorTier } from "./loot-location.ts";
import type { Box, Site, WorldData } from "./world.ts";

export type GameplayWorldSource = Pick<
  WorldData,
  "loots" | "terminals" | "beacon" | "extract"
> & {
  sites: Array<
    Pick<Site, "id" | "lineage" | "x" | "z"> & {
      door: Pick<Box, "minX" | "maxX" | "minZ" | "maxZ" | "maxHp">;
    }
  >;
};

export type GameplayLootKind =
  | "weapon"
  | "ammo"
  | "med"
  | "armor"
  | "mod"
  | "intel";

export interface GameplayLootSpawn {
  id: string;
  kind: GameplayLootKind;
  label: string;
  x: number;
  z: number;
  scrap: number;
  weaponId?: string;
  modId?: string;
}

export interface GameplayTerminal {
  id: string;
  x: number;
  z: number;
  interactionRadius: number;
  sectorTier: number;
}

export interface GameplayObjectiveRecord {
  id: string;
  kind: "rescue" | "beacon" | "extraction";
  label: string;
  order: number;
  x: number;
  z: number;
  interactionRadius: number;
  prerequisites: string[];
  target?: string;
  holdSeconds?: number;
  serverEventRequired?: string;
  gate?: {
    id: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    maxHealth: number;
  };
}

export interface TerminalLootDefinition {
  id: string;
  itemType: "WEAPON" | "ATTACHMENT" | "INTEL_DATA";
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY" | "ANOMALY";
  baseWeight: number;
  currencyScrapValue: number;
  kind: "weapon" | "mod" | "intel";
  label: string;
  weaponId?: string;
  modId?: string;
}

export interface GameplayRegistryAsset {
  schemaVersion: 1;
  lootSpawns: GameplayLootSpawn[];
  terminals: GameplayTerminal[];
  objectives: GameplayObjectiveRecord[];
  terminalLootTable: TerminalLootDefinition[];
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function validateGameplayRegistry(asset: GameplayRegistryAsset): void {
  if (!asset || asset.schemaVersion !== 1) {
    throw new Error("Gameplay registry has an unsupported schema version.");
  }
  if (
    !Array.isArray(asset.lootSpawns) ||
    asset.lootSpawns.length > 2_048 ||
    !Array.isArray(asset.terminals) ||
    asset.terminals.length > 64 ||
    !Array.isArray(asset.objectives) ||
    asset.objectives.length > 64 ||
    !Array.isArray(asset.terminalLootTable) ||
    asset.terminalLootTable.length > 256
  ) {
    throw new Error("Gameplay registry contains an invalid record count.");
  }

  const ids = new Set<string>();
  for (const spawn of asset.lootSpawns) {
    if (!/^map-loot-\d{4}$/.test(spawn.id) || ids.has(spawn.id)) {
      throw new Error(`Gameplay registry has an invalid loot ID: ${spawn.id}`);
    }
    ids.add(spawn.id);
    assertFinite(spawn.x, `Loot ${spawn.id} x`);
    assertFinite(spawn.z, `Loot ${spawn.id} z`);
    if (!Number.isFinite(spawn.scrap) || spawn.scrap < 0 || spawn.scrap > 100_000) {
      throw new Error(`Loot ${spawn.id} has an invalid scrap value.`);
    }
    if (!spawn.label || spawn.label.length > 120) {
      throw new Error(`Loot ${spawn.id} has an invalid label.`);
    }
  }

  ids.clear();
  for (const terminal of asset.terminals) {
    if (!/^terminal-\d{2}$/.test(terminal.id) || ids.has(terminal.id)) {
      throw new Error(`Gameplay registry has an invalid terminal ID: ${terminal.id}`);
    }
    ids.add(terminal.id);
    assertFinite(terminal.x, `Terminal ${terminal.id} x`);
    assertFinite(terminal.z, `Terminal ${terminal.id} z`);
    if (
      terminal.interactionRadius !== 2.4 ||
      !Number.isInteger(terminal.sectorTier) ||
      terminal.sectorTier < 1 ||
      terminal.sectorTier > 4
    ) {
      throw new Error(`Terminal ${terminal.id} has invalid interaction data.`);
    }
  }

  ids.clear();
  for (const objective of asset.objectives) {
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(objective.id) || ids.has(objective.id)) {
      throw new Error(`Gameplay registry has an invalid objective ID: ${objective.id}`);
    }
    ids.add(objective.id);
    assertFinite(objective.x, `Objective ${objective.id} x`);
    assertFinite(objective.z, `Objective ${objective.id} z`);
    if (
      !Number.isInteger(objective.order) ||
      objective.order < 1 ||
      objective.interactionRadius <= 0 ||
      objective.interactionRadius > 20 ||
      objective.prerequisites.some((id) => typeof id !== "string")
    ) {
      throw new Error(`Objective ${objective.id} has invalid progression data.`);
    }
  }

  ids.clear();
  for (const item of asset.terminalLootTable) {
    if (!/^[a-z0-9_]{3,64}$/.test(item.id) || ids.has(item.id)) {
      throw new Error(`Gameplay registry has an invalid terminal loot ID: ${item.id}`);
    }
    ids.add(item.id);
    if (
      !Number.isFinite(item.baseWeight) ||
      item.baseWeight <= 0 ||
      item.baseWeight > 100_000 ||
      !Number.isFinite(item.currencyScrapValue) ||
      item.currencyScrapValue < 0 ||
      item.currencyScrapValue > 100_000 ||
      !item.label ||
      item.label.length > 120
    ) {
      throw new Error(`Terminal loot ${item.id} has invalid values.`);
    }
  }
}

export function exportGameplayRegistry(
  world: GameplayWorldSource,
): GameplayRegistryAsset {
  const lootSpawns = world.loots.map((loot, index): GameplayLootSpawn => ({
    id: `map-loot-${String(index + 1).padStart(4, "0")}`,
    kind: loot.kind,
    label: loot.label ?? (loot.kind === "ammo" ? "AMMO" : loot.kind.toUpperCase()),
    x: rounded(loot.x),
    z: rounded(loot.z),
    scrap: loot.scrap ?? 0,
    ...(loot.weaponId ? { weaponId: loot.weaponId } : {}),
    ...(loot.modId ? { modId: loot.modId } : {}),
  }));

  const terminals = world.terminals.map((terminal, index): GameplayTerminal => ({
    id: `terminal-${String(index + 1).padStart(2, "0")}`,
    x: rounded(terminal.x),
    z: rounded(terminal.z),
    interactionRadius: 2.4,
    sectorTier: sectorTier(terminal.x, terminal.z),
  }));

  const objectives: GameplayObjectiveRecord[] = world.sites.map((site, index) => ({
    id: `rescue-${site.id}`,
    kind: "rescue",
    label: `FREE ${site.lineage.toUpperCase()}`,
    order: index + 1,
    x: rounded(site.x),
    z: rounded(site.z),
    interactionRadius: 2.6,
    prerequisites: [],
    target: site.lineage,
    serverEventRequired: "gate-destruction",
    gate: {
      id: `${site.id}-gate`,
      minX: rounded(site.door.minX),
      maxX: rounded(site.door.maxX),
      minZ: rounded(site.door.minZ),
      maxZ: rounded(site.door.maxZ),
      maxHealth: site.door.maxHp,
    },
  }));
  objectives.push(
    {
      id: "raise-beacon",
      kind: "beacon",
      label: "RAISE THE BEACON",
      order: 3,
      x: rounded(world.beacon.x),
      z: rounded(world.beacon.z),
      interactionRadius: 3.1,
      holdSeconds: 4.6,
      prerequisites: ["rescue-alpha", "rescue-omega"],
    },
    {
      id: "extract",
      kind: "extraction",
      label: "RECOVERY",
      order: 4,
      x: rounded(world.extract.x),
      z: rounded(world.extract.z),
      interactionRadius: 6.4,
      holdSeconds: 6,
      prerequisites: ["raise-beacon"],
    },
  );

  const terminalLootTable: TerminalLootDefinition[] = EXTRACTION_REGISTRY.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    rarity: item.rarity,
    baseWeight: item.baseWeight,
    currencyScrapValue: item.currencyScrapValue,
    kind: item.kind,
    label: item.label,
    ...(item.weaponId ? { weaponId: item.weaponId } : {}),
    ...(item.modId ? { modId: item.modId } : {}),
  }));

  const asset: GameplayRegistryAsset = {
    schemaVersion: 1,
    lootSpawns,
    terminals,
    objectives,
    terminalLootTable,
  };
  validateGameplayRegistry(asset);
  return asset;
}

export function serializeGameplayRegistry(asset: GameplayRegistryAsset): string {
  validateGameplayRegistry(asset);
  return `${JSON.stringify(asset, null, 2)}\n`;
}
