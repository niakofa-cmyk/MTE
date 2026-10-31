export const CINDER_ROW_MAP_ID = "cinder-row-blackout" as const;
export const CINDER_ROW_MAP_VERSION = "1.0.0" as const;
export const CINDER_ROW_MAX_PLAYERS = 8;
export const CINDER_ROW_RELAY = { x: 0, z: 0, radius: 6 } as const;
export const CINDER_ROW_ROUND_SECONDS = 180;
export const CINDER_ROW_CAPTURE_SECONDS = 20;

export type ArenaTeam = "accord" | "eon-dusk";
export type ArenaRoundPhase = "waiting" | "active" | "finished";

export interface ArenaParticipant {
  playerId: string;
  team: ArenaTeam;
  position: { x: number; z: number };
  alive: boolean;
}

export interface CinderRowRoundSnapshot {
  phase: ArenaRoundPhase;
  remainingSeconds: number;
  relayProgress: number;
  controlledBy: ArenaTeam | null;
  contested: boolean;
  accordPlayers: number;
  duskPlayers: number;
  winner: ArenaTeam | null;
}

export const CINDER_ROW_SPAWNS: Record<ArenaTeam, readonly {
  x: number;
  y: number;
  z: number;
}[]> = {
  accord: [
    { x: -33, y: 0, z: -24 },
    { x: -33, y: 0, z: -18 },
    { x: -33, y: 0, z: 18 },
    { x: -33, y: 0, z: 24 },
  ],
  "eon-dusk": [
    { x: 33, y: 0, z: -24 },
    { x: 33, y: 0, z: -18 },
    { x: 33, y: 0, z: 18 },
    { x: 33, y: 0, z: 24 },
  ],
};

export class CinderRowRelayRound {
  private phase: ArenaRoundPhase = "waiting";
  private remainingSeconds = CINDER_ROW_ROUND_SECONDS;
  private claimingTeam: ArenaTeam | null = null;
  private claimSeconds = 0;
  private controlledBy: ArenaTeam | null = null;
  private contested = false;
  private winner: ArenaTeam | null = null;
  private accordPlayers = 0;
  private duskPlayers = 0;

  step(deltaSeconds: number, participants: readonly ArenaParticipant[]): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const dt = Math.min(deltaSeconds, 0.1);
    const alive = participants.filter((participant) =>
      participant.alive &&
      Number.isFinite(participant.position.x) &&
      Number.isFinite(participant.position.z),
    );
    this.accordPlayers = alive.filter((participant) => participant.team === "accord").length;
    this.duskPlayers = alive.filter((participant) => participant.team === "eon-dusk").length;

    if (this.phase === "waiting") {
      if (this.accordPlayers > 0 && this.duskPlayers > 0) this.phase = "active";
      else return;
    }
    if (this.phase !== "active") return;

    this.remainingSeconds = Math.max(0, this.remainingSeconds - dt);
    const inside = alive.filter((participant) =>
      Math.hypot(
        participant.position.x - CINDER_ROW_RELAY.x,
        participant.position.z - CINDER_ROW_RELAY.z,
      ) <= CINDER_ROW_RELAY.radius,
    );
    const accordInside = inside.some((participant) => participant.team === "accord");
    const duskInside = inside.some((participant) => participant.team === "eon-dusk");
    this.contested = accordInside && duskInside;

    if (!this.contested && accordInside !== duskInside) {
      const team: ArenaTeam = accordInside ? "accord" : "eon-dusk";
      if (this.claimingTeam === team) {
        this.claimSeconds = Math.min(CINDER_ROW_CAPTURE_SECONDS, this.claimSeconds + dt);
      } else if (this.claimSeconds > 0) {
        this.claimSeconds = Math.max(0, this.claimSeconds - dt);
        if (this.claimSeconds === 0) this.claimingTeam = team;
      } else {
        this.claimingTeam = team;
        this.claimSeconds = dt;
      }

      if (this.claimSeconds >= CINDER_ROW_CAPTURE_SECONDS) {
        this.claimSeconds = CINDER_ROW_CAPTURE_SECONDS;
        this.controlledBy = team;
        this.winner = team;
        this.phase = "finished";
      }
    }

    if (this.remainingSeconds === 0 && this.phase === "active") {
      this.winner = this.claimSeconds >= CINDER_ROW_CAPTURE_SECONDS / 2
        ? this.claimingTeam
        : null;
      this.phase = "finished";
    }
  }

  snapshot(): CinderRowRoundSnapshot {
    return {
      phase: this.phase,
      remainingSeconds: Number(this.remainingSeconds.toFixed(2)),
      relayProgress: Number(((this.claimSeconds / CINDER_ROW_CAPTURE_SECONDS) * 100).toFixed(1)),
      controlledBy: this.controlledBy,
      contested: this.contested,
      accordPlayers: this.accordPlayers,
      duskPlayers: this.duskPlayers,
      winner: this.winner,
    };
  }
}
