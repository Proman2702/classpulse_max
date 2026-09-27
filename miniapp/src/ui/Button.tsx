import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Feedback";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  mode?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "m" | "l";
  stretched?: boolean;
  loading?: boolean;
  before?: ReactNode;
}

export const Button = ({
  mode = "primary",
  size = "l",
  stretched = false,
  loading = false,
  before,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cx("button", `button--${mode}`, `button--${size}`, stretched && "button--stretched", className)}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Spinner size={18} /> : before}
    {children}
  </button>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export const IconButton = ({ label, className, children, type = "button", ...props }: IconButtonProps) => (
  <button type={type} className={cx("icon-button", className)} aria-label={label} title={label} {...props}>
    {children}
  </button>
);
