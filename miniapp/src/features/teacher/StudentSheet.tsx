import { useState, type FormEvent } from "react";
import { addNote, deleteNote, getNotes, removeStudent, setWatched } from "../../api/students";
import { useLoader } from "../../hooks/useLoader";
import { formatMessageTime } from "../../lib/date";
import { getErrorMessage } from "../../lib/errors";
import { max } from "../../lib/max";
import { getMood, getRecentAverage, getStudentState, STUDENT_STATES } from "../../lib/mood";
import type { ClassStudent } from "../../types";
import { Avatar, Badge, Banner, Button, Icon, IconButton, Sheet, Textarea } from "../../ui";
import { MoodHistory } from "./MoodHistory";

interface StudentSheetProps {
  teacherId: string;
  item: ClassStudent;
  onClose: () => void;
  onChanged: () => void;
}

export const StudentSheet = ({ teacherId, item, onClose, onChanged }: StudentSheetProps) => {
  const { student, checkins } = item;
  const notes = useLoader(() => getNotes(teacherId, student.id), [teacherId, student.id]);
  const [isWatched, setIsWatchedState] = useState(item.isWatched);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const state = getStudentState(checkins);
  const latest = checkins[0];
  const average = getRecentAverage(checkins);

  const run = async (action: () => Promise<void>) => {
    setError("");
    setIsUpdating(true);
    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleWatched = () => run(async () => {
    max.tap();
    await setWatched(teacherId, student.id, !isWatched);
    setIsWatchedState(!isWatched);
    onChanged();
  });

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    setIsSavingNote(true);
    await run(async () => {
      const note = await addNote(teacherId, student.id, noteText);
      notes.setData((current) => [note, ...(current ?? [])]);
      setNoteText("");
    });
    setIsSavingNote(false);
  };

  const removeNote = (noteId: string) => run(async () => {
    await deleteNote(noteId);
    notes.setData((current) => (current ?? []).filter((note) => note.id !== noteId));
  });

  const remove = () => run(async () => {
    await removeStudent(teacherId, student.id);
    onChanged();
    onClose();
  });

  return (
    <Sheet title="Ученик" onClose={onClose}>
      <div className="detail-hero">
        <Avatar name={student.nickname} size={72} />
        <h3>{student.nickname}</h3>
        <Badge tone={state === "no-data" ? "neutral" : state}>{STUDENT_STATES[state].label}</Badge>
      </div>

      <div className="actions actions--row">
        <Button
          mode={isWatched ? "primary" : "secondary"}
          size="m"
          stretched
          before={<Icon name="star" size={18} filled={isWatched} />}
          onClick={() => void toggleWatched()}
          disabled={isUpdating}
        >
          {isWatched ? "На контроле" : "Взять на контроль"}
        </Button>
        <Button
          mode="secondary"
          size="m"
          stretched
          disabled={!student.maxLink}
          before={<Icon name="chat" size={18} />}
          onClick={() => student.maxLink && max.open(student.maxLink)}
        >
          Написать в MAX
        </Button>
      </div>
      {!student.maxLink && <p className="muted small center-text">Ученик ещё не добавил ссылку на профиль MAX</p>}

      {latest ? (
        <>
          <div className="stats">
            <div className="stat">
              <span>Последняя</span>
              <strong>{getMood(latest.mood).emoji} {latest.mood}/5</strong>
            </div>
            <div className="stat">
              <span>Средняя</span>
              <strong>{average?.toFixed(1)}</strong>
            </div>
          </div>

          <h4 className="subheading">Комментарий</h4>
          <div className="quote">{latest.comment || <span className="muted">Не оставлен</span>}</div>
          {latest.reasons.length > 0 && (
            <div className="tags">{latest.reasons.map((reason) => <Badge key={reason}>{reason}</Badge>)}</div>
          )}

          <h4 className="subheading">Последние оценки</h4>
          <MoodHistory checkins={checkins} />
        </>
      ) : (
        <p className="muted center-text">Ученик пока не отправлял состояние.</p>
      )}

      <h4 className="subheading">Мои заметки</h4>
      <p className="muted small">Заметьте, если ученик ведёт себя не как обычно. Заметки видите только вы.</p>
      <form className="note-form" onSubmit={saveNote}>
        <Textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Например: сегодня был замкнут, не отвечал на уроке"
          aria-label="Новая заметка об ученике"
          rows={2}
          maxLength={1000}
        />
        <Button type="submit" size="m" loading={isSavingNote} disabled={isUpdating || !noteText.trim()}>Добавить</Button>
      </form>
      <div className="notes">
        {(notes.data ?? []).map((note) => (
          <div key={note.id} className="note">
            <div>
              <p>{note.body}</p>
              <time>{formatMessageTime(note.createdAt)}</time>
            </div>
            <IconButton label="Удалить заметку" disabled={isUpdating} onClick={() => void removeNote(note.id)}>
              <Icon name="trash" size={18} />
            </IconButton>
          </div>
        ))}
      </div>

      {(error || notes.error) && <Banner tone="error">{error || notes.error}</Banner>}

      <div className="actions">
        {confirmRemove ? (
          <Button mode="danger" stretched loading={isUpdating} onClick={() => void remove()}>Точно убрать {student.nickname} из класса</Button>
        ) : (
          <Button mode="tertiary" stretched onClick={() => setConfirmRemove(true)}>Убрать из класса</Button>
        )}
      </div>
    </Sheet>
  );
};
