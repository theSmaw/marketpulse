# Story 2.13 — Volume Chart & Time-Window Selection

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.12
**Epic scope covered:** Basic volume chart; time-window selection

## Description

Add volume beneath the price chart, and give the user control of the period both charts
show. These are one story because they are one interaction: changing the window changes
both charts, and volume is only meaningful when it is aligned to the price it belongs to.

Volume is not decoration here. §11's anomaly detection is half a volume calculation, and
the flagship demo's line — "Volume 3.8× normal" — is a claim a user must be able to check
by looking. This story is where the product first shows the evidence behind that.

## What the user can see when this story lands

**Volume beneath the price, and the ability to change what period they are looking at** —
which is the first control in the product that changes what the data _says_ rather than how
it looks.

Concretely: a volume series aligned to the price chart above it, and a time-window control
that moves both together. Changing the window re-reads and redraws, with the loading and
partial states already established rather than a blank flash.

After this story, **the epic's exit criterion is met**: a user can search for NVDA, open it,
and inspect recent historical price and volume data.

## Why it sits here in the sequence

Immediately after the price chart, reusing its axis and interaction. It completes the
epic's exit criterion: recent historical **price and volume** data.

## Scope

- The volume chart: bars beneath the price chart, sharing its x-axis exactly, with its own
  scale
- Axis alignment as a structural property rather than a coincidence — a shared scale
  object, so the two cannot drift apart when the window changes
- Shared interaction: hovering or focusing a point reads both price and volume for that
  moment
- Volume formatting — millions and billions abbreviate, and the abbreviation must not break
  Story 1.4's tabular alignment
- The time-window control: a small set of named windows resolved through Story 2.5's
  calendar, so "5 days" means five **sessions**
- The mapping from window to timeframe — an intraday window wants minute bars, a multi-year
  window wants daily ones — and whether the user sees that mapping or only its effect
- Window state in the URL (Story 2.10's decision), so a window is shareable and survives a
  reload
- Behaviour on change: what happens to the visible chart while the new window loads. A
  chart that empties and refills flickers; one that keeps the old data and marks it stale is
  the §36 shape and is what a live product will need in Epic 3 anyway
- The states: a window with no data, a window partly covered, and a window whose data
  failed to load with the previous window still on screen

## Out of scope, and who owns it

- Volume **baselines** and "3.8× normal" — Epic 5 computes that; this story shows the raw
  series it is computed from
- Scrubbing, zooming and panning as free-form gestures, unless they fall out cheaply from
  Story 2.12's choice
- The replay timeline scrubber — Epic 13, which is a different control with a different
  meaning and should not be confused with this one
- Comparison windows across securities — Epic 8

## Open decisions — settle with the user

1. **Which windows.** A defensible set: 1 day, 5 days, 1 month, 3 months, 1 year. Each one
   added costs ingestion depth in Story 2.8 and payload in Story 2.9, so this decision
   reaches backwards
2. **Whether the timeframe is user-visible** or is derived from the window. Deriving it is
   simpler and is what most products do; exposing it is more honest and is closer to what an
   analyst tool does
3. **Whether an intraday window shows a partial current session**, which is where §36's
   "displaying data through 10:42:17" first becomes relevant — and where Epic 3 will make it
   continuous

## Design surface

The window control is a small, high-traffic component and will be reused by Epic 8's
comparison views and pushed by Epic 11's `setTimeWindow` command. The price/volume pair is
the product's first composed visualisation and needs a proportion decided rather than
defaulted — volume is a supporting series and should not compete with price for attention.

## Acceptance criteria

1. Volume renders beneath price, sharing an x-axis, verified across a window change rather
   than in one state
2. Changing the window updates both charts, is reflected in the URL, and survives a reload
3. "5 days" is five trading sessions across a week containing a holiday
4. Loading, partial, empty and failed states each render, and a failed window change leaves
   the previous data visible and labelled rather than blanking the page
5. The whole control is keyboard-operable and the axe gate stays clean
6. Stories exist per state and `pnpm stories` passes
7. `pnpm verify` passes

## What this story hands forward

The epic's exit criterion met in substance, and the window control Epics 8, 11 and 13 reuse
or deliberately distinguish themselves from.
