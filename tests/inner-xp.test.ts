import { describe, expect, it } from "vitest";
import { innerXp } from "../src/lib/inner";
import { lifeFlight } from "../src/lib/faith";

describe("inner xp", () => {
  it("counts completed objective XP on its completion date", () => {
    expect(innerXp([{ kind: "objective", done: true, score: 250, output: "2026-11-01", date: null }])).toEqual([{ date: "2026-11-01", xp: 250 }]);
  });
  it("ignores unfinished objectives", () => {
    expect(innerXp([{ kind: "objective", done: false, score: null, output: null, date: null }])).toEqual([]);
  });
  it("gives 20 XP per clean streak day", () => {
    expect(innerXp([{ kind: "streak_day", done: false, score: null, output: null, date: "2026-11-01" }])[0]!.xp).toBe(20);
  });
  it("life flight uses an 81-year journey", () => {
    const f = lifeFlight("2004-11-01", new Date("2026-11-01T12:00:00"));
    expect(f.age).toBe(22);
    expect(Math.round(f.pct)).toBe(27);
  });
});
