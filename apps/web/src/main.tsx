import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./error-boundary";
import { rootErrorOptions } from "./report-error";
import { startVitals } from "./vitals";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root, rootErrorOptions).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  </StrictMode>,
);

startVitals(); // production builds only; see vitals.ts
