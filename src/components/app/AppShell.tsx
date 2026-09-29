import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { QuickAdd } from "./QuickAdd";

export function AppShell({
  title,
  eyebrow,
  right,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-36 pt-[max(env(safe-area-inset-top),1rem)]">
        <header className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p>}
            <h1 className="truncate text-3xl font-extrabold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/journal"
              aria-label="Journal"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-card"
            >
              <NotebookPen className="h-5 w-5" />
            </Link>
            {right}
          </div>
        </header>
        <main className="mt-2 space-y-4">{children}</main>
      </div>
      <QuickAdd />
      <BottomNav />
    </div>
  );
}

export function ProfileButton({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  return (
    <Link
      to="/profile"
      aria-label="Profile"
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-hero text-lg font-extrabold text-primary-foreground shadow-card"
    >
      {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (name?.[0] ?? "?").toUpperCase()}
    </Link>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-3xl bg-card p-5 shadow-card ${className}`}>{children}</section>;
}
