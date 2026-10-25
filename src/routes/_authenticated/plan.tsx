import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Paintbrush, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Bar, Chip, Empty, Field, FormSheet, GhostButton, PrimaryButton, SectionTitle, SelectInput, TextInput } from "@/components/app/ui";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { DOW, MONTHS, iso, monthGrid, isToday, prettyDate, weekDates } from "@/lib/dates";
import {
  DAY_TYPES,
  addTemplateTask,
  dayEntriesQuery,
  deleteShiftType,
  deleteTemplateTask,
  saveShiftType,
  setDay,
  shiftTypesQuery,
  templatesQuery,
  toggleTemplateTaskNN,
  type DayType,
} from "@/lib/day";
import { HORIZONS, WEEKLY_LIMIT, addGoal, bumpGoal, deleteGoal, goalsQuery, progressPct, setGoalStatus, type Horizon } from "@/lib/goals";
import { FitnessGoals } from "@/components/app/FitnessGoals";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan — My Journey" },
      { name: "description", content: "Paint your shifts onto the calendar, edit day templates and set your goals." },
      { property: "og:title", content: "Plan — My Journey" },
      { property: "og:description", content: "Paint your shifts onto the calendar, edit day templates and set your goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Plan,
});

type Tab = "calendar" | "goals" | "templates";

function Plan() {
  const [tab, setTab] = useState<Tab>("calendar");
  return (
    <AppShell eyebrow="Plan" title={tab === "calendar" ? "Calendar" : tab === "goals" ? "Goals" : "Day templates"}>
      <div className="flex gap-2">
        <Chip active={tab === "calendar"} onClick={() => setTab("calendar")} className="flex-1">Calendar</Chip>
        <Chip active={tab === "goals"} onClick={() => setTab("goals")} className="flex-1">Goals</Chip>
        <Chip active={tab === "templates"} onClick={() => setTab("templates")} className="flex-1">Templates</Chip>
      </div>
      {tab === "calendar" && <CalendarTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "templates" && <TemplatesTab />}
    </AppShell>
  );
}

/* -------------------------------- calendar -------------------------------- */

function CalendarTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [paint, setPaint] = useState<{ day_type: DayType; shift_type_id: string | null } | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [shiftSheet, setShiftSheet] = useState(false);

  const grid = monthGrid(month.y, month.m);
  const from = iso(grid[0]!);
  const to = iso(grid[grid.length - 1]!);

  const { data: shifts } = useQuery(shiftTypesQuery);
  const { data: entries } = useQuery(dayEntriesQuery(from, to));
  const byDate = new Map((entries ?? []).map((e) => [e.date, e]));

  const assign = useMutation({
    mutationFn: ({ date, day_type, shift_type_id }: { date: string; day_type: DayType; shift_type_id: string | null }) =>
      setDay(date, day_type, shift_type_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_entries"] });
      qc.invalidateQueries({ queryKey: ["day_entry"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const tapDay = (d: Date) => {
    const date = iso(d);
    if (paint) assign.mutate({ date, ...paint });
    else setEditDate(date);
  };

  const dayClass = (date: string) => {
    const e = byDate.get(date);
    if (!e) return "bg-card text-muted-foreground";
    if (e.day_type === "work") {
      const s = shifts?.find((x) => x.id === e.shift_type_id);
      return s ? `${shiftTone(s.color)} font-extrabold` : "bg-learning-soft text-learning font-extrabold";
    }
    if (e.day_type === "rest") return "bg-life-soft text-life font-extrabold";
    return "bg-trading-soft text-trading font-extrabold";
  };

  const week = weekDates(now);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <button aria-label="Previous month" onClick={() => setMonth((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-lg font-extrabold">{MONTHS[month.m]} {month.y}</p>
          <button aria-label="Next month" onClick={() => setMonth((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1">
          {DOW.map((d) => (
            <span key={d} className="pb-1 text-center text-[10px] font-bold uppercase text-muted-foreground">{d[0]}</span>
          ))}
          {grid.map((d) => {
            const date = iso(d);
            const dim = d.getMonth() !== month.m;
            return (
              <button
                key={date}
                onClick={() => tapDay(d)}
                className={`flex aspect-square items-center justify-center rounded-xl border text-sm transition-transform active:scale-90 ${dayClass(date)} ${dim ? "opacity-35" : ""} ${isToday(d) ? "ring-2 ring-primary" : ""}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle action={<button onClick={() => setShiftSheet(true)} className="text-xs font-bold text-muted-foreground">Edit shifts</button>}>
          Paint mode
        </SectionTitle>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Pick a shift or day type, then tap dates to fill them in fast.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={paint === null} onClick={() => setPaint(null)}>
            <span className="flex items-center gap-1.5"><Paintbrush className="h-4 w-4" /> Off</span>
          </Chip>
          {shifts?.map((s) => (
            <Chip key={s.id} active={paint?.shift_type_id === s.id} onClick={() => setPaint({ day_type: "work", shift_type_id: s.id })}>
              {s.name}
            </Chip>
          ))}
          <Chip active={paint?.day_type === "off" } onClick={() => setPaint({ day_type: "off", shift_type_id: null })}>Off day</Chip>
          <Chip active={paint?.day_type === "rest"} onClick={() => setPaint({ day_type: "rest", shift_type_id: null })}>Rest</Chip>
        </div>
        {paint && <p className="mt-3 text-xs font-bold text-primary">Painting on. Tap dates above. Tap "Off" to stop.</p>}
      </Card>

      <Card>
        <SectionTitle>This week</SectionTitle>
        <ul className="mt-3 space-y-2">
          {week.map((d) => {
            const date = iso(d);
            const e = byDate.get(date);
            const s = shifts?.find((x) => x.id === e?.shift_type_id);
            return (
              <li key={date}>
                <button onClick={() => setEditDate(date)} className="flex w-full items-center justify-between rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform">
                  <span className="text-sm font-bold">{prettyDate(date)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${e ? (s ? shiftTone(s.color) : DAY_TYPES.find((t) => t.value === e.day_type)?.cls) : "bg-secondary text-muted-foreground"}`}>
                    {s ? s.name : e ? DAY_TYPES.find((t) => t.value === e.day_type)?.label : "Not set"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <DaySheet date={editDate} onClose={() => setEditDate(null)} />
      <ShiftSheet open={shiftSheet} onOpenChange={setShiftSheet} />
    </>
  );
}

function shiftTone(color: string) {
  const map: Record<string, string> = {
    amber: "bg-fitness-soft text-fitness",
    violet: "bg-life-soft text-life",
    indigo: "bg-learning-soft text-learning",
    rose: "bg-destructive/10 text-destructive",
    slate: "bg-secondary text-foreground",
  };
  return map[color] ?? "bg-secondary text-foreground";
}

function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: shifts } = useQuery(shiftTypesQuery);
  const save = useMutation({
    mutationFn: ({ day_type, shift_type_id }: { day_type: DayType; shift_type_id: string | null }) =>
      setDay(date!, day_type, shift_type_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_entries"] });
      qc.invalidateQueries({ queryKey: ["day_entry"] });
      toast.success("Day updated");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={!!date} onOpenChange={(v) => !v && onClose()} title={date ? prettyDate(date) : ""}>
      <SectionTitle>Working a shift</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {shifts?.map((s) => (
          <Chip key={s.id} onClick={() => save.mutate({ day_type: "work", shift_type_id: s.id })}>
            {s.name} {s.start_time ? `· ${String(s.start_time).slice(0, 5)}` : ""}
          </Chip>
        ))}
      </div>
      <SectionTitle>Not working</SectionTitle>
      <div className="flex gap-2">
        <Chip onClick={() => save.mutate({ day_type: "off", shift_type_id: null })} className="flex-1">Off day</Chip>
        <Chip onClick={() => save.mutate({ day_type: "rest", shift_type_id: null })} className="flex-1">Rest / recovery</Chip>
      </div>
    </FormSheet>
  );
}

function ShiftSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: shifts } = useQuery(shiftTypesQuery);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [color, setColor] = useState("slate");

  const add = useMutation({
    mutationFn: () => saveShiftType({ name, start_time: start || null, end_time: end || null, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift_types"] });
      setName(""); setStart(""); setEnd("");
      toast.success("Shift added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: deleteShiftType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift_types"] }),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Shift types">
      <ul className="space-y-2">
        {shifts?.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-2xl border p-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${shiftTone(s.color)}`}>{s.name}</span>
            <span className="flex-1 text-xs font-semibold text-muted-foreground">
              {s.start_time ? `${String(s.start_time).slice(0, 5)} – ${String(s.end_time ?? "").slice(0, 5)}` : "No times"}
            </span>
            <button aria-label="Delete" onClick={() => remove.mutate(s.id)} className="text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <Field label="New shift name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Twilight" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start"><TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="End"><TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Colour">
        <SelectInput value={color} onChange={(e) => setColor(e.target.value)}>
          {["amber", "violet", "indigo", "rose", "slate"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </SelectInput>
      </Field>
      <PrimaryButton onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>Add shift type</PrimaryButton>
    </FormSheet>
  );
}

/* --------------------------------- goals ---------------------------------- */

function GoalsTab() {
  return <><Link to="/review" className="inline-flex min-h-11 items-center text-sm font-bold underline">Weekly review</Link><FitnessGoals allSections /></>;
}
function LegacyGoalsTab() {
  const qc = useQueryClient();
  const { data: goals } = useQuery(goalsQuery);
  const [open, setOpen] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>("weekly");

  const bump = useMutation({
    mutationFn: ({ id, current, by }: { id: string; current: number; by: number }) => bumpGoal(id, current, by),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => setGoalStatus(id, "done"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
  const remove = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const list = (h: Horizon) => (goals ?? []).filter((g) => g.horizon === h && g.status === "active");

  return (
    <>
      <Card>
        <SectionTitle action={<Link to="/review" className="text-xs font-bold text-muted-foreground">Weekly review</Link>}>
          Your goals
        </SectionTitle>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Long term sets the direction, medium term breaks it down, short term is what you do this week.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setOpen(true)}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Add a goal</span>
          </PrimaryButton>
        </div>
      </Card>

      {HORIZONS.map((h) => (
        <Card key={h.value}>
          <SectionTitle>{h.label} · {h.blurb}</SectionTitle>
          {list(h.value).length === 0 ? (
            <Empty>Nothing here yet.</Empty>
          ) : (
            <ul className="mt-3 space-y-4">
              {list(h.value).map((g) => {
                const p = (g.pillar as Pillar) in PILLARS ? (g.pillar as Pillar) : "life";
                const cur = Number(g.current_value);
                const tgt = g.target_value ? Number(g.target_value) : null;
                return (
                  <li key={g.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-tight">{g.title}</p>
                        <p className={`mt-0.5 text-xs font-bold ${PILLARS[p].text}`}>
                          {PILLARS[p].label}
                          {g.deadline ? ` · by ${prettyDate(g.deadline)}` : ""}
                        </p>
                      </div>
                      <button aria-label="Delete goal" onClick={() => remove.mutate(g.id)} className="shrink-0 text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {tgt !== null && (
                      <>
                        <div className="mt-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
                          <span>{cur} / {tgt} {g.metric ?? ""}</span>
                          <span>{progressPct(cur, tgt)}%</span>
                        </div>
                        <div className="mt-1.5"><Bar pct={progressPct(cur, tgt)} className={PILLARS[p].bg} /></div>
                      </>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => bump.mutate({ id: g.id, current: cur, by: 1 })} className="h-10 flex-1 rounded-xl bg-secondary text-sm font-bold active:scale-95 transition-transform">+1</button>
                      <button onClick={() => bump.mutate({ id: g.id, current: cur, by: -1 })} className="h-10 w-12 rounded-xl bg-secondary text-sm font-bold active:scale-95 transition-transform">−</button>
                      <button onClick={() => complete.mutate(g.id)} className="h-10 flex-1 rounded-xl border text-sm font-bold active:scale-95 transition-transform">Done</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <GoalSheet open={open} onOpenChange={setOpen} horizon={horizon} setHorizon={setHorizon} goals={goals ?? []} />
    </>
  );
}

function GoalSheet({
  open, onOpenChange, horizon, setHorizon, goals,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  horizon: Horizon;
  setHorizon: (h: Horizon) => void;
  goals: { id: string; title: string; horizon: string; pillar: string; status: string }[];
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<Pillar>("fitness");
  const [metric, setMetric] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [parent, setParent] = useState("");

  const weeklyCount = goals.filter((g) => g.horizon === "weekly" && g.pillar === pillar && g.status === "active").length;
  const blocked = horizon === "weekly" && weeklyCount >= WEEKLY_LIMIT;

  const add = useMutation({
    mutationFn: () =>
      addGoal({
        title: title.trim(),
        pillar,
        horizon,
        metric: metric || null,
        target_value: target ? Number(target) : null,
        deadline: deadline || null,
        parent_id: parent || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setTitle(""); setMetric(""); setTarget(""); setDeadline("");
      toast.success("Goal added");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const parents = goals.filter((g) => g.horizon !== "weekly" && g.status === "active");

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add a goal">
      <Field label="Horizon">
        <div className="flex gap-2">
          {HORIZONS.map((h) => (
            <Chip key={h.value} active={horizon === h.value} onClick={() => setHorizon(h.value)} className="flex-1">{h.label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Pillar">
        <div className="flex gap-2">
          {(Object.keys(PILLARS) as Pillar[]).map((p) => (
            <Chip key={p} active={pillar === p} onClick={() => setPillar(p)} className="flex-1">{PILLARS[p].label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Goal"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Squat 180kg" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Measure"><TextInput value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="kg, sessions, R" /></Field>
        <Field label="Target"><TextInput inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 180" /></Field>
      </div>
      <Field label="Deadline"><TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      {parents.length > 0 && (
        <Field label="Feeds into">
          <SelectInput value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Nothing yet</option>
            {parents.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </SelectInput>
        </Field>
      )}
      {blocked && (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-bold text-destructive">
          Three short-term goals per pillar is the limit. More than that and none of them get your full effort.
        </p>
      )}
      <PrimaryButton onClick={() => add.mutate()} disabled={!title.trim() || blocked || add.isPending}>Save goal</PrimaryButton>
    </FormSheet>
  );
}

/* ------------------------------- templates -------------------------------- */

function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates } = useQuery(templatesQuery);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<Pillar>("life");
  const [nn, setNn] = useState(true);

  const add = useMutation({
    mutationFn: (sort: number) => addTemplateTask(addTo!, title.trim(), pillar, nn, sort),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_templates"] });
      setTitle("");
      setAddTo(null);
      toast.success("Task added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const remove = useMutation({
    mutationFn: deleteTemplateTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day_templates"] }),
  });
  const toggleNN = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => toggleTemplateTaskNN(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day_templates"] }),
  });

  const target = templates?.find((t) => t.id === addTo);

  return (
    <>
      <Card>
        <SectionTitle>How this works</SectionTitle>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Each day type has its own checklist. Non-negotiables are what your daily score is measured on.
        </p>
      </Card>

      {templates?.map((t) => (
        <Card key={t.id}>
          <SectionTitle action={<button onClick={() => setAddTo(t.id)} className="text-xs font-bold text-muted-foreground">Add task</button>}>
            {t.name}
          </SectionTitle>
          {t.template_tasks.length === 0 ? (
            <Empty>No tasks yet.</Empty>
          ) : (
            <ul className="mt-3 space-y-2">
              {t.template_tasks.map((task) => {
                const p = (task.pillar as Pillar) in PILLARS ? (task.pillar as Pillar) : "life";
                return (
                  <li key={task.id} className="flex items-center gap-3 rounded-2xl border p-3">
                    <span className={`h-8 w-1.5 rounded-full ${PILLARS[p].bg}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{task.title}</span>
                      <button
                        onClick={() => toggleNN.mutate({ id: task.id, value: !task.non_negotiable })}
                        className={`mt-0.5 text-xs font-bold ${task.non_negotiable ? PILLARS[p].text : "text-muted-foreground"}`}
                      >
                        {task.non_negotiable ? "Non-negotiable" : "Optional"}
                      </button>
                    </span>
                    <button aria-label="Delete task" onClick={() => remove.mutate(task.id)} className="text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <FormSheet open={!!addTo} onOpenChange={(v) => !v && setAddTo(null)} title={`Add to ${target?.name ?? ""}`}>
        <Field label="Task"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 min Spanish" /></Field>
        <Field label="Pillar">
          <div className="flex gap-2">
            {(Object.keys(PILLARS) as Pillar[]).map((p) => (
              <Chip key={p} active={pillar === p} onClick={() => setPillar(p)} className="flex-1">{PILLARS[p].label}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Counts towards your score?">
          <div className="flex gap-2">
            <Chip active={nn} onClick={() => setNn(true)} className="flex-1">Non-negotiable</Chip>
            <Chip active={!nn} onClick={() => setNn(false)} className="flex-1">Optional</Chip>
          </div>
        </Field>
        <PrimaryButton onClick={() => add.mutate(target?.template_tasks.length ?? 0)} disabled={!title.trim() || add.isPending}>
          Add task
        </PrimaryButton>
      </FormSheet>
    </>
  );
}
