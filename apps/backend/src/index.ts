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
});

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
