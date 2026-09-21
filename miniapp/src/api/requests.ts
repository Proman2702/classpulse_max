import { getSupabase } from "../lib/supabase";
import type {
  MessageSeverity,
  RequestStatus,
  StudentRequest,
  TeacherRequest,
} from "../types";
import { classifyMessageSeverity } from "./ai";

interface RequestRow {
  id: string;
  student_id: string;
  teacher_id: string;
  message: string;
  severity: MessageSeverity;
  status: RequestStatus;
  created_at: string;
}

const toRequest = (row: RequestRow): StudentRequest => ({
  id: row.id,
  studentId: row.student_id,
  teacherId: row.teacher_id,
  message: row.message,
  severity: row.severity,
  status: row.status,
  createdAt: row.created_at,
});

export const createStudentRequest = async (
  studentId: string,
  teacherId: string,
  message: string,
): Promise<StudentRequest> => {
  const severity = await classifyMessageSeverity(message);
  const { data, error } = await getSupabase()
    .from("student_requests")
    .insert({
      student_id: studentId,
      teacher_id: teacherId,
      message: message.trim(),
      severity,
      status: "new",
    })
    .select("id, student_id, teacher_id, message, severity, status, created_at")
    .single();

  if (error) {
    throw error;
  }

  return toRequest(data as RequestRow);
};

const severityOrder: Record<MessageSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const getTeacherRequests = async (
  teacherId: string,
): Promise<TeacherRequest[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("student_requests")
    .select("id, student_id, teacher_id, message, severity, status, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const requests = ((data ?? []) as RequestRow[]).map(toRequest);
  const studentIds = [...new Set(requests.map((request) => request.studentId))];
  const nicknameById = new Map<string, string>();

  if (studentIds.length > 0) {
    const { data: students, error: studentsError } = await supabase
      .from("users")
      .select("id, nickname")
      .in("id", studentIds);

    if (studentsError) {
      throw studentsError;
    }

    for (const student of students ?? []) {
      nicknameById.set(student.id as string, student.nickname as string);
    }
  }

  return requests
    .map((request) => ({
      ...request,
      studentNickname: nicknameById.get(request.studentId) ?? "Ученик",
    }))
    .sort((first, second) =>
      severityOrder[first.severity] - severityOrder[second.severity]
      || second.createdAt.localeCompare(first.createdAt),
    );
};
