# Story 3.3 — The Browser Stream & `LIVE` in the Chrome

**Status:** **Closed — 2026-09-19.** Seven tasks. `LIVE` is on every route and it is true; closing the backend degrades the cell without a refresh and moves nothing else. [ADR 0031](../../../docs/adr/0031-what-a-transport-without-a-schema-layer-owes.md) is what outlives it; [`STREAM-SEAM.md`](../story-02-stream-seam-and-alpaca-iex-client/STREAM-SEAM.md) §8 is the subject document. **The `updatedBars` capture was not taken** — the deployed backend holds the free plan's only connection, which is Story 3.10's to decide.

**The first vertical slice of this epic.**

**Status:** Not started — **split into seven tasks 2026-09-19**, see _Tasks_ at the foot
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.2
**Epic scope covered:** backend-to-browser streaming, live connection state, market timestamp / `LIVE` indicator, the live feed's own honest label

## Description

The story that turns four layers of plumbing into something a stranger can see,
and it is placed third rather than seventh on purpose.

**Epic 2's lesson, written into this epic's sequence rather than learned again.**
That epic was layered — everything backend until Story 2.9, then everything
frontend — which meant nothing a user could see arrived until Story 2.11, seven
stories and roughly fifty-five tasks after the first row reached the database.
Story 2.4 was inserted to repair it. This story is the repair applied in
advance: a thin end-to-end slice through the socket, the gateway, the browser
transport and the chrome, taken while all four are still cheap to change.

**And it is deliberately a connection rather than a price.** `LIVE` appearing
beside provenance is a state change; a number moving is the thing
`VISUAL-LANGUAGE.md`'s Motion section has been deferring to this epic for seven
stories, and Story 3.4 owns it. Shipping a moving price here would settle that
vocabulary by accident, in a task that was about a transport.

## What the user can see when this story lands

**`LIVE`, on every route, and it is true.**

The chrome's status strip is three regions — `Market feed`, `Backend service`,
`Market clock`. The first has read **provenance** since Task 2.6.7 — _which feed
this deployment is configured to read_ — and this story puts a **connection
state beside it rather than instead of it**, because _which venues are in these
numbers_ and _is data arriving right now_ are two facts that fail independently.
That is Task 1.12.4's two-indicators argument, applied for the fourth time, and
it is why `FeedIndicator` still ships with its consumers removed.

So the region reads the venue **and** the state: the stream's own honest label —
a single venue named as a single venue, never Epic 2's `All US exchanges` — and
`LIVE` when observations are arriving, with the instant of the last one.

**A note on the strip's geometry before anything is appended to it:** `.clock` is
`align-items: flex-end` as the end of the strip, so a region added after it takes
that edge away. This belongs **in the market-feed cell**.

What the user still cannot do: **see a single number change.** Prices are the
last stored close, exactly as they were yesterday. The application announces
that it is live and then demonstrates nothing, which is honest and is the point
of a slice — and it is what Story 3.4 fixes.

## Why it sits here in the sequence

Because a slice is worth most while the layers under it are still soft. The
browser protocol, the gateway's shape and the frontend's transport hook are all
decided in this story, and Stories 3.5, 3.6 and 3.9 each push real load through
them. Finding out here that the protocol is wrong costs one story; finding out
in Story 3.9 costs four.

It is also the only honest moment to ship the `LIVE` indicator: after it, the
screen has moving prices and _is it connected_ stops being separable from _is
that number current_.

## Scope

- **The gateway**: a WebSocket endpoint on the Fastify server, serving browsers.
  `PRODUCT_SPEC.md` §31 keeps this separate from Epic 10's SSE stream, and the
  two have different semantics — do not build one thing with a mode flag.
- **The protocol**, settled in Story 3.1 and implemented here: typed messages,
  a version, a subscribe shape, and the same rule the investigation stream will
  need — the client renders from an **ordered stream of typed events**, never
  from anything it has to parse loosely.
- **The response-contract idiom carried across the protocol boundary.** Every
  HTTP route in this repository declares its schema with the `satisfies`
  guard so a field added to a type and forgotten in the schema is `TS1360`
  rather than a value that silently vanishes. A socket message has the same
  failure and none of the same machinery: decide here what plays that role,
  because the trap is worse on a socket — nothing strips an undeclared field, so
  the failure is a **leak** rather than an absence.
- **The frontend transport.** `api-client.ts` is stated to be the only file in
  the application that calls `fetch`; a socket is a second boundary and wants
  the same treatment — one module, one place that knows the URL, and everything
  above it holding domain state. It is configured at **build time** like every
  other frontend value, which means the deployed frontend cannot be pointed at a
  different backend without a rebuild.
- **The connection state in the chrome**, beside provenance, with the last
  observation's instant. Rendered on all five routes, from one hook.
- **The hook's placement, which is already measured.** `useMarketClock` is
  called from `AppHeader` rather than from `App`, and the counterfactual was
  produced: lifting it to `App` re-renders the whole landing route **40 times in
  20 s** against **0**, and the clock as placed produced **0 `longtask`
  entries** over 60 s. A live hook faces exactly that choice at a higher rate.
  Nobody has to argue it again; the measurement exists.
- **The honest label**, per §7.1 and invariant 6: the acronym is not the
  requirement, the sentence under it is. The shipped vocabulary and the rule for
  when a label needs a sentence live in `packages/shared/src/market-provenance.ts`
  and this story adds no second vocabulary.

## Out of scope, and who owns it

- **Any datum moving** — Story 3.4, and this is the one boundary in the epic
  that must not be blurred for convenience
- Subscription management, fan-out to many browsers, coalescing — Story 3.5
- Reconnection and staleness thresholds — Story 3.10. This story shows
  `disconnected` when the socket is down and says nothing it cannot support
- Exchange-supplied time replacing the clock. `MarketClock` renders the
  **viewer's** clock in market time, which is a timezone claim rather than a
  synchronisation claim, and a server-supplied instant is a **new fact beside
  it** rather than a rewiring of it

## Open decisions — settle with the user

1. ~~**What `LIVE` means out of hours**~~ — **SETTLED by Story 3.1, §9.4.**
   `LIVE` means the feed is **healthy**: authenticated, subscribed, heartbeat
   current. Not _data is arriving_, which is the intuitive definition and the
   wrong one here — §7.6 measured a median symbol producing a bar in 65.1% of
   minutes and `ERIE` in **2.1%**, so a data-keyed definition would report a
   correctly-working feed as not-live for most of the day. §11.3's grid carries
   the consequence: **`IEX` / `LIVE` / `CLOSED`** at 03:00 is correct.
2. **Whether the region shows the last observation's instant always, or only
   when it is not now.** §36's own example — _displaying data through 10:42:17_ —
   is written for the degraded case, and a timestamp that is always on screen is
   either reassuring or noise depending on a judgement no document has taken.

   **ANSWERED by the owner on 2026-09-19: only when degraded.** Not to be
   re-asked — this repository's own rule is that a question already answered and
   asked again is how a decision gets reversed by accident.

   **The reasoning, recorded because the outcome alone is not the decision.**
   It matches `PRODUCT_SPEC.md` §36's own framing — its example sentence,
   _"Live feed disconnected — displaying data through 10:42:17"_, exists to
   qualify a **broken** state — and it matches this product's established habit:
   `PROVENANCE.md`'s rule that **a surface that owns nothing defers**, and that
   a clause renders **only when its own data is present**. A timestamp on a
   healthy feed qualifies nothing.

   **The cost, stated rather than discovered later:** silence now means
   _current_, and a reader has to learn that. The mitigation is that the
   degraded case is **loud** — when the instant appears, it appears with a word
   that explains why.

   **Reversal trigger, as a condition:** the first time a user or a reviewer
   reads a healthy feed as unqualified rather than current — i.e. asks _how old
   is this?_ of a region showing `LIVE`. At that point silence has stopped
   communicating and the always-on version is the answer.

   **Owner: [Task 3.3.5](TASK-05-live-in-the-chrome.md)**, which implements it.

3. **When WE lose the backend on a deployment that never had a provider, does
   the chrome say so?** — **raised 2026-09-19 by Task 3.3.3, unanswered.**

   §11.3's grid gives the unconfigured row a `—` in the connection cell, and
   Task 3.3.3 mechanised it: `connectionWordFor` returns **`null`** when the
   feed identity is `null`. That grid was written about the **server's** feed,
   before a browser socket existed — and the browser socket introduces a fact
   the grid has no row for.

   **Two different facts arrive as the same `disconnected`:**

   | What happened                     | Feed identity | Whose connection |
   | --------------------------------- | ------------- | ---------------- |
   | The deployment has no provider    | `null`        | The server's     |
   | **This browser lost the backend** | `null` still  | **Ours**         |

   **The consequence is concrete and it lands on criterion 2.** On CI — and on
   any deployment with no credential — the region renders `NOT CONFIGURED` and
   no connection word, and if the second row stays silent too, **the region is
   identical either side of killing the backend**. Criterion 2 says that
   transition must be visible without a refresh, and §36 is explicit that a
   dropped connection must be labelled rather than inferred from an absence.

   **ANSWERED by the owner on 2026-09-19: `DISCONNECTED`, once our own socket
   dies, whatever the feed identity.** Not to be re-asked.

   ```text
   Before the kill:  Market feed  NOT CONFIGURED
   After the kill:   Market feed  NOT CONFIGURED · DISCONNECTED
   ```

   **What this changes in the code, and it is not just a word.**
   `connectionWordFor` returns `null` for `feed === null` **unconditionally**
   today, which is the grid read literally. That is now only correct for the
   state **the server reported**. The `—` belongs to _the server has no
   provider_; it does not belong to _we cannot reach the server_, and those are
   the two facts that were collapsing.

   So the hook must keep them apart and the word function must be told which it
   is holding — **and it must be an argument rather than a second code path**,
   because the whole reason 3.3.3 put the crossing in one function is that a
   renderer deciding this for itself is the defect
   `pnpm break connection-words-in-a-renderer` goes red for.

   **Why this shape rather than the other two.** Silence would make criterion 2
   unobservable wherever no provider is configured — including CI — and §36 is
   explicit that a dropped connection is labelled rather than inferred from an
   absence. Handing it to `BackendIndicator` is a real argument and was
   rejected on cost: that cell answers _is the server reachable_ over HTTP
   polling, and a socket this product holds open is a sharper signal arriving
   sooner, so the feed cell would be silent while it already knew.

   **The cost, stated rather than discovered later:** on a deployment that never
   had a provider, `NOT CONFIGURED · DISCONNECTED` can read as _a feed broke_
   when none was ever asked for. The mitigation is that the two words are in
   **two cells** and say two different things — the venue cell still says
   plainly that nothing is configured.

   **Reversal trigger, as a condition:** the first time a reader takes
   `DISCONNECTED` on an unconfigured deployment as a report about a market feed
   rather than about our own connection.

   **The shapes that were available**, kept because the rejected ones are the
   record:

   - **Stay silent** — the grid as literally written. Cheapest, and makes
     criterion 2 unobservable wherever no provider is configured.
   - **Say `DISCONNECTED` once our own socket dies**, whatever the feed
     identity. Honest about our connection; risks reading as _a feed broke_ on a
     deployment that never had one.
   - **A distinct word for _we cannot reach the backend_**, which is a claim
     about the application rather than about a feed — and is arguably
     `BackendIndicator`'s cell rather than this one, since that component
     already owns _is the server reachable_.

   **Owner: [Task 3.3.4](TASK-04-the-frontend-transport.md)**, which is the last
   place the two facts are distinguishable — above the hook they have collapsed
   into one `FeedStatus` and no component can tell them apart — with
   [Task 3.3.5](TASK-05-live-in-the-chrome.md) rendering it and
   [Task 3.3.6](TASK-06-the-degraded-state-and-the-browser-test.md) asserting
   the transition.

## The design bar

**Four tests, and this screen is at risk on two of them.**

- **Does it look designed rather than defaulted?** A `LIVE` chip is the single
  most defaulted element in market software — a green dot and four capitals.
  This product already refused a green dot once with a reason that still holds:
  **green means price-positive here**, and a live indicator borrowing it would
  be the only other green on the screen. `FeedIndicator` carries the answer:
  the **shape** carries the state, only `stale` takes a colour, and `live` and
  `disconnected` are the same grey told apart by silhouette.
- **Does it feel alive?** This is the epic that owes that answer and this is not
  the story that pays it — but a static word reading `LIVE` on a screen where
  nothing moves is the _worst_ available answer, worse than saying nothing. Keep
  it a statement of fact, keep it small, and leave aliveness to Story 3.4 rather
  than inventing a pulse here that the vocabulary then has to live with.
- **Colour is never the sole encoding of anything**, and the strip is where that
  rule is easiest to break.

## Acceptance criteria

1. A browser open on any route shows the feed's venue **and** its connection
   state, and both are read from the running system rather than hard-coded — the
   defect this region shipped with from Story 1.5 to Story 2.6
2. Closing the backend turns the region to `disconnected` in the browser without
   a refresh, and leaves every other region and every number on the page intact.
   §36 forbids collapsing to a global error screen and this is the first story
   where that is testable
3. The live label names a single venue and does not imply consolidated coverage
4. No datum on any screen changes as a result of this story — asserted, not
   assumed, because it is the boundary Story 3.4 depends on
5. One browser test covers the connected and the disconnected states of the
   region. **Check what CI's store can answer first**: 518 securities and zero
   bars, and a runner with no credential has no upstream socket either
6. No main-thread task over 50 ms attributable to the connection (§28), and the
   render count is measured against the `useMarketClock` baseline above
7. `pnpm verify` passes, and `pnpm probe` was run on the strip at 1440, 1024,
   768 and 390 **before** the browser suite — the masthead is already known to
   clip at 390 and this story adds content to the same chrome

## What this story hands forward

A protocol, a transport and a true `LIVE`. Story 3.4 sends the first price
through it.

---

## Handed here by Task 3.1.8 — 2026-09-17, and this story can now start

**All three decisions Story 3.3 consumes are settled.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§11: the browser protocol, the staleness numbers, and the words on screen.

**The protocol (§11.1):** a **snapshot on connect, then one message per upstream
frame**. The snapshot is the backend's current-state object serialised, and
**absence is expressed by omission** — an entry for every security observed and
**no entry at all** for the rest. After a restart the snapshot is `{}` and that
is the true answer rather than a degraded one. Every entry carries its
observation's own instant; **no `staleSeconds` on the wire**, because that is a
clock read wearing a different name (ADR 0017).

**The numbers (§11.2):** `disconnected` at **165 s** of no inbound frame of any
kind, `stale` at **60 s** with no observation **while the market is open** —
gated on the market clock, because out of hours the same socket is legitimately
silent for 76 minutes. Both are measured; both name their figure.

**And the thing most likely to be got wrong: a SECURITY gets no status word.**
The gap between one security's bars has a p50 of 1 minute and a maximum of
**187** (§11.2), so no threshold separates a quiet security from a broken one.
A security carries **the age of its observation** and the surface renders that.
`STALE` beside a price is a judgement this product cannot support.

**The words (§11.3):** the grid is stated in full, and one row looks wrong and is
correct — **`IEX` / `LIVE` / `CLOSED`** at 03:00. Our connection is healthy; the
market is shut. Three regions, three facts.

**One string this story owes and nobody has written:** the connection sentence
for `live | stale | disconnected`, in a record beside `FEED_STATUSES` with the
same `satisfies` guard `MARKET_FEED_DESCRIPTIONS` uses. §11.3 names it as
unwritten and names this story as its owner. **Not a string in a component.**

`feed-status.ts` already carries the thresholds as a dated amendment.

---

## The two thresholds are on two different clocks — delivered 2026-09-18 by Task 3.2.6

**A constraint this story consumes, written here rather than left in
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2, because a pointer is what a reader follows when they
already know to look.**

| Threshold                  | What it measures                            | Clock                                                                                                                                                       |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **165 s** — `disconnected` | Elapsed time since _any_ frame arrived      | **Monotonic** (`performance.now()`). It must not move when the machine sleeps or NTP corrects the clock, or a suspended laptop manufactures a disconnection |
| **60 s** — `stale`         | How old an **observation's own instant** is | **Wall clock** (`Date.now()`). An instant carried on a bar only has meaning against a calendar                                                              |

**Using one clock for both is not a simplification, it is a silent failure.** A
monotonic reading is near zero and an epoch millisecond is about `1.76e12`, so
the subtraction is hugely negative and the 60 s comparison **can never fire**:
the feed reports `live` or `disconnected` for ever and **never `stale`**, with
every test green. That shipped in Task 3.2.5 and was caught by 3.2.6's fixture
stream — the first implementation to generate an observation against a real
calendar while reporting a synthetic monotonic clock.

**`FeedStatusInputs` already carries both** (`now` and `wallNow`) and the
compiler names every call site that forgets one. **Anything in this story that
computes a status or an age takes both rather than reading either.**

---

## One capture this story is now the owner of — handed here 2026-09-18 by Task 3.2.9

**`docs/GAPS.md` entry 7: no verbatim `updatedBars` frame exists in this
repository**, so the two `u` fixtures in `src/fixtures/alpaca-stream/` carry an
**inferred envelope** — their field values come from `LIVE-DATA.md` §7.8's
measured table, but nobody has seen those exact bytes on a wire.

**The risk is bounded to one thing**: whether a `u` frame carries the same field
set as a `b`. The _semantics_ are measured and not in doubt — a revision
supersedes a `(symbol, minute)`, arrives 29.1–30.1 s later, changes the close
35.3% of the time and changes nothing 0% of the time (§14.1, n=68). If the
envelope differs, Task 3.2.4's mapper is wrong about `u` and right about
everything else.

**Why it is yours.** It has been re-pointed twice — Task 3.2.5 built the client
but nothing constructed one, and Task 3.2.9 started the stream at 06:10 ET with
the market `before_open`. **An owner that is a finished task never fires.** This
story is the first that will be developed against a running feed _during_
sessions, so the trigger is something you will meet rather than something to
remember to go and do.

**Trigger, as a condition: the first `u` frame observed in a live session.**
Record it verbatim, replace both fixtures, and re-tier them to `transcribed` in
`MANIFEST.json`.

**It is cheap now and was impossible before.** Until 3.2.9 nothing in this
repository opened a socket against the live market at all; today
`MARKET_DATA_PROVIDER=alpaca` with a credential does, and a session is the only
other ingredient.

---

## Tasks

Seven, sequential, each self-contained. **This story is a vertical slice, so the
ordering is bottom-up through the layers and then one task that is visible.**

| #     | Task                                                                                                                   | Visible? |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| 3.3.1 | [The protocol, and the guard that replaces `satisfies`](TASK-01-the-protocol-and-the-guard-that-replaces-satisfies.md) | No       |
| 3.3.2 | [The gateway](TASK-02-the-gateway.md)                                                                                  | No       |
| 3.3.3 | [The connection words](TASK-03-the-connection-words.md)                                                                | No       |
| 3.3.4 | [The frontend transport](TASK-04-the-frontend-transport.md)                                                            | No       |
| 3.3.5 | [**`LIVE` in the chrome, on every route**](TASK-05-live-in-the-chrome.md)                                              | **YES**  |
| 3.3.6 | [Closing the backend, and the test that proves the page survives](TASK-06-the-degraded-state-and-the-browser-test.md)  | **YES**  |
| 3.3.7 | [Verify, document, the capture, and the close](TASK-07-verify-document-and-the-close.md)                               | No       |

**Two of seven put something on a screen, and that is a deliberate improvement
on the story before it.** Story 3.2 was ten tasks and none of them was visible.
Here the visible one is **fifth of seven**, and it is reachable early because
the four before it are genuinely thin — a protocol, an endpoint, a record of
words and a hook.

**Why not visible sooner?** Because the thing being shown is _a connection
state_, and there is no honest way to render one before a connection exists. A
`LIVE` chip wired to a placeholder would be the defect this region already
shipped with **from Story 1.5 to Story 2.6** — hard-coded, and criterion 1
exists to forbid it.

### The ordering, and the two places it is load-bearing

1. **3.3.1 before 3.3.2.** The protocol is `packages/shared`'s and both halves
   of the wire import one definition. A gateway written first would make the
   protocol a description of that gateway — `PROVIDER.md`'s test, one layer up,
   and Story 3.2 has just demonstrated it working twice.
2. **3.3.5 before 3.3.6.** The degraded state cannot be tested before there is a
   state to degrade, and 3.3.6 is where §36's _never collapse to a global error
   screen_ becomes testable for the first time in this product.

### What this story must not do, and it is one line

**No datum may move.** That is acceptance criterion 4, it is asserted rather
than assumed, and it is **the boundary Story 3.4 depends on**: a moving price
here would settle the motion vocabulary by accident, in tasks that were about a
transport. `VISUAL-LANGUAGE.md` has deferred that vocabulary for seven stories
and Story 3.4 owns it.
