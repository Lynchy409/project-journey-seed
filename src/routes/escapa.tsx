import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Lock, Timer, Trophy } from "lucide-react";
import { Guard, Ted } from "@/components/app/Ted";
import { COLS, DOOR_COLS, LEVELS, ROWS, START_LIVES, loadProgress, saveProgress, type EscapaProgress } from "@/lib/escapa";
import { beep } from "@/lib/morning";

export const Route = createFileRoute("/escapa")({
  head: () => ({
    meta: [
      { title: "¡Escapa! — Ted's prison break | My Journey" },
      { name: "description", content: "Guide Ted the cockapoo out of prison by running through the right Spanish answer." },
      { property: "og:title", content: "¡Escapa! — Ted's prison break" },
      { property: "og:description", content: "A Spanish maze game built on the Language Transfer course." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EscapaPage,
});

type Pos = { r: number; c: number };
type G = { r: number; c: number; d: 1 | -1 };
type Phase = "select" | "play" | "won" | "lost";
type Flash = { kind: "good" | "bad"; text: string } | null;
type State = {
  phase: Phase; lvl: number; qi: number; options: string[]; pos: Pos; facing: 1 | -1;
  lives: number; time: number; guards: G[]; locked: number[];
  flash: Flash; hits: number; misses: number;
};

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const room = (lvl: number, qi: number) => { const rs = LEVELS[lvl]!.rooms; return rs[qi % rs.length]!; };
const startPos = (lvl: number, qi: number): Pos => {
  const m = room(lvl, qi).map;
  for (let r = 0; r < ROWS; r++) { const c = m[r]!.indexOf("S"); if (c >= 0) return { r, c }; }
  return { r: ROWS - 2, c: 4 };
};
const cell = (s: State, p: Pos) => room(s.lvl, s.qi).map[p.r]?.[p.c] ?? "#";
const hitGuard = (gs: G[], p: Pos) => gs.some((g) => g.r === p.r && g.c === p.c);

function enterRoom(s: State, qi: number): State {
  const q = LEVELS[s.lvl]!.questions[qi]!;
  const guards = room(s.lvl, qi).guardRows.map((r, i): G => (i % 2 ? { r, c: COLS - 2, d: -1 } : { r, c: 1, d: 1 }));
  return { ...s, qi, options: shuffle(q.options), pos: startPos(s.lvl, qi), locked: [], guards };
}
function caught(s: State): State {
  const lives = s.lives - 1;
  beep("switch");
  return { ...s, lives, pos: startPos(s.lvl, s.qi), phase: lives <= 0 ? "lost" : s.phase, flash: { kind: "bad", text: "Caught by the guard! −1 life" } };
}

type Action = { type: "start"; lvl: number } | { type: "select" } | { type: "move"; dr: number; dc: number } | { type: "tick" } | { type: "second" } | { type: "clearFlash" };

function reducer(s: State, a: Action): State {
  if (a.type === "start")
    return enterRoom({ ...s, lvl: a.lvl, phase: "play", lives: START_LIVES, time: LEVELS[a.lvl]!.seconds, hits: 0, misses: 0, flash: null }, 0);
  if (a.type === "select") return { ...s, phase: "select", flash: null };
  if (a.type === "clearFlash") return { ...s, flash: null };
  if (s.phase !== "play") return s;
  if (a.type === "second") {
    const time = s.time - 1;
    return time <= 0 ? { ...s, time: 0, phase: "lost" } : { ...s, time };
  }
  if (a.type === "tick") {
    const guards = s.guards.map((g): G => {
      let d = g.d, c = g.c + d;
      if (cell(s, { r: g.r, c }) !== ".") { d = (d * -1) as 1 | -1; c = g.c + d; }
      return { r: g.r, c, d };
    });
    const ns = { ...s, guards };
    return hitGuard(guards, s.pos) ? caught(ns) : ns;
  }
  const next = { r: s.pos.r + a.dr, c: s.pos.c + a.dc };
  const facing = a.dc ? ((a.dc > 0 ? 1 : -1) as 1 | -1) : s.facing;
  const t = cell(s, next);
  if (t === "#") return { ...s, facing };
  if (t === "D") {
    const di = DOOR_COLS.indexOf(next.c);
    if (s.locked.includes(di)) return { ...s, facing };
    const qs = LEVELS[s.lvl]!.questions;
    const q = qs[s.qi]!;
    if (s.options[di] === q.answer) {
      beep("next");
      const hits = s.hits + 1;
      if (s.qi + 1 >= qs.length) return { ...s, hits, phase: "won", flash: { kind: "good", text: q.rule } };
      return { ...enterRoom({ ...s, hits, facing }, s.qi + 1), flash: { kind: "good", text: q.rule } };
    }
    beep("switch");
    const lives = s.lives - 1;
    return {
      ...s, facing, lives, misses: s.misses + 1, time: Math.max(1, s.time - 5), locked: [...s.locked, di], pos: startPos(s.lvl, s.qi),
      phase: lives <= 0 ? "lost" : "play",
      flash: { kind: "bad", text: `Alarm! Wrong door −1 life −5s. ${q.rule}` },
    };
  }
  const ns = { ...s, pos: next, facing };
  return hitGuard(s.guards, next) ? caught(ns) : ns;
}

const initial: State = {
  phase: "select", lvl: 0, qi: 0, options: LEVELS[0]!.questions[0]!.options, pos: startPos(0, 0), facing: 1, lives: START_LIVES,
  time: LEVELS[0]!.seconds, guards: [], locked: [], flash: null, hits: 0, misses: 0,
};

function EscapaPage() {
  const router = useRouter();
  const [s, dispatch] = useReducer(reducer, initial);
  const [progress, setProgress] = useState<EscapaProgress>({ unlocked: 0, best: {} });
  const touch = useRef<{ x: number; y: number } | null>(null);
  const level = LEVELS[s.lvl]!;

  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.touchAction];
    html.style.overflow = "hidden"; body.style.overflow = "hidden"; body.style.overscrollBehavior = "none"; body.style.touchAction = "none";
    setProgress(loadProgress());
    return () => { [html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.touchAction] = prev as [string, string, string, string]; };
  }, []);

  useEffect(() => {
    if (s.phase !== "play") return;
    const speed = Math.max(200, level.guardMs - s.qi * 22);
    const g = setInterval(() => dispatch({ type: "tick" }), speed);
    const t = setInterval(() => dispatch({ type: "second" }), 1000);
    return () => { clearInterval(g); clearInterval(t); };
  }, [s.phase, s.qi, level.guardMs]);

  useEffect(() => {
    if (!s.flash) return;
    const id = setTimeout(() => dispatch({ type: "clearFlash" }), 2200);
    return () => clearTimeout(id);
  }, [s.flash]);

  useEffect(() => {
    if (s.phase !== "won") return;
    setProgress((p) => {
      const prevBest = p.best[s.lvl];
      const better = !prevBest || s.time > prevBest.time;
      const np: EscapaProgress = {
        unlocked: Math.max(p.unlocked, Math.min(s.lvl + 1, LEVELS.length - 1)),
        best: better ? { ...p.best, [s.lvl]: { time: s.time, lives: s.lives } } : p.best,
      };
      saveProgress(np);
      return np;
    });
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const keys: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const h = (e: KeyboardEvent) => { const k = keys[e.key]; if (k) { e.preventDefault(); dispatch({ type: "move", dr: k[0], dc: k[1] }); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const move = (dr: number, dc: number) => dispatch({ type: "move", dr, dc });
  const goBack = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/learn" }));
  const map = room(s.lvl, s.qi).map;
  const q = level.questions[s.qi]!;
  const low = s.time <= 15;
  const hasNext = s.lvl + 1 < LEVELS.length;

  return (
    <div
      className="fixed inset-0 flex select-none flex-col overflow-hidden bg-background"
      onTouchStart={(e) => { const t = e.touches[0]; if (t) touch.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        const st = touch.current, t = e.changedTouches[0]; touch.current = null;
        if (!st || !t) return;
        const dx = t.clientX - st.x, dy = t.clientY - st.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1); else move(dy > 0 ? 1 : -1, 0);
      }}
    >
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="flex gap-1">
          {Array.from({ length: START_LIVES }).map((_, i) => (
            <Heart key={i} className={`h-6 w-6 ${i < s.lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
          ))}
        </div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Room {s.qi + 1}/{level.questions.length}</p>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black tabular-nums ${low ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-card shadow-soft"}`}>
          <Timer className="h-4 w-4" /> {Math.floor(s.time / 60)}:{String(s.time % 60).padStart(2, "0")}
        </div>
      </div>

      <div className="mx-4 rounded-2xl bg-card p-3 text-center shadow-soft">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Level {s.lvl + 1} · {level.name}</p>
        <p className="text-xl font-black leading-tight">{q.q}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pt-2">
        <div className="relative" style={{ width: `min(100%, calc((100dvh - 330px) * ${COLS / (ROWS + 1.4)}))` }}>
          <div className="relative mb-1 h-10">
            {DOOR_COLS.map((c, i) => (
              <div
                key={c}
                className={`absolute top-0 flex h-10 -translate-x-1/2 items-center justify-center rounded-xl px-1 text-center text-[11px] font-extrabold leading-tight transition ${s.locked.includes(i) ? "bg-destructive/15 text-destructive line-through" : "bg-primary text-primary-foreground shadow-soft"}`}
                style={{ left: `${((c + 0.5) / COLS) * 100}%`, width: "31%" }}
              >
                {s.options[i]}
              </div>
            ))}
          </div>
          <div className="relative grid overflow-hidden rounded-2xl" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, aspectRatio: `${COLS}/${ROWS}` }}>
            {map.flatMap((row, r) =>
              row.split("").map((ch, c) => {
                const isDoor = ch === "D";
                const locked = isDoor && s.locked.includes(DOOR_COLS.indexOf(c));
                return (
                  <div
                    key={`${r}-${c}`}
                    className={
                      ch === "#" ? "bg-foreground/85 border border-foreground/60"
                      : isDoor ? (locked ? "bg-destructive/70" : "bg-primary/30 border-x-2 border-t-4 border-primary")
                      : "bg-muted"
                    }
                  />
                );
              }),
            )}
            <div className="pointer-events-none absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] bg-[radial-gradient(circle_at_70%_40%,hsl(50_100%_70%/0.25),transparent_45%)]" />
            {s.guards.map((g, i) => <Sprite key={i} pos={g}><Guard className="h-full w-full" /></Sprite>)}
            <Sprite pos={s.pos}><Ted facing={s.facing} className="h-full w-full scale-125" /></Sprite>
          </div>
        </div>
      </div>

      {s.flash && s.phase === "play" && (
        <div className={`absolute inset-x-4 top-1/3 z-20 rounded-2xl p-4 text-center text-sm font-extrabold shadow-float animate-in fade-in zoom-in-95 ${s.flash.kind === "good" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {s.flash.kind === "good" ? "Gate open! " : ""}{s.flash.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 self-center pb-[max(env(safe-area-inset-bottom),12px)] pt-2" style={{ width: 200 }}>
        <span />
        <Pad onPress={() => move(-1, 0)} label="Up"><ArrowUp /></Pad>
        <span />
        <Pad onPress={() => move(0, -1)} label="Left"><ArrowLeft /></Pad>
        <Pad onPress={() => move(1, 0)} label="Down"><ArrowDown /></Pad>
        <Pad onPress={() => move(0, 1)} label="Right"><ArrowRight /></Pad>
      </div>

      <button type="button" onClick={goBack} className="fixed bottom-3 left-3 z-30 rounded-full bg-foreground/40 px-3 py-1.5 text-xs font-semibold text-background backdrop-blur" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        ← Back
      </button>

      {s.phase === "select" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center gap-4 overflow-y-auto bg-background/95 p-6 pt-[max(env(safe-area-inset-top),24px)] text-center backdrop-blur">
          <Ted className="h-28 w-28" />
          <h1 className="text-4xl font-black">¡Escapa!</h1>
          <p className="max-w-xs text-sm font-semibold text-muted-foreground">Get Ted out of prison. Run through the door with the right Spanish and dodge the guards. Wrong door = −1 life and −5 seconds.</p>
          <div className="flex w-full max-w-sm flex-col gap-3">
            {LEVELS.map((L, i) => {
              const open = i <= progress.unlocked;
              const b = progress.best[i];
              return (
                <button
                  key={L.name}
                  type="button"
                  disabled={!open}
                  onClick={() => dispatch({ type: "start", lvl: i })}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl p-4 text-left shadow-soft transition active:scale-[0.98] ${open ? "bg-card" : "bg-muted opacity-60"}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${open ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>
                    {open ? i + 1 : <Lock className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{L.name}</span>
                    <span className="block text-xs font-bold text-muted-foreground">
                      {L.lessons} · {L.questions.length} rooms{!open ? ` · Beat level ${i} to unlock` : ""}
                    </span>
                  </span>
                  {b && (
                    <span className="flex flex-col items-end text-xs font-extrabold text-primary">
                      <Trophy className="h-4 w-4" />{b.time}s · {b.lives}♥
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold text-muted-foreground">Arrows or swipe to move</p>
          <button type="button" onClick={goBack} className="text-sm font-bold text-muted-foreground">Back to games</button>
        </div>
      )}

      {(s.phase === "won" || s.phase === "lost") && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur">
          <Ted className="h-36 w-36" />
          {s.phase === "won" ? (<>
            <h1 className="text-4xl font-black text-primary">¡Escapaste!</h1>
            <p className="text-sm font-semibold text-muted-foreground">Ted got out of {level.name} with {s.time}s left and {s.lives} {s.lives === 1 ? "life" : "lives"}.</p>
            <p className="text-sm font-bold">{s.hits} right · {s.misses} wrong doors</p>
            {hasNext && <p className="text-xs font-bold text-primary">Unlocked: Level {s.lvl + 2} · {LEVELS[s.lvl + 1]!.name}</p>}
          </>) : (<>
            <h1 className="text-4xl font-black text-destructive">Caught!</h1>
            <p className="text-sm font-semibold text-muted-foreground">Back to the cell. You reached room {s.qi + 1} of {level.questions.length}.</p>
          </>)}
          {s.phase === "won" && hasNext ? (
            <button type="button" onClick={() => dispatch({ type: "start", lvl: s.lvl + 1 })} className="h-14 w-full max-w-xs rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98]">
              Next level
            </button>
          ) : (
            <button type="button" onClick={() => dispatch({ type: "start", lvl: s.lvl })} className="h-14 w-full max-w-xs rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98]">
              Try again
            </button>
          )}
          <button type="button" onClick={() => dispatch({ type: "select" })} className="text-sm font-bold text-muted-foreground">Level select</button>
        </div>
      )}
    </div>
  );
}

function Sprite({ pos, children }: { pos: Pos; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute transition-all duration-150 ease-out"
      style={{ width: `${100 / COLS}%`, height: `${100 / ROWS}%`, left: `${(pos.c / COLS) * 100}%`, top: `${(pos.r / ROWS) * 100}%` }}
    >
      {children}
    </div>
  );
}

function Pad({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="flex h-14 items-center justify-center rounded-2xl bg-card text-foreground shadow-soft active:scale-95 active:bg-primary active:text-primary-foreground"
    >
      {children}
    </button>
  );
}
