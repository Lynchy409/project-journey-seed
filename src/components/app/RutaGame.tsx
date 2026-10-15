import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plane, MapPin, Play, RotateCcw, Download, Upload, Lightbulb, Check, X,
  Timer, ChevronRight, User, Lock, Sparkles, Pencil, Flag, Shirt,
  BookOpen, Volume2, ArrowLeft, Shuffle, Smartphone, ArrowRight, Headphones,
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
  if (mistakeType) rec.mistakeTypes = { ...rec.mistakeTypes, [mistakeType]: (rec.mistakeTypes[mistakeType] || 0) + 1 }
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
    character: (legacy['character'] as Character) || null,
    xp: typeof legacy['xp'] === 'number' ? legacy['xp'] : 0,
    journey: { ...base.journey, worldFlags: { legacyChapters: (legacy['completed'] as string[]) || [] } },
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
    initial || { name: '', skin: SKINS[0]!, shirt: SHIRTS[0]!, hair: HAIRS[0]!, cap: true },
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
        const done = save.rewardsGranted.includes(`chapter:${id}`)
        const locked = ch.locked || isFuture || (id === 'toledo-arrival' && !save.rewardsGranted.includes('chapter:madrid-arrival'))
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
  const line = d.lines[i]!
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
    onRecord(act!.concept, mode, r.correct, hintShown, r.mistakeType)
  }

  function next() {
    if (!result?.correct) {
      answeredRef.current = false
      setPhase('answering')
      setResult(null)
      return
    }
    answeredRef.current = false
    setPhase('answering')
    setTiles([])
    setText('')
    setResult(null)
    setHintShown(false)
    onFinish(id, result ? result.correct : false)
  }

  const label = act.type === 'recognize' ? 'Recognise' : act.type === 'construct' ? 'Build' : 'Write'

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
            {result.correct ? 'Next' : 'Try again'}
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
  const current = run.rounds[round]!

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
      setTime(run!.timePerRound)
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

function RutaPrototype() {
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

  function onStepDone(stepId: string, passed: boolean) {
    const ch = chapterId ? CHAPTERS[chapterId] : null
    if (!ch || ch.sequence.length === 0) { setScreen('map'); return }
    const step = ch.sequence[stepIndex]
    if (!step || step.id !== stepId || (step.kind !== 'dialogue' && !passed)) return
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
            {step.kind === 'dialogue' && <Scene key={step.id} id={step.id} onDone={() => onStepDone(step.id, true)} />}
            {step.kind === 'activity' && <Activity key={step.id} id={step.id} onFinish={onStepDone} onRecord={onRecord} />}
            {step.kind === 'runner' && <Runner key={step.id} id={step.id} onFinish={onStepDone} onRecord={onRecord} />}
          </div>
        )
      })()}
    </div>
  )
}

/* ============================================================
   New opening: plane, pocket lesson and evidence notebook.
   Survival phrases are additional game content, not verified
   Language Transfer lesson coverage. No course audio is copied.
   References used for the starter phrase meanings:
   https://spanishandgo.com/wp-content/uploads/2024/03/02-EssentialBasicSpanishPhrasesforTravel.pdf
   https://www.spanishdict.com/guide/how-are-you-in-spanish
   https://www.spanishdict.com/translate/vamos
   ============================================================ */

interface PocketWord {
  id: string; es: string; en: string; accepts: string[]; note: string
}
const POCKET_WORDS: PocketWord[] = [
  { id: 'hola', es: 'Hola', en: 'Hello', accepts: ['hello', 'hi', 'hey'], note: 'A greeting. The h is silent.' },
  { id: 'como', es: '¿Cómo estás?', en: 'How are you?', accepts: ['how are you', 'how are you doing', 'how do you feel'], note: 'Informal, to one person. The formal version is ¿Cómo está? You can learn the grammar later.' },
  { id: 'bien', es: 'Bien, gracias', en: 'Fine, thank you', accepts: ['fine thank you', 'fine thanks', 'good thanks', 'good thank you', 'well thanks', 'well thank you', 'im fine thanks', 'i am fine thank you'], note: 'An answer to the greeting. Learn the expression as a useful chunk for now.' },
  { id: 'adios', es: 'Adiós', en: 'Goodbye', accepts: ['goodbye', 'bye', 'bye bye', 'good bye'], note: 'A farewell. Keep the accent on ó when writing Spanish.' },
  { id: 'favor', es: 'Por favor', en: 'Please', accepts: ['please'], note: 'Two words. Add it to a request to be polite.' },
  { id: 'gracias', es: 'Gracias', en: 'Thank you', accepts: ['thank you', 'thanks'], note: 'Use it when someone helps you or hands you something.' },
  { id: 'perdon', es: 'Perdón', en: 'Excuse me / Sorry', accepts: ['excuse me', 'sorry', 'pardon', 'pardon me', 'im sorry', 'i am sorry', 'excuse me sorry', 'sorry excuse me'], note: 'For getting past someone or a small apology. Not every use of English “sorry” translates this way.' },
  { id: 'si', es: 'Sí', en: 'Yes', accepts: ['yes', 'yeah', 'yep'], note: 'The accent matters: sí means yes; si without the accent means if.' },
  { id: 'no', es: 'No', en: 'No', accepts: ['no', 'nope'], note: 'Combine familiar pieces: no, gracias = no, thank you.' },
  { id: 'entiendo', es: 'No entiendo', en: 'I don’t understand', accepts: ['i dont understand', 'dont understand', 'i do not understand', 'do not understand'], note: 'A useful safety phrase. It is fine to say this and ask for support.' },
  { id: 'vamos', es: 'Vamos', en: 'Let’s go', accepts: ['lets go', 'let us go', 'come on', 'we go', 'we are going', 'were going'], note: 'Here it means “let’s go”. In other contexts it can mean “we go”, “we’re going” or “come on”.' },
]
const POCKET_GROUPS = [
  { title: 'Break the ice', subtitle: 'A hello. A reply. A goodbye.', cards: [['hola'], ['como'], ['bien'], ['adios']] },
  { title: 'Little words, big difference', subtitle: 'Politeness goes a long way.', cards: [['favor'], ['gracias'], ['perdon']] },
  { title: 'Find your feet', subtitle: 'Say yes, say no, ask for support.', cards: [['si', 'no'], ['entiendo'], ['vamos']] },
]
type PocketView = 'cabin' | 'phone' | 'teach' | 'match' | 'checkpoint' | 'landed'
interface PocketAttempt {
  id: string; word: string; at: string; day: string
  mode: 'match' | 'recall' | 'situation'; response: string; correct: boolean
  assisted: boolean; session: string; number: number
}
interface PocketSave {
  version: 1; character: Character; view: PocketView; group: number; card: number
  collected: string[]; seen: string[]; matched: string[]; attempts: PocketAttempt[]
  awards: string[]; checkpoint: number; checkpointHint: boolean; session: string
  lookups?: string[]
}
const POCKET_KEY = 'ruta-pocket-v1'
const pWord = (id: string) => POCKET_WORDS.find(w => w.id === id)!
const pIds = (group: number) => (POCKET_GROUPS[group] ?? POCKET_GROUPS[0]!).cards.flat()
const pDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const pUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const pEnglish = (text: string) => text.normalize('NFC').toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
function pShuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
function pFresh(): PocketSave {
  return { version: 1, character: { name: 'Traveller', skin: SKINS[0]!, shirt: SHIRTS[1]!, hair: HAIRS[0]!, cap: false },
    view: 'cabin', group: 0, card: 0, collected: [], seen: [], matched: [], attempts: [],
    awards: [], checkpoint: 0, checkpointHint: false, session: pUid(), lookups: [] }
}
function pValid(value: unknown): value is PocketSave {
  if (!value || typeof value !== 'object') return false
  const v = value as PocketSave
  const ids = new Set(POCKET_WORDS.map(w => w.id))
  const list = (x: unknown) => Array.isArray(x) && x.every(i => typeof i === 'string' && ids.has(i))
  const color = (s: unknown) => typeof s === 'string' && /^#[a-f\d]{6}$/i.test(s)
  return v.version === 1 && !!v.character && typeof v.character.name === 'string' &&
    v.character.name.length <= 80 && color(v.character.skin) && color(v.character.shirt) &&
    color(v.character.hair) && typeof v.character.cap === 'boolean' &&
    ['cabin', 'phone', 'teach', 'match', 'checkpoint', 'landed'].includes(v.view) &&
    Number.isInteger(v.group) && v.group >= 0 && v.group < 3 &&
    Number.isInteger(v.card) && v.card >= 0 && v.card < POCKET_GROUPS[v.group]!.cards.length &&
    list(v.collected) && list(v.seen) && list(v.matched) &&
    Array.isArray(v.awards) && v.awards.every(a => typeof a === 'string') &&
    typeof v.session === 'string' && Number.isInteger(v.checkpoint) && v.checkpoint >= 0 && v.checkpoint <= 3 &&
    (v.lookups === undefined || (Array.isArray(v.lookups) && v.lookups.every(x => typeof x === 'string'))) &&
    typeof v.checkpointHint === 'boolean' && Array.isArray(v.attempts) &&
    v.attempts.length <= 100000 && v.attempts.every(a => a && typeof a.id === 'string' &&
      ids.has(a.word) && typeof a.at === 'string' && Number.isFinite(Date.parse(a.at)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(a.day) && ['match', 'recall', 'situation'].includes(a.mode) &&
      typeof a.response === 'string' && typeof a.correct === 'boolean' &&
      typeof a.assisted === 'boolean' && typeof a.session === 'string' &&
      Number.isInteger(a.number) && a.number > 0)
}
function pAttempt(s: PocketSave, word: string, mode: PocketAttempt['mode'], response: string, correct: boolean, assisted: boolean, session: string): PocketAttempt {
  const now = new Date()
  return { id: pUid(), word, mode, response, correct, assisted, session, at: now.toISOString(), day: pDay(now),
    number: s.attempts.filter(a => a.word === word && a.mode === mode && a.session === session).length + 1 }
}
function pAppend(s: PocketSave, a: PocketAttempt): PocketSave {
  return s.attempts.some(x => x.id === a.id) ? s : { ...s, attempts: [...s.attempts, a] }
}
const pButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#17695c] px-5 py-3 text-base font-bold text-white transition hover:bg-[#105346] disabled:cursor-default disabled:opacity-40 active:scale-[.98]'
const pGhost = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#ced8d2] bg-white/70 px-4 py-2 text-sm font-bold text-[#233e38] transition hover:bg-white disabled:opacity-40'
const pSmall = 'text-xs font-bold uppercase tracking-[.16em] text-[#587167]'

/* Procedural, offline cabin art. No downloaded images or font assets. */
function PocketCabin({ character }: { character: Character }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const x = ctx
    c.width = 1200; c.height = 700
    function round(a: number, b: number, w: number, h: number, r: number, fill: string) {
      x.beginPath(); x.roundRect(a, b, w, h, r); x.fillStyle = fill; x.fill()
    }
    const wall = x.createLinearGradient(0, 0, 0, 700)
    wall.addColorStop(0, '#e2ece7'); wall.addColorStop(1, '#bdcfc9')
    x.fillStyle = wall; x.fillRect(0, 0, 1200, 700)
    round(24, -50, 1152, 146, 80, '#f3f3e9')
    round(24, 88, 1152, 14, 7, '#90aca2')
    x.save()
    x.beginPath(); x.roundRect(90, 142, 330, 365, 122); x.clip()
    const sky = x.createLinearGradient(0, 142, 0, 507)
    sky.addColorStop(0, '#65bdcc'); sky.addColorStop(.67, '#cce8dd'); sky.addColorStop(1, '#f6cd93')
    x.fillStyle = sky; x.fillRect(90, 142, 330, 365)
    x.fillStyle = '#ffe4a4'; x.beginPath(); x.arc(327, 251, 42, 0, Math.PI * 2); x.fill()
    round(82, 328, 212, 35, 20, '#f5f8ed'); round(250, 393, 190, 30, 20, '#f5f8ed')
    x.fillStyle = '#fbfcf1'; x.beginPath(); x.moveTo(135, 502); x.lineTo(403, 347); x.lineTo(366, 462); x.fill()
    x.restore()
    x.strokeStyle = '#f7f7ed'; x.lineWidth = 20; x.beginPath(); x.roundRect(90, 142, 330, 365, 122); x.stroke()
    x.strokeStyle = '#789b91'; x.lineWidth = 3; x.beginPath(); x.roundRect(78, 130, 354, 389, 134); x.stroke()
    round(480, 157, 150, 90, 15, '#d2e0d8'); round(508, 182, 94, 12, 6, '#adc6bb')
    round(480, 557, 550, 35, 12, '#e8e7d9')
    round(455, 271, 247, 295, 60, '#164f49'); round(475, 290, 207, 79, 25, '#377a70')
    round(455, 525, 310, 103, 35, '#164f49')
    round(594, 453, 128, 136, 35, character.shirt)
    round(620, 545, 45, 118, 15, '#253f45'); round(672, 545, 45, 118, 15, '#253f45')
    round(615, 646, 64, 23, 10, '#f3edda'); round(672, 646, 65, 23, 10, '#f3edda')
    x.fillStyle = character.skin; x.beginPath(); x.arc(658, 409, 46, 0, Math.PI * 2); x.fill()
    round(614, 359, 89, 38, 20, character.hair)
    if (character.cap) round(605, 358, 108, 25, 9, '#163b35')
    x.fillStyle = '#243b36'; x.beginPath(); x.arc(681, 411, 4, 0, 7); x.fill()
    round(685, 471, 40, 24, 12, character.skin)
    x.save(); x.translate(740, 450); x.rotate(.16)
    round(-23, -28, 49, 87, 8, '#203c37'); round(-17, -20, 37, 66, 4, '#e5b859'); x.restore()
    round(838, 312, 100, 192, 32, '#304c50'); round(858, 479, 31, 170, 9, '#223a40')
    round(900, 479, 31, 170, 9, '#223a40')
    round(842, 643, 51, 19, 8, '#183032'); round(900, 643, 51, 19, 8, '#183032')
    x.fillStyle = '#d9a478'; x.beginPath(); x.arc(888, 266, 37, 0, 7); x.fill()
    round(853, 226, 74, 29, 15, '#342f2e')
    x.fillStyle = '#e8b75f'; x.beginPath(); x.moveTo(860, 320); x.lineTo(885, 345); x.lineTo(907, 320); x.fill()
    round(791, 384, 71, 26, 13, '#d9a478')
    round(1020, 352, 170, 290, 32, '#6b8a80'); round(1035, 366, 143, 68, 20, '#96ada1')
  }, [character])
  return <canvas ref={canvas} aria-label="Your traveller sits beside the plane window with a phone. A cabin crew member stands in the aisle." role="img" className="h-full w-full object-cover" />
}

function PocketSound({ text }: { text: string }) {
  const [message, setMessage] = useState('')
  function speak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setMessage('Voice playback is unavailable here.'); return }
    const synth = window.speechSynthesis
    const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith('es'))
    if (!voices.length) { setMessage('No Spanish voice is available on this device. You can continue without audio.'); return }
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'; utterance.voice = voices.find(v => v.lang === 'es-ES') ?? voices[0]!
    utterance.rate = .85
    utterance.onerror = () => setMessage('Playback failed. Audio never blocks your progress.')
    synth.speak(utterance); setMessage('')
  }
  useEffect(() => () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel() }, [])
  return <div><button className={pGhost} onClick={speak} aria-label={`Listen to ${text}`}><Volume2 size={17} /> Listen</button>{message && <p role="status" className="mt-2 text-sm text-[#586d64]">{message}</p>}</div>
}

function PocketMatch({ s, update }: { s: PocketSave; update: (fn: (v: PocketSave) => PocketSave) => void }) {
  const ids = pIds(s.group)
  const [left] = useState(() => pShuffle(ids))
  const [right] = useState(() => pShuffle(ids))
  const [selection, setSelection] = useState<{ side: 'es' | 'en'; id: string } | null>(null)
  const [feedback, setFeedback] = useState('')
  const [wrong, setWrong] = useState(false)
  const [help, setHelp] = useState(false)
  const [mixing, setMixing] = useState(true)
  const lock = useRef(false)
  const advanced = useRef(false)
  useEffect(() => { const t = setTimeout(() => setMixing(false), 700); return () => clearTimeout(t) }, [])
  const done = ids.every(id => s.matched.includes(id))
  function choose(side: 'es' | 'en', id: string) {
    if (lock.current || mixing || wrong || s.matched.includes(id)) return
    if (!selection || selection.side === side) { setSelection({ side, id }); setFeedback(''); return }
    lock.current = true
    const es = side === 'es' ? id : selection.id
    const en = side === 'en' ? id : selection.id
    const correct = es === en
    const attempt = pAttempt(s, es, 'match', pWord(en).en, correct, help || !!s.lookups?.includes(s.session), s.session)
    update(v => {
      const next = pAppend(v, attempt)
      return correct ? { ...next, matched: [...new Set([...next.matched, es])],
        collected: [...new Set([...next.collected, es])] } : next
    })
    setFeedback(correct ? `${pWord(es).es} → ${pWord(es).en}. Added to your notebook.` : `Not that pair. You selected ${pWord(es).es} and “${pWord(en).en}”. Try again, or reveal the meanings.`)
    setSelection(null); setWrong(!correct)
    if (correct) lock.current = false
  }
  return <div className="space-y-5">
    <div><p className={pSmall}>Match / {POCKET_GROUPS[s.group]!.title}</p><h2 className="mt-2 text-2xl font-black">Connect the words.</h2><p className="mt-2 text-sm text-[#587167]">Tap Spanish, then its English meaning. Either column can go first. No timer.</p></div>
    <div className="flex items-center justify-between"><span className={pSmall}>{ids.filter(id => s.matched.includes(id)).length} / {ids.length} paired</span><span className="flex items-center gap-2 text-sm text-[#587167]"><Shuffle size={16} /> {mixing ? 'Shuffling…' : 'Cards shuffled'}</span></div>
    <div className={`grid grid-cols-2 gap-3 ${mixing ? 'pocket-shuffle' : ''}`} aria-busy={mixing}>
      {[{ side: 'es' as const, words: left }, { side: 'en' as const, words: right }].map(col => <div key={col.side} className="space-y-3">
        <p className={pSmall}>{col.side === 'es' ? 'Español' : 'English'}</p>
        {col.words.map(id => <button key={id} data-word={id} data-side={col.side} aria-pressed={selection?.id === id && selection.side === col.side}
          disabled={mixing || wrong || s.matched.includes(id)}
          onClick={() => choose(col.side, id)}
          className={`flex min-h-20 w-full items-center justify-center gap-1 break-words rounded-2xl border-2 px-2 py-3 text-center text-base font-bold transition
            ${s.matched.includes(id) ? 'border-[#b7d4bc] bg-[#e7f1e5] text-[#397348]' : selection?.id === id && selection.side === col.side ? 'border-[#17695c] bg-[#dbece5] text-[#164e40]' : 'border-[#d7dfd5] bg-white text-[#223e35] hover:border-[#7eaa97]'}`}>
          {s.matched.includes(id) && <Check size={16} className="shrink-0" />}<span lang={col.side === 'es' ? 'es' : 'en'}>{col.side === 'es' ? pWord(id).es : pWord(id).en}</span>
        </button>)}
      </div>)}
    </div>
    {feedback && <p role="status" className="rounded-xl bg-[#e6ece3] p-3 text-sm">{feedback}</p>}
    {wrong && <button className={pButton} onClick={() => { lock.current = false; setWrong(false); setFeedback('Choose a new pair.'); }}>Try another pair</button>}
    {!done && <button className={pGhost} onClick={() => setHelp(true)}><Lightbulb size={16} /> Reveal meanings</button>}
    {help && <div className="space-y-2 rounded-xl bg-[#fff3d5] p-4 text-sm">{ids.map(id => <p key={id}><b>{pWord(id).es}</b> · {pWord(id).en}</p>)}<p>Matches made with this support are recorded as assisted.</p></div>}
    {done && <div className="space-y-3 rounded-2xl bg-[#e2eddf] p-4"><p className="font-bold">Collected, not forgotten.</p><p className="text-sm">These expressions are in your notebook. We’ll check what stays with you later.</p><button className={`${pButton} w-full`} onClick={() => {
      if (advanced.current) return
      advanced.current = true
      const session = pUid()
      update(v => v.group < 2 ? { ...v, group: v.group + 1, card: 0, view: 'teach', session } : { ...v, view: 'checkpoint', checkpoint: 0, checkpointHint: false, session })
    }}> {s.group < 2 ? 'Next small set' : 'Try it in the cabin'} <ArrowRight size={18} /></button></div>}
  </div>
}

const POCKET_CHECKS = [
  { word: 'hola', prompt: 'Your seat neighbour smiles and greets you. Greet them back.', speech: 'Hola', options: ['adios', 'hola', 'gracias'] },
  { word: 'bien', prompt: 'They ask how you are. Tell them you’re fine and thank them.', speech: '¿Cómo estás?', options: ['entiendo', 'bien', 'vamos'] },
  { word: 'entiendo', prompt: 'The next sentence is unfamiliar. Be honest: tell them you don’t understand.', speech: '', options: ['si', 'entiendo', 'favor'] },
  { word: 'gracias', prompt: 'They switch to English and help you prepare for landing. Thank them.', speech: '', options: ['gracias', 'perdon', 'no'] },
]

function PocketCheckpoint({ s, update }: { s: PocketSave; update: (fn: (v: PocketSave) => PocketSave) => void }) {
  const check = POCKET_CHECKS[s.checkpoint]!
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null)
  const lock = useRef(false)
  const advanced = useRef(false)
  function submit(id: string) {
    if (lock.current) return
    lock.current = true
    const correct = id === check.word
    const attempt = pAttempt(s, check.word, 'situation', pWord(id).es, correct, s.checkpointHint, s.session)
    update(v => pAppend(v, attempt))
    setFeedback({ correct, text: correct ? `Your neighbour understands. ${pWord(id).es} fits here.` : `That means “${pWord(id).en}”. Think about what you want to communicate, then try again.` })
  }
  return <div className="space-y-5">
    <p className={pSmall}>Cabin checkpoint / {s.checkpoint + 1} of 4</p>
    <div className="flex items-center gap-4 rounded-2xl bg-[#e6ece2] p-4"><Avatar c={s.character} size={70} /><p className="text-sm font-semibold">Your first conversation. Only the expressions you’ve just met.</p></div>
    {check.speech && <p lang="es" className="text-3xl font-black text-[#17695c]">{check.speech}</p>}
    <p className="text-lg font-bold">{check.prompt}</p>
    <div className="space-y-3">{check.options.map(id => <button key={id} className={`${pGhost} w-full py-4 text-lg`} disabled={!!feedback} onClick={() => submit(id)} lang="es">{pWord(id).es}</button>)}</div>
    {feedback && <div role="status" className="space-y-3 rounded-2xl bg-[#e6ece2] p-4"><p>{feedback.text}</p><button className={pButton} onClick={() => {
      if (!feedback.correct) { lock.current = false; setFeedback(null); return }
      if (advanced.current) return
      advanced.current = true
      if (s.checkpoint < 3) update(v => ({ ...v, checkpoint: v.checkpoint + 1, checkpointHint: false }))
      else update(v => ({ ...v, view: 'landed', awards: [...new Set([...v.awards, 'plane-opening'])] }))
    }}>{feedback.correct ? s.checkpoint < 3 ? 'Continue conversation' : 'Ready to land' : 'Try again'}<ArrowRight size={16} /></button></div>}
    {!feedback && <button className={pGhost} onClick={() => update(v => ({ ...v, checkpointHint: true }))}><Lightbulb size={16} /> English support</button>}
    {s.checkpointHint && <p className="rounded-xl bg-[#fff0cb] p-4 text-sm">{check.options.map(id => `${pWord(id).es} = ${pWord(id).en}`).join(' · ')}<br />Support is recorded, never punished.</p>}
  </div>
}

function PocketNotebook({ s, update, onClose }: { s: PocketSave; update: (fn: (v: PocketSave) => PocketSave) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'words' | 'practice' | 'history'>('words')
  const [selected, setSelected] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [position, setPosition] = useState(0)
  const [session, setSession] = useState('')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null)
  const [assisted, setAssisted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [filter, setFilter] = useState<'all' | 'recall'>('all')
  const lock = useRef(false)
  const current = queue[position] ? pWord(queue[position]!) : null
  const wordAttempts = s.attempts.filter(a => !selected || a.word === selected)
  const days = [...new Set(wordAttempts.filter(a => filter === 'all' || a.mode === 'recall').map(a => a.day))].sort().reverse()
  function start(weak: boolean) {
    let ids = pShuffle(s.collected)
    if (weak) ids.sort((a, b) => {
      const score = (id: string) => {
        const logs = s.attempts.filter(x => x.word === id && x.mode === 'recall')
        const last = logs[logs.length - 1]
        if (!last) return -1
        return last.correct && !last.assisted ? Date.parse(last.at) : 0
      }
      return score(a) - score(b)
    })
    setQueue(ids); setPosition(0); setSession(pUid()); setFeedback(null); setAnswer('')
    setAssisted(false); setFinished(false); lock.current = false; setTab('practice')
  }
  function submit(reveal = false) {
    if (!current || lock.current || (!reveal && !answer.trim())) return
    lock.current = true
    const correct = !reveal && current.accepts.some(x => pEnglish(x) === pEnglish(answer))
    const attempt = pAttempt(s, current.id, 'recall', reveal ? '[answer revealed]' : answer.slice(0, 500), correct, assisted || reveal, session)
    update(v => pAppend(v, attempt))
    setFeedback({ correct, text: reveal ? `${current.es} means “${current.en}”. This was supported practice, not independent recall.` :
      correct ? 'Meaning recalled. Your dated attempt has been recorded.' : `Not matched by our answer list. You wrote “${answer}”. Check the meaning or try another wording; this is not a judgement of your overall Spanish.` })
    if (reveal) setAssisted(true)
  }
  return <div data-pocket-modal role="dialog" aria-modal="true" aria-label="Pocket notebook" className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4f1e5] text-[#203e35]">
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-8">
      <div className="flex items-center justify-between gap-3"><div><p className={pSmall}>Your pocket companion</p><h2 className="mt-1 text-2xl font-black">The notebook</h2></div><button onClick={onClose} className={pGhost} aria-label="Close notebook"><X size={18} /> Close</button></div>
      <div className="my-5 grid grid-cols-3 gap-2">{(['words', 'practice', 'history'] as const).map(t => <button key={t} className={`${pGhost} ${tab === t ? '!bg-[#17695c] !text-white' : ''}`} onClick={() => { if (t === 'words' && current && !finished) setAssisted(true); setTab(t); if (t === 'practice' && !queue.length) start(false) }}>{t === 'words' ? 'Collection' : t === 'practice' ? 'Shuffle' : 'Evidence'}</button>)}</div>
      {tab === 'words' && <div className="space-y-4">
        <p className="text-sm text-[#587167]">{s.collected.length} expressions collected. Collected means encountered and matched, not mastered. These are additional survival phrases, not audited Language Transfer lesson coverage.</p>
        {!s.collected.length && <div className="rounded-2xl border border-dashed border-[#acbdb2] p-6"><BookOpen className="mb-3" /><p>Finish a matching pair on your phone to add your first entry.</p></div>}
        {s.collected.map(id => {
          const w = pWord(id)
          const logs = s.attempts.filter(a => a.word === id)
          const recalls = logs.filter(a => a.mode === 'recall')
          const latest = recalls[recalls.length - 1]
          const previous = latest ? recalls.filter(a => a.session !== latest.session).slice(-1)[0] : undefined
          const gap = latest && previous ? Math.max(0, Math.round((Date.parse(latest.day) - Date.parse(previous.day)) / 86400000)) : 0
          return <article key={id} className="rounded-2xl border border-[#d5dcd1] bg-white/80 p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 lang="es" className="text-2xl font-black text-[#17695c]">{w.es}</h3><p className="mt-1 font-semibold">{w.en}</p></div><PocketSound text={w.es} /></div>
            <p className="mt-3 text-sm text-[#587167]">{w.note}</p>
            <p className="mt-3 text-xs font-bold">{logs.length} recorded attempts · {recalls.length} typed-recall attempts</p>
            <p className="mt-1 text-sm">{latest ? latest.correct && !latest.assisted ? `Last recall: correct on attempt ${latest.number}, without a reveal.${gap ? ` ${gap} days since the previous encounter.` : ''}` : 'Last recall: needs another supported look.' : 'Typed recall not checked yet.'}</p>
            <button className={`${pGhost} mt-3`} onClick={() => { setSelected(id); setTab('history') }}>See dated evidence <ArrowRight size={14} /></button>
          </article>
        })}
      </div>}
      {tab === 'practice' && <div className="space-y-5">
        <div><h3 className="text-xl font-black">What stayed with you?</h3><p className="mt-2 text-sm text-[#587167]">Read the Spanish. Type the English meaning. Untimed, with common alternative answers accepted.</p></div>
        <div className="flex flex-wrap gap-2"><button className={pGhost} disabled={!s.collected.length} onClick={() => start(false)}><Shuffle size={16} /> Random shuffle</button><button className={pGhost} disabled={!s.collected.length} onClick={() => start(true)}>Practise what I need</button></div>
        {!s.collected.length && <p>Collect an expression in the opening to start.</p>}
        {finished && <div className="rounded-2xl bg-[#e2eddf] p-5"><h4 className="text-xl font-black">Round recorded.</h4><p className="mt-2">Take a break, return to the adventure, or shuffle again. Coming back on another day gives different evidence from repeating immediately.</p></div>}
        {current && !finished && <div className="space-y-4 rounded-3xl border border-[#ced8ca] bg-white p-5">
          <p className={pSmall}>Recall / {position + 1} of {queue.length}</p>
          <p lang="es" className="text-3xl font-black text-[#17695c]">{current.es}</p>
          <form onSubmit={e => { e.preventDefault(); submit() }} className="space-y-3">
            <label htmlFor="pocket-answer" className="block text-sm font-bold">English meaning</label>
            <input id="pocket-answer" autoComplete="off" autoCorrect="off" value={answer} maxLength={500} disabled={!!feedback} onChange={e => setAnswer(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-[#ccd9cd] bg-[#fafbf6] p-3 text-lg outline-none focus:border-[#17695c]" placeholder="Type what it means…" />
            <button type="submit" className={pButton} disabled={!answer.trim() || !!feedback}>Check meaning <Check size={17} /></button>
          </form>
          {!feedback && <button className={pGhost} onClick={() => submit(true)}><Lightbulb size={16} /> Reveal meaning</button>}
          {feedback && <div role="status" className="space-y-3 border-t border-[#d5dfd2] pt-4"><p>{feedback.text}</p>
            {!feedback.correct && !assisted && <div className="flex flex-wrap gap-2"><button className={pGhost} onClick={() => { lock.current = false; setFeedback(null) }}>Try another answer</button><button className={pGhost} onClick={() => { lock.current = false; submit(true) }}>Show answer</button></div>}
            {(feedback.correct || assisted) && <button className={pButton} onClick={() => {
              if (position + 1 >= queue.length) setFinished(true)
              else setPosition(p => p + 1)
              setAnswer(''); setFeedback(null); setAssisted(false); lock.current = false
            }}>Next expression <ArrowRight size={16} /></button>}
          </div>}
        </div>}
        <p className="text-xs text-[#587167]">“Practise what I need” prioritises untested or recently unsuccessful recall, then older successful recall. It is an initial review selector, not a validated mastery score.</p>
      </div>}
      {tab === 'history' && <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2"><label htmlFor="pocket-filter" className="text-sm font-bold">Expression</label><select id="pocket-filter" value={selected ?? ''} onChange={e => setSelected(e.target.value || null)} className="max-w-full rounded-xl border bg-white p-3"><option value="">All expressions</option>{s.collected.map(id => <option key={id} value={id}>{pWord(id).es}</option>)}</select><button className={pGhost} onClick={() => setFilter(f => f === 'all' ? 'recall' : 'all')}>{filter === 'all' ? 'Show typed recall only' : 'Show all modes'}</button></div>
        <p className="text-sm text-[#587167]">Dates use your device’s local calendar. Matching, typed meaning recall and situational choices are separate. No speaking or pronunciation assessment is claimed.</p>
        {!days.length && <p className="rounded-xl bg-white p-5">No attempts recorded for this filter yet.</p>}
        {days.map(day => {
          const logs = wordAttempts.filter(a => a.day === day && (filter === 'all' || a.mode === 'recall'))
          const first = logs.filter(a => a.number === 1 && a.correct && !a.assisted).length
          return <section key={day} className="rounded-2xl bg-white p-5"><h3 className="font-black">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</h3><p className="mt-1 text-sm">{logs.length} attempts · {logs.filter(a => a.correct).length} correct · {first} first-attempt, unassisted successes</p>
            <div className="mt-4 space-y-3">{logs.slice().reverse().map(a => <div key={a.id} className="border-t border-[#edf0e8] pt-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{pWord(a.word).es}</b><span>{a.correct ? 'Correct' : 'Not matched'}{a.assisted ? ' · supported' : ''}</span></div><p className="text-[#587167]">{a.mode === 'recall' ? 'Spanish → typed English' : a.mode === 'match' ? 'Pair matching' : 'Situational choice'} · attempt {a.number} in this encounter</p><p className="mt-1 break-words">Your response: {a.response}</p></div>)}</div>
          </section>
        })}
      </div>}
      <p className="mt-6 border-t border-[#d2dbce] pt-4 text-xs text-[#587167]">Audio uses an available Spanish device voice. Availability and offline playback depend on your device; no course audio is bundled.</p>
    </div>
  </div>
}

export function RutaGame() {
  const [s, setS] = useState<PocketSave | null>(null)
  const [notice, setNotice] = useState('')
  const [notebook, setNotebook] = useState(false)
  const [editing, setEditing] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [zooming, setZooming] = useState(false)
  const [backup, setBackup] = useState(false)
  const [backupText, setBackupText] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const advanceGuard = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(POCKET_KEY)
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw)
          if (pValid(parsed)) { setS(parsed); return }
        } catch { /* Preserve unreadable content until an explicit reset. */ }
        setNotice('Your pocket save could not be read. The stored copy is unchanged until you choose “Start a fresh pocket save” in Backup.')
        setBackup(true); setS(pFresh()); return
      }
      const fresh = pFresh()
      const oldRaw = window.localStorage.getItem(SAVE_KEY)
      if (oldRaw) {
        try {
          const old = JSON.parse(oldRaw) as { character?: Character }
          const candidate = { ...fresh, character: old.character ?? fresh.character }
          if (pValid(candidate)) { setS(candidate); return }
        } catch { /* Earlier saves remain untouched. */ }
      }
      setS(fresh)
    } catch { setNotice('Storage is unavailable. You can play, but progress will only last for this visit. Use Backup to copy it.'); setS(pFresh()) }
  }, [])
  const update = useCallback((fn: (v: PocketSave) => PocketSave) => {
    setS(current => current ? fn(current) : current)
  }, [])
  useEffect(() => {
    if (!s || notice.startsWith('Your pocket save')) return
    try { window.localStorage.setItem(POCKET_KEY, JSON.stringify(s)) }
    catch { setNotice('Storage is unavailable or full. Progress is in memory only. Use Backup before leaving.'); }
  }, [s, notice])
  useEffect(() => () => { if (zoomTimer.current) clearTimeout(zoomTimer.current) }, [])
  useEffect(() => {
    if (!s) return
    const target = window as Window & { render_game_to_text?: () => string }
    const previous = target.render_game_to_text
    target.render_game_to_text = () => JSON.stringify({ mode: s.view, group: s.group, card: s.card,
      collected: s.collected, matched: s.matched, checkpoint: s.checkpoint, notebook, legacy,
      attempts: s.attempts.length, coordinateSystem: 'DOM interface; cabin art origin is top-left' })
    return () => { if (previous) target.render_game_to_text = previous; else delete target.render_game_to_text }
  }, [s, notebook, legacy])
  useEffect(() => {
    if (!notebook && !backup) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>('[data-pocket-modal]')
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select') ?? [])].filter(el => el.offsetParent !== null)
    focusable()[0]?.focus()
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { setNotebook(false); setBackup(false) }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [notebook, backup])
  if (!s) return <div className="flex min-h-96 items-center justify-center bg-[#f4f1e5] text-[#234438]">Opening your travel journal…</div>
  const group = POCKET_GROUPS[s.group]!
  const cardIds = group.cards[s.card]!
  function openPhone() {
    if (zoomTimer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { update(v => ({ ...v, view: 'phone' })); return }
    setZooming(true)
    zoomTimer.current = setTimeout(() => { update(v => ({ ...v, view: 'phone' })); setZooming(false); zoomTimer.current = null }, 500)
  }
  function importText(text: string) {
    try {
      if (text.length > 30000000) throw new Error('This backup is too large.')
      const parsed: unknown = JSON.parse(text)
      if (!pValid(parsed)) throw new Error('This is not a valid Ruta pocket backup. Nothing was replaced.')
      setS(parsed); setNotice('Backup restored.'); setBackup(false)
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Import failed. Nothing was replaced.') }
  }
  const header = <header className="flex items-center justify-between gap-2 border-b border-[#d5dfd5] bg-[#f7f5ec] px-4 py-3">
    <button className="flex min-h-11 items-center gap-2 text-lg font-black" onClick={() => { setLegacy(false); update(v => ({ ...v, view: v.awards.includes('plane-opening') ? 'landed' : 'cabin' })) }} aria-label="Return to cabin"><Plane size={20} className="text-[#17695c]" /> Ruta <span className="hidden text-xs font-bold tracking-widest text-[#6d7e71] sm:inline">ROAD TO FLUENT</span></button>
    <div className="flex gap-2"><button className={pGhost} onClick={() => setBackup(true)} aria-label="Backup progress"><Download size={17} /><span className="hidden sm:inline">Backup</span></button><button className={pGhost} onClick={() => {
      if (s.view === 'match' || s.view === 'checkpoint') update(v => ({ ...v, lookups: [...new Set([...(v.lookups ?? []), v.session])], checkpointHint: v.view === 'checkpoint' ? true : v.checkpointHint }))
      setNotebook(true)
    }}><BookOpen size={17} /> Notebook <span className="rounded-full bg-[#e1eadc] px-2 text-xs">{s.collected.length}</span></button></div>
  </header>
  return <div className="min-h-dvh bg-[#f4f1e5] text-[#203e35]" style={{ fontFamily: "'Nunito', ui-rounded, system-ui, sans-serif", paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}>
    <style>{`
      .pocket-phone-enter{animation:pocket-enter .5s cubic-bezier(.2,.8,.2,1) both}
      .pocket-shuffle button:nth-of-type(odd){animation:pocket-mix .65s ease both}
      .pocket-shuffle button:nth-of-type(even){animation:pocket-mix .65s ease reverse both}
      @keyframes pocket-enter{from{transform:scale(.82) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      @keyframes pocket-mix{0%{transform:translate(0,0)}40%{transform:translate(12px,9px) rotate(4deg)}75%{transform:translate(-10px,-6px) rotate(-3deg)}100%{transform:translate(0,0)}}
      @media(prefers-reduced-motion:reduce){.pocket-phone-enter,.pocket-shuffle button{animation:none!important}}
    `}</style>
    <div aria-hidden={notebook || backup}>
    {header}
    {notice && <p role="status" className="mx-auto max-w-3xl px-4 py-3 text-sm text-[#75591e]">{notice}</p>}
    {legacy ? <><div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 p-4"><p className="text-sm">Earlier Madrid / Toledo prototype. Separate progress; not the redesigned opening.</p><button className={pGhost} onClick={() => setLegacy(false)}><ArrowLeft size={16} /> New opening</button></div><RutaPrototype /></> :
      editing ? <div className="bg-slate-950 text-slate-100"><CharacterEditor initial={s.character} hasExisting onDone={c => { update(v => ({ ...v, character: { ...c, name: c.name.trim().slice(0, 80) } })); setEditing(false) }} onCancel={() => setEditing(false)} /></div> :
      (s.view === 'cabin' || s.view === 'landed') ? <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-5 flex items-center justify-between"><p className={pSmall}>Chapter 00 / Before you land</p><button className={pGhost} onClick={() => setEditing(true)}><User size={16} /> {s.character.name}</button></div>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] border-4 border-[#fbfcf1] bg-[#cbded3] shadow-lg"><div className={`aspect-[6/5] origin-[62%_67%] transition-transform duration-500 motion-reduce:transition-none sm:aspect-[12/7] ${zooming ? 'scale-[2.4]' : ''}`}><PocketCabin character={s.character} /></div><div className="absolute left-4 top-4 rounded-full bg-[#f7f5e8]/95 px-3 py-2 text-xs font-bold tracking-wide">SEAT 14A · MADRID BOUND</div></div>
          <div className="space-y-5">
            <div><p className={pSmall}>{s.view === 'landed' ? 'Touchdown / Chapter complete' : 'Somewhere above Spain'}</p><h1 className="mt-2 text-4xl font-black leading-tight">{s.view === 'landed' ? 'A little less lost.' : 'Your adventure starts before you land.'}</h1></div>
            <div className="rounded-2xl border border-[#d5dfd2] bg-white/70 p-4"><p className={pSmall}>Cabin crew</p><p lang="es" className="mt-2 text-2xl font-black text-[#17695c]">Bienvenidos a España.</p><div className="mt-3 flex flex-wrap items-center gap-2"><PocketSound text="Bienvenidos a España" /><button className={pGhost} onClick={() => setShowWelcome(x => !x)}>{showWelcome ? 'Hide English' : 'Reveal English'}</button></div>{showWelcome && <p className="mt-3 text-sm">Welcome to Spain. This announcement is supported exposure, not a tested notebook entry.</p>}</div>
            <p className="text-[#587167]">{s.view === 'landed' ? 'You matched eleven expressions and used familiar phrases in a cabin conversation. That’s a first step, not a fluency claim. Your notebook will help you see what you remember later.' : 'The window. The clouds. A country you haven’t met yet. Open the Spanish app on your phone and get a few useful words in your pocket.'}</p>
            <button className={`${pButton} w-full`} onClick={s.view === 'landed' ? () => setNotebook(true) : openPhone}>{s.view === 'landed' ? <BookOpen size={20} /> : <Smartphone size={20} />}{s.view === 'landed' ? 'Open my notebook' : 'Open your phone'}<ArrowRight size={18} /></button>
            {s.view === 'landed' && <p className="rounded-xl bg-[#e4eadc] p-4 text-sm"><b>Next: Madrid Airport.</b> The redesigned airport level is our next build. It isn’t playable yet.</p>}
            <div className="flex flex-wrap gap-2"><button className={pGhost} onClick={() => setLegacy(true)}>Earlier chapters</button>{s.view === 'landed' && <button className={pGhost} onClick={() => update(v => ({ ...v, view: 'phone', group: 0, card: 0, matched: [], checkpoint: 0, checkpointHint: false, session: pUid() }))}><RotateCcw size={16} /> Replay opening</button>}</div>
            <p className="text-xs text-[#6a7d6c]">Untimed learning · Saved on this device · Audio is optional</p>
          </div>
        </div>
      </main> : <main className="pocket-phone-enter mx-auto my-6 max-w-lg px-3 sm:my-10">
        <div className="overflow-hidden rounded-[2.25rem] border-[6px] border-[#243c36] bg-[#fbfbf2] shadow-xl">
          <div className="flex items-center justify-between bg-[#243c36] px-4 pb-3 pt-2 text-xs font-bold text-[#edf4e8]"><span>14:08</span><span className="rounded-full bg-[#0e211c] px-8 py-1 text-xs">RUTA POCKET</span><Plane size={14} /></div>
          <div className="flex items-center justify-between border-b border-[#dce4d6] px-5 py-3"><button className="flex min-h-11 items-center gap-1 text-sm font-bold text-[#587167]" onClick={() => update(v => ({ ...v, view: 'cabin' }))}><ArrowLeft size={16} /> Cabin</button><span className={pSmall}>Offline edition</span><Headphones size={18} className="text-[#17695c]" /></div>
          <div className="p-5 sm:p-7">
            {s.view === 'phone' && <div className="space-y-6"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5b650] text-[#263f33]"><BookOpen size={32} /></div><div><p className={pSmall}>Your first pocket lesson</p><h1 className="mt-3 text-3xl font-black">A little Spanish.<br />A good beginning.</h1><p className="mt-4 text-[#587167]">Meet the expressions one at a time. Match their meanings. Then try a small cabin conversation.</p></div><button className={`${pButton} w-full`} onClick={() => update(v => ({ ...v, view: 'teach' }))}>Basics <ArrowRight size={18} /></button><p className="text-sm text-[#587167]">10 introduction cards · 11 expressions (sí and no are tracked separately) · no countdown</p></div>}
            {s.view === 'teach' && <div className="space-y-5" key={`${s.group}-${s.card}`}>
              <div><p className={pSmall}>Set {s.group + 1} / 3 · Card {s.card + 1} / {group.cards.length}</p><h2 className="mt-2 text-2xl font-black">{group.title}</h2><p className="mt-1 text-sm text-[#587167]">{group.subtitle}</p></div>
              {cardIds.map(id => { const w = pWord(id); return <div key={id} className="rounded-2xl border border-[#cfdbce] bg-white p-5"><p className={pSmall}>Español</p><h3 lang="es" className="mt-3 break-words text-3xl font-black text-[#17695c]">{w.es}</h3><p className="mt-2 text-xl font-bold">{w.en}</p><p className="my-4 text-sm text-[#587167]">{w.note}</p><PocketSound text={w.es} /></div> })}
              <div className="flex gap-2">{s.card > 0 && <button className={pGhost} onClick={() => update(v => ({ ...v, card: Math.max(0, v.card - 1) }))}>Previous</button>}<button className={`${pButton} flex-1`} onClick={() => {
                if (Date.now() - advanceGuard.current < 300) return
                advanceGuard.current = Date.now()
                update(v => ({ ...v, seen: [...new Set([...v.seen, ...cardIds])], ...(v.card + 1 < group.cards.length ? { card: v.card + 1 } : { view: 'match' as const }) }))
              }}>{s.card + 1 < group.cards.length ? 'Next expression' : 'Shuffle & match'}<ArrowRight size={17} /></button></div>
              <p className="text-xs text-[#587167]">These are supported survival phrases. Later levels will build the grammar behind them.</p>
            </div>}
            {s.view === 'match' && <PocketMatch key={`match-${s.group}-${s.session}`} s={s} update={update} />}
            {s.view === 'checkpoint' && <PocketCheckpoint key={`check-${s.checkpoint}-${s.session}`} s={s} update={update} />}
          </div>
          <div className="mx-auto mb-3 mt-2 h-1 w-24 rounded-full bg-[#c9d3c6]" />
        </div>
      </main>}
    </div>
    {notebook && <PocketNotebook s={s} update={update} onClose={() => setNotebook(false)} />}
    {backup && <div data-pocket-modal role="dialog" aria-modal="true" aria-label="Pocket backup" className="fixed inset-0 z-[80] overflow-y-auto bg-[#f4f1e5] px-4 pb-24 pt-6 text-[#203e35]"><div className="mx-auto max-w-lg space-y-5"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">Pocket backup</h2><button className={pGhost} onClick={() => setBackup(false)}><X size={18} /> Close</button></div><p className="text-sm">This backup contains your new opening, character and notebook history. Earlier prototype progress stays in its separate existing save. Nothing is uploaded.</p><button className={pButton} onClick={() => setBackupText(JSON.stringify(s, null, 2))}><Download size={17} /> Show backup JSON</button><label className="block text-sm font-bold" htmlFor="pocket-json">Copy this to a text file, or paste a pocket backup to restore.</label><textarea id="pocket-json" value={backupText} onChange={e => setBackupText(e.target.value)} rows={8} className="w-full rounded-xl border border-[#c5d2c5] bg-white p-3 font-mono text-xs" /><div className="flex flex-wrap gap-2"><button className={pGhost} disabled={!backupText.trim()} onClick={() => importText(backupText)}><Upload size={16} /> Restore pasted backup</button><button className={pGhost} onClick={() => fileInput.current?.click()}>Choose JSON file</button></div><input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (file) { try { importText(await file.text()) } catch { setNotice('Could not read the file. Nothing was replaced.') } } e.target.value = '' }} />{notice && <p role="status" className="rounded-xl bg-[#ffedcf] p-3 text-sm">{notice}</p>}<div className="border-t border-[#c8d4c6] pt-5"><button className={pGhost} onClick={() => setResetConfirm(true)}><RotateCcw size={16} /> Start a fresh pocket save</button>{resetConfirm && <div className="mt-4 space-y-3 rounded-xl bg-[#ffedcf] p-4"><p>This erases the new opening and notebook on this device. Earlier prototype saves are untouched. Back up first.</p><button className={pButton} onClick={() => { setS(pFresh()); setNotice(''); setResetConfirm(false); setBackup(false) }}>Erase pocket progress</button><button className={`${pGhost} ml-2`} onClick={() => setResetConfirm(false)}>Cancel</button></div>}</div></div></div>}
  </div>
}

export default RutaGame
