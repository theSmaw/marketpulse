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

## Amended by Task 3.11.3 — 2026-09-25: `check-deployed.mjs` gained a condition that has never run in production

**Criterion 11's shape is unchanged and its subject is one condition wider.**
`probeFeed` now holds three rather than two:

1. `replay` fails at **any hour**, in the provider or the feed — ADR 0030 §7c,
   and the one this task was written for
2. while the market is **open**, the feed must be a connected `iex`
3. **`disconnected` fails at any hour** — new on 2026-09-25, with a **20-second
   grace** for the deploy handover, and only that verdict is retried

**Condition 3 has never run against production.** Its first execution is the
merge that ships it, and two things about it are unproven outside a unit test:

- **whether the 20 s grace is enough.** It is derived from a measured handover —
  1,149 ms to the `406`, 9,498 ms to the close, retried every 3 s — and doubled.
  **If it is short, the deploy check goes red on a healthy rollout**, which is
  the cry-wolf this epic has avoided three times elsewhere and would be worse
  here, because a check that fails on the routine case gets ignored rather than
  fixed.
- **whether `disconnected` out of hours is really a fault.** It rests on §9.3 —
  the deployment holds the socket always — confirmed by exactly **one** reading
  at 2026-09-25T03:13Z. One sample is a sample.

**So criterion 11's _has it run_ now means three conditions rather than one**,
and this task reads a **real workflow run's output** for all three rather than
reading the script. If condition 3 went red on a healthy deploy, that is a
finding for this task and a repair for Task 3.11.3's grace, not a reason to
weaken the condition.
