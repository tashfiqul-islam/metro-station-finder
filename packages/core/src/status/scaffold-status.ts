/** Synthetic wiring contract; not a Metro product health signal. */
export interface ScaffoldStatus {
  readonly kind: "synthetic-scaffold";
  readonly ready: true;
}

export function getScaffoldStatus(): ScaffoldStatus {
  return { kind: "synthetic-scaffold", ready: true };
}
