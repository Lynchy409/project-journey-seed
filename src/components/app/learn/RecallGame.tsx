import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Card } from "@/components/app/AppShell";
import { PrimaryButton, TextInput } from "@/components/app/ui";
import { VoiceInput } from "@/components/app/spanish/VoiceControls";
import { gradeAnswer } from "@/lib/knowledge";

export type RecallCard = { id: string; deck: string; front: string; back: string; box: number };
type Kind = "type" | "choice" | "truefalse";
type Q = { card: RecallCard; kind: Kind; options: string[]; claim?: string; claimTrue?: boolean };

function shuffle<T>(xs: T[]) {
  return [...xs].sort(() => Math.random() - 0.5);
}

function build(cards: RecallCard[], pool: RecallCard[]): Q[] {
  const kinds: Kind[] = ["type", "choice", "type", "truefalse"];
  return cards.map((card, i) => {
    const others = shuffle(pool.filter((c) => c.id !== card.id && c.back !== card.back)).map((c) => c.back);
    let kind = kinds[i % kinds.length]!;
    if (kind === "choice" && others.length < 3) kind = "type";
    if (kind === "truefalse" && others.length < 1) kind = "type";
    if (kind === "choice") return { card, kind, options: shuffle([card.back, ...others.slice(0, 3)]) };
    if (kind === "truefalse") {
      const t = Math.random() < 0.5;
      return { card, kind, options: [], claim: t ? card.back : others[0]!, claimTrue: t };
    }
    return { card, kind, options: [] };
  });
}

export function RecallGame({
  cards,
  pool,
  onAnswer,
  onDone,
}: {
  cards: RecallCard[];
  pool: RecallCard[];
  onAnswer: (card: RecallCard, correct: boolean) => void;
  onDone: (score: { right: number; total: number }) => void;
}) {
  const questions = useMemo(() => build(cards, pool), [cards, pool]);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [result, setResult] = useState<null | { correct: boolean; given: string }>(null);
  const [right, setRight] = useState(0);
  const q = questions[i];
  if (!q) return null;

  const submit = (given: string, correct: boolean) => {
    setResult({ correct, given });
    if (correct) {
      setRight((r) => r + 1);
      navigator.vibrate?.(20);
    }
    onAnswer(q.card, correct);
  };
  const next = () => {
    if (i + 1 >= questions.length) return onDone({ right, total: questions.length });
    setI(i + 1);
    setText("");
    setResult(null);
  };

  return (
    <Card>
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>{q.card.deck}</span>
        <span>
          {i + 1}/{questions.length} · {right} right
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-learning transition-all" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>
      <p className="mt-4 text-xl font-extrabold leading-snug">{q.card.front}</p>
      {q.kind === "truefalse" && (
        <p className="mt-2 rounded-2xl bg-secondary p-3 text-sm font-semibold">True or false: “{q.claim}”</p>
      )}

      {!result && q.kind === "type" && (
        <div className="mt-4 space-y-3">
          <TextInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Answer in your own words"
            onKeyDown={(e) => e.key === "Enter" && text.trim() && submit(text, gradeAnswer(text, q.card.back).correct)}
          />
          <VoiceInput
            lang={/spanish/i.test(q.card.deck) && /spanish|españ|¿|decir|how do you say/i.test(q.card.front) ? "es-ES" : "en-GB"}
            onText={(t) => setText(t)}
          />
          <PrimaryButton disabled={!text.trim()} onClick={() => submit(text, gradeAnswer(text, q.card.back).correct)}>
            Check
          </PrimaryButton>
          <button className="w-full text-xs font-bold text-muted-foreground" onClick={() => submit("", false)}>
            I don't know — show me
          </button>
        </div>
      )}
      {!result && q.kind === "choice" && (
        <div className="mt-4 space-y-2">
          {q.options.map((o) => (
            <button
              key={o}
              onClick={() => submit(o, o === q.card.back)}
              className="min-h-12 w-full rounded-2xl border p-3 text-left text-sm font-semibold active:scale-[0.99]"
            >
              {o}
            </button>
          ))}
        </div>
      )}
      {!result && q.kind === "truefalse" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => submit(v ? "True" : "False", v === q.claimTrue)}
              className="h-14 rounded-2xl border text-base font-extrabold"
            >
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3 animate-in fade-in zoom-in-95">
          <div
            className={`flex items-start gap-3 rounded-2xl p-3 ${result.correct ? "bg-trading-soft text-trading" : "bg-destructive/10 text-destructive"}`}
          >
            {result.correct ? <Check className="h-6 w-6 shrink-0" /> : <X className="h-6 w-6 shrink-0" />}
            <div className="text-sm font-semibold text-foreground">
              <p className={`font-extrabold ${result.correct ? "text-trading" : "text-destructive"}`}>
                {result.correct ? "Got it" : "Not quite"}
              </p>
              {!result.correct && result.given && q.kind === "type" && (
                <p className="mt-1 text-muted-foreground">You said: “{result.given}” — the key idea was missing.</p>
              )}
              <p className="mt-1">
                <span className="font-bold">Answer: </span>
                {q.card.back}
              </p>
              {!result.correct && <p className="mt-1 text-xs text-muted-foreground">This comes back tomorrow until it sticks.</p>}
            </div>
          </div>
          <PrimaryButton onClick={next}>{i + 1 >= questions.length ? "Finish" : "Next"}</PrimaryButton>
        </div>
      )}
    </Card>
  );
}
