import { useEffect, useState, type FormEvent } from "react";
import { getTodayCheckin, saveCheckin } from "../api/checkins";
import { AppHeader } from "../components/AppHeader";
import { getErrorMessage } from "../lib/errors";
import type { StudentCheckin, User } from "../types";

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
  const [todayCheckin, setTodayCheckin] = useState<StudentCheckin | null>(null);
  const [isLoadingCheckin, setIsLoadingCheckin] = useState(true);
  const [isVoting, setIsVoting] = useState(true);
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);
  const [checkinNotice, setCheckinNotice] = useState("");
  const [chatNotice, setChatNotice] = useState("");

  useEffect(() => {
    const loadTodayCheckin = async () => {
      try {
        const checkin = await getTodayCheckin(user.id);
        setTodayCheckin(checkin);
        setIsVoting(!checkin);
      } catch (error: unknown) {
        console.error("Failed to load today's check-in:", error);
        setCheckinNotice(getErrorMessage(error, "Не удалось проверить сегодняшний ответ"));
      } finally {
        setIsLoadingCheckin(false);
      }
    };

    void loadTodayCheckin();
  }, [user.id]);

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
      const savedCheckin = await saveCheckin(user.id, mood, reasons, comment);
      setTodayCheckin(savedCheckin);
      setIsVoting(false);
      setCheckinNotice("");
    } catch (error: unknown) {
      console.error("Failed to save check-in:", error);
      setCheckinNotice(getErrorMessage(error, "Не удалось отправить состояние"));
    } finally {
      setIsSendingCheckin(false);
    }
  };

  const handleRevote = () => {
    if (!todayCheckin) {
      return;
    }

    setMood(todayCheckin.mood);
    setReasons(todayCheckin.reasons);
    setComment(todayCheckin.comment ?? "");
    setIsVoting(true);
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

        {isLoadingCheckin ? (
          <p className="loading-state">Проверяем сегодняшний ответ…</p>
        ) : todayCheckin && !isVoting ? (
          <section className="panel vote-success" aria-live="polite">
            <span className="vote-success__icon" aria-hidden="true">✓</span>
            <p className="eyebrow">Ответ за сегодня сохранён</p>
            <h2>Успешно проголосовал</h2>
            <p>Сегодня повторно проходить опрос не нужно. Учитель уже увидит твоё состояние.</p>
            <div className="vote-success__result">
              <span>Твоя оценка</span>
              <strong>{todayCheckin.mood}/5</strong>
            </div>
            <button className="button button--ghost button--fit" type="button" onClick={handleRevote}>
              Переголосовать · отладка
            </button>
          </section>
        ) : (
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

            <div className="section-heading section-heading--spaced">
              <span className="step-number">3</span>
              <div><h2>Комментарий</h2><p>Расскажи подробнее или оставь поле пустым</p></div>
            </div>
            <label className="field survey-comment">
              <span className="sr-only">Комментарий</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Что ещё важно знать учителю?"
                rows={4}
                maxLength={1000}
              />
            </label>
            {checkinNotice && <p className="message" role="status">{checkinNotice}</p>}
            <button className="button button--primary" disabled={isSendingCheckin}>
              {isSendingCheckin ? "Сохраняем…" : todayCheckin ? "Обновить состояние" : "Отправить состояние"}
            </button>
          </form>
        )}

        <section className="panel panel--accent max-chat-card">
          <div className="section-heading">
            <span className="section-icon" aria-hidden="true">💬</span>
            <div><h2>Чат с учителем в MAX</h2><p>Для личного разговора и срочных вопросов</p></div>
          </div>
          <button
            className="button button--dark max-chat-card__button"
            type="button"
            onClick={() => setChatNotice("Переход в чат MAX появится после подключения бота.")}
          >
            Открыть чат с учителем
          </button>
          {chatNotice && <p className="message" role="status">{chatNotice}</p>}
          <p className="privacy-note">Пока это заготовка для будущей интеграции с чатами MAX.</p>
        </section>
      </main>
    </div>
  );
};
