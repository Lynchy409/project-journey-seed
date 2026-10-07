import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Timer } from "lucide-react";
import { Guard, Ted } from "@/components/app/Ted";
import { COLS, DOOR_COLS, LEVEL_1, ROOMS, ROWS, START_LIVES, START_SECONDS, type EscapaQuestion } from "@/lib/escapa";
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
type Phase = "intro" | "play" | "won" | "lost";
type Flash = { kind: "good" | "bad"; text: string } | null;
type State = {
  phase: Phase; qi: number; options: string[]; pos: Pos; facing: 1 | -1;
  lives: number; time: number; guard: Pos; gdir: 1 | -1; locked: number[];
  flash: Flash; hits: number; misses: number;
};

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const room = (qi: number) => ROOMS[qi % ROOMS.length]!;
const startPos = (qi: number): Pos => {
  const m = room(qi).map;
  for (let r = 0; r < ROWS; r++) { const c = m[r]!.indexOf("S"); if (c >= 0) return { r, c }; }
  return { r: ROWS - 2, c: 4 };
};
const cell = (qi: number, p: Pos) => room(qi).map[p.r]?.[p.c] ?? "#";

function enterRoom(s: State, qi: number): State {
  const q = LEVEL_1[qi] as EscapaQuestion;
  return { ...s, qi, options: shuffle(q.options), pos: startPos(qi), locked: [], guard: { r: room(qi).guardRow, c: 1 }, gdir: 1 };
}
function caught(s: State): State {
  const lives = s.lives - 1;
  beep("switch");
  return { ...s, lives, pos: startPos(s.qi), phase: lives <= 0 ? "lost" : s.phase, flash: { kind: "bad", text: "Caught by the guard! −1 life" } };
}

type Action = { type: "start" } | { type: "move"; dr: number; dc: number } | { type: "tick" } | { type: "second" } | { type: "clearFlash" };

function reducer(s: State, a: Action): State {
  if (a.type === "start") return enterRoom({ ...s, phase: "play", lives: START_LIVES, time: START_SECONDS, hits: 0, misses: 0, flash: null }, 0);
  if (a.type === "clearFlash") return { ...s, flash: null };
  if (s.phase !== "play") return s;
  if (a.type === "second") {
    const time = s.time - 1;
    return time <= 0 ? { ...s, time: 0, phase: "lost" } : { ...s, time };
  }
  if (a.type === "tick") {
    let c = s.guard.c + s.gdir; let gdir = s.gdir;
    if (cell(s.qi, { r: s.guard.r, c }) !== ".") { gdir = (s.gdir * -1) as 1 | -1; c = s.guard.c + gdir; }
    const ns = { ...s, guard: { r: s.guard.r, c }, gdir };
    return ns.guard.r === s.pos.r && ns.guard.c === s.pos.c ? caught(ns) : ns;
  }
  // move
  const next = { r: s.pos.r + a.dr, c: s.pos.c + a.dc };
  const facing = a.dc ? ((a.dc > 0 ? 1 : -1) as 1 | -1) : s.facing;
  const t = cell(s.qi, next);
  if (t === "#") return { ...s, facing };
  if (t === "D") {
    const di = DOOR_COLS.indexOf(next.c);
    if (s.locked.includes(di)) return { ...s, facing };
    const q = LEVEL_1[s.qi]!;
    if (s.options[di] === q.answer) {
      beep("next");
      const hits = s.hits + 1;
      if (s.qi + 1 >= LEVEL_1.length) return { ...s, hits, phase: "won", flash: { kind: "good", text: q.rule } };
      return { ...enterRoom({ ...s, hits, facing }, s.qi + 1), flash: { kind: "good", text: q.rule } };
    }
    beep("switch");
    const lives = s.lives - 1;
    return {
      ...s, facing, lives, misses: s.misses + 1, time: Math.max(1, s.time - 5), locked: [...s.locked, di], pos: startPos(s.qi),
      phase: lives <= 0 ? "lost" : "play",
      flash: { kind: "bad", text: `Alarm! Wrong door −1 life −5s. ${q.rule}` },
    };
  }
  const ns = { ...s, pos: next, facing };
  return next.r === s.guard.r && next.c === s.guard.c ? caught(ns) : ns;
}

const initial: State = {
  phase: "intro", qi: 0, options: LEVEL_1[0]!.options, pos: startPos(0), facing: 1, lives: START_LIVES, time: START_SECONDS,
  guard: { r: ROOMS[0]!.guardRow, c: 1 }, gdir: 1, locked: [], flash: null, hits: 0, misses: 0,
};

function EscapaPage() {
  const router = useRouter();
  const [s, dispatch] = useReducer(reducer, initial);
  const [best, setBest] = useState<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.touchAction];
    html.style.overflow = "hidden"; body.style.overflow = "hidden"; body.style.overscrollBehavior = "none"; body.style.touchAction = "none";
    const v = window.localStorage.getItem("escapa-l1-best");
    if (v) setBest(Number(v));
    return () => { [html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.touchAction] = prev as [string, string, string, string]; };
  }, []);

  useEffect(() => {
    if (s.phase !== "play") return;
    const speed = Math.max(220, 480 - s.qi * 25);
    const g = setInterval(() => dispatch({ type: "tick" }), speed);
    const t = setInterval(() => dispatch({ type: "second" }), 1000);
    return () => { clearInterval(g); clearInterval(t); };
  }, [s.phase, s.qi]);

  useEffect(() => {
    if (!s.flash) return;
    const id = setTimeout(() => dispatch({ type: "clearFlash" }), 2200);
    return () => clearTimeout(id);
  }, [s.flash]);

  useEffect(() => {
    if (s.phase === "won" && (best === null || s.time > best)) {
      setBest(s.time); window.localStorage.setItem("escapa-l1-best", String(s.time));
    }
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const keys: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const h = (e: KeyboardEvent) => { const k = keys[e.key]; if (k) { e.preventDefault(); dispatch({ type: "move", dr: k[0], dc: k[1] }); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const move = (dr: number, dc: number) => dispatch({ type: "move", dr, dc });
  const goBack = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/learn" }));
  const map = room(s.qi).map;
  const q = LEVEL_1[s.qi]!;
  const low = s.time <= 15;

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
      {/* HUD */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="flex gap-1">
          {Array.from({ length: START_LIVES }).map((_, i) => (
            <Heart key={i} className={`h-6 w-6 ${i < s.lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
          ))}
        </div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Room {s.qi + 1}/{LEVEL_1.length}</p>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black tabular-nums ${low ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-card shadow-soft"}`}>
          <Timer className="h-4 w-4" /> {Math.floor(s.time / 60)}:{String(s.time % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Question */}
      <div className="mx-4 rounded-2xl bg-card p-3 text-center shadow-soft">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Level 1 · The Cell Block</p>
        <p className="text-xl font-black leading-tight">{q.q}</p>
      </div>

      {/* Maze */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pt-2">
        <div className="relative" style={{ width: `min(100%, calc((100dvh - 330px) * ${COLS / (ROWS + 1.4)}))` }}>
          {/* door labels */}
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
                const di = DOOR_COLS.indexOf(c);
                const isDoor = ch === "D";
                const locked = isDoor && s.locked.includes(di);
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
            {/* searchlight */}
            <div className="pointer-events-none absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] bg-[radial-gradient(circle_at_70%_40%,hsl(50_100%_70%/0.25),transparent_45%)]" />
            <Sprite pos={s.guard}><Guard className="h-full w-full" /></Sprite>
            <Sprite pos={s.pos}><Ted facing={s.facing} className="h-full w-full scale-125" /></Sprite>
          </div>
        </div>
      </div>

      {/* Flash */}
      {s.flash && s.phase === "play" && (
        <div className={`absolute inset-x-4 top-1/3 z-20 rounded-2xl p-4 text-center text-sm font-extrabold shadow-float animate-in fade-in zoom-in-95 ${s.flash.kind === "good" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {s.flash.kind === "good" ? "Gate open! " : ""}{s.flash.text}
        </div>
      )}

      {/* D-pad */}
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

      {s.phase !== "play" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur">
          <Ted className="h-36 w-36" />
          {s.phase === "intro" && (<>
            <h1 className="text-4xl font-black">¡Escapa!</h1>
            <p className="max-w-xs text-sm font-semibold text-muted-foreground">Ted is locked in the Cell Block. Run through the door with the right Spanish. Dodge the guard. Wrong door = −1 life and −5 seconds.</p>
            <p className="text-xs font-bold text-muted-foreground">Arrows or swipe to move · 3 lives · 2 minutes{best !== null ? ` · Best: ${best}s left` : ""}</p>
          </>)}
          {s.phase === "won" && (<>
            <h1 className="text-4xl font-black text-primary">¡Escapaste!</h1>
            <p className="text-sm font-semibold text-muted-foreground">Ted broke out of the Cell Block with {s.time}s left and {s.lives} {s.lives === 1 ? "life" : "lives"}.</p>
            <p className="text-sm font-bold">{s.hits} right · {s.misses} wrong doors</p>
            <p className="text-xs font-bold text-muted-foreground">Level 2 · The Guard Corridor — coming next</p>
          </>)}
          {s.phase === "lost" && (<>
            <h1 className="text-4xl font-black text-destructive">Caught!</h1>
            <p className="text-sm font-semibold text-muted-foreground">Back to the cell. You reached room {s.qi + 1} of {LEVEL_1.length}.</p>
          </>)}
          <button type="button" onClick={() => dispatch({ type: "start" })} className="h-14 w-full max-w-xs rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98]">
            {s.phase === "intro" ? "Start escape" : "Try again"}
          </button>
          <button type="button" onClick={goBack} className="text-sm font-bold text-muted-foreground">Back to games</button>
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
