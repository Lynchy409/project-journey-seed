import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeAnswer } from "../src/lib/knowledge.ts";

test("a round-about answer with the key idea counts as right", () => {
  assert.equal(gradeAnswer("the surprise vs forecast", "The surprise, the actual compared to the forecast or expectation").correct, true);
});

test("an answer missing the key idea is marked wrong", () => {
  assert.equal(gradeAnswer("good news", "The surprise, the actual compared to the forecast or expectation").correct, false);
});

test("short answers ignore case and accents", () => {
  assert.equal(gradeAnswer("cion", "-ción").correct, true);
  assert.equal(gradeAnswer("epictetus", "Epictetus").correct, true);
});
