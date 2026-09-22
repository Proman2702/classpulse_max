export type UserRole = "student" | "teacher";

export type MessageSeverity = "low" | "medium" | "high" | "critical";

export type RequestStatus = "new" | "read" | "resolved";

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
}

export interface StudentCheckin {
  id: string;
  studentId: string;
  mood: number;
  reasons: string[];
  comment: string | null;
  checkinDate: string;
  createdAt: string;
}

export interface StudentRequest {
  id: string;
  studentId: string;
  teacherId: string;
  message: string;
  severity: MessageSeverity;
  status: RequestStatus;
  createdAt: string;
}

export interface TeacherRequest extends StudentRequest {
  studentNickname: string;
}
