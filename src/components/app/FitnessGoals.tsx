import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "./AppShell";
import {
  Bar,
  Empty,
  Field,
  FormSheet,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  TextInput,
} from "./ui";
import { FitnessError, useFitnessRefresh } from "./FitnessSession";
import { goalsQuery, progressPct, setGoalStatus } from "@/lib/goals";
import {
  FITNESS_KINDS,
  fitnessPlansQuery,
  object,
  periodBounds,
  trackingDefaults,
} from "@/lib/fitness";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { todayISO } from "@/lib/dates";
import { supabase } from "@/integrations/supabase/client";
import { uid } from "@/lib/day";
import type { FitnessDatabase, GoalTracking } from "@/lib/fitness-types";
import type { Json } from "@/integrations/supabase/types";

type Goal = FitnessDatabase["public"]["Tables"]["goals"]["Row"];
export function GoalEditor({
  onClose,
  goal,
  initialPillar = "fitness",
}: {
  onClose: () => void;
  goal?: Goal | undefined;
  initialPillar?: Pillar;
}) {
  const refresh = useFitnessRefresh();
  const plans = useQuery(fitnessPlansQuery);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [pillar, setPillar] = useState(goal?.pillar ?? initialPillar);
  const [target, setTarget] = useState(String(goal?.target_value ?? ""));
  const [metric, setMetric] = useState(goal?.metric ?? "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [horizon, setHorizon] = useState(goal?.horizon ?? "vision");
  const [manual, setManual] = useState(String(goal?.current_value ?? 0));
  const [tracking, setTracking] = useState<GoalTracking>(() => ({
    ...trackingDefaults(),
    ...object(goal?.tracking),
  }));
  const change = <K extends keyof GoalTracking>(key: K, value: GoalTracking[K]) =>
    setTracking((t) => ({ ...t, [key]: value }));
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !(Number(target) > 0) || !Number.isFinite(Number(target)))
        throw new Error("Enter a name and a positive target.");
      if (tracking.start && tracking.end && tracking.start > tracking.end)
        throw new Error("The period end must follow its start.");
      if (tracking.period !== "all" && (!tracking.start || !tracking.end))
        throw new Error("Choose both period dates.");
      if (tracking.mode === "milestones" && !tracking.plan_id)
        throw new Error("Choose a progression plan.");
      if (
        ["weight", "reps", "seconds"].includes(tracking.measure) &&
        !tracking.exercise.trim() &&
        !["manual", "count", "milestones"].includes(tracking.mode)
      )
        throw new Error("Choose the exercise this goal measures.");
      if (tracking.mode === "manual" && (!Number.isFinite(Number(manual)) || Number(manual) < 0))
        throw new Error("Progress must be zero or a positive number.");
      const user_id = await uid();
      const row = {
        user_id,
        title: title.trim(),
        pillar,
        target_value: Number(target),
        metric: metric.trim() || (tracking.measure === "distance_m" ? tracking.unit : null),
        horizon,
        deadline: deadline || null,
        tracking: tracking as unknown as Json,
        ...(tracking.mode === "manual" ? { current_value: Number(manual) } : {}),
      };
      const result = goal
        ? await supabase.from("goals").update(row).eq("id", goal.id)
        : await supabase.from("goals").insert(row);
      if (result.error) throw result.error;
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
        if (!v && !save.isPending) onClose();
      }}
      title={goal ? "Edit goal" : "Add a goal"}
    >
      <Field label="Goal name">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Weekly miles, bench target, continuous plank…"
        />
      </Field>
      <Field label="App section">
        <SelectInput
          value={pillar}
          onChange={(e) => {
            setPillar(e.target.value);
            if (e.target.value !== "fitness") change("mode", "manual");
          }}
        >
          {Object.entries(PILLARS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Progress source">
        <SelectInput
          value={tracking.mode}
          onChange={(e) => change("mode", e.target.value as GoalTracking["mode"])}
        >
          <option value="manual">Manual progress · any app section</option>
          {pillar === "fitness" && (
            <>
              <option value="sum">Accumulated training total</option>
              <option value="best">Best single performance</option>
              <option value="count">Completed sessions</option>
              <option value="milestones">Confirmed plan milestones</option>
            </>
          )}
        </SelectInput>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target">
          <TextInput
            type="number"
            min="0"
            step="any"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </Field>
        <Field label="Display unit">
          <TextInput
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="miles, kg, seconds, sessions"
          />
        </Field>
      </div>
      {tracking.mode === "manual" ? (
        <Field label="Current progress">
          <TextInput
            type="number"
            min="0"
            step="any"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </Field>
      ) : tracking.mode === "milestones" ? (
        <Field label="Progression plan">
          <SelectInput value={tracking.plan_id} onChange={(e) => change("plan_id", e.target.value)}>
            <option value="">Choose a plan</option>
            {(plans.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : (
        <>
          {tracking.mode !== "count" && (
            <Field label="Measure">
              <SelectInput
                value={tracking.measure}
                onChange={(e) => change("measure", e.target.value as GoalTracking["measure"])}
              >
                <option value="distance_m">Distance</option>
                <option value="duration_seconds">Session duration (seconds)</option>
                <option value="weight">Exercise load (kg)</option>
                <option value="reps">Exercise reps</option>
                <option value="seconds">Continuous exercise hold (seconds)</option>
                <option value="score">Workout score (higher)</option>
              </SelectInput>
            </Field>
          )}
          {tracking.measure === "distance_m" && tracking.mode !== "count" && (
            <Field label="Distance unit">
              <SelectInput value={tracking.unit} onChange={(e) => change("unit", e.target.value)}>
                <option value="miles">Miles</option>
                <option value="km">Kilometres</option>
                <option value="m">Metres</option>
              </SelectInput>
            </Field>
          )}
          <Field label="Training type filter">
            <SelectInput value={tracking.kind} onChange={(e) => change("kind", e.target.value)}>
              <option value="">All types</option>
              {FITNESS_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Exercise filter (exact name)">
            <TextInput
              value={tracking.exercise}
              onChange={(e) => change("exercise", e.target.value)}
              placeholder="e.g. Bench press or Plank"
            />
          </Field>
          <Field label="Variation filter (optional exact match)">
            <TextInput
              value={tracking.variation}
              onChange={(e) => change("variation", e.target.value)}
              placeholder="e.g. strict or road"
            />
          </Field>
          {!!tracking.exercise && (
            <>
              <Field label="Load type filter">
                <SelectInput
                  value={tracking.load_type}
                  onChange={(e) => change("load_type", e.target.value)}
                >
                  <option value="">All load types</option>
                  <option value="external">External weight</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="added">Added weight</option>
                  <option value="assisted">Assistance</option>
                </SelectInput>
              </Field>
              <Field label="Side filter">
                <SelectInput value={tracking.side} onChange={(e) => change("side", e.target.value)}>
                  <option value="">All sides</option>
                  <option>both</option>
                  <option>left</option>
                  <option>right</option>
                </SelectInput>
              </Field>
            </>
          )}
          {tracking.measure === "weight" && (
            <Field label="Minimum reps at this load">
              <TextInput
                type="number"
                min="1"
                step="1"
                value={tracking.min_reps}
                onChange={(e) => change("min_reps", Number(e.target.value))}
              />
            </Field>
          )}
          <p className="text-xs text-muted-foreground">
            {tracking.mode === "best"
              ? "Uses one completed performance, never the sum of several holds. Higher values count as progress."
              : "Uses actual activity dates, not scheduled task dates."}{" "}
            Counts update from session history; completing a daily task does not automatically
            achieve a goal.
          </p>
        </>
      )}
      <Field label="Horizon">
        <SelectInput value={horizon} onChange={(e) => setHorizon(e.target.value)}>
          <option value="vision">Long term / no fixed deadline</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </SelectInput>
      </Field>
      <Field label="Tracking period">
        <SelectInput
          value={tracking.period}
          onChange={(e) => {
            const period = e.target.value as GoalTracking["period"];
            const bounds = periodBounds(period, todayISO());
            setTracking((t) => ({ ...t, period, ...bounds }));
            if (period === "week") setHorizon("weekly");
            if (period === "month") setHorizon("monthly");
          }}
        >
          <option value="all">All time</option>
          <option value="week">This calendar week</option>
          <option value="month">This calendar month</option>
          <option value="custom">Custom dates</option>
        </SelectInput>
      </Field>
      {tracking.period !== "all" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period start">
            <TextInput
              type="date"
              value={tracking.start}
              onChange={(e) => change("start", e.target.value)}
            />
          </Field>
          <Field label="Period end">
            <TextInput
              type="date"
              value={tracking.end}
              onChange={(e) => change("end", e.target.value)}
            />
          </Field>
        </div>
      )}
      <Field label="Target date (optional)">
        <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <FitnessError error={save.error} />
      <PrimaryButton disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save goal"}
      </PrimaryButton>
    </FormSheet>
  );
}
export function FitnessGoals({ allSections = false }: { allSections?: boolean }) {
  const goals = useQuery(goalsQuery);
  const refresh = useFitnessRefresh();
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "done" | "archived" }) =>
      setGoalStatus(id, status),
    onSuccess: refresh,
  });
  const rows = (goals.data ?? []).filter(
    (g) => (allSections || g.pillar === "fitness") && (showPaused || g.status === "active"),
  );
  return (
    <>
      <Card>
        <SectionTitle>{allSections ? "App-wide goals" : "Fitness goals"}</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          One goal system across the app. Set a single performance, total, consistency or skill
          milestone.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setEditing("new")}>Add linked or manual goal</PrimaryButton>
        </div>
      </Card>
      <FitnessError error={goals.error ?? update.error} retry={() => goals.refetch()} />
      <button
        className="min-h-11 text-sm font-bold underline"
        onClick={() => setShowPaused((v) => !v)}
      >
        {showPaused ? "Hide paused and completed" : "Show paused and completed"}
      </button>
      {!goals.isError && !rows.length && (
        <Card>
          <Empty>Add a goal to see your progress here and in Plan.</Empty>
        </Card>
      )}
      {rows.map((g) => {
        const t = object(g.tracking);
        return (
          <Card key={g.id}>
            <p className="font-extrabold">{g.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {g.horizon} · {g.status} · {String(t["mode"] ?? "manual")}
              {t["start"] ? ` · ${String(t["start"])} to ${String(t["end"])}` : ""}
            </p>
            <p className="my-3 text-sm font-bold">
              {g.current_value} / {g.target_value ?? "—"} {g.metric ?? ""}
            </p>
            <Bar pct={progressPct(g.current_value, g.target_value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                onClick={() => setEditing(g)}
              >
                Edit / progress
              </button>
              <button
                className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ id: g.id, status: g.status === "active" ? "archived" : "active" })
                }
              >
                {g.status === "active" ? "Pause" : "Resume"}
              </button>
              {g.status === "active" && (
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: g.id, status: "done" })}
                >
                  Mark achieved
                </button>
              )}
            </div>
          </Card>
        );
      })}
      {editing && (
        <GoalEditor
          onClose={() => setEditing(null)}
          goal={editing === "new" ? undefined : editing}
        />
      )}
    </>
  );
}
