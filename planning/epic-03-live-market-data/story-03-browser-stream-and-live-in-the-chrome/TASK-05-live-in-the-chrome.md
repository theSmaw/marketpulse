# Task 3.3.5 — `LIVE` in the chrome, on every route, and it is true

**Status:** **Complete — 2026-09-19.** **`LIVE` is on the screen, on every route, and it is true.** A canvas file, `Live in the chrome.dc.html`, was added first. Two defects were removed on the way: a per-security connection word §11.2 forbids, and a wrap at 390 that made the new word read as part of another sentence. 996 frontend tests, `pnpm verify` green.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.4

## Objective

**The task the user can see.** The market-feed region shows the venue **and**
the connection state, read from the running system, on all five routes.

## What the user can see when this lands

**`LIVE`, on every route, and it is true.** The first thing this epic puts on a
screen — and the first time the product says anything about the market **now**.

**What they still cannot do: see a single number change.** Prices are the last
stored close, exactly as yesterday. **The application announces it is live and
then demonstrates nothing**, which is honest and is the point of a slice. Story
3.4 fixes it.

## What is already decided and must not be re-taken

- **The connection words are a SUBSTITUTION, not a change — decided 2026-09-19
  by Task 3.3.3.** `FeedIndicator` renders the raw `FeedStatus` today, and
  `CONNECTION_DESCRIPTIONS`' labels **are** the union's own members, so pointing
  the component at the record moves no pixel and changes no browser assertion.
  The capitals on screen come from `.microLabel`'s `text-transform: uppercase`,
  **not** from the strings — do not re-introduce them into the data, because a
  screen reader is handed the DOM text rather than the transform.
- **The crossing is `connectionWordFor`, and no component re-derives it.**
  `status === "live" && feed === "replay"` written in a renderer is the exact
  defect `pnpm break connection-words-in-a-renderer` now goes red for.

### Two sources now carry the FEED IDENTITY, and this task must pick one — found 2026-09-19 after Task 3.3.4

**`useMarketFeed()` and `useLiveFeed()` both answer _which venues are in these
numbers_**, and nothing has said which drives the cell:

| Source                                | Where from                         | When it is true                                   |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| `useMarketFeed()` → `MarketFeedView`  | HTTP `/market-data`, once on mount | **Always** — it is the deployment's configuration |
| `useLiveFeed()` → `LiveFeedView.feed` | The socket's `WireFeedState`       | Only once connected                               |

**The recommendation, with the reason, because the cheap answer is wrong.**
Keep `useMarketFeed` for the **feed cell** and use `LiveFeedView.feed` only
where Task 3.3.3 already uses it — inside `connectionWordFor`, to tell a replay
from a live venue and a configured deployment from an unconfigured one.
Provenance is a fact about the deployment that is **true whether or not
anything is connected**, which is `use-market-feed.ts`'s own argument and the
reason the hook exists; a feed cell fed by the socket goes blank when the socket
does, which is precisely the coupling the two-indicators argument forbids.

**If this task decides otherwise, delete `useMarketFeed` in the same change.**
Two hooks answering one question, with one of them unread, is the shape that
rots.

### The first paint says NOTHING, and the placeholder question is this task's

**Task 3.3.4 fixed the half that was a defect** — reachability is measured from
when we started asking rather than from _nothing has ever arrived_, so the
chrome no longer flashes `DISCONNECTED` on every page load. Before the snapshot
lands `connectionWordFor` returns **`null`**: no connection word at all.

**What it does not decide is whether nothing is what should be drawn**, and
there is a measured precedent on each side:

- `BackendIndicator` renders a **`checking` placeholder** rather than nothing,
  on a stated reason: _"rendering nothing would collapse the region and shift
  the whole chrome when the first result lands."_
- §11.3's grid already gives the unconfigured row a **`—`**, so the cell must
  tolerate emptiness anyway.

**`pnpm probe` answers it** — the strip is measured at four widths in this task
regardless, and whether the cell collapses is visible there and nowhere else.

- **Beside provenance, never instead of it.** _Which venues are in these
  numbers_ and _is data arriving right now_ are two facts that fail
  independently — Task 1.12.4's two-indicators argument, applied a fourth time,
  and the reason `FeedIndicator` still ships with its consumers removed.
- **The geometry, and it is a trap already named in `STORY.md`:** `.clock` is
  `align-items: flex-end` as the end of the strip, **so a region appended after
  it takes that edge away.** This belongs **in the market-feed cell**.
- **The shape carries the state, not the colour.** `FeedIndicator` already
  answers this: only `stale` takes a colour, and `live` and `disconnected` are
  the same grey told apart by **silhouette**. **Green means price-positive in
  this product**, and a live indicator borrowing it would be the only other
  green on screen. **Colour is never the sole encoding of anything.**
- **Do not invent a pulse.** This epic owes _does it feel alive_ and **this is
  not the story that pays it** — but a static word reading `LIVE` on a screen
  where nothing moves is the **worst** available answer, worse than saying
  nothing. Keep it a statement of fact, keep it small, and leave aliveness to
  Story 3.4 rather than inventing a motion the vocabulary then has to live with.
- **The hook is called from `AppHeader`, not `App`** — measured, not argued.
  Lifting `useMarketClock` to `App` re-rendered the landing route **40 times in
  20 s against 0**, and the clock as placed produced **0 `longtask` entries over
  60 s**. A live hook faces the same choice at a higher rate.
- **A security gets no status word** (§11.2). Nothing in this task may put
  `STALE` beside a price.

### The `none` row, and the wire deliberately cannot say it — found 2026-09-19

**Task 3.3.2's gateway sends `status: "disconnected"` when no provider is
configured**, because `FeedStatus` has three members and _not configured_ is not
one of them. **§11.3's grid says the connection cell for that row is `—`, not a
word:**

```text
| none | — | either | `NOT CONFIGURED` + its sentence | — | either |
```

**So the chrome must NOT render `DISCONNECTED` there**, and the thing that tells
it apart is **`feed: null` on the same message**. A deployment with no provider
and a deployment whose socket died both arrive as `disconnected`; only the feed
identity separates them.

**Why the wire is shaped that way rather than gaining a fourth word:** a fourth
`FeedStatus` would put _not configured_ — a fact about **our configuration** —
into a vocabulary that is otherwise entirely about **a connection**, and
`FEED_STATUSES` has three members deliberately (§11.2).

**Assert it.** A deployment with no provider showing `DISCONNECTED` is a screen
claiming a feed broke when none was ever asked for.

**The `—` is already mechanised — Task 3.3.3, 2026-09-19.**
`connectionWordFor(status, feed)` returns **`null`** for `feed === null`, and
`feedWordFor(null)` returns `NOT CONFIGURED`. **So this row is a render of two
function results and not a branch a component writes**; a `feed === null` test
in a renderer is a second home for the rule and the thing the new break exists
to catch.

## Work

- **Wire `FeedIndicator` to the hook**, in the market-feed cell, on all five
  routes from **one** hook call.
- **Render the words from 3.3.3's record**, never a string in a component. There
  is a `pnpm break` (`feed-words-in-a-renderer`) that proves a second spelling
  goes red — **run it**, because this is the task most likely to trip it.
- **`pnpm probe` the strip at 1440, 1024, 768 and 390 BEFORE the browser
  suite**, which this story's own criteria require. The masthead is **already
  known to clip at 390** and this task adds content to the same chrome. Thirty
  seconds against five minutes.
- **Measure the render count against the `useMarketClock` baseline** and record
  it. §28: no routine main-thread task over 50 ms.

### The instant: shown ONLY when degraded — answered 2026-09-19, do not re-open

**`LIVE` carries no timestamp. `stale` and `disconnected` do.**

The owner's answer, with its reasoning, so this is implemented rather than
re-litigated — and in the product's own terms rather than as a preference:

- **`PRODUCT_SPEC.md` §36 frames it that way.** Its example sentence — _"Live
  feed disconnected — displaying data through 10:42:17"_ — exists to **qualify a
  broken state**. A healthy feed has nothing to qualify.
- **It is `PROVENANCE.md`'s existing rule rather than a new one**: a surface that
  owns nothing **defers**, and a clause renders **only when its own data is
  present**. This product already refuses to print a fully-formed provenance
  record about zero bars, on the grounds that it is a false impression rather
  than a courtesy. A timestamp beside `LIVE` is the same shape.
- **The strip is dense and the masthead already clips at 390.** A permanent
  timestamp is the cheapest thing to add and the hardest to remove.

**The cost, stated rather than discovered later:** silence now means _current_,
and a reader has to learn that. **So the degraded case must be loud** — when the
instant appears it appears **with the word that explains why it is there**, never
as a bare timestamp a reader has to interpret.

**Reversal trigger, as a condition:** the first time a user or a reviewer reads a
healthy feed as **unqualified** rather than current — asks _how old is this?_ of
a region showing `LIVE`. At that point silence has stopped communicating and the
always-on version is the answer.

## Done when

- The region shows venue **and** state on all five routes, read from the running
  system — **not hard-coded**, which is the defect it shipped with from Story
  1.5 to Story 2.6
- The words come from 3.3.3's record, and **both** breaks pass —
  `pnpm break feed-words-in-a-renderer` **and**
  `pnpm break connection-words-in-a-renderer`, which Task 3.3.3 added for
  the connection half
- `pnpm probe` was run at four widths **before** the browser suite, and the 390
  result is looked at rather than assumed
- The render count is measured against the `useMarketClock` baseline
- **No datum on any screen changed** — asserted, not assumed
- **A deployment with no provider renders `NOT CONFIGURED` and NO connection
  word**, per §11.3's grid — not `DISCONNECTED`
- **`LIVE` shows no instant; `stale` and `disconnected` do**, and the instant
  never appears without the word that explains why it is there
- The reversal trigger is recorded where the words live, as a **condition**
- `pnpm verify` passes

---

## What was found

### The design went to the canvas first, and the canvas had already reserved this position

`Live in the chrome.dc.html` is the twelfth file in the
`Component library for MarketPulse` project (ADR 0026's arrangement: a new file
rather than a section, because the main canvas is past `get_file`'s 256 KiB
cap).

**Reading the existing files before drawing anything changed two decisions**,
which is the whole argument for the canvas being upstream:

- **`Failure and partial states.dc.html` had already named this task.** Its
  fourth-test panel reads: _"the position stays reserved for Epic 3's live
  feed, where **displaying data through 10:42:17** is a failure sentence that
  changes while somebody watches."_ Seven deferrals of _does it feel alive_ and
  the eighth was already addressed to this story.
- **It also carries the rule that settles the pulse question**, and it is
  stronger than the task's own wording: _"Motion in this product means work in
  progress and nothing else may borrow it."_ A `LIVE` chip that breathes is not
  merely defaulted — it spends a vocabulary this product has already allocated,
  on a page where **no number moves**.

The marker idiom, the strip's geometry and the type scale were taken verbatim
from the 2.14 file rather than re-typed, and **the design needs no new token and
no new component**: `--feed-live` / `--feed-stale` / `--feed-disconnected` have
been in `market.css` since Story 1.12, and `FeedIndicator` has shipped since
Story 1.5 waiting for a true value.

### The word goes last in the feed cell, not in the masthead where §9 drew it

`PRODUCT_SPEC.md` §9's mock puts `LIVE` beside the clock. **That mock predates
this chrome by an epic** — provenance moved to the footer on 2026-09-16 — and
following it would group the connection with the **market's** state because the
two happen to change at a similar rate.

One subject, two facts: the venue and the connection both describe _the market
feed_. The clock describes the market; the cell opposite describes us. And
within the cell the connection goes **last**, because `AppFooter`'s own rule is
that the deliberate question takes the reading edge and the changing one goes
toward the corner of the eye.

### Two defects removed, and both were found by looking rather than by a test

**1. A per-security connection word, which §11.2 forbids.** `SecurityRow` has
carried a `FeedIndicator` since Story 1.4, when the component was a render check
and `FeedStatus` meant nothing. It means something now — and §11.2 measured the
gap between one security's consecutive bars at a p50 of **one minute** and a
**maximum of 187**, so no threshold separates a quiet security from a broken
one. This task's own brief says it: _nothing here may put `STALE` beside a
price._ **The epic's first real vocabulary would otherwise have rendered, on the
landing route, a claim the same epic had already decided it cannot make.** The
column is gone, and a test now asserts its absence rather than leaving it to the
absence of a line of JSX.

Adapting it would have been **more** work than deleting it, which is worth
recording: the cheap path and the correct one were the same path.

**2. A wrap at 390 that changed what the words meant.** `pnpm probe` at four
widths, before the browser suite, exactly as the story requires. At 390 the
cell wrapped like this:

```text
MARKET FEED  ■ SIMULATED
Generated test data. Not a market feed.  ● LIVE
```

**The connection word reads as a continuation of a sentence that has just said
_not a market feed_.** Two independent facts, laid out so that one appears to
qualify the other. Repaired with `order` on the two sentences, so the states
stay together and the prose follows:

```text
MARKET FEED  ■ SIMULATED  ● LIVE
Generated test data. Not a market feed.
```

**Nothing below `pnpm e2e` could have seen either of these**, and the browser
suite would not have either: jsdom computes no layout, and no spec asserts what
a sentence sits next to.

### `useMarketFeed` stays, and the socket's feed identity is used for one thing

Two sources now answer _which venues are in these numbers_. The HTTP one keeps
the cell: **provenance is true whether or not anything is connected**, which is
`use-market-feed.ts`'s own argument, and a feed cell fed by the socket goes
blank when the socket does — the coupling the two-indicators argument exists to
prevent. `LiveFeedView.feed` is read **only** by `connectionWordFor`, to tell a
replay from a live venue and a configured deployment from an unconfigured one.

### The hook is in `App`, which departs from this task's own bullet

The bullet said `AppHeader` and named a measurement: lifting `useMarketClock`
there re-rendered the landing route **40 times in 20 s against 0**. **That is a
render-rate argument and it no longer applies** — Task 3.3.4's
`sameLiveFeedView` sets state only when the derived word changes, which is a
handful of times a day.

What does apply is the rule `App.tsx` states and `AppHeader.tsx` elaborates: _a
hook that makes a network request is called in `App`_, where the test is
**acquiring a dependency on a network loop — state, failure states, a thing a
story would have to construct.** `useLiveFeed` is all three. And `AppHeader`
sits inside its own `ErrorBoundary`, so a header that threw would take the
socket down with it — while the cell it feeds is in `AppFooter`, which `App`
renders anyway.

**Recorded rather than quietly taken**, because the bullet said not to re-take
it.

### Seen running, in three states, before any suite

| State                                | How it was produced                    | What the strip said                                                                 |
| ------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `NOT CONFIGURED`, no connection word | the default deployment                 | §11.3's `—`, and nothing collapsed                                                  |
| `SIMULATED · LIVE`                   | `MARKET_DATA_PROVIDER=fixture`         | the masthead said `CLOSED` beside it — the grid's row that looks wrong and is right |
| `UNKNOWN · DISCONNECTED`             | the backend killed under a loaded page | both sentences, one row, **every region intact**                                    |

The third is §36's own requirement met on a real screen for the first time: one
outage, six surfaces each naming its own subject, no global error screen. It is
also a preview of Task 3.3.6, which asserts it.

**And `NON_LIVE_MARKET_DATA` refused the first attempt**, which is ADR 0030's
guard doing its job: a deployment serving generated prices has to ask for it by
name.

### The footer's measured heights, before and after

| Width          | Before           | After                      |
| -------------- | ---------------- | -------------------------- |
| 1440           | 1440×33, one row | 1440×33, unchanged         |
| 1024           | 1024×33          | 1024×33, unchanged         |
| 390            | two rows         | two rows                   |
| 1440, degraded | —                | 1440×**35**, still one row |

**The word cost two pixels in the worst case and nothing in the normal one.**

### Two browser specs fail locally, on `main`, for a reason worth recording

`pnpm e2e` reported 123 passed and **2 failed** — `pressing a window does not
move the chart` at tablet and at phone. **Reproduced on `main` in a clean
worktree**, so they are not this task's.

The cause is the inverse of this repository's recorded habit. CI's store has
**zero bars**, so the answer that lands is a correct `empty` and the plot does
not move; a developer's store holds bars, the newer answer is taller, and the
plot moves **90 px**. The habit says _before asserting on a number, ask whether
CI has the data_. This is the case it does not cover: **an assertion CI can
satisfy because it has no data**, which the suite reports identically to a real
regression. Added to `docs/GAPS.md` with a re-measure and an owner.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts — and as of today, **the screen tells them whether the market
data behind it is arriving right now.** That is the first thing this epic has
put in front of a person, and the first time the product has said anything at
all about the present moment.

**What you can see: one word, in the corner of the status bar.**

```text
MARKET FEED   IEX   Trades reported by the IEX exchange only   LIVE
```

It sounds small. It is the question a market product exists to answer, and until
today the screen could answer three others — _where did these numbers come
from_, _is the service up_, _is the market open_ — and not that one.

**The design was drawn before it was built, and reading the existing drawings
changed two decisions.**

This product keeps its visual language in a shared design project rather than in
the code, so that a new screen is reconciled against what already exists instead
of inventing beside it. Two things came out of reading it:

- **The design work from a previous epic had already reserved this spot by
  name** — it recorded that the question _does this product feel alive?_ was
  being deferred specifically to this feature.
- **And it carried the rule that settled the most tempting decision here.**

**The tempting decision: a pulsing green `LIVE` badge.** It is the single most
common element in market software. We did not build it, for three reasons that
are all this product's own rules: **green already means "price up" here**;
**movement already means "something is in progress"** and nothing else is
allowed to borrow it; and most importantly, **nothing on the screen is moving
yet**. A word that animates over a page of yesterday's closing prices is
decoration pretending to be information. The honest version of _alive_ is a
number that changes, and that is the next story.

**Two real defects were found by looking at the screen rather than by any
test.**

**The first was a claim we had already decided we could not make.** A table on
the landing page has carried a per-company feed indicator since early in the
project, from when the component was a placeholder with a made-up value. It is
not made-up any more — and we measured, during the research phase, that the gap
between one company's price updates is typically a minute but can legitimately
be **over three hours** for a quiet stock. So there is no threshold that could
honestly label a single company's feed as "stalled". We removed the column. Left
alone, this feature's first genuine vocabulary would have gone live rendering,
on the front page, exactly the claim the same body of work had ruled out.

**The second was a line break.** At phone width the words wrapped so that the
screen read:

> _Generated test data. Not a market feed._ **LIVE**

Two independent facts, arranged so one looked like it was qualifying the other.
Nothing automated could have caught it — the page's structure was correct, only
its _arrangement_ was misleading — and it was fixed by keeping the two state
words together and letting the explanation follow.

**What happens when it goes wrong, which we checked by breaking it.**

We shut the backend down under a loaded page. The result is the thing this whole
approach has been building toward: **the page did not collapse.** Every region
stayed on screen and each one reported its own situation in its own words — the
feed said it was disconnected and that the prices shown are the last known, the
chart said the service did not answer and offered to retry, the clock kept
ticking. No error page, no modal, nothing red.

**One deliberate restraint worth reporting.** `LIVE` carries **no timestamp**. A
time appears only when something is wrong, and always inside the sentence
explaining why it is there. The cost is stated rather than discovered later:
silence now means _current_, and a reader has to learn that. We wrote down the
condition that would reverse it — the first time anyone asks "how old is this?"
of a screen showing `LIVE`.

**How this unlocks progress.** Every piece is now on screen: the language, the
connection, the words, and the state. **What a user still cannot do is watch a
single number change** — the prices are the last stored close, exactly as
yesterday. The application announces it is live and then demonstrates nothing,
which is honest and is the shape of a thin slice done properly.

**The next story is the one that moves a number**, and it inherits the
constraint this one wrote down rather than a blank page.
