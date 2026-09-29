export function MomentumRing({ value, size = 120 }: { value: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="mj-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--trading)" />
            <stop offset="50%" stopColor="var(--learning)" />
            <stop offset="100%" stopColor="var(--life)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#mj-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold leading-none">{Math.round(pct)}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Momentum</span>
      </div>
    </div>
  );
}
