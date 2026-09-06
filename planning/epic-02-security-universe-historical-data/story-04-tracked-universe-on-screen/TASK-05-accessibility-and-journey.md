# Task 2.4.5 — Keyboard, screen reader, and the browser journey

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.4

## Objective

Make the first data-bearing page in this product usable without a mouse and legible to a
screen reader, and put a browser journey behind it so it stays that way.

## What the user can see when this lands

**Nothing changes visually for a mouse user, and the page becomes usable for everyone else.**
Concretely: the table can be reached and scrolled by keyboard, the summary is announced
before the rows rather than after, and the three states are announced when they change
rather than silently replacing each other.

That last one is the part a sighted reviewer will not notice and a screen-reader user
cannot miss: a region that swaps "Loading" for 101 rows without announcing it is a page that
appears to do nothing.

## Work

- **Run the axe gate and expect it to find something.** The bar is Story 1.13's — zero
  violations, asserted in a real browser, with `incomplete` attached as an annotation that
  cannot fail anything. The gate has form on this exact class of page: it found
  `scrollable-region-focusable` on its very first run in CI, a **real WCAG 2.1.1 defect that
  had stood for five stories**, because a `Region` takes its own overflow and a scrolling
  container that cannot be reached by keyboard is unreachable content. A table of 101 rows
  inside a region is precisely that shape again
- **Check it at more than one viewport.** That defect reproduced only at a viewport 160px
  shorter than the development machine's, which is why it went unseen locally and appeared
  on the runner. 720, 560 and 480px is the set Story 1.13 used
- **Decide how a state change is announced**, and prefer the smallest correct thing. A live
  region is the obvious answer and it is easy to make worse than nothing — one that
  announces every render, or that reads the whole table, is noise a user cannot turn off
- **Write the browser journey into `e2e/specs/`**, and read `e2e/README.md` before writing
  it, because it holds the must-not-assert list. Two entries apply directly here: do not
  assert on colour, and do not use `innerText()`, which reports the CSS-transformed string
  where the DOM and every Playwright matcher see the real one
- **Assert on roles and accessible names rather than on classes or structure**, which is
  what makes the journey survive Task 2.4.4's presentation decisions being revisited
- **Do not intercept the route to fake the data.** Story 1.13 measured that `route.fulfill()`
  bypasses the browser's CORS check entirely, so a journey built on interception cannot see
  the one failure the deployed check exists for. The failure states are worth producing by
  intercepting; the healthy path must drive the real pair
- **Note what a green journey does not certify**, in the shape ADR 0013 uses — it does not
  certify that the data is correct, only that the page rendered what the API returned

## Done when

- Zero axe violations at three viewports, with the reading recorded
- The table is reachable and operable by keyboard, produced rather than assumed
- A state change is announced, and the announcement was listened to rather than inspected
- A browser journey covers the healthy path against the real pair and the failed path by
  interception, and each was seen to fail for its own reason
- `pnpm e2e` passes and the new journey's cost in wall time is recorded

## Notes

This is the first table in the product and the first page whose content arrives
asynchronously. Both patterns repeat — Stories 2.11, 2.12, 2.13 and every epic after — so
what is decided here about announcing a state change is decided for all of them.

---

## Amended 2026-09-06, after Task 2.4.3

Three things this file did not know. None changes its scope or position, and the first is a
half-decision this task has to **re-take rather than make**, which is worse than an open
question because it looks finished.

### An `aria-live` already ships, and it is probably the wrong one

This file says to "decide how a state change is announced, and prefer the smallest correct
thing", noting that a live region is easy to make worse than nothing. Task 2.4.3 shipped
`aria-live="polite"` on the **loading** paragraph, which is the reflex answer and is very
likely wrong in the specific way this file warns about: it announces _"Loading the tracked
universe"_ and then says nothing at all when 101 rows replace it, because the announcing
element is the thing that gets removed. So a screen-reader user is told the page has started
and never told it finished — which is the exact failure this file describes as "a page that
appears to do nothing", arriving through the mechanism that was supposed to prevent it.

**Treat it as a defect to reproduce, not as an implementation to keep.** It was written to
put _something_ honest in the markup rather than to settle the question, and the plausible
answers all move it: a live region wrapping the **content slot** so the announcement is
whatever replaces the loading line; a `role="status"` on the settled state; or nothing at
all, on the argument that a page whose main content changes is announced by the browser
already. Listen to each rather than inspecting it, which is what this file already asks.

### The table's markup is built and is the thing to verify

Task 2.4.3 shipped `<th scope="col">` column headings over `<th scope="row">` symbols, so a
screen reader announces the symbol with each cell — "NVDA, Sector, Technology" rather than a
bare "Technology". That is the arrangement this task should confirm rather than build, and
the two things worth checking are that it survives Task 2.4.4's restyling (the symbol cell
has its heading weight explicitly undone, which is a class a redesign could drop) and that
101 rows of it is not exhausting to move through.

**The axe gate has not been run against this page at all** — not locally, not in CI, at no
viewport. Every reading this repository holds is for the four Epic 1 routes, so there is no
baseline for `/securities` and nothing has yet had the chance to fail. That is the position
this file already assumes, and it is confirmed rather than changed.

### The failed path has two sentences, and a journey asserting one will pass while the other rots

Task 2.4.3 shipped **two** failure renderings — `unreachable` and `answered-badly` — plus a
`Reference: <uuid>` line on the second. A browser journey that produces one failure and
asserts on "the failed state" covers half of it, and the half it misses is the one carrying a
UUID into the accessibility tree.

Two consequences for the specs. The uncovered failure is cheap to add and should be, because
these are the states a real user is most likely to meet. And the reference line is a string
nothing should ever assert the **value** of — it is a fresh UUID per request — so assert the
label and the shape, which is also the rule that keeps the assertion honest if Task 2.4.4
changes how it is set.

---

## Amended 2026-09-06, after Task 2.4.4

Five things, and the first two change what this task is walking into rather than only its
detail. Nothing moved to or from another task and this task's position is unchanged.

### The table has a THIRD kind of header now, and it is what makes axe inconclusive

The amendment above describes a table of `<th scope="col">` headings over `<th scope="row">`
symbols. Task 2.4.4 grouped the table by sector, so there is now a **`<th scope="rowgroup"
colSpan={4}>` band per sector** — twelve of them, eleven sectors plus `Market proxies` — each
carrying the sector's name, its benchmark ETF and a count, with one `<tbody>` per group.

**That is exactly what makes the page axe-inconclusive, and it was measured rather than
guessed.** The local reading is **0 violations / 31 passes / 1 incomplete**, the incomplete
being `th-has-data-cells` on the table itself; removing the twelve band rows from the live
DOM and re-running that one rule gives **0 incomplete / 1 pass**, and putting them back
restores it. So this task inherits an attributable inconclusive rather than a mystery, on
the same footing as the `color-contrast` inconclusive the landing route has carried since
Story 1.5 — and `e2e/support/axe.ts` already attaches incompletes as annotations that cannot
fail a gate, so it does not block the gate this task installs.

**What is genuinely open is the thing the number cannot answer**: whether a screen reader
announces the band usefully, and whether 101 rows across twelve groups is navigable rather
than merely correct. That is this task's question and it is a better one than the incomplete.
Note `scope` is `rowgroup` and not `colgroup` deliberately — the band labels the rows beneath
it inside its own `<tbody>` — which puts its ARIA role at `rowheader`, not `columnheader`.

### The axe gate HAS now been run against this page, once, at one viewport

The amendment above says "**The axe gate has not been run against this page at all** — not
locally, not in CI, at no viewport." **That is no longer true and the correction matters**,
because it is the difference between establishing a baseline and comparing against one.

Task 2.4.4 ran axe-core 4.13.0 against the loaded page in a real browser and got the reading
above, with `color-contrast` passing on **21 nodes** — which is Task 1.13.6's blind-renderer
check satisfied here too, so the reading is not a renderer that skipped style computation.

What is still untrue and unchanged: it has **not** run at 720, 560 or 480px, it has **not**
run in CI, and it has **not** run against the three non-loaded states, any one of which could
carry something the loaded page does not. The multi-viewport instruction above is therefore
the live part of that bullet and should be read as the whole of it.

### `Region`'s `overflow: auto` does NOT scroll on this page, which changes the defect this task was told to expect

This file predicts `scrollable-region-focusable` because "a `Region` takes its own overflow
and a scrolling container that cannot be reached by keyboard is unreachable content", and
calls a table of 101 rows inside a region "precisely that shape again".

**Measured, it is not.** This page's region is never height-constrained — it grows to its
content and the **document** scrolls — so `region.scrollHeight === region.clientHeight` and
the region never scrolls at all. Task 2.4.4 found this the expensive way, by shipping sticky
column headings that turned out to be inert: an ancestor with a scrolling overflow becomes
the scrollport a sticky descendant is measured against, and this one has the property
without ever exercising it.

Two consequences for this task, and they point in opposite directions. The predicted defect
is unlikely to fire here for the predicted reason — but that is a claim to **verify at 480px**
rather than accept, because whether the region scrolls is a function of the viewport and that
is exactly how the original defect hid for five stories. And there is a new small question in
its place: every `Region` carries `tabIndex={0}`, so a keyboard user tabs into a box that has
nothing focusable in it and does not scroll, which is a stop on the tab order that buys
nothing on this page. Task 1.13.4 made it unconditional deliberately; whether that is right
here is worth listening to rather than reasoning about.

### Both failure sentences were rewritten, so a spec written against 2.4.3's strings is stale

The amendment above quotes 2.4.3's wording. Task 2.4.4 replaced both with a marker-plus-word
treatment borrowed from `BackendIndicator`, which is what makes the two read as the same
_kind_ of thing:

| `failure`        | Word                  | Marker        | Sentence a spec can anchor on             |
| ---------------- | --------------------- | ------------- | ----------------------------------------- |
| `unreachable`    | `no response`         | hollow circle | _The tracked universe is not available._  |
| `answered-badly` | `unexpected response` | amber square  | _The tracked universe could not be read._ |

The reference line is now `Reference <uuid>` — **no colon** — set in `--font-mono`. This
file's existing instruction stands unchanged and is now more useful: assert the label and the
shape, never the value, which is also what keeps the assertion honest across a rewording like
this one. The markers are `aria-hidden`, so the accessible name of each state is the word plus
the two sentences and nothing else.

Two more renderings exist that no spec has ever seen: the **empty** state, which now names
`pnpm universe` in a `<code>`, and the **loading** state, which is a sentence plus seven
`aria-hidden` skeleton bars.

### The `aria-live` defect still ships, and the skeleton makes it slightly worse

The amendment above is correct and unchanged: `aria-live="polite"` is still on the loading
paragraph, so a screen-reader user is told the page has started and never told it finished.
Task 2.4.4 deliberately did not touch it, because this task owns the decision and a second
half-answer would have been worse than the one already recorded.

One thing did change around it. The loading state now also renders seven **`aria-hidden`**
skeleton bars, so the accessible content of that state is exactly one sentence — which is the
right shape and is worth keeping through whatever this task decides. And the settled state now
has a **summary line** (`101 securities tracked · 11 sectors · 15 ETFs`) that arrives with the
table, which is a strictly better thing to announce than "the table loaded" if the answer
turns out to be a live region around the content slot.

**And there is a second accessibility preference to verify now**, which did not exist when
this file was written: `prefers-reduced-motion`. Task 2.4.4 answered it once at the token
layer by setting both motion durations to `0ms`, and proved the mechanism by forcing the
tokens and watching both consumers collapse to `0s`. What it did **not** do is exercise the
real preference — through the operating system or a browser emulation — which is a browser
task and therefore this one's.
