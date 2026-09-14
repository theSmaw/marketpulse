# Task 2.14.4 — The curated file's age, and what the market-data provider did not tell us

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.2

## Objective

Render the metadata provenance the wire has carried since Story 2.9 and no
screen has ever shown: that a security's **sector and industry are curated by
this project**, not supplied by the market-data provider, and **when that
classification was last retrieved**.

This is the task that pays off the column Story 2.3 argued about.
`classification_retrieved_at` exists for exactly this, `GET /securities` already
serves `provenance.profile` and `provenance.classification` — each a source and
an ISO instant — `use-securities.ts` already holds it, and **nothing renders a
character of it**.

## What the user can see when this lands

**A sector on the Security Explorer stops being an anonymous fact.** It says
where it came from and how old that judgement is. A reader who assumed the
sector arrived with the prices learns that it did not — which matters the moment
Epic 5 scores a security _relative to its sector_ and Epic 6 clusters the
topology by one.

## What is already decided and must not be re-taken

- **The provenance is per field group, not per field** —
  `securities-response.ts`. `profile` and `classification` each carry a source
  and a `retrievedAt`; `kind` deliberately carries none, because it is a
  judgement rather than a retrieval and a timestamp on it would be a lie about
  what kind of fact it is.
- **`provenance` is `null` when the server declined to make a claim**, and
  `use-securities.ts` already models that. A null is a state to render, not a
  field to default.
- **The words for a sector live in `SECTOR_LABELS`**, not in a component.
- **One curated file today means one pair of provenance values for every row**,
  and `securities.ts` records why that changes: the day profile fields come from
  Alpaca while classification stays curated, rows retrieved on different days
  stop sharing a pair. Do not build something that only works while they agree,
  and do not build for the split before it exists.

## Work

- **Render it where 2.14.2's canvas put it**, which will be the identity block
  and may also be the universe table. If it lands in the table, read Task
  2.14.8's subject first: that table is the one published-target breach this
  epic ships with, and per-row markup at universe scale is precisely its cause.
  Adding a per-row element is a decision with a measurement attached to it.
- **Age, not a raw instant.** A reader learns nothing from an ISO string. What
  they need is whether this is current — and the honest answer for a curated file
  is measured in weeks, so decide the granularity, and put the formatting
  in the market/format layer beside the existing `formatMarketInstant` rather
  than in a component.
- **The `null` provenance state renders**, and it says _we do not claim_ rather
  than showing an empty space. `SecurityIdentity`'s existing absence states and
  their markers are the idiom: a marker shape carries "we don't know" separately
  from the words.
- **Do not imply the market-data provider supplied it**, which is this bullet's
  entire point and the scope line that named it. `Source: MarketPulse curated`
  and `Source: Alpaca` are different claims and the UI has been making neither.
- **A stale file is visible.** Decide, with 2.14.1, whether age is merely stated
  or whether beyond some threshold it is _marked_ — and if it is marked, the mark
  is not colour alone.
- **Stories for: fresh, old, absent provenance, and a security the universe does
  not hold.** The last already has a rendering; it must not regress.

## Done when

- Sector, industry and their source and age render on the Security Explorer, in
  the canvas's placement.
- The `null`-provenance and not-found states render deliberately and are in
  stories.
- No screen implies the market-data provider classified anything.
- If a per-row element was added to the universe table, its cost was measured
  and the number is in Task 2.14.8's record rather than asserted to be small.
- `pnpm stories`, `pnpm verify` and the frontend suite pass; the page was looked
  at with `pnpm probe` at 1440 and 390 before any suite ran.

## Notes

`GET /securities` is the request the whole application makes once and shares.
Nothing here should add a second request, and if something appears to need one,
the fact wanted is probably already in the body.
