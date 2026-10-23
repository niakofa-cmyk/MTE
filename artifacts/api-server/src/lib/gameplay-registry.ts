const MAX_ASSET_BYTES = 1_048_576;
const MAX_LOOT_SPAWNS = 2_048;
const MAX_TERMINALS = 64;
const MAX_OBJECTIVES = 64;
const MAX_TERMINAL_LOOT_ITEMS = 256;
const WORLD_BOUND = 1_000;
const WEAPON_IDS = new Set([
  "smg",
  "rifle",
  "shotgun",
  "lmg",
  "rail",
  "pistol",
  "needles",
  "slug",
]);
const LOOT_KINDS = new Set(["weapon", "ammo", "med", "armor", "mod", "intel"]);
const OBJECTIVE_KINDS = new Set(["rescue", "beacon", "extraction"]);
const RARITIES = new Set(["COMMON", "UNCOMMON", "RARE", "LEGENDARY", "ANOMALY"]);

export interface GameplayLootSpawn {
  id: string;
  kind: "weapon" | "ammo" | "med" | "armor" | "mod" | "intel";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new Error("Gameplay registry record has an invalid schema.");
  }
}

function readString(
  value: unknown,
  field: string,
  pattern: RegExp,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    !pattern.test(value)
  ) {
    throw new Error(`Gameplay registry has an invalid ${field}.`);
  }
  return value;
}

function readNumber(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`Gameplay registry has an invalid ${field}.`);
  }
  return value;
}

function parseLootSpawn(value: unknown, index: number): GameplayLootSpawn {
  if (!isRecord(value)) {
    throw new Error(`Loot spawn ${index} must be an object.`);
  }
  assertExactKeys(
    value,
    ["id", "kind", "label", "x", "z", "scrap"],
    ["weaponId", "modId"],
  );
  const id = readString(value.id, `loot spawn ${index} id`, /^map-loot-\d{4}$/, 32);
  const kind = readString(value.kind, `loot spawn ${id} kind`, /^[a-z]+$/, 16);
  if (!LOOT_KINDS.has(kind)) throw new Error(`Loot spawn ${id} has an unsupported kind.`);
  const lootKind = kind as GameplayLootSpawn["kind"];
  const label = readString(value.label, `loot spawn ${id} label`, /^[^\u0000-\u001f]{1,120}$/, 120);
  const x = readNumber(value.x, `loot spawn ${id} x`, -WORLD_BOUND, WORLD_BOUND);
  const z = readNumber(value.z, `loot spawn ${id} z`, -WORLD_BOUND, WORLD_BOUND);
  const scrap = readNumber(value.scrap, `loot spawn ${id} scrap`, 0, 100_000);

  let weaponId: string | undefined;
  if (value.weaponId !== undefined) {
    weaponId = readString(value.weaponId, `loot spawn ${id} weapon`, /^[a-z]+$/, 24);
    if (!WEAPON_IDS.has(weaponId)) {
      throw new Error(`Loot spawn ${id} references an unknown weapon.`);
    }
  }
  let modId: string | undefined;
  if (value.modId !== undefined) {
    modId = readString(value.modId, `loot spawn ${id} mod`, /^att_[a-z0-9_]{3,40}$/, 48);
  }
  if ((kind === "weapon") !== Boolean(weaponId) || (kind === "mod") !== Boolean(modId)) {
    throw new Error(`Loot spawn ${id} does not match its grant fields.`);
  }

  return {
    id,
    kind: lootKind,
    label,
    x,
    z,
    scrap,
    ...(weaponId ? { weaponId } : {}),
    ...(modId ? { modId } : {}),
  };
}

function parseTerminal(value: unknown, index: number): GameplayTerminal {
  if (!isRecord(value)) throw new Error(`Terminal ${index} must be an object.`);
  assertExactKeys(value, ["id", "x", "z", "interactionRadius", "sectorTier"]);
  const id = readString(value.id, `terminal ${index} id`, /^terminal-\d{2}$/, 32);
  const interactionRadius = readNumber(
    value.interactionRadius,
    `terminal ${id} interaction radius`,
    0.1,
    8,
  );
  if (interactionRadius !== 2.4) {
    throw new Error(`Terminal ${id} has an unsupported interaction radius.`);
  }
  return {
    id,
    x: readNumber(value.x, `terminal ${id} x`, -WORLD_BOUND, WORLD_BOUND),
    z: readNumber(value.z, `terminal ${id} z`, -WORLD_BOUND, WORLD_BOUND),
    interactionRadius,
    sectorTier: readNumber(value.sectorTier, `terminal ${id} sector tier`, 1, 4),
  };
}

function parseObjective(value: unknown, index: number): GameplayObjectiveRecord {
  if (!isRecord(value)) throw new Error(`Objective ${index} must be an object.`);
  assertExactKeys(
    value,
    ["id", "kind", "label", "order", "x", "z", "interactionRadius", "prerequisites"],
    ["target", "holdSeconds", "serverEventRequired", "gate"],
  );
  const id = readString(value.id, `objective ${index} id`, /^[a-z][a-z0-9-]{1,63}$/, 64);
  const kind = readString(value.kind, `objective ${id} kind`, /^[a-z]+$/, 16);
  if (!OBJECTIVE_KINDS.has(kind)) throw new Error(`Objective ${id} has an unsupported kind.`);
  if (!Array.isArray(value.prerequisites) || value.prerequisites.length > MAX_OBJECTIVES) {
    throw new Error(`Objective ${id} has invalid prerequisites.`);
  }
  const prerequisites = value.prerequisites.map((entry) =>
    readString(entry, `objective ${id} prerequisite`, /^[a-z][a-z0-9-]{1,63}$/, 64),
  );
  if (new Set(prerequisites).size !== prerequisites.length || prerequisites.includes(id)) {
    throw new Error(`Objective ${id} has duplicate or recursive prerequisites.`);
  }
  const objective: GameplayObjectiveRecord = {
    id,
    kind: kind as GameplayObjectiveRecord["kind"],
    label: readString(value.label, `objective ${id} label`, /^[^\u0000-\u001f]{1,120}$/, 120),
    order: readNumber(value.order, `objective ${id} order`, 1, MAX_OBJECTIVES),
    x: readNumber(value.x, `objective ${id} x`, -WORLD_BOUND, WORLD_BOUND),
    z: readNumber(value.z, `objective ${id} z`, -WORLD_BOUND, WORLD_BOUND),
    interactionRadius: readNumber(value.interactionRadius, `objective ${id} radius`, 0.1, 20),
    prerequisites,
  };
  if (value.target !== undefined) {
    objective.target = readString(value.target, `objective ${id} target`, /^[^\u0000-\u001f]{1,80}$/, 80);
  }
  if (value.holdSeconds !== undefined) {
    objective.holdSeconds = readNumber(value.holdSeconds, `objective ${id} hold duration`, 0.1, 60);
  }
  if (value.serverEventRequired !== undefined) {
    objective.serverEventRequired = readString(
      value.serverEventRequired,
      `objective ${id} server event`,
      /^[a-z-]{1,48}$/,
      48,
    );
  }
  if (value.gate !== undefined) {
    if (!isRecord(value.gate)) throw new Error(`Objective ${id} has invalid gate bounds.`);
    assertExactKeys(value.gate, ["id", "minX", "maxX", "minZ", "maxZ", "maxHealth"]);
    const gateId = readString(value.gate.id, `objective ${id} gate id`, /^[a-z][a-z0-9-]{1,63}$/, 64);
    const minX = readNumber(value.gate.minX, `objective ${id} gate minX`, -WORLD_BOUND, WORLD_BOUND);
    const maxX = readNumber(value.gate.maxX, `objective ${id} gate maxX`, -WORLD_BOUND, WORLD_BOUND);
    const minZ = readNumber(value.gate.minZ, `objective ${id} gate minZ`, -WORLD_BOUND, WORLD_BOUND);
    const maxZ = readNumber(value.gate.maxZ, `objective ${id} gate maxZ`, -WORLD_BOUND, WORLD_BOUND);
    const maxHealth = readNumber(value.gate.maxHealth, `objective ${id} gate health`, 1, 100_000);
    if (maxX <= minX || maxZ <= minZ || kind !== "rescue") {
      throw new Error(`Objective ${id} has inconsistent gate bounds.`);
    }
    objective.gate = { id: gateId, minX, maxX, minZ, maxZ, maxHealth };
  }
  if (kind === "rescue" && (!objective.gate || !objective.serverEventRequired)) {
    throw new Error(`Rescue objective ${id} must declare its authoritative gate prerequisite.`);
  }
  return objective;
}

function parseTerminalLoot(value: unknown, index: number): TerminalLootDefinition {
  if (!isRecord(value)) throw new Error(`Terminal loot ${index} must be an object.`);
  assertExactKeys(
    value,
    ["id", "itemType", "rarity", "baseWeight", "currencyScrapValue", "kind", "label"],
    ["weaponId", "modId"],
  );
  const id = readString(value.id, `terminal loot ${index} id`, /^[a-z0-9_]{3,64}$/, 64);
  const itemType = readString(value.itemType, `terminal loot ${id} item type`, /^[A-Z_]+$/, 16);
  if (!["WEAPON", "ATTACHMENT", "INTEL_DATA"].includes(itemType)) {
    throw new Error(`Terminal loot ${id} has an unsupported item type.`);
  }
  const rarity = readString(value.rarity, `terminal loot ${id} rarity`, /^[A-Z]+$/, 16);
  if (!RARITIES.has(rarity)) throw new Error(`Terminal loot ${id} has an unsupported rarity.`);
  const kind = readString(value.kind, `terminal loot ${id} kind`, /^[a-z]+$/, 16);
  if (!["weapon", "mod", "intel"].includes(kind)) {
    throw new Error(`Terminal loot ${id} has an unsupported grant kind.`);
  }
  const parsed: TerminalLootDefinition = {
    id,
    itemType: itemType as TerminalLootDefinition["itemType"],
    rarity: rarity as TerminalLootDefinition["rarity"],
    baseWeight: readNumber(value.baseWeight, `terminal loot ${id} weight`, 0.001, 100_000),
    currencyScrapValue: readNumber(value.currencyScrapValue, `terminal loot ${id} scrap`, 0, 100_000),
    kind: kind as TerminalLootDefinition["kind"],
    label: readString(value.label, `terminal loot ${id} label`, /^[^\u0000-\u001f]{1,120}$/, 120),
  };
  if (value.weaponId !== undefined) {
    parsed.weaponId = readString(value.weaponId, `terminal loot ${id} weapon`, /^[a-z]+$/, 24);
    if (!WEAPON_IDS.has(parsed.weaponId)) {
      throw new Error(`Terminal loot ${id} references an unknown weapon.`);
    }
  }
  if (value.modId !== undefined) {
    parsed.modId = readString(value.modId, `terminal loot ${id} mod`, /^att_[a-z0-9_]{3,40}$/, 48);
  }
  const expectedType =
    parsed.kind === "weapon" ? "WEAPON" : parsed.kind === "mod" ? "ATTACHMENT" : "INTEL_DATA";
  if (
    parsed.itemType !== expectedType ||
    (parsed.kind === "weapon") !== Boolean(parsed.weaponId) ||
    (parsed.kind === "mod") !== Boolean(parsed.modId)
  ) {
    throw new Error(`Terminal loot ${id} has inconsistent grant fields.`);
  }
  return parsed;
}

export function loadGameplayRegistryAsset(jsonStream: string): GameplayRegistryAsset {
  if (typeof jsonStream !== "string") {
    throw new Error("Gameplay registry must be a JSON string.");
  }
  if (Buffer.byteLength(jsonStream, "utf8") > MAX_ASSET_BYTES) {
    throw new Error("Gameplay registry exceeds the 1 MiB size limit.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStream);
  } catch {
    throw new Error("Gameplay registry contains malformed JSON.");
  }
  if (!isRecord(parsed)) throw new Error("Gameplay registry must be an object.");
  assertExactKeys(parsed, ["schemaVersion", "lootSpawns", "terminals", "objectives", "terminalLootTable"]);
  if (parsed.schemaVersion !== 1) {
    throw new Error("Gameplay registry has an unsupported schema version.");
  }
  if (
    !Array.isArray(parsed.lootSpawns) ||
    parsed.lootSpawns.length > MAX_LOOT_SPAWNS ||
    !Array.isArray(parsed.terminals) ||
    parsed.terminals.length > MAX_TERMINALS ||
    !Array.isArray(parsed.objectives) ||
    parsed.objectives.length > MAX_OBJECTIVES ||
    !Array.isArray(parsed.terminalLootTable) ||
    parsed.terminalLootTable.length > MAX_TERMINAL_LOOT_ITEMS
  ) {
    throw new Error("Gameplay registry contains an invalid record count.");
  }

  const lootSpawns = parsed.lootSpawns.map(parseLootSpawn);
  const terminals = parsed.terminals.map(parseTerminal);
  const objectives = parsed.objectives.map(parseObjective);
  const terminalLootTable = parsed.terminalLootTable.map(parseTerminalLoot);
  for (const [name, rows] of [
    ["loot", lootSpawns],
    ["terminal", terminals],
    ["objective", objectives],
    ["terminal loot", terminalLootTable],
  ] as const) {
    const ids = rows.map((row) => row.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Gameplay registry contains duplicate ${name} IDs.`);
    }
  }
  const objectiveIds = new Set(objectives.map((objective) => objective.id));
  for (const objective of objectives) {
    if (objective.prerequisites.some((id) => !objectiveIds.has(id))) {
      throw new Error(`Objective ${objective.id} refers to an unknown prerequisite.`);
    }
  }

  return { schemaVersion: 1, lootSpawns, terminals, objectives, terminalLootTable };
}
