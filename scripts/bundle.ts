import { bundleMain } from "./bundle-budget.ts";

if (import.meta.main) process.exitCode = await bundleMain(process.argv.slice(2));
