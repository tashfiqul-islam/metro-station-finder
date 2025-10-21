import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

// Mock Google Maps
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
  Map: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "google-map" }, children),
  Marker: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "marker" }, children),
  InfoWindow: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "info-window" }, children),
}));

// Mock environment variables
process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = "test-api-key";
