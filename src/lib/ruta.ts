export type RutaLevel = { id: string; name: string; desc: string; x: number; y: number; requires?: string };
export type Traveller = { name: string; skin: string; shirt: string; cap: boolean };
export type RutaSave = { character: Traveller | null; xp: number; completed: string[] };

export const LEVELS: RutaLevel[] = [
  { id: "madrid", name: "Madrid Airport", desc: "You land. You understand nothing.", x: 45, y: 30 },
  { id: "signs", name: "Sign Runner", desc: "Spot the -al cognates.", x: 28, y: 58, requires: "madrid" },
  { id: "toledo", name: "Toledo", desc: "Recognise words and ask to enter.", x: 62, y: 78, requires: "signs" },
];

export const MADRID_DIALOGUE = [
  { who: "Assistant", es: "¡Hola! ¿Necesitas ayuda?", en: "Hello! Do you need help?" },
  { who: "You", es: "...", en: "(You cannot understand.)" },
  { who: "Assistant", es: "Tranquilo. Muchas palabras son iguales en inglés.", en: "Relax. Many words are the same in English." },
  { who: "Assistant", es: "Normal, legal, natural... ¡Ya sabes español!", en: "Normal, legal, natural... You already know Spanish!" },
];

export const SIGN_ROUNDS = [
  { en: "normal", options: ["normal", "normo", "normante"] },
  { en: "legal", options: ["legado", "legal", "legión"] },
  { en: "natural", options: ["naturo", "natura", "natural"] },
  { en: "cultural", options: ["cultural", "culto", "culturo"] },
  { en: "animal", options: ["animo", "animal", "animante"] },
];

export const TOLEDO = {
  question: 'A guard asks: "¿Qué quieres?" (What do you want?)',
  options: ["Quiero entrar", "Quiero moderno", "Entrar quiero no"],
  answer: "Quiero entrar",
  sign: "MUSEO MODERNO",
};

export const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524"];
export const SHIRTS = ["#e63946", "#2a9d8f", "#457b9d", "#f4a261"];

const KEY = "ruta-save";
export const FRESH: RutaSave = { character: null, xp: 0, completed: [] };
export function loadSave(): RutaSave {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...FRESH, ...JSON.parse(raw) } : FRESH;
  } catch {
    return FRESH;
  }
}
export function storeSave(s: RutaSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
