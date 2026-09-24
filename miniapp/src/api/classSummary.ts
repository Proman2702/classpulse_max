import { getSupabase } from "../lib/supabase";

export interface ClassSummaryResult {
  summary: string | null;
  responseCount: number;
}

export const getClassSummary = async (): Promise<ClassSummaryResult> => {
  const { data, error } = await getSupabase().functions.invoke<ClassSummaryResult>("class-summary", {
    body: {},
  });

  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      const details: unknown = await response.json().catch(() => null);
      if (details && typeof details === "object" && "error" in details && typeof details.error === "string") {
        throw new Error(details.error);
      }
    }

    throw new Error("Не удалось составить сводку. Попробуйте позже");
  }

  if (!data || typeof data.responseCount !== "number" || (data.summary !== null && typeof data.summary !== "string")) {
    throw new Error("Получен некорректный ответ сервера");
  }

  return data;
};
