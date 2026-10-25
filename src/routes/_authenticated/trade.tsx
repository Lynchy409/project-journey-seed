import { TradeCalendar } from "@/components/app/TradeCalendar";
import { MarketHub, LearningLink } from "@/components/app/MarketHub";
import { classifyMarketTopic, MARKET_CONTEXT } from "@/lib/market-context";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Eye,
  GraduationCap,
  ImagePlus,
  Newspaper,
  Pencil,
  Pin,
  Plus,
  Sunrise,
  Trash2,
} from "lucide-react";
import { getNewsEvents, type NewsEvent } from "@/lib/news.functions";
import { LessonToggle } from "@/components/app/LessonToggle";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import {
  Chip,
  Empty,
  Field,
  FormSheet,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  Stat,
  TextArea,
  TextInput,
} from "@/components/app/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import {
  CONFIRMATIONS,
  OUTCOMES,
  SETUPS,
  SOURCES,
  STRATEGIES,
  TIMEFRAMES,
  TRENDS,
  addBacktest,
  addRule,
  addTrade,
  backtestsQuery,
  biasHistoryQuery,
  computeBias,
  deleteBacktest,
  deleteRule,
  deleteMarketInspection,
  deleteTrade,
  durationLabel,
  addMarketInspection,
  marketInspectionsQuery,
  saveBias,
  saveTradingPlan,
  tradingPlanQuery,
  tradeRulesQuery,
  tradeStats,
  tradesQuery,
  updateTrade,
  uploadTradeScreenshot,
  type BiasInput,
  type BacktestRow,
  type Confluence,
  type FurtherLevels,
  type TradeRow,
  type Trend,
  type TrendCtx,
} from "@/lib/trade";
import { addEntry, deleteEntry, tradeLessonsQuery, updateEntry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/trade")({
  validateSearch: (search: Record<string, unknown>): { tab?: "news" } =>
    search["tab"] === "news" ? { tab: "news" } : {},
  head: () => ({
    meta: [
      { title: "Trade — My Journey" },
      {
        name: "description",
        content:
          "Your trading rules, bias tracker and trade log with entries, stops, targets and emotions.",
      },
      { property: "og:title", content: "Trade — My Journey" },
      {
        property: "og:description",
        content:
          "Your trading rules, bias tracker and trade log with entries, stops, targets and emotions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Trade,
});

type Tab =
  | "bias"
  | "inspect"
  | "log"
  | "edge"
  | "cal"
  | "rules"
  | "plan"
  | "backtest"
  | "lessons"
  | "news"
  | "calc";

const TAB_TITLES: Record<Tab, string> = {
  bias: "Bias tracker",
  inspect: "Market inspection",
  log: "Trade log",
  edge: "Edge finder",
  cal: "Trading calendar",
  rules: "My rules",
  plan: "Trading plan",
  backtest: "Backtests",
  lessons: "My lessons",
  news: "News",
  calc: "Lot size calculator",
};

function Trade() {
  const { tab: requestedTab } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(requestedTab ?? "bias");
  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);
  return (
    <AppShell eyebrow="Trading" title={TAB_TITLES[tab]}>
      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "bias"} onClick={() => setTab("bias")} className="flex-1">
          Bias
        </Chip>
        <Chip active={tab === "inspect"} onClick={() => setTab("inspect")} className="flex-1">
          Inspect
        </Chip>
        <Chip active={tab === "log"} onClick={() => setTab("log")} className="flex-1">
          Log
        </Chip>
        <Chip active={tab === "edge"} onClick={() => setTab("edge")} className="flex-1">
          Edge
        </Chip>
        <Chip active={tab === "cal"} onClick={() => setTab("cal")} className="flex-1">
          Calendar
        </Chip>
        <Chip active={tab === "rules"} onClick={() => setTab("rules")} className="flex-1">
          Rules
        </Chip>
        <Chip active={tab === "plan"} onClick={() => setTab("plan")} className="flex-1">
          Plan
        </Chip>
        <Chip active={tab === "backtest"} onClick={() => setTab("backtest")} className="flex-1">
          Backtests
        </Chip>
        <Chip active={tab === "lessons"} onClick={() => setTab("lessons")} className="flex-1">
          Lessons
        </Chip>
        <Chip active={tab === "news"} onClick={() => setTab("news")} className="flex-1">
          News
        </Chip>
        <Chip active={tab === "calc"} onClick={() => setTab("calc")} className="flex-1">
          Calc
        </Chip>
      </div>
      {tab === "bias" && <BiasTab />}
      {tab === "inspect" && <InspectTab />}
      {tab === "log" && <LogTab />}
      {tab === "edge" && <EdgeTab />}
      {tab === "cal" && <TradeCalendar />}
      {tab === "rules" && <RulesTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "backtest" && <BacktestTab />}
      {tab === "lessons" && <LessonsTab />}
      {tab === "news" && <MarketHub events={<NewsTab />} />}
      {tab === "calc" && <CalcTab />}
    </AppShell>
  );
}

/* ---------------------------------- bias ---------------------------------- */

const TFS: { key: keyof BiasInput; label: string }[] = [
  { key: "tf_4h", label: "4 hour" },
  { key: "tf_1h", label: "1 hour" },
  { key: "tf_15m", label: "15 min" },
  { key: "tf_5m", label: "5 min" },
];

function BiasTab() {
  const qc = useQueryClient();
  const [input, setInput] = useState<BiasInput>({
    tf_4h: "bullish",
    tf_1h: "bullish",
    tf_15m: "bullish",
    tf_5m: "bullish",
  });
  const { data: history } = useQuery(biasHistoryQuery);
  const result = computeBias(input);

  const tone =
    result.level === "strong"
      ? "bg-trading-soft text-trading"
      : result.level === "partial"
        ? "bg-fitness-soft text-fitness"
        : "bg-secondary text-muted-foreground";

  const save = useMutation({
    mutationFn: () => saveBias(input, result.strategy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bias_snapshots"] });
      toast.success("Bias saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <>
      <Card>
        <SectionTitle>Current market conditions</SectionTitle>
        <div className="mt-3 space-y-3">
          {TFS.map((tf) => (
            <div key={tf.key}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {tf.label}
              </p>
              <div className="flex gap-2">
                {TRENDS.map((t) => (
                  <Chip
                    key={t.value}
                    active={input[tf.key] === t.value}
                    onClick={() => setInput((v) => ({ ...v, [tf.key]: t.value as Trend }))}
                    className="flex-1"
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
          {result.level === "strong"
            ? "Take it"
            : result.level === "partial"
              ? "Your call"
              : "Stand down"}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight">{result.headline}</h2>
        <p className="mt-1 text-sm font-bold text-muted-foreground">{result.strategy}</p>
        <ul className="mt-4 space-y-2">
          {result.steps.map((s) => (
            <li key={s} className="flex gap-2 text-sm font-medium">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
            Save this read
          </PrimaryButton>
        </div>
      </Card>

      <Card>
        <SectionTitle>Recent reads</SectionTitle>
        {!history?.length ? (
          <Empty>No saved reads yet.</Empty>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-2xl border p-3">
                <p className="text-sm font-bold">{h.verdict}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  4h {h.tf_4h} · 1h {h.tf_1h} · 15m {h.tf_15m} · 5m {h.tf_5m}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/* ----------------------------------- log ---------------------------------- */

function LogTab() {
  const qc = useQueryClient();
  const { data: trades } = useQuery(tradesQuery);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TradeRow | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const stats = tradeStats((trades ?? []).filter((t) => (t.source ?? "live") === "live"));

  const remove = useMutation({
    mutationFn: deleteTrade,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });

  return (
    <>
      <Card>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Trades" value={stats.count} />
          <Stat label="Win rate" value={`${stats.winRate}%`} tone="text-trading" />
          <Stat
            label="Total R"
            value={stats.totalR}
            tone={stats.totalR >= 0 ? "text-trading" : "text-destructive"}
          />
        </div>
        <div className="mt-3 space-y-2">
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" /> Log a trade
            </span>
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setRecapOpen(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-trading bg-trading-soft text-sm font-bold text-trading"
          >
            <Sunrise className="h-5 w-5" /> London session recap
          </button>
        </div>
      </Card>
      <RecapSheet open={recapOpen} onOpenChange={setRecapOpen} />

      {!trades?.length ? (
        <Card>
          <Empty>No trades logged yet.</Empty>
        </Card>
      ) : (
        trades.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold leading-none">{t.pair}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {prettyDate(t.date)}
                  {t.time_of_trade ? ` · ${String(t.time_of_trade).slice(0, 5)}` : ""} ·{" "}
                  {t.direction}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    t.outcome === "win"
                      ? "bg-trading-soft text-trading"
                      : t.outcome === "loss"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.outcome}
                  {t.result_r != null
                    ? ` ${Number(t.result_r) > 0 ? "+" : ""}${Number(t.result_r)}R`
                    : ""}
                </span>
                <button
                  aria-label="Edit trade"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                  className="text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Delete trade"
                  onClick={() => remove.mutate(t.id)}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              {STRATEGIES.find((s) => s.value === t.strategy)?.label ?? t.strategy}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.source && t.source !== "live" && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">
                  {t.source}
                </span>
              )}
              {t.setup && (
                <span className="rounded-full bg-trading-soft px-2 py-0.5 text-[11px] font-bold text-trading">
                  {SETUPS.find((s) => s.value === t.setup)?.label ?? t.setup}
                </span>
              )}
              {t.entry_tf && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  Entry {t.entry_tf}
                </span>
              )}
              {t.confirmation && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  Conf{" "}
                  {CONFIRMATIONS.find((c) => c.value === t.confirmation)?.label ?? t.confirmation}
                  {t.confirmation_tf ? ` ${t.confirmation_tf}` : ""}
                </span>
              )}
              {Array.isArray(t.trend_context) &&
                (t.trend_context as TrendCtx[]).map((r, i) => (
                  <span
                    key={`tc-${i}`}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
                  >
                    {r.tf} {r.direction.slice(0, 3)}
                  </span>
                ))}
              {Array.isArray(t.htf_confluences) &&
                (t.htf_confluences as Confluence[]).map((r, i) => (
                  <span
                    key={`cf-${i}`}
                    className="rounded-full bg-fitness-soft px-2 py-0.5 text-[11px] font-bold text-fitness"
                  >
                    {SETUPS.find((s) => s.value === r.type)?.label ?? r.type} {r.tf}
                  </span>
                ))}
              {durationLabel(t.time_of_trade, t.exit_time) && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  Open {durationLabel(t.time_of_trade, t.exit_time)}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Stat label="Entry" value={t.entry ?? "—"} />
              <Stat label="Stop" value={t.stop ?? "—"} />
              <Stat label="Target" value={t.target ?? "—"} />
              <Stat label="RR" value={t.rr ?? "—"} />
            </div>
            {t.market_did && (
              <p className="mt-3 text-sm font-medium">
                <span className="font-bold">Market did: </span>
                {t.market_did}
              </p>
            )}
            <TradeNews events={t.news_events} />
            {t.screenshot_url && (
              <img
                src={t.screenshot_url}
                alt={`${t.pair} chart`}
                className="mt-3 w-full rounded-2xl border object-cover"
              />
            )}
            {t.emotions && (
              <p className="mt-3 text-sm font-medium">
                <span className="font-bold">Emotions: </span>
                {t.emotions}
              </p>
            )}
            {t.notes && <p className="mt-1 text-sm font-medium text-muted-foreground">{t.notes}</p>}
          </Card>
        ))
      )}

      <TradeSheet open={open} onOpenChange={setOpen} trade={editing} />
    </>
  );
}

function TradeSheet({
  open,
  onOpenChange,
  trade,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trade: TradeRow | null;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    date: todayISO(),
    time_of_trade: "",
    exit_time: "",
    pair: "",
    strategy: "all_tf_aligned",
    setup: "",
    entry_tf: "",
    confirmation: "",
    confirmation_tf: "",
    direction: "long",
    source: "live",
    entry: "",
    stop: "",
    target: "",
    rr: "",
    outcome: "open",
    result_r: "",
    market_feeling: "",
    pair_feeling: "",
    emotions: "",
    notes: "",
    market_did: "",
    external_lesson: "",
    screenshot_url: "",
    lesson: "",
  });
  const [trendRows, setTrendRows] = useState<TrendCtx[]>([{ tf: "", direction: "bullish" }]);
  const [confRows, setConfRows] = useState<Confluence[]>([{ type: "", tf: "", role: "context" }]);
  const [further, setFurther] = useState<FurtherLevels>({ sought: "unknown", level: "", when: "" });
  const [markLesson, setMarkLesson] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (trade) {
      setF({
        date: trade.date,
        time_of_trade: trade.time_of_trade ? String(trade.time_of_trade).slice(0, 5) : "",
        exit_time: trade.exit_time ? String(trade.exit_time).slice(0, 5) : "",
        pair: trade.pair,
        strategy: trade.strategy,
        setup: trade.setup ?? "",
        entry_tf: trade.entry_tf ?? "",
        confirmation: trade.confirmation ?? "",
        confirmation_tf: trade.confirmation_tf ?? "",
        direction: trade.direction,
        source: trade.source ?? "live",
        entry: trade.entry != null ? String(trade.entry) : "",
        stop: trade.stop != null ? String(trade.stop) : "",
        target: trade.target != null ? String(trade.target) : "",
        rr: trade.rr != null ? String(trade.rr) : "",
        outcome: trade.outcome,
        result_r: trade.result_r != null ? String(trade.result_r) : "",
        market_feeling: trade.market_feeling ?? "",
        pair_feeling: trade.pair_feeling ?? "",
        emotions: trade.emotions ?? "",
        notes: trade.notes ?? "",
        market_did: trade.market_did ?? "",
        external_lesson: trade.external_lesson ?? "",
        screenshot_url: trade.screenshot_url ?? "",
        lesson: "",
      });
      setTrendRows(
        Array.isArray(trade.trend_context) && trade.trend_context.length
          ? (trade.trend_context as TrendCtx[])
          : [{ tf: "", direction: "bullish" }],
      );
      setConfRows(
        Array.isArray(trade.htf_confluences) && trade.htf_confluences.length
          ? (trade.htf_confluences as Confluence[])
          : [{ type: "", tf: "", role: "context" }],
      );
      setFurther(
        (trade.further_levels as FurtherLevels | null) ?? {
          sought: "unknown",
          level: "",
          when: "",
        },
      );
    } else {
      // Fresh form for a new trade — never inherit the previously edited trade
      setF({
        date: todayISO(),
        time_of_trade: "",
        exit_time: "",
        pair: "",
        strategy: "all_tf_aligned",
        setup: "",
        entry_tf: "",
        confirmation: "",
        confirmation_tf: "",
        direction: "long",
        source: "live",
        entry: "",
        stop: "",
        target: "",
        rr: "",
        outcome: "open",
        result_r: "",
        market_feeling: "",
        pair_feeling: "",
        emotions: "",
        notes: "",
        market_did: "",
        external_lesson: "",
        screenshot_url: "",
        lesson: "",
      });
      setTrendRows([{ tf: "", direction: "bullish" }]);
      setConfRows([{ type: "", tf: "", role: "context" }]);
      setFurther({ sought: "unknown", level: "", when: "" });
      setMarkLesson(false);
      setPhoto(null);
      setPreview(null);
    }
    setMarkLesson(false);
    setPhoto(null);
    setPreview(trade ? (trade.screenshot_url ?? null) : null);
  }, [open, trade]);
  const pickPhoto = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const save = useMutation({
    mutationFn: async () => {
      let screenshotUrl: string | null = f.screenshot_url || null;
      if (photo) screenshotUrl = await uploadTradeScreenshot(photo);
      const payload = {
        date: f.date,
        time_of_trade: f.time_of_trade || null,
        exit_time: f.exit_time || null,
        pair: f.pair.trim().toUpperCase(),
        strategy: f.strategy,
        setup: f.setup || null,
        entry_tf: f.entry_tf || null,
        confirmation: f.confirmation || null,
        confirmation_tf: f.confirmation_tf || null,
        direction: f.direction,
        source: f.source,
        entry: f.entry ? Number(f.entry) : null,
        stop: f.stop ? Number(f.stop) : null,
        target: f.target ? Number(f.target) : null,
        rr: f.rr ? Number(f.rr) : null,
        outcome: f.outcome,
        result_r: f.result_r ? Number(f.result_r) : null,
        market_feeling: f.market_feeling || null,
        pair_feeling: f.pair_feeling || null,
        emotions: f.emotions || null,
        notes: f.notes || null,
        market_did: f.market_did || null,
        external_lesson: f.external_lesson || null,
        trend_context: trendRows.filter((r) => r.tf),
        htf_confluences: confRows.filter((r) => r.type && r.tf),
        further_levels: further,
        screenshot_url: screenshotUrl,
        news_events:
          (await snapshotNews(f.date)) ??
          (trade && trade.date === f.date ? trade.news_events : null),
      };
      if (trade) {
        await updateTrade(trade.id, payload);
      } else {
        await addTrade(payload);
        if (f.notes.trim()) {
          await addEntry({
            text: `${f.pair.toUpperCase()}: ${f.notes.trim()}`,
            pillar: "trading",
            entry_type: "trade_review",
            date: f.date,
          });
        }
        if (markLesson && f.lesson.trim()) {
          await addEntry({
            text: f.lesson.trim(),
            pillar: "trading",
            entry_type: "lesson",
            is_lesson: true,
            date: f.date,
          });
        }
        if (f.external_lesson.trim()) {
          await addEntry({
            text: f.external_lesson.trim(),
            pillar: "trading",
            entry_type: "lesson",
            is_lesson: true,
            date: f.date,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(
        trade
          ? "Trade updated"
          : markLesson && f.lesson.trim()
            ? "Trade logged and lesson saved"
            : "Trade logged",
      );
      onOpenChange(false);
      pickPhoto(null);
      setMarkLesson(false);
      setF((s) => ({
        ...s,
        pair: "",
        entry: "",
        stop: "",
        target: "",
        rr: "",
        result_r: "",
        emotions: "",
        notes: "",
        screenshot_url: "",
        lesson: "",
        market_did: "",
        external_lesson: "",
        market_feeling: "",
        pair_feeling: "",
      }));
      setTrendRows([{ tf: "", direction: "bullish" }]);
      setConfRows([{ type: "", tf: "", role: "context" }]);
      setFurther({ sought: "unknown", level: "", when: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={trade ? "Edit trade" : "Log a trade"}>
      <FormSection>Basics</FormSection>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Source">
          <SelectInput value={f.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Time of trade">
          <TextInput
            type="time"
            value={f.time_of_trade}
            onChange={(e) => set("time_of_trade", e.target.value)}
          />
        </Field>
        <Field label="Exit time">
          <TextInput
            type="time"
            value={f.exit_time}
            onChange={(e) => set("exit_time", e.target.value)}
          />
        </Field>
      </div>
      {f.time_of_trade && f.exit_time && (
        <p className="text-xs font-bold text-muted-foreground">
          Open for {durationLabel(f.time_of_trade, f.exit_time)}
        </p>
      )}
      <Field label="Pair">
        <TextInput
          value={f.pair}
          onChange={(e) => set("pair", e.target.value)}
          placeholder="e.g. GBPUSD"
        />
      </Field>

      <FormSection>Setup</FormSection>
      <Field label="Strategy used">
        <SelectInput value={f.strategy} onChange={(e) => set("strategy", e.target.value)}>
          {STRATEGIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Setup type">
        <SelectInput value={f.setup} onChange={(e) => set("setup", e.target.value)}>
          <option value="">—</option>
          {SETUPS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Entry timeframe">
        <div className="grid grid-cols-4 gap-2">
          {TIMEFRAMES.map((tf) => (
            <Chip
              key={tf}
              active={f.entry_tf === tf}
              onClick={() => set("entry_tf", f.entry_tf === tf ? "" : tf)}
            >
              {tf}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Confirmation">
        <SelectInput value={f.confirmation} onChange={(e) => set("confirmation", e.target.value)}>
          <option value="">—</option>
          {CONFIRMATIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectInput>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Chip
            active={f.confirmation_tf === ""}
            onClick={() => set("confirmation_tf", "")}
            className="flex-1"
          >
            Any TF
          </Chip>
          {TIMEFRAMES.map((tf) => (
            <Chip
              key={tf}
              active={f.confirmation_tf === tf}
              onClick={() => set("confirmation_tf", f.confirmation_tf === tf ? "" : tf)}
              className="flex-1"
            >
              {tf}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Direction">
        <div className="flex gap-2">
          <Chip
            active={f.direction === "long"}
            onClick={() => set("direction", "long")}
            className="flex-1"
          >
            Long
          </Chip>
          <Chip
            active={f.direction === "short"}
            onClick={() => set("direction", "short")}
            className="flex-1"
          >
            Short
          </Chip>
        </div>
      </Field>

      <FormSection>Trend context</FormSection>
      <p className="text-xs font-medium text-muted-foreground">
        Which timeframes were trending, and which way.
      </p>
      <div className="space-y-2">
        {trendRows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <SelectInput
              value={row.tf}
              onChange={(e) =>
                setTrendRows((rs) => rs.map((r, j) => (j === i ? { ...r, tf: e.target.value } : r)))
              }
              className="flex-1"
            >
              <option value="">TF</option>
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </SelectInput>
            <div className="flex flex-1 gap-1">
              {TRENDS.map((t) => (
                <Chip
                  key={t.value}
                  active={row.direction === t.value}
                  onClick={() =>
                    setTrendRows((rs) =>
                      rs.map((r, j) =>
                        j === i ? { ...r, direction: t.value as TrendCtx["direction"] } : r,
                      ),
                    )
                  }
                  className="flex-1"
                >
                  {t.label.slice(0, 3)}
                </Chip>
              ))}
            </div>
            <button
              aria-label="Remove timeframe"
              onClick={() => setTrendRows((rs) => rs.filter((_, j) => j !== i))}
              className="px-1 text-muted-foreground"
            >
              ×
            </button>
          </div>
        ))}
        <GhostButton
          onClick={() => setTrendRows((rs) => [...rs, { tf: "", direction: "bullish" }])}
        >
          + Add timeframe
        </GhostButton>
      </div>

      <FormSection>HTF confluences</FormSection>
      <p className="text-xs font-medium text-muted-foreground">
        Type + timeframe + role — kept linked so patterns stay accurate.
      </p>
      <div className="space-y-2">
        {confRows.map((row, i) => (
          <div key={i}>
            <div className="flex gap-2">
              <SelectInput
                value={row.type}
                onChange={(e) =>
                  setConfRows((rs) =>
                    rs.map((r, j) => (j === i ? { ...r, type: e.target.value } : r)),
                  )
                }
                className="flex-1"
              >
                <option value="">Type</option>
                {SETUPS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={row.tf}
                onChange={(e) =>
                  setConfRows((rs) =>
                    rs.map((r, j) => (j === i ? { ...r, tf: e.target.value } : r)),
                  )
                }
                className="w-24"
              >
                <option value="">TF</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </SelectInput>
              <div className="flex gap-1">
                <Chip
                  active={row.role === "context"}
                  onClick={() =>
                    setConfRows((rs) => rs.map((r, j) => (j === i ? { ...r, role: "context" } : r)))
                  }
                  className="flex-1"
                >
                  Ctx
                </Chip>
                <Chip
                  active={row.role === "entry"}
                  onClick={() =>
                    setConfRows((rs) => rs.map((r, j) => (j === i ? { ...r, role: "entry" } : r)))
                  }
                  className="flex-1"
                >
                  Ent
                </Chip>
              </div>
              <button
                aria-label="Remove confluence"
                onClick={() => setConfRows((rs) => rs.filter((_, j) => j !== i))}
                className="px-1 text-muted-foreground"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <GhostButton
          onClick={() => setConfRows((rs) => [...rs, { type: "", tf: "", role: "context" }])}
        >
          + Add confluence
        </GhostButton>
      </div>

      <FormSection>Execution</FormSection>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entry">
          <TextInput
            inputMode="decimal"
            value={f.entry}
            onChange={(e) => set("entry", e.target.value)}
          />
        </Field>
        <Field label="Stop">
          <TextInput
            inputMode="decimal"
            value={f.stop}
            onChange={(e) => set("stop", e.target.value)}
          />
        </Field>
        <Field label="Target">
          <TextInput
            inputMode="decimal"
            value={f.target}
            onChange={(e) => set("target", e.target.value)}
          />
        </Field>
        <Field label="Risk : reward">
          <TextInput inputMode="decimal" value={f.rr} onChange={(e) => set("rr", e.target.value)} />
        </Field>
      </div>

      <FormSection>Feelings</FormSection>
      <Field label="Overall feeling about the market today">
        <TextInput
          value={f.market_feeling}
          onChange={(e) => set("market_feeling", e.target.value)}
          placeholder="Risk-on, choppy, trending…"
        />
      </Field>
      <Field label="Feeling about this pair">
        <TextInput
          value={f.pair_feeling}
          onChange={(e) => set("pair_feeling", e.target.value)}
          placeholder="Clean ranges, extended, volatile…"
        />
      </Field>
      <Field label="Emotions">
        <TextInput
          value={f.emotions}
          onChange={(e) => set("emotions", e.target.value)}
          placeholder="Calm, rushed, revenge…"
        />
      </Field>

      <FormSection>Outcome</FormSection>
      <Field label="Outcome">
        <div className="flex gap-2">
          {OUTCOMES.map((o) => (
            <Chip
              key={o}
              active={f.outcome === o}
              onClick={() => set("outcome", o)}
              className="flex-1"
            >
              {o}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Result in R">
        <TextInput
          inputMode="decimal"
          value={f.result_r}
          onChange={(e) => set("result_r", e.target.value)}
          placeholder="e.g. 2 or -1"
        />
      </Field>
      <Field label="Did price seek further levels?">
        <div className="flex gap-2">
          <Chip
            active={further.sought === "yes"}
            onClick={() => setFurther((v) => ({ ...v, sought: "yes" }))}
            className="flex-1"
          >
            Yes
          </Chip>
          <Chip
            active={further.sought === "no"}
            onClick={() => setFurther((v) => ({ ...v, sought: "no" }))}
            className="flex-1"
          >
            No
          </Chip>
          <Chip
            active={further.sought === "unknown"}
            onClick={() => setFurther((v) => ({ ...v, sought: "unknown" }))}
            className="flex-1"
          >
            Not sure
          </Chip>
        </div>
      </Field>
      {further.sought === "yes" && (
        <>
          <Field label="Which level?">
            <TextInput
              value={further.level}
              onChange={(e) => setFurther((v) => ({ ...v, level: e.target.value }))}
              placeholder="e.g. HTF high / next draw on liquidity"
            />
          </Field>
          <Field label="When?">
            <div className="flex gap-2">
              <Chip
                active={further.when === "during"}
                onClick={() => setFurther((v) => ({ ...v, when: "during" }))}
                className="flex-1"
              >
                During the trade
              </Chip>
              <Chip
                active={further.when === "after"}
                onClick={() => setFurther((v) => ({ ...v, when: "after" }))}
                className="flex-1"
              >
                After I exited
              </Chip>
            </div>
          </Field>
        </>
      )}
      <Field label="What did the market do?">
        <TextArea
          value={f.market_did}
          onChange={(e) => set("market_did", e.target.value)}
          placeholder="Ran my stop first, then reversed. Never reached my target…"
        />
      </Field>

      <FormSection>Review</FormSection>
      <Field label="External lesson (what not to do)">
        <TextInput
          value={f.external_lesson}
          onChange={(e) => set("external_lesson", e.target.value)}
          placeholder="From a video, mentor or another trader…"
        />
      </Field>
      <Field label="Chart screenshot">
        {preview ? (
          <div className="space-y-2">
            <img
              src={preview}
              alt="Chart screenshot preview"
              className="max-h-56 w-full rounded-2xl border object-cover"
            />
            <button
              type="button"
              onClick={() => pickPhoto(null)}
              className="flex h-12 w-full items-center justify-center rounded-2xl border text-sm font-bold text-muted-foreground"
            >
              Remove photo
            </button>
          </div>
        ) : (
          <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-bold text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            Add from camera roll
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickPhoto(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </Field>
      <Field label="Or paste a link">
        <TextInput
          value={f.screenshot_url}
          onChange={(e) => set("screenshot_url", e.target.value)}
          placeholder="Paste an image link"
        />
      </Field>
      <Field label="Review notes (saved to your journal)">
        <TextArea value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {!trade && (
        <LessonToggle
          on={markLesson}
          onToggle={() => setMarkLesson((v) => !v)}
          value={f.lesson}
          onChange={(v) => set("lesson", v)}
        />
      )}

      <PrimaryButton onClick={() => save.mutate()} disabled={!f.pair.trim() || save.isPending}>
        {trade ? "Save changes" : "Save trade"}
      </PrimaryButton>
    </FormSheet>
  );
}

function FormSection({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

/* ---------------------------------- rules --------------------------------- */

function RulesTab() {
  const qc = useQueryClient();
  const { data: rules } = useQuery(tradeRulesQuery);
  const [text, setText] = useState("");

  const add = useMutation({
    mutationFn: () => addRule(text.trim(), rules?.length ?? 0),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade_rules"] });
      setText("");
      toast.success("Rule added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const remove = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade_rules"] }),
  });

  return (
    <>
      <Card>
        <SectionTitle>Read these before every session</SectionTitle>
        <ul className="mt-3 space-y-2">
          {rules?.map((r, i) => (
            <li key={r.id} className="flex items-start gap-3 rounded-2xl border p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-trading-soft text-xs font-extrabold text-trading">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-semibold leading-snug">{r.text}</span>
              <button
                aria-label="Delete rule"
                onClick={() => remove.mutate(r.id)}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <Field label="Add a rule">
          <TextArea value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="mt-3">
          <PrimaryButton onClick={() => add.mutate()} disabled={!text.trim() || add.isPending}>
            Add rule
          </PrimaryButton>
        </div>
      </Card>
    </>
  );
}

/* --------------------------------- lessons -------------------------------- */

function LessonsTab() {
  const qc = useQueryClient();
  const { data: lessons } = useQuery(tradeLessonsQuery);
  const [text, setText] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lessons"] });
    qc.invalidateQueries({ queryKey: ["journal"] });
  };

  const add = useMutation({
    mutationFn: () =>
      addEntry({ text: text.trim(), pillar: "trading", entry_type: "lesson", is_lesson: true }),
    onSuccess: () => {
      invalidate();
      setText("");
      toast.success("Lesson saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const pin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => updateEntry(id, { pinned }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteEntry,
    onSuccess: invalidate,
  });

  return (
    <>
      <Card>
        <SectionTitle>Lessons you have earned</SectionTitle>
        {!lessons?.length ? (
          <Empty>No lessons yet. Mark a trade review as a lesson, or add one below.</Empty>
        ) : (
          <ul className="mt-3 space-y-2">
            {lessons.map((l) => (
              <li
                key={l.id}
                className={`rounded-2xl border p-3 ${l.pinned ? "border-trading bg-trading-soft" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-trading" />
                  <p className="flex-1 text-sm font-semibold leading-snug">{l.text}</p>
                  <button
                    aria-label={l.pinned ? "Unpin lesson" : "Pin lesson"}
                    onClick={() => pin.mutate({ id: l.id, pinned: !l.pinned })}
                    className={l.pinned ? "text-trading" : "text-muted-foreground"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Delete lesson"
                    onClick={() => remove.mutate(l.id)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 pl-8 text-xs font-bold text-muted-foreground">
                  {prettyDate(l.date)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <Field label="New lesson">
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The rule you take forward…"
          />
        </Field>
        <div className="mt-3">
          <PrimaryButton onClick={() => add.mutate()} disabled={!text.trim() || add.isPending}>
            Add lesson
          </PrimaryButton>
        </div>
      </Card>
    </>
  );
}

/* ----------------------------- market inspection ---------------------------- */

function InspectTab() {
  const qc = useQueryClient();
  const { data: inspections, isPending, isError, refetch } = useQuery(marketInspectionsQuery);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: deleteMarketInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market_inspections"] }),
    onError: () => toast.error("Inspection was not deleted. Try again."),
  });

  return (
    <>
      <Card>
        <SectionTitle>Market inspection</SectionTitle>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Study the market without needing a trade — what you saw, what you learned, what could
          improve and what needs investigating next.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2">
              <Eye className="h-5 w-5" /> Inspect the market
            </span>
          </PrimaryButton>
        </div>
      </Card>
      {isError ? (
        <Card>
          <p role="alert" className="text-sm text-destructive">
            Inspections could not be loaded. Check the market_inspections migration and connection.
          </p>
          <GhostButton onClick={() => refetch()}>Retry inspections</GhostButton>
        </Card>
      ) : isPending ? (
        <Card>
          <p role="status">Loading inspections…</p>
        </Card>
      ) : !inspections?.length ? (
        <Card>
          <Empty>No inspections yet — observe first, trade second.</Empty>
        </Card>
      ) : (
        inspections.map((i) => (
          <Card key={i.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-extrabold">{i.pair ?? "Market overall"}</p>
              <button
                aria-label="Delete inspection"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this market inspection? Its copied lesson will remain in Lessons.",
                    )
                  )
                    remove.mutate(i.id);
                }}
                disabled={remove.isPending}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{prettyDate(i.date)}</p>
            {i.market_view && (
              <p className="mt-2 text-sm font-medium">
                <span className="font-bold">View: </span>
                {i.market_view}
              </p>
            )}
            {i.spotted && (
              <p className="mt-1 text-sm font-medium">
                <span className="font-bold">Spotted: </span>
                {i.spotted}
              </p>
            )}
            {i.learnt && (
              <p className="mt-1 rounded-2xl bg-trading-soft p-2 text-sm font-semibold text-trading">
                Learnt: {i.learnt}
              </p>
            )}
            {i.improve && (
              <p className="mt-1 text-sm font-medium">
                <span className="font-bold">Improve: </span>
                {i.improve}
              </p>
            )}
            {i.investigate && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                <span className="font-bold">Investigate next: </span>
                {i.investigate}
              </p>
            )}
          </Card>
        ))
      )}
      <InspectSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function InspectSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    date: todayISO(),
    pair: "",
    market_view: "",
    spotted: "",
    learnt: "",
    improve: "",
    investigate: "",
  });

  useEffect(() => {
    if (open)
      setF({
        date: todayISO(),
        pair: "",
        market_view: "",
        spotted: "",
        learnt: "",
        improve: "",
        investigate: "",
      });
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      await addMarketInspection({
        date: f.date,
        pair: f.pair.trim() || null,
        market_view: f.market_view.trim() || null,
        spotted: f.spotted.trim() || null,
        learnt: f.learnt.trim() || null,
        improve: f.improve.trim() || null,
        investigate: f.investigate.trim() || null,
      });
      let lessonFailed = false;
      if (f.learnt.trim()) {
        try {
          await addEntry({
            text: f.learnt.trim(),
            pillar: "trading",
            entry_type: "lesson",
            is_lesson: true,
            date: f.date,
          });
        } catch {
          lessonFailed = true;
        }
      }
      return { lessonFailed };
    },
    onSuccess: ({ lessonFailed }) => {
      qc.invalidateQueries({ queryKey: ["market_inspections"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      if (lessonFailed)
        toast.warning(
          "Inspection saved, but the lesson copy failed. Your takeaway is safe in Inspect; copy it to Lessons later.",
        );
      else
        toast.success(f.learnt.trim() ? "Inspection saved and lesson added" : "Inspection saved");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Inspect the market">
      <Field label="Date">
        <TextInput
          type="date"
          value={f.date}
          onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))}
        />
      </Field>
      <Field label="Pair (optional)">
        <TextInput
          value={f.pair}
          onChange={(e) => setF((s) => ({ ...s, pair: e.target.value }))}
          placeholder="Leave blank for the market overall"
        />
      </Field>
      <Field label="My market view">
        <TextArea
          value={f.market_view}
          onChange={(e) => setF((s) => ({ ...s, market_view: e.target.value }))}
          placeholder="What's the story today — risk-on, ranging, trending?"
        />
      </Field>
      <Field label="What I spotted">
        <TextArea
          value={f.spotted}
          onChange={(e) => setF((s) => ({ ...s, spotted: e.target.value }))}
          placeholder="Setups forming, levels holding, behaviour you noticed…"
        />
      </Field>
      <Field label="What I learnt (also saved to Lessons)">
        <TextArea
          value={f.learnt}
          onChange={(e) => setF((s) => ({ ...s, learnt: e.target.value }))}
          placeholder="One clear takeaway…"
        />
      </Field>
      <Field label="What could improve">
        <TextArea
          value={f.improve}
          onChange={(e) => setF((s) => ({ ...s, improve: e.target.value }))}
          placeholder="Anything that guides towards improvement…"
        />
      </Field>
      <Field label="Investigate next">
        <TextArea
          value={f.investigate}
          onChange={(e) => setF((s) => ({ ...s, investigate: e.target.value }))}
          placeholder="A question, pattern or behaviour to dig into…"
        />
      </Field>
      <PrimaryButton
        onClick={() => save.mutate()}
        disabled={
          save.isPending ||
          !f.date ||
          ![f.market_view, f.spotted, f.learnt, f.improve, f.investigate].some((v) => v.trim())
        }
      >
        Save inspection
      </PrimaryButton>
    </FormSheet>
  );
}

/* ------------------------------ trading plan ------------------------------ */

function PlanTab() {
  const qc = useQueryClient();
  const { data: plan } = useQuery(tradingPlanQuery);
  const [f, setF] = useState({
    account_size: "",
    account_currency: "GBP",
    risk_per_trade: "",
    max_daily_loss: "",
    short_term_goal: "",
    medium_term_goal: "",
    allowed_strategies: "",
    routines: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (plan && !loaded) {
      setF({
        account_size: plan.account_size != null ? String(plan.account_size) : "",
        account_currency: plan.account_currency ?? "GBP",
        risk_per_trade: plan.risk_per_trade ?? "",
        max_daily_loss: plan.max_daily_loss ?? "",
        short_term_goal: plan.short_term_goal ?? "",
        medium_term_goal: plan.medium_term_goal ?? "",
        allowed_strategies: plan.allowed_strategies ?? "",
        routines: plan.routines ?? "",
      });
      setLoaded(true);
    }
  }, [plan, loaded]);

  const save = useMutation({
    mutationFn: () =>
      saveTradingPlan({
        account_size: f.account_size ? Number(f.account_size) : null,
        account_currency: f.account_currency,
        risk_per_trade: f.risk_per_trade || null,
        max_daily_loss: f.max_daily_loss || null,
        short_term_goal: f.short_term_goal || null,
        medium_term_goal: f.medium_term_goal || null,
        allowed_strategies: f.allowed_strategies || null,
        routines: f.routines || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trading_plan"] });
      toast.success("Trading plan saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <>
      <Card>
        <SectionTitle>My trading plan</SectionTitle>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Your setup in one place — risk, goals and routines. These are your numbers; nothing here
          is advice.
        </p>
      </Card>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account size">
            <TextInput
              inputMode="decimal"
              value={f.account_size}
              onChange={(e) => setF((s) => ({ ...s, account_size: e.target.value }))}
            />
          </Field>
          <Field label="Currency">
            <SelectInput
              value={f.account_currency}
              onChange={(e) => setF((s) => ({ ...s, account_currency: e.target.value }))}
            >
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </SelectInput>
          </Field>
        </div>
        <Field label="Risk per trade">
          <TextInput
            value={f.risk_per_trade}
            onChange={(e) => setF((s) => ({ ...s, risk_per_trade: e.target.value }))}
            placeholder="e.g. 0.5% or £50"
          />
        </Field>
        <Field label="Max daily loss">
          <TextInput
            value={f.max_daily_loss}
            onChange={(e) => setF((s) => ({ ...s, max_daily_loss: e.target.value }))}
            placeholder="Walk-away point for the day"
          />
        </Field>
        <Field label="Allowed strategies">
          <TextArea
            value={f.allowed_strategies}
            onChange={(e) => setF((s) => ({ ...s, allowed_strategies: e.target.value }))}
            placeholder="Only my two setups: all TF aligned, HTF draw on liquidity…"
          />
        </Field>
        <Field label="Short-term goal">
          <TextArea
            value={f.short_term_goal}
            onChange={(e) => setF((s) => ({ ...s, short_term_goal: e.target.value }))}
            placeholder="Next 1–3 months…"
          />
        </Field>
        <Field label="Medium-term goal">
          <TextArea
            value={f.medium_term_goal}
            onChange={(e) => setF((s) => ({ ...s, medium_term_goal: e.target.value }))}
            placeholder="6–12 months…"
          />
        </Field>
        <Field label="Daily routines">
          <TextArea
            value={f.routines}
            onChange={(e) => setF((s) => ({ ...s, routines: e.target.value }))}
            placeholder="Prep before session · journal every trade · weekly review…"
          />
        </Field>
        <div className="mt-3">
          <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
            Save plan
          </PrimaryButton>
        </div>
      </Card>
    </>
  );
}

/* -------------------------------- backtests -------------------------------- */

function BacktestTab() {
  const qc = useQueryClient();
  const { data: backtests } = useQuery(backtestsQuery);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: deleteBacktest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backtests"] }),
  });

  return (
    <>
      <Card>
        <SectionTitle>Backtest log</SectionTitle>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Do the test on TradingView — record what you tested and what it showed. Backtest results
          stay separate from live stats.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" /> Log a backtest
            </span>
          </PrimaryButton>
        </div>
      </Card>
      {!backtests?.length ? (
        <Card>
          <Empty>No backtests logged yet.</Empty>
        </Card>
      ) : (
        backtests.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-extrabold leading-snug">{b.question}</p>
              <button
                aria-label="Delete backtest"
                onClick={() => remove.mutate(b.id)}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {prettyDate(b.date)}
              {b.market ? ` · ${b.market}` : ""}
              {b.timeframe ? ` · ${b.timeframe}` : ""}
              {b.period_start && b.period_end ? ` · ${b.period_start} to ${b.period_end}` : ""}
            </p>
            {b.rules && (
              <p className="mt-2 text-sm font-medium">
                <span className="font-bold">Rules: </span>
                {b.rules}
              </p>
            )}
            {b.results && (
              <p className="mt-1 text-sm font-medium">
                <span className="font-bold">Results: </span>
                {b.results}
              </p>
            )}
            {b.verdict && (
              <p className="mt-2 rounded-2xl bg-trading-soft p-2 text-sm font-semibold text-trading">
                Verdict: {b.verdict}
              </p>
            )}
          </Card>
        ))
      )}
      <BacktestSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function BacktestSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    question: "",
    market: "",
    timeframe: "",
    period_start: "",
    period_end: "",
    rules: "",
    results: "",
    verdict: "",
  });

  useEffect(() => {
    if (open)
      setF({
        question: "",
        market: "",
        timeframe: "",
        period_start: "",
        period_end: "",
        rules: "",
        results: "",
        verdict: "",
      });
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      await addBacktest({
        question: f.question.trim(),
        market: f.market.trim() || null,
        timeframe: f.timeframe.trim() || null,
        period_start: f.period_start || null,
        period_end: f.period_end || null,
        rules: f.rules.trim() || null,
        results: f.results.trim() || null,
        verdict: f.verdict.trim() || null,
      });
      if (f.verdict.trim()) {
        await addEntry({
          text: `Backtest — ${f.question.trim()}: ${f.verdict.trim()}`,
          pillar: "trading",
          entry_type: "lesson",
          is_lesson: true,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backtests"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(
        f.verdict.trim() ? "Backtest saved and verdict added to lessons" : "Backtest saved",
      );
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Log a backtest">
      <Field label="What did you test?">
        <TextInput
          value={f.question}
          onChange={(e) => setF((s) => ({ ...s, question: e.target.value }))}
          placeholder="e.g. Do 1m order block entries win more than 5m?"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Market">
          <TextInput
            value={f.market}
            onChange={(e) => setF((s) => ({ ...s, market: e.target.value }))}
            placeholder="e.g. GBPUSD"
          />
        </Field>
        <Field label="Timeframe">
          <TextInput
            value={f.timeframe}
            onChange={(e) => setF((s) => ({ ...s, timeframe: e.target.value }))}
            placeholder="e.g. 1m / 5m"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Period from">
          <TextInput
            type="date"
            value={f.period_start}
            onChange={(e) => setF((s) => ({ ...s, period_start: e.target.value }))}
          />
        </Field>
        <Field label="Period to">
          <TextInput
            type="date"
            value={f.period_end}
            onChange={(e) => setF((s) => ({ ...s, period_end: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="Exact rules tested">
        <TextArea
          value={f.rules}
          onChange={(e) => setF((s) => ({ ...s, rules: e.target.value }))}
          placeholder="Entry when… exit when… only when…"
        />
      </Field>
      <Field label="Results">
        <TextArea
          value={f.results}
          onChange={(e) => setF((s) => ({ ...s, results: e.target.value }))}
          placeholder="Trades, win rate, total R, anything odd"
        />
      </Field>
      <Field label="Verdict">
        <TextArea
          value={f.verdict}
          onChange={(e) => setF((s) => ({ ...s, verdict: e.target.value }))}
          placeholder="What you take from it — saved to your lessons too"
        />
      </Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!f.question.trim() || save.isPending}>
        Save backtest
      </PrimaryButton>
    </FormSheet>
  );
}

/* -------------------------------- edge finder ------------------------------- */

type EdgeFilter = {
  source: string;
  strategy: string;
  setup: string;
  entryTf: string;
  outcome: string;
  confType: string;
  confTf: string;
  confRole: string;
};

function EdgeTab() {
  const { data: trades } = useQuery(tradesQuery);
  const [filter, setFilter] = useState<EdgeFilter>({
    source: "live",
    strategy: "",
    setup: "",
    entryTf: "",
    outcome: "",
    confType: "",
    confTf: "",
    confRole: "",
  });
  const [showing, setShowing] = useState(10);

  const set = (k: keyof EdgeFilter, v: string) => {
    setFilter((f) => ({ ...f, [k]: v }));
    setShowing(10);
  };

  const rows = (trades ?? []).filter(
    (t) =>
      (filter.source === "" || (t.source ?? "live") === filter.source) &&
      (filter.strategy === "" || t.strategy === filter.strategy) &&
      (filter.setup === "" || t.setup === filter.setup) &&
      (filter.entryTf === "" || t.entry_tf === filter.entryTf) &&
      (filter.outcome === "" || t.outcome === filter.outcome) &&
      (!filter.confType ||
        (Array.isArray(t.htf_confluences) &&
          (t.htf_confluences as Confluence[]).some(
            (c) =>
              c.type === filter.confType &&
              (!filter.confTf || c.tf === filter.confTf) &&
              (!filter.confRole || c.role === filter.confRole),
          ))),
  );
  const stats = tradeStats(rows);
  const dates = rows.map((t) => t.date).sort();
  const range = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : "";

  return (
    <>
      <Card>
        <SectionTitle>Edge finder</SectionTitle>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Filter your trades by any combination — e.g. setup + entry timeframe — to see what wins
          and what loses. Small samples are leads to investigate, not proof.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Trades" value={stats.count} />
          <Stat label="Win rate" value={`${stats.winRate}%`} tone="text-trading" />
          <Stat
            label="Total R"
            value={stats.totalR}
            tone={stats.totalR >= 0 ? "text-trading" : "text-destructive"}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-muted-foreground">
          {stats.closed} closed · {range || "no dates"}
          {filter.outcome ? " · win rate is 100%/0% by construction when filtering by outcome" : ""}
        </p>
      </Card>
      <Card>
        <Field label="Source">
          <div className="grid grid-cols-4 gap-2">
            <Chip
              active={filter.source === ""}
              onClick={() => set("source", "")}
              className="flex-1"
            >
              All
            </Chip>
            {SOURCES.map((s) => (
              <Chip
                key={s.value}
                active={filter.source === s.value}
                onClick={() => set("source", s.value)}
                className="flex-1"
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Strategy">
          <SelectInput value={filter.strategy} onChange={(e) => set("strategy", e.target.value)}>
            <option value="">All strategies</option>
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Setup">
          <SelectInput value={filter.setup} onChange={(e) => set("setup", e.target.value)}>
            <option value="">All setups</option>
            {SETUPS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Entry timeframe">
          <div className="grid grid-cols-4 gap-2">
            <Chip
              active={filter.entryTf === ""}
              onClick={() => set("entryTf", "")}
              className="flex-1"
            >
              All
            </Chip>
            {TIMEFRAMES.map((tf) => (
              <Chip
                key={tf}
                active={filter.entryTf === tf}
                onClick={() => set("entryTf", tf)}
                className="flex-1"
              >
                {tf}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Outcome">
          <SelectInput value={filter.outcome} onChange={(e) => set("outcome", e.target.value)}>
            <option value="">Any</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Must include a confluence">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Checks the linked confluence rows — e.g. order block on 1m as your entry, without
            catching trades where 1m was only the confirmation.
          </p>
          <div className="space-y-2">
            <SelectInput value={filter.confType} onChange={(e) => set("confType", e.target.value)}>
              <option value="">Any type</option>
              {SETUPS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </SelectInput>
            <div className="grid grid-cols-2 gap-2">
              <SelectInput value={filter.confTf} onChange={(e) => set("confTf", e.target.value)}>
                <option value="">Any timeframe</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={filter.confRole}
                onChange={(e) => set("confRole", e.target.value)}
              >
                <option value="">Any role</option>
                <option value="context">Context</option>
                <option value="entry">Entry</option>
              </SelectInput>
            </div>
          </div>
        </Field>
      </Card>
      {!rows.length ? (
        <Card>
          <Empty>No trades match this filter yet.</Empty>
        </Card>
      ) : (
        <>
          {rows.slice(0, showing).map((t) => (
            <Card key={t.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-extrabold">{t.pair}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    t.outcome === "win"
                      ? "bg-trading-soft text-trading"
                      : t.outcome === "loss"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.outcome}
                  {t.result_r != null
                    ? ` ${Number(t.result_r) > 0 ? "+" : ""}${Number(t.result_r)}R`
                    : ""}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {prettyDate(t.date)} ·{" "}
                {STRATEGIES.find((s) => s.value === t.strategy)?.label ?? t.strategy}
                {t.setup ? ` · ${SETUPS.find((s) => s.value === t.setup)?.label ?? t.setup}` : ""}
                {t.entry_tf ? ` · entry ${t.entry_tf}` : ""}
              </p>
            </Card>
          ))}
          {rows.length > showing && (
            <GhostButton onClick={() => setShowing((v) => v + 10)}>
              Show more ({rows.length - showing} left)
            </GhostButton>
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------ session recap ------------------------------ */

function RecapSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [followed, setFollowed] = useState<"yes" | "no" | null>(null);
  const [notes, setNotes] = useState("");
  const [markLesson, setMarkLesson] = useState(false);
  const [lesson, setLesson] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setFollowed(null);
    setNotes("");
    setMarkLesson(false);
    setLesson("");
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      const header = `London session recap · Rules followed: ${followed === "yes" ? "Yes" : "No"}`;
      await addEntry({
        text: notes.trim() ? `${header}\n\n${notes.trim().slice(0, 5000)}` : header,
        pillar: "trading",
        entry_type: "session_note",
        date,
      });
      if (markLesson && lesson.trim()) {
        await addEntry({
          text: lesson.trim().slice(0, 500),
          pillar: "trading",
          entry_type: "lesson",
          is_lesson: true,
          date,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(
        markLesson && lesson.trim()
          ? "Recap saved and lesson added"
          : "Recap saved to your journal",
      );
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="London session recap">
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Did you follow your rules?">
        <div className="flex gap-2">
          <Chip active={followed === "yes"} onClick={() => setFollowed("yes")} className="flex-1">
            Yes
          </Chip>
          <Chip active={followed === "no"} onClick={() => setFollowed("no")} className="flex-1">
            No
          </Chip>
        </div>
      </Field>
      <Field label="Session notes (saved to your journal)">
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did London open play out? What did you do well?"
          className="min-h-32"
        />
      </Field>
      <LessonToggle
        on={markLesson}
        onToggle={() => setMarkLesson((v) => !v)}
        value={lesson}
        onChange={setLesson}
      />
      <PrimaryButton onClick={() => save.mutate()} disabled={!followed || save.isPending}>
        {save.isPending ? "Saving…" : "Save recap"}
      </PrimaryButton>
    </FormSheet>
  );
}

/* ---------------------------------- news ---------------------------------- */

type SavedNews = { title: string; currency: string; impact: string; uk: string };

/** Red/orange events on a London date, or null when the date is outside this week's feed. */
async function snapshotNews(dateKey: string): Promise<SavedNews[] | null> {
  try {
    const data = await getNewsEvents();
    const rows = data.map((e) => {
      const at = newsInstant(e.date, e.time, e.instant);
      const [m = "01", d = "01", y = "1970"] = e.date.split("-");
      return { e, at, key: at ? londonDay(at) : `${y}-${m}-${d}` };
    });
    const keys = rows.map((r) => r.key).sort();
    if (!keys.length || dateKey < keys[0]! || dateKey > keys[keys.length - 1]!) return null;
    return rows
      .filter((r) => r.key === dateKey)
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0))
      .map((r) => ({
        title: r.e.title,
        currency: r.e.currency,
        impact: r.e.impact,
        uk: r.at ? londonTime(r.at) : r.e.time || "All day",
      }));
  } catch {
    return null;
  }
}

function TradeNews({ events }: { events: unknown }) {
  if (!Array.isArray(events)) return null;
  const list = events as SavedNews[];
  return (
    <div className="mt-3 rounded-2xl bg-secondary p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Newspaper className="h-3.5 w-3.5" /> News that day
      </p>
      {list.length === 0 ? (
        <p className="mt-1 text-sm font-medium text-muted-foreground">No red or orange news</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {list.map((n, i) => (
            <li key={i} className="flex items-center gap-2 text-sm font-medium">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${n.impact === "High" ? "bg-destructive" : "bg-fitness"}`}
              />
              <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{n.uk}</span>
              <span className="font-bold">{n.currency}</span>
              <span className="truncate">{n.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function tzOffset(ms: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p["year"]!, +p["month"]! - 1, +p["day"]!, +p["hour"]! % 24, +p["minute"]!) - ms;
}

/** Feed date/time are UTC; returns a UTC instant (or null for all-day). */
function newsInstant(date: string, time: string, instant?: string): Date | null {
  if (instant && Number.isFinite(Date.parse(instant))) return new Date(instant);
  const [m = 1, d = 1, y = 1970] = date.split("-").map(Number);
  const t = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!t) return null;
  let h = Number(t[1]) % 12;
  if (t[3]!.toLowerCase() === "pm") h += 12;
  const guess = Date.UTC(y, m - 1, d, h, Number(t[2]));
  return new Date(guess);
}

const londonDay = (dt: Date) => dt.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const londonTime = (dt: Date) =>
  dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

function newsDayLabel(key: string, isToday: boolean): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  const base = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return isToday ? `Today · ${base}` : base;
}

function NewsTab() {
  const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ["ff-news"],
    queryFn: () => getNewsEvents(),
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) return <Empty>Loading this week's news…</Empty>;
  if (isError || !data)
    return (
      <Empty>
        Couldn't load the calendar.{" "}
        <button className="font-semibold text-trading" onClick={() => refetch()}>
          Try again
        </button>
      </Empty>
    );

  const todayKey = londonDay(new Date());
  const now = Date.now();
  type Ev = NewsEvent & { at: Date | null; uk: string };
  const days = new Map<string, Ev[]>();
  for (const e of data) {
    const at = newsInstant(e.date, e.time, e.instant);
    const [m = "01", d = "01", y = "1970"] = e.date.split("-");
    const key = at ? londonDay(at) : `${y}-${m}-${d}`;
    const list = days.get(key) ?? [];
    list.push({ ...e, at, uk: at ? londonTime(at) : e.time || "All day" });
    days.set(key, list);
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3 !py-3">
        <Newspaper className="h-5 w-5 shrink-0 text-trading" />
        <p className="flex-1 text-xs text-muted-foreground">
          Red & orange events for EUR · USD · GBP · JPY. Times shown in London time.
        </p>
        <button
          className="text-xs font-semibold text-trading"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? "…" : "Refresh"}
        </button>
      </Card>
      <p className="px-1 text-xs text-muted-foreground">
        Calendar loaded{" "}
        {new Date(dataUpdatedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })} UK time.
        Provider cache: up to 30 minutes. Ratings and forecasts are third-party estimates.
      </p>
      {!data.some((e) => Date.parse(e.instant) > now) && (
        <Card>
          <p className="text-sm">
            This week's feed has no later timed events. That does not mean there are no upcoming
            risks. Check the provider for next week's schedule.
          </p>
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
          >
            Open the full economic calendar
          </a>
        </Card>
      )}
      {days.size === 0 && <Empty>No high or medium impact events this week.</Empty>}
      {[...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, events]) => {
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          return (
            <div
              key={key}
              className={
                isToday
                  ? "rounded-3xl border-2 border-trading bg-trading-soft p-3"
                  : isPast
                    ? "opacity-50"
                    : ""
              }
            >
              <SectionTitle>
                <span className={isToday ? "text-trading" : ""}>{newsDayLabel(key, isToday)}</span>
              </SectionTitle>
              <div className="space-y-2">
                {events.map((e, i) => (
                  <Card
                    key={`${e.title}-${i}`}
                    className={`flex flex-wrap items-center gap-3 !py-3 ${isToday && e.at && e.at.getTime() < now ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        e.impact === "High" ? "bg-red-500" : "bg-orange-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{e.uk}</span> · {e.currency}{" "}
                        · {e.impact} impact
                        {e.forecast ? ` · F ${e.forecast}` : ""}
                        {e.previous ? ` · P ${e.previous}` : ""}
                      </p>
                    </div>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted-foreground"
                        aria-label="Open on Forex Factory"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <details className="basis-full text-xs">
                      <summary className="cursor-pointer font-bold">
                        Understand this release
                      </summary>
                      <p className="mt-2">{MARKET_CONTEXT[classifyMarketTopic(e.title)].summary}</p>
                      <LearningLink lesson={MARKET_CONTEXT[classifyMarketTopic(e.title)].lesson}>
                        Open related lesson
                      </LearningLink>
                    </details>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ---------------------------------- calc ---------------------------------- */

const CALC_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "EURJPY", "EURGBP"];
const ACC_CCY = ["GBP", "USD"] as const;
const SYM: Record<string, string> = { GBP: "£", USD: "$" };

function CalcTab() {
  const [ccy, setCcy] = useState<(typeof ACC_CCY)[number]>("GBP");
  const [balance, setBalance] = useState("100000");
  const [riskPct, setRiskPct] = useState("0.5");
  const [pair, setPair] = useState("GBPUSD");
  const [mode, setMode] = useState<"pips" | "prices">("pips");
  const [pips, setPips] = useState("10");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");

  const { data: rates } = useQuery({
    queryKey: ["fx-rates", ccy],
    queryFn: async () => {
      const r = await fetch(`https://api.frankfurter.dev/v1/latest?from=${ccy}`);
      if (!r.ok) throw new Error("rates");
      const j = (await r.json()) as { rates: Record<string, number> };
      return { ...j.rates, [ccy]: 1 } as Record<string, number>;
    },
    staleTime: 1000 * 60 * 30,
  });

  const quote = pair.slice(3);
  const pipSize = quote === "JPY" ? 0.01 : 0.0001;
  const stopPips =
    mode === "pips" ? Number(pips) : Math.abs(Number(entry) - Number(stop)) / pipSize;
  const rate = rates?.[quote];
  const pipValuePerLot = rate ? (100000 * pipSize) / rate : 0;
  const riskCash = (Number(balance) * Number(riskPct)) / 100;
  const lots = stopPips > 0 && pipValuePerLot > 0 ? riskCash / (stopPips * pipValuePerLot) : 0;
  const s = SYM[ccy];

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lot size
        </p>
        <p className="text-5xl font-extrabold text-trading">{lots ? lots.toFixed(2) : "—"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Risk" value={`${s}${riskCash.toFixed(0)}`} />
          <Stat label="Stop" value={stopPips ? `${stopPips.toFixed(1)}p` : "—"} />
          <Stat
            label="Pip / lot"
            value={pipValuePerLot ? `${s}${pipValuePerLot.toFixed(2)}` : "…"}
          />
        </div>
        <button
          className="mt-3 h-12 w-full rounded-2xl border border-trading font-semibold text-trading disabled:opacity-40"
          disabled={!lots}
          onClick={() => {
            void navigator.clipboard.writeText(lots.toFixed(2));
            toast.success("Lot size copied");
          }}
        >
          Copy lots
        </button>
      </Card>

      <Card className="space-y-3">
        <Field label="Account currency">
          <div className="flex gap-2">
            {ACC_CCY.map((c) => (
              <Chip key={c} active={ccy === c} onClick={() => setCcy(c)} className="flex-1">
                {SYM[c]} {c}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Account size">
          <TextInput
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["10000", "25000", "50000", "100000", "200000"].map((v) => (
              <Chip key={v} active={balance === v} onClick={() => setBalance(v)}>
                {s}
                {Number(v) / 1000}k
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Risk %">
          <TextInput
            inputMode="decimal"
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            {["0.25", "0.5", "1", "2"].map((v) => (
              <Chip key={v} active={riskPct === v} onClick={() => setRiskPct(v)} className="flex-1">
                {v}%
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Pair">
          <div className="grid grid-cols-3 gap-2">
            {CALC_PAIRS.map((p) => (
              <Chip key={p} active={pair === p} onClick={() => setPair(p)}>
                {p.slice(0, 3)}/{p.slice(3)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Stop loss">
          <div className="mb-2 flex gap-2">
            <Chip active={mode === "pips"} onClick={() => setMode("pips")} className="flex-1">
              In pips
            </Chip>
            <Chip active={mode === "prices"} onClick={() => setMode("prices")} className="flex-1">
              Entry & stop
            </Chip>
          </div>
          {mode === "pips" ? (
            <TextInput
              inputMode="decimal"
              value={pips}
              onChange={(e) => setPips(e.target.value)}
              placeholder="Pips"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                inputMode="decimal"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Entry"
              />
              <TextInput
                inputMode="decimal"
                value={stop}
                onChange={(e) => setStop(e.target.value)}
                placeholder="Stop"
              />
            </div>
          )}
        </Field>
        <p className="text-xs text-muted-foreground">
          Standard lot = 100,000 units. Uses live exchange rates.
        </p>
      </Card>
    </div>
  );
}
