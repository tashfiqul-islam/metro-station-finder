import { expect, test } from 'bun:test';
import { getScaffoldStatus } from './scaffold-status';

test('consumers receive an explicitly synthetic readiness result', () => {
  expect(getScaffoldStatus()).toEqual({ kind: 'synthetic-scaffold', ready: true });
});
