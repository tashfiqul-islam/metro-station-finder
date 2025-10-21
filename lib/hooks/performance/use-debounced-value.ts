import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Debounces a value by delaying updates until the value has stopped changing for the specified delay.
 * Optimized for performance with proper cleanup and modern React patterns.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setDebounced(value), delayMs);
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
        if (now - lastRunRef.current >= intervalMs) {
          lastRunRef.current = now;
          callback(...args);
        }
      },
    [callback, intervalMs]
  );
}

/**
 * Debounces a callback, postponing execution until calls have stopped for the specified delay.
 * Each new call resets the timer. Optimized with useCallback for better performance.
 */
export function useDebouncedCallback<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const timerRef = useRef<number | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Args) => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => callback(...args), delayMs);
    },
    [callback, delayMs]
  );

  return debouncedCallback;
}

/**
 * Modern search-optimized debounced value hook with immediate feedback
 * Perfect for search inputs where you want instant UI updates but debounced API calls
 */
export function useSearchDebouncedValue<T>(
  value: T,
  delayMs: number,
  options: {
    readonly immediate?: boolean;
    readonly minLength?: number;
  } = {}
): {
  readonly debouncedValue: T;
  readonly isDebouncing: boolean;
  readonly shouldSearch: boolean;
} {
  const { immediate = false, minLength = 0 } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }

    // Immediate update for UI feedback
    if (immediate) {
      setDebouncedValue(value);
    }

    // Check if we should search based on minLength
    const shouldSearch = typeof value === "string" ? value.length >= minLength : true;

    if (shouldSearch) {
      setIsDebouncing(true);
      timeoutRef.current = window.setTimeout(() => {
        setDebouncedValue(value);
        setIsDebouncing(false);
      }, delayMs);
    } else {
      setIsDebouncing(false);
    }

    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delayMs, immediate, minLength]);

  return {
    debouncedValue,
    isDebouncing,
    shouldSearch: typeof value === "string" ? value.length >= minLength : true,
  } as const;
}
