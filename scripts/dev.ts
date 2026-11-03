import { startLocal } from './local.ts';

const local = await startLocal(false);
console.log(`Web: ${local.webUrl}\nWorker: ${local.apiUrl}`);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await local.close();
}
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
