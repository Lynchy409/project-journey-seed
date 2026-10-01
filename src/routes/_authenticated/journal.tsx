import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, TextArea, TextInput } from "@/components/app/ui";
import { LessonToggle } from "@/components/app/LessonToggle";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { prettyDate, todayISO } from "@/lib/dates";
import { ENTRY_TYPES, addEntry, deleteEntry, journalQuery, updateEntry, type EntryType } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal — My Journey" },
      { name: "description", content: "Your reflections, trade reviews and the lessons library you keep coming back to." },
      { property: "og:title", content: "Journal — My Journey" },
      { property: "og:description", content: "Your reflections, trade reviews and the lessons library you keep coming back to." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Journal,
});

type JournalRow = import("@/integrations/supabase/types").Database["public"]["Tables"]["journal_entries"]["Row"];

function Journal() {
  const qc = useQueryClient();
  const { data: entries } = useQuery(journalQuery);
  const [pillar, setPillar] = useState<Pillar | "all">("all");
  const [type, setType] = useState<EntryType | "all" | "lessons">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JournalRow | null>(null);
  const [lessonFrom, setLessonFrom] = useState<JournalRow | null>(null);

  const filtered = (entries ?? []).filter((e) => {
    if (pillar !== "all" && e.pillar !== pillar) return false;
    if (type === "lessons" && !e.is_lesson) return false;
    if (type !== "all" && type !== "lessons" && e.entry_type !== type) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const remove = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
    },
  });

  const patch = useMutation({
    mutationFn: ({ id, ...rest }: { id: string } & Record<string, unknown>) => updateEntry(id, rest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
    },
  });

  return (
    <AppShell eyebrow="Journal" title="Your memory">
      <PrimaryButton onClick={() => { setEditing(null); setOpen(true); }}>
        <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> New entry</span>
      </PrimaryButton>

      <Card>
        <SectionTitle>Filter</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={pillar === "all"} onClick={() => setPillar("all")}>All pillars</Chip>
          {(Object.keys(PILLARS) as Pillar[]).map((p) => (
            <Chip key={p} active={pillar === p} onClick={() => setPillar(p)}>{PILLARS[p].label}</Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={type === "all"} onClick={() => setType("all")}>All types</Chip>
          <Chip active={type === "lessons"} onClick={() => setType("lessons")}>Lessons library</Chip>
          {ENTRY_TYPES.map((t) => (
            <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>{t.label}</Chip>
          ))}
        </div>
        <div className="mt-3">
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your journal" />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card><Empty>Nothing matches yet. Write your first entry.</Empty></Card>
      ) : (
        filtered.map((e) => {
          const p = (e.pillar as Pillar) in PILLARS ? (e.pillar as Pillar) : "life";
          return (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILLARS[p].soft} ${PILLARS[p].text}`}>{PILLARS[p].label}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label ?? e.entry_type} · {prettyDate(e.date)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button aria-label="Edit entry" onClick={() => { setEditing(e); setOpen(true); }} className="text-muted-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button aria-label="Delete entry" onClick={() => remove.mutate(e.id)} className="text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-snug">{e.text}</p>
              <div className="mt-3 flex gap-2">
                {e.is_lesson ? (
                  <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                    <Star className="h-4 w-4" /> Lesson
                  </span>
                ) : p === "trading" ? (
                  <button
                    onClick={() => setLessonFrom(e)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-xs font-bold"
                  >
                    <Star className="h-4 w-4" /> Mark as lesson
                  </button>
                ) : null}
                <button
                  onClick={() => patch.mutate({ id: e.id, pinned: !e.pinned })}
                  className={`flex h-10 w-12 items-center justify-center rounded-xl ${e.pinned ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                  aria-label="Pin"
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>
            </Card>
          );
        })
      )}

      <EntrySheet open={open} onOpenChange={setOpen} entry={editing} />
      <LessonFromSheet entry={lessonFrom} onClose={() => setLessonFrom(null)} />
    </AppShell>
  );
}

function EntrySheet({ open, onOpenChange, entry }: { open: boolean; onOpenChange: (v: boolean) => void; entry: JournalRow | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pillar, setPillar] = useState<Pillar>("life");
  const [type, setType] = useState<EntryType>("reflection");
  const [date, setDate] = useState(todayISO());
  const [confirming, setConfirming] = useState(false);
  const [markLesson, setMarkLesson] = useState(false);
  const [lesson, setLesson] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setMarkLesson(false);
    setLesson("");
    if (entry) {
      setText(entry.text);
      setPillar((entry.pillar as Pillar) in PILLARS ? (entry.pillar as Pillar) : "life");
      setType(entry.entry_type as EntryType);
      setDate(entry.date);
    } else {
      setText("");
      setPillar("life");
      setType("reflection");
      setDate(todayISO());
    }
  }, [open, entry]);

  const save = useMutation({
    mutationFn: async () => {
      if (entry) return updateEntry(entry.id, { text: text.trim(), pillar, entry_type: type, date });
      await addEntry({ text: text.trim(), pillar, entry_type: type, date });
      if (markLesson && lesson.trim()) {
        await addEntry({ text: lesson.trim().slice(0, 500), pillar, entry_type: "lesson", is_lesson: true, date });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      setText("");
      setConfirming(false);
      onOpenChange(false);
      toast.success(entry ? "Changes saved" : "Saved to your journal");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={entry ? "Edit entry" : "New journal entry"}>
      <Field label="Pillar">
        <div className="flex gap-2">
          {(Object.keys(PILLARS) as Pillar[]).map((p) => (
            <Chip key={p} active={pillar === p} onClick={() => { setPillar(p); if (p !== "trading") setMarkLesson(false); }} className="flex-1">{PILLARS[p].label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Type">
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map((t) => (
            <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>{t.label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Entry"><TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened, and what did you learn?" className="min-h-40" /></Field>
      {!entry && pillar === "trading" && (
        <LessonToggle on={markLesson} onToggle={() => setMarkLesson((v) => !v)} value={lesson} onChange={setLesson} />
      )}
      {entry && confirming ? (
        <div className="rounded-2xl border-2 border-primary bg-secondary p-4">
          <p className="text-sm font-bold">Save these changes? The original entry will be overwritten.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex h-12 flex-1 items-center justify-center rounded-2xl border text-sm font-bold text-muted-foreground"
            >
              Keep editing
            </button>
            <PrimaryButton className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Yes, save changes"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <PrimaryButton
          onClick={() => (entry ? setConfirming(true) : save.mutate())}
          disabled={!text.trim() || save.isPending}
        >
          {entry ? "Review changes" : "Save entry"}
        </PrimaryButton>
      )}
    </FormSheet>
  );
}

function LessonFromSheet({ entry, onClose }: { entry: JournalRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [lesson, setLesson] = useState("");
  useEffect(() => { if (entry) setLesson(""); }, [entry]);
  const save = useMutation({
    mutationFn: () =>
      addEntry({ text: lesson.trim().slice(0, 500), pillar: (entry?.pillar as Pillar) ?? "life", entry_type: "lesson", is_lesson: true, date: entry?.date ?? todayISO() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lesson saved");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
  return (
    <FormSheet open={!!entry} onOpenChange={(v) => { if (!v) onClose(); }} title="Pull out the lesson">
      <p className="text-sm text-muted-foreground">Your full entry stays in the journal. Only this sentence goes into Lessons.</p>
      <Field label="The lesson — one clean sentence">
        <TextArea value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="e.g. Never enter before the 15m candle closes" />
      </Field>
      <PrimaryButton onClick={() => save.mutate()} disabled={!lesson.trim() || save.isPending}>
        {save.isPending ? "Saving…" : "Save lesson"}
      </PrimaryButton>
    </FormSheet>
  );
}
