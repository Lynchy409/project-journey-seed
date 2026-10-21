import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";

export type DriverTool = "breath" | "timer" | null;

export type Driver = {
  key: string;
  title: string;
  tag: string;
  emoji: string;
  /** Tailwind token classes */
  bg: string;
  text: string;
  soft: string;
  objective: string;
  prompt: string;
  placeholder: string;
  identity: string;
  tool: DriverTool;
  xp: number;
  tier: 1 | 2 | 3;
};

const FIT = { bg: "bg-fitness", text: "text-fitness", soft: "bg-fitness-soft" };
const LRN = { bg: "bg-learning", text: "text-learning", soft: "bg-learning-soft" };
const TRD = { bg: "bg-trading", text: "text-trading", soft: "bg-trading-soft" };
const LIFE = { bg: "bg-life", text: "text-life", soft: "bg-life-soft" };

const BEAST = "I am a beast with years of experience and training who backs myself against anyone in the world";
const FINISH = "I am a man who finishes what he starts";
const PRO = "I am a pro trader who follows his strategy to a tee which has led me to live this prosperous life";

export const DRIVERS: Driver[] = [
  // Tier 1 — Boss bounties
  { key: "trading", title: "Fully present trading session", tag: "Trade", emoji: "🎯", ...TRD, xp: 150, tier: 1, objective: "Executed or patient — both bank. Breach banks nothing.", prompt: "One-line market read", placeholder: "Waited for London sweep, no A+ setup", identity: PRO, tool: null },
  { key: "sprint", title: "Sprint session", tag: "Train", emoji: "⚡", ...FIT, xp: 150, tier: 1, objective: "Max-intent sprints. Fullback speed.", prompt: "Reps × distance", placeholder: "8 × 60m, 2 min rest", identity: BEAST, tool: null },
  { key: "cold", title: "Up by 7 + cold shower", tag: "Life", emoji: "🧊", ...LIFE, xp: 150, tier: 1, objective: "Up by 7:00. Cold water. Win the morning.", prompt: "Wake time + cold minutes", placeholder: "6:55 · 2 min cold", identity: FINISH, tool: null },
  // Tier 2 — Core growth
  { key: "markets", title: "Dedicated study · markets", tag: "Trade", emoji: "📈", ...TRD, xp: 100, tier: 2, objective: "Find the HTF draw. Plan the exploit.", prompt: "Pair, bias and the level you're watching", placeholder: "GBPUSD bullish, draw on 1.2740 highs", identity: PRO, tool: null },
  { key: "strength", title: "Gym session", tag: "Train", emoji: "🏋️", ...FIT, xp: 100, tier: 2, objective: "Train with intent. Hit a top set.", prompt: "Session focus + top lift (weight × reps)", placeholder: "Pull day · deadlift 160kg × 5", identity: BEAST, tool: null },
  { key: "cardio", title: "Run / conditioning", tag: "Train", emoji: "🏃", ...FIT, xp: 90, tier: 2, objective: "Intervals or Zone 2.", prompt: "What + how long", placeholder: "5k Zone 2, 28 min", identity: BEAST, tool: null },
  { key: "spanish", title: "Spanish work", tag: "Learn", emoji: "🇪🇸", ...LRN, xp: 80, tier: 2, objective: "Lesson, game or conversation.", prompt: "One phrase or rule you learned", placeholder: "Quiero ir = I want to go", identity: "Soy una persona que habla español con fluidez", tool: null },
  { key: "creative", title: "Creative output", tag: "Life", emoji: "🎨", ...LIFE, xp: 80, tier: 2, objective: "Make something real. Ship it.", prompt: "What did you create?", placeholder: "Wrote 300 words for my blog", identity: FINISH, tool: null },
  { key: "recovery", title: "Full stretch out", tag: "Train", emoji: "🧘", ...FIT, xp: 80, tier: 2, objective: "Open hips, back and hamstrings.", prompt: "Flow done + minutes", placeholder: "Morning flow 7 min + 90/90", identity: BEAST, tool: null },
  // Tier 3 — Foundation
  { key: "read", title: "Read 10 pages", tag: "Learn", emoji: "📖", ...LRN, xp: 50, tier: 3, objective: "10 pages minimum. Keep one idea.", prompt: "Book, pages + one takeaway", placeholder: "Atomic Habits p.40–50: systems beat goals", identity: FINISH, tool: null },
  { key: "wrist", title: "Wrists & handstands", tag: "Train", emoji: "🤸", ...FIT, xp: 40, tier: 3, objective: "Time on hands. Beat your hold.", prompt: "Drills + best hold", placeholder: "Wrist prep, wall hold 35s", identity: FINISH, tool: "timer" },
  { key: "news", title: "World news briefing", tag: "Learn", emoji: "🌍", ...LRN, xp: 40, tier: 3, objective: "Read the world. Know what moves markets.", prompt: "One-line takeaway", placeholder: "BoE held rates — GBP pricing cuts later", identity: FINISH, tool: null },
  { key: "faith", title: "Faith & prayer", tag: "Faith", emoji: "🙏", ...LIFE, xp: 35, tier: 3, objective: "Pray. Give thanks. Set an intention.", prompt: "Gratitude or intention for today", placeholder: "Thankful for my family. Today I stay patient.", identity: FINISH, tool: null },
  { key: "breath", title: "Breathwork & meditation", tag: "Inner", emoji: "🌬️", ...LIFE, xp: 30, tier: 3, objective: "2 minutes of box breathing. Reset.", prompt: "How do you feel after?", placeholder: "Calm, clear head", identity: FINISH, tool: "breath" },
  { key: "better", title: "Research what makes me better", tag: "Inner", emoji: "🔍", ...LIFE, xp: 30, tier: 3, objective: "Research one proven method.", prompt: "Method found + why it works", placeholder: "Cold exposure after training — dopamine & recovery", identity: FINISH, tool: null },
];

export const TIER_LABELS = { 1: "Boss bounties", 2: "Core growth", 3: "Foundation" } as const;

const XP_BY_KEY = new Map(DRIVERS.map((d) => [d.key, d.xp]));

/** XP a single logged driver is worth. Rule breaches bank 0. */
export function driverXp(key: string, evidence: string): number {
  if (key === "trading" && evidence.startsWith("[breach]")) return 0;
  return XP_BY_KEY.get(key) ?? 0;
}

export const TIERS = [
  { min: 0, label: "Warming up", note: "First one is the hardest. Go." },
  { min: 3, label: "Locked in", note: "Keep stacking." },
  { min: 6, label: "Beast mode", note: "Most people quit here. Not you." },
  { min: 10, label: "Unstoppable", note: "Finish what you start." },
  { min: DRIVERS.length, label: "Day dominated", note: "Every bounty claimed." },
];

export function tierFor(n: number) {
  return [...TIERS].reverse().find((t) => n >= t.min)!;
}

export const driverLogsQuery = (date: string) =>
  queryOptions({
    queryKey: ["driver_logs", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_logs").select("*").eq("date", date);
      if (error) throw error;
      return data;
    },
  });

export async function saveDriver(date: string, driver_key: string, evidence: string) {
  const user_id = await uid();
  const { error } = await supabase
    .from("driver_logs")
    .upsert({ user_id, date, driver_key, evidence }, { onConflict: "user_id,date,driver_key" });
  if (error) throw error;
}

export async function clearDriver(date: string, driver_key: string) {
  const { error } = await supabase.from("driver_logs").delete().eq("date", date).eq("driver_key", driver_key);
  if (error) throw error;
}
