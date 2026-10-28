-- 0017_session_composite_scores — the composite anomaly score of one completed
-- session, per security, plus one row per pass recording the populations and
-- **the policy the pass applied** (Task 5.6.6).
--
-- **These are the schema's SEVENTH and EIGHTH DERIVED tables.** `0014`'s
-- opening line is the one to read first: every non-derived table in this schema
-- holds something we were told (a bar, a membership, a coverage claim), and
-- these two hold something computed from `market_bars`, `return_baselines` and
-- `excess_move_baselines`. They can be thrown away and rebuilt. See §1.
--
-- **Why a stored composite exists at all, which is the only product decision in
-- this file.** `/`'s `Unusual activity` is a two-arm union: the `observed` arm
-- computes live from the trailing windows, and the `session` arm reads
-- `session_return_percentiles` — which carries a **percentile and no score**.
-- That arm runs out of hours, about 80% of the week, and **permanently on CI**.
-- Without this table the region would draw a composite for a few hours a day
-- and an ordinal the rest of the time: two different quantities in one column
-- on different days, which is exactly what `market-unusual.ts`' two-arm union
-- was built to prevent. The owner chose to store the composite nightly rather
-- than ship that split.
--
-- **`0016` §7 says there is no session-basis score table and that is still
-- true of what it was about.** That section answers *where does the 60-session
-- distribution of |excess| live for the session basis* — the answer being that
-- a session-basis excess is computed on read — and it ends *"nothing here
-- ranks."* This table is a **ranking**, which is `0014`'s own reason for
-- existing: a ranked list needs every security's figure at once.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision these inherit, **instantiated rather than extended** —
-- computed nightly, keyed by the session it is FOR, with the two-table
-- convention of its 2026-10-16 amendment, **fourth application**. `0014` is the
-- nearest relative and this file follows it section for section; where this
-- file is silent that one is the argument.
--
-- ============================================================================
-- 1. DERIVED AND RECOMPUTABLE — SAID HERE, IN `schema.ts`, AND IN THE ADR
-- ============================================================================
--
-- **Recompute command: `pnpm baselines`.** The same command as the other three
-- pairs, because this is the same pass: the composite is computed from the
-- three baselines that pass is already holding in memory for the security it is
-- already reading, so it costs **no additional I/O at all**.
--
-- Dropping every row in either table loses nothing that cannot be rebuilt from
-- `market_bars`, and the nightly job in `.github/workflows/backfill.yml`
-- rebuilds the newest session on its own the following night.
--
-- Said in three places for `0013` §1's reason, and the named cost is sharper
-- here than anywhere: **a stored composite is a cache of a POLICY**, not only
-- of a measurement. Changing a weight, a band floor, a factor's unit mapping or
-- the factor set is a **delete and a re-run**, never a backfill — and a reader
-- that treated this table as primary would migrate 60 sessions of rows whose
-- whole content it could have recomputed.
--
-- ============================================================================
-- 2. `observed_at` IS THE SCORED SESSION'S CLOSE, AND IT TAKES NO DEFAULT
-- ============================================================================
--
-- `0014` §2 unchanged, and the pairing is exact: this `observed_at` is the
-- **same instant** as `session_return_percentiles`' for the same session, so a
-- reader holding both has the price factor's own figures beside the composite
-- without a second key.
--
-- **No default**, for `0002`'s decision 3 reason: a `default now()` on the
-- column a replay keys on turns *the session this describes* into *when a
-- script ran*, invisibly, because every row would look plausible. It is
-- `not null` and the pass supplies it.
--
-- The name is `observed_at` **deliberately**, taking `README.md` §2's reserved
-- name so Epic 13's generic predicate — `where "observed_at" <= $clock` —
-- covers both of these tables with **no explicit clock argument**. That is
-- `0013` §2's argument unchanged and is invariant 4's own bar.
--
-- `recorded_at` is `not null default now()` — README §2's pair, transaction
-- start time — and it is what makes a **re-run** visible.
--
-- ============================================================================
-- 3. METADATA-ONLY AT DEPLOY TIME
-- ============================================================================
--
-- **Every statement here is a catalogue write.** Two `CREATE TABLE`s on new
-- relations, one foreign key installing two triggers, two unique constraints on
-- empty tables, and check constraints on empty tables. No `ALTER TABLE` on a
-- populated table, no index build over a heap, no validated constraint, no
-- backfill — so README §9's 10 MiB/s arithmetic against `deploy.yml`'s
-- `timeout 120` is not engaged.
--
-- **And there is NO `ALTER TABLE` on `market_bars`, on `securities` or on any
-- of the six derived tables, ever.** `market_bars` has a live writer running
-- once a minute for six and a half hours a day inside the deploy window
-- (`live-bar-writer.ts`), and Task 3.7.6 measured an `ACCESS EXCLUSIVE`
-- migration waiting **18.16 s** behind one open write transaction with an
-- ordinary chart read waiting **16.16 s** behind *it*, against a 0.09 s
-- baseline. The foreign key below takes `SHARE ROW EXCLUSIVE` on `securities`
-- to install its triggers, which conflicts with neither a read's `ACCESS
-- SHARE` nor a child insert's `ROW SHARE` — `0012` §1 has the full argument.
--
-- ============================================================================
-- 4. A ROW IS A SCORE. A SECURITY WHOSE EVERY FACTOR WAS ABSENT HAS NO ROW
-- ============================================================================
--
-- `0014` §4's rule, inherited for the same reason and expressed in a type one
-- layer up. `AnomalyScore.contributing` is `[FactorClause, ...FactorClause[]]`,
-- so **a score with no contributing factor is untypeable**; a security whose
-- every factor refused is `UnscoredAnomaly`, which is a different type with no
-- `score` member at all. `session_composite_scores_one_factor_contributes` is
-- that in the database: a row with three non-`ranked` factors cannot be
-- inserted.
--
-- The input is a **ranked list of ten**, and ADR 0038 decision 5's rule at the
-- row grain is that a required figure which cannot be honestly produced drops
-- the whole row: there is no `score: null`, no `?? 0` and no unranked tail,
-- because a `null` under a `"number"` reaches a lenient reader as `0` and a
-- score of `0` is the most ordinary security on record drawn at the top of a
-- region about unusual ones.
--
-- **The unscored population is COUNTED on the pass row and its reasons are
-- NOT.** This is the one place this file diverges from `0014`, which carries
-- five refusal counts. The reasons here are **per factor**, and they already
-- have homes keyed on the same `observed_at`: the price factor's five are
-- `session_return_percentile_passes`' own columns and the excess factor's are
-- `excess_move_baseline_passes`'. A second copy would be a second home for a
-- fact that has one, and the three pass rows are written by one pass in one
-- loop with one window end, so the join is equality on `observed_at`.
--
-- ============================================================================
-- 5. THE FACTOR ANSWERS ARE STORED, AND THE MINTED SCORE IS STORED AS WELL
-- ============================================================================
--
-- **The three factor answers are the row's content.** Per factor: its state,
-- and the members that arm carries — for `ranked` the ordinal, whether the
-- magnitude was above every sample, and the counted `n`; for `refused` the word
-- and the two counts; for `inapplicable` the reason; for `no-distribution`
-- nothing at all. That is `FactorAnswer`'s four arms in columns, and three
-- consequences follow that a stored score alone could not give:
--
--   - **the factor set IS the set of states and has no second home.** AC 3's
--     *the number of contributing factors is part of the score's identity* is
--     readable off the row rather than stored beside it;
--   - **`max` and `band` are DERIVABLE** rather than facts somebody wrote down;
--   - **`scoreAnomaly` stays the only arithmetic.** The reader mints the score
--     from the stored answers — `session-composite-store.ts` does, and
--     `a-stored-composite-is-minted-from-its-answers` in `pnpm invariants`
--     fails the build on a reader that returns the stored column instead. A
--     nightly pass or a store with its own copy of `round(w × u / 100)` is the
--     defect the `one-comparator-*` guards exist for, one layer over.
--
-- **A `text[]` or a `jsonb` of contributing factor names is REFUSED**, for
-- `0014` §4's recorded reason: a fourth factor must be a migration somebody
-- writes — `0003`'s drop-check/add-check pair — rather than a key that silently
-- stops being counted. The same argument makes this three **column groups**
-- rather than a child table: a factor added to `COMPOSITE_FACTORS` is a
-- migration, and a `null`-tolerant child table would let a pass that skipped a
-- factor look identical to one that scored it.
--
-- **And the minted `score`, `band` and `max` are stored AS WELL.** That is
-- `0014` §5's argument in its strongest form: storing them makes a
-- producer/reader disagreement **detectable** — a rollback that puts the runner
-- and a later bundle two weight sets or two floor sets apart shows up as a
-- stored score the reader's own mint does not reproduce, and the store drops
-- that row rather than drawing either number. Storing them **instead of** the
-- answers would be the opposite mistake and is `0015`'s `feed`-in-the-key
-- argument: a weight change would leave 60 sessions of stale scores with
-- nothing recording that the meaning changed.
--
-- **The weights and the band floors are on the PASS row**, never on the score
-- row, for `0014` §5's `minimum_sample_count` reason: a stored row is read by a
-- later bundle, a rollback can put a runner and a reader two values apart, and
-- the figure the screen states must be the one the producer applied. Both carry
-- reversal triggers of their own — `FACTOR_WEIGHTS`' is a measurement of two
-- factors' relative discriminating power, and `ANOMALY_BAND_FLOORS`' first is
-- *the first score computed over a factor set this derivation did not measure*
-- — so a stored score is a cache of **two policies that can move**.
--
-- One figure on the pass row and not the score row, stated because it is the
-- only duplication a reader might expect and will not find: there is no
-- per-factor weight column. It is `FACTOR_WEIGHTS[factor]` for the pass, the
-- three columns beside it say what that was, and `max` on the score row is the
-- sum over that row's own `ranked` factors.
--
-- ============================================================================
-- 6. THE VOCABULARIES, AND THE ONE THIS FILE DOES NOT INVENT
-- ============================================================================
--
-- `README.md` §1's rule with no exception: a closed set of values is `text`
-- with a `check` constraint, never an `enum`, and the source of truth is the
-- TypeScript union in `packages/shared`. Three vocabularies are bounded here:
--
--   - **the band** — `ANOMALY_BANDS`, four words;
--   - **the factor answer's state** — `FACTOR_ANSWER_STATES`, four words, added
--     in `composite-score.ts` by this task because the discriminant had no
--     runtime form and a check constraint needs one;
--   - **the refusal word** — `COMPOSITE_FACTOR_REFUSALS`, **derived** in
--     `composite-score.ts` from the three lists that own it rather than
--     hand-written here, because `FactorRefusal` is a union of
--     `PERCENTILE_REFUSALS`, `EXCESS_FACTOR_REFUSALS` and `VOLUME_REFUSALS` and
--     a fourth home for three vocabularies is what this repository refuses by
--     name. `session-composite-scores.database.test.ts` asserts this
--     constraint's words against that array out of `pg_constraint`, which is
--     `market-bars.database.test.ts`' arrangement for `PROVIDER_IDS` and
--     `MARKET_FEEDS`. So a word added to any of the three without a migration
--     is a **red test**, and a word added here without being in one is too.
--
-- **The inapplicability word is NOT bounded, and that is argued rather than
-- omitted.** `FactorInapplicability` has one member today (`ExcessMoveInapplic-
-- ability`: `no-sector`, `is-benchmark`) and `composite-score.ts`' own docblock
-- says the type exists so that *a vocabulary added to any factor is a compile
-- error at the builder* — the builder, not the schema. A `check` here would add
-- a fourth boundary to a vocabulary whose own home is explicitly a compile
-- error, for a column no ranking reads. What is checked is that it is a word at
-- all (`<> ''`), which is `readAbsentClause`'s own rule for the same field.
--
-- ============================================================================
-- 7. WHAT THESE FILES DELIBERATELY DO NOT HAVE
-- ============================================================================
--
-- **No index beyond the ones the constraints build.** `0014` §6's argument
-- unchanged, including its condition: there are exactly two reads — *the newest
-- pass at or before an instant* and *every score row of that pass* — and the
-- unique btree `(security_id, observed_at)` does not lead with the column the
-- second one bounds on. At one row per equity per session this table gains
-- ~485 rows a session and is measured in tens of thousands of rows a year, so
-- the read is a scan of a small table rather than of a 5 GB heap. **The
-- condition for adding an `(observed_at)`-leading index is a reader that issues
-- the session read at a cadence rather than once a quarter hour**, with the
-- plan written down beside it.
--
-- **No foreign key from the score to the pass**, and **no foreign key to
-- `session_return_percentiles` either.** `0014` §6's argument for the first;
-- the second is the same argument about a relationship the reader establishes
-- by equality on `observed_at`, plus one fact that makes a key wrong rather
-- than merely unnecessary: a security can have a composite with **no** price
-- percentile row, because the excess factor alone is enough to make a score and
-- the price factor can refuse. The populations are not nested and a key would
-- claim they are.
--
-- **No `on delete` on the foreign key**, which is `market_bars`' and `0014`'s
-- decision: the database refuses a delete that would orphan a score rather than
-- cascading it away. Nothing in this repository deletes a security.
--
-- **No `updated_at`.** A re-run of the same session UPDATES both rows, and
-- `recorded_at` already answers *when we wrote what is there now* — for a
-- derived row, "when we wrote it" and "when we last wrote it" are the same
-- question.
--
-- **No approximate column of any kind, scalar or array.** A composite carries
-- integers, booleans, words and `numeric`; there is no distribution in it. So
-- `migrate.database.test.ts`' approximate-array allowlist gains **no entry** —
-- and because that assertion is an **exact set equality**, an unneeded entry
-- would fail it just as a missing one would.
--
-- **No `security_id` on the pass table.** It is one row per pass, which is
-- `0014`, `0015` and `0016`'s shape.
--
-- **No population for the fifteen non-equities.** This pass scores the
-- **equities alone**, which is `session_return_percentiles`' own population and
-- is AC 13's reason: a ranked list that scored `SPY` and the eleven sector
-- SPDRs beside their own constituents would make `Unusual activity` and
-- `Market proxies` / `Sector performance` non-independent. **The condition for
-- widening it to all 516 is the first surface that needs a composite for a
-- security the market is shut on** — a security page's own score out of hours —
-- at which point `tracked_count` stops being the equities and the ranking read
-- gains a filter rather than this table gaining a column.

create table session_composite_scores (
    -- README §3's rule with no exception: a surrogate `bigint` identity key,
    -- with the natural key beside it as a unique constraint.
    id bigint generated always as identity primary key,

    -- The security this score is about. A real foreign key with no
    -- `on delete`; §7.
    security_id bigint not null references securities (id),

    -- **The scored session's close** — the coordinate a replay keys on, and the
    -- same instant `session_return_percentiles` carries for this session.
    -- **NO DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **The minted score, `0`–`100`, stored AS WELL as the answers it was
    -- minted from** — §5. `integer` because it is an integer: the score is
    -- `Σ round(w × u / 100)` over the contributing factors, in score points,
    -- and `composite-score.ts` records why the rounding happens per
    -- contribution rather than once at the end (a reader's addition must not
    -- fail on correct code).
    score integer not null,

    -- `bandOf(score)` — derivable, and stored for the same detectability
    -- reason. `ANOMALY_BANDS`' four words; §6. A reader that drew a stored band
    -- over its own score would be the renormalisation this story refused
    -- arriving as a rollback, so the store recomputes and refuses a row whose
    -- stored band disagrees.
    band text not null,

    -- **`Σ w` over this row's `ranked` factors** — the most this factor set
    -- could have produced, `1`–`100`. Part of the label (`2 of 3 · max 75`),
    -- and the thing that makes a reduced-factor score readable: `2 of 3` has
    -- three different maxima depending on **which** two.
    max integer not null,

    -- ========================================================================
    -- The three factor answers, one column group each. §5.
    --
    -- The groups are byte-identical in shape on purpose: a factor added to
    -- `COMPOSITE_FACTORS` is a fourth group in a migration somebody writes.
    -- ========================================================================

    -- **The price percentile** — this security's closing five-minute return
    -- ranked in its own 60-session history of five-minute returns.
    price_state text not null,
    -- `ranked` only: the integer ordinal `0`–`99`. Never `100`, because above
    -- the highest order statistic there is no sample.
    price_rank integer,
    -- `ranked` only: whether the magnitude is strictly above every sample.
    -- `false` on every row this pass writes, because the window the pass ranks
    -- against **contains** the sample being ranked — `0014` §5 states the same
    -- asymmetry for the ordinal, and the column exists because the shape is one
    -- shape.
    price_above_sample boolean,
    -- `ranked` or `refused`: the counted `n`, never a constant. `0` is legal on
    -- a refusal and nowhere else — `0 of 2,500 returns` is a cold replica's own
    -- true sentence. `bigint` because README §4's rule is that a count is one.
    price_sample_count bigint,
    -- `refused` only: the word, and the bound it was refused against. §6.
    price_refusal text,
    price_minimum_sample_count bigint,
    -- `inapplicable` only: why the question does not arise. §6 says why this
    -- one is not bounded to a list.
    price_inapplicable_because text,

    -- **The excess move** — this security's closing five-minute return minus
    -- its sector benchmark's over the **same** five minutes, ranked in its own
    -- 60-session history of that quantity.
    excess_state text not null,
    excess_rank integer,
    excess_above_sample boolean,
    excess_sample_count bigint,
    excess_refusal text,
    excess_minimum_sample_count bigint,
    excess_inapplicable_because text,

    -- **The volume rate** — `no-distribution` on every row ever written, for
    -- every security, until a nightly pass stores a **distribution** of this
    -- quantity rather than `0015`'s median and dispersion. The arm is
    -- payload-free, so every column in this group is `null` on every row today.
    --
    -- **The group exists anyway**, and that is the point rather than an
    -- oversight: the factor set is the set of states, so a factor with no
    -- figure must still have a state in the row — otherwise `2 of 3` would be
    -- an inference from a missing column rather than a fact read off one.
    volume_state text not null,
    volume_rank integer,
    volume_above_sample boolean,
    volume_sample_count bigint,
    volume_refusal text,
    volume_minimum_sample_count bigint,
    volume_inapplicable_because text,

    -- When we wrote this row. `now()` is transaction start time, so one pass's
    -- rows share one value.
    recorded_at timestamptz not null default now(),

    -- The natural key: one composite per security per session. A second pass
    -- over a session already stored updates rather than appending, which is
    -- what makes `pnpm baselines` re-runnable and convergent in `pnpm
    -- universe`'s sense.
    constraint session_composite_scores_unique_score
        unique (security_id, observed_at),

    -- **The scale, in the database.** A `140` or a negative score draws as a
    -- confident, well-formed row at the top of a region about unusual
    -- behaviour, and nothing on the page can contradict one. `score <= max`
    -- because a contribution is bounded by its own weight by construction.
    constraint session_composite_scores_score_in_range
        check (score >= 0 and score <= max),
    constraint session_composite_scores_max_in_range
        check (max >= 1 and max <= 100),

    -- `ANOMALY_BANDS` in the database; §6.
    constraint session_composite_scores_band_known
        check (band in ('normal', 'elevated', 'high', 'extreme')),

    -- **`FactorAnswer`'s four arms, as a shape per group.** Each arm's members
    -- are present exactly when its state is — which is the half a column-based
    -- row cannot get from the type, because the arms differ in **shape** and a
    -- row cannot. Without this a `ranked` factor with a `null` rank is
    -- insertable, and the store's own mapper would drop the row: a silent loss
    -- of a security from a ranked list, which is the one direction a ranking
    -- may not err in without saying so.
    constraint session_composite_scores_price_answer_shape
        check (
            price_state in ('ranked', 'refused', 'inapplicable', 'no-distribution')
            and (price_rank is not null) = (price_state = 'ranked')
            and (price_above_sample is not null) = (price_state = 'ranked')
            and (price_sample_count is not null)
                = (price_state in ('ranked', 'refused'))
            and (price_refusal is not null) = (price_state = 'refused')
            and (price_minimum_sample_count is not null)
                = (price_state = 'refused')
            and (price_inapplicable_because is not null)
                = (price_state = 'inapplicable')
        ),
    constraint session_composite_scores_excess_answer_shape
        check (
            excess_state in ('ranked', 'refused', 'inapplicable', 'no-distribution')
            and (excess_rank is not null) = (excess_state = 'ranked')
            and (excess_above_sample is not null) = (excess_state = 'ranked')
            and (excess_sample_count is not null)
                = (excess_state in ('ranked', 'refused'))
            and (excess_refusal is not null) = (excess_state = 'refused')
            and (excess_minimum_sample_count is not null)
                = (excess_state = 'refused')
            and (excess_inapplicable_because is not null)
                = (excess_state = 'inapplicable')
        ),
    constraint session_composite_scores_volume_answer_shape
        check (
            volume_state in ('ranked', 'refused', 'inapplicable', 'no-distribution')
            and (volume_rank is not null) = (volume_state = 'ranked')
            and (volume_above_sample is not null) = (volume_state = 'ranked')
            and (volume_sample_count is not null)
                = (volume_state in ('ranked', 'refused'))
            and (volume_refusal is not null) = (volume_state = 'refused')
            and (volume_minimum_sample_count is not null)
                = (volume_state = 'refused')
            and (volume_inapplicable_because is not null)
                = (volume_state = 'inapplicable')
        ),

    -- **A ROW IS A SCORE** — §4. `AnomalyScore.contributing` is a non-empty
    -- tuple, so a score with no contributing factor is untypeable one layer up;
    -- this is the same statement where a `null` cannot sneak past a type.
    constraint session_composite_scores_one_factor_contributes
        check (
            price_state = 'ranked'
            or excess_state = 'ranked'
            or volume_state = 'ranked'
        ),

    -- `returnPercentileOf`'s own bounds, for every group that can hold one.
    constraint session_composite_scores_ranks_in_range
        check (
            (price_rank is null or (price_rank >= 0 and price_rank <= 99))
            and (excess_rank is null or (excess_rank >= 0 and excess_rank <= 99))
            and (volume_rank is null or (volume_rank >= 0 and volume_rank <= 99))
        ),

    -- **`0` is NOT a legal sample on a RANKED factor and IS on a refused one.**
    -- An ordinal taken against an empty distribution is not an ordinal;
    -- `0 of 2,500` is the cold replica's own sentence. `readFactorClause` and
    -- `readAbsentClause` apply exactly this pair at the wire's end.
    constraint session_composite_scores_samples_well_formed
        check (
            (price_state <> 'ranked' or price_sample_count > 0)
            and (excess_state <> 'ranked' or excess_sample_count > 0)
            and (volume_state <> 'ranked' or volume_sample_count > 0)
            and (price_sample_count is null or price_sample_count >= 0)
            and (excess_sample_count is null or excess_sample_count >= 0)
            and (volume_sample_count is null or volume_sample_count >= 0)
            and (
                price_minimum_sample_count is null
                or price_minimum_sample_count > 0
            )
            and (
                excess_minimum_sample_count is null
                or excess_minimum_sample_count > 0
            )
            and (
                volume_minimum_sample_count is null
                or volume_minimum_sample_count > 0
            )
        ),

    -- **`COMPOSITE_FACTOR_REFUSALS` in the database** — the eleven words
    -- `FactorRefusal` can hold, derived in `packages/shared` from the three
    -- lists that own them and asserted against these three constraints by
    -- `session-composite-scores.database.test.ts`. §6.
    --
    -- **Three constraints with one list each, rather than one with three
    -- copies of it nested inside.** The list is the same because the type is:
    -- `FactorRefusal` is one union over all three factors, deliberately, so
    -- that `no-subject-move` — a word the price factor borrows from the excess
    -- factor's vocabulary — is expressible at all. A per-factor narrowing would
    -- be a fourth claim about which factor may say what, and the one home for
    -- that is the builder in `market-composite.ts`.
    constraint session_composite_scores_price_refusal_known
        check (
            price_refusal is null
            or price_refusal in (
                'too-few-samples',
                'split-discontinuity',
                'reference-split-discontinuity',
                'mixed-basis',
                'no-subject-move',
                'no-reference-move',
                'too-few-sessions',
                'no-same-tape-baseline',
                'zero-volume-baseline',
                'no-bar-in-bucket',
                'bucket-partially-observed'
            )
        ),
    constraint session_composite_scores_excess_refusal_known
        check (
            excess_refusal is null
            or excess_refusal in (
                'too-few-samples',
                'split-discontinuity',
                'reference-split-discontinuity',
                'mixed-basis',
                'no-subject-move',
                'no-reference-move',
                'too-few-sessions',
                'no-same-tape-baseline',
                'zero-volume-baseline',
                'no-bar-in-bucket',
                'bucket-partially-observed'
            )
        ),
    constraint session_composite_scores_volume_refusal_known
        check (
            volume_refusal is null
            or volume_refusal in (
                'too-few-samples',
                'split-discontinuity',
                'reference-split-discontinuity',
                'mixed-basis',
                'no-subject-move',
                'no-reference-move',
                'too-few-sessions',
                'no-same-tape-baseline',
                'zero-volume-baseline',
                'no-bar-in-bucket',
                'bucket-partially-observed'
            )
        ),

    -- A word at all, which is `readAbsentClause`'s own rule for this field and
    -- the whole of what §6 claims for it.
    constraint session_composite_scores_inapplicability_present
        check (
            (
                price_inapplicable_because is null
                or price_inapplicable_because <> ''
            )
            and (
                excess_inapplicable_because is null
                or excess_inapplicable_because <> ''
            )
            and (
                volume_inapplicable_because is null
                or volume_inapplicable_because <> ''
            )
        )
);

-- One row per pass, so the populations a surface states are **counted by the
-- pass** rather than re-derived from the rows it wrote — ADR 0044's 2026-10-16
-- amendment, **fourth** application. A surface that said *scored 485 of 501* by
-- counting rows would be counting the rows that **survived**, and a pass that
-- died mid-loop would make that sentence quietly wrong.
--
-- **And it is where the POLICY lives** — §5 — which is what makes this pass row
-- different in kind from the three beside it. Those carry the parameters a
-- measurement was taken under; this one carries the judgements a score was
-- minted under, both of which have reversal triggers that can fire while 60
-- sessions of rows are standing.
create table session_composite_score_passes (
    id bigint generated always as identity primary key,

    -- **The scored session's close**, and the natural key: one pass per
    -- session. **NO DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **Two populations that PARTITION** — `tracked = scored + unscored` —
    -- which is `volume_baseline_passes`' shape rather than `0014`'s nesting,
    -- and the reason is §4: every tracked equity ends in exactly one of *it has
    -- a score* and *every factor was absent*, with no intermediate population
    -- to nest. `tracked` is the equities the pass was over (485 scored of 501
    -- today, neither ever spelled).
    tracked_count bigint not null,
    scored_count bigint not null,
    unscored_count bigint not null,

    -- **The weights the pass applied** — `FACTOR_WEIGHTS`, read from
    -- `packages/shared` and never spelled by the pass. §5: a stored score is a
    -- cache of a policy, and the figure the screen states must be the one the
    -- producer applied.
    --
    -- Three columns rather than a `jsonb` map, for §5's reason: a fourth factor
    -- is a migration somebody writes rather than a key that silently stops
    -- being recorded.
    price_weight integer not null,
    excess_weight integer not null,
    volume_weight integer not null,

    -- **The band floors the pass applied** — `ANOMALY_BAND_FLOORS`, three
    -- measured quantiles of a max-75 two-factor distribution. `normal` is the
    -- floor-less arm, so three columns tile the four bands.
    elevated_floor integer not null,
    high_floor integer not null,
    extreme_floor integer not null,

    recorded_at timestamptz not null default now(),

    constraint session_composite_score_passes_unique_session
        unique (observed_at),

    constraint session_composite_score_passes_populations_partition
        check (
            scored_count >= 0
            and unscored_count >= 0
            and scored_count + unscored_count = tracked_count
        ),

    -- **The weights sum to 100 over the full factor set**, which is what makes
    -- *"the price term contributed 38 of its 40"* readable: the weight has to
    -- be the term's own maximum in the score's own unit.
    -- `composite-score.test.ts` asserts the same sum over `FACTOR_WEIGHTS`
    -- because TypeScript cannot add; this is the database's half of it.
    constraint session_composite_score_passes_weights_sum_to_100
        check (
            price_weight >= 1
            and excess_weight >= 1
            and volume_weight >= 1
            and price_weight + excess_weight + volume_weight = 100
        ),

    -- **The floors are strictly ascending inside `0`–`100`.** Equal floors
    -- would make a band unreachable — `high_floor = extreme_floor` deletes
    -- `high` from the vocabulary silently, which is a band word that exists in
    -- `ANOMALY_BANDS`, is drawn by `AnomalyBadge` and can never be produced.
    --
    -- **Gate 1 decision 2 is NOT encoded here**, deliberately: *`extreme` above
    -- what a reduced-factor score can reach* is a statement about the floors
    -- **against the weights** (`elevated ≤ 40 < high` today), and a check
    -- coupling two policies that move independently would refuse a legitimate
    -- weight change. It is argued at `ANOMALY_BAND_FLOORS` and carries its own
    -- reversal trigger there.
    constraint session_composite_score_passes_floors_ascend
        check (
            elevated_floor >= 1
            and elevated_floor < high_floor
            and high_floor < extreme_floor
            and extreme_floor <= 100
        )
);
