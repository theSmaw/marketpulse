# Task 5.3.5 — The Sweeps & the Close

**Status:** Complete — 2026-10-15 — the conjunct this task owed was **proved green on its own defect first**: the file Story 5.5 will write passed with `59 invariants hold.` before it existed. Nine of ten criteria met, and **AC 10 is recorded as not met** rather than discharged with a laptop figure
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.4

## Objective

**A collection of completed tasks is not automatically a completed story**, and
this one falsified more governing text than any story in the epic so far.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **Every acceptance criterion verdicted**, with an instrument and a kind —
  **and ACs 3, 4 and 5 verdicted AS AMENDED, with the originals quoted**,
  because the owner changed all three at Gate 1 and a close that quietly
  verdicts the amended form destroys the record of what was asked for.
- **The fourth conjunct of `one-home-for-the-observation-window`, which is owed
  and is NOT what the hand-off said.** Story 5.2's close told this story the
  check _will refuse your lookback_. **It will not** — the `CUTOFF` regex matches
  only minute-scaled subtraction from an instant's milliseconds, and a
  60-**trading-session** lookback goes through the calendar with no `getTime()`
  and no minute factor, so it matches **neither** half and the run prints its
  usual counts with the lookback on disk. **The conjunct must key on the SESSION
  count**, and the break must be the file the **next** story writes — confirming
  the check passes **wrongly** first. Correct the hand-off in Story 5.2's own
  file by date.
- **The upward sweep**, with these named before you start:
  - **`PRODUCT_SPEC.md` §11's `99.1st percentile`** — a dated amendment, since
    integer ordinals are what 4,620 samples support.
  - **Story 5.1's Gate 1 decision 1** — amended in Task 5.3.1; check it reads
    correctly beside the owner's 2026-10-14 decision.
  - **`PROVIDER.md` §3.5** — its refusal is about _computing_ an adjustment and
    this story _detects and refuses_; make sure the distinction is written where
    the refusal lives, not only here.
  - **`HOSTING.md`'s 10 MiB/s against its own 120 provisioned IOPS** — the
    story's cost band is bandwidth arithmetic and the disk is provisioned for
    IOPS. Whichever regime the deployed measurement supports, the document that
    gets quoted next should say which applies to a per-security pass.
  - **`BARS.md` §2** — the story cited the **daily** 2024-01-01 cap for a
    **minute** baseline; the conclusion held and the mechanism quoted did not.
- **The sideways enumeration.** Known recipients: **Story 5.4** (it ranks these
  figures, and ADR 0040's reversal trigger — _the first aggregate on `/` whose
  honest window is not breadth's_ — **fires on it**, taking ADR 0038's frame
  grain with it: `windowMinutes` stops being one number per frame and the shared
  eligibility pass splits); **Story 5.5** (the same store read, the same tape
  rule, and the baseline table it may extend rather than duplicate); **Story
  5.6** (the percentile is a scored factor and inherits the refusals); **Epic
  13** (the table is covered by the temporal plugin **by its column naming**,
  which diverges from ADR 0042 deliberately); **Epic 14** (the periodic pass is
  a new cost class on a Burstable tier with a CPU-credit model, and
  `PRODUCT_SPEC.md` §28 has nothing to say about a background pass — that
  silence is worth a decision rather than an assumption).
- **Epic 14's three conditions and ADR 0040's trigger, all evaluated in
  writing**, with what would change each verdict.
- **`docs/GAPS.md`** for every claim nothing mechanical guards — the deployed
  cost, the two-tape inflation's ~25%-of-steady-state exposure, the bias's
  magnitude (nothing measures **by how much** the open is fatter), and the fact
  that **no gated machine will ever see a percentile**.
- **`LIVE-REHEARSAL.md`** row **5.3**, written **before** the sitting. The
  percentile has **no external check at all** short of a person with a public
  chart and a calculator, and it is the third consecutive row this epic owes.
- **`STORY.md` status, the subject document, `CLAUDE.md`'s _Current state_.**

## Done when

1. Every criterion has a verdict, an instrument and a kind, with the three
   amended ones quoted in **both** forms.
2. The fourth conjunct exists, keyed on the **session** count, with a break
   performed in both directions and the passing transcript kept — and Story
   5.2's hand-off corrected by date.
3. Both sweeps are run and **both counts recorded**, including if either is zero.
4. All three of Epic 14's conditions and ADR 0040's trigger are evaluated in
   writing.
5. `docs/GAPS.md` updated; anything mechanisable made mechanical with a break.
6. Row 5.3 is in the ledger with what a sitting must take deliberately.
7. The four gates run **once on the final tree** with their numbers, the load
   read **before** each, and Gate 2 put to the owner with what was **not**
   verified and why.

---

## What was done — 2026-10-14

<!-- written at completion -->

## What was done — 2026-10-15

### The fourth conjunct — proved green on the defect, then fixed

Story 5.2's close told this story that `one-home-for-the-observation-window`
**would refuse** a 60-trading-session lookback. **It did not**, and that was
established the way this repository requires rather than by reading the regex:
`apps/backend/src/volume-baseline.ts` was planted with its own
`VOLUME_LOOKBACK_SESSIONS = 40` — **the file Story 5.5 will plausibly write,
under its likely name** — and the run reported:

```
59 invariants hold.
```

The check matches a **minute-scaled subtraction from an instant's
milliseconds**; a calendar walk has no `getTime()` and no minute factor, so it
matched neither half.

**The conjunct is keyed on the quantity, not the name.** What makes a lookback a
_policy_ is that its count is **fixed by the module** rather than handed in:
`backfill.ts`, `fetch-bars.ts` and `series-request.ts` pass `wanted + 1`,
`wanted` and `count` — a backfill gap and a window the reader chose, neither a
second definition of _how far back we look_. With it, the same plant gives:

```
✗ one-home-for-the-observation-window
  2 shipped files fix a session-scaled lookback, expected exactly 1:
    apps/backend/src/return-baseline.ts
    apps/backend/src/volume-baseline.ts
```

**And the conjunct's own anchor caught a bug in it**, which is worth recording
because it is the mechanism working on its author: `shippedSourceFiles()` returns
**absolute** paths and the first draft compared against a repo-relative string,
so the anchor fired — _`return-baseline.ts` no longer fixes a session lookback_ —
with the file plainly listed underneath.

Break registered and run through the harness:
`pnpm break a-second-session-lookback` → red naming the check, restored
byte-identical. The break is `backfill.ts`'s `lastMarketSessions(wanted, …)`
becoming `lastMarketSessions(60, …)`, which is the **tidy-looking** edit: it
reads as settling a number rather than as inventing a policy.

**Story 5.2's record is corrected by date** in its own file, with the lesson
stated: a hand-off promising that a check will catch something is **a claim about
a mechanism**, and a claim about a mechanism reads identically whether the
mechanism is there or not. It should have said _go and plant the file_.

### The sweeps

**Upward — 4 live claims corrected.** `4,680` survived in five documents after
Gate 1 established it is **4,620**: `PRODUCT_SPEC.md` §11's amendment, Story
5.1's decision 3, Story 5.6's drawn example, and the hand-off above. The
historical ones — this story's own AC 3 and the Gate 1 section that corrects it —
are **left standing**, which is the rule. Story 5.1's correction carries the
consequence too: what 4,620 samples support is an **integer** ordinal, so the
granularity claim moved with the count.

**Sideways — 5 recipients, 5 of which had nothing.** **Story 5.5** (the new
conjunct, and that its own file is the plant it was proved against; the baseline
table it may extend rather than duplicate; why a split breaks **volume harder
than price** — the share count multiplies by exactly the factor the price divides
by); **Story 5.4** (ADR 0040's reversal trigger **fires on it**, taking ADR
0038's frame grain, the split eligibility pass and the single `observedAt` pair
with it; the eleven refused securities its ranked list must not rank last);
**Story 5.6** (the two refusals that must not read alike, and that a composite
averaging over a **refused** factor is a score built on a withheld number — `0`
is not the answer); **Epic 13** (a derived table that **is** covered by its
plugin, and the one column naming that makes it so); **Epic 14** (a periodic
multi-minute pass is a cost class §28 has nothing to say about, and the planner's
212–223× under-estimate is the figure that decides the regime).

### Epic 14's three conditions and ADR 0040's trigger

- **`/securities`, a second per-row surface at universe scale — NOT FIRED.** One
  figure in an existing region.
- **`/`, the first surface rendering one element per tracked security — NOT
  FIRED.** This story's _Out of scope_ excludes `/`.
- **The backend condition, _a computation deriving a figure per security in that
  callback_ — NOT FIRED.** The percentile is a bounded search over 101
  breakpoints for **one** security on demand. **What would change it is Story
  5.4**, and the price is in its file.
- **ADR 0040's reversal trigger — NOT FIRED, and this story is the clearest
  instance it has ever had of the condition it names.** A percentile is not an
  aggregate and is not on `/`; a **ranked list of percentiles on `/`** is both,
  and its honest window is **60 trading sessions** against breadth's five
  minutes.

### `docs/GAPS.md`

Three entries: **a percentile is checkable against nothing on screen** — strictly
worse than the return beside it, whose two instants at least ship; **the
percentile break cannot reach its own assertions on any machine here**, so
`sampleCount ≤ sipRows` is unexercised; and **nothing measures how much fatter
the opening bucket actually is**, so the bias sentence is either an
understatement a reader will act on or a line of noise in a 142 px region, and
nobody knows which.

### Gates, on the final tree, load read before each

| Gate                 | Load before | Result                                                    |
| -------------------- | ----------- | --------------------------------------------------------- |
| `pnpm verify`        | 2.09        | **exit 0**, `59 invariants hold.`, **3,220 tests**        |
| `pnpm test:database` | 15.91       | **259 tests**                                             |
| `pnpm e2e`           | 14.88       | **257 passed, 16 skipped, 0 failed** — a clean full suite |
| `pnpm probe`         | —           | the new states at four widths; screenshots looked at      |

## For a stakeholder — a status report, 2026-10-15

**Story 5.3 is closed, and the most useful thing it produced was a check that
was quietly not working.**

Two weeks ago we added a safeguard meant to stop this product accumulating
several different answers to _how far back do we look_. The previous story told
this one that the safeguard would catch its new sixty-day lookback. It would
not — it only recognises windows measured in minutes, and a window measured in
trading days is invisible to it. We found that by **writing the file the next
story will write and watching the build pass**, which is the only way such a
thing is ever found. The safeguard now covers both, and the mistake is recorded
where the wrong promise was made.

The story's own headline is that **the expensive unknown was not expensive**:
the baseline calculation it was built around was estimated at four to thirteen
minutes and measures **twelve seconds**.

One criterion is **not met and says so**. It asked for a cost measurement on the
live database, and your laptop cannot reach that database at all — outbound
database connections are blocked on your network, which no document here
anticipated. The measurement endpoint you approved ships with this story, so the
figure is one request away once it deploys, and the criterion is recorded as
owed rather than quietly discharged with a laptop number.
