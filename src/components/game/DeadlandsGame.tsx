import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "@/game/game";
import { MAPS } from "@/game/maps";
import { WEAPONS, WEAPONS_BY_SLOT } from "@/game/weapons";
import type { HudState } from "@/game/types";

const EMPTY: HudState = {
  net: { role: "solo", room: "", connected: false, peers: 0, error: "" },
  roster: [],
  captures: 0,
  captureGoal: 3,
  flagMode: "base",
  flagHolder: "",
  flagMine: false,
  bossName: "",
  bossHp: 0,
  phase: "title",
  hurtDir: null,
  hurtDirT: 0,
  wave: 0,
  bestWave: 0,
  enemiesLeft: 0,
  waveTotal: 0,
  respiteLeft: 0,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  slag: 0,
  weapon: "rifle",
  weaponName: "Rifle",
  weaponNote: "Balanced automatic",
  mag: 30,
  magSize: 30,
  reserve: 150,
  reloading: false,
  downed: false,
  bleedOut: 0,
  reviveProgress: 0,
  adrenaline: 1,
  kills: 0,
  shop: [],
  draft: [],
  buffs: [],
  toasts: [],
  hitFlash: 0,
  damageFlash: 0,
  comboKills: 0,
};

const CONTROLS: Array<[string, string]> = [
  ["WASD", "Move"],
  ["Mouse", "Look / Aim"],
  ["LMB", "Fire weapon"],
  ["RMB", "Quick blade"],
  [`1-${WEAPONS_BY_SLOT.length} / Q`, "Swap weapons"],
  ["R", "Reload"],
  ["Shift", "Sprint (stamina)"],
  ["Space", "Dodge roll (i-frames)"],
  ["F", "Tackle — sprint only"],
  ["E", "Hold to self-repair when down"],
  ["Esc", "Pause"],
];

function Bar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className: string;
  label?: string;
}) {
  return (
    <div className="h-2.5 w-56 overflow-hidden rounded-sm border border-border bg-background/70">
      <div
        className={`h-full transition-[width] duration-100 ${className}`}
        style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
        aria-label={label}
      />
    </div>
  );
}

export default function DeadlandsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current, setHud);
    gameRef.current = g;
    const noCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", noCtx);
    return () => {
      window.removeEventListener("contextmenu", noCtx);
      g.dispose();
      gameRef.current = null;
    };
  }, []);

  // one arena for now; kept as a lookup so more can be added back later
  const activeMap = MAPS[0];
  const mapId = activeMap.id;

  const [name, setName] = useState("Hero");
  const [joinCode, setJoinCode] = useState("");
  const [netBusy, setNetBusy] = useState(false);
  const [netErr, setNetErr] = useState("");

  const doHost = useCallback(async () => {
    setNetBusy(true);
    setNetErr("");
    try {
      await gameRef.current?.hostGame(name);
    } catch (e) {
      setNetErr(String((e as Error)?.message ?? e));
    }
    setNetBusy(false);
  }, [name]);

  const doJoin = useCallback(async () => {
    if (!joinCode.trim()) return;
    setNetBusy(true);
    setNetErr("");
    try {
      await gameRef.current?.joinGame(joinCode, name);
    } catch (e) {
      setNetErr(String((e as Error)?.message ?? e));
    }
    setNetBusy(false);
  }, [joinCode, name]);

  const doLeave = useCallback(() => {
    gameRef.current?.leaveGame();
    setNetErr("");
  }, []);

  const start = useCallback(() => gameRef.current?.startRun(mapId), [mapId]);
  const resume = useCallback(() => gameRef.current?.resume(), []);
  const restart = useCallback(() => gameRef.current?.restart(), []);

  const playing = hud.phase === "playing" || hud.phase === "respite";

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* where the last hit came from - the main reason deaths felt to come out of nowhere */}
      {playing && hud.hurtDirT > 0 && hud.hurtDir !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="relative h-72 w-72"
            style={{ transform: `rotate(${hud.hurtDir}rad)`, opacity: Math.min(1, hud.hurtDirT) }}
          >
            <div
              className="absolute left-1/2 top-0 h-14 w-28 -translate-x-1/2 rounded-t-full bg-destructive/70"
              style={{ maskImage: "linear-gradient(to top, transparent, black)" }}
            />
          </div>
        </div>
      )}

      {/* burns have no bearing, so call them out directly */}
      {playing && hud.hurtDirT > 0 && hud.hurtDir === null && (
        <div
          className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm font-bold tracking-widest text-destructive uppercase"
          style={{ opacity: Math.min(1, hud.hurtDirT) }}
        >
          Burning
        </div>
      )}

      {/* unmistakable low-health state */}
      {playing && !hud.downed && hud.hp / hud.maxHp <= 0.35 && (
        <>
          <div className="pointer-events-none absolute inset-0 animate-pulse shadow-[inset_0_0_140px_60px_rgba(220,38,38,0.45)]" />
          <div className="pointer-events-none absolute inset-x-0 top-14 text-center text-sm font-bold tracking-widest text-destructive uppercase">
            Critical — {Math.round((hud.hp / hud.maxHp) * 100)}% health
          </div>
        </>
      )}

      {playing && hud.roster.length > 0 && (
        <div className="pointer-events-none absolute right-6 top-20 space-y-1 text-right text-xs">
          {hud.roster.map((r) => (
            <div key={r.id} className="text-display">
              <span className={r.downed ? "text-destructive" : "text-foreground"}>{r.name}</span>{" "}
              <span className="text-muted-foreground">
                {r.downed ? "DOWNED" : `${r.hp}/${r.maxHp}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* capture the flag objective */}
      {playing && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 text-center">
          <div className="text-display text-sm tracking-widest uppercase">
            Cores secured{" "}
            <span className="text-ember">
              {hud.captures}/{hud.captureGoal}
            </span>
          </div>
          <div
            className={`text-xs ${
              hud.flagMine
                ? "text-ember"
                : hud.flagMode === "dropped"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {hud.flagMine
              ? "You have the core — get it to the blue pad"
              : hud.flagMode === "carried"
                ? `${hud.flagHolder} is carrying the core`
                : hud.flagMode === "dropped"
                  ? "Core dropped — recover it"
                  : "Core is at the invader siphon"}
          </div>
        </div>
      )}

      {/* boss health */}
      {playing && hud.bossName && (
        <div className="pointer-events-none absolute left-1/2 top-32 w-[min(520px,80vw)] -translate-x-1/2 text-center">
          <div className="text-display text-sm tracking-widest text-destructive uppercase">
            {hud.bossName}
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-sm border border-destructive/60 bg-background/70">
            <div
              className="h-full bg-destructive transition-[width] duration-150"
              style={{ width: `${Math.max(0, Math.min(100, hud.bossHp * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* damage / hit feedback */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${140 + hud.damageFlash * 120}px rgba(180,20,10,${0.25 + hud.damageFlash * 0.5})`,
        }}
      />
      {hud.hp / hud.maxHp < 0.35 && !hud.downed && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 180px rgba(200,30,20,0.45)", animation: "dl-pulse-ember 1.4s infinite" }}
        />
      )}

      {playing && !hud.downed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-6 w-6">
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember" />
            {hud.hitFlash > 0.02 && (
              <span
                className="absolute inset-0 text-center text-lg leading-6 font-bold text-destructive"
                style={{ opacity: hud.hitFlash }}
              >
                ✕
              </span>
            )}
          </div>
        </div>
      )}

      {/* HUD */}
      {playing && (
        <>
          <div className="pointer-events-none absolute left-6 bottom-6 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-14 text-display text-xs text-muted-foreground">Vitals</span>
              <Bar value={hud.hp} max={hud.maxHp} className="bg-vitals" label="Health" />
              <span className="text-display text-sm">{hud.hp}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-14 text-display text-xs text-muted-foreground">Stam</span>
              <Bar value={hud.stamina} max={hud.maxStamina} className="bg-stam" label="Stamina" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-display">Repair cells</span>
              {Array.from({ length: Math.max(hud.adrenaline, 0) }).map((_, i) => (
                <span key={i} className="h-2.5 w-2.5 rotate-45 bg-slag" />
              ))}
              {hud.adrenaline === 0 && <span>none</span>}
            </div>
          </div>

          <div className="pointer-events-none absolute right-6 bottom-6 text-right">
            <div className="text-display text-xs text-muted-foreground">{hud.weaponName}</div>
            {hud.magSize > 0 ? (
              <div className="text-display text-4xl leading-none">
                {hud.mag}
                <span className="text-xl text-muted-foreground">/{hud.reserve}</span>
              </div>
            ) : (
              <div className="text-display text-4xl leading-none">∞</div>
            )}
            <div className="text-[11px] text-muted-foreground">{hud.weaponNote}</div>
            {hud.reloading && <div className="text-display text-xs text-ember">Reloading…</div>}
            {hud.magSize > 0 && hud.mag === 0 && !hud.reloading && (
              <div className="text-display text-xs text-destructive">Press R</div>
            )}
            <div className="mt-2 flex justify-end gap-1">
              {WEAPONS_BY_SLOT.map((id) => (
                <span
                  key={id}
                  className={`text-display rounded-sm border px-1.5 text-[11px] ${
                    hud.weapon === id
                      ? "border-ember bg-ember/20 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {WEAPONS[id].slot}
                </span>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-center">
            <div className="text-display text-2xl tracking-widest">Wave {hud.wave}</div>
            <div className="text-xs text-muted-foreground">
              {hud.phase === "respite"
                ? `Respite — next wave in ${Math.ceil(hud.respiteLeft)}s`
                : `${hud.enemiesLeft} hostiles remaining`}
            </div>
            {hud.comboKills >= 3 && (
              <div className="text-display text-sm text-ember">{hud.comboKills}x streak</div>
            )}
          </div>

          <div className="pointer-events-none absolute right-6 top-5 text-right text-xs">
            <div className="text-display text-lg text-slag">{hud.slag} slag</div>
            <div className="text-muted-foreground">Scrapped {hud.kills}</div>
            <div className="text-muted-foreground">Best wave {hud.bestWave}</div>
          </div>

          <div className="pointer-events-none absolute left-6 top-1/2 w-64 -translate-y-1/2 space-y-1">
            {hud.toasts.map((t) => (
              <div
                key={t.id}
                className={`text-display text-sm ${
                  t.kind === "good" ? "text-ember" : t.kind === "bad" ? "text-destructive" : "text-foreground"
                }`}
                style={{ animation: "dl-rise 160ms ease-out" }}
              >
                {t.text}
              </div>
            ))}
          </div>

          {hud.wave === 1 && (
            <div className="pointer-events-none absolute left-6 top-5 max-w-56 space-y-0.5 text-[11px] text-muted-foreground">
              {CONTROLS.slice(0, 9).map(([k, v]) => (
                <div key={k}>
                  <span className="text-display text-foreground">{k}</span> — {v}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* downed */}
      {hud.downed && playing && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive/10">
          <h2 className="text-display text-4xl text-destructive">Downed</h2>
          <p className="text-sm text-muted-foreground">
            Systems failing in {Math.ceil(hud.bleedOut)}s
            {hud.adrenaline > 0 ? " — hold E to run a repair cell" : " — no repair cells left"}
          </p>
          {hud.adrenaline > 0 && (
            <div className="h-2 w-64 overflow-hidden rounded-sm border border-border">
              <div className="h-full bg-ember" style={{ width: `${hud.reviveProgress * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* respite shop */}
      {hud.phase === "respite" && (
        <div className="absolute inset-x-0 bottom-24 mx-auto w-[min(1100px,94vw)] rounded-md border border-border bg-card/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-display text-xl">Forge — spend slag</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slag text-display">{hud.slag} slag</span>
              <button
                onClick={() => gameRef.current?.skipRespite()}
                className="text-display rounded-sm bg-ember px-3 py-1.5 text-sm text-ember-foreground hover:opacity-90"
              >
                Start wave {hud.wave + 1} ({Math.ceil(hud.respiteLeft)}s)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {hud.shop.map((it) => {
              const maxed = it.level >= it.maxLevel;
              const afford = hud.slag >= it.cost && !maxed;
              return (
                <button
                  key={it.id}
                  disabled={!afford}
                  onClick={() => gameRef.current?.buy(it.id)}
                  className={`rounded-sm border border-border p-2 text-left transition-colors ${
                    afford ? "bg-secondary hover:bg-accent" : "bg-muted/40 opacity-60"
                  }`}
                >
                  <div className="text-display flex justify-between text-sm">
                    <span>{it.name}</span>
                    <span className="text-muted-foreground">
                      {it.maxLevel < 90 ? `L${it.level}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{it.desc}</div>
                  <div className="text-display mt-1 text-xs text-slag">
                    {maxed ? "MAXED" : `${it.cost} slag`}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Grab the crates near the lava while you can — they never spawn anywhere safe.
          </p>
        </div>
      )}

      {/* buff draft */}
      {hud.phase === "draft" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/85 backdrop-blur">
          <h2 className="text-display text-3xl">Choose a mutation</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {hud.draft.map((c) => (
              <button
                key={c.id}
                onClick={() => gameRef.current?.chooseBuff(c.id)}
                className="w-64 rounded-md border border-border bg-card p-5 text-left transition-transform hover:-translate-y-1 hover:border-ember"
              >
                <div className="text-display text-lg text-ember">{c.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* pause */}
      {hud.phase === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/85 backdrop-blur">
          <h2 className="text-display text-4xl">Paused</h2>
          <div className="grid max-w-md grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-display text-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={resume}
              className="text-display rounded-sm bg-ember px-6 py-2 text-ember-foreground hover:opacity-90"
            >
              Resume
            </button>
            <button
              onClick={restart}
              className="text-display rounded-sm border border-border px-6 py-2 hover:bg-accent"
            >
              Restart run
            </button>
          </div>
        </div>
      )}

      {/* game over */}
      {hud.phase === "victory" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur">
          <h2 className="text-display text-5xl text-ember">City secured</h2>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            All {hud.captureGoal} cores recovered from the invaders. Neo Kestrel holds — for now.
          </p>
          <p className="text-sm text-muted-foreground">
            Reached wave <span className="text-display text-foreground">{hud.wave}</span> ·{" "}
            <span className="text-display text-foreground">{hud.kills}</span> machines destroyed
          </p>
          <button
            onClick={restart}
            className="text-display rounded-sm bg-ember px-8 py-3 text-lg text-ember-foreground"
          >
            Run it again
          </button>
        </div>
      )}

      {hud.phase === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur">
          <h2 className="text-display text-5xl text-destructive">You died in the ash</h2>
          <div className="text-display text-lg">
            Wave {hud.wave} · {hud.kills} machines scrapped · best wave {hud.bestWave}
          </div>
          <button
            onClick={restart}
            className="text-display mt-2 rounded-sm bg-ember px-8 py-3 text-lg text-ember-foreground hover:opacity-90"
          >
            Run it again
          </button>
        </div>
      )}

      {/* title */}
      {hud.phase === "title" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-background/70 via-background/85 to-background">
          <div className="text-center">
            <p className="text-display text-sm tracking-[0.5em] text-ember">{activeMap.tagline}</p>
            <h1 className="text-display text-6xl leading-none md:text-8xl">{activeMap.name}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{activeMap.blurb}</p>
          </div>

          <div className="w-[min(560px,92vw)] rounded-md border border-border bg-card/70 p-4">
            <div className="text-display mb-3 text-center text-sm tracking-widest uppercase">
              Co-op
            </div>

            {hud.net.role === "solo" ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-muted-foreground">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={14}
                    className="flex-1 rounded-sm border border-border bg-background px-2 py-1"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={doHost}
                    disabled={netBusy}
                    className="text-display rounded-sm border border-ember px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Host a game
                  </button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    maxLength={5}
                    className="text-display w-32 rounded-sm border border-border bg-background px-2 py-1 tracking-widest uppercase"
                  />
                  <button
                    onClick={doJoin}
                    disabled={netBusy || !joinCode.trim()}
                    className="text-display rounded-sm border border-border px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>

                {netBusy && <p className="text-xs text-muted-foreground">Connecting…</p>}
                {netErr && <p className="text-xs text-destructive">{netErr}</p>}
                <p className="text-xs text-muted-foreground">
                  Play solo, or share a room code to fight together. Connections are
                  peer-to-peer — no server, no account.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {hud.net.role === "host" ? "Hosting room" : "Joined room"}
                  </span>
                  <span className="text-display text-2xl tracking-[0.3em] text-ember">
                    {hud.net.room}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {hud.roster.length
                    ? `In the squad: ${hud.roster.map((r) => r.name).join(", ")}`
                    : "Waiting for teammates to join…"}
                </div>
                {hud.net.error && <p className="text-xs text-destructive">{hud.net.error}</p>}
                <button
                  onClick={doLeave}
                  className="text-display self-start rounded-sm border border-border px-3 py-1 text-xs"
                >
                  Leave room
                </button>
              </div>
            )}
          </div>

          <button
            onClick={start}
            className="text-display rounded-sm bg-ember px-10 py-3 text-xl text-ember-foreground shadow-lg transition-transform hover:scale-105"
          >
            {activeMap.cta}
          </button>
          <div className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground md:grid-cols-3">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-display text-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Best wave on {activeMap.name}:{" "}
            <span className="text-display text-ember">{hud.bestWave || "—"}</span> · Solo campaign —
            downed heroes run repair cells to get back up.
          </p>
        </div>
      )}
    </div>
  );
}
