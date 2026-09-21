import type { User } from "../types";

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

export const AppHeader = ({ user, onLogout }: AppHeaderProps) => (
  <header className="app-header">
    <div className="brand">
      <span className="brand__mark" aria-hidden="true">CP</span>
      <div>
        <strong>Class Pulse</strong>
        <span>{user.role === "student" ? "Ученик" : "Учитель"} · {user.nickname}</span>
      </div>
    </div>
    <button className="button button--ghost button--small" type="button" onClick={onLogout}>
      Выйти
    </button>
  </header>
);
