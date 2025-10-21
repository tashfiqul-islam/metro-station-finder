/**
 * Real-User Monitoring (RUM) handler for Core Web Vitals.
 * Logs metrics in development; extend for production analytics.
 */
export function onPerfEntry(entry: { name: string; value: number; id: string; rating: string }) {
  if (!entry) {
    return;
  }

  const value = Math.round(entry.value);
  let emoji = "❌";
  if (entry.rating === "good") {
    emoji = "✅";
  } else if (entry.rating === "needs-improvement") {
    emoji = "⚠️";
  }

  // Log only in development
  if (process.env.NODE_ENV === "development") {
    console.info(`[Web Vitals] ${emoji} ${entry.name}: ${value}ms (${entry.rating})`);
  }

  // TODO: Send to analytics endpoint in production
  // if (process.env.NODE_ENV === 'production') {
  //   fetch('/api/metrics', {
  //     method: 'POST',
  //     body: JSON.stringify(entry),
  //     headers: { 'Content-Type': 'application/json' },
  //   }).catch(() => {});
  // }
}
