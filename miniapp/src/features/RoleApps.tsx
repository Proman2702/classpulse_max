import { useState, type ReactNode } from "react";
import type { User } from "../types";
import { TabBar, type Tab } from "../ui";
import { InboxScreen } from "./inbox/InboxScreen";
import { useInbox } from "./inbox/useInbox";
import { ProfileScreen } from "./shared/ProfileScreen";
import { CheckinChat } from "./student/CheckinChat";
import { SupportScreen } from "./student/SupportScreen";
import { ClassScreen } from "./teacher/ClassScreen";

export interface RoleAppProps {
  user: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

interface TabbedAppProps<T extends string> {
  tabs: Array<Tab<T>>;
  active: T;
  onChange: (tab: T) => void;
  children: ReactNode;
}

const TabbedApp = <T extends string>({ tabs, active, onChange, children }: TabbedAppProps<T>) => (
  <div className="app">
    {children}
    <TabBar tabs={tabs} active={active} onChange={onChange} />
  </div>
);

export const StudentApp = (props: RoleAppProps) => {
  const [tab, setTab] = useState<"today" | "support" | "profile">("today");
  const [shouldOpenPsychologist, setShouldOpenPsychologist] = useState(false);
  return (
    <TabbedApp
      active={tab}
      onChange={(nextTab) => { setShouldOpenPsychologist(false); setTab(nextTab); }}
      tabs={[
        { id: "today", label: "Сегодня", icon: "chat" },
        { id: "support", label: "Поддержка", icon: "heart" },
        { id: "profile", label: "Профиль", icon: "profile" },
      ]}
    >
      {tab === "today" && <CheckinChat user={props.user} onOpenSupport={() => { setShouldOpenPsychologist(true); setTab("support"); }} />}
      {tab === "support" && <SupportScreen user={props.user} openPsychologist={shouldOpenPsychologist} />}
      {tab === "profile" && <ProfileScreen {...props} />}
    </TabbedApp>
  );
};

export const TeacherApp = (props: RoleAppProps) => {
  const [tab, setTab] = useState<"class" | "inbox" | "profile">("class");
  const inbox = useInbox(props.user.id);
  return (
    <TabbedApp
      active={tab}
      onChange={setTab}
      tabs={[
        { id: "class", label: "Класс", icon: "class" },
        { id: "inbox", label: "Обращения", icon: "inbox", badge: inbox.unread },
        { id: "profile", label: "Профиль", icon: "profile" },
      ]}
    >
      {tab === "class" && <ClassScreen user={props.user} />}
      {tab === "inbox" && <InboxScreen inbox={inbox} />}
      {tab === "profile" && <ProfileScreen {...props} />}
    </TabbedApp>
  );
};

export const PsychologistApp = (props: RoleAppProps) => {
  const [tab, setTab] = useState<"inbox" | "profile">("inbox");
  const inbox = useInbox(props.user.id);
  return (
    <TabbedApp
      active={tab}
      onChange={setTab}
      tabs={[
        { id: "inbox", label: "Обращения", icon: "inbox", badge: inbox.unread },
        { id: "profile", label: "Профиль", icon: "profile" },
      ]}
    >
      {tab === "inbox" && <InboxScreen inbox={inbox} />}
      {tab === "profile" && <ProfileScreen {...props} />}
    </TabbedApp>
  );
};
