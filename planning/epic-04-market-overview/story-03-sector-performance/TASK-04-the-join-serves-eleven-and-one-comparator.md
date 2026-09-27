# Task 4.3.4 — The join serves eleven sectors, and the ranking has one home

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** nothing — runs beside the drawing

## Objective

**Eleven more callers of a seam that already works, plus the two things that
make a ranking honest: one comparator, and a basis that exists outside a
session.**

## What the user can see when this lands

**Nothing.** The frame carries eleven sector figures and nothing renders them.
Task 4.3.5 is the payoff.

## Work

- **`sectorEtfTickers()`** beside `indexProxyTickers()` in `universe.ts` —
  `kind === "sector_etf"` through `trackedSecurities`, ordered from `SECTORS`. A
  second literal list of eleven tickers is the defect the existing docblock
  argues against at length.
- **`overview.sectors`, a NEW key** carrying the same `observed | stored |
unknown` union, **in rank order**. Never appended to `figures` and never
  renaming it — both reasons are recorded in `STORY.md` and both are silent
  failures.
- **Extend the join so a `stored` figure carries the last completed session's
  close-to-close move**, labelled as such — the owner's Gate 1 decision, and the
  only way AC 1 can pass. `WireStoredFigure` gains the move and its basis; the
  arithmetic stays `changeFromClose` in `packages/shared`, called once.
- **One comparator, in `packages/shared`.** 4.5 ranks server-side because a
  top-N in a browser means shipping the 518-figure input; so a browser-only
  comparator cannot be the rule, and adopting one at eleven sets exactly the
  precedent the story is told not to set. ADR 0038 decision 2 is the precedent
  for what happens when a shared computation starts in one package.
- **The comparator's real content**, which is why it must not be duplicated: a
  figure with **no change has no ranking key at all**, and `?? 0` would put a
  sector we have not heard from among the genuinely flat ones — ADR 0029's false
  impression, as a **rank position**, which is a new shape of it. Handle the
  absent key by an explicit rule, and **never with a default**.
- **Ties break on the declared `SECTORS` order** — already the product's order
  for this set — and **two figures equal at display precision do not swap**,
  which is a stable sort against the order on screen rather than against a
  declared one.
- **The inverse map, derived.** `SECTOR_ETFS` is `Record<Sector, Ticker>`; the
  frame carries `symbol`. Derive ticker → sector **once**, from that record. A
  hand-written inverse is where a **permutation** comes from.

## Constraints handed to this task

- **`one-producer-of-the-overview-aggregate` permits exactly one call site.**
  One call with `[...indexProxyTickers(), ...sectorEtfTickers()]`, then split the
  returned entries **by membership rather than by a slice** — a fifth index proxy
  would silently shift a boundary. The invariant stays at one and its `claim` is
  unchanged; if two calls prove unavoidable that is a deliberate change plus a
  re-run of `pnpm break a-second-overview-aggregate`, whose substitution is the
  weak 1→2 signal and would pass silently under a widened bound.
- **`one-home-for-the-live-change`'s third clause is _any division whose
  denominator is a close_, and the wiring-site exemption does not cover a
  comparator.** A ranking that recomputes a percentage goes red, deservedly. Rank
  on the figure that arrived.
- **ADR 0031: every nested object needs its own field map**, and a non-finite
  number is the **serialiser's** problem — optional omitted, required drops the
  whole figure. A bare array of an already-mapped union adds no new obligation;
  wrapping it in an object does, so do not wrap it.
- **The section is optional on the READ side too.** The deploy rolls the backend
  first, but a rollback pins a previous image, so a new bundle can legitimately
  meet an old gateway.
- **`toWire` walks the map's keys**, so a key present in the map is emitted
  whatever it holds — which is what makes a leak unrepresentable and also what
  makes an omitted field unrepresentable. Build the section outside the map and
  spread it in two branches, as `encodeFigure` already does.
- **Extract the figure-array encoder.** `overviewFields.figures` holds the
  non-finite drop rule inline; copying that closure for `sectors` gives one rule
  two homes and the second is the one that gets forgotten.
- **Nothing changes upstream, and nothing changes in the closes cache.**
  `STREAM_SYMBOLS` already covers all 518 and the cache already reads the whole
  store, so the eleven sector ETFs are **already observed and already held**. No
  new subscription, no provider request, no quota.

## Done when

1. `overview.sectors` carries eleven figures in rank order, and `figures` still
   carries exactly the four proxies — asserted, because the existing browser spec
   asserts that set and must stay green
2. A stored figure carries the last completed session's move with its basis, and
   a session with no prior close produces an **absence** rather than a zero
3. One comparator, in `packages/shared`, with the absent-key rule explicit and
   tested for every mixed-state combination including all-eleven-`unknown`
4. The ticker → sector map is derived from `SECTOR_ETFS`, and a second literal
   pairing fails a check
5. `one-producer-of-the-overview-aggregate` still reports one call site, and its
   break has been re-run
