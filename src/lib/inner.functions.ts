import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QuizQuestion = { q: string; options: string[]; answer: number };

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ skill: z.string().min(1).max(200), quest: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<QuizQuestion[]> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'You write short beginner quizzes with clear, factual, single correct answers. Reply ONLY with JSON: {"questions":[{"q":"...","options":["a","b","c","d"],"answer":0}]} where answer is the index of the correct option.',
          },
          { role: "user", content: `Skill: ${data.skill}\nToday's task: ${data.quest}\nWrite 5 multiple-choice questions (4 options each) testing core knowledge of this skill.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Too many requests — try again in a minute");
    if (res.status === 402) throw new Error("AI credits used up");
    if (!res.ok) throw new Error(`Quiz failed [${res.status}]`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = z
      .object({ questions: z.array(z.object({ q: z.string(), options: z.array(z.string()).min(2), answer: z.number().int() })) })
      .parse(JSON.parse(raw.replace(/^```json\s*|```$/g, "")));
    return parsed.questions.filter((x) => x.answer >= 0 && x.answer < x.options.length).slice(0, 5);
  });
