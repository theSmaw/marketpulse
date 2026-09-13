# Task 2.13.6 — The window control, in the address and on screen

**Status:** Not started
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
