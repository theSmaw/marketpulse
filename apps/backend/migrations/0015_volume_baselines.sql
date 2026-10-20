-- 0015_volume_baselines — the 60-session median volume of one minute of each
-- 5-minute time of day, per security, ON THE IEX TAPE, keyed by the session it
-- is FOR, plus one row per pass recording what the pass saw (Task 5.5.3).
--
-- **These are the schema's FOURTH and FIFTH DERIVED tables**, and the
-- distinction is the most important line in the file: every non-derived table
-- here holds something we were told (a bar, a membership, a coverage claim).
-- These two hold something computed from `market_bars` and `return_baselines`,
-- and they can be thrown away and rebuilt. See §1.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision these inherit: computed nightly, keyed by the session it is
-- FOR. `0013_return_baselines.sql` is the pattern and `0014`'s pass row is the
-- generalisation; where this file is silent those two are the argument.
--
-- **Two tables in one migration, and the second is `0014`'s own
-- generalisation rather than a convenience**: *an aggregate keyed by its
-- session needs a companion row for what the pass saw, because the absence of
-- rows is indistinguishable from the absence of a pass.* It bites harder here
-- than it did there. A security with no `iex` bar in the window gets **no
-- row** (§4), and on the `iex` tape that is **essentially every security for
-- weeks** — Gate 1 decision 1 accepted it explicitly — so the ordinary state
-- of this table for some time is *empty*, which is exactly the state the
-- figure's own depth sentence has to stay honest in.
--
-- ============================================================================
-- 1. DERIVED AND RECOMPUTABLE — SAID HERE, IN `schema.ts`, AND IN THE ADR
-- ============================================================================
--
-- **Recompute command: `pnpm baselines`.** The same command, because this is
-- the same pass: `0014` §1's argument unchanged. One security's 60-session
-- window is 538 correlated blocks (11.78 s warm for the universe), and the
-- volume read is a second statement over **that same index range** rather than
-- a second nightly job over the same bars.
--
-- Dropping every row in either table loses nothing that cannot be rebuilt from
-- `market_bars`, and the nightly job in `.github/workflows/backfill.yml`
-- rebuilds the newest generation on its own the following night.
--
-- It is said in three places on purpose. A table nobody has labelled is a
-- table the next reader treats as primary — and the specific cost is named in
-- `0013` §1: a later story that wants to change the bucket width, the tape, the
-- lookback or the precision target would believe it had to migrate the rows
-- rather than delete and re-run them, and would write an expensive backfill
-- against a table whose whole content is a cache.
--
-- ============================================================================
-- 2. `observed_at` IS THE WINDOW'S END, AND IT TAKES NO DEFAULT
-- ============================================================================
--
-- Both tables are **keyed by the session they are FOR** — the instant the last
-- session of the window closed, exclusive, which is
-- `bar_coverage.covered_end`'s and `return_baselines.observed_at`'s
-- convention. The session a reader asks about is `marketDateAt(observed_at)`,
-- through the one module permitted to convert an instant to a market-local
-- date.
--
-- **No default**, for `0002`'s decision 3 reason: a `default now()` on the
-- column a replay keys on turns *when the window ended* into *when a script
-- ran*, invisibly, because every row would look plausible. It is `not null`
-- and the pass supplies it.
--
-- Taking `README.md` §2's reserved name means Epic 13's generic predicate —
-- `where "observed_at" <= $clock` — **covers both of these tables with no
-- explicit clock argument**, which is `0013` §2's argument unchanged and is
-- invariant 4's own bar.
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
-- `timeout 120` is not engaged. `0014` measured the same shape at **9–14 ms**.
--
-- **And there is NO `ALTER TABLE` on `market_bars`, on `securities`, on
-- `return_baselines` or on either of `0014`'s tables, ever.** `market_bars`
-- has a live writer running once a minute for six and a half hours a day
-- inside the deploy window (`live-bar-writer.ts`), and Task 3.7.6 measured an
-- `ACCESS EXCLUSIVE` migration waiting **18.16 s** behind one open write
-- transaction with an ordinary chart read waiting **16.16 s** behind *it*,
-- against a 0.09 s baseline. The foreign key below takes `SHARE ROW
-- EXCLUSIVE` on `securities` to install its triggers, which conflicts with
-- neither a read's `ACCESS SHARE` nor a child insert's `ROW SHARE` — `0012` §1
-- has the full argument.
--
-- **In particular `return_baselines` is NOT extended, and the obvious
-- alternative was refused for three reasons rather than one** (Story 5.5's
-- Gate 1). That table has **no `feed` column** — the return baseline's tape is
-- a serving-path constant, `BASELINE_FEED = 'sip'` — so extending it means one
-- row holding a `sip` distribution and an `iex` distribution with nothing
-- saying which; it would have to **weaken the shipped
-- `return_baselines_one_answer` check**, which is the constraint that makes a
-- refusal beside stale breakpoints unrepresentable; and it would duplicate
-- `sample_count` and `refusal`, because a security can be price-refused
-- (`CRWD`, a 4:1 split) and volume-fine or the reverse. **A second table does
-- not imply a second pass**, which is §1.
--
-- ============================================================================
-- 4. THE TAPE IS IN THE KEY, WHICH IS WHERE `0013` AND `0014` DIFFER FROM THIS
-- ============================================================================
--
-- `return_baselines` records no tape at all and `session_return_percentiles`
-- records it as an attribute of the pass. Here it is part of the **natural
-- key**, `(security_id, observed_at, feed)`, and the reason is Gate 1 decision
-- 1 and its reversal trigger.
--
-- The numerator this baseline is divided into is the **live IEX socket's own
-- volume**, so the baseline is `iex` or the figure is refused — an IEX
-- numerator over a consolidated-tape baseline is systematically far below 1
-- regardless of how unusual the volume is, which Task 5.5.2 measured as two
-- separate ratios for this reason. But that decision has a stated reversal
-- trigger (*the first session on which the counted `n` meets the floor for
-- fewer securities than the previous session*), and a flip would otherwise
-- **silently update every row in place** with nothing recording that the
-- distribution underneath changed tape. With `feed` in the key the two
-- generations coexist, no widening migration is ever needed, and invariant 6 is
-- satisfied in a column rather than by a constant somewhere in the serving
-- path.
--
-- ============================================================================
-- 5. A REFUSED SECURITY IS A ROW. A SECURITY WE HAVE NEVER HEARD IEX FOR IS NOT
-- ============================================================================
--
-- `0013` §4's rule, with the one difference the tape forces.
--
-- A refusal is a first-class outcome (invariant 5, ADR 0029), so it is a ROW
-- rather than an absent row: *the pass has not reached this security* and *the
-- pass reached it and will not answer* are different facts, and only the second
-- is safe to stop retrying. `volume_baselines_one_answer` makes *buckets and a
-- refusal* and *neither* both unrepresentable, which is the constraint a
-- re-implementer cannot route around.
--
-- **The one stored refusal is `split-discontinuity`, and it is READ rather
-- than re-derived** (Gate 1's false premise 9). The price pass's guard is a
-- ratio over two **closes** at a session boundary; volume legitimately moves
-- 10× day to day, so there is no analogous clean overnight ratio to threshold
-- at all. A split breaks volume **harder** than price — the share count
-- multiplies by exactly the factor the price divides by, so an unadjusted 10:1
-- split is a **+900%** volume figure — so the verdict for the same
-- `(security_id, observed_at)` is inherited, by name, from the generation this
-- pass is holding.
--
-- **And a security with no `iex` bar in the window gets NO ROW, even when the
-- price pass refused it** — which is the opposite precedence from
-- `returnBaselineOf`, and `volume-baseline.ts` says why. The split verdict
-- arrives from the consolidated tape's closes while the samples are IEX's, so a
-- refusal row for a security we have never heard IEX for would claim we hold a
-- volume baseline position we do not. The reader is told
-- `no-same-tape-baseline`, which is the more informative of the two and is
-- **not** the same sentence as *the history is too short*.
--
-- **Every other refusal in the vocabulary is decided when the row is READ**,
-- and that is the same call `BASELINE_MINIMUM_SAMPLE` records: the pass stores
-- what it counted and the bound is a statement about what may be **printed**,
-- so moving the precision target is a deploy rather than a recompute of 516
-- securities, and a generation computed before the target existed is refused
-- without being recomputed. `VOLUME_BASELINE_REFUSALS` in
-- `volume-baseline.ts` is the whole list and names the producer of each.
--
-- ============================================================================
-- 6. THREE PARALLEL ARRAYS, AND WHY THAT IS NOT `0013` §5'S FLOAT RULE
-- ============================================================================
--
-- One row holds `bucket_count` buckets as three aligned arrays — the median,
-- the counted `n`, and the achieved relative standard error — rather than one
-- row per bucket. The arithmetic: 78 buckets × 516 securities is **~322 KB**
-- an array and **~966 KB** for all three, against **40,248 rows a session**
-- and ~10 M rows a year for the per-bucket shape, which would break the
-- no-index argument `0013` §6 and `bar_coverage` both rest on (*a table
-- measured in tens of thousands of rows a year*).
--
-- **`double precision` for the median and the error ARRAYS, and that is not a
-- breach of README §4.** That rule exists because **float addition is not
-- associative** — a sum can disagree with itself between two renders because a
-- query plan changed the order. A bucket median is neither money nor a price,
-- and **nothing here is summed in SQL**: the aggregation is a **sort** (order
-- statistics, exact and order-independent whatever the element type) and the
-- error is one division. `0013` §5 is the long version. The alternative, 78
-- `numeric` values a security, is several times the bytes and a parse per
-- element on every refresh of a map the serving path reads.
--
-- **The same argument does NOT reach a scalar, and that is a mechanical fact
-- rather than a judgement.** `migrate.database.test.ts` carries *has no
-- floating-point column anywhere* with no exemption mechanism, and it reads
-- `information_schema.columns.data_type` — which is `ARRAY` for a
-- `double precision[]` and `double precision` for a scalar. So `0013`'s
-- `breakpoints` and these three arrays escape it by their type's own shape,
-- and the pass row's precision target is `numeric(18, 6)`. The first draft of
-- this file had it as a float and that suite is what said so.
--
-- **`bucket_samples` is a `bigint[]` and README §4's rule is honoured in
-- substance rather than by its name.** It is a per-bucket **count**, so it is a
-- `bigint`; the plural name does not trip `migrate.database.test.ts`' sweep
-- over columns ending `_count`, which is a sweep over scalar columns and has no
-- opinion about arrays. A `0` element is legal and true — a bucket of a
-- time of day this security has never traded in.
--
-- **`volume_baselines_bucket_arity` holds all three arrays to
-- `bucket_count`.** An array column has no arity of its own (`0013` §5's
-- reason for its own 101 check), and three arrays that can disagree in length
-- is a bucket index that means a different time of day in each of them —
-- which reads as a plausible figure for the wrong five minutes and is
-- detectable by nothing else.
--
-- ============================================================================
-- 7. WHAT THESE FILES DELIBERATELY DO NOT HAVE
-- ============================================================================
--
-- **No index beyond the ones the constraints build.** README's rule: an index
-- chosen before there is a query to serve is a guess with a write cost. The
-- reads this table will have are *the newest generation at or before an
-- instant* and *every security's row for that generation*, and
-- `(security_id, observed_at, feed)`'s own btree leads with the column the
-- foreign key needs. **The condition for adding an `(observed_at)`-leading
-- index is a reader that issues the generation read at a cadence rather than
-- once a quarter hour**, with the plan written down beside it — which is
-- `0013` §6's condition and `return-baseline-cache.ts`' 15-minute floor's,
-- inherited here.
--
-- **No foreign key from a baseline to its pass row.** `0014` §6's reasoning
-- unchanged: the two are written in one loop and read as a pair, and the key
-- would be a second unique constraint's worth of triggers for a relationship
-- the reader establishes by equality.
--
-- **No `on delete` on the foreign key**, which is `market_bars`', `0013`'s and
-- `0014`'s decision: the database refuses a delete that would orphan a
-- baseline rather than cascading it away. Nothing in this repository deletes a
-- security.
--
-- **No `updated_at`.** A re-run of the same generation UPDATES both rows and
-- `recorded_at` already answers *when we wrote what is there now*, because for
-- a derived row "when we wrote it" and "when we last wrote it" are the same
-- question.
--
-- **No check pinning `bucket_minutes` to 5, `lookback_sessions` to 60 or the
-- target to 0.05.** All three are constants in the code and stored per row so
-- that a generation computed under different parameters is readable as such
-- rather than silently comparable to one that was not. Pinning any of them in
-- a constraint would make changing it a migration against a table whose whole
-- content is a cache, which is §1's named mistake.

create table volume_baselines (
    -- README §3's rule with no exception: a surrogate `bigint` identity key,
    -- with the natural key beside it as a unique constraint.
    id bigint generated always as identity primary key,

    -- The security this baseline describes. A real foreign key with no
    -- `on delete`; §7.
    security_id bigint not null references securities (id),

    -- **The window's END** — the instant the last session it was computed over
    -- closed, and the coordinate a replay keys on. **NO DEFAULT**; see §2.
    observed_at timestamptz not null,

    -- **The tape, in the KEY** — `VOLUME_BASELINE_FEED = 'iex'` today. §4 is
    -- the whole argument, and it is invariant 6 in a column: a distribution
    -- whose tape nothing records is one the screen cannot attribute.
    feed text not null,

    -- How many trading sessions the window spanned — 60 today,
    -- `BASELINE_LOOKBACK_SESSIONS`, read through `baselineWindowEndingAt`
    -- rather than counted again here.
    lookback_sessions integer not null,

    -- The grid's stride in minutes — `SAMPLE_SPAN_MINUTES`, 5, the same five
    -- the return baseline's anchors step by (Gate 1 decision 4: one span
    -- serves both). The sample inside a bucket is **one minute**, not the
    -- bucket's sum, which is what puts `n` in the thousands rather than at the
    -- ~18 session sums `4.1×` would otherwise mean `2.9–5.3×` from.
    bucket_minutes integer not null,

    -- How many buckets the window's grid has: the **maximum** over its
    -- sessions, so 78 for a window of regular sessions and 42 for one of half
    -- days. Stored because it is the three arrays' arity and §6's check needs
    -- a column to compare against.
    bucket_count bigint not null,

    -- **`n` over the whole window, COUNTED.** `60 × 5` is wrong three ways:
    -- an early close has 42 buckets rather than 78, the `iex` tape's median
    -- per-symbol minute presence is 65.1%, and the window reaches back past
    -- the live writer's 2026-09-23. A refused row carries the count it reached,
    -- because *how much we had* is the first question asked of a refusal.
    sample_count bigint not null,

    -- **The median volume of ONE MINUTE of each time of day**, bucket 0 first.
    -- `null` for a bucket holding no sample at all — a different fact from a
    -- bucket holding too few, which `bucket_samples` is what tells apart.
    -- The whole array is `null` exactly when this row is a refusal; §5, §6.
    bucket_medians double precision[],

    -- **Each bucket's counted `n`**, aligned with the array above. A `bigint[]`
    -- because these are counts; §6 on the name.
    bucket_samples bigint[],

    -- **Each bucket's achieved relative standard error** — `√(π/2)·CV/√n`,
    -- with the CV measured over that bucket's own samples. `null` for a bucket
    -- with no measurable spread, which means *unknown* rather than *fine*: a
    -- CV of zero is a licence to print any figure from any sample.
    --
    -- The error rather than the CV, because the error is the quantity the
    -- printed precision is read against — and storing it is what lets the
    -- bound move in a deploy (§5). The CV is recoverable as
    -- `error·√n / √(π/2)` where somebody wants it.
    bucket_errors double precision[],

    -- Why there is no distribution, or `null`. One member — §5, and
    -- `VOLUME_BASELINE_STORED_REFUSALS` in `volume-baseline.ts` is the
    -- vocabulary this constraint backstops.
    refusal text,

    -- When we wrote this row. `now()` is transaction start time, so one pass's
    -- rows share one value.
    recorded_at timestamptz not null default now(),

    -- The natural key, with the tape in it; §4. A second pass over the same
    -- window and tape updates rather than appending, which is what makes
    -- `pnpm baselines` re-runnable and convergent in `pnpm universe`'s sense.
    constraint volume_baselines_unique_generation
        unique (security_id, observed_at, feed),

    -- **Exactly one of the two answers.** See §5: this is what makes a refusal
    -- beside stale buckets unrepresentable.
    constraint volume_baselines_one_answer
        check ((bucket_medians is null) <> (refusal is null)),

    -- The three arrays arrive and leave together. A row with medians and no
    -- counts is a distribution with no `n`, which no surface may print.
    constraint volume_baselines_arrays_agree
        check (
            (bucket_medians is null) = (bucket_samples is null)
            and (bucket_medians is null) = (bucket_errors is null)
        ),

    -- §6: an array column has no arity, and three that can disagree is a
    -- bucket index meaning a different time of day in each.
    constraint volume_baselines_bucket_arity
        check (
            bucket_medians is null
            or (
                array_length(bucket_medians, 1) = bucket_count
                and array_length(bucket_samples, 1) = bucket_count
                and array_length(bucket_errors, 1) = bucket_count
            )
        ),

    -- `MARKET_FEEDS` is the vocabulary and this is the database's backstop
    -- against a writer that bypassed it — `0002`'s decision 1 is why it is
    -- `text` + `check` rather than an `enum`, and `0010_market_bars_feed.sql`
    -- is the same pair on the same vocabulary.
    constraint volume_baselines_feed_known
        check (feed in ('sip', 'iex')),

    constraint volume_baselines_refusal_known
        check (refusal is null or refusal in ('split-discontinuity')),

    -- **`0` is NOT legal on a row.** A security the pass found no `iex` minute
    -- for has no row at all (§5), so a stored `sample_count` of zero would be
    -- a generation claiming to describe a tape it never heard — which is
    -- exactly the sentence `no-same-tape-baseline` exists to say instead.
    constraint volume_baselines_sample_count_positive
        check (sample_count > 0),

    constraint volume_baselines_bucket_count_positive
        check (bucket_count > 0),

    constraint volume_baselines_lookback_positive
        check (lookback_sessions > 0),

    constraint volume_baselines_bucket_minutes_positive
        check (bucket_minutes > 0)
);

create table volume_baseline_passes (
    id bigint generated always as identity primary key,

    -- **The window's end**, and with the tape the natural key: one pass per
    -- window per tape. **NO DEFAULT**; see §2.
    observed_at timestamptz not null,
    feed text not null,

    -- **The three security populations, which PARTITION rather than nest** —
    -- and that is the difference from `0014`'s three. Every tracked security
    -- ends in exactly one of them: it has a baseline, it was refused for a
    -- price break it inherited, or we have never heard this tape for it. The
    -- check below is the partition in the database, because *how many
    -- securities can this figure be drawn for at all* is the question the
    -- depth sentence answers and a reader cannot subtract it out of three
    -- figures that overlap.
    tracked_count bigint not null,
    measured_count bigint not null,
    split_discontinuity_count bigint not null,
    absent_count bigint not null,

    -- **The bucket populations, which also partition** — over the buckets of
    -- the measured securities that hold at least one minute sample. A bucket
    -- is drawable, too thin to print to one decimal, or typically empty of
    -- shares; `empty_bucket_count` is the fourth and is counted separately
    -- because a bucket with no sample at all is a fact about the **grid** (an
    -- early close's afternoon) rather than about the security.
    bucket_count bigint not null,
    measured_bucket_count bigint not null,
    too_few_sessions_bucket_count bigint not null,
    zero_volume_bucket_count bigint not null,
    empty_bucket_count bigint not null,

    -- **What the pass applied, not what a later bundle believes** — `0014`
    -- §5's rule: a stored row is read by a later bundle, and a rollback can
    -- put a runner and a reader two values apart.
    lookback_sessions integer not null,
    bucket_minutes integer not null,

    -- **The precision target in force when the pass ran** —
    -- `TARGET_RELATIVE_STANDARD_ERROR`, 0.05, the owner's 2026-10-20 decision
    -- that the figure keeps one decimal. The bound is applied when a row is
    -- READ (§5), so this column is what the pass's own bucket tallies above
    -- were counted against rather than a verdict binding any reader — which
    -- is the one way to tell *the target moved* from *the depth moved* between
    -- two passes.
    --
    -- **`numeric(18, 6)` and NOT `double precision`, and the first draft of
    -- this file had it the other way round.** The argument §6 makes for the
    -- arrays is sound and does not reach a **scalar**:
    -- `migrate.database.test.ts` carries *has no floating-point column
    -- anywhere*, with no exemption mechanism, and it reads
    -- `information_schema.columns.data_type` — which is `ARRAY` for a
    -- `double precision[]` and `double precision` for one of these. So the
    -- arrays escape that check by their type's own shape rather than by
    -- anybody's leave, and a scalar float is refused outright. 0.05 is exact
    -- at six decimal places and nothing sums it, so the stricter type costs
    -- nothing at all.
    target_relative_standard_error numeric(18, 6) not null,

    recorded_at timestamptz not null default now(),

    constraint volume_baseline_passes_unique_pass
        unique (observed_at, feed),

    constraint volume_baseline_passes_feed_known
        check (feed in ('sip', 'iex')),

    -- The security partition, in the database. See the columns.
    constraint volume_baseline_passes_securities_partition
        check (
            measured_count >= 0
            and split_discontinuity_count >= 0
            and absent_count >= 0
            and measured_count
                + split_discontinuity_count
                + absent_count
                = tracked_count
        ),

    -- The bucket partition. `empty_bucket_count` is outside it by
    -- construction: `bucket_count` is the sample-bearing buckets.
    constraint volume_baseline_passes_buckets_partition
        check (
            measured_bucket_count >= 0
            and too_few_sessions_bucket_count >= 0
            and zero_volume_bucket_count >= 0
            and empty_bucket_count >= 0
            and measured_bucket_count
                + too_few_sessions_bucket_count
                + zero_volume_bucket_count
                = bucket_count
        ),

    constraint volume_baseline_passes_parameters_positive
        check (
            lookback_sessions > 0
            and bucket_minutes > 0
            and target_relative_standard_error > 0
        )
);
