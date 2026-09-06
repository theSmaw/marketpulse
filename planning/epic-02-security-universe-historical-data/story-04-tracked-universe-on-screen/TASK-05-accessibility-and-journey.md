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
