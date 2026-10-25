import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "./AppShell";
import {
  Empty,
  Field,
  FormSheet,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "./ui";
import { FitnessError, SessionComposer, setLabel, useFitnessRefresh } from "./FitnessSession";
import { MOVEMENTS, STARTERS, PLAN_STARTERS, type Movement } from "@/lib/fitness-library";
import {
  emptyDetails,
  emptySet,
  FITNESS_KINDS,
  fitnessPlansQuery,
  fitnessPreferencesQuery,
  fitnessTemplatesQuery,
  object,
  saveFitnessPlan,
  saveFitnessTemplate,
  savePreferences,
  SLOTS,
  templatePayload,
} from "@/lib/fitness";
import type {
  FitnessPlan,
  FitnessSet,
  FitnessSlot,
  FitnessTemplate,
  PlanStep,
} from "@/lib/fitness-types";
import type { Json } from "@/integrations/supabase/types";

export function TemplateEditor({
  onClose,
  template,
  duplicate = false,
}: {
  onClose: () => void;
  template?: FitnessTemplate | undefined;
  duplicate?: boolean;
}) {
  const refresh = useFitnessRefresh();
  const original = templatePayload(template ?? null);
  const [name, setName] = useState(template ? `${template.name}${duplicate ? " copy" : ""}` : "");
  const [kind, setKind] = useState(template?.kind ?? "gym");
  const [slot, setSlot] = useState<FitnessSlot>(template?.slot ?? "strength");
  const [instructions, setInstructions] = useState(original.instructions);
  const [source, setSource] = useState(original.source);
  const [sets, setSets] = useState<FitnessSet[]>(original.sets);
  const [details, setDetails] = useState(original.details);
  const update = (i: number, patch: Partial<FitnessSet>) =>
    setSets((ss) => ss.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  const save = useMutation({
    mutationFn: () => {
      if (source && !/^https?:\/\//i.test(source))
        throw new Error("Use a full https:// reference address or leave it blank.");
      if (sets.some((s) => !s.exercise.trim()))
        throw new Error("Name each movement or remove its row.");
      if (
        sets.some((s) =>
          [s.reps, s.weight, s.seconds, s.rest_seconds, s.distance_m].some(
            (v) => v !== null && (!Number.isFinite(v) || v < 0),
          ),
        )
      )
        throw new Error("Planned values must be zero or positive.");
      return saveFitnessTemplate({
        ...(template && !duplicate ? { id: template.id, version: template.version + 1 } : {}),
        name,
        kind,
        slot,
        payload: {
          instructions,
          source,
          sets: sets as unknown as Json,
          details: { ...details, slot } as unknown as Json,
        },
      });
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
      title={template ? (duplicate ? "Duplicate workout" : "Edit saved workout") : "Create workout"}
    >
      <Field label="Workout name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Training type">
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value)}>
            {FITNESS_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Daily slot">
          <SelectInput value={slot} onChange={(e) => setSlot(e.target.value as FitnessSlot)}>
            {SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label="Instructions / sequence / scoring rules">
        <TextArea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </Field>
      <Field label="Original reference (optional URL)">
        <TextInput value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
      <Field label="Variation / scaling">
        <TextInput
          value={details.variation}
          onChange={(e) => setDetails((d) => ({ ...d, variation: e.target.value }))}
        />
      </Field>
      {sets.map((s, i) => (
        <div key={i} className="space-y-2 rounded-2xl border p-3">
          <Field label={`Movement ${i + 1}`}>
            <TextInput
              value={s.exercise}
              onChange={(e) => update(i, { exercise: e.target.value })}
            />
          </Field>
          <Field label={`Movement ${i + 1} load type`}>
            <SelectInput
              value={s.load_type}
              onChange={(e) => update(i, { load_type: e.target.value as FitnessSet["load_type"] })}
            >
              <option value="external">External weight</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="added">Added weight</option>
              <option value="assisted">Assistance</option>
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(["weight", "reps", "seconds", "rest_seconds", "distance_m"] as const).map((k) => (
              <Field key={k} label={`Planned ${k.replaceAll("_", " ")}`}>
                <TextInput
                  type="number"
                  min="0"
                  step={k === "reps" ? "1" : "any"}
                  value={s[k] ?? ""}
                  onChange={(e) =>
                    update(i, { [k]: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </Field>
            ))}
          </div>
          <Field label={`Movement ${i + 1} cue`}>
            <TextInput value={s.notes} onChange={(e) => update(i, { notes: e.target.value })} />
          </Field>
          <button
            type="button"
            className="min-h-11 text-sm font-bold underline"
            onClick={() => setSets((rows) => rows.filter((_, n) => n !== i))}
          >
            Remove movement {i + 1}
          </button>
        </div>
      ))}
      <GhostButton onClick={() => setSets((rows) => [...rows, emptySet()])}>
        Add movement / round
      </GhostButton>
      {template && !duplicate && (
        <p className="text-xs text-muted-foreground">
          Saves version {template.version + 1}. Previous session snapshots and results remain
          unchanged.
        </p>
      )}
      <FitnessError error={save.error} />
      <PrimaryButton disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save repeatable workout"}
      </PrimaryButton>
    </FormSheet>
  );
}
export function SavedWorkouts() {
  const templates = useQuery(fitnessTemplatesQuery);
  const refresh = useFitnessRefresh();
  const [edit, setEdit] = useState<{ template?: FitnessTemplate; duplicate?: boolean } | null>(
    null,
  );
  const [start, setStart] = useState<FitnessTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const add = useMutation({
    mutationFn: (i: number) => saveFitnessTemplate(STARTERS[i]!),
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: async (t: FitnessTemplate) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("fitness_templates")
        .update({ archived: !t.archived })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return (
    <>
      <Card>
        <SectionTitle>Repeatable workouts</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Your lifts, Cindy, circuits, bag drills and anything you add later. Templates are plans;
          logged results stay separate.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setEdit({})}>Create workout</PrimaryButton>
        </div>
      </Card>
      <FitnessError
        error={templates.error ?? add.error ?? archive.error}
        retry={() => templates.refetch()}
      />
      <Card>
        <SectionTitle>Starter formats</SectionTitle>
        <div className="mt-3 space-y-2">
          {STARTERS.map((s, i) => {
            const exists = templates.data?.some((t) => t.name === s.name && !t.archived);
            return (
              <button
                key={s.name}
                disabled={exists || add.isPending || templates.isError}
                className="flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left text-sm disabled:opacity-60"
                onClick={() => add.mutate(i)}
              >
                <span className="font-bold">{s.name}</span>
                <span>{exists ? "In library" : "Add format"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Custom formats are labelled as such. Bag drills do not claim to reproduce Bas Rutten’s
          programme.
        </p>
      </Card>
      <button
        className="min-h-11 text-sm font-bold underline"
        onClick={() => setShowArchived((v) => !v)}
      >
        {showArchived ? "Hide archived" : "Show archived"}
      </button>
      {(templates.data ?? [])
        .filter((t) => showArchived || !t.archived)
        .map((t) => {
          const payload = templatePayload(t);
          return (
            <Card key={t.id}>
              <p className="font-extrabold">{t.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.kind} · {t.slot} · version {t.version}
                {t.archived ? " · archived" : ""}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{payload.instructions}</p>
              {!!payload.sets.length && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {payload.sets.map((s, i) => (
                    <li key={i}>
                      {s.exercise}: {setLabel(s)}
                    </li>
                  ))}
                </ul>
              )}
              {payload.source && (
                <a
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-bold underline"
                  href={payload.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Workout reference
                </a>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!t.archived && (
                  <button
                    className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                    onClick={() => setStart(t)}
                  >
                    Start workout
                  </button>
                )}
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  onClick={() => setEdit({ template: t })}
                >
                  Edit
                </button>
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  onClick={() => setEdit({ template: t, duplicate: true })}
                >
                  Duplicate
                </button>
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate(t)}
                >
                  {t.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </Card>
          );
        })}
      {edit && (
        <TemplateEditor
          onClose={() => setEdit(null)}
          template={edit.template}
          duplicate={edit.duplicate ?? false}
        />
      )}
      {start && (
        <SessionComposer template={start} initialSlot={start.slot} onClose={() => setStart(null)} />
      )}
    </>
  );
}
export function MovementLibrary() {
  const preferences = useQuery(fitnessPreferencesQuery);
  const refresh = useFitnessRefresh();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Movement | null>(null);
  const [log, setLog] = useState<Movement | null>(null);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState({
    name: "",
    category: "Custom",
    cue: "",
    kind: "skills",
    purpose: "strength",
  });
  const prefs = preferences.data ?? {};
  const favourites = Array.isArray(prefs["favourites"]) ? (prefs["favourites"] as string[]) : [];
  const later = Array.isArray(prefs["try_later"]) ? (prefs["try_later"] as string[]) : [];
  const own = Array.isArray(prefs["custom_movements"])
    ? (prefs["custom_movements"] as unknown as Movement[])
    : [];
  const library = [...MOVEMENTS, ...own];
  const toggle = useMutation({
    mutationFn: ({ key, id }: { key: "favourites" | "try_later"; id: string }) => {
      const values = key === "favourites" ? favourites : later;
      return savePreferences({
        [key]: values.includes(id) ? values.filter((v) => v !== id) : [...values, id],
      });
    },
    onSuccess: refresh,
  });
  const saveCustom = useMutation({
    mutationFn: () =>
      savePreferences({
        custom_movements: [
          ...own,
          {
            ...custom,
            id: crypto.randomUUID(),
            equipment: "Your setup",
            reference: "",
            referenceName: "Your movement",
            caution: "User-created entry; no source verification is implied.",
          },
        ] as unknown as Json,
      }),
    onSuccess: async () => {
      await refresh();
      setAdding(false);
      setCustom({ name: "", category: "Custom", cue: "", kind: "skills", purpose: "strength" });
    },
  });
  const rows = library.filter(
    (m) =>
      (!category || m.category === category) &&
      `${m.name} ${m.category} ${m.equipment}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || (filter === "favourites" ? favourites : later).includes(m.id)),
  );
  return (
    <>
      <Card>
        <SectionTitle>Movement library</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Strength, core, neck, skills and recovery. Explore, save for later, then log your actual
          practice.
        </p>
        <div className="mt-3">
          <GhostButton onClick={() => setAdding(true)}>Add your own movement</GhostButton>
        </div>
      </Card>
      <FitnessError error={preferences.error ?? toggle.error} retry={() => preferences.refetch()} />
      <Field label="Find movements">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Core, wrists, handstand, balance…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Movement category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {[...new Set(library.map((m) => m.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Library view">
          <SelectInput value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Explore all</option>
            <option value="favourites">Favourites</option>
            <option value="later">Try later</option>
          </SelectInput>
        </Field>
      </div>
      {!rows.length && (
        <Card>
          <Empty>No matches. Change your filters or add your own movement.</Empty>
        </Card>
      )}
      {rows.map((m) => (
        <button
          key={m.id}
          className="w-full rounded-3xl bg-card p-5 text-left shadow-card"
          onClick={() => setSelected(m)}
        >
          <p className="font-extrabold">
            {m.name}
            {favourites.includes(m.id) ? " · Favourite" : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {m.category} · {m.purpose} · {m.equipment}
          </p>
          <p className="mt-2 text-sm">{m.cue}</p>
        </button>
      ))}
      {selected && (
        <FormSheet
          open
          onOpenChange={(v) => {
            if (!v) setSelected(null);
          }}
          title={selected.name}
        >
          <p className="text-sm font-bold">
            {selected.category} · {selected.purpose}
          </p>
          <p className="text-sm">{selected.cue}</p>
          {selected.caution && (
            <p className="rounded-2xl bg-secondary p-3 text-sm">{selected.caution}</p>
          )}
          {selected.reference ? (
            <>
              <a
                href={selected.reference}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center font-bold underline"
              >
                {selected.referenceName}
              </a>
              <p className="text-xs text-muted-foreground">
                Source-linked reference, not individual medical advice or an independently verified
                “optimal” programme. General and related references are labelled.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Custom entry. No external verification claimed.
            </p>
          )}
          <PrimaryButton
            onClick={() => {
              setLog(selected);
              setSelected(null);
            }}
          >
            Log practice / sets
          </PrimaryButton>
          <GhostButton
            disabled={toggle.isPending || preferences.isError}
            onClick={() => toggle.mutate({ key: "favourites", id: selected.id })}
          >
            {favourites.includes(selected.id) ? "Remove favourite" : "Add favourite"}
          </GhostButton>
          <GhostButton
            disabled={toggle.isPending || preferences.isError}
            onClick={() => toggle.mutate({ key: "try_later", id: selected.id })}
          >
            {later.includes(selected.id) ? "Remove from try later" : "Save to try later"}
          </GhostButton>
        </FormSheet>
      )}
      {log && (
        <SessionComposer movement={log} initialSlot={log.purpose} onClose={() => setLog(null)} />
      )}
      {adding && (
        <FormSheet
          open
          onOpenChange={(v) => {
            if (!v) setAdding(false);
          }}
          title="Add movement"
        >
          <Field label="Movement name">
            <TextInput
              value={custom.name}
              onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={custom.category}
              onChange={(e) => setCustom((c) => ({ ...c, category: e.target.value }))}
            />
          </Field>
          <Field label="Purpose">
            <SelectInput
              value={custom.purpose}
              onChange={(e) => setCustom((c) => ({ ...c, purpose: e.target.value }))}
            >
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Training type">
            <SelectInput
              value={custom.kind}
              onChange={(e) => setCustom((c) => ({ ...c, kind: e.target.value }))}
            >
              {FITNESS_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Your instructions / standard">
            <TextArea
              value={custom.cue}
              onChange={(e) => setCustom((c) => ({ ...c, cue: e.target.value }))}
            />
          </Field>
          <FitnessError error={saveCustom.error} />
          <PrimaryButton
            disabled={!custom.name.trim() || saveCustom.isPending}
            onClick={() => saveCustom.mutate()}
          >
            Save movement
          </PrimaryButton>
        </FormSheet>
      )}
    </>
  );
}
export function PlanEditor({
  onClose,
  plan,
  starter,
}: {
  onClose: () => void;
  plan?: FitnessPlan | undefined;
  starter?: (typeof PLAN_STARTERS)[number] | undefined;
}) {
  const refresh = useFitnessRefresh();
  const [name, setName] = useState(plan?.name ?? starter?.name ?? "");
  const [kind, setKind] = useState(plan?.kind ?? starter?.kind ?? "skills");
  const [target, setTarget] = useState(plan?.target ?? starter?.target ?? "");
  const [notes, setNotes] = useState(
    plan?.notes ??
      (starter
        ? `Editable roadmap framework, not a personalised programme. Reference: ${starter.reference}`
        : ""),
  );
  const [steps, setSteps] = useState<PlanStep[]>(
    plan && Array.isArray(plan.steps)
      ? (plan.steps as unknown as PlanStep[])
      : starter
        ? starter.steps.map((title) => ({
            id: crypto.randomUUID(),
            title,
            criterion: "",
            complete: false,
          }))
        : [],
  );
  const save = useMutation({
    mutationFn: () => {
      if (!steps.length || steps.some((s) => !s.title.trim()))
        throw new Error("Add at least one named milestone.");
      return saveFitnessPlan({
        ...(plan ? { id: plan.id } : {}),
        name,
        kind,
        target,
        notes,
        steps: steps as unknown as Json,
      });
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
      title={plan ? "Edit roadmap" : "Create roadmap"}
    >
      <Field label="Plan name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Training type">
        <SelectInput value={kind} onChange={(e) => setKind(e.target.value)}>
          {FITNESS_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Final target / movement standard">
        <TextInput value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      {steps.map((s, i) => (
        <div key={s.id} className="space-y-2 rounded-2xl border p-3">
          <Field label={`Milestone ${i + 1}`}>
            <TextInput
              value={s.title}
              onChange={(e) =>
                setSteps((rows) =>
                  rows.map((r) => (r.id === s.id ? { ...r, title: e.target.value } : r)),
                )
              }
            />
          </Field>
          <Field label={`Milestone ${i + 1} progression criterion`}>
            <TextArea
              value={s.criterion}
              onChange={(e) =>
                setSteps((rows) =>
                  rows.map((r) => (r.id === s.id ? { ...r, criterion: e.target.value } : r)),
                )
              }
              placeholder="Define controlled reps, duration, assistance or technique criteria"
            />
          </Field>
          {s.complete && <p className="text-xs font-bold">Previously confirmed complete</p>}
          <button
            className="min-h-11 text-sm font-bold underline"
            onClick={() => setSteps((rows) => rows.filter((r) => r.id !== s.id))}
          >
            Remove milestone {i + 1}
          </button>
        </div>
      ))}
      <GhostButton
        onClick={() =>
          setSteps((rows) => [
            ...rows,
            { id: crypto.randomUUID(), title: "", criterion: "", complete: false },
          ])
        }
      >
        Add milestone
      </GhostButton>
      <Field label="Plan notes / sources">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <FitnessError error={save.error} />
      <PrimaryButton disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
        Save roadmap
      </PrimaryButton>
    </FormSheet>
  );
}
export function FitnessPlans() {
  const plans = useQuery(fitnessPlansQuery);
  const refresh = useFitnessRefresh();
  const [edit, setEdit] = useState<{
    plan?: FitnessPlan;
    starter?: (typeof PLAN_STARTERS)[number];
  } | null>(null);
  const [log, setLog] = useState<FitnessPlan | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const toggle = useMutation({
    mutationFn: ({ plan, id }: { plan: FitnessPlan; id: string }) => {
      const steps = (plan.steps as unknown as PlanStep[]).map((s) =>
        s.id === id ? { ...s, complete: !s.complete } : s,
      );
      return saveFitnessPlan({ ...plan, steps: steps as unknown as Json });
    },
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: async (p: FitnessPlan) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("fitness_plans")
        .update({ archived: !p.archived })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return (
    <>
      <Card>
        <SectionTitle>Plans & progressions</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Your road to a hold, handstand, stronger core or weight target. Milestones are confirmed
          by you, never guessed from a tick.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => setEdit({})}>Build a roadmap</PrimaryButton>
        </div>
      </Card>
      <Card>
        <SectionTitle>Editable starting frameworks</SectionTitle>
        <div className="mt-3 space-y-2">
          {PLAN_STARTERS.map((s) => (
            <button
              key={s.name}
              className="min-h-12 w-full rounded-xl border px-3 text-left text-sm font-bold"
              onClick={() => setEdit({ starter: s })}
            >
              {s.name}
            </button>
          ))}
        </div>
      </Card>
      <FitnessError
        error={plans.error ?? toggle.error ?? archive.error}
        retry={() => plans.refetch()}
      />
      <button
        className="min-h-11 text-sm font-bold underline"
        onClick={() => setShowArchived((v) => !v)}
      >
        {showArchived ? "Hide paused roadmaps" : "Show paused roadmaps"}
      </button>
      {(plans.data ?? [])
        .filter((p) => showArchived || !p.archived)
        .map((p) => {
          const steps = Array.isArray(p.steps) ? (p.steps as unknown as PlanStep[]) : [];
          return (
            <Card key={p.id}>
              <p className="font-extrabold">
                {p.name}
                {p.archived ? " · paused" : ""}
              </p>
              <p className="mt-1 text-sm">{p.target}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {steps.filter((s) => s.complete).length} / {steps.length} milestones confirmed
              </p>
              <div className="mt-3 space-y-2">
                {steps.map((s) => (
                  <label
                    key={s.id}
                    className="flex min-h-12 items-start gap-3 rounded-xl border p-3"
                  >
                    <input
                      className="mt-1 h-5 w-5 shrink-0"
                      type="checkbox"
                      checked={s.complete}
                      disabled={toggle.isPending || p.archived}
                      onChange={() => toggle.mutate({ plan: p, id: s.id })}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="font-bold">{s.title}</span>
                      {s.criterion && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {s.criterion}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              {p.notes && (
                <p className="mt-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {p.notes.split(/(https?:\/\/\S+)/g).map((part, i) =>
                    /^https?:\/\//.test(part) ? (
                      <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center font-bold underline"
                      >
                        Plan reference
                      </a>
                    ) : (
                      part
                    ),
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!p.archived && (
                  <button
                    className="min-h-11 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
                    onClick={() => setLog(p)}
                  >
                    Log plan practice
                  </button>
                )}
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  onClick={() => setEdit({ plan: p })}
                >
                  Edit roadmap
                </button>
                <button
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate(p)}
                >
                  {p.archived ? "Resume" : "Pause"}
                </button>
              </div>
            </Card>
          );
        })}
      {edit && <PlanEditor {...edit} onClose={() => setEdit(null)} />}
      {log && (
        <SessionComposer
          movement={{ name: log.name, kind: log.kind }}
          onClose={() => setLog(null)}
        />
      )}
    </>
  );
}
