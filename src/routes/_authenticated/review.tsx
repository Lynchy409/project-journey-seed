import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Bar, Field, PrimaryButton, SectionTitle, TextArea, TextInput, Chip } from "@/components/app/ui";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { goalsQuery, progressPct, setGoalValue, addGoal, WEEKLY_LIMIT } from "@/lib/goals";
import { addEntry } from "@/lib/journal";
import { iso, weekDates, prettyDate } from "@/lib/dates";
import { dayEntriesQuery, DAY_TYPES, shiftTypesQuery } from "@/lib/day";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Weekly review — My Journey" },
      { name: "description", content: "Score last week, capture the lesson, then set next week against your shifts." },
      { property: "og:title", content: "Weekly review — My Journey" },
      { property: "og:description", content: "Score last week, capture the lesson, then set next week against your shifts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Review,
});

function Review() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const { data: goals } = useQuery(goalsQuery);
  const weekly = (goals ?? []).filter((g) => g.horizon === "weekly" && g.status === "active");

  const [worked, setWorked] = useState("");
  const [didnt, setDidnt] = useState("");
  const [lesson, setLesson] = useState("");

  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<Pillar>("fitness");
  const [target, setTarget] = useState("");

  const next = new Date();
  next.setDate(next.getDate() + 7);
  const nextWeek = weekDates(next);
  const { data: entries } = useQuery(dayEntriesQuery(iso(nextWeek[0]!), iso(nextWeek[6]!)));
  const { data: shifts } = useQuery(shiftTypesQuery);

  const update = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => setGoalValue(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const parts = [
        worked.trim() && `What worked: ${worked.trim()}`,
        didnt.trim() && `What didn't: ${didnt.trim()}`,
      ].filter(Boolean) as string[];
      if (parts.length) await addEntry({ text: parts.join("\n"), pillar: "life", entry_type: "weekly_review" });
      if (lesson.trim()) await addEntry({ text: lesson.trim(), pillar: "life", entry_type: "lesson", is_lesson: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      setStep(2);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const newGoal = useMutation({
    mutationFn: () =>
      addGoal({
        title: title.trim(),
        pillar,
        horizon: "weekly",
        metric: null,
        target_value: target ? Number(target) : null,
        deadline: null,
        parent_id: null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setTitle(""); setTarget("");
      toast.success("Goal set for next week");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const count = weekly.filter((g) => g.pillar === pillar).length;

  return (
    <div className="min-h-screen bg-background px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="absolute inset-x-0 top-0 h-2 bg-hero" />
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
          <button aria-label="Close" onClick={() => navigate({ to: "/plan" })} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 0 && (
          <div className="mt-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Score last week</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">Be honest. The number is only useful if it's true.</p>
            {weekly.length === 0 ? (
              <p className="mt-6 text-sm font-semibold text-muted-foreground">No short-term goals were set. Skip ahead and set some.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {weekly.map((g) => {
                  const p = (g.pillar as Pillar) in PILLARS ? (g.pillar as Pillar) : "life";
                  const cur = Number(g.current_value);
                  const tgt = g.target_value ? Number(g.target_value) : null;
                  return (
                    <li key={g.id} className="rounded-3xl bg-card p-4 shadow-card">
                      <p className="text-base font-bold leading-tight">{g.title}</p>
                      <p className={`mt-0.5 text-xs font-bold ${PILLARS[p].text}`}>{PILLARS[p].label}</p>
                      {tgt !== null && <div className="mt-3"><Bar pct={progressPct(cur, tgt)} className={PILLARS[p].bg} /></div>}
                      <div className="mt-3 flex items-center gap-2">
                        <TextInput
                          inputMode="decimal"
                          defaultValue={String(cur)}
                          onBlur={(e) => update.mutate({ id: g.id, value: Number(e.target.value || 0) })}
                          className="flex-1"
                        />
                        <span className="text-sm font-bold text-muted-foreground">{tgt !== null ? `of ${tgt}` : ""}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-8"><PrimaryButton onClick={() => setStep(1)}>Next</PrimaryButton></div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-8 space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight">What happened?</h1>
            <Field label="What worked"><TextArea value={worked} onChange={(e) => setWorked(e.target.value)} /></Field>
            <Field label="What didn't"><TextArea value={didnt} onChange={(e) => setDidnt(e.target.value)} /></Field>
            <Field label="The lesson (saved to your library)"><TextArea value={lesson} onChange={(e) => setLesson(e.target.value)} /></Field>
            <PrimaryButton onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>Save and continue</PrimaryButton>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight">Set next week</h1>
            <p className="text-sm font-semibold text-muted-foreground">Up to {WEEKLY_LIMIT} per pillar. {count} set for {PILLARS[pillar].label}.</p>
            <Field label="Pillar">
              <div className="flex gap-2">
                {(Object.keys(PILLARS) as Pillar[]).map((p) => (
                  <Chip key={p} active={pillar === p} onClick={() => setPillar(p)} className="flex-1">{PILLARS[p].label}</Chip>
                ))}
              </div>
            </Field>
            <Field label="Goal"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Three gym sessions" /></Field>
            <Field label="Target"><TextInput inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 3" /></Field>
            <PrimaryButton onClick={() => newGoal.mutate()} disabled={!title.trim() || count >= WEEKLY_LIMIT || newGoal.isPending}>
              Add goal
            </PrimaryButton>
            <button onClick={() => setStep(3)} className="h-12 w-full rounded-2xl border text-sm font-bold">Next: check the week</button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Next week's shifts</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">Make sure the plan fits the days you actually have.</p>
            <ul className="mt-6 space-y-2">
              {nextWeek.map((d) => {
                const date = iso(d);
                const e = (entries ?? []).find((x) => x.date === date);
                const s = shifts?.find((x) => x.id === e?.shift_type_id);
                return (
                  <li key={date} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
                    <span className="text-sm font-bold">{prettyDate(date)}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {s ? s.name : e ? DAY_TYPES.find((t) => t.value === e.day_type)?.label : "Not set"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 space-y-3">
              <PrimaryButton onClick={() => { toast.success("Review done. Strong week ahead."); navigate({ to: "/plan" }); }}>
                Finish review
              </PrimaryButton>
              <button onClick={() => navigate({ to: "/plan" })} className="h-12 w-full rounded-2xl border text-sm font-bold">Open the calendar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
