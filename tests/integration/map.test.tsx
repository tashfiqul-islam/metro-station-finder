/* oxlint-disable eslint/max-classes-per-file -- Test doubles mirror maplibre's constructor-based API. */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Map as UiMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";

const mockState = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;

  class MockMap {
    handlers = new globalThis.Map<string, Set<Handler>>();
    bearing = 0;
    center: [number, number];
    container: HTMLDivElement;
    flyTo = vi.fn((next: { center?: [number, number]; zoom?: number }) => {
      if (next.center) {
        this.center = next.center;
      }
      if (next.zoom !== undefined) {
        this.zoom = next.zoom;
      }
    });
    jumpTo = vi.fn(
      (next: { bearing: number; center: [number, number]; pitch: number; zoom: number }) => {
        this.bearing = next.bearing;
        this.center = next.center;
        this.pitch = next.pitch;
        this.zoom = next.zoom;
      },
    );
    options: Record<string, unknown>;
    pitch = 0;
    remove = vi.fn();
    resetNorthPitch = vi.fn(() => {
      this.bearing = 0;
      this.pitch = 0;
    });
    setProjection = vi.fn();
    setStyle = vi.fn();
    zoom = 0;
    zoomTo = vi.fn((nextZoom: number) => {
      this.zoom = nextZoom;
    });

    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.container = options["container"] as HTMLDivElement;
      this.center = (options["center"] as [number, number] | undefined) ?? [0, 0];
      this.zoom = (options["zoom"] as number | undefined) ?? 0;
      this.bearing = (options["bearing"] as number | undefined) ?? 0;
      this.pitch = (options["pitch"] as number | undefined) ?? 0;
      mockState.maps.push(this);
    }

    emit(event: string, ...args: unknown[]) {
      const handlers = this.handlers.get(event);
      for (const handler of handlers ?? []) {
        handler(...args);
      }
    }

    getBearing() {
      return this.bearing;
    }

    getCenter() {
      return { lat: this.center[1], lng: this.center[0] };
    }

    getContainer() {
      return this.container;
    }

    getPitch() {
      return this.pitch;
    }

    getZoom() {
      return this.zoom;
    }

    // oxlint-disable-next-line eslint/class-methods-use-this -- Map stub needs a stable instance method signature.
    isMoving = () => false;

    off(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? new Set<Handler>();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    once(event: string, handler: (...args: unknown[]) => void) {
      const onceHandler = (...args: unknown[]) => {
        this.off(event, onceHandler);
        handler(...args);
      };
      return this.on(event, onceHandler);
    }
  }

  class MockPopup {
    container: HTMLElement | null = null;
    handlers = new globalThis.Map<string, Set<Handler>>();
    lngLat = { lat: 0, lng: 0 };
    open = false;
    remove = vi.fn(() => {
      this.open = false;
      this.container?.remove();
      for (const handler of this.handlers.get("close") ?? []) {
        handler();
      }
    });
    setMaxWidth = vi.fn(() => this);

    options: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      mockState.popups.push(this);
    }

    addTo() {
      this.open = true;
      if (this.container && !document.body.contains(this.container)) {
        document.body.append(this.container);
      }
      return this;
    }

    getLngLat() {
      return this.lngLat;
    }

    isOpen() {
      return this.open;
    }

    off(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? new Set<Handler>();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    setDOMContent(container: HTMLElement) {
      this.container = container;
      if (!document.body.contains(container)) {
        document.body.append(container);
      }
      return this;
    }

    setLngLat(lngLat: [number, number]) {
      this.lngLat = { lat: lngLat[1], lng: lngLat[0] };
      return this;
    }

    setOffset = vi.fn(() => this);
  }

  class MockMarker {
    draggable = false;
    element: HTMLDivElement;
    eventHandlers = new globalThis.Map<string, Set<() => void>>();
    lngLat = { lat: 0, lng: 0 };
    offset = { x: 0, y: 0 };
    pitchAlignment = "auto";
    popup: MockPopup | null = null;
    remove = vi.fn(() => {
      this.element.remove();
      this.popup?.container?.remove();
    });
    rotation = 0;
    rotationAlignment = "auto";

    options: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.element =
        (options["element"] as HTMLDivElement | undefined) ?? document.createElement("div");
      this.draggable = Boolean(options["draggable"]);
      mockState.markers.push(this);
    }

    addTo(map: MockMap) {
      map.getContainer().append(this.element);
      return this;
    }

    emit(event: string) {
      for (const handler of this.eventHandlers.get(event) ?? []) {
        handler();
      }
    }

    getElement() {
      return this.element;
    }

    getLngLat() {
      return this.lngLat;
    }

    getOffset() {
      return this.offset;
    }

    getPitchAlignment() {
      return this.pitchAlignment;
    }

    getRotation() {
      return this.rotation;
    }

    getRotationAlignment() {
      return this.rotationAlignment;
    }

    isDraggable() {
      return this.draggable;
    }

    on(event: string, handler: () => void) {
      const handlers = this.eventHandlers.get(event) ?? new Set<() => void>();
      handlers.add(handler);
      this.eventHandlers.set(event, handlers);
      return this;
    }

    setDraggable(draggable: boolean) {
      this.draggable = draggable;
      return this;
    }

    setLngLat(lngLat: [number, number]) {
      this.lngLat = { lat: lngLat[1], lng: lngLat[0] };
      return this;
    }

    setOffset(offset: [number, number] | { x: number; y: number }) {
      this.offset = Array.isArray(offset) ? { x: offset[0], y: offset[1] } : offset;
      return this;
    }

    setPitchAlignment(alignment: string) {
      this.pitchAlignment = alignment;
      return this;
    }

    setPopup(popup: MockPopup | null) {
      if (this.popup?.container) {
        this.popup.container.remove();
      }
      this.popup = popup;
      if (popup?.container && !document.body.contains(popup.container)) {
        document.body.append(popup.container);
      }
      return this;
    }

    setRotation(rotation: number) {
      this.rotation = rotation;
      return this;
    }

    setRotationAlignment(alignment: string) {
      this.rotationAlignment = alignment;
      return this;
    }
  }

  return {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    maps: [] as MockMap[],
    markers: [] as MockMarker[],
    popups: [] as MockPopup[],
    reset() {
      this.maps.length = 0;
      this.markers.length = 0;
      this.popups.length = 0;
    },
  };
});

vi.mock("maplibre-gl", () => ({
  default: {
    Map: mockState.Map,
    Marker: mockState.Marker,
    Popup: mockState.Popup,
  },
}));

const emitMapReady = () => {
  const map = mockState.maps.at(-1);
  if (!map) {
    throw new Error("Expected a map instance");
  }

  act(() => {
    map.emit("load");
    map.emit("styledata");
  });

  return map;
};

const MapProbe = () => {
  const { isLoaded, map } = useMap();

  return (
    <div data-map-ready={String(isLoaded)} data-testid="map-probe">
      {map ? "map-present" : "map-missing"}
    </div>
  );
};

describe("map ui primitives", () => {
  beforeEach(() => {
    mockState.reset();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.documentElement.className = "";
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  it("renders Map children, resolves useMap context, and reports viewport moves", async () => {
    const onViewportChange = vi.fn();

    const { unmount } = render(
      <UiMap
        className="h-64"
        onViewportChange={onViewportChange}
        viewport={{ bearing: 3, center: [90.4, 23.8], pitch: 7, zoom: 11 }}
      >
        <MapProbe />
      </UiMap>,
    );

    const map = emitMapReady();

    await waitFor(() => {
      expect(screen.getByTestId("map-probe")).toHaveAttribute("data-map-ready", "true");
    });

    expect(screen.getByText("map-present")).toBeInTheDocument();

    act(() => {
      map.center = [90.5, 23.9];
      map.zoom = 12;
      map.bearing = 15;
      map.pitch = 18;
      map.emit("move");
    });

    expect(onViewportChange).toHaveBeenCalledWith({
      bearing: 15,
      center: [90.5, 23.9],
      pitch: 18,
      zoom: 12,
    });

    unmount();

    expect(map.remove).toHaveBeenCalledTimes(1);
  });

  it("mounts marker content and popup through MapMarker", async () => {
    const onClick = vi.fn();
    const onDrag = vi.fn();
    const onDragEnd = vi.fn();
    const onDragStart = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <UiMap viewport={{ center: [90.4, 23.8], zoom: 11 }}>
        <MapMarker
          draggable
          latitude={23.8}
          longitude={90.4}
          onClick={onClick}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <MarkerContent>
            <button data-testid="marker-button" type="button">
              Motijheel
            </button>
          </MarkerContent>
          <MarkerPopup closeButton>
            <span>Popup body</span>
          </MarkerPopup>
        </MapMarker>
      </UiMap>,
    );

    emitMapReady();

    const marker = mockState.markers.at(-1);
    const popup = mockState.popups.at(-1);

    if (!marker || !popup) {
      throw new Error("Expected marker and popup instances");
    }

    await waitFor(() => {
      expect(screen.getByTestId("marker-button")).toBeInTheDocument();
    });

    expect(screen.getByText("Popup body")).toBeInTheDocument();
    expect(marker.popup).toBe(popup);

    fireEvent.click(screen.getByTestId("marker-button"));
    fireEvent.mouseEnter(marker.getElement());
    fireEvent.mouseLeave(marker.getElement());

    act(() => {
      marker.lngLat = { lat: 23.81, lng: 90.41 };
      marker.emit("dragstart");
      marker.emit("drag");
      marker.emit("dragend");
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(onDragStart).toHaveBeenCalledWith({ lat: 23.81, lng: 90.41 });
    expect(onDrag).toHaveBeenCalledWith({ lat: 23.81, lng: 90.41 });
    expect(onDragEnd).toHaveBeenCalledWith({ lat: 23.81, lng: 90.41 });

    fireEvent.click(screen.getByRole("button", { name: "Close popup" }));

    expect(popup.remove).toHaveBeenCalledTimes(1);
  });

  it("wires MapControls actions to the underlying map instance", async () => {
    const onLocate = vi.fn();

    render(
      <UiMap viewport={{ center: [90.4, 23.8], zoom: 11 }}>
        <MapControls
          onLocate={onLocate}
          position="top-right"
          showCompass
          showFullscreen
          showLocate
          showZoom
        />
      </UiMap>,
    );

    const map = emitMapReady();
    const requestFullscreen = vi.fn();
    map.getContainer().requestFullscreen = requestFullscreen;

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation((success) => {
      success({
        coords: {
          latitude: 23.75,
          longitude: 90.39,
        },
      } as GeolocationPosition);
    });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset bearing to north" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Find my location" }));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Toggle fullscreen" }));

    expect(map.zoomTo).toHaveBeenNthCalledWith(1, 12, { duration: 300 });
    expect(map.zoomTo).toHaveBeenNthCalledWith(2, 11, { duration: 300 });
    expect(map.resetNorthPitch).toHaveBeenCalledWith({ duration: 300 });
    await waitFor(() => {
      expect(map.flyTo).toHaveBeenCalledWith({
        center: [90.39, 23.75],
        duration: 1500,
        zoom: 14,
      });
    });
    expect(onLocate).toHaveBeenCalledWith({ latitude: 23.75, longitude: 90.39 });
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
