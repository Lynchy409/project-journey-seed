import test from "node:test";
import assert from "node:assert/strict";
import { FEED_SOURCES, collectMarketBriefing, parseMarketFeed } from "../src/lib/market-feed";
import {
  classifyMarketTopic,
  isMarketRelevantWorldHeadline,
  MARKET_CONTEXT,
  safeExternalUrl,
} from "../src/lib/market-context";
import { MODULES } from "../src/lib/curriculum";
import { parseCalendarEvents } from "../src/lib/economic-calendar";

const source = FEED_SOURCES[0]!;
const now = Date.parse("2026-10-25T12:00:00Z");
const entry = (
  title = "Inflation report",
  url = "https://www.bbc.com/news/business/test",
  date = "Sun, 25 Oct 2026 10:00:00 GMT",
) => `<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate></item>`;
const rss = (items: string) =>
  `<rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;

test("RSS headlines preserve title, source, exact date and safe URL", () => {
  const [row] = parseMarketFeed(rss(entry("CPI &amp; wages")), source, now);
  assert.equal(row?.title, "CPI & wages");
  assert.equal(row?.publisher, "BBC Business");
  assert.equal(row?.publishedAt, "2026-10-25T10:00:00.000Z");
  assert.equal(row?.topic, "inflation");
});
test("Atom alternate link and timestamp are supported", () => {
  const [row] = parseMarketFeed(
    '<feed><entry><title>Jobs</title><link rel="alternate" href="https://www.bbc.co.uk/news/jobs"/><updated>2026-10-25T09:00:00Z</updated></entry></feed>',
    source,
    now,
  );
  assert.equal(row?.topic, "jobs");
  assert.equal(row?.url, "https://www.bbc.co.uk/news/jobs");
});
test("unsafe, unexpected-host and misleading suffix URLs are discarded", () => {
  const xml = rss(
    entry("A", "javascript:alert(1)") +
      entry("B", "https://bbc.com.evil.test/") +
      entry("C", "https://bbc.com@evil.test/") +
      entry("D", "http://www.bbc.com/story"),
  );
  assert.deepEqual(parseMarketFeed(xml, source, now), []);
});
test("undated, invalid and future-dated headlines are discarded", () => {
  assert.equal(
    parseMarketFeed(
      rss(
        entry("A", undefined, "") +
          entry("B", undefined, "invalid") +
          entry("C", undefined, "Sun, 25 Oct 2026 14:00:00 GMT"),
      ),
      source,
      now,
    ).length,
    0,
  );
});
test("duplicate links are removed and newest stories appear first", () => {
  const rows = parseMarketFeed(
    rss(
      entry("old", "https://www.bbc.com/a", "Sat, 24 Oct 2026 10:00:00 GMT") +
        entry("new", "https://www.bbc.com/b") +
        entry("duplicate", "https://www.bbc.com/b"),
    ),
    source,
    now,
  );
  assert.deepEqual(
    rows.map((r) => r.title),
    ["new", "old"],
  );
});
test("malformed XML, HTML documents and entity definitions are rejected", () => {
  for (const xml of [
    "<rss><broken>",
    "<html><body>unavailable</body></html>",
    '<!DOCTYPE rss [<!ENTITY foo "bar">]><rss/>',
  ]) {
    assert.throws(() => parseMarketFeed(xml, source, now));
  }
});
test("oversized documents are rejected", () => {
  assert.throws(() => parseMarketFeed(" ".repeat(1_500_001), source, now));
});
test("headline markup is text, not executable HTML", () => {
  const [row] = parseMarketFeed(
    rss(entry("<![CDATA[<img src=x onerror=alert(1)>Normal title]]>")),
    source,
    now,
  );
  assert.equal(row?.title, "Normal title");
});
test("all feed failures return health states without inventing stories", async () => {
  const data = await collectMarketBriefing(async () => new Response("blocked", { status: 403 }));
  assert.equal(data.headlines.length, 0);
  assert.equal(data.sources.length, FEED_SOURCES.length);
  assert.ok(data.sources.every((s) => s.status === "unavailable"));
});
test("partial feed failures preserve working sources", async () => {
  const data = await collectMarketBriefing(async (url) =>
    url === source.url ? new Response(rss(entry())) : new Response("blocked", { status: 500 }),
  );
  assert.equal(data.sources.find((s) => s.id === source.id)?.status, "ok");
  assert.equal(data.headlines.length, 1);
  assert.equal(
    data.sources.filter((s) => s.status === "unavailable").length,
    FEED_SOURCES.length - 1,
  );
});
test("oversized streaming response is stopped", async () => {
  const data = await collectMarketBriefing(async () => new Response("x".repeat(1_500_001)));
  assert.ok(data.sources.every((s) => s.status === "unavailable"));
});
test("valid empty RSS is distinguished from source failure", async () => {
  const data = await collectMarketBriefing(async () => new Response(rss("")));
  assert.ok(data.sources.every((s) => s.status === "empty"));
});
test("every explainer links to an actual curriculum lesson and HTTPS source", () => {
  const ids = new Set(MODULES.flatMap((m) => m.lessons.map((l) => l.id)));
  for (const item of Object.values(MARKET_CONTEXT)) {
    assert.ok(ids.has(item.lesson), item.lesson);
    assert.equal(safeExternalUrl(item.source), item.source);
    assert.ok(item.task.length > 30);
  }
});
test("topic classification is conservative and predictable", () => {
  assert.equal(classifyMarketTopic("Central bank policy rate"), "policy");
  assert.equal(classifyMarketTopic("Retail growth"), "growth");
  assert.equal(classifyMarketTopic("World developments"), "risk");
});
test("world relevance excludes unrelated crime and retains economic context", () => {
  assert.equal(isMarketRelevantWorldHeadline("Suspect detained after local shooting"), false);
  assert.equal(isMarketRelevantWorldHeadline("Oil shipping disrupted by conflict"), true);
  assert.equal(isMarketRelevantWorldHeadline("Serbia elections draw high turnout"), true);
  assert.equal(isMarketRelevantWorldHeadline("Award for local actor"), false);
});

test("economic calendar validates responses and uses explicit offsets across UK DST", () => {
  assert.throws(() => parseCalendarEvents({ error: "blocked" }));
  const rows = parseCalendarEvents([
    null,
    { title: "Missing metadata" },
    {
      title: "CPI",
      date: "2026-10-25T08:30:00-04:00",
      country: "USD",
      impact: "High",
      forecast: 2,
      previous: "1",
      url: "javascript:alert(1)",
    },
    { title: "Bad date", date: "not a date", country: "USD", impact: "High" },
    { title: "Ambiguous", date: "2026-10-25T08:30:00", country: "USD", impact: "High" },
    { title: "Outside scope", date: "2026-10-25T08:30:00Z", country: "AUD", impact: "High" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.forecast, "2");
  assert.equal(rows[0]?.url, "");
  assert.equal(rows[0]?.instant, "2026-10-25T12:30:00.000Z");
  assert.equal(
    new Date(rows[0]!.instant).toLocaleTimeString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
    }),
    "12:30",
  );
});

test("URL guard rejects credentials, insecure protocols and malformed input", () => {
  for (const url of [
    "https://user:pass@example.com",
    "data:text/plain,test",
    "/relative",
    undefined,
  ]) {
    assert.equal(safeExternalUrl(url), null);
  }
});
