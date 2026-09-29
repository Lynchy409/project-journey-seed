export type Pillar = "trading" | "fitness" | "learning" | "life";

export const PILLARS: Record<Pillar, { label: string; text: string; bg: string; soft: string }> = {
  trading: { label: "Trading", text: "text-trading", bg: "bg-trading", soft: "bg-trading-soft" },
  fitness: { label: "Fitness", text: "text-fitness", bg: "bg-fitness", soft: "bg-fitness-soft" },
  learning: { label: "Learning", text: "text-learning", bg: "bg-learning", soft: "bg-learning-soft" },
  life: { label: "Life", text: "text-life", bg: "bg-life", soft: "bg-life-soft" },
};
