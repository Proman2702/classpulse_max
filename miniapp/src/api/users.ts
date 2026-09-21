import { getSupabase } from "../lib/supabase";
import type { User, UserRole } from "../types";

interface UserRow {
  id: string;
  nickname: string;
  role: UserRole;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  nickname: row.nickname,
  role: row.role,
});

export const getUserByAuthId = async (authUserId: string): Promise<User> => {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, nickname, role")
    .eq("auth_user_id", authUserId)
    .single();

  if (error) {
    throw error;
  }

  return toUser(data as UserRow);
};

export const getTeachers = async (): Promise<User[]> => {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, nickname, role")
    .eq("role", "teacher")
    .order("nickname");

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserRow[]).map(toUser);
};

export const getStudentByNickname = async (
  nickname: string,
): Promise<User | null> => {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, nickname, role")
    .eq("role", "student")
    .eq("nickname", nickname.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toUser(data as UserRow) : null;
};
