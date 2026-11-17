for (const path of [
  ".env",
  "apps/api/.env.local",
  "apps/web/.dev.vars.preview",
  "apps/api/node_modules/x",
  "apps/web/dist/x",
  "apps/api/.wrangler/state/x",
  "packages/core/tsconfig.tsbuildinfo",
  "coverage/x",
  "test-results/x",
  "playwright-report/x",
]) {
  test(`ignores ${path}`, () => {
    expect(Bun.spawnSync(["git", "check-ignore", "--no-index", path]).exitCode).toBe(0);
  });
}
for (const path of [
  ".env.example",
  "apps/api/.env.example",
  "apps/api/.dev.vars.example",
  "apps/web/src/config.ts",
  "apps/api/wrangler.toml",
]) {
  test(`keeps ${path}`, () => {
    expect(Bun.spawnSync(["git", "check-ignore", "--no-index", path]).exitCode).toBe(1);
  });
}
