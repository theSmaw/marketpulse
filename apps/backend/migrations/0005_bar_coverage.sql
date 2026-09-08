-- 0005_bar_coverage — the ledger that answers "what do I have" (Task 2.8.4).
--
-- `market_bars` (0004) is the data. This is the **statement about** the data,
-- and it exists because acceptance criterion 5 says the system can state what it
-- holds per symbol and timeframe — and a `select min(observed_at),
-- max(observed_at), count(*)` over fifty million rows is not a statement, it is
-- a scan. Story 2.8's own sizing puts one year of the tracked universe at ~50.5M
-- minute rows; Task 2.8.9 renders "how much history do we have" on a page that
-- lists 518 securities, so the read has to be a few hundred rows or the page
-- cannot exist.
--
-- **What makes this a second table rather than four more columns on
-- `securities`.** The statement is per `(security, timeframe)` and there are two
-- timeframes, so it does not fit one row per security; and `securities` is a
-- curated list converged on a file by `pnpm universe` on every deploy, so
-- putting ingestion state in it would put a column the backfill writes into a
-- table the loader rewrites. `UNIVERSE.md` §15.3 already produced that failure
-- once, on `status`.
--
-- ## The shape decision: ONE ROW, ONE CONTIGUOUS RANGE
--
-- One row per `(security_id, timeframe)` expresses exactly one range. A backfill
-- interrupted in the middle of a symbol's history and resumed somewhere else
-- would leave two, and this table cannot hold two.
--
-- The alternative — many rows, many ranges, merged on write — is more honest and
-- more machinery, and the merge is the kind of code that is wrong in a way tests
-- written by its author do not catch. It is declined.
--
-- **So the cost is stated rather than left to be discovered: the walk must be
-- monotonic.** A backfill that jumps around leaves this table claiming a range
-- it does not hold, which is the "over-reports" failure Task 2.8.4's notes name
-- — a permanent hole in a chart that nobody sees until Epic 5 computes a
-- baseline over it, because nothing downstream can detect it.
--
-- **And unusually, the cost is not only stated: it is enforced.**
-- `market-bars.ts` refuses a write whose window is disjoint from the stored
-- range with **a trading session in the gap**, computed from the shipped
-- calendar rather than from a threshold somebody picked. The overnight and the
-- weekend between two adjacent sessions contain no session, so a session-by-
-- session walk in either direction is accepted; a walk that skips a month is
-- refused at the point of writing rather than discovered later. That is the one
-- thing that makes the one-range decision safe rather than merely documented.

create table bar_coverage (
    -- §3, unchanged from both tables above it.
    id bigint generated always as identity primary key,

    -- §1's foreign-key naming rule, and `0004`'s `on delete` reasoning applies
    -- here verbatim: no clause means `no action`, so the database refuses a
    -- delete that would leave this statement pointing at nothing.
    security_id bigint not null references securities (id),

    -- The vocabulary is `TIMEFRAMES` in `packages/shared`, and this constraint
    -- is the database's backstop — the same arrangement `market_bars` has, and
    -- `pnpm test:database` parses the constraint Postgres rewrote to keep the
    -- two spellings in step.
    --
    -- It is part of the key rather than a column, because a security's daily
    -- history and its minute history are backfilled to different depths by
    -- design (`BARS.md` §2: daily to 2024-01-01, minute for one year). One row
    -- per security would have to pick one of the two to be right about.
    timeframe text not null check (timeframe in ('1m', '1d')),

    -- ========================================================================
    -- The covered range: what we have ASKED FOR AND BEEN ANSWERED FOR.
    -- ========================================================================
    --
    -- **This is `SeriesCoverage.covered` and never `SeriesCoverage.requested`,
    -- and the difference is a measurement rather than a nicety.** Task 2.7.5
    -- measured that this plan refuses SIP data from the last ~16 minutes with a
    -- flat `403` keyed on the request's `end` alone, so `alpacaServableEnd`
    -- clamps the window **before** the request and reports the clamp as
    -- `covered`. A ledger that stored `requested` would bookmark a window the
    -- vendor never served, and every catch-up from then on would begin 16
    -- minutes after the last bar it actually holds — a permanent hole, renewed
    -- on every run, in the most recent data every chart opens on.
    --
    -- Half-open, `[covered_start, covered_end)`, matching `TimeRange`. The
    -- constraint below refuses a reversed or zero-width pair for the reason
    -- `toTimeRange` does: an empty range is a plausible-looking answer to a
    -- swapped pair and to an off-by-one alike.
    --
    -- **Coverage says how far the answer reaches, not whether it is dense.** A
    -- thinly traded security with no print between 15:42 and the close is still
    -- covered to the close — Task 2.8.5 measured that only 8 of 28 S&P 500
    -- constituents returned a full 390 bars on an ordinary session — so the
    -- number of bars inside this window is a **liquidity** measure and not a
    -- completeness one. Task 2.8.7 keeps those in separate columns of its report
    -- and this table is the reason it can: completeness is a question about this
    -- range, thinness is a question about the bars.
    covered_start timestamptz not null,
    covered_end timestamptz not null,

    -- **The resume point is `covered_end` (walking forwards) or `covered_start`
    -- (walking backwards), and it is deliberately NOT a column of its own.**
    -- Both ends are already here; a `resume_from` beside them would be a second
    -- copy of one of them, free to disagree, which is the shape §5 warns about
    -- with `deleted_at` and the shape `securities-response.ts` refused a `count`
    -- for. A ledger whose resume point and whose covered range can differ is a
    -- ledger with two answers to one question.

    -- How many bars we hold inside that window.
    --
    -- A **count**, therefore `bigint` and never `numeric` — §4 draws that line
    -- and `pnpm test:database` sweeps every `*_count` column for it. It exists
    -- so "how much history do we have" is a read of one row rather than a
    -- `count(*)`, which is this table's whole purpose.
    --
    -- **Maintained by the writer, incremented by rows actually inserted**, so a
    -- re-run that inserts nothing leaves it alone. That it stays correct is the
    -- writer's obligation and not this column's — exactly as `securities`
    -- `updated_at` is, and with the same absence of a trigger. What holds it
    -- honest is `market-bars.database.test.ts`, which runs the expensive
    -- `min/max/count` **once**, as the control for the cheap answer here. That
    -- comparison is the only thing that can detect either of the two silent
    -- failures this table can have: under-reporting, which re-fetches history we
    -- already hold on every catch-up, and over-reporting, which skips a window
    -- forever. Neither is detectable from this table alone.
    bar_count bigint not null default 0,

    -- §2's `recorded_at`: when we first wrote this statement. There is no
    -- `observed_at`, and the answer to §2's question is the same one `securities`
    -- gives — this is a fact about **us** rather than about the market. There is
    -- no instant at which "we hold bars for NVDA from January" was true in the
    -- market.
    recorded_at timestamptz not null default now(),

    -- When the statement last **changed**.
    --
    -- **This table takes `securities`' pair and `market_bars` deliberately does
    -- not, and the reason is already written down in `0004`:** a table whose
    -- rows are rewritten routinely needs both, because "when we first wrote it"
    -- and "when it last changed" are then different questions. `market_bars` is
    -- rewritten only by a vendor correction, so `recorded_at` moving *is* the
    -- record of one. This row is rewritten by every session the backfill adds,
    -- so it needs both.
    --
    -- **It moves only when the statement actually changed**, maintained by the
    -- writer with `load-universe.ts`'s `is distinct from` idiom, so a re-run that
    -- changes nothing leaves this table byte-identical. That is what lets
    -- acceptance criterion 2 — "re-running it changes nothing, proved by row
    -- counts and checksums" — be asserted over the whole store rather than over
    -- the bars alone.
    --
    -- **There is deliberately no "when did we last try" column.** It would be a
    -- date that always says today, which `UNIVERSE.md` §11 and `BarSource`
    -- `retrievedAt` both record as the trap that makes a provenance timestamp
    -- *permanently silent* — it can never report staleness, which is the only
    -- thing such a column exists to do. It would also make every re-run rewrite
    -- every row, which is the property above given away for nothing.
    updated_at timestamptz not null default now(),

    -- One statement per security and timeframe. It is the `on conflict` target
    -- the write path infers against, and — per Task 2.2.4's finding — a
    -- `unique` CONSTRAINT rather than a bare index, because only the first is
    -- visible in `pg_constraint` where that inference looks.
    constraint bar_coverage_unique_series unique (security_id, timeframe),

    -- Half-open and non-empty, for `toTimeRange`'s reason.
    constraint bar_coverage_range_ordered check (covered_end > covered_start),

    -- A negative count is not a smaller number, it is a broken writer.
    constraint bar_coverage_count_non_negative check (bar_count >= 0)
);

-- ---------------------------------------------------------------------------
-- The indexes this migration deliberately does not create.
-- ---------------------------------------------------------------------------
--
-- `README.md`'s rule — an index chosen before there is a query to serve is a
-- guess with a write cost. This table is ~1,036 rows at 518 securities and two
-- timeframes, so the argument is the opposite of `market_bars`': not that an
-- index is expensive, but that at four figures of rows **every** query is a
-- sequential scan in under a millisecond and an index would serve nothing.
--
-- The unique constraint's own btree leads with `security_id`, so it covers both
-- known readers: the write path's point lookup, and Task 2.8.9's join from the
-- 518-row universe. Postgres does not index a referencing column on its own, so
-- that constraint is also what stops every operation on a `securities` row
-- scanning this table.
