import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { statementsQuery } from "@/lib/profile";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { PrimaryButton } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/morning")({
  head: () => ({
    meta: [
      { title: "Morning flow — My Journey" },
      { name: "description", content: "Wake, read your goals aloud, stretch, breakfast, meditate, then trade." },
      { property: "og:title", content: "Morning flow — My Journey" },
      { property: "og:description", content: "Wake, read your goals aloud, stretch, breakfast, meditate, then trade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Morning,
});

type Step = { title: string; detail: string; seconds?: number; statements?: boolean };

function Morning() {
  const navigate = useNavigate();
  const { data: statements } = useQuery(statementsQuery);
  const [i, setI] = useState(0);

  const steps = useMemo<Step[]>(
    () => [
      { title: "Wake up", detail: "Feet on the floor. No phone scrolling." },
      { title: "Read your goals aloud", detail: "Say each one out loud, like you mean it.", statements: true },
      { title: "Stretch", detail: "Ten minutes of movement to switch the body on.", seconds: 600 },
      { title: "Wash", detail: "Cold finish if you can take it." },
      { title: "Big breakfast", detail: "Protein first. Fuel the day properly." },
      { title: "Meditate", detail: "Ten quiet minutes. Just breathe.", seconds: 600 },
      { title: "Trade or prepare", detail: "Check your bias, then follow the plan." },
    ],
    [],
  );

  const step = steps[i]!;
  const last = i === steps.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="absolute inset-x-0 top-0 h-2 bg-hero" />
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 w-6 rounded-full ${n <= i ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        <button aria-label="Close" onClick={() => navigate({ to: "/today" })} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Step {i + 1} of {steps.length}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{step.title}</h1>
        <p className="mt-3 text-base font-semibold text-muted-foreground">{step.detail}</p>

        {step.statements && <Statements items={statements ?? []} />}
        {step.seconds && <Timer key={i} seconds={step.seconds} />}
      </div>

      <PrimaryButton
        onClick={() => {
          if (last) {
            toast.success("Morning done. Go get it.");
            navigate({ to: "/today" });
          } else setI(i + 1);
        }}
      >
        {last ? "Finish" : "Done"}
      </PrimaryButton>
    </div>
  );
}

function Statements({ items }: { items: { id: string; text: string; pillar: string; active: boolean }[] }) {
  const active = items.filter((s) => s.active);
  const [n, setN] = useState(0);
  if (active.length === 0) return null;
  const s = active[Math.min(n, active.length - 1)]!;
  const p = (s.pillar as Pillar) in PILLARS ? (s.pillar as Pillar) : "life";
  return (
    <div className="mt-8">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${PILLARS[p].soft} ${PILLARS[p].text}`}>{PILLARS[p].label}</span>
      <p className="mt-4 text-3xl font-extrabold leading-tight">{s.text}</p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => setN((v) => (v + 1) % active.length)}
          className="h-12 flex-1 rounded-2xl border bg-card text-sm font-bold active:scale-[0.98] transition-transform"
        >
          Next goal
        </button>
        <span className="text-sm font-bold text-muted-foreground">
          {Math.min(n, active.length - 1) + 1}/{active.length}
        </span>
      </div>
    </div>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (left === 0 && running) setRunning(false);
  }, [left, running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mt-10 rounded-3xl bg-card p-6 text-center shadow-card">
      <p className="text-6xl font-extrabold tabular-nums tracking-tight">
        {mm}:{ss}
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          {running ? "Pause" : left === 0 ? "Done" : "Start"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setLeft(seconds);
          }}
          className="h-12 flex-1 rounded-2xl border text-sm font-bold active:scale-[0.98] transition-transform"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
