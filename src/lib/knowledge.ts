/** Curated Knowledge Vault: short, real lessons. Each carries recall facts that can be locked into the Recall bank. */
export type Topic =
  | "mind"
  | "history"
  | "health"
  | "money"
  | "markets"
  | "tech"
  | "social"
  | "spanish";

export const TOPICS: { id: Topic; label: string }[] = [
  { id: "mind", label: "Philosophy & discipline" },
  { id: "history", label: "History & figures" },
  { id: "health", label: "Health & breath" },
  { id: "money", label: "Money & business" },
  { id: "markets", label: "Economics & FX" },
  { id: "tech", label: "Coding & AI" },
  { id: "social", label: "Social skills" },
  { id: "spanish", label: "Spanish method" },
];

export type Fact = { q: string; a: string };
export type KnowledgePiece = {
  id: string;
  topic: Topic;
  title: string;
  story: string;
  lesson: string;
  apply: string;
  source?: { label: string; url: string };
  facts: Fact[];
};

export const LIBRARY: KnowledgePiece[] = [
  {
    id: "k-dichotomy",
    topic: "mind",
    title: "The dichotomy of control",
    story: "Epictetus was born a slave. He taught that some things are up to us (judgements, effort, actions) and most are not (results, other people, the market).",
    lesson: "Calm comes from putting all your energy into what you control and releasing the rest.",
    apply: "Before a trade or match, write one line: 'My job today is ___' — process only, never outcome.",
    source: { label: "Epictetus, Enchiridion (free)", url: "https://classics.mit.edu/Epictetus/epicench.html" },
    facts: [
      { q: "What is the Stoic dichotomy of control?", a: "Some things are up to us, our judgements effort and actions, and others are not, like outcomes and other people" },
      { q: "Which Stoic philosopher was born a slave?", a: "Epictetus" },
    ],
  },
  {
    id: "k-morning-aurelius",
    topic: "mind",
    title: "Marcus Aurelius on getting out of bed",
    story: "The most powerful man in the world wrote a private note to himself: at dawn, when you don't want to get up, remember you were made to do the work of a human being.",
    lesson: "Discipline isn't a feeling. Even emperors argued with themselves — the win is acting anyway.",
    apply: "When the alarm goes, say your first identity goal aloud and stand up before you negotiate.",
    source: { label: "Meditations, Book 5", url: "https://classics.mit.edu/Antoninus/meditations.5.five.html" },
    facts: [{ q: "What book contains Marcus Aurelius' private notes to himself?", a: "Meditations" }],
  },
  {
    id: "k-identity-habits",
    topic: "mind",
    title: "Identity-based habits",
    story: "James Clear argues lasting change starts with who you believe you are, not the goal. Each action is a vote for a type of person.",
    lesson: "Don't aim to 'run a marathon'; become 'a runner'. Small reps prove the identity.",
    apply: "Pick the smallest version of today's hardest task and do it — it still counts as a vote.",
    facts: [{ q: "In identity-based habits, what does each action count as?", a: "A vote for the type of person you want to become" }],
  },
  {
    id: "k-hannibal",
    topic: "history",
    title: "Hannibal crosses the Alps (218 BC)",
    story: "Carthage's general marched an army with war elephants over the Alps in winter to attack Rome from the north — the direction nobody defended.",
    lesson: "Attack where the opponent isn't prepared. The hard route is often the open one.",
    apply: "Find one advantage others avoid because it's uncomfortable — early mornings, cold showers, boring backtests.",
    facts: [
      { q: "Which general crossed the Alps with elephants to attack Rome?", a: "Hannibal of Carthage" },
      { q: "Roughly when did Hannibal cross the Alps?", a: "218 BC" },
    ],
  },
  {
    id: "k-churchill",
    topic: "history",
    title: "Churchill, May 1940",
    story: "With France collapsing, Britain's cabinet debated peace talks with Hitler. Churchill refused, and rallied the country with speeches like 'We shall fight on the beaches'.",
    lesson: "Leadership is choosing the harder right path when the easy option is on the table.",
    apply: "When you want to quit a plan mid-week, finish the week before deciding.",
    facts: [{ q: "In 1940, what did Churchill refuse to do as France fell?", a: "Open peace talks with Hitler, he chose to fight on" }],
  },
  {
    id: "k-black-wednesday",
    topic: "history",
    title: "Black Wednesday (1992)",
    story: "The UK tried to keep the pound inside the ERM by raising rates and buying sterling. George Soros bet against it; on 16 Sept 1992 Britain gave up and the pound crashed.",
    lesson: "Markets eventually beat a price that fundamentals can't support.",
    apply: "When a central bank defends a level against fundamentals, note it — pressure tends to build.",
    facts: [{ q: "On Black Wednesday 1992, what system did the pound leave?", a: "The European Exchange Rate Mechanism ERM" }],
  },
  {
    id: "k-co2",
    topic: "health",
    title: "CO2 tolerance and nasal breathing",
    story: "The urge to breathe is driven by CO2, not low oxygen. Training a calm tolerance to CO2 (slow nasal breathing, breath holds after an exhale) improves breathing efficiency.",
    lesson: "Nasal, slow, low breathing keeps you calm and economical — useful in both sprints and trades.",
    apply: "Try the BOLT test: after a normal exhale, hold until the first urge to breathe. Under 20 seconds means room to improve.",
    facts: [
      { q: "What mainly drives the urge to breathe?", a: "Rising carbon dioxide CO2, not low oxygen" },
      { q: "What is the BOLT test?", a: "Holding your breath after a normal exhale until the first urge to breathe" },
    ],
  },
  {
    id: "k-box",
    topic: "health",
    title: "Box breathing under pressure",
    story: "Used by special forces: inhale 4, hold 4, exhale 4, hold 4. Slow exhales activate the parasympathetic nervous system.",
    lesson: "You can't think your way calm, but you can breathe your way there.",
    apply: "Do 4 rounds before opening charts and before kick-off.",
    facts: [{ q: "What is the box breathing pattern?", a: "Inhale 4, hold 4, exhale 4, hold 4 seconds" }],
  },
  {
    id: "k-sleep",
    topic: "health",
    title: "Sleep is the performance drug",
    story: "Research on athletes (e.g. Stanford basketball players) showed extending sleep toward ~10 hours improved sprint times and shooting accuracy.",
    lesson: "Recovery happens in sleep. Missing it costs strength, speed and decision-making.",
    apply: "After a night shift, protect a dark, cool sleep block before planning training.",
    facts: [{ q: "What did the Stanford basketball sleep study find?", a: "Extending sleep improved sprint times and shooting accuracy" }],
  },
  {
    id: "k-rule72",
    topic: "money",
    title: "The Rule of 72",
    story: "Divide 72 by an annual return to estimate how many years money takes to double. At 8% a year, about 9 years.",
    lesson: "Compounding is slow, then sudden. Time in matters more than clever timing.",
    apply: "Pay yourself first: move a fixed amount on payday before spending anything.",
    facts: [
      { q: "What does the Rule of 72 estimate?", a: "How many years it takes money to double, 72 divided by the annual return" },
      { q: "At 8% a year, roughly how long to double your money?", a: "About 9 years" },
    ],
  },
  {
    id: "k-index",
    topic: "money",
    title: "Buffett's bet on index funds",
    story: "In 2007 Warren Buffett bet $1m that a cheap S&P 500 index fund would beat hedge funds over 10 years. He won comfortably.",
    lesson: "Low fees and broad ownership beat most active managers over time.",
    apply: "Long-term savings: index funds. Trading capital: separate, risk-capped account.",
    source: { label: "Berkshire 2017 letter", url: "https://www.berkshirehathaway.com/letters/2017ltr.pdf" },
    facts: [{ q: "What did Buffett bet would beat hedge funds over 10 years?", a: "A low cost S&P 500 index fund" }],
  },
  {
    id: "k-bitcoin",
    topic: "money",
    title: "What Bitcoin actually is",
    story: "Bitcoin (2009) is a digital currency with a fixed supply of 21 million, recorded on a public blockchain kept by a network rather than a bank.",
    lesson: "Its value story is scarcity and independence from central banks; its risk is extreme volatility.",
    apply: "Size any crypto exposure as money you could see fall 70% without changing your life.",
    facts: [{ q: "What is Bitcoin's maximum supply?", a: "21 million coins" }],
  },
  {
    id: "k-rates",
    topic: "markets",
    title: "Why interest rates move currencies",
    story: "Money flows toward higher, rising yields. If the Bank of England is expected to raise rates while the Fed holds, GBP/USD tends to strengthen.",
    lesson: "Currencies trade on rate differentials and expectations, not just the headline rate.",
    apply: "Before trading GBP/USD, note what markets expect from the BoE and the Fed.",
    facts: [{ q: "What mainly drives currency strength between two economies?", a: "The interest rate differential and expectations of future rates" }],
  },
  {
    id: "k-priced-in",
    topic: "markets",
    title: "Priced in: why good news can drop a currency",
    story: "Markets move on surprise versus expectation. A strong number that was expected (or weaker than forecast) can still sell off.",
    lesson: "Compare actual vs forecast, not good vs bad.",
    apply: "On Forex Factory, read the forecast column before any red-folder release.",
    facts: [{ q: "What actually moves a market on a data release?", a: "The surprise, the actual compared to the forecast or expectation" }],
  },
  {
    id: "k-inflation",
    topic: "markets",
    title: "Inflation and central banks",
    story: "Most central banks target ~2% inflation. When inflation runs hot they raise rates to cool spending; when growth stalls they cut.",
    lesson: "CPI releases matter because they shift rate expectations.",
    apply: "Mark CPI days for GBP and USD — expect volatility and size down.",
    facts: [{ q: "What inflation rate do most major central banks target?", a: "Around 2 percent" }],
  },
  {
    id: "k-supply-demand",
    topic: "markets",
    title: "Business 101: margin and moat",
    story: "Revenue is what comes in; profit margin is what's left. Buffett looks for a 'moat' — a durable advantage like a brand or network.",
    lesson: "Great businesses protect margins from competitors.",
    apply: "When you look at any company, ask: why can't someone copy this?",
    facts: [{ q: "What does Buffett mean by a moat?", a: "A durable competitive advantage that protects a business from competitors" }],
  },
  {
    id: "k-prompting",
    topic: "tech",
    title: "Prompting AI like a senior analyst",
    story: "AI gives better output with a role, context, a clear task, constraints and an example of the format you want.",
    lesson: "Vague in, vague out. Specific context is leverage.",
    apply: "Template: 'You are X. Context: Y. Task: Z. Constraints. Output format.'",
    facts: [{ q: "What five parts make a strong AI prompt?", a: "Role, context, task, constraints and output format or example" }],
  },
  {
    id: "k-llm",
    topic: "tech",
    title: "What a large language model does",
    story: "An LLM predicts the next token (word piece) based on patterns learned from huge amounts of text. It can be confidently wrong.",
    lesson: "Use AI for drafts, explanations and speed — verify facts that matter.",
    apply: "Ask the AI for its sources or reasoning on anything you'll act on.",
    facts: [{ q: "At its core, what does a large language model predict?", a: "The next token or word piece in a sequence" }],
  },
  {
    id: "k-code-basics",
    topic: "tech",
    title: "Coding in three ideas",
    story: "Almost all programs are variables (store data), conditions (if this, do that) and loops (repeat). Add functions to reuse steps.",
    lesson: "Code is just precise instructions. Break problems into small steps.",
    apply: "Write your trading checklist as if/then rules — that's pseudocode.",
    facts: [{ q: "What three building blocks make up most programs?", a: "Variables, conditions and loops" }],
  },
  {
    id: "k-listening",
    topic: "social",
    title: "Be interested, not interesting",
    story: "Dale Carnegie's core idea: people like those who make them feel heard. Ask about them, remember names, listen fully.",
    lesson: "Curiosity about others is the fastest way to build trust.",
    apply: "In your next conversation, ask two follow-up questions before sharing your own story.",
    facts: [{ q: "What is Carnegie's key to being liked?", a: "Be genuinely interested in other people and make them feel heard" }],
  },
  {
    id: "k-eye-tone",
    topic: "social",
    title: "Presence: posture, pace, pause",
    story: "Confident communicators speak slower, hold eye contact and are comfortable with short pauses instead of filler words.",
    lesson: "Calm delivery reads as confidence more than clever words.",
    apply: "Replace 'um' with a one-second pause today.",
    facts: [{ q: "What three habits signal confident communication?", a: "Speaking slower, steady eye contact and comfortable pauses" }],
  },
  {
    id: "k-cognates",
    topic: "spanish",
    title: "The cognate shortcut",
    story: "Thousands of English words convert with endings: -tion → -ción (nación), -ty → -dad (ciudad, realidad), -ly → -mente (rápidamente), -al stays (normal).",
    lesson: "You already know a huge Spanish vocabulary — you just need the conversion rules.",
    apply: "Turn 5 English words into Spanish today using these endings and say them in a sentence.",
    facts: [
      { q: "In Spanish, what does the English ending -tion usually become?", a: "-ción" },
      { q: "In Spanish, what does the English ending -ly usually become?", a: "-mente" },
      { q: "In Spanish, what does the English ending -ty usually become?", a: "-dad" },
    ],
  },
  {
    id: "k-input",
    topic: "spanish",
    title: "Comprehensible input",
    story: "Linguist Stephen Krashen showed we acquire language by understanding messages slightly above our level, not by memorising grammar tables.",
    lesson: "Read and listen to things you mostly understand, every day.",
    apply: "Read one short Spanish story aloud, then retell it in three sentences.",
    facts: [{ q: "What is comprehensible input?", a: "Understanding messages slightly above your level, how we acquire language" }],
  },
  {
    id: "k-story-madrid",
    topic: "spanish",
    title: "Lectura: Un día en Madrid",
    story: "Me levanto temprano. Quiero un café, así que voy a un bar pequeño. 'Un café con leche, por favor.' El camarero es muy simpático. Después, tomo el metro al centro. Hace sol y la ciudad es preciosa.",
    lesson: "Key words: me levanto (I get up), quiero (I want), así que (so), después (afterwards), hace sol (it's sunny).",
    apply: "Read it aloud twice, then say your own morning in Spanish using 'me levanto' and 'quiero'.",
    facts: [
      { q: "What does 'me levanto temprano' mean?", a: "I get up early" },
      { q: "What does 'así que' mean?", a: "So, therefore" },
      { q: "How do you say 'it's sunny' in Spanish?", a: "Hace sol" },
    ],
  },
];

/** Rotates one featured piece per day. */
export function pieceOfDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return LIBRARY[day % LIBRARY.length]!;
}

const STOP = new Set(
  "the a an of to and or in on at for is are was it its that this with by from as be your you what which how do does not like about into than but they them their there just also".split(" "),
);

export function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywords(answer: string) {
  return [...new Set(normalise(answer).split(" ").filter((w) => w.length > 2 && !STOP.has(w)))];
}

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "").slice(0, 6);

/** "Round about" grading: right if the answer contains enough of the key ideas, regardless of wording. */
export function gradeAnswer(given: string, answer: string): { correct: boolean; matched: number; total: number } {
  const g = normalise(given);
  if (!g) return { correct: false, matched: 0, total: 1 };
  const a = normalise(answer);
  if (g === a || (a.length <= 12 && g.includes(a))) return { correct: true, matched: 1, total: 1 };
  const keys = keywords(answer);
  if (!keys.length) return { correct: g === a, matched: 0, total: 1 };
  const words = g.split(" ").map(stem);
  const matched = keys.filter((k) => words.some((w) => w === stem(k) || (w.length > 3 && stem(k).startsWith(w)))).length;
  const need = keys.length <= 2 ? 1 : Math.ceil(keys.length * 0.4);
  return { correct: matched >= need, matched, total: keys.length };
}

export const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? id;
