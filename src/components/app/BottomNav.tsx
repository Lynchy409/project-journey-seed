import { Link } from "@tanstack/react-router";
import { Sun, CalendarDays, CandlestickChart, Dumbbell, BookOpen, Sparkles } from "lucide-react";

const TABS = [
  { to: "/today", label: "Today", icon: Sun },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/trade", label: "Trade", icon: CandlestickChart },
  { to: "/train", label: "Train", icon: Dumbbell },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/inner", label: "Inner", icon: Sparkles },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-11 items-center justify-center rounded-full transition-all ${isActive ? "bg-secondary scale-105" : ""}`}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
