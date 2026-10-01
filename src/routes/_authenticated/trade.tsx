import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, ImagePlus, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, SelectInput, Stat, TextArea, TextInput } from "@/components/app/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import {
  OUTCOMES,
  STRATEGIES,
  TRENDS,
  addRule,
  addTrade,
  biasHistoryQuery,
  computeBias,
  deleteRule,
  deleteTrade,
  saveBias,
  tradeRulesQuery,
  tradeStats,
  tradesQuery,
  uploadTradeScreenshot,
  type BiasInput,
  type Trend,
} from "@/lib/trade";
import { addEntry, deleteEntry, tradeLessonsQuery, updateEntry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({
    meta: [
      { title: "Trade — My Journey" },
      { name: "description", content: "Your trading rules, bias tracker and trade log with entries, stops, targets and emotions." },
      { property: "og:title", content: "Trade — My Journey" },
      { property: "og:description", content: "Your trading rules, bias tracker and trade log with entries, stops, targets and emotions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Trade,
});

type Tab = "bias" | "log" | "rules" | "lessons";

const TAB_TITLES: Record<Tab, string> = {
  bias: "Bias tracker",
  log: "Trade log",
  rules: "My rules",
  lessons: "My lessons",
};

function Trade() {
  const [tab, setTab] = useState<Tab>("bias");
  return (
    <AppShell eyebrow="Trading" title={TAB_TITLES[tab]}>
      <div className="flex gap-2">
        <Chip active={tab === "bias"} onClick={() => setTab("bias")} className="flex-1">Bias</Chip>
        <Chip active={tab === "log"} onClick={() => setTab("log")} className="flex-1">Log</Chip>
        <Chip active={tab === "rules"} onClick={() => setTab("rules")} className="flex-1">Rules</Chip>
        <Chip active={tab === "lessons"} onClick={() => setTab("lessons")} className="flex-1">Lessons</Chip>
      </div>
      {tab === "bias" && <BiasTab />}
      {tab === "log" && <LogTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "lessons" && <LessonsTab />}
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
  const [input, setInput] = useState<BiasInput>({ tf_4h: "bullish", tf_1h: "bullish", tf_15m: "bullish", tf_5m: "bullish" });
  const { data: history } = useQuery(biasHistoryQuery);
  const result = computeBias(input);

  const tone =
    result.level === "strong" ? "bg-trading-soft text-trading" : result.level === "partial" ? "bg-fitness-soft text-fitness" : "bg-secondary text-muted-foreground";

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
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{tf.label}</p>
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
          {result.level === "strong" ? "Take it" : result.level === "partial" ? "Your call" : "Stand down"}
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
          <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>Save this read</PrimaryButton>
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
  const stats = tradeStats(trades ?? []);

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
          <Stat label="Total R" value={stats.totalR} tone={stats.totalR >= 0 ? "text-trading" : "text-destructive"} />
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Log a trade</span>
          </PrimaryButton>
        </div>
      </Card>

      {!trades?.length ? (
        <Card><Empty>No trades logged yet.</Empty></Card>
      ) : (
        trades.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold leading-none">{t.pair}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {prettyDate(t.date)}{t.time_of_trade ? ` · ${String(t.time_of_trade).slice(0, 5)}` : ""} · {t.direction}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    t.outcome === "win" ? "bg-trading-soft text-trading" : t.outcome === "loss" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.outcome}{t.result_r != null ? ` ${Number(t.result_r) > 0 ? "+" : ""}${Number(t.result_r)}R` : ""}
                </span>
                <button aria-label="Delete trade" onClick={() => remove.mutate(t.id)} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              {STRATEGIES.find((s) => s.value === t.strategy)?.label ?? t.strategy}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Stat label="Entry" value={t.entry ?? "—"} />
              <Stat label="Stop" value={t.stop ?? "—"} />
              <Stat label="Target" value={t.target ?? "—"} />
              <Stat label="RR" value={t.rr ?? "—"} />
            </div>
            {t.screenshot_url && (
              <img src={t.screenshot_url} alt={`${t.pair} chart`} className="mt-3 w-full rounded-2xl border object-cover" />
            )}
            {t.emotions && <p className="mt-3 text-sm font-medium"><span className="font-bold">Emotions: </span>{t.emotions}</p>}
            {t.notes && <p className="mt-1 text-sm font-medium text-muted-foreground">{t.notes}</p>}
          </Card>
        ))
      )}

      <TradeSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function TradeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    date: todayISO(),
    time_of_trade: "",
    pair: "",
    strategy: "all_tf_aligned",
    direction: "long",
    entry: "",
    stop: "",
    target: "",
    rr: "",
    outcome: "open",
    result_r: "",
    emotions: "",
    notes: "",
    screenshot_url: "",
    lesson: "",
  });
  const [markLesson, setMarkLesson] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const pickPhoto = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const save = useMutation({
    mutationFn: async () => {
      let screenshotUrl: string | null = f.screenshot_url || null;
      if (photo) screenshotUrl = await uploadTradeScreenshot(photo);
      await addTrade({
        date: f.date,
        time_of_trade: f.time_of_trade || null,
        pair: f.pair.trim().toUpperCase(),
        strategy: f.strategy,
        direction: f.direction,
        entry: f.entry ? Number(f.entry) : null,
        stop: f.stop ? Number(f.stop) : null,
        target: f.target ? Number(f.target) : null,
        rr: f.rr ? Number(f.rr) : null,
        outcome: f.outcome,
        result_r: f.result_r ? Number(f.result_r) : null,
        emotions: f.emotions || null,
        notes: f.notes || null,
        screenshot_url: screenshotUrl,
      });
      if (f.notes.trim()) {
        await addEntry({ text: `${f.pair.toUpperCase()}: ${f.notes.trim()}`, pillar: "trading", entry_type: "trade_review", date: f.date });
      }
      if (markLesson && f.lesson.trim()) {
        await addEntry({ text: f.lesson.trim(), pillar: "trading", entry_type: "lesson", is_lesson: true, date: f.date });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(markLesson && f.lesson.trim() ? "Trade logged and lesson saved" : "Trade logged");
      onOpenChange(false);
      pickPhoto(null);
      setMarkLesson(false);
      setF((s) => ({ ...s, pair: "", entry: "", stop: "", target: "", rr: "", result_r: "", emotions: "", notes: "", screenshot_url: "", lesson: "" }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Log a trade">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><TextInput type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Time of trade"><TextInput type="time" value={f.time_of_trade} onChange={(e) => set("time_of_trade", e.target.value)} /></Field>
      </div>
      <Field label="Pair"><TextInput value={f.pair} onChange={(e) => set("pair", e.target.value)} placeholder="e.g. GBPUSD" /></Field>
      <Field label="Strategy used">
        <SelectInput value={f.strategy} onChange={(e) => set("strategy", e.target.value)}>
          {STRATEGIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </SelectInput>
      </Field>
      <Field label="Direction">
        <div className="flex gap-2">
          <Chip active={f.direction === "long"} onClick={() => set("direction", "long")} className="flex-1">Long</Chip>
          <Chip active={f.direction === "short"} onClick={() => set("direction", "short")} className="flex-1">Short</Chip>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entry"><TextInput inputMode="decimal" value={f.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
        <Field label="Stop"><TextInput inputMode="decimal" value={f.stop} onChange={(e) => set("stop", e.target.value)} /></Field>
        <Field label="Target"><TextInput inputMode="decimal" value={f.target} onChange={(e) => set("target", e.target.value)} /></Field>
        <Field label="Risk : reward"><TextInput inputMode="decimal" value={f.rr} onChange={(e) => set("rr", e.target.value)} /></Field>
      </div>
      <Field label="Outcome">
        <div className="flex gap-2">
          {OUTCOMES.map((o) => (
            <Chip key={o} active={f.outcome === o} onClick={() => set("outcome", o)} className="flex-1">{o}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Result in R"><TextInput inputMode="decimal" value={f.result_r} onChange={(e) => set("result_r", e.target.value)} placeholder="e.g. 2 or -1" /></Field>
      <Field label="Chart screenshot">
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="Chart screenshot preview" className="max-h-56 w-full rounded-2xl border object-cover" />
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
      <Field label="Or paste a link"><TextInput value={f.screenshot_url} onChange={(e) => set("screenshot_url", e.target.value)} placeholder="Paste an image link" /></Field>
      <Field label="Emotions"><TextInput value={f.emotions} onChange={(e) => set("emotions", e.target.value)} placeholder="Calm, rushed, revenge…" /></Field>
      <Field label="Review notes (saved to your journal)"><TextArea value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!f.pair.trim() || save.isPending}>Save trade</PrimaryButton>
    </FormSheet>
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-trading-soft text-xs font-extrabold text-trading">{i + 1}</span>
              <span className="flex-1 text-sm font-semibold leading-snug">{r.text}</span>
              <button aria-label="Delete rule" onClick={() => remove.mutate(r.id)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <Field label="Add a rule"><TextArea value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <div className="mt-3">
          <PrimaryButton onClick={() => add.mutate()} disabled={!text.trim() || add.isPending}>Add rule</PrimaryButton>
        </div>
      </Card>
    </>
  );
}
