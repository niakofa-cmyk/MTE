export type RegionLandmarkId =
  | "settlement"
  | "hostile-compound"
  | "forest-route"
  | "checkpoint"
  | "rescue-site"
  | "mission-facility";

export type RegionLandmark = {
  id: RegionLandmarkId;
  label: string;
  x: number;
  z: number;
  radius: number;
  kind: "settlement" | "compound" | "forest" | "checkpoint" | "rescue" | "facility";
};

export type RegionPoint = { x: number; z: number };

export type RegionRoute = {
  id: string;
  name: string;
  from: RegionLandmarkId;
  to: RegionLandmarkId;
  points: RegionPoint[];
  surface: "street" | "trail";
};

export type ForestTree = { x: number; z: number; scale: number };

export const REGION_LIMIT = 152;

export const REGION_LANDMARKS: readonly RegionLandmark[] = [
  { id: "settlement", label: "CINDER ROW", x: -20, z: -20, radius: 22, kind: "settlement" },
  { id: "hostile-compound", label: "RED VEIL COMPOUND", x: 80, z: -62, radius: 30, kind: "compound" },
  { id: "forest-route", label: "WESTERN GREENLINE", x: -126, z: 0, radius: 44, kind: "forest" },
  { id: "checkpoint", label: "NORTH CHECKPOINT", x: 20, z: 100, radius: 24, kind: "checkpoint" },
  { id: "rescue-site", label: "OMEGA RESCUE", x: -80, z: 62, radius: 26, kind: "rescue" },
  { id: "mission-facility", label: "ACCORD SIGNAL FACILITY", x: 0, z: -7, radius: 24, kind: "facility" },
];

export const REGION_ROUTES: readonly RegionRoute[] = [
  {
    id: "east-gate",
    name: "East Gate Road",
    from: "settlement",
    to: "hostile-compound",
    surface: "street",
    points: [
      { x: -20, z: -20 }, { x: 20, z: -20 }, { x: 60, z: -20 },
      { x: 100, z: -20 }, { x: 100, z: -60 }, { x: 80, z: -62 },
    ],
  },
  {
    id: "west-industrial-bypass",
    name: "West Industrial Bypass",
    from: "settlement",
    to: "hostile-compound",
    surface: "street",
    points: [
      { x: -20, z: -20 }, { x: -60, z: -20 }, { x: -100, z: -20 },
      { x: -100, z: -60 }, { x: -100, z: -100 }, { x: -60, z: -100 }, { x: 0, z: -100 },
      { x: 40, z: -100 }, { x: 80, z: -100 }, { x: 80, z: -62 },
    ],
  },
  {
    id: "greenline-trail",
    name: "Greenline Trail",
    from: "settlement",
    to: "rescue-site",
    surface: "trail",
    points: [
      { x: -20, z: -20 }, { x: -60, z: -20 }, { x: -100, z: -20 },
      { x: -126, z: -20 }, { x: -126, z: 20 }, { x: -126, z: 60 },
      { x: -100, z: 40 }, { x: -80, z: 40 }, { x: -80, z: 62 },
    ],
  },
  {
    id: "checkpoint-road",
    name: "North Checkpoint Road",
    from: "settlement",
    to: "checkpoint",
    surface: "street",
    points: [
      { x: -20, z: -20 }, { x: -20, z: 20 }, { x: -20, z: 60 },
      { x: -20, z: 100 }, { x: 20, z: 100 },
    ],
  },
  {
    id: "checkpoint-to-rescue",
    name: "Checkpoint Service Road",
    from: "checkpoint",
    to: "rescue-site",
    surface: "street",
    points: [
      { x: 20, z: 100 }, { x: -20, z: 100 }, { x: -60, z: 100 },
      { x: -60, z: 40 }, { x: -80, z: 40 }, { x: -80, z: 62 },
    ],
  },
  {
    id: "beacon-spur",
    name: "Beacon Spur",
    from: "settlement",
    to: "mission-facility",
    surface: "street",
    points: [
      { x: -20, z: -20 }, { x: -20, z: -8 }, { x: -8, z: -8 }, { x: 0, z: -7 },
    ],
  },
];

export function isForestCell(gridX: number) {
  return gridX === -3;
}

function makeForestTrees(): ForestTree[] {
  const rows = [-145, -137, -114, -106];
  const trees: ForestTree[] = [];
  for (let row = 0; row < rows.length; row++) {
    for (let index = 0; index < 12; index++) {
      const z = -132 + index * 24 + ((row + index) % 2 ? 3 : -3);
      if (Math.abs(z + 20) < 13 || Math.abs(z - 80) < 13) continue;
      trees.push({
        x: rows[row]! + ((row + index) % 2 ? 1.5 : -1.5),
        z,
        scale: 0.82 + ((row * 5 + index * 3) % 7) * 0.07,
      });
    }
  }
  return trees;
}

export const FOREST_TREES = makeForestTrees();
