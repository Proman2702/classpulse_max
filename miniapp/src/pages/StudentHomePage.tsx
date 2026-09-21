import { useEffect, useState, type FormEvent } from "react";
import { createCheckin } from "../api/checkins";
import { createStudentRequest } from "../api/requests";
import { getTeachers } from "../api/users";
import { AppHeader } from "../components/AppHeader";
import { getErrorMessage } from "../lib/errors";
import type { User } from "../types";

interface StudentHomePageProps {
  user: User;
  onLogout: () => void;
}

const moods = [
  { value: 1, emoji: "😣", label: "Очень тяжело" },
  { value: 2, emoji: "😕", label: "Тяжело" },
  { value: 3, emoji: "😐", label: "Нормально" },
  { value: 4, emoji: "🙂", label: "Хорошо" },
  { value: 5, emoji: "😄", label: "Отлично" },
];

const availableReasons = [
  "Тревога",
  "Усталость",
  "Конфликт",
  "Одиночество",
  "Перегруз",
  "Проблемы дома",
  "Страх перед учёбой",
  "Другое",
];

export const StudentHomePage = ({ user, onLogout }: StudentHomePageProps) => {
  const [mood, setMood] = useState<number | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [teachers, setTeachers] = useState<User[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [checkinNotice, setCheckinNotice] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [teacherError, setTeacherError] = useState("");

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const loadedTeachers = await getTeachers();
        setTeachers(loadedTeachers);
        setTeacherId(loadedTeachers[0]?.id ?? "");
      } catch (error: unknown) {
        console.error("Failed to load teachers:", error);
        setTeacherError(getErrorMessage(error, "Не удалось загрузить список учителей"));
      }
    };

    void loadTeachers();
  }, []);

  const toggleReason = (reason: string) => {
    setReasons((currentReasons) =>
      currentReasons.includes(reason)
        ? currentReasons.filter((item) => item !== reason)
        : [...currentReasons, reason],
    );
  };

  const handleCheckin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckinNotice("");

    if (mood === null) {
      setCheckinNotice("Сначала выберите своё состояние");
      return;
    }

    setIsSendingCheckin(true);
    try {
      await createCheckin(user.id, mood, reasons, comment);
      setMood(null);
      setReasons([]);
      setComment("");
      setCheckinNotice("Спасибо! Состояние сохранено.");
    } catch (error: unknown) {
      console.error("Failed to create check-in:", error);
      setCheckinNotice(getErrorMessage(error, "Не удалось отправить состояние"));
    } finally {
      setIsSendingCheckin(false);
    }
  };

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestNotice("");

    if (!teacherId) {
      setRequestNotice("Выберите учителя");
      return;
    }

    if (!requestMessage.trim()) {
      setRequestNotice("Напишите, что случилось");
      return;
    }

    setIsSendingRequest(true);
    try {
      await createStudentRequest(user.id, teacherId, requestMessage);
      setRequestMessage("");
      setRequestNotice("Сообщение отправлено учителю.");
    } catch (error: unknown) {
      console.error("Failed to send student request:", error);
      setRequestNotice(getErrorMessage(error, "Не удалось отправить сообщение"));
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader user={user} onLogout={onLogout} />
      <main className="page-content">
        <section className="welcome-block">
          <p className="eyebrow">Привет, {user.nickname}</p>
          <h1>Как ты сегодня?</h1>
          <p>Здесь можно честно отметить своё состояние. Это займёт меньше минуты.</p>
        </section>

        <form className="panel" onSubmit={handleCheckin}>
          <div className="section-heading">
            <span className="step-number">1</span>
            <div><h2>Выбери состояние</h2><p>От 1 — очень тяжело до 5 — отлично</p></div>
          </div>
          <div className="mood-picker">
            {moods.map((item) => (
              <button
                className={mood === item.value ? "mood-button mood-button--active" : "mood-button"}
                type="button"
                key={item.value}
                onClick={() => setMood(item.value)}
                aria-label={`${item.value}: ${item.label}`}
                aria-pressed={mood === item.value}
              >
                <span>{item.emoji}</span>
                <small>{item.value}</small>
              </button>
            ))}
          </div>

          <div className="section-heading section-heading--spaced">
            <span className="step-number">2</span>
            <div><h2>Что повлияло?</h2><p>Можно выбрать несколько вариантов</p></div>
          </div>
          <div className="chip-list">
            {availableReasons.map((reason) => (
              <button
                type="button"
                className={reasons.includes(reason) ? "chip chip--active" : "chip"}
                key={reason}
                onClick={() => toggleReason(reason)}
                aria-pressed={reasons.includes(reason)}
              >
                {reason}
              </button>
            ))}
          </div>

          <label className="field field--spaced">
            <span>Хочешь что-нибудь добавить?</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Можно оставить поле пустым"
              rows={4}
              maxLength={1000}
            />
          </label>
          {checkinNotice && <p className="message" role="status">{checkinNotice}</p>}
          <button className="button button--primary" disabled={isSendingCheckin}>
            {isSendingCheckin ? "Отправляем…" : "Отправить состояние"}
          </button>
        </form>

        <form className="panel panel--accent" onSubmit={handleRequest}>
          <div className="section-heading">
            <span className="section-icon" aria-hidden="true">💬</span>
            <div><h2>Связаться с учителем</h2><p>Если хочется поговорить или нужна помощь</p></div>
          </div>
          <label className="field field--spaced">
            <span>Кому написать?</span>
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              {teachers.length === 0 && <option value="">Учителя пока не зарегистрированы</option>}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.nickname}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Что случилось?</span>
            <textarea
              value={requestMessage}
              onChange={(event) => setRequestMessage(event.target.value)}
              placeholder="Опиши ситуацию своими словами"
              rows={5}
              maxLength={2000}
            />
          </label>
          {(teacherError || requestNotice) && (
            <p className="message" role="status">{teacherError || requestNotice}</p>
          )}
          <button
            className="button button--dark"
            disabled={isSendingRequest || teachers.length === 0}
          >
            {isSendingRequest ? "Отправляем…" : "Отправить учителю"}
          </button>
          <p className="privacy-note">Сообщение увидит выбранный учитель.</p>
        </form>
      </main>
    </div>
  );
};
