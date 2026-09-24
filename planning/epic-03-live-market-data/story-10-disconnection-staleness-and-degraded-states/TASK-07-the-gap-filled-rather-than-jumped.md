# Task 3.10.7 — The gap, filled rather than jumped

**Status:** **Complete — 2026-09-24, and the fill is a request to OUR OWN SERVER rather than a backfill from the vendor.** Every one of this task's four constraints is about asking **Alpaca**, and none of them binds: since Task 3.8.3 the deployed backend writes every live bar as it lands, so the minutes a browser's socket missed are **in the store** — which is why a reader who reloads mid-session already gets them. The repair is therefore that the page **asks again** when the feed comes back: one counter, one quiet refetch, no arithmetic on the gap's extent at all. The flush-time trap this file warns about is **unreachable**, because nothing computes a `gapStart <= t < gapEnd`. Two breaks, eleven unit tests, two browser assertions proved red by disabling the refill.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.5

## Objective

Criterion 4: **restoring the feed fills the gap rather than resuming beside
it**, and the chart shows no hole afterwards.

## What the user can see when this lands

**A thirty-second dropout stops costing the rest of the day.** The feed comes
back, the missing minutes appear, and the chart is whole.

## The four constraints, all measured, and each one shapes the design

**1. There is nothing to ask the socket for.** A deliberate 3-minute
disconnection produced **fifteen bars over HTTP and zero on the socket** — then
or later, with no replay, no catch-up and no backfill frame (Task 3.1.9). **So
gap-filling is an HTTP backfill.** This is the third independent route to that
conclusion.

**2. The extent is arithmetic, not a diff.** A bar's `t` is its interval
**start** and the flush is **+60 s**, so _what am I missing_ is computable from
the disconnection instants alone. No reconciliation query is needed to know
**what** to ask for.

**3. The most recent ~15 minutes cannot be fetched at all.** The free plan
embargoes them. So the newest part of any gap is unfillable **at the moment it
is noticed**, which makes _when_ to fill a design decision and not a detail.

**4. A bar is not final for 29.1–30.1 s.** A fill that runs inside that window
will see a bar it is about to be sent a correction for. The live edge already
handles corrections by instant (`withLiveBars` replaces in place), so the repair
may be _let it_, but that has to be decided rather than assumed.

## The trap, recorded because the analyser walked into it first

**The question _was this bar missed?_ keys on when the bar was FLUSHED, never
on its own timestamp.** A naive `gapStart <= t < gapEnd` counts a
normally-delivered bar as recovered: one stamped `15:03:00Z` begins inside the
gap and is flushed at `15:04:00Z`, **after** the reconnection. A first pass over
the spike's capture reported **343 "recovered" bars** on exactly that error.

## And the ledger will not help you

`bar_coverage` is extended to the **last bar seen**, so a dropout leaves
minutes **inside a covered window with no rows in them** — indistinguishable in
the store from a security that did not trade. **The socket's own connection
history is the only thing that knows**, and it lives in the browser for the life
of the page.

**`bars:check` will not report it either**: its completeness rule is a count
against the session's expected minutes, and a thin IEX session is already far
below that.

## The rate limiter

A refilling bucket at ~3.3/s with **no `Retry-After` on a `429`**. A fill for
one security after a short dropout is one request; a fill for 518 after a long
one is not, and the repair for a two-minute dropout and a two-hour one are
**different repairs** — which is 3.10.1's decision 2.

## Work

- The gap's extent computed from connection instants, keyed on **flush** time
- The fill, per 3.10.1's decision 2, with the embargo and the limiter respected
- What happens to the unfillable newest minutes, decided and said on screen
- A `pnpm break` for the flush-time trap, because it is a silent wrong answer
- Assertions that a filled gap leaves no hole, using 3.10.2's harness

## Done when

1. A produced dropout, reconnected, leaves a chart with no hole — asserted
2. The embargoed tail has a decided behaviour and an honest sentence
3. The flush-time rule is break-verified

---

## What was done — 2026-09-24

### The premise, tested before it was built on

This file opens with four measured constraints — nothing to ask the socket
for, the extent is arithmetic, the newest ~15 minutes are embargoed, a bar is
not final for 29.1–30.1 s — and every one of them is a constraint on asking
**Alpaca**. They were all true when they were measured, on 2026-09-15, and
they were measured for a gap in **our store**.

**The gap this criterion is about is not in the store.** Since Task 3.8.3 the
deployed backend writes every live minute bar as it lands, for six and a half
hours a day. So when a _browser's_ socket drops, the minutes keep being
written by a process that never noticed — and `CLAUDE.md` already records the
proof, from Story 3.8: _"Open a security mid-session, reload, and the chart
still reaches the minute it reached before."_ A reload is a heavier version of
the repair.

**And that is the dropout this product actually produces.** The 2026-09-23
overnight watch recorded the watcher's own socket closing **38 times in
4h 36m**, every one code `1006`, every one with `elsewhereReachable: true` —
the backend answering HTTP throughout. Roughly one every seven minutes, and
the store had every minute of it.

### The design, which is three small things

| Piece                      | What it is                                                      |
| -------------------------- | --------------------------------------------------------------- |
| `LiveFeedView.resumes`     | how many times the feed has come **back** — snapshots minus one |
| `useBarSeries(…, resumes)` | a **quiet** refetch when that number goes up                    |
| nothing else               | no extent arithmetic, no backfill, no new endpoint              |

**A counter rather than a boolean**, because two reconnections in one minute
are two resumes and a flag set by the first is still set when the second lands
— which is Task 3.10.6's announcement defect with a different field.

**It counts returns, not disconnections.** A feed that has dropped and not
come back has nothing to fill from.

**And it is in `sameLiveFeedView`.** A field added to the store without being
added to the render gate updates correctly and never reaches a consumer — Task
3.4.1's defect shape, and here it would be a gap that is never filled on a
page where every number on screen is right. `a-resume-does-not-reach-the-page`
proves the gate.

### Why the refill is not `retry`, which is the one real decision

`retry` marks the view `loading` on the way. That is right for a reader who
pressed something and wrong here: **nobody asked**. ADR 0028's rule that a
wait over 160 ms draws a panel over the picture is about a wait a reader
caused, and a socket that blinks every seven minutes must not pulse a panel
over the chart every seven minutes.

So the view is left **exactly** as it is and replaced only when a better
answer lands.

> **And a refill that FAILS changes nothing.** A page that was drawing a
> correct answer must not become an error message because a request nobody
> made did not come back — `PRODUCT_SPEC.md` §36's global error screen,
> arriving locally. The hole simply stays until the next resume or the next
> window change. `a-failed-refill-wipes-the-chart` proves it, and a reader
> who presses `Try again` still gets the honest failure, which is asserted
> beside it.

### Three rules the browser suite added after the design was "finished"

The design above is correct and was not sufficient. A browser-suite flake —
two specs failing when run **together** and passing alone — read as machine
contention for four bisecting runs, which is the diagnosis `docs/GAPS.md`
records being wrong three times in one session. It was not contention.

**1. A refill never supersedes a request already in flight.** Starting a
request aborts the one running, which is right for a reader changing the
window and wrong here twice over: the running request is about to deliver the
same fresh answer, and a socket that flaps aborts each refill with the next,
so **nothing ever lands**. The page sits on `loading` with no answer coming
and no control to ask for one.

**2. A refill that fails keeps what is on screen — and `loading` is not
something on screen.** The first version discarded every failure
unconditionally, which strands the page in the same way when a resume beats
the first answer.

**3. At most one refill a minute, which is a floor rather than a poll.**
Nothing fires on that clock read; it only ever suppresses. The interval is the
bar interval because that is what makes it non-arbitrary: **two reconnections
inside one minute cannot have lost two different minutes' bars.**

All three are break-verified:

```text
pnpm break a-refill-supersedes-the-request-it-is-waiting-for
pnpm break a-flapping-socket-becomes-a-poll
pnpm break a-failed-refill-wipes-the-chart
pnpm break a-resume-does-not-reach-the-page
  ✓ all four: broken → red → restored byte-identical.
```

### And the instrument found a defect that is not this task's

Rule 3 exists because of a measurement nobody had taken. A throwaway spec
counting sockets on an ordinary security page:

```text
SOCKETS: 3        # in twelve seconds, /securities/NVDA
BAR REQUESTS: 3
```

**Three market-stream connections in twelve seconds**, one every four
seconds — and **the same on `main`**, so it predates this work. The gateway is
not the cause: two external clients held sockets to it for **30 s with zero
closes** while the page churned.

**Nothing on screen is wrong while it happens**, which is why it has gone
unseen: the reconnect works, a snapshot restores every price, and
`fromSnapshot` correctly declines to mark any of them as an arrival. It was
invisible until something was wired to the **event** rather than to the state
— and the first thing that was, was this.

**So the floor suppresses it rather than fixing it**, which is written down as
such: `docs/GAPS.md`, owner _the next feature that acts on a reconnection_.
Note the one deployed figure points the other way — the 2026-09-23 watch saw
one close per **seven minutes**, not one per four seconds — so this may be a
development-only shape, and the re-measure says to run the same counter
against the deployed site.

### Criterion 2 — the embargoed tail, and the case this does NOT fix

**The embargo is not engaged**, because nothing here asks Alpaca. But there is
a case the refill cannot fill, and it is worth naming rather than leaving as
an implication:

> **When the BACKEND's own upstream socket drops, the store has the hole
> too.** The refill then returns the same answer it had, and the chart keeps
> its hole until that night's backfill.

**The honest sentence for it already exists and is not duplicated here.** The
chart states its own coverage — _covers the first 780 of 990 trading minutes …
the rest has no stored bars and is drawn as empty ground_ — which is true of a
hole from any cause, and ADR 0029's fourth rule is that one fact has one home.
Task 3.10.5 decided, with reasons, that **a mark derived from the connection
is a third kind** and the plot does not draw one; the same reasoning covers
this.

### Criterion 3 — the flush-time trap is unreachable rather than guarded

This file asks for a `pnpm break` for the trap that _"the question **was this
bar missed?** keys on when the bar was FLUSHED, never on its own
timestamp"_ — the error that reported **343 "recovered" bars** in the spike.

**There is nothing to break.** The repair computes no gap extent: it asks for
the window it already has and takes the whole answer. A `gapStart <= t <
gapEnd` predicate exists nowhere in the tree, so a break would have to invent
the code it then broke, which proves nothing about what ships.

The two breaks that replace it are about what **was** built, and both went
red on demand:

```text
pnpm break a-failed-refill-wipes-the-chart
  ✓ broken → red → restored byte-identical.
    matched: leaves the chart alone when the refill fails

pnpm break a-resume-does-not-reach-the-page
  ✓ broken → red → restored byte-identical.
    matched: makes a reconnection a change even when nothing else moved
```

### The assertions, and one that CI would have caught and did not

`security-gap-fill.spec.ts`, two tests, through a produced disconnection:

1. **a dropout leaves a hole, and the feed coming back fills it** — 1,910 of
   1,950 bars, drop, the browser's **own** retry, and 1,950
2. **the chart is never blanked or covered while the gap is filled** — the
   line's `d` sampled across the whole journey: never absent, never behind a
   pending panel, and changed by the end

**Both were proved red** by commenting out the one `refill()` call.

> **Two things the produced journey taught, which reasoning had not.** The
> reconnected cell reads **`STALE`, not `LIVE`** — a snapshot with no new bar
> leaves the 60 s wall-clock rule correctly saying nothing has arrived — and
> the refill keys on the **snapshot** rather than on the word, so the gap
> fills anyway. And `svg path` first resolves to a **5-pixel icon in the
> chrome**; the first draft asserted that an activity glyph had not changed
> shape, and waited thirty seconds to do it.

### The defect this task found on main, which was mine

`security-chart-edge.spec.ts` (Task 3.10.5) asserted a washed edge and a bar
count against **the deployment's own store** — backfilled here, **zero bars**
on CI. It went green locally and **red on the runner**, and PR 461 was merged
with that check red, which is the standing rule _tests must pass, always_
broken by me. Fixed in 3.10.6's branch rather than left: the spec now serves
`uncovered.json` through the harness and reads the store not at all, which is
visible in the runtime — **12.6 s to 1.2 s**. `serveFeed` gained a `bars`
option, which is what this task's own spec then needed.

**And the assertion was wrong in a second way the store had been hiding**: it
matched `covers the first … of … sessions` where the sentence says **trading
minutes**.

### The fired trigger, answered in place

`use-bar-series.ts` carried a reversal trigger since Task 2.10.5 — _the first
window whose tail moves faster than a user will re-ask for it, with no live
stream to carry it_ — written against the possibility that **Epic 3 slipped**.
It fired in the form nobody wrote it for: Epic 3 shipped, and then the stream
_stopped_. The repair it predicted — _a refetch, not a poll_ — is what landed,
with the trigger being **the resume** rather than window focus, because focus
is a guess about when the reader cares and a reconnection is a fact about when
there is something new to get.

### Gates

`pnpm verify` green — **2,438 tests, 26 invariants**, one of which
(`every-break-can-still-land`) caught a break of this task's own that had
rotted an hour after it was written, which is what it is for. Full `pnpm e2e`
**165 passed, 0 failed** — the first wholly clean full run of the evening, and
the proof that the two specs failing before were this task's defect rather
than the machine. All four breaks red on demand.

### And the sighting this task's instrument took

`session-watch.mjs` was extended mid-run to record the deployed chrome
verbatim — a one-line addition to an instrument that was already looking at
the page — which took the sighting `LIVE-REHEARSAL.md` note 3 has owed three
rows since 2026-09-22, twenty minutes after Task 3.10.6 deployed:

```text
13:57:40Z  MARKET FEED ALL US EXCHANGES LIVE BACKEND SERVICE HEALTHY
14:17:39Z  MARKET FEED IEX Trades reported by the IEX exchange only —
           not the full US consolidated tape. LIVE BACKEND SERVICE HEALTHY
```

The defect and the repair, from production, in one log, on one day.

## For a stakeholder — a status report, 2026-09-24

### What this was

**When the live connection drops for thirty seconds, the chart used to carry
that hole for the rest of the trading day.** Prices resumed beside the gap
rather than filling it. Reload the page and it came back; don't, and you were
looking at an incomplete picture with nothing telling you which minutes were
missing.

### The plan said one thing and the evidence said another

The task was written expecting a fairly serious piece of engineering: work out
exactly which minutes were missed, go back to our data supplier for them, and
do it without tripping their rate limits or their rule that the most recent
fifteen minutes cannot be bought at any price.

**None of that turned out to be necessary, and the reason is a thing we built
last week.** Since then our own server writes every price down as it arrives,
all day. So when a _browser_ loses its connection, the minutes are still being
recorded by a machine that never noticed anything was wrong.

The fix is therefore embarrassingly small: **when the connection comes back,
the page asks our own server for the chart again, and gets the whole thing.**
No supplier request, no rate limit, no embargo, and no arithmetic about which
minutes are missing — we ask for the period the reader is looking at and take
the complete answer.

We know it is the right shape because reloading the page already worked. This
is the same thing without the reload.

### And this is the failure that actually happens

Our overnight monitoring recorded our own connection dropping **38 times in
four and a half hours** — roughly once every seven minutes — with the server
reachable the entire time. That is the dropout this product produces, and the
server had every minute of it.

### Three decisions, and the reasoning behind each

**It must not look like a wait.** Nobody asked for this request — a socket
came back, that is all. If it put the chart into the "loading" state, a
connection that blinks every seven minutes would flash a loading panel over
the chart every seven minutes. So the picture stays exactly as it is and is
replaced only when a better one arrives.

**If the refill fails, nothing happens.** A page that was working must not
turn into an error message because a request the reader never made did not
come back. The gap simply stays until the next reconnection. A reader who
presses "Try again" still gets a straight answer about a failure — that one
they _did_ ask for.

**There is one case we cannot fix, and we say so.** If our _server's_ own
connection to the market drops, the minutes are genuinely missing and asking
again gets the same answer. The chart already states how much data is behind
it — _covers the first 780 of 990 trading minutes_ — which is true whatever
the cause. We deliberately do not add a second sentence about connections:
that fact lives in the status bar, and two places for one fact is how they
drift apart.

### One thing the plan asked for that we did not build, and why

The task asked for a safety check against a specific counting mistake —
telling a bar that was _missed_ from one that merely _started_ during the
outage, an error that earlier work got wrong by 343 bars.

**We did not build the check, because we did not build the counting.** There
is no arithmetic about which minutes are missing anywhere in the repair, so
there is no way to get it wrong. Writing a check would have meant first
writing the code it was checking.

We added two different safety checks instead, for the two things that _are_
built — and deliberately broke each one to confirm it sounds the alarm.

### The part that took longest, and it was not the feature

The feature above is about forty lines. What took the evening was a test
failure that **looked like a tired machine** — two checks failing only when
run together, passing alone, on a laptop that was busy.

That is a real thing and we have been fooled by it before, so the temptation
to shrug was strong. It was not that. Three separate bugs were hiding behind
it, all in the new code, and all of the same family: **the page asking again
too eagerly.**

- It cancelled the request it was already waiting for — so when the
  connection wobbled repeatedly, no answer ever arrived and the page waited
  for ever.
- When its own request failed, it threw the failure away to protect the chart
  — including when there was no chart yet to protect.
- And it asked again on _every_ reconnection, with no minimum gap.

Each is now fixed, and each has a deliberate sabotage test proving the alarm
sounds.

### The bigger thing the investigation turned up

While chasing that, a throwaway measurement found something nobody was looking
for: **an ordinary page opens three connections to our live feed in twelve
seconds** — roughly one every four seconds — and it does the same on the
version of the product before any of this work.

Nothing is visibly wrong when it happens. Prices are right, the reconnection
works, and the page looks perfect. It only became expensive the moment
something reacted to _reconnecting_ rather than to _being connected_ — which
is what this task built.

We have put a one-a-minute floor on the new behaviour so it is not a problem
today, **and written the finding down as unfixed**, because the next feature
that reacts to a reconnection will meet it again. One caveat we are honest
about: the deployed site's own overnight monitoring saw a reconnection every
_seven minutes_, not every four seconds, so this may be a development-only
quirk. The recheck is written down.

### A mistake of mine, found and fixed

Last night's work shipped a browser test that passed on my machine and
**failed on our build server**, because my machine has years of market history
stored and the build server deliberately has none. I merged it anyway while
that check was still red, which is exactly what we tell ourselves not to do.

It is fixed — the test now supplies its own data and does not read the
database at all, which took it from 12.6 seconds to 1.2 — and it turned out to
be wrong in a second way that the data had been hiding: it was looking for the
word "sessions" where the product says "trading minutes".

### Where the product stands

**Epic 3's final story, seven of ten tasks done.** The status bar, the
headline price, all 518 table rows and the charts each tell the truth when the
data stops — and now a brief outage costs a few seconds of chart rather than
the rest of the day.

**What is next:** the live connection earning a row in the page's own record
of where its numbers came from, then the whole set of degraded states
photographed together.
