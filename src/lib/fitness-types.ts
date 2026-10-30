import type { Database, Json } from "@/integrations/supabase/types";

export type FitnessSlot = "strength" | "cardio" | "recovery";
export type FitnessSet = {
  exercise: string;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  distance_m: number | null;
  rest_seconds: number | null;
  load_type: "external" | "bodyweight" | "added" | "assisted";
  side: "both" | "left" | "right";
  effort: number | null;
  notes: string;
};
export type WorkoutDetails = {
  slot: FitnessSlot;
  slots?: FitnessSlot[];
  completed_slots?: FitnessSlot[];
  fitness_activity?: string;
  fitness_focus?: string;
  circuit_exercises?: string[];
  cooldown?: boolean;
  recovery_seconds?: number | null;
  recovery_areas?: string[];
  recovery_problem?: string;
  duration_seconds: number | null;
  distance_m: number | null;
  rounds: number | null;
  score: number | null;
  score_unit: string;
  score_direction: "higher" | "lower";
  template_id: string | null;
  template_version: number | null;
  template_snapshot: Json;
  variation: string;
  related_workout_id: string | null;
  recovery_phase: "standalone" | "before" | "after";
  routine_id: string | null;
  win_id: string | null;
  review: { tough: string; useful: string; change: string; discomfort: string };
  media?: { url: string; type: string }[];
};
export type FitnessTemplate = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  slot: FitnessSlot;
  version: number;
  payload: Json;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type FitnessTask = {
  id: string;
  user_id: string;
  date: string;
  slot: FitnessSlot;
  title: string;
  template_id: string | null;
  status: "planned" | "done" | "skipped";
  workout_id: string | null;
  source_key: string;
  created_at: string;
};
export type PlanStep = { id: string; title: string; criterion: string; complete: boolean };
export type FitnessPlan = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  target: string;
  steps: Json;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type FitnessPreferences = {
  user_id: string;
  data: Json;
  updated_at: string;
};
export type GoalTracking = {
  mode: "manual" | "sum" | "best" | "count" | "milestones";
  measure: "distance_m" | "duration_seconds" | "weight" | "reps" | "seconds" | "score";
  kind: string;
  exercise: string;
  slot: string;
  period: "all" | "week" | "month" | "custom";
  start: string;
  end: string;
  unit: string;
  plan_id: string;
  min_reps: number;
  load_type: string;
  side: string;
  variation: string;
  template_id: string;
  template_version: number | null;
};
type Table<R, Required extends keyof R = never> = {
  Row: R;
  Insert: Partial<R> & Pick<R, Required>;
  Update: Partial<R>;
  Relationships: [];
};
type Extended<T extends { Row: object; Insert: object; Update: object }, E> = Omit<
  T,
  "Row" | "Insert" | "Update"
> & { Row: T["Row"] & E; Insert: T["Insert"] & Partial<E>; Update: T["Update"] & Partial<E> };
type Existing = Database["public"]["Tables"];

/** Additive migration contract; keep the generated baseline intact until Cloud regenerates it. */
export type FitnessDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<Existing, "workouts" | "exercise_sets" | "goals" | "checkins"> & {
      workouts: Extended<Existing["workouts"], { details: Json }>;
      exercise_sets: Extended<Existing["exercise_sets"], { details: Json }>;
      goals: Extended<Existing["goals"], { tracking: Json }>;
      checkins: Extended<Existing["checkins"], { recovery: Json }>;
      fitness_templates: Table<FitnessTemplate, "user_id" | "name" | "kind" | "slot">;
      fitness_tasks: Table<FitnessTask, "user_id" | "date" | "slot" | "title" | "source_key">;
      fitness_plans: Table<FitnessPlan, "user_id" | "name" | "kind">;
      fitness_preferences: Table<FitnessPreferences, "user_id">;
    };
    Functions: Database["public"]["Functions"] & {
      save_fitness_workout: {
        Args: { p_id: string; p_workout: Json; p_sets: Json; p_task_id?: string };
        Returns: string;
      };
      move_fitness_task: {
        Args: { p_id: string; p_date: string; p_swap_id?: string };
        Returns: undefined;
      };
      delete_fitness_workout: { Args: { p_id: string }; Returns: undefined };
    };
  };
};
