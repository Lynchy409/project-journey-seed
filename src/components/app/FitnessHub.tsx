import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "./AppShell";
import {
  Chip,
  Field,
  FormSheet,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "./ui";
import {
  FitnessError,
  FitnessSessions,
  SessionComposer,
  SessionDetail,
  useFitnessRefresh,
} from "./FitnessSession";
import { FitnessPlans, MovementLibrary, SavedWorkouts } from "./FitnessLibrary";
import { FitnessGoals } from "./FitnessGoals";
import {
  DEFAULT_SCHEDULE,
  detailsOf,
  distanceUnits,
  ensureFitnessTasks,
  fitnessHistoryQuery,
  fitnessPlansQuery,
  fitnessPreferencesQuery,
  fitnessTasksQuery,
  fitnessTemplatesQuery,
  moveFitnessTask,
  object,
  patchFitnessTask,
  savePreferences,
  SLOTS,
  slotForKind,
  type WeeklySchedule,
  type FitnessWorkout,
} from "@/lib/fitness";
import { todayISO, prettyDate } from "@/lib/dates";
import { checkinQuery, dayEntriesQuery, uid } from "@/lib/day";
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery } from "@/lib/goals";
import type { FitnessDatabase, FitnessTask, FitnessTemplate } from "@/lib/fitness-types";
import type { Json } from "@/integrations/supabase/types";
import { MOVEMENTS } from "@/lib/fitness-library";
import { ExerciseHistory } from './ExerciseHistory';

function TaskChooser({ task, onClose }: { task: FitnessTask; onClose: () => void }) {
  const templates = useQuery(fitnessTemplatesQuery);
  const plans = useQuery(fitnessPlansQuery);
  const [search, setSearch] = useState("");
  const [choice, setChoice] = useState<
    "choose" | "manual" | FitnessTemplate | { movement: { name: string; kind: string } }
  >("choose");
  const ideas = MOVEMENTS.filter(
    (m) =>
      m.purpose === task.slot &&
      `${m.name} ${m.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const offset = ideas.length
    ? Math.floor(Date.parse(`${task.date}T12:00:00Z`) / 86400000) % ideas.length
    : 0;
  const suggested = search
    ? ideas.slice(0, 20)
    : [...ideas.slice(offset), ...ideas.slice(0, offset)].slice(0, 6);
  if (choice !== "choose")
    return (
      <SessionComposer
        task={task}
        initialSlot={task.slot}
        template={typeof choice === "object" && "payload" in choice ? choice : undefined}
        movement={typeof choice === "object" && "movement" in choice ? choice.movement : undefined}
        onClose={onClose}
      />
    );
  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={task.title}
    >
      <p className="text-sm text-muted-foreground">
        {prettyDate(task.date)}. Choose what you actually did. This task completes only when a
        session saves.
      </p>
      <PrimaryButton onClick={() => setChoice("manual")}>Manual session / activity</PrimaryButton>
      <SectionTitle>Saved workouts</SectionTitle>
      {(templates.data ?? [])
        .filter((t) => !t.archived && t.slot === task.slot)
        .sort((a, b) => Number(b.id === task.template_id) - Number(a.id === task.template_id))
        .map((t) => (
          <button
            key={t.id}
            className="min-h-12 rounded-xl border p-3 text-left text-sm font-bold"
            onClick={() => setChoice(t)}
          >
            {t.name} · v{t.version}
            {t.id === task.template_id ? " · planned" : ""}
          </button>
        ))}
      {!(templates.data ?? []).some((t) => !t.archived && t.slot === task.slot) && (
        <p className="text-sm text-muted-foreground">
          Add saved workouts in Train → Library, or use manual logging.
        </p>
      )}
      <SectionTitle>From your plans</SectionTitle>
      {(plans.data ?? [])
        .filter((p) => !p.archived && slotForKind(p.kind) === task.slot)
        .map((p) => (
          <button
            key={p.id}
            className="min-h-12 rounded-xl border p-3 text-left text-sm font-bold"
            onClick={() => setChoice({ movement: { name: p.name, kind: p.kind } })}
          >
            {p.name}
          </button>
        ))}
      <SectionTitle>Holds, skills & recovery ideas</SectionTitle>
      <Field label="Choose movement for this task">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your movement library"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Ideas rotate by day. These are library choices, not personalised recommendations.
      </p>
      {suggested.map((m) => (
        <button
          key={m.id}
          className="min-h-12 rounded-xl border p-3 text-left text-sm"
          onClick={() => setChoice({ movement: m })}
        >
          <span className="font-bold">{m.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{m.cue}</span>
        </button>
      ))}
      <FitnessError error={templates.error ?? plans.error} />
    </FormSheet>
  );
}
export function FitnessQuickLog({
  slot,
  date,
  onClose,
}: {
  slot: "strength" | "cardio" | "recovery";
  date: string;
  onClose: () => void;
}) {
  const tasks = useQuery(fitnessTasksQuery);
  const history = useQuery(fitnessHistoryQuery);
  if (tasks.isPending || tasks.isError)
    return (
      <FormSheet
        open
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
        title="Training task"
      >
        {tasks.isPending ? (
          <p>Loading your tasks…</p>
        ) : (
          <FitnessError error={tasks.error} retry={() => tasks.refetch()} />
        )}
      </FormSheet>
    );
  const task = tasks.data.find((t) => t.date === date && t.slot === slot && t.status === "planned");
  const completed = tasks.data.find(
    (t) => t.date === date && t.slot === slot && t.status === "done",
  );
  const workout = completed ? history.data?.find((w) => w.id === completed.workout_id) : undefined;
  if (!task && workout) return <SessionDetail workout={workout} onClose={onClose} />;
  return task ? (
    <TaskChooser task={task} onClose={onClose} />
  ) : (
    <SessionComposer initialSlot={slot} initialDate={date} onClose={onClose} />
  );
}
function TaskEditor({ task, onClose }: { task: FitnessTask; onClose: () => void }) {
  const refresh = useFitnessRefresh();
  const templates = useQuery(fitnessTemplatesQuery);
  const tasks = useQuery(fitnessTasksQuery);
  const [date, setDate] = useState(task.date);
  const [title, setTitle] = useState(task.title);
  const [templateId, setTemplateId] = useState(task.template_id ?? "");
  const [swap, setSwap] = useState("");
  const action = useMutation({
    mutationFn: async (mode: "save" | "skip" | "restore" | "swap") => {
      if (mode === "save") {
        if (!title.trim()) throw new Error("Give the task a name.");
        if (date !== task.date) await moveFitnessTask(task.id, date);
        await patchFitnessTask(task.id, { title: title.trim(), template_id: templateId || null });
      } else if (mode === "swap") await moveFitnessTask(task.id, date, swap);
      else await patchFitnessTask(task.id, { status: mode === "skip" ? "skipped" : "planned" });
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
  });
  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v && !action.isPending) onClose();
      }}
      title="Manage training task"
    >
      <Field label="Task title">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      {task.status === "planned" && (
        <>
          <Field label="Move to date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Planned workout">
            <SelectInput value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Broad {task.slot} slot</option>
              {(templates.data ?? [])
                .filter((t) => !t.archived && t.slot === task.slot)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </SelectInput>
          </Field>
          <PrimaryButton disabled={action.isPending || !date} onClick={() => action.mutate("save")}>
            Save task changes
          </PrimaryButton>
          <Field label="Swap dates with another planned task">
            <SelectInput value={swap} onChange={(e) => setSwap(e.target.value)}>
              <option value="">Choose a task</option>
              {(tasks.data ?? [])
                .filter((t) => t.id !== task.id && t.status === "planned")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.date} · {t.title}
                  </option>
                ))}
            </SelectInput>
          </Field>
          <GhostButton disabled={!swap || action.isPending} onClick={() => action.mutate("swap")}>
            Swap dates
          </GhostButton>
          <GhostButton disabled={action.isPending} onClick={() => action.mutate("skip")}>
            Skip this task
          </GhostButton>
        </>
      )}
      {task.status === "skipped" && (
        <PrimaryButton disabled={action.isPending} onClick={() => action.mutate("restore")}>
          Restore planned task
        </PrimaryButton>
      )}
      <FitnessError error={action.error} />
      <p className="text-xs text-muted-foreground">
        Moving a task never changes a recorded activity. Skipping keeps its history.
      </p>
    </FormSheet>
  );
}
function ScheduleEditor({ onClose }: { onClose: () => void }) {
  const preferences = useQuery(fitnessPreferencesQuery);
  const tasks = useQuery(fitnessTasksQuery);
  const refresh = useFitnessRefresh();
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    () => object(preferences.data?.["schedule"]) as WeeklySchedule,
  );
  const [restDate, setRestDate] = useState("");
  const [notice, setNotice] = useState("");
  const effective = Object.keys(schedule).length ? schedule : DEFAULT_SCHEDULE;
  const save = useMutation({
    mutationFn: async () => {
      await savePreferences({ schedule: effective as unknown as Json });
      for (const t of tasks.data ?? []) {
        if (
          t.status !== "planned" ||
          t.date < todayISO() ||
          t.source_key !== `recurring:${t.date}:${t.slot}`
        )
          continue;
        const day = new Date(`${t.date}T12:00:00Z`).getUTCDay();
        if (!(effective[String(day)] ?? []).includes(t.slot))
          await patchFitnessTask(t.id, { status: "skipped" });
      }
      await ensureFitnessTasks(
        todayISO(),
        effective,
        Array.isArray(preferences.data?.["rest_dates"])
          ? (preferences.data["rest_dates"] as string[])
          : [],
      );
    },
    onSuccess: async () => {
      await refresh();
      setNotice("Weekly task schedule saved.");
    },
  });
  const rest = useMutation({
    mutationFn: async () => {
      if (!restDate) throw new Error("Choose a rest date.");
      const existing = Array.isArray(preferences.data?.["rest_dates"])
        ? (preferences.data["rest_dates"] as string[])
        : [];
      await savePreferences({ rest_dates: [...new Set([...existing, restDate])] });
      for (const t of tasks.data ?? [])
        if (t.date === restDate && t.status === "planned")
          await patchFitnessTask(t.id, { status: "skipped" });
    },
    onSuccess: async () => {
      await refresh();
      setNotice("Rest day saved. Completed activities are unchanged.");
    },
  });
  const removeRest = useMutation({
    mutationFn: async (date: string) => {
      const existing = Array.isArray(preferences.data?.["rest_dates"])
        ? (preferences.data["rest_dates"] as string[])
        : [];
      await savePreferences({ rest_dates: existing.filter((d) => d !== date) });
      await ensureFitnessTasks(
        todayISO(),
        effective,
        existing.filter((d) => d !== date),
      );
    },
    onSuccess: async () => {
      await refresh();
      setNotice(
        "Rest-day override removed. Previously skipped tasks stay skipped until you restore them.",
      );
    },
  });
  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title="Weekly training tasks"
    >
      <p className="text-sm text-muted-foreground">
        Editable task slots, not a prescribed workout programme. Keep lighter and rest days; no
        catch-up workload is added.
      </p>
      {[1, 2, 3, 4, 5, 6, 0].map((day) => (
        <div key={day} className="rounded-2xl border p-3">
          <p className="font-bold">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {SLOTS.map((slot) => (
              <label key={slot} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(effective[String(day)] ?? []).includes(slot)}
                  onChange={() =>
                    setSchedule((prev) => {
                      const current = Object.keys(prev).length ? prev : DEFAULT_SCHEDULE;
                      const values = current[String(day)] ?? [];
                      return {
                        ...current,
                        [String(day)]: values.includes(slot)
                          ? values.filter((s) => s !== slot)
                          : [...values, slot],
                      };
                    })
                  }
                />
                {slot}
              </label>
            ))}
          </div>
        </div>
      ))}
      <PrimaryButton disabled={save.isPending} onClick={() => save.mutate()}>
        Save recurring tasks
      </PrimaryButton>
      <Field label="One-off rest day">
        <TextInput type="date" value={restDate} onChange={(e) => setRestDate(e.target.value)} />
      </Field>
      <GhostButton disabled={!restDate || rest.isPending} onClick={() => rest.mutate()}>
        Make this a rest day
      </GhostButton>
      {(Array.isArray(preferences.data?.["rest_dates"])
        ? (preferences.data["rest_dates"] as string[])
        : []
      ).map((date) => (
        <div key={date} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <span className="text-sm">Rest day: {date}</span>
          <GhostButton disabled={removeRest.isPending} onClick={() => removeRest.mutate(date)}>
            Remove override
          </GhostButton>
        </div>
      ))}
      {notice && (
        <p role="status" className="rounded-xl bg-secondary p-3 text-sm font-bold">
          {notice}
        </p>
      )}
      <FitnessError error={save.error ?? rest.error ?? removeRest.error} />
    </FormSheet>
  );
}
export function FitnessDailyTasks({
  compact = false,
  initialDate,
}: {
  compact?: boolean;
  initialDate?: string;
}) {
  const today = todayISO();
  const tasks = useQuery(fitnessTasksQuery);
  const preferences = useQuery(fitnessPreferencesQuery);
  const days = useQuery(
    dayEntriesQuery(
      today,
      new Date(new Date(`${today}T12:00:00Z`).getTime() + 14 * 86400000).toISOString().slice(0, 10),
    ),
  );
  const history = useQuery(fitnessHistoryQuery);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<FitnessTask | null>(null);
  const [editing, setEditing] = useState<FitnessTask | null>(null);
  const [view, setView] = useState<FitnessWorkout | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [date, setDate] = useState(initialDate ?? today);
  const rawSchedule = object(preferences.data?.["schedule"]);
  const schedule = (
    Object.keys(rawSchedule).length ? rawSchedule : DEFAULT_SCHEDULE
  ) as WeeklySchedule;
  const restDates = [
    ...new Set([
      ...(Array.isArray(preferences.data?.["rest_dates"])
        ? (preferences.data["rest_dates"] as string[])
        : []),
      ...(days.data ?? []).filter((d) => d.day_type === "rest").map((d) => d.date),
    ]),
  ];
  const sync = useQuery({
    queryKey: ["fitness_schedule_sync", today, JSON.stringify(schedule), JSON.stringify(restDates)],
    enabled: preferences.isSuccess && days.isSuccess && tasks.isSuccess,
    staleTime: 60_000,
    queryFn: async () => {
      await ensureFitnessTasks(today, schedule, restDates);
      await qc.invalidateQueries({ queryKey: ["fitness_tasks"] });
      return true;
    },
  });
  const rows = (tasks.data ?? []).filter((t) =>
    showWeek
      ? t.date >= today &&
        t.date <=
          new Date(new Date(`${today}T12:00:00Z`).getTime() + 13 * 86400000)
            .toISOString()
            .slice(0, 10)
      : t.date === (compact ? (initialDate ?? today) : date),
  );
  const error = tasks.error ?? preferences.error ?? days.error ?? sync.error;
  const preparing = tasks.isPending || preferences.isPending || days.isPending || sync.isPending;
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Training tasks</SectionTitle>
          <button
            className="min-h-11 text-sm font-bold underline"
            onClick={() => setScheduleOpen(true)}
            disabled={preferences.isError}
          >
            Schedule
          </button>
        </div>
        {!compact && (
          <p className="mt-1 text-sm text-muted-foreground">
            Strength, cardio and recovery on your chosen days. Tap a slot to choose a workout or log
            manually.
          </p>
        )}
        <FitnessError
          error={error}
          retry={() => {
            tasks.refetch();
            preferences.refetch();
            days.refetch();
            if (sync.isError) sync.refetch();
          }}
        />
        {!compact && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="Task date">
              <TextInput
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setShowWeek(false);
                }}
              />
            </Field>
            <button
              className="min-h-11 rounded-xl border px-3 text-sm font-bold"
              onClick={() => setShowWeek((v) => !v)}
            >
              {showWeek ? "Single day" : "Next 14 days"}
            </button>
          </div>
        )}
        {!error && preparing && (
          <p role="status" className="py-3 text-sm">
            Loading training tasks…
          </p>
        )}
        {!error && !preparing && !rows.length && (
          <p className="py-4 text-sm text-muted-foreground">
            No training tasks scheduled. Rest is allowed; adjust your schedule whenever you want.
          </p>
        )}
        <div className="mt-3 space-y-2">
          {rows.map((t) => (
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border p-3" key={t.id}>
              <button
                type="button"
                className="min-h-11 min-w-0 flex-1 text-left"
                disabled={t.status === "skipped"}
                onClick={() => {
                  if (t.status === "done") {
                    const w = history.data?.find((w) => w.id === t.workout_id);
                    if (w) setView(w);
                  } else setSelected(t);
                }}
              >
                <span className="block break-words text-sm font-bold">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {showWeek ? `${t.date} · ` : ""}
                  {t.slot} · {t.status === "done" ? "Saved session" : t.status}
                </span>
              </button>
              {t.status !== "done" && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-xl bg-secondary px-3 text-xs font-bold"
                  aria-label={`Manage ${t.title} ${t.date}`}
                  onClick={() => setEditing(t)}
                >
                  Manage
                </button>
              )}
            </div>
          ))}
        </div>
        {compact && (
          <Link
            to="/train"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline"
          >
            Open all training
          </Link>
        )}
      </Card>
      {selected && <TaskChooser task={selected} onClose={() => setSelected(null)} />}
      {editing && <TaskEditor task={editing} onClose={() => setEditing(null)} />}
      {view && <SessionDetail workout={view} onClose={() => setView(null)} />}
      {scheduleOpen && <ScheduleEditor onClose={() => setScheduleOpen(false)} />}
    </>
  );
}
function FoundationsEditor({ onClose }: { onClose: () => void }) {
  const date = todayISO();
  const checkin = useQuery(checkinQuery(date));
  const refresh = useFitnessRefresh();
  return (
    <FormSheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title="Body & daily foundations"
    >
      {checkin.isPending ? (
        <p role="status">Loading today's check-in…</p>
      ) : checkin.isError ? (
        <FitnessError error={checkin.error} retry={() => checkin.refetch()} />
      ) : (
        <FoundationsForm
          row={checkin.data}
          date={date}
          onSaved={async () => {
            await refresh();
            onClose();
          }}
        />
      )}
    </FormSheet>
  );
}
function FoundationsForm({
  row,
  date,
  onSaved,
}: {
  row: FitnessDatabase["public"]["Tables"]["checkins"]["Row"] | null | undefined;
  date: string;
  onSaved: () => Promise<void>;
}) {
  const [weight, setWeight] = useState(String(row?.weight ?? ""));
  const [water, setWater] = useState(String(row?.water_ml ?? ""));
  const [steps, setSteps] = useState(String(row?.steps ?? ""));
  const [energy, setEnergy] = useState(String(row?.energy ?? ""));
  const recovery = object(row?.recovery);
  const [sleep, setSleep] = useState(String(recovery["sleep_hours"] ?? ""));
  const [food, setFood] = useState(String(recovery["food_notes"] ?? ""));
  const [notes, setNotes] = useState(String(recovery["notes"] ?? ""));
  const save = useMutation({
    mutationFn: async () => {
      for (const [label, value, max] of [
        ["Weight", weight, 1000],
        ["Water", water, 50000],
        ["Steps", steps, 1000000],
        ["Sleep", sleep, 24],
        ["Energy", energy, 5],
      ] as const)
        if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max))
          throw new Error(`Check ${label.toLowerCase()}.`);
      if (
        (steps && !Number.isInteger(Number(steps))) ||
        (water && !Number.isInteger(Number(water)))
      )
        throw new Error("Water and steps must be whole numbers.");
      const user_id = await uid();
      const { error } = await supabase.from("checkins").upsert(
        {
          user_id,
          date,
          weight: weight ? Number(weight) : null,
          water_ml: water ? Number(water) : null,
          steps: steps ? Number(steps) : null,
          energy: energy ? Number(energy) : null,
          recovery: {
            ...recovery,
            sleep_hours: sleep ? Number(sleep) : null,
            food_notes: food,
            notes,
          } as Json,
        },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
    },
    onSuccess: onSaved,
  });
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Optional fields. Uses the same bodyweight, water, energy and steps as Today. No calorie
        targets or readiness score.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bodyweight (kg)">
          <TextInput
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="Water (ml)">
          <TextInput
            type="number"
            min="0"
            step="1"
            value={water}
            onChange={(e) => setWater(e.target.value)}
          />
        </Field>
        <Field label="Sleep (hours)">
          <TextInput
            type="number"
            min="0"
            max="24"
            step="0.25"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
          />
        </Field>
        <Field label="Steps">
          <TextInput
            type="number"
            min="0"
            step="1"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Energy (optional)">
        <SelectInput value={energy} onChange={(e) => setEnergy(e.target.value)}>
          <option value="">Not recorded</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Food / eating habits">
        <TextArea
          value={food}
          onChange={(e) => setFood(e.target.value)}
          placeholder="What helped, what to remember…"
        />
      </Field>
      <Field label="Recovery / soreness / unwind notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <FitnessError error={save.error} />
      <PrimaryButton disabled={save.isPending} onClick={() => save.mutate()}>
        Save foundations
      </PrimaryButton>
    </>
  );
}
function Overview() {
  const history = useQuery(fitnessHistoryQuery);
  const goals = useQuery(goalsQuery);
  const [foundations, setFoundations] = useState(false);
  const now = todayISO();
  const start = new Date(`${now}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const thisWeek = (history.data ?? []).filter(
    (w) => w.date >= start.toISOString().slice(0, 10) && w.date <= now,
  );
  return (
    <>
      <FitnessDailyTasks />
      <Card>
        <SectionTitle>This week</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SLOTS.map((s) => (
            <div key={s}>
              <p className="font-mono text-xl font-bold tabular-nums">
                {thisWeek.filter((w) => detailsOf(w).slot === s).length}
              </p>
              <p className="text-xs capitalize text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          {distanceUnits(
            thisWeek.reduce((n, w) => n + (detailsOf(w).distance_m ?? 0), 0),
            "miles",
          ).toFixed(1)}{" "}
          miles logged · {thisWeek.length} sessions
        </p>
        <FitnessError error={history.error} />
      </Card>
      <Card>
        <SectionTitle>Active goals</SectionTitle>
        <FitnessError error={goals.error} />
        {(goals.data ?? [])
          .filter((g) => g.pillar === "fitness" && g.status === "active")
          .slice(0, 4)
          .map((g) => (
            <div className="mt-3" key={g.id}>
              <p className="text-sm font-bold">{g.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {g.current_value} / {g.target_value ?? "—"} {g.metric ?? ""}
              </p>
            </div>
          ))}
        <p className="mt-3 text-xs text-muted-foreground">
          Manage these under Progress → Goals or in Plan.
        </p>
      </Card>
      <Card>
        <SectionTitle>Body & daily foundations</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Weight, sleep, hydration and notes, without a compulsory diet tracker.
        </p>
        <div className="mt-3">
          <GhostButton onClick={() => setFoundations(true)}>Log today's foundations</GhostButton>
        </div>
      </Card>
      {foundations && <FoundationsEditor onClose={() => setFoundations(false)} />}
    </>
  );
}
function Tabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex min-w-0 gap-1">
      {options.map((label) => (
        <Chip
          key={label}
          active={value === label}
          onClick={() => onChange(label)}
          className="min-h-11 min-w-0 flex-1 px-1 text-xs"
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}
export function FitnessHub({
  routines,
  records,
  body,
}: {
  routines: ReactNode;
  records: ReactNode;
  body: ReactNode;
}) {
  const [tab, setTab] = useState("Sessions");
  const [libraryTab, setLibraryTab] = useState("Workouts");
  const [progressTab, setProgressTab] = useState("Goals");
  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        options={["Sessions", "Exercises"]}
      />
      {tab === "Today" && <Overview />}
      {tab === "Sessions" && <FitnessSessions />}
      {tab === "Exercises" && <ExerciseHistory />}
      {tab === "Library" && (
        <>
          <Tabs
            value={libraryTab}
            onChange={setLibraryTab}
            options={["Workouts", "Movements", "Timed routines"]}
          />
          {libraryTab === "Workouts" ? (
            <SavedWorkouts />
          ) : libraryTab === "Movements" ? (
            <MovementLibrary />
          ) : (
            routines
          )}
        </>
      )}
      {tab === "Plans" && <FitnessPlans />}
      {tab === "Progress" && (
        <>
          <Tabs
            value={progressTab}
            onChange={setProgressTab}
            options={["Goals", "Lift records", "Body"]}
          />
          {progressTab === "Goals" ? (
            <FitnessGoals />
          ) : progressTab === "Lift records" ? (
            records
          ) : (
            body
          )}
        </>
      )}
    </>
  );
}
