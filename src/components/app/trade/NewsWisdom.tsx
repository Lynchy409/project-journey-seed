import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/app/AppShell";
import { Chip, Empty, SectionTitle } from "@/components/app/ui";
import { getMarketBriefing } from "@/lib/market.functions";
import { setWisdomRead, wisdomReadsQuery } from "@/lib/trade-accounts";
import { WISDOM, WISDOM_CATEGORIES, dailyPick, type WisdomCategory, type WisdomItem } from "@/lib/wisdom";
import { todayISO } from "@/lib/dates";

/** Calendar first, then today's study pick, the wisdom library and a short market wire. */
export function NewsWisdom({ calendar }: { calendar: ReactNode }) {
  const qc = useQueryClient();
  const { data: reads } = useQuery(wisdomReadsQuery);
  const readMap = new Map((reads ?? []).map((r) => [r.text, r.id]));
  const readIds = new Set(readMap.keys());
  const [cat, setCat] = useState<WisdomCategory | "unread" | "all">("all");
  const wire = useQuery({
    queryKey: ["market-briefing"],
    queryFn: () => getMarketBriefing(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const toggle = useMutation({
    mutationFn: (item: WisdomItem) => setWisdomRead(item.id, !readIds.has(item.id), readMap.get(item.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wisdom_reads"] }),
  });

  const pick = dailyPick(todayISO(), readIds);
  const library = WISDOM.filter((w) =>
    cat === "all" ? true : cat === "unread" ? !readIds.has(w.id) : w.category === cat,
  );
  const headlines = (wire.data?.headlines ?? []).filter((h) => h.kind !== "perspective").slice(0, 5);

  return (
    <div className="space-y-4">
      <SectionTitle>Forex Factory · this week</SectionTitle>
      {calendar}

      <SectionTitle>Today's study pick</SectionTitle>
      <WisdomCard item={pick} read={readIds.has(pick.id)} onToggle={() => toggle.mutate(pick)} featured />

      <SectionTitle action={<span className="text-xs font-bold text-trading">{readIds.size}/{WISDOM.length} read</span>}>
        Library
      </SectionTitle>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
        <Chip active={cat === "unread"} onClick={() => setCat("unread")}>Unread</Chip>
        {WISDOM_CATEGORIES.map((c) => (
          <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)} className="whitespace-nowrap">
            {c.label}
          </Chip>
        ))}
      </div>
      {library.length ? (
        library.map((w) => (
          <WisdomCard key={w.id} item={w} read={readIds.has(w.id)} onToggle={() => toggle.mutate(w)} />
        ))
      ) : (
        <Card><Empty>Everything here is read. Nice work.</Empty></Card>
      )}

      <SectionTitle>Market wire</SectionTitle>
      <Card className="!p-0">
        {wire.isPending ? (
          <Empty>Loading headlines…</Empty>
        ) : wire.isError || !headlines.length ? (
          <Empty>Headlines are unavailable right now.</Empty>
        ) : (
          <ul className="divide-y">
            {headlines.map((h) => (
              <li key={h.url}>
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">{h.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {h.publisher} ·{" "}
                      {new Date(h.publishedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function WisdomCard({
  item,
  read,
  onToggle,
  featured,
}: {
  item: WisdomItem;
  read: boolean;
  onToggle: () => void;
  featured?: boolean;
}) {
  const label = WISDOM_CATEGORIES.find((c) => c.value === item.category)?.label;
  return (
    <Card className={`${featured ? "border-2 border-trading" : ""} ${read && !featured ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-trading">
          {featured && <Sparkles className="h-3.5 w-3.5" />}
          {label} · {item.minutes} min
        </span>
      </div>
      <h3 className="mt-2 text-lg font-extrabold leading-snug">{item.title}</h3>
      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{item.source}</p>
      <p className="mt-2 text-sm font-medium">{item.hook}</p>
      {featured && <p className="mt-2 rounded-2xl bg-trading-soft p-3 text-sm font-semibold text-trading">{item.takeaway}</p>}
      <div className="mt-3 flex gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
        >
          Read <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={read}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold ${read ? "bg-trading-soft text-trading" : "border bg-card"}`}
        >
          {read ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {read ? "Read" : "Mark as read"}
        </button>
      </div>
    </Card>
  );
}
