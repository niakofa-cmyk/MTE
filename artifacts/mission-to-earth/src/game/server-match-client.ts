export type MatchInput = {
  inputFlags: number;
  pitch: number;
  yaw: number;
  movementVector: { forward: number; strafe: number };
};

export type ServerLootKind = "weapon" | "ammo" | "med" | "armor" | "mod" | "intel";

export type ServerLootSpawn = {
  id: string;
  kind: ServerLootKind;
  label: string;
  x: number;
  z: number;
  scrap: number;
  available: boolean;
  weaponId?: string;
  modId?: string;
};

export type ServerInventoryItem = {
  lootId: string;
  kind: ServerLootKind;
  label: string;
  scrap: number;
  weaponId?: string;
  modId?: string;
};

export type ServerTerminal = {
  id: string;
  x: number;
  z: number;
  interactionRadius: number;
  sectorTier: number;
  state: "closed" | "opened";
  lootIds: string[];
};

export type ServerGameplayState = {
  lootSpawns: ServerLootSpawn[];
  terminals: ServerTerminal[];
  objectives: Array<{ id: string; state: string; blockedBy: string[] }>;
  inventory: ServerInventoryItem[];
};

export type ServerPlayerSnapshot = {
  playerId: string;
  lastProcessedSequence: number;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
};

type MatchSnapshot = { players: ServerPlayerSnapshot[] };
type StoredSession = {
  matchId: string;
  playerId: string;
  accessToken: string;
  nextSequence: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type FetchLike = typeof fetch;

const SESSION_STORAGE_KEY = "mte.server-match.v1";
const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INPUT_FIRE_RIGHT = 1 << 0;
const INPUT_FIRE_LEFT = 1 << 1;
const INPUT_RELOAD_RIGHT = 1 << 2;
const INPUT_RELOAD_LEFT = 1 << 3;
const INPUT_FOCUS = 1 << 4;

export class ServerMatchError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ServerMatchError";
    this.status = status;
    this.code = code;
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLootKind(value: unknown): value is ServerLootKind {
  return value === "weapon" || value === "ammo" || value === "med" ||
    value === "armor" || value === "mod" || value === "intel";
}

function readStoredSession(storage: StorageLike | null): StoredSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      typeof value.matchId !== "string" ||
      !MATCH_ID_PATTERN.test(value.matchId) ||
      typeof value.playerId !== "string" ||
      !MATCH_ID_PATTERN.test(value.playerId) ||
      typeof value.accessToken !== "string" ||
      !PLAYER_TOKEN_PATTERN.test(value.accessToken) ||
      !Number.isSafeInteger(value.nextSequence) ||
      (value.nextSequence as number) < 1
    ) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return {
      matchId: value.matchId,
      playerId: value.playerId,
      accessToken: value.accessToken,
      nextSequence: value.nextSequence as number,
    };
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function parseSnapshot(value: unknown, matchId: string): MatchSnapshot {
  if (
    !isRecord(value) ||
    value.matchId !== matchId ||
    !isRecord(value.snapshot) ||
    !Array.isArray(value.snapshot.players)
  ) {
    throw new Error("The match server returned an invalid player snapshot.");
  }
  const players = value.snapshot.players.map((player): ServerPlayerSnapshot => {
    if (
      !isRecord(player) ||
      typeof player.playerId !== "string" ||
      !Number.isSafeInteger(player.lastProcessedSequence) ||
      !isRecord(player.position) ||
      !finite(player.position.x) ||
      !finite(player.position.y) ||
      !finite(player.position.z) ||
      !finite(player.yaw) ||
      !finite(player.pitch)
    ) {
      throw new Error("The match server returned an invalid player record.");
    }
    return {
      playerId: player.playerId,
      lastProcessedSequence: player.lastProcessedSequence as number,
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      yaw: player.yaw,
      pitch: player.pitch,
    };
  });
  return { players };
}

function parseGameplayState(value: unknown, matchId: string): ServerGameplayState {
  if (
    !isRecord(value) ||
    value.matchId !== matchId ||
    !isRecord(value.gameplay) ||
    !Array.isArray(value.gameplay.lootSpawns) ||
    !Array.isArray(value.gameplay.terminals) ||
    !Array.isArray(value.gameplay.objectives) ||
    !Array.isArray(value.gameplay.inventory) ||
    value.gameplay.lootSpawns.length > 2_304 ||
    value.gameplay.terminals.length > 64 ||
    value.gameplay.inventory.length > 2_304
  ) {
    throw new Error("The match server returned invalid gameplay state.");
  }

  const lootSpawns = value.gameplay.lootSpawns.map((spawn): ServerLootSpawn => {
    if (
      !isRecord(spawn) ||
      typeof spawn.id !== "string" ||
      !/^map-loot-\d{4}$/.test(spawn.id) ||
      !isLootKind(spawn.kind) ||
      typeof spawn.label !== "string" ||
      !finite(spawn.x) ||
      !finite(spawn.z) ||
      !finite(spawn.scrap) ||
      typeof spawn.available !== "boolean" ||
      (spawn.weaponId !== undefined && typeof spawn.weaponId !== "string") ||
      (spawn.modId !== undefined && typeof spawn.modId !== "string")
    ) {
      throw new Error("The match server returned an invalid loot spawn.");
    }
    return {
      id: spawn.id,
      kind: spawn.kind,
      label: spawn.label,
      x: spawn.x,
      z: spawn.z,
      scrap: spawn.scrap,
      available: spawn.available,
      ...(spawn.weaponId ? { weaponId: spawn.weaponId } : {}),
      ...(spawn.modId ? { modId: spawn.modId } : {}),
    };
  });

  const terminals = value.gameplay.terminals.map((terminal): ServerTerminal => {
    if (
      !isRecord(terminal) ||
      typeof terminal.id !== "string" ||
      !/^terminal-\d{2}$/.test(terminal.id) ||
      !finite(terminal.x) ||
      !finite(terminal.z) ||
      !finite(terminal.interactionRadius) ||
      !Number.isInteger(terminal.sectorTier) ||
      (terminal.state !== "closed" && terminal.state !== "opened") ||
      !Array.isArray(terminal.lootIds) ||
      !terminal.lootIds.every((id) => typeof id === "string" && /^map-loot-\d{4}$/.test(id))
    ) {
      throw new Error("The match server returned an invalid terminal record.");
    }
    return {
      id: terminal.id,
      x: terminal.x,
      z: terminal.z,
      interactionRadius: terminal.interactionRadius,
      sectorTier: terminal.sectorTier as number,
      state: terminal.state,
      lootIds: terminal.lootIds as string[],
    };
  });

  const inventory = value.gameplay.inventory.map((item): ServerInventoryItem => {
    if (
      !isRecord(item) ||
      typeof item.lootId !== "string" ||
      !/^map-loot-\d{4}$/.test(item.lootId) ||
      !isLootKind(item.kind) ||
      typeof item.label !== "string" ||
      !finite(item.scrap) ||
      (item.weaponId !== undefined && typeof item.weaponId !== "string") ||
      (item.modId !== undefined && typeof item.modId !== "string")
    ) {
      throw new Error("The match server returned an invalid inventory item.");
    }
    return {
      lootId: item.lootId,
      kind: item.kind,
      label: item.label,
      scrap: item.scrap,
      ...(item.weaponId ? { weaponId: item.weaponId } : {}),
      ...(item.modId ? { modId: item.modId } : {}),
    };
  });

  const objectives = value.gameplay.objectives.map((objective) => {
    if (
      !isRecord(objective) ||
      typeof objective.id !== "string" ||
      typeof objective.state !== "string" ||
      !Array.isArray(objective.blockedBy) ||
      !objective.blockedBy.every((entry) => typeof entry === "string")
    ) {
      throw new Error("The match server returned an invalid objective record.");
    }
    return {
      id: objective.id,
      state: objective.state,
      blockedBy: objective.blockedBy as string[],
    };
  });

  return { lootSpawns, terminals, objectives, inventory };
}

export class ServerMatchClient {
  private readonly session: StoredSession;
  private readonly fetcher: FetchLike;
  private readonly storage: StorageLike | null;
  private nextSequence: number;
  private latestInput: (MatchInput & { sequenceNumber: number }) | null = null;
  private sendingInput = false;
  private inputErrorHandler: ((error: Error) => void) | null = null;

  private constructor(
    session: StoredSession,
    fetcher: FetchLike,
    storage: StorageLike | null,
  ) {
    this.session = session;
    this.fetcher = fetcher;
    this.storage = storage;
    this.nextSequence = session.nextSequence;
  }

  get matchId(): string {
    return this.session.matchId;
  }

  get playerId(): string {
    return this.session.playerId;
  }

  static async connect(options: {
    fetcher?: FetchLike;
    storage?: StorageLike | null;
  } = {}): Promise<{
    client: ServerMatchClient;
    player: ServerPlayerSnapshot;
    gameplay: ServerGameplayState;
    restored: boolean;
  }> {
    const fetcher = options.fetcher ?? fetch;
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const stored = readStoredSession(storage);

    if (stored) {
      const client = new ServerMatchClient(stored, fetcher, storage);
      try {
        const snapshot = await client.getSnapshot();
        const player = snapshot.players.find((entry) => entry.playerId === stored.playerId);
        if (!player) throw new ServerMatchError("Player session has expired.", 401);
        client.nextSequence = Math.max(stored.nextSequence, player.lastProcessedSequence + 1);
        client.persistSession();
        const gameplay = await client.getGameplayState();
        return { client, player, gameplay, restored: true };
      } catch (error) {
        if (!(error instanceof ServerMatchError) || (error.status !== 401 && error.status !== 404)) {
          throw error;
        }
        storage?.removeItem(SESSION_STORAGE_KEY);
      }
    }

    const createdValue = await requestJson(fetcher, "/api/matches", { method: "POST" });
    if (
      !isRecord(createdValue) ||
      typeof createdValue.matchId !== "string" ||
      !MATCH_ID_PATTERN.test(createdValue.matchId)
    ) {
      throw new Error("The match server did not return a valid match ID.");
    }
    const matchId = createdValue.matchId;
    const joinedValue = await requestJson(fetcher, `/api/matches/${matchId}/players`, {
      method: "POST",
    });
    if (
      !isRecord(joinedValue) ||
      joinedValue.matchId !== matchId ||
      typeof joinedValue.playerId !== "string" ||
      !MATCH_ID_PATTERN.test(joinedValue.playerId) ||
      typeof joinedValue.accessToken !== "string" ||
      !PLAYER_TOKEN_PATTERN.test(joinedValue.accessToken)
    ) {
      throw new Error("The match server did not return valid player credentials.");
    }
    const joinedSnapshot = parseSnapshot(
      { matchId: joinedValue.matchId, snapshot: joinedValue.snapshot },
      matchId,
    );
    const player = joinedSnapshot.players.find((entry) => entry.playerId === joinedValue.playerId);
    if (!player) throw new Error("The match server omitted the joined player.");

    const session: StoredSession = {
      matchId,
      playerId: joinedValue.playerId,
      accessToken: joinedValue.accessToken,
      nextSequence: Math.max(1, player.lastProcessedSequence + 1),
    };
    const client = new ServerMatchClient(session, fetcher, storage);
    client.persistSession();
    const gameplay = await client.getGameplayState();
    return { client, player, gameplay, restored: false };
  }

  setInputErrorHandler(handler: ((error: Error) => void) | null): void {
    this.inputErrorHandler = handler;
  }

  async getSnapshot(): Promise<MatchSnapshot> {
    const value = await this.authorizedJson(`/api/matches/${this.matchId}/snapshot`);
    return parseSnapshot(value, this.matchId);
  }

  async getGameplayState(): Promise<ServerGameplayState> {
    const value = await this.authorizedJson(`/api/matches/${this.matchId}/world-state`);
    return parseGameplayState(value, this.matchId);
  }

  submitInput(input: MatchInput): void {
    this.latestInput = { ...input, sequenceNumber: this.nextSequence };
    this.nextSequence += 1;
    this.session.nextSequence = this.nextSequence;
    this.persistSession();
    if (!this.sendingInput) void this.drainInputQueue();
  }

  async claimLoot(lootId: string): Promise<{
    item: ServerInventoryItem;
    inventory: ServerInventoryItem[];
  }> {
    if (!/^map-loot-\d{4}$/.test(lootId)) throw new Error("Invalid server loot ID.");
    try {
      const value = await this.authorizedJson(
        `/api/matches/${this.matchId}/loot/${lootId}/claim`,
        { method: "POST" },
      );
      if (!isRecord(value) || value.matchId !== this.matchId) {
        throw new Error("The match server returned an invalid loot claim.");
      }
      const item = parseGameplayState(
        { matchId: this.matchId, gameplay: { lootSpawns: [], terminals: [], objectives: [], inventory: [value.item] } },
        this.matchId,
      ).inventory[0];
      const inventory = parseGameplayState(
        { matchId: this.matchId, gameplay: { lootSpawns: [], terminals: [], objectives: [], inventory: value.inventory } },
        this.matchId,
      ).inventory;
      if (!item) throw new Error("The match server returned an empty loot claim.");
      return { item, inventory };
    } catch (error) {
      if (error instanceof ServerMatchError && error.status === 409 && error.code === "loot-already-claimed") {
        const state = await this.getGameplayState();
        const item = state.inventory.find((entry) => entry.lootId === lootId);
        if (item) return { item, inventory: state.inventory };
      }
      throw error;
    }
  }

  async openTerminal(terminalId: string): Promise<ServerGameplayState> {
    if (!/^terminal-\d{2}$/.test(terminalId)) throw new Error("Invalid server terminal ID.");
    try {
      await this.authorizedJson(
        `/api/matches/${this.matchId}/terminals/${terminalId}/open`,
        { method: "POST" },
      );
    } catch (error) {
      if (!(error instanceof ServerMatchError) || error.status !== 409 || error.code !== "terminal-already-open") {
        throw error;
      }
    }
    return this.getGameplayState();
  }

  private async drainInputQueue(): Promise<void> {
    this.sendingInput = true;
    try {
      while (this.latestInput) {
        const input = this.latestInput;
        this.latestInput = null;
        const value = await this.authorizedJson(
          `/api/matches/${this.matchId}/input`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          },
        );
        if (!isRecord(value) || value.accepted !== true) {
          throw new Error("The match server did not accept player input.");
        }
      }
    } catch (error) {
      this.inputErrorHandler?.(error instanceof Error ? error : new Error("Input sync failed."));
    } finally {
      this.sendingInput = false;
      if (this.latestInput) void this.drainInputQueue();
    }
  }

  private async authorizedJson(path: string, init: RequestInit = {}): Promise<unknown> {
    return requestJson(this.fetcher, path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${this.session.accessToken}`,
      },
    });
  }

  private persistSession(): void {
    try {
      this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch {
      // The active session still works in memory if browser storage is unavailable.
    }
  }
}

async function requestJson(
  fetcher: FetchLike,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(path, { ...init, cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new Error("Could not reach the match server. Solo play remains available.");
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = isRecord(value) && typeof value.error === "string" ? value.error : undefined;
    throw new ServerMatchError(code ?? `Match server error (${response.status}).`, response.status, code);
  }
  return value;
}

export const SERVER_INPUT_FLAGS = {
  FIRE_RIGHT: INPUT_FIRE_RIGHT,
  FIRE_LEFT: INPUT_FIRE_LEFT,
  RELOAD_RIGHT: INPUT_RELOAD_RIGHT,
  RELOAD_LEFT: INPUT_RELOAD_LEFT,
  FOCUS_AIM: INPUT_FOCUS,
} as const;
