import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WeaponId } from "@/game/content";
import { rollLoot } from "@/game/loot";
import {
  FOREST_TREES,
  REGION_LANDMARKS,
  REGION_LIMIT,
  REGION_ROUTES,
  isForestCell,
  type ForestTree,
  type RegionLandmark,
  type RegionRoute,
} from "@/game/region-layout";
import { xzHit } from "@/game/world-physics";

export { floorHeight, movementBlocked, RADIUS, STEP, xzHit } from "@/game/world-physics";

export type Glow = "cyan" | "gold" | "red";

export type Box = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
  alive: boolean;
  destructible: boolean;
  hp: number;
  maxHp: number;
  tag: string;
  glow: Glow;
  reinforced: boolean;
  mesh?: THREE.Mesh;
};

export type SiteId = "alpha" | "omega";

export type Site = {
  id: SiteId;
  label: string;
  lineage: string;
  x: number;
  z: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  door: Box;
  freed: boolean;
};

export type LootSpec = {
  kind: "weapon" | "ammo" | "med" | "armor" | "mod" | "intel";
  weaponId?: WeaponId;
  modId?: string;
  label?: string;
  scrap?: number;
  x: number;
  z: number;
};

export type WorldData = {
  buildings: Box[];
  covers: Box[];
  sites: Site[];
  loots: LootSpec[];
  nodes: { x: number; z: number }[];
  terminals: { x: number; z: number }[];
  guards: { x: number; z: number }[];
  beacon: { x: number; z: number };
  extract: { x: number; z: number };
  landmarks: RegionLandmark[];
  routes: RegionRoute[];
  trees: ForestTree[];
  limit: number;
};

function rngSeed(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBox(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  h: number,
  glow: Glow,
  destructible = false,
  tag = "solid",
  hp = 80,
): Box {
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    h,
    alive: true,
    destructible,
    hp,
    maxHp: hp,
    tag,
    glow,
    reinforced: false,
  };
}

export function segmentHits(x0: number, z0: number, x1: number, z1: number, b: Box) {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const ps = [-dx, dx, -dz, dz];
  const qs = [x0 - b.minX, b.maxX - x0, z0 - b.minZ, b.maxZ - z0];
  for (let i = 0; i < 4; i++) {
    const p = ps[i]!;
    const q = qs[i]!;
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

export function hasLos(x0: number, z0: number, x1: number, z1: number, boxes: Box[]) {
  for (const b of boxes) {
    if (!b.alive || b.h < 1.7) continue;
    const inside = (x: number, z: number) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
    if (inside(x0, z0) || inside(x1, z1)) continue;
    if (segmentHits(x0, z0, x1, z1, b)) return false;
  }
  return true;
}

function addPrison(
  buildings: Box[],
  cx: number,
  cz: number,
  gate: "south" | "north",
  id: SiteId,
  label: string,
  lineage: string,
): Site {
  const a = 15;
  const t = 1.35;
  const h = 8;
  const glow: Glow = "red";
  buildings.push(makeBox(cx - a, cx - a + t, cz - a + t, cz + a - t, h, glow));
  buildings.push(makeBox(cx + a - t, cx + a, cz - a + t, cz + a - t, h, glow));
  if (gate === "south") {
    buildings.push(makeBox(cx - a, cx + a, cz - a, cz - a + t, h, glow));
    buildings.push(makeBox(cx - a, cx - 2.3, cz + a - t, cz + a, h, glow));
    buildings.push(makeBox(cx + 2.3, cx + a, cz + a - t, cz + a, h, glow));
  } else {
    buildings.push(makeBox(cx - a, cx + a, cz + a - t, cz + a, h, glow));
    buildings.push(makeBox(cx - a, cx - 2.3, cz - a, cz - a + t, h, glow));
    buildings.push(makeBox(cx + 2.3, cx + a, cz - a, cz - a + t, h, glow));
  }
  const towers: Array<[number, number]> = [
    [cx - a, cz - a],
    [cx + a, cz - a],
    [cx - a, cz + a],
    [cx + a, cz + a],
  ];
  for (const [tx, tz] of towers) {
    buildings.push(makeBox(tx - 1.6, tx + 1.6, tz - 1.6, tz + 1.6, 14, glow));
  }
  const door =
    gate === "south"
      ? makeBox(cx - 2.3, cx + 2.3, cz + a - t, cz + a, 4.4, glow, true, "door", 150)
      : makeBox(cx - 2.3, cx + 2.3, cz - a, cz - a + t, 4.4, glow, true, "door", 150);
  return {
    id,
    label,
    lineage,
    x: cx,
    z: cz,
    minX: cx - a + t,
    maxX: cx + a - t,
    minZ: cz - a + t,
    maxZ: cz + a - t,
    door,
    freed: false,
  };
}

function overlapsAny(x: number, z: number, r: number, boxes: Box[]) {
  return boxes.some((b) => b.alive && xzHit(x, z, r, b));
}

export function buildWorld(): WorldData {
  const rand = rngSeed(20261022);
  const buildings: Box[] = [];
  const covers: Box[] = [];
  const CELL = 40;

  const alpha = addPrison(buildings, 2 * CELL, -2 * CELL, "south", "alpha", "CRADLE ALPHA", "Ananda");
  const omega = addPrison(buildings, -2 * CELL, 2 * CELL, "north", "omega", "CRADLE OMEGA", "Nefret");
  covers.push(alpha.door, omega.door);

  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if ((gx === 2 && gz === -2) || (gx === -2 && gz === 2) || (gx === 0 && gz === 0)) continue;
      if (isForestCell(gx)) continue;
      const cx = gx * CELL;
      const cz = gz * CELL;
      const central = Math.abs(gx) <= 1 && Math.abs(gz) <= 1;
      const rim = Math.abs(gx) === 3 || Math.abs(gz) === 3;
      const pick = () => {
        if (central) return [4.5, 6.5, 9, 12][Math.floor(rand() * 4)]!;
        if (rim) return [16, 24, 32, 42, 48][Math.floor(rand() * 5)]!;
        return [8, 12, 18, 26, 34][Math.floor(rand() * 5)]!;
      };
      const glow: Glow = cx > 36 ? "red" : cx < -36 ? "gold" : "cyan";
      buildings.push(makeBox(cx - 12, cx - 1.6, cz - 12, cz + 3.5, pick(), glow));
      buildings.push(makeBox(cx + 1.6, cx + 12, cz - 2.5, cz + 12, pick(), glow));
      if (rand() > 0.55) {
        buildings.push(makeBox(cx - 6, cx + 5, cz - 12, cz - 6, Math.min(pick(), central ? 8 : 20), glow));
      }
    }
  }

  buildings.push(makeBox(-0.45, 0.45, -0.45, 0.45, 26, "cyan", false, "mast"));
  buildings.push(
    makeBox(-34, -29, -25, -19, 3.4, "gold", false, "settlement_kiosk"),
    makeBox(-11, -6, -25, -19, 3.4, "cyan", false, "settlement_kiosk"),
    makeBox(34, 38, 97, 103, 10, "red", false, "checkpoint_tower"),
  );
  buildings.push(...FOREST_TREES.map((tree) =>
    makeBox(
      tree.x - 0.3 * tree.scale,
      tree.x + 0.3 * tree.scale,
      tree.z - 0.3 * tree.scale,
      tree.z + 0.3 * tree.scale,
      2.2 * tree.scale,
      "gold",
      false,
      "tree",
    ),
  ));

  const nodes: { x: number; z: number }[] = [];
  for (let ix = -3; ix <= 4; ix++) {
    for (let iz = -3; iz <= 4; iz++) {
      const x = ix * CELL - CELL / 2;
      const z = iz * CELL - CELL / 2;
      if (Math.abs(x) > 148 || Math.abs(z) > 148) continue;
      if (!overlapsAny(x, z, 0.8, buildings)) nodes.push({ x, z });
    }
  }

  const placeCover = (x: number, z: number, alongX: boolean) => {
    const box = alongX
      ? makeBox(x - 1.4, x + 1.4, z - 0.38, z + 0.38, 1.08, "cyan", true, "cover", 55)
      : makeBox(x - 0.38, x + 0.38, z - 1.4, z + 1.4, 1.08, "cyan", true, "cover", 55);
    if (overlapsAny((box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2, 0.2, buildings)) return;
    covers.push(box);
  };

  for (const n of nodes) {
    if (Math.abs(n.x) < 10 && Math.abs(n.z) < 10) continue;
    if (Math.hypot(n.x - 20, n.z - 100) < 22) continue;
    if ((Math.abs(n.x / 10) + Math.abs(n.z / 10)) % 2 < 1) placeCover(n.x + 3.2, n.z, true);
  }
  placeCover(14, 100, true);
  placeCover(26, 100, true);
  placeCover(8, 6, true);
  placeCover(-7, -5, false);
  placeCover(6, -8, true);
  placeCover(-9, 7, false);
  placeCover(-6, -132, true);
  placeCover(6, -128, false);
  placeCover(0, -124, true);
  covers.forEach((box, index) => {
    if (box.tag !== "cover" || index % 4 !== 0) return;
    box.reinforced = true;
    box.hp = 160;
    box.maxHp = 160;
  });

  const loots: LootSpec[] = [];
  const nearLoot = (x: number, z: number) => loots.some((loot) => Math.hypot(loot.x - x, loot.z - z) < 7);
  const dropAt = (x: number, z: number) => {
    if (Math.abs(x) > 146 || Math.abs(z) > 146) return;
    if (overlapsAny(x, z, 0.55, buildings)) return;
    if (nearLoot(x, z)) return;
    const roll = rand();
    if (roll < 0.22) loots.push({ kind: "ammo", x, z });
    else if (roll < 0.34) loots.push({ kind: "med", x, z });
    else loots.push(rollLoot(x, z, rand));
  };
  loots.push(
    { kind: "weapon", weaponId: "rifle", x: 58, z: -48 },
    { kind: "med", x: 70, z: -48 },
    { kind: "armor", x: 84, z: -58 },
    { kind: "weapon", weaponId: "smg", x: -58, z: 50 },
    { kind: "med", x: -72, z: 50 },
    { kind: "ammo", x: 4, z: 14 },
    { kind: "med", x: -14, z: -6 },
    { kind: "weapon", weaponId: "shotgun", x: 18, z: 22 },
  );
  for (const n of nodes) {
    if (Math.hypot(n.x, n.z) < 12) continue;
    dropAt(n.x + (rand() - 0.5) * 9, n.z + (rand() - 0.5) * 9);
    if (rand() > 0.42) dropAt(n.x + (rand() - 0.5) * 16, n.z + (rand() - 0.5) * 16);
  }
  for (let i = 0; i < 8; i++) {
    dropAt((rand() - 0.5) * 18, -118 - rand() * 22);
  }

  const terminals: { x: number; z: number }[] = [];
  const terminalSeeds = [
    { x: 60, z: 20 },
    { x: 100, z: -20 },
    { x: 60, z: -60 },
    { x: 20, z: -140 },
  ];
  for (const seed of terminalSeeds) {
    let placed = false;
    for (let ring = 0; ring <= 16 && !placed; ring += 2) {
      for (let step = 0; step < 8 && !placed; step++) {
        const ang = (step / 8) * Math.PI * 2;
        const x = seed.x + Math.cos(ang) * ring;
        const z = seed.z + Math.sin(ang) * ring;
        if (Math.abs(x) > 142 || Math.abs(z) > 146) continue;
        if (overlapsAny(x, z, 1.1, buildings)) continue;
        if (terminals.some((term) => Math.hypot(term.x - x, term.z - z) < 18)) continue;
        terminals.push({ x, z });
        placed = true;
      }
    }
  }

  const guards = [
    { x: 80, z: -48 },
    { x: 64, z: -62 },
    { x: 90, z: -70 },
    { x: 72, z: -40 },
    { x: -80, z: 48 },
    { x: -64, z: 62 },
    { x: -90, z: 70 },
    { x: -72, z: 40 },
    { x: 20, z: 92 },
    { x: 20, z: 108 },
  ].filter((g) => !overlapsAny(g.x, g.z, 0.6, buildings));

  return {
    buildings,
    covers,
    sites: [alpha, omega],
    loots,
    nodes,
    terminals,
    guards,
    beacon: { x: 0, z: 0 },
    extract: { x: 0, z: -138 },
    landmarks: [...REGION_LANDMARKS],
    routes: [...REGION_ROUTES],
    trees: [...FOREST_TREES],
    limit: REGION_LIMIT,
  };
}

const GLOW_HEX: Record<Glow, number> = { cyan: 0x2ee0c8, gold: 0xd4a24a, red: 0xe24b4b };

function glowMat(color: number) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.7,
    roughness: 0.35,
    metalness: 0.15,
  });
}

function pushWindows(b: Box, into: THREE.BufferGeometry[]) {
  const w = b.maxX - b.minX;
  const cx = (b.minX + b.maxX) / 2;
  const czMid = (b.minZ + b.maxZ) / 2;
  const floors = Math.min(7, Math.max(1, Math.floor(b.h / 3.4)));
  const pw = Math.min(Math.max(w * 0.45, 1.2), 5.5);
  for (let i = 0; i < floors; i++) {
    const y = 2.2 + i * 3.3;
    if (y > b.h - 0.8) break;
    const front = new THREE.PlaneGeometry(pw, 0.9);
    front.translate(cx, y, b.maxZ + 0.08);
    into.push(front);
    const back = new THREE.PlaneGeometry(pw, 0.9);
    back.rotateY(Math.PI);
    back.translate(cx, y, b.minZ - 0.08);
    into.push(back);
    if (i === 0 && w > 3) {
      const sign = new THREE.BoxGeometry(Math.min(w * 0.4, 3.2), 0.35, 0.18);
      sign.translate(cx, 3.3, b.maxZ + 0.2);
      into.push(sign);
    }
  }
  if (b.h > 16) {
    const mast = new THREE.BoxGeometry(0.25, 4, 0.25);
    mast.translate(cx, b.h + 2, czMid);
    into.push(mast);
  }
}

export function paintGround(world: WorldData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.CanvasTexture(canvas);
  g.fillStyle = "#242b34";
  g.fillRect(0, 0, 1024, 1024);
  const map = (v: number) => ((v + 160) / 320) * 1024;
  g.fillStyle = "#1a2028";
  const CELL = 40;
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if (isForestCell(gx)) continue;
      const x0 = map(gx * CELL - 12.5);
      const z0 = map(gz * CELL - 12.5);
      const x1 = map(gx * CELL + 12.5);
      const z1 = map(gz * CELL + 12.5);
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
    }
  }
  g.fillStyle = "#303d35";
  g.fillRect(map(-152), map(-160), map(-100) - map(-152), map(160) - map(-160));
  g.strokeStyle = "#3d4a5c";
  g.lineWidth = 2;
  g.setLineDash([10, 14]);
  for (let i = -3; i <= 4; i++) {
    const p = map(i * CELL - CELL / 2);
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, 1024);
    g.stroke();
    g.beginPath();
    g.moveTo(0, p);
    g.lineTo(1024, p);
    g.stroke();
  }
  g.setLineDash([]);
  g.lineCap = "round";
  for (const route of world.routes) {
    g.beginPath();
    route.points.forEach((point, index) => {
      const x = map(point.x);
      const z = map(point.z);
      if (index === 0) g.moveTo(x, z);
      else g.lineTo(x, z);
    });
    g.strokeStyle = route.surface === "trail" ? "#58634c" : "#38434b";
    g.lineWidth = route.surface === "trail" ? 16 : 22;
    g.stroke();
    g.beginPath();
    route.points.forEach((point, index) => {
      const x = map(point.x);
      const z = map(point.z);
      if (index === 0) g.moveTo(x, z);
      else g.lineTo(x, z);
    });
    g.strokeStyle = route.surface === "trail" ? "#9a9a6b" : "#7b8280";
    g.lineWidth = 2;
    g.setLineDash([8, 12]);
    g.stroke();
    g.setLineDash([]);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addForest(scene: THREE.Scene, trees: ForestTree[]) {
  if (!trees.length) return;
  const bark = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.27, 2.2, 5),
    new THREE.MeshStandardMaterial({ color: 0x514238, roughness: 1 }),
    trees.length,
  );
  const canopy = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.7, 4.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x354839, roughness: 1 }),
    trees.length,
  );
  const transform = new THREE.Object3D();
  trees.forEach((tree, index) => {
    transform.position.set(tree.x, 1.1 * tree.scale, tree.z);
    transform.scale.setScalar(tree.scale);
    transform.updateMatrix();
    bark.setMatrixAt(index, transform.matrix);
    transform.position.set(tree.x, 3.25 * tree.scale, tree.z);
    transform.updateMatrix();
    canopy.setMatrixAt(index, transform.matrix);
  });
  bark.instanceMatrix.needsUpdate = true;
  canopy.instanceMatrix.needsUpdate = true;
  bark.castShadow = false;
  canopy.castShadow = false;
  scene.add(bark, canopy);
}

/**
 * Compact, versioned Cinder Row graybox for the first relay-control arena.
 * Keep this layout bounded and readable; the three lanes share one relay
 * objective and leave clear server-selected spawn approaches on both ends.
 */
export function buildCinderRowWorld(): WorldData {
  const buildings: Box[] = [
    makeBox(-40, -39, -40, 40, 8, "red", false, "arena-boundary"),
    makeBox(39, 40, -40, 40, 8, "cyan", false, "arena-boundary"),
    makeBox(-39, 39, -40, -39, 8, "gold", false, "arena-boundary"),
    makeBox(-39, 39, 39, 40, 8, "gold", false, "arena-boundary"),
    // Closed service blocks frame the lanes without sealing their entrances.
    makeBox(-8, 8, -36, -30, 7, "red", false, "ashway-block"),
    makeBox(-8, 8, 30, 36, 7, "cyan", false, "undercroft-block"),
    makeBox(-36, -29, -8, 8, 6, "gold", false, "west-transit-block"),
    makeBox(29, 36, -8, 8, 6, "red", false, "east-transit-block"),
  ];
  const covers: Box[] = [
    makeBox(-22, -17, -25, -23, 1.25, "gold", true, "ashway-cover", 180),
    makeBox(16, 22, -20, -18, 1.25, "cyan", true, "ashway-cover", 180),
    makeBox(-23, -18, 18, 20, 1.25, "cyan", true, "undercroft-cover", 180),
    makeBox(17, 23, 23, 25, 1.25, "gold", true, "undercroft-cover", 180),
    makeBox(-18, -14, -3, 3, 1.45, "cyan", true, "transit-cover", 220),
    makeBox(14, 18, -3, 3, 1.45, "gold", true, "transit-cover", 220),
    makeBox(-4, -2, -15, -9, 1.1, "red", true, "relay-cover", 150),
    makeBox(2, 4, 9, 15, 1.1, "red", true, "relay-cover", 150),
  ];
  const nodes: Array<{ x: number; z: number }> = [];
  for (const x of [-32, -24, -16, -8, 0, 8, 16, 24, 32]) {
    for (const z of [-24, 0, 24]) {
      if (!overlapsAny(x, z, 0.8, buildings)) nodes.push({ x, z });
    }
  }

  return {
    buildings,
    covers,
    sites: [],
    loots: [],
    nodes,
    terminals: [],
    guards: [],
    beacon: { x: 0, z: 0 },
    extract: { x: 0, z: 0 },
    landmarks: [],
    routes: [],
    trees: [],
    limit: 40,
  };
}

export function createCity(scene: THREE.Scene, world: WorldData) {
  const buckets: Record<Glow, THREE.BufferGeometry[]> = { cyan: [], gold: [], red: [] };
  const solids: THREE.BufferGeometry[] = [];
  for (const b of world.buildings) {
    if (b.tag === "tree") continue;
    const w = b.maxX - b.minX;
    const d = b.maxZ - b.minZ;
    const geo = new THREE.BoxGeometry(w, b.h, d);
    geo.translate((b.minX + b.maxX) / 2, b.h / 2, (b.minZ + b.maxZ) / 2);
    solids.push(geo);
    if (b.tag !== "mast") pushWindows(b, buckets[b.glow]);
  }
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x4a545f,
    roughness: 0.88,
    metalness: 0.12,
  });
  const merged = mergeGeometries(solids);
  if (!merged) throw new Error("City mesh failed to build");
  solids.forEach((geo) => geo.dispose());
  const city = new THREE.Mesh(merged, concrete);
  city.castShadow = true;
  city.receiveShadow = true;
  scene.add(city);

  (Object.keys(buckets) as Glow[]).forEach((key) => {
    const list = buckets[key];
    if (!list.length) return;
    const geo = mergeGeometries(list);
    list.forEach((item) => item.dispose());
    if (!geo) return;
    scene.add(new THREE.Mesh(geo, glowMat(GLOW_HEX[key])));
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshStandardMaterial({ map: paintGround(world), roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  addForest(scene, world.trees);

  const coverMat = new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.62, metalness: 0.28 });
  for (const c of world.covers) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(c.maxX - c.minX, c.h, c.maxZ - c.minZ),
      c.tag === "door"
        ? new THREE.MeshStandardMaterial({
            color: 0x6a3030,
            emissive: 0xe24b4b,
            emissiveIntensity: 0.35,
            roughness: 0.45,
            metalness: 0.4,
          })
        : c.reinforced
          ? new THREE.MeshStandardMaterial({
              color: 0x5c5648,
              emissive: 0xd4a24a,
              emissiveIntensity: 0.22,
              roughness: 0.5,
              metalness: 0.45,
            })
          : coverMat,
    );
    mesh.position.set((c.minX + c.maxX) / 2, c.h / 2, (c.minZ + c.maxZ) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    c.mesh = mesh;
    scene.add(mesh);
  }

  const pad = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 7.4, 40),
    new THREE.MeshBasicMaterial({ color: 0xd4a24a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(world.extract.x, 0.08, world.extract.z);
  scene.add(pad);

  const padFill = new THREE.Mesh(
    new THREE.CircleGeometry(6, 28),
    new THREE.MeshBasicMaterial({ color: 0xd4a24a, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
  );
  padFill.rotation.x = -Math.PI / 2;
  padFill.position.set(world.extract.x, 0.06, world.extract.z);
  scene.add(padFill);

  return { city, ground };
}
