# Task 4.8.7 — `marketDateAt` reads the formatter three times and uses one

**Status:** Complete — 2026-10-09
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

## What was done — 2026-10-09

### The repair, in one module and three functions

`packages/shared/src/market-time.ts`, nothing else, no API change:

- **`marketDateFromParts(parts)`** — the parts-to-date assembly, extracted. One
  home, and both callers go through it.
- **`marketOffsetFromParts(instant, parts)`** — the offset, from parts already
  read. The exported `marketOffsetAt` is now a one-line wrapper that reads them.
- **`marketDateAt`** = `marketDateFromParts(wallClockParts(instant))`. One parts
  read, no offset.
- **`marketWallClockAt`** shares the one read with both helpers, so the whole
  wall clock fell from **three** `formatToParts` calls to **two** — the second
  being the offset formatter's own, which asks for a different field and cannot
  be collapsed into the first.

### The measurement, before and after, on one harness

A throwaway Node instrument over **`packages/shared/dist`** — the artefact both
apps consume — against 518 distinct instants one minute apart, three arms
**A/B/A/B per burst**, with 4.8.1's calibrator (2,000,000 `Math.sqrt`, band
1.6×) sampled beside every burst and `readMachineLoad` taken from the shipped
harness. `n = 400` timed after **300** warm-up. **Deleted**; its figures and the
one frame worth quoting are here.

| over 518 instants, tight loop                 | p50 before   | p50 after    | p95 before | p95 after | n       |
| --------------------------------------------- | ------------ | ------------ | ---------- | --------- | ------- |
| **`marketDateAt`** (the subject)              | **3.366 ms** | **1.288 ms** | 3.425      | 1.356     | 398/400 |
| `marketWallClockAt` (control, and a dividend) | 3.365 ms     | 2.176 ms     | 3.423      | 2.263     | 398/400 |
| a local one-parts-read implementation (arm B) | 1.246 ms     | 1.245 ms     | 1.290      | 1.309     | 398/400 |

**−61.7%**, and arm B is the proof the figure is the algorithm rather than the
run: a hand-written one-parts-read date in the instrument's own process read
**1.246 ms before the change and 1.245 after**, and the repaired `marketDateAt`
landed within **3.5%** of it. A second after-run gave **1.311 ms** p50
(n = 395, 5 / 400 discarded), so the run-to-run spread is ~2%.

Calibrator: tight reference **1.025 ms** before and **1.053 ms** after, band
`[0.66, 1.70]` and `[0.75, 1.92]`, **2 / 400** discarded in each — the same
machine either side. Load ratio 0.259 before, 0.568 after, both under the 1.0
ceiling, unraised. The maxima (3.627 before, 1.685 and 10.704 after) are the
machine and are not quoted as the measurement.

**The call count, which is what the figure is of.** Instrumented by patching
`Intl.DateTimeFormat.prototype.formatToParts` around 518 conversions:

```text
before: formatToParts calls for 518 marketDateAt: 1554 (3.00 per answer)
after:  formatToParts calls for 518 marketDateAt:  518 (1.00 per answer)
```

### The gap, and the one instrument artefact that reads as a product cost

Task 4.8.3's finding 6 says a Node figure taken at a gap is inflated by the
machine waking rather than by the computation, so the pair was taken again at a
**250 ms** gap with the calibrator re-referenced **at that gap**:

```text
gap 250 ms   tight calibrator reference 1.078 ms   local reference 3.979 ms (3.69x tight)
before: marketDateAt p50 8.989   after: marketDateAt p50 3.822   (control marketWallClockAt 10.096 -> 6.899)
```

**The ratio is gap-invariant and the absolutes are not**: 2.70× tight,
2.35–2.69× gapped, against a calibrator that itself inflated 3.7×. **No figure
in this task is a production cost.**

**And the first version of the gapped run was wrong in a way worth recording.**
At a non-zero gap the **first arm sampled after the sleep absorbs the wake
cost**: unrotated, the before-arm read **8.989 ms** while the
`marketWallClockAt` control — strictly dearer work — read **10.096 ms** in the
same burst, and at gap 0 the two were identical to 0.001 ms. A/B/A/B per burst
is not sufficient on its own; the arm order has to **rotate** per burst. Handed
to 4.8.8 as an instrument rule.

### No rendered string changes — proved at two levels, not reasoned

**Level 1 — the function, exhaustively.** The old implementation was read with
`git show HEAD:packages/shared/src/market-time.ts`, run through Node's own type
stripping, and compared with the built new one over every instant worth asking
about. Four comparisons per instant — `marketDateAt`, `marketWallClockAt` and
`marketOffsetAt` deep-equal, plus the date against the composite it used to be:

```text
compared 3,470,240 instants (525,600 every minute of 2026, 2,592,000 every second
of thirty DST-transition-weekend days, 352,640 hourly 2000-2040 and
per-millisecond at ET midnight)
three functions each, 4 comparisons per instant.
no disagreement, on any instant, for any of the three functions.
```

Thirteen point nine million comparisons, zero disagreements. Every rendered
string downstream is a function of those three answers, which is why this level
is the one that generalises.

**Level 2 — the text a reader is handed, before and after.** A throwaway
`afterEach` was added to the frontend's `setupFiles` (second in the array, so it
reads the DOM before Testing Library's `cleanup`) recording, for **every one of
the 1,392 frontend tests**, the test's full name and `main`'s text — the whole
body where a test rendered no landmark — whitespace-collapsed. **516 of the
1,392 states hold text, 188,425 characters of it.** Seven whole runs: three with
the old `dist` and four with the new.

The only mask applied is `HH:MM:SS ET`, which is `AppHeader`'s **live** market
clock and ticks once a second by design. Masked, sorted:

```text
before2  vs after    : 0 differing lines      before   vs before2  : 2 differing lines
before2  vs after2    : 0 differing lines      before   vs before3  : 2 differing lines
before2  vs after3    : 0 differing lines      before2  vs before3  : 0 differing lines
before2  vs after4    : 0 differing lines      after    vs after2   : 0 differing lines
before3  vs after[1-4]: 0 differing lines      after3   vs after4   : 0 differing lines
```

**Eight of the twelve cross-implementation comparisons are byte-identical over
all 1,392 dumps.** The four that are not share one line, and **its variance is
reproduced inside the old implementation**: `before` differs from `before2` and
`before3` — all three the _same_ code — on exactly that line, which is
`SecurityExplorer.test.tsx :: renders the universe as a table…` carrying
_"A newer answer is on its way."_ in the chart and volume descriptions. It is
the stale rail while a newer request is in flight, i.e. a race against the
moment the dump is taken; it appeared in **1 of 3** old runs and **0 of 4** new
ones, and no new run produced text no old run produced.

**Level 3, for completeness:** `pnpm test`, `pnpm test:process`,
`pnpm test:database` and `pnpm e2e` all green — the gates below. The frontend
and backend suites assert rendered and wire strings in the thousands.

### The check, the draft that passed wrongly, and the break

`pnpm invariants`' **`market-date-reads-the-parts-once`** — four clauses, each
made to fire:

1. the **offset path** inside `marketDateAt`'s own body
   (`marketWallClockAt` / `marketOffsetAt` / `marketOffsetFromParts` /
   `getOffsetFormatter` / `offsetFormatter`);
2. **exactly one** `wallClockParts(` call in that body, counted;
3. `marketDateAt` **and** `marketWallClockAt` both assembling through
   `marketDateFromParts` — one home for the arithmetic;
4. the **anchor**: `wallClockParts` still exists by that name, or the ban is
   green against anything.

The body is extracted by **paren-matching the parameter list first**, so a
destructured parameter's `{` cannot be mistaken for the body's opening brace —
`CLAUDE.md`'s recorded brace-matcher defect from Task 4.2.1.

**The draft that passed wrongly, per `CLAUDE.md`'s 2026-09-26 rule.** The file
the next author writes was applied first — the delegation restored, nothing else
touched — and the draft check was a **file-level** grep asserting
`market-time.ts` declares and calls `marketDateFromParts`:

```text
$ pnpm invariants
$ node scripts/check-invariants.mjs
50 invariants hold.
```

Green on the exact defect it was written to forbid, because `marketWallClockAt`
still calls the helper: a file-level grep cannot see **which** function does,
and the whole defect is which one. Body-scoped, against the same file:

```text
$ pnpm invariants
$ node scripts/check-invariants.mjs
Invariants that no longer hold:

  ✗ market-date-reads-the-parts-once
    `marketDateAt` reads the market formatter's parts exactly once and computes no UTC offset — it is not `marketWallClockAt(instant).date`, which is three `formatToParts` calls for one answer — and the assembly it shares with `marketWallClockAt` has one home.
    `marketDateAt` routes through the offset path — `marketWallClockAt`. A market date does not depend on the UTC offset in effect, and computing one costs two extra `Intl.formatToParts` calls per answer that are then thrown away: 1,554 calls for 518 conversions, 3.37 ms against 1.29 ms over 518 instants, 93% of the overview join and 518 calls a tick in the browser's table.

1 of 50 invariants failed.
```

**One** of fifty failed with the other forty-nine collected and held, which is
the red that proves a check rather than a parse error that fails loudly and
certifies nothing. The other three clauses were each produced the same way — two
`wallClockParts` calls naming nothing banned, `marketWallClockAt` assembling the
date itself again, and `wallClockParts` renamed away — and each printed its own
sentence.

**The break** is `the-market-date-takes-the-offset-path-again` in
`scripts/breaks.mjs`, substituting the delegation:

```text
$ pnpm break the-market-date-takes-the-offset-path-again
Breaking packages/shared/src/market-time.ts
  $ pnpm invariants
✓ packages/shared/src/market-time.ts broken → red → restored byte-identical.
  matched: routes through the offset path
```

**And a behavioural twin, because the structural check reads text rather than
behaviour.** `market-time.test.ts` gained _"asks the platform for one parts read
per answer, not three"_ — a spy on `Intl.DateTimeFormat.prototype.formatToParts`
asserting **1** for `marketDateAt` and **2** for `marketWallClockAt`, with the
first call outside the spy because the formatters are memoised lazily.

### Epic 14's premise was false, and the correction travelled upward the same day

`epic-14-performance-scale-validation/EPIC.md` said this path _"constructs one
`Intl.DateTimeFormat` per entry per batch."_ Instrumented by patching the
constructor over **2,590** calls (5 batches × 518):

```text
Intl.DateTimeFormat constructions for 5 batches x 518 = 2590 marketDateAt calls: 2
```

**2 for the life of the process.** The cost was never construction; it was the
two discarded parts reads. A **dated amendment** sits beside the claim, with the
before/after figures and a note that the minute-keyed cache is still that epic's
candidate, still declined, and now worth 1.29 ms rather than 3.4.

### The cache, still not taken

Unchanged from the brief and from the owner's Gate 1 disposition: no module-level
mutable state was added. The repair is a computation **removed**.

### Handed sideways, into the sibling's own file

- **Task 4.8.8** — the candidate shrank 62%, clause B's arithmetic should be
  re-done against 1.29 ms rather than 3.4, Epic 14's `Intl`-construction premise
  is false and amended, the cache's value changed while its cost did not, and the
  gapped-instrument arm-rotation rule.
- **Task 4.8.10** — three live figures about the join that are now historical
  (the 6.6 µs per call, the 3.497 / 3.72 ms per-batch joins taken with the dear
  version underneath, and `CLAUDE.md`'s dated 0.118 → 3.497 widening), with
  **re-measure rather than subtract** stated, plus the new guard to name beside
  §28's figures.

### The gates, all three, because this changes a module both apps depend on

```text
$ pnpm verify
All matched files use Prettier code style!
42 components, 42 stories files.
16 backend variables documented, frontend example clean.
513 documents, 1703 cross-file links, 39 anchor links, 0 broken.
50 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:  Test Files  22 passed (22)
packages/shared test:       Tests  438 passed (438)
apps/backend test:  Test Files  50 passed (50)
apps/backend test:       Tests  1025 passed (1025)
apps/frontend test:  Test Files  86 passed (86)
apps/frontend test:       Tests  1392 passed (1392)
apps/backend test:process:  Test Files  2 passed (2)
apps/backend test:process:       Tests  41 passed (41)
EXIT 0

$ pnpm test:database
apps/backend test:database:  Test Files  6 passed (6)
apps/backend test:database:       Tests  211 passed (211)
EXIT 0

$ pnpm e2e
  16 skipped
  230 passed (3.8m)
EXIT 0
```

`grep -n "Unhandled" ` over all three logs returns **nothing** — the exit code
is not what was read.

**And the first `pnpm verify` of this task failed, at `format:check`, on the
hand-off table written into Task 4.8.8's file.** Worth recording only because
of how it was found: the command was `pnpm verify > log; echo $?` in a
background job, and the harness reported **exit 0** for the compound while the
log's last line read `[ELIFECYCLE] Command failed with exit code 1`. `CLAUDE.md`'s
_read the output, never only the exit code_ applies to the shell wrapper as well
as to a test runner.

### What this does not prove

- **Nothing here is a production figure.** Both columns are tight-loop Node
  figures on a laptop; the gapped pair above and 4.8.3's finding 6 are why.
- **The join was not re-measured.** This task measured the function, not the
  producer. 4.8.8 and 4.8.10 own that, and it is stated in both their files.
- **No deployed surface was watched.** The acceptance property is that nothing
  changed, which is the one claim a watch cannot add to.

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
