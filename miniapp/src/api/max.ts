import { invoke } from "./functions";

/**
 * Привязывает аккаунт MAX к профилю, чтобы бот присылал уведомления.
 * Подпись initData проверяется на сервере (Edge Function link-max).
 */
export const linkMaxAccount = (initData: string) => invoke<{ linked: boolean }>("link-max", { initData });
