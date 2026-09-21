import { useEffect, useState, type FormEvent } from "react";
import { getCheckinsForStudents } from "../api/checkins";
import { getTeacherRequests } from "../api/requests";
import { addStudentToTeacher, getTeacherStudents } from "../api/teacherStudents";
import { AppHeader } from "../components/AppHeader";
import { StudentCard } from "../components/StudentCard";
import { getErrorMessage } from "../lib/errors";
import type { StudentCheckin, TeacherRequest, User } from "../types";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

export const TeacherDashboard = ({ user, onLogout }: TeacherDashboardProps) => {
  const [students, setStudents] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<StudentCheckin[]>([]);
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentNickname, setStudentNickname] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadDashboard = async () => {
    setError("");

    try {
      const [loadedStudents, loadedRequests] = await Promise.all([
        getTeacherStudents(user.id),
        getTeacherRequests(user.id),
      ]);
      const loadedCheckins = await getCheckinsForStudents(
        loadedStudents.map((student) => student.id),
      );
      setStudents(loadedStudents);
      setRequests(loadedRequests);
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
            <p>Следите за состоянием учеников и отвечайте на важные обращения.</p>
          </div>
          <div className="summary-card">
            <strong>{students.length}</strong>
            <span>учеников</span>
          </div>
        </section>

        {error && <p className="message message--error" role="alert">{error}</p>}

        <section className="dashboard-section" aria-labelledby="students-title">
          <div className="dashboard-section__header">
            <div><p className="eyebrow">Моя группа</p><h2 id="students-title">Ученики</h2></div>
            <button className="button button--primary button--fit" type="button" onClick={() => setIsDialogOpen(true)}>
              <span aria-hidden="true">＋</span> Добавить ученика
            </button>
          </div>

          {isLoading ? (
            <p className="loading-state">Загружаем данные…</p>
          ) : students.length === 0 ? (
            <div className="empty-state"><span aria-hidden="true">👥</span><h3>Учеников пока нет</h3><p>Добавьте ученика по нику, чтобы видеть его состояние.</p></div>
          ) : (
            <div className="student-grid">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  checkins={checkins.filter((checkin) => checkin.studentId === student.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section" aria-labelledby="requests-title">
          <div className="dashboard-section__header">
            <div><p className="eyebrow">Входящие</p><h2 id="requests-title">Обращения</h2></div>
            {requests.length > 0 && <span className="counter-badge">{requests.length}</span>}
          </div>

          {!isLoading && requests.length === 0 ? (
            <div className="empty-state empty-state--compact"><span aria-hidden="true">✓</span><h3>Новых обращений нет</h3></div>
          ) : (
            <div className="request-list">
              {requests.map((request) => (
                <article className={`request-card request-card--${request.severity}`} key={request.id}>
                  <div className="request-card__meta">
                    <strong>{request.studentNickname}</strong>
                    <div><span className={`severity severity--${request.severity}`}>{request.severity}</span><span className="status-badge">{request.status}</span></div>
                  </div>
                  <p>{request.message}</p>
                  <time dateTime={request.createdAt}>
                    {new Date(request.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </article>
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
