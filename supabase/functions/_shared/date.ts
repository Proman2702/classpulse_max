/** Текущая дата по Москве в формате YYYY-MM-DD — так же её считает база. */
export const moscowToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());
