import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { Card } from "@/components/app/AppShell";
import { goalsQuery } from "@/lib/goals";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { kids, nextMove, pct } from "@/lib/campaign";
import { cadenceOf, Leaf, type G } from "@/components/app/GoalCampaign";

/** Today: each goal's next move plus any daily/weekly repeating steps. */
export function GoalFocus() {
  const qc = useQueryClient();
  const { data } = useQuery(goalsQuery);
  const all = ((data ?? []) as G[]).filter((g) => g.horizon === "campaign");
  const roots = kids(all, null);
  if (!roots.length) return null;
  const rootOf = (g: G): G => { let c = g; while (c.parent_id) { const p = all.find((x) => x.id === c.parent_id); if (!p) break; c = p; } return c; };
  const isLeaf = (g: G) => !kids(all, g.id).length && g.parent_id;
  const items = new Map<string, G>();
  all.filter((g) => isLeaf(g) && cadenceOf(g) !== "Once" && cadenceOf(g) !== "Monthly" && pct(g, all) < 100).forEach((g) => items.set(g.id, g));
  roots.forEach((r) => { const n = nextMove(r, all); if (n && n.id !== r.id) items.set(n.id, n); });
  const inv = () => qc.invalidateQueries({ queryKey: ["goals"] });
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-extrabold"><Target className="h-4 w-4" /> Goal moves today</p>
        <Link to="/inner" className="text-xs font-bold text-muted-foreground">All goals →</Link>
      </div>
      <div className="space-y-2">
        {[...items.values()].map((g) => { const r = rootOf(g); return <Leaf key={g.id} g={g} tone={PILLARS[r.pillar as Pillar] ?? PILLARS.life} inv={inv} context={r.title} />; })}
        {!items.size && <p className="text-sm font-bold text-muted-foreground">All goals up to date ★</p>}
      </div>
    </Card>
  );
}
