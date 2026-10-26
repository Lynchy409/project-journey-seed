import { SpeakButton, VoiceInput } from "./spanish/VoiceControls";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronRight,
  Headphones,
  MessageCircle,
  Route as RouteIcon,
  RotateCcw,
} from "lucide-react";
import { Card } from "./AppShell";
import {
  Chip,
  Empty,
  Field,
  GhostButton,
  PrimaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "./ui";
import {
  CAN_DO,
  DEFAULT_SPANISH_PROFILE,
  SPANISH_DISCOVERY,
  SPANISH_SOURCES,
  dailySpanishTasks,
  dueRules,
  findSpanish,
  isRuleWorthSaving,
  itemData,
  recordSpanishActivity,
  reviewRule,
  safeSpanishURL,
  saveSpanish,
  spanishActivitiesQuery,
  spanishItemsQuery,
  spanishQueryKey,
  listeningGuidance,
  spanishAbility,
  mergeSpanishRule,
} from "@/lib/spanish";
import type { SpanishAIResponse } from "@/lib/spanish-ai";
import { requestSpanishAI as spanishAI } from "@/lib/spanish-client";
import { SpanishConnectionChecks } from "./spanish/SpanishConnectionChecks";
import { canAwardSpanishPractice } from "@/lib/spanish-ai";
import type {
  ConversationData,
  DailySpanishTask,
  ListeningContent,
  RuleMistake,
  SpanishItem,
  SpanishKind,
  SpanishProfile,
} from "@/lib/spanish-types";
import { addDays, iso, parseISO, todayISO } from "@/lib/dates";
import { LanguageTransferPlayer } from "./spanish/LanguageTransferPlayer";

function useWorkspaceState() {
  const query = useQuery(spanishItemsQuery);
  const history = useQuery(spanishActivitiesQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const items = query.data ?? [];
  const profileItem = findSpanish(items, "profile", "main");
  const profile = profileItem
    ? { ...DEFAULT_SPANISH_PROFILE, ...itemData<SpanishProfile>(profileItem) }
    : null;
  const get = (kind: SpanishKind, key: string) =>
    findSpanish(qc.getQueryData<SpanishItem[]>(spanishQueryKey) ?? [], kind, key);
  async function save(kind: SpanishKind, key: string, data: object) {
    const current = findSpanish(qc.getQueryData<SpanishItem[]>(spanishQueryKey) ?? [], kind, key);
    const saved = await saveSpanish(kind, key, data, current);
    qc.setQueryData<SpanishItem[]>(spanishQueryKey, (before = []) => [
      ...before.filter((item) => item.id !== saved.id),
      saved,
    ]);
    return saved;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "This action was not confirmed. Your input has been kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function activity(
    kind: string,
    evidence: object,
    task?: SpanishItem,
    seconds = 0,
    id: string = crypto.randomUUID(),
  ) {
    await recordSpanishActivity({
      id,
      date: task ? itemData<DailySpanishTask>(task).date : todayISO(),
      kind,
      ...(task ? { task } : {}),
      seconds,
      evidence,
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: spanishQueryKey }),
      qc.invalidateQueries({ queryKey: ["spanish", "activities"] }),
    ]);
  }
  async function rules(result: SpanishAIResponse, occurrence: string, originalMessage: string) {
    for (const rule of result.rules.filter(isRuleWorthSaving)) {
      if (!originalMessage.includes(rule.original)) continue;
      const existing = findSpanish(
        qc.getQueryData<SpanishItem[]>(spanishQueryKey) ?? [],
        "mistake",
        rule.rule_id,
      );
      const old = existing ? itemData<RuleMistake & { occurrences?: string[] }>(existing) : null;
      if (old?.occurrences?.includes(occurrence)) continue;
      await save("mistake", rule.rule_id, mergeSpanishRule(old, rule, occurrence));
    }
  }
  return {
    query,
    items,
    history,
    profile,
    busy,
    message,
    setMessage,
    save,
    get,
    run,
    activity,
    rules,
  };
}
type Workspace = ReturnType<typeof useWorkspaceState>;
const SpanishContext = createContext<Workspace | null>(null);
function useSpanish() {
  const state = useContext(SpanishContext);
  if (!state) throw new Error("Spanish workspace missing");
  return state;
}
function SpanishProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  return (
    <SpanishContext.Provider value={state}>
      {state.query.isPending ? (
        <Card>
          <p>Loading your Spanish workspace…</p>
        </Card>
      ) : state.query.isError && !state.query.data ? (
        <Card>
          <p role="alert" className="text-sm">
            {state.query.error.message}
          </p>
          <GhostButton onClick={() => void state.query.refetch()}>
            Retry loading Spanish
          </GhostButton>
        </Card>
      ) : (
        <>
          {state.query.isError && (
            <Card>
              <p role="alert" className="text-sm">
                Showing saved Spanish data; refresh failed: {state.query.error.message}
              </p>
            </Card>
          )}
          {state.message && (
            <Card>
              <p role="alert" className="break-words text-sm">
                {state.message}
              </p>
              <GhostButton onClick={() => state.setMessage("")}>Dismiss message</GhostButton>
            </Card>
          )}
          {children}
        </>
      )}
    </SpanishContext.Provider>
  );
}
type Section = "today" | "roadmap" | "listen" | "conversation" | "fixer" | "practice";
const SECTIONS: { id: Section; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "roadmap", title: "Roadmap" },
  { id: "listen", title: "Listen" },
  { id: "conversation", title: "Converse" },
  { id: "fixer", title: "Mistake fixer" },
  { id: "practice", title: "Practice" },
];
function sectionFor(task: DailySpanishTask): Section {
  return task.action === "listen" ? "listen" : task.action === "review" ? "fixer" : task.action;
}
export function SpanishHub({ initialTask }: { initialTask?: string | undefined }) {
  return (
    <>
      <SpanishConnectionChecks />
      <SpanishProvider>
        <SpanishWorkspace initialTask={initialTask} />
      </SpanishProvider>
    </>
  );
}
function SpanishWorkspace({ initialTask }: { initialTask?: string | undefined }) {
  const w = useSpanish();
  const [section, setSection] = useState<Section>("today");
  const [taskId, setTaskId] = useState<string | undefined>(initialTask);
  const [editingProfile, setEditingProfile] = useState(false);
  const appliedInitialTask = useRef<string | undefined>(undefined);
  const task = w.items.find(
    (item) =>
      item.id === taskId &&
      item.kind === "task" &&
      itemData<DailySpanishTask>(item).status === "planned",
  );
  useEffect(() => {
    if (!initialTask) {
      appliedInitialTask.current = undefined;
      return;
    }
    if (appliedInitialTask.current === initialTask) return;
    const found = w.items.find((item) => item.id === initialTask && item.kind === "task");
    if (found) {
      appliedInitialTask.current = initialTask;
      setTaskId(found.id);
      setSection(sectionFor(itemData<DailySpanishTask>(found)));
    }
  }, [initialTask, w.items]);
  if (!w.profile || editingProfile)
    return <SpanishProfileForm onSaved={() => setEditingProfile(false)} />;
  const activeTask =
    task && sectionFor(itemData<DailySpanishTask>(task)) === section
      ? task
      : w.items.find(
          (item) =>
            item.kind === "task" &&
            itemData<DailySpanishTask>(item).date === todayISO() &&
            itemData<DailySpanishTask>(item).status === "planned" &&
            sectionFor(itemData<DailySpanishTask>(item)) === section,
        );
  return (
    <div className="space-y-4">
      <Card className="!bg-primary !text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">
          Your road to fluent Spanish
        </p>
        <h2 className="mt-2 text-xl font-extrabold">{w.profile.goal}</h2>
        <p className="mt-2 text-sm opacity-80">
          Specific daily practice. Rules that return when needed. Progress backed by what you can
          do.
        </p>
        <button
          className="mt-3 min-h-11 text-sm font-bold underline underline-offset-4"
          onClick={() => setEditingProfile(true)}
        >
          Adjust my starting point
        </button>
      </Card>
      <nav aria-label="Spanish sections" className="grid grid-cols-3 gap-2">
        {SECTIONS.map((tab) => (
          <Chip
            key={tab.id}
            active={section === tab.id}
            onClick={() => setSection(tab.id)}
            className="min-h-11 !px-2"
          >
            {tab.title}
          </Chip>
        ))}
      </nav>
      {activeTask && (
        <Card>
          <p className="text-xs font-bold uppercase text-muted-foreground">Connected daily task</p>
          <p className="mt-1 font-bold">{itemData<DailySpanishTask>(activeTask).title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {itemData<DailySpanishTask>(activeTask).target}
          </p>
        </Card>
      )}
      {section === "today" && (
        <DailyTasks
          date={todayISO()}
          onStart={(item) => {
            setTaskId(item.id);
            setSection(sectionFor(itemData<DailySpanishTask>(item)));
          }}
        />
      )}
      {section === "roadmap" && <Roadmap />}
      {section === "listen" && <Listening task={activeTask} />}
      {section === "conversation" && <Conversation task={activeTask} />}
      {section === "fixer" && <MistakeFixer task={activeTask} />}
      {section === "practice" && <Practice task={activeTask} />}
    </div>
  );
}
function SpanishProfileForm({ onSaved }: { onSaved: () => void }) {
  const w = useSpanish();
  const [profile, setProfile] = useState<SpanishProfile>(w.profile ?? DEFAULT_SPANISH_PROFILE);
  return (
    <Card>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void w.run(async () => {
            await w.save("profile", "main", profile);
            onSaved();
          });
        }}
      >
        <div>
          <h2 className="text-lg font-extrabold">Start where you actually are</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You are not being placed in a beginner course. Choose the next useful challenge for each
            skill; these are self-assessments, not certified levels.
          </p>
        </div>
        <Field label="What do you want to be able to do?">
          <TextArea
            required
            maxLength={400}
            value={profile.goal}
            onChange={(event) => setProfile({ ...profile, goal: event.target.value })}
          />
        </Field>
        <Field label="Interests and real-life situations">
          <TextInput
            maxLength={300}
            placeholder="Travel, fitness, work, meeting people…"
            value={profile.interests}
            onChange={(event) => setProfile({ ...profile, interests: event.target.value })}
          />
        </Field>
        <Field label="Spanish variety">
          <SelectInput
            value={profile.variety}
            onChange={(event) => setProfile({ ...profile, variety: event.target.value })}
          >
            {["No preference", "Spain", "Mexico", "Latin America (varied)"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </SelectInput>
        </Field>
        {CAN_DO.map((skill) => (
          <Field key={skill.id} label={`Next challenge: ${skill.title}`}>
            <SelectInput
              value={profile.skills[skill.id] ?? 1}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  skills: { ...profile.skills, [skill.id]: Number(event.target.value) },
                })
              }
            >
              {skill.steps.map((step, index) => (
                <option value={index} key={step}>
                  {step}
                </option>
              ))}
            </SelectInput>
          </Field>
        ))}
        <Field label="Language Transfer: next lesson to listen to">
          <TextInput
            type="number"
            min={1}
            max={90}
            required
            value={profile.lt_start}
            onChange={(event) => setProfile({ ...profile, lt_start: Number(event.target.value) })}
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          Earlier lessons will be labelled “previously completed, self-reported”, not imported from
          the separate Language Transfer app. Daily work is about 25 minutes by estimate; meaningful
          activity completion, not waiting for a timer, clears it.
        </p>
        <Field label="What already feels easy or difficult?">
          <TextArea
            maxLength={1500}
            value={profile.notes}
            onChange={(event) => setProfile({ ...profile, notes: event.target.value })}
          />
        </Field>
        <PrimaryButton disabled={w.busy}>Save my Spanish plan</PrimaryButton>
      </form>
    </Card>
  );
}
export function SpanishDailyTasks({ date = todayISO() }: { date?: string }) {
  return (
    <SpanishProvider>
      <DailyTasks date={date} compact />
    </SpanishProvider>
  );
}
function DailyTasks({
  date,
  compact,
  onStart,
}: {
  date: string;
  compact?: boolean;
  onStart?: (item: SpanishItem) => void;
}) {
  const w = useSpanish();
  const creating = useRef("");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(iso(addDays(parseISO(date), 1)));
  const [createError, setCreateError] = useState("");
  const profile = w.profile;
  const tasks = w.items
    .filter((item) => item.kind === "task" && itemData<DailySpanishTask>(item).date === date)
    .sort((a, b) => a.key.localeCompare(b.key));
  const ensureTasks = useCallback(async () => {
    if (!profile) return;
    creating.current = date;
    try {
      const planned = dailySpanishTasks(profile, w.items, date);
      for (const [index, data] of planned.entries())
        if (!findSpanish(w.items, "task", `${date}:${index}`))
          await w.save("task", `${date}:${index}`, data);
      setCreateError("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not prepare daily tasks.");
    }
  }, [profile, w, date]);
  useEffect(() => {
    if (profile && creating.current !== date) void ensureTasks();
  }, [profile, date, ensureTasks]);
  if (!profile)
    return (
      <Card>
        <h2 className="font-extrabold">Spanish, every day</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set your starting point in Learn. Your specific daily activities will appear here
          automatically.
        </p>
        <Link
          className="mt-3 flex min-h-11 items-center gap-2 font-bold"
          to="/learn"
          search={{ area: "spanish" }}
        >
          Set up Spanish <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
    );
  const completed = tasks.filter(
    (item) => itemData<DailySpanishTask>(item).status === "done",
  ).length;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Daily Spanish</h2>
        <span className="text-sm font-bold">
          {completed}/{tasks.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        About {tasks.reduce((sum, item) => sum + itemData<DailySpanishTask>(item).minutes, 0) || 25}{" "}
        minutes of specific activities. No missed-day backlog. Skips are not completions.
      </p>
      {createError && (
        <div role="alert" className="mt-3 text-sm">
          {createError}
          <GhostButton onClick={() => void ensureTasks()}>Retry preparing tasks</GhostButton>
        </div>
      )}
      <ul className="mt-3 space-y-3">
        {tasks.map((item) => {
          const task = itemData<DailySpanishTask>(item);
          return (
            <li key={item.id} className="rounded-2xl border p-3">
              <div className="flex gap-3">
                <span className="mt-1">
                  {task.status === "done" ? (
                    <Check className="h-5 w-5" />
                  ) : task.action === "listen" ? (
                    <Headphones className="h-5 w-5" />
                  ) : task.action === "conversation" ? (
                    <MessageCircle className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.status} · ~{task.minutes} min · {task.date}
                  </p>
                </div>
              </div>
              {task.status === "planned" ? (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
                  {compact ? (
                    <Link
                      className="inline-flex min-h-11 items-center underline"
                      to="/learn"
                      search={{ area: "spanish", task: item.id }}
                    >
                      Open activity
                    </Link>
                  ) : (
                    <button className="min-h-11 underline" onClick={() => onStart?.(item)}>
                      Open activity
                    </button>
                  )}
                  <button
                    disabled={w.busy}
                    className="min-h-11"
                    onClick={() => setMoveId(moveId === item.id ? null : item.id)}
                  >
                    Move
                  </button>
                  <button
                    disabled={w.busy}
                    className="min-h-11"
                    onClick={() =>
                      void w.run(async () => {
                        const choices = dailySpanishTasks(profile, w.items, date);
                        const next =
                          choices[
                            (choices.findIndex((choice) => choice.action === task.action) + 1) %
                              choices.length
                          ];
                        await w.save("task", item.key, { ...task, ...next, date });
                      })
                    }
                  >
                    Swap
                  </button>
                  <button
                    disabled={w.busy}
                    className="min-h-11 text-muted-foreground"
                    onClick={() =>
                      void w.run(async () => {
                        await w.save("task", item.key, { ...task, status: "skipped" });
                      })
                    }
                  >
                    Skip
                  </button>
                </div>
              ) : (
                task.status === "skipped" && (
                  <button
                    className="min-h-11 text-sm font-bold underline"
                    disabled={w.busy}
                    onClick={() =>
                      void w.run(async () => {
                        await w.save("task", item.key, { ...task, status: "planned" });
                      })
                    }
                  >
                    Restore
                  </button>
                )
              )}
              {moveId === item.id && (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void w.run(async () => {
                      await w.save("task", item.key, { ...task, date: moveDate });
                      setMoveId(null);
                    });
                  }}
                >
                  <Field label="Move Spanish activity to">
                    <TextInput
                      type="date"
                      required
                      value={moveDate}
                      onChange={(event) => setMoveDate(event.target.value)}
                    />
                  </Field>
                  <GhostButton disabled={w.busy}>Move this activity</GhostButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
function Roadmap() {
  const w = useSpanish();
  const profile = w.profile!;
  const [evidence, setEvidence] = useState("");
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold">A map, not a fluency percentage</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Input, useful conversation, focused rule practice and reuse of familiar language work
          together. Estimates and task difficulty adapt to your choices and observed mistakes;
          completing a game or video does not prove fluency.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <a
            className="block min-h-11 underline"
            href={SPANISH_SOURCES.cefr}
            target="_blank"
            rel="noreferrer"
          >
            CEFR self-assessment: separate language skills
          </a>
          <a
            className="block min-h-11 underline"
            href={SPANISH_SOURCES.strands}
            target="_blank"
            rel="noreferrer"
          >
            Paul Nation: balancing four strands of language learning
          </a>
        </div>
      </Card>
      <Card>
        <Field label="Evidence from a fresh task or real conversation">
          <TextArea
            maxLength={1500}
            placeholder="What did you actually do, with what support, and what still needs work? At least 20 characters."
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
          />
        </Field>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter evidence here, then attach it to the relevant milestone below. Use a new situation
          as a check, not the same memorised answer. Adjust your next challenge in your
          starting-point settings when ready.
        </p>
      </Card>
      {CAN_DO.map((skill) => (
        <Card key={skill.id}>
          <h3 className="text-lg font-extrabold">{skill.title}</h3>
          <ol className="mt-3 space-y-3">
            {skill.steps.map((step, index) => {
              const milestone = findSpanish(w.items, "milestone", `${skill.id}:${index}`);
              const record = milestone
                ? itemData<{ evidence: string; verified: boolean }>(milestone)
                : null;
              return (
                <li
                  key={step}
                  className={`rounded-2xl border p-3 ${index === profile.skills[skill.id] ? "bg-secondary" : ""}`}
                >
                  <p className="font-bold">{step}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {index === profile.skills[skill.id] ? "Current self-selected challenge. " : ""}
                    {record
                      ? `Evidence saved: ${record.evidence}. Self-reported, not independently verified.`
                      : "No evidence recorded yet."}
                  </p>
                  <button
                    disabled={w.busy || evidence.trim().length < 20}
                    className="mt-1 min-h-11 text-sm font-bold underline disabled:opacity-40"
                    onClick={() =>
                      void w.run(async () => {
                        await w.save("milestone", `${skill.id}:${index}`, {
                          evidence,
                          verified: false,
                          date: todayISO(),
                        });
                        setEvidence("");
                      })
                    }
                  >
                    Save my evidence for this milestone
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
      <Card>
        <h3 className="font-extrabold">Recent practice evidence</h3>
        {w.history.isError ? (
          <p role="alert">{w.history.error.message}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(w.history.data ?? []).slice(0, 12).map((entry) => (
              <li key={entry.id} className="border-t py-2 text-sm">
                {entry.date} · {entry.kind} · {Math.round(entry.seconds / 60)} recorded min
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Activity history is a record of practice, not a certified assessment. Quality and
          independence matter more than a streak.
        </p>
      </Card>
    </div>
  );
}
function Listening({ task }: { task?: SpanishItem | undefined }) {
  const w = useSpanish();
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [outside, setOutside] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [contentId, setContentId] = useState("");
  const eventId = useRef(crypto.randomUUID());
  const lastSavedSeconds = useRef(0);
  const actualSeconds = Math.max(0, sessionSeconds - lastSavedSeconds.current);
  return (
    <div className="space-y-4">
      <LanguageTransferPlayer
        items={w.items}
        startLesson={w.profile!.lt_start}
        onSave={(key, data) => w.save("listening", key, data)}
        onListeningSeconds={setSessionSeconds}
        onError={w.setMessage}
      />
      <Card>
        <h2 className="text-lg font-extrabold">Finish a listening activity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Summarise three key points in your own words. External listening is explicitly
          self-reported; Journey does not watch another app.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void w.run(async () => {
              await w.activity(
                "listen",
                {
                  notes,
                  content_id: contentId || null,
                  source: outside ? "self_reported" : "official_widget",
                  listening_seconds: outside ? null : actualSeconds,
                },
                task,
                outside ? minutes * 60 : actualSeconds,
                eventId.current,
              );
              eventId.current = crypto.randomUUID();
              setNotes("");
              lastSavedSeconds.current = sessionSeconds;
              w.setMessage(
                "Listening saved. The connected daily task was updated without a second log.",
              );
            });
          }}
        >
          <Field label="Which saved item?">
            <SelectInput value={contentId} onChange={(event) => setContentId(event.target.value)}>
              <option value="">Official Language Transfer course / another item</option>
              {w.items
                .filter((item) => item.kind === "content")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {itemData<ListeningContent>(item).title}
                  </option>
                ))}
            </SelectInput>
          </Field>
          <Field label="Your three key points">
            <TextArea
              required
              minLength={30}
              maxLength={3000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={outside}
              onChange={(event) => setOutside(event.target.checked)}
            />
            I listened outside Journey or am reporting listening manually
          </label>
          {outside ? (
            <Field label="Listening minutes (self-reported)">
              <TextInput
                type="number"
                min={1}
                max={240}
                required
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
            </Field>
          ) : (
            <p className="text-sm">
              {Math.floor(actualSeconds)} unlogged seconds of actual playback in this session.
              Seeking and paused time do not count.
            </p>
          )}
          <PrimaryButton disabled={w.busy || (!outside && actualSeconds < 5)}>
            Save listening and update task
          </PrimaryButton>
        </form>
      </Card>
      <ContentLibrary />
    </div>
  );
}
function ContentLibrary() {
  const w = useSpanish();
  const blank: ListeningContent = {
    title: "",
    url: "",
    type: "podcast",
    status: "Saved",
    notes: "",
    transcript: "",
    feedback: "",
    position: "",
  };
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const contents = w.items.filter(
    (item) =>
      item.kind === "content" &&
      (filter === "All" || itemData<ListeningContent>(item).status === filter),
  );
  return (
    <>
      <Card>
        <h2 className="text-lg font-extrabold">Listening library</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void w.run(async () => {
              const url = safeSpanishURL(draft.url);
              if (!url) throw new Error("Use a valid HTTPS address without login credentials.");
              await w.save("content", editing ?? crypto.randomUUID(), { ...draft, url });
              setDraft(blank);
              setEditing(null);
            });
          }}
        >
          <Field label="Title">
            <TextInput
              required
              maxLength={200}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>
          <Field label="Listening URL">
            <TextInput
              type="url"
              required
              value={draft.url}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Format">
              <SelectInput
                value={draft.type}
                onChange={(event) => setDraft({ ...draft, type: event.target.value })}
              >
                {["podcast", "video", "series", "film", "other"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                {["Saved", "In progress", "Finished"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Episode and timestamp (manual resume)">
            <TextInput
              maxLength={200}
              value={draft.position}
              onChange={(event) => setDraft({ ...draft, position: event.target.value })}
            />
          </Field>
          <Field label="Notes">
            <TextArea
              maxLength={3000}
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </Field>
          <Field label="Transcript excerpt for comprehension practice (optional)">
            <TextArea
              maxLength={10000}
              value={draft.transcript}
              onChange={(event) => setDraft({ ...draft, transcript: event.target.value })}
            />
          </Field>
          <Field label="Difficulty feedback">
            <SelectInput
              value={draft.feedback}
              onChange={(event) => setDraft({ ...draft, feedback: event.target.value })}
            >
              {["", "Too easy", "Right challenge", "Too hard"].map((value) => (
                <option key={value} value={value}>
                  {value || "Not rated yet"}
                </option>
              ))}
            </SelectInput>
          </Field>
          <PrimaryButton disabled={w.busy}>
            {editing ? "Update saved item" : "Save listening item"}
          </PrimaryButton>
          {editing && (
            <GhostButton
              type="button"
              onClick={() => {
                setDraft(blank);
                setEditing(null);
              }}
            >
              Cancel editing
            </GhostButton>
          )}
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Saved", "In progress", "Finished"].map((value) => (
            <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
              {value}
            </Chip>
          ))}
        </div>
        <ul className="mt-3 space-y-3">
          {contents.map((item) => {
            const content = itemData<ListeningContent>(item);
            return (
              <li key={item.id} className="rounded-2xl border p-3">
                <p className="font-bold">{content.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {content.type} · {content.status} · {content.feedback || "Not rated"}
                  {content.position && ` · ${content.position}`}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{content.notes}</p>
                <div className="flex gap-4">
                  {safeSpanishURL(content.url) && (
                    <a
                      className="inline-flex min-h-11 items-center text-sm font-bold underline"
                      href={safeSpanishURL(content.url)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open provider
                    </a>
                  )}
                  <button
                    className="min-h-11 text-sm font-bold"
                    onClick={() => {
                      setEditing(item.key);
                      setDraft({ ...blank, ...content });
                    }}
                  >
                    Edit item
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  External playback is not automatically tracked. Save your episode and position
                  manually.
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-extrabold">Find worthwhile listening</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Official publisher links, not invented recommendations. Choose a sample using your
          interests and difficulty feedback; transcript/access details must be checked on the
          provider.
        </p>
        <p className="mt-3 rounded-2xl bg-secondary p-3 text-sm">
          {listeningGuidance(w.items)} Your interests: {w.profile!.interests || "not set yet"}.
          Variety preference: {w.profile!.variety}.
        </p>
        {SPANISH_DISCOVERY.map((resource) => (
          <div key={resource.url} className="mt-4 border-t pt-3">
            <a
              className="inline-flex min-h-11 items-center font-bold underline"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              {resource.title}
            </a>
            <p className="text-sm">{resource.reason}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {resource.level} {resource.access}
            </p>
            <GhostButton
              disabled={w.busy}
              onClick={() =>
                void w.run(async () => {
                  await w.save("content", resource.url, {
                    title: resource.title,
                    url: resource.url,
                    type: "podcast",
                    status: "Saved",
                    notes: resource.reason,
                    transcript: "",
                    feedback: "",
                    position: "",
                  });
                  w.setMessage("Resource saved to your listening library.");
                })
              }
            >
              Save this resource
            </GhostButton>
          </div>
        ))}
      </Card>
    </>
  );
}
function Conversation({ task }: { task?: SpanishItem | undefined }) {
  const w = useSpanish();
  const key = `daily:${todayISO()}`;
  const stored = findSpanish(w.items, "conversation", key);
  const conversation: ConversationData = stored
    ? itemData<ConversationData>(stored)
    : { topic: w.profile!.interests || "Tell me about a recent experience", turns: [] };
  const [topic, setTopic] = useState(
    task ? itemData<DailySpanishTask>(task).title : conversation.topic,
  );
  const [reply, setReply] = useState("");
  const lastLogged = Math.max(
    0,
    ...(w.history.data ?? [])
      .filter(
        (activity) =>
          activity.kind === "conversation" &&
          (activity.data as { conversation?: string }).conversation === key,
      )
      .map((activity) => (activity.data as { turns_end?: number }).turns_end ?? 0),
  );
  const sessionTurns = Math.max(0, conversation.turns.length - lastLogged);
  const pending = useRef<{ id: string; text: string; result?: SpanishAIResponse }>({
    id: crypto.randomUUID(),
    text: "",
  });
  const completion = useRef(crypto.randomUUID());
  return (
    <Card>
      <h2 className="text-lg font-extrabold">A conversation that teaches back</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Reply in Spanish. Corrections appear after each reply; confident grammar/usage rules go to
        Mistake fixer automatically. AI can be wrong; review or dismiss a correction.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your reply and recent Spanish conversation are sent to the app's AI provider for feedback.
        Avoid sharing sensitive details. A second model pass checks the draft; it is not an
        independent expert review.
      </p>
      <p className="mt-2 rounded-2xl bg-secondary p-3 text-sm">
        Voice: tap "Speak your reply" to dictate in Spanish, and "Listen" to hear replies. Uses your
        browser's built-in speech (free). Check the transcript before sending. No pronunciation score.
      </p>
      <Field label="Conversation situation">
        <TextInput
          maxLength={1000}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
      </Field>
      {!conversation.turns.length && (
        <GhostButton
          disabled={w.busy}
          onClick={() =>
            void w.run(async () => {
              const opening = await spanishAI({
                data: {
                  mode: "opening",
                  message: "",
                  topic: topic || conversation.topic,
                  variety: w.profile!.variety,
                  ability: spanishAbility(w.profile!),
                  history: [],
                },
              });
              await w.save("conversation", key, {
                ...conversation,
                topic,
                opening: opening.response,
              });
            })
          }
        >
          Ask me a question to start
        </GhostButton>
      )}
      {conversation.opening && (
        <div className="mt-3 space-y-2 rounded-2xl bg-secondary p-3">
          <p lang="es">{conversation.opening}</p>
          <SpeakButton text={conversation.opening} />
        </div>
      )}
      <ol aria-live="polite" className="mt-4 space-y-4">
        {conversation.turns.map((turn) => (
          <li key={turn.id} className="space-y-2 rounded-2xl border p-3">
            <p className="text-sm font-bold">You</p>
            <p className="whitespace-pre-wrap">{turn.user}</p>
            <p className="border-t pt-2 text-sm font-bold">Journey</p>
            <p className="whitespace-pre-wrap" lang="es">
              {turn.response}
            </p>
            <SpeakButton text={turn.response} />
            {turn.corrected && (
              <p className="rounded-xl bg-secondary p-3" lang="es">
                {turn.corrected}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{turn.feedback}</p>
          </li>
        ))}
      </ol>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void w.run(async () => {
            if (pending.current.text !== reply)
              pending.current = { id: crypto.randomUUID(), text: reply };
            const request = pending.current;
            request.result ??= await spanishAI({
              data: {
                mode: "conversation",
                message: reply,
                topic: topic || conversation.topic,
                variety: w.profile!.variety,
                ability: spanishAbility(w.profile!),
                history: [
                  ...(conversation.opening ? [{ user: "", response: conversation.opening }] : []),
                  ...conversation.turns.map((turn) => ({
                    user: turn.user,
                    response: turn.response,
                  })),
                ].slice(-12),
                rule: w.items
                  .filter((item) => item.kind === "mistake")
                  .map((item) => `${item.key}: ${itemData<RuleMistake>(item).title}`)
                  .join("\n")
                  .slice(0, 2000),
              },
            });
            const result = request.result;
            const current = conversation.turns.some((turn) => turn.id === request.id)
              ? conversation.turns
              : [
                  ...conversation.turns,
                  {
                    id: request.id,
                    user: reply,
                    response: result.response,
                    corrected: result.corrected,
                    feedback: result.feedback,
                    created_at: new Date().toISOString(),
                  },
                ];
            await w.save("conversation", key, { ...conversation, topic, turns: current });
            await w.rules(result, request.id, reply);
            setReply("");
            pending.current = { id: crypto.randomUUID(), text: "" };
          });
        }}
      >
        <Field label="Your Spanish reply">
          <TextArea
            lang="es"
            required
            maxLength={3000}
            disabled={w.busy}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
        </Field>
        <VoiceInput
          disabled={w.busy}
          onText={(text) => setReply((prev) => (prev ? `${prev} ${text}` : text).slice(0, 3000))}
        />
        <PrimaryButton disabled={w.busy || !reply.trim()}>
          {w.busy ? "Checking your reply…" : "Send reply and get feedback"}
        </PrimaryButton>
      </form>
      <p className="mt-3 text-sm text-muted-foreground">
        {sessionTurns}/4 replies in this activity. Meaningful exchanges, not a countdown.
      </p>
      <GhostButton
        disabled={w.busy || sessionTurns < 4 || !w.history.isSuccess}
        onClick={() =>
          void w.run(async () => {
            await w.activity(
              "conversation",
              {
                conversation: key,
                topic,
                replies: sessionTurns,
                turns_end: conversation.turns.length,
                evidence: "AI-assisted conversation, not independent assessment",
              },
              task,
              0,
              completion.current,
            );
            completion.current = crypto.randomUUID();
            w.setMessage("Conversation activity saved and its daily task updated.");
          })
        }
      >
        Finish conversation activity
      </GhostButton>
    </Card>
  );
}
type Challenge = NonNullable<SpanishAIResponse["challenge"]>;
function ChallengeGame({
  mode,
  topic,
  ruleItem,
  transcript = "",
  onComplete,
}: {
  mode: string;
  topic: string;
  ruleItem?: SpanishItem;
  transcript?: string;
  onComplete: (result: SpanishAIResponse, event: string) => Promise<void>;
}) {
  const w = useSpanish();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SpanishAIResponse | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [sampleSeen, setSampleSeen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const eventId = useRef(crypto.randomUUID());
  const cached = useRef<{ answer: string; result: SpanishAIResponse } | null>(null);
  return (
    <div className="space-y-3">
      {!challenge ? (
        <PrimaryButton
          disabled={w.busy || (mode === "Listening challenge" && transcript.trim().length < 50)}
          onClick={() =>
            void w.run(async () => {
              const generated = await spanishAI({
                data: {
                  mode: "challenge",
                  message: "",
                  topic: `${mode}: ${topic}`.slice(0, 1200),
                  variety: w.profile!.variety,
                  ability: spanishAbility(w.profile!),
                  history: [],
                  ...(ruleItem ? { rule: JSON.stringify(ruleItem.data).slice(0, 2000) } : {}),
                  ...(transcript ? { transcript } : {}),
                },
              });
              setChallenge(generated.challenge);
            })
          }
        >
          {w.busy ? "Preparing checked practice…" : "Generate a fresh challenge"}
        </PrimaryButton>
      ) : (
        <>
          <p className="rounded-2xl bg-secondary p-3 font-bold" lang="es">
            {challenge.prompt}
          </p>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void w.run(async () => {
                const response =
                  cached.current?.answer === answer
                    ? cached.current.result
                    : await spanishAI({
                        data: {
                          mode: "grade",
                          topic: `${mode}: ${topic}`.slice(0, 1200),
                          message: answer,
                          variety: w.profile!.variety,
                          ability: spanishAbility(w.profile!),
                          history: [],
                          challenge,
                          ...(transcript ? { transcript } : {}),
                        },
                      });
                cached.current = { answer, result: response };
                setResult(response);
                await w.rules(response, eventId.current, answer);
                if (canAwardSpanishPractice(response, sampleSeen, ruleItem?.key)) {
                  await onComplete(response, eventId.current);
                  setCompleted(true);
                }
                if (response.judgement === "retry" && ruleItem)
                  await w.save(
                    "mistake",
                    ruleItem.key,
                    reviewRule(itemData<RuleMistake>(w.get("mistake", ruleItem.key)!), false),
                  );
              });
            }}
          >
            <Field label="Your answer in Spanish">
              <TextArea
                lang="es"
                required
                maxLength={3000}
                disabled={completed || w.busy}
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setResult(null);
                }}
              />
            </Field>
            <PrimaryButton disabled={w.busy || completed || !answer.trim()}>
              {w.busy ? "Checking meaning and alternatives…" : "Check my response"}
            </PrimaryButton>
          </form>
          {result && (
            <div aria-live="polite" className="rounded-2xl border p-3">
              <p className="font-bold">
                {result.judgement === "accepted"
                  ? "Meaning accepted"
                  : result.judgement === "uncertain"
                    ? "Uncertain: not counted against you"
                    : "Try a clearer response"}
              </p>
              <p className="mt-2 text-sm">{result.feedback}</p>
              {result.corrected && (
                <p className="mt-2" lang="es">
                  {result.corrected}
                </p>
              )}
              <p className="mt-2 text-sm">{result.response}</p>
              {sampleSeen && (
                <p className="mt-2 text-sm text-muted-foreground">
                  The sample was shown, so this is supported practice rather than an independent
                  success. Try a fresh challenge.
                </p>
              )}
            </div>
          )}
          <GhostButton
            onClick={() => {
              setShowSample(!showSample);
              setSampleSeen(true);
            }}
          >
            {showSample ? "Hide sample" : "Show one valid answer (supported practice)"}
          </GhostButton>
          {showSample && (
            <p className="rounded-2xl bg-secondary p-3" lang="es">
              {challenge.sample}
            </p>
          )}
          <GhostButton
            disabled={w.busy}
            onClick={() => {
              setChallenge(null);
              setAnswer("");
              setResult(null);
              setShowSample(false);
              setSampleSeen(false);
              setCompleted(false);
              eventId.current = crypto.randomUUID();
              cached.current = null;
            }}
          >
            <RotateCcw className="mr-2 inline h-4 w-4" />
            New challenge
          </GhostButton>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        AI-generated practice, not a certified assessment. Valid alternatives should count. An
        uncertain answer does not lower a rule's progress.
      </p>
    </div>
  );
}
function MistakeFixer({ task }: { task?: SpanishItem | undefined }) {
  const w = useSpanish();
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const rules = w.items.filter(
    (item) => item.kind === "mistake" && itemData<RuleMistake>(item).dismissed === dismissed,
  );
  const due = dueRules(w.items);
  const active = w.items.find((item) => item.id === selected) ?? due[0];
  const target = useRef(Math.max(1, Math.min(3, due.length)));
  const completion = useRef(crypto.randomUUID());
  const firstDueId = due[0]?.id;
  useEffect(() => {
    if (!selected && firstDueId) setSelected(firstDueId);
  }, [selected, firstDueId]);
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold">Fix the rule, not one sentence</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {due.length} due rules. Weaker rules come first; successful ones return later. Typos and
          style suggestions are not automatically drilled.
        </p>
        <div className="mt-3 flex gap-2">
          <Chip active={!dismissed} onClick={() => setDismissed(false)}>
            Active
          </Chip>
          <Chip active={dismissed} onClick={() => setDismissed(true)}>
            Dismissed
          </Chip>
        </div>
        {!rules.length && (
          <Empty>
            {dismissed
              ? "No dismissed rules."
              : "No rules saved yet. Start a conversation; meaningful, confident corrections are saved automatically."}
          </Empty>
        )}
        <ul className="mt-3 space-y-3">
          {rules.map((item) => {
            const rule = itemData<RuleMistake>(item);
            return (
              <li key={item.id} className="rounded-2xl border p-3">
                <h3 className="font-bold">{rule.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rule.count} occurrences · next review {rule.due} · stage {rule.box}
                </p>
                <p className="mt-2 text-sm">{rule.explanation}</p>
                <p className="mt-2 text-sm" lang="es">
                  {rule.original} → {rule.corrected}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{rule.source}</p>
                <div className="mt-2 flex gap-4">
                  {!dismissed && (
                    <button
                      className="min-h-11 text-sm font-bold underline"
                      onClick={() => setSelected(item.id)}
                    >
                      Practise this rule
                    </button>
                  )}
                  <button
                    disabled={w.busy}
                    className="min-h-11 text-sm font-bold"
                    onClick={() =>
                      void w.run(async () => {
                        await w.save("mistake", item.key, { ...rule, dismissed: !rule.dismissed });
                      })
                    }
                  >
                    {dismissed ? "Restore rule" : "Dismiss questionable correction"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      {!dismissed && active && !itemData<RuleMistake>(active).dismissed && (
        <Card>
          <h3 className="mb-3 font-extrabold">
            Fresh practice: {itemData<RuleMistake>(active).title}
          </h3>
          <ChallengeGame
            key={active.id}
            mode="Mistake fixer"
            topic={itemData<RuleMistake>(active).explanation}
            ruleItem={active}
            onComplete={async (_result, id) => {
              const latest = itemData<RuleMistake>(w.get("mistake", active.key)!);
              if (!latest.review_ids?.includes(id))
                await w.save("mistake", active.key, {
                  ...reviewRule(latest, true),
                  review_ids: [...(latest.review_ids ?? []), id].slice(-100),
                });
              const completes = new Set([...reviewed, active.id]).size >= target.current;
              await w.activity(
                "review",
                { rule: active.key, judgement: "AI accepted", independent: true },
                completes ? task : undefined,
                0,
                id,
              );
              setReviewed((before) => [...new Set([...before, active.id])]);
              setSelected(null);
            }}
          />
        </Card>
      )}
      {!!reviewed.length && (
        <Card>
          <p className="text-sm">
            {reviewed.length}/{target.current} rules reviewed in this activity.{" "}
            {reviewed.length >= target.current
              ? "Review saved. Any connected daily task was updated without a duplicate review log."
              : "Continue with another rule."}
          </p>
        </Card>
      )}
    </div>
  );
}
function Practice({ task }: { task?: SpanishItem | undefined }) {
  const w = useSpanish();
  const [mode, setMode] = useState("Build a response");
  const [transcriptId, setTranscriptId] = useState("");
  const selected = w.items.find((item) => item.id === transcriptId);
  const transcript = selected ? itemData<ListeningContent>(selected).transcript : "";
  const topic = task
    ? itemData<DailySpanishTask>(task).title
    : `Use Spanish about ${w.profile!.interests || "everyday life"} towards: ${w.profile!.goal}`;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold">Useful games and practice</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Practise meaning, not just vocabulary matching. Games support the same daily plan; they
          are not another compulsory list.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Build a response", "Scenario conversation", "Listening challenge"].map((value) => (
            <Chip key={value} active={mode === value} onClick={() => setMode(value)}>
              {value}
            </Chip>
          ))}
        </div>
        {mode === "Listening challenge" && (
          <div className="my-3 space-y-3">
            <p className="text-sm">
              Listen to the original item first, then answer a question grounded in a saved
              transcript excerpt. This checks text-grounded comprehension, not independently
              verified audio understanding.
            </p>
            <Field label="Saved item with a transcript">
              <SelectInput
                value={transcriptId}
                onChange={(event) => setTranscriptId(event.target.value)}
              >
                <option value="">Choose listening material</option>
                {w.items
                  .filter(
                    (item) =>
                      item.kind === "content" &&
                      itemData<ListeningContent>(item).transcript?.length >= 50,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {itemData<ListeningContent>(item).title}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            {selected && safeSpanishURL(itemData<ListeningContent>(selected).url) && (
              <a
                className="inline-flex min-h-11 items-center text-sm font-bold underline"
                href={itemData<ListeningContent>(selected).url}
                target="_blank"
                rel="noreferrer"
              >
                Open the original audio/video
              </a>
            )}
          </div>
        )}
        <div className="mt-4">
          <ChallengeGame
            key={`${mode}:${transcriptId}:${task?.id ?? ""}`}
            mode={mode}
            topic={topic}
            transcript={mode === "Listening challenge" ? transcript : ""}
            onComplete={async (_result, id) => {
              await w.activity(
                "practice",
                {
                  mode,
                  topic,
                  source_id: transcriptId || null,
                  supported: false,
                  judgement: "AI accepted",
                },
                task,
                0,
                id,
              );
              w.setMessage("Practice saved and its connected daily task updated.");
            }}
          />
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="text-sm font-bold">Your existing games are still here</p>
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <Link className="inline-flex min-h-11 items-center underline" to="/ruta">
              La Ruta
            </Link>
            <Link className="inline-flex min-h-11 items-center underline" to="/escapa">
              ¡Escapa!
            </Link>
            <Link className="inline-flex min-h-11 items-center underline" to="/corre">
              Corre
            </Link>
          </div>
        </div>
      </Card>
      <RealWorldPractice task={task} />
    </div>
  );
}
function RealWorldPractice({ task }: { task?: SpanishItem | undefined }) {
  const w = useSpanish();
  const [mission, setMission] = useState("");
  const [reflection, setReflection] = useState("");
  const [phrase, setPhrase] = useState("");
  const [meaning, setMeaning] = useState("");
  const missionId = useRef<string>(crypto.randomUUID());
  return (
    <>
      <Card>
        <h2 className="text-lg font-extrabold">Real-life missions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the skill outside lessons: ask follow-up questions, explain a plan, or retell an
          experience. Save what happened honestly; this is self-reported evidence.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void w.run(async () => {
              if (reflection.trim() && reflection.trim().length < 20)
                throw new Error(
                  "Add at least 20 characters about what happened, or leave reflection empty to plan the mission.",
                );
              await w.save("mission", missionId.current, {
                title: mission,
                reflection,
                status: reflection.trim() ? "done" : "planned",
                date: todayISO(),
                verified: false,
              });
              if (reflection.trim())
                await w.activity(
                  task ? "practice" : "mission",
                  { title: mission, reflection, self_reported: true },
                  task,
                  0,
                  missionId.current,
                );
              missionId.current = crypto.randomUUID();
              setMission("");
              setReflection("");
              w.setMessage(
                "Mission saved. Completed missions are labelled as self-reported evidence.",
              );
            });
          }}
        >
          <Field label="My specific mission">
            <TextInput
              required
              maxLength={300}
              placeholder="Explain tomorrow's plan and ask two questions"
              value={mission}
              onChange={(event) => setMission(event.target.value)}
            />
          </Field>
          <Field label="What worked, what stuck, what will I try next?">
            <TextArea
              placeholder="Leave empty to plan it; add a reflection to record completion."
              maxLength={2000}
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
            />
          </Field>
          <PrimaryButton disabled={w.busy}>
            {reflection.trim() ? "Save completed mission" : "Save planned mission"}
          </PrimaryButton>
        </form>
        <ul className="mt-3 space-y-3">
          {w.items
            .filter((item) => item.kind === "mission")
            .slice(-10)
            .reverse()
            .map((item) => {
              const entry = itemData<{
                title: string;
                reflection: string;
                date: string;
                status?: string;
              }>(item);
              return (
                <li key={item.id} className="rounded-2xl border p-3">
                  <p className="font-bold">{entry.title}</p>
                  <p className="mt-1 text-sm">{entry.reflection}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {entry.date} · {entry.status || "done"} · self-reported
                  </p>
                  {entry.status === "planned" && (
                    <button
                      className="min-h-11 text-sm font-bold underline"
                      onClick={() => {
                        missionId.current = item.key;
                        setMission(entry.title);
                        setReflection("");
                      }}
                    >
                      Record this mission's outcome
                    </button>
                  )}
                </li>
              );
            })}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-extrabold">Useful phrases, in context</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A phrase worth using again is not the same as a grammar mistake. Keep it separately.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void w.run(async () => {
              await w.save("phrase", crypto.randomUUID(), { phrase, meaning, date: todayISO() });
              setPhrase("");
              setMeaning("");
            });
          }}
        >
          <Field label="Spanish phrase">
            <TextInput
              lang="es"
              required
              maxLength={500}
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
            />
          </Field>
          <Field label="Meaning, situation or question">
            <TextArea
              required
              maxLength={1500}
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
            />
          </Field>
          <PrimaryButton disabled={w.busy}>Save useful phrase</PrimaryButton>
        </form>
        <ul className="mt-3 space-y-3">
          {w.items
            .filter((item) => item.kind === "phrase")
            .map((item) => {
              const data = itemData<{ phrase: string; meaning: string }>(item);
              return (
                <li className="rounded-2xl border p-3" key={item.id}>
                  <p className="font-bold" lang="es">
                    {data.phrase}
                  </p>
                  <p className="mt-1 text-sm">{data.meaning}</p>
                </li>
              );
            })}
        </ul>
      </Card>
    </>
  );
}
