# Task 3.9.2 — The edge that extends, with no vocabulary yet

**Status:** **Complete — 2026-09-24.** The chart extends while you watch it, and the newest bar is drawn exactly like every bar behind it. One join, **four readers** — the price plot, the volume plot, the shared axis and the panel's figures — because `BarSeriesScreen`'s own rule is that they all read `shown` from one place. The React Compiler refused the first draft and was right again: the effect it rejected rendered the chart one frame behind the price beside it, and the render-phase shape it points at has no such lag.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.1

## Objective

**Make the chart grow, and draw the new bar exactly like the old ones.** This is
Story 3.4's shape repeated on purpose: 3.4.2 shipped a price that moved with no
vocabulary at all, and the four treatments in 3.4.4 were then argued **in front
of the real thing moving** rather than against an imagined one. A vocabulary
designed against a static mock is a vocabulary designed against the wrong
problem.

## What the user can see when this lands

**The chart reaches the current minute and keeps going, with no refresh.** Open
`/securities/NVDA` during a session, leave it, and the line is longer a minute
later. It is the single most demonstrable thing in this epic — `PRODUCT_SPEC.md`
§5.6's _it must feel alive_ has an obvious candidate here for the first time —
and it lands before anything is designed, which is deliberate.

**What it will not do yet:** mark the new bar, draw the seam between the stored
and live stretches, or treat the minute in progress differently from the 389
behind it. Those were 3.9.3 and 3.9.4 — and 3.9.3 answered all three questions NO, so 3.9.4 was deleted and **nothing is ever drawn there**.

## The mechanism, and the two traps in it

**Where the series comes from.** Story 3.5 settled that the backend holds only
the **latest observation per security** — no series, measured at 440 B each and
declined at 518 × 390. So the browser assembles today from two sources: what
`/market-data/bars` served on load (which since Story 3.8 already includes
today's stored minutes) and what has arrived over the socket **since the page
opened**. `held-series.ts` and `use-bar-series.ts` hold the first;
`use-live-feed.ts` carries the second.

**Trap 1 — a revision is not an append.** `toBarSeries` refuses bars that are
not strictly ascending by instant and **throws a `RangeError`**, and Task 3.8.4
paid for learning what that costs: a window holding two rows for one minute was
a **500 on a page load** rather than a chart drawn from the wrong row. The
socket delivers a bar for a minute and then a corrected one about thirty seconds
later (§7.8, measured: 0.064% of bars, 35.3% of them changing the close). So the
merge must **replace in place by instant, last wins**, exactly as
`live-bar-writer.ts`'s `seriesFor` collapses a batch. An append is a crash, and
it is a crash that only happens when a correction arrives, which is rarely, on a
page that has been open a while.

**Trap 2 — the arriving bar may be older than the drawn series.** A page opened
mid-session is answered from the store, which is complete to `now − 1 min`; the
first socket frame may carry a minute the answer already has. Ignore, replace or
crash are three different behaviours and only one is right.

**And the gap, which is Task 3.5.5's reversal trigger and names this surface.**
What is missed while the socket is away is **gone** — measured 2026-09-17 — and
the reconnect resumes rather than fills. Whatever 3.9.1 found the chart does
with an absent minute, this task must not make it _worse_: a line that closes
over a four-minute outage as though nothing happened is the false-impression
family `PROVENANCE.md` exists to refuse. If the honest answer needs a drawn
distinction, that is 3.9.3's to design and this task's to name.

## Work

- Merge live observations into the drawn series, in the market module, as a
  **pure function** with the replace-in-place rule and its own unit tests — the
  hook wires it, the function decides it
- The chart redraws on the merge, at the cadence the feed delivers: **one burst
  a minute**, not a stream (§7.4 — a minute's bars land inside ~243 ms)
- Nothing new is drawn: the last bar looks like every other bar
- A browser assertion that the line grows without a reload, against a stubbed
  feed rather than a real one, because CI has neither bars nor a market
- A `pnpm break` for the replace-in-place rule — the defect it prevents is a
  500, and it is invisible until a correction arrives

## Done when

1. The chart extends during a session with no refresh, seen on the deployed site
2. A correction for a drawn minute replaces it and does not throw, asserted
3. `pnpm verify` passes and the browser suite is green

---

## Amended by Task 3.9.1 — 2026-09-24: half of criterion 1 is already met, and trap 2 has a measured shape

**The chart already reaches the current minute for a liquid security**, because
the live writer puts the store's edge at `now − 1 min` — ahead of the vendor's
`now − 16 min` clamp — so the stitch short-circuits and the answer is the
store's. What is unbuilt is this task's own half: **extending without a
refresh**. Nothing wires `useLiveFeed` to the chart; `SecurityExplorer.tsx`
hands `series.screen` to `BarSeriesPanel` and `live` to `SecurityIdentity`, and
those are different children.

**Trap 1 is confirmed and is the only one of its kind.** There is no partial
bar — the vendor sends a bar for minute _M_ at the end of _M_ — so every
observation the socket delivers is a **finished** minute, and the only reason a
drawn minute ever changes is §7.8's revision, ~30 s later, at 0.064% of bars.
That makes the replace-in-place rule this task's single correctness
requirement rather than one of several.

**Trap 2's answer**, for the first socket frame after a mid-session load: the
store already holds it. A page opened at 10:30 is answered to 10:29 and the
10:30 frame arrives seconds later, so the ordinary case is _newer_, and the
_already have it_ case arrives on a reconnect snapshot. Both go through the same
replace-in-place path and neither is special.

**And the gap is worse than this task assumed, in a way that is not this task's
to fix.** The axis closes gaps up: measured on production, `ERIE` drew 131 bars
and `NVDA` 390 over the same session, both the full width of the frame. So a
chart that extends across a four-minute outage will look exactly like one that
extends across four quiet minutes — and on IEX, quiet is the common case.
**Do not invent a distinction here**; name it, and leave it to Story 3.10, which
owns the difference between _did not trade_ and _we were not told_.

## What was done — 2026-09-24

### The join, and where it had to live

`SecurityExplorer.tsx` held both halves and handed them to different children —
the fetched series to the chart, the socket's observation to the identity
block. **So a page left open during a session showed a price that moved above a
picture that did not**, which is a defect a reader meets before any of the ones
this story is named for.

The join is **one argument**, `useBarSeries(request, live)`, and it is there
rather than at the call site because `BarSeriesScreen` already says why:

> Every surface that renders a series reads this: the panel's figures, the
> price plot, the volume plot in another region, and the shared axis all three
> hang on. They take it from one place so they cannot disagree about what is on
> screen.

A page that spread the screen to swap `shown` would make itself a second
producer of the one value that exists to have a single producer. `held-series.ts`
gained `withLiveEdge` — the only function that may rebuild a screen — and
`use-bar-series.ts` calls it.

**The volume chart came free**, which is the shared-axis decision paying out:
both plots and the axis read `shown`, so one join extends all three. Task 3.9.5
keeps its measurement and its trigger evaluation and loses its wiring.

### Three modules, and the rule each one holds

| File                 | What it decides                                                                         |
| -------------------- | --------------------------------------------------------------------------------------- |
| `live-series.ts`     | **Replace in place by instant, last wins.** A pure function over a series and some bars |
| `use-live-series.ts` | **The memory.** The feed holds the latest bar per security; a chart wants a series      |
| `held-series.ts`     | **`withLiveEdge`** — the one producer that may rebuild a screen                         |

### The React Compiler refused the first draft, and was right again

`set-state-in-effect` rejected the accumulation-in-an-effect version. This
repository's record says to treat a firing as a design note rather than a rule
to route around, and that the firings it records produced **simpler** code than
they replaced.

> **A count in the first draft of this record was wrong and is corrected the
> same day.** It called this _the third time_, read off `CLAUDE.md`'s sentence
> that the rules _first fired on 2026-09-11 … both catches were correct_ — which
> is about that **first occasion**, not a running total. Grepped: the rules are
> recorded as having fired in at least five places — `SecuritySearch` (two),
> `use-live-feed.ts`, `chart-reading-context.ts` and `use-pending-panel.ts`. So
> this is not the third time and the number is not the point; what the record
> actually claims, and what holds here, is that the repair was **better than
> what it replaced**.

> Calling setState synchronously within an effect body causes cascading
> renders.

The shape it points at is React's own documented one — adjust state during
render when a prop has changed — and it is not merely tidier. **The effect
version renders once with the stale accumulation and again with the new one**,
so the chart would have been one frame behind the price in the block above it,
on the one screen where the two sit together. Nobody would have called that a
bug; it would have been a chart that felt very slightly wrong.

### Four rules the merge holds, and why each is not a formality

- **Replace, never append.** `toBarSeries` refuses bars that are not strictly
  ascending and **throws**; a throw inside a React render takes the page down,
  because nothing above `App` catches one. A correction arrives ~30 s after its
  bar (§7.8, 0.064% of bars, 35.3% changing the close), so appending is a blank
  page on a tab that has been open a while. `pnpm break the-live-edge-appends-a-correction`
  performs exactly that substitution.
- **The window does not move.** A live bar outside `coverage.requested` is
  dropped. A series that quietly grew past its window would make `?sessions=5`
  mean something that changes while a reader looks at it — and the first draft
  of the test suite discovered the corollary: **a `full` answer cannot grow at
  all**, because it covers exactly what was asked for and the next minute is
  outside it. That is the rule working, and it has a test of its own rather than
  a helper that routes around it.
- **The bars are counted against the stretch they came from.** `toBarSeries`
  asserts the sources' `barCount`s sum to the bars, so a bar added without a
  source throws — the check doing what it was written for. They **extend the
  last stretch** rather than starting a new one: the browser receives a live bar
  over this product's own market stream, whose upstream is the provider
  `MARKET_DATA_PROVIDER` selects — the same one the stored half came from, in
  every configuration this product ships. Reversal trigger, as a condition:
  **the first deployment configuring a different vendor for the stream than for
  history.**
- **`retrievedAt` is not re-stamped.** `TAPE.md` §8's rule applied to the
  browser: a stretch reports its **oldest** retrieval, because that is its
  honest staleness. Stamping it now would make every series look as fresh as its
  newest bar — the trap Task 2.3.5 found once already.

### What is deliberately absent

**Nothing new is drawn.** No mark on the arriving bar, no seam between the
stored and live stretches, no distinction for the newest minute. That is Task
3.9.3's to argue **in front of this working**, which is the order Story 3.4
used — and the treatment that won there was not the one anybody would have
predicted from a mock.

**And no gap distinction was invented.** Task 3.9.1 measured that the axis
closes gaps up: `ERIE` drew 131 bars and `NVDA` 390 over one session, both the
full width of the frame. So a chart extending across a four-minute outage looks
exactly like one extending across four quiet minutes — and on IEX, quiet is the
common case. **Story 3.10 owns the difference between _did not trade_ and _we
were not told_**; this task names it and leaves it alone, which is what Task
3.5.5's reversal trigger asks of the surface that fires it.

### The design artefacts

**`DesignSync` for the third time in three stories does not list the MarketPulse
canvas.** The two writable projects are `Ida's / Charlotte Puxley Design System`
and `Design System`; Stories 3.7 and 3.8 each recorded the same, and Story 3.8's
file said _whoever owns the canvas should confirm whether this login can still
reach it, because Story 3.9 is the next story that genuinely needs it_. **Story
3.9 is that story, and this is the third occurrence.** ADR 0026's chain is
downgraded rather than broken: `VISUAL-LANGUAGE.md` is the working source of
truth and nothing here adds a token.

What went to the `Design System` project, in the idiom the `Universe table` and
`Provenance` groups already established — `tokens.css` and `preview/_card.css`,
component CSS lifted with the module composition flattened, a `@dsCard` marker,
and a fourth section that is a **defect rather than a state**:

**`preview/price-chart-live-edge.html`**, group `Price chart`. Four sections —
the edge with no vocabulary (the state this task ships), two securities over one
session at 390 and 131 bars both drawn full width, the spoken sentence with its
false cadence clause marked, and a disc on the last point as the treatment
nobody has argued for yet, drawn so that 3.9.3 argues about something rather
than nothing.

**And a defect in the design project itself, found by using it.** Two groups of
tokens were **in use by an existing card and missing from `tokens.css`** — the
dense and subheading type steps with `--font-weight-strong`, and the chart ink,
which had no entry at all. The failure mode is why it is worth recording: an
unknown `var()` falls back to the inherited value, so a card referencing a token
that does not exist renders at roughly the right size in roughly the right ink
and **nothing says otherwise**. Both extracted from the application and pushed,
with the lesson written into the file.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The chart now moves.** Open a security while the market is trading, leave the
page alone, and a minute later the line is longer — no refresh, no button, no
waiting for anything to reload. It is the first time anything in this product
draws itself forward while you watch.

### Why this is the moment that matters

Everything before it was a number changing. The latest price has moved on its
own since last week, and the table of 518 securities has pulsed once a minute
since the week before. **A chart extending is different in kind**: it is the
product's centrepiece surface, and it is the thing that makes a stranger
believe this is a live market application rather than a very good screenshot.

The product's own specification asks for exactly this and says why — _a screen
that updates by silently swapping text is technically correct and feels dead_.
This is the first surface where the answer is obvious rather than argued.

### What we deliberately did not do

**We made the new bar look exactly like every other bar.** No highlight, no
flash, no marker, nothing to show where the stored part of the day ends and the
live part begins.

That is not unfinished — it is the order we chose, and we chose it because it
worked once already. When we made the price move a fortnight ago, we shipped it
with no treatment at all first, then compared four options **against the real
thing moving**. The winner was not what anyone predicted from a mock-up: the
plain version turned out to be nearly _invisible_ rather than distracting,
which reversed the whole argument. Designing motion against a static picture is
designing it against the wrong problem. The next task compares the options in
front of this.

### The one that would have been a blank page

Our data provider sends a minute's summary once, then sends a **corrected**
version about thirty seconds later — for roughly one bar in every 1,500, a
third of which change the closing price.

If the chart simply added each arriving bar to the end of its line, a
correction would give it two entries for the same minute. Our own data checks
refuse that and stop the page dead — and because of where the check sits, the
result is not a warning, it is a **blank screen**. It would not have shown up
in any quick test: it needs a page left open long enough for a correction to
arrive, which is minutes of ordinary use and no minutes of hurried checking.

So the rule is that an arriving bar **replaces** the minute it belongs to rather
than being added after it. We know the shape of that failure precisely because
we hit the server-side version of it last week, where it was an error page
instead of a blank one. There is now an automated exercise that deliberately
re-introduces the bug and proves the test catches it.

### A tool told us our first attempt was wrong, and it was right

React's compiler rejected our first version of the code that remembers which
minutes have arrived. This is the third time it has done that on this project,
and the third time the thing it pointed at was **better** rather than merely
different.

The version it refused would have updated the chart one frame _after_ the price
above it. Nobody would have filed that as a bug. It would simply have looked
very slightly wrong on the one screen where the two sit side by side.

### Two things that came free, and one we found by looking

**The volume chart moves too**, and we did not write a line for it. Both charts
and their shared timeline read from one place — a decision made two epics ago
precisely so they could never disagree about what is on screen — so extending
one extended all three. A task we had planned for that work now only has to
_measure_ it.

**And we found a fault in our own design library while using it.** Two sets of
design values were being referenced by an existing card and were missing from
the file that defines them. That fails silently — the card renders at roughly
the right size in roughly the right shade and nothing complains — which is the
most expensive kind of small mistake. Both are now filled in, taken from the
running application, with a note explaining the trap.

### Where the product stands

**Two of ten tasks in this story are done.** The first found that a third of the
story was already built; this one delivered the headline.

**What you can see:** a chart that reaches the current minute and keeps going,
during market hours, on the live site.

**What you cannot see yet:** which part of that line arrived just now, and which
part came out of storage. That is the next task, and it is a design question
rather than an engineering one — which is why we are answering it in front of a
chart that is actually moving.
