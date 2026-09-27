export type UserRole = "student" | "teacher" | "psychologist";

export type Severity = "low" | "medium" | "high" | "critical";
export type AppointmentStatus = "new" | "accepted" | "declined" | "done";
export type ReportStatus = "new" | "read" | "resolved";
export type ReportSubject = "teacher" | "student" | "other";

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
  maxLink: string | null;
}

export interface Checkin {
  id: string;
  studentId: string;
  mood: number;
  reasons: string[];
  comment: string | null;
  date: string;
  createdAt: string;
}

/** Ученик в классе учителя вместе с его ответами (новые — первыми). */
export interface ClassStudent {
  student: User;
  isWatched: boolean;
  checkins: Checkin[];
}

export interface StudentNote {
  id: string;
  studentId: string;
  body: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  student: User;
  specialist: User;
  topic: string;
  preferredTime: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

/** Анонимная жалоба. Автор никогда не приходит с сервера. */
export interface Report {
  id: string;
  recipient: User;
  subjectKind: ReportSubject;
  subjectName: string | null;
  message: string;
  severity: Severity;
  status: ReportStatus;
  createdAt: string;
}
