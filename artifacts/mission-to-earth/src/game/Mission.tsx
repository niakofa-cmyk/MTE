import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Crosshair, Radio, Shield, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { BLOODLINES, DOSSIER, OPERATORS, OPERATOR_BY_ID, type OpId, type WeaponId } from "@/game/content";
import { MissionEngine, type MissionEvent } from "@/game/engine";
import { CityOfNodBackdrop } from "@/game/city-of-nod-backdrop";
import { ATTACHMENT_BY_ID, type AttachSlot } from "@/game/loot";
import { extractionEpilogue } from "@/game/mission-epilogue";
import {
  DEFAULT_LOOK_SENSITIVITY,
  LOOK_SENSITIVITY_STORAGE_KEY,
  MAX_LOOK_SENSITIVITY,
  MIN_LOOK_SENSITIVITY,
  LOOK_SENSITIVITY_STEP,
  normalizeLookSensitivity,
  parseLookSensitivity,
} from "@/game/settings";
import {
  ensureCredits,
  labelForRegistry,
  loadMars,
  saveMars,
  setActiveSlot,
  setPresetMod,
  type MarsProfile,
  type ModField,
} from "@/game/mars-stash";
import { persistExtractionWin, recoverPendingExtraction } from "@/game/mission-progress";
import { type RecordBook } from "@/game/progress-record";
import {
  applyTouchCommand,
  LEGACY_SPRINT_SHOVE_PX,
  SPRINT_SHOVE_PX,
  TouchControllerLayer,
  type TouchCommand,
  type TouchZone,
} from "@/game/touch-controller";
import {
  ServerMatchClient,
  parseServerProfile,
  type ServerExtractionStatus,
  type ServerInventoryItem,
  type ServerPlayerProfile,
} from "@/game/server-match-client";

type Screen = "menu" | "dossier" | "armory" | "settings" | "inventory" | "play" | "pause" | "dead" | "win";
const LOCAL_SAVE_WARNING = "Progress is still available in this session, but this browser could not save it locally.";

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function Mission() {
  const auth = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MissionEngine | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [op, setOp] = useState<OpId>("jaya");
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<{ time: number; kills: number; op: OpId; scrap: number; filed: string[]; hasEonDuskPlans: boolean } | null>(null);
  const [record, setRecord] = useState<RecordBook | null>(null);
  const [mars, setMars] = useState<MarsProfile | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [serverClient, setServerClient] = useState<ServerMatchClient | null>(null);
  const [serverInventory, setServerInventory] = useState<ServerInventoryItem[]>([]);
  const [serverStatus, setServerStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [persistentProfile, setPersistentProfile] = useState<ServerPlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [serverExtraction, setServerExtraction] = useState<ServerExtractionStatus | null>(null);
  const settlementInFlight = useRef(false);
  const [graphicsUnavailable, setGraphicsUnavailable] = useState(false);
  const [lookSensitivity, setLookSensitivity] = useState(() => {
    try {
      return parseLookSensitivity(localStorage.getItem(LOOK_SENSITIVITY_STORAGE_KEY));
    } catch {
      return DEFAULT_LOOK_SENSITIVITY;
    }
  });
  const chosen = OPERATOR_BY_ID[op];

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setPersistentProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    fetch("/api/profile", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load saved inventory (${response.status}).`);
        return parseServerProfile(await response.json());
      })
      .then((profile) => {
        if (active) setPersistentProfile(profile);
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileError(error instanceof Error ? error.message : "Could not load saved inventory.");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.isAuthenticated, auth.user?.id]);

  useEffect(() => {
    const recovery = recoverPendingExtraction();
    const loadedRecord = recovery.record;
    setRecord(loadedRecord);
    const loadedMars = recovery.mars;
    const seeded = recovery.pending ? loadedMars : ensureCredits(loadedMars, loadedRecord.scrap);
    if (recovery.pending) {
      setSaveWarning(LOCAL_SAVE_WARNING);
    } else if (seeded.martianCredits !== loadedMars.martianCredits && !saveMars(seeded)) {
      setSaveWarning(LOCAL_SAVE_WARNING);
    }
    setMars(seeded);
    const host = hostRef.current;
    const root = rootRef.current;
    if (!host || !root) return;
    let engine: MissionEngine;
    try {
      engine = new MissionEngine(host, {
        onEvent: (event: MissionEvent) => {
          if (event.type === "mode") setScreen(event.mode === "play" ? "play" : "menu");
          if (event.type === "pause") setScreen(event.paused ? "pause" : "play");
          if (event.type === "dead") setScreen("dead");
          if (event.type === "win") {
            setStats({
              time: event.time,
              kills: event.kills,
              op: event.op,
              scrap: event.scrap,
              filed: event.manifest.map((piece) => labelForRegistry(piece.itemRegistryId)),
              hasEonDuskPlans: event.manifest.some((piece) => piece.itemRegistryId === "intel_eon_dusk_schematic"),
            });
            setScreen("win");
            const progress = persistExtractionWin(event);
            setMars(progress.mars);
            setRecord(progress.record);
            setSaveWarning(progress.saved ? null : LOCAL_SAVE_WARNING);
          }
          if (event.type === "error") setScreen("menu");
        },
      });
    } catch (error) {
      setGraphicsUnavailable(true);
      console.warn("Mission To Earth needs WebGL to render the game.", error);
      return;
    }
    engine.bind(root);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setLookSensitivity(lookSensitivity);
  }, [lookSensitivity]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !serverClient || screen !== "play") return;

    serverClient.setInputErrorHandler((error) => {
      setServerMessage(`Input sync: ${error.message}`);
    });
    const inputTimer = window.setInterval(() => {
      const current = engineRef.current;
      if (current) serverClient.submitInput(current.matchInput());
    }, 50);
    const snapshotTimer = window.setInterval(() => {
      void serverClient.getSnapshot()
        .then((snapshot) => {
          engineRef.current?.applyServerSnapshot(
            snapshot.players,
            serverClient.localPlayerId,
          );
        })
        .catch((error: unknown) => {
          setServerMessage(error instanceof Error ? error.message : "Match position sync failed.");
        });
    }, 200);
    const gameplayTimer = window.setInterval(() => {
      void serverClient.getGameplayState()
        .then((state) => {
          setServerInventory(state.inventory);
          engineRef.current?.applyServerGameplayState(state);
        })
        .catch((error: unknown) => {
          setServerMessage(error instanceof Error ? error.message : "Match inventory sync failed.");
        });
      if (auth.isAuthenticated) {
        void serverClient.getExtractionStatus()
          .then((status) => {
            setServerExtraction(status);
            if (status.ready && !status.settled && !settlementInFlight.current) {
              settlementInFlight.current = true;
              void serverClient.settleExtraction()
                .then((settlement) => {
                  setPersistentProfile(settlement.profile);
                  setServerInventory(settlement.inventory);
                  setServerExtraction({ ...status, settled: true, ready: true, progress: 1 });
                  setServerMessage(
                    `Extraction secured · ${settlement.creditsAwarded} salvage credits added to your account.`,
                  );
                })
                .catch((error: unknown) => {
                  setServerMessage(error instanceof Error ? error.message : "Could not secure the extraction.");
                })
                .finally(() => {
                  settlementInFlight.current = false;
                });
            }
          })
          .catch((error: unknown) => {
            setServerMessage(error instanceof Error ? error.message : "Extraction status sync failed.");
          });
      }
    }, 1500);

    return () => {
      window.clearInterval(inputTimer);
      window.clearInterval(snapshotTimer);
      window.clearInterval(gameplayTimer);
      serverClient.setInputErrorHandler(null);
    };
  }, [screen, serverClient, auth.isAuthenticated]);

  const startServerRun = async () => {
    if (graphicsUnavailable || serverStatus === "connecting") return;
    if (!auth.isAuthenticated) {
      setServerMessage("Sign in before starting a server run so extracted rewards can be saved to your account.");
      return;
    }
    setServerStatus("connecting");
    setServerMessage(null);
    setServerExtraction(null);
    settlementInFlight.current = false;
    try {
      const connected = await ServerMatchClient.connect({ operatorId: op });
      const engine = engineRef.current;
      if (!engine) throw new Error("The game is not ready to start.");
      engine.start(connected.operatorId, connected.player.position);
      engine.enableServerGameplay(connected.gameplay, {
        claimLoot: async (lootId) => {
          const result = await connected.client.claimLoot(lootId);
          setServerInventory(result.inventory);
          setServerMessage(null);
          return result;
        },
        openTerminal: async (terminalId) => {
          const state = await connected.client.openTerminal(terminalId);
          setServerInventory(state.inventory);
          setServerMessage(null);
          return state;
        },
        inventoryChanged: setServerInventory,
      });
      connected.client.setInputErrorHandler((error) => {
        setServerMessage(`Input sync: ${error.message}`);
      });
      setServerClient(connected.client);
      setServerInventory(connected.gameplay.inventory);
      setServerStatus("connected");
      engine.capture();
    } catch (error) {
      setServerStatus("error");
      setServerMessage(error instanceof Error ? error.message : "Could not connect to the match server.");
    }
  };

  const playing = screen === "play" || screen === "pause" || screen === "dead" || screen === "win";

  return (
    <div ref={rootRef} className="fixed inset-0 select-none overflow-hidden bg-bg text-fg">
      <div ref={hostRef} className="absolute inset-0" />
      {graphicsUnavailable ? <CityOfNodBackdrop /> : null}
      {graphicsUnavailable ? (
        <p
          role="status"
          className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm border border-danger/60 bg-surface px-4 py-3 text-sm text-fg shadow-xl"
        >
          This preview browser cannot render 3D because WebGL is unavailable. Enable WebGL and hardware acceleration, then reload to play.
        </p>
      ) : null}
      <Hud
        live={playing}
        onEngage={() => engineRef.current?.capture()}
      />
      {saveWarning ? (
        <p role="alert" className="fixed bottom-4 left-4 z-50 max-w-sm border border-danger/60 bg-surface px-4 py-3 text-sm text-fg shadow-xl">
          {saveWarning}
        </p>
      ) : null}
      {screen === "menu" || screen === "dossier" || screen === "armory" || screen === "settings" || screen === "inventory" ? (
        <Menu
          op={op}
          setOp={setOp}
          panel={screen === "dossier" ? "dossier" : screen === "armory" ? "armory" : screen === "settings" ? "settings" : screen === "inventory" ? "inventory" : "ops"}
          record={record}
          mars={mars}
          lookSensitivity={lookSensitivity}
          graphicsUnavailable={graphicsUnavailable}
          canStart={!graphicsUnavailable}
          serverStatus={serverStatus}
          serverMessage={serverMessage}
          authName={auth.user?.firstName || auth.user?.email || null}
          authLoading={auth.isLoading}
          isAuthenticated={auth.isAuthenticated}
          profile={persistentProfile}
          profileLoading={profileLoading}
          profileError={profileError}
          onLogin={() => auth.login("/")}
          onLogout={() => auth.logout("/")}
          onInventory={() => setScreen("inventory")}
          onDossier={() => setScreen("dossier")}
          onArmory={() => setScreen("armory")}
          onSettings={() => setScreen("settings")}
          onBack={() => setScreen("menu")}
          onLookSensitivityChange={(value) => {
            const next = normalizeLookSensitivity(value);
            setLookSensitivity(next);
            try {
              localStorage.setItem(LOOK_SENSITIVITY_STORAGE_KEY, String(next));
            } catch {
              // The setting still applies for this session when storage is unavailable.
            }
          }}
          onMars={(next) => {
            setSaveWarning(saveMars(next) ? null : LOCAL_SAVE_WARNING);
            setMars(next);
          }}
          onStart={() => {
            engineRef.current?.disableServerGameplay();
            setServerClient(null);
            setServerInventory([]);
            setServerStatus("idle");
            setServerMessage(null);
            engineRef.current?.start(op);
            engineRef.current?.capture();
          }}
          onStartServer={() => void startServerRun()}
        />
      ) : null}
      {serverClient && screen !== "menu" && screen !== "dossier" && screen !== "armory" && screen !== "settings" && screen !== "inventory" ? (
        <aside
          aria-live="polite"
          aria-label="Server match inventory"
          className="fixed right-4 top-4 z-40 max-h-[38vh] w-64 overflow-y-auto border border-cyan/50 bg-bg/90 p-3 text-fg shadow-xl backdrop-blur"
        >
          <p className="font-display text-xs tracking-widest text-cyan">SERVER CACHE · {serverInventory.length}</p>
          {serverInventory.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {serverInventory.slice(-6).reverse().map((item) => (
                <li key={item.lootId} className="flex justify-between gap-3 border-t border-line/60 pt-1.5">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-gold">{item.scrap ? `+${item.scrap}` : item.kind.toUpperCase()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">No claimed items in this match yet.</p>
          )}
          {serverExtraction && (serverExtraction.inRange || serverExtraction.ready || serverExtraction.settled) ? (
            <div className="mt-3 border-t border-cyan/30 pt-2">
              <p className="font-display text-xs tracking-widest text-gold">
                {serverExtraction.settled ? "EXTRACTION SECURED" : serverExtraction.ready ? "RECOVERY READY" : "RECOVERY HOLD"}
              </p>
              <progress className="mt-2 h-2 w-full accent-cyan" max={1} value={serverExtraction.progress} />
              <p className="mt-1 text-xs text-muted">
                {serverExtraction.settled
                  ? "Rewards saved to your account."
                  : `${Math.ceil(serverExtraction.requiredSeconds * (1 - serverExtraction.progress))}s remaining in zone`}
              </p>
            </div>
          ) : null}
          {serverMessage ? <p role="status" className="mt-2 text-xs text-gold">{serverMessage}</p> : null}
        </aside>
      ) : null}
      {screen === "pause" ? (
        <Overlay
          kicker="Hold"
          title="Paused"
          body="The zone does not pause for anyone else. It is waiting on you."
        >
          <button type="button" className="bg-cyan px-5 py-3 font-display text-lg tracking-widest text-bg" onClick={() => engineRef.current?.resume()}>
            Resume
          </button>
          <button
            type="button"
            className="border border-line px-5 py-3 font-display text-lg tracking-widest text-fg"
            onClick={() => setMuted(engineRef.current?.toggleMute() ?? muted)}
          >
            <span className="inline-flex items-center gap-2">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              {muted ? "Sound off" : "Sound on"}
            </span>
          </button>
          <button type="button" className="px-5 py-3 font-display text-lg tracking-widest text-muted" onClick={() => engineRef.current?.abort()}>
            Abort mission
          </button>
        </Overlay>
      ) : null}
      {screen === "dead" ? (
        <Overlay
          kicker="Down"
          title="Signal lost"
          body="Nod keeps the body. The lineages are still in the smoke unless you already walked them out. Reinsert at the objective."
        >
          <button type="button" className="bg-cyan px-5 py-3 font-display text-lg tracking-widest text-bg" onClick={() => engineRef.current?.reinsert()}>
            Reinsert
          </button>
          <button type="button" className="px-5 py-3 font-display text-lg tracking-widest text-muted" onClick={() => engineRef.current?.abort()}>
            Return to the Shakuna
          </button>
        </Overlay>
      ) : null}
      {screen === "win" && stats ? (
        <Overlay
          kicker="Operation Shakuna"
          title="Going home"
          body={`${OPERATOR_BY_ID[stats.op].name} got Ananda and Nefret off the pad in ${clock(stats.time)}. ${stats.kills} Eon Dusk security officers went quiet. ${stats.scrap > 0 ? `Hauled ${stats.scrap} scrap off the pad.` : "The pad took no scrap this run."} ${stats.filed.length ? `The Nod field log records ${stats.filed.join(", ")}.` : ""} ${extractionEpilogue(stats.hasEonDuskPlans)}`}
        >
          <p className="font-display text-sm tracking-widest text-gold">
            {record
              ? `${record.extractions} extractions · best ${record.best ? clock(record.best) : "—"} · ${mars?.martianCredits ?? record.scrap} salvage credits`
              : ""}
          </p>
          <button type="button" className="bg-gold px-5 py-3 font-display text-lg tracking-widest text-bg" onClick={() => engineRef.current?.abort()}>
            File the report
          </button>
        </Overlay>
      ) : null}
      {screen === "play" ? <Touch engineRef={engineRef} /> : null}
      <p className="sr-only">
        Playing as {chosen.name}. Mission To Earth, city of Nod.
      </p>
    </div>
  );
}

function Menu({
  op,
  setOp,
  panel,
  record,
  mars,
  lookSensitivity,
  graphicsUnavailable,
  canStart,
  serverStatus,
  serverMessage,
  authName,
  authLoading,
  isAuthenticated,
  profile,
  profileLoading,
  profileError,
  onDossier,
  onArmory,
  onSettings,
  onInventory,
  onLogin,
  onLogout,
  onBack,
  onLookSensitivityChange,
  onMars,
  onStart,
  onStartServer,
}: {
  op: OpId;
  setOp: (id: OpId) => void;
  panel: "ops" | "dossier" | "armory" | "settings" | "inventory";
  record: RecordBook | null;
  mars: MarsProfile | null;
  lookSensitivity: number;
  graphicsUnavailable: boolean;
  canStart: boolean;
  serverStatus: "idle" | "connecting" | "connected" | "error";
  serverMessage: string | null;
  authName: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  profile: ServerPlayerProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  onDossier: () => void;
  onArmory: () => void;
  onSettings: () => void;
  onInventory: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onBack: () => void;
  onLookSensitivityChange: (value: number) => void;
  onMars: (next: MarsProfile) => void;
  onStart: () => void;
  onStartServer: () => void;
}) {
  return (
    <main
      className={`field-menu absolute inset-0 overflow-y-auto overscroll-y-contain ${graphicsUnavailable ? "field-menu--fallback" : ""}`}
      data-field-menu
      data-testid="screen-command-menu"
    >
      <div className="field-menu__layout mx-auto flex min-h-full max-w-7xl flex-col gap-7 px-4 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-center lg:gap-12 lg:px-12">
        <section className="field-menu__brief lg:w-[34%] lg:shrink-0" aria-labelledby="operation-title">
          <p className="inline-flex items-center gap-2 font-display text-sm tracking-[.2em] text-cyan">
            <Radio className="size-4" />
            ACCORD FIELD COMMAND <span aria-hidden="true">/</span> NOD SECTOR 07
          </p>
          <h1 id="operation-title" className="mt-3 font-display text-5xl font-bold leading-[.88] tracking-tight text-fg sm:text-7xl xl:text-8xl">
            MISSION<br />TO EARTH
          </h1>
          <p className="mt-4 font-display text-lg font-semibold tracking-[.16em] text-gold">OPERATION SHAKUNA · EARTH</p>
          <div className="field-objective mt-5 max-w-xl" role="group" aria-label="Mission objective" data-testid="text-mission-objective">
            <p className="field-objective__label font-display text-xs tracking-[.2em] text-cyan">MISSION ORDERS</p>
            <p className="mt-2 text-base leading-relaxed text-fg sm:text-lg">
              Free <strong>Ananda</strong> and <strong>Nefret</strong>. Raise the <strong>Accord beacon</strong>. Reach the <strong>recovery pad</strong>.
            </p>
            <p className="mt-3 border-t border-line/70 pt-3 text-sm leading-relaxed text-muted">
              Select an operator, then deploy. Press <kbd>B</kbd> near a freed captive to take up their abilities.
            </p>
          </div>
          <p className="mt-4 text-sm text-muted">A four-person Accord team enters occupied Nod. Free the captives before Eon Dusk locks down the district.</p>
          {record && record.extractions > 0 ? (
            <p className="mt-4 border-l-2 border-gold pl-3 font-display text-sm tracking-widest text-gold">
              FIELD RECORD · {record.extractions} extractions · {record.kills} confirmed
              {record.scrap > 0 ? ` · ${mars?.martianCredits ?? record.scrap} salvage credits` : ""}
            </p>
          ) : null}
        </section>
        <section className="field-menu__workspace min-w-0 flex-1" aria-label="Field command console">
          <div className="field-panel__heading">
            <span className="font-display text-xs tracking-[.2em] text-cyan">{panel === "ops" ? "DEPLOYMENT ROSTER" : `FIELD FILE / ${panel.toUpperCase()}`}</span>
            <span className="field-panel__rule" aria-hidden="true" />
            <span className="font-display text-xs tracking-widest text-muted">PRE-DEPLOYMENT</span>
          </div>
        {panel === "dossier" ? (
          <div className="field-panel grid gap-4 p-4 sm:p-5 md:grid-cols-3" data-testid="panel-dossier">
            {DOSSIER.map((act) => (
              <article
                key={act.title}
                className="field-dossier-act"
                data-testid={`card-dossier-${act.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <p className="font-display text-xs tracking-widest text-gold">{act.kicker}</p>
                <h2 className="mt-1 font-display text-2xl text-fg">{act.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{act.body}</p>
              </article>
            ))}
          </div>
        ) : panel === "armory" ? (
          <Armory opWeapon={OPERATOR_BY_ID[op].weapon} profile={mars} onMars={onMars} />
        ) : panel === "settings" ? (
          <SettingsPanel sensitivity={lookSensitivity} onSensitivityChange={onLookSensitivityChange} />
        ) : panel === "inventory" ? (
          <InventoryPanel
            profile={profile}
            loading={profileLoading}
            error={profileError}
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
          />
        ) : (
          <>
          <div className="field-operator-list flex gap-3 overflow-x-auto pb-3" role="group" aria-label="Choose an operator">
            {OPERATORS.map((card) => {
              const on = card.id === op;
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-pressed={on}
                  data-testid={`button-operator-${card.id}`}
                  onClick={() => setOp(card.id)}
                  className={`field-operator-card w-64 shrink-0 border p-4 text-left ${on ? (card.tone === "cyan" ? "field-operator-card--cyan" : "field-operator-card--gold") : ""}`}
                >
                  <p className={`inline-flex items-center gap-2 font-display text-xs tracking-widest ${card.tone === "cyan" ? "text-cyan" : "text-gold"}`}>
                    {card.tone === "cyan" ? <Crosshair className="size-3.5" /> : <Shield className="size-3.5" />}
                  {card.faction} lineage · {card.role}
                  </p>
                  <h2 className="mt-1 font-display text-3xl leading-none text-fg">{card.name}</h2>
                  <p className="text-sm text-muted">{card.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-fg">{card.blurb}</p>
                  <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
                    <li>{card.passiveName}</li>
                    <li>Q · {card.activeName}</li>
                    <li>F · {card.ultName}</li>
                  </ul>
                </button>
              );
            })}
            {BLOODLINES.map((card) => (
              <article
                key={card.id}
                data-testid={`card-captive-${card.id}`}
                className={`field-captive-card w-64 shrink-0 border border-dashed p-4 ${card.tone === "cyan" ? "border-cyan/70" : "border-gold/70"}`}
              >
                <p className={`font-display text-xs tracking-widest ${card.tone === "cyan" ? "text-cyan" : "text-gold"}`}>
                  {card.faction} bloodline · imprisoned
                </p>
                <h2 className="mt-1 font-display text-3xl leading-none text-fg">{card.name}</h2>
                <p className="text-sm text-muted">{card.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-fg">{card.blurb}</p>
                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
                  <li>{card.passiveName}</li>
                  <li>Q · {card.activeName}</li>
                  <li>F · {card.ultName}</li>
                </ul>
              </article>
            ))}
          </div>
          </>
        )}
        <div className="field-command-actions flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={!canStart}
            data-testid="button-deploy-solo"
            className="field-deploy-button px-7 py-3 font-display text-xl font-bold tracking-[.18em] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onStart}
          >
            Deploy · Solo
          </button>
          {panel === "ops" ? (
            <button
              type="button"
              disabled={!canStart || authLoading || !isAuthenticated || serverStatus === "connecting"}
              data-testid="button-start-server-run"
              className="field-action-button field-action-button--brass px-4 py-3 font-display text-base tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onStartServer}
            >
              {serverStatus === "connecting" ? "Connecting…" : isAuthenticated ? "Server Loot Run" : "Sign in for Server Run"}
            </button>
          ) : null}
          {serverMessage ? <p role="alert" data-testid="status-server-message" className="basis-full text-sm text-gold">{serverMessage}</p> : null}
          {panel === "ops" ? (
            <p className="basis-full text-xs text-muted">
              Server Loot Run uses temporary match inventory. Solo saves stay separate.
            </p>
          ) : null}
          {panel === "ops" ? (
            <button type="button" data-testid="button-menu-dossier" className="field-action-button px-4 py-3 font-display text-base tracking-widest text-fg" onClick={onDossier}>
              Dossier
            </button>
          ) : (
            <button type="button" data-testid="button-menu-operators" className="field-action-button px-4 py-3 font-display text-base tracking-widest text-fg" onClick={onBack}>
              Operators
            </button>
          )}
          {panel === "armory" ? null : (
            <button type="button" data-testid="button-menu-armory" className="field-action-button px-4 py-3 font-display text-base tracking-widest text-gold" onClick={onArmory}>
              Armory
            </button>
          )}
          {panel === "settings" ? null : (
            <button type="button" data-testid="button-menu-settings" className="field-action-button px-4 py-3 font-display text-base tracking-widest text-cyan" onClick={onSettings}>
              Settings
            </button>
          )}
          <button type="button" data-testid="button-menu-saved-inventory" className="field-action-button px-4 py-3 font-display text-base tracking-widest text-cyan" onClick={onInventory}>
            Saved Inventory
          </button>
          {isAuthenticated ? (
            <button type="button" data-testid="button-sign-out" className="field-action-button px-4 py-3 text-sm text-muted" onClick={onLogout}>
              Sign out{authName ? ` · ${authName}` : ""}
            </button>
          ) : (
            <button type="button" data-testid="button-sign-in" disabled={authLoading} className="field-action-button field-action-button--brass px-4 py-3 text-sm text-gold disabled:opacity-50" onClick={onLogin}>
              {authLoading ? "Checking account…" : "Sign in"}
            </button>
          )}
          {!graphicsUnavailable ? <p className="basis-full text-sm text-muted">After deployment, click the city to take control. Esc pauses.</p> : null}
          {panel === "ops" ? (
            <p className="basis-full text-xs text-muted">
              {isAuthenticated
                ? "Server-run rewards are saved only after the server validates a complete extraction."
                : "Sign in before a server run to attach extracted rewards to your account. Solo saves remain local."}
            </p>
          ) : null}
        </div>
        </section>
      </div>
    </main>
  );
}

function InventoryPanel({
  profile,
  loading,
  error,
  isAuthenticated,
  onLogin,
}: {
  profile: ServerPlayerProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  onLogin: () => void;
}) {
  return (
    <section aria-label="Saved inventory" className="field-panel p-4 sm:p-5" data-testid="panel-saved-inventory">
      <p className="font-display text-xs tracking-widest text-cyan">ACCOUNT VAULT</p>
      <h2 className="mt-1 font-display text-3xl text-fg">Saved Inventory</h2>
      {!isAuthenticated ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Sign in to view inventory secured by successful server extractions.</p>
          <button type="button" data-testid="button-inventory-sign-in" className="mt-4 border border-gold px-4 py-2 font-display tracking-widest text-gold" onClick={onLogin}>
            Sign in
          </button>
        </div>
      ) : loading ? (
        <p role="status" className="mt-4 text-sm text-muted">Loading saved inventory…</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-danger">{error}</p>
      ) : profile ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="border border-line p-3 text-sm text-muted" data-testid="text-salvage-credits">Salvage credits <strong className="ml-2 text-gold">{profile.credits}</strong></p>
            <p className="border border-line p-3 text-sm text-muted" data-testid="text-successful-extractions">Successful extractions <strong className="ml-2 text-cyan">{profile.extractions}</strong></p>
          </div>
          {profile.inventory.length ? (
            <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto" data-testid="list-saved-inventory">
              {profile.inventory.map((item, index) => (
                <li
                  key={`${item.matchId}:${item.lootId}:${index}`}
                  className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm"
                  data-testid={`row-saved-item-${item.matchId}-${item.lootId}`}
                >
                  <span className="min-w-0 truncate text-fg">{item.label}<span className="ml-2 text-xs uppercase text-muted">{item.kind}</span></span>
                  <span className="shrink-0 text-gold">{item.scrap} scrap</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Your vault is empty. Complete a server-verified extraction to secure loot.</p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">No saved profile is available yet.</p>
      )}
    </section>
  );
}

function SettingsPanel({
  sensitivity,
  onSensitivityChange,
}: {
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
}) {
  return (
    <section className="field-panel w-full max-w-2xl p-4 sm:p-5">
      <p className="font-display text-xs tracking-widest text-gold">Operator controls</p>
      <h2 className="mt-1 font-display text-3xl text-fg">Look sensitivity</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Tune how quickly the view turns while aiming and moving. This setting is saved on this device.
      </p>
      <label htmlFor="look-sensitivity" className="mt-6 flex items-center justify-between gap-4 font-display text-sm tracking-widest text-cyan">
        <span>Camera response</span>
        <span>{Math.round(sensitivity * 100)}%</span>
      </label>
      <input
        id="look-sensitivity"
        data-testid="input-look-sensitivity"
        aria-label="Look sensitivity"
        aria-valuetext={`${Math.round(sensitivity * 100)} percent`}
        className="mt-3 w-full accent-cyan"
        type="range"
        min={MIN_LOOK_SENSITIVITY}
        max={MAX_LOOK_SENSITIVITY}
        step={LOOK_SENSITIVITY_STEP}
        value={sensitivity}
        onChange={(event) => onSensitivityChange(Number(event.target.value))}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>Slow</span>
        <span>Fast</span>
      </div>
    </section>
  );
}

function Armory({
  opWeapon,
  profile,
  onMars,
}: {
  opWeapon: WeaponId;
  profile: MarsProfile | null;
  onMars: (next: MarsProfile) => void;
}) {
  const bench = profile ?? loadMars();
  const preset = bench.loadouts.find((row) => row.slotIndex === bench.activeSlot) ?? bench.loadouts[0]!;
  const fields: { field: ModField; slot: AttachSlot; label: string }[] = [
    { field: "barrelModId", slot: "BARREL", label: "Barrel" },
    { field: "receiverModId", slot: "RECEIVER", label: "Receiver" },
    { field: "opticModId", slot: "OPTIC", label: "Optic" },
    { field: "magazineModId", slot: "MAGAZINE", label: "Magazine" },
  ];
  return (
    <div className="field-panel p-4 sm:p-5" data-testid="panel-armory">
      <p className="font-display text-xs tracking-widest text-gold">Accord field cache · {bench.martianCredits} salvage credits</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        What leaves the pad is filed here. Pick a preset before the drop. A mod only seats if this operator's gun can hold it. Progress is saved in this browser only; it is not cloud-synced or server-verified.
      </p>
      <div className="mt-4 flex gap-2">
        {([1, 2, 3] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            data-testid={`button-loadout-preset-${slot}`}
            onClick={() => onMars(setActiveSlot(bench, slot))}
            className={`border px-3 py-2 font-display text-sm tracking-widest ${bench.activeSlot === slot ? "border-gold text-gold" : "border-line text-muted"}`}
          >
            Preset {slot}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {fields.map((row) => {
          const options = bench.unlockedBlueprints.filter((id) => ATTACHMENT_BY_ID[id]?.slot === row.slot);
          const chosen = preset[row.field];
          return (
            <div key={row.field} data-testid={`group-attachment-slot-${row.field}`}>
              <p className="font-display text-xs tracking-widest text-cyan">{row.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid={`button-clear-${row.field}`}
                  onClick={() => onMars(setPresetMod(bench, row.field, null, opWeapon))}
                  className={`border px-2 py-1 font-display text-xs tracking-widest ${chosen ? "border-line text-muted" : "border-gold text-gold"}`}
                >
                  Empty
                </button>
                {options.map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`button-attachment-${id}`}
                    onClick={() => onMars(setPresetMod(bench, row.field, id, opWeapon))}
                    className={`border px-2 py-1 font-display text-xs tracking-widest ${chosen === id ? "border-gold text-gold" : "border-line text-fg"}`}
                  >
                    {labelForRegistry(id)}
                  </button>
                ))}
                {options.length === 0 ? <p className="text-xs text-muted">None filed.</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      {bench.stash.length > 0 ? (
        <ul className="mt-4 max-h-28 space-y-1 overflow-y-auto text-xs text-muted">
          {bench.stash.map((item) => (
            <li key={item.stashItemUuid}>
              {labelForRegistry(item.itemRegistryId)} · {item.quantity} · sector {item.extractedFromSectorId}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted">Nothing has left Nod yet.</p>
      )}
    </div>
  );
}

function Overlay({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/75 px-5">
      <div className="w-full max-w-lg border border-line bg-surface p-6">
        <p className="font-display text-xs tracking-widest text-cyan">{kicker}</p>
        <h2 className="mt-1 font-display text-5xl leading-none text-fg">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap gap-3">{children}</div>
      </div>
    </div>
  );
}

function Hud({ live, onEngage }: { live: boolean; onEngage: () => void }) {
  return (
    <div id="mte-hud" className={live ? "pointer-events-none absolute inset-0" : "hidden"}>
      <div id="mte-vig" className="absolute inset-0 opacity-0" />
      <div className="absolute top-4 left-4 max-w-xs">
        <p id="mte-act" className="font-display text-xs tracking-widest text-gold" />
        <p id="mte-tac" className="font-display text-xs tracking-widest text-cyan" />
        <h2 id="mte-obj" className="font-display text-2xl leading-none text-fg" />
        <p id="mte-obj-sub" className="mt-1 text-sm text-muted" />
        <p className="mt-2 flex flex-wrap items-center gap-x-2 font-display text-xs tracking-widest text-cyan">
          <span id="mte-dist" />
          <span id="mte-bearing" className="text-fg" />
          <span id="mte-sector" />
        </p>
      </div>
      <div className="absolute top-4 left-1/2 w-full max-w-md -translate-x-1/2 px-16 text-center">
        <div className="transition-opacity">
          <p id="mte-speaker" className="font-display text-xs tracking-widest text-gold" />
          <p id="mte-sub" className="text-sm leading-snug text-fg" />
        </div>
      </div>
      <div className="absolute top-4 right-4 text-right">
        <p id="mte-compass" className="font-display text-lg tracking-widest text-fg" />
        <p id="mte-kills" className="font-display text-sm tracking-widest text-muted" />
        <p id="mte-zone" className="mt-1 font-display text-sm tracking-widest text-danger" />
        <p id="mte-stress" className="font-display text-xs tracking-widest text-muted" />
        <p id="mte-haul" className="font-display text-xs tracking-widest text-gold" />
        <canvas id="mte-map" className="mt-3 ml-auto" width={180} height={180} />
        <div className="mt-2 ml-auto h-1 w-32 bg-surface-2">
          <div id="mte-noise" className="h-full bg-cyan" style={{ width: "0%" }} />
        </div>
        <p id="mte-noise-label" className="font-display text-xs tracking-widest text-muted">Noise</p>
      </div>
      <pre id="mte-feed" className="absolute top-48 right-4 text-right font-display text-xs tracking-widest whitespace-pre text-danger" />
      <div id="mte-marks" className="absolute inset-0" />
      <div
        id="mte-damage"
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <span data-direction="front" />
        <span data-direction="right" />
        <span data-direction="back" />
        <span data-direction="left" />
      </div>
      <div id="mte-cross" className="absolute top-1/2 left-1/2">
        <span data-arm="l" />
        <span data-arm="r" />
        <span data-arm="u" />
        <span data-arm="d" />
      </div>
      <div id="mte-hit" className="absolute top-1/2 left-1/2 opacity-0">
        <span style={{ transform: "translate(-14px, -1px) rotate(45deg)" }} />
        <span style={{ transform: "translate(4px, -1px) rotate(-45deg)" }} />
      </div>
      <p id="mte-prompt" className="absolute top-2/3 left-1/2 -translate-x-1/2 font-display text-lg tracking-widest text-fg opacity-0" />
      <div id="mte-stability-wrap" className="absolute top-[58%] left-1/2 w-36 -translate-x-1/2" style={{ display: "none" }}>
        <p id="mte-stability-label" className="text-center font-display text-xs tracking-widest text-cyan">Stability</p>
        <div className="mt-1 h-px bg-surface-2">
          <div id="mte-stability" className="h-px bg-cyan" style={{ width: "0%" }} />
        </div>
      </div>
      <div id="mte-solar-wrap" className="absolute top-[36%] right-3 w-44 font-display md:w-72" style={{ display: "none" }}>
        <div id="mte-coil-head" className="mb-1 flex items-end justify-between border-b border-gold/40 pb-1">
          <span className="text-[10px] tracking-widest text-gold md:text-xs">NEFRET_MASS_COIL</span>
          <span className="text-[9px] tracking-widest text-muted">KIN_RES</span>
        </div>
        <div className="border border-gold/25 bg-bg/75 p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-widest text-gold/80">SOLAR MASS</span>
            <span id="mte-solar-pct" className="text-[10px] tracking-widest text-gold">0.0% MAX</span>
          </div>
          <div id="mte-coil" className="flex h-4 gap-px bg-bg p-px">
            {Array.from({ length: 16 }, (_, index) => (
              <div key={index} data-seg={index} className="h-full flex-1 bg-white/5" />
            ))}
          </div>
        </div>
        <div id="mte-coil-alert" className="mt-2 overflow-hidden border border-danger" style={{ display: "none" }}>
          <p className="bg-danger px-1 py-1 text-center text-[10px] font-bold tracking-widest text-bg">KINETIC HARNESS LOAD CRITICAL</p>
          <div className="bg-bg/90 p-2 text-[10px] tracking-widest text-danger">
            <p className="flex justify-between border-b border-danger/30 pb-1">
              <span>CORE_OVERFLOW</span>
              <span>SYS_WARN_77B</span>
            </p>
            <p className="mt-1 leading-snug text-danger/80">Seed overheating. Shrapnel absorption is at the limit.</p>
            <p id="mte-coil-action" className="mt-2 border border-dashed border-danger px-1 py-1 text-center text-fg" />
          </div>
        </div>
      </div>
      <p id="mte-toast" className="absolute bottom-36 left-1/2 -translate-x-1/2 font-display text-sm tracking-widest text-gold opacity-0" />
      <div
        id="mte-channel-wrap"
        className="pointer-events-none absolute top-[18%] left-1/2 z-10 w-[min(88vw,24rem)] -translate-x-1/2 border border-gold/40 bg-bg/85 px-3 py-2 text-center opacity-0 shadow-lg backdrop-blur-sm"
        role="group"
        aria-label="Mission extraction status"
      >
        <div className="flex items-center justify-between gap-3 font-display tracking-widest">
          <p id="mte-channel-title" className="text-[10px] text-gold sm:text-xs" />
          <p id="mte-channel-timer" className="shrink-0 text-lg text-fg sm:text-xl" />
        </div>
        <p id="mte-channel-status" className="mt-1 text-[10px] tracking-wide text-muted sm:text-xs" role="status" aria-live="polite" />
        <p id="mte-channel-threats" className="mt-1 font-display text-[9px] tracking-widest text-danger sm:text-[10px]" />
        <div
          id="mte-channel-progress"
          className="mt-2 h-1 overflow-hidden bg-surface-2"
          role="progressbar"
          aria-label="Extraction interaction progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <div id="mte-channel" className="h-full bg-gold" style={{ width: "0%" }} />
        </div>
      </div>
      <div className="absolute bottom-4 left-4">
        <p className="font-display text-xs tracking-widest text-muted">Squad</p>
        <pre id="mte-squad" className="mt-1 font-display text-sm tracking-widest whitespace-pre text-fg" />
      </div>
      <div className="absolute right-4 bottom-4 left-4 md:left-auto md:w-80">
        <div className="mb-2">
          <p id="mte-weapon" className="mb-2 font-display text-xs tracking-widest text-fg" />
          <p className="mb-2 hidden font-display text-[9px] tracking-wider text-muted md:block">
            LMB RIGHT · RMB LEFT · MMB / V FOCUS · R STAGGER · DOUBLE R BOTH
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-line bg-bg/75 px-2 py-1">
              <p className="font-display text-[9px] tracking-widest text-cyan">RIGHT</p>
              <p className="font-display text-lg text-fg">
                <span id="mte-mag-right" />
                <span className="text-muted"> / </span>
                <span id="mte-res-right" className="text-muted" />
              </p>
            </div>
            <div className="border border-line bg-bg/75 px-2 py-1">
              <p className="font-display text-[9px] tracking-widest text-gold">LEFT</p>
              <p className="font-display text-lg text-fg">
                <span id="mte-mag-left" />
                <span className="text-muted"> / </span>
                <span id="mte-res-left" className="text-muted" />
              </p>
            </div>
          </div>
        </div>
        <div
          id="mte-reload-wrap"
          className="mb-2 grid grid-cols-2 gap-2"
          style={{ display: "none" }}
        >
          {(["right", "left"] as const).map((hand) => (
            <div id={`mte-reload-${hand}-wrap`} key={hand} style={{ display: "none" }}>
              <div className="mb-1 flex items-center justify-between font-display text-[9px] tracking-widest text-gold">
                <span>{hand.toUpperCase()} RELOAD</span>
                <span id={`mte-reload-${hand}-pct`}>0%</span>
              </div>
              <div
                id={`mte-reload-${hand}-progress`}
                className="h-1 overflow-hidden bg-surface-2"
                role="progressbar"
                aria-label={`Reloading ${hand}-hand weapon`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
              >
                <div
                  id={`mte-reload-${hand}-fill`}
                  className="h-full bg-gold"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="h-2 bg-surface-2">
          <div id="mte-hp" className="h-full bg-cyan" style={{ width: "100%" }} />
        </div>
        <div className="mt-1 h-1 bg-surface-2">
          <div id="mte-ar" className="h-full bg-gold" style={{ width: "0%" }} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <div id="mte-q" className="border border-cyan px-3 py-2">
            <p className="font-display text-xs tracking-widest text-cyan">Q</p>
            <p id="mte-qname" className="font-display text-sm text-fg" />
            <p id="mte-qcd" className="font-display text-xs text-muted" />
          </div>
          <div id="mte-f" className="border border-gold px-3 py-2">
            <p className="font-display text-xs tracking-widest text-gold">F</p>
            <p id="mte-fname" className="font-display text-sm text-fg" />
            <p id="mte-fcd" className="font-display text-xs text-muted" />
          </div>
        </div>
        <p className="kb-hints mt-2 text-xs text-muted">
          WASD move · Shift sprint · C slide · LMB right / RMB left · MMB or V focus · R reload · double R both · E interact · B bloodline · X mass
        </p>
      </div>
      <button
        id="mte-lock"
        type="button"
        className="pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-4 py-3 font-display text-lg tracking-widest text-fg"
        style={{ display: "none" }}
        onClick={onEngage}
      >
        Click to engage
      </button>
    </div>
  );
}

function Touch({ engineRef }: { engineRef: RefObject<MissionEngine | null> }) {
  const layer = useRef(new TouchControllerLayer());
  const timers = useRef(new Map<number, number[]>());
  const pendingPulseTimers = useRef(new Set<number>());
  const readoutKey = useRef("");
  const [stick, setStick] = useState<{ x: number; y: number; nx: number; ny: number } | null>(null);
  const [wheel, setWheel] = useState<string | null>(null);
  const [tune, setTune] = useState({ flick: 15, shove: SPRINT_SHOVE_PX, look: 1.7, disc: 1, discRight: 24, discTop: 55, cone: 8, magnet: 0.25, drag: 0.6 });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [readout, setReadout] = useState<{
    prompt: string;
    action: "interact" | "ability" | null;
    focused: boolean;
    weapons: { name: string; active: boolean; hand: string }[];
  }>({
    prompt: "",
    action: null,
    focused: false,
    weapons: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mte-touch-tune-v1");
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<typeof tune>;
      setTune((prev) => ({
        flick: saved.flick ?? prev.flick,
        shove: saved.shove === LEGACY_SPRINT_SHOVE_PX ? SPRINT_SHOVE_PX : saved.shove ?? prev.shove,
        look: saved.look ?? prev.look,
        disc: saved.disc ?? prev.disc,
        discRight: saved.discRight ?? prev.discRight,
        discTop: saved.discTop ?? prev.discTop,
        cone: saved.cone ?? prev.cone,
        magnet: saved.magnet ?? prev.magnet,
        drag: saved.drag ?? prev.drag,
      }));
    } catch {
      /* keep the defaults */
    }
  }, []);

  useEffect(() => {
    const live = layer.current;
    live.flickVelocityThreshold = tune.flick;
    live.sprintShoveThreshold = tune.shove;
    live.lookSensitivity = tune.look;
    const mission = engineRef.current;
    if (mission) {
      mission.aimAssist.coneDeg = tune.cone;
      mission.aimAssist.adhesion = tune.magnet;
      mission.aimAssist.friction = tune.drag;
    }
    try {
      localStorage.setItem("mte-touch-tune-v1", JSON.stringify(tune));
    } catch {
      // Keep the current layout tuning for this session when storage is unavailable.
    }
  }, [tune, engineRef]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const live = engineRef.current;
      if (live) {
        const next = live.touchReadout();
        const key = JSON.stringify(next);
        if (key !== readoutKey.current) {
          readoutKey.current = key;
          setReadout(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);

  useEffect(() => {
    if (readout.action === "interact") return;
    const live = engineRef.current;
    if (live) live.virtual.interact = false;
  }, [readout.action, engineRef]);

  const apply = (commands: TouchCommand[]) => {
    const live = engineRef.current;
    if (!live) return;
    const later = (ms: number, run: () => void) => {
      let timer = 0;
      timer = window.setTimeout(() => {
        pendingPulseTimers.current.delete(timer);
        run();
      }, ms);
      pendingPulseTimers.current.add(timer);
    };
    for (const command of commands) {
      if (command.type === "await-tap") {
        later(layer.current.discDoubleTapMs(), () => apply(layer.current.flushDisc(performance.now())));
        continue;
      }
      applyTouchCommand(live.virtual, command, later);
      if (command.type === "move") setStick((prev) => (prev ? { ...prev, nx: command.ax, ny: command.ay } : prev));
      if (command.type === "stop-move") setStick(null);
    }
  };

  useEffect(() => {
    const releaseInputs = (updateUi: boolean) => {
      for (const pointerTimers of timers.current.values()) {
        for (const timer of pointerTimers) window.clearTimeout(timer);
      }
      timers.current.clear();
      for (const timer of pendingPulseTimers.current) window.clearTimeout(timer);
      pendingPulseTimers.current.clear();

      const commands = layer.current.cancelAll();
      const live = engineRef.current;
      if (live) {
        for (const command of commands) applyTouchCommand(live.virtual, command);
      }
      if (updateUi) {
        setStick(null);
        setWheel(null);
      }
    };
    const onBlur = () => releaseInputs(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") releaseInputs(true);
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseInputs(false);
    };
  }, [engineRef]);

  const arm = (id: number) => {
    for (const timer of timers.current.get(id) ?? []) window.clearTimeout(timer);
    timers.current.set(id, [
      window.setTimeout(() => {
        apply(layer.current.hold(id, performance.now()));
        const label = layer.current.utilityLabel(id);
        if (label) setWheel(label);
      }, layer.current.discHoldDelay()),
    ]);
  };

  const drop = (id: number) => {
    for (const timer of timers.current.get(id) ?? []) window.clearTimeout(timer);
    timers.current.delete(id);
  };

  const start = (zone: TouchZone) => (event: PointerEvent<HTMLElement>) => {
    if (zone !== "MOVEMENT" && zone !== "LOOK_COMBAT") event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; explicit pointer-up/cancel handlers still release the input.
    }
    apply(layer.current.begin(event.pointerId, zone, event.clientX, event.clientY, performance.now()));
    if (!layer.current.ownsPointer(event.pointerId)) return;
    if (zone === "MOVEMENT" || zone === "LOOK_COMBAT" || zone === "UTILITY") arm(event.pointerId);
    if (zone === "MOVEMENT") setStick({ x: event.clientX, y: event.clientY, nx: 0, ny: 0 });
    if (zone === "UTILITY") setWheel("Q");
  };

  const drag = (event: PointerEvent<HTMLElement>) => {
    apply(layer.current.move(event.pointerId, event.clientX, event.clientY, performance.now(), event.pressure));
    const label = layer.current.utilityLabel(event.pointerId);
    if (label) setWheel(label);
  };

  const finish = (zone: TouchZone) => (event: PointerEvent<HTMLElement>) => {
    drop(event.pointerId);
    if (!layer.current.ownsPointer(event.pointerId)) return;
    const cancelled = event.type === "pointercancel" || event.type === "lostpointercapture";
    apply(
      cancelled
        ? layer.current.cancel(event.pointerId)
        : layer.current.end(event.pointerId, event.clientX, event.clientY, performance.now()),
    );
    if (zone === "UTILITY") setWheel(null);
    if (zone === "MOVEMENT") setStick(null);
  };

  const setField = (key: keyof typeof tune, value: number) => setTune((prev) => ({ ...prev, [key]: value }));
  const actionLabel = readout.prompt.replace(/^HOLD E\s+/, "").replace(/^[EQ]\s+/, "");

  return (
    <div className="touch-only touch-hud-overlay">
      <div className="touch-zone-interactive zone-left-movement" onPointerDown={start("MOVEMENT")} onPointerMove={drag} onPointerUp={finish("MOVEMENT")} onPointerCancel={finish("MOVEMENT")} onLostPointerCapture={finish("MOVEMENT")} />
      <div className="touch-zone-interactive zone-right-combat" onPointerDown={start("LOOK_COMBAT")} onPointerMove={drag} onPointerUp={finish("LOOK_COMBAT")} onPointerCancel={finish("LOOK_COMBAT")} onLostPointerCapture={finish("LOOK_COMBAT")} />
      <div className="gold-disc-slot" style={{ right: tune.discRight, top: `${tune.discTop}%`, transform: `translateY(-50%) scale(${tune.disc})` }}>
        {layoutOpen ? <div className="gold-disc-bounding-box" /> : null}
        <div className="gold-disc-utility is-placed" onPointerDown={start("UTILITY")} onPointerMove={drag} onPointerUp={finish("UTILITY")} onPointerCancel={finish("UTILITY")} onLostPointerCapture={finish("UTILITY")}>
          <span className="gold-disc-center-node" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center font-display text-xs tracking-widest text-bg">{wheel ?? "Q"}</span>
        </div>
      </div>
      <button type="button" className="touch-fire" onPointerDown={start("FIRE")} onPointerUp={finish("FIRE")} onPointerCancel={finish("FIRE")} onLostPointerCapture={finish("FIRE")}>
        RIGHT
      </button>
      {readout.weapons.length > 1 ? (
        <button
          type="button"
          className="touch-fire-left"
          onPointerDown={start("FIRE_LEFT")}
          onPointerUp={finish("FIRE_LEFT")}
          onPointerCancel={finish("FIRE_LEFT")}
          onLostPointerCapture={finish("FIRE_LEFT")}
          aria-label="Fire left-hand weapon"
        >
          LEFT
        </button>
      ) : null}
      <button
        type="button"
        className={`touch-focus ${readout.focused ? "is-live" : ""}`}
        onPointerDown={start("FOCUS")}
        onPointerUp={finish("FOCUS")}
        onPointerCancel={finish("FOCUS")}
        onLostPointerCapture={finish("FOCUS")}
        aria-pressed={readout.focused}
      >
        {readout.focused ? "FOCUS ON" : "FOCUS"}
      </button>
      {readout.weapons.length > 0 ? (
        <div className="touch-weapons">
          {readout.weapons.map((weapon, index) => (
            <button
              key={`${weapon.name}-${index}`}
              type="button"
              className={weapon.active ? "is-live" : undefined}
              onPointerDown={(event) => {
                event.stopPropagation();
                engineRef.current?.selectWeapon(index);
              }}
            >
              <span>{weapon.hand}</span>
              <span>{weapon.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      {readout.action ? (
        <button
          type="button"
          className="touch-action"
          onPointerDown={(event) => {
            event.stopPropagation();
            if (readout.action === "ability") apply([{ type: "pulse", key: "ability" }]);
            else start("INTERACT")(event);
          }}
          onPointerUp={readout.action === "interact" ? finish("INTERACT") : undefined}
          onPointerCancel={readout.action === "interact" ? finish("INTERACT") : undefined}
          onLostPointerCapture={readout.action === "interact" ? finish("INTERACT") : undefined}
        >
          {actionLabel}
        </button>
      ) : null}
      {stick ? (
        <div className="dynamic-virtual-stick" style={{ left: stick.x, top: stick.y }}>
          <div className="dynamic-virtual-thumb" style={{ marginLeft: stick.nx * 22, marginTop: -stick.ny * 22 }} />
        </div>
      ) : null}
      <details className="configurator-panel-container" onToggle={(event) => setLayoutOpen(event.currentTarget.open)} onPointerDown={(event) => event.stopPropagation()}>
        <summary className="configurator-title">
          Touch layout
          <span>{layoutOpen ? "Close" : "Edit"}</span>
        </summary>
        {(
          [
            ["Flick", "flick", 8, 80, 1],
            ["Sprint", "shove", 40, 120, 1],
            ["Look", "look", 0.6, 2.8, 0.1],
            ["Disc", "disc", 0.7, 1.4, 0.1],
            ["Disc X", "discRight", 8, 120, 1],
            ["Disc Y", "discTop", 20, 80, 1],
            ["Cone", "cone", 3, 14, 1],
            ["Magnet", "magnet", 0, 0.6, 0.05],
            ["Drag", "drag", 0.3, 1, 0.05],
          ] as const
        ).map(([label, key, min, max, step]) => (
          <label key={key} className="configurator-row">
            <span className="configurator-label-group">
              <span>{label}</span>
              <span>{typeof tune[key] === "number" && !Number.isInteger(tune[key]) ? tune[key].toFixed(2) : tune[key]}</span>
            </span>
            <input
              className="configurator-slider"
              type="range"
              min={min}
              max={max}
              step={step}
              value={tune[key]}
              onChange={(event) => setField(key, Number(event.target.value))}
            />
          </label>
        ))}
      </details>
    </div>
  );
}
