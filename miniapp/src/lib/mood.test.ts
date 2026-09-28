import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Checkin } from "../types";
import { averageMood, getMoodTone, getRecentAverage, getStudentState } from "./mood";

/** Ответы от нового к старому, как их отдаёт API. */
const history = (...moods: number[]): Checkin[] =>
  moods.map((mood, index) => ({
    id: String(index),
    studentId: "s",
    mood,
    reasons: [],
    comment: null,
    date: `2026-09-${String(28 - index).padStart(2, "0")}`,
    createdAt: "",
  }));

describe("getStudentState", () => {
  it("без ответов — нет данных", () => {
    assert.equal(getStudentState([]), "no-data");
  });

  it("последняя оценка 1–2 требует внимания, даже если раньше всё было хорошо", () => {
    assert.equal(getStudentState(history(2, 5, 5, 5)), "attention");
    assert.equal(getStudentState(history(1)), "attention");
  });

  it("низкая средняя требует внимания", () => {
    assert.equal(getStudentState(history(3, 2, 2, 2)), "attention");
  });

  it("три падения подряд — нестабильное", () => {
    assert.equal(getStudentState(history(3, 4, 5)), "unstable");
  });

  it("большой разброс оценок — нестабильное", () => {
    assert.equal(getStudentState(history(4, 2, 5, 1, 4, 3, 5)), "unstable");
  });

  it("стабильно высокие оценки — хорошее", () => {
    assert.equal(getStudentState(history(5, 4, 5, 4, 4)), "positive");
  });

  it("ровные средние оценки — стабильное", () => {
    assert.equal(getStudentState(history(3, 4, 3, 3, 4)), "stable");
  });

  it("учитывает только последние 30 ответов", () => {
    const recentGood = history(...Array<number>(30).fill(4), ...Array<number>(30).fill(1));
    assert.equal(getStudentState(recentGood), "positive");
  });
});

describe("средние и тона", () => {
  it("averageMood", () => {
    assert.equal(averageMood([]), null);
    assert.equal(averageMood(history(2, 4)), 3);
  });

  it("getRecentAverage берёт 30 последних", () => {
    assert.equal(getRecentAverage(history(...Array<number>(30).fill(5), 1)), 5);
  });

  it("getMoodTone", () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(getMoodTone), ["low", "low", "mid", "high", "high"]);
  });
});
