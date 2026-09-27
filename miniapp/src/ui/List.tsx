import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

interface SectionProps {
  header?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  plain?: boolean;
  children: ReactNode;
}

/** Группа ячеек на белой карточке, как в настройках MAX. */
export const Section = ({ header, aside, footer, plain = false, children }: SectionProps) => (
  <section className="section">
    {(header || aside) && (
      <header className="section__header">
        <h2>{header}</h2>
        {aside}
      </header>
    )}
    <div className={cx(!plain && "section__card")}>{children}</div>
    {footer && <p className="section__footer">{footer}</p>}
  </section>
);

interface CellProps {
  before?: ReactNode;
  after?: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  danger?: boolean;
  children: ReactNode;
}

/** Строка списка: иконка или аватар, заголовок, подзаголовок и правая часть. */
export const Cell = ({ before, after, subtitle, extra, chevron, onClick, danger, children }: CellProps) => {
  const content = (
    <>
      {before && <span className="cell__before">{before}</span>}
      <span className="cell__body">
        <span className={cx("cell__title", danger && "cell__title--danger")}>{children}</span>
        {subtitle && <span className="cell__subtitle">{subtitle}</span>}
        {extra}
      </span>
      {after && <span className="cell__after">{after}</span>}
      {chevron && <Icon name="chevron" size={20} className="cell__chevron" />}
    </>
  );

  return onClick ? (
    <button type="button" className="cell cell--clickable" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="cell">{content}</div>
  );
};

/** Цветной квадрат с иконкой для ячеек-действий. */
export const CellIcon = ({ color, children }: { color: string; children: ReactNode }) => (
  <span className="cell-icon" style={{ background: color }}>
    {children}
  </span>
);
