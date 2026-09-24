# Task 3.4.9 — The cell that answers two questions, and says which for neither

**Status:** **Complete — 2026-09-21.** There was **no design decision to take**: §11.3's grid and `Live in the chrome` §03 have both held the correct row since 2026-09-17, and the code could not reach it. **Three divergences**, all one direction — the wire reported `null`, the silhouette said _live market_, and fixing the first made a duplicated sentence reachable. The check that now stands there walks the **selections** rather than the renderings, and is break-verified.
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

---

## What was found

### The task's own premise was wrong, and finding out was most of the work

This task said **"§11.3's grid has no cell for this pair"** and offered three
alternatives to choose between.

**The grid has the cell.** It has had it since 2026-09-17:

```text
| replay | live | shut | `REPLAY` + its sentence | **`REPLAYING`** | `CLOSED` |
```

And `Live in the chrome.dc.html` §03 **drew** it — an amber square, the feed's
own sentence, and `replaying` with **no sentence after it**. Both were published
two days before anything could produce either.

So there was **no design decision to take**. There were three places where the
code had diverged from a decision already made, and the work was reconciling
them — ADR 0026's chain, run in the only direction it is allowed to run.

**None of the three alternatives was chosen**, because all three would have
been re-deciding something decided. That is recorded rather than dropped: the
right answer to _pick one of three_ was _none, the answer is already written
down_, and a task that had picked one would have shipped a fourth opinion.

### Divergence 1 — the wire said `null`

`GET /market-data` derived its feed from `marketData.provider?.feed`, with a
comment reading _"it is exact because every provider declares a feed."_

**That sentence was true when it was written and stopped being true** when
ADR 0030 §3 made a replay a `MarketDataStream` rather than a provider:
`createMarketDataProvider("replay")` returns `undefined` **on purpose**, so the
route reported `null`, which is the contract's spelling of _no market-data
provider is configured_.

The fallback is an **exhaustive switch on the selection**, which is this tree's
established mechanism used a fourth time: a provider added without deciding this
fails the build, naming the function.

```text
$ curl -s localhost:3000/market-data
{"feed":"replay"}
```

### Divergence 2 — the silhouette said _live market_

`FeedProvenance` drew the square and the amber by comparing to the literal
`"synthetic"`. So a replay — **real bars from a past session, emphatically not
the live market** — rendered as a **disc**, the shape this product uses for a
real market feed.

**That is invariant 6 read backwards.** _Market-data provenance is displayed,
never implied_, and a disc **implied** live market data about numbers that are a
recording. `PROVIDER_SERVES` had answered `not-the-live-market` about the replay
since Task 3.2.1 and **no renderer could reach the fact**, because that record
is keyed by `ProviderId` and a chrome has a `MarketFeed`.

`FEED_SERVES` is the same question asked of the other key, total over
`MarketFeed`, so a feed added without deciding it fails the build.

### Divergence 3 — and fixing the first made this one reachable

The moment the feed cell could say something, the cell read:

```text
REPLAY      Real bars from a past US session, replayed. Not the live market.
REPLAYING   Replaying a past session. Not the live market.
```

**A shared four-word run, three words apart** — which is exactly what §04
checked the _other_ pair against (_"different subjects, different openings, no
shared four-word run — so no reader meets one fact in two wordings"_) and what
`search-and-the-universe-share-no-words` guards one surface over.

**`REPLAYING` lost its sentence**, and the argument is §05's existing rule
rather than a new one: _a clause renders only when its own data is present_, and
a **healthy** connection has nothing to qualify — which is why `LIVE` carries no
instant while `STALE` and `DISCONNECTED` do. `REPLAYING` is the replay's healthy
state and is the exact analogue.

**The clause that survives is in the half that owns the subject.** _Not the live
market_ is a coverage claim; invariant 6 puts those in the provenance half, and
ADR 0029's rule is that everything else points once and stops. Stated once is
also **stronger** than stated twice: a repetition is what a reader skims.

**The invariant caught the deletion**, which is the check doing its job in the
direction nobody designs for — removing the string turned
`one-home-for-the-feed-words` red with _no shipped source file writes it_, so
retiring the literal was a deliberate edit with a reason rather than a quiet one.

### What it reads as now, on the running page

```text
MARKET FEED  ▪ REPLAY  Real bars from a past US session, replayed. Not the live market.  ● REPLAYING
```

Marker measured rather than eyeballed: `border-radius: 3px`, background
`rgb(226, 181, 68)` — the square, in `--palette-amber`, which is `Simulated`'s
treatment and the one a glance should land on.

**At 390 it is now SHORTER than it was**, because a sentence left: the two short
tokens stay on the label's row and the one sentence takes its own line, which is
§06's described behaviour arriving for a second state. Looked at, at 1440, 1024,
768 and 390.

### The check, and why it walks selections rather than renderings

**A row the grid contains and the code cannot reach is not a shape any renderer
test has.** Every test, component and browser assertion renders a combination
somebody named; the defect was a combination nobody could produce.

So `market-feed-grid.test.ts` walks `MarketDataProviderSelection` and asserts
the rule the grid embodies:

> **A deployment whose chrome can say a connection word must also be able to
> say a feed word.**

Plus: every feed on the wire must be one `MARKET_FEED_DESCRIPTIONS` can name,
and — the promise this task made — `alpaca` still reports `sip`, `fixture`
`synthetic`, `none` `null`. **Nothing about a configured deployment's chrome
changed, verified rather than assumed.**

```text
pnpm break a-stream-without-a-feed-word
  ✓ broken → red → restored byte-identical.
    matched: also reports a feed
```

That break restores the tree **exactly as it shipped for four days**.

### Why four days, and why nothing mechanical could have been quicker

**It is structurally invisible in production.** `alpaca` answers both questions,
so no deployed check, no browser run and no screenshot has ever contained the
pair. It needed a replay, a live connection and a **person**, together — and
Task 3.4.3 was the first moment all three existed.

This is the standing open item in `CLAUDE.md` firing in its harder form:
_nothing checks that a named region says something when its subject is missing_
became _nothing checks that a named region says something coherent when it has
two subjects_.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A price moves on its own, a dot says a fresh one
landed, a word says when it came from outside trading hours, and yesterday's
measurements say none of it is slow. **This task was about a corner of the
screen that was telling a developer two contradictory things at once.**

**What a developer saw.** Running the product against our recording of a past
trading day, the bar along the bottom said:

> **Market feed** — _not configured_ — "No market-data provider is configured."
> — _replaying_ — "Replaying a past session. Not the live market."

Three words apart: _nothing is configured_, and _here is what we are doing_.

**Both sentences were true**, which is what made it awkward rather than a simple
bug. One describes where the **stored** history comes from; the other describes
the **live connection**. A single setting controls both, and the replay is a
valid choice for one and deliberately not a provider for the other.

**The surprise was that we had already decided this and never built it.**

Our design canvas has drawn the correct version of that bar since the 19th — the
right label, the right marker, the right sentence, and **no second sentence**.
Our specification has carried the same row in a table since the 17th. The code
had simply never caught up, and nothing noticed because **every test we have
checks a combination somebody thought of**. A row that exists on paper and
cannot happen in the product is not something a test can fail on.

So this was not a design task. It was three places where the product had drifted
from a decision already made, and **we chose none of the three alternatives the
plan offered** — picking one would have been inventing a fourth opinion about
something already settled.

**Three things were wrong, and the second is the one that matters.**

The first was plumbing: the part of the system that reports _where do these
numbers come from_ asked the wrong component and got "nothing".

The second is a real honesty problem. The little marker beside the words uses
**shape** to say what kind of data you are looking at — a filled circle for a
real market feed, a **square** for data that is not. A replay was drawing the
**circle**. In other words the screen was quietly implying _this is the live
market_ about numbers that are a recording of a past day. That is the single
rule this product cares about most, and it was pointing the wrong way. The fix
makes the shape read the data's own record of itself rather than a hard-coded
comparison, so a new kind of feed cannot be added without deciding this.

The third appeared **because** we fixed the first: with both halves finally
speaking, they both ended with the same four words — _"Not the live market."_ —
three words apart. We removed the repeat rather than the fact, and kept the copy
in the half that owns the subject. A warning printed twice is a warning people
skim.

**What we left behind so it cannot come back.** A check that walks every way the
product can be configured and insists that **if the screen can report a
connection, it must also be able to say where the data comes from**. We then
deliberately restored the old code to confirm the check goes red. It did.

**Was any customer affected? No, and we verified rather than assumed.** On the
live site one provider answers both questions, so this pair cannot occur there —
which is also exactly why it survived four days unseen. It took a recording, a
live connection and a person looking at the screen at the same time.

**What a user can see today: nothing new**, and that is the honest headline for
this one.

**What is left in this story:** the rehearsal against the real market, the
upward sweep, and the close.

---

## Confirmed from outside — 2026-09-24 by Task 3.10.1: somebody tried to reach the pair again and could not

**This is the kind of evidence a check almost never gets**, so it is recorded
here rather than only in the task that produced it.

Story 3.10's opening audit drove the real application through five degraded
states and read out every surface. It reported, as a finding, that the
contradiction pair was reachable in a **new spelling**:

```text
MARKET FEED   NOT CONFIGURED   No market-data provider is configured.   LIVE
```

**That finding was withdrawn the same day.** `createMarketStream` answers
`undefined` for a `none` selection, so a deployment with no provider
**constructs no stream** and can say **no connection word at all**. The `LIVE`
came from the audit's own stub sending a `feed` frame the real gateway in such a
deployment never sends.

**So the rule this task shipped is the one that closes it**, and it closes it at
the source rather than at a rendering:

> a deployment that constructs a stream also reports a feed

`apps/backend/src/routes/market-feed-grid.test.ts`, six tests, green. **An
independent attempt to produce the defect failed, and the only way to produce
it was to lie to the browser.** A check that has gone red on purpose
(`pnpm break a-stream-without-a-feed-word`) and has now also survived somebody
trying to get round it is about as well-tested as a check in this repository
gets.

**One pointer sharpened while confirming it.** This file names the test as
`market-feed-grid.test.ts` with no path, and the audit spent a detour looking
for it under `apps/frontend`. It is a **backend route test**:
`apps/backend/src/routes/market-feed-grid.test.ts`. The full path is given here
because `CLAUDE.md`'s own rule is that a prose pointer rots silently, and this
one was one directory away from doing so.
