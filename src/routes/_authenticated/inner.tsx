import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, Lightbulb, Plus, RefreshCw, Rocket, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Bar, Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, TextArea, TextInput } from "@/components/app/ui";
import { DOW, prettyDate, todayISO } from "@/lib/dates";
import { addEntry } from "@/lib/journal";
import {
  LIFE_QUESTS, PROMPTS, SKILL_IDEAS, addInnerItems, deleteInnerItem, innerItemsQuery, levelFor, pick,
  promoteCuriosity, sprintPlan, toggleInnerItem, weekRange, type InnerItem,
} from "@/lib/inner";

export const Route = createFileRoute("/_authenticated/inner")({
  head: () => ({
    meta: [
      { title: "Inner Progression — My Journey" },
      { name: "description", content: "Level up yourself: a weekly quest map, skill sprints, curiosity vault and reflection prompts." },
      { property: "og:title", content: "Inner Progression — My Journey" },
      { property: "og:description", content: "Level up yourself: a weekly quest map, skill sprints, curiosity vault and reflection prompts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inner,
});

type Tab = "map" | "skills" | "mind";
const TITLES: Record<Tab, string> = { map: "Quest map", skills: "Skill sprints", mind: "Mind" };

function Inner() {
  const [tab, setTab] = useState<Tab>("map");
  return (
    <AppShell eyebrow="Inner progression" title={TITLES[tab]}>
      <div className="flex gap-2">
        <Chip active={tab === "map"} onClick={() => setTab("map")} className="flex-1">Map</Chip>
        <Chip active={tab === "skills"} onClick={() => setTab("skills")} className="flex-1">Skills</Chip>
        <Chip active={tab === "mind"} onClick={() => setTab("mind")} className="flex-1">Mind</Chip>
      </div>
      {tab === "map" && <QuestMap />}
      {tab === "skills" && <Skills />}
      {tab === "mind" && <Mind />}
    </AppShell>
  );
}

function useItems() {
  const { data } = useQuery(innerItemsQuery);
  return data ?? [];
}

function QuestMap() {
  const qc = useQueryClient();
  const items = useItems();
  const week = weekRange();
  const today = todayISO();
  const [adding, setAdding] = useState(false);

  const quests = items.filter((i) => i.kind === "quest");
  const weekQuests = quests.filter((q) => q.date && week.includes(q.date));
  const lvl = levelFor(quests.filter((q) => q.done).length);
  const weekDone = weekQuests.filter((q) => q.done).length;

  const toggle = useMutation({
    mutationFn: (q: InnerItem) => toggleInnerItem(q.id, !q.done),
    onSuccess: (_d, q) => {
      qc.invalidateQueries({ queryKey: ["inner_items"] });
      if (!q.done) toast.success("+10 XP — level cleared!");
    },
  });
  const remove = useMutation({
    mutationFn: deleteInnerItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inner_items"] }),
  });

  // Next uncompleted node = where the player stands
  const ordered = [...weekQuests].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.sort - b.sort);
  const currentId = ordered.find((q) => !q.done)?.id;

  return (
    <>
      <Card className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Level {lvl.level}</p>
            <p className="text-3xl font-extrabold leading-tight">{lvl.rank}</p>
          </div>
          <p className="text-right text-sm font-bold opacity-90">{lvl.xp} XP</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-primary-foreground/25">
          <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${lvl.into}%` }} />
        </div>
        <p className="mt-2 text-xs font-bold opacity-90">{100 - lvl.into} XP to level {lvl.level + 1} · {weekDone}/{weekQuests.length} quests this week</p>
      </Card>

      <PrimaryButton onClick={() => setAdding(true)}>
        <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Add a quest</span>
      </PrimaryButton>

      {ordered.length === 0 ? (
        <Empty>Your world is empty. Add a quest, or start a skill sprint in Skills to build this week's trail.</Empty>
      ) : (
        <div className="relative py-2">
          {ordered.map((q, i) => {
            const offset = ["ml-0", "ml-16", "ml-28", "ml-16"][i % 4];
            const isCurrent = q.id === currentId;
            const dayIdx = week.indexOf(q.date ?? "");
            return (
              <div key={q.id} className={`relative flex items-center gap-3 py-2 ${offset}`}>
                <button
                  aria-label={q.done ? "Undo quest" : "Complete quest"}
                  onClick={() => toggle.mutate(q)}
                  className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 shadow-float transition-all active:scale-90 ${
                    q.done
                      ? "border-life bg-life text-primary-foreground"
                      : isCurrent
                        ? "animate-pulse border-life bg-life-soft text-life"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {q.done ? <Star className="h-7 w-7 fill-current" /> : isCurrent ? <Flag className="h-7 w-7" /> : <span className="text-lg font-extrabold">{i + 1}</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase ${q.date === today ? "text-life" : "text-muted-foreground"}`}>
                    {q.date === today ? "Today" : DOW[dayIdx] ?? ""}{q.skill ? ` · ${q.skill}` : ""}
                  </p>
                  <p className={`text-sm font-bold leading-snug ${q.done ? "text-muted-foreground line-through" : ""}`}>{q.title}</p>
                </div>
                <button aria-label="Delete quest" onClick={() => remove.mutate(q.id)} className="p-2 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {weekQuests.length > 0 && weekDone === weekQuests.length && (
            <Card className="mt-2 text-center">
              <p className="text-2xl font-extrabold text-life">World cleared!</p>
              <p className="text-sm font-bold text-muted-foreground">Every quest this week done. On to the next level.</p>
            </Card>
          )}
        </div>
      )}

      <QuestSheet open={adding} onOpenChange={setAdding} week={week} />
    </>
  );
}

function QuestSheet({ open, onOpenChange, week }: { open: boolean; onOpenChange: (v: boolean) => void; week: string[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const save = useMutation({
    mutationFn: () => addInnerItems([{ kind: "quest", title: title.trim().slice(0, 200), date }]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inner_items"] });
      toast.success("Quest added to the map");
      setTitle("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New quest">
      <Field label="Quick picks">
        <div className="flex flex-wrap gap-2">
          {LIFE_QUESTS.map((q) => <Chip key={q} active={title === q} onClick={() => setTitle(q)}>{q}</Chip>)}
        </div>
      </Field>
      <Field label="Quest"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read 20 pages" /></Field>
      <Field label="Day">
        <div className="flex flex-wrap gap-2">
          {week.map((d, i) => <Chip key={d} active={date === d} onClick={() => setDate(d)}>{DOW[i]}</Chip>)}
        </div>
      </Field>
      <PrimaryButton disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>Add quest</PrimaryButton>
    </FormSheet>
  );
}

function Skills() {
  const qc = useQueryClient();
  const items = useItems();
  const vault = items.filter((i) => i.kind === "curiosity" && !i.done);
  const week = weekRange();
  const activeSprints = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    items.filter((i) => i.kind === "quest" && i.skill && i.date && week.includes(i.date)).forEach((q) => {
      const s = m.get(q.skill!) ?? { total: 0, done: 0 };
      s.total++; if (q.done) s.done++;
      m.set(q.skill!, s);
    });
    return [...m.entries()];
  }, [items, week]);

  const [idea, setIdea] = useState("");
  const [seed, setSeed] = useState(() => Date.now());
  const suggestions = pick(SKILL_IDEAS, 3, seed);

  const add = useMutation({
    mutationFn: (t: string) => addInnerItems([{ kind: "curiosity", title: t.trim().slice(0, 200) }]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inner_items"] }); setIdea(""); toast.success("Saved to your vault"); },
  });
  const remove = useMutation({ mutationFn: deleteInnerItem, onSuccess: () => qc.invalidateQueries({ queryKey: ["inner_items"] }) });
  const sprint = useMutation({
    mutationFn: async (v: { skill: string; fromId?: string }) => {
      await addInnerItems(sprintPlan(v.skill).map((title, i) => ({ kind: "quest" as const, title, skill: v.skill, date: week[i] ?? null, sort: i })));
      if (v.fromId) await promoteCuriosity(v.fromId);
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["inner_items"] }); toast.success(`${v.skill} sprint mapped onto this week`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create sprint"),
  });

  return (
    <>
      {activeSprints.length > 0 && (
        <Card>
          <SectionTitle>This week's sprints</SectionTitle>
          <div className="space-y-3">
            {activeSprints.map(([skill, s]) => (
              <div key={skill}>
                <div className="mb-1 flex justify-between text-sm font-bold"><span>{skill}</span><span className="text-life">{s.done}/{s.total}</span></div>
                <Bar pct={(s.done / s.total) * 100} className="bg-life" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle action={
          <button aria-label="New ideas" onClick={() => setSeed(Date.now())} className="flex items-center gap-1 text-xs font-bold text-life">
            <RefreshCw className="h-3.5 w-3.5" /> Shuffle
          </button>
        }>Skills to try this week</SectionTitle>
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s} className="flex items-center gap-2 rounded-2xl bg-life-soft p-3">
              <Sparkles className="h-4 w-4 shrink-0 text-life" />
              <p className="flex-1 text-sm font-bold">{s}</p>
              <button onClick={() => sprint.mutate({ skill: s })} className="min-h-10 rounded-full bg-life px-3 text-xs font-extrabold text-primary-foreground">
                Start sprint
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Things I want to know</SectionTitle>
        <div className="flex gap-2">
          <TextInput value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. How do markets price in news?" />
          <button aria-label="Add" disabled={!idea.trim()} onClick={() => add.mutate(idea)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {vault.length === 0 && <Empty>Your curiosity vault is empty. Drop in anything you want to learn.</Empty>}
          {vault.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-2xl border p-3">
              <Lightbulb className="h-4 w-4 shrink-0 text-life" />
              <p className="flex-1 text-sm font-bold">{v.title}</p>
              <button aria-label="Map it out" onClick={() => sprint.mutate({ skill: v.title, fromId: v.id })} className="flex min-h-10 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-extrabold">
                <Rocket className="h-3.5 w-3.5" /> Map week
              </button>
              <button aria-label="Delete" onClick={() => remove.mutate(v.id)} className="p-1 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Mind() {
  const qc = useQueryClient();
  const [seed, setSeed] = useState(() => Date.now());
  const prompt = pick(PROMPTS, 1, seed)[0] ?? PROMPTS[0]!;
  const [text, setText] = useState("");
  const [free, setFree] = useState(false);
  const save = useMutation({
    mutationFn: () => addEntry({ text: (free ? text : `${prompt}\n\n${text}`).trim().slice(0, 5000), pillar: "life", entry_type: "reflection" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Saved to your journal");
      setText("");
      setSeed(Date.now());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <>
      <div className="flex gap-2">
        <Chip active={!free} onClick={() => setFree(false)} className="flex-1">Prompt</Chip>
        <Chip active={free} onClick={() => setFree(true)} className="flex-1">Free write</Chip>
      </div>
      <Card>
        {!free && (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-extrabold leading-snug text-life">{prompt}</p>
              <button aria-label="New question" onClick={() => setSeed(Date.now())} className="p-2 text-muted-foreground"><RefreshCw className="h-4 w-4" /></button>
            </div>
            <div className="h-3" />
          </>
        )}
        <TextArea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={free ? "Notes, ideas, anything on your mind…" : "Write your answer…"} />
        <div className="mt-3">
          <PrimaryButton disabled={!text.trim() || save.isPending} onClick={() => save.mutate()}>
            <span className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> Save to journal</span>
          </PrimaryButton>
        </div>
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground">Saved under Life · {prettyDate(todayISO())}</p>
      </Card>
    </>
  );
}
