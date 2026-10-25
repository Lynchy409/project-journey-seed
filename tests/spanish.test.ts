import test from "node:test";
import assert from "node:assert/strict";
import {
  dailySpanishTasks,
  DEFAULT_SPANISH_PROFILE,
  dueRules,
  isRuleWorthSaving,
  listeningGuidance,
  mergeSpanishRule,
  reviewRule,
  safeSpanishURL,
  spanishDoneForDate,
} from "../src/lib/spanish";
import { canAwardSpanishPractice, decodeSpanishAI, SpanishAIRequest } from "../src/lib/spanish-ai";
import { addPlayedRange, coveredSeconds, playedDelta } from "../src/lib/spanish-audio";
import type { RuleMistake, SpanishItem } from "../src/lib/spanish-types";

const rule: RuleMistake = {
  rule_id: "past-events",
  title: "Past events",
  explanation: "Choose the right past tense for this meaning.",
  source: "AI-generated",
  original: "ayer voy",
  corrected: "ayer fui",
  count: 1,
  box: 0,
  due: "2026-10-25",
  dismissed: false,
  confidence: 0.95,
};
const item = (kind: SpanishItem["kind"], data: object, id = "one"): SpanishItem => ({
  id,
  user_id: "owner",
  kind,
  key: id,
  data: JSON.parse(JSON.stringify(data)),
  revision: 1,
  created_at: "2026-10-25",
  updated_at: "2026-10-25",
});
test("daily plan uses meaningful units and a 25-minute estimate without assuming a CEFR level", () => {
  const tasks = dailySpanishTasks(DEFAULT_SPANISH_PROFILE, [], "2026-10-25");
  assert.equal(tasks.length, 3);
  assert.equal(
    tasks.reduce((sum, task) => sum + task.minutes, 0),
    25,
  );
  assert(tasks.every((task) => task.status === "planned" && task.date === "2026-10-25"));
  assert(tasks.some((task) => task.action === "conversation" && /four/.test(task.title)));
  assert(!JSON.stringify(tasks).includes("A1"));
});
test("daily plan rotates output and practice rather than repeating a rigid four-task list", () => {
  assert.notDeepEqual(
    dailySpanishTasks(DEFAULT_SPANISH_PROFILE, [], "2026-10-25").map((task) => task.title),
    dailySpanishTasks(DEFAULT_SPANISH_PROFILE, [], "2026-10-26").map((task) => task.title),
  );
});
test("due rules change the daily plan and weaker rules are first; dismissed rules stay out", () => {
  const items = [
    item("mistake", { ...rule, box: 3 }, "strong"),
    item("mistake", rule, "weak"),
    item("mistake", { ...rule, dismissed: true }, "dismissed"),
  ];
  assert.deepEqual(
    dueRules(items, "2026-10-25").map((row) => row.id),
    ["weak", "strong"],
  );
  assert.equal(
    dailySpanishTasks(DEFAULT_SPANISH_PROFILE, items, "2026-10-25")[2]?.action,
    "review",
  );
});
test("typos, style suggestions, uncertain rules and unchanged answers are not auto-drilled", () => {
  for (const extra of [
    { category: "typo" },
    { category: "style" },
    { confidence: 0.89 },
    { corrected: rule.original },
    { rule_id: "invalid id" },
  ])
    assert.equal(isRuleWorthSaving({ ...rule, category: "grammar", ...extra }), false);
  assert.equal(isRuleWorthSaving({ ...rule, category: "meaning" }), true);
});
test("successful rules are spaced, failures reset; calendar calculations survive DST", () => {
  assert.equal(reviewRule(rule, true, "2026-10-25").due, "2026-10-27");
  assert.equal(reviewRule({ ...rule, box: 5 }, true, "2026-10-25").due, "2026-11-24");
  assert.equal(reviewRule({ ...rule, box: 4 }, false, "2026-10-25").box, 0);
});
test("a recurring rule error resets its review stage without losing prior review idempotency", () => {
  const merged = mergeSpanishRule(
    { ...rule, box: 5, review_ids: ["previous-review"] },
    { ...rule, category: "grammar" },
    "new-error",
    "2026-10-25",
  );
  assert.equal(merged.box, 0);
  assert.equal(merged.count, 2);
  assert.deepEqual(merged.review_ids, ["previous-review"]);
  assert.equal(merged.due, "2026-10-25");
});
test("skipped and absent daily work are not falsely complete", () => {
  assert.equal(spanishDoneForDate([], "2026-10-25"), false);
  assert.equal(
    spanishDoneForDate([item("task", { date: "2026-10-25", status: "skipped" })], "2026-10-25"),
    false,
  );
  assert.equal(
    spanishDoneForDate([item("task", { date: "2026-10-25", status: "done" })], "2026-10-25"),
    true,
  );
});
test("difficulty feedback changes the next listening guidance and daily target", () => {
  const hard = [item("content", { feedback: "Too hard" })];
  assert.match(listeningGuidance(hard), /clearer, shorter/);
  assert.match(
    dailySpanishTasks(DEFAULT_SPANISH_PROFILE, hard, "2026-10-25")[0]!.target,
    /too hard/,
  );
  assert.match(listeningGuidance([item("content", { feedback: "Too easy" })]), /less-supported/);
});
test("unsafe and credential-bearing content addresses are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
    "not a URL",
  ])
    assert.equal(safeSpanishURL(url), null);
  assert.equal(
    safeSpanishURL("https://example.com/watch?v=test"),
    "https://example.com/watch?v=test",
  );
});
test("listening clock excludes seeks, rewinds, paused time and long background gaps", () => {
  assert.equal(playedDelta(1000, 2000, 1000, true), 1);
  assert.equal(playedDelta(1000, 30000, 1000, true), 0);
  assert.equal(playedDelta(10000, 1000, 1000, true), 0);
  assert.equal(playedDelta(1000, 2000, 1000, false), 0);
  assert.equal(playedDelta(1000, 61000, 60000, true), 0);
});
test("replaying the same audio cannot fake distinct coverage or bridge seeks", () => {
  let ranges = addPlayedRange([], 0, 10000);
  ranges = addPlayedRange(ranges, 2000, 8000);
  assert.equal(coveredSeconds(ranges), 10);
  ranges = addPlayedRange(ranges, 30000, 35000);
  assert.equal(coveredSeconds(ranges), 15);
  assert.equal(ranges.length, 2);
});
const request = SpanishAIRequest.parse({
  mode: "conversation",
  message: "Ayer fui al cine.",
  topic: "Yesterday",
  variety: "Spain",
  history: [],
});
const answer = {
  response: "¿Qué viste?",
  corrected: "",
  feedback: "Clear past narration.",
  rules: [],
  judgement: "not_applicable",
  challenge: null,
};
test("showing then hiding a sample cannot become an independent success; target-rule corrections cannot advance mastery", () => {
  const result = decodeSpanishAI(JSON.stringify({ ...answer, judgement: "accepted" }), request);
  assert.equal(canAwardSpanishPractice(result, false), true);
  assert.equal(canAwardSpanishPractice(result, true), false);
  assert.equal(
    canAwardSpanishPractice(
      { ...result, rules: [{ ...rule, category: "grammar" }] },
      false,
      rule.rule_id,
    ),
    false,
  );
});
test("AI boundary rejects empty replies, excessive history and grading without a real challenge", () => {
  assert.throws(() => SpanishAIRequest.parse({ ...request, message: " " }));
  assert.throws(() => SpanishAIRequest.parse({ ...request, mode: "grade" }));
  assert.throws(() =>
    SpanishAIRequest.parse({
      ...request,
      history: Array.from({ length: 13 }, () => ({ user: "", response: "" })),
    }),
  );
});
test("format failures cannot award progress; hallucinated original spans cannot become mistakes", () => {
  assert.throws(() => decodeSpanishAI("not-json", request));
  assert.throws(() =>
    decodeSpanishAI(JSON.stringify({ ...answer, judgement: "perfect-fluency" }), request),
  );
  assert.equal(
    decodeSpanishAI(
      JSON.stringify({ ...answer, rules: [{ ...rule, category: "grammar" }] }),
      request,
    ).rules.length,
    0,
  );
  assert.equal(decodeSpanishAI(JSON.stringify(answer), request).rules.length, 0);
});
test("challenge and grade modes require their actual output contracts", () => {
  assert.throws(() => decodeSpanishAI(JSON.stringify(answer), { ...request, mode: "challenge" }));
  assert.throws(() =>
    decodeSpanishAI(JSON.stringify(answer), {
      ...request,
      mode: "grade",
      challenge: { prompt: "Compare", sample: "Prefiero esto.", criterion: "Compare options" },
    }),
  );
});
