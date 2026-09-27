import { getSupabase, unwrap } from "../lib/supabase";
import type { ClassStudent, StudentNote, User } from "../types";
import { getCheckinsForStudents } from "./checkins";
import { findStudentByNickname, getUsersByIds } from "./users";

const links = () => getSupabase().from("teacher_students");
const notes = () => getSupabase().from("student_notes");

interface LinkRow {
  teacher_id: string;
  student_id: string;
  is_watched: boolean;
}

/** Класс учителя: ученики, отметка «на контроле» и все их ответы. */
export const getClass = async (teacherId: string): Promise<ClassStudent[]> => {
  const rows = unwrap(
    await links().select("teacher_id, student_id, is_watched").eq("teacher_id", teacherId),
  ) as LinkRow[];
  const ids = rows.map((row) => row.student_id);
  const [students, checkins] = await Promise.all([getUsersByIds(ids), getCheckinsForStudents(ids)]);

  return rows.flatMap((row) => {
    const student = students.get(row.student_id);
    if (!student) return [];
    return [{
      student,
      isWatched: row.is_watched,
      checkins: checkins.filter((checkin) => checkin.studentId === row.student_id),
    }];
  });
};

/** Учителя ученика — для кнопки «Написать в MAX». */
export const getMyTeachers = async (studentId: string): Promise<User[]> => {
  const rows = unwrap(await links().select("teacher_id, student_id, is_watched").eq("student_id", studentId)) as LinkRow[];
  const teachers = await getUsersByIds(rows.map((row) => row.teacher_id));
  return [...teachers.values()].sort((a, b) => a.nickname.localeCompare(b.nickname, "ru"));
};

export const addStudent = async (teacherId: string, nickname: string): Promise<User> => {
  const student = await findStudentByNickname(nickname);
  if (!student) throw new Error("Ученик с таким ником не найден");

  const { error } = await links().insert({ teacher_id: teacherId, student_id: student.id });
  if (error?.code === "23505") throw new Error("Этот ученик уже в классе");
  if (error) throw error;
  return student;
};

export const removeStudent = async (teacherId: string, studentId: string) => {
  unwrap(await links().delete().eq("teacher_id", teacherId).eq("student_id", studentId));
};

export const setWatched = async (teacherId: string, studentId: string, isWatched: boolean) => {
  unwrap(await links().update({ is_watched: isWatched }).eq("teacher_id", teacherId).eq("student_id", studentId));
};

interface NoteRow {
  id: string;
  student_id: string;
  body: string;
  created_at: string;
}

const toNote = (row: NoteRow): StudentNote => ({
  id: row.id,
  studentId: row.student_id,
  body: row.body,
  createdAt: row.created_at,
});

const NOTE_COLUMNS = "id, student_id, body, created_at";

export const getNotes = async (teacherId: string, studentId: string): Promise<StudentNote[]> => {
  const rows = unwrap(
    await notes()
      .select(NOTE_COLUMNS)
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ) as NoteRow[];
  return rows.map(toNote);
};

export const addNote = async (teacherId: string, studentId: string, body: string): Promise<StudentNote> =>
  toNote(unwrap(
    await notes().insert({ teacher_id: teacherId, student_id: studentId, body: body.trim() }).select(NOTE_COLUMNS).single(),
  ) as NoteRow);

export const deleteNote = async (noteId: string) => {
  unwrap(await notes().delete().eq("id", noteId));
};
