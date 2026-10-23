import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Crosshair, Radio, Shield, Volume2, VolumeX } from "lucide-react";
import { BLOODLINES, DOSSIER, OPERATORS, OPERATOR_BY_ID, type OpId, type WeaponId } from "@/game/content";
import { MissionEngine, type MissionEvent } from "@/game/engine";
import { ATTACHMENT_BY_ID, type AttachSlot } from "@/game/loot";
import {
  commitExtraction,
  ensureCredits,
  labelForRegistry,
  loadMars,
  saveMars,
  setActiveSlot,
  setPresetMod,
  type MarsProfile,
  type ModField,
} from "@/game/mars-stash";
import { applyTouchCommand, TouchControllerLayer, type TouchCommand, type TouchZone } from "@/game/touch-controller";

type Screen = "menu" | "dossier" | "armory" | "play" | "pause" | "dead" | "win";
type RecordBook = { extractions: number; best: number; kills: number; scrap: number };

const RECORD_KEY = "mte-record-v1";

function loadRecord(): RecordBook {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    if (!raw) return { extractions: 0, best: 0, kills: 0, scrap: 0 };
    const parsed = JSON.parse(raw) as Partial<RecordBook>;
    return {
      extractions: parsed.extractions || 0,
      best: parsed.best || 0,
      kills: parsed.kills || 0,
      scrap: parsed.scrap || 0,
    };
  } catch {
    return { extractions: 0, best: 0, kills: 0, scrap: 0 };
  }
}

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function Mission() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MissionEngine | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [op, setOp] = useState<OpId>("jaya");
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<{ time: number; kills: number; op: OpId; scrap: number; filed: string[] } | null>(null);
  const [record, setRecord] = useState<RecordBook | null>(null);
  const [mars, setMars] = useState<MarsProfile | null>(null);
  const [graphicsUnavailable, setGraphicsUnavailable] = useState(false);
  const chosen = OPERATOR_BY_ID[op];

  useEffect(() => {
    setRecord(loadRecord());
    const seeded = ensureCredits(loadMars(), loadRecord().scrap);
    if (seeded.martianCredits !== loadMars().martianCredits) saveMars(seeded);
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
            });
            setScreen("win");
            const nextMars = commitExtraction(loadMars(), event.scrap, event.manifest);
            saveMars(nextMars);
            setMars(nextMars);
            setRecord((prev) => {
              const base = prev ?? loadRecord();
              const next = {
                extractions: base.extractions + 1,
                best: base.best === 0 ? event.time : Math.min(base.best, event.time),
                kills: base.kills + event.kills,
                scrap: base.scrap + event.scrap,
              };
              localStorage.setItem(RECORD_KEY, JSON.stringify(next));
              return next;
            });
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

  const playing = screen === "play" || screen === "pause" || screen === "dead" || screen === "win";

  return (
    <div ref={rootRef} className="fixed inset-0 select-none overflow-hidden bg-bg text-fg">
      <div ref={hostRef} className="absolute inset-0" />
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
      {screen === "menu" || screen === "dossier" || screen === "armory" ? (
        <Menu
          op={op}
          setOp={setOp}
          panel={screen === "dossier" ? "dossier" : screen === "armory" ? "armory" : "ops"}
          record={record}
          mars={mars}
          canStart={!graphicsUnavailable}
          onDossier={() => setScreen("dossier")}
          onArmory={() => setScreen("armory")}
          onBack={() => setScreen("menu")}
          onMars={(next) => {
            saveMars(next);
            setMars(next);
          }}
          onStart={() => {
            engineRef.current?.start(op);
            engineRef.current?.capture();
          }}
        />
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
          kicker="Covenant"
          title="Going home"
          body={`${OPERATOR_BY_ID[stats.op].name} got Ananda and Nefret off the pad in ${clock(stats.time)}. ${stats.kills} corporate guns went quiet. ${stats.scrap > 0 ? `Hauled ${stats.scrap} scrap off the pad.` : "The pad took no scrap this run."} ${stats.filed.length ? `Mars filed ${stats.filed.join(", ")}.` : ""} The resistance stays in Nod. Mars has the warning.`}
        >
          <p className="font-display text-sm tracking-widest text-gold">
            {record
              ? `${record.extractions} extractions · best ${record.best ? clock(record.best) : "—"} · ${mars?.martianCredits ?? record.scrap} Martian credits`
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
  canStart,
  onDossier,
  onArmory,
  onBack,
  onMars,
  onStart,
}: {
  op: OpId;
  setOp: (id: OpId) => void;
  panel: "ops" | "dossier" | "armory";
  record: RecordBook | null;
  mars: MarsProfile | null;
  canStart: boolean;
  onDossier: () => void;
  onArmory: () => void;
  onBack: () => void;
  onMars: (next: MarsProfile) => void;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg/80">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-end gap-8 px-5 py-10 md:justify-center md:px-10">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 font-display text-sm tracking-widest text-cyan">
            <Radio className="size-4" />
            The Accord · Operation Shakuna
          </p>
          <h1 className="mt-2 font-display text-6xl leading-none font-semibold text-fg md:text-8xl">
            Mission
            <br />
            to Earth
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            Four warriors drop on Nod. Ananda and Nefret are still in the cradles, cut open for a technology the Accord was never trained to hold. Free them. Press B, and wear what comes out.
          </p>
          {record && record.extractions > 0 ? (
            <p className="mt-3 font-display text-sm tracking-widest text-gold">
              Service record · {record.extractions} extractions · {record.kills} confirmed
              {record.scrap > 0 ? ` · ${mars?.martianCredits ?? record.scrap} Martian credits` : ""}
            </p>
          ) : null}
        </div>
        {panel === "dossier" ? (
          <div className="grid gap-4 border border-line bg-surface p-5 md:grid-cols-3">
            {DOSSIER.map((act) => (
              <article key={act.title}>
                <p className="font-display text-xs tracking-widest text-gold">{act.kicker}</p>
                <h2 className="mt-1 font-display text-2xl text-fg">{act.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{act.body}</p>
              </article>
            ))}
          </div>
        ) : panel === "armory" ? (
          <Armory opWeapon={OPERATOR_BY_ID[op].weapon} profile={mars} onMars={onMars} />
        ) : (
          <>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {OPERATORS.map((card) => {
              const on = card.id === op;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setOp(card.id)}
                  className={`w-64 shrink-0 border p-4 text-left ${on ? (card.tone === "cyan" ? "border-cyan bg-surface" : "border-gold bg-surface") : "border-line bg-bg/60"}`}
                >
                  <p className={`inline-flex items-center gap-2 font-display text-xs tracking-widest ${card.tone === "cyan" ? "text-cyan" : "text-gold"}`}>
                    {card.tone === "cyan" ? <Crosshair className="size-3.5" /> : <Shield className="size-3.5" />}
                    {card.faction} · {card.role}
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
                className={`w-64 shrink-0 border border-dashed p-4 ${card.tone === "cyan" ? "border-cyan/70" : "border-gold/70"} bg-bg/40`}
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canStart}
            className="bg-cyan px-6 py-3 font-display text-xl tracking-widest text-bg disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onStart}
          >
            Start
          </button>
          {panel === "ops" ? (
            <button type="button" className="border border-line px-5 py-3 font-display text-lg tracking-widest text-fg" onClick={onDossier}>
              Dossier
            </button>
          ) : (
            <button type="button" className="border border-line px-5 py-3 font-display text-lg tracking-widest text-fg" onClick={onBack}>
              Operators
            </button>
          )}
          {panel === "armory" ? null : (
            <button type="button" className="border border-line px-5 py-3 font-display text-lg tracking-widest text-gold" onClick={onArmory}>
              Armory
            </button>
          )}
          <p className="text-sm text-muted">Click the city to seize the mouse. Esc pauses.</p>
        </div>
      </div>
    </div>
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
    <div className="border border-line bg-surface p-5">
      <p className="font-display text-xs tracking-widest text-gold">Mars bench · {bench.martianCredits} credits</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        What leaves the pad is filed here. Pick a preset before the drop. A mod only seats if this operator's gun can hold it.
      </p>
      <div className="mt-4 flex gap-2">
        {([1, 2, 3] as const).map((slot) => (
          <button
            key={slot}
            type="button"
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
            <div key={row.field}>
              <p className="font-display text-xs tracking-widest text-cyan">{row.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onMars(setPresetMod(bench, row.field, null, opWeapon))}
                  className={`border px-2 py-1 font-display text-xs tracking-widest ${chosen ? "border-line text-muted" : "border-gold text-gold"}`}
                >
                  Empty
                </button>
                {options.map((id) => (
                  <button
                    key={id}
                    type="button"
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
        <p className="mt-2 font-display text-sm tracking-widest text-cyan">
          <span id="mte-dist" /> · <span id="mte-sector" />
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
      <div id="mte-channel-wrap" className="absolute bottom-28 left-1/2 w-48 -translate-x-1/2 opacity-0">
        <div className="h-1 bg-surface-2">
          <div id="mte-channel" className="h-full bg-gold" style={{ width: "0%" }} />
        </div>
      </div>
      <div className="absolute bottom-4 left-4">
        <p className="font-display text-xs tracking-widest text-muted">Squad</p>
        <pre id="mte-squad" className="mt-1 font-display text-sm tracking-widest whitespace-pre text-fg" />
      </div>
      <div className="absolute right-4 bottom-4 left-4 md:left-auto md:w-80">
        <div className="mb-2 flex items-end justify-between">
          <p id="mte-weapon" className="font-display text-xl tracking-widest text-fg" />
          <p className="font-display text-2xl text-fg">
            <span id="mte-mag" />
            <span className="text-muted"> / </span>
            <span id="mte-res" className="text-muted" />
          </p>
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
        <p className="kb-hints mt-2 text-xs text-muted">WASD move · Shift sprint · C slide · Ctrl crouch · RMB aim · R reload · E interact · B bloodline · X mass · 1 / 2 weapons</p>
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
  const readoutKey = useRef("");
  const [stick, setStick] = useState<{ x: number; y: number; nx: number; ny: number } | null>(null);
  const [wheel, setWheel] = useState<string | null>(null);
  const [tune, setTune] = useState({ flick: 15, shove: 75, look: 1.7, disc: 1, discRight: 24, discTop: 55, cone: 8, magnet: 0.25, drag: 0.6 });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [readout, setReadout] = useState<{ prompt: string; action: "interact" | "ability" | null; weapons: { name: string; active: boolean }[] }>({
    prompt: "",
    action: null,
    weapons: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mte-touch-tune-v1");
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<typeof tune>;
      setTune((prev) => ({
        flick: saved.flick ?? prev.flick,
        shove: saved.shove ?? prev.shove,
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
    localStorage.setItem("mte-touch-tune-v1", JSON.stringify(tune));
  }, [tune]);

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
    for (const command of commands) {
      if (command.type === "await-tap") {
        window.setTimeout(() => apply(layer.current.flushDisc(performance.now())), layer.current.discDoubleTapMs());
        continue;
      }
      applyTouchCommand(live.virtual, command, (ms, run) => {
        window.setTimeout(run, ms);
      });
      if (command.type === "move") setStick((prev) => (prev ? { ...prev, nx: command.ax, ny: command.ay } : prev));
      if (command.type === "stop-move") setStick(null);
    }
  };

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
    event.currentTarget.setPointerCapture(event.pointerId);
    apply(layer.current.begin(event.pointerId, zone, event.clientX, event.clientY, performance.now()));
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
    apply(layer.current.end(event.pointerId, event.clientX, event.clientY, performance.now()));
    if (zone === "UTILITY") setWheel(null);
    if (zone === "MOVEMENT") setStick(null);
  };

  const setField = (key: keyof typeof tune, value: number) => setTune((prev) => ({ ...prev, [key]: value }));
  const actionLabel = readout.prompt.replace(/^HOLD E\s+/, "").replace(/^[EQ]\s+/, "");

  return (
    <div className="touch-only touch-hud-overlay">
      <div className="touch-zone-interactive zone-left-movement" onPointerDown={start("MOVEMENT")} onPointerMove={drag} onPointerUp={finish("MOVEMENT")} onPointerCancel={finish("MOVEMENT")} />
      <div className="touch-zone-interactive zone-right-combat" onPointerDown={start("LOOK_COMBAT")} onPointerMove={drag} onPointerUp={finish("LOOK_COMBAT")} onPointerCancel={finish("LOOK_COMBAT")} />
      <div className="gold-disc-slot" style={{ right: tune.discRight, top: `${tune.discTop}%`, transform: `translateY(-50%) scale(${tune.disc})` }}>
        {layoutOpen ? <div className="gold-disc-bounding-box" /> : null}
        <div className="gold-disc-utility is-placed" onPointerDown={start("UTILITY")} onPointerMove={drag} onPointerUp={finish("UTILITY")} onPointerCancel={finish("UTILITY")}>
          <span className="gold-disc-center-node" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center font-display text-xs tracking-widest text-bg">{wheel ?? "Q"}</span>
        </div>
      </div>
      <button type="button" className="touch-fire" onPointerDown={start("FIRE")} onPointerUp={finish("FIRE")} onPointerCancel={finish("FIRE")}>
        FIRE
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
              {weapon.name}
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
