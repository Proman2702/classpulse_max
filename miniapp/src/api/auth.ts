import { getSupabase } from "../lib/supabase";
import type { User, UserRole } from "../types";
import { getUserByAuthId } from "./users";

export interface SignUpData {
  email: string;
  password: string;
  nickname: string;
  role: UserRole;
}

export const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return getUserByAuthId(data.user.id);
};

/** Возвращает профиль или null, если Supabase требует подтвердить email. */
export const signUp = async ({ email, password, nickname, role }: SignUpData): Promise<User | null> => {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: nickname.trim(), role } },
  });
  if (error) throw error;
  if (!data.session || !data.user) return null;
  return getUserByAuthId(data.user.id);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session ? getUserByAuthId(data.session.user.id) : null;
};

export const onSignedOut = (callback: () => void) => {
  const { data } = getSupabase().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") callback();
  });
  return () => data.subscription.unsubscribe();
};

export const signOut = async () => {
  const { error } = await getSupabase().auth.signOut({ scope: "local" });
  if (error) throw error;
};
