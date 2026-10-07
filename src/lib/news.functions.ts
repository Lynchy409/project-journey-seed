import { createServerFn } from "@tanstack/react-start";

export type NewsEvent = {
  title: string;
  currency: string;
  date: string; // MM-DD-YYYY from feed
  time: string; // UTC, as published in the XML feed
  impact: "High" | "Medium";
  forecast: string;
  previous: string;
  url: string;
};

const PAIRS = ["EUR", "USD", "GBP", "JPY"];
const IMPACTS = ["High", "Medium"];

function field(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
  );
  return m?.[1]?.trim() ?? "";
}

export const getNewsEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsEvent[]> => {
    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.xml",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) throw new Error("Calendar feed unavailable");
    const xml = await res.text();

    const events: NewsEvent[] = [];
    for (const block of xml.matchAll(/<event>([\s\S]*?)<\/event>/g)) {
      const b = block[1] ?? "";
      const currency = field(b, "country");
      const impact = field(b, "impact");
      if (!PAIRS.includes(currency) || !IMPACTS.includes(impact)) continue;
      events.push({
        title: field(b, "title"),
        currency,
        date: field(b, "date"),
        time: field(b, "time"),
        impact: impact as "High" | "Medium",
        forecast: field(b, "forecast"),
        previous: field(b, "previous"),
        url: field(b, "url"),
      });
    }
    return events;
  },
);
