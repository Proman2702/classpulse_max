import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { HttpError } from "./http.ts";

export type Role = "student" | "teacher" | "psychologist";

export interface RequestContext {
  supabase: SupabaseClient;
  profile: { id: string; role: Role };
}

/**
 * Создаёт клиент Supabase от имени пользователя из заголовка Authorization,
 * поэтому все запросы к базе проходят через обычные политики RLS.
 */
export const getRequestContext = async (request: Request): Promise<RequestContext> => {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Нужно войти в аккаунт");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new HttpError(503, "Сервер не настроен");
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) {
    throw new HttpError(401, "Нужно войти в аккаунт");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new HttpError(403, "Профиль не найден");

  return { supabase, profile: profile as RequestContext["profile"] };
};

/** Клиент с сервисным ключом: обходит RLS, поэтому используется только на сервере и точечно. */
export const getServiceClient = (): SupabaseClient => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new HttpError(503, "Сервер не настроен");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
};
