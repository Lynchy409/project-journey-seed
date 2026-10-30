import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Copy, Plus, Trash2 } from "lucide-react";
import { Card } from "./AppShell";
import {
  Empty,
  Field,
  FormSheet,
  GhostButton,
  Chip,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "./ui";
import { supabase } from '@/integrations/supabase/client';
import { activityKind, FITNESS_ACTIVITIES, nextSet, sessionName, TRAINING_LABELS, TRAINING_ORDER } from '@/lib/training-log';
import { validateSession } from '@/lib/fitness';
import { todayISO, prettyDate } from "@/lib/dates";
import { MOVEMENTS } from "@/lib/fitness-library";
import { uploadWorkoutMedia } from "@/lib/train";
import {
  comparableRuns,
  comparableScores,
  detailsOf,
  distanceMetres,
  distanceUnits,
  duration,
  emptyDetails,
  emptySet,
  FITNESS_KINDS,
  fitnessError,
  fitnessHistoryQuery,
  fitnessTasksQuery,
  fitnessTemplatesQuery,
  numberOrNull,
  pace,
  parseDuration,
  previousExercise,
  saveFitnessTemplate,
  saveFitnessWorkout,
  setsOf,
  SLOTS,
  slotForKind,
  templatePayload,
} from "@/lib/fitness";
import type { FitnessWorkout } from "@/lib/fitness";
import type {
  FitnessSet,
  FitnessSlot,
  FitnessTask,
  FitnessTemplate,
  WorkoutDetails,
} from "@/lib/fitness-types";
import type { Json } from "@/integrations/supabase/types";

export function useFitnessRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [
        "fitness_history",
        "workouts",
        "exercise_sets",
        "fitness_tasks",
        "fitness_templates",
        "fitness_plans",
        "fitness_preferences",
        "goals",
        "checkins",
        "checkin",
        "routine_logs",
        "win_logs",
        "driver_logs",
        "all_driver_logs",
      ].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}
export function FitnessError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <p className="font-semibold">{fitnessError(error)}</p>
      {retry && (
        <button type="button" className="min-h-11 font-bold underline" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function TrainingTimer({ onUse }: { onUse: (seconds: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const start = useRef(0);
  useEffect(() => {
    if (!running) return;
    start.current = Date.now() - elapsed * 1000;
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - start.current) / 1000)),
      250,
    );
    return () => window.clearInterval(timer);
    // elapsed is captured only when starting/resuming.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">Session / rest timer</span>
        <output className="font-mono text-lg tabular-nums" aria-live="off">
          {duration(elapsed)}
        </output>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl border px-3 text-sm font-bold"
          onClick={() => setRunning((v) => !v)}
        >
          {running ? "Pause timer" : "Start timer"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-3 text-sm font-bold"
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
        >
          Reset timer
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-3 text-sm font-bold"
          disabled={!elapsed}
          onClick={() => {
            setRunning(false);
            onUse(elapsed);
          }}
        >
          Use time
        </button>
      </div>
    </div>
  );
}
type SessionDraft = { id: string; date: string; slots: FitnessSlot[]; sets: FitnessSet[]; activity: string; time: string; distance: string; unit: string; rounds: string; focus: string; circuits: string[]; recoveryTime: string; areas: string[]; problem: string; notes: string; cooldown: boolean };
const DRAFT_KEY = "fitness-session-draft-v2";
export function readDraft(): SessionDraft | null {
  try { const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return null; const d = JSON.parse(raw); return Array.isArray(d.slots) && Array.isArray(d.sets) ? d : null; } catch { return null; }
}
export function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem("fitness-session-draft-v1"); } catch { /* unavailable storage */ } }
export function SessionComposer({ onClose, task, template, initialSlot, movement, initialDate, routineId, winId, editing, resume = false }: {
 onClose: () => void; task?: FitnessTask; template?: FitnessTemplate | undefined; initialSlot?: FitnessSlot; movement?: { name: string; kind: string; cue?: string; reference?: string; referenceName?: string; caution?: string } | undefined; initialDate?: string; routineId?: string; winId?: string; editing?: FitnessWorkout; resume?: boolean;
}) {
 const refresh = useFitnessRefresh();
 const history = useQuery(fitnessHistoryQuery);
 const user = useQuery({ queryKey: ['training-draft-user'], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? '' });
 const d = editing ? detailsOf(editing) : emptyDetails(initialSlot);
 const [state, setState] = useState<SessionDraft>(() => {
   const draft = resume ? readDraft() : null;
   if (draft) return draft;
   const slot = task?.slot ?? template?.slot ?? initialSlot;
   return { id: editing?.id ?? crypto.randomUUID(), date: editing?.date ?? initialDate ?? task?.date ?? todayISO(), slots: editing ? d.slots ?? [d.slot] : slot ? [slot] : [], sets: editing ? setsOf(editing) : [emptySet(movement?.name ?? '')], activity: d.fitness_activity ?? (editing && d.slot === 'cardio' ? editing.kind : ''), time: d.duration_seconds != null ? duration(d.duration_seconds) : '', distance: d.distance_m != null ? String(d.distance_m / 1000) : '', unit: 'km', rounds: d.rounds != null ? String(d.rounds) : '', focus: d.fitness_focus ?? '', circuits: d.circuit_exercises ?? [''], recoveryTime: d.recovery_seconds != null ? duration(d.recovery_seconds) : editing && d.slot === 'recovery' && d.duration_seconds != null ? duration(d.duration_seconds) : '', areas: d.recovery_areas ?? [], problem: d.recovery_problem ?? '', notes: editing?.notes ?? '', cooldown: d.cooldown ?? false };
 });
 const patch = (value: Partial<SessionDraft>) => setState(s => ({ ...s, ...value }));
 const [draftError, setDraftError] = useState(false);
 const [files, setFiles] = useState<File[]>([]);
 const uploaded = useRef<{url: string; type: 'photo' | 'video'}[]>([]);
 useEffect(() => {
   if (editing || !user.data) return;
   const meaningful = state.sets.some(s => s.exercise || s.weight != null || s.reps != null) || state.activity || state.recoveryTime || state.notes;
   if (!meaningful) return;
   try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state, userId: user.data })); setDraftError(false); } catch { setDraftError(true); }
 }, [state, editing, user.data]);
 const kind = activityKind(state.activity);
 const updateSet = (i: number, value: Partial<FitnessSet>) => patch({sets: state.sets.map((s,n) => n===i ? {...s,...value} : s)});
 const save = useMutation({mutationFn: async () => {
   const selected = TRAINING_ORDER.filter(s => state.slots.includes(s));
   if (!selected.length) throw new Error('Choose a session type.');
   const sets = selected.includes('strength') ? state.sets.filter(s => s.exercise.trim() && (s.weight != null || s.reps != null || s.seconds != null)) : [];
   if (selected.includes('strength') && state.sets.some(s => !s.exercise.trim() && (s.weight != null || s.reps != null))) throw new Error('Name each completed exercise.');
   const fitnessTime = selected.includes('cardio') && !['sprints','cindy'].includes(kind) ? parseDuration(state.time) : null;
   const recoverySeconds = selected.includes('recovery') ? parseDuration(state.recoveryTime) : null;
   const metres = selected.includes('cardio') && ['run','sprints'].includes(kind) ? (state.distance.trim() ? distanceMetres(Number(state.distance), kind==='sprints' ? 'm' : state.unit) : null) : null;
   const rounds = selected.includes('cardio') && ['sprints','circuit','cindy'].includes(kind) ? numberOrNull(state.rounds) : null;
   const cardioDone = selected.includes('cardio') && !!state.activity.trim() && !!(fitnessTime || metres || rounds);
   const completed: FitnessSlot[] = [...(sets.length ? ['strength' as const] : []), ...(cardioDone ? ['cardio' as const] : []), ...(recoverySeconds ? ['recovery' as const] : [])];
   for (const slot of selected) if (!completed.includes(slot)) throw new Error(`Enter your completed ${TRAINING_LABELS[slot].toLowerCase()} results, or deselect it.`);
   const full: WorkoutDetails = {...d, slot: completed[0] ?? 'strength', slots:selected, completed_slots:completed, fitness_activity:state.activity, fitness_focus:state.focus, circuit_exercises:state.circuits.filter(v=>v.trim()), cooldown:state.cooldown, recovery_seconds:recoverySeconds, recovery_areas:state.areas, recovery_problem:state.problem, duration_seconds:fitnessTime ?? (selected.includes('cardio') ? null : recoverySeconds), distance_m:metres, rounds, routine_id: routineId ?? d.routine_id, win_id: winId ?? d.win_id};
   const input = {name:sessionName(selected), date:state.date, kind:cardioDone ? kind : selected.includes('strength') ? 'gym' : 'recovery', notes:state.notes, details:full, sets, media: Array.isArray(editing?.media) ? editing.media as {url:string;type:string}[] : []};
   validateSession(input.name,input.date,full,sets);
   for (const file of files.slice(uploaded.current.length)) uploaded.current.push(await uploadWorkoutMedia(file));
   input.media = [...input.media,...uploaded.current];
   const {error} = await supabase.rpc('commit_training_log',{p_id:state.id,p_workout:{...input,details:full as unknown as Json, sets:undefined} as unknown as Json,p_sets:sets as unknown as Json,p_edit:!!editing});
   if(error) throw error;
 }, onSuccess: async () => { if (!editing) clearDraft(); await refresh(); onClose(); }});
 const numeric = (label: string, value: string, change: (v:string)=>void, decimal = true) => <Field label={label}><TextInput inputMode={decimal?'decimal':'numeric'} value={value} onChange={e=>change(e.target.value)} /></Field>;
 const known = [...new Map((history.data??[]).flatMap(w=>setsOf(w)).map(s=>[s.exercise.trim().toLowerCase(),s.exercise.trim()])).values()].filter(Boolean);
 return <FormSheet open title={editing?'Edit session':'Log a session'} onOpenChange={v=>{if(!v&&!save.isPending)onClose();}}>
  <fieldset disabled={save.isPending} className="min-w-0 space-y-5">
   <div className="flex flex-wrap gap-2">{TRAINING_ORDER.map(slot=><Chip key={slot} active={state.slots.includes(slot)} className="min-h-12" onClick={()=>patch({slots:state.slots.includes(slot)?state.slots.filter(s=>s!==slot):[...state.slots,slot]})}>{TRAINING_LABELS[slot]}</Chip>)}</div>
   {!!state.slots.length && <p className="font-extrabold text-lg">{sessionName(state.slots)}</p>}
   <Field label="Date"><TextInput type="date" value={state.date} onChange={e=>patch({date:e.target.value})}/></Field>
   <FitnessError error={history.error} retry={()=>history.refetch()}/>
   {state.slots.includes('strength') && <section className="space-y-3"><SectionTitle>Strength</SectionTitle><datalist id="logged-exercises">{known.map(n=><option key={n} value={n}/>)}</datalist>
    {state.sets.map((s,i)=>{
     const prev = previousExercise(history.data??[],s.exercise,state.date,editing?.id);
     const previous = prev ? setsOf(prev).filter(p=>p.exercise.trim().toLowerCase()===s.exercise.trim().toLowerCase()) : [];
     const best = (history.data??[]).flatMap(w=>setsOf(w)).filter(p=>p.exercise.trim().toLowerCase()===s.exercise.trim().toLowerCase() && p.load_type!=='assisted' && p.weight!=null && (p.reps??0)>0).sort((a,b)=>(b.weight??0)-(a.weight??0) || (b.reps??0)-(a.reps??0))[0];
     return <div key={i} className="space-y-3 border-b pb-4" data-testid={`training-set-${i}`}><Field label={`Set ${i+1} exercise`}><TextInput list="logged-exercises" value={s.exercise} onChange={e=>updateSet(i,{exercise:e.target.value})}/></Field>
      {s.exercise.trim() && <div className="text-sm text-muted-foreground" data-testid={`previous-sets-${i}`}><p>Previous{prev?` · ${prettyDate(prev.date)}`:''}: {previous.length?previous.map(setLabel).join(' / '):'No logged sets yet'}</p><p className="font-bold text-fitness">PB: {best?setLabel(best):'—'}</p></div>}
      <div className="grid grid-cols-2 gap-3">{numeric(`Set ${i+1} weight (kg)`,s.weight==null?'':String(s.weight),v=>updateSet(i,{weight:numberOrNull(v)}))}{numeric(`Set ${i+1} reps`,s.reps==null?'':String(s.reps),v=>updateSet(i,{reps:numberOrNull(v)}),false)}</div>
      <div className="flex gap-2"><GhostButton aria-label={`Add set after set ${i+1}`} onClick={()=>patch({sets:[...state.sets.slice(0,i+1),nextSet(s),...state.sets.slice(i+1)]})}><Plus size={18} className="mx-auto"/></GhostButton><GhostButton aria-label={`Remove set ${i+1}`} onClick={()=>patch({sets:state.sets.filter((_,n)=>n!==i)})}><Trash2 size={18} className="mx-auto"/></GhostButton></div>
     </div>;
    })}<GhostButton onClick={()=>patch({sets:[...state.sets,emptySet()]})}>Add exercise</GhostButton></section>}
   {state.slots.includes('cardio') && <section className="space-y-3"><SectionTitle>Fitness</SectionTitle><Field label="Activity"><TextInput list="fitness-activities" value={state.activity} onChange={e=>patch({activity:e.target.value})}/></Field><datalist id="fitness-activities">{FITNESS_ACTIVITIES.map(n=><option key={n} value={n}/>)}</datalist>
    {['run','sprints'].includes(kind) && <>{numeric(kind==='sprints'?'Sprint distance (metres)':'Distance',state.distance,v=>patch({distance:v}))}{kind==='run' && <Field label="Distance unit"><SelectInput value={state.unit} onChange={e=>patch({unit:e.target.value})}><option value="km">km</option><option value="miles">miles</option><option value="m">metres</option></SelectInput></Field>}</>}
    {['sprints','cindy','circuit'].includes(kind) && numeric(kind==='sprints'?'Sets':'Rounds',state.rounds,v=>patch({rounds:v}),false)}
    {kind==='boxing' && <Field label="What did you do?"><TextArea value={state.focus} onChange={e=>patch({focus:e.target.value})}/></Field>}
    {kind==='circuit' && <><SectionTitle>Exercises</SectionTitle>{state.circuits.map((v,i)=><Field key={i} label={`Circuit exercise ${i+1}`}><TextInput value={v} onChange={e=>patch({circuits:state.circuits.map((x,n)=>n===i?e.target.value:x)})}/></Field>)}<GhostButton aria-label="Add circuit exercise" onClick={()=>patch({circuits:[...state.circuits,'']})}><Plus size={18} className="mx-auto"/></GhostButton></>}
    {!['sprints','cindy'].includes(kind) && <Field label={kind==='run'?'Time (minutes:seconds)':'Duration (minutes:seconds)'}><TextInput value={state.time} placeholder="20:00" onChange={e=>patch({time:e.target.value})}/></Field>}
   </section>}
   {state.slots.includes('recovery') && <section className="space-y-3"><SectionTitle>Recovery</SectionTitle><Field label="Recovery duration (minutes:seconds)"><TextInput value={state.recoveryTime} placeholder="15:00" onChange={e=>patch({recoveryTime:e.target.value})}/></Field><SectionTitle>Areas stretched</SectionTitle><div className="flex flex-wrap gap-2">{['Hips / Glutes','Hamstrings','Lower back','Quads / Hip flexors','Calves / Ankles','Shoulders / Chest'].map(area=><Chip key={area} className="min-h-12" active={state.areas.includes(area)} onClick={()=>patch({areas:state.areas.includes(area)?state.areas.filter(a=>a!==area):[...state.areas,area]})}>{area}</Chip>)}</div><Field label="Other areas"><TextInput value={state.areas.filter(a=>!['Hips / Glutes','Hamstrings','Lower back','Quads / Hip flexors','Calves / Ankles','Shoulders / Chest'].includes(a)).join(', ')} onChange={e=>patch({areas:[...state.areas.filter(a=>['Hips / Glutes','Hamstrings','Lower back','Quads / Hip flexors','Calves / Ankles','Shoulders / Chest'].includes(a)),...e.target.value.split(',').map(v=>v.trim()).filter(Boolean)]})}/></Field><Field label="Problem spots / tight areas"><TextArea value={state.problem} onChange={e=>patch({problem:e.target.value})}/></Field></section>}
   <label className="flex min-h-12 items-center gap-3 font-semibold text-sm"><input type="checkbox" checked={state.cooldown} onChange={e=>patch({cooldown:e.target.checked})}/>Cooldown completed</label>
   <Field label="Session notes"><TextArea value={state.notes} onChange={e=>patch({notes:e.target.value})}/></Field>
   <Field label="Photos / videos"><input aria-label="Training photos or videos" type="file" accept="image/*,video/*" multiple onChange={e=>setFiles(Array.from(e.target.files??[]))} className="w-full min-h-12 text-sm"/></Field>
   {draftError && <p role="alert">Your device cannot save a draft. Keep this session open until saved.</p>}
   <FitnessError error={save.error}/><PrimaryButton disabled={save.isPending || !state.slots.length} onClick={()=>save.mutate()}>{save.isPending?'Saving…':editing?'Save changes':'Save session'}</PrimaryButton>
  </fieldset>
 </FormSheet>;
}
export function setLabel(s: FitnessSet) {
  const load =
    s.load_type === "bodyweight"
      ? "bodyweight"
      : s.weight !== null
        ? `${s.weight} kg${s.load_type === "added" ? " added" : s.load_type === "assisted" ? " assistance" : ""}`
        : "";
  return (
    [
      load,
      s.reps !== null ? `${s.reps} reps` : "",
      s.seconds !== null ? `${s.seconds}s continuous` : "",
      s.distance_m !== null ? `${s.distance_m}m` : "",
      s.side !== "both" ? s.side : "",
    ]
      .filter(Boolean)
      .join(" · ") || "No result"
  );
}
export function SessionDetail({
  workout,
  onClose,
}: {
  workout: FitnessWorkout;
  onClose: () => void;
}) {
  const refresh = useFitnessRefresh();
  const d = detailsOf(workout);
  const [editOpen, setEditOpen] = useState(false);
  const [templateName, setTemplateName] = useState(workout.name);
  const [showTemplate, setShowTemplate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.rpc("delete_fitness_workout", { p_id: workout.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  const saveTemplate = useMutation({
    mutationFn: () =>
      saveFitnessTemplate({
        name: templateName,
        kind: workout.kind,
        slot: d.slot,
        payload: {
          details: {
            ...d,
            template_id: null,
            template_version: null,
            template_snapshot: null,
          } as unknown as Json,
          sets: setsOf(workout) as unknown as Json,
          instructions: workout.notes ?? "",
          source: "",
        },
      }),
    onSuccess: refresh,
  });
  if (editOpen) return <SessionComposer editing={workout} onClose={onClose} />;
  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={workout.name}
    >
      <p className="text-sm text-muted-foreground">
        {prettyDate(workout.date)} · {workout.kind} · {d.variation}
      </p>
      <div className="rounded-2xl bg-secondary p-3 text-sm">
        {d.duration_seconds !== null && <p>Duration: {duration(d.duration_seconds)}</p>}
        {d.distance_m !== null && (
          <p>
            Distance: {distanceUnits(d.distance_m, "km").toFixed(2)} km ·{" "}
            {pace(d.distance_m, d.duration_seconds, "km")}
          </p>
        )}
        {d.rounds !== null && <p>Rounds: {d.rounds}</p>}
        {d.score !== null && (
          <p>
            Score: {d.score} {d.score_unit}
          </p>
        )}
        {d.template_version && <p>Workout version: {d.template_version}</p>}
      </div>
      {d.recovery_phase !== "standalone" && (
        <p className="text-sm font-bold">
          Recovery: {d.recovery_phase} session
          {d.related_workout_id ? " · linked to saved activity" : ""}
        </p>
      )}
      {d.fitness_activity && <p className="font-bold">{d.fitness_activity}</p>}
      {d.fitness_focus && <p>{d.fitness_focus}</p>}
      {d.circuit_exercises?.map((v,i)=><p key={i}>{v}</p>)}
      {d.recovery_seconds != null && <p>Recovery: {duration(d.recovery_seconds)}</p>}
      {!!d.recovery_areas?.length && <p>{d.recovery_areas.join(' · ')}</p>}
      {d.recovery_problem && <p>{d.recovery_problem}</p>}
      {d.cooldown && <p>Cooldown completed</p>}
      {setsOf(workout).map((s, i) => (
        <div key={i} className="rounded-xl border p-3 text-sm">
          <p className="font-bold">
            {i + 1}. {s.exercise}
          </p>
          <p>{setLabel(s)}</p>
          {s.notes && <p>{s.notes}</p>}
        </div>
      ))}
      {workout.notes && <p className="whitespace-pre-wrap text-sm">{workout.notes}</p>}
      {Object.entries(d.review)
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <p key={k} className="text-sm">
            <strong className="capitalize">{k}: </strong>
            {v}
          </p>
        ))}
      {Array.isArray(workout.media) &&
        workout.media.map((m, i) => {
          const media = m as { url: string; type: string };
          return media.type === "video" ? (
            <video key={i} src={media.url} controls playsInline className="w-full rounded-2xl" />
          ) : (
            <img
              key={i}
              src={media.url}
              alt={`${workout.name} attachment ${i + 1}`}
              className="w-full rounded-2xl"
            />
          );
        })}
      <GhostButton onClick={() => setEditOpen(true)}>Edit session</GhostButton>
      <GhostButton onClick={() => setShowTemplate((v) => !v)}>
        Save as repeatable workout
      </GhostButton>
      {showTemplate && (
        <>
          <Field label="Saved workout name">
            <TextInput value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </Field>
          <PrimaryButton
            disabled={!templateName.trim() || saveTemplate.isPending || saveTemplate.isSuccess}
            onClick={() => saveTemplate.mutate()}
          >
            {saveTemplate.isSuccess ? "Workout saved to library" : "Save workout template"}
          </PrimaryButton>
          <FitnessError error={saveTemplate.error} />
        </>
      )}
      <GhostButton disabled={remove.isPending} onClick={() => setConfirmDelete((v) => !v)}>
        {confirmDelete ? "Keep session" : "Delete session…"}
      </GhostButton>
      {confirmDelete && (
        <div className="space-y-3 rounded-2xl border border-destructive/30 p-3">
          <p className="text-sm">
            Delete this session and its sets? Linked goals recalculate and its daily task reopens.
            This cannot be undone.
          </p>
          <PrimaryButton disabled={remove.isPending} onClick={() => remove.mutate()}>
            {remove.isPending ? "Deleting…" : "Confirm delete session"}
          </PrimaryButton>
        </div>
      )}
      <FitnessError error={remove.error} />
    </FormSheet>
  );
}
export function FitnessSessions() {
  const history = useQuery(fitnessHistoryQuery);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<FitnessWorkout | null>(null);
  const [resume, setResume] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({data}) => { const draft = readDraft() as (SessionDraft & {userId?:string}) | null; setHasDraft(!!draft && draft.userId===data.user?.id); }); }, [open]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const rows = (history.data ?? []).filter(
    (w) =>
      (!filter || (detailsOf(w).slots ?? [detailsOf(w).slot]).includes(filter as FitnessSlot)) &&
      `${w.name} ${w.kind} ${setsOf(w)
        .map((s) => s.exercise)
        .join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Card>
        <SectionTitle>Session history</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">

        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => { setResume(false); setOpen(true); }}>Log a session</PrimaryButton>
          {hasDraft && <GhostButton className="mt-3" onClick={() => {setResume(true);setOpen(true);}}>Resume unfinished session</GhostButton>}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Search sessions">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or exercise"
          />
        </Field>
        <Field label="Filter type">
          <SelectInput value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All training</option>
            {SLOTS.map((s) => (
              <option key={s} value={s}>{TRAINING_LABELS[s]}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <FitnessError error={history.error} retry={() => history.refetch()} />
      {history.isPending && (
        <p role="status" className="text-sm">
          Loading your training history…
        </p>
      )}
      {!history.isPending && !history.isError && !rows.length && (
        <Card>
          <Empty>
            Your sessions will appear here. Log your first session to start comparing progress.
          </Empty>
        </Card>
      )}
      {rows.map((w) => (
        <button
          type="button"
          className="block w-full rounded-3xl bg-card p-5 text-left shadow-card"
          key={w.id}
          onClick={() => setView(w)}
        >
          <p className="font-extrabold">{w.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {prettyDate(w.date)}{detailsOf(w).fitness_activity ? ` · ${detailsOf(w).fitness_activity}` : ''} · {w.exercise_sets.length} sets
          </p>
          {detailsOf(w).distance_m !== null && (
            <p className="mt-2 text-sm">
              {distanceUnits(detailsOf(w).distance_m!, "km").toFixed(2)} km ·{" "}
              {duration(detailsOf(w).duration_seconds)}
            </p>
          )}
        </button>
      ))}
      {open && <SessionComposer resume={resume} onClose={() => setOpen(false)} />}
      {view && <SessionDetail workout={view} onClose={() => setView(null)} />}
    </>
  );
}
