import { createRoot } from 'react-dom/client';
import { getScaffoldStatus } from '@metro/core';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');

createRoot(root).render(
  <main>
    <h1>Metro scaffold</h1>
    <p>Synthetic workspace check. No station or fare features.</p>
    <output aria-label="Scaffold status">{JSON.stringify(getScaffoldStatus())}</output>
  </main>,
);
