# Task 3.4.1 — The observation store, and the gate that would have stopped it

**Status:** **Complete — 2026-09-19.** The Map holds domain `Bar`s, the render gate was extended in the same change, and **both halves of the trap were proven by substitution** — removing the gate check turns two tests red. 15 new tests, no component consumes it.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.3 (complete)

## Objective

Hold the prices. `useLiveFeed` keeps the newest observation's **instant** and
not the observations themselves; this adds §10.3's Map. **No component changes.**

## What the user can see when this lands

**Nothing.** A Map nothing renders. Task 3.4.2 puts it on screen.

## What is already decided and must not be re-taken

- **§10.3: one Map, latest observation only.** Not a history, not a buffer. A
  history is Story 3.9's and a chart series is Story 3.7's.
- **§11.1's omission semantics**: an entry for every security observed and **no
  entry at all** for the rest, so _present but empty_ is unspellable. That is
  already how `WireObservation` is typed — every field required — so the Map
  inherits it rather than restating it.
- **It is additive.** `advanceLiveFeed` in
  `apps/frontend/src/market/live-feed.ts` already receives the whole message;
  the reducer, its event union and the transport all carry it today. Nothing
  about the transport changes.
- **A malformed instant must not poison the Map**, for the reason it already
  must not poison `lastObservationAt`: `Date.parse` returns `NaN`, and one
  `NaN` through `Math.max` makes the feed permanently stale. The existing guard
  is the precedent.

## The trap — handed here by Task 3.3.4 and it is the whole reason this is its own task

**`sameLiveFeedView` will silently stop your prices moving.**

`use-live-feed.ts` sets state only when the derived view **differs**, because
Task 3.3.2's gateway re-sends the feed state every 120 s and a hook notifying on
every message would re-render the application thirty times an hour to redraw an
identical word. That gate compares **five named fields**.

**Add observations to the connection and forget the comparison, and the Map will
update while the screen never does** — a first moving price that does not move,
with every test green, because the reducer is right and the gate is upstream of
it.

**So the comparison is extended in the same change**, and the test asserts the
**negative**: _a new price causes a render._ A test that only checks the Map's
contents passes against the defect.

## Work

- **The Map**, on `LiveFeedConnection`, keyed by symbol, latest observation only.
- **On the view**, in whatever shape a renderer actually wants — a `Map` on a
  view object is fine and a copy per message is not; decide which and say why.
- **Extend `sameLiveFeedView`**, and prove the negative.
- **Decide what `unreadable` and a missing symbol mean to a reader of the Map**:
  absence is §11.1's answer and there is no second spelling of it.

## Done when

- The newest observation per symbol is held, and only the newest
- **A new price causes a render** — asserted, and it fails without the gate
  change
- A malformed instant cannot corrupt the Map
- No component consumes it yet
- `pnpm verify` passes

---

## What was found

### The Map holds domain `Bar`s, not wire objects, and §10.3 is the reason

The obvious shape was `Map<string, WireObservation>` — the wire type is already
there and needs no mapping. **It is the wrong shape, and the argument is a rule
rather than a preference.**

§10.3's Map is only safe because of one sentence:

> **Every entry carries its own `startsAt`, and no reader may render a price
> without reading it.**

That is `PROVENANCE.md`'s _a claim about data requires data_ applied to time,
and it exists because **nothing clears the Map on a session boundary**: at 09:31
on Monday it still holds Friday's bars, and the honest rendering of that is
Friday's close **labelled Friday's**.

**A `Date` is an instant. A string is text a renderer can print without reading
it.** Holding `WireObservation` would put the one thing a reader must consult
into the shape most likely to be echoed unexamined.

So the Map holds `Bar`, and the mapping is **`fromWireObservation` in
`packages/shared`, beside the `toWireObservation` it inverts** — rather than a
mapper invented in the frontend. One fact, one home, and the two ends of the
wire cannot disagree about what a bar is.

### The malformed-instant rule got stronger by being moved

The reducer previously parsed each `startsAt` to find the newest instant. Adding
the Map would have meant **a second parse, and therefore a second place the
`NaN` rule could be got wrong**.

It is now one pass: `observedIn` calls `fromWireObservation` once per
observation, and an observation that cannot be dated is skipped **once, for both
purposes, by construction**.

**And the failure it prevents is worse than the one already recorded.**
`Math.max` with one `NaN` is `NaN`, which makes the feed permanently stale —
that was known. But `new Date(NaN)` is an **`Invalid Date` that formats without
complaining**: it reaches a price row as the words _Invalid Date_. A silent
staleness is a bug in a status word; this one is two English words where a price
should be.

So `fromWireObservation` returns **`Bar | undefined`**, and an observation whose
instant cannot be read **is not an entry**. Absence is §11.1's answer and there
is no second spelling of it.

### The gate, and the proof that it was needed

The Map is compared **by reference**, which is sound rather than lucky:
`withObservations` returns a **new Map exactly when something arrived** and the
same reference otherwise, so **the reference is the change signal.** A deep
comparison would be up to 518 entries every keepalive to answer a question an
identity check already answered.

**That is also why the view hands out the connection's own Map rather than a
copy.** A copy per derivation would allocate 518 entries a minute to produce an
object indistinguishable from the one it copied — and would **destroy the gate**,
reporting a change on every keepalive. `ReadonlyMap` is what makes handing the
real one out safe.

**Both halves were proven by substitution rather than asserted.** Replacing the
gate's observation check with `true`:

```text
× renders when a price changes, and holds it on the view
× reports a NEW PRICE as a change — the negative this task exists for
  2 failed | 318 passed
```

The two views in that second test have the **same** `status`, `feed`,
`backendReachable`, `observedAt` and `unreadable`, so nothing but the added
field can make it pass.

### One test failed for the right reason and taught the fixture a lesson

`a keepalive carrying nothing new causes no change` went red, and **the fixture
was wrong rather than the rule**: the connection had only received `bars`
messages, so it had never been told the server's state — and the `feed` message
under test changed the status from _we have been told nothing_ to `live`. The
gate was correctly reporting **that**, not the observations.

Repaired by sending the snapshot first, which is what a real connection does
(§11.1) — and worth recording because a fixture that skips the handshake is a
fixture testing a state the product cannot reach.

### What was deliberately not built

- **No history, no buffer.** A history is Story 3.9's and a chart series is
  Story 3.7's. §10.3's arithmetic is the reason: 518 × 390 bars is **55.6 MB**
  against 518 × 1 at **0.2 MB**, to hold a thing the store is about to hold
  durably.
- **No correction/movement distinction.** A revision replaces the minute it
  corrects — §7.8 — and that is all this task decides. **What is held decides
  what can be said; it does not decide what is said**, and Task 3.4.5 owns the
  saying.
- **Nothing clears the Map**, on a session boundary or on a degraded feed. The
  prices stay through `disconnected`, which is §36's whole point — _displaying
  data through 10:42:17_ — and blanking them would be the product removing true
  information because a socket died.
- **No component consumes it.** Task 3.4.2 puts it on screen.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts, and the corner of the screen now tells them honestly whether
live market data is arriving. **What they still cannot do is watch a number
change** — and this task is the first of eight that fixes exactly that.

**What this task built: the place the prices are kept.**

Until today the browser held the live connection and, deliberately, **not the
prices coming down it**. It kept only _when_ the last one arrived — enough to
say whether the feed was healthy, which is all the previous story needed. This
adds the prices themselves.

It is smaller than it sounds, and the size is the decision: **the latest price
per company and nothing else.** No history, no rolling buffer. We measured the
alternative during the research phase — holding today's minute-by-minute history
for all 518 companies costs **55.6 MB** against **0.2 MB** for the latest
price — to hold something our database is about to store properly anyway.

**Two decisions worth explaining.**

**The first is about time.** Each stored price keeps the exact moment it
describes, as a real date rather than as text. That sounds pedantic; it is the
difference between a screen that can be honest and one that cannot. Nothing
clears these prices overnight — so at 9:31 on a Monday morning the screen is
still holding **Friday's** closing prices, and the only honest way to show that
is _Friday's close, labelled Friday's_. A price without its moment beside it is
the exact trap this product spent an entire phase of work avoiding.

The same decision has a sharp edge: if a price arrives with a timestamp we
cannot read, **we do not store it at all**. Storing it would put the words
_Invalid Date_ on a screen where a price belongs — and the alternative,
guessing, would be inventing a fact.

**The second is the reason this is a task of its own rather than a line in the
next one.**

The previous story built a deliberate efficiency: the screen only redraws when
something a person would _see_ has changed. Without it, a routine "still here"
message from our server every two minutes would redraw the application around
the clock for no reason.

**That efficiency sits upstream of the prices.** Add the prices and forget it,
and you get the worst possible outcome: the prices update perfectly, every
automated test passes, and **the screen never changes.** A first moving price
that does not move. The previous story wrote that warning down when it handed
the work over, which is the only reason it was caught.

So both halves were changed together — and then we **deliberately broke** the
efficiency check to confirm the tests would catch it. Two went red, which is the
proof that they are testing the thing they claim to.

**How this unlocks progress.** The prices are now in the browser and nothing
shows them. **The very next task puts one on the screen and lets it move** —
plainly, with no styling at all, because you cannot design how a number should
change by looking at a picture of a number that doesn't.

**What a user can see today: nothing new.** One task from now, a price moves on
its own for the first time in this product's history.
