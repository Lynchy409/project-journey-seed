import type { TradeRow } from "./trade";

export type Fill = { percent: string; price: string; cash: string; time: string };
export type SheetDetail = {
  lot: string;
  riskCash: string;
  exit: string;
  execution: string;
  outTf: string;
  outType: string;
  exitMode: string;
  fills: Fill[];
  nearNews: string;
  currencies: string[];
  newsText: string;
  followedPlan: string;
  original?: Record<string, string>;
  importKey?: string;
  importPosition?: number;
  sortAnchor?: string;
  dateUnknown?: boolean;
};
export const TYPES = ["LS", "OB", "FVG", "BB", "BOS", "CAN", "IFVG", "ATFA", "CHoCH"];
export const emptySheet = (): SheetDetail => ({
  lot: "",
  riskCash: "",
  exit: "",
  execution: "",
  outTf: "",
  outType: "",
  exitMode: "full",
  fills: [],
  nearNews: "",
  currencies: [],
  newsText: "",
  followedPlan: "",
});
export function sheetOf(t: { further_levels: unknown }): SheetDetail {
  const f = t.further_levels;
  if (!f || typeof f !== "object" || !("sheet" in f) || !f.sheet || typeof f.sheet !== "object")
    return emptySheet();
  return { ...emptySheet(), ...f.sheet } as SheetDetail;
}
export function numeric(s: unknown): number | null {
  if (s === null || s === undefined || String(s).trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function pipSize(pair: string) {
  return pair.toUpperCase().endsWith("JPY") ? 0.01 : pair.toUpperCase() === "XAUUSD" ? 0.1 : 0.0001;
}
export function calcTrade(
  pair: string,
  direction: string,
  entry: unknown,
  stop: unknown,
  target: unknown,
  d: SheetDetail,
) {
  const e = numeric(entry),
    s = numeric(stop),
    tp = numeric(target),
    x = numeric(d.exit);
  const sign = direction.toLowerCase() === "short" ? -1 : 1;
  const risk = e !== null && s !== null ? (e - s) * sign : null;
  let move: number | null = e !== null && x !== null ? (x - e) * sign : null;
  let closed = x !== null ? 100 : 0;
  if (d.exitMode === "scaled") {
    closed = d.fills.reduce((sum, f) => sum + (numeric(f.percent) ?? 0), 0);
    move =
      e !== null &&
      d.fills.length > 0 &&
      d.fills.every((f) => numeric(f.price) !== null && numeric(f.percent) !== null)
        ? d.fills.reduce(
            (sum, f) => sum + ((Number(f.price) - e) * sign * Number(f.percent)) / 100,
            0,
          )
        : null;
  }
  const full = closed === 100;
  return {
    closed,
    stopPips: risk !== null && risk > 0 ? risk / pipSize(pair) : null,
    plannedR:
      risk !== null && risk > 0 && tp !== null && e !== null && (tp - e) * sign > 0
        ? ((tp - e) * sign) / risk
        : null,
    pips: full && move !== null ? move / pipSize(pair) : null,
    realisedR: full && move !== null && risk !== null && risk > 0 ? move / risk : null,
  };
}
const aliases: Record<string, string> = {
  liquidity_draw: "LS",
  order_block: "OB",
  fvg: "FVG",
  breaker: "BB",
  bos: "BOS",
  choch: "CHoCH",
  ob_tap: "OB",
  fvg_fill: "FVG",
};
export const typeLabel = (s: string) => aliases[s] ?? s.toUpperCase();
export function htfOf(t: TradeRow): string[] {
  return Array.isArray(t.htf_confluences)
    ? t.htf_confluences.flatMap((c) => {
        if (!c || typeof c !== "object" || !("type" in c) || typeof c["type"] !== "string")
          return [];
        return [`${"tf" in c ? String(c["tf"]).toLowerCase() : ""} ${typeLabel(c["type"])}`.trim()];
      })
    : [];
}
export function execOf(t: TradeRow) {
  return (
    `${(t.entry_tf ?? "").toLowerCase()} ${typeLabel(sheetOf(t).execution || t.confirmation || t.setup || "")}`.trim() ||
    "Unknown"
  );
}
export function tradeMetric(t: TradeRow, metric: "R" | "Cash" | "Pips") {
  if (t.outcome === "open") return null;
  const d = sheetOf(t);
  const calc = calcTrade(t.pair, t.direction, t.entry, t.stop, t.target, d);
  if (metric === "Pips") return calc.pips;
  if (metric === "R") return t.result_r ?? calc.realisedR;
  const f = t.further_levels;
  return f && typeof f === "object" && "cash" in f ? numeric(f["cash"]) : null;
}
export function summary(rows: TradeRow[], metric: "R" | "Cash" | "Pips") {
  const closed = rows.filter((t) => ["win", "loss", "breakeven"].includes(t.outcome));
  const wins = closed.filter((t) => t.outcome === "win").length;
  const values = closed.map((t) => tradeMetric(t, metric)).filter((v): v is number => v !== null);
  return {
    count: closed.length,
    wins,
    losses: closed.filter((t) => t.outcome === "loss").length,
    winRate: closed.length ? (wins / closed.length) * 100 : null,
    coverage: values.length,
    total: values.length ? values.reduce((a, b) => a + b, 0) : null,
    average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
  };
}
export function groups(
  rows: TradeRow[],
  key: (t: TradeRow) => string[],
  metric: "R" | "Cash" | "Pips",
) {
  const map = new Map<string, TradeRow[]>();
  rows.forEach((t) => new Set(key(t)).forEach((k) => map.set(k, [...(map.get(k) ?? []), t])));
  return [...map]
    .map(([label, ts]) => ({ label, ...summary(ts, metric) }))
    .sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity));
}
export const HEADERS = [
  "Date",
  "Time",
  "Pair",
  "HTF TF",
  "HTF Type",
  "Exec TF",
  "Exec Type",
  "Out of TF",
  "Out of Type",
  "Entry price",
  "Exit price",
  "Dir",
  "Result",
  "Pips (auto)",
  "R",
  "News near entry (Y/N)",
  "News GBP",
  "News USD",
  "News EUR",
  "News JPY",
  "News text",
  "Notes",
  "Account",
  "Lot size",
  "Stop loss",
  "Take profit",
  "Planned RR",
  "Cash P&L",
  "Risk cash",
  "Exit mode",
  "Partials",
  "Followed plan",
];
export function sheetRow(t: TradeRow): (string | number)[] {
  const d = sheetOf(t),
    cs = htfOf(t),
    c = calcTrade(t.pair, t.direction, t.entry, t.stop, t.target, d);
  return [
    t.date,
    t.time_of_trade ?? "",
    t.pair,
    cs.map((v) => v.split(" ")[0]).join(" / "),
    cs.map((v) => v.split(" ").slice(1).join(" ")).join(" / "),
    t.entry_tf ?? "",
    d.execution || typeLabel(t.confirmation ?? t.setup ?? ""),
    d.outTf,
    d.outType,
    t.entry ?? "",
    d.exit,
    t.direction,
    t.outcome,
    c.pips ?? "",
    t.result_r ?? c.realisedR ?? "",
    d.nearNews,
    ...["GBP", "USD", "EUR", "JPY"].map((s) => (d.currencies.includes(s) ? "Y" : "")),
    d.newsText,
    t.notes ?? "",
    t.source,
    d.lot,
    t.stop ?? "",
    t.target ?? "",
    t.rr ?? c.plannedR ?? "",
    tradeMetric(t, "Cash") ?? "",
    d.riskCash,
    d.exitMode,
    d.fills
      .map(
        (f) =>
          `${f.percent}% @ ${f.price}${f.cash ? ` (${f.cash})` : ""}${f.time ? ` ${f.time}` : ""}`,
      )
      .join("; "),
    d.followedPlan,
  ];
}
export function csv(rows: TradeRow[]) {
  const quote = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [HEADERS, ...rows.map(sheetRow)].map((row) => row.map(quote).join(",")).join("\r\n");
}
export function parseDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (!match) return null;
  const [, day, month, yr] = match;
  if (!day || !month || !yr) return null;
  const year = yr.length === 2 ? "20" + yr : yr;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const dt = new Date(date + "T12:00:00Z");
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === date ? date : null;
}
export type ImportRow = {
  row: number;
  original: Record<string, string>;
  date: string;
  time: string;
  anchorDate: string;
  warnings: string[];
};
export function parseRows(rows: string[][]): ImportRow[] {
  const headers = rows[0];
  if (!headers || !headers.includes("HTF Type") || !headers.includes("Pair"))
    throw new Error("Expected the Trades sheet headers.");
  let anchorDate =
    rows
      .slice(1)
      .map((cells) => parseDate(cells[headers.indexOf("Date")] ?? ""))
      .find(Boolean) ?? "1970-01-01";
  return rows.slice(1).flatMap((cells, i) => {
    const original = Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ""]));
    if (!original["Pair"]?.trim()) return [];
    const date = parseDate(original["Date"] ?? "") ?? "";
    if (date) anchorDate = date;
    const time = /^([01]\d|2[0-3]):[0-5]\d/.test(original["Time"] ?? "")
      ? (original["Time"] ?? "").slice(0, 5)
      : "";
    const warnings = [
      ...(!date ? ["Missing date"] : []),
      ...(!time ? ["Unknown time"] : []),
      ...(!original["Entry price"] || !original["Exit price"] ? ["Missing prices"] : []),
    ];
    return [{ row: i + 2, original, date, time, anchorDate, warnings }];
  });
}
export function importPayload(r: ImportRow, source: string) {
  const o = r.original;
  const d = emptySheet();
  Object.assign(d, {
    exit: o["Exit price"] ?? "",
    execution: o["Exec Type"] ?? "",
    outTf: o["Out of TF"] ?? "",
    outType: o["Out of Type"] ?? "",
    nearNews: o["News near entry (Y/N)"] ?? "",
    newsText: o["News text"] ?? "",
    original: o,
    importKey: JSON.stringify(o),
    importPosition: r.row,
    sortAnchor: r.anchorDate,
    dateUnknown: !r.date,
    lot: o["Lot size"] ?? "",
    riskCash: o["Risk cash"] ?? "",
    followedPlan: o["Followed plan"] ?? "",
  });
  d.currencies = ["GBP", "USD", "EUR", "JPY"].filter((c) => o["News " + c]?.toUpperCase() === "Y");
  const tf = o["HTF TF"]?.toLowerCase() ?? "",
    type = o["HTF Type"] ?? "";
  return {
    date: r.date || r.anchorDate,
    traded_on: r.date || null,
    time_of_trade: r.time || null,
    pair: (o["Pair"] ?? "").toUpperCase(),
    source,
    strategy: "spreadsheet",
    direction: (o["Dir"] ?? "").toLowerCase(),
    outcome:
      o["Result"]?.toUpperCase() === "W"
        ? "win"
        : o["Result"]?.toUpperCase() === "L"
          ? "loss"
          : "breakeven",
    entry: numeric(o["Entry price"]),
    stop: numeric(o["Stop loss"]),
    target: numeric(o["Take profit"]),
    rr: numeric(o["Planned RR"]),
    result_r: numeric(o["R"]),
    entry_tf: o["Exec TF"]?.toLowerCase() || null,
    htf_confluences: type ? [{ tf, type, role: "context" }] : [],
    notes: o["Notes"] || null,
    further_levels: { sheet: d, cash: numeric(o["Cash P&L"]) },
  };
}
export function duplicateImport(r: ImportRow, trades: TradeRow[]) {
  const p = importPayload(r, "");
  return trades.some(
    (t) =>
      sheetOf(t).importKey === JSON.stringify(r.original) ||
      (t.date === (p.traded_on ?? "") &&
        t.pair === p.pair &&
        t.direction === p.direction &&
        t.entry === p.entry &&
        String(t.time_of_trade ?? "").slice(0, 5) === (p.time_of_trade ?? "")),
  );
}
