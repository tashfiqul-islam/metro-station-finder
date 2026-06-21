import type { ReactNode } from "react";
import { Suspense, lazy, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface MapCanvasClientModule {
  MapCanvasClient: (props: MapCanvasProps) => React.ReactElement;
}

const loadMapCanvasClient = () => import("./map-canvas-client") as Promise<MapCanvasClientModule>;

const LazyMapCanvasClient = lazy(async () => {
  const module = await loadMapCanvasClient();
  return { default: module.MapCanvasClient };
});

export const warmMapCanvas = (): void => {
  void (async () => {
    try {
      await loadMapCanvasClient();
    } catch {
      // Best-effort preload only; ignore warm-up failures.
    }
  })();
};

interface MapCanvasProps {
  children?: ReactNode;
  className?: string;
  offline?: boolean;
}

type NetworkState = "offline" | "online" | "unknown";

const MapCanvasFallback = ({
  className,
  offline = false,
}: Omit<MapCanvasProps, "children">): React.ReactElement => (
  <div
    className={cn(
      "relative min-h-88 w-full overflow-hidden rounded-2xl border border-border bg-card/70",
      className,
    )}
  >
    <div className="absolute inset-0 animate-pulse bg-linear-to-br from-primary/6 via-transparent to-primary/10" />
    <div className="relative flex h-full min-h-88 items-center justify-center px-6 text-center">
      <div className="space-y-2">
        <p className="font-heading text-base font-semibold text-foreground">
          {offline ? "Offline - map unavailable" : "Loading map"}
        </p>
        <p className="text-sm text-muted-foreground">
          {offline
            ? "Reconnect to load the live corridor map."
            : "Preparing the MRT-6 corridor preview."}
        </p>
      </div>
    </div>
  </div>
);

export const MapCanvas = ({
  children,
  className,
  offline = false,
}: MapCanvasProps): React.ReactElement => {
  const [networkState, setNetworkState] = useState<NetworkState>("unknown");

  useEffect(() => {
    if (offline || typeof navigator === "undefined") {
      return;
    }

    const syncOfflineState = (): void => {
      setNetworkState(navigator.onLine ? "online" : "offline");
    };

    syncOfflineState();
    window.addEventListener("online", syncOfflineState);
    window.addEventListener("offline", syncOfflineState);
    window.addEventListener("pageshow", syncOfflineState);

    return () => {
      window.removeEventListener("online", syncOfflineState);
      window.removeEventListener("offline", syncOfflineState);
      window.removeEventListener("pageshow", syncOfflineState);
    };
  }, [offline]);

  if (offline || networkState === "offline") {
    return <MapCanvasFallback className={className} offline />;
  }

  if (networkState === "unknown") {
    return <MapCanvasFallback className={className} />;
  }

  return (
    <Suspense fallback={<MapCanvasFallback className={className} />}>
      <LazyMapCanvasClient className={className}>{children}</LazyMapCanvasClient>
    </Suspense>
  );
};
