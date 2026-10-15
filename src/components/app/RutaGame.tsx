import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plane, MapPin, Play, RotateCcw, Download, Upload, Lightbulb, Check, X,
  Timer, ChevronRight, User, Lock, Sparkles, Pencil, Flag, Shirt,
} from 'lucide-react'

/* ============================================================
   Ruta: Road to Fluent — single-file game
   Self-contained React + Tailwind + lucide-react.
   All progress in localStorage. No backend required.
   ============================================================ */

/* ---------- Types ---------- */

interface Character {
  name: string
  skin: string
  shirt: string
  hair: string
  cap: boolean
}

interface BucketStats { attempts: number; correct: number; incorrect: number }
interface ConceptRecord {
  recognition: BucketStats
  construction: BucketStats
  production: BucketStats
  hintsUsed: number
  mistakeTypes: Record<string, number>
  lastPractisedAt: number | null
  nextReviewAt: number | null
}

interface JourneyState {
  chapterId: string | null
  completedActivities: string[]
  worldFlags: Record<string, unknown>
}

interface SaveState {
  schemaVersion: number
  character: Character | null
  xp: number
  journey: JourneyState
  rewardsGranted: string[]
  concepts: Record<string, ConceptRecord>
}

type Mode = 'recognition' | 'construction' | 'production'

interface DialogueLine {
  who: 'narrator' | 'player' | 'staff' | 'local'
  text?: string
  es?: string
  en?: string
}

interface Dialogue {
  title: string
  lines: DialogueLine[]
}

interface ActivityDef {
  type: 'recognize' | 'construct' | 'produce'
  prompt: string
  options?: string[]
  tiles?: string[]
  answer: string
  concept: string
  hint: string
  explanation: string
  accepted: string[]
  feedbackFor?: Record<string, string>
}

interface RunnerRound {
  es: string
  options: string[]
  answer: string
  concept: string
}

interface RunnerDef {
  title: string
  rounds: RunnerRound[]
  timePerRound: number
  passScore: number
}

type Step =
  | { kind: 'dialogue'; id: string }
  | { kind: 'activity'; id: string }
  | { kind: 'runner'; id: string }

interface Chapter {
  title: string
  subtitle: string
  sequence: Step[]
  reward: number
  locked?: boolean
}

/* ---------- Content: dialogues ---------- */

const DIALOGUES: Record<string, Dialogue> = {
  'd-arrival': {
    title: 'Madrid Airport — Arrival',
    lines: [
      { who: 'narrator', text: 'You step off the plane. The signs around you are in Spanish.' },
      { who: 'narrator', text: 'You look around, confused. A staff member notices.' },
      { who: 'staff', es: '¿Necesitas ayuda?', en: 'Do you need help?' },
      { who: 'player', text: '(You do not understand. You nod anyway.)' },
      { who: 'staff', es: 'Muchas palabras son iguales en inglés. Mira el letrero.', en: 'Many words are the same as in English. Look at the sign.' },
      { who: 'narrator', text: 'You look at a sign that reads "SALIDA".' },
    ],
  },
  'd-checkpoint': {
    title: 'Madrid Airport — Checkpoint',
    lines: [
      { who: 'narrator', text: 'You have just used real Spanish to ask for something.' },
      { who: 'narrator', text: 'The shop assistant smiles and hands you the jacket.' },
      { who: 'staff', es: '¡Perfecto! Aquí tienes.', en: 'Perfect! Here you go.' },
      { who: 'narrator', text: 'You can now buy things in Spanish. This is your first real step on the Ruta.' },
    ],
  },
  'd-toledo-arrival': {
    title: 'Toledo — Arrival',
    lines: [
      { who: 'narrator', text: 'You arrive in Toledo by train. The old city walls rise around you.' },
      { who: 'narrator', text: 'A local notices you looking lost.' },
      { who: 'local', es: '¿Necesitas ayuda?', en: 'Do you need help?' },
      { who: 'narrator', text: 'You recognise this. You know "necesitar" means "to need".' },
      { who: 'local', es: 'Muy bien. ¿Qué quieres?', en: 'Very good. What do you want?' },
    ],
  },
  'd-toledo-checkpoint': {
    title: 'Toledo — Checkpoint',
    lines: [
      { who: 'narrator', text: 'You just used a softened verb form to answer a real question.' },
      { who: 'local', es: '¡Perfecto! Aquí tienes.', en: 'Perfect! Here you go.' },
      { who: 'narrator', text: 'Toledo is the second step on your Ruta. Next: Valencia.' },
    ],
  },
}

/* ---------- Content: activities ---------- */

const ACTIVITIES: Record<string, ActivityDef> = {
  'a-al-intro-1': {
    type: 'recognize',
    prompt: 'The sign says "SALIDA". Which English word does this come from?',
    options: ['salad', 'exit', 'salary'],
    answer: 'exit',
    concept: 'r-al-cognate',
    hint: 'SAL- means "go out" or "leave". Think of the English word for leaving.',
    explanation: 'Salida comes from salir, "to go out". Spanish often adds -ida or -ado to make nouns.',
    accepted: ['exit', 'exit door', 'way out'],
  },
  'a-sign-1': {
    type: 'recognize',
    prompt: 'A sign says "MUSEO NACIONAL". What does "NACIONAL" mean?',
    options: ['national', 'natural', 'native'],
    answer: 'national',
    concept: 'r-al-cognate',
    hint: 'The -al ending stays the same in Spanish.',
    explanation: 'National is a direct -al cognate.',
    accepted: ['national'],
  },
  'a-sign-2': {
    type: 'recognize',
    prompt: 'A sign says "PROHIBIDO FUMAR". What does "PROHIBIDO" mean?',
    options: ['prohibited', 'allowed', 'encouraged'],
    answer: 'prohibited',
    concept: 'r-al-cognate',
    hint: 'Look for the English word "prohibit" inside it.',
    explanation: 'Prohibido is the past participle of prohibir.',
    accepted: ['prohibited', 'forbidden'],
  },
  'a-sign-3': {
    type: 'recognize',
    prompt: 'A sign says "INFORMACIÓN". What does this mean?',
    options: ['information', 'informant', 'informal'],
    answer: 'information',
    concept: 'r-acion-cion',
    hint: '-tion becomes -ción.',
    explanation: 'Information is a -tion → -ción cognate.',
    accepted: ['information', 'info'],
  },
  'a-task-1': {
    type: 'construct',
    prompt: 'Build the sentence: "I want the jacket"',
    tiles: ['Quiero', 'la', 'chaqueta', 'Queremos', 'el', 'chaqueta'],
    answer: 'Quiero la chaqueta',
    concept: 'w-querer',
    hint: 'Use the "I" form of querer, and the feminine article la.',
    explanation: 'Quiero is the "I" form of querer. La chaqueta is feminine.',
    accepted: ['quiero la chaqueta'],
  },
  'a-task-2': {
    type: 'construct',
    prompt: 'Build the sentence: "We want the jacket"',
    tiles: ['Queremos', 'la', 'chaqueta', 'Quiero', 'las', 'chaquetas'],
    answer: 'Queremos la chaqueta',
    concept: 'w-querer',
    hint: 'Use the "we" form. Queremos.',
    explanation: 'Queremos is the "we" form. No softening here because the stress is on the ending.',
    accepted: ['queremos la chaqueta'],
  },
  'a-checkpoint-1': {
    type: 'produce',
    prompt: 'A shop assistant asks: "¿Qué quiere?" — What do you want?',
    answer: 'quiero la chaqueta',
    concept: 'w-querer',
    hint: 'Start with the "I" form of querer. Use "la chaqueta" for "the jacket".',
    explanation: 'Quiero la chaqueta is the correct answer. You have now produced Spanish from scratch.',
    accepted: ['quiero la chaqueta', 'quiero chaqueta', 'la chaqueta quiero'],
    feedbackFor: {
      'queremos la chaqueta': 'That is "we want". For "I want" you need quiero.',
      'quiero el chaqueta': 'Chaqueta is feminine, so it takes la, not el.',
    },
  },
  'a-ie-intro-1': {
    type: 'recognize',
    prompt: 'You know quiero. Now imagine a verb like tener. What is the "he/she" form?',
    options: ['tene', 'tiene', 'teno'],
    answer: 'tiene',
    concept: 'r-e-ie',
    hint: 'The stressed e in the stem splits into ie in the present tense.',
    explanation: 'tener → tiene. The stressed e splits. This is not predictable per verb; you have to learn each one.',
    accepted: ['tiene'],
  },
  'a-ie-intro-2': {
    type: 'recognize',
    prompt: 'What is the "I" form of pensar (to think)?',
    options: ['penso', 'pienso', 'pensar'],
    answer: 'pienso',
    concept: 'r-e-ie',
    hint: 'Same e → ie pattern as tener → tiene.',
    explanation: 'pensar → pienso. pienso + to-form also means "I plan to".',
    accepted: ['pienso'],
  },
  'a-toledo-task-1': {
    type: 'construct',
    prompt: 'Build the sentence: "I want the jacket" using the softened "I" form',
    tiles: ['Quiero', 'la', 'chaqueta', 'Queremos', 'el', 'chaqueta'],
    answer: 'Quiero la chaqueta',
    concept: 'w-querer',
    hint: 'Querer softens in the "I" form: quiero.',
    explanation: 'Quiero is the softened "I" form of querer.',
    accepted: ['quiero la chaqueta'],
  },
  'a-toledo-checkpoint-1': {
    type: 'produce',
    prompt: 'A local asks: "¿Qué quieres?" — What do you want?',
    answer: 'quiero la chaqueta',
    concept: 'w-querer',
    hint: 'Use quiero, the softened "I" form. Then la chaqueta.',
    explanation: 'Quiero la chaqueta. You have now produced a softened verb form from scratch.',
    accepted: ['quiero la chaqueta', 'quiero chaqueta', 'la chaqueta quiero'],
    feedbackFor: {
      'queremos la chaqueta': 'That is "we want". For "I want" use quiero.',
      'querer la chaqueta': 'That is the "to" form. You need the "I" form: quiero.',
    },
  },
}

/* ---------- Content: runner ---------- */

const RUNNERS: Record<string, RunnerDef> = {
  'run-toledo-1': {
    title: 'Sign Runner — Toledo',
    rounds: [
      { es: 'SALIDA', options: ['exit', 'salary', 'salad'], answer: 'exit', concept: 'r-al-cognate' },
      { es: 'MUSEO', options: ['museum', 'music', 'market'], answer: 'museum', concept: 'r-al-cognate' },
      { es: 'NACIONAL', options: ['national', 'natural', 'naval'], answer: 'national', concept: 'r-al-cognate' },
      { es: 'PROHIBIDO', options: ['prohibited', 'allowed', 'promoted'], answer: 'prohibited', concept: 'r-al-cognate' },
      { es: 'INFORMACIÓN', options: ['information', 'inflation', 'invitation'], answer: 'information', concept: 'r-acion-cion' },
      { es: 'MODERNO', options: ['modern', 'mode', 'modest'], answer: 'modern', concept: 'r-al-cognate' },
      { es: 'LEGAL', options: ['legal', 'legion', 'lethal'], answer: 'legal', concept: 'r-al-cognate' },
      { es: 'NORMAL', options: ['normal', 'northern', 'nominal'], answer: 'normal', concept: 'r-al-cognate' },
      { es: 'NATURAL', options: ['natural', 'national', 'neutral'], answer: 'natural', concept: 'r-al-cognate' },
      { es: 'CULTURAL', options: ['cultural', 'cultured', 'curable'], answer: 'cultural', concept: 'r-al-cognate' },
    ],
    timePerRound: 5,
    passScore: 7,
  },
}

/* ---------- Content: chapters ---------- */

const CHAPTERS: Record<string, Chapter> = {
  'madrid-arrival': {
    title: 'Madrid — Arrival',
    subtitle: 'You know almost nothing. Time to learn your first pattern.',
    sequence: [
      { kind: 'dialogue', id: 'd-arrival' },
      { kind: 'activity', id: 'a-al-intro-1' },
      { kind: 'activity', id: 'a-sign-1' },
      { kind: 'activity', id: 'a-sign-2' },
      { kind: 'activity', id: 'a-sign-3' },
      { kind: 'activity', id: 'a-task-1' },
      { kind: 'activity', id: 'a-task-2' },
      { kind: 'activity', id: 'a-checkpoint-1' },
      { kind: 'dialogue', id: 'd-checkpoint' },
    ],
    reward: 100,
  },
  'toledo-arrival': {
    title: 'Toledo — Arrival',
    subtitle: 'Use your Madrid words at speed. Meet e → ie softening.',
    sequence: [
      { kind: 'dialogue', id: 'd-toledo-arrival' },
      { kind: 'activity', id: 'a-ie-intro-1' },
      { kind: 'activity', id: 'a-ie-intro-2' },
      { kind: 'runner', id: 'run-toledo-1' },
      { kind: 'activity', id: 'a-toledo-task-1' },
      { kind: 'activity', id: 'a-toledo-checkpoint-1' },
      { kind: 'dialogue', id: 'd-toledo-checkpoint' },
    ],
    reward: 150,
  },
  'valencia-arrival': {
    title: 'Valencia — Markets',
    subtitle: 'Not yet built. The next step on the Ruta.',
    sequence: [],
    reward: 0,
    locked: true,
  },
}

/* ---------- Domain: assessment ---------- */

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?¿¡]/g, '').replace(/\s+/g, ' ')
}

interface CheckResult { correct: boolean; mistakeType: string | null; feedback: string | null }

function checkAnswer(activityId: string, playerAnswer: string): CheckResult {
  const act = ACTIVITIES[activityId]
  if (!act) return { correct: false, mistakeType: 'missing-activity', feedback: null }
  const accepted = (act.accepted.length ? act.accepted : [act.answer]).map(normalize)
  const guess = normalize(playerAnswer)
  const correct = accepted.includes(guess)
  if (correct) return { correct: true, mistakeType: null, feedback: null }
  const targeted = act.feedbackFor?.[guess]
  if (targeted) return { correct: false, mistakeType: 'targeted-feedback', feedback: targeted }
  return { correct: false, mistakeType: 'wrong-answer', feedback: act.explanation }
}

/* ---------- Domain: progress ---------- */

const SCHEMA_VERSION = 2
const SAVE_KEY = 'ruta-save-v2'
const LEGACY_KEY = 'ruta-save-v1'

function emptyBucket(): BucketStats { return { attempts: 0, correct: 0, incorrect: 0 } }

function emptyConcept(): ConceptRecord {
  return {
    recognition: emptyBucket(),
    construction: emptyBucket(),
    production: emptyBucket(),
    hintsUsed: 0,
    mistakeTypes: {},
    lastPractisedAt: null,
    nextReviewAt: null,
  }
}

function createEmptySave(): SaveState {
  return {
    schemaVersion: SCHEMA_VERSION,
    character: null,
    xp: 0,
    journey: { chapterId: null, completedActivities: [], worldFlags: {} },
    rewardsGranted: [],
    concepts: {},
  }
}

function isValidSave(s: unknown): s is SaveState {
  if (!s || typeof s !== 'object') return false
  const v = s as Partial<SaveState>
  return (
    v.schemaVersion === SCHEMA_VERSION &&
    typeof v.concepts === 'object' && v.concepts !== null &&
    Array.isArray(v.rewardsGranted) &&
    typeof v.journey === 'object' && v.journey !== null
  )
}

function grantReward(state: SaveState, rewardId: string, amount: number): SaveState {
  if (state.rewardsGranted.includes(rewardId)) return state
  return { ...state, rewardsGranted: [...state.rewardsGranted, rewardId], xp: state.xp + amount }
}

function recordAttempt(
  state: SaveState,
  conceptId: string,
  mode: Mode,
  correct: boolean,
  usedHint: boolean,
  mistakeType: string | null,
): SaveState {
  const rec = state.concepts[conceptId] ? { ...state.concepts[conceptId] } : emptyConcept()
  const bucket = { ...rec[mode] }
  bucket.attempts += 1
  if (correct) bucket.correct += 1
  else bucket.incorrect += 1
  rec[mode] = bucket
  if (usedHint) rec.hintsUsed += 1
  if (mistakeType) rec.mistakeTypes[mistakeType] = (rec.mistakeTypes[mistakeType] || 0) + 1
  rec.lastPractisedAt = Date.now()
  rec.nextReviewAt = Date.now() + (correct ? 24 * 3600 * 1000 : 6 * 3600 * 1000)
  return { ...state, concepts: { ...state.concepts, [conceptId]: rec } }
}

function completeActivity(state: SaveState, activityId: string): SaveState {
  if (state.journey.completedActivities.includes(activityId)) return state
  return {
    ...state,
    journey: { ...state.journey, completedActivities: [...state.journey.completedActivities, activityId] },
  }
}

/* ---------- Domain: persistence (localStorage) ---------- */

function safeStorage(): Storage | null {
  try {
    const t = globalThis.localStorage
    t.setItem('__ruta_test', '1')
    t.removeItem('__ruta_test')
    return t
  } catch {
    return null
  }
}

function migrateLegacy(legacy: Record<string, unknown> | null): SaveState {
  const base = createEmptySave()
  if (!legacy) return base
  return {
    ...base,
    character: (legacy.character as Character) || null,
    xp: typeof legacy.xp === 'number' ? legacy.xp : 0,
    journey: { ...base.journey, worldFlags: { legacyChapters: (legacy.completed as string[]) || [] } },
  }
}

function loadSave(): SaveState {
  const storage = safeStorage()
  if (!storage) return createEmptySave()
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidSave(parsed)) return parsed
      return createEmptySave()
    }
    const legacyRaw = storage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw)
      if (legacy && typeof legacy === 'object') return migrateLegacy(legacy as Record<string, unknown>)
    }
  } catch {
    /* corrupted save — start fresh */
  }
  return createEmptySave()
}

function persistSave(state: SaveState): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — game still runs in memory */
  }
}

function resetSave(): SaveState {
  const storage = safeStorage()
  if (storage) {
    storage.removeItem(SAVE_KEY)
    storage.removeItem(LEGACY_KEY)
  }
  return createEmptySave()
}

function exportSave(state: SaveState): string {
  return JSON.stringify(state, null, 2)
}

function importSave(json: string): SaveState {
  const parsed = JSON.parse(json)
  if (!isValidSave(parsed)) throw new Error('Invalid save format')
  return parsed
}

/* ---------- UI helpers ---------- */

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524']
const SHIRTS = ['#e63946', '#2a9d8f', '#457b9d', '#f4a261']
const HAIRS = ['#2b2118', '#5b3a29', '#a86c46', '#d9b382']

function Avatar({ c, size = 90 }: { c: Character; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="25" y="55" width="50" height="40" rx="12" fill={c.shirt} />
      <circle cx="50" cy="38" r="20" fill={c.skin} />
      <path d="M30 28 Q50 16 70 28 L70 34 Q50 22 30 34 Z" fill={c.hair} />
      {c.cap && <path d="M28 32 Q50 8 72 32 L80 34 L28 34 Z" fill="#1f2937" />}
    </svg>
  )
}

function Swatch({ color, on, onClick, label }: { color: string; on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-11 w-11 rounded-full border-4 transition-transform ${on ? 'border-white scale-110' : 'border-transparent'} cursor-pointer`}
      style={{ background: color }}
    />
  )
}

/* ---------- Screens ---------- */

function TitleScreen({
  hasCharacter, onStart, onEdit, onReset, onExport, onImport,
}: {
  hasCharacter: boolean
  onStart: () => void
  onEdit: () => void
  onReset: () => void
  onExport: () => void
  onImport: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex items-center gap-2 text-amber-400">
        <Plane className="h-8 w-8" />
        <h1 className="text-6xl font-black tracking-tight">Ruta</h1>
      </div>
      <p className="mt-0 tracking-[0.3em] text-slate-400 text-sm">ROAD TO FLUENT</p>
      <div className="mt-10 flex w-full max-w-xs flex-col gap-2">
        <button
          onClick={onStart}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-4 text-lg font-bold text-slate-900 hover:bg-amber-300 active:scale-[0.98] transition"
        >
          <Play className="h-5 w-5" />
          {hasCharacter ? 'Continue journey' : 'Start journey'}
        </button>
        {hasCharacter && (
          <>
            <button onClick={onEdit} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-slate-100 hover:bg-slate-700 transition">
              <Pencil className="h-4 w-4" /> Edit traveller
            </button>
            <button onClick={onExport} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-slate-100 hover:bg-slate-700 transition">
              <Download className="h-4 w-4" /> Export progress
            </button>
            <button onClick={onImport} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-slate-100 hover:bg-slate-700 transition">
              <Upload className="h-4 w-4" /> Import progress
            </button>
            <button onClick={onReset} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-950 transition">
              <RotateCcw className="h-4 w-4" /> Reset progress
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CharacterEditor({
  initial, hasExisting, onDone, onCancel,
}: {
  initial: Character | null
  hasExisting: boolean
  onDone: (c: Character) => void
  onCancel: () => void
}) {
  const [c, setC] = useState<Character>(
    initial || { name: '', skin: SKINS[0], shirt: SHIRTS[0], hair: HAIRS[0], cap: true },
  )
  const valid = c.name.trim().length > 0
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-6">
      <h2 className="text-2xl font-bold">{hasExisting ? 'Edit traveller' : 'Create your traveller'}</h2>
      <div className="flex justify-center py-2"><Avatar c={c} size={120} /></div>
      <label htmlFor="ruta-name" className="text-sm text-slate-400">Your name</label>
      <input
        id="ruta-name"
        value={c.name}
        onChange={(e) => setC({ ...c, name: e.target.value })}
        placeholder="Type your name"
        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-white outline-none focus:border-amber-400"
      />
      <p className="mt-2 text-sm text-slate-400">Skin</p>
      <div className="flex flex-wrap gap-2">
        {SKINS.map((s) => (
          <Swatch key={s} color={s} on={c.skin === s} onClick={() => setC({ ...c, skin: s })} label={`Skin ${s}`} />
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-400">Shirt</p>
      <div className="flex flex-wrap gap-2">
        {SHIRTS.map((s) => (
          <Swatch key={s} color={s} on={c.shirt === s} onClick={() => setC({ ...c, shirt: s })} label={`Shirt ${s}`} />
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-400">Hair</p>
      <div className="flex flex-wrap gap-2">
        {HAIRS.map((s) => (
          <Swatch key={s} color={s} on={c.hair === s} onClick={() => setC({ ...c, hair: s })} label={`Hair ${s}`} />
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-slate-200">
        <input type="checkbox" checked={c.cap} onChange={(e) => setC({ ...c, cap: e.target.checked })} className="h-5 w-5" />
        Wear cap
      </label>
      <button
        disabled={!valid}
        onClick={() => onDone(c)}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-4 text-lg font-bold text-slate-900 disabled:opacity-40 hover:bg-amber-300 transition"
      >
        <Shirt className="h-5 w-5" /> Save traveller
      </button>
      {onCancel && (
        <button onClick={onCancel} className="rounded-xl bg-slate-800 px-4 py-3 font-semibold text-slate-100 hover:bg-slate-700 transition">
          Cancel
        </button>
      )}
    </div>
  )
}

function JourneyMap({
  save, onOpenChapter, onEditCharacter,
}: {
  save: SaveState
  onOpenChapter: (id: string) => void
  onEditCharacter: () => void
}) {
  const playableOrder = ['madrid-arrival', 'toledo-arrival']
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onEditCharacter} className="rounded-full bg-slate-800 p-1 hover:bg-slate-700" aria-label="Edit character">
          {save.character && <Avatar c={save.character} size={44} />}
        </button>
        <div className="font-bold">{save.character?.name}</div>
        <span className="flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 font-bold text-white">
          <Sparkles className="h-4 w-4" /> {save.xp} XP
        </span>
      </div>
      <h2 className="text-2xl font-bold">Your Ruta</h2>
      {Object.entries(CHAPTERS).map(([id, ch]) => {
        const isFuture = !playableOrder.includes(id)
        const done = save.journey.chapterId === id || save.journey.completedActivities.length > 0
        const locked = ch.locked || isFuture
        return (
          <button
            key={id}
            disabled={locked}
            onClick={() => onOpenChapter(id)}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 p-4 text-left disabled:opacity-50 hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <MapPin className={`h-6 w-6 ${locked ? 'text-slate-500' : 'text-amber-400'}`} />
              <div>
                <p className="font-bold">{ch.title}</p>
                <p className="text-sm text-slate-400">{ch.subtitle}</p>
              </div>
            </div>
            {locked ? <Lock className="h-5 w-5 text-slate-500" /> : done ? <Check className="h-5 w-5 text-teal-400" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        )
      })}
    </div>
  )
}

function Scene({ id, onDone }: { id: string; onDone: () => void }) {
  const d = DIALOGUES[id]
  const [i, setI] = useState(0)
  const [showEn, setShowEn] = useState(false)
  if (!d) return <p className="text-red-400">Missing scene: {id}</p>
  const line = d.lines[i]
  const last = i >= d.lines.length - 1

  function next() {
    setShowEn(false)
    if (!last) setI(i + 1)
    else onDone()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-6">
      <h2 className="text-xl font-bold">{d.title}</h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-800 p-5">
        {line.who === 'narrator' || line.who === 'player' ? (
          <p className={line.who === 'player' ? 'italic text-slate-300' : ''}>{line.text}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-2xl leading-snug text-amber-300">{line.es}</p>
            {showEn && <p className="text-sm text-slate-400">{line.en}</p>}
            <button
              onClick={() => setShowEn(!showEn)}
              className="self-start rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-600"
            >
              {showEn ? 'Hide' : 'Show'} English
            </button>
          </div>
        )}
      </div>
      <button
        onClick={next}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-4 text-lg font-bold text-slate-900 hover:bg-amber-300 transition"
      >
        {last ? <Flag className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        {last ? 'Continue' : 'Next'}
      </button>
    </div>
  )
}

function Activity({
  id, onFinish, onRecord,
}: {
  id: string
  onFinish: (stepId: string, correct: boolean) => void
  onRecord: (conceptId: string, mode: Mode, correct: boolean, hint: boolean, mistakeType: string | null) => void
}) {
  const act = ACTIVITIES[id]
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering')
  const [tiles, setTiles] = useState<string[]>([])
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [hintShown, setHintShown] = useState(false)
  const answeredRef = useRef(false)

  if (!act) return <p className="text-red-400">Missing activity: {id}</p>

  const mode: Mode = act.type === 'recognize' ? 'recognition' : act.type === 'construct' ? 'construction' : 'production'

  function submit(answer: string) {
    if (answeredRef.current) return
    answeredRef.current = true
    const r = checkAnswer(id, answer)
    setResult(r)
    setPhase('feedback')
    onRecord(act.concept, mode, r.correct, hintShown, r.mistakeType)
  }

  function next() {
    answeredRef.current = false
    setPhase('answering')
    setTiles([])
    setText('')
    setResult(null)
    setHintShown(false)
    onFinish(id, result ? result.correct : false)
  }

  const label = act.type === 'recognize' ? 'Recognise' : act.type === 'construct' ? 'Build' : 'Speak'

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg">{act.prompt}</p>

      {act.type === 'recognize' && act.options && (
        <div className="flex flex-col gap-2">
          {act.options.map((o) => (
            <button
              key={o}
              disabled={phase === 'feedback'}
              onClick={() => submit(o)}
              className="rounded-xl bg-teal-600 px-4 py-4 text-xl font-bold text-white hover:bg-teal-500 disabled:opacity-40 transition"
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {act.type === 'construct' && act.tiles && (
        <div className="flex flex-col gap-2">
          <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl bg-slate-800 p-3">
            {tiles.length === 0 && <span className="text-sm text-slate-500">Tap the words in order</span>}
            {tiles.map((t, i) => (
              <button
                key={`${t}-${i}`}
                disabled={phase === 'feedback'}
                onClick={() => setTiles(tiles.filter((_, j) => j !== i))}
                className="rounded-lg bg-teal-600 px-3 py-2 text-lg font-bold text-white"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {act.tiles.map((t, i) => {
              const usedCount = tiles.filter((x) => x === t).length
              const availCount = act.tiles!.filter((x) => x === t).length
              return (
                <button
                  key={`${t}-opt-${i}`}
                  disabled={usedCount >= availCount || phase === 'feedback'}
                  onClick={() => setTiles([...tiles, t])}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-lg font-semibold text-white disabled:opacity-30"
                >
                  {t}
                </button>
              )
            })}
          </div>
          <button
            disabled={tiles.length === 0 || phase === 'feedback'}
            onClick={() => submit(tiles.join(' '))}
            className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-900 disabled:opacity-40 hover:bg-amber-300 transition"
          >
            Check
          </button>
        </div>
      )}

      {act.type === 'produce' && (
        <div className="flex flex-col gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={phase === 'feedback'}
            placeholder="Type in Spanish"
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-white outline-none focus:border-amber-400"
          />
          <button
            disabled={!text.trim() || phase === 'feedback'}
            onClick={() => submit(text)}
            className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-900 disabled:opacity-40 hover:bg-amber-300 transition"
          >
            Check
          </button>
        </div>
      )}

      {phase === 'answering' && (
        <button
          onClick={() => setHintShown(true)}
          className="mt-2 flex items-center gap-2 self-start rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
        >
          <Lightbulb className="h-4 w-4" />
          {hintShown ? act.hint : 'Show hint'}
        </button>
      )}

      {phase === 'feedback' && result && (
        <div className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
          <p className={`flex items-center gap-2 text-xl font-black ${result.correct ? 'text-emerald-400' : 'text-red-300'}`}>
            {result.correct ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
            {result.correct ? 'Correct' : 'Not quite'}
          </p>
          <p className="text-sm text-slate-300">{result.feedback ?? act.explanation}</p>
          <button
            onClick={next}
            className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-900 hover:bg-amber-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function Runner({
  id, onFinish, onRecord,
}: {
  id: string
  onFinish: (stepId: string, passed: boolean) => void
  onRecord: (conceptId: string, mode: Mode, correct: boolean, hint: boolean, mistakeType: string | null) => void
}) {
  const run = RUNNERS[id]
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(run ? run.timePerRound : 5)
  const [phase, setPhase] = useState<'running' | 'feedback' | 'done'>('running')
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const answeredRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (!run) return <p className="text-red-400">Missing runner: {id}</p>

  const total = run.rounds.length
  const current = run.rounds[round]

  const finishRound = useCallback(
    (correct: boolean, mistakeType: string | null) => {
      if (answeredRef.current) return
      answeredRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (correct) setScore((s) => s + 1)
      setFeedback({ correct })
      setPhase('feedback')
      onRecord(current.concept, 'recognition', correct, false, mistakeType)
    },
    [current, onRecord],
  )

  useEffect(() => {
    if (phase !== 'running') return
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          finishRound(false, 'timeout')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, round, finishRound])

  function pick(option: string) {
    const correct = option === current.answer
    finishRound(correct, correct ? null : 'wrong-answer')
  }

  function nextRound() {
    answeredRef.current = false
    setFeedback(null)
    if (round + 1 >= total) {
      setPhase('done')
    } else {
      setTime(run.timePerRound)
      setRound(round + 1)
      setPhase('running')
    }
  }

  if (phase === 'done') {
    const passed = score >= run.passScore
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="text-2xl font-bold">{run.title}</h2>
        <p className="text-6xl font-black text-amber-400">{score} / {total}</p>
        {passed ? (
          <>
            <p className="flex items-center gap-2 text-xl font-black text-emerald-400"><Check className="h-6 w-6" /> Passed</p>
            <p className="text-sm text-slate-400">You recognised {score} signs at speed.</p>
            <button
              onClick={() => onFinish(id, true)}
              className="rounded-xl bg-amber-400 px-6 py-4 text-lg font-bold text-slate-900 hover:bg-amber-300"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-xl font-black text-red-300"><X className="h-6 w-6" /> Not quite</p>
            <p className="text-sm text-slate-400">You need {run.passScore} of {total}. This is a speed challenge, not a test of your Spanish.</p>
            <button
              onClick={() => { setRound(0); setScore(0); setTime(run.timePerRound); setPhase('running') }}
              className="rounded-xl bg-slate-800 px-6 py-3 font-bold text-slate-100 hover:bg-slate-700"
            >
              Try again
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-4 py-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Sign {round + 1} / {total}</span>
        <span className={`flex items-center gap-1 rounded-full px-3 py-1 font-black tabular-nums ${time <= 2 ? 'bg-red-900 text-red-300' : 'bg-slate-800 text-slate-200'}`}>
          <Timer className="h-4 w-4" /> {time}s
        </span>
        <span>Score {score}</span>
      </div>
      <div className="rounded-2xl border-4 border-amber-300 bg-slate-900 p-8 text-center">
        <p className="text-4xl font-black tracking-widest text-white">{current.es}</p>
      </div>
      <div className="flex flex-col gap-2">
        {current.options.map((o) => (
          <button
            key={o}
            disabled={phase !== 'running'}
            onClick={() => pick(o)}
            className="rounded-xl bg-teal-600 px-4 py-4 text-xl font-bold text-white hover:bg-teal-500 disabled:opacity-40 transition"
          >
            {o}
          </button>
        ))}
      </div>
      {phase === 'feedback' && feedback && (
        <div className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4">
          <p className={`flex items-center gap-2 text-xl font-black ${feedback.correct ? 'text-emerald-400' : 'text-red-300'}`}>
            {feedback.correct ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
            {feedback.correct ? 'Correct' : 'Missed'}
          </p>
          <p className="text-lg text-slate-200">{current.answer}</p>
          <button onClick={nextRound} className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-900 hover:bg-amber-300">
            {round + 1 >= total ? 'Finish' : 'Next sign'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------- Main game component ---------- */

export function RutaGame() {
  const [save, setSave] = useState<SaveState>(loadSave)
  const [screen, setScreen] = useState<'title' | 'create' | 'map' | 'chapter'>('title')
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => { persistSave(save) }, [save])

  const update = useCallback((mut: (s: SaveState) => SaveState) => {
    setSave((s) => mut(s))
  }, [])

  const onRecord = useCallback(
    (conceptId: string, mode: Mode, correct: boolean, hint: boolean, mistakeType: string | null) => {
      update((s) => recordAttempt(s, conceptId, mode, correct, hint, mistakeType))
    },
    [update],
  )

  function startChapter(id: string) {
    setChapterId(id)
    setStepIndex(0)
    setScreen('chapter')
  }

  function onStepDone(stepId: string, _passed: boolean) {
    const ch = chapterId ? CHAPTERS[chapterId] : null
    if (!ch || ch.sequence.length === 0) { setScreen('map'); return }
    const step = ch.sequence[stepIndex]
    update((s) => {
      let ns = s
      if (step.kind !== 'dialogue') ns = completeActivity(ns, stepId)
      return ns
    })
    if (stepIndex < ch.sequence.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      update((s) => {
        let ns = s
        ns = completeActivity(ns, `chapter:${chapterId}`)
        ns = grantReward(ns, `chapter:${chapterId}`, ch.reward)
        ns = { ...ns, journey: { ...ns.journey, chapterId: chapterId! } }
        return ns
      })
      setScreen('map')
    }
  }

  function handleExport() {
    const blob = new Blob([exportSave(save)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ruta-save.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        setSave(importSave(text))
        setScreen('map')
      } catch (err) {
        alert('Could not import: ' + (err as Error).message)
      }
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {screen === 'title' && (
        <TitleScreen
          hasCharacter={!!save.character}
          onStart={() => setScreen(save.character ? 'map' : 'create')}
          onEdit={() => setScreen('create')}
          onReset={() => { setSave(resetSave()) }}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
      {screen === 'create' && (
        <CharacterEditor
          initial={save.character}
          hasExisting={!!save.character}
          onDone={(c) => { update((s) => ({ ...s, character: c })); setScreen('map') }}
          onCancel={() => setScreen(save.character ? 'map' : 'title')}
        />
      )}
      {screen === 'map' && (
        <JourneyMap
          save={save}
          onOpenChapter={startChapter}
          onEditCharacter={() => setScreen('create')}
        />
      )}
      {screen === 'chapter' && chapterId && (() => {
        const ch = CHAPTERS[chapterId]
        if (!ch || ch.sequence.length === 0) {
          return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
              <Lock className="h-8 w-8 text-slate-500" />
              <p className="text-xl font-bold">{ch?.title ?? 'Unknown chapter'}</p>
              <p className="text-slate-400">{ch?.subtitle}</p>
              <button onClick={() => setScreen('map')} className="rounded-xl bg-slate-800 px-6 py-3 font-bold hover:bg-slate-700">
                Back to map
              </button>
            </div>
          )
        }
        const step = ch.sequence[stepIndex]
        if (!step) return <p className="p-6 text-red-400">Step missing</p>
        return (
          <div className="flex min-h-screen flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
              <span>Step {stepIndex + 1} of {ch.sequence.length}</span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" /> {ch.title}</span>
            </div>
            {step.kind === 'dialogue' && <Scene id={step.id} onDone={() => onStepDone(step.id, true)} />}
            {step.kind === 'activity' && <Activity id={step.id} onFinish={onStepDone} onRecord={onRecord} />}
            {step.kind === 'runner' && <Runner id={step.id} onFinish={onStepDone} onRecord={onRecord} />}
          </div>
        )
      })()}
    </div>
  )
}

export default RutaGame
