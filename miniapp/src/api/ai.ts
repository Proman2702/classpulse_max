import type { MessageSeverity } from "../types";

export const classifyMessageSeverity = async (
  _message: string,
): Promise<MessageSeverity> => {
  // TODO: Replace this mock with a Supabase Edge Function. A real AI API key
  // must stay server-side and must never be included in frontend code.
  return "medium";
};
