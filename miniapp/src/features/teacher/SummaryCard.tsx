import { useState } from "react";
import { getClassSummary } from "../../api/ai";
import { getErrorMessage } from "../../lib/errors";
import { Banner, Button, Icon } from "../../ui";

/** Показывает ответ GigaChat: заголовки «### », пункты «- » и абзацы. */
const SummaryText = ({ text }: { text: string }) => (
  <div className="summary__text">
    {text.split("\n").map((raw, index) => {
      const line = raw.trim().replace(/\*\*/g, "");
      if (!line) return null;
      if (line.startsWith("#")) return <h4 key={index}>{line.replace(/^#+\s*/, "")}</h4>;
      if (/^[-•*]\s/.test(line)) return <p key={index} className="summary__item">{line.slice(2)}</p>;
      return <p key={index}>{line}</p>;
    })}
  </div>
);

export const SummaryCard = ({ answersToday }: { answersToday: number }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await getClassSummary();
      setSummary(result.summary ?? "Сегодня пока никто не ответил.");
    } catch (summaryError) {
      setError(getErrorMessage(summaryError, "Не удалось составить сводку"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article className="summary">
      <header className="summary__header">
        <span className="summary__icon"><Icon name="sparkle" size={22} /></span>
        <div>
          <h3>Сводка класса</h3>
          <p>GigaChat · по ответам без имён</p>
        </div>
      </header>

      {summary ? (
        <SummaryText text={summary} />
      ) : (
        <p className="summary__hint">
          {answersToday === 0
            ? "Как только ученики ответят, здесь можно будет получить короткую сводку дня."
            : "Выделю общее настроение, главные темы и трудности из сегодняшних ответов."}
        </p>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      <Button
        mode={summary ? "secondary" : "primary"}
        size="m"
        stretched
        loading={isLoading}
        disabled={answersToday === 0}
        before={summary ? <Icon name="refresh" size={18} /> : undefined}
        onClick={() => void generate()}
      >
        {isLoading ? "Читаю ответы…" : summary ? "Обновить сводку" : "Составить сводку"}
      </Button>
    </article>
  );
};
