import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, } from "@/components/app/AppShell";
import { Bar, Field, FormSheet, GhostButton, PrimaryButton, TextArea } from "@/components/app/ui";
import { BoxBreath } from "@/components/app/BoxBreath";
import { DRIVERS, clearDriver, driverLogsQuery, saveDriver, tierFor, type Driver } from "@/lib/drivers";

function HoldTimer({ onStop }: { onStop: (s: number) => void }) {
  const [run, setRun] = useState(false);
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = Date.now() - ms;
    const t = setInterval(() => setMs(Date.now() - start), 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return (
    <div className="rounded-3xl bg-secondary p-4 text-center">
      <p className="text-5xl font-extrabold tabular-nums">{(ms / 1000).toFixed(1)}s</p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => {
            if (run) onStop(Math.round(ms / 1000));
            setRun(!run);
          }}
          className="flex h-12 items-center gap-2 rounded-2xl bg-fitness px-5 font-extrabold text-primary-foreground"
        >
          {run ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />} {run ? "Stop hold" : "Start hold"}
        </button>
        <button onClick={() => { setRun(false); setMs(0); }} className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-card" aria-label="Reset">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function DailyDrivers({ date }: { date: string }) {
  const qc = useQueryClient();
  const { data: logs } = useQuery(driverLogsQuery(date));
  const [open, setOpen] = useState<Driver | null>(null);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState<{ d: Driver; tier?: string | undefined } | null>(null);

  const byKey = new Map((logs ?? []).map((l) => [l.driver_key, l]));
  const done = DRIVERS.filter((d) => byKey.has(d.key)).length;
  const total = DRIVERS.length;
  const tier = tierFor(done);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const save = useMutation({
    mutationFn: async ({ d, ev }: { d: Driver; ev: string }) => saveDriver(date, d.key, ev),
    onSuccess: (_r, { d }) => {
      const wasNew = !byKey.has(d.key);
      const nextTier = tierFor(done + (wasNew ? 1 : 0));
      setFlash({ d, tier: nextTier.label !== tier.label ? nextTier.label : undefined });
      navigator.vibrate?.(wasNew ? [30, 40, 60] : 20);
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["driver_logs", date] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const undo = useMutation({
    mutationFn: (d: Driver) => clearDriver(date, d.key),
    onSuccess: () => {
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["driver_logs", date] });
    },
  });

  const openDriver = (d: Driver) => {
    setText(byKey.get(d.key)?.evidence ?? "");
    setOpen(d);
  };

  const complete = done === total;

  return (
    <>
      <Card className={complete ? "ring-2 ring-trading" : ""}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Daily drivers</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold leading-none">
              <Zap className="h-6 w-6 text-fitness" fill="currentColor" /> {tier.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{tier.note}</p>
          </div>
          <p className="text-4xl font-extrabold tabular-nums leading-none">
            {done}
            <span className="text-lg text-muted-foreground">/{total}</span>
          </p>
        </div>
        <div className="mt-3">
          <Bar pct={(done / total) * 100} className={complete ? "bg-trading" : "bg-fitness"} />
        </div>

        <ul className="mt-4 space-y-2">
          {DRIVERS.map((d) => {
            const log = byKey.get(d.key);
            return (
              <li key={d.key}>
                <button
                  onClick={() => openDriver(d)}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                    log ? `border-transparent ${d.soft}` : "bg-card"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-all ${
                      log ? `${d.bg} text-primary-foreground scale-105` : "bg-secondary"
                    }`}
                  >
                    {log ? <Check className="h-5 w-5" strokeWidth={3} /> : d.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-tight">{d.title}</span>
                    <span className={`block truncate text-xs font-semibold ${log ? "text-foreground/70" : "text-muted-foreground"}`}>
                      {log ? `“${log.evidence}”` : d.objective}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[10px] font-extrabold uppercase ${d.text}`}>{d.tag}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <FormSheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open ? `${open.emoji} ${open.title}` : ""}>
        {open && (
          <>
            <p className="text-sm font-semibold text-muted-foreground">{open.objective}</p>
            {open.tool === "breath" && <BoxBreath totalSeconds={120} />}
            {open.tool === "timer" && (
              <HoldTimer onStop={(s) => setText((t) => (t ? `${t} · hold ${s}s` : `Hold ${s}s`))} />
            )}
            <Field label={`Proof · ${open.prompt}`}>
              <TextArea rows={3} value={text} placeholder={open.placeholder} onChange={(e) => setText(e.target.value)} />
            </Field>
            <PrimaryButton
              disabled={text.trim().length < 3 || save.isPending}
              onClick={() => save.mutate({ d: open, ev: text.trim() })}
            >
              {byKey.has(open.key) ? "Update proof" : "Lock it in"}
            </PrimaryButton>
            {byKey.has(open.key) && (
              <GhostButton onClick={() => undo.mutate(open)}>Untick</GhostButton>
            )}
          </>
        )}
      </FormSheet>

      {flash && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm animate-in fade-in zoom-in-95"
          onClick={() => setFlash(null)}
        >
          <div className="text-center">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${flash.d.bg} text-primary-foreground shadow-float`}>
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>
            {flash.tier && (
              <p className={`mt-4 text-sm font-extrabold uppercase tracking-widest ${flash.d.text}`}>Level up · {flash.tier}</p>
            )}
            <p className="mt-3 text-xl font-extrabold leading-snug">“{flash.d.identity}”</p>
            <p className="mt-2 text-sm font-bold text-muted-foreground">
              {done >= total ? "Day dominated." : `${done}/${total} · keep stacking`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
