import { getSupabase } from "../lib/supabase";

/**
 * Вызывает Edge Function Supabase. Секреты (ключи GigaChat и бота) хранятся только на сервере,
 * в браузер попадает лишь результат.
 */
export const invoke = async <T>(name: string, body: object, timeout = 65_000): Promise<T> => {
  const { data, error } = await getSupabase().functions.invoke<T>(name, { body, timeout });

  if (error) {
    const response: unknown = error.context;
    const details: unknown = response instanceof Response ? await response.json().catch(() => null) : null;
    const message = details && typeof details === "object" && "error" in details ? String(details.error) : null;
    throw new Error(message ?? "Сервер не ответил. Попробуйте позже");
  }
  if (!data) throw new Error("Пустой ответ сервера");
  return data;
};
