import { resolve } from 'node:path';
import { createServer, preview } from 'vite';
import { unstable_startWorker } from 'wrangler';

export async function startLocal(built: boolean) {
  const web = built
    ? await preview({ root: resolve('apps/web') })
    : await createServer({ root: resolve('apps/web') });
  if (!built && 'listen' in web) await web.listen();
  const closeWeb = async () => { await web.close(); };
  try {
    const worker = await unstable_startWorker({
      config: resolve('apps/api/wrangler.jsonc'),
      dev: {
        remote: false,
        persist: false,
        watch: !built,
        server: { hostname: '127.0.0.1', port: 8787 },
      },
    });
    try {
      await worker.ready;
      return {
        webUrl: `http://127.0.0.1:${built ? 4173 : 5173}`,
        apiUrl: await worker.url,
        async close() { await Promise.all([worker.dispose(), closeWeb()]); },
      };
    } catch (error) { await worker.dispose(); throw error; }
  } catch (error) { await closeWeb(); throw error; }
}
