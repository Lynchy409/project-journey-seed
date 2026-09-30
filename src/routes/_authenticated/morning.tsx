import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { statementsQuery } from "@/lib/profile";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { addEntry } from "@/lib/journal";
import { FLOW_SECONDS, MORNING_FLOW, PRAYER_LINES } from "@/lib/morning";
import { PrimaryButton, GhostButton, TextArea } from "@/components/app/ui";
import { StretchFlow } from "@/components/app/StretchFlow";
import { BoxBreath } from "@/components/app/BoxBreath";

export const Route = createFileRoute("/_authenticated/morning")({
  head: () => ({
    meta: [
      { title: "Morning flow — My Journey" },
      { name: "description", content: "Water, goals aloud, a six-minute mobility flow, breakfast, breathwork, then the charts." },
      { property: "og:title", content: "Morning flow — My Journey" },
      { property: "og:description", content: "Water, goals aloud, a six-minute mobility flow, breakfast, breathwork, then the charts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Morning,
});

type Step = {
  title: string;
  detail: string;
  seconds?: number;
  statements?: boolean;
  flow?: boolean;
  anchor?: boolean;
  trade?: boolean;
  cta?: string;
};

function Morning() {
  const navigate = useNavigate();
  const { data: statements } = useQuery(statementsQuery);
  const [i, setI] = useState(0);
  const [flowOpen, setFlowOpen] = useState(false);

  const steps = useMemo<Step[]>(
    () => [
      {
        title: "Hydrated & upright",
        detail: "Toilet, downstairs, a pint of water — all screen-free. Body moving, mind awake.",
        cta: "I'm ready",
      },
      { title: "Read your goals aloud", detail: "Say each one out loud, like you mean it.", statements: true },
      {
        title: "6-minute mobility flow",
        detail: "Hips, lower back and hamstrings. Hands free — it beeps and moves on by itself.",
        flow: true,
      },
      { title: "Wash", detail: "Cold finish if you can take it. Feel fully awake." },
      { title: "Big breakfast", detail: "Protein first. Fuel the day and the training." },
      {
        title: "Breathe, prayer & morning words",
        detail: "Two minutes of box breathing, your three lines, then one sentence for the day.",
        anchor: true,
      },
      {
        title: "Check bias & rules",
        detail: "Align your 4H / 1H / 15m / 5m bias and review your rules before looking for setups.",
        trade: true,
        cta: "Go to Trade",
      },
    ],
    [],
  );

  const step = steps[i]!;
  const last = i === steps.length - 1;

  if (flowOpen) {
    return (
      <StretchFlow
        onClose={() => setFlowOpen(false)}
        onDone={() => {
          setFlowOpen(false);
          setI((v) => Math.min(steps.length - 1, v + 1));
        }}
      />
    );
  }

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
        {step.flow && <FlowCard onStart={() => setFlowOpen(true)} />}
        {step.anchor && <Anchor />}
        {step.seconds && <Timer key={i} seconds={step.seconds} />}
      </div>

      <PrimaryButton
        onClick={() => {
          if (step.trade) {
            toast.success("Morning done. Go get it.");
            navigate({ to: "/trade" });
          } else if (last) {
            navigate({ to: "/today" });
          } else setI(i + 1);
        }}
      >
        {step.cta ?? "Done"}
      </PrimaryButton>
    </div>
  );
}

function FlowCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-6 rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-extrabold">{MORNING_FLOW.length} movements</p>
        <p className="text-sm font-bold text-muted-foreground">{Math.round(FLOW_SECONDS / 60)} min</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {MORNING_FLOW.map((m, n) => (
          <li key={m.key} className="text-sm font-semibold leading-snug">
            <span className="font-extrabold text-muted-foreground">{n + 1}.</span> {m.name}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <PrimaryButton onClick={onStart}>Start flow</PrimaryButton>
      </div>
    </div>
  );
}

function Anchor() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      <BoxBreath totalSeconds={120} />

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your three lines</p>
        <div className="mt-3 space-y-3">
          {PRAYER_LINES.map((line) => (
            <p key={line} className="text-base font-bold leading-snug">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's main focus & win</p>
        <div className="mt-2">
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="One or two sentences." />
        </div>
        <div className="mt-3">
          <GhostButton
            disabled={text.trim().length === 0 || saved}
            onClick={async () => {
              try {
                await addEntry({ text: text.trim(), pillar: "life", entry_type: "reflection" });
                await qc.invalidateQueries({ queryKey: ["journal"] });
                setSaved(true);
                toast.success("Saved to your journal.");
              } catch {
                toast.error("Could not save that. Try again.");
              }
            }}
            className="disabled:opacity-40"
          >
            {saved ? "Saved to journal" : "Save to journal"}
          </GhostButton>
        </div>
      </div>
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
