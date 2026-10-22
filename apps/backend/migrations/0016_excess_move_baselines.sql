-- 0016_excess_move_baselines — the 60-session distribution of |excess move|,
-- per security, per reference, keyed by the session it is FOR (Task 5.6.2).
--
-- The **excess move** is this security's five-minute return minus its sector
-- benchmark's, over the same five minutes, in percentage points. Story 5.1
-- already draws it (`behind by 2.20 pts`); this table is what makes it
-- **scoreable** — a percentile of the security's own history of it, which is
-- Story 5.6's *the one unit that needs no invented constant*.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision, **instantiated rather than extended**: nothing here is a new
-- shape. `0013` is the nearest relative and this file follows it closely; where
-- it diverges it says so and why.
--
-- **It is an EMPTY-TABLE migration**, so none of the arithmetic that governs a
-- change to `market_bars` binds: no heap pass, no validated constraint, no
-- rewrite. `create table` and two `create table`s is what `deploy.yml`'s
-- `timeout 120` sees, and the unique constraints build their indexes over zero
-- rows. **Prefer a new table to an `ALTER`** on a populated one, which is this
-- story's own instruction: `return_baselines` has no live per-minute writer,
-- but an `ACCESS EXCLUSIVE` lock with no `lock_timeout` set anywhere in this
-- repository is still a lock, and Task 3.7.6 measured an ordinary chart read
-- waiting **16.16 s** behind one.
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
-- Said in three places for `0013` §1's reason: a table nobody has labelled is a
-- table the next reader treats as primary, and would then migrate rather than
-- delete and re-run. Changing the breakpoint grid, the lookback, the split
-- ceiling, the sample rule **or the reference** is a recompute here.
--
-- ============================================================================
-- 2. `observed_at` IS THE WINDOW'S END, AND IT TAKES NO DEFAULT
-- ============================================================================
--
-- `observed_at` is the **last session close of the window the generation was
-- computed over** — supplied by the writer, every time.
--
-- **No default, and that is `0002`'s decision 3 rather than a style**:
-- `default now()` on this column silently turns *when it was true in the
-- market* into *when we wrote it*, on the one column a replay keys on. The
-- name is `observed_at` **deliberately**, diverging from ADR 0042's
-- `effective_from`, for the reason `0014` and `0015` both state: Epic 13's
-- temporal plugin narrows `observed_at` generically, so a column named
-- anything else would need that epic to know this table exists. `recorded_at`
-- is the other half and it **does** default, because it is when we wrote it.
--
-- ============================================================================
-- 3. THE REFERENCE IS IN THE KEY — ADR 0045 §3'S ARGUMENT, A NEW TARGET
-- ============================================================================
--
-- **This is the one line in the file that is not copied from `0013`.** The key
-- is `(security_id, observed_at, reference_kind, reference_symbol)`, and the
-- reason is the one that put `feed` in `0015`'s key:
--
-- > a tape choice carrying a reversal trigger can flip, and a flip against a
-- > session-only key would rewrite every row with nothing recording that the
-- > meaning changed.
--
-- Story 5.6's AC 9 is exactly that situation. The reference is **the
-- capitalisation-weighted sector SPDR**, chosen by the owner at Gate 1 over the
-- **unweighted industry peer median** — and the choice is recorded as open:
-- a sector SPDR means a mega-cap is largely being compared with itself, so a
-- small constituent's excess is structurally amplified, and **nothing has
-- measured that effect**. The day somebody measures it and switches to a peer
-- median, every stored breakpoint array changes meaning. Against a
-- reference-blind key the switch would be a silent `on conflict do update` over
-- 501 rows; against this one it is a new row beside the old, and a reader
-- holding either can say which question it answers.
--
-- **Two columns rather than one, both `not null`, and both in the key.**
--
--   - `reference_kind` — the **form** of the comparison, a closed vocabulary
--     with one member today. This is the column that carries the meaning: a
--     flip from one form to the other is what the reversal trigger fires on.
--   - `reference_symbol` — the **identity within that form**. `'XLK'` under
--     `'sector_etf'`. It is `not null` for both forms rather than nullable for
--     the one that has no fund, because an industry peer median's identity is
--     its **industry**, which `securities.industry` already names — so
--     `('industry_peer_median', 'Semiconductors')` is as nameable as
--     `('sector_etf', 'XLK')`, and the key needs no `nulls not distinct`.
--
-- A single `reference` column was rejected: `'XLK'` alone does not say whether
-- it was read as a fund's own return or as a population's median, which is the
-- whole fact the key exists to record.
--
-- ============================================================================
-- 4. A REFUSED SECURITY IS A ROW. ONE WITH NO REFERENCE AT ALL IS NOT
-- ============================================================================
--
-- `0013` §4's rule, with a **third** kind beside its two.
--
--   - **measured** — `breakpoints` set, `refusal` null.
--   - **refused** — `refusal` set, `breakpoints` null. *The pass reached this
--     security and will not answer*, and `sample_count` is carried anyway
--     because *how much did you have* is the first question asked of a refusal.
--   - **absent** — **no row**. *The pass has not reached this security*, or
--     found no grid pair at all. On CI's store — 516 securities and **zero
--     bars** — this is every security, for ever.
--   - **inapplicable** — **no row either, and it is not the same fact.** A
--     broad-market fund has no sector (4 of 516) and a sector ETF **is** its
--     own benchmark (11 of 516), so the question does not arise and no amount
--     of backfilling will ever produce a figure.
--
-- **The fourth kind is deliberately not stored**, which is the only judgement
-- in this section. It is a property of the **universe** rather than of a
-- window: `securities.kind` and `securities.sector` already carry it, a reader
-- resolves it with `excessMoveReference` in `packages/shared`, and a stored
-- copy would be a second home for a fact that has one — plus a row that goes
-- stale the day a curation changes a security's kind. What the pass does record
-- is the **count**, in `excess_move_baseline_passes.inapplicable_count`, so
-- the pass's own populations still partition.
--
-- `excess_move_baselines_one_answer` makes *both* and *neither* unrepresentable
-- for the two kinds that are rows.
--
-- ============================================================================
-- 5. TWO REFUSAL WORDS, BECAUSE THERE ARE TWO LEGS
-- ============================================================================
--
-- `excess_move_baselines_refusal_known` admits two:
--
--   - `split-discontinuity` — **the subject's** own history crosses a
--     session-boundary jump beyond `SPLIT_DISCONTINUITY_RATIO`. Read from the
--     price pass's verdict for the same `(security, window end)` rather than
--     re-derived, which is `0015`'s arrangement and the same argument: it is
--     the same guard over the same closes, and a second evaluation is a second
--     answer. It refused **5 of 516** on the real store.
--   - `reference-split-discontinuity` — **the benchmark's** history crosses
--     one. A separate word rather than a shared one, because the two are
--     different sentences to a reader of a security page and are repaired in
--     different places: the second refuses every constituent of that sector at
--     once and says nothing whatever about the security on screen. Story 5.5's
--     hand-off item 3 is this lesson one factor over —
--     `too-few-sessions` against `no-same-tape-baseline` is *a wait* against
--     *a gap in our listening*, and collapsing a pair like that throws away the
--     only information a reader could act on.
--
-- **The guard runs on both legs and the subject's is inherited rather than
-- repeated.** An unadjusted split poisons the excess identically whichever side
-- it is on: a −50% overnight "return" on either leg is a −50% or +50% "excess".
--
-- ============================================================================
-- 6. `breakpoints` IS `double precision[]`, AND THAT IS NOW AN ARGUED EXEMPTION
-- ============================================================================
--
-- `0013` §5's argument applies unchanged and is not restated: order statistics
-- are exact and order-independent whatever the element type, nothing in the
-- sampler is summed, and `numeric[]` would cost storage and arithmetic for an
-- exactness that is meaningless in a distribution.
--
-- **What is new is that the exemption is now stated rather than accidental.**
-- `migrate.database.test.ts` carries *has no floating-point column anywhere*
-- and reads `information_schema.columns.data_type`, which returns **`ARRAY`**
-- for a `double precision[]` — so `0013`'s and `0015`'s approximate arrays sat
-- inside that rule **by their type's shape rather than by anybody's leave**,
-- recorded in `docs/GAPS.md` as a blind spot. This is the **fourth** such
-- column, which is the condition that entry needed: the check now reads
-- `udt_name`, sees every array, and holds a named allowlist of the four with a
-- reason beside each. This column is on it.
--
-- ============================================================================
-- 7. WHAT THIS FILE DELIBERATELY DOES NOT HAVE
-- ============================================================================
--
-- **No index beyond the two unique constraints.** Every read is either
-- `max(observed_at)` over a few hundred rows or the whole generation at one
-- instant, which is `0013`'s shape and is served by the unique index's leading
-- column. An index nobody has measured a need for is a write cost on a nightly
-- pass and a thing to drop later.
--
-- **No `security_id` on the pass table.** It is one row per pass, which is
-- `0014` and `0015`'s shape.
--
-- **No session-basis score table, and that was settled before this file was
-- written.** The architect's Gate 1 question — *is the session relative move
-- derivable from stored closes* — is answered yes: `closesAsOf(session)` takes
-- the session as an explicit argument and reads the `1d` timeframe, and both
-- legs are ordinary rows in `market_bars`. So the only thing with nowhere to
-- live is the 60-session distribution, and the session-basis excess is computed
-- on read. `0014` exists because a **ranking** needs every security's figure at
-- once; nothing here ranks.
--
-- **No `feed` column**, which is where this diverges from `0015`. Both legs are
-- read on the one tape `BASELINE_FEED` names, and a ratio of two returns on one
-- tape is scale-free — ADR 0045's own test, and the reason that ADR permits
-- this comparison at all. The day a leg is read on a second tape, this table
-- gains a column and `0015`'s argument for putting it in the key applies.

create table excess_move_baselines (
    id bigint generated always as identity primary key,
    security_id bigint not null references securities (id),

    -- The window's end — the session close instant the generation is FOR.
    -- No default: §2.
    observed_at timestamptz not null,

    -- §3. The form of the comparison, and its identity within that form.
    reference_kind text not null,
    reference_symbol text not null,

    lookback_sessions integer not null,

    -- The counted `n` — pairs the pass FOUND on both legs, never `60 × 77`.
    -- A refused row carries one too: §4.
    sample_count bigint not null,

    -- 101 ascending magnitudes of |excess|, in percentage points. §6.
    breakpoints double precision[],

    refusal text,

    recorded_at timestamptz not null default now(),

    constraint excess_move_baselines_unique_generation
        unique (security_id, observed_at, reference_kind, reference_symbol),
    constraint excess_move_baselines_one_answer
        check ((breakpoints is null) <> (refusal is null)),
    constraint excess_move_baselines_refusal_known
        check (
            refusal is null
            or refusal in ('split-discontinuity', 'reference-split-discontinuity')
        ),
    constraint excess_move_baselines_reference_kind_known
        check (reference_kind in ('sector_etf')),
    constraint excess_move_baselines_reference_symbol_present
        check (reference_symbol <> ''),
    constraint excess_move_baselines_breakpoint_count
        check (breakpoints is null or array_length(breakpoints, 1) = 101),
    constraint excess_move_baselines_sample_count_non_negative
        check (sample_count >= 0),
    constraint excess_move_baselines_lookback_positive
        check (lookback_sessions > 0)
);

-- One row per pass, so the populations a surface states are **counted by the
-- pass** rather than re-derived from the rows it wrote. ADR 0044's 2026-10-16
-- amendment, third application — `0014` and `0015` both have one, and the
-- amendment's own point is that the generalisation is worth more than any one
-- table: a surface that said *scored 487 of 501* by counting rows would be
-- counting the rows that **survived**, and a pass that died mid-loop would make
-- that sentence quietly wrong.
--
-- **The four security populations PARTITION rather than nest**, which is
-- `0015` §5's shape and not `0014`'s: every tracked security ends in exactly
-- one of *measured*, *refused*, *inapplicable* and *absent*, and
-- `excess_move_baseline_passes_securities_partition` holds the arithmetic in
-- the database. A reader cannot subtract *how many securities can this factor
-- be drawn for* out of four figures that overlap.
--
-- The two refusal counts are **inside** `refused_count` rather than beside it,
-- and are therefore constrained to sum to it: they are a breakdown of one
-- population, not two more populations.
create table excess_move_baseline_passes (
    id bigint generated always as identity primary key,

    observed_at timestamptz not null,

    reference_kind text not null,

    tracked_count bigint not null,
    measured_count bigint not null,
    refused_count bigint not null,
    -- §4's fourth kind, counted here because it is not a row.
    inapplicable_count bigint not null,
    absent_count bigint not null,

    -- The breakdown of `refused_count`. §5.
    split_discontinuity_count bigint not null,
    reference_split_discontinuity_count bigint not null,

    lookback_sessions integer not null,
    span_minutes integer not null,
    baseline_feed text not null,
    minimum_sample_count bigint not null,

    recorded_at timestamptz not null default now(),

    constraint excess_move_baseline_passes_unique_pass
        unique (observed_at, reference_kind),
    constraint excess_move_baseline_passes_reference_kind_known
        check (reference_kind in ('sector_etf')),
    constraint excess_move_baseline_passes_feed_known
        check (baseline_feed in ('sip', 'iex')),
    constraint excess_move_baseline_passes_securities_partition
        check (
            measured_count >= 0
            and refused_count >= 0
            and inapplicable_count >= 0
            and absent_count >= 0
            and measured_count
                + refused_count
                + inapplicable_count
                + absent_count
                = tracked_count
        ),
    constraint excess_move_baseline_passes_refusals_partition
        check (
            split_discontinuity_count >= 0
            and reference_split_discontinuity_count >= 0
            and split_discontinuity_count
                + reference_split_discontinuity_count
                = refused_count
        ),
    constraint excess_move_baseline_passes_parameters_positive
        check (
            lookback_sessions > 0
            and span_minutes > 0
            and minimum_sample_count > 0
        )
);
