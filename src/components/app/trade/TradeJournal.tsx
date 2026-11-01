import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Chip, Empty, PrimaryButton, TextArea, TextInput } from "@/components/app/ui";
import { deleteEntry } from "@/lib/journal";
import { NOTE_KINDS, addTradeNote, tradeNotesQuery, type NoteKind } from "@/lib/trade-accounts";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

/** One simple stream for market observations, trade thoughts and backtest ideas. */
export function TradeJournal({ lessons }: { lessons: React.ReactNode }) {
  const qc = useQueryClient();
  const { data: notes, isPending } = useQuery(tradeNotesQuery);
  const [filter, setFilter] = useState<NoteKind | "all" | "lessons">("all");
  const [kind, setKind] = useState<NoteKind>("market_note");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const add = useMutation({
    mutationFn: () => addTradeNote(kind, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Saved");
    },
    onError: () => toast.error("Could not save. Your note is still here."),
  });
  const remove = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  const rows = (notes ?? []).filter(
    (n) =>
      (filter === "all" || n.entry_type === filter) &&
      (!q.trim() || n.text.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <>
      <Card>
        <div className="flex gap-2">
          {NOTE_KINDS.map((k) => (
            <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)} className="flex-1">
              {k.label}
            </Chip>
          ))}
        </div>
        <TextArea
          className="mt-3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "market_note"
              ? "What did the market do? What did you notice?"
              : kind === "trade_thought"
                ? "How did you trade? What would you repeat or change?"
                : "What did you test, and what did it show?"
          }
        />
        <div className="mt-3">
          <PrimaryButton disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>
            Save note
          </PrimaryButton>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        {NOTE_KINDS.map((k) => (
          <Chip key={k.value} active={filter === k.value} onClick={() => setFilter(k.value)}>
            {k.label}
          </Chip>
        ))}
        <Chip active={filter === "lessons"} onClick={() => setFilter("lessons")}>Lessons</Chip>
      </div>

      {filter === "lessons" ? (
        lessons
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput className="pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your notes" />
          </div>
          {isPending ? (
            <Empty>Loading notes…</Empty>
          ) : !rows.length ? (
            <Card><Empty>{q ? "No notes match that search." : "No notes yet. Your first thought goes above."}</Empty></Card>
          ) : (
            rows.map((n) => {
              const k = NOTE_KINDS.find((x) => x.value === n.entry_type)!;
              return (
                <Card key={n.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${k.tone}`}>{k.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">{stamp(n.created_at)}</span>
                      <button aria-label="Delete note" onClick={() => remove.mutate(n.id)} className="text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[15px] font-medium leading-relaxed">{n.text}</p>
                </Card>
              );
            })
          )}
        </>
      )}
    </>
  );
}
