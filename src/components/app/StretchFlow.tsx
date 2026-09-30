import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { MORNING_FLOW, beep, FLOW_SECONDS } from "@/lib/morning";
import { PoseArt } from "@/components/app/PoseArt";
import { PrimaryButton, GhostButton } from "@/components/app/ui";

/** Hands-free 6-minute mobility flow: auto-advances with audio cues. */
export function StretchFlow({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(MORNING_FLOW[0]!.seconds);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const [finished, setFinished] = useState(false);
  const move = MORNING_FLOW[i]!;
  const next = MORNING_FLOW[i + 1];
  const half = Math.floor(move.seconds / 2);
  const lastTick = useRef(-1);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!running || lastTick.current === left) return;
    lastTick.current = left;
    if (left <= 0) {
      beep("next");
      if (i === MORNING_FLOW.length - 1) {
        setRunning(false);
        setFinished(true);
      } else {
        setI(i + 1);
        setLeft(MORNING_FLOW[i + 1]!.seconds);
      }
      return;
    }
    if (move.sides && left === half) {
      beep("switch");
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    } else if (left <= 3) beep("tick");
  }, [left, running, i, half, move.sides]);

  const go = (n: number) => {
    const clamped = Math.max(0, Math.min(MORNING_FLOW.length - 1, n));
    setI(clamped);
    setLeft(MORNING_FLOW[clamped]!.seconds);
    lastTick.current = -1;
  };

  const elapsed = MORNING_FLOW.slice(0, i).reduce((s, m) => s + m.seconds, 0) + (move.seconds - left);
  const pct = Math.round((elapsed / FLOW_SECONDS) * 100);

  if (finished) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fitness-soft text-4xl">💪</div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Body switched on</h2>
          <p className="mt-2 text-base font-semibold text-muted-foreground">Six movements, six minutes. Hips, back and hamstrings open.</p>
        </div>
        <div className="space-y-3">
          <PrimaryButton onClick={onDone}>Continue morning flow</PrimaryButton>
          <GhostButton onClick={() => { setFinished(false); go(0); setStarted(false); setRunning(false); }}>Run it again</GhostButton>
        </div>
      </Shell>
    );
  }

  if (!started) {
    return (
      <Shell>
        <button aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">6 minutes · 6 movements · hands free</p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight">Morning mobility flow</h2>
          <p className="mt-3 text-base font-semibold text-muted-foreground">
            Prop your phone up where you can see it. It beeps and moves on by itself — you never touch the screen.
          </p>
          <ol className="mt-6 space-y-2">
            {MORNING_FLOW.map((m, n) => (
              <li key={m.key} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-extrabold">{n + 1}</span>
                <span className="text-sm font-bold leading-tight">{m.name}</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground">{m.seconds}s</span>
              </li>
            ))}
          </ol>
        </div>
        <PrimaryButton onClick={() => { setStarted(true); setRunning(true); beep("next"); }}>Start flow</PrimaryButton>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <button aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Movement {i + 1} of {MORNING_FLOW.length}
        </p>
        <h2 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">{move.name}</h2>
        <span className="mt-3 inline-flex w-fit rounded-full bg-fitness-soft px-3 py-1 text-xs font-bold text-fitness">{move.target}</span>

        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-card">
          <PoseArt pose={move.key} className="h-32 w-40 shrink-0 text-foreground" />
          <div className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full ${left <= 3 ? "bg-primary/15 animate-pulse" : "bg-secondary"}`}>
            <span className="text-4xl font-extrabold tabular-nums">{left}</span>
          </div>
        </div>

        {flash && (
          <p className="mt-4 rounded-2xl bg-primary px-4 py-3 text-center text-lg font-extrabold text-primary-foreground animate-scale-in">
            Switch sides
          </p>
        )}

        <ul className="mt-4 space-y-1.5">
          {move.cues.map((c) => (
            <li key={c} className="text-base font-semibold leading-snug">• {c}</li>
          ))}
        </ul>

        <div className="mt-4 rounded-2xl bg-learning-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-learning">🔥 Pro tip & level up</p>
          <p className="mt-1.5 text-sm font-semibold leading-snug">{move.tip}</p>
        </div>

        {next && (
          <p className="mt-4 text-sm font-bold text-muted-foreground">Up next: {next.name}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button aria-label="Previous movement" onClick={() => go(i - 1)} className="flex h-14 w-14 items-center justify-center rounded-3xl border bg-card active:scale-95 transition-transform">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {running ? "Pause" : "Resume"}
        </button>
        <button aria-label="Next movement" onClick={() => go(i + 1)} className="flex h-14 w-14 items-center justify-center rounded-3xl border bg-card active:scale-95 transition-transform">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      {children}
    </div>
  );
}
