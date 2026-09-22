-- 0010_market_bars_feed — the tape on the bar (Task 3.7.2, ADR 0034).
--
-- `0004_market_bars.sql` decided AGAINST a per-bar feed column and wrote down
-- the condition for reversing it: "a SECOND FEED writing into this table". Story
-- 3.8 writes that feed — the live IEX stream — into a store whose every bar so
-- far came from the consolidated SIP tape, and `0007`'s ledger holds ONE source
-- per (security, timeframe), so the day an IEX bar lands the series can no
-- longer state its tape honestly. This migration is the reversal, taken at its
-- own trigger, and ADR 0034 carries the argument and the figures. Read that
-- before touching this table again.
--
-- ## What was measured before this file was written (2026-09-22)
--
-- Against the real local store — 48,797,343 rows, 5,081 MB of heap, PostgreSQL
-- 18.6 — inside a rolled-back transaction:
--
--   add column … not null default 'sip'            39.290 ms   (catalogue write)
--   add constraint … check (…) not valid             2.968 ms   (catalogue write)
--   validate constraint                           6,180.846 ms   (a full scan)
--
-- A constant default is stored ONCE in the catalogue and materialised on read;
-- no row is touched. The vocabulary check is added NOT VALID because validating
-- it reads the whole heap, and on the deployed tier — Burstable B1ms, 10 MiB/s
-- of I/O bandwidth (`HOSTING.md`) — 5,081 MB is ~508 s against `deploy.yml`'s
-- `timeout 120 pnpm migrate`, inside Kysely's single transaction.
--
-- ## The check is NOT VALID and STAYS so. Do not "tidy" it.
--
-- A NOT VALID check enforces every NEW row exactly as a validated one would; it
-- only declines to re-read the rows that already exist. And re-reading them
-- would prove nothing: every existing row's value is the default below, and
-- the default is in the vocabulary by construction. `pnpm test:database`
-- asserts the constraint is unvalidated, on purpose, so a later `VALIDATE
-- CONSTRAINT` slipped into a deploy goes red before it can stall one.
--
-- ## The default is a dated historical claim, which is what an applied
-- ## migration may contain
--
-- On 2026-09-22 every bar in every store this product runs came from the Alpaca
-- historical backfill, whose bars are the consolidated SIP tape (`ALPACA.md`
-- §2). The default states that about the past. It also keeps the deploy window
-- survivable — the migration runs before either half of the code rolls, and for
-- that window the PREVIOUS backfill is still the writer and does not know this
-- column exists; a `not null` with no default would fail its next insert
-- (`README.md` §"Migrations must be additive across a deploy"). What stops the
-- default becoming a lie about the FUTURE is in the type system rather than
-- here: Task 3.7.3 makes the column required on insert in `schema.ts`, so no
-- shipped writer can reach it.
--
-- The vocabulary is `MARKET_FEEDS` in `packages/shared`; the check is the
-- database's backstop, and `market-bars.database.test.ts` parses it back and
-- asserts set equality with the constant so the two cannot drift.

alter table market_bars
    -- Which tape this bar was observed on. **The invariant-6 column, per bar**:
    -- `sip` is the consolidated tape the backfill stores, `iex` is the single
    -- venue the live stream delivers, `synthetic` is the fixture provider's
    -- generated bars (a store this repository creates on purpose), and `replay`
    -- is in the vocabulary because the vocabulary is one list — `recordSeries`
    -- refuses to store a replayed series before a row is ever written.
    add column feed text not null default 'sip';

alter table market_bars
    add constraint market_bars_feed_check
        check (feed in ('iex', 'sip', 'synthetic', 'replay'))
        not valid;
