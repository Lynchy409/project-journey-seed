import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  classifyMarketTopic,
  isMarketRelevantWorldHeadline,
  safeExternalUrl,
  type MarketTopic,
} from "./market-context";

export type FeedSource = {
  id: string;
  name: string;
  url: string;
  home: string;
  kind: "reporting" | "official" | "perspective";
  hosts: string[];
};

export const FEED_SOURCES: FeedSource[] = [
  {
    id: "bbc-business",
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    home: "https://www.bbc.co.uk/news/business",
    kind: "reporting",
    hosts: ["bbc.co.uk", "bbc.com"],
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    home: "https://www.bbc.co.uk/news/world",
    kind: "reporting",
    hosts: ["bbc.co.uk", "bbc.com"],
  },
  {
    id: "fed-policy",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    home: "https://www.federalreserve.gov/monetarypolicy.htm",
    kind: "official",
    hosts: ["federalreserve.gov"],
  },
  {
    id: "fed-speeches",
    name: "Federal Reserve speeches",
    url: "https://www.federalreserve.gov/feeds/speeches.xml",
    home: "https://www.federalreserve.gov/newsevents/speeches.htm",
    kind: "perspective",
    hosts: ["federalreserve.gov"],
  },
  {
    id: "ecb-blog",
    name: "ECB Blog",
    url: "https://www.ecb.europa.eu/rss/blog.html",
    home: "https://www.ecb.europa.eu/press/blog/html/index.en.html",
    kind: "perspective",
    hosts: ["ecb.europa.eu"],
  },
];

export type MarketHeadline = {
  title: string;
  url: string;
  publishedAt: string;
  sourceId: string;
  publisher: string;
  author: string | null;
  kind: FeedSource["kind"];
  topic: MarketTopic;
};

export type FeedHealth = {
  id: string;
  name: string;
  home: string;
  status: "ok" | "empty" | "unavailable";
  newestAt: string | null;
};
export type MarketBriefing = {
  fetchedAt: string;
  headlines: MarketHeadline[];
  sources: FeedHealth[];
};

function text(value: unknown): string {
  if (typeof value === "string")
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  if (value && typeof value === "object" && "#text" in value) return text(value["#text"]);
  return "";
}

export function parseMarketFeed(
  xml: string,
  source: FeedSource,
  now = Date.now(),
): MarketHeadline[] {
  if (
    xml.length > 1_500_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  ) {
    throw new Error("Unsupported feed document");
  }
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: true }).parse(xml);
  const raw = parsed?.rss?.channel?.item ?? parsed?.feed?.entry;
  if (!parsed?.rss && !parsed?.feed) throw new Error("Not an RSS or Atom feed");
  const items: Record<string, unknown>[] = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const seen = new Set<string>();
  const rows: MarketHeadline[] = [];
  for (const item of items.slice(0, 100)) {
    const links = Array.isArray(item["link"]) ? item["link"] : [item["link"]];
    const link = links.find(
      (l) => typeof l === "string" || (l && (!l["@_rel"] || l["@_rel"] === "alternate")),
    );
    const url = safeExternalUrl(typeof link === "string" ? link : link?.["@_href"]);
    const title = text(item["title"]).slice(0, 320);
    const published = Date.parse(
      text(item["pubDate"] ?? item["published"] ?? item["updated"] ?? item["dc:date"]),
    );
    if (!url || !title || !Number.isFinite(published) || published > now + 300_000) continue;
    const host = new URL(url).hostname;
    if (!source.hosts.some((h) => host === h || host.endsWith(`.${h}`)) || seen.has(url)) continue;
    seen.add(url);
    rows.push({
      title,
      url,
      publishedAt: new Date(published).toISOString(),
      sourceId: source.id,
      publisher: source.name,
      author: text(item["dc:creator"] ?? item["author"]) || null,
      kind: source.kind,
      topic: classifyMarketTopic(title),
    });
  }
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 20);
}

export async function collectMarketBriefing(
  fetcher: typeof fetch = fetch,
): Promise<MarketBriefing> {
  const results = await Promise.all(
    FEED_SOURCES.map(async (source) => {
      try {
        const response = await fetcher(source.url, {
          signal: AbortSignal.timeout(8000),
          headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          },
          redirect: "error",
        });
        if (!response.ok || Number(response.headers.get("content-length")) > 1_500_000)
          throw new Error("Feed unavailable");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty response");
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 1_500_000) {
            await reader.cancel();
            throw new Error("Feed too large");
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const rows = parseMarketFeed(new TextDecoder().decode(bytes), source).filter(
          (row) => source.id !== "bbc-world" || isMarketRelevantWorldHeadline(row.title),
        );
        return {
          rows,
          health: {
            id: source.id,
            name: source.name,
            home: source.home,
            status: rows.length ? "ok" : "empty",
            newestAt: rows[0]?.publishedAt ?? null,
          } as FeedHealth,
        };
      } catch {
        return {
          rows: [],
          health: {
            id: source.id,
            name: source.name,
            home: source.home,
            status: "unavailable",
            newestAt: null,
          } as FeedHealth,
        };
      }
    }),
  );
  const seen = new Set<string>();
  const headlines = results
    .flatMap((r) => r.rows)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((h) => !seen.has(h.url) && !!seen.add(h.url));
  return { fetchedAt: new Date().toISOString(), headlines, sources: results.map((r) => r.health) };
}
