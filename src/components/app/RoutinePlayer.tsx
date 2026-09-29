import { useEffect, useMemo, useState } from "react";
import { Check, Pause, Play, X } from "lucide-react";
import type { Routine } from "@/lib/routines";
import { totalSeconds } from "@/lib/routines";

export function RoutinePlayer({ routine, onClose, onComplete }: { routine: Routine; onClose: () => void; onComplete: (seconds: number) => void }) {
  const steps = routine.routine_steps;
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds ?? 30);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const total = useMemo(() => totalSeconds(steps), [steps]);

  const step = steps[i];

  useEffect(() => {
    if (!running || done) return;
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [running, done]);

  useEffect(() => {
    if (left > 0 || done) return;
    if (i < steps.length - 1) {
      const next = i + 1;
      setI(next);
      setLeft(steps[next]?.seconds ?? 30);
    } else {
      setDone(true);
      setRunning(false);
    }
  }, [left, i, steps, done]);

  const goNext = () => {
    if (i < steps.length - 1) {
      const next = i + 1;
      setI(next);
      setLeft(steps[next]?.seconds ?? 30);
    } else {
      setDone(true);
      setRunning(false);
    }
  };

  const elapsedBefore = steps.slice(0, i).reduce((s, x) => s + x.seconds, 0);
  const progress = total ? Math.min(100, Math.round(((elapsedBefore + ((step?.seconds ?? 0) - left)) / total) * 100)) : 0;

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fitness-soft">
          <Check className="h-12 w-12 text-fitness" />
        </div>
        <p className="mt-6 text-3xl font-extrabold leading-tight">{routine.name} done</p>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {steps.length} movements · {Math.round(total / 60)} min
        </p>
        <button
          onClick={() => onComplete(total)}
          className="mt-10 h-16 w-full max-w-sm rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
        >
          Log it
        </button>
        <button onClick={onClose} className="mt-3 h-12 w-full max-w-sm rounded-2xl text-sm font-bold text-muted-foreground">
          Close without logging
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 px-5 pt-6">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-fitness transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <button aria-label="Close routine" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Step {i + 1} of {steps.length}
        </p>
        <p className="mt-3 text-3xl font-extrabold leading-tight">{step?.name}</p>
        {step?.cue && <p className="mt-4 max-w-sm text-base font-semibold leading-relaxed text-muted-foreground">{step.cue}</p>}
        <p className="mt-10 text-8xl font-extrabold tabular-nums leading-none text-fitness">{left}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">seconds left</p>
      </div>

      <div className="space-y-3 px-5 pb-10">
        <button
          onClick={goNext}
          className="h-16 w-full rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
        >
          {i < steps.length - 1 ? "Next movement" : "Finish routine"}
        </button>
        <button onClick={() => setRunning((r) => !r)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-bold">
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}
