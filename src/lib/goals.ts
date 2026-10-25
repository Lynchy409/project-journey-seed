import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";
import type { Pillar } from "./pillars";
import type { GoalTracking } from "./fitness-types";
import type { Json } from "@/integrations/supabase/types";
import { goalValue, loadFitnessHistory, object } from "./fitness";

export type Horizon = "vision" | "monthly" | "weekly";

export const HORIZONS: { value: Horizon; label: string; blurb: string }[] = [
  { value: "vision", label: "Long term", blurb: "Who you are becoming" },
  { value: "monthly", label: "Medium term", blurb: "This month" },
  { value: "weekly", label: "Short term", blurb: "This week" },
];

export const WEEKLY_LIMIT = 3;

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const tracked = data.filter(
      (g) => object(g.tracking)["mode"] && object(g.tracking)["mode"] !== "manual",
    );
    if (!tracked.length) return data;
    const history = await loadFitnessHistory();
    const { data: plans, error: planError } = await supabase.from("fitness_plans").select("*");
    if (planError) throw planError;
    return data.map((g) =>
      tracked.some((t) => t.id === g.id)
        ? {
            ...g,
            current_value: goalValue(object(g.tracking) as Partial<GoalTracking>, history, plans),
          }
        : g,
    );
  },
});

export async function addGoal(input: {
  title: string;
  pillar: Pillar;
  horizon: Horizon;
  metric: string | null;
  target_value: number | null;
  deadline: string | null;
  parent_id: string | null;
  tracking?: GoalTracking;
}) {
  const user = await uid();
  const { tracking, ...rest } = input;
  const { error } = await supabase.from("goals").insert({
    ...rest,
    ...(tracking ? { tracking: tracking as unknown as Json } : {}),
    user_id: user,
  });
  if (error) throw error;
}

export async function bumpGoal(id: string, current: number, by: number) {
  const { error } = await supabase
    .from("goals")
    .update({ current_value: Math.max(0, current + by) })
    .eq("id", id);
  if (error) throw error;
}

export async function setGoalValue(id: string, value: number) {
  const { error } = await supabase.from("goals").update({ current_value: value }).eq("id", id);
  if (error) throw error;
}

export async function setGoalStatus(id: string, status: "active" | "done" | "archived") {
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

export function progressPct(current: number, target: number | null) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
