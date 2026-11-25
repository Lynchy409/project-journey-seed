import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tradesQuery, type TradeRow } from "@/lib/trade";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "@/lib/day";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/app/ui";
import { Download, Upload, ArrowUpDown, Pencil, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  HEADERS,
  sheetRow,
  csv,
  htfOf,
  execOf,
  summary,
  groups,
  tradeMetric,
  sheetOf,
  parseRows,
  importPayload,
  duplicateImport,
  type ImportRow,
} from "@/lib/trade-sheet";

type Metric = "R" | "Cash" | "Pips";
const fmt = (v: number | null) => (v === null ? "—" : Number(v.toFixed(2)).toLocaleString("en-GB"));
export function TradeSpreadsheet({ onEdit }: { onEdit: (t: TradeRow) => void }) {
  const { data: trades = [], isError } = useQuery(tradesQuery),
    qc = useQueryClient();
  const [metric, setMetric] = useState<Metric>("Pips"),
    [htf, setHtf] = useState(""),
    [exec, setExec] = useState(""),
    [pair, setPair] = useState(""),
    [account, setAccount] = useState(""),
    [news, setNews] = useState(""),
    [group, setGroup] = useState("combo"),
    [result, setResult] = useState(""),
    [min, setMin] = useState("5");
  const [sort, setSort] = useState({ col: 0, asc: false }),
    [preview, setPreview] = useState<ImportRow[]>([]),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [ranking, setRanking] = useState("net");
  const [showFilters, setShowFilters] = useState(false);
  const [importAccount, setImportAccount] = useState("historical");
  const rows = trades.filter(
    (t) =>
      (!account || t.source === account) &&
      (!pair || t.pair === pair) &&
      (!htf || (htf === "Unknown" ? htfOf(t).length === 0 : htfOf(t).includes(htf))) &&
      (!exec || execOf(t) === exec) &&
      (!news || sheetOf(t).nearNews === news) &&
      (!result || t.outcome === result) &&
      (!from || t.date >= from) &&
      (!to || t.date <= to) &&
      (!search || sheetRow(t).join(" ").toLowerCase().includes(search.toLowerCase())),
  );
  const stats = summary(rows, metric);
  const breakdown = groups(
    rows,
    (t) =>
      group === "htf"
        ? htfOf(t).length
          ? htfOf(t)
          : ["Unknown"]
        : group === "exec"
          ? [execOf(t)]
          : group === "pair"
            ? [t.pair]
            : group === "news"
              ? [
                  sheetOf(t).nearNews === "Y"
                    ? "Near news"
                    : sheetOf(t).nearNews === "N"
                      ? "No nearby news"
                      : "Unknown",
                ]
              : group === "time"
                ? [t.time_of_trade ? `${t.time_of_trade.slice(0, 2)}:00 UK` : "Unknown time"]
                : group === "plan"
                  ? [
                      sheetOf(t).followedPlan === "Y"
                        ? "Followed plan"
                        : sheetOf(t).followedPlan === "N"
                          ? "Did not follow plan"
                          : "Not recorded",
                    ]
                  : (htfOf(t).length ? htfOf(t) : ["Unknown"]).map((h) => `${h} → ${execOf(t)}`),
    metric,
  );
  const rated = breakdown.filter((g) => g.count >= Number(min) && g.coverage === g.count);
  const best = rated.find((g) => g.total !== null && g.total > 0),
    worst = [...rated].reverse().find((g) => g.total !== null && g.total < 0);
  const winLeader = [...breakdown]
    .filter((g) => g.count >= Number(min))
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];
  const displayed = [...breakdown].sort((a, b) =>
    Number(b.count >= Number(min)) - Number(a.count >= Number(min)) || (ranking === "win"
      ? (b.winRate ?? -Infinity) - (a.winRate ?? -Infinity)
      : ranking === "average"
        ? (b.average ?? -Infinity) - (a.average ?? -Infinity)
        : (b.total ?? -Infinity) - (a.total ?? -Infinity)),
  );
  const ranked = rows
    .filter((t) => tradeMetric(t, metric) !== null)
    .sort((a, b) => (tradeMetric(b, metric) ?? 0) - (tradeMetric(a, metric) ?? 0));
  const ordered = [...rows].sort((a, b) => {
    const av = sheetRow(a)[sort.col] ?? "",
      bv = sheetRow(b)[sort.col] ?? "";
    const numericCols = [9, 10, 13, 14, 23, 24, 25, 26, 27, 28];
    const compare =
      sort.col === 0
        ? (sheetOf(a).sortAnchor ?? a.date).localeCompare(sheetOf(b).sortAnchor ?? b.date) ||
          (sheetOf(a).importPosition ?? 0) - (sheetOf(b).importPosition ?? 0)
        : numericCols.includes(sort.col) && av !== "" && bv !== ""
          ? Number(av) - Number(bv)
          : String(av).localeCompare(String(bv));
    return compare * (sort.asc ? 1 : -1);
  });
  const select = (label: string, value: string, set: (v: string) => void, options: string[]) => (
    <Field label={label}>
      <SelectInput value={value} onChange={(e) => set(e.target.value)}>
        <option value="">All</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {(
              {
                historical: "Historical",
                forexcom: "Forex.com",
                spreadex: "Spreadex",
                demo: "Demo",
                combo: "HTF + execution",
                htf: "HTF confluence",
                exec: "LTF execution",
                pair: "Pair",
                news: "Nearby news",
                time: "Entry hour",
                plan: "Plan followed",
              } as Record<string, string>
            )[v] ?? v}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
  async function readFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets["Trades"] ?? wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!ws) throw new Error("No trade sheet found");
      const rs = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
      setPreview(parseRows(rs));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read spreadsheet");
    } finally {
      setBusy(false);
    }
  }
  const pending = preview.filter((r) => !duplicateImport(r, trades));
  async function importTrades() {
    setBusy(true);
    try {
      const user = await uid();
      const seen = new Set<string>();
      const inserts = pending
        .filter((r) => {
          const key = JSON.stringify(r.original);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((r) => ({ ...importPayload(r, importAccount), user_id: user }));
      if (!importAccount) throw new Error("Choose an import account");
      if (!inserts.length) throw new Error("No new trades to import");
      const { error } = await supabase.from("trades").insert(inserts);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["trades"] });
      toast.success(`${inserts.length} historical trades imported`);
      setPreview([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Spreadsheet & edge</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-12"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(["\uFEFF" + csv(ordered)], { type: "text/csv;charset=utf-8;" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "My-Journey-trades.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download />
            Export
          </Button>
          <Button
            variant="outline"
            className="min-h-12"
            disabled={busy}
            onClick={() => document.getElementById("trade-sheet-file")?.click()}
          >
            <Upload />
            {busy ? "Reading…" : "Import"}
          </Button>
          <input
            id="trade-sheet-file"
            type="file"
            accept=".ods,.xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {isError && <p className="text-destructive">Could not load trades. Refresh to retry.</p>}
      {preview.length > 0 && (
        <section className="space-y-3 border-y py-4">
          <h3 className="font-bold">Import review · {preview.length} trade rows</h3>
          <p className="text-sm text-muted-foreground">
            {pending.length} new trades · {preview.filter((r) => !r.date).length} missing dates ·{" "}
            {preview.filter((r) => duplicateImport(r, trades)).length} already saved. Original cells
            retained; blanks stay unknown.
          </p>
          {select("Import account", importAccount, setImportAccount, [
            "historical",
            "forexcom",
            "spreadex",
            "demo",
          ])}
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {["Row", "Pair", "Date", "Review"].map((s) => (
                    <th key={s} className="p-2 text-left">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="p-2">{r.row}</td>
                    <td>{r.original["Pair"]}</td>
                    <td>
                      <TextInput
                        aria-label={`Date row ${r.row}`}
                        type="date"
                        value={r.date}
                        onChange={(e) =>
                          setPreview((ps) =>
                            ps.map((p) => (p.row === r.row ? { ...p, date: e.target.value } : p)),
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      {duplicateImport(r, trades)
                        ? "Already saved"
                        : r.warnings.filter((w) => w !== "Missing date" || !r.date).join(" · ") ||
                          "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              className="min-h-12"
              disabled={busy || !pending.length}
              onClick={() => void importTrades()}
            >
              Import {pending.length} trades
            </Button>
            <Button variant="ghost" onClick={() => setPreview([])}>
              Close
            </Button>
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3">
        {select("HTF confluence", htf, setHtf, [
          ...new Set(trades.flatMap((t) => (htfOf(t).length ? htfOf(t) : ["Unknown"]))),
        ])}
        {select("LTF execution", exec, setExec, [...new Set(trades.map(execOf))])}
      </div>
      <Button
        variant="ghost"
        className="min-h-12"
        aria-expanded={showFilters}
        onClick={() => setShowFilters(!showFilters)}
      >
        <SlidersHorizontal />
        More filters
      </Button>
      {showFilters && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {select("Account", account, setAccount, [...new Set(trades.map((t) => t.source))])}
            {select("Pair", pair, setPair, [...new Set(trades.map((t) => t.pair))])}
            {select("News near entry", news, setNews, ["Y", "N"])}
            {select("Result", result, setResult, ["win", "loss", "breakeven", "open"])}
            <Field label="From">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <TextInput
            aria-label="Search trade notes"
            placeholder="Search notes, news or trades"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="ghost"
            onClick={() => {
              setAccount("");
              setPair("");
              setNews("");
              setResult("");
              setFrom("");
              setTo("");
              setSearch("");
              setHtf("");
              setExec("");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        {(["R", "Cash", "Pips"] as const).map((m) => (
          <Button
            key={m}
            variant={metric === m ? "default" : "outline"}
            aria-pressed={metric === m}
            className="min-h-12 flex-1"
            onClick={() => setMetric(m)}
          >
            {m}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 border-y py-4">
        {[
          ["Closed trades", stats.count],
          ["Win rate", stats.winRate === null ? "—" : fmt(stats.winRate) + "%"],
          [`Net ${metric}`, fmt(stats.total)],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {metric} available for {stats.coverage}/{stats.count} closed trades. Win rate is not
        profitability; historical results do not guarantee future returns. Pips are not cash profit.
        Cash uses recorded net £ only.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {select("Compare", group, setGroup, [
          "combo",
          "htf",
          "exec",
          "pair",
          "news",
          "time",
          "plan",
        ])}
        <Field label="Minimum sample">
          <SelectInput value={min} onChange={(e) => setMin(e.target.value)}>
            {["1", "5", "10", "20", "30"].map((s) => (
              <option key={s} value={s}>
                {s} trades
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-trading">Highest win rate</p>
          <p className="font-bold">{winLeader?.label ?? "Not enough trades"}</p>
          {winLeader && (
            <p className="text-sm">
              {fmt(winLeader.winRate)}% · {winLeader.count} trades
            </p>
          )}
        </div>
        <Field label="Rank by">
          <SelectInput value={ranking} onChange={(e) => setRanking(e.target.value)}>
            <option value="net">Net result</option>
            <option value="win">Win rate</option>
            <option value="average">Average result</option>
          </SelectInput>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-trading">
            {metric === "Pips" ? "Highest recorded pips" : "Highest recorded profit"}
          </p>
          <p className="font-bold">{best?.label ?? "Not enough complete data"}</p>
          {best && (
            <p className="text-sm">
              {fmt(best.total)} {metric} · {best.count} trades
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-destructive">Lowest recorded result</p>
          <p className="font-bold">{worst?.label ?? "Not enough complete data"}</p>
          {worst && (
            <p className="text-sm">
              {fmt(worst.total)} {metric} · {worst.count} trades
            </p>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {[
                "Setup / group",
                "W / L",
                "Win %",
                `Net ${metric}`,
                `Avg ${metric}`,
                "Coverage",
              ].map((s) => (
                <th
                  key={s}
                  className="whitespace-nowrap border-b px-3 py-2 text-left text-xs text-muted-foreground"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((g) => (
              <tr key={g.label} className="border-b">
                <td className="px-3 py-3 font-bold">
                  {g.label}
                  {g.count < Number(min) && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Small sample
                    </span>
                  )}
                </td>
                <td className="px-3">
                  {g.wins} / {g.losses}
                </td>
                <td className="min-w-28 px-3">
                  {fmt(g.winRate)}
                  <progress
                    className="block h-1.5 w-full accent-trading"
                    value={g.winRate ?? 0}
                    max={100}
                    aria-label={`${g.label} win rate`}
                  />
                </td>
                <td className={`px-3 ${(g.total ?? 0) < 0 ? "text-destructive" : "text-trading"}`}>
                  {fmt(g.total)}
                </td>
                <td className="px-3">{fmt(g.average)}</td>
                <td className="px-3">
                  {g.coverage}/{g.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "Biggest winners",
            ts: ranked.filter((t) => (tradeMetric(t, metric) ?? 0) > 0).slice(0, 3),
          },
          {
            title: "Biggest losses",
            ts: [...ranked]
              .reverse()
              .filter((t) => (tradeMetric(t, metric) ?? 0) < 0)
              .slice(0, 3),
          },
        ].map(({ title, ts }) => (
          <section key={title}>
            <h3 className="mb-2 font-bold">{title}</h3>
            {ts.map((t) => (
              <div key={t.id} className="border-b py-3">
                <Button variant="link" className="h-auto p-0" onClick={() => onEdit(t)}>
                  {t.pair} · {fmt(tradeMetric(t, metric))} {metric}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t.date} · {htfOf(t).join(", ")} → {execOf(t)}
                </p>
                {t.notes && <p className="mt-1 break-words text-xs">{t.notes}</p>}
              </div>
            ))}
            {!ts.length && <p className="text-sm text-muted-foreground">No recorded results.</p>}
          </section>
        ))}
      </div>
      <h3 className="font-bold">Trades · {rows.length}</h3>
      <div className="max-h-[600px] overflow-auto border-y">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="p-2">Edit</th>
              {HEADERS.map((h, i) => (
                <th key={h} className="whitespace-nowrap p-2 text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSort({ col: i, asc: sort.col === i ? !sort.asc : true })}
                  >
                    {h}
                    <ArrowUpDown className="size-3" />
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((t) => (
              <tr key={t.id} className="border-t hover:bg-accent">
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${t.pair} ${t.date}`}
                    onClick={() => onEdit(t)}
                  >
                    <Pencil />
                  </Button>
                </td>
                {sheetRow(t).map((v, i) => (
                  <td
                    key={i}
                    className={`px-3 py-3 ${i === 21 || i === 20 ? "min-w-64 max-w-96 whitespace-normal" : "whitespace-nowrap"}`}
                  >
                    {typeof v === "number" && [13, 14, 26, 27].includes(i)
                      ? fmt(v)
                      : v === ""
                        ? "—"
                        : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="text-sm text-muted-foreground">No trades match these filters.</p>
      )}
    </div>
  );
}
