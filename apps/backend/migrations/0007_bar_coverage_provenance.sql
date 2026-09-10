-- 0007_bar_coverage_provenance — where the bars in the ledger's window came
-- from (Task 2.9.4).
--
-- Story 2.9 serves a `BarSeries` out of stored rows, and a `BarSeries` cannot
-- exist without provenance: `bar-series.ts` brands it and `toBarSeries` is the
-- only way to obtain one. `0004_market_bars.sql` deliberately stores none — four
-- provenance columns on forty-eight million rows are forty-eight million copies
-- of two constants, and that migration's trigger for a per-bar `feed` column is
-- **a second feed writing into the same table**, which is Epic 3 rather than
-- this story. That decision is unchanged.
--
-- So the read path has to produce a fact the schema does not hold, and Task
-- 2.9.4 had four candidates. It took this one **because the cheapest was
-- measured to be false already**, not because it was preferred:
--
--   1. **Assert a constant at the read boundary** — everything stored is
--      `alpaca`/`sip`. Free, and it was the recommended answer. It is **wrong
--      today**: `backfill.database.test.ts` drives the shipped `runBackfill`
--      with the **fixture** provider into a real database, so a store holding
--      `fixture`/`synthetic` bars is a thing this repository creates on purpose
--      and `pnpm backfill` under `MARKET_DATA_PROVIDER=fixture` is one command
--      away from doing it to a served one. A constant would then label invented
--      prices as the full US consolidated tape on a chart — invariant 6 failing
--      with nothing going red, which is exactly the failure this story's task
--      file warns about resolving with a shrug.
--   2. **`bar_coverage.updated_at` as the retrieval time.** It is honest about
--      the most recent fetch and overstates the freshness of everything older,
--      because a catch-up appending today's bars moves it for the whole range.
--      Declined for that, and the read uses `market_bars.recorded_at` instead —
--      which is per **batch** (the column defaults to `now()`, transaction
--      start), so the batch is the retrieval and the value is scoped to the
--      window being served.
--   3. **This.** ~1,036 rows at 518 securities and two timeframes, so the
--      objection that killed per-bar provenance does not reach the ledger: this
--      is two constants stored a thousand times, not fifty million.
--   4. **A per-bar `feed` column.** `0004`'s decision, `0004`'s trigger,
--      untouched.
--
-- **What this table can and cannot say.** One row is one `(security_id,
-- timeframe)` and one contiguous window, so it can hold exactly one source for
-- that window. That is a real limit and it is also the mechanism: the write path
-- refuses a series whose source disagrees with the row it would extend, so the
-- day a second feed writes into one series is the day the write throws naming
-- both — which is `0004`'s trigger firing per series rather than being noticed
-- later, globally, by a person.
--
-- ## Why the columns carry a default, when `securities` refused one
--
-- `0002_securities.sql` gives `profile_source` no default, on the argument that
-- `default 'curated'` would silently attribute a provider's row to a file. The
-- argument is right and this migration does the opposite anyway, for a reason
-- that is about the **deploy** rather than about the data.
--
-- `deploy.yml` migrates before either half of the code rolls, and
-- `README.md` §"Migrations must be additive across a deploy" is the rule that
-- follows: for the length of that window the *previous* backfill is still the
-- writer, and it does not know these columns exist. A `not null` with no default
-- would make its next insert fail. The default is what keeps the window
-- survivable.
--
-- **The half that stops it becoming the failure `0002` describes is in the type
-- system rather than here.** `schema.ts` declares both columns as required on
-- insert, so a writer that omits one is a compile error — the database's default
-- is unreachable from the shipped writer and exists only for code that predates
-- this file. The values below are therefore a statement about the past, not an
-- inference about the future.
--
-- **And the backfill of existing rows is a dated historical claim**, which is
-- the correct thing for an applied migration to contain: on 2026-09-09 every row
-- in every store came from the Alpaca historical backfill, whose bars are SIP —
-- 47,682,213 minute bars and 345,559 daily bars locally, written by one command
-- against one plan. `ALPACA.md` records the plan's asymmetry: stored historical
-- bars are consolidated SIP, the live stream is IEX only.

alter table bar_coverage
    -- Who sold us the bars in this window. `PROVIDER_IDS` in `packages/shared`
    -- is the source of truth; the check below is the database's backstop, and
    -- `pnpm test:database` parses it back and compares the two so they cannot
    -- drift — `market_bars_timeframe_check`'s arrangement, for the same reason.
    add column provider text not null default 'alpaca',

    -- Which venues are in them. **This is the invariant-6 column**, and it is
    -- not the provider: one vendor serves single-venue data on a free plan and
    -- the consolidated tape on a paid one, so "who sold us this" and "what is in
    -- it" are two facts and only the second is the one §7.1 requires on screen.
    add column feed text not null default 'sip';

-- The vocabulary, closed. `fixture` is a member because a fixture-backed store
-- is a thing this repository creates deliberately — see candidate 1 above — and
-- `synthetic` is what makes such a store advertise itself in the chrome rather
-- than pass as a market feed.
alter table bar_coverage
    add constraint bar_coverage_provider_check
        check (provider in ('fixture', 'alpaca')),
    add constraint bar_coverage_feed_check
        check (feed in ('iex', 'sip', 'synthetic'));
