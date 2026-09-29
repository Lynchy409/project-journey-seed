import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, Stat, TextArea, TextInput } from "@/components/app/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import { addCard, addStudySession, deleteCard, flashcardsQuery, minutesThisWeek, reviewCard, studySessionsQuery } from "@/lib/learn";
import { addEntry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learn — My Journey" },
      { name: "description", content: "Focus timer, study log and flashcards that resurface what you keep forgetting." },
      { property: "og:title", content: "Learn — My Journey" },
      { property: "og:description", content: "Focus timer, study log and flashcards that resurface what you keep forgetting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Learn,
});

type Tab = "focus" | "cards" | "log";

function Learn() {
  const [tab, setTab] = useState<Tab>("focus");
  return (
    <AppShell eyebrow="Learning" title={tab === "focus" ? "Focus" : tab === "cards" ? "Flashcards" : "Study log"}>
      <div className="flex gap-2">
        <Chip active={tab === "focus"} onClick={() => setTab("focus")} className="flex-1">Focus</Chip>
        <Chip active={tab === "cards"} onClick={() => setTab("cards")} className="flex-1">Cards</Chip>
        <Chip active={tab === "log"} onClick={() => setTab("log")} className="flex-1">Log</Chip>
      </div>
      {tab === "focus" && <Focus />}
      {tab === "cards" && <Cards />}
      {tab === "log" && <Log />}
    </AppShell>
  );
}

function Focus() {
  const qc = useQueryClient();
  const { data: sessions } = useQuery(studySessionsQuery);
  const [target, setTarget] = useState(20);
  const [left, setLeft] = useState(20 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const log = useMutation({
    mutationFn: (minutes: number) => addStudySession({ date: todayISO(), minutes, kind: "spanish", notes: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      toast.success("Session logged");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const week = minutesThisWeek(sessions ?? []);

  return (
    <>
      <Card>
        <div className="flex gap-2">
          {[10, 20, 30, 45].map((m) => (
            <Chip
              key={m}
              active={target === m}
              onClick={() => { setTarget(m); setLeft(m * 60); setRunning(false); }}
              className="flex-1"
            >
              {m}m
            </Chip>
          ))}
        </div>
        <p className="mt-6 text-center text-7xl font-extrabold tabular-nums tracking-tight">{mm}:{ss}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="h-14 flex-1 rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            aria-label="Reset"
            onClick={() => { setRunning(false); setLeft(target * 60); }}
            className="flex h-14 w-14 items-center justify-center rounded-3xl border"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => log.mutate(target - Math.floor(left / 60))}
          disabled={target - Math.floor(left / 60) <= 0}
          className="mt-3 h-12 w-full rounded-2xl border text-sm font-bold disabled:opacity-40"
        >
          Log {Math.max(0, target - Math.floor(left / 60))} minutes
        </button>
      </Card>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Minutes this week" value={week} tone="text-learning" />
          <Stat label="Sessions" value={sessions?.length ?? 0} />
        </div>
      </Card>
    </>
  );
}

function Cards() {
  const qc = useQueryClient();
  const { data: cards } = useQuery(flashcardsQuery);
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [deck, setDeck] = useState("Spanish");
  const [flipped, setFlipped] = useState(false);

  const due = (cards ?? []).filter((c) => c.due_on <= todayISO());
  const card = due[0];

  const add = useMutation({
    mutationFn: () => addCard({ deck, front: front.trim(), back: back.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      setFront(""); setBack("");
      toast.success("Card added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const review = useMutation({
    mutationFn: ({ id, box, correct }: { id: string; box: number; correct: boolean }) => reviewCard(id, box, correct),
    onSuccess: () => {
      setFlipped(false);
      qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Due now" value={due.length} tone="text-learning" />
          <Stat label="Total cards" value={cards?.length ?? 0} />
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Add a card</span>
          </PrimaryButton>
        </div>
      </Card>

      {card ? (
        <Card>
          <SectionTitle>{card.deck} · box {card.box}</SectionTitle>
          <button onClick={() => setFlipped((f) => !f)} className="mt-4 block w-full rounded-3xl bg-secondary p-8 text-center">
            <p className="text-2xl font-extrabold leading-snug">{flipped ? card.back : card.front}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {flipped ? "Answer" : "Tap to flip"}
            </p>
          </button>
          {flipped && (
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => review.mutate({ id: card.id, box: card.box, correct: false })}
                className="h-12 flex-1 rounded-2xl bg-destructive/10 text-sm font-extrabold text-destructive"
              >
                Got it wrong
              </button>
              <button
                onClick={() => review.mutate({ id: card.id, box: card.box, correct: true })}
                className="h-12 flex-1 rounded-2xl bg-trading-soft text-sm font-extrabold text-trading"
              >
                Got it right
              </button>
            </div>
          )}
        </Card>
      ) : (
        <Card><Empty>{cards?.length ? "Nothing due. Come back tomorrow." : "No cards yet."}</Empty></Card>
      )}

      {!!cards?.length && (
        <Card>
          <SectionTitle>All cards</SectionTitle>
          <ul className="mt-3 space-y-1.5">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.front}</span>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">due {prettyDate(c.due_on)}</span>
                <button aria-label="Delete card" onClick={() => remove.mutate(c.id)} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <FormSheet open={open} onOpenChange={setOpen} title="Add a flashcard">
        <Field label="Deck"><TextInput value={deck} onChange={(e) => setDeck(e.target.value)} /></Field>
        <Field label="Front"><TextInput value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g. la meta" /></Field>
        <Field label="Back"><TextInput value={back} onChange={(e) => setBack(e.target.value)} placeholder="e.g. the goal" /></Field>
        <PrimaryButton onClick={() => add.mutate()} disabled={!front.trim() || !back.trim() || add.isPending}>Add card</PrimaryButton>
      </FormSheet>
    </>
  );
}

function Log() {
  const qc = useQueryClient();
  const { data: sessions } = useQuery(studySessionsQuery);
  const [minutes, setMinutes] = useState("20");
  const [notes, setNotes] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      await addStudySession({ date: todayISO(), minutes: Number(minutes || 0), kind: "spanish", notes: notes || null });
      if (notes.trim()) await addEntry({ text: notes.trim(), pillar: "learning", entry_type: "session_note" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      setNotes("");
      toast.success("Logged");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <>
      <Card>
        <SectionTitle>Log study time</SectionTitle>
        <div className="mt-3 space-y-3">
          <Field label="Minutes"><TextInput inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
          <Field label="What did you cover? (saved to your journal)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <PrimaryButton onClick={() => add.mutate()} disabled={add.isPending}>Save session</PrimaryButton>
        </div>
      </Card>
      <Card>
        <SectionTitle>History</SectionTitle>
        {!sessions?.length ? (
          <Empty>No study sessions yet.</Empty>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
                <span>{prettyDate(s.date)}</span>
                <span className="text-muted-foreground">{s.minutes} min · {s.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
