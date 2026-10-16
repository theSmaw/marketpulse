-- 0014_session_return_percentiles — where each security's CLOSING 5-minute
-- return sat in its own 60-session history, for one completed session, plus
-- one row per pass recording the populations and the refusals (Task 5.4.5).
--
-- **These are the schema's SECOND and THIRD DERIVED tables**, and the
-- distinction is the most important line in the file: every non-derived table
-- here holds something we were told (a bar, a membership, a coverage claim).
-- These two hold something computed from `market_bars` and `return_baselines`,
-- and they can be thrown away and rebuilt. See §1.
--
-- **Two tables in one migration, and the second is not a convenience.** A
-- scored security is a row and a **refused** security is NOT (§4), so the
-- counts a reader is owed — *how many we track, how many had a measurable
-- closing move, how many could be ranked, and why the rest could not* — are
-- facts about **the pass** rather than about any security. On the session the
-- store holds nothing rankable there are no score rows at all, and that is
-- exactly the session whose footer has to stay honest.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision these inherit: computed nightly, keyed by the session it is
-- FOR. `0013_return_baselines.sql` is the pattern mirrored here, section for
-- section, and where this file is silent that one is the argument.
--
-- ============================================================================
-- 1. DERIVED AND RECOMPUTABLE — SAID HERE, IN `schema.ts`, AND IN THE ADR
-- ============================================================================
--
-- **Recompute command: `pnpm baselines`.** The same command, because this is
-- the same pass: the closing return is a **by-product** of a read that is
-- already running (one security's 60-session window is 538 correlated blocks,
-- measured at 11.78 s warm for the universe), and a second nightly job over
-- the same bars would double the I/O to compute something the first pass is
-- holding in memory.
--
-- Dropping every row in either table loses nothing that cannot be rebuilt from
-- `market_bars`, and the nightly job in `.github/workflows/backfill.yml`
-- rebuilds the newest session on its own the following night.
--
-- It is said in three places on purpose. A table nobody has labelled is a
-- table the next reader treats as primary — and the specific cost is named in
-- `0013` §1: a later story that wants to change the ranking rule, the row
-- budget, the sample bound or which pair of the session is scored would
-- believe it had to migrate the rows rather than delete and re-run them, and
-- would write an expensive backfill against a table whose whole content is a
-- cache.
--
-- ============================================================================
-- 2. `observed_at` IS THE SCORED SESSION'S CLOSE, AND IT TAKES NO DEFAULT
-- ============================================================================
--
-- Both tables are **keyed by the session they are FOR** — the instant that
-- session closed, exclusive, which is `bar_coverage.covered_end`'s and
-- `return_baselines.observed_at`'s convention. The session a reader asks about
-- is `marketDateAt(observed_at)`, through the one module permitted to convert
-- an instant to a market-local date.
--
-- **No default**, for `0002`'s decision 3 reason: a `default now()` on the
-- column a replay keys on turns *the session this describes* into *when a
-- script ran*, invisibly, because every row would look plausible. It is
-- `not null` and the pass supplies it.
--
-- Taking `README.md` §2's reserved name means Epic 13's generic predicate —
-- `where "observed_at" <= $clock` — **covers both of these tables with no
-- explicit clock argument**, which is `0013` §2's argument unchanged and is
-- invariant 4's own bar. A replay at any instant sees exactly the sessions that
-- had already closed.
--
-- `recorded_at` is `not null default now()` — README §2's pair, transaction
-- start time — and it is what makes a **re-run** visible: a row whose
-- `observed_at` is last Friday's close and whose `recorded_at` is this morning
-- was recomputed.
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
-- **And there is NO `ALTER TABLE` on `market_bars`, on `securities` or on
-- `return_baselines`, ever.** `market_bars` has a live writer running once a
-- minute for six and a half hours a day inside the deploy window
-- (`live-bar-writer.ts`), and Task 3.7.6 measured an `ACCESS EXCLUSIVE`
-- migration waiting **18.16 s** behind one open write transaction with an
-- ordinary chart read waiting **16.16 s** behind *it*, against a 0.09 s
-- baseline. The foreign key below takes `SHARE ROW EXCLUSIVE` on `securities`
-- to install its triggers, which conflicts with neither a read's `ACCESS
-- SHARE` nor a child insert's `ROW SHARE` — `0012` §1 has the full argument.
--
-- ============================================================================
-- 4. A ROW IS A SCORE. A REFUSED SECURITY HAS NO ROW, AND IS COUNTED INSTEAD
-- ============================================================================
--
-- This is the one place these tables **diverge from `0013`**, and the
-- divergence is deliberate rather than inherited.
--
-- `return_baselines` makes a refusal a ROW, because *the pass has not reached
-- this security* and *the pass reached it and will not answer* are different
-- facts and only the second is safe to stop retrying — a baseline is a thing a
-- later pass can be asked for again.
--
-- A session score is not. It is the input to a **ranked list of ten**, and ADR
-- 0038 decision 5's rule at the row grain is that a required figure which
-- cannot be honestly produced drops the whole row: there is no `rank: null`, no
-- `?? 0` and no unranked tail, because a `null` under a `"number"` reaches a
-- lenient reader as `0` and `0` is a plausible 0th percentile — the most
-- ordinary move on record, drawn at the top of a region about unusual ones.
--
-- So the five refusal kinds are **counted on the pass row**, by name, and the
-- arithmetic a reader is owed (`eligible − scored`) is a subtraction over
-- figures rather than a scan for sentinels. The vocabulary is two closed unions
-- in `packages/shared` (`ReturnRefusal`, `PercentileRefusal`) and these are
-- five columns rather than a `jsonb` bag so that a sixth member is `0003`'s
-- drop-check/add-check pair — a migration somebody has to write — instead of a
-- key that silently stops being counted.
--
-- ============================================================================
-- 5. WHAT THE PASS APPLIED IS STORED, NOT WHAT A LATER BUNDLE BELIEVES
-- ============================================================================
--
-- `span_minutes`, `baseline_span_minutes`, `baseline_feed`,
-- `baseline_lookback_sessions` and `minimum_sample_count` are all on the pass
-- row, and every one of them exists in a constant in `packages/shared` as well.
-- That is not duplication: a stored row is read **by a later bundle**, and a
-- rollback can put a runner and a reader two values apart —
-- `WireRefusedPercentile.minimumSampleCount`'s recorded reason. The figure the
-- screen states must be the one the producer applied, so it travels with the
-- rows it qualifies.
--
-- **`baseline_feed` is invariant 6 in a column.** The numerator is `iex` by
-- construction on the live path and `sip` here; the distribution is `sip` on
-- both. A comparison whose tape nothing records is one the screen cannot
-- attribute, and provenance is *displayed, never implied*.
--
-- **The generation ranked against is IDENTIFIED rather than copied.** It is the
-- `return_baselines` row keyed `(security_id, observed_at)` with the **same**
-- `observed_at` as the score — the pass ranks each closing move against the
-- generation whose window ends at the session being scored, because that is the
-- generation it has in hand, and a second timestamptz column holding a copy of
-- this one would be a fact with two homes. What is NOT derivable is the depth,
-- so `baseline_lookback_sessions` is stored.
--
-- One consequence, stated because it is a real difference from the live path
-- and nothing on screen says it: that window **contains** the sample being
-- ranked, so a session score cannot exceed its own distribution's maximum and
-- `above_sample` is `false` on every row this pass writes. The live path ranks
-- a move the stored window cannot contain and reaches `>99th`. The column
-- exists on both because the wire shape is one shape.
--
-- ============================================================================
-- 6. WHAT THESE FILES DELIBERATELY DO NOT HAVE
-- ============================================================================
--
-- **No index beyond the ones the constraints build.** README's rule: an index
-- chosen before there is a query to serve is a guess with a write cost. There
-- are exactly two reads — *the newest pass at or before an instant* and *every
-- score row of that pass* — and `session_return_percentiles`' unique btree
-- `(security_id, observed_at)` does not lead with the column the second one
-- bounds on. That is `bar_coverage`'s argument (Task 2.8.4) rather than
-- `market_bars`': at one row per equity per session this table gains ~501 rows
-- a session and is measured in tens of thousands of rows a year, so the read is
-- a scan of a small table rather than of a 5 GB heap. **The condition for
-- adding an `(observed_at)`-leading index is a reader that issues the session
-- read at a cadence rather than once a quarter hour**, with the plan written
-- down beside it — which is `return-baseline-cache.ts`' 15-minute floor's own
-- condition, inherited here.
--
-- **No foreign key from the score to the pass.** The two are written in one
-- loop and read as a pair, and the key would be `(observed_at)` → a second
-- unique constraint's worth of triggers on the hot write path for a
-- relationship the reader establishes by equality. What stands instead is the
-- **reader**: `session-percentile-store.ts` reads the pass row first and the
-- score rows for its `observed_at`, so a session with scores and no pass row
-- is invisible rather than half-drawn — which is what a partially-failed pass
-- leaves behind.
--
-- **No `on delete` on the foreign key**, which is `market_bars`' and `0013`'s
-- decision: the database refuses a delete that would orphan a score rather than
-- cascading it away. Nothing in this repository deletes a security.
--
-- **No `updated_at`.** A re-run of the same session UPDATES both rows — these
-- are the second and third mutable tables in this schema — and `recorded_at`
-- already answers *when we wrote what is there now*, because for a derived row
-- "when we wrote it" and "when we last wrote it" are the same question.

create table session_return_percentiles (
    -- README §3's rule with no exception: a surrogate `bigint` identity key,
    -- with the natural key beside it as a unique constraint.
    id bigint generated always as identity primary key,

    -- The security this score is about. A real foreign key with no
    -- `on delete`; §6.
    security_id bigint not null references securities (id),

    -- **The scored session's close** — the coordinate a replay keys on.
    -- **NO DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **The integer ordinal, `0` through `99`.** `returnPercentileOf`'s own
    -- figure and its own bounds: the precision is an integer because the
    -- binomial standard error at the 99th of n = 4,620 is 0.146 points, and
    -- `100` is never produced because above the highest order statistic there
    -- is no sample.
    rank integer not null,

    -- Whether the magnitude is strictly above every sample the baseline holds.
    -- `false` on every row this pass writes today — §5 says why, and the column
    -- is here because the wire shape is one shape.
    above_sample boolean not null,

    -- **`n`, COUNTED by the pass** — `return_baselines.sample_count`'s own
    -- figure for this security and this window, stored beside the ordinal it
    -- was taken against so the figure on screen needs no join. `bigint`
    -- because README §4's rule is that a count is one, enforced by
    -- `migrate.database.test.ts` on every column whose name ends `_count`.
    sample_count bigint not null,

    -- **The SIGNED move, as a percentage.** The percentile ranks
    -- `Math.abs(percent)`, so the sign is **not recoverable from the ordinal**
    -- — a −9% crash and a +9% spike produce the identical rank, and the
    -- direction glyph the row draws reads this column. `numeric(18, 6)` and
    -- never a float, README §4; nothing sums it, but nothing needs to either.
    percent numeric(18, 6) not null,

    -- **The two endpoints, with their tape** — `WireMeasuredReturn`'s rule
    -- stored: this figure may not be read without the two instants it was
    -- measured between, and a row in a list is not an exemption. The instants
    -- are the bars' own `startsAt`.
    from_at timestamptz not null,
    from_price numeric(18, 6) not null,
    from_feed text not null,
    to_at timestamptz not null,
    to_price numeric(18, 6) not null,
    to_feed text not null,

    -- How many of the span's minutes we hold a close for, `1` to
    -- `span_minutes`. `fiveMinuteReturn`'s `observed`, counted in the same walk
    -- that picked the endpoints — median stored coverage is 82.8%, so a pair
    -- exactly the span apart routinely has gaps between it.
    observed_minutes integer not null,

    -- When we wrote this row. `now()` is transaction start time, so one pass's
    -- rows share one value.
    recorded_at timestamptz not null default now(),

    -- The natural key: one score per security per session. A second pass over a
    -- session already stored updates rather than appending, which is what makes
    -- `pnpm baselines` re-runnable and convergent in `pnpm universe`'s sense.
    constraint session_return_percentiles_unique_score
        unique (security_id, observed_at),

    -- `returnPercentileOf`'s own bounds, in the database. A `140th` or a
    -- fractional ordinal draws as a confident, well-formed row at the top of a
    -- region about unusual behaviour, and nothing on the page can contradict
    -- one.
    constraint session_return_percentiles_rank_in_range
        check (rank >= 0 and rank <= 99),

    -- **`0` is NOT a legal sample on a score row**, unlike on a refusal one
    -- table over, where `0 of 2,500 returns` is the cold replica's own
    -- sentence: a row is a security that **was** ranked, and a rank taken
    -- against nothing is an ordinal over an empty distribution.
    constraint session_return_percentiles_sample_count_positive
        check (sample_count > 0),

    -- **`numeric` has a `NaN`**, and it compares equal to itself — so the
    -- idiomatic `percent = percent` would admit it. `<> 'NaN'` is the one
    -- expression that does not: a non-finite move formats and renders as the
    -- most alarming figure on the page rather than a blank one.
    constraint session_return_percentiles_percent_is_a_number
        check (percent <> 'NaN'::numeric),

    -- The vocabulary is `MARKET_FEEDS` in `packages/shared` and this is the
    -- database's backstop against a writer that bypassed it — `0002`'s
    -- decision 1 is why it is `text` + `check` rather than an `enum`, and
    -- `0010_market_bars_feed.sql` is the same pair on the same vocabulary.
    constraint session_return_percentiles_feed_known
        check (from_feed in ('sip', 'iex') and to_feed in ('sip', 'iex')),

    -- The newer endpoint is newer, which is the one property of a pair that
    -- cannot be checked anywhere else: a reversed pair divides the right two
    -- closes in the wrong order and produces a true-looking figure of the
    -- opposite sign.
    constraint session_return_percentiles_endpoints_in_order
        check (to_at > from_at),

    constraint session_return_percentiles_observed_minutes_positive
        check (observed_minutes > 0)
);

create table session_return_percentile_passes (
    id bigint generated always as identity primary key,

    -- **The scored session's close**, and the natural key: one pass per
    -- session. **NO DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **The three populations, which NEST** — `tracked ⊇ eligible ⊇ scored`.
    -- `tracked` is the equities the pass was over (501 today, never spelled);
    -- `eligible` is how many of them held two closes exactly the span apart at
    -- the session's end; `scored` is how many of those could be ranked. The
    -- score rows are a set of `scored` of them, and the region's whole claim is
    -- these three figures.
    tracked_count bigint not null,
    eligible_count bigint not null,
    scored_count bigint not null,

    -- **Why the rest are not rows, by name** — §4. The first three are
    -- `ReturnRefusal`'s members and the last two are `PercentileRefusal`'s;
    -- *we heard nothing*, *we have no close the span back*, *the basis is not a
    -- number*, *the history is too short* and *the history crosses an
    -- unadjusted price break* are five different facts with five different
    -- repairs, and one `refused: 184` would make the surface pick one.
    nothing_observed_count bigint not null,
    no_earlier_endpoint_count bigint not null,
    no_basis_count bigint not null,
    too_few_samples_count bigint not null,
    split_discontinuity_count bigint not null,

    -- The span each row's two endpoints are apart, in minutes — the measurement
    -- span, ADR 0043's second five.
    span_minutes integer not null,

    -- What the ordinals were measured against: the tape the distribution was
    -- built from, the sampler's grid stride, the depth of the window, and the
    -- bound below which the pass refused to rank. All four are what the pass
    -- applied rather than what a later bundle believes; §5.
    baseline_feed text not null,
    baseline_span_minutes integer not null,
    baseline_lookback_sessions integer not null,
    minimum_sample_count bigint not null,

    recorded_at timestamptz not null default now(),

    constraint session_return_percentile_passes_unique_session
        unique (observed_at),

    -- **The nesting, in the database.** `readUnusual` re-checks this chain at
    -- the browser's end because the region's cut sentence rests on it and a
    -- negative remainder is a count of securities that cannot exist; this is
    -- the same chain at the writer's end, where it is cheaper to be sure.
    constraint session_return_percentile_passes_populations_nest
        check (
            scored_count >= 0
            and scored_count <= eligible_count
            and eligible_count <= tracked_count
        ),

    constraint session_return_percentile_passes_refusals_non_negative
        check (
            nothing_observed_count >= 0
            and no_earlier_endpoint_count >= 0
            and no_basis_count >= 0
            and too_few_samples_count >= 0
            and split_discontinuity_count >= 0
        ),

    constraint session_return_percentile_passes_feed_known
        check (baseline_feed in ('sip', 'iex')),

    constraint session_return_percentile_passes_spans_positive
        check (
            span_minutes > 0
            and baseline_span_minutes > 0
            and baseline_lookback_sessions > 0
            and minimum_sample_count > 0
        )
);
