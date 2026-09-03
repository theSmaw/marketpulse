# Task 1.13.5 — Build the post-deploy browser check Task 1.11.7 declined

**Status:** Not started
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.4

## Objective

Close the gap Task 1.11.7 named and could not fill: a check that drives a real browser against the deployed environment, because `curl` is structurally incapable of catching the two failures that matter most.

## Work

- **Read the declined decision before rebuilding it.** Task 1.11.7 declined this check on grounds that were correct then — nothing could yet produce the failure — and named Story 1.12 as the trigger. Story 1.12 produces it. State plainly which part of the original argument has changed and which part still stands, rather than treating the decline as an oversight
- **The two failures this exists for are both invisible to every other instrument.** A wrong `CORS_ORIGIN`: the browser reports `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a **200 with a full body** and the log records `statusCode: 200`. A missing `VITE_API_BASE_URL`: the build does not fail, it ships a page dialling `http://localhost:3000`, which an HTTPS page blocks as mixed content and which reads to a user as an unreachable backend — from a cause that has nothing to do with the backend. **Both must be made to happen and caught**, not reasoned about
- **Poll; do not check once.** The frontend's upload is not atomic and the window opens **at the exact second the deploy step reports success** — ~2 seconds holding two distinct broken states (the incoming document served before the incoming asset exists, then the outgoing asset withdrawn while the outgoing document is still served), reproduced across four deploys and accepted deliberately. A check that fires immediately and once will be red for a reason that is not a defect, which is the fastest way to teach everyone to ignore it
- **Decide what a red result is _for_, because by the time it fires the code has shipped.** There is no preview environment and there deliberately never will be one on this plan, so this runs after a merge, against the live environment. Its output is a rollback decision, and rollback is asymmetric: the backend is `az containerapp update --image <previous digest>` in **43 s** and **the next merge silently undoes it**, while the frontend has no revision history at all and its rollback is a revert commit at **3 min 42 s**. Note also that `workflow_dispatch` on `deploy.yml` is a **re-deploy, not a rollback** — it checks out `main`
- **A check that runs from one machine over one link cannot tell its own network from the environment.** Task 1.11.7 produced a 65-second "outage" that was the laptop, and disproved it with a three-host control and the backend's own log records. A red result here is a claim about the environment; decide what evidence it must carry before it makes one, and whether a single failure is enough to act on
- **Count what it costs the environment, not just the runner.** The idle billing rate — the difference between ~$9.21 and ~$19.04 a month — is conditional on the replica receiving **less than 1,000 bytes per second**, platform probes are not billable and these requests are, and the idle baseline is **1–4 requests per 30 s** against 16 log records a minute. A check that runs once per merge is negligible; one on a schedule is a decision with a bill attached
- **Do not let it become a monitor.** Uptime monitoring is not this story's and nothing in this epic owns it; a post-deploy check that grows a schedule has quietly become one. If that is wanted, it is a decision with an owner, not a cron line added here
- **Restore everything you break and re-verify.** `CORS_ORIGIN` and the app's other live settings exist **only in the platform** — `deploy.yml` uses `update` and never `create`, deliberately — so a value left wrong is a wrong value that no diff will ever show

## Done when

- A browser-driven check runs against the deployed environment after a deploy, polling rather than checking once
- Both of the failures `curl` cannot see have been produced deliberately and caught, with the server-side evidence recorded beside each to show what it looked like from the other side
- Everything broken has been restored and re-verified, including every platform-only value
- What a red result means, and what should be done about it, is written where the person seeing it will look
- The deployed environment is up and correct, and the pipeline is green

## Approach note

This is the one check in the repository that can fail for a reason nothing else can see, and also the one most likely to be flaky, expensive and ignored. Both facts are true at once. The decision to build it is not "browser checks are good" — it is that Story 1.12 shipped a specific failure mode with no instrument, and this is the instrument.
