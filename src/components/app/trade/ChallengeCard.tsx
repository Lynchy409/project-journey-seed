import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, ShieldAlert, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/app/AppShell";
import { Bar, Field, FormSheet, GhostButton, PrimaryButton, SelectInput, TextArea, TextInput } from "@/components/app/ui";
import {
  deleteChallenge,
  money,
  saveChallenge,
  type Challenge,
  type ChallengeStatus,
} from "@/lib/trade-accounts";

const LEVEL = {
  safe: { label: "Safe", cls: "bg-trading-soft text-trading", Icon: ShieldCheck },
  caution: { label: "Caution", cls: "bg-fitness-soft text-fitness", Icon: ShieldAlert },
  danger: { label: "Danger — stop and step away", cls: "bg-destructive/10 text-destructive", Icon: ShieldAlert },
  breached: { label: "Rule breached", cls: "bg-destructive/10 text-destructive", Icon: ShieldAlert },
  passed: { label: "Target hit", cls: "bg-trading-soft text-trading", Icon: Trophy },
} as const;

export function ChallengeCard({
  challenge: c,
  status: s,
  onEdit,
}: {
  challenge: Challenge;
  status: ChallengeStatus;
  onEdit: () => void;
}) {
  const lvl = LEVEL[s.level];
  const dailyUsed = c.maxDailyLoss ? 100 - (s.dailyBuffer / c.maxDailyLoss) * 100 : 0;
  const ddUsed = c.maxDrawdown ? 100 - (s.drawdownBuffer / c.maxDrawdown) * 100 : 0;
  const tone = (used: number) =>
    used >= 75 ? "bg-destructive" : used >= 40 ? "bg-fitness" : "bg-trading";
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.name}</p>
          <p className={`mt-1 text-3xl font-extrabold leading-none ${s.profit >= 0 ? "text-trading" : "text-destructive"}`}>
            {money(s.profit, c.currency)}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Balance {money(s.balance, c.currency, false)}
          </p>
        </div>
        <button aria-label="Edit challenge" onClick={onEdit} className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs font-bold">
          <span>Target {money(c.profitTarget, c.currency, false)}</span>
          <span className="text-trading">{Math.round(s.targetPct)}%</span>
        </div>
        <Bar pct={s.targetPct} className="bg-trading" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily buffer</p>
          <p className="mt-1 text-lg font-extrabold">{money(s.dailyBuffer, c.currency, false)}</p>
          <div className="mt-2"><Bar pct={dailyUsed} className={tone(dailyUsed)} /></div>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max DD buffer</p>
          <p className="mt-1 text-lg font-extrabold">{money(s.drawdownBuffer, c.currency, false)}</p>
          <div className="mt-2"><Bar pct={ddUsed} className={tone(ddUsed)} /></div>
        </div>
      </div>

      <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${lvl.cls}`}>
        <lvl.Icon className="h-3.5 w-3.5" /> {lvl.label}
      </span>
      {c.rules && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-bold">Challenge rules</summary>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{c.rules}</p>
        </details>
      )}
    </Card>
  );
}

const blank = { name: "", currency: "GBP", startingBalance: "", profitTarget: "", maxDailyLoss: "", maxDrawdown: "", rules: "" };

export function ChallengeSheet({
  open,
  onOpenChange,
  challenge,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  challenge: Challenge | null;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (!open) return;
    setF(
      challenge
        ? {
            name: challenge.name,
            currency: challenge.currency,
            startingBalance: String(challenge.startingBalance),
            profitTarget: String(challenge.profitTarget),
            maxDailyLoss: String(challenge.maxDailyLoss),
            maxDrawdown: String(challenge.maxDrawdown),
            rules: challenge.rules,
          }
        : blank,
    );
  }, [open, challenge]);
  const set = (k: keyof typeof blank, v: string) => setF((s) => ({ ...s, [k]: v }));
  const nums = [f.startingBalance, f.profitTarget, f.maxDailyLoss, f.maxDrawdown].map(Number);
  const valid = f.name.trim() && nums.every((n) => Number.isFinite(n) && n > 0);
  const done = () => {
    qc.invalidateQueries({ queryKey: ["trade_challenges"] });
    onOpenChange(false);
    onSaved?.();
  };
  const save = useMutation({
    mutationFn: () =>
      saveChallenge({
        id: challenge?.id,
        name: f.name.trim(),
        currency: f.currency,
        startingBalance: nums[0]!,
        profitTarget: nums[1]!,
        maxDailyLoss: nums[2]!,
        maxDrawdown: nums[3]!,
        rules: f.rules.trim(),
      }),
    onSuccess: () => {
      toast.success(challenge ? "Challenge updated" : "Challenge added");
      done();
    },
    onError: () => toast.error("Could not save the challenge. Your details are still here."),
  });
  const remove = useMutation({
    mutationFn: () => deleteChallenge(challenge!.id),
    onSuccess: () => {
      toast.success("Challenge removed");
      done();
    },
  });
  const pct = (v: string) => {
    const b = Number(f.startingBalance);
    return b > 0 && Number(v) > 0 ? ` (${Math.round((Number(v) / b) * 1000) / 10}%)` : "";
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={challenge ? "Edit challenge" : "New challenge"}>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <Field label="Name">
          <TextInput value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. FTMO 100k Phase 1" />
        </Field>
        <Field label="Currency">
          <SelectInput value={f.currency} onChange={(e) => set("currency", e.target.value)}>
            <option>GBP</option>
            <option>USD</option>
            <option>EUR</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Starting balance">
        <TextInput inputMode="decimal" value={f.startingBalance} onChange={(e) => set("startingBalance", e.target.value)} />
      </Field>
      <Field label={`Profit target${pct(f.profitTarget)}`}>
        <TextInput inputMode="decimal" value={f.profitTarget} onChange={(e) => set("profitTarget", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Max daily loss${pct(f.maxDailyLoss)}`}>
          <TextInput inputMode="decimal" value={f.maxDailyLoss} onChange={(e) => set("maxDailyLoss", e.target.value)} />
        </Field>
        <Field label={`Max drawdown${pct(f.maxDrawdown)}`}>
          <TextInput inputMode="decimal" value={f.maxDrawdown} onChange={(e) => set("maxDrawdown", e.target.value)} />
        </Field>
      </div>
      <Field label="Other rules">
        <TextArea value={f.rules} onChange={(e) => set("rules", e.target.value)} placeholder="Min trading days, no news trading, weekend holding…" />
      </Field>
      <PrimaryButton disabled={!valid || save.isPending} onClick={() => save.mutate()}>
        {challenge ? "Save changes" : "Add challenge"}
      </PrimaryButton>
      {challenge && (
        <GhostButton className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
          Delete challenge
        </GhostButton>
      )}
    </FormSheet>
  );
}
