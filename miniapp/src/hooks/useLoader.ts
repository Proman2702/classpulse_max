import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/errors";

interface LoaderState<T> {
  data: T | undefined;
  error: string;
  isLoading: boolean;
  /** Перезагрузить данные, не сбрасывая уже показанные. */
  reload: () => Promise<void>;
  /** Локально поправить данные, например после оптимистичного обновления. */
  setData: (update: (current: T | undefined) => T) => void;
}

/** Загружает данные при монтировании и при изменении зависимостей. */
export const useLoader = <T>(load: () => Promise<T>, deps: unknown[]): LoaderState<T> => {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const loadRef = useRef(load);
  const requestId = useRef(0);
  const isMounted = useRef(false);
  loadRef.current = load;

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError("");
    try {
      const result = await loadRef.current();
      if (isMounted.current && id === requestId.current) setDataState(result);
    } catch (loadError) {
      console.error(loadError);
      if (isMounted.current && id === requestId.current) setError(getErrorMessage(loadError, "Не удалось загрузить данные"));
    } finally {
      if (isMounted.current && id === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void reload();
    return () => { isMounted.current = false; requestId.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((update: (current: T | undefined) => T) => setDataState(update), []);

  return { data, error, isLoading, reload, setData };
};
