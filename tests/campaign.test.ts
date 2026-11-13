import { describe, expect, it } from "bun:test";
import { daysLeft, nextMove, pct, type Node } from "../src/lib/campaign";
const n = (id: string, parent_id: string | null, o: Partial<Node> = {}): Node => ({ id, parent_id, title: id, target_value: null, current_value: 0, status: "active", created_at: id, ...o });
const all = [n("g", null), n("a", "g", { target_value: 10, current_value: 5 }), n("b", "g", { target_value: 2, current_value: 2 })];
describe("campaign", () => {
  it("parent averages stages", () => expect(pct(all[0], all)).toBe(75));
  it("next move is first unfinished stage", () => expect(nextMove(all[0], all)?.id).toBe("a"));
  it("days left", () => expect(daysLeft("2026-11-20", new Date("2026-11-13T12:00:00Z"))).toBe(7));
});
