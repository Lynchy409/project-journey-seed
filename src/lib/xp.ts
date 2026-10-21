import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** XP needed to go from level n to n+1. L1→2: 250, L2→3: 350, L3→4: 500, then +150 per level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 250;
  if (level === 2) return 350;
  return 500 + (level - 3) * 150;
}

export function levelFromXp(total: number) {
  let level = 1;
  let remaining = Math.max(0, total);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, into: remaining, needed: xpForLevel(level) };
}

export const RANKS = [
  { min: 50, label: "Legend" },
  { min: 35, label: "Master" },
  { min: 20, label: "Elite" },
  { min: 10, label: "Operator" },
  { min: 5, label: "Contender" },
  { min: 1, label: "Rookie" },
];

export function rankFor(level: number) {
  return RANKS.find((r) => level >= r.min)!.label;
}

/** Trading outcomes are stored as an evidence prefix on the "trading" driver. */
export type TradeOutcome = "executed" | "patient" | "breach";
export const OUTCOMES: { key: TradeOutcome; label: string; emoji: string; cls: string }[] = [
  { key: "executed", label: "Executed", emoji: "🟢", cls: "bg-trading text-primary-foreground" },
  { key: "patient", label: "Patient · no setup", emoji: "🔵", cls: "bg-learning text-primary-foreground" },
  { key: "breach", label: "Rule breach", emoji: "🔴", cls: "bg-destructive text-destructive-foreground" },
];

export function parseOutcome(evidence: string): { outcome: TradeOutcome | null; note: string } {
  const m = /^\[(executed|patient|breach)\]\s*(.*)$/s.exec(evidence);
  return m ? { outcome: m[1] as TradeOutcome, note: m[2] ?? "" } : { outcome: null, note: evidence };
}

export const allDriverLogsQuery = queryOptions({
  queryKey: ["driver_logs", "all"],
  queryFn: async () => {
    const { data, error } = await supabase.from("driver_logs").select("date, driver_key, evidence").order("date");
    if (error) throw error;
    return data;
  },
});
