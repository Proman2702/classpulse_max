import { getAppointments, getReports } from "../../api/support";
import { useLoader } from "../../hooks/useLoader";

/** Обращения специалиста: записи и анонимные жалобы, адресованные ему. */
export const useInbox = (userId: string) => {
  const inbox = useLoader(async () => {
    const [appointments, reports] = await Promise.all([getAppointments(), getReports()]);
    return { appointments, reports };
  }, [userId]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void inbox.reload();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [inbox.reload]);

  const unread =
    (inbox.data?.appointments.filter((item) => item.status === "new").length ?? 0)
    + (inbox.data?.reports.filter((item) => item.status === "new").length ?? 0);

  return { ...inbox, unread };
};

export type Inbox = ReturnType<typeof useInbox>;
import { useEffect } from "react";
