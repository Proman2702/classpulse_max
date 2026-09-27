import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!url || !key) {
    throw new Error("Supabase не настроен: добавьте URL и публичный ключ в miniapp/.env");
  }
  client ??= createClient(url, key);
  return client;
};

/** Бросает ошибку Supabase, если она есть, и возвращает данные запроса. */
export const unwrap = <T>({ data, error }: { data: T; error: unknown }): T => {
  if (error) throw error;
  return data;
};
