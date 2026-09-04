# Task 1.13.5 — Build the post-deploy browser check Task 1.11.7 declined

**Status:** Complete
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.4

## Objective

Close the gap Task 1.11.7 named and could not fill: a check that drives a real browser against the deployed environment, because `curl` is structurally incapable of catching the two failures that matter most.

## Work

- **Read the declined decision before rebuilding it.** Task 1.11.7 declined this check on grounds that were correct then — nothing could yet produce the failure — and named Story 1.12 as the trigger. Story 1.12 produces it. State plainly which part of the original argument has changed and which part still stands, rather than treating the decline as an oversight
- **The two failures this exists for are both invisible to every other instrument.** A wrong `CORS_ORIGIN`: the browser reports `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a **200 with a full body** and the log records `statusCode: 200`. A missing `VITE_API_BASE_URL`: the build does not fail, it ships a page dialling `http://localhost:3000`, which an HTTPS page blocks as mixed content and which reads to a user as an unreachable backend — from a cause that has nothing to do with the backend. **Both must be made to happen and caught**, not reasoned about
- **Story 1.5's two host-level criteria moved here from Task 1.13.3 (amended 2026-09-04), and this is now the only place in the repository that can hold them.** All four routes loaded cold as **200 with `index.html` and not a redirect**, a made-up path rendering `NotFound`, and `/assets/nope.js` a **404**. They were closed by hand in a browser in Task 1.11.4 and have been checked by a person or not at all ever since. They arrive here because Task 1.13.2 found the local suite's target is forced to the origin `CORS_ORIGIN` names — the dev server — which answers a deep link and a missing asset with a **200**, so neither is assertable there. **The deployed host is the one with `navigationFallback` configured**, and it is a URL-pattern rule rather than an `Accept` rule, measured in Task 1.12.7. Two traps come with them. **The not-found route rests on the same host property as the others**: `NotFound` only renders if the host served `index.html` for the address that matched nothing, so on a host without the fallback the user gets the host's own 404 and React never boots — which means the assertion to write is that `NotFound` **rendered**, not that the response was a 200. And the `exclude` array is exactly `["/assets/*"]`, so a file added to `apps/frontend/public/` lands at the artefact's root **outside** it and is answered with `index.html` at 200; `/assets/nope.js` is the path that tests the rule, and a made-up root path is not
- **A page that loads is not a page that is still talking — and the reading this depended on is in, so the conditional is gone (settled by Task 1.13.1, 2026-09-04).** ~~If this runner's browser reports `document.visibilityState` as `hidden`~~ — **it reports `visible`**, in Playwright and in Cypress alike, so the poll runs and a check may wait on a second one. The safe shape is still to assert on the **first** poll's outcome, but now for a better reason than uncertainty about the harness: **both failures this check exists for are visible on the very first request**, so a check that waits for a second poll is spending 30 s to learn nothing it did not already know, on the one check in this repository that runs against production. Wait for a second poll only where the assertion genuinely needs a _sequence_ — recovery does, a wrong `CORS_ORIGIN` does not
- **The deployed cycle is 30 s, and the number to derive a timeout from is 36 s (2026-09-04).** Task 1.13.1 measured **30.02 s** through Playwright locally against the recorded 31.00 / 31.05 s from a driven Chrome tab, confirming that the extra second was the browser and not the application. Deployed, the round trip is 250–770 ms and the `checking` placeholder lasts **283 ms** against 50.7 ms locally — so it is a real interval rather than a flicker and a check must wait past it. Where a poll hangs to the client's 5 s deadline the cycle stretches to **36 s** measured, not the 35 s the arithmetic suggests
- **Poll; do not check once.** **Scoped by Task 1.12.7 (2026-09-04): the window is a property of the artefact _changing_, not of deploying.** 174 consecutive CDN samples at 0.4 s across a whole `Deploy the frontend` step of a docs-only merge showed **zero** broken states — a byte-identical Linux rebuild keeps the hashed filenames, so there was no incoming asset to be missing and no outgoing one to withdraw. A mechanism explaining an observation and **not a re-test**: the window is real on a changing artefact and was not re-measured there. The check still has to poll, because a merge that ships source _does_ change the artefact. The frontend's upload is not atomic and the window opens **at the exact second the deploy step reports success** — ~2 seconds holding two distinct broken states (the incoming document served before the incoming asset exists, then the outgoing asset withdrawn while the outgoing document is still served), reproduced across four deploys and accepted deliberately. A check that fires immediately and once will be red for a reason that is not a defect, which is the fastest way to teach everyone to ignore it
- **You cannot fake the cross-origin failure in the browser, so the deployed one has to be broken for real (added by Task 1.13.3, 2026-09-04).** The obvious shortcut is `page.route()` plus a `fulfill` with `access-control-allow-origin` stripped. **It does not work**, measured two ways against the local pair — a fulfilled response carrying the real body with the header deleted, and one with **no CORS headers at all**, both accepted by Chromium and read normally by the page. A fulfilled response is not subject to the browser's CORS check. So producing this failure means changing `CORS_ORIGIN` on the live Container App, which is a platform-only value that no diff will ever show — the restoration bullet below is load-bearing rather than tidy, and the value should be read back and re-verified rather than assumed to have been put back
- **This is the only place that failure can be caught rather than pre-empted, and that is a property of the local harness (added by Task 1.13.3, 2026-09-04).** `scripts/pair-addresses.mjs` resolves the frontend's origin **from `CORS_ORIGIN`**, so locally the allowlist and where-the-frontend-actually-is cannot disagree: run against a misconfigured pair, `pnpm ready` reports `✗ frontend … ENOTFOUND` and exits 1 before a browser starts. That is the right local behaviour and it is exactly what is **not** available here, where `CORS_ORIGIN` is a literal in `deploy.yml` and the frontend's hostname is a fact about a Static Web App — two independent values that genuinely can disagree, which is the whole reason this check exists. Task 1.13.3 had to drive the local break by hand with `E2E_BASE_URL` set explicitly; do not carry that workaround here, because deployed the two values are separate inputs already
- **Reuse `e2e/support/`, and know that one module in it does not transfer (added by Task 1.13.3, 2026-09-04).** `app.ts` holds the indicator's locators with the four selector traps behind them, and `axe.ts` holds the accessibility gate — both are about the application and apply unchanged to a deployed page. **`pair.ts` is about the local pair** and reads `E2E_BASE_URL`/`E2E_BACKEND_ORIGIN` from `scripts/run-e2e.mjs`; a deployed check has two different addresses from a different source, so it needs its own resolution rather than a widened copy of that one. And `poll-timings.ts` restates the two constants **because they cannot be imported** — every path to them runs through `api-base-url.ts`, which reads `import.meta.env` at module load and throws under Node — with the copy kept honest by the recovery journey measuring the real interval. A deployed check that waits on a poll inherits that arrangement rather than re-deriving it
- **Decide whether the axe gate runs against the deployed page too, and say which (added by Task 1.13.3, 2026-09-04).** It is a gate locally, on two assembled pages, at zero violations. Deployed it would be the first thing in this repository to fail a _production_ check on an accessibility rule — which is either exactly right, because the deployed artefact is the one users get, or exactly wrong, because a rollback decision should not hinge on a rule Epic 15 has not yet reviewed. Both readings are defensible; an unstated one is not
- **Where it sits is a smaller question than Task 1.13.4's was, and most of the machinery already exists (added by Task 1.13.4, 2026-09-04).** That task settled the local suite's position as a **second job in `verify.yml`**, in parallel with the chain, gating a merge — and it built the browser install, the browser cache and the failure-artefact upload, all measured. **A deployed check needs far less than the `e2e` job does**: no pair, no `pnpm dev`, no `pnpm build` and no readiness gate, because it drives a live URL that is already up. It needs a checkout, an install, the browser, and the spec. Reuse the cache step verbatim rather than re-deriving it — with **one rule attached: exactly one job may _save_ that cache**, or two savers race to a `Cache already exists` warning that reads like a fault, which is why the `e2e` job restores the pnpm store and never saves it. This check is keyed on `deploy.yml` rather than on `verify`, so it is a job in that workflow or a `workflow_run` on it; either way the argument goes beside it, as the other two did
- **It must not be added to the ruleset, and that is a decision to state rather than an omission to leave (added by Task 1.13.4, 2026-09-04).** Ruleset `main` (id 22160620) now requires **two** checks, `verify` and `e2e`. A post-deploy check runs after a merge, so requiring it would gate on something that cannot have happened yet — the same reason the deploy itself is not required. Say so, because a future reader finding it unrequired cannot otherwise tell that from a forgotten step
- **The renderer question is closed, so the deployed-axe decision is a policy question and not a capability one (added by Task 1.13.4, 2026-09-04).** `--only-shell` computes real styles: on the runner it reports the page ground exactly and axe's `color-contrast` rule passes on **65 nodes**, the same number as macOS. Two things follow if the gate does run here. **The deployed artefact only passes it once Task 1.13.4's commit has shipped** — that task's `tabIndex={0}` fix for `scrollable-region-focusable` moved the artefact by 11 bytes and the deployed page is only correct after a deploy carrying it. And **every axe figure this repository records was taken at one viewport**, which that very defect proves is not the same as a page having no violations; a deployed assertion at one viewport size is the same narrow claim
- **Decide what a red result is _for_, because by the time it fires the code has shipped.** There is no preview environment and there deliberately never will be one on this plan, so this runs after a merge, against the live environment. Its output is a rollback decision, and rollback is asymmetric: the backend is `az containerapp update --image <previous digest>` in **43 s** and **the next merge silently undoes it**, while the frontend has no revision history at all and its rollback is a revert commit at **3 min 42 s**. Note also that `workflow_dispatch` on `deploy.yml` is a **re-deploy, not a rollback** — it checks out `main`
- **A check that runs from one machine over one link cannot tell its own network from the environment.** Task 1.11.7 produced a 65-second "outage" that was the laptop, and disproved it with a three-host control and the backend's own log records. A red result here is a claim about the environment; decide what evidence it must carry before it makes one, and whether a single failure is enough to act on
- **Count what it costs the environment, not just the runner.** The idle billing rate — the difference between ~$9.21 and ~$19.04 a month — is conditional on the replica receiving **less than 1,000 bytes per second**, platform probes are not billable and these requests are, and the idle baseline is ~~1–4~~ **a precise and explainable 4** per 30 s — liveness at `periodSeconds: 30` is 1 and readiness at `10` is 3 (refined by Task 1.12.7, 2026-09-04) against 16 log records a minute, and **one visible tab adds exactly +1 per 30 s** (measured deployed as a step function: 4 → 5 → 6 for 0, 1 and 2 visible tabs). A check that runs once per merge is negligible; one on a schedule is a decision with a bill attached
- **Do not let it become a monitor.** Uptime monitoring is not this story's and nothing in this epic owns it; a post-deploy check that grows a schedule has quietly become one. If that is wanted, it is a decision with an owner, not a cron line added here
- **Restore everything you break and re-verify.** `CORS_ORIGIN` and the app's other live settings exist **only in the platform** — `deploy.yml` uses `update` and never `create`, deliberately — so a value left wrong is a wrong value that no diff will ever show

- **Two figures from the runner, so nothing carries a laptop number forward (added by Task 1.13.4, 2026-09-04).** `ubuntu-latest` reports **2 Playwright workers**, not the laptop's 4 — Playwright's default is half the CPU count — and `--only-shell chromium` is **267 MB on disk in two directories** there (it still fetches FFmpeg) against ~199 MB on macOS. Failure artefacts follow the shape already set: on failure only, **7 days**, and **one archive root**, because `upload-artifact` roots an archive at the common ancestor of its paths and two paths on opposite sides of the workspace produce a nested archive with a stray directory beside it

## Done when

- A browser-driven check runs against the deployed environment after a deploy, polling rather than checking once, and it waits for a second poll only where an assertion genuinely needs a sequence
- Both of the failures `curl` cannot see have been produced deliberately and caught, with the server-side evidence recorded beside each to show what it looked like from the other side
- Story 1.5's deep-link and missing-asset criteria are asserted against the deployed host, with the not-found case asserted on what **rendered** rather than on a status code
- Everything broken has been restored and re-verified, including every platform-only value
- Whether the axe gate runs against the deployed page is a stated decision, and whether this check gates anything is stated too, including if the answer is that it gates nothing
- What a red result means, and what should be done about it, is written where the person seeing it will look
- The deployed environment is up and correct, and the pipeline is green

## Approach note

This is the one check in the repository that can fail for a reason nothing else can see, and also the one most likely to be flaky, expensive and ignored. It is now carrying two criteria from Story 1.5 as well, which makes it the largest of this story's six tasks — that is a consequence of the target being forced rather than a widening of scope, and it is worth knowing before starting rather than discovering halfway through. Both facts are true at once. The decision to build it is not "browser checks are good" — it is that Story 1.12 shipped a specific failure mode with no instrument, and this is the instrument.

## What happened

**Completed 2026-09-04.** Every figure below was taken rather than cited, and
two of them correct claims this repository states in more than one place.

### What it is

A second Playwright config (`e2e/playwright.deployed.config.ts`) over a second
spec directory (`e2e/specs-deployed/`), run by `pnpm e2e:deployed`
(`scripts/run-deployed-check.mjs`), gated by a deployed-readiness probe
(`scripts/check-deployed.mjs`), and executed in CI as a **`check-deployed` job
in `deploy.yml` with `needs: deploy`**. Ten tests: four deep links, the
not-found route, the missing asset, the two failures, the server-side half, and
an axe reading.

A second **config** rather than a second project, because a project shares
`use.baseURL` and the `testDir` sweep with its siblings — and `pnpm e2e` must
never reach production while `pnpm e2e:deployed` must never need a local pair.
`support/app.ts` and `support/axe.ts` transfer unchanged; `support/pair.ts`
deliberately does not.

### The declined decision, re-read before rebuilding it

**What changed:** Task 1.11.7 declined this on the grounds that nothing could
yet produce the failure. Story 1.12 shipped a client that polls the backend on
every page load. **What still stands:** there is no preview environment and
deliberately never will be one on this plan, so this runs after a merge and
gates nothing. Its output is a rollback decision.

### Both failures, made to happen

**A wrong `CORS_ORIGIN`, against the live backend.** `CORS_ORIGIN` set to
`https://marketpulse-wrong-origin.example` (revision `0000047`, `Activating` →
`RunningAtMaxScale` in 44 s). The check went **red at exit 1 in 53.2 s, 3 failed
/ 7 passed**, on `getByText(/^healthy$/)`. The server-side evidence, taken in
the same window: `curl` with the **real** frontend `Origin` got a **200 with the
full 62-byte contract body** and `access-control-allow-origin:
https://marketpulse-wrong-origin.example`, and Log Analytics recorded **15
`/health` requests through the 65-second window, every one `statusCode: 200`**.
Restored to `https://red-smoke-029583a0f.5.azurestaticapps.net` (revision
`0000048`), **read back from the platform** — all five environment variables
match the values captured before the break — and the check is green again.

**A missing `VITE_API_BASE_URL`, at the artefact.** Produced without touching
production, on the user's instruction: `vite build` with the variable unset
**succeeds**, and the bundle contains `http://localhost:3000` and no mention of
the deployed backend. Served on a local static host and driven by the same spec,
the check went red naming both origins —
`- "https://marketpulse-backend…" / + "http://localhost:3000"`. **The gap is
stated rather than hidden:** the mixed-content block itself is not reproduced,
because a page served over plain HTTP does not block a `localhost` call, and the
only HTTPS host available is production. It changes nothing about the
assertion, which is on the request's **origin** and needs no response at all.

**And the page in that state read `unreachable` / `No successful check yet.` —
byte for byte what the CORS break produces.** That is the justification for two
separate assertions rather than one, watched instead of argued.

### Two recorded claims corrected

- **`curl` is not _structurally_ incapable of catching a wrong allowlist.** The
  status, the body and the log genuinely cannot, but
  `access-control-allow-origin` is a readable copy of `CORS_ORIGIN` —
  `@fastify/cors` with a string origin asserts the configured value
  unconditionally — so an instrument **told the frontend's origin** can compare
  them. That value is exactly what no server-side instrument has, and the
  comparison is a proxy for the browser's verdict rather than the verdict: it
  says nothing about the second failure, where the backend is never asked. The
  suite makes the comparison anyway, because two instruments disagreeing is
  diagnostic.
- **The `e2e` gate caught a real flake in Task 1.13.3's health spec**, on this
  branch's own predecessor, and it took a commit to fix rather than a re-run.
  Every page load makes **two** `/health` requests and **one is aborted** —
  `StrictMode`'s first mount cleans up and aborts its own in-flight request,
  measured 5/5 as
  `["request GET", "request GET", "FAILED net::ERR_ABORTED", "finished"]`.
  Locally the abort lands before the headers, so there is one candidate; on a
  loaded runner it can land after them, producing a `response` carrying a 200
  whose body can never be retrieved. `waitForResponse` now requires the response
  to have `finished()`.

### Decisions stated

- **axe deployed is a REPORT, not a gate.** A red post-deploy result is a
  rollback decision; a contrast ratio is not a rollback, and mixing them makes
  the one signal that sees what nothing else does indistinguishable from the one
  nobody would act on immediately. The same rules already gate the same source
  before the merge, and the deployed artefact differs from the one that gate
  judged by exactly one string literal. So it is the **comparison**, and the
  reversal trigger is a **divergence**. Measured: the deployed landing route is
  **0 violations / 37 passes / 1 inconclusive (`color-contrast`)**, the
  pre-merge gate's numbers exactly. The report also refuses to wait for
  `healthy` — written that way the CORS break turned three tests red, one of
  them labelled accessibility, which tells a reader something false.
- **It gates nothing and is not in the ruleset**, for the reason `deploy` is
  not: requiring it would gate on something that cannot have happened yet.
  Ruleset `main` (id 22160620) still requires `verify` and `e2e` only.
- **It is not a monitor and has no `schedule:`.** Measured cost: a whole green
  run is **+5 requests** to the deployed backend, against a re-measured idle
  baseline of a steady **4 per 30 s**.
- **The evidence a red result must carry.** Both halves are probed and reported
  separately; **both** failing at once is called out as more likely to be the
  runner's link than a simultaneous outage of two independent Azure services in
  two regions, which is Task 1.11.7's 65-second laptop "outage" turned into a
  printed diagnosis. One half red with the other green is a claim about that
  service.
- **What a red result means is written where the person seeing it will look** —
  the `check-deployed` job writes a table of failed-test-to-cause plus both
  asymmetric rollback procedures into the summary of the run that went red, and
  it names the case no revert can fix, because `CORS_ORIGIN` is not in this
  repository.

### Figures

- **Green run: 10 passed in 10.5 s**, 12.5 s wall including readiness. Red on a
  broken allowlist: **53.2 s**, exit 1.
- Readiness on a settled deployment is immediate: `document and 2 assets served
together`.
- `pnpm verify` **23.5 s** exit 0; `pnpm test` untouched at **189** across
  "Scope: 4 of 5 workspace projects"; the local `pnpm e2e` **10 passed (1.0m)`.
- **No new dependency**, no lockfile change, `pnpm-workspace.yaml` untouched.

### What the job's first real run found, which is the most transferable thing here

The `check-deployed` job **went red on its first execution**, and it went red on
something a laptop structurally cannot see.

**`packages/shared` is consumed as built output, and a fresh checkout has no
`dist/`.** The job's own comment claimed the specs needed nothing compiled
because `pnpm install` links the workspace package — wrong, and wrong against
this repository's oldest rule. The failure arrived from Playwright as
`Cannot find module .../@marketpulse/shared/dist/index.js` and then
`No tests found`, in **1.7 s**, _after_ the readiness probe had passed against a
perfectly healthy production. Green on every machine here, because every machine
here has a built tree.

The fix is the e2e package's **own documented verb** rather than a build step
invented in a workflow: `pnpm --filter @marketpulse/e2e typecheck` is `tsc -b`,
`e2e/tsconfig.json` references `packages/shared`, so it builds exactly what the
specs import and nothing else — no frontend bundle and no Storybook, which root
`pnpm build` would also produce and which nothing in this job drives. It
typechecks the specs on the way past.

`scripts/run-deployed-check.mjs` now also **guards on presence** with a message
naming the command, so the next occurrence is a sentence rather than a module
resolution error — presence and not freshness, the shape Task 1.10.5 settled
after building a staleness check and removing it.

**And writing that guard found a new face of a recorded trap.** This repository
records that `tsc -b --clean` deletes the output of the sources that _currently_
exist. The mirror: **deleting `dist/` by hand and leaving `tsconfig.tsbuildinfo`
makes `tsc -b` emit nothing at all**, because it still believes the output is
current — so the guard's own suggested fix silently does nothing in that
situation, and `pnpm clean` is what is needed. Reproduced twice while writing
this. A fresh checkout has no `.tsbuildinfo` and is unaffected, which is
precisely why CI cannot find this one and a laptop can.

**The failure path was exercised for real in the same run**, which is the thing
that is usually left untested: `What to do about a red result` wrote its
rollback table into the run summary and `Upload the failure artefacts`
uploaded, both on a genuinely red job rather than on a rehearsal.

### The runner's figures, taken from the first green execution

Run `33859017114`, on the merge that fixed the build step above.

|                              |                                                                  |
| ---------------------------- | ---------------------------------------------------------------- |
| Whole `check-deployed` job   | **35 s** (09:37:16 → 09:37:51), against the `e2e` job's 99–103 s |
| `pnpm e2e:deployed` step     | **8,306 ms**, of which the suite is **6.5 s**                    |
| Browser cache                | **exact-key hit**, install **1,027 ms**                          |
| Readiness                    | coherent on the first poll                                       |
| axe, deployed, on the runner | **0 violations / 37 passes / 1 inconclusive**                    |

Three things worth reading off that.

- **The suite is FASTER on the runner than on the laptop** — 6.5 s against
  9.7–10.5 s — which is the opposite of every other timing this repository has
  recorded, and the explanation is geography rather than the machine: the runner
  and both Azure services are in the United States and the laptop is not. It is
  the first figure here where `ubuntu-latest` beats the development machine.
- **The axe reading agrees three ways** — the deployed page on the runner, the
  deployed page from macOS, and the pre-merge gate — all `0 / 37 / 1`. That is
  the comparison this report exists to be, and it agreeing is what keeps it a
  report rather than a gate.
- **The browser cache behaved exactly as the restore-only rule predicts.** An
  exact-key hit on the first run, because `verify`'s `e2e` job had already saved
  it under the same key on the same commit. No second saver, no
  `Cache already exists` warning.

**The environment was re-verified after everything**: both halves up, the
artefact coherent, and all five of the Container App's environment variables
read back from the platform matching the values captured before the deliberate
break.
