import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Moon, Sunrise } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, ProfileButton } from "@/components/app/AppShell";
import { MomentumRing } from "@/components/app/MomentumRing";
import { Bar, Empty, Field, FormSheet, PrimaryButton, SectionTitle, SelectInput, TextArea, TextInput, Chip } from "@/components/app/ui";
import { LittleWins } from "@/components/app/LittleWins";
import { profileQuery } from "@/lib/profile";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { todayISO, prettyDate } from "@/lib/dates";
import {
  checkinQuery,
  dayEntryQuery,
  isComeback,
  momentumQuery,
  recomputeMomentum,
  saveCheckin,
  shiftTypesQuery,
  taskLogsQuery,
  templatesQuery,
  toggleTask,
  DAY_TYPES,
} from "@/lib/day";
import { goalsQuery, progressPct } from "@/lib/goals";
import { lessonsQuery, pickLesson } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — My Journey" },
      { name: "description", content: "Your plan for today, your momentum and the one lesson to remember." },
      { property: "og:title", content: "Today — My Journey" },
      { property: "og:description", content: "Your plan for today, your momentum and the one lesson to remember." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Today,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Today() {
  const date = todayISO();
  const qc = useQueryClient();
  const [checkinOpen, setCheckinOpen] = useState(false);

  const { data: profile } = useQuery(profileQuery);
  const { data: entry } = useQuery(dayEntryQuery(date));
  const { data: templates } = useQuery(templatesQuery);
  const { data: logs } = useQuery(taskLogsQuery(date));
  const { data: shifts } = useQuery(shiftTypesQuery);
  const { data: momentumRows } = useQuery(momentumQuery);
  const { data: lessons } = useQuery(lessonsQuery);
  const { data: goals } = useQuery(goalsQuery);

  const dayType = entry?.day_type ?? "off";
  const tpl = templates?.find((t) => t.day_type === dayType);
  const tasks = tpl?.template_tasks ?? [];
  const doneMap = new Map((logs ?? []).map((l) => [l.template_task_id, l.done]));
  const nn = tasks.filter((t) => t.non_negotiable);
  const nnDone = nn.filter((t) => doneMap.get(t.id)).length;
  const dayScore = nn.length ? Math.round((nnDone / nn.length) * 100) : 0;

  const todayMomentum = momentumRows?.find((m) => m.date === date)?.momentum;
  const lastMomentum = momentumRows?.[0]?.momentum ?? 50;
  const momentum = todayMomentum ?? Math.round(lastMomentum * 0.8 + dayScore * 0.2);
  const comeback = isComeback(momentumRows ?? []);

  const shift = shifts?.find((s) => s.id === entry?.shift_type_id);
  const dayLabel = DAY_TYPES.find((d) => d.value === dayType)?.label ?? "Off";

  const todayPillars = [...new Set(tasks.map((t) => t.pillar))];
  const lesson = pickLesson(lessons ?? [], todayPillars.length ? todayPillars : ["life"]);

  const weekly = (goals ?? []).filter((g) => g.horizon === "weekly" && g.status === "active");

  const toggle = useMutation({
    mutationFn: async (task: (typeof tasks)[number]) => {
      const next = !doneMap.get(task.id);
      await toggleTask({
        date,
        template_task_id: task.id,
        title: task.title,
        pillar: task.pillar,
        non_negotiable: task.non_negotiable,
        done: next,
      });
      const done = nn.filter((t) => (t.id === task.id ? next : doneMap.get(t.id))).length;
      await recomputeMomentum(date, nn.length ? Math.round((done / nn.length) * 100) : 0);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_logs", date] });
      qc.invalidateQueries({ queryKey: ["momentum"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const first = profile?.display_name?.split(" ")[0];

  return (
    <AppShell
      eyebrow={greeting()}
      title={first ?? "Today"}
      right={<ProfileButton name={profile?.display_name} avatar={profile?.avatar_url} />}
    >
      <Card className="flex items-center gap-5">
        <MomentumRing value={momentum} />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DAY_TYPES.find((d) => d.value === dayType)?.cls}`}>
              {dayLabel} day
            </span>
            {shift && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{shift.name}</span>}
          </div>
          <p className="mt-2 text-lg font-extrabold leading-tight">
            {comeback ? "Comeback day" : dayScore === 100 ? "Day complete" : `${nnDone} of ${nn.length} non-negotiables`}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {comeback
              ? "One good day pulls your momentum straight back up."
              : "Today's score moves momentum by a fifth. Small wins compound."}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/morning"
          className="flex h-16 items-center justify-center gap-2 rounded-3xl bg-primary text-base font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
        >
          <Sunrise className="h-5 w-5" /> Morning
        </Link>
        <button
          onClick={() => setCheckinOpen(true)}
          className="flex h-16 items-center justify-center gap-2 rounded-3xl border bg-card text-base font-extrabold active:scale-[0.98] transition-transform"
        >
          <Moon className="h-5 w-5" /> Evening
        </button>
      </div>

      {lesson && (
        <Card>
          <SectionTitle>Today's lesson</SectionTitle>
          <p className="mt-2 text-base font-bold leading-snug">{lesson.text}</p>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {PILLARS[(lesson.pillar as Pillar) in PILLARS ? (lesson.pillar as Pillar) : "life"].label} · {prettyDate(lesson.date)}
          </p>
        </Card>
      )}

      <Card>
        <SectionTitle
          action={
            <Link to="/plan" className="text-xs font-bold text-muted-foreground">
              Edit plan
            </Link>
          }
        >
          Today's plan
        </SectionTitle>
        {tasks.length === 0 ? (
          <Empty>No tasks for a {dayLabel.toLowerCase()} day yet. Add some in Plan.</Empty>
        ) : (
          <ul className="mt-3 space-y-2">
            {tasks.map((t) => {
              const done = !!doneMap.get(t.id);
              const p = (t.pillar as Pillar) in PILLARS ? (t.pillar as Pillar) : "life";
              return (
                <li key={t.id}>
                  <button
                    onClick={() => toggle.mutate(t)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                      done ? "border-transparent bg-secondary" : "bg-card"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                        done ? `${PILLARS[p].bg} text-primary-foreground scale-105` : "bg-secondary"
                      }`}
                    >
                      {done && <Check className="h-5 w-5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-base font-bold leading-tight ${done ? "text-muted-foreground line-through" : ""}`}>
                        {t.title}
                      </span>
                      <span className={`text-xs font-bold ${PILLARS[p].text}`}>
                        {PILLARS[p].label}
                        {t.non_negotiable ? " · non-negotiable" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <LittleWins compact />


      <Card>
        <SectionTitle
          action={
            <Link to="/plan" className="flex items-center text-xs font-bold text-muted-foreground">
              All goals <ChevronRight className="h-4 w-4" />
            </Link>
          }
        >
          This week's goals
        </SectionTitle>
        {weekly.length === 0 ? (
          <Empty>Set up to three weekly goals per pillar in Plan.</Empty>
        ) : (
          <ul className="mt-3 space-y-3">
            {weekly.map((g) => {
              const p = (g.pillar as Pillar) in PILLARS ? (g.pillar as Pillar) : "life";
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold">{g.title}</span>
                    <span className="shrink-0 text-xs font-bold text-muted-foreground">
                      {Number(g.current_value)}
                      {g.target_value ? ` / ${Number(g.target_value)}` : ""} {g.metric ?? ""}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Bar pct={progressPct(Number(g.current_value), g.target_value ? Number(g.target_value) : null)} className={PILLARS[p].bg} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <EveningCheckin open={checkinOpen} onOpenChange={setCheckinOpen} date={date} />
    </AppShell>
  );
}

function EveningCheckin({ open, onOpenChange, date }: { open: boolean; onOpenChange: (v: boolean) => void; date: string }) {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: existing } = useQuery(checkinQuery(date));
  const [energy, setEnergy] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [water, setWater] = useState("");
  const [steps, setSteps] = useState("");
  const [win, setWin] = useState("");
  const [lesson, setLesson] = useState("");

  const current = {
    energy: energy ?? existing?.energy ?? null,
    weight: weight || (existing?.weight != null ? String(existing.weight) : ""),
    water: water || (existing?.water_ml != null ? String(existing.water_ml) : ""),
    steps: steps || (existing?.steps != null ? String(existing.steps) : ""),
  };

  const save = useMutation({
    mutationFn: async () => {
      await saveCheckin(date, {
        energy: current.energy,
        weight: current.weight ? Number(current.weight) : null,
        water_ml: current.water ? Number(current.water) : null,
        steps: current.steps ? Number(current.steps) : null,
        win: win || existing?.win || null,
        lesson: lesson || existing?.lesson || null,
      });
      if (lesson.trim()) {
        const { addEntry } = await import("@/lib/journal");
        await addEntry({ text: lesson.trim(), pillar: "life", entry_type: "lesson", date, is_lesson: true });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin", date] });
      qc.invalidateQueries({ queryKey: ["checkins"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Checked in. Good day's work.");
      onOpenChange(false);
      setLesson("");
      setWin("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Evening check-in">
      <Field label="Energy today">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} active={current.energy === n} onClick={() => setEnergy(n)} className="flex-1">
              {n}
            </Chip>
          ))}
        </div>
      </Field>
      {profile?.track_weight !== false && (
        <Field label={`Weight (${profile?.units ?? "kg"})`}>
          <TextInput inputMode="decimal" value={current.weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 92.4" />
        </Field>
      )}
      {profile?.track_water !== false && (
        <Field label={`Water (ml, target ${profile?.water_target_ml ?? 3000})`}>
          <TextInput inputMode="numeric" value={current.water} onChange={(e) => setWater(e.target.value)} placeholder="e.g. 3000" />
        </Field>
      )}
      <Field label="Steps">
        <TextInput inputMode="numeric" value={current.steps} onChange={(e) => setSteps(e.target.value)} placeholder="e.g. 9000" />
      </Field>
      <Field label="One win">
        <TextInput value={win || existing?.win || ""} onChange={(e) => setWin(e.target.value)} placeholder="What went well?" />
      </Field>
      <Field label="One lesson (saved to your journal)">
        <TextArea value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="What would you do differently?" />
      </Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
        Save check-in
      </PrimaryButton>
    </FormSheet>
  );
}
