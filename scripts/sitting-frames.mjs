// **Epic 4's sitting instrument — Task 4.9.1, and it has a deadline rather
// than a dependency.**
//
//   node scripts/sitting-frames.mjs all
//   node scripts/sitting-frames.mjs composition --minutes 10 --route /
//   node scripts/sitting-frames.mjs feed-rate --seconds 75 --symbol NVDA
//   node scripts/sitting-frames.mjs source-note --symbol NVDA
//   node scripts/sitting-frames.mjs composition --furnished \
//     --origin http://localhost:5173 --backend http://127.0.0.1:3000
//
// ## Why it exists, which is three sentences
//
// **Three measurements this epic owes expire with every session that passes**,
// and no address, fixture, replay or pinned clock can produce any of them:
//
//   1. **Each `bars` frame's own symbol LIST**, off the deployed socket during
//      a real session. Not a count — a list, per frame, so that *do the eleven
//      sector ETFs arrive in one frame or eleven* has an answer.
//      `LIVE-DATA.md` §9.5/§10.2 records counts and **nothing in this
//      repository has ever recorded frame composition**; three stories were
//      told to size per-frame work against it and all three had to assume.
//   2. **The `feed`-frame re-count over 75 s on ONE symbol**, reproducing Task
//      4.1.6's method and window so the two readings compare. The median was
//      **332 a minute** before Task 4.7.7's repair; the expectation now is
//      **~1.4** (the 55 s keepalive) plus one per genuine change of the
//      published view. **Anything near 300 is the defect returned.**
//   3. **The two-tape source note from a DEPLOYED store**, which exists only
//      mid-session: after the nightly backfill the same window names one `sip`
//      source. `LIVE-REHEARSAL.md`'s one-sitting list calls it the item that
//      **expires that night**.
//
// ## Four rules it is written around, every one of them somebody's defect
//
// **Count by URL, never by event** (Task 3.11.2). A browser page holds sockets
// that are not this product's — on a dev page two of three are Vite's HMR —
// and Task 3.11.2 withdrew a suppression, two documents and a task over it. So
// the page's wrapper records a URL per socket, logs only `/market-stream`, and
// **every frame row carries the URL it came in on**.
//
// **Drain a page buffer with `splice` IN PLACE** (2026-09-25). The page
// instrument closes over the array it pushes into, so rebinding the global to
// a fresh array leaves the wrapper filling an array nobody reads — and against
// a quiet system **one drain and all drains look identical**, which is exactly
// how it survived a rehearsal recorded as clean. Inherited rather than
// rewritten: the drain is `overview-instrument.mjs`'s `__mpDrain`, which is
// `splice`.
//
// **A rehearsal against a quiet system certifies the wiring and NOT the loop.**
// So `--furnished` exists: it drives the page's own socket at a measured
// cadence so the drain loop can be proved before the bell, with frames
// arriving between drains.
//
// **Nothing synthetic ever reaches the deployed site, at any hour** (ADR 0030
// §7a). `--furnished` **refuses** a non-loopback origin, by name, and the
// frames it furnishes label themselves `synthetic` on the wire so a log row
// cannot be mistaken for a reading.
//
// ## What it is not
//
// Not a gate, not a spec, not a `pnpm verify` step, and **not a rehearsal
// row**: `LIVE-REHEARSAL.md`'s note 5 is the rule, and an instrumented row
// does not satisfy the word *watched*. This exists so the person present
// spends their evening looking rather than typing.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

// **Through the shared module rather than an `Intl` call here**, and the lint
// rule is what insisted: `packages/shared/src/market-time.ts` is the one place
// that converts a UTC instant to market time. Imported from the BUILT output by
// path, which is `session-sitting.mjs`'s own idiom and for its reason.
import { marketWallClockAt } from "../packages/shared/dist/index.js";
import { drain, pageInstrument } from "./overview-instrument.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

// --- The addresses --------------------------------------------------------
//
// The deployed pair's defaults are `session-sitting.mjs`'s, unchanged, so
// nothing new about the deployment is written down here.

/**
 * The flags that take a value, named once.
 *
 * **Named rather than inferred, and that is a defect the dry run produced.**
 * The first draft read the arm list as *every argument not starting with
 * `--`*, which silently made `http://localhost:5173` an arm — and because the
 * set was then non-empty, the defaults did not apply and a run with only flags
 * would have executed **no arm at all** while printing a header saying it had.
 */
const VALUED_FLAGS = new Set([
  "backend",
  "origin",
  "route",
  "symbol",
  "minutes",
  "seconds",
  "drain",
]);

const ARM_NAMES = new Set(["composition", "feed-rate", "source-note", "all"]);

const flag = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  return process.argv[at + 1] ?? fallback;
};

const number = (name, fallback) => {
  const value = Number(flag(name, String(fallback)));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const BACKEND = flag(
  "backend",
  process.env.E2E_DEPLOYED_BACKEND_ORIGIN ??
    "https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io",
);

const FRONTEND = flag(
  "origin",
  process.env.E2E_DEPLOYED_BASE_URL ??
    "https://red-smoke-029583a0f.5.azurestaticapps.net",
);

const FURNISHED = process.argv.includes("--furnished");
const ROUTE = flag("route", "/");
const SYMBOL = flag("symbol", "NVDA").toUpperCase();
const MINUTES = number("minutes", 10);
/** Task 4.1.6's window, and it is the window rather than a duration. */
const FEED_WINDOW_S = number("seconds", 75);
/**
 * The furnished cadence: **16.1 `bars` frames a minute**, which is
 * `LIVE-DATA.md` §10.2's measured figure at the close — the busiest of the
 * three. One frame every 3,727 ms.
 */
const FURNISHED_GAP_MS = Math.round(60_000 / 16.1);
/** How often the Node side drains. Four drains inside a 60 s dry run. */
const DRAIN_EVERY_MS = number("drain", 15_000);

const ARMS = new Set();
const UNKNOWN_ARGUMENTS = [];
for (const [index, argument] of process.argv.slice(2).entries()) {
  if (argument.startsWith("--")) continue;
  const previous = process.argv.slice(2)[index - 1] ?? "";
  if (previous.startsWith("--") && VALUED_FLAGS.has(previous.slice(2)))
    continue;
  if (ARM_NAMES.has(argument)) ARMS.add(argument);
  else UNKNOWN_ARGUMENTS.push(argument);
}
// **A refusal rather than a default.** An unrecognised arm name silently
// falling through to "run everything" is how an instrument gets quoted for a
// reading it never took.
if (UNKNOWN_ARGUMENTS.length > 0) {
  process.stderr.write(
    `Unknown argument(s): ${UNKNOWN_ARGUMENTS.join(", ")}. ` +
      `Arms are ${[...ARM_NAMES].join(", ")}.\n`,
  );
  process.exit(2);
}
if (ARMS.size === 0 || ARMS.has("all")) {
  ARMS.add("composition");
  ARMS.add("feed-rate");
  ARMS.add("source-note");
}

// --- The log --------------------------------------------------------------

const startedAt = new Date();
const stamp = startedAt.toISOString().slice(0, 19).replace(/[:T]/gu, "-");
const OUT = resolve(REPO_ROOT, ".capture/sitting-4.9");
mkdirSync(OUT, { recursive: true });
const LOG = resolve(OUT, `frames-${stamp}.jsonl`);

const record = (row) => {
  appendFileSync(
    LOG,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`,
  );
};

const say = (line) => {
  process.stdout.write(`${line}\n`);
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

const quantile = (values, q) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

/**
 * A distribution, or `null` when there is nothing to describe.
 *
 * `null` rather than zero, which is this repository's standing rule for an
 * instrument: an empty sample and a sample of zeroes are different findings and
 * must not print the same.
 */
const distribution = (values) =>
  values.length === 0
    ? null
    : {
        n: values.length,
        p50: quantile(values, 0.5),
        p95: quantile(values, 0.95),
        min: Math.min(...values),
        max: Math.max(...values),
      };

// --- The population, read rather than written down again -----------------
//
// The four proxies and the eleven sector benchmarks are classified from
// `GET /securities`' own `kind`, which is the population `trackedTickers()`
// computes over. A literal list here would be the second home this repository
// keeps finding — and a delisting would make it a lie with no symptom.

async function readPopulation(origin) {
  const response = await fetch(`${origin}/securities`);
  if (!response.ok) {
    throw new Error(
      `GET ${origin}/securities answered ${String(response.status)}; ` +
        "the composition arm cannot classify a frame without the population.",
    );
  }
  const body = await response.json();
  const securities = body.securities ?? [];
  const byKind = (kind) =>
    new Set(
      securities
        .filter((security) => security.kind === kind)
        .map((security) => security.symbol),
    );

  return {
    total: securities.length,
    proxies: byKind("index_etf"),
    sectorEtfs: byKind("sector_etf"),
    equities: byKind("equity"),
    all: securities,
  };
}

// --- Arm 1: the frame composition ----------------------------------------

/**
 * The per-frame symbol list, keyed by socket URL.
 *
 * **The question this answers is not the count.** Story 4.2's own premise was
 * one frame a minute and Task 4.2.1 corrected it to ~16; what nobody can say is
 * whether `SPY`, `QQQ`, `DIA` and `IWM` arrive in **one** of those frames or
 * across several — four marks in one frame is a synchronised wave, four across
 * several is a stagger the data genuinely has. The same question is asked of
 * the eleven sector benchmarks, whose region ranks all eleven at once.
 */
function composition(population, rows) {
  const bars = rows.filter(
    (row) => row.kind === "frame" && row.type === "bars",
  );

  const classify = (symbols) => {
    const proxies = symbols.filter((symbol) => population.proxies.has(symbol));
    const sectors = symbols.filter((symbol) =>
      population.sectorEtfs.has(symbol),
    );
    const equities = symbols.filter((symbol) =>
      population.equities.has(symbol),
    );
    const unknown = symbols.filter(
      (symbol) =>
        !population.proxies.has(symbol) &&
        !population.sectorEtfs.has(symbol) &&
        !population.equities.has(symbol),
    );
    return { proxies, sectors, equities: equities.length, unknown };
  };

  const perFrame = bars.map((row, index) => {
    const symbols = row.symbols ?? [];
    const kinds = classify(symbols);
    return {
      seq: index + 1,
      url: row.url ?? null,
      sentAt: row.sentAt,
      bytes: row.bytes,
      n: symbols.length,
      barMinutes: row.barMinutes ?? [],
      proxies: kinds.proxies,
      sectorEtfs: kinds.sectors,
      equityCount: kinds.equities,
      unclassified: kinds.unknown,
    };
  });

  // **The minute is the unit**, because one bar a security a minute is the
  // vendor's grain: *how many frames did it take to deliver this minute's four
  // proxies* is the wave-or-stagger question, and it is only askable per minute.
  //
  // **Keyed on the BAR's own minute, never on `sentAt`'s** — and that is a
  // repair rather than a preference. Task 4.1.6 measured that bars arrive in
  // second `:00`: 1,734 of 1,746 frames in five minutes landed in the first
  // second of a minute. So `sentAt`'s minute is the one key guaranteed to split
  // a single burst in two, and the first draft of this arm did exactly that.
  const minuteOf = (row) => row.barMinutes[0] ?? "";
  const minutes = new Map();
  for (const row of perFrame) {
    const key = minuteOf(row);
    if (key === "") continue;
    const held = minutes.get(key) ?? {
      minute: key,
      frames: 0,
      proxyFrames: 0,
      proxies: new Set(),
      sectorFrames: 0,
      sectorEtfs: new Set(),
    };
    held.frames += 1;
    if (row.proxies.length > 0) held.proxyFrames += 1;
    for (const symbol of row.proxies) held.proxies.add(symbol);
    if (row.sectorEtfs.length > 0) held.sectorFrames += 1;
    for (const symbol of row.sectorEtfs) held.sectorEtfs.add(symbol);
    minutes.set(key, held);
  }

  const perMinute = [...minutes.values()].map((held) => ({
    minute: held.minute,
    frames: held.frames,
    proxiesHeard: held.proxies.size,
    framesCarryingAProxy: held.proxyFrames,
    sectorEtfsHeard: held.sectorEtfs.size,
    framesCarryingASectorEtf: held.sectorFrames,
  }));

  return {
    frames: {
      bars: bars.length,
      snapshot: rows.filter(
        (row) => row.kind === "frame" && row.type === "snapshot",
      ).length,
      overview: rows.filter(
        (row) => row.kind === "frame" && row.type === "overview",
      ).length,
      feed: rows.filter((row) => row.kind === "frame" && row.type === "feed")
        .length,
    },
    sockets: [
      ...new Map(
        rows
          .filter((row) => row.kind === "socket")
          .map((row) => [row.url, { url: row.url, ours: row.ours }]),
      ).values(),
    ],
    symbolsPerBarsFrame: distribution(perFrame.map((row) => row.n)),
    bytesPerBarsFrame: distribution(perFrame.map((row) => row.bytes)),
    proxiesPerBarsFrame: distribution(
      perFrame
        .filter((row) => row.proxies.length > 0)
        .map((row) => row.proxies.length),
    ),
    sectorEtfsPerBarsFrame: distribution(
      perFrame
        .filter((row) => row.sectorEtfs.length > 0)
        .map((row) => row.sectorEtfs.length),
    ),
    // **A frame carrying bars for two different minutes is its own finding**,
    // and the protocol's note about one upstream frame's worth rests on it
    // being zero.
    framesSpanningTwoBarMinutes: perFrame.filter(
      (row) => row.barMinutes.length > 1,
    ).length,
    // **The verdict sentence the protocol asks the watcher to confirm.**
    waveOrStagger:
      perMinute.length === 0
        ? "nothing: no bars frame carried a sentAt, so no minute was formed"
        : perMinute.every((minute) => minute.framesCarryingAProxy <= 1)
          ? "WAVE: in every minute observed, at most ONE frame carried any of " +
            "the four proxies, so four marks fire together"
          : "STAGGER: at least one minute delivered the proxies across more " +
            "than one frame, so the marks fire apart",
    perMinute,
    perFrame,
  };
}

/**
 * The furnished socket, local only.
 *
 * **It refuses anything but loopback**, because ADR 0030 §7a is that the
 * deployed site never shows anything but the real market, at any hour — and a
 * `routeWebSocket` handler pointed at the deployed frontend would put
 * synthetic frames in front of a real page. The frames also say `synthetic` on
 * the wire, so no row in a log can be read as a measurement.
 */
function assertFurnishedIsLocal(origin) {
  const host = new URL(origin).hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") {
    throw new Error(
      `--furnished refuses ${origin}: the host is not loopback. Nothing ` +
        "synthetic reaches a deployed page at any hour (ADR 0030 §7a). Run " +
        "the dry run against a local pair and the real arm with no --furnished.",
    );
  }
}

const observation = (startsAt, close) => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

/**
 * Three furnished compositions, rotated, so the analysis above is exercised
 * rather than merely run.
 *
 * The shapes are chosen to make the wave-or-stagger verdict **falsifiable in
 * the dry run**: rotation 0 carries all four proxies in one frame and rotation
 * 2 carries one of them, so a minute of this feed is a STAGGER and the verdict
 * says so. A dry run in which the verdict could only read one way proves
 * nothing about the verdict.
 */
function furnishedComposition(index, population) {
  const proxies = [...population.proxies];
  const sectors = [...population.sectorEtfs];
  const equities = [...population.equities];

  if (index % 3 === 0) return [...proxies, ...sectors.slice(0, 2)];
  if (index % 3 === 1) return [...sectors.slice(2), ...equities.slice(0, 40)];
  return [...proxies.slice(0, 1), ...equities.slice(40, 100)];
}

async function runComposition() {
  // **The refusal is the first statement in the arm**, before a request is
  // made or a browser is launched. A guard that fires after the instrument has
  // already touched the deployment is a guard that has already been late once.
  if (FURNISHED) assertFurnishedIsLocal(FRONTEND);

  const population = await readPopulation(BACKEND);
  say(
    `  population: ${String(population.total)} securities — ` +
      `${String(population.proxies.size)} index proxies, ` +
      `${String(population.sectorEtfs.size)} sector benchmarks, ` +
      `${String(population.equities.size)} equities`,
  );

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  // **The furnished timers are held so they can be cleared, which is a defect
  // the dry run found in this very script.** The first draft cleared the
  // interval from `ws.onClose` only; closing the browser does not deliver one,
  // so the interval outlived the run, Node never reached its own exit, and the
  // process had to be killed — `furnishedFramesSent` read 22 against 19
  // received, which is the leak counting itself. A furnished feed that cannot
  // be switched off is an instrument that hangs at the end of every sitting.
  const furnished = { frames: 0, timers: new Set() };

  if (FURNISHED) {
    // **The route goes on FIRST and is awaited.** Two reasons, and both are
    // measured defects. Playwright installs its own `WebSocket` when a route is
    // registered, so a wrapper installed before it is silently overwritten and
    // reports n = 0 (Task 4.5.8's first draft); registering the route first
    // means the wrapper wraps Playwright's class and sees every furnished
    // frame. And an unawaited `routeWebSocket` leaves the page talking to the
    // gateway directly, which looks identical on screen.
    await page.routeWebSocket(/\/market-stream$/u, (ws) => {
      const send = (frame) => {
        furnished.frames += 1;
        ws.send(JSON.stringify(frame));
      };
      const now = () => new Date().toISOString();

      send({
        type: "feed",
        version: 1,
        sentAt: now(),
        feed: { status: "live", feed: "synthetic", marketOpen: true },
      });
      send({
        type: "snapshot",
        version: 1,
        sentAt: now(),
        observations: {},
        feed: { status: "live", feed: "synthetic", marketOpen: true },
      });
      send({
        type: "overview",
        version: 1,
        sentAt: now(),
        overview: {
          computedAt: now(),
          feeds: ["synthetic"],
          figures: [],
        },
      });

      let index = 0;
      const timer = setInterval(() => {
        const minute = new Date(
          Math.floor(Date.now() / 60_000) * 60_000 - 60_000,
        ).toISOString();
        const symbols = furnishedComposition(index, population);
        index += 1;
        send({
          type: "bars",
          version: 1,
          sentAt: now(),
          observations: Object.fromEntries(
            symbols.map((symbol, at) => [
              symbol,
              observation(minute, 100 + at / 100),
            ]),
          ),
        });
      }, FURNISHED_GAP_MS);
      furnished.timers.add(timer);

      ws.onClose(() => {
        clearInterval(timer);
        furnished.timers.delete(timer);
      });
    });
    say(
      `  FURNISHED: one bars frame every ${String(FURNISHED_GAP_MS)} ms ` +
        "(16.1 a minute, LIVE-DATA.md §10.2's close figure), labelled " +
        "`synthetic` on the wire, against a loopback origin only",
    );
  }

  await page.addInitScript(pageInstrument({ repaintSelector: "main" }));
  await page.goto(`${FRONTEND}${ROUTE}`, { waitUntil: "domcontentloaded" });

  const deadline = Date.now() + MINUTES * 60_000;
  const rows = [];
  const drains = [];

  while (Date.now() < deadline) {
    await page.waitForTimeout(DRAIN_EVERY_MS);
    const batch = await drain(page);
    const got = batch?.rows ?? [];
    const framesThisDrain = got.filter((row) => row.kind === "frame").length;
    drains.push({
      at: new Date().toISOString(),
      rows: got.length,
      frames: framesThisDrain,
      wrapperIntact: batch?.state.wrapperIntact ?? null,
      visibility: batch?.state.visibility ?? null,
    });
    say(
      `  drain ${String(drains.length)} at ${et(new Date())}: ` +
        `${String(got.length)} rows, ${String(framesThisDrain)} frames, ` +
        `wrapper ${String(batch?.state.wrapperIntact)}`,
    );

    for (const row of got) {
      if (row.kind === "frame" || row.kind === "socket") {
        record({ arm: "composition", ...row });
        rows.push(row);
      }
    }
  }

  // **At least one frame kept WHOLE on disk**, because the instrument is
  // deleted and a conclusion is not evidence (`ALPACA.md` §11).
  const firstBars = rows.find(
    (row) => row.kind === "frame" && row.type === "bars",
  );
  if (firstBars !== undefined) {
    writeFileSync(
      resolve(OUT, `bars-frame-verbatim-${stamp}.json`),
      `${JSON.stringify(firstBars, null, 2)}\n`,
    );
  }

  await browser.close();
  for (const timer of furnished.timers) clearInterval(timer);
  furnished.timers.clear();

  return {
    route: ROUTE,
    origin: FRONTEND,
    furnished: FURNISHED,
    furnishedFramesSent: FURNISHED ? furnished.frames : null,
    drains,
    // **The claim the dry run exists to make.** Three drains with frames
    // arriving between them is the loop; one drain is the wiring.
    drainsWithFrames: drains.filter((row) => row.frames > 0).length,
    ...composition(population, rows),
  };
}

// --- Arm 2: the `feed`-frame re-count ------------------------------------

/**
 * Task 4.1.6's method and window, unchanged: **one socket, one symbol, 75 s.**
 *
 * Node 24 has a global `WebSocket`, so this needs no dependency — and it is
 * deliberately NOT a browser, because the original reading was taken from a
 * Node client and the two readings have to compare.
 */
async function runFeedRate() {
  const url = `${BACKEND.replace(/^http/u, "ws")}/market-stream`;
  const socket = new WebSocket(url);
  const counts = new Map();
  const feedFrames = [];
  let firstFeedVerbatim = null;
  let bytes = 0;

  const openedAt = await new Promise((done, fail) => {
    socket.addEventListener("open", () => {
      done(Date.now());
    });
    socket.addEventListener("error", (event) => {
      fail(new Error(`socket error on ${url}: ${String(event.type)}`));
    });
  });

  socket.send(
    JSON.stringify({ type: "subscribe", version: 1, symbols: [SYMBOL] }),
  );

  socket.addEventListener("message", (event) => {
    const text = typeof event.data === "string" ? event.data : "";
    bytes += Buffer.byteLength(text, "utf8");
    let frame;
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }
    counts.set(frame.type, (counts.get(frame.type) ?? 0) + 1);
    if (frame.type !== "feed") return;
    feedFrames.push({ at: Date.now(), bytes: Buffer.byteLength(text, "utf8") });
    if (firstFeedVerbatim === null) firstFeedVerbatim = text;
    record({ arm: "feed-rate", url, type: "feed", raw: text });
  });

  await new Promise((done) => setTimeout(done, FEED_WINDOW_S * 1_000));
  const elapsedS = (Date.now() - openedAt) / 1_000;
  socket.close();

  const feed = counts.get("feed") ?? 0;

  return {
    url,
    symbolsSubscribed: [SYMBOL],
    windowS: Number(elapsedS.toFixed(1)),
    frames: Object.fromEntries(counts),
    feedFrames: feed,
    feedFramesPerMinute: Number(((feed / elapsedS) * 60).toFixed(1)),
    bytesTotal: bytes,
    feedBytesEach:
      feedFrames.length > 0
        ? distribution(feedFrames.map((f) => f.bytes))
        : null,
    firstFeedFrameVerbatim: firstFeedVerbatim,
    // **The reading's own verdict, in Task 4.7.7's words**, because a figure
    // with no expectation beside it is a number somebody has to go and look up.
    verdict:
      feed === 0
        ? "nothing: no feed frame arrived at all. With the market shut that is " +
          "the keepalive only, so expect ~1 per 55 s — zero means the socket " +
          "never carried one and the reading is not a reading"
        : (feed / elapsedS) * 60 > 100
          ? "THE DEFECT RETURNED: anything near 300 a minute is the per-item " +
            "publish Task 4.7.7 repaired"
          : "repaired: the rate is the 55 s keepalive plus genuine changes of " +
            "the published view, against a median of 332 before 2026-10-11",
  };
}

// --- Arm 3: the two-tape source note -------------------------------------

/**
 * The served window's `sources`, off the DEPLOYED store.
 *
 * **It is a mid-session state and that is the whole point.** A served window's
 * `sources` describe the rows the *answer* contains; the read prefers `sip`
 * where a minute holds both tapes; and the nightly backfill covers every
 * regular-session minute. So the two-feed note exists between the bell and that
 * night's backfill and nowhere else — read it at 11:00 ET and it is there, at
 * 20:00 ET it is not.
 */
async function runSourceNote() {
  const url =
    `${BACKEND}/market-data/bars` + `?symbol=${SYMBOL}&timeframe=1m&sessions=1`;
  const response = await fetch(url);
  const body = await response.json();
  const series = body.series ?? {};
  const sources = series.provenance?.sources ?? [];

  record({ arm: "source-note", url, sources, barCount: series.bars?.length });

  return {
    url,
    status: response.status,
    symbol: SYMBOL,
    barCount: series.bars?.length ?? null,
    coverage: series.coverage ?? null,
    sources,
    verdict:
      sources.length >= 2
        ? `TWO TAPES: ${sources.map((source) => source.feed).join(" then ")} — ` +
          "this is the photograph, and it expires with tonight's backfill"
        : sources.length === 1
          ? `ONE tape (${String(sources[0].feed)}), ${String(series.bars?.length ?? 0)} bars: ` +
            "either the backfill has run or the session has not written a " +
            "live minute yet. Re-read mid-session."
          : "no sources at all: the store holds nothing for this window",
  };
}

// --- The run --------------------------------------------------------------

say(
  `\nThe sitting's frames — Task 4.9.1\n` +
    `  started ${et(startedAt)}\n` +
    `  frontend ${FRONTEND}\n` +
    `  backend  ${BACKEND}\n` +
    `  arms     ${[...ARMS].filter((arm) => arm !== "all").join(", ")}\n` +
    `  log      ${LOG}\n`,
);

const marketOpen = await (async () => {
  try {
    const response = await fetch(`${BACKEND}/diagnostics/feed`);
    const body = await response.json();
    return body.marketOpen === true;
  } catch {
    return null; // unknown, which is not the same as closed
  }
})();

say(
  `  market ${marketOpen === null ? "unknown" : marketOpen ? "OPEN" : "closed"}` +
    (marketOpen === true
      ? ""
      : " — every figure below is the rehearsal rather than the reading\n"),
);

const summary = {
  why: "task-4.9.1",
  startedAt: startedAt.toISOString(),
  frontend: FRONTEND,
  backend: BACKEND,
  marketOpen,
  furnished: FURNISHED,
};

if (ARMS.has("feed-rate")) {
  say(
    `\n[feed-rate] one socket, one symbol (${SYMBOL}), ${String(FEED_WINDOW_S)} s`,
  );
  summary.feedRate = await runFeedRate();
  say(`  ${summary.feedRate.verdict}`);
}

if (ARMS.has("source-note")) {
  say(`\n[source-note] ${SYMBOL}, 1m, one session, off the deployed store`);
  summary.sourceNote = await runSourceNote();
  say(`  ${summary.sourceNote.verdict}`);
}

if (ARMS.has("composition")) {
  say(
    `\n[composition] ${ROUTE} for ${String(MINUTES)} minute(s), ` +
      `draining every ${String(DRAIN_EVERY_MS)} ms`,
  );
  summary.composition = await runComposition();
  say(`  ${summary.composition.waveOrStagger}`);
}

summary.endedAt = new Date().toISOString();
writeFileSync(
  resolve(OUT, `summary-${stamp}.json`),
  `${JSON.stringify(summary, null, 2)}\n`,
);
say(`\n${JSON.stringify(summary, null, 2)}`);
