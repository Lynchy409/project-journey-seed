import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Copy, Plus, Trash2 } from "lucide-react";
import { Card } from "./AppShell";
import {
  Empty,
  Field,
  FormSheet,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "./ui";
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
type SessionDraft = {
  id: string;
  date: string;
  slot: FitnessSlot;
  name: string;
  kind: string;
  notes: string;
  details: WorkoutDetails;
  sets: FitnessSet[];
  time: string;
  distance: string;
  unit: string;
};
const DRAFT_KEY = "fitness-session-draft-v1";
export function readDraft(): SessionDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SessionDraft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: SessionDraft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* Storage full or blocked: logging still works. */
  }
}
export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
export function SessionComposer({
  onClose,
  task,
  template,
  initialSlot = "strength",
  movement,
  initialDate,
  routineId,
  winId,
  editing,
}: {
  onClose: () => void;
  task?: FitnessTask | undefined;
  template?: FitnessTemplate | undefined;
  initialSlot?: FitnessSlot;
  movement?:
    | {
        name: string;
        kind: string;
        cue?: string;
        reference?: string;
        referenceName?: string;
        caution?: string;
      }
    | undefined;
  initialDate?: string;
  routineId?: string;
  winId?: string;
  editing?: FitnessWorkout;
}) {
  const refresh = useFitnessRefresh();
  const history = useQuery(fitnessHistoryQuery);
  const tasks = useQuery(fitnessTasksQuery);
  const planned = templatePayload(template ?? null);
  // A plain "Log a session" sheet autosaves to this device so a reload or app switch never loses sets.
  const usesDraft = !editing && !task && !template && !movement && !routineId && !winId;
  const [draft] = useState<SessionDraft | null>(() => (usesDraft ? readDraft() : null));
  const editDetails = editing ? detailsOf(editing) : null;
  const [id] = useState(() => draft?.id ?? crypto.randomUUID());
  const [date, setDate] = useState(
    draft?.date ?? editing?.date ?? initialDate ?? task?.date ?? todayISO(),
  );
  const [slot, setSlot] = useState<FitnessSlot>(
    draft?.slot ?? editDetails?.slot ?? task?.slot ?? template?.slot ?? initialSlot,
  );
  const [name, setName] = useState(
    draft?.name ?? editing?.name ?? movement?.name ?? template?.name ?? "",
  );
  const [kind, setKind] = useState(
    draft?.kind ??
      editing?.kind ??
      movement?.kind ??
      template?.kind ??
      (initialSlot === "cardio" ? "run" : initialSlot === "recovery" ? "recovery" : "gym"),
  );
  const [notes, setNotes] = useState(draft?.notes ?? editing?.notes ?? "");
  const [details, setDetails] = useState<WorkoutDetails>(
    () =>
      draft?.details ??
      editDetails ?? {
        ...emptyDetails(task?.slot ?? template?.slot ?? initialSlot),
        variation: planned.details.variation,
        score_unit: planned.details.score_unit,
        score_direction: planned.details.score_direction,
        template_id: template?.id ?? null,
        template_version: template?.version ?? null,
        template_snapshot: template?.payload ?? null,
        routine_id: routineId ?? null,
        win_id: winId ?? null,
      },
  );
  const [sets, setSets] = useState<FitnessSet[]>(() =>
    draft?.sets?.length
      ? draft.sets
      : editing
        ? setsOf(editing).length
          ? setsOf(editing)
          : [emptySet()]
        : movement
          ? [emptySet(movement.name)]
          : planned.sets.length
            ? planned.sets.map((s) => ({
                ...emptySet(s.exercise),
                load_type: s.load_type,
                notes: "",
              }))
            : [emptySet()],
  );
  const [time, setTime] = useState(
    draft?.time ??
      (editDetails?.duration_seconds != null ? duration(editDetails.duration_seconds) : ""),
  );
  const [distance, setDistance] = useState(
    draft?.distance ??
      (editDetails?.distance_m != null ? String(distanceUnits(editDetails.distance_m, "km")) : ""),
  );
  const [unit, setUnit] = useState(draft?.unit ?? (editDetails?.distance_m != null ? "km" : "miles"));
  const [taskId, setTaskId] = useState(task?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [taskChoice, setTaskChoice] = useState(false);
  const uploaded = useRef<{ url: string; type: "photo" | "video" }[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [timerTarget, setTimerTarget] = useState("session");
  useEffect(() => {
    if (!usesDraft) return;
    const meaningful = name.trim() || sets.some((s) => s.exercise.trim());
    if (meaningful)
      writeDraft({ id, date, slot, name, kind, notes, details, sets, time, distance, unit });
  }, [usesDraft, id, date, slot, name, kind, notes, details, sets, time, distance, unit]);
  const setDetail = <K extends keyof WorkoutDetails>(key: K, value: WorkoutDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: value }));
  const updateSet = (i: number, patch: Partial<FitnessSet>) =>
    setSets((rows) => rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const available = (tasks.data ?? []).filter(
    (t) => t.date === date && t.slot === slot && t.status === "planned",
  );
  const matchingTaskId = taskId || (!taskChoice ? (available[0]?.id ?? "") : "");
  const actualSets = sets.filter(
    (s) => s.exercise.trim() && [s.weight, s.reps, s.seconds, s.distance_m].some((v) => v !== null),
  );
  const save = useMutation({
    mutationFn: async () => {
      if (
        sets.some(
          (s) =>
            !s.exercise.trim() &&
            [s.weight, s.reps, s.seconds, s.distance_m].some((v) => v !== null),
        )
      )
        throw new Error("Name each exercise or drill that has a result before saving.");
      const seconds = parseDuration(time);
      const metres = distance ? distanceMetres(Number(distance), unit) : null;
      // Validate before uploading any media, and preserve the same ID on retry.
      const full = { ...details, slot, duration_seconds: seconds, distance_m: metres };
      const { validateSession } = await import("@/lib/fitness");
      validateSession(name, date, full, actualSets);
      for (const file of files.slice(uploaded.current.length))
        uploaded.current.push(await uploadWorkoutMedia(file));
      if (mediaError) throw new Error(mediaError);
      return saveFitnessWorkout(
        id,
        { name, date, kind, notes, details: full, sets: actualSets, media: uploaded.current },
        matchingTaskId || undefined,
      );
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  let seconds: number | null = null;
  try {
    seconds = parseDuration(time);
  } catch {
    /* Shown on save. */
  }
  const metres = Number(distance) > 0 ? distanceMetres(Number(distance), unit) : null;
  const runs = metres ? comparableRuns(history.data ?? [], kind, metres, details.variation) : [];
  const bestRun = [...runs].sort(
    (a, b) =>
      (detailsOf(a).duration_seconds ?? Infinity) - (detailsOf(b).duration_seconds ?? Infinity),
  )[0];
  const sameScores = template
    ? comparableScores(
        history.data ?? [],
        template.id,
        template.version,
        details.variation,
        details.score_unit,
        details.score_direction,
      )
    : [];
  const bestScore = sameScores.length
    ? (details.score_direction === "higher" ? Math.max : Math.min)(
        ...sameScores.map((w) => detailsOf(w).score!),
      )
    : null;

  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v && !save.isPending) onClose();
      }}
      title="Log training"
    >
      <fieldset disabled={save.isPending} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Activity date">
            <TextInput
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (!task) {
                  setTaskId("");
                  setTaskChoice(false);
                }
              }}
              disabled={!!task}
            />
          </Field>
          <Field label="Daily slot">
            <SelectInput
              value={slot}
              disabled={!!task}
              onChange={(e) => {
                setSlot(e.target.value as FitnessSlot);
                setTaskId("");
                setTaskChoice(false);
              }}
            >
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Session name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your session"
            maxLength={180}
          />
        </Field>
        <Field label="Training type">
          <SelectInput
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              if (!task && !template) {
                setSlot(slotForKind(e.target.value));
                setTaskId("");
                setTaskChoice(false);
              }
            }}
          >
            {FITNESS_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </SelectInput>
        </Field>
        {movement?.cue && (
          <div className="space-y-2 rounded-2xl bg-secondary p-3 text-sm">
            <p>{movement.cue}</p>
            {movement.caution && <p className="font-semibold">{movement.caution}</p>}
            {movement.reference && (
              <a
                href={movement.reference}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center font-bold underline"
              >
                {movement.referenceName ?? "Movement reference"}
              </a>
            )}
          </div>
        )}
        {routineId && (
          <p className="text-sm text-muted-foreground">
            Enter your actual duration or completed movements. The routine's planned timer is not
            logged as completed work.
          </p>
        )}
        {planned.instructions && (
          <div className="rounded-2xl bg-secondary p-3 text-sm">
            <p>{planned.instructions}</p>
            {planned.source && (
              <a
                href={planned.source}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block min-h-11 py-3 font-bold underline"
              >
                Original workout reference
              </a>
            )}
            {planned.sets.map((s, i) => (
              <p key={i} className="mt-1 text-xs">
                Planned: {s.exercise} · {setLabel(s)}
              </p>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Planned values are not completed results. Enter what you actually did.
            </p>
          </div>
        )}
        <Field label="Variation / scaling / conditions">
          <TextInput
            value={details.variation}
            onChange={(e) => setDetail("variation", e.target.value)}
            placeholder="e.g. strict, band assisted, road, treadmill"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (minutes:seconds)">
            <TextInput
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="25:30"
              inputMode="text"
            />
          </Field>
          <Field label="Distance">
            <TextInput
              type="number"
              min="0"
              step="any"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <Field label="Distance unit">
          <SelectInput value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="miles">Miles</option>
            <option value="km">Kilometres</option>
            <option value="m">Metres</option>
          </SelectInput>
        </Field>
        {slot === "cardio" && (
          <div className="rounded-2xl bg-secondary p-3 text-sm" data-testid="cardio-comparison">
            <p className="font-bold">{pace(metres, seconds, unit === "m" ? "km" : unit)}</p>
            {runs.length ? (
              <>
                <p>
                  Previous at this distance/variation:{" "}
                  {duration(detailsOf(runs.at(-1)!).duration_seconds)}
                </p>
                <p>Best: {duration(detailsOf(bestRun!).duration_seconds)}</p>
              </>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Comparable runs appear after you log this distance and variation.
              </p>
            )}
          </div>
        )}
        {slot === "recovery" && (
          <>
            <Field label="Recovery placement">
              <SelectInput
                value={details.recovery_phase}
                onChange={(e) =>
                  setDetail("recovery_phase", e.target.value as WorkoutDetails["recovery_phase"])
                }
              >
                <option value="standalone">Standalone recovery</option>
                <option value="before">Before another session</option>
                <option value="after">After another session</option>
              </SelectInput>
            </Field>
            {details.recovery_phase !== "standalone" && (
              <Field label="Related session">
                <SelectInput
                  value={details.related_workout_id ?? ""}
                  onChange={(e) => setDetail("related_workout_id", e.target.value || null)}
                >
                  <option value="">Optional: choose saved session</option>
                  {(history.data ?? []).slice(0, 100).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.date} · {w.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
          </>
        )}
        <Field label="Use timer result for">
          <SelectInput value={timerTarget} onChange={(e) => setTimerTarget(e.target.value)}>
            <option value="session">Session duration</option>
            {sets.map((s, i) => (
              <option value={String(i)} key={i}>
                Set {i + 1}: {s.exercise || "unnamed"} continuous hold
              </option>
            ))}
          </SelectInput>
        </Field>
        <TrainingTimer
          onUse={(s) =>
            timerTarget === "session"
              ? setTime(duration(s))
              : updateSet(Number(timerTarget), { seconds: s })
          }
        />
        <SectionTitle>Sets / intervals / attempts</SectionTitle>
        <datalist id="fitness-exercises">
          {[
            ...new Set([
              ...MOVEMENTS.map((m) => m.name),
              ...(history.data ?? []).flatMap((w) => setsOf(w).map((s) => s.exercise)),
            ]),
          ].map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {sets.map((s, i) => {
          const prev = s.exercise.trim()
            ? previousExercise(history.data ?? [], s.exercise, date)
            : undefined;
          const prevSets = prev
            ? setsOf(prev).filter(
                (p) => p.exercise.toLowerCase() === s.exercise.trim().toLowerCase(),
              )
            : [];
          return (
            <div
              key={i}
              className="min-w-0 space-y-2 rounded-2xl border p-3"
              data-testid={`training-set-${i}`}
            >
              <Field label={`Set ${i + 1} exercise / drill`}>
                <TextInput
                  list="fitness-exercises"
                  value={s.exercise}
                  onChange={(e) => updateSet(i, { exercise: e.target.value })}
                  placeholder="Choose or type an exercise"
                />
              </Field>
              {prev && (
                <div
                  className="rounded-xl bg-secondary p-3 text-xs"
                  data-testid={`previous-sets-${i}`}
                >
                  <p className="font-bold">Previous session · {prettyDate(prev.date)}</p>
                  {prevSets.map((p, n) => (
                    <p key={n}>
                      Set {n + 1}: {setLabel(p)}
                    </p>
                  ))}
                </div>
              )}
              {history.isError && (
                <p role="alert" className="text-xs">
                  Previous-session history unavailable.{" "}
                  <button className="underline" onClick={() => history.refetch()}>
                    Retry history
                  </button>
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Set ${i + 1} load (kg)`}>
                  <TextInput
                    type="number"
                    min="0"
                    step="any"
                    value={s.weight ?? ""}
                    onChange={(e) => updateSet(i, { weight: numberOrNull(e.target.value) })}
                  />
                </Field>
                <Field label={`Set ${i + 1} reps`}>
                  <TextInput
                    type="number"
                    min="0"
                    step="1"
                    value={s.reps ?? ""}
                    onChange={(e) => updateSet(i, { reps: numberOrNull(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label={`Set ${i + 1} load type`}>
                <SelectInput
                  value={s.load_type}
                  onChange={(e) =>
                    updateSet(i, { load_type: e.target.value as FitnessSet["load_type"] })
                  }
                >
                  <option value="external">External weight</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="added">Added to bodyweight</option>
                  <option value="assisted">Assistance (not lifted weight)</option>
                </SelectInput>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Set ${i + 1} seconds`}>
                  <TextInput
                    type="number"
                    min="0"
                    step="any"
                    value={s.seconds ?? ""}
                    onChange={(e) => updateSet(i, { seconds: numberOrNull(e.target.value) })}
                  />
                </Field>
                <Field label={`Set ${i + 1} rest seconds`}>
                  <TextInput
                    type="number"
                    min="0"
                    step="any"
                    value={s.rest_seconds ?? ""}
                    onChange={(e) => updateSet(i, { rest_seconds: numberOrNull(e.target.value) })}
                  />
                </Field>
              </div>
              {advanced && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={`Set ${i + 1} interval metres`}>
                      <TextInput
                        type="number"
                        min="0"
                        step="any"
                        value={s.distance_m ?? ""}
                        onChange={(e) => updateSet(i, { distance_m: numberOrNull(e.target.value) })}
                      />
                    </Field>
                    <Field label={`Set ${i + 1} effort (1–10)`}>
                      <TextInput
                        type="number"
                        min="1"
                        max="10"
                        value={s.effort ?? ""}
                        onChange={(e) => updateSet(i, { effort: numberOrNull(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <Field label={`Set ${i + 1} side`}>
                    <SelectInput
                      value={s.side}
                      onChange={(e) => updateSet(i, { side: e.target.value as FitnessSet["side"] })}
                    >
                      <option>both</option>
                      <option>left</option>
                      <option>right</option>
                    </SelectInput>
                  </Field>
                  <Field label={`Set ${i + 1} technique / drill notes`}>
                    <TextInput
                      value={s.notes}
                      onChange={(e) => updateSet(i, { notes: e.target.value })}
                    />
                  </Field>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSets((rows) => [...rows.slice(0, i + 1), { ...s }, ...rows.slice(i + 1)])
                  }
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold"
                >
                  <Copy size={16} /> Copy set
                </button>
                <button
                  type="button"
                  onClick={() => setSets((rows) => rows.filter((_, n) => n !== i))}
                  className="min-h-11 px-3"
                  aria-label={`Remove set ${i + 1}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        <GhostButton onClick={() => setSets((rows) => [...rows, emptySet()])}>
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} /> Add set / interval
          </span>
        </GhostButton>
        <button
          type="button"
          className="min-h-11 text-sm font-bold underline"
          aria-expanded={advanced}
          onClick={() => setAdvanced((v) => !v)}
        >
          {advanced ? "Hide" : "Show"} side, interval distance and effort
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full rounds">
            <TextInput
              type="number"
              min="0"
              step="1"
              value={details.rounds ?? ""}
              onChange={(e) => setDetail("rounds", numberOrNull(e.target.value))}
            />
          </Field>
          <Field label="Score">
            <TextInput
              type="number"
              min="0"
              step="any"
              value={details.score ?? ""}
              onChange={(e) => setDetail("score", numberOrNull(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Score unit">
            <TextInput
              value={details.score_unit}
              onChange={(e) => setDetail("score_unit", e.target.value)}
            />
          </Field>
          <Field label="Better score">
            <SelectInput
              value={details.score_direction}
              onChange={(e) => setDetail("score_direction", e.target.value as "higher" | "lower")}
            >
              <option value="higher">Higher</option>
              <option value="lower">Lower</option>
            </SelectInput>
          </Field>
        </div>
        {bestScore !== null && (
          <p className="text-sm font-semibold">
            Comparable best: {bestScore} {details.score_unit} · same template version and variation
          </p>
        )}
        {!task && (
          <Field label="Complete matching daily task">
            <SelectInput
              value={matchingTaskId}
              onChange={(e) => {
                setTaskChoice(true);
                setTaskId(e.target.value);
              }}
            >
              <option value="">No task link</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label="Session notes">
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you did, conditions or anything to remember"
          />
        </Field>
        <button
          type="button"
          className="min-h-11 text-sm font-bold underline"
          aria-expanded={reviewOpen}
          onClick={() => setReviewOpen((v) => !v)}
        >
          Review this workout
        </button>
        {reviewOpen &&
          (["tough", "useful", "change", "discomfort"] as const).map((key) => (
            <Field
              key={key}
              label={
                {
                  tough: "What was tough?",
                  useful: "What was useful?",
                  change: "What to change / easier or harder?",
                  discomfort: "Any discomfort or unsuitable movements?",
                }[key]
              }
            >
              <TextArea
                value={details.review[key]}
                onChange={(e) => setDetail("review", { ...details.review, [key]: e.target.value })}
              />
            </Field>
          ))}
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border p-3 text-sm font-bold">
          <Camera size={18} /> Photos / videos
          <input
            aria-label="Training photos or videos"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.some((f) => f.size > 50 * 1024 * 1024)) {
                setMediaError("Each attachment must be smaller than 50 MB. Choose smaller files.");
                return;
              }
              setMediaError("");
              setFiles(picked);
              uploaded.current = [];
            }}
            className="min-w-0 w-full text-xs"
          />
        </label>
        {mediaError && (
          <p role="alert" className="text-sm text-destructive">
            {mediaError}
          </p>
        )}
        {!!files.length && (
          <p className="text-xs">{files.length} attachments, uploaded only when you save.</p>
        )}
        <FitnessError error={save.error} />
        <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
          {save.isPending ? "Saving session…" : "Save session"}
        </PrimaryButton>
        <p className="text-xs text-muted-foreground">
          One saved session updates history, its linked task and applicable goals. Blank sets are
          not logged.
        </p>
      </fieldset>
    </FormSheet>
  );
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
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const rows = (history.data ?? []).filter(
    (w) =>
      (!filter || detailsOf(w).slot === filter) &&
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
          Weights, core, neck, cardio, skills and recovery. Your earlier logs stay here.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>Log a session</PrimaryButton>
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
              <option key={s}>{s}</option>
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
            {prettyDate(w.date)} · {w.kind} · {w.exercise_sets.length} sets
          </p>
          {detailsOf(w).distance_m !== null && (
            <p className="mt-2 text-sm">
              {distanceUnits(detailsOf(w).distance_m!, "km").toFixed(2)} km ·{" "}
              {duration(detailsOf(w).duration_seconds)}
            </p>
          )}
        </button>
      ))}
      {open && <SessionComposer onClose={() => setOpen(false)} />}
      {view && <SessionDetail workout={view} onClose={() => setView(null)} />}
    </>
  );
}
