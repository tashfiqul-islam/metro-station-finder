import type { Metric } from "web-vitals";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

const logMetric = (metric: Metric): void => {
  if (import.meta.env.DEV) {
    console.log("[Web Vitals]", metric);
  }
};

export const reportWebVitals = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  onCLS(logMetric);
  onFCP(logMetric);
  onINP(logMetric);
  onLCP(logMetric);
  onTTFB(logMetric);
};
