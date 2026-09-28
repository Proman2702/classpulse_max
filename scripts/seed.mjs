/**
 * Тестовые данные для проверки ClassPulse.
 *
 * Создаёт (или обновляет) тестовые аккаунты ученика, учителя и психолога,
 * класс из пяти учеников, историю ответов за неделю, запись на разговор
 * и анонимную жалобу. Все данные вымышленные.
 *
 * Запуск из корня репозитория:
 *   npm run seed
 * Нужны переменные VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.
 * Скрипт можно запускать повторно: тестовые данные пересоздаются.
 */
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "ClassPulse2026";

const ACCOUNTS = {
  teacher: { email: "teacher@classpulse.test", nickname: "Анна Петровна", role: "teacher" },
  psychologist: { email: "psychologist@classpulse.test", nickname: "Ольга Викторовна", role: "psychologist" },
  masha: { email: "student@classpulse.test", nickname: "Маша", role: "student" },
  artem: { email: "artem@classpulse.test", nickname: "Артём", role: "student" },
  liza: { email: "liza@classpulse.test", nickname: "Лиза Орлова", role: "student" },
  dima: { email: "dima@classpulse.test", nickname: "Дима", role: "student" },
  katya: { email: "katya@classpulse.test", nickname: "Катя", role: "student" },
};

// Оценки за последние дни: первый элемент — сегодня, null — нет ответа.
// У Маши нет ответа за сегодня, чтобы проверяющий прошёл опрос сам.
const HISTORY = {
  masha: [null, 4, 3, 4, 5, 4, 3],
  artem: [5, 4, 5, 4, 4, 5, 4],
  liza: [2, 3, 4, 4, 3, 4, 4],
  dima: [4, 2, 5, 1, 4, 3, 5],
  katya: [null, 3, 4, 3, 3, 4, null],
};

const TODAY_DETAILS = {
  artem: { reasons: ["Успех в учёбе", "Друзья"], comment: "Выиграли школьный этап олимпиады по математике!" },
  liza: { reasons: ["Конфликт", "Одиночество"], comment: "На перемене снова смеялись надо мной" },
  dima: { reasons: ["Усталость"], comment: null },
};

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Укажите VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const check = ({ data, error }, action) => {
  if (error) throw new Error(`${action}: ${error.message}`);
  return data;
};

const moscowDate = (daysAgo) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date(Date.now() - daysAgo * 86_400_000));

/** Создаёт пользователя Auth или сбрасывает пароль существующему. Возвращает id профиля. */
const ensureAccount = async ({ email, nickname, role }) => {
  const created = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nickname, role },
  });

  let authId = created.data.user?.id;
  if (!authId) {
    const list = check(await supabase.auth.admin.listUsers({ perPage: 1000 }), "Список пользователей");
    const existing = list.users.find((user) => user.email === email);
    if (!existing) throw new Error(`Не удалось создать ${email}: ${created.error?.message}`);
    authId = existing.id;
    check(await supabase.auth.admin.updateUserById(authId, { password: PASSWORD }), `Пароль ${email}`);
  }

  const profile = check(
    await supabase.from("users").select("id").eq("auth_user_id", authId).single(),
    `Профиль ${email}`,
  );
  check(await supabase.from("users").update({ nickname }).eq("id", profile.id), `Имя ${email}`);
  return profile.id;
};

const main = async () => {
  const ids = {};
  for (const [key, account] of Object.entries(ACCOUNTS)) {
    ids[key] = await ensureAccount(account);
    console.log(`✓ ${account.email}`);
  }

  const studentKeys = Object.keys(HISTORY);
  const studentIds = studentKeys.map((key) => ids[key]);

  // Чистим прежние тестовые данные, чтобы скрипт был повторяемым.
  check(await supabase.from("student_checkins").delete().in("student_id", studentIds), "Очистка ответов");
  check(await supabase.from("appointments").delete().in("student_id", studentIds), "Очистка записей");
  check(await supabase.from("reports").delete().in("author_id", studentIds), "Очистка жалоб");
  check(await supabase.from("student_notes").delete().eq("teacher_id", ids.teacher), "Очистка заметок");
  check(await supabase.from("teacher_students").delete().eq("teacher_id", ids.teacher), "Очистка класса");

  check(
    await supabase.from("teacher_students").insert(
      studentKeys.map((key) => ({ teacher_id: ids.teacher, student_id: ids[key], is_watched: key === "liza" })),
    ),
    "Класс",
  );

  const checkins = studentKeys.flatMap((key) =>
    HISTORY[key].flatMap((mood, daysAgo) => {
      if (mood === null) return [];
      const details = daysAgo === 0 ? TODAY_DETAILS[key] : undefined;
      return [{
        student_id: ids[key],
        mood,
        reasons: details?.reasons ?? [],
        comment: details?.comment ?? null,
        checkin_date: moscowDate(daysAgo),
      }];
    }),
  );
  check(await supabase.from("student_checkins").insert(checkins), "Ответы");

  check(
    await supabase.from("student_notes").insert({
      teacher_id: ids.teacher,
      student_id: ids.liza,
      body: "Второй день сидит одна на обеде, на уроке почти не отвечала.",
    }),
    "Заметка",
  );

  check(
    await supabase.from("appointments").insert([
      {
        student_id: ids.liza,
        specialist_id: ids.psychologist,
        topic: "Хочу поговорить про отношения в классе",
        preferred_time: "после 6-го урока",
      },
      {
        student_id: ids.artem,
        specialist_id: ids.teacher,
        topic: "Подготовка к региональному этапу олимпиады",
        status: "accepted",
      },
      {
        student_id: ids.katya,
        specialist_id: ids.teacher,
        topic: "Не понимаю новую тему по алгебре",
        preferred_time: "на большой перемене",
      },
    ]),
    "Записи",
  );

  check(
    await supabase.from("reports").insert({
      author_id: ids.dima,
      recipient_id: ids.psychologist,
      subject_kind: "student",
      message: "В чате класса несколько человек выкладывают обидные картинки про одну девочку. Она видит, но молчит.",
      severity: "high",
    }),
    "Жалоба",
  );

  console.log(`\nГотово. Пароль для всех тестовых аккаунтов: ${PASSWORD}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
