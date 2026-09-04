// The entrypoint: the only file that knows there is a process, an
// environment, and a socket. The application itself is server.ts.
//
// Configuration was read inline here until Task 1.6.2, deliberately: Story
// 1.2's criterion was "a configurable port", which two `process.env` reads
// satisfy, and replacing two reads is far easier than unpicking an abstraction
// invented before there was anything to configure. config.ts now owns it — the
// readers, the defaults, the range check and the declaration of what this
// application reads. What stayed here is the half that is genuinely about the
// process: catching the error and exiting.

import process from "node:process";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import type { Config } from "./config.js";
import {
  closeDatabasePool,
  createDatabasePool,
  pingDatabase,
} from "./database.js";
import { buildServer } from "./server.js";

// Declared before the try rather than assigned inside it, because everything
// below the catch needs it and the catch never returns. TypeScript follows
// that: `process.exit()` is typed `never`, so the assignment is definite and
// no `!` is needed.
let config: Config;

try {
  // The .env file, if there is one, before anything reads the environment.
  // Both calls are here rather than inside config.ts's own module body for the
  // same reason: this is the file that is allowed to touch the process.
  loadEnvFile();
  config = loadConfig();
} catch (error) {
  // Fail before the logger exists, so this goes to stderr as a plain line
  // rather than as a Fastify log record. The message names each offending
  // variable and the value it was given; a Node bind error names neither. It
  // can be several lines now — loadConfig() reports every bad key at once
  // rather than the first.
  //
  // The exit lives here and not in config.ts: a configuration module that
  // calls process.exit cannot be tested and cannot be reused.
  process.stderr.write(
    `${error instanceof ConfigError ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const app = buildServer({
  logLevel: config.logLevel,
  logFormat: config.logFormat,
  corsOrigin: config.corsOrigin,
});

// The pool, created here rather than inside buildServer() (Task 2.1.4).
//
// It is a process resource with a lifecycle — it is opened once, it has to be
// closed inside the drain below, and every test that builds a server would
// otherwise have to supply or fake one. Nothing in this application serves data
// yet, so it deliberately does not reach the factory; database.ts's header
// records the reversal trigger, which is Story 2.8's first route that needs it.
//
// This opens no socket. `new Pool()` is lazy, so construction cannot fail and
// cannot delay startup, which is why reachability needs the explicit probe
// after listen() below rather than a `try` around this line.
const database = createDatabasePool(config.database, app.log);

// Signal handling lives here rather than in buildServer(), because it is a
// property of this process, not of the application. A factory that installs
// process-wide handlers is a surprise for anything building two instances,
// which Story 1.9's tests will.

// Five seconds. Two constraints, and this sits inside both.
//
// Above: Docker's `stop` grace period is 10s and Kubernetes'
// terminationGracePeriodSeconds is 30s, so a 5s drain finishes well before
// either orchestrator escalates to SIGKILL. Story 1.11 picks the orchestrator
// and may lower this; it should not need to raise it.
//
// Below: Task 1.2.2 established that `node --watch` sends SIGTERM and then
// waits for the child *indefinitely* — there is no supervisor timeout for this
// to sit inside, so this is the only thing standing between a bug in the
// handler and a dev loop that stops restarting. Every drained second is added
// to every save, and 5s is short enough to read as "something is wrong" rather
// than as a slow rebuild.
//
// Nothing this server serves takes measurable time, so in practice the drain
// is milliseconds and the ceiling never fires. It exists for the request that
// never finishes.
const SHUTDOWN_TIMEOUT_MS = 5000;

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<never> {
  // A second signal means "I meant it" — the conventional Ctrl-C behaviour.
  // Exit immediately and non-zero, because work in flight was dropped and a
  // zero exit would claim otherwise.
  if (shuttingDown) {
    app.log.warn(
      { signal },
      "second signal during shutdown, exiting immediately",
    );
    process.exit(1);
  }
  shuttingDown = true;

  app.log.info({ signal }, "signal received, shutting down");

  // Not unref'd. An unref'd timer would let the process exit before the
  // ceiling fires if the only thing keeping the loop alive were itself
  // unref'd; every path below clears it, so holding the loop open costs
  // nothing.
  const ceiling = setTimeout(() => {
    app.log.error(
      { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS },
      "shutdown timed out, forcing exit",
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Fastify's own close stops the listener and drains in-flight requests.
    // Idle keep-alive connections do not delay it: measured against this
    // server, close() resolved in under a millisecond with an idle keep-alive
    // socket open. That is Node's doing, not Fastify's — see server.ts.
    await app.close();
  } catch (error) {
    clearTimeout(ceiling);
    app.log.error(error, "error while shutting down");
    process.exit(1);
  }

  // Marks the point the HTTP side finished draining, and it exists because a
  // test needed it rather than because a reader does — see the `debug` record
  // below for the general argument. **Without this line the ordering the next
  // paragraph is about cannot be asserted at all**: a pool closed before
  // `app.close()` still sits between `signal received` and `shutdown complete`,
  // so a test written against those two bounds passes on the broken order.
  // Measured, by writing the test that way first and then making the break: it
  // stayed green. Two records bounding the step are what make the position
  // observable.
  app.log.debug("http drained");

  // The pool closes **after** `app.close()` has resolved, and the ordering is
  // the decision rather than an implementation detail: `app.close()` stops the
  // listener and drains requests that are still in flight, and a pool closed
  // before that would pull the connections out from under them. The failure
  // that produces does not look like an error — it looks like a request that
  // returned a 500 during a shutdown, which is the hardest kind to attribute.
  //
  // It is inside the ceiling on purpose too. `pool.end()` waits for checked-out
  // clients to be released, so a route holding one is a slow shutdown, and the
  // 5-second timer above is what turns that into a level-50 record naming the
  // timeout rather than a process that never leaves. Measured on this server
  // with an idle pool: `end()` resolves in well under a millisecond, so the
  // drain's recorded ~100 ms signal-to-exit is unmoved.
  try {
    await closeDatabasePool(database);

    // Emitted **here**, immediately after the close it describes, rather than
    // beside `shutdown complete` below — and that placement is the assertion
    // working rather than a formatting choice. The record was originally a
    // separate statement further down, and moving the close to the wrong side
    // of `app.close()` left the record where it was, so the ordering test
    // stayed green against the broken order. A marker that does not travel with
    // the step it marks is not a marker. See the two `debug` records' shared
    // note below.
    app.log.debug("database pool closed");
  } catch (error) {
    // Not fatal, and not an early return. The HTTP side has already drained
    // cleanly at this point, so a pool that will not close is a resource
    // problem in a process that is about to stop existing — worth a record, not
    // worth turning a clean exit 0 into a 1 and telling an orchestrator that
    // requests were dropped when none were.
    app.log.warn({ err: error }, "error while closing the database pool");
  }

  // The two `debug` records above are the first this application has ever
  // emitted below `info`, and they are there for a reason rather than for
  // symmetry. Task 1.7.1 recorded that `LOG_LEVEL=debug` "currently shows
  // nothing `info` does not — the variable is real and its lower half is
  // empty"; this fills it, and what it buys is that the **ordering** of the
  // drain becomes assertable from outside the process. The pair matters rather
  // than either line: `http drained` and `database pool closed` bracket the
  // pool's close, and each sits immediately beside the step it marks, so a
  // close moved to the wrong side of `app.close()` takes its record with it and
  // the order changes. At `info` both cost nothing and print nothing.

  clearTimeout(ceiling);
  app.log.info("shutdown complete");
  process.exit(0);
}

// `void`: the handler returns a promise that nothing can await, and the
// signature is `Promise<never>` because every path ends in process.exit.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

// Crashes: what escapes the request lifecycle entirely (Task 1.7.5).
//
// These are not "the server had an error" — Task 1.7.4 owns that, and an error
// thrown inside a route never reaches here at all: the error handler catches
// it, answers an `ApiError` and writes a level-50 record carrying the stack
// under that request's `reqId`. What reaches here is what has no request to
// belong to — a timer, a stray promise, a callback in a library — and by the
// time it does, the process is not the program it was.
//
// The baseline this replaces is not silence, which is worth being precise
// about. Node 24 already prints a stack for both events and exits 1. What it
// does not do is put that stack in the **log stream**: it goes to stderr as
// raw text with no level, no timestamp, no pid and nothing an aggregator can
// index, while every other record this process writes goes to stdout as JSON.
// A deployment collecting stdout loses the crash and keeps everything else.
// Measured on both events; the two are also indistinguishable from each other
// on stderr, which the `event` field below fixes.
function crash(
  event: "uncaughtException" | "unhandledRejection",
  error: unknown,
): void {
  // The one deliberate exception to LOG_LEVEL in this application, and it is
  // stated as one rather than left to be discovered.
  //
  // Task 1.7.1 admitted `silent` on purpose, for Story 1.9's test runner, and
  // `warn` and above already make a healthy server completely silent. Without
  // this line, `LOG_LEVEL=silent` would give a process that dies leaving
  // **nothing at all** — not even the stack on stderr, because these handlers
  // are what replaced Node's default behaviour. That is strictly worse than
  // the failure this task exists to fix.
  //
  // The rule, in two clauses: **ordinary traffic obeys the level; the process
  // dying does not.** Task 1.7.4 is the other half — it logs a 4xx at `info`
  // precisely so a server answering 404s stays silent at `warn`.
  //
  // Mutating the level rather than writing our own stderr line keeps one
  // rendering of a log record: same serialisers, same format, and `pretty`
  // still pretty. Measured from `silent` and from `warn`, in both formats.
  //
  // Restored immediately afterwards, and that is not tidiness — the mutation
  // is otherwise permanent for the rest of the process's life. On the
  // `shuttingDown` path below, the drain carries on logging after this
  // returns, and a level left at `fatal` swallows its `shutdown complete` and
  // (worse) the ceiling's level-50 `shutdown timed out, forcing exit`. Both
  // observed: the first version of this function lost `shutdown complete` from
  // a crash-during-drain run. The exception is exactly one record wide.
  const previousLevel = app.log.level;
  app.log.level = "fatal";

  // `err` unnormalised. A rejection's reason need not be an `Error`, and pino
  // renders a bare string as `"err":"…"` rather than failing — verified.
  // Wrapping it in `new Error(String(reason))` would manufacture a stack
  // pointing at this file, which is a worse lie than having none.
  app.log.fatal({ err: error, event }, "process crashed, exiting");

  app.log.level = previousLevel;

  // A crash during a shutdown does not start a second one. The drain owns the
  // `shuttingDown` flag and the 5-second ceiling above; returning here leaves
  // both intact, and the ceiling is what guarantees this path still reaches
  // `process.exit()` — the property `node --watch` depends on, since it waits
  // for the child indefinitely.
  if (shuttingDown) {
    return;
  }

  // No drain. `app.close()` on a process whose state is by definition unknown
  // is a second failure stacked on the one being reported, and it would serve
  // in-flight requests from a program that has already proved it is not the
  // program you thought. So in-flight requests are dropped deliberately: a
  // client mid-request gets a reset connection rather than an `ApiError`,
  // which is the one hole in the shape Task 1.7.4 made universal.
  //
  // Exit 1, like every other failure path here — bad configuration, failed
  // listen, shutdown timeout, second signal. A distinct code would say nothing
  // the record above does not, and no orchestrator exists yet to want one.
  process.exit(1);
}

// Both events, treated the same. An `uncaughtException` leaves the process in
// an unknown state by definition, so continuing is not an option; a rejection
// is arguably softer, but two behaviours is two things to remember and Node's
// own default already treats them alike. What would change this is a rejection
// source that is known-benign and frequent — and the answer to that is to
// handle it where it is thrown, not to weaken this.
process.on("uncaughtException", (error) => {
  crash("uncaughtException", error);
});
process.on("unhandledRejection", (reason) => {
  crash("unhandledRejection", reason);
});

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  // Deliberately *not* routed through the shutdown path above. A failed listen
  // has no socket bound and no requests in flight, so close() would drain
  // nothing; worse, it would run Fastify's onClose hooks against a server that
  // never started, which is a second failure mode stacked on top of the one
  // being reported. Verified that the log line survives the immediate exit:
  // starting a second server on a busy port prints the EADDRINUSE record
  // before the process leaves, so there is no buffered-output problem to fix.
  app.log.error(error, "server failed to start");
  process.exit(1);
}

// Is the database reachable? Asked once, after the server is already listening,
// and **the answer never stops this process** (Task 2.1.4).
//
// The order matters and was chosen rather than inherited. Probing before
// `listen()` would put a network round trip — up to CONNECT_TIMEOUT_MS of it —
// in front of the socket being bound, so a slow or absent database would delay
// the moment `/health` starts answering, which is what the platform's startup
// probe is waiting for. Probing after means the server is serving before the
// question is even asked, and the report arrives in the log a few milliseconds
// later.
//
// It is `await`ed rather than floated, so the startup log ends in a known state
// and `index.process.test.ts` can assert on what was written without waiting on
// a line. A closed port answers in ~3 ms; only a socket that accepts and never
// answers takes the full deadline, and that case is exactly what
// CONNECT_TIMEOUT_MS exists for.
//
// **A failure here is a `warn`, not an `error`, and not an exit.** Three
// reasons, in order of weight. A process that exits because Postgres is down is
// a crash-loop on a platform whose liveness probe restarts the replica — and
// Task 2.1.1 recorded that a Burstable server can make itself unreachable by
// exhausting its CPU credits, so this is a state the database can enter on its
// own under Story 2.7's backfill. `pnpm verify` and `test:process` both run
// with nothing listening, and that property is older than this task. And the
// level is `warn` because this server is still healthy by `/health`'s own
// definition: `error` is what Task 1.7.4 reserves for a failure this server
// produced, and the repository's standing property is that at `warn` and above
// a healthy server is silent — a database that is down is the first thing worth
// breaking that silence for without claiming the server itself failed.
const ping = await pingDatabase(database);

if (ping.ok) {
  app.log.info(
    {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      auth: config.database.auth,
      ssl: config.database.ssl,
      ms: Math.round(ping.ms * 100) / 100,
    },
    "database reachable",
  );
} else {
  // The address is logged and the credential is not — there is no field here
  // that could carry one, which is the shape `apiError()` uses on the wire.
  // `pg` was measured not to put the password into its own error messages
  // either, on a refused connection and on a rejected authentication; Task
  // 2.1.6 re-takes that against an Entra token, which is a different code path
  // and a much worse thing to leak.
  app.log.warn(
    {
      err: ping.error,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      auth: config.database.auth,
      ssl: config.database.ssl,
    },
    "database unreachable, continuing without it",
  );
}
