import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";

// METRO-35: tests run in a seeded random order so order dependence cannot hide, and any failure is
// reproducible with `--seed`. These tests prove the order is really shuffled and the CI wiring prints the seed.

/** Each step only passes when the previous step ran first: the shape of shared-state coupling. */
const COUPLED_FIXTURE = `import { expect, test } from "bun:test";
import { appendFileSync } from "node:fs";

let step = 0;
for (const expected of [0, 1, 2, 3, 4]) {
  test(\`step \${expected}\`, () => {
    appendFileSync("order.log", \`\${expected}\\n\`);
    expect(step).toBe(expected);
    step += 1;
  });
}
`;

const SEARCH_SEEDS = Array.from({ length: 50 }, (_, index) => index + 1);

async function withCoupledFixture(run: (root: string) => void | Promise<void>) {
  await mkdir(".local", { recursive: true });
  const root = await mkdtemp(resolve(".local/order-"));
  try {
    await writeFile(join(root, "coupled.test.ts"), COUPLED_FIXTURE);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Runs `bun test` in the fixture; `order` is the sequence in which the fixture's tests actually ran. */
async function bunTest(root: string, ...args: string[]) {
  await rm(join(root, "order.log"), { force: true });
  const result = Bun.spawnSync([process.execPath, "test", ...args], {
    cwd: root,
    env: cleanGitEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const order = (await readFile(join(root, "order.log"), "utf8")).trim().split("\n").join(",");
  const failed = [...result.stderr.toString().matchAll(/^\(fail\) (step \d)/gmu)].map(
    (match) => match[1],
  );
  return {
    exitCode: result.exitCode,
    output: result.stdout.toString() + result.stderr.toString(),
    order,
    failed,
  };
}

test("METRO-35 the coupled fixture passes in source order, so only the order can break it", () =>
  withCoupledFixture(async (root) => {
    const result = await bunTest(root);
    expect(result.exitCode).toBe(0);
    expect(result.order).toBe("0,1,2,3,4");
  }));

/** The first of seeds 1..50 under which the coupled fixture fails; independent of Bun's shuffle details. */
async function findExposingSeed(root: string): Promise<number> {
  for (const seed of SEARCH_SEEDS) {
    if ((await bunTest(root, "--seed", String(seed))).exitCode !== 0) return seed;
  }
  throw new Error(`No seed in ${SEARCH_SEEDS[0]}..${SEARCH_SEEDS.at(-1)} exposed the coupling`);
}

test("METRO-35 a seeded random order exposes the coupling and prints the seed", () =>
  withCoupledFixture(async (root) => {
    const seed = await findExposingSeed(root);
    const result = await bunTest(root, "--seed", String(seed));
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(`--seed=${seed}`);
    expect(result.order).not.toBe("0,1,2,3,4");
    expect(result.failed.length).toBeGreaterThan(0);
  }));

test("METRO-35 the same seed reproduces the identical order and failures", () =>
  withCoupledFixture(async (root) => {
    const seed = await findExposingSeed(root);
    const first = await bunTest(root, "--seed", String(seed));
    const second = await bunTest(root, "--seed", String(seed));
    expect(first.exitCode).not.toBe(0);
    expect(second.exitCode).toBe(first.exitCode);
    expect(second.order).toBe(first.order);
    expect(second.failed).toEqual(first.failed);
  }));

test("METRO-35 different seeds produce different orders", () =>
  withCoupledFixture(async (root) => {
    const orders = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6])
      orders.add((await bunTest(root, "--seed", String(seed))).order);
    expect(orders.size).toBeGreaterThan(1);
  }));

test("METRO-35 the repository bunfig randomizes without a fixed seed, so the order varies per run", () =>
  withCoupledFixture(async (root) => {
    await writeFile(join(root, "bunfig.toml"), await readFile(resolve("bunfig.toml"), "utf8"));
    const seeds = new Set<string>();
    for (let run = 0; run < 4; run += 1) {
      const result = await bunTest(root);
      const seed = /--seed=(\d+)/u.exec(result.output)?.[1];
      expect(seed).toBeDefined();
      seeds.add(String(seed));
    }
    expect(seeds.size).toBeGreaterThan(1);
  }));

test("METRO-35 CI runs the browser smoke in shuffled order", async () => {
  const workflow = await readFile(resolve(".github/workflows/quality.yml"), "utf8");
  expect(workflow).toMatch(/run: bun run smoke -- --shuffle\s*$/mu);
});
