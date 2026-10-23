# Task 5.6.5 — The score draws

**Status:** **Complete — 2026-10-23**
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.4

## Objective

**The sentence the epic exists for, on screen.** The first 0–100 figure in this
product, with its band and an account beneath it a reader can check by addition.

## What the user can see when this lands

On `/securities/:symbol`, as the **first band** of `Abnormal-move indicators`
(the owner's Gate 1 choice), above the three factor bands it summarises:

```
ANOMALY SCORE
61 / 100   ┃ elevated ┃
2 of 3 factors contributing

   FACTOR          WEIGHT   CONTRIBUTED
   Price               40            38
   Relative move       35            23
   Volume              25             —   no IEX volume history
   Breadth              —   stated as context

312 of 501 equities advancing in the last 5 minutes.
Not a measure of risk or investment opportunity.
```

**And on every machine that exists, most rows are refusals.** That is the shipped
product, not a shortfall.

## Work

- **The explanation is a LEDGER, not prose, and that is the load-bearing
  decision.** The factor figures, their definitions, their counted samples and
  their tapes are **already drawn in this region**, 100 px up. A paragraph
  restating `99th percentile of 4,620 5-minute returns` is two homes for one
  fact — which ADR 0029 forbids by name and `pnpm invariants` has failed a build
  over, and which is the `BarSeriesPanel` duplicate this product already deleted.
  So the ledger holds **only what the factor bands cannot**: the weight, the
  contribution, and a short reason for an absence.
- **Fixed arity is how you reserve for a variable account.** AC 6 wants one
  clause per contributing factor **and** one per absent factor — those are
  exhaustive and mutually exclusive, so the clause set is **total over the
  factors**: **four rows, constant, in every presence vector**. `Movers`' held-row
  lesson generalised from rows to clauses. 3-of-3 and 0-of-3 are **byte-identical
  in height**.
- **The reason cell gets 24 characters and the full sentence stays in the factor's
  own band.** A refusal kind that cannot be told from its neighbour in 24
  characters gets a **wider cell, never a softer word.** The pair hand-off 5.5/3
  names survives the compression: `baseline still filling` (22) against
  `no IEX volume history` (21) — **a wait** against **a gap in our listening**.
- **The figure: `--font-size-metric` (20/26), `--font-data`, `--font-weight-strong`,
  `--ink-primary`, with `/ 100` at micro in `--ink-secondary` on the same
  baseline.** Not display — that size is spent once per screen and
  `SecurityIdentity` already spends it. The denominator does three jobs and the
  third matters most: **it is the cheapest defence against the risk-meter
  misread**, because a needle on an arc says _risk_ and `61 / 100` says _a count
  on a stated scale_.
- **The chip sits on the figure's row, baseline-aligned, and costs 0 px** — a
  13 px glyph on dense 18 px leading sits inside a 20 px metric figure's ascent
  and descent, which `.percentile` and `.comparand` both measured and recorded.
  The canvas's §07 specimen stacks it above and costs two line boxes; that is
  **superseded with a dated correction**, not silently redrawn.
- **Amber appears exactly once** — the chip's fill, behind its **written** name.
  Not the score, not a contribution, not a weight. **One `pnpm invariants` clause
  with a break**, because the tempting edit (tint the score to match the chip) is
  the one that breaks it.
- **AC 11, two channels.** The band's micro label is `HOW UNUSUAL · NOT A RISK
MEASURE` (32 chars, free, **above** the figure so a reader meets it in the same
  glance), plus one reserved line at the foot: `A measure of how unusual, not of
risk or opportunity.` (53 chars). Not in `SourceNote` — that note is about
  _where numbers came from_ and a statement about what a figure **means** is not
  provenance; that is where boilerplate goes to be ignored.
- **`0 of 3` is NOT a score of `0`.** `0` claims _we measured, and nothing is
  unusual_. Words rather than digits, never an em dash — `—` is `unchanged` in
  `PriceChange`, so a dash asserts zero.
- **No popover, no disclosure, no `Why this band?`, no tooltip, zero new tab
  stops.** `SecurityRow.tsx:98` wraps `AnomalyBadge` in `Popover title="Why this
band"` and `Popover.tsx` says the quiet part: _"the first thing this seam
  carries is an anomaly score's explanation."_ Right for a dense table row, wrong
  here: §11 requires every score to **carry** its explanation, not that it can be
  asked for one, and AC 6's elements cannot be audited by walking a DOM that does
  not contain them until a click.
- **No new motion.** A score is a **state**, so it persists; the shipped disc
  means _a bar arrived for this security_ and already fires 200 px above, because
  a revision **is** a bar arrival. A disc here would be a fourth meaning for one
  mark. **But evaluate `AbnormalMove.tsx:100-106`'s trigger in writing** — it
  names _"Story 5.6's band word, if it lands after the figure does"_ by name, and
  an unevaluated trigger reads identically to one that did not fire.
- **Probe before believing any of the above.** The reserve arithmetic predicts
  the band at **≈230 px** and the region at **256 → ≈486**, firing
  `MARKET-OVERVIEW.md` §1.4's trigger a **fourth** time — the largest step any
  band has taken. The method reproduces the two shipped bands exactly (142 and
  114, confirmed against a probe), which is why it is trusted and still not
  believed: `pnpm probe /securities/NVDA --within "Abnormal-move indicators"` at four widths, and
  the clause-track budget via `pnpm probe --story … --viewports 374x900`.
- **Author the canvas pages**, pre-authorised. Page A `The score, and the account
beneath it`, and a dated amendment to `The rail that says how unusual`
  correcting §07's specimen on four counts (20-session → 60-session, `normal` →
  `typical`, level → rate, and the stacked arrangement).
  - **Draw the arc to REJECT it.** A meter shape is what makes a figure read as a
    risk meter, and AC 11's sentence cannot out-argue a picture of a needle. If
    the rejection is not drawn, the next author adds one in good faith.

## Amended by Task 5.6.4 — 2026-10-23: a score DRAWS on this machine, which no earlier task in this epic could say

**Measured off the running backend**: `625 B`, `score 35 · band elevated`,
`max 35`, the addition closing on the wire. The mechanism is the one nobody
anticipated — **nothing observed** means the price factor refuses
(`no-subject-move`), but the subject's and its benchmark's **stored
close-to-close moves share a basis**, so the excess factor ranks at the 99th.

**So you can probe a REAL drawn score, not only a furnished one.** That is new in
this epic: Story 5.2's return needs process memory, 5.3's percentile needs a live
window, and 5.5's volume needs an `iex` tape this store does not hold. The excess
factor needs only **stored daily closes**.

What that obliges of you:

- **Probe the drawn state against a real frame as well as furnished ones**, and
  say which figures came from which. A furnished state proves fidelity; a real
  one proves the producer agrees.
- **The `2 of 3` label is NOT reachable here** — the price factor refuses on this
  store, so the live local state is `1 of 3 · max 35`. Do not photograph `1 of 3`
  and record it as the common case; the deployed common case is `2 of 3`.
- **CI is unchanged**: zero bars, no stored closes, every factor absent, so
  `0 of 3` stays its permanent state and the gated criteria do not move.
- **The sketch in this file prints `2 of 3` with `38 + 23 = 61`**, which is the
  deployed shape rather than the local one. Keep it as the target and probe both.

## Done when

1. The score, its chip and the ledger draw, with the ledger's column summing to
   the score **on screen** in every state.
2. The region is **one height in every state at four widths**, probed and recorded
   per width.
3. Every state in the enumerated set is reachable and no two read identically.
4. Amber appears once, held by an invariant with a break.
5. Both reversal triggers evaluated in writing.
6. Canvas pages authored and uploaded; §07 corrected with a date.
7. `pnpm verify`, `pnpm e2e` green at two workers.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-23

**The score draws, and a REAL one draws on this laptop** — `35 / 100` with an
`ELEVATED` chip on `/securities/NVDA` against the running backend, not a
furnished frame.

### What is on screen

The first band of `Abnormal-move indicators`, above the three it summarises:
the micro label `HOW UNUSUAL · NOT A RISK MEASURE`, the figure at
`--font-size-metric` with `/ 100` at micro on the same baseline, the band chip
beside them, `2 of 3 factors contributing · max 75`, a four-row ledger, the
breadth clause, and `A measure of how unusual, not of risk or opportunity.`

### The probed heights — per state, per width, verbatim

`pnpm probe /securities/NVDA --within "Abnormal-move indicators"`, 2026-10-23,
against the real frame:

```
=== 1440 × 900    region  419×500   indicator 419×232   figure.scoreFigure 419×28
=== 1024 × 900    region  446×500   indicator 446×232   figure.scoreFigure 446×28
===  768 × 800    region  318×500   indicator 318×232   figure.scoreFigure 318×28
===  390 × 780    region  308×500   indicator 308×232   figure.scoreFigure 308×28
```

**256 → 500 px, +244, uniform at all four widths.** The band itself is 232 px
plus the 12 px separator. The brief predicted **≈230** and **256 → ≈486**;
right about the mechanism, **wrong by 14 px** — see the two measurements under
_where the brief was wrong_.

Thirteen states at the rail's narrowest content box
(`pnpm probe --story market-abnormalmove--… --viewports 374x900`), every one
**308×500**:

```
score                              region  308×500
score-normal                       region  308×500
score-high                         region  308×500
score-extreme                      region  308×500
score-one-factor                   region  308×500
no-score                           region  308×500
score-inapplicable-factor          region  308×500
score-with-observed-breadth        region  308×500
score-without-breadth              region  308×500
measured                           region  308×500
no-frame-yet                       region  308×500
in-the-opening-bucket              region  308×500
volume-multiple                    region  308×500
```

And six of them re-taken at the 419 px box (`--viewports 485x900`): `score`,
`no-score`, `score-one-factor`, `score-with-observed-breadth`, `measured`,
`score-extreme` — all **419×500**.

`Relative performance` below it is unchanged at **240 / 240 / 240 / 302** and
moves down 244 px once, at the release.

### Which states are REAL and which are furnished

**Real, off the running backend, photographed on the route:** `35 / 100`,
`elevated`, `1 of 3 factors contributing · max 35`, the ledger reading
`Price 40 no move for this name` / `Relative move 35 35` /
`Volume 25 no history to rank it` / `Breadth stated as context`, and
`Breadth: 334 of 501 advancing, with a close on 2026-09-11.` The mechanism is
Task 5.6.4's: nothing is observed, so the price factor refuses with
`no-subject-move`, while the subject's and its benchmark's stored
close-to-close moves share a basis and the excess factor ranks at the 99th.

**Furnished — but furnished by the SHIPPED SCORER, not typed.** Every story
payload is `toWireAnomalyScore(scoreAnomaly({ price, excess, volume }))`, the
two functions the gateway itself calls, so the published contributions are the
ones the arithmetic produced and the addition on screen closes because it is
the same addition. `2 of 3` with `38 + 23 = 61` is the **deployed** common case
and is not reachable on this machine; `0 of 3` is CI's permanent state and is
reachable nowhere else.

**What no gated machine and no person has seen**: `high`, `extreme`, a
three-factor score (structurally unreachable while `0015` stores a median and a
dispersion rather than a distribution), and the whole band against a live feed.

### Both reversal triggers, evaluated in writing

**1. `AbnormalMove.tsx`'s live-region trigger — FIRED, verdict still NO.** The
clause names this story's band word by name, and a band word is terminal and
does arrive on the frame carrying the figure. It is refused on the second
conjunct, which the clause's own author did not notice is false of a band:
_arrives unprompted after the reader has had time to read the region_ is a
claim about **one** arrival, and a band is a **threshold crossing** on a figure
replaced 6.8–16.1 times a minute. A score oscillating one point either side of
32 crosses `normal`/`elevated` on every batch, so what a live region would
announce is _the score is near a floor_, four to sixteen times a minute, with
nothing having happened — strictly worse than the figure's own churn, because a
word reads as a verdict where a number reads as a reading. The measurement
behind it: Task 5.6.3's distribution puts **82%** of the universe in the two
bands either side of that floor at a median instant, so the oscillating case is
the ordinary case. The clause is **sharpened a second time** in the file: the
condition now adds _and cannot recur under an unchanged subject_.

**2. `MARKET-OVERVIEW.md` §1.4's height trigger — FIRED a FOURTH time**, under
the second half of its widened wording. Recorded there with the before and
after per width: 256 → 500 at all four, `Relative performance` unchanged and
displaced 244 px, and the 14 px the derivation missed.

### The check and its breaks

`amber-appears-once-in-the-rail` (72 invariants, was 71): the anomaly ramp is
spent by exactly one shipped stylesheet, and never in `color`.

**Two breaks, each proving a different clause**, because the first clause is
structurally blind to the second's defect.

- `the-score-is-tinted-to-match-its-chip` — the edit the next author makes in
  good faith. **Hand-performed with the registry substitution verbatim**,
  because `pnpm break` refuses a dirty target and this task may not commit.
  Red, with the right clause and the right subject:

  ```
  ✗ amber-appears-once-in-the-rail
    1 stylesheet(s) besides the band chip spend the anomaly ramp:
      apps/frontend/src/components/AbnormalMove/AbnormalMove.module.css
  1 of 72 invariants failed.
  ```

  File restored and diffed byte-identical.

- `the-band-chip-puts-its-ramp-in-the-ink` — run through the harness:

  ```
  ✓ apps/frontend/src/components/AnomalyBadge/AnomalyBadge.module.css
    broken → red → restored byte-identical.
    matched: amber-appears-once-in-the-rail
  ```

  Proved **separately** because the first clause is silent on it: the defect is
  in the one file allowed to spend the ramp, so without this clause the chip
  could put amber in `color` — under 2.2:1 on both page grounds — and the run
  would print `72 invariants hold.`

Both substitutions **keep the found line and append the defect beside it**, so
the `find` survives its own break.

### Where this task's brief was wrong about the tree

1. **The chip costs 2 px, not 0.** The brief derived 0 from `.percentile` and
   `.comparand`; both have **no padding**, and `AnomalyBadge` has
   `var(--space-4)` top and bottom, so its box is 24 px against a 16 px line
   and baseline-aligned in a 26 px metric row it hangs 2 px below the
   descender. Measured 28 px at all four widths. The chip is drawn only where
   there is a score, so without a floor the band would be 26 px in its refusal
   states and 28 with a figure — `.scoreFigure` reserves 28 in every state.
   Baseline alignment is **kept**; centring would hold 26 and is the
   arrangement `.percentile` photographed at 8× and rejected.

2. **The specimen's volume reason `no IEX volume history` is unreachable.** A
   volume refusal cannot become a `refused` clause at all — the volume bound is
   a function of a measured per-bucket dispersion rather than a count — so
   `volumeFactorAnswer()` takes no argument and the volume row is
   `no-distribution` **always**, on every machine. Its reason is
   `no history to rank it`.

3. **The specimen's breadth denominator is the wrong set.** `312 of 501
equities advancing` counts over the securities we **heard from** and states it
   against the 501 we **track**. The shipped clause states `measured`:
   `Breadth: 312 of 466 advancing, heard from in the last 5 minutes.`

4. **The 24-character reason cell and `composite-score.ts`' hand-off cannot
   both be met**, and the brief is the one that was followed. That file's
   `no-distribution` arm says the owner's sentence _"Measured, but no history
   to rank it against."_ is **drawn by Task 5.6.5 and spelled in exactly one
   place there** — 43 characters, against a cell measured at ~185 px (≈34
   characters) in the rail's narrowest box. The ledger draws the 21-character
   `no history to rank it` instead, and **the owner's sentence is not drawn
   anywhere**. Routed rather than decided: if the verbatim sentence is wanted,
   it needs a line of its own and the band grows.

5. **A fourth ledger column does not fit and the reason had to replace the
   figure.** Probed: a separate reason column leaves it **97 px** at 390,
   against a 22-character vocabulary, so every refused row wrapped and the
   ledger's height became a function of the viewport. The reason now stands in
   the contributed cell — `return-percentile.ts`' own _replacing a clause
   rather than adding a row_ idiom — which also removed **every em dash from
   the band**: the specimen drew `—` in the weight and contributed columns, and
   a dash where a figure goes asserts a zero.

### What was NOT done

- **The canvas pages.** `DesignSync` is absent from the subagent registry, so
  the canvas is unreachable from here. Page A, the dated §07 correction and the
  **drawn rejection of the arc** are owed. The arc's rejection is argued in
  `anomaly-score.ts` beside `SCORE_SCALE` so it is at least written down.
- **`pnpm e2e`** — the orchestrator's to run.
- **`SecurityRow`'s `Popover`** — untouched by instruction; Task 5.6.6's.

### Gates

`pnpm verify` **EXIT 0**, `72 invariants hold.`, **zero** `Unhandled` lines in
the log. shared 603, backend 1312, frontend **1680**, process 61.

## Verified by the orchestrator — 2026-10-23, and one thing corrected

**The probe, re-run independently:**

```
=== 1440 × 900   region 419×500   indicator 419×232   figure.scoreFigure 419×28
=== 1024 × 900   region 446×500   indicator 446×232   figure.scoreFigure 446×28
===  768 × 800   region 318×500   indicator 318×232   figure.scoreFigure 318×28
===  390 × 780   region 308×500   indicator 308×232   figure.scoreFigure 308×28
```

**`232 + 12 + 142 + 12 + 102 = 500`** — the three bands and their two separators
close exactly, at every width. **256 → 500, +244 uniform.**

**And I looked at the screenshot**, which this repository's own working loop puts
above any suite: `35 / 100` beside an `ELEVATED` chip, `1 of 3 factors
contributing · max 35`, the ledger's single contribution summing to the figure
above it, the breadth line, and the disclaimer. Amber appears **once**. The
figure reads as an instrument rather than a dashboard gauge, which was the
design risk.

### The one thing I corrected

`composite-score.ts` claimed the owner's sentence
`Measured, but no history to rank it against.` _"is drawn by Task 5.6.5 and
spelled in exactly one place there."_ **It is drawn nowhere.** The ledger's
reason cell is ~34 characters at the rail's narrowest box and that sentence is
43, so the shipped cell reads `no history to rank it` — correct for the cell, and
not what the docblock claimed.

**A claim about a mechanism reads identically whether the mechanism is there or
not**, which is this repository's most-recorded failure mode, so the docblock is
corrected in place rather than left for somebody to discover by going to use it.
What is owed is a **product question for Gate 2**: the owner's full sentence has
no home, and the honest one is the volume band beside a **drawn** multiple — the
only place a reader can ask why a figure they can see is not scored. That state
needs `iex` depth no machine here has, so it is put to the owner rather than
guessed at.

### What the developer corrected in MY brief — five, all upheld

1. **The chip costs 2 px, not 0.** `.percentile`/`.comparand` carry no padding;
   `AnomalyBadge` has `--space-4` top and bottom, so baseline-aligned in a 26 px
   row it hangs 2 px below the descender. The figure row reserves **28** in every
   state, so the band does not step between refusing and scored.
2. **The specimen's `Volume 25 — no IEX volume history` is unreachable.** A
   volume refusal cannot become a `refused` clause; the arm is `no-distribution`
   **always**.
3. **The specimen's breadth denominator was the wrong set** — counted over what
   we heard from, not the 501 tracked.
4. **The 24-character cell and the shared module's hand-off cannot both be met**
   — which is the finding above, routed rather than decided.
5. **A fourth ledger column does not fit** at 390: every refused row wrapped and
   the ledger's height became a function of the viewport. The reason now
   **replaces** the figure in the contributed cell, which also removed **every em
   dash from the band** — the specimen had drawn `—` in two columns, and a dash
   asserts `unchanged` in this product.

### Both triggers, and one sharpened for the third time

The **live-region trigger fired and the verdict is still no**, refused on a
conjunct its own author did not notice is false of a band: _arrives unprompted
after the reader has had time to read_ describes **one** arrival, but a band is a
**threshold crossing** on a figure replaced 6.8–16.1 times a minute. A score
oscillating around 32 crosses `normal`/`elevated` **every batch**, announcing
_the score is near a floor_ with nothing having happened — and Task 5.6.3's
distribution puts **82% of the universe in the two bands either side of that
floor**, so that is the ordinary case rather than an edge one. The clause is
sharpened again: `…and cannot recur under an unchanged subject`.

**`MARKET-OVERVIEW.md` §1.4 fired a fourth time**, recorded there with before and
after per width.

### Two breaks, because the first is blind to the second's defect

The chip's own file is **allowed** to spend the ramp, so without a second `color`
clause a chip tinting its **ink** — under 2.2:1 — prints `72 invariants hold.`
Both substitutions keep the found line and append beside it.

## The browser suite found two real consequences, and both were MINE

The developer did not run `pnpm e2e` — I did, and it was red. **Neither failure
was a flake and neither was a test being precious.** Both are genuine
consequences of drawing a score, and both are repaired at the cause rather than
at the assertion.

### 1. The page now holds TWO tables, and neither had a name

`getByRole("table")` became a **strict-mode violation**: the ledger is a real
`<table>` — correct markup for a factor/weight/contribution grid with column
headers — so `security-price-motion.spec.ts` resolved two elements where it
expected one.

**The spec was right and the markup was incomplete.** Two tables on one page
sharing no accessible name between them is a defect **for a listener** before it
is one for a spec: a screen reader announces _table_ twice and distinguishes them
by nothing. `UniverseTable` had already solved this with a **visually-hidden
`<caption>`**, so the ledger follows that idiom rather than inventing an
`aria-label`:

```
<caption className={cx(styles.ledgerCaption)}>How this score was reached</caption>
```

The spec then names which table it means. **Both halves were owed** — fixing only
the spec would have left the listener's defect shipped and the suite green, which
is the worse outcome of the two.

### 2. The score band pushes the two plots apart FROM THE OTHER COLUMN

`the two plots hang on one axis and stop at the same pixel` breached its ceiling:
**225 against `< 220`**. Its comment states the ceiling's purpose precisely —
_"what the ceiling refuses is a **third block arriving in the gap**"_ — and
**nothing arrived in the gap**.

The band made this region **244 px taller**, and at 1440 it is the **opposite
column's sibling**, so the grid row stretches, the Price panel grows to **511**,
and the plots are pushed apart **from outside the gap entirely**. The developer
measured the rail and `Relative performance` and did not measure this; it is the
consequence nobody predicted.

**Measured at four widths rather than argued**, with a throwaway spec deleted
after the run:

| width | gap                                          |
| ----- | -------------------------------------------- |
| 1440  | **225**                                      |
| 1024  | 195                                          |
| 768   | 195                                          |
| 390   | 752 (one column; the assertion does not run) |

**Only 1440 moved**, because only there is the rail a sibling column — 1024 and
768 sit on the stated 190 floor untouched.

**The ceiling is re-measured to 235, not raised to admit the change.** The floor
is still 190, the stretch accounts for 35, and the third block the ceiling exists
to refuse — the Volume region's deleted two-line paragraph, ~32 px — would read
**257** and still breach. The headroom narrows from 30 px to 10 px, which is the
honest cost of the step and is recorded as such. **A ceiling moved to admit
today's change without measuring what it now permits has stopped guarding
anything.**

### And a process note against myself

I started that first suite at a load average of **8.72**, above the threshold of
7 this repository's own amendment sets and which I have quoted at three agents in
this story. It did not cause either failure — both reproduce on a settled machine
and both are real — but the run was not one I could have trusted if it had been
green, and a measurement taken above the threshold is worth nothing either way.

## For a stakeholder — a status report, 2026-10-23

**MarketPulse now puts a number on how unusual a security's behaviour is, and
shows its working.** The security page opens with a score out of 100, a word
for what that score means, and a four-line account a reader can add up
themselves — which is the sentence this epic exists for and the first 0–100
figure the product has ever drawn.

**It is honest about what it does not know.** Of the three things the score
weighs, only one or two can be measured today; the account names each one, says
what it was worth and why it is missing, and where nothing at all could be
measured the product says so in words rather than printing a zero.

**Two sentences say what it is not.** A number on an amber scale beside a price
is read as a risk meter by every stranger, so the band says _how unusual, not a
risk measure_ above the figure and _a measure of how unusual, not of risk or
opportunity_ beneath it.

**What is owed**: a person has still not watched any of this against a live
market, and the design canvas could not be updated from this session.
