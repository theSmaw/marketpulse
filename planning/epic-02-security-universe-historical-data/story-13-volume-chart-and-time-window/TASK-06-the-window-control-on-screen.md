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
