export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { ...corsHeaders, "Cache-Control": "no-store" },
  });

/**
 * Общая обёртка для POST-функций: CORS, проверка метода и единый формат ошибок.
 * Обработчик возвращает тело ответа или бросает HttpError.
 */
export const servePost = (handler: (request: Request) => Promise<unknown>) =>
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ error: "Метод не поддерживается" }, 405);
    }

    try {
      return json(await handler(request));
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status);
      }
      console.error("Unhandled function error:", error);
      return json({ error: "Что-то пошло не так. Попробуйте позже" }, 500);
    }
  });
