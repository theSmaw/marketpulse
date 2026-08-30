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
