# Epic 9 — Corporate Filing Evidence

**Status:** Not started
**Sequence:** 9 of 15 — follows Epic 8 (Evidence & Investigation Workspace)
**Spec references:** PRODUCT_SPEC.md §7.2 (SEC EDGAR), §16 (evidence)

## Goal

Add primary-source company information to investigations.

## Outcome

MarketPulse can identify whether relevant SEC filings occurred near a market event.

## Scope

- SEC EDGAR integration
- CIK/security mapping
- Recent-filing retrieval
- Filing metadata
- Filing timeline events
- Selected filing types
- Filing viewer/linking
- Filing evidence records
- Investigation filing-check tool
- Filing-source provenance

## Exit criteria

An investigation can reliably state either:

> A new 8-K was published at 10:31 ET.

or:

> No recent SEC filing was found.

with inspectable primary-source evidence.

## Handed here by Story 5.6's close — 2026-10-29: ADR 0045's test was restated, and it is the one you apply to a filing-day move

**ADR 0045 names this epic as meeting its test**, and the test's wording changed
on 2026-10-21 — so take it from the amendment rather than the original decision.

**The original wording refused a figure this product ships everywhere.** It
offered _a ratio **within** one tape_ (permitted) against _a level **across**
tapes_ (refused), and named _a percentage change_ as the first. But
`changeFromClose` has an **`iex` numerator and a `sip` denominator** (ADR 0038
decision 4), so it is a **ratio across tapes** — in neither category, and
literally refused by a rule nobody intended to refuse it.

**The restated test is EXTENSIVE versus INTENSIVE**: does the quantity scale with
how much of the market the tape saw? **Extensive** — a volume, a share count, a
trade count, a traded value — is refused across tapes, because the share **is**
the quantity. **Intensive** — a price, a return, a percentage change, a rank —
is permitted, because no venue-share factor multiplies it.

**For this epic that means a filing-day RETURN is permitted** — it is intensive,
and ADR 0045 says so by name. **A filing-day VOLUME is not**, and the measured
reason is that IEX's share runs **3.54% to 15.19%** across six securities,
**inversely with liquidity**, so a cross-tape volume comparison is wrong by a
factor between **12 and 45** depending on which security a reader opened. There
is no single multiplier to apply, which is why the ADR refuses rather than
corrects.
