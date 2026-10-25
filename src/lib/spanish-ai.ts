import { z } from "zod";
export const SpanishRuleResult = z.object({
  rule_id: z.string().regex(/^[a-z][a-z0-9_-]{2,79}$/),
  title: z.string().min(1).max(180),
  explanation: z.string().min(1).max(1500),
  original: z.string().min(1).max(1500),
  corrected: z.string().min(1).max(1500),
  category: z.enum(["grammar", "usage", "meaning", "typo", "style"]),
  confidence: z.number().min(0).max(1),
});
const challengeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  sample: z.string().min(1).max(1000),
  criterion: z.string().min(1).max(1200),
});
export const SpanishAIResult = z.object({
  response: z.string().min(1).max(3000),
  corrected: z.string().max(3000),
  feedback: z.string().max(2000),
  rules: z.array(SpanishRuleResult).max(6),
  judgement: z.enum(["not_applicable", "accepted", "retry", "uncertain"]),
  challenge: challengeSchema.nullable(),
});
export type SpanishAIResponse = z.infer<typeof SpanishAIResult>;
export function canAwardSpanishPractice(
  result: SpanishAIResponse,
  sampleSeen: boolean,
  targetRule?: string,
) {
  return (
    result.judgement === "accepted" &&
    !sampleSeen &&
    (!targetRule ||
      !result.rules.some(
        (rule) =>
          rule.rule_id === targetRule &&
          rule.confidence >= 0.9 &&
          rule.category !== "typo" &&
          rule.category !== "style",
      ))
  );
}
export const SpanishAIRequest = z
  .object({
    mode: z.enum(["opening", "conversation", "challenge", "grade"]),
    message: z.string().max(3000),
    topic: z.string().trim().min(1).max(1200),
    variety: z.string().max(100),
    ability: z.string().max(2000).default("Beyond beginner, exact level unassessed."),
    history: z
      .array(z.object({ user: z.string().max(3000), response: z.string().max(3000) }))
      .max(12),
    rule: z.string().max(2000).optional(),
    transcript: z.string().max(10000).optional(),
    challenge: challengeSchema.optional(),
  })
  .superRefine((request, context) => {
    if (request.mode === "grade" && !request.challenge)
      context.addIssue({
        code: "custom",
        message: "A real challenge is required for grading",
        path: ["challenge"],
      });
    if (request.mode !== "challenge" && request.mode !== "opening" && !request.message.trim())
      context.addIssue({
        code: "custom",
        message: "Write a Spanish response first",
        path: ["message"],
      });
  });
export function decodeSpanishAI(raw: string, request: z.infer<typeof SpanishAIRequest>) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new Error("The Spanish response was not valid JSON. No progress has been awarded.");
  }
  const result = SpanishAIResult.safeParse(decoded);
  if (!result.success)
    throw new Error("The Spanish response failed its format checks. No progress has been awarded.");
  if (request.mode === "challenge" && !result.data.challenge)
    throw new Error("No usable challenge was returned. Please try again.");
  if (
    request.mode === "grade" &&
    !["accepted", "retry", "uncertain"].includes(result.data.judgement)
  )
    throw new Error("No usable evaluation was returned. Your answer is still here.");
  // A proposed correction must quote an actual span of this reply, not invent a mistake.
  result.data.rules = result.data.rules.filter((rule) => request.message.includes(rule.original));
  return result.data;
}
