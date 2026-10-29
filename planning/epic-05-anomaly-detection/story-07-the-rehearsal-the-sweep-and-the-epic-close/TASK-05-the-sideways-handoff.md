# Task 5.7.5 — The sideways hand-off, and the seventh data point

**Status:** **Complete — 2026-10-29. THE COUNT IS 10 MISSING OF 13 WALKED**, making the record 1, 6, 3, 6, 2, 8, **10**. The worst miss is an explicit `Owner: Epic 14` line — the shape the prescribed grep finds most easily — unpropagated since 2026-10-14. And **four of the ten are recipients that are not epics**, so they have no `Handed here by` convention for anything to fill.
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

A constraint one story measures for another lives in a document the **owning**
story does not own, and nothing about a close crosses that boundary. The record
of previous runs reads **1, 6, 3, 6, 2, 8**; the walk at Gate 1 makes it
**1, 6, 3, 6, 2, 8, 7**.

**Seven missing of ten recipients walked.** The point of the number is the
shape, not the score.

## What the user can see when this lands

**Nothing.**

## Work

Write each missing constraint into the recipient's **own** file, in words that
story can act on — never a link back, because a pointer is what a reader follows
when they already know to look, and the whole failure is that they do not.

- **Epic 7 — PRESENT but POISONED, so it counts missing.** Both named
  constraints are there and correct. But `EPIC.md:219` carries the quiet-day
  falsehood as a product-integrity claim (Task 5.7.3 corrects it; do not collide),
  and `:208-213` tells Epic 7 to _expect to find already written_ four functions
  — `calculate_return_percentile`, `calculate_volume_ratio`,
  `get_market_breadth`, `compare_securities`. **Verified: zero implementations.**
  The two matches for the first are comments quoting the spec. The shipped names
  are `returnPercentileOf`, `excessFactorAnswer`, `volumeFactorAnswer`,
  `compositeAnomaly`, `scoreAnomaly`, `excessMoveReference` — and
  `calculate_volume_ratio` has no implementation producing a rankable ratio at
  all, because the volume factor is a stated absence. Give Epic 7 the real names.
- **Epic 9 — the chart's lane geometry.** Story 5.1's canvas first drew the
  anomaly lane _below_ the plot, in the band `--chart-filing-lane: 14px` already
  occupies; the correction moved it to a 16 px lane inside the plot's top
  padding. The decision is in `VISUAL-LANGUAGE.md:1057-1081` and Story 5.6's
  `STORY.md:388` — neither is a document Epic 9 reads. `grep` for `lane` in its
  `EPIC.md` returns nothing.
- **Epic 13 — `0015`'s tape in the key.** Epic 13's existing section glosses the
  family as "all four keyed by the session it is FOR with its window-end column
  named `observed_at`". `0015_volume_baselines.sql` is `unique (security_id,
observed_at, feed)` — **the only table in the family where the tape is a key
  column**, and its own migration comment says the tape choice carries a reversal
  trigger and can flip. A plugin narrowing `observed_at` covers the temporal half
  and leaves the replay with no stated rule for which tape to read. Epic 13 has
  **no section from Story 5.5 at all**.
- **Epic 14 — Story 5.2's explicit `Owner: Epic 14` line.** `story-02-…/STORY.md:266-268`:
  arm 2's calibrator inflation is non-monotonic in the gap (2.75–3.26× at 8,824 ms
  against 18.0–19.4× at 3,727 ms) and gap and order were confounded. Unpropagated
  since 2026-10-14. **This is the worst miss in the set** — it is the shape the
  prescribed grep finds most easily, and it bears on the 2.29×-against-4.38× pair
  `CLAUDE.md` cites as authority that the calibrator does not divide out.
- **`planning/EPICS.md`** — a second home for the exit criterion that missed
  Task 5.5.5's correction. Task 5.7.3 writes the rewrite; record here that the
  recipient has no `Handed here by` convention and so nothing fills it.
- **`PRODUCT_SPEC.md` §9 and §12** — Task 5.7.4 amends them; recorded here
  because they are recipients rather than merely stale documents.
- **`SecurityExplorer.tsx`** — the recipient is the shipped product and the
  reader is a user. Task 5.7.4 changes it.
- **Epics 10, 11, 12 and 15 are named ZERO times in Epic 5.** Not scored as
  misses because no constraint was found and then lost, but three look real and
  are judgement calls to take in writing rather than by silence. **Epic 10** is
  where a model first touches these numbers, and the brand on `AnomalyScore`
  **dies at `JSON.parse`** — the only thing between an LLM and an invented score
  across that boundary is `readAnomalyScore` re-adding the published
  contributions, which is invariant 1's strongest mechanism and Epic 10's file
  does not know it exists. **Epic 11** is the listening pass's deadline and Epic 5
  added three unanswerables. **Epic 12** is not told Epic 5 added five derived
  tables (`0013`–`0017`).

**Record the count and the shape.** Four of the seven are recipients that are
**not epics** and therefore have no `Handed here by` convention — but Epic 14's
miss refutes the comfortable reading of that, because it is an explicit `Owner:`
line in a `STORY.md`. The transferable lesson, which Story 5.6's own close
already stated: the hand-off that travels is the one written **where the
measurement was taken**, not at the close.

## Done when

1. Each of the seven is written into its recipient's own file in actionable words.
2. The Epic 10/11/12 judgement is taken in writing, either as a hand-off or as a
   recorded decision not to make one.
3. The count — 7 of 10 — and the method are in the record, with the previous six
   data points, and the shape finding is stated.

---

## What was done — 2026-10-29

### The count: 10 missing of 13 walked

The record becomes **1, 6, 3, 6, 2, 8, 10**.

| #   | Recipient                  | Before                                                                      | Action                                 |
| --- | -------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| 1   | **Epic 6**                 | **Present and complete** — four sections, both named constraints actionable | none needed                            |
| 2   | **Epic 7**                 | **Present but POISONED** → counts missing                                   | §17's four tool names rewritten        |
| 3   | **Epic 8**                 | Present, **premise stale**                                                  | dated, three rules unchanged           |
| 4   | **Epic 9**                 | **Missing entirely**                                                        | the chart's lane geometry              |
| 5   | **Epic 10**                | **Not enumerated**                                                          | the brand's death at the wire          |
| 6   | **Epic 11**                | **Not enumerated**                                                          | three new listening unanswerables      |
| 7   | **Epic 12**                | **Not enumerated**                                                          | five derived tables, and what they are |
| 8   | **Epic 13**                | **Partially missing**                                                       | `0015`'s tape in the key               |
| 9   | **Epic 14**                | **Partially missing**                                                       | Story 5.2's `Owner:` line              |
| 10  | **`planning/EPICS.md`**    | **Missing**                                                                 | done by Task 5.7.3                     |
| 11  | **`PRODUCT_SPEC.md` §9**   | **Missing — nothing from Epic 5 at all**                                    | done by Task 5.7.4                     |
| 12  | **`PRODUCT_SPEC.md` §12**  | **Missing**                                                                 | done by Task 5.7.4                     |
| 13  | **`SecurityExplorer.tsx`** | **Missing** — the recipient is the shipped product                          | done by Task 5.7.4                     |

**Three of the ten I promoted from a note to a hand-off rather than scoring them
as judgement calls.** Epics 10, 11 and 12 are named **zero times** anywhere in
Epic 5, so no constraint was measured and lost — the usual reason to leave them
out. I wrote them anyway, because _nobody wrote it down_ and _there is nothing to
write down_ are different states and only one of them is safe. The Epic 10 one in
particular is not a courtesy; see below.

### The worst miss, and it refutes the comfortable reading of the others

**Epic 14's** was an explicit `Owner: Epic 14` line in a `STORY.md` — the shape
the prescribed grep finds **most easily** — and it sat unpropagated from
**2026-10-14 to today**. Story 5.2 measured that arm 2's calibrator inflation is
**non-monotonic in the gap**: **2.75–3.26× at 8,824 ms against 18.0–19.4× at
3,727 ms**, with gap and order **confounded** because the arms always ran
midday-then-close.

It matters beyond one arm. `CLAUDE.md` cites a **2.29×-against-4.38×** pair as
its authority for _a calibrator does not divide out_; that pair came from an
instrument since **deleted**, and `CLAUDE.md` itself records that whether part of
its 2.29× was an in-loop artefact **cannot be settled by reading**. Story 5.2's
non-monotonicity is independent evidence on the same question, and Epic 14 is the
only epic that will ever re-take it.

**So the comfortable reading — _the misses migrated to recipients that are not
epics and therefore have no convention_ — is only half true.** Four of the ten
are indeed documents and a `.tsx` with no `Handed here by` section for anything
to fill. But Epic 14's is the easiest possible target and it still did not
travel. The transferable rule is Story 5.6's own: **the hand-off that travels is
the one written where the measurement was taken**, not at the close. Story 5.2
wrote its at its close.

### Epic 7's was PRESENT and actively misleading, which is worse than absent

Its file tells Epic 7 that four quantities are _"quantities Epic 5 computes …
you should expect to find them already written"_, naming
`calculate_return_percentile`, `calculate_volume_ratio`, `get_market_breadth`
and `compare_securities`.

**Verified: none of the four exists.** `grep -rl` over `apps/` and `packages/`
finds the first in exactly two files and **both are comments quoting the
spec**; the other three return **nothing** from any source file, test or `e2e/`.
Epic 7 would have opened its own file, searched for four functions, and found
none — this rule's own failure with the arrow reversed.

The six that do exist are now named with their modules and signatures, read from
the files rather than guessed — and two accuracy notes are stated rather than
smoothed: **`compare_securities` has no single backend equivalent at all**
(`relativePerformance` is a **frontend** function), and `marketBreadth` exists
**twice**, so the section names the backend one.

**And one is not a naming difference.** `calculate_volume_ratio` has **no
implementation that produces a rankable ratio for any security**:
`volumeFactorAnswer()` takes **no parameters** and returns
`{ state: "no-distribution" }` unconditionally, because `0015` stores a median
and a dispersion rather than a distribution. `CompositeInput` has **two members
for three factors**. An investigation tool contract written around _how unusual
is this volume_ has nothing to call, on any store, today.

### Epic 10's is the one I would not have written as a courtesy

Epic 10 is where a model first touches these numbers, and it is **the first
boundary Epic 5's strongest guarantee does not cross**. The module says so
itself: _"The brand dies at `JSON.parse` … the type survives the process and not
the socket."_

What replaces it is stronger and is the thing to design a tool layer around:
`readAnomalyScore` **re-adds the published contributions and refuses the whole
explanation when the sum is not the score it was sent**. A fabricated score does
not fail a type check it was never subject to — it **fails arithmetic**.

And the warning Epic 10 most needs is one Epic 5 proved by **experiment**: Story
5.4 planted a producer that invented an `NVDA` row, and **both frame-derived
browser arms were green on the fabricated row**. Only an arm grounded outside
the frame saw it. An agentic layer is a pass-through by construction, so a check
asking _does the page agree with what the model was given_ is **green on a model
that invented the figure**.

### Epic 9's was invisible to its own grep, and the token does not exist

Story 5.1's canvas first drew the anomaly lane **below the plot**, in the band
`--chart-filing-lane: 14px` already occupies — **Epic 9's own space** — and the
correction moved it to a 16 px lane inside the plot's top padding. The decision
lived in `VISUAL-LANGUAGE.md` and a Story 5.6 file, **neither of which Epic 9
reads**, and `grep -n "lane\|marker\|rail"` on Epic 9's file returned nothing.

One thing found while writing it: **`--chart-anomaly-lane` does not exist
anywhere**. The 14 px filing lane is a real token spent as `margin-top` in both
plot stylesheets; the 16 px anomaly lane is **reserved by prose only**, and the
token is owed by whoever draws first. Recorded there rather than asserted as
existing.

### Epic 13's gloss hid the one property that breaks a plugin

Its existing section describes ADR 0044's family as _"all four … keyed by the
session it is FOR with its window-end column named `observed_at`"_.
`0015_volume_baselines.sql:326` is `unique (security_id, observed_at, feed)` —
**the only table in the family where the tape is a key column** — and
`volume_baseline_passes` carries `unique (observed_at, feed)` too. A plugin
narrowing `observed_at` covers the temporal half and leaves a replay with **no
stated rule for which tape to read**, on a table whose own migration comment
says the tape choice carries a reversal trigger and **can flip**. The decision
Epic 13 has to take is stated as a choice — pin the tape at every read, or grow
the plugin a second dimension — with ordering-as-tie-break named as **not** an
option.

### Gates

```
pnpm format:check  All matched files use Prettier code style!
pnpm links         600 documents, 1909 cross-file links, 39 anchor links, 0 broken.
```

**No source file was touched** — no `.ts`, `.tsx`, `.css` or `.sql` — so no
build, test or browser run is owed by this task, and none was run. Said rather
than assumed. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are AC 7's,
once on the final tree.

## For a stakeholder — a status report, 2026-10-29

When one piece of work measures something another piece of work will need, the
note has to end up in the second one's own paperwork — because a link is only
followed by somebody who already knows to look, and the whole failure is that
they do not. This repository has tracked how often that fails, once per epic:
**1, 6, 3, 6, 2, 8**. Epic 5's number is **10 of 13**.

The worst one is worth stating plainly because it defeats the easy excuse. Most
of the misses were notes aimed at documents rather than at epics, and documents
have no standard place to receive them — fair enough. But one was a note that
named its recipient explicitly, in the most findable possible form, and it still
sat unmoved for a fortnight. It concerns a measuring instrument this repository
quotes as authority elsewhere, on evidence that can no longer be checked because
the instrument was deleted. The only reliable rule is that the note has to be
written **where the measurement was taken**, at the moment it is taken.

One hand-off was worse than missing: it was **present and wrong**. The epic that
builds investigations is told to expect four specific functions to exist
already. None of them does, one of them cannot exist at all on today's data, and
it would have gone looking before finding that out.

And one was written that nobody had asked for. The epic where an AI model first
touches these numbers had no note at all — and it turns out the strongest
guarantee this product has about a score, that it cannot exist without its
explanation, **stops working the moment the number crosses a network
connection**. What replaces it is actually better, but only if the next epic
knows to use it. It now does.
