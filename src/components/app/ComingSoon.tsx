import type { LucideIcon } from "lucide-react";
import { Card } from "./AppShell";

export function ComingSoon({
  icon: Icon,
  title,
  points,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  points: string[];
  tone: string;
}) {
  return (
    <Card>
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm font-medium text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Coming in a later phase</p>
    </Card>
  );
}
