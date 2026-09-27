import { useState, type FormEvent } from "react";
import { createAppointment } from "../../api/support";
import { getSpecialists } from "../../api/users";
import { useLoader } from "../../hooks/useLoader";
import { getErrorMessage } from "../../lib/errors";
import { max } from "../../lib/max";
import type { User, UserRole } from "../../types";
import { Banner, Button, Field, Input, Placeholder, Spinner, Textarea } from "../../ui";
import { PersonPicker } from "../shared/PersonPicker";

interface AppointmentFormProps {
  student: User;
  role: Exclude<UserRole, "student">;
  onDone: () => void;
}

export const AppointmentForm = ({ student, role, onDone }: AppointmentFormProps) => {
  const specialists = useLoader(getSpecialists, []);
  const [specialistId, setSpecialistId] = useState("");
  const [topic, setTopic] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const people = (specialists.data ?? []).filter((person) => person.role === role);
  const selectedId = specialistId || (people.length === 1 ? people[0].id : "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return setError(role === "psychologist" ? "Выберите психолога" : "Выберите учителя");
    if (!topic.trim()) return setError("Напишите пару слов о теме разговора");

    setError("");
    setIsSaving(true);
    try {
      await createAppointment({ studentId: student.id, specialistId: selectedId, topic, preferredTime });
      max.success();
      onDone();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Не удалось записаться"));
    } finally {
      setIsSaving(false);
    }
  };

  if (specialists.isLoading) return <div className="center"><Spinner /></div>;
  if (specialists.error) return <Banner tone="error">{specialists.error}<Button mode="secondary" onClick={() => void specialists.reload()}>Повторить</Button></Banner>;
  if (people.length === 0) {
    return (
      <Placeholder compact title={role === "psychologist" ? "Психолог пока не подключён" : "Учителей пока нет"}>
        Попросите школу зарегистрировать специалиста в ClassPulse.
      </Placeholder>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <PersonPicker people={people} value={selectedId} onChange={setSpecialistId} />
      <Field label="О чём хочется поговорить">
        <Textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Можно коротко: «про отношения в классе»"
          rows={3}
          maxLength={500}
        />
      </Field>
      <Field label="Когда удобно" hint="Необязательно">
        <Input
          value={preferredTime}
          onChange={(event) => setPreferredTime(event.target.value)}
          placeholder="Например, после 6-го урока"
          maxLength={100}
        />
      </Field>
      {(error || specialists.error) && <Banner tone="error">{error || specialists.error}</Banner>}
      <Button type="submit" stretched loading={isSaving}>Записаться</Button>
    </form>
  );
};
