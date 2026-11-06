import { createApp } from "./app";

// A named statement, not `export default createApp();`: istanbul counts no statement for a bare
// export-default expression, so that form never appears in the coverage report (METRO-77).
const app = createApp();

export default app;
