import { useId } from "react";
import { Radio, Users, Timer, Shield, Swords, Signal, ArrowUpRight, Copy } from "lucide-react";

export type CinderRowPanelProps = {
  screen: "menu" | "hud";
  serverStatus: "idle" | "connecting" | "connected" | "error";
  serverMessage: string | null;
  matchId: string | null;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onRankedProfileChange: (profileId: "cinder-row-relay-4v4" | "cinder-row-relay-8v8") => void;
  team: "accord" | "eon-dusk" | null;
  rankedQueue: {
    state: "idle" | "interrupted" | "queued" | "matched";
    rating: number;
    position?: number;
    queuedPlayers?: number;
  };
  rankedProfileId: "cinder-row-relay-4v4" | "cinder-row-relay-8v8";
  round: null | {
    phase: "waiting" | "active" | "finished";
    remainingSeconds: number;
    relayProgress: number;
    controlledBy: "accord" | "eon-dusk" | null;
    contested: boolean;
    accordPlayers: number;
    duskPlayers: number;
    winner: "accord" | "eon-dusk" | null;
  };
  onHost: () => void;
  onJoin: () => void;
  onCopyMatchId: () => void;
  onRankedAction: () => void;
};

const TEAM_LABELS = {
  accord: "ACCORD",
  "eon-dusk": "EON DUSK",
} as const;

const LANES = ["Ashway", "Transit Spine", "Service Undercroft"] as const;

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function StatusPip({ status }: { status: CinderRowPanelProps["serverStatus"] }) {
  const copy = {
    idle: "STANDBY",
    connecting: "ESTABLISHING LINK",
    connected: "LINK SECURE",
    error: "LINK FAILURE",
  }[status];

  return (
    <span className={`inline-flex items-center gap-2 font-display text-[10px] tracking-[.18em] ${status === "error" ? "text-gold" : status === "connected" ? "text-cyan" : "text-muted"}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${status === "connecting" ? "animate-pulse bg-gold" : status === "connected" ? "bg-cyan" : status === "error" ? "bg-gold" : "bg-muted"}`} />
      {copy}
    </span>
  );
}

function TeamTag({ team }: { team: CinderRowPanelProps["team"] }) {
  if (!team) return <span className="text-muted">UNASSIGNED</span>;
  return <span className={team === "accord" ? "text-cyan" : "text-gold"}>{TEAM_LABELS[team]}</span>;
}

export function CinderRowPanel({
  screen,
  serverStatus,
  serverMessage,
  matchId,
  joinCode,
  onJoinCodeChange,
  onRankedProfileChange,
  team,
  rankedQueue,
  rankedProfileId,
  round,
  onHost,
  onJoin,
  onCopyMatchId,
  onRankedAction,
}: CinderRowPanelProps) {
  const codeId = useId();
  const isConnecting = serverStatus === "connecting";
  const actionsLocked =
    isConnecting ||
    serverStatus === "connected" ||
    rankedQueue.state === "queued" ||
    rankedQueue.state === "matched";
  const progress = round ? Math.min(100, Math.max(0, round.relayProgress)) : 0;
  const teamCapacity = rankedProfileId === "cinder-row-relay-8v8" ? 8 : 4;
  const phaseLabel = round?.phase === "active" ? "LIVE ROUND" : round?.phase === "finished" ? "ROUND COMPLETE" : "AWAITING OPERATORS";
  const controlledLabel = round?.contested
    ? "CONTESTED"
    : round?.controlledBy
      ? `${TEAM_LABELS[round.controlledBy]} CONTROL`
      : "NO CONTROL";

  if (screen === "hud") {
    return (
      <section
        aria-label="Cinder Row round status"
        data-testid="cinder-row-hud"
        className="w-full max-w-[27rem] border border-line/80 bg-background/90 p-3 text-fg shadow-xl backdrop-blur-md sm:p-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/70 pb-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-[10px] tracking-[.22em] text-cyan">
              <Radio className="size-3.5" aria-hidden="true" /> CINDER ROW <span className="text-muted">/</span> BLACKOUT
            </p>
            <p className="mt-1 truncate font-display text-xs tracking-widest text-muted">{phaseLabel}{matchId ? ` · ${matchId}` : ""}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[10px] tracking-widest text-muted">YOUR SIDE</p>
            <p className="mt-0.5 font-display text-xs font-bold tracking-widest"><TeamTag team={team} /></p>
          </div>
        </div>

        {round ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-3">
              <div>
                <p className="font-display text-[10px] tracking-widest text-cyan">ACCORD</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-display text-lg leading-none">
                  <Users className="size-3.5 text-muted" aria-hidden="true" /> {round.accordPlayers}<span className="text-xs text-muted">/{teamCapacity}</span>
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-[9px] tracking-[.18em] text-muted">ROUND TIME</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 font-mono text-lg tabular-nums text-fg">
                  <Timer className="size-3.5 text-gold" aria-hidden="true" /> {formatTime(round.remainingSeconds)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[10px] tracking-widest text-gold">EON DUSK</p>
                <p className="mt-0.5 flex items-center justify-end gap-1.5 font-display text-lg leading-none">
                  <Users className="size-3.5 text-muted" aria-hidden="true" /> {round.duskPlayers}<span className="text-xs text-muted">/{teamCapacity}</span>
                </p>
              </div>
            </div>

            <div className="border-t border-line/70 pt-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-display text-[10px] tracking-widest text-fg">
                  <Shield className="size-3 text-cyan" aria-hidden="true" /> RELAY · {controlledLabel}
                </span>
                <span className="font-mono text-xs tabular-nums text-cyan">{Math.round(progress)}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden bg-line"
                role="progressbar"
                aria-label="Relay progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div className={`h-full transition-[width] duration-300 ${round.contested ? "bg-gold" : "bg-cyan"}`} style={{ width: `${progress}%` }} />
              </div>
              {round.phase === "finished" && round.winner ? (
                <p className={`mt-2 font-display text-[10px] tracking-[.18em] ${round.winner === "accord" ? "text-cyan" : "text-gold"}`}>
                  <Swords className="mr-1 inline size-3" aria-hidden="true" /> {TEAM_LABELS[round.winner]} VICTORIOUS
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 py-4 text-xs tracking-wide text-muted" role="status">
            <Signal className="size-4 text-cyan" aria-hidden="true" /> Round telemetry unavailable.
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-line/70 pt-2" aria-label="Cinder Row lanes">
          {LANES.map((lane, index) => (
            <span key={lane} className="font-display text-[9px] tracking-widest text-muted">
              <span className="text-cyan">0{index + 1}</span> {lane.toUpperCase()}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="cinder-row-title"
      data-testid="cinder-row-menu"
      className="field-panel w-full max-w-3xl p-4 sm:p-5"
    >
      <div className="field-panel__heading">
        <span className="inline-flex items-center gap-2 font-display text-xs tracking-[.2em] text-cyan">
          <Radio className="size-3.5" aria-hidden="true" /> BLACKOUT / ARENA LINK
        </span>
        <span className="field-panel__rule" aria-hidden="true" />
        <StatusPip status={serverStatus} />
      </div>

      <div className="grid gap-5 pt-4 md:grid-cols-[1fr_1.05fr] md:gap-7">
        <div>
          <p className="font-display text-[10px] tracking-[.22em] text-gold">EARTH · NOD SECTOR 07</p>
          <h2 id="cinder-row-title" className="mt-1 font-display text-3xl font-bold leading-none tracking-wide text-fg sm:text-4xl">
            CINDER ROW
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Compact relay-control engagement. Two teams, up to {teamCapacity} operators per side.
          </p>
          <div className="mt-4 grid grid-cols-3 border-y border-line/70 py-2.5">
            {LANES.map((lane, index) => (
              <div key={lane} className={`${index ? "border-l border-line/70 pl-2 sm:pl-3" : "pr-2"} min-w-0`}>
                <p className="font-display text-[9px] tracking-widest text-cyan">LANE 0{index + 1}</p>
                <p className="mt-1 text-[11px] leading-tight text-fg sm:text-xs">{lane}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-display tracking-widest">
            <span><span className="text-cyan">ACCORD</span> <span className="text-muted">/ BLUE RELAY</span></span>
            <span><span className="text-gold">EON DUSK</span> <span className="text-muted">/ OPPOSING FORCE</span></span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onHost}
              disabled={actionsLocked}
              className="field-deploy-button flex min-h-12 items-center justify-center gap-2 px-3 py-2 font-display text-sm font-bold tracking-[.13em] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
              aria-label={
                isConnecting
                  ? "Establishing arena connection"
                  : serverStatus === "connected"
                    ? "Cinder Row match connected"
                    : "Create private Cinder Row match"
              }
            >
              {isConnecting ? <span className="size-3.5 animate-pulse rounded-full border border-current" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}
              {isConnecting ? "LINKING…" : serverStatus === "connected" ? "MATCH LINKED" : "CREATE PRIVATE MATCH"}
            </button>
            <div className="flex min-h-12 flex-col justify-center border border-line/70 bg-background/40 px-3">
              <span className="font-display text-[9px] tracking-[.18em] text-muted">YOUR TEAM</span>
              <span className="mt-0.5 font-display text-xs font-bold tracking-widest"><TeamTag team={team} /></span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Custom matches are unranked. Invite players with the match ID; ranked matchmaking is below.
          </p>

          <form
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!actionsLocked && joinCode.trim()) onJoin();
            }}
          >
            <label className="min-w-0">
              <span className="sr-only">Match ID</span>
              <input
                id={codeId}
                type="text"
                autoComplete="off"
                value={joinCode}
                onChange={(event) => onJoinCodeChange(event.currentTarget.value)}
                placeholder="PASTE MATCH ID"
                aria-label="Match ID"
                disabled={actionsLocked}
                className="h-full min-h-11 w-full border border-line bg-background/60 px-3 font-mono text-sm tracking-[.12em] text-fg placeholder:text-muted/70 focus:border-cyan focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={actionsLocked || !joinCode.trim()}
              className="field-action-button min-h-11 border border-cyan/60 px-4 font-display text-xs tracking-[.16em] text-cyan disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Join match using entered match ID"
            >
              JOIN
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 border border-line/70 bg-background/35 p-2.5">
            <div className="min-w-0">
              <label className="flex items-center gap-2">
                <span className="font-display text-[10px] tracking-[.16em] text-cyan">
                  RANKED RELAY
                </span>
                <select
                  aria-label="Ranked team size"
                  value={rankedProfileId}
                  onChange={(event) => onRankedProfileChange(
                    event.currentTarget.value as "cinder-row-relay-4v4" | "cinder-row-relay-8v8",
                  )}
                  disabled={actionsLocked}
                  className="border border-line bg-background px-2 py-1 font-display text-[10px] tracking-wider text-fg disabled:opacity-50"
                >
                  <option value="cinder-row-relay-4v4">4V4</option>
                  <option value="cinder-row-relay-8v8">8V8</option>
                </select>
              </label>
              <p className="mt-1 text-xs text-muted">
                {rankedQueue.state === "queued"
                  ? `Search position ${rankedQueue.position ?? 1} · ${rankedQueue.queuedPlayers ?? 1} operators`
                  : rankedQueue.state === "matched"
                    ? rankedProfileId === "cinder-row-relay-8v8"
                      ? "A sixteen-player match is ready."
                      : "An eight-player match is ready."
                    : rankedQueue.state === "interrupted"
                      ? "Previous match interrupted. No rating change."
                    : "Rating"}
                <span className="ml-2 font-mono tabular-nums text-fg">{rankedQueue.rating} ELO</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onRankedAction}
              disabled={isConnecting || serverStatus === "connected"}
              className="field-action-button min-h-10 border border-cyan/60 px-3 font-display text-[10px] tracking-[.14em] text-cyan disabled:cursor-not-allowed disabled:opacity-40"
            >
              {rankedQueue.state === "queued"
                ? "CANCEL SEARCH"
                : rankedQueue.state === "matched"
                  ? "JOIN RANKED MATCH"
                  : rankedQueue.state === "interrupted"
                    ? "FIND NEW MATCH"
                  : "FIND RANKED MATCH"}
            </button>
          </div>

          {matchId ? (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border border-cyan/30 bg-background/45 p-2">
              <label className="min-w-0">
                <span className="mb-1 flex items-center gap-1.5 font-display text-[9px] tracking-[.15em] text-cyan">
                  <Signal className="size-3 shrink-0" aria-hidden="true" />
                  PRIVATE MATCH ID · SHARE TO INVITE
                </span>
                <input
                  type="text"
                  readOnly
                  value={matchId}
                  aria-label="Private match ID to share"
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  className="h-9 w-full min-w-0 select-all border border-line bg-background px-2 font-mono text-xs text-fg focus:border-cyan focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={onCopyMatchId}
                aria-label="Copy Match ID"
                title="Copy Match ID"
                className="field-action-button flex min-h-9 items-center justify-center gap-1.5 border border-cyan/60 px-2 font-display text-[9px] tracking-widest text-cyan hover:bg-cyan/10"
              >
                <Copy className="size-3" aria-hidden="true" />
                COPY ID
              </button>
            </div>
          ) : null}
          {serverStatus === "error" ? (
            <p role="alert" className="border-l-2 border-gold pl-2 text-xs leading-relaxed text-gold">
              {serverMessage || "Arena link could not be established."}
            </p>
          ) : serverMessage ? (
            <p role="status" className="text-xs leading-relaxed text-muted">{serverMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CinderRowPanel;
