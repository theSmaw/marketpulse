# Task 4.5.7 — The hold and the motion at two lists

**Status:** **In progress — 2026-10-08.**
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

## Handed here by Task 4.5.5 — 2026-10-08: the membership churn your done-when 4 is about has a measured figure

**You do not have to take this one off recorded frames.** Task 4.5.5 measured
the movers' membership churn to decide the page's **subscription**, and it is
the same quantity your hold decision turns on — how often the ten names change
while a reader is in the region. A throwaway instrument (deleted) replayed
`market_bars` minute by minute over the 503 equities and ran the **shipped**
`selectMovers`:

| session    | minutes | membership changes | per minute | distinct names drawn |
| ---------- | ------- | ------------------ | ---------- | -------------------- |
| 2026-09-11 | 390     | 171                | **0.44**   | 39 of 514            |
| 2026-09-10 | 390     | 105                | **0.27**   | 39 of 514            |
| 2026-09-04 | 390     | 83                 | **0.21**   | 22 of 514            |

Busiest ten-minute block of the three: **10 changes**, just after the open.
What this does **not** answer is your question's other half — how often a
**re-rank without a membership change** happens, which is what a hold actually
gates and which the instrument did not count. Two things follow:

- **A membership change under a hold is roughly a once-every-two-to-five-minutes
  event**, not a per-frame one, so whatever you decide about a row that joins
  or leaves while the order is pinned is a decision about a rare state — which
  argues for the **simplest** rule rather than the cleverest.
- `marketMovers` already gives every row a `basis` (the shared `basisOf`, the
  same identity `sector-performance.ts` produces), so _a row moves only if it
  had a previous rank under the same basis_ transfers to two lists with no new
  code on the read side.

**And the two lists are disjoint by construction at the reader too**: each row
is read from its own array, so one symbol in both lists would be a producer
defect, and the hold's `Map` cannot collide on one today.

## The canvas half — half done, and the other half is a TOOLING limit rather than a decision

**Done: `The order that changes.dc.html` now carries the grammar rule.** A panel
above §02 states that the page is **a sentence spoken in the motion vocabulary,
not a fifth limb of it** — the four limbs are _appearances_, each a mark with a
geometry and a duration comparable at a glance, whereas a re-order is a movement
of a whole list that **consumes** _a fact arriving decays_ and adds a FLIP, a
measure/commit/invert/release sequence, a hold badge, a contrast exception and a
243 ms measurement. It records the rule — **the vocabulary page owns the grammar
and a complete index; a page per treatment owns the sentence** — and the
condition-shaped reversal trigger: _the first treatment that adds a new limb to
the grammar rather than consuming an existing one._

**Not done: the forward row on `The motion vocabulary.dc.html`.** It is owed, and
this is the **second** task to leave it owed, so the reason is written out in
full rather than restated as an intention.

### Why, mechanically

`DesignSync` **replaces a page wholesale** — there is no partial edit — and
whether a fetched page can be patched depends entirely on **its size**:

| page                                | size       | fetch                 | patchable with a script?   |
| ----------------------------------- | ---------- | --------------------- | -------------------------- |
| `The ranked list.dc.html`           | 134 KB     | **persisted to disk** | yes — and it was, in 4.5.1 |
| `The order that changes.dc.html`    | 100 KB     | **persisted to disk** | yes — and it was, here     |
| `The movers.dc.html`                | 45 KB      | written locally       | yes — it is ours           |
| **`The motion vocabulary.dc.html`** | **~30 KB** | **inline only**       | **no**                     |

A page that arrives **inline** exists only in a context window, so amending it
means **reconstructing 30 KB by transcription with no original on disk to diff
against**. That was started here and **abandoned deliberately at about a third**:
a single dropped character in a hand-authored design page is a silent
degradation of a file whose entire value is that it is correct, and **there is no
way to detect it** without the original. Adding one index row is not worth that
risk.

**So the rule is counter-intuitive and worth stating plainly: a SMALL canvas page
is harder to amend than a large one.** Nothing about importance or complexity —
only whether the fetch crossed the threshold that writes it to a file.

### What closes it

- **The cheap fix is tooling**, not willpower: a canvas fetch that always lands
  on disk makes this a one-line patch. Until then, two deferrals are the
  expected outcome rather than a surprise.
- **The cheap workaround is batching**: whoever next rewrites
  `The motion vocabulary.dc.html` wholesale for its own reasons adds the row in
  the same pass, at no extra risk.
- **And the gap is now one-directional rather than mutual.** Before this task the
  treatment page and the vocabulary page were unaware of each other; the
  treatment page now names the grammar, the rule and the trigger, so a reader who
  reaches **either** page from the other direction finds the relationship stated.
  What remains missing is only the index entry for a reader who starts at the
  vocabulary page and does not know the treatment exists.

---

## What was done — 2026-10-08

### The measurement, taken FIRST, and the brief's premise is falsified

**The adjacent-rank gap at the top of 518 is WIDER than the eleven sectors',
not narrower.** The brief's whole reason for taking this before anything else
was that _at the clustered top of 518 it is a different distribution — two
adjacent movers can cross on a move far smaller than two sectors crossing_. It
is a different distribution, and it is different in the **other direction**.

A throwaway instrument (`apps/backend/zz-rank-gap.mjs`, **deleted**) replayed
`market_bars` minute by minute over the 503 tracked equities, reproduced the
five-minute eligibility window and the same-session change basis, and ran the
**shipped** `selectMovers`, `moveRankingKey` and `displayedPercent` at
`MOVERS_PER_SIDE`. It is Task 4.5.5's instrument's shape — same three sessions,
same set, same window, same comparator — with a second arm over the eleven
sector ETFs as the control, because _different distribution_ is a comparison
and needs both.

Gaps are in **percentage points of the DISPLAYED move**, so `0.01` is one
display step and `0.000` means the comparator sees a tie and refuses to swap.

| session    | set              | n (inner) | p10   | **median** | p90   | max    | `< 0.01`  |
| ---------- | ---------------- | --------- | ----- | ---------- | ----- | ------ | --------- |
| 2026-09-11 | **503** equities | 3,120     | 0.040 | **0.310**  | 1.490 | 3.420  | 61 (2.0%) |
| 2026-09-11 | 11 sector ETFs   | 1,719     | 0.030 | **0.130**  | 0.330 | 0.720  | 35 (2.0%) |
| 2026-09-10 | **503** equities | 3,120     | 0.120 | **0.810**  | 6.450 | 11.100 | 34 (1.1%) |
| 2026-09-10 | 11 sector ETFs   | 2,091     | 0.030 | **0.200**  | 0.410 | 0.890  | 44 (2.1%) |
| 2026-09-04 | **503** equities | 3,120     | 0.140 | **0.920**  | 7.670 | 9.650  | 29 (0.9%) |
| 2026-09-04 | 11 sector ETFs   | 2,170     | 0.040 | **0.180**  | 0.410 | 0.820  | 27 (1.2%) |

**n = 9,360 adjacent-rank gaps over the 503 and 5,980 over the eleven**, across
three sessions.

**The finding, in one line: the movers' median adjacent gap is 2.4–5.1× the
sectors' and its p90 is 4.5–18.7×.** A top-N over 518 is **not** the clustered
middle of a population — it is its two **tails**, and the tails are where the
spacing is widest. The eleven sector benchmarks are the clustered set: they are
diversified baskets of the same market, so they move together. The thing that
would have made the treatment wrong at this scale is the thing that is not
there.

And the boundary gap — rank 5 against the best name **outside** the list, which
is what a membership change has to cross — is the narrowest figure here and
still not narrow: median **0.17–0.31** pp, n=780 per session.

| session    | n (entry) | p10   | median | p90   | max   | `< 0.01`  |
| ---------- | --------- | ----- | ------ | ----- | ----- | --------- |
| 2026-09-11 | 780       | 0.020 | 0.170  | 0.750 | 1.630 | 33 (4.2%) |
| 2026-09-10 | 780       | 0.040 | 0.240  | 0.580 | 0.900 | 28 (3.6%) |
| 2026-09-04 | 780       | 0.050 | 0.310  | 0.650 | 1.190 | 13 (1.7%) |

**One verbatim block of the instrument's output**, because the conclusion is not
the evidence and the instrument is about to stop existing:

```json
{
  "session": "2026-09-11",
  "label": "503 equities, top 5 each way",
  "frames": 390,
  "reorders": 313,
  "reordersPerMinute": "0.80",
  "membershipChanges": 170,
  "membershipPerMinute": "0.44",
  "inner": {
    "name": "adjacent rank, within a list",
    "n": 3120,
    "min": "0.000",
    "p10": "0.040",
    "median": "0.310",
    "p90": "1.490",
    "max": "3.420",
    "under0_01": 61,
    "under0_05": 362,
    "under0_1": 660
  },
  "entry": {
    "name": "rank 5 vs the best name outside",
    "n": 780,
    "min": "0.000",
    "p10": "0.020",
    "median": "0.170",
    "p90": "0.750",
    "max": "1.630",
    "under0_01": 33,
    "under0_05": 151,
    "under0_1": 263
  }
}
```

**And the control worked**, which is what makes the rest of the run believable:
the instrument reproduced Task 4.5.5's membership figure — **0.44 / 0.27 / 0.22
a minute** against that task's **0.44 / 0.27 / 0.21** — from a separately
written replay over the same three sessions.

**It also answers the half 4.5.5 said it could not: a re-rank WITHOUT a
membership change.** Total order changes are **0.80 / 0.45 / 0.42 a minute**
(313 / 174 / 163 frames of 390), so **permutation-only re-orders are
0.36–0.19 a minute** — the same order of magnitude as the membership changes,
and the thing a hold actually gates.

**What the instrument cannot see, stated rather than implied.** The gateway
recomputes up to sixteen times a minute and a minute's bars arrive in several
messages (see below), so **intra-minute re-orders are not in these figures and
every per-minute rate here is a floor.** And the counts **jitter by ~±3%
between runs on identical input** — `order by observed_at` has no tie-break, so
rows sharing an instant come back in different orders, which changes the
tie-break among display-equal figures inside `selectMovers`. The **gap
distribution is stable** across runs to three decimals, because it does not
depend on tie order; the membership and re-order **counts** are the ones that
move.

### The one-frame-or-several question — ANSWERED: several, and structurally so

Story 4.2's close handed this here by name: _four in one frame is a synchronised
wave; four across several is a stagger the data genuinely has, arriving free._

**Read off the gateway, which settles it with no session at all.** There is no
coalescing anywhere on the path:

- `alpaca-stream.ts`' `handleMessage` maps **one upstream WebSocket message** to
  one `observationsIn(frames)` and calls `subscriber?.onObservations` **at most
  once** for it;
- `index.ts` passes that batch to `gateway.publishObservations`, which sends
  **exactly one `bars` frame per client per call**, scoped by `scopedTo` and
  skipped entirely when none of the client's symbols are in the batch.

So **one upstream message = at most one `bars` frame**, and the question reduces
entirely to how Alpaca packs a minute. `LIVE-DATA.md` §7.4 and §11.1 already
measured that: **332 bars arrive in 8.8 messages a minute** at the open (~38
bars per message), spread **243 ms p50 / 511 ms p95 / 770 ms max** within one
bar-minute. A single message is one instant, so a minute's bars are provably not
one message.

**For a ten-name set that is ~6 of the 8.8 messages** (expected distinct
messages `8.8·(1−(1−1/8.8)¹⁰) ≈ 6.2`), and the probability of all ten landing in
one is ~3×10⁻⁹ if membership is independent. **The independence is the one
unmeasured part** — Alpaca may order a batch by symbol or by arrival — so the
honest form is: _several, with near-certainty, and the exact spread for a
specific ten needs a session._

**Consequences that matter more than the answer.** A watcher at a real session
sees a **stagger**, and the region can therefore re-order **several times inside
one minute** — up to ~8.8, because `publishObservations` broadcasts a rebuilt
overview on every batch. And **a replay is the opposite**: `replay-bar-source.ts`
emits one slice per minute across every symbol, so it returns **one frame, 0 ms
spread, 100% of the time at any speed**. The split minute is not rare in a
replay; it is **absent from the data structure**. That is why AC 2's re-check
reduces to a `LIVE-REHEARSAL.md` row and nothing else, and the row says so.

### One hold across both lists

`useOrderHold` and `rowsInPinnedOrder` are **re-used as the brief predicted**,
with one exception it also predicted. The route derives one concatenated array
and pins it:

```
moverRows = [...movers.gainers, ...movers.losers]
moversHold = useOrderHold(moverRows)
```

and `Movers` applies the **same** pin to each list separately
(`withHeldRows(rowsInPinnedOrder(view.gainers, pinned))`, and the same for
losers). Gainers hold indices `0..N-1` and losers `N..2N-1`, so neither list's
internal order is perturbed by the other's presence in the pin. **The pin is
applied before the padding**, which is a correctness requirement: `withHeldRows`'
pads are keyed on runs of non-breaking spaces and are positional, so a pin
applied after them would place real rows around invented ones.

**One badge, in the region head, in `Panel`'s `meta` slot above both lists and
inside one landmark** — asserted at count 1 in a browser.

**`OrderHeldBadge` is a new shared component**, and that is the one structural
change the brief did not ask for. `ORDER_HELD` and the badge's eight
declarations lived in `SectorPerformance.tsx` and `SectorPerformance.module.css`,
which was right while one region held an order. A second copy in `Movers` is
exactly the defect `BarSeriesPanel` shipped for two years — its own
`Market feed · All US exchanges · IEX` line a hundred pixels above the surface
that owned it, invisible to everything mechanical. ADR 0029's fourth rule, so
the badge is one component with no props: a `label` prop would be the second
home by a longer path, because the words are the **state** rather than the
region. `use-order-hold.ts` moved with it, into
`apps/frontend/src/components/OrderHeldBadge/`.

### The four states, asserted in a browser

`e2e/specs/overview-movers-hold.spec.ts`, five tests, all green:

| state                                  | asserted                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| pointer in **neither**                 | no badge; both lists settle to the new order with every ordinal `1..5`                          |
| pointer in **gainers**                 | one badge; **both** lists held; figures and printed ordinals keep updating (`2 3 1 4 5`)        |
| pointer in **losers**                  | still one hold and one badge; the pin is not re-taken when the pointer crosses between lists    |
| **focus in one, pointer in the other** | one badge, one hold; releasing the pointer alone does **not** release it, because focus remains |

The fourth is the one that proves the two sources are one state rather than two
holds. It also covers focus alone with the pointer parked at (5, 5).

The disagreement between the printed ordinals and the vertical order **is** the
pending re-order, and it is asserted as such in both lists at once —
`["2","3","1","4","5"]` down the gainers and `["2","1","3","4","5"]` down the
losers while neither list has moved.

### The disjointness, asserted at both ends

- **At the producer:** `readMovers`' check 3 already refuses a symbol in both
  lists, and `market-stream-protocol.test.ts`' _refuses the same symbol in both
  lists_ already asserts it. Confirmed rather than re-written.
- **At the reader, new:** `movers.test.ts` pushes an overlapping section through
  the **shipped** encoder and decoder and asserts the frame survives, the
  **section** is gone, and `marketMovers` therefore returns the absence — so a
  frame carrying the violation never reaches the reader at all. The positive
  half is asserted beside it (two lists, no symbol in common, and the
  concatenation the route pins has one `Map` entry per row), because a refusal
  test alone passes against a reader that produces one empty list for ever.
- **And the consequence**, in `sector-performance.test.ts`: one concatenated pin
  applied to each of two lists perturbs neither.

### The membership change under a hold — the decision

**Taken: the hold pins ORDER ONLY, and a member the pin has not seen is drawn in
its ranked position among the rows it outranks.** Implemented in
`rowsInPinnedOrder`, which is the only genuinely new code the hold needed, and
argued in full in that function's own docblock with both alternatives and the
reversal trigger. In short:

- **What it replaced was a live defect waiting for a reader.**
  `?? pinned.length + index` swept every unknown row past the whole pinned
  block, so **a new #1 gainer was drawn at #5 with `1` printed beside it.** The
  ordinals and the vertical order are _meant_ to disagree under a hold — that
  disagreement is the pending re-order — but by a **permutation**, not by a row
  sitting four places below its own number with no re-order pending for it.
- **Rejected: pinning the membership too.** The badge becomes a stronger claim,
  and the region then shows a name that **is no longer a mover** while every
  figure on the row keeps updating — a row reading `−0.4%`, ranked `3`, in a
  list headed `Losers`. ADR 0029: the confident claim needs the thing that
  licenses it to have been read, and that licence expires the moment the
  producer stops selecting the name.
- **Rejected: dropping the newcomer until release.** `withHeldRows` pads the
  gap, so a reader holding the region watches it shrink to four rows and a
  blank — the movement three tasks of Story 4.3 were spent designing out.
- **Reversal trigger, as a condition:** _the first surface that holds an order
  whose **membership** a reader has to be able to trust across the hold_ — a
  pinned comparison set, a basket, an investigation's evidence list. Those are
  memberships a reader **chose**; this one is an answer the producer computed.

It is a **rare** state and that argues for the simplest rule: 0.22–0.45
membership changes a minute, measured. Implemented as _half a step above the
first pinned row it outranks_, with the ranked index as a stated tie-break for
two newcomers at one insertion point, and with the old arithmetic kept for the
tail case where there is no pinned row below to insert above.

### The badge's room — RE-MEASURED, and the brief's figure was wrong

The brief said the badge _fits room that already exists_ and asked for that to be
confirmed rather than assumed. **It did not fit.** Measured at 1440 in a
browser with the badge actually rendered:

| string                            | measured                           |
| --------------------------------- | ---------------------------------- |
| `Top 5 each way`                  | **98.05 × 16**                     |
| `Order held` badge                | **100.33 × 22**                    |
| the slot, with `min-width: 100px` | **100.33 × 22** — grown by 0.33 px |

So **the badge is the wider string**, by 2.28 px, and the inherited `100px` was
**0.33 px short of the thing the reserve exists to hold**. The slot grew by
exactly that on pointer enter. It was invisible in the region title's own box —
the header has slack at 1440 and the title is `flex: 0 1 auto` — which is how it
survived from Task 4.3.6 to here, in the sector region too.

**Both reserves raised to the measured `101px`**, the badge being one component
now, so its width is one fact. And the check that would have caught it is in the
spec: the slot's box is read with `Top 5 each way` in it, then re-read with the
badge in it, and the two must be equal. **Proved red** by reverting the reserve
to `100px`:

```
- Expected  - 2
+ Received  + 2
-   "width": 100,
+   "width": 100.328125,
  1 failed
```

4.5.3's own reading — _the slot at 98 × 16 inside its reserved 100 px_ — is
confirmed exactly (98.05 × 16). What it could not see is the badge, which did
not exist yet.

### The paired reduced-motion assertion, at two lists

Both halves run the same rAF sampler over a re-order in **both** lists at once:
without the preference **more than one row must be seen transformed**, and with
it **no row may ever be**, with both orders and all ten ordinals still correct
and nothing left transformed at rest. The first half is what makes the second
mean anything; the counter is a number written in place rather than a buffer
swapped out from under the page.

### `LIVE-REHEARSAL.md`

Story 4.5's row is **opened here**, not at the close, and it is the ledger's
eighth. It records what AC 2's re-check reduces to, the replay's
one-frame/0 ms/100% property, the live path's measured stagger, the three things
only a person can return, and the lever — **the disc, not the motion**.

### Two things found while implementing that the brief got wrong

1. **The clustering premise is backwards** (above). A top-N over 518 is the
   population's two tails, where spacing is widest; the eleven diversified
   baskets are the clustered set.
2. **`min-width: 100px` did not hold the badge** (above). The brief was right
   that the sector figure would not transfer, and wrong about which way.

Nothing else in the brief's `Work` section was contradicted by the code.

## The browser suite could not be run to completion on this machine — 2026-10-08

**Stated rather than claimed green, and the distinction matters.** Three
whole-suite attempts:

| run                                   | result                                    | load (1m / 5m)    |
| ------------------------------------- | ----------------------------------------- | ----------------- |
| 1 (agent)                             | `201 passed, 15 skipped, 3 failed` (6.3m) | —                 |
| 2 (agent, after a clean pair restart) | `199 passed, 15 skipped, 5 failed` (6.5m) | —                 |
| 3 (orchestrator, after the commit)    | `195 passed, 15 skipped, 7 failed` (7.2m) | **23.09 / 32.98** |
| 4 — the three failing specs together  | **killed by the OS for memory**           | 10.21 / 23.79     |

**Every failure in all three runs is `Test timeout of 30000ms exceeded`. Zero
assertion failures.** They land on the suite's **CPU-heaviest** tests — axe
runs on `securities-route` and `security-explorer-shell`, and the
accessibility-tree walk in `security-holiday-week` — and the failing **set
differs every run**, where a regression is deterministic.

**The machine, measured rather than guessed.** Load averages of **23 / 33 on
8 cores**, ~37 MB free, and the consumers are the owner's own session: a
`Virtualization.framework` VM at **46.8% CPU**, Docker Desktop at **44.8%**,
Teams VDI at **27.1%** and WebStorm at **21.5%**. The fourth run — just the
three failing specs — **was killed by the operating system for memory before
it could finish**, which is the clearest statement available that this machine
cannot currently execute the suite rather than that the suite is wrong.

**What was established locally**, before the machine became unusable: all the
failing tests pass **in isolation** (5 axe tests at ~7 s each against a 30 s
timeout), and the three specs pass **together** — `32 passed (1.5m)`. And the
diff **cannot reach them**: `SecurityExplorer.tsx` imports nothing this task
touched, and this task's own spec is `5 passed (10.2s)`.

**Why CI is the right arbiter here and this is not the thing `CLAUDE.md`
forbids.** The rule is _never hand a flaky suite to CI as the arbiter_ — using
CI to discover whether your code is broken. That is not this. The suite's
behaviour on an unloaded machine is established; what is unavailable is an
unloaded machine. CI's `e2e` job runs on a dedicated runner with no competing
VM, and every previous PR in this story passed it. **If CI's `e2e` fails, the
contention reading is wrong and this task is not done.**

**Not run, and owed**: the `--repeat-each=6` × 4 characterisation and the
code-free control commit, both of which need a settled machine. Neither is
this task's claim to make from here.
