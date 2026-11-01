import test from "node:test";
import assert from "node:assert/strict";
import { accountOf, challengeStatus, equityCurve, type Challenge } from "../src/lib/trade-accounts";

const t = (date: string, cash: number | null, outcome = cash == null ? "open" : cash >= 0 ? "win" : "loss", created = date) => ({
  source: "forexcom", further_levels: cash == null ? null : { cash }, outcome, result_r: null, date, created_at: created,
});
const c: Challenge = { id: "x", name: "FTMO", currency: "GBP", startingBalance: 10000, profitTarget: 1000, maxDailyLoss: 500, maxDrawdown: 1000, rules: "" };

test("equity curve runs trade by trade, oldest first, skipping open trades", () => {
  const pts = equityCurve([t("2026-10-03", -100), t("2026-10-01", 250), t("2026-10-02", null)]);
  assert.deepEqual(pts.map((p) => p.total), [250, 150]);
});

test("challenge account is read from source", () => {
  assert.deepEqual(accountOf("challenge:abc"), { kind: "challenge", challengeId: "abc" });
  assert.deepEqual(accountOf(null), { kind: "live", challengeId: null });
});

test("daily buffer shrinks with today's losses only", () => {
  const s = challengeStatus(c, [t("2026-10-30", 300), t("2026-10-31", -200)], "2026-10-31");
  assert.equal(s.dailyBuffer, 300);
  assert.equal(s.drawdownBuffer, 1000);
  assert.equal(s.balance, 10100);
});

test("hitting max daily loss marks the challenge breached", () => {
  assert.equal(challengeStatus(c, [t("2026-10-31", -500)], "2026-10-31").level, "breached");
});

test("reaching the profit target marks it passed", () => {
  const s = challengeStatus(c, [t("2026-10-31", 1000)], "2026-10-31");
  assert.equal(s.level, "passed");
  assert.equal(s.targetPct, 100);
});
