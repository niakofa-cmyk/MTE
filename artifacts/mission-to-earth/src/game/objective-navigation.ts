import {
  findNavigationPath,
  isNavigationSegmentClear,
  type CanStand,
  type NavigationPoint,
} from "./navigation.ts";

export type ObjectiveGuidance = {
  target: NavigationPoint;
  points: NavigationPoint[];
  reachable: boolean;
  requiresDetour: boolean;
};

export function resolveObjectiveHint(
  guidance: Pick<ObjectiveGuidance, "reachable" | "requiresDetour">,
  directHint: string,
  detourHint: string,
  blockedHint: string,
): string {
  if (!guidance.reachable) return blockedHint;
  return guidance.requiresDetour ? detourHint : directHint;
}

export function findReachableObjectiveApproach(
  start: NavigationPoint,
  goal: NavigationPoint,
  canStand: CanStand,
  worldLimit: number,
  maxDistance = 2.5,
): NavigationPoint | null {
  const candidates = [2, 2.4].flatMap((radius) =>
    Array.from({ length: 8 }, (_, index) => {
      const angle = (index * Math.PI) / 4;
      return {
        x: goal.x + Math.cos(angle) * radius,
        z: goal.z + Math.sin(angle) * radius,
      };
    }),
  );

  for (const candidate of candidates) {
    if (Math.hypot(candidate.x - goal.x, candidate.z - goal.z) > maxDistance) continue;
    if (!canStand(candidate.x, candidate.z)) continue;
    if (findNavigationPath(start.x, start.z, candidate.x, candidate.z, canStand, worldLimit)) {
      return candidate;
    }
  }
  return null;
}

const WAYPOINT_REACHED_DISTANCE = 1.25;
const ROUTE_RECHECK_DISTANCE = 0.75;

export class ObjectiveNavigator {
  private goalKey: string | null = null;
  private points: NavigationPoint[] = [];
  private index = 0;
  private checkedFrom: NavigationPoint | null = null;

  reset() {
    this.goalKey = null;
    this.points = [];
    this.index = 0;
    this.checkedFrom = null;
  }

  update(
    start: NavigationPoint,
    goal: NavigationPoint,
    canStand: CanStand,
    worldLimit: number,
  ): ObjectiveGuidance {
    const key = `${goal.x}:${goal.z}:${worldLimit}`;
    const rebuild = () => {
      this.goalKey = key;
      this.points = findNavigationPath(
        start.x,
        start.z,
        goal.x,
        goal.z,
        canStand,
        worldLimit,
      ) ?? [];
      this.index = 0;
      this.checkedFrom = { ...start };
    };

    if (this.goalKey !== key) {
      rebuild();
    } else if (this.points.length > 0) {
      while (
        this.index < this.points.length - 1 &&
        Math.hypot(
          start.x - this.points[this.index]!.x,
          start.z - this.points[this.index]!.z,
        ) <= WAYPOINT_REACHED_DISTANCE
      ) {
        this.index++;
      }

      const current = this.points[this.index];
      const movedSinceCheck =
        this.checkedFrom !== null &&
        Math.hypot(start.x - this.checkedFrom.x, start.z - this.checkedFrom.z) >= ROUTE_RECHECK_DISTANCE;
      if (
        current &&
        movedSinceCheck &&
        !isNavigationSegmentClear(start.x, start.z, current.x, current.z, canStand)
      ) {
        rebuild();
      } else if (movedSinceCheck) {
        this.checkedFrom = { ...start };
      }
    } else {
      // Retry an unreachable route only after the player has moved enough to
      // change which side of the obstruction they are approaching from.
      const movedSinceCheck =
        this.checkedFrom !== null &&
        Math.hypot(start.x - this.checkedFrom.x, start.z - this.checkedFrom.z) >= ROUTE_RECHECK_DISTANCE;
      if (movedSinceCheck) rebuild();
    }

    const remaining = this.points.slice(this.index);
    return {
      target: remaining[0] ?? goal,
      points: remaining,
      reachable: this.points.length > 0,
      requiresDetour: this.points.length > 1,
    };
  }
}
