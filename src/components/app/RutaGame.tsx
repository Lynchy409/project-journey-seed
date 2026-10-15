import { useEffect, useRef, useState } from "react";
import {
  ACTIVITIES, CHAPTERS, DIALOGUES, HAIR, SHIRTS, SKINS,
  checkAnswer, completeActivity, dueConcepts, fresh, grantReward, loadSave, recordAttempt, resetSave, storeSave,
  type Mode, type RutaSave, type Traveller,
} from "@/lib/ruta";

const btn = "h-14 w-full rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform disabled:opacity-40";
const ghost = "h-12 w-full rounded-3xl border bg-card text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-40";
const card = "rounded-3xl bg-card p-5 shadow-sm";

type Screen = "title" | "create" | "map" | "chapter";

export function RutaGame() {
  const [save, setSave] = useState<RutaSave>(fresh);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("title");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { setSave(loadSave()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) storeSave(save); }, [save, loaded]);

  const stepDone = () => {
    const ch = CHAPTERS[chapterId!]!;
    const seq = ch.sequence!;
    const cur = seq[step]!;
    if (cur.kind === "activity") setSave((s) => completeActivity(s, cur.id));
    if (step < seq.length - 1) return setStep(step + 1);
    setSave((s) => {
      let n = completeActivity(s, `chapter:${chapterId}`);
      n = grantReward(n, `chapter:${chapterId}`, ch.reward ?? 0);
      return { ...n, journey: { ...n.journey, chapterId } };
    });
    setScreen("map");
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      {screen === "title" && (
        <Title hasSave={!!save.character} onStart={() => setScreen(save.character ? "map" : "create")}
          onEdit={() => setScreen("create")} onReset={() => setSave(resetSave())} />
      )}
      {screen === "create" && (
        <Create initial={save.character} onCancel={() => setScreen(save.character ? "map" : "title")}
          onDone={(c) => { setSave((s) => ({ ...s, character: c })); setScreen("map"); }} />
      )}
      {screen === "map" && save.character && (
        <JourneyMap save={save} onEdit={() => setScreen("create")}
          onOpen={(id) => { setChapterId(id); setStep(0); setScreen("chapter"); }} />
      )}
      {screen === "chapter" && chapterId && (
        <ChapterPlayer key={`${chapterId}-${step}`} chapterId={chapterId} step={step} onDone={stepDone}
          onQuit={() => setScreen("map")}
          onRecord={(c, m, ok, h, mt) => setSave((s) => recordAttempt(s, c, m, ok, h, mt))} />
      )}
    </div>
  );
}

function Title({ onStart, onEdit, onReset, hasSave }: { onStart: () => void; onEdit: () => void; onReset: () => void; hasSave: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-16 text-center">
      <h1 className="text-6xl font-extrabold text-primary">Ruta</h1>
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground">Road to Fluent</p>
      <div className="mt-10 w-full space-y-2">
        <button className={btn} onClick={onStart}>{hasSave ? "Continue journey" : "Start journey"}</button>
        {hasSave && <button className={ghost} onClick={onEdit}>Edit traveller</button>}
        {hasSave && <button className={`${ghost} text-destructive`} onClick={() => confirm("Reset all Ruta progress?") && onReset()}>Reset progress</button>}
      </div>
    </div>
  );
}

export function Avatar({ c, size = 90 }: { c: Traveller; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="25" y="55" width="50" height="40" rx="12" fill={c.shirt} />
      <circle cx="50" cy="38" r="20" fill={c.skin} />
      <path d="M30 28 Q50 16 70 28 L70 34 Q50 22 30 34 Z" fill={c.hair} />
      {c.cap && <path d="M28 32 Q50 8 72 32 L80 34 L28 34 Z" fill="#222" />}
    </svg>
  );
}

function Create({ initial, onDone, onCancel }: { initial: Traveller | null; onDone: (c: Traveller) => void; onCancel: () => void }) {
  const [c, setC] = useState<Traveller>(initial ?? { name: "", skin: SKINS[0]!, shirt: SHIRTS[0]!, hair: HAIR[0]!, cap: true });
  const sw = (on: boolean) => `h-11 w-11 rounded-full border-4 ${on ? "border-foreground" : "border-transparent"}`;
  const row = (label: string, list: string[], key: "skin" | "shirt" | "hair") => (
    <>
      <p className="text-sm font-bold">{label}</p>
      <div className="flex gap-3">{list.map((s) => <button key={s} aria-label={`${label} ${s}`} className={sw(c[key] === s)} style={{ background: s }} onClick={() => setC({ ...c, [key]: s })} />)}</div>
    </>
  );
  return (
    <div className={`${card} space-y-4`}>
      <h2 className="text-2xl font-extrabold">{initial ? "Edit traveller" : "Create your traveller"}</h2>
      <div className="flex justify-center"><Avatar c={c} size={120} /></div>
      <input className="h-12 w-full rounded-2xl border bg-background px-4 text-base" placeholder="Your name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      {row("Skin", SKINS, "skin")}
      {row("Shirt", SHIRTS, "shirt")}
      {row("Hair", HAIR, "hair")}
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={c.cap} onChange={(e) => setC({ ...c, cap: e.target.checked })} /> Wear cap</label>
      <button className={btn} disabled={!c.name.trim()} onClick={() => onDone(c)}>{initial ? "Save traveller" : "Fly to Spain ✈️"}</button>
      <button className={ghost} onClick={onCancel}>Cancel</button>
    </div>
  );
}

function JourneyMap({ save, onOpen, onEdit }: { save: RutaSave; onOpen: (id: string) => void; onEdit: () => void }) {
  const due = dueConcepts(save).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onEdit} aria-label="Edit traveller"><Avatar c={save.character!} size={48} /></button>
        <p className="flex-1 text-lg font-extrabold">{save.character!.name}</p>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">{save.xp} XP</span>
      </div>
      <h2 className="text-2xl font-extrabold">Your Ruta</h2>
      {due > 0 && <p className="rounded-2xl bg-learning-soft px-4 py-3 text-sm font-bold text-learning">{due} pattern{due > 1 ? "s" : ""} ready to review — replay Madrid to lock them in.</p>}
      {Object.entries(CHAPTERS).map(([id, ch]) => {
        const done = save.rewardsGranted.includes(`chapter:${id}`);
        return (
          <button key={id} disabled={ch.locked} onClick={() => onOpen(id)}
            className={`${card} flex w-full items-center gap-3 text-left active:scale-[0.98] transition-transform disabled:opacity-50`}>
            <div className="flex-1">
              <p className="text-lg font-extrabold">{ch.title}</p>
              <p className="text-sm text-muted-foreground">{ch.subtitle}</p>
            </div>
            <span className="text-2xl">{ch.locked ? "🔒" : done ? "✅" : "▶️"}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChapterPlayer({ chapterId, step, onDone, onQuit, onRecord }: {
  chapterId: string; step: number; onDone: () => void; onQuit: () => void;
  onRecord: (c: string, m: Mode, ok: boolean, hint: boolean, mt: string | null) => void;
}) {
  const ch = CHAPTERS[chapterId]!;
  const seq = ch.sequence!;
  const s = seq[step]!;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <button onClick={onQuit}>✕ Map</button>
        <span>{ch.title} · {step + 1}/{seq.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / seq.length) * 100}%` }} />
      </div>
      {s.kind === "dialogue" ? <Scene id={s.id} onDone={onDone} /> : <ActivityView id={s.id} onDone={onDone} onRecord={onRecord} />}
    </div>
  );
}

function Scene({ id, onDone }: { id: string; onDone: () => void }) {
  const d = DIALOGUES[id]!;
  const [i, setI] = useState(0);
  const [showEn, setShowEn] = useState(false);
  const line = d.lines[i]!;
  const last = i >= d.lines.length - 1;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">{d.title}</h2>
      <div className={card}>
        {line.es ? (
          <>
            <p className="text-xs font-bold uppercase text-muted-foreground">Staff</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{line.es}</p>
            {showEn && <p className="mt-2 text-sm text-muted-foreground">{line.en}</p>}
          </>
        ) : (
          <p className={`text-lg ${line.who === "player" ? "italic text-muted-foreground" : "font-semibold"}`}>{line.text}</p>
        )}
      </div>
      {line.es && <button className={ghost} onClick={() => setShowEn(!showEn)}>{showEn ? "Hide" : "Show"} English</button>}
      <button className={btn} onClick={() => { setShowEn(false); if (last) onDone(); else setI(i + 1); }}>{last ? "Continue" : "Next"}</button>
    </div>
  );
}

const MODE: Record<string, Mode> = { recognize: "recognition", construct: "construction", produce: "production" };

function ActivityView({ id, onDone, onRecord }: { id: string; onDone: () => void; onRecord: (c: string, m: Mode, ok: boolean, h: boolean, mt: string | null) => void }) {
  const act = ACTIVITIES[id]!;
  const [result, setResult] = useState<ReturnType<typeof checkAnswer> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [tiles, setTiles] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [hint, setHint] = useState(false);
  const answered = useRef(false);

  const submit = (ans: string) => {
    if (answered.current) return;
    answered.current = true;
    const r = checkAnswer(id, ans);
    setResult(r);
    onRecord(act.concept, MODE[act.type]!, r.correct, hint, r.mistakeType);
    navigator.vibrate?.(r.correct ? 20 : [30, 40, 30]);
  };
  const retry = () => { answered.current = false; setResult(null); setPicked(null); setTiles([]); setText(""); };
  const fb = !!result;

  return (
    <div className="space-y-4">
      <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
        {act.type === "recognize" ? "Recognise" : act.type === "construct" ? "Build" : "Speak"}
      </p>
      <p className="text-xl font-extrabold leading-snug">{act.prompt}</p>

      {act.type === "recognize" && (
        <div className="space-y-2">
          {act.options!.map((o) => {
            const state = fb && o === picked ? (result!.correct ? "border-trading bg-trading-soft" : "border-destructive bg-destructive/10") : "bg-card";
            return <button key={o} disabled={fb} onClick={() => { setPicked(o); submit(o); }}
              className={`h-14 w-full rounded-2xl border-2 text-base font-bold transition-all active:scale-[0.98] ${state}`}>{o}</button>;
          })}
        </div>
      )}

      {act.type === "construct" && (
        <div className="space-y-3">
          <div className="flex min-h-16 flex-wrap gap-2 rounded-2xl border-2 border-dashed bg-card p-3">
            {tiles.map((ti, k) => (
              <button key={k} disabled={fb} onClick={() => setTiles(tiles.filter((_, j) => j !== k))}
                className="rounded-xl bg-primary px-3 py-2 font-bold text-primary-foreground">{act.tiles![ti]}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {act.tiles!.map((t, i) => (
              <button key={i} disabled={tiles.includes(i) || fb} onClick={() => setTiles([...tiles, i])}
                className="rounded-xl border-2 bg-card px-3 py-2 font-bold disabled:opacity-30">{t}</button>
            ))}
          </div>
          <button className={btn} disabled={!tiles.length || fb} onClick={() => submit(tiles.map((i) => act.tiles![i]).join(" "))}>Check</button>
        </div>
      )}

      {act.type === "produce" && (
        <div className="space-y-3">
          <input value={text} disabled={fb} onChange={(e) => setText(e.target.value)} placeholder="Type in Spanish"
            onKeyDown={(e) => e.key === "Enter" && text.trim() && submit(text)}
            className="h-14 w-full rounded-2xl border bg-background px-4 text-lg" autoCapitalize="off" />
          <button className={btn} disabled={!text.trim() || fb} onClick={() => submit(text)}>Check</button>
        </div>
      )}

      {!fb && (
        <button className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground" onClick={() => setHint(true)}>
          {hint ? `💡 ${act.hint}` : "Show hint"}
        </button>
      )}

      {result && (
        <div className={`${card} space-y-3 border-2 ${result.correct ? "border-trading" : "border-destructive"}`}>
          <p className={`text-2xl font-extrabold ${result.correct ? "text-trading" : "text-destructive"}`}>{result.correct ? "¡Correcto!" : "Not quite"}</p>
          <p className="text-sm text-muted-foreground">{result.feedback}</p>
          {result.correct ? <button className={btn} onClick={onDone}>Next</button> : (
            <div className="grid grid-cols-2 gap-2">
              <button className={ghost} onClick={retry}>Try again</button>
              <button className={ghost} onClick={onDone}>Skip</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
