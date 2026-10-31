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

export type ServerExtractionStatus = {
  matchId: string;
  inRange: boolean;
  progress: number;
  requiredSeconds: number;
  ready: boolean;
  settled: boolean;
};

export type PersistedServerInventoryItem = ServerInventoryItem & {
  matchId: string;
  acquiredAt: string;
};

export type ServerPlayerProfile = {
  credits: number;
  extractions: number;
  inventory: PersistedServerInventoryItem[];
};

export type ServerExtractionSettlement = {
  matchId: string;
  alreadySettled: boolean;
  creditsAwarded: number;
  inventory: PersistedServerInventoryItem[];
  profile: ServerPlayerProfile;
};

export type ServerPlayerSnapshot = {
  playerId: string;
  lastProcessedSequence: number;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  operatorId: ServerOperatorId;
  rightHandState: ServerHandAction;
  leftHandState: ServerHandAction;
  rightWeapon: ServerWeaponHandSnapshot;
  leftWeapon: ServerWeaponHandSnapshot;
  ability: ServerAbilitySnapshot;
  isFocusAiming: boolean;
  health: number;
  team?: "accord" | "eon-dusk";
};

export type ServerMatchMapId = "nod" | "cinder-row-blackout";
export type ServerArenaRoundSnapshot = {
  phase: "waiting" | "active" | "finished";
  remainingSeconds: number;
  relayProgress: number;
  controlledBy: "accord" | "eon-dusk" | null;
  contested: boolean;
  accordPlayers: number;
  duskPlayers: number;
  winner: "accord" | "eon-dusk" | null;
};

export type RealtimeConnectionStatus = "connecting" | "connected" | "error";
export type RealtimeConnectionHandlers = {
  onSnapshot: (snapshot: MatchSnapshot) => void;
  onStatus?: (status: RealtimeConnectionStatus) => void;
  onError?: (error: Error) => void;
};

export type ServerOperatorId = "jaya" | "bodhi" | "khensu" | "aset" | "ananda" | "nefret";
export type ServerAbilityId =
  | "TEMPORAL_PHASE"
  | "MANDALA_GATEWAY"
  | "THERMITE_BREACH"
  | "RAS_RADIANCE"
  | "QUANTUM_SHIFT"
  | "SHATTER_PULSE";
export type ServerHandAction = "IDLE" | "FIRING" | "RELOADING" | "DRY_CLICK";
export type ServerWeaponHandSnapshot = {
  weaponId: string;
  ammoInMagazine: number;
  reserveAmmo: number;
  maxClipSize: number;
  isReloading: boolean;
  reloadRemainingSeconds: number;
};
export type ServerAbilitySnapshot = {
  abilityId: ServerAbilityId;
  isActive: boolean;
  cooldownRemainingSeconds: number;
  activeDurationRemainingSeconds: number;
};

export type MatchSnapshot = {
  protocolVersion: 3;
  players: ServerPlayerSnapshot[];
  mapId: ServerMatchMapId;
  mapVersion: string | null;
  arenaRound: ServerArenaRoundSnapshot | null;
};
type StoredSession = {
  matchId: string;
  playerId: string;
  accessToken: string;
  nextSequence: number;
  mapId: ServerMatchMapId;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type FetchLike = typeof fetch;

const SESSION_STORAGE_KEY = "mte.server-match.v1";
function sessionStorageKey(mapId: ServerMatchMapId): string {
  return mapId === "nod" ? SESSION_STORAGE_KEY : `${SESSION_STORAGE_KEY}:${mapId}`;
}
const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INPUT_FIRE_RIGHT = 1 << 0;
const INPUT_FIRE_LEFT = 1 << 1;
const INPUT_RELOAD_RIGHT = 1 << 2;
const INPUT_RELOAD_LEFT = 1 << 3;
const INPUT_FOCUS = 1 << 4;
const INPUT_RELOAD_REQUEST = 1 << 5;
const INPUT_ACTIVATE_ABILITY = 1 << 6;
const SERVER_OPERATOR_IDS: readonly ServerOperatorId[] = [
  "jaya",
  "bodhi",
  "khensu",
  "aset",
  "ananda",
  "nefret",
];
const SERVER_ABILITY_IDS: readonly ServerAbilityId[] = [
  "TEMPORAL_PHASE",
  "MANDALA_GATEWAY",
  "THERMITE_BREACH",
  "RAS_RADIANCE",
  "QUANTUM_SHIFT",
  "SHATTER_PULSE",
];
const SERVER_WEAPON_IDS = [
  "smg",
  "rifle",
  "shotgun",
  "lmg",
  "rail",
  "pistol",
  "needles",
  "slug",
];
const HAND_ACTIONS: readonly ServerHandAction[] = [
  "IDLE",
  "FIRING",
  "RELOADING",
  "DRY_CLICK",
];

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

function parsePersistedInventoryItem(value: unknown): PersistedServerInventoryItem {
  const kinds = new Set<ServerLootKind>(["weapon", "ammo", "med", "armor", "mod", "intel"]);
  if (
    !isRecord(value) ||
    typeof value.lootId !== "string" ||
    typeof value.kind !== "string" ||
    !kinds.has(value.kind as ServerLootKind) ||
    typeof value.label !== "string" ||
    !Number.isSafeInteger(value.scrap) ||
    typeof value.matchId !== "string" ||
    typeof value.acquiredAt !== "string"
  ) {
    throw new Error("The saved inventory item was invalid.");
  }
  return {
    lootId: value.lootId,
    kind: value.kind as ServerLootKind,
    label: value.label,
    scrap: value.scrap as number,
    ...(typeof value.weaponId === "string" ? { weaponId: value.weaponId } : {}),
    ...(typeof value.modId === "string" ? { modId: value.modId } : {}),
    matchId: value.matchId,
    acquiredAt: value.acquiredAt,
  };
}

export function parseServerProfile(value: unknown): ServerPlayerProfile {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.credits) ||
    !Number.isSafeInteger(value.extractions) ||
    !Array.isArray(value.inventory)
  ) {
    throw new Error("The saved player profile was invalid.");
  }
  return {
    credits: value.credits as number,
    extractions: value.extractions as number,
    inventory: value.inventory.map(parsePersistedInventoryItem),
  };
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLootKind(value: unknown): value is ServerLootKind {
  return value === "weapon" || value === "ammo" || value === "med" ||
    value === "armor" || value === "mod" || value === "intel";
}

function readStoredSession(
  storage: StorageLike | null,
  key: string,
  mapId: ServerMatchMapId,
): StoredSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
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
      storage.removeItem(key);
      return null;
    }
    return {
      matchId: value.matchId,
      playerId: value.playerId,
      accessToken: value.accessToken,
      nextSequence: value.nextSequence as number,
      mapId,
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function parseSnapshot(value: unknown, matchId: string): MatchSnapshot {
  if (
    !isRecord(value) ||
    value.matchId !== matchId ||
    !isRecord(value.snapshot) ||
    value.snapshot.protocolVersion !== 3 ||
    !Array.isArray(value.snapshot.players) ||
    value.snapshot.players.length > 64
  ) {
    throw new Error("The match server returned an invalid player snapshot.");
  }
  const snapshotRecord = value.snapshot;
  const mapId = snapshotRecord.mapId === undefined
    ? "nod"
    : snapshotRecord.mapId === "nod" || snapshotRecord.mapId === "cinder-row-blackout"
      ? snapshotRecord.mapId
      : null;
  if (!mapId) throw new Error("The match server returned an unknown map.");
  const mapVersion = snapshotRecord.mapVersion === undefined
    ? null
    : typeof snapshotRecord.mapVersion === "string"
      ? snapshotRecord.mapVersion
      : null;
  if (snapshotRecord.mapVersion !== undefined && mapVersion === null) {
    throw new Error("The match server returned an invalid map version.");
  }
  const arenaRoundValue = snapshotRecord.arenaRound;
  let arenaRound: ServerArenaRoundSnapshot | null = null;
  if (arenaRoundValue !== undefined && arenaRoundValue !== null) {
    if (
      !isRecord(arenaRoundValue) ||
      !["waiting", "active", "finished"].includes(String(arenaRoundValue.phase)) ||
      !finite(arenaRoundValue.remainingSeconds) ||
      arenaRoundValue.remainingSeconds < 0 ||
      arenaRoundValue.remainingSeconds > 180 ||
      !finite(arenaRoundValue.relayProgress) ||
      arenaRoundValue.relayProgress < 0 ||
      arenaRoundValue.relayProgress > 100 ||
      typeof arenaRoundValue.contested !== "boolean" ||
      typeof arenaRoundValue.accordPlayers !== "number" ||
      !Number.isInteger(arenaRoundValue.accordPlayers) ||
      arenaRoundValue.accordPlayers < 0 ||
      arenaRoundValue.accordPlayers > 4 ||
      typeof arenaRoundValue.duskPlayers !== "number" ||
      !Number.isInteger(arenaRoundValue.duskPlayers) ||
      arenaRoundValue.duskPlayers < 0 ||
      arenaRoundValue.duskPlayers > 4 ||
      (arenaRoundValue.controlledBy !== null &&
        arenaRoundValue.controlledBy !== "accord" &&
        arenaRoundValue.controlledBy !== "eon-dusk") ||
      (arenaRoundValue.winner !== null &&
        arenaRoundValue.winner !== "accord" &&
        arenaRoundValue.winner !== "eon-dusk")
    ) {
      throw new Error("The match server returned an invalid arena round.");
    }
    arenaRound = {
      phase: arenaRoundValue.phase as ServerArenaRoundSnapshot["phase"],
      remainingSeconds: arenaRoundValue.remainingSeconds,
      relayProgress: arenaRoundValue.relayProgress,
      controlledBy: arenaRoundValue.controlledBy as ServerArenaRoundSnapshot["controlledBy"],
      contested: arenaRoundValue.contested,
      accordPlayers: arenaRoundValue.accordPlayers,
      duskPlayers: arenaRoundValue.duskPlayers,
      winner: arenaRoundValue.winner as ServerArenaRoundSnapshot["winner"],
    };
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
      !finite(player.pitch) ||
      !SERVER_OPERATOR_IDS.includes(player.operatorId as ServerOperatorId) ||
      (player.team !== undefined && player.team !== "accord" && player.team !== "eon-dusk") ||
      !HAND_ACTIONS.includes(player.rightHandState as ServerHandAction) ||
      !HAND_ACTIONS.includes(player.leftHandState as ServerHandAction) ||
      typeof player.isFocusAiming !== "boolean" ||
      !finite(player.health) ||
      player.health < 0 ||
      player.health > 100 ||
      !isRecord(player.rightWeapon) ||
      !isRecord(player.leftWeapon) ||
      !isRecord(player.ability)
    ) {
      throw new Error("The match server returned an invalid player record.");
    }
    const parseHand = (
      input: Record<string, unknown>,
      action: ServerHandAction,
    ): ServerWeaponHandSnapshot => {
      if (
        typeof input.weaponId !== "string" ||
        !SERVER_WEAPON_IDS.includes(input.weaponId) ||
        !Number.isInteger(input.ammoInMagazine) ||
        !Number.isInteger(input.reserveAmmo) ||
        !Number.isInteger(input.maxClipSize) ||
        (input.ammoInMagazine as number) < 0 ||
        (input.reserveAmmo as number) < 0 ||
        (input.reserveAmmo as number) > 2_000 ||
        (input.maxClipSize as number) < 1 ||
        (input.maxClipSize as number) > 500 ||
        (input.ammoInMagazine as number) > (input.maxClipSize as number) ||
        typeof input.isReloading !== "boolean" ||
        input.isReloading !== (action === "RELOADING") ||
        !finite(input.reloadRemainingSeconds) ||
        input.reloadRemainingSeconds < 0 ||
        input.reloadRemainingSeconds > 20
      ) {
        throw new Error("The match server returned invalid weapon state.");
      }
      return {
        weaponId: input.weaponId,
        ammoInMagazine: input.ammoInMagazine as number,
        reserveAmmo: input.reserveAmmo as number,
        maxClipSize: input.maxClipSize as number,
        isReloading: input.isReloading,
        reloadRemainingSeconds: input.reloadRemainingSeconds,
      };
    };
    if (
      !SERVER_ABILITY_IDS.includes(player.ability.abilityId as ServerAbilityId) ||
      typeof player.ability.isActive !== "boolean" ||
      !finite(player.ability.cooldownRemainingSeconds) ||
      player.ability.cooldownRemainingSeconds < 0 ||
      player.ability.cooldownRemainingSeconds > 600 ||
      !finite(player.ability.activeDurationRemainingSeconds) ||
      player.ability.activeDurationRemainingSeconds < 0 ||
      player.ability.activeDurationRemainingSeconds > 120
    ) {
      throw new Error("The match server returned invalid ability state.");
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
      operatorId: player.operatorId as ServerOperatorId,
      rightHandState: player.rightHandState as ServerHandAction,
      leftHandState: player.leftHandState as ServerHandAction,
      rightWeapon: parseHand(
        player.rightWeapon,
        player.rightHandState as ServerHandAction,
      ),
      leftWeapon: parseHand(
        player.leftWeapon,
        player.leftHandState as ServerHandAction,
      ),
      ability: {
        abilityId: player.ability.abilityId as ServerAbilityId,
        isActive: player.ability.isActive,
        cooldownRemainingSeconds:
          player.ability.cooldownRemainingSeconds,
        activeDurationRemainingSeconds:
          player.ability.activeDurationRemainingSeconds,
      },
      isFocusAiming: player.isFocusAiming,
      health: player.health,
      ...(player.team === "accord" || player.team === "eon-dusk"
        ? { team: player.team }
        : {}),
    };
  });
  return { protocolVersion: 3, players, mapId, mapVersion, arenaRound };
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
  private readonly storageKey: string;
  private nextSequence: number;
  private latestInput: (MatchInput & { sequenceNumber: number }) | null = null;
  private sendingInput = false;
  private inputErrorHandler: ((error: Error) => void) | null = null;
  private realtimeEnabled = false;
  private realtimeSocket: WebSocket | null = null;
  private realtimeAuthorized = false;
  private flushRealtimeInput: (() => void) | null = null;

  private constructor(
    session: StoredSession,
    fetcher: FetchLike,
    storage: StorageLike | null,
    storageKey: string,
  ) {
    this.session = session;
    this.fetcher = fetcher;
    this.storage = storage;
    this.storageKey = storageKey;
    this.nextSequence = session.nextSequence;
  }

  get matchId(): string {
    return this.session.matchId;
  }

  get playerId(): string {
    return this.session.playerId;
  }

  get mapId(): ServerMatchMapId {
    return this.session.mapId;
  }

  get isRealtimeConnected(): boolean {
    return this.realtimeAuthorized;
  }

  get localPlayerId(): string {
    return this.session.playerId;
  }

  static async connect(options: {
    fetcher?: FetchLike;
    storage?: StorageLike | null;
    operatorId?: ServerOperatorId;
    mapId?: ServerMatchMapId;
    joinMatchId?: string;
  } = {}): Promise<{
    client: ServerMatchClient;
    player: ServerPlayerSnapshot;
    gameplay: ServerGameplayState;
    operatorId: ServerOperatorId;
    restored: boolean;
    snapshot: MatchSnapshot;
  }> {
    const fetcher = options.fetcher ?? fetch;
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const requestedOperatorId = options.operatorId ?? "jaya";
    const requestedMapId = options.mapId ?? "nod";
    const storageKey = sessionStorageKey(requestedMapId);
    if (!SERVER_OPERATOR_IDS.includes(requestedOperatorId)) {
      throw new Error("The selected operator is not available in server matches.");
    }
    if (
      requestedMapId !== "nod" &&
      requestedMapId !== "cinder-row-blackout"
    ) {
      throw new Error("The selected match map is not available.");
    }
    const joinMatchId = options.joinMatchId?.trim() || null;
    if (joinMatchId && !MATCH_ID_PATTERN.test(joinMatchId)) {
      throw new Error("Enter a valid match code.");
    }
    const stored = joinMatchId ? null : readStoredSession(storage, storageKey, requestedMapId);

    if (stored) {
      const client = new ServerMatchClient(stored, fetcher, storage, storageKey);
      try {
        const snapshot = await client.getSnapshot();
        if (snapshot.mapId !== requestedMapId) {
          throw new ServerMatchError("The saved match belongs to another mode.", 409);
        }
        const player = snapshot.players.find((entry) => entry.playerId === stored.playerId);
        if (!player) throw new ServerMatchError("Player session has expired.", 401);
        client.nextSequence = Math.max(stored.nextSequence, player.lastProcessedSequence + 1);
        client.persistSession();
        const gameplay = await client.getGameplayState();
        return {
          client,
          player,
          gameplay,
          operatorId: player.operatorId,
          restored: true,
          snapshot,
        };
      } catch (error) {
        if (!(error instanceof ServerMatchError) || (error.status !== 401 && error.status !== 404)) {
          throw error;
        }
        storage?.removeItem(storageKey);
      }
    }

    let matchId = joinMatchId;
    if (!matchId) {
      const createdValue = await requestJson(fetcher, "/api/matches", {
        method: "POST",
        ...(requestedMapId === "nod"
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mapId: requestedMapId }),
            }),
      });
      if (
        !isRecord(createdValue) ||
        typeof createdValue.matchId !== "string" ||
        !MATCH_ID_PATTERN.test(createdValue.matchId) ||
        (createdValue.mapId ?? "nod") !== requestedMapId
      ) {
        throw new Error("The match server did not return a valid match ID.");
      }
      matchId = createdValue.matchId;
    }
    const joinedValue = await requestJson(
      fetcher,
      `/api/matches/${matchId}/players`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId: requestedOperatorId }),
      },
    );
    if (
      !isRecord(joinedValue) ||
      joinedValue.matchId !== matchId ||
      typeof joinedValue.playerId !== "string" ||
      !MATCH_ID_PATTERN.test(joinedValue.playerId) ||
      typeof joinedValue.accessToken !== "string" ||
      !PLAYER_TOKEN_PATTERN.test(joinedValue.accessToken) ||
      joinedValue.operatorId !== requestedOperatorId
    ) {
      throw new Error("The match server did not return valid player credentials.");
    }
    const joinedSnapshot = parseSnapshot(
      { matchId: joinedValue.matchId, snapshot: joinedValue.snapshot },
      matchId,
    );
    if (joinedSnapshot.mapId !== requestedMapId) {
      throw new Error("That match code belongs to a different game mode.");
    }
    const player = joinedSnapshot.players.find((entry) => entry.playerId === joinedValue.playerId);
    if (!player || player.operatorId !== requestedOperatorId) {
      throw new Error("The match server omitted the joined player profile.");
    }

    const session: StoredSession = {
      matchId,
      playerId: joinedValue.playerId,
      accessToken: joinedValue.accessToken,
      nextSequence: Math.max(1, player.lastProcessedSequence + 1),
      mapId: requestedMapId,
    };
    const client = new ServerMatchClient(session, fetcher, storage, storageKey);
    client.persistSession();
    const gameplay = await client.getGameplayState();
    return {
      client,
      player,
      gameplay,
      operatorId: player.operatorId,
      restored: false,
      snapshot: joinedSnapshot,
    };
  }

  setInputErrorHandler(handler: ((error: Error) => void) | null): void {
    this.inputErrorHandler = handler;
  }

  connectRealtime(handlers: RealtimeConnectionHandlers): () => void {
    if (this.session.mapId !== "cinder-row-blackout") {
      handlers.onError?.(new Error("Real-time transport is only enabled for Cinder Row."));
      handlers.onStatus?.("error");
      return () => undefined;
    }
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      handlers.onError?.(new Error("This browser does not support real-time match transport."));
      handlers.onStatus?.("error");
      return () => undefined;
    }

    this.realtimeEnabled = true;
    let disposed = false;
    let terminalFailure = false;
    let attempt = 0;
    let retryTimer: number | undefined;
    let currentSocket: WebSocket | null = null;

    const scheduleRetry = () => {
      if (disposed || terminalFailure || retryTimer !== undefined) return;
      handlers.onStatus?.("connecting");
      const delay = Math.min(1_000 * 2 ** Math.min(attempt, 3), 8_000);
      attempt += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      handlers.onStatus?.("connecting");
      const url = new URL(
        `/api/matches/${this.matchId}/realtime`,
        window.location.href,
      );
      url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url);
      currentSocket = socket;
      this.realtimeSocket = socket;
      this.realtimeAuthorized = false;

      socket.addEventListener("open", () => {
        if (disposed || socket !== currentSocket) return;
        socket.send(JSON.stringify({
          type: "authenticate",
          accessToken: this.session.accessToken,
        }));
      });
      socket.addEventListener("message", (event) => {
        if (disposed || socket !== currentSocket || typeof event.data !== "string") return;
        let message: unknown;
        try {
          message = JSON.parse(event.data);
        } catch {
          handlers.onError?.(new Error("The real-time server sent invalid data."));
          return;
        }
        if (!isRecord(message) || typeof message.type !== "string") return;
        if (message.type === "input-rejected") {
          const reason = typeof message.reason === "string" ? message.reason : "input-rejected";
          handlers.onError?.(new Error(`Server rejected player input (${reason}).`));
          return;
        }
        if (message.type === "error") {
          const code = typeof message.code === "string" ? message.code : "match-session-failed";
          const error = new ServerMatchError(code, 409, code);
          handlers.onError?.(error);
          if (code === "unauthorized" || code === "not-found" || code === "round-finished") {
            terminalFailure = true;
            handlers.onStatus?.("error");
          }
          return;
        }
        if (message.type !== "ready" && message.type !== "snapshot") return;
        if (message.matchId !== this.matchId) {
          handlers.onError?.(new Error("The real-time server returned another match."));
          return;
        }
        if (
          message.type === "ready" &&
          (message.protocolVersion !== 1 || message.playerId !== this.session.playerId)
        ) {
          terminalFailure = true;
          handlers.onStatus?.("error");
          handlers.onError?.(new Error("The real-time server returned an invalid player session."));
          socket.close(1008, "invalid-player-session");
          return;
        }
        try {
          const snapshot = parseSnapshot(
            { matchId: this.matchId, snapshot: message.snapshot },
            this.matchId,
          );
          if (message.type === "ready") {
            this.realtimeAuthorized = true;
            attempt = 0;
            const localPlayer = snapshot.players.find(
              (player) => player.playerId === this.session.playerId,
            );
            if (localPlayer) {
              this.nextSequence = Math.max(
                this.nextSequence,
                localPlayer.lastProcessedSequence + 1,
              );
              this.session.nextSequence = this.nextSequence;
              this.persistSession();
            }
            handlers.onStatus?.("connected");
            this.flushRealtimeInput?.();
          }
          handlers.onSnapshot(snapshot);
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error : new Error("Invalid real-time snapshot."));
        }
      });
      socket.addEventListener("close", (event) => {
        if (socket === currentSocket) {
          currentSocket = null;
          this.realtimeSocket = null;
          this.realtimeAuthorized = false;
        }
        if (event.code === 4003 || event.code === 4004) {
          terminalFailure = true;
          handlers.onStatus?.("error");
          return;
        }
        scheduleRetry();
      });
      socket.addEventListener("error", () => {
        if (!disposed) handlers.onError?.(new Error("Real-time match link interrupted; reconnecting."));
      });
    };

    this.flushRealtimeInput = () => {
      if (
        !this.latestInput ||
        this.sendingInput ||
        !this.realtimeAuthorized ||
        !this.realtimeSocket ||
        this.realtimeSocket.readyState !== WebSocket.OPEN
      ) return;
      const input = this.latestInput;
      this.latestInput = null;
      this.realtimeSocket.send(JSON.stringify({ type: "input", ...input }));
    };
    connect();

    return () => {
      disposed = true;
      this.realtimeEnabled = false;
      this.realtimeAuthorized = false;
      this.flushRealtimeInput = null;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (currentSocket && currentSocket.readyState < WebSocket.CLOSING) {
        currentSocket.close(1000, "client-unmounted");
      }
      if (this.latestInput && !this.sendingInput) void this.drainInputQueue();
    };
  }

  static async connectRanked(options: {
    matchId: string;
    playerId: string;
    accessToken: string;
    operatorId: ServerOperatorId;
    fetcher?: FetchLike;
    storage?: StorageLike | null;
  }): Promise<{
    client: ServerMatchClient;
    player: ServerPlayerSnapshot;
    gameplay: ServerGameplayState;
    operatorId: ServerOperatorId;
    restored: false;
    snapshot: MatchSnapshot;
  }> {
    if (
      !MATCH_ID_PATTERN.test(options.matchId) ||
      !/^[0-9a-f-]{36}$/i.test(options.playerId) ||
      !PLAYER_TOKEN_PATTERN.test(options.accessToken) ||
      !SERVER_OPERATOR_IDS.includes(options.operatorId)
    ) {
      throw new ServerMatchError("The ranked match ticket is invalid.", 400);
    }
    const mapId = "cinder-row-blackout" as const;
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const storageKey = sessionStorageKey(mapId);
    const session: StoredSession = {
      matchId: options.matchId,
      playerId: options.playerId,
      accessToken: options.accessToken,
      nextSequence: 1,
      mapId,
    };
    const client = new ServerMatchClient(
      session,
      options.fetcher ?? fetch,
      storage,
      storageKey,
    );
    client.persistSession();
    const snapshot = await client.getSnapshot();
    if (snapshot.mapId !== mapId) {
      throw new ServerMatchError("The ranked ticket belongs to another match.", 409);
    }
    const player = snapshot.players.find((candidate) => candidate.playerId === session.playerId);
    if (!player || player.operatorId !== options.operatorId) {
      throw new ServerMatchError("The ranked player session could not be verified.", 401);
    }
    client.nextSequence = Math.max(1, player.lastProcessedSequence + 1);
    client.session.nextSequence = client.nextSequence;
    client.persistSession();
    const gameplay = await client.getGameplayState();
    return {
      client,
      player,
      gameplay,
      operatorId: player.operatorId,
      restored: false,
      snapshot,
    };
  }

  async getSnapshot(): Promise<MatchSnapshot> {
    const value = await this.authorizedJson(`/api/matches/${this.matchId}/snapshot`);
    return parseSnapshot(value, this.matchId);
  }

  async getGameplayState(): Promise<ServerGameplayState> {
    const value = await this.authorizedJson(`/api/matches/${this.matchId}/world-state`);
    return parseGameplayState(value, this.matchId);
  }

  async getExtractionStatus(): Promise<ServerExtractionStatus> {
    const value = await this.authorizedJson(
      `/api/matches/${this.matchId}/extraction/status`,
    );
    if (
      !isRecord(value) ||
      value.matchId !== this.matchId ||
      typeof value.inRange !== "boolean" ||
      typeof value.progress !== "number" ||
      !Number.isFinite(value.progress) ||
      typeof value.requiredSeconds !== "number" ||
      !Number.isFinite(value.requiredSeconds) ||
      typeof value.ready !== "boolean" ||
      typeof value.settled !== "boolean"
    ) {
      throw new Error("The match server returned invalid extraction status.");
    }
    return {
      matchId: value.matchId,
      inRange: value.inRange,
      progress: Math.max(0, Math.min(1, value.progress)),
      requiredSeconds: value.requiredSeconds,
      ready: value.ready,
      settled: value.settled,
    };
  }

  async settleExtraction(): Promise<ServerExtractionSettlement> {
    const value = await this.authorizedJson(
      `/api/matches/${this.matchId}/extraction/settle`,
      { method: "POST" },
    );
    if (
      !isRecord(value) ||
      value.matchId !== this.matchId ||
      typeof value.alreadySettled !== "boolean" ||
      !Number.isSafeInteger(value.creditsAwarded) ||
      !Array.isArray(value.inventory)
    ) {
      throw new Error("The match server returned an invalid settlement.");
    }
    const profile = parseServerProfile(value.profile);
    const inventory = value.inventory.map(parsePersistedInventoryItem);
    return {
      matchId: value.matchId,
      alreadySettled: value.alreadySettled,
      creditsAwarded: value.creditsAwarded as number,
      inventory,
      profile,
    };
  }

  submitInput(input: MatchInput): void {
    this.latestInput = { ...input, sequenceNumber: this.nextSequence };
    this.nextSequence += 1;
    this.session.nextSequence = this.nextSequence;
    this.persistSession();
    if (this.realtimeEnabled && this.realtimeAuthorized) {
      this.flushRealtimeInput?.();
      return;
    }
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
      if (this.realtimeAuthorized) this.flushRealtimeInput?.();
      else if (this.latestInput) void this.drainInputQueue();
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
      this.storage?.setItem(this.storageKey, JSON.stringify(this.session));
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
  RELOAD_REQUEST: INPUT_RELOAD_REQUEST,
  ACTIVATE_ABILITY: INPUT_ACTIVATE_ABILITY,
} as const;
