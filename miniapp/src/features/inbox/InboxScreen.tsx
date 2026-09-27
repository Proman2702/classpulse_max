import { useEffect, useState } from "react";
import { setAppointmentStatus, setReportStatus } from "../../api/support";
import { getErrorMessage } from "../../lib/errors";
import { formatMessageTime } from "../../lib/date";
import { APPOINTMENT_STATUS, REPORT_STATUS, REPORT_SUBJECT, SEVERITY } from "../../lib/labels";
import { max } from "../../lib/max";
import type { Appointment, AppointmentStatus, Report, ReportStatus } from "../../types";
import {
  Avatar, Badge, Banner, Button, Cell, CellIcon, Header, Icon, Placeholder, Screen, ScreenSpinner, Section,
  Segmented, Sheet,
} from "../../ui";
import type { Inbox } from "./useInbox";

type View = "appointments" | "reports";

export const InboxScreen = ({ inbox }: { inbox: Inbox }) => {
  const [view, setView] = useState<View>("appointments");
  const [openAppointment, setOpenAppointment] = useState<Appointment | null>(null);
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { void inbox.reload(); }, [inbox.reload]);

  const appointments = inbox.data?.appointments ?? [];
  const reports = inbox.data?.reports ?? [];

  const changeAppointment = async (item: Appointment, status: AppointmentStatus) => {
    setError("");
    setIsUpdating(true);
    try {
      await setAppointmentStatus(item.id, status);
      max.success();
      setOpenAppointment(null);
      await inbox.reload();
    } catch (changeError) {
      setError(getErrorMessage(changeError));
    } finally {
      setIsUpdating(false);
    }
  };

  const changeReport = async (item: Report, status: ReportStatus) => {
    setError("");
    setIsUpdating(true);
    try {
      await setReportStatus(item.id, status);
      setOpenReport((current) => current?.id === item.id ? { ...current, status } : current);
      await inbox.reload();
      return true;
    } catch (changeError) {
      setError(getErrorMessage(changeError));
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const showReport = (item: Report) => {
    setOpenReport(item);
    if (item.status === "new") void changeReport(item, "read");
  };

  const newCount = (items: Array<{ status: string }>) => items.filter((item) => item.status === "new").length;
  const counter = (count: number) => (count ? ` · ${count}` : "");

  return (
    <Screen header={<Header title="Обращения" subtitle="Записи на разговор и анонимные жалобы" />}>
      <div className="toolbar">
        <Segmented
          label="Тип обращений"
          value={view}
          onChange={setView}
          options={[
            { value: "appointments", label: `Записи${counter(newCount(appointments))}` },
            { value: "reports", label: `Жалобы${counter(newCount(reports))}` },
          ]}
        />
      </div>
      {(error || inbox.error) && <Banner tone="error">{error || inbox.error}</Banner>}

      {inbox.isLoading ? (
        <ScreenSpinner />
      ) : view === "appointments" ? (
        appointments.length === 0 ? (
          <Placeholder icon={<Icon name="calendar" size={36} />} title="Записей пока нет">
            Когда ученик запишется на разговор, запись появится здесь.
          </Placeholder>
        ) : (
          <Section>
            {appointments.map((item) => (
              <Cell
                key={item.id}
                before={<Avatar name={item.student.nickname} size={44} />}
                subtitle={item.topic}
                extra={item.preferredTime && <span className="cell__meta">🕒 {item.preferredTime}</span>}
                after={
                  <span className="cell__stack">
                    <time>{formatMessageTime(item.createdAt)}</time>
                    <Badge tone={APPOINTMENT_STATUS[item.status].tone}>{APPOINTMENT_STATUS[item.status].label}</Badge>
                  </span>
                }
                onClick={() => setOpenAppointment(item)}
              >
                {item.student.nickname}
              </Cell>
            ))}
          </Section>
        )
      ) : reports.length === 0 ? (
        <Placeholder icon={<Icon name="shield" size={36} />} title="Жалоб нет">
          Анонимные жалобы учеников появятся здесь. Срочные — наверху.
        </Placeholder>
      ) : (
        <Section footer="Автор жалобы скрыт: база данных не отдаёт его даже получателю.">
          {reports.map((item) => (
            <Cell
              key={item.id}
              before={<CellIcon color="var(--violet)"><Icon name="shield" size={20} /></CellIcon>}
              subtitle={<span className="line-clamp">{item.message}</span>}
              after={
                <span className="cell__stack">
                  <time>{formatMessageTime(item.createdAt)}</time>
                  {item.status === "new"
                    ? <Badge tone={SEVERITY[item.severity].tone}>{SEVERITY[item.severity].label}</Badge>
                    : <Badge tone={REPORT_STATUS[item.status].tone}>{REPORT_STATUS[item.status].label}</Badge>}
                </span>
              }
              onClick={() => showReport(item)}
            >
              {REPORT_SUBJECT[item.subjectKind]}{item.subjectName ? `: ${item.subjectName}` : ""}
            </Cell>
          ))}
        </Section>
      )}

      {openAppointment && (
        <Sheet title="Запись на разговор" onClose={() => setOpenAppointment(null)}>
          {error && <Banner tone="error">{error}</Banner>}
          <div className="detail-hero">
            <Avatar name={openAppointment.student.nickname} size={64} />
            <h3>{openAppointment.student.nickname}</h3>
            <Badge tone={APPOINTMENT_STATUS[openAppointment.status].tone}>
              {APPOINTMENT_STATUS[openAppointment.status].label}
            </Badge>
          </div>
          <div className="quote">{openAppointment.topic}</div>
          {openAppointment.preferredTime && <p className="muted">Удобное время: {openAppointment.preferredTime}</p>}
          <div className="actions">
            {openAppointment.status === "new" && (
              <>
                <Button stretched loading={isUpdating} onClick={() => void changeAppointment(openAppointment, "accepted")}>Принять</Button>
                <Button stretched mode="secondary" disabled={isUpdating} onClick={() => void changeAppointment(openAppointment, "declined")}>
                  Отклонить
                </Button>
              </>
            )}
            {openAppointment.status === "accepted" && (
              <Button stretched loading={isUpdating} onClick={() => void changeAppointment(openAppointment, "done")}>Разговор состоялся</Button>
            )}
            {openAppointment.student.maxLink && (
              <Button
                stretched
                mode="secondary"
                before={<Icon name="chat" size={20} />}
                onClick={() => max.open(openAppointment.student.maxLink!)}
              >
                Написать в MAX
              </Button>
            )}
          </div>
        </Sheet>
      )}

      {openReport && (
        <Sheet title="Анонимная жалоба" onClose={() => setOpenReport(null)}>
          {error && <Banner tone="error">{error}</Banner>}
          <div className="tags">
            <Badge tone={SEVERITY[openReport.severity].tone}>{SEVERITY[openReport.severity].label}</Badge>
            <Badge>{REPORT_SUBJECT[openReport.subjectKind]}</Badge>
            <span className="muted">{formatMessageTime(openReport.createdAt)}</span>
          </div>
          {openReport.subjectName && <p className="muted">О ком: {openReport.subjectName}</p>}
          <div className="quote">{openReport.message}</div>
          <p className="muted small">Срочность оценил GigaChat. Это подсказка, а не вывод: решение за вами.</p>
          <div className="actions">
            {openReport.status !== "resolved" ? (
              <Button stretched loading={isUpdating} before={<Icon name="check" size={20} />} onClick={async () => {
                if (await changeReport(openReport, "resolved")) setOpenReport(null);
              }}>
                Отметить решённой
              </Button>
            ) : (
              <Banner tone="success">Жалоба отмечена как решённая</Banner>
            )}
          </div>
        </Sheet>
      )}
    </Screen>
  );
};
