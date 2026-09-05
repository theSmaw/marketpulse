# Story 2.14 — Market-Data Provenance, Partial States & Epic Close

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.13
**Epic scope covered:** Market-data provenance display; closes the epic

## Description

Make the product tell the truth about its own data, and then prove the epic end to end.

Invariant 6 is not a nice-to-have and it is not a caption: Alpaca's free tier is **IEX, not
consolidated SIP**, and §7.1 says explicitly that MarketPulse must display the feed and must
not imply full US-market coverage. A product that shows a volume figure from one venue as
though it were the market's volume is making a false claim about a number, which is exactly
the thing this product exists not to do.

The story also closes the epic: the exit criterion re-run against the deployed environment,
and the decisions recorded as ADRs.

## What the user can see when this story lands

**Where every number came from, and an honest answer when part of it is missing** — which is
the story that turns a working chart into one an analyst can trust.

Concretely: the feed labelled as **IEX rather than the consolidated tape**, so nobody reads
it as full US market coverage; whether a price is adjusted; when the data was retrieved; and
partial answers rendered as answers rather than errors — "we have data through 15:42" and
"we have nothing for this symbol" are both correct outcomes and neither is a failure screen.

It is also where **the curated file's age becomes visible** — the
`classification_retrieved_at` column Story 2.3 argued about exists for exactly this, and
this is the story that renders it.

This is the least glamorous story in the epic and the one that most changes whether the
product is credible. §35's list of things MarketPulse must not do — hide provenance,
manufacture missing observations — is enforced here or nowhere.

## Why it sits here in the sequence

Provenance display needs something to be displayed on, so it follows the charts. Everything
it renders was made available by Story 2.6's model, so this is presentation rather than
plumbing — which is why it is last and why it is small.

## Scope

- **The feed label.** `Market feed: IEX` where a user reading a number can see it, worded so
  a reader who does not know what IEX is still learns that this is one venue rather than all
  of them
- Coverage honesty in the places it is easy to imply otherwise: volume figures, a "market"
  breadth reading later, and any phrase containing the word "market"
- Data recency: what period is on screen, and through when the data runs — §36's
  "displaying data through 10:42:17" shape, which Epic 3 makes continuous and which is
  static but still true here
- The adjusted/unadjusted disclosure, since Story 2.6 made it explicit in the data
- The metadata provenance Story 2.3 opened: sector and industry did not come from the market
  data provider, and the UI should not imply that they did
- The complete pass over failure and partial states across the epic's surface (§36), checked
  as a set rather than per component: search unavailable, security found with no data, chart
  failed with the page intact, window failed with the previous window still readable,
  backend unreachable entirely — and no global error screen anywhere
- **Epic close**: the exit criterion executed in the deployed environment; the browser
  journey added to the deployed suite so it is asserted on every deploy rather than read
  once; the cost figure re-taken now that a database is running; and ADRs for the decisions
  this epic took — the database and its irreversible choices, the migration mechanism, the
  provider abstraction and provenance, the storage model, the frontend state decision, and
  the charting choice

## Out of scope, and who owns it

- Live feed status and the `LIVE` indicator — Epic 3, which fills the header's reserved
  market-clock region and finally gives `FeedIndicator` something true to say. Note it still
  reads `disconnected` throughout this epic, deliberately and correctly
- Confidence and evidence provenance for findings — Epic 8, a different kind of provenance
  about a different kind of claim
- Final polish and the accessibility review — Epic 15

## Open decisions — settle with the user

1. **How prominent the feed label is.** A persistent element in the chrome states it once
   for the whole product; per-chart labelling repeats it where the number is. The
   argument for the second is that a screenshot of a chart is a thing that travels
2. **The exact wording**, which is a product-voice decision and will be read by every
   visitor. It has to be accurate without being alarming — IEX is a real feed, not a
   degraded one
3. **Whether "data through …" appears when the data is simply historical**, or only when it
   is unexpectedly behind

## Design surface

Small but high-visibility: a persistent piece of chrome that must not become noise, and a
consistent treatment for the epic's empty, partial and failed states. The failure states are
where this product either reads as trustworthy or reads as broken, and §36 makes them
product states rather than exceptions.

## Acceptance criteria

1. A user looking at any market number can see which feed it came from, without hovering
2. No screen states or implies full US-market coverage — checked by reading every string
   the epic added, not by intent
3. Every failure and partial state in the epic renders locally and deployed, and none of
   them produces a global error screen
4. **The epic's exit criterion is executed in the deployed environment**: search NVDA, open
   it, inspect recent historical price and volume, change the window
5. That journey is asserted by the deployed browser suite, and the local suite covers the
   failure states
6. The cost figure is re-taken with the database running, against the $20 budget and its
   alerts
7. The ADRs are written, and `CLAUDE.md` and `README.md` reflect what actually landed
8. `pnpm verify` passes, and both browser suites pass

## What this story hands forward

A closed epic, and the provenance pattern Epic 3 extends from "which feed" to "which feed,
and is it still connected".
