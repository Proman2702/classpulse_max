import { useState, type FormEvent } from "react";
import { updateProfile } from "../../api/users";
import { getErrorMessage } from "../../lib/errors";
import { ROLE_LABELS } from "../../lib/labels";
import { isMaxLink, max, MAX_LINK_PREFIX } from "../../lib/max";
import type { User } from "../../types";
import { Avatar, Banner, Button, Cell, CellIcon, Field, Header, Icon, Input, Screen, Section } from "../../ui";

const LINK_HINTS: Record<User["role"], string> = {
  student: "Учитель сможет открыть твой профиль и написать тебе в MAX, если понадобится.",
  teacher: "Ученики смогут написать вам в MAX прямо из приложения.",
  psychologist: "Ученики смогут написать вам в MAX после записи.",
};

interface ProfileScreenProps {
  user: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

export const ProfileScreen = ({ user, onUserChange, onLogout }: ProfileScreenProps) => {
  const [nickname, setNickname] = useState(user.nickname);
  const [maxLink, setMaxLink] = useState(user.maxLink ?? "");
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = nickname.trim() !== user.nickname || maxLink.trim() !== (user.maxLink ?? "");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const link = maxLink.trim();
    if (nickname.trim().length < 2) return setStatus({ tone: "error", text: "Имя — минимум 2 символа" });
    if (link && !isMaxLink(link)) {
      return setStatus({ tone: "error", text: `Ссылка должна начинаться с ${MAX_LINK_PREFIX}` });
    }

    setIsSaving(true);
    try {
      onUserChange(await updateProfile(user.id, { nickname, maxLink: link || null }));
      setStatus({ tone: "success", text: "Сохранено" });
      max.success();
    } catch (error) {
      setStatus({ tone: "error", text: getErrorMessage(error, "Не удалось сохранить") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen header={<Header title="Профиль" />}>
      <div className="profile-hero">
        <Avatar name={user.nickname} size={88} />
        <h2>{user.nickname}</h2>
        <p>{ROLE_LABELS[user.role]}</p>
      </div>

      <form onSubmit={save}>
        <Section
          header="Данные"
          footer={LINK_HINTS[user.role] + " Ссылку можно скопировать в MAX: Профиль → Поделиться."}
        >
          <div className="section__padded form">
            <Field label="Имя в ClassPulse">
              <Input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} />
            </Field>
            <Field label="Ссылка на профиль MAX">
              <Input
                value={maxLink}
                onChange={(event) => setMaxLink(event.target.value)}
                placeholder={`${MAX_LINK_PREFIX}u/...`}
                inputMode="url"
                maxLength={200}
              />
            </Field>
            {status && <Banner tone={status.tone}>{status.text}</Banner>}
            {isDirty && <Button type="submit" stretched loading={isSaving}>Сохранить</Button>}
          </div>
        </Section>
      </form>

      <Section>
        <Cell before={<CellIcon color="var(--danger)"><Icon name="logout" size={20} /></CellIcon>} danger onClick={onLogout}>
          Выйти
        </Cell>
      </Section>

      <p className="app-footnote">ClassPulse · обратная связь и поддержка</p>
    </Screen>
  );
};
