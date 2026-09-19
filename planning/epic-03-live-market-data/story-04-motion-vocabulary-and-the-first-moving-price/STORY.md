# Story 3.4 — The Motion Vocabulary & the First Price That Moves

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.3
**Epic scope covered:** the motion vocabulary (design test 4), live price updates in the UI — on one surface

## Description

**The design criterion this product has answered _not yet_ seven times.**

`VISUAL-LANGUAGE.md`'s Motion section is explicit that it is a thin first cut
rather than a system, and that **Epic 3 owns the full vocabulary** — _"the hard
question in this product is what should happen when a price changes on screen,
and that has to be answered against real moving numbers. A vocabulary settled
against the first screen that needed any — a table that arrives once and then
sits still — would be a vocabulary designed for the easy case and then inherited
by the hard one."_ Three tokens exist: `quick` at 120 ms for a state change
under the pointer, `settle` at 240 ms for content arriving, and `pulse` at
1400 ms for a wait that breathes. **Nothing says what happens when a number
changes**, and Story 3.3 has just made numbers that can.

Seven deferrals of one criterion is not caution; it is the shape of a criterion
that never gets met, and Epic 2's close said so and handed it here by name.

So this story settles the vocabulary **and applies it to exactly one surface**:
the last price in the Security Explorer's identity block. One surface, because a
vocabulary is a decision and three surfaces would make it three decisions.

## What the user can see when this story lands

**A price that changes while they watch it**, on `/securities/NVDA`, with the
market open — the first number in this product's history that moves on its own.

And a vocabulary underneath it that says how: what a rising value does, what a
falling one does, what an unchanged tick does (very likely nothing, and that is
a decision rather than an omission), how long it lasts, and what a reader with
`prefers-reduced-motion` gets instead.

What the user still cannot do: watch the universe table move (Story 3.6), see
the chart extend to now (Story 3.7), or reload the page and still see today
(Story 3.9). And with the market shut they see a still price with an honest
sentence, which is Story 3.10's subject and is stubbed honestly here.

## Why it sits here in the sequence

**Immediately after the first live value can reach a browser, and immediately
before three surfaces would each need one.** Stories 3.6, 3.7 and 3.10 all put
changing values on screen; if this story ran after any of them, the vocabulary
would be reverse-engineered from whatever the first of them happened to do.

It is also the last cheap moment. The identity block's last price is **one
number in one place** — the smallest possible subject for a decision this
consequential, and small enough that getting it wrong twice costs an afternoon.

**Amended 2026-09-16 — this story's design work no longer waits for 21:30.**
[ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
adds a replay of our own stored minute bars behind the stream seam, so the
vocabulary can be designed against **real recorded intraday movement** at any
hour of the day. That matters specifically here: this criterion has been
answered _not yet_ seven times, and the eighth deferral would most plausibly
have been "there was one evening and it was not enough".

Two constraints come with it, and they are the difference between designing
against motion and designing against a toy:

- **Design against the replay; accept against the live feed.** The replay is
  real recorded movement and is the right instrument for the decision. It is not
  the instrument for the acceptance: this story owes a **dated rehearsal row in
  [`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md)**, watched during a real session.
- **Design at 1×.** The engine takes a speed multiplier and a developer may run
  it faster to iterate, but **the vocabulary must be settled at the cadence the
  product actually has** — one observation per symbol per minute (§2.1). A
  motion language tuned against a 10× replay is a language designed for a market
  that does not exist, which is this story's own warning about the easy case
  inherited by the hard one, one level down.

## Scope

- **The vocabulary**, as tokens and as rules, in `VISUAL-LANGUAGE.md` and
  `tokens.css`, **and synced to the design canvas**. ADR 0026's chain is
  canvas → document → tokens → components, and the motion row is the one place
  in the product where it has already run backwards; that row _owes a sync_ and
  says so. **Establish that the canvas is reachable before designing anything**,
  so this epic's largest design decision is not the second exception.
- **What a changing value does.** The candidates are a direction-carrying
  flash, a brief emphasis on the digits that changed, a mark that appears beside
  the number, or nothing at all with only the digits swapping. Take it against
  the two rules already standing, both of which have teeth here:
  - **Motion must never make a number harder to read.** A value that fades or
    slides while an analyst is reading it is worse than one that changes
    instantly. This is the constraint that makes a market application's motion
    genuinely hard and it is why the existing set is so small.
  - **Colour is never the sole encoding of anything.** The price palette differs
    by **1.04:1 in greyscale**, so hue is the entire difference between up and
    down — shape, sign, glyph or word must carry it. A green flash and a red
    flash are the same flash to a large number of readers, and this repository
    has already caught a real defect where four greyscale simulations passed
    against a chart that was wrong.
- **What a value arriving for the first time does**, which is `settle`'s
  existing job and probably needs nothing new.
- **`prefers-reduced-motion`, answered at the token layer as it already is.** The
  durations resolve to `0ms` under the preference, so a consumer reading the
  tokens honours it by construction and a consumer hard-coding `240ms` is the
  only way to get it wrong. A flash that is the **only** signal of a change is
  a change invisible to that reader — so whatever carries direction must survive
  the motion being removed.
- **The rule that already governs and must not be broken here**: _motion in this
  product means work in progress, and nothing else may borrow it._ A moving rule
  under a finished sentence is the fourth design test answered backwards — alive
  where alive would be a lie. A **price** changing is not work in progress; it
  is a fact arriving, and if the vocabulary needs those to look different, say so
  in the document.
- **The rate problem, which is a design problem before it is a performance one.**
  A minute bar changes a price once a minute; a trade stream changes it many
  times a second. Whatever Story 3.1 decided, the vocabulary must state what
  happens when two changes arrive inside one animation, because _every_ answer
  that does not state it produces a smear.
- **The identity block's last price**, wired to the stream for one security.
- **What a spoken interface hears.** A region that changes on its own is a live
  region question, and this repository already has a **known, unshipped repair**
  in that area: the spoken bar sentence is 25 words against a 1,500 ms pacing
  floor, and whether a region changing every 477 ms queues or replaces _is
  readable from neither the DOM nor a timing nor by an agent_. A price that
  changes every minute is a gentler case than that one and is the same question.
  **Do not announce a price change by default** — decide it, and write down what
  was decided and what nobody has heard yet.

## Out of scope, and who owns it

- The universe table — Story 3.6, which inherits this vocabulary and does not
  extend it
- The chart — Story 3.7. A chart that animates its own first paint is decoration
  rather than a market moving, and `VISUAL-LANGUAGE.md` already says so
- The degraded states' own treatment — Story 3.10
- A listening pass with a real screen reader. That is owed by this repository
  already, is owned by _a person with a screen reader_ rather than by a story,
  and this story adds to its backlog rather than discharging it

## Open decisions — settle with the user

1. **The treatment itself.** This is a design decision with product weight and
   the user has a standing instruction about the bar; put two or three real
   options on a real screen and let them be looked at rather than described.
   Static mock-ups cannot settle a motion decision.
2. **Whether an unchanged tick shows anything.** A feed that says _still 174.32_
   is information, and drawing it is the difference between a live application
   and a static one during a quiet minute — and also the difference between a
   calm screen and a twitching one.

## Handed here by Task 3.3.4 — 2026-09-19, and one of the three is a trap

Story 3.3 built the browser's end of the socket and **deliberately stopped
short of holding prices**. Three things follow, written here rather than left in
3.3's task files, because a story close sweeps the documents the story wrote and
this is not one of them.

**1. The observation store is yours, and the shape is already decided.**
`useLiveFeed` keeps the newest observation's **instant** — staleness needs it —
and **not the observations themselves**. What to add is §10.3's **one Map,
latest observation only**, with §11.1's omission semantics: an entry for every
security observed and **no entry at all** for the rest, so _present but empty_
is unspellable. It goes into `advanceLiveFeed` in
`apps/frontend/src/market/live-feed.ts`, which is additive — the reducer, its
event union and the transport all already carry the whole message.

**2. The trap: `sameLiveFeedView` will silently stop your prices moving.**
`use-live-feed.ts` only sets state when the derived view **differs**, because
Task 3.3.2's gateway re-sends the feed state every 120 s and a hook that
notified on every message would re-render the application thirty times an hour
to redraw an identical word. That gate compares five named fields. **Add
observations to the connection and forget the comparison, and the Map will
update while the screen never does** — a first moving price that does not move,
with every test green, because the reducer is right and the gate is upstream of
it. Extend `sameLiveFeedView` in the same change, and assert the negative: _a
new price causes a render._

**3. `OBSERVATION_INTERVAL_MS` is a minute because §10.1 chose minute bars.**
Task 3.3.4 found that §11.2's staleness rule measured an observation's age from
the instant that **opens** its interval, so `live` was unreachable in session;
the repair adds the interval's duration. **Nothing checks that the subscribed
timeframe is actually a minute.** If this story or any after it subscribes to a
second timeframe, that constant is silently wrong in the same invisible way —
and the duration then belongs on the observation rather than in a module
constant. That is the constant's stated reversal trigger, and this is the story
most likely to fire it.

## The design bar

**This is the story where test 4 is finally answered, and the answer has to be
yes.** The other three tests apply as always, and one of them is at unusual
risk: _is there a moment in it worth showing somebody_ has been the hardest test
for this product's sober, dense screens, and a price moving well is the most
showable thing it has ever had. It is also, done badly, the fastest route to
looking like a defaulted trading widget.

**Restraint is not the same as plain**, and the inverse applies here: the
correct answer may be very small, and it must still be _decided_ rather than
minimal by default.

## Acceptance criteria

1. `VISUAL-LANGUAGE.md` carries the vocabulary with its rationale, its rejected
   alternatives and a reversal trigger, and the canvas carries it too — or the
   canvas's unreachability is recorded in the same terms the motion row already
   uses
2. Every duration is a token; no component hard-codes one
3. Under `prefers-reduced-motion`, a price change is still perceivable — the
   direction survives the motion being removed
4. Direction is never carried by hue alone, checked in **greyscale** rather than
   argued
5. A price on `/securities/:symbol` updates without a page refresh, within
   §28's **250 ms p95 from server-received event to application state**, measured
   rather than assumed and excluding provider latency
6. Two changes inside one animation produce a defined result, and it is the one
   the document states
7. No routine main-thread task over 50 ms, and no layout thrash: a value that
   changes width must not move anything around it — the numerals are tabular for
   this reason and the reason is now load-bearing
8. `pnpm probe` at all four viewports, and a person looked at the screen with
   the market open before the browser suite ran
9. `pnpm verify` passes

## What this story hands forward

The vocabulary every remaining story in this epic uses, and the first answer to
a question this product has been postponing since Epic 1.

---

## Handed here by Task 3.1.4 — 2026-09-17, and it is two new obligations

Both are consequences of decisions the owner took on 2026-09-17
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11), and **neither existed when this story was
written**.

**1. An extended-hours mark.** Pre-market and after-hours bars are **rendered
and marked** rather than filtered. Nothing on the frame distinguishes them
(§7.7), so the mark is entirely ours to invent, and Stories 3.6, 3.7 and 3.9
consume it. This story owns the vocabulary; it did not previously owe one.

**2. A treatment for _this corrected_ that is not the treatment for _this
moved_.** The product subscribes `updatedBars`, so a displayed number can be
replaced about thirty seconds later by a corrected one for the same minute
(§7.8). **A correction is not a price movement** and must not borrow motion that
says it is — three of fourteen corrections changed the close price by a few
cents, which under a "price moved" animation would read as a real tick that
never happened.

**And the rate is now known**, which is what this story was waiting for: a
minute's bars land within **243 ms p50 / 511 ms p95** (§7.4) — about 320 symbols
in a quarter of a second, once a minute — rather than as a smooth stream. Motion
designed against a smooth arrival will be designed against a case that does not
occur.

---

## Handed here by Task 3.1.7 — 2026-09-17, and it is one sentence to design against

**A live price is at most about a minute old for a liquid security, may
legitimately be hours old for a thin one, and both of those are the feed working
correctly.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.1, and both halves are measured.

A bar arrives ~**0.5 s after its minute closes** (§7.4), so a security that
trades every minute has a ceiling of a minute. But IEX coverage is **65.1% of
minutes for a median symbol and 2.1% for `ERIE`** (§7.6), and a quiet minute
produces **no frame at all** rather than a zero-volume bar (§7.2).

**What that means for this story is the thing most likely to be got wrong: a
number here ticks ONCE A MINUTE or less, never continuously.** There is no
intra-minute movement on any screen in this epic — trades cannot reach 518
symbols at all (§1.4's 30-symbol cap) and are not delivered by any story in it.
**A motion vocabulary designed against a streaming tape will look correct in a
mock and dead in production**, and the honest version has to make a once-a-minute
step feel alive rather than animating a continuum that does not exist.

**And this story owes two marks it did not originally owe**, both from §7.11:

- **An extended-hours mark.** Pre-market and after-hours bars are rendered and
  marked rather than filtered, and nothing on the frame distinguishes them
  (§7.7) — so the mark is entirely ours to invent, and Stories 3.6, 3.7 and 3.9
  consume it.
- **A treatment for _this corrected_ that is not the treatment for _this
  moved_.** The product subscribes `updatedBars`, so a displayed number can be
  replaced ~30 s later by a corrected one for the same minute (§7.8). **A
  correction is not a price movement** and must not borrow motion that says it
  is — three of fourteen corrections changed the close price, which under a
  "price moved" animation would read as a real tick that never happened.

**Plus the burst shape, which is the rate this story is actually designing
against**: about **332 bars land inside 243 ms**, once a minute (§7.4) — not a
smooth arrival.

---

## The design canvas is NOT reachable — checked 2026-09-17 by Task 3.1.9

`EPIC.md` warned that the `Component library for MarketPulse` canvas was not
reachable from the session that planned this epic, and asked for the question to
be answered rather than assumed. **It was answered, and the answer is no.**

`DesignSync` lists two design-system projects on this account and **neither is
it**: one is an unrelated deck, the other is empty.

**This is a broken link in a chain the product depends on.**
[ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)
makes that canvas **the source of truth for the design language** — canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components — so the first link is
currently unavailable.

**This story is the next thing that needs it**, and needs it for work that does
not exist in the canvas anyway: a motion vocabulary, an **extended-hours mark**
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11) and a **_this corrected_ treatment** distinct from
_this moved_ (§7.8).

**Two honest options, and the second needs saying out loud rather than
drifting into:**

- **Restore access** to the canvas before designing, which is what ADR 0026's
  chain assumes.
- **Design forward from `VISUAL-LANGUAGE.md`** and record the divergence. ADR
  0026 is explicit that the document is **downstream** of the canvas, so
  designing from it is a **deliberate exception** — and an exception recorded
  beside the work is a very different thing from a chain that quietly stopped
  being followed.
