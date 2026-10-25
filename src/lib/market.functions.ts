import { createServerFn } from "@tanstack/react-start";
import { collectMarketBriefing, type MarketBriefing } from "./market-feed";

let cached: MarketBriefing | undefined;
let pending: Promise<MarketBriefing> | undefined;

/** Only fixed public feed URLs are fetched. No credentials or user data leave the app. */
export const getMarketBriefing = createServerFn({ method: "GET" }).handler(async () => {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 5 * 60_000) return cached;
  pending ??= collectMarketBriefing()
    .then((result) => {
      // A failed refresh must not silently become an old, apparently fresh briefing.
      cached = result;
      return result;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
});
