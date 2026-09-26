# Story 4.3 — Sector Performance, & the Benchmark That Is Not a Membership

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.2
**Epic scope covered:** sector performance

## Description

**Eleven sector SPDRs, ranked by today's move — and the caveat that makes this
screen honest rather than merely correct.**

`UNIVERSE.md` §5, quoted in this epic's own `EPIC.md`: **the sector SPDRs hold
S&P 500 constituents only.** A tracked equity outside the index has a sector,
has a benchmark, and **is not a constituent of that benchmark**. That is fine
for a relative-move comparison and wrong for anything treating the ETF as the
sector's complete membership — _"which a sector-performance panel is exactly
the shape to assume."_

**So this story has to decide what a sector row IS**, and the two candidates
are different products:

| The row is…                                          | Means                                                    | Honest label                         |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| **the ETF's own move**                               | one security, complete, exact                            | _XLK, the sector's benchmark ETF_    |
| **an aggregate of our tracked names in that sector** | our universe, incomplete, subject to the IEX denominator | _the N names we track in Technology_ |

**They will disagree**, routinely and legitimately, and a screen showing one
while implying the other is precisely the class of defect this epic's `EPIC.md`
was written to prevent.

> **And a sector reclassification has no symptom at all** (`UNIVERSE.md` §12).
> A name moving Technology → Communication Services fails nothing and is
> counted in the wrong row indefinitely, correctly-looking. The mitigation is
> `classification_retrieved_at`, which Story 2.14 already puts on screen for a
> security — **this story decides whether an aggregate owes the same date**,
> and answers it in writing either way.

## What the user can see when this story lands

**Eleven sectors, ordered by how they are doing today**, each with its move,
its direction carried by more than hue, and — if the aggregate option is chosen
— **how many names that figure is computed over**, because a figure over 24 of
30 names is a different claim from one over 30.

**The strongest and weakest sectors are readable at a glance**, which is half
of §1's _what is happening_ and the first thing on this screen that tells a
reader something they could not have got from the security page.

**What they still cannot do:** breadth (4.4), the movers (4.5), or click a
sector through to anything (4.6).

## Why it sits here in the sequence

**Before breadth, because it is the smaller version of the same problem.**
Eleven rows, each an aggregate with a denominator, is where the denominator
decision gets tested against something a person can sanity-check by eye —
whereas a single breadth percentage over 518 names cannot be checked by anybody.

## Acceptance criteria

1. Eleven sectors render, ranked, at four widths, live during a session and
   from the store outside one
2. The **row's meaning is stated on screen**, and the alternative it is not is
   impossible to mistake for it
3. If the aggregate option is chosen, **the count the figure covers is
   visible**, and a sector with no fresh observations says so rather than
   reading as flat
4. The classification-date decision is recorded with its reversal trigger as a
   condition
5. Ranking is stable under live data in the way Story 4.5 decides — this story
   does not invent a second rule
6. Per-row work is sized against the universe from the first line (Epic 14's
   trigger, and this screen is the page it names)

## Design work

**A ranked list of eleven rows with a signed figure is a new component**, and
the canvas has nothing like it: `Universe navigation.dc.html` is a table that
never re-orders, which is the opposite promise.

Draw it with the movers in mind (4.5) — **one ranked-list component with two
uses is a design decision; two components that look similar is an accident.**

## Out of scope

Per-sector drill-down (Epic 6's topology and the Security Explorer), breadth
inside a sector (4.4 decides whether that exists at all), and anomaly scores
(Epic 5).

## Amended by Task 4.1.1 — 2026-09-25: two decisions this story inherits rather than takes

- **The aggregate arrives in a frame**, computed once in the backend (Story
  4.2's seam). This story consumes it rather than computing eleven sector
  figures in a browser.
- **Ranking re-orders and marks what moved** (Story 4.5's treatment). This
  story does not invent a second rule for its eleven rows — one ranked-list
  component, one behaviour.

## Handed to this story by Task 4.1.8 — 2026-09-25: where an aggregate is computed

**The hand-off enumeration found this story's file did not carry it.** The
decision was taken in Task 4.1.1 and this story is one of the four that acts on
it.

**An aggregate is computed on the BACKEND and arrives as a new frame on the
existing market-stream socket.** Not a second fetch, not a poll, and not a
computation in the browser over 518 securities.

**Three things follow, and they are what this story has to build against:**

- **There is no request to make.** The socket the chrome already holds is the
  transport; this story's surface subscribes and renders what arrives. A
  `useEffect` that fetches is the wrong shape and will look right in every test
  below `pnpm e2e`.
- **The frame is Story 4.2's to define and document**, including whether it
  owes an ADR of its own. This story reads it.
- **A browser that recomputes an aggregate over 518 rows on every tick is a
  main-thread task** on the page `PRODUCT_SPEC.md` §28 is least able to afford
  one. That is the measured reason the decision went the way it did, not a
  preference.

## Handed here by Story 4.2's close — 2026-09-26: the seam exists, and two decisions are yours

**The join is built and you are its second consumer.**
`apps/backend/src/market-overview.ts`'s `buildMarketOverview` takes a **symbol
list**, the current-state map, a `closesAsOf(session)` lookup and an `asOf`
instant, and returns a three-member union per symbol — `observed` (with the
change already computed), `stored`, `unknown`. It is **pure**: no clock, no
socket, no repository handle, which is what makes invariant 4 structural rather
than remembered. **Do not give it a handle.**

**Decision 1: do sectors share the `overview` frame, or get their own type?**
One screen at one cadence should carry one `computedAt`, which argues for one
frame with optional sections — but four regions widening one payload is a bag.
Either way it is a wire decision and **ADR 0038**
governs it.

**Decision 2: `one-producer-of-the-overview-aggregate` permits at most ONE call
site.** Wiring a second aggregate means either routing through the existing
builder or changing that invariant **and re-running its break**.

**And the defect its sibling guard was written against is the one you are most
likely to commit.** `one-home-for-the-live-change` exists because an author
reaching for `readLastCloses` holds `LastClose` — same shape as the wire's
`SecurityLastClose`, **no `session`**, different name — and therefore cannot
call `changeFromClose` without converting first. A hand-written
`sector-performance.ts` doing `((observed.bar.close - close.close) / close.close) * 100`
was written out and **passed green** until the guard was keyed on the _readers_
of the closes and on **the division itself**. Convert, then call
`changeFromClose` from `packages/shared`. A second implementation fails the
build.
