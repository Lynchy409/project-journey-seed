import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/app/AppShell";
import { Chip, Empty, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/app/ui";
import { PILLARS, type Pillar } from "@/lib/pillars";
import { profileQuery, statementsQuery } from "@/lib/profile";
import { lessonsQuery } from "@/lib/journal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "You — My Journey" },
      { name: "description", content: "Your identity statements, tracking preferences and lessons library." },
      { property: "og:title", content: "You — My Journey" },
      { property: "og:description", content: "Your identity statements, tracking preferences and lessons library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery(profileQuery);
  const { data: statements } = useQuery(statementsQuery);
  const { data: lessons } = useQuery(lessonsQuery);
  const [name, setName] = useState<string | null>(null);
  const [newStatement, setNewStatement] = useState("");
  const [pillar, setPillar] = useState<Pillar>("life");

  const patch = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(values).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const addStatement = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("identity_statements")
        .insert({ user_id: u.user.id, text: newStatement.trim(), pillar, sort: statements?.length ?? 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["identity_statements"] });
      setNewStatement("");
      toast.success("Added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const removeStatement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("identity_statements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["identity_statements"] }),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  return (
    <AppShell eyebrow="You" title={profile?.display_name ?? "Your settings"}>
      <Card>
        <SectionTitle>Your name</SectionTitle>
        <div className="mt-3 flex gap-2">
          <TextInput
            value={name ?? profile?.display_name ?? ""}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button
            onClick={() => patch.mutate({ display_name: (name ?? "").trim() || profile?.display_name })}
            className="h-12 shrink-0 rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle>What you want to track</SectionTitle>
        <div className="mt-3 space-y-2">
          <Toggle
            label="Weight"
            on={!!profile?.track_weight}
            onToggle={() => patch.mutate({ track_weight: !profile?.track_weight })}
          />
          <Toggle
            label="Water"
            on={!!profile?.track_water}
            onToggle={() => patch.mutate({ track_water: !profile?.track_water })}
          />
          <Toggle
            label="Switch-on screen when you open the app"
            on={!!profile?.show_switch_on}
            onToggle={() => patch.mutate({ show_switch_on: !profile?.show_switch_on })}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Units">
            <div className="flex gap-2">
              {["kg", "lb"].map((u) => (
                <Chip key={u} active={profile?.units === u} onClick={() => patch.mutate({ units: u })} className="flex-1">{u}</Chip>
              ))}
            </div>
          </Field>
          <Field label="Water target (ml)">
            <TextInput
              inputMode="numeric"
              defaultValue={profile?.water_target_ml ?? 3000}
              onBlur={(e) => patch.mutate({ water_target_ml: Number(e.target.value || 3000) })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle>Who you are</SectionTitle>
        <ul className="mt-3 space-y-2">
          {statements?.map((s) => {
            const p = (s.pillar as Pillar) in PILLARS ? (s.pillar as Pillar) : "life";
            return (
              <li key={s.id} className="flex items-start gap-3 rounded-2xl border p-3">
                <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${PILLARS[p].soft}`} />
                <span className="flex-1 text-sm font-semibold leading-snug">{s.text}</span>
                <button aria-label="Delete statement" onClick={() => removeStatement.mutate(s.id)} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PILLARS) as Pillar[]).map((p) => (
              <Chip key={p} active={pillar === p} onClick={() => setPillar(p)}>{PILLARS[p].label}</Chip>
            ))}
          </div>
          <TextInput value={newStatement} onChange={(e) => setNewStatement(e.target.value)} placeholder="I am…" />
          <PrimaryButton onClick={() => addStatement.mutate()} disabled={!newStatement.trim() || addStatement.isPending}>
            <span className="flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Add statement</span>
          </PrimaryButton>
        </div>
      </Card>

      <Card>
        <SectionTitle>Lessons library</SectionTitle>
        {!lessons?.length ? (
          <Empty>Mark journal entries as lessons and they collect here.</Empty>
        ) : (
          <ul className="mt-3 space-y-2">
            {lessons.map((l) => (
              <li key={l.id} className="rounded-2xl border p-3 text-sm font-semibold leading-snug">{l.text}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <button onClick={signOut} className="h-12 w-full rounded-2xl border text-sm font-extrabold text-destructive">
          Sign out
        </button>
      </Card>
    </AppShell>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex h-14 w-full items-center justify-between rounded-2xl bg-secondary px-4 text-left">
      <span className="pr-3 text-sm font-bold leading-snug">{label}</span>
      <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`h-5 w-5 rounded-full bg-card transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
