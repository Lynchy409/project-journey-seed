import { describe, expect, it } from "vitest";
import { levelFromXp, rankFor } from "./xp";
import { driverXp } from "./drivers";

describe("xp", () => {
  it("level 1→2 needs 250 XP", () => {
    expect(levelFromXp(249).level).toBe(1);
    expect(levelFromXp(250).level).toBe(2);
  });
  it("level 2→3 needs 350, 3→4 needs 500", () => {
    expect(levelFromXp(599).level).toBe(2);
    expect(levelFromXp(600).level).toBe(3);
    expect(levelFromXp(1100).level).toBe(4);
  });
  it("ranks", () => {
    expect(rankFor(4)).toBe("Rookie");
    expect(rankFor(5)).toBe("Contender");
    expect(rankFor(10)).toBe("Operator");
  });
  it("boss bounties pay 150, rule breach pays 0", () => {
    expect(driverXp("sprint", "x")).toBe(150);
    expect(driverXp("trading", "[patient] waited")).toBe(150);
    expect(driverXp("trading", "[breach] chased")).toBe(0);
  });
});
