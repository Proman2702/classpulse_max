import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

interface HeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
}

export const Header = ({ title, subtitle, before, after }: HeaderProps) => (
  <header className="header">
    {before}
    <div className="header__text">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {after && <div className="header__after">{after}</div>}
  </header>
);

interface ScreenProps {
  header: ReactNode;
  footer?: ReactNode;
  tinted?: boolean;
  children: ReactNode;
}

/** Экран: шапка, прокручиваемое содержимое и необязательная нижняя панель. */
export const Screen = ({ header, footer, tinted = false, children }: ScreenProps) => (
  <div className={cx("screen", tinted && "screen--tinted")}>
    {header}
    <main className="screen__content">{children}</main>
    {footer && <div className="screen__footer">{footer}</div>}
  </div>
);

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: IconName;
  badge?: number;
}

interface TabBarProps<T extends string> {
  tabs: Array<Tab<T>>;
  active: T;
  onChange: (tab: T) => void;
}

export const TabBar = <T extends string>({ tabs, active, onChange }: TabBarProps<T>) => (
  <nav className="tabbar" aria-label="Разделы">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={cx("tabbar__item", tab.id === active && "tabbar__item--active")}
        aria-current={tab.id === active ? "page" : undefined}
        onClick={() => onChange(tab.id)}
      >
        <span className="tabbar__icon">
          <Icon name={tab.icon} size={26} />
          {Boolean(tab.badge) && <span className="tabbar__badge">{tab.badge}</span>}
        </span>
        {tab.label}
      </button>
    ))}
  </nav>
);
