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

import net from "node:net";
import process from "node:process";

import { resolveLocalDatabase } from "./local-database.mjs";
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

// The database is checked **once, with no polling at all**, and that is the
// one place this script's own shape does not carry over. The two services above
// are polled because they are started by the command you then run this
// alongside, so the check has to be able to wait out a cold tree compiling.
// `pnpm db` is not like that: it passes `--wait`, so it does not return until
// the container's healthcheck says the server is accepting connections. There
// is therefore nothing to wait for — a database that is up answers the first
// attempt, and one that is down refuses the connection immediately and is not
// going to start on its own.
//
// The cost of getting this wrong is not theoretical and it was measured: with a
// 5-second poll here, `pnpm ready` against a stopped database took **5.1 s**
// instead of 0.3 s, and `pnpm e2e` gates on this script, so that would have
// been five seconds added to every browser run — on a laptop and on the
// runner — to print a line no exit code depends on.

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

// --- The third check, which does not speak HTTP ---
//
// **This is the first probe in this script that is not a `fetch`, and it could
// not have been one.** A PostgreSQL port speaks a binary protocol and answers
// an HTTP request by waiting: the two existing checks would report
// `NO_RESPONSE` against a perfectly healthy database, which is the same answer
// they give for the squatter case and therefore useless.
//
// **The stated decision is to speak enough of the protocol to get an answer,
// rather than to settle for a TCP connect**, and the difference is what the
// answer means. A successful connect proves a **listener**, which is exactly
// what the squatter trap this script already documents looks like — Task
// 1.8.4's `net.createServer()` standing in for a wrong process would pass a
// connect check with full marks. One packet gets past that: an **SSLRequest**,
// eight bytes with no credentials and no driver, which every PostgreSQL server
// answers with a single byte, `S` if it will negotiate TLS and `N` if it will
// not. Anything else on the port answers something else, or nothing.
//
// **What it deliberately does not prove**, because a check whose limits are not
// written down gets read as proving more than it does:
//
//   - **Not that the database exists.** The named database and the credentials
//     are only tested by a real startup message and a SCRAM exchange, which is
//     a driver. Task 2.1.4's pool is what proves that, and it is the right
//     place for it.
//   - **Not that this is *our* database.** A native PostgreSQL already holding
//     5432 answers identically. That is worth knowing rather than fixing: what
//     a client cares about is whether a PostgreSQL answers at the address it
//     will dial, and if the answer comes from the wrong server that is a
//     conflict `pnpm db` reports on its own by failing to bind.
//   - **Not that TLS is available.** The reply says whether the server offers
//     it, and this container does not — which is correct and is the honest
//     local difference from a managed server where "connection encryption is
//     enforced for your network traffic". The line reports which answer came
//     back so that difference is visible rather than assumed.

/**
 * One SSLRequest against one address.
 *
 * @param {string} host
 * @param {number} port
 * @returns {Promise<{ ok: true, ssl: boolean } | { ok: false, code: string }>}
 */
function probePostgres(host, port) {
  return new Promise((done) => {
    const socket = net.connect({ host, port });

    let settled = false;

    /** @param {{ ok: true, ssl: boolean } | { ok: false, code: string }} result */
    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      done(result);
    };

    // The same reason ATTEMPT_MS exists above, arriving through a different
    // door: a socket that accepts and never answers would leave this promise
    // pending forever, and `net` has no equivalent of an abort signal.
    socket.setTimeout(ATTEMPT_MS, () => {
      finish({ ok: false, code: "NO_RESPONSE" });
    });

    socket.on("error", (error) => {
      finish({
        ok: false,
        code: /** @type {{ code?: string }} */ (error).code ?? "CONNECT_FAILED",
      });
    });

    socket.on("connect", () => {
      // Int32 length including itself, then the SSLRequest code 80877103,
      // which is 1234 << 16 | 5679 and is a protocol constant rather than a
      // version number.
      const request = Buffer.alloc(8);

      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      socket.write(request);
    });

    socket.on("data", (chunk) => {
      const reply = chunk.length > 0 ? String.fromCharCode(chunk[0] ?? 0) : "";

      finish(
        reply === "S" || reply === "N"
          ? { ok: true, ssl: reply === "S" }
          : { ok: false, code: "NOT_POSTGRES" },
      );
    });

    // A server that closes without answering is not one either — a plain TCP
    // listener with nothing behind it does exactly this.
    socket.on("close", () => {
      finish({ ok: false, code: "NO_RESPONSE" });
    });
  });
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

// The database's address comes from the **same** place the backend's does —
// `apps/backend`'s built configuration — since Task 2.1.3 put the connection
// settings through `CONFIG_VARIABLES`. Before that it came from a literal in
// `local-database.mjs`, which was one definition while nothing else named the
// database and would have been the second copy the moment something did. A
// resolver failure here is reported and not fatal, for the same reason the
// probe below is: this check's exit code answers "can the application run", and
// nothing opens a connection yet.
const localDatabase = await resolveLocalDatabase();

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

const [backend, frontend, database] = await Promise.all([
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
  localDatabase.ok
    ? probePostgres(localDatabase.database.host, localDatabase.database.port)
    : // Unreachable in the ordinary failure — an unbuilt tree stops this script
      // above, at `resolvePairAddresses`. What lands here is the entra case,
      // reported by the resolver's own message below rather than by this code.
      Promise.resolve({ ok: /** @type {const} */ (false), code: "UNRESOLVED" }),
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

// The database is **reported and not gating**, and that is a decision with a
// stated trigger rather than a softness.
//
// The exit code of this script answers one question — *can the application
// run?* — and today the application does not open a connection to anything.
// Nothing in `apps/backend` reads a database, `pnpm verify` has never needed a
// server, and `pnpm e2e` gates on this very script, so a failing third check
// would refuse to start a browser suite that has no interest in a database, on
// a laptop and on the runner alike. Making it gating today would be inventing a
// requirement one task ahead of the code that has it, which is the thing this
// repository keeps declining to do.
//
// **The reversal trigger is a condition rather than a task number**, which is
// the shape `src/report-error.ts` already uses for the same kind of deferral:
// it is **the first check in `pnpm verify` or `pnpm e2e` that fails without a
// database**. Not "the first code that opens a connection" — a pool that logs
// its failure and lets the server start leaves this exit code honest — and so
// not Task 2.1.4, which explicitly keeps `pnpm verify` and `test:process`
// passing with no database. Story 2.2's migrations and Story 2.8's routes are
// the realistic candidates. On that day this line becomes a `✗` and the `e2e`
// job in `.github/workflows/verify.yml` gains a service, which is a workflow
// change worth knowing about in advance. It is written here rather than only in
// a task file because this is where the next person will read it.
const databaseAddress = localDatabase.ok
  ? `${localDatabase.database.host}:${String(localDatabase.database.port)}`
  : "address unknown";

if (!localDatabase.ok) {
  // The one case that is not about the database at all: we could not work out
  // where it is. Printed with the resolver's own message, so an unbuilt tree
  // reads as "run `pnpm build` first" rather than as a database that is down.
  // Indented per line, because the resolver's message is multi-line whenever
  // `config.ts` reports more than one bad key — the fix Task 1.8.7 made after
  // 1.8.6 found `pair-addresses.mjs` indenting only the first line.
  console.log(
    `  ○ database\n${localDatabase.message
      .trimEnd()
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n")}`,
  );
} else if (database.ok) {
  console.log(
    `  ✓ database  ${databaseAddress}  PostgreSQL, ${database.ssl ? "TLS offered" : "no TLS offered"}`,
  );
} else {
  // The diagnosis goes on this line rather than into the hint block below,
  // because that block only runs when the pair itself failed — and the
  // interesting database cases are exactly the ones where everything else is
  // green. `○` and not `✗` on purpose: it is a report, not a failure.
  const diagnosis = {
    NOT_POSTGRES:
      "something is on this port and it did not answer an SSLRequest",
    NO_RESPONSE: "something is holding this port and not answering at all",
  };

  console.log(
    `  ○ database  ${databaseAddress}  ${database.code} — ${diagnosis[database.code] ?? "not running; `pnpm db` starts it"}`,
  );
}

if (backend.ready && frontend.ready) {
  console.log(
    !localDatabase.ok
      ? "\nThe pair is up. Where the database is could not be worked out — see above.\n" +
          "Nothing needs it yet, so this is exit 0."
      : database.ok
        ? "\nThe pair is up, and so is the database."
        : "\nThe pair is up. The database is not — start it with `pnpm db`.\n" +
          "Nothing needs it yet, so this is exit 0. That changes when a check starts failing without one.",
  );
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
