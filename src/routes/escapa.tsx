import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bone, Heart, Lock, MoveHorizontal, Timer, Trophy } from "lucide-react";
import { Ted } from "@/components/app/Ted";
import { EscapaChase, type ChaseInput } from "@/components/escapa/EscapaChase";
import { EscapaScene, type Stick } from "@/components/escapa/EscapaScene";
import { LEVELS, START_LIVES, loadProgress, saveProgress, type EscapaProgress } from "@/lib/escapa";
import { beep } from "@/lib/morning";

export const Route = createFileRoute("/escapa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "¡Escapa! — Ted's prison break | My Journey" },
      { name: "description", content: "Guide Ted the cockapoo out of a 3D prison by running through the right Spanish answer." },
      { property: "og:title", content: "¡Escapa! — Ted's prison break" },
      { property: "og:description", content: "A 3D Spanish escape game built on the Language Transfer course." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EscapaPage,
});

type Phase = "select" | "play" | "won" | "lost";
type Flash = { kind: "good" | "bad"; text: string } | null;
type S = { phase: Phase; lvl: number; qi: number; options: string[]; lives: number; time: number; locked: number[]; flash: Flash; hits: number; misses: number };
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function EscapaPage() {
  const router = useRouter();
  const [s, setS] = useState<S>({ phase: "select", lvl: 0, qi: 0, options: [], lives: START_LIVES, time: 0, locked: [], flash: null, hits: 0, misses: 0 });
  const [progress, setProgress] = useState<EscapaProgress>({ unlocked: 0, best: {} });
  const input = useRef<Stick>({ x: 0, y: 0 });
  const chaseInput = useRef<ChaseInput>({ lane: 0, jump: 0 });
  const [knob, setKnob] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
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
    const t = setInterval(() => setS((p) => (p.phase !== "play" ? p : p.time <= 1 ? { ...p, time: 0, phase: "lost" } : { ...p, time: p.time - 1 })), 1000);
    return () => clearInterval(t);
  }, [s.phase]);

  useEffect(() => {
    if (!s.flash) return;
    const id = setTimeout(() => setS((p) => ({ ...p, flash: null })), 2200);
    return () => clearTimeout(id);
  }, [s.flash]);

  useEffect(() => {
    if (s.phase !== "won") return;
    setProgress((p) => {
      const pb = p.best[s.lvl];
      const np: EscapaProgress = {
        unlocked: Math.max(p.unlocked, Math.min(s.lvl + 1, LEVELS.length - 1)),
        best: !pb || s.time > pb.time ? { ...p.best, [s.lvl]: { time: s.time, lives: s.lives } } : p.best,
      };
      saveProgress(np);
      return np;
    });
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (lvl: number) =>
    setS({ phase: "play", lvl, qi: 0, options: shuffle(LEVELS[lvl]!.questions[0]!.options), lives: START_LIVES, time: LEVELS[lvl]!.seconds, locked: [], flash: null, hits: 0, misses: 0 });

  const onDoor = (i: number) => setS((p) => {
    if (p.phase !== "play" || p.locked.includes(i)) return p;
    const qs = LEVELS[p.lvl]!.questions, q = qs[p.qi]!;
    if (p.options[i] === q.answer) {
      beep("next");
      if (p.qi + 1 >= qs.length) return { ...p, hits: p.hits + 1, phase: "won", flash: null };
      return { ...p, hits: p.hits + 1, qi: p.qi + 1, options: shuffle(qs[p.qi + 1]!.options), locked: [], flash: { kind: "good", text: q.rule } };
    }
    beep("switch");
    const lives = p.lives - 1;
    return { ...p, lives, misses: p.misses + 1, time: Math.max(1, p.time - 5), locked: [...p.locked, i], phase: lives <= 0 ? "lost" : "play", flash: { kind: "bad", text: `Alarm! Wrong door −1 life −5s. ${q.rule}` } };
  });
  const onHit = (why: string) => setS((p) => {
    if (p.phase !== "play") return p;
    beep("switch");
    const lives = p.lives - 1;
    return { ...p, lives, phase: lives <= 0 ? "lost" : "play", flash: { kind: "bad", text: `${why} −1 life` } };
  });
  const onBone = () => setS((p) => { beep("next"); return { ...p, time: p.time + 5, flash: { kind: "good", text: "Bone! +5 seconds" } }; });

  const R = 55;
  const stickMove = (e: React.PointerEvent) => {
    if (!knob) return;
    let dx = e.clientX - knob.ox, dy = e.clientY - knob.oy;
    const len = Math.hypot(dx, dy); if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    input.current = { x: dx / R, y: dy / R };
    setKnob({ ...knob, x: dx, y: dy });
  };
  const stickEnd = () => { input.current = { x: 0, y: 0 }; setKnob(null); };

  const goBack = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/learn" }));
  const q = level.questions[s.qi]!;
  const hasNext = s.lvl + 1 < LEVELS.length;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-background">
      {s.phase !== "select" && (
        <div className="absolute inset-0">
          <EscapaScene lvl={s.lvl} qi={s.qi} options={s.options} locked={s.locked} active={s.phase === "play"} input={input} onDoor={onDoor} onHit={onHit} onBone={onBone} />
        </div>
      )}

      {s.phase !== "select" && (level.mode === "chase" ? (
        <EscapaChase lvl={s.lvl} qi={s.qi} locked={s.locked} active={s.phase === "play"} input={chaseInput} onDoor={onDoor} onHit={onHit} onBone={onBone} />
      ) : (
        <EscapaScene lvl={s.lvl} qi={s.qi} options={s.options} locked={s.locked} active={s.phase === "play"} input={input} onDoor={onDoor} onHit={onHit} onBone={onBone} />
      ))}

      {s.phase === "play" && level.mode === "corridor" && (
        <div
          className="absolute inset-0 z-10 touch-none"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setKnob({ ox: e.clientX, oy: e.clientY, x: 0, y: 0 }); }}
          onPointerMove={stickMove}
          onPointerUp={stickEnd}
          onPointerCancel={stickEnd}
        >
          {knob && (
            <div className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card/80 bg-foreground/15" style={{ left: knob.ox, top: knob.oy }}>
              <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-card shadow-float" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
            </div>
          )}
        </div>
      )}

      {s.phase === "play" && level.mode === "chase" && (
        <div
          className="absolute inset-0 z-10 touch-none"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); swipe.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={(e) => {
            const origin = swipe.current;
            swipe.current = null;
            if (!origin) return;
            const dx = e.clientX - origin.x, dy = e.clientY - origin.y;
            if (Math.abs(dy) > Math.abs(dx) && dy < -28) chaseInput.current.jump += 1;
            else if (Math.abs(dx) > 25) chaseInput.current.lane = dx > 0 ? -1 : 1;
            else chaseInput.current.jump += 1;
          }}
          onPointerCancel={() => { swipe.current = null; }}
        />
      )}

      {s.phase === "play" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),10px)]">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-full bg-card/90 px-2 py-1 shadow-soft">
              {Array.from({ length: START_LIVES }).map((_, i) => (
                <Heart key={i} className={`h-5 w-5 ${i < s.lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
              ))}
            </div>
            <p className="rounded-full bg-card/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wider shadow-soft">Room {s.qi + 1}/{level.questions.length}</p>
            <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black tabular-nums shadow-soft ${s.time <= 15 ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-card/90"}`}>
              <Timer className="h-4 w-4" /> {Math.floor(s.time / 60)}:{String(s.time % 60).padStart(2, "0")}
            </div>
          </div>
          <div className="mx-auto mt-2 max-w-md rounded-2xl bg-card/95 p-3 text-center shadow-soft">
             <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Level {s.lvl + 1} · {level.name} · {level.mode === "chase" ? "Chase" : "Escape"}</p>
            <p className="text-xl font-black leading-tight">{q.q}</p>
          </div>
          <div className="mx-auto mt-2 grid max-w-md grid-cols-3 gap-2">
            {s.options.map((o, i) => (
              <div key={i} className={`rounded-xl px-1 py-2 text-center text-sm font-extrabold leading-tight shadow-soft ${s.locked.includes(i) ? "bg-destructive/80 text-destructive-foreground line-through" : "bg-fitness text-primary-foreground"}`}>
                <span className="block text-[9px] uppercase tracking-widest opacity-80">{["Left", "Middle", "Right"][i]} door</span>{o}
              </div>
            ))}
          </div>
        </div>
      )}

      {s.flash && s.phase === "play" && (
        <div className={`pointer-events-none absolute inset-x-4 top-1/3 z-20 mx-auto max-w-md rounded-2xl p-4 text-center text-sm font-extrabold shadow-float animate-in fade-in zoom-in-95 ${s.flash.kind === "good" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {s.flash.text}
        </div>
      )}

       {s.phase === "play" && !knob && (
         <p className="pointer-events-none absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-20 text-center text-xs font-bold text-foreground/70">
           {level.mode === "chase" ? "Swipe sideways to change lane · swipe up or tap to jump" : "Press anywhere and drag to run"}
         </p>
      )}

      <button type="button" onClick={goBack} className="fixed bottom-3 left-3 z-30 rounded-full bg-foreground/40 px-3 py-1.5 text-xs font-semibold text-background backdrop-blur" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        ← Back
      </button>

      {s.phase === "select" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center gap-4 overflow-y-auto bg-background p-6 pt-[max(env(safe-area-inset-top),24px)] text-center">
          <Ted className="h-28 w-28" />
          <h1 className="text-4xl font-black">¡Escapa!</h1>
          <p className="max-w-xs text-sm font-semibold text-muted-foreground">Get Ted out of prison. Run through the door with the right Spanish. Dodge guard torches and lasers, and grab bones for extra time.</p>
          <div className="flex w-full max-w-sm flex-col gap-3">
            {LEVELS.map((L, i) => {
              const open = i <= progress.unlocked, b = progress.best[i];
              return (
                <button key={L.name} type="button" disabled={!open} onClick={() => start(i)}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl p-4 text-left shadow-soft transition active:scale-[0.98] ${open ? "bg-card" : "bg-muted opacity-60"}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${open ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>
                    {open ? i + 1 : <Lock className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{L.name}</span>
                     <span className="block text-xs font-bold text-muted-foreground">{L.lessons} · {L.questions.length} stages · {L.mode === "chase" ? "fast chase" : "3D escape"}{!open ? ` · Beat level ${i} to unlock` : ""}</span>
                  </span>
                  {b && <span className="flex flex-col items-end text-xs font-extrabold text-primary"><Trophy className="h-4 w-4" />{b.time}s · {b.lives}♥</span>}
                </button>
              );
            })}
          </div>
           <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><MoveHorizontal className="h-4 w-4" /> Gameplay changes as Ted escapes</p>
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
          <button type="button" onClick={() => start(s.phase === "won" && hasNext ? s.lvl + 1 : s.lvl)} className="h-14 w-full max-w-xs rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98]">
            {s.phase === "won" && hasNext ? "Next level" : "Try again"}
          </button>
          <button type="button" onClick={() => setS((p) => ({ ...p, phase: "select", flash: null }))} className="text-sm font-bold text-muted-foreground">Level select</button>
        </div>
      )}
    </div>
  );
}
