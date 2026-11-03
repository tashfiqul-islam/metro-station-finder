import type { ScaffoldStatus } from "../domain/scaffold-status";

export type { ScaffoldStatus };

export function getScaffoldStatus(): ScaffoldStatus {
  return { kind: "synthetic-scaffold", ready: true };
}
