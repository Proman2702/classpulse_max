import { getSupabase } from "../lib/supabase";
import type { StudentCheckin } from "../types";

interface CheckinRow {
  id: string;
  student_id: string;
  mood: number;
  reasons: string[];
  comment: string | null;
  checkin_date: string | null;
  created_at: string;
}

const checkinColumns = "id, student_id, mood, reasons, comment, checkin_date, created_at";

export const getTodayDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

const toCheckin = (row: CheckinRow): StudentCheckin => ({
  id: row.id,
  studentId: row.student_id,
  mood: row.mood,
  reasons: row.reasons,
  comment: row.comment,
  checkinDate: row.checkin_date ?? row.created_at.slice(0, 10),
  createdAt: row.created_at,
});

export const saveCheckin = async (
  studentId: string,
  mood: number,
  reasons: string[],
  comment: string,
): Promise<StudentCheckin> => {
  const supabase = getSupabase();
  const existingCheckin = await getTodayCheckin(studentId);
  const checkinValues = {
    mood,
    reasons,
    comment: comment.trim() || null,
  };
  const query = existingCheckin
    ? supabase
      .from("student_checkins")
      .update(checkinValues)
      .eq("id", existingCheckin.id)
    : supabase
      .from("student_checkins")
      .insert({
        student_id: studentId,
        checkin_date: getTodayDate(),
        ...checkinValues,
      });
  const { data, error } = await query.select(checkinColumns).single();

  if (error) {
    throw error;
  }

  return toCheckin(data as CheckinRow);
};

export const getTodayCheckin = async (
  studentId: string,
): Promise<StudentCheckin | null> => {
  const { data, error } = await getSupabase()
    .from("student_checkins")
    .select(checkinColumns)
    .eq("student_id", studentId)
    .eq("checkin_date", getTodayDate())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toCheckin(data as CheckinRow) : null;
};

export const getStudentCheckins = async (
  studentId: string,
): Promise<StudentCheckin[]> => {
  const { data, error } = await getSupabase()
    .from("student_checkins")
    .select(checkinColumns)
    .eq("student_id", studentId)
    .not("checkin_date", "is", null)
    .order("checkin_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CheckinRow[]).map(toCheckin);
};

export const getCheckinsForStudents = async (
  studentIds: string[],
): Promise<StudentCheckin[]> => {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from("student_checkins")
    .select(checkinColumns)
    .in("student_id", studentIds)
    .not("checkin_date", "is", null)
    .order("checkin_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CheckinRow[]).map(toCheckin);
};
