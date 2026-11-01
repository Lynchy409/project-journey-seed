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
  // Tier 1 — High impact
  { key: "cold", title: "Up ready for sesh", tag: "Life", emoji: "🧊", ...LIFE, xp: 150, tier: 1, objective: "Up, cold water, switched on.", prompt: "Wake time + how you switched on", placeholder: "6:55 · 2 min cold", identity: FINISH, tool: null },
  { key: "trading", title: "Trading session", tag: "Trade", emoji: "🎯", ...TRD, xp: 150, tier: 1, objective: "Present and disciplined. Breach banks nothing.", prompt: "One-line market read", placeholder: "Waited for London sweep, no A+ setup", identity: PRO, tool: null },
  // Tier 2 — Core growth
  { key: "strength", title: "Strength sesh", tag: "Train", emoji: "🏋️", ...FIT, xp: 100, tier: 2, objective: "Train with intent. Hit a top set.", prompt: "Session focus + top lift", placeholder: "Pull day · deadlift 160kg × 5", identity: BEAST, tool: null },
  { key: "cardio", title: "Cardio", tag: "Train", emoji: "🏃", ...FIT, xp: 100, tier: 2, objective: "Sprints, intervals or Zone 2.", prompt: "What + how long", placeholder: "8 × 60m sprints", identity: BEAST, tool: null },
  { key: "spanish", title: "Spanish · Language Transfer", tag: "Learn", emoji: "🇪🇸", ...LRN, xp: 80, tier: 2, objective: "One track or lesson.", prompt: "One phrase or rule you learned", placeholder: "Quiero ir = I want to go", identity: "Soy una persona que habla español con fluidez", tool: null },
  { key: "yoga", title: "Yoga", tag: "Train", emoji: "🧘", ...FIT, xp: 80, tier: 2, objective: "Full flow. Open hips, back, hamstrings.", prompt: "Flow + minutes", placeholder: "Athlete recovery flow 20 min", identity: BEAST, tool: null },
  { key: "journal", title: "Journal · writing & thinking", tag: "Inner", emoji: "✍️", ...LIFE, xp: 80, tier: 2, objective: "Write it out. Think deeply.", prompt: "Main thought or idea", placeholder: "Patience is my edge this week", identity: FINISH, tool: null },
  { key: "steps", title: "10k steps", tag: "Train", emoji: "👟", ...FIT, xp: 60, tier: 2, objective: "10,000 steps minimum.", prompt: "Step count", placeholder: "10,450", identity: BEAST, tool: null },
  // Tier 3 — Foundation
  { key: "recall", title: "Play Recall game", tag: "Learn", emoji: "🧠", ...LRN, xp: 50, tier: 3, objective: "One round in Learn → Recall.", prompt: "Score", placeholder: "8/10", identity: FINISH, tool: null },
  { key: "read", title: "Read 10 pages · learn something new", tag: "Learn", emoji: "📖", ...LRN, xp: 50, tier: 3, objective: "10 pages minimum. Keep one idea.", prompt: "Book/topic + one takeaway", placeholder: "Atomic Habits p.40–50: systems beat goals", identity: FINISH, tool: null },
  { key: "wrist", title: "Calisthenics", tag: "Train", emoji: "🤸", ...FIT, xp: 40, tier: 3, objective: "Bodyweight work + handstand time.", prompt: "Drills + best hold", placeholder: "Push-ups, wall hold 35s", identity: FINISH, tool: "timer" },
  { key: "meditation", title: "Meditation", tag: "Inner", emoji: "🪷", ...LIFE, xp: 35, tier: 3, objective: "Sit still. 10 minutes.", prompt: "Minutes + how you feel", placeholder: "10 min, clear head", identity: FINISH, tool: null },
  { key: "faith", title: "Pray", tag: "Faith", emoji: "🙏", ...LIFE, xp: 35, tier: 3, objective: "Pray. Give thanks. Set an intention.", prompt: "Gratitude or intention", placeholder: "Thankful for my family", identity: FINISH, tool: null },
  { key: "breath", title: "Breathing work", tag: "Inner", emoji: "🌬️", ...LIFE, xp: 30, tier: 3, objective: "2 minutes of box breathing.", prompt: "How do you feel after?", placeholder: "Calm, clear head", identity: FINISH, tool: "breath" },
  { key: "hydrated", title: "Hydrated", tag: "Life", emoji: "💧", ...LIFE, xp: 30, tier: 3, objective: "Hit your water.", prompt: "Litres", placeholder: "3L", identity: FINISH, tool: null },
  { key: "recovery", title: "Recovery", tag: "Train", emoji: "🛁", ...FIT, xp: 30, tier: 3, objective: "Stretch, foam roll, sauna or rest.", prompt: "What you did", placeholder: "Foam roll 10 min", identity: BEAST, tool: null },
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
