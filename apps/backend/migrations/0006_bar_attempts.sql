-- 0006_bar_attempts — what happened on a session that left no bars (Task 2.8.7).
--
-- Acceptance criterion 4 says a market holiday, a half day and a genuinely
-- untraded minute must each be distinguishable from a **failed fetch**. Three of
-- those four causes are already answerable and the fourth is not:
--
--   1. The market was closed — `market-session.ts` answers it completely, for
--      free, and for both timeframes, because `BARS.md` §2 capped the daily
--      depth at 2024-01-01 so every bar this story stores has a session to be
--      checked against.
--   2. The security did not trade — measured, and it is the NORMAL state: only
--      8 of 28 S&P 500 constituents returned a full 390 bars on an ordinary
--      session, at a universe-wide mean of 364.3.
--   3. The fetch failed — one of `BarsResult`'s eight members, loud at the
--      moment it happens and **silent the moment the command exits**.
--   4. The fetch never happened — `bar_coverage` (0005) answers it: the
--      session's `[open, close)` lies outside the ledger's covered range.
--
-- **This table exists for 3, and for one case of 2 that 0005 structurally
-- cannot record.** Without it a failed session and a never-attempted session are
-- the same thing in the database — no bars, no ledger extension — and the only
-- difference between them lives in a terminal somebody has closed.
--
-- ## Why it records SUCCESSFUL EMPTY ANSWERS as well as failures
--
-- The cheap design is failures only, "because successes are already recorded by
-- the bars themselves". That is true of every success except one, and the
-- exception is exactly the case this criterion is about.
--
-- A session the vendor answers successfully with **no bars** writes no bars —
-- and it does not extend the ledger either, because `BarSeries` gives an empty
-- series no `covered` window and inferring one from `requested` is the bug Task
-- 2.7.5 measured. So it is recorded in **neither** table. It is usually
-- recovered anyway, because a later session on the far side of it extends the
-- range *across* it; what is not recovered is an empty session at the
-- **frontier** of the walk, which reads as *never asked* when it was asked and
-- was genuinely told nothing happened. Those are the two states the criterion
-- exists to tell apart, so the row set is **"every attempt that left no bars"**.
--
-- ## Why it is not a row per session per symbol
--
-- Because that is another ~130,000 rows a year at 518 securities and two
-- timeframes, to record something the bars already say. This table is sparse by
-- construction: a session that stored bars has **no row here**, and a later
-- success **deletes** any row that was here — see `bar-attempts.ts`. Without
-- that deletion the log accumulates a permanent record of a transient failure
-- and every report reads worse than the store is.
--
-- ## Three tables, three jobs, and none of them is interchangeable
--
--   `market_bars`   (0004) — the data.
--   `bar_coverage`  (0005) — how far our history reaches, one row per series,
--                            read by a page.
--   `bar_attempts`  (0006) — what happened on one particular session, sparsely,
--                            read by an operator.
--
-- The ledger cannot name a session and this cannot state a range without a scan.

create table bar_attempts (
    -- §3, unchanged from the three tables above it.
    id bigint generated always as identity primary key,

    -- §1's foreign-key naming rule. No `on delete` clause means `no action`, so
    -- the database refuses a delete that would leave this record of an attempt
    -- pointing at nothing — 0004's and 0005's reasoning, verbatim.
    security_id bigint not null references securities (id),

    -- `TIMEFRAMES` in `packages/shared`, with the database as backstop. Part of
    -- the key for 0005's reason: the two timeframes are walked independently.
    timeframe text not null check (timeframe in ('1m', '1d')),

    -- ========================================================================
    -- The session, as a MARKET DATE and deliberately not as a `date` or an
    -- instant.
    -- ========================================================================
    --
    -- **`text` rather than Postgres `date`, and that is a trap avoided rather
    -- than a convention broken.** §2 forbids a naive `timestamp` because `pg`
    -- hands one back as a `Date` silently reinterpreted in the reading process's
    -- timezone. A `date` column has the same shape of problem: `pg` returns it
    -- as a `Date` at local midnight, so a row written as 2026-09-03 reads back
    -- as 2026-09-02 in any process east of UTC. A market date is a **label** —
    -- `MarketDate` in `packages/shared` is a branded `YYYY-MM-DD` string for
    -- exactly this reason — and a label round-trips as text with nothing to
    -- reinterpret.
    --
    -- **It is not `observed_at` and this table has none.** An attempt is a fact
    -- about *us*, like `securities` and `bar_coverage`; the session date is what
    -- we asked about rather than an instant at which anything was true.
    --
    -- The pattern check is the same kind of backstop the vocabulary checks are:
    -- a malformed date here is a row no report can join to a calendar.
    session_date text not null check (session_date ~ '^\d{4}-\d{2}-\d{2}$'),

    -- ========================================================================
    -- What happened.
    -- ========================================================================
    --
    -- The vocabulary is `BAR_ATTEMPT_OUTCOMES` in `bar-attempts.ts`, and this
    -- constraint is the database's backstop — the shape `kind`, `status`,
    -- `timeframe` and `market_bars` all take. `pnpm test:database` parses the
    -- constraint Postgres rewrote and compares it against the shipped array,
    -- which is how that otherwise-unchecked pair is closed.
    --
    -- **Nine members: `BarsResult`'s eight, plus one of our own.** `ok` here
    -- means *answered successfully and left no bars* — a success that left bars
    -- has no row at all, so there is no ambiguity to resolve. `coverage-gap` is
    -- not a vendor outcome: it is `market-bars.ts` refusing a write that would
    -- make the ledger claim a window it does not hold, which Task 2.8.6 measured
    -- as the one state that persists in the data (a permanently shorter covered
    -- range) and is explained nowhere.
    outcome text not null check (
        outcome in (
            'ok',
            'timeout',
            'aborted',
            'unknown-symbol',
            'range-not-available',
            'rate-limited',
            'unauthorised',
            'upstream-unavailable',
            'coverage-gap'
        )
    ),

    -- A short human note — the sessions a coverage gap named, and nothing else
    -- today. **Never parsed**, and no report branches on it: the branch is
    -- `outcome`, which is a closed vocabulary, and this is the sentence beside
    -- it. It is nullable because most outcomes have nothing to add.
    detail text,

    -- §2's pair. `recorded_at` is the first attempt at this session; `updated_at`
    -- is the latest, and it moves **only when the outcome or the detail actually
    -- changed** — `load-universe.ts`'s `is distinct from` idiom, so re-running a
    -- backfill that fails the same way twice leaves this table byte-identical
    -- and criterion 2's checksum still covers it.
    --
    -- There is deliberately no "attempted_at" beside `recorded_at`: the attempt
    -- and the write of this row are milliseconds apart, and two columns that
    -- always agree are two columns free to disagree.
    recorded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- One record per session per series. It is the `on conflict` target the
    -- writer infers against, and — per Task 2.2.4's finding — a `unique`
    -- CONSTRAINT rather than a bare index, because only the first is visible in
    -- `pg_constraint` where that inference looks.
    --
    -- Its btree leads with `security_id, timeframe`, which covers both readers:
    -- the writer's per-series delete, and the report's join from the universe.
    -- Postgres does not index a referencing column on its own, so this is also
    -- what stops every operation on a `securities` row scanning this table.
    constraint bar_attempts_unique_session unique (
        security_id, timeframe, session_date
    )
);

-- ---------------------------------------------------------------------------
-- The index this migration deliberately does not create.
-- ---------------------------------------------------------------------------
--
-- `README.md`'s rule — an index chosen before there is a query to serve is a
-- guess with a write cost. The one query that is not covered by the unique
-- constraint's own btree is the report's "every attempt", which is a sequential
-- scan of a table that is empty when everything is well and holds a few thousand
-- rows when it is not. An index on `outcome` would serve a report nobody runs
-- against a table with nothing in it.
