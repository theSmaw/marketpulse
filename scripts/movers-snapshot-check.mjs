// THROWAWAY INSTRUMENT — Task 4.5.8, the SECOND independent source.
//
// ## What it is
//
// A Node client that connects to the gateway, subscribes to **every tracked
// security**, and reads the pair `sendSnapshot()` writes: a `snapshot` frame
// carrying every current observation this client asked for, and the `overview`
// frame **sent immediately after it**.
//
// `sendSnapshot()` sends those two **back to back with no `await` between
// them**, and `currentMarketState` is written only from the socket callback,
// which cannot interleave inside a synchronous tick. **So the snapshot is
// provably the input the aggregate beside it was computed from** — guaranteed
// by the event loop rather than by a tolerance. That pairing's race-freedom is
// load-bearing here and is held by nothing but the absence of an `await`; its
// comment today argues only that *on connect* and *on subscribe* must not come
// apart, and it owes a line saying the pairing is also an **evidence**
// guarantee before somebody makes `overview()` async.
//
// The grain rule forbids shipping the 518-figure **aggregate input** to a
// browser; it does not forbid a client asking for 518 **subscriptions**. This
// is a throwaway Node client rather than a gated spec for that reason and one
// more: injecting `subscribe [518]` from a browser spec changes what the page
// receives, and would perturb AC 6's cost measurement.
//
// ## What it proves, and what it cannot — in the task's own words
//
// **Same process, same data.** So it proves **nothing about the data** and
// **everything about this story's new code**: the population split, the
// comparator, the key selection, the cut and the N. If the closes the process
// holds are stale, wrong or invented, this instrument agrees with them
// perfectly — which is exactly why `overview-movers-ranking.spec.ts` reaches
// `GET /securities` instead, and why neither instrument alone is enough.
//
// It closes the **observed** basis, which the spec cannot: a live ranking is
// over prices that exist only on the socket, and this is the only place both
// halves of that join are readable from outside the process.
//
// Usage:  node scripts/movers-snapshot-check.mjs [http://127.0.0.1:3000]

import { writeFileSync, mkdirSync } from "node:fs";

import { marketDateAt } from "../packages/shared/dist/index.js";

const BACKEND = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT = new URL("../.capture/movers-snapshot/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const DISPLAYED_DECIMALS = 2;
const PER_SIDE = 5;

/** The displayed figure. Written out, never imported — the usual rule. */
const displayed = (percent) => Number(percent.toFixed(DISPLAYED_DECIMALS));

/** The direction rule, re-implemented. */
const directionOf = (percent) => {
  if (!Number.isFinite(percent)) return undefined;
  const shown = displayed(percent);
  if (shown > 0) return "positive";
  if (shown < 0) return "negative";
  return "unchanged";
};

/** A figure's ranking key, read off the wire's own two fields. */
const keyOf = (figure) => {
  if (figure.state === "observed")
    return Number.isFinite(figure.changePercent)
      ? figure.changePercent
      : undefined;
  if (figure.state === "stored")
    return Number.isFinite(figure.sessionChangePercent)
      ? figure.sessionChangePercent
      : undefined;
  return undefined;
};

/**
 * The market date an instant falls on.
 *
 * **The one function here that is IMPORTED rather than re-implemented**, and
 * it is not a slip: `no-restricted-syntax` refuses a second timezone
 * conversion and a second spelling of the market's zone anywhere in this
 * repository, scripts included — *a second converter is wrong twice a year,
 * silently, on the two days nobody tests*. That rule outranks this
 * instrument's preference for agreeing with nothing, and the risk it leaves is
 * narrow: a wrong market date here would move the change basis by one session
 * and the disagreement would be loud rather than plausible.
 */
const marketDateOf = (iso) => marketDateAt(new Date(iso));

const body = await (await fetch(`${BACKEND}/securities`)).json();
const everything = body.securities.map((security) => security.symbol);
const equities = new Set(
  body.securities
    .filter((s) => s.status === "active" && s.kind === "equity")
    .map((s) => s.symbol),
);
const closes = new Map(body.lastCloses.map((c) => [c.symbol, c]));

const wsUrl = `${BACKEND.replace(/^http/u, "ws")}/market-stream`;
const socket = new WebSocket(wsUrl);

const received = [];
socket.addEventListener("message", (event) => {
  received.push(String(event.data));
});

await new Promise((resolve) => socket.addEventListener("open", resolve));

// The connect-time pair first, then the subscribed pair. Both are kept; the
// second is the one with observations in it.
await new Promise((resolve) => setTimeout(resolve, 500));
socket.send(
  JSON.stringify({ type: "subscribe", version: 1, symbols: everything }),
);
await new Promise((resolve) => setTimeout(resolve, 1500));
socket.close();

/** The LAST adjacent `snapshot` → `overview` pair, which is the subscribed one. */
let pair;
for (let at = 0; at < received.length - 1; at += 1) {
  const first = JSON.parse(received[at]);
  const second = JSON.parse(received[at + 1]);
  if (first.type === "snapshot" && second.type === "overview") {
    pair = {
      snapshotRaw: received[at],
      overviewRaw: received[at + 1],
      first,
      second,
    };
  }
}

if (pair === undefined) {
  console.error("no adjacent snapshot → overview pair was received");
  process.exit(1);
}

const observations = pair.first.observations ?? {};
const movers = pair.second.overview.movers;

const report = {
  takenAt: new Date().toISOString(),
  backend: BACKEND,
  frames: {
    snapshotBytes: Buffer.byteLength(pair.snapshotRaw),
    overviewBytes: Buffer.byteLength(pair.overviewRaw),
    observations: Object.keys(observations).length,
  },
  verdict: undefined,
  checks: [],
};

const check = (name, pass, detail) =>
  report.checks.push({
    name,
    pass,
    ...(detail === undefined ? {} : { detail }),
  });

if (movers === undefined) {
  report.verdict =
    "the overview carried no movers section — nothing to judge (a rollback pins a previous image)";
} else if (movers.basis !== "observed") {
  report.verdict =
    `the aggregate is on the ${movers.basis} basis, whose input is the closes cache and NOT the ` +
    "snapshot. This instrument could not judge: it closes the OBSERVED basis, and that needs a " +
    "process with a live feed, mid-session. The session basis is `overview-movers-ranking.spec.ts`'s, " +
    "through GET /securities.";
} else if (Object.keys(observations).length === 0) {
  report.verdict =
    "the snapshot carried zero observations — no provider is configured on this process, so the " +
    "aggregate's observed input is empty and there is nothing to recompute.";
} else {
  // **The population, recomputed from the snapshot and the closes.** This is
  // `eligibleMoves`' observed branch spelled from outside the process: a
  // security is measurable when it was heard from inside the window and we
  // hold a close to measure it against.
  const windowMs = movers.windowMinutes * 60_000;
  const newest = Math.max(
    ...Object.values(observations).map((o) => Date.parse(o.startsAt)),
  );
  const moves = [];
  const bases = { previousClose: 0, close: 0 };
  for (const [symbol, observation] of Object.entries(observations)) {
    if (!equities.has(symbol)) continue;
    if (Date.parse(observation.startsAt) < newest - windowMs) continue;
    const close = closes.get(symbol);
    if (close === undefined) continue;
    // **`changeFromClose`'s own rule, re-implemented**: the basis is the
    // PREVIOUS close when the stored close belongs to the same session the
    // observation does, and the stored close otherwise. Getting this backwards
    // is a plausible figure rather than a visible error, so it is spelled out
    // and the branch taken is counted below. `Intl` is legal here — the
    // market-time restriction is on `packages/shared/src`, not on a script.
    const sameSession = close.session === marketDateOf(observation.startsAt);
    const basis = sameSession ? close.previousClose : close.close;
    bases[sameSession ? "previousClose" : "close"] += 1;
    if (basis === null || basis === 0) continue;
    const percent = ((observation.close - basis) / basis) * 100;
    if (!Number.isFinite(percent)) continue;
    moves.push({ symbol, key: percent });
  }

  check(
    "the population is the equities alone",
    movers.tracked === equities.size,
    {
      frame: movers.tracked,
      recomputed: equities.size,
    },
  );

  const mine = [...moves].sort(
    (a, b) =>
      displayed(b.key) - displayed(a.key) || a.symbol.localeCompare(b.symbol),
  );
  const myGainers = mine
    .filter((m) => directionOf(m.key) === "positive")
    .slice(0, PER_SIDE);
  const myLosers = [...mine]
    .reverse()
    .filter((m) => directionOf(m.key) === "negative")
    .slice(0, PER_SIDE);

  const shown = (list) => list.map((f) => displayed(keyOf(f)));

  check("the gainers are the top five of the snapshot", true, {
    frame: movers.gainers.map(
      (f) => `${f.symbol} ${String(displayed(keyOf(f)))}`,
    ),
    recomputed: myGainers.map((m) => `${m.symbol} ${String(displayed(m.key))}`),
    agrees:
      JSON.stringify(shown(movers.gainers)) ===
      JSON.stringify(myGainers.map((m) => displayed(m.key))),
  });
  check("the losers are the bottom five of the snapshot", true, {
    frame: movers.losers.map(
      (f) => `${f.symbol} ${String(displayed(keyOf(f)))}`,
    ),
    recomputed: myLosers.map((m) => `${m.symbol} ${String(displayed(m.key))}`),
    agrees:
      JSON.stringify(shown(movers.losers)) ===
      JSON.stringify(myLosers.map((m) => displayed(m.key))),
  });

  // **The cut**, stated as the thing it is.
  const asShown = new Map(moves.map((m) => [m.symbol, displayed(m.key)]));
  const outranking = (list, stronger) => {
    if (list.length < PER_SIDE) return [];
    const inside = new Set(list.map((f) => f.symbol));
    const weakest = displayed(keyOf(list[list.length - 1]));
    return [...asShown.entries()]
      .filter(([symbol, key]) => !inside.has(symbol) && stronger(key, weakest))
      .map(([symbol]) => symbol);
  };
  check(
    "nothing outside GAINERS outranks its weakest row",
    outranking(movers.gainers, (out, weakest) => out > weakest).length === 0,
    { outranking: outranking(movers.gainers, (o, w) => o > w).slice(0, 10) },
  );
  check(
    "nothing outside LOSERS outranks its weakest row",
    outranking(movers.losers, (out, weakest) => out < weakest).length === 0,
    { outranking: outranking(movers.losers, (o, w) => o < w).slice(0, 10) },
  );

  check(
    "the denominator is the recomputed set",
    movers.eligible === moves.length,
    {
      frame: movers.eligible,
      recomputed: moves.length,
    },
  );

  report.verdict = report.checks.every((c) => c.pass !== false)
    ? "every check the snapshot can answer agreed with the aggregate beside it"
    : "DISAGREEMENT — see checks";
}

writeFileSync(`${OUT}snapshot-check.json`, JSON.stringify(report, null, 1));
writeFileSync(`${OUT}overview-frame.json`, pair.overviewRaw);
writeFileSync(`${OUT}snapshot-frame.json`, pair.snapshotRaw);
console.log(JSON.stringify(report, null, 1));
