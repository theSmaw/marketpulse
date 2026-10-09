// **Proving Story 4.8's instrument — Task 4.8.1.**
//
//   node scripts/prove-instrument.mjs            # the whole proof, ~90 s
//   node scripts/prove-instrument.mjs --ceiling 1.4   # recorded in the output
//
// ## Why a proof run exists rather than a comment saying it works
//
// A `long-animation-frame` entry only exists **above 50 ms**, so *zero
// observed* and *the observer is broken* are the same output — and that cost
// Task 3.9.9 a task. The same shape is true of every other channel here: an
// rAF recorder that never started reports a quiet page, a script clock with no
// bursts reports a cheap one, a commit counter React never found reports a
// page that does not re-render, and a mutation observer attached to nothing
// reports a screen that did not change.
//
// So each channel is driven by a **planted effect** whose size is known, and
// the transcript this prints is the evidence. **`pnpm verify` does not run
// this**, and it must not: it needs a built tree, two ports and a browser.
//
// ## And a claim about a mechanism reads identically whether the mechanism is
// ## there or not
//
// Which is why four of the eleven proofs below are **negative**: the load
// ceiling refuses when told to, the production-build detector refuses a dev
// server's own fingerprint, the visibility assertion throws on a hidden page,
// and an arm whose repaint target does not exist reports **nothing** rather
// than zero. A guard only proved in the direction that passes is not proved.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import process from "node:process";

import { acquireLock, loadRatio, releaseLockOnExit } from "./heavy-job.mjs";
/* global document, requestAnimationFrame */
import {
  LOAD_CEILING,
  assertProductionBuild,
  assertVisible,
  distribution,
  drain,
  openInstrumentedPage,
  pageInstrument,
  readMachineLoad,
  screen,
  startProductionPair,
  waitForObserverProof,
} from "./overview-instrument.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(REPO_ROOT, ".capture/instrument");
mkdirSync(OUT, { recursive: true });

const ceilingArgument = (() => {
  const at = process.argv.indexOf("--ceiling");
  if (at === -1) return null;
  const value = Number(process.argv[at + 1]);
  return Number.isFinite(value) && value > 0 ? value : null;
})();

/**
 * The calibrator's band, as a ratio either side of the reference median.
 *
 * **Measured rather than argued**, 2026-10-09, on the settled machine,
 * n = 120 either side, 2,000,000 iterations a sample:
 *
 * | arm                                    | p50    | p95    | max     | discarded |
 * | -------------------------------------- | ------ | ------ | ------- | --------- |
 * | quiet                                  | 1.2 ms | 1.3 ms | 1.5 ms  | 0 / 120   |
 * | 8 blocked renderers + 24 node spinners | 1.3 ms | 2.6 ms | 9.7 ms  | 24 / 120  |
 *
 * `1.6` puts the band at **0.75–1.92 ms** against a 1.2 ms reference: outside
 * the quiet spread with 0.4 ms of headroom, and inside the loaded one from
 * about its 96th sample upward. **The discrimination is at the tail, not at
 * the median** — the renderer keeps its core, so p50 moves 0.1 ms while the
 * maximum goes 1.5 → 9.7 ms. A band inside the quiet spread discards honest
 * windows; a band outside the loaded spread discards none of the dishonest
 * ones. The quiet arm is not reliably quiet on this machine: an earlier run
 * minutes before gave a quiet max of **2.7 ms** and six discards of sixty,
 * which is why the proof's criterion is *loaded discards more than quiet*
 * rather than *quiet discards nothing*.
 *
 * **And the second calibrator was measured and rejected.** A fixed
 * `setTimeout(…, 0)` hop reads **4.5 ms p50 quiet and 4.5 ms p50 loaded** —
 * Chromium's nested-timeout clamp dominates it completely — so it is reported
 * in the transcript and screens nothing.
 */
const CALIBRATOR_BAND = 1.6;

const proofs = [];
const say = (line) => process.stdout.write(`${line}\n`);

const proof = (name, passed, detail) => {
  proofs.push({ name, proved: passed, ...detail });
  say(`  ${passed ? "PROVED  " : "FAILED  "} ${name}`);
  for (const [key, value] of Object.entries(detail)) {
    say(`            ${key}: ${JSON.stringify(value)}`);
  }
};

// --- 1. The load ceiling, which REFUSES ------------------------------------

say("\nProving the instrument — Task 4.8.1\n");
say("1. The load ceiling");

const load = await readMachineLoad(
  ceilingArgument === null ? {} : { ceiling: ceilingArgument },
);

say(`   ${load.message}`);

// **The negative half, planted**: the same reading against a ceiling nothing
// can satisfy must come back `ok: false`. A refusal only ever seen passing is
// not a refusal.
const refused = await readMachineLoad({ ceiling: 0.000_01 });

proof("the ceiling refuses rather than warns", refused.ok === false, {
  planted: "ceiling 0.00001",
  verdict: refused.ok,
  reading: refused.average,
});

if (!load.ok) {
  say(
    `\n  REFUSED. ${load.message}\n` +
      "  Story 4.5's hand-off records three whole-suite runs failing 3, then 5, then 7,\n" +
      "  every failure a 30 s timeout with ZERO assertion failures, at load 23–33 on 8\n" +
      "  cores — the machine could not execute it, and those two look identical from a\n" +
      "  terminal. A figure that was never allowed to be taken cannot be quoted.\n" +
      `  Wait for the machine, or state the raise: --ceiling <ratio> above ${String(LOAD_CEILING)}.\n`,
  );
  process.exit(1);
}

// --- The heavy-job lock ----------------------------------------------------

const lock = acquireLock("node scripts/prove-instrument.mjs");

if (!lock.ok) {
  console.error(lock.message);
  process.exit(1);
}

releaseLockOnExit();

// --- 2. The pair, and that it is a production build ------------------------

say("\n2. The pair");

const pair = await startProductionPair();

// **The negative half, planted.** A one-off server serving the dev server's own
// fingerprint — `/@vite/client` and `/src/main.tsx` — must be refused. Without
// this the detector is a claim about a mechanism, which reads identically
// whether the mechanism is there or not.
const fake = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html" });
  response.end(
    '<!doctype html><html><body><script type="module" src="/@vite/client"></script>' +
      '<script type="module" src="/src/main.tsx"></script></body></html>',
  );
});

await new Promise((done) => fake.listen(0, "127.0.0.1", done));
const fakeOrigin = `http://127.0.0.1:${String(fake.address().port)}`;

// `false` means "it did NOT refuse", which is the failure. Only the catch
// assigns, so the pass/fail reading cannot be clobbered by the happy path.
let devRefused = false;
try {
  await assertProductionBuild(fakeOrigin);
} catch (error) {
  devRefused = String(error).slice(0, 140);
}
fake.close();

proof("a dev server is refused by its own fingerprint", devRefused !== false, {
  planted: "@vite/client + /src/main.tsx",
  refusal: devRefused,
});

proof("the pair being driven is a production build", true, {
  frontend: pair.frontendOrigin,
  bundle: pair.build.bundle,
  bundleKiB: Math.round(pair.build.bundleBytes / 1024),
  backend: pair.backendOrigin,
});

// --- The browser -----------------------------------------------------------

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();

const summary = { startedAt: new Date().toISOString() };

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await openInstrumentedPage(context, `${pair.frontendOrigin}/`, {
    valueSelectors: ["[data-mp-plant]"],
  });

  // --- 3. visibilityState ---------------------------------------------------

  say("\n3. document.visibilityState");

  const visible = await assertVisible(page);

  // **The negative half, planted**: a page that claims to be hidden must stop
  // the run. Epic 14's warning is that a CDP-driven tab can report `hidden`,
  // which pauses rAF and makes every figure small, plausible and meaningless.
  const liar = await context.newPage();
  await liar.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
  });
  await liar.goto(`${pair.frontendOrigin}/`, { waitUntil: "domcontentloaded" });

  let hiddenRefused = false;
  try {
    await assertVisible(liar);
  } catch (error) {
    hiddenRefused = String(error).slice(0, 120);
  }
  await liar.close();

  proof("a hidden page stops the run", hiddenRefused !== false, {
    live: visible,
    planted: 'visibilityState getter -> "hidden"',
    refusal: hiddenRefused,
  });

  // --- 4. Channel 1: the long-frame observer -------------------------------

  say("\n4. Channel 1 — the long-frame observer");

  const { proof: observer, rows: earlyRows } = await waitForObserverProof(page);
  const collected = [...earlyRows];
  const sweep = async (ms) => {
    await page.waitForTimeout(ms);
    const batch = await drain(page);
    if (batch !== null) {
      collected.push(...batch.rows);
      gapsSeen.push(...batch.gaps);
      commitsSeen.push(...batch.commits);
      lastState = batch.state;
    }
    return batch;
  };
  const gapsSeen = [];
  const commitsSeen = [];
  let lastState = null;

  const selfTestEntries = collected.filter(
    (row) => row.kind === "long" && row.selfTest === true,
  );

  proof(
    "the self-test's planted 120 ms block produced an entry",
    observer?.proved === true,
    {
      planted: `${String(observer?.plantedMs ?? "?")} ms inside a requestAnimationFrame`,
      entries: observer?.entries ?? null,
      worstMs: observer?.worstMs ?? null,
      entryTypes: [...new Set(selfTestEntries.map((row) => row.entryType))],
      invokers: [
        ...new Set(selfTestEntries.flatMap((row) => row.invokers ?? [])),
      ].slice(0, 4),
      loafSupported: observer?.loaf ?? null,
      longtaskSupported: observer?.longtask ?? null,
    },
  );

  // The self-test's entries are tagged and must be **absent** from the
  // acceptance channel, or this instrument publishes a figure it caused.
  await sweep(1_200);
  const acceptanceBefore = collected.filter(
    (row) => row.kind === "long" && row.selfTest !== true,
  );

  // And the acceptance channel must then catch a planted effect of its own,
  // which is the half that proves the exclusion is an exclusion rather than a
  // dead observer.
  await page.evaluate(() => globalThis.__mpPlant.frameBlock(180));
  await sweep(600);

  const acceptanceAfter = collected.filter(
    (row) => row.kind === "long" && row.selfTest !== true,
  );
  const caught = acceptanceAfter.filter((row) => row.ms >= 150);

  proof(
    "the acceptance channel excludes the self-test and still catches a plant",
    caught.length > 0,
    {
      planted:
        "180 ms inside a requestAnimationFrame, after the self-test window",
      selfTestEntriesTagged: selfTestEntries.length,
      acceptanceEntriesBeforePlant: acceptanceBefore.length,
      acceptanceEntriesAfterPlant: acceptanceAfter.length,
      caughtMs: caught.map((row) => row.ms),
      caughtEntryTypes: [...new Set(caught.map((row) => row.entryType))],
    },
  );

  // --- 5. Channel 2: the rAF-gap recorder ----------------------------------

  say("\n5. Channel 2 — the rAF-gap recorder");

  // The earlier plant's own gap is cleared first, or the "quiet" window
  // reports a maximum this instrument caused.
  gapsSeen.splice(0, gapsSeen.length);
  await sweep(3_000);
  const quietGaps = gapsSeen.splice(0, gapsSeen.length);

  await page.evaluate(() => globalThis.__mpPlant.frameBlock(120));
  await sweep(800);
  const plantedGaps = gapsSeen.splice(0, gapsSeen.length);

  proof(
    "the recorder is continuous and a planted block appears as a gap",
    quietGaps.length > 100 && Math.max(...plantedGaps, 0) >= 100,
    {
      planted: "120 ms inside a requestAnimationFrame",
      quiet: distribution(quietGaps),
      quietSeconds: 3,
      afterPlant: distribution(plantedGaps),
    },
  );

  // --- 6. Channel 3: the script clock per burst ----------------------------

  say("\n6. Channel 3 — the script clock per burst");

  await page.evaluate(() => globalThis.__mpPlant.burst(0, "control-burst"));
  await page.evaluate(() => globalThis.__mpPlant.burst(120, "planted-burst"));
  await sweep(600);

  const taskRows = collected.filter((row) => row.kind === "burst-task");
  const control = taskRows.find((row) => row.label === "control-burst");
  const planted = taskRows.find((row) => row.label === "planted-burst");

  proof(
    "the script clock reads a planted 120 ms and a control reads ~0",
    planted !== undefined &&
      planted.taskMs >= 110 &&
      control !== undefined &&
      control.taskMs < 20,
    {
      planted: "120 ms blocked inside the burst's own task",
      controlTaskMs: control?.taskMs ?? null,
      plantedTaskMs: planted?.taskMs ?? null,
      note: "LoAF has no entry below 50 ms, which is why this channel exists beside it",
    },
  );

  // --- 7. Channel 4: the commit counter ------------------------------------

  say("\n7. Channel 4 — the commit counter on React's hook");

  const commitsBefore = lastState?.commitTotal ?? null;

  // **A planted state change.** A navigation is the one state change available
  // on `/` without data: `/` renders no input, and `Movers`' roving stop needs
  // rows that a store with zero bars does not have.
  await page
    .getByRole("link", { name: /Investigation Workspace/iu })
    .first()
    .click();
  await page.waitForTimeout(600);
  await page.goBack();
  await sweep(900);

  const commitsAfter = lastState?.commitTotal ?? null;

  proof(
    "production React calls the hook, and a planted state change moves the count",
    typeof commitsBefore === "number" &&
      typeof commitsAfter === "number" &&
      commitsAfter > commitsBefore,
    {
      planted: "a route change to /investigations and back",
      before: commitsBefore,
      after: commitsAfter,
      moved:
        typeof commitsAfter === "number" && typeof commitsBefore === "number"
          ? commitsAfter - commitsBefore
          : null,
      commitStampsSeen: commitsSeen.length,
    },
  );

  // --- 8. The DOM check: did the subject actually change? ------------------

  say("\n8. The DOM check — and the arm that reports NOTHING");

  const mutationsBefore = lastState?.mutationTotal ?? null;
  const planting = await page.evaluate(() =>
    globalThis.__mpPlant.mutation(["planted-one", "planted-two"]),
  );
  await sweep(500);
  const mutationsAfter = lastState?.mutationTotal ?? null;
  const plantedValues = lastState?.values?.["[data-mp-plant]"] ?? [];

  proof(
    "a planted mutation is seen and its distinct values counted",
    planting === true &&
      typeof mutationsAfter === "number" &&
      typeof mutationsBefore === "number" &&
      mutationsAfter > mutationsBefore &&
      plantedValues.includes("planted-one") &&
      plantedValues.includes("planted-two"),
    {
      planted: "two distinct texts into the repaint target",
      repaintTarget: lastState?.repaintTarget ?? null,
      before: mutationsBefore,
      after: mutationsAfter,
      distinctValues: plantedValues,
    },
  );

  proof(
    "the socket wrapper is still the wrapper, counted by URL",
    lastState?.wrapperIntact === true,
    {
      wrapperIntact: lastState?.wrapperIntact ?? null,
      sockets: collected
        .filter((row) => row.kind === "socket")
        .map((row) => ({ url: row.url, ours: row.ours })),
      framesSeen: collected.filter((row) => row.kind === "frame").length,
    },
  );

  // **The negative half, planted, and it is Task 4.8.1's named defect.** The
  // old instrument stamps a repaint against `document.querySelector("table")
  // ?? document.body`. There is no `<table>` on `/`, so it silently observes
  // the body — where the masthead clock mutates text every second. With no
  // fallback, an absent target reports NOTHING.
  const blindContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const blind = await openInstrumentedPage(
    blindContext,
    `${pair.frontendOrigin}/`,
    {
      repaintSelector: "table",
      attachTimeoutMs: 1_500,
    },
  );
  await blind.waitForTimeout(3_000);
  const blindBatch = await drain(blind);
  const missing =
    blindBatch?.rows.filter((row) => row.kind === "repaint-target-missing") ??
    [];

  proof(
    "an absent repaint target reports nothing, not zero",
    blindBatch?.state.repaintTarget === null,
    {
      planted: 'repaintSelector "table" on a route that has no table',
      repaintTarget: blindBatch?.state.repaintTarget ?? null,
      mutationTotal: blindBatch?.state.mutationTotal ?? null,
      missingRows: missing.length,
      note: "the old instrument would have fallen back to document.body here",
    },
  );
  await blind.close();
  await blindContext.close();

  // --- 9. main against body, which is the repair measured -----------------

  say("\n9. The repaired repaint stamp — `main` against `body` on `/`");

  const clockContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const clockPage = await openInstrumentedPage(
    clockContext,
    `${pair.frontendOrigin}/`,
  );
  await clockPage.waitForTimeout(2_000);
  await drain(clockPage); // discard the mount
  await clockPage.evaluate(() => globalThis.__mpPlant.watch("body"));
  await clockPage.waitForTimeout(6_000);
  const clockBatch = await drain(clockPage);
  const bodyMutations =
    clockBatch?.rows.filter(
      (row) => row.kind === "mutation" && row.selector === "body",
    ).length ?? 0;
  const mainMutations =
    clockBatch?.rows.filter(
      (row) => row.kind === "mutation" && row.selector === "main",
    ).length ?? 0;

  proof(
    "`main` is quiet for six seconds while `body` is not",
    bodyMutations > mainMutations,
    {
      window: "6 s, no frames, no interaction",
      bodyMutationRecords: bodyMutations,
      mainMutationRecords: mainMutations,
      note: "the masthead clock and the status bar are outside <main>",
    },
  );
  await clockPage.close();
  await clockContext.close();

  // --- 10. The calibrator -------------------------------------------------

  say("\n10. The calibrator, and the discard count");

  const quietSamples = await page.evaluate(() => globalThis.__mpCalibrate(120));
  const quietSchedule = await page.evaluate(() =>
    globalThis.__mpCalibrateSchedule(120),
  );
  const reference = distribution(quietSamples).p50;
  const calibration = { reference, band: CALIBRATOR_BAND };
  const quietScreen = screen(quietSamples, calibration);

  // **Plant the contention — and the first two plants moved nothing, which is
  // the finding rather than a failure.**
  //
  // 24 spinning **Node** processes on 8 cores (three runnable threads per core,
  // which is Story 4.5's measured 23–33 exactly) left this page's calibrator at
  // **1.2 ms quiet and 1.2 ms loaded**, and a `setTimeout(0)` hop at **4.5 ms
  // either side**. macOS keeps scheduling a foreground renderer at
  // user-interactive QoS whatever a terminal's children are doing, so load
  // average alone is not a thing a browser can feel.
  //
  // What corrupted Story 4.5's run was **another browser suite**, so the plant
  // that reproduces it is other renderer processes: one page per plant, in its
  // own context so it gets its own process, each blocking its main thread for
  // most of every frame.
  const { cores } = await loadRatio();
  const spinners = [];
  for (let index = 0; index < cores * 3; index += 1) {
    spinners.push(
      spawn(
        process.execPath,
        [
          "-e",
          "const until = Date.now() + 25000; while (Date.now() < until) {}",
        ],
        { stdio: "ignore" },
      ),
    );
  }

  const loadContexts = [];
  for (let index = 0; index < cores; index += 1) {
    const noisy = await browser.newContext();
    const noisyPage = await noisy.newPage();
    await noisyPage.goto("about:blank");
    await noisyPage.evaluate(() => {
      const spin = () => {
        const until = performance.now() + 50;
        while (performance.now() < until) {
          /* deliberately blocking */
        }
        requestAnimationFrame(spin);
      };
      requestAnimationFrame(spin);
    });
    loadContexts.push(noisy);
  }

  let loadedSamples = [];
  let loadedSchedule = [];
  try {
    // Long enough for the one-minute average to have noticed, which is also
    // long enough for the scheduler to be visibly sharing the machine out.
    await page.waitForTimeout(6_000);
    summary.loadDuringPlant = await readMachineLoad({ ceiling: 99 });
    loadedSamples = await page.evaluate(() => globalThis.__mpCalibrate(120));
    loadedSchedule = await page.evaluate(() =>
      globalThis.__mpCalibrateSchedule(120),
    );
  } finally {
    for (const spinner of spinners) spinner.kill("SIGKILL");
    for (const noisy of loadContexts) await noisy.close();
  }

  const loadedScreen = screen(loadedSamples, calibration);

  // **The criterion is `loaded > quiet`, not `quiet === 0`, and that is
  // measured rather than lenient.** The quiet arm on this machine is not
  // reliably quiet — two runs minutes apart gave a quiet max of **1.3 ms** and
  // **2.7 ms** against a 1.2–1.3 ms reference, so a band tight enough to catch
  // the loaded tail discards some honest windows too. That is the safe
  // direction: a discarded honest window costs n, and a kept dishonest one
  // gets published. What the band must do is **discriminate**, and the
  // discrimination is at the tail rather than at the median — the renderer
  // keeps its core, so p50 barely moves while the maximum goes 2.7 → 10.2 ms.
  proof(
    "the calibrator discards more under planted load, and prints both counts",
    loadedScreen.discarded > quietScreen.discarded &&
      loadedScreen.discarded > 0,
    {
      planted: `${String(cores)} blocked renderer processes + ${String(cores * 3)} spinning node processes on ${String(cores)} cores`,
      loadDuringPlant: summary.loadDuringPlant?.average ?? null,
      iterations: 2_000_000,
      band: `x/${String(CALIBRATOR_BAND)} … x*${String(CALIBRATOR_BAND)} of the reference`,
      referenceMs: reference,
      bandMs: quietScreen.band,
      quiet: distribution(quietSamples),
      quietDiscarded: quietScreen.discarded,
      quietSchedule: distribution(quietSchedule),
      loadedSchedule: distribution(loadedSchedule),
      loaded: distribution(loadedSamples),
      loadedDiscarded: loadedScreen.discarded,
      loadedDiscardedOf: loadedSamples.length,
      quietDiscardedOf: quietSamples.length,
    },
  );

  summary.quietCalibrator = distribution(quietSamples);
  summary.loadedCalibrator = distribution(loadedSamples);
  summary.quietSamples = quietSamples;
  summary.loadedSamples = loadedSamples;
  summary.band = CALIBRATOR_BAND;
  summary.reference = reference;

  await page.close();
  await context.close();
} finally {
  await browser.close();
  await pair.stop();
}

// --- The verdict -----------------------------------------------------------

const loadAfter = await readMachineLoad(
  ceilingArgument === null ? {} : { ceiling: ceilingArgument },
);

summary.endedAt = new Date().toISOString();
summary.load = { before: load, after: loadAfter };
summary.build = pair.build;
summary.pageInstrumentBytes = pageInstrument().length;
summary.proofs = proofs;

const failed = proofs.filter((row) => !row.proved);

writeFileSync(
  resolve(
    OUT,
    `proof-${summary.startedAt.slice(0, 19).replaceAll(/[:T]/gu, "-")}.json`,
  ),
  `${JSON.stringify(summary, null, 2)}\n`,
);

say(
  `\n${String(proofs.length - failed.length)} of ${String(proofs.length)} proved. ` +
    `Load ${String(load.average)} before, ${String(loadAfter.average)} after ` +
    `(ceiling ${String(load.ceiling)}, ${String(load.cores)} cores).\n`,
);

if (failed.length > 0) {
  say(`UNPROVED: ${failed.map((row) => row.name).join("; ")}\n`);
  process.exit(1);
}
