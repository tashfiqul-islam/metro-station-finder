"use client";

import type { MarkerOptions, PopupOptions } from "maplibre-gl";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Feature as GeoJsonFeature,
  FeatureCollection,
  GeoJsonProperties,
  LineString,
  Point,
} from "geojson";
import type { ReactNode } from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Locate, Maximize, Minus, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark";

const getDocumentTheme = (): Theme | null => {
  if (typeof document === "undefined") {
    return null;
  }
  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  if (document.documentElement.classList.contains("light")) {
    return "light";
  }
  return null;
};

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const useResolvedTheme = (themeProp?: "light" | "dark"): Theme => {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme(),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Map instance is created once on mount.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Map instance is created once on mount.
  useEffect(() => {
    if (themeProp) {
      return;
    }

    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) {
        setDetectedTheme(docTheme);
      }
    });
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!getDocumentTheme()) {
        setDetectedTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
};

interface MapContextValue {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
}

const MapContext = createContext<MapContextValue | null>(null);

const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
};

/** Map viewport state */
interface MapViewport {
  /** Center coordinates [longitude, latitude] */
  center: [number, number];
  /** Zoom level */
  zoom: number;
  /** Bearing (rotation) in degrees */
  bearing: number;
  /** Pitch (tilt) in degrees */
  pitch: number;
}

type MapStyleOption = string | MapLibreGL.StyleSpecification;

type MapRef = MapLibreGL.Map;

type MapProps = {
  children?: ReactNode;
  /** Additional CSS classes for the map container */
  className?: string;
  /**
   * Theme for the map. If not provided, automatically detects system preference.
   * Pass your theme value here.
   */
  theme?: Theme;
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
  /** Map projection type. Use `{ type: "globe" }` for 3D globe view. */
  projection?: MapLibreGL.ProjectionSpecification;
  /**
   * Controlled viewport. When provided with onViewportChange,
   * the map becomes controlled and viewport is driven by this prop.
   */
  viewport?: Partial<MapViewport>;
  /**
   * Callback fired continuously as the viewport changes (pan, zoom, rotate, pitch).
   * Can be used standalone to observe changes, or with `viewport` prop
   * to enable controlled mode where the map viewport is driven by your state.
   */
  onViewportChange?: (viewport: MapViewport) => void;
  /** Show a loading indicator on the map */
  loading?: boolean;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

const DefaultLoader = (): React.ReactElement => (
  <div className="bg-background/50 pointer-events-none absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
    <div className="flex gap-1">
      <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full" />
      <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
      <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
    </div>
  </div>
);

const getViewport = (map: MapLibreGL.Map): MapViewport => {
  const center = map.getCenter();
  return {
    bearing: map.getBearing(),
    center: [center.lng, center.lat],
    pitch: map.getPitch(),
    zoom: map.getZoom(),
  };
};

const Map = forwardRef<MapRef, MapProps>(
  (
    {
      children,
      className,
      theme: themeProp,
      styles,
      projection,
      viewport,
      onViewportChange,
      loading = false,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isStyleLoaded, setIsStyleLoaded] = useState(false);
    const currentStyleRef = useRef<MapStyleOption | null>(null);
    const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const internalUpdateRef = useRef(false);
    const resolvedTheme = useResolvedTheme(themeProp);

    const isControlled = viewport !== undefined && onViewportChange !== undefined;

    const onViewportChangeRef = useRef(onViewportChange);
    onViewportChangeRef.current = onViewportChange;

    const mapStyles = useMemo(
      () => ({
        dark: styles?.dark ?? defaultStyles.dark,
        light: styles?.light ?? defaultStyles.light,
      }),
      [styles],
    );

    useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

    const clearStyleTimeout = useCallback(() => {
      if (styleTimeoutRef.current) {
        clearTimeout(styleTimeoutRef.current);
        styleTimeoutRef.current = null;
      }
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Map instance is created once on mount.
    }, []);

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const initialStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
      currentStyleRef.current = initialStyle;

      const map = new MapLibreGL.Map({
        attributionControl: {
          compact: true,
        },
        container: containerRef.current,
        renderWorldCopies: false,
        style: initialStyle,
        ...props,
        ...viewport,
      });

      const styleDataHandler = () => {
        clearStyleTimeout();
        styleTimeoutRef.current = setTimeout(() => {
          setIsStyleLoaded(true);
          if (projection) {
            map.setProjection(projection);
          }
        }, 100);
      };
      const loadHandler = () => setIsLoaded(true);

      const handleMove = () => {
        if (internalUpdateRef.current) {
          return;
        }

        onViewportChangeRef.current?.(getViewport(map));
      };

      map.on("load", loadHandler);
      map.on("styledata", styleDataHandler);
      map.on("move", handleMove);
      setMapInstance(map);

      return () => {
        clearStyleTimeout();
        map.off("load", loadHandler);
        map.off("styledata", styleDataHandler);
        map.off("move", handleMove);
        map.remove();
        setIsLoaded(false);
        setIsStyleLoaded(false);
        setMapInstance(null);
      };
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Marker instance is created once and synced separately.
    }, []);

    useEffect(() => {
      if (!mapInstance || !isControlled || !viewport) {
        return;
      }

      if (mapInstance.isMoving()) {
        return;
      }

      const current = getViewport(mapInstance);
      const next = {
        bearing: viewport.bearing ?? current.bearing,
        center: viewport.center ?? current.center,
        pitch: viewport.pitch ?? current.pitch,
        zoom: viewport.zoom ?? current.zoom,
      };

      if (
        next.center[0] === current.center[0] &&
        next.center[1] === current.center[1] &&
        next.zoom === current.zoom &&
        next.bearing === current.bearing &&
        next.pitch === current.pitch
      ) {
        return;
      }

      internalUpdateRef.current = true;
      mapInstance.jumpTo(next);
      internalUpdateRef.current = false;
    }, [mapInstance, isControlled, viewport]);

    useEffect(() => {
      if (!mapInstance || !resolvedTheme) {
        return;
      }

      const newStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

      if (currentStyleRef.current === newStyle) {
        return;
      }

      clearStyleTimeout();
      currentStyleRef.current = newStyle;
      setIsStyleLoaded(false);

      mapInstance.setStyle(newStyle, { diff: true });
    }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]);

    useEffect(() => {
      if (!mapInstance || !isStyleLoaded || !projection) {
        return;
      }

      mapInstance.setProjection(projection);
    }, [mapInstance, isStyleLoaded, projection]);

    const contextValue = useMemo(
      () => ({
        isLoaded: isLoaded && isStyleLoaded,
        map: mapInstance,
      }),
      [mapInstance, isLoaded, isStyleLoaded],
    );

    return (
      <MapContext.Provider value={contextValue}>
        <div ref={containerRef} className={cn("relative h-full w-full", className)}>
          {(!isLoaded || loading) && <DefaultLoader />}
          {mapInstance && children}
        </div>
      </MapContext.Provider>
    );
  },
);

interface MarkerContextValue {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
}

const MarkerContext = createContext<MarkerContextValue | null>(null);

const useMarkerContext = () => {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
};

type MapMarkerProps = {
  /** Longitude coordinate for marker position */
  longitude: number;
  /** Latitude coordinate for marker position */
  latitude: number;
  /** Marker subcomponents (MarkerContent, MarkerPopup, MarkerTooltip, MarkerLabel) */
  children: ReactNode;
  /** Callback when marker is clicked */
  onClick?: (e: MouseEvent) => void;
  /** Callback when mouse enters marker */
  onMouseEnter?: (e: MouseEvent) => void;
  /** Callback when mouse leaves marker */
  onMouseLeave?: (e: MouseEvent) => void;
  /** Callback when marker drag starts (requires draggable: true) */
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback during marker drag (requires draggable: true) */
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback when marker drag ends (requires draggable: true) */
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

const MapMarker = ({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps): React.ReactElement => {
  const { map } = useMap();

  const callbacksRef = useRef({
    onClick,
    onDrag,
    onDragEnd,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
  });
  callbacksRef.current = {
    onClick,
    onDrag,
    onDragEnd,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Marker instance is created once and synced separately.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Marker instance is created once and synced separately.
  const marker = useMemo(() => {
    const markerInstance = new MapLibreGL.Marker({
      ...markerOptions,
      draggable,
      element: document.createElement("div"),
    }).setLngLat([longitude, latitude]);

    const handleClick = (e: MouseEvent) => callbacksRef.current.onClick?.(e);
    const handleMouseEnter = (e: MouseEvent) => callbacksRef.current.onMouseEnter?.(e);
    const handleMouseLeave = (e: MouseEvent) => callbacksRef.current.onMouseLeave?.(e);

    markerInstance.getElement()?.addEventListener("click", handleClick);
    markerInstance.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    markerInstance.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    const handleDragStart = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragStart?.({ lat: lngLat.lat, lng: lngLat.lng });
    };
    const handleDrag = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDrag?.({ lat: lngLat.lat, lng: lngLat.lng });
    };
    const handleDragEnd = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lat: lngLat.lat, lng: lngLat.lng });
    };

    markerInstance.on("dragstart", handleDragStart);
    markerInstance.on("drag", handleDrag);
    markerInstance.on("dragend", handleDragEnd);

    return markerInstance;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Marker attach lifecycle follows map mount lifecycle.
  }, []);

  useEffect(() => {
    if (!map) {
      return;
    }

    marker.addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, marker]);

  const { offset, rotation, rotationAlignment, pitchAlignment } = markerOptions;

  useEffect(() => {
    const current = marker.getLngLat();
    if (current.lng !== longitude || current.lat !== latitude) {
      marker.setLngLat([longitude, latitude]);
    }

    if (marker.isDraggable() !== draggable) {
      marker.setDraggable(draggable);
    }

    const currentOffset = marker.getOffset();
    const newOffset = offset ?? [0, 0];
    const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
      ? newOffset
      : [newOffset.x, newOffset.y];
    if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
      marker.setOffset(newOffset);
    }

    if (marker.getRotation() !== (rotation ?? 0)) {
      marker.setRotation(rotation ?? 0);
    }
    if (marker.getRotationAlignment() !== (rotationAlignment ?? "auto")) {
      marker.setRotationAlignment(rotationAlignment ?? "auto");
    }
    if (marker.getPitchAlignment() !== (pitchAlignment ?? "auto")) {
      marker.setPitchAlignment(pitchAlignment ?? "auto");
    }
  }, [marker, longitude, latitude, draggable, offset, rotation, rotationAlignment, pitchAlignment]);

  return <MarkerContext.Provider value={{ map, marker }}>{children}</MarkerContext.Provider>;
};

const DefaultMarkerIcon = (): React.ReactElement => (
  <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
);

interface MarkerContentProps {
  /** Custom marker content. Defaults to a blue dot if not provided */
  children?: ReactNode;
  /** Additional CSS classes for the marker container */
  className?: string;
}

const MarkerContent = ({ children, className }: MarkerContentProps): React.ReactElement => {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement(),
  );
};

const PopupCloseButton = ({ onClick }: { onClick: () => void }): React.ReactElement => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Close popup"
    className="focus-visible:ring-ring hover:bg-muted text-foreground absolute top-1 right-1 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
  >
    <X className="size-3.5" />
  </button>
);

type MarkerPopupProps = {
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

const MarkerPopup = ({
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MarkerPopupProps): React.ReactElement => {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const { offset, maxWidth } = popupOptions;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      closeButton: false,
      offset: 16,
      ...popupOptions,
    })
      .setMaxWidth("none")
      .setDOMContent(container);

    return popupInstance;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Marker popup wiring should track map mount lifecycle only.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Marker popup wiring should track map mount lifecycle only.
  useEffect(() => {
    if (!map) {
      return;
    }

    popup.setDOMContent(container);
    marker.setPopup(popup);

    return () => {
      marker.setPopup(null);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Marker popup wiring should track map mount lifecycle only.
  }, [map]);

  useEffect(() => {
    popup.setOffset(offset ?? 16);
    if (maxWidth) {
      popup.setMaxWidth(maxWidth);
    }
  }, [popup, offset, maxWidth]);

  const handleClose = () => popup.remove();

  return createPortal(
    <div
      className={cn(
        "bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container,
  );
};

type MarkerTooltipProps = {
  /** Tooltip content */
  children: ReactNode;
  /** Additional CSS classes for the tooltip container */
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

/* v8 ignore start -- Unused registry extras retained from generated mapcn source. Remove this block-level coverage ignore when this repo first edits or relies on these exports in product code. */
const MarkerTooltip = ({
  children,
  className,
  ...popupOptions
}: MarkerTooltipProps): React.ReactElement => {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const { offset, maxWidth } = popupOptions;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Tooltip instance is created once and updated via effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Tooltip instance is created once and updated via effects.
  const tooltip = useMemo(() => {
    const tooltipInstance = new MapLibreGL.Popup({
      closeButton: false,
      closeOnClick: true,
      offset: 16,
      ...popupOptions,
    }).setMaxWidth("none");

    return tooltipInstance;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Tooltip instance is created once and updated via effects.
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Tooltip wiring should track map mount lifecycle only.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Tooltip wiring should track map mount lifecycle only.
  useEffect(() => {
    if (!map) {
      return;
    }

    tooltip.setDOMContent(container);

    const handleMouseEnter = () => {
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    };
    const handleMouseLeave = () => tooltip.remove();

    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Tooltip wiring should track map mount lifecycle only.
  }, [map]);

  useEffect(() => {
    tooltip.setOffset(offset ?? 16);
    if (maxWidth) {
      tooltip.setMaxWidth(maxWidth);
    }
  }, [tooltip, offset, maxWidth]);

  return createPortal(
    <div
      className={cn(
        "bg-foreground text-background pointer-events-none rounded-md px-2 py-1 text-xs text-balance shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {children}
    </div>,
    container,
  );
};

interface MarkerLabelProps {
  /** Label text content */
  children: ReactNode;
  /** Additional CSS classes for the label */
  className?: string;
  /** Position of the label relative to the marker (default: "top") */
  position?: "top" | "bottom";
}

const MarkerLabel = ({
  children,
  className,
  position = "top",
}: MarkerLabelProps): React.ReactElement => {
  const positionClasses = {
    bottom: "top-full mt-1",
    top: "bottom-full mb-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
        "text-foreground text-[10px] font-medium",
        positionClasses[position],
        className,
      )}
    >
      {children}
    </div>
  );
};
/* v8 ignore stop -- Unused registry extras retained from generated mapcn source. Remove this block-level coverage ignore when this repo first edits or relies on these exports in product code. */

interface MapControlsProps {
  /** Position of the controls on the map (default: "bottom-right") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show zoom in/out buttons (default: true) */
  showZoom?: boolean;
  /** Show compass button to reset bearing (default: false) */
  showCompass?: boolean;
  /** Show locate button to find user's location (default: false) */
  showLocate?: boolean;
  /** Show fullscreen toggle button (default: false) */
  showFullscreen?: boolean;
  /** Additional CSS classes for the controls container */
  className?: string;
  /** Callback with user coordinates when located */
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
}

const positionClasses = {
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
};

const ControlGroup = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <div className="border-border bg-background [&>button:not(:last-child)]:border-border flex flex-col overflow-hidden rounded-md border shadow-sm [&>button:not(:last-child)]:border-b">
    {children}
  </div>
);

const ControlButton = ({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}): React.ReactElement => (
  <button
    onClick={onClick}
    aria-label={label}
    type="button"
    className={cn(
      "flex size-8 items-center justify-center transition-all",
      "first:rounded-t-md last:rounded-b-md",
      "hover:bg-accent dark:hover:bg-accent/40",
      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
      "disabled:pointer-events-none disabled:opacity-50",
    )}
    disabled={disabled}
  >
    {children}
  </button>
);

const CompassButton = ({ onClick }: { onClick: () => void }): React.ReactElement => {
  const { map } = useMap();
  const compassRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!map || !compassRef.current) {
      return;
    }

    const compass = compassRef.current;

    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();

    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [map]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing to north">
      <svg
        ref={compassRef}
        viewBox="0 0 24 24"
        className="size-5 transition-transform duration-200"
        style={{ transformStyle: "preserve-3d" }}
      >
        <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
        <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
        <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
        <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
      </svg>
    </ControlButton>
  );
};

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation is not available in this browser.");
  }

  // eslint-disable-next-line promise/avoid-new -- Geolocation API is callback-only.
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

const MapControls = ({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps): React.ReactElement => {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const handleResetBearing = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  const handleLocate = useCallback(async () => {
    setWaitingForLocation(true);
    try {
      const geoPosition = await getCurrentPosition();
      const coords = {
        latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
      };

      map?.flyTo({
        center: [coords.longitude, coords.latitude],
        duration: 1500,
        zoom: 14,
      });
      onLocate?.(coords);
    } catch (error) {
      console.error("Error getting location:", error);
    } finally {
      setWaitingForLocation(false);
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  return (
    <div
      className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}
    >
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <Plus className="size-4" />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <Minus className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
      {showCompass && (
        <ControlGroup>
          <CompassButton onClick={handleResetBearing} />
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton
            onClick={handleLocate}
            label="Find my location"
            disabled={waitingForLocation}
          >
            {waitingForLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Locate className="size-4" />
            )}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <Maximize className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
};

type MapPopupProps = {
  /** Longitude coordinate for popup position */
  longitude: number;
  /** Latitude coordinate for popup position */
  latitude: number;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

/* v8 ignore start -- Unused registry extras retained from generated mapcn source. Remove this block-level coverage ignore when this repo first edits or relies on these exports in product code. */
const MapPopup = ({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps): React.ReactElement => {
  const { map } = useMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement("div"), []);
  const { offset, maxWidth } = popupOptions;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      closeButton: false,
      offset: 16,
      ...popupOptions,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude]);

    return popupInstance;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup instance is created once and updated via effects.
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Popup lifecycle follows map mount lifecycle.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup lifecycle follows map mount lifecycle.
  useEffect(() => {
    if (!map) {
      return;
    }

    const onCloseProp = () => onCloseRef.current?.();

    popup.on("close", onCloseProp);

    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off("close", onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Popup lifecycle follows map mount lifecycle.
  }, [map]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  useEffect(() => {
    const current = popup.getLngLat();
    if (!current || current.lng !== longitude || current.lat !== latitude) {
      popup.setLngLat([longitude, latitude]);
    }
    popup.setOffset(offset ?? 16);
    if (maxWidth) {
      popup.setMaxWidth(maxWidth);
    }
  }, [popup, longitude, latitude, offset, maxWidth]);

  const handleClose = () => {
    popup.remove();
  };

  return createPortal(
    <div
      className={cn(
        "bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container,
  );
};

interface MapRouteProps {
  /** Optional unique identifier for the route layer */
  id?: string;
  /** Array of [longitude, latitude] coordinate pairs defining the route */
  coordinates: [number, number][];
  /** Line color as CSS color value (default: "#4285F4") */
  color?: string;
  /** Line width in pixels (default: 3) */
  width?: number;
  /** Line opacity from 0 to 1 (default: 0.8) */
  opacity?: number;
  /** Dash pattern [dash length, gap length] for dashed lines */
  dashArray?: [number, number];
  /** Callback when the route line is clicked */
  onClick?: () => void;
  /** Callback when mouse enters the route line */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves the route line */
  onMouseLeave?: () => void;
  /** Whether the route is interactive - shows pointer cursor on hover (default: true) */
  interactive?: boolean;
}

const MapRoute = ({
  id: propId,
  coordinates,
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps): null => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }

    map.addSource(sourceId, {
      data: {
        geometry: { coordinates: [], type: "LineString" },
        properties: {},
        type: "Feature",
      },
      type: "geojson",
    });

    map.addLayer({
      id: layerId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": color,
        "line-opacity": opacity,
        "line-width": width,
        ...(dashArray && { "line-dasharray": dashArray }),
      },
      source: sourceId,
      type: "line",
    });

    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // ignore
      }
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  }, [isLoaded, map]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) {
      return;
    }

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData({
        geometry: { coordinates, type: "LineString" },
        properties: {},
        type: "Feature",
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) {
      return;
    }

    map.setPaintProperty(layerId, "line-color", color);
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    map.setPaintProperty(layerId, "line-dasharray", dashArray);
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive) {
      return;
    }

    const handleClick = () => {
      onClick?.();
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
      onMouseEnter?.();
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      onMouseLeave?.();
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [isLoaded, map, layerId, onClick, onMouseEnter, onMouseLeave, interactive]);

  return null;
};

/** A single arc to render inside <MapArc data={...}>. */
interface MapArcDatum {
  /** Unique identifier for this arc. Required for hover state tracking and event payloads. */
  id: string | number;
  /** Start coordinate as [longitude, latitude]. */
  from: [number, number];
  /** End coordinate as [longitude, latitude]. */
  to: [number, number];
}

/** Event payload passed to MapArc interaction callbacks. */
interface MapArcEvent<T extends MapArcDatum = MapArcDatum> {
  /** The arc datum that was hovered or clicked. */
  arc: T;
  /** Longitude of the cursor at the time of the event. */
  longitude: number;
  /** Latitude of the cursor at the time of the event. */
  latitude: number;
  /** The underlying MapLibre mouse event for advanced use cases. */
  originalEvent: MapLibreGL.MapMouseEvent;
}

type MapArcLinePaint = NonNullable<MapLibreGL.LineLayerSpecification["paint"]>;
type MapArcLineLayout = NonNullable<MapLibreGL.LineLayerSpecification["layout"]>;

interface MapArcProps<T extends MapArcDatum = MapArcDatum> {
  /** Array of arcs to render. Each arc must have a unique `id`. */
  data: T[];
  /** Optional unique identifier prefix for the arc source/layers. Auto-generated if not provided. */
  id?: string;
  /**
   * How far each arc bows away from a straight line. `0` renders straight
   * lines; higher values bend further. Negative values bend to the opposite
   * side. Arcs are computed as a quadratic Bézier in lng/lat space; the
   * destination longitude is unwrapped relative to the origin so that arcs
   * cross the antimeridian via the shorter great-circle direction. (default: 0.2)
   */
  curvature?: number;
  /** Number of samples used to render each curve. Higher = smoother. (default: 64) */
  samples?: number;
  /**
   * MapLibre paint properties for the arc layer. Merged on top of sensible
   * defaults (`line-color: #4285F4`, `line-width: 2`, `line-opacity: 0.85`).
   * Any value can be a MapLibre expression for per-feature styling, every
   * field on each arc datum (besides `from`/`to`) is exposed via `["get", ...]`.
   */
  paint?: MapArcLinePaint;
  /** MapLibre layout properties for the arc layer. Defaults to rounded joins/caps. */
  layout?: MapArcLineLayout;
  /**
   * Paint properties applied to the arc currently under the cursor. Each key
   * is merged into `paint` as a `case` expression keyed on per-feature hover
   * state, so only the hovered arc changes appearance.
   */
  hoverPaint?: MapArcLinePaint;
  /** Callback when an arc is clicked. */
  onClick?: (e: MapArcEvent<T>) => void;
  /**
   * Callback fired when the hovered arc changes. Receives the cursor's
   * lng/lat at the moment of entry, and `null` when the cursor leaves the
   * last hovered arc.
   */
  onHover?: (e: MapArcEvent<T> | null) => void;
  /** Whether arcs respond to mouse events (default: true). */
  interactive?: boolean;
  /** Optional MapLibre layer id to insert the arc layers before (z-order control). */
  beforeId?: string;
}

const DEFAULT_ARC_CURVATURE = 0.2;
const DEFAULT_ARC_SAMPLES = 64;
const ARC_HIT_MIN_WIDTH = 12;
const ARC_HIT_PADDING = 6;

const DEFAULT_ARC_PAINT: MapArcLinePaint = {
  "line-color": "#4285F4",
  "line-opacity": 0.85,
  "line-width": 2,
};

const DEFAULT_ARC_LAYOUT: MapArcLineLayout = {
  "line-cap": "round",
  "line-join": "round",
};

const mergeArcPaint = (
  paint: MapArcLinePaint,
  hoverPaint: MapArcLinePaint | undefined,
): MapArcLinePaint => {
  if (!hoverPaint) {
    return paint;
  }
  const merged: Record<string, unknown> = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) {
      continue;
    }
    const baseValue = merged[key];
    merged[key] =
      baseValue === undefined
        ? hoverValue
        : ["case", ["boolean", ["feature-state", "hover"], false], hoverValue, baseValue];
  }
  return merged as MapArcLinePaint;
};

const buildArcCoordinates = (
  from: [number, number],
  to: [number, number],
  curvature: number,
  samples: number,
): [number, number][] => {
  const [x0, y0] = from;
  const [xTo, y2] = to;
  const rawDx = xTo - x0;
  let x2 = xTo;
  if (rawDx > 180) {
    x2 = xTo - 360;
  } else if (rawDx < -180) {
    x2 = xTo + 360;
  }
  const dx = x2 - x0;
  const dy = y2 - y0;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || curvature === 0) {
    return [from, [x2, y2]];
  }

  const mx = (x0 + x2) / 2;
  const my = (y0 + y2) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  const points: [number, number][] = [];
  const segments = Math.max(2, Math.floor(samples));
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x2;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y2;
    points.push([x, y]);
  }
  return points;
};

const MapArc = <T extends MapArcDatum = MapArcDatum>({
  data,
  id: propId,
  curvature = DEFAULT_ARC_CURVATURE,
  samples = DEFAULT_ARC_SAMPLES,
  paint,
  layout,
  hoverPaint,
  onClick,
  onHover,
  interactive = true,
  beforeId,
}: MapArcProps<T>): null => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `arc-source-${id}`;
  const layerId = `arc-layer-${id}`;
  const hitLayerId = `arc-hit-layer-${id}`;

  const mergedPaint = useMemo(
    () => mergeArcPaint({ ...DEFAULT_ARC_PAINT, ...paint }, hoverPaint),
    [paint, hoverPaint],
  );
  const mergedLayout = useMemo(() => ({ ...DEFAULT_ARC_LAYOUT, ...layout }), [layout]);

  const hitWidth = useMemo(() => {
    const w = paint?.["line-width"] ?? DEFAULT_ARC_PAINT["line-width"];
    const base = typeof w === "number" ? w : ARC_HIT_MIN_WIDTH;
    return Math.max(base + ARC_HIT_PADDING, ARC_HIT_MIN_WIDTH);
  }, [paint]);

  const geoJSON = useMemo<FeatureCollection<LineString>>(
    () => ({
      features: data.map((arc) => {
        const { from, to, ...properties } = arc;
        return {
          geometry: {
            coordinates: buildArcCoordinates(from, to, curvature, samples),
            type: "LineString",
          },
          properties,
          type: "Feature",
        };
      }),
      type: "FeatureCollection",
    }),
    [data, curvature, samples],
  );

  const latestRef = useRef({ data, onClick, onHover });
  latestRef.current = { data, onClick, onHover };

  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }

    map.addSource(sourceId, {
      data: geoJSON,
      promoteId: "id",
      type: "geojson",
    });

    map.addLayer(
      {
        id: hitLayerId,
        layout: DEFAULT_ARC_LAYOUT,
        paint: {
          "line-color": "rgba(0, 0, 0, 0)",
          "line-opacity": 1,
          "line-width": hitWidth,
        },
        source: sourceId,
        type: "line",
      },
      beforeId,
    );

    map.addLayer(
      {
        id: layerId,
        layout: mergedLayout,
        paint: mergedPaint,
        source: sourceId,
        type: "line",
      },
      beforeId,
    );

    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getLayer(hitLayerId)) {
          map.removeLayer(hitLayerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // ignore
      }
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    source?.setData(geoJSON);
  }, [isLoaded, map, geoJSON, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) {
      return;
    }
    for (const [key, value] of Object.entries(mergedPaint)) {
      map.setPaintProperty(layerId, key as keyof MapArcLinePaint, value as never);
    }
    for (const [key, value] of Object.entries(mergedLayout)) {
      map.setLayoutProperty(layerId, key as keyof MapArcLineLayout, value as never);
    }
    if (map.getLayer(hitLayerId)) {
      map.setPaintProperty(hitLayerId, "line-width", hitWidth);
    }
  }, [isLoaded, map, layerId, hitLayerId, mergedPaint, mergedLayout, hitWidth]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive) {
      return;
    }

    let hoveredId: string | number | null = null;

    const setHover = (next: string | number | null) => {
      if (next === hoveredId) {
        return;
      }
      const sourceExists = !!map.getSource(sourceId);
      if (hoveredId !== null && sourceExists) {
        map.setFeatureState({ id: hoveredId, source: sourceId }, { hover: false });
      }
      hoveredId = next;
      if (next !== null && sourceExists) {
        map.setFeatureState({ id: next, source: sourceId }, { hover: true });
      }
    };

    const findArc = (featureId: string | number | undefined) =>
      featureId === null || featureId === undefined
        ? undefined
        : latestRef.current.data.find((arc) => String(arc.id) === String(featureId));

    const handleMouseMove = (e: MapLibreGL.MapLayerMouseEvent) => {
      const featureId = e.features?.[0]?.id as string | number | undefined;
      if (featureId === null || featureId === undefined || featureId === hoveredId) {
        return;
      }

      setHover(featureId);
      map.getCanvas().style.cursor = "pointer";

      const arc = findArc(featureId);
      if (arc) {
        latestRef.current.onHover?.({
          arc: arc as T,
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
          originalEvent: e,
        });
      }
    };

    const handleMouseLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = "";
      latestRef.current.onHover?.(null);
    };

    const handleClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      const arc = findArc(e.features?.[0]?.id as string | number | undefined);
      if (!arc) {
        return;
      }
      latestRef.current.onClick?.({
        arc: arc as T,
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
        originalEvent: e,
      });
    };

    map.on("mousemove", hitLayerId, handleMouseMove);
    map.on("mouseleave", hitLayerId, handleMouseLeave);
    map.on("click", hitLayerId, handleClick);

    return () => {
      map.off("mousemove", hitLayerId, handleMouseMove);
      map.off("mouseleave", hitLayerId, handleMouseLeave);
      map.off("click", hitLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = "";
    };
  }, [isLoaded, map, hitLayerId, sourceId, interactive]);

  return null;
};

interface MapClusterLayerProps<P extends GeoJsonProperties = GeoJsonProperties> {
  /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
  data: string | FeatureCollection<Point, P>;
  /** Maximum zoom level to cluster points on (default: 14) */
  clusterMaxZoom?: number;
  /** Radius of each cluster when clustering points in pixels (default: 50) */
  clusterRadius?: number;
  /** Colors for cluster circles: [small, medium, large] based on point count (default: ["#22c55e", "#eab308", "#ef4444"]) */
  clusterColors?: [string, string, string];
  /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
  clusterThresholds?: [number, number];
  /** Color for unclustered individual points (default: "#3b82f6") */
  pointColor?: string;
  /** Callback when an unclustered point is clicked */
  onPointClick?: (feature: GeoJsonFeature<Point, P>, coordinates: [number, number]) => void;
  /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
  onClusterClick?: (clusterId: number, coordinates: [number, number], pointCount: number) => void;
}

const DEFAULT_CLUSTER_COLORS: [string, string, string] = ["#22c55e", "#eab308", "#ef4444"];
const DEFAULT_CLUSTER_THRESHOLDS: [number, number] = [100, 750];

const MapClusterLayer = <P extends GeoJsonProperties = GeoJsonProperties>({
  data,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterColors = DEFAULT_CLUSTER_COLORS,
  clusterThresholds = DEFAULT_CLUSTER_THRESHOLDS,
  pointColor = "#3b82f6",
  onPointClick,
  onClusterClick,
}: MapClusterLayerProps<P>): null => {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `cluster-source-${id}`;
  const clusterLayerId = `clusters-${id}`;
  const clusterCountLayerId = `cluster-count-${id}`;
  const unclusteredLayerId = `unclustered-point-${id}`;

  const stylePropsRef = useRef({
    clusterColors,
    clusterThresholds,
    pointColor,
  });

  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }

    map.addSource(sourceId, {
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
      data,
      type: "geojson",
    });

    map.addLayer({
      filter: ["has", "point_count"],
      id: clusterLayerId,
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          clusterColors[0],
          clusterThresholds[0],
          clusterColors[1],
          clusterThresholds[1],
          clusterColors[2],
        ],
        "circle-opacity": 0.85,
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          clusterThresholds[0],
          30,
          clusterThresholds[1],
          40,
        ],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
      },
      source: sourceId,
      type: "circle",
    });

    map.addLayer({
      filter: ["has", "point_count"],
      id: clusterCountLayerId,
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#fff",
      },
      source: sourceId,
      type: "symbol",
    });

    map.addLayer({
      filter: ["!", ["has", "point_count"]],
      id: unclusteredLayerId,
      paint: {
        "circle-color": pointColor,
        "circle-radius": 5,
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2,
      },
      source: sourceId,
      type: "circle",
    });

    return () => {
      try {
        if (map.getLayer(clusterCountLayerId)) {
          map.removeLayer(clusterCountLayerId);
        }
        if (map.getLayer(unclusteredLayerId)) {
          map.removeLayer(unclusteredLayerId);
        }
        if (map.getLayer(clusterLayerId)) {
          map.removeLayer(clusterLayerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // ignore
      }
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Source/layer setup is mount-scoped; prop sync happens in later effects.
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") {
      return;
    }

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
  }, [isLoaded, map, data, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }

    const prev = stylePropsRef.current;
    const colorsChanged =
      prev.clusterColors !== clusterColors || prev.clusterThresholds !== clusterThresholds;

    if (map.getLayer(clusterLayerId) && colorsChanged) {
      map.setPaintProperty(clusterLayerId, "circle-color", [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ]);
      map.setPaintProperty(clusterLayerId, "circle-radius", [
        "step",
        ["get", "point_count"],
        20,
        clusterThresholds[0],
        30,
        clusterThresholds[1],
        40,
      ]);
    }

    if (map.getLayer(unclusteredLayerId) && prev.pointColor !== pointColor) {
      map.setPaintProperty(unclusteredLayerId, "circle-color", pointColor);
    }

    stylePropsRef.current = { clusterColors, clusterThresholds, pointColor };
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    clusterColors,
    clusterThresholds,
    pointColor,
  ]);

  useEffect(() => {
    if (!isLoaded || !map) {
      return;
    }

    const handleClusterClick = async (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });
      if (!features.length) {
        return;
      }

      const [feature] = features;
      if (!feature) {
        return;
      }

      const clusterId = feature.properties?.["cluster_id"];
      const pointCount = feature.properties?.["point_count"];
      if (typeof clusterId !== "number" || typeof pointCount !== "number") {
        return;
      }

      const { coordinates: rawCoordinates } = feature.geometry as Point;
      const coordinates = rawCoordinates as [number, number];

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount);
      } else {
        const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: coordinates,
          zoom,
        });
      }
    };

    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      if (!onPointClick || !e.features?.length) {
        return;
      }

      const [feature] = e.features;
      if (!feature) {
        return;
      }

      const { coordinates: rawCoordinates } = feature.geometry as Point;
      const coordinates = [...rawCoordinates] as [number, number];

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      onPointClick(feature as unknown as GeoJsonFeature<Point, P>, coordinates);
    };

    // Cursor style handlers
    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleMouseEnterPoint = () => {
      if (onPointClick) {
        map.getCanvas().style.cursor = "pointer";
      }
    };
    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", clusterLayerId, handleClusterClick);
    map.on("click", unclusteredLayerId, handlePointClick);
    map.on("mouseenter", clusterLayerId, handleMouseEnterCluster);
    map.on("mouseleave", clusterLayerId, handleMouseLeaveCluster);
    map.on("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
    map.on("mouseleave", unclusteredLayerId, handleMouseLeavePoint);

    return () => {
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("click", unclusteredLayerId, handlePointClick);
      map.off("mouseenter", clusterLayerId, handleMouseEnterCluster);
      map.off("mouseleave", clusterLayerId, handleMouseLeaveCluster);
      map.off("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
      map.off("mouseleave", unclusteredLayerId, handleMouseLeavePoint);
    };
  }, [isLoaded, map, clusterLayerId, unclusteredLayerId, sourceId, onClusterClick, onPointClick]);

  return null;
};
/* v8 ignore stop -- Unused registry extras retained from generated mapcn source. Remove this block-level coverage ignore when this repo first edits or relies on these exports in product code. */

export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapArc,
  MapClusterLayer,
};

export type { MapRef, MapViewport, MapArcDatum, MapArcEvent };
