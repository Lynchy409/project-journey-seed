import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Flag, Lock, Minus, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, TextInput } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { addGoal, updateGoal, bumpGoal, deleteGoal, goalsQuery, setGoalStatus } from "@/lib/goals";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { daysLeft, kids, nextMove, pct } from "@/lib/campaign";
import type { Json } from "@/integrations/supabase/types";

type G = { id: string; parent_id: string | null; title: string; target_value: number | null; current_value: number; status: string; created_at: string; pillar: string; metric: string | null; deadline: string | null; horizon: string; tracking: Json };
const why = (g: G) => ((g.tracking as Record<string, unknown> | null)?.["why"] as string | undefined) ?? "";

export function GoalCampaign() {
  const qc = useQueryClient();
  const { data } = useQuery(goalsQuery);
  const all = ((data ?? []) as G[]).filter((g) => g.horizon === "campaign");
  const roots = kids(all, null);
  const [form, setForm] = useState<{ parent: G | null; edit?: G } | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["goals"] });

  return (
    <>
      {roots.length === 0 && (
        <Card><Empty>Start with one goal — big or small. e.g. "Sub-20 min 5k".</Empty></Card>
      )}
      {roots.map((g) => <Campaign key={g.id} g={g} all={all} onAdd={(p) => setForm({ parent: p })} onEdit={(e) => setForm({ parent: all.find((x) => x.id === e.parent_id) ?? null, edit: e })} inv={inv} />)}
      <PrimaryButton onClick={() => setForm({ parent: null })}><Plus className="mr-1 inline h-4 w-4" />New goal</PrimaryButton>
      {form && <NodeForm parent={form.parent} edit={form.edit} onClose={() => setForm(null)} inv={inv} />}
    </>
  );
}

function Campaign({ g, all, onAdd, onEdit, inv }: { g: G; all: G[]; onAdd: (p: G) => void; onEdit: (e: G) => void; inv: () => void }) {
  const p = PILLARS[(g.pillar as Pillar)] ?? PILLARS.life;
  const progress = pct(g, all);
  const stages = kids(all, g.id);
  const next = nextMove(g, all);
  const left = daysLeft(g.deadline);
  const activeIdx = stages.findIndex((s) => pct(s, all) < 100);
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-float">
      <div className={`${p.soft} p-5`}>
        <div className="flex items-start gap-4">
          <Ring pct={progress} tone={p.text} />
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-extrabold uppercase tracking-wider ${p.text}`}>{p.label} · goal</p>
            <h3 className="text-xl font-extrabold leading-tight">{g.title}</h3>
            {why(g) && <p className="mt-1 text-sm font-bold italic text-muted-foreground">“{why(g)}”</p>}
          </div>
          <EditBtn onClick={() => onEdit(g)} />
          <DeleteBtn id={g.id} inv={inv} />
        </div>
        {left !== null && (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums">{Math.max(0, left)}</span>
            <span className="text-xs font-bold uppercase text-muted-foreground">{left < 0 ? "days — completion date passed" : "days to completion"}</span>
          </div>
        )}
      </div>

      {next && next.id !== g.id && (
        <div className="border-b px-5 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Your next move</p>
          <p className="flex items-center gap-2 text-base font-extrabold"><Target className={`h-4 w-4 ${p.text}`} />{next.title}</p>
        </div>
      )}
      {!next && stages.length > 0 && (
        <div className="border-b bg-gold-soft px-5 py-3 text-sm font-extrabold">★ Goal conquered</div>
      )}

      <div className="space-y-3 p-4">
        {stages.map((s, i) => (
          <Stage key={s.id} s={s} all={all} n={i + 1} state={activeIdx === -1 || i < activeIdx ? "done" : i === activeIdx ? "active" : "queued"} tone={p} onAdd={onAdd} onEdit={onEdit} inv={inv} />
        ))}
        <button onClick={() => onAdd(g)} className="flex min-h-12 w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-sm font-bold text-muted-foreground">
          <Plus className="h-4 w-4" /> Add stage
        </button>
      </div>
    </div>
  );
}

function Stage({ s, all, n, state, tone, onAdd, onEdit, inv }: { s: G; all: G[]; n: number; state: "done" | "active" | "queued"; tone: (typeof PILLARS)[Pillar]; onAdd: (p: G) => void; onEdit: (e: G) => void; inv: () => void }) {
  const [open, setOpen] = useState(state === "active");
  const progress = pct(s, all);
  const tasks = kids(all, s.id);
  return (
    <div className={`rounded-2xl border-2 p-3 transition-all ${state === "active" ? `border-current ${tone.text}` : "border-border"} ${state === "queued" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 text-foreground">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${state === "done" ? "bg-gold text-foreground" : state === "active" ? `${tone.bg} text-primary-foreground` : "bg-secondary"}`}>
          {state === "done" ? <Check className="h-4 w-4" /> : state === "queued" ? <Lock className="h-4 w-4" /> : n}
        </span>
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Stage {n}{s.deadline ? ` · ${(daysLeft(s.deadline) ?? 0) < 0 ? "date passed" : `${daysLeft(s.deadline)} days left`} · ${new Date(s.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</p>
          <p className="text-sm font-extrabold">{s.title}</p>
        </button>
        <span className="text-sm font-black tabular-nums">{progress}%</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bg-gold" : tone.bg}`} style={{ width: `${progress}%` }} />
      </div>
      {open && (
        <div className="mt-3 space-y-2 text-foreground">
          {tasks.length === 0 && <Leaf g={s} tone={tone} inv={inv} />}
          {tasks.map((t) => <Leaf key={t.id} g={t} tone={tone} inv={inv} onEdit={() => onEdit(t)} deletable />)}
          <button onClick={() => onAdd(s)} className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Plus className="h-3.5 w-3.5" /> Add task</button>
          <div className="flex justify-end gap-1"><EditBtn onClick={() => onEdit(s)} /><DeleteBtn id={s.id} inv={inv} /></div>
        </div>
      )}
    </div>
  );
}

function Leaf({ g, tone, inv, deletable, onEdit }: { g: G; tone: (typeof PILLARS)[Pillar]; inv: () => void; deletable?: boolean; onEdit?: () => void }) {
  const bump = useMutation({ mutationFn: (by: number) => bumpGoal(g.id, g.current_value, by), onSuccess: inv });
  const tick = useMutation({
    mutationFn: () => setGoalStatus(g.id, g.status === "done" ? "active" : "done"),
    onSuccess: () => { inv(); if (g.status !== "done") toast.success("Done — moving forward"); },
  });
  const counted = !!g.target_value;
  const done = counted ? g.current_value >= (g.target_value ?? 0) : g.status === "done";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2">
      {counted ? (
        <>
          <button aria-label="Minus" onClick={() => bump.mutate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-card"><Minus className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{g.title}</p>
            <p className={`text-xs font-black tabular-nums ${done ? "text-foreground" : tone.text}`}>{g.current_value} / {g.target_value} {g.metric ?? ""}</p>
          </div>
          <button aria-label="Plus" onClick={() => bump.mutate(1)} className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.bg} text-primary-foreground`}><Plus className="h-4 w-4" /></button>
        </>
      ) : (
        <>
          <button aria-label="Complete" onClick={() => tick.mutate()} className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? `${tone.bg} border-transparent text-primary-foreground` : "border-border bg-card"}`}><Check className="h-4 w-4" /></button>
          <p className={`min-w-0 flex-1 text-sm font-bold ${done ? "text-muted-foreground line-through" : ""}`}>{g.title}</p>
        </>
      )}
      {onEdit && <EditBtn onClick={onEdit} />}
      {deletable && <DeleteBtn id={g.id} inv={inv} />}
    </div>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return <button aria-label="Edit" onClick={onClick} className="p-1 text-muted-foreground"><Pencil className="h-4 w-4" /></button>;
}

function DeleteBtn({ id, inv }: { id: string; inv: () => void }) {
  const del = useMutation({ mutationFn: () => deleteGoal(id), onSuccess: inv, onError: () => toast.error("Remove its stages first") });
  return <button aria-label="Delete" onClick={() => confirm("Delete this?") && del.mutate()} className="p-1 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>;
}

function Ring({ pct: v, tone }: { pct: number; tone: string }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className={`relative h-16 w-16 shrink-0 ${tone}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-card" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" stroke="currentColor" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-foreground">{v}%</span>
    </div>
  );
}

function NodeForm({ parent, edit, onClose, inv }: { parent: G | null; edit?: G; onClose: () => void; inv: () => void }) {
  const isGoal = !parent;
  const isStage = parent && !parent.parent_id;
  const [title, setTitle] = useState(edit?.title ?? "");
  const [pillar, setPillar] = useState<Pillar>(((edit ?? parent)?.pillar as Pillar) ?? "fitness");
  const [target, setTarget] = useState(edit?.target_value != null ? String(edit.target_value) : "");
  const [metric, setMetric] = useState(edit?.metric ?? "");
  const [deadline, setDeadline] = useState(edit?.deadline ?? "");
  const [motto, setMotto] = useState(edit ? why(edit) : "");
  const save = useMutation({
    mutationFn: async () => {
      if (edit) {
        const tracking = { ...((edit.tracking as Record<string, unknown> | null) ?? {}), why: motto.trim().slice(0, 200) };
        await updateGoal(edit.id, { title: title.trim().slice(0, 200), pillar, metric: metric.trim() || null, target_value: target ? Number(target) : null, deadline: deadline || null, ...(isGoal ? { tracking: tracking as Json } : {}) });
        return;
      }
      await addGoal({ title: title.trim().slice(0, 200), pillar, horizon: "campaign" as never, metric: metric.trim() || null, target_value: target ? Number(target) : null, deadline: deadline || null, parent_id: parent?.id ?? null });
      if (isGoal && motto.trim()) {
        const { data } = await supabase.from("goals").select("id").eq("title", title.trim().slice(0, 200)).eq("horizon", "campaign").order("created_at", { ascending: false }).limit(1);
        if (data?.[0]) await supabase.from("goals").update({ tracking: { why: motto.trim().slice(0, 200) } }).eq("id", data[0].id);
      }
    },
    onSuccess: () => { inv(); onClose(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <FormSheet open onOpenChange={(v) => !v && onClose()} title={`${edit ? "Edit" : "New"} ${isGoal ? "goal" : isStage ? `stage · ${parent.title}` : `task · ${parent!.title}`}`}>
      <Field label={isGoal ? "Goal" : isStage ? "Stage / sub-goal" : "Task"}>
        <TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isGoal ? "Sub-20 min 5k" : isStage ? "Build aerobic base" : "Run 10 miles a week"} />
      </Field>
      {isGoal && (
        <>
          <Field label="Pillar">
            <div className="grid grid-cols-4 gap-2">{(Object.keys(PILLARS) as Pillar[]).map((k) => <Chip key={k} active={pillar === k} onClick={() => setPillar(k)}>{PILLARS[k].label}</Chip>)}</div>
          </Field>
          <Field label="Your rule / why (optional)"><TextInput value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Fullback speed. No missed sprint sessions." /></Field>
        </>
      )}
      {!isGoal && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Target number (optional)"><TextInput type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10" /></Field>
          <Field label="Unit"><TextInput value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="miles" /></Field>
        </div>
      )}
      <Field label="Completion date (optional)"><TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      <PrimaryButton disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}><Flag className="mr-1 inline h-4 w-4" />{edit ? "Save" : "Add"}</PrimaryButton>
    </FormSheet>
  );
}
