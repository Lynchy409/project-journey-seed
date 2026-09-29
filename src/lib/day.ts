import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, iso, parseISO, todayISO } from "./dates";
import type { Pillar } from "./pillars";

export async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export type DayType = "work" | "off" | "rest";

export const DAY_TYPES: { value: DayType; label: string; cls: string }[] = [
  { value: "work", label: "Work", cls: "bg-learning-soft text-learning" },
  { value: "off", label: "Off", cls: "bg-trading-soft text-trading" },
  { value: "rest", label: "Rest", cls: "bg-life-soft text-life" },
];

export const SHIFT_COLORS: Record<string, string> = {
  amber: "bg-fitness-soft text-fitness",
  violet: "bg-life-soft text-life",
  indigo: "bg-learning-soft text-learning",
  rose: "bg-destructive/10 text-destructive",
  slate: "bg-secondary text-foreground",
};

const DEFAULT_SHIFTS = [
  { name: "Early", start_time: "06:00", end_time: "14:00", color: "amber", sort: 0 },
  { name: "Late", start_time: "14:00", end_time: "22:00", color: "violet", sort: 1 },
  { name: "Night", start_time: "22:00", end_time: "06:00", color: "indigo", sort: 2 },
  { name: "Long Day", start_time: "07:00", end_time: "19:30", color: "rose", sort: 3 },
];

const DEFAULT_TEMPLATES: { day_type: DayType; name: string; tasks: { title: string; pillar: Pillar; non_negotiable: boolean }[] }[] = [
  {
    day_type: "work",
    name: "Work day",
    tasks: [
      { title: "20 min Spanish", pillar: "learning", non_negotiable: true },
      { title: "Mobility 15 min", pillar: "fitness", non_negotiable: true },
      { title: "Hit protein target", pillar: "fitness", non_negotiable: true },
      { title: "Drink water target", pillar: "life", non_negotiable: true },
      { title: "No trading today", pillar: "trading", non_negotiable: false },
    ],
  },
  {
    day_type: "off",
    name: "Off day",
    tasks: [
      { title: "Full gym session or sprints", pillar: "fitness", non_negotiable: true },
      { title: "Trading session", pillar: "trading", non_negotiable: true },
      { title: "30+ min Spanish", pillar: "learning", non_negotiable: true },
      { title: "Journal one lesson", pillar: "life", non_negotiable: true },
    ],
  },
  {
    day_type: "rest",
    name: "Rest / Recovery",
    tasks: [
      { title: "Stretch 20 min", pillar: "fitness", non_negotiable: true },
      { title: "15 min Spanish", pillar: "learning", non_negotiable: true },
      { title: "Sleep 8 hours", pillar: "life", non_negotiable: true },
    ],
  },
];

/* ------------------------------- shift types ------------------------------ */

export const shiftTypesQuery = queryOptions({
  queryKey: ["shift_types"],
  queryFn: async () => {
    const user = await uid();
    const { data, error } = await supabase.from("shift_types").select("*").order("sort");
    if (error) throw error;
    if (data.length > 0) return data;
    const { data: seeded, error: e2 } = await supabase
      .from("shift_types")
      .insert(DEFAULT_SHIFTS.map((s) => ({ ...s, user_id: user })))
      .select("*");
    if (e2) throw e2;
    return seeded ?? [];
  },
});

export async function saveShiftType(input: { id?: string; name: string; start_time: string | null; end_time: string | null; color: string }) {
  const user = await uid();
  if (input.id) {
    const { error } = await supabase.from("shift_types").update({
      name: input.name, start_time: input.start_time, end_time: input.end_time, color: input.color,
    }).eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("shift_types").insert({ ...input, user_id: user });
  if (error) throw error;
}

export async function deleteShiftType(id: string) {
  const { error } = await supabase.from("shift_types").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- day entries ------------------------------ */

export function dayEntriesQuery(from: string, to: string) {
  return queryOptions({
    queryKey: ["day_entries", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("day_entries")
        .select("*")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return data;
    },
  });
}

export const dayEntryQuery = (date: string) =>
  queryOptions({
    queryKey: ["day_entry", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("day_entries").select("*").eq("date", date).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export async function setDay(date: string, day_type: DayType, shift_type_id: string | null) {
  const user = await uid();
  const { error } = await supabase
    .from("day_entries")
    .upsert({ user_id: user, date, day_type, shift_type_id }, { onConflict: "user_id,date" });
  if (error) throw error;
}

/* ------------------------------- templates -------------------------------- */

export const templatesQuery = queryOptions({
  queryKey: ["day_templates"],
  queryFn: async () => {
    const user = await uid();
    const load = async () => {
      const { data, error } = await supabase
        .from("day_templates")
        .select("*, template_tasks(*)")
        .order("day_type");
      if (error) throw error;
      return data.map((t) => ({
        ...t,
        template_tasks: [...t.template_tasks].sort((a, b) => a.sort - b.sort),
      }));
    };
    const existing = await load();
    if (existing.length > 0) return existing;
    for (const t of DEFAULT_TEMPLATES) {
      const { data: tpl, error } = await supabase
        .from("day_templates")
        .insert({ user_id: user, day_type: t.day_type, name: t.name })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("template_tasks").insert(
        t.tasks.map((task, i) => ({ ...task, user_id: user, template_id: tpl.id, sort: i })),
      );
      if (e2) throw e2;
    }
    return load();
  },
});

export async function addTemplateTask(template_id: string, title: string, pillar: Pillar, non_negotiable: boolean, sort: number) {
  const user = await uid();
  const { error } = await supabase
    .from("template_tasks")
    .insert({ user_id: user, template_id, title, pillar, non_negotiable, sort });
  if (error) throw error;
}

export async function deleteTemplateTask(id: string) {
  const { error } = await supabase.from("template_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleTemplateTaskNN(id: string, non_negotiable: boolean) {
  const { error } = await supabase.from("template_tasks").update({ non_negotiable }).eq("id", id);
  if (error) throw error;
}

/* -------------------------------- task logs ------------------------------- */

export const taskLogsQuery = (date: string) =>
  queryOptions({
    queryKey: ["task_logs", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_logs").select("*").eq("date", date);
      if (error) throw error;
      return data;
    },
  });

export async function toggleTask(args: {
  date: string;
  template_task_id: string;
  title: string;
  pillar: string;
  non_negotiable: boolean;
  done: boolean;
}) {
  const user = await uid();
  const { error } = await supabase.from("task_logs").upsert(
    { ...args, user_id: user },
    { onConflict: "user_id,date,template_task_id" },
  );
  if (error) throw error;
}

/* -------------------------------- momentum -------------------------------- */

export const momentumQuery = queryOptions({
  queryKey: ["momentum"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("momentum_days")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },
});

/** Recompute today's score and rolling momentum: yesterday * 0.8 + today * 0.2 */
export async function recomputeMomentum(date: string, dayScore: number) {
  const user = await uid();
  const { data: prev, error } = await supabase
    .from("momentum_days")
    .select("momentum,date")
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1);
  if (error) throw error;
  const prevMomentum = prev?.[0]?.momentum ?? 50;
  const momentum = Math.round(prevMomentum * 0.8 + dayScore * 0.2);
  const { error: e2 } = await supabase
    .from("momentum_days")
    .upsert({ user_id: user, date, day_score: dayScore, momentum }, { onConflict: "user_id,date" });
  if (e2) throw e2;
  return momentum;
}

/** True when the last logged day before today scored under 50. */
export function isComeback(rows: { date: string; day_score: number }[]) {
  const yesterday = iso(addDays(parseISO(todayISO()), -1));
  const y = rows.find((r) => r.date === yesterday);
  return !!y && y.day_score < 50;
}

/* -------------------------------- check-ins -------------------------------- */

export const checkinQuery = (date: string) =>
  queryOptions({
    queryKey: ["checkin", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("checkins").select("*").eq("date", date).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const checkinsQuery = queryOptions({
  queryKey: ["checkins"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .order("date", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data;
  },
});

export async function saveCheckin(date: string, values: Record<string, unknown>) {
  const user = await uid();
  const { error } = await supabase
    .from("checkins")
    .upsert({ user_id: user, date, ...values }, { onConflict: "user_id,date" });
  if (error) throw error;
}
