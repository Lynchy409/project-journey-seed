import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, iso } from "./dates";
import { uid } from "./day";

export const studySessionsQuery = queryOptions({
  queryKey: ["study_sessions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .order("date", { ascending: false })
      .limit(90);
    if (error) throw error;
    return data;
  },
});

export async function addStudySession(input: { date: string; minutes: number; kind: string; notes: string | null }) {
  const user = await uid();
  const { error } = await supabase.from("study_sessions").insert({ ...input, user_id: user });
  if (error) throw error;
}

export const flashcardsQuery = queryOptions({
  queryKey: ["flashcards"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .order("due_on", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export async function addCard(input: { deck: string; front: string; back: string }) {
  const user = await uid();
  const { error } = await supabase.from("flashcards").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) throw error;
}

const INTERVALS = [1, 2, 4, 8, 16, 32];

/** Leitner-style scheduling: right moves the card up a box, wrong sends it back to box 1. */
export async function reviewCard(id: string, box: number, correct: boolean) {
  const nextBox = correct ? Math.min(6, box + 1) : 1;
  const days = INTERVALS[nextBox - 1] ?? 1;
  const { error } = await supabase
    .from("flashcards")
    .update({ box: nextBox, due_on: iso(addDays(new Date(), days)) })
    .eq("id", id);
  if (error) throw error;
}

export function minutesThisWeek(rows: { date: string; minutes: number }[]) {
  const since = iso(addDays(new Date(), -6));
  return rows.filter((r) => r.date >= since).reduce((s, r) => s + r.minutes, 0);
}
