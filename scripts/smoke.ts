import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startLocal } from './local.ts';

const local = await startLocal(true);
try {
  const response = await fetch(new URL('/__scaffold/status', local.apiUrl));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { kind: 'synthetic-scaffold', ready: true });
  assert.equal((await fetch(new URL('/unknown', local.apiUrl))).status, 404);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const document = await page.goto(local.webUrl);
    assert.equal(document?.status(), 200);
    await page.getByRole('heading', { name: 'Metro scaffold', exact: true }).waitFor();
    assert.deepEqual(JSON.parse(await page.getByLabel('Scaffold status').innerText()), {
      kind: 'synthetic-scaffold', ready: true,
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  console.log('Runtime smoke passed: browser shared result; Worker HTTP 200/status and 404');
} finally { await local.close(); }
