import { useEffect, useRef, useState } from "react";
import { Flame, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeAnswer, shuffle, type MatchDeck } from "@/lib/games";
import { beep } from "@/lib/morning";

type Props = {
  deck: MatchDeck;
  best: number;
  onClose: () => void;
  onFinish: (r: { streak: number; seconds: number; answered: number; correct: number }) => void;
};

export function StreakQuiz({ deck, best, onClose, onFinish }: Props) {
  const [order, setOrder] = useState(() => shuffle(deck.match_pairs));
  const [i, setI] = useState(0);
  const [streak, setStreak] = useState(0);
  const [top, setTop] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { ok: boolean; answer: string }>(null);
  const started = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null);

  const q = order[i % order.length]!;
  const record = Math.max(best, top);

  useEffect(() => { if (!result) input.current?.focus(); }, [result, i]);

  const next = () => {
    setResult(null);
    setValue("");
    if (i + 1 >= order.length) { setOrder(shuffle(deck.match_pairs)); setI(0); } else setI(i + 1);
  };

  const submit = () => {
    if (result) return next();
    if (!value.trim()) return;
    const ok = normalizeAnswer(value) === normalizeAnswer(q.right_text);
    setAnswered((n) => n + 1);
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setTop((t) => Math.max(t, s));
      setCorrect((n) => n + 1);
      beep("next");
      setResult({ ok, answer: q.right_text });
      setTimeout(next, 700);
    } else {
      setStreak(0);
      beep("switch");
      setResult({ ok, answer: q.right_text });
    }
  };

  const finish = () => {
    if (!answered) return onClose();
    onFinish({ streak: top, seconds: Math.round((Date.now() - started.current) / 100) / 10, answered, correct });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-muted-foreground">{deck.name}</p>
          <button aria-label="End quiz" onClick={finish} className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Streak</p>
            <p key={streak} className={cn("flex items-center gap-2 text-6xl font-black tabular-nums animate-in zoom-in-75 duration-200", streak ? "text-fitness" : "text-muted-foreground")}>
              <Flame className="h-10 w-10" /> {streak}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Record</p>
            <p className="flex items-center justify-end gap-1 text-2xl font-black tabular-nums text-learning"><Trophy className="h-5 w-5" /> {record}</p>
          </div>
        </div>

        <div className={cn(
          "mt-8 rounded-3xl border-2 bg-card p-6 shadow-soft transition-colors",
          result?.ok && "border-trading",
          result && !result.ok && "border-destructive",
        )}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Question</p>
          <p className="mt-2 text-2xl font-extrabold leading-snug">{q.left_text}</p>
        </div>

        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!!result}
            placeholder="Type your answer"
            autoComplete="off"
            autoCapitalize="off"
            className="h-16 w-full rounded-2xl border-2 bg-card px-4 text-xl font-bold outline-none focus:border-learning disabled:opacity-70"
          />
          {result && !result.ok && (
            <div className="rounded-2xl bg-destructive/10 p-4">
              <p className="text-sm font-extrabold text-destructive">Back to zero. The answer was:</p>
              <p className="mt-1 text-xl font-black">{result.answer}</p>
            </div>
          )}
          {result?.ok && <p className="text-center text-lg font-black text-trading">Correct! +1</p>}
          <button type="submit" className="h-14 w-full rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform">
            {result && !result.ok ? "Go again" : "Check"}
          </button>
        </form>

        <p className="mt-auto pt-6 text-center text-xs font-bold text-muted-foreground">
          {correct}/{answered} right this session · tap ✕ to save your best streak
        </p>
      </div>
    </div>
  );
}
