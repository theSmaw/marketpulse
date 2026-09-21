# Task 3.5.3 — The snapshot that removes the largest visual event on the page

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.1, 3.5.2

## Objective

Replace `snapshot: () => new Map()` in `index.ts` with the real current state —
and in doing so **delete the biggest undesigned visual event in the product.**

## What the user can see when this lands

**The first visible change of this story, and it is a subtraction.**

Today, every page load renders `LAST SESSION CLOSE · 218.29` and then — **up to
a minute later** — the identity block changes **all three of its lines at
once**: the label, the figure, the basis and the colour, together. Story 3.4's
close found it and was blunt about it:

> **That is the biggest visual change on the page, it happens on every single
> visit, and nobody designed it.** It is far larger than any subsequent price
> tick, and Story 3.4's motion vocabulary — which names _a bar arrived_ — has no
> word for _this block now answers a different question_.

Fill the snapshot and the block is correct on the **first frame**. The event
does not get designed; it **stops existing**.

This is the one task in Story 3.5 a stakeholder can be shown, and what they will
see is a page that no longer lurches a second after it loads.

## Why it is a real task and not a one-line change

Because `snapshot()` returning a populated map changes what **three** other
things mean, and two of them are Story 3.4's decisions rather than this story's.

### 1. §11.1's omission semantics must survive

An entry for **every security observed** and **no entry at all** for the rest.
_Present but empty_ stays unspellable — which `WireObservation`'s all-required
fields already enforce, and which this task must not weaken to make a map
easier to build. An empty snapshot is **still the true answer after a restart**
(§11.1) rather than a degraded one, so filling it must not turn `{}` into an
error path.

### 2. The arrival mark must not fire on the snapshot

Story 3.4's disc means **a bar arrived for this security**. A snapshot is
**what we already held when you connected**, which is a different fact.
`SecurityIdentity` remembers the instant it mounted with for exactly this
reason — **check that still holds once a snapshot carries prices**, because it
is the difference between a mark that means something and one that fires on
every page load.

This is the assertion most likely to be missing rather than wrong: nothing
today can produce a non-empty snapshot, so no test has ever exercised the case.

### 3. Monday at 09:31, the snapshot holds Friday

§10.3: the map is **not cleared on a session boundary**, and that is correct.
So the first frame a browser receives on Monday morning may carry Friday's
close, stamped Friday. **The identity block must read the instant and say so**,
which is precisely the qualifier Story 3.4 built (`16:00 EDT · change from …`).

Confirm it: a snapshot whose entries are from the previous session must render
as _that session's_ price with _that session's_ instant, and must **not** be
labelled as live merely because it arrived over the live socket.

## Work

- Pass the current-state read from 3.5.1 as the gateway's `snapshot`
- Assert omission semantics on the wire — observed symbols present, unobserved
  symbols **absent**, never present-and-empty
- Assert the arrival mark does **not** fire for a security carried in the
  snapshot, and **does** fire for the first observation after it
- Assert a previous-session snapshot renders with its own instant and basis
- Look at the page with `pnpm probe` before running a suite — the three-line
  flash was found by a person watching a page load, not by a test

## Done when

1. A browser connecting to a process that has observed bars receives them in
   the snapshot, and the identity block is correct on **first paint**
2. The three-line flash is **gone**, confirmed by watching a load rather than
   by inference
3. An empty snapshot is still served, unchanged, by a process that has observed
   nothing — it is the true answer, not a failure
4. The arrival mark does not fire on snapshot entries, with a `pnpm break`
   behind that assertion
5. A previous-session price is labelled with its own instant
6. `pnpm verify` passes, and the browser spec for the identity block still does

## A note for whoever writes the record

Story 3.4's close handed this over as _"not only a data question"_. It was
right, and the interesting part of the finding is the general one: **an empty
default that is also a true answer hides a design event until the day it stops
being empty.** That is worth a line in `docs/GAPS.md` if the sweep in 3.5.9
agrees.
