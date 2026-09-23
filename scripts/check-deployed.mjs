// Is the DEPLOYED pair up, and is the frontend's artefact coherent right now?
// (Task 1.13.5.)
//
// This is `check-ready.mjs`'s counterpart for the live environment, and it is a
// separate file rather than a widened copy of that one because it answers a
// different question about a different thing. `check-ready.mjs` judges a local
// pair whose addresses it computes from the backend's own built config; this
// judges two independently-addressed live services and, on the frontend side,
// something a local host cannot be wrong about at all.
//
// ---------------------------------------------------------------------------
// Why the frontend probe reads the document AND its assets
// ---------------------------------------------------------------------------
//
// **A frontend upload on Azure Static Web Apps is not atomic**, reproduced over
// four deploys and accepted deliberately. For about two seconds the deployed
// site holds one of two distinct broken states — the incoming `index.html`
// served before the incoming asset exists, then the outgoing asset withdrawn
// while the outgoing `index.html` is still served — and the window opens **at
// the exact second the deploy step reports success**, which is the second this
// check would otherwise start.
//
// Task 1.12.7 scoped that finding rather than retiring it: the window is a
// property of the artefact CHANGING. A merge whose Linux rebuild is
// byte-identical keeps its hashed filenames, so there is no incoming asset to
// be missing and no outgoing one to withdraw — 174 consecutive samples at 0.4 s
// across a whole deploy step showed zero broken states. But a merge that ships
// source does change it, so a check that fires once and immediately is red for
// a reason that is not a defect. That is the fastest way to teach everybody to
// ignore the one check that can see failures nothing else can.
//
// So this polls, and what it polls for is **coherence** rather than a status
// code: fetch the document, read every hashed asset it references out of it,
// and require the document and all of its assets to be served together. That is
// exactly the property the window violates, in both of its states, and it is
// the honest precondition for a browser ever being pointed at the page.
//
// ---------------------------------------------------------------------------
// The control: this cannot tell its own network from the environment
// ---------------------------------------------------------------------------
//
// Task 1.11.7 produced a 65-second "outage" of the deployed backend that turned
// out to be the laptop's own link, and disproved it with a three-host control
// and the backend's own log records. A check that runs from one machine over
// one link has exactly that failure mode, and a red result here is a claim
// about a live environment.
//
// The control this uses is the structure it already has rather than a third
// host and a new external dependency: the two halves are **different Azure
// services in different regions on different infrastructure** — Container Apps
// in East US and a geo-distributed CDN fronting a Static Web App in East US 2 —
// reached over different connections. One of them failing is a claim about that
// service. **Both** of them failing at once is far more likely to be this
// runner's network than a simultaneous outage of two independent services, and
// this script says so in as many words rather than leaving the reader to guess.
// It does not decide anything on that basis; it is a diagnosis printed beside a
// failure, so the person acting on it starts from the right question.

import process from "node:process";

/** One attempt's deadline. Long enough for an internet round trip, short
 *  enough that a hung socket does not stall the whole poll — the same reason
 *  `check-ready.mjs` puts a timeout on each attempt rather than only overall. */
const ATTEMPT_TIMEOUT_MS = 10_000;

/** How long to wait for the deployed artefact to become coherent. The upload
 *  window is ~2 s; this is two orders of magnitude of slack, because the cost
 *  of waiting is seconds and the cost of firing early is a red check nobody
 *  believes. */
const OVERALL_TIMEOUT_MS = 180_000;

const POLL_INTERVAL_MS = 1_000;

/**
 * How many completed sessions the store may be behind before this goes red.
 *
 * **Two, and it is a ceiling rather than a target.** The catch-up runs at 08:00
 * UTC daily, so in the steady state every timeframe is zero or one behind — one
 * on a weekday before the run, because the previous session closed after the
 * last one. Two absorbs a single missed night. Three means two consecutive runs
 * did nothing, which is a job that has stopped rather than a job that was
 * unlucky.
 *
 * It is measured against `stalestSessionsBehind` — the WORST security — and not
 * the newest, because a maximum is exactly what hid the original defect's
 * shape: a partial fill leaves the freshest symbol current while most of the
 * universe rots.
 */
const MAX_SESSIONS_BEHIND = 2;

async function get(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      // Never a cached answer. The document is served `no-cache` and the assets
      // `immutable`, so a check reading its own cache during the upload window
      // would report the state that has just stopped being true.
      cache: "no-store",
      redirect: "manual",
    });

    return { ok: true, status: response.status, response };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * The backend answers its own contract.
 *
 * `/health` and not the root: the root is a 404 by design, which is a healthy
 * server and would need this check to know that. The contract is what the
 * frontend depends on.
 */
async function probeBackend(backendOrigin) {
  const result = await get(`${backendOrigin}/health`);

  if (!result.ok) return { ok: false, detail: result.reason };
  if (result.status !== 200) {
    return { ok: false, detail: `HTTP ${String(result.status)}` };
  }

  let body;
  try {
    body = await result.response.json();
  } catch {
    return { ok: false, detail: "200 with a body that is not JSON" };
  }

  if (typeof body !== "object" || body === null || !("status" in body)) {
    return { ok: false, detail: "200 with a body that is not the contract" };
  }

  return {
    ok: true,
    detail: `${String(body.version ?? "?")}, up ${Number(
      body.uptimeSeconds ?? 0,
    ).toFixed(1)}s`,
  };
}

/**
 * How many trading sessions behind the store is, per timeframe.
 *
 * **This is the check that catches a cron that stopped.** On 2026-09-12 the
 * scheduled catch-up had filled minute bars only for eight days, every nightly
 * run green, and it was found by a person noticing that two regions on one page
 * disagreed by 4.6%. `scripts/check-backfill-coverage.mjs` refuses that
 * *contract* statically in `pnpm verify`; nothing statically checkable can see a
 * job that is disabled, throttled or failing — and `backfill.yml` records that
 * GitHub disables a `schedule:` after 60 days with no pushes.
 *
 * **It runs here rather than in `verify` deliberately.** A deployed check runs
 * after a merge and gates nothing; its output is a rollback decision. Failing
 * `verify` on this would make an unrelated contributor's PR red because a
 * backfill was skipped overnight, and `verify` has no credentials or database by
 * design — pointing it at a live store would fork the definition of "verified".
 *
 * ## Why an EMPTY store passes
 *
 * `null` means the ledger holds nothing at that timeframe, which is CI's store
 * exactly — `verify.yml` runs the migrations and the universe loader and never a
 * backfill, because a backfill is metered. Failing on `null` would make this
 * check red in the one environment that runs it most, which is how a check stops
 * being read. **A store with no bars is not a stale store**; it is a store
 * nobody has filled, and `pnpm bars:check` is the instrument for that.
 */
/**
 * **What this file deliberately does not probe, decided 2026-09-23 by Task
 * 3.7.6: the presence of a column.**
 *
 * Story 3.7 added `market_bars.feed` in `0010`, and the question the task
 * asked is whether this check should assert the schema rolled. It should not,
 * for a reason about **ordering** rather than about cost: `deploy.yml`
 * migrates *before* either half of the code rolls and exits non-zero on a
 * migration that did not apply — the `status=$?` guard that exists because a
 * refused migration once reported success — so a deployment whose code is
 * live and whose column is missing is not reachable through the pipeline. A
 * probe here would assert something the step before it already fails on, and
 * this check runs **after the merge and gates nothing**; its output is a
 * rollback decision.
 *
 * The cheapest honest witness, if one is ever wanted, is **not** schema
 * introspection: since Task 3.7.5 a served window's `provenance.sources` is
 * derived from that column, so any `GET /market-data/bars` answering 200 with
 * a source proves the column exists and is read end to end. That is a bars
 * probe with a symbol and a window, and it is worth adding **when a schema
 * change lands whose absence the migrate step cannot see** — an out-of-band
 * `VALIDATE`, a column dropped by a contract deploy, or a manual repair. That
 * condition is the trigger; a story number is not.
 */
async function probeFreshness(backendOrigin) {
  const result = await get(`${backendOrigin}/diagnostics/freshness`);

  if (!result.ok) return { ok: false, detail: result.reason };
  if (result.status !== 200) {
    return { ok: false, detail: `HTTP ${String(result.status)}` };
  }

  let body;
  try {
    body = await result.response.json();
  } catch {
    return { ok: false, detail: "200 with a body that is not JSON" };
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray(body.timeframes)
  ) {
    return { ok: false, detail: "200 with a body that is not the contract" };
  }

  const stale = body.timeframes.filter(
    (entry) =>
      typeof entry.stalestSessionsBehind === "number" &&
      entry.stalestSessionsBehind > MAX_SESSIONS_BEHIND,
  );

  const summary = body.timeframes
    .map(
      (entry) =>
        `${String(entry.timeframe)}=${
          entry.stalestSessionsBehind === null
            ? "empty"
            : `${String(entry.stalestSessionsBehind)} behind`
        }`,
    )
    .join(", ");

  if (stale.length > 0) {
    return {
      ok: false,
      detail:
        `${summary} — over the ${String(MAX_SESSIONS_BEHIND)}-session ceiling. ` +
        "The nightly backfill has not run, or has not covered every security. " +
        'Dispatch: gh workflow run backfill.yml -f args="--timeframe 1d --sessions 10"',
    };
  }

  return { ok: true, detail: summary };
}

/**
 * The frontend serves a document AND every hashed asset that document names.
 *
 * The asset list is read out of the document that was just fetched rather than
 * from a build here, which is what makes this a statement about the live site
 * rather than about a local `dist/`. It is deliberately a plain regular
 * expression over `src`/`href`: the artefact is four files and the two that
 * matter are the hashed script and stylesheet under `/assets/`, and a real HTML
 * parser would be a dependency bought to read two attributes.
 */
/**
 * Is the deployed feed telling the truth? (Task 3.2.8, ADR 0030 §7c.)
 *
 * **Two conditions, and the first is unconditional on the hour.**
 *
 *  1. **`replay` fails at ANY hour, in the provider or the feed.** Production
 *     has real users and must only ever tell the absolute truth about the real
 *     market. There is no time of day at which a deployed replay is acceptable,
 *     so there is no clause here that could be argued into one.
 *  2. **While the market is open, the feed must be a connected `iex`.** Outside
 *     a session a feed that is not delivering is the honest state — ADR 0030
 *     §7a: *a still page that is true beats a moving page that needs a caption
 *     to be true.*
 *
 * **The market clock comes from the SERVER rather than from here**, which is one
 * fact with one home: the backend already has Story 2.5's calendar and its
 * exception table, and a copy in this script would be a second answer to *is
 * today a half-day* that nothing reconciles.
 *
 * **This is detective rather than preventive and that is stated rather than
 * apologised for** (ADR 0030 §7c): it runs after the rollout, so by the time it
 * goes red the thing it objects to has already served traffic. What it bounds is
 * the DURATION of a wrong state, not its existence. `deploy.yml`'s provider read
 * (§7b) is the preventive one.
 */
async function probeFeed(backendOrigin) {
  const result = await get(`${backendOrigin}/diagnostics/feed`);

  if (!result.ok) return { ok: false, detail: result.reason };

  // **A 404 is a different failure from a wrong feed, and saying so is worth a
  // branch.** It means the running revision predates this endpoint — which is
  // the expected state for exactly one deploy, the one that first ships it. A
  // check whose message misdiagnoses is worse than a terse one: an operator
  // reading "the feed is not telling the truth" would go looking at
  // `MARKET_DATA_PROVIDER` when the answer is that the route does not exist yet.
  if (result.status === 404) {
    return {
      ok: false,
      missing: true,
      detail:
        "404 — the running revision predates /diagnostics/feed. Expected for " +
        "the first deploy that ships it; anything later means the rollout did " +
        "not take.",
    };
  }

  if (result.status !== 200) {
    return { ok: false, detail: `HTTP ${String(result.status)}` };
  }

  let body;
  try {
    body = await result.response.json();
  } catch {
    return { ok: false, detail: "200 with a body that is not JSON" };
  }

  if (typeof body !== "object" || body === null) {
    return { ok: false, detail: "200 with a body that is not the contract" };
  }

  const { provider, feed, status, marketOpen } = body;

  // Condition 1. Unconditional.
  if (provider === "replay" || feed === "replay") {
    return {
      ok: false,
      detail:
        `the deployed feed is REPLAYING (provider=${String(provider)} ` +
        `feed=${String(feed)}) — production must only ever serve the real ` +
        "market, at any hour (ADR 0030 §7a)",
    };
  }

  // Condition 2. Gated on the server's own calendar.
  if (marketOpen === true) {
    if (feed !== "iex" || status !== "live") {
      return {
        ok: false,
        detail:
          `the market is open and the feed is not a connected iex ` +
          `(provider=${String(provider)} feed=${String(feed)} ` +
          `status=${String(status)})`,
      };
    }
    return { ok: true, detail: "live on iex, market open" };
  }

  return {
    ok: true,
    detail: `market closed; provider=${String(provider)} status=${String(status)}`,
  };
}

async function probeFrontend(frontendOrigin) {
  const document = await get(`${frontendOrigin}/`);

  if (!document.ok) return { ok: false, detail: document.reason };
  if (document.status !== 200) {
    return {
      ok: false,
      detail: `the document answered HTTP ${String(document.status)}`,
    };
  }

  const html = await document.response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
    (match) => match[1],
  );

  if (assets.length === 0) {
    return {
      ok: false,
      detail:
        "the document references no /assets/ file, which is not what this " +
        "artefact looks like — something other than the application answered",
    };
  }

  for (const asset of assets) {
    const result = await get(`${frontendOrigin}${asset}`);

    if (!result.ok) return { ok: false, detail: `${asset}: ${result.reason}` };
    if (result.status !== 200) {
      return {
        ok: false,
        // Naming the window explicitly, because this is what it looks like and
        // it is transient. A reader who does not know it exists reads a 404 on
        // a hashed asset as a broken build.
        detail:
          `${asset} answered HTTP ${String(result.status)} while the document ` +
          `was served — the artefact is mid-upload, or it is genuinely broken`,
      };
    }
  }

  return {
    ok: true,
    detail: `document and ${String(assets.length)} asset${
      assets.length === 1 ? "" : "s"
    } served together`,
  };
}

/**
 * Poll both halves until they are simultaneously up and coherent.
 *
 * Returns `{ ok }` plus the last result for each half, so the caller can print
 * the two-host diagnosis rather than a single line saying something failed.
 */
export async function checkDeployed({ backendOrigin, frontendOrigin }) {
  const deadline = Date.now() + OVERALL_TIMEOUT_MS;
  let backend;
  let frontend;
  let freshness;
  let feed;

  for (;;) {
    // Sequentially rather than in parallel, unlike `check-ready.mjs`. Two
    // requests a second at production is a poor neighbour for no gain: nothing
    // here is waiting on a slow local startup, and this check's own traffic is
    // a cost it is supposed to be able to count.
    backend = await probeBackend(backendOrigin);
    frontend = await probeFrontend(frontendOrigin);

    // **Last, and only once the pair is up.** A stale store on a backend that
    // is still starting is a fact about the backend, and retrying a freshness
    // answer cannot change it: unlike the upload window this loop exists for,
    // nothing about staleness resolves by waiting a second. So it is probed
    // when the other two agree, and its result ends the loop either way.
    if (backend.ok && frontend.ok) {
      freshness = await probeFreshness(backendOrigin);
      // **Both, always, and the result is the AND.** A deployment that is fresh
      // and replaying is not acceptable, and one that is live on `iex` with a
      // stale store is not either — so neither probe may short-circuit the
      // other, and a reader of the output sees both lines whichever failed.
      feed = await probeFeed(backendOrigin);
      return {
        ok: freshness.ok && feed.ok,
        backend,
        frontend,
        freshness,
        feed,
      };
    }

    if (Date.now() >= deadline)
      return { ok: false, backend, frontend, freshness, feed };

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/** Render the result, including the control's diagnosis. */
export function reportDeployed(
  { ok, backend, frontend, freshness, feed },
  addresses,
) {
  const line = (mark, label, url, detail) =>
    `  ${mark} ${label.padEnd(9)} ${url}  ${detail}`;

  console.log(
    line(
      backend.ok ? "✓" : "✗",
      "backend",
      `${addresses.backendOrigin}/health`,
      backend.detail,
    ),
  );
  console.log(
    line(
      frontend.ok ? "✓" : "✗",
      "frontend",
      `${addresses.frontendOrigin}/`,
      frontend.detail,
    ),
  );
  // Absent when the pair never came up — reported as "not reached" rather than
  // omitted, so a reader cannot mistake a check that did not run for one that
  // passed. That distinction is the whole subject of this file's newest probe.
  console.log(
    line(
      freshness === undefined ? "·" : freshness.ok ? "✓" : "✗",
      "store",
      `${addresses.backendOrigin}/diagnostics/freshness`,
      freshness === undefined
        ? "not reached — the pair never came up"
        : freshness.detail,
    ),
  );
  // Same "not reached" treatment, for the same reason: a check that did not run
  // must not look like one that passed.
  console.log(
    line(
      feed === undefined ? "·" : feed.ok ? "✓" : "✗",
      "feed",
      `${addresses.backendOrigin}/diagnostics/feed`,
      feed === undefined ? "not reached — the pair never came up" : feed.detail,
    ),
  );
  console.log("");

  if (ok) {
    console.log("The deployed pair is up and the artefact is coherent.\n");
    return;
  }

  if (feed !== undefined && !feed.ok && feed.missing === true) {
    console.error(
      "The deployed backend has no /diagnostics/feed endpoint.\n\n" +
        "That is EXPECTED for the single deploy that first ships it, and a\n" +
        "problem on any later one — it would mean the rollout did not take.\n",
    );
  } else if (feed !== undefined && !feed.ok) {
    console.error(
      "The deployed FEED is not telling the truth about the market.\n\n" +
        "This is a rollback decision rather than a gate — it runs after the rollout,\n" +
        "so what it objects to has already served traffic. What it bounds is how LONG\n" +
        "a wrong state lasts (ADR 0030 §7c).\n\n" +
        "If it says REPLAYING: production is serving recorded prices re-stamped onto\n" +
        "the wall clock. There is no hour at which that is acceptable. Check\n" +
        "MARKET_DATA_PROVIDER on the container app — it is set out of band rather than\n" +
        "by the deploy, so a hand edit between deploys is exactly how this happens.\n",
    );
  }

  if (!backend.ok && !frontend.ok) {
    console.error(
      "BOTH halves are unreachable, and that is a reason to suspect this machine's\n" +
        "network before the environment. They are different Azure services, in\n" +
        "different regions, on different infrastructure — Container Apps in East US\n" +
        "and a geo-distributed CDN in East US 2 — so a simultaneous outage of both is\n" +
        "much less likely than one link being down. Task 1.11.7 produced exactly this\n" +
        "shape once and it was the laptop. Check from a second host before acting.\n",
    );
    return;
  }

  // **Before the two-halves diagnosis, because this failure is neither half.**
  //
  // Added 2026-09-12, on the first live run of the freshness probe. It failed
  // correctly — the deployed daily store was four sessions behind — and this
  // function printed *"The frontend half of the deployed environment is not
  // answering correctly"* directly above a line reading `✓ frontend`.
  //
  // That is the failure mode this repository writes down most often: a message
  // that names the wrong thing is worse than no message, because a reader acts
  // on it. The check grew a third subject and its diagnosis still knew two.
  if (backend.ok && frontend.ok) {
    console.error(
      "Both halves are up and the artefact is coherent. **The deployment itself\n" +
        "succeeded.** What failed is the AGE of the data behind it: the store is\n" +
        "further behind the trading calendar than the ceiling allows.\n" +
        "\n" +
        "This is not a rollback signal. Rolling back the code would not move a bar,\n" +
        "and the previous revision reads the same store. The repair is a backfill:\n" +
        "the line above names the dispatch, and `pnpm bars:check --timeframe 1d`\n" +
        "says what is missing before you spend the quota.\n" +
        "\n" +
        "If the store is current and this is still red, the ceiling in\n" +
        "MAX_SESSIONS_BEHIND is wrong rather than the data — it is a judgement\n" +
        "about a daily schedule and BARS.md \u00a78.18 records what it was chosen\n" +
        "against.\n",
    );
    return;
  }

  console.error(
    `The ${backend.ok ? "frontend" : "backend"} half of the deployed environment is not ` +
      "answering correctly.\n" +
      "The other half is, which makes this a claim about that service rather than\n" +
      "about this machine's network. See `Where a red result goes` in e2e/README.md.\n",
  );
}

// Runnable on its own — `node scripts/check-deployed.mjs` — for the reason
// `check-ready.mjs` is: the thing you want during an incident is the probe
// without the browser.
if (process.argv[1] === import.meta.filename) {
  const addresses = {
    backendOrigin: process.env.E2E_DEPLOYED_BACKEND_ORIGIN,
    frontendOrigin: process.env.E2E_DEPLOYED_BASE_URL,
  };

  if (!addresses.backendOrigin || !addresses.frontendOrigin) {
    console.error(
      "Set E2E_DEPLOYED_BACKEND_ORIGIN and E2E_DEPLOYED_BASE_URL, or run\n" +
        "`pnpm e2e:deployed`, which passes both. There is deliberately no default:\n" +
        "see e2e/support/deployed.ts for why they are two independent inputs.",
    );
    process.exit(1);
  }

  const result = await checkDeployed(addresses);
  reportDeployed(result, addresses);
  process.exit(result.ok ? 0 : 1);
}
