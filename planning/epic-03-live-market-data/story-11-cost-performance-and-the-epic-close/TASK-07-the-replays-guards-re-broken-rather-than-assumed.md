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

## Amended by Task 3.11.6 — 2026-09-25: condition 3's grace is measured now, and it is SHORT

**Task 3.11.3's amendment above says condition 3's 20-second grace is derived
from a measured handover — 1,149 ms to the `406`, 9,498 ms to the close — and
doubled, and that whether it is enough is unproven outside a unit test.**

**It is now proven, and the answer is no.** Task 3.11.6 read the handover from
production's own stream log on two consecutive deploys:

| Revision  | First `406`  | `authenticated` | Gap        |
| --------- | ------------ | --------------- | ---------- |
| `0000349` | 04:25:09.917 | 04:25:55.718    | **45.8 s** |
| `0000350` | 04:39:48.992 | 04:40:35.528    | **46.5 s** |

**The arriving replica is `disconnected` for about 46 seconds of every deploy,
and `DISCONNECTED_GRACE_MS` is 20,000.** The figure the grace was doubled from
was the _outgoing_ socket's death — 9,498 ms to the close — which is the right
number for a different question. What condition 3 actually races is the
**platform's revision-overlap schedule**, and that is ~46 s.

**So the cry-wolf this task was told to watch for is not a risk, it is an
arithmetic near-certainty whenever `check-deployed.mjs` probes inside the
overlap** — which is exactly when it runs, because it runs as soon as the
container app deploy step reports success.

### What this task does with it

- **Read the real run first, as already instructed.** If condition 3 has not
  gone red, say so and say why — the probe may simply arrive after the overlap,
  and that is a fact about timing worth recording rather than assuming.
- **If it has gone red on a healthy deploy, the repair is the grace, not the
  condition.** 3.11.3's amendment already ruled: _a finding for this task and a
  repair for Task 3.11.3's grace, not a reason to weaken the condition._ The
  honest floor is now **the measured overlap** rather than the outgoing
  socket's close — around 60 s with headroom, and the comment above
  `DISCONNECTED_GRACE_MS` must be rewritten, because it currently cites the
  wrong measurement for the right constant.
- **A break owes a re-run either way.** Changing the constant moves text
  `scripts/breaks.mjs` may pin.

> **The general shape is one this epic keeps producing**: the constant was not
> guessed, it was derived from a measurement — of the wrong thing. A figure
> with a provenance line reads as safe, and the provenance is what needed
> checking.
