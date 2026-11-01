import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, Stat, TextInput } from "@/components/app/ui";
import { addCard, deleteCard, flashcardsQuery, reviewCard } from "@/lib/learn";
import { TOPICS } from "@/lib/knowledge";
import { prettyDate, todayISO } from "@/lib/dates";
import { RecallGame, type RecallCard } from "./RecallGame";

const ROUND = 8;
const STATS_KEY = "recall-stats-v1";
type Stats = { rounds: number; right: number; total: number; best: number };
function readStats(): Stats {
  try {
    return { rounds: 0, right: 0, total: 0, best: 0, ...JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}") };
  } catch {
    return { rounds: 0, right: 0, total: 0, best: 0 };
  }
}

export function RecallHub() {
  const qc = useQueryClient();
  const { data } = useQuery(flashcardsQuery);
  const all = data ?? [];
  const [deck, setDeck] = useState("all");
  const [round, setRound] = useState<RecallCard[] | null>(null);
  const [last, setLast] = useState<{ right: number; total: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => setStats(readStats()), []);
  const s = stats ?? { rounds: 0, right: 0, total: 0, best: 0 };

  const decks = [...new Set(all.map((c) => c.deck))];
  const inDeck = all.filter((c) => deck === "all" || c.deck === deck);
  const due = inDeck.filter((c) => c.due_on <= todayISO());
  const locked = all.filter((c) => c.box >= 4).length;

  const review = useMutation({
    mutationFn: ({ c, correct }: { c: RecallCard; correct: boolean }) => reviewCard(c.id, c.box, correct),
  });
  const remove = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  const start = () => {
    const pick = (due.length ? due : [...inDeck].sort(() => Math.random() - 0.5)).slice(0, ROUND);
    setLast(null);
    setRound(pick);
  };

  const finish = (score: { right: number; total: number }) => {
    const n: Stats = { rounds: s.rounds + 1, right: s.right + score.right, total: s.total + score.total, best: Math.max(s.best, Math.round((score.right / score.total) * 100)) };
    localStorage.setItem(STATS_KEY, JSON.stringify(n));
    setStats(n);
    setLast(score);
    setRound(null);
    qc.invalidateQueries({ queryKey: ["flashcards"] });
  };

  if (round)
    return (
      <>
        <RecallGame cards={round} pool={all} onAnswer={(c, correct) => review.mutate({ c, correct })} onDone={finish} />
        <button onClick={() => finish({ right: 0, total: 1 })} className="w-full text-xs font-bold text-muted-foreground">
          Quit round
        </button>
      </>
    );

  return (
    <>
      <Card>
        {last && (
          <div className="mb-3 rounded-2xl bg-learning-soft p-3 text-center">
            <p className="text-4xl font-extrabold tabular-nums text-learning">
              {last.right}/{last.total}
            </p>
            <p className="text-xs font-bold text-muted-foreground">{Math.round((last.right / last.total) * 100)}% this round · misses return tomorrow</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Due" value={due.length} tone="text-learning" />
          <Stat label="Locked in" value={locked} />
          <Stat label="Accuracy" value={s.total ? `${Math.round((s.right / s.total) * 100)}%` : "—"} />
        </div>
        <div className="mt-3">
          <PrimaryButton disabled={!inDeck.length} onClick={start}>
            <span className="flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" /> {due.length ? `Recall ${Math.min(due.length, ROUND)} due` : "Practice round"}
            </span>
          </PrimaryButton>
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
          Mixed questions · type or speak · right in your own words counts
        </p>
      </Card>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={deck === "all"} onClick={() => setDeck("all")}>All</Chip>
        {decks.map((d) => (
          <Chip key={d} active={deck === d} onClick={() => setDeck(d)} className="shrink-0 whitespace-nowrap">
            {d}
          </Chip>
        ))}
      </div>

      <Card>
        <SectionTitle action={<button onClick={() => setAdding(true)} className="flex min-h-11 items-center gap-1 text-sm font-bold text-learning"><Plus className="h-4 w-4" /> Add fact</button>}>
          Knowledge bank · {inDeck.length}
        </SectionTitle>
        {!inDeck.length ? (
          <Empty>No facts yet. Open Knowledge and tap “Lock into memory”, or add your own.</Empty>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {inDeck.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{c.front}</span>
                  <span className="block text-[11px] font-bold text-muted-foreground">
                    {c.box >= 4 ? "Locked in" : `Level ${c.box}`} · due {prettyDate(c.due_on)}
                  </span>
                </span>
                <button aria-label="Delete fact" onClick={() => remove.mutate(c.id)} className="p-2 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <AddFact open={adding} onOpenChange={setAdding} decks={decks} />
    </>
  );
}

function AddFact({ open, onOpenChange, decks }: { open: boolean; onOpenChange: (v: boolean) => void; decks: string[] }) {
  const qc = useQueryClient();
  const options = [...new Set([...TOPICS.map((t) => t.label), "Trading rules", ...decks])];
  const [deck, setDeck] = useState(options[0]!);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const add = useMutation({
    mutationFn: () => addCard({ deck, front: front.trim(), back: back.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      setFront("");
      setBack("");
      toast.success("Fact added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add a fact">
      <Field label="Topic">
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip key={o} active={deck === o} onClick={() => setDeck(o)}>{o}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Question">
        <TextInput value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g. What invalidates my setup?" />
      </Field>
      <Field label="Answer / fact">
        <TextInput value={back} onChange={(e) => setBack(e.target.value)} placeholder="e.g. A close back inside the range" />
      </Field>
      <PrimaryButton disabled={!front.trim() || !back.trim() || add.isPending} onClick={() => add.mutate()}>
        Save fact
      </PrimaryButton>
    </FormSheet>
  );
}
