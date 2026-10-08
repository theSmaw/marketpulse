# Task 4.6.4 — A ranked row opens its security

**Status:** Not started
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.3

## Objective

**Twenty-odd more destinations, and the keyboard model for a list that moves.**

## What the user can see when this lands

**Every sector row and every mover row opens its security**, by pointer and by
keyboard. The sector row's ticker opens its **benchmark ETF** — the owner's
Gate 1 decision.

## Work

### The sector region has TWO lists too, and nobody had said so

`RankedList` renders the ranked `<ol>` **and**, when
`quietGroup === "possible"`, a trailing `<ul aria-labelledby={quietHeadingId}>`
under `Not ranked`. **Sectors passes `"possible"`; movers passes
`"impossible"`.** A quiet sector row is still a security with stored bars —
`UNIVERSE.md` §12.2's rule arriving at navigation — so **the quiet rows are
destinations and the sector region is two roving groups exactly as Movers is.**

**So the two-lists-in-one-region mechanism is not a Movers special case; it is
the mechanism at both regions, and one implementation serves both.** The
difference is that the sector region's second group **appears and disappears
with the data**, which is 4.6.5's.

### The shared contract

- The focusable element is the row's **ticker link**, not the `<li>` and not
  the row — `UniverseTable`'s precedent, and the ring geometry (4.6.2 §03).
- **A roving group's members are the real rows only**: `row.held !== true`. A
  pad is `visibility: hidden` + `aria-hidden`, so it is inert for free in CSS,
  **but it must never hold `tabIndex=0`, never be reachable by an arrow and
  never be `End`'s target.**
- **Roving state is `symbol | undefined`, never an index**, derived at render.
  A held index is a second, disagreeing copy of where focus actually is.
- **Arrows move ±1 and clamp; they do not wrap.** This departs from
  `TimeWindowControl` deliberately: that control wraps because _"the set is a
  ring"_, and **a ranking is not a ring** — `#11 → ArrowDown → #1` reads as a
  jump in a structure whose entire meaning is ordinal.
- **Arrows do not cross between the two lists.** Crossing takes a listener from
  `item 5 of 5` to `item 1 of 5` under one key with no spoken boundary.
  `Home`/`End` scope to the list focus is in.
- `Enter` activates — the anchor's own default. **`Space` must not**: an
  `<a href>` does not activate on Space, and a reader inside a `Panel` with
  `overflow: auto` is relying on Space to scroll.
- **`preventDefault()` only after one of the five keys matched.** The arrows
  scroll a page and `Home` jumps it, and these rows are inside a scrollport.
- **Every other key, `Tab` included, is the browser's.** A handler swallowing
  `Tab` traps the group.

### The activation race is unrepresentable, not managed

With `<Link to={securityPath(symbol)}>` the destination is resolved **at
render, from the row's own identity**. There is no handler, no index, no lookup
at activation time, **so no frame can land between the keydown and the
resolution.** The 4.3 hand-off's clause 3 — _every number on screen is right
throughout_ — is a defect this task **cannot express**, as long as it stays a
link.

**Everything that reintroduces it is a handler**, so the guard is a clause the
re-implementer cannot avoid writing: **no `useNavigate`, no `navigate(`, no
`location.assign`, no `location.href`** under `RankedList/`, `Movers/`,
`SectorPerformance/` and `MarketProxyStrip/`. With a break written as **the
file the next story would write** — a `<button onClick={() => navigate(…)}>` —
not as an edit to the file the check was drafted against.

### The treatment

Ground on `.row:hover, .row:focus-within` (`--surface-sunken`, **1.10:1** — a
**locator**, never the only encoding); underline on the **symbol span only**,
never the link box, because the box contains the 8 px mark slot and an
underline would run under the arrival disc. `text-decoration` is painted, never
laid out, **so nothing moves** — which is why it is an underline and not a
border, an inset or a weight change. **No `:active` treatment** — a 26 px row
dropping 1 px on press is a layout shift on a screen built around not having
one. **`:visited` explicitly unstyled** — a security you have opened is not a
different fact about the market.

### Boundaries

Not the empty and degraded states (4.6.5). Not ADR 0039 or the tab-stop spine
(4.6.6). Do not pin membership under the hold — that fires Story 4.5.7's
recorded trigger and is 4.6.5's to decide if it decides it at all.

## Done when

1. Both ranked regions carry ticker links; the sector quiet group's rows are
   destinations too
2. Two roving groups per region, keyed on **symbol**, with no crossing, scoped
   `Home`/`End`, no wrap, and `Space` left to the browser — asserted in a
   browser with a **driven re-order**, not reasoned about
3. A pad holds no stop and is unreachable by arrow, asserted on a padded list
4. The no-imperative-navigation invariant exists with its break and its
   passing-wrongly transcript
5. `pnpm verify` and `pnpm e2e` green
