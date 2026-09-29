import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { uid } from "./day";
import type { Pillar } from "./pillars";

export type EntryType = "reflection" | "lesson" | "trade_review" | "session_note" | "weekly_review";

export const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: "reflection", label: "Reflection" },
  { value: "lesson", label: "Lesson" },
  { value: "trade_review", label: "Trade review" },
  { value: "session_note", label: "Session note" },
  { value: "weekly_review", label: "Weekly review" },
];

export const journalQuery = queryOptions({
  queryKey: ["journal"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const lessonsQuery = queryOptions({
  queryKey: ["lessons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("is_lesson", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function addEntry(input: {
  text: string;
  pillar: Pillar;
  entry_type: EntryType;
  date?: string;
  is_lesson?: boolean;
  goal_id?: string | null;
}) {
  const user = await uid();
  const { error } = await supabase.from("journal_entries").insert({
    user_id: user,
    text: input.text,
    pillar: input.pillar,
    entry_type: input.entry_type,
    is_lesson: input.is_lesson ?? input.entry_type === "lesson",
    goal_id: input.goal_id ?? null,
    ...(input.date ? { date: input.date } : {}),
  });
  if (error) throw error;
}

type JournalUpdate = Database["public"]["Tables"]["journal_entries"]["Update"];

export async function updateEntry(id: string, patch: JournalUpdate) {
  const { error } = await supabase.from("journal_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

/** Pick one lesson to resurface, preferring today's pillars and pinned entries. */
export function pickLesson<T extends { pillar: string; pinned: boolean }>(lessons: T[], pillars: string[]) {
  if (lessons.length === 0) return undefined;
  const pool = lessons.filter((l) => pillars.includes(l.pillar));
  const list = pool.length > 0 ? pool : lessons;
  const pinned = list.filter((l) => l.pinned);
  const source = pinned.length > 0 ? pinned : list;
  const index = new Date().getDate() % source.length;
  return source[index];
}
