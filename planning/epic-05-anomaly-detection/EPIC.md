# Epic 5 — Anomaly Detection

**Status:** Not started
**Sequence:** 5 of 15 — follows Epic 4 (Market Overview)
**Spec references:** PRODUCT_SPEC.md §11 (unusual activity detection)

## Goal

Automatically identify market behaviour worth investigating.

## Outcome

MarketPulse continuously assigns explainable anomaly scores to securities.

## Scope

- 5-minute return calculations
- Historical return distributions
- Return percentile calculation
- Intraday volume baseline
- Volume-ratio calculation
- Market-relative movement
- Sector-relative movement
- Composite anomaly score
- Human-readable anomaly explanation
- Unusual-activity ranking

## Exit criteria

MarketPulse can surface securities such as:

> NVDA — Anomaly 91
> Extreme short-term move
> Volume 3.8× normal
> Underperforming semiconductor peers

Every score can be explained from deterministic calculations.

## A condition this epic is most likely to fire, written here so it arrives rather than being rediscovered

**Added 2026-09-15 by Task 2.14.8.** Epic 2 ships a measured breach of
`PRODUCT_SPEC.md` §28's _no routine main-thread task over 50 ms_: every cold
load of `/securities` and `/securities/:symbol` spends one task of **50–76 ms**,
and it is the **518-row tracked-universe table** rather than the chart. It is
handed to **Epic 14** by name, with the figures and three candidate repairs in
[that epic's `EPIC.md`](../epic-14-performance-scale-validation/EPIC.md).

**But its reversal trigger is a condition rather than an epic number, and this
epic is the named candidate for firing it: _the first time a second surface on
that page renders per-row markup at universe scale._**

Two of this epic's scope bullets — the composite anomaly score and the
unusual-activity ranking — become a number per security, and the obvious place a
reader wants that number is beside each row of the tracked universe. **That is
the trigger.** Two helpings of a fifty-millisecond task in one page load is a
delay nobody mistakes for a slow laptop.

So if this epic puts an anomaly score in that table, **the table's repair is due
in this epic and not at Epic 14's convenience** — and the honest alternative,
which is cheaper and may well be the right product answer, is to rank into a
**top-N feed** (`PRODUCT_SPEC.md` §9's _Unusual Activity_ panel is a short list,
not 518 rows) and leave the universe table alone. Either is fine; deciding by
accident is not.

**Re-measure rather than cite**: the figures above are dated observations of one
laptop, and the method is in Epic 14's `EPIC.md`.

## What Epic 2 measured that every score here rests on (added 2026-09-15)

An anomaly score is a comparison, and Epic 2 measured three properties of the
data being compared that decide whether a score means anything. Each is recorded
in a document this epic has no reason to open, and each produces a number that
looks right.

- **Volume ratio and return percentile over a live tail are computed on IEX.**
  Median minute coverage is **82.8%**, worst case **43.1%** (`CCI`), against
  **99.7%** on the consolidated tape — `ALPACA.md` §5.2, measured 2026-09-07. An
  absent bar is **ordinary** on IEX and **notable** on SIP, so "volume 3.8×
  normal" computed with a live IEX numerator over a stored SIP baseline is
  comparing two different tapes. `UNIVERSE.md` rule 4 already pulled on this
  once: **liquidity means liquid _on IEX_**, because a name liquid on the
  consolidated tape and thin on IEX "gives an anomaly score computed over
  noise", and ~19 discretionary slots in the curation exist for it.
- **"Relative to sector" has a benchmark; "relative to industry" does not.**
  The taxonomy is eleven sectors chosen on the criterion that each has a free
  ETF; **`industry` is a column with no benchmark attached, and `UNIVERSE.md` §5
  says in so many words that this epic must not assume one.** That matters
  because `PRODUCT_SPEC.md` §11's own breadth example — _82% of semiconductor
  securities currently negative_ — and §38's demo conclusion are **industry**-level
  claims. The curation guarantees one industry group deep enough for that
  sentence to be true of something (semiconductors); it guarantees no ETF to
  measure it against.
- **The sector SPDRs hold S&P 500 constituents only**, so a tracked equity
  outside the index is measured against a benchmark it is not in
  (`UNIVERSE.md` §5). Fine for a relative move; wrong for anything treating the
  ETF as the sector's membership.

**And the floor exists for this epic's sake**: a minimum of six equities per
sector, because below that a breadth percentage is arithmetic over so few names
that "67% of the sector is negative" means four securities, and a relative-move
score has no peers to be relative to.

**Re-measure rather than cite.** The coverage figures are dated observations of
a third party; `ALPACA.md`'s own header says to re-take them.
