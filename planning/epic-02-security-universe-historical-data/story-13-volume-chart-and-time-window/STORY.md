# Story 2.13 — Volume Chart & Time-Window Selection

**Status:** In progress — 2.13.1 to 2.13.9 complete
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.12
**Epic scope covered:** Basic volume chart; time-window selection

## Description

Add volume beneath the price chart, and give the user control of the period both charts
show. These are one story because they are one interaction: changing the window changes
both charts, and volume is only meaningful when it is aligned to the price it belongs to.

Volume is not decoration here. §11's anomaly detection is half a volume calculation, and
the flagship demo's line — "Volume 3.8× normal" — is a claim a user must be able to check
by looking. This story is where the product first shows the evidence behind that.

## What the user can see when this story lands

**Volume beneath the price, and the ability to change what period they are looking at** —
which is the first control in the product that changes what the data _says_ rather than how
it looks.

Concretely: a volume series aligned to the price chart above it, and a time-window control
that moves both together. Changing the window re-reads and redraws, with the loading and
partial states already established rather than a blank flash.

After this story, **the epic's exit criterion is met**: a user can search for NVDA, open it,
and inspect recent historical price and volume data.

## Why it sits here in the sequence

Immediately after the price chart, reusing its axis and interaction. It completes the
epic's exit criterion: recent historical **price and volume** data.

## Scope

- The volume chart: bars beneath the price chart, sharing its x-axis exactly, with its own
  scale
- Axis alignment as a structural property rather than a coincidence — a shared scale
  object, so the two cannot drift apart when the window changes
- Shared interaction: hovering or focusing a point reads both price and volume for that
  moment
- Volume formatting — millions and billions abbreviate, and the abbreviation must not break
  Story 1.4's tabular alignment
- The time-window control: a small set of named windows resolved through Story 2.5's
  calendar, so "5 days" means five **sessions**.
  **Story 2.5 is complete and this bullet resolves to one function (added 2026-09-06 by Task
  2.5.6): `lastMarketSessions(n, endDate)` from `@marketpulse/shared`.** Four things it
  hands this story.
  It returns sessions **oldest first**, which is what a time series is iterated in — do not
  reverse it, and note the decision exists precisely because otherwise every consumer
  reverses it and one forgets.
  Acceptance criterion 3's week is already chosen and already asserted at the unit level:
  five sessions back from **2026-11-30** is `11-30, 11-27, 11-25, 11-24, 11-23`, which skips
  Thanksgiving `11-26` **and** the weekend — three ways a naive implementation is wrong, in
  one assertion. This story's job is to prove it through the **control**, not to re-derive it.
  **`11-27` is a half day (210 bars, closes 13:00 ET)**, so a window containing it has a
  short session in it — the x-axis must not draw an empty 13:00–16:00 band and call it
  missing data.
  And **a window that runs off the calendar's 2024–2028 range REFUSES rather than returning
  fewer sessions than asked for** (ADR 0017, decision 9). That is a real state this control
  can reach, it is not an error the user caused, and it belongs in the §36 state list beside
  "empty" and "partly covered" rather than in a crash
- The mapping from window to timeframe — an intraday window wants minute bars, a multi-year
  window wants daily ones — and whether the user sees that mapping or only its effect
- Window state in the URL (Story 2.10's decision), so a window is shareable and survives a
  reload
- Behaviour on change: what happens to the visible chart while the new window loads. A
  chart that empties and refills flickers; one that keeps the old data and marks it stale is
  the §36 shape and is what a live product will need in Epic 3 anyway
- The states: a window with no data, a window partly covered, and a window whose data
  failed to load with the previous window still on screen

## Out of scope, and who owns it

- Volume **baselines** and "3.8× normal" — Epic 5 computes that; this story shows the raw
  series it is computed from
- Scrubbing, zooming and panning as free-form gestures, unless they fall out cheaply from
  Story 2.12's choice
- The replay timeline scrubber — Epic 13, which is a different control with a different
  meaning and should not be confused with this one
- Comparison windows across securities — Epic 8

## Open decisions — settle with the user

1. **Which windows.** A defensible set: 1 day, 5 days, 1 month, 3 months, 1 year. Each one
   added costs ingestion depth in Story 2.8 and payload in Story 2.9, so this decision
   reaches backwards
2. **Whether the timeframe is user-visible** or is derived from the window. Deriving it is
   simpler and is what most products do; exposing it is more honest and is closer to what an
   analyst tool does
3. **Whether an intraday window shows a partial current session**, which is where §36's
   "displaying data through 10:42:17" first becomes relevant — and where Epic 3 will make it
   continuous

## Design surface

The window control is a small, high-traffic component and will be reused by Epic 8's
comparison views and pushed by Epic 11's `setTimeWindow` command. The price/volume pair is
the product's first composed visualisation and needs a proportion decided rather than
defaulted — volume is a supporting series and should not compete with price for attention.

## The design bar

**PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ apply to this story, and they
are acceptance criteria rather than polish.** Correct and accessible is the floor. Before
this story is called done, apply the four tests to a screenshot of what it built: would a
stranger believe this is a real funded product; does it look designed rather than
defaulted; is there a moment in it worth showing somebody; and does it feel alive. If the
answer to any of them is no, the story is not finished — and "we will polish it in Epic 15"
is not available, because Epic 15 is a release epic and polish deferred is polish never.

**The time-window control is this story's design surface**, and it is the first control in
the product that changes what the data says. It is also where test 4 — does it feel alive —
is most obviously answerable: what happens between one window and the next is a decision,
and an instant swap of one dataset for another is the version that feels dead.

## Acceptance criteria

1. Volume renders beneath price, sharing an x-axis, verified across a window change rather
   than in one state
2. Changing the window updates both charts, is reflected in the URL, and survives a reload
3. "5 days" is five trading sessions across a week containing a holiday
4. Loading, partial, empty and failed states each render, and a failed window change leaves
   the previous data visible and labelled rather than blanking the page
5. The whole control is keyboard-operable and the axe gate stays clean
6. Stories exist per state and `pnpm stories` passes
7. `pnpm verify` passes

## What this story hands forward

The epic's exit criterion met in substance, and the window control Epics 8, 11 and 13 reuse
or deliberately distinguish themselves from.

## Tasks — added 2026-09-12

Ten tasks, sequential. The shape follows Stories 2.9 to 2.12: **the decisions are
settled first and ship nothing** (2.13.1, 2.13.2), the arithmetic that needs no
screen is built and tested on its own (2.13.3), and the first visible thing lands
as early as the dependency graph allows rather than at the end.

**Seven of the ten change something a person can see, and the first of those is
fourth** — the same arrangement Stories 2.11 and 2.12 used, for the reason
`CLAUDE.md` gives: a run of tasks with no visible change is how a product stops
being demonstrable.

**Volume comes before the control, and that is the one ordering decision worth
arguing for.** The story is explicit that the two halves are one interaction, which
is a reason to design them together (2.13.2 does) rather than to build them
together. One series in one window on an axis already known to be right is a
smaller problem than a control that moves two series at once; building volume first
means the control arrives with something to move, and means a week of work does not
pass with nothing on screen.

**2.13.1 and 2.13.2 are split because they are different decisions.** The first is
what the product offers — which windows exist, what each costs in stored depth, in
bytes, in a refused cap and in a calendar walk. The second is the instrument: what
the control and the volume bars look like, on the canvas that has been the source of
truth since ADR 0026, with the tokens landed in the chain the ADR fixes.

**2.13.3 carries a repair rather than only an addition.** The `timeAxis` walk costs
**46 ms of a 50 ms budget** at the widest window this story might offer, twice per
render, and **20.6 ms** again on the server — three callers of one algorithm. It is
memoised in `packages/shared` before any wide window is reachable, and explicitly
**not** with a `useMemo` in a component, which would fix one caller of three.

**2.13.4 is the payoff and 2.13.7 is what makes it honest**, split as 2.12.4 and
2.12.7 were. The first is a correct second series in a correct frame; the second is
every way a window change can answer — stale above all, which is inherited whole
and which this control is the first thing in the product to produce deliberately.

**2.13.8 and 2.13.9 are the criteria a green `pnpm verify` cannot see**: a tab stop
that does not land behind the sticky chrome, a text alternative that accounts for a
window the reader chose, a selected state that survives greyscale — and the cost of
the first marks on this axis that are **per bar**, which at the cap was measured at
9,790 elements and tasks of 137–254 ms and at the default window at none.

| Task                                                                             | What it does                                                                   | Visible?                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| [2.13.1](TASK-01-settle-the-windows-the-timeframes-and-the-vocabulary.md)        | Which windows, the timeframe mapping, the URL vocabulary, what a window costs  | No                            |
| [2.13.2](TASK-02-the-window-control-and-volume-on-the-canvas.md)                 | What the control and the volume bars look like, and the pair's proportion      | **In the workshop**           |
| [2.13.3](TASK-03-one-axis-volumes-arithmetic-and-the-calendar-walk.md)           | One axis as an object, volume's arithmetic, the calendar walk memoised         | No                            |
| [2.13.4](TASK-04-volume-in-the-region-that-named-it.md)                          | Volume beneath price, in the region that has been naming this story            | **Yes — the payoff**          |
| [2.13.5](TASK-05-one-reading-two-series.md)                                      | One crosshair, one readout, one tab stop — now answering for both series       | **Yes**                       |
| [2.13.6](TASK-06-the-window-control-on-screen.md)                                | The control, the query string's first occupant, both charts moving together    | **Yes — the second payoff**   |
| [2.13.7](TASK-07-every-state-of-a-window-change.md)                              | Stale, superseded, empty, partial, refused, failed — produced from real bodies | **Yes**                       |
| [2.13.8](TASK-08-the-walk-keyboard-screen-reader-and-the-week-with-a-holiday.md) | The walk, and criterion 3 proved through the control rather than re-derived    | **Yes**                       |
| [2.13.9](TASK-09-measured-the-bars-the-window-and-fifty-milliseconds.md)         | Per-bar fills at the cap, the window change, the repair re-measured            | No, unless it finds something |
| [2.13.10](TASK-10-deployed-verify-document-and-adr.md)                           | Deployed, the four tests applied, `VOLUME-AND-WINDOW.md`, ADR 0028             | **Yes — deployed**            |

**The subject document is `VOLUME-AND-WINDOW.md`** in this directory, created by
2.13.1 and finished by 2.13.10. It is not a section of `CHARTING.md`: that document
is how this product **draws**, and half of what this story settles is a window
vocabulary that Epic 8 reuses, Epic 11 pushes with `setTimeWindow` and Epic 13
deliberately distinguishes its own scrubber from. `CHARTING.md` gains amendments
where the chart layer itself learns something, as §§10–17 did.

**What none of the ten owns**: the feed label's wording, a stitched series naming two
sources, and the epic's formal close. Those are Story 2.14's, and 2.13.10's job is
an accurate statement of what is left rather than an early attempt at it.

---

## Amended 2026-09-10 by Task 2.10.9, after Story 2.10 closed — the window control's rules are already written

The subject document is
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
and the decisions are ADR 0023. Four things about the window are settled, and
each would otherwise be re-taken differently here.

**The window lives in the URL, and the address bar is never rewritten into a
different form** (§3). A user who picked "the last five sessions" shared a link
that means five sessions; resolving it to an absolute range behind their back
changes what their link says tomorrow. That is a rule about the **address** and
it says nothing about what is sent behind it — Task 2.10.5 declined to re-ask for
a resolved window on its own arithmetic, and its reasoning and reversal trigger
are in `use-bar-series.ts`'s header.

**A window change is the same event as a symbol change**, as far as this layer is
concerned: it changes `barSeriesQuery(request)`, which is the cache key and the
request. `useBarSeries` already supersedes the request in flight, resets the view
to the new key's held entry or to `loading`, and never paints the previous
window's series under the new window's label. **You should need no new
cancellation code**; if you find yourself writing some, that is the signal
something is being keyed differently rather than that the rule is missing.

**Stale-while-loading is decided and you inherit it whole** (§2's amendment). A
held answer for the same request paints in the first commit, marked with a rail
above the body — a dashed marker, a sentence, a travelling dashed hairline — and
**no number is touched**. The settle wash on the new answer plays only if a
figure actually moved. Your control is the second thing to produce this
transition and the first to produce it deliberately, so it is the natural place
to check the mark under a _rapid_ sequence of changes, which nothing has done.

**The cap is 10,000 bars and it is refused rather than reduced**, with a 400 that
names the number. A control that can ask for more than the cap has to render a
refusal — which already has a rendering, carries the server's sentence verbatim,
and correctly offers **no retry**, because waiting never helps. Do not write copy
around a bar count: every number on this surface comes from the response, and a
sentence written around a specific figure is wrong for every window except one.

**One gap this story is well placed to close.** A window control that changes the
request while one is in flight is the cheapest way to observe a **superseded**
answer in a real browser. Today that property is asserted in jsdom by request
identity, because there is no client-side route from one request to another —
see Story 2.11's amendment for the other half of the same gap.

## Amended 2026-09-11 by Story 2.11's close — **both halves of this story land in places that already exist**

Two corrections to this file's framing, neither of which changes its scope.

**The volume chart fills a named region, it does not add a panel.**
`SecurityExplorer.tsx` places `PRODUCT_SPEC.md` §8.3's seven contents once, and
the **Volume** region's placeholder already names this story by number:

> Traded volume across the same window as the price above it, which is why it
> sits directly beneath at the same width.

"Directly beneath at the same width" is therefore already true in the grid —
this story inherits the alignment rather than establishing it, and the concrete
defect is a second panel beside the region that has been holding the space.

**The window control arrives into an empty query string, deliberately.**
`SEARCH-AND-SELECTION.md` §3 decided that a search query never reaches the
address, precisely so that this story's `?sessions=5` (or an absolute range) is
the **first** occupant of the query string with no precedent to argue with. That
is a handover, not a coincidence.

---

## Amended 2026-09-12 by Task 2.12.9 — the window control has a measured cost waiting for it, and it is the calendar

Story 2.12's measurement task traced the price chart against
`PRODUCT_SPEC.md` §28 and found **nothing wrong with the chart**. It found
something wrong with the window this story is about to make reachable, and the
figure exists now so that this story starts with it rather than discovering it.

**`timeAxis` walks the trading calendar day by day, and `PriceChart` calls it
twice per render** — once through `chartFrame` and once through
`chart-alternative.ts`, which derives its own axis on purpose
([`CHARTING.md`](../story-12-price-chart/CHARTING.md) §15.3). Timed as a pure
function on 2026-09-12, Node 24, 200 iterations:

| Window                               | Sessions | Per call      | **Per render (×2)** |
| ------------------------------------ | -------: | ------------- | ------------------- |
| 5 sessions of `1m` — today's default |        5 | 0.202 ms      | 0.4 ms              |
| 25 sessions of `1m` — the `1m` cap   |       25 | 0.932 ms      | 1.9 ms              |
| 1 month of `1d`                      |       24 | 0.849 ms      | 1.7 ms              |
| **1 year of `1d`**                   |      253 | **8.762 ms**  | **17.5 ms**         |
| **672 sessions of `1d` — "max"**     |      672 | **23.051 ms** | **46.1 ms**         |

**A "max" window at `1d` spends 46 ms of a 50 ms budget walking a calendar
before a pixel is drawn** — per answer **and per resize tick**, because the frame
is rebuilt when the box changes. And it is paid **again on the server**: Task
2.9.9 measured the same walk over the same 672 sessions at **20.6 ms** in the
cap check, on every cache hit (`MARKET-DATA-API.md` §12.4). Two independent
measurements of one algorithm, 12% apart.

Three consequences for this story, in the order it will meet them:

- **Choosing the ranges the control offers is a performance decision, not only a
  product one.** A month of `1d` is free. A year is 17.5 ms of client render.
  "Max" is 46 ms plus the server's 20.6.
- **The repair is `packages/shared`'s and it pays three callers** — memoise the
  walk on its window. It is the repair Task 2.9.9 argued for once and declined to
  take alone; a second caller and a third have arrived since, which is the
  condition it was waiting for. `CHARTING.md` §16.5 states the trigger as **the
  first window control offering a range wider than three months at `1d`** — which
  is this story, if it offers one.
- **Do not take the repair by memoising in the component.** A `useMemo` in
  `PriceChart` fixes one of the three callers, makes the recomputation
  conditional on a dependency array somebody has to keep right, and leaves the
  server paying in full.

One thing this story inherits **working**, so it is not re-litigated: the chart
itself is flat in the bar count — 9,750 bars cost about 5 ms and no elements more
than 780 — and the crosshair holds 60 FPS at the cap. Volume bars are the first
marks this axis will carry that are **per bar**, so `CHARTING.md` §1's constraint
and §2's threshold are the things to read before drawing them: one `<rect>` per
bar at the cap was measured at **9,790 elements and five main-thread tasks of
137–254 ms**, and at the default window at **no long task at all**.

---

## Amended 2026-09-12 by Task 2.13.1 — the three open decisions are settled, and one figure in this file is no longer live

**The three open decisions above are closed** and their record is
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md). In one line each:

1. **Which windows — 1D, 5D, 1M, 3M, 1Y, and no "max."** 1M is 21 sessions
   (8,190 bars) rather than the 25 the cap would allow. "Max" was declined on
   three grounds, of which its cost is the weakest: it has no honest label and
   its meaning changes nightly.
2. **The timeframe is derived, never chosen** — `sessions ≤ 21 → 1m`, above →
   `1d`, in one module. The derivation is also what makes the 10,000-bar cap
   structurally unreachable through the named window form.
3. **An intraday window shows whatever the store holds**, reported by the
   coverage machinery that already exists. No client-side shortening, no new wire
   form. `1D` is offered knowing it is reliably `empty` until Epic 3, never as the
   default, with a reversal trigger 2.13.7 has to answer by looking at it.

**And one figure in the 2.12.9 amendment below is no longer a live claim.** It
says the calendar walk costs _"46 ms of a 50 ms budget at the widest window this
story might offer"_. This story does not offer that window: "max" was declined,
so **the widest reachable window is 1Y at 252 sessions and 17.0 ms per render**.
The 672-session row stands as a historical measurement and as the reason the
memoisation is right; it is not a cost anything in the product now pays. The
repair is unchanged and is still a **precondition** of shipping 1Y rather than an
optimisation following it.

**Task amendments, all of them in place rather than as re-ordering.** Nothing was
added, deleted or moved — the dependency graph is unchanged — but six task files
carry dated amendments: 2.13.2 loses an unavailable-window state that cannot
occur and gains the **no-selection** state that can; 2.13.3 gains
`time-window.ts`, which no task owned; 2.13.6 gains the no-snapping rule and the
`1d` fixture; 2.13.7 gains the labelling tension and §1.3's judgement; 2.13.9 and
2.13.10 get the corrected headline figure.

---

## Amended 2026-09-13 by Task 2.13.2 — the instrument is settled, and one task's objective was reversed

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) gained Part two, §§8–17. **No task
was added, deleted or re-ordered** — the dependency graph is unchanged and the
ordering argument this file makes for volume before the control was confirmed
rather than revisited. Eight task files carry dated amendments.

**One of them is a reversal rather than a refinement, and it is worth naming
here.** Task 2.13.5's objective said the word that matters is _one_ — one
crosshair, one readout, one tab stop — and that two readouts would be "the same
information at twice the cost". §15 reversed the readout half: **each plot
carries its own strip, stating its own subject.** The objection was correct about
two strips saying one sentence and does not apply to two strips saying two, which
is this product's existing live-region rule. What forced it is a layout fact this
file's own scope did not anticipate: at one column the two regions are
unavoidably a screen apart, because the price panel and its eight stated facts
are taller than a phone, so a single strip puts the answer off screen for anybody
pointing at a volume bar. One crosshair, one tab stop and one read position are
unchanged.

The rest, in one line each:

| Task    | What moved                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.13.3  | Volume's domain is decided (zero to peak, unpadded — §9.2's proportion depends on it); the per-pixel reduction is named and owes a property test; the gap and threshold belong with the geometry, not in `market/` and not as a token |
| 2.13.4  | Gains three obligations it did not have — `provenance.sources` (owed from 2.13.1 and never filed), the extent-band measurement (owed from 2.12.5), and confirming the axis-pixel assertion covers the second fill                     |
| 2.13.5  | The reversal above, plus the volume strip's rest state and the wrapper that keeps one read position out of both frame owners                                                                                                          |
| 2.13.6  | The control gains a **readout** stating the resolved session count, and a selection that moves before the request resolves                                                                                                            |
| 2.13.7  | The control can no longer contradict the chart — it follows the address, and has no pending state; and the surface count is four                                                                                                      |
| 2.13.8  | Greyscale becomes a confirmation rather than a search; the text alternative's open question is narrowed but still this task's                                                                                                         |
| 2.13.9  | A fourth candidate on a different axis: the path **string** at 1M, which `CHARTING.md` §1's element count cannot see                                                                                                                  |
| 2.13.10 | ADR 0028 gains the per-bar rendering rule; test 4 gains a **count** of deferrals rather than only a verdict                                                                                                                           |

**Acceptance criterion 4 is unchanged and is now better supported.** §6.3's
labelling tension — `refused` and `failed` draw no frame, while criterion 4 asks
that a failed change leave the previous data visible — is still 2.13.7's to
resolve, and 2.13.2 added nothing that makes it harder.

---

## Amended 2026-09-13 by Task 2.13.3 — the arithmetic exists, 1Y's precondition is met, and no task moved

**No task was added, deleted or re-ordered.** The dependency graph is unchanged and
nothing 2.13.3 built or measured needs work nobody owns. Seven task files carry
dated amendments, all of them narrowings: a decision that was open is now a named
function, or a figure has moved.

**The one thing in this story that was blocked is not any more.** §1.2 made the
memoisation a **precondition** of offering 1Y rather than an optimisation
following it. It landed, in `packages/shared` and on a **market date** rather than
on a window — `MARKET-DATA-API.md` §12.4 had already attributed the cost to
constructing each session's two instants rather than to walking the days, so a
per-date memo pays every walker in both applications instead of one function's
arguments. **1Y is 0.8 ms per render against 17.0 before, and the server's cap
check is 0.9 ms on a cache hit against 20.6.** The honest half is recorded with
it: the _first_ walk of a set of dates still costs about 9.5 ms once per process,
so what the repair removed is the repetition.

What moved, in one line each:

| Task    | What moved                                                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.13.4  | The frame API is named and this task deletes `chartFrame`; the clip is the renderer's and there is **no** separate volume baseline; §15.1's wrapper arrives here, one task early |
| 2.13.5  | `formatVolumeExact` and `spokenVolume` exist; the rest state needs the peak **bar** and only the peak figure is returned; `peak` is `null` with no bars                          |
| 2.13.6  | `time-window.ts` exists with the five windows and the mapping, so "one home" is a grep — and the address **parser** is deliberately still unbuilt, with its open case intact     |
| 2.13.7  | Two facts about the states with no bars: volume's gutter writes nothing rather than `0`, and an all-zero window is a drawn `loaded` that looks blank                             |
| 2.13.8  | Criterion 3's axis half is asserted — as an **absence**, which is the form to copy — leaving the picture to `pnpm e2e`; the spoken volume form is a call                         |
| 2.13.9  | The calendar-walk re-take is **done** in the runner; what is left is the cold walk at first paint, a resize tick, and the rapid sequence — the halves only a browser can take    |
| 2.13.10 | Three sweep targets are already swept; ADR 0028 gains the shared-axis type and the memo as decisions, the second with its own reversal trigger                                   |

**And one correction to `VOLUME-AND-WINDOW.md` §10.3, found by building it**: its
`Slot` column divides by the bar count where the drawn pitch divides by one less,
so a column of `slot − 1` leaves a 2.0 px gap at thirty bars rather than §10.2's
stated 1 px. The geometry measures the gap against the pitch; the table now carries
a dated amendment, and the byte figure came out **better** than predicted at
10.6 kB rather than 16.8.

---

## What 2.13.5 settled, and what it hands the rest of the story — 2026-09-13

**The reading answers for both plots, and it is still one reading.** Its record is
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) Part four (§§22–29) and its canvas
is `Volume reading.dc.html`.

Three things §15 left open are now decided: **one crosshair per plot at one
pixel, from one index**; **the price plot's hollow disc at the bar's own volume**,
which below a pixel per bar deliberately sits inside a taller column; and the
volume strip's resting state, which is **the window's peak and when it happened**
rather than a second copy of the price strip's invitation.

Two things that are properties of the pair rather than of either plot:

- **The volume plot adds no tab stop and no live region.** One stop for the pair,
  on the price plot; the volume figure reaches a listener as one more clause in
  the existing spoken sentence, whose subject moved from `price chart` to
  `chart reading` — which also repairs two surfaces that had been opening with
  one phrase since Task 2.12.6.
- **`PriceChart.test.tsx`'s zero-recomputation guard is finished** rather than
  re-pointed: three frame builders, both plots on screen, still zero across forty
  presses, and the break performed (120 — three builders × forty presses).

What it hands on:

| Task    | What moved                                                                                                                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.13.6  | Nothing new to build in the reading, and the pair added **no** tab stop — but `1d` makes **five** call sites print a time of day for a bar that is a whole session, which the recorded `1d` body makes readable for the first time                                          |
| 2.13.7  | Owns the fence this task stopped at, and it is now **overriding a built default rather than choosing between two options**: the read position survives a window change, is clamped, and is therefore _wrong rather than absent_ whenever the new window is at least as long |
| 2.13.8  | Inherits a page with **two** readout strips, one deliberately absent from the accessibility tree. The claim to walk is whether a bar's traded volume is genuinely reachable with the screen off                                                                             |
| 2.13.9  | The zero it had to confirm is now mechanical; what is left is telling the **resize** fan-out apart from the **pointer** fan-out, which is newly possible because only one of them touches a frame builder                                                                   |
| 2.13.10 | ADR 0028 gains a **fourth** shared-axis mechanism — the second context — and the reason it is not the store trigger firing                                                                                                                                                  |

**And one defect found in shipped code rather than written today**: the price
strip's reserved height was `max(reading, whatever is live)`, so a width at which
the _invitation_ wraps further than a reading dropped the four exact prices by a
line under the reader's hand — `CHARTING.md` §15.4's own defect from the other
direction, at widths its own table shows are reachable. Both strips now reserve
every state they can be in, and §15.4 carries a dated amendment.
