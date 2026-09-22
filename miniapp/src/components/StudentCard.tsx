import type { StudentCheckin, User } from "../types";

export type StudentStateKey = "attention" | "unstable" | "stable" | "positive" | "no-data";

interface StudentState {
  key: StudentStateKey;
  label: string;
}

interface StudentCardProps {
  student: User;
  checkins: StudentCheckin[];
}

const moodLabels: Record<number, string> = {
  1: "Очень тяжело",
  2: "Тяжело",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично",
};

const getAverage = (checkins: StudentCheckin[]) => (
  checkins.reduce((sum, checkin) => sum + checkin.mood, 0) / checkins.length
);

export const getStudentState = (allCheckins: StudentCheckin[]): StudentState => {
  const checkins = allCheckins.slice(0, 30);

  if (checkins.length === 0) {
    return { key: "no-data", label: "Нет данных" };
  }

  const average = getAverage(checkins);
  const latest = checkins[0].mood;
  const latestThree = checkins.slice(0, 3).reverse();
  const isDeclining = latestThree.length === 3 && latestThree.every((checkin, index) => (
    index === 0 || latestThree[index - 1].mood > checkin.mood
  ));
  const variance = checkins.reduce((sum, checkin) => sum + ((checkin.mood - average) ** 2), 0) / checkins.length;

  if (latest <= 2 || average < 2.5) {
    return { key: "attention", label: "Требует внимания" };
  }

  if (isDeclining || (checkins.length >= 3 && Math.sqrt(variance) >= 1.1)) {
    return { key: "unstable", label: "Нестабильное" };
  }

  if (average >= 4) {
    return { key: "positive", label: "Хорошее" };
  }

  return { key: "stable", label: "Стабильное" };
};

const getMoodTone = (mood: number) => {
  if (mood <= 2) {
    return "attention";
  }

  if (mood >= 4) {
    return "positive";
  }

  return "stable";
};

const MetricIcon = ({ type }: { type: "latest" | "average" | "comment" }) => {
  if (type === "latest") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
  }

  if (type === "average") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17v-5M12 17V8M18 17V5" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12v10H9l-3 3V5Z" /><path d="M9 9h6M9 12h4" /></svg>;
};

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
  day: "2-digit",
  month: "short",
});

export const StudentCard = ({ student, checkins }: StudentCardProps) => {
  const analyzedCheckins = checkins.slice(0, 30);
  const recentCheckins = checkins.slice(0, 5).reverse();
  const historySlots: Array<StudentCheckin | null> = [
    ...Array<null>(5 - recentCheckins.length).fill(null),
    ...recentCheckins,
  ];
  const average = analyzedCheckins.length > 0 ? getAverage(analyzedCheckins) : null;
  const state = getStudentState(checkins);
  const latestCheckin = checkins[0];

  return (
    <article className={`student-card student-card--${state.key}`}>
      <div className="student-card__heading">
        <h3>{student.nickname}</h3>
        <span className={`student-state student-state--${state.key}`}>{state.label}</span>
      </div>

      {latestCheckin ? (
        <>
          <div className="student-card__summary">
            <div className="student-metric">
              <span className="student-metric__icon"><MetricIcon type="latest" /></span>
              <div>
                <span>Последняя</span>
                <strong>{latestCheckin.mood}/5</strong>
              </div>
            </div>
            <div className="student-metric">
              <span className="student-metric__icon"><MetricIcon type="average" /></span>
              <div>
                <span>Средняя</span>
                <strong>{average?.toFixed(1)}</strong>
              </div>
            </div>

            <section className="student-comment">
              <span className="student-metric__icon"><MetricIcon type="comment" /></span>
              <div>
                <span>Комментарий</span>
                <p>{latestCheckin.comment || "Не оставлен"}</p>
              </div>
            </section>
          </div>

          <section className="student-history" aria-label="Последние 5 оценок">
            <span className="student-history__title">Последние оценки</span>
            <div className="student-history__grid">
              {historySlots.map((checkin, index) => (
                <div
                  className={checkin ? `history-cell history-cell--${getMoodTone(checkin.mood)}` : "history-cell history-cell--empty"}
                  key={checkin?.id ?? `empty-${index}`}
                  title={checkin ? moodLabels[checkin.mood] : undefined}
                >
                  {checkin ? (
                    <>
                      <time dateTime={checkin.checkinDate}>{formatDate(checkin.checkinDate)}</time>
                      <strong>{checkin.mood}</strong>
                      <span className="sr-only">{moodLabels[checkin.mood]}</span>
                    </>
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="empty-note">Ученик пока не отправлял состояние.</p>
      )}
    </article>
  );
};
