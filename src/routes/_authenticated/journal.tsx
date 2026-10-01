import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, FormSheet, PrimaryButton, SectionTitle, TextArea, TextInput } from "@/components/app/ui";
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

function Journal() {
  const qc = useQueryClient();
  const { data: entries } = useQuery(journalQuery);
  const [pillar, setPillar] = useState<Pillar | "all">("all");
  const [type, setType] = useState<EntryType | "all" | "lessons">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

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
      <PrimaryButton onClick={() => setOpen(true)}>
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
                <button aria-label="Delete entry" onClick={() => remove.mutate(e.id)} className="shrink-0 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-snug">{e.text}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => patch.mutate({ id: e.id, is_lesson: !e.is_lesson })}
                  className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${e.is_lesson ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  <Star className="h-4 w-4" /> {e.is_lesson ? "Lesson" : "Mark as lesson"}
                </button>
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

      <EntrySheet open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function EntrySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pillar, setPillar] = useState<Pillar>("life");
  const [type, setType] = useState<EntryType>("reflection");
  const [date, setDate] = useState(todayISO());

  const save = useMutation({
    mutationFn: () => addEntry({ text: text.trim(), pillar, entry_type: type, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
      setText("");
      onOpenChange(false);
      toast.success("Saved to your journal");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="New journal entry">
      <Field label="Pillar">
        <div className="flex gap-2">
          {(Object.keys(PILLARS) as Pillar[]).map((p) => (
            <Chip key={p} active={pillar === p} onClick={() => setPillar(p)} className="flex-1">{PILLARS[p].label}</Chip>
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
      <PrimaryButton onClick={() => save.mutate()} disabled={!text.trim() || save.isPending}>Save entry</PrimaryButton>
    </FormSheet>
  );
}
