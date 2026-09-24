// **The live-session sitting, instrumented — Stories 3.4, 3.5 and 3.8 at once.**
//
//   node scripts/session-watch.mjs [minutes] [--browser] [--every <minutes>]
//
// ## What this is for, and why it is one instrument rather than three
//
// `LIVE-REHEARSAL.md` records that **three stories are waiting on one sitting**
// and that the scarce thing is the **connection**, not the attention: the free
// Alpaca plan holds one, the deployment has it, and a sitting taken for one
// story and not the others spends the scarce thing twice. Task 3.4.10 carries
// the combined list — eight items — and this script exists to take as many of
// them as a machine can while a person takes the ones only a person can.
//
// | Item                                                    | Owner  | Here?                    |
// | ------------------------------------------------------- | ------ | ------------------------ |
// | the extended-hours mark on a real bar (04:00–09:30 ET)  | 3.4.10 | **yes** — socket + page  |
// | a genuinely quiet minute                                | 3.4.10 | **yes** — socket         |
// | a real correction, both halves                          | 3.4.10 | **yes** — socket, verbatim |
// | count the corrections, against §14.1's 0.064%           | 3.8.7  | **yes** — socket         |
// | one vendor glance: a frame stamped outside a trading day| 3.4.10 | **yes** — socket         |
// | a mid-session reload that keeps today's chart           | 3.8.10 | **yes** — `--browser`    |
// | the two-feed source note, from production               | 3.8.10 | **yes** — API + `--browser` |
// | `pnpm probe` with the market open                       | 3.4.10 | **no** — run it yourself |
//
// The last one is deliberately not here. `pnpm probe` is a documented tool with
// its own output shape and its own four viewports; reimplementing it inside an
// instrument that will be deleted is how a measurement ends up in a format
// nobody can compare to the one before it. Run it against the deployed pair
// while this is running.
//
// ## What it watches, and what it does NOT hold
//
// **It watches the socket production is already holding, from the outside**, as
// a second browser client on our own gateway — `wss://<backend>/market-stream`.
// It never dials Alpaca. That is the same discipline `weekend-watch.mjs` took
// and for the same reason: the vendor connection is production's and a second
// one is refused `406`.
//
// A second gateway client costs a duplicate copy of each frame's subscribed
// symbols and nothing scarce. It subscribes to the **whole tracked universe**,
// which is what the securities table does anyway — and which is necessary
// rather than greedy, because the correction rate is the point: `LIVE-DATA.md`
// §14.1 measured **0.064% of bars**, so ten symbols over a session would be
// expected to produce **one or two** corrections and 518 produce dozens. A
// count taken over ten symbols would not be a measurement.
//
// ## Three things it cannot see, stated rather than implied
//
// 1. **Late corrections.** Since Task 3.8.7 the gateway publishes what the
//    current market state **applied**, and `applied` drops an observation whose
//    instant is strictly older than the one held — so a revision that arrives
//    *after* the next minute's bar never reaches any browser and never reaches
//    this. The count here is therefore a **floor**: same-minute revisions only.
//    §7.8 measured revisions arriving ~30 s later and 4–5 messages behind their
//    bar, so most should land inside their own minute; how many do not is
//    exactly the difference between this number and the vendor's, and saying so
//    is the honest way to publish it.
// 2. **What the store did with any of it.** Whether a row landed is a query on
//    the deployed database, which this has no credential for. It is in
//    `LIVE-REHEARSAL.md` beside the 3.8 row.
// 3. **Whether a person found it pleasant.** That is the whole reason the
//    ledger exists and no instrument answers it.
//
// ## The two-feed source note has a WINDOW, and it is not `1D`
//
// This is the thing to get right on the night, and it was only understood at
// Story 3.8's close (`LIVE-SESSION.md` §14). A served window's `sources`
// describe **the rows the answer contains**; the read prefers `sip` where a
// minute holds both tapes; the nightly backfill covers every regular-session
// minute. So:
//
//   - **`1D` during the session** is today's IEX minutes and names **one**
//     source, `iex`. Not the artefact.
//   - **`5D` during the session** spans four backfilled SIP sessions and
//     today's IEX ones, and names **two** — very likely **three**, because the
//     read-time stitch fetches the last ~16 minutes from the SIP REST endpoint,
//     giving `sip → iex → sip` in contribution order. That is the artefact, and
//     the three-stretch version is the better one.
//   - **After tonight's backfill**, both collapse to one `sip`. Measured on
//     2026-09-23: 390 bars, one source. **The window closes when the backfill
//     runs.**
//
// So the API half polls `sessions=5` as well as `sessions=1`, and records
// `provenance.sources` verbatim with the minute it was taken.
//
// ## Sentinels, kept from `weekend-watch.mjs`
//
// A finding with a clean network and no clock jump is a finding; anything else
// is an artefact of the observer.
//
//   - **A monotonic-vs-wall tick**, so a suspended laptop is a recorded fact
//     with a duration rather than an unexplained gap in the minutes.
//   - **A reachability probe on any socket failure**, because this observer's
//     own network dying looks exactly like the thing it is watching for.
//
// ## Output
//
// `.capture/session/session-<market date>.jsonl`, one JSON object a line, plus
// a human summary on exit (or on `Ctrl-C`, which is a normal way to stop it).
// `.capture/` is gitignored: **raw vendor-derived frames are evidence, not
// source.** Quote what matters into the task file — `CLAUDE.md`'s rule is that
// a throwaway instrument's findings must quote at least one frame **verbatim**,
// which is why the verbatim budget below exists at all.
//
// **This is a throwaway instrument.** Run it, record the findings, delete it.

import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");

// The market-time module is the ONE place that converts UTC to market time, and
// a lint rule holds `scripts/**/*.mjs` to it. Imported from the built output by
// path, the way `check-bars.mjs` reaches the backend's.
const {
  MARKET_STREAM_PATH,
  MARKET_STREAM_PROTOCOL_VERSION,
  extendedHoursAt,
  marketDateAt,
  marketSessionOn,
  marketSessionStateAt,
  marketWallClockAt,
} = await import(resolve(REPO_ROOT, "packages/shared/dist/index.js"));

const BACKEND =
  "https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io";
const FRONTEND = "https://red-smoke-029583a0f.5.azurestaticapps.net";

/** A second host, so "the network died" is distinguishable from "it died". */
const ELSEWHERE = "https://api.github.com/";

/** How long to run, in minutes. A full session plus pre-market is ~12 hours. */
const RUN_FOR_MS = Number(process.argv[2] ?? 60 * 7) * 60_000;

const WANTS_BROWSER = process.argv.includes("--browser");

/** How often the API half asks, and the browser half looks. */
const EVERY_MS = (() => {
  const at = process.argv.indexOf("--every");
  return at === -1 ? 5 * 60_000 : Number(process.argv[at + 1]) * 60_000;
})();

/**
 * The securities the human-readable summary is ABOUT.
 *
 * The socket subscribes to everything; these are the names the quiet-minute and
 * extended-hours narratives are written from. A liquid one, a thin one measured
 * at **2.1%** per-symbol coverage (`LIVE-DATA.md` §7.6 — the worst case in the
 * universe, and therefore the one most likely to hand us a quiet stretch), and
 * two in between.
 */
const NARRATIVE = ["NVDA", "AAPL", "SPY", "ERIE"];

/** How many raw frames of each kind to keep verbatim. The rest are counted. */
const VERBATIM_BUDGET = {
  snapshot: 2,
  bars: 3,
  feed: 4,
  correction: 6,
  extended: 4,
};

const OUT = resolve(REPO_ROOT, ".capture/session");
mkdirSync(OUT, { recursive: true });

const startedAt = new Date();
const LOG = resolve(OUT, `session-${marketDateAt(startedAt)}.jsonl`);

const record = (row) => {
  appendFileSync(
    LOG,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`,
  );
};

/** Market wall clock as `2026-09-24 09:31:07 EDT`, through the one module that
 *  may convert. `MarketWallClock` is fields rather than a string on purpose —
 *  the formatting is the caller's, which is this. */
const pad = (value) => String(value).padStart(2, "0");

const et = (instant) => {
  const wall = marketWallClockAt(instant);
  return (
    `${wall.date} ${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)} ` +
    `${wall.offset.abbreviation}`
  );
};

// --- What is being counted ------------------------------------------------

/**
 * Every timer that can fire after the run ends.
 *
 * **They are cleared before the browser closes, and that is the repair for a
 * real crash rather than tidiness.** The first end-to-end smoke run ended with
 * `browser.newPage: Target page, context or browser has been closed` and a Node
 * stack trace *after* the summary had printed: `stop()` closed the browser and
 * the five-minute look fired a moment later. An instrument whose last output is
 * a crash is one whose findings a reader has to talk themselves into.
 */
const timers = [];

const counts = {
  frames: { snapshot: 0, bars: 0, feed: 0, unreadable: 0 },
  observations: 0,
  corrections: 0,
  correctionsChangingClose: 0,
  extendedHours: 0,
  outsideATradingDay: 0,
  reconnects: 0,
};

const spent = { snapshot: 0, bars: 0, feed: 0, correction: 0, extended: 0 };

/** Keep the verbatim evidence rather than only the conclusion. */
const keepVerbatim = (kind, payload) => {
  if (spent[kind] >= VERBATIM_BUDGET[kind]) return;
  spent[kind] += 1;
  record({ kind: `verbatim:${kind}`, nth: spent[kind], payload });
};

/**
 * The last few minutes seen per symbol, so a repeated instant is a correction.
 *
 * Three deep rather than one, because the gateway *can* deliver a revision
 * after the next minute's bar when the two land in one batch — rare, and the
 * whole point of the exercise is the rare one.
 */
const recent = new Map();

/** Minutes in which each narrative symbol produced anything. */
const heard = new Map(NARRATIVE.map((symbol) => [symbol, new Set()]));

/** Bars per wall-clock minute, for the pulse. */
const pulse = new Map();

const changedFields = (before, after) =>
  ["open", "high", "low", "close", "volume"].filter(
    (field) => before[field] !== after[field],
  );

function seeObservation(symbol, observation) {
  counts.observations += 1;

  const instant = new Date(observation.startsAt);
  const minute = observation.startsAt.slice(0, 16);

  pulse.set(minute, (pulse.get(minute) ?? 0) + 1);
  heard.get(symbol)?.add(minute);

  // **A frame stamped outside a trading day** — the vendor glance 3.4.10 wants.
  // `marketSessionOn` returns nothing for a date the calendar says is shut.
  if (marketSessionOn(marketDateAt(instant)) === undefined) {
    counts.outsideATradingDay += 1;
    record({
      kind: "outside-a-trading-day",
      symbol,
      observation,
      et: et(instant),
    });
  }

  // **An extended-hours bar**, derived from the instant exactly as the product
  // derives the word beside the price — §7.7 measured that nothing on the frame
  // distinguishes one, which is why this asks the calendar rather than the feed.
  const extended = extendedHoursAt(instant);
  if (extended !== undefined) {
    counts.extendedHours += 1;
    keepVerbatim("extended", {
      symbol,
      observation,
      extended,
      et: et(instant),
    });
  }

  const seen = recent.get(symbol) ?? [];
  const before = seen.find((entry) => entry.startsAt === observation.startsAt);

  if (before !== undefined) {
    const fields = changedFields(before, observation);
    if (fields.length > 0) {
      counts.corrections += 1;
      if (fields.includes("close")) counts.correctionsChangingClose += 1;
      keepVerbatim("correction", {
        symbol,
        minute: et(instant),
        changed: fields,
        before,
        after: observation,
      });
      record({
        kind: "correction",
        symbol,
        startsAt: observation.startsAt,
        changed: fields,
      });
    }
    seen.splice(seen.indexOf(before), 1);
  }

  seen.push(observation);
  while (seen.length > 3) seen.shift();
  recent.set(symbol, seen);
}

// --- The socket half ------------------------------------------------------

let socket;
let stopping = false;

async function reachable() {
  try {
    const response = await fetch(ELSEWHERE, {
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function universe() {
  const response = await fetch(`${BACKEND}/securities`, {
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  const securities = body.securities ?? body;
  return securities.map((security) => security.symbol);
}

function connect(symbols) {
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
      counts.frames.unreadable += 1;
      record({ kind: "unreadable", raw: String(event.data).slice(0, 400) });
      return;
    }

    const type = frame.type;
    if (type !== "snapshot" && type !== "bars" && type !== "feed") {
      counts.frames.unreadable += 1;
      record({ kind: "unknown-frame", raw: String(event.data).slice(0, 400) });
      return;
    }

    counts.frames[type] += 1;

    // The `feed` frames are the cheap half of Story 3.10's future evidence and
    // there are few of them, so all four are kept whole.
    keepVerbatim(type, frame);

    if (type === "feed") {
      record({ kind: "feed", feed: frame.feed, sentAt: frame.sentAt });
      return;
    }

    const observations = frame.observations ?? {};
    for (const [symbol, observation] of Object.entries(observations)) {
      seeObservation(symbol, observation);
    }

    if (type === "bars") {
      record({
        kind: "batch",
        sentAt: frame.sentAt,
        n: Object.keys(observations).length,
        minutes: [
          ...new Set(Object.values(observations).map((o) => o.startsAt)),
        ],
      });
    }
  });

  socket.addEventListener("close", (event) => {
    if (stopping) return;
    counts.reconnects += 1;
    void reachable().then((ok) => {
      record({
        kind: "socket-close",
        code: event.code,
        reason: event.reason,
        elsewhereReachable: ok,
      });
    });
    setTimeout(() => {
      connect(symbols);
    }, 2_000);
  });

  socket.addEventListener("error", () => {
    // `close` always follows, and it carries the code. Nothing to do here but
    // avoid an unhandled event.
  });
}

// --- The API half: the two-feed ledger, from the served answer -------------

async function askForSources(sessions) {
  if (stopping) return undefined;

  const url = `${BACKEND}/market-data/bars?symbol=NVDA&timeframe=1m&sessions=${String(sessions)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const body = await response.json();
    const series = body.series ?? {};
    const sources = series.provenance?.sources ?? [];
    record({
      kind: "sources",
      sessions,
      status: response.status,
      bars: series.bars?.length ?? 0,
      coverage: series.coverage,
      sources,
      stretches: sources.length,
    });
    return { sessions, sources };
  } catch (error) {
    record({ kind: "sources-failed", sessions, message: String(error) });
    return undefined;
  }
}

// --- The browser half: what a reader actually sees -------------------------

let browser;

/** What the last look saw, so a photograph is taken on a change. */
let lastLabel;
let lastTwoFeed;
let lastShotAt = 0;

/**
 * The identity block, and **which of its two labels is showing**.
 *
 * `LATEST PRICE` appears only when a live figure exists; with none the block
 * reads `LAST SESSION CLOSE` and dates the change from the previous close.
 * Read off the deployed site on 2026-09-23 with the market shut, which is why
 * this asks for both rather than for the one the browser suite uses — that
 * spec runs against CI's zero-bar store and never meets the other.
 *
 * **Which label is showing IS the evidence.** A block reading `LATEST PRICE`
 * during the session is Story 3.4's criterion in one word, and one still
 * reading `LAST SESSION CLOSE` at 10:30 ET would be the finding of the night.
 *
 * It **waits for** the block rather than pausing a fixed number of seconds.
 * The first smoke run read `null` after a six-second pause against a cold
 * Static Web App and a cold container: the label was going to arrive and the
 * instrument had already looked.
 */
async function identityBlock(page) {
  await page
    .getByText(/^(Latest price|Last session close)$/)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => undefined);

  for (const label of ["Latest price", "Last session close"]) {
    const found = page.getByText(label, { exact: true });
    if ((await found.count()) === 0) continue;
    return { label, text: await found.first().locator("..").innerText() };
  }
  return { label: null, text: null };
}

/**
 * The chart's spoken sentence, which names the window's two ends.
 *
 * This is the reading criterion 2 is really about: `… The line runs the full
 * width of the window asked for, 2026-09-17 09:30:00 EDT → 2026-09-23 16:00:00
 * EDT.` A reload that keeps today's chart keeps that second instant; before
 * Story 3.8 it fell back to the sixteen-minute cliff.
 */
async function chartSentence(page) {
  return await page
    .getByText(/price chart: a line of/)
    .first()
    .innerText()
    .catch(() => null);
}

async function look(label) {
  if (browser === undefined || stopping) return;

  // **`newPage` is INSIDE the try, and that is the second half of the crash
  // repair.** Clearing the timers stops a new look starting; it cannot stop one
  // already in flight, and the browser closing under it throws from the very
  // first line. The first attempt at this fix guarded the entry and left
  // `newPage` outside the `try`, so the same stack trace came back.
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${FRONTEND}/securities/NVDA?sessions=5`, {
      waitUntil: "load",
    });

    const identity = await identityBlock(page).catch(() => null);
    const marks = await page.locator("[data-arrival]").count();

    // `Sources` PLURAL is the artefact: `SourceNote` renders the singular for
    // one feed and the plural for more than one, so the word itself is the
    // assertion that two tapes reached the answer.
    //
    // **And the note renders NO feed clause at all when the chrome can already
    // name the feed** — `namesFeeds` returns false when the series' one feed
    // equals the configured one. Confirmed against the deployed site on
    // 2026-09-23: with every bar `sip` and the chrome reading `All US
    // exchanges` there is no `Source` row on the page at all, which is ADR
    // 0029's *the surface that owns the data owns the account of it* working
    // correctly rather than a defect. Two feeds short-circuit that check, so
    // the clause appearing AT ALL tonight is itself the signal.
    const plural = page.getByText("Sources", { exact: true });
    const twoFeed = (await plural.count()) > 0;
    const term = twoFeed ? plural : page.getByText("Source", { exact: true });
    const note =
      (await term.count()) === 0
        ? null
        : await term
            .locator("xpath=ancestor::*[3]")
            .innerText()
            .catch(() => null);

    record({ kind: "page", label, identity, marks, twoFeed, note });

    // **Photograph on a CHANGE, or hourly, rather than every look.** A full-page
    // shot of this page is the 518-row table as well as the chart, and a run
    // that starts before pre-market and ends at the bell takes about 230 looks.
    // At a few MB each that is most of a gigabyte of near-identical pictures,
    // and the one that matters would be somewhere in the middle of them.
    //
    // The two-feed shot is `fullPage` because it IS the artefact; the rest are
    // viewport shots, which is what a person would have taken anyway.
    const changed = identity?.label !== lastLabel || twoFeed !== lastTwoFeed;
    const hourly = Date.now() - lastShotAt > 60 * 60_000;

    if (changed || hourly || label === "first") {
      const shot = resolve(OUT, `${label}-${Date.now().toString()}.png`);
      await page.screenshot({ path: shot, fullPage: twoFeed });
      record({
        kind: "screenshot",
        label,
        path: shot,
        why: { changed, hourly },
        fullPage: twoFeed,
      });
      lastShotAt = Date.now();
    }

    lastLabel = identity?.label ?? null;
    lastTwoFeed = twoFeed;

    return { identity, note, twoFeed };
  } catch (error) {
    record({ kind: "page-failed", label, message: String(error) });
    return undefined;
  } finally {
    await page?.close().catch(() => undefined);
  }
}

/**
 * Criterion 2 on the deployed site: a reload keeps today's chart.
 *
 * The assertion is on the **last instant the page claims**, read before and
 * after. Before Story 3.8 a reload dropped every viewer back to the
 * sixteen-minute cliff, so a reload that keeps the instant is the whole story.
 */
async function reloadKeepsToday() {
  if (browser === undefined || stopping) return;

  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${FRONTEND}/securities/NVDA?sessions=1`, {
      waitUntil: "load",
    });
    const before = await identityBlock(page);
    const beforeChart = await chartSentence(page);
    const beforeShot = resolve(
      OUT,
      `reload-before-${Date.now().toString()}.png`,
    );
    await page.screenshot({ path: beforeShot, fullPage: true });

    await page.reload({ waitUntil: "load" });
    const after = await identityBlock(page);
    const afterChart = await chartSentence(page);
    const afterShot = resolve(OUT, `reload-after-${Date.now().toString()}.png`);
    await page.screenshot({ path: afterShot, fullPage: true });

    record({
      kind: "reload",
      before,
      after,
      beforeChart,
      afterChart,
      beforeShot,
      afterShot,
    });
  } catch (error) {
    record({ kind: "reload-failed", message: String(error) });
  } finally {
    await page?.close().catch(() => undefined);
  }
}

// --- Sentinels ------------------------------------------------------------

let lastWall = Date.now();
let lastMonotonic = performance.now();

timers.push(
  setInterval(() => {
    const wall = Date.now();
    const monotonic = performance.now();
    const drift = Math.abs(wall - lastWall - (monotonic - lastMonotonic));
    if (drift > 5_000)
      record({ kind: "suspended", driftMs: Math.round(drift) });
    lastWall = wall;
    lastMonotonic = monotonic;
  }, 60_000),
);

// --- The run --------------------------------------------------------------

function summarise(why) {
  const quiet = Object.fromEntries(
    NARRATIVE.map((symbol) => [symbol, heard.get(symbol)?.size ?? 0]),
  );
  const minutes = [...pulse.entries()].sort();
  const rate =
    counts.observations === 0
      ? null
      : Number(((counts.corrections / counts.observations) * 100).toFixed(4));

  const summary = {
    kind: "summary",
    why,
    startedAt: startedAt.toISOString(),
    ranForMinutes: Math.round((Date.now() - startedAt.getTime()) / 60_000),
    counts,
    correctionRatePercent: rate,
    againstSpec:
      "§14.1 measured 0.064% of bars, 35.3% of them changing the close",
    minutesWithAnyBar: minutes.length,
    narrativeMinutesHeard: quiet,
  };

  record(summary);

  console.log("\n--- the sitting -------------------------------------------");
  console.log(
    `  ran            ${String(summary.ranForMinutes)} min, from ${et(startedAt)}`,
  );
  console.log(`  frames         ${JSON.stringify(counts.frames)}`);
  console.log(`  observations   ${String(counts.observations)}`);
  console.log(
    `  corrections    ${String(counts.corrections)} ` +
      `(${rate === null ? "no bars yet" : `${String(rate)}% of bars`}; ` +
      `${String(counts.correctionsChangingClose)} changed the close) — a FLOOR, see the header`,
  );
  console.log(`  extended-hours ${String(counts.extendedHours)} bars`);
  console.log(`  outside a day  ${String(counts.outsideATradingDay)} bars`);
  console.log(`  reconnects     ${String(counts.reconnects)}`);
  console.log(
    `  minutes heard  ${JSON.stringify(quiet)} (of ${String(minutes.length)} minutes with any bar)`,
  );
  console.log(`\n  everything, verbatim: ${LOG}\n`);
}

function stop(why) {
  if (stopping) return;
  stopping = true;

  for (const timer of timers) clearInterval(timer);

  try {
    socket?.close();
  } catch {
    // Closing a socket that is already gone is not a finding.
  }

  summarise(why);

  if (browser === undefined) {
    process.exit(0);
  }

  void browser.close().finally(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  stop("interrupted");
});
process.on("SIGTERM", () => {
  stop("terminated");
});

const symbols = await universe();
const state = marketSessionStateAt(startedAt);

record({
  kind: "start",
  startedAt: startedAt.toISOString(),
  et: et(startedAt),
  marketDate: marketDateAt(startedAt),
  sessionState: state,
  symbols: symbols.length,
  runForMinutes: RUN_FOR_MS / 60_000,
  browser: WANTS_BROWSER,
});

console.log(
  `Watching ${String(symbols.length)} securities from ${et(startedAt)} ` +
    `for ${String(RUN_FOR_MS / 60_000)} minutes.\n  ${LOG}\n`,
);

if (WANTS_BROWSER) {
  const { chromium } = await import("@playwright/test");
  browser = await chromium.launch();
  record({ kind: "browser-open" });
}

connect(symbols);

// The first ask is immediate so a failure is visible in the first minute rather
// than in five.
await askForSources(1);
await askForSources(5);
if (WANTS_BROWSER) await look("first");

timers.push(
  setInterval(() => {
    void askForSources(1);
    void askForSources(5);
    void look("periodic");
  }, EVERY_MS),
);

// One reload test, a third of the way in, so it lands inside the session rather
// than at its edge.
if (WANTS_BROWSER) {
  setTimeout(() => {
    void reloadKeepsToday();
  }, RUN_FOR_MS / 3).unref();
}

setTimeout(() => {
  stop("ran its course");
}, RUN_FOR_MS);
