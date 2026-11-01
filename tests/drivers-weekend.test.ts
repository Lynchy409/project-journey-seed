import { describe, expect, test } from "bun:test";
import { isWeekend } from "../src/lib/drivers";

describe("trading session hidden on weekends", () => {
  test("Saturday and Sunday are weekend", () => {
    expect(isWeekend("2026-10-31")).toBe(true);
    expect(isWeekend("2026-11-01")).toBe(true);
  });
  test("Monday and Friday are not", () => {
    expect(isWeekend("2026-11-02")).toBe(false);
    expect(isWeekend("2026-10-30")).toBe(false);
  });
});
