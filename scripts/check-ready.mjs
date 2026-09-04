// Is the development pair actually up? This is the check that answers it.
//
// `pnpm dev` starts three loops into one terminal, and Task 1.8.4 measured the
// thing that makes "look at the terminal" a bad answer: **a backend that fails
// to bind does not stop the loop.** `node --watch` catches the exit and prints
// `Failed running 'dist/index.js'. Waiting for file changes before
// restarting...`, the frontend carries on serving, and `pnpm dev` keeps
// running with no non-zero exit anywhere. Sixteen lines of `EADDRINUSE` scroll
// away and what is left on screen is a healthy-looking Vite banner in front of
// a pair that is half dead. The frontend's conflict is the opposite and needs
// no help — `strictPort` exits 1 and pnpm's fan-out takes the other two loops
// down with it, so you cannot miss it.
//
// **Why this cannot be a log grep, and there are four reasons rather than
// one.** At `LOG_LEVEL=warn` and above a healthy server writes nothing at all,
// its `Server listening at …` line included (ADR 0007 §2), so the line is
// absent from a working server. Fastify rewrites `0.0.0.0` to `127.0.0.1` in
// that line, so it does not state the interface that was actually bound. Task
// 1.8.1 measured it arriving **second**, ~120 ms after Vite's `ready` warm, so
// treating it as "the pair is up" works by luck rather than by design. And
// Task 1.8.2 changed its clock to `SYS:h:MM:ss.l TT`, so anything matching the
// old `[20:44:38.544]` shape now matches nothing. Poll the port; do not read
// the log.
//
// **Why the frontend probe is a named module and not `GET /`.** Task 1.8.1
// found that with `packages/shared` unbuilt, Vite reports `ready in 96 ms` and
// `GET /` returns a clean 200 of 1258 bytes from a server that cannot render
// the application. Task 1.8.4 then found that requesting *a* module is not
// enough either: with the same broken graph, `/src/main.tsx` and
// `/src/components/AppHeader/AppHeader.tsx` both answer **200**, because Vite
// transforms one module per request and `AppHeader`'s `@marketpulse/shared`
// import is type-only and erased. The module that fails is the one with a
// **value** import of the shared package, and it answers **500**. So this
// check names that module, and the naming is the point rather than an
// implementation detail.
//
// The cost is that renaming that file breaks this check. It breaks loudly and
// in the safe direction — a false "not ready" rather than a false "ready" —
// and a 404 is reported differently from a 500 below so the message says which
// of the two happened.
//
// **Not a step in `pnpm verify`,** and it must not become one: `verify` runs
// with no servers up, in CI and on a clean clone, where the honest answer to
// this question is "nothing is running" rather than a failure. It lives in
// `scripts/` so that ESLint and Prettier read it — `scripts/*.mjs` is covered
// by both, unlike `apps/backend/scripts/dev.sh`, which is covered by nothing.
// That is the whole reason it is `.mjs` rather than shell.
//
// Dependency-free, like the two checks beside it.

import process from "node:process";

import {
  dialHost,
  FRONTEND_PROBE,
  resolvePairAddresses,
} from "./pair-addresses.mjs";

// How long to keep asking. A warm pair is up in about a second and a cold one
// — a clean clone, where `scripts/dev.sh` builds before it watches — takes a
// few, so this is generous enough to be run immediately after `pnpm dev` in
// another terminal and short enough that the negative answer is not a hang.
const DEADLINE_MS = 15_000;
const INTERVAL_MS = 250;

// Per-attempt timeout, and it is not belt-and-braces. Measured while building
// this check: a socket that **accepts a connection and never answers** — which
// is what an unrelated process squatting on the port looks like, and what a
// bare `net.createServer()` standing in for one does exactly — leaves `fetch`
// pending forever, so the deadline above is never reached and the check hangs
// rather than failing. A refused connection is the easy case; an accepted one
// that goes nowhere is the case that needs this line.
const ATTEMPT_MS = 2_000;

/**
 * One attempt against one URL. Returns the response, or the reason it could
 * not be had — a refused connection is the ordinary "not started yet" case and
 * is not an error worth a stack.
 *
 * @param {string} url
 * @returns {Promise<{ ok: true, response: Response } | { ok: false, code: string }>}
 */
async function attempt(url) {
  try {
    return {
      ok: true,
      response: await fetch(url, { signal: AbortSignal.timeout(ATTEMPT_MS) }),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      // Something is holding the port and not answering — see ATTEMPT_MS.
      return { ok: false, code: "NO_RESPONSE" };
    }

    const cause = /** @type {{ cause?: { code?: string } }} */ (error).cause;

    return { ok: false, code: cause?.code ?? "FETCH_FAILED" };
  }
}

/**
 * Poll one service until it reports itself ready or the deadline passes.
 *
 * @param {string} url
 * @param {(response: Response) => Promise<string | undefined>} judge
 *   Returns a one-line description on success, or `undefined` to keep waiting.
 * @returns {Promise<{ ready: true, detail: string } | { ready: false, reason: string }>}
 */
async function poll(url, judge) {
  const until = Date.now() + DEADLINE_MS;

  // Declared without an initializer on purpose: the loop below is a `do`, so
  // it always runs once and always assigns before anything reads this.
  /** @type {string} */
  let reason;

  do {
    const result = await attempt(url);

    if (result.ok) {
      const detail = await judge(result.response);

      if (detail !== undefined) {
        return { ready: true, detail };
      }

      const type = result.response.headers.get("content-type") ?? "";

      reason = type.includes("html")
        ? `HTML from ${String(result.response.status)}`
        : `HTTP ${String(result.response.status)}`;
    } else {
      reason = result.code;
    }

    await new Promise((done) => setTimeout(done, INTERVAL_MS));
  } while (Date.now() < until);

  return { ready: false, reason };
}

// --- Where the two services are ---
//
// Both addresses come from `pair-addresses.mjs`, which is the one place they
// are defined and is shared with `scripts/run-e2e.mjs` (Task 1.13.2). The two
// failures it can report — an unbuilt tree and an invalid configuration — are
// ordinary states with a one-line answer rather than exceptions worth a stack,
// so they are rendered here exactly as they arrive.

const resolved = await resolvePairAddresses();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { port, host, backendHealthUrl, frontendOrigin, frontendProbeUrl } =
  resolved.addresses;

// The frontend's origin is `CORS_ORIGIN` and not a literal `5173`, and that is
// the least obvious decision in this pair of files. The argument is written out
// in `pair-addresses.mjs`; the short form is that a copy of the port here would
// be a second place for it to be written down, and the drift between them would
// be silent in the direction that matters. The payoff is the failure this story
// keeps meeting: a dev server moved to 5174 without the allowlist moving with
// it is a broken pair whose only symptom in the browser is `TypeError: Failed
// to fetch` beside a **200** in the log. This check reports it as the frontend
// not answering on the origin the backend allows, which names both halves.

// Note both are dialled with Node's `fetch`, which tries both address families
// and so is not caught by the split that catches `curl`: the backend listens
// on IPv4 only and both Vite servers on IPv6 only, so `curl
// http://127.0.0.1:5173/` is refused while `curl http://localhost:5173/`
// works. Measured in Task 1.8.4 — `localhost` succeeds from here against both
// services. The README's documented `curl` lines do not get that for free and
// name the family explicitly.

const [backend, frontend] = await Promise.all([
  poll(backendHealthUrl, async (response) => {
    if (!response.ok) {
      return undefined;
    }

    const body =
      /** @type {{ status?: string, version?: string, uptimeSeconds?: number }} */ (
        await response.json()
      );

    // A 200 is not the whole answer: `/health` states a status and this check
    // reads it. There is only one value today and Epic 3 adds more, at which
    // point this line is where "up" stops meaning "answering".
    return body.status === "ok"
      ? `${String(body.version)}, up ${(body.uptimeSeconds ?? 0).toFixed(1)}s`
      : `status ${String(body.status)}`;
  }),
  poll(frontendProbeUrl, async (response) => {
    await response.body?.cancel();

    // The **content type** and not the status, because the status cannot tell
    // these two apart. Vite's dev server has an SPA fallback that answers any
    // unmatched path with `index.html` and a 200 — measured here on a module
    // path that does not exist at all, which came back 200 `text/html` and
    // passed an earlier version of this check. A module that really
    // transformed comes back `text/javascript`; anything HTML is the fallback
    // dressed up as success, which is the same generosity that makes a missing
    // asset arrive in the browser as a MIME-type error rather than a 404.
    const type = response.headers.get("content-type") ?? "";

    if (type.includes("html")) {
      return undefined;
    }

    return response.ok && type.includes("javascript")
      ? "module graph resolves"
      : undefined;
  }),
]);

const results = [
  { name: "backend ", url: backendHealthUrl, result: backend },
  { name: "frontend", url: frontendProbeUrl, result: frontend },
];

for (const { name, url, result } of results) {
  if (result.ready) {
    console.log(`  ✓ ${name}  ${url}  ${result.detail}`);
  } else {
    console.error(`  ✗ ${name}  ${url}  ${result.reason}`);
  }
}

if (backend.ready && frontend.ready) {
  console.log("\nThe pair is up.");
  process.exit(0);
}

console.error("");

// The hints, because the two services fail for different reasons and the
// reason is the expensive part to work out from a scrolled terminal.
if (!backend.ready) {
  console.error(
    backend.reason === "ECONNREFUSED"
      ? "  The backend is not listening. `pnpm dev` does not stop when it fails to bind — look\n  above the Vite banner for a `server failed to start` record, and note that freeing the\n  port is not enough on its own: the loop restarts on a source edit, not on the port."
      : backend.reason === "NO_RESPONSE"
        ? `  Something is holding ${dialHost(host)}:${String(port)} and not answering. That is not this server —\n  it is an unrelated process on the port, which is also what the backend's own EADDRINUSE\n  is complaining about.`
        : `  The backend answered but did not report itself healthy (${backend.reason}).`,
  );
}

if (!frontend.ready) {
  console.error(
    frontend.reason === "ECONNREFUSED"
      ? `  Nothing is listening on ${frontendOrigin}. Either the dev server is not running, or it\n  is on a different port from the one CORS_ORIGIN allows — which is a broken pair even\n  though both halves look healthy on their own.`
      : frontend.reason.startsWith("HTML")
        ? `  The dev server answered ${FRONTEND_PROBE} with HTML, which is its SPA fallback and\n  not a module. It does not 404 — so this means the probe module has been renamed or\n  moved, and FRONTEND_PROBE in this file needs to follow it.`
        : `  The dev server did not transform ${FRONTEND_PROBE} (${frontend.reason}). That is usually\n  an unresolved import — build \`packages/shared\` first, since a filtered \`vite\` does not.`,
  );
}

console.error("");
process.exit(1);
