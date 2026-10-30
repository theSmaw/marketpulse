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

import { acquireLock, releaseLockOnExit } from "./heavy-job.mjs";
import {
  LOAD_CEILING,
  assertStorybookBuild,
  assertVisible,
  distribution,
  readMachineLoad,
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
 * **There were two on 2026-10-30 and there is one now.** Task 6.1.2 drove
 * Candidate A (`components-markettopology--sigma-whole-universe`, Sigma.js 4 +
 * graphology over WebGL2) and Candidate B through this list, differing by a
 * `renderer` prop and nothing else; ADR 0048 took the decision and the loser
 * was deleted in the same change, so the A story no longer resolves. The
 * transcript is in Task 6.1.2's own record, verbatim, because the thing it
 * measured is gone and a conclusion is not evidence.
 *
 * The shape is kept — a list, interleaved passes — because Story 6.2 re-takes
 * these figures against `/`'s real box and `TOPOLOGY_RING_RADIUS`' elliptical
 * deformation, which is a second arm against the same path.
 */
const CANDIDATES = [
  {
    id: "B",
    name: "hand-rolled Canvas2D (zero dependencies)",
    story: "components-markettopology--whole-universe",
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
