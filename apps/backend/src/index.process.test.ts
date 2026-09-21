// The process half: signals, exit codes, the shutdown ceiling, the second
// signal, EADDRINUSE and both crash handlers (Task 1.10.5).
//
// This is the hole Story 1.9 handed Story 1.10 by name. `app.inject()` reaches
// none of it — it drives the assembled application without a socket, without a
// process and without `index.ts` ever being imported — so everything here needs
// a real child process against a real port against the BUILT tree. Task 1.9.3
// declined to build it in place and named this story as owner, on a
// CI-shaped argument: such a suite needs a build to have run, spawns and signals
// processes, and its first failure mode is a port held by a previous run, which
// is a hazard a shared runner has and a laptop does not.
//
// Every behaviour below was verified by hand once already — in Tasks 1.2.4,
// 1.2.6 and 1.7.5 — by spawning `dist/index.js`, sending signals and reading
// exit codes. Those measurements (~100 ms signal-to-exit, a sub-millisecond
// drain, a 5 s ceiling) are baselines for a human reading a regression. They
// are deliberately NOT assertions: the runner-to-runner spread on identical
// work in this repository's own CI is 13.6 s, so a threshold set against a
// laptop reading is a flake waiting for a slow runner. **Assert on behaviour
// and exit codes.**
//
// What this suite does not do, and why:
//
//   - **It never waits on a log line.** At `LOG_LEVEL=warn` and above a healthy
//     server writes zero lines, `Server listening at …` included, so a readiness
//     grep hangs rather than fails — the worse failure. Fastify also rewrites
//     `0.0.0.0` to `127.0.0.1` in that line so it is not evidence of the bound
//     interface, `pretty` and `json` render the same record two different ways,
//     and Task 1.8.2 changed the `pretty` clock format under a matcher that
//     would have been written against the old one. Readiness is `GET /health`.
//     Log records are read *after* the fact, as assertions about what was
//     written, which is a different thing from waiting for one.
//   - **It asserts no timings.** See above.
//   - **It does not run in `pnpm test`.** See `vitest.process.config.ts`.

import WsWebSocket from "ws";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// The built tree
// ---------------------------------------------------------------------------

// `dist/index.js` is what has the process behaviour in it, so a stale `dist`
// here is a suite testing the previous commit — silently, and green. `pnpm
// verify` orders `build` before both test steps, so the ordinary path is safe;
// this check is for the person running the command on its own.
//
// Resolved from this module rather than from the working directory, the same
// choice `config.ts` makes for `.env` and for the same reason: `pnpm --filter`
// and a bare `vitest` from the package directory then agree by construction.
const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const ENTRY = path.join(PACKAGE_ROOT, "dist", "index.js");

function requireBuild(): void {
  if (!fs.existsSync(ENTRY)) {
    throw new Error(
      `${ENTRY} does not exist. This suite drives the built tree — run \`pnpm build\` first.`,
    );
  }
}

// A staleness check was built here and removed, and the reason is worth more
// than the check was. Comparing the newest mtime under `src/` against the
// newest under `dist/` looks like it answers "is this build current", and it
// does not: `tsc -b` decides what to re-emit from the content hashes in
// `tsconfig.tsbuildinfo`, so a `git checkout` — which rewrites every source
// file's mtime and changes not one byte — leaves a perfectly current `dist/`
// looking stale. Measured, on this branch: every `src/*.ts` was newer than
// every `dist/*.js` immediately after a green `pnpm build`. A check that fails
// on a correct tree is worse than no check, so what is left is existence, and
// the ordering is `pnpm verify`'s job — it runs `build` before either test
// step, which is one of the arguments for this suite being a step in that chain
// rather than a thing CI runs on the side.
requireBuild();

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

// **`PORT=0` is not available here, and that is a property of the shipping
// application rather than an oversight.** `config.ts` validates the port
// against `MIN_PORT = 1` … `MAX_PORT = 65535`, so the obvious strategy — bind
// an ephemeral port and read back what the kernel chose — is rejected before
// the server starts. Widening that range to admit 0 was the third option and
// was not taken: it is a change to the shipping application made for a test's
// convenience, and 0 is a real value meaning "any free port" that an operator
// setting `PORT=` in a `.env` file would then get by accident — which is
// exactly the case `present()` was written to prevent (Task 1.6.3). There is a
// test below asserting the rejection, so the finding is recorded as an
// assertion rather than as a comment.
//
// What replaces it: ask the kernel for an ephemeral port, close it, and hand
// the number to the child. That has a race — something could take the port in
// between — and the race is answered rather than ignored. If it is lost, the
// child fails to bind and exits 1 with its `EADDRINUSE` record intact, and
// `waitForReady` notices the exit immediately and fails with the child's whole
// log attached, naming the port. **A port held by a previous run is therefore a
// diagnosable failure and not a hang**, which is the failure everyone will
// actually see on a shared runner.
async function probeFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address === null || typeof address === "string") {
        probe.close();
        reject(new Error("the port probe did not bind a TCP address"));
        return;
      }
      const { port } = address;
      probe.close(() => {
        resolve(port);
      });
    });
  });
}

async function isPortFree(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const probe = net.createServer();
    probe.on("error", () => {
      resolve(false);
    });
    probe.listen(port, "127.0.0.1", () => {
      probe.close(() => {
        resolve(true);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

interface LogRecord {
  readonly level: number;
  readonly msg?: string;
  readonly signal?: string;
  readonly event?: string;
  readonly err?: { readonly code?: string; readonly message?: string };
}

interface Exit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

interface Server {
  readonly child: ChildProcess;
  readonly port: number;
  /** Everything the child wrote to stdout and stderr, in arrival order. */
  output: () => string;
  /** The JSON log records it wrote. Non-JSON lines are excluded, not dropped. */
  records: () => readonly LogRecord[];
  exit: () => Exit | undefined;
}

const started: Server[] = [];
const sockets: net.Socket[] = [];

// Two ways to start the server, and the difference is one line of `node -e`.
//
// `startServer()` runs `node dist/index.js` — the same command `pnpm start`
// runs, which is the point: signals, exit codes and the bind failure are
// properties of that process and are tested against it exactly.
//
// `startCrashableServer()` runs the same module through a one-line ESM wrapper
// that also listens on an IPC channel for a message telling it to throw or to
// reject. That indirection is unavoidable and worth stating: **this application
// contains no way to crash it.** An error thrown in a route never reaches the
// crash handlers at all — Task 1.7.4's error handler catches it, answers an
// `ApiError` and logs the stack under that request's `reqId` — and what does
// reach them is by definition detached from any request. Tasks 1.7.5 and 1.9.3
// both produced one by adding a temporary throwing route to the shipping
// application; injecting the throw from outside costs nothing at runtime, ships
// nothing, and leaves the real handlers, the real logger and the real drain in
// place. The wrapper imports the real entrypoint and adds no error handling of
// its own.
function launch(
  port: number,
  env: Readonly<Record<string, string>>,
  argv: readonly string[],
  ipc: boolean,
): Server {
  const child = spawn(process.execPath, [...argv], {
    cwd: PACKAGE_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      LOG_LEVEL: "info",
      LOG_FORMAT: "json",
      ...env,
    },
    stdio: ipc ? ["ignore", "pipe", "pipe", "ipc"] : ["ignore", "pipe", "pipe"],
  });

  let text = "";
  let exit: Exit | undefined;

  // `stdout`/`stderr` are typed nullable because they are `null` under other
  // `stdio` settings. Narrowed rather than asserted: `strictTypeChecked`
  // rejects `!`, and a missing pipe here would otherwise surface as a test that
  // asserts on an empty log.
  const { stdout, stderr } = child;
  if (stdout === null || stderr === null) {
    throw new Error("the child was spawned without piped stdout and stderr");
  }
  for (const stream of [stdout, stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      text += chunk;
    });
  }

  child.on("exit", (code, signal) => {
    exit = { code, signal };
  });

  const server: Server = {
    child,
    port,
    output: () => text,
    records: () =>
      text
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line) as LogRecord),
    exit: () => exit,
  };

  started.push(server);
  return server;
}

function startServer(
  port: number,
  env: Readonly<Record<string, string>> = {},
): Server {
  return launch(port, env, [ENTRY], false);
}

// The wrapper is written here rather than kept as a fixture file on disk. A
// fixture under `src/` would compile into `dist/` beside the server, and — worse
// — `tsc -b --clean` deletes the output of the sources that *currently* exist,
// so a fixture added and later deleted by hand orphans its `dist/` files
// permanently. A `.mjs` outside `src/` would be a second file in the part of
// this repository that `pnpm verify` reads with nothing, which is the gap
// `apps/backend/scripts/dev.sh` already occupies.
const CRASH_WRAPPER = `
await import(${JSON.stringify(pathToFileURL(ENTRY).href)});
process.on("message", (message) => {
  // A detached timer and a floating rejection: the two shapes that reach the
  // process-level handlers. Neither is inside a request.
  if (message === "throw") setTimeout(() => { throw new Error("injected crash"); }, 0);
  if (message === "reject") void Promise.reject(new Error("injected crash"));
});
`;

function startCrashableServer(
  port: number,
  env: Readonly<Record<string, string>> = {},
): Server {
  return launch(port, env, ["--input-type=module", "-e", CRASH_WRAPPER], true);
}

// ---------------------------------------------------------------------------
// Waiting
// ---------------------------------------------------------------------------

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Readiness is an answered request, never a log line. `127.0.0.1` is named
// explicitly: this server binds IPv4 only, and while Node's `fetch` tries both
// families for `localhost` (unlike `curl`, which takes what it is given), a
// probe that leans on that would pass for the wrong reason if the bind address
// ever moved.
async function waitForReady(server: Server, timeoutMs = 15_000): Promise<void> {
  const url = `http://127.0.0.1:${String(server.port)}/health`;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const exit = server.exit();
    if (exit !== undefined) {
      throw new Error(
        `the server exited (code ${String(exit.code)}, signal ${String(exit.signal)}) before answering ${url}. Its output was:\n${server.output()}`,
      );
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Not up yet, or something else holds the port. Either way, retry until
      // the deadline; the exit check above is what turns the second case into a
      // diagnosis rather than a wait.
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `the server never answered ${url} within ${String(timeoutMs)} ms. Its output was:\n${server.output()}`,
      );
    }
    await delay(50);
  }
}

async function waitForExit(server: Server, timeoutMs = 20_000): Promise<Exit> {
  const settled = server.exit();
  if (settled !== undefined) return settled;

  return await new Promise<Exit>((resolve, reject) => {
    const ceiling = setTimeout(() => {
      reject(
        new Error(
          `the server was still running ${String(timeoutMs)} ms after it was asked to exit. Its output was:\n${server.output()}`,
        ),
      );
    }, timeoutMs);

    server.child.on("exit", (code, signal) => {
      clearTimeout(ceiling);
      resolve({ code, signal });
    });
  });
}

// Holds the drain open, and the mechanism is worth knowing because the obvious
// one does not work: an idle keep-alive connection does NOT delay `app.close()`
// — Fastify closes idle connections and waits only for active ones, which
// Task 1.2.4 measured at under a millisecond. This opens a connection and
// writes an *incomplete* request: headers with no terminating blank line. The
// connection is then active, the drain waits for it, and the 5-second ceiling
// becomes reachable.
//
// One finding that came out of building this, because it contradicts a plausible
// reading of Task 1.7.5: completing that request after `close()` has been called
// gets a **503**, not a 200 — Fastify answers `request aborted - refusing to
// accept new requests as server is closing`. So what holds the drain is the
// connection, not a request in flight, and this suite cannot produce a 200
// during a drain without adding a slow route to the shipping application.
async function holdConnection(port: number): Promise<net.Socket> {
  const socket = net.connect(port, "127.0.0.1");
  sockets.push(socket);
  socket.on("error", () => {
    // The server tears this down on its way out; a reset here is the expected
    // end of the connection, not a test failure.
  });
  await new Promise<void>((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("error", reject);
  });
  socket.write("GET /health HTTP/1.1\r\nHost: localhost\r\n");
  return socket;
}

function messages(server: Server): readonly (string | undefined)[] {
  return server.records().map((record) => record.msg);
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  for (const server of started.splice(0)) {
    if (server.exit() === undefined) {
      server.child.kill("SIGKILL");
      await waitForExit(server, 5_000);
    }
  }
});

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

describe("signals", () => {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    it(`drains and exits 0 on ${signal}, releasing the port`, async () => {
      const port = await probeFreePort();
      const server = startServer(port);
      await waitForReady(server);

      server.child.kill(signal);
      const exit = await waitForExit(server);

      expect(exit.code).toBe(0);
      expect(exit.signal).toBeNull();
      expect(messages(server)).toContain("signal received, shutting down");
      expect(messages(server)).toContain("shutdown complete");

      // The record carries the signal that caused it, which is the only thing
      // distinguishing the two runs of this test.
      const received = server
        .records()
        .find((record) => record.msg === "signal received, shutting down");
      expect(received?.signal).toBe(signal);

      // The port is genuinely released rather than merely reported closed.
      expect(await isPortFree(port)).toBe(true);
    });
  }

  it("exits 1 immediately on a second signal during a shutdown", async () => {
    const port = await probeFreePort();
    const server = startServer(port);
    await waitForReady(server);

    // The drain has to still be running when the second signal arrives, and
    // nothing this server serves takes measurable time — so the connection
    // above is what makes this path reachable at all.
    await holdConnection(port);

    server.child.kill("SIGTERM");
    await delay(300);
    server.child.kill("SIGTERM");

    const exit = await waitForExit(server);

    // Non-zero on purpose: work in flight was dropped, and a zero exit would
    // claim otherwise.
    expect(exit.code).toBe(1);
    expect(messages(server)).toContain(
      "second signal during shutdown, exiting immediately",
    );
    expect(messages(server)).not.toContain("shutdown complete");
  });

  it("forces an exit when the drain outlives the shutdown ceiling", async () => {
    const port = await probeFreePort();
    const server = startServer(port);
    await waitForReady(server);
    await holdConnection(port);

    server.child.kill("SIGTERM");
    const exit = await waitForExit(server);

    expect(exit.code).toBe(1);

    const forced = server
      .records()
      .find((record) => record.msg === "shutdown timed out, forcing exit");

    // Level 50 — `error`. Asserted rather than assumed, because the level is
    // what decides whether this record survives `LOG_LEVEL=warn`, which is the
    // level at which a healthy server is otherwise completely silent.
    expect(forced?.level).toBe(50);
    expect(messages(server)).not.toContain("shutdown complete");
  });
});

// ---------------------------------------------------------------------------
// Starting
// ---------------------------------------------------------------------------

describe("failing to start", () => {
  it("exits 1 with the EADDRINUSE record intact when the port is busy", async () => {
    const port = await probeFreePort();
    const squatter = net.createServer();
    await new Promise<void>((resolve) => {
      squatter.listen(port, "127.0.0.1", resolve);
    });

    try {
      const server = startServer(port);
      const exit = await waitForExit(server);

      expect(exit.code).toBe(1);

      const failed = server
        .records()
        .find((record) => record.msg === "server failed to start");
      expect(failed?.level).toBe(50);
      expect(failed?.err?.code).toBe("EADDRINUSE");

      // The bind failure is not routed through the shutdown path: there is no
      // socket bound and nothing to drain, so a `close()` here would run
      // Fastify's onClose hooks against a server that never started.
      expect(messages(server)).not.toContain("signal received, shutting down");
    } finally {
      await new Promise<void>((resolve) => {
        squatter.close(() => {
          resolve();
        });
      });
    }
  });

  // **The claim ADR 0030 §7 rests on, proven at the only level that can prove
  // it: the process.** A unit test proves `loadConfig` throws; only a spawned
  // child proves the SERVER DIES, and "the container refuses to start" is the
  // whole mechanism. Without this, the deployed behaviour would be an
  // inference from two facts in different files.
  //
  // `fixture` invents prices and is a member of the documented vocabulary, so
  // it is exactly the plausible-looking value somebody could set on a container
  // app. `PROVIDER_SERVES` in `packages/shared` marks it `not-the-live-market`;
  // this is what that marking costs a deployment that has not asked by name.
  it("refuses to start on a provider that does not serve the live market", async () => {
    // A REAL port, deliberately, and this is the difference between a test and
    // a coincidence. `startServer(0)` would refuse for `PORT=0` as well — the
    // case below — so the exit code would prove nothing about this refusal. A
    // free port makes the provider the only thing wrong, so exit 1 is
    // attributable to it and to nothing else.
    const port = await probeFreePort();
    const server = startServer(port, { MARKET_DATA_PROVIDER: "fixture" });
    const exit = await waitForExit(server);

    expect(exit.code).toBe(1);
    expect(server.output()).toContain("NON_LIVE_MARKET_DATA");
    expect(server.output()).toContain("MARKET_DATA_PROVIDER is fixture");

    // Before the logger exists, exactly as the PORT case below: a configuration
    // mistake has to be readable without a log viewer, which is why `config.ts`
    // throws and `index.ts` exits.
    expect(server.records()).toHaveLength(0);
  });

  it("rejects PORT=0 with a plain stderr line and no log record", async () => {
    // The `PORT=0` finding, recorded as an assertion rather than as a comment:
    // the ephemeral-port strategy every process suite reaches for first is
    // unavailable here, because `config.ts` validates 1..65535 and 0 is a real
    // value meaning "any free port" that a blank `.env` line must not produce.
    const server = startServer(0);
    const exit = await waitForExit(server);

    expect(exit.code).toBe(1);
    expect(server.output()).toContain("PORT");

    // Before the logger exists, so it is a plain line rather than a record —
    // which is what makes a configuration mistake readable without a log
    // viewer, and is why `config.ts` throws while `index.ts` exits.
    expect(server.records()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Crashes
// ---------------------------------------------------------------------------

describe("crash handlers", () => {
  for (const [message, event] of [
    ["throw", "uncaughtException"],
    ["reject", "unhandledRejection"],
  ] as const) {
    it(`logs a fatal record and exits 1 on ${event}`, async () => {
      const port = await probeFreePort();
      const server = startCrashableServer(port);
      await waitForReady(server);

      server.child.send(message);
      const exit = await waitForExit(server);

      expect(exit.code).toBe(1);

      const crash = server
        .records()
        .find((record) => record.msg === "process crashed, exiting");

      // Level 60 — `fatal`. The baseline this replaced is not silence: Node 24
      // already prints a stack for both events and already exits 1. What it does
      // not do is put the stack in the *log stream*, and it renders the two
      // events indistinguishably — which is what the `event` field fixes.
      expect(crash?.level).toBe(60);
      expect(crash?.event).toBe(event);
      expect(crash?.err?.message).toBe("injected crash");

      // No drain. A process whose state is by definition unknown does not serve
      // its remaining requests.
      expect(messages(server)).not.toContain("shutdown complete");
    });
  }

  it("writes the crash record even at LOG_LEVEL=silent, and writes nothing else", async () => {
    const port = await probeFreePort();
    const server = startCrashableServer(port, { LOG_LEVEL: "silent" });
    await waitForReady(server);

    server.child.send("throw");
    const exit = await waitForExit(server);

    expect(exit.code).toBe(1);

    // The one deliberate exception to LOG_LEVEL in this application, and it is
    // exactly one record wide. Without it, `LOG_LEVEL=silent` would give a
    // process that dies leaving nothing at all — not even Node's own stderr
    // stack, because these handlers are what replaced it.
    const records = server.records();
    expect(records).toHaveLength(1);
    expect(records[0]?.level).toBe(60);
    expect(records[0]?.msg).toBe("process crashed, exiting");
  });

  it("does not start a second shutdown when it crashes during a drain, and restores the log level", async () => {
    const port = await probeFreePort();
    const server = startCrashableServer(port);
    await waitForReady(server);
    const socket = await holdConnection(port);

    server.child.kill("SIGTERM");
    await delay(300);
    server.child.send("throw");
    await delay(300);
    socket.write("\r\n");

    const exit = await waitForExit(server);

    // Exit 0: the crash wrote its record and returned, and the drain that was
    // already running owned the `shuttingDown` flag and the ceiling.
    expect(exit.code).toBe(0);

    const written = messages(server);
    expect(written).toContain("process crashed, exiting");
    expect(
      written.filter((msg) => msg === "signal received, shutting down"),
    ).toHaveLength(1);

    // The assertion this test exists for. `crash()` sets the logger to `fatal`
    // for its one record and restores the previous level immediately; the first
    // version of that function left it mutated, and a crash-during-drain run
    // silently lost `shutdown complete` — and would have lost the ceiling's
    // level-50 record the same way. `shutdown complete` is level 30, so its
    // presence *after* the level-60 record is the restore, observed.
    expect(written).toContain("shutdown complete");
    expect(written.indexOf("shutdown complete")).toBeGreaterThan(
      written.indexOf("process crashed, exiting"),
    );
  });
});

// ---------------------------------------------------------------------------
// The database pool (Task 2.1.4)
// ---------------------------------------------------------------------------

// **Every test below passes with a database running and with one absent**, and
// that is the story's sixth acceptance criterion rather than an accident. The
// suite is run in both environments and the count does not change: there are no
// `skipIf`s here, because a skipped test reports green and this repository has
// already recorded twice that a suite which silently runs fewer tests is the
// worst failure available (`-t` with a typo exits 0; a `.test.tsx` under a
// `.ts`-only glob is simply not collected).
//
// The one test that *does* care whether a database exists asks the question
// itself and asserts the matching answer, so it is a real assertion in both
// environments rather than an absent one in half of them.

/**
 * Is a PostgreSQL server answering on this address?
 *
 * The same eight-byte SSLRequest `scripts/check-ready.mjs` sends, for the same
 * reason: a successful TCP connect proves only a *listener*, and every
 * PostgreSQL answers this one packet with a single `S` or `N` and no
 * credentials. It is duplicated here rather than imported because that script
 * is plain JavaScript outside this package's tsconfig, and eight bytes is a
 * cheaper copy than a shared module for one caller.
 */
async function postgresAnswers(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let settled = false;

    const finish = (answered: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(answered);
    };

    socket.setTimeout(2000, () => {
      finish(false);
    });
    socket.on("error", () => {
      finish(false);
    });
    socket.on("close", () => {
      finish(false);
    });
    socket.on("connect", () => {
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      socket.write(request);
    });
    socket.on("data", (chunk) => {
      const reply = chunk.length > 0 ? String.fromCharCode(chunk[0] ?? 0) : "";
      finish(reply === "S" || reply === "N");
    });
  });
}

describe("the database pool", () => {
  // Both branches assert, so this is a real test whether or not `pnpm db` is
  // running. What it actually holds is the wiring: that the probe runs at all,
  // that it runs *after* the server is listening, and that its two outcomes are
  // told apart. A test that only ran with a database would be a test nobody on
  // a fresh clone ever executes.
  it("reports the database's reachability at startup, either way", async () => {
    const port = await probeFreePort();
    const server = startServer(port);
    await waitForReady(server);

    const reachable = await postgresAnswers(5432);
    const expected = reachable
      ? "database reachable"
      : "database unreachable, continuing without it";

    // **Waited for rather than slept past, and that correction is Task 2.2.2's
    // rather than a tidy-up.** This was `await delay(200)` on the argument that
    // the entrypoint awaits the probe immediately after `listen()` resolves —
    // which is true of the *ordering* and says nothing about the *duration*.
    // With no database the probe fails in about 3 ms and 200 ms is enormous;
    // with one it has to open a real connection, and that lost a race once
    // under the load of a full `pnpm verify`, taking the chain red on a healthy
    // tree. A fixed sleep in a process test is the shape this repository has
    // already refused twice — `check-ready.mjs` polls and `waitForReady` above
    // polls — so this polls too, and the assertion below is unchanged.
    const readMessages = (): (string | undefined)[] =>
      server.records().map((record) => record.msg);

    const deadline = Date.now() + 10_000;

    while (!readMessages().includes(expected) && Date.now() < deadline) {
      await delay(25);
    }

    const messages = readMessages();

    expect(messages).toContain(expected);

    // And the server is listening before the answer is known, which is the
    // ordering that keeps a slow database out of the startup path.
    expect(
      messages.indexOf("Server listening at http://127.0.0.1:" + String(port)),
    ).toBeLessThan(messages.indexOf(expected));

    server.child.kill("SIGTERM");
    await waitForExit(server);
  });

  // The behaviour this task exists to guarantee, and it is deterministic in
  // every environment because the address is a port nothing is on rather than
  // "whatever the machine happens to have".
  //
  // A process that exits because Postgres is down is a crash-loop on a platform
  // whose liveness probe restarts the replica — and Task 2.1.1 recorded that a
  // Burstable server can make itself unreachable by exhausting its CPU credits,
  // so this is a state the *database* can enter on its own.
  it("starts, serves /health and logs a warning when the database is unreachable", async () => {
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, { DATABASE_PORT: String(databasePort) });

    await waitForReady(server);
    await delay(200);

    const records = server.records();
    const unreachable = records.find(
      (record) => record.msg === "database unreachable, continuing without it",
    );

    if (unreachable === undefined) {
      expect.fail(
        `no unreachable record was written. The server's output was:\n${server.output()}`,
      );
    }

    // `warn` and not `error`: this server is still healthy by `/health`'s own
    // definition, and Task 1.7.4 reserves 50 for a failure the server produced.
    expect(unreachable.level).toBe(40);
    expect(unreachable.err?.code).toBe("ECONNREFUSED");

    // Still serving, which is the whole point.
    const response = await fetch(`http://127.0.0.1:${String(port)}/health`);
    expect(response.status).toBe(200);
    expect(server.exit()).toBeUndefined();

    server.child.kill("SIGTERM");
    await waitForExit(server);
  });

  it("still drains and exits 0 when the database is unreachable", async () => {
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, { DATABASE_PORT: String(databasePort) });

    await waitForReady(server);
    server.child.kill("SIGTERM");

    const exit = await waitForExit(server);

    expect(exit.code).toBe(0);
    expect(server.records().map((record) => record.msg)).toContain(
      "shutdown complete",
    );
  });

  // **The ordering, asserted rather than argued — and this assertion had to be
  // strengthened after it was seen NOT to fail.** A pool closed before
  // `app.close()` resolves would pull connections out from under requests that
  // are still draining, and that failure does not look like an error: it looks
  // like a 500 during a shutdown.
  //
  // The first version of this test bounded the close by `signal received` and
  // `shutdown complete`, and moving the close to the wrong side of
  // `app.close()` **left it green** — both bounds still held, because the whole
  // drain happens between them. So `index.ts` emits a second `debug` record at
  // the moment the HTTP side finishes, and the assertion is that the pool
  // closes between *those two*. That is the general lesson rather than a detail:
  // an ordering assertion needs a marker on each side of the step it is about.
  it("closes the pool after the drain and before the exit", async () => {
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, {
      DATABASE_PORT: String(databasePort),
      LOG_LEVEL: "debug",
    });

    await waitForReady(server);
    server.child.kill("SIGTERM");

    const exit = await waitForExit(server);
    expect(exit.code).toBe(0);

    const messages = server.records().map((record) => record.msg);
    const signalled = messages.indexOf("signal received, shutting down");
    const drained = messages.indexOf("http drained");
    const closed = messages.indexOf("database pool closed");
    const complete = messages.indexOf("shutdown complete");

    expect(signalled).toBeGreaterThanOrEqual(0);
    expect(drained).toBeGreaterThan(signalled);
    expect(closed).toBeGreaterThan(drained);
    expect(complete).toBeGreaterThan(closed);
  });

  it("closes the market stream on SIGTERM, ahead of the pool", async () => {
    // **The outage this asserts is measured rather than hypothetical.**
    // `LIVE-DATA.md` §12.2: the free plan allows ONE connection and §8.2
    // measured that the incumbent wins, so a rolling deploy has the outgoing
    // replica holding the only permitted connection while the incoming one is
    // refused `406`. If the stopping process exits without closing, §6.4
    // measured how long the half-open socket can survive: **4 h 21 min**. The
    // deliberate close is what turns that into `SHUTDOWN_TIMEOUT_MS`.
    //
    // The ordering matters for the same reason the pool's does: a closer that
    // ran after the pool would still be inside the ceiling, but the record
    // travels with the step, so moving the close moves this assertion.
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, {
      DATABASE_PORT: String(databasePort),
      LOG_LEVEL: "debug",
    });

    await waitForReady(server);
    server.child.kill("SIGTERM");

    const exit = await waitForExit(server);
    expect(exit.code).toBe(0);

    const messages = server.records().map((record) => record.msg);
    const drained = messages.indexOf("http drained");
    const stream = messages.indexOf("market stream closed");
    const pool = messages.indexOf("database pool closed");

    // No stream is registered in THIS case, so the closer is a no-op and the
    // record proves only that the shutdown path reaches the close. The case
    // below is the one that proves it closes something.
    expect(stream).toBeGreaterThan(drained);
    expect(pool).toBeGreaterThan(stream);
  });

  it("closes a REGISTERED stream on SIGTERM, in order", async () => {
    // **Task 3.2.9, and it is why the assertion above was not enough.** Until a
    // stream was constructed, `registerMarketStreamCloser` had no caller: the
    // deliberate `SIGTERM` close was dead code and the test above passed
    // against nothing. `LIVE-DATA.md` §12.2 makes that close the mechanism that
    // bounds the every-deploy outage at `SHUTDOWN_TIMEOUT_MS` instead of
    // §6.4's **4 h 21 min**, so a close with nothing behind it bounds nothing.
    //
    // `fixture` rather than `alpaca`, because `verify` has no credential and no
    // network — the point here is that a closer is REGISTERED and RUNS, which
    // is true of any stream.
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, {
      DATABASE_PORT: String(databasePort),
      LOG_LEVEL: "debug",
      MARKET_DATA_PROVIDER: "fixture",
      NON_LIVE_MARKET_DATA: "permitted",
    });

    await waitForReady(server);
    server.child.kill("SIGTERM");

    const exit = await waitForExit(server);
    expect(exit.code).toBe(0);

    const messages = server.records().map((record) => record.msg);

    // A stream really started…
    expect(messages).toContain("market stream started");

    // …and the ordering holds against a closer that has something to close.
    const drained = messages.indexOf("http drained");
    const stream = messages.indexOf("market stream closed");
    const pool = messages.indexOf("database pool closed");

    expect(drained).toBeGreaterThanOrEqual(0);
    expect(stream).toBeGreaterThan(drained);
    expect(pool).toBeGreaterThan(stream);

    // **The gateway closes before the stream, and since Task 3.5.2 that is a
    // statement about two different things rather than a race.** Until then
    // there were TWO subscriptions on one socket — this file's and one inside
    // `market-gateway.ts` — with a closer each, and *which subscriber owns the
    // upstream connection* had no answer but *whichever was registered first*.
    //
    // The order matters in the direction asserted: a browser should be told
    // the feed is going away by a process that **still has a feed**, rather
    // than inferring it from a socket that vanished.
    const gateway = messages.indexOf("market gateway closed");
    expect(gateway).toBeGreaterThanOrEqual(0);
    expect(stream).toBeGreaterThan(gateway);
  });

  it("says goodbye to a browser BEFORE closing its socket", async () => {
    // **§12.2's obligation, and the ordering it needs was found by measurement
    // rather than reasoning.** A shutdown owes a connected browser a `feed`
    // message saying the feed is going away and THEN a close — dropping the
    // socket silently leaves the browser inferring a state from an absence,
    // which is the ambiguity §11.2's thresholds exist to remove.
    //
    // The gateway's closer was originally placed AFTER `app.close()` and the
    // browser received **nothing at all** — no goodbye, no close. Fastify
    // forces upgraded connections shut during its own close (a bare
    // `server.close()` does not, probed directly), so by then there was nothing
    // left to speak to. This test is what stops that ordering regressing.
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, {
      DATABASE_PORT: String(databasePort),
      LOG_LEVEL: "debug",
      MARKET_DATA_PROVIDER: "fixture",
      NON_LIVE_MARKET_DATA: "permitted",
    });

    await waitForReady(server);

    const received: { type: string; status?: string }[] = [];
    const closeCode = await new Promise<number>((resolve, reject) => {
      const socket = new WsWebSocket(
        `ws://127.0.0.1:${String(port)}/market-stream`,
      );
      socket.on("message", (data: Buffer) => {
        const message = JSON.parse(data.toString("utf8")) as {
          type: string;
          feed?: { status: string };
        };
        received.push({
          type: message.type,
          ...(message.feed === undefined
            ? {}
            : { status: message.feed.status }),
        });
        // The snapshot has arrived, so the browser is genuinely attached.
        if (received.length === 1) server.child.kill("SIGTERM");
      });
      socket.on("close", (code: number) => {
        resolve(code);
      });
      socket.on("error", reject);
    });

    await waitForExit(server);

    // The snapshot, then the goodbye, then a close — in that order.
    expect(received[0]?.type).toBe("snapshot");
    expect(
      received.some((m) => m.type === "feed" && m.status === "disconnected"),
    ).toBe(true);
    // 1001 "going away" is the honest code for a shutdown, and it is not 1006:
    // §8.5 measured that an abnormal close carries no intent, and a browser
    // that saw one could not tell a deploy from a network failure.
    expect(closeCode).toBe(1001);

    const messages = server.records().map((record) => record.msg);
    const gateway = messages.indexOf("market gateway closed");
    const drained = messages.indexOf("http drained");

    // **Gateway before the drain**, which is the ordering the measurement
    // forced. A marker travels with its step, so moving the close moves this.
    expect(gateway).toBeGreaterThanOrEqual(0);
    expect(drained).toBeGreaterThan(gateway);
  });

  it("starts no stream when nothing is configured", async () => {
    // The default is `none` and it must stay reachable-by-omission only in the
    // direction that serves NOTHING — `PROVIDER.md` §5.3.
    const port = await probeFreePort();
    const databasePort = await probeFreePort();
    const server = startServer(port, {
      DATABASE_PORT: String(databasePort),
      LOG_LEVEL: "debug",
    });

    await waitForReady(server);
    server.child.kill("SIGTERM");
    await waitForExit(server);

    const messages = server.records().map((record) => record.msg);

    expect(messages).toContain("no market stream configured");
    expect(messages).not.toContain("market stream started");
  });
});
