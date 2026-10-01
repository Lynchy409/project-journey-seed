import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GraduationCap, ImagePlus, Newspaper, Pencil, Pin, Plus, Sunrise, Trash2 } from "lucide-react";
import { getNewsEvents, type NewsEvent } from "@/lib/news.functions";
import { LessonToggle } from "@/components/app/LessonToggle";
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
  updateTrade,
  uploadTradeScreenshot,
  type BiasInput,
  type TradeRow,
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

type Tab = "bias" | "log" | "rules" | "lessons" | "news" | "calc";

const TAB_TITLES: Record<Tab, string> = {
  bias: "Bias tracker",
  log: "Trade log",
  rules: "My rules",
  lessons: "My lessons",
  news: "News",
  calc: "Lot size calculator",
};

function Trade() {
  const [tab, setTab] = useState<Tab>("bias");
  return (
    <AppShell eyebrow="Trading" title={TAB_TITLES[tab]}>
      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "bias"} onClick={() => setTab("bias")} className="flex-1">Bias</Chip>
        <Chip active={tab === "log"} onClick={() => setTab("log")} className="flex-1">Log</Chip>
        <Chip active={tab === "rules"} onClick={() => setTab("rules")} className="flex-1">Rules</Chip>
        <Chip active={tab === "lessons"} onClick={() => setTab("lessons")} className="flex-1">Lessons</Chip>
        <Chip active={tab === "news"} onClick={() => setTab("news")} className="flex-1">News</Chip>
        <Chip active={tab === "calc"} onClick={() => setTab("calc")} className="flex-1">Calc</Chip>
      </div>
      {tab === "bias" && <BiasTab />}
      {tab === "log" && <LogTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "lessons" && <LessonsTab />}
      {tab === "news" && <NewsTab />}
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
  const [editing, setEditing] = useState<TradeRow | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
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
        <div className="mt-3 space-y-2">
          <PrimaryButton onClick={() => { setEditing(null); setOpen(true); }}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Log a trade</span>
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
                <button aria-label="Edit trade" onClick={() => { setEditing(t); setOpen(true); }} className="text-muted-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
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

      <TradeSheet open={open} onOpenChange={setOpen} trade={editing} />
    </>
  );
}

function TradeSheet({ open, onOpenChange, trade }: { open: boolean; onOpenChange: (v: boolean) => void; trade: TradeRow | null }) {
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

  useEffect(() => {
    if (!open) return;
    if (trade) {
      setF({
        date: trade.date,
        time_of_trade: trade.time_of_trade ? String(trade.time_of_trade).slice(0, 5) : "",
        pair: trade.pair,
        strategy: trade.strategy,
        direction: trade.direction,
        entry: trade.entry != null ? String(trade.entry) : "",
        stop: trade.stop != null ? String(trade.stop) : "",
        target: trade.target != null ? String(trade.target) : "",
        rr: trade.rr != null ? String(trade.rr) : "",
        outcome: trade.outcome,
        result_r: trade.result_r != null ? String(trade.result_r) : "",
        emotions: trade.emotions ?? "",
        notes: trade.notes ?? "",
        screenshot_url: trade.screenshot_url ?? "",
        lesson: "",
      });
      setMarkLesson(false);
      setPhoto(null);
      setPreview(trade.screenshot_url ?? null);
    }
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
      };
      if (trade) {
        await updateTrade(trade.id, payload);
      } else {
        await addTrade(payload);
        if (f.notes.trim()) {
          await addEntry({ text: `${f.pair.toUpperCase()}: ${f.notes.trim()}`, pillar: "trading", entry_type: "trade_review", date: f.date });
        }
        if (markLesson && f.lesson.trim()) {
          await addEntry({ text: f.lesson.trim(), pillar: "trading", entry_type: "lesson", is_lesson: true, date: f.date });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(trade ? "Trade updated" : markLesson && f.lesson.trim() ? "Trade logged and lesson saved" : "Trade logged");
      onOpenChange(false);
      pickPhoto(null);
      setMarkLesson(false);
      setF((s) => ({ ...s, pair: "", entry: "", stop: "", target: "", rr: "", result_r: "", emotions: "", notes: "", screenshot_url: "", lesson: "" }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={trade ? "Edit trade" : "Log a trade"}>
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

      {!trade && (
        <LessonToggle on={markLesson} onToggle={() => setMarkLesson((v) => !v)} value={f.lesson} onChange={(v) => set("lesson", v)} />
      )}

      <PrimaryButton onClick={() => save.mutate()} disabled={!f.pair.trim() || save.isPending}>
        {trade ? "Save changes" : "Save trade"}
      </PrimaryButton>
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
    mutationFn: () => addEntry({ text: text.trim(), pillar: "trading", entry_type: "lesson", is_lesson: true }),
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
              <li key={l.id} className={`rounded-2xl border p-3 ${l.pinned ? "border-trading bg-trading-soft" : ""}`}>
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
                  <button aria-label="Delete lesson" onClick={() => remove.mutate(l.id)} className="text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 pl-8 text-xs font-bold text-muted-foreground">{prettyDate(l.date)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <Field label="New lesson">
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="The rule you take forward…" />
        </Field>
        <div className="mt-3">
          <PrimaryButton onClick={() => add.mutate()} disabled={!text.trim() || add.isPending}>Add lesson</PrimaryButton>
        </div>
      </Card>
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
      await addEntry({ text: notes.trim() ? `${header}\n\n${notes.trim().slice(0, 5000)}` : header, pillar: "trading", entry_type: "session_note", date });
      if (markLesson && lesson.trim()) {
        await addEntry({ text: lesson.trim().slice(0, 500), pillar: "trading", entry_type: "lesson", is_lesson: true, date });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success(markLesson && lesson.trim() ? "Recap saved and lesson added" : "Recap saved to your journal");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="London session recap">
      <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Did you follow your rules?">
        <div className="flex gap-2">
          <Chip active={followed === "yes"} onClick={() => setFollowed("yes")} className="flex-1">Yes</Chip>
          <Chip active={followed === "no"} onClick={() => setFollowed("no")} className="flex-1">No</Chip>
        </div>
      </Field>
      <Field label="Session notes (saved to your journal)">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did London open play out? What did you do well?" className="min-h-32" />
      </Field>
      <LessonToggle on={markLesson} onToggle={() => setMarkLesson((v) => !v)} value={lesson} onChange={setLesson} />
      <PrimaryButton onClick={() => save.mutate()} disabled={!followed || save.isPending}>
        {save.isPending ? "Saving…" : "Save recap"}
      </PrimaryButton>
    </FormSheet>
  );
}

/* ---------------------------------- news ---------------------------------- */

function tzOffset(ms: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p["year"]!, +p["month"]! - 1, +p["day"]!, +p["hour"]! % 24, +p["minute"]!) - ms;
}

/** Feed date/time are New York; returns a UTC instant (or null for all-day). */
function newsInstant(date: string, time: string): Date | null {
  const [m = 1, d = 1, y = 1970] = date.split("-").map(Number);
  const t = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!t) return null;
  let h = Number(t[1]) % 12;
  if (t[3]!.toLowerCase() === "pm") h += 12;
  const guess = Date.UTC(y, m - 1, d, h, Number(t[2]));
  return new Date(guess - tzOffset(guess, "America/New_York"));
}

const londonDay = (dt: Date) => dt.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const londonTime = (dt: Date) => dt.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

function newsDayLabel(key: string, isToday: boolean): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  const base = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  return isToday ? `Today · ${base}` : base;
}

function NewsTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
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
    const at = newsInstant(e.date, e.time);
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
          Red & orange events for EUR · USD · GBP · JPY. Times are London (UK).
        </p>
        <button
          className="text-xs font-semibold text-trading"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? "…" : "Refresh"}
        </button>
      </Card>
      {days.size === 0 && <Empty>No high or medium impact events this week.</Empty>}
      {[...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, events]) => {
        const isToday = key === todayKey;
        const isPast = key < todayKey;
        return (
        <div key={key} className={isToday ? "rounded-3xl border-2 border-trading bg-trading-soft p-3" : isPast ? "opacity-50" : ""}>
          <SectionTitle>
            <span className={isToday ? "text-trading" : ""}>{newsDayLabel(key, isToday)}</span>
          </SectionTitle>
          <div className="space-y-2">
            {events.map((e, i) => (
              <Card key={`${e.title}-${i}`} className={`flex items-center gap-3 !py-3 ${isToday && e.at && e.at.getTime() < now ? "opacity-60" : ""}`}>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    e.impact === "High" ? "bg-red-500" : "bg-orange-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{e.uk}</span> · {e.currency}
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
  const stopPips = mode === "pips" ? Number(pips) : Math.abs(Number(entry) - Number(stop)) / pipSize;
  const rate = rates?.[quote];
  const pipValuePerLot = rate ? (100000 * pipSize) / rate : 0;
  const riskCash = (Number(balance) * Number(riskPct)) / 100;
  const lots = stopPips > 0 && pipValuePerLot > 0 ? riskCash / (stopPips * pipValuePerLot) : 0;
  const s = SYM[ccy];

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lot size</p>
        <p className="text-5xl font-extrabold text-trading">{lots ? lots.toFixed(2) : "—"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Risk" value={`${s}${riskCash.toFixed(0)}`} />
          <Stat label="Stop" value={stopPips ? `${stopPips.toFixed(1)}p` : "—"} />
          <Stat label="Pip / lot" value={pipValuePerLot ? `${s}${pipValuePerLot.toFixed(2)}` : "…"} />
        </div>
        <button
          className="mt-3 h-12 w-full rounded-2xl border border-trading font-semibold text-trading disabled:opacity-40"
          disabled={!lots}
          onClick={() => { void navigator.clipboard.writeText(lots.toFixed(2)); toast.success("Lot size copied"); }}
        >
          Copy lots
        </button>
      </Card>

      <Card className="space-y-3">
        <Field label="Account currency">
          <div className="flex gap-2">
            {ACC_CCY.map((c) => <Chip key={c} active={ccy === c} onClick={() => setCcy(c)} className="flex-1">{SYM[c]} {c}</Chip>)}
          </div>
        </Field>
        <Field label="Account size">
          <TextInput inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {["10000", "25000", "50000", "100000", "200000"].map((v) => (
              <Chip key={v} active={balance === v} onClick={() => setBalance(v)}>{s}{Number(v) / 1000}k</Chip>
            ))}
          </div>
        </Field>
        <Field label="Risk %">
          <TextInput inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          <div className="mt-2 flex gap-2">
            {["0.25", "0.5", "1", "2"].map((v) => <Chip key={v} active={riskPct === v} onClick={() => setRiskPct(v)} className="flex-1">{v}%</Chip>)}
          </div>
        </Field>
        <Field label="Pair">
          <div className="grid grid-cols-3 gap-2">
            {CALC_PAIRS.map((p) => <Chip key={p} active={pair === p} onClick={() => setPair(p)}>{p.slice(0, 3)}/{p.slice(3)}</Chip>)}
          </div>
        </Field>
        <Field label="Stop loss">
          <div className="mb-2 flex gap-2">
            <Chip active={mode === "pips"} onClick={() => setMode("pips")} className="flex-1">In pips</Chip>
            <Chip active={mode === "prices"} onClick={() => setMode("prices")} className="flex-1">Entry & stop</Chip>
          </div>
          {mode === "pips" ? (
            <TextInput inputMode="decimal" value={pips} onChange={(e) => setPips(e.target.value)} placeholder="Pips" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TextInput inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Entry" />
              <TextInput inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="Stop" />
            </div>
          )}
        </Field>
        <p className="text-xs text-muted-foreground">Standard lot = 100,000 units. Uses live exchange rates.</p>
      </Card>
    </div>
  );
}
