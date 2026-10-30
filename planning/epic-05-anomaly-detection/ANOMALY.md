# ANOMALY.md — what this product means by unusual, what it refuses, and what nobody has seen it do

**Written:** 2026-10-29, by [Task 5.7.8](story-07-the-rehearsal-the-sweep-and-the-epic-close/TASK-08-the-close.md), at Epic 5's close
**Epic:** [Epic 5 — Anomaly Detection](EPIC.md) · **Spec:** [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §9, §11
**Status:** The maintained account of this product's anomaly surfaces. Where a
task file disagrees with this document, **this document wins**; where this
document disagrees with an ADR about a decision, **the ADR wins**.

This is the document to open **first** before changing anything that says how
unusual something is.

**It exists because Epic 5 produced no subject document, which makes it the
second consecutive epic to do so** — and Epic 4's
[`MARKET-OVERVIEW.md`](../epic-04-market-overview/MARKET-OVERVIEW.md) opens by
recording exactly that about itself. Epic 2 produced seven and Epic 3 seven; Epic
4 produced none until its own close wrote one, and said in that document that
until then the answer to _how does this screen work_ was _read eighty-one task
files_. Epic 5 then shipped six figures across two screens, five derived tables
and four new ADRs with the same answer — **read six stories and forty task
files** — and `CLAUDE.md`'s _Where the record lives_ table had **no Epic 5 row**
at all. **A close that writes the subject document is not the pattern working; it
is the pattern failing twice and being caught twice at the same point.**

It is a **gathering** rather than a new argument. Almost nothing below is decided
here, and every section says where its argument lives.

---

## 0. How to read this, and what its figures are worth

### 0.1 Three stores, and the store decides the answer

**Almost every claim in this epic is a claim about a store**, and this is the
single most important section in the document.

| Store                    | What it holds                                                           | What it can show                                                                |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **CI**                   | 516 securities, **zero bars**, no provider, **no composite generation** | the refusal arm, permanently. `0 of 3 factors`, `Nothing ranked yet.`, for ever |
| **A developer's laptop** | ~48.8 M `sip` bars, **zero `iex` rows**, no provider                    | the price and excess factors from stored closes; **one** of six volume refusals |
| **The deployment**       | both tapes since 2026-09-23, a provider, nightly generations            | everything that has ever been seen, and it has been seen by no person           |

**The practical rule, and it has produced two wrong claims in governing
documents already:** before trusting a sentence of the form _the reader meets X_,
ask which store it was measured on. A **refusal taxonomy cannot be ranked from a
machine that can reach only one of its members** — and both of Story 5.5's false
claims came from exactly that, in **opposite** directions.

### 0.2 "Verified" usually means verified in the refusal arm

Most of this epic's criteria are proved against data the tests supply
themselves. That proves the arithmetic and the drawing; **it does not prove the
thing computing the numbers.** Story 5.4 demonstrated the gap rather than arguing
it: against a producer planted to invent an `NVDA` row, **both frame-derived
browser arms were green on the fabricated row**, and only an arm grounded
**outside** the frame saw it.

So a figure here is one of three kinds, and the document says which: a **re-take**
(a command a clean clone can run), a **dated reading** (needs conditions nobody
can reproduce), or **unverified** (the arm has never run anywhere).

### 0.3 Every per-batch cost figure is a tight-loop upper bound

Both of this epic's backend cost figures were taken in a tight loop with a
calibrator **in its own loop** — never inside the measured block, which this
repository measured as a reproducible **7.2×** artefact. None of them is a
measurement of what the computation costs at the cadence production runs it at,
and the two are **not comparable with each other** (their calibrators differ by
2.5×). Do not subtract one from the other.

---

## 1. What a reader actually sees

### 1.1 `/securities/:symbol` — `Abnormal-move indicators`, four bands and a ledger

Top to bottom:

- **The score band.** `HOW UNUSUAL · NOT A RISK MEASURE`, an integer, `/ 100`, a
  band chip, `N of 3 factors contributing · max 75`, and
  `A measure of how unusual, not of risk or opportunity.` The scale and the
  maximum are **different numbers on purpose**: `/ 100` is the scale, `max 75` is
  what the present factors can reach.
- **The ledger** — a real `<table>` with `<caption>How this score was reached`,
  columns `Factor / Weight / Contributed`, **one row per factor in every state**,
  so `3 of 3` and `0 of 3` are byte-identical in height. The contributions
  **re-add to the figure above them.**
- **The 5-minute return** (Story 5.2) — the figure, both instants,
  `observed k of 5 minutes`, `Measured on IEX`.
- **The percentile** (Story 5.3) — `99th percentile`, `of 4,620 5-minute
returns · all times of day pooled`.
- **The volume rate** (Story 5.5) — `VOLUME PER MINUTE`, `4.1× typical`, the
  baseline's lookback, bucket, exclusion and **both** tapes named.

And below, `Relative performance` (Story 5.1): the security's move, its sector
benchmark ETF's and the broad market's on **one track anchored at zero**, with
`behind by 2.20 pts` / `ahead by 3.78 pts` stated in **words and percentage
points** — never drawn as a measurement, because a security down 4.2% against a
sector down 6.0% is _ahead while falling_.

**The clause `behind by 2.20 pts against XLK` does not exist and never did.**
Two governing documents asserted it as _the shipped clause_ until 2026-10-29. The
ticker is named on the **adjacent row** and in the label `Against its sector`.

### 1.2 `/` — `Unusual activity`, ten rows ranked by the composite

Ten securities, ranked by `Composite anomaly score, 0 to 100` since Task 5.6.7.
Each row: rank, a tinted `▲`/`▼`, the ticker, the company name, the score.

**The band is stated once, in the region's heading** — `Top 10 · all extreme`,
or `Top 10 · led by extreme` where the ten do not share one. Three measurements
decided that and they are worth knowing before anybody puts it back on the row:
a chip cost **76 px of a 308 px row — 25%**, squeezing names to `Dominio…`;
there was **1 distinct band in the top ten**; and all ten rows shared one band in
**35 of 77** instants, so a per-row chip _stops being a property of the selection
and becomes a property of the day_. The **span** (`extreme to elevated`) was
refused on a measurement: 201.28 px against the 171.7 the slot has.

**The footer states three populations, a cut, and the cohort** — `… and 485 have
a score on 2 of 3 factors, to a maximum of 75`.

---

## 2. The score

### 2.1 Three factor slots, two scored factors

`FACTOR_WEIGHTS` is **`price 40 · excess 35 · volume 25`**, integers summing to
100 over the **full** factor set. Breadth is a **stated clause**, never a
weighted term — its weight column carries **blank room**, not a dash.

**The volume slot is `no-distribution` unconditionally.** `0015` stores a median
and a dispersion, **not a distribution**, so there are no breakpoints to rank a
rate against **for any security**, and `volumeFactorAnswer()` takes **no
parameters**. The consequences run through everything else here: the ceiling is
**75**, the measured cohort is `{price, excess}` on **485 of 485** stored rows
with **0** single-factor scores, and a three-factor score is **structurally
unreachable** rather than merely unobserved.

`PRODUCT_SPEC.md` §9's sketch draws `91`, `84` and `79`. All three are **above
the ceiling** and unreachable by any security on any day.

### 2.2 No imputation, no renormalisation — and the factor count is part of the identity

A reduced-factor score means _at least this unusual, on the evidence we have_.
Both the **count** and the **maximum** travel with it. Renormalising to 100 is
refused for two independent reasons ([ADR 0046](../../docs/adr/0046-what-a-composite-score-is-what-it-refuses-and-where-its-guarantee-ends.md)
§2): it systematically promotes the **worst-covered** securities, and the band
floors are measured quantiles of a **max-75** scale, so it invalidates all three
the day it ships. Held since 2026-10-29 by `no-renormalised-score`, keyed on **the
division**.

### 2.3 The band floors are derived, and the selector is an inequality

`normal · elevated · high · extreme`, floors **32 / 63 / 73**, from **34,318**
measured two-factor scores — p50, p90, p99.

**The selector is `elevated ≤ 40 < high`**, because a one-factor score caps at 40
and _less evidence must mean less claim_. That inequality **rejected p75 = 49**,
which would have made every reduced-factor score `normal` for ever.

**Measured distribution per instant over 484 scored securities:** `normal`
**219.2**, `elevated` **179.4**, `high` **39.3**, `extreme` **7.74**.

**And the floors carry a trigger that fires in the same commit as the volume
arm's**, because every quantile behind them was measured on a two-factor,
max-75 scale.

### 2.4 A score cannot be constructed without its explanation — until it crosses a socket

Three mechanisms, and the third is the one that survives the wire:

1. **A compile error about which module minted it.** A real non-exported
   `Symbol` brand — not `declare const brand: unique symbol`, which compiles and
   fails at runtime. `contributing` is `[T, ...T[]]`, so a score with no
   contributing clause **does not typecheck**.
2. **A test** that the number is right. The brand says _who minted it_, never
   _that it is correct_.
3. **`readAnomalyScore` re-adds the published contributions and refuses the whole
   explanation when the sum is not the score it was sent.**

**The brand dies at `JSON.parse`** — `JSON.stringify` drops symbol keys, so a
score that has crossed a wire carries none. The third mechanism is therefore the
**only** one at any boundary, and it is stronger than the brand because it makes
a claim about the **value** rather than about the module: a fabricated score
fails **arithmetic**. ADR 0046 §3 is where the guarantee ends. **Epic 10 meets
this first** and its `EPIC.md` now carries it.

---

## 3. The factors

### 3.1 The price percentile — and `n` is counted, never a constant

The magnitude of the security's own 5-minute return, as an **integer ordinal**
against 60 sessions of its own history, pooled across all times of day.

- **The minimum sample is derived, not chosen**: an integer ordinal means the
  last digit is one percentile point, so `50/√n ≤ 1` gives **`n ≥ 2500`
  exactly**. **11 of 511** securities refuse on it.
- **`n` is counted** — min **737**, max **4,620** — so §11's `99.1st percentile`
  example is amended: integer ordinals are what 4,620 samples support.
- **`100th` is never printed**: above the highest order statistic there is no
  sample, so the ceiling is `>99th`.
- **Pooling has a known cost with a stated condition.** The first minutes of a
  session are the fattest-tailed bucket, so a pooled percentile may rank ordinary
  opening behaviour as extreme. The magnitude is **unmeasured**; the clause is
  read off **the figure's own instants** and never a wall clock, held by
  `the-opening-bias-is-read-off-the-figure`.

### 3.2 The relative move — and the live defect that survived four reviews

The security's excess over its **capitalisation-weighted sector SPDR**, ranked
against 60 sessions of paired history. The reference is **in the key** —
`(security_id, observed_at, reference_kind, reference_symbol)` — because a
reference-blind key would let a switch rewrite what every stored breakpoint array
means **with nothing recording that the meaning changed**.

**This factor shipped wrong and the error grew through every session.** It ranked
a **session-to-date** excess against a **five-minute** distribution: mean rank
**91.37** with **58.8%** of the universe at its own 99th percentile, paying its
full 35 of 100 for the majority of the universe. Repaired to **46.08** over the
same 34,622 samples.

**The corroboration is what makes it a measurement rather than a story.** Task
5.6.3's band-floor derivation, taken **before** the defect was known and by a
different instrument with no stake in it, printed `mean excess rank 46.09` — so
the repair reproduces it to **0.01**. And the repair was proved **persisted**:
the stored `price_rank` agrees with `session_return_percentiles.rank`, written by
code predating the task, on **all 485 rows with 0 disagreements**.

**Why nothing caught it:** the price factor beside it was span-consistent, and
**nothing compared the numerator's span to the baseline's**. The guard that was
missing is now `the-excess-numerator-spans-its-baseline` — a **test** rather than
an invariant, deliberately, because it must read a **derived value**
(`RETURN_SPAN_MINUTES = TRAILING_WINDOW_SPAN_MS / MS_PER_MINUTE`) and a grep
would have to re-implement that arithmetic.

### 3.3 The volume rate — a stated absence, and the most consequential measurement in the epic

`Σvolume / spanMinutes` against the median of **one** minute, drawn under
`VOLUME PER MINUTE`. A partial span is **refused**; `× 5/k`, `/ k` and `/ 5` are
all wrong, and `/ k` is the same imputation rearranged and **biased upward**,
because the minutes a single venue misses are the quiet ones.

**Why the tape is in the key, and it governs more than volume.** This
repository's coverage figures had always been **minute-presence** shares;
**nobody had measured IEX's share of VOLUME**. Taken against the deployment:
**3.54% for `NVDA`, and 3.54%–15.19% across six securities — a 4.3× spread
running INVERSELY with liquidity** — against minute presence of **81.6%**. So an
`iex` numerator over a `sip` baseline would render `4.1× typical` as **`0.11×`**,
**12× to 45× too low**. [ADR 0045](../../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md)
is the decision and the general rule: before comparing two market figures, ask
whether the quantity is a **ratio within one tape** (scale-free) or a **level
across tapes** (refused, because the share _is_ the quantity).

**What a deployed reader actually meets** — and two documents got this wrong for
a day, in opposite directions:

```
volume buckets — 4 drawable of 39928 with samples, 39924 too few sessions,
  0 zero volume, 8 empty; 2164895 minute samples, target 5% relative SE
```

**`too-few-sessions` at 99.990%** is the deployed refusal. **`no-same-tape-baseline`
reaches no reader of the deployment at all** — it is the permanent state of CI
and every laptop, which is precisely why it was mistaken for the common case.

**The four drawable pairs are named by the nightly pass** since 2026-10-29:
`NVDA bucket 31`, `AAPL bucket 0`, `AAPL bucket 11`, `ERIE bucket 77` (bucket _k_
is 09:30 + 5*k* ET). Before that the pass printed the count and **nothing in the
product could answer _which_**.

### 3.4 Breadth — counts with a population, never a percentage, never a weight

`Breadth: 312 of 466 advancing, heard from in the last 5 minutes.` — read off the
frame and never spelled, with `measured: 0` drawing
`nothing heard from in the last 5 minutes.` rather than `0 of 0`. A percentage
hides its denominator, and the denominator is **the part of the market we heard
from**, which on IEX is a fact about our reach.

---

## 4. The store — five tables, and they are a cache of a POLICY

`0013_return_baselines`, `0014_session_return_percentiles`,
`0015_volume_baselines`, `0016_excess_move_baselines`,
`0017_session_composite_scores`.

All five are **derived aggregates computed nightly and keyed by the session they
are FOR** ([ADR 0044](../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)),
with their window-end column named `observed_at` **deliberately diverging** from
ADR 0042 so Epic 13's plugin covers them structurally.

Four properties that are not obvious:

- **A stored score is a cache of a policy, not a record of an observation.** When
  a factor's definition changes, every stored row silently means something else —
  demonstrated the expensive way by §3.2's defect, which left 485 rows carrying a
  figure computed the wrong way.
- **`0015` keys on the TAPE as well as the session** — `unique (security_id,
observed_at, feed)`, the only one in the family that does, because a tape
  choice carrying a reversal trigger can flip.
- **`0016` keys on the REFERENCE** as well, for the same reason.
- **A refused security gets no row**, which is why `0014` and `0017` are each
  paired with a **pass** table: the populations a surface states have to come
  from somewhere when the per-security rows are absent. A join against only the
  row table under-reports and looks correct.

**The baseline reads the RAW store and refuses rather than adjusts**
([ADR 0047](../../docs/adr/0047-a-derived-statistic-reads-the-raw-store-and-refuses-rather-than-adjusts.md)),
reversing Story 5.1's Gate 1 decision 1. A split guard detects a session-boundary
discontinuity and **refuses the security**: **5 of 516** on the real store, four
on exact split factors — `CRWD` 0.2501, `APH` 0.5017, `MNST` 0.5084, `DD`
3.0639 — **two of them above 1.0**, which is why the bound is a ratio and its
reciprocal rather than a percentage.

**The expensive unknown was not expensive.** A full-universe pass was built on a
derived 4–13 minute estimate; measured it is **11.78 s warm, 20.67 s cold** over
48.8 M bars, because a per-security read is **538 blocks at ~45 rows a block** —
the bandwidth regime rather than the 120-provisioned-IOPS one.

---

## 5. What no machine and no person has ever seen

**This is the section to read before trusting anything above.**

- **A single ranked row on `/`**, by any machine or any person. CI has no
  composite generation, so every gated run draws ten held pads for ever.
- **The deployed common case** — `2 of 3 factors · max 75`. Every `2 of 3`
  figure in the tests is **furnished by the shipped scorer**, which proves the
  arithmetic and not the data.
- **`high`, `extreme`, or any three-factor score.** The last is structurally
  unreachable while `0015` stores a median and a dispersion.
- **The volume multiple.** 4 of 39,936 pairs, 0.010%, and the bucket is a time of
  day, so two constraints multiply.
- **Any figure in this epic against a real feed, by a person.**
  `LIVE-REHEARSAL.md` carries rows **5.1–5.6 unwatched**, plus Epic 4's **waived**
  390 row whose `Owner:` is this epic.

**One thing HAS been seen, and the claim that it had not was false for a day.** A
composite **draws on an ordinary laptop** — `score 35 · band elevated · max 35`,
`1 of 3 factors contributing · max 35`, off the running backend on
`/securities/NVDA`, probed at four widths, the frame quoted at **625 B**, dated
**2026-10-23**. `CLAUDE.md` said _the only place a score has ever been drawn is
Storybook_ until 2026-10-29. The excess factor needs only **stored daily
closes**, which is why — and it is why `LIVE-REHEARSAL.md` row **5.6** is the
first row in that ledger a sitting can actually clear.

---

## 6. Traps

1. **A pass-through spec proves fidelity, never correctness.** Demonstrated, not
   argued: a planted producer inventing an `NVDA` row left both frame-derived
   arms **green**. What catches a lying producer is a claim grounded **outside**
   the frame.
2. **This product spells `5` twice for two different quantities** — an
   eligibility cutoff over a population, and a measurement span between two
   endpoints of one security. [ADR 0043](../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
   keeps them apart **by name rather than by shape**.
3. **The cohort rule is correct and invisible.** Two scores are comparable iff
   computed over the same factor set; `{price, excess}` is the **sole** cohort on
   every machine that exists, so the partition is held by a **check** rather than
   a test — _a test over today's fixtures is green with the partition deleted_.
4. **Five tokens resolve to one amber** — `--anomaly-high`, `--feed-stale`,
   `--service-degraded`, `--provenance-synthetic` — so the ramp already carries
   four meanings before Epic 8 adds confidence as a fifth. Photographed and
   routed, not repaired.
5. **Two of those five are outside `TOKEN_NAMES`**, so the startup throw does not
   reach them. The other direction is held since 2026-10-29 by
   `a-var-read-resolves-to-a-declared-token`, which **found a live defect while
   being proved**: a `var()` naming a token this product has never declared,
   invisible because the browser inherited an identical colour.
6. **A chip taller than the row's line box steps the whole lower page**, and only
   `pnpm probe` can see it — 26 → 33 px a row, the list 269 → 329, **green on all
   3,652 unit tests**.
7. **Two reader-facing words for one factor** sit on one screen: the ledger says
   `Relative move` and the region 100 px below says `Relative performance`. §11's
   own word is `Relative move`. Recorded rather than resolved.

---

## 7. Where the arguments live

| Subject                                                                 | Read                                                                                                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two five-minutes, kept apart by name                                    | [ADR 0043](../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)                                                                     |
| A derived aggregate: nightly, keyed by the session it is for            | [ADR 0044](../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)                                                     |
| A cross-tape comparison, and what a ratio is a ratio of                 | [ADR 0045](../../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md)                                                                         |
| What a composite score is, what it refuses, where its guarantee ends    | [ADR 0046](../../docs/adr/0046-what-a-composite-score-is-what-it-refuses-and-where-its-guarantee-ends.md)                                                         |
| A derived statistic reads the raw store and refuses rather than adjusts | [ADR 0047](../../docs/adr/0047-a-derived-statistic-reads-the-raw-store-and-refuses-rather-than-adjusts.md)                                                        |
| The 59 acceptance criteria, each with its instrument, kind and store    | [Task 5.7.2](story-07-the-rehearsal-the-sweep-and-the-epic-close/TASK-02-the-fifty-nine-criteria-verdicted.md)                                                    |
| The exit criterion as a shape, verdicted clause by clause               | [`EPIC.md`](EPIC.md)                                                                                                                                              |
| What is owed a person, and the protocol for the sitting                 | [`LIVE-REHEARSAL.md`](../epic-03-live-market-data/LIVE-REHEARSAL.md) · [`THE-SITTING-5.md`](story-07-the-rehearsal-the-sweep-and-the-epic-close/THE-SITTING-5.md) |
| What a green `pnpm verify` does not certify here                        | [`docs/GAPS.md`](../../docs/GAPS.md)                                                                                                                              |
