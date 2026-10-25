import type { Json } from "@/integrations/supabase/types";
import type { FitnessDatabase } from "./fitness-types";

export const SPANISH_KINDS = [
  "profile",
  "task",
  "listening",
  "content",
  "conversation",
  "mistake",
  "phrase",
  "mission",
  "milestone",
] as const;
export type SpanishKind = (typeof SPANISH_KINDS)[number];
export type SpanishItem = {
  id: string;
  user_id: string;
  kind: SpanishKind;
  key: string;
  data: Json;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type SpanishActivity = {
  id: string;
  user_id: string;
  date: string;
  kind: string;
  seconds: number;
  task_id: string | null;
  data: Json;
  created_at: string;
};
export type SpanishProfile = {
  goal: string;
  variety: string;
  interests: string;
  lt_start: number;
  workload: number;
  skills: Record<string, number>;
  notes: string;
};
export type DailySpanishTask = {
  date: string;
  title: string;
  action: "listen" | "conversation" | "review" | "practice";
  target: string;
  minutes: number;
  status: "planned" | "done" | "skipped";
  evidence?: string;
  completed_at?: string;
};
export type RuleMistake = {
  rule_id: string;
  title: string;
  explanation: string;
  source: string;
  original: string;
  corrected: string;
  count: number;
  box: number;
  due: string;
  dismissed: boolean;
  confidence: number;
  review_ids?: string[];
};
export type ListeningProgress = {
  track_id: number;
  index: number;
  title: string;
  position_ms: number;
  duration_ms: number;
  played_seconds: number;
  completed: boolean;
  self_reported?: boolean;
  listened_ranges?: [number, number][];
};
export type ConversationTurn = {
  id: string;
  user: string;
  response: string;
  corrected: string;
  feedback: string;
  created_at: string;
};
export type ConversationData = { topic: string; opening?: string; turns: ConversationTurn[] };
export type ListeningContent = {
  title: string;
  url: string;
  type: string;
  status: string;
  notes: string;
  transcript: string;
  feedback: string;
  position: string;
};
export type SpanishDatabase = Omit<FitnessDatabase, "public"> & {
  public: Omit<FitnessDatabase["public"], "Tables" | "Functions"> & {
    Tables: FitnessDatabase["public"]["Tables"] & {
      spanish_items: {
        Row: SpanishItem;
        Insert: Partial<SpanishItem> & Pick<SpanishItem, "user_id" | "kind" | "key">;
        Update: Partial<SpanishItem>;
        Relationships: [];
      };
      spanish_activities: {
        Row: SpanishActivity;
        Insert: Partial<SpanishActivity> & Pick<SpanishActivity, "user_id" | "date" | "kind">;
        Update: Partial<SpanishActivity>;
        Relationships: [];
      };
    };
    Functions: FitnessDatabase["public"]["Functions"] & {
      put_spanish_item: {
        Args: { p_id: string; p_kind: string; p_key: string; p_data: Json; p_revision: number };
        Returns: SpanishItem[];
      };
      record_spanish_activity: {
        Args: {
          p_id: string;
          p_date: string;
          p_kind: string;
          p_seconds: number;
          p_data: Json;
          p_task_id?: string;
        };
        Returns: string;
      };
    };
  };
};
