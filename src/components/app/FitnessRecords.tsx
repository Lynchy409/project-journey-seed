import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "./AppShell";
import { Empty, Field, SectionTitle, SelectInput, TextInput } from "./ui";
import { FitnessError, SessionDetail, setLabel } from "./FitnessSession";
import { detailsOf, fitnessHistoryQuery, setsOf, type FitnessWorkout } from "@/lib/fitness";
import { prettyDate } from "@/lib/dates";

export function FitnessRecords() {
  const history = useQuery(fitnessHistoryQuery);
  const [exercise, setExercise] = useState("");
  const [load, setLoad] = useState("");
  const [side, setSide] = useState("");
  const [variation, setVariation] = useState("");
  const [view, setView] = useState<FitnessWorkout | null>(null);
  const names = [
    ...new Set((history.data ?? []).flatMap((w) => setsOf(w).map((s) => s.exercise))),
  ].sort();
  const rows = (history.data ?? [])
    .flatMap((w) => setsOf(w).map((s) => ({ w, s })))
    .filter(
      ({ w, s }) =>
        (!exercise || s.exercise.toLowerCase() === exercise.trim().toLowerCase()) &&
        (!load || s.load_type === load) &&
        (!side || s.side === side) &&
        (!variation || detailsOf(w).variation === variation),
    );
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.s.exercise} · ${r.s.load_type} · ${r.s.side} · ${detailsOf(r.w).variation}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return (
    <>
      <Card>
        <SectionTitle>Exercise records & history</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Every set, not just the top weight. Load type, side and session variation stay separate.
        </p>
      </Card>
      <Field label="Exercise records search">
        <TextInput
          list="record-exercises"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Choose or type an exact exercise"
        />
        <datalist id="record-exercises">
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Record load type">
          <SelectInput value={load} onChange={(e) => setLoad(e.target.value)}>
            <option value="">All load types</option>
            <option value="external">External</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="added">Added</option>
            <option value="assisted">Assistance</option>
          </SelectInput>
        </Field>
        <Field label="Record side">
          <SelectInput value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="">All sides</option>
            <option>both</option>
            <option>left</option>
            <option>right</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Record variation (exact match)">
        <TextInput
          value={variation}
          onChange={(e) => setVariation(e.target.value)}
          placeholder="Optional"
        />
      </Field>
      <FitnessError error={history.error} retry={() => history.refetch()} />
      {!history.isPending && !history.isError && !rows.length && (
        <Card>
          <Empty>No matching exercise results yet.</Empty>
        </Card>
      )}
      {[...groups].map(([key, records]) => {
        const weighted = records.filter(
          (r) => r.s.weight !== null && (r.s.reps ?? 0) > 0 && r.s.load_type !== "bodyweight",
        );
        const best = [...weighted].sort((a, b) =>
          records[0]!.s.load_type === "assisted"
            ? a.s.weight! - b.s.weight!
            : b.s.weight! - a.s.weight!,
        )[0];
        const holds = records.map((r) => r.s.seconds ?? 0);
        return (
          <Card key={key}>
            <p className="text-sm font-extrabold">{key}</p>
            {best && (
              <p className="mt-2 text-sm">
                {best.s.load_type === "assisted"
                  ? "Lowest recorded assistance"
                  : "Highest recorded load"}
                : {best.s.weight} kg × {best.s.reps} reps
              </p>
            )}
            {Math.max(...holds) > 0 && (
              <p className="mt-1 text-sm">Best single hold: {Math.max(...holds)}s</p>
            )}
            <div className="mt-3 space-y-2">
              {records.slice(0, 20).map(({ w, s }, i) => (
                <button
                  className="block min-h-11 w-full rounded-xl bg-secondary p-3 text-left text-xs"
                  key={`${w.id}-${i}`}
                  onClick={() => setView(w)}
                >
                  <span className="block font-bold">
                    {prettyDate(w.date)} · {w.name}
                  </span>
                  <span>{setLabel(s)}</span>
                </button>
              ))}
            </div>
            {records.length > 20 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Latest 20 matching sets. All sessions remain in Sessions.
              </p>
            )}
          </Card>
        );
      })}
      {view && <SessionDetail workout={view} onClose={() => setView(null)} />}
    </>
  );
}
