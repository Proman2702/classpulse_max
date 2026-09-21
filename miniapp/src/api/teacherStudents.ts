import { getSupabase } from "../lib/supabase";
import type { User } from "../types";
import { getStudentByNickname } from "./users";

interface StudentRow {
  id: string;
  nickname: string;
  role: "student";
}

export const addStudentToTeacher = async (
  teacherId: string,
  nickname: string,
): Promise<User> => {
  const student = await getStudentByNickname(nickname);

  if (!student) {
    throw new Error("Ученик с таким ником не найден");
  }

  const { error } = await getSupabase().from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: student.id,
  });

  if (error?.code === "23505") {
    throw new Error("Этот ученик уже добавлен");
  }

  if (error) {
    throw error;
  }

  return student;
};

export const getTeacherStudents = async (
  teacherId: string,
): Promise<User[]> => {
  const supabase = getSupabase();
  const { data: links, error: linksError } = await supabase
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId);

  if (linksError) {
    throw linksError;
  }

  const studentIds = (links ?? []).map((link) => link.student_id as string);

  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, nickname, role")
    .in("id", studentIds)
    .order("nickname");

  if (error) {
    throw error;
  }

  return ((data ?? []) as StudentRow[]).map((student) => ({
    id: student.id,
    nickname: student.nickname,
    role: student.role,
  }));
};
