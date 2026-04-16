import { vi } from "vitest";

// Stub localStorage — jsdom's localstorage-file flag may leave it non-functional
const localStorageMap = new Map<string, string>();
const localStorageMock: Storage = {
  clear: () => {
    localStorageMap.clear();
  },
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  key: (index: number) => [...localStorageMap.keys()][index] ?? null,
  get length() {
    return localStorageMap.size;
  },
  removeItem: (key: string) => {
    localStorageMap.delete(key);
  },
  setItem: (key: string, value: string) => {
    localStorageMap.set(key, value);
  },
};
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
  writable: true,
});

// Stub IntersectionObserver — not implemented in jsdom
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  configurable: true,
  value: MockIntersectionObserver,
  writable: true,
});

// Stub matchMedia — not implemented in jsdom
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  writable: true,
});
