import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, ChevronDown, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/app/AppShell";

const key = ["life-todos"];

export function LifeTodos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { data = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("inner_items").select("id,title").eq("kind", "todo").eq("done", false).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async (title: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("inner_items").insert({ kind: "todo", title, user_id: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const tick = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inner_items").update({ done: true }).eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => qc.setQueryData(key, (old: typeof data = []) => old.filter((t) => t.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-3 text-left">
        <ListTodo className="h-5 w-5 text-primary" />
        <span className="flex-1 font-semibold">Life To-Dos</span>
        <span className="text-sm text-muted-foreground">{data.length} pending</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { add.mutate(t); setText(""); } }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a to-do and hit enter"
              className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </form>
          {data.map((t) => (
            <button key={t.id} onClick={() => tick.mutate(t.id)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-muted">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
