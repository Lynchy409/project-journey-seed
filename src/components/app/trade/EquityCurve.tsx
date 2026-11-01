import { useState } from "react";
import { money, type CurvePoint } from "@/lib/trade-accounts";
import { prettyDate } from "@/lib/dates";

type T = { id: string; pair: string; direction: string; date: string; result_r: number | null };

/** Trade-by-trade cumulative cash line. Each dot is one closed trade; tap to inspect. */
export function EquityCurve<R extends T>({
  points,
  currency = "GBP",
}: {
  points: CurvePoint<R>[];
  currency?: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0)
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-muted-foreground">
        Add cash P&L to a closed trade to start your curve
      </div>
    );

  const W = 340;
  const H = 150;
  const pad = 12;
  const values = [0, ...points.map((p) => p.total)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, points.length)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const coords = values.map((v, i) => [x(i), y(v)] as const);
  const line = coords.map(([cx, cy], i) => `${i ? "L" : "M"}${cx},${cy}`).join(" ");
  const area = `${line} L${coords.at(-1)![0]},${y(min)} L${coords[0]![0]},${y(min)} Z`;
  const up = (points.at(-1)?.total ?? 0) >= 0;
  const picked = sel != null ? points[sel] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`h-40 w-full ${up ? "text-trading" : "text-destructive"}`}
        role="img"
        aria-label="Equity curve, trade by trade"
      >
        <line
          x1={pad}
          x2={W - pad}
          y1={y(0)}
          y2={y(0)}
          className="stroke-border"
          strokeDasharray="4 4"
        />
        <path d={area} className="fill-current opacity-10" />
        <path
          d={line}
          className="stroke-current"
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          const [cx, cy] = coords[i + 1]!;
          return (
            <g key={p.trade.id} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer">
              <circle cx={cx} cy={cy} r={12} className="fill-transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={sel === i ? 6 : 4}
                className={`${p.cash >= 0 ? "fill-trading" : "fill-destructive"} stroke-card`}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      {picked ? (
        <div className="mt-1 flex items-center justify-between rounded-2xl bg-secondary px-3 py-2 text-sm">
          <span className="font-bold">
            #{(sel ?? 0) + 1} · {picked.trade.pair} {picked.trade.direction} ·{" "}
            <span className="text-muted-foreground">{prettyDate(picked.trade.date)}</span>
          </span>
          <span className={`font-extrabold ${picked.cash >= 0 ? "text-trading" : "text-destructive"}`}>
            {money(picked.cash, currency)}
            {picked.trade.result_r != null ? ` · ${picked.trade.result_r > 0 ? "+" : ""}${picked.trade.result_r}R` : ""}
          </span>
        </div>
      ) : (
        <p className="mt-1 text-center text-xs font-semibold text-muted-foreground">
          Tap a dot to see that trade
        </p>
      )}
    </div>
  );
}
