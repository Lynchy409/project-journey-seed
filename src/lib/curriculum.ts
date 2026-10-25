import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "./day";

/* -------------------------------- content --------------------------------- */

export type Lesson = {
  id: string;
  title: string;
  content: string;
  question: string;
  answer: string;
};
export type Module = { id: string; title: string; blurb: string; lessons: Lesson[] };
export type Term = {
  id: string;
  term: string;
  definition: string;
  example: string;
  question: string;
  answer: string;
};

export const MODULES: Module[] = [
  {
    id: "m1",
    title: "1 · How the market works",
    blurb: "The plumbing behind the price you see on the chart.",
    lessons: [
      {
        id: "m1l1",
        title: "What forex actually is",
        content:
          "Forex is the exchange of one currency for another. When you 'buy GBP/USD' you are buying pounds and selling dollars. The market is decentralised: there is no single exchange. Instead, prices are formed across a global network of banks, brokers and electronic venues. That is why spreads and liquidity change throughout the day, and why the same pair can behave differently in Sydney's morning versus London's open.",
        question: "When you buy GBP/USD, what are you actually doing?",
        answer: "Buying pounds and selling dollars at the same time.",
      },
      {
        id: "m1l2",
        title: "Pips, points and pipettes",
        content:
          "A pip is the standard unit of price movement: usually the 4th decimal place (0.0001). For JPY pairs it is the 2nd decimal (0.01) because yen is worth roughly 1/100 of a dollar. A pipette is a tenth of a pip — the 5th decimal you see on broker quotes. If EUR/USD moves from 1.0850 to 1.0851, that is one pip.",
        question: "On USD/JPY, what is one pip worth in price terms?",
        answer: "0.01 — the second decimal place, because JPY pairs quote pips differently.",
      },
      {
        id: "m1l3",
        title: "Lots, units and position size",
        content:
          "A standard lot is 100,000 units of the base currency. A mini lot is 10,000; a micro lot is 1,000; a nano lot is 100. Your position size is not a decision about conviction — it is a maths decision that controls how many pips of movement your account can absorb. This is why the lot size calculator exists: risk is fixed first, size falls out of the maths.",
        question: "How many units are in a mini lot?",
        answer: "10,000 units.",
      },
      {
        id: "m1l4",
        title: "The spread and how you pay it",
        content:
          "The spread is the gap between the bid (what buyers will pay you) and the ask (what sellers want). Every market order crosses this gap, so every trade starts slightly negative. On GBP/USD a 1-pip spread means a 10,000-unit position starts about $1 down. Spreads widen at rollover (5pm New York), during low-liquidity hours, and around news. Always check the spread before entering, not after.",
        question: "Why does every new trade start slightly negative?",
        answer:
          "Because you buy at the ask and can only sell at the bid — the spread is paid immediately.",
      },
      {
        id: "m1l5",
        title: "Leverage and margin",
        content:
          "Leverage lets you control a position larger than your deposit. 1:30 leverage means £1,000 of margin controls £30,000 of currency. Margin is the deposit locked to hold the position. Leverage does not increase your risk by itself — position size does. 1:30 leverage with a tight stop can be safer than 1:5 with a wide one. Used badly, leverage turns a normal loss into an account-ending one.",
        question: "Does higher leverage automatically mean more risk?",
        answer:
          "No. Risk comes from position size and stop distance. Leverage only sets how much margin is required.",
      },
      {
        id: "m1l6",
        title: "Slippage, swaps and rollover",
        content:
          "Slippage is the difference between the price you clicked and the price you got — common on news and thin liquidity. Swaps (rollover) are interest paid or earned for holding a position overnight, based on the interest-rate difference between the two currencies. Rollover happens at 5pm New York, when spreads also widen. If you hold trades for days, swaps matter; if you day trade, they mostly do not.",
        question: "What is a swap in forex?",
        answer: "The overnight interest paid or earned for holding a position past 5pm New York.",
      },
    ],
  },
  {
    id: "m2",
    title: "2 · Sessions, liquidity and structure",
    blurb: "Who is in the market, when, and how price actually moves.",
    lessons: [
      {
        id: "m2l1",
        title: "The three sessions",
        content:
          "Sydney/Tokyo, London and New York. London is the biggest centre and the London–New York overlap (roughly 1pm–5pm UK time) is the most liquid window of the day. More liquidity usually means tighter spreads and cleaner moves. The Asian session often ranges; London open often breaks that range. Your strategies should expect different behaviour in different sessions.",
        question: "Which window has the deepest liquidity of the day?",
        answer: "The London–New York overlap.",
      },
      {
        id: "m2l2",
        title: "Liquidity: who moves price",
        content:
          "Price moves because of orders, not opinions. The biggest players are banks, funds and corporates, whose orders are too large to fill at one price — so they fill across a range, which is what creates order flow and structure. Stop-loss clusters sitting above highs and below lows are liquidity pools. Much of technical trading is really trading where liquidity is resting.",
        question: "Why do big players move price gradually instead of at one price?",
        answer:
          "Their orders are too large to fill at a single price, so they fill across a range.",
      },
      {
        id: "m2l3",
        title: "Market structure basics",
        content:
          "Uptrends are higher highs and higher lows; downtrends are lower highs and lower lows. A break of structure (BOS) is a continuation signal; a change of character (CHoCH) is the first hint the trend is failing. These are the terms behind order blocks and FVGs: an order block is where big orders were filled; a fair value gap is an imbalance where price moved so fast one side of the trade never got filled — the market often returns to rebalance it.",
        question: "What is the difference between a BOS and a CHoCH?",
        answer:
          "BOS continues the trend; CHoCH is the first break against it — a possible reversal signal.",
      },
      {
        id: "m2l4",
        title: "Risk-reward and expectancy",
        content:
          "R is your risk unit: the money between entry and stop. A 2R winner means you made twice your risk. Expectancy = (win% × avg win) − (loss% × avg loss). A 40% win rate with 1:3 R:R is strongly profitable; a 70% win rate with 1:0.5 can be a slow bleed. Win rate alone tells you almost nothing — which is why the app tracks R, not just wins.",
        question: "Can a 40% win-rate strategy be profitable?",
        answer:
          "Yes, if the average winner is much bigger than the average loser — expectancy is what matters.",
      },
    ],
  },
  {
    id: "m3",
    title: "3 · World markets and news",
    blurb: "The events and forces that move currencies.",
    lessons: [
      {
        id: "m3l1",
        title: "Central banks and interest rates",
        content:
          "The single biggest driver of a currency's value is its interest-rate path. Higher rates attract capital; expectations of cuts repel it. The Bank of England, Fed, ECB and BOJ set rates at scheduled meetings — and their tone matters as much as the decision. 'Hawkish' means leaning towards tighter policy; 'dovish' the opposite.",
        question: "What usually happens to a currency when its central bank signals higher rates?",
        answer: "It tends to strengthen, as higher rates attract capital.",
      },
      {
        id: "m3l2",
        title: "Inflation data: CPI and friends",
        content:
          "Inflation reports (CPI) move markets because they steer central bank decisions. Employment data (NFP in the US) does the same. GDP, retail sales and PMI surveys add context. High-impact releases are marked red on the economic calendar — the app's News tab pulls exactly these. Trading through a red release is a volatility decision, not a skill decision.",
        question: "Why does CPI move currencies so much?",
        answer:
          "Inflation steers central bank rate decisions, and rate expectations drive currency value.",
      },
      {
        id: "m3l3",
        title: "Correlations and the dollar",
        content:
          "The US dollar is on one side of roughly 85% of trades, so USD news moves almost everything. EUR/USD and GBP/USD usually move together; EUR/USD and USD/CHF usually move opposite. 'Risk-on' environments weaken safe-havens (JPY, CHF, USD); 'risk-off' strengthens them. If two correlated pairs give you two signals, that is one trade, not two.",
        question: "Why does USD news affect nearly every pair?",
        answer: "The dollar is on one side of about 85% of all forex trades.",
      },
      {
        id: "m3l4",
        title: "Reading the calendar properly",
        content:
          "For each event check: impact rating, the forecast, the previous number, and the time. The market reacts to the gap between forecast and actual — not to the number itself. Also check whether the event lands inside your trading session. A strong trade idea taken 10 minutes before CPI is not a strong trade.",
        question: "What actually moves the market when news drops?",
        answer: "The surprise — the gap between the forecast and the actual figure.",
      },
    ],
  },
  {
    id: "m4",
    title: "4 · Process: turning knowledge into skill",
    blurb: "Backtesting, journalling and reviewing — where the edge is actually built.",
    lessons: [
      {
        id: "m4l1",
        title: "Why backtest",
        content:
          "Backtesting answers: does this setup, defined by these exact rules, have a history of paying? Without it you are guessing which confluences matter. Do it on TradingView bar-by-bar with fixed rules, log every result in the Backtest tab, and keep backtest, demo and live results separate — mixing them makes every number meaningless.",
        question: "Why should backtest and live results never be blended?",
        answer:
          "They are different evidence. Blending them hides whether your edge survives real conditions.",
      },
      {
        id: "m4l2",
        title: "Journal to find your patterns",
        content:
          "Every field in the trade log is a filter you can search later. Splitting a trade into setup, timeframe, confluences, confirmation and emotions is what lets you discover things like 'my 1-minute order block entries lose more than they win'. One insight like that is worth more than a hundred unlogged trades.",
        question: "What is the point of structured trade fields?",
        answer:
          "Each field becomes searchable, so patterns in your winners and losers become visible.",
      },
      {
        id: "m4l3",
        title: "Review cycle",
        content:
          "The loop: prepare → observe → trade → review → extract a lesson → test the lesson → refine the plan. Process grade and outcome are separate things — a rule-break that wins is still a rule-break, and a plan-followed loss is still data. Review weekly, not just per-trade: patterns live across trades, not inside one.",
        question: "A trade broke your rules but won. Is that a good trade?",
        answer:
          "No — outcome and process are graded separately. The rule break is the lesson, not the profit.",
      },
    ],
  },
];

export const TERMS: Term[] = [
  {
    id: "t-pip",
    term: "Pip",
    definition: "Smallest standard price movement — 4th decimal on most pairs, 2nd on JPY pairs.",
    example: "EUR/USD 1.0850 → 1.0851 is one pip.",
    question: "How many pips is a move from 150.00 to 150.10 on USD/JPY?",
    answer: "10 pips.",
  },
  {
    id: "t-spread",
    term: "Spread",
    definition: "Gap between bid and ask. Your immediate cost of entering.",
    example: "Bid 1.0849 / Ask 1.0851 = 2-pip spread.",
    question: "Who pays the spread?",
    answer: "You — on every single entry.",
  },
  {
    id: "t-leverage",
    term: "Leverage",
    definition:
      "Controls a position larger than your deposit. Sets margin required, not your risk.",
    example: "1:30 means £1,000 margin holds a £30,000 position.",
    question: "Does leverage decide how much you can lose?",
    answer: "No — position size and stop distance do.",
  },
  {
    id: "t-margin",
    term: "Margin",
    definition: "Deposit locked to hold a leveraged position.",
    example: "£1,000 locked to hold £30,000 at 1:30.",
    question: "What happens to margin while a trade is open?",
    answer: "It stays locked until the trade closes.",
  },
  {
    id: "t-lot",
    term: "Lot",
    definition: "Position size unit. Standard 100k, mini 10k, micro 1k, nano 100.",
    example: "0.10 lots = 10,000 units = one mini lot.",
    question: "How many units is 0.5 standard lots?",
    answer: "50,000.",
  },
  {
    id: "t-swap",
    term: "Swap / Rollover",
    definition:
      "Overnight interest earned or paid, set by the rate difference between the two currencies.",
    example: "Holding a high-rate vs low-rate pair long can earn swap.",
    question: "When is rollover applied?",
    answer: "5pm New York, daily.",
  },
  {
    id: "t-slippage",
    term: "Slippage",
    definition: "Difference between the price you clicked and the price you got.",
    example: "Clicked 1.0850, filled 1.0853 during news.",
    question: "When is slippage worst?",
    answer: "News releases and thin liquidity.",
  },
  {
    id: "t-bos",
    term: "Break of structure (BOS)",
    definition: "Price breaks the last swing in the trend's direction — continuation.",
    example: "Uptrend makes a new high after pullback.",
    question: "BOS signals what?",
    answer: "Trend continuation.",
  },
  {
    id: "t-choch",
    term: "Change of character (CHoCH)",
    definition: "First break against the prevailing trend — possible reversal warning.",
    example: "Uptrend fails to make a new high and breaks the last low.",
    question: "CHoCH signals what?",
    answer: "Possible trend reversal — the first crack.",
  },
  {
    id: "t-ob",
    term: "Order block",
    definition:
      "Candle/zone where large orders were filled before a strong move — often revisited.",
    example: "Down candle before an impulsive rally becomes a bullish OB.",
    question: "Why does price often return to an order block?",
    answer: "Unfilled institutional interest remains in that zone.",
  },
  {
    id: "t-fvg",
    term: "Fair value gap (FVG)",
    definition: "Imbalance where price moved so fast one side never traded — often rebalanced.",
    example: "Gap between candle 1's high and candle 3's low.",
    question: "What does an FVG represent?",
    answer: "An imbalance the market may return to fill.",
  },
  {
    id: "t-liquidity",
    term: "Liquidity",
    definition:
      "Ease of trading at stable prices. Stops cluster above highs/below lows — these pools draw price.",
    example: "Equal highs on GBP/USD = resting buy stops above.",
    question: "Where do liquidity pools usually sit?",
    answer: "Beyond obvious highs, lows and round numbers.",
  },
  {
    id: "t-r",
    term: "R (risk unit)",
    definition:
      "Money between your entry and stop. Results measured in R are comparable across account sizes.",
    example: "2R = made twice your risk.",
    question: "Why measure results in R?",
    answer: "It normalises results regardless of account size or risk %.",
  },
  {
    id: "t-expectancy",
    term: "Expectancy",
    definition: "(Win% × avg win) − (Loss% × avg loss). The real number behind win rate.",
    example: "40% wins at 3R vs 60% losses at 1R = positive.",
    question: "Win rate 70%, average loss 3× average win — profitable?",
    answer: "No — the maths bleeds the account.",
  },
  {
    id: "t-hawkish",
    term: "Hawkish / Dovish",
    definition:
      "Central bank tone. Hawkish = tighter policy, strengthens currency. Dovish = looser.",
    example: "'We remain vigilant on inflation' = hawkish lean.",
    question: "Dovish statement, currency does what?",
    answer: "Usually weakens.",
  },
];

export const ALL_LESSONS: Lesson[] = MODULES.flatMap((m) => m.lessons);
export const CURRICULUM_ITEM_IDS = [...ALL_LESSONS.map((l) => l.id), ...TERMS.map((t) => t.id)];

/* ------------------------------- progress -------------------------------- */

export const progressQuery = queryOptions({
  queryKey: ["learning_progress"],
  queryFn: async () => {
    const { data, error } = await supabase.from("learning_progress").select("*");
    if (error) throw error;
    return data;
  },
});

export async function setProgress(item_id: string, status: "todo" | "learning" | "learned") {
  const user = await uid();
  const { error } = await supabase
    .from("learning_progress")
    .upsert({ item_id, status, user_id: user }, { onConflict: "user_id,item_id" });
  if (error) throw error;
}
