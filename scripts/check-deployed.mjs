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
 * The frontend serves a document AND every hashed asset that document names.
 *
 * The asset list is read out of the document that was just fetched rather than
 * from a build here, which is what makes this a statement about the live site
 * rather than about a local `dist/`. It is deliberately a plain regular
 * expression over `src`/`href`: the artefact is four files and the two that
 * matter are the hashed script and stylesheet under `/assets/`, and a real HTML
 * parser would be a dependency bought to read two attributes.
 */
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

  for (;;) {
    // Sequentially rather than in parallel, unlike `check-ready.mjs`. Two
    // requests a second at production is a poor neighbour for no gain: nothing
    // here is waiting on a slow local startup, and this check's own traffic is
    // a cost it is supposed to be able to count.
    backend = await probeBackend(backendOrigin);
    frontend = await probeFrontend(frontendOrigin);

    if (backend.ok && frontend.ok) return { ok: true, backend, frontend };
    if (Date.now() >= deadline) return { ok: false, backend, frontend };

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/** Render the result, including the control's diagnosis. */
export function reportDeployed({ ok, backend, frontend }, addresses) {
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
  console.log("");

  if (ok) {
    console.log("The deployed pair is up and the artefact is coherent.\n");
    return;
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
