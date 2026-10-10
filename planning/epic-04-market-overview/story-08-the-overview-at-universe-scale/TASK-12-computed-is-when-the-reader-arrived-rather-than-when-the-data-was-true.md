# Task 4.8.12 — `COMPUTED` is when the reader arrived, not when the data was true

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.11

## Objective

**Added 2026-10-09 at the owner's decision. This is invariant 6, not a
performance repair.**

> **6. Market-data provenance is displayed, never implied.**

The landing page's source note draws `COMPUTED hh:mm` at **minute**
precision. The aggregate producer is **unmemoised** and the gateway reaches it
on **connect and on every subscribe** — so a cold load is answered with an
aggregate computed **now** over observations that may be hours old, and the
sentence a reader reads as _when this data was true_ is in fact **the minute
they opened the tab.**

**ADR 0038 anticipated the instant moving with no market data behind it** and
concluded only that it must never reach `feed-liveness.ts`. **Nobody wrote
down that it reaches a drawn sentence.**

## What the user can see when this lands

**On a dead feed, a landing page that says how old its figures are instead of
what time it is.** This is the first thing in Story 4.8 a reader can see at
all.

## Work

### The decision the owner took

**Derive the drawn instant from the observations the aggregate actually
contains** — a _data as of_ instant — rather than from when the join ran. The
three rejected alternatives are recorded with it: keeping `computedAt` and
removing the time from the sentence (defensible, and it deletes a fact the
reader wants); memoising the producer per batch (fixes the per-tab advance and
still implies currency between batches); and deferring to Story 4.7
(the story that photographs this screen with the feed stopped, which is exactly
the state the sentence is wrong in).

### What the instant must be derived from, and the trap in it

The aggregate's own entries carry the bar instants it was built from. **An
aggregate over zero observations has no such instant** — which is CI's
permanent state (518 securities, **zero bars**, every entry `unknown`, the
aggregate 928 bytes) and also a deployment with no provider configured. So the
clause renders **only when its own data is present**, which is ADR 0029's
defer rule: _a fully-formed provenance record about zero bars is a false
impression rather than a courtesy._ **Say nothing rather than say now.**

And the grain matters: the oldest observation, the newest, or both is a product
question with a one-line answer — **the newest, because the claim is _nothing
newer than this has reached us_**, and a span invites a reader to believe the
set is uniform when it is not. If the implementation finds a reason that is
wrong, raise it rather than deciding it.

### The boundaries

- **`computedAt` itself stays on the wire.** It is a real fact about the frame
  and ADR 0033's constraints bind it; what changes is **what the sentence
  draws**. It must still never reach `feed-liveness.ts` or either adapter —
  `pnpm invariants` holds that today and the check must stay green for the
  reason it was written, not by accident.
- **One fact, one home.** The drawn sentence and its spoken twin are one string
  with two renderings (ADR 0029), and a second copy fails the build.
- **The connection's word stays in the status bar.** This region says nothing
  about the connection, by a decision taken three times with measurements
  behind it; an age is not a verdict.

### What it owes

A **state grid**, because this is a provenance surface and the repo's rule is
that a claim about data requires data: the populated state, the
**zero-observation** state, a store with no bars, an aggregate whose newest
observation is hours old, and a deployment with no provider. **Produce them
through the shipped path** rather than furnishing a string, and compare by
**string rather than by eye** — `docs/GAPS.md` entry 13's own condition is
_the next story that publishes a state grid_, so this task either discharges
that for this surface or re-owns it with its reason.

## Done when

1. The drawn instant is derived from the observations the aggregate contains,
   and the clause **renders nothing** when there are none
2. A dead feed's landing page states an age that does not advance when a
   second tab opens — asserted, not reasoned
3. `computedAt` is still out of `feed-liveness.ts` and both adapters, and the
   invariant that holds it is still green **for its own reason**
4. The states are produced through the shipped path and compared by string,
   with the grid recorded
5. ADR 0038 and ADR 0029 carry dated amendments where this changes what they
   describe
6. `pnpm verify` and `pnpm e2e` green

## Handed here by Task 4.8.8 — 2026-10-09: the count your objective rests on is now mechanical, and so is the reason the per-tab advance exists

**Your objective says _the gateway reaches it on connect and on every
subscribe_. That is a count of three paths, it has been verified off the wire
(Task 4.8.3: a cold `/` receives three `overview` frames and pays three joins),
and since 2026-10-09 it is held by a check rather than by a sentence.**
`pnpm invariants`' **`the-aggregate-has-three-producer-paths`** refuses a
fourth path to `overviewMessage()` in `market-gateway.ts` — break
**`a-fourth-path-to-the-aggregate`**, which was produced against the shipped
tree first and reported `50 invariants hold.` before the check existed.

**Why that matters to you specifically.** Your defect is _`COMPUTED hh:mm` is
the minute the reader opened the tab_, and the mechanism is two of those three
paths running a fresh unmemoised join per connect and per subscribe. **The
count is therefore the defect's cause, and it is now something a future reader
can neither lose nor quietly change**: a fourth path would be a fourth minute a
tab could be told, and the check makes that a decision rather than a discovery.

**And one thing to be careful of in the rejected alternatives.** _Memoising the
producer per batch_ — the alternative the task records and declines — would
leave both `the-aggregate-has-three-producer-paths` and
`one-producer-of-the-overview-aggregate` **green**, because neither counts how
many times the join actually runs; they count paths and call sites. The decision
you took (derive the drawn instant from the observations the aggregate contains)
is the one that puts the fact where a check can reach it. **Nothing mechanical
currently holds _how many joins a connect pays_** — if the close wants that
guarded, it is a `docs/GAPS.md` entry rather than a grep, because the answer is
a runtime count off the wire.
