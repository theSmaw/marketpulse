-- Widen `bar_coverage`'s FEED vocabulary to admit `replay`. The PROVIDER
-- vocabulary is deliberately NOT widened here.
--
-- WHY THIS EXISTS. `market-bars.database.test.ts` ties
-- `bar_coverage_provider_check` and `bar_coverage_feed_check` to `PROVIDER_IDS`
-- and `MARKET_FEEDS` and asserts **set equality** — not a subset. So widening
-- either union without widening the SQL in the same change turns
-- `pnpm test:database` red, and `database` is one of the three required checks
-- on `main`. ADR 0030 §3 records that coupling as verified rather than assumed,
-- and rejects weakening the test to a subset assertion: its whole value is that
-- the union and the database are one vocabulary.
--
-- WHY ONLY ONE OF THE TWO, WHICH IS THE INTERESTING HALF. Task 3.2.1 added
-- `replay` to `MARKET_FEEDS` and NOT to `PROVIDER_IDS`, because the two are not
-- alike in the one way that matters here:
--
--   * `MARKET_FEEDS` is a **label vocabulary**. A feed value only ever appears
--     stamped on data, no data carries `replay` yet, so no wrong state is
--     reachable by adding it — and the `satisfies` guard beside it forces the
--     words to exist before anything can render them.
--   * `PROVIDER_IDS` is **operator-settable configuration**.
--     `MarketDataProviderSelection` derives from it, so adding a member makes
--     `MARKET_DATA_PROVIDER=replay` a value that validates at startup and that
--     nothing can honour. `market-data.ts`'s own doc comment names that as the
--     thing its exhaustive switch exists to prevent, and
--     `market-provenance.test.ts` holds it as a standing rule with a live
--     precedent: *a provider id is a member only when something can produce
--     it* — `SECURITY_STATUSES`' `delisted` still waits for the code that can
--     set it.
--
-- So the provider half arrives in **Task 3.2.7**, beside `createReplayStream`,
-- in its own migration. That is the same rule `alpaca` already followed.
--
-- Forward-only, and additive: dropping and re-adding a `check` rewrites no rows
-- and holds no lock worth naming at this table's size.

alter table bar_coverage
    drop constraint bar_coverage_feed_check;

alter table bar_coverage
    add constraint bar_coverage_feed_check
        check (feed in ('iex', 'sip', 'synthetic', 'replay'));
