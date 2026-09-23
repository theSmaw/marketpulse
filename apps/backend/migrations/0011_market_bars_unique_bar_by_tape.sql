-- The tape joins the key: a minute of a security may hold one row per tape.
--
-- **ADR 0035 is the decision and this is its mechanism.** Story 3.7 gave every
-- bar a `feed`; Task 3.8.1 decided that a stored bar is a record of an
-- observation rather than a cache of the best available number, so the IEX bar
-- the live stream observed and the consolidated bar the nightly backfill
-- fetches are two rows rather than one row and its correction.
-- `0004_market_bars.sql` argued the opposite key deliberately, on a premise
-- that was true when it was written — *a backfilled historical bar is final* —
-- and a live bar is not. That migration is applied and immutable; ADR 0035 is
-- its amendment and this is the change it calls for.
--
-- ## Why the index is created here but built somewhere else
--
-- Measured 2026-09-23 on the populated local store (48,797,343 rows,
-- PostgreSQL 18.6, Apple M3, `maintenance_work_mem` 64 MB):
--
--   * building this index NON-concurrently        37.3 s   (holds SHARE: reads
--                                                           continue, writes
--                                                           block)
--   * building it CONCURRENTLY                    42.3 s   (holds SHARE UPDATE
--                                                           EXCLUSIVE: reads AND
--                                                           writes continue)
--   * adopting a built index as the constraint     0.11 s  (catalogue only)
--   * the index itself                         2,311 MB
--
-- `deploy.yml` gives `pnpm migrate` **120 seconds** on a Burstable B1ms moving
-- **10 MiB/s**, where a single pass over this table's 5 GB heap is ~508 s
-- (ADR 0034). So an index built inside the migration does not fit — not
-- marginally, by roughly an order of magnitude — and the deployed table is
-- **49,796,479 rows**, larger than the one measured above.
--
-- **So the build happens before the migration, concurrently, in its own deploy
-- step** (`pnpm index:prepare`), and all this migration does is adopt it:
-- `drop constraint` plus `add constraint … using index` is two catalogue
-- writes, 0.11 s measured, which is the property every migration on this table
-- must have (`CLAUDE.md`, _Data layer_).
--
-- **`if not exists` is what keeps a fresh database working.** On CI's store,
-- on `marketpulse_bare` and on a new clone the table is empty or small and the
-- index builds inline in milliseconds; on the deployed store the step before
-- this one has already built it and this is a catalogue check. If that step is
-- ever skipped on a populated store, this statement builds inline, blows the
-- 120 s ceiling, and the deploy fails with **nothing applied and no code
-- rolled** — which is the safe direction.
--
-- ## What this does to the old writer, and why that window is narrow here
--
-- `ON CONFLICT (security_id, timeframe, observed_at)` requires a unique index
-- on exactly those columns. After this migration there is none, so a writer
-- built before it fails with *there is no unique or exclusion constraint
-- matching the ON CONFLICT specification*. **The deployed backend is not such
-- a writer**: measured 2026-09-23, the only caller of `recordSeries` in the
-- tree is `backfill.ts`, which runs from a GitHub runner with its own checkout
-- and build. So the window is a backfill run **already in flight** when the
-- deploy lands — a ten-minute job twice a day — and it fails loudly, writes
-- nothing, and is correct on its next run.
--
-- ## What the store can hold afterwards, and what still forbids it
--
-- Two rows for one minute, differing only in `feed`. Nothing writes them yet:
-- `recordSeries` still refuses a series overlapping stored bars from another
-- tape (`ForeignSourceError`, reason `overlap`, Task 3.7.4), and lifting that
-- is Story 3.8's writer tasks. This migration widens what the store *may* hold
-- without changing what any shipped writer *does*.

create unique index if not exists market_bars_unique_bar_v2
    on market_bars (security_id, timeframe, observed_at, feed);

alter table market_bars
    drop constraint market_bars_unique_bar;

-- `using index` renames the index to the constraint's name, so the constraint
-- and its index are called `market_bars_unique_bar` afterwards exactly as they
-- were — the name a reader greps for does not move, only its columns.
alter table market_bars
    add constraint market_bars_unique_bar
        unique using index market_bars_unique_bar_v2;
