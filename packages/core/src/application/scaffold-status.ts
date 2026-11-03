import type { ScaffoldStatus } from '../domain/scaffold-status';

export function getScaffoldStatus(): ScaffoldStatus {
  return { kind: 'synthetic-scaffold', ready: true };
}
