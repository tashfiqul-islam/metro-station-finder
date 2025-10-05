import type { Milliseconds } from "@/lib/types";

export type WindowLimiterStatus = {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Milliseconds;
  readonly isExceeded: boolean;
};

export function createWindowLimiter(
  limitPerWindow: number,
  windowMs: Milliseconds
) {
  let windowStart = Date.now();
  let used = 0;
  const resetIfNeeded = () => {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      used = 0;
    }
  };
  return {
    tryConsume(): boolean {
      resetIfNeeded();
      if (used >= limitPerWindow) {
        return false;
      }
      used += 1;
      return true;
    },
    status(): WindowLimiterStatus {
      resetIfNeeded();
      const remaining = Math.max(0, limitPerWindow - used);
      return {
        used,
        limit: limitPerWindow,
        remaining,
        resetTime: (windowStart + windowMs) as Milliseconds,
        isExceeded: used >= limitPerWindow,
      };
    },
  } as const;
}
