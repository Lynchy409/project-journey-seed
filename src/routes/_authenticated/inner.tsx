import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plane, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, TextArea, TextInput } from "@/components/app/ui";
import { prettyDate, todayISO } from "@/lib/dates";
import { addEntry } from "@/lib/journal";
import { addInnerItems, deleteInnerItem, innerItemsQuery, type InnerItem } from "@/lib/inner";
import { supabase } from "@/integrations/supabase/client";
import { OBJECTIVE_XP, STREAK_XP, lifeFlight, verseOfDay } from "@/lib/faith";
import flight from "@/assets/flight-home.jpg";

export const Route = createFileRoute("/_authenticated/inner")({
  head: () => ({
    meta: [
      { title: "Inner — Faith, Objectives & The Flight Home | My Journey" },
      { name: "description", content: "Daily scripture, self-set objectives that earn XP, clean streaks and a calm view of your life's flight." },
      { property: "og:title", content: "Inner — Faith, Objectives & The Flight Home" },
      { property: "og:description", content: "Daily scripture, self-set objectives that earn XP, clean streaks and a calm view of your life's flight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inner,
});

type Tab = "faith" | "objectives" | "conscience";
const TITLES: Record<Tab, string> = { faith: "Faith", objectives: "Objectives", conscience: "Conscience" };
const qk = { queryKey: ["inner_items"] };

function Inner() {
  const [tab, setTab] = useState<Tab>("faith");
  return (
    <AppShell eyebrow="Inner" title={TITLES[tab]}>
      <FlightHome />
      <div className="flex gap-2">
        {(Object.keys(TITLES) as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)} className="flex-1">{TITLES[t]}</Chip>
        ))}
      </div>
      {tab === "faith" && <Faith />}
      {tab === "objectives" && <Objectives />}
      {tab === "conscience" && <Conscience />}
    </AppShell>
  );
}

const DOB_KEY = "mj_birthdate";
function FlightHome() {
  const [dob, setDob] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    const y = new Date().getFullYear() - 22;
    setDob(localStorage.getItem(DOB_KEY) ?? `${y}-01-01`);
  }, []);
  if (!dob) return <div className="aspect-[16/10] rounded-3xl bg-secondary" />;
  const f = lifeFlight(dob);
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-float">
      <img src={flight} alt="A plane gliding above golden clouds toward heaven's light" width={1536} height={864} className="aspect-[16/10] w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-4 text-background">
        <button onClick={() => setEdit(true)} className="text-[11px] font-bold uppercase tracking-wider opacity-90">The flight home · age {f.age}</button>
        <div className="relative mt-2 h-1.5 rounded-full bg-background/30">
          <div className="h-full rounded-full bg-background" style={{ width: `${f.pct}%` }} />
          <Plane className="absolute -top-2 h-5 w-5 -translate-x-1/2 fill-current" style={{ left: `${f.pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-bold">
          <span>{f.lived.toLocaleString()} days flown</span>
          <span>~{f.ahead.toLocaleString()} ahead</span>
        </div>
      </div>
      <FormSheet open={edit} onOpenChange={setEdit} title="Your birth date">
        <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <p className="text-xs font-semibold text-muted-foreground">Kept on this device only. Journey length uses the UK average of 81 years.</p>
        <PrimaryButton onClick={() => { localStorage.setItem(DOB_KEY, dob); setEdit(false); }}>Save</PrimaryButton>
      </FormSheet>
    </div>
  );
}

function Faith() {
  const qc = useQueryClient();
  const v = verseOfDay(todayISO());
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: () => addEntry({ text: `🙏 ${v.ref}\n\n${note}`.trim().slice(0, 5000), pillar: "life", entry_type: "reflection" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal"] }); setNote(""); toast.success("Prayer saved to your journal"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <>
      <Card>
        <p className="text-[11px] font-bold uppercase tracking-wider text-life">Today's verse · {v.theme}</p>
        <p className="mt-2 text-xl font-extrabold leading-snug">“{v.text}”</p>
        <p className="mt-2 text-sm font-bold text-muted-foreground">{v.ref}</p>
        <p className="mt-3 rounded-2xl bg-life-soft p-3 text-sm font-bold">{v.takeaway}</p>
      </Card>
      <Card>
        <SectionTitle>Prayer & gratitude</SectionTitle>
        <TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What I'm grateful for · where I need strength…" />
        <div className="mt-3">
          <PrimaryButton disabled={!note.trim() || save.isPending} onClick={() => save.mutate()}>Save prayer</PrimaryButton>
        </div>
      </Card>
    </>
  );
}

async function setItem(id: string, patch: Partial<InnerItem>) {
  const { error } = await supabase.from("inner_items").update(patch).eq("id", id);
  if (error) throw error;
}

function Objectives() {
  const qc = useQueryClient();
  const { data } = useQuery(innerItemsQuery);
  const items = data ?? [];
  const today = todayISO();
  const objectives = items.filter((i) => i.kind === "objective");
  const streaks = items.filter((i) => i.kind === "streak");
  const streakDays = items.filter((i) => i.kind === "streak_day");
  const [adding, setAdding] = useState<"objective" | "streak" | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [xp, setXp] = useState<number>(150);

  const inv = () => qc.invalidateQueries(qk);
  const add = useMutation({
    mutationFn: () => addInnerItems([{ kind: adding as never, title: title.trim().slice(0, 200), date: adding === "objective" ? date || null : null, sort: adding === "objective" ? xp : 0 }]),
    onSuccess: () => { inv(); setTitle(""); setDate(""); setAdding(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  const complete = useMutation({
    mutationFn: (o: InnerItem) => setItem(o.id, o.done ? { done: false, score: null, output: null } : { done: true, score: o.sort, output: today }),
    onSuccess: (_d, o) => { inv(); if (!o.done) toast.success(`+${o.sort} XP — objective complete`); },
  });
  const hold = useMutation({
    mutationFn: async (s: InnerItem) => {
      const existing = streakDays.find((d) => d.skill === s.id && d.date === today);
      if (existing) return deleteInnerItem(existing.id);
      return addInnerItems([{ kind: "streak_day" as never, title: s.title, skill: s.id, date: today }]);
    },
    onSuccess: inv,
  });
  const remove = useMutation({ mutationFn: deleteInnerItem, onSuccess: inv });

  const run = (id: string) => {
    const days = new Set(streakDays.filter((d) => d.skill === id).map((d) => d.date));
    let n = 0;
    const d = new Date();
    if (!days.has(today)) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  return (
    <>
      <Card>
        <SectionTitle action={<button onClick={() => setAdding("objective")} className="flex items-center gap-1 text-xs font-bold text-life"><Plus className="h-4 w-4" /> New</button>}>Objectives</SectionTitle>
        <div className="mt-2 space-y-2">
          {objectives.length === 0 && <Empty>Set yourself a challenge — e.g. "Read Mark in 7 days".</Empty>}
          {objectives.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-2xl border p-3">
              <button aria-label="Complete" onClick={() => complete.mutate(o)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${o.done ? "border-life bg-life text-primary-foreground" : "border-border"}`}>
                <Check className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${o.done ? "text-muted-foreground line-through" : ""}`}>{o.title}</p>
                <p className="text-[11px] font-bold text-muted-foreground">+{o.sort} XP{o.date ? ` · by ${prettyDate(o.date)}` : ""}</p>
              </div>
              <button aria-label="Delete" onClick={() => remove.mutate(o.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle action={<button onClick={() => setAdding("streak")} className="flex items-center gap-1 text-xs font-bold text-life"><Plus className="h-4 w-4" /> New</button>}>Hold the line</SectionTitle>
        <div className="mt-2 space-y-2">
          {streaks.length === 0 && <Empty>Name a leak you refuse to fold on — e.g. "No mindless scrolling".</Empty>}
          {streaks.map((s) => {
            const held = streakDays.some((d) => d.skill === s.id && d.date === today);
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-3">
                <Shield className="h-5 w-5 shrink-0 text-life" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="text-[11px] font-bold text-muted-foreground">{run(s.id)} days clean · +{STREAK_XP} XP/day</p>
                </div>
                <button onClick={() => hold.mutate(s)} className={`min-h-10 rounded-full px-3 text-xs font-extrabold ${held ? "bg-life text-primary-foreground" : "bg-secondary"}`}>{held ? "Held ✓" : "Held today"}</button>
                <button aria-label="Delete" onClick={() => remove.mutate(s.id)} className="p-1 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      </Card>

      <FormSheet open={!!adding} onOpenChange={(v) => !v && setAdding(null)} title={adding === "streak" ? "New clean streak" : "New objective"}>
        <Field label={adding === "streak" ? "I refuse to…" : "Objective"}>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={adding === "streak" ? "No impulse trades" : "Fast until 2pm for 3 days"} />
        </Field>
        {adding === "objective" && (
          <>
            <Field label="XP reward">
              <div className="flex gap-2">{OBJECTIVE_XP.map((x) => <Chip key={x} active={xp === x} onClick={() => setXp(x)} className="flex-1">+{x}</Chip>)}</div>
            </Field>
            <Field label="Deadline (optional)"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </>
        )}
        <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>Add</PrimaryButton>
      </FormSheet>
    </>
  );
}

function Conscience() {
  const qc = useQueryClient();
  const [a, setA] = useState({ ego: "", held: "", focus: "" });
  const save = useMutation({
    mutationFn: () => addEntry({
      text: `Where ego or weakness won:\n${a.ego}\n\nWhere I held the line:\n${a.held}\n\nTomorrow's one focus:\n${a.focus}`.slice(0, 5000),
      pillar: "life", entry_type: "reflection",
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal"] }); setA({ ego: "", held: "", focus: "" }); toast.success("Saved to your journal"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <Card>
      <Field label="Where did ego or weakness win today?"><TextArea rows={3} value={a.ego} onChange={(e) => setA({ ...a, ego: e.target.value })} /></Field>
      <Field label="Where did I keep my word to myself?"><TextArea rows={3} value={a.held} onChange={(e) => setA({ ...a, held: e.target.value })} /></Field>
      <Field label="Tomorrow's one focus"><TextInput value={a.focus} onChange={(e) => setA({ ...a, focus: e.target.value })} /></Field>
      <div className="mt-3">
        <PrimaryButton disabled={!(a.ego || a.held || a.focus).trim() || save.isPending} onClick={() => save.mutate()}>Save to journal</PrimaryButton>
      </div>
    </Card>
  );
}
