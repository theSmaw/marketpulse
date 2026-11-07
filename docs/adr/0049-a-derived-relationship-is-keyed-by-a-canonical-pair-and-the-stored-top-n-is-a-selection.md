# 0049 — A derived relationship is keyed by a canonical pair, and the stored top-N is a selection

**Status:** Accepted
**Date:** 2026-11-06
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](../../planning/epic-06-market-topology/story-05-correlation-edges-computed-nightly/STORY.md), Task 6.5.1

## Context

`PRODUCT_SPEC.md` §10's second relationship is _strong historical return
correlation_, and it is the first edge in this product that says something the
curated universe does not already know. Until Story 6.5 the topology's edges
are **memberships** — a security belongs to a sector, a sector belongs to the
market — which is a curated fact drawn as a line. A correlation is a
**measurement**.

[ADR 0044](0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
already settles the mechanism: a derived aggregate too expensive for any
request path is computed by a nightly runner, persisted in a table keyed by the
session it is **for**, with `observed_at` taking no default and a companion
`*_passes` row counting what the pass saw. **This ADR does not re-argue any of
that**, and `0018_return_correlations.sql` instantiates it. What it records is
the three things 0044's five existing members do not have to answer, because
every one of them is keyed by **one security**:

- **The key is a pair.** 501 active equities is **125,250 unordered pairs**, and
  an unordered pair has two representations.
- **The stored set is a selection.** §10: _"to avoid an unreadable graph, the
  system should retain only the strongest N relationships per node."_ So the
  rows are a cut of the candidates rather than a measurement of each subject.
- **A refused security propagates.** The split guard refuses a security, and
  that one refusal removes **~500 candidate pairs at a stroke**.

## Decision

### 1. The canonical order is on the TICKER, never on `security_id`

An unordered pair is stored **once**, as a single row whose `security_low_id`
holds the security whose **ticker** sorts lexicographically lower.

**The ticker and not the id, and the reason is a fact about this deployment
rather than a preference.** `securities.id` is
`bigint generated always as identity`, so it is assigned in **row-insertion
order** — and the two stores this product runs disagree about that order. CI
builds its store into an empty database from the curated file; the deployed
store has been accumulating rows since 2026-09-08 and already holds `PSKY` and
`WBD`, which CI never inserts at all (`CLAUDE.md`: _the two stores disagree
about the row count and both are right_). So a security curated later carries a
higher id than a security whose ticker sorts after it, and an id-ordered key
canonicalises `(AAPL, MSFT)` one way on one store and the other way on the
other — **with every row well-formed and every constraint satisfied on both**.
A ticker is a curated, stable, store-independent identity, and `UNIVERSE.md` is
its home.

**And the obvious database backstop for this — `check (security_low_id <
security_high_id)` — is WRONG, which was found by driving it rather than by
reading it.** Ticker order and id order are different orders, so that check
refuses every ticker-canonical pair whose two ids happen to run the other way:
a nightly pass failing on real data, in a file that reads as though the
writer's rule and the constraint agree by construction. It passes on any store
whose securities were inserted in ticker order, which is every store anybody
would reach for. Task 6.5.1's own `pnpm test:database` fixture inserts three
securities in reverse-ticker order precisely so the two disagree, and that
fixture refused the first legitimate row the store wrote.

**What stands instead is a backstop that does not need to know the ticker order
at all:** a unique index on
`(observed_at, least(security_low_id, security_high_id), greatest(…))`, which
refuses the **reverse orientation of a pair already stored** whichever column
each id sits in — plus a `check (security_low_id <> security_high_id)`, because
a security's correlation with itself is `1` by construction and would be the
strongest edge on every node, and `least(a, a) = greatest(a, a)` is a perfectly
good unique key.

**The ticker rule itself is the writer's and cannot be the database's.** A
constraint expressing it would have to join `securities` twice inside a
`check`, which PostgreSQL does not permit and which would be a per-row join on
a nightly write. It lives in one function in `return-correlation-store.ts`,
which throws on a pair handed in the wrong ticker order, with a producer-level
test beside it.

### 2. The stored top-N is a SELECTION, and the reading is the UNION

**A node's top-N is not symmetric.** `A`'s strongest five may not include `B`
even where `B`'s strongest five include `A` — so §10's _retain the strongest N
relationships per node_ under-specifies the drawn set by roughly a factor of
two. **Union, stored once**: a pair is retained if it is in **either**
endpoint's own top-N.

Each node's exact top-N is **fully recoverable** from the stored union, with no
redundant row and no nullable rank column: filter the retained rows touching
that node, sort by `|r|` descending, take `N`. That is correct by construction,
because every member of a node's own top-N is in the union by the definition of
a union.

**And it is a selection in Story 4.5's exact sense, which is what makes it
checkable.** `selectMovers`/`moveRankingKey` established the rule at the row
grain — _a top-N is a SELECTION, not a reduction_ — and
`selectStrongestCorrelations` returns **the same object references** it was
handed: it constructs no row, rounds no coefficient, re-derives no overlap and
renames no field. So ordering, uniqueness and membership are checkable from the
candidates, by **object identity**, which is the only level at which the claim
can be made: a producer that rebuilt each row is indistinguishable downstream
from one that selected it, and equally indistinguishable from one that silently
changed a figure on the way through. The division Story 4.5 drew is kept —
`pearsonCorrelation` and `correlationIsSignificant` are the quantity's and live
in `packages/shared`; the **cut** is a drawn surface's and lives beside the pass.

**The tiebreak is declared and tested: `|r|` descending, then the OTHER
endpoint's ticker ascending.** A comparator answering `0` for a tie delegates
the answer to the array's arrival order, which here is a nightly pass's pair
enumeration order — not a fact about the market — and
[ADR 0041](0041-a-ranked-surface-re-orders-under-live-data.md) forbids a ranked
surface re-ordering with nothing having changed.

### 3. A refused security forms NO pair, and is counted once in security space

The split guard (ADR 0047) refuses a security whose window crosses an
unadjusted price break — **5 of 516** on the real store. That security forms
**no correlation pair at all**, and the pass counts it **once**, in security
space, rather than once per each of the ~500 pairs it would have joined.

This is why `return_correlation_passes` carries **two population chains at two
grains** rather than one undifferentiated `refused` count:

- **security grain, a PARTITION** — `eligible + split_discontinuity + absent =
tracked`
- **pair grain, a NESTING** — `retained + below_significance ≤ computed ≤
candidate`, with `candidate = C(eligible, 2)` and the two pair-grain refusals
  partitioning the `candidate − computed` gap

Both arithmetics are `check` constraints, so a pass that died mid-phase writes a
row the database refuses rather than a row whose counts quietly do not add up.

**`below_significance` is a CUT and not a refusal**, which is why it sits
outside the refusal partition. _We could not measure this_ and _we measured
this and it is not distinguishable from zero_ are different facts with
different repairs — Story 5.5's hand-off item 3, one grain over.

### 4. A refused pair is NOT a row, which diverges from 0044's earlier members

`return_baselines` and `excess_move_baselines` make a refusal a **row**,
because _the pass has not reached this security_ and _the pass reached it and
will not answer_ are different facts and only the second is safe to stop
retrying. At the pair grain that argument is outweighed by arithmetic: the
candidate population is the theoretical **125,250** at 501 equities and was
**122,760** on the store this decision was measured against (496 eligible,
five split-refused), against a retained set of **1,860** — so storing a
refusal each would make the table roughly **sixty-six times larger than its
own content** on that run, and the order-of-magnitude argument holds at either
figure, about a fact that is uniform across tens of thousands of pairs and
derivable from the two securities' own stored `sample_count`s. The counts go
on the pass
row, which is `0014` §4's rule arriving at a new grain.

## Consequences

**A graph that joins only the row table under-reports and looks correct**,
which is Story 6.5's AC 5 in one sentence and is sharper here than for any
earlier member of this family: counting rows answers _how many edges did we
draw_ and says nothing whatever about how many pairs were considered, refused
or cut. The companion pass row is not a convenience.

**`N` is provisional and the table says so.** Story 6.5's Open Decision 1
settled the **mechanism** and deferred the **figure** to Task 6.5.3's own
measurement of readability and frame rate against the real elliptical ring. The
working default is 5 — 501 nodes × 5 is 2,500 edge slots, inside
`PRODUCT_SPEC.md` §28's _several thousand edges_, where 20 is not — and it is
stored on every pass row as `retained_n`, so two generations computed under two
values of it are tellable apart without re-reading the code that wrote them.
Changing it is a **recompute**, which both tables are labelled for.

**The directed form is rejected with a condition rather than on taste.** Two
rows per pair, each carrying that pair's ordinal within one endpoint's own
ranking, costs roughly double the rows for a per-node rank nothing today asks
for. **Reversal trigger, a condition:** _the first surface that must state a
node's own rank among its neighbours_ (_"your 2nd-strongest partner"_).

**The tape is on the row and NOT in the key**, which is where this diverges
from `volume_baselines`.
[ADR 0045](0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md) §3's
rule is about _a tape choice that carries a reversal trigger_, and the whole of
its force is in that clause — Story 5.5's Gate 1 chose a same-tape `iex`
baseline **with a stated trigger**, so a flip against a session-only key would
have rewritten every row with nothing recording the change. Nothing about this
computation carries such a trigger: both legs of every pair are read on the one
tape `BASELINE_FEED` names, in the read the price baseline already issues, and
a correlation of returns is the quantity ADR 0045 decision 1 calls
**intensive** — scale-free, so it survives the two tapes disagreeing about how
much of the market they saw. See that ADR's own 2026-11-06 amendment, which
also records the attenuation bias this choice does **not** address.

**The key leads with `observed_at`, which no sibling does.** Every read of this
table is _every retained pair of one session_, as one bounded set, because an
edge layer is meaningless one edge at a time — the opposite shape from the
per-security tables' _newest pass, then every row of it_ two-step. There is
deliberately **no index on `security_high_id`**, so _every edge touching one
security_ is a scan and nothing issues that read today; the condition for
adding one is **the first reader that asks for one node's edges without reading
the whole generation**.

**Two of ADR 0044's stated properties do not carry over to this member.** The
bounded resident set and full resumability both fail for the pairwise phase; see
that ADR's 2026-11-06 amendment and `compute-baselines.ts`'s own, which carry
the measured figures.

**What a green check certifies.** `pnpm test:database` proves the shape, the
two population arithmetics, the unordered-pair uniqueness, the writer's ticker
throw and the convergent upsert, against a seeded store whose securities are
deliberately inserted in reverse-ticker order. The producer-level tests prove
the selection — the whole array against a literal, object identity, union
recoverability over an asymmetric case, the declared tiebreak on an engineered
tie, input immutability and order-independence — and the break
`the-strongest-n-keeps-the-weakest` proves those tests go red on a comparator
sign slip, which `pnpm typecheck`, `pnpm lint` and the whole database suite are
**green** on. None of it proves a single coefficient is right about the market:
that needs a person with a public chart, and `docs/GAPS.md` carries it.

## Alternatives rejected

**Canonicalise on `security_id`.** The obvious implementation, and silently
store-dependent: see decision 1. Rejected on the two stores' measured
disagreement about insertion order rather than on principle.

**Store both orientations (directed).** Rejected on cost, with a condition —
see Consequences.

**Store the intersection (mutual top-N only).** Rejected because it can leave a
node with **zero** drawn edges despite real, strong correlations, which reads on
screen as _this security relates to nothing_ — a false claim rather than a
sparse one.

**A generic `relationships` table with a `kind` column**, which
`PRODUCT_SPEC.md` §30 names. Rejected: a correlation has a coefficient and a
counted overlap, a membership has neither, so one table would force every
kind's own columns **nullable** — and the alternative, a `jsonb` bag, is the
shape `0014` §4 already argues against, because a key in a bag silently stops
being read. §30 carries a dated amendment. **Reversal trigger, a condition:**
_the third relationship kind whose columns are a subset of one already stored_.

**A chosen `|r|` threshold** — `|r| ≥ 0.5` or similar. Rejected by Story 6.5's
AC 4, which forbids exactly that number, and by the arithmetic: at `n = 4,620`
the 95% Fisher-z floor is **0.029** and at `n = 4` it is **0.961**, so one
threshold refuses real relationships in liquid names and admits noise in thin
ones — precisely the wrong way round. The floor is a function of the pair's own
counted overlap instead.

**A daily-close correlation.** Rejected at Gate 1 on precision: a 60-session
daily correlation has a Fisher-z standard error of ≈0.13 at n = 60, so a top-5
selection over it re-orders close to randomly from one night to the next, which
would make a measurement read as a judgement. The 60-session **5-minute** grid
gives n up to 4,620 and SE ≈ 0.015, and costs **no additional read of
`market_bars`** — the series is a by-product of the window the pass already
reads per security.

**Spearman's rank or Kendall's tau instead of Pearson.** Spearman throws away
the **size** of a move, making a pair that co-moves gently indistinguishable
from one that co-moves violently, in a product whose whole subject is unusual
magnitudes. Kendall's tau is O(n²) in the overlap, which at n = 4,620 over
125,250 pairs is not a cost this pass can carry. Pearson is also the statistic
the Fisher-z transform is defined for, which the significance floor rests on.

## Reversal trigger, as a condition

**The first relationship kind this product stores that is not a pair of
securities** — a triple, a directed edge with its own ordinal, or a
security-to-non-security relationship (a filing, an investigation). At that
point decision 1's canonicalisation is a rule about one shape rather than about
relationships generally, and the generic-table alternative is re-opened with
real evidence instead of a guess.

## Amended 2026-11-07 by Task 6.5.3 (the measurement) and Task 6.5.4 (the sweep) — `N` is settled, not provisional

The Consequences section above says _"`N` is provisional and the table says
so… deferred the figure to Task 6.5.3's own measurement"_ in the present
tense. That measurement has happened: Task 6.5.3 re-took the renderer's
frame rate at the real 1,860-edge generation (rAF-gap p50 unchanged at
16.7 ms against the membership-only arm, 0 frames over 50 ms on either arm)
and added a new edge-attribution probe arm finding zero misattributed
endpoints in the one genuinely crowded cluster this product has drawn
(with one honest abstention where a transform's own residual was too large
to trust). **`N` stays 5** — the working default was confirmed rather than
changed. `STORY.md`'s Open Decision 1 carries the full measurement; this
amendment exists because the Consequences text above, `schema.ts`,
`return-correlation-store.ts` and `return-correlation-selection.ts` all
described the figure as still pending, which stopped being true the day
the measurement ran. All four sites are corrected in this same sweep
(Task 6.5.4).

## Amended 2026-11-07 by Task 6.5.4 — the partition is FOUR-way, not three, and the fourth bucket is the largest one

Decision 3 names three ways a candidate pair ends: refused, cut on
significance, or retained. **A real fourth way exists and is correctly
implemented but nowhere named as a figure**: computed, significant, and
simply not in either endpoint's own top-N. On the real generation this is
the largest bucket by far — `122,760 candidate − 20,752 below-significance
− 1,860 retained = 100,148` pairs, **81.6% of every candidate considered**,
cleared the significance floor and were never drawn because neither
endpoint's own strongest five reached them.

**This is not a defect.** `computeCorrelations`'s own docblock already
states the four-way account correctly (_"significant — of which the
selection keeps the union of each node's own top-N and the rest are
simply not retained"_), and `return_correlation_passes_pairs_nest`'s own
`check` is deliberately an **inequality** (`retained + below_significance
≤ computed`) rather than an equality, precisely because this fourth
bucket's size is not something the schema asserts a value for. The
arithmetic above is also a useful corroboration rather than only a gap:
496 eligible nodes × 5 nominations = 2,480 nominated slots, and the union
retained exactly 1,860 — which forces exactly 620 mutual pairs and 1,240
one-sided ones (620 × 2 + 1,240 = 2,480), and means **every eligible
node's own top-5 was full of significant candidates** — the significance
test is not the thing binding the drawn set, the top-N is, by a wide
margin.

**What is missing is a name for the fourth bucket, not a repair.** No
column holds it; the only way to see it is the subtraction above, and
nothing in the pass's printed summary, the accessible sentence, or this
story's own record states it as a figure. A reader of `STORY.md`'s
resolved Open Decisions could reasonably come away believing the
partition is three-way, which understates by a wide margin how selective
`N = 5` actually is. Recorded here rather than fixed with a schema change
— a derived figure printed in the pass's own summary line (`computed −
below_significance − retained`) would close this without a migration, and
is left as a condition rather than taken now: **the first task that
prints or stores the pass's own summary again** (Story 6.7's live-update
work is the likely next toucher of this path) should add it.
