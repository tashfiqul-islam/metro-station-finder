/** Synthetic wiring contract; not a Metro product health signal. */
export interface ScaffoldStatus {
  readonly kind: "synthetic-scaffold";
  readonly ready: true;
}
