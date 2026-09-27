import { useEffect, useRef, useState, type FormEvent } from "react";
import { getTodayCheckin, saveTodayCheckin, type CheckinAnswer } from "../../api/checkins";
import { useLoader } from "../../hooks/useLoader";
import { formatMessageTime, nowTime } from "../../lib/date";
import { getErrorMessage } from "../../lib/errors";
import { max } from "../../lib/max";
import { getMood, MOODS, REASONS } from "../../lib/mood";
import type { User } from "../../types";
import { Banner, Button, Chip, Header, Icon, IconButton, Screen, ScreenSpinner } from "../../ui";
import { BotAvatar } from "../shared/BotAvatar";

type Step = "mood" | "reasons" | "comment" | "done";

const EMPTY_ANSWER: CheckinAnswer = { mood: 0, reasons: [], comment: "" };

interface Message {
  id: string;
  from: "bot" | "me";
  text: string;
}

const buildMessages = (name: string, step: Step, answer: CheckinAnswer): Message[] => {
  const messages: Message[] = [
    { id: "hello", from: "bot", text: `Привет, ${name}! 👋\nКак прошёл твой день?` },
  ];
  if (step === "mood") return messages;

  const mood = getMood(answer.mood);
  messages.push(
    { id: "mood", from: "me", text: `${mood.emoji} ${mood.label} · ${mood.value}/5` },
    { id: "ask-reasons", from: "bot", text: "Что больше всего на это повлияло? Можно выбрать несколько вариантов." },
  );
  if (step === "reasons") return messages;

  messages.push(
    { id: "reasons", from: "me", text: answer.reasons.length ? answer.reasons.join(", ") : "Ничего особенного" },
    {
      id: "ask-comment",
      from: "bot",
      text: "Хочешь рассказать подробнее? Учитель прочитает. В общей сводке класса ответ будет без имени.",
    },
  );
  if (step === "comment") return messages;

  if (answer.comment.trim()) messages.push({ id: "comment", from: "me", text: answer.comment.trim() });
  messages.push({
    id: "thanks",
    from: "bot",
    text: answer.mood <= 2
      ? "Спасибо, что поделился. Похоже, день выдался непростым 💙 Если хочется поговорить, можно записаться к психологу, это конфиденциально."
      : "Спасибо, записал! Хорошего вечера, возвращайся завтра ✨",
  });
  return messages;
};

interface CheckinChatProps {
  user: User;
  onOpenSupport: () => void;
}

export const CheckinChat = ({ user, onOpenSupport }: CheckinChatProps) => {
  const today = useLoader(() => getTodayCheckin(user.id), [user.id]);
  const [step, setStep] = useState<Step>("mood");
  const [answer, setAnswer] = useState<CheckinAnswer>(EMPTY_ANSWER);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(nowTime());

  // Если ответ за сегодня уже есть — показываем завершённый диалог.
  useEffect(() => {
    const checkin = today.data;
    if (!checkin) return;
    setAnswer({ mood: checkin.mood, reasons: checkin.reasons, comment: checkin.comment ?? "" });
    setStep("done");
  }, [today.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, isSaving]);

  const update = (changes: Partial<CheckinAnswer>) => setAnswer((current) => ({ ...current, ...changes }));

  const chooseMood = (mood: number) => {
    max.tap();
    update({ mood });
    setStep("reasons");
  };

  const toggleReason = (reason: string) => {
    max.tap();
    update({
      reasons: answer.reasons.includes(reason)
        ? answer.reasons.filter((item) => item !== reason)
        : [...answer.reasons, reason],
    });
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const saved = await saveTodayCheckin(user.id, answer);
      today.setData(() => saved);
      setStep("done");
      max.success();
    } catch (saveError) {
      max.error();
      setError(getErrorMessage(saveError, "Не удалось отправить ответ"));
    } finally {
      setIsSaving(false);
    }
  };

  const restart = () => {
    setStep("mood");
    startedAt.current = nowTime();
  };

  const time = step === "done" && today.data ? formatMessageTime(today.data.createdAt) : startedAt.current;
  const messages = buildMessages(user.nickname, step, answer);

  const footer = today.isLoading ? null : {
    mood: (
      <div className="quick-replies quick-replies--moods">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            className="mood-reply"
            onClick={() => chooseMood(mood.value)}
            aria-label={`${mood.value} — ${mood.label}`}
          >
            <span className="mood-reply__emoji">{mood.emoji}</span>
            <span className="mood-reply__label">{mood.label}</span>
          </button>
        ))}
      </div>
    ),
    reasons: (
      <div className="composer-stack">
        <div className="quick-replies">
          {REASONS.map((reason) => (
            <Chip key={reason} active={answer.reasons.includes(reason)} onClick={() => toggleReason(reason)}>
              {reason}
            </Chip>
          ))}
        </div>
        <Button stretched onClick={() => setStep("comment")}>
          {answer.reasons.length ? "Дальше" : "Пропустить"}
        </Button>
      </div>
    ),
    comment: (
      <form className="composer" onSubmit={submit}>
        <textarea
          className="composer__input"
          value={answer.comment}
          onChange={(event) => update({ comment: event.target.value })}
          placeholder="Сообщение"
          aria-label="Комментарий о дне"
          rows={1}
          maxLength={1000}
          autoFocus
        />
        {answer.comment.trim() ? (
          <IconButton label="Отправить" type="submit" className="composer__send" disabled={isSaving}>
            <Icon name="send" size={22} />
          </IconButton>
        ) : (
          <Button mode="secondary" size="m" type="submit" loading={isSaving}>
            Пропустить
          </Button>
        )}
      </form>
    ),
    done: (
      <div className="composer-stack">
        {answer.mood <= 2 && (
          <Button stretched before={<Icon name="heart" size={20} />} onClick={onOpenSupport}>
            Записаться к психологу
          </Button>
        )}
        <Button mode="secondary" stretched onClick={restart}>
          Переголосовать
        </Button>
      </div>
    ),
  }[step];

  return (
    <Screen
      tinted
      header={<Header before={<BotAvatar />} title="ClassPulse" subtitle="бот · опрос дня" />}
      footer={footer}
    >
      {today.isLoading ? (
        <ScreenSpinner />
      ) : (
        <div className="chat">
          <span className="chat__day">Сегодня</span>
          {messages.map((message) => (
            <div key={message.id} className={`bubble bubble--${message.from}`}>
              <span className="bubble__text">{message.text}</span>
              <span className="bubble__time">
                {time}
                {message.from === "me" && step === "done" && <Icon name="check" size={14} />}
              </span>
            </div>
          ))}
          {isSaving && <div className="bubble bubble--bot bubble--typing"><span /><span /><span /></div>}
          {(error || today.error) && <Banner tone="error">{error || today.error}</Banner>}
          <div ref={endRef} />
        </div>
      )}
    </Screen>
  );
};
