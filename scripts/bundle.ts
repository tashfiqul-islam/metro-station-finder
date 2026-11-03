import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(process.argv[2] ?? "apps/web/dist");
async function sizes(directory: string): Promise<{ raw: number; gzip: number }> {
  let raw = 0;
  let gzip = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await sizes(path);
      raw += nested.raw;
      gzip += nested.gzip;
    } else if (/\.(js|css)$/.test(entry.name)) {
      const bytes = await readFile(path);
      raw += bytes.length;
      gzip += gzipSync(bytes).length;
    }
  }
  return { raw, gzip };
}
const measured = await sizes(root);
if (measured.raw === 0) throw new Error("No production JS/CSS artifacts found");
console.log(`Production JS/CSS: ${measured.raw} bytes raw; ${measured.gzip} bytes gzip`);
if (measured.raw > 470_000 || measured.gzip > 142_000)
  throw new Error("Bundle budget exceeded: 470000 raw / 142000 gzip bytes");
