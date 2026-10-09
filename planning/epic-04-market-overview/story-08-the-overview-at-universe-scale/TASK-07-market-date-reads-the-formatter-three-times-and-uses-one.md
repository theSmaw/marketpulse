# Task 4.8.7 — `marketDateAt` reads the formatter three times and uses one

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.3

## Objective

**The single largest performance lever measured anywhere in this epic, and it
is a computation removed rather than a cache added.** Approved by the owner at
Gate 1.

## What the user can see when this lands

**Nothing, and no string on any screen may change** — that is the acceptance
property, not a hope.

## Work

### The finding, measured twice from two harnesses

`marketDateAt` → `marketWallClockAt` → `wallClockParts` (one `formatToParts`),
**plus `marketOffsetAt`, which calls `wallClockParts` AGAIN and the offset
formatter's own `formatToParts` a third time** — and then `marketDateAt`
discards the offset and returns `.date`. **Three `Intl.formatToParts` calls per
answer, one of them used**: instrumented at **1,554 calls for 518
conversions**.

Two independent benchmarks over `packages/shared/dist`, 518 instants, 400 timed
after 300 warm-up:

|                                                   | median                    |
| ------------------------------------------------- | ------------------------- |
| `marketDateAt` as shipped                         | **3.33 / 3.36 / 3.60 ms** |
| the date from one parts read, offset not computed | **1.06 / 1.09 ms**        |
| a minute-keyed memo (**not being taken**)         | 0.002–0.004 ms            |

**−68%, no key, no eviction, no state, no clock, and no changed answer.** The
first line reproduces Story 4.4's 3.42 ms attribution to within 3% from a
different harness, so the attribution is confirmed rather than inherited.

### Why not the cache, recorded so nobody re-opens it cheaply

A memo keyed on the exact epoch is referentially transparent and carries no
replay risk — the function reads no clock either way, so invariant 4 is
untouched. What it carries is **module-level mutable state in the one module
this repository holds out as a pure conversion seam and appoints by lint
rule**, state a test can leak across, and a truncating key that is safe today
only because a market-date boundary is a minute boundary — a reasoning step the
next author will not redo. Epic 14's own file calls it _an architectural change
rather than an optimisation_ and declined it; **that disposition is kept, and
the cache stays Epic 14's named candidate.**

### It pays twice, on both sides of the wire

`UniverseTable` calls `changeFromClose` **per row**, so the browser spends the
same 518 `marketDateAt` calls on every tick of `/securities` — about **3.4 ms
inside Task 3.6.5's measured 37–40 ms, roughly 9% of the tick**, for a
conversion that is two-thirds discarded work. One shared-module change lands on
both.

### The boundaries that constrain the edit

- **It stays inside `packages/shared/src/market-time.ts.`** Four
  `no-restricted-syntax` rules confine `Intl.DateTimeFormat` construction and
  the timezone identifier to that file.
- **Factor the assembly so `marketWallClockAt` uses the same helper** — one
  fact, one home.
- **Do not touch the 518 call sites.** A shipped invariant family refuses a
  site computing a move instead of calling `changeFromClose`, keyed on the
  division rather than on a type name, so caching or inlining per entry trips
  the build.
- `market-time.test.ts`'s existing assertions about `marketWallClockAt` are the
  regression surface; 27 non-test files call `marketDateAt`.

### And the check it owes, because a claim about a mechanism reads identically

### whether the mechanism is there or not

_"`marketDateAt` reads the formatter once"_ is invisible the day somebody
re-expresses it as `marketWallClockAt(instant).date`. **The guard is
structural, not a timing**: an invariant asserting that `marketDateAt` does not
route through the offset path, with a break that restores the one-line
delegation. Per `CLAUDE.md`'s 2026-09-26 rule, **write the break as the file the
NEXT author would write, confirm the check passes WRONGLY first, keep the
transcript**, then fix, then confirm red.

**Reversal trigger, a condition:** _the first market-date question whose answer
depends on the UTC offset in effect_ — i.e. the first date derived by
arithmetic on an instant rather than read from the formatter's parts — at which
point the two functions stop being able to share one parts read.

### And one document to correct, upward, the same day

`epic-14-performance-scale-validation/EPIC.md` says this path **"constructs one
`Intl.DateTimeFormat` per entry per batch."** Instrumented: **2 constructions
for the life of the process** — the formatters are memoised in module-level
`let`s. A dated amendment beside the claim, not a rewrite.

## Done when

1. `marketDateAt` reads the parts once, with the assembly shared with
   `marketWallClockAt`
2. Re-measured on the same harness: the figure, with n, medians and p95
3. **No rendered string changes**, proved by a before/after comparison of
   `main`'s text in every state the level can reach — not reasoned
4. The invariant exists with its break and its passing-wrongly transcript
5. Epic 14's false `Intl` construction claim carries a dated amendment

## Handed here by Task 4.8.3 — 2026-10-09

**Your repair is worth more than the per-batch figure suggests, and here is the
arithmetic.** `marketDateAt` inside `changeFromClose` is **93%** of a 3.44 ms
join over 518 securities — the join reads **0.013 ms** with nothing observed and
**0.019 ms** with observations but no closes (Task 4.4.4's attribution,
reproduced by a second instrument on the production artefact), against **3.44 ms**
with both. Everything else the producer does — breadth, the movers' selection,
eleven sector ranks, the ladder's rung and the frame's JSON encode — is
**0.22 ms, 6%**.

**And the join does not run once a batch.** It runs once per applied batch,
once per connect, once per subscribe and once with zero clients attached —
**three per browser opening `/`**, two on `/investigations`. So the parts-read
repair is multiplied by `batches + 3 × cold loads + resubscribes`, not by
batches alone.

**One caveat on whatever figure you publish**: 4.8.3's finding 6 measured the
same join at 3.73 ms in a tight loop and 12.97–15.43 ms at a 250 ms-or-greater
gap, with a fixed-cost control moving by the same factor. Compare your
before-and-after at the **same** gap, which a tight loop gives you for free —
just do not read the absolute number as a production cost.
