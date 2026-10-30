import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "./AppShell";
import { Field, TextInput, GhostButton, Empty, SectionTitle } from "./ui";
import { FitnessError, setLabel } from "./FitnessSession";
import { fitnessHistoryQuery, setsOf } from "@/lib/fitness";
import { prettyDate } from "@/lib/dates";

export function ExerciseHistory() {
  const history = useQuery(fitnessHistoryQuery);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const exercises = [
    ...new Map(
      (history.data ?? [])
        .flatMap((w) => setsOf(w))
        .filter((s) => s.exercise.trim())
        .map((s) => [s.exercise.trim().toLowerCase(), s.exercise.trim()]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b));
  const key = selected.toLowerCase();
  const sessions = (history.data ?? [])
    .map((w) => ({ w, sets: setsOf(w).filter((s) => s.exercise.trim().toLowerCase() === key) }))
    .filter((v) => v.sets.length);
  const best = sessions
    .flatMap((v) => v.sets)
    .filter((s) => s.weight != null && (s.reps ?? 0) > 0 && s.load_type !== "assisted")
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
  return (
    <>
      <Field label="Search exercises">
        <TextInput
          value={search}
          placeholder="Search your logged exercises"
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected("");
          }}
        />
      </Field>
      <FitnessError error={history.error} retry={() => history.refetch()} />
      {history.isPending && <p role="status">Loading exercises…</p>}
      {selected ? (
        <>
          <GhostButton onClick={() => setSelected("")}>All exercises</GhostButton>
          <div className="py-3">
            <h2 className="text-xl font-extrabold">{selected}</h2>
            <p className="mt-2 font-bold text-fitness">
              PB · {best ? setLabel(best) : "No weighted PB yet"}
            </p>
          </div>
          <SectionTitle>History</SectionTitle>
          {sessions.map(({ w, sets }) => (
            <Card key={w.id}>
              <p className="font-bold">{prettyDate(w.date)}</p>
              <ul className="mt-3 space-y-2">
                {sets.map((s, i) => (
                  <li key={i} className="flex justify-between gap-3 text-sm">
                    <span>Set {i + 1}</span>
                    <span className="font-semibold">{setLabel(s)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </>
      ) : (
        <>
          <GhostButton onClick={() => setSearch("")}>View all exercises</GhostButton>
          {exercises
            .filter((n) => n.toLowerCase().includes(search.trim().toLowerCase()))
            .map((n) => (
              <GhostButton key={n} className="text-left px-4" onClick={() => setSelected(n)}>
                {n}
              </GhostButton>
            ))}
          {!history.isPending && !history.isError && !exercises.length && (
            <Empty>No exercises logged yet.</Empty>
          )}
          {!!exercises.length &&
            !exercises.some((n) => n.toLowerCase().includes(search.trim().toLowerCase())) && (
              <Empty>No matching exercise.</Empty>
            )}
        </>
      )}
    </>
  );
}
