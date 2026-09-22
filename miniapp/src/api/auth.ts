import { getSupabase } from "../lib/supabase";
import type { User, UserRole } from "../types";
import { getUserByAuthId } from "./users";

export interface SignUpResult {
  user: User | null;
  requiresEmailConfirmation: boolean;
}

export const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return getUserByAuthId(data.user.id);
};

export const signUp = async (
  email: string,
  password: string,
  nickname: string,
  role: UserRole,
): Promise<SignUpResult> => {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        nickname: nickname.trim(),
        role,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    return {
      user: null,
      requiresEmailConfirmation: true,
    };
  }

  if (!data.user) {
    throw new Error("Supabase не вернул данные нового пользователя");
  }

  return {
    user: await getUserByAuthId(data.user.id),
    requiresEmailConfirmation: false,
  };
};

export const getAuthenticatedUser = async (): Promise<User | null> => {
  const { data, error } = await getSupabase().auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return getUserByAuthId(data.user.id);
};

export const signOut = async () => {
  const { error } = await getSupabase().auth.signOut({ scope: "local" });

  if (error) {
    throw error;
  }
};
