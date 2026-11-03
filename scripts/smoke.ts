import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { parseErrorEnvelope, parseScaffoldStatus } from "../packages/contracts/src/index.ts";

const origin = "http://127.0.0.1:4173";

/** Starts the built app with `vite preview` (Vite + @cloudflare/vite-plugin run it in workerd). */
async function startPreview() {
  const windows = process.platform === "win32";
  const child = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "preview"], {
    cwd: resolve("apps/web"),
    stdio: ["ignore", "pipe", "pipe"],
    // A process group on POSIX lets close() stop workerd together with Vite.
    detached: !windows,
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk: Buffer) => (output += chunk.toString()));
  let exited = false;
  child.once("exit", () => (exited = true));
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (exited)
      throw new Error(`vite preview exited early:
${output}`);
    const ready = await fetch(new URL("/", origin)).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) break;
    if (Date.now() > deadline) {
      stop();
      throw new Error(`vite preview was not ready within 60 s:
${output}`);
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  function stop() {
    if (windows)
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else if (child.pid) process.kill(-child.pid, "SIGKILL");
  }
  return { close: stop };
}

const preview = await startPreview();
try {
  const status = await fetch(new URL("/api/scaffold/status", origin));
  assert.equal(status.status, 200);
  parseScaffoldStatus(await status.json());

  const unknown = await fetch(new URL("/api/unknown", origin));
  assert.equal(unknown.status, 404);
  parseErrorEnvelope(await unknown.json());

  const deep = await fetch(new URL("/deep/link", origin));
  assert.equal(deep.status, 200);
  assert.match(deep.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await deep.text(), /<div id="root">/);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext()).newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const document = await page.goto(origin);
    assert.equal(document?.status(), 200);
    await page.getByRole("heading", { name: "Metro scaffold", exact: true }).waitFor();
    assert.deepEqual(
      parseScaffoldStatus(JSON.parse(await page.getByLabel("Scaffold status").innerText())),
      { kind: "synthetic-scaffold", ready: true },
    );
    assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
    assert.deepEqual(errors, []);

    const failing = await (await browser.newContext()).newPage();
    await failing.route("**/api/scaffold/status", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "internal_error", message: "Internal server error" },
        }),
      }),
    );
    await failing.goto(origin);
    await failing.getByRole("alert").waitFor();
    assert.match(await failing.getByRole("alert").innerText(), /unavailable/i);
    assert.equal(await failing.getByLabel("Scaffold status").count(), 0);
    assert.deepEqual((await new AxeBuilder({ page: failing }).analyze()).violations, []);
  } finally {
    await browser.close();
  }
  console.log(
    "Runtime smoke passed: vite preview in workerd; API 200/404 envelopes; SPA fallback; success and error states",
  );
} finally {
  preview.close();
}
