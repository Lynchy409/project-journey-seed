import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, iso, startOfWeek } from "./dates";
import { uid } from "./day";

export type InnerKind = "curiosity" | "quest";

export const innerItemsQuery = queryOptions({
  queryKey: ["inner_items"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("inner_items")
      .select("*")
      .order("date", { ascending: true, nullsFirst: false })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export type InnerItem = NonNullable<Awaited<ReturnType<typeof innerItemsQuery.queryFn>>>[number];

export async function addInnerItems(rows: { kind: InnerKind; title: string; skill?: string | null; date?: string | null; sort?: number }[]) {
  const user = await uid();
  const { error } = await supabase.from("inner_items").insert(
    rows.map((r) => ({ user_id: user, kind: r.kind, title: r.title, skill: r.skill ?? null, date: r.date ?? null, sort: r.sort ?? 0 })),
  );
  if (error) throw error;
}

export async function toggleInnerItem(id: string, done: boolean) {
  const { error } = await supabase.from("inner_items").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteInnerItem(id: string) {
  const { error } = await supabase.from("inner_items").delete().eq("id", id);
  if (error) throw error;
}

export async function promoteCuriosity(id: string) {
  const { error } = await supabase.from("inner_items").update({ done: true }).eq("id", id);
  if (error) throw error;
}

export function weekRange(now = new Date()) {
  const start = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => iso(addDays(start, i)));
}

/** 7-day micro-curriculum template for any skill. */
export function sprintPlan(skill: string) {
  return [
    `Learn the basics of ${skill} — 15 min overview`,
    `Find one great source on ${skill} (video, book, expert)`,
    `First practice of ${skill} — 20 min hands-on`,
    `Apply ${skill} in real life once today`,
    `Spot your weak point in ${skill} and drill it`,
    `Practise ${skill} again — try a harder version`,
    `Teach it back: write 3 sentences on what you learned about ${skill}`,
  ];
}

export const LIFE_QUESTS = [
  "Visit or call family",
  "10 min meditation",
  "15 min yoga",
  "Read 10 pages",
  "Write one page of notes",
];

export const SKILL_IDEAS = [
  "Speed reading",
  "Stoic philosophy",
  "Negotiation",
  "Public speaking",
  "Cooking a new healthy meal",
  "Kicking technique (fullback)",
  "Personal finance & investing",
  "Memory techniques",
  "Body language",
  "Basic first aid",
  "Spanish slang & phrases",
  "Sleep science",
  "Touch typing",
  "Chess tactics",
  "Photography basics",
];

export const PROMPTS = [
  "Where did impatience or ego try to steer my decisions today?",
  "What is one uncomfortable task I keep postponing — and why?",
  "Who in my family haven't I checked in with lately?",
  "What would the best version of me do differently tomorrow?",
  "What am I grateful for right now, and why does it matter?",
  "What did I learn this week that changed how I think?",
  "Where did I keep my word to myself today?",
  "What drains my energy that I could cut out?",
  "What is one belief that's holding me back?",
  "If I finished everything I started, what would my life look like in a year?",
  "What made me proud today, however small?",
  "What would I tell my younger self about discipline?",
];

export function pick<T>(arr: readonly T[], n: number, seed = Date.now()) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a.slice(0, n);
}

export const RANKS = ["Rookie", "Apprentice", "Seeker", "Builder", "Warrior", "Strategist", "Sage", "Master"];
export function levelFor(doneCount: number) {
  const xp = doneCount * 10;
  const level = Math.floor(xp / 100) + 1;
  return { xp, level, into: xp % 100, rank: RANKS[Math.min(level - 1, RANKS.length - 1)] ?? "Master" };
}
