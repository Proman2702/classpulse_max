import type { ReactNode } from "react";
import { cx } from "./cx";

export const Spinner = ({ size = 28 }: { size?: number }) => (
  <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Загрузка" />
);

export const ScreenSpinner = () => (
  <div className="screen-spinner">
    <Spinner />
  </div>
);

interface PlaceholderProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

/** Пустое состояние экрана или списка. */
export const Placeholder = ({ icon, title, children, action, compact }: PlaceholderProps) => (
  <div className={cx("placeholder", compact && "placeholder--compact")}>
    {icon && <div className="placeholder__icon">{icon}</div>}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

interface BannerProps {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}

export const Banner = ({ tone = "info", children }: BannerProps) => (
  <p className={cx("banner", `banner--${tone}`)} role={tone === "error" ? "alert" : "status"}>
    {children}
  </p>
);

interface BadgeProps {
  tone?: "accent" | "attention" | "unstable" | "stable" | "positive" | "neutral";
  children: ReactNode;
}

export const Badge = ({ tone = "neutral", children }: BadgeProps) => (
  <span className={cx("badge", `badge--${tone}`)}>{children}</span>
);
