import { getServiceClient } from "../_shared/auth.ts";
import { HttpError, servePost } from "../_shared/http.ts";
import { sendMaxMessage, validateNotification } from "../_shared/max.ts";

/**
 * Уведомления в MAX. Вызывается триггерами базы (pg_net) при изменениях:
 * - student_checkins: оценка 1–2 → учителям ученика;
 * - appointments: новая запись → специалисту, смена статуса → ученику;
 * - reports: новая жалоба → получателю (без автора), жалоба решена → автору.
 * Запрос подписывается общим секретом NOTIFY_SECRET.
 */

interface Payload {
  event_id: string;
  timestamp: number;
  table: "student_checkins" | "appointments" | "reports";
  type: "INSERT" | "UPDATE";
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

const MOODS: Record<number, string> = { 1: "😣 Очень тяжело", 2: "😕 Тяжело" };
const SEVERITY: Record<string, string> = { critical: "срочно", high: "важно", medium: "обычная", low: "не срочно" };
const STATUS: Record<string, string> = { accepted: "принята ✅", declined: "отклонена", done: "отмечена как состоявшаяся" };

const admin = () => getServiceClient();

const getUsers = async (ids: string[]) => {
  const { data, error } = await admin().from("users").select("id, nickname, max_user_id").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((user) => [user.id as string, user as { nickname: string; max_user_id: number | null }]));
};

const send = async (maxUserId: number | null | undefined, text: string) => (maxUserId ? sendMaxMessage(maxUserId, text) : false);

const onCheckin = async (record: Payload["record"]) => {
  const studentId = record.student_id as string;
  const { data: links, error } = await admin().from("teacher_students").select("teacher_id").eq("student_id", studentId);
  if (error) throw error;

  const users = await getUsers([studentId, ...(links ?? []).map((link) => link.teacher_id as string)]);
  const student = users.get(studentId);
  const text = `🔔 ${student?.nickname ?? "Ученик"} отметил(а) день: ${MOODS[record.mood as number] ?? record.mood}.\nЗагляните в карточку ученика.`;

  let sent = 0;
  for (const link of links ?? []) {
    if (await send(users.get(link.teacher_id as string)?.max_user_id, text)) sent += 1;
  }
  return sent;
};

const onAppointment = async (payload: Payload) => {
  const { record, old_record: old } = payload;
  const users = await getUsers([record.student_id as string, record.specialist_id as string]);
  const student = users.get(record.student_id as string);
  const specialist = users.get(record.specialist_id as string);

  if (payload.type === "INSERT") {
    return Number(await send(specialist?.max_user_id, `📅 ${student?.nickname ?? "Ученик"} записался(ась) на разговор. Подробности в «Обращениях» ClassPulse.`));
  }
  if (old && old.status !== record.status && STATUS[record.status as string]) {
    return Number(await send(student?.max_user_id, `Твоя запись к ${specialist?.nickname ?? "специалисту"} ${STATUS[record.status as string]}.`));
  }
  return 0;
};

const onReport = async (payload: Payload) => {
  const { record, old_record: old } = payload;

  if (payload.type === "INSERT") {
    const users = await getUsers([record.recipient_id as string]);
    const severity = SEVERITY[record.severity as string] ?? "обычная";
    // Автор жалобы в уведомление не попадает.
    return Number(await send(
      users.get(record.recipient_id as string)?.max_user_id,
      `🛡 Новая анонимная жалоба (срочность: ${severity}). Откройте «Обращения» в ClassPulse.`,
    ));
  }
  if (old && old.status !== "resolved" && record.status === "resolved") {
    const users = await getUsers([record.author_id as string]);
    return Number(await send(users.get(record.author_id as string)?.max_user_id, "Твою жалобу рассмотрели и отметили решённой. Спасибо, что не промолчал(а) 💙"));
  }
  return 0;
};

servePost(async (request) => {
  const secret = Deno.env.get("NOTIFY_SECRET");
  const envelope = await request.json().catch(() => null);
  if (!secret || typeof envelope?.payload !== "string" || typeof envelope?.signature !== "string"
    || !await validateNotification(envelope.payload, envelope.signature, secret)) {
    throw new HttpError(401, "Неверная подпись");
  }

  const payload = JSON.parse(envelope.payload) as Payload;
  if (!payload || !["INSERT", "UPDATE"].includes(payload.type) || !payload.record || typeof payload.record.id !== "string"
    || !["student_checkins", "appointments", "reports"].includes(payload.table)
    || typeof payload.event_id !== "string" || !Number.isFinite(payload.timestamp)
    || Math.abs(Date.now() / 1000 - payload.timestamp) > 300) {
    throw new HttpError(400, "Неверные данные события");
  }
  const { data: claimed, error: claimError } = await admin().rpc("claim_notification", { event_id: payload.event_id });
  if (claimError) throw claimError;
  if (!claimed) return { sent: 0 };
  const { data: record, error } = await admin().from(payload.table).select("*").eq("id", payload.record.id).maybeSingle();
  if (error) throw error;
  if (!record) return { sent: 0 };
  if (payload.type === "UPDATE" && (payload.table === "student_checkins"
    ? record.mood !== payload.record.mood : record.status !== payload.record.status)) return { sent: 0 };
  payload.record = record;
  switch (payload.table) {
    case "student_checkins":
      if (typeof payload.record.mood !== "number" || payload.record.mood > 2 || payload.record.mood < 1) return { sent: 0 };
      if (payload.type === "UPDATE" && payload.old_record?.mood === payload.record.mood) return { sent: 0 };
      return { sent: await onCheckin(payload.record) };
    case "appointments":
      return { sent: await onAppointment(payload) };
    case "reports":
      return { sent: await onReport(payload) };
    default:
      throw new HttpError(400, "Неизвестная таблица");
  }
});
