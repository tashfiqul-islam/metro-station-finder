import { useCallback, useMemo } from "react";
import type { z } from "zod";

/**
 * Synchronizes React state with URL query parameters using Zod validation.
 * Enables shareable URLs and preserves state across browser navigation.
 * Schema ensures type-safe parsing and serialization of query params.
 */

type ReadonlyRecord = Readonly<Record<string, string>>;

export function useQueryParamsState<T extends z.ZodTypeAny>(schema: T) {
  const parse = useCallback(() => {
    if (typeof window === "undefined") {
      return schema.parse({});
    }
    const params = new URLSearchParams(window.location.search);
    const obj: Record<string, unknown> = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    return schema.parse(obj);
  }, [schema]);

  const stringify = useCallback(
    (values: unknown) => {
      const parsed = schema.parse(values) as ReadonlyRecord;
      const next = new URLSearchParams();
      for (const [k, v] of Object.entries(parsed)) {
        if (v !== undefined && v !== "") {
          next.set(k, String(v));
        }
      }
      return `?${next.toString()}`;
    },
    [schema]
  );

  const set = useCallback(
    (values: unknown, options?: { replace?: boolean }) => {
      if (typeof window === "undefined") {
        return;
      }
      const qs = stringify(values);
      if (options?.replace) {
        window.history.replaceState(null, "", qs);
      } else {
        window.history.pushState(null, "", qs);
      }
    },
    [stringify]
  );

  return useMemo(
    () => ({ parse, set, stringify }) as const,
    [parse, set, stringify]
  );
}
