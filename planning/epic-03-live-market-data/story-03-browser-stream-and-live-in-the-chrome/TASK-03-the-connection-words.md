# Task 3.3.3 — The connection words, in a record with the same guard

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.2

## Objective

The **one string this story owes and nobody has written**: what
`live | stale | disconnected` say to a person, in a record beside
`FEED_STATUSES` with the same `satisfies` guard `MARKET_FEED_DESCRIPTIONS` uses.

## What the user can see when this lands

**Nothing yet** — the words exist and nothing renders them. 3.3.5 does.

## What is already decided and must not be re-taken

- **[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.3 names this record as unwritten and names this
  story as its owner**, and it is explicitly **not a string in a component**.
- **The grid is settled** (§11.3), and the row that looks wrong is correct:
  **`IEX` / `LIVE` / `CLOSED`** at 03:00. Our connection is healthy; the market
  is shut. **Three regions, three facts, none collapsing into the others.**
- **`LIVE` means the feed is HEALTHY, not that data arrived** (§9.4) —
  authenticated, subscribed, heartbeat current. The intuitive definition is the
  wrong one here: §7.6 measured a median symbol producing a bar in 65.1% of
  minutes and `ERIE` in **2.1%**, so a definition keyed on data would report a
  correctly-working feed as not-live for most of the day.
- **`REPLAYING`, never `LIVE`, when the feed is `replay`** — ADR 0030 decision
  4, and Task 3.2.1 shipped the feed's words but **not** this connection word.
  It is a rendering of the `live` state when the feed identity is `replay`, not
  a fourth `FeedStatus`.
- **`FEED_STATUSES` has three members and gains none.** Both sentences §11.2
  requires be sayable already fall out of three.

### It owes a SECOND string, found 2026-09-19 after Task 3.3.2

**`NOT CONFIGURED` exists nowhere in the shipped vocabulary** — not in
`market-provenance.ts`, not in `FeedProvenance.tsx`. It is specified **only** in
§11.3's grid, on the row for a deployment with no provider:

```text
| none | — | either | `NOT CONFIGURED` + its sentence | — | either |
```

**And it does not obviously belong in either existing record**, which is why it
needs deciding rather than dropping into one:

- It is a **feed-cell** word, so `MARKET_FEED_DESCRIPTIONS` is the instinct —
  but that record is `Record<MarketFeed, …>` and **`none` is a `ProviderId`,
  not a `MarketFeed`**. Widening `MARKET_FEEDS` to hold it would be inventing a
  feed to describe the absence of one.
- It is not a **connection** word either. The grid's connection cell for that
  row is **`—`**, not a word.

**Decide where it lives and say why**, the same way the story's other
vocabularies argue their homes. The likely shape is a third small record keyed
on _what the chrome is being asked to render_ rather than on either union — but
take it deliberately.

## Work

- **The record**, beside `FEED_STATUSES` in `packages/shared`, using
  `ProvenanceDescription` — which exists precisely because two vocabularies
  already obey the same rule and a third interface would be a third place for it
  to drift.
- **Follow the sentence rule rather than inventing a second one**: _a sentence
  appears when the label cannot stand alone, and not otherwise._ `sip` has no
  sentence and that took three attempts; padding in a status strip is worse than
  silence because it teaches a reader the second line is not worth reading.
- **`REPLAYING` needs a home** — decide whether it is a member of this record or
  a rendering rule applied over it, and **say which in the code**. It is a
  connection word whose trigger is a **feed identity**, which is the one string
  in this product that crosses the two vocabularies.
- **The words must not imply the market's state.** `DISCONNECTED` says nothing
  about whether the market is open; the clock region says that, and §11.3's grid
  keeps them separate deliberately.

## Done when

- The record exists with the `satisfies` guard, so a fourth `FeedStatus` without
  words is a compile error
- **`NOT CONFIGURED` and its sentence exist, with a decided home and the reason
  written where they live**
- Every sentence is defensible against §11.3's grid, including the `LIVE` /
  `CLOSED` row
- `REPLAYING` has a decided home and the decision is argued where it lives
- **Nothing renders any of it yet**
- `pnpm invariants` still holds every spelling to one home
- `pnpm verify` passes
