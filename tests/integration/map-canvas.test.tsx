import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MapCanvas } from "@/components/common/map-canvas";

vi.mock("@/components/common/map-canvas-client", () => ({
  MapCanvasClient: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-client">{children ?? "client map"}</div>
  ),
}));

const originalNavigatorOnLine = window.navigator.onLine;

const setNavigatorOnLine = (value: boolean): void => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
};

afterEach(() => {
  setNavigatorOnLine(originalNavigatorOnLine);
});

describe("MapCanvas", () => {
  it("renders the loading shell during server render", () => {
    const html = renderToString(<MapCanvas className="h-96" />);

    expect(html).toContain("Loading map");
    expect(html).not.toContain("Offline - map unavailable");
  });

  it("renders the client map when the browser is online", async () => {
    render(<MapCanvas className="h-96" />);

    await waitFor(() => {
      expect(screen.getByTestId("map-client")).toBeInTheDocument();
    });
  });

  it("renders the offline overlay when offline is forced", () => {
    render(<MapCanvas offline />);
    expect(screen.getByText(/offline/iu)).toBeInTheDocument();
  });

  it("recovers from offline to online client state", async () => {
    setNavigatorOnLine(false);

    render(
      <MapCanvas>
        <span>client map</span>
      </MapCanvas>,
    );

    await waitFor(() => {
      expect(screen.getByText(/offline - map unavailable/iu)).toBeInTheDocument();
    });

    setNavigatorOnLine(true);
    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(screen.getByTestId("map-client")).toBeInTheDocument();
    });
  });
});
