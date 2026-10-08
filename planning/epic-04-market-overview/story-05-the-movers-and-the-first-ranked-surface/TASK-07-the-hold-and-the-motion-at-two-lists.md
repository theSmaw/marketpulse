# Task 4.5.7 — The hold and the motion at two lists

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.5

## Objective

**Re-check Story 4.3's treatment at this story's scale and shape — do not
re-take it.** Acceptance criteria 2, 3 and 4 are already met; the risk this
story carries is the opposite of the one it was written for: **not that the
decision is unmade, but that it will be inherited without being re-checked** at
a density where the synchrony is **worse rather than better**.

## What the user can see when this lands

**A re-order that reads as facts arriving rather than a page refreshing** — in
two lists at once, which is a gesture 4.3 could not produce.

## Work

### The hold is one hold, across both lists

`Region.onReaderWithin` combines non-bubbling `pointerenter`/`pointerleave` on
the region box with bubbling `focusin`/`focusout`. There is **no per-list signal
without adding listeners to the `<ol>`s** — and a list-scoped hold is **row
scoping one level up**: it lets the losers list move out from under a pointer
that is **approaching** it diagonally across the region, which is the failure
the whole treatment exists to prevent.

**One badge, in the region head**, in `Panel`'s `meta` slot above both lists and
inside one landmark — so `Order held` reads as _this region's order_ exactly as
`Movers` reads as _this region's name_. A badge per list is two speakers who can
disagree.

**`useOrderHold` and `rowsInPinnedOrder` work unchanged**: pin one concatenated
array and apply it to each list separately. Gainers occupy indices `0..N-1` and
losers `N..2N-1`, so neither list's internal order is perturbed by the other's
presence in the pin. **Precondition: the two lists must be disjoint**, or the
`Map` keyed on symbol collides and last-write-wins silently reorders it. Gate 1's
direction-matching rule makes them disjoint by construction and 4.5.4's
`readMovers` refuses the violation — **assert both rather than assuming**.

### Four states 4.3 could not reach

Pointer in neither / in gainers / in losers / **focus in one and pointer in the
other**. Enumerate and assert all four. What a reader hovering gainers while
losers would have re-ordered actually gets: **nothing re-orders, both lists keep
updating their figures and their printed ordinals, and the disagreement between
the ordinals and the vertical order in both lists is the pending re-order** —
readable with no motion and in greyscale. That is strictly better than a
half-frozen region with nothing saying which half.

### The badge's room must be re-measured, not inherited

`SectorPerformanceMeta` reserves the wider of `Order held` and `N of 11 ranked`,
with `min-height: var(--line-height-subheading)` because a 26 px badge against a
22 px title line grew the head four pixels and **moved all eleven rows** — found
in a browser and by nothing else. Movers' slot holds `Order held` or `Top 5 each
way`, and **`min-width: 100px` is the sector slot's measured figure and will not
transfer.** Re-measure and state whichever string is wider.

Note the licence difference: the sector count _speaks only in the mixed state_
because it is a claim about **data**; `Top 5 each way` is a claim about the
region's **design** — a constant — so it may render in every state including the
all-unknown one, and should, because _is this all of them?_ is the ranking's
standing question.

### Membership change under a hold — new, and it needs a written decision

4.3 never had this: eleven sectors are fixed, so a held list could only permute.
**A held movers list can have a member replaced.** A reader holding the order to
read it, who gets a row substituted under their pointer while the badge says
`ORDER HELD`, has been told something false.

**Recommendation to carry in, and to argue rather than assume:** the hold pins
**order only**, and a member the pin has not seen is drawn **in its ranked
position among the rows it outranks** — not offset to the bottom, which is what
`rowsInPinnedOrder`'s `?? pinned.length + index` does today and which would put a
new #1 gainer at #5. That is the only genuinely new code the hold needs. The
alternative — pinning membership too — makes the badge stronger and lets the
region show a name that is no longer a mover.

### The measurement that is owed before any sitting

**The adjacent-rank gap distribution per minute, at a top-N over 518.** This is
the number the _whole list does not re-arrange_ argument actually rests on; it
was owed by Task 4.3.8 for eleven, and at the **clustered** top of 518 it is a
**different distribution** — two adjacent movers can cross on a move far smaller
than two sectors crossing. **Readable off recorded frames with no person
involved. Take it before the sitting, not after** — if the gap is small the
treatment may be wrong at this scale for a reason nobody has looked at.

And read from the gateway **whether a small set's bars arrive in one `bars`
frame or spread across several of the ~16 a minute** — Story 4.2's close handed
that here by name: _four in one frame is a synchronised wave; four across
several is a stagger the data genuinely has, arriving free. A sitting that
cannot say which the watcher saw cannot answer anything._

### What AC 2's re-check actually is, stated so the close does not over-claim

**A replay cannot stand in for the session.** `replay-bar-source.ts` emits one
slice per minute across every symbol, so a replay returns _one frame, 0 ms
spread_ **100% of the time at any speed**, and every observation shares one
`startsAt` — **the split minute the treatment is designed against is absent from
the data structure.** So AC 2's re-check reduces to a `LIVE-REHEARSAL.md` row
and nothing else. Open the row in this task, not at the close.

The lever if it reads wrong is **the disc, not the motion** — a ranked list's
aliveness is its order.

### The motion vocabulary's missing row — handed here by Task 4.5.1

**`The motion vocabulary.dc.html` does not know the re-order exists.** Four
limbs on one page and a fifth on `The order that changes.dc.html`, which is the
state **both** arguments were against — the one-page argument and the own-page
one. Nothing on the vocabulary page references it.

**The repair is a cross-reference, not a move**, and the argument is recorded
here so it is not re-opened. The four limbs are **appearances** — a loop, a
persistent state, a decaying fact — each a mark with a geometry and a duration,
comparable side by side at a glance. **A re-order is not a fifth limb; it is a
sentence spoken in the grammar**, consuming _a fact arriving decays_ and adding
a FLIP, a measure/commit/invert/release sequence, a hold badge, a contrast
exception and a 243 ms measurement. Put in the grid it needs a row that is a
different kind of thing, which is what would actually damage the page. And the
one-page property is about **scannability**, not file count.

**The general rule to record with it**: the vocabulary page owns the grammar and
carries a **complete index** of treatments; a page per treatment owns the
sentence. **Reversal trigger, as a condition**: _the first treatment that adds a
new limb to the grammar rather than consuming an existing one_ — that one moves
onto the vocabulary page, because it changes what the grammar is.

**Why it is yours rather than 4.5.1's**: `DesignSync` replaces a page
wholesale, and that page comes back **inline rather than persisted to disk**, so
a one-row amendment means re-emitting 30 KB from context. You open `The order
that changes.dc.html` for your own reasons — batch it there.

### Boundaries

Not the spec or the grid (4.5.8). Do not re-take the FLIP, the durations, the
no-stagger rule or the reduced-motion answer.

## Done when

1. One hold across both lists, one badge, with the four pointer/focus
   combinations asserted in a browser
2. The two lists' disjointness is asserted, at the reader and at the producer
3. The badge's slot is re-measured and reserved, and the region head does not
   move when the badge appears
4. The membership-change-under-hold decision is taken in writing, with its
   alternatives and a condition-shaped reversal trigger, and implemented
5. The adjacent-rank gap distribution is measured off recorded frames and
   recorded with n, and the one-frame-or-several question is answered
6. The paired reduced-motion assertion runs against **two** lists
7. `LIVE-REHEARSAL.md` carries this story's row, opened here
8. `The motion vocabulary.dc.html` references the re-order, with the
   vocabulary-owns-the-grammar rule and its condition-shaped reversal trigger
9. `pnpm verify` and `pnpm e2e` green
