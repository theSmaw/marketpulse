// The entrypoint: the only file that knows there is a process, an
// environment, and a socket. The application itself is server.ts.
//
// Configuration is read inline here, and deliberately: this task's acceptance
// criterion is "a configurable port", which two `process.env` reads satisfy.
// Story 1.6 owns configuration properly — a config module, a schema, typed
// settings — and replacing two reads is far easier than unpicking an
// abstraction invented before there was anything to configure.

import process from "node:process";

import { buildServer } from "./server.js";

const DEFAULT_PORT = 3000;

// Not 0.0.0.0. A development server should not be reachable on every
// interface on the machine; a container needs 0.0.0.0 and gets it by setting
// HOST, which is exactly why this is a variable in the first place
// (Story 1.11).
const DEFAULT_HOST = "127.0.0.1";

class ConfigError extends Error {}

function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PORT;
  }

  // Number() rather than parseInt(): parseInt("3000nonsense") is 3000, which
  // would silently accept a typo'd value.
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(
      `PORT must be an integer between 1 and 65535, received ${JSON.stringify(raw)}`,
    );
  }

  return port;
}

function readHost(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_HOST;
  }

  return raw.trim();
}

let port: number;
let host: string;

try {
  port = readPort(process.env.PORT);
  host = readHost(process.env.HOST);
} catch (error) {
  // Fail before the logger exists, so this goes to stderr as a plain line
  // rather than as a Fastify log record. The message names the variable and
  // the value it was given; a Node bind error names neither.
  process.stderr.write(
    `${error instanceof ConfigError ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const app = buildServer();

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

try {
  await app.listen({ port, host });
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
