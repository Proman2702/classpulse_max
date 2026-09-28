/**
 * Работа с MAX на сервере: проверка подписи initData мини-приложения
 * и отправка сообщений от имени бота.
 * Документация: https://dev.max.ru/docs/webapps/validation, https://dev.max.ru/docs-api
 */

import { russianTrustedCa } from "./ca.ts";

const encoder = new TextEncoder();

const hmac = async (key: Uint8Array, data: string) => {
  const cryptoKey = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
};

const toHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** Сравнение без утечки по времени. */
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export interface MaxUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/**
 * Проверяет initData по алгоритму MAX: secret = HMAC_SHA256("WebAppData", token),
 * hash = HMAC_SHA256(secret, отсортированные пары key=value через \n без hash).
 * Возвращает пользователя MAX или null, если подпись неверна или данные устарели.
 */
export const validateInitData = async (
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60,
  now = Date.now(),
): Promise<MaxUser | null> => {
  const params = new URLSearchParams(initData);
  if (!initData || initData.length > 16000 || !botToken) return null;
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return null;
  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = await hmac(encoder.encode("WebAppData"), botToken);
  const expected = toHex(await hmac(secret, dataCheckString));
  if (!safeEqual(expected, hash.toLowerCase())) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authDate) || authDate <= 0 || authDate > now / 1000 + 60 || now / 1000 - authDate > maxAgeSeconds) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null");
    return user && Number.isSafeInteger(user.id) && user.id > 0 ? user as MaxUser : null;
  } catch {
    return null;
  }
};

const API_URL = "https://platform-api2.max.ru";
export const validateNotification = async (payload: string, signature: string, secret: string) => {
  if (!secret || payload.length > 16000 || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = toHex(await hmac(encoder.encode(secret), payload));
  return safeEqual(expected, signature.toLowerCase());
};
let httpClient: Deno.HttpClient | undefined;

/**
 * Отправляет пользователю сообщение от бота с кнопкой «Открыть ClassPulse».
 * Ошибки не пробрасываются: уведомление не должно ломать основное действие.
 */
export const sendMaxMessage = async (userId: number, text: string): Promise<boolean> => {
  const token = Deno.env.get("MAX_BOT_TOKEN");
  const botUsername = Deno.env.get("MAX_BOT_USERNAME");
  if (!token) {
    console.warn("MAX_BOT_TOKEN не задан — уведомление пропущено");
    return false;
  }

  const attachments = botUsername
    ? [{
      type: "inline_keyboard",
      payload: { buttons: [[{ type: "open_app", text: "Открыть ClassPulse", web_app: `https://max.ru/${botUsername.replace(/^@/, "")}` }]] },
    }]
    : undefined;

  try {
    httpClient ??= Deno.createHttpClient({ caCerts: russianTrustedCa });
    const response = await fetch(`${Deno.env.get("MAX_API_URL") || API_URL}/messages?user_id=${userId}`, {
      client: httpClient,
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ text, attachments }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("MAX send status:", response.status);
    return response.ok;
  } catch (error) {
    console.error("MAX send failed:", error);
    return false;
  }
};
