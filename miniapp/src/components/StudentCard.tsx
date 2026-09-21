import type { StudentCheckin, User } from "../types";

interface StudentCardProps {
  student: User;
  checkins: StudentCheckin[];
}

const moodEmoji: Record<number, string> = {
  1: "😣",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};

export const getStudentTrend = (checkins: StudentCheckin[]) => {
  const latestThree = checkins.slice(0, 3).reverse();

  if (latestThree.length < 3) {
    return "stable";
  }

  const isDeclining = latestThree.every((checkin, index) =>
    index === 0 || latestThree[index - 1].mood > checkin.mood,
  );

  return isDeclining ? "warning" : "stable";
};

export const StudentCard = ({ student, checkins }: StudentCardProps) => {
  const recentCheckins = checkins.slice(0, 5);
  const average = recentCheckins.length > 0
    ? recentCheckins.reduce((sum, checkin) => sum + checkin.mood, 0) / recentCheckins.length
    : null;
  const trend = getStudentTrend(checkins);

  return (
    <article className="student-card">
      <div className="student-card__heading">
        <div>
          <h3>{student.nickname}</h3>
          <span>{checkins.length} {checkins.length === 1 ? "запись" : "записей"}</span>
        </div>
        {trend === "warning" && <span className="attention-badge">⚠ Нужно внимание</span>}
      </div>

      {checkins.length > 0 ? (
        <>
          <div className="student-stats">
            <div>
              <span>Последнее</span>
              <strong>{checkins[0].mood}/5</strong>
            </div>
            <div>
              <span>Среднее</span>
              <strong>{average?.toFixed(1)}</strong>
            </div>
          </div>
          <div className="mood-history" aria-label="Последние оценки">
            <span>Динамика</span>
            <div>
              {checkins.slice(0, 5).reverse().map((checkin) => (
                <span key={checkin.id} title={`${checkin.mood} из 5`}>
                  {moodEmoji[checkin.mood]}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="empty-note">Ученик пока не отправлял состояние.</p>
      )}
    </article>
  );
};
