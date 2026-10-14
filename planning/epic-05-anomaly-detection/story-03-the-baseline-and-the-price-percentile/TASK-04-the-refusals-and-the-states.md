# Task 5.3.4 — The Refusals & the States

**Status:** Complete — 2026-10-14 — the minimum is **2,500**, which is `50/√n ≤ 1` solved for `n` rather than a number chosen; the prescribed sentence's denominator could not be produced honestly and is the **bound** instead of a nominal ceiling; and **no machine in this repository can draw a percentile at all**, so the browser spec's percentile claims are conditional everywhere but production
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.3

## Objective

**A percentile is a number nobody can eyeball**, and the states where it must
not be drawn are the ones no machine here can reach. CI's store has zero bars,
so **no gated machine will ever see a percentile** — which means the refusal
path is the only one CI exercises, and that is also the state a cold production
replica is in.

## What the user can see when this lands

**The region is honest about its baseline**, and no two of its states read
alike.

## Work

- **AC 6's refusal is a TYPE, not a document.** The producer returns no
  breakpoints member at all below the minimum, so a caller **physically cannot**
  read a percentile — `exactOptionalPropertyTypes` makes the omission a compile
  error, which is stronger than any test. The check that would be green on the
  defect is one asserting the constant exists; the one that is not is
  `five-minute-return.ts`'s own shape test.
- **One new sentence, replacing a clause rather than adding a row**:

  ```
  Baseline too short to rank — 1,240 of 4,620 returns
  ```

  It covers **two** facts with one string, because `0 of 4,620 returns` is true
  on a store with no baseline — so there is no sixth sentence. No terminal stop,
  no connection word, no status word: the register of the twelve.

- **A second new sentence for the split refusal** from Task 5.3.1's guard, and
  it must not read as the sample refusal — _we have too little history_ and _the
  history we have contains a price break we cannot adjust_ are different facts.
- **The states this story adds, as pictures**: the percentile drawn; drawn **with
  the bias clause** (the row's longest state, and the one the reserve is
  measured from); **refused for sample**, figure drawn and percentile cell
  absent; **refused for a split**; at the **`>99th` clamp**, where a reader is
  most likely to read an over-claim; and beside a **zero return**, which is
  `0.00% —` with a low ordinal and is the pair most easily misread as a refusal.
- **No dash in the percentile cell, ever** — `—` is `unchanged` in `PriceChange`.
- **The percentile's own correctness needs three layers and all three**, because
  it can be wrong in two different ways:
  1. a **golden sample** — a hand-written distribution with a known answer at six
     probe points, including ties and the exact-match case, which catches
     interpolation-convention drift and is the only test a reviewer can verify by
     eye;
  2. an **independent recompute in the test by a different method** — the test
     sorts the magnitudes itself and counts, never calling the producer's sort or
     its breakpoints. **This is the layer that catches a lying producer**, and it
     is `overview-movers-ranking.spec.ts`'s shape;
  3. **properties** — monotone, bounded, permutation-invariant, invariant to
     duplicating the corpus, and **magnitude-symmetric** (`pct(+x) === pct(−x)`),
     which is the one property that catches a signed percentile shipped as a
     magnitude one.

  Properties are permutation-invariant and therefore **blind to a wrong
  convention**; a golden sample is **blind to a producer that breaks at scale**.
  Keep them separate from the database tests of §5.3.2, which test the **input**
  rather than the arithmetic.

- **The browser spec needs a claim grounded OUTSIDE the frame.** A percentile is
  **less** recoverable from the frame than the return was — the return at least
  shipped both instants — so the region trips _an aggregate is checkable by
  nothing_ harder than Story 5.2 did. A pass-through proves fidelity only;
  `docs/GAPS.md` carries the two sufficient shapes.
- **The live-region reversal trigger fires as worded and must be evaluated in
  writing.** `AbnormalMove.tsx` says _the first state in this region that is
  terminal — a word or a figure that will not be replaced by the next batch_, and
  a baseline changes once a night. The expected verdict is that it **still** does
  not warrant one — both are present on first paint rather than arriving, and the
  band's other four lines rewrite 6.8–16.1 times a minute — but an unevaluated
  trigger and one that did not fire read identically.
- **No arrival mark on the percentile**: marking one of two figures in one band
  invents a hierarchy the region does not have.

## Done when

1. The refusal is unrepresentable at the type level below the minimum, with a
   test at `min − 1` asserting the member's absence.
2. Both new sentences exist, each with its recorded reason for not being one of
   the twelve, and **the sample refusal and the split refusal do not read
   alike**.
3. All three correctness layers exist, and the independent recompute does **not**
   call the producer's own sort.
4. The browser spec carries a claim grounded outside the frame, and the break —
   break the producer into fabricating a percentile — is performed in **both**
   directions.
5. The region is one height across every new state at four widths, probed.
6. The live-region trigger is evaluated **in writing**.
7. `pnpm verify` green; `pnpm e2e` green on the specs this touches.

---

## What was done — 2026-10-14

**The region is honest about its baseline.** Two new sentences, a refusal that
is a **type** rather than a document, the three correctness layers, four new
pictures, and a browser claim grounded on the database rather than on the frame.

### The minimum sample, and why 2,500

**It is derived from the printed precision**, which is the half of AC 6 a
constant alone does not answer — _never printed at a precision the sample
cannot support_. The product prints an **integer ordinal**, so the last drawn
digit is **one percentile point**. The standard error of a sample percentile in
percentile points is `100·√(p(1−p)/n)`, largest at the median where it is
`50/√n`:

| `n`                      | SE at the 50th | SE at the 99th |
| ------------------------ | -------------- | -------------- |
| 737 (the measured floor) | **1.84 pt**    | 0.37 pt        |
| **2,500**                | **1.00 pt**    | 0.20 pt        |
| 4,620 (the ceiling)      | 0.74 pt        | 0.146 pt       |

`50/√n ≤ 1` gives `n ≥ 2500` **exactly** — a round number that was not chosen.
The 0.146 at the 99th is the figure `PRODUCT_SPEC.md` §11's amendment already
quotes; taking the bound **at the tail** instead would have given `n ≥ 396`, a
floor almost nothing in this universe falls below, which is a threshold that
refuses nothing and therefore tests nothing.

**What it costs, measured on this machine's store rather than projected** — the
2026-09-11 generation, 511 measured securities:

```
 ranked | under_2500 | under_1000 | min | max  | mean
    511 |         11 |          1 | 737 | 4620 | 4250
```

**11 of 511 — 2.2% — and the distribution is not a cliff**: 275 of 511 sit in
the top tenth. The refused names, measured rather than assumed:
`ERIE` 737, `NVR` 1,248, `AIZ` 1,284, `ESS` 1,627, `WST` and `GL` 2,041,
`IEX` 2,313, `CINF` 2,351, `PKG` 2,386, `L` 2,463, `VRSN` 2,492. `ERIE` is the
same 2.1%-coverage name Story 5.2 used as its worked example, and `NVR`'s 1,248
is within eight of the figure this task file's own example sentence invented.

**It lives in `packages/shared/src/return-baseline.ts` and not in the stored
row**, which is `0013_return_baselines.sql` §4's own reasoning honoured: the
pass counts and the presentation decides. The consequence is the useful part —
the eleven names above are refused **today**, against generations computed
before the bound existed, with no recompute, and changing the number is a deploy
rather than a 516-security pass.

### Done when

**1. The refusal is unrepresentable at the type level, with a test at
`min − 1`.** Two unions, each honest about its own layer:

- `StoredReturnBaseline` is now `RankableReturnBaseline | RefusedReturnBaseline`
  and the refused arm has **no `breakpoints` member at all** — the database's
  `return_baselines_one_answer` expressed in the type system, and `CLAUDE.md`'s
  own rule that _the mapping is exactly where a nullable column becomes an
  explicit domain answer_.
- `comparableBaseline(stored, grid)` in `return-percentile.ts` is the **one**
  function that produces a `ReturnBaselineDistribution`, and its refused arm has
  **no `distribution` member**. The join in `index.ts` cannot reach the
  arithmetic without narrowing: the three `?? null` readings it replaced were
  that narrowing done by hand.

**The check that is not green on the defect is the compiler's.**
`return-percentile.test.ts` holds

```ts
// @ts-expect-error — `distribution` does not exist on the refused arm
const unreachable: unknown = comparison.distribution;
```

and an **unused** `@ts-expect-error` is itself an error, so the day somebody
puts the member on both arms or makes it optional the **build** goes red.
Proved rather than claimed — `distribution?: ReturnBaselineDistribution` added
to the refused arm:

```
$ pnpm typecheck
apps/backend/src/return-percentile.test.ts(581,5): error TS2578: Unused '@ts-expect-error' directive.
[ELIFECYCLE] Command failed with exit code 2.
```

Beside it, the run-time half at `min − 1`: `expect("distribution" in comparison).toBe(false)`.

**2. Both sentences exist, with their recorded reason, and they do not read
alike.**

```
Baseline too short to rank — 1,240 of 2,500 returns
Baseline crosses an unadjusted price break — not comparable
```

Neither is one of the twelve approved: all twelve stand **where a figure would
be** and say _there is no figure_, while these stand in the **footer** where the
sample clause goes, beside a figure that drew perfectly well. A refusal of the
comparison is not a refusal of the number.

The first covers **two** facts with one string — `0 of 2,500 returns` is true
of a cold replica, of a security with no stored `sip` history and of every
gated run — so there is no sixth sentence. The second carries **no count**,
because the count is not the problem, and it says **price break** rather than
**split**: Task 5.3.2 measured five securities over the ratio of which four sit
on exact split factors and one (`MRNA`) is _a reverse split or a genuine event_,
so naming a corporate action would be invariant 5's confidence level smuggled
into prose. A test asserts the two share exactly `["Baseline", "—"]`.

**3. All three correctness layers, and the independent recompute does not call
the producer's sort.** `byCounting` asks the textbook question off the corpus —
_what fraction of the sample is strictly below this magnitude_ — and touches
neither `breakpointsOf` nor its interpolation. The tolerance is **derived**:
the two conventions differ by at most one sample position, `100/(n−1)` points,
**0.1 points at n = 1,000**, so the agreement is asserted to one printed
ordinal.

**Three defects were planted to prove each layer catches what the others
cannot**, and the third is the point:

| planted in `returnPercentileOf`                             | golden      | recompute                | properties |
| ----------------------------------------------------------- | ----------- | ------------------------ | ---------- |
| `Math.abs(percent)` → `percent` (a signed percentile)       | —           | —                        | **3 red**  |
| `rank` → `rank + 1` (a convention drift)                    | **11 red**  | — (inside the tolerance) | —          |
| `rank × 0.8` when `sampleCount > 500` (a lie only at scale) | — **green** | **3 red**                | —          |

**The golden sample was green on the third**, which is the whole argument for
having the recompute at all.

**4. The browser spec carries a claim grounded outside the frame, and the break
was performed in both directions.** The new reference is
`GET /diagnostics/baseline-cost`, which runs the pass's own read over one
security: `measured: false` means the store holds no `1m` coverage and no
baseline window can be read for anybody, and `sipRows` is an upper bound on the
sample a frame may claim, because every grid anchor the sampler pairs is a
distinct `sip` bar inside that window.

**Break A — the producer fabricates a measured figure and a `99th percentile`**
(registered as `the-percentile-is-fabricated-rather-than-refused`, at the join
in `index.ts`). The harness refuses a dirty target and `index.ts` is changed by
this task, so it was performed by hand and **must be re-run through
`pnpm break` on the committed tree**:

```
  ✘  1 [chromium] › security-abnormal-move.spec.ts:239:1 › the region draws what the SERVER sent, figure or refusal

    Error: a gateway with no market-data provider has observed nothing, so a measured 5-minute return is fabricated
    expect(received).toBe(expected) // Object.is equality
    Expected: false
    Received: true
```

restored → `3 passed (6.7s)`.

**Break B — the renderer draws a comparison under a refusal**, by hand in
`five-minute-return.ts`, because that is the arm every gated run takes:

```
    Error: expect(received).not.toContain(expected) // indexOf
    Expected substring: not "percentile"
    Received string:  "5-minute return / No bars observed yet 99th percentile / of 4,620 5-minute returns · all times of day pooled"
```

restored → `3 passed (6.7s)`.

**5. One height across every new state at four widths.** `pnpm probe --story`
at the four viewports gives **142 px** in 16 readings; and with the region's box
**forced** to the rail's own four content widths — 419 / 446 / 318 / 308 px,
which `pnpm probe` cannot do, because `--widths` filters a fixed viewport list —
a throwaway instrument read **142 px in all 72 readings** over 18 states:

```
state                             419  446  318  308
baseline-too-short               142  142  142  142
no-baseline-stored               142  142  142  142
baseline-crosses-a-price-break   142  142  142  142
zero-return-ranked               142  142  142  142
with-percentile                  142  142  142  142
…                                142  142  142  142
```

The region's reserve is unchanged at **142 px** and the sample row's is still
the bias clause's: both new sentences are shorter than it and neither reaches
the second reserved line at 308 px. The route itself probes
`419×142 / 446×142 / 318×142 / 308×142`.

**6. The live-region trigger fired, and the verdict is written in
`AbnormalMove.tsx`.** Both refusal sentences **are** terminal as the clause is
worded — a generation changes once a night. **Still no live region**, for three
reasons: the sentence is in the band's **first** render (the gateway answers a
`subscribe`), so there is nothing to announce and only something to go and read;
the band is one group and a region scoped to the footer row still re-announces
on every one of the 6.8–16.1 batches a minute; and a refusal does not flip under
a reader, because the bound is applied to a row that is fixed for the session.
**One caveat is stated rather than argued away**: a reader attached to a cold
replica before `baselines.load` resolves sees `0 of 2,500 returns` replaced by a
rank, unprompted. So the clause is **sharpened rather than re-dated** — _terminal_
is necessary and not sufficient, and the condition is now the first state here
that is terminal **and arrives after the reader has had time to read the
region**.

**7. The states as pictures.** Four new stories — `BaselineTooShort`,
`NoBaselineStored`, `BaselineCrossesAPriceBreak`, `ZeroReturnRanked` — beside
the four Task 5.3.3 shipped, photographed at 390. The zero-return pair reads
`— 0.00%  3rd percentile`, which is the one most easily misread as a refusal and
is now a story saying so. **No dash in the percentile cell in any state**,
asserted over all four comparison states.

### Five things that turned out to be false or unachievable

1. **The prescribed sentence cannot be produced honestly as written.** The brief
   and this task file specify `Baseline too short to rank — 1,240 of 4,620
returns`, where `4,620` is the nominal full-window count. Three reasons it is
   the **wrong denominator** and `2,500` — the bound actually applied — ships
   instead. It is a **ceiling almost nobody reaches** (Task 5.3.2: mean 4,250,
   max 4,620 reached by 106 of 511), so a refusal reading `2,041 of 4,620`
   invites _we need 4,620_ when we need 2,500. It is **wrong for any window
   containing an early close**, where a session yields 41 increments rather than
   77, so a `60 × 77` on screen is a figure no pass counted. And the exact
   nominal for the generation being read **is not stored and cannot be
   recovered**: the row carries `lookback_sessions` and `observed_at`, so the
   window's own session list would have to be reconstructed through the calendar
   at read time, inside the socket path, for a number that is not the one being
   compared against. The shipped sentence states what we have and the bar it
   must clear, and `0 of 2,500 returns` still covers the no-baseline case.
2. **`percentile: null` was carrying four different facts and the brief's
   framing hid it.** Before this task, _no generation loaded_, _no row_, _a
   refused row_ and _an unreadable frame_ were one `null` on the wire. The
   member is now a union — `WireReturnPercentile | WireRefusedPercentile` — and
   `null` means only _this gateway sent no comparison_, which is a browser
   across a deploy. The frame grew **391 → 405 B** with a rank (the 14 B is
   `"ranked":true,`) and a refusal costs **400–405 B**, measured: sending the
   refusal rather than nothing costs 84–89 B on a frame sent once per applied
   batch for one security.
3. **The producer break cannot reach the percentile-specific assertions on any
   machine here**, and that is a property of the machines rather than of the
   spec. A percentile needs a measured figure, a measured figure needs an
   observation, and no machine in this repository has a provider — so the
   **provider** claim fires first and subsumes everything on the measured arm.
   The `sampleCount ≤ sipRows` bound has therefore never been exercised against
   a non-trivial value anywhere. In `docs/GAPS.md`, owned by the first deployed
   sitting.
4. **The brief's _the producer returns no breakpoints member_ is one union and
   the honest answer is two.** Applying the sample bound in the store's row
   mapper would have made `select refusal from return_baselines` disagree with
   the domain object — a debugging trap — and would have refused the database
   suite's own 118-sample fixture. The row's union says what was **stored**; the
   comparison's union says what may be **printed**.
5. **`pnpm probe --widths` filters a fixed viewport list**, so the per-width
   reading Task 5.3.3 recorded at the rail's content widths cannot be reproduced
   with it. A throwaway instrument produced the 72 readings above and was
   deleted; the figures are quoted in full here for that reason.

### Gates

- `pnpm build` — green (tsc, Vite, Storybook).
- `pnpm lint` — green at `--max-warnings 0`, after four findings
  (`prefer-optional-chain` ×2, `no-unnecessary-type-assertion` ×2).
- `pnpm format:check` — `All matched files use Prettier code style!` after
  writing the nine files this task touched **by explicit path** (`notes.txt` is
  never written).
- `pnpm stories` — `44 components, 44 stories files.`
- `pnpm invariants` — `59 invariants hold.` (plus the standing 4.7 waiver).
- `pnpm links` — `570 documents, 1846 cross-file links, 39 anchor links, 0 broken.`
- `pnpm env:check`, `pnpm coverage:check` — green.
- `pnpm test` — **3,160 tests**, 472 + 1,139 + 1,549, **no `Unhandled
Errors` block**.
- `pnpm test:process` — 8 files… `2 files, 60 tests`.
- `pnpm test:database` — `8 files, 259 tests`.
- `pnpm e2e security-abnormal-move.spec.ts` — `3 passed (6.7s)`; and
  `security-feed-degraded.spec.ts` + `security-explorer-shell.spec.ts` —
  `16 passed (16.9s)`.
- `pnpm probe` — the route at four widths and seven stories at four viewports,
  142 px throughout, three states photographed at 390 and looked at.
- **`pnpm verify` and the full `pnpm e2e` were not run**, per this task's brief.

### What this leaves standing

- **No gated machine and no person has seen a percentile**, refused or drawn.
  The two refusal sentences are reachable only in Storybook and in production.
- **`the-percentile-is-fabricated-rather-than-refused` has not been run through
  the harness**, because `pnpm break` refuses a dirty target and this task
  changes `index.ts`. It must be re-run on the committed tree.
- **The spoken form of `—` in both new sentences is unanswerable from a DOM**,
  like `>99th` before it: whether a reader says _dash_, pauses, or says nothing
  differs by reader. It joins the standing screen-reader item rather than being
  claimed answered.

## The orchestrator's half — 2026-10-14

### The minimum is derived, not chosen, and that is the whole point

The product prints an **integer** ordinal, so the last digit is one percentile
point. The standard error of a sample percentile, in points, is
`100·√(p(1−p)/n)` — worst at the median, `50/√n`. Requiring that to be **no
larger than the digit printed**:

```
50/√n ≤ 1   ⇒   n ≥ 2500
```

| n                            | SE at the 50th | SE at the 99th |
| ---------------------------- | -------------- | -------------- |
| **737** (the measured floor) | **1.84 pt**    | 0.37           |
| **2,500**                    | **1.00 pt**    | 0.20           |
| **4,620** (the ceiling)      | 0.74           | 0.146          |

**Taking the bound at the tail instead would give n ≥ 396** — a threshold that
refuses nobody and therefore tests nothing. The figure is **2,500**, and it
refuses **11 of 511** securities on the real store today (2.2%): `ERIE` 737,
`NVR` 1,248, `AIZ` 1,284, `ESS` 1,627, `WST` and `GL` 2,041, `IEX` 2,313,
`CINF` 2,351, `PKG` 2,386, `L` 2,463, `VRSN` 2,492. It lives in
`packages/shared` rather than in the row, so those eleven refuse **today**
without a recompute.

### The refusal is the compiler, and that was proved rather than claimed

A check asserting the constant exists would be green on the defect. This one is
an `@ts-expect-error` on `comparison.distribution`, proved by **adding the
member back**:

```
$ pnpm typecheck
apps/backend/src/return-percentile.test.ts(581,5): error TS2578: Unused '@ts-expect-error' directive.
```

### The three layers, each proved by a defect only that layer catches

This is the part worth keeping, because it is the argument for paying for all
three rather than an assertion that they are all needed:

| Planted defect                                     | Golden     | Recompute | Properties |
| -------------------------------------------------- | ---------- | --------- | ---------- |
| a **signed** percentile shipped as a magnitude one | —          | —         | **3 red**  |
| `rank + 1`                                         | **11 red** | —         | —          |
| `rank × 0.8 when n > 500`                          | **GREEN**  | **3 red** | —          |

**The third row is the one that justifies the independent recompute.** A
producer that is right on a 40-sample golden fixture and wrong at scale passes
the layer a reviewer can read by eye, and is caught only by a test that sorts
the magnitudes itself and counts — **never calling the producer's sort or its
breakpoints**. Its ±1 tolerance is derived (`100/(n−1)`), not picked.

### Both breaks, and the harness re-run

**A — the producer fabricates a figure and a `99th percentile`:**

```
✘ the region draws what the SERVER sent, figure or refusal
  Error: a gateway with no market-data provider has observed nothing,
         so a measured 5-minute return is fabricated
```

**B — the renderer draws a comparison under a refusal**, which is the arm
**every gated run takes**:

```
Expected substring: not "percentile"
Received string: "5-minute return / No bars observed yet 99th percentile /
                  of 4,620 5-minute returns · all times of day pooled"
```

Re-run through the harness on the committed tree, which the developer could not
do because `pnpm break` refuses a dirty target:

```
$ pnpm break the-percentile-is-fabricated-rather-than-refused
✓ apps/backend/src/index.ts broken → red → restored byte-identical.
```

**And its own limit is recorded rather than hidden**: the break's red comes from
the **provider** claim, not the percentile one, because a percentile needs a
measured figure, which needs a provider, which **no machine here has**. So
`sampleCount ≤ sipRows` has never been exercised against a non-trivial value —
`docs/GAPS.md` carries it, owned by the first deployed sitting.

### Looked at

`BaselineCrossesAPriceBreak` at 390: the return still draws, the percentile cell
is **absent rather than dashed** — `—` is `unchanged` in `PriceChange` — and the
sample row carries `Baseline crosses an unadjusted price break — not
comparable`, which shares exactly `["Baseline", "—"]` with the sample refusal
and **no more**. **142 px in all 72 readings** (18 states × four rail widths).

### The live-region trigger fired, and the verdict is still no

A baseline changes once a night, so the clause _the first state in this region
that is terminal_ **is met**. The answer is still no: the sentence is in the
band's **first render**, the band is one group, and a refusal does not flip
under a reader. The clause is sharpened to _terminal **and** arriving after the
reader has read the region_, with the cold-replica caveat stated.

### Five false premises, and the first is mine

1. **The sentence I prescribed cannot be produced honestly.**
   `— 1,240 of 4,620 returns` quotes the **nominal full-window count**, which
   (a) only 106 of 511 securities reach, so it invites _we need 4,620_; (b) is
   wrong for any window containing an early close — 41 increments, not 77; and
   (c) is **not stored** for the generation being read, so it would have to be
   reconstructed through the calendar **inside the socket path**. Shipped as
   `of 2,500 returns` — the bound actually applied — which keeps
   `0 of 2,500` true for a store with no baseline.
2. **One union is not enough** — the row and the comparison need separate ones,
   or `select refusal from return_baselines` disagrees with the domain object
   and the database suite's own 118-sample fixture is refused.
3. **The percentile break cannot reach its own assertions here**, above.
4. **`percentile: null` was carrying four facts** and now carries one.
   Frame bytes re-measured: **391 → 405 B**.
5. **`pnpm probe --widths` filters a fixed viewport list**, so the per-rail-width
   reading Task 5.3.3 recorded is not reproducible with it — a throwaway
   instrument took the 72 readings and was deleted.

### Gates

- `pnpm verify` — **exit 0** at load 8.30, `59 invariants hold.`, **3,220
  tests** (472 + 1,139 + 1,549 + 60).
- `pnpm test:database` — 8 files, 259 tests.
- `pnpm e2e security-abnormal-move.spec.ts` — 3 passed; plus
  `security-feed-degraded` and `security-explorer-shell`, 16 passed.
- `pnpm break the-percentile-is-fabricated-rather-than-refused` — red, restored
  byte-identical.

## For a stakeholder — a status report, 2026-10-14

**The product now refuses to rank a security when it cannot do so honestly**, and
the threshold is derived rather than picked. Because we print a whole-number
percentile, the figure has to be accurate to about one point — and that requires
**2,500 samples**. Eleven of our 511 securities do not have them today, so they
show _Baseline too short to rank_ instead of a number. A twelfth case is a
security whose price history contains an unexplained break — a split — and it
says something different, because _we don't have enough history_ and _the history
we have is corrupted_ are different facts a reader should not have to untangle.

The percentile is the one number on this page **nobody can check by eye**, so it
is tested three ways. Each way was proved necessary by deliberately breaking the
calculation in three different manners — and in one of them, the test a reviewer
can read by hand **stayed green** while only the independent recalculation
caught it. That is the case for paying for all three.

**What nobody has seen: a percentile.** Not on a test machine, which holds no
price history, and not by a person. That is now the third figure this epic owes a
real session.
