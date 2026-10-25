import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "./AppShell";
import { Chip, Empty, Field, GhostButton, PrimaryButton, SectionTitle, TextArea } from "./ui";
import { getMarketBriefing } from "@/lib/market.functions";
import { MARKET_CONTEXT, type MarketTopic } from "@/lib/market-context";
import type { MarketHeadline } from "@/lib/market-feed";
import { addEntry } from "@/lib/journal";

const VIEWS = ["Briefing", "Events", "Perspectives", "Understand"] as const;
type View = (typeof VIEWS)[number];

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}

export function LearningLink({ lesson, children }: { lesson: string; children: ReactNode }) {
  return (
    <Link
      to="/learn"
      search={{ lesson }}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-learning underline underline-offset-4"
    >
      <BookOpen className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline underline-offset-4"
    >
      {children}
      <ExternalLink className="h-4 w-4 shrink-0" />
    </a>
  );
}

export function MarketHub({ events }: { events: ReactNode }) {
  const [view, setView] = useState<View>("Briefing");
  const [topic, setTopic] = useState<MarketTopic | "all">("all");
  const [visibleCount, setVisibleCount] = useState(8);
  const noteRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<MarketHeadline | null>(null);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const briefing = useQuery({
    queryKey: ["market-briefing"],
    queryFn: () => getMarketBriefing(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const save = useMutation({
    mutationFn: () =>
      addEntry({
        pillar: "trading",
        entry_type: "lesson",
        is_lesson: true,
        text: `${note.trim()}${selected ? `\n\nReading: ${selected.title}\n${selected.publisher} | ${selected.publishedAt}\n${selected.url}` : ""}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      setNote("");
      setSelected(null);
      toast.success("Saved to trading Lessons");
    },
    onError: () => toast.error("Could not save your note. It is still here; try again."),
  });
  const rows = (briefing.isError ? [] : (briefing.data?.headlines ?? [])).filter(
    (h) =>
      (view === "Perspectives" ? h.kind === "perspective" : h.kind !== "perspective") &&
      (topic === "all" || h.topic === topic),
  );
  const latest = rows[0];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Market knowledge hub</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Know what is happening, understand the context, then write what you learnt. News and
          opinions are not trade signals.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Market hub sections">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setVisibleCount(8);
              }}
              className={`min-h-11 rounded-2xl px-3 text-sm font-bold ${view === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </Card>

      {(view === "Briefing" || view === "Perspectives") && (
        <>
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">
                {view === "Briefing" ? "World and business headlines" : "Policy perspectives"}
              </h2>
              <button
                type="button"
                aria-label="Refresh market sources"
                onClick={() => briefing.refetch()}
                disabled={briefing.isFetching}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-secondary disabled:opacity-40"
              >
                <RefreshCw className={`h-4 w-4 ${briefing.isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {briefing.data
                ? `Sources checked ${dateLabel(briefing.data.fetchedAt)} UK time. Server cache: up to 5 minutes.`
                : "Headlines are fetched from public publisher feeds."}
            </p>
            {view === "Perspectives" && (
              <p className="mt-2 text-sm text-muted-foreground">
                These are central-bank speeches and authored commentary, not independent analyst
                consensus. Read the full argument and publication date before forming a view.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip
                active={topic === "all"}
                onClick={() => {
                  setTopic("all");
                  setVisibleCount(8);
                }}
              >
                All topics
              </Chip>
              {(Object.keys(MARKET_CONTEXT) as MarketTopic[])
                .filter((t) => t !== "mechanics")
                .map((t) => (
                  <Chip
                    key={t}
                    active={topic === t}
                    onClick={() => {
                      setTopic(t);
                      setVisibleCount(8);
                    }}
                  >
                    {MARKET_CONTEXT[t].title.split(" and ")[0]}
                  </Chip>
                ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Topic labels are automatic reading aids, not explanations of price moves.
            </p>
          </Card>
          {briefing.isPending && (
            <Card>
              <p role="status">Checking market sources…</p>
            </Card>
          )}
          {briefing.isError && (
            <Card>
              <p role="alert" className="text-sm text-destructive">
                The briefing could not be loaded. No current news is being shown.
              </p>
              <GhostButton onClick={() => briefing.refetch()}>Try sources again</GhostButton>
            </Card>
          )}
          {!briefing.isPending && !briefing.isError && rows.length === 0 && (
            <Card>
              <Empty>
                No dated items match this view. Try All topics or open the publisher below.
              </Empty>
            </Card>
          )}
          {latest && view === "Briefing" && (
            <Card>
              <SectionTitle>Your 10-minute market study</SectionTitle>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                <li>Read a dated headline and open the original report.</li>
                <li>Check Events for scheduled releases relevant to your pair.</li>
                <li>{MARKET_CONTEXT[latest.topic].task}</li>
                <li>Save one takeaway below. Separate evidence from your opinion.</li>
              </ol>
              <LearningLink lesson={MARKET_CONTEXT[latest.topic].lesson}>
                Study the related lesson
              </LearningLink>
            </Card>
          )}
          {rows.slice(0, visibleCount).map((h) => (
            <Card key={h.url}>
              <p className="text-xs font-bold text-trading">
                {h.publisher} ·{" "}
                {h.kind === "reporting"
                  ? "Reported headline"
                  : h.kind === "official"
                    ? "Official communication"
                    : "Policy commentary"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateLabel(h.publishedAt)} UK time
                {Date.now() - Date.parse(h.publishedAt) > 7 * 86_400_000
                  ? " · Older than 7 days"
                  : ""}
              </p>
              <h3 className="mt-3 text-base font-extrabold">{h.title}</h3>
              {h.author && <p className="mt-1 text-xs text-muted-foreground">By {h.author}</p>}
              <SourceLink href={h.url}>Read at {h.publisher}</SourceLink>
              <details className="mt-2 rounded-2xl bg-secondary p-3">
                <summary className="cursor-pointer text-sm font-bold">
                  How to study this story
                </summary>
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  Evergreen context, not a claim about this story's market impact
                </p>
                <p className="mt-2 text-sm">{MARKET_CONTEXT[h.topic].summary}</p>
                <LearningLink lesson={MARKET_CONTEXT[h.topic].lesson}>
                  Learn {MARKET_CONTEXT[h.topic].title.toLowerCase()}
                </LearningLink>
              </details>
              <GhostButton
                onClick={() => {
                  setSelected(h);
                  noteRef.current?.scrollIntoView({ block: "center" });
                }}
              >
                {selected?.url === h.url ? "Selected for your note" : "Use in my learning note"}
              </GhostButton>
            </Card>
          ))}
          {rows.length > visibleCount && (
            <GhostButton onClick={() => setVisibleCount((n) => n + 8)}>
              Show more headlines
            </GhostButton>
          )}
          {briefing.data && (
            <Card>
              <SectionTitle>Source availability</SectionTitle>
              <ul className="mt-2 divide-y">
                {briefing.data.sources.map((s) => (
                  <li key={s.id} className="py-2">
                    <SourceLink href={s.home}>{s.name}</SourceLink>
                    <p className="text-xs text-muted-foreground">
                      {s.status === "unavailable"
                        ? "Feed unavailable. Open publisher directly."
                        : s.status === "empty"
                          ? "No relevant dated feed items."
                          : `Latest item: ${dateLabel(s.newestAt!)} UK time`}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {view === "Perspectives" && (
            <Card>
              <SectionTitle>External analyst reading</SectionTitle>
              <SourceLink href="https://think.ing.com/">ING THINK research</SourceLink>
              <p className="text-sm text-muted-foreground">
                External research directory, not a live feed or an endorsement. Check the named
                author, date, assumptions and potential commercial interests. Compare a view with
                primary evidence.
              </p>
            </Card>
          )}
        </>
      )}

      {view === "Events" && (
        <>
          <Card>
            <SectionTitle>Before you trade</SectionTitle>
            <p className="mt-2 text-sm">
              Check the release time, currency, forecast and previous figure. Confirm important
              times with the official issuer. The calendar may be delayed or incomplete.
            </p>
            <LearningLink lesson="m3l4">Learn to read the economic calendar</LearningLink>
          </Card>
          {events}
        </>
      )}

      {view === "Understand" &&
        (
          Object.entries(MARKET_CONTEXT) as [MarketTopic, (typeof MARKET_CONTEXT)[MarketTopic]][]
        ).map(([key, item]) => (
          <Card key={key}>
            <p className="text-xs font-bold text-learning">Evergreen learning · not today's news</p>
            <h2 className="mt-2 text-lg font-extrabold">{item.title}</h2>
            <p className="mt-2 text-sm">{item.summary}</p>
            <p className="mt-3 rounded-2xl bg-learning-soft p-3 text-sm">
              <span className="font-bold">Your task: </span>
              {item.task}
            </p>
            <LearningLink lesson={item.lesson}>Open the forex lesson</LearningLink>
            <div>
              <SourceLink href={item.source}>{item.sourceName}</SourceLink>
            </div>
          </Card>
        ))}

      <section ref={noteRef} aria-label="Market learning note">
        <Card>
          <SectionTitle>Turn reading into knowledge</SectionTitle>
          {selected && (
            <div className="mt-3 rounded-2xl bg-secondary p-3 text-sm">
              <p className="font-bold">Reading: {selected.title}</p>
              <GhostButton onClick={() => setSelected(null)} disabled={save.isPending}>
                Remove reading reference
              </GhostButton>
            </div>
          )}
          <div className="mt-3">
            <Field label="My takeaway">
              <TextArea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={save.isPending}
                placeholder="What is the fact? What is someone else's opinion? What did I learn, and what will I check next?"
              />
            </Field>
          </div>
          <PrimaryButton onClick={() => save.mutate()} disabled={!note.trim() || save.isPending}>
            {save.isPending ? "Saving…" : "Save to trading Lessons"}
          </PrimaryButton>
          <p className="mt-2 text-xs text-muted-foreground">
            Saved to your existing trading Lessons. This does not place trades or make
            recommendations.
          </p>
        </Card>
      </section>
    </div>
  );
}
