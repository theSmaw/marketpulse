// The connection pool: one per process, and the only place this application
// knows there is a database driver (Task 2.1.4).
//
// **What this file is not.** It is not a query layer, a repository, an ORM or a
// typed access seam — Story 2.2 owns all of that, and something invented here
// is something that story has to argue with. What it contains is a pool, one
// `SELECT 1`, and a close. `pingDatabase()` is the whole query surface, and it
// exists to answer "can this process reach its database" rather than to be the
// first entry in a helper library.
//
// **Where the pool lives, and why `buildServer()` is untouched.** Task 2.1.4's
// brief says to let `buildServer()`'s existing shape decide it. It did, and the
// answer was to leave that factory alone: nothing in this application serves
// data yet, so putting a pool into `ServerOptions` would be a dependency
// declared for a route that does not exist, and every test that builds a server
// would then have to supply or fake one. The pool is created by `index.ts`,
// which is already the file that owns the process's resources, and closed by
// the shutdown path in the same file.
//
// The reversal trigger is a route that needs data — Story 2.8's — at which
// point the pool enters `ServerOptions` beside `corsOrigin`, and the argument
// ADR 0002 §3 records applies: the first `await` inside the factory changes
// every caller. Note that nothing here forces one. `new Pool()` is lazy and
// synchronous; it opens no socket until something asks it for a client, which
// is why constructing it cannot fail and why the reachability question needs an
// explicit probe rather than a `try` around the constructor.

import pg from "pg";
import type { PoolConfig } from "pg";

import type { DatabaseConfig } from "./config.js";
import { acquireEntraAccessToken } from "./entra-token.js";

// How many connections this process may hold.
//
// The ceiling is a fact rather than a guess: Task 2.1.1 read that a
// `Standard_B1ms` flexible server allows **50 `max_connections` of which 35 are
// usable**, because "an Azure Database for PostgreSQL flexible server reserves
// 15 connections for physical replication and monitoring" — and that
// **Burstable servers have no built-in PgBouncer**, so this pool is the only
// pool and there is no server-side safety net.
//
// 10 leaves 25, which is what Story 2.2's migrations, an operator's `psql`
// session, Epic 3's writer and a second replica share. It is deliberately not
// `35 / expected replicas`: this application is at `minReplicas: 1` and serves
// one trivial route, so a large pool would reserve a scarce resource against no
// measured demand. **The number to revisit is this one**, and the trigger is a
// measured wait for a client rather than a new feature.
const POOL_MAX = 10;

// How long to wait for a connection before giving up, and it is not
// belt-and-braces — `pg`'s default is **0, meaning wait forever**.
//
// Measured rather than assumed, against a `net.createServer()` that accepts and
// never answers: at the default, `pool.query()` was **still pending after four
// seconds** with nothing to stop it; with this set it fails in 2,005 ms saying
// `Connection terminated due to connection timeout`. That is the third time
// this repository has met the same shape — `check-ready.mjs`'s `ATTEMPT_MS`
// exists for it and so does `probePostgres`'s own `setTimeout` — and it is
// worse here than in a check script, because a hang inside a startup path is a
// replica that never becomes ready.
//
// 5 s is chosen against the deployed path rather than the local one: the
// backend is in East US and the database in ~~East US 2~~ **North Central US**
// (Task 2.1.1 chose East US 2 and Task 2.1.5 found it `OfferRestricted` for
// this subscription too), and a deployed connection additionally pays a TLS
// handshake and, under `entra`, a token mint. A refused connection does not
// wait for any of it — measured at **3 ms** against a closed port.
//
// **Task 2.1.5 measured the parts and they leave this generous rather than
// tight**: TCP+TLS from the deployed container is 79–111 ms and a full connect
// ~150–250 ms, under 5% of this. Task 2.1.6 adds the token mint to that, and
// `entra-token.ts`'s own deadline is set strictly below this number on purpose
// — see the comment there, and the test that asserts the ordering.
export const CONNECT_TIMEOUT_MS = 5000;

// How long an idle pooled client is kept before `pg` closes it.
//
// **This restates `pg`'s own default rather than changing it**, and it is set
// explicitly for the reason `prettier.config.mjs` states every option it
// agrees with: a number two other decisions are measured against must not be
// something a minor version bump can move underneath them.
//
// It is the number behind the most surprising fact Task 2.1.6 measured. The
// connection the startup probe makes is visible in `pg_stat_activity` for
// **exactly ten seconds** and then gone, and nothing queries the database
// afterwards — so **the deployed backend holds zero connections at rest**. Any
// check asked for less often than this pays the *cold* path every time, which
// deployed is ~1,023 ms of which the Entra token mint is 866 ms.
//
// Task 2.1.7 left it at ten seconds deliberately, having been handed the option
// of choosing one. Zero connections at rest is a property worth keeping on a
// tier with 35 usable connections of which Azure's own sessions already hold
// 7–10, and the only thing in this application that queries the database is an
// operator-driven diagnostic. See DIAGNOSTIC_CACHE_TTL_MS, which is chosen to
// sit **below** this rather than above it.
export const POOL_IDLE_TIMEOUT_MS = 10_000;

// How long a database reachability answer is reused before another query is
// made (Task 2.1.7).
//
// **This is the "cache it, or bound it" the task's brief demands, and it is
// both.** `createCachedDatabaseCheck` below serves an answer younger than this
// without querying, and collapses concurrent callers onto one in-flight query,
// so the query rate this application can be made to produce is **at most one
// per this interval, whatever the caller count** — which matters because the
// endpoint reading it is on public ingress with no authentication, and a
// per-request `SELECT 1` there is a free lever against a 35-connection ceiling
// with no PgBouncer beneath it.
//
// **Five seconds, and the counter-intuitive part is that a SHORTER interval is
// CHEAPER here.** The cost of a check is not linear in how often it is asked
// for, because it steps at POOL_IDLE_TIMEOUT_MS:
//
//   - Below it, the previous check's connection is still in the pool, so a
//     check is one round trip — **~23 ms** East US → North Central US — and
//     mints **no token at all**.
//   - At or above it, every check finds an empty pool, so every check opens a
//     connection and pays a token mint: **~1,023 ms**, 866 ms of it the mint.
//
// So a 10-second bound under sustained polling would cost 6 cold connections
// and 6 token mints a minute, where this costs 12 warm round trips and one
// mint. The price is that sustained polling holds **one** connection open
// rather than zero — 1 of roughly 25 genuinely free slots — and that is the
// trade this number is making. Nobody polls it today.
//
// The two constants are a coupled pair that `pnpm verify` cannot see, which is
// the third time this repository has met that shape after `API_TIMEOUT_MS` /
// `HEALTH_POLL_INTERVAL_MS` and `TOKEN_TIMEOUT_MS` / `CONNECT_TIMEOUT_MS`. It
// gets the same treatment for the same reason: a **test** asserts the ordering,
// because the thing being checked is reachable from code.
export const DIAGNOSTIC_CACHE_TTL_MS = 5000;

// What the database sees in `pg_stat_activity.application_name`.
//
// One option, and it is here because Task 2.1.6 has to evidence a connection
// "observed at both ends" — a named connection is the difference between
// reading that table and guessing which row is ours.
//
// **It is the default rather than a constant since Task 2.2.7**, and the reason
// is a real one rather than generality for its own sake. The deployed migration
// connects as `marketpulse-github-deploy` — a different Entra principal with a
// different Postgres role, because a service principal cannot mint a token for
// another principal's role — through this same pool. Left as a constant, a
// migration would appear in `pg_stat_activity` as the runtime service, which is
// harmless when they are the same principal and actively misleading now that
// they are not: the one row in that table holding DDL locks would be labelled
// as the thing that only ever reads.
export const DEFAULT_APPLICATION_NAME = "marketpulse-backend";

/**
 * The credential, as `pg` wants it: a value or a function that produces one.
 *
 * **This is the seam Task 2.1.6 fills, and it is a discriminator rather than a
 * callback**, because Task 2.1.3 made `DATABASE_AUTH` a named mode and made
 * `password` structurally absent under `entra`. So there is no inference here
 * and no way to fall through: a mode this function does not implement is an
 * error at connect time rather than a silent attempt with the wrong credential.
 *
 * `pg` accepts `() => string | Promise<string>` and **calls it once per
 * connection, not once per pool and not once per query** — measured, three
 * concurrent queries against a cold pool of three produced three calls and
 * three more queries against the warm pool produced none. That is exactly what
 * an Entra access token needs, since it is minted per connection and valid for
 * up to 24 hours.
 */
function resolveCredential(
  config: DatabaseConfig,
  log: DatabaseLogger,
): PoolConfig["password"] {
  if (config.auth === "password") {
    return config.password;
  }

  // **The `entra` branch, filled by Task 2.1.6.** The seam Task 2.1.4 built
  // held: this is a function body and nothing else moved. `createDatabasePool`,
  // its callers and `index.ts` are untouched, and the one signature that
  // changed is this private helper taking the logger it needs to say what it
  // did — which is the amendment's own instruction rather than a widening of
  // the change.
  //
  // It stays a **function** rather than an awaited value for the reason 2.1.4
  // measured: `pg` calls it once per *connection* — three concurrent queries on
  // a cold pool of three produced three calls, three more on the warm pool
  // produced none — so a token is minted per connection and reused for that
  // connection's life. That is exactly the shape a credential valid for up to
  // 24 hours wants, and it is why **there is deliberately no cache here**.
  // Adding one would need a measured token-endpoint cost to justify it, not an
  // assumption about how often this runs.
  //
  // The `async` is free: `pg` accepts `() => string | Promise<string>`.
  //
  // A throw here is an ordinary connection failure rather than a crash —
  // measured end to end by 2.1.4 — so a broken identity endpoint on the
  // deployed replica reports `database unreachable` and keeps serving
  // `/health`, instead of exiting into the liveness probe's restart loop.
  return async () => {
    const { token, ms } = await acquireEntraAccessToken();

    // What was minted, never the thing that was minted. The record carries a
    // duration and a length; `TokenAcquisition` has no field that could hold
    // the token, so this line cannot be edited into a leak by accident.
    //
    // The length is here because it is the cheapest way to tell "we got a JWT"
    // from "we got something" without printing any of it, and the amendment's
    // instruction — log what the token acquisition did — is otherwise
    // unanswerable when the failure is a token for the wrong audience, which
    // is rejected at the far end rather than here.
    log.debug(
      { ms, tokenLength: token.length },
      "minted a Microsoft Entra access token for the database connection",
    );

    return token;
  };
}

/**
 * TLS, mapped from `DATABASE_SSL`'s three named modes onto what `pg` takes.
 *
 * The mapping is the point of the variable existing. Task 2.1.1 recorded that
 * Microsoft's own managed-identity sample connection string carries
 * `Trust Server Certificate=true` — which is `require` wearing a reassuring
 * name — and that we must not copy it. Here the difference between encrypting
 * and *verifying* is one enum member rather than a boolean nobody reads twice.
 *
 * `verify-full` is `rejectUnauthorized: true`, which is Node's TLS default and
 * checks the certificate chain **and** the host name. `verify-ca` — chain but
 * not host name — is deliberately not in the vocabulary; Task 2.1.5 owns
 * confirming that `verify-full` works against the managed server's certificate,
 * and widening the union is a decision to record there with the certificate
 * fact that forced it.
 *
 * The local container offers no TLS at all, measured in Task 2.1.2, so
 * `disable` is the default and is correct rather than lax. Asking for TLS from
 * a server that has none is a **clear, immediate refusal** rather than a hang —
 * `The server does not support SSL connections` in 5 ms — which is the answer
 * to the story's "what happens when TLS is not available" from the client side.
 */
function resolveSsl(config: DatabaseConfig): PoolConfig["ssl"] {
  switch (config.ssl) {
    case "disable":
      return false;
    case "require":
      return { rejectUnauthorized: false };
    case "verify-full":
      return { rejectUnauthorized: true };
  }
}

/**
 * What a pool needs to report a problem. A structural subset of
 * `FastifyBaseLogger` rather than the type itself, so this module depends on
 * the shape it uses and not on the web framework.
 */
export interface DatabaseLogger {
  warn: (object: object, message: string) => void;
  // Added by Task 2.1.6 so a token mint can be recorded at a level a healthy
  // deployed process does not print. It is `debug` and not `info` because the
  // credential is minted **per connection** — a pool churning connections would
  // otherwise write a line each time — and because the useful case for reading
  // it is exactly the case where something is wrong.
  debug: (object: object, message: string) => void;
}

/**
 * Create the process's one pool. Opens no socket — see the header.
 *
 * The logger is a parameter for the same reason `buildServer()` takes its
 * logger settings: this module has no business deciding where a message goes,
 * and a test can pass a recorder.
 */
export function createDatabasePool(
  config: DatabaseConfig,
  log: DatabaseLogger,
  applicationName: string = DEFAULT_APPLICATION_NAME,
): pg.Pool {
  const pool = new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: resolveCredential(config, log),
    ssl: resolveSsl(config),
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    application_name: applicationName,
  });

  // **This handler is not optional, and leaving it out is the single most
  // expensive mistake available in this file.**
  //
  // `pg.Pool` is an `EventEmitter`, and an `EventEmitter` with no `error`
  // listener *throws* when one is emitted. An idle pooled client whose
  // connection the server drops emits exactly that — so without this line a
  // Postgres restart, a failover, an Azure maintenance window or B1MS
  // exhausting its CPU credits becomes an `uncaughtException`, which `index.ts`
  // turns into a level-60 record and `process.exit(1)`, which on a platform
  // whose liveness probe restarts the replica is a crash-loop caused by
  // something entirely outside this application.
  //
  // Produced rather than reasoned about, by terminating this process's own
  // backend from a second connection: with no handler the process died with
  // `terminating connection due to administrator command` as an uncaught
  // exception; with it, the message is logged, the pool discards the dead
  // client, and **the next query succeeds** on a fresh one.
  //
  // `warn` and not `error`: the pool recovered, nothing was lost, and Task
  // 1.7.4's split reserves `error` for a failure this server produced. See
  // `pingDatabase` for the same argument about the startup probe.
  pool.on("error", (error: Error) => {
    log.warn(
      { err: error },
      "database pool client error, discarding the connection",
    );
  });

  return pool;
}

/** What a reachability probe found. Never throws; the caller decides what a failure means. */
export type DatabasePing =
  | { readonly ok: true; readonly ms: number }
  | { readonly ok: false; readonly ms: number; readonly error: Error };

/**
 * `SELECT 1`, and deliberately nothing more.
 *
 * This is the whole of the story's "execute a trivial query" criterion and the
 * whole of this file's query surface. It returns a result rather than throwing,
 * for the reason `api-client.ts` gives on the frontend: a database that is down
 * is a state to report, not an exception to propagate, and a caller that has to
 * wrap it in a `try` will eventually forget to.
 */
export async function pingDatabase(pool: pg.Pool): Promise<DatabasePing> {
  const started = performance.now();

  try {
    await pool.query("select 1");
    return { ok: true, ms: performance.now() - started };
  } catch (error) {
    return {
      ok: false,
      ms: performance.now() - started,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * A reachability answer, plus how old it is (Task 2.1.7).
 *
 * `checkedAt` and `ageMs` are the two fields a diagnostic needs that
 * {@link DatabasePing} has no business carrying: a caller reading a cached
 * answer has to be able to tell it is cached, or the bound below is a lie
 * dressed as a fresh measurement.
 */
export type DatabaseCheck =
  | {
      readonly ok: true;
      readonly ms: number;
      readonly checkedAt: number;
      readonly ageMs: number;
    }
  | {
      readonly ok: false;
      readonly ms: number;
      readonly checkedAt: number;
      readonly ageMs: number;
      readonly error: Error;
    };

/** Ask whether the database is reachable, without saying how much it cost. */
export type DatabaseCheckFn = () => Promise<DatabaseCheck>;

/**
 * {@link pingDatabase}, bounded — the whole of Task 2.1.7's "cache it, or bound
 * it", and it does both.
 *
 * Two mechanisms, and the second matters more than the first:
 *
 * - **A TTL.** An answer younger than `ttlMs` is served without querying. See
 *   {@link DIAGNOSTIC_CACHE_TTL_MS} for why the number is *below*
 *   {@link POOL_IDLE_TIMEOUT_MS} rather than above it, which is the
 *   counter-intuitive half.
 * - **Single flight.** Concurrent callers arriving while a check is in flight
 *   share it rather than each starting one. Without this the TTL is worthless
 *   against exactly the case it exists for: ten simultaneous requests to a
 *   public endpoint on a cold pool would be ten connections and, deployed, ten
 *   Entra token mints at 866 ms each — the *stampede* rather than the rate.
 *
 * The result is that the query rate this application can be driven to produce
 * is at most one per `ttlMs`, whatever the caller count, and the connection
 * count at most one. That is the number the task's cost bullet asks for.
 *
 * There is deliberately **no background timer**. A cached pull costs nothing
 * when nobody asks; a timer would be uptime monitoring, which Task 1.13.5
 * already declined for this repository on the grounds that nothing in the
 * roadmap owns it — and it would be billable traffic against the Consumption
 * plan's under-1,000-bytes-per-second idle condition, standing, forever, to
 * answer a question nobody is asking. **A stale answer to a question nobody
 * asked is not worth a permanent connection.**
 *
 * A failed check is cached exactly as a successful one is. Not caching failures
 * would turn an unreachable database into an *unbounded* query rate at the
 * moment the ceiling matters most, which is the failure mode inverted.
 *
 * `now` is a parameter so the TTL is testable without a fake clock or a real
 * wait, the same reason `loadConfig(env)` takes its environment.
 */
export function createCachedDatabaseCheck(
  pool: pg.Pool,
  ttlMs: number = DIAGNOSTIC_CACHE_TTL_MS,
  now: () => number = Date.now,
): DatabaseCheckFn {
  let cached:
    { readonly ping: DatabasePing; readonly checkedAt: number } | undefined;
  let inFlight: Promise<DatabasePing> | undefined;

  const age = (checkedAt: number): number => Math.max(0, now() - checkedAt);

  const present = (ping: DatabasePing, checkedAt: number): DatabaseCheck =>
    ping.ok
      ? { ok: true, ms: ping.ms, checkedAt, ageMs: age(checkedAt) }
      : {
          ok: false,
          ms: ping.ms,
          checkedAt,
          ageMs: age(checkedAt),
          error: ping.error,
        };

  return async () => {
    if (cached !== undefined && age(cached.checkedAt) < ttlMs) {
      return present(cached.ping, cached.checkedAt);
    }

    // The in-flight promise is assigned *before* the first `await`, so a second
    // caller entering this function synchronously afterwards sees it. That
    // ordering is the single-flight guarantee; a version that awaited first and
    // assigned second would let two checks start.
    inFlight ??= pingDatabase(pool);

    try {
      const ping = await inFlight;
      const checkedAt = now();
      cached = { ping, checkedAt };
      return present(ping, checkedAt);
    } finally {
      inFlight = undefined;
    }
  };
}

/**
 * Close the pool. Idempotent enough for the shutdown path, which is the only
 * caller: `pg` rejects a second `end()`, and the drain runs once.
 *
 * It is `await`ed **after** `app.close()` resolves rather than beside it, and
 * that ordering is the point rather than an implementation detail — a pool
 * closed first would pull the connections out from under requests that are
 * still draining. See `index.ts`, where the ordering is visible in the function
 * that also owns the 5-second ceiling.
 */
export async function closeDatabasePool(pool: pg.Pool): Promise<void> {
  await pool.end();
}

// **What a request that needs data gets when the database is unavailable, which
// is a decision written down here rather than code built here.**
//
// Nothing in this application serves data yet, so there is no route to give an
// answer to and no way to produce the failure through the API — which is
// exactly the condition under which `API_ERROR_CODES`' own rule says not to add
// a member. Task 1.7.3 shipped that union with "a member per failure that can
// be produced, not per failure that can be imagined", and `BAD_REQUEST` was
// added a task later by the task that could produce it.
//
// So the decision, for Story 2.8 to implement rather than re-take:
//
//   - The status is **503**, not 500. A 500 says this server failed; a database
//     that is down is a dependency that is unavailable and a client may
//     usefully retry, which is a different instruction.
//   - The code is a new `SERVICE_UNAVAILABLE` member of `API_ERROR_CODES`,
//     added by the story that can produce it, with `errors.ts`'s status-to-code
//     mapping extended in the same change — today any non-404 4xx is
//     `BAD_REQUEST` and every 5xx is `INTERNAL_ERROR`, so a 503 raised now
//     would answer with a code that names the wrong thing.
//   - The message says the data is temporarily unavailable and says nothing
//     about Postgres, a host, a pool or a driver. That is Task 1.7.4's rule
//     rather than a new one: a 5xx never carries the thrown message, because a
//     message written for a developer is internal detail too.
//   - `/health` is **not** where this appears, and that is settled rather than
//     pending: **Task 2.1.7 took the decision and `/health` is unchanged**, for
//     the reason recorded there and in `routes/diagnostics.ts` — the platform's
//     liveness probe hits `/health`, so a `/health` that fails when the database
//     is down turns a recoverable outage into a restart loop. Database
//     reachability is reported by `GET /diagnostics/database`, which no probe
//     uses, and Story 2.8's data routes still owe their own 503.
