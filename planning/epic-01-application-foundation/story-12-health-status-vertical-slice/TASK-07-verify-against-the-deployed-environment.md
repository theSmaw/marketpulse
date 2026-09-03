# Task 1.12.7 — Verify the slice against the deployed environment, including the states you cannot fake there

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.6

## Objective

Meet the criterion that says "not only locally". Deploy the slice, watch it work from a browser against the live environment, and produce degraded and unreachable there by causes the platform does not heal around.

## Work

- **Merge and let the pipeline deploy it.** There is no preview environment and there deliberately never will be one on this plan: `CORS_ORIGIN` holds exactly one string, and a wildcard admitting previews would admit every Static Web App in the region — so a preview is a page that loads perfectly and cannot call the backend. This story's deployed verification happens against the live environment on a branch that has already merged
- **Poll after the deploy; do not check once.** The frontend's upload is not atomic and the window opens **at the exact second the deploy step reports success**: ~2 seconds holding two distinct broken states — the incoming document served before the incoming asset exists, then the outgoing asset withdrawn while the outgoing document is still served — reproduced across four deploys and accepted deliberately. Treat a failure in the first few seconds after a deploy as the deploy, not as this story's code
- **You cannot produce "unreachable" by breaking the deployment, and that is measured rather than assumed.** Four failure classes were made to happen against the live environment in Task 1.11.7 and **no request ever returned a non-200 through any of them**, with `uptimeSeconds` never resetting — the failing revision holds `trafficWeight: 100` while the previous one at weight 0 keeps serving. To exercise the states you need a cause the platform does not heal around: a wrong `CORS_ORIGIN`, a wrong `VITE_API_BASE_URL`, or a rolled-back backend
- **Two of those three are invisible to every piece of server-side evidence.** With a wrong `CORS_ORIGIN` the browser reports `TypeError: Failed to fetch`, `curl` with the same `Origin` gets a 200 with a full body, and the log records `statusCode: 200`. Observe both halves together, as Task 1.11.5 did, so the record says what each instrument reported rather than what the system was doing
- **Restore what you break, and know which restoration expires.** `CORS_ORIGIN` is a platform value that **nothing in a diff will show** — `deploy.yml` uses `update` and never `create`, deliberately — so a value left wrong is a wrong value nobody can see. A backend rollback is `az containerapp update --image <previous digest>` at **43 s**, and **the next merge silently undoes it**; `workflow_dispatch` on `deploy.yml` is a **re-deploy, not a rollback**, because it checks out `main`
- **Confirm the deployed bundle carries the right address.** A build that forgets `VITE_API_BASE_URL` does not fail: it ships a page dialling `http://localhost:3000`, which an HTTPS page blocks as mixed content and which reads to a user as an unreachable backend — the exact state this story's indicator reports, arriving from a cause that has nothing to do with the backend. The variable is a literal in `.github/workflows/deploy.yml`, and that copy is the one that decides what users get. **CI's fingerprint is not the deployed artefact**: `verify` builds without the variable and says so in its own summary
- **Correlate one request end to end**, because this is the story that makes it worth doing: the `x-request-id` the browser reads should be the `reqId` in the backend's Log Analytics records for the same request. Task 1.11.5 proved the mechanism with one probe; prove it with a poll
- **Take the cost reading Story 1.11 could not.** The idle-billing condition is the replica receiving **less than 1,000 bytes per second**; platform probes are not billable and these polls are. Both billing APIs refused the subscription in Task 1.11.8 with _"doesn't have valid WebDirect/AIRS offer type"_ against an environment under six hours old and cost data that lags 8–24 hours. The environment is older now — try again, record what happens either way, and record the request-rate delta against the **1–4 requests per 30 s** probe-only baseline whether or not the billing figure comes back
- **The browser smoke check is decided and it is not yours to build — say so rather than deferring silently.** Task 1.11.7 declined a post-deploy check that drives a real browser, with the gap stated: only a real browser catches a wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL`, and `curl` is structurally incapable of it. **This story is the first one capable of shipping that failure**, which is why [Story 1.13](../story-13-end-to-end-browser-testing/STORY.md) now exists and owns building it (Task 1.13.5). What this task owes is the evidence that story is built on: whatever you produce here by hand — the failure, what the browser reported, what `curl` and the log reported at the same moment — is the specification for the check. Record it as such

## Done when

- All three states have been seen in a browser against the deployed environment, each from a named cause
- Everything broken to produce them has been restored and re-verified, including any platform value that no diff would show
- The correlation id has been followed from a browser to a backend log record
- The cost question has been re-asked and its answer — or its continued refusal — recorded
- The browser smoke check decision is written down with its reason and its own reversal trigger

## Approach note

This is the task where the epic's exit criterion is actually met, and it is the only one in the story that nothing in this repository can check for you. Leave the deployed environment up and correct; the last two criteria of Story 1.11 depend on it as much as this story's do.
