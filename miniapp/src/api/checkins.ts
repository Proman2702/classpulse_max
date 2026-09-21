import { getSupabase } from "../lib/supabase";
import type { StudentCheckin } from "../types";

interface CheckinRow {
  id: string;
  student_id: string;
  mood: number;
  reasons: string[];
  comment: string | null;
  created_at: string;
}

const toCheckin = (row: CheckinRow): StudentCheckin => ({
  id: row.id,
  studentId: row.student_id,
  mood: row.mood,
  reasons: row.reasons,
  comment: row.comment,
  createdAt: row.created_at,
});

export const createCheckin = async (
  studentId: string,
  mood: number,
  reasons: string[],
  comment: string,
): Promise<StudentCheckin> => {
  const { data, error } = await getSupabase()
    .from("student_checkins")
    .insert({
      student_id: studentId,
      mood,
      reasons,
      comment: comment.trim() || null,
    })
    .select("id, student_id, mood, reasons, comment, created_at")
    .single();

  if (error) {
    throw error;
  }

  return toCheckin(data as CheckinRow);
};

export const getStudentCheckins = async (
  studentId: string,
): Promise<StudentCheckin[]> => {
  const { data, error } = await getSupabase()
    .from("student_checkins")
    .select("id, student_id, mood, reasons, comment, created_at")
    .eq("student_id", studentId)
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
    .select("id, student_id, mood, reasons, comment, created_at")
    .in("student_id", studentIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CheckinRow[]).map(toCheckin);
};
