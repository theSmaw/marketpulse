// **The instrument Story 4.8's figures come out of — Task 4.8.1.**
//
// Not a gate, not a spec, not a `pnpm verify` step. It is loaded by
// `scripts/prove-instrument.mjs` (which proves every channel against a planted
// effect) and by Tasks 4.8.2–4.8.6, which take this story's figures through it.
// Loading it needs no network, no credentials and no database; *running* a pair
// through it needs a built tree.
//
// ## Why it exists at all, which is one sentence
//
// **A `long-animation-frame` entry only exists above 50 ms, so zero observed
// and the observer is broken are the same output.** That cost Task 3.9.9 a
// task. Everything below is written around that sentence: every channel is
// provable against a planted effect, and every arm that cannot prove its
// subject moved reports **nothing** rather than zero.
//
// ## The five things this carries that no earlier instrument did
//
// 1. **A production-build pair, asserted rather than assumed.** `pnpm e2e`
//    drives the origin `CORS_ORIGIN` names, which is the **dev** server —
//    `scripts/pair-addresses.mjs` argues that at length and it is correct, so
//    a production-build figure cannot come through the gated suite. The recipe
//    is Task 3.6.4/3.6.5's: `vite preview` on the built artefact, the backend's
//    `dist/index.js` with `CORS_ORIGIN` repointed. `assertProductionBuild()`
//    reads the served HTML and refuses a dev server by its own fingerprint,
//    because "I thought I was on the preview" is not a recoverable mistake —
//    every figure taken that way is wrong in the comfortable direction.
// 2. **A load ceiling that REFUSES.** Story 4.5's hand-off records three
//    whole-suite runs failing 3, then 5, then 7, every failure a 30 s timeout
//    with **zero** assertion failures, at load 23–33 on 8 cores — *the machine
//    could not execute it, and those two look identical from a terminal.* A
//    figure that was never allowed to be taken cannot be quoted.
// 3. **A calibrator sampled beside every measurement**, so contention that
//    arrives *mid-run* is detected rather than averaged in. Nothing in this
//    repository has ever done that.
// 4. **A repaint target that is named and found, or nothing.** The old
//    instrument's `document.querySelector("table") ?? document.body` is a
//    silent downgrade to an element the masthead clock mutates every second.
//    There is no fallback here.
// 5. **A socket wrapper that checks it is still the wrapper.** Task 4.5.8's
//    first draft was silently overwritten by Playwright's own `WebSocket` and
//    reported n = 0.
//
// ## Two rules inherited from measured defects, obeyed here by construction
//
// **Count by URL, never by event** (Task 3.11.2): a browser page holds sockets
// that are not this product's — on a dev page two of three are Vite's HMR —
// and a number with no URL beside it cannot tell them apart.
//
// **Drain a page buffer with `splice` IN PLACE** (2026-09-25): the page
// instrument closes over the array it pushes into, so rebinding the global to a
// fresh array leaves the wrapper filling an array nobody reads, and the
// instrument reports a silent socket on a healthy connection.

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { loadRatio } from "./heavy-job.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/**
 * The load ceiling, as a ratio of the one-minute average to the core count.
 *
 * **Derived from two measurements rather than chosen.** The known-good end is
 * Task 3.6.5, whose production-build figures were taken with *"load average
 * under 6 throughout"* on 8 cores — ratio **0.75**. The known-bad end is Story
 * 4.5's hand-off: 23–33 on 8 cores, ratio **2.9–4.1**, where a whole suite
 * failed a different random set of tests with zero assertion failures. `1.0` is
 * one runnable thread per core: above the band this repository's best figures
 * were taken in, and a third of the way to the band that destroyed a suite.
 *
 * `scripts/run-e2e.mjs` *warns* at 0.7 and argues that a refusal on somebody
 * else's browser is a gate people route around. That argument holds for a
 * pass/fail suite and does not hold here: a corrupted assertion is red, and a
 * corrupted **figure** is a plausible number that gets published.
 */
export const LOAD_CEILING = 1.0;

/**
 * Refuse to measure anything on a machine that cannot execute the measurement.
 *
 * Returns a result rather than exiting — `resolvePairAddresses()`'s shape, and
 * for its reason: the script decides what a refusal reads like. The ceiling is
 * returned with the reading so that any figure taken under a **raised** ceiling
 * carries the raise in its own transcript.
 *
 * @param {{ ceiling?: number }} [options]
 */
export async function readMachineLoad(options = {}) {
  const ceiling = options.ceiling ?? LOAD_CEILING;
  const { ratio, cores } = await loadRatio();
  const average = ratio * cores;

  return {
    ok: ratio <= ceiling,
    ceiling,
    ratio: Number(ratio.toFixed(3)),
    average: Number(average.toFixed(2)),
    cores,
    message:
      `Load average ${average.toFixed(2)} across ${String(cores)} cores ` +
      `(ratio ${ratio.toFixed(3)}) against a ceiling of ${ceiling.toFixed(2)}.`,
  };
}

// --- The pair, which is not the gated suite -------------------------------
//
// **Its own two ports and its own artefact, which is a change to the
// 3.6.4/3.6.5 recipe rather than a restatement of it.** That recipe uses 4173
// and 3000, so following it requires tearing down a running `pnpm dev` — and
// five tasks in this story need this pair. Worse, `VITE_API_BASE_URL` is
// substituted at **build time**, so a harness on a second backend port cannot
// reuse `apps/frontend/dist`: it has to build its own, which it does, into
// `.capture/instrument/dist` rather than over the artefact `pnpm invariants`
// reads.
//
// The build is also the stronger evidence for Done-when 1: the harness does
// not *believe* it is driving a production build, it produced one in this run
// and then read the fingerprint back off the wire.

const PREVIEW_PORT = 4273;
const PREVIEW_ORIGIN = `http://localhost:${String(PREVIEW_PORT)}`;
const BACKEND_PORT = 3100;
const BACKEND_ORIGIN = `http://127.0.0.1:${String(BACKEND_PORT)}`;
const BUILD_DIR = resolve(REPO_ROOT, ".capture/instrument/dist");

/**
 * The store the harness drives, and why it is not the developer's own.
 *
 * **The 3.6.4/3.6.5 recipe is no longer safe as written, and that is a
 * falsification rather than a preference.** Those figures were taken on
 * 2026-09-22; Story 3.8 shipped the live bar writer on **2026-09-23**, and
 * `index.ts` hangs it off *any* configured stream. So
 * `MARKET_DATA_PROVIDER=fixture` against `DATABASE_NAME=marketpulse` now
 * writes **synthetic minute bars into the developer's own store**, at 518
 * securities a minute, for as long as the measurement runs — invisible while
 * it happens and indistinguishable from real bars afterwards.
 *
 * So: the provider defaults to `none` (no stream, no writer, no pollution),
 * and asking for a stream requires naming a store that is not the primary
 * one. `pnpm store:bare` builds `marketpulse_bare`, which is also CI's shape.
 */
const SAFE_STORE = "marketpulse_bare";
const PRIMARY_STORE = "marketpulse";

/** Is anything already listening there? */
async function isListening(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1_500) });
    return true;
  } catch {
    return false;
  }
}

async function waitFor(url, label, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;

  while (Date.now() < until) {
    if (await isListening(url)) return true;
    await new Promise((done) => setTimeout(done, 250));
  }

  throw new Error(
    `${label} never answered ${url} within ${String(timeoutMs)} ms`,
  );
}

/**
 * Prove the frontend being served is the **built** artefact.
 *
 * The fingerprint is Vite's own and is not a heuristic: the dev server injects
 * `/@vite/client` into every document and serves `/src/main.tsx` as a module,
 * and `vite build` emits neither — it emits one hashed `/assets/index-*.js`.
 * So the two are told apart by the bytes the server sends rather than by which
 * command somebody believes they ran.
 */
export async function assertProductionBuild(origin) {
  const response = await fetch(origin, { signal: AbortSignal.timeout(5_000) });
  const html = await response.text();

  const devClient = html.includes("/@vite/client");
  const devEntry = html.includes("/src/main.tsx");
  const bundle =
    /\/assets\/(index-[A-Za-z0-9_-]+\.js)/u.exec(html)?.[1] ?? null;

  if (devClient || devEntry || bundle === null) {
    throw new Error(
      `${origin} is NOT serving a production build — ` +
        `@vite/client=${String(devClient)} /src/main.tsx=${String(devEntry)} ` +
        `bundle=${String(bundle)}. Every figure from a dev server is wrong in ` +
        "the comfortable direction; run `pnpm build` and use startProductionPair().",
    );
  }

  const asset = await fetch(`${origin}/assets/${bundle}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const bytes = (await asset.arrayBuffer()).byteLength;

  return {
    origin,
    bundle,
    bundleBytes: bytes,
    devClient: false,
    devEntry: false,
  };
}

/** Run a command to completion, or throw with its output. */
async function run(command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
  const output = [];

  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => output.push(chunk));
  }

  const code = await new Promise((done) => child.on("close", done));

  if (code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited ${String(code)}\n${output.join("")}`,
    );
  }

  return output.join("");
}

/**
 * Build the frontend the harness will serve, pointed at the harness's backend.
 *
 * `--outDir` rather than the package's own `dist/`: one `pnpm invariants` check
 * reads `apps/frontend/dist/`, and an instrument that overwrites the artefact a
 * gate reads is a gate measuring the instrument.
 */
export async function buildHarnessFrontend(options = {}) {
  const say =
    options.quiet === true ? () => {} : (line) => process.stdout.write(line);
  const started = Date.now();

  await run(
    "pnpm",
    ["exec", "vite", "build", "--outDir", BUILD_DIR, "--emptyOutDir"],
    resolve(REPO_ROOT, "apps/frontend"),
    { ...process.env, VITE_API_BASE_URL: BACKEND_ORIGIN },
  );

  say(
    `  built ${BUILD_DIR.replace(`${REPO_ROOT}/`, "")} in ` +
      `${String(((Date.now() - started) / 1000).toFixed(1))} s ` +
      `(VITE_API_BASE_URL=${BACKEND_ORIGIN})\n`,
  );

  return BUILD_DIR;
}

/**
 * Start the production-build pair, and say so in its own output.
 *
 * It refuses rather than co-existing with anything on its own two ports, and
 * it refuses a live stream against the primary store. **CORS is not access
 * control** — a wrong allowlist answers 200 and the *browser* refuses, so a
 * harness sharing a port with `pnpm dev` would measure a page whose every API
 * call fails with nothing wrong in any server log.
 *
 * @param {{ provider?: string, databaseName?: string, build?: boolean, quiet?: boolean }} [options]
 */
export async function startProductionPair(options = {}) {
  const provider = options.provider ?? "none";
  const databaseName = options.databaseName ?? SAFE_STORE;
  const say =
    options.quiet === true ? () => {} : (line) => process.stdout.write(line);

  if (provider !== "none" && databaseName === PRIMARY_STORE) {
    throw new Error(
      `MARKET_DATA_PROVIDER=${provider} against DATABASE_NAME=${PRIMARY_STORE} would write ` +
        "SYNTHETIC minute bars into the developer's own store: `index.ts` hangs Story 3.8's " +
        "live bar writer off any configured stream, at 518 securities a minute, and a stored " +
        "fixture bar is indistinguishable from a real one afterwards. Name another store — " +
        "`pnpm store:bare` builds `marketpulse_bare`.",
    );
  }

  for (const [url, what] of [
    [`${BACKEND_ORIGIN}/health`, "a backend"],
    [PREVIEW_ORIGIN, "a frontend"],
  ]) {
    if (await isListening(url)) {
      throw new Error(
        `${what} is already listening on ${url}, which is the harness's own port. ` +
          "A previous run did not shut down; kill it and try again.",
      );
    }
  }

  if (options.build !== false)
    await buildHarnessFrontend({ quiet: options.quiet });

  const children = [];

  const backend = spawn(process.execPath, ["apps/backend/dist/index.js"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
      // Repointed at the preview, which is the whole point of the recipe.
      CORS_ORIGIN: PREVIEW_ORIGIN,
      DATABASE_NAME: databaseName,
      MARKET_DATA_PROVIDER: provider,
      NON_LIVE_MARKET_DATA: "permitted",
      LOG_LEVEL: "warn",
    },
  });
  children.push({ name: "backend", child: backend });

  const preview = spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "preview",
      "--outDir",
      BUILD_DIR,
      "--port",
      String(PREVIEW_PORT),
      "--strictPort",
    ],
    {
      cwd: resolve(REPO_ROOT, "apps/frontend"),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );
  children.push({ name: "preview", child: preview });

  const log = [];

  for (const { name, child } of children) {
    for (const stream of [child.stdout, child.stderr]) {
      stream?.setEncoding("utf8");
      stream?.on("data", (chunk) => {
        log.push(`[${name}] ${chunk.trimEnd()}`);
      });
    }
  }

  const stop = async () => {
    for (const { child } of children) child.kill("SIGTERM");
    await new Promise((done) => setTimeout(done, 400));
    reap();
  };

  // **However this process ends, including the ways it cannot handle.** A
  // measured defect of this very harness: a run piped into `head` died of
  // SIGPIPE mid-proof and left both children listening, so the **next** run
  // refused its own ports and read as a configuration fault. `exit` covers the
  // ordinary path and every `process.exit()`; the signals are the ones that
  // reach a script from a terminal, and each re-raises so the shell still sees
  // the signal's own code.
  function reap() {
    for (const { child } of children) {
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }

  process.on("exit", reap);

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGPIPE"]) {
    process.on(signal, () => {
      reap();
      process.kill(process.pid, signal);
    });
  }

  try {
    await waitFor(`${BACKEND_ORIGIN}/health`, "the backend");
    await waitFor(PREVIEW_ORIGIN, "vite preview");
    const build = await assertProductionBuild(PREVIEW_ORIGIN);

    say(
      `  pair up — PRODUCTION BUILD\n` +
        `    frontend ${PREVIEW_ORIGIN} (vite preview, ${build.bundle}, ` +
        `${String(Math.round(build.bundleBytes / 1024))} KiB)\n` +
        `    backend  ${BACKEND_ORIGIN} (dist/index.js, provider=${provider}, ` +
        `store=${databaseName}, CORS_ORIGIN=${PREVIEW_ORIGIN})\n`,
    );

    return {
      frontendOrigin: PREVIEW_ORIGIN,
      backendOrigin: BACKEND_ORIGIN,
      provider,
      databaseName,
      build,
      log,
      stop,
    };
  } catch (error) {
    await stop();
    throw new Error(`${String(error)}\n${log.slice(-20).join("\n")}`, {
      cause: error,
    });
  }
}

// --- The page-side instrument ---------------------------------------------

/**
 * The default configuration, per route.
 *
 * **`main` rather than `table` or `body`, and that is Task 4.8.1's named
 * defect.** `scripts/session-sitting.mjs` stamps a repaint against
 * `document.querySelector("table") ?? document.body`; there is **no `<table>`
 * on `/`** — `BreadthLedger` says so in as many words — so on `/` that
 * silently observes `document.body`, **where the masthead clock mutates text
 * every second**. Every `painted` figure taken on `/` that way is a race
 * between the frame and the clock tick.
 *
 * `<main>` is the repair and it is one element on all five routes: `App`
 * renders the router's outlet inside it, and both surfaces that tick on a
 * timer — `MarketClock` in the masthead and the status bar in `AppFooter` —
 * are **outside** it. `prove-instrument.mjs` measures that rather than
 * asserting it: five quiet seconds, no frames, mutations on `main` against
 * mutations on `body`.
 */
export const REPAINT_TARGET = "main";

const DEFAULTS = {
  repaintSelector: REPAINT_TARGET,
  valueSelectors: [],
  /**
   * The calibrator's fixed cost.
   *
   * **Sized by measurement, and the first size was wrong.** 200,000
   * iterations of `Math.sqrt` came back at **0.2 ms** on this machine — at
   * Chromium's own 0.1 ms timer quantisation, so the quiet distribution was
   * `{p50 0.2, p95 0.3, max 0.4, min 0}` and a 1.6× band discarded **25 of 60
   * quiet samples**. Worse, the loaded arm read *lower* than the quiet one,
   * because the loop was still being warmed by the JIT. 2,000,000 lands at a
   * couple of milliseconds — two orders of magnitude above the quantisation,
   * and still small enough to sample beside every burst without becoming the
   * thing being measured. **Fixed, never tuned at startup**: a calibrator whose
   * work is sized to the machine measures nothing about the machine.
   */
  calibratorIterations: 2_000_000,
  /** How long to wait for the repaint target to exist before reporting nothing. */
  attachTimeoutMs: 15_000,
  /** The planted block for the observer's self-test. Above 50 ms by a margin. */
  selfTestBlockMs: 120,
  /** When the self-test window closes and acceptance begins. */
  selfTestCloseMs: 1_500,
};

/**
 * The page-side instrument, as source for `addInitScript`.
 *
 * Installed **before navigation**, so it wraps the socket the application
 * itself opens rather than a second one, and so the React DevTools hook exists
 * before React looks for it.
 *
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function pageInstrument(options = {}) {
  const config = JSON.stringify({ ...DEFAULTS, ...options });

  return `(() => {
  const CONFIG = ${config};

  // Four buffers, each drained with \`splice\` in place. Rebinding any of them
  // would leave the producers below filling an array nobody reads — the
  // 2026-09-25 defect, which reported a silent socket on a healthy connection
  // and survived a rehearsal recorded as clean.
  const rows = [];
  const gaps = [];
  const commits = [];

  const note = (row) => {
    rows.push({ now: Math.round(performance.now() * 10) / 10, wall: Date.now(), ...row });
  };

  // --- \`document.visibilityState\`, which decides whether anything below means
  // anything. A tab driven over CDP can report \`hidden\`, which pauses
  // \`requestAnimationFrame\` and makes every figure small, plausible and
  // meaningless (Epic 14's own warning). Recorded in the page AND asserted from
  // Node, because the two can disagree about when.
  note({ kind: "visibility", state: document.visibilityState });
  document.addEventListener("visibilitychange", () => {
    note({ kind: "visibility", state: document.visibilityState });
  });

  // --- Channel 1: the long-frame observer, with its self-test ---------------
  //
  // \`buffered: false\`, which is Task 3.6.5's trap: buffered returns the cold
  // load into a measurement about something else, and on this page that is a
  // known 50–76 ms task arriving as a regression somebody else caused.
  let selfTestOver = false;
  let selfTestEntries = 0;
  let worstSelfTest = 0;

  const observeType = (type) => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const scripts = entry.scripts ?? [];
          if (!selfTestOver) {
            selfTestEntries += 1;
            worstSelfTest = Math.max(worstSelfTest, entry.duration);
          }
          note({
            kind: "long",
            entryType: entry.entryType,
            ms: Math.round(entry.duration * 10) / 10,
            startTime: Math.round(entry.startTime * 10) / 10,
            scriptMs: Math.round(scripts.reduce((t, s) => t + s.duration, 0) * 10) / 10,
            invokers: scripts.map((s) => s.invoker ?? s.name ?? "?").slice(0, 4),
            // **Tagged, and excluded from every acceptance figure.** Counting
            // the self-test's own 120 ms block would put a figure this
            // instrument CAUSED into the number being published.
            selfTest: !selfTestOver,
          });
        }
      });
      observer.observe({ type, buffered: false });
      return true;
    } catch (error) {
      note({ kind: "observer-failed", type, why: String(error) });
      return false;
    }
  };

  const loaf = observeType("long-animation-frame");
  const longtask = observeType("longtask");

  requestAnimationFrame(() => {
    const until = performance.now() + CONFIG.selfTestBlockMs;
    while (performance.now() < until) { /* deliberately blocking */ }
  });

  setTimeout(() => {
    // A counter rather than a scan of \`rows\`, because \`rows\` is drained: a
    // scan would read an empty buffer and report an unproved observer on a
    // working one, which is the same class of failure as the thing this
    // channel exists to catch.
    note({
      kind: "observer",
      proved: selfTestEntries > 0 && worstSelfTest >= CONFIG.selfTestBlockMs * 0.5,
      entries: selfTestEntries,
      worstMs: Math.round(worstSelfTest * 10) / 10,
      plantedMs: CONFIG.selfTestBlockMs,
      loaf,
      longtask,
    });
    selfTestOver = true;
  }, CONFIG.selfTestCloseMs);

  // --- Channel 2: a continuous rAF-gap recorder ----------------------------
  //
  // Epic 14's prescribed method, and it is what tells *one task over the line*
  // from *the page spent 80 ms not painting*. It runs for the life of the page
  // rather than per burst, so a gap that straddles a burst boundary is still in
  // the record.
  let lastFrame = null;
  const onAnimationFrame = (stamp) => {
    if (lastFrame !== null) gaps.push(Math.round((stamp - lastFrame) * 10) / 10);
    lastFrame = stamp;
    requestAnimationFrame(onAnimationFrame);
  };
  requestAnimationFrame(onAnimationFrame);

  // --- Channel 3: a script clock per burst ---------------------------------
  //
  // A burst opens when a frame lands (or when a plant opens one) and its script
  // clock is the **remainder of the task that delivered it**: a \`MessageChannel\`
  // message posted at the stamp cannot run until the current task finishes, so
  // \`now - t0\` in its handler is the decode, the reducer and any synchronous
  // render that followed. That is the one figure LoAF structurally cannot give,
  // because LoAF has no entry below 50 ms — which is the whole of why this
  // channel exists beside channel 1 rather than inside it.
  const endOfTask = new MessageChannel();
  const awaiting = [];
  let burstSeq = 0;

  endOfTask.port1.onmessage = () => {
    const burst = awaiting.shift();
    if (burst === undefined) return;
    note({
      kind: "burst-task",
      id: burst.id,
      label: burst.label,
      t0: burst.t0,
      taskMs: Math.round((performance.now() - burst.t0) * 10) / 10,
    });
    // --- The calibrator, sampled BESIDE every measurement.
    note({ kind: "calibrator", id: burst.id, ms: calibrate() });
  };

  const openBurst = (label, detail) => {
    burstSeq += 1;
    const t0 = Math.round(performance.now() * 10) / 10;
    note({ kind: "burst", id: burstSeq, label, t0, detail });
    awaiting.push({ id: burstSeq, label, t0 });
    endOfTask.port2.postMessage(0);
    return burstSeq;
  };

  // --- Channel 4: a commit counter on React's own hook ---------------------
  //
  // Production React still calls \`onCommitFiberRoot\` on every commit — the
  // built bundle reads \`isDisabled\`, \`supportsFiber\` and \`inject\` and then
  // calls it, which is why this has to be installed before navigation. Any real
  // hook already present is wrapped rather than replaced.
  const existing = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  let commitCount = 0;
  const renderers = existing?.renderers ?? new Map();
  let nextRendererId = 1;

  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    ...(existing ?? {}),
    isDisabled: false,
    supportsFiber: true,
    renderers,
    checkDCE: () => {},
    inject: (internals) => {
      const id = nextRendererId; nextRendererId += 1;
      renderers.set(id, internals);
      try { existing?.inject?.(internals); } catch { /* theirs, not ours */ }
      return id;
    },
    onCommitFiberRoot: (...args) => {
      commitCount += 1;
      commits.push(Math.round(performance.now() * 10) / 10);
      try { existing?.onCommitFiberRoot?.(...args); } catch { /* theirs */ }
    },
    onPostCommitFiberRoot: (...args) => {
      try { existing?.onPostCommitFiberRoot?.(...args); } catch { /* theirs */ }
    },
    onCommitFiberUnmount: (...args) => {
      try { existing?.onCommitFiberUnmount?.(...args); } catch { /* theirs */ }
    },
  };

  // --- The calibrator ------------------------------------------------------
  let sink = 0;
  const calibrate = () => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < CONFIG.calibratorIterations; i += 1) x += Math.sqrt(i);
    sink += x;
    return Math.round((performance.now() - t) * 100) / 100;
  };
  // **Warm the JIT before anything is published.** Unwarmed, the first samples
  // are the slowest and the loaded arm can read lower than the quiet one — which
  // is what the first run of this instrument actually did.
  for (let i = 0; i < 12; i += 1) calibrate();

  globalThis.__mpCalibrate = (n) => {
    const samples = [];
    for (let i = 0; i < n; i += 1) samples.push(calibrate());
    return samples;
  };

  // **The second half of the calibrator: a fixed SCHEDULING cost.** A compute
  // loop measures throughput on the core the renderer is already holding; what
  // contention actually does to a browser is delay the message loop, which is
  // also what the 30 s timeouts that destroyed Story 4.5's run were made of.
  // One \`setTimeout(…, 0)\` hop is a fixed unit of that.
  globalThis.__mpCalibrateSchedule = async (n) => {
    const samples = [];
    for (let i = 0; i < n; i += 1) {
      const t = performance.now();
      await new Promise((done) => setTimeout(done, 0));
      samples.push(Math.round((performance.now() - t) * 100) / 100);
    }
    return samples;
  };
  globalThis.__mpSink = () => sink;

  // --- The DOM check: did the thing under test actually change? ------------
  //
  // **No fallback.** The old instrument's \`?? document.body\` is a silent
  // downgrade to an element the clock mutates every second, and an arm that
  // cannot prove its subject changed must report *nothing* rather than zero.
  let mutations = 0;
  let attachedTo = null;
  const values = new Map();

  const sampleValues = () => {
    for (const selector of CONFIG.valueSelectors) {
      const seen = values.get(selector) ?? new Set();
      for (const element of document.querySelectorAll(selector)) {
        seen.add((element.textContent ?? "").trim());
      }
      values.set(selector, seen);
    }
  };

  const attach = (selector, label) => {
    const target = document.querySelector(selector);
    if (target === null) return false;
    attachedTo = selector;
    note({ kind: "repaint-target", selector, tag: target.tagName.toLowerCase(), label });
    sampleValues();
    new MutationObserver((records) => {
      mutations += records.length;
      sampleValues();
      note({ kind: "mutation", selector, records: records.length });
    }).observe(target, { childList: true, subtree: true, characterData: true });
    return true;
  };

  const tryAttach = (deadline) => {
    if (attach(CONFIG.repaintSelector, "repaint")) return;
    if (Date.now() > deadline) {
      note({ kind: "repaint-target-missing", selector: CONFIG.repaintSelector });
      return;
    }
    setTimeout(() => tryAttach(deadline), 100);
  };
  tryAttach(Date.now() + CONFIG.attachTimeoutMs);

  // --- The socket, counted BY URL -----------------------------------------
  const Native = globalThis.WebSocket;

  function Wrapped(url, protocols) {
    const socket = protocols === undefined ? new Native(url) : new Native(url, protocols);
    const ours = String(url).includes("/market-stream");
    note({ kind: "socket", url: String(url), ours });
    if (!ours) return socket;

    socket.addEventListener("message", (event) => {
      const text = typeof event.data === "string" ? event.data : "";
      const bytes = new TextEncoder().encode(text).length;
      let frame;
      try { frame = JSON.parse(text); } catch { return; }
      const symbols = Object.keys(frame.observations ?? {});
      note({
        kind: "frame",
        type: frame.type,
        sentAt: frame.sentAt ?? null,
        bytes,
        n: symbols.length,
        symbols: symbols.slice(0, 600),
      });
      openBurst("frame:" + String(frame.type), { bytes, n: symbols.length });
    });
    return socket;
  }

  Wrapped.prototype = Native.prototype;
  Object.assign(Wrapped, Native);
  // **The mark that says the wrapper is still the wrapper.** Task 4.5.8's first
  // draft was silently overwritten by Playwright's own \`WebSocket\` and reported
  // n = 0; from Node, \`wrapperIntact\` false means this arm reports nothing.
  Wrapped.__mpWrapped = true;
  globalThis.WebSocket = Wrapped;

  // --- The plants, for \`prove-instrument.mjs\` ------------------------------
  globalThis.__mpPlant = {
    /** A burst whose task blocks for \`blockMs\` — channel 3's planted effect. */
    burst: (blockMs, label) => {
      const id = openBurst(label ?? "planted-burst", { blockMs });
      const until = performance.now() + blockMs;
      while (performance.now() < until) { /* deliberately blocking */ }
      return id;
    },
    /** A block inside a rAF — channels 1 and 2's planted effect. */
    frameBlock: (blockMs) => new Promise((done) => {
      requestAnimationFrame(() => {
        const until = performance.now() + blockMs;
        while (performance.now() < until) { /* deliberately blocking */ }
        done(blockMs);
      });
    }),
    /**
     * A mutation carrying named values — the DOM check's planted effect.
     *
     * **A task between each value, and that is a measured correction.** The
     * first version set both texts and removed the node synchronously; a
     * \`MutationObserver\` callback runs at the microtask checkpoint, by which
     * point the node was already detached, so the value probe's
     * \`querySelectorAll\` found nothing and the arm reported two mutations and
     * **zero distinct values**. Exactly the failure mode this task exists to
     * forbid, produced by the proof itself.
     */
    mutation: async (texts) => {
      const target = document.querySelector(CONFIG.repaintSelector);
      if (target === null) return false;
      const span = document.createElement("span");
      span.dataset.mpPlant = "1";
      span.hidden = true;
      target.append(span);
      for (const text of texts) {
        span.textContent = String(text);
        await new Promise((done) => setTimeout(done, 0));
      }
      span.remove();
      return true;
    },
    /** How many mutations a second element saw — for the \`main\` vs \`body\` proof. */
    watch: (selector) => {
      let count = 0;
      const target = document.querySelector(selector);
      if (target === null) return false;
      new MutationObserver((records) => {
        count += records.length;
        note({ kind: "mutation", selector, records: records.length });
      }).observe(target, { childList: true, subtree: true, characterData: true });
      globalThis["__mpWatch_" + selector] = () => count;
      return true;
    },
  };

  globalThis.__mpDrain = () => ({
    rows: rows.splice(0, rows.length),
    gaps: gaps.splice(0, gaps.length),
    commits: commits.splice(0, commits.length),
    state: {
      visibility: document.visibilityState,
      commitTotal: commitCount,
      mutationTotal: mutations,
      repaintTarget: attachedTo,
      wrapperIntact: globalThis.WebSocket?.__mpWrapped === true,
      values: Object.fromEntries([...values].map(([k, v]) => [k, [...v]])),
    },
  });
})();`;
}

// --- Reading a page's instrument ------------------------------------------

/**
 * Open an instrumented page and refuse a hidden one.
 *
 * @param {import("@playwright/test").BrowserContext} context
 * @param {string} url
 */
export async function openInstrumentedPage(context, url, options = {}) {
  await context.addInitScript(pageInstrument(options));
  const page = await context.newPage();
  if (options.viewport !== undefined)
    await page.setViewportSize(options.viewport);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await assertVisible(page);
  return page;
}

/**
 * `document.visibilityState === "visible"`, asserted rather than hoped for.
 *
 * Epic 14's own warning: a tab driven over CDP reports `hidden`, which pauses
 * `requestAnimationFrame` and makes every figure small, plausible and
 * meaningless. This throws, because there is no honest way to continue.
 *
 * The `global` comment is `scripts/probe.mjs`'s idiom and not a workaround:
 * `eslint.config.mjs` gives this directory Node's globals and makes `no-undef`
 * an error here on purpose, so declaring the browser side on the function is
 * how a reader knows which side of the wire they are reading.
 */
/* global document */
export async function assertVisible(page) {
  const state = await page.evaluate(() => document.visibilityState);
  if (state !== "visible") {
    throw new Error(
      `document.visibilityState is "${state}". rAF is paused, so every gap, ` +
        "every burst and every paint below would be small, plausible and meaningless.",
    );
  }
  return state;
}

/** Drain one page's buffers. `splice` in place, in the page. */
export async function drain(page) {
  try {
    return await page.evaluate(() => globalThis.__mpDrain?.() ?? null);
  } catch {
    return null; // a navigation mid-read; the next drain gets it
  }
}

/** Wait until the page has published its observer verdict. */
export async function waitForObserverProof(page, timeoutMs = 6_000) {
  const until = Date.now() + timeoutMs;
  const rows = [];

  while (Date.now() < until) {
    const batch = await drain(page);
    if (batch !== null) {
      rows.push(...batch.rows);
      const proof = rows.find((row) => row.kind === "observer");
      if (proof !== undefined) return { proof, rows, state: batch.state };
    }
    await new Promise((done) => setTimeout(done, 200));
  }

  return { proof: null, rows, state: null };
}

// --- Arithmetic -----------------------------------------------------------

export const quantile = (values, q) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index];
};

/**
 * A distribution, or `null` when there is nothing to describe.
 *
 * `null` rather than zero, deliberately and everywhere: an empty sample and a
 * sample of zeroes are different findings, and the whole of this task is that
 * they must not print the same.
 */
export const distribution = (values) =>
  values.length === 0
    ? null
    : {
        n: values.length,
        p50: quantile(values, 0.5),
        p95: quantile(values, 0.95),
        max: Math.max(...values),
        min: Math.min(...values),
      };

/**
 * The calibrator's verdict for a set of windows.
 *
 * A window whose calibrator sample sits outside the band is **discarded**, and
 * the count is printed. The band is a ratio either side of a reference median
 * taken on the quiet machine at the top of the run — so this detects contention
 * that arrives *mid-run*, which nothing in this repository has done before.
 *
 * @param {number[]} samples
 * @param {{ reference: number, band: number }} calibration
 */
export function screen(samples, calibration) {
  const low = calibration.reference / calibration.band;
  const high = calibration.reference * calibration.band;
  const kept = [];
  const discarded = [];

  for (const [index, sample] of samples.entries()) {
    if (sample >= low && sample <= high) kept.push(index);
    else discarded.push({ index, sample });
  }

  return {
    band: [Number(low.toFixed(2)), Number(high.toFixed(2))],
    reference: calibration.reference,
    kept: kept.length,
    discarded: discarded.length,
    discardedSamples: discarded.slice(0, 20),
  };
}
