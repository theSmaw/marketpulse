# Task 1.12.7 — Verify the slice against the deployed environment, including the states you cannot fake there

**Status:** Complete (2026-09-04)
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.6 — complete, and this file was amended against what 1.12.6 measured on 2026-09-04

## Objective

Meet the criterion that says "not only locally". Deploy the slice, watch it work from a browser against the live environment, and produce degraded and unreachable there by causes the platform does not heal around.

## Work

- **Confirm the deployed backend still starts, and know why that is a real question this time rather than ceremony.** Until Task 1.12.1 nothing imported `@marketpulse/shared` at runtime, so the pnpm symlink into `packages/shared` had never been followed by a running process and a broken artefact would have run anyway. It is load-bearing now. The mechanism was proved locally rather than assumed — `pnpm image` plus `docker run` answers `/health` 200 at `pid` 1, with the symlink resolving to real files and `dist/index.js` at **2,121 B** against Story 1.11's recorded 1,257 — but **the first deploy of this story is the first time it is exercised on the platform**, and the failure shape would be `ERR_MODULE_NOT_FOUND` before `listen`: a revision that crash-loops while the previous one at weight 0 keeps serving `/health` 200, which is exactly the four-failure-class shape Task 1.11.7 measured and which reads as a successful deploy from every instrument except the revision list. Check the revision, not the endpoint
- **Merge and let the pipeline deploy it.** There is no preview environment and there deliberately never will be one on this plan: `CORS_ORIGIN` holds exactly one string, and a wildcard admitting previews would admit every Static Web App in the region — so a preview is a page that loads perfectly and cannot call the backend. This story's deployed verification happens against the live environment on a branch that has already merged
- **Poll after the deploy; do not check once.** The frontend's upload is not atomic and the window opens **at the exact second the deploy step reports success**: ~2 seconds holding two distinct broken states — the incoming document served before the incoming asset exists, then the outgoing asset withdrawn while the outgoing document is still served — reproduced across four deploys and accepted deliberately. Treat a failure in the first few seconds after a deploy as the deploy, not as this story's code
- **A deployed poll takes up to 30 seconds to notice anything, so give every state that long before reading it as a failure.** Task 1.12.3 schedules the next poll when the previous one **settles**, so after a cause is introduced the indicator changes on the next poll and not on the change — up to 30 s, or ~~up to 35 s~~ **36.00 s** when the cause is a hung socket, since the deadline elapses first — **Task 1.12.6 measured that cycle three times at 36.001 / 36.001 / 36.010 s (2026-09-04)**, and the extra second over the arithmetic is the browser rather than the application; see the throttling note below. Three of the checks below break something and then look at a browser; **do not read the first ten seconds as the state not working**, and do not switch away to the portal while waiting, because that stops the loop. **Task 1.12.5 measured that last clause and it is worse than "stops": a tab that is hidden _at mount_ never makes the first request at all** — `poll()` is itself guarded by `isHidden()` — so a deployed page opened in a background tab sits on `checking` forever and looks exactly like a broken deployment. Overriding `document.visibilityState` with a `configurable` getter returning `"visible"` and dispatching a `visibilitychange` event polls immediately, which is what to reach for if a check cannot foreground a real tab. **Task 1.12.6 found the limit of that workaround and it matters for every figure below (2026-09-04): the override gets past the application's `isHidden()` guard and _not_ past Chrome's own background-timer throttling.** An automated tab is genuinely backgrounded whatever `visibilityState` reports, so its timers align to the second and the 30,000 ms interval fires at **31.00 s** — 30.994–31.006 s across eleven consecutive polls. So an automated reading of the deployed poll is **1.94 requests a minute where a real foreground tab gives 2.00**. Do not record that extra second as deployed latency or as drift; it is the instrument
- **You cannot produce "unreachable" by breaking the deployment, and that is measured rather than assumed.** Four failure classes were made to happen against the live environment in Task 1.11.7 and **no request ever returned a non-200 through any of them**, with `uptimeSeconds` never resetting — the failing revision holds `trafficWeight: 100` while the previous one at weight 0 keeps serving. To exercise the states you need a cause the platform does not heal around: a wrong `CORS_ORIGIN`, a wrong `VITE_API_BASE_URL`, or a rolled-back backend. **Task 1.12.6 found a fourth, and it is the cheapest of them because it changes no platform value and needs no restoration (2026-09-04): point `VITE_API_BASE_URL` at the deployed frontend's _own_ origin.** That is a build-time literal in `deploy.yml`, so it is reverted by a commit rather than by remembering, and it is the only cause here that a diff will show
- **`unreadable-body` has never been produced from a host this project did not write, and this is the task that can (2026-09-04).** Task 1.12.6 reached it only from a purpose-built impostor, because the obvious real producer does not work: **`vite preview`'s SPA fallback keys on the `Accept` header**, so the `application/json` that `api-client.ts` sends gets a **404** where a browser navigation gets 200 `index.html` — which reads as `degraded` / `not-ok-status`, not `unreadable-body`. The prediction to check here rather than assume: **Azure Static Web Apps' `navigationFallback` is a URL-pattern rule rather than an `Accept` rule**, so pointing the API at the deployed frontend's own origin should answer 200 `index.html` to a JSON-accepting request and produce the state honestly. Check it with `curl` at both `Accept` values **before** trusting the browser reading, because that one header is the whole difference — and if SWA turns out to key on `Accept` too, record that as the finding and say plainly that this state is unreachable from any host we do not control. There is no CORS obstacle either way: this is a same-site request to an origin that is not configured to permit it, so a rejection would be a third distinct reading worth recording rather than a failed attempt
- **Two of those three are invisible to every piece of server-side evidence.** With a wrong `CORS_ORIGIN` the browser reports `TypeError: Failed to fetch`, `curl` with the same `Origin` gets a 200 with a full body, and the log records `statusCode: 200`. Observe both halves together, as Task 1.11.5 did, so the record says what each instrument reported rather than what the system was doing
- **Restore what you break, and know which restoration expires.** `CORS_ORIGIN` is a platform value that **nothing in a diff will show** — `deploy.yml` uses `update` and never `create`, deliberately — so a value left wrong is a wrong value nobody can see. A backend rollback is `az containerapp update --image <previous digest>` at **43 s**, and **the next merge silently undoes it**; `workflow_dispatch` on `deploy.yml` is a **re-deploy, not a rollback**, because it checks out `main`
- **Confirm the deployed bundle carries the right address.** A build that forgets `VITE_API_BASE_URL` does not fail: it ships a page dialling `http://localhost:3000`, which an HTTPS page blocks as mixed content and which reads to a user as an unreachable backend — the exact state this story's indicator reports, arriving from a cause that has nothing to do with the backend. The variable is a literal in `.github/workflows/deploy.yml`, and that copy is the one that decides what users get. **CI's fingerprint is not the deployed artefact**: `verify` builds without the variable and says so in its own summary. **Task 1.12.4 gave that failure a specific on-screen signature, which is what makes it checkable from a browser rather than only from a build log (2026-09-04):** a client that has never once been answered renders `unreachable` with **"No successful check yet."** rather than a last-success time — so a forgotten variable on a fresh load looks different from a backend that went away mid-session, which shows a time. Read the sentence, not just the word
- **A deployed cold load shows `checking` before it shows anything, and against this environment that is a real interval rather than a flicker (2026-09-04).** The request crosses the public internet to a `minReplicas: 1` container, so the placeholder is on screen for a round trip rather than the sub-millisecond local one — and a load that arrives during the frontend's **non-atomic upload window** may not get as far as a poll at all. Do not read `checking` as a stuck indicator in the first seconds after a deploy; that is the deploy, per the bullet above
- **Correlate one request end to end**, because this is the story that makes it worth doing: the `x-request-id` the browser reads should be the `reqId` in the backend's Log Analytics records for the same request. Task 1.11.5 proved the mechanism with one probe; prove it with a poll
- **Keep the browser tab visible for every reading, and say in the record that you did (2026-09-04).** Task 1.12.3 stops the loop entirely while `document.visibilityState` is `hidden`, so a tab left open behind a terminal or an Azure portal blade **is not polling** — every request-rate figure below, and the correlation above, is taken from a tab you are looking at. This is the same property that makes an automated tab report `hidden`, and it is why the browser smoke check Story 1.13 owns has to deal with it rather than assume a loaded page keeps talking
- **Take the cost reading Story 1.11 could not.** The idle-billing condition is the replica receiving **less than 1,000 bytes per second**; platform probes are not billable and these polls are. Both billing APIs refused the subscription in Task 1.11.8 with _"doesn't have valid WebDirect/AIRS offer type"_ against an environment under six hours old and cost data that lags 8–24 hours. The environment is older now — try again, record what happens either way, and record the request-rate delta against the **1–4 requests per 30 s** probe-only baseline whether or not the billing figure comes back. **The delta is now a prediction to check rather than an unknown**: Task 1.12.3 set the interval at 30 s, so one visible tab adds **one request per 30 s** — at the low end of the platform's own probe traffic, and the arithmetic that made the interval defensible. Confirm it against the log rather than inheriting it, and note the figure is per **visible** tab. **Task 1.12.6 took the local baseline this compares against (2026-09-04): 2 requests and 4 rendered lines a minute per visible tab — 18 lines over 300 s from one tab, 60 over 300 s from three, dividing exactly.** So the deployed delta to expect is **one request per 30 s per visible tab**, against the platform's own 1–4 per 30 s; and if you take it from an automated tab it will read one per **31 s** for the throttling reason above, which is a 3% shortfall rather than a finding
- **The browser smoke check is decided and it is not yours to build — say so rather than deferring silently.** Task 1.11.7 declined a post-deploy check that drives a real browser, with the gap stated: only a real browser catches a wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL`, and `curl` is structurally incapable of it. **This story is the first one capable of shipping that failure**, which is why [Story 1.13](../story-13-end-to-end-browser-testing/STORY.md) now exists and owns building it (Task 1.13.5). What this task owes is the evidence that story is built on: whatever you produce here by hand — the failure, what the browser reported, what `curl` and the log reported at the same moment — is the specification for the check. Record it as such. **Task 1.12.4 made two parts of that specification concrete and they are worth handing over as strings rather than as descriptions (2026-09-04):** the words on screen are the `BackendStatus` members themselves — `healthy`, `degraded`, `unreachable` — plus **`checking`**, which is not a state but the placeholder every page load renders until the first poll settles. A smoke check that asserts on text has to wait past `checking` rather than read it as a failure, and it has to make the tab **visible** first or the loop never starts. **Task 1.12.5 added the rest of the string set and it is worth handing over verbatim (2026-09-04):** the three region labels in the chrome are `Market feed`, `Backend service` and `Market clock`, and the backend's own detail sentences are `No response from the service.`, `The service answered with an error.`, `Something answered at the service's address, and it was not this service.` and `No successful check yet.` — the last of which is the missing-`VITE_API_BASE_URL` signature named above. A check that asserts on the word alone cannot tell the two degraded causes apart, because both render `degraded`. **Task 1.12.6 added three things to that specification by measuring them (2026-09-04).** The `checking` placeholder clears in **50.7 ms** against a local pair, so a check that waits past it needs a timeout generous enough for a public-internet round trip but need not be patient in the healthy case — and against a **dead** backend it holds for the full 5 s deadline, which is the timeout the check actually has to accommodate. **Both non-2xx producers render identically** — a 503 with an `ApiError` body and a 502 with an HTML page both give `degraded` and `The service answered with an error.` — so a check cannot distinguish them and should not try. And **a route change produces no request and never returns the indicator to `checking`**, so a check that navigates can assert continuity rather than re-waiting

## Done when

- All three states have been seen in a browser against the deployed environment, each from a named cause, with the tab visible throughout and the up-to-30-second lag accounted for rather than mistaken for a fault
- Everything broken to produce them has been restored and re-verified, including any platform value that no diff would show
- The correlation id has been followed from a browser to a backend log record
- The cost question has been re-asked and its answer — or its continued refusal — recorded
- The browser smoke check decision is written down with its reason and its own reversal trigger

## Approach note

This is the task where the epic's exit criterion is actually met, and it is the only one in the story that nothing in this repository can check for you. Leave the deployed environment up and correct; the last two criteria of Story 1.11 depend on it as much as this story's do.

## What was measured (2026-09-04)

Every reading below was taken in a browser against the deployed pair, with the tab **visible** throughout — `document.visibilityState` overridden with a `configurable` getter and a `visibilitychange` dispatched, because an automated tab reports `hidden` and the loop is guarded by `isHidden()`. Backend evidence is Log Analytics (`ContainerAppConsoleLogs_CL`), read by `reqId` rather than by eye.

### The three states, each from a named cause

**`healthy`** from the ordinary pair. `BACKEND SERVICE` / `HEALTHY` on the landing route, deep-loaded and after client-side navigation.

**`unreachable`** from a **wrong `CORS_ORIGIN`** — a platform value, so **nothing in a diff shows it**, which is why it was restored and the restoration re-verified rather than remembered. The browser reported `TypeError: Failed to fetch` on six consecutive polls; the indicator read `UNREACHABLE` under `No response from the service.`

**`degraded` / `unreadable-body`** from **`VITE_API_BASE_URL` pointed at the deployed frontend's own origin** — a build-time literal, so it is the one cause here a diff does show. Shipped as [#147](https://github.com/theSmaw/marketpulse/pull/147) and reverted by [#148](https://github.com/theSmaw/marketpulse/pull/148). The client's `/health` came back **200 `text/html`** with `x-request-id: null`, and the indicator read `DEGRADED` under `Something answered at the service's address, and it was not this service.` **This is the first time this story has produced `unreadable-body` from a host this project did not write.**

### The prediction this task owed, confirmed — and it is the opposite of `vite preview`

Task 1.12.6 could only reach `unreadable-body` from a purpose-built impostor, because **`vite preview`'s SPA fallback keys on the `Accept` header** and the `application/json` this client sends gets a 404. **Azure Static Web Apps' `navigationFallback` is a URL-pattern rule and not an `Accept` rule**, checked with `curl` at both `Accept` values _before_ any browser reading:

| path             | `Accept`           | status  | content-type | bytes |
| ---------------- | ------------------ | ------- | ------------ | ----- |
| `/health`        | `application/json` | **200** | `text/html`  | 1101  |
| `/health`        | `text/html`        | 200     | `text/html`  | 1101  |
| `/assets/health` | `application/json` | **404** | `text/html`  | 2400  |
| `/assets/health` | `text/html`        | 404     | `text/html`  | 2400  |

Identical bytes at both `Accept` values. So the state is honestly producible deployed, and there is no CORS obstacle because the request is same-origin. Note the second row pair: **`not-ok-status` is equally reachable deployed** by pointing the client at `<origin>/assets`, since `/assets/*` is excluded from the fallback and returns a real 404 — measured here, and deliberately **not** spent a second deploy on, because Task 1.12.6 already produced that cause from both its producers and found they render identically.

### Two `unreachable` causes have very different cadences, and only one of them is slow

A CORS rejection fails at the **round trip** — 270 / 505 / 479 / 282 / 281 / 764 ms — because the response _arrives_ and the browser discards it. Nothing goes near the 5 s deadline. That is the opposite of Task 1.12.6's hung socket, which fails at 5001 ms and stretches the cycle to 36.00 s. **So `unreachable` is not one latency signature but two**, and an operator timing a failure can tell a refused/blocked response from a hung one without any other instrument.

### The three instruments disagree, and this is the specification for Story 1.13

Taken at the same moment, with `CORS_ORIGIN` wrong:

| instrument                        | reading                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| the browser                       | `TypeError: Failed to fetch`, indicator `UNREACHABLE`, six consecutive failed polls                     |
| `curl` sending the same `Origin`  | **200** with the full body, and `access-control-allow-origin: https://marketpulse-wrong-origin.example` |
| the backend's own log (4 minutes) | **38 requests, every one `statusCode: 200`**, zero errors                                               |

The server asserts the **configured** origin unconditionally — Story 1.8's finding, alive in production — so the browser is the only party that compares, and every piece of server-side evidence says the system is healthy while the product is broken for every user. `curl` is structurally incapable of catching this. That is the whole case for [Story 1.13](../story-13-end-to-end-browser-testing/STORY.md)'s browser smoke check, and this table is its acceptance criterion.

### Both "never been answered" and "was answered once" signatures, from one cause

- an **established** session held `Last confirmed 09:02:38` across **six** failed polls — neither cleared nor advanced to a failed attempt
- a **fresh load** during the same outage read `No successful check yet.`

So the missing-`VITE_API_BASE_URL` signature and the backend-went-away signature are distinguishable on screen, which is what makes them worth asserting separately. Throughout, the rest of the interface stayed usable: four navigation links, the route rendered (`Security Explorer`), and **zero error fallbacks anywhere**.

### Recovery, deployed, with no reload

`CORS_ORIGIN` restored → poll failed 01:10:54, failed 01:11:26, **succeeded 01:11:57** (`a149a660-361c-4ac3-b704-5fad61928268`) and the indicator returned to `HEALTHY`. `performance.getEntriesByType('navigation').length` was **1** and `timeOrigin` unchanged, so it was the running page and not a reload. A second tab, which had never once been answered, recovered in the same window.

### The correlation id, followed from a browser to a log record — from a poll, not a probe

`window.fetch` was wrapped so the **poll's own** response headers were captured. All three ids were found in Log Analytics as `reqId`, each as an `incoming request` / `request completed` pair:

| `x-request-id` read in the browser     | revision    | `responseTime` |
| -------------------------------------- | ----------- | -------------- |
| `f529c75f-4660-4c1b-a0a0-2941e4974bfe` | `--0000034` | 0.3207 ms      |
| `8f69efbc-4ada-4224-aae3-1c54a690d967` | `--0000035` | 0.5458 ms      |
| `850fcc50-2658-463c-af6f-707f8c4ab5d4` | `--0000035` | 0.6119 ms      |

Note the revision column: **polls 1 and 2 straddle a revision rollover** and neither failed.

### The poll's cost, deployed — measured as a step function rather than inherited

Requests per 30 s in the backend's own log, one continuous series, tabs added one at a time:

| window (UTC)        | visible tabs | requests / 30 s  |
| ------------------- | ------------ | ---------------- |
| 01:43:30 – 01:44:30 | **0**        | 4, 4, 4          |
| 01:45:00 – 01:47:30 | **1**        | 5, 5, 5, 5, 5    |
| 01:48:00 – 01:50:30 | **2**        | 6, 6, 5, 6, 6, 6 |

**The probe-only baseline is a precise and explainable 4 per 30 s**, which refines Task 1.11.7's "1–4": the liveness probe is `periodSeconds: 30` (1) and the readiness probe `periodSeconds: 10` (3). **One visible tab adds exactly +1 per 30 s**, which is the arithmetic that made `HEALTH_POLL_INTERVAL_MS = 30_000` defensible, now confirmed against the log. The single `5` at 01:49:00 is not a lost request: it is the **31.00 s** automated-tab cycle drifting across a 30 s bin boundary, which is Task 1.12.6's instrument effect visible in the data.

The cycle itself reproduced deployed at **31.15 / 30.86 s** settle-to-settle (mean 31.00 s), and the round trip at **262–768 ms**.

### Two placeholder figures, and the trap that makes them worth having

- **A tab hidden at mount made 0 `/health` requests in 4.65 s** and sat on `CHECKING` — Task 1.12.5's property confirmed against the deployed environment. A page opened in a background tab is indistinguishable from broken wiring.
- Once visible, the placeholder cleared in **283.2 ms**, of which **267 ms** was the round trip — against **50.7 ms** on a local pair. So on this environment `checking` is a real interval rather than a flicker, and a smoke check waiting past it needs a public-internet allowance, with the **5 s deadline** as the figure it must actually accommodate against a dead backend.

### A full deploy of both halves is invisible to a running page

Across one complete pipeline deploy — backend revision **34 → 35** rollover _and_ the frontend upload — an open page made **14 polls with 0 failures** and never left `healthy`, on one navigation entry with `timeOrigin` unchanged.

### The non-atomic upload window did not appear, and the reason is a correction

The CDN was polled every 0.4 s for the whole of `Deploy the frontend`: **174 consecutive samples, every one `doc=200`, the referenced asset unchanged and 200 throughout, zero broken states.** Task 1.11.7 records a ~2 s window holding two distinct broken states, reproduced across four deploys.

The difference is the artefact. That merge shipped **no source**, so the Linux build reproduced byte-identically and the hashed filenames did not change — there was no _incoming_ asset to be missing and no _outgoing_ one to withdraw; the upload replaced files with identical bytes at identical names. **So the window is a property of the artefact changing, not of deploying.** The probe deploy, which did change the bundle (`index-CL7CW2na.js` → `index-SSKhEFDu.js`), was not polled at that resolution, so this is the mechanism explaining an observation rather than a re-test of the window itself — recorded that way deliberately.

### Artefact figures, and the restoration proved by bytes

| build                      | bundle              | bytes   | md5         | `index.html` md5 |
| -------------------------- | ------------------- | ------- | ----------- | ---------------- |
| deployed, before the probe | `index-CL7CW2na.js` | 348,196 | `e1f2daff…` | `4caaf62f…`      |
| the probe                  | `index-SSKhEFDu.js` | 348,169 | `eea8982c…` | `387e4193…`      |
| deployed, after the revert | `index-CL7CW2na.js` | 348,196 | `e1f2daff…` | `4caaf62f…`      |

The revert reproduced the pre-probe bytes **exactly**, which is a better restoration check than re-reading the workflow file. Two recorded facts held: the deployed bundle is **348,196 B against a local default build's 348,124 B**, reproducing the **72-byte** `VITE_API_BASE_URL` divergence to the byte; and **`index.html` is 1,101 B in all three rows at two different hashes**, because it carries the hashed script filename — a size comparison reports it unchanged and it is not.

### The cost question: still no figure, and the refusal has changed shape

That change is the finding, because Task 1.11.8's stated cause is no longer what happens:

- `az consumption usage list` now returns **`[]` at exit 0** — not the _"doesn't have valid WebDirect/AIRS offer type"_ refusal reproduced six times in Task 1.11.8
- the Cost Management query API answers **`429 Too Many Requests`**, on three attempts spread over ~40 minutes
- `az costmanagement` is not a recognised command without an extension

So whether continuous probing breaks the Consumption plan's idle-billing condition is **still open**, and it stays owned by Epic 2 and re-taken by Epic 3. What _is_ answerable is the arithmetic, re-derived from the Retail Prices API rather than cited, and it reproduces Task 1.11.8 **to the cent**:

| line                           | idle      | active     |
| ------------------------------ | --------- | ---------- |
| replica (0.25 vCPU / 0.5 GiB)  | $4.21     | $14.04     |
| ACR Basic (`$0.1666`/day × 30) | $5.00     | $5.00      |
| **total**                      | **$9.21** | **$19.04** |

after the free grant of 180,000 vCPU-seconds and 360,000 GiB-seconds (468,000 and 936,000 billable of 648,000 and 1,296,000). The **$20 budget** with alerts at **50 / 80 / 100%** was re-read and is in place — still sitting just **above** the active-rate total, so it would not fire on the change that matters most. The deployed poll adds **1 request per 30 s per visible tab** against a 2-million-request monthly allowance and a 4-per-30-s probe baseline it does not exceed; health-probe requests are not billable and these are.

### The browser smoke check: decided, and not this task's to build

Task 1.11.7 declined it and named the gap. **Story 1.12 is the first story capable of shipping that failure**, which is why [Story 1.13](../story-13-end-to-end-browser-testing/STORY.md) exists and owns building it as Task 1.13.5. Saying so here rather than deferring silently is what this task owed. What it hands over is the specification, in strings rather than descriptions:

- the states are `healthy`, `degraded`, `unreachable`, plus **`checking`**, which is not a state but the placeholder every load renders until the first poll settles — a check must wait past it, not read it as a failure
- the region labels are `Market feed`, `Backend service`, `Market clock`
- the detail sentences are `No response from the service.`, `The service answered with an error.`, `Something answered at the service's address, and it was not this service.` and `No successful check yet.`
- **it must make the tab visible first**, or the loop never starts and the page sits on `checking` forever — 0 requests in 4.65 s, measured here
- the two `degraded` causes render the same **word** and different **sentences**; a check asserting on the word alone cannot tell them apart, and should not try
- its acceptance criterion is the three-instrument table above: green `curl`, green log, broken product

**Reversal trigger for the shape of that check:** if it ever needs to distinguish the two `degraded` causes or a `requestId`, that is a new named prop on the indicator, never a widening of what is rendered today.

## Done

- [x] All three states seen in a browser against the deployed environment, each from a named cause, tab visible throughout, the up-to-31-second lag accounted for
- [x] Everything broken restored and re-verified — `CORS_ORIGIN` by re-reading the platform and the live `access-control-allow-origin`, `VITE_API_BASE_URL` by the deployed bundle returning to its pre-probe bytes
- [x] The correlation id followed from a browser to a backend log record, three times, from polls rather than probes
- [x] The cost question re-asked; its continued refusal recorded, along with the fact that the refusal changed shape
- [x] The browser smoke check decision written down with its owner, its specification and its reversal trigger
