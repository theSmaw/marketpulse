# Task 3.11.7 — The replay's guards, re-broken rather than assumed

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

Criteria 10 and 11 — **the one place in this epic where a missed check is a user
being misled rather than a developer being inconvenienced.**

## What the user can see when this lands

**Nothing**, and what it protects is the only thing production promises
absolutely: that it never shows anybody invented data.

## The four mechanisms ADR 0030 rests on

| #   | The mechanism                                                                | Where               |
| --- | ---------------------------------------------------------------------------- | ------------------- |
| 7a  | **The deployed site never replays, at any hour**                             | configuration       |
| 7b  | a deploy configured to replay **fails before it rolls**                      | `deploy.yml`        |
| 7c  | `check-deployed.mjs` fails after every merge if production is ever replaying | post-merge          |
| 7d  | **a replay refuses to run while the market is open**                         | the replay provider |

Plus the store's own guard: **a replayed series cannot reach `market_bars`.**

## The rule this task exists to apply

> **A check that has not gone red this epic has not been tested this epic.**

And its corollary, which this repository has produced four times:
**a break that does not go red is not evidence the check works** — it is equally
evidence the break did not land. Verify the substitution.

**Four breaks rotted silently on 2026-09-21** — two when a call gained a third
argument and Prettier wrapped it, two when the CSS they targeted moved into a
shared layer, and **every run was green throughout**. `pnpm invariants` now
carries `every-break-can-still-land`, which asserts the text is still there and
**not** that the substitution still expresses the defect. That second half is
what this task does by hand.

## Criterion 11's particular shape

It is not _does the assertion exist_ — it is **has it run**. `check-deployed.mjs`
runs after every merge, so the evidence is a workflow run rather than a file.
**Read a real run's output**, not the script.

## Work

- All four ADR 0030 mechanisms broken by hand, each proved red, each restored
- The `market_bars` guard broken and proved red
- `check-deployed.mjs`'s replay assertion located in a **real run's log**, with
  the run named
- Any break whose substitution no longer expresses its defect repointed and
  re-run
- The count recorded: how many of the breaks in `scripts/breaks.mjs` this epic
  added, and how many were actually performed in this task

## Done when

1. Five mechanisms, five reds, five restorations
2. A named workflow run shows the deployed replay assertion executing
3. Every break this epic added has been performed at least once since it was
   written
