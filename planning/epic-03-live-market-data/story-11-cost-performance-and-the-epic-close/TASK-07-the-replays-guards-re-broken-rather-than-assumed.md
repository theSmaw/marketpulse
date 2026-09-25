# Task 3.11.7 — The replay's guards, re-broken rather than assumed

**Status:** **Complete — 2026-09-25. Four mechanisms broken and proved red; the fifth could not be broken, because it had never been built.** ADR 0030 §7b — _a deploy READS the configured provider and refuses to roll on the wrong one_, and **the only preventive guard among the five** — was described in the present tense on 2026-09-16 and quoted by `docs/GAPS.md` as _the only preventive mechanism_, and **no such step existed in `deploy.yml`**. It exists now, asserts both of §7e's keys, and has an invariant and a break. Criterion 11's three conditions were read from a **named workflow run**; condition 3 did not go red, and the reason is not the grace.
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

---

## What was done — 2026-09-25

### Four reds, and a fifth that could not go red

| Mechanism                   | Break                                  | Result                                                    |
| --------------------------- | -------------------------------------- | --------------------------------------------------------- |
| 7a-bis, the startup refusal | `non-live-data-refused-at-startup`     | red → restored byte-identical                             |
| 7a, the default             | `market-data-default-is-none`          | red → restored byte-identical                             |
| 7f, no replay in a session  | `replay-refuses-during-a-session`      | red → restored byte-identical                             |
| the store's own guard       | `replayed-series-refused-by-the-store` | red → restored byte-identical (against a real PostgreSQL) |
| **7b, the deploy's read**   | **there was no entry, and no step**    | **see below**                                             |

> **A naming correction first, because it bit while reading.** This task's own
> table above calls the in-session refusal **7d**. In ADR 0030 that is **7f**;
> **7d is the daily scheduled probe**, which exists as
> `.github/workflows/probe-deployed.yml` with `cron: "0 13 * * *"`. Nothing was
> mis-built — the task file was written from memory of the ADR rather than from
> the ADR.

### 7b had never been built, and two documents said it had

**The task said _break all four and prove each red_. 7b cannot be broken,
because there was nothing there to break.**

ADR 0030 §7b, written 2026-09-16:

> So the gate **reads and asserts** rather than sets […] `az containerapp show`
> before the image rolls, and the deploy **fails if the configured provider is
> anything but `alpaca`**. This is the only one of these mechanisms that is
> genuinely **preventive** — the wrong configuration never serves a request.

**`deploy.yml` contains no such step.** Its 26 steps were read by name; the one
`az containerapp show` in the file is the revision-running wait. `grep -i` for
`MARKET_DATA_PROVIDER` across `.github/` returns one hit, in `backfill.yml`,
setting it for a backfill run.

**And `docs/GAPS.md` entry 9 quoted it** — _"The only preventive mechanism is
`deploy.yml`'s provider read (ADR 0030 §7b)"_ — which is the sentence a reader
consults when they want to know what is **not** covered.

> **This is `the-close-outruns-the-rehearsal`'s defect again**, and that break's
> own `proves` text names it: _a claim about a mechanism reads identically
> whether the mechanism is there or not._ Nothing here was careless — the ADR
> was written alongside the work, the step was simply never added, and
> everything downstream inherited the assertion and compounded it. **Twice now
> in one epic**, which makes it a pattern rather than an incident.

### What was built

`deploy.yml` gains **`Read the configured provider, and refuse to roll on the
wrong one`**, before the image rolls:

- it **reads and asserts, never sets** — the step below it argues at length
  that a deploy restating the app's environment would be a second definition
  of its configuration, and §7b was corrected before it merged for exactly
  that reason
- it asserts **both** of §7e's keys, which is one thing stronger than the ADR's
  own text: a replay needs two deliberate values, and checking one leaves the
  pair half-guarded
- `MARKET_DATA_PROVIDER` must be `alpaca`; `NON_LIVE_MARKET_DATA` must not be
  `permitted`; either failure is an `::error::` naming the ADR section

Beside it, because a workflow step is invisible to everything in `pnpm verify`:

- **`pnpm invariants` gains `the-deploy-reads-the-provider`** (27 now hold),
  asserting the step's three load-bearing strings
- **`scripts/breaks.mjs` gains `the-deploy-stops-reading-the-provider`**, which
  **weakens the comparison rather than deleting the step** — a step that still
  exists, still runs, still prints the provider and passes on every value is
  the shape the real regression takes. Proved red and restored.

### Criterion 11 — read from a run, not from the script

**Run `36095226231`**, `check-deployed` job, 2026-09-25T04:41:20Z, the deploy of
revision `0000350`:

```
✓ feed  …/diagnostics/feed  market closed; provider=alpaca status=live observedAt=null
```

All three of `probeFeed`'s conditions executed. **Condition 1** (replay at any
hour) passed on a real reading rather than on a unit test. **Condition 2** did
not apply — market closed. **Condition 3**, shipping for the first time, did
**not** go red.

**And the reason it did not is worth more than the pass.** Task 3.11.6 measured
the overlap at **45.8 s / 46.5 s**; the grace was **20 s**. The check survived
because the probe arrives _long after_ the overlap ends:

| Run           | Backend `up` at the probe | Overlap ended | Margin |
| ------------- | ------------------------- | ------------- | ------ |
| `36094213387` | 98.9 s                    | 45.8 s        | ~52 s  |
| `36095226231` | 92.3 s                    | 46.5 s        | ~46 s  |

**That margin is the frontend build and deploy sitting between the rollout and
the check.** It is a side effect of how long an unrelated step takes, and it is
not a thing to rest a guard on: a faster frontend deploy is a red check on a
healthy rollout.

**So the repair 3.11.6 predicted was taken, on the evidence rather than on the
prediction.** `DISCONNECTED_GRACE_MS` is **60,000** — the measured overlap with
headroom — and its comment now cites the measurement it is actually derived
from. The old comment named 9,498 ms, the _outgoing_ socket's close: a figure
with a provenance line, of the wrong thing.

> **And the constant has no test.** 3.11.3's amendment said the grace was
> "unproven outside a unit test"; `grep` for `probeFeed` and
> `DISCONNECTED_GRACE` across the tree returns **one file, the script itself**.
> `probeFeed` takes injectable `now` and `sleep`, so a test was intended. Not
> written here — the exercise that matters is a real deploy, and this task has
> two of those.

### The count this task owes

- **82 break entries** in the registry today; **16** existed on 2026-09-16, so
  **66 were added during Epic 3.**
- **Performed in this task: five** — the four ADR 0030 mechanisms that existed,
  plus the one written today.
- **Criterion 3 as worded — _every break this epic added has been performed at
  least once since it was written_ — is NOT met by this task and cannot be.**
  66 breaks, most of which rebuild the workspace and several of which need a
  database or a browser, is well over an hour of wall time. The convention is
  that each was run by the task that added it (`CLAUDE.md`: _a check you add
  owes a break_), and `pnpm invariants`' `every-break-can-still-land` covers
  the half that rots. **Task 3.11.10 already owns the rest by name** — _"Every
  `pnpm break` this epic added performed — Task 3.11.7 will have done the
  replay guards; this covers the rest"_ — and now has a figure for what it is
  taking on.

### Gates

`pnpm links` green (432 documents, 1,568 links). `pnpm invariants` green at
**27**. Five breaks performed, five reds, five byte-identical restorations.
`pnpm verify` on the branch.

## For a stakeholder — a status report, 2026-09-25

### What this was

The one promise this product makes absolutely is that it never shows anybody
invented prices. Five separate mechanisms enforce it. **This task's job was not
to check that they are there — it was to break each one on purpose and confirm
the alarm actually goes off.**

That distinction has earned its keep here before: a check that has never failed
has never been tested.

### Four alarms rang. The fifth was not wired.

Four of the five went red exactly as they should, and the tree was restored
byte-for-byte afterwards.

**The fifth could not be broken, because it did not exist.** Our decision record
has said since September 16th that the deployment pipeline reads the live
configuration before shipping and refuses to ship if it is set to anything but
the real market. It says so in the present tense. **No such step was ever
written.**

Worse, our own register of _things nothing checks_ cited that step as the one
protection that stops a problem rather than merely reporting it after the fact.
So the document whose job is to list what is unguarded was, on this point,
guarding nothing and saying otherwise.

**It is built now**, and it is slightly stronger than the description: starting
a replay needs two settings, and the new step checks both. It also has a
self-test and a rehearsed alarm, so the next person who reads that sentence is
reading about a mechanism rather than an intention.

> **The uncomfortable part is that nothing went wrong here.** The record was
> written alongside the work by somebody doing it properly; one step was simply
> never added; and every document downstream repeated the claim in good faith.
> That is the second time this week — and the reason we keep testing alarms by
> setting them off.

### A near miss, found by reading rather than by failing

A check we shipped yesterday fails the deployment if the market feed is
disconnected. It allows a **20-second** grace while a new copy takes over from
the old one.

Yesterday we measured what that handover actually costs: **46 seconds.**

The check has not complained on either of the two deployments since — and when
we read _why_, it was not the grace. The probe simply arrives about 45 seconds
after the feed is already back, because building and shipping the web front-end
sits in between. **We were being saved by how long an unrelated step takes.**
Make that step faster and a perfectly healthy deployment starts failing its own
check, which is how a useful alarm becomes one people ignore.

The grace is now 60 seconds, derived from the measurement rather than from the
wrong one.

### Where the product stands

**Seven of ten tasks in the final story.** What is left is one sitting with the
market open, the documents, and the close.
