import { useEffect, useState } from "react";
import {
  FRESH, LEVELS, MADRID_DIALOGUE, SHIRTS, SIGN_ROUNDS, SKINS, TOLEDO,
  loadSave, storeSave, type RutaSave, type Traveller,
} from "@/lib/ruta";

const btn = "h-14 w-full rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform disabled:opacity-40";
const ghost = "h-12 w-full rounded-3xl border bg-card text-sm font-bold active:scale-[0.98] transition-transform";
const card = "rounded-3xl bg-card p-5 shadow-sm";

type Screen = "title" | "create" | "map" | "madrid" | "signs" | "toledo";

export function RutaGame() {
  const [save, setSave] = useState<RutaSave>(FRESH);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("title");

  useEffect(() => { setSave(loadSave()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) storeSave(save); }, [save, loaded]);

  const complete = (id: string, xp: number) => {
    setSave((s) => ({
      ...s,
      xp: s.completed.includes(id) ? s.xp : s.xp + xp,
      completed: s.completed.includes(id) ? s.completed : [...s.completed, id],
    }));
    setScreen("map");
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      {screen === "title" && (
        <Title hasSave={!!save.character} onStart={() => setScreen(save.character ? "map" : "create")} onReset={() => setSave(FRESH)} />
      )}
      {screen === "create" && <Create onDone={(c) => { setSave((s) => ({ ...s, character: c })); setScreen("map"); }} />}
      {screen === "map" && save.character && <WorldMap save={save} onPlay={(id) => setScreen(id as Screen)} />}
      {screen === "madrid" && <Dialogue onDone={() => complete("madrid", 20)} />}
      {screen === "signs" && <SignRunner onDone={() => complete("signs", 50)} onQuit={() => setScreen("map")} />}
      {screen === "toledo" && <Toledo onDone={() => complete("toledo", 40)} />}
    </div>
  );
}

function Title({ onStart, onReset, hasSave }: { onStart: () => void; onReset: () => void; hasSave: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-16 text-center">
      <h1 className="text-6xl font-extrabold text-primary">Ruta</h1>
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground">Road to Fluent</p>
      <div className="mt-10 w-full space-y-2">
        <button className={btn} onClick={onStart}>{hasSave ? "Continue" : "Start journey"}</button>
        {hasSave && <button className={ghost} onClick={onReset}>Reset progress</button>}
      </div>
    </div>
  );
}

function Avatar({ c, size = 90 }: { c: Traveller; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="25" y="55" width="50" height="40" rx="12" fill={c.shirt} />
      <circle cx="50" cy="38" r="20" fill={c.skin} />
      {c.cap && <path d="M28 32 Q50 8 72 32 L80 34 L28 34 Z" fill="#222" />}
    </svg>
  );
}

function Create({ onDone }: { onDone: (c: Traveller) => void }) {
  const [c, setC] = useState<Traveller>({ name: "", skin: SKINS[0], shirt: SHIRTS[0], cap: true });
  const sw = (on: boolean) => `h-11 w-11 rounded-full border-4 ${on ? "border-foreground" : "border-transparent"}`;
  return (
    <div className={`${card} space-y-4`}>
      <h2 className="text-2xl font-extrabold">Create your traveller</h2>
      <div className="flex justify-center"><Avatar c={c} size={120} /></div>
      <input className="h-12 w-full rounded-2xl border bg-background px-4 text-base" placeholder="Your name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      <p className="text-sm font-bold">Skin tone</p>
      <div className="flex gap-3">{SKINS.map((s) => <button key={s} aria-label="skin" className={sw(c.skin === s)} style={{ background: s }} onClick={() => setC({ ...c, skin: s })} />)}</div>
      <p className="text-sm font-bold">Shirt</p>
      <div className="flex gap-3">{SHIRTS.map((s) => <button key={s} aria-label="shirt" className={sw(c.shirt === s)} style={{ background: s }} onClick={() => setC({ ...c, shirt: s })} />)}</div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={c.cap} onChange={(e) => setC({ ...c, cap: e.target.checked })} /> Wear cap</label>
      <button className={btn} disabled={!c.name.trim()} onClick={() => onDone(c)}>Fly to Spain ✈️</button>
    </div>
  );
}

function WorldMap({ save, onPlay }: { save: RutaSave; onPlay: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar c={save.character!} size={48} />
        <p className="flex-1 text-lg font-extrabold">{save.character!.name}</p>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">{save.xp} XP</span>
      </div>
      <div className="relative h-80 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-200 to-orange-300 shadow-sm">
        {LEVELS.map((l) => {
          const done = save.completed.includes(l.id);
          const open = !l.requires || save.completed.includes(l.requires);
          return (
            <button
              key={l.id}
              disabled={!open}
              onClick={() => onPlay(l.id)}
              style={{ left: `${l.x}%`, top: `${l.y}%` }}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl px-3 py-2 text-sm font-extrabold shadow-float ${done ? "bg-emerald-500 text-white" : open ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted text-muted-foreground"}`}
            >
              {done ? "✓" : open ? "●" : "🔒"}
              <small className="text-[11px]">{l.name}</small>
            </button>
          );
        })}
      </div>
      <div className={`${card} space-y-1.5`}>
        {LEVELS.map((l) => <p key={l.id} className="text-sm text-muted-foreground"><b className="text-foreground">{l.name}:</b> {l.desc}</p>)}
      </div>
    </div>
  );
}

function Dialogue({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [showEn, setShowEn] = useState(false);
  const line = MADRID_DIALOGUE[i];
  const last = i === MADRID_DIALOGUE.length - 1;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">Madrid Airport</h2>
      <div className={card}>
        <p className="text-xs font-bold uppercase text-muted-foreground">{line.who}</p>
        <p className="mt-1 text-2xl font-extrabold text-primary">{line.es}</p>
        {showEn && <p className="mt-2 text-sm text-muted-foreground">{line.en}</p>}
      </div>
      <button className={ghost} onClick={() => setShowEn(!showEn)}>{showEn ? "Hide" : "Show"} English</button>
      <button className={btn} onClick={() => { setShowEn(false); last ? onDone() : setI(i + 1); }}>{last ? "Finish (+20 XP)" : "Next"}</button>
    </div>
  );
}

function SignRunner({ onDone, onQuit }: { onDone: () => void; onQuit: () => void }) {
  const [r, setR] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState<string | null>(null);
  const [time, setTime] = useState(8);
  const finished = r >= SIGN_ROUNDS.length;

  const pick = (o: string | null) => {
    const ok = o === SIGN_ROUNDS[r].en;
    if (ok) setScore((s) => s + 1);
    setFb(ok ? "¡Correcto!" : `It was "${SIGN_ROUNDS[r].en}"`);
    setTimeout(() => { setFb(null); setR((x) => x + 1); setTime(8); }, 900);
  };

  useEffect(() => {
    if (finished || fb) return;
    if (time <= 0) { pick(null); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, fb, finished]);

  if (finished) {
    return (
      <div className={`${card} space-y-3 text-center`}>
        <h2 className="text-2xl font-extrabold">Sign Runner complete</h2>
        <p className="text-5xl font-extrabold text-primary">{score}/{SIGN_ROUNDS.length}</p>
        <p className="text-sm text-muted-foreground">English words ending in -al are usually identical in Spanish.</p>
        {score >= 3
          ? <button className={btn} onClick={onDone}>Continue (+50 XP)</button>
          : <><p className="font-bold">Get 3+ to pass.</p><button className={btn} onClick={() => { setR(0); setScore(0); }}>Retry</button></>}
        <button className={ghost} onClick={onQuit}>Back to map</button>
      </div>
    );
  }
  const round = SIGN_ROUNDS[r];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Sign {r + 1}/{SIGN_ROUNDS.length}</span>
        <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{time}s</span>
      </div>
      <h2 className="text-2xl font-extrabold">Find the Spanish for “{round.en}”</h2>
      <div className="grid gap-3">
        {round.options.map((o) => (
          <button key={o} disabled={!!fb} onClick={() => pick(o)} className="h-16 rounded-3xl bg-emerald-500 text-2xl font-extrabold text-white shadow-float active:scale-[0.98] transition-transform disabled:opacity-60">{o}</button>
        ))}
      </div>
      {fb && <p className="text-center text-lg font-extrabold text-primary">{fb}</p>}
    </div>
  );
}

function Toledo({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">Toledo</h2>
      {step === 0 && <>
        <div className="rounded-2xl border-4 border-amber-400 bg-slate-800 p-6 text-center text-3xl font-extrabold text-white">{TOLEDO.sign}</div>
        <p>You recognise this word: <b>moderno</b> = modern. Spanish adds -o to many English words.</p>
        <button className={btn} onClick={() => setStep(1)}>Walk to the entrance</button>
      </>}
      {step === 1 && <>
        <div className={card}><p className="font-bold">{TOLEDO.question}</p></div>
        {TOLEDO.options.map((o) => (
          <button key={o} className={ghost} onClick={() => (o === TOLEDO.answer ? setStep(2) : setWrong(true))}>{o}</button>
        ))}
        {wrong && <p className="text-center font-bold text-primary">Try again: “quiero” = I want, “entrar” = to enter.</p>}
      </>}
      {step === 2 && <>
        <p className="text-2xl font-extrabold text-primary">¡Adelante! (Go ahead!)</p>
        <button className={btn} onClick={onDone}>Finish (+40 XP)</button>
      </>}
    </div>
  );
}
