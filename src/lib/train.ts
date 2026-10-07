import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";

export const WORKOUT_KINDS = ["gym", "sprints", "rugby", "conditioning", "recovery"] as const;

export const workoutsQuery = queryOptions({
  queryKey: ["workouts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*, exercise_sets(*)")
      .order("date", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data.map((w) => ({ ...w, exercise_sets: [...w.exercise_sets].sort((a, b) => a.set_index - b.set_index) }));
  },
});

export const setsQuery = queryOptions({
  queryKey: ["exercise_sets"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("exercise_sets")
      .select("*, workouts(date)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data;
  },
});

export async function uploadWorkoutMedia(file: File): Promise<{ url: string; type: "photo" | "video" }> {
  const user = await uid();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "lift";
  const path = `${user}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("workout-media").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("workout-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("Could not get media link");
  return { url: data.signedUrl, type: file.type.startsWith("video") ? "video" : "photo" };
}

export async function addWorkout(input: {
  date: string;
  name: string;
  kind: string;
  notes: string | null;
  media_url?: string | null;
  media_type?: string | null;
  media?: { url: string; type: string }[];
  sets: { exercise: string; weight: number | null; reps: number | null }[];
}) {
  const user = await uid();
  const { data, error } = await supabase
    .from("workouts")
    .insert({ user_id: user, date: input.date, name: input.name, kind: input.kind, notes: input.notes, media_url: input.media_url ?? null, media_type: input.media_type ?? null, media: input.media ?? [] })
    .select("id")
    .single();
  if (error) throw error;
  const rows = input.sets
    .filter((s) => s.exercise.trim())
    .map((s, i) => ({ ...s, exercise: s.exercise.trim(), user_id: user, workout_id: data.id, set_index: i + 1 }));
  if (rows.length > 0) {
    const { error: e2 } = await supabase.from("exercise_sets").insert(rows);
    if (e2) throw e2;
  }
  return data.id;
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

export type LiftRow = { exercise: string; weight: number | null; reps: number | null; workouts: { date: string } | null };

/** Best weight per exercise, plus history, for the lift search. */
export function liftSummary(rows: LiftRow[]) {
  const map = new Map<string, { exercise: string; best: number; bestReps: number | null; lastDate: string | null; count: number }>();
  for (const r of rows) {
    const key = r.exercise.toLowerCase();
    const w = r.weight ?? 0;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { exercise: r.exercise, best: w, bestReps: r.reps, lastDate: r.workouts?.date ?? null, count: 1 });
    } else {
      cur.count += 1;
      if (w > cur.best) {
        cur.best = w;
        cur.bestReps = r.reps;
      }
      if (!cur.lastDate || (r.workouts?.date ?? "") > cur.lastDate) cur.lastDate = r.workouts?.date ?? cur.lastDate;
    }
  }
  return [...map.values()].sort((a, b) => a.exercise.localeCompare(b.exercise));
}
