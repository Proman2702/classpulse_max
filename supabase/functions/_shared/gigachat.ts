import { russianTrustedCa } from "./ca.ts";
import { HttpError } from "./http.ts";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const COMPLETIONS_URL = "https://api.giga.chat/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

// Токен живёт ~30 минут; кешируем его между вызовами в рамках одного инстанса.
let cachedToken: { value: string; expiresAt: number } | null = null;

const httpClient = Deno.createHttpClient({ caCerts: russianTrustedCa });

const getAuthKey = () => {
  const key = Deno.env.get("GIGACHAT_AUTH_KEY");
  if (!key) throw new HttpError(503, "GigaChat не настроен");
  return key;
};

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const response = await fetch(OAUTH_URL, {
    method: "POST",
    client: httpClient,
    headers: {
      Authorization: `Basic ${getAuthKey()}`,
      RqUID: crypto.randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `scope=${Deno.env.get("GIGACHAT_SCOPE") ?? "GIGACHAT_API_PERS"}`,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error("GigaChat OAuth status:", response.status);
    throw new HttpError(502, "Не удалось подключиться к GigaChat");
  }

  const data = await response.json();
  if (typeof data.access_token !== "string") {
    throw new HttpError(502, "GigaChat не выдал токен");
  }

  cachedToken = { value: data.access_token, expiresAt: Number(data.expires_at) || Date.now() + 25 * 60_000 };
  return cachedToken.value;
};

/** Отправляет диалог в GigaChat и возвращает текст ответа модели. */
export const chat = async (messages: ChatMessage[], options: ChatOptions = {}): Promise<string> => {
  const response = await fetch(COMPLETIONS_URL, {
    method: "POST",
    client: httpClient,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("GIGACHAT_MODEL") || "GigaChat-2-Max",
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 800,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    console.error("GigaChat completion status:", response.status);
    throw new HttpError(502, "GigaChat не смог ответить");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new HttpError(502, "GigaChat вернул пустой ответ");
  }

  return content.trim();
};
