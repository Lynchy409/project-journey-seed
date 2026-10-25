import { supabase } from "@/integrations/supabase/client";
import { addDays, iso, parseISO, todayISO } from "./dates";
import type { Json } from "@/integrations/supabase/types";
import type {
  DailySpanishTask,
  RuleMistake,
  SpanishActivity,
  SpanishItem,
  SpanishKind,
  SpanishProfile,
} from "./spanish-types";
import type { SpanishAIResponse } from "./spanish-ai";

export const spanishQueryKey = ["spanish", "items"] as const;
export const spanishItemsQuery = {
  queryKey: spanishQueryKey,
  queryFn: async (): Promise<SpanishItem[]> => {
    const all: SpanishItem[] = [];
    for (let page = 0; page < 100; page++) {
      const { data, error } = await supabase
        .from("spanish_items")
        .select("*")
        .order("id")
        .range(page * 500, page * 500 + 499);
      if (error) throw new Error(spanishError(error));
      all.push(...data);
      if (data.length < 500) return all;
    }
    throw new Error("Spanish history is too large to load safely. No data has been removed.");
  },
};
export const spanishActivitiesQuery = {
  queryKey: ["spanish", "activities", todayISO()],
  queryFn: async (): Promise<SpanishActivity[]> => {
    const { data, error } = await supabase
      .from("spanish_activities")
      .select("*")
      .gte("date", iso(addDays(new Date(), -90)))
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(spanishError(error));
    return data;
  },
};
export function spanishError(error: { message: string; code?: string }) {
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache|does not exist/i.test(error.message)
  )
    return "Spanish database update is not installed yet. Apply the Spanish migration in this app's Lovable database; your existing data is unchanged.";
  return error.message;
}
export function itemData<T>(item: SpanishItem): T {
  return item.data as unknown as T;
}
export function findSpanish(items: SpanishItem[], kind: SpanishKind, key: string) {
  return items.find((item) => item.kind === kind && item.key === key);
}
export async function saveSpanish(
  kind: SpanishKind,
  key: string,
  data: object,
  previous?: SpanishItem,
): Promise<SpanishItem> {
  const { data: saved, error } = await supabase.rpc("put_spanish_item", {
    p_id: previous?.id ?? crypto.randomUUID(),
    p_kind: kind,
    p_key: key,
    p_data: JSON.parse(JSON.stringify(data)) as Json,
    p_revision: previous?.revision ?? 0,
  });
  if (error) throw new Error(spanishError(error));
  if (!saved?.[0])
    throw new Error("The server did not confirm this save. Your input has been kept.");
  return saved[0];
}
export async function recordSpanishActivity(input: {
  id: string;
  date: string;
  kind: string;
  seconds?: number;
  task?: SpanishItem;
  evidence: object;
}) {
  const { error } = await supabase.rpc("record_spanish_activity", {
    p_id: input.id,
    p_date: input.date,
    p_kind: input.kind,
    p_seconds: Math.round(input.seconds ?? 0),
    p_data: JSON.parse(JSON.stringify(input.evidence)) as Json,
    ...(input.task ? { p_task_id: input.task.id } : {}),
  });
  if (error) throw new Error(spanishError(error));
}
export const DEFAULT_SPANISH_PROFILE: SpanishProfile = {
  goal: "Hold natural conversations and understand everyday Spanish",
  variety: "No preference",
  interests: "",
  lt_start: 1,
  workload: 25,
  skills: { listening: 1, interaction: 1, expression: 1, reading: 1 },
  notes: "",
};
export const CAN_DO = [
  {
    id: "listening",
    title: "Listening",
    steps: [
      "Catch the main idea of clear familiar audio",
      "Follow the main points of natural conversations",
      "Follow extended speech and explain implied meaning",
    ],
  },
  {
    id: "interaction",
    title: "Conversation",
    steps: [
      "Handle familiar exchanges and ask follow-up questions",
      "Sustain an unprepared conversation and repair misunderstandings",
      "Express nuance and negotiate unfamiliar situations",
    ],
  },
  {
    id: "expression",
    title: "Speaking and writing",
    steps: [
      "Link ideas about personal experiences",
      "Explain reasons, tell a story and compare viewpoints",
      "Give a structured, nuanced account using varied language",
    ],
  },
  {
    id: "reading",
    title: "Reading",
    steps: [
      "Find main points in familiar practical texts",
      "Understand articles and distinguish facts from opinion",
      "Interpret longer, complex texts and implicit attitudes",
    ],
  },
] as const;
export function spanishAbility(profile: SpanishProfile) {
  return `Uncertified self-selected next challenges: ${CAN_DO.map((skill) => `${skill.title}: ${skill.steps[profile.skills[skill.id] ?? 1] ?? skill.steps[1]}`).join("; ")}. Learner notes: ${profile.notes}`.slice(
    0,
    2000,
  );
}
export function dueRules(items: SpanishItem[], date = todayISO()) {
  return items
    .filter(
      (item) =>
        item.kind === "mistake" &&
        !itemData<RuleMistake>(item).dismissed &&
        itemData<RuleMistake>(item).due <= date,
    )
    .sort(
      (a, b) =>
        itemData<RuleMistake>(a).box - itemData<RuleMistake>(b).box ||
        itemData<RuleMistake>(a).due.localeCompare(itemData<RuleMistake>(b).due),
    );
}
export function reviewRule(rule: RuleMistake, passed: boolean, date = todayISO()): RuleMistake {
  const box = passed ? Math.min(5, rule.box + 1) : 0;
  return { ...rule, box, due: iso(addDays(parseISO(date), [1, 2, 4, 8, 16, 30][box] ?? 1)) };
}
export function isRuleWorthSaving(rule: {
  confidence: number;
  category: string;
  rule_id: string;
  original: string;
  corrected: string;
}) {
  return (
    rule.confidence >= 0.9 &&
    rule.category !== "typo" &&
    rule.category !== "style" &&
    rule.original.trim() !== rule.corrected.trim() &&
    /^[a-z][a-z0-9_-]{2,79}$/.test(rule.rule_id)
  );
}
export function mergeSpanishRule(
  old: (RuleMistake & { occurrences?: string[] }) | null,
  suggestion: SpanishAIResponse["rules"][number],
  occurrence: string,
  date = todayISO(),
) {
  return {
    ...old,
    ...suggestion,
    source: "AI-generated correction; review it and dismiss if questionable.",
    count: (old?.count ?? 0) + 1,
    box: 0,
    due: date,
    dismissed: old?.dismissed ?? false,
    occurrences: [...(old?.occurrences ?? []), occurrence].slice(-100),
  };
}
export function dailySpanishTasks(
  profile: SpanishProfile,
  items: SpanishItem[],
  date = todayISO(),
): DailySpanishTask[] {
  const day = Math.floor(parseISO(date).getTime() / 86400000);
  const due = dueRules(items, date).length;
  const interests = profile.interests.trim() || "daily life";
  const weakest = CAN_DO.reduce((a, b) =>
    (profile.skills[a.id] ?? 1) <= (profile.skills[b.id] ?? 1) ? a : b,
  );
  const output =
    day % 2
      ? "Explain a recent event, then answer four follow-up questions"
      : `Handle a situation about ${interests.slice(0, 70)} across four replies`;
  const tasks: Omit<DailySpanishTask, "date" | "status">[] = [
    {
      action: "listen",
      title: "Finish one listening item and save three key points",
      target: `${listeningGuidance(items)} Resume your official course position or choose audio about ${interests.slice(0, 70)}. Summarise its meaning in your own words.`,
      minutes: 10,
    },
    {
      action: "conversation",
      title: output,
      target: `Work towards: ${profile.goal.slice(0, 180)}. Focus on ${weakest.title.toLowerCase()}; valid regional alternatives count.`,
      minutes: 8,
    },
    due
      ? {
          action: "review",
          title: `Practise ${Math.min(3, due)} due grammar ${due === 1 ? "rule" : "rules"} with fresh examples`,
          target:
            "Explain the meaning and produce a new response. Successful rules return later; uncertain grading does not count as failure.",
          minutes: 7,
        }
      : {
          action: "practice",
          title:
            day % 3 === 0
              ? "Retell a short text in your own Spanish"
              : day % 3 === 1
                ? "Build a meaningful response to a new situation"
                : "Compare two options and justify your choice",
          target: `Use material about ${interests.slice(0, 70)} that is challenging but understandable. Target ${weakest.title.toLowerCase()}.`,
          minutes: 7,
        },
  ];
  return tasks.map((task) => ({ ...task, date, status: "planned" }));
}
export function listeningGuidance(items: SpanishItem[]) {
  const latest = items
    .filter((item) => item.kind === "content" && (item.data as { feedback?: string }).feedback)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const feedback = (latest?.data as { feedback?: string } | undefined)?.feedback;
  return feedback === "Too hard"
    ? "Your last rating was too hard: choose a clearer, shorter or transcript-supported item before increasing difficulty."
    : feedback === "Too easy"
      ? "Your last rating was too easy: try a less-supported item or a more detailed retelling, changing one difficulty at a time."
      : feedback === "Right challenge"
        ? "Your last rating was a good challenge: continue with similar material, then test a fresh example."
        : "Try a short sample first; choose material whose main meaning you can follow.";
}
export function spanishDoneForDate(items: SpanishItem[], date: string) {
  const tasks = items.filter(
    (item) => item.kind === "task" && itemData<DailySpanishTask>(item).date === date,
  );
  return (
    tasks.length > 0 && tasks.every((task) => itemData<DailySpanishTask>(task).status === "done")
  );
}
export function safeSpanishURL(input: string): string | null {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export const SPANISH_SOURCES = {
  cefr: "https://www.coe.int/en/web/common-european-framework-reference-languages/table-2-cefr-3.3-common-reference-levels-self-assessment-grid",
  strands:
    "https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2007-Four-strands.pdf",
  lt: "https://www.languagetransfer.org/complete-spanish",
};
export const SPANISH_DISCOVERY = [
  {
    title: "Language Transfer: Complete Spanish",
    url: SPANISH_SOURCES.lt,
    reason:
      "Reason through the language. Set your actual starting lesson rather than restarting as a beginner.",
    access: "Official free course. Embedded SoundCloud playback is available here.",
    level: "Course sequence, not a placement test.",
  },
  {
    title: "Hoy Hablamos",
    url: "https://www.hoyhablamos.com/",
    reason:
      "Longer Spanish listening about everyday subjects. Try a short sample and rate the challenge.",
    access:
      "Free listening options; transcripts and exercises require a paid subscription. Check the provider.",
    level: "Publisher describes intermediate/advanced and basic/intermediate shows.",
  },
  {
    title: "Dreaming Spanish",
    url: "https://www.dreamingspanish.com/",
    reason: "Browse a series at an understandable challenge level, then retell what happened.",
    access: "Check current access, subtitles and variety on the provider's page.",
    level: "Pick a series at your level; no exact level is assumed here.",
  },
];
