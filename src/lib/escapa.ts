// ¡Escapa! — level data. Level 1 "The Cell Block" = Language Transfer lessons 1–3.

export type EscapaQuestion = { q: string; options: string[]; answer: string; rule: string };
export type EscapaRoom = { map: string[]; guardRow: number };

export const COLS = 9;
export const ROWS = 11;
export const DOOR_COLS = [1, 4, 7];

export const ROOMS: EscapaRoom[] = [
  {
    guardRow: 7,
    map: [
      "#D##D##D#",
      "#.......#",
      "#.##.##.#",
      "#.......#",
      "###.#.###",
      "#.......#",
      "#.#.#.#.#",
      "#.......#",
      "##.###.##",
      "#...S...#",
      "#########",
    ],
  },
  {
    guardRow: 6,
    map: [
      "#D##D##D#",
      "#.......#",
      "#.#...#.#",
      "#.#.#.#.#",
      "#...#...#",
      "##.###.##",
      "#.......#",
      "#.##.##.#",
      "#.......#",
      "#...S...#",
      "#########",
    ],
  },
  {
    guardRow: 5,
    map: [
      "#D##D##D#",
      "#.......#",
      "##.#.#.##",
      "#..#.#..#",
      "#.##.##.#",
      "#.......#",
      "###.#.###",
      "#...#...#",
      "#.#...#.#",
      "#...S...#",
      "#########",
    ],
  },
];

export const LEVEL_1: EscapaQuestion[] = [
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

export const START_LIVES = 3;
export const START_SECONDS = 120;
