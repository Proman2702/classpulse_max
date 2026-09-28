import { getRequestContext, getServiceClient } from "../_shared/auth.ts";
import { HttpError, servePost } from "../_shared/http.ts";
import { validateInitData } from "../_shared/max.ts";

/**
 * Привязывает аккаунт MAX к профилю ClassPulse, чтобы бот мог присылать уведомления.
 * Мини-приложение передаёт window.WebApp.initData; подпись проверяется токеном бота,
 * поэтому подменить чужой MAX id нельзя.
 */
servePost(async (request) => {
  const { profile } = await getRequestContext(request);

  const body = await request.json().catch(() => null);
  const initData = typeof body?.initData === "string" ? body.initData : "";
  if (!initData || initData.length > 16000) throw new HttpError(400, "Откройте ClassPulse из бота в MAX");

  const botToken = Deno.env.get("MAX_BOT_TOKEN");
  if (!botToken) throw new HttpError(503, "Уведомления MAX не настроены");

  const maxUser = await validateInitData(initData, botToken);
  if (!maxUser) throw new HttpError(403, "Не удалось подтвердить аккаунт MAX");

  const admin = getServiceClient();
  // Transfer and link in one transaction so concurrent requests cannot lose the link.
  const { error } = await admin.rpc("link_max_account", { profile_id: profile.id, verified_max_id: maxUser.id });
  if (error) throw error;

  return { linked: true };
});
