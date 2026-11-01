/** Curated reading library: proven, high-signal sources. Summaries are the app's own words. */
export type WisdomCategory = "psychology" | "icons" | "drivers" | "stories";

export const WISDOM_CATEGORIES: { value: WisdomCategory; label: string }[] = [
  { value: "psychology", label: "Psychology" },
  { value: "icons", label: "Buffett & icons" },
  { value: "drivers", label: "What moves markets" },
  { value: "stories", label: "Legendary stories" },
];

export type WisdomItem = {
  id: string;
  category: WisdomCategory;
  title: string;
  source: string;
  minutes: number;
  hook: string;
  takeaway: string;
  url: string;
};

export const WISDOM: WisdomItem[] = [
  {
    id: "douglas-five-truths",
    category: "psychology",
    title: "The five fundamental truths of trading",
    source: "Mark Douglas · Trading in the Zone",
    minutes: 6,
    hook: "Why a great setup can still lose, and why that is fine.",
    takeaway:
      "Anything can happen. You don't need to know what happens next to make money. Each trade is unique; your edge only shows across many trades.",
    url: "https://en.wikipedia.org/wiki/Mark_Douglas_(trader)",
  },
  {
    id: "seykota-wizards",
    category: "psychology",
    title: "Ed Seykota: everybody gets what they want",
    source: "Jack Schwager · Market Wizards",
    minutes: 8,
    hook: "The trend-follower who says losing traders secretly want to lose.",
    takeaway:
      "Cut losses, ride winners, keep bets small, follow the rules without question. The hard part is emotional, not technical.",
    url: "https://en.wikipedia.org/wiki/Market_Wizards",
  },
  {
    id: "steenbarger-coach",
    category: "psychology",
    title: "Train like an athlete, trade like a pro",
    source: "Brett Steenbarger · TraderFeed",
    minutes: 5,
    hook: "A performance psychologist on building process, not chasing P&L.",
    takeaway:
      "Treat every session like training: a clear process, deliberate review, and one thing to improve tomorrow.",
    url: "https://traderfeed.blogspot.com/",
  },
  {
    id: "kahneman-loss",
    category: "psychology",
    title: "Loss aversion: why a −£100 hurts twice as much",
    source: "Daniel Kahneman · Nobel lecture",
    minutes: 10,
    hook: "The bias behind moving stops and cutting winners early.",
    takeaway:
      "Losses feel about twice as strong as equal gains. Pre-set stops and targets so the decision is made before the feeling arrives.",
    url: "https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/lecture/",
  },
  {
    id: "buffett-letters",
    category: "icons",
    title: "Berkshire Hathaway shareholder letters",
    source: "Warren Buffett",
    minutes: 15,
    hook: "Sixty years of plain-English wisdom on patience and risk.",
    takeaway:
      "The market transfers money from the impatient to the patient. Stay inside your circle of competence and wait for the fat pitch.",
    url: "https://www.berkshirehathaway.com/letters/letters.html",
  },
  {
    id: "marks-memos",
    category: "icons",
    title: "Howard Marks memos: second-level thinking",
    source: "Oaktree Capital",
    minutes: 12,
    hook: "Being right isn't enough; you must be more right than the crowd.",
    takeaway:
      "First-level thinking says 'good news, buy'. Second-level asks 'what is already priced in, and what does everyone else expect?'",
    url: "https://www.oaktreecapital.com/insights/memos",
  },
  {
    id: "munger-inversion",
    category: "icons",
    title: "Charlie Munger: invert, always invert",
    source: "Poor Charlie's Almanack",
    minutes: 7,
    hook: "Avoid stupidity instead of trying to be brilliant.",
    takeaway:
      "Ask 'how would I blow this account?' then refuse to do those things. Avoiding big errors beats finding genius trades.",
    url: "https://www.stripe.press/poor-charlies-almanack",
  },
  {
    id: "ptj-defense",
    category: "icons",
    title: "Paul Tudor Jones: play great defence",
    source: "Market Wizards interview",
    minutes: 6,
    hook: "The billionaire macro trader obsessed with not losing.",
    takeaway:
      "Think about what you could lose, not what you could make. Defence first; the offence takes care of itself.",
    url: "https://en.wikipedia.org/wiki/Paul_Tudor_Jones",
  },
  {
    id: "dalio-machine",
    category: "drivers",
    title: "How the economic machine works",
    source: "Ray Dalio · 30-minute video",
    minutes: 30,
    hook: "Credit, debt cycles and productivity in one animated explainer.",
    takeaway:
      "Most short-term moves come from credit expanding and contracting. Central banks steer it with rates and money printing.",
    url: "https://www.economicprinciples.org/",
  },
  {
    id: "rate-differentials",
    category: "drivers",
    title: "Why interest rates drive currencies",
    source: "Bank of England · Knowledge Bank",
    minutes: 6,
    hook: "Money flows to where it earns the most, adjusted for risk.",
    takeaway:
      "When markets expect UK rates to rise relative to US rates, GBP/USD tends to rise. It's the expectation that moves price.",
    url: "https://www.bankofengland.co.uk/knowledgebank",
  },
  {
    id: "priced-in",
    category: "drivers",
    title: "Priced in: why price falls on good news",
    source: "Federal Reserve · How monetary policy works",
    minutes: 7,
    hook: "The number vs the forecast is what matters.",
    takeaway:
      "Markets trade surprises. A 'strong' jobs report that was weaker than forecast can still sink the dollar.",
    url: "https://www.federalreserve.gov/monetarypolicy.htm",
  },
  {
    id: "yields-dollar",
    category: "drivers",
    title: "Bond yields and the US dollar",
    source: "US Treasury · Daily yield curve",
    minutes: 5,
    hook: "The 10-year yield is the world's most watched price.",
    takeaway:
      "Rising US yields usually pull money into dollars. Check the 2- and 10-year yields before a USD trade.",
    url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
  },
  {
    id: "black-wednesday",
    category: "stories",
    title: "Black Wednesday: the man who broke the Bank of England",
    source: "1992 · George Soros & GBP",
    minutes: 8,
    hook: "A £10bn bet against sterling and a £1bn day.",
    takeaway:
      "Policy that fights economic reality eventually breaks. Soros sized up because the downside was small and the upside huge.",
    url: "https://en.wikipedia.org/wiki/Black_Wednesday",
  },
  {
    id: "snb-2015",
    category: "stories",
    title: "The Swiss franc shock of 2015",
    source: "SNB removes the EUR/CHF floor",
    minutes: 6,
    hook: "A 30% move in minutes that wiped out brokers.",
    takeaway:
      "Stops don't guarantee fills. Never risk more than you can survive on a gap.",
    url: "https://en.wikipedia.org/wiki/Swiss_franc#2015_removal_of_the_exchange_rate_ceiling",
  },
  {
    id: "barings",
    category: "stories",
    title: "Nick Leeson and the fall of Barings Bank",
    source: "1995 · Singapore futures desk",
    minutes: 8,
    hook: "One hidden account, doubling down, a 233-year-old bank gone.",
    takeaway:
      "Hiding losses and revenge-sizing is how accounts die. Log every trade honestly.",
    url: "https://en.wikipedia.org/wiki/Nick_Leeson",
  },
  {
    id: "carry-trade",
    category: "stories",
    title: "The yen carry trade unwind",
    source: "August 2024 · global sell-off",
    minutes: 7,
    hook: "How cheap money in Tokyo shook every market in a week.",
    takeaway:
      "When a crowded, borrowed trade reverses, everything correlates. Watch JPY when risk feels calm.",
    url: "https://en.wikipedia.org/wiki/Carry_(investment)",
  },
];

/** Same pick all day, rotating through unread items first. */
export function dailyPick(dateISO: string, readIds: Set<string>): WisdomItem {
  const unread = WISDOM.filter((w) => !readIds.has(w.id));
  const pool = unread.length ? unread : WISDOM;
  const seed = [...dateISO].reduce((s, c) => s + c.charCodeAt(0), 0);
  return pool[seed % pool.length]!;
}
