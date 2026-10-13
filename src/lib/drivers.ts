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
};

const FIT = { bg: "bg-fitness", text: "text-fitness", soft: "bg-fitness-soft" };
const LRN = { bg: "bg-learning", text: "text-learning", soft: "bg-learning-soft" };
const TRD = { bg: "bg-trading", text: "text-trading", soft: "bg-trading-soft" };
const LIFE = { bg: "bg-life", text: "text-life", soft: "bg-life-soft" };

const BEAST = "I am a beast with years of experience and training who backs myself against anyone in the world";
const FINISH = "I am a man who finishes what he starts";

export const DRIVERS: Driver[] = [
  { key: "strength", title: "Strength session", tag: "Train", emoji: "🏋️", ...FIT, objective: "Train with intent. Hit a top set.", prompt: "Session focus + top lift (weight × reps)", placeholder: "Pull day · deadlift 160kg × 5", identity: BEAST, tool: null },
  { key: "cardio", title: "Cardio", tag: "Train", emoji: "⚡", ...FIT, objective: "Sprints, intervals or Zone 2.", prompt: "What + how long / how many", placeholder: "8 × 60m sprints", identity: BEAST, tool: null },
  { key: "recovery", title: "Yoga / stretch recovery", tag: "Train", emoji: "🧘", ...FIT, objective: "Open hips, back and hamstrings.", prompt: "Flow done + minutes", placeholder: "Morning flow 7 min + 90/90", identity: BEAST, tool: null },
  { key: "wrist", title: "Wrists & handstands", tag: "Train", emoji: "🤸", ...FIT, objective: "Time on hands. Beat your hold.", prompt: "Drills + best hold", placeholder: "Wrist prep, wall hold 35s", identity: FINISH, tool: "timer" },
  { key: "breath", title: "Breathwork & meditation", tag: "Inner", emoji: "🌬️", ...LIFE, objective: "2 minutes of box breathing. Reset.", prompt: "How do you feel after?", placeholder: "Calm, clear head", identity: FINISH, tool: "breath" },
  { key: "faith", title: "Faith & prayer", tag: "Faith", emoji: "🙏", ...LIFE, objective: "Pray. Give thanks. Set an intention.", prompt: "Gratitude or intention for today", placeholder: "Thankful for my family. Today I stay patient.", identity: FINISH, tool: null },
  { key: "markets", title: "Investigate the markets", tag: "Trade", emoji: "📈", ...TRD, objective: "Find the HTF draw. Plan the exploit.", prompt: "Pair, bias and the level you're watching", placeholder: "GBPUSD bullish, draw on 1.2740 highs", identity: "I am a pro trader who follows his strategy to a tee which has led me to live this prosperous life", tool: null },
  { key: "spanish", title: "Spanish work", tag: "Learn", emoji: "🇪🇸", ...LRN, objective: "Lesson, game or conversation.", prompt: "One phrase or rule you learned", placeholder: "Quiero ir = I want to go", identity: "Soy una persona que habla español con fluidez", tool: null },
  { key: "read", title: "Read 10 pages", tag: "Learn", emoji: "📖", ...LRN, objective: "10 pages minimum. Keep one idea.", prompt: "Book, pages + one takeaway", placeholder: "Atomic Habits p.40–50: systems beat goals", identity: FINISH, tool: null },
  { key: "creative", title: "Creative output", tag: "Life", emoji: "🎨", ...LIFE, objective: "Make something real. Ship it.", prompt: "What did you create?", placeholder: "Wrote 300 words for my blog", identity: FINISH, tool: null },
  { key: "better", title: "Find what makes me better", tag: "Inner", emoji: "🔍", ...LIFE, objective: "Research one proven method.", prompt: "Method found + why it works", placeholder: "Cold exposure after training — dopamine & recovery", identity: FINISH, tool: null },
];

export const TIERS = [
  { min: 0, label: "Warming up", note: "First one is the hardest. Go." },
  { min: 3, label: "Locked in", note: "Momentum building. Keep stacking." },
  { min: 6, label: "Beast mode", note: "Most people quit here. Not you." },
  { min: 9, label: "Unstoppable", note: "Nearly there. Finish what you start." },
  { min: DRIVERS.length, label: "Day dominated", note: "Every driver hit. Receipts saved." },
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
