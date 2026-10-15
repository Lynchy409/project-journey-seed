// Ruta: Road to Fluent — content + progress logic (ported from Lynchy409/ruta-app "Madrid arrival milestone").
// Content is data; screens live in RutaGame.tsx.

export type Traveller = { name: string; skin: string; shirt: string; hair: string; cap: boolean };

export const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524"];
export const SHIRTS = ["#e63946", "#2a9d8f", "#457b9d", "#f4a261"];
export const HAIR = ["#2b2118", "#5b3a29", "#a86c46", "#d9b382"];

type Line = { who: "narrator" | "player" | "staff"; text?: string; es?: string; en?: string };
export const DIALOGUES: Record<string, { title: string; lines: Line[] }> = {
  "d-arrival": {
    title: "Madrid Airport — Arrival",
    lines: [
      { who: "narrator", text: "You step off the plane. The signs around you are in Spanish." },
      { who: "narrator", text: "You look around, confused. A staff member notices." },
      { who: "staff", es: "¿Necesitas ayuda?", en: "Do you need help?" },
      { who: "player", text: "(You do not understand. You nod anyway.)" },
      { who: "staff", es: "Muchas palabras son iguales en inglés. Mira el letrero.", en: "Many words are the same as in English. Look at the sign." },
      { who: "narrator", text: 'You look at a sign that reads "SALIDA".' },
    ],
  },
  "d-checkpoint": {
    title: "Madrid Airport — Checkpoint",
    lines: [
      { who: "narrator", text: "You have just used real Spanish to ask for something." },
      { who: "narrator", text: "The shop assistant smiles and hands you the jacket." },
      { who: "staff", es: "¡Perfecto! Aquí tienes.", en: "Perfect! Here you go." },
      { who: "narrator", text: "You can now buy things in Spanish. This is your first real step on the Ruta." },
    ],
  },
};

export type Activity = {
  type: "recognize" | "construct" | "produce";
  prompt: string;
  options?: string[];
  tiles?: string[];
  answer?: string;
  concept: string;
  hint: string;
  explanation: string;
  accepted: string[];
  feedbackFor?: Record<string, string>;
};

export const ACTIVITIES: Record<string, Activity> = {
  "a-al-intro-1": {
    type: "recognize", prompt: 'The sign says "SALIDA". Which English word does this come from?',
    options: ["salad", "exit", "salary"], answer: "exit", concept: "r-al-cognate",
    hint: 'SAL- means "go out" or "leave". Think of the English word for leaving.',
    explanation: 'Salida comes from salir, "to go out". Spanish often adds -ida or -ado to make nouns.',
    accepted: ["exit", "exit door", "way out"],
  },
  "a-sign-1": {
    type: "recognize", prompt: 'A sign says "MUSEO NACIONAL". What does "NACIONAL" mean?',
    options: ["national", "natural", "native"], answer: "national", concept: "r-al-cognate",
    hint: "The -al ending stays the same in Spanish.", explanation: "National is a direct -al cognate.",
    accepted: ["national"],
  },
  "a-sign-2": {
    type: "recognize", prompt: 'A sign says "PROHIBIDO FUMAR". What does "PROHIBIDO" mean?',
    options: ["prohibited", "allowed", "encouraged"], answer: "prohibited", concept: "r-al-cognate",
    hint: 'Look for the English word "prohibit" inside it.', explanation: "Prohibido is the past participle of prohibir.",
    accepted: ["prohibited", "forbidden"],
  },
  "a-sign-3": {
    type: "recognize", prompt: 'A sign says "INFORMACIÓN". What does this mean?',
    options: ["information", "informant", "informal"], answer: "information", concept: "r-acion-cion",
    hint: "-tion becomes -ción.", explanation: "Information is a -tion → -ción cognate.",
    accepted: ["information", "info"],
  },
  "a-task-1": {
    type: "construct", prompt: 'Build the sentence: "I want the jacket"',
    tiles: ["Quiero", "la", "chaqueta", "Queremos", "el", "chaqueta"], answer: "Quiero la chaqueta", concept: "w-querer",
    hint: 'Use the "I" form of querer, and the feminine article la.',
    explanation: 'Quiero is the "I" form of querer. La chaqueta is feminine.', accepted: ["quiero la chaqueta"],
  },
  "a-task-2": {
    type: "construct", prompt: 'Build the sentence: "We want the jacket"',
    tiles: ["Queremos", "la", "chaqueta", "Quiero", "las", "chaquetas"], answer: "Queremos la chaqueta", concept: "w-querer",
    hint: 'Use the "we" form. Queremos.',
    explanation: 'Queremos is the "we" form. No softening here because the stress is on the ending.', accepted: ["queremos la chaqueta"],
  },
  "a-checkpoint-1": {
    type: "produce", prompt: 'A shop assistant asks: "¿Qué quiere?" — What do you want?', concept: "w-querer",
    hint: 'Start with the "I" form of querer. Use "la chaqueta" for "the jacket".',
    explanation: "Quiero la chaqueta is the correct answer. You have now produced Spanish from scratch.",
    accepted: ["quiero la chaqueta", "quiero chaqueta", "la chaqueta quiero"],
    feedbackFor: {
      "queremos la chaqueta": 'That is "we want". For "I want" you need quiero.',
      "quiero el chaqueta": "Chaqueta is feminine, so it takes la, not el.",
    },
  },
};

export type Step = { kind: "dialogue" | "activity"; id: string };
export type Chapter = { title: string; subtitle: string; sequence?: Step[]; reward?: number; locked?: boolean };

export const CHAPTERS: Record<string, Chapter> = {
  "madrid-arrival": {
    title: "Madrid — Arrival",
    subtitle: "You know almost nothing. Time to learn your first pattern.",
    sequence: [
      { kind: "dialogue", id: "d-arrival" },
      { kind: "activity", id: "a-al-intro-1" },
      { kind: "activity", id: "a-sign-1" },
      { kind: "activity", id: "a-sign-2" },
      { kind: "activity", id: "a-sign-3" },
      { kind: "activity", id: "a-task-1" },
      { kind: "activity", id: "a-task-2" },
      { kind: "activity", id: "a-checkpoint-1" },
      { kind: "dialogue", id: "d-checkpoint" },
    ],
    reward: 100,
  },
  "toledo-arrival": { title: "Toledo — Arrival", subtitle: "Coming soon.", locked: true },
};

// ---------- Answer checking (case/punctuation ignored, accents matter) ----------
const norm = (s: string) => s.trim().toLowerCase().replace(/[.,!?¿¡]/g, "").replace(/\s+/g, " ");

export function checkAnswer(id: string, guessRaw: string) {
  const act = ACTIVITIES[id]!;
  const guess = norm(guessRaw);
  const correct = act.accepted.map(norm).includes(guess);
  let feedback = act.explanation;
  let mistakeType: string | null = null;
  if (!correct) {
    mistakeType = "wrong-answer";
    if (act.feedbackFor?.[guess]) { feedback = act.feedbackFor[guess]!; mistakeType = "targeted-feedback"; }
  }
  return { correct, feedback, mistakeType };
}

// ---------- Save / progress ----------
type Bucket = { attempts: number; correct: number; incorrect: number };
export type Mode = "recognition" | "construction" | "production";
type ConceptRec = Record<Mode, Bucket> & {
  hintsUsed: number; mistakeTypes: Record<string, number>; lastPractisedAt: number | null; nextReviewAt: number | null;
};
export type RutaSave = {
  schemaVersion: 2; character: Traveller | null; xp: number;
  journey: { chapterId: string | null; completedActivities: string[] };
  rewardsGranted: string[]; concepts: Record<string, ConceptRec>;
};

export const fresh = (): RutaSave => ({
  schemaVersion: 2, character: null, xp: 0,
  journey: { chapterId: null, completedActivities: [] }, rewardsGranted: [], concepts: {},
});

const KEY = "ruta-save-v2";
const LEGACY = "ruta-save";

export function loadSave(): RutaSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (p?.schemaVersion === 2) return p; }
    const old = localStorage.getItem(LEGACY);
    if (old) {
      const l = JSON.parse(old);
      const base = fresh();
      if (l?.character) base.character = { hair: HAIR[0]!, ...l.character };
      base.xp = l?.xp ?? 0;
      return base;
    }
  } catch { /* ignore */ }
  return fresh();
}
export function storeSave(s: RutaSave) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
export function resetSave() { try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY); } catch { /* ignore */ } return fresh(); }

const emptyRec = (): ConceptRec => ({
  recognition: { attempts: 0, correct: 0, incorrect: 0 },
  construction: { attempts: 0, correct: 0, incorrect: 0 },
  production: { attempts: 0, correct: 0, incorrect: 0 },
  hintsUsed: 0, mistakeTypes: {}, lastPractisedAt: null, nextReviewAt: null,
});

export function recordAttempt(s: RutaSave, concept: string, mode: Mode, correct: boolean, hint: boolean, mistake: string | null): RutaSave {
  const r = s.concepts[concept] ?? emptyRec();
  const b = r[mode];
  const now = Date.now();
  const rec: ConceptRec = {
    ...r,
    [mode]: { attempts: b.attempts + 1, correct: b.correct + (correct ? 1 : 0), incorrect: b.incorrect + (correct ? 0 : 1) },
    hintsUsed: r.hintsUsed + (hint ? 1 : 0),
    mistakeTypes: mistake ? { ...r.mistakeTypes, [mistake]: (r.mistakeTypes[mistake] ?? 0) + 1 } : r.mistakeTypes,
    lastPractisedAt: now,
    nextReviewAt: now + (correct ? 24 : 6) * 3600_000,
  };
  return { ...s, concepts: { ...s.concepts, [concept]: rec } };
}

export function completeActivity(s: RutaSave, id: string): RutaSave {
  if (s.journey.completedActivities.includes(id)) return s;
  return { ...s, journey: { ...s.journey, completedActivities: [...s.journey.completedActivities, id] } };
}

export function grantReward(s: RutaSave, id: string, amount: number): RutaSave {
  if (s.rewardsGranted.includes(id)) return s;
  return { ...s, rewardsGranted: [...s.rewardsGranted, id], xp: s.xp + amount };
}

export function dueConcepts(s: RutaSave, now = Date.now()) {
  return Object.entries(s.concepts).filter(([, r]) => r.nextReviewAt && r.nextReviewAt <= now).map(([id]) => id);
}
