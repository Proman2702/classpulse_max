import type { Severity } from "../types";
import { invoke } from "./functions";

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
