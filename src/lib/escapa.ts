// ¡Escapa! — level data. Each level maps to a chunk of the Language Transfer course.

export type EscapaQuestion = { q: string; options: string[]; answer: string; rule: string };
export type EscapaRoom = { map: string[]; guardRows: number[] };
export type EscapaLevel = {
  name: string;
  lessons: string;
  mode: "corridor" | "chase";
  seconds: number;
  guardMs: number; // starting guard step speed (lower = faster)
  rooms: EscapaRoom[];
  questions: EscapaQuestion[];
};

export const COLS = 9;
export const ROWS = 11;
export const DOOR_COLS = [1, 4, 7];
export const START_LIVES = 3;

const CELL_ROOMS: EscapaRoom[] = [
  { guardRows: [7], map: ["#D##D##D#", "#.......#", "#.##.##.#", "#.......#", "###.#.###", "#.......#", "#.#.#.#.#", "#.......#", "##.###.##", "#...S...#", "#########"] },
  { guardRows: [6], map: ["#D##D##D#", "#.......#", "#.#...#.#", "#.#.#.#.#", "#...#...#", "##.###.##", "#.......#", "#.##.##.#", "#.......#", "#...S...#", "#########"] },
  { guardRows: [5], map: ["#D##D##D#", "#.......#", "##.#.#.##", "#..#.#..#", "#.##.##.#", "#.......#", "###.#.###", "#...#...#", "#.#...#.#", "#...S...#", "#########"] },
];

const CORRIDOR_ROOMS: EscapaRoom[] = [
  { guardRows: [3, 7], map: ["#D##D##D#", "#.......#", "#.#.#.#.#", "#.......#", "#.##.##.#", "#..#.#..#", "##.#.#.##", "#.......#", "#.##.##.#", "#...S...#", "#########"] },
  { guardRows: [3, 7], map: ["#D##D##D#", "#.......#", "##.##.#.#", "#.......#", "#.#.#.#.#", "#...#...#", "###...###", "#.......#", "#.#.#.#.#", "#...S...#", "#########"] },
  { guardRows: [1, 5], map: ["#D##D##D#", "#.......#", "#.#.#.#.#", "#.#...#.#", "#.#.#.#.#", "#.......#", "##.#.#.##", "#..#.#..#", "#.##.##.#", "#...S...#", "#########"] },
];

const LEVEL_1: EscapaQuestion[] = [
  { q: "Say “normal” in Spanish", options: ["normal", "normalo", "normale"], answer: "normal", rule: "-al words stay the same. Stress moves to the end: norMAL." },
  { q: "“It is not normal”", options: ["No es normal", "Es no normal", "No normal es"], answer: "No es normal", rule: "no always goes before the verb." },
  { q: "Say “important”", options: ["importante", "importanto", "importamente"], answer: "importante", rule: "-ant / -ent → add -e." },
  { q: "Say “different”", options: ["diferenta", "diferente", "diferento"], answer: "diferente", rule: "-ent → -ente." },
  { q: "Say “normally”", options: ["normalamente", "normalente", "normalmente"], answer: "normalmente", rule: "-ly → -mente." },
  { q: "Say “legally”", options: ["legalmente", "legalimente", "legalmento"], answer: "legalmente", rule: "-ly → -mente. legal → legalmente." },
  { q: "Say “possible”", options: ["posiblo", "posible", "posibla"], answer: "posible", rule: "-ible stays. Stress second from the end: poSIble." },
  { q: "Say “generally”", options: ["generalamente", "generalmenta", "generalmente"], answer: "generalmente", rule: "The English /j/ sound becomes the Spanish /kh/ sound." },
  { q: "“It is not probable”", options: ["Es no probable", "No es probable", "No es probablemente"], answer: "No es probable", rule: "no + es. -able stays the same." },
  { q: "Guess “verb” in Spanish", options: ["verbo", "verbe", "verbas"], answer: "verbo", rule: "To guess a word, try adding -o, -e or -a." },
];

const LEVEL_2: EscapaQuestion[] = [
  { q: "Say “organisation”", options: ["organización", "organisación", "organizasión"], answer: "organización", rule: "-tion → -ción." },
  { q: "Say “nation”", options: ["natión", "nación", "nasión"], answer: "nación", rule: "-tion → -ción. Stress on the end: naCIÓN." },
  { q: "Say “opinion”", options: ["opiniona", "opinón", "opinión"], answer: "opinión", rule: "-ion words keep their spelling. Stress goes on the last syllable." },
  { q: "Say “passion”", options: ["pasión", "pasiona", "pashión"], answer: "pasión", rule: "-ion words: same word, stress on the end: paSIÓN." },
  { q: "Make a verb: preparación →", options: ["preparacionar", "preparar", "preparer"], answer: "preparar", rule: "Drop -ción, add -r: preparación → preparar." },
  { q: "Make a verb: organización →", options: ["organizar", "organizacionar", "organizer"], answer: "organizar", rule: "Drop -ción, add -r: organización → organizar." },
  { q: "Make a verb: celebración →", options: ["celebrer", "celebracionar", "celebrar"], answer: "celebrar", rule: "Always take the -ación route: celebración → celebrar." },
  { q: "Say “I want”", options: ["quiero", "quero", "quierer"], answer: "quiero", rule: "quiero = I want." },
  { q: "“I don't want to prepare”", options: ["Quiero no preparar", "No quiero preparar", "No preparar quiero"], answer: "No quiero preparar", rule: "no goes before the verb: no quiero." },
  { q: "“I want to prepare myself”", options: ["Quiero me preparar", "Quiero preparme", "Quiero prepararme"], answer: "Quiero prepararme", rule: "me sticks to the end of the 'to' form: prepararme." },
  { q: "“I want to organise”", options: ["Quiero organizar", "Quiero organización", "Quiero organizo"], answer: "Quiero organizar", rule: "quiero + the 'to' form (-ar)." },
];

export const LEVELS: EscapaLevel[] = [
  { name: "The Cell Block", lessons: "Lessons 1–3", mode: "corridor", seconds: 105, guardMs: 480, rooms: CELL_ROOMS, questions: LEVEL_1 },
  { name: "The Yard Chase", lessons: "Lesson 4", mode: "chase", seconds: 90, guardMs: 400, rooms: CORRIDOR_ROOMS, questions: LEVEL_2 },
];

export type EscapaProgress = { unlocked: number; best: Record<number, { time: number; lives: number }> };
const KEY = "escapa-progress";
export function loadProgress(): EscapaProgress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as EscapaProgress;
  } catch { /* ignore */ }
  return { unlocked: 0, best: {} };
}
export function saveProgress(p: EscapaProgress) {
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
