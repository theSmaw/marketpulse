# Task 1.12.8 — Verify, document, and record ADR 0012

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.7

## Objective

Close the story the way every Epic 1 story has been closed: re-running every criterion and re-taking every figure from a clean tree rather than inheriting them. **Closing the epic is not this task's** — Story 1.13 was added after this split and is the epic's last story, so Task 1.13.6 owns the exit criteria.

## Work

- **Re-run all six acceptance criteria against the shipping tree and the deployed environment.** Re-take every figure rather than citing one. The record across ten stories is that the half that is cheap to check has never been wrong and the half that cannot be checked has been wrong nearly every time it is read
- **Write `docs/adr/0012-*`.** It is the twelfth and it should record what this story decided rather than what it built: the client-side status vocabulary and why it is not `HealthStatus`; what "degraded" means and why that definition and not another; one indicator or two; how much of a `requestId` a user sees; the polling interval and the three costs behind it; and what a green indicator does and does not certify — which is the same shape as ADR 0010's "what the tick certifies" and is the honest framing here, because every state in this story is a client-side conclusion
- **Update `CLAUDE.md` and `README.md` together.** `README.md` documents what a correct first run looks like and names five things that read as faults and are not — the `DISCONNECTED` feed indicator among them. This story changes at least one of those five, and possibly what the list means. `CLAUDE.md`'s artefact paragraph, its test counts, its `pnpm verify` timings and its coverage table all move
- **Run the duplicated-sentence sweep, and run it with a `grep` rather than from memory.** Two stories have now found this class of drift: Task 1.9.7 found a warning standing in **thirteen** places rather than the three that were recorded, and Task 1.10.8 found **eight** copies of a claim that had been false since Task 1.10.5 and amended only in the copy being edited. The eleven "Conventions from Story 1.1" blocks are the usual site, and they are not eleven copies of one sentence — nine are byte-identical and Stories 1.2 and 1.3 carry their own historical strike-throughs, so compare hashes rather than diffing. Strike through rather than delete
- **Sweep for claims this story falsified**, and expect them where a story wrote "Story 1.12 will". Candidates named in the story files: `AppHeader`'s hard-coded `feedStatus="disconnected"` comment; `health-probe.ts`'s and `main.tsx`'s own deletion notes; `report-error.ts`'s window-listener trigger; the `ignore: "reqId,pid"` lever; the "fifteen error-level rules have never fired on shipped code" claim, in every place it stands; and the `verify`-gap entry that says the frontend's variable pair is one variable long and the two agree
- **Check the epic's fourth exit criterion — "backend health/status can be viewed from the frontend" — against the tree rather than against this story's status, and record it as met on the evidence.** It is the criterion this story exists for and the last of the four to close. Checking all four and closing the epic is **Task 1.13.6's**, and it will read what you write here rather than re-deriving it
- **Hand over deliberately, and there are now two audiences.** The connection-state pattern this story establishes is what Epic 3 reuses for the live market feed, and the open questions it leaves — the idle-billing condition, whether the interval survives contact with several tabs, whether `FeedStatus` and this vocabulary stay separate — belong written down where the next epic will meet them. **Story 1.13 is the nearer audience**: its whole justification is the failure this story makes shippable, so the evidence Task 1.12.7 gathered by hand is what it builds its check against
- Re-run the full chain from a **clean clone** with an empty pnpm store, as every closing task in this epic has: install, `pnpm verify`, the per-step split, the artefact hashes, and the test counts across all four suites

## Done when

- All six criteria are met, each re-verified rather than inherited, with the deployed evidence separate from the local evidence
- `docs/adr/0012-*` exists and records decisions rather than a changelog
- `CLAUDE.md` and `README.md` agree with the tree, and the duplicated-sentence sweep has been run with a `grep` and its count recorded
- The epic's fourth exit criterion is checked against the tree and recorded with its evidence
- `pnpm verify` passes from a clean clone, the pipeline is green, and the deployed environment is up and correct

## Approach note

Every closing task in this epic has found at least one recorded claim that had stopped being true, and the ones that were found were found by re-measuring rather than by reading. Task 1.11.8 found three, including a paragraph that contradicted itself two sentences apart and an arithmetic error of a factor of about 35. Budget for finding some here; the cheapest place to find them is the task that is looking.
