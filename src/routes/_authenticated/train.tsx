import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Play, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, SelectInput, Stat, TextArea, TextInput } from "@/components/app/ui";
import { RoutinePlayer } from "@/components/app/RoutinePlayer";
import { LittleWins } from "@/components/app/LittleWins";
import { FitnessHub } from "@/components/app/FitnessHub";
import { FitnessRecords } from "@/components/app/FitnessRecords";
import { SessionComposer } from "@/components/app/FitnessSession";
import { prettyDate, todayISO } from "@/lib/dates";
import { WORKOUT_KINDS, addWorkout, deleteWorkout, liftSummary, setsQuery, uploadWorkoutMedia, workoutsQuery, type LiftRow } from "@/lib/train";
import { addRoutine, addStep, deleteRoutine, deleteStep, logRoutine, routineLogsQuery, routinesQuery, totalSeconds, updateStep, type Routine } from "@/lib/routines";
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

function Train() {
  return (
    <AppShell eyebrow="Fitness" title="Training">
      <FitnessHub routines={<><LittleWins only="fitness" /><Routines /></>} records={<FitnessRecords />} body={<Body />} />
    </AppShell>
  );
}

function Routines() {
  const qc = useQueryClient();
  const { data: routines } = useQuery(routinesQuery);
  const { data: logs } = useQuery(routineLogsQuery);
  const [playing, setPlaying] = useState<Routine | null>(null);
  const [completed, setCompleted] = useState<Routine | null>(null);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [building, setBuilding] = useState(false);

  const log = useMutation({
    mutationFn: ({ id, name, seconds }: { id: string; name: string; seconds: number }) => logRoutine(id, name, seconds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine_logs"] });
      toast.success("Routine logged");
      setPlaying(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });

  const doneThisWeek = (logs ?? []).filter((l) => l.date >= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).length;

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Routines done" value={logs?.length ?? 0} />
          <Stat label="This week" value={doneThisWeek} tone="text-fitness" />
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={() => setBuilding(true)}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Build a routine</span>
          </PrimaryButton>
        </div>
      </Card>

      {(routines ?? []).map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-extrabold leading-tight">{r.name}</p>
              <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                {r.routine_steps.length} movements · {Math.max(1, Math.round(totalSeconds(r.routine_steps) / 60))} min
              </p>
            </div>
            <button aria-label="Delete routine" onClick={() => remove.mutate(r.id)} className="text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {r.description && <p className="mt-2 text-sm font-medium text-muted-foreground">{r.description}</p>}
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setPlaying(r)}
              disabled={!r.routine_steps.length}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              <Play className="h-5 w-5" /> Start
            </button>
            <button onClick={() => setEditing(r)} className="h-14 rounded-3xl border px-5 text-sm font-bold">Edit</button>
          </div>
        </Card>
      ))}

      {!!logs?.length && (
        <Card>
          <SectionTitle>Recent</SectionTitle>
          <ul className="mt-3 space-y-1.5">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
                <span>{l.name}</span>
                <span className="text-muted-foreground">{prettyDate(l.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {playing && (
        <RoutinePlayer
          routine={playing}
          onClose={() => setPlaying(null)}
          onComplete={() => { setCompleted(playing); setPlaying(null); }}
        />
      )}
      {completed && <SessionComposer routineId={completed.id} initialSlot="recovery" movement={{ name: completed.name, kind: completed.kind }} onClose={() => setCompleted(null)} />}
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
      <RoutineBuilder open={building} onOpenChange={setBuilding} />
    </>
  );
}

function RoutineEditor({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [cue, setCue] = useState("");
  const [secs, setSecs] = useState("30");
  const refresh = () => qc.invalidateQueries({ queryKey: ["routines"] });

  const add = useMutation({
    mutationFn: () => addStep(routine.id, { name: name.trim(), cue: cue.trim() || null, seconds: Number(secs || 30), sort: routine.routine_steps.length }),
    onSuccess: () => { refresh(); setName(""); setCue(""); toast.success("Movement added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const save = useMutation({
    mutationFn: ({ id, seconds }: { id: string; seconds: number }) => updateStep(id, { seconds }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: deleteStep, onSuccess: refresh });

  return (
    <FormSheet open onOpenChange={(v) => { if (!v) onClose(); }} title={`Edit ${routine.name}`}>
      <div className="space-y-2">
        {routine.routine_steps.map((s) => (
          <div key={s.id} className="rounded-2xl bg-secondary p-3">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-sm font-extrabold">{s.name}</p>
              <input
                inputMode="numeric"
                defaultValue={s.seconds}
                onBlur={(e) => { const v = Number(e.target.value || s.seconds); if (v !== s.seconds) save.mutate({ id: s.id, seconds: v }); }}
                className="h-10 w-16 rounded-xl border bg-card text-center text-sm font-bold outline-none"
              />
              <span className="text-xs font-bold text-muted-foreground">sec</span>
              <button aria-label="Delete movement" onClick={() => remove.mutate(s.id)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {s.cue && <p className="mt-1.5 text-xs font-medium text-muted-foreground">{s.cue}</p>}
          </div>
        ))}
      </div>
      <SectionTitle>Add a movement</SectionTitle>
      <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wrist CARs" /></Field>
      <Field label="Cue"><TextArea value={cue} onChange={(e) => setCue(e.target.value)} /></Field>
      <Field label="Seconds"><TextInput inputMode="numeric" value={secs} onChange={(e) => setSecs(e.target.value)} /></Field>
      <PrimaryButton onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>Add movement</PrimaryButton>
    </FormSheet>
  );
}

function RoutineBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([{ name: "", cue: "", seconds: "30" }]);

  const save = useMutation({
    mutationFn: () =>
      addRoutine({
        name: name.trim(),
        kind: "mobility",
        description: description.trim() || null,
        steps: steps.map((s) => ({ name: s.name, cue: s.cue.trim() || null, seconds: Number(s.seconds || 30) })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
      toast.success("Routine created");
      onOpenChange(false);
      setName(""); setDescription(""); setSteps([{ name: "", cue: "", seconds: "30" }]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const setRow = (i: number, k: "name" | "cue" | "seconds", v: string) =>
    setSteps((rows) => rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Build a routine">
      <Field label="Routine name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pre-game warm up" /></Field>
      <Field label="What is it for?"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <SectionTitle>Movements</SectionTitle>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="space-y-2 rounded-2xl bg-secondary p-3">
            <div className="grid grid-cols-[1fr_4.5rem] gap-2">
              <TextInput value={s.name} onChange={(e) => setRow(i, "name", e.target.value)} placeholder="Movement" />
              <TextInput inputMode="numeric" value={s.seconds} onChange={(e) => setRow(i, "seconds", e.target.value)} placeholder="sec" />
            </div>
            <TextInput value={s.cue} onChange={(e) => setRow(i, "cue", e.target.value)} placeholder="Cue (optional)" />
          </div>
        ))}
      </div>
      <button onClick={() => setSteps((r) => [...r, { name: "", cue: "", seconds: "30" }])} className="h-12 w-full rounded-2xl border text-sm font-bold">
        Add another movement
      </button>
      <PrimaryButton onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>Save routine</PrimaryButton>
    </FormSheet>
  );
}

export function Sessions() {
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
            {(() => {
              const list = Array.isArray(w.media) && w.media.length ? (w.media as { url: string; type: string }[]) : w.media_url ? [{ url: w.media_url, type: w.media_type ?? "photo" }] : [];
              return list.length > 0 && (
                <div className="mt-3 space-y-2">
                  {list.map((m, i) => m.type === "video" ? (
                    <video key={i} src={m.url} controls playsInline preload="metadata" className="w-full rounded-2xl" />
                  ) : (
                    <a key={i} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={`${w.name} lift ${i + 1}`} className="w-full rounded-2xl object-cover" /></a>
                  ))}
                </div>
              );
            })()}
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
  const { data: past } = useQuery(setsQuery);
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("gym");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState([{ exercise: "", weight: "", reps: "" }]);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [focus, setFocus] = useState<number | null>(null);

  const known = Array.from(
    new Map(((past ?? []) as { exercise: string }[]).map((r) => [r.exercise.trim().toLowerCase(), r.exercise.trim()])).values(),
  ).filter(Boolean);

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter((f) => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} is over 50MB — trim it first`); return false; }
      return true;
    });
    setFiles((cur) => [...cur, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const save = useMutation({
    mutationFn: async () => {
      const media = [];
      for (const f of files) media.push(await uploadWorkoutMedia(f.file));
      await addWorkout({
        date,
        name: name.trim(),
        kind,
        notes: notes || null,
        media_url: media[0]?.url ?? null,
        media_type: media[0]?.type ?? null,
        media,
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
      setName(""); setNotes(""); setSets([{ exercise: "", weight: "", reps: "" }]); setFiles([]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const setRow = (i: number, k: "exercise" | "weight" | "reps", v: string) =>
    setSets((rows) => rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  const duplicate = (i: number) =>
    setSets((rows) => [...rows.slice(0, i + 1), { ...rows[i]! }, ...rows.slice(i + 1)]);
  const removeRow = (i: number) => setSets((rows) => rows.filter((_, n) => n !== i));

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
        {sets.map((s, i) => {
          const q = s.exercise.trim().toLowerCase();
          const hints = focus === i && q ? known.filter((k) => k.toLowerCase().includes(q) && k.toLowerCase() !== q).slice(0, 5) : [];
          return (
            <div key={i}>
              <div className="grid grid-cols-[1fr_3.75rem_3.75rem_2.75rem] gap-1.5">
                <TextInput
                  value={s.exercise}
                  onChange={(e) => setRow(i, "exercise", e.target.value)}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setTimeout(() => setFocus((f) => (f === i ? null : f)), 150)}
                  placeholder="Exercise"
                />
                <TextInput inputMode="decimal" value={s.weight} onChange={(e) => setRow(i, "weight", e.target.value)} placeholder="kg" />
                <TextInput inputMode="numeric" value={s.reps} onChange={(e) => setRow(i, "reps", e.target.value)} placeholder="reps" />
                <button aria-label="Copy this set below" onClick={() => duplicate(i)} className="flex h-12 items-center justify-center rounded-2xl bg-fitness text-primary-foreground active:scale-95 transition-transform">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {hints.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {hints.map((h) => (
                    <button key={h} onMouseDown={(e) => e.preventDefault()} onClick={() => { setRow(i, "exercise", h); setFocus(null); }} className="h-9 rounded-full bg-fitness-soft px-3 text-xs font-bold text-fitness">
                      {h}
                    </button>
                  ))}
                </div>
              )}
              {sets.length > 1 && (
                <button onClick={() => removeRow(i)} className="mt-1 text-xs font-bold text-muted-foreground">Remove set</button>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={() => setSets((r) => [...r, { exercise: "", weight: "", reps: "" }])} className="h-12 w-full rounded-2xl border text-sm font-bold">
        Add a new exercise
      </button>
      <SectionTitle>Photos & videos of the lifts</SectionTitle>
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative">
              {f.file.type.startsWith("video") ? (
                <video src={f.url} playsInline muted className="aspect-square w-full rounded-2xl object-cover" />
              ) : (
                <img src={f.url} alt={`Lift ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover" />
              )}
              <button aria-label="Remove" onClick={() => setFiles((cur) => cur.filter((_, n) => n !== i))} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-bold">
        <Camera className="h-5 w-5" /> {files.length ? "Add more" : "Add photos or videos"}
        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <Field label="Notes (saved to your journal)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? "Saving…" : "Save session"}</PrimaryButton>
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
          <Stat label="Change" value={`${change > 0 ? "+" : ""}${change}`} />
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
