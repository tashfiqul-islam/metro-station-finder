import { isRecord } from "./guards.ts";
import type { Deps, FetchedResponse } from "./release-sync.ts";

/**
 * Fails when the Cloudflare API token that deploys previews is rejected, not active, or close to
 * expiring. METRO-33, docs/agents/maintenance.md. Cloudflare has no first-party OIDC for wrangler,
 * so rotation discipline plus this early alarm is the control.
 *
 * Endpoints (developers.cloudflare.com, read 2026-11-04):
 * - account-owned token: GET /accounts/{account_id}/tokens/verify
 *   https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/
 * - user-owned token: GET /user/tokens/verify
 *   https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/
 * Both answer { success, errors, messages, result: { id, status, expires_on?, not_before? } } with
 * status "active" | "disabled" | "expired" and expires_on an RFC 3339 date-time. The pages do not
 * document the error body, so a non-2xx answer is judged by its HTTP status alone and no response
 * text is ever echoed. Which kind of token is stored is not recorded, so the account endpoint is
 * tried first and only a 401/403 from it falls back to the user endpoint.
 *
 * The token is sent only in the Authorization header. It is never logged, and no message here
 * includes any text that came back from the network.
 */

export const EXPIRY_WARNING_DAYS = 14;
const DAY_MS = 86_400_000;
const API = "https://api.cloudflare.com/client/v4";

export interface TokenCheckConfig {
  token: string;
  accountId: string;
  now: Date;
}
export interface TokenCheckResult {
  status: "active";
  /** Whole days until expiry, or null when the token has no expiry date. */
  daysRemaining: number | null;
}

const isAuthFailure = (status: number): boolean => status === 401 || status === 403;
const verifyError = (detail: string): Error => new Error(`Cloudflare token verify ${detail}`);

async function verifyAt(
  url: string,
  token: string,
  deps: Deps,
): Promise<{ response: FetchedResponse }> {
  try {
    const response = await deps.fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    return { response };
  } catch {
    // The underlying error text is dropped on purpose: it could carry request details.
    throw verifyError("request failed (network error)");
  }
}

async function readResult(
  response: FetchedResponse,
): Promise<{ status: string; expiresOn?: Date }> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw verifyError("response was not JSON");
  }
  const result = isRecord(body) && body["success"] === true ? body["result"] : undefined;
  if (!isRecord(result) || typeof result["status"] !== "string")
    throw verifyError("response has no success result with a status");
  const expires = result["expires_on"];
  if (expires === undefined || expires === null) return { status: result["status"] };
  const expiresOn = typeof expires === "string" ? new Date(expires) : undefined;
  if (expiresOn === undefined || Number.isNaN(expiresOn.getTime()))
    throw verifyError("response has an expires_on that is not a date");
  return { status: result["status"], expiresOn };
}

export async function checkCloudflareToken(
  config: TokenCheckConfig,
  deps: Deps,
): Promise<TokenCheckResult> {
  const account = await verifyAt(
    `${API}/accounts/${encodeURIComponent(config.accountId)}/tokens/verify`,
    config.token,
    deps,
  );
  let response = account.response;
  if (isAuthFailure(response.status)) {
    const user = await verifyAt(`${API}/user/tokens/verify`, config.token, deps);
    if (!user.response.ok)
      throw verifyError(
        `was rejected: HTTP ${account.response.status} from the account endpoint and HTTP ${user.response.status} from the user endpoint`,
      );
    response = user.response;
  } else if (!response.ok) {
    throw verifyError(`failed with HTTP ${response.status}`);
  }

  const { status, expiresOn } = await readResult(response);
  if (status !== "active") throw verifyError(`says the token status is "${status}", not "active"`);
  if (expiresOn === undefined) {
    deps.log("Token is active and has no expiry date (set one when rotating).");
    return { status: "active", daysRemaining: null };
  }
  const remaining = expiresOn.getTime() - config.now.getTime();
  if (remaining <= 0)
    throw verifyError(`says the token is already expired (${expiresOn.toISOString()})`);
  const daysRemaining = Math.floor(remaining / DAY_MS);
  if (remaining <= EXPIRY_WARNING_DAYS * DAY_MS)
    throw new Error(
      `Cloudflare API token expires in ${daysRemaining} days (${expiresOn.toISOString()}), within ${EXPIRY_WARNING_DAYS} days; rotate it now (docs/agents/maintenance.md).`,
    );
  deps.log(`Token is active and expires in ${daysRemaining} days (${expiresOn.toISOString()}).`);
  return { status: "active", daysRemaining };
}

/** Process entry. The credential comes from the environment, never from the command line. */
export async function cloudflareTokenCheckMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = { fetch: (url, init) => fetch(url, init), log: (m) => console.log(m) },
  now: Date = new Date(),
): Promise<void> {
  try {
    const required = (name: string): string => {
      const value = env[name];
      if (value === undefined || value.trim() === "")
        throw new Error(`${name} is required (set it on the check step)`);
      return value;
    };
    await checkCloudflareToken(
      {
        token: required("CLOUDFLARE_API_TOKEN"),
        accountId: required("CLOUDFLARE_ACCOUNT_ID"),
        now,
      },
      deps,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await cloudflareTokenCheckMain(process.env);
