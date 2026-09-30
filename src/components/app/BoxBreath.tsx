import { useEffect, useState } from "react";

const PHASES = [
  { label: "Inhale", scale: "scale-100" },
  { label: "Hold", scale: "scale-100" },
  { label: "Exhale", scale: "scale-[0.6]" },
  { label: "Hold", scale: "scale-[0.6]" },
] as const;

/** Visual box-breathing pacer: 4s inhale, hold, exhale, hold. */
export function BoxBreath({ totalSeconds = 120 }: { totalSeconds?: number }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (elapsed >= totalSeconds && running) setRunning(false);
  }, [elapsed, running, totalSeconds]);

  const done = elapsed >= totalSeconds;
  const phase = PHASES[Math.floor(elapsed / 4) % 4]!;
  const inPhase = 4 - (elapsed % 4);
  const left = Math.max(0, totalSeconds - elapsed);

  return (
    <div className="rounded-3xl bg-card p-6 text-center shadow-card">
      <div className="flex h-40 items-center justify-center">
        <div
          className={`flex h-36 w-36 items-center justify-center rounded-full bg-primary/15 transition-transform duration-[3800ms] ease-in-out ${running ? phase.scale : "scale-[0.8]"}`}
        >
          <div className="text-center">
            <p className="text-xl font-extrabold">{done ? "Done" : running ? phase.label : "Ready"}</p>
            {running && !done && <p className="text-3xl font-extrabold tabular-nums">{inPhase}</p>}
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-muted-foreground">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left · 4 in, 4 hold, 4 out, 4 hold
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          {running ? "Pause" : done ? "Again" : "Start breathing"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
          className="h-12 flex-1 rounded-2xl border text-sm font-bold active:scale-[0.98] transition-transform"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
