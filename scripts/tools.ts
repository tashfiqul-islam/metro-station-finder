import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const node = Bun.spawnSync(['node', '--version']);
if (node.exitCode !== 0) throw new Error('Node is required. Run the documented mise setup.');
const actualNode = node.stdout.toString().trim().replace(/^v/, '');
if (Bun.version !== manifest.engines.bun || actualNode !== manifest.engines.node) {
  throw new Error(`Runtime mismatch: need Bun ${manifest.engines.bun} / Node ${manifest.engines.node}; got ${Bun.version} / ${actualNode}. Use mise exec --.`);
}
console.log(`Tools: Bun ${Bun.version}; Node ${actualNode}`);
