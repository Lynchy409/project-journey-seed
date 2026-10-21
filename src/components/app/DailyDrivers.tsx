import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Field, FormSheet, GhostButton, PrimaryButton, TextArea } from "@/components/app/ui";
import { BoxBreath } from "@/components/app/BoxBreath";
import { DRIVERS, TIER_LABELS, clearDriver, driverLogsQuery, driverXp, saveDriver, tierFor, type Driver } from "@/lib/drivers";
import { OUTCOMES, parseOutcome, type TradeOutcome } from "@/lib/xp";

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

export function OutcomePicker({ value, onChange }: { value: TradeOutcome | null; onChange: (o: TradeOutcome) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OUTCOMES.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-[56px] rounded-2xl border px-2 text-xs font-extrabold transition-all ${value === o.key ? `${o.cls} border-transparent scale-[1.02]` : "bg-card"}`}
        >
          <span className="block text-base">{o.emoji}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DailyDrivers({ date }: { date: string }) {
  const qc = useQueryClient();
  const { data: logs } = useQuery(driverLogsQuery(date));
  const [open, setOpen] = useState<Driver | null>(null);
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<TradeOutcome | null>(null);
  const [flash, setFlash] = useState<{ d: Driver; xp: number } | null>(null);

  const byKey = new Map((logs ?? []).map((l) => [l.driver_key, l]));
  const done = DRIVERS.filter((d) => byKey.has(d.key)).length;
  const total = DRIVERS.length;
  const tier = tierFor(done);
  const xpToday = (logs ?? []).reduce((s, l) => s + driverXp(l.driver_key, l.evidence), 0);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(t);
  }, [flash]);

  const save = useMutation({
    mutationFn: async ({ d, ev }: { d: Driver; ev: string }) => saveDriver(date, d.key, ev),
    onSuccess: (_r, { d, ev }) => {
      const prev = byKey.get(d.key);
      const gained = driverXp(d.key, ev) - (prev ? driverXp(d.key, prev.evidence) : 0);
      setFlash({ d, xp: gained });
      navigator.vibrate?.(gained > 0 ? [30, 40, 60] : 20);
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["driver_logs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const undo = useMutation({
    mutationFn: (d: Driver) => clearDriver(date, d.key),
    onSuccess: () => {
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["driver_logs"] });
    },
  });

  const openDriver = (d: Driver) => {
    const ev = byKey.get(d.key)?.evidence ?? "";
    const p = parseOutcome(ev);
    setOutcome(p.outcome);
    setText(d.key === "trading" ? p.note : ev);
    setOpen(d);
  };

  const isTrading = open?.key === "trading";
  const canSave = text.trim().length >= 3 && (!isTrading || !!outcome);

  return (
    <>
      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Daily challenges</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold leading-none">
              <Zap className="h-6 w-6 text-trading" fill="currentColor" /> {tier.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{tier.note}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold tabular-nums leading-none text-trading">+{xpToday}</p>
            <p className="text-xs font-bold text-muted-foreground">{done}/{total} claimed</p>
          </div>
        </div>

        {([1, 2, 3] as const).map((t) => (
          <div key={t} className="mt-4">
            <p className={`mb-2 text-[11px] font-extrabold uppercase tracking-widest ${t === 1 ? "text-fitness" : "text-muted-foreground"}`}>
              {t === 1 ? "🔥 " : ""}{TIER_LABELS[t]}
            </p>
            <ul className="space-y-2">
              {DRIVERS.filter((d) => d.tier === t).map((d) => {
                const log = byKey.get(d.key);
                const shown = log ? (d.key === "trading" ? parseOutcome(log.evidence).note : log.evidence) : d.objective;
                const xp = log ? driverXp(d.key, log.evidence) : d.xp;
                return (
                  <li key={d.key}>
                    <button
                      onClick={() => openDriver(d)}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                        log ? `border-transparent ${d.soft}` : t === 1 ? "bg-card border-fitness/40" : "bg-card"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${log ? `${d.bg} text-primary-foreground` : "bg-secondary"}`}>
                        {log ? <Check className="h-5 w-5" strokeWidth={3} /> : d.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold leading-tight">{d.title}</span>
                        <span className={`block truncate text-xs font-semibold ${log ? "text-foreground/70" : "text-muted-foreground"}`}>
                          {log ? `“${shown}”` : shown}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-extrabold tabular-nums ${log ? `${d.bg} text-primary-foreground` : "bg-secondary"}`}>
                        {log ? "✓ " : "+"}{xp} XP
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Card>

      <FormSheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open ? `${open.emoji} ${open.title} · +${open.xp} XP` : ""}>
        {open && (
          <>
            <p className="text-sm font-semibold text-muted-foreground">{open.objective}</p>
            {isTrading && <OutcomePicker value={outcome} onChange={setOutcome} />}
            {open.tool === "breath" && <BoxBreath totalSeconds={120} />}
            {open.tool === "timer" && <HoldTimer onStop={(s) => setText((x) => (x ? `${x} · hold ${s}s` : `Hold ${s}s`))} />}
            <Field label={`Proof · ${open.prompt}`}>
              <TextArea rows={3} value={text} placeholder={open.placeholder} onChange={(e) => setText(e.target.value)} />
            </Field>
            <PrimaryButton
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate({ d: open, ev: isTrading ? `[${outcome}] ${text.trim()}` : text.trim() })}
            >
              {byKey.has(open.key) ? "Update proof" : "Lock it in"}
            </PrimaryButton>
            {byKey.has(open.key) && <GhostButton onClick={() => undo.mutate(open)}>Untick</GhostButton>}
          </>
        )}
      </FormSheet>

      {flash && <XpFlash emoji={flash.d.emoji} xp={flash.xp} identity={flash.d.identity} onClose={() => setFlash(null)} />}
    </>
  );
}

export function XpFlash({ emoji, xp, identity, onClose }: { emoji: string; xp: number; identity: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm animate-in fade-in zoom-in-95" onClick={onClose}>
      <div className="text-center">
        <p className="text-5xl">{emoji}</p>
        <p className="mt-3 text-6xl font-extrabold tabular-nums text-trading animate-in slide-in-from-bottom-4 duration-500">
          {xp >= 0 ? "+" : ""}{xp} XP
        </p>
        <p className="mt-4 text-lg font-extrabold leading-snug">“{identity}”</p>
      </div>
    </div>
  );
}
