// The weekend hold, observed rather than held — Story 3.11's measurement.
//
//   node scripts/weekend-watch.mjs [minutes]
//
// ## What it is for
//
// §9.3 decided the Alpaca socket is held **always**: one connection, opened at
// boot, never deliberately closed. **The longest hold ever achieved is 7.77
// hours. A weekend is 56+.** So *always* is validated to less than a seventh of
// the interval it claims.
//
// Story 3.1 built `weekend.mjs`, proved it, and the owner chose not to run it —
// the measurement went to Story 3.11 with a trigger: **the first time a real
// socket runs in the deployed backend.** That has fired. The deployment reports
// `{"provider":"alpaca","feed":"iex",…}`, which is also why a developer machine
// is refused `406` (`docs/GAPS.md` entry 7).
//
// ## This is a DIFFERENT instrument from the one that was retired, and the
// difference bounds what it can conclude
//
// `weekend.mjs` **held the socket**. This **watches the one production is
// already holding**, over HTTP. That is the whole reason it can run at all —
// the free plan's single connection is taken, so holding a second is refused.
//
// **What it can see:** whether the hold survives 56 hours, and when it breaks,
// to within one poll plus §11.2's 165 s threshold.
//
// **What it cannot see, and must not be written up as if it could:** the close
// code, the close latency (§8.5's discriminator — ~1 ms our own link, ~6 s a
// rude client, ~30 s `ws@8` on a corpse), or the error frame. Those belong to
// the socket's owner and this is not it.
//
// **And one thing it can see that the held version could not:** whether the
// backend *recovers* on its own, because it watches across a death rather than
// dying with it.
//
// ## The two sentinels, kept from `weekend.mjs`'s design
//
// A death with a clean network and no clock jump is the finding; anything else
// is an artefact.
//
// - **A monotonic-vs-wall tick**, so a suspended laptop is a recorded fact with
//   a duration rather than an unexplained gap.
// - **A reachability probe fired at the moment of any failure**, because this
//   observer's own network dying looks exactly like the thing it is watching
//   for — and over HTTP it is *more* likely, not less.

import { mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const OUT = resolve(ROOT, ".capture/weekend");

const BACKEND =
  "https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io";
const FEED = `${BACKEND}/diagnostics/feed`;

/** One minute. The backend calls its own feed dead after 165 s (§11.2), so a
 *  death is visible within about four minutes of happening. */
const EVERY_MS = 60_000;

/** A gap larger than this between monotonic and wall time is a suspension. */
const SUSPEND_TOLERANCE_MS = 5_000;

const RUN_FOR_MS = Number(process.argv[2] ?? 60 * 56) * 60_000;

mkdirSync(OUT, { recursive: true });
const LOG = resolve(
  OUT,
  `watch-${new Date().toISOString().slice(0, 10)}.jsonl`,
);

const record = (row) => {
  appendFileSync(LOG, `${JSON.stringify(row)}\n`);
};

/**
 * Is it us or is it them?
 *
 * Fired only on a failure, so the ordinary case costs nothing. Alpaca's own
 * REST host answers without a credential on an unauthenticated path, which is
 * enough to say *the internet works from here*.
 */
async function reachability() {
  const probe = async (url) => {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });
      return response.status;
    } catch (error) {
      return `unreachable: ${String(error).slice(0, 80)}`;
    }
  };

  return {
    alpaca: await probe("https://data.alpaca.markets"),
    azure: await probe(BACKEND),
  };
}

async function sample() {
  try {
    const response = await fetch(FEED, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      return { ok: false, http: response.status, probe: await reachability() };
    }
    return { ok: true, feed: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: String(error).slice(0, 120),
      probe: await reachability(),
    };
  }
}

const started = Date.now();
const startedMono = performance.now();
let lastWall = started;
let lastMono = startedMono;
let previous;

process.stderr.write(
  `watching ${FEED}\nevery ${String(EVERY_MS / 1000)}s for ${String(Math.round(RUN_FOR_MS / 3_600_000))}h\n` +
    `writing ${LOG}\n\n`,
);

while (Date.now() - started < RUN_FOR_MS) {
  const wall = Date.now();
  const mono = performance.now();

  // The suspension sentinel: wall time moved further than monotonic did.
  const drift = wall - lastWall - (mono - lastMono);
  if (Math.abs(drift) > SUSPEND_TOLERANCE_MS) {
    const row = {
      at: new Date(wall).toISOString(),
      kind: "suspended",
      driftMs: Math.round(drift),
    };
    record(row);
    process.stderr.write(
      `\n! machine suspended for ~${String(Math.round(drift / 1000))}s\n`,
    );
  }
  lastWall = wall;
  lastMono = mono;

  const result = await sample();
  const status = result.ok ? result.feed.status : `poll-failed`;

  record({
    at: new Date(wall).toISOString(),
    elapsedH: Number(((wall - started) / 3_600_000).toFixed(3)),
    status,
    ...(result.ok ? { feed: result.feed } : result),
  });

  if (status !== previous) {
    process.stderr.write(
      `\n${new Date(wall).toISOString()}  ${String(previous ?? "(start)")} -> ${status}` +
        (result.ok ? "" : `  ${JSON.stringify(result.probe)}`) +
        "\n",
    );
    previous = status;
  } else {
    process.stderr.write(".");
  }

  await new Promise((r) => setTimeout(r, EVERY_MS));
}

process.stderr.write(`\ndone. ${LOG}\n`);
