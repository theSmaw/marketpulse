// **How much of the market one figure can see — Task 4.1.6.**
//
//   node scripts/coverage-curve.mjs [minutes]
//
// ## The question, and why nothing already answers it
//
// Four regions of the Market Overview are **aggregates over a map the live
// feed only partially fills**. `LIVE-DATA.md` §7.6 measured the shape of that
// hole per symbol — **65.1% of minutes for a median name, 2.1% for the worst**
// — and §11.2 measured an ordinary gap of **187 minutes**.
//
// **Neither of those is the number the screen needs.** The owner chose a
// stated freshness window (Task 4.1.1):
//
//     Of the 518 we track, N were heard from in the last M minutes.
//
// So what has to be measured is **N as a function of M, across a session**: a
// window that covers 90% at the open and 60% over lunch is a window that will
// embarrass this screen at 12:30.
//
// ## Why it reads the gateway rather than the store
//
// The obvious cheaper route is the database — `market_bars` holds every stored
// IEX row — and it does not work. **The nightly backfill covers every
// regular-session minute with consolidated SIP**, and the served read prefers
// `sip` where a minute holds both (`LIVE-SESSION.md` §14). So a query after
// the backfill cannot see the IEX holes at all: it sees a complete tape. The
// only place the hole is visible is **while the session is running**, in the
// same map a browser holds.
//
// So this is a second client on **our own gateway** — never on Alpaca, whose
// free plan plan allows one connection and production has it. A second gateway
// client costs a duplicate copy of each frame and nothing scarce, which is the
// discipline `weekend-watch.mjs` and `session-watch.mjs` both took.
//
// ## What it records, and what it cannot
//
// Every minute it writes one sample: for each window in `WINDOWS`, how many of
// the subscribed securities have an observation whose **`startsAt` is within
// that window of now**. It keys on the bar's own instant rather than on
// arrival, because that is what a browser's map holds and what a denominator
// would be computed from.
//
// **It cannot see three things, and the figures are a floor because of them.**
// A revision for a minute already superseded never reaches any browser
// (`current-market-state` drops it), so late corrections are invisible here as
// they are there. A security that has never traded in this process's lifetime
// is absent rather than stale — an empty map after a restart is a **legitimate
// value**, not a degraded one. And the watcher runs on a laptop over a
// domestic link, so a dropout here is this client's and not the deployment's.
//
// Run it, read the findings, delete it — `ALPACA.md` §11's shape, and the
// findings must quote at least one frame verbatim or the evidence dies with
// the script.

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import {
  MARKET_STREAM_PATH,
  MARKET_STREAM_PROTOCOL_VERSION,
  marketWallClockAt,
} from "../packages/shared/dist/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const BACKEND =
  process.env.E2E_DEPLOYED_BACKEND_ORIGIN ??
  "https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io";

const RUN_FOR_MS = Number(process.argv[2] ?? 60 * 8) * 60_000;

/** The windows a sentence could plausibly carry, in minutes. */
const WINDOWS = [1, 2, 5, 15, 60];

const SAMPLE_EVERY_MS = 60_000;

const OUT = resolve(REPO_ROOT, ".capture/coverage");
mkdirSync(OUT, { recursive: true });

const startedAt = new Date();
const stamp = startedAt.toISOString().slice(0, 19).replace(/[:T]/gu, "-");
const LOG = resolve(OUT, `coverage-${stamp}.jsonl`);

const record = (row) => {
  appendFileSync(
    LOG,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`,
  );
};

const pad = (value) => String(value).padStart(2, "0");

const et = (instant) => {
  const wall = marketWallClockAt(instant);
  return (
    `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)} ` +
    `${wall.offset.abbreviation}`
  );
};

/** Symbol → the instant of the newest observation seen for it. */
const newest = new Map();

const counts = { snapshot: 0, bars: 0, feed: 0, observations: 0 };
let reconnects = 0;
let symbols = [];

/** The first `bars` frame, kept whole — the evidence the findings need. */
let keptFrame = false;

async function universe() {
  const response = await fetch(`${BACKEND}/securities`, {
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  const list = body.securities ?? body;
  return list.map((security) => security.symbol);
}

let socket;
let stopping = false;

function connect() {
  if (stopping) return;

  socket = new WebSocket(
    `${BACKEND.replace("https:", "wss:")}${MARKET_STREAM_PATH}`,
  );

  socket.addEventListener("open", () => {
    record({ kind: "socket-open", symbols: symbols.length });
    socket.send(
      JSON.stringify({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols,
      }),
    );
  });

  socket.addEventListener("message", (event) => {
    let frame;
    try {
      frame = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (frame.type === "feed") {
      counts.feed += 1;
      record({ kind: "feed", feed: frame.feed });
      return;
    }

    if (frame.type !== "snapshot" && frame.type !== "bars") return;
    counts[frame.type] += 1;

    const observations = frame.observations ?? {};
    const seen = Object.entries(observations);

    if (frame.type === "bars" && seen.length > 0 && !keptFrame) {
      keptFrame = true;
      writeFileSync(
        resolve(OUT, `bars-frame-${stamp}.json`),
        `${JSON.stringify(frame, null, 2)}\n`,
      );
    }

    for (const [symbol, observation] of seen) {
      counts.observations += 1;
      const at = Date.parse(String(observation.startsAt));
      if (Number.isNaN(at)) continue;
      const held = newest.get(symbol);
      if (held === undefined || at > held) newest.set(symbol, at);
    }
  });

  socket.addEventListener("close", () => {
    if (stopping) return;
    reconnects += 1;
    record({ kind: "socket-close" });
    setTimeout(connect, 2_000);
  });

  socket.addEventListener("error", () => {
    // `close` always follows. Nothing to do but avoid an unhandled event.
  });
}

/** One sample: how many of the universe fall inside each window. */
function sample() {
  const now = Date.now();
  const within = {};

  for (const minutes of WINDOWS) {
    const cutoff = now - minutes * 60_000;
    let n = 0;
    for (const at of newest.values()) if (at >= cutoff) n += 1;
    within[String(minutes)] = n;
  }

  record({
    kind: "sample",
    et: et(new Date(now)),
    tracked: symbols.length,
    held: newest.size,
    within,
  });

  return within;
}

function summarise(why) {
  // **The curve is computed from the log rather than from memory**, so a run
  // that was killed still summarises: the JSONL is the record and this is a
  // reading of it.
  //
  // Per window it reports the **lowest, the median and the highest** count
  // seen, and the by-hour shape — because the shape is the point. A mean would
  // hide exactly the lunchtime thinness this measurement exists to find, and a
  // single figure would let somebody pick a window that is true at 09:31 and
  // embarrassing at 12:30.
  const samples = [];

  try {
    for (const line of readFileSync(LOG, "utf8").split("\n")) {
      if (line.trim() === "") continue;
      const row = JSON.parse(line);
      if (row.kind === "sample") samples.push(row);
    }
  } catch {
    // No log to read is a legitimate outcome for a run that never sampled.
  }

  const quantile = (values, q) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  };

  const curve = Object.fromEntries(
    WINDOWS.map((minutes) => {
      const counted = samples.map((row) => row.within[String(minutes)] ?? 0);
      return [
        `${String(minutes)}m`,
        {
          n: counted.length,
          min: counted.length > 0 ? Math.min(...counted) : null,
          median: quantile(counted, 0.5),
          max: counted.length > 0 ? Math.max(...counted) : null,
        },
      ];
    }),
  );

  // The by-hour shape, keyed on market time, so lunchtime is visible as
  // lunchtime rather than as a row number.
  const byHour = {};
  for (const row of samples) {
    const hour = String(row.et ?? "").slice(0, 2);
    (byHour[hour] ??= []).push(row.within);
  }

  const shape = Object.fromEntries(
    Object.entries(byHour).map(([hour, rows]) => [
      hour,
      Object.fromEntries(
        WINDOWS.map((minutes) => [
          `${String(minutes)}m`,
          quantile(
            rows.map((within) => within[String(minutes)] ?? 0),
            0.5,
          ),
        ]),
      ),
    ]),
  );

  const summary = {
    samples: samples.length,
    curve,
    shapeByMarketHour: shape,
    why,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    backend: BACKEND,
    tracked: symbols.length,
    windowsMinutes: WINDOWS,
    frames: { ...counts },
    reconnects,
    log: LOG,
    note:
      "Every figure is a FLOOR: a revision for a superseded minute never " +
      "reaches a browser and is invisible here too, and a security that has " +
      "not traded in this process's lifetime is absent rather than stale.",
  };

  writeFileSync(
    resolve(OUT, `summary-${stamp}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`\n${JSON.stringify(summary, null, 2)}\n`);
}

function stop(why) {
  if (stopping) return;
  stopping = true;
  try {
    socket?.close(1000, "done");
  } catch {
    // Closing a socket that is already gone is not a failure here.
  }
  summarise(why);
  process.exit(0);
}

process.on("SIGINT", () => {
  stop("interrupted");
});

symbols = await universe();

const feed = await (async () => {
  try {
    const response = await fetch(`${BACKEND}/diagnostics/feed`);
    return await response.json();
  } catch {
    return null;
  }
})();

process.stdout.write(
  `\nCoverage curve — ${BACKEND}\n` +
    `  started ${et(startedAt)}, market ${feed?.marketOpen === true ? "OPEN" : "closed"}\n` +
    `  ${String(symbols.length)} securities, windows ${WINDOWS.join("/")} min, ` +
    `sampling every ${String(SAMPLE_EVERY_MS / 1000)} s\n` +
    `  running for ${String(RUN_FOR_MS / 60_000)} minutes\n` +
    `  log ${LOG}\n\n`,
);

if (feed?.marketOpen !== true) {
  process.stdout.write(
    "  NOTE: the market is shut, so every window will read whatever the\n" +
      "  snapshot holds and then stop moving. That IS the rehearsal — it\n" +
      "  proves the subscribe, the frame reader and the sampler before the\n" +
      "  one moment they cannot be retried.\n\n",
  );
}

connect();

const deadline = Date.now() + RUN_FOR_MS;
let ticks = 0;

while (Date.now() < deadline && !stopping) {
  await new Promise((resolve_) => setTimeout(resolve_, SAMPLE_EVERY_MS));
  const within = sample();
  ticks += 1;

  if (ticks % 5 === 0 || ticks <= 2) {
    process.stdout.write(
      `  ${et(new Date())}  held=${String(newest.size)}/${String(symbols.length)}  ` +
        WINDOWS.map((m) => `${String(m)}m=${String(within[String(m)])}`).join(
          " ",
        ) +
        `\n`,
    );
  }
}

stop("deadline");
