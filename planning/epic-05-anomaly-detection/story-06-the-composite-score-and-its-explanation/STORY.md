# Story 5.6 — The Composite Score, & Its Explanation

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.4, 5.5
**Epic scope covered:** composite anomaly score, human-readable anomaly explanation

## Description

**This is the story where the product says the sentence the epic exists for**,
and the first time a 0–100 figure appears anywhere.

Three factors are scored — the price percentile, the volume ratio and the
relative move — and **breadth is a stated clause rather than a weight** (Story
5.1's decision 4). The score is **absolutely calibrated** against each
security's own history (decision 5), so a quiet day produces no high scores and
the product says so.

**The combination rule has one honest family.** A weighted sum is the only one
where _"this score is 91 because the price term contributed 38 of its 40"_ is a
true sentence a reader can check by addition — which is what §11's
_interpretable rather than sophisticated_ asks for. The alternatives were each
refused for a stated reason: **max** throws away corroboration; a **product**
lets one absent factor annihilate the score; **rank-based cross-sectional**
guarantees a 91 on a dead day; **Mahalanobis or PCA** is excluded by
_interpretable_ and is unexplainable to a reader.

**Every factor must be in the same unit before combining, and exactly one unit
needs no invented constant: a percentile of that factor's own history.** The
price factor is already one. A volume **ratio** and an **excess move** are not
0–100 and need a mapping — and any curve (a log cap at 10×, a sigmoid, a chosen
knee) is a constant somebody invented that would outlive the guess, which is
exactly what `AnomalyBadge` refused to do with the band boundaries.

**And the score and its explanation should be one thing rather than two.** §11's
last line and invariant 1 are strongest expressed as a type: **`AnomalyScore`
cannot be constructed without its explanation, and the explanation cannot hold
a figure that was not produced by a named calculation.** That makes _every score
can be explained from deterministic calculations_ a compile error rather than a
test.

## What the user can see when this story lands

**`ANOMALY 91` — or more often `ANOMALY 12` — on the security page**, with its
band, and its own account beneath it: one clause per contributing factor with
the figure in the product's own units, one clause per **absent** factor, how
much of the window was observed, the tape each figure came from, and the
breadth clause as context.

**And `/`'s `Unusual activity` upgrades from band-only to the composite**, so
the two surfaces finally agree about what is ranked.

## Acceptance criteria

1. **The four band boundaries are decided and recorded with their
   alternatives.** `anomaly.ts` and `AnomalyBadge` have deliberately omitted
   them because _"a threshold invented in a styling task would outlive the
   guess"_. They are **coupled to Story 5.4's measured row count**: the
   boundaries decide how many rows typically qualify, and the region cannot
   grow.
2. **The weights are published on screen in the explanation**, so their
   arbitrariness is visible rather than hidden.
3. **No imputation, and no silent renormalisation over the present factors.**
   Renormalising raises the variance of a score computed from fewer factors,
   which **systematically promotes the worst-covered securities into the
   top-N** — the opposite of what `UNIVERSE.md` rule 4 spent ~19 discretionary
   curation slots to prevent. **The number of contributing factors is part of
   the score's identity**: a 2-of-4 score is reported, labelled, and not ranked
   against a 4-of-4 score.
4. **The score is unsigned and carries no direction.** A score higher for falls
   than rises is a risk signal, which §11 forbids in terms.
5. **`AnomalyScore` cannot be constructed without its explanation** (above),
   and every figure in an explanation traces to a named calculation — asserted
   by walking the explanation rather than by reading it.
6. **The explanation carries all nine required elements**: the score and band;
   one clause per contributing factor with its figure and definition; one clause
   per absent factor distinguishing _no data_ from _refused_; how much of the
   window was observed for **this** security; the instant the figures were
   observed **through**, never the instant the score was computed; the tape or
   tapes; the population every group-level figure was counted over, as counts
   rather than percentages, from the one shared builder; the
   **`classification.checkedOn` date** wherever a sector or industry is named;
   and **no causal language** — causality is §5.3's confidence vocabulary and
   belongs to findings, not scores.
7. **Factor clauses carry figures, not intensity adjectives.** `99th percentile
of 4,620 five-minute returns` rather than `Extreme` — because `extreme` is
   also a band name, and the word for one factor's clause disagreeing with the
   word for the whole security's band is a collision waiting to render.
8. **`AnomalyBadge` and `SecurityRow` are adopted or deleted, and the
   disposition is recorded.** Both are currently rendered by nothing shipped,
   `pnpm verify` cannot see it, and the decisions in them — four named bands
   rather than a gradient, deliberately, because a band can be labelled — must
   not be thrown away silently.
9. **The relative-move factor's reference is decided**: the capitalisation-
   weighted sector ETF, or the unweighted **industry peer median**. The ETF's
   weighting means a mega-cap is largely compared with itself, so **scores
   computed from that ratio are not comparable across securities of different
   weight and nothing has measured the effect** — which makes a top-N over it a
   top-N of small constituents. The peer median removes the bias and makes the
   group reference the same population as the breadth clause.
10. **A score is never silently re-based onto a newer minute while a reader is
    looking at it.** It names the bar instant it was computed from, and a
    revision for that instant **recomputes in place** — the crosshair's own
    decision (Task 3.9.6), because a mark behaving differently from the
    crosshair on the same axis would be two answers about one bar.
11. One sentence, once, on the security page and not on the list: **the score
    does not represent risk or investment opportunity.** A 0–100 figure on an
    amber ramp beside a price is read as a risk meter by every stranger, and
    §40's criterion is a first-time viewer understanding the product in a
    minute.
12. The gated criteria are the ones a zero-bar store can prove: a score cannot
    exist without its explanation; identical inputs give an identical score
    byte-for-byte; the scorer reads no clock, socket or handle; **monotonicity**
    — a larger |return| with everything else equal never scores lower; and on
    CI's permanent state **every score is absent and every region draws its
    honest sentence**.

## Design work

The 0–100 figure, its band chip and its explanation, in the region whose
reserved sentence already promises exactly this: _"How unusual this security's
behaviour is right now, scored 0–100 with the reason beside it."_ **The canvas
needs a page for it** — there is none — and the explanation is the first
multi-clause account of a figure this product has drawn.

## Out of scope

`Anomaly history`, any score in the universe table, and Epic 7's `Investigate`.

## Handed here by Story 5.1's close — 2026-10-13: the one amber position, a deferred decision with your name on it, and a lane you must not re-site

**1. The relative move you are scoring is already computed, drawn and refused.**
`relativePerformance` in `apps/frontend/src/market/` produces the subject's move,
its sector benchmark's, the broad market's, and the two differences in
**percentage points** — and **refuses the subtraction when the two moves were
measured from different closes**, which happens every day between the overnight
backfill and the next opening bell. **A scored factor must inherit that
refusal**: a factor that silently scores a mixed-basis difference produces a
well-formed, correctly-coloured number that is wrong in exactly the way the
region above it declined to be.

**2. The ETF-versus-peer-median decision is yours, by name, and it is recorded
rather than assumed.** Story 5.1's AC 3 says the region names what its reference
is — a sector SPDR is **capitalisation-weighted**, so a mega-cap is largely being
compared with itself and a small constituent's excess is structurally amplified.
Whether the **scored** factor uses that ETF or an unweighted **industry peer
median** was deliberately left open for you. Whichever you take, the sentence on
screen has to match it: the one in the region today reads _"Each reference is a
benchmark ETF — capitalisation-weighted, not the average of its members"_, it
lives in **one** constant (`CAP_WEIGHTED_CLAUSE`), and
`one-home-for-the-cap-weighting-clause` fails the build on a second copy.

**3. Amber appears exactly ONCE in the rail** — as the band's fill **behind its
written band name** — and the plot's marker lane is its one inheritance. Not on a
difference, not on a score, not on a reference. The four band words are
`normal · elevated · high · extreme` (renamed 2026-10-13, Task 5.1.1), and
`--anomaly-unusual` no longer exists.

**4. The chart's anomaly marker lane is already sited and you must not re-site
it.** `VISUAL-LANGUAGE.md`'s _Room reserved for what arrives later_ gives it a
**16 px lane inside the plot's TOP padding**, at the bar's x, carrying **the
score as a number** because the ramp is a fill behind a written name and no name
fits at a bar's width. Story 5.1's canvas page drew it **below** the plot first
and that was wrong twice over: Epic 9's `--chart-filing-lane: 14px` already lives
there, and the top padding is already paid for so a lane in it displaces nothing.
Three constraints travel with it — it is derived from the **bars** rather than
the window, so it stops at the coverage edge; its count is bounded by
**occasions** rather than bars, which is the only reason it is drawable at the
9,750-bar cap, and **a mark per bar is refused in advance**; and **the lane is
reserved by prose only** — `--chart-filing-lane` is a token and there is no
`--chart-anomaly-lane`, so **the first component that draws the lane owes
`--chart-anomaly-lane: 16px` in the same change**.

**5. Every score carries its explanation** — invariant 1's companion, not a
layout preference — so the region has a prose band and the band is not optional.
The rail's one-height rule applies: `Relative performance` is **240 / 240 / 240 /
302 px** across nine states, and `MARKET-OVERVIEW.md` §1.4's trigger has already
fired once on this route.

## Handed here by Story 5.3's close — 2026-10-14: the first scored factor exists, and it refuses in two ways you must carry

**1. The price percentile is a scored factor now, and it has a shape you
inherit.** `99th percentile of 4,620 5-minute returns` — **integer ordinals
only**, `>99th` at the ceiling because above the highest order statistic there is
no sample, and the **counted** `n` rather than a constant (measured min **737**,
max **4,620** over 511 securities). `PRODUCT_SPEC.md` §11 and §5.1 carry dated
amendments saying why its own `99.1st` example cannot be printed.

**2. It refuses in TWO ways and they do not read alike** — _we have too little
history_ (`Baseline too short to rank — 1,240 of 2,500 returns`) and _the history
we have contains a price break we cannot adjust_ (`Baseline crosses an unadjusted
price break — not comparable`). They share exactly `["Baseline", "—"]` and no
more, deliberately. **A composite that averages over a refused factor is a score
built on a number that was withheld on purpose**, so the score owes its own
answer to _what does the composite do when a factor refuses_ — and `0` is not it.

**3. Every score carries its explanation, and this factor's explanation already
exists**: the sample's size and its shape (`· all times of day pooled`), plus the
opening-bias clause when **the figure's own window** falls in the first thirty
minutes. That clause is read off the bar's `startsAt`, never a clock —
`the-opening-bias-is-read-off-the-figure` holds it, with the break
`the-opening-bias-asked-the-wall-clock`.

**4. The band you draw goes in a region that is 142 px in all 72 readings**, and
one step per story that adds a band is the accepted price — recorded as a probed
figure per width so you amend a measurement rather than inherit a guess. **The
amber band fill is still the one amber position in the rail**, behind its
**written** name.

**5. The three correctness layers are not interchangeable**, which Story 5.3
proved rather than asserted: a planted signed-percentile defect was caught by
**properties only**, `rank + 1` by the **golden sample only**, and
`rank × 0.8 when n > 500` by the **independent recompute only — with the golden
sample green**. A composite is harder to eyeball than a percentile, so expect to
pay for all three again.

## Handed here by Story 5.4's Gate 1 — 2026-10-15: the band chip on `/` is yours, and so is the amber collision

**1. Story 5.4 ships NO band chip, so you are the story that first draws one on
`/`.** Its Gate 1 decision was to rank `Unusual activity` by the **price
percentile** and draw the **ordinal** (`99th percentile`), because
`packages/shared/src/anomaly.ts` deliberately refuses to hold the score→band
boundaries — _"inventing thresholds now would be a number that outlives the
guess that produced it"_ — the four bands are defined for **your** composite
0–100 score, and 5.4 ranks on **one factor of four**, so a chip there would have
read `extreme` on price alone. **The percentile→band cut-points are still
unbuilt and they are yours**, with their alternatives and a reversal trigger.

**2. The amber ramp has FOUR meanings on one token and you are the story that
puts two of them in one frame.** Verified 2026-10-15: `market.css` resolves
**`--anomaly-high`, `--feed-stale`, `--service-degraded` and
`--provenance-synthetic` all to `--palette-amber: #e2b544`**. The status bar is
**sticky**, so a drawn `high` chip and a `STALE` feed cell are always in the
viewport together — directly adjacent at 390, ~700 px apart at 1440. It stays
**correct**, because neither is colour-only (the chip writes its band name
inside the fill, the cell writes the word), but it is not **coherent**, and the
deferred-versus-degraded hatch collision `MARKET-OVERVIEW.md` already records is
the same mistake one channel over.

**What to do with it, because arguing it will not settle it.** The ramp's
internal greyscale steps are **1.12 / 1.43 / 1.59** and the
chip-against-chrome step is **1.00** — so **no greyscale simulation of the
region alone can show this**. It needs a **conjunction** row in the kept
degraded grid: a drawn `high`/`extreme` chip **while** the feed is stale, and
again while the backend is degraded, at four widths, **in greyscale and in
colour**. A conjunction rather than a new surface, because the collision exists
only in the pairing. The candidate repair nobody has costed is moving
`--service-degraded` and `--provenance-synthetic` off the ramp — they are
chrome, and the anomaly ramp is the page's subject — but take that to Design
with the photographs in hand rather than before.

**3. `band` already names two different things in this code**, and 5.4 avoided
the collision only by shipping no chip. `ReturnBand` / `fiveMinuteReturnBand`
use _band_ for **a horizontal row** of `Abnormal-move indicators`, not a
classification, so a chip in those rows produces `ReturnBand.band`. **Rename one
before you write a line** — the recommendation is that the region's rows become
`IndicatorRow` and `band` is reserved for `AnomalyBand`, because `AnomalyBand`
crosses the wire and the other does not.

**4. `AnomalyBadge` ships `min-width: 6rem` (96 px) and has never been drawn on
a live surface** — its only consumers are the Story 1.4 demonstrator and
stories. On `/` the region sits in the **narrow** column: **~308 px of content
at 1440 and ~323 at 1024**, non-monotonically, so the full chip is roughly a
third of the row. Expect to owe a **compact variant that keeps the written
name** — never an abbreviation and never a dot, because the word inside the fill
is the entire second channel.

**5. The region you are amending states THREE populations and two bases.** Story
5.4 ships the 501 equities, the count heard from in the last five minutes, and
the count with a baseline long enough to rank — two sentences from the one
builder — plus an **observed** basis in session and a **session** basis out of
hours from a nightly persisted score. A composite adds the volume factor's own
population, so check whether your figure makes a **fourth** before assuming the
sentences still hold.

## Handed here by Story 5.5's close — 2026-10-20: your fourth factor is ABSENT for most securities, and that is the composite's problem rather than 5.5's

**1. The volume factor ships refused on every machine that exists, and will stay
refused for most securities after that.** Measured against the deployment on
2026-10-20: the same-tape `iex` baseline Gate 1 chose has **80 samples** a
bucket for `NVDA` — **the best case in the universe** — a relative standard
error of **10.65%**, and needs **132 sessions** to support one printed decimal.
On the **better** tape at **full** depth, **38,448 of 40,248 buckets refuse
(95.5%)** and **173 of 516 securities have no drawable bucket at all.**

**So `PRODUCT_SPEC.md` §11's four-factor composite has three factors and a
stated absence, for a long time.** Story 5.5's own AC 2 wrote the principle —
_"a composite with three factors and a stated absence beats a fourth factor with
an unmeasured bias"_ — and your story is where it has to be implemented. **Do
not re-weight silently.** A composite that quietly redistributes a missing
factor's weight across the other three is a different score wearing the same
number, and nothing on screen would say so.

**2. The volume figure is a RATE and its label is load-bearing.**
`Σvolume / spanMinutes ÷ median(one minute)`, drawn under **`VOLUME PER
MINUTE`** — because the arithmetic equals `Σvolume / (5 × median)` and **the
claim does not**: `5 × median` is _the typical five-minute volume_, and the
median of a sum is **not** five times the median of its parts. If the composite
restates the volume input in its own words, restate it as a **rate** or the
explanation is wrong about what was measured.
[ADR 0045](../../../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md)
decision 2 is the rule.

**3. Six refusal kinds, and they must survive into your explanation.**
`no-same-tape-baseline`, `too-few-sessions`, `split-discontinuity`,
`zero-volume-baseline`, `no-bar-in-bucket`, `bucket-partially-observed`. **Four
pairs would read alike if collapsed** and one of them matters to you
particularly: `too-few-sessions` against `no-same-tape-baseline` is **a wait**
against **a gap in our listening**, and a composite that reports "volume
unavailable" for both has thrown away the only information a reader could act
on.

**4. `typical` is the volume word and `normal` is a BAND name — and §11
contradicts itself.** Story 5.5's AC 3 settled it and swept two live sentences
in `VISUAL-LANGUAGE.md` the same day. **Your composite example is the other
side of that collision**: §11's `Volume 3.8× normal` is the exit criterion's own
wording and it is **wrong twice over** — the word is `typical`, and the figure
is a rate. Expect to amend `PRODUCT_SPEC.md` §11 rather than implement it as
written.

**5. The multiple's cap and floor are shipped and are yours to reuse, not
redecide.** `>999× typical` and `<0.1× typical`, both re-using the percentile's
shipped `>` glyph. The floor exists because `toFixed(1)` renders anything below
0.05 as **`0.0×`**, which reads as _nothing traded_ — AC 4's defect arriving at
the formatter. `one-home-for-the-multiple-glyph` refuses a second speller, and
**its break's plant is `composite-score.ts`** — your file, under its likely
name. Import `formatMultiple`; do not write a second `×`.

**6. And the region is 256 px now, not 142.** Story 5.5 measured `142 → 256`,
**+114** uniform at four widths, firing `MARKET-OVERVIEW.md` §1.4's trigger a
**third** time. Two states were **282 px** and the cause was **sentences rather
than geometry**, so the budget is recorded: **58 characters fit at 308 px, 62 do
not.** A band you add inherits that ceiling.
