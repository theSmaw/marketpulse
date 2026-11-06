-- 0018_return_correlations — the 60-session pairwise correlation of 5-minute
-- returns between two equities, stored only for the pairs a top-N per node
-- retains, plus one row per pass recording the populations at BOTH grains
-- (Task 6.5.1).
--
-- **These are the schema's TENTH and ELEVENTH derived tables, and the FIRST
-- keyed by a PAIR** — counting as ADR 0044's own amendments do (`0013` one,
-- `0014` two and three, `0015` four and five, `0016` six and seven, `0017`
-- eight and nine). Every derived table before them — `0013`, `0014`, `0015`,
-- `0016`, `0017` — is one row per security per session. This one is one row per
-- *unordered pair of securities* per session, and that single difference is
-- what every judgement in this file is downstream of: 501 active equities is
-- **125,250 unordered pairs**, so the first question is not how to draw them
-- but which ones to keep.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision these inherit, **instantiated rather than extended** on
-- every point but the key's grain: computed nightly in `backfill.yml` after
-- the fill, keyed by the session it is FOR, window-end column named
-- `observed_at` with no default, companion `*_passes` row. ADR 0049 is the
-- decision that is new here — the canonicalisation rule, the stored top-N as a
-- selection, and how one refused security propagates to ~500 pairs at a
-- stroke. `0016_excess_move_baselines.sql` is the file whose structure this one
-- follows; where this diverges it says so and why.
--
-- **It is an EMPTY-TABLE migration**, so none of the arithmetic that governs a
-- change to `market_bars` binds: no heap pass, no validated constraint, no
-- rewrite. Two `create table`s on new relations is what `deploy.yml`'s
-- `timeout 120` sees, and the unique constraints build their indexes over zero
-- rows. **And there is no `ALTER TABLE` on `market_bars`, on `securities`, or
-- on any earlier derived table, ever** — `market_bars` has a live writer
-- running once a minute for six and a half hours a day inside the deploy
-- window (`live-bar-writer.ts`), and Task 3.7.6 measured an `ACCESS EXCLUSIVE`
-- migration waiting **18.16 s** behind one open write transaction with an
-- ordinary chart read waiting **16.16 s** behind *it*, against a 0.09 s
-- baseline. The two foreign keys below take `SHARE ROW EXCLUSIVE` on
-- `securities` to install their triggers, which conflicts with neither a
-- read's `ACCESS SHARE` nor a child insert's `ROW SHARE` — `0012` §1 has the
-- full argument.
--
-- ============================================================================
-- 1. DERIVED AND RECOMPUTABLE — SAID HERE, IN `schema.ts`, AND IN THE ADR
-- ============================================================================
--
-- **Recompute command: `pnpm baselines`.** Dropping every row in both tables
-- below loses nothing that cannot be rebuilt from `market_bars`, and the
-- nightly job in `.github/workflows/backfill.yml` rebuilds the newest
-- generation on its own the following night.
--
-- Said in three places for `0013` §1's reason: a table nobody has labelled is
-- a table the next reader treats as primary, and would then migrate rather
-- than delete and re-run. **Changing `N`, the significance level, the overlap
-- floor, the window, the grid stride, the tape, the candidate population or
-- the canonicalisation rule is a recompute here** — and the first of those is
-- not hypothetical: Story 6.5's Open Decision 1 explicitly defers the figure
-- for `N` to Task 6.5.3's own measurement, so the first thing that will happen
-- to this table is that every row in it is thrown away and recomputed under a
-- different `N`.
--
-- ============================================================================
-- 2. `observed_at` IS THE WINDOW'S END, AND IT TAKES NO DEFAULT
-- ============================================================================
--
-- `observed_at` is the **last session close of the window the correlations
-- were computed over** — supplied by the writer, every time.
--
-- **No default, and that is `0002`'s decision 3 rather than a style**:
-- `default now()` on this column silently turns *when it was true in the
-- market* into *when we wrote it*, on the one column a replay keys on, and
-- every row would look plausible. The name is `observed_at` **deliberately**,
-- diverging from ADR 0042's `effective_from`, for the reason `0014`, `0015`
-- and `0016` all state: Epic 13's temporal plugin narrows `observed_at`
-- generically, so a column named anything else would need that epic to know
-- this table exists. `recorded_at` is the other half and it **does** default,
-- because it is when we wrote it.
--
-- ============================================================================
-- 3. THE PAIR IS CANONICALISED ON TICKER, AND THE BACKSTOP IS NOT A `<` CHECK
-- ============================================================================
--
-- **This is the section with no precedent in any earlier file.** An unordered
-- pair has two representations and Story 6.5's AC 2 is explicit that *deciding
-- by accident gives a graph with half its edges*. The decision: **one row per
-- pair, canonically ordered on TICKER by the writer, with the database
-- refusing a second row for the same unordered pair.**
--
-- **The canonicalisation is on TICKER, never on `security_id`.** This is the
-- one place where the obvious implementation is wrong in a way no test on one
-- store can see. `securities.id` is `bigint generated always as identity`, so
-- it is assigned in **row-insertion order** — and the two stores this product
-- runs disagree about that order: CI builds its store into an empty database
-- from the curated file, while the deployed store has been accumulating rows
-- since 2026-09-08 and already held `PSKY` and `WBD`, which CI never inserts
-- at all (`CLAUDE.md`: *the two stores disagree about the row count and both
-- are right*). An id-ordered key would therefore canonicalise
-- `(AAPL, MSFT)` one way on one store and the other way on the other, with
-- every row well-formed and every constraint satisfied on both. A ticker is a
-- **curated, stable, store-independent** identity, and `UNIVERSE.md` is its
-- home.
--
-- So the writer resolves the pair as *the lexicographically lower ticker is
-- `security_low_id`'s security*.
--
-- **And `check (security_low_id < security_high_id)` is NOT the constraint
-- below, because it would have refused legitimate rows on the deployed
-- store.** This is worth spelling out, because it is the obvious
-- implementation and it is wrong for exactly the reason this section exists.
-- Ticker order and id order are **different orders**: `CLAUDE.md` records that
-- the deployed store already held `PSKY` and `WBD` while CI never inserts them
-- at all, so a security curated later carries a higher id than a security
-- whose ticker sorts after it. A `<` check therefore refuses every
-- ticker-canonical pair whose two ids happen to run the other way — a nightly
-- pass failing on real data, with the file reading as though the two rules
-- "agree by construction". They do not, and nothing on one store can show it:
-- on a store whose securities were inserted in ticker order the two orders
-- coincide, and every row passes.
--
-- **What is below instead is a backstop that does not need to know the ticker
-- order at all:** a unique index on
-- `(observed_at, least(low, high), greatest(low, high))`, which refuses the
-- **reverse orientation of a pair already stored** whichever column each id
-- sits in. That is the real guarantee the `<` check was reaching for — *one
-- row per unordered pair per session* — expressed in the only vocabulary the
-- database has. Plus `return_correlations_no_self_pair`, because a security's
-- correlation with itself is `1` by construction and would be the strongest
-- edge on every node.
--
-- **The ticker rule itself is the writer's, and cannot be the database's.** A
-- constraint expressing it would have to join `securities` twice inside a
-- `check`, which PostgreSQL does not permit and which would be a per-row join
-- on a nightly write besides. What holds it is one function in
-- `return-correlation-store.ts`, which throws on a pair handed in the wrong
-- ticker order, with the producer-level test beside it.
--
-- **Stored ONCE rather than twice**, which is Open Decision 1's settled
-- answer. The directed form — two rows per pair, each carrying the ordinal of
-- that pair within one endpoint's own ranking — costs roughly double the rows
-- for a per-node rank nothing today asks for, and its reversal trigger is a
-- condition: *the first surface that must state a node's own rank among its
-- neighbours*.
--
-- ============================================================================
-- 4. THE STORED SET IS A SELECTION, AND A REFUSED PAIR IS NOT A ROW
-- ============================================================================
--
-- `PRODUCT_SPEC.md` §10: *to avoid an unreadable graph, the system should
-- retain only the strongest N relationships per node.* So a row here is a pair
-- the pass **kept**, and three quite different things get no row:
--
--   - **refused** — the pair's overlap is below the floor, or a leg has no
--     variance. §5.
--   - **below significance** — a coefficient the pass computed and that is not
--     statistically distinguishable from zero at that pair's own counted
--     overlap. Open Decision 3's *no edge below a DERIVED floor*: no row, not
--     a faint one, because until Story 6.6 ships the visual encoding that
--     distinguishes a weak edge from a strong one, a weak edge is a claim the
--     data does not support.
--   - **not retained** — computed, significant, and simply not in either
--     endpoint's own top-N. This is the overwhelming majority.
--
-- **A refusal is NOT a row here, which is where this diverges from `0013` and
-- `0016`.** Those tables make a refusal a row because *the pass has not
-- reached this security* and *the pass reached it and will not answer* are
-- different facts and only the second is safe to stop retrying. At the pair
-- grain that argument is outweighed by arithmetic: there are 125,250 candidate
-- pairs and the retained set is on the order of 2,500, so storing a refusal
-- each would make the table **fifty times larger than its own content**, about
-- a fact that is uniform across tens of thousands of pairs and derivable from
-- the two securities' own stored `sample_count`s. The counts go on the pass
-- row instead, by name, which is `0014` §4's rule arriving at a new grain.
--
-- **Every node's own top-N is fully recoverable from the stored union**, with
-- no redundant row and no nullable rank column: filter the retained rows
-- touching that node, sort by `|coefficient|` descending, take `N`. That is
-- correct by construction — every member of a node's own top-N is in the union
-- by definition of a union — and it is why the union was chosen over the
-- intersection (mutual top-N only), which can leave a node with zero drawn
-- edges despite real, strong correlations and read on screen as *this relates
-- to nothing*.
--
-- ============================================================================
-- 5. THE REFUSAL ARITHMETIC IS AT TWO GRAINS, AND THAT IS THE POINT
-- ============================================================================
--
-- A security-grain refusal removes **~500 candidate pairs at a stroke**, and
-- the pass row has to express that rather than report one undifferentiated
-- `refused` count. So `return_correlation_passes` carries two population
-- chains, each closed in the database:
--
-- **Security grain — a PARTITION over the tracked equities**
-- (`return_correlation_passes_securities_partition`):
-- `eligible + split_discontinuity + absent = tracked`.
--
--   - `eligible_equities_count` — passed the split guard and produced at least
--     one grid return. This is the candidate population, and the pair count
--     below is `C(eligible, 2)`.
--   - `split_discontinuity_count` — the price pass's own verdict for the same
--     `(security, window end)`, **inherited rather than re-evaluated**, which
--     is `0015`'s and `0016`'s arrangement and `0014` §5's *the generation is
--     identified rather than copied*. It refused **5 of 516** for the
--     percentile, four on exact split factors; a 10-for-1 split is a −90%
--     "return" that would correlate with anything that moved that day.
--   - `absent_count` — no stored `sip` grid pair at all, so no series. On CI's
--     store — 516 securities and **zero bars** — this is every equity, for
--     ever, and the pass writes **no correlation row at all**.
--
-- **There is deliberately NO `no_series_count` column**, and the reason is
-- that the population it would count is **unreachable by construction**. The
-- pass gates on the price outcome's own `measured` arm, and that arm is
-- returned only when the sampler found at least one grid pair — the same walk,
-- over the same anchors, that `baselineReturnSeries` performs. So *eligible
-- for general reasons but with too few grid points for a series* cannot occur,
-- and a column for it could never be non-zero. A column that can only ever
-- hold `0` is worse than no column: the next reader reads it as a real
-- population that happens to be empty on this store.
--
-- **Pair grain — a NESTING**
-- (`return_correlation_passes_pairs_nest`):
-- `retained + below_significance ≤ computed ≤ candidate`.
--
--   - `candidate_pairs_count` — `C(eligible, 2)`, every unordered pair the
--     pass considered. Counted by the pass rather than derived by a reader,
--     because `0014` §4's rule is that a surface states its own denominator
--     and `eligible × (eligible − 1) / 2` in a browser is a second home for
--     the arithmetic.
--   - `computed_pairs_count` — cleared the overlap floor and produced a finite
--     coefficient.
--   - `retained_pairs_count` — in the union of some node's top-N **and**
--     significant. The number of rows this pass wrote.
--
-- **Pair-grain refusals PARTITION the candidate/computed gap**
-- (`return_correlation_passes_pair_refusals_partition`):
-- `too_few_overlapping_samples + zero_variance = candidate − computed`. The
-- vocabulary is `CORRELATION_REFUSALS` in `packages/shared`, and these are two
-- columns rather than a `jsonb` bag so that a third member is `0003`'s
-- drop-check/add-check pair — a migration somebody has to write — instead of a
-- key that silently stops being counted. `0014` §4's own argument.
--
-- **`below_significance_count` is a CUT and not a refusal**, which is why it
-- is outside that partition and inside the nesting: the pass computed a
-- coefficient and then declined to draw it. *We could not measure this* and
-- *we measured this and it is not distinguishable from zero* are different
-- facts with different repairs, and collapsing them would throw away the only
-- information a reader could act on — Story 5.5's hand-off item 3, one grain
-- over.
--
-- ============================================================================
-- 6. NO LANDMARK NODE — AND IT IS NOT A DATABASE CONSTRAINT, ON PURPOSE
-- ============================================================================
--
-- Story 6.5's Open Decision 4: the candidate population is the **501 active
-- equities**, same- and cross-sector pairs both eligible, and **no landmark
-- node** — the eleven sector SPDRs, the four market proxies, the hub — ever
-- forms a correlation edge. The same exclusion Story 6.3 applies to the
-- anomaly encoding, with an added reason here: `SPY` correlates with nearly
-- every equity in the universe, so admitting it (or any sector ETF) would make
-- every cluster independently discover a strong correlation to the centre,
-- which is the starburst §10's own constraint exists to prevent.
--
-- **There is no `check` for it below and there cannot be one.** Which
-- securities are landmarks is a **curated** fact — `securities.kind` is a
-- column, but *the hub* and *a market proxy* are resolved through
-- `equityTickers()` and `UNIVERSE` in `packages/shared`/`apps/backend`, and a
-- database constraint expressing it would be a second home for a curation that
-- `pnpm universe` converges. A `check` on `kind` alone would be a partial
-- restatement that looks complete.
--
-- **So it is asserted on the PRODUCER**, in `pnpm test:database`, over the
-- shipped candidate population rather than over today's fixtures — which is
-- the half that matters, because *absent from this store's rows* and *excluded
-- by construction* look identical on a store with no bars. This note is here
-- so the next reader does not go looking for a constraint that is deliberately
-- not here.
--
-- ============================================================================
-- 7. THE KEY LEADS WITH `observed_at`, WHICH DIVERGES FROM EVERY SIBLING
-- ============================================================================
--
-- `unique (observed_at, security_low_id, security_high_id)`, where `0013`,
-- `0014`, `0015` and `0016` all lead with `security_id`. The divergence is
-- justified by the read rather than by symmetry, and it is the one index
-- decision in this file.
--
-- The per-security tables are read in a **two-step**: *the newest pass at or
-- before an instant*, then *every row of that pass* — and the second step
-- benefits from nothing in a `(security_id, …)` leading column, which is why
-- `0014` §6 records the condition for adding an `(observed_at)`-leading index
-- as a reader that issues the session read at a cadence. **Every read of this
-- table is the second step and only the second step**: a graph is drawn from
-- *every retained pair of one session*, as one bounded set, because an edge
-- layer is meaningless one edge at a time. There is no read of *this pair's
-- history* and no reader asks for one.
--
-- At `N = 5` over ~501 equities the retained set is on the order of 2,500 rows
-- a session — tens of thousands a month — so the whole-generation read is a
-- range scan on the leading column rather than a scan of a small table, which
-- is the first time in this family that distinction has had a figure behind it.
--
-- **No index beyond the unique constraint, the unordered-pair backstop (§3)
-- and the pass table's own key**, which is README's rule: an
-- index chosen before there is a query to serve is a guess with a write cost.
-- In particular there is **no index on `security_high_id`**, so *every edge
-- touching one security* is a scan — and nothing issues that read today. The
-- condition for adding one is stated rather than left implicit: **the first
-- reader that asks for one node's edges without reading the whole generation**
-- (`SecurityExplorer.tsx`'s `Connected securities` region is the likely first,
-- and Story 6.5's Open Decision 5 leaves it deliberately unfilled).
--
-- ============================================================================
-- 8. THE TAPE IS ON THE PASS ROW AND NOT IN THE KEY — DIVERGING FROM `0015`
-- ============================================================================
--
-- `volume_baselines` is keyed `(security_id, observed_at, feed)` and this table
-- is not keyed on `feed` at all; the tape is recorded once per pass and once
-- per row, and never in either key. ADR 0045 §3's rule is about *a tape choice
-- that carries a reversal trigger*, and the whole of its force is in that
-- clause: Story 5.5's Gate 1 chose a same-tape `iex` baseline **with a stated
-- reversal trigger**, so a flip against a session-only key would have
-- rewritten every row with nothing recording that the meaning changed.
--
-- **Nothing about this computation carries such a trigger.** Both legs of every
-- pair are read on the one tape `BASELINE_FEED` names, in the same read the
-- price baseline already issues, and a correlation of returns is the quantity
-- ADR 0045 decision 1 calls **intensive** — scale-free, so it survives the two
-- tapes disagreeing about how much of the market they saw. There is no
-- candidate second tape to flip to and no decision pending. The column is kept
-- on the row because invariant 6 is that provenance is displayed, never
-- implied, and because `0014` §5's rule stands: what the pass applied is
-- stored, so a rollback cannot leave a runner and a reader two values apart.
--
-- **The bias this choice does NOT address is named rather than absorbed.** A
-- thinly-traded security's 5-minute grid is sparser, so its overlap with any
-- other security is smaller and its coefficients **attenuate toward zero** —
-- biasing a ranking against exactly the securities a reader can least
-- independently verify. `docs/GAPS.md` carries it with an owner and a
-- re-measure condition; ADR 0045's own 2026-11-06 amendment records it beside
-- the tape decision it travels with.
--
-- ============================================================================
-- 9. WHAT THIS FILE DELIBERATELY DOES NOT HAVE
-- ============================================================================
--
-- **No generic `relationships` table**, which `PRODUCT_SPEC.md` §30 names.
-- That name now carries a dated amendment saying why: a `kind` column over
-- membership edges, correlation edges and whatever Epics 7+ add would force
-- every kind's own columns **nullable** — a correlation has a coefficient and a
-- counted overlap, a membership has neither — and the alternative, a `jsonb`
-- bag, is the shape `0014` §4 already argues against, because a key in a bag
-- silently stops being read. This is `return_correlations`, named for the
-- quantity it holds.
--
-- **No foreign key from a correlation row to the pass row.** `0014` §6's
-- decision: the two are written in one pass and read as a pair, and the key
-- would be `(observed_at)` → a second unique constraint's worth of triggers on
-- a write path that inserts thousands of rows a night, for a relationship the
-- reader establishes by equality. What stands instead is the **reader**, which
-- reads the pass row first and the correlation rows for its `observed_at`, so
-- a session with edges and no pass row is invisible rather than half-drawn —
-- which is what a partially-failed pass leaves behind.
--
-- **No `on delete` on either foreign key**, which is `market_bars`', `0013`'s
-- and `0014`'s decision: the database refuses a delete that would orphan a
-- correlation rather than cascading it away. Nothing in this repository
-- deletes a security.
--
-- **No `updated_at`.** A re-run of the same session UPDATES both rows, and
-- `recorded_at` already answers *when we wrote what is there now* — for a
-- derived row, "when we wrote it" and "when we last wrote it" are the same
-- question.
--
-- **No rank ordinal and no `jsonb` of a node's neighbours.** §4: the union is
-- recoverable, so an ordinal would be a derived figure with a second home and
-- would go stale the moment `N` changes, which Story 6.5's own Open Decision 1
-- guarantees it will.

create table return_correlations (
    -- README §3's rule with no exception: a surrogate `bigint` identity key,
    -- with the natural key beside it as a unique constraint.
    id bigint generated always as identity primary key,

    -- **The pair, canonically ordered.** `security_low_id` is the security
    -- whose TICKER sorts lower — resolved by the writer, because a ticker is
    -- store-independent and an id is not. §3.
    --
    -- Two real foreign keys with no `on delete`; §9.
    security_low_id bigint not null references securities (id),
    security_high_id bigint not null references securities (id),

    -- The window's end — the session close instant these correlations are FOR.
    -- No default: §2.
    observed_at timestamptz not null,

    -- **Pearson's `r`, SIGNED.** `numeric(18, 6)` and never a float, README
    -- §4: nothing sums it, but a coefficient is the figure an edge's strength
    -- is read from and this schema's rule has no exception for a number that
    -- happens not to be money. Six decimal places is three orders of magnitude
    -- finer than the significance floor at the best `n` this product reaches
    -- (0.029 at n = 4,620), so the stored precision is not what bounds a
    -- ranking.
    --
    -- The sign is kept because an anti-correlation is a real, interesting
    -- relationship and the magnitude is what the ranking uses — the same split
    -- `session_return_percentiles.percent` makes, where the ordinal ranks
    -- `Math.abs` and the column carries the sign the glyph reads.
    coefficient numeric(18, 6) not null,

    -- **The counted overlap `n` — anchors present in BOTH series.** Never
    -- `60 × 77`, and never either leg's own `sample_count`: median stored
    -- coverage is 82.8%, so an intersection is strictly smaller than either
    -- side. `bigint` because README §4's rule is that a count is one, enforced
    -- by `migrate.database.test.ts` on every column whose name ends `_count`.
    --
    -- It travels on the row because the significance test is a function of
    -- both `r` and `n`, and a reader holding the row cannot re-derive it.
    sample_count bigint not null,

    -- What the pass applied, not what a later bundle believes — `0014` §5. The
    -- window's depth, the grid's stride, and the tape both legs were read on
    -- (§8, and invariant 6: provenance is displayed, never implied).
    lookback_sessions integer not null,
    span_minutes integer not null,
    feed text not null,

    -- When we wrote this row. `now()` is transaction start time, so one pass's
    -- rows share one value, and a row whose `observed_at` is last Friday's
    -- close and whose `recorded_at` is this morning was recomputed.
    recorded_at timestamptz not null default now(),

    -- **The natural key, leading with the session.** §7 — every read of this
    -- table is *every retained pair of one session*, which is the opposite
    -- shape from the per-security tables' two-step.
    constraint return_correlations_unique_pair
        unique (observed_at, security_low_id, security_high_id),

    -- **No self-pair.** A security's correlation with itself is `1` by
    -- construction and would be the strongest edge on every node. §3.
    constraint return_correlations_no_self_pair
        check (security_low_id <> security_high_id),

    -- Pearson's own bounds, in the database. A coefficient of 1.4 draws as a
    -- confident, well-formed strongest edge and nothing on the page can
    -- contradict one.
    constraint return_correlations_coefficient_in_range
        check (coefficient >= -1 and coefficient <= 1),

    -- **`numeric` has a `NaN`**, and it compares equal to itself — so the
    -- idiomatic `coefficient = coefficient` would admit it. `<> 'NaN'` is the
    -- one expression that does not, and `0/0` is exactly what a zero-variance
    -- leg produces if the producer's refusal is ever bypassed: the strongest
    -- edge in the graph, from a division by zero.
    constraint return_correlations_coefficient_is_a_number
        check (coefficient <> 'NaN'::numeric),

    -- `CORRELATION_MINIMUM_OVERLAP`, in the database. Below four shared
    -- anchors the significance test's standard error — `1/√(n − 3)` — is not
    -- finite, so the coefficient is undefined rather than imprecise.
    constraint return_correlations_sample_count_above_floor
        check (sample_count >= 4),

    -- The vocabulary is `MARKET_FEEDS` in `packages/shared` and this is the
    -- database's backstop against a writer that bypassed it — `0002`'s
    -- decision 1 is why it is `text` + `check` rather than an `enum`, and
    -- `0010_market_bars_feed.sql` is the same pair on the same vocabulary.
    constraint return_correlations_feed_known
        check (feed in ('sip', 'iex')),

    constraint return_correlations_parameters_positive
        check (lookback_sessions > 0 and span_minutes > 0)
);

-- **One row per UNORDERED pair per session, whichever column each id sits
-- in** — §3, and the backstop `check (security_low_id < security_high_id)`
-- could not be without refusing legitimate rows.
--
-- `least`/`greatest` over two `bigint`s, so the index is over the pair as a
-- **set**: with `(AAAA, BBBB)` stored, an insert of `(BBBB, AAAA)` is refused
-- by this index even though it satisfies the unique constraint above and every
-- `check` in the table. Verified against PostgreSQL 18 before this file was
-- written rather than assumed — expression indexes need immutable
-- expressions, and `least`/`greatest` over `bigint` qualify.
--
-- **It is a second index entry per row on a nightly write**, which is the
-- stated cost: ~2,500 rows a session at `N = 5`, against README's rule that an
-- index chosen before there is a query to serve is a guess with a write cost.
-- This one serves no query at all — it is a **constraint wearing an index's
-- clothes**, which is the only shape PostgreSQL offers for a uniqueness claim
-- over an expression, and the thing it refuses is a graph with two edges
-- between one pair of nodes.
--
-- Built here rather than by `pnpm index:prepare` (README §9) because this is
-- an **empty table**: that convention exists for `market_bars`, where a
-- non-concurrent build is 37.3 s on a laptop and ~508 s on the deployed tier's
-- 10 MiB/s against `deploy.yml`'s `timeout 120`. Over zero rows it is a
-- catalogue write.
create unique index return_correlations_one_row_per_unordered_pair
    on return_correlations (
        observed_at,
        least(security_low_id, security_high_id),
        greatest(security_low_id, security_high_id)
    );

-- One row per pass, so the populations a surface states are **counted by the
-- pass** rather than re-derived from the rows it wrote. ADR 0044's 2026-10-16
-- generalisation, fifth application — and the clearest case it has had, because
-- here the rows are a **selection**: counting them answers *how many edges did
-- we draw* and says nothing whatever about how many pairs were considered,
-- refused, or cut. A graph that joined only the row table would under-report
-- and look correct, which is Story 6.5's AC 5 in one sentence.
--
-- **Two population chains at two grains**, because a security-grain refusal
-- removes ~500 candidate pairs at a stroke and one undifferentiated `refused`
-- count cannot express that. §5 carries the arithmetic; all of it is in the
-- database rather than left to a test, which is `0014`'s own precedent.
create table return_correlation_passes (
    id bigint generated always as identity primary key,

    -- The window's end, and the natural key: one pass per session. **NO
    -- DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **Security grain — three populations that PARTITION.** §5.
    tracked_equities_count bigint not null,
    eligible_equities_count bigint not null,
    -- The price pass's own verdict, inherited rather than re-evaluated.
    split_discontinuity_count bigint not null,
    -- No stored grid pair at all — CI's permanent state for every equity.
    absent_count bigint not null,

    -- **Pair grain — three populations that NEST.** §5.
    -- `C(eligible, 2)`: 125,250 at 501 eligible equities.
    candidate_pairs_count bigint not null,
    -- Cleared the overlap floor and produced a finite coefficient.
    computed_pairs_count bigint not null,
    -- In some node's top-N AND significant. The rows this pass wrote.
    retained_pairs_count bigint not null,

    -- **Pair-grain refusals, which partition the candidate/computed gap.** The
    -- vocabulary is `CORRELATION_REFUSALS`; two columns rather than a bag, so
    -- a third member is a migration somebody has to write.
    too_few_overlapping_samples_count bigint not null,
    zero_variance_count bigint not null,

    -- **The CUT, which is not a refusal.** Computed and finite, and not
    -- statistically distinguishable from zero at that pair's own `n`. Outside
    -- the refusal partition and inside the nesting; §5.
    below_significance_count bigint not null,

    -- **The `N` this pass applied**, which is the parameter Story 6.5's Open
    -- Decision 1 defers to Task 6.5.3's measurement — so this column is what
    -- makes two generations computed under two values of it tellable apart
    -- without re-reading the code that wrote them. `0014` §5's rule, pointed
    -- at the one parameter already known to be provisional.
    retained_n integer not null,

    -- The rest of what the pass applied; §8 and `0014` §5.
    lookback_sessions integer not null,
    span_minutes integer not null,
    feed text not null,

    recorded_at timestamptz not null default now(),

    constraint return_correlation_passes_unique_pass
        unique (observed_at),

    -- **The security partition, in the database.** Every tracked equity ends
    -- in exactly one of *eligible*, *refused on an inherited price break* and
    -- *no series at all*. A pass that died mid-loop writes a row whose counts
    -- do not sum and this refuses it — which is the intended behaviour rather
    -- than a hazard: no pass row at all is the readable state, exactly as it
    -- is one table over.
    constraint return_correlation_passes_securities_partition
        check (
            eligible_equities_count >= 0
            and split_discontinuity_count >= 0
            and absent_count >= 0
            and eligible_equities_count
                + split_discontinuity_count
                + absent_count
                = tracked_equities_count
        ),

    -- **The pair nesting, in the database.** `retained + below_significance ≤
    -- computed ≤ candidate`. The first conjunct is the one worth having: a
    -- retained set larger than the significant set is a pass that drew an edge
    -- it had refused.
    --
    -- **The second conjunct is IMPLIED by the refusal partition below and
    -- cannot be reached on its own**, which was found by planting it rather
    -- than by reading: a write with `computed = candidate + 1` goes red naming
    -- `return_correlation_passes_pair_refusals_partition`, because two
    -- non-negative counts summing to `candidate − computed` already force the
    -- inequality. It is kept because it is free, it states the chain a reader
    -- expects to find, and it stops being implied the day that partition is
    -- relaxed to a nesting.
    constraint return_correlation_passes_pairs_nest
        check (
            retained_pairs_count >= 0
            and below_significance_count >= 0
            and retained_pairs_count + below_significance_count
                <= computed_pairs_count
            and computed_pairs_count <= candidate_pairs_count
        ),

    -- **The pair-grain refusals partition the gap** between what was
    -- considered and what was computed. A pair that produced no coefficient
    -- did so for exactly one of two reasons.
    constraint return_correlation_passes_pair_refusals_partition
        check (
            too_few_overlapping_samples_count >= 0
            and zero_variance_count >= 0
            and too_few_overlapping_samples_count + zero_variance_count
                = candidate_pairs_count - computed_pairs_count
        ),

    constraint return_correlation_passes_feed_known
        check (feed in ('sip', 'iex')),

    constraint return_correlation_passes_parameters_positive
        check (
            retained_n > 0
            and lookback_sessions > 0
            and span_minutes > 0
        )
);
