import type { ApiResponse, Milliseconds } from "@/lib/types";

export function success<T, E extends string = never>(
  data: T,
  processingTime: Milliseconds,
  version: string,
  extraMeta?: Record<string, unknown>
): ApiResponse<T, E> {
  return {
    success: true,
    data,
    meta: { processingTime, version, ...(extraMeta ?? {}) },
  } as ApiResponse<T, E>;
}

export function failure<T = never, E extends string = string>(
  code: E,
  message: string
): ApiResponse<T, E> {
  return { success: false, error: { code, message } } as ApiResponse<T, E>;
}
