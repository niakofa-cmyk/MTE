import { randomInt } from "node:crypto";
import type {
  GameplayLootSpawn,
  GameplayObjectiveRecord,
  GameplayRegistryAsset,
  GameplayTerminal,
  TerminalLootDefinition,
} from "./gameplay-registry.ts";

const LOOT_INTERACTION_RADIUS = 2.15;

export type GameplayStateErrorCode =
  | "loot-not-found"
  | "loot-out-of-range"
  | "loot-already-claimed"
  | "terminal-not-found"
  | "terminal-out-of-range"
  | "terminal-already-open";

export class GameplayStateError extends Error {
  readonly code: GameplayStateErrorCode;

  constructor(code: GameplayStateErrorCode) {
    super(code);
    this.name = "GameplayStateError";
    this.code = code;
  }
}

export interface ServerPosition {
  x: number;
  z: number;
}

export interface GrantedGameplayItem {
  lootId: string;
  kind: GameplayLootSpawn["kind"] | TerminalLootDefinition["kind"];
  label: string;
  scrap: number;
  weaponId?: string;
  modId?: string;
}

export interface AuthoritativeGameplaySnapshot {
  lootSpawns: Array<GameplayLootSpawn & { available: boolean }>;
  terminals: Array<GameplayTerminal & {
    state: "closed" | "opened";
    lootIds: string[];
  }>;
  objectives: Array<GameplayObjectiveRecord & {
    state: "waiting-for-server-event" | "locked";
    blockedBy: string[];
  }>;
  inventory: GrantedGameplayItem[];
}

function cloneGrant(item: GrantedGameplayItem): GrantedGameplayItem {
  return { ...item };
}

export class AuthoritativeGameplayState {
  private readonly lootById = new Map<string, GameplayLootSpawn>();
  private readonly terminals = new Map<
    string,
    { record: GameplayTerminal; opened: boolean; lootIds: string[] }
  >();
  private readonly objectives: GameplayObjectiveRecord[];
  private readonly terminalLootTable: TerminalLootDefinition[];
  private readonly claimedByLootId = new Map<string, string>();
  private readonly inventoryByPlayerId = new Map<string, GrantedGameplayItem[]>();
  private nextGeneratedLootNumber: number;

  constructor(registry: GameplayRegistryAsset) {
    for (const spawn of registry.lootSpawns) {
      this.lootById.set(spawn.id, { ...spawn });
    }
    for (const terminal of registry.terminals) {
      this.terminals.set(terminal.id, {
        record: { ...terminal },
        opened: false,
        lootIds: [],
      });
    }
    this.objectives = registry.objectives.map((objective) => ({
      ...objective,
      prerequisites: [...objective.prerequisites],
      ...(objective.gate ? { gate: { ...objective.gate } } : {}),
    }));
    this.terminalLootTable = registry.terminalLootTable.map((item) => ({ ...item }));
    this.nextGeneratedLootNumber = registry.lootSpawns.length + 1;
  }

  getSnapshot(playerId: string): AuthoritativeGameplaySnapshot {
    const inventory = this.inventoryByPlayerId.get(playerId) ?? [];
    return {
      lootSpawns: [...this.lootById.values()].map((spawn) => ({
        ...spawn,
        available: !this.claimedByLootId.has(spawn.id),
      })),
      terminals: [...this.terminals.values()].map(({ record, opened, lootIds }) => ({
        ...record,
        state: opened ? "opened" : "closed",
        lootIds: [...lootIds],
      })),
      objectives: this.objectives.map((objective) => ({
        ...objective,
        prerequisites: [...objective.prerequisites],
        ...(objective.gate ? { gate: { ...objective.gate } } : {}),
        state: objective.serverEventRequired
          ? "waiting-for-server-event"
          : "locked",
        blockedBy: objective.serverEventRequired
          ? [objective.serverEventRequired]
          : [...objective.prerequisites],
      })),
      inventory: inventory.map(cloneGrant),
    };
  }

  claimLoot(
    playerId: string,
    lootId: string,
    position: ServerPosition,
  ): { item: GrantedGameplayItem; inventory: GrantedGameplayItem[] } {
    const spawn = this.lootById.get(lootId);
    if (!spawn) throw new GameplayStateError("loot-not-found");
    if (this.claimedByLootId.has(lootId)) {
      throw new GameplayStateError("loot-already-claimed");
    }
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.z) ||
      Math.hypot(position.x - spawn.x, position.z - spawn.z) > LOOT_INTERACTION_RADIUS
    ) {
      throw new GameplayStateError("loot-out-of-range");
    }

    const item: GrantedGameplayItem = {
      lootId,
      kind: spawn.kind,
      label: spawn.label,
      scrap: spawn.scrap,
      ...(spawn.weaponId ? { weaponId: spawn.weaponId } : {}),
      ...(spawn.modId ? { modId: spawn.modId } : {}),
    };
    this.claimedByLootId.set(lootId, playerId);
    const inventory = this.inventoryByPlayerId.get(playerId) ?? [];
    inventory.push(item);
    this.inventoryByPlayerId.set(playerId, inventory);
    return { item: cloneGrant(item), inventory: inventory.map(cloneGrant) };
  }

  openTerminal(
    terminalId: string,
    position: ServerPosition,
  ): { terminalId: string; lootIds: string[] } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) throw new GameplayStateError("terminal-not-found");
    if (terminal.opened) throw new GameplayStateError("terminal-already-open");
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.z) ||
      Math.hypot(
        position.x - terminal.record.x,
        position.z - terminal.record.z,
      ) > terminal.record.interactionRadius
    ) {
      throw new GameplayStateError("terminal-out-of-range");
    }

    const availableDrops = this.terminalLootTable.filter((item) => {
      if (item.rarity === "ANOMALY" && terminal.record.sectorTier < 4) return false;
      // The current server mission has no authoritative uprising or stress state.
      // Match the actual initial mission table: suppress legendary drops until
      // that progression is implemented server-side.
      if (item.rarity === "LEGENDARY") return false;
      return true;
    });
    const drops = availableDrops.map((item) => ({
      item,
      weight: Math.round(item.baseWeight * 1_000),
    }));
    const totalWeight = drops.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0 || !Number.isSafeInteger(totalWeight)) {
      throw new Error("Terminal loot table has no safe weighted choices.");
    }

    const lootIds: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const item = this.pickWeightedDrop(drops, totalWeight);
      const lootNumber = this.nextGeneratedLootNumber;
      this.nextGeneratedLootNumber += 1;
      const lootId = `map-loot-${String(lootNumber).padStart(4, "0")}`;
      const angle = (index / 4) * Math.PI * 2;
      const spawn: GameplayLootSpawn = {
        id: lootId,
        kind: item.kind,
        label: item.label,
        x: Number((terminal.record.x + Math.cos(angle) * 1.35).toFixed(3)),
        z: Number((terminal.record.z + Math.sin(angle) * 1.35).toFixed(3)),
        scrap: item.currencyScrapValue,
        ...(item.weaponId ? { weaponId: item.weaponId } : {}),
        ...(item.modId ? { modId: item.modId } : {}),
      };
      this.lootById.set(lootId, spawn);
      lootIds.push(lootId);
    }
    terminal.opened = true;
    terminal.lootIds = lootIds;
    return { terminalId, lootIds: [...lootIds] };
  }

  private pickWeightedDrop(
    drops: Array<{ item: TerminalLootDefinition; weight: number }>,
    totalWeight: number,
  ): TerminalLootDefinition {
    let cursor = randomInt(totalWeight);
    for (const entry of drops) {
      cursor -= entry.weight;
      if (cursor < 0) return entry.item;
    }
    throw new Error("Terminal loot weight selection fell outside its validated range.");
  }
}
