-- 0002_securities — the first real table (Task 2.2.4).
--
-- Enough for Story 2.3 and deliberately not one column more. Story 2.3 owns
-- what is in the rows — the sector taxonomy, the index-proxy-versus-sector-proxy
-- distinction, the selection rule and the ~100 symbols themselves — and this
-- file owns only the shape. A column added here to anticipate one of those is a
-- column Story 2.3 has to migrate.
--
-- Every type below follows `README.md` in this directory. The four decisions in
-- it that are not obvious from reading the SQL:
--
--   1. `kind` and `status` are `text` + `check`, NOT a Postgres `enum`. Inside
--      one transaction — which is exactly what a migration is here — adding an
--      enum value and *using* it is refused (`unsafe use of new value "etf" of
--      enum type`), and removing a value has no operation at all. So an enum
--      would make Story 2.3's first "add a kind and backfill the rows"
--      migration unwriteable.
--   2. `status` has NO check, and that asymmetry is deliberate. `kind`'s
--      vocabulary is fixed by PRODUCT_SPEC.md §6 and now lives in
--      `SECURITY_KINDS` in `packages/shared`, so the constraint has a source of
--      truth. `status`'s vocabulary is Story 2.3's and does not exist yet, and
--      a check written against a vocabulary invented here is a vocabulary
--      Story 2.3 has to migrate rather than choose.
--   3. There is no `observed_at`. A security is reference data rather than a
--      fact about the market, so there is no instant at which it "was true"
--      that is different from when we recorded it. `market_bars` (Story 2.8) is
--      the first table that exercises the pair. Adding a defaulted one here to
--      make the convention look tested would be exactly the leak the convention
--      forbids.
--   4. There is no index beyond the primary key and `symbol`'s unique
--      constraint. No query exists yet; Story 2.9 writes the first read, and an
--      index chosen before there is a query to serve is a guess with a write
--      cost.

create table securities (
    -- A surrogate key, because a symbol is not stable: FB became META, and a
    -- natural primary key propagates a ticker change into every foreign key
    -- referencing it, forever. `generated always` refuses an explicit value
    -- (`cannot insert a non-DEFAULT value into column "id"`), which stops an
    -- import quietly seeding the sequence into a state where the next insert
    -- collides.
    id bigint generated always as identity primary key,

    -- The natural key, unique rather than primary. Still the thing every human
    -- and every provider uses; a lookup key rather than an identity.
    --
    -- No format check, deliberately. `isTicker` in `packages/shared` already
    -- holds `^[A-Z]{1,5}(\.[A-Z])?$`, and a second copy here would be a pattern
    -- nothing compares against the first — this repository's third kind of gap,
    -- created on purpose. Validating what goes in belongs to the loader that
    -- owns what goes in, which is Story 2.3's, and it can call the existing
    -- predicate rather than duplicate it.
    symbol text not null unique,

    name text not null,
    exchange text not null,

    -- Equity or ETF. §6 and Epic 4 treat them differently, so this is a real
    -- column rather than a flag. The vocabulary is `SECURITY_KINDS` in
    -- `packages/shared`; this constraint is the database's backstop against a
    -- writer that bypassed it.
    --
    -- Nothing compares this list to that one. See `apps/backend/src/schema.ts`.
    kind text not null check (kind in ('equity', 'etf')),

    -- Nullable, because an index proxy (SPY, QQQ) has neither. Story 2.3's
    -- acceptance criterion 3 — every equity has a sector, and every sector
    -- present has a corresponding sector ETF — is deliberately NOT encoded
    -- here: its second half is a statement about the whole table rather than
    -- about a row, so a row-level check could express only the first half and
    -- would read like it enforced the rule.
    sector text,
    industry text,

    -- Story 2.3's vocabulary (`active`, `delisted`, …). Not null, no default:
    -- a default would be this task choosing the vocabulary's most common member
    -- before the vocabulary exists.
    --
    -- This is also what replaces a soft delete. A removed symbol keeps its row
    -- and changes its status; a `deleted_at` would be a second invisible
    -- predicate, and one invisible predicate to enforce is a design while two
    -- is a bug waiting for whichever one somebody forgets.
    status text not null,

    -- The SEC's Central Index Key, for Epic 9. Text rather than a number
    -- because its leading zeros are part of it, and deliberately NOT unique:
    -- share classes of one company share a CIK (GOOG and GOOGL; BRK.A and
    -- BRK.B), so a unique constraint here would refuse a universe Story 2.3 is
    -- likely to want. Nullable because an ETF does not file and because Epic 9
    -- is what populates it.
    cik text,

    -- When we wrote the row. `now()` is transaction start time, so a whole
    -- ingest batch shares one value.
    recorded_at timestamptz not null default now(),

    -- When it last changed. Correct at insert through the default, and
    -- maintained by the writer thereafter — there is deliberately no trigger.
    -- A trigger is a second place row behaviour lives that no tool in this
    -- repository reads, and this table has exactly one writer (Story 2.3's
    -- loader). The reversal trigger is a second writer.
    updated_at timestamptz not null default now()
);
