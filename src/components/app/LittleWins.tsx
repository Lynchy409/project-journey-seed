import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Play, Plus, Shuffle, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Chip, Field, FormSheet, PrimaryButton, SectionTitle, TextInput } from "@/components/app/ui";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { todayISO } from "@/lib/dates";
import { addWin, deleteWin, logWin, undoWin, winLogsQuery, winsQuery, type Win } from "@/lib/wins";
import { beep } from "@/lib/morning";
import { SessionComposer, SessionDetail } from "./FitnessSession";
import { fitnessHistoryQuery, trainingSlotForTask, type FitnessWorkout } from "@/lib/fitness";

const ORDER: (Pillar | "all")[] = ["all", "fitness", "trading", "learning", "life"];

export function LittleWins({ only, compact = false }: { only?: Pillar; compact?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: wins } = useQuery(winsQuery);
  const { data: logs } = useQuery(winLogsQuery);
  const [filter, setFilter] = useState<Pillar | "all">(only ?? "all");
  const [running, setRunning] = useState<Win | null>(null);
  const [fitnessWin, setFitnessWin] = useState<Win | null>(null);
  const history = useQuery(fitnessHistoryQuery);
  const [view, setView] = useState<FitnessWorkout | null>(null);
  const undoOrReview = (logId: string, fitness: boolean) => {
    if (fitness && !history.isSuccess) {
      toast.error("Session history is unavailable. Retry before changing this activity.");
      return;
    }
    const w = history.data?.find(w => w.id === logId);
    if (w) setView(w);
    else undo.mutate(logId);
  };
  const isSpanishWin = (w: Win) => w.pillar === "learning" && /spanish|language transfer/i.test(w.title);
  const openWin = (w: Win) => isSpanishWin(w) ? void navigate({ to: "/learn", search: { area: "spanish" } }) : w.pillar === "fitness" ? setFitnessWin(w) : setRunning(w);
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const today = todayISO();
  const todayLogs = (logs ?? []).filter((l) => l.date === today);
  const doneIds = new Map(todayLogs.map((l) => [l.win_id, l.id]));
  const weekCount = (logs ?? []).filter((l) => l.date >= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["win_logs"] });
  const done = useMutation({
    mutationFn: logWin,
    onSuccess: (_d, w) => { refresh(); toast.success(`Win banked: ${w.title}`); setRunning(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const undo = useMutation({ mutationFn: undoWin, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteWin, onSuccess: () => qc.invalidateQueries({ queryKey: ["little_wins"] }) });

  const list = (wins ?? []).filter((w) => filter === "all" || w.pillar === filter);
  const shown = compact ? list.filter((w) => !doneIds.has(w.id)).slice(0, 4) : list;
  const quick = () => {
    const pool = list.filter((w) => !doneIds.has(w.id) && w.minutes <= 5);
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w) openWin(w);
    else toast("You've cleared all the quick ones today");
  };

  return (
    <Card>
      <SectionTitle
        action={!compact && (
          <button onClick={() => setEditMode((v) => !v)} className="text-xs font-bold text-muted-foreground">
            {editMode ? "Done" : "Edit"}
          </button>
        )}
      >
        Little wins
      </SectionTitle>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-4xl font-extrabold leading-none">{todayLogs.length}<span className="ml-1 text-sm font-bold text-muted-foreground">today</span></p>
        <p className="text-xs font-bold text-muted-foreground">{weekCount} this week</p>
      </div>

      <button
        onClick={quick}
        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
      >
        <Zap className="h-5 w-5" /> About to scroll? Quick win
      </button>

      {!only && !compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ORDER.map((p) => (
            <Chip key={p} active={filter === p} onClick={() => setFilter(p)}>{p === "all" ? "All" : PILLARS[p].label}</Chip>
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {shown.map((w) => {
          const logId = doneIds.get(w.id);
          const p = PILLARS[(w.pillar as Pillar)] ?? PILLARS.life;
          return (
            <li key={w.id} className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 ${logId ? p.soft : "bg-secondary"}`}>
              <button
                aria-label={logId ? w.pillar === "fitness" ? "Review completed activity" : "Undo" : w.pillar === "fitness" ? "Log activity" : "Tick off"}
                onClick={() => isSpanishWin(w) ? openWin(w) : (logId ? undoOrReview(logId, w.pillar === "fitness") : w.pillar === "fitness" ? openWin(w) : done.mutate(w))}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${logId ? `${p.bg} border-transparent text-primary-foreground scale-105` : "bg-card"}`}
              >
                {logId && <Check className="h-5 w-5" />}
              </button>
              <button onClick={() => isSpanishWin(w) ? openWin(w) : logId ? undoOrReview(logId, w.pillar === "fitness") : openWin(w)} className="min-w-0 flex-1 text-left">
                <p className={`text-sm font-extrabold ${logId ? "line-through opacity-60" : ""}`}>{w.title}</p>
                <p className={`text-[11px] font-bold ${p.text}`}>{p.label} · {w.minutes} min</p>
              </button>
              {editMode ? (
                <button aria-label="Delete win" onClick={() => remove.mutate(w.id)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              ) : !logId && (
                <button aria-label="Start timer" onClick={() => openWin(w)} className="flex h-10 w-10 items-center justify-center rounded-full bg-card"><Play className="h-4 w-4" /></button>
              )}
            </li>
          );
        })}
      </ul>

      {!compact && (
        <button onClick={() => setAdding(true)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-bold">
          <Plus className="h-4 w-4" /> Add your own win
        </button>
      )}

      {running && <WinTimer win={running} onClose={() => setRunning(null)} onDone={() => done.mutate(running)} onShuffle={quick} />}
      <AddWinSheet open={adding} onOpenChange={setAdding} sort={wins?.length ?? 0} defaultPillar={only ?? "fitness"} />
      {view && <SessionDetail workout={view} onClose={() => setView(null)} />}
      {fitnessWin && <SessionComposer winId={fitnessWin.id} initialSlot={trainingSlotForTask(fitnessWin.title) ?? "strength"} movement={{ name: fitnessWin.title, kind: /run/i.test(fitnessWin.title) ? "run" : /bag/i.test(fitnessWin.title) ? "boxing" : /yoga/i.test(fitnessWin.title) ? "yoga" : /stretch/i.test(fitnessWin.title) ? "mobility" : "other" }} onClose={() => setFitnessWin(null)} />}
    </Card>
  );
}

function WinTimer({ win, onClose, onDone, onShuffle }: { win: Win; onClose: () => void; onDone: () => void; onShuffle: () => void }) {
  const total = win.minutes * 60;
  const [left, setLeft] = useState(total);
  const [paused, setPaused] = useState(true);
  useEffect(() => { setLeft(total); setPaused(true); }, [win.id, total]);
  useEffect(() => {
    if (paused || left <= 0) return;
    const t = setTimeout(() => {
      setLeft((s) => s - 1);
      if (left - 1 === 0) beep("next");
    }, 1000);
    return () => clearTimeout(t);
  }, [paused, left]);
  const p = PILLARS[(win.pillar as Pillar)] ?? PILLARS.life;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const pct = 1 - left / total;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background px-6 pb-10 pt-6">
      <div className="flex justify-between">
        <button aria-label="Shuffle" onClick={onShuffle} className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><Shuffle className="h-5 w-5" /></button>
        <button aria-label="Close" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className={`text-xs font-extrabold uppercase tracking-widest ${p.text}`}>{p.label} · little win</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">{win.title}</h2>
        {win.cue && <p className="mt-3 max-w-xs text-base font-medium text-muted-foreground">{win.cue}</p>}
        <div className="relative mt-8 h-56 w-56">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="44" className="fill-none stroke-secondary" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" className={`fill-none ${p.text}`} stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={276.5} strokeDashoffset={276.5 * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold tabular-nums">{left > 0 ? `${mm}:${ss}` : "Done"}</p>
        </div>
        {left > 0 && (
          <button onClick={() => setPaused((v) => !v)} className="mt-6 flex h-14 items-center gap-2 rounded-3xl border px-8 text-base font-extrabold">
            {paused ? <><Play className="h-5 w-5" /> {left === total ? "Start" : "Resume"}</> : <><Pause className="h-5 w-5" /> Pause</>}
          </button>
        )}
      </div>
      <PrimaryButton onClick={onDone}>{left > 0 ? "Did it — bank the win" : "Bank the win"}</PrimaryButton>
    </div>
  );
}

function AddWinSheet({ open, onOpenChange, sort, defaultPillar }: { open: boolean; onOpenChange: (v: boolean) => void; sort: number; defaultPillar: Pillar }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [cue, setCue] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [pillar, setPillar] = useState<Pillar>(defaultPillar);
  const save = useMutation({
    mutationFn: () => addWin({ title: title.trim(), cue: cue.trim() || null, minutes: Math.max(1, Number(minutes) || 5), pillar, sort }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["little_wins"] }); toast.success("Win added"); onOpenChange(false); setTitle(""); setCue(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add a little win">
      <Field label="What is it?"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Horse stance 3 min" /></Field>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PILLARS) as Pillar[]).map((p) => <Chip key={p} active={pillar === p} onClick={() => setPillar(p)}>{PILLARS[p].label}</Chip>)}
      </div>
      <Field label="Minutes"><TextInput inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      <Field label="Cue (optional)"><TextInput value={cue} onChange={(e) => setCue(e.target.value)} /></Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}>Save win</PrimaryButton>
    </FormSheet>
  );
}
