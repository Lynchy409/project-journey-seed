import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";
import { todayISO } from "./dates";

export type RoutineStep = { id: string; name: string; cue: string | null; seconds: number; sort: number };
export type Routine = { id: string; name: string; kind: string; description: string | null; sort: number; routine_steps: RoutineStep[] };

const DEFAULTS: { name: string; kind: string; description: string; steps: { name: string; cue: string; seconds: number }[] }[] = [
  {
    name: "Wrist Routine",
    kind: "mobility",
    description: "Joint decompression and forearm resilience for lifting and desk sessions.",
    steps: [
      { name: "Tabletop palm pulses", cue: "Hands flat, fingers forward. Rock slowly forward and back over the wrist crease.", seconds: 40 },
      { name: "Reverse palm rock", cue: "Palms down, fingers pointing back at your knees. Sit the hips back gently.", seconds: 40 },
      { name: "Dorsal wrist roll", cue: "Backs of the hands down, fingers facing each other. Slowly make soft fists.", seconds: 40 },
      { name: "First knuckle lifts", cue: "Fingertips planted, lift the palms like a push-up for the hands.", seconds: 30 },
      { name: "Finger flicks & spider curls", cue: "Fast open and close to pump blood through the carpal tunnel.", seconds: 30 },
      { name: "Wrist CARs", cue: "Closed fists. Draw the biggest slowest circles you can without turning the forearms.", seconds: 45 },
    ],
  },
  {
    name: "Face Routine",
    kind: "recovery",
    description: "Jaw release and lymphatic drainage. Great first thing or after training.",
    steps: [
      { name: "Masseter knuckle knead", cue: "Small upward circles with the knuckles along the jawline into the cheek muscle.", seconds: 30 },
      { name: "Under-chin thumb slide", cue: "Thumbs under the chin, glide along the jawbone back towards the ears.", seconds: 30 },
      { name: "Cheekbone lift", cue: "Sweep firmly from beside the nose out along the cheekbones to the hairline.", seconds: 30 },
      { name: "Temple release", cue: "Light circles on the temples while you let the lower jaw hang loose.", seconds: 30 },
      { name: "Neck & trap drain", cue: "Flat open-hand strokes from behind the ears down to the collarbone.", seconds: 30 },
    ],
  },
];

export const routinesQuery = queryOptions({
  queryKey: ["routines"],
  queryFn: async (): Promise<Routine[]> => {
    const { data, error } = await supabase
      .from("routines")
      .select("id, name, kind, description, sort, routine_steps(id, name, cue, seconds, sort)")
      .order("sort", { ascending: true });
    if (error) throw error;
    if (!data.length) {
      await seedDefaultRoutines();
      const again = await supabase
        .from("routines")
        .select("id, name, kind, description, sort, routine_steps(id, name, cue, seconds, sort)")
        .order("sort", { ascending: true });
      if (again.error) throw again.error;
      return sortSteps(again.data as Routine[]);
    }
    return sortSteps(data as Routine[]);
  },
});

function sortSteps(rows: Routine[]) {
  return rows.map((r) => ({ ...r, routine_steps: [...r.routine_steps].sort((a, b) => a.sort - b.sort) }));
}

async function seedDefaultRoutines() {
  const user = await uid();
  for (const [i, d] of DEFAULTS.entries()) {
    const { data, error } = await supabase
      .from("routines")
      .insert({ user_id: user, name: d.name, kind: d.kind, description: d.description, sort: i })
      .select("id")
      .single();
    if (error) throw error;
    const steps = d.steps.map((s, n) => ({ ...s, user_id: user, routine_id: data.id, sort: n }));
    const { error: e2 } = await supabase.from("routine_steps").insert(steps);
    if (e2) throw e2;
  }
}

export async function addRoutine(input: { name: string; kind: string; description: string | null; steps: { name: string; cue: string | null; seconds: number }[] }) {
  const user = await uid();
  const { data, error } = await supabase
    .from("routines")
    .insert({ user_id: user, name: input.name, kind: input.kind, description: input.description, sort: 99 })
    .select("id")
    .single();
  if (error) throw error;
  const rows = input.steps
    .filter((s) => s.name.trim())
    .map((s, n) => ({ user_id: user, routine_id: data.id, name: s.name.trim(), cue: s.cue, seconds: s.seconds, sort: n }));
  if (rows.length) {
    const { error: e2 } = await supabase.from("routine_steps").insert(rows);
    if (e2) throw e2;
  }
  return data.id;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw error;
}

export async function addStep(routineId: string, input: { name: string; cue: string | null; seconds: number; sort: number }) {
  const user = await uid();
  const { error } = await supabase.from("routine_steps").insert({ ...input, user_id: user, routine_id: routineId });
  if (error) throw error;
}

export async function updateStep(id: string, patch: { name?: string; cue?: string | null; seconds?: number }) {
  const { error } = await supabase.from("routine_steps").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStep(id: string) {
  const { error } = await supabase.from("routine_steps").delete().eq("id", id);
  if (error) throw error;
}

export async function logRoutine(routineId: string, name: string, seconds: number) {
  const user = await uid();
  const { error } = await supabase
    .from("routine_logs")
    .insert({ user_id: user, routine_id: routineId, name, seconds, date: todayISO() });
  if (error) throw error;
}

export const routineLogsQuery = queryOptions({
  queryKey: ["routine_logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("routine_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data;
  },
});

export function totalSeconds(steps: { seconds: number }[]) {
  return steps.reduce((s, x) => s + x.seconds, 0);
}
