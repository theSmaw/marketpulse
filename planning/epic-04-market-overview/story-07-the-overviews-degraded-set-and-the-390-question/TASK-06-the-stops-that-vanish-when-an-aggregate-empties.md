# Task 4.7.6 — The stops that vanish when an aggregate empties

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.3

## Objective

**ADR 0039's own rejected shape, applied to rows rather than regions** — and
nobody considered it there.

## What the user can see when this lands

**Nothing, unless they are using a keyboard when a feed stops**, in which case
their focus stops being thrown to the top of the document.

## Work

### The decision this reopens, in ADR 0039's own words

> It was never _does this region scroll_. It is **can a tab stop appear and
> disappear under a reader**, and the answer must be no.

The **seven region stops** satisfy that. **The twenty ranked ticker stops do
not**: when the eligibility window empties, the rows unmount and a held pad is
handed **no link at all** (Task 4.6.4's deliberate departure), so a keyboard
reader focused on a mover row is dropped to `<body>` **on a timer nobody
controls** — the exact wording ADR 0039 used to reject the alternative it
rejected.

Task 4.6.5 built a recovery for the case where **one row** leaves the list:
focus moves to the row now at that rank, or to the region's section if no real
rows remain. **Check whether that recovery covers this case**, where the whole
list empties at once — and note `RankedList` draws **no `<ol>` at all** when
nothing is ranked, so the list element is already detached and the `<section>`
has to have been captured at **focus** time rather than at recovery time.

### And a degradation can re-order a list under an arrow press

Story 4.6 handed over the `focusin`/`focusout` bubbling defect: **every arrow
press inside a ranked region releases the order pin and retakes it against the
last frame drawn.** In the steady state that frame is the one on screen; **in a
degraded state it is the emptied one.** So the hold, which exists precisely to
stop a list moving under a reader, cannot protect against the one transition
that moves it most.

It was left unrepaired deliberately — **but its consequence in a degraded state
was not part of that decision.** Measure it, then recommend; do not repair the
hold here without saying so.

### Produced rather than reasoned

Task 4.7.1's harness can serve a poorer aggregate on reconnect, which is
exactly this transition. **Drive it with focus on a row** and read where focus
went — not what the DOM contains.

## Done when

1. A keyboard reader focused on a ranked row when its aggregate empties keeps
   a focus position that is not `<body>` — produced in a browser
2. Whether Task 4.6.5's recovery covers a whole-list empty is answered by
   driving it, and the answer recorded either way
3. The arrow-press-re-orders-under-a-degradation consequence is measured, with
   a recommendation rather than an unannounced repair
4. `pnpm verify` and the overview keyboard specs green

---

## Handed here by Task 4.7.1 — 2026-10-10: the transition you need is one option, and it is driven once already

**`serveFeed(page, { overview: RICH, overviewOnReconnect: POOR })` then
`feed.drop()`** is the whole drive — the page's own retry is answered with the
emptier aggregate and the rows unmount under whatever has focus. Produced and
green in `e2e/specs/overview-held-outage.spec.ts`' third test, with four
`unknown` figures standing in for an empty eligibility window; swap in a
movers section with two empty lists for your own case.

**Two things to carry across.** The behaviours key on **`drop()`** rather than
on a connection count, because a cold page opens more than one socket before
anything is dropped (`StrictMode`'s open/close pair) — so a count served the
poorer aggregate on the first paint and drew a plausible wrong screen. And
`feed.overviews()` is the channel that says the emptier frame was actually
sent: focus landing on `<body>` because the frame arrived and focus landing on
`<body>` for some other reason are the same reading without it.
