import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";

export type MatchPair = { id: string; left_text: string; right_text: string; sort: number };
export type MatchDeck = { id: string; name: string; subject: string; description: string | null; mode: string; match_pairs: MatchPair[] };

const DEFAULT_DECKS: { name: string; subject: string; description: string; pairs: [string, string][] }[] = [
  {
    name: "Spanish cognate patterns",
    subject: "spanish",
    description: "English endings and their Spanish twins. Learn the pattern, unlock thousands of words.",
    pairs: [
      ["-tion", "-ción"],
      ["-ity", "-idad"],
      ["-ment", "-mento"],
      ["-ous", "-oso"],
      ["-ary", "-ario"],
      ["-ent", "-ente"],
      ["-ance", "-ancia"],
      ["-ic", "-ico"],
    ],
  },
  {
    name: "Spanish starter words",
    subject: "spanish",
    description: "Everyday words to warm up on.",
    pairs: [
      ["la meta", "the goal"],
      ["el esfuerzo", "the effort"],
      ["el descanso", "the rest"],
      ["fuerte", "strong"],
      ["el hábito", "the habit"],
      ["todos los días", "every day"],
    ],
  },
];

const SELECT = "id, name, subject, description, mode, match_pairs(id, left_text, right_text, sort)";

export const decksQuery = queryOptions({
  queryKey: ["match_decks"],
  queryFn: async (): Promise<MatchDeck[]> => {
    const { data, error } = await supabase.from("match_decks").select(SELECT).order("created_at", { ascending: true });
    if (error) throw error;
    if (!data.length) {
      await seedDefaultDecks();
      const again = await supabase.from("match_decks").select(SELECT).order("created_at", { ascending: true });
      if (again.error) throw again.error;
      return sortPairs(again.data as MatchDeck[]);
    }
    return sortPairs(data as MatchDeck[]);
  },
});

function sortPairs(rows: MatchDeck[]) {
  return rows.map((d) => ({ ...d, match_pairs: [...d.match_pairs].sort((a, b) => a.sort - b.sort) }));
}

async function seedDefaultDecks() {
  const user = await uid();
  for (const d of DEFAULT_DECKS) {
    const { data, error } = await supabase
      .from("match_decks")
      .insert({ user_id: user, name: d.name, subject: d.subject, description: d.description })
      .select("id")
      .single();
    if (error) throw error;
    const rows = d.pairs.map(([l, r], n) => ({ user_id: user, deck_id: data.id, left_text: l, right_text: r, sort: n }));
    const { error: e2 } = await supabase.from("match_pairs").insert(rows);
    if (e2) throw e2;
  }
}

export async function addDeck(input: { name: string; subject: string; description: string | null; mode?: string; pairs: { left: string; right: string }[] }) {
  const user = await uid();
  const { data, error } = await supabase
    .from("match_decks")
    .insert({ user_id: user, name: input.name, subject: input.subject, description: input.description, mode: input.mode ?? "match" })
    .select("id")
    .single();
  if (error) throw error;
  const rows = input.pairs
    .filter((p) => p.left.trim() && p.right.trim())
    .map((p, n) => ({ user_id: user, deck_id: data.id, left_text: p.left.trim(), right_text: p.right.trim(), sort: n }));
  if (rows.length) {
    const { error: e2 } = await supabase.from("match_pairs").insert(rows);
    if (e2) throw e2;
  }
  return data.id;
}

export async function deleteDeck(id: string) {
  const { error } = await supabase.from("match_decks").delete().eq("id", id);
  if (error) throw error;
}

export async function addPair(deckId: string, left: string, right: string, sort: number) {
  const user = await uid();
  const { error } = await supabase
    .from("match_pairs")
    .insert({ user_id: user, deck_id: deckId, left_text: left.trim(), right_text: right.trim(), sort });
  if (error) throw error;
}

export async function deletePair(id: string) {
  const { error } = await supabase.from("match_pairs").delete().eq("id", id);
  if (error) throw error;
}

export async function saveScore(input: { deck_id: string; seconds: number; accuracy: number; pairs: number; mode?: string }) {
  const user = await uid();
  const { error } = await supabase.from("match_scores").insert({ ...input, user_id: user });
  if (error) throw error;
}

export const scoresQuery = queryOptions({
  queryKey: ["match_scores"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("match_scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});

export function bestFor(scores: { deck_id: string | null; seconds: number; accuracy: number }[], deckId: string) {
  const mine = scores.filter((s) => s.deck_id === deckId);
  if (!mine.length) return null;
  const best = mine.reduce((a, b) => (Number(b.seconds) < Number(a.seconds) ? b : a));
  return { seconds: Number(best.seconds), accuracy: best.accuracy, plays: mine.length };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i]!;
    a[i] = a[j]!;
    a[j] = ai;
  }
  return a;
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = (s % 60).toFixed(1);
  return m > 0 ? `${m}:${r.padStart(4, "0")}` : `${r}s`;
}

/** Best streak recorded for a quiz deck (streak stored in `pairs`). */
export function bestStreak(scores: { deck_id: string | null; pairs: number; mode?: string }[], deckId: string) {
  return scores.filter((s) => s.deck_id === deckId && s.mode === "quiz").reduce((m, s) => Math.max(m, s.pairs), 0);
}

/** Lenient typed-answer check: case, accents, punctuation and extra spaces ignored. */
export function normalizeAnswer(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
}
