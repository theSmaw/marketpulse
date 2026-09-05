// Minting a Microsoft Entra access token from the container app's own managed
// identity, which is the credential the deployed database connection uses
// (Task 2.1.6).
//
// **This is the second file in the workspace that reads `process.env`, and the
// first one since Task 1.6.2 made that a stated invariant.** The reason is not
// convenience, and the reason is the whole design of this file, so it is the
// first thing in it.
//
// `IDENTITY_HEADER` is **itself a bearer credential**. It is the value that
// authorises a caller to mint tokens from `IDENTITY_ENDPOINT`, so anything
// holding it can mint a database credential. Routing it through `config.ts`
// would put it on the frozen `Config` object — the object whose comment records
// that the strongest form of the no-credential-in-a-log rule here turned out to
// be **structural**: that module never receives the deployed credential and so
// cannot leak it however carelessly it is used. Putting the identity header
// there would make that true claim false, in the file that states it, in
// exchange for tidiness.
//
// So the two platform variables stop here, in the one module that needs them,
// and they never enter `Config`, are never returned, and are never named in an
// error message with their value. The invariant is amended rather than broken:
// **`config.ts` and this file are the only files that read `process.env`, and
// this one reads exactly two keys neither of which is application
// configuration** — they are injected by Container Apps and exist in no
// `.env.example`, which is also why they are deliberately not in
// `CONFIG_VARIABLES`: `pnpm env:check` would then demand they be documented as
// ours, and a developer copying the example would get two blank platform
// variables they cannot set.
//
// `env` is a parameter with `process.env` as its default, which is
// `loadConfig(env)`'s own idiom and for the same reason: the readers can be
// driven with a plain object and no process to mutate.

/**
 * The resource an Entra token has to be scoped to in order to be accepted as a
 * PostgreSQL password. Not the ARM resource and not Graph — a token for the
 * wrong audience is rejected by the database gateway rather than by the token
 * endpoint, so getting this wrong presents as an authentication failure at the
 * far end.
 *
 * This is the same string Task 2.1.5 passed to
 * `az account get-access-token --resource` when it bootstrapped the role by
 * hand, which is the only reason it is known to be right rather than plausible.
 */
const POSTGRES_RESOURCE = "https://ossrdbms-aad.database.windows.net";

/**
 * The api-version Container Apps' identity endpoint speaks.
 *
 * `HOSTING.md` records the trap this constant exists to hold: Azure's own
 * managed-identity-for-PostgreSQL documentation is written for a **virtual
 * machine** and sends you to `http://169.254.169.254/metadata/identity/...`,
 * which does not exist inside a container app. Container Apps injects
 * `IDENTITY_ENDPOINT` and `IDENTITY_HEADER` and wants `api-version` 2019-08-01
 * or later with the header named `X-IDENTITY-HEADER`.
 *
 * The cost of copying the VM recipe is worth knowing because it does not look
 * like a mistake: the VM address is not routable from a container app, so the
 * request hangs rather than failing, and it hangs **inside** the credential
 * function, which `pg` calls inside connection establishment, which
 * `connectionTimeoutMillis` bounds. The symptom is a slow, silent, entirely
 * ordinary-looking `database unreachable`.
 */
const IDENTITY_API_VERSION = "2019-08-01";

/**
 * How long to wait for the token endpoint.
 *
 * **This has to stay strictly below `database.ts`'s `CONNECT_TIMEOUT_MS`**, and
 * that ordering is the point rather than a tuning choice. `pg` calls the
 * credential function inside connection establishment, so a token fetch that
 * outlives the connection deadline is reported as a connection timeout — the
 * generic message — and the metadata endpoint is never named. Below it, the
 * token fetch fails first and says so.
 *
 * That is the same shape as the frontend's `API_TIMEOUT_MS` sitting strictly
 * below `HEALTH_POLL_INTERVAL_MS`, and it gets the same treatment: a **test**
 * asserts the ordering, because nothing in `pnpm verify` can see a relationship
 * between two constants in two files.
 *
 * 3 s against a call that measures in tens of milliseconds on the platform is
 * deliberately generous: this is a local HTTP call to a sidecar, and anything
 * approaching this number is a broken endpoint rather than a slow one.
 */
export const TOKEN_TIMEOUT_MS = 3000;

/** What the identity endpoint returns. Only one field is read. */
interface TokenResponse {
  readonly access_token?: unknown;
}

/**
 * The subset of `fetch` this module uses.
 *
 * A parameter rather than a global so the fast suite stays what Story 1.9 made
 * it — no build and no socket. A test drives this with a plain function; the
 * alternative is a loopback server in the suite developers run all day.
 */
export type FetchLike = (
  url: string,
  init: {
    readonly headers: Record<string, string>;
    readonly signal: AbortSignal;
  },
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  text: () => Promise<string>;
}>;

/**
 * What a token acquisition attempt did, for the log.
 *
 * It carries the elapsed time and **never the token**. There is no field here
 * that could hold one, which is the same move `ErrorBoundary` makes by keeping
 * a boolean and `apiError()` makes by building a four-slot object: the promise
 * is kept by the shape rather than by remembering.
 */
export interface TokenAcquisition {
  readonly token: string;
  readonly ms: number;
}

function fail(message: string): never {
  // Every message in this function is written on the assumption it will be
  // logged and shipped to Log Analytics. None of them interpolates the header,
  // the token, or a response body — a 200 body *is* the credential, and an
  // error body from this endpoint has never been worth more than its status.
  throw new Error(`Entra token acquisition failed: ${message}`);
}

/**
 * Mint an access token for the managed identity this process runs as.
 *
 * Throws on every failure, which is the contract `pg` wants: Task 2.1.4
 * measured that a throw inside the credential function surfaces as an ordinary
 * connection failure rather than as a crash, so a broken identity endpoint
 * degrades the deployed replica instead of crash-looping it.
 */
export async function acquireEntraAccessToken(
  env: Record<string, string | undefined> = process.env,
  // No cast. `FetchLike` is a structural subset of the global `fetch` and the
  // compiler agrees — a `fetch as unknown as FetchLike` here was written first
  // and `@typescript-eslint/no-unnecessary-type-assertion` rejected it, which
  // is the useful confirmation that the narrowing is real rather than decorative.
  fetchImpl: FetchLike = fetch,
): Promise<TokenAcquisition> {
  const endpoint = env.IDENTITY_ENDPOINT;
  const header = env.IDENTITY_HEADER;

  // Named separately rather than as one "not on a managed identity platform"
  // message, because the two absences mean different things: both missing is a
  // process running somewhere that is not Container Apps (a laptop, which
  // should be using DATABASE_AUTH=password), and one missing is a platform
  // contract that changed.
  if (endpoint === undefined || endpoint === "") {
    fail(
      "IDENTITY_ENDPOINT is not set. DATABASE_AUTH=entra only works where a managed identity is injected — on Azure Container Apps. Use DATABASE_AUTH=password locally.",
    );
  }
  if (header === undefined || header === "") {
    fail(
      "IDENTITY_HEADER is not set, but IDENTITY_ENDPOINT is. That is a broken managed-identity injection rather than a missing one.",
    );
  }

  const url = `${endpoint}?resource=${encodeURIComponent(POSTGRES_RESOURCE)}&api-version=${IDENTITY_API_VERSION}`;
  const started = performance.now();

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(url, {
      // The header name is the whole difference between the container-app
      // recipe and the VM one. `X-IDENTITY-HEADER` here; `Metadata: true`
      // there.
      headers: { "X-IDENTITY-HEADER": header },
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });
  } catch (error) {
    // The endpoint is a URL this process was handed, so it is safe to name and
    // it is the single most useful thing in the message — it is what tells the
    // reader whether the VM address was used by mistake.
    fail(
      `could not reach the identity endpoint ${endpoint} within ${String(TOKEN_TIMEOUT_MS)} ms: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    // Status and nothing else. The body is not echoed: on the success path it
    // *is* the credential, and treating the two paths differently is one edit
    // away from leaking one.
    fail(`the identity endpoint answered ${String(response.status)}`);
  }

  const body = await response.text();

  let parsed: TokenResponse;
  try {
    parsed = JSON.parse(body) as TokenResponse;
  } catch {
    fail("the identity endpoint answered 200 with a body that is not JSON");
  }

  const token = parsed.access_token;
  if (typeof token !== "string" || token === "") {
    fail("the identity endpoint answered 200 with no access_token");
  }

  return { token, ms: performance.now() - started };
}
