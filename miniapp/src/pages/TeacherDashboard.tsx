import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getCheckinsForStudents, getTodayDate } from "../api/checkins";
import { addStudentToTeacher, getTeacherStudents } from "../api/teacherStudents";
import { AppHeader } from "../components/AppHeader";
import { getStudentState, StudentCard, type StudentStateKey } from "../components/StudentCard";
import { getErrorMessage } from "../lib/errors";
import type { StudentCheckin, User } from "../types";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

const statePriority: Record<StudentStateKey, number> = {
  attention: 0,
  unstable: 1,
  stable: 2,
  positive: 3,
  "no-data": 4,
};

export const TeacherDashboard = ({ user, onLogout }: TeacherDashboardProps) => {
  const [students, setStudents] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<StudentCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StudentStateKey | "all">("all");
  const [sortBy, setSortBy] = useState<"state" | "name">("state");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentNickname, setStudentNickname] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadDashboard = async () => {
    setError("");

    try {
      const loadedStudents = await getTeacherStudents(user.id);
      const loadedCheckins = await getCheckinsForStudents(
        loadedStudents.map((student) => student.id),
      );
      setStudents(loadedStudents);
      setCheckins(loadedCheckins);
    } catch (loadError: unknown) {
      console.error("Failed to load teacher dashboard:", loadError);
      setError(getErrorMessage(loadError, "Не удалось загрузить данные"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user.id]);

  const checkinsByStudent = useMemo(() => {
    const grouped = new Map<string, StudentCheckin[]>();

    for (const checkin of checkins) {
      const studentCheckins = grouped.get(checkin.studentId) ?? [];
      studentCheckins.push(checkin);
      grouped.set(checkin.studentId, studentCheckins);
    }

    return grouped;
  }, [checkins]);

  const todayCheckins = useMemo(() => {
    const today = getTodayDate();
    return checkins.filter((checkin) => checkin.checkinDate === today);
  }, [checkins]);

  const todayAverage = todayCheckins.length > 0
    ? todayCheckins.reduce((sum, checkin) => sum + checkin.mood, 0) / todayCheckins.length
    : null;

  const visibleStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ru-RU");
    const filtered = students.filter((student) => {
      const state = getStudentState(checkinsByStudent.get(student.id) ?? []);
      const matchesSearch = student.nickname.toLocaleLowerCase("ru-RU").includes(normalizedSearch);
      const matchesState = stateFilter === "all" || state.key === stateFilter;
      return matchesSearch && matchesState;
    });

    return filtered.sort((first, second) => {
      if (sortBy === "name") {
        return first.nickname.localeCompare(second.nickname, "ru");
      }

      const firstState = getStudentState(checkinsByStudent.get(first.id) ?? []);
      const secondState = getStudentState(checkinsByStudent.get(second.id) ?? []);
      return statePriority[firstState.key] - statePriority[secondState.key]
        || first.nickname.localeCompare(second.nickname, "ru");
    });
  }, [checkinsByStudent, search, sortBy, stateFilter, students]);

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError("");

    if (!studentNickname.trim()) {
      setAddError("Введите ник ученика");
      return;
    }

    setIsAdding(true);
    try {
      await addStudentToTeacher(user.id, studentNickname);
      setStudentNickname("");
      setIsDialogOpen(false);
      setIsLoading(true);
      await loadDashboard();
    } catch (addStudentError: unknown) {
      console.error("Failed to add student:", addStudentError);
      setAddError(getErrorMessage(addStudentError, "Не удалось добавить ученика"));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader user={user} onLogout={onLogout} />
      <main className="page-content page-content--wide">
        <section className="dashboard-intro">
          <div>
            <p className="eyebrow">Панель учителя</p>
            <h1>Здравствуйте, {user.nickname}</h1>
            <p>Общая картина класса и состояние каждого ученика.</p>
          </div>
          <button className="button button--primary button--fit" type="button" onClick={() => setIsDialogOpen(true)}>
            <span aria-hidden="true">＋</span> Добавить ученика
          </button>
        </section>

        {error && <p className="message message--error" role="alert">{error}</p>}

        <section className="dashboard-section class-summary" aria-labelledby="class-summary-title">
          <div className="dashboard-section__header">
            <div><p className="eyebrow">Сегодня</p><h2 id="class-summary-title">Состояние класса</h2></div>
          </div>
          <div className="class-summary__metrics">
            <article className="metric-card">
              <span>Проголосовали</span>
              <strong>{todayCheckins.length}<small> / {students.length}</small></strong>
              <p>учеников за сегодня</p>
            </article>
            <article className="metric-card">
              <span>Средняя оценка</span>
              <strong>{todayAverage?.toFixed(1) ?? "—"}<small>{todayAverage === null ? "" : " / 5"}</small></strong>
              <p>по сегодняшним ответам</p>
            </article>
            <article className="metric-card metric-card--wide">
              <span>Общая сводка класса</span>
              <strong className="metric-card__placeholder">AI-сводка появится здесь</strong>
              <p>Задел для внешней нейросети: общие темы, жалобы и изменения без раскрытия лишних деталей.</p>
            </article>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="student-state-title">
          <div className="dashboard-section__header student-list-heading">
            <div><p className="eyebrow">Ученики класса</p><h2 id="student-state-title">Состояние учеников</h2></div>
            <span className="counter-badge">{visibleStudents.length}</span>
          </div>

          <div className="student-filters" role="search">
            <label className="filter-field filter-field--search">
              <span>Поиск по имени</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Введите имя ученика" />
            </label>
            <label className="filter-field">
              <span>Общее состояние</span>
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StudentStateKey | "all")}>
                <option value="all">Все состояния</option>
                <option value="attention">Требует внимания</option>
                <option value="unstable">Нестабильное</option>
                <option value="stable">Стабильное</option>
                <option value="positive">Хорошее</option>
                <option value="no-data">Нет данных</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Сортировка</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "state" | "name")}>
                <option value="state">По состоянию</option>
                <option value="name">По имени</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="loading-state">Загружаем данные…</p>
          ) : students.length === 0 ? (
            <div className="empty-state"><span aria-hidden="true">👥</span><h3>Учеников пока нет</h3><p>Добавьте ученика по нику, чтобы видеть его состояние.</p></div>
          ) : visibleStudents.length === 0 ? (
            <div className="empty-state empty-state--compact"><h3>Ничего не найдено</h3><p>Измените поиск или фильтр состояния.</p></div>
          ) : (
            <div className="student-grid student-grid--detailed">
              {visibleStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  checkins={checkinsByStudent.get(student.id) ?? []}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {isDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsDialogOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-student-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal__close" type="button" aria-label="Закрыть" onClick={() => setIsDialogOpen(false)}>×</button>
            <span className="modal__icon" aria-hidden="true">＋</span>
            <h2 id="add-student-title">Добавить ученика</h2>
            <p>Введите ник, с которым ученик вошёл в Class Pulse.</p>
            <form onSubmit={handleAddStudent}>
              <label className="field">
                <span>Ник ученика</span>
                <input value={studentNickname} onChange={(event) => setStudentNickname(event.target.value)} placeholder="Например, Маша" autoFocus maxLength={40} />
              </label>
              {addError && <p className="message message--error" role="alert">{addError}</p>}
              <button className="button button--primary" disabled={isAdding}>{isAdding ? "Добавляем…" : "Добавить"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
