import * as THREE from "three";
import { AudioBus } from "@/game/audio";
import {
  OPERATORS,
  OPERATOR_BY_ID,
  WEAPONS,
  type OpId,
  type WeaponId,
} from "@/game/content";
import { CRITICAL_MASS, dischargeReady, inBlastCone, paceMission, seededDebris, type MissionPhase } from "@/game/prison-break";
import { ATTACHMENT_BY_ID, compileWeapon, rollLoot, sectorLabel, sectorTier, weaponClass } from "@/game/loot";
import { generateContainerDropArray, resolveExtractionDrop } from "@/game/extraction-loot";
import { getExtractionHudState } from "@/game/extraction-hud";
import { loadMars, modsForDrop, registryForLabel, registryForWeaponId, solarCoilEmits, weaponIdForRegistry, COIL_EMISSION, type ExtractedPiece } from "@/game/mars-stash";
import { applyAimAssist, AIM_ASSIST } from "@/game/aim-assist";
import { canPerceiveTarget, stepEnemyMind, type Mind } from "@/game/enemy-ai";
import {
  compassHeadingDegrees,
  findNavigationPath,
  relativeTargetDirection,
  type NavigationPoint,
} from "@/game/navigation";
import {
  CombatFeedback,
  damageDirection,
  DAMAGE_DIRECTIONS,
} from "@/game/combat-feedback";
import { WeaponCycle } from "@/game/weapon-cycle";
import {
  dualWieldSpreadMultiplier,
  handMuzzleOffset,
  planDualReload,
  type WeaponHand,
  weaponHandForMouseButton,
} from "@/game/dual-wield";
import { readGamepadInput, type GamepadInput } from "@/game/gamepad-input";
import {
  chooseFlankPosition,
  coordinatedCombatRole,
  findCoverPlans,
  searchWaypoint,
  selectSquadSignal,
  stepCoverExposure,
  type CoverPlan,
  type SquadSignal,
} from "@/game/enemy-tactics";
import { acceptDropTicket, readAttachment, sealedModIds } from "@/game/weapon-mod";
import { MOD_CODE, deserializeGearPacket, modCodes, packHeldGear } from "@/game/gear-packet";
import { normalizeLookSensitivity } from "@/game/settings";
import { resolveHitDamage } from "@/game/combat-damage";
import { advanceSafeZoneCenter, shouldCollapseSafeZone } from "@/game/safe-zone";
import {
  boostSlideVelocity,
  maxMovementSpeed,
  stepHorizontalVelocity,
  stepVerticalVelocity,
} from "@/game/player-kinematics";
import {
  RADIUS,
  buildWorld,
  createCity,
  floorHeight,
  hasLos,
  movementBlocked,
  xzHit,
  type Box,
  type LootSpec,
  type Site,
  type WorldData,
} from "@/game/world";
import { applyCoverDamage, separateAabbOverlap } from "@/game/world-physics";
import { createCityAsh } from "@/game/city-ash";
import { NodPostProcessing } from "@/game/cinematic-postprocessing";
import {
  SERVER_INPUT_FLAGS,
  type MatchInput,
  type ServerGameplayState,
  type ServerInventoryItem,
  type ServerPlayerSnapshot,
} from "@/game/server-match-client";

export type MissionEvent =
  | { type: "mode"; mode: "play" | "menu" }
  | { type: "pause"; paused: boolean }
  | { type: "lock"; locked: boolean }
  | { type: "dead" }
  | { type: "win"; time: number; kills: number; op: OpId; scrap: number; manifest: ExtractedPiece[] }
  | { type: "error"; message: string };

type Team = "sec" | "accord" | "militia";

type Actor = {
  alive: boolean;
  squad: boolean;
  deployed: boolean;
  kind: "guard" | "squad" | "militia" | "decoy";
  team: Team;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  aggro: number;
  slow: number;
  hurt: number;
  down: number;
  corpse: number;
  blind: number;
  lift: number;
  mind: Mind;
  mindStateAge: number;
  knownX: number;
  knownZ: number;
  navigation: {
    goalX: number;
    goalZ: number;
    points: NavigationPoint[] | null;
    index: number;
    retryIn: number;
  } | null;
  tactics: {
    role: "anchor" | "flanker";
    cover: CoverPlan | null;
    coverPhase: "hide" | "peek";
    coverHold: number;
    flank: NavigationPoint | null;
    flankSide: -1 | 1;
    threatX: number;
    threatZ: number;
  } | null;
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  visorMat: THREE.MeshStandardMaterial;
  opId?: OpId;
};

type Loot = LootSpec & {
  mesh: THREE.Group;
  alive: boolean;
  extra: boolean;
  spin: number;
  serverId?: string;
};

type ServerGameplayHandlers = {
  claimLoot: (lootId: string) => Promise<{
    item: ServerInventoryItem;
    inventory: ServerInventoryItem[];
  }>;
  openTerminal: (terminalId: string) => Promise<ServerGameplayState>;
  inventoryChanged: (inventory: ServerInventoryItem[]) => void;
};

type Floater = { x: number; y: number; z: number; text: string; life: number; color: string };
type Feed = { text: string; t: number };
type Line = { speaker: string; text: string; t: number };

const POOL = 22;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rayBox(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  box: Box,
  maxT: number,
) {
  if (!box.alive) return null;
  const min = [box.minX, 0, box.minZ];
  const max = [box.maxX, box.h, box.maxZ];
  const o = [ox, oy, oz];
  const d = [dx, dy, dz];
  let tmin = 0;
  let tmax = maxT;
  for (let i = 0; i < 3; i++) {
    const di = d[i]!;
    const oi = o[i]!;
    if (Math.abs(di) < 1e-8) {
      if (oi < min[i]! || oi > max[i]!) return null;
    } else {
      let t1 = (min[i]! - oi) / di;
      let t2 = (max[i]! - oi) / di;
      if (t1 > t2) {
        const s = t1;
        t1 = t2;
        t2 = s;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  if (tmin > 0.04 && tmin <= maxT) return tmin;
  return null;
}

function raySphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  maxT: number,
) {
  const lx = ox - cx;
  const ly = oy - cy;
  const lz = oz - cz;
  const b = lx * dx + ly * dy + lz * dz;
  const c = lx * lx + ly * ly + lz * lz - r * r;
  const h = b * b - c;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  if (t > 0.04 && t <= maxT) return t;
  return null;
}

function rayCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  r: number,
  y0: number,
  y1: number,
  maxT: number,
) {
  const lx = ox - cx;
  const lz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-8) return null;
  const b = 2 * (lx * dx + lz * dz);
  const c = lx * lx + lz * lz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  let t = (-b - s) / (2 * a);
  if (t < 0.04) t = (-b + s) / (2 * a);
  if (t < 0.04 || t > maxT) return null;
  const y = oy + dy * t;
  if (y < y0 || y > y1) return null;
  return { t, y };
}

function makeFigure(bodyHex: number, visorHex: number) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyHex,
    roughness: 0.48,
    metalness: 0.42,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: visorHex,
    emissive: visorHex,
    emissiveIntensity: 2,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.3), bodyMat);
  body.position.y = 0.92;
  body.castShadow = true;
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.38, 0.28), bodyMat);
  hips.position.y = 0.34;
  hips.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), bodyMat);
  head.position.y = 1.52;
  head.castShadow = true;
  const vis = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.06), visorMat);
  vis.position.set(0, 1.54, 0.15);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), bodyMat);
  gun.position.set(0.22, 1.05, 0.28);
  group.add(body, hips, head, vis, gun);
  return { group, bodyMat, visorMat };
}

function gunMesh(id: WeaponId) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7c0c8, metalness: 0.55, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.4, roughness: 0.45 });
  const accentHex = id === "rail" || id === "lmg" || id === "slug" ? 0xd4a24a : 0x2ee0c8;
  const accent = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.35,
  });
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  if (id === "pistol") {
    add(0.05, 0.08, 0.2, 0, 0, -0.08, metal);
    add(0.04, 0.1, 0.05, 0, -0.07, 0.04, dark);
  } else if (id === "smg" || id === "needles") {
    const slim = id === "needles";
    add(slim ? 0.04 : 0.055, slim ? 0.055 : 0.07, slim ? 0.24 : 0.28, slim ? -0.026 : -0.035, 0, -0.12, metal);
    add(slim ? 0.04 : 0.055, slim ? 0.055 : 0.07, slim ? 0.24 : 0.28, slim ? 0.026 : 0.035, 0, -0.12, metal);
    add(0.018, 0.02, 0.16, 0, 0.045, -0.16, accent);
    add(0.08, 0.1, 0.1, 0, -0.02, 0.02, dark);
    add(0.07, 0.12, 0.05, 0, -0.1, 0.02, dark);
  } else if (id === "shotgun" || id === "slug") {
    add(0.07, 0.08, 0.42, 0, 0.01, -0.16, metal);
    add(0.05, 0.05, 0.36, 0, 0.06, -0.14, dark);
    add(0.06, 0.1, 0.08, 0, -0.06, 0.02, dark);
  } else if (id === "lmg") {
    add(0.07, 0.09, 0.55, 0, 0, -0.2, metal);
    add(0.1, 0.16, 0.1, 0.02, -0.1, -0.02, dark);
    add(0.08, 0.08, 0.12, 0, 0.02, 0.06, dark);
    add(0.02, 0.04, 0.16, 0, 0.08, -0.22, accent);
  } else if (id === "rail") {
    add(0.045, 0.05, 0.72, 0, 0.02, -0.28, metal);
    add(0.02, 0.02, 0.6, 0, 0.05, -0.26, accent);
    add(0.06, 0.08, 0.12, 0, -0.02, 0.02, dark);
    add(0.05, 0.07, 0.08, 0, 0.06, -0.02, dark);
  } else {
    add(0.055, 0.07, 0.48, 0, 0.015, -0.18, metal);
    add(0.07, 0.09, 0.16, 0, -0.01, 0.02, dark);
    add(0.05, 0.12, 0.05, 0, -0.08, 0.04, dark);
    add(0.03, 0.03, 0.1, 0, 0.07, -0.12, accent);
  }
  const muzzle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xfff1cc }),
  );
  const tip = id === "rail" ? -0.66 : id === "pistol" ? -0.2 : id === "smg" || id === "needles" ? -0.28 : id === "shotgun" || id === "slug" ? -0.4 : id === "lmg" ? -0.5 : -0.44;
  muzzle.position.set(0, 0.02, tip);
  muzzle.visible = false;
  g.add(muzzle);
  const piece = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, intensity = 1.4) => {
    const cr = ((color >> 16) & 255) / 255;
    const cg = ((color >> 8) & 255) / 255;
    const cb = (color & 255) / 255;
    const solar = solarCoilEmits(cr, cg, cb);
    const matte = color === 0x1a1a1a;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: solar ? COIL_EMISSION : intensity,
        roughness: solar ? 0.34 : matte ? 0.92 : 0.32,
        metalness: solar ? 0.22 : matte ? 0.05 : 0.7,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.visible = false;
    mesh.userData.baseEmit = solar ? COIL_EMISSION : intensity;
    mesh.userData.baseColor = color;
    mesh.userData.solar = solar;
    g.add(mesh);
    return mesh;
  };
  g.userData.muzzle = muzzle;
  g.userData.kit = {
    shroud: piece(0.11, 0.11, 0.16, 0, 0.02, tip - 0.06, 0x1a1a1a, 0.04),
    collar: piece(0.08, 0.08, 0.06, 0, 0.02, tip + 0.1, 0xb7c0c8, 0.2),
    optic: piece(0.055, 0.04, 0.06, 0, 0.12, -0.1, 0x33ccff, 2.2),
    scope: piece(0.045, 0.045, 0.22, 0, 0.1, -0.12, 0xd4a24a, 0.8),
    drum: piece(0.11, 0.12, 0.1, 0, -0.12, 0.02, 0x2a3038, 0.15),
    coil: piece(0.045, 0.04, 0.16, 0, 0.06, -0.18, 0xe6801a, 2.6),
    vent: piece(0.07, 0.02, 0.08, 0, 0.06, 0.02, 0x2ee0c8, 1.6),
  };
  return g;
}

function paintGunKit(group: THREE.Group, modIds: number[]) {
  const kit = group.userData.kit as
    | {
        shroud: THREE.Mesh;
        collar: THREE.Mesh;
        optic: THREE.Mesh;
        scope: THREE.Mesh;
        drum: THREE.Mesh;
        coil: THREE.Mesh;
        vent: THREE.Mesh;
      }
    | undefined;
  if (!kit) return;
  const has = (code: number) => modIds.includes(code);
  kit.shroud.visible = has(MOD_CODE.att_shroud_barrel_01);
  kit.collar.visible = has(MOD_CODE.att_heavy_stabilizer_02);
  kit.optic.visible = has(MOD_CODE.att_holo_tactical_05);
  kit.scope.visible = has(MOD_CODE.att_chrono_tracer_scope_06);
  kit.drum.visible = has(MOD_CODE.att_extended_drum_07);
  kit.coil.visible = has(MOD_CODE.att_overcharged_capacitor_03);
  kit.vent.visible = has(MOD_CODE.att_lightweight_burst_04);
  const muzzle = group.userData.muzzle as THREE.Mesh | undefined;
  const mat = muzzle?.material as THREE.MeshBasicMaterial | undefined;
  if (!muzzle || !mat) return;
  if (has(MOD_CODE.att_shroud_barrel_01)) {
    mat.color.setHex(0x1a1a1a);
    muzzle.scale.set(0.35, 0.35, 0.45);
  } else if (has(MOD_CODE.att_overcharged_capacitor_03)) {
    mat.color.setHex(0xe6801a);
    muzzle.scale.set(1.7, 1.7, 2.4);
  } else {
    mat.color.setHex(0xfff1cc);
    muzzle.scale.set(1, 1, 1);
  }
}

export class MissionEngine {
  private host: HTMLElement;
  private hooks: { onEvent: (e: MissionEvent) => void };
  private postProcessing: NodPostProcessing;
  private cityAsh: THREE.Points;
  private serverGameplayHandlers: ServerGameplayHandlers | null = null;
  private serverGameplayActive = false;
  private serverAbilityPulse = false;
  private serverReloadPulse = false;
  private serverPlayerAvatars = new Map<
    string,
    {
      group: THREE.Group;
      rightWeapon: THREE.Mesh;
      leftWeapon: THREE.Mesh;
      abilityRing: THREE.Mesh;
    }
  >();
  private pendingServerInteractions = new Set<string>();
  private serverGameplayGeneration = 0;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(78, 1, 0.08, 480);
  private viewScene = new THREE.Scene();
  private viewCam = new THREE.PerspectiveCamera(78, 1, 0.05, 8);
  private viewRig = new THREE.Group();
  private handGuns: Record<WeaponHand, Map<WeaponId, THREE.Group>> = {
    right: new Map(),
    left: new Map(),
  };
  private world: WorldData;
  private solids: Box[];
  private audio = new AudioBus();
  private pool: Actor[] = [];
  private loots: Loot[] = [];
  private terminals: { id: string; x: number; z: number; mesh: THREE.Group; open: boolean }[] = [];
  private vips: {
    mesh: THREE.Group;
    x: number;
    y: number;
    z: number;
    active: boolean;
    site: Site;
    id: "ananda" | "nefret";
    cd: number;
    worn: boolean;
  }[] = [];
  private raf = 0;
  private last = -1;
  private time = 0;
  private keys = new Set<string>();
  private keyOverride: Set<string> | null = null;
  private prev: Record<string, boolean> = {};
  private vPrev = { jump: false, ability: false, ult: false, reload: false, slide: false };
  private gamepad: GamepadInput = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    fireRight: false,
    fireLeft: false,
    focus: false,
  };
  virtual = {
    ax: 0,
    ay: 0,
    lookX: 0,
    lookY: 0,
    fire: false,
    fireLeft: false,
    aim: false,
    jump: false,
    sprint: false,
    crouch: false,
    reload: false,
    ability: false,
    ult: false,
    interact: false,
    slide: false,
    blood: false,
    mass: false,
    swap: false,
    lookHeld: false,
  };
  aimAssist = { ...AIM_ASSIST };
  private mode: "attract" | "drop" | "ground" | "dead" | "win" = "attract";
  private paused = false;
  private locked = false;
  private touch = false;
  private reduce = false;
  private op: OpId = "jaya";
  private x = 0;
  private y = 0;
  private z = 0;
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private yaw = 0;
  private pitch = -0.2;
  private eye = 1.62;
  private grounded = false;
  private airTime = 0;
  private crouchHeld = false;
  private aiming = false;
  private slideT = 0;
  private wallRun = 0;
  private touchingWall = false;
  private mouseFocus = false;
  private focusToggle = false;
  private fireHeld = false;
  private fireLeftHeld = false;
  private slots: { id: WeaponId; mag: number; reserve: number; mods: string[] }[] = [];
  private slot = 0;
  private weaponCycles: Record<WeaponHand, WeaponCycle> = {
    right: new WeaponCycle(),
    left: new WeaponCycle(),
  };
  private reloadTapAt = -Infinity;
  private reloadSequence: "left" | null = null;
  private handRecoil: Record<WeaponHand, number> = { right: 0, left: 0 };
  private hp = 100;
  private armor = 0;
  private invuln = 0;
  private healT = 0;
  private phaseT = 0;
  private unravelT = 0;
  private unravelR = 2;
  private unravelX = 0;
  private unravelZ = 0;
  private raT = 0;
  private raAcc = 0;
  private solar = 0;
  private orbitalStrike = false;
  private hostOp: OpId = "jaya";
  private worn: OpId | null = null;
  private accordSlots: { id: WeaponId; mag: number; reserve: number; mods: string[] }[] = [];
  private accordSlot = 0;
  private bloodPrev = false;
  private massPrev = false;
  private pendingImpact = 0;
  private shieldT = 0;
  private anchorT = 0;
  private anchor: { x: number; y: number; z: number } | null = null;
  private portalA: { x: number; z: number } | null = null;
  private portalB: { x: number; z: number } | null = null;
  private portalT = 0;
  private portalLock = 0;
  private voidT = 0;
  private voidX = 0;
  private voidZ = 0;
  private qCd = 0;
  private ultCd = 0;
  private shotEcho = 0;
  private shake = 0;
  private kick = 0;
  private hurtFlash = 0;
  private solarFlash = 0;
  private combatFeedback = new CombatFeedback();
  private bobPhase = 0;
  private mouseDX = 0;
  private mouseDY = 0;
  private swayX = 0;
  private swayY = 0;
  private landed = false;
  private landTime = 0;
  private missionClock = 0;
  private kills = 0;
  private haul = 0;
  private recovered: ExtractedPiece[] = [];
  private zoneX = 0;
  private zoneZ = 0;
  private zoneR = 180;
  private outside = -1;
  private zoneTick = 0;
  private channel = 0;
  private extractT = 0;
  private beaconDone = false;
  private beaconWave = false;
  private lines: Line[] = [];
  private line: Line | null = null;
  private prompt = "";
  private toastMsg = "";
  private toastT = 0;
  private feed: Feed[] = [];
  private floaters: Floater[] = [];
  private pressure = 0;
  private sinceAid = 30;
  private sincePush = 0;
  private directorAcc = 0;
  private freedCount = 0;
  private stress = 0.1;
  private phase: MissionPhase = "INFILTRATION";
  private panic = false;
  private dropAge = 0;
  private stepAcc = 0;
  private flash = 0;
  private nextBolt = 6;
  private sens = 0.00215;
  private viewW = 1;
  private viewH = 1;
  private hud: HTMLElement | null = null;
  private mapCtx: CanvasRenderingContext2D | null = null;
  private zoneLine: THREE.LineLoop;
  private beam: THREE.Mesh;
  private orbitalBeam: THREE.Mesh;
  private orbitalHalo: THREE.Mesh;
  private orbitalLight: THREE.PointLight;
  private orbitalVfx = 0;
  private ship: THREE.Group;
  private shieldMesh: THREE.Mesh;
  private portalMeshA: THREE.Mesh;
  private portalMeshB: THREE.Mesh;
  private voidMesh: THREE.Mesh;
  private unravelMesh: THREE.Mesh;
  private anchorMesh: THREE.Mesh;
  private footGeo: THREE.BufferGeometry;
  private footPts: THREE.Points;
  private footprints: { x: number; y: number; z: number; age: number }[] = [];
  private footAcc = 0;
  private rainGeo: THREE.BufferGeometry;
  private rain: { x: number; y: number; z: number }[] = [];
  private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial;
  private tracers: { line: THREE.Line; life: number }[] = [];
  private sparks: { mesh: THREE.Mesh; life: number; vx: number; vy: number; vz: number }[] = [];
  private rubble: { mesh: THREE.Mesh; life: number; vx: number; vy: number; vz: number }[] = [];
  private euler = new THREE.Euler(0, 0, 0, "YXZ");
  private aim = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private camRight = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private look = new THREE.Vector3();
  private disposed = false;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouse: (e: MouseEvent) => void;
  private onDown: (e: MouseEvent) => void;
  private onUp: (e: MouseEvent) => void;
  private onLock: () => void;
  private onBlur: () => void;
  private onContext: (e: Event) => void;
  private onResize: () => void;
  private ro: ResizeObserver;

  constructor(host: HTMLElement, hooks: { onEvent: (e: MissionEvent) => void }) {
    this.host = host;
    this.hooks = hooks;
    this.touch = window.matchMedia("(pointer: coarse)").matches;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.world = buildWorld();
    this.solids = [...this.world.buildings, ...this.world.covers];

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.2 : 1.5));
    this.renderer.setSize(host.clientWidth || 1, host.clientHeight || 1, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.autoClear = false;
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";
    host.appendChild(this.renderer.domElement);
    this.postProcessing = new NodPostProcessing(
      this.renderer,
      this.scene,
      this.camera,
      this.viewScene,
      this.viewCam,
      this.touch,
    );

    this.scene.fog = new THREE.FogExp2(0x26323a, 0.0052);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color("#101820") },
        hor: { value: new THREE.Color("#6a5344") },
        bot: { value: new THREE.Color("#1c1814") },
        flash: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top, hor, bot; uniform float flash, uTime;
        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float valueNoise(vec2 p) {
          vec2 cell = floor(p);
          vec2 local = fract(p);
          local = local * local * (3.0 - 2.0 * local);
          float a = hash21(cell);
          float b = hash21(cell + vec2(1.0, 0.0));
          float c = hash21(cell + vec2(0.0, 1.0));
          float d = hash21(cell + vec2(1.0, 1.0));
          return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
        }
        void main(){
          float h = normalize(vP).y;
          vec3 col = mix(hor, top, smoothstep(0.02, 0.55, h));
          col = mix(bot, col, smoothstep(-0.25, 0.08, h));
          float cloud = valueNoise(vP.xz * 0.018 + vec2(uTime * 0.008, -uTime * 0.005));
          float streak = 0.5 + 0.5 * sin(vP.x * 0.014 + vP.z * 0.026 + uTime * 0.04);
          float horizon = 1.0 - smoothstep(0.025, 0.42, abs(h + 0.01));
          float haze = mix(cloud, streak, 0.28) * horizon * 0.19;
          col = mix(col, vec3(0.16, 0.28, 0.31), haze);
          col = mix(col, vec3(0.85, 0.9, 1.0), flash);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 20, 12), this.skyMat);
    this.scene.add(sky);

    this.scene.add(new THREE.HemisphereLight(0xc5d4e4, 0x3a2a22, 0.95));
    this.sun = new THREE.DirectionalLight(0xfff0dc, 1.65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    createCity(this.scene, this.world);
    this.cityAsh = createCityAsh(this.touch ? 64 : 128);
    this.scene.add(this.cityAsh);
    const lamps: Array<[number, number, number, number]> = [
      [80, 6, -62, 0xe24b4b],
      [-80, 6, 62, 0xd4a24a],
      [0, 5, 0, 0x2ee0c8],
      [0, 4, -138, 0xd4a24a],
      [40, 5, -40, 0x88a0b8],
      [-40, 5, 40, 0x88a0b8],
    ];
    for (const [x, y, z, color] of lamps) {
      const light = new THREE.PointLight(color, 10, 22, 2);
      light.position.set(x, y, z);
      this.scene.add(light);
    }

    this.zoneLine = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xd4a24a }),
    );
    const ring = new Float32Array(97 * 3);
    this.zoneLine.geometry.setAttribute("position", new THREE.BufferAttribute(ring, 3));
    (this.zoneLine.material as THREE.LineBasicMaterial).fog = false;
    this.zoneLine.frustumCulled = false;
    this.scene.add(this.zoneLine);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 36, 8),
      new THREE.MeshBasicMaterial({ color: 0x2ee0c8, transparent: true, opacity: 0.35, fog: false }),
    );
    this.scene.add(this.beam);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff1c9,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff9f1c,
      transparent: true,
      opacity: 0.28,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.orbitalBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.7, 1, 12, 1, true), coreMat);
    this.orbitalHalo = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 1, 16, 1, true), haloMat);
    this.orbitalBeam.visible = false;
    this.orbitalHalo.visible = false;
    this.orbitalBeam.frustumCulled = false;
    this.orbitalHalo.frustumCulled = false;
    this.orbitalLight = new THREE.PointLight(0xffa61a, 0, 48, 2);
    this.orbitalLight.visible = false;
    this.scene.add(this.orbitalBeam, this.orbitalHalo, this.orbitalLight);

    this.ship = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.6, roughness: 0.4 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 9), hullMat);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 2.2), hullMat);
    wing.position.z = 1.2;
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.12, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2ee0c8, emissive: 0x2ee0c8, emissiveIntensity: 2 }),
    );
    lamp.position.set(0, -0.4, -4.2);
    this.ship.add(hull, wing, lamp);
    this.scene.add(this.ship);

    const ringMat = (color: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false });
    this.portalMeshA = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 8, 24), ringMat(0x2ee0c8));
    this.portalMeshB = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 8, 24), ringMat(0xd4a24a));
    this.portalMeshA.visible = false;
    this.portalMeshB.visible = false;
    this.scene.add(this.portalMeshA, this.portalMeshB);
    this.voidMesh = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.08, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x2ee0c8, transparent: true, opacity: 0.7, fog: false }),
    );
    this.voidMesh.rotation.x = Math.PI / 2;
    this.voidMesh.visible = false;
    this.scene.add(this.voidMesh);
    this.unravelMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x7ef6ea, transparent: true, opacity: 0.14, wireframe: true, fog: false }),
    );
    this.unravelMesh.visible = false;
    this.scene.add(this.unravelMesh);
    this.anchorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: 0x2ee0c8, fog: false }),
    );
    this.anchorMesh.visible = false;
    this.scene.add(this.anchorMesh);
    this.shieldMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 28),
      new THREE.MeshBasicMaterial({
        color: 0xd4a24a,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);

    this.footGeo = new THREE.BufferGeometry();
    this.footGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(180 * 3), 3));
    this.footGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(180 * 3), 3));
    this.footPts = new THREE.Points(
      this.footGeo,
      new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.footPts.frustumCulled = false;
    this.scene.add(this.footPts);

    this.rain = Array.from({ length: 420 }, () => ({
      x: (Math.random() - 0.5) * 46,
      y: Math.random() * 26,
      z: (Math.random() - 0.5) * 46,
    }));
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.rain.length * 2 * 3), 3));
    const rainLines = new THREE.LineSegments(
      this.rainGeo,
      new THREE.LineBasicMaterial({ color: 0x9aa8b4, transparent: true, opacity: 0.28 }),
    );
    rainLines.frustumCulled = false;
    this.scene.add(rainLines);

    for (let i = 0; i < 16; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe2b0 }));
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.tracers.push({ line, life: 0 });
    }
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparks.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
    }
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.6, metalness: 0.2 });
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), chipMat);
      mesh.visible = false;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.rubble.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
    }

    for (let i = 0; i < POOL; i++) {
      const fig = makeFigure(0x2a2428, 0xe24b4b);
      fig.group.visible = false;
      this.scene.add(fig.group);
      this.pool.push({
        alive: false,
        squad: false,
        deployed: false,
        kind: "guard",
        team: "sec",
        name: "NS-SEC",
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        hp: 100,
        maxHp: 100,
        cooldown: 0,
        aggro: 0,
        slow: 0,
        hurt: 0,
        down: 0,
        corpse: 0,
        blind: 0,
        lift: 0,
        mind: "patrol",
        mindStateAge: 0,
        knownX: 0,
        knownZ: 0,
        navigation: null,
        tactics: null,
        group: fig.group,
        bodyMat: fig.bodyMat,
        visorMat: fig.visorMat,
      });
    }

    for (const site of this.world.sites) {
      const id = site.id === "alpha" ? "ananda" : "nefret";
      const mesh = this.makeDescendant(id);
      mesh.position.set(site.x, 0, site.z);
      this.scene.add(mesh);
      this.vips.push({ mesh, x: site.x, y: 0, z: site.z, active: false, site, id, cd: 2, worn: false });
    }

    for (const spec of this.world.loots) this.makeLoot(spec, false);
    for (const [index, spec] of this.world.terminals.entries()) {
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 1.15, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x1b2129, roughness: 0.55, metalness: 0.4 }),
      );
      body.position.y = 0.58;
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.28, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xd4a24a, emissive: 0xd4a24a, emissiveIntensity: 1.6, roughness: 0.3 }),
      );
      screen.position.set(0, 0.82, 0.22);
      mesh.add(body, screen);
      mesh.position.set(spec.x, 0, spec.z);
      this.scene.add(mesh);
      this.terminals.push({
        id: `terminal-${String(index + 1).padStart(2, "0")}`,
        x: spec.x,
        z: spec.z,
        mesh,
        open: false,
      });
    }

    this.viewScene.add(this.viewRig);
    this.viewScene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const viewSun = new THREE.DirectionalLight(0xffffff, 1.8);
    viewSun.position.set(1, 2, 1);
    this.viewScene.add(viewSun);
    (Object.keys(WEAPONS) as WeaponId[]).forEach((id) => {
      const right = gunMesh(id);
      right.position.x = 0.22;
      right.visible = false;
      this.viewRig.add(right);
      this.handGuns.right.set(id, right);

      const left = gunMesh(id);
      left.position.x = -0.22;
      left.scale.x = -1;
      left.visible = false;
      this.viewRig.add(left);
      this.handGuns.left.set(id, left);
    });

    this.onKeyDown = (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        this.togglePause();
        return;
      }
      this.keys.add(e.code);
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouse = (e) => {
      if (!this.locked || this.paused) return;
      if (this.mode !== "drop" && this.mode !== "ground") return;
      const sens = this.sens * (this.aiming ? 0.78 : 1);
      this.yaw -= e.movementX * sens;
      this.pitch = clamp(this.pitch - e.movementY * sens, -1.35, 1.35);
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    };
    this.onDown = (e) => {
      if (!this.locked || this.paused) return;
      const hand = weaponHandForMouseButton(e.button);
      if (hand === "right") this.fireHeld = true;
      if (hand === "left") this.fireLeftHeld = true;
      if (e.button === 1) this.mouseFocus = true;
    };
    this.onUp = (e) => {
      const hand = weaponHandForMouseButton(e.button);
      if (hand === "right") this.fireHeld = false;
      if (hand === "left") this.fireLeftHeld = false;
      if (e.button === 1) this.mouseFocus = false;
    };
    this.onLock = () => {
      this.locked = document.pointerLockElement === this.renderer.domElement;
      if (!this.locked) {
        this.fireHeld = false;
        this.fireLeftHeld = false;
        this.mouseFocus = false;
      }
      this.hooks.onEvent({ type: "lock", locked: this.locked });
    };
    this.onBlur = () => {
      this.keys.clear();
      this.fireHeld = false;
      this.fireLeftHeld = false;
      this.mouseFocus = false;
    };
    this.onContext = (e) => e.preventDefault();
    this.onResize = () => this.resize();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouse);
    window.addEventListener("mousedown", this.onDown);
    window.addEventListener("mouseup", this.onUp);
    document.addEventListener("pointerlockchange", this.onLock);
    window.addEventListener("blur", this.onBlur);
    this.renderer.domElement.addEventListener("contextmenu", this.onContext);
    window.addEventListener("resize", this.onResize);
    this.renderer.domElement.addEventListener("click", () => {
      if ((this.mode === "drop" || this.mode === "ground") && !this.paused) this.capture();
    });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    window.__controlsTest = {
      getYaw: () => this.yaw,
      getSpeed: () => Math.hypot(this.vx, this.vz),
      getPos: () => ({ x: this.x, y: this.y, z: this.z }),
      setKeys: (codes: string[]) => {
        this.keyOverride = codes.length ? new Set(codes) : null;
      },
      getMode: () => this.mode,
      getEnemyMindStates: () =>
        this.pool
          .filter((actor) => actor.alive && actor.team === "sec" && !actor.squad)
          .map((actor) => ({
            state: actor.mind,
            age: actor.mindStateAge,
            x: actor.x,
            z: actor.z,
            lastKnownX: actor.knownX,
            lastKnownZ: actor.knownZ,
            waypoint: actor.navigation?.points?.[actor.navigation.index] ?? null,
            role: actor.tactics?.role ?? null,
            coverPhase: actor.tactics?.cover ? actor.tactics.coverPhase : null,
            searchAge: actor.mind === "search" ? actor.mindStateAge : null,
            flank: actor.tactics?.flank ?? null,
          })),
    };

    this.raf = requestAnimationFrame(this.loop);
  }

  bind(root: HTMLElement) {
    this.hud = root.querySelector("#mte-hud");
    const map = root.querySelector("#mte-map") as HTMLCanvasElement | null;
    if (map) this.mapCtx = map.getContext("2d");
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouse);
    window.removeEventListener("mousedown", this.onDown);
    window.removeEventListener("mouseup", this.onUp);
    document.removeEventListener("pointerlockchange", this.onLock);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("resize", this.onResize);
    if (window.__controlsTest) window.__controlsTest = undefined;
    this.postProcessing.dispose();
    this.cityAsh.geometry.dispose();
    (this.cityAsh.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio.ctx?.close();
  }

  capture() {
    const canvas = this.renderer.domElement;
    if (this.touch) return;
    try {
      void Promise.resolve(canvas.requestPointerLock()).catch(() => {
        // Pointer lock is optional; some browsers and automation contexts reject it.
      });
    } catch {
      // Keep keyboard controls available when pointer lock is unavailable.
    }
  }

  toggleMute() {
    this.audio.ensure();
    return this.audio.toggleMute();
  }

  togglePause() {
    if (this.mode === "attract" || this.mode === "dead" || this.mode === "win") return;
    this.paused = !this.paused;
    if (this.paused) {
      this.fireHeld = false;
      this.fireLeftHeld = false;
      this.mouseFocus = false;
      if (document.pointerLockElement) document.exitPointerLock();
    }
    this.hooks.onEvent({ type: "pause", paused: this.paused });
  }

  resume() {
    this.paused = false;
    for (const key of Object.keys(this.prev)) this.prev[key] = this.held(key);
    this.hooks.onEvent({ type: "pause", paused: false });
    this.capture();
  }

  abort() {
    this.paused = false;
    this.mode = "attract";
    this.fireHeld = false;
    this.fireLeftHeld = false;
    this.mouseFocus = false;
    this.keyOverride = null;
    if (document.pointerLockElement) document.exitPointerLock();
    this.resetMission();
    this.hooks.onEvent({ type: "mode", mode: "menu" });
  }

  reinsert() {
    if (this.mode !== "dead") return;
    this.resetInputState();
    this.hp = 100;
    this.armor = 25;
    this.invuln = 2.4;
    this.mode = "ground";
    const p = this.objectivePoint();
    this.placeNear(p.x, p.z);
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.slideT = 0;
    this.wallRun = 0;
    this.grounded = true;
    this.hooks.onEvent({ type: "mode", mode: "play" });
  }

  start(op: OpId, serverSpawn?: ServerPlayerSnapshot["position"]) {
    this.audio.ensure();
    this.op = op;
    this.hostOp = op;
    this.worn = null;
    this.solar = 0;
    this.unravelT = 0;
    this.raT = 0;
    this.paused = false;
    this.resetMission();
    this.mode = serverSpawn ? "ground" : "drop";
    this.landed = Boolean(serverSpawn);
    this.dropAge = 0;
    this.x = serverSpawn?.x ?? 0;
    this.y = serverSpawn?.y ?? 120;
    this.z = serverSpawn?.z ?? 86;
    this.vx = 0;
    this.vy = serverSpawn ? 0 : -11;
    this.vz = 0;
    this.yaw = 0;
    this.pitch = -0.42;
    this.eye = 1.62;
    this.hp = 100;
    this.armor = this.op === "khensu" ? 40 : 15;
    this.zoneX = 0;
    this.zoneZ = 0;
    this.zoneR = 176;
    this.missionClock = 0;
    this.kills = 0;
    this.haul = 0;
    this.recovered = [];
    this.grounded = false;
    const primary = OPERATOR_BY_ID[op].weapon;
    const brought = modsForDrop(loadMars(), primary);
    this.slots = [
      { id: primary, mag: WEAPONS[primary].mag, reserve: WEAPONS[primary].mag * 2, mods: brought },
      { id: "pistol", mag: WEAPONS.pistol.mag, reserve: WEAPONS.pistol.mag * 2, mods: [] },
    ];
    this.slot = 0;
    this.say("ACCORD", "Ananda is under Cradle Alpha. Nefret is under Cradle Omega. The technocrats have been cutting them open.");
    this.say("MA'AT", "Parachute in. Scavenge what the street gives you. Breach the cells.");
    this.say("DHARMA", "Free air lights the signal fires. When a bloodline is loose, B wears it. It will not feel trained.");
    this.say("TACTICAL", "Slums drop scrap guns. The monolith drops rails. A mod seats on the weapon in your hands.");
    if (brought.length) this.say("ACCORD", "The field cache sent your filed mods with the weapon.");
    this.configureSquad();
    this.spawnInitial();
    this.sealLoadout();
    this.hooks.onEvent({ type: "mode", mode: "play" });
  }

  enableServerGameplay(
    state: ServerGameplayState,
    handlers: ServerGameplayHandlers,
  ) {
    this.serverGameplayGeneration += 1;
    this.serverGameplayActive = true;
    this.serverGameplayHandlers = handlers;
    this.pendingServerInteractions.clear();
    this.applyServerGameplayState(state);
  }

  disableServerGameplay() {
    this.serverGameplayGeneration += 1;
    const restoreLocalLoot = this.serverGameplayActive;
    this.serverGameplayActive = false;
    this.serverGameplayHandlers = null;
    this.pendingServerInteractions.clear();
    if (!restoreLocalLoot) return;

    for (const loot of this.loots) this.disposeLoot(loot);
    this.loots = [];
    for (const spec of this.world.loots) this.makeLoot(spec, false);
    for (const terminal of this.terminals) {
      terminal.open = false;
      terminal.mesh.visible = true;
    }
  }

  applyServerGameplayState(state: ServerGameplayState) {
    if (!this.serverGameplayActive) return;

    const existingByServerId = new Map<string, Loot>();
    for (const loot of this.loots) {
      if (loot.serverId) existingByServerId.set(loot.serverId, loot);
      else this.disposeLoot(loot);
    }
    const nextLoots: Loot[] = [];
    for (const spawn of state.lootSpawns) {
      if (!spawn.available) continue;
      const existing = existingByServerId.get(spawn.id);
      if (existing) {
        existingByServerId.delete(spawn.id);
        nextLoots.push(existing);
        continue;
      }
      const suffix = Number(spawn.id.slice("map-loot-".length));
      this.makeLoot(
        {
          kind: spawn.kind,
          label: spawn.label,
          x: spawn.x,
          z: spawn.z,
          scrap: spawn.scrap,
          ...(spawn.weaponId ? { weaponId: spawn.weaponId as WeaponId } : {}),
          ...(spawn.modId ? { modId: spawn.modId } : {}),
        },
        suffix > this.world.loots.length,
        spawn.id,
      );
      const created = this.loots.pop();
      if (created) nextLoots.push(created);
    }
    for (const loot of existingByServerId.values()) this.disposeLoot(loot);
    this.loots = nextLoots;
    const serverTerminals = new Map(state.terminals.map((terminal) => [terminal.id, terminal]));
    for (const terminal of this.terminals) {
      const record = serverTerminals.get(terminal.id);
      if (!record) continue;
      terminal.open = record.state === "opened";
      terminal.mesh.visible = !terminal.open;
    }
    this.serverGameplayHandlers?.inventoryChanged(state.inventory);
  }

  private disposeLoot(loot: Loot) {
    loot.mesh.removeFromParent();
    loot.mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    });
  }

  applyServerPosition(player: ServerPlayerSnapshot) {
    if (!this.serverGameplayActive || (this.mode !== "ground" && this.mode !== "drop")) return;
    if (Math.hypot(player.position.x - this.x, player.position.z - this.z) >= 1.1) {
      this.x = player.position.x;
      this.z = player.position.z;
    }
    this.hp = player.health;
    this.syncServerWeapon("right", player.rightWeapon);
    this.syncServerWeapon("left", player.leftWeapon);
    this.qCd = player.ability.cooldownRemainingSeconds;
    this.phaseT =
      player.ability.abilityId === "TEMPORAL_PHASE" && player.ability.isActive
        ? player.ability.activeDurationRemainingSeconds
        : 0;
    this.healT =
      player.ability.abilityId === "RAS_RADIANCE" && player.ability.isActive
        ? player.ability.activeDurationRemainingSeconds
        : 0;
  }

  applyServerSnapshot(
    players: ServerPlayerSnapshot[],
    localPlayerId: string,
  ) {
    const localPlayer = players.find((player) => player.playerId === localPlayerId);
    if (localPlayer) this.applyServerPosition(localPlayer);
    const seen = new Set<string>();
    for (const player of players) {
      if (player.playerId === localPlayerId) continue;
      seen.add(player.playerId);
      let avatar = this.serverPlayerAvatars.get(player.playerId);
      if (!avatar) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.34, 0.92, 4, 8),
          new THREE.MeshStandardMaterial({
            color: 0x607a83,
            roughness: 0.72,
            metalness: 0.28,
          }),
        );
        body.position.y = 0.96;
        group.add(body);
        const rightWeapon = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.14, 0.48),
          new THREE.MeshStandardMaterial({ color: 0xffbf68, emissive: 0x43240b }),
        );
        rightWeapon.position.set(0.34, 1.22, 0.42);
        group.add(rightWeapon);
        const leftWeapon = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.14, 0.48),
          new THREE.MeshStandardMaterial({ color: 0x77cde0, emissive: 0x0c3442 }),
        );
        leftWeapon.position.set(-0.34, 1.22, 0.42);
        group.add(leftWeapon);
        const abilityRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.035, 6, 24),
          new THREE.MeshBasicMaterial({ color: 0x82d8ff, transparent: true, opacity: 0.85 }),
        );
        abilityRing.rotation.x = Math.PI / 2;
        abilityRing.position.y = 0.08;
        abilityRing.visible = false;
        group.add(abilityRing);
        this.scene.add(group);
        avatar = { group, rightWeapon, leftWeapon, abilityRing };
        this.serverPlayerAvatars.set(player.playerId, avatar);
      }
      avatar.group.position.set(
        player.position.x,
        player.position.y,
        player.position.z,
      );
      avatar.group.rotation.y = (player.yaw * Math.PI) / 180;
      avatar.group.visible = player.health > 0;
      avatar.abilityRing.visible = player.ability.isActive;
      const rightMaterial = avatar.rightWeapon.material as THREE.MeshStandardMaterial;
      const leftMaterial = avatar.leftWeapon.material as THREE.MeshStandardMaterial;
      rightMaterial.color.set(
        player.rightHandState === "FIRING" ? 0xfff0b0 : 0xffbf68,
      );
      leftMaterial.color.set(
        player.leftHandState === "FIRING" ? 0xd3f8ff : 0x77cde0,
      );
      const abilityMaterial = avatar.abilityRing.material as THREE.MeshBasicMaterial;
      abilityMaterial.color.set(
        player.ability.abilityId === "TEMPORAL_PHASE" ? 0x82d8ff : 0xff7861,
      );
    }
    for (const [playerId, avatar] of this.serverPlayerAvatars) {
      if (seen.has(playerId)) continue;
      this.scene.remove(avatar.group);
      avatar.group.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          for (const material of materials) material.dispose();
        }
      });
      this.serverPlayerAvatars.delete(playerId);
    }
  }

  private syncServerWeapon(
    hand: WeaponHand,
    serverWeapon: ServerPlayerSnapshot["rightWeapon"],
  ) {
    const slot = this.slotForHand(hand);
    if (!slot) return;
    slot.id = serverWeapon.weaponId as WeaponId;
    slot.mods = [];
    slot.mag = serverWeapon.ammoInMagazine;
    slot.reserve = serverWeapon.reserveAmmo;
    this.weaponCycles[hand].syncAuthoritativeReload(
      serverWeapon.isReloading,
      serverWeapon.reloadRemainingSeconds,
      this.weaponForHand(hand).reload,
    );
  }

  matchInput(): MatchInput {
    const forward = clamp(
      (this.held("KeyW") ? 1 : 0) - (this.held("KeyS") ? 1 : 0) + this.virtual.ay + this.gamepad.moveY,
      -1,
      1,
    );
    const strafe = clamp(
      (this.held("KeyD") ? 1 : 0) - (this.held("KeyA") ? 1 : 0) + this.virtual.ax + this.gamepad.moveX,
      -1,
      1,
    );
    let inputFlags = 0;
    if (this.fireHeld || this.virtual.fire || this.gamepad.fireRight) {
      inputFlags |= SERVER_INPUT_FLAGS.FIRE_RIGHT;
    }
    if (this.fireLeftHeld || this.virtual.fireLeft || this.gamepad.fireLeft) {
      inputFlags |= SERVER_INPUT_FLAGS.FIRE_LEFT;
    }
    if (this.held("KeyR") || this.virtual.reload || this.serverReloadPulse) {
      inputFlags |= SERVER_INPUT_FLAGS.RELOAD_REQUEST;
    }
    if (this.held("KeyQ") || this.virtual.ability || this.serverAbilityPulse) {
      inputFlags |= SERVER_INPUT_FLAGS.ACTIVATE_ABILITY;
    }
    this.serverReloadPulse = false;
    this.serverAbilityPulse = false;
    if (this.aiming || this.focusToggle || this.virtual.aim || this.gamepad.focus) {
      inputFlags |= SERVER_INPUT_FLAGS.FOCUS_AIM;
    }
    const clientYaw = (this.yaw * 180) / Math.PI;
    const matchYaw = ((clientYaw % 360 + 360) % 360) - 180;
    return {
      inputFlags,
      pitch: (this.pitch * 180) / Math.PI,
      yaw: matchYaw,
      movementVector: { forward, strafe: -strafe },
    };
  }

  private resetMission() {
    this.resetInputState();
    for (const box of this.world.covers) {
      box.alive = true;
      box.hp = box.maxHp;
      if (box.mesh) box.mesh.visible = true;
    }
    for (const site of this.world.sites) site.freed = false;
    this.freedCount = 0;
    this.stress = 0.1;
    this.recovered = [];
    this.phase = "INFILTRATION";
    this.panic = false;
    this.beaconDone = false;
    this.beaconWave = false;
    this.channel = 0;
    this.extractT = 0;
    this.qCd = 0;
    this.ultCd = 0;
    this.phaseT = 0;
    this.shieldT = 0;
    this.anchorT = 0;
    this.anchor = null;
    this.portalA = null;
    this.portalB = null;
    this.portalT = 0;
    this.voidT = 0;
    this.healT = 0;
    this.solar = 0;
    this.orbitalStrike = false;
    this.orbitalVfx = 0;
    this.orbitalBeam.visible = false;
    this.orbitalHalo.visible = false;
    this.orbitalLight.visible = false;
    this.orbitalLight.intensity = 0;
    this.solarFlash = 0;
    this.unravelT = 0;
    this.raT = 0;
    this.worn = null;
    this.lines = [];
    this.line = null;
    this.feed = [];
    this.floaters = [];
    this.footprints = [];
    this.resetHandCombat();
    this.slideT = 0;
    for (const loot of [...this.loots]) {
      if (loot.extra) {
        loot.mesh.removeFromParent();
        this.loots.splice(this.loots.indexOf(loot), 1);
      } else {
        loot.alive = true;
        loot.mesh.visible = true;
      }
    }
    for (const term of this.terminals) {
      term.open = false;
      term.mesh.visible = true;
    }
    for (const vip of this.vips) {
      vip.active = false;
      vip.x = vip.site.x;
      vip.z = vip.site.z;
      vip.y = 0;
      vip.mesh.position.set(vip.x, 0.15, vip.z);
      vip.mesh.visible = true;
      vip.worn = false;
      vip.cd = 1.5;
    }
    for (const actor of this.pool) {
      actor.alive = false;
      actor.squad = false;
      actor.deployed = false;
      actor.down = 0;
      actor.corpse = 0;
      actor.navigation = null;
      actor.tactics = null;
      actor.group.visible = false;
      actor.group.rotation.set(0, 0, 0);
      actor.bodyMat.opacity = 1;
      actor.bodyMat.transparent = false;
    }
  }

  private resetInputState() {
    this.keys.clear();
    this.keyOverride = null;
    Object.assign(this.virtual, {
      ax: 0,
      ay: 0,
      lookX: 0,
      lookY: 0,
      fire: false,
      fireLeft: false,
      aim: false,
      jump: false,
      sprint: false,
      crouch: false,
      reload: false,
      ability: false,
      ult: false,
      interact: false,
      slide: false,
      blood: false,
      mass: false,
      swap: false,
      lookHeld: false,
    });
    this.gamepad = {
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      fireRight: false,
      fireLeft: false,
      focus: false,
    };
    this.aiming = false;
    this.mouseFocus = false;
    this.focusToggle = false;
    this.fireHeld = false;
    this.fireLeftHeld = false;
    this.vPrev = { jump: false, ability: false, ult: false, reload: false, slide: false };
    this.bloodPrev = false;
    this.massPrev = false;
    this.slidePrev = false;
    this.swapPrev = false;
    this.spacePrev = false;
    this.reloadPrev = false;
    this.interactPrev = false;
  }

  private configureSquad() {
    const others = OPERATORS.filter((o) => o.id !== this.op);
    others.forEach((op, index) => {
      const actor = this.pool[index]!;
      actor.squad = true;
      actor.alive = true;
      actor.deployed = false;
      actor.kind = "squad";
      actor.team = "accord";
      actor.navigation = null;
      actor.tactics = null;
      actor.opId = op.id;
      actor.name = op.name;
      actor.hp = 100;
      actor.maxHp = 100;
      actor.down = 0;
      actor.x = 0;
      actor.z = 0;
      actor.y = 0;
      this.paint(actor, op.tone === "gold" ? 0x3a3424 : 0x1c3a3c, op.tone === "gold" ? 0xd4a24a : 0x2ee0c8);
      actor.group.visible = false;
    });
  }

  private makeDescendant(kind: "ananda" | "nefret") {
    const mesh = new THREE.Group();
    const pulse: THREE.MeshStandardMaterial[] = [];
    const add = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color: number,
      emissive: number,
      intensity: number,
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: intensity,
        roughness: 0.48,
        metalness: intensity > 0.8 ? 0.4 : 0.15,
      });
      if (intensity > 0.25) pulse.push(mat);
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.position.set(x, y, z);
      box.castShadow = true;
      mesh.add(box);
    };
    if (kind === "ananda") {
      add(0.36, 0.62, 0.26, 0, 0.98, 0, 0x123834, 0x2ee0c8, 0.85);
      add(0.14, 0.46, 0.14, -0.1, 0.38, 0, 0x0c2422, 0x145850, 0.3);
      add(0.14, 0.46, 0.14, 0.1, 0.38, 0, 0x0c2422, 0x145850, 0.3);
      add(0.22, 0.22, 0.22, 0, 1.5, 0, 0xe8e4d8, 0x1a3030, 0.15);
      add(0.1, 0.32, 0.1, -0.26, 0.95, 0, 0x163430, 0x000000, 0);
      add(0.1, 0.32, 0.1, 0.26, 0.95, 0, 0x163430, 0x000000, 0);
      add(0.12, 0.08, 0.12, -0.26, 1.12, 0, 0xd7fff8, 0x2ee0c8, 1.8);
      add(0.12, 0.08, 0.12, 0.26, 1.12, 0, 0xd7fff8, 0x2ee0c8, 1.8);
    } else {
      add(0.5, 0.72, 0.34, 0, 0.98, 0, 0x3a3018, 0xd4a24a, 0.45);
      add(0.26, 0.14, 0.28, -0.36, 1.22, 0, 0x6a5840, 0xd4a24a, 0.55);
      add(0.26, 0.14, 0.28, 0.36, 1.22, 0, 0x6a5840, 0xd4a24a, 0.55);
      add(0.16, 0.42, 0.16, -0.14, 0.36, 0, 0x241c12, 0x000000, 0);
      add(0.16, 0.42, 0.16, 0.14, 0.36, 0, 0x241c12, 0x000000, 0);
      add(0.24, 0.24, 0.24, 0, 1.56, 0, 0xf0e2c8, 0xd4a24a, 0.7);
      add(0.46, 0.045, 0.06, 0, 1.12, 0.16, 0xffe2a4, 0xd4a24a, 1.7);
      add(0.46, 0.045, 0.06, 0, 0.82, 0.16, 0xffe2a4, 0xd4a24a, 1.3);
    }
    mesh.userData.pulse = pulse;
    return mesh;
  }

  private paint(actor: Actor, body: number, visor: number) {
    actor.bodyMat.color.setHex(body);
    actor.bodyMat.emissive.setHex(0x000000);
    actor.bodyMat.opacity = 1;
    actor.bodyMat.transparent = false;
    actor.visorMat.color.setHex(visor);
    actor.visorMat.emissive.setHex(visor);
  }

  private spawnInitial() {
    for (const guard of this.world.guards) this.spawnSec(guard.x, guard.z);
    const far = this.world.nodes.filter((n) => Math.hypot(n.x, n.z - 80) > 40);
    for (let i = 0; i < 4; i++) {
      const n = far[i * 3];
      if (n) this.spawnSec(n.x, n.z);
    }
  }

  private aliveSec() {
    return this.pool.filter((a) => a.alive && a.team === "sec" && a.down <= 0).length;
  }

  private acquire() {
    if (this.pool.filter((a) => a.alive && !a.squad).length >= 16) return null;
    return (
      this.pool.find((a) => !a.alive && !a.squad && a.corpse <= 0) ??
      this.pool.find((a) => !a.alive && !a.squad) ??
      null
    );
  }

  private spawnSec(x: number, z: number) {
    const actor = this.acquire();
    if (!actor) return null;
    if (movementBlocked(x, z, 0, this.solids)) {
      x += 2.4;
      z += 1.6;
    }
    actor.alive = true;
    actor.kind = "guard";
    actor.team = "sec";
    actor.name = "NS-SEC";
    actor.hp = 100;
    actor.maxHp = 100;
    actor.x = x;
    actor.y = 0;
    actor.z = z;
    actor.down = 0;
    actor.corpse = 0;
    actor.aggro = 0;
    actor.slow = 0;
    actor.blind = 0;
    actor.lift = 0;
    actor.mind = "patrol";
    actor.mindStateAge = 0;
    actor.knownX = x;
    actor.knownZ = z;
    actor.navigation = null;
    actor.tactics = null;
    actor.cooldown = Math.random();
    actor.group.visible = true;
    actor.group.rotation.set(0, 0, 0);
    this.paint(actor, 0x2a2428, 0xe24b4b);
    return actor;
  }

  private spawnMilitia(x: number, z: number) {
    const actor = this.acquire();
    if (!actor) return;
    actor.alive = true;
    actor.kind = "militia";
    actor.team = "militia";
    actor.name = "MILITIA";
    actor.hp = 70;
    actor.maxHp = 70;
    actor.x = x;
    actor.y = 0;
    actor.z = z;
    actor.down = 0;
    actor.corpse = 0;
    actor.aggro = 4;
    actor.navigation = null;
    actor.tactics = null;
    actor.mind = "patrol";
    actor.mindStateAge = 0;
    actor.blind = 0;
    actor.lift = 0;
    actor.cooldown = 0.4;
    actor.group.visible = true;
    actor.group.rotation.set(0, 0, 0);
    this.paint(actor, 0x3c3830, 0xe8e4d8);
  }

  private spawnWave(count: number, around?: { x: number; z: number }) {
    let made = 0;
    const nodes = [...this.world.nodes].sort(() => Math.random() - 0.5);
    for (const node of nodes) {
      if (made >= count || this.aliveSec() >= 14) break;
      if (around && Math.hypot(node.x - around.x, node.z - around.z) < 18) continue;
      if (Math.hypot(node.x - this.x, node.z - this.z) < 18) continue;
      if (this.pool.some((a) => a.alive && Math.hypot(a.x - node.x, a.z - node.z) < 4)) continue;
      if (this.spawnSec(node.x, node.z)) made++;
    }
  }

  private makeLoot(spec: LootSpec, extra: boolean, serverId?: string) {
    const group = new THREE.Group();
    const color =
      spec.kind === "intel"
        ? 0xe24b4b
        : spec.kind === "weapon" || spec.kind === "mod"
          ? 0xd4a24a
          : spec.kind === "ammo"
            ? 0x2ee0c8
            : spec.kind === "armor"
              ? 0xe24b4b
              : 0xe8e4d8;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.32, 0.5),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.15, roughness: 0.35 }),
    );
    box.position.y = 0.4;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 2.4, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, fog: false }),
    );
    pole.position.y = 1.5;
    group.add(box, pole);
    group.position.set(spec.x, 0, spec.z);
    this.scene.add(group);
    this.loots.push({
      ...spec,
      mesh: group,
      alive: true,
      extra,
      spin: Math.random() * 6,
      ...(serverId ? { serverId } : {}),
    });
  }

  private loop = (stamp: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.last < 0) {
      this.last = stamp;
      this.render();
      return;
    }
    const dt = Math.min(0.05, (stamp - this.last) / 1000);
    this.last = stamp;
    if (!this.paused) {
      this.time += dt;
      if (this.mode === "attract") this.updateAttract(dt);
      else this.updateGame(dt);
    }
    this.render();
  };

  private updateAttract(dt: number) {
    const t = this.time * 0.07;
    this.camera.position.set(Math.sin(t) * 58, 74, Math.cos(t) * 58);
    this.camera.lookAt(0, 6, 0);
    this.ship.visible = true;
    this.ship.position.set(Math.sin(this.time * 0.15) * 36, 28, Math.cos(this.time * 0.15) * 36);
    this.ship.lookAt(0, 10, 0);
    this.ambience(dt, this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.zoneX = 0;
    this.zoneZ = 0;
    this.zoneR = 150;
    this.drawZone();
  }

  private updateGame(dt: number) {
    if (this.mode === "dead" || this.mode === "win") {
      this.ambience(dt, this.x, this.y + this.eye, this.z);
      this.drawZone();
      this.writeHud();
      return;
    }
    if (this.mode === "drop" || this.mode === "ground") this.missionClock += dt;
    this.dropAge += this.mode === "drop" ? dt : 0;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shotEcho = Math.max(0, this.shotEcho - dt);
    this.qCd = Math.max(0, this.qCd - dt);
    this.ultCd = Math.max(0, this.ultCd - dt);
    this.phaseT = Math.max(0, this.phaseT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.anchorT = Math.max(0, this.anchorT - dt);
    this.portalT = Math.max(0, this.portalT - dt);
    this.portalLock = Math.max(0, this.portalLock - dt);
    this.voidT = Math.max(0, this.voidT - dt);
    this.healT = Math.max(0, this.healT - dt);
    if (this.portalT <= 0) {
      this.portalA = null;
      this.portalB = null;
    }
    this.sinceAid += dt;
    this.sincePush += dt;

    this.readGamepad(dt);
    this.readEdges();
    this.simulatePlayer(dt);
    this.tickReload(dt);
    this.tryShoot();
    this.abilities();
    this.tickBlood(dt);
    this.portalsAndVoid(dt);
    this.updateActors(dt);
    this.updateVips(dt);
    this.updateLoot(dt);
    this.updateZone(dt);
    this.objectives(dt);
    this.director(dt);
    this.tickLines(dt);
    this.footprintsUpdate(dt);
    this.decayJuice(dt);

    if (this.healT > 0) {
      this.hp = Math.min(100, this.hp + 16 * dt);
      for (const actor of this.pool) {
        if (!actor.squad || !actor.deployed || actor.down > 0) continue;
        if (Math.hypot(actor.x - this.x, actor.z - this.z) < 12) {
          actor.hp = Math.min(actor.maxHp, actor.hp + 12 * dt);
        }
      }
    }

    this.ambience(dt, this.x, this.y + 4, this.z);
    this.posePlayer();
    this.writeHud();
  }

  private held(code: string) {
    if (this.keyOverride) return this.keyOverride.has(code);
    return this.keys.has(code);
  }

  private edge(code: string) {
    const down = this.held(code);
    const was = this.prev[code] === true;
    this.prev[code] = down;
    return down && !was;
  }

  private readGamepad(dt: number) {
    const pads = navigator.getGamepads?.();
    const connected = pads ? Array.from(pads).find((pad) => pad?.connected) : null;
    this.gamepad = readGamepadInput(connected, dt);
  }

  private consumeVirtual(name: "jump" | "ability" | "ult" | "reload" | "slide") {
    const down = this.virtual[name];
    const was = this.vPrev[name];
    this.vPrev[name] = down;
    return down && !was;
  }

  private readEdges() {
    if (this.edge("Digit1")) {
      this.slot = 0;
    }
    if (this.edge("Digit2")) {
      this.slot = 1;
    }
    if (this.virtual.swap && !this.swapPrev) {
      this.slot = this.slot === 0 ? 1 : 0;
    }
    if (this.edge("KeyV")) this.focusToggle = !this.focusToggle;
    this.swapPrev = this.virtual.swap;
    const blood = this.held("KeyB") || this.virtual.blood;
    if (blood && !this.bloodPrev) this.cycleBlood();
    this.bloodPrev = blood;
    const mass = this.held("KeyX") || this.virtual.mass;
    if (mass && !this.massPrev) this.massStrike();
    this.massPrev = mass;
  }

  selectWeapon(index: number) {
    if (index < 0 || index >= this.slots.length || this.slot === index) return;
    this.slot = index;
  }

  setLookSensitivity(scale: number) {
    this.sens = 0.00215 * normalizeLookSensitivity(scale);
  }

  touchReadout() {
    const prompt = this.prompt;
    const action = prompt.startsWith("E  ") || prompt.startsWith("HOLD E") ? "interact" : prompt.startsWith("Q") ? "ability" : null;
    return {
      prompt,
      action: action as "interact" | "ability" | null,
      focused: this.aiming,
      weapons: this.slots.map((slot, index) => ({
        name: WEAPONS[slot.id].name,
        active: index === this.slot,
        hand: index === 0 ? "RIGHT" : "LEFT",
      })),
    };
  }

  private simulatePlayer(dt: number) {
    const forwardInput = clamp(
      (this.held("KeyW") ? 1 : 0) - (this.held("KeyS") ? 1 : 0) + this.virtual.ay + this.gamepad.moveY,
      -1,
      1,
    );
    const strafeInput = clamp(
      (this.held("KeyD") ? 1 : 0) - (this.held("KeyA") ? 1 : 0) + this.virtual.ax + this.gamepad.moveX,
      -1,
      1,
    );
    const sens = this.sens * (this.aiming ? 0.78 : 1);
    let lookX = this.virtual.lookX + this.gamepad.lookX;
    let lookY = this.virtual.lookY + this.gamepad.lookY;
    if (this.touch && this.virtual.lookHeld && (this.mode === "ground" || this.mode === "drop")) {
      const targets = [];
      for (const actor of this.pool) {
        if (!actor.alive || actor.hp <= 0 || actor.down > 0 || actor.team !== "sec") continue;
        if (!hasLos(this.x, this.z, actor.x, actor.z, this.solids)) continue;
        targets.push({ x: actor.x, y: actor.y + 1.2, z: actor.z });
      }
      const assisted = applyAimAssist({
        origin: { x: this.x, y: this.y + this.eye, z: this.z },
        yaw: this.yaw,
        pitch: this.pitch,
        lookX,
        lookY,
        targets,
        dt,
        config: this.aimAssist,
      });
      lookX = assisted.lookX;
      lookY = assisted.lookY;
      this.yaw += assisted.yawPull;
      this.pitch = clamp(this.pitch + assisted.pitchPull, -1.35, 1.35);
    }
    this.yaw -= lookX * sens;
    this.pitch = clamp(this.pitch - lookY * sens, -1.35, 1.35);
    this.mouseDX += this.virtual.lookX;
    this.mouseDY += this.virtual.lookY;
    this.virtual.lookX = 0;
    this.virtual.lookY = 0;

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    let wishX = fx * forwardInput + rx * strafeInput;
    let wishZ = fz * forwardInput + rz * strafeInput;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    this.aiming =
      (this.mouseFocus || this.focusToggle || this.virtual.aim || this.gamepad.focus) &&
      this.mode === "ground";
    const sprinting =
      (this.held("ShiftLeft") || this.held("ShiftRight") || this.virtual.sprint) &&
      forwardInput > 0.15 &&
      !this.aiming;
    const speedNow = Math.hypot(this.vx, this.vz);
    if (this.consumeSlide() && this.mode === "ground" && this.grounded && speedNow > 5.2) {
      this.slideT = 0.72;
      const boosted = boostSlideVelocity(this.vx, this.vz);
      this.vx = boosted.vx;
      this.vz = boosted.vz;
    }
    this.crouchHeld = this.held("ControlLeft") || this.held("ControlRight") || this.virtual.crouch || this.slideT > 0;

    const weapon = WEAPONS[this.slots[this.slot]?.id ?? "pistol"];
    const max = maxMovementSpeed({
      operator: this.op,
      weaponMove: weapon.move,
      inUnravel: this.inUnravel(this.x, this.z),
      raActive: this.raT > 0,
      crouched: this.crouchHeld,
      sliding: this.slideT > 0,
      sprinting,
      aiming: this.aiming,
      dropping: this.mode === "drop",
    });
    const sliding = this.slideT > 0 && this.mode === "ground";
    const acceleration = this.mode === "drop" ? 7 : this.grounded ? 13 : 3;
    let slideDrag = 0.85;
    let slideSteer = 8;
    if (sliding) {
      this.slideT -= dt;
      if (this.op === "ananda") {
        slideDrag = 0.18;
        slideSteer = 4;
      }
    }
    const horizontal = stepHorizontalVelocity({
      vx: this.vx,
      vz: this.vz,
      wishX,
      wishZ,
      maxSpeed: max,
      acceleration,
      dt,
      sliding,
      slideDrag,
      slideSteer,
    });
    this.vx = horizontal.vx;
    this.vz = horizontal.vz;

    this.touchingWall = false;
    const nx = this.x + this.vx * dt;
    if (movementBlocked(nx, this.z, this.y, this.solids)) {
      this.touchingWall = true;
      this.deflect("x");
    } else this.x = nx;
    const nz = this.z + this.vz * dt;
    if (movementBlocked(this.x, nz, this.y, this.solids)) {
      this.touchingWall = true;
      this.deflect("z");
    } else this.z = nz;
    const limit = this.world.limit;
    this.x = clamp(this.x, -limit, limit);
    this.z = clamp(this.z, -limit, limit);

    const jumpEdge = this.mode === "ground" && (this.rising("Space") || this.consumeVirtual("jump"));
    if (this.mode === "drop") {
      const dive = this.held("ShiftLeft") || this.held("ShiftRight") || this.virtual.sprint;
      const flare = this.held("Space") || this.virtual.jump;
      this.vy = dive ? -32 : flare ? -4.2 : -11;
      const nextY = this.y + this.vy * dt;
      if (!this.catchRoof(nextY)) this.y = nextY;
    } else {
      if (jumpEdge && this.grounded) {
        this.vy = this.op === "bodhi" ? 9.4 : 8.05;
        this.grounded = false;
        this.airTime = 0;
      } else if (jumpEdge && this.op === "bodhi" && this.touchingWall && !this.grounded) {
        this.wallRun = 1.1;
        this.vy = 5.4;
      }
      if (!this.grounded) {
        const gravity = 30 * (this.op === "bodhi" && this.vy < 0 ? 0.68 : 1);
        const wallRunning = this.wallRun > 0 && (this.op === "bodhi" || this.op === "ananda");
        if (wallRunning) {
          this.wallRun -= dt;
        }
        this.vy = stepVerticalVelocity(
          this.vy,
          dt,
          gravity,
          wallRunning,
          this.held("Space") || this.virtual.jump,
        );
        const nextY = this.y + this.vy * dt;
        if (!this.catchRoof(nextY)) {
          this.y = nextY;
          this.airTime += dt;
        }
      }
    }

    const floor = floorHeight(this.x, this.z, this.y + 0.25, this.solids);
    if (this.vy <= 0 && this.y <= floor + 0.12) {
      const impact = this.pendingImpact !== 0 ? this.pendingImpact : this.vy;
      this.pendingImpact = 0;
      const wasDrop = this.mode === "drop";
      const fell = !this.grounded || wasDrop;
      this.y = floor;
      this.vy = 0;
      this.grounded = true;
      this.airTime = 0;
      if (wasDrop) this.land();
      if (fell && impact < -16) this.damagePlayer((-impact - 16) * 3.1, undefined, undefined, true);
    } else if (this.mode !== "drop") {
      this.grounded = false;
    }

    if (this.raT > 0 && this.mode === "ground") {
      const hoverFloor = floorHeight(this.x, this.z, 3, this.solids);
      this.y = hoverFloor + 2.5;
      this.vy = 0;
      this.grounded = true;
    }

    this.resolveOverlap();
    const targetEye = this.crouchHeld ? 1.02 : 1.62;
    this.eye += (targetEye - this.eye) * (1 - Math.exp(-14 * dt));

    if (this.grounded && this.mode === "ground" && Math.hypot(this.vx, this.vz) > 1.2) {
      this.stepAcc += dt * Math.hypot(this.vx, this.vz);
      const stride = this.crouchHeld ? 4.2 : sprinting ? 2.3 : 3.1;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        if (this.op !== "ananda") this.audio.foot();
      }
    }

    if (this.reloadWant()) this.handleReloadInput();
  }

  private slidePrev = false;
  private swapPrev = false;
  private spacePrev = false;
  private reloadPrev = false;

  private consumeSlide() {
    const keyDown = this.held("KeyC");
    const keyEdge = keyDown && !this.slidePrev;
    this.slidePrev = keyDown;
    const virtEdge = this.virtual.slide && !this.vPrev.slide;
    this.vPrev.slide = this.virtual.slide;
    return keyEdge || virtEdge;
  }

  private rising(code: string) {
    const down = this.held(code);
    const was = code === "Space" ? this.spacePrev : false;
    if (code === "Space") {
      const edge = down && !this.spacePrev;
      this.spacePrev = down;
      return edge;
    }
    return down && !was;
  }

  private reloadWant() {
    const down = this.held("KeyR") || this.virtual.reload;
    const edge = down && !this.reloadPrev;
    this.reloadPrev = down;
    return edge;
  }

  private deflect(axis: "x" | "z") {
    const slick = this.op === "ananda" && (this.slideT > 0 || this.wallRun > 0 || Math.hypot(this.vx, this.vz) > 7.2);
    if (!slick) {
      if (axis === "x") this.vx = 0;
      else this.vz = 0;
      return;
    }
    const killed = axis === "x" ? this.vx : this.vz;
    if (axis === "x") this.vx = 0;
    else this.vz = 0;
    const keep = axis === "x" ? this.vz : this.vx;
    const sign = Math.sign(keep || (axis === "x" ? -Math.cos(this.yaw) : -Math.sin(this.yaw)) || 1);
    const transferred = sign * Math.abs(killed) * 0.82;
    if (axis === "x") this.vz += transferred;
    else this.vx += transferred;
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 13.5) {
      this.vx *= 13.5 / sp;
      this.vz *= 13.5 / sp;
    }
    this.wallRun = Math.max(this.wallRun, 0.85);
    this.slideT = Math.max(this.slideT, 0.4);
    if (this.slideT > 0.15 && this.grounded) {
      this.grounded = false;
      this.vy = Math.max(this.vy, 4.4);
    }
  }

  private inUnravel(x: number, z: number) {
    return this.unravelT > 0 && Math.hypot(x - this.unravelX, z - this.unravelZ) < this.unravelR;
  }

  private catchRoof(nextY: number) {
    let roof = -1;
    for (const box of this.solids) {
      if (!box.alive) continue;
      if (!xzHit(this.x, this.z, 0.15, box)) continue;
      if (box.h > roof) roof = box.h;
    }
    if (roof < 0) return false;
    if (this.vy < 0 && this.y >= roof - 0.25 && nextY < roof) {
      this.pendingImpact = this.vy;
      this.y = roof;
      this.vy = 0;
      return true;
    }
    return false;
  }

  private resolveOverlap() {
    for (let n = 0; n < 2; n++) {
      for (const box of this.solids) {
        if (!box.alive || !xzHit(this.x, this.z, RADIUS, box)) continue;
        if (this.y >= box.h - 0.08) continue;
        if (this.y > box.h - 2.6) {
          this.y = box.h;
          this.vy = Math.max(0, this.vy);
          this.grounded = true;
          return;
        }
        const separated = separateAabbOverlap(this.x, this.z, RADIUS, box);
        this.x = separated.x;
        this.z = separated.z;
      }
    }
  }

  private land() {
    if (this.landed) return;
    this.landed = true;
    this.mode = "ground";
    this.landTime = this.time;
    this.invuln = Math.max(this.invuln, 1.15);
    if (this.pitch < -0.16) this.pitch = -0.1;
    this.placeSquad();
    this.say("TACTICAL", "Boots down. Scavenge, then breach Cradle Alpha.");
  }

  private placeSquad() {
    const spots = [
      [2.3, 2.4],
      [-2.3, 2.4],
      [0.2, 3.6],
    ];
    let i = 0;
    for (const actor of this.pool) {
      if (!actor.squad) continue;
      const spot = spots[i++] ?? [0, 3];
      let sx = this.x + spot[0];
      let sz = this.z + spot[1];
      if (movementBlocked(sx, sz, 0, this.solids)) {
        sx = this.x;
        sz = this.z + 1.4;
      }
      actor.x = sx;
      actor.z = sz;
      actor.y = floorHeight(sx, sz, this.y + 0.2, this.solids);
      actor.deployed = true;
      actor.group.visible = true;
    }
  }

  private placeNear(x: number, z: number) {
    for (let ring = 0; ring <= 14; ring += 2) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const px = x + Math.cos(ang) * ring;
        const pz = z + Math.sin(ang) * ring;
        if (!movementBlocked(px, pz, 0, this.solids)) {
          this.x = px;
          this.z = pz;
          this.y = floorHeight(px, pz, 1, this.solids);
          return;
        }
      }
    }
    this.x = x;
    this.z = z;
    this.y = 0;
  }

  private currentWeapon() {
    return WEAPONS[this.slots[this.slot]?.id ?? "pistol"];
  }

  private gunStats() {
    const weapon = this.currentWeapon();
    return compileWeapon(weapon, this.slots[this.slot]?.mods ?? []);
  }

  private resetHandCombat() {
    this.weaponCycles.right.cancelReload();
    this.weaponCycles.left.cancelReload();
    this.reloadSequence = null;
    this.reloadTapAt = -Infinity;
    this.handRecoil.right = 0;
    this.handRecoil.left = 0;
  }

  private slotForHand(hand: WeaponHand) {
    return this.slots[hand === "right" ? 0 : 1];
  }

  private weaponForHand(hand: WeaponHand) {
    return WEAPONS[this.slotForHand(hand)?.id ?? "pistol"];
  }

  private statsForHand(hand: WeaponHand) {
    const slot = this.slotForHand(hand);
    return compileWeapon(this.weaponForHand(hand), slot?.mods ?? []);
  }

  private handIndex(hand: WeaponHand) {
    return hand === "right" ? 0 : 1;
  }

  private handNeedsReload(hand: WeaponHand) {
    const slot = this.slotForHand(hand);
    if (!slot || slot.reserve <= 0) return false;
    const cycle = this.weaponCycles[hand];
    const capacity = this.statsForHand(hand).mag;
    if (slot.mag >= capacity) return false;
    return cycle.isReloading || slot.mag <= Math.ceil(capacity * 0.25);
  }

  private beginHandReload(hand: WeaponHand, durationMultiplier = 1) {
    const slot = this.slotForHand(hand);
    if (!slot) return false;
    const weapon = this.weaponForHand(hand);
    const stats = this.statsForHand(hand);
    return this.weaponCycles[hand].beginReload(
      slot.mag,
      stats.mag,
      slot.reserve,
      weapon.reload * (stats.perks.has("CAPACITY_DOUBLE") ? 1.15 : 1) * durationMultiplier,
    );
  }

  private autoReloadHand(hand: WeaponHand) {
    if (
      hand === "left" &&
      this.reloadSequence === "left" &&
      this.weaponCycles.right.isReloading
    ) {
      return;
    }
    this.beginHandReload(hand);
  }

  private tickReload(dt: number) {
    for (const hand of ["right", "left"] as const) {
      const slot = this.slotForHand(hand);
      if (!slot) continue;
      const ammo = this.weaponCycles[hand].tickReload(
        dt,
        slot.mag,
        slot.reserve,
        this.statsForHand(hand).mag,
      );
      if (ammo) {
        slot.mag = ammo.magazine;
        slot.reserve = ammo.reserve;
      }
    }
    if (
      this.reloadSequence === "left" &&
      !this.weaponCycles.right.isReloading &&
      !this.weaponCycles.left.isReloading
    ) {
      this.reloadSequence = null;
      this.beginHandReload("left");
    }
  }

  private handleReloadInput() {
    if (this.serverGameplayActive) this.serverReloadPulse = true;
    const needs = {
      right: this.handNeedsReload("right"),
      left: this.handNeedsReload("left"),
    };
    const doubleTap = this.time - this.reloadTapAt <= 0.32;
    this.reloadTapAt = this.time;
    const plan = planDualReload(needs, doubleTap);
    if (plan === "none") return;
    if (plan === "simultaneous") {
      this.reloadSequence = null;
      this.weaponCycles.right.cancelReload();
      this.weaponCycles.left.cancelReload();
      this.beginHandReload("right", 1.2);
      this.beginHandReload("left", 1.2);
      return;
    }
    if (plan === "staggered") {
      this.reloadSequence = "left";
      if (!this.weaponCycles.right.isReloading && !this.beginHandReload("right")) {
        this.reloadSequence = null;
        this.beginHandReload("left");
      }
      return;
    }
    this.beginHandReload(plan);
  }

  private tryShoot() {
    if ((this.mode !== "ground" && this.mode !== "drop") || this.paused) return;
    this.tryShootHand("right", this.fireHeld || this.virtual.fire || this.gamepad.fireRight);
    this.tryShootHand("left", this.fireLeftHeld || this.virtual.fireLeft || this.gamepad.fireLeft);
  }

  private tryShootHand(hand: WeaponHand, wanted: boolean) {
    const slot = this.slotForHand(hand);
    if (!slot) return;
    const weapon = this.weaponForHand(hand);
    const stats = this.statsForHand(hand);
    const cycle = this.weaponCycles[hand];
    const attempt = cycle.attemptShot({
      automatic: weapon.auto,
      wanted,
      now: this.time,
      interval: (60 / stats.rpm) * (this.inUnravel(this.x, this.z) ? 0.67 : 1),
      magazine: slot.mag,
    });
    if (attempt === "wait") return;
    if (attempt === "empty") {
      this.audio.empty();
      this.autoReloadHand(hand);
      return;
    }
    slot.mag -= 1;
    const quiet = stats.perks.has("ACOUSTIC_STEALTH_MASK");
    this.shotEcho = this.op === "ananda" ? 0 : quiet ? 0.4 : 0.55;
    if (this.phaseT > 0) this.phaseT = 0;
    this.audio.gun(weapon.id);
    this.handRecoil[hand] = Math.min(0.2, this.handRecoil[hand] + stats.recoil * 1.5);
    this.kick = Math.min(0.14, this.kick + 0.045 * stats.recoil / Math.max(0.004, weapon.recoil));
    if (this.op !== "khensu") this.shake = Math.min(0.7, this.shake + 0.16);
    const muzzle = this.handGuns[hand].get(weapon.id)?.userData.muzzle as THREE.Mesh | undefined;
    if (muzzle) muzzle.visible = true;
    const sliding = stats.perks.has("SLIDE_ACCURACY_BUFF") && this.slideT > 0;
    const skill = this.slideT > 0 || (!this.grounded && this.airTime > 0.16);
    const count = weapon.pellets;
    this.camera.updateMatrixWorld();
    for (let i = 0; i < count; i++) {
      this.camera.getWorldDirection(this.aim);
      const base = this.aiming
        ? Math.max(stats.adsSpread, stats.spread * dualWieldSpreadMultiplier(true))
        : (sliding ? stats.adsSpread : stats.spread) * dualWieldSpreadMultiplier(false);
      const spread = base * (Math.hypot(this.vx, this.vz) > 4 && !sliding ? 1.4 : 1);
      this.camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.camUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.aim.addScaledVector(this.camRight, (Math.random() - 0.5) * spread * 2);
      this.aim.addScaledVector(this.camUp, (Math.random() - 0.5) * spread * 2);
      this.aim.normalize();
      this.fireRay(weapon, stats, skill, hand);
    }
    if (slot.mag <= 0) this.autoReloadHand(hand);
  }

  private fireRay(
    weapon: (typeof WEAPONS)[WeaponId],
    stats: ReturnType<MissionEngine["gunStats"]>,
    skill: boolean,
    hand: WeaponHand,
  ) {
    this.camera.getWorldPosition(this.camPos);
    this.camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
    const muzzleOffset = handMuzzleOffset(hand);
    let ox = this.camPos.x + this.camRight.x * muzzleOffset;
    let oy = this.camPos.y;
    let oz = this.camPos.z + this.camRight.z * muzzleOffset;
    const dx = this.aim.x;
    const dy = this.aim.y;
    const dz = this.aim.z;
    const redirected = this.portalHop(ox, oy, oz, dx, dy, dz);
    ox = redirected.ox;
    oy = redirected.oy;
    oz = redirected.oz;
    const range = weapon.range;
    const pierce = stats.perks.has("ENV_MESH_PENETRATION");
    let hops = pierce ? 1 : 0;
    let ignored: Box | null = null;
    let traveled = 0;
    const gold = this.op === "khensu" || this.op === "aset" || this.op === "nefret";
    while (traveled < range) {
      const left = range - traveled;
      let wallT = left;
      let wallBox: Box | null = null;
      for (const box of this.solids) {
        if (!box.alive || box === ignored) continue;
        const t = rayBox(ox, oy, oz, dx, dy, dz, box, left);
        if (t != null && t < wallT) {
          wallT = t;
          wallBox = box;
        }
      }
      let best: { actor: Actor; t: number; head: boolean; leg: boolean } | null = null;
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
        const headT = raySphere(ox, oy, oz, dx, dy, dz, actor.x, actor.y + 1.58, actor.z, 0.2, left);
        if (headT != null && headT < wallT && (!best || headT < best.t)) {
          best = { actor, t: headT, head: true, leg: false };
          continue;
        }
        const body = rayCylinder(ox, oy, oz, dx, dy, dz, actor.x, actor.z, 0.4, actor.y + 0.15, actor.y + 1.45, left);
        if (body && body.t < wallT && (!best || body.t < best.t)) {
          best = { actor, t: body.t, head: false, leg: body.y < actor.y + 0.55 };
        }
      }
      if (best) {
        this.tracer(ox, oy, oz, dx, dy, dz, best.t, gold ? 0xd4a24a : 0x2ee0c8);
        let dmg = stats.dmg * this.falloff(weapon, traveled + best.t);
        if (this.op === "nefret") dmg *= 1 + this.solar / 140;
        this.hurtActor(best.actor, dmg, best.head, best.leg, skill, true);
        if (weapon.id === "slug") this.splash(ox + dx * best.t, oz + dz * best.t, 2.6, 12);
        return;
      }
      this.tracer(ox, oy, oz, dx, dy, dz, wallT, gold ? 0xd4a24a : 0x2ee0c8);
      if (wallBox?.destructible && hops > 0 && !wallBox.reinforced) {
        const damage = weapon.structure * 0.4 * (this.op === "nefret" ? 1.35 : 1);
        if (applyCoverDamage(wallBox, damage)) this.breakBox(wallBox);
        else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
        ignored = wallBox;
        hops -= 1;
        const step = wallT + 0.45;
        ox += dx * step;
        oy += dy * step;
        oz += dz * step;
        traveled += step;
        continue;
      }
      if (wallBox?.destructible) {
        const damage = weapon.structure * (this.op === "nefret" ? 1.35 : 1);
        if (applyCoverDamage(wallBox, damage)) this.breakBox(wallBox);
        else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
      } else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
      if (weapon.id === "slug") this.splash(ox + dx * wallT, oz + dz * wallT, 2.6, 12);
      return;
    }
  }

  private falloff(weapon: (typeof WEAPONS)[WeaponId], t: number) {
    if (t <= weapon.falloffStart) return 1;
    if (t >= weapon.falloffEnd) return weapon.minFalloff;
    const u = (t - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart);
    return 1 - u * (1 - weapon.minFalloff);
  }

  private portalHop(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) {
    if (!this.portalA || !this.portalB || this.portalT <= 0) return { ox, oy, oz };
    const near = (p: { x: number; z: number }, other: { x: number; z: number }) => {
      const vx = p.x - ox;
      const vy = 1.2 - oy;
      const vz = p.z - oz;
      const t = vx * dx + vy * dy + vz * dz;
      if (t < 0.2 || t > 60) return null;
      const d = Math.hypot(p.x - (ox + dx * t), 1.2 - (oy + dy * t), p.z - (oz + dz * t));
      return d < 1.2 ? { t, other } : null;
    };
    const a = near(this.portalA, this.portalB);
    const b = near(this.portalB, this.portalA);
    const hit = a && (!b || a.t < b.t) ? a : b;
    if (!hit) return { ox, oy, oz };
    return { ox: hit.other.x, oy: 1.45, oz: hit.other.z };
  }

  private hurtActor(actor: Actor, dmg: number, head: boolean, leg: boolean, skill: boolean, byPlayer: boolean) {
    const hit = resolveHitDamage(dmg, head ? "head" : leg ? "leg" : "body", skill);
    actor.hp -= hit.damage;
    if (hit.slowsTarget) actor.slow = 2.5;
    actor.hurt = 0.1;
    actor.aggro = 3;
    if (byPlayer) {
      this.audio.hit(head);
      this.combatFeedback.markHit(head);
      if (head || skill || leg) {
        this.floater(head ? "HEADSHOT" : skill ? "SKILLSHOT" : "LEG", actor.x, actor.y + 1.8, actor.z, head ? "#d4a24a" : "#e8e4d8");
      }
      if (this.op === "aset" && (head || skill)) this.qCd = Math.max(0, this.qCd - 13 * 0.2);
    }
    if (actor.hp <= 0) this.killActor(actor, byPlayer);
  }

  private killActor(actor: Actor, byPlayer: boolean) {
    if (actor.kind === "decoy") {
      actor.alive = false;
      actor.group.visible = false;
      actor.bodyMat.transparent = false;
      actor.bodyMat.opacity = 1;
      return;
    }
    if (actor.squad) {
      actor.hp = 0;
      actor.down = 8;
      return;
    }
    actor.alive = false;
    actor.corpse = 5;
    actor.group.rotation.x = 1.15;
    if (byPlayer) {
      this.kills += 1;
      this.feed.unshift({ text: `${actor.name} down`, t: 3.5 });
      this.feed.length = Math.min(this.feed.length, 4);
    }
    const roll = Math.random();
    if (roll < 0.42) this.makeLoot({ kind: "ammo", x: actor.x, z: actor.z }, true);
    else if (roll < 0.68) this.makeLoot({ kind: "med", x: actor.x, z: actor.z }, true);
    else this.makeLoot(rollLoot(actor.x, actor.z, Math.random), true);
  }

  private breakBox(box: Box) {
    box.alive = false;
    box.hp = 0;
    if (box.mesh) box.mesh.visible = false;
    this.emitDebris((box.minX + box.maxX) / 2, Math.max(0.4, box.h * 0.45), (box.minZ + box.maxZ) / 2);
    this.audio.breach();
    if (this.op !== "khensu") this.shake = Math.min(1, this.shake + 0.35);
    this.floater("BREACH", (box.minX + box.maxX) / 2, box.h, (box.minZ + box.maxZ) / 2, "#e24b4b");
  }

  private accuracyNow() {
    return this.panic ? 0.85 : 1;
  }

  private emitDebris(x: number, y: number, z: number) {
    const seed = Math.floor(Math.abs(x * 97 + z * 13 + this.time * 1000)) % 9999999;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const bits = seededDebris({ x, y, z }, { x: fx, z: fz }, seed, 10);
    for (const bit of bits) {
      const slot = this.rubble.find((item) => item.life <= 0);
      if (!slot) break;
      slot.life = 0.85;
      slot.mesh.visible = true;
      slot.mesh.position.set(bit.x, bit.y, bit.z);
      slot.mesh.scale.setScalar(bit.scale);
      slot.vx = bit.vx;
      slot.vy = bit.vy;
      slot.vz = bit.vz;
    }
  }

  private abilities() {
    const q = this.risingKey("KeyQ") || this.consumeVirtual("ability");
    const f = this.risingKey("KeyF") || this.consumeVirtual("ult");
    if (q) {
      if (this.serverGameplayActive) this.serverAbilityPulse = true;
      this.useActive();
    }
    if (f) this.useUlt();
  }

  private qPrev = false;
  private fPrev = false;
  private risingKey(code: string) {
    const down = this.held(code);
    const prev = code === "KeyQ" ? this.qPrev : this.fPrev;
    if (code === "KeyQ") this.qPrev = down;
    else this.fPrev = down;
    return down && !prev;
  }

  private useActive() {
    if (this.qCd > 0 || (this.mode !== "ground" && this.mode !== "drop")) return;
    if (this.op === "jaya") {
      this.qCd = 14;
      this.phaseT = 3.2;
      this.audio.ui();
      const actor = this.acquire();
      if (!actor) return;
      actor.alive = true;
      actor.kind = "decoy";
      actor.team = "accord";
      actor.squad = false;
      actor.navigation = null;
      actor.tactics = null;
      actor.name = "HOLO";
      actor.hp = 40;
      actor.maxHp = 40;
      actor.x = this.x;
      actor.y = this.y;
      actor.z = this.z;
      actor.yaw = this.yaw;
      actor.cooldown = 3.2;
      actor.down = 0;
      actor.corpse = 0;
      actor.group.visible = true;
      actor.bodyMat.transparent = true;
      actor.bodyMat.opacity = 0.4;
      actor.bodyMat.color.setHex(0x2ee0c8);
      actor.bodyMat.emissive.setHex(0x2ee0c8);
      actor.visorMat.emissive.setHex(0x2ee0c8);
      this.floater("PHASE", this.x, this.y + 2, this.z, "#2ee0c8");
    } else if (this.op === "bodhi") {
      if (!this.portalA) {
        this.portalA = { x: this.x, z: this.z };
        this.toastMsg = "Entry set. Place the exit.";
        this.toastT = 1.6;
        this.audio.ui();
      } else {
        const point = this.pointAhead(14);
        this.portalB = { x: point.x, z: point.z };
        this.portalT = 18;
        this.qCd = 16;
        this.audio.ui();
      }
    } else if (this.op === "khensu") {
      this.qCd = 11;
      this.camera.getWorldPosition(this.camPos);
      this.camera.getWorldDirection(this.aim);
      let wallT = 16;
      let wallBox: Box | null = null;
      for (const box of this.solids) {
        if (!box.destructible) continue;
        const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, 18);
        if (t != null && t < wallT) {
          wallT = t;
          wallBox = box;
        }
      }
      const px = wallBox ? this.camPos.x + this.aim.x * wallT : this.x + -Math.sin(this.yaw) * 6;
      const pz = wallBox ? this.camPos.z + this.aim.z * wallT : this.z + -Math.cos(this.yaw) * 6;
      if (wallBox) this.breakBox(wallBox);
      else this.audio.breach();
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec") continue;
        if (Math.hypot(actor.x - px, actor.z - pz) < (wallBox ? 4.6 : 3.4)) {
          this.hurtActor(actor, wallBox ? 70 : 34, false, false, false, true);
        }
      }
      this.spark(px, 1, pz);
    } else if (this.op === "aset") {
      this.qCd = 13;
      this.healT = 4.2;
      this.audio.ui();
      this.floater("RADIANCE", this.x, this.y + 2, this.z, "#d4a24a");
    } else if (this.op === "ananda") {
      this.qCd = 9;
      const dest = this.shiftPoint(this.x, this.z, this.yaw, 8);
      this.vacuum(this.x, this.z, 6.2);
      this.x = dest.x;
      this.z = dest.z;
      this.y = floorHeight(this.x, this.z, this.y + 1, this.solids);
      const speed = Math.hypot(this.vx, this.vz);
      if (speed < 2.2) {
        this.vx = -Math.sin(this.yaw) * 7.5;
        this.vz = -Math.cos(this.yaw) * 7.5;
      } else {
        this.vx *= 1.2;
        this.vz *= 1.2;
      }
      this.vacuum(this.x, this.z, 7.4);
      this.floater("SHIFT", this.x, this.y + 2, this.z, "#2ee0c8");
      this.audio.ui();
      this.shake = Math.min(1, this.shake + 0.35);
    } else if (this.op === "nefret") {
      this.qCd = 8;
      this.shatterPulse(this.x, this.z, this.yaw, true);
    }
  }

  private useUlt() {
    if (this.ultCd > 0 || (this.mode !== "ground" && this.mode !== "drop")) return;
    if (this.op === "jaya") {
      this.ultCd = 28;
      this.anchor = { x: this.x, y: this.y, z: this.z };
      this.anchorT = 8;
      this.audio.ui();
    } else if (this.op === "bodhi") {
      this.ultCd = 24;
      const p = this.pointAhead(9);
      this.voidX = p.x;
      this.voidZ = p.z;
      this.voidT = 3.3;
      this.audio.breach();
    } else if (this.op === "khensu") {
      this.ultCd = 26;
      this.shieldT = 6.5;
      this.audio.ui();
    } else if (this.op === "aset") {
      this.ultCd = 24;
      this.camera.updateMatrixWorld();
      this.camera.getWorldPosition(this.camPos);
      this.camera.getWorldDirection(this.aim);
      const ox = this.camPos.x;
      const oy = this.camPos.y;
      const oz = this.camPos.z;
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
        const vx = actor.x - ox;
        const vy = actor.y + 1 - oy;
        const vz = actor.z - oz;
        const t = vx * this.aim.x + vy * this.aim.y + vz * this.aim.z;
        if (t < 1 || t > 90) continue;
        const d = Math.hypot(actor.x - (ox + this.aim.x * t), actor.y + 1 - (oy + this.aim.y * t), actor.z - (oz + this.aim.z * t));
        if (d < 0.95) this.hurtActor(actor, 96, false, false, false, true);
      }
      this.tracer(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, 70, 0xd4a24a);
      this.shake = Math.min(1, this.shake + 0.5);
      this.audio.gun("rail");
    } else if (this.op === "ananda") {
      this.ultCd = 26;
      this.unravelT = 6.2;
      this.unravelR = 3;
      this.unravelX = this.x;
      this.unravelZ = this.z;
      this.audio.breach();
      this.floater("UNRAVEL", this.x, this.y + 2.4, this.z, "#2ee0c8");
    } else if (this.op === "nefret") {
      const orbital = dischargeReady(this.solar, 0);
      this.orbitalStrike = orbital;
      this.ultCd = orbital ? 45 : 28;
      this.raT = orbital ? 5.2 : 4.4;
      this.raAcc = 0;
      if (orbital) {
        this.solar = 0;
        this.beginOrbitalVfx();
      } else this.shake = Math.min(1, this.shake + 0.35);
      this.audio.gun("rail");
      if (orbital) this.audio.orbital();
      this.floater(orbital ? "ORBITAL" : "RA", this.x, this.y + 2.6, this.z, orbital ? "#e24b4b" : "#d4a24a");
    }
  }

  private beginOrbitalVfx() {
    this.camera.updateMatrixWorld();
    this.camera.getWorldPosition(this.camPos);
    this.camera.getWorldDirection(this.aim);
    let end = 56;
    for (const box of this.solids) {
      const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, 56);
      if (t != null && t < end) end = t;
    }
    const x = this.camPos.x + this.aim.x * end;
    const z = this.camPos.z + this.aim.z * end;
    const height = 78;
    this.orbitalBeam.scale.set(1, height, 1);
    this.orbitalHalo.scale.set(1, height, 1);
    this.orbitalBeam.position.set(x, height * 0.5, z);
    this.orbitalHalo.position.set(x, height * 0.5, z);
    this.orbitalBeam.visible = true;
    this.orbitalHalo.visible = true;
    this.orbitalLight.position.set(x, 10, z);
    this.orbitalLight.intensity = 28;
    this.orbitalLight.visible = true;
    this.orbitalVfx = 1.5;
    this.solarFlash = 1;
    const dist = Math.hypot(x - this.x, z - this.z);
    this.shake = Math.max(this.shake, 1.45 / (1 + dist * 0.045));
  }

  private pointAhead(distance: number) {
    this.camera.getWorldPosition(this.camPos);
    this.camera.getWorldDirection(this.aim);
    let tHit = distance;
    for (const box of this.solids) {
      const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, distance);
      if (t != null && t < tHit) tHit = t;
    }
    const t = Math.max(1.5, tHit - 0.8);
    return {
      x: this.camPos.x + this.aim.x * t,
      z: this.camPos.z + this.aim.z * t,
    };
  }

  private shiftPoint(x: number, z: number, yaw: number, distance: number) {
    let bestX = x;
    let bestZ = z;
    for (let d = distance; d >= 2; d -= 1) {
      const nx = x - Math.sin(yaw) * d;
      const nz = z - Math.cos(yaw) * d;
      if (!movementBlocked(nx, nz, 0, this.solids)) {
        bestX = nx;
        bestZ = nz;
        break;
      }
    }
    return { x: bestX, z: bestZ };
  }

  private vacuum(x: number, z: number, radius: number) {
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      const dx = x - actor.x;
      const dz = z - actor.z;
      const d = Math.hypot(dx, dz);
      if (d > radius || d < 0.2) continue;
      const step = Math.min(d, 2.4);
      const nx = actor.x + (dx / d) * step;
      const nz = actor.z + (dz / d) * step;
      if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
      if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
      actor.blind = 2;
      actor.slow = 1.2;
      actor.aggro = 0;
    }
  }

  private shatterPulse(x: number, z: number, yaw: number, byPlayer: boolean) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const overcharge = byPlayer && this.op === "nefret" && this.solar >= 70;
    for (const box of this.solids) {
      if (!box.alive || !box.destructible) continue;
      const cx = (box.minX + box.maxX) / 2;
      const cz = (box.minZ + box.maxZ) / 2;
      if (!inBlastCone(x, z, fx, fz, cx, cz, 15)) continue;
      if (box.reinforced && !overcharge) {
        if (applyCoverDamage(box, 36)) {
          this.breakBox(box);
          this.splash(cx, cz, 3.1, 16);
          continue;
        }
        this.spark(cx, box.h * 0.6, cz);
        continue;
      }
      this.breakBox(box);
      this.splash(cx, cz, 3.1, 16);
    }
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      if (!inBlastCone(x, z, fx, fz, actor.x, actor.z, 15)) continue;
      this.hurtActor(actor, byPlayer ? 48 : 26, false, false, false, byPlayer);
      actor.slow = 1.4;
    }
    if (byPlayer && this.op === "nefret") this.solar = Math.min(100, this.solar + 24);
    this.audio.breach();
    this.shake = Math.min(1, this.shake + (byPlayer ? 0.45 : 0.15));
    this.floater(overcharge ? "OVERCHARGE" : "SHATTER", x + fx * 3, 1.6, z + fz * 3, "#d4a24a");
  }

  private splash(x: number, z: number, radius: number, dmg: number) {
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      if (Math.hypot(actor.x - x, actor.z - z) > radius) continue;
      this.hurtActor(actor, dmg, false, false, false, false);
    }
  }

  private raStrike() {
    this.camera.updateMatrixWorld();
    this.camera.getWorldPosition(this.camPos);
    this.camera.getWorldDirection(this.aim);
    const ox = this.camPos.x;
    const oy = this.camPos.y;
    const oz = this.camPos.z;
    const reach = this.orbitalStrike ? 56 : 42;
    const bite = this.orbitalStrike ? 46 : 28;
    const body = this.orbitalStrike ? 34 : 26;
    let end = reach;
    for (const box of this.solids) {
      const t = rayBox(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, box, reach);
      if (t != null && t < end) {
        end = t;
        if (box.destructible && applyCoverDamage(box, bite)) this.breakBox(box);
      }
    }
    const px = ox + this.aim.x * end;
    const pz = oz + this.aim.z * end;
    const radius = this.orbitalStrike ? 2.6 : 1.7;
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      const vx = actor.x - ox;
      const vy = actor.y + 1 - oy;
      const vz = actor.z - oz;
      const t = vx * this.aim.x + vy * this.aim.y + vz * this.aim.z;
      if (t < 0 || t > end + 1.2) continue;
      const d = Math.hypot(actor.x - (ox + this.aim.x * t), actor.y + 1 - (oy + this.aim.y * t), actor.z - (oz + this.aim.z * t));
      if (d < radius) this.hurtActor(actor, body, false, false, false, true);
    }
    this.splash(px, pz, this.orbitalStrike ? 6.5 : 3.4, this.orbitalStrike ? 18 : 14);
    this.tracer(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, end, this.orbitalStrike ? 0xfff1c9 : 0xffe1a4);
  }

  private tickBlood(dt: number) {
    this.unravelT = Math.max(0, this.unravelT - dt);
    this.raT = Math.max(0, this.raT - dt);
    if (this.raT <= 0) this.orbitalStrike = false;
    if (this.unravelT > 0) {
      this.unravelR = Math.min(16, this.unravelR + 7 * dt);
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
        if (this.inUnravel(actor.x, actor.z)) actor.lift = 0.4;
      }
    }
    if (this.op === "nefret" && this.solar > 0 && this.raT <= 0) {
      const feed = Math.min(this.solar, 9 * dt);
      this.solar -= feed;
      this.armor = Math.min(80, this.armor + feed * 0.85);
    }
    if (this.raT > 0) {
      this.raAcc -= dt;
      if (this.raAcc <= 0) {
        this.raAcc = 0.12;
        this.raStrike();
      }
    }
  }

  private cycleBlood() {
    if (this.mode !== "ground" && this.mode !== "drop") return;
    const free: OpId[] = [];
    if (this.world.sites[0]?.freed) free.push("ananda");
    if (this.world.sites[1]?.freed) free.push("nefret");
    if (!free.length) {
      this.toastMsg = "The bloodlines are still in the pods.";
      this.toastT = 1.4;
      return;
    }
    const order = [this.hostOp, ...free];
    const current = this.worn ?? this.hostOp;
    const idx = Math.max(0, order.indexOf(current));
    this.wear(order[(idx + 1) % order.length]!);
  }

  private sealLoadout() {
    for (const slot of this.slots) {
      slot.mods = sealedModIds(slot.mods, weaponClass(slot.id), (id) => ATTACHMENT_BY_ID[id]);
    }
    acceptDropTicket({
      playerId: this.hostOp,
      selectedCharacterId: this.op,
      validatedWeaponLoadout: this.slots.map((slot) => {
        const weapon = WEAPONS[slot.id];
        return {
          instanceId: `${this.hostOp}:${slot.id}`,
          weaponId: weaponClass(slot.id),
          baseStats: {
            baseDamage: weapon.dmg,
            baseFireRate: weapon.rpm,
            baseRecoil: weapon.recoil,
            baseSoundRadius: 36,
          },
          equippedAttachments: slot.mods.map((id) => ATTACHMENT_BY_ID[id]),
        };
      }),
    });
    this.syncGearMeshes();
  }

  private syncGearMeshes() {
    for (const hand of ["right", "left"] as const) {
      const slot = this.slotForHand(hand);
      const liveId = slot?.id;
      for (const [id, mesh] of this.handGuns[hand]) {
        if (id !== liveId) paintGunKit(mesh, []);
      }
      if (!slot) continue;
      const mesh = this.handGuns[hand].get(slot.id);
      if (!mesh) continue;
      const stats = compileWeapon(WEAPONS[slot.id], slot.mods);
      const packet = packHeldGear({
        playerId: 1,
        operator: this.op,
        weapon: slot.id,
        modIds: slot.mods,
        runtimeRecoilFactor: stats.recoil,
        runtimeDamageValue: stats.dmg,
      });
      const streamed = deserializeGearPacket(packet).equippedModIds;
      const shown = [...streamed];
      for (const code of modCodes(slot.mods)) {
        if (!shown.includes(code)) shown.push(code);
      }
      paintGunKit(mesh, shown);
    }
  }

  private wear(id: OpId) {
    if (id === this.hostOp || id === this.op && !this.worn && id === this.hostOp) {
      this.op = this.hostOp;
      this.worn = null;
      if (this.accordSlots.length) {
        this.slots = this.accordSlots.map((s) => ({ ...s, mods: [...s.mods] }));
        this.slot = this.accordSlot;
        this.sealLoadout();
      }
      for (const vip of this.vips) vip.worn = false;
      this.raT = 0;
      this.unravelT = 0;
      this.say("TACTICAL", `${OPERATOR_BY_ID[this.hostOp].name} takes the body back.`);
      this.audio.ui();
      return;
    }
    if (id !== "ananda" && id !== "nefret") return;
    if (!this.worn) {
      this.sealLoadout();
      this.accordSlots = this.slots.map((s) => ({ ...s, mods: [...s.mods] }));
      this.accordSlot = this.slot;
    }
    this.worn = id;
    this.op = id;
    const weapon = OPERATOR_BY_ID[id].weapon;
    this.slots = [
      { id: weapon, mag: WEAPONS[weapon].mag, reserve: WEAPONS[weapon].mag * 3, mods: [] },
      { id: "pistol", mag: WEAPONS.pistol.mag, reserve: WEAPONS.pistol.mag * 2, mods: [] },
    ];
    this.slot = 0;
    this.resetHandCombat();
    this.qCd = 0.35;
    this.ultCd = 1;
    this.solar = id === "nefret" ? 20 : 0;
    for (const vip of this.vips) vip.worn = vip.id === id;
    this.say(
      id === "ananda" ? "ANANDA" : "NEFRET",
      id === "ananda"
        ? "The cuffs are splitting. Do not stand where I was."
        : "They bottled a star and called it a prison. Move.",
    );
    this.floater("BLOODLINE", this.x, this.y + 2.2, this.z, id === "ananda" ? "#2ee0c8" : "#d4a24a");
    this.audio.ui();
    this.shake = 0.55;
  }

  private massStrike() {
    if (this.op !== "nefret" || (this.mode !== "ground" && this.mode !== "drop")) return;
    if (this.solar < 8) {
      this.toastMsg = "No solar mass.";
      this.toastT = 0.8;
      return;
    }
    const spend = Math.min(this.solar, 40);
    this.solar -= spend;
    const dmg = 26 + spend * 0.85;
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      const dx = actor.x - this.x;
      const dz = actor.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.6 || d < 0.05) continue;
      this.hurtActor(actor, dmg, false, false, false, true);
      const nx = actor.x + (dx / d) * 2.4;
      const nz = actor.z + (dz / d) * 2.4;
      if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
      if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
    }
    this.audio.breach();
    this.floater("MASS", this.x, this.y + 1.4, this.z, "#d4a24a");
  }

  private portalsAndVoid(dt: number) {
    if (this.portalA && this.portalB && this.portalT > 0 && this.portalLock <= 0 && this.mode === "ground") {
      const da = Math.hypot(this.x - this.portalA.x, this.z - this.portalA.z);
      const db = Math.hypot(this.x - this.portalB.x, this.z - this.portalB.z);
      if (da < 1.25) {
        this.x = this.portalB.x;
        this.z = this.portalB.z;
        this.y = floorHeight(this.x, this.z, 2, this.solids);
        this.portalLock = 0.7;
      } else if (db < 1.25) {
        this.x = this.portalA.x;
        this.z = this.portalA.z;
        this.y = floorHeight(this.x, this.z, 2, this.solids);
        this.portalLock = 0.7;
      }
    }
    if (this.voidT > 0) {
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
        const dx = this.voidX - actor.x;
        const dz = this.voidZ - actor.z;
        const d = Math.hypot(dx, dz);
        if (d < 13 && d > 0.4) {
          const step = Math.min(d, 9 * dt);
          const nx = actor.x + (dx / d) * step;
          const nz = actor.z + (dz / d) * step;
          if (!movementBlocked(nx, actor.z, 0, this.solids)) actor.x = nx;
          if (!movementBlocked(actor.x, nz, 0, this.solids)) actor.z = nz;
          actor.slow = 0.3;
        }
      }
    }
    void dt;
  }

  private updateActors(dt: number) {
    const noise = this.noiseRadius();
    const perceptions = new Map<Actor, { seen: boolean; heard: boolean }>();
    for (const actor of this.pool) {
        if (!actor.alive || actor.down > 0 || actor.kind !== "guard" || actor.team !== "sec") continue;
      perceptions.set(actor, {
        seen: actor.blind <= 0 && this.playerVisible(actor),
        heard: actor.blind <= 0 && Math.hypot(this.x - actor.x, this.z - actor.z) < noise * 0.7,
      });
    }
    const signals: SquadSignal[] = [];
    for (const actor of this.pool) {
      if (!actor.alive || actor.down > 0 || actor.kind !== "guard" || actor.team !== "sec") continue;
      const seenNow = perceptions.get(actor)?.seen ?? false;
      const transmitting = seenNow || actor.mind === "suspicious" || actor.mind === "engage" ||
        actor.mind === "investigate" || actor.mind === "search";
      if (!transmitting) continue;
      signals.push({
        senderId: this.pool.indexOf(actor),
        senderX: actor.x,
        senderZ: actor.z,
        targetX: seenNow ? this.x : actor.knownX,
        targetZ: seenNow ? this.z : actor.knownZ,
        state: seenNow && actor.mind === "patrol" ? "suspicious" : actor.mind as SquadSignal["state"],
        seenNow,
      });
    }

    for (const actor of this.pool) {
      if (actor.corpse > 0) {
        actor.corpse -= dt;
        if (actor.corpse <= 0) actor.group.visible = false;
      }
      if (!actor.alive) continue;
      if (actor.squad && !actor.deployed) continue;
      actor.hurt = Math.max(0, actor.hurt - dt);
      actor.slow = Math.max(0, actor.slow - dt);
      actor.blind = Math.max(0, actor.blind - dt);
      actor.bodyMat.emissive.setHex(actor.hurt > 0 ? 0xff3a3a : actor.kind === "decoy" ? 0x2ee0c8 : actor.blind > 0 ? 0x88a0c0 : 0x000000);

      if (actor.kind === "decoy") {
        actor.cooldown -= dt;
        const fx = -Math.sin(actor.yaw);
        const fz = -Math.cos(actor.yaw);
        const nx = actor.x + fx * 6.5 * dt;
        const nz = actor.z + fz * 6.5 * dt;
        if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
        if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
        actor.y = floorHeight(actor.x, actor.z, actor.y + 0.2, this.solids);
        this.face(actor, actor.x + fx, actor.z + fz);
        if (actor.cooldown <= 0 || actor.hp <= 0) {
          actor.alive = false;
          actor.group.visible = false;
          actor.bodyMat.transparent = false;
          actor.bodyMat.opacity = 1;
        }
        continue;
      }

      if (actor.squad && actor.down > 0) {
        actor.down -= dt;
        actor.group.rotation.x = 1.15;
        actor.group.position.set(actor.x, actor.y, actor.z);
        if (actor.down <= 0) {
          actor.hp = 40;
          actor.group.rotation.x = 0;
        }
        continue;
      }

      let tx = actor.x;
      let tz = actor.z;
      let target: { x: number; y: number; z: number } | null = null;
      let canFire = true;
      if (actor.squad) {
        const mates = this.pool.filter((a) => a.squad);
        const index = Math.max(0, mates.indexOf(actor));
        const fx = -Math.sin(this.yaw);
        const fz = -Math.cos(this.yaw);
        const rx = Math.cos(this.yaw);
        const rz = -Math.sin(this.yaw);
        const side = index === 0 ? -1.6 : index === 1 ? 1.6 : 0;
        const back = 2.8 + index * 0.4;
        tx = this.x - fx * back + rx * side;
        tz = this.z - fz * back + rz * side;
        target = this.nearest(actor, "sec", 34);
      } else if (actor.team === "militia") {
        actor.tactics = null;
        target = this.nearest(actor, "sec", 30);
        if (target) {
          tx = target.x;
          tz = target.z;
        }
      } else {
        const perception = perceptions.get(actor) ?? { seen: false, heard: false };
        const radio = selectSquadSignal(
          this.pool.indexOf(actor),
          actor.x,
          actor.z,
          signals,
          34,
        );
        const heard = perception.heard || Boolean(radio);
        const mind = stepEnemyMind({
          state: actor.mind,
          seen: perception.seen,
          heard,
          dt,
          age: actor.mindStateAge,
          lastX: actor.knownX,
          lastZ: actor.knownZ,
          actorX: this.x,
          actorZ: this.z,
          heardX: perception.heard ? this.x : radio?.targetX,
          heardZ: perception.heard ? this.z : radio?.targetZ,
        });
        actor.mind = mind.state;
        actor.mindStateAge = mind.age;
        actor.knownX = mind.lastX;
        actor.knownZ = mind.lastZ;
        actor.aggro = mind.shoot ? 2.8 : mind.investigate ? 1.2 : Math.max(0, actor.aggro - dt);
        if (mind.shoot) {
          const victim = this.nearestThreat(actor);
          if (victim) {
            target = victim;
            const d = Math.hypot(victim.x - actor.x, victim.z - actor.z);
            const dx = victim.x - actor.x;
            const dz = victim.z - actor.z;
            const actorId = this.pool.indexOf(actor);
            const participants = this.pool
              .filter((mate) => {
                if (mate === actor) return true;
                if (!mate.alive || mate.down > 0 || mate.kind !== "guard" || mate.team !== "sec" || mate.mind !== "engage") return false;
                return Math.hypot(mate.x - victim.x, mate.z - victim.z) < 28;
              })
              .map((mate) => ({ id: this.pool.indexOf(mate), x: mate.x, z: mate.z }));
            const role = coordinatedCombatRole(actorId, victim.x, victim.z, participants);
            let tactics = actor.tactics;
            const targetMoved = !tactics || Math.hypot(tactics.threatX - victim.x, tactics.threatZ - victim.z) > 6;
            if (!tactics || tactics.role !== role || targetMoved) {
              const flankSide: -1 | 1 = actorId % 2 === 0 ? -1 : 1;
              tactics = {
                role,
                cover: null,
                coverPhase: "hide",
                coverHold: 0,
                flank: null,
                flankSide,
                threatX: victim.x,
                threatZ: victim.z,
              };
              actor.tactics = tactics;
              if (role === "flanker") {
                tactics.flank = chooseFlankPosition(
                  actor.x,
                  actor.z,
                  victim.x,
                  victim.z,
                  flankSide,
                  (x, z) => !movementBlocked(x, z, 0, this.solids),
                  (x, z) =>
                    findNavigationPath(
                      actor.x,
                      actor.z,
                      x,
                      z,
                      (px, pz) => !movementBlocked(px, pz, 0, this.solids),
                      this.world.limit,
                    ) !== null,
                );
              } else {
                const coverPlans = findCoverPlans(
                  actor.x,
                  actor.z,
                  victim.x,
                  victim.z,
                  this.world.covers,
                  (x, z) => !movementBlocked(x, z, 0, this.solids),
                );
                for (const plan of coverPlans.slice(0, 8)) {
                  const hidePath = findNavigationPath(
                    actor.x,
                    actor.z,
                    plan.hide.x,
                    plan.hide.z,
                    (x, z) => !movementBlocked(x, z, 0, this.solids),
                    this.world.limit,
                  );
                  const peekPath = findNavigationPath(
                    plan.hide.x,
                    plan.hide.z,
                    plan.peek.x,
                    plan.peek.z,
                    (x, z) => !movementBlocked(x, z, 0, this.solids),
                    this.world.limit,
                  );
                  if (hidePath && peekPath) {
                    tactics.cover = plan;
                    break;
                  }
                }
              }
            }

            if (tactics.role === "flanker" && tactics.flank) {
              const waypoint = this.navigateActor(actor, tactics.flank.x, tactics.flank.z, dt);
              tx = waypoint.x;
              tz = waypoint.z;
              canFire = Math.hypot(tactics.flank.x - actor.x, tactics.flank.z - actor.z) < 1.3;
            } else if (tactics.cover) {
              const phaseGoal = tactics.coverPhase === "hide" ? tactics.cover.hide : tactics.cover.peek;
              const distanceToPhaseGoal = Math.hypot(phaseGoal.x - actor.x, phaseGoal.z - actor.z);
              if (distanceToPhaseGoal < 1.15) {
                const nextPhase = stepCoverExposure(tactics.coverPhase, tactics.coverHold, dt);
                tactics.coverPhase = nextPhase.phase;
                tactics.coverHold = nextPhase.elapsed;
              } else {
                tactics.coverHold = 0;
              }
              const nextGoal = tactics.coverPhase === "hide" ? tactics.cover.hide : tactics.cover.peek;
              const waypoint = this.navigateActor(actor, nextGoal.x, nextGoal.z, dt);
              tx = waypoint.x;
              tz = waypoint.z;
              canFire = tactics.coverPhase === "peek" &&
                Math.hypot(tactics.cover.peek.x - actor.x, tactics.cover.peek.z - actor.z) < 1.2;
            } else if (d > 16) {
              tx = victim.x;
              tz = victim.z;
            } else if (d < 7) {
              tx = actor.x - dx;
              tz = actor.z - dz;
            } else {
              tx = actor.x - dz;
              tz = actor.z + dx;
            }
          }
        } else if (mind.investigate) {
          actor.tactics = null;
          const actorId = this.pool.indexOf(actor);
          const goal = mind.state === "search"
            ? searchWaypoint(actor.knownX, actor.knownZ, mind.age, actorId)
            : { x: actor.knownX, z: actor.knownZ };
          const waypoint = this.navigateActor(actor, goal.x, goal.z, dt);
          tx = waypoint.x;
          tz = waypoint.z;
        } else {
          actor.navigation = null;
          actor.tactics = null;
          tx = actor.x + Math.sin(this.time * 0.4 + actor.x) * 6;
          tz = actor.z + Math.cos(this.time * 0.35 + actor.z) * 6;
        }
      }

      if (actor.lift > 0 && actor.team === "sec") {
        actor.lift = Math.max(0, actor.lift - dt);
        actor.y = Math.min(6.4, actor.y + 8 * dt);
        actor.group.position.set(actor.x, actor.y, actor.z);
        actor.group.rotation.z = Math.sin(this.time * 3 + actor.x) * 0.4;
        continue;
      }
      actor.group.rotation.z = 0;

      const speed =
        (actor.slow > 0 ? 2.3 : actor.squad ? 5.4 : 4.5) *
        (this.inUnravel(actor.x, actor.z) && actor.team !== "sec" ? 1.5 : 1) *
        dt;
      this.stepActor(actor, tx, tz, speed);
      actor.y = floorHeight(actor.x, actor.z, actor.y + 0.3, this.solids);
      if (target) this.face(actor, target.x, target.z);
      else this.face(actor, tx, tz);

      if (target && canFire && actor.down <= 0) {
        actor.cooldown -= dt;
        const dist = Math.hypot(target.x - actor.x, target.z - actor.z);
        const los = hasLos(actor.x, actor.z, target.x, target.z, this.solids);
        if (actor.cooldown <= 0 && los && dist < 36) {
          const panic = this.freedCount > 0 && actor.team === "sec";
          const haste = this.inUnravel(actor.x, actor.z) && actor.team !== "sec" ? 0.67 : 1;
          actor.cooldown = (panic ? 0.36 : actor.team === "sec" ? 0.7 : 0.38) * haste + Math.random() * 0.35;
          this.actorShoot(actor, target);
        }
      }
    }
    this.separate();
  }

  private navigateActor(actor: Actor, goalX: number, goalZ: number, dt: number): NavigationPoint {
    let route = actor.navigation;
    if (!route || Math.hypot(route.goalX - goalX, route.goalZ - goalZ) > 2.5) {
      route = {
        goalX,
        goalZ,
        points: findNavigationPath(
          actor.x,
          actor.z,
          goalX,
          goalZ,
          (x, z) => !movementBlocked(x, z, 0, this.solids),
          this.world.limit,
        ),
        index: 0,
        retryIn: 1.2,
      };
      actor.navigation = route;
    } else if (route.points === null) {
      route.retryIn -= dt;
      if (route.retryIn <= 0) {
        route.points = findNavigationPath(
          actor.x,
          actor.z,
          goalX,
          goalZ,
          (x, z) => !movementBlocked(x, z, 0, this.solids),
          this.world.limit,
        );
        route.index = 0;
        route.retryIn = 1.2;
      }
    }
    while (route.points && route.index < route.points.length) {
      const waypoint = route.points[route.index]!;
      if (Math.hypot(waypoint.x - actor.x, waypoint.z - actor.z) > 0.85) break;
      route.index++;
    }
    return route.points?.[route.index] ?? { x: actor.x, z: actor.z };
  }

  private playerVisible(actor: Actor) {
    const dx = this.x - actor.x;
    const dz = this.z - actor.z;
    const dist = Math.hypot(dx, dz);
    if (this.phaseT > 0 && dist > 4) return false;
    const vision = this.phaseT > 0 ? 4 : 28;
    return canPerceiveTarget(
      actor.yaw,
      dx,
      dz,
      vision,
      () => hasLos(actor.x, actor.z, this.x, this.z, this.solids),
    );
  }

  private nearest(actor: Actor, team: Team, radius: number) {
    let best: Actor | null = null;
    let bestD = radius;
    for (const other of this.pool) {
      if (!other.alive || other.team !== team || other.down > 0 || other === actor) continue;
      const d = Math.hypot(other.x - actor.x, other.z - actor.z);
      if (d < bestD) {
        bestD = d;
        best = other;
      }
    }
    return best ? { x: best.x, y: best.y + 1.1, z: best.z, actor: best } : null;
  }

  private nearestThreat(actor: Actor) {
    let best: { x: number; y: number; z: number; actor?: Actor; player?: boolean } | null = null;
    let bestD = 40;
    const list: { x: number; y: number; z: number; actor?: Actor; player?: boolean }[] = [];
    if (this.phaseT <= 0 && this.mode !== "dead") list.push({ x: this.x, y: this.y + this.eye * 0.6, z: this.z, player: true });
    for (const other of this.pool) {
      if (!other.alive || other.down > 0) continue;
      if (other.team === "sec") continue;
      if (other.squad && !other.deployed) continue;
      list.push({ x: other.x, y: other.y + 1.1, z: other.z, actor: other });
    }
    for (const item of list) {
      const d = Math.hypot(item.x - actor.x, item.z - actor.z);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  private stepActor(actor: Actor, tx: number, tz: number, step: number) {
    let dx = tx - actor.x;
    let dz = tz - actor.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.35) return;
    dx /= len;
    dz /= len;
    const nx = actor.x + dx * step;
    const nz = actor.z + dz * step;
    if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
    else if (!movementBlocked(actor.x - dz * step, actor.z + dx * step, actor.y, this.solids)) {
      actor.x += -dz * step;
      actor.z += dx * step;
      return;
    }
    if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
  }

  private face(actor: Actor, x: number, z: number) {
    const dx = x - actor.x;
    const dz = z - actor.z;
    if (Math.hypot(dx, dz) > 1e-5) actor.yaw = Math.atan2(-dx, -dz);
    actor.group.position.set(actor.x, actor.y, actor.z);
    actor.group.lookAt(x, actor.y + 1.2, z);
  }

  private separate() {
    const live = this.pool.filter((a) => a.alive && a.down <= 0 && (a.deployed || !a.squad));
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.8) {
          const push = (0.8 - d) * 0.5;
          a.x -= (dx / d) * push;
          a.z -= (dz / d) * push;
          b.x += (dx / d) * push;
          b.z += (dz / d) * push;
        }
      }
    }
  }

  private actorShoot(
    actor: Actor,
    target: { x: number; y: number; z: number; actor?: Actor; player?: boolean },
  ) {
    const ox = actor.x;
    const oy = actor.y + 1.5;
    const oz = actor.z;
    let dx = target.x - ox;
    let dy = target.y - oy;
    let dz = target.z - oz;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    const spread =
      (actor.team === "militia" ? 0.09 : actor.squad ? 0.045 : 0.04) / (actor.team === "sec" ? this.accuracyNow() : 1);
    dx += (Math.random() - 0.5) * spread;
    dy += (Math.random() - 0.5) * spread;
    dz += (Math.random() - 0.5) * spread;
    const n = Math.hypot(dx, dy, dz) || 1;
    dx /= n;
    dy /= n;
    dz /= n;
    let wallT = 70;
    for (const box of this.solids) {
      const t = rayBox(ox, oy, oz, dx, dy, dz, box, 70);
      if (t != null && t < wallT) wallT = t;
    }
    if (target.player) {
      const body = rayCylinder(ox, oy, oz, dx, dy, dz, this.x, this.z, 0.42, this.y, this.y + (this.crouchHeld ? 1.15 : 1.75), 70);
      if (body && body.t < wallT) {
        this.damagePlayer(actor.team === "militia" ? 0 : 8 + Math.random() * 4, actor.x, actor.z);
        this.tracer(ox, oy, oz, dx, dy, dz, body.t, 0xe24b4b);
        return;
      }
    } else if (target.actor) {
      const body = rayCylinder(ox, oy, oz, dx, dy, dz, target.actor.x, target.actor.z, 0.4, target.actor.y, target.actor.y + 1.6, 70);
      if (body && body.t < wallT) {
        if (actor.team !== "sec" && target.actor.team === "sec") {
          this.hurtActor(target.actor, actor.squad ? 12 : 8, false, false, false, false);
        } else if (actor.team === "sec" && target.actor.team !== "sec") {
          target.actor.hp -= 10;
          target.actor.hurt = 0.08;
          target.actor.aggro = 2;
          if (target.actor.hp <= 0) this.killActor(target.actor, false);
        }
      }
      this.tracer(ox, oy, oz, dx, dy, dz, body && body.t < wallT ? body.t : Math.min(wallT, len), actor.team === "sec" ? 0xe24b4b : 0x2ee0c8);
      return;
    }
    this.tracer(ox, oy, oz, dx, dy, dz, Math.min(wallT, len), actor.team === "sec" ? 0xe24b4b : 0x2ee0c8);
  }

  private updateVips(dt: number) {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    this.vips.forEach((vip, index) => {
      const pulse = vip.mesh.userData.pulse as THREE.MeshStandardMaterial[] | undefined;
      if (pulse) {
        const n = 0.45 + Math.abs(Math.sin(this.time * (vip.id === "ananda" ? 16 : 2.4))) * (vip.active ? 1.5 : 0.35);
        for (const mat of pulse) mat.emissiveIntensity = n;
      }
      if (!vip.active) {
        vip.mesh.position.set(vip.site.x, 0.1, vip.site.z);
        vip.mesh.visible = true;
        return;
      }
      if (vip.worn) {
        vip.mesh.visible = false;
        vip.x = this.x;
        vip.y = this.y;
        vip.z = this.z;
        return;
      }
      vip.mesh.visible = true;
      const side = index === 0 ? -1.6 : 1.6;
      const tx = this.x - fx * 3.4 + rx * side;
      const tz = this.z - fz * 3.4 + rz * side;
      const dx = tx - vip.x;
      const dz = tz - vip.z;
      const dist = Math.hypot(dx, dz);
      if (Math.hypot(vip.x - this.x, vip.z - this.z) > 22 || dist > 16) {
        vip.x = tx;
        vip.z = tz;
      } else if (dist > 0.45) {
        const step = Math.min(dist, (vip.id === "ananda" ? 7.2 : 5.2) * dt);
        const nx = vip.x + (dx / dist) * step;
        const nz = vip.z + (dz / dist) * step;
        if (!movementBlocked(nx, vip.z, vip.y, this.solids)) vip.x = nx;
        if (!movementBlocked(vip.x, nz, vip.y, this.solids)) vip.z = nz;
      }
      vip.y = floorHeight(vip.x, vip.z, vip.y + 0.4, this.solids);
      vip.mesh.position.set(vip.x, vip.y, vip.z);
      vip.cd -= dt;
      const foe = this.nearestPos(vip.x, vip.z, 16);
      if (foe) vip.mesh.lookAt(foe.x, vip.y + 1, foe.z);
      else vip.mesh.lookAt(this.x, vip.y + 1, this.z);
      if (vip.cd > 0 || !foe) return;
      const yaw = Math.atan2(-(foe.x - vip.x), -(foe.z - vip.z));
      if (vip.id === "ananda") {
        const dest = this.shiftPoint(vip.x, vip.z, yaw, 7);
        this.vacuum(vip.x, vip.z, 5.5);
        vip.x = dest.x;
        vip.z = dest.z;
        this.vacuum(vip.x, vip.z, 6.5);
        this.floater("SHIFT", vip.x, vip.y + 1.8, vip.z, "#2ee0c8");
        vip.cd = 8;
      } else {
        this.shatterPulse(vip.x, vip.z, yaw, false);
        vip.cd = 7;
      }
    });
  }

  private nearestPos(x: number, z: number, radius: number) {
    let best: { x: number; z: number } | null = null;
    let bestD = radius;
    for (const actor of this.pool) {
      if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
      const d = Math.hypot(actor.x - x, actor.z - z);
      if (d < bestD) {
        bestD = d;
        best = actor;
      }
    }
    return best;
  }

  private updateLoot(dt: number) {
    for (const loot of this.loots) {
      if (!loot.alive) continue;
      loot.spin += dt;
      loot.mesh.rotation.y = loot.spin;
      loot.mesh.position.y = Math.sin(this.time * 2 + loot.spin) * 0.06;
    }
  }

  private updateZone(dt: number) {
    const target = this.objectivePoint();
    const nextZone = advanceSafeZoneCenter(
      { x: this.zoneX, z: this.zoneZ },
      { x: target.x, z: target.z },
      { x: this.vx, z: this.vz },
      dt,
    );
    this.zoneX = nextZone.x;
    this.zoneZ = nextZone.z;
    const elapsedSinceLanding = this.time - this.landTime;
    if (shouldCollapseSafeZone(this.landed, this.beaconDone, elapsedSinceLanding)) {
      this.zoneR = Math.max(20, this.zoneR - 3.6 * dt);
    }
    const dist = Math.hypot(this.x - this.zoneX, this.z - this.zoneZ);
    this.outside = dist - this.zoneR;
    if (this.outside > 0 && (this.mode === "ground" || this.mode === "drop")) {
      this.damagePlayer(5 * dt, undefined, undefined, true);
      this.zoneTick -= dt;
      if (this.zoneTick <= 0) {
        this.audio.zone();
        this.zoneTick = 0.75;
      }
    }
    if (this.mode === "ground") {
      for (const actor of this.pool) {
        if (!actor.alive || actor.down > 0) continue;
        if (actor.squad && !actor.deployed) continue;
        if (Math.hypot(actor.x - this.zoneX, actor.z - this.zoneZ) <= this.zoneR) continue;
        actor.hp -= 5 * dt;
        if (actor.hp <= 0) this.killActor(actor, false);
      }
    }
    this.drawZone();
  }

  private drawZone() {
    const attr = this.zoneLine.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      attr.setXYZ(i, this.zoneX + Math.cos(a) * this.zoneR, 1.4, this.zoneZ + Math.sin(a) * this.zoneR);
    }
    attr.needsUpdate = true;
    const mat = this.zoneLine.material as THREE.LineBasicMaterial;
    mat.color.setHex(this.outside > 0 ? 0xe24b4b : 0xd4a24a);
  }

  private objectivePoint() {
    const alpha = this.world.sites[0]!;
    const omega = this.world.sites[1]!;
    if (!alpha.freed) return { x: alpha.x, z: alpha.z + 18, label: "CRADLE ALPHA" };
    if (!omega.freed) return { x: omega.x, z: omega.z - 18, label: "CRADLE OMEGA" };
    if (!this.beaconDone) return { x: this.world.beacon.x, z: this.world.beacon.z, label: "BEACON" };
    return { x: this.world.extract.x, z: this.world.extract.z, label: "EXTRACT" };
  }

  private objectives(dt: number) {
    this.prompt = "";
    const alpha = this.world.sites[0]!;
    const omega = this.world.sites[1]!;
    const interact = this.held("KeyE") || this.virtual.interact;
    const interactEdge = this.risingInteract();

    for (const loot of this.loots) {
      if (!loot.alive) continue;
      if (Math.hypot(loot.x - this.x, loot.z - this.z) < 2.15) {
        const name =
          loot.label ??
          (loot.kind === "weapon"
            ? WEAPONS[loot.weaponId ?? "rifle"].name
            : loot.kind === "ammo"
              ? "AMMO"
              : loot.kind === "med"
                ? "MEDKIT"
                : loot.kind === "mod"
                  ? "MOD"
                  : loot.kind === "intel"
                    ? "INTEL"
                    : "PLATE");
        this.prompt = `E  TAKE ${name}`;
        if (interactEdge) this.takeLoot(loot);
        break;
      }
    }

    for (const site of this.world.sites) {
      if (site.freed) continue;
      const dist = Math.hypot(site.x - this.x, site.z - this.z);
      const inside =
        this.x > site.minX && this.x < site.maxX && this.z > site.minZ && this.z < site.maxZ;
      const doorDist = Math.hypot((site.door.minX + site.door.maxX) / 2 - this.x, (site.door.minZ + site.door.maxZ) / 2 - this.z);
      if (!site.door.alive && dist < 2.5) {
        this.prompt = `E  FREE THE ${site.lineage.toUpperCase()}`;
        if (interactEdge) this.freeSite(site);
      } else if (inside && dist < 2.6) {
        this.prompt = `E  FREE THE ${site.lineage.toUpperCase()}`;
        if (interactEdge) this.freeSite(site);
      } else if (site.door.alive && doorDist < 2.4) {
        this.prompt = this.op === "khensu" ? "Q  THERMITE THE GATE" : "SHOOT THE GATE";
      }
    }

    if (!this.prompt) {
      for (const term of this.terminals) {
        if (term.open) continue;
        if (Math.hypot(term.x - this.x, term.z - this.z) >= 2.4) continue;
        this.prompt = "E  CRACK TERMINAL";
        if (interactEdge) this.openTerminal(term);
        break;
      }
    }

    if (alpha.freed && omega.freed && !this.beaconDone) {
      const d = Math.hypot(this.world.beacon.x - this.x, this.world.beacon.z - this.z);
      if (d < 3.1) {
        this.prompt = "HOLD E  RAISE THE BEACON";
        if (interact) {
          this.channel += dt;
          if (!this.beaconWave && this.channel > 1) {
            this.beaconWave = true;
            this.spawnWave(5, { x: 0, z: 0 });
            this.say("TACTICAL", "Eon Dusk counter-push. Hold the beacon.");
          }
          if (this.channel >= 4.6) {
            this.beaconDone = true;
            this.channel = 0;
            this.say("ACCORD", "Beacon live. Nod has the signal. Eon Dusk is locking down the district — reach extraction.");
            this.toastMsg = "Eon Dusk is inbound. Run.";
            this.toastT = 3;
            this.spawnWave(4, this.world.extract);
          }
        } else this.channel = Math.max(0, this.channel - dt * 1.5);
      } else this.channel = Math.max(0, this.channel - dt);
    }

    if (this.beaconDone && this.mode === "ground") {
      const d = Math.hypot(this.world.extract.x - this.x, this.world.extract.z - this.z);
      if (d < 6.4) {
        this.extractT += dt;
        this.prompt = `RECOVERY LOCK ${Math.min(100, Math.round((this.extractT / 6) * 100))}%`;
        if (this.extractT >= 6) this.win();
      } else this.extractT = Math.max(0, this.extractT - dt * 0.8);
    }

    if (!this.prompt && this.mode === "ground" && (alpha.freed || omega.freed)) {
      this.prompt = this.worn ? `B  LEAVE ${OPERATOR_BY_ID[this.worn].name.toUpperCase()}` : "B  WEAR THE BLOODLINE";
    }
  }

  private openTerminal(term: { id: string; x: number; z: number; mesh: THREE.Group; open: boolean }) {
    const handlers = this.serverGameplayHandlers;
    if (this.serverGameplayActive) {
      if (!handlers || this.pendingServerInteractions.has(term.id)) return;
      const generation = this.serverGameplayGeneration;
      this.pendingServerInteractions.add(term.id);
      this.toastMsg = "REQUESTING SERVER CACHE…";
      this.toastT = 2.2;
      void handlers.openTerminal(term.id)
        .then((state) => {
          if (generation !== this.serverGameplayGeneration || !this.serverGameplayActive) return;
          this.applyServerGameplayState(state);
          this.audio.breach();
          this.toastMsg = "SERVER CACHE OPEN · CLAIM DROPS TO ADD THEM";
          this.toastT = 2.6;
        })
        .catch((error: unknown) => {
          if (generation !== this.serverGameplayGeneration || !this.serverGameplayActive) return;
          this.toastMsg = error instanceof Error ? error.message : "Terminal request failed.";
          this.toastT = 3;
        })
        .finally(() => {
          if (generation === this.serverGameplayGeneration) {
            this.pendingServerInteractions.delete(term.id);
          }
        });
      return;
    }

    term.open = true;
    term.mesh.visible = false;
    const uprising =
      this.phase === "ESCORT_UPRISING" || this.phase === "EXTRACTION" || this.world.sites.some((site) => site.freed);
    const progress = Math.min(1, Math.max(0, (176 - this.zoneR) / (176 - 20)));
    const danger =
      (this.phase === "EXTRACTION" ? 4.2 : this.phase === "ESCORT_UPRISING" ? 3.4 : this.phase === "BREACH" ? 2.2 : 1.2) +
      this.stress * 1.5;
    const ids = generateContainerDropArray(
      { sectorTier: sectorTier(term.x, term.z), uprisingActive: uprising, localDangerFactor: danger },
      progress,
    );
    const names: string[] = [];
    ids.forEach((id, index) => {
      const drop = resolveExtractionDrop(id);
      if (!drop) return;
      const ang = (index / Math.max(1, ids.length)) * Math.PI * 2;
      this.makeLoot({ ...drop, x: term.x + Math.cos(ang) * 1.35, z: term.z + Math.sin(ang) * 1.35 }, true);
      names.push(drop.label);
    });
    this.toastMsg = names.join("  ·  ");
    this.toastT = 2.6;
    this.audio.breach();
  }

  private interactPrev = false;
  private risingInteract() {
    const down = this.held("KeyE") || this.virtual.interact;
    const edge = down && !this.interactPrev;
    this.interactPrev = down;
    return edge;
  }

  private takeLoot(loot: Loot) {
    if (this.serverGameplayActive) {
      const handlers = this.serverGameplayHandlers;
      if (!loot.serverId || !handlers) {
        this.toastMsg = "Server loot is not synchronized. Keep the item and try again.";
        this.toastT = 2.6;
        return;
      }
      if (this.pendingServerInteractions.has(loot.serverId)) return;
      const generation = this.serverGameplayGeneration;
      this.pendingServerInteractions.add(loot.serverId);
      this.toastMsg = "VERIFYING SERVER CLAIM…";
      this.toastT = 2.2;
      void handlers.claimLoot(loot.serverId)
        .then((result) => {
          if (generation !== this.serverGameplayGeneration || !this.serverGameplayActive) return;
          handlers.inventoryChanged(result.inventory);
          this.applyLoot({
            ...loot,
            kind: result.item.kind,
            label: result.item.label,
            scrap: result.item.scrap,
            ...(result.item.weaponId ? { weaponId: result.item.weaponId as WeaponId } : { weaponId: undefined }),
            ...(result.item.modId ? { modId: result.item.modId } : { modId: undefined }),
          });
        })
        .catch((error: unknown) => {
          if (generation !== this.serverGameplayGeneration || !this.serverGameplayActive) return;
          this.toastMsg = error instanceof Error ? error.message : "Loot claim failed.";
          this.toastT = 3;
        })
        .finally(() => {
          if (generation === this.serverGameplayGeneration) {
            this.pendingServerInteractions.delete(loot.serverId!);
          }
        });
      return;
    }

    this.applyLoot(loot);
  }

  private applyLoot(loot: Loot) {
    if (loot.kind === "mod" && loot.modId) {
      const attachment = ATTACHMENT_BY_ID[loot.modId];
      const slot = this.slots[this.slot];
      const parsed = attachment ? readAttachment(attachment) : null;
      if (!parsed || !slot) {
        this.toastMsg = "Mod rejected. The seal did not take.";
        this.toastT = 1.6;
        return;
      }
      if (parsed.compatibleClass !== "ALL" && parsed.compatibleClass !== weaponClass(slot.id)) {
        this.toastMsg = `${attachment?.name ?? "That mod"} will not seat on this gun.`;
        this.toastT = 1.6;
        return;
      }
      slot.mods = [...slot.mods.filter((id) => ATTACHMENT_BY_ID[id]?.slot !== parsed.slot), parsed.attachmentId];
      this.sealLoadout();
      this.noteRecovered(parsed.attachmentId, loot.x, loot.z);
    }
    loot.alive = false;
    loot.mesh.visible = false;
    this.audio.pickup();
    if (loot.scrap) this.haul += loot.scrap;
    if (loot.kind === "med") this.hp = Math.min(100, this.hp + (loot.label === "NANITE SWARM" ? 55 : 45));
    else if (loot.kind === "armor") this.armor = Math.min(80, this.armor + (loot.label === "EMP INVERTER" ? 50 : 30));
    else if (loot.kind === "ammo") {
      const slot = this.slots[this.slot];
      if (slot) slot.reserve += WEAPONS[slot.id].mag;
    } else if (loot.kind === "mod") {
      this.toastMsg = loot.scrap ? `${loot.label}  +${loot.scrap}` : (loot.label ?? "MOD SEATED");
      this.toastT = 1.8;
    } else if (loot.kind === "intel") {
      this.toastMsg = loot.scrap ? `${loot.label}  +${loot.scrap} SCRAP` : (loot.label ?? "INTEL");
      this.toastT = 2.4;
      this.say("TACTICAL", "That file leaves with you. Die and the haul stays in Nod.");
      const intelId = registryForLabel(loot.label);
      if (intelId) this.noteRecovered(intelId, loot.x, loot.z);
    } else if (loot.weaponId) {
      const id = loot.weaponId;
      const owned = this.slots.find((s) => s.id === id);
      if (owned) owned.reserve += WEAPONS[id].mag * 2;
      else {
        this.slots[0] = { id, mag: WEAPONS[id].mag, reserve: WEAPONS[id].mag * 2, mods: [] };
        this.slot = 0;
        this.sealLoadout();
        this.weaponCycles.right.cancelReload();
        this.reloadSequence = null;
        this.handRecoil.right = 0;
      }
      if (loot.scrap) {
        this.toastMsg = `${loot.label}  +${loot.scrap}`;
        this.toastT = 1.8;
      }
      const weaponRegistry = registryForLabel(loot.label) ?? registryForWeaponId(id, loot.label);
      if (weaponRegistry) this.noteRecovered(weaponRegistry, loot.x, loot.z);
    }
  }

  private freeSite(site: Site) {
    if (site.freed) return;
    site.freed = true;
    this.freedCount += 1;
    const vip = this.vips.find((v) => v.site === site);
    if (vip) {
      vip.active = true;
      vip.x = site.x;
      vip.z = site.z;
      vip.worn = this.worn === vip.id;
    }
    this.audio.pickup();
    const who = site.id === "alpha" ? "Ananda" : "Nefret";
    if (this.freedCount === 1) {
      this.say(who.toUpperCase(), site.id === "alpha" ? "The dampeners just failed. I am not staying in this room." : "Get the guns off my light.");
      this.say("CIVNET", `${who} is loose. Eon Dusk's grid is in panic. The blocks are arming.`);
      this.say("TACTICAL", "They fight with you. Press B to wear the bloodline. It is not Accord doctrine.");
      this.spawnMilitia(site.x + 6, site.z + 4);
      this.spawnMilitia(site.x - 5, site.z + 2);
      this.spawnMilitia(this.x + 3, this.z - 4);
      this.spawnMilitia(site.x + 2, site.z - 8);
      this.spawnWave(6, { x: site.x, z: site.z });
    } else {
      this.say(who.toUpperCase(), site.id === "alpha" ? "Both of us. Now the street has to choose." : "Open a road. I will burn what is left of the gate.");
      this.say("ACCORD", "Both bloodlines are walking. Raise the beacon. Keep them inside the zone until the pad.");
      this.spawnMilitia(site.x + 4, site.z);
      this.spawnMilitia(site.x - 4, site.z);
      this.spawnWave(5, { x: 0, z: 0 });
    }
    this.floater("FREED", site.x, 2.2, site.z, "#e8e4d8");
  }

  private win() {
    if (this.mode === "win") return;
    this.mode = "win";
    this.fireHeld = false;
    this.fireLeftHeld = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.say("ACCORD", "Lineages secured. The resistance remains on Earth. You are going home.");
    this.hooks.onEvent({
      type: "win",
      time: this.missionClock,
      kills: this.kills,
      op: this.hostOp,
      scrap: this.haul,
      manifest: this.extractionManifest(),
    });
  }

  private noteRecovered(itemRegistryId: string, x: number, z: number) {
    this.recovered.push({ itemRegistryId, sectorTier: sectorTier(x, z) });
  }

  private extractionManifest(): ExtractedPiece[] {
    const carried = this.worn ? [...this.slots, ...this.accordSlots] : this.slots;
    const seated = new Set(carried.flatMap((slot) => slot.mods));
    const out: ExtractedPiece[] = [];
    for (const id of seated) {
      const found = this.recovered.find((row) => row.itemRegistryId === id);
      if (found) out.push(found);
    }
    const seen = new Set<string>();
    for (const row of this.recovered) {
      if (row.itemRegistryId.startsWith("att_")) continue;
      if (seen.has(row.itemRegistryId)) continue;
      if (row.itemRegistryId.startsWith("wep_")) {
        const weaponId = weaponIdForRegistry(row.itemRegistryId);
        if (!weaponId || !carried.some((slot) => slot.id === weaponId)) continue;
      }
      seen.add(row.itemRegistryId);
      out.push(row);
    }
    return out;
  }

  private die() {
    if (this.mode === "dead" || this.mode === "win") return;
    this.mode = "dead";
    this.hp = 0;
    this.fireHeld = false;
    this.fireLeftHeld = false;
    this.haul = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    this.hooks.onEvent({ type: "dead" });
  }

  private damagePlayer(amount: number, fromX?: number, fromZ?: number, environmental = false) {
    if (amount <= 0 || this.invuln > 0 || this.mode === "dead" || this.mode === "win" || this.mode === "attract") return;
    const env = environmental || fromX == null;
    if (this.op === "nefret" && env) this.solar = Math.min(100, this.solar + amount * 1.45);
    let dmg = amount;
    if (this.shieldT > 0 && fromX != null && fromZ != null) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const dx = fromX - this.x;
      const dz = fromZ - this.z;
      const len = Math.hypot(dx, dz) || 1;
      if ((fx * dx + fz * dz) / len > 0.15) dmg = 0;
    }
    if (dmg <= 0) return;
    this.combatFeedback.markDamage(
      fromX == null || fromZ == null
        ? null
        : damageDirection(this.x, this.z, this.yaw, fromX, fromZ),
    );
    if (this.armor > 0) {
      const soak = Math.min(this.armor, dmg * 0.65);
      this.armor -= soak;
      dmg -= soak;
    }
    if (this.hp - dmg <= 0 && this.anchorT > 0 && this.anchor) {
      this.hp = 50;
      this.x = this.anchor.x;
      this.y = this.anchor.y;
      this.z = this.anchor.z;
      this.vx = 0;
      this.vz = 0;
      this.vy = 0;
      this.anchorT = 0;
      this.invuln = 1.5;
      this.floater("REWOUND", this.x, this.y + 2, this.z, "#2ee0c8");
      this.audio.ui();
      return;
    }
    this.hp -= dmg;
    this.hurtFlash = 1;
    if (this.op !== "khensu" && !this.gunStats().perks.has("FLINCH_IMMUNITY")) this.shake = Math.min(1, this.shake + 0.4);
    if (dmg > 0.4) this.audio.hurt();
    if (this.hp <= 0) this.die();
  }

  private noiseRadius() {
    if (this.op === "ananda") return 0;
    const speed = Math.hypot(this.vx, this.vz);
    if (this.shotEcho > 0) return this.gunStats().perks.has("ACOUSTIC_STEALTH_MASK") ? this.gunStats().soundRadius : 36;
    if (this.slideT > 0) return 20;
    if (this.crouchHeld && speed > 0.3) return 7;
    if (speed > 7) return 26;
    if (speed > 0.4) return 14;
    return 3.5;
  }

  private director(dt: number) {
    this.directorAcc += dt;
    if (this.directorAcc < 1 || this.mode !== "ground") return;
    this.directorAcc = 0;
    const near = this.pool.filter(
      (a) => a.alive && a.team === "sec" && a.down <= 0 && Math.hypot(a.x - this.x, a.z - this.z) < 16,
    ).length;
    const slot = this.slots[this.slot];
    const ammoR = slot ? (slot.mag + slot.reserve) / 80 : 1;
    this.pressure = clamp((1 - this.hp / 100) * 0.55 + (ammoR < 0.22 ? 0.28 : 0) + near * 0.09, 0, 1);
    const nearGate = this.world.sites.some(
      (site) => !site.freed && Math.hypot(site.x - this.x, site.z - this.z) < 22,
    );
    const paced = paceMission({
      freed: this.freedCount,
      beacon: this.beaconDone,
      nearGate,
      hp: this.hp,
      stress: this.stress,
    });
    this.stress = paced.stress;
    this.phase = paced.phase;
    this.panic = paced.panic;
    this.audio.setPressure(this.pressure * (this.outside > 0 ? 1 : 0.7) + (this.beaconDone ? 0.2 : 0) + this.stress * 0.15);
    const meds = this.loots.filter((l) => l.alive && l.kind === "med").length;
    if (this.pressure > 0.72 && meds < 2 && this.sinceAid > 20) {
      this.dropSupply("med");
      this.sinceAid = 0;
    }
    if (this.pressure < 0.25 && this.aliveSec() < 5 && this.sincePush > 16 && this.time > this.landTime + 22) {
      this.spawnWave(2);
      this.sincePush = 0;
    }
  }

  private dropSupply(kind: "med" | "ammo") {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const x = this.x + Math.cos(ang) * (5 + Math.random() * 6);
      const z = this.z + Math.sin(ang) * (5 + Math.random() * 6);
      if (movementBlocked(x, z, 0, this.solids)) continue;
      this.makeLoot({ kind, x, z }, true);
      this.toastMsg = kind === "med" ? "A medkit skids into the street." : "Ammo on the ground.";
      this.toastT = 1.8;
      return;
    }
  }

  private say(speaker: string, text: string) {
    this.lines.push({ speaker, text, t: 3.15 });
  }

  private tickLines(dt: number) {
    if (!this.line) {
      this.line = this.lines.shift() ?? null;
      return;
    }
    this.line.t -= dt;
    if (this.line.t <= 0) this.line = null;
  }

  private footprintsUpdate(dt: number) {
    const track = this.aiming && this.gunStats().perks.has("TRACK_TRAIL_VISIBILITY");
    if ((this.op !== "jaya" && !track) || this.mode === "attract") {
      this.footPts.visible = false;
      return;
    }
    this.footPts.visible = true;
    this.footAcc += dt;
    if (this.footAcc > 0.35) {
      this.footAcc = 0;
      for (const actor of this.pool) {
        if (!actor.alive || actor.team !== "sec") continue;
        this.footprints.push({ x: actor.x, y: actor.y + 0.08, z: actor.z, age: 0 });
      }
    }
    const pos = this.footGeo.getAttribute("position") as THREE.BufferAttribute;
    const col = this.footGeo.getAttribute("color") as THREE.BufferAttribute;
    let n = 0;
    this.footprints = this.footprints.filter((f) => {
      f.age += dt;
      return f.age < 15;
    });
    for (const f of this.footprints) {
      if (n >= 180) break;
      pos.setXYZ(n, f.x, f.y, f.z);
      const fade = 1 - f.age / 15;
      col.setXYZ(n, 0.18 * fade, 0.88 * fade, 0.78 * fade);
      n++;
    }
    for (let i = n; i < 180; i++) pos.setXYZ(i, 0, -20, 0);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private decayJuice(dt: number) {
    this.shake = this.reduce ? 0 : this.shake * Math.exp(-6 * dt);
    this.kick *= Math.exp(-14 * dt);
    this.handRecoil.right *= Math.exp(-8 * dt);
    this.handRecoil.left *= Math.exp(-8 * dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    this.solarFlash = Math.max(0, this.solarFlash - dt * 0.85);
    this.combatFeedback.update(dt);
    this.toastT = Math.max(0, this.toastT - dt);
    for (const item of this.feed) item.t -= dt;
    this.feed = this.feed.filter((item) => item.t > 0);
    for (const floater of this.floaters) floater.life -= dt;
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const spark of this.sparks) {
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.mesh.position.x += spark.vx * dt;
      spark.mesh.position.y += spark.vy * dt;
      spark.mesh.position.z += spark.vz * dt;
      spark.vy -= 8 * dt;
      spark.mesh.visible = spark.life > 0;
    }
    for (const chip of this.rubble) {
      if (chip.life <= 0) continue;
      chip.life -= dt;
      chip.mesh.position.x += chip.vx * dt;
      chip.mesh.position.y += chip.vy * dt;
      chip.mesh.position.z += chip.vz * dt;
      chip.vy -= 14 * dt;
      chip.mesh.visible = chip.life > 0;
    }
    for (const tracer of this.tracers) {
      if (tracer.life <= 0) continue;
      tracer.life -= dt;
      tracer.line.visible = tracer.life > 0;
    }
    for (const hand of ["right", "left"] as const) {
      const mesh = this.handGuns[hand].get(this.weaponForHand(hand).id);
      const muzzle = mesh?.userData.muzzle as THREE.Mesh | undefined;
      const cycle = this.weaponCycles[hand];
      if (
        muzzle &&
        this.time > cycle.nextShotAt - 60 / this.weaponForHand(hand).rpm + 0.045
      ) {
        muzzle.visible = false;
      }
    }
  }

  private floater(text: string, x: number, y: number, z: number, color: string) {
    this.floaters.push({ text, x, y, z, life: 0.85, color });
    if (this.floaters.length > 8) this.floaters.shift();
  }

  private tracer(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number, color: number) {
    const slot = this.tracers.find((tr) => tr.life <= 0) ?? this.tracers[0]!;
    slot.life = 0.06;
    slot.line.visible = true;
    (slot.line.material as THREE.LineBasicMaterial).color.setHex(color);
    const attr = slot.line.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, ox, oy, oz);
    attr.setXYZ(1, ox + dx * t, oy + dy * t, oz + dz * t);
    attr.needsUpdate = true;
  }

  private spark(x: number, y: number, z: number) {
    const spark = this.sparks.find((s) => s.life <= 0);
    if (!spark) return;
    spark.life = 0.25;
    spark.mesh.visible = true;
    spark.mesh.position.set(x, y, z);
    spark.vx = (Math.random() - 0.5) * 3;
    spark.vy = 2 + Math.random() * 2;
    spark.vz = (Math.random() - 0.5) * 3;
  }

  private ambience(dt: number, x: number, y: number, z: number) {
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.flash = 1;
      this.nextBolt = 7 + Math.random() * 10;
    }
    this.flash = Math.max(0, this.flash - dt * 6);
    this.skyMat.uniforms.flash!.value = this.flash * 0.65;
    const attr = this.rainGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < this.rain.length; i++) {
      const drop = this.rain[i]!;
      drop.y -= 32 * dt;
      if (drop.y < -2) drop.y = 24;
      const wx = x + drop.x;
      const wz = z + drop.z;
      const wy = y + drop.y - 8;
      attr.setXYZ(i * 2, wx, wy, wz);
      attr.setXYZ(i * 2 + 1, wx + 0.15, wy - 1.15, wz + 0.05);
    }
    attr.needsUpdate = true;
    if (this.mode === "drop" && this.dropAge < 5) {
      this.ship.visible = true;
      this.ship.position.set(this.x + 4, this.y + 2, this.z - 18 - this.dropAge * 26);
      this.ship.lookAt(this.x, this.y - 10, this.z - 40);
    } else if (this.mode !== "attract") this.ship.visible = false;

    const p = this.mode === "attract" ? { x: 80, z: -80 } : this.objectivePoint();
    this.beam.position.set(p.x, 18, p.z);
    (this.beam.material as THREE.MeshBasicMaterial).color.setHex(this.beaconDone ? 0xd4a24a : 0x2ee0c8);

    if (this.orbitalVfx > 0) {
      this.orbitalVfx = Math.max(0, this.orbitalVfx - dt);
      const frames = (1.5 - this.orbitalVfx) * 60;
      const intensity = 28 * Math.pow(0.92, frames);
      this.orbitalLight.intensity = intensity;
      const fade = this.orbitalVfx / 1.5;
      (this.orbitalBeam.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
      (this.orbitalHalo.material as THREE.MeshBasicMaterial).opacity = 0.28 * fade;
      if (this.orbitalVfx <= 0) {
        this.orbitalBeam.visible = false;
        this.orbitalHalo.visible = false;
        this.orbitalLight.visible = false;
        this.orbitalLight.intensity = 0;
      }
    }

    this.portalMeshA.visible = !!this.portalA;
    this.portalMeshB.visible = !!this.portalB && this.portalT > 0;
    if (this.portalA) this.portalMeshA.position.set(this.portalA.x, 1.2, this.portalA.z);
    if (this.portalB) this.portalMeshB.position.set(this.portalB.x, 1.2, this.portalB.z);
    this.portalMeshA.rotation.y += dt;
    this.portalMeshB.rotation.y -= dt;
    this.voidMesh.visible = this.voidT > 0;
    this.voidMesh.position.set(this.voidX, 0.2, this.voidZ);
    this.unravelMesh.visible = this.unravelT > 0;
    if (this.unravelT > 0) {
      this.unravelMesh.position.set(this.unravelX, 2.2, this.unravelZ);
      this.unravelMesh.scale.setScalar(this.unravelR);
      this.unravelMesh.rotation.y += dt * 0.4;
    }
    this.anchorMesh.visible = this.anchorT > 0 && !!this.anchor;
    if (this.anchor) this.anchorMesh.position.set(this.anchor.x, this.anchor.y + 0.06, this.anchor.z);
    this.shieldMesh.visible = this.shieldT > 0;
    if (this.shieldT > 0) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      this.shieldMesh.position.set(this.x + fx * 1.35, this.y + 1.25, this.z + fz * 1.35);
      this.shieldMesh.lookAt(this.x + fx * 4, this.y + 1.25, this.z + fz * 4);
    }
    this.sun.position.set(x + 26, 48, z + 14);
    this.sun.target.position.set(x, 0, z);
    this.sun.target.updateMatrixWorld();
  }

  private posePlayer() {
    const bob =
      !this.reduce && this.grounded && this.mode === "ground"
        ? Math.sin(this.bobPhase) * 0.03 * (this.crouchHeld ? 0.35 : 1) * (this.aiming ? 0.2 : 1)
        : 0;
    if (this.grounded) this.bobPhase += Math.hypot(this.vx, this.vz) * 0.16;
    const shake = this.op === "khensu" ? this.shake * 0.15 : this.shake;
    this.euler.set(
      this.pitch + this.handRecoil.right + this.handRecoil.left,
      this.yaw,
      0,
      "YXZ",
    );
    this.camera.quaternion.setFromEuler(this.euler);
    this.camera.position.set(
      this.x + (Math.random() - 0.5) * shake * 0.06,
      this.y + this.eye + bob + (Math.random() - 0.5) * shake * 0.05,
      this.z,
    );
    const fov = this.aiming ? 68 : 78;
    this.camera.fov += (fov - this.camera.fov) * 0.18;
    this.camera.updateProjectionMatrix();
    this.viewCam.fov = this.camera.fov;
    this.viewCam.aspect = this.camera.aspect;
    this.viewCam.updateProjectionMatrix();

    const ads = this.aiming ? 1 : 0;
    for (const hand of ["right", "left"] as const) {
      const id = this.weaponForHand(hand).id;
      for (const [key, mesh] of this.handGuns[hand]) {
        mesh.visible = key === id && this.mode !== "attract";
      }
      const active = this.handGuns[hand].get(id);
      if (active) {
        const side = hand === "right" ? 1 : -1;
        active.position.x = side * (this.aiming ? 0.17 : 0.23) + this.swayX * 0.35;
        active.position.z = -Math.min(0.12, this.handRecoil[hand] * 0.8);
        active.rotation.x = this.handRecoil[hand] * 1.2;
      }
    }
    this.swayX += (this.mouseDX * 0.0012 - this.swayX) * 0.18;
    this.swayY += (this.mouseDY * 0.0012 - this.swayY) * 0.18;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.viewRig.position.set(
      this.swayX * 0.4,
      -0.24 * (1 - ads) - 0.16 * ads + this.swayY - bob * 0.4,
      -0.5 + this.kick,
    );
    for (const hand of ["right", "left"] as const) {
      const held = this.handGuns[hand].get(this.weaponForHand(hand).id);
      const kit = held?.userData.kit as Record<string, THREE.Mesh> | undefined;
      if (kit) {
        const beam = this.orbitalVfx / 1.5;
        for (const mesh of Object.values(kit)) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const baseI = (mesh.userData.baseEmit as number) ?? 0;
          const baseColor = (mesh.userData.baseColor as number) ?? mat.color.getHex();
          const solar = mesh.userData.solar === true;
          const spec = beam * (0.04 + 0.96 * mat.metalness) * (1 - mat.roughness * 0.85);
          mat.emissiveIntensity = baseI + (solar ? beam * 2.4 : spec * 5);
          mat.emissive.setHex(!solar && beam > 0.05 && mat.metalness > 0.45 ? 0xf2c56e : baseColor);
        }
      }
    }
  }

  private render() {
    this.skyMat.uniforms.uTime!.value = this.time;
    (this.cityAsh.material as THREE.ShaderMaterial).uniforms.uTime!.value = this.time;
    this.postProcessing.setViewModelEnabled(this.mode !== "attract");
    this.postProcessing.render();
    this.drawMap();
  }

  private resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.viewW = w;
    this.viewH = h;
    this.renderer.setSize(w, h, false);
    this.postProcessing.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private el(id: string) {
    return this.hud?.querySelector("#" + id) as HTMLElement | null;
  }

  private writeHud() {
    if (!this.hud) return;
    const stats = this.gunStats();
    const op = OPERATOR_BY_ID[this.op];
    const obj = this.objectivePoint();
    const dist = Math.hypot(obj.x - this.x, obj.z - this.z);
    const set = (id: string, text: string) => {
      const node = this.el(id);
      if (node && node.textContent !== text) node.textContent = text;
    };
    set("mte-hp-num", `${Math.max(0, Math.ceil(this.hp))}`);
    const hp = this.el("mte-hp");
    if (hp) hp.style.width = `${clamp(this.hp, 0, 100)}%`;
    const ar = this.el("mte-ar");
    if (ar) ar.style.width = `${clamp(this.armor, 0, 80) / 80 * 100}%`;
    const rightWeapon = this.weaponForHand("right");
    const leftWeapon = this.weaponForHand("left");
    set("mte-weapon", `R · ${rightWeapon.name}    L · ${leftWeapon.name}`);
    let reloading = false;
    for (const hand of ["right", "left"] as const) {
      const slot = this.slotForHand(hand);
      const cycle = this.weaponCycles[hand];
      const reloadPercent = Math.round(cycle.reloadProgress * 100);
      set(`mte-mag-${hand}`, cycle.isReloading ? "···" : `${slot?.mag ?? 0}`);
      set(`mte-res-${hand}`, `${slot?.reserve ?? 0}`);
      const reloadWrap = this.el(`mte-reload-${hand}-wrap`);
      if (reloadWrap) reloadWrap.style.display = cycle.isReloading ? "block" : "none";
      const reloadProgress = this.el(`mte-reload-${hand}-progress`);
      if (reloadProgress) reloadProgress.setAttribute("aria-valuenow", String(reloadPercent));
      const reloadFill = this.el(`mte-reload-${hand}-fill`);
      if (reloadFill) reloadFill.style.width = `${reloadPercent}%`;
      set(`mte-reload-${hand}-pct`, `${reloadPercent}%`);
      reloading ||= cycle.isReloading;
    }
    const reloadWrap = this.el("mte-reload-wrap");
    if (reloadWrap) reloadWrap.style.display = reloading ? "grid" : "none";
    const act =
      this.mode === "drop"
        ? "DESCENT"
        : this.phase === "BREACH"
          ? "BREACH"
          : this.phase === "ESCORT_UPRISING"
            ? "ESCORT · UPRISING"
            : this.phase === "EXTRACTION"
              ? "EXTRACTION"
              : "INFILTRATION";
    set("mte-act", act);
    set("mte-obj", this.mode === "drop" ? "STEER THE CHUTE" : obj.label);
    set(
      "mte-obj-sub",
      this.mode === "drop"
        ? this.touch
          ? "Steer toward the landing marker with the left stick. Dive to drop faster; flare to slow down."
          : "WASD steers toward the landing marker. Shift dives; Space flares to slow your descent."
        : this.mode === "ground" && !this.world.sites[0]!.freed
          ? "Breach the gate or drop into the courtyard."
          : this.beaconDone
            ? "Stand on the recovery pad. Keep both bloodlines inside the ring."
            : this.worn
              ? `${OPERATOR_BY_ID[this.worn].name} is unstable. Q and F are not Accord doctrine.`
              : "B wears a freed bloodline. Their kits do not behave.",
    );
    const objectiveName = obj.label.startsWith("CRADLE ") ? "GATE" : obj.label;
    const targetName = this.mode === "drop" ? "LANDING" : objectiveName;
    const direction = relativeTargetDirection(this.x, this.z, obj.x, obj.z, this.yaw);
    set("mte-dist", `${targetName} ${Math.round(dist)} m`);
    set("mte-bearing", `· ${direction}`);
    set("mte-sector", `· ${this.sectorName()}`);
    const secs = Math.floor(this.missionClock);
    set("mte-kills", `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}   ${this.kills} DOWN`);
    const heading = compassHeadingDegrees(this.yaw);
    const cards = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    set(
      "mte-compass",
      heading === null ? "—" : `${cards[Math.round(heading / 45) % 8]}  ${heading.toFixed(0)}`,
    );
    const noise = this.el("mte-noise");
    if (noise) noise.style.width = `${clamp(this.noiseRadius() / 36, 0, 1) * 100}%`;
    set("mte-zone", this.outside > 0 ? `OUTSIDE  ${this.outside.toFixed(0)}m` : `ZONE  ${this.zoneR.toFixed(0)}m`);
    set("mte-stress", this.panic ? `PANIC  ${this.stress.toFixed(2)}` : `STRESS  ${this.stress.toFixed(2)}`);
    set("mte-haul", this.haul > 0 ? `HAUL  ${this.haul}` : "");
    const noiseLabel = this.el("mte-noise-label");
    if (noiseLabel) noiseLabel.textContent = this.op === "ananda" ? "0.0m AUDIBLE" : "NOISE";
    const stabWrap = this.el("mte-stability-wrap");
    if (stabWrap) {
      const show = this.op === "ananda" && (this.mode === "ground" || this.mode === "drop");
      stabWrap.style.display = show ? "block" : "none";
      const charge = this.qCd <= 0.05 ? 1 : Math.max(0, 1 - this.qCd / 9);
      const stab = this.el("mte-stability");
      if (stab) {
        stab.style.width = `${charge * 100}%`;
        stab.style.background = charge >= 1 ? "#fff" : "";
      }
      set("mte-stability-label", charge >= 1 ? "SHIFT READY" : `STABILITY ${(charge * 100).toFixed(0)}`);
      const moving = this.slideT > 0 || Math.hypot(this.vx, this.vz) > 7;
      stabWrap.classList.toggle("is-ready", charge >= 1);
      stabWrap.classList.toggle("is-warp", moving);
    }
    set(
      "mte-tac",
      this.op === "ananda"
        ? "TAC_NET  DHARMA  ·  0.0m"
        : this.op === "nefret"
          ? "TAC_NET  MA'AT  ·  KIN-COIL"
          : this.mode === "ground" || this.mode === "drop"
            ? "TAC_NET  ACCORD"
            : "",
    );
    const solarWrap = this.el("mte-solar-wrap");
    const critical = this.solar >= CRITICAL_MASS;
    if (solarWrap) {
      const show = this.op === "nefret" && (this.mode === "ground" || this.mode === "drop");
      solarWrap.style.display = show ? "block" : "none";
    }
    const pct = this.el("mte-solar-pct");
    if (pct) {
      const text = `${this.solar.toFixed(1)}% MAX`;
      if (pct.textContent !== text) pct.textContent = text;
      pct.classList.toggle("is-crit", critical);
    }
    const head = this.el("mte-coil-head");
    if (head) head.classList.toggle("is-live", this.op === "nefret");
    const coil = this.el("mte-coil");
    if (coil) {
      const lit = Math.round((this.solar / 100) * 16);
      coil.querySelectorAll<HTMLElement>("[data-seg]").forEach((node, index) => {
        const on = index < lit;
        node.classList.toggle("is-on", on && !critical);
        node.classList.toggle("is-crit", on && critical);
      });
    }
    const alert = this.el("mte-coil-alert");
    if (alert) {
      alert.style.display = critical ? "block" : "none";
      alert.classList.toggle("is-hot", critical);
    }
    const action = this.el("mte-coil-action");
    if (action && critical) {
      const ready = dischargeReady(this.solar, this.ultCd);
      const text = ready
        ? "[ F  ORBITAL DISCHARGE ]"
        : this.raT > 0
          ? "ORBITAL DISCHARGE LIVE"
          : "DISCHARGE INJECTOR CHARGING";
      if (action.textContent !== text) action.textContent = text;
    }
    const sub = this.el("mte-sub");
    const speaker = this.el("mte-speaker");
    if (sub && speaker) {
      sub.textContent = this.line?.text ?? "";
      speaker.textContent = this.line?.speaker ?? "";
      sub.parentElement!.style.opacity = this.line ? "1" : "0";
    }
    const prompt = this.el("mte-prompt");
    if (prompt) {
      prompt.textContent = this.prompt;
      prompt.style.opacity = this.prompt ? "1" : "0";
    }
    set("mte-qname", this.portalA && !this.portalB ? "SET EXIT" : op.activeName);
    set("mte-fname", this.anchorT > 0 ? `LINK ${this.anchorT.toFixed(1)}` : this.shieldT > 0 ? `SHIELD ${this.shieldT.toFixed(1)}` : this.raT > 0 ? `RA ${this.raT.toFixed(1)}` : this.unravelT > 0 ? `VOID ${this.unravelT.toFixed(1)}` : op.ultName);
    set("mte-qcd", this.qCd > 0.05 ? this.qCd.toFixed(1) : "READY");
    set("mte-fcd", this.ultCd > 0.05 ? this.ultCd.toFixed(1) : "READY");
    const q = this.el("mte-q");
    const f = this.el("mte-f");
    if (q) q.style.opacity = this.qCd > 0 ? "0.45" : "1";
    if (f) f.style.opacity = this.ultCd > 0 ? "0.45" : "1";
    const cross = this.el("mte-cross");
    if (cross) {
      const gap = 6 + (this.aiming ? 2 : 8) + Math.hypot(this.vx, this.vz) * 0.7 + (reloading ? 6 : 0);
      cross.style.setProperty("--gap", `${gap}px`);
      cross.classList.toggle("is-skill", this.aiming && stats.perks.has("SKILLSHOT_HIGHLIGHT"));
    }
    const hit = this.el("mte-hit");
    if (hit) {
      hit.style.opacity = String(this.combatFeedback.hitOpacity);
      hit.classList.toggle("is-head", this.combatFeedback.headshot);
    }
    const damage = this.el("mte-damage");
    if (damage) {
      for (const direction of DAMAGE_DIRECTIONS) {
        const indicator = damage.querySelector<HTMLElement>(`[data-direction="${direction}"]`);
        if (indicator)
          indicator.style.opacity = String(
            this.combatFeedback.damageOpacity(direction),
          );
      }
    }
    const vig = this.el("mte-vig");
    if (vig) {
      vig.style.opacity = String(Math.max(this.hurtFlash * 0.9, this.solarFlash * 0.92, this.outside > 0 ? 0.55 : 0));
      vig.classList.toggle("is-zone", this.outside > 0 && this.solarFlash < 0.08);
      vig.classList.toggle("is-solar", this.solarFlash > 0.05);
    }
    const toast = this.el("mte-toast");
    if (toast) {
      toast.textContent = this.toastMsg;
      toast.style.opacity = this.toastT > 0 ? "1" : "0";
    }
    const feed = this.el("mte-feed");
    if (feed) feed.textContent = this.feed.map((item) => item.text).join("\n");
    const squad = this.el("mte-squad");
    if (squad) {
      const rows = this.pool
        .filter((a) => a.squad)
        .map((a) => `${a.name.toUpperCase()}   ${!a.deployed ? "DROP" : a.down > 0 ? "DOWN" : Math.ceil(a.hp)}`);
      const mark = (id: "ananda" | "nefret", freed: boolean) =>
        `${id === "ananda" ? "ANANDA" : "NEFRET"}   ${this.worn === id ? "WORN" : freed ? "FREE" : "CAGED"}`;
      rows.push(mark("ananda", !!this.world.sites[0]?.freed), mark("nefret", !!this.world.sites[1]?.freed));
      squad.textContent = rows.join("\n");
    }
    const descendantsRescued = !!this.world.sites[0]?.freed && !!this.world.sites[1]?.freed;
    const beaconDistance = Math.hypot(this.world.beacon.x - this.x, this.world.beacon.z - this.z);
    const extractionDistance = Math.hypot(this.world.extract.x - this.x, this.world.extract.z - this.z);
    const hostiles = this.pool.filter(
      (actor) =>
        actor.alive &&
        actor.deployed &&
        actor.team === "sec" &&
        !actor.squad &&
        actor.down <= 0,
    ).length;
    const extractionHud = getExtractionHudState({
      missionActive: this.mode === "ground",
      descendantsRescued,
      beaconRaised: this.beaconDone,
      beaconChannelSeconds: this.channel,
      inBeaconRadius: beaconDistance < 3.1,
      recoveryLockSeconds: this.extractT,
      inRecoveryRadius: extractionDistance < 6.4,
      counterPushStarted: this.beaconWave,
      activeHostileCount: hostiles,
    });
    const channelWrap = this.el("mte-channel-wrap");
    if (channelWrap) {
      channelWrap.style.opacity = extractionHud.visible ? "1" : "0";
      channelWrap.style.visibility = extractionHud.visible ? "visible" : "hidden";
      channelWrap.setAttribute("aria-hidden", String(!extractionHud.visible));
    }
    set("mte-channel-title", extractionHud.title);
    set("mte-channel-timer", extractionHud.countdown);
    set("mte-channel-status", extractionHud.status);
    const threatLabel = this.el("mte-channel-threats");
    if (threatLabel) {
      if (threatLabel.textContent !== extractionHud.threats) {
        threatLabel.textContent = extractionHud.threats;
      }
      threatLabel.classList.toggle("text-danger", extractionHud.hasThreats || extractionHud.boundaryWarning);
      threatLabel.classList.toggle("text-cyan", !extractionHud.hasThreats && !extractionHud.boundaryWarning);
    }
    const channelProgress = this.el("mte-channel");
    if (channelProgress) channelProgress.style.width = `${extractionHud.percent}%`;
    const channelProgressBar = this.el("mte-channel-progress");
    if (channelProgressBar) {
      channelProgressBar.setAttribute("aria-valuenow", String(Math.round(extractionHud.percent)));
      channelProgressBar.setAttribute("aria-valuetext", `${extractionHud.countdown} remaining`);
    }
    const lock = this.el("mte-lock");
    if (lock) {
      const show = !this.touch && !this.locked && !this.paused && (this.mode === "drop" || this.mode === "ground");
      lock.style.display = show ? "grid" : "none";
    }
    const marks = this.el("mte-marks");
    if (marks) {
      const projected = this.project(obj.x, 2, obj.z);
      let mx = projected.x;
      let my = projected.y;
      if (projected.behind || mx < 24 || mx > this.viewW - 24 || my < 24 || my > this.viewH - 80) {
        let dx = projected.x - this.viewW / 2;
        let dy = projected.y - this.viewH / 2;
        if (projected.behind) {
          dx = -dx;
          dy = -dy;
        }
        const ang = Math.atan2(dy, dx);
        const rad = Math.min(this.viewW, this.viewH) * 0.34;
        mx = this.viewW / 2 + Math.cos(ang) * rad;
        my = this.viewH / 2 + Math.sin(ang) * rad;
      }
      const bits = [`<div class="absolute font-display text-xs tracking-widest text-gold" style="left:${mx}px;top:${my}px;transform:translate(-50%,-50%)">${obj.label}</div>`];
      for (const floater of this.floaters) {
        const p = this.project(floater.x, floater.y, floater.z);
        if (p.behind) continue;
        bits.push(
          `<div class="absolute font-display text-sm tracking-widest" style="left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);color:${floater.color};opacity:${floater.life}">${floater.text}</div>`,
        );
      }
      marks.innerHTML = bits.join("");
    }
  }

  private project(x: number, y: number, z: number) {
    this.tmp.set(x, y, z).project(this.camera);
    return {
      x: (this.tmp.x * 0.5 + 0.5) * this.viewW,
      y: (-this.tmp.y * 0.5 + 0.5) * this.viewH,
      behind: this.tmp.z > 1,
    };
  }

  private sectorName() {
    const landmark = this.world.landmarks
      .map((place) => ({ place, distance: Math.hypot(place.x - this.x, place.z - this.z) }))
      .filter(({ place, distance }) => distance <= place.radius)
      .sort((a, b) => a.distance - b.distance)[0]?.place;
    if (landmark) return landmark.label;
    return sectorLabel(this.x, this.z);
  }

  private drawMap() {
    const ctx = this.mapCtx;
    const canvas = ctx?.canvas;
    if (!ctx || !canvas) return;
    const s = canvas.width;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(7,9,13,0.2)";
    ctx.fillRect(0, 0, s, s);
    ctx.translate(s / 2, s / 2);
    const scale = 1.15;
    const yaw = this.mode === "attract" ? 0 : this.yaw;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const px = this.mode === "attract" ? 0 : this.x;
    const pz = this.mode === "attract" ? 0 : this.z;
    const proj = (x: number, z: number) => {
      const dx = x - px;
      const dz = z - pz;
      return [(dx * rx + dz * rz) * scale, -(dx * fx + dz * fz) * scale];
    };
    ctx.fillStyle = "#1b2129";
    for (const box of this.world.buildings) {
      if (box.tag === "tree") continue;
      const corners: Array<[number, number]> = [
        [box.minX, box.minZ],
        [box.maxX, box.minZ],
        [box.maxX, box.maxZ],
        [box.minX, box.maxZ],
      ];
      ctx.beginPath();
      corners.forEach(([x, z], i) => {
        const [sx, sy] = proj(x, z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineCap = "round";
    for (const route of this.world.routes) {
      if (!route.points.some((point) => Math.hypot(point.x - px, point.z - pz) < 90)) continue;
      ctx.beginPath();
      route.points.forEach((point, index) => {
        const [sx, sy] = proj(point.x, point.z);
        if (index === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = route.surface === "trail" ? "rgba(179,190,129,0.8)" : "rgba(125,145,154,0.72)";
      ctx.lineWidth = route.surface === "trail" ? 1.2 : 1.7;
      ctx.setLineDash(route.surface === "trail" ? [2, 2] : []);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.textAlign = "left";
    ctx.font = "7px monospace";
    for (const place of this.world.landmarks) {
      const distance = Math.hypot(place.x - px, place.z - pz);
      if (distance > 82) continue;
      const [sx, sy] = proj(place.x, place.z);
      const color =
        place.kind === "compound" || place.kind === "checkpoint"
          ? "#e24b4b"
          : place.kind === "rescue" || place.kind === "facility"
            ? "#d4a24a"
            : place.kind === "forest"
              ? "#b3be81"
              : "#2ee0c8";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
      ctx.fill();
      if (distance < 38) {
        ctx.fillStyle = color;
        ctx.fillText(place.label, sx + 5, sy - 4);
      }
    }
    ctx.strokeStyle = this.outside > 0 ? "#e24b4b" : "#d4a24a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const [sx, sy] = proj(this.zoneX + Math.cos(a) * this.zoneR, this.zoneZ + Math.sin(a) * this.zoneR);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    const obj = this.objectivePoint();
    const [ox, oy] = proj(obj.x, obj.z);
    ctx.fillStyle = "#d4a24a";
    ctx.fillRect(ox - 2, oy - 2, 4, 4);
    for (const loot of this.loots) {
      if (!loot.alive) continue;
      if (Math.hypot(loot.x - px, loot.z - pz) > 58) continue;
      const [lx, ly] = proj(loot.x, loot.z);
      ctx.fillStyle =
        loot.kind === "ammo" ? "#2ee0c8" : loot.kind === "weapon" || loot.kind === "mod" ? "#d4a24a" : loot.kind === "med" ? "#e8e4d8" : "#e24b4b";
      ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
    }
    ctx.strokeStyle = "#d4a24a";
    ctx.lineWidth = 1;
    for (const term of this.terminals) {
      if (term.open) continue;
      if (Math.hypot(term.x - px, term.z - pz) > 90) continue;
      const [tx, ty] = proj(term.x, term.z);
      ctx.strokeRect(tx - 3, ty - 3, 6, 6);
    }
    for (const actor of this.pool) {
      if (!actor.alive || actor.down > 0) continue;
      if (actor.squad && !actor.deployed) continue;
      const [sx, sy] = proj(actor.x, actor.z);
      ctx.fillStyle = actor.team === "sec" ? "#e24b4b" : "#2ee0c8";
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
    ctx.fillStyle = "#e8e4d8";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPos: () => { x: number; y: number; z: number };
      setKeys: (codes: string[]) => void;
      getMode?: () => string;
      getEnemyMindStates?: () => Array<{
        state: Mind;
        age: number;
        x: number;
        z: number;
        lastKnownX: number;
        lastKnownZ: number;
        waypoint: NavigationPoint | null;
        role: "anchor" | "flanker" | null;
        coverPhase: "hide" | "peek" | null;
        searchAge: number | null;
        flank: NavigationPoint | null;
      }>;
    };
  }
}
