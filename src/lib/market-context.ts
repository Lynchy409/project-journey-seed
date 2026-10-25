export type MarketTopic = "policy" | "inflation" | "jobs" | "growth" | "risk" | "mechanics";

export const MARKET_CONTEXT: Record<
  MarketTopic,
  {
    title: string;
    summary: string;
    task: string;
    lesson: string;
    source: string;
    sourceName: string;
  }
> = {
  policy: {
    title: "Rates and central banks",
    summary:
      "Read the decision and the explanation separately. A policy announcement is not a guaranteed currency direction; compare it with expectations and the other currency's outlook.",
    task: "Read one central-bank statement. Write what changed, what stayed the same and what remains uncertain.",
    lesson: "m3l1",
    source: "https://www.bankofengland.co.uk/monetary-policy",
    sourceName: "Bank of England: monetary policy",
  },
  inflation: {
    title: "Inflation and price data",
    summary:
      "Check what the release measures, its period, the previous reading and any revisions. Keep the published number separate from an analyst's interpretation of it.",
    task: "Choose one inflation release. Identify the measure, date and comparison period before interpreting the headline.",
    lesson: "m3l2",
    source: "https://www.bankofengland.co.uk/knowledgebank/what-is-inflation",
    sourceName: "Bank of England: what inflation means",
  },
  jobs: {
    title: "Jobs and wages",
    summary:
      "Employment, unemployment and wage measures describe different things. Read the release and revisions instead of treating a single headline as the whole economy.",
    task: "Find the original employment release behind a headline. Note the reference period and one limitation.",
    lesson: "m3l2",
    source: "https://www.federalreserve.gov/monetarypolicy.htm",
    sourceName: "Federal Reserve: policy objectives",
  },
  growth: {
    title: "Growth and business conditions",
    summary:
      "Ask whether the story is a data release, a survey, a forecast or commentary. A forecast is not an observed result, and one country's story does not explain both sides of a currency pair.",
    task: "Read one growth story. Separate the reported fact, forecast and interpretation into three sentences.",
    lesson: "m3l2",
    source: "https://www.federalreserve.gov/monetarypolicy.htm",
    sourceName: "Federal Reserve: policy background",
  },
  risk: {
    title: "World events and market sentiment",
    summary:
      "Geopolitics, trade and energy stories provide context, not an automatic buy or sell signal. Check dates and sources, and test any claimed relationship against your own observations.",
    task: "Read one world-market story. Write a possible transmission channel, a counterargument and what evidence you would check.",
    lesson: "m3l3",
    source: "https://www.federalreserve.gov/monetarypolicy.htm",
    sourceName: "Federal Reserve: policy background",
  },
  mechanics: {
    title: "Spreads, execution and risk",
    summary:
      "Before a release, check your broker's spread, order rules and risk limits. The calendar is a planning aid, not a promise of direction or a complete list of market risks.",
    task: "Before and after a scheduled release, observe the spread without placing a trade. Record what changed.",
    lesson: "m1l4",
    source: "https://www.fca.org.uk/firms/contract-for-differences",
    sourceName: "FCA: risks of leveraged trading",
  },
};

/** Topic tags are an organisational heuristic, not an explanation of a market move. */
export function classifyMarketTopic(title: string): MarketTopic {
  if (/inflation|\bcpi\b|\bpce\b|prices/i.test(title)) return "inflation";
  if (/payroll|employment|unemployment|jobs|wages/i.test(title)) return "jobs";
  if (/rate|central bank|fomc|monetary|powell|lagarde|bailey/i.test(title)) return "policy";
  if (/\bgdp\b|\bpmi\b|growth|retail|economy|economic/i.test(title)) return "growth";
  return "risk";
}

/** Broad world reporting needs a relevance gate; this is not a market-impact score. */
export function isMarketRelevantWorldHeadline(title: string): boolean {
  return /\b(econom(y|ic|ies)|markets?|currenc(y|ies)|banks?|rates?|inflation|prices?|trade|tariffs?|sanctions?|oil|gas|energy|shipping|supply|exports?|imports?|budgets?|tax(es)?|debt|bonds?|elections?|protests?|war|conflict|ceasefire|china|dollar|euro|yen|sterling)\b/i.test(
    title,
  );
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
