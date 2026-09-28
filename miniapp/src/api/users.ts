import { getSupabase, unwrap } from "../lib/supabase";
import type { User, UserRole } from "../types";

export const USER_COLUMNS = "id, nickname, role, max_link, max_linked";

export interface UserRow {
  id: string;
  nickname: string;
  role: UserRole;
  max_link: string | null;
  max_linked: boolean | null;
}

export const toUser = (row: UserRow): User => ({
  id: row.id,
  nickname: row.nickname,
  role: row.role,
  maxLink: row.max_link,
  maxLinked: Boolean(row.max_linked),
});

const users = () => getSupabase().from("users");

export const getUserByAuthId = async (authUserId: string): Promise<User> =>
  toUser(unwrap(await users().select(USER_COLUMNS).eq("auth_user_id", authUserId).single()) as UserRow);

export const getUsersByIds = async (ids: string[]): Promise<Map<string, User>> => {
  if (ids.length === 0) return new Map();
  const rows = unwrap(await users().select(USER_COLUMNS).in("id", [...new Set(ids)])) as UserRow[];
  return new Map(rows.map((row) => [row.id, toUser(row)]));
};

export const findStudentByNickname = async (nickname: string): Promise<User | null> => {
  const row = unwrap(
    await users().select(USER_COLUMNS).eq("role", "student").eq("nickname", nickname.trim()).maybeSingle(),
  ) as UserRow | null;
  return row ? toUser(row) : null;
};

/** Учителя и психологи — к ним ученик может записаться или отправить жалобу. */
export const getSpecialists = async (): Promise<User[]> => {
  const rows = unwrap(
    await users().select(USER_COLUMNS).in("role", ["teacher", "psychologist"]).order("nickname"),
  ) as UserRow[];
  return rows.map(toUser);
};

export const updateProfile = async (userId: string, changes: { nickname: string; maxLink: string | null }) => {
  const row = unwrap(
    await users()
      .update({ nickname: changes.nickname.trim(), max_link: changes.maxLink })
      .eq("id", userId)
      .select(USER_COLUMNS)
      .single(),
  ) as UserRow;
  return toUser(row);
};
