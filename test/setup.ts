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
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props),
}));

// Mock Google Maps
vi.mock("@vis.gl/react-google-maps", () => ({
  // biome-ignore lint/style/useNamingConvention: Google Maps API uses PascalCase
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
  // biome-ignore lint/style/useNamingConvention: Google Maps API uses PascalCase
  Map: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "google-map" }, children),
  // biome-ignore lint/style/useNamingConvention: Google Maps API uses PascalCase
  Marker: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "marker" }, children),
  // biome-ignore lint/style/useNamingConvention: Google Maps API uses PascalCase
  InfoWindow: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "info-window" }, children),
}));

// Mock environment variables
// biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript compatibility
process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = "test-api-key";
