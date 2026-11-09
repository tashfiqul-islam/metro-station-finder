import { attach, type WorkerConfig, type WorkerScope } from "./worker";

/** Replaced at build time by `scripts/sw-plugin.ts` (version, precache list, kill flag). */
declare const SW_CONFIG: WorkerConfig;

const isScope = (value: unknown): value is WorkerScope =>
  typeof value === "object" && value !== null && "skipWaiting" in value && "clients" in value;

if (!isScope(self)) throw new Error("not a service worker");
attach(self, SW_CONFIG);
