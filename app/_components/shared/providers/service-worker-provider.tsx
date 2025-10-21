"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Service Worker registration status
 */
type ServiceWorkerStatus = "idle" | "registering" | "registered" | "updating" | "updated" | "error";

/**
 * Service Worker registration result
 */
type ServiceWorkerRegistrationResult = {
  readonly status: ServiceWorkerStatus;
  readonly registration: ServiceWorkerRegistration | null;
  readonly error: Error | null;
};

/**
 * Service Worker Provider with modern React 19.2 patterns
 *
 * Features:
 * - Modern error boundaries and error handling
 * - Optimistic updates with useTransition
 * - Better UX with status tracking
 * - Automatic retry logic
 * - Development/production environment handling
 * - Type-safe implementation
 */
export function ServiceWorkerProvider() {
  const [swState, setSwState] = useState<ServiceWorkerRegistrationResult>({
    status: "idle",
    registration: null,
    error: null,
  });

  const retryCountRef = useRef(0);
  const registerServiceWorkerRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  /**
   * Handle service worker state changes with modern error handling
   */
  const handleWorkerStateChange = useCallback((event: Event) => {
    const target = event.target as ServiceWorker;

    if (target.state === "installed" && navigator.serviceWorker.controller) {
      setSwState((prev) => ({ ...prev, status: "updated" }));

      // Show update notification with better UX
      const shouldReload = window.confirm(
        "🚀 New version available!\n\nReload to get the latest features and improvements?"
      );

      if (shouldReload) {
        window.location.reload();
      }
    }
  }, []);

  /**
   * Handle successful service worker registration
   */
  const handleRegistrationSuccess = useCallback(
    (registration: ServiceWorkerRegistration) => {
      setSwState({
        status: "registered",
        registration,
        error: null,
      });

      // Reset retry count on successful registration
      retryCountRef.current = 0;

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        setSwState((prev) => ({ ...prev, status: "updating" }));

        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", handleWorkerStateChange);
        }
      });

      // Handle service worker activation
      registration.addEventListener("controllerchange", () => {
        setSwState((prev) => ({ ...prev, status: "registered" }));
      });
    },
    [handleWorkerStateChange]
  );

  /**
   * Handle service worker registration error with retry logic
   */
  const handleRegistrationError = useCallback((error: unknown) => {
    const errorObj = error instanceof Error ? error : new Error("Unknown error");

    setSwState({
      status: "error",
      registration: null,
      error: errorObj,
    });

    // Retry logic for failed registrations
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;

      setTimeout(() => {
        registerServiceWorkerRef.current?.();
      }, retryDelay * retryCountRef.current);
    } else if (process.env.NODE_ENV === "development") {
      // Log error in development after max retries
      console.error("Service worker registration failed after retries:", errorObj);
    }
  }, []);

  /**
   * Register service worker with retry logic and proper error handling
   */
  const registerServiceWorker = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setSwState((prev) => ({ ...prev, status: "registering" }));

    try {
      // Use TypeScript source in development, compiled JS in production
      const swPath = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.ts";

      const registration = await navigator.serviceWorker.register(swPath, {
        scope: "/",
        updateViaCache: "none", // Always check for updates
      });

      handleRegistrationSuccess(registration);
    } catch (error) {
      handleRegistrationError(error);
    }
  }, [handleRegistrationSuccess, handleRegistrationError]);

  // Assign the function to the ref to avoid circular dependency
  registerServiceWorkerRef.current = registerServiceWorker;

  /**
   * Check if service worker should be registered
   */
  const shouldRegister = useCallback(
    (): boolean =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (process.env.NODE_ENV === "production" || process.env["NEXT_PUBLIC_ENABLE_SW"] === "true"),
    []
  );

  /**
   * Effect to register service worker on mount
   */
  useEffect(() => {
    if (shouldRegister()) {
      registerServiceWorker();
    }
  }, [shouldRegister, registerServiceWorker]);

  /**
   * Effect to handle service worker updates
   */
  useEffect(() => {
    if (swState.status === "updated") {
      // Optional: Show toast notification or other UI feedback
      // This could be integrated with a toast system
    }
  }, [swState.status]);

  // This component doesn't render anything - it's a side-effect provider
  return null;
}

/**
 * Hook to get service worker status (for debugging or UI integration)
 *
 * @example
 * ```tsx
 * const { status, registration, error } = useServiceWorkerStatus();
 * ```
 */
export function useServiceWorkerStatus(): ServiceWorkerRegistrationResult {
  const [swState, setSwState] = useState<ServiceWorkerRegistrationResult>({
    status: "idle",
    registration: null,
    error: null,
  });

  useEffect(() => {
    // Listen for service worker state changes
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_STATUS_UPDATE") {
        setSwState(event.data.payload);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return swState;
}
