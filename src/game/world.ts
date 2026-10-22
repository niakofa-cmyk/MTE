import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WeaponId } from "@/game/content";
import { rollLoot } from "@/game/loot";

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
  limit: number;
};

export const RADIUS = 0.42;
export const STEP = 0.58;

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

export function xzHit(x: number, z: number, r: number, b: Box) {
  return x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ;
}

export function movementBlocked(x: number, z: number, feetY: number, boxes: Box[]) {
  for (const b of boxes) {
    if (!b.alive) continue;
    if (b.h <= feetY + STEP) continue;
    if (xzHit(x, z, RADIUS, b)) return b;
  }
  return null;
}

export function floorHeight(x: number, z: number, feetY: number, boxes: Box[]) {
  let floor = 0;
  for (const b of boxes) {
    if (!b.alive) continue;
    if (b.h > feetY + STEP + 0.02) continue;
    if (xzHit(x, z, 0.1, b)) floor = Math.max(floor, b.h);
  }
  return floor;
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
    if ((Math.abs(n.x / 10) + Math.abs(n.z / 10)) % 2 < 1) placeCover(n.x + 3.2, n.z, true);
  }
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
    limit: 152,
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

export function paintGround() {
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
      const x0 = map(gx * CELL - 12.5);
      const z0 = map(gz * CELL - 12.5);
      const x1 = map(gx * CELL + 12.5);
      const z1 = map(gz * CELL + 12.5);
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
    }
  }
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCity(scene: THREE.Scene, world: WorldData) {
  const buckets: Record<Glow, THREE.BufferGeometry[]> = { cyan: [], gold: [], red: [] };
  const solids: THREE.BufferGeometry[] = [];
  for (const b of world.buildings) {
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
    new THREE.MeshStandardMaterial({ map: paintGround(), roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

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
