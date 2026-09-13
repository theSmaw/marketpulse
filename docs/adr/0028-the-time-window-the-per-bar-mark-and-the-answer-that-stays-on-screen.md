# ADR 0028 — The time window, the per-bar mark, and the answer that stays on screen

**Status:** Accepted
**Date:** 2026-09-13
**Delivered by:** Epic 2, Story 2.13 (Tasks 2.13.1–2.13.10)

## Context

Story 2.13 added a second plot beneath the price chart and the first control in
this product that changes **what the data says** rather than how it looks. Both
halves reach much further than the screen they were built for, which is what
makes them an ADR rather than a story record.

**The window is a vocabulary four later epics speak.** Epic 8's comparison chart
shows two securities over one window; Epic 11's `setTimeWindow` is an agent
moving it; Epic 13's replay scrubber has to be told apart from it. A window that
is named in one place, spelled differently in a second and spoken differently in
a third is three vocabularies to reconcile later, at three times the cost.

**The second plot is where the chart layer stops being one chart.** ADR 0027
decided the renderer and the coordinate system against a single series. The
moment there are two, the questions are different: who owns the axis, what a
second plot costs, and what happens on a pointer move when two plots must agree
about one position. Epic 5's anomaly markers, Epic 8's comparison series and
Epic 9's filing markers are all third and fourth plots on this axis.

**And one decision here is not about charts at all.** A window change is the
first time this product issues a second request for a screen that already has an
answer on it. What it shows in between is a question Epic 3's live feed, Epic
11's agent and Epic 13's replay all ask again, and the answer taken here is the
one they inherit.

The working record is
[`VOLUME-AND-WINDOW.md`](../../planning/epic-02-security-universe-historical-data/story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md),
eight parts, which carries every alternative, every measurement and every
reversal trigger. **Every figure in it is dated 2026-09-12 or 2026-09-13 and is
an observation rather than a fact.** This document cites it deliberately rather
than restating its numbers, except where a number _is_ the argument.

## Decisions

### 1. The window vocabulary is written down once, and the timeframe is derived from it

Five windows — `1D`, `5D`, `1M`, `3M`, `1Y` — and **no "max"**, which was
declined rather than forgotten (§1.2). A window is named on a control, carried in
an address and spoken in a sentence, and §4's table fixes all three together
along with the timeframe and the resolved session count. Six decisions sit inside
it; four outlive this screen.

- **The parameter carries a count, not a name.** `?sessions=21` _is_ the request
  spelled in the address, because `sessions` is already the wire's own
  parameter. `?window=1M` would be a second vocabulary the address holds and the
  request does not.
- **The control offers five windows; the address admits any count the server
  accepts, and the control shows no selection rather than snapping** (§4(b)).
  **This is the decision with the longest reach in the story.** It is what makes
  Epic 11's `setTimeWindow` work two epics early — an agent asking for thirty
  sessions gets thirty sessions — and it is precisely what a later author
  "fixes" by rounding to the nearest offered window. Snapping would rewrite the
  user's address into a different window and silently answer a different
  question.
- **The label says the approximation; the sentence says the fact.** `1M` is
  spoken as "21 trading sessions", never as "one month", and the resolved count
  is derived from the same `timeAxis` the uncovered wash is, so a week of five
  sessions across seven calendar days cannot be described as eight. The control's
  own label therefore never appears in a text alternative (§4(e), extended to
  both plots by §43.1).
- **The timeframe is derived, never chosen**: `sessions ≤ 21 → 1m`,
  `sessions > 21 → 1d`, in one function in `market/time-window.ts` (§2). The
  property that buys is worth stating separately: 21 × 390 = 8,190 against a
  10,000-bar cap, and above the boundary every window is one bar per session, so
  **no value of `sessions` from any source can produce a `too-large` refusal**
  through the named window form.

`1M` and `1m` are different things, resolved by case alone, and they never appear
adjacent (§4(f)).

### 2. The volume mark is one path at every window, and below a pixel per bar it is one stem per pixel column

Three regimes from one rule — _does a bar have a pixel of its own_ — with the
threshold set by the device rather than by taste: a 1 px gap above 2 px of pitch,
no gap between 1 and 2, and below a pixel a **silhouette carrying each pixel
column's tallest bar** (§10). The default window renders the third, and it paints
the identical picture while bounding the cost by the plot's width rather than by
the bar count.

**The premise for this is not ADR 0027's task durations, and the break was
performed to find that out.** 0027 records that one element per bar at the cap
costs 9,790 elements and main-thread tasks of 137–254 ms. One `<line>` per bar in
the _volume_ plot — real geometry, real stroke width — puts **9,810 elements** on
the page and produces **no main-thread task over 50 ms at all**: not cold, not
under a 30-tick resize storm, not under 120 pointer moves. `PerformanceObserver`
reports a clean run against it.

So this is not a second statement of 0027's constraint. It is a **second,
different** constraint, and `PRODUCT_SPEC.md` §28's own criterion is structurally
blind to it (§56):

| At the 9,750-bar cap | Plot elements | 30 resizes: JS self | Engine |   GC | > 50 ms tasks |
| -------------------- | ------------: | ------------------: | -----: | ---: | ------------- |
| As shipped           |        **61** |             31.3 ms |  103.8 |  4.1 | **none**      |
| One `<line>` per bar |     **9,810** |        **333.5 ms** |  235.3 | 24.7 | **none**      |

**10.7× the JavaScript, 2.3× the engine's own time, six times the collection —
and nothing to report**, because forty resize ticks are forty separate tasks and
eleven milliseconds each never crosses fifty. The rule is a **cost ceiling**, not
a repair for a long task.

**The path string is the cost 0027's element count cannot see, and it is bounded
rather than expensive** (§51):

| Body             |  Bars | Volume `d`, stems |  Price line `d` |   Line parse |
| ---------------- | ----: | ----------------: | --------------: | -----------: |
| 5D — the default | 1,950 |  12,215 ch. / 833 |      23,803 ch. |     0.082 ms |
| **1M**           | 8,190 |  12,239 ch. / 833 | **100,427 ch.** | **0.232 ms** |
| the cap          | 9,750 |  12,223 ch. / 833 |     118,086 ch. |     0.330 ms |

The ceiling is exact — **833 stems on an 833 px plot at all three** — so the
silhouette's string is flat across a 5× range in bars and the price line's is
not. **And all three parse in fractions of a millisecond.** That half must be
read with the table: the reason to bound the string is the element count above,
not the parse. An ADR that read as though 100 kB of path data were a problem
would be recording a fear rather than a measurement.

What holds the rule is `VolumeChart.test.tsx`'s element-count shape guard,
break-verified at `expected 1951 to be 31` twice, by 2.13.4 and again by 2.13.9.

**ADR 0027 is not reopened.** It decided the renderer; this decides what to draw
with it. Epic 5's anomaly markers and Epic 9's filing markers are both per-bar
marks, and what this tells them is that `longtask` will not warn them.

### 3. Two plots hang on one axis, and that is four separately-undoable mechanisms

Not a discipline and not a convention — a type, a deletion, and two throws:

1. **`timeFrame` is the only function in the chart layer that takes a window.**
   `priceFrame` and `volumeFrame` take one of its _results_ and a height, so
   neither **can** build an axis.
2. **`chartFrame` is deleted** — the composition that took a whole plot box and
   could therefore have built an axis out of one plot's height.
3. **`useChartAxis` throws outside a provider**, so a plot cannot quietly fall
   back to building its own. Two plots that each called `timeAxis` on the same
   window would agree at every width where both had been measured and differ for
   one frame on every resize.
4. **The read position lives in a second context on the same wrapper, and
   `useChartReading` throws outside it.** Neither frame owner consumes it.

The fourth earns its line because the correct implementation and the
catastrophic one are the same size and look identical on screen: merging the two
context values — one object instead of two, a one-line "simplification" — hands
the read position to every `useChartAxis()` caller, and both frame owners are
callers, so a pointer move would rebuild a 1,950-point path string and a 726-stem
silhouette to move one vertical rule. That is the shape `CLAUDE.md` records as
**17× the CPU on the pointer path with no long task at all**.

**The sentence Epics 5, 8, 9 and 11 inherit:** _a second plot is handed the
frame, never the window; it draws at the frame's width rather than at its own
measurement; and anything that changes on a pointer move reaches it through a
context neither frame owner reads._ The middle clause is the one a reader drops —
two equal-width elements measured a frame apart are two different numbers for one
render.

**What it bought, measured** (§50, §52): a second plot on this axis costs **`+1
path`, `+1 rect` and `sessions − 1` lines** and **nothing that scales with the
bar count**, confirmed from the other side by the `1d` rows where 59 bars and 248
bars produce identical counts; the cold-load delta is 0–6 ms. A resize tick
rebuilds both frames in 0.35 / 0.65 / 1.04 ms at 5D / 1M / 1Y, and **a pointer
move rebuilds neither** — across 120 moves at four windows not one frame builder
drew a single sample. The extraction was net **−96 B** before either consumer
used it. **Epic 8's comparison chart is the reader who needs this, and the
sentence it needs is: the axis is already paid for; a third plot costs one path,
one rect and one line per session.**

**The second context is not `FRONTEND-STATE.md` §1's store trigger firing.** That
trigger is _the first piece of state two features must agree about that neither
owns_; this is two components inside one feature on one route. A reader meeting
two context providers in one component will otherwise reasonably conclude the
trigger fired quietly and nobody wrote it down.

### 4. The trading-calendar walk is memoised in `packages/shared`, on a market date, with no clock

`marketSessionOn` remembers each market date's session in a module-level map
(`packages/shared/src/market-session.ts`). It takes `1Y` from **17.0 ms per
render to 0.8** and the server's cap check from **20.6 ms per cache hit to 0.9**,
which is what made a 252-session window offerable at all.

Three properties of the memo are the decision, not the speedup:

- **Keyed on a market date**, never on an instant or anything ambient. A memo
  keyed on ambient time would be a temporal-isolation hazard, and Epic 13's
  replay is the reader that cares (invariant 4).
- **No clock**, enforced by the `no-restricted-syntax` rules already standing
  over `packages/shared/src`.
- **Bounded by the calendar's own range**, 2024–2028, so the cache cannot grow
  without limit and needs no eviction policy.

**Reversal trigger: the first caller that needs a session for a date outside the
calendar's range** — at which point the bound stops being structural and the
cache needs a policy.

Nothing in `pnpm verify` can see this decision being undone, because a function
that got slower is still correct and a timing gate in `pnpm test` measures the
runner. It is on `CLAUDE.md`'s gap list with a re-measure for that reason.

### 5. The address is the window's home, and the client repairs nothing

The window lives in the query string, which it is the first occupant of (§31).
Three consequences reach past this screen:

- **The address admits any count the server accepts** — decision 1's §4(b),
  restated here because it is a property of the _address_ as well as of the
  control, and it is the half Epic 11 depends on.
- **A value that is not a count is asked for anyway and the server's refusal is
  what a reader sees.** `use-security-symbol.ts`'s precedent generalised from a
  ticker to a number, with one recorded imprecision: the wire carries a `number`,
  so `abc` is refused as `NaN` rather than as `abc`.
- **Read in one place, built in one.** The symbol's arrangement applied to the
  view, which is also why the parser does not live in the vocabulary module.

A window change **pushes** history, so Back undoes it; a change of **security**
does not carry the window.

### 6. On a daily axis, a slot is a session

A chart-layer rule rather than a window one, and it belongs here because every
epic that hangs a mark on this axis will ask where an instant goes.

The vendor stamps a daily bar at **midnight** market time, which is outside
trading hours. The `1m` rule — place an instant by where it falls _inside_ a
session — therefore resolved every bar in a `1d` window to the _between
sessions_ case and dropped it. `3M` drew a correct axis, a correct headline, a
correct coverage sentence and **no line at all**, with nothing red anywhere.

**State the defect with the rule.** It is the clearest example in this story of a
branch that typechecked, read correctly and had never run: all fourteen recorded
bodies were `1m`, so no test in the repository could reach it. It is now four
tests in `chart-time-axis.test.ts` over a recorded `1d` body, three of which go
red when the branch is deleted.

Decision 3's mechanism list stays at **four**. This is a rule about
`positionOfInstant`, not a fifth structural guard.

### 7. What is on screen is not always what came back

**The last _answer_ a page painted is kept, together with the request it answers,
until a newer answer replaces it — cleared on a change of security and never
otherwise** (§36).

The state union answers _what came back_. It cannot answer _what is on screen_,
because on a window change those are two different questions and three of its six
members carry no picture at all. So a refusal is an answer about the **new**
window while the previous window's series is still a true picture of the
**previous** one, and the two are readable together only because one rail says
which: _"Still showing the 5-session window. The 21-session window could not be
read."_

Three things make it ADR-worthy:

- **It is the seam Epic 3 lands on.** A screen that already knows how to keep
  showing the last true thing while it waits for the next one is a screen a
  socket can feed. `PRODUCT_SPEC.md` §36's _"Live feed disconnected — displaying
  data through 10:42:17"_ is this rule with a different sentence on it.
- **It is what makes Epic 11's `setTimeWindow` safe to hand to a model**,
  together with decision 5. An agent changing the window with nobody touching
  anything is exactly the case where a page that blanks, or a chart that silently
  relabels itself, is worst.
- **It is neither a seventh member of the state union nor `stale`**, and both are
  the obvious readings. It is a fact about **two** requests; a union member
  describes one. `stale` is one mark for one answer on the panel's rail, and a
  held chart is drawn identically to a fresh one.

**The fence is the security, and it is the whole of the safety**: a held NVDA
series under an AMD heading is the failure this layer exists to prevent.

**Both `FRONTEND-STATE.md` triggers stay unfired**, and this is said explicitly
for decision 3's reason. §1's store trigger — _the first piece of state two
features must agree about that neither owns_ — has not fired; and §2's — _a chart
that redraws a held series in a second style_ — has not either, because a held
chart's series path is byte-identical to the fresh one's, which is what the
browser suite asserts. **ADR 0023 is not reopened.** It decided that there is no
store; this decides what one screen shows while two requests are in play, spelled
as a pure transition beside the ones that file already argues for.

## What a green suite certifies here, and what it does not

### What it certifies

- **That the two plots hang on one axis and stop at the same pixel.** Measured on
  the running page and held by `e2e/specs/security-price-chart.spec.ts`.
- **That neither plot draws an element per bar.** Two element-count shape guards,
  both break-verified, at `expected 1952 to be 32` and `expected 1951 to be 31`.
- **That a pointer move recomputes no frame**, counted across 120 recomputations
  with **all three** frame builders instrumented and both plots on screen, with
  the counter verified live in the same test.
- **That a window change stays client-side and does not rewrite the address**,
  including that an address naming a count outside the five is still there
  afterwards. Held by `e2e/specs/security-window-control.spec.ts` and by nothing
  below it — jsdom cannot tell a client-side navigation from a document one at
  all.
- **That a window change keeps the previous window's charts on screen,
  labelled**, by comparing the series path data either side and requiring it to
  be byte-identical.
- **That the description is attached to something focus can reach.** The walk
  found the readout hung on a `radiogroup` that no key press lands on, with axe
  reading zero violations throughout; the spec now walks to the stop and reads
  the description off the element focus landed on.
- **That acceptance criterion 3 is a rendering rather than a claim.** Thanksgiving
  week 2026 is in the future and no address reaches it, so the shipped route was
  driven with its clock pinned and the browser asserts the **picture** — four
  session seams rather than five, `Nov 26` labelled nowhere, and the half day's
  band at 210 / 390 of the others.

### What it does NOT certify

- **That §28's criterion can see a regression of this kind.** It cannot, and §56
  is the sharpest demonstration in the repository: 10.7× the JavaScript on the
  resize path, 9,810 plot elements instead of 61, and a clean `longtask` run
  against it. This is the second finding of that shape after ADR 0027's 17×
  pointer path. **A published performance target and the instrument it is written
  against are different things.**
- **That any of Part eight's figures hold anywhere but where they were taken** —
  one laptop, 2026-09-13, against fulfilled bodies. No wall-clock assertion was
  added anywhere, deliberately.
- **That the memoised calendar walk stays memoised.** Nothing can see it: a
  function that got slower is still correct.
- **That a per-bar call into the timezone layer stays off the `1m` path.** §55.1
  prices the counterfactual at 15.9 ms at the default and 59.3 ms at `1M` — over
  the whole budget before a pixel is drawn — and the `1m` branch avoids it by
  arithmetic rather than by a check. Task 2.13.10 attempted to make this
  mechanical and **could not**: `vi.mock` does not reach a workspace package
  consumed as built output, so the spy intercepts the test file's own import and
  not the module under test. It stays prose with a re-measure.
- **That the spoken sentence can be spoken in the time the pacing allows.**
  `READING_ANNOUNCEMENT_MIN_GAP_MS` is 1,500 and the sentence is 25 words, about
  8 seconds at a default rate; driven and timed, two arrow presses announce at
  477 ms and 1,981 ms. Whether that queues or replaces is reader-dependent and
  is not answerable by any test.
- **That a tick is not drawn on top of its neighbour.** `MIN_TICK_SEPARATION`
  fixes the one collision that was found by looking at a rendering; nothing
  anywhere compares a tick's position against a neighbour's rendered width, at
  any density, in any chart.
- **That an automated browser is a valid instrument for any of the above.** A tab
  driven over CDP reports `visibilityState: "hidden"`, which pauses
  `requestAnimationFrame` and with it `ResizeObserver` delivery, so every chart in
  it measures zero — indistinguishable on inspection from a real defect.
  Re-confirmed against the deployed site at this close.
- **That `pnpm e2e:deployed` covers any of this.** The deployed suite is three
  specs about routing, the universe and the two halves. Nothing in it drives the
  window control, the rail or either plot.

## Consequences

- **Four epics inherit a window vocabulary rather than a control.** Epic 8 reuses
  it, Epic 11 pushes through it, Epic 13 distinguishes its scrubber from it, and
  all three get §4(b) — an address that admits a count the control does not
  offer — for free.
- **The chart layer is now a two-plot layer, and the axis is already paid for.**
  A third plot costs one path, one rect and one line per session.
- **Epic 3 inherits a screen that already knows how to keep the last true thing
  on it.** Decision 7 is the mechanism behind _"displaying data through
  10:42:17"_ before there is a socket to disconnect.
- **`PRODUCT_SPEC.md` §28's criterion is now known to be blind to two distinct
  regressions of real size.** Both are held by unit tests asserting a _shape_
  rather than a duration. That pattern — a count, break-verified, never a
  wall-clock — is what this story recommends to Epics 5 and 9.
- **The epic's exit criterion is met.** A user can search for NVDA, open it, and
  inspect recent historical price **and volume** over a period of their choosing,
  verified on the deployed site at three viewports and from cold deep links.
- **Test 4 of the design bar is deferred for a fourth time.** _Does it feel
  alive_ is answered "not yet, and not from here" by Task 2.4.4, by Story 2.12's
  close, by Task 2.13.2 against the artboard, and by this one. The count is the
  point: four deferrals of one criterion is the shape of a criterion that never
  gets met. Its latency half **is** closed
  here, with figures. Epic 3 owns the rest and nothing fires — the trigger is the
  calendar.

## Related

- [ADR 0027](0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md)
  — the renderer, the session-ordinal axis and the coverage rule this builds on;
  not reopened, and decision 2 is a different constraint from its element count
- [ADR 0023](0023-the-frontend-state-layer-the-cache-with-no-clock-and-what-a-green-frontend-suite-certifies.md)
  — the state union decision 7 sits beside; not reopened, and both its reversal
  triggers stay unfired
- [ADR 0024](0024-search-selection-and-the-security-explorer-shell.md) — the
  shell whose Volume region this fills, and the live-region rule the volume
  strip's absence from the tree follows from
- [ADR 0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
  — the wire `?sessions=N` is spelled against, and the cap decision 1 makes
  unreachable
- [ADR 0017](0017-the-trading-calendar-market-time-and-what-a-correct-calendar-certifies.md)
  — the calendar decision 4 memoises and decision 6 places instants against
- [`VOLUME-AND-WINDOW.md`](../../planning/epic-02-security-universe-historical-data/story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md)
  — the working record: nine parts, every alternative, every measurement, the
  accessibility walk, the performance figures and every reversal trigger
- [`CHARTING.md`](../../planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md)
  — the drawing rules both plots obey, amended by this story at §12.2, §14.4,
  §15.3, §16.2, §16.3, §16.5, §16.6 and §17.5
