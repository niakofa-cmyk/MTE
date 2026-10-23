import { SEARCH_SECONDS } from "./enemy-ai.ts";
import type { NavigationPoint } from "./navigation.ts";

export type CoverObstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  alive: boolean;
  tag: string;
};

export type CoverPlan = {
  hide: NavigationPoint;
  peek: NavigationPoint;
  coverIndex: number;
};

export type SquadSignal = {
  senderId: number;
  senderX: number;
  senderZ: number;
  targetX: number;
  targetZ: number;
  state: "suspicious" | "engage" | "investigate" | "search";
  seenNow: boolean;
};

export type CombatParticipant = { id: number; x: number; z: number };

export function stepCoverExposure(phase: "hide" | "peek", elapsed: number, dt: number) {
  const duration = phase === "hide" ? 1.45 : 0.95;
  const nextElapsed = Math.max(0, elapsed) + Math.max(0, dt);
  if (nextElapsed < duration) return { phase, elapsed: nextElapsed };
  return {
    phase: phase === "hide" ? "peek" as const : "hide" as const,
    elapsed: nextElapsed - duration,
  };
}

function segmentCrossesBox(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  box: CoverObstacle,
) {
  let start = 0;
  let end = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const edges = [
    [-dx, x0 - box.minX],
    [dx, box.maxX - x0],
    [-dz, z0 - box.minZ],
    [dz, box.maxZ - z0],
  ] as const;
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > end) return false;
      start = Math.max(start, t);
    } else {
      if (t < start) return false;
      end = Math.min(end, t);
    }
  }
  return start <= end && end >= 0 && start <= 1;
}

export function searchWaypoint(
  centerX: number,
  centerZ: number,
  age: number,
  actorId: number,
): NavigationPoint {
  const points = 8;
  const radius = 7;
  const interval = SEARCH_SECONDS / points;
  const step = Math.min(points - 1, Math.max(0, Math.floor(Math.max(0, age) / interval)));
  const index = ((step + actorId) % points + points) % points;
  const angle = (index / points) * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * radius,
    z: centerZ + Math.sin(angle) * radius,
  };
}

export function findCoverPlans(
  actorX: number,
  actorZ: number,
  threatX: number,
  threatZ: number,
  covers: CoverObstacle[],
  canStand: (x: number, z: number) => boolean,
): CoverPlan[] {
  const plans: Array<{ plan: CoverPlan; score: number }> = [];
  for (let coverIndex = 0; coverIndex < covers.length; coverIndex++) {
    const cover = covers[coverIndex]!;
    if (!cover.alive || cover.tag !== "cover") continue;
    const centerX = (cover.minX + cover.maxX) / 2;
    const centerZ = (cover.minZ + cover.maxZ) / 2;
    const halfX = (cover.maxX - cover.minX) / 2;
    const halfZ = (cover.maxZ - cover.minZ) / 2;
    const toThreatX = threatX - centerX;
    const toThreatZ = threatZ - centerZ;
    const threatDistance = Math.hypot(toThreatX, toThreatZ);
    if (threatDistance < 4 || threatDistance > 24) continue;
    const ux = toThreatX / threatDistance;
    const uz = toThreatZ / threatDistance;
    const hideReach = Math.abs(ux) * halfX + Math.abs(uz) * halfZ + 0.9;
    const hide = { x: centerX - ux * hideReach, z: centerZ - uz * hideReach };
    if (!canStand(hide.x, hide.z) || !segmentCrossesBox(hide.x, hide.z, threatX, threatZ, cover)) continue;

    const longX = cover.maxX - cover.minX >= cover.maxZ - cover.minZ;
    const halfLong = longX ? halfX : halfZ;
    const tangentX = longX ? 1 : 0;
    const tangentZ = longX ? 0 : 1;
    const peekCandidates = [-1, 1]
      .map((side) => ({
        x: hide.x + tangentX * side * (halfLong + 1.35),
        z: hide.z + tangentZ * side * (halfLong + 1.35),
      }))
      .filter((peek) => canStand(peek.x, peek.z) && !segmentCrossesBox(peek.x, peek.z, threatX, threatZ, cover))
      .sort((a, b) => Math.hypot(a.x - actorX, a.z - actorZ) - Math.hypot(b.x - actorX, b.z - actorZ));
    const peek = peekCandidates[0];
    if (!peek) continue;
    const actorDistance = Math.hypot(hide.x - actorX, hide.z - actorZ);
    plans.push({
      plan: { hide, peek, coverIndex },
      score: actorDistance + threatDistance * 0.12,
    });
  }
  return plans.sort((a, b) => a.score - b.score).map(({ plan }) => plan);
}

export function chooseFlankPosition(
  actorX: number,
  actorZ: number,
  threatX: number,
  threatZ: number,
  side: -1 | 1,
  canStand: (x: number, z: number) => boolean,
  canReach: (x: number, z: number) => boolean = () => true,
): NavigationPoint | null {
  const towardX = threatX - actorX;
  const towardZ = threatZ - actorZ;
  const distance = Math.hypot(towardX, towardZ);
  if (distance < 0.01) return null;
  const ux = towardX / distance;
  const uz = towardZ / distance;
  const lateralX = -uz * side;
  const lateralZ = ux * side;
  const candidates: Array<{ point: NavigationPoint; score: number }> = [];
  for (const lateral of [7, 9, 11]) {
    for (const offset of [2.5, 5]) {
      const point = {
        x: threatX - ux * offset + lateralX * lateral,
        z: threatZ - uz * offset + lateralZ * lateral,
      };
      if (!canStand(point.x, point.z)) continue;
      candidates.push({
        point,
        score: Math.hypot(point.x - actorX, point.z - actorZ) + lateral * 0.12,
      });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates.find(({ point }) => canReach(point.x, point.z))?.point ?? null;
}

export function selectSquadSignal(
  receiverId: number,
  receiverX: number,
  receiverZ: number,
  signals: SquadSignal[],
  maxDistance: number,
): SquadSignal | null {
  let best: SquadSignal | null = null;
  let bestPriority = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const signal of signals) {
    if (signal.senderId === receiverId) continue;
    const distance = Math.hypot(signal.senderX - receiverX, signal.senderZ - receiverZ);
    if (distance > maxDistance) continue;
    const priority = signal.seenNow || signal.state === "engage" ? 3 : signal.state === "investigate" || signal.state === "search" ? 2 : 1;
    if (priority > bestPriority || (priority === bestPriority && distance < bestDistance)) {
      best = signal;
      bestPriority = priority;
      bestDistance = distance;
    }
  }
  return best;
}

export function coordinatedCombatRole(
  actorId: number,
  targetX: number,
  targetZ: number,
  participants: CombatParticipant[],
): "anchor" | "flanker" {
  const ranked = participants
    .slice()
    .sort((a, b) => {
      const distance = Math.hypot(a.x - targetX, a.z - targetZ) - Math.hypot(b.x - targetX, b.z - targetZ);
      return Math.abs(distance) < 1e-6 ? a.id - b.id : distance;
    });
  return ranked[0]?.id === actorId ? "anchor" : "flanker";
}
