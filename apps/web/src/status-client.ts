import { parseScaffoldStatus, type ScaffoldStatusBody } from "@metro/contracts";

const STATUS_PATH = "/api/scaffold/status";

/** Fetches and validates the synthetic status. Anything but a schema-valid JSON 200 rejects. */
export async function fetchScaffoldStatus(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ScaffoldStatusBody> {
  const response = await fetcher(STATUS_PATH, {
    headers: { accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Status request failed with HTTP ${response.status}`);
  if (!(response.headers.get("content-type") ?? "").includes("application/json"))
    throw new Error("Status response is not JSON");
  return parseScaffoldStatus(await response.json());
}
