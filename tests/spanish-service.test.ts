import test from "node:test";
import assert from "node:assert/strict";
import { runSpanishService, spanishServiceSetup } from "../src/lib/spanish-service";
import type { SpanishAIResponse } from "../src/lib/spanish-ai";

const request = {
  mode: "opening" as const,
  topic: "A recent weekend",
  variety: "Spain",
  ability: "Beyond beginner",
  message: "",
  history: [],
};
const answer: SpanishAIResponse = {
  response: "¿Qué hiciste el fin de semana pasado?",
  corrected: "",
  feedback: "",
  rules: [],
  judgement: "not_applicable",
  challenge: null,
};
function provider(responses: (Response | Error)[]) {
  const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  const fake: typeof fetch = async (url, init) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body)),
      auth: new Headers(init?.headers).get("authorization"),
    });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw new Error("Unexpected extra provider request");
    return response;
  };
  return { fetch: fake, calls };
}
const envelope = (value = answer) =>
  Response.json({
    status: "completed",
    output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }],
  });

test("missing/whitespace key makes no provider request and never exposes configuration secrets", async () => {
  const p = provider([]);
  const result = await runSpanishService(request, { key: " ", fetch: p.fetch });
  assert(!result.ok);
  if (!result.ok) assert.equal(result.error.code, "SPANISH_NOT_CONFIGURED");
  assert.equal(p.calls.length, 0);
  const setup = spanishServiceSetup({
    key: "server-only-test-key",
    model: "custom",
    reviewModel: "reviewer",
  });
  assert.deepEqual(setup, { configured: true, model: "custom", reviewModel: "reviewer" });
  assert(!JSON.stringify(setup).includes("server-only-test-key"));
});

test("real call shape requires a separately checked answer and uses server credentials only", async () => {
  const p = provider([
    envelope(),
    Response.json({
      output_text: JSON.stringify({
        ...answer,
        response: "¿Qué fue lo mejor de ese fin de semana?",
      }),
    }),
  ]);
  const result = await runSpanishService(request, {
    key: "server-only-test-key",
    model: "draft-model",
    reviewModel: "review-model",
    fetch: p.fetch,
  });
  assert(result.ok);
  if (result.ok) assert.equal(result.result.response, "¿Qué fue lo mejor de ese fin de semana?");
  assert.equal(p.calls.length, 2);
  assert.equal(p.calls[0].url, "https://ai.gateway.lovable.dev/v1/responses");
  assert.equal(p.calls[0].body.model, "draft-model");
  assert.equal(p.calls[1].body.model, "review-model");
  assert.equal(p.calls[0].auth, "Bearer server-only-test-key");
  assert(!JSON.stringify(result).includes("server-only-test-key"));
  assert.deepEqual(JSON.parse(String(p.calls[1].body.input)).request, request);
});

for (const status of [400, 401, 402, 403, 404, 429, 503]) {
  for (const stage of ["draft", "review"] as const) {
    test(`${status} in ${stage} returns a safe actionable failure, not an unchecked answer`, async () => {
      const failure = new Response("private-provider-body-and-secret", { status });
      const p = provider(stage === "draft" ? [failure] : [envelope(), failure]);
      const result = await runSpanishService(request, {
        key: "server-only-test-key",
        fetch: p.fetch,
      });
      assert(!result.ok);
      if (!result.ok) {
        assert.equal(result.error.stage, stage);
        assert(result.error.code.endsWith(`_${status}`));
        if (status === 402) assert.match(result.error.message, /runtime credits/);
        if (status === 401) assert.match(result.error.message, /not a database reinstall/);
      }
      assert.equal(p.calls.length, stage === "draft" ? 1 : 2);
      assert(!JSON.stringify(result).includes("private-provider-body-and-secret"));
      assert(!("result" in result));
      assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    });
  }
}

for (const bad of [
  { output_text: "not JSON" },
  { output_text: JSON.stringify({ response: "Incomplete schema" }) },
  { output: [{ content: [{ type: "refusal", refusal: "No" }] }] },
  { status: "incomplete", output_text: JSON.stringify(answer) },
]) {
  test(`unusable answer never escapes as success: ${JSON.stringify(bad).slice(0, 70)}`, async () => {
    const p = provider([envelope(), Response.json(bad)]);
    const result = await runSpanishService(request, {
      key: "server-only-test-key",
      fetch: p.fetch,
    });
    assert(!result.ok);
    if (!result.ok) assert.equal(result.error.stage, "review");
  });
}

test("timeout and network failures are distinguished without an automatic paid retry", async () => {
  for (const error of [
    new DOMException("timed out", "TimeoutError"),
    new TypeError("connection failed"),
  ]) {
    const p = provider([error]);
    const result = await runSpanishService(request, {
      key: "server-only-test-key",
      fetch: p.fetch,
    });
    assert(!result.ok);
    if (!result.ok)
      assert.equal(
        result.error.code,
        error.name === "TimeoutError" ? "SPANISH_AI_TIMEOUT" : "SPANISH_AI_CONNECTION",
      );
    assert.equal(p.calls.length, 1);
  }
});

test("a challenge without a challenge payload cannot be accepted despite valid JSON", async () => {
  const p = provider([envelope()]);
  const result = await runSpanishService(
    { ...request, mode: "challenge" },
    { key: "server-only-test-key", fetch: p.fetch },
  );
  assert(!result.ok);
  if (!result.ok) assert.equal(result.error.code, "SPANISH_INVALID_ANSWER");
  assert.equal(p.calls.length, 1);
});
