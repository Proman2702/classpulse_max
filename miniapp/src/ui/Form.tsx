import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export const Field = ({ label, hint, children }: FieldProps) => {
  const labelId = useId();
  const isInput = isValidElement(children) && (children.type === Input || children.type === Textarea);
  const control = isInput && isValidElement<{ "aria-labelledby"?: string }>(children)
    ? cloneElement(children, { "aria-labelledby": labelId })
    : children;
  // A label around several buttons changes the accessible name of the first one.
  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <span className="field__label" id={labelId}>{label}</span>
      {control}
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
};

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cx("input", className)} {...props} />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cx("input", "input--multiline", className)} {...props} />
);

interface ChipProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export const Chip = ({ active = false, onClick, children }: ChipProps) => (
  <button type="button" className={cx("chip", active && "chip--active")} aria-pressed={active} onClick={onClick}>
    {children}
  </button>
);

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}

/** Переключатель из нескольких вариантов в одну строку. */
export const Segmented = <T extends string>({ value, options, onChange, label }: SegmentedProps<T>) => (
  <div className="segmented" role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        className={cx("segmented__option", option.value === value && "segmented__option--active")}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
