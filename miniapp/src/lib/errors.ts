const knownMessages: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Неверный email или пароль"],
  [/user already registered/i, "Такой email уже зарегистрирован"],
  [/password should be at least/i, "Пароль должен быть не короче 6 символов"],
  [/email not confirmed/i, "Подтвердите email по ссылке из письма"],
  [/failed to fetch|network/i, "Нет соединения. Проверьте интернет"],
  [/users_nickname_role_key|duplicate key/i, "Такой ник уже занят"],
];

/** Превращает любую ошибку в понятный пользователю текст. */
export const getErrorMessage = (error: unknown, fallback = "Что-то пошло не так") => {
  const message =
    error instanceof Error ? error.message
    : typeof error === "object" && error && "message" in error ? String(error.message)
    : "";

  if (!message) return fallback;
  return knownMessages.find(([pattern]) => pattern.test(message))?.[1] ?? message;
};
