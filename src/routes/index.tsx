import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Journey — goals, training, trading, learning" },
      {
        name: "description",
        content: "A personal companion for setting goals, logging training and trades, and tracking what you learn.",
      },
      { property: "og:title", content: "My Journey — goals, training, trading, learning" },
      {
        property: "og:description",
        content: "A personal companion for setting goals, logging training and trades, and tracking what you learn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/today" : "/auth" });
  },
  component: () => null,
});
