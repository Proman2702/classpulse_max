import { today } from "../lib/date";
import { getSupabase, unwrap } from "../lib/supabase";
import type { Checkin } from "../types";

const COLUMNS = "id, student_id, mood, reasons, comment, checkin_date, created_at";

interface CheckinRow {
  id: string;
  student_id: string;
  mood: number;
  reasons: string[] | null;
  comment: string | null;
  checkin_date: string;
  created_at: string;
}

const toCheckin = (row: CheckinRow): Checkin => ({
  id: row.id,
  studentId: row.student_id,
  mood: row.mood,
  reasons: row.reasons ?? [],
  comment: row.comment,
  date: row.checkin_date,
  createdAt: row.created_at,
});

const checkins = () => getSupabase().from("student_checkins");

export const getTodayCheckin = async (studentId: string): Promise<Checkin | null> => {
  const row = unwrap(
    await checkins().select(COLUMNS).eq("student_id", studentId).eq("checkin_date", today()).maybeSingle(),
  ) as CheckinRow | null;
  return row ? toCheckin(row) : null;
};

export interface CheckinAnswer {
  mood: number;
  reasons: string[];
  comment: string;
}

/** Сохраняет ответ за сегодня: создаёт новый или обновляет уже отправленный. */
export const saveTodayCheckin = async (studentId: string, answer: CheckinAnswer): Promise<Checkin> => {
  const values = { mood: answer.mood, reasons: answer.reasons, comment: answer.comment.trim() || null };
  const existing = await getTodayCheckin(studentId);

  const query = existing
    ? checkins().update(values).eq("id", existing.id)
    : checkins().insert({ ...values, student_id: studentId, checkin_date: today() });

  return toCheckin(unwrap(await query.select(COLUMNS).single()) as CheckinRow);
};

/** Все ответы указанных учеников, новые — первыми. */
export const getCheckinsForStudents = async (studentIds: string[]): Promise<Checkin[]> => {
  if (studentIds.length === 0) return [];
  const rows = unwrap(
    await checkins()
      .select(COLUMNS)
      .in("student_id", studentIds)
      .not("checkin_date", "is", null)
      .order("checkin_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ) as CheckinRow[];
  return rows.map(toCheckin);
};
