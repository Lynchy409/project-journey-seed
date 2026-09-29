import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, SelectInput, Stat, TextArea, TextInput } from "@/components/app/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import { WORKOUT_KINDS, addWorkout, deleteWorkout, liftSummary, setsQuery, workoutsQuery, type LiftRow } from "@/lib/train";
import { checkinsQuery } from "@/lib/day";
import { profileQuery } from "@/lib/profile";
import { addEntry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/train")({
  head: () => ({
    meta: [
      { title: "Train — My Journey" },
      { name: "description", content: "Log sessions and sets, search any lift for your best, and track your weight." },
      { property: "og:title", content: "Train — My Journey" },
      { property: "og:description", content: "Log sessions and sets, search any lift for your best, and track your weight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Train,
});

type Tab = "sessions" | "lifts" | "body";

function Train() {
  const [tab, setTab] = useState<Tab>("sessions");
  return (
    <AppShell eyebrow="Fitness" title={tab === "sessions" ? "Training" : tab === "lifts" ? "Lift search" : "Body"}>
      <div className="flex gap-2">
        <Chip active={tab === "sessions"} onClick={() => setTab("sessions")} className="flex-1">Sessions</Chip>
        <Chip active={tab === "lifts"} onClick={() => setTab("lifts")} className="flex-1">Lifts</Chip>
        <Chip active={tab === "body"} onClick={() => setTab("body")} className="flex-1">Body</Chip>
      </div>
      {tab === "sessions" && <Sessions />}
      {tab === "lifts" && <Lifts />}
      {tab === "body" && <Body />}
    </AppShell>
  );
}

function Sessions() {
  const qc = useQueryClient();
  const { data: workouts } = useQuery(workoutsQuery);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets"] });
    },
  });

  const thisWeek = (workouts ?? []).filter((w) => w.date >= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).length;

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Sessions logged" value={workouts?.length ?? 0} />
          <Stat label="This week" value={thisWeek} tone="text-fitness" />
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Log a session</span>
          </PrimaryButton>
        </div>
      </Card>

      {!workouts?.length ? (
        <Card><Empty>No sessions yet.</Empty></Card>
      ) : (
        workouts.map((w) => (
          <Card key={w.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold leading-tight">{w.name}</p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground">{prettyDate(w.date)} · {w.kind}</p>
              </div>
              <button aria-label="Delete session" onClick={() => remove.mutate(w.id)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {w.exercise_sets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {w.exercise_sets.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
                    <span>{s.exercise}</span>
                    <span className="text-muted-foreground">
                      {s.weight != null ? `${Number(s.weight)}kg` : ""} {s.reps != null ? `× ${s.reps}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {w.notes && <p className="mt-3 text-sm font-medium text-muted-foreground">{w.notes}</p>}
          </Card>
        ))
      )}

      <WorkoutSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function WorkoutSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("gym");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState([{ exercise: "", weight: "", reps: "" }]);

  const save = useMutation({
    mutationFn: async () => {
      await addWorkout({
        date,
        name: name.trim(),
        kind,
        notes: notes || null,
        sets: sets.map((s) => ({ exercise: s.exercise, weight: s.weight ? Number(s.weight) : null, reps: s.reps ? Number(s.reps) : null })),
      });
      if (notes.trim()) await addEntry({ text: `${name.trim()}: ${notes.trim()}`, pillar: "fitness", entry_type: "session_note", date });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Session logged");
      onOpenChange(false);
      setName(""); setNotes(""); setSets([{ exercise: "", weight: "", reps: "" }]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const setRow = (i: number, k: "exercise" | "weight" | "reps", v: string) =>
    setSets((rows) => rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Log a session">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Type">
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value)}>
            {WORKOUT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </SelectInput>
        </Field>
      </div>
      <Field label="Session name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lower body" /></Field>
      <SectionTitle>Sets</SectionTitle>
      <div className="space-y-2">
        {sets.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2">
            <TextInput value={s.exercise} onChange={(e) => setRow(i, "exercise", e.target.value)} placeholder="Exercise" />
            <TextInput inputMode="decimal" value={s.weight} onChange={(e) => setRow(i, "weight", e.target.value)} placeholder="kg" />
            <TextInput inputMode="numeric" value={s.reps} onChange={(e) => setRow(i, "reps", e.target.value)} placeholder="reps" />
          </div>
        ))}
      </div>
      <button onClick={() => setSets((r) => [...r, { exercise: "", weight: "", reps: "" }])} className="h-12 w-full rounded-2xl border text-sm font-bold">
        Add another set
      </button>
      <Field label="Notes (saved to your journal)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>Save session</PrimaryButton>
    </FormSheet>
  );
}

function Lifts() {
  const { data: rows } = useQuery(setsQuery);
  const [q, setQ] = useState("");
  const summary = liftSummary((rows ?? []) as unknown as LiftRow[]);
  const filtered = summary.filter((s) => s.exercise.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Card>
        <SectionTitle>Search any lift</SectionTitle>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. squat"
            className="h-12 flex-1 bg-transparent text-base font-semibold outline-none"
          />
        </div>
      </Card>
      {filtered.length === 0 ? (
        <Card><Empty>{summary.length === 0 ? "Log some sets and your bests appear here." : "No lift matches that."}</Empty></Card>
      ) : (
        filtered.map((s) => (
          <Card key={s.exercise}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-lg font-extrabold capitalize leading-tight">{s.exercise}</p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                  {s.count} sets logged{s.lastDate ? ` · last ${prettyDate(s.lastDate)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold leading-none text-fitness">{s.best}kg</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Best{s.bestReps ? ` × ${s.bestReps}` : ""}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </>
  );
}

function Body() {
  const { data: checkins } = useQuery(checkinsQuery);
  const { data: profile } = useQuery(profileQuery);
  const weights = (checkins ?? []).filter((c) => c.weight != null);
  const latest = weights[0];
  const oldest = weights[weights.length - 1];
  const change = latest && oldest ? Math.round((Number(latest.weight) - Number(oldest.weight)) * 10) / 10 : 0;

  return (
    <>
      <Card>
        <SectionTitle>Weight</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={`Latest (${profile?.units ?? "kg"})`} value={latest ? Number(latest.weight) : "—"} />
          <Stat label="Change" value={`${change > 0 ? "+" : ""}${change}`} tone={change >= 0 ? "text-fitness" : "text-trading"} />
        </div>
        <p className="mt-3 text-sm font-medium text-muted-foreground">Log your weight in the evening check-in on Today.</p>
      </Card>
      <Card>
        <SectionTitle>History</SectionTitle>
        {weights.length === 0 ? (
          <Empty>No weigh-ins yet.</Empty>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {weights.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
                <span>{prettyDate(c.date)}</span>
                <span className="text-muted-foreground">
                  {Number(c.weight)}{profile?.units ?? "kg"}
                  {c.water_ml ? ` · ${c.water_ml}ml` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
