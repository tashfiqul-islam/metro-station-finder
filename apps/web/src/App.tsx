import type { ScaffoldStatusBody } from "@metro/contracts";
import { useEffect, useState } from "react";

import { errorCopy } from "./error-boundary";
import { fetchScaffoldStatus } from "./status-client";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "success"; readonly status: ScaffoldStatusBody }
  | { readonly phase: "error" };

export function App() {
  const [state, setState] = useState<State>({ phase: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const status = await fetchScaffoldStatus(fetch, controller.signal);
        if (!controller.signal.aborted) setState({ phase: "success", status });
      } catch {
        // The error is deliberately dropped: its message can carry a URL or coordinates (docs/agents/ui.md).
        if (!controller.signal.aborted) setState({ phase: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Metro scaffold</h1>
      <p>Synthetic workspace check. No station or fare features.</p>
      {state.phase === "loading" && <output>Loading scaffold status…</output>}
      {state.phase === "success" && (
        <output aria-label="Scaffold status">{JSON.stringify(state.status)}</output>
      )}
      {state.phase === "error" && <p role="alert">{errorCopy.statusUnavailable}</p>}
    </main>
  );
}
