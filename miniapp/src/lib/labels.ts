import type { AppointmentStatus, ReportStatus, ReportSubject, Severity, UserRole } from "../types";

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Ученик",
  teacher: "Учитель",
  psychologist: "Психолог",
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: "accent" | "positive" | "neutral" | "attention" }> = {
  new: { label: "Ждёт ответа", tone: "accent" },
  accepted: { label: "Принята", tone: "positive" },
  declined: { label: "Отклонена", tone: "attention" },
  done: { label: "Состоялась", tone: "neutral" },
};

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: "accent" | "positive" | "neutral" }> = {
  new: { label: "Новая", tone: "accent" },
  read: { label: "Прочитана", tone: "neutral" },
  resolved: { label: "Решена", tone: "positive" },
};

export const SEVERITY: Record<Severity, { label: string; tone: "attention" | "unstable" | "stable" | "neutral" }> = {
  critical: { label: "Срочно", tone: "attention" },
  high: { label: "Важно", tone: "unstable" },
  medium: { label: "Обычная", tone: "stable" },
  low: { label: "Не срочно", tone: "neutral" },
};

export const REPORT_SUBJECT: Record<ReportSubject, string> = {
  teacher: "На учителя",
  student: "На ученика",
  other: "Другое",
};

/** Склонение: plural(3, ["ученик", "ученика", "учеников"]) → «ученика». */
export const plural = (count: number, forms: [string, string, string]) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};
