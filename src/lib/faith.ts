export type Verse = { ref: string; text: string; takeaway: string; theme: string };

/** Curated scripture (WEB, public domain). Rotates one per day. */
export const VERSES: Verse[] = [
  { ref: "Matthew 6:34", theme: "Peace", text: "Therefore don't be anxious for tomorrow, for tomorrow will be anxious for itself. Each day's own evil is sufficient.", takeaway: "Win today. Tomorrow's trade, game and shift can wait." },
  { ref: "Proverbs 3:5-6", theme: "Trust", text: "Trust in the Lord with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.", takeaway: "Do the work, then let go of what you can't control." },
  { ref: "Philippians 4:13", theme: "Strength", text: "I can do all things through Christ, who strengthens me.", takeaway: "When it gets hard, you're not doing it alone." },
  { ref: "Joshua 1:9", theme: "Courage", text: "Be strong and courageous. Don't be afraid. Don't be dismayed, for the Lord your God is with you wherever you go.", takeaway: "Back yourself. Walk into hard things." },
  { ref: "Matthew 7:24", theme: "Discipline", text: "Everyone therefore who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock.", takeaway: "Knowing isn't enough. Doing is the foundation." },
  { ref: "Proverbs 16:18", theme: "Humility", text: "Pride goes before destruction, and an arrogant spirit before a fall.", takeaway: "Ego is the most expensive trade you'll ever take." },
  { ref: "Galatians 6:9", theme: "Perseverance", text: "Let's not be weary in doing good, for we will reap in due season if we don't give up.", takeaway: "Results lag effort. Keep showing up." },
  { ref: "Isaiah 40:31", theme: "Strength", text: "But those who wait for the Lord will renew their strength. They will mount up with wings like eagles. They will run, and not be weary.", takeaway: "Rest and patience are part of strength." },
  { ref: "Psalm 46:10", theme: "Peace", text: "Be still, and know that I am God.", takeaway: "Stillness first. Then act." },
  { ref: "James 1:2-3", theme: "Perseverance", text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance.", takeaway: "Every setback is training." },
  { ref: "Mark 10:45", theme: "Humility", text: "For the Son of Man also came not to be served, but to serve, and to give his life as a ransom for many.", takeaway: "Serve someone today — family, team, a stranger." },
  { ref: "Proverbs 21:5", theme: "Discipline", text: "The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty.", takeaway: "Follow the plan. Haste is the enemy." },
  { ref: "2 Timothy 1:7", theme: "Courage", text: "For God didn't give us a spirit of fear, but of power, love, and self-control.", takeaway: "Fear isn't from Him. Self-control is." },
  { ref: "Ecclesiastes 9:10", theme: "Discipline", text: "Whatever your hand finds to do, do it with your might.", takeaway: "Full presence in whatever's in front of you." },
  { ref: "Psalm 90:12", theme: "Perspective", text: "So teach us to count our days, that we may gain a heart of wisdom.", takeaway: "Your days are counted. Spend this one well." },
  { ref: "Matthew 11:28", theme: "Peace", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest.", takeaway: "Carry less. Hand it over." },
];

export function verseOfDay(dateISO: string): Verse {
  const n = Math.floor(new Date(dateISO + "T00:00:00Z").getTime() / 86400000);
  return VERSES[((n % VERSES.length) + VERSES.length) % VERSES.length]!;
}

/** UK average life expectancy (ONS, male ~79, female ~83). */
export const LIFE_YEARS = 81;

export function lifeFlight(birthISO: string, now = new Date()) {
  const birth = new Date(birthISO + "T00:00:00");
  const end = new Date(birth);
  end.setFullYear(birth.getFullYear() + LIFE_YEARS);
  const lived = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  const total = Math.floor((end.getTime() - birth.getTime()) / 86400000);
  const ahead = Math.max(0, total - lived);
  const age = Math.floor(lived / 365.25);
  return { lived, ahead, total, age, pct: Math.min(100, (lived / total) * 100) };
}

export const OBJECTIVE_XP = [100, 150, 250] as const;
export const STREAK_XP = 20;
