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
