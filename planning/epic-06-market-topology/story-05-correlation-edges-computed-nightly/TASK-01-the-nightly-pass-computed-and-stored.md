# Task 6.5.1 — The nightly pass, computed and stored

**Status:** **Complete — 2026-11-06.** The planned canonical-order constraint
— `check (security_low_id < security_high_id)` — was WRONG and was replaced:
ticker order and id order are different orders on the deployed store, so that
check would have failed the nightly pass on real data while passing on every
store anybody would have tested it against. Found by a `pnpm test:database`
fixture that inserts securities in reverse-ticker order on purpose.
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** nothing (this story depends on 6.2, not on any task in 6.4)

## Objective

Until this task runs, `relationships` is a name in `PRODUCT_SPEC.md` §30 and
nothing else — no table, no pass, no coefficient anywhere in this product. This
task is the whole backend half: a new pair-keyed derived table, a nightly
computation that produces it, and the cost measurement AC 7 demands before it
is scheduled. Nothing downstream (the route, the renderer) can start without
the table this task writes.

## What the user can see when this lands

Nothing. The pass runs in `backfill.yml` and writes rows nobody reads yet.
Task 6.5.2 is what makes any of this visible.

## Work

- **A new ADR** for the pair-keyed derived-relationship family: the canonical
  pair order (on **ticker**, not `security_id` — CI's store and the deployed
  store assign ids in different orders, so an id-ordered key would silently
  canonicalise differently between them), the stored top-N as a **selection**
  (Story 4.5's rule, union construction per STORY.md's resolved Open Decision
  1), and how a refused security propagates to every pair it would have
  formed. Cite ADR 0044 for the nightly/session-keyed mechanism rather than
  re-arguing it.
- **Dated amendments, in the same change:**
  - ADR 0044 — this family gains a member that is not per-security, and two of
    its stated properties do not carry over: the per-security pass's bounded
    resident set, and full resumability on a mid-pass crash (see below).
  - ADR 0045 — the tape lives on the pass row, not in the correlation row's
    key (unlike `volume_baselines`), because nothing about this computation
    carries a pending reversal trigger the way the live/baseline tape choice
    does; record the known, accepted bias this choice carries (see the
    `docs/GAPS.md` note below) rather than silently absorbing it.
  - `PRODUCT_SPEC.md` §30 — `relationships` as a generic table is deliberately
    not built; this story builds `return_correlations` instead, and the
    reasoning (a `kind` column would force every future relationship kind's
    columns nullable) goes beside the amendment.
  - `compute-baselines.ts`'s own header — its stated resident-set invariant
    ("the pass's resident set is one security's window rather than the
    universe's") becomes false the moment this task accumulates a return
    vector per security across the loop. State the real peak figure once
    measured, not just the fact that it changed.
- **Migration**: `return_correlations` (one row per retained pair, canonical
  ticker order, the coefficient, the counted overlap `n`, the window/lookback
  parameters applied) + `return_correlation_passes` (the pair-grain and
  security-grain populations, nested and checked in the database per `0014`'s
  own pattern — a security-grain refusal removes ~500 candidate pairs at a
  stroke, and the pass row's arithmetic must express that rather than report
  one undifferentiated `refused` count).
- **Computation**, inside `compute-baselines.ts`'s existing per-security loop:
  accumulate each security's 5-minute return vector (a by-product of the
  60-session window the pass already reads — no second read of `market_bars`)
  rather than discarding it; after the loop, compute all eligible pairwise
  coefficients in memory; apply the split guard's propagation (a security the
  guard refuses forms no pairs at all, counted once in security space, never
  once per lost pair); derive the minimum-overlap floor via Fisher-z for a
  _ranking's_ precision, not borrowed from Story 5.3's `n ≥ 2500` (that bound
  is about an integer percentile's last digit and does not transfer); apply
  the union-of-each-node's-top-N selection; canonicalise storage order on
  ticker.
- **No landmark node, ever.** The 501 active equities are the candidate
  population; the eleven sector SPDRs, the four proxies and the hub form no
  correlation pair under any circumstance — asserted on the producer, not
  merely absent from today's fixtures.
- **AC 7 — the cost**, measured and recorded verbatim: wall-clock for the
  pairwise phase in isolation and for the whole pass, against `backfill.yml`'s
  real timeout budget (state the share consumed, not the figure alone), and
  peak RSS (the accumulated-vectors resident set this task's own ADR amendment
  above names). A one-off instrument, run and recorded and deleted, in this
  repository's own idiom — quote at least one frame or row verbatim, because
  the instrument will not survive to be re-run.
- **AC 8 — the producer-level selection tests**: the whole retained array
  compared against a hand-written literal (not `length === N`, not
  `toContain`); same-reference checks against the input candidates (catches a
  producer that reconstructs rather than selects); the union-recoverability
  property (a node's own top-N is exactly its retained rows sorted and
  truncated); a declared, tested tiebreak for exact ties; the input-array
  immutability check. Register the break (`the-strongest-n-is-a-selection` or
  similar) in `scripts/breaks.mjs` in the same change, and confirm — per this
  repository's own hard-won rule — that any pass-through wire assertion stays
  green on the planted defect before confirming the producer check goes red.
- **`pnpm test:database` coverage**: `observed_at` has no default on either
  table; the canonical-order constraint is _driven_, not merely read off the
  DDL (attempt the reverse orientation and confirm it is refused); no
  self-pair; no row touching a landmark; the populations nest and a
  non-nesting write is refused; a re-run converges (upsert, not append); the
  pass row is written last and bounds what a reader may trust.
- **`docs/GAPS.md`**: the known, accepted bias — a thinly-traded security's
  pairwise coefficients attenuate toward zero because its 5-minute grid is
  sparser, biasing the ranking against exactly the securities a reader can
  least independently verify — named with an owner and a re-measure condition,
  not silently absorbed into the derivation above.

## Done when

1. `return_correlations` and `return_correlation_passes` exist, are written by
   `pnpm baselines`, and are empty-but-present on a bare store (CI's
   permanent state).
2. The producer-level selection tests pass, the break is registered and
   proven to go red, and `pnpm test:database` is green.
3. AC 7's cost figures are recorded verbatim in this task's own record, with
   the resident-set and wall-clock numbers stated against their real budgets.
4. The new ADR exists; the four dated amendments are in place; `pnpm links`
   and `pnpm invariants` are clean.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

## What was done

### The files

**New:**

- `packages/shared/src/return-correlation.ts` — the vocabulary **and** the
  arithmetic: `CORRELATION_LOOKBACK_SESSIONS` (a **re-export** of
  `BASELINE_LOOKBACK_SESSIONS`, never a second sixty),
  `CORRELATION_MINIMUM_OVERLAP = 4`, `CORRELATION_CONFIDENCE_Z = 1.96`,
  `CORRELATION_REFUSALS`, `pearsonCorrelation`, `correlationIsSignificant`.
  Pure and total; no clock, no handle, no socket.
- `packages/shared/src/return-correlation.test.ts` — 20 tests.
- `apps/backend/migrations/0018_return_correlations.sql` — `return_correlations`
  - `return_correlation_passes`, nine numbered sections.
- `apps/backend/src/return-correlation-store.ts` — the writer. No read method
  at all, deliberately: nothing reads these rows until Task 6.5.2.
- `apps/backend/src/return-correlation-selection.ts` —
  `selectStrongestCorrelations`, pure.
- `apps/backend/src/return-correlation-selection.test.ts` — 12 tests, AC 8.
- `apps/backend/src/return-correlations.database.test.ts` — 24 tests.
- `docs/adr/0049-a-derived-relationship-is-keyed-by-a-canonical-pair-and-the-stored-top-n-is-a-selection.md`

**Amended:**

- `apps/backend/src/return-baseline.ts` — `baselineReturnSeries`, a documented
  **sibling** of `baselineSamples` rather than a refactor of it.
- `apps/backend/src/return-baseline.test.ts` — five tests for it, including
  that it finds exactly the pairs `baselineSamples` finds.
- `apps/backend/src/schema.ts` — two Kysely interfaces, both registered.
- `apps/backend/src/compute-baselines.ts` — the accumulation inside the loop,
  `computeCorrelations` after it, `RETAINED_N = 5`, `CorrelationTally`, three
  summary lines, `describeRetainedCorrelations`, and the **dated amendment to
  its own module docblock**.
- `scripts/breaks.mjs` — `the-strongest-n-keeps-the-weakest`.
- `docs/adr/0044-…` — dated amendment (the tenth and eleventh tables; two
  stated properties that do not carry over).
- `docs/adr/0045-…` — dated amendment (where the tape lives; the attenuation
  bias it does not address).
- `planning/PRODUCT_SPEC.md` §30 — dated amendment (`relationships` is
  deliberately not built).
- `docs/GAPS.md` — the attenuation-bias entry, with an owner and a re-measure.
- `docs/adr/README.md` — the index row.

### AC 7 — the cost, measured with a control arm

Run against **this developer's populated local store** (48,797,343 bars, 60
sessions ending 2026-09-11), through a throwaway instrument inside
`compute-baselines.ts` that was removed after the figures were taken. The
control arm is the same pass with **one line changed** — the
`seriesOf.set(subject.symbol, series)` accumulation removed — and nothing else.

| Figure                      | With the phase | Control  |
| --------------------------- | -------------- | -------- |
| RSS at pass start           | 79.2 MB        | 79.1 MB  |
| RSS entering the pairs      | **750.5 MB**   | 324.4 MB |
| peak RSS                    | **750.5 MB**   | 324.5 MB |
| whole pass (in-process)     | **38.87 s**    | 17.06 s  |
| pairwise phase alone        | **15.25 s**    | 0.01 s   |
| series held                 | 496            | 0        |
| `pnpm baselines` wall clock | 39.336 s       | 17.476 s |

So the phase's **added** wall clock is **21.81 s** and its **added** resident
set is **426.1 MB**. Of the 21.81 s, **15.25 s** is the pairwise walk over
122,760 candidate pairs and the remaining **~6.6 s** is `baselineReturnSeries`
building 496 maps inside the loop.

**Against the real budget**, read off `.github/workflows/backfill.yml` rather
than quoted from memory: the `baselines` job carries **`timeout-minutes: 90`**
(5,400 s). The whole pass is **38.87 s = 0.72%** of it; the added cost is
**21.81 s = 0.40%**; the pairwise phase alone is **0.28%**.

**The peak is reached BEFORE the pairwise phase and does not move during it** —
750.5 MB entering, 750.5 MB at the end — which is the design's own claim
measured rather than asserted: the phase allocates nothing per pair.

**The shaping's estimate of 10–20 MB for the accumulated series was 21–43×
low.** A `Map<number, number>` of ~4,000 entries costs far more than its
8-bytes-an-entry payload, so an estimate taken from the data's own size is not
an estimate of a `Map` of it.

**Migration cost:** `pnpm migrate` applied `0018` in **0.397 / 0.37 / 0.35 s**
end to end over three runs on the same populated store — two `create table`s
and one expression index over zero rows, against `deploy.yml`'s `timeout 120`.

**Every figure above is LOCAL — one laptop, one store, one run per arm, a warm
page cache, nothing deployed.** This repository's standing caveat applies
without exception.

### The real pass's own summary lines, verbatim

Quoted from stdout of `pnpm baselines` against that store, with the final
migration applied:

```
return correlations on sip for 2026-09-11 — tracked 501 equities, eligible 496, split-refused 5, no series 0 (no pair formed)
correlation pairs — 1860 retained of 122760 computed of 122760 candidate; 0 too few overlapping samples, 0 zero variance, 20752 below significance (a cut, not a refusal), at N = 5
retained correlations — |r| 0.090–0.990, n 466–4620 (mean 4004), 1532 of 1860 same-sector (82.4%)
```

And the rows, read back out of the store:

```
 rows | generations
------+-------------
 1860 |           1

 retained_pairs_count | candidate_pairs_count | below_significance_count | retained_n | feed
----------------------+-----------------------+--------------------------+------------+------
                 1860 |                122760 |                    20752 |          5 | sip
```

A second `pnpm baselines` over the same window left **1,860 rows and one
generation** — the upsert converges on the real store, not only in the
database test.

### Five findings, in the order they matter

**1. The planned canonical-order constraint was wrong, and only a hostile
fixture could show it.** `check (security_low_id < security_high_id)` is
incompatible with canonicalising on **ticker**, because ticker order and id
order are different orders: `securities.id` is assigned in row-insertion order,
and the deployed store already held `PSKY` and `WBD` while CI never inserts
them at all. That check refuses every ticker-canonical pair whose two ids run
the other way — a nightly pass failing on real data — and it **passes on every
store whose securities were inserted in ticker order**, which is every store
anybody would reach for. The database test's fixture inserts `CCCC`, `BBBB`,
`AAAA` in that order precisely so the two disagree, and it refused the first
legitimate row the store wrote.

The replacement is a backstop that does not need the ticker order at all: a
unique index on
`(observed_at, least(security_low_id, security_high_id), greatest(…))`, which
refuses the **reverse orientation of a stored pair** whichever column each id
sits in, plus `check (security_low_id <> security_high_id)` for the self-pair
(`least(a, a) = greatest(a, a)` is a perfectly good unique key). Verified
against PostgreSQL 18 on a scratch database **before** the file was written —
expression indexes need immutable expressions. The ticker rule itself stays in
the writer, which throws naming it.

**2. `no_series_count` does not exist, because it is unreachable.** The task
file asked for the column and asked to say so if it turned out unreachable. It
is: the accumulation gates on the price outcome's own `measured` arm, and that
arm is returned only when the sampler found at least one grid pair over the
**same anchors** `baselineReturnSeries` walks. So _eligible for general reasons
but with too few grid points for a series_ cannot occur, and the real pass
confirms it — `no series 0`. A column that can only ever hold `0` reads to the
next author as a real population that happens to be empty, so the migration
header records the argument instead.

**3. The nesting's `computed ≤ candidate` conjunct is implied and cannot be
reached on its own** — found by planting it, not by reading. A write with
`computed = candidate + 1` goes red naming
`return_correlation_passes_pair_refusals_partition`, because two non-negative
counts summing to `candidate − computed` already force the inequality. The
conjunct is kept (free, states the chain a reader expects, stops being implied
the day that partition is relaxed) and the **assertion was rewritten against
the clause it can actually reach**, rather than keeping a transcript that
certified the wrong constraint.

**4. The single-pass Pearson form costs 2 ulps on a definitional case, and the
test says so.** A perfectly linear pair comes out at `0.9999999999999998`
rather than `1` — a residual of `2.22e-16`. The centred two-pass form is exact
here and is **not** what ships: it needs a second intersection walk or two
arrays allocated per pair, 125,250 times a pass, to move a figure stored in a
`numeric(18, 6)` column (where it rounds to `1.000000`), ranked by magnitude,
and compared against a significance floor of 0.029 at best. The tolerance is
asserted at 12 decimal places with the residual quoted, because
`toEqual({ r: 1 })` would be asserting something the implementation does not
do and `toBeCloseTo`'s default of two places would assert almost nothing.

**5. Open Decision 4's own question is answered, and the answer is the one that
would be uncomfortable: 82.4% of the retained set is SAME-SECTOR.** That
decision asked this pass to measure and report the share, and said in as many
words that _if that share is near 100%, the edge layer is mostly restating the
clustering the membership edges already draw rather than adding the
cross-cluster information this story's own "what the user can see" promises._
**1,532 of 1,860.** It is not 100% — 328 retained pairs cross a sector boundary
and those are the edges that carry information the membership layer does not —
but it is high, and it is a Gate 2 conversation rather than something this task
should decide. One figure, one store, one session; it belongs in Story 6.5's
own close beside whatever Task 6.5.3 measures about `N`.

### What nobody has seen, and what is owed

**No gated machine will ever draw one of these rows.** CI's store has 516
securities and **zero bars**, so every equity is `absent`, no pair is formed,
`candidate_pairs_count` is `0` and both tables are **empty but present** —
permanently. That is `pnpm store:bare`'s shape and it is the permanent state of
the only machine that gates a merge.

**And nothing reads these rows on any machine.** There is no route, no renderer
and no reader: Task 6.5.2 builds the first. So the usual _confirm the
pass-through wire check stays green on the plant_ step has no subject — the
check that would be green on the defect **does not exist yet**, which is the
strongest form of _the wire cannot see a defect in the producer_.

**No person has checked a single coefficient against anything.** The inputs are
60 sessions of a table no browser reads, and the only external check that will
ever exist is somebody with a public correlation screen. Nothing in this task
establishes that any of the 1,860 pairs is right **about the market**.

### A follow-up this task did not take

**A fourth comparator sibling is arguably owed and was not written.** This
repository holds three invariants of the same shape —
`one-comparator-for-the-order-of-a-move` (keyed on `percent|change|move`),
`…-of-a-percentile` (`.rank|ordinal|percentile`) and `…-of-a-composite-score`
(`.score`) — and a correlation's `|r|` ordering matches **none** of their
patterns, which is ADR 0043's lesson a fourth quantity over. The break
`the-strongest-n-keeps-the-weakest` covers the one comparator that exists
today; what is not covered is a **second** one written somewhere else. It is
not built here because scope discipline says so and because the condition for
building it is clear: **the first shipped file outside
`return-correlation-selection.ts` that orders one coefficient against
another** — most likely Task 6.5.2's reader, recovering a node's own top-N from
the stored union, which is exactly the shape that would write the comparator a
second time.

### Gates

Every command run from the repository root on 2026-11-06, with a local
PostgreSQL up (`pnpm db`).

| Gate                                 | Result                                                             |
| ------------------------------------ | ------------------------------------------------------------------ |
| `pnpm typecheck`                     | green                                                              |
| `pnpm lint`                          | green (`--max-warnings 0`)                                         |
| `pnpm format` / `format:check`       | green                                                              |
| `pnpm links`                         | `637 documents, 2012 cross-file links, 39 anchor links, 0 broken.` |
| `pnpm invariants`                    | `81 invariants hold.`                                              |
| `pnpm verify`                        | **exit 0**, `skipped 0`, no `Unhandled Errors` block               |
| — `packages/shared` tests            | `Tests 687 passed (687)`                                           |
| — `apps/backend` tests               | `Tests 1361 passed (1361)`                                         |
| — `apps/frontend` tests              | `Tests 1818 passed (1818)`                                         |
| — `test:process`                     | `Tests 60 passed (60)`                                             |
| `pnpm test:database`                 | **exit 0**, `Test Files 14 passed (14)`, `Tests 408 passed (408)`  |
| `pnpm migrate` (populated store, ×3) | `Applied 1 migration.` in 0.397 / 0.37 / 0.35 s                    |
| `pnpm baselines` (populated store)   | exit 0, 1,860 rows + 1 pass row; a second run converged            |

**`pnpm e2e` was NOT run, and that is in scope**: this task touches no frontend
file, adds no route and changes no rendered byte. Nothing in the browser suite
can reach any of it.

### The break — proved in the order `CLAUDE.md` asks for

`the-strongest-n-keeps-the-weakest` reverses one subtraction in
`compareForNode`, so every node keeps its **weakest** five correlations.

**Step 1 — the checks that stay green on the plant (confirmed, not assumed):**

```
pnpm typecheck   green
pnpm lint        green
pnpm --filter @marketpulse/backend test:database src/return-correlations.database.test.ts
                 Tests  24 passed (24)
```

The rows are well-formed, canonically ordered, individually correct and refused
by no constraint in `0018`; only the **set** is wrong. `pnpm invariants` does go
red, and it proves nothing — it fails on `every-break-can-still-land`, because
the plant replaces the line the registry's own `find` names. Read **which**
invariant failed.

**Step 2 — the producer test goes red, and on the right assertions:**

```
× is the union of each node's own top 2, in canonical order
× keeps each node's single strongest at N = 1
× returns the same object references it was given
× recovers an ASYMMETRIC node's exact top 2 from the stored union
× recovers every node's top N, for every N, with no redundant row
× breaks a tie on the OTHER endpoint's ticker, ascending
  Tests  6 failed | 6 passed (12)

AssertionError: expected [ 'AAA-CCC 0.8', 'AAA-DDD -0.7', …(3) ] to deeply
  equal [ 'AAA-BBB 0.9', 'AAA-CCC 0.8', …(3) ]
AssertionError: AAA at N = 1: expected [ 'AAA-DDD' ] to deeply equal [ 'AAA-BBB' ]
```

Six assertion failures with six tests still passing, which is the only red that
proves anything — not a parse error, not a run that died.

**Step 3 — the tree restored**, `Tests 12 passed (12)`, `81 invariants hold.`

**A first draft planted the missing CUT instead and was withdrawn on its own
transcript.** `ordered.slice(0, n)` → `ordered` makes the parameter `n` unused,
so `pnpm lint` catches it at `return-correlation-selection.ts:108:3` with
`'n' is defined but never used` — the break would have gone red for a reason
that is **not** the defect, which is _red for the wrong reason reads exactly
like proof_. The arithmetic it was written around is kept in the registry,
because it is what the cut is worth: 122,760 − 20,752 = **102,008 retained**
against **1,860**, a 55× edge layer.

**A second companion plant was proved by hand in the same sitting** — deleting
`fileUnder(candidate.high, candidate)`, which is "top N per node" written by
somebody who did not notice a pair has two ends. Five of twelve red, including
`expected [ 'BBB-DDD', 'CCC-DDD' ] to deeply equal [ 'AAA-DDD', 'BBB-DDD' ]`
on the asymmetric-union test. So the two plants are caught by **different**
assertions.

**`pnpm break the-strongest-n-keeps-the-weakest` was run after committing**, as
noted above was owed: `break-verify.mjs` refuses a dirty target and the
selection module was a new, uncommitted file at the time this was first
written. See the Review section below for the real run.

### Review, and three small corrections before this was committed

A second developer instance reviewed every file this task touched that the
orchestrator had not already personally verified (the store, the database
test file, the new ADR, and all five dated amendments). Verdict: no
correctness defect anywhere. Three precision nits, fixed in this same change
rather than carried forward:

1. `return-correlation-store.ts`'s `writeCorrelations` docblock claimed its
   return value was **measured** when it is in fact **argued**: it returns
   `retained.length` — the writer's own count of what it was asked to write —
   never a read-back of PostgreSQL's own affected-row count. The figure is
   still trustworthy (an `on conflict … do update` affects every supplied
   row, a within-batch duplicate pair raises loudly rather than
   short-writing, and the input already arrives de-duplicated), but the
   comment overstated how that trust was established. Corrected to say so
   plainly, in a repository whose own standing rule is "a tolerance is
   measured, never argued."
2. ADR 0049 §4 quoted "125,250 candidates against a retained set of 1,860" in
   one sentence — conflating the theoretical full-universe figure with the
   measured run's real one (122,760 candidates, 496 eligible equities).
   Corrected to name both figures and which is which.
3. The database suite asserted `observed_at` has no default by reading
   `information_schema` alone, which is sound but not **driven** — this
   repository's own stricter standard for a constraint that matters. Added a
   test that attempts an insert omitting the column on both tables and
   asserts the real rejection, on both `return_correlations` and
   `return_correlation_passes`. 408 database tests now pass, not 407.

Two findings the review raised and judged NOT to need a fix: the landmark
exclusion test asserts over `equityTickers()` rather than through the pass's
own call chain (one indirection short of the migration's literal "asserted on
the producer" wording, but the link was hand-verified and holds today); and
the new break's `replace` deletes its own `find` line, which 145 of 205
existing registry entries already do and which a single-expression
replacement line cannot avoid syntactically.

**`pnpm break the-strongest-n-keeps-the-weakest` was then run for real**,
after this change was committed:

```
✓ apps/backend/src/return-correlation-selection.ts broken → red → restored byte-identical.
  matched: is the union of each node's own top 2, in canonical order
```

With the plant applied: `pnpm typecheck` green, `pnpm lint` green,
`return-correlations.database.test.ts` 24/24 green (the rows are
well-formed and refused by no constraint; only the **set** is wrong, which
is the strongest form of "the wire cannot see a defect in the producer" —
at this task's stage nothing reads these rows at all). `pnpm invariants`
does go red, on `every-break-can-still-land` rather than on anything that
catches the defect, because the plant replaces the exact line the
registry's own `find` names — the registry's self-check reporting the
break, not a guard catching it. `pnpm break` restored the file
byte-identically and `pnpm invariants` read 81 of 81 immediately after.

## For a stakeholder

**Nothing is visible, and that is the plan.** The product's market graph
currently draws which sector a company belongs to. This task computes, every
night, **which companies actually move together** — a 60-session correlation of
five-minute returns over every pair of the 501 tracked equities, 122,760 pairs —
and stores the strongest few per company so a later task can draw them.

Three things are worth a stakeholder's attention.

**It is sparse on purpose.** Of 122,760 pairs, **1,860** are kept. A pair is
dropped if the two companies did not trade at enough of the same minutes to
measure anything, and dropped again if the relationship we measured is not
strong enough to be distinguishable from chance **given how much data that
particular pair had**. There is no round threshold anywhere; the bar moves with
the evidence, so a thinly-traded pair has to clear a much higher bar than a
liquid one.

**It costs 22 seconds a night**, against a 90-minute budget — 0.4% of it —
measured against a control run rather than estimated.

**And one finding is a question for the Product Owner, not an answer.** 82% of
the relationships we keep join two companies **in the same sector**. That is
not nothing — 328 of them cross sector boundaries and those are the surprising
ones — but it means the new edge layer will mostly reinforce the grouping the
graph already shows. Whether that is worth the ink, or whether the drawn set
should favour cross-sector relationships, is a design decision owed before the
edges are drawn.

**What nobody has checked:** no person has verified a single one of these 1,860
numbers against an outside source, and the machine that gates our merges has no
market data at all, so it will never draw one. Both are written down with
owners.
