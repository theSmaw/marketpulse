# Epic 2 — Security Universe & Historical Market Data

**Status:** Not started
**Sequence:** 2 of 15 — follows Epic 1 (Application Foundation)
**Spec references:** PRODUCT_SPEC.md §6 (initial market universe), §7.1 (Alpaca), §8.3 (Security Explorer), §30 (storage)

## Goal

Create the basic financial-market domain and allow users to explore historical data.

## Outcome

A user can select one of the tracked securities and inspect its historical price and volume data.

## Scope

* Security domain model
* Initial ~100-security universe
* ETF/sector metadata
* Market-data provider abstraction
* Alpaca historical-data integration
* Historical market-data persistence/cache
* Security search/select
* Basic price chart
* Basic volume chart
* Time-window selection
* Market-data provenance display

## Exit criteria

A user can search for a security such as NVDA, open it, and inspect recent historical price and volume data.
