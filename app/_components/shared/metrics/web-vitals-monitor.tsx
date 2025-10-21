"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { onPerfEntry } from "@/lib/services/metrics/web-vitals";

/**
 * Client-side Web Vitals monitoring component.
 * Captures and reports Core Web Vitals metrics for real-user monitoring.
 */
export function WebVitalsMonitor() {
  useEffect(() => {
    onCLS(onPerfEntry);
    onINP(onPerfEntry);
    onLCP(onPerfEntry);
    onFCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }, []);

  return null;
}
