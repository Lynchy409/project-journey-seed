import { useEffect, useMemo, useState } from "react";
import { Trophy, X } from "lucide-react";
import type { MatchDeck } from "@/lib/games";
import { formatSeconds, shuffle } from "@/lib/games";

type Tile = { key: string; pairId: string; text: string };

export function MatchGame({
  deck,
  best,
  onClose,
  onFinish,
}: {
  deck: MatchDeck;
  best: { seconds: number } | null;
  onClose: () => void;
  onFinish: (result: { seconds: number; accuracy: number; pairs: number }) => void;
}) {
  const pairs = useMemo(() => deck.match_pairs.slice(0, 8), [deck]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [cleared, setCleared] = useState<string[]>([]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongKeys, setWrongKeys] = useState<string[]>([]);
  const [taps, setTaps] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ms, setMs] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t: Tile[] = [];
    for (const p of pairs) {
      t.push({ key: `${p.id}-l`, pairId: p.id, text: p.left_text });
      t.push({ key: `${p.id}-r`, pairId: p.id, text: p.right_text });
    }
    setTiles(shuffle(t));
  }, [pairs]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setMs((v) => v + 100), 100);
    return () => clearInterval(t);
  }, [done]);

  const attempts = Math.max(1, Math.floor(taps / 2));
  const accuracy = Math.max(0, Math.round(((attempts - misses) / attempts) * 100));
  const seconds = Math.round(ms / 100) / 10;

  const tap = (tile: Tile) => {
    if (done || cleared.includes(tile.pairId) || wrongKeys.length) return;
    if (!selected) {
      setSelected(tile);
      setTaps((n) => n + 1);
      return;
    }
    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }
    setTaps((n) => n + 1);
    if (selected.pairId === tile.pairId) {
      const next = [...cleared, tile.pairId];
      setCleared(next);
      setSelected(null);
      if (next.length === pairs.length) setDone(true);
    } else {
      setMisses((n) => n + 1);
      setWrongKeys([selected.key, tile.key]);
      setTimeout(() => {
        setWrongKeys([]);
        setSelected(null);
      }, 450);
    }
  };

  if (done) {
    const beat = best ? seconds < best.seconds : true;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-learning-soft">
          <Trophy className="h-12 w-12 text-learning" />
        </div>
        <p className="mt-6 text-3xl font-extrabold leading-tight">{beat ? "New personal best" : "Nice round"}</p>
        <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-3xl bg-secondary p-5">
            <p className="text-3xl font-extrabold leading-none text-learning">{formatSeconds(seconds)}</p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Time</p>
          </div>
          <div className="rounded-3xl bg-secondary p-5">
            <p className="text-3xl font-extrabold leading-none">{accuracy}%</p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Accuracy</p>
          </div>
        </div>
        {best && <p className="mt-4 text-sm font-bold text-muted-foreground">Previous best {formatSeconds(best.seconds)}</p>}
        <button
          onClick={() => onFinish({ seconds, accuracy, pairs: pairs.length })}
          className="mt-10 h-16 w-full max-w-sm rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
        >
          Save score
        </button>
        <button onClick={onClose} className="mt-3 h-12 w-full max-w-sm rounded-2xl text-sm font-bold text-muted-foreground">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 px-5 pt-6">
        <div className="flex flex-1 items-center gap-4">
          <div>
            <p className="text-2xl font-extrabold tabular-nums leading-none">{formatSeconds(seconds)}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Time</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none text-learning">{accuracy}%</p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none">
              {cleared.length}/{pairs.length}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Pairs</p>
          </div>
        </div>
        <button aria-label="Close game" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="px-5 pt-3 text-xs font-bold text-muted-foreground">{deck.name} — tap the two cards that go together.</p>

      <div className="grid min-h-0 flex-1 grid-cols-4 auto-rows-fr gap-2 overflow-hidden p-3">
        {tiles.map((t) => {
          const isCleared = cleared.includes(t.pairId);
          const isSelected = selected?.key === t.key;
          const isWrong = wrongKeys.includes(t.key);
          return (
            <button
              key={t.key}
              onClick={() => tap(t)}
              disabled={isCleared}
              className={[
                "flex min-h-0 items-center justify-center break-words rounded-2xl border-2 p-1.5 text-center text-sm font-extrabold leading-tight transition-all duration-200 active:scale-[0.97]",
                isCleared
                  ? "border-transparent bg-trading-soft text-trading opacity-40"
                  : isWrong
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-float"
                      : "border-border bg-card shadow-card",
              ].join(" ")}
            >
              {t.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
