import { useState } from "react";
import { getMyTeachers } from "../../api/students";
import { getAppointments, getReports } from "../../api/support";
import { useLoader } from "../../hooks/useLoader";
import { formatMessageTime } from "../../lib/date";
import { APPOINTMENT_STATUS, REPORT_STATUS, REPORT_SUBJECT } from "../../lib/labels";
import { max } from "../../lib/max";
import type { User } from "../../types";
import { Avatar, Badge, Banner, Button, Cell, CellIcon, Header, Icon, Screen, Section, Sheet } from "../../ui";
import { AppointmentForm } from "./AppointmentForm";
import { ReportForm } from "./ReportForm";

type SheetKind = "psychologist" | "teacher" | "report";

const SHEET_TITLES: Record<SheetKind, string> = {
  psychologist: "Запись к психологу",
  teacher: "Запись к учителю",
  report: "Анонимная жалоба",
};

export const SupportScreen = ({ user, openPsychologist = false }: { user: User; openPsychologist?: boolean }) => {
  const history = useLoader(async () => {
    const [appointments, reports, teachers] = await Promise.all([
      getAppointments(),
      getReports(),
      getMyTeachers(user.id),
    ]);
    return { appointments, reports, teachers };
  }, [user.id]);
  const [sheet, setSheet] = useState<SheetKind | null>(openPsychologist ? "psychologist" : null);
  const [notice, setNotice] = useState("");

  const finish = (text: string) => {
    setSheet(null);
    setNotice(text);
    void history.reload();
  };

  const { appointments = [], reports = [], teachers = [] } = history.data ?? {};

  return (
    <Screen header={<Header title="Поддержка" subtitle="Здесь тебя выслушают" />}>
      {notice && <Banner tone="success">{notice}</Banner>}
      {history.error && <Banner tone="error">{history.error}</Banner>}

      <Section header="Поговорить с человеком">
        <Cell
          before={<CellIcon color="var(--pink)"><Icon name="heart" size={20} /></CellIcon>}
          subtitle="Конфиденциально, без оценок"
          chevron
          onClick={() => setSheet("psychologist")}
        >
          Записаться к психологу
        </Cell>
        <Cell
          before={<CellIcon color="var(--accent)"><Icon name="calendar" size={20} /></CellIcon>}
          subtitle="Обсудить учёбу или ситуацию в классе"
          chevron
          onClick={() => setSheet("teacher")}
        >
          Записаться к учителю
        </Cell>
      </Section>

      <Section header="Сообщить о проблеме" footer="Жалоба уходит без твоего имени. Срочные сообщения GigaChat поднимет наверх списка.">
        <Cell
          before={<CellIcon color="var(--violet)"><Icon name="shield" size={20} /></CellIcon>}
          subtitle="На учителя, ученика или ситуацию"
          chevron
          onClick={() => setSheet("report")}
        >
          Анонимная жалоба
        </Cell>
      </Section>

      <Section header="Чат с учителем в MAX">
        {teachers.length === 0 ? (
          <Cell subtitle="Учитель добавит тебя в класс по нику">Пока ни один учитель не добавил тебя</Cell>
        ) : (
          teachers.map((teacher) => (
            <Cell
              key={teacher.id}
              before={<Avatar name={teacher.nickname} size={40} />}
              subtitle={teacher.maxLink ? "Откроется диалог в MAX" : "Учитель ещё не добавил профиль MAX"}
              after={
                <Button size="m" mode="secondary" disabled={!teacher.maxLink} onClick={() => teacher.maxLink && max.open(teacher.maxLink)}>
                  Написать
                </Button>
              }
            >
              {teacher.nickname}
            </Cell>
          ))
        )}
      </Section>

      {appointments.length > 0 && (
        <Section header="Мои записи">
          {appointments.map((item) => (
            <Cell
              key={item.id}
              before={<Avatar name={item.specialist.nickname} size={40} />}
              subtitle={`${item.topic} · ${formatMessageTime(item.createdAt)}`}
              after={<Badge tone={APPOINTMENT_STATUS[item.status].tone}>{APPOINTMENT_STATUS[item.status].label}</Badge>}
            >
              {item.specialist.nickname}
            </Cell>
          ))}
        </Section>
      )}

      {reports.length > 0 && (
        <Section header="Мои жалобы">
          {reports.map((item) => (
            <Cell
              key={item.id}
              before={<CellIcon color="var(--violet)"><Icon name="shield" size={20} /></CellIcon>}
              subtitle={`${item.recipient.nickname} · ${formatMessageTime(item.createdAt)}`}
              after={<Badge tone={REPORT_STATUS[item.status].tone}>{REPORT_STATUS[item.status].label}</Badge>}
            >
              {REPORT_SUBJECT[item.subjectKind]}
            </Cell>
          ))}
        </Section>
      )}

      {sheet && (
        <Sheet title={SHEET_TITLES[sheet]} onClose={() => setSheet(null)}>
          {sheet === "report" ? (
            <ReportForm onDone={() => finish("Жалоба отправлена. Спасибо, что не промолчал")} />
          ) : (
            <AppointmentForm student={user} role={sheet} onDone={() => finish("Готово! Специалист увидит запись и ответит")} />
          )}
        </Sheet>
      )}
    </Screen>
  );
};
