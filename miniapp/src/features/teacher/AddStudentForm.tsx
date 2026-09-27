import { useState, type FormEvent } from "react";
import { addStudent } from "../../api/students";
import { getErrorMessage } from "../../lib/errors";
import { max } from "../../lib/max";
import { Banner, Button, Field, Input } from "../../ui";

interface AddStudentFormProps {
  teacherId: string;
  onAdded: (nickname: string) => void;
}

export const AddStudentForm = ({ teacherId, onAdded }: AddStudentFormProps) => {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nickname.trim()) return setError("Введите ник ученика");

    setError("");
    setIsSaving(true);
    try {
      const student = await addStudent(teacherId, nickname);
      max.success();
      onAdded(student.nickname);
    } catch (addError) {
      max.error();
      setError(getErrorMessage(addError, "Не удалось добавить ученика"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Ник ученика" hint="Тот, с которым ученик зарегистрировался в ClassPulse">
        <Input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Например, Маша"
          maxLength={40}
          autoFocus
        />
      </Field>
      {error && <Banner tone="error">{error}</Banner>}
      <Button type="submit" stretched loading={isSaving}>Добавить в класс</Button>
    </form>
  );
};
