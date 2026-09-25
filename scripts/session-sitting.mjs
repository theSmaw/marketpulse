// **The sitting a person actually takes — Task 3.11.8, with Task 3.11.4's
// figures riding along.**
//
//   node scripts/session-sitting.mjs [minutes] [--pages 2] [--no-shots]
//
// ## Why this exists and what it is NOT
//
// `LIVE-REHEARSAL.md` has dated rows for four stories and **not one was
// watched by a person** — every row was taken by a headless browser or a Node
// client, which each row states on its face. Task 3.11.1 settled that the
// epic's exit criterion means what it says: **an instrumented row does not
// satisfy `watched`.**
//
// **So this instrument does not close Task 3.11.8.** It exists to make the
// sitting *pure watching*: everything a machine can take is taken here, so the
// person present spends their attention on the three judgements only a person
// can make (below), rather than on typing.
//
// ## What it takes, and whose it is
//
// | What                                               | Owner  |
// | -------------------------------------------------- | ------ |
// | §28's p95, gateway `sentAt` → table repainted      | 3.11.4 |
// | the frame payload in BYTES, with its symbol count  | 3.11.4 |
// | the burst's main-thread cost at live density       | 3.11.4 |
// | the fan-out per browser, and whether n browsers move it | 3.11.4 / 3.11.5 |
// | the extended-hours qualifier RENDERED              | 3.11.8 |
// | a quiet minute WATCHED                             | 3.11.8 |
// | a correction seen on the surface                   | 3.11.8 |
// | three viewports, photographed on an EVENT          | 3.11.8 |
//
// ## The instrument note this replaces
//
// Task 3.4.10's watch photographed **every twenty minutes** and both of its
// surviving items need a look at a **chosen moment**. So this photographs on an
// **event** — the first extended-hours bar for a watched symbol, the first
// minute one falls silent, the first correction, a change in the feed word —
// and never on a timer. That is a change to the instrument, not to the list.
//
// ## Two traps this instrument is written around, both paid for already
//
// **A `long-animation-frame` entry only exists above 50 ms**, so *zero
// observed* and *the observer is broken* are the same output (Task 3.9.9, and
// it cost a task). The page therefore **self-tests the observer** before any
// silence from it is believed, and the result is printed whether or not
// anything else is.
//
// **Count by URL, never by event** (Task 3.11.2). A browser page holds sockets
// that are not this product's, so every socket wrapper here records its URL and
// nothing is counted that does not carry `/market-stream`.
//
// ## And the clock caveat that travels with every `sentAt` figure
//
// `sentAt` is the SERVER's wall clock and the receive stamp is the BROWSER's.
// They disagree. A negative sample is **skew**, not a frame arriving before it
// was sent, and the honest publication is a **distribution with its n** rather
// than a number (ADR 0033). Printed that way below, with the negative count
// shown rather than clipped.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

// **Through the shared module rather than an `Intl` call here**, and the lint
// rule is what insisted: `packages/shared/src/market-time.ts` is the one place
// that converts a UTC instant to market time, because a second converter is
// wrong twice a year, silently, on the two days nobody tests. Imported from the
// BUILT output by path — the workspace package is not linked at the root, and
// this is a throwaway instrument rather than a package that should be.
import { marketWallClockAt } from "../packages/shared/dist/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const BACKEND =
  process.env.E2E_DEPLOYED_BACKEND_ORIGIN ??
  "https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io";

const FRONTEND =
  process.env.E2E_DEPLOYED_BASE_URL ??
  "https://red-smoke-029583a0f.5.azurestaticapps.net";

const RUN_FOR_MS = Number(process.argv[2] ?? 45) * 60_000;
const WANTS_SHOTS = !process.argv.includes("--no-shots");
// **The photography path is rehearsed rather than trusted.** It fires on an
// event, and the events it waits for only exist during a session — so without
// this the first photograph any of these ever takes would be taken at the one
// moment nobody can retry it.
const WANTS_REHEARSAL_SHOT = process.argv.includes("--shot-now");
const PAGE_COUNT = (() => {
  const at = process.argv.indexOf("--pages");
  if (at === -1) return 2;
  const n = Number(process.argv[at + 1]);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 4) : 2;
})();

// The four the narrative is written about. `ERIE` is here because it is the
// worst-covered name in the universe — `LIVE-DATA.md` §7.6 measured 2.1% of
// minutes — so it is the one that PRODUCES a quiet minute rather than the one
// that happens to have one.
const NARRATIVE = ["NVDA", "AAPL", "SPY", "ERIE"];

// The widths a person would look at, and 390 is the one Task 3.10.9 flagged:
// three pairs of degraded states are told apart by the status bar alone, which
// at 390 is below the fold.
const WIDTHS = [1440, 768, 390];

const OUT = resolve(REPO_ROOT, ".capture/sitting");
mkdirSync(OUT, { recursive: true });

const startedAt = new Date();
const stamp = startedAt.toISOString().slice(0, 19).replace(/[:T]/gu, "-");
const LOG = resolve(OUT, `sitting-${stamp}.jsonl`);

const record = (row) => {
  appendFileSync(
    LOG,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`,
  );
};

const pad = (value) => String(value).padStart(2, "0");

/** Market time, for a human reading the log. */
const et = (instant) => {
  const wall = marketWallClockAt(instant);
  return (
    `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)} ` +
    `${wall.offset.abbreviation}`
  );
};

// --- What the pages report back -------------------------------------------

/** Every frame every page saw: `{ sentAt, receivedAt, bytes, type, n }`. */
const frames = [];
/** Every repaint pairing: `{ sentAt, receivedAt, paintedAt }`. */
const paints = [];
/** Long animation frames, above 50 ms by definition. */
const longFrames = [];
/** Whether each page proved its own observer works. */
const observerProofs = [];

const seen = {
  extendedHours: 0,
  corrections: 0,
  feedWords: new Set(),
  quietMinutes: 0,
};

/** Which minutes each narrative symbol was heard in. */
const heard = new Map(NARRATIVE.map((symbol) => [symbol, new Set()]));

const shotsTaken = [];

// --- The page-side instrument ---------------------------------------------
//
// Injected before anything on the page runs, so it wraps the socket the
// application itself opens rather than a second one. It NEVER routes or stubs:
// this is the real deployed page talking to the real deployed gateway.

const PAGE_INSTRUMENT = `(() => {
  const out = [];
  window.__sitting = out;

  // **The observer self-test, before any silence from it is believed.**
  let observerProved = false;
  let selfTestOver = false;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // **The self-test's own 120 ms block is a long frame**, and counting it
        // would put a figure this instrument CAUSED into the acceptance number.
        // Everything before the proof is the probe and the cold load.
        out.push({
          kind: "long-frame",
          ms: entry.duration,
          at: Date.now(),
          selfTest: !selfTestOver,
        });
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: true });
    requestAnimationFrame(() => {
      const until = performance.now() + 120;
      while (performance.now() < until) { /* deliberately blocking */ }
      document.body.dataset.sittingProbe = String(Date.now());
    });
    setTimeout(() => {
      observerProved = out.some((row) => row.kind === "long-frame");
      out.push({ kind: "observer", proved: observerProved });
      selfTestOver = true;
    }, 1500);
  } catch (error) {
    out.push({ kind: "observer", proved: false, why: String(error) });
  }

  // **Count by URL, never by event.**
  const Native = window.WebSocket;
  let pendingFrame = null;

  window.WebSocket = function (url, protocols) {
    const socket = protocols === undefined
      ? new Native(url)
      : new Native(url, protocols);
    const isOurs = String(url).includes("/market-stream");
    out.push({ kind: "socket", url: String(url), ours: isOurs, at: Date.now() });
    if (!isOurs) return socket;

    socket.addEventListener("message", (event) => {
      const receivedAt = Date.now();
      const text = typeof event.data === "string" ? event.data : "";
      const bytes = new TextEncoder().encode(text).length;
      let frame;
      try { frame = JSON.parse(text); } catch { return; }
      const observations = frame.observations ?? {};
      const symbols = Object.keys(observations);
      out.push({
        kind: "frame",
        type: frame.type,
        sentAt: frame.sentAt ?? null,
        receivedAt,
        bytes,
        n: symbols.length,
        feed: frame.feed ?? null,
        observations: frame.type === "bars"
          ? Object.fromEntries(symbols.map((s) => [s, {
              startsAt: observations[s].startsAt,
              close: observations[s].close,
            }]))
          : undefined,
      });
      if (frame.type === "bars" && symbols.length > 0) {
        pendingFrame = { sentAt: frame.sentAt ?? null, receivedAt, n: symbols.length };
      }
    });
    return socket;
  };
  window.WebSocket.prototype = Native.prototype;
  Object.assign(window.WebSocket, Native);

  // **The repaint stamp.** The first mutation anywhere under the table after a
  // frame landed IS the frame reaching the screen; anything later is a second
  // render rather than the first.
  const startObserving = () => {
    const target = document.querySelector("table") ?? document.body;
    new MutationObserver(() => {
      if (pendingFrame === null) return;
      out.push({ kind: "painted", ...pendingFrame, paintedAt: Date.now() });
      pendingFrame = null;
    }).observe(target, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(startObserving, 1500));
  } else {
    setTimeout(startObserving, 1500);
  }
})();`;

// --- Reading a page's instrument ------------------------------------------

/** Only the first two bars frames are kept whole; the rest are counted. */
const keptBars = new Set();

/** Minutes a narrative symbol has been silent, for the quiet-minute event. */
const lastHeardAt = new Map();

async function drain(page, which) {
  let rows;
  try {
    // **`splice` rather than a fresh array, and this is a defect that
    // shipped** (found 2026-09-25 by an overnight run). The page instrument
    // closes over the array it pushes into; rebinding `globalThis.__sitting` to
    // a NEW array leaves the wrapper pushing into the old one for ever, so
    // every drain after the first returns nothing — and the instrument
    // reports a silent socket on a perfectly healthy connection.
    //
    // It is invisible to a short rehearsal: with the market shut there are
    // no frames after the first drain anyway, so one drain and all drains
    // look identical.
    rows = await page.evaluate(() => {
      const held = globalThis.__sitting ?? [];
      return held.splice(0, held.length);
    });
  } catch {
    return []; // a navigation mid-read; the next drain gets it
  }

  const events = [];

  for (const row of rows) {
    if (row.kind === "observer") {
      observerProofs.push({ which, proved: row.proved });
      record({ kind: "observer", which, proved: row.proved, why: row.why });
      continue;
    }
    if (row.kind === "socket") {
      record({ kind: "socket", which, url: row.url, ours: row.ours });
      continue;
    }
    if (row.kind === "long-frame") {
      if (row.selfTest !== true) longFrames.push(row.ms);
      continue;
    }
    if (row.kind === "painted") {
      paints.push(row);
      continue;
    }
    if (row.kind !== "frame") continue;

    frames.push({
      which,
      type: row.type,
      sentAt: row.sentAt,
      receivedAt: row.receivedAt,
      bytes: row.bytes,
      n: row.n,
    });

    // **The log is what outlives the instrument** (`ALPACA.md` §11): a findings
    // section that records a behaviour without the bytes that carried it is
    // complete until somebody needs the evidence rather than the conclusion.
    record({
      kind: "frame",
      which,
      type: row.type,
      sentAt: row.sentAt,
      bytes: row.bytes,
      n: row.n,
      minutes: [
        ...new Set(
          Object.values(row.observations ?? {}).map((o) => o.startsAt),
        ),
      ].slice(0, 4),
    });

    if (row.type === "bars" && keptBars.size < 2) {
      keptBars.add(row.receivedAt);
      writeFileSync(
        resolve(OUT, `bars-frame-${String(row.receivedAt)}.json`),
        `${JSON.stringify(row, null, 2)}\n`,
      );
    }

    if (row.type === "feed" && row.feed) {
      const word = `${row.feed.venue ?? "?"}/${row.feed.status ?? "?"}`;
      if (!seen.feedWords.has(word)) {
        seen.feedWords.add(word);
        events.push({
          why: `feed-${word.replace(/\W+/gu, "-")}`,
          detail: row.feed,
        });
      }
      record({ kind: "feed", which, feed: row.feed });
      continue;
    }

    for (const [symbol, observation] of Object.entries(
      row.observations ?? {},
    )) {
      const minute = String(observation.startsAt).slice(0, 16);
      const known = heard.get(symbol);
      if (known) {
        if (known.has(minute)) {
          seen.corrections += 1;
          if (seen.corrections === 1) {
            events.push({
              why: "first-correction",
              detail: { symbol, minute },
            });
          }
        } else {
          known.add(minute);
        }
        lastHeardAt.set(symbol, Date.now());
      }

      // Extended hours, derived from the bar's own instant — §7.7 measured that
      // nothing on the frame distinguishes one.
      const wall = marketWallClockAt(new Date(observation.startsAt));
      const hhmm = wall.hour * 100 + wall.minute;
      if (hhmm < 930 || hhmm >= 1600) {
        seen.extendedHours += 1;
        if (seen.extendedHours === 1) {
          events.push({
            why: "first-extended-hours",
            detail: { symbol, startsAt: observation.startsAt },
          });
        }
      }
    }
  }

  return events;
}

// --- Photography, on an event rather than on a timer ----------------------

let shooting = false;

async function photograph(context, why, detail) {
  if (!WANTS_SHOTS || shooting) return;
  shooting = true;
  const at = Date.now();
  record({ kind: "photograph", why, detail });
  try {
    for (const width of WIDTHS) {
      const page = await context.newPage();
      try {
        await page.setViewportSize({
          width,
          height: width === 390 ? 780 : 900,
        });
        await page.goto(`${FRONTEND}/securities/NVDA`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(2_500);
        // **At 390 BOTH shots are taken, and the viewport one is the answer.**
        // Task 3.10.9's finding is that the status bar — the only surface that
        // tells three pairs of degraded states apart — is below the fold at
        // 390. A `fullPage` screenshot shows everything and therefore answers
        // the opposite question: it is the record, and `-fold` is the evidence.
        const file = resolve(OUT, `${why}-${String(width)}-${String(at)}.png`);
        await page.screenshot({ path: file });
        shotsTaken.push({ why, width, file });
        if (width === 390) {
          const whole = resolve(OUT, `${why}-390-full-${String(at)}.png`);
          await page.screenshot({ path: whole, fullPage: true });
          shotsTaken.push({ why, width, file: whole, fullPage: true });
        }
      } finally {
        await page.close();
      }
    }
    process.stdout.write(`  photographed: ${why} at ${WIDTHS.join("/")}\n`);
  } catch (error) {
    record({ kind: "photograph-failed", why, error: String(error) });
  } finally {
    shooting = false;
  }
}

// --- The summary ----------------------------------------------------------

const quantile = (values, q) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index];
};

function summarise(why) {
  const deltas = paints
    .filter((paint) => typeof paint.sentAt === "number")
    .map((paint) => paint.paintedAt - paint.sentAt);
  const negatives = deltas.filter((delta) => delta < 0).length;
  const bars = frames.filter((frame) => frame.type === "bars");
  const bytes = bars.reduce((total, frame) => total + frame.bytes, 0);
  const minutes = Math.max(1, (Date.now() - startedAt.getTime()) / 60_000);

  const summary = {
    why,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    minutes: Number(minutes.toFixed(1)),
    pages: PAGE_COUNT,
    observerProofs,
    frames: {
      bars: bars.length,
      snapshot: frames.filter((frame) => frame.type === "snapshot").length,
      feed: frames.filter((frame) => frame.type === "feed").length,
    },
    payload: {
      bytesPerBarsFrame: {
        median: quantile(
          bars.map((frame) => frame.bytes),
          0.5,
        ),
        max: bars.length > 0 ? Math.max(...bars.map((f) => f.bytes)) : null,
      },
      symbolsPerBarsFrame: {
        median: quantile(
          bars.map((frame) => frame.n),
          0.5,
        ),
        max: bars.length > 0 ? Math.max(...bars.map((f) => f.n)) : null,
      },
      // The fan-out: what ONE browser costs the gateway, per minute, at the
      // whole universe. Divide by pages for the per-browser figure.
      kbPerMinutePerBrowser: Number(
        (bytes / 1024 / minutes / PAGE_COUNT).toFixed(1),
      ),
    },
    sentAtToRepaint: {
      n: deltas.length,
      negatives,
      p50: quantile(deltas, 0.5),
      p95: quantile(deltas, 0.95),
      max: deltas.length > 0 ? Math.max(...deltas) : null,
      caveat:
        "server clock minus browser clock; a negative sample is skew, not a " +
        "frame arriving before it was sent (ADR 0033)",
    },
    longFrames: {
      observerProved: observerProofs.some((proof) => proof.proved),
      n: longFrames.length,
      max: longFrames.length > 0 ? Math.max(...longFrames) : null,
      note:
        "an entry exists only above 50 ms, so n=0 with a PROVED observer is " +
        "the acceptance figure and n=0 with an unproved one is nothing",
    },
    seen: {
      extendedHoursBars: seen.extendedHours,
      corrections: seen.corrections,
      feedWords: [...seen.feedWords],
      minutesHeard: Object.fromEntries(
        [...heard].map(([symbol, minutes_]) => [symbol, minutes_.size]),
      ),
    },
    photographs: shotsTaken,
  };

  writeFileSync(
    resolve(OUT, `summary-${stamp}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`\n${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

// --- The run --------------------------------------------------------------

// **The market clock comes from the SERVER rather than from here**, which is
// `check-deployed.mjs`'s own rule and the same reason: the backend already has
// Story 2.5's calendar and its exception table, and a copy in an instrument is
// a second answer to *is today a half-day* that nothing reconciles.
const marketOpen = await (async () => {
  try {
    const response = await fetch(`${BACKEND}/diagnostics/feed`);
    const body = await response.json();
    return body.marketOpen === true;
  } catch {
    return null; // unknown, which is not the same as closed
  }
})();

process.stdout.write(
  `\nThe sitting — ${FRONTEND}\n` +
    `  started ${et(startedAt)}, market ${marketOpen === null ? "unknown" : marketOpen ? "open" : "closed"}\n` +
    `  ${String(PAGE_COUNT)} page(s), ${String(RUN_FOR_MS / 60_000)} minutes, ` +
    `photographs ${WANTS_SHOTS ? "on" : "off"}\n` +
    `  log ${LOG}\n\n`,
);

if (marketOpen !== true) {
  process.stdout.write(
    "  NOTE: the market is not open. Every figure below will be empty, and\n" +
      "  that IS the rehearsal — it proves the instrument runs, the socket is\n" +
      "  wrapped and the observer is proved, before the bell.\n\n",
  );
}

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();
const context = await browser.newContext();
await context.addInitScript(PAGE_INSTRUMENT);

const pages = [];
for (let index = 0; index < PAGE_COUNT; index += 1) {
  const page = await context.newPage();
  await page.goto(`${FRONTEND}/securities`, { waitUntil: "domcontentloaded" });
  pages.push(page);
}
process.stdout.write(`  ${String(pages.length)} page(s) open on /securities\n`);

if (WANTS_REHEARSAL_SHOT) {
  await photograph(context, "rehearsal", { marketOpen });
}

const deadline = Date.now() + RUN_FOR_MS;
let ticks = 0;

while (Date.now() < deadline) {
  await pages[0].waitForTimeout(5_000);
  ticks += 1;

  for (const [index, page] of pages.entries()) {
    const events = await drain(page, `page-${String(index + 1)}`);
    for (const event of events) {
      await photograph(context, event.why, event.detail);
    }
  }

  // A quiet minute is an ABSENCE, so it cannot arrive in a frame: it is noticed
  // here, by nothing having arrived for a symbol in four minutes.
  for (const symbol of NARRATIVE) {
    const last = lastHeardAt.get(symbol);
    if (last === undefined) continue;
    if (Date.now() - last > 4 * 60_000 && seen.quietMinutes === 0) {
      seen.quietMinutes += 1;
      await photograph(context, "first-quiet-stretch", {
        symbol,
        silentForMs: Date.now() - last,
      });
    }
  }

  if (ticks % 12 === 0) {
    process.stdout.write(
      `  ${et(new Date())}  frames=${String(frames.length)} ` +
        `paints=${String(paints.length)} corrections=${String(seen.corrections)} ` +
        `extended=${String(seen.extendedHours)}\n`,
    );
  }
}

summarise("deadline");
await browser.close();
