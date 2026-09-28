import { useMemo, useState } from "react";
import { getClass } from "../../api/students";
import { useLoader } from "../../hooks/useLoader";
import { today } from "../../lib/date";
import { plural } from "../../lib/labels";
import { averageMood, getMood, getRecentAverage, getStudentState, STUDENT_STATES, type StudentStateKey } from "../../lib/mood";
import type { ClassStudent, User } from "../../types";
import {
  Avatar, Badge, Banner, Button, Cell, Chip, Header, Icon, IconButton, Input, Placeholder, Screen, ScreenSpinner,
  Section, Segmented, Sheet,
} from "../../ui";
import { max } from "../../lib/max";
import { AddStudentForm } from "./AddStudentForm";
import { MoodDots } from "./MoodHistory";
import { StudentSheet } from "./StudentSheet";
import { SummaryCard } from "./SummaryCard";

type Filter = StudentStateKey | "all" | "watched";
type Sort = "state" | "name";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "watched", label: "⭐ На контроле" },
  ...(Object.keys(STUDENT_STATES) as StudentStateKey[]).map((value) => ({ value, label: STUDENT_STATES[value].label })),
];

const byName = (a: ClassStudent, b: ClassStudent) => a.student.nickname.localeCompare(b.student.nickname, "ru");

export const ClassScreen = ({ user }: { user: User }) => {
  const classroom = useLoader(() => getClass(user.id), [user.id]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("state");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [inviteError, setInviteError] = useState("");

  const students = useMemo(() => classroom.data ?? [], [classroom.data]);

  const todayCheckins = useMemo(() => {
    const date = today();
    return students.flatMap((item) => item.checkins.filter((checkin) => checkin.date === date));
  }, [students]);
  const todayAverage = averageMood(todayCheckins);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    return students
      .map((item) => ({ ...item, state: getStudentState(item.checkins) }))
      .filter((item) => item.student.nickname.toLocaleLowerCase("ru-RU").includes(query))
      .filter((item) => filter === "all" || (filter === "watched" ? item.isWatched : item.state === filter))
      .sort((a, b) =>
        sort === "name"
          ? byName(a, b)
          : Number(b.isWatched) - Number(a.isWatched)
            || STUDENT_STATES[a.state].priority - STUDENT_STATES[b.state].priority
            || byName(a, b));
  }, [students, search, filter, sort]);

  const invite = async () => {
    setInviteError("");
    try {
      const result = await max.share(
        "Привет! Это ClassPulse — отмечай, как прошёл день, это займёт 20 секунд. Зарегистрируйся и скажи мне свой ник, я добавлю тебя в класс.",
        max.appLink(),
      );
      if (result === "copied") setNotice("Приглашение скопировано — вставьте его в чат класса");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to share invitation:", error);
      setInviteError("Не удалось поделиться приглашением. Попробуйте ещё раз");
    }
  };

  const openItem = students.find((item) => item.student.id === openId);
  const attentionCount = students.filter((item) => getStudentState(item.checkins) === "attention").length;

  return (
    <Screen
      header={
        <Header
          title="Мой класс"
          subtitle={`${students.length} ${plural(students.length, ["ученик", "ученика", "учеников"])}`}
          after={
            <IconButton label="Добавить ученика" className="icon-button--accent" onClick={() => setIsAdding(true)}>
              <Icon name="plus" />
            </IconButton>
          }
        />
      }
    >
      <p className="greeting">Здравствуйте, {user.nickname}! Вот как дела у класса сегодня.</p>
      {notice && <Banner tone="success">{notice}</Banner>}
      {inviteError && <Banner tone="error">{inviteError}</Banner>}
      {classroom.error && <Banner tone="error">{classroom.error}</Banner>}

      <div className="stats stats--hero">
        <div className="stat">
          <span>Ответили сегодня</span>
          <strong>{todayCheckins.length}<small> / {students.length}</small></strong>
          <div className="progress">
            <span style={{ width: `${students.length ? (todayCheckins.length / students.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="stat">
          <span>Средняя оценка</span>
          <strong>
            {todayAverage === null ? "—" : <>{getMood(Math.round(todayAverage)).emoji} {todayAverage.toFixed(1)}</>}
            {todayAverage !== null && <small> / 5</small>}
          </strong>
          {attentionCount > 0 && <span className="stat__note">{attentionCount} {plural(attentionCount, ["требует", "требуют", "требуют"])} внимания</span>}
        </div>
      </div>

      <SummaryCard answersToday={todayCheckins.length} />

      {students.length > 0 && (
        <button type="button" className="invite-row" onClick={() => void invite()}>
          <Icon name="send" size={20} />
          <span>Пригласить учеников через MAX</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <Section
        header="Ученики"
        aside={<Segmented label="Сортировка" value={sort} onChange={setSort} options={[
          { value: "state", label: "По состоянию" },
          { value: "name", label: "По имени" },
        ]} />}
        plain
      >
        <div className="search">
          <Icon name="search" size={20} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по имени" aria-label="Поиск по имени" />
        </div>
        <div className="chips-scroll">
          {FILTERS.map((option) => (
            <Chip key={option.value} active={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>

        {classroom.isLoading ? (
          <ScreenSpinner />
        ) : students.length === 0 ? (
          <Placeholder
            icon={<Icon name="class" size={36} />}
            title="Учеников пока нет"
            action={
              <div className="actions">
                <Button size="m" before={<Icon name="send" size={18} />} onClick={() => void invite()}>Пригласить класс в MAX</Button>
                <Button size="m" mode="secondary" onClick={() => setIsAdding(true)}>Добавить по нику</Button>
              </div>
            }
          >
            Отправьте приглашение в чат класса, а затем добавьте учеников по нику.
          </Placeholder>
        ) : visible.length === 0 ? (
          <Placeholder compact title="Ничего не найдено">Измените поиск или фильтр.</Placeholder>
        ) : (
          <div className="section__card">
            {visible.map((item) => {
              const todayCheckin = item.checkins.find((checkin) => checkin.date === today());
              const average = getRecentAverage(item.checkins);
              return (
                <Cell
                  key={item.student.id}
                  before={
                    <span className="avatar-wrap">
                      <Avatar name={item.student.nickname} />
                      {item.isWatched && <span className="avatar-wrap__star"><Icon name="star" size={12} filled /></span>}
                    </span>
                  }
                  subtitle={
                    todayCheckin
                      ? `Сегодня ${getMood(todayCheckin.mood).emoji} ${todayCheckin.mood}/5${todayCheckin.comment ? ` · «${todayCheckin.comment}»` : ""}`
                      : "Сегодня ещё не отвечал"
                  }
                  extra={
                    <span className="cell__meta">
                      <Badge tone={item.state === "no-data" ? "neutral" : item.state}>{STUDENT_STATES[item.state].label}</Badge>
                      <MoodDots checkins={item.checkins} />
                    </span>
                  }
                  after={average !== null && <span className="cell__value">{average.toFixed(1)}</span>}
                  chevron
                  onClick={() => setOpenId(item.student.id)}
                >
                  {item.student.nickname}
                </Cell>
              );
            })}
          </div>
        )}
      </Section>

      {openItem && (
        <StudentSheet
          teacherId={user.id}
          item={openItem}
          onClose={() => setOpenId(null)}
          onChanged={() => void classroom.reload()}
        />
      )}

      {isAdding && (
        <Sheet title="Добавить ученика" onClose={() => setIsAdding(false)}>
          <AddStudentForm
            teacherId={user.id}
            onAdded={(nickname) => {
              setIsAdding(false);
              setNotice(`${nickname} теперь в вашем классе`);
              void classroom.reload();
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
};
