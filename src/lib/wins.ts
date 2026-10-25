import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";
import { todayISO } from "./dates";
import type { Pillar } from "./pillars";

export type Win = { id: string; title: string; pillar: string; minutes: number; cue: string | null; sort: number };

export const DEFAULT_WINS: { title: string; pillar: Pillar; minutes: number; cue: string }[] = [
  { title: "Horse stance hold", pillar: "fitness", minutes: 2, cue: "Feet wide, thighs parallel, chest proud, knees pushed out." },
  { title: "10 min stretch", pillar: "fitness", minutes: 10, cue: "Hips, lower back, hamstrings. Breathe slow." },
  { title: "Wrist rehab", pillar: "fitness", minutes: 5, cue: "CARs, flexor and extensor stretch, light curls." },
  { title: "Shoulder rehab", pillar: "fitness", minutes: 5, cue: "Band pull-aparts, external rotations, wall slides." },
  { title: "Neck isometrics", pillar: "fitness", minutes: 3, cue: "Learn technique first; record controlled practice and stop for pain, tingling or dizziness." },
  { title: "Dead hang", pillar: "fitness", minutes: 2, cue: "Record a comfortable grip, assistance and actual continuous hold. Stop for pain." },
  { title: "Couch stretch", pillar: "fitness", minutes: 4, cue: "2 min each side. Squeeze the back glute." },
  { title: "Calisthenics set", pillar: "fitness", minutes: 5, cue: "Push-ups, squats, pull-ups. Quality reps." },
  { title: "Bag training", pillar: "fitness", minutes: 10, cue: "3 x 2 min rounds. Hands up, move feet." },
  { title: "15 min walk", pillar: "fitness", minutes: 15, cue: "Phone in pocket. Daylight if you can." },
  { title: "Run", pillar: "fitness", minutes: 15, cue: "Easy pace. Nose breathing." },
  { title: "Yoga flow", pillar: "fitness", minutes: 10, cue: "Slow, steady, breath-led." },
  { title: "Legs up the wall", pillar: "fitness", minutes: 5, cue: "Optional comfortable rest position; record how it felt." },
  { title: "Study one textbook trade", pillar: "trading", minutes: 5, cue: "One trade where all 4 timeframes agreed. What did you see?" },
  { title: "Backtest 10 setups", pillar: "trading", minutes: 15, cue: "Same strategy, same rules. Log the R." },
  { title: "Read a pinned lesson", pillar: "trading", minutes: 2, cue: "Read it out loud." },
  { title: "Language Transfer track", pillar: "learning", minutes: 10, cue: "One track. Speak the answers out loud." },
  { title: "Spanish monologue", pillar: "learning", minutes: 3, cue: "Describe what you're doing, in Spanish, out loud." },
  { title: "Chess puzzles", pillar: "learning", minutes: 5, cue: "3 puzzles. Calculate before you move." },
  { title: "Learn from someone", pillar: "learning", minutes: 10, cue: "A podcast or talk from someone ahead of you." },
  { title: "Learn something new", pillar: "learning", minutes: 10, cue: "One new idea. Write one line about it." },
  { title: "Read 10 pages", pillar: "life", minutes: 10, cue: "A real book, not a screen." },
  { title: "Pray", pillar: "life", minutes: 3, cue: "Thanks, ask for discipline, set your standard." },
  { title: "Meditate", pillar: "life", minutes: 5, cue: "Eyes closed. Count breaths to 10, repeat." },
  { title: "Write one page", pillar: "life", minutes: 5, cue: "Thoughts, ideas, plans. Just write." },
  { title: "Time with family", pillar: "life", minutes: 15, cue: "Phone away. Be present." },
  { title: "Help somebody", pillar: "life", minutes: 5, cue: "A favour, a message, a hand." },
  { title: "Check in on a mate", pillar: "life", minutes: 1, cue: "One genuine text." },
  { title: "Reset the room", pillar: "life", minutes: 5, cue: "Bed, desk, floor. Clear space, clear head." },
  { title: "Daylight outside", pillar: "life", minutes: 10, cue: "Get outside within an hour of waking." },
];

export const winsQuery = queryOptions({
  queryKey: ["little_wins"],
  queryFn: async (): Promise<Win[]> => {
    const { data, error } = await supabase.from("little_wins").select("*").order("sort");
    if (error) throw error;
    if (data.length) return data;
    const user = await uid();
    const { data: seeded, error: e2 } = await supabase
      .from("little_wins")
      .insert(DEFAULT_WINS.map((w, i) => ({ ...w, user_id: user, sort: i })))
      .select("*");
    if (e2) throw e2;
    return seeded.sort((a, b) => a.sort - b.sort);
  },
});

export const winLogsQuery = queryOptions({
  queryKey: ["win_logs"],
  queryFn: async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data, error } = await supabase.from("win_logs").select("*").gte("date", since).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function logWin(w: Win) {
  const user = await uid();
  const { error } = await supabase.from("win_logs").insert({ user_id: user, win_id: w.id, title: w.title, pillar: w.pillar, date: todayISO() });
  if (error) throw error;
}

export async function undoWin(logId: string) {
  const { error } = await supabase.from("win_logs").delete().eq("id", logId);
  if (error) throw error;
}

export async function addWin(input: { title: string; pillar: string; minutes: number; cue: string | null; sort: number }) {
  const user = await uid();
  const { error } = await supabase.from("little_wins").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function deleteWin(id: string) {
  const { error } = await supabase.from("little_wins").delete().eq("id", id);
  if (error) throw error;
}
