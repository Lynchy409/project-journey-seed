import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_STATEMENTS = [
  { text: "I am a pro trader who follows his strategy to a tee which has led me to live this prosperous life", pillar: "trading" },
  { text: "I am a beast with years of experience and training who backs myself against anyone in the world", pillar: "fitness" },
  { text: "Soy una persona que habla español con fluidez", pillar: "learning" },
  { text: "I am a man who finishes what he starts", pillar: "life" },
];

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user;
}

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const user = await currentUserId();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (data) return data;
    // Fallback: create profile if missing
    const meta = user.user_metadata ?? {};
    const { data: created, error: e2 } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: meta["full_name"] ?? meta["name"] ?? user.email?.split("@")[0] ?? null, avatar_url: meta["avatar_url"] ?? null })
      .select("*")
      .single();
    if (e2) throw e2;
    return created;
  },
});

export const statementsQuery = queryOptions({
  queryKey: ["identity_statements"],
  queryFn: async () => {
    const user = await currentUserId();
    const { data, error } = await supabase.from("identity_statements").select("*").order("sort");
    if (error) throw error;
    if (data.length > 0) return data;
    const { data: seeded, error: e2 } = await supabase
      .from("identity_statements")
      .insert(DEFAULT_STATEMENTS.map((s, i) => ({ ...s, sort: i, user_id: user.id })))
      .select("*");
    if (e2) throw e2;
    return seeded ?? [];
  },
});
