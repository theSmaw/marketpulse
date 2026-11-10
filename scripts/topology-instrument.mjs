// **The instrument Task 6.1.2's renderer figures come out of.**
//
//   pnpm build                                  # storybook-static/ must exist
//   node scripts/topology-instrument.mjs
//   node scripts/topology-instrument.mjs --headed       # a real GPU, see below
//   node scripts/topology-instrument.mjs --ceiling 1.4  # recorded in the output
//
// Not a gate, not a spec, not a `pnpm verify` step: it needs a built Storybook
// and a browser, and `verify` has neither by design.
//
// ## What it is for, in one sentence
//
// Story 6.1's acceptance criterion 1 — **the renderer is chosen by measurement,
// between two real candidates, and whichever wins ships even if it is not
// WebGL.** It drove both candidates over the *same* scripted pan/zoom path, at
// the *same* universe, through the *same* React component, on the built
// Storybook, and printed both distributions. The measurement is taken (ADR
// 0048) and Candidate A is deleted; what is left runs the surviving renderer
// over the same path, which is what Story 6.2 re-takes against `/`'s real box.
//
// ## Four rules it obeys because each is somebody's measured defect
//
// 1. **The frame-rate plant lives INSIDE the render loop.** The repaint arm of
//    `overview-instrument.mjs` watches `<main>` for mutations, and **a canvas
//    mutates no DOM at all** — so that channel reads silent for a working graph
//    exactly as it would for one that painted a single frame and died. Both
//    candidates call a `probe` once per drawn frame; the plant is a block
//    inside it, and the frame counter beside it is the only proof available
//    that the loop ran. There is no DOM watch here at all.
// 2. **Every channel is proved by its own plant, per candidate.** *A channel
//    going quiet and a cost going away produce the same output* — Task 4.8.6's
//    lesson, and it bit on this exact pair: `longtask` reported nothing at all
//    on a page where `long-animation-frame` reported 62.8–77.4 ms. So an arm
//    counts only when **every channel it reports caught the plant**, and the
//    plant is re-run for each candidate because the two render loops are
//    different code.
// 3. **The built Storybook, asserted rather than assumed** —
//    `assertStorybookBuild`, whose own negative proof is in
//    `prove-instrument.mjs`. A dev server serves unminified modules through an
//    on-demand transform and every figure taken that way is wrong in the
//    comfortable direction.
// 4. **The calibrator runs in its OWN loop.** The 2026-10-14 lesson: sampled
//    inside the measured loop, a 1.07–1.25 ms calibrator read 8.1–8.3 ms — a
//    reproducible 7.2× step — because V8 inlines it into the optimised loop and
//    the inlined copy runs in a lower tier. Here it is sampled between arms,
//    never during one. A **browser-side** calibrator needs no gap-inflation
//    caveat (measured ×1.00 at these gaps by Task 4.8.4), which is why this
//    file carries no Node-side timing at all.
//
// ## And the one caveat that cannot be designed away
//
// **Which GPU drew**, and it is part of the figure rather than context.
// Measured on 2026-10-30 and it changed a comparison: headless Chromium on this
// machine reports
//
//   ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) ...
//
// — **SwiftShader, a software rasteriser** — while `--headed` reports
//
//   ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)
//
// So a headless run prices a WebGL library against a CPU and calls it a
// comparison. Every arm records `UNMASKED_RENDERER_WEBGL`, the run prints it,
// and **every figure quoted from this instrument names the string it was taken
// under**.

import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { acquireLock, releaseLockOnExit } from "./heavy-job.mjs";
import {
  LOAD_CEILING,
  assertStorybookBuild,
  assertVisible,
  distribution,
  readMachineLoad,
  startProductionPair,
} from "./overview-instrument.mjs";

// No `/* global */` block, and that is worth a line rather than an omission:
// every browser-side read in this file lives inside a template string that is
// handed to `addInitScript` or `page.evaluate`, so ESLint sees string content
// and not identifiers. The neighbouring instruments declare browser globals on
// the functions that spell them out of a string — `scripts/probe.mjs`' idiom —
// and this one has none to declare.

const REPO_ROOT = resolve(import.meta.dirname, "..");
const STATIC_ROOT = resolve(REPO_ROOT, "apps/frontend/storybook-static");
const OUT = resolve(REPO_ROOT, ".capture/topology");
mkdirSync(OUT, { recursive: true });

const headed = process.argv.includes("--headed");
const live = process.argv.includes("--live");
const ceilingArgument = (() => {
  const at = process.argv.indexOf("--ceiling");
  if (at === -1) return null;
  const value = Number(process.argv[at + 1]);
  return Number.isFinite(value) && value > 0 ? value : null;
})();

const say = (line) => process.stdout.write(`${line}\n`);

/**
 * The arms.
 *
 * **There were two on 2026-10-30, comparing renderers.** Task 6.1.2 drove
 * Candidate A (`components-markettopology--sigma-whole-universe`, Sigma.js 4 +
 * graphology over WebGL2) and Candidate B through this list, differing by a
 * `renderer` prop and nothing else; ADR 0048 took the decision and the loser
 * was deleted in the same change, so the A story no longer resolves. The
 * transcript is in Task 6.1.2's own record, verbatim, because the thing it
 * measured is gone and a conclusion is not evidence.
 *
 * **A third arm since 2026-11-07 (Task 6.5.3), comparing EDGE COUNT rather
 * than renderer.** `membership` is the picture every one of Stories 6.1–6.4
 * measured against — 516 nodes, 512 edges. `correlations` is
 * `components-markettopology--correlations`, the Storybook story Task 6.5.2
 * built and Task 6.5.3 corrected to the real measured shape (1,860 retained
 * pairs, 82.4% same-sector, from Task 6.5.1's own run) — the first time this
 * renderer has been frame-timed with anywhere near its real edge count. ADR
 * 0048's own reversal trigger is *the first graph whose node or edge count
 * exceeds the candidate it was measured at*, and this is that trigger fired
 * on purpose rather than by accident.
 *
 * The shape is kept — a list, interleaved passes — because Story 6.2 re-takes
 * these figures against `/`'s real box and `TOPOLOGY_RING_RADIUS`' elliptical
 * deformation, which is a second arm against the same path.
 */
const CANDIDATES = [
  {
    id: "membership",
    name: "hand-rolled Canvas2D — 516 nodes, 512 membership edges",
    story: "components-markettopology--whole-universe",
  },
  {
    id: "correlations",
    name: "hand-rolled Canvas2D — 516 nodes, 512 membership + 1,860 correlation edges",
    story: "components-markettopology--correlations",
  },
];

/**
 * How long the scripted interaction runs, and the plant's size.
 *
 * 120 ms is well above the 50 ms line on all three channels and well above
 * Chromium's 0.1 ms timer quantisation, which is `overview-instrument.mjs`'
 * own sizing argument for the same figure.
 */
const PLANT_MS = 120;

/** The one quantum every gap is read against. 60 FPS. */
const FRAME_QUANTUM_MS = 1000 / 60;

const VIEWPORT = { width: 1440, height: 900 };

// --- A static server for the built workshop -------------------------------
//
// `storybook-static/` over HTTP rather than `file://`: the fingerprint is read
// over the wire, module scripts need a real origin, and `vite preview` serves
// the application's artefact rather than the workshop's.

const MIME = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function serveStatic(root) {
  const server = createServer((request, response) => {
    const path = String(request.url).split("?")[0];
    const file = resolve(
      root,
      path === "/" ? "index.html" : path.replace(/^\/+/u, ""),
    );

    // Refuse anything outside the root rather than joining blindly. A one-off
    // local server is still a server.
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end();
      return;
    }

    try {
      const body = readFileSync(file);
      response.writeHead(200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  return server;
}

// --- The page-side instrument ---------------------------------------------
//
// Deliberately NOT `overview-instrument.mjs`' `pageInstrument`. That one wraps
// `WebSocket`, installs a React commit counter and attaches a
// `MutationObserver` to `<main>` — none of which exists in a Storybook iframe,
// and the last of which is the channel this task exists to replace. What is
// left is the two channels that can see a canvas plus the rAF recorder.

const pageInstrument = () => `(() => {
  const gaps = [];
  const longs = [];

  globalThis.__mpTopologyFrames = 0;
  globalThis.__mpTopologyPlantMs = 0;

  // --- Channels 1 and 2: long-animation-frame and longtask ----------------
  //
  // Both, separately, and both reported — because *a channel going quiet and a
  // cost going away produce the same output*, and this exact pair has already
  // disagreed once in this repository: on /securities' cold load \`longtask\`
  // reported nothing while LoAF reported 62.8–77.4 ms on 10 of 10 loads.
  const support = {};
  for (const type of ["long-animation-frame", "longtask"]) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const scripts = entry.scripts ?? [];
          longs.push({
            entryType: entry.entryType,
            ms: Math.round(entry.duration * 10) / 10,
            startTime: Math.round(entry.startTime * 10) / 10,
            // **Which frame, and whose script.** A 65.9 ms frame at the first
            // interaction after an idle page and a 65.9 ms frame in the middle
            // of a drag are different findings, and a duration with no position
            // in the run cannot tell them apart. The invokers say whether the
            // cost was script at all — \`longtask\` is silent here while LoAF is
            // not, which is the same split /securities' cold load shows.
            scriptMs:
              Math.round(scripts.reduce((t, x) => t + x.duration, 0) * 10) / 10,
            invokers: scripts.map((x) => x.invoker ?? x.name ?? "?").slice(0, 3),
          });
        }
      }).observe({ type, buffered: false });
      support[type] = true;
    } catch (error) {
      support[type] = String(error);
    }
  }

  // --- Channel 3: a continuous rAF-gap recorder ---------------------------
  //
  // The only one of the three that has an opinion below 50 ms, which is where
  // a 60 FPS claim lives: LoAF has no entry under 50 and \`longtask\` none under
  // 50 either, so *no task over 50 ms* and *60 FPS during interaction* are two
  // different measurements and this is the second one.
  let last = null;
  const onFrame = (stamp) => {
    if (last !== null) gaps.push(Math.round((stamp - last) * 100) / 100);
    last = stamp;
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  // --- The calibrator, in its OWN loop ------------------------------------
  //
  // Never sampled from inside a measured loop: the 2026-10-14 lesson is that
  // V8 inlines it into the optimised loop and the inlined copy runs in a lower
  // tier, so what it reports is the loop's compilation state rather than the
  // machine's load — a 1.07–1.25 ms calibrator reading 8.1–8.3 ms,
  // reproducibly, with most samples discarded.
  let sink = 0;
  const calibrate = () => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 2000000; i += 1) x += Math.sqrt(i);
    sink += x;
    return Math.round((performance.now() - t) * 100) / 100;
  };
  for (let i = 0; i < 12; i += 1) calibrate();
  globalThis.__mpCalibrate = (n) => {
    const samples = [];
    for (let i = 0; i < n; i += 1) samples.push(calibrate());
    return samples;
  };
  globalThis.__mpSink = () => sink;

  // --- Which GPU drew, read from the page rather than assumed -------------
  globalThis.__mpGpu = () => {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    if (gl === null) return { webgl2: false };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl2: true,
      vendor: info === null ? null : gl.getParameter(info.UNMASKED_VENDOR_WEBGL),
      renderer: info === null ? null : gl.getParameter(info.UNMASKED_RENDERER_WEBGL),
      version: gl.getParameter(gl.VERSION),
    };
  };

  globalThis.__mpNow = () => Math.round(performance.now() * 10) / 10;

  globalThis.__mpDrain = () => ({
    gaps: gaps.splice(0, gaps.length),
    longs: longs.splice(0, longs.length),
    frames: globalThis.__mpTopologyFrames ?? 0,
    support,
    visibility: document.visibilityState,
    nodes: document.querySelectorAll("*").length,
  });
})();`;

// --- The scripted path, identical for both candidates ---------------------

/**
 * One pan/zoom path, ~5 s, over the centre of the frame.
 *
 * **Fixed deltas and a fixed polyline, driven over CDP** — a still canvas
 * certifies nothing, and a path improvised per candidate is two measurements.
 * Equal numbers of in and out notches so both arms end near the zoom they
 * started at: the drawn work is the same either way (neither candidate culls),
 * but a run that ends at a different zoom is a run whose last second is a
 * different picture.
 *
 * @param {import("@playwright/test").Page} page
 */
async function drivePath(page) {
  const cx = VIEWPORT.width / 2;
  const cy = VIEWPORT.height / 2;

  await page.mouse.move(cx, cy);

  for (const [deltaY, times] of [
    [-120, 3],
    [0, 0],
  ]) {
    for (let index = 0; index < times; index += 1) {
      await page.mouse.wheel(0, deltaY);
      await page.waitForTimeout(140);
    }
  }

  // A drag polyline: 24 moves, 20 ms apart, a closed loop so the view comes
  // back. `steps` is left at 1 deliberately — Playwright's interpolation would
  // post several events per move and the two arms would see different event
  // rates depending on how long each took to answer one.
  const polyline = [];
  for (let index = 0; index < 24; index += 1) {
    const turn = (index / 24) * Math.PI * 2;
    polyline.push([cx + Math.cos(turn) * 180, cy + Math.sin(turn) * 120]);
  }

  await page.mouse.down();
  for (const [x, y] of polyline) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();

  for (let index = 0; index < 3; index += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(140);
  }

  await page.mouse.down();
  for (const [x, y] of [...polyline].reverse()) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
}

// --- The route-level interaction harness — Task 6.7.4, AC 1 ---------------
//
// **Required infrastructure for AC 1, named as a gap in `TOPOLOGY.md` §4
// twice (Stories 6.3, 6.6) without closing it.** Everything above this
// point drives a Storybook story; `/` has never been driven by anything
// but `pnpm probe`'s own static screenshot path. This is the first thing
// in this repository to drive the REAL route's pan/zoom AND a live update
// concurrently, which is what §28's 60 FPS claim is actually about — a
// picture that keeps moving while a reader interacts with it, not a
// picture that is merely present.
//
// ## Why a production pair, not the Storybook server above
//
// `/` needs a real backend (the universe, and — for the "full" arm — real
// correlation rows), which Storybook's iframe never has. `overview-
// instrument.mjs`'s `startProductionPair()` is this repository's own
// established recipe (Task 4.8.x, reused unmodified by Task 6.7.1): a
// built frontend served by `vite preview`, a real `dist/index.js` backend,
// `provider=none` so no live writer runs against either store.
//
// ## The two arms, and why they are two STORES rather than one graph with
// a flag
//
// `CANDIDATES` above compares `membership` against `correlations` through
// two fixed Storybook stories; the real route has no such flag — its
// graph is whatever the backend's `GET /securities` and
// `GET /market-data/relationships` answer. `marketpulse_bare` (zero bars,
// no provider, ever) answers the second with nothing, which is a
// membership-only graph for free — the SAME shape `CANDIDATES[0]` is.
// `marketpulse` is a developer's own store with Task 6.5's nightly pass
// already run against it, so it answers with real correlation rows — the
// SAME shape `CANDIDATES[1]` is. Interleaving the two stores is this
// task's own version of ADR 0048's established control: an unaffected
// baseline run beside the arm under test, which is what tells a real
// cost apart from the machine having drifted mid-run.
//
// ## What proves "the loop ran", since `probe` is not an option here
//
// `pageInstrument()` below's `__mpTopologyFrames` counter depends on a
// `probe` callback the renderer is constructed with — and
// `MarketTopology.tsx`'s own module docblock states, as a traced fact
// rather than an assumption, that "`probe` is `undefined` in every
// application call site." So this harness proves the loop ran the way
// `overview-market-topology-anomaly-bands.spec.ts` and
// `overview-market-topology-live-mark.spec.ts` already do at the browser
// level: a whole-canvas digest (`getImageData`, FNV-1a), sampled
// repeatedly through the run, where MULTIPLE DISTINCT values are the
// proof — a frozen picture would read back one value for ever.
//
// ## The live-update mechanism
//
// A pass-through `routeWebSocket` — the real gateway's own
// subscribe/snapshot sequence is honoured — with one extra `bars` frame
// injected directly on the client route every few seconds (compressed
// from the real one-a-minute cadence, labelled as such), carrying every
// one of the real subscribed universe's symbols. This is Task 6.7.1's own
// measurement technique, reused rather than re-invented.

/**
 * The page-side instrument for the live route — `pageInstrument()` above,
 * reused verbatim for its three channels and the calibrator, PLUS a
 * whole-canvas digest function callable on demand (not inside the init
 * script's own closure, because a digest is a READ taken whenever the
 * harness asks, not a continuous recorder).
 */
function liveRoutePageInstrument() {
  return `${pageInstrument()}
(() => {
  globalThis.__mpTopologyDigest = () => {
    const canvas = document.querySelector("canvas");
    if (canvas === null) return "no canvas";
    const context = canvas.getContext("2d");
    if (context === null) return "no context";
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 0x811c9dc5;
    for (const byte of data) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
    return String(hash >>> 0) + "@" + String(canvas.width) + "x" + String(canvas.height);
  };
})();`;
}

/**
 * One continuous pan+zoom gesture, longer than {@link drivePath}'s ~5 s —
 * the live arm runs for the length of several live-update bursts rather
 * than one short scripted path, so the gesture loops rather than running
 * once.
 *
 * @param {import("@playwright/test").Page} page
 * @param {number} durationMs
 */
async function driveContinuousInteraction(page, durationMs) {
  const cx = VIEWPORT.width / 2;
  const cy = VIEWPORT.height / 2;
  const until = Date.now() + durationMs;
  let turn = 0;

  await page.mouse.move(cx, cy);

  while (Date.now() < until) {
    const x = cx + Math.cos(turn) * 180;
    const y = cy + Math.sin(turn) * 120;
    await page.mouse.move(x, y);
    if (Math.floor(turn * 2) % 5 === 0) {
      await page.mouse.wheel(0, Math.sin(turn) > 0 ? -40 : 40);
    }
    turn += 0.12;
    await page.waitForTimeout(20);
  }
}

/**
 * One live-route arm: a real production pair against `databaseName`, a
 * pass-through socket with injected live-update bursts, a continuous
 * pan/zoom gesture running concurrently, and the three-part conjunction
 * read off at the end.
 *
 * @param {{ databaseName: string, label: string, headed: boolean, runSeconds: number }} options
 */
async function runLiveRouteArm({
  databaseName,
  label,
  headed: isHeaded,
  runSeconds,
}) {
  const pair = await startProductionPair({ databaseName, provider: "none" });

  try {
    const { chromium } = await import("@playwright/test");
    // **The built output's own file path, not the bare `@marketpulse/shared`
    // specifier** — a root-level script has no `node_modules` entry for a
    // workspace package's alias, only the apps and the package itself do.
    // `packages/shared/dist/index.js` is the same artefact every workspace
    // import resolves to; `pnpm build` is what keeps it current, same as
    // every other consumer.
    const sharedModule = await import(
      pathToFileURL(resolve(REPO_ROOT, "packages/shared/dist/index.js")).href
    );
    const browser = await chromium.launch({ headless: !isHeaded });
    const context = await browser.newContext({ viewport: VIEWPORT });

    const universeResponse = await context.request.get(
      `${pair.backendOrigin}/securities`,
    );
    const universe = await universeResponse.json();
    const symbols = universe.securities.map((security) => security.symbol);

    let clientSocket = null;
    let subscribedCount = 0;

    await context.routeWebSocket(/\/market-stream$/u, (ws) => {
      clientSocket = ws;
      const server = ws.connectToServer();
      server.onMessage((raw) => ws.send(raw));
      ws.onMessage((raw) => {
        try {
          const decoded = JSON.parse(String(raw));
          if (Array.isArray(decoded?.symbols)) {
            subscribedCount = decoded.symbols.length;
          }
        } catch {
          /* not a subscribe frame */
        }
        server.send(raw);
      });
    });

    await context.addInitScript(liveRoutePageInstrument());

    const page = await context.newPage();
    await page.goto(`${pair.frontendOrigin}/`, {
      waitUntil: "domcontentloaded",
    });
    await assertVisible(page);

    const canvas = page
      .getByRole("region", { name: "Market topology" })
      .getByRole("img", { name: /A graph of every security we track/u });
    await canvas.waitFor({ state: "visible", timeout: 15_000 });

    // Settle the cold-load figures before anything this arm cares about.
    await page.waitForTimeout(1_000);
    await page.evaluate(() => globalThis.__mpDrain?.());

    const gpu = await page.evaluate(() => globalThis.__mpGpu?.());
    const calibrator = await page.evaluate(
      (n) => globalThis.__mpCalibrate?.(n),
      8,
    );

    const digests = new Set();
    const started = Date.now();
    let burst = 0;

    const sampleDigest = async () => {
      const digest = await page.evaluate(() =>
        globalThis.__mpTopologyDigest?.(),
      );
      digests.add(digest);
    };

    const injectBurst = () => {
      if (clientSocket === null) return;
      burst += 1;
      const observations = {};
      const startsAt = new Date(started + burst * 1_000).toISOString();
      for (const symbol of symbols) {
        observations[symbol] = {
          startsAt,
          open: 100,
          high: 100,
          low: 100,
          close: 100 + (burst % 5),
          volume: 1_000,
        };
      }
      clientSocket.send(
        sharedModule.encodeMarketStreamMessage({
          type: "bars",
          version: sharedModule.MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: new Date().toISOString(),
          observations,
        }),
      );
    };

    // **The interaction and the live updates, concurrent** — AC 1's own
    // rewritten text. A burst every 4 s (compressed from the real ~60 s
    // cadence, labelled as such) while the gesture loop above runs without
    // stopping for it.
    const gesture = driveContinuousInteraction(page, runSeconds * 1_000);
    const burstInterval = setInterval(injectBurst, 4_000);
    const digestInterval = setInterval(() => void sampleDigest(), 500);
    injectBurst();

    await gesture;
    clearInterval(burstInterval);
    clearInterval(digestInterval);
    await sampleDigest();

    const drained = await page.evaluate(() => globalThis.__mpDrain?.());

    await browser.close();

    const gaps = drained?.gaps ?? [];
    const longs = (drained?.longs ?? []).filter((entry) => entry.ms > 50);

    return {
      label,
      databaseName,
      headed: isHeaded,
      runSeconds,
      subscribedCount,
      universeSize: symbols.length,
      bursts: burst,
      gpu,
      calibratorMs: calibrator,
      distinctDigests: digests.size,
      gapsSampleCount: gaps.length,
      gapP50: distribution(gaps).p50,
      gapP95: distribution(gaps).p95,
      gapsOver50: gaps.filter((gap) => gap > 50).length,
      longEntriesOver50: longs.length,
      longEntries: longs.slice(0, 10),
    };
  } finally {
    await pair.stop();
  }
}

if (live) {
  say("\nThe real route, driven — Task 6.7.4, AC 1\n");

  const loadBeforeLive = await readMachineLoad(
    ceilingArgument === null ? {} : { ceiling: ceilingArgument },
  );
  say(`1. ${loadBeforeLive.message}`);

  if (!loadBeforeLive.ok) {
    say(
      "\n  REFUSED. A figure that was never allowed to be taken cannot be quoted.\n",
    );
    process.exit(1);
  }

  const liveLock = acquireLock("node scripts/topology-instrument.mjs --live");
  if (!liveLock.ok) {
    console.error(liveLock.message);
    process.exit(1);
  }
  releaseLockOnExit();

  const arms = [
    {
      databaseName: "marketpulse_bare",
      label: "membership (control, zero bars)",
    },
    { databaseName: "marketpulse", label: "full (real correlation rows)" },
    {
      databaseName: "marketpulse_bare",
      label: "membership (control, zero bars)",
    },
    { databaseName: "marketpulse", label: "full (real correlation rows)" },
  ];

  const results = [];
  for (const arm of arms) {
    say(
      `\nRunning: ${arm.label} (${arm.databaseName}), headed=${String(headed)}`,
    );
    const loadDuring = await readMachineLoad(
      ceilingArgument === null ? {} : { ceiling: ceilingArgument },
    );
    say(`  load before this arm: ${loadDuring.message}`);
    // Arms run sequentially, deliberately — one production pair occupies
    // the harness's two fixed ports, so a second one cannot start until
    // this one's `stop()` has run.
    const result = await runLiveRouteArm({
      ...arm,
      headed,
      runSeconds: 20,
    });
    say(`  ${JSON.stringify(result, null, 2)}`);
    results.push(result);
  }

  writeFileSync(
    resolve(OUT, `live-${headed ? "headed" : "headless"}.json`),
    JSON.stringify(
      { startedAt: new Date().toISOString(), headed, arms: results },
      null,
      2,
    ),
  );

  say(
    `\nWritten to ${resolve(OUT, `live-${headed ? "headed" : "headless"}.json`)}`,
  );
  process.exit(0);
}

// --- 1. The machine, read BEFORE the run and never during -----------------

say("\nThe topology renderer, measured — Task 6.1.2\n");

const loadBefore = await readMachineLoad(
  ceilingArgument === null ? {} : { ceiling: ceilingArgument },
);
say(`1. ${loadBefore.message}`);

if (!loadBefore.ok) {
  say(
    "\n  REFUSED. A figure that was never allowed to be taken cannot be quoted.\n" +
      `  Wait for the machine, or state the raise: --ceiling <ratio> above ${String(LOAD_CEILING)}.\n`,
  );
  process.exit(1);
}

const lock = acquireLock("node scripts/topology-instrument.mjs");
if (!lock.ok) {
  console.error(lock.message);
  process.exit(1);
}
releaseLockOnExit();

// --- 2. The built workshop, asserted --------------------------------------

const server = serveStatic(STATIC_ROOT);
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${String(server.address().port)}`;

const build = await assertStorybookBuild(origin);
say(
  `\n2. BUILT STORYBOOK — ${build.iframe}\n` +
    `   CONFIG_TYPE=${build.configType} bundle=${build.bundle} ` +
    `${String(Math.round(build.bundleBytes / 1024))} KiB`,
);

// --- 3. Both candidates, interleaved --------------------------------------

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: !headed });
const summary = {
  startedAt: new Date().toISOString(),
  headed,
  viewport: VIEWPORT,
  build,
  load: { before: loadBefore },
  frameQuantumMs: FRAME_QUANTUM_MS,
  plantMs: PLANT_MS,
  arms: [],
};

/** One arm: mount, prove the channels, then drive the path. */
async function measure(candidate, pass) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(pageInstrument());
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  // **The URL, not just "a 404".** The first headed run reported a console
  // error with no address on it, which is unactionable and reads exactly like
  // a renderer failing to fetch something it needs.
  page.on("requestfailed", (request) =>
    errors.push(`requestfailed: ${request.url()}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${String(response.status())}: ${response.url()}`);
  });

  await page.goto(
    `${origin}/iframe.html?id=${candidate.story}&viewMode=story`,
    { waitUntil: "domcontentloaded" },
  );

  // `document.visibilityState` FIRST. A CDP-driven tab can report `hidden`,
  // which pauses rAF and makes every figure below small, plausible and
  // meaningless.
  const visibility = await assertVisible(page);

  // Mounted means DREW, not rendered: the frame counter is incremented from
  // inside each candidate's own draw. A component that mounted and painted
  // nothing never gets past here.
  await page.waitForFunction(
    () => (globalThis.__mpTopologyFrames ?? 0) > 0,
    undefined,
    { timeout: 20_000 },
  );

  const gpu = await page.evaluate(() => globalThis.__mpGpu());

  await page.waitForTimeout(1_200);
  const settled = await page.evaluate(() => globalThis.__mpDrain());

  // --- The plant, per channel, per candidate ------------------------------
  //
  // 120 ms blocked INSIDE this candidate's own render loop, then one wheel
  // notch to make it draw. Every channel that reports a figure below has to
  // have caught this; a silent channel is not a passing one.
  await page.evaluate((ms) => {
    globalThis.__mpTopologyPlantMs = ms;
  }, PLANT_MS);

  const framesBeforePlant = settled.frames;
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.mouse.wheel(0, index % 2 === 0 ? -120 : 120);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);

  const planted = await page.evaluate(() => globalThis.__mpDrain());

  await page.evaluate(() => {
    globalThis.__mpTopologyPlantMs = 0;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => globalThis.__mpDrain());

  // --- The calibrator, between the arms rather than inside one ------------
  const calibrator = await page.evaluate(() => globalThis.__mpCalibrate(20));

  // --- The acceptance run -------------------------------------------------
  //
  // The page's own clock at the opening of the run, so every long frame below
  // can be placed INSIDE it rather than only dated.
  const runOpenedAt = await page.evaluate(() => globalThis.__mpNow());
  const startedAt = Date.now();
  await drivePath(page);
  const elapsedMs = Date.now() - startedAt;

  const run = await page.evaluate(() => globalThis.__mpDrain());

  await page.screenshot({
    path: resolve(OUT, `candidate-${candidate.id}-pass-${String(pass)}.png`),
  });

  // Every long frame that OVERLAPS the run, placed inside it. A frame that had
  // already ended when the run opened is the instrument's, not the renderer's.
  const inRun = run.longs
    .map((row) => ({
      ...row,
      intoRunMs: Math.round((row.startTime - runOpenedAt) * 10) / 10,
    }))
    .filter((row) => row.startTime + row.ms > runOpenedAt);

  const arm = {
    candidate: candidate.id,
    name: candidate.name,
    pass,
    story: candidate.story,
    visibility,
    gpu,
    pageErrors: errors,
    observerSupport: run.support,
    domNodesInIframe: run.nodes,

    // The plant's own transcript, per channel. `caught*` is what licenses the
    // acceptance figures below it.
    plant: {
      ms: PLANT_MS,
      framesDrawnDuringPlant: planted.frames - framesBeforePlant,
      caughtByLoaf: planted.longs
        .filter((row) => row.entryType === "long-animation-frame")
        .map((row) => row.ms),
      caughtByLongtask: planted.longs
        .filter((row) => row.entryType === "longtask")
        .map((row) => row.ms),
      caughtByRafGap: planted.gaps.filter((gap) => gap >= PLANT_MS * 0.8),
      worstRafGapMs: Math.max(...planted.gaps, 0),
    },

    // The acceptance figures.
    run: {
      elapsedMs,
      framesDrawn: run.frames - planted.frames,
      drawnPerSecond:
        Math.round(((run.frames - planted.frames) / elapsedMs) * 1000 * 10) /
        10,
      rafGapMs: distribution(run.gaps),
      gapsOverQuantum: run.gaps.filter((gap) => gap > FRAME_QUANTUM_MS).length,
      gapsOver50: run.gaps.filter((gap) => gap > 50).length,
      runOpenedAt,
      longEntries: inRun,
      // **Reported beside each other, never collapsed.** The first headed run
      // found one `long-animation-frame` over 50 ms in all four arms — and
      // every one of them had `scriptMs: 0`, no invoker, and ENDED 50–63 ms
      // BEFORE the run opened. They are the frame the calibrator's own
      // `page.evaluate` loop was straddling: a figure this instrument caused,
      // arriving in the acceptance channel, which is the exact failure
      // `overview-instrument.mjs` tags its self-test block for. Excluded by
      // position rather than by size, so a real long frame of the same
      // duration is still reported.
      excludedBeforeRun: run.longs.length - inRun.length,
      loafOver50: inRun.filter(
        (row) => row.entryType === "long-animation-frame" && row.ms > 50,
      ).length,
      longtaskOver50: inRun.filter((row) => row.entryType === "longtask")
        .length,
    },

    calibratorMs: distribution(calibrator),
  };

  await page.close();
  await context.close();
  return arm;
}

const PASSES = 2;

try {
  // **Interleaved rather than one candidate then the other**, which is this
  // repository's own rule for a branch-versus-main comparison arriving on a
  // renderer comparison: a run that takes all of A's samples first and all of
  // B's second cannot tell a renderer apart from a machine that warmed up.
  for (let pass = 1; pass <= PASSES; pass += 1) {
    for (const candidate of CANDIDATES) {
      say(`\n3.${String(pass)} Candidate ${candidate.id} — ${candidate.name}`);
      const arm = await measure(candidate, pass);
      summary.arms.push(arm);

      say(
        `    GPU            ${String(arm.gpu.renderer ?? "(no WEBGL_debug_renderer_info)")}`,
      );
      say(`    DOM nodes      ${String(arm.domNodesInIframe)}`);
      say(
        `    plant ${String(PLANT_MS)} ms   LoAF ${JSON.stringify(arm.plant.caughtByLoaf)} ` +
          `longtask ${JSON.stringify(arm.plant.caughtByLongtask)} ` +
          `rAF-gap ${JSON.stringify(arm.plant.caughtByRafGap)}`,
      );
      say(
        `    frames drawn   ${String(arm.run.framesDrawn)} in ${String(arm.run.elapsedMs)} ms ` +
          `(${String(arm.run.drawnPerSecond)}/s)`,
      );
      say(`    rAF gap        ${JSON.stringify(arm.run.rafGapMs)}`);
      say(
        `    over 16.7 ms   ${String(arm.run.gapsOverQuantum)} of ${String(arm.run.rafGapMs?.n ?? 0)}` +
          `   over 50 ms ${String(arm.run.gapsOver50)}`,
      );
      say(
        `    LoAF > 50 ms   ${String(arm.run.loafOver50)}   longtask entries ${String(arm.run.longtaskOver50)}` +
          `   excluded (ended before the run) ${String(arm.run.excludedBeforeRun)}`,
      );
      say(`    calibrator     ${JSON.stringify(arm.calibratorMs)}`);
      if (arm.pageErrors.length > 0)
        say(`    PAGE ERRORS    ${JSON.stringify(arm.pageErrors.slice(0, 3))}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

summary.load.after = await readMachineLoad(
  ceilingArgument === null ? {} : { ceiling: ceilingArgument },
);
summary.endedAt = new Date().toISOString();

const file = resolve(
  OUT,
  `topology-${summary.startedAt.slice(0, 19).replaceAll(/[:T]/gu, "-")}.json`,
);
writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);

say(
  `\nLoad ${String(loadBefore.average)} before, ${String(summary.load.after.average)} after ` +
    `(ceiling ${String(loadBefore.ceiling)}, ${String(loadBefore.cores)} cores).`,
);
say(`Written to ${file.replace(`${REPO_ROOT}/`, "")}\n`);
