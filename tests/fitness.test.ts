import test from "node:test";
import assert from "node:assert/strict";
import {
  comparableRuns,
  comparableScores,
  detailsOf,
  distanceMetres,
  distanceUnits,
  emptyDetails,
  emptySet,
  goalValue,
  parseDuration,
  periodBounds,
  previousExercise,
  setsOf,
  trackingDefaults,
  trainingSlotForTask,
  validateSession,
  type FitnessWorkout,
} from "../src/lib/fitness";
import type { FitnessSet, GoalTracking } from "../src/lib/fitness-types";
import type { Json } from "../src/integrations/supabase/types";

function workout(
  id: string,
  date: string,
  details: object = {},
  sets: Partial<FitnessSet>[] = [],
  kind = "gym",
): FitnessWorkout {
  return {
    id,
    date,
    name: id,
    kind,
    notes: null,
    created_at: `${date}T12:00:00Z`,
    details: { ...emptyDetails(), ...details } as unknown as Json,
    exercise_sets: sets.map((s, i) => ({
      id: `${id}-${i}`,
      exercise: s.exercise ?? "Bench press",
      weight: s.weight ?? null,
      reps: s.reps ?? null,
      set_index: i + 1,
      details: { ...emptySet(), ...s } as unknown as Json,
    })),
  };
}
const tracking = (t: Partial<GoalTracking>): GoalTracking => ({ ...trackingDefaults(), ...t });
test("calendar week is Monday to Sunday, including DST boundary", () => {
  assert.deepEqual(periodBounds("week", "2026-10-25"), { start: "2026-10-19", end: "2026-10-25" });
  assert.deepEqual(periodBounds("week", "2026-10-26"), { start: "2026-10-26", end: "2026-11-01" });
});
test("calendar months include leap days and year boundaries", () => {
  assert.deepEqual(periodBounds("month", "2028-02-17"), { start: "2028-02-01", end: "2028-02-29" });
  assert.deepEqual(periodBounds("month", "2026-12-31"), { start: "2026-12-01", end: "2026-12-31" });
});
test("miles/km convert without unit drift", () => {
  assert.equal(distanceMetres(1, "miles"), 1609.344);
  assert.equal(distanceUnits(distanceMetres(5, "miles"), "miles"), 5);
});
test("duration accepts minutes or minutes:seconds and rejects malformed inputs", () => {
  assert.equal(parseDuration("25:30"), 1530);
  assert.equal(parseDuration("3"), 180);
  assert.equal(parseDuration(""), null);
  for (const v of ["-1", "1:70", "1:2", "NaN", "2.5"]) assert.throws(() => parseDuration(v));
});
test("previous session shows every set, not just a personal best", () => {
  const old = workout("old", "2026-10-20", {}, [
    { weight: 60, reps: 8 },
    { weight: 65, reps: 6 },
    { weight: 70, reps: 4 },
  ]);
  const future = workout("future", "2026-10-27", {}, [{ weight: 80, reps: 2 }]);
  const found = previousExercise([future, old], " bench PRESS ", "2026-10-25");
  assert.equal(found?.id, "old");
  assert.deepEqual(
    setsOf(found!).map((s) => [s.weight, s.reps]),
    [
      [60, 8],
      [65, 6],
      [70, 4],
    ],
  );
});
test("previous session uses performed date, then created timestamp", () => {
  assert.equal(
    previousExercise(
      [workout("a", "2026-10-20", {}, [{}]), workout("b", "2026-10-22", {}, [{}])],
      "Bench press",
      "2026-10-25",
    )?.id,
    "b",
  );
});
test("best continuous hold never adds separate attempts", () => {
  const rows = [
    workout("plank", "2026-10-25", {}, [
      { exercise: "Plank", seconds: 60 },
      { exercise: "Plank", seconds: 75 },
    ]),
  ];
  assert.equal(
    goalValue(tracking({ mode: "best", measure: "seconds", exercise: "Plank" }), rows),
    75,
  );
  assert.equal(
    goalValue(tracking({ mode: "sum", measure: "seconds", exercise: "Plank" }), rows),
    135,
  );
});
test("bench load targets respect minimum reps and load type", () => {
  const rows = [
    workout("bench", "2026-10-25", {}, [
      { weight: 100, reps: 0 },
      { weight: 95, reps: 3 },
      { weight: 150, reps: 3, load_type: "assisted" },
      { weight: 20, reps: 5, load_type: "added" },
    ]),
  ];
  assert.equal(
    goalValue(
      tracking({
        mode: "best",
        measure: "weight",
        exercise: "Bench press",
        min_reps: 1,
        load_type: "external",
      }),
      rows,
    ),
    95,
  );
});
test("left and right hold records stay separate when selected", () => {
  const rows = [
    workout("sides", "2026-10-25", {}, [
      { exercise: "Side plank", seconds: 100, side: "left" },
      { exercise: "Side plank", seconds: 80, side: "right" },
    ]),
  ];
  assert.equal(
    goalValue(
      tracking({ mode: "best", measure: "seconds", exercise: "Side plank", side: "right" }),
      rows,
    ),
    80,
  );
});
test("weekly miles use actual activity dates and the selected type", () => {
  const rows = [
    workout("run", "2026-10-25", { distance_m: 1609.344 }, [], "run"),
    workout("old", "2026-10-18", { distance_m: 16093.44 }, [], "run"),
    workout("cycle", "2026-10-25", { distance_m: 16093.44 }, [], "cycling"),
  ];
  assert.equal(
    goalValue(
      tracking({
        mode: "sum",
        measure: "distance_m",
        unit: "miles",
        kind: "run",
        ...periodBounds("week", "2026-10-25"),
      }),
      rows,
    ),
    1,
  );
});
test("best single run distance and accumulated distance differ", () => {
  const rows = [
    workout("a", "2026-10-24", { distance_m: 5000 }),
    workout("b", "2026-10-25", { distance_m: 8000 }),
  ];
  assert.equal(goalValue(tracking({ mode: "best", measure: "distance_m", unit: "km" }), rows), 8);
  assert.equal(goalValue(tracking({ mode: "sum", measure: "distance_m", unit: "km" }), rows), 13);
});
test("session consistency counts unique workouts, not sets", () => {
  const rows = [workout("a", "2026-10-24", {}, [{}, {}, {}]), workout("b", "2026-10-25")];
  assert.equal(goalValue(tracking({ mode: "count" }), rows), 2);
  assert.equal(goalValue(tracking({ mode: "count", exercise: "Bench press" }), rows), 1);
});
test("session consistency respects load type, side and minimum reps on the same set", () => {
  const rows = [
    workout("wrong-load", "2026-10-25", {}, [{ load_type: "assisted", side: "left", reps: 8 }]),
    workout("wrong-side", "2026-10-25", {}, [{ load_type: "external", side: "right", reps: 8 }]),
    workout("too-few", "2026-10-25", {}, [{ load_type: "external", side: "left", reps: 2 }]),
    workout("split-filters", "2026-10-25", {}, [
      { load_type: "external", side: "right", reps: 8 },
      { load_type: "assisted", side: "left", reps: 8 },
    ]),
    workout("matching", "2026-10-25", {}, [
      { load_type: "external", side: "left", reps: 5 },
      { load_type: "external", side: "left", reps: 6 },
    ]),
  ];
  assert.equal(
    goalValue(
      tracking({
        mode: "count",
        exercise: "Bench press",
        measure: "weight",
        load_type: "external",
        side: "left",
        min_reps: 5,
      }),
      rows,
    ),
    1,
  );
  assert.equal(
    goalValue(
      tracking({
        mode: "count",
        exercise: "Bench press",
        measure: "reps",
        load_type: "external",
        side: "left",
        min_reps: 10,
      }),
      rows,
    ),
    2,
  );
});
test("run comparisons exclude distance, kind and variation changes", () => {
  const rows = [
    workout(
      "ok",
      "2026-10-25",
      { distance_m: 5000, duration_seconds: 1500, variation: "road" },
      [],
      "run",
    ),
    workout(
      "short",
      "2026-10-25",
      { distance_m: 3000, duration_seconds: 900, variation: "road" },
      [],
      "run",
    ),
    workout(
      "treadmill",
      "2026-10-25",
      { distance_m: 5000, duration_seconds: 1400, variation: "treadmill" },
      [],
      "run",
    ),
  ];
  assert.deepEqual(
    comparableRuns(rows, "run", 5000, "road").map((w) => w.id),
    ["ok"],
  );
});
test("circuit records compare the exact template version and scaling", () => {
  const rows = [
    workout("ok", "2026-10-25", {
      template_id: "cindy",
      template_version: 1,
      variation: "Rx",
      score: 12,
    }),
    workout("scaled", "2026-10-25", {
      template_id: "cindy",
      template_version: 1,
      variation: "scaled",
      score: 20,
    }),
    workout("v2", "2026-10-25", {
      template_id: "cindy",
      template_version: 2,
      variation: "Rx",
      score: 20,
    }),
  ];
  assert.deepEqual(
    comparableScores(rows, "cindy", 1, "Rx").map((w) => w.id),
    ["ok"],
  );
  assert.equal(comparableScores(rows, "cindy", 1, "Rx", "rounds", "higher").length, 1);
  assert.equal(comparableScores(rows, "cindy", 1, "Rx", "seconds", "higher").length, 0);
  assert.equal(comparableScores(rows, "cindy", 1, "Rx", "rounds", "lower").length, 0);
});
test("legacy task labels route to the appropriate structured logger", () => {
  assert.equal(trainingSlotForTask("Shoulder mobility"), "recovery");
  assert.equal(trainingSlotForTask("Horse stance hold"), "strength");
  assert.equal(trainingSlotForTask("Bag training"), "cardio");
  assert.equal(trainingSlotForTask("Read a book"), null);
});
test("legacy workout JSON remains readable", () => {
  assert.equal(detailsOf({ details: {}, kind: "recovery" }).slot, "recovery");
  assert.equal(detailsOf({ details: {}, kind: "run" }).slot, "cardio");
});
test("empty and invalid sessions cannot be saved", () => {
  assert.throws(() => validateSession("Empty", "2026-10-25", emptyDetails(), []));
  assert.throws(() => validateSession("Bad date", "2026-02-30", emptyDetails(), []));
  assert.throws(() =>
    validateSession("Bad set", "2026-10-25", emptyDetails(), [
      { ...emptySet("Bench"), weight: -5, reps: 3 },
    ]),
  );
  assert.throws(() =>
    validateSession("Fractional reps", "2026-10-25", emptyDetails(), [
      { ...emptySet("Bench"), reps: 2.5 },
    ]),
  );
  assert.doesNotThrow(() =>
    validateSession(
      "Recovery",
      "2026-10-25",
      { ...emptyDetails("recovery"), duration_seconds: 180 },
      [],
    ),
  );
});
