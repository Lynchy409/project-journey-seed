import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SpanishAIRequest } from "./spanish-ai";
import { runSpanishService, spanishServiceSetup } from "./spanish-service";
export type { SpanishAIResponse } from "./spanish-ai";

function configuration() {
  return {
    key: process.env["LOVABLE_API_KEY"],
    model: process.env["SPANISH_AI_MODEL"],
    reviewModel: process.env["SPANISH_AI_REVIEW_MODEL"],
  };
}

export const spanishAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SpanishAIRequest.parse(input))
  .handler(async ({ data }) => runSpanishService(data, configuration()));

// No provider request and no chargeable AI call. This only reports safe server
// configuration metadata; the key itself never leaves the server.
export const spanishAISetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => spanishServiceSetup(configuration()));
