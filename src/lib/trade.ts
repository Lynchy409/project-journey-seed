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

/* ------------------------- structured trade detail ------------------------- */

export const SOURCES = [
  { value: "live", label: "Live" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
] as const;

export const SETUPS = [
  { value: "order_block", label: "Order block" },
  { value: "fvg", label: "Fair value gap" },
  { value: "bos", label: "Break of structure" },
  { value: "liquidity_draw", label: "Liquidity draw" },
  { value: "breaker", label: "Breaker" },
  { value: "range_play", label: "Range play" },
  { value: "other", label: "Other" },
] as const;

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

export const CONFIRMATIONS = [
  { value: "bos", label: "Break of structure" },
  { value: "choch", label: "Change of character" },
  { value: "fvg_fill", label: "FVG fill" },
  { value: "ob_tap", label: "Order block tap" },
  { value: "none", label: "None" },
] as const;

export type TrendCtx = { tf: string; direction: "bullish" | "bearish" | "range" };
export type Confluence = { type: string; tf: string; role: "context" | "entry" };
export type FurtherLevels = {
  sought: "yes" | "no" | "unknown";
  level: string;
  when: "during" | "after" | "";
};

export function durationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  if (mins === 0) return "<1m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

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
  const { error } = await supabase
    .from("bias_snapshots")
    .insert({ ...input, verdict, user_id: user });
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

/* ------------------------------ trading plan ------------------------------ */

export type TradingPlanRow = Database["public"]["Tables"]["trading_plans"]["Row"];
type TradingPlanInsert = Omit<Database["public"]["Tables"]["trading_plans"]["Insert"], "user_id">;

export const tradingPlanQuery = queryOptions({
  queryKey: ["trading_plan"],
  queryFn: async () => {
    const { data, error } = await supabase.from("trading_plans").select("*").limit(1);
    if (error) throw error;
    return data[0] ?? null;
  },
});

export async function saveTradingPlan(input: TradingPlanInsert) {
  const user = await uid();
  const { data: existing } = await supabase.from("trading_plans").select("id").limit(1);
  const { error } = existing?.length
    ? await supabase
        .from("trading_plans")
        .update({ ...input, user_id: user })
        .eq("id", existing[0]!.id)
    : await supabase.from("trading_plans").insert({ ...input, user_id: user });
  if (error) throw error;
}

/* -------------------------------- backtests -------------------------------- */

export type BacktestRow = Database["public"]["Tables"]["backtests"]["Row"];
type BacktestInsert = Omit<Database["public"]["Tables"]["backtests"]["Insert"], "user_id">;

export const backtestsQuery = queryOptions({
  queryKey: ["backtests"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("backtests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function addBacktest(input: BacktestInsert) {
  const user = await uid();
  const { error } = await supabase.from("backtests").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function deleteBacktest(id: string) {
  const { error } = await supabase.from("backtests").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------- market inspections ---------------------------- */

export type MarketInspectionRow = Database["public"]["Tables"]["market_inspections"]["Row"];
type MarketInspectionInsert = Omit<
  Database["public"]["Tables"]["market_inspections"]["Insert"],
  "user_id"
>;

export const marketInspectionsQuery = queryOptions({
  queryKey: ["market_inspections"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("market_inspections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function addMarketInspection(input: MarketInspectionInsert) {
  const user = await uid();
  const { error } = await supabase.from("market_inspections").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function deleteMarketInspection(id: string) {
  const { error } = await supabase.from("market_inspections").delete().eq("id", id);
  if (error) throw error;
}
