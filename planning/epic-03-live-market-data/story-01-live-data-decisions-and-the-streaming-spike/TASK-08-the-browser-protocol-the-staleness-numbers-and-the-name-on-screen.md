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

**Added 2026-09-16 by [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
— decision 6's grid gains a fifth cell, and this task ratifies the words rather
than re-deciding them.** A replay of our own stored bars now runs whenever the
market is shut, so a screen can show a connection genuinely delivering
observations while the numbers are a recording:

- **`replay` is a fifth `MarketFeed` with its own sentence** — "real bars from a
  past US session, replayed. Not the live market." Neither `sip` nor `synthetic`
  is honest for it, and §2.6 carries the argument.
- **`LIVE` must never render while the feed is `replay`; the cell reads
  `REPLAYING`.** Note what this does to this task's own open sub-question — _does
  `LIVE` mean the socket is up or data is arriving_ — it **settles it for one
  cell and leaves it open for the others**: with a replay running at 03:00 both
  readings are true of the connection and neither is true of the market. Put the
  remaining question to the person for the `iex` cells only.
- **Confirm the four-cell grid is now five** and that each cell's sentence is
  true beside its neighbours, which is Task 2.14.7's finding and the reason this
  task exists.

**Added 2026-09-15 by Task 3.1.3** — [`LIVE-DATA.md`](LIVE-DATA.md) §6.3, §6.4,
§6.6 and §6.7. Decision 5 arrives here with **one number measured, one
impossible to fix here, and a shipped doc comment to sharpen**:

- **The connection-scale threshold is measured: 165 s**, from a server heartbeat
  of 53.96–54.85 s across 82 intervals on two independent sockets. Three missed
  heartbeats. Under 60 s fires between pings on a healthy socket; much over
  165 s tells a reader a dead feed is live.
- **`FeedStatus.live` must not be defined as "the socket is open."** A capture
  in this story held `readyState === OPEN` for **4h21m** on a connection that
  had died (§6.4). `feed-status.ts`'s doc comment currently glosses `stale` as
  "still connected", and **"still connected" is not observable** — the only
  observable is _when the last inbound frame arrived_. That file is shipped
  code, so this task (or Story 3.3) owes it a **dated amendment rather than a
  rewrite**, per the ADR rule.
- **The data-scale threshold cannot be set here and must not be guessed.** Out
  of hours the same socket is silent for 76 minutes or for 60 seconds depending
  on which channels are subscribed (§6.6, §6.7), so decision 5 is downstream of
  decisions 1 and 3 rather than independent of them. Take the in-session tail
  from Task 3.1.4 and the subscription from Task 3.1.7, then set it.
- **And a staleness rule keyed on "a frame arrived" is already known to be
  wrong**: `dailyBars` re-sends a byte-identical aggregate every minute out of
  hours (§6.7). Key on the **observation's own timestamp**.

**Added 2026-09-15 by Task 3.1.2** — [`LIVE-DATA.md`](LIVE-DATA.md) §4.5, and it
lands directly on decision 6's four-cell grid:

- **An upstream socket that is open is not an upstream socket that is working.**
  The `sip` endpoint opens, greets us identically to the working one, refuses at
  **authentication** with `409`, and then **stays open**. A connection state
  driven by `onopen` would report a healthy feed indefinitely. Whatever the
  strip says, the claim behind it must be driven by the **authenticated** frame
  — which is a fifth thing the grid's cells have to be true of, not a sixth
  cell.

## Work

> **Added 2026-09-16 by Task 3.1.5 — three measured inputs this task did not
> have, and the first one removes an option rather than informing one.**
>
> **1. `LIVE` cannot be keyed off an open socket** ([`LIVE-DATA.md`](LIVE-DATA.md)
> §8.4). Every authentication failure leaves the connection OPEN for ever, so
> `onopen` and `readyState` both report healthy on a socket that will never
> carry a bar. §4.5 saw this shape once and called it one endpoint's quirk; §8.4
> shows it is how this server refuses **everything**. Decision 6 must define the
> word against _data arriving_, and decision 5's `disconnected` cannot mean
> _the socket object is gone_.
>
> **2. The close code is useless; the close LATENCY is the discriminator**
> (§8.5). Five distinct causes all produce `1006` with an empty reason, and they
> are **1 ms, ~240 ms, ~6 s, ~10 s and ~30 s** apart. Decision 5's thresholds
> cannot be written against a code, and a client that times its own close can
> tell a live socket from a corpse — which is the distinction `stale` versus
> `disconnected` is actually reaching for.
>
> **3. Exactly one fault is silent, and it needs a clock rather than a handler**
> (§8.8). Everything else announces itself within six seconds; the half-open
> connection announces nothing, ever, and is detectable only as an **absent
> heartbeat**. The harness already uses **165 s — three missed 54 s
> heartbeats** — and that is a measured starting point for decision 5 rather
> than an invented one. Note what it is _not_: it is a threshold for **the feed**
> being dead, and §8.8's asymmetry is exactly the _feed stale_ versus _security
> quiet_ distinction this task already owes.

> **Added 2026-09-17 by Task 3.1.6 — decision 6 is answered, decision 5 has
> become load-bearing, and decision 2 lost a requirement.**
>
> **Decision 6 is ANSWERED and must not be re-opened**
> ([`LIVE-DATA.md`](LIVE-DATA.md) §9.4): **`LIVE` means the feed is healthy —
> authenticated, subscribed, and the 54-second heartbeat current.** _Data is
> arriving_ was rejected on a measurement rather than a preference: §7.6 found a
> median symbol producing a bar in 65.1% of minutes and `ERIE` in **2.1%**, so a
> data-keyed light reports a working feed as dark for a third of the universe.
> This task executes that into words and a surface.
>
> **Which makes decision 5 load-bearing rather than merely owed.** `LIVE` now
> carries **no claim about how old any number is**, so a **per-security
> staleness mark is required**: without it, `LIVE` over a four-minute-old price
> is true and misleading at once. That is the obligation §9.4 accepted on this
> task's behalf, and it is written there as a reversal trigger — _the first
> surface asked_is this number current\_ with no staleness mark beside it_.
>
> **One rendering that looks wrong and is correct**, so this task does not
> "fix" it: at 03:00 the chrome reads **`LIVE`** beside a market clock reading
> **`CLOSED`**. Two different facts, two cells that already exist — _our
> connection to the market is healthy; the market is shut_.
>
> **Decision 2 loses a requirement and gains an argument.** §9.5's answer is the
> **whole universe**, so there is no per-viewport subscription mechanism to
> design — the browser does not tell the server what it can see, and nothing
> changes on scroll. What remains is the snapshot, which is now **518 entries**,
> and the coalescing question, whose real argument is **frames per burst rather
> than bytes per month**: 332 bars in 243 ms, once a minute, against a payload of
> under 1 kB/s.

> **Added 2026-09-17 by Task 3.1.7 — the snapshot is now a known object, and it
> has to be able to say nothing.**
>
> §10.3 settles what the backend holds: **the last bar per security**, a
> `Map<symbol, Bar>` measured at **0.2 MB**. §10.2 settles that a browser
> receives **all 518**. So decision 2's snapshot is not a new construction — **it
> is that object serialised**, and the two should not be allowed to drift into
> different shapes.
>
> **What the snapshot must be able to express is absence.** The map is
> legitimately empty after a restart and partial for a long time afterwards
> (§10.3), so _I have no observation for this symbol_ is an ordinary payload
> rather than an error — and a protocol that can only send prices will send 518
> entries it does not have.
>
> **And one rule from §10.3 reaches the envelope directly:** every entry carries
> its own `startsAt`, and **no reader may render a price without reading it**. So
> the wire type carries the instant; `staleSeconds` computed server-side would be
> a clock read wearing a different name, and §10.4 records that ADR 0017 binds it
> — _`packages/shared` may not read the wall clock_. **§10.4 explicitly hands the
> naming of that type to this decision.**

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

> **Added 2026-09-17 by Task 3.1.7 — decision 5 has a FOURTH state it did not
> know about, and it is the one that will be met first.**
>
> [`LIVE-DATA.md`](LIVE-DATA.md) §10.3: the backend's current-state object comes
> back **legitimately empty** after a restart and **refills unevenly** — within a
> minute for a liquid name, possibly hours for `ERIE` at 2.1% coverage. So there
> is a security state that is **not** `live`, **not** `stale` and **not**
> `disconnected`: _we have never observed this security in this process's
> lifetime_. The feed is healthy, the connection is up, nothing is wrong, and
> there is no price.
>
> **It is not a rare edge.** Every deploy produces it for the whole universe at
> once, and it persists for the thin tail of the universe for a long time
> afterwards. A vocabulary of three words renders it as one of the three and
> every one of them is a lie: `stale` implies we had something, `disconnected`
> implies the feed is down, `live` implies a price.
>
> **Whether it is a fourth word or an absence rendered by each surface in its own
> way is this decision's to make** — but it must be made rather than discovered
> in Story 3.6 with 518 rows on screen.
>
> **And §10.1 gives this decision the sentence its thresholds have to satisfy**:
> _a live price is at most about a minute old for a liquid security, may
> legitimately be hours old for a thin one, and both of those are the feed
> working correctly._ Per-symbol coverage is in §7.6 — **65.1% median, 2.1%
> worst** — which is the distribution a per-security threshold has to survive,
> and it is sharper than `ALPACA.md` §5.2's stored figures quoted below.

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
