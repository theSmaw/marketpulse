# Task 3.4.9 — The cell that answers two questions, and says which for neither

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** nothing in this story. Placed ninth because it is **chrome
rather than vocabulary** and the close must be last; it can be taken any time
after 3.4.3, which is what made it visible.

## Objective

**Decide what the market-feed cell says when the historical provider is absent
and a live connection exists** — a pair §11.3's grid does not contain, because
until Task 3.4.3 nothing could produce it.

## What the user can see when this lands

**A developer, on a replay, stops being told two contradictory things at once.**
A person on the deployed site sees **nothing new**, and that is the honest
headline: in production one provider answers both questions and the pair cannot
occur. Say so plainly rather than dressing this as a user-facing repair.

## What was seen, verbatim, at every width

Found by **a person looking at the page** during Task 3.4.3's demonstration —
`MARKET_DATA_PROVIDER=replay NON_LIVE_MARKET_DATA=permitted pnpm dev`, on
`/securities/NVDA`, at 1440, 1024, 768 and 390:

```text
MARKET FEED  ○ NOT CONFIGURED  No market-data provider is configured.
             ● REPLAYING       Replaying a past session. Not the live market.
```

Two sentences, three words apart, under one label. The first says nothing is
configured. The second says what it is doing.

## Nothing here is lying, and that is what makes it hard

**Both producers are correct, and both were decided deliberately.** This is not
a bug to find; it is a state to name.

|                  | Answers                        | Reads                                                    | Decided by |
| ---------------- | ------------------------------ | -------------------------------------------------------- | ---------- |
| `FeedProvenance` | _what are the stored numbers?_ | `GET /market-data` → `marketData.provider?.feed ?? null` | Task 2.6.7 |
| `FeedIndicator`  | _is the live feed arriving?_   | the browser's own socket                                 | Story 3.3  |

And `createMarketDataProvider("replay")` returns `undefined` **on purpose** —
ADR 0030 §3, argued in that function's own comment: a replay is a
`MarketDataStream`, a sibling interface, and returning a historical provider
there would put a second source of stored bars beside the store the replay is
reading from. **Do not change that**; it is not the defect.

**One environment variable selects both**, so `replay` is simultaneously a valid
live selection and no historical provider at all. The cell is where those two
true answers land next to each other.

### The word doing two jobs

`No market-data provider is configured.` is a sentence about **`MARKET_DATA_PROVIDER`'s
historical half**, written (Task 2.6.7) when that variable had no other half.
A reader on a replay has configured that variable, so the sentence reads as
false to them even though it is true of the thing it is about.

## Why nothing mechanical saw it, which is worth more than the fix

**§11.3's grid has no cell for this pair.** Every test, component and browser
assertion renders a combination the grid contains, so a combination it omits is
not a shape any of them can fail on — the same shape as Story 3.2's _three
implementations with no construction site_ and Task 3.4.3's _constructed but
not self-driving_, one surface further out.

It is also **structurally invisible in production**: `alpaca` answers both
questions, so no deployed check, no `e2e` run and no screenshot has ever
contained it. It needed a replay, a live connection and a person, together, and
Task 3.4.3 was the first moment all three existed.

**This is the standing open item in `CLAUDE.md` firing**, in its harder form:
_nothing checks that a named region says something when its subject is missing_
becomes _nothing checks that a named region says something coherent when it has
two subjects._

## What is already decided and must NOT be re-taken

- **§11.2: a security gets no status word.** Whatever this says is about the
  deployment, never about a symbol.
- **ADR 0029: the surface that owns the data owns the account of it**, and a
  surface that owns nothing defers — _never says nothing_.
- **`AppFooter` already rejected suppression once, in writing**: hiding the
  venue's sentence to keep the bar on one row "would make a coverage claim
  conditional on a socket's health, which is exactly when a reader is most
  likely to misread numbers they are still looking at." **The cheap fix is the
  one already refused** — do not reach for it a second time under a new name.
- **One fact has one home.** Any new or amended sentence is a string in
  `packages/shared/src/feed-words.ts`, and a second copy fails the build.
- **`createMarketDataProvider("replay") === undefined` stays.** ADR 0030 §3.

## Work

- **Design on the canvas first** (ADR 0026), and **extend `Live in the
chrome.dc.html`'s existing grid rather than starting a file** — this is one
  missing row in a published decision, not a new subject. Reuse the strip
  markup already in that canvas and in `The first price that moves` §06.
- **Name the state in the grid**: historical provider absent **×** live
  connection present, for each of `live` / `stale` / `disconnected` /
  `replaying`. Say which cells are reachable and which are not.
- **Take the decision and record the alternatives with it.** Three are already
  on the table and none is obviously right:
  - **Qualify the sentence** — _No historical market-data provider is
    configured_ — which is the smallest change and makes the label's two halves
    legible. Costs a word that means nothing to a reader with one provider.
  - **Split the label** so the cell reads as two facts by construction rather
    than by punctuation. Costs width, and the bar already wraps at 390.
  - **Say nothing in the provenance half when the live half is answering**, and
    accept that this is the suppression `AppFooter` refused — so it needs an
    argument that distinguishes it from the one already rejected, not a
    restatement.
- **Leave a check that would have caught it.** A grid with an unreachable
  combination and a grid with an **unnamed** one look identical from every test
  that renders only named ones — so the assertion is about the grid's
  completeness rather than about one screen.
- **A `pnpm break`**, per the standing rule, restoring the tree exactly as it
  shipped today.

## Done when

- The pair is **named** in §11.3's grid and on the canvas, with its alternatives
  and a reversal trigger
- The cell no longer reads as a contradiction on a replay, at all four widths,
  **looked at by a person** rather than only asserted
- Nothing about the deployed site's chrome changed — verified, not assumed
- A check exists that fails if a reachable combination has no words, and a
  `pnpm break` proves it goes red
- `pnpm verify` passes
