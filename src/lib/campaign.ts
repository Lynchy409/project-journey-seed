export type Node = {
  id: string;
  parent_id: string | null;
  title: string;
  target_value: number | null;
  current_value: number;
  status: string;
  created_at: string;
};

export const kids = <T extends Node>(all: T[], id: string | null) =>
  all.filter((g) => g.parent_id === id && g.status !== "archived");

/** Progress 0-100: leaves use number target or done; parents average their children. */
export function pct<T extends Node>(n: T, all: T[]): number {
  const c = kids(all, n.id);
  if (c.length) return Math.round(c.reduce((s, k) => s + pct(k, all), 0) / c.length);
  if (n.status === "done") return 100;
  if (n.target_value && n.target_value > 0) return Math.min(100, Math.round((n.current_value / n.target_value) * 100));
  return 0;
}

/** First unfinished leaf, walking stages in order — the next move. */
export function nextMove<T extends Node>(n: T, all: T[]): T | null {
  const c = kids(all, n.id);
  if (!c.length) return pct(n, all) < 100 ? n : null;
  for (const k of c) { const m = nextMove(k, all); if (m) return m; }
  return null;
}

export function daysLeft(deadline: string | null, today = new Date()) {
  if (!deadline) return null;
  const d = new Date(deadline + "T00:00:00");
  const t = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
