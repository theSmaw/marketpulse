-- 0013_return_baselines — the 60-session distribution of 5-minute returns, per
-- security, keyed by the session it is FOR (Task 5.3.2).
--
-- **This is the first DERIVED table in this schema**, and the distinction is
-- the most important line in the file: every other table here holds something
-- we were told (a bar, a membership, a coverage claim). This one holds
-- something we computed from a table we already have, and it can be thrown away
-- and rebuilt. See §1.
--
-- [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
-- is the decision. The arithmetic that produced the shape, measured cold on a
-- store holding 48,797,343 bars: one security's 60-session read is **538 blocks
-- and 24,142 rows**, so the whole universe is ~269,538 blocks ≈ 2,105 MB — 3.5
-- minutes at the deployed tier's 10 MiB/s and ~37 minutes if the fetches are
-- uncorrelated. Minutes either way, which closes the socket callback, every
-- request-response route, and a migration (`deploy.yml` gives `pnpm migrate`
-- `timeout 120`).
--
-- ============================================================================
-- 1. DERIVED AND RECOMPUTABLE — SAID HERE, IN `schema.ts`, AND IN THE ADR
-- ============================================================================
--
-- **Recompute command: `pnpm baselines`.** Dropping every row in this table
-- loses nothing that cannot be rebuilt from `market_bars`, and the nightly job
-- in `.github/workflows/backfill.yml` rebuilds the newest generation on its own
-- the following night.
--
-- It is said in three places on purpose. A table nobody has labelled is a table
-- the next reader treats as primary — and the specific cost of that mistake is
-- named: a later story that wants to change the breakpoint grid, the lookback,
-- the split ceiling or the sample rule would believe it had to migrate the rows
-- rather than delete and re-run them, and would write an expensive backfill
-- against a table whose whole content is a cache.
--
-- **It is a cache with a schema, and not a cache in memory.** Memory is
-- overwritten in place by definition, and Story 5.3's AC 2 wants the baseline
-- *addressable as of a session*, which is the coordinate a replay keys on. So
-- the session is in the KEY. What memory holds (`return-baseline-cache.ts`) is
-- the current generation only, so the serving path has nothing to await.
--
-- ============================================================================
-- 2. `observed_at` IS THE WINDOW'S END, AND THE NAME IS THE WHOLE POINT
-- ============================================================================
--
-- **This column diverges from `0012`'s decision 4 deliberately, and in the
-- opposite direction.** `security_memberships.effective_from` is NOT called
-- `observed_at` because a membership change is a fact about **us** — there is no
-- instant at which the market decided we track a symbol — and the cost recorded
-- there is that Epic 13's temporal plugin does not cover that table.
--
-- A baseline's window end is the opposite kind of fact. It **names a session of
-- market data**: the instant the last session this distribution was computed
-- over closed. So `README.md` §2's reserved name is the correct one, and taking
-- it means the plugin's generic predicate — `where "observed_at" <= $clock` —
-- **covers this table with no explicit clock argument**, which is invariant 4's
-- own bar (*structurally impossible* rather than instructed). A replay at any
-- instant sees exactly the generations whose windows had already closed, and
-- `return-baseline-cache.ts` then takes the newest of them, which is the same
-- expression it runs in production.
--
-- **No default**, for `0002`'s decision 3 reason and `market_bars`' reason: a
-- `default now()` on the column a replay keys on turns *when the window ended*
-- into *when a script ran*, invisibly, because every row would look plausible.
-- It is `not null` and the pass supplies it.
--
-- **It is the SESSION CLOSE instant, exclusive**, the same convention
-- `bar_coverage.covered_end` uses — 16:00 ET, or the calendar's early close. The
-- session date a reader asks about is `marketDateAt(observed_at)`, through the
-- one module permitted to convert an instant to a market-local date. Storing a
-- `date` instead was rejected twice over: `node-postgres` parses `date` into a
-- JS `Date` at the *process's* local midnight, and a `date` is not something a
-- plugin filtering `observed_at <= $instant` can compare.
--
-- `recorded_at` is `not null default now()` — README §2's pair, transaction
-- start time, so every row one pass writes carries the same value. It is what
-- makes a **stale generation** visible: a row whose `observed_at` is last
-- Friday's close and whose `recorded_at` is this morning was recomputed, and the
-- two together are the only way to tell that from a row nobody has touched.
--
-- ============================================================================
-- 3. METADATA-ONLY AT DEPLOY TIME
-- ============================================================================
--
-- **Every statement here is a catalogue write**, exactly as `0012` is (measured
-- there at 5.324 ms against a held lock). `CREATE TABLE` on a new relation, one
-- foreign key installing two triggers, one unique constraint on an empty table,
-- four check constraints on an empty table. No `ALTER TABLE` on a populated
-- table, no index build over a heap, no validated constraint, no backfill —
-- so README §9's 10 MiB/s arithmetic against `timeout 120` is not engaged.
--
-- **And there is NO `ALTER TABLE` on `market_bars` or on `securities`, ever.**
-- `market_bars` has a live writer running once a minute for six and a half hours
-- a day inside the deploy window (`live-bar-writer.ts`, since Task 3.8.3) and
-- `securities` is touched by every `insert into market_bars` validating its
-- foreign key; Task 3.7.6 measured an `ACCESS EXCLUSIVE` migration waiting
-- 18.16 s behind one open write transaction and an ordinary chart read waiting
-- 16.16 s behind *it*, against a 0.09 s baseline. A new table takes
-- `SHARE ROW EXCLUSIVE` on `securities` to install the key's triggers, which
-- conflicts with neither a read's `ACCESS SHARE` nor a child insert's
-- `ROW SHARE` — `0012` §1 has the full argument and this file does not repeat
-- it.
--
-- ============================================================================
-- 4. ONE ROW IS EITHER AN ANSWER OR A REFUSAL, AND THE DATABASE ENFORCES WHICH
-- ============================================================================
--
-- Story 5.3's Gate 1 decision 1: the baseline reads the store rather than
-- asking the provider for split-adjusted bars, and the price of that is a
-- mechanism rather than a hope. **A single unadjusted 10:1 split inside the
-- window injects a −90% five-minute return** that breaks no percentile
-- property, changes no `n`, keeps the tape pure, and makes every percentile for
-- that security read far too low for 60 sessions. So the pass **detects a
-- session-boundary discontinuity above a stated ceiling and refuses that
-- security's percentile** — `PROVIDER.md` §3.5 forbids *computing* an
-- adjustment, and this computes nothing: it declines.
--
-- A refusal is a first-class outcome (invariant 5, ADR 0029), so it is a ROW
-- rather than an absent row. An absent row and a refused one are different
-- facts — *the pass has not reached this security* against *the pass reached it
-- and will not answer* — and only the second one is safe to stop retrying.
--
-- `return_baselines_one_answer` makes *breakpoints and a refusal* and *neither*
-- both unrepresentable. That is the constraint a re-implementer cannot route
-- around: writing a refusal while leaving stale breakpoints in place is exactly
-- the shape that would print a split-poisoned percentile for ever.
--
-- **The refusal vocabulary has ONE member today and widening it is a worked
-- shape.** AC 6's *refused below a stated minimum sample* is deliberately not
-- here: `sample_count` is stored, and the minimum belongs to the story that
-- draws the figure (5.3.3) rather than to the pass that counts. Widening is
-- `0003`'s drop-check / add-check pair, and `RETURN_BASELINE_REFUSALS` in
-- `packages/shared` is where the vocabulary would live the moment it has two
-- members and a reader.
--
-- ============================================================================
-- 5. `breakpoints` IS `double precision[]`, AND THAT IS NOT §4'S FLOAT RULE
-- ============================================================================
--
-- README §4 says money and prices are `numeric(18, 6)` and never a float, and
-- the reason is that **float addition is not associative** — a sum can disagree
-- with itself between two renders because a query plan changed the order.
--
-- A breakpoint is neither money nor a price and **nothing here is summed**.
-- Each sample is one division of two `numeric` closes; the aggregation is a
-- **sort** — order statistics — which is exact and order-independent whatever
-- the element type. So the rule's mechanism does not apply, and the cost of
-- ignoring that would be real: 101 `numeric` values per security is several
-- times the bytes and a parse per element on every refresh of a map the socket
-- callback reads.
--
-- **101 breakpoints, not raw samples**, and the count is a decision with an
-- arithmetic reason. 516 securities × 101 × 8 B is **417 KB**, about 2×
-- `currentMarketState`'s measured 0.2 MB. The raw magnitudes are ~19 MB and buy
-- exactness nothing can print. The story's `~84 KB` is ~21 breakpoints — a
-- vigintile grid, which **cannot express a 99th percentile at all**, which is
-- the single reason a pooled distribution was chosen.
--
-- `return_baselines_breakpoint_count` holds the 101 in the database as well as
-- in `packages/shared`, because an array column has no arity and a writer that
-- shipped 21 of them would be caught by nothing else.
--
-- ============================================================================
-- 6. WHAT THIS FILE DELIBERATELY DOES NOT HAVE
-- ============================================================================
--
-- **No index beyond the two the constraints build.** README's rule: an index
-- chosen before there is a query to serve is a guess with a write cost. There
-- are exactly two reads and the unique constraint's own btree serves both —
-- `(security_id, observed_at)` leads with the column the foreign key needs and
-- trails with the one the generation read bounds on. The query that would want
-- an `(observed_at)`-leading index is *every security's row for one session*,
-- which is the generation read; at one row per security per session that is a
-- few hundred rows a session and a scan of a table measured in tens of
-- thousands of rows a year, which is `bar_coverage`'s argument (Task 2.8.4)
-- rather than `market_bars`'. The condition for adding one is the first reader
-- that issues the generation read at a cadence rather than once a quarter hour,
-- with the plan written down beside it.
--
-- **No `on delete` on the foreign key**, which is `market_bars`' and `0012`'s
-- decision: the database refuses a delete that would orphan a baseline rather
-- than cascading it away. Nothing in this repository deletes a security.
--
-- **No `updated_at`.** A re-run of the same generation UPDATES a row — this is
-- the first mutable table in this schema that is not `securities` — and
-- `recorded_at` already answers *when we wrote what is there now*, because for a
-- derived row "when we wrote it" and "when we last wrote it" are the same
-- question. §2 says what the pair is for.
--
-- **No `lookback_sessions` check against 60.** The depth is
-- `BASELINE_LOOKBACK_SESSIONS` in `packages/shared` and is stored per row so a
-- generation computed at a different depth is readable as such rather than
-- silently comparable to one that was not. Pinning 60 in a constraint would make
-- changing the depth a migration against a table whose whole content is a cache,
-- which is §1's named mistake.

create table return_baselines (
    -- README §3's rule with no exception: a surrogate `bigint` identity key,
    -- with the natural key beside it as a unique constraint. `generated always`
    -- refuses an explicit value.
    id bigint generated always as identity primary key,

    -- The security this distribution describes. A real foreign key with no
    -- `on delete`; §6.
    security_id bigint not null references securities (id),

    -- **The window's END — the instant the last session it was computed over
    -- closed.** The coordinate a replay keys on, and the reason this column
    -- carries README §2's reserved name rather than `0012`'s `effective_from`.
    -- **NO DEFAULT**; see §2, which is the whole reason this table is shaped
    -- the way it is.
    observed_at timestamptz not null,

    -- How many trading sessions the window spanned — 60 today,
    -- `BASELINE_LOOKBACK_SESSIONS`. Stored rather than assumed, so a generation
    -- taken at another depth is not silently comparable to one that was not.
    lookback_sessions integer not null,

    -- **`n`, COUNTED by the pass rather than computed from a constant.** 78 grid
    -- anchors in a regular session yield **77** increments and an early close
    -- yields **41**, and median stored coverage is 82.8% so grid pairs are
    -- routinely absent — so `60 × 77` is wrong three different ways. A refused
    -- row still carries the count it reached, because *how much we had* is the
    -- first question asked of a refusal.
    sample_count bigint not null,

    -- `bigint` and not `integer`, because `README.md` §4's rule is that **a
    -- count is a `bigint`** and `migrate.database.test.ts` enforces it on every
    -- column whose name ends `_count`. It fired on the first draft of this
    -- file, which is the convention working: a count that cannot overflow today
    -- is still a count, and the type is what says so.

    -- The 101 magnitude breakpoints, `0th … 100th`, ascending. `null` exactly
    -- when this row is a refusal; §4 and §5.
    breakpoints double precision[],

    -- Why there is no distribution, or `null`. One member today; §4 carries the
    -- widening shape.
    refusal text,

    -- When we wrote this row. `now()` is transaction start time, so one pass's
    -- rows share one value.
    recorded_at timestamptz not null default now(),

    -- The natural key, and what makes the baseline *addressable as of a
    -- session*: one generation per security per window end. A second pass over
    -- the same window updates rather than appending, which is what makes
    -- `pnpm baselines` re-runnable and convergent in `pnpm universe`'s sense.
    constraint return_baselines_unique_generation
        unique (security_id, observed_at),

    -- **Exactly one of the two answers.** See §4: this is the constraint that
    -- makes a refusal beside stale breakpoints unrepresentable.
    constraint return_baselines_one_answer
        check ((breakpoints is null) <> (refusal is null)),

    -- The vocabulary is `RETURN_BASELINE_REFUSALS` in `packages/shared` and this
    -- is the database's backstop against a writer that bypassed it —
    -- `0002`'s decision 1 is why it is `text` + `check` rather than an `enum`.
    constraint return_baselines_refusal_known
        check (refusal is null or refusal in ('split-discontinuity')),

    -- An array column has no arity of its own; §5.
    constraint return_baselines_breakpoint_count
        check (breakpoints is null or array_length(breakpoints, 1) = 101),

    -- `0` is the true answer for a security with no stored bars in the window,
    -- which on a bare store is every security.
    constraint return_baselines_sample_count_non_negative
        check (sample_count >= 0),

    constraint return_baselines_lookback_positive
        check (lookback_sessions > 0)
);
