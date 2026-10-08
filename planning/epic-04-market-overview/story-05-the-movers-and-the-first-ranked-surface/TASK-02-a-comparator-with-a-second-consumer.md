# Task 4.5.2 — A comparator with a second consumer

**Status:** **Complete — 2026-10-08.**
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** —

## Objective

**Discharge the `docs/GAPS.md` entry that names this story as its owner**, and
give the top-N a home beside the comparator rather than a second implementation.

The entry's words: _"Nothing forbids a SECOND comparator over a figure's move,
and the obvious clause is red against shipped code. **Owner: the first story
that ranks anything server-side other than the eleven** — Story 4.5's movers by
name. It writes the second caller, so it is the change that can say what the two
have in common and key a clause on that rather than on this one's incidentals."_

## What the user can see when this lands

**Nothing.** 4.5.5 pays it off.

## Work

### The rule has one home and it is not re-derived

`packages/shared/src/sector-ranking.ts` holds it: **descending by the figure's
own move; a figure with no move has no ranking key and sorts after every keyed
one, holding arrival order; two figures equal at displayed precision never
swap.** No default and no `?? 0` anywhere — `key ?? 0` places a security we have
not heard from **among the genuinely flat ones**, which is ADR 0029's false
impression expressed as a **rank position**.

`sectorRankingKey` is already the one home for _which field this state's move
lives in_ — `changePercent` on an `observed` figure, `sessionChangePercent` on a
`stored` one. **Reuse it. Do not re-derive a move**: Story 4.4 measured that the
expensive part is already paid by the join, and a top-N that re-derives is a
second producer of a figure 518 rows wide.

### The module's name is now wrong for two consumers

The generic half — the key reader and the comparator — is generic over
`WireOverviewFigure` and is about a **move**, not a sector. A movers selector
calling `compareSectorFigures` reads wrong, and writing a second comparator is
the defect the module's own header forbids. **Rename the generic two**
(`moveRankingKey`, `compareByMove`) and keep `rankSectorFigures` sector-specific.

> **Corrected 2026-10-08 before the work started — the rename is much cheaper
> than this bullet said.** It claimed three `scripts/breaks.mjs` entries move
> with it. Measured: `grep -c "sectorRankingKey\|compareSectorFigures"
scripts/breaks.mjs` is **0**. The three entries the estimate was counting all
> name **`rankSectorFigures`**, which stays sector-specific and is **not being
> renamed** — so no break entry moves at all. One comment in
> `check-invariants.mjs` (≈3524) mentions `compareSectorFigures` and should be
> updated for accuracy, not because a check depends on it. **Still run every
> named break afterwards**: `CLAUDE.md`'s rule binds on moving or reformatting
> anything a break names, and this change edits the file three of them target.

**And the key reader already has a third consumer that is not about sectors.**
`packages/shared/src/sector-ladder.ts`'s `fitSectorLadder` calls
`sectorRankingKey` to find the widest move in a set — it reads _a figure's
move_, with no sector semantics at all. So the generic half is already serving
two callers under a sector-specific name, and movers is the third.

### The selection, bounded rather than sorted

**Measured on this machine, 2026-10-08** — built `dist`, 503 synthetic
`observed` figures (moves over ±5%, one in eleven nudged to a display-equal
+0.004%), **400 timed iterations after 300 warm-up**, two runs back to back.
`pnpm dev` was up throughout, which is the load average below; the instrument
printed `uptime` either side of itself and was deleted afterwards.

```
load at start: 9:28  up 134 days, 46 mins, 1 user, load averages: 12.66 7.59 6.95
n = 400 timed iterations after 300 warm-up, 503 figures, limit 10
full sort of 503 (rankSectorFigures)       median 0.5890 ms | p95 0.6230 | max 0.7285 | min 0.5697
full sort + slice(0,10) both ends          median 0.5852 ms | p95 0.6220 | max 1.1672 | min 0.5651
bounded two-ended selectMovers(503, 10)    median 0.1599 ms | p95 0.1727 | max 0.2737 | min 0.1540
one bare pass reading the key (floor)      median 0.0010 ms | p95 0.0013 | max 0.0349 | min 0.0010
load at end:   9:28  up 134 days, 46 mins, 1 user, load averages: 12.66 7.59 6.95
=== second run ===
load at start: 9:28  up 134 days, 46 mins, 1 user, load averages: 12.66 7.59 6.95
n = 400 timed iterations after 300 warm-up, 503 figures, limit 10
full sort of 503 (rankSectorFigures)       median 0.5676 ms | p95 0.5993 | max 0.7009 | min 0.5582
full sort + slice(0,10) both ends          median 0.5746 ms | p95 0.6074 | max 0.6385 | min 0.5627
bounded two-ended selectMovers(503, 10)    median 0.1545 ms | p95 0.1646 | max 0.2004 | min 0.1520
one bare pass reading the key (floor)      median 0.0010 ms | p95 0.0014 | max 0.0347 | min 0.0010
load at end:   9:28  up 134 days, 46 mins, 1 user, load averages: 11.88 7.52 6.92
```

**A first run was discarded** and is recorded because it is the reason the
others are not quoted alone: taken immediately after two package builds, at
load `5.39 6.49 6.49`, the full sort reported `median 0.8912 ms | p95 5.6122 |
max 100.7505`. The median moved 50% and the max by two orders of magnitude on
unchanged code, which is what a contended machine looks like and why a figure
needs a second run beside it.

**The shaping agent's figures were close on the full sort and optimistic on the
bounded one** — it reported 0.5985 ms and 0.1011 ms, so **6×**; the real ratio
is **3.7×** (0.568–0.589 against 0.155–0.160). The residue is not an
implementation slip, it is the **price of one rule**: `compareByMove` takes two
_figures_, so every comparison re-reads the ranking key and re-rounds it. A
decorate-sort-undecorate that cached `moveRankingKey` per candidate would close
most of the gap and would need a comparator over _keys_ — a second comparator,
which is the one thing this task exists to forbid. 0.155 ms on a path that runs
once per overview frame, against a 0.0010 ms floor for merely reading all 503
keys, buys nothing worth that.

### The check this task owes, and the three recorded false starts

`one-comparator-for-the-order-of-a-move`, three clauses, in
`scripts/check-invariants.mjs`. The full argument is in the check's own comment;
the short form:

**The clause is two moves either side of one operator** — a subtraction or an
inequality, with a 32-character window on each side of the operator, read line
by line. That is the analogue of `one-home-for-the-live-change`'s _division by
a close_: a second ranking over moves needs neither `compareByMove` nor
`WireOverviewFigure` nor `.sort(` (`toSorted`, a heap, a `reduce` and a
hand-rolled insertion all qualify), but every one of them has to put two moves
either side of an operator. The window is what makes
`(b.changePercent ?? 0) - (a.changePercent ?? 0)` match, and the whitespace
around the operator is Prettier's, which is a `verify` step.

**Measured over the three shipped roots, comment-stripped: the pattern matched
NOTHING at all before the home was rewritten to return a sign** — not
`sector-performance.ts`' hold (`left.at - right.at`, false start one), not
`UniverseTable.tsx` (false start two). So there is no exemption list and
therefore no escape hatch, which is false start three answered by not needing
it.

**Clause three** is the short-named-local case: a file other than the home that
calls `displayedPercent` **and** sorts. It is not `.sort(` file-level — that is
false start one — because the other half is the rounding helper's own call
sites, a population of two (this module and `sector-ladder.ts`, which takes a
magnitude and sorts nothing). **Clause one** is the cheap half: one declaration
each of `compareByMove` and `selectMovers`, in the home.

#### The transcript of it passing wrongly

`apps/backend/src/market-movers.ts` was written first — the file Task 4.5.4
would write if nothing forbade it, reading the move through the documented
`moveRankingKey`, `?? 0`, one full sort, `.slice` at each end, `.reverse()` for
the losers. It typechecked.

`docs/GAPS.md`'s own candidate clause — _the subtraction of two displayed
percentages_, `displayedPercent(a) - displayedPercent(b)`, permitted in one
module — was then written as the first draft and run against it:

```
$ node scripts/check-invariants.mjs
45 invariants hold.
```

with the probe in the walked population (`walked population includes the probe:
true | population size: 60`).

**Two things were wrong and the second is worse.** The next author subtracts two
_ranking keys_, not two _rounded_ ones — they have no reason to round at all,
which is the +0.004% half of the defect. And the clause **had no anchor and
could never have had one**: the home binds its two rounded figures to locals
before comparing them, so `displayedPercent(a) - displayedPercent(b)` has never
appeared in this repository. A grep that matches nothing looks exactly like a
grep that passes.

Widened to the measured pattern, the same probe:

```
1 shipped line(s) order one move against another outside the one comparator:
  apps/backend/src/market-movers.ts: (left, right) => (moveRankingKey(right) ?? 0) - (moveRankingKey(left) ?? 0),

1 of 45 invariants failed.
```

— an assertion failure with the other 44 still collecting. The probe was then
deleted and the run reported `45 invariants hold.`

#### The breaks

Two, one per clause that recognises the defect by its own means, both editing
`apps/backend/src/market-overview.ts` rather than the module the check was
written around:

- `movers-ranked-by-a-second-comparator` → clause two,
  `matched: order one move against another outside the one comparator`
- `movers-rounded-then-sorted` → clause three,
  `matched: round a percentage to the displayed precision and sort`

Both `broken → red → restored byte-identical`.

**The three breaks naming files this change edits were run against the WORKING
copy**, because `break-verify.mjs` refuses a dirty target and all three targets
are dirty here: `breadth-rounded-then-counted`, `a-figure-lands-on-the-wrong-row`
(a browser spec — `1 failed, 5 passed`) and `a-break-that-can-no-longer-land`.
All three red on their own `expect` string, all three restored byte-identical.

### Boundaries

Not the producer wiring (4.5.4). Not the population choice — it is the **503
equities**, decided at Gate 1. Not the row or the component (4.5.1, 4.5.3).

## What was found

### The rename's blast radius was smaller than either estimate

**Zero** `scripts/breaks.mjs` entries moved, as the correction said. Nine files
carry the two names: the module, its tests, `sector-ladder.ts`,
`packages/shared/src/index.ts`, `price-direction.ts` (two docblock references),
`apps/frontend/src/market/sector-performance.ts` (one import, one call, two
comments), one comment in `check-invariants.mjs`, one in
`e2e/specs/overview-sector-ranking.spec.ts`, and Task 4.5.4's own brief.

**`apps/backend/src/market-overview.ts` is NOT a caller** — the brief named it,
and it imports `rankSectorFigures` only, which is not moving. The historical
task files under Stories 4.3 and 4.4 were left alone: they record what was true
when they were written.

### The comparator now returns a SIGN rather than a difference

Not asked for, and the reason is a check two stories old. A bounded selection
has to ask _which of these two is stronger_, and with a magnitude comparator
that is `compareByMove(a, b) < 0` — which puts a `< 0` into
`sector-ranking.ts`, and `one-classifier-for-the-direction-of-a-move`'s clause
three flags **any** file that calls `displayedPercent` and compares against a
literal zero. That clause is right to: it cannot tell a comparator's sign test
from `directionOf` written out. Proven rather than argued — running
`breadth-rounded-then-counted` against the working tree reports
`1 shipped file(s) round a percentage to the displayed precision and then
compare it against zero: packages/shared/src/sector-ranking.ts`.

So the comparator returns `STRONGER` / `WEAKER` / `0`, the selection tests
`=== STRONGER`, and the arithmetic stays in one expression. It also moved the
home's own arithmetic from a subtraction to an inequality, which is what the
new check is anchored on.

## Done when

1. The generic key reader and comparator are named for a **move** rather than a
   sector, every caller and the three `breaks.mjs` entries move with them, and
   each named break still lands
2. A bounded two-ended selection exists beside the comparator, re-uses the one
   rule, and contains no `?? 0`, no second rounding and no second classifier
3. Its cost is re-measured on this machine with n, median, p95 and max, against
   the full sort it replaces
4. `docs/GAPS.md`'s second-comparator entry is **discharged** — a
   `pnpm invariants` clause with a `pnpm break`, keyed on something the
   re-implementer cannot avoid writing, with the passing-wrongly transcript
   recorded
5. `pnpm verify` green

---

## What was done — 2026-10-08

### The rename, and the brief was wrong twice

Nine files, not the three-break estimate and not the brief's caller list either.
**`apps/backend/src/market-overview.ts` is not a caller** — it imports
`rankSectorFigures` only, which is not moving. `rankSectorFigures` keeps its
name because it genuinely ranks the eleven roster; the two generic exports are
now `moveRankingKey` and `compareByMove`.

`TASK-04`'s file was updated because it is a **live instruction to the next
task**; Stories 4.3's and 4.4's task files were left standing, because they are
historical records. That is `CLAUDE.md`'s amend-live-claims rule applied to a
rename rather than to a measurement.

**A tooling trap worth the line it costs:** `sed` on macOS has no `\b`, so the
first rename pass **silently changed nothing and exited 0**. `perl -pi -e` was
the tool. Residue confirmed zero — the only surviving mentions of the old names
are in the docblock that records the rename.

### The selection, and one change nobody asked for

`selectMovers(figures, limit)` returns `{ gainers, losers }` in **one pass**.
Per figure: `moveRankingKey` → **`continue` if absent** → `directionOf` →
positive to one end, negative to the other, **`unchanged` and non-finite to
neither**. Disjoint by construction.

**The filter is before the selection and that is AC 5, not tidiness.** The
absent-key rule orders keyless figures _last_; it does not remove them, so
`slice(0, N)` would return **N arbitrary `unknown` symbols** whenever fewer than
N figures have keys — CI's store for ever, every restart, most of a weekend.

**And the filter is load-bearing for a second reason that is easy to miss.**
The losers end is the same comparator **with its arguments swapped**, which is
safe _only_ because of the filter: `compareByMove` is **not symmetric about an
absent key**, so reversing it over an unfiltered population puts the unrankable
figures **first** — the AC 5 defect by the back door. Written into the docblock.

`keepBounded` walks left past every figure the candidate is **strictly**
stronger than and stops at the first it is not, which **reproduces
`Array.prototype.sort`'s stability** — so arrival order survives a display-equal
tie exactly as in the full sort.

**`compareByMove` now returns a sign rather than `other - shown`**, and this was
forced rather than chosen. A bounded selection asks _which of these two is
stronger_, and with a magnitude that is `compareByMove(a, b) < 0` — which puts a
`< 0` into a file that calls `displayedPercent`, which
`one-classifier-for-the-direction-of-a-move`'s clause three flags. **Proven
rather than argued** by running the existing break:

```
1 shipped file(s) round a percentage to the displayed precision and then compare it against zero:
  packages/shared/src/sector-ranking.ts
```

`Math.sign(compareByMove(…))` was rejected for the same reason — the
classifier's `SIGN_OF` clause matches it on the word _move_.

### The measurement, and a discarded run that is the most useful of the three

n = 400 timed after 300 warm-up, built `dist`, 503 figures, two reproducible
runs:

|                               | median              | p95             | max             | min             |
| ----------------------------- | ------------------- | --------------- | --------------- | --------------- |
| full sort of 503              | 0.5890 / 0.5676 ms  | 0.6230 / 0.5993 | 0.7285 / 0.7009 | 0.5697 / 0.5582 |
| full sort + `slice` both ends | 0.5852 / 0.5746     | 0.6220 / 0.6074 | 1.1672 / 0.6385 | 0.5651 / 0.5627 |
| **bounded `selectMovers`**    | **0.1599 / 0.1545** | 0.1727 / 0.1646 | 0.2737 / 0.2004 | 0.1540 / 0.1520 |
| bare pass reading the key     | 0.0010              | 0.0013          | 0.0349          | 0.0010          |

Load averages `12.66 7.59 6.95` at start and end of the pair.

**A third run was taken and discarded, and it is worth recording.** Immediately
after two package builds, at load `5.39 6.49 6.49`, the full sort reported
`median 0.8912 ms | p95 5.6122 | max 100.7505` — **the median off by 50% and the
max by two orders of magnitude, on unchanged code.** A figure taken right after
a build is not a figure.

**The shaping agent's estimate was right on the full sort (0.5985) and
optimistic on the bounded one (0.1011). The real ratio is 3.7×, not 6×** — and
the residue is **the price of one rule**: `compareByMove` takes two _figures_,
so every comparison re-reads and re-rounds the key. A decorate-sort-undecorate
caching the key per candidate would close most of the gap and would need a
comparator over **keys** — which is the second comparator this task exists to
forbid. The cost is bought deliberately.

### The check, and `docs/GAPS.md`'s own candidate was unanchorable

`one-comparator-for-the-order-of-a-move`, three clauses: one declaration each of
`compareByMove` and `selectMovers` in the home; **two moves either side of one
operator**, subtraction or inequality, with a 32-character window on each side;
and a file other than the home that calls `displayedPercent` **and** sorts.

**Clause 2 is the improvement on the brief's candidate.** The analogue of _the
division, not the type name_ is not _the subtraction of two displayed
percentages_ but **the operator with a move on each side**: a second ranking
needs neither `compareByMove` nor `WireOverviewFigure` nor `.sort(` —
`toSorted`, a heap, a `reduce` and a hand-rolled insert all qualify — but every
one of them puts two moves either side of an operator. The window is what makes
`(b.changePercent ?? 0) - (a.changePercent ?? 0)` match, which the obvious
adjacent-operand regex does **not** see, because the `?? 0` sits in between.

Measured over the three shipped roots, comment-stripped, **the pattern matched
nothing before the home was rewritten** — not `sector-performance.ts`'
`left.at - right.at` hold, not `UniverseTable.tsx`' imported `changePercent`.
**So there is no exemption list, and therefore no escape hatch**, which answers
the third recorded false start by not needing it.

### The passing-wrongly transcript, and it found something about the entry itself

The probe was `apps/backend/src/market-movers.ts` — **the file 4.5.4 would
write**: the move read through the documented `moveRankingKey`, a `?? 0`, one
full `[...figures].sort(…)`, a `.slice` at each end, `.reverse()` for the
losers. It typechecked. Against it, the first draft of the check — which was
**`docs/GAPS.md`'s own proposed clause, verbatim**:

```
$ node scripts/check-invariants.mjs
45 invariants hold.
walked population includes the probe: true | population size: 60
```

**Two things were wrong and the second is worse.** The next author subtracts two
_ranking keys_, not two _rounded_ ones — they have no reason to round at all,
which is the +0.004% half of the defect. And **the clause had no anchor and
could never have had one**: the home binds its two rounded figures to locals
before comparing, so `displayedPercent(a) - displayedPercent(b)` **has never
existed in this repository**. A grep that matches nothing looks exactly like one
that passes.

Widened, same probe:

```
  ✗ one-comparator-for-the-order-of-a-move
    1 shipped line(s) order one move against another outside the one comparator:
      apps/backend/src/market-movers.ts: (left, right) => (moveRankingKey(right) ?? 0) - (moveRankingKey(left) ?? 0),

1 of 45 invariants failed.
```

An assertion failure with the other 44 still collecting. Probe deleted →
`45 invariants hold.`

### Breaks

Two new entries, **both editing `market-overview.ts` rather than the module the
check was written around**:

```
✓ apps/backend/src/market-overview.ts broken → red → restored byte-identical.
  matched: order one move against another outside the one comparator
✓ apps/backend/src/market-overview.ts broken → red → restored byte-identical.
  matched: round a percentage to the displayed precision and sort
```

Three existing breaks name files this change edits —
`breadth-rounded-then-counted`, `a-figure-lands-on-the-wrong-row`,
`a-break-that-can-no-longer-land`. **`break-verify.mjs` refuses a dirty target
and all three targets are dirty here**, so they were run through a scratchpad
harness using the same mechanism (checksum → substitute → run → restore →
re-checksum). All three red on their own `expect` string, all three restored
byte-identical; the browser one reported `1 failed, 5 passed (10.0s)`.

### The entry is discharged

`docs/GAPS.md`'s _Nothing forbids a SECOND comparator over a figure's move_ is
struck and replaced by a one-line note naming the invariant that replaced it —
`CLAUDE.md`'s **an entry that can be made mechanical should be**.

### Gates

```
pnpm verify    40 stories files · 0 broken links · 45 invariants hold
               shared 418 · backend 1010 · frontend 1329 · process 41
               no Unhandled Errors block
pnpm --filter @marketpulse/shared test sector-ranking   29 passed (12 new)
pnpm e2e overview-sector-ranking.spec.ts                2 passed (2.8s)
```

`pnpm test:database` not run — no data-layer file touched.

### One thing left for the owner's judgement

**The file is still called `sector-ranking.ts` while two of its six exports are
generic.** Not split, as scope. Reversal trigger recorded in the module header:
_the first consumer of the move half that is in neither the sector region nor
the movers region._

## For a stakeholder — a status report, 2026-10-08

**What this was.** Giving the ranking rule a second consumer without giving the
product a second ranking rule — and discharging a `docs/GAPS.md` entry that had
named this story as its owner since September.

**What was found.** The entry's own proposed guard, written into it as the
obvious clause, **could never have worked** — not because it was too narrow but
because the thing it looked for has never existed in this repository, so it
would have reported success for ever. That was found by writing the file the
next story would write and watching the check pass.

**What was measured.** A bounded two-ended selection over 503 securities costs
**0.155 ms** against a full sort's **0.57** — 3.7× rather than the 6× estimated,
and the gap is the deliberate price of keeping one rule rather than caching keys
behind a second comparator. A third timing run, taken right after a build, was
**50% out at the median and two orders of magnitude out at the maximum** on
unchanged code, and is recorded as a caution rather than hidden.

**What shipped open.** The module's filename still says _sector_ while two of
its exports are about any move; splitting it is a later change with a recorded
condition for when it becomes worth doing.
