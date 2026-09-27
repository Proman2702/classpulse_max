import { getSupabase, unwrap } from "../lib/supabase";
import type { Appointment, AppointmentStatus, Report, ReportStatus, ReportSubject, Severity } from "../types";
import { classifyReport } from "./ai";
import { getUsersByIds } from "./users";

// ---------------------------------------------------------------------------
// Запись к психологу или учителю
// ---------------------------------------------------------------------------

const APPOINTMENT_COLUMNS = "id, student_id, specialist_id, topic, preferred_time, status, created_at";

interface AppointmentRow {
  id: string;
  student_id: string;
  specialist_id: string;
  topic: string;
  preferred_time: string | null;
  status: AppointmentStatus;
  created_at: string;
}

const appointments = () => getSupabase().from("appointments");

const withPeople = async (rows: AppointmentRow[]): Promise<Appointment[]> => {
  const people = await getUsersByIds(rows.flatMap((row) => [row.student_id, row.specialist_id]));
  return rows.flatMap((row) => {
    const student = people.get(row.student_id);
    const specialist = people.get(row.specialist_id);
    if (!student || !specialist) return [];
    return [{
      id: row.id,
      student,
      specialist,
      topic: row.topic,
      preferredTime: row.preferred_time,
      status: row.status,
      createdAt: row.created_at,
    }];
  });
};

/** Записи, где пользователь — ученик или специалист (RLS отдаёт только их). */
export const getAppointments = async (): Promise<Appointment[]> =>
  withPeople(unwrap(
    await appointments().select(APPOINTMENT_COLUMNS).order("created_at", { ascending: false }),
  ) as AppointmentRow[]);

export interface NewAppointment {
  studentId: string;
  specialistId: string;
  topic: string;
  preferredTime: string;
}

export const createAppointment = async (input: NewAppointment) => {
  unwrap(await appointments().insert({
    student_id: input.studentId,
    specialist_id: input.specialistId,
    topic: input.topic.trim(),
    preferred_time: input.preferredTime.trim() || null,
  }));
};

export const setAppointmentStatus = async (id: string, status: AppointmentStatus) => {
  unwrap(await appointments().update({ status }).eq("id", id));
};

// ---------------------------------------------------------------------------
// Анонимные жалобы
// ---------------------------------------------------------------------------

// author_id не читается: колонка закрыта привилегиями в базе.
const REPORT_COLUMNS = "id, recipient_id, subject_kind, subject_name, message, severity, status, created_at";

interface ReportRow {
  id: string;
  recipient_id: string;
  subject_kind: ReportSubject;
  subject_name: string | null;
  message: string;
  severity: Severity;
  status: ReportStatus;
  created_at: string;
}

const reports = () => getSupabase().from("reports");

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Жалобы пользователя: отправленные учеником или адресованные специалисту. */
export const getReports = async (): Promise<Report[]> => {
  const rows = unwrap(
    await reports().select(REPORT_COLUMNS).order("created_at", { ascending: false }),
  ) as ReportRow[];
  const recipients = await getUsersByIds(rows.map((row) => row.recipient_id));

  return rows
    .flatMap((row) => {
      const recipient = recipients.get(row.recipient_id);
      if (!recipient) return [];
      return [{
        id: row.id,
        recipient,
        subjectKind: row.subject_kind,
        subjectName: row.subject_name,
        message: row.message,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
      }];
    })
    .sort((a, b) =>
      Number(a.status === "resolved") - Number(b.status === "resolved")
      || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      || b.createdAt.localeCompare(a.createdAt));
};

export interface NewReport {
  recipientId: string;
  subjectKind: ReportSubject;
  subjectName: string;
  message: string;
}

export const createReport = async (input: NewReport) => {
  const severity = await classifyReport(input.message);
  unwrap(await reports().insert({
    recipient_id: input.recipientId,
    subject_kind: input.subjectKind,
    subject_name: input.subjectName.trim() || null,
    message: input.message.trim(),
    severity,
  }));
};

export const setReportStatus = async (id: string, status: ReportStatus) => {
  unwrap(await reports().update({ status }).eq("id", id));
};
