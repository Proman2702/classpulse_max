const TIME_ZONE = "Europe/Moscow";

/** Сегодняшняя дата по Москве в формате YYYY-MM-DD — так же её считает база. */
export const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(new Date());

const dayFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** «12 сент.» для даты YYYY-MM-DD. */
export const formatDay = (date: string) => dayFormatter.format(new Date(`${date}T12:00:00+03:00`));

/** Время для сообщений: «14:05», «вчера», «12 сент.». */
export const formatMessageTime = (iso: string) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(date);
  if (day === today()) return timeFormatter.format(date);

  const yesterday = new Date(Date.now() - 86_400_000);
  if (day === new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(yesterday)) return "вчера";

  return dayFormatter.format(date);
};

export const nowTime = () => timeFormatter.format(new Date());
