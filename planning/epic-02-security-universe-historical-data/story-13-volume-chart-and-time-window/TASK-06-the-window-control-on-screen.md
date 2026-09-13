# Task 2.13.6 — The window control, in the address and on screen

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.3, 2.13.4

## Objective

Ship the control that changes the period both charts show — the first control in
MarketPulse that changes **what the data says** rather than how it looks — with the
window in the URL, resolved by the server, and both plots moving together.

## What the user can see when this lands

**They can change the period, and the address changes with them.** A set of named
windows above the charts; choosing one re-reads and redraws price and volume
together; the address carries the choice, a reload survives it, and a link they
send opens on the window they picked. `?sessions=…` becomes the **first occupant of
this product's query string**, which `SEARCH-AND-SELECTION.md` §3 left empty on
purpose so that this story's parameter would have no precedent to argue with.

After this task the epic's exit criterion is met in substance: search for NVDA, open
it, and inspect recent historical price and volume over a period of your choosing.

## Work

- **The control reads and writes the URL, and nothing else holds the window.** The
  symbol is a path segment read in exactly one place (`use-security-symbol.ts`); the
  window is a query parameter and deserves the same treatment — **one module that
  reads it, one that builds the address**, for the reason that file's header gives:
  a value read in five components is five places for the default and the decoding to
  disagree. `paths.ts` holds every path once and is where the builder belongs.

- **An absent parameter means the default, and the application never writes one it
  did not need** (`FRONTEND-STATE.md` §3). `/securities/NVDA` must stay the
  default's address — a URL that accretes every default is a session dump, not a
  shareable link. Decide what choosing the default window **back** does to an
  address that already carries a non-default one.

- **A hand-typed parameter is a real input.** An unknown window name, a negative
  count, a count over the cap, a window outside the calendar's 2024–2028 range.
  Decide for each whether the client refuses it before asking, or asks and renders
  the server's refusal — and note the precedent: `use-security-symbol.ts`
  deliberately does **not** repair a symbol that is merely unusual, because the
  server's answer naming the input beats a client silently reporting on something
  else. The rendered refusals are 2.13.7's; which ones are reachable is this task's.

- **The request changes and nothing else does.** A window change changes
  `barSeriesQuery(request)`, which is the cache key and the request;
  `useBarSeries` already supersedes the in-flight request, resets the view to the
  new key's held entry or to `loading`, and never paints the previous window's
  series under the new window's label. **You should need no new cancellation code.**
  If you find yourself writing some, something is being keyed differently.

- **The timeframe follows the window** by whatever mapping 2.13.1 settled, in the
  one home it named. Two consequences land here the moment a window maps to `1d`:
  `chart-alternative.ts`'s two `1d` branches execute **for the first time** — they
  are written, they typecheck, and they are unverified English (§17.5 item 5) — and
  the axis's tick labels stop being times of day.

- **The calendar walk is already memoised** (2.13.3). If a wide window makes the
  page feel slow here, the repair did not land; re-read its figures rather than
  adding a `useMemo` in a component.

- **The control is a component with stories, and it is small and high-traffic.**
  Epic 8 reuses it for comparison views, Epic 11 drives it with `setTimeWindow`. So
  its props are the vocabulary of a window and not of this page — a list, a current
  value, a change callback — and it knows nothing about `useBarSeries`.

- **Keyboard and the input idiom, inherited rather than invented.** If a window is
  unavailable, **a natively `disabled` control is not focusable**, so anything
  `aria-describedby` hangs off it is unreachable — this shipped for two tasks and
  `TextField` now renders `aria-disabled` + `readOnly` product-wide. The
  consequence must be followed: the state stops being inactive, so WCAG 1.4.11's
  and 1.4.3's exemptions stop covering its border and its ink. And **a control that
  changes the page must announce that it did**: on the universe's bulk toggle
  `aria-expanded` is the whole of the feedback, and a name that flips is **not** a
  substitute, because a name is read on arrival.

- **Where it sits.** Above the charts, in or beside the Price region's header per
  2.13.2's canvas positions. Mind the two layout traps: a control inside a `Region`
  is inside `overflow: auto`, which is how `scrollable-region-focusable` gets
  reintroduced, and a new tab stop can land behind the sticky chrome — measured
  **one** occluded stop at 1440×900, **four** at 768×800 and **two** at 390×780, and
  it worsens as the viewport narrows. `scroll-padding-top` is the repair and it is
  already in `base.css`; what is not automatic is checking.

## Done when

- A named window set is on screen above both charts, with the current one encoded by
  more than colour
- Choosing a window re-reads and redraws **both** plots, from one request
- The window is in the address, the default writes no parameter, and a reload and a
  cold deep link both land on the chosen window
- The window is read in one place and built in one place, and a grep shows no second
  reader
- No new cancellation or superseding code was written
- The timeframe mapping has one home, and a `1d` window is reachable and draws
- The control is keyboard-operable, announces the change it makes, and no tab stop
  lands behind the sticky chrome at **768** as well as 1440
- Stories per state of the control; `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is **states**. What the chart looks like while the new window loads, and
what a failed change leaves on screen, is 2.13.7 — and it is the larger half of this
story's acceptance criterion 4. This task ships the happy path plus the address.

The trap worth naming in advance: this control is the cheapest way in the product to
observe a **superseded** answer in a real browser, because it is the first way to
change a request without navigating. Today that property is asserted in jsdom by
request identity alone. 2.13.7 closes it; do not close it here by accident and
leave it unrecorded.

---

## Amended 2026-09-12 by Task 2.13.1 — three of the four inputs to "a hand-typed parameter" were decided, and one obligation lands here

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) settled several things this task
was told to decide, and created one it was not.

**The bullet on hand-typed parameters is mostly answered.** Its four cases were:
an unknown window name, a negative count, a count over the cap, and a window
outside the calendar. Three no longer arise as stated.

- **There are no window _names_ in the address.** §4(a): the parameter is
  `sessions` and it carries a **count**, because `sessions` is already the wire's
  own parameter and `?window=1M` would be a second vocabulary the address holds
  and the request does not.
- **A count over the cap is unreachable through this form.** §2.1's mapping
  forecloses it for every session count from every source. The `refused` state
  stays reachable through the **absolute** window form, which Epic 13 produces.
- **A window off the calendar is reachable by address and by an agent's
  `setTimeWindow`, and not by this control** — 676 sessions of headroom against a
  widest offer of 252 (§6.1). It is asked and the server's refusal is rendered,
  never pre-empted by the client: `use-security-symbol.ts`'s precedent, where the
  server's answer naming the input beats a client reporting on something else.

What is left genuinely open for this task is a **negative, zero or unparseable
count**, and the same precedent points the same way.

**The obligation this task gains: no snapping.** §4(b) decided that the address
admits any count the server accepts, and that when it names a count outside the
five, **the control shows no selection and does not snap to the nearest** —
snapping rewrites the user's address into a different window, which
`FRONTEND-STATE.md` §3 forbids, and silently answers a different question from
the one asked. This is what makes Epic 11's `setTimeWindow` work two epics early,
so it is a feature rather than an edge case. 2.13.2 owns how it looks.

**And there is no disabled window**, so `TextField`'s `aria-disabled` +
`readOnly` idiom is not needed here and its WCAG consequence does not arise. The
announcement rule still applies in full: a control that changes the page must
announce that it did, and a label that flips is not a substitute.

**`1D` ships knowing it is reliably `empty`** on a nightly-backfilled store
(§1.3). It is never the default and never preselected. Do not write copy around
that — the empty rendering already states the window and shows the whole frame as
uncovered.

**Record a `1d` response body here, not in 2.13.7.** This task is the first thing
in the product's history to make a `1d` window reachable, which means
`chart-alternative.ts`'s two `1d` branches — `intervalWord`'s _"trading
session"_ and `slotWord`'s _"sessions"_ — **execute for the first time**, and all
fourteen recorded bodies are `1m`. A task that ships unverified English and a
task that records the body to review it should not be one apart. 2.13.7 still
needs whatever bodies its transitions need; the `1d` one is this task's, with its
bundle-leak grep added to `CLAUDE.md` in the same change.

Add to **Done when**:

- An address naming a count outside the five renders with **no selection**, and a
  test proves the address was not rewritten
- A `1d` response body is recorded, a story renders it, and somebody **read the
  two `1d` sentences aloud**

---

## Amended 2026-09-13 by Task 2.13.2 — the control is fully specified, and it gains a part this file does not mention

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §8 took every visual position, so
_"per 2.13.2's canvas positions"_ in the Work section now resolves to something.
Three things change here.

### The control has a **readout**, and it is not optional

The Work section describes five cells and nothing else. §8.4 added a sixth part:
**a static micro-label beside the box stating the resolved session count** —
`5 SESSIONS`, `21 SESSIONS`, `7 SESSIONS` — present in every state, never
focusable, never a button, and sitting **outside** the bordered box.

It is what makes this task's own no-snapping obligation legible. Five unselected
buttons read as broken; five unselected buttons beside `7 SESSIONS` read as a
product that understood the address. It is also §4(e) made visible — the label
says the approximation, the readout says the fact — and it is the only place on
screen that says `1M` means twenty-one trading sessions.

**Reversal trigger, inherited:** the first window whose resolved count is not a
fact worth printing. An absolute range from Epic 13's scrubber has no session
count that means anything to a reader.

### The selection moves **before** the request resolves

§14.1: the address is the source of truth, so the selected cell changes in the
frame the press lands. **The control has no pending state, no spinner and no
disabled window** — the chart carries the stale rail, and the control carries
nothing. This is the whole of what this story can answer of test 4 _does it feel
alive_, and it is testable rather than a feeling: the selected cell must change
without waiting on `useBarSeries`.

It also resolves the tension 2.13.7's Work section names — _"the control is the
thing most likely to be left in a state that contradicts the chart"_. It cannot
be: it follows the address, and the address is what the request was built from.

### The marks, so they are not re-derived

Selection is **three channels and none of them is hue** — a 2 px **near-black**
bar along the cell's bottom, the label at `--font-weight-strong`, and the ink
stepping `--ink-secondary` → `--ink-primary`. Near-black rather than crimson: the
identity accent has four sanctioned positions in the chrome and a control that
changes a datum is not one of them, so a crimson bar is a fifth position and a
decision to escalate.

**The selected cell takes no ground; hover owns the ground**, and hover is
`--surface-sunken` and **not** `--surface-page` — the page ground is 1.02:1
against white and does not appear on a control standing on a raised panel. That
was found by drawing it, and it is the kind of value a component author
reasonably reaches for from the combobox's row hover, where it is correct.

Each cell carries the **abbreviation for the eye and the spelled-out name for the
ear** (§4d). The ARIA pattern itself — the group's role, whether the members are
radios, and the roving tab stop — was deliberately **not** taken on the canvas
and is this task's.

At 342 px of region the control wraps to its own full-width row beneath the
heading and the cells flex. It never truncates a label and **never drops the
readout**, which is the half that explains the other five.

Add to **Done when**:

- The readout is present in every state, states the **resolved session count**,
  and is not focusable
- The selected cell changes in the frame the press lands, proved without waiting
  on a request — no pending state anywhere on the control
- Hover and selected are different channels, and a test or a screenshot shows
  them coexisting without ambiguity

---

## Amended 2026-09-13 by Task 2.13.3 — the vocabulary is a module now, and the address reader is deliberately still unbuilt

### `time-window.ts` exists, and what it gives this task

`apps/frontend/src/market/time-window.ts`, exported through `market/index.ts`:

| Export                    | What it is                                                        |
| ------------------------- | ----------------------------------------------------------------- |
| `TIME_WINDOWS`            | the five, in control order, each with `label`, `name`, `sessions` |
| `DEFAULT_WINDOW_SESSIONS` | 5 — and the default writes **no** parameter                       |
| `SESSIONS_PARAM`          | `"sessions"`, the one spelling                                    |
| `timeframeForSessions(n)` | the mapping, exhaustive over a count                              |
| `seriesWindowFor(n)`      | the count as the wire's own named window form                     |
| `windowForSessions(n)`    | the offered window, or `undefined` — **no snapping**              |
| `MAX_MINUTE_SESSIONS`     | 21, the boundary, named because it is a claim about the cap       |

So this task's Done-when item _"the timeframe mapping has one home"_ is a **grep**
rather than a build, and the label/accessible-name pair in §4(d) is read from
`TIME_WINDOWS` rather than written in the component. `windowForSessions`
returning `undefined` is the no-selection state as data — the control renders it,
and the readout states the resolved count beside it.

### What 2.13.3 deliberately did **not** build: reading the address

`time-window.ts` has **no parser**, and that is a decision rather than an omission.
This task's own bullet — _"one module that reads it, one that builds the address"_
— still stands entirely, and the reason the parser is not in the vocabulary module
is that parsing is where the open question lives: a **negative, zero or
unparseable count** is still this task's to decide, and 2.13.1's amendment already
points at the precedent (`use-security-symbol.ts` does not repair an input; the
server's answer naming what was asked beats a client reporting on something else).

Where it goes is this task's call and `paths.ts` is where the builder belongs.
Note the one thing the vocabulary module cannot answer for you: `seriesWindowFor`
takes a `number`, so whatever reads the address has to produce one or decide not
to ask.

### The cap is not in the frontend, and the mapping is why

`MAX_SERIES_BARS` stays in `apps/backend/src/series-request.ts`. The 10,000 appears
in the frontend only as a figure in `time-window.test.ts`, which asserts the
property §2.1 is actually about — **the worst 21-session window anywhere in
2024–2028 is 8,190 minute bars** — over the calendar's own sessions rather than
over 390 × n. So this task writes no cap arithmetic and no pre-emptive size check.

### The `1d` body and the walk

Unchanged and still this task's: recording a `1d` response body, and somebody
reading `chart-alternative.ts`'s two unverified `1d` sentences aloud. What has
changed is that `spokenVolume` now exists, so whatever volume clause the
alternative gains is a call rather than a decision — the decision of **whether**
volume has its own sentence is 2.13.8's.

And the performance bullet is now a fact rather than a hope: the walk is memoised,
**1Y costs 0.8 ms per render against 17.0 before**, and the first walk of a set of
dates still costs ~9.5 ms once per process. If a wide window feels slow here, read
2.13.3's figures before reaching for a `useMemo`.

---

## Amended 2026-09-13 by Task 2.13.4 — two things land here by name rather than falling between tasks

### The high–low extent band is now **this task's**, with a measurement

`CHARTING.md` §12.2 declined the band at `1m` and named Story 2.13's `1d` windows
as when it returns. 2.13.2 could not settle it on an artboard and Task 2.13.4 was
given it as a measurement — but it could not take it either, for a stated reason:
the measurement is the band's height in pixels at 3M and at 1Y **against a real
`1d` body**, no `1d` body has been recorded, and recording one is this task's
(`VOLUME-AND-WINDOW.md` §2.3).

So it is handed here explicitly, which is what that amendment asked for instead of
letting it fall between the two. **Once a `1d` window draws, read the band's
height at 3M and at 1Y and decide from the number.** `--price-unchanged-wash` is
still reserved for it and still has no application consumer.

### And a second look at the volume plot's end columns

`VOLUME-AND-WINDOW.md` §19.2: the first and last volume columns are clipped to
half their width, because `scaleSlot` puts the first bar at x = 0 and the last at
x = width. Task 2.13.4 looked at it at **thirty bars** — the density §10.3 names —
and **accepted** it, recording the argument and the one alternative (inset the
x-domain in **both** plots, which is a change to the price chart).

3M is the window that makes it worth re-asking: the column there is 12.8 px rather
than 28.9, so the half that is lost is a different proportion of a different mark.
**Look at it when 3M first draws.** If it reads badly, the repair is the inset and
it is a price-chart change that wants saying out loud rather than slipping in
beside a window control.

---

## Amended 2026-09-13 by Task 2.13.5 — the reading is finished and does not constrain the control, but `1d` now has **five** places that print a time of day

Nothing in this task's scope moves. Two carries, and the second is a real
obligation that was invisible until the strips were built.

### The control adds the story's only new tab stop, and the pair adds none

2.13.5 shipped a second readout strip, a second crosshair and a second overlay,
and **no second tab stop** — the volume plot answers a pointer and is not
focusable, because everything it can state is reachable from the price plot's one
stop. So this task's Done-when item about the sticky chrome is measuring a tab
order that has not moved since Story 2.11: whatever this control adds is the
delta, which makes attributing an occluded stop straightforward rather than a
bisection.

The reading also needs nothing from this control, and the reason is worth knowing
before designing around it: **both input paths clear the reading on the way to the
control.** A pointer travelling from the plot to a control above it leaves the
plot and fires `onPointerLeave`; a keyboard user tabbing to the control blurs the
plot. So a person cannot hold a reading while pressing a window. That is a
property of the control being **outside** the plot, not a guarantee — see 2.13.7,
which owns what happens when the window changes with a reading still live.

### **`1d` makes five call sites print a time of day that does not exist**

2.13.1's amendment already hands this task _"`chart-alternative.ts`'s two `1d`
branches execute for the first time … unverified English"_. The strips made that
larger, and it is arithmetic-shaped rather than prose-shaped, so it is named
separately.

**Every instant this product prints for a bar is spelled with a time of day**, and
at `1d` a bar _is a session_. `formatBarInstant` is unconditional —
`Sep 4 · 09:30 EDT` — and so is `formatMarketInstant`. The call sites that become
questionable the moment this task makes a `1d` window reachable:

| Where                                        | What it will print for a daily bar  |
| -------------------------------------------- | ----------------------------------- |
| `ChartReading` — the price strip's stamp     | `Sep 4 · 09:30 EDT`                 |
| `VolumeReading` — the reading's stamp        | `Sep 4 · 09:30 EDT`                 |
| `VolumeReading` — the resting peak's instant | `Sep 4 · 09:30 EDT`                 |
| `chart-reading.ts` — the spoken sentence     | the same, read aloud                |
| `chart-alternative.ts`'s `peakClause`        | `formatMarketInstant`, with seconds |

Whether that reads as wrong depends on what the vendor puts in a `1d` bar's
`startsAt`, which nobody in this repository has seen — which is exactly why
2.13.1 put the **recorded `1d` body** in this task. So: record the body, look at
what the five surfaces print, and decide. The likely answer is that a bar's
instant needs the timeframe, the way `intervalWord` and `slotWord` already do;
the wrong answer is five independent fixes, because these are two functions with
five callers and the whole point of both is that there is one spelling.

Add to **Done when**:

- With a `1d` body recorded, somebody **read what all five surfaces print for a
  daily bar** and either accepted it in writing or fixed it in the two functions
  rather than at the call sites

---

## What was built, 2026-09-13

The record is [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) **Part five**
(§§30–35) and the canvas's `Volume and window.dc.html` §§12–13. What follows is
the index and the Done-when list answered.

### The files

| Added                                       | What it is                                                 |
| ------------------------------------------- | ---------------------------------------------------------- |
| `routes/use-time-window.ts`                 | the **one** place the window is read out of the address    |
| `components/TimeWindowControl/`             | the control, its stylesheet, six stories, thirteen tests   |
| `fixtures/bar-series/daily.json`            | NVDA, 63 sessions — the first `1d` body in this repository |
| `fixtures/bar-series/daily-year.json`       | NVDA, 252 sessions — the `1Y` window                       |
| `e2e/specs/security-window-control.spec.ts` | thirteen browser tests, at three viewports                 |

| Changed                           | Why                                                                       |
| --------------------------------- | ------------------------------------------------------------------------- |
| `routes/paths.ts`                 | `securityPath(symbol, sessions?)` — the **one** place a window is written |
| `routes/SecurityExplorer.tsx`     | reads the window, derives the timeframe, renders the control              |
| `components/Region/Region.tsx`    | a `control` slot on the heading row, outside the error boundary           |
| `market/chart-time-axis.ts`       | §30.1 — a daily bar is placed by the session it belongs to                |
| `market/chart-reading.ts`         | §30.2 — a bar's instant takes the timeframe                               |
| four components + the alternative | the six surfaces that printed an hour nothing traded in                   |
| `CHARTING.md`, `CLAUDE.md`        | dated amendments where this task falsified a live claim                   |

### Done when — answered

- ✅ A named window set above both charts, current one encoded by **three**
  channels and none of them hue (a bar, a weight, a step of ink)
- ✅ Choosing one re-reads and redraws both plots **from one request** (asserted
  in the browser by counting requests for the new window)
- ✅ In the address; the default writes no parameter; reload and cold deep link
  both land on it; **Back undoes a change**
- ✅ Read in one place (`use-time-window.ts`), built in one (`paths.ts`);
  `grep -rn "sessions" apps/frontend/src --include=*.tsx` finds no second reader
- ✅ **No new cancellation or superseding code** — §34
- ✅ The timeframe mapping has one home and a `1d` window is reachable and
  draws — which took a repair nobody predicted, §30.1
- ✅ Keyboard-operable, announced by the radio itself, and no tab stop behind the
  sticky chrome at 1440 **or** 1024
- ✅ Stories per state; `pnpm stories` passes
- ✅ `pnpm verify` and `pnpm e2e` pass
- ✅ An address naming a count outside the five renders with **no selection**,
  and a browser test proves the address was not rewritten — break-verified
- ✅ A `1d` body is recorded (two), a story renders it, and the two `1d`
  sentences were read
- ✅ The readout is present in every state, states the resolved count, is not
  focusable — and gained a **second form**, §33
- ✅ The selection changes in the frame the press lands: the control holds **no
  state at all**, so there is nothing to wait for
- ✅ Hover and selected are different channels — the `AllPermutations` story
  shows all seven states, and the same row again under `grayscale(1)`
- ✅ All six surfaces that print a daily bar's instant were read and **fixed in
  the one function they already called**, not at the call sites

### Two things handed on that were not in this task's list

- **2.13.9** inherits a cost nothing has measured: the `1d` placement branch
  calls `marketDateAt` once per bar, which is 504 calls per frame build at 1Y
  across the two plots. Bounded, off the pointer path, unmeasured.
- **2.13.7** still owns the superseded-answer property this task's own Notes
  section predicted. It was not closed by accident and it is not closed.

---

## For the stakeholder — what this actually changed, in plain terms

**Before this task, MarketPulse could show you one security's recent price and
volume, and only ever the same five days of it.** The charts were real and the
numbers were real, but the period was fixed. There was no way to ask "what did
this look like over the last three months?" — not by clicking, not by typing an
address, not at all.

**Now there is a control above the chart with five choices on it: 1D, 5D, 1M, 3M,
1Y.** Press one and both charts — price and volume — redraw together over that
period. This is the first control in the product that changes _what the data
says_ rather than how it is drawn, which is why it was worth building carefully.

Five decisions in it are worth explaining, because each one was a choice between
something easy and something honest.

**1. The period goes in the web address.** Pick three months and the address
becomes `…/securities/NVDA?sessions=63`. That is not a technicality: it means the
link you send a colleague opens on the chart _you_ were looking at, a page reload
keeps your place, and the browser's Back button undoes a choice. A product where
the view lives only in the page's memory loses all three, and there is no way to
add them back later without rebuilding how the screen works.

**2. The labels tell a small lie, so there is a readout that tells the truth.**
"1M" is what every analyst tool calls it, so that is what the button says — but a
month is not a month on a stock market. It is twenty-one _trading_ sessions, with
the weekends and the holidays taken out. So beside the buttons there is a small
label that always states the real number: `21 SESSIONS`. The button says the
approximation; the readout says the fact. The alternative — buttons labelled "21
sessions", "63 sessions", "252 sessions" — is a paragraph rather than a control.

**3. If the address asks for something we do not offer, we answer it and show
nothing selected.** Type `?sessions=7` and you get seven sessions, with none of
the five buttons lit and the readout saying `7 SESSIONS`. We deliberately do
**not** quietly round it to the nearest button we do have, because that would
rewrite what you asked for and then answer a different question without telling
you. This matters more than it sounds: two epics from now the AI agent will ask
for periods of its own choosing, and it will routinely ask for one that is not on
the list. That already works, today, because of this decision.

**4. Pressing a key does not fire off a chain of requests.** On a keyboard, the
arrow keys move between the five buttons and the space bar chooses one. The
conventional behaviour for this kind of control is that arrowing _immediately_
selects — which would mean walking from "1D" to "1Y" fetched four different
periods of market data and pushed four entries into your browser history, for one
intention. So the arrows move; the press decides.

**5. We now show three months and a year of data, and doing that found two real
faults nobody could have found by reading the code.** Those longer periods use
_daily_ bars rather than minute-by-minute ones, and until this task nothing in the
product had ever asked for a daily bar. When we finally did:

- **The three-month chart drew nothing.** A correct frame, correct dates along
  the bottom, the correct headline price above it — and no line. The cause is
  that our data provider timestamps a whole trading day at midnight, and the
  chart places every point by where it falls inside a trading session. Midnight
  is not inside one. Every point was silently discarded. Nothing failed, no test
  went red, and a person looking at the screen would have read it as "this
  company did not trade for three months".
- **Six places on the screen printed a time of day that does not exist.** A
  daily bar was labelled `Jun 12 · 00:00 EDT` — a whole session's trading wearing
  the timestamp of an hour when the market is shut.

Both are fixed, each in a single place rather than six, and both are now covered
by tests that were verified to fail when the fix is removed. **This is the value
of shipping a feature end to end rather than in layers**: the code for daily
charts had been written, reviewed and typechecked weeks ago, and it did not work.
Only a person pressing a button found out.

**One thing we decided _not_ to add, and why.** On a daily chart, each bar has a
high and a low as well as a closing price — a real range, roughly 2.7% of the
price on a typical day. An earlier note in the design record said we should start
drawing that range as a shaded band once daily charts existed. We drew it, four
different ways, against real NVIDIA data — and declined it. Not because it is too
small to see (it is about 31 pixels tall, clearly visible) but because the chart
already uses that space to show whether the period is up or down, and the two
markings fight. The high and the low are still there: they appear, exactly, the
moment you point at any bar. A picture that shows less and a readout that states
more is the better trade, and the four drawings are kept on the design canvas so
the next person to suggest it can see what it looked like.

### Where this leaves the product

**The epic's goal is now met in substance**: a person can search for NVDA, open
it, and inspect its historical price and volume over a period of their choosing.
That is the whole of what Epic 2 set out to deliver.

What is left in this story is the **unhappy paths** — what the screen does while
the new period is loading, and what it does when loading it fails with the
previous period still on screen. Those matter, and they are the next task. After
that, the epic closes and Epic 3 brings the live market feed: the moment the
numbers on this screen start moving on their own.
