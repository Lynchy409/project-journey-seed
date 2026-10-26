import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";
import type { Json } from "@/integrations/supabase/types";
import type {
  FitnessPlan,
  FitnessSet,
  FitnessSlot,
  FitnessTemplate,
  GoalTracking,
  WorkoutDetails,
} from "./fitness-types";

export const SLOTS: FitnessSlot[] = ["strength", "cardio", "recovery"];
export function trainingSlotForTask(title: string): FitnessSlot | null {
  if (/\b(stretch|mobility|yoga|recovery)\b/i.test(title)) return "recovery";
  if (/hold|plank|hang|wrist|shoulder|neck|isometric/i.test(title)) return "strength";
  if (/bag training|walk/i.test(title)) return "cardio";
  if (/\b(gym|strength|weights|calisthenics)\b/i.test(title)) return "strength";
  if (/\b(run|sprint|sprints|cardio|conditioning|boxing)\b/i.test(title)) return "cardio";
  return null;
}
export const FITNESS_KINDS = [
  "gym",
  "calisthenics",
  "core",
  "neck",
  "run",
  "sprints",
  "cycling",
  "rowing",
  "walking",
  "boxing",
  "jiu-jitsu",
  "rugby",
  "conditioning",
  "circuit",
  "skills",
  "yoga",
  "mobility",
  "recovery",
  "other",
];
export const emptySet = (exercise = ""): FitnessSet => ({
  exercise,
  weight: null,
  reps: null,
  seconds: null,
  distance_m: null,
  rest_seconds: null,
  load_type: "external",
  side: "both",
  effort: null,
  notes: "",
});
export const emptyDetails = (slot: FitnessSlot = "strength"): WorkoutDetails => ({
  slot,
  duration_seconds: null,
  distance_m: null,
  rounds: null,
  score: null,
  score_unit: "rounds",
  score_direction: "higher",
  template_id: null,
  template_version: null,
  template_snapshot: null,
  variation: "standard",
  related_workout_id: null,
  recovery_phase: "standalone",
  routine_id: null,
  win_id: null,
  review: { tough: "", useful: "", change: "", discomfort: "" },
});
const nonnegative = z.number().finite().min(0).nullable();
export const fitnessSetSchema = z.object({
  exercise: z.string().trim().min(1).max(180),
  weight: nonnegative,
  reps: nonnegative.refine((v) => v === null || Number.isInteger(v), "Reps must be whole numbers"),
  seconds: nonnegative,
  distance_m: nonnegative,
  rest_seconds: nonnegative,
  load_type: z.enum(["external", "bodyweight", "added", "assisted"]),
  side: z.enum(["both", "left", "right"]),
  effort: z.number().min(1).max(10).nullable(),
  notes: z.string().max(4000),
});
export type FitnessWorkout = {
  id: string;
  date: string;
  name: string;
  kind: string;
  notes: string | null;
  created_at: string;
  details: Json;
  media?: Json;
  exercise_sets: {
    id: string;
    exercise: string;
    weight: number | null;
    reps: number | null;
    set_index: number;
    details?: Json;
  }[];
};
export function detailsOf(w: Pick<FitnessWorkout, "details" | "kind">): WorkoutDetails {
  const d = object(w.details);
  return {
    ...emptyDetails(slotForKind(w.kind)),
    ...d,
    review: { ...emptyDetails().review, ...object(d["review"]) },
  } as WorkoutDetails;
}
export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function setsOf(w: FitnessWorkout): FitnessSet[] {
  return [...w.exercise_sets]
    .sort((a, b) => a.set_index - b.set_index)
    .map((s) => ({
      ...emptySet(s.exercise),
      ...object(s.details),
      exercise: s.exercise,
      weight: s.weight,
      reps: s.reps,
    })) as FitnessSet[];
}
export function slotForKind(kind: string): FitnessSlot {
  if (["recovery", "yoga", "mobility"].includes(kind)) return "recovery";
  if (
    [
      "run",
      "sprints",
      "cycling",
      "rowing",
      "walking",
      "boxing",
      "jiu-jitsu",
      "rugby",
      "conditioning",
      "circuit",
    ].includes(kind)
  )
    return "cardio";
  return "strength";
}
export function numberOrNull(v: string) {
  return v.trim() === "" ? null : Number(v);
}
export function duration(seconds: number | null) {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function parseDuration(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?::[0-5]\d)?$/.test(value.trim()))
    throw new Error("Use minutes:seconds, for example 25:30.");
  const parts = value.split(":").map(Number);
  return parts.length === 1 ? parts[0]! * 60 : parts[0]! * 60 + parts[1]!;
}
export function distanceMetres(value: number, unit: string) {
  return value * (unit === "miles" ? 1609.344 : unit === "km" ? 1000 : 1);
}
export function distanceUnits(value: number, unit: string) {
  return value / (unit === "miles" ? 1609.344 : unit === "km" ? 1000 : 1);
}
export function pace(metres: number | null, seconds: number | null, unit: string) {
  return metres && seconds
    ? `${duration(seconds / distanceUnits(metres, unit))} / ${unit === "miles" ? "mile" : unit}`
    : "Add distance and time";
}
export function previousExercise(
  history: FitnessWorkout[],
  exercise: string,
  before: string,
  excludeId?: string,
) {
  const key = exercise.trim().toLowerCase();
  return [...history]
    .filter(
      (w) =>
        w.id !== excludeId &&
        w.date <= before &&
        setsOf(w).some((s) => s.exercise.toLowerCase() === key),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))[0];
}
export function comparableRuns(
  history: FitnessWorkout[],
  kind: string,
  metres: number,
  variation: string,
) {
  return history
    .filter((w) => {
      const d = detailsOf(w);
      return (
        w.kind === kind &&
        d.variation === variation &&
        d.distance_m !== null &&
        Math.abs(d.distance_m - metres) <= Math.max(1, metres * 0.001) &&
        (d.duration_seconds ?? 0) > 0
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
}
export function comparableScores(
  history: FitnessWorkout[],
  template: string,
  version: number,
  variation: string,
  scoreUnit?: string,
  scoreDirection?: "higher" | "lower",
) {
  return history.filter((w) => {
    const d = detailsOf(w);
    return (
      d.template_id === template &&
      d.template_version === version &&
      d.variation === variation &&
      (scoreUnit === undefined || d.score_unit === scoreUnit) &&
      (scoreDirection === undefined || d.score_direction === scoreDirection) &&
      d.score !== null
    );
  });
}
export function periodBounds(period: string, reference: string): { start: string; end: string } {
  const d = new Date(`${reference}T12:00:00Z`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (period === "week") {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start: iso(d), end: iso(end) };
  }
  if (period === "month")
    return {
      start: `${reference.slice(0, 7)}-01`,
      end: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12))),
    };
  return { start: "", end: "" };
}
export function trackingDefaults(): GoalTracking {
  return {
    mode: "manual",
    measure: "distance_m",
    kind: "",
    exercise: "",
    slot: "",
    period: "all",
    start: "",
    end: "",
    unit: "km",
    plan_id: "",
    min_reps: 1,
    load_type: "",
    side: "",
    variation: "",
    template_id: "",
    template_version: null,
  };
}
export function goalValue(
  tracking: Partial<GoalTracking>,
  history: FitnessWorkout[],
  plans: FitnessPlan[] = [],
): number {
  const t = { ...trackingDefaults(), ...tracking };
  if (t.mode === "milestones") {
    const p = plans.find((p) => p.id === t.plan_id);
    return Array.isArray(p?.steps)
      ? p.steps.filter((s) => object(s)["complete"] === true).length
      : 0;
  }
  const workouts = history.filter(
    (w) =>
      (!t.start || w.date >= t.start) &&
      (!t.end || w.date <= t.end) &&
      (!t.kind || w.kind === t.kind) &&
      (!t.slot || detailsOf(w).slot === t.slot) &&
      (!t.variation || detailsOf(w).variation === t.variation) &&
      (!t.template_id || detailsOf(w).template_id === t.template_id) &&
      (!t.template_version || detailsOf(w).template_version === t.template_version),
  );
  if (t.mode === "count")
    return workouts.filter(
      (w) =>
        !t.exercise ||
        setsOf(w).some(
          (s) =>
            s.exercise.trim().toLowerCase() === t.exercise.trim().toLowerCase() &&
            (!t.load_type || s.load_type === t.load_type) &&
            (!t.side || s.side === t.side) &&
            (t.measure !== "weight" || (s.reps ?? 0) >= t.min_reps),
        ),
    ).length;
  const values: number[] = [];
  for (const w of workouts) {
    if (t.exercise) {
      for (const s of setsOf(w)) {
        if (s.exercise.trim().toLowerCase() !== t.exercise.trim().toLowerCase()) continue;
        if (t.load_type && s.load_type !== t.load_type) continue;
        if (t.side && s.side !== t.side) continue;
        if (t.measure === "weight" && (s.reps ?? 0) < t.min_reps) continue;
        const value =
          t.measure === "duration_seconds"
            ? s.seconds
            : s[t.measure as "weight" | "reps" | "seconds" | "distance_m"];
        if (typeof value === "number") values.push(value);
      }
    } else {
      const value = detailsOf(w)[t.measure as "distance_m" | "duration_seconds" | "score"];
      if (typeof value === "number") values.push(value);
    }
  }
  const result = t.mode === "best" ? Math.max(0, ...values) : values.reduce((a, b) => a + b, 0);
  return (
    Math.round((t.measure === "distance_m" ? distanceUnits(result, t.unit) : result) * 1000) / 1000
  );
}
export function validateSession(
  name: string,
  date: string,
  details: WorkoutDetails,
  sets: FitnessSet[],
) {
  if (!name.trim()) throw new Error("Give this session a name.");
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new Error("Choose a valid activity date.");
  for (const key of ["duration_seconds", "distance_m", "rounds", "score"] as const) {
    if (details[key] !== null && (!Number.isFinite(details[key]) || details[key]! < 0))
      throw new Error(`${key.replaceAll("_", " ")} must be a positive number.`);
  }
  if (details.rounds !== null && !Number.isInteger(details.rounds))
    throw new Error("Rounds must be a whole number.");
  sets.forEach((s) => fitnessSetSchema.parse(s));
  if (
    !sets.length &&
    !(details.duration_seconds || details.distance_m || details.rounds || details.score)
  )
    throw new Error("Add a set, duration, distance, rounds or score before saving.");
}

export async function loadFitnessHistory(): Promise<FitnessWorkout[]> {
  const rows: FitnessWorkout[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("workouts")
      .select("*, exercise_sets(*)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export const fitnessHistoryQuery = queryOptions({
  queryKey: ["fitness_history"],
  queryFn: loadFitnessHistory,
});
export const fitnessTemplatesQuery = queryOptions({
  queryKey: ["fitness_templates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("fitness_templates")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
export const fitnessPlansQuery = queryOptions({
  queryKey: ["fitness_plans"],
  queryFn: async () => {
    const { data, error } = await supabase.from("fitness_plans").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const fitnessTasksQuery = queryOptions({
  queryKey: ["fitness_tasks"],
  queryFn: async () => {
    const rows = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase
        .from("fitness_tasks")
        .select("*")
        .order("date")
        .order("id")
        .range(from, from + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  },
});
export const fitnessPreferencesQuery = queryOptions({
  queryKey: ["fitness_preferences"],
  queryFn: async () => {
    const { data, error } = await supabase.from("fitness_preferences").select("*").maybeSingle();
    if (error) throw error;
    return object(data?.data);
  },
});
export async function savePreferences(patch: Record<string, Json>) {
  const user_id = await uid();
  const { data: row, error: readError } = await supabase
    .from("fitness_preferences")
    .select("data")
    .eq("user_id", user_id)
    .maybeSingle();
  if (readError) throw readError;
  const { error } = await supabase
    .from("fitness_preferences")
    .upsert({ user_id, data: { ...object(row?.data), ...patch } as Json });
  if (error) throw error;
}
export async function saveFitnessWorkout(
  id: string,
  input: {
    name: string;
    date: string;
    kind: string;
    notes: string;
    details: WorkoutDetails;
    sets: FitnessSet[];
    media?: { url: string; type: string }[];
  },
  taskId?: string,
) {
  validateSession(input.name, input.date, input.details, input.sets);
  const { data, error } = await supabase.rpc("save_fitness_workout", {
    p_id: id,
    p_workout: {
      name: input.name.trim(),
      date: input.date,
      kind: input.kind,
      notes: input.notes,
      details: input.details as unknown as Json,
      media: input.media ?? [],
    },
    p_sets: input.sets as unknown as Json,
    ...(taskId ? { p_task_id: taskId } : {}),
  });
  if (error) throw error;
  return data;
}
/** Edits an already-logged session in place. New sets are written before old ones are removed, so a failure never leaves the session empty. */
export async function updateFitnessWorkout(
  workout: FitnessWorkout,
  input: {
    name: string;
    date: string;
    kind: string;
    notes: string;
    details: WorkoutDetails;
    sets: FitnessSet[];
    media?: { url: string; type: string }[];
  },
) {
  validateSession(input.name, input.date, input.details, input.sets);
  const user_id = await uid();
  const { error } = await supabase
    .from("workouts")
    .update({
      name: input.name.trim(),
      date: input.date,
      kind: input.kind,
      notes: input.notes || null,
      details: input.details as unknown as Json,
      media: (input.media ?? []) as unknown as Json,
    })
    .eq("id", workout.id);
  if (error) throw error;
  const oldIds = workout.exercise_sets.map((s) => s.id);
  if (input.sets.length) {
    const rows = input.sets.map((s, n) => {
      const { exercise, weight, reps, ...rest } = s;
      return {
        user_id,
        workout_id: workout.id,
        exercise: exercise.trim(),
        weight,
        reps,
        set_index: n + 1,
        details: rest as unknown as Json,
      };
    });
    const { error: insErr } = await supabase.from("exercise_sets").insert(rows);
    if (insErr) throw insErr;
  }
  if (oldIds.length) {
    const { error: delErr } = await supabase.from("exercise_sets").delete().in("id", oldIds);
    if (delErr) throw delErr;
  }
}
export async function saveFitnessTemplate(
  input: Pick<FitnessTemplate, "name" | "slot" | "kind" | "payload"> & {
    id?: string;
    version?: number;
  },
) {
  const user_id = await uid();
  if (!input.name.trim()) throw new Error("Name the workout.");
  const query = input.id
    ? supabase
        .from("fitness_templates")
        .update({ ...input, user_id })
        .eq("id", input.id)
        .eq("version", (input.version ?? 1) - 1)
    : supabase.from("fitness_templates").insert({ ...input, user_id });
  const { data, error } = await query.select().single();
  if (error?.code === "PGRST116")
    throw new Error("This workout changed in another window. Reopen it before editing.");
  if (error) throw error;
  return data;
}
export async function saveFitnessPlan(input: {
  id?: string;
  name: string;
  kind: string;
  target: string;
  steps: Json;
  notes: string;
}) {
  const user_id = await uid();
  if (!input.name.trim()) throw new Error("Name the plan.");
  const { error } = await supabase.from("fitness_plans").upsert({ ...input, user_id });
  if (error) throw error;
}
export async function patchFitnessTask(
  id: string,
  patch: { status?: "planned" | "skipped"; template_id?: string | null; title?: string },
) {
  const { error } = await supabase.from("fitness_tasks").update(patch).eq("id", id);
  if (error) throw error;
}
export async function moveFitnessTask(id: string, date: string, swapId?: string) {
  const { error } = await supabase.rpc("move_fitness_task", {
    p_id: id,
    p_date: date,
    ...(swapId ? { p_swap_id: swapId } : {}),
  });
  if (error) throw error;
}
export type WeeklySchedule = Record<string, FitnessSlot[]>;
export const DEFAULT_SCHEDULE: WeeklySchedule = {
  "1": SLOTS,
  "2": SLOTS,
  "3": ["recovery"],
  "4": SLOTS,
  "5": SLOTS,
  "6": SLOTS,
  "0": [],
};
export async function ensureFitnessTasks(
  from: string,
  schedule: WeeklySchedule,
  restDates: string[] = [],
) {
  const user_id = await uid();
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    if (restDates.includes(date)) continue;
    for (const slot of schedule[String(d.getUTCDay())] ?? [])
      rows.push({
        user_id,
        date,
        slot,
        title: `${slot[0]!.toUpperCase()}${slot.slice(1)} session`,
        source_key: `recurring:${date}:${slot}`,
      });
  }
  if (rows.length) {
    const { error } = await supabase
      .from("fitness_tasks")
      .upsert(rows, { onConflict: "user_id,source_key", ignoreDuplicates: true });
    if (error) throw error;
  }
  if (restDates.length) {
    const { error } = await supabase
      .from("fitness_tasks")
      .update({ status: "skipped" })
      .eq("status", "planned")
      .in("date", restDates)
      .gte("date", from);
    if (error) throw error;
  }
}
export function templatePayload(t: FitnessTemplate | null) {
  const p = object(t?.payload);
  return {
    details: { ...emptyDetails(t?.slot), ...object(p["details"]) } as WorkoutDetails,
    sets: Array.isArray(p["sets"])
      ? (p["sets"].map((s) => ({ ...emptySet(), ...object(s) })) as FitnessSet[])
      : [],
    instructions: typeof p["instructions"] === "string" ? p["instructions"] : "",
    source: typeof p["source"] === "string" ? p["source"] : "",
  };
}
export function fitnessError(error: unknown) {
  const e = object(error);
  const message =
    error instanceof Error
      ? error.message
      : String(e["message"] ?? "Could not load or save training data.");
  if (
    /schema cache|does not exist|save_fitness_workout|fitness_(templates|tasks|preferences|plans)/i.test(
      message,
    )
  )
    return "The fitness database update is not installed yet. Apply 20261025200000_fitness_workspace.sql in Lovable Cloud, then retry. Your existing data is unchanged.";
  return message;
}
