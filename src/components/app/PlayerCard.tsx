import { useQuery } from "@tanstack/react-query";
import { allDriverLogsQuery, levelFromXp, rankFor } from "@/lib/xp";
import { driverXp } from "@/lib/drivers";

export function useXp(date: string) {
  const { data } = useQuery(allDriverLogsQuery);
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + driverXp(r.driver_key, r.evidence), 0);
  const today = rows.filter((r) => r.date === date).reduce((s, r) => s + driverXp(r.driver_key, r.evidence), 0);
  return { total, today, ...levelFromXp(total) };
}

export function PlayerCard({ name, avatar, date, chips }: { name?: string | null | undefined; avatar?: string | null | undefined; date: string; chips?: React.ReactNode }) {
  const { level, into, needed, total, today } = useXp(date);
  const pct = Math.min(100, (into / needed) * 100);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-foreground p-4 text-background shadow-float">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-trading/30 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-x-1 -bottom-1 h-3 rounded-full bg-trading/60 blur-md" />
          {avatar ? (
            <img src={avatar} alt="" className="relative h-16 w-16 rounded-2xl object-cover ring-2 ring-trading" />
          ) : (
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-background/10 text-2xl font-extrabold ring-2 ring-trading">
              {(name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 rounded-lg bg-trading px-1.5 py-0.5 text-[11px] font-extrabold text-primary-foreground">
            {level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold uppercase tracking-wide">{name ?? "Player"}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-trading">
            Level {level} · {rankFor(level)}
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-background/15">
            <div className="h-full rounded-full bg-trading transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-bold tabular-nums text-background/70">
            {into} / {needed} XP to Level {level + 1}
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        {chips}
        <span className="ml-auto rounded-full bg-background/10 px-2.5 py-1 text-xs font-extrabold tabular-nums">
          +{today} XP today · {total.toLocaleString()} total
        </span>
      </div>
    </div>
  );
}
