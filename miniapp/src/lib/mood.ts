import type { Checkin } from "../types";

export interface Mood {
  value: number;
  emoji: string;
  label: string;
}

export const MOODS: Mood[] = [
  { value: 1, emoji: "😣", label: "Очень тяжело" },
  { value: 2, emoji: "😕", label: "Тяжело" },
  { value: 3, emoji: "😐", label: "Нормально" },
  { value: 4, emoji: "🙂", label: "Хорошо" },
  { value: 5, emoji: "😄", label: "Отлично" },
];

export const REASONS = [
  "Тревога",
  "Усталость",
  "Конфликт",
  "Одиночество",
  "Перегруз",
  "Проблемы дома",
  "Страх перед учёбой",
  "Хороший день",
  "Успех в учёбе",
  "Друзья",
  "Другое",
];

export const getMood = (value: number) => MOODS.find((mood) => mood.value === value) ?? MOODS[2];

/** Цветовой тон оценки: для точек истории и бейджей. */
export type MoodTone = "low" | "mid" | "high";
export const getMoodTone = (value: number): MoodTone => (value <= 2 ? "low" : value >= 4 ? "high" : "mid");

export type StudentStateKey = "attention" | "unstable" | "stable" | "positive" | "no-data";

export const STUDENT_STATES: Record<StudentStateKey, { label: string; priority: number }> = {
  attention: { label: "Требует внимания", priority: 0 },
  unstable: { label: "Нестабильное", priority: 1 },
  stable: { label: "Стабильное", priority: 2 },
  positive: { label: "Хорошее", priority: 3 },
  "no-data": { label: "Нет данных", priority: 4 },
};

const ANALYZED_DAYS = 30;

export const averageMood = (checkins: Checkin[]) =>
  checkins.length === 0 ? null : checkins.reduce((sum, checkin) => sum + checkin.mood, 0) / checkins.length;

/**
 * Общее состояние ученика по последним 30 ответам (новые — первыми):
 * низкая последняя или средняя оценка → «Требует внимания»,
 * три падения подряд или большой разброс → «Нестабильное».
 */
export const getStudentState = (allCheckins: Checkin[]): StudentStateKey => {
  const checkins = allCheckins.slice(0, ANALYZED_DAYS);
  const average = averageMood(checkins);
  if (average === null) return "no-data";

  const latest = checkins[0].mood;
  if (latest <= 2 || average < 2.5) return "attention";

  const [a, b, c] = checkins;
  const isDeclining = Boolean(a && b && c && c.mood > b.mood && b.mood > a.mood);
  const deviation = Math.sqrt(
    checkins.reduce((sum, checkin) => sum + (checkin.mood - average) ** 2, 0) / checkins.length,
  );
  if (isDeclining || (checkins.length >= 3 && deviation >= 1.1)) return "unstable";

  return average >= 4 ? "positive" : "stable";
};

export const getRecentAverage = (checkins: Checkin[]) => averageMood(checkins.slice(0, ANALYZED_DAYS));
