import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";

/* Accounts are stored in trades.source: "forexcom" | "spreadex" | "demo" | "challenge:<id>".
 * Legacy values "live" and "backtest" are still read. Cash P&L lives in further_levels.cash. */

export type AccountKind = "forexcom" | "spreadex" | "challenge" | "demo";
export const ACCOUNTS: { value: AccountKind; label: string }[] = [
  { value: "forexcom", label: "Forex.com" },
  { value: "spreadex", label: "Spreadex" },
  { value: "challenge", label: "Challenges" },
  { value: "demo", label: "Demo" },
];

type TradeLike = {
  source: string | null;
  further_levels: unknown;
  outcome: string;
  result_r: number | null;
  date: string;
  time_of_trade?: string | null;
  created_at: string;
};

export function accountOf(source: string | null): { kind: string; challengeId: string | null } {
  const s = source ?? "live";
  if (s.startsWith("challenge:")) return { kind: "challenge", challengeId: s.slice(10) };
  return { kind: s, challengeId: null };
}

export function accountLabel(source: string | null, challenges: Challenge[] = []): string {
  const { kind, challengeId } = accountOf(source);
  if (challengeId) return challenges.find((c) => c.id === challengeId)?.name ?? "Challenge";
  return ACCOUNTS.find((a) => a.value === kind)?.label ?? (kind === "live" ? "Live" : kind);
}

export function cashOf(t: { further_levels: unknown }): number | null {
  const fl = t.further_levels as { cash?: unknown } | null;
  const n = typeof fl?.cash === "number" ? fl.cash : Number(fl?.cash);
  return fl && fl.cash != null && fl.cash !== "" && Number.isFinite(n) ? n : null;
}

/** Oldest first, so the curve reads left to right. */
export function chronological<T extends TradeLike>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.time_of_trade ?? "").localeCompare(String(b.time_of_trade ?? "")) ||
      a.created_at.localeCompare(b.created_at),
  );
}

export type CurvePoint<T> = { trade: T; cash: number; total: number };

/** Running cash total, trade by trade. Open trades and trades without cash are skipped. */
export function equityCurve<T extends TradeLike>(rows: T[]): CurvePoint<T>[] {
  let total = 0;
  const out: CurvePoint<T>[] = [];
  for (const t of chronological(rows)) {
    const cash = cashOf(t);
    if (t.outcome === "open" || cash == null) continue;
    total = Math.round((total + cash) * 100) / 100;
    out.push({ trade: t, cash, total });
  }
  return out;
}

export function cashStats(rows: TradeLike[]) {
  const curve = equityCurve(rows);
  const closed = rows.filter((t) => t.outcome !== "open");
  const wins = closed.filter((t) => t.outcome === "win").length;
  const totalR = closed.reduce((s, t) => s + (t.result_r ?? 0), 0);
  return {
    trades: closed.length,
    winRate: closed.length ? Math.round((wins / closed.length) * 100) : 0,
    totalR: Math.round(totalR * 10) / 10,
    net: curve.at(-1)?.total ?? 0,
  };
}

export function money(n: number, currency = "GBP", signed = true): string {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  const abs = Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!signed) return `${n < 0 ? "−" : ""}${sym}${abs}`;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${sym}${abs}`;
}

/* -------------------------------- challenges ------------------------------- */

export type Challenge = {
  id: string;
  name: string;
  currency: string;
  startingBalance: number;
  profitTarget: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  rules: string;
};

export type ChallengeStatus = {
  balance: number;
  profit: number;
  targetPct: number;
  todayPnl: number;
  dailyBuffer: number;
  drawdownBuffer: number;
  level: "safe" | "caution" | "danger" | "breached" | "passed";
};

/** Uses the challenge rules: daily loss resets each day; max drawdown is measured from the start balance. */
export function challengeStatus(c: Challenge, rows: TradeLike[], today: string): ChallengeStatus {
  const curve = equityCurve(rows);
  const profit = curve.at(-1)?.total ?? 0;
  const todayPnl = curve.filter((p) => p.trade.date === today).reduce((s, p) => s + p.cash, 0);
  const dailyBuffer = c.maxDailyLoss + Math.min(0, todayPnl);
  const drawdownBuffer = c.maxDrawdown + Math.min(0, profit);
  const lowestDay = Math.min(0, ...dailyTotals(curve));
  const lowestTotal = Math.min(0, ...curve.map((p) => p.total));
  const used = Math.max(
    c.maxDailyLoss ? -Math.min(0, todayPnl) / c.maxDailyLoss : 0,
    c.maxDrawdown ? -Math.min(0, profit) / c.maxDrawdown : 0,
  );
  let level: ChallengeStatus["level"] =
    used >= 0.75 ? "danger" : used >= 0.4 ? "caution" : "safe";
  if (-lowestDay >= c.maxDailyLoss || -lowestTotal >= c.maxDrawdown) level = "breached";
  else if (profit >= c.profitTarget) level = "passed";
  return {
    balance: c.startingBalance + profit,
    profit,
    targetPct: c.profitTarget ? Math.max(0, Math.min(100, (profit / c.profitTarget) * 100)) : 0,
    todayPnl,
    dailyBuffer: Math.max(0, dailyBuffer),
    drawdownBuffer: Math.max(0, drawdownBuffer),
    level,
  };
}

function dailyTotals(curve: { trade: { date: string }; cash: number }[]): number[] {
  const m = new Map<string, number>();
  for (const p of curve) m.set(p.trade.date, (m.get(p.trade.date) ?? 0) + p.cash);
  return [...m.values()];
}

/* Challenges, trade-journal notes and read marks are stored as private journal rows
 * with internal entry types, so they sync across devices under the same row security. */
export const INTERNAL_ENTRY_TYPES = ["trade_challenge", "wisdom_read"] as const;

export const challengesQuery = queryOptions({
  queryKey: ["trade_challenges"],
  queryFn: async (): Promise<Challenge[]> => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id,text")
      .eq("entry_type", "trade_challenge")
      .order("created_at");
    if (error) throw error;
    return data.flatMap((r) => {
      try {
        return [{ ...(JSON.parse(r.text) as Omit<Challenge, "id">), id: r.id }];
      } catch {
        return [];
      }
    });
  },
});

export async function saveChallenge(c: Omit<Challenge, "id"> & { id?: string }) {
  const { id, ...body } = c;
  const text = JSON.stringify(body);
  if (id) {
    const { error } = await supabase.from("journal_entries").update({ text }).eq("id", id);
    if (error) throw error;
    return;
  }
  const user = await uid();
  const { error } = await supabase.from("journal_entries").insert({
    user_id: user,
    pillar: "trading",
    entry_type: "trade_challenge",
    text,
  });
  if (error) throw error;
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------ trade journal ------------------------------ */

export const NOTE_KINDS = [
  { value: "market_note", label: "Market", tone: "bg-trading-soft text-trading" },
  { value: "trade_thought", label: "Trades", tone: "bg-learning-soft text-learning" },
  { value: "backtest_idea", label: "Backtests", tone: "bg-life-soft text-life" },
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number]["value"];

export const tradeNotesQuery = queryOptions({
  queryKey: ["journal", "trade_notes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .in(
        "entry_type",
        NOTE_KINDS.map((k) => k.value),
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export async function addTradeNote(kind: NoteKind, text: string) {
  const user = await uid();
  const { error } = await supabase
    .from("journal_entries")
    .insert({ user_id: user, pillar: "trading", entry_type: kind, text });
  if (error) throw error;
}

/* ------------------------------- wisdom reads ------------------------------ */

export const wisdomReadsQuery = queryOptions({
  queryKey: ["wisdom_reads"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id,text")
      .eq("entry_type", "wisdom_read");
    if (error) throw error;
    return data;
  },
});

export async function setWisdomRead(itemId: string, read: boolean, existingId?: string) {
  if (!read) {
    if (!existingId) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", existingId);
    if (error) throw error;
    return;
  }
  const user = await uid();
  const { error } = await supabase
    .from("journal_entries")
    .insert({ user_id: user, pillar: "trading", entry_type: "wisdom_read", text: itemId });
  if (error) throw error;
}
