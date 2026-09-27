import { useState, type FormEvent } from "react";
import { createReport } from "../../api/support";
import { getSpecialists } from "../../api/users";
import { useLoader } from "../../hooks/useLoader";
import { getErrorMessage } from "../../lib/errors";
import { REPORT_SUBJECT } from "../../lib/labels";
import { max } from "../../lib/max";
import type { ReportSubject } from "../../types";
import { Banner, Button, Field, Icon, Input, Placeholder, Segmented, Spinner, Textarea } from "../../ui";
import { PersonPicker } from "../shared/PersonPicker";

const SUBJECT_OPTIONS = (Object.keys(REPORT_SUBJECT) as ReportSubject[]).map((value) => ({
  value,
  label: REPORT_SUBJECT[value],
}));

export const ReportForm = ({ onDone }: { onDone: () => void }) => {
  const specialists = useLoader(getSpecialists, []);
  const [recipientId, setRecipientId] = useState("");
  const [subjectKind, setSubjectKind] = useState<ReportSubject>("student");
  const [subjectName, setSubjectName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Психологи идут первыми: жалобу на учителя логичнее отправлять им.
  const people = [...(specialists.data ?? [])].sort((a, b) =>
    Number(b.role === "psychologist") - Number(a.role === "psychologist"));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipientId) return setError("Выберите, кому отправить");
    if (!message.trim()) return setError("Опишите, что произошло");

    setError("");
    setIsSaving(true);
    try {
      await createReport({ recipientId, subjectKind, subjectName, message });
      max.success();
      onDone();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Не удалось отправить жалобу"));
    } finally {
      setIsSaving(false);
    }
  };

  if (specialists.isLoading) return <div className="center"><Spinner /></div>;
  if (specialists.error) return <Banner tone="error">{specialists.error}<Button mode="secondary" onClick={() => void specialists.reload()}>Повторить</Button></Banner>;
  if (people.length === 0) return <Placeholder compact title="Специалисты пока не подключены">Попросите школу зарегистрировать учителя или психолога в ClassPulse.</Placeholder>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="privacy-note">
        <Icon name="shield" size={20} />
        <span>Получатель не увидит, кто отправил жалобу: имя автора закрыто от него на уровне базы данных.</span>
      </div>

      <Field label="Кому отправить">
        <PersonPicker people={people} value={recipientId} onChange={setRecipientId} />
      </Field>
      <Field label="О ком жалоба">
        <Segmented label="О ком жалоба" value={subjectKind} options={SUBJECT_OPTIONS} onChange={setSubjectKind} />
      </Field>
      {subjectKind !== "other" && (
        <Field label={subjectKind === "teacher" ? "Учитель" : "Ученик"} hint="Необязательно">
          <Input
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="Имя или как к нему обращаются"
            maxLength={80}
          />
        </Field>
      )}
      <Field label="Что произошло">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Опиши ситуацию так, как считаешь нужным"
          rows={5}
          maxLength={2000}
        />
      </Field>
      {(error || specialists.error) && <Banner tone="error">{error || specialists.error}</Banner>}
      <Button type="submit" stretched loading={isSaving}>Отправить анонимно</Button>
    </form>
  );
};
