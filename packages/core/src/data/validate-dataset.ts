import type { FareTable, Station } from "../domain/index.ts";

export interface StationDataset {
  readonly version: string;
  readonly source: string;
  readonly stations: readonly Station[];
  readonly fares: FareTable;
}

export type DatasetValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly problems: readonly string[] };

/** Checks dataset invariants and reports every problem found; never throws. */
export function validateDataset(dataset: StationDataset): DatasetValidation {
  const problems: string[] = [];
  const { stations, fares } = dataset;

  const ids = new Set<string>();
  for (const { id } of stations) {
    if (ids.has(id)) problems.push(`duplicate station id: ${id}`);
    ids.add(id);
  }

  const labels = new Set<string>();
  for (const station of stations)
    for (const label of new Set([station.name, ...station.aliases])) {
      if (labels.has(label)) problems.push(`duplicate label: ${label}`);
      labels.add(label);
    }

  if (
    fares.order.length !== stations.length ||
    fares.order.some((id, index) => id !== stations[index]?.id)
  )
    problems.push("fare order does not equal the station id list in order");

  const size = fares.order.length;
  if (fares.amounts.length !== size || fares.amounts.some((row) => row.length !== size))
    problems.push(`fare matrix is not square ${size}x${size}`);
  else
    fares.amounts.forEach((row, i) =>
      row.forEach((amount, j) => {
        if (!Number.isFinite(amount) || amount < 0)
          problems.push(`invalid fare cell [${i}][${j}]: ${amount}`);
        else if (i === j && amount !== 0) problems.push(`non-zero diagonal [${i}][${j}]`);
      }),
    );

  return problems.length ? { ok: false, problems } : { ok: true };
}
