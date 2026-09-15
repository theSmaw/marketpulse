# Task 3.1.8 — Decisions 2, 5 and 6: the browser protocol, the staleness vocabulary in numbers, and what the live feed is called on screen

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.7

## Objective

Settle the three decisions **Story 3.3 consumes directly** — the message
protocol on the browser socket, the numbers behind `live | stale | disconnected`,
and the sentence the live feed carries on screen.

These three are grouped because Story 3.3 is the epic's first vertical slice and
these are exactly what it needs to exist: a transport, a state, and the words
that state is rendered in.

## What the user can see when this lands

**Nothing** — but this is the task after which Story 3.3 could start. Every
pixel in this epic's first visible story is downstream of the three decisions
here.

## What is already decided and must not be re-taken

- **WebSocket for market data, SSE for agent events, and the two stay separate**
  (`PRODUCT_SPEC.md` §31). The protocol choice is closed; the **message**
  protocol is open.
- **`FeedStatus` ships `live | stale | disconnected`** and has read
  `disconnected` throughout Epic 2 deliberately and correctly. This epic makes
  that value true rather than fixing it.
- **The connection state comes back BESIDE provenance, never instead of it** —
  two facts that fail independently, Task 1.12.4's argument applied a fourth
  time. And note the strip's constraint before adding a region: `.clock` is
  `align-items: flex-end` as the end of the strip, so a region appended after it
  takes that edge away; **the market-feed cell is where this belongs.**
- **`PRODUCT_SPEC.md` §7.1 is explicit about the words**:
  `Market feed: IEX` with a sentence saying what a single venue is, and **never**
  Epic 2's `All US exchanges` on a live tail. Invariant 6's fence stands on the
  sentence under the acronym rather than on the acronym.
- **The words are not chosen in a component.** They live in
  `MARKET_FEED_DESCRIPTIONS` in `packages/shared/src/market-provenance.ts`,
  beside the vocabulary they describe, and the `satisfies` on that record makes a
  feed added without words a compile error. A string literal in a renderer puts
  that guarantee back outside the compiler.
- **One fact has one home** (ADR 0029). A drawn sentence and its spoken twin are
  one string with two renderings, and a second copy fails the build.
- **Colour is never the sole encoding of anything.** A single-venue feed is not a
  fault — §36 makes it a product state — and neither is `stale`. Shape, glyph,
  sign or word carries the difference.
- **`useMarketClock` lives in `AppHeader` rather than `App`, and the
  counterfactual is measured**: 40 whole-route re-renders in 20 s against 0. The
  live connection state is about to face the same choice at a higher rate.

## Work

**Decision 2 — the browser transport's message protocol.** Settle, with
alternatives:

- **Snapshot-then-deltas, or deltas only.** The deciding fact is the one
  Task 3.1.4 measured: a browser that connects at 11:20 and receives deltas only
  sees **nothing at all until the next minute boundary**, per symbol, and for a
  thin name possibly much longer given IEX's measured coverage. A snapshot is
  not an optimisation here, it is what makes the first paint honest.
- **How a browser says which symbols it wants**, executing Task 3.1.7's
  decision 3 into actual messages.
- **Whether the server coalesces**, and on what — the answer at the open is
  different from the answer at midday, and the rate distribution rather than the
  average is the input.
- **What the message envelope looks like**, and whether it is versioned. Note the
  precedent worth copying from the HTTP wire: a response schema that strips
  undeclared properties is what makes "no internal detail reaches a client"
  structural rather than a habit, and a socket has no equivalent unless one is
  designed.
- **What the browser is told when the upstream feed is down** but the browser's
  own connection is fine. Two sockets, two states, and conflating them is the
  defect Story 3.10 would otherwise inherit.

**Decision 5 — the staleness vocabulary, in numbers.** `live | stale |
disconnected` with no thresholds is three words. Set them, against the
measurements rather than against intuition, and note what makes this hard and
specific: **the quietest legitimate interval on this feed is a minute**, and on
IEX **an absent bar is ordinary** — 82.8% median coverage, 43.1% worst case
(`ALPACA.md` §5.2), re-measured live in Task 3.1.4. So a threshold naive enough
to say "no data for 90 seconds means stale" marks a correctly-working feed as
broken for a third of the universe. Settle:

- What makes the **feed** stale, as distinct from a **security** being quiet.
  These are different claims and the vocabulary has to carry both, because "no
  bar for CCI in four minutes" is ordinary and "no bar for anything in four
  minutes" is not.
- The numbers, each with the measurement it came from.
- What `disconnected` means given Task 3.1.6's answer about overnight — and
  whether a socket that is deliberately closed overnight renders as
  `disconnected`, which would be technically true and product-wrong.
- Whether a heartbeat of our own is needed, which Task 3.1.3's silence figure
  decides.

**Decision 6 — what the live feed is called on screen.** The sentence, in
`MARKET_FEED_DESCRIPTIONS`, and the rule for when the connection state and the
provenance sit beside each other without saying the same thing twice. State
explicitly what the strip reads in each of the four combinations —
connected/disconnected × market open/shut — because that grid is where an honest
label becomes a dishonest one, and it is four sentences rather than one word.

Record all three in `LIVE-DATA.md` with alternatives and condition-shaped
reversal triggers, and name for each which story executes it.

## Done when

- All three decisions are settled in `LIVE-DATA.md`, each with alternatives,
  measurements and a condition-shaped trigger.
- Decision 5's numbers each name the figure they came from, and the
  feed-stale/security-quiet distinction is explicit.
- Decision 6 states the four-cell grid in words, and names
  `MARKET_FEED_DESCRIPTIONS` as the home for every one of them.
- Nothing in any of it is a string that would live in a component.
- `pnpm verify` passes.

## Notes

This is the task whose output a stranger sees first, three stories later, so the
wording deserves the time. `PROVENANCE.md`'s rule is the one to hold onto: **a
claim about data requires data, and a surface that owns nothing defers.** A
strip that says `LIVE` while nothing has arrived for four minutes is the same
class of defect as a provenance record about zero bars, and it is worse, because
it is on every route.

---
