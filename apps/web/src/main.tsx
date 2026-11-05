import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { ErrorBoundary } from "./error-boundary";
import { rootErrorOptions } from "./report-error";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root, rootErrorOptions).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
