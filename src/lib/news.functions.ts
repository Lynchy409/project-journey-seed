import { createServerFn } from "@tanstack/react-start";
import { parseCalendarEvents } from "./economic-calendar";
import type { NewsEvent } from "./economic-calendar";
export type { NewsEvent } from "./economic-calendar";

let cached: { at: number; events: NewsEvent[] } | undefined;
let pending: Promise<NewsEvent[]> | undefined;

export const getNewsEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsEvent[]> => {
    if (cached && Date.now() - cached.at < 30 * 60_000) return cached.events;
    pending ??= (async () => {
      const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error("Calendar feed unavailable");
      const events = parseCalendarEvents(await res.json());
      cached = { at: Date.now(), events };
      return events;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  },
);
