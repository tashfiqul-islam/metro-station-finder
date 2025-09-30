import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Debounces a value by delaying updates until the value has stopped changing for the specified delay.
 * Useful for reducing API calls or expensive computations triggered by rapid user input.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(
      () => setDebounced(value),
      delayMs as number
    );
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delayMs]);

  return debounced;
}

/**
 * Throttles a callback to execute at most once per interval.
 * Subsequent calls within the interval are ignored (rate limiting).
 */
export function useThrottledCallback<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number
): (...args: Args) => void {
  const lastRunRef = useRef<number>(0);
  return useMemo(
    () =>
      (...args: Args) => {
        const now = Date.now();
        if (now - lastRunRef.current >= (intervalMs as number)) {
          lastRunRef.current = now;
          callback(...args);
        }
      },
    [callback, intervalMs]
  );
}

/**
 * Debounces a callback, postponing execution until calls have stopped for the specified delay.
 * Each new call resets the timer.
 */
export function useDebouncedCallback<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const timerRef = useRef<number | undefined>(undefined);
  return useMemo(
    () =>
      (...args: Args) => {
        if (timerRef.current !== undefined) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(
          () => callback(...args),
          delayMs as number
        );
      },
    [callback, delayMs]
  );
}
