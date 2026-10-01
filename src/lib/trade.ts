import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { uid } from "./day";

export const STRATEGIES = [
  { value: "all_tf_aligned", label: "All timeframes aligned" },
  { value: "one_min", label: "1 min entry" },
  { value: "htf_draw", label: "HTF draw on liquidity" },
] as const;

export const OUTCOMES = ["open", "win", "loss", "breakeven"] as const;

const DEFAULT_RULES = [
  "Only trade my two setups: all timeframes aligned, or HTF draw on liquidity.",
  "No entry without a 1 min break of structure when the setup calls for it.",
  "Check for HTF liquidity resting above or below before entering.",
  "Be wary of price structure breaks against me.",
  "Log every trade with entry, stop, target, RR, screenshot and emotions.",
  "Walk away after my daily loss limit. No revenge trades.",
];

export const tradeRulesQuery = queryOptions({
  queryKey: ["trade_rules"],
  queryFn: async () => {
    const user = await uid();
    const { data, error } = await supabase.from("trade_rules").select("*").order("sort");
    if (error) throw error;
    if (data.length > 0) return data;
    const { data: seeded, error: e2 } = await supabase
      .from("trade_rules")
      .insert(DEFAULT_RULES.map((text, sort) => ({ text, sort, user_id: user })))
      .select("*");
    if (e2) throw e2;
    return seeded ?? [];
  },
});

export async function addRule(text: string, sort: number) {
  const user = await uid();
  const { error } = await supabase.from("trade_rules").insert({ text, sort, user_id: user });
  if (error) throw error;
}

export async function deleteRule(id: string) {
  const { error } = await supabase.from("trade_rules").delete().eq("id", id);
  if (error) throw error;
}

export const tradesQuery = queryOptions({
  queryKey: ["trades"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export type TradeRow = Database["public"]["Tables"]["trades"]["Row"];
type TradeInsert = Omit<Database["public"]["Tables"]["trades"]["Insert"], "user_id">;
type TradeUpdate = Database["public"]["Tables"]["trades"]["Update"];

export async function addTrade(input: TradeInsert) {
  const user = await uid();
  const { error } = await supabase.from("trades").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function updateTrade(id: string, patch: TradeUpdate) {
  const { error } = await supabase.from("trades").update(patch).eq("id", id);
  if (error) throw error;
}

/** Uploads a chart screenshot to private storage and returns a long-lived signed link. */
export async function uploadTradeScreenshot(file: File): Promise<string> {
  const user = await uid();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "screenshot.jpg";
  const path = `${user}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage
    .from("trade-screenshots")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (urlError || !data) throw urlError ?? new Error("Could not get image link");
  return data.signedUrl;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------- bias ---------------------------------- */

export type Trend = "bullish" | "bearish" | "range";

export const TRENDS: { value: Trend; label: string }[] = [
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
  { value: "range", label: "Ranging" },
];

export type BiasInput = { tf_4h: Trend; tf_1h: Trend; tf_15m: Trend; tf_5m: Trend };

export type BiasResult = {
  level: "strong" | "partial" | "wait";
  headline: string;
  strategy: string;
  steps: string[];
};

export function computeBias({ tf_4h, tf_1h, tf_15m, tf_5m }: BiasInput): BiasResult {
  const directional = (t: Trend) => t === "bullish" || t === "bearish";
  const lowerAligned = tf_1h === tf_15m && tf_15m === tf_5m && directional(tf_1h);
  const allAligned = lowerAligned && tf_4h === tf_1h;
  const dir = tf_1h === "bullish" ? "long" : "short";

  if (allAligned) {
    return {
      level: "strong",
      headline: `A+ setup — everything is ${tf_1h}`,
      strategy: "All timeframes aligned → find the entry on the 1 min",
      steps: [
        `Bias is ${dir}. Only look for ${dir} entries.`,
        "Drop to the 1 min and wait for your entry trigger.",
        "Check no high timeframe liquidity is resting against you.",
        "Set stop beyond structure, target the next draw on liquidity.",
      ],
    };
  }

  if (lowerAligned) {
    return {
      level: "partial",
      headline: `Partial alignment — 1h, 15m and 5m are ${tf_1h}`,
      strategy: "Lower timeframes aligned, 4h disagrees → intuition call",
      steps: [
        `Only take this ${dir} if you are genuinely confident in the entry.`,
        "The 4h is against you, so expect less room. Take profit earlier.",
        "If the entry is not obvious, skip it. No forcing.",
      ],
    };
  }

  return {
    level: "wait",
    headline: "No alignment — be patient",
    strategy: "Wait for a high timeframe draw on liquidity",
    steps: [
      "Mark the high timeframe draw on liquidity first.",
      "Enter off a 1 min break of structure, if applicable.",
      "It may not apply if other HTF liquidity is resting above or below.",
      "Be wary of price structure breaks against your idea.",
    ],
  };
}

export const biasHistoryQuery = queryOptions({
  queryKey: ["bias_snapshots"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bias_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },
});

export async function saveBias(input: BiasInput, verdict: string) {
  const user = await uid();
  const { error } = await supabase.from("bias_snapshots").insert({ ...input, verdict, user_id: user });
  if (error) throw error;
}

export function tradeStats(rows: { outcome: string; result_r: number | null }[]) {
  const closed = rows.filter((t) => t.outcome !== "open");
  const wins = closed.filter((t) => t.outcome === "win").length;
  const totalR = closed.reduce((s, t) => s + (t.result_r ?? 0), 0);
  return {
    count: rows.length,
    closed: closed.length,
    winRate: closed.length ? Math.round((wins / closed.length) * 100) : 0,
    totalR: Math.round(totalR * 10) / 10,
  };
}
