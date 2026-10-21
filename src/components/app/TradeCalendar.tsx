import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Field, FormSheet, PrimaryButton, TextArea } from "@/components/app/ui";
import { OutcomePicker, XpFlash } from "@/components/app/DailyDrivers";
import { allDriverLogsQuery, OUTCOMES, parseOutcome, type TradeOutcome } from "@/lib/xp";
import { driverXp, saveDriver } from "@/lib/drivers";
import { todayISO } from "@/lib/dates";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const CELL: Record<TradeOutcome, string> = { executed: "bg-trading text-primary-foreground", patient: "bg-learning text-primary-foreground", breach: "bg-destructive text-destructive-foreground" };

export function TradeCalendar() {
  const qc = useQueryClient();
  const today = todayISO();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [open, setOpen] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<TradeOutcome | null>(null);
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<number | null>(null);

  const { data } = useQuery(allDriverLogsQuery);
  const byDate = new Map((data ?? []).filter((r) => r.driver_key === "trading").map((r) => [r.date, parseOutcome(r.evidence)]));

  const save = useMutation({
    mutationFn: (date: string) => saveDriver(date, "trading", `[${outcome}] ${note.trim()}`),
    onSuccess: () => {
      setFlash(driverXp("trading", `[${outcome}]`));
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["driver_logs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const first = (month.getDay() + 6) % 7; // Monday start
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];

  let marketDays = 0, logged = 0;
  for (let i = 1; i <= days; i++) {
    const d = new Date(month.getFullYear(), month.getMonth(), i);
    if (d.getDay() % 6 === 0 || iso(d) > today) continue;
    marketDays++;
    const o = byDate.get(iso(d))?.outcome;
    if (o === "executed" || o === "patient") logged++;
  }

  const openDay = (date: string) => {
    const p = byDate.get(date);
    setOutcome(p?.outcome ?? null);
    setNote(p?.note ?? "");
    setOpen(date);
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <button aria-label="Previous month" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-extrabold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
            <p className="text-xs font-bold text-muted-foreground">{logged}/{marketDays} disciplined market days</p>
          </div>
          <button aria-label="Next month" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const key = iso(d);
            const o = byDate.get(key)?.outcome;
            const weekend = d.getDay() % 6 === 0;
            const future = key > today;
            return (
              <button
                key={i}
                disabled={future}
                onClick={() => openDay(key)}
                className={`aspect-square rounded-xl text-sm font-extrabold tabular-nums transition-all active:scale-95 disabled:opacity-30 ${
                  o ? CELL[o] : weekend ? "bg-secondary/50 text-muted-foreground" : "bg-secondary"
                } ${key === today ? "ring-2 ring-foreground" : ""}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-muted-foreground">
          {OUTCOMES.map((o) => <span key={o.key}>{o.emoji} {o.label}</span>)}
        </div>
      </Card>
      <p className="px-1 text-sm font-semibold text-muted-foreground">
        Log every market day. Executed and patient both bank +150 XP — waiting is a skill. A breach banks nothing.
      </p>

      <FormSheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open ? new Date(open + "T12:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) : ""}>
        {open && (
          <>
            <OutcomePicker value={outcome} onChange={setOutcome} />
            <Field label="One-line market read">
              <TextArea rows={3} value={note} placeholder="Asia range held, no sweep — stayed flat" onChange={(e) => setNote(e.target.value)} />
            </Field>
            <PrimaryButton disabled={!outcome || note.trim().length < 3 || save.isPending} onClick={() => save.mutate(open)}>
              {outcome === "breach" ? "Log honestly" : "Bank +150 XP"}
            </PrimaryButton>
          </>
        )}
      </FormSheet>
      {flash !== null && <XpFlash emoji="🎯" xp={flash} identity="I am a pro trader who follows his strategy to a tee which has led me to live this prosperous life" onClose={() => setFlash(null)} />}
    </>
  );
}
