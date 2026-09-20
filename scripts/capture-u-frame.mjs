// Capture one verbatim `updatedBars` frame — `docs/GAPS.md` entry 7.
//
// **This exists because an owner that is a finished task never fires.** The
// capture has been re-pointed twice: Task 3.2.5 built the client and nothing
// constructed one, Task 3.2.9 ran at 06:10 ET with the market shut. Task 3.3.7
// could not run it either — the story closed at 23:26 ET on a Friday. So the
// intention is now a command instead of a memory, and the trigger in GAPS names
// this file.
//
//   node scripts/capture-u-frame.mjs
//
// It refuses out of hours, refuses if anything already holds the connection,
// writes every frame it sees to `.capture/`, and stops at the first `u`.
//
// ## The pre-flight is the part not to remove
//
// The 2026-09-18 attempt was refused `406 connection limit exceeded` by **a
// stale process of our own** — a dry-run that never exited and outlived its own
// deleted source by a day (`LIVE-DATA.md` §8.2). The free plan allows ONE
// connection, so anything else of ours holding it makes this fail in a way that
// reads like a vendor problem. **A 406 here is fatal and says so**, rather than
// retrying into the same wall.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The BUILT output, by path: this is a root script and the root package
// declares no workspace dependency. `pnpm build` first.
import { marketSessionStateAt } from "../packages/shared/dist/index.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

// **`ws` and the shared package are reached by path**, because this is a root
// script and the root package declares neither — `CLAUDE.md`'s rule is that a
// package declares only what its source imports, and a one-off tool is not a
// reason to widen the root's dependencies. `pnpm build` first.
// `ws` is CommonJS, so the namespace has one useful key and it is `default`.
const { default: WebSocket } = await import(
  resolve(ROOT, "apps/backend/node_modules/ws/index.js")
);
const OUT = resolve(ROOT, ".capture");
const URL = "wss://stream.data.alpaca.markets/v2/iex";

/** Read the backend's env file without importing its config (this is a tool). */
function credential() {
  const text = readFileSync(resolve(ROOT, "apps/backend/.env"), "utf8");
  const read = (name) =>
    text.match(new RegExp(`^${name}=(.*)$`, "mu"))?.[1]?.trim();

  const key = read("ALPACA_API_KEY_ID");
  const secret = read("ALPACA_API_SECRET_KEY");

  if (!key || !secret) {
    throw new Error(
      "No Alpaca credential in apps/backend/.env — this capture needs one.",
    );
  }

  return { key, secret };
}

/**
 * Refuse if anything of ours is already connected.
 *
 * Deliberately crude and deliberately loud: it looks for *other* node processes
 * whose command line mentions this file or the words a previous instrument
 * used. It cannot see a process on another machine, which is why the 406
 * handler below is the second half rather than a belt-and-braces duplicate.
 */
function readProcessTable() {
  try {
    return execFileSync("ps", ["-Ao", "pid=,command="], { encoding: "utf8" });
  } catch {
    console.warn("! could not read the process table — skipping the scan");
    return undefined;
  }
}

function refuseIfSomethingElseHoldsIt() {
  const listing = readProcessTable();
  if (listing === undefined) return;

  const mine = process.pid;
  const suspects = listing
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(.*)$/u))
    .filter((match) => match !== null)
    .map(([, pid, command]) => ({ pid: Number(pid), command }))
    // **The executable must BE node**, not merely a command line mentioning
    // it. The first draft matched the shell that invoked this very script and
    // refused to run at all — a pre-flight that always fails is worse than
    // none, because the next person deletes it.
    .filter(({ command }) => /^\S*node(?:$|\s)/u.test(command))
    .filter(({ command }) =>
      // **Socket HOLDERS only.** `weekend` used to be enough — the retired
      // `weekend.mjs` held one — but `weekend-watch.mjs` polls
      // `/diagnostics/feed` over HTTP and holds nothing, and matching it
      // refused a capture for no reason. That is the second time this scan has
      // blocked something harmless, and a pre-flight that cries wolf is one the
      // next person deletes. Name the file, not the word.
      /capture-u-frame\.mjs|weekend\.mjs|alpaca-stream|stream-probe/u.test(
        command,
      ),
    )
    .filter(({ pid }) => pid !== mine);

  if (suspects.length > 0) {
    console.error(
      "REFUSING: another process of ours may already hold the connection.\n" +
        suspects
          .map(({ pid, command }) => `  ${String(pid)}  ${command}`)
          .join("\n") +
        "\n\nThe free plan allows ONE connection. Kill these and try again —\n" +
        "LIVE-DATA.md §8.2 is the day this cost a capture.",
    );
    process.exit(1);
  }
}

/**
 * Refuse out of hours.
 *
 * **Through `@marketpulse/shared` rather than an `Intl` call here**, and the
 * lint rule is what made that non-optional: `market-time.ts` is the one module
 * that converts between a UTC instant and market time, because a second
 * converter is wrong twice a year, silently, on the two days nobody tests. The
 * first draft of this file spelled the timezone itself and `pnpm lint` refused
 * it — which is the rule paying for itself in a throwaway tool.
 */
function refuseOutOfHours() {
  const state = marketSessionStateAt(new Date());

  if (state.status === "open") return;

  console.error(
    `REFUSING: the market is ${state.status.replace("_", " ")}.\n\n` +
      "A `u` frame is a REVISION of a bar, so it exists only while bars are\n" +
      "being produced. §6.6 measured 76 minutes of legitimate silence out of\n" +
      "hours — waiting here would look exactly like a broken capture.\n" +
      "Run this between 09:30 and 16:00 ET on a trading day.",
  );
  process.exit(1);
}

const SYMBOLS = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const WATCH = SYMBOLS.length > 0 ? SYMBOLS : ["*"];

/**
 * `--handshake` — connect, authenticate, subscribe, and stop.
 *
 * **It exists so that the capture is not the first time this file opens a
 * socket.** The handshake works out of hours (§6.6: the connection is up and
 * heartbeating while no bars flow), so everything except the wait can be proven
 * on a Friday night — which is exactly when this was written. It skips the
 * session check and **not** the connection check, because §8.2's failure is
 * about connections rather than about hours.
 */
const HANDSHAKE_ONLY = process.argv.includes("--handshake");

refuseIfSomethingElseHoldsIt();
if (!HANDSHAKE_ONLY) refuseOutOfHours();

mkdirSync(OUT, { recursive: true });

const { key, secret } = credential();
const started = Date.now();
const log = [];
const socket = new WebSocket(URL);

const record = (raw) => {
  log.push({ atMs: Date.now() - started, raw });
  writeFileSync(
    resolve(OUT, "frames.jsonl"),
    log.map((entry) => JSON.stringify(entry)).join("\n"),
  );
};

const finish = (code) => {
  console.log(
    `\n${String(log.length)} frames written to .capture/frames.jsonl`,
  );
  socket.close();
  process.exit(code);
};

socket.on("open", () => {
  // **Not a connected state** (§4.5): `/v2/sip` opens and greets identically
  // and only refuses at authentication. The handshake is frames, not events.
  console.log(`socket open on ${URL} — waiting for the greeting`);
});

socket.on("message", (data) => {
  const raw = data.toString();
  record(raw);

  let frames;
  try {
    frames = JSON.parse(raw);
  } catch {
    console.warn("! unparseable frame:", raw.slice(0, 200));
    return;
  }

  for (const frame of Array.isArray(frames) ? frames : [frames]) {
    if (frame.T === "error") {
      // §8.2: 406 is the one that must be read as *something else of ours is
      // connected* rather than as a transient.
      console.error(`\nERROR FRAME: ${raw}`);
      if (frame.code === 406) {
        console.error(
          "\n406 is `connection limit exceeded`. The free plan allows ONE\n" +
            "connection and something else of ours has it — a running backend,\n" +
            "or a stale process the scan above could not see. This is the exact\n" +
            "failure LIVE-DATA.md §8.2 records. Stop it and run again.",
        );
      }
      finish(1);
    }

    if (frame.T === "success" && frame.msg === "connected") {
      // §4.1's handshake: the server greets first, and auth is a frame.
      console.log("greeted; authenticating");
      socket.send(JSON.stringify({ action: "auth", key, secret }));
    }

    if (frame.T === "success" && frame.msg === "authenticated") {
      console.log("authenticated; subscribing to bars and updatedBars");
      socket.send(
        JSON.stringify({
          action: "subscribe",
          bars: WATCH,
          updatedBars: WATCH,
        }),
      );
    }

    if (frame.T === "subscription") {
      console.log(
        `subscribed: bars=${String(frame.bars?.length ?? 0)} ` +
          `updatedBars=${String(frame.updatedBars?.length ?? 0)}`,
      );

      if (HANDSHAKE_ONLY) {
        console.log("\n--handshake: the path works. Stopping before the wait.");
        finish(0);
      }
    }

    if (frame.T === "b") process.stdout.write("b");

    if (frame.T === "u") {
      console.log("\n\n=== THE FRAME THIS EXISTS FOR — verbatim ===\n");
      console.log(raw);
      console.log("\n=== the `u` object alone ===\n");
      console.log(JSON.stringify(frame));
      writeFileSync(resolve(OUT, "u-frame.json"), raw);
      console.log("\nwritten to .capture/u-frame.json");
      finish(0);
    }
  }
});

socket.on("close", () => {
  console.log("\nsocket closed");
  finish(1);
});

socket.on("error", (error) => {
  console.error("\nsocket error:", String(error));
  finish(1);
});

process.on("SIGINT", () => {
  finish(1);
});
