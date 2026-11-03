import type { ScaffoldStatusBody } from "@metro/contracts";
import { useEffect, useState } from "react";

import { fetchScaffoldStatus } from "./status-client";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "success"; readonly status: ScaffoldStatusBody }
  | { readonly phase: "error"; readonly message: string };

export function App() {
  const [state, setState] = useState<State>({ phase: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const status = await fetchScaffoldStatus(fetch, controller.signal);
        if (!controller.signal.aborted) setState({ phase: "success", status });
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setState({
          phase: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
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
      {state.phase === "error" && <p role="alert">Scaffold status unavailable: {state.message}</p>}
    </main>
  );
}
