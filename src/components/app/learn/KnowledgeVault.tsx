import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Check, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Chip, FormSheet, PrimaryButton, SectionTitle } from "@/components/app/ui";
import { SpeakButton } from "@/components/app/spanish/VoiceControls";
import { addCard, flashcardsQuery } from "@/lib/learn";
import { LIBRARY, TOPICS, pieceOfDay, topicLabel, type KnowledgePiece, type Topic } from "@/lib/knowledge";

export function KnowledgeVault() {
  const qc = useQueryClient();
  const { data: cards } = useQuery(flashcardsQuery);
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [open, setOpen] = useState<KnowledgePiece | null>(null);
  const saved = new Set((cards ?? []).map((c) => c.front));
  const isLocked = (p: KnowledgePiece) => p.facts.every((f) => saved.has(f.q));
  const today = pieceOfDay();
  const shown = LIBRARY.filter((p) => topic === "all" || p.topic === topic);

  const lock = useMutation({
    mutationFn: async (p: KnowledgePiece) => {
      for (const f of p.facts.filter((f) => !saved.has(f.q)))
        await addCard({ deck: topicLabel(p.topic), front: f.q, back: f.a });
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success(`${p.facts.length} question${p.facts.length > 1 ? "s" : ""} added to Recall`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <>
      <button onClick={() => setOpen(today)} className="block w-full text-left">
        <Card>
          <p className="text-xs font-extrabold uppercase tracking-wider text-learning">Today's read · 2 min</p>
          <p className="mt-1 text-xl font-extrabold leading-snug">{today.title}</p>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-muted-foreground">{today.story}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">{topicLabel(today.topic)}</p>
        </Card>
      </button>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={topic === "all"} onClick={() => setTopic("all")}>All</Chip>
        {TOPICS.map((t) => (
          <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)} className="shrink-0 whitespace-nowrap">
            {t.label}
          </Chip>
        ))}
      </div>

      <Card>
        <SectionTitle>{topic === "all" ? "Library" : topicLabel(topic)}</SectionTitle>
        <ul className="mt-3 space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <button onClick={() => setOpen(p)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border p-3 text-left">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${isLocked(p) ? "bg-learning-soft text-learning" : "bg-secondary text-muted-foreground"}`}>
                  {isLocked(p) ? <Check className="h-4 w-4" /> : p.facts.length}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold leading-snug">{p.title}</span>
                  {topic === "all" && <span className="text-[11px] font-bold text-muted-foreground">{topicLabel(p.topic)}</span>}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <FormSheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open?.title ?? ""}>
        {open && (
          <div className="space-y-4">
            <div>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-base font-medium leading-relaxed">{open.story}</p>
                {open.topic === "spanish" && open.id.startsWith("k-story") && <SpeakButton text={open.story} />}
              </div>
            </div>
            <div className="rounded-2xl bg-learning-soft p-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-learning">The lesson</p>
              <p className="mt-1 text-sm font-bold">{open.lesson}</p>
            </div>
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Use it today</p>
              <p className="mt-1 text-sm font-semibold">{open.apply}</p>
            </div>
            {open.source && (
              <a href={open.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-learning underline underline-offset-4">
                {open.source.label} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <PrimaryButton disabled={isLocked(open) || lock.isPending} onClick={() => lock.mutate(open)}>
              <span className="flex items-center justify-center gap-2">
                {isLocked(open) ? <Check className="h-5 w-5" /> : <BookmarkPlus className="h-5 w-5" />}
                {isLocked(open) ? "Locked into Recall" : "Lock into memory"}
              </span>
            </PrimaryButton>
          </div>
        )}
      </FormSheet>
    </>
  );
}
