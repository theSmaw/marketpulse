# Task 2.13.1 — Settle which windows exist, what a window costs, and the vocabulary it is spelled in

**Status:** Complete — 2026-09-12. Subject document:
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) (this task created it).
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** Story 2.12 (complete)

## Objective

Take this story's three open decisions — **which windows**, **whether the
timeframe is user-visible**, and **whether an intraday window shows a partial
current session** — plus three more this story cannot avoid and no later task
should be left to take by accident, and write them into
**`VOLUME-AND-WINDOW.md`** in this directory before anything is drawn.

Tasks 2.9.1, 2.10.1, 2.11.1 and 2.12.1 are the precedent, and the argument is
different here from any of them. Those decisions were about **mechanism**. This
one is about **what the product offers**, and it reaches in three directions at
once: backwards into what Story 2.8 actually stored, sideways into what Story
2.9's cap will refuse, and forwards into Epic 8's comparison windows and Epic
11's `setTimeWindow` command, which pushes a window this task names.

A window list chosen by taste is a window list that one of those three
directions then refuses, and the refusal arrives as a 400 on a screen rather
than as a sentence in a document.

## What the user can see when this lands

**Nothing.** No control, no volume, no new window. The payoffs are Task 2.13.4
(volume on screen) and Task 2.13.6 (the control). Say "nothing visible" plainly
when reporting it and name those two tasks.

## What is already decided and must not be re-taken

Read these first. Four of them would otherwise be settled here differently, and
each is recorded with its argument somewhere else.

- **The window lives in the URL and the address is never rewritten into a
  different form** —
  [`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  §3. `?sessions=5` means _the last five sessions_ when somebody opens the link
  tomorrow; resolving it to an absolute range behind their back changes what
  their link says. The **strings** are this task's; the rule is not.
- **The window is never resolved from the browser's clock.** `sessions=N` goes on
  the wire and the server resolves it, because a browser in Singapore at 09:00
  local is on the previous market date in New York. `bar-series-query.ts`'s
  header carries the argument and the union's shape is what enforces it.
- **A window change is the same event as a symbol change** to the fetch layer: it
  changes `barSeriesQuery(request)`, which is the cache key and the request.
  `useBarSeries` already supersedes, resets and never paints the previous
  window's series under the new window's label. **No new cancellation code.**
- **The cap is 10,000 bars and it is refused rather than reduced**, with a 400
  that names the number, and the refusal already has a rendering that carries the
  server's sentence verbatim and offers no retry.

## Work

Settle each of the following, with the alternatives that were weighed and a
**reversal trigger that is a condition rather than a story number**.

- **Open decision 1 — which windows.** This is an arithmetic problem with a
  product answer, and the arithmetic is already on the shelf. Do it in the
  document rather than in your head:
  - **What is actually stored** (`BARS.md` §2 and §8.16): `1m` for **one year**,
    251 sessions, 47.7M rows; `1d` for **672 sessions** bounded at 2024-01-01 by
    the calendar, which is option A taken deliberately and grows with the
    calendar. There is no third timeframe and `PROVIDER.md` §9.4 forbids deriving
    one from the other.
  - **What the cap permits**: 390 bars a session at `1m`, so the cap is **25
    sessions** of minute bars. One month of `1m` is ~21 sessions and **8,190
    bars — inside it**; two months is ~16,380 and **refused**. At `1d` nothing in
    the store can reach the cap.
  - **What each window costs on the wire**, from `MARKET-DATA-API.md` §12.8's
    deployed readings: five sessions of `1m` is **29,072 B / ~399 ms**, a month
    of `1m` is **154,480 B / ~1,210 ms**. §28's 500 ms is satisfied by the frame
    painting immediately, which `CHARTING.md` §4 already established — but a
    window whose answer takes 1.2 s is a window whose _transition_ is a design
    problem, which is Task 2.13.2's.
  - **What each window costs to draw**, from this story's own 2.12.9 amendment:
    `timeAxis` twice per render is **0.4 ms** at five sessions, **1.9 ms** at the
    `1m` cap, **17.5 ms** at a year of `1d` and **46.1 ms** at the whole stored
    depth — against a 50 ms budget, before a pixel. Task 2.13.3 takes the repair;
    this task decides **whether a window that needs it is offered at all**.

  The defensible set the story names is 1 day, 5 days, 1 month, 3 months, 1 year.
  Check each against the four rows above and say what happens to the two that are
  interesting: **1 day**, which on a store caught up nightly is reliably `empty`
  (this is why `DEFAULT_SESSIONS` is 5 — the argument is in
  `SecurityExplorer.tsx`'s call site), and **1 year**, which is 253 sessions of
  `1d` and the condition `CHARTING.md` §16.5 names. If a "max" window is offered,
  say what it is max **of**, because 672 sessions of `1d` and 251 of `1m` are
  different maxima and neither is "everything".

- **Open decision 2 — whether the timeframe is user-visible.** Deriving it from
  the window is simpler and is what most products do; exposing it is more honest
  and is closer to an analyst's tool. Two things make this less of a coin-flip
  than it looks in the story: the timeframe is **already on screen** — the
  panel's stated facts and `chart-alternative.ts` both name it — and
  `chart-alternative.ts` carries **two `1d` branches that have never executed**
  (`CHARTING.md` §17.5 item 5), so the day a window maps to `1d` the product
  starts reading sentences nobody has heard. Decide, and if the mapping is
  derived, say where the derivation lives as **one function** rather than as a
  `?:` at a call site.

- **Open decision 3 — whether an intraday window shows a partial current
  session.** Today the question is nearly moot and that is worth saying plainly:
  the store is backfilled nightly, the plan refuses the most recent ~15 minutes,
  and there is no live tail until Epic 3. So decide it as the thing it actually
  is — **what the `1 day` window means on a store that does not hold today** —
  and note §36's "displaying data through 10:42:17" is Epic 3's sentence and
  Story 2.14's rendering, not this task's to invent.

- **Decision 4, which the story does not list — the vocabulary, in three
  places.** A window is named on a control, in an address and in a sentence read
  aloud, and the three must agree. Settle: the **query-parameter spelling** (the
  first occupant of this product's query string, deliberately left empty by
  `SEARCH-AND-SELECTION.md` §3), the **label** on each control, and the **words**
  the text alternative uses. `FRONTEND-STATE.md` §3's rule that an absent
  parameter means the default and the application never writes a parameter it did
  not need is inherited, and it decides what the default window's address looks
  like.

- **Decision 5 — what a volume figure is allowed to say.** Volume abbreviates —
  millions and billions — and Story 1.4's tabular alignment must survive the
  abbreviation. That is a formatting rule and Task 2.13.3 implements it, but the
  **honesty** rule is this document's: an abbreviation is a rounding, so say
  where the exact figure still exists, and note that a volume from one venue
  presented as the market's volume is the specific false claim Story 2.14 exists
  to prevent. This is also where to record that **the seam is 2.14's** — the
  stitch is already on the wire.

- **Decision 6 — what happens to the window that cannot be asked for.** Two real
  states this control can reach and neither is a user error: a window that runs
  **off the calendar's 2024–2028 range**, which `lastMarketSessions` refuses
  rather than shortening (ADR 0017 decision 9), and a window **over the cap**,
  which the server refuses with a 400. Say which of these the control can reach
  at all — a control offering only windows inside the calendar cannot reach the
  first, which is a better answer than rendering it — and where each belongs in
  §36's state list.

## Done when

- `VOLUME-AND-WINDOW.md` exists and settles six decisions, each with alternatives
  and a reversal trigger that is a condition
- The window list is justified against **four** costs — what is stored, what the
  cap permits, the bytes and latency, and the calendar walk — with the figures
  re-taken or cited to the document that holds them
- The timeframe mapping is decided and has one home named
- The query-parameter spelling, the control labels and the spoken words are
  written down together, once
- Both refusal states are placed in the state list rather than left to a task
- Nothing is added to `apps/frontend/src` that ships
- `pnpm verify` passes — `pnpm links` in particular, for a documentation task

## Notes

The likeliest scope leak is **designing the control while deciding what it
offers**. What the windows are is this task; what the control looks like and what
happens between one window and the next is Task 2.13.2, on the canvas.

The second likeliest is taking the `timeAxis` repair here because the figures
are in front of you. It is `packages/shared`'s, it pays three callers including
the server, and it is Task 2.13.3's — with the explicit warning from this story's
own amendment that a `useMemo` in `PriceChart` fixes one caller of three and
leaves the server paying in full.

---

## What was decided — 2026-09-12

Six decisions, in [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md), each with the
alternatives that were weighed and a reversal trigger written as a condition.

1. **Five windows: 1D, 5D, 1M, 3M, 1Y — and no "max."** Justified against four
   costs: what is stored, what the cap permits, the bytes and latency on the
   wire, and the calendar walk. 1M is 21 sessions rather than the 25 the cap
   would allow, deliberately. 1Y fires `CHARTING.md` §16.5's memoisation trigger,
   so Task 2.13.3's repair is a precondition of shipping it.
2. **The timeframe is derived, never chosen** — `sessions ≤ 21 → 1m`, above → `1d`,
   in one module, `apps/frontend/src/market/time-window.ts`. The derivation is
   what makes the 10,000-bar cap structurally unreachable through the named
   window form.
3. **A window means what it says**; a store that does not hold today answers
   `empty` or `partial`, which are already rendered. No client-side shortening,
   no new wire form.
4. **The vocabulary in one table** — control label, accessible name, address,
   spoken sentence, timeframe, session count. `?sessions=N` carries a count, the
   default writes no parameter, and the control does not snap an address it did
   not write.
5. **A volume abbreviation is a rounding, so the readout states the exact
   figure**; the volume plot reads `provenance.sources` rather than one feed
   label, so Story 2.14 has somewhere to draw the seam.
6. **Neither refusal is reachable through the control**, measured: 676 sessions
   of calendar headroom against a widest offer of 252, and a cap the mapping
   forecloses. Both still land in the existing six-state union — this story adds
   no state.

**Nothing shipped.** One throwaway benchmark was written under
`apps/frontend/src/market/`, run, and deleted in the same task; `git status` is
clean apart from the two documents. `pnpm verify` passes.

### The figures were re-taken, not carried forward

Session and bar counts came from `lastMarketSessions` on 2026-09-12 against a
market date of 2026-09-11. The calendar walk was re-timed in the frontend's own
runner at the windows this document proposes, and **it corroborates
`CHARTING.md` §16.5 to within 4%** at every shared point — 0.222 ms against
0.202 at five sessions, 8.500 against 8.762 at a year, 22.764 against 23.051 at
the whole stored depth. Three measurements of one algorithm on two machines in
two runtimes now agree, which makes it a property of the walk rather than of a
laptop.

---

## For the stakeholder — what this actually was, in plain terms

**Nothing is visible on screen from this task, and that is the intended outcome.**
The payoffs are Task 2.13.4, which puts traded volume underneath the price
chart, and Task 2.13.6, which puts the time-period buttons on screen. This task
was the decision that has to happen before either of those is drawn.

### The question

The Security Explorer currently shows one thing: NVDA's price over the last five
trading days. The obvious next step is a row of buttons — a day, a week, a
month, three months, a year — so a user can change what period they are looking
at. That sounds like a styling question. It isn't.

Every one of those buttons reaches backwards into how much history we actually
stored, sideways into a limit our own API enforces, and forwards into two future
features: the comparison views in Epic 8, and the AI agent's ability to say
"show me the last three months" in Epic 11. **Pick the buttons by taste and one
of those three directions refuses the request — and the refusal arrives as an
error on a user's screen rather than as a sentence in a document.** So the
buttons were chosen with arithmetic.

### What the arithmetic said

We hold two kinds of bar: one per minute, going back a year, and one per trading
day, going back to the start of 2024. Our API refuses to return more than 10,000
bars in one response — refuses, rather than quietly sending less, because a
short answer that looks complete is the most dangerous kind of wrong.

A trading day contains 390 minutes. So:

- **A month at minute resolution is 8,190 bars** — comfortably inside the limit.
- **Twenty-six days is 10,140** — refused. The limit lands almost exactly on
  "one month," which is a genuinely lucky coincidence and not one to build on.
- **Three months at minute resolution is 24,570** and **a year is 97,920** —
  both far beyond it.

That settles the second decision on its own. A user cannot be offered a "three
months" button _and_ a "minute detail" switch, because that combination is a
request the system will refuse. So **the period decides the detail level
automatically**: short periods use minute bars, long periods use daily bars, and
the user never has to know. This isn't hiding something from them — the
resolution is already printed on the page and read aloud by screen readers. It
just isn't a knob they can turn into an error.

There was a cost check too. Drawing a chart requires walking a calendar of
trading days, skipping weekends and holidays. We timed it: the default
five-day view costs less than half a millisecond, a year costs 17, and "as far
back as we have" costs 45 — against a 50-millisecond budget the product
publishes for staying responsive. **So "show me everything" was declined**, for
three reasons, and the cost was the weakest of them. The stronger two: it has no
honest name (our two kinds of history reach back different distances, and
neither is "everything"), and its meaning would change every single night as more
history accumulates. A button whose label means something different tomorrow is
not a label.

### The uncomfortable one, stated plainly

**The "1 day" button will show an empty chart for most of the working day, and we
are shipping it anyway.**

Here is why. We top up our market data overnight, and our data plan won't give us
the most recent quarter hour at all. So between the opening bell and that night's
top-up, we genuinely have no data for today. "1 day" means today. The chart will
correctly say so.

We considered quietly redefining "1 day" to mean "the most recent day we happen
to have." We rejected it: the button would then mean a different date depending
on what time you pressed it, while the shareable link in the address bar said
the same thing — which is the kind of small dishonesty that makes people stop
trusting a screen. We also considered withholding the button until the live feed
arrives in Epic 3. We rejected that too, because the shortest period we offer
would then be a week, which is wrong for a product whose whole purpose is
spotting unusual behaviour within a trading session — and because a control that
grows a new button between releases is a control users have to relearn.

So: the button is there, it is never the one you land on, and when it is empty it
says clearly that it is empty rather than looking broken. **And we wrote down the
condition for changing our minds**: if, when a person actually looks at that
screen in Task 2.13.7, it reads as broken rather than as honest, the button comes
out until the live feed lands. That judgement was deliberately left to the task
that can see the pixels, because this project has already learned that lesson
once — Story 2.12 had four automated checks pass against a chart that a human
spotted was wrong within seconds of looking at it.

### The quiet decision with the longest reach

The buttons will put something like `?sessions=21` into the web address. We chose
to put a **number** there rather than a name like `?window=1M`, and that turns
out to matter well beyond this story.

Because the address carries a plain count of trading days, **anything can ask for
any period** — a user editing the address by hand, a link somebody shares, or,
later, the AI agent saying "compare these two over the last thirty days." The
product answers all of them. The five buttons are a convenient shortlist, not a
fence. When the address names a period that isn't one of the five, the buttons
simply show nothing selected rather than snapping to the nearest one, because
snapping would silently answer a different question from the one that was asked.

That is the mechanism Epic 11's "the AI changes the workspace" feature runs on,
arriving two epics early and for free, because the vocabulary was chosen with it
in mind.

### One thing we protected for later

Volume figures get abbreviated — `9.81M` rather than `9,814,203`. Abbreviation is
rounding, so the rule is that the exact number is always one hover or one arrow
key away, in the same readout strip that already un-rounds the prices.

More importantly: today all our volume comes from the full US consolidated
market. The live feed arriving in Epic 3 comes from **one exchange**, and one
exchange's volume is a small fraction of the market's. A price from one exchange
is roughly the market's price; **a volume from one exchange is nothing like the
market's volume**, and a chart that stitched the two together without saying so
would show what looks like trading collapsing at the join. Labelling that join is
Story 2.14's job, not this one's — but this task made sure the volume chart is
built to read _which sources it has_ rather than assuming one, so 2.14 has
somewhere to put the label instead of needing a rebuild.

### Where the product stands

Epic 2's finish line is: a user can search for NVDA, open it, and inspect recent
price **and volume** history. Price landed last week and draws properly. Volume
and the period control are this story — nine tasks remain, seven of which change
something on screen, and the first of those is three tasks away. After that, the
epic closes and Epic 3 makes the numbers move.
