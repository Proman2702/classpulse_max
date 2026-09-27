import { useEffect, useRef, type ReactNode } from "react";
import { max } from "../lib/max";
import { IconButton } from "./Button";
import { Icon } from "./Icon";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Нижняя шторка. Закрывается кнопкой, фоном, Esc и системной кнопкой «Назад» MAX. */
export const Sheet = ({ title, onClose, children }: SheetProps) => {
  const closeRef = useRef(onClose);
  const sheetRef = useRef<HTMLElement>(null);
  closeRef.current = onClose;

  useEffect(() => {
    const close = () => closeRef.current();
    const previousFocus = document.activeElement;
    const focusable = () => Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const unsubscribeBack = max.onBack(close);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      unsubscribeBack();
      document.body.classList.remove("no-scroll");
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <h2>{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <Icon name="close" size={22} />
          </IconButton>
        </header>
        <div className="sheet__content">{children}</div>
      </section>
    </div>
  );
};
