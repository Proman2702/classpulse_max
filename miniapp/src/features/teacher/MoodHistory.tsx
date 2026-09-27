import { formatDay } from "../../lib/date";
import { getMood, getMoodTone } from "../../lib/mood";
import type { Checkin } from "../../types";
import { cx } from "../../ui";

const SLOTS = 5;

/** Последние пять оценок, от старой к новой. Пустые слоты — дни без ответа в истории. */
const lastFive = (checkins: Checkin[]): Array<Checkin | null> => {
  const recent = checkins.slice(0, SLOTS).reverse();
  return [...Array<null>(SLOTS - recent.length).fill(null), ...recent];
};

/** Компактная полоска из пяти точек для строки списка. */
export const MoodDots = ({ checkins }: { checkins: Checkin[] }) => (
  <span className="mood-dots" aria-label="Последние оценки">
    {lastFive(checkins).map((checkin, index) => (
      <span
        key={checkin?.id ?? `empty-${index}`}
        className={cx("mood-dot", checkin ? `mood-dot--${getMoodTone(checkin.mood)}` : "mood-dot--empty")}
        title={checkin ? `${formatDay(checkin.date)}: ${checkin.mood}/5` : undefined}
      />
    ))}
  </span>
);

/** Подробная история: дата, эмодзи и оценка. */
export const MoodHistory = ({ checkins }: { checkins: Checkin[] }) => (
  <div className="mood-history">
    {lastFive(checkins).map((checkin, index) =>
      checkin ? (
        <div key={checkin.id} className={cx("mood-history__cell", `mood-history__cell--${getMoodTone(checkin.mood)}`)}>
          <time dateTime={checkin.date}>{formatDay(checkin.date)}</time>
          <span className="mood-history__emoji">{getMood(checkin.mood).emoji}</span>
          <strong>{checkin.mood}</strong>
        </div>
      ) : (
        <div key={`empty-${index}`} className="mood-history__cell mood-history__cell--empty">—</div>
      ),
    )}
  </div>
);
