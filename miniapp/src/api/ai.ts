import { getSupabase } from "../lib/supabase";
import type { Severity } from "../types";

/**
 * Вызывает Edge Function. Ключ GigaChat хранится только на сервере,
 * в браузер попадает лишь результат.
 */
const invoke = async <T>(name: string, body: object, timeout = 65_000): Promise<T> => {
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

export interface ClassSummary {
  summary: string | null;
  responseCount: number;
}

/** Сводка сегодняшних ответов класса от GigaChat. Имена в модель не передаются. */
export const getClassSummary = () => invoke<ClassSummary>("class-summary", {});

/** Срочность жалобы по оценке GigaChat. При ошибке жалоба всё равно уйдёт как medium. */
export const classifyReport = async (message: string): Promise<Severity> => {
  try {
    const { severity } = await invoke<{ severity: Severity }>("classify-report", { message }, 15_000);
    return ["low", "medium", "high", "critical"].includes(severity) ? severity : "medium";
  } catch (error) {
    console.warn("Report classification unavailable:", error);
    return "medium";
  }
};
