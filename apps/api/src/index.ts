import { Hono } from 'hono';
import { getScaffoldStatus } from '@metro/core';

const app = new Hono();
app.get('/__scaffold/status', (context) => context.json(getScaffoldStatus()));
export default app;
