-- 0003_security_vocabulary — the vocabulary Task 2.3.2 fixed, arriving at the
-- database (Task 2.3.3).
--
-- `0002_securities.sql` shipped the SHAPE and deliberately left three
-- vocabularies unconstrained, because they did not exist: `kind` carried a
-- two-member check that Story 2.3 has since widened, `status` carried none at
-- all because Task 2.2.4 refused to invent one, and `sector` was a bare `text`
-- because there was no taxonomy. All three exist now, in `packages/shared`, and
-- this file makes the database their backstop — which is the arrangement
-- `README.md` §1 requires of every closed set: the TypeScript union is the
-- source of truth and the `check` constraint is what catches a writer that
-- bypassed it.
--
-- It also adds the provenance columns Story 2.3's acceptance criterion 6 asks
-- for. Read `UNIVERSE.md` §4 in
-- `planning/epic-02-security-universe-historical-data/story-03-.../` for why
-- they are per field GROUP rather than one column on the row.
--
-- ============================================================================
-- THIS IS THIS REPOSITORY'S FIRST NON-ADDITIVE MIGRATION, AND THAT NEEDS AN
-- ARGUMENT RATHER THAN A NOTE.
-- ============================================================================
--
-- Everything here is additive except one statement: dropping
-- `securities_kind_check` and replacing it with a narrower one removes `'etf'`
-- from the values this table can hold. The database ends this migration able to
-- store strictly LESS than it could before, which is the one shape that breaks
-- the usual safety property of migrating ahead of the code — an added column is
-- invisible to code that has not heard of it, and a tightened constraint is not.
--
-- It is safe here for two reasons that must BOTH hold, and neither will hold
-- next time:
--
--   1. `securities` holds ZERO rows, so there is nothing the tightened check can
--      reject. `alter table ... add constraint` validates existing rows; against
--      an empty table that validation has nothing to do.
--   2. NOTHING WRITES TO THIS TABLE AT ALL. Task 2.3.5's loader is the first
--      writer and ships after this file, so there is no deployed code holding
--      the string `'etf'` that this constraint could start refusing.
--
-- There is deliberately NO BACKFILL, and the absence is worth stating rather
-- than leaving a reader hunting for the `update` a widening migration usually
-- carries: the table is empty, so this is drop-check, add-check, and nothing
-- else.
--
-- **Ordering against a deploy is NOT settled, and this file must not pretend it
-- is.** Task 2.2.7 — which chooses whether migrations run as a step in
-- `deploy.yml` before the container rolls, or as a job the container runs at
-- boot — is NOT STARTED, `.github/workflows/deploy.yml` contains no migration
-- step, and the deployed database has never had a migration applied to it. So
-- the non-additive statement below is not licensed by a deploy shape somebody
-- already chose; it is safe on reasons 1 and 2 alone, and it is a CONSTRAINT ON
-- 2.2.7 rather than a consequence of it. The general rule that survives: a
-- migration that narrows what the database accepts is only safe while nothing
-- deployed writes the values being removed, and once Task 2.3.5's loader exists
-- that stops being true of this table forever.
--
-- Everything below this line is additive.

-- ---------------------------------------------------------------------------
-- 1. `kind` widens from two members to three.
-- ---------------------------------------------------------------------------
--
-- `equity | sector_etf | index_etf`, per `SECURITY_KINDS`. SPY, QQQ, DIA and IWM
-- are what "the market" means and the eleven sector SPDRs are what "the sector"
-- means; Epic 4's sector rows and Epic 5's relative-move need to tell them
-- apart, and a screen that mixed them would compare a thing to itself.
--
-- **This is the migration Task 2.2.4's refusal of a Postgres `enum` was
-- protecting, and it is the first time that argument pays.** README.md §1 has
-- the table: inside one transaction — which is exactly what a migration is here
-- — adding an enum value and USING it is refused with `unsafe use of new value
-- "etf" of enum type`, and REMOVING a value has no operation at all. As an enum,
-- the statement below could not be written; as `text` + `check` it is two lines.
-- The decision was taken on that argument in the abstract, so record that it
-- held.
alter table securities drop constraint securities_kind_check;

alter table securities
    add constraint securities_kind_check
    check (kind in ('equity', 'sector_etf', 'index_etf'));

-- ---------------------------------------------------------------------------
-- 2. `status` gets the check whose absence Task 2.2.4 recorded as temporary.
-- ---------------------------------------------------------------------------
--
-- `0002` left this column `not null` with no check and no default, deliberately:
-- `status`'s vocabulary was Story 2.3's, and a check written against a
-- vocabulary invented there would have been a vocabulary Story 2.3 had to
-- migrate rather than choose. It exists now — `SECURITY_STATUSES` — and it is
-- two members.
--
-- `delisted` is NOT one of them, and its absence is the decision here most
-- likely to be questioned. It is a genuinely different event from `untracked`:
-- one is a fact about the market and the other a fact about us. It is absent
-- because nothing in Story 2.3 can PRODUCE it, which is this repository's own
-- rule for adding a member to a vocabulary — applied twice already, to
-- `UNSUPPORTED_MEDIA_TYPE` and to `SERVICE_UNAVAILABLE`. Its producer is Story
-- 2.7, and adding it then is exactly the drop-check / add-check shape above,
-- which is why that shape is worth having a worked example of.
alter table securities
    add constraint securities_status_check
    check (status in ('active', 'untracked'));

-- ---------------------------------------------------------------------------
-- 3. `sector` becomes a closed set too.
-- ---------------------------------------------------------------------------
--
-- `0002` left this a bare `text` because the taxonomy did not exist. It does
-- now — eleven members in `SECTORS`, each mapped one-to-one onto a sector SPDR —
-- so by README.md §1's own rule it is a closed set and gets a `check`. Leaving
-- it unconstrained while `kind` and `status` are constrained would be an
-- inconsistency somebody would later have to explain, and it is the column with
-- the most expensive silent failure: an unrecognised sector is a security with
-- no benchmark, and Epic 5 indexes `SECTOR_ETFS` with this value.
--
-- `industry` deliberately gets NO check. It is genuinely open — it has no ETF,
-- therefore no benchmark, therefore no closed set to be a source of truth for —
-- and a check over a list nobody maintains is a constraint that refuses correct
-- data. That asymmetry between the two classification columns is the point.
alter table securities
    add constraint securities_sector_check
    check (sector in (
        'technology',
        'health_care',
        'financials',
        'consumer_discretionary',
        'communication_services',
        'industrials',
        'consumer_staples',
        'energy',
        'utilities',
        'real_estate',
        'materials'
    ));

-- ---------------------------------------------------------------------------
-- 4. The one cross-column invariant: `sector` is null exactly when the security
--    is an index proxy.
-- ---------------------------------------------------------------------------
--
-- Task 2.3.2 made `Security` a DISCRIMINATED UNION rather than one interface
-- with a nullable sector, because the nullability has two distinct meanings and
-- only the discriminant tells them apart: on an index proxy a null sector is the
-- correct and complete answer, and on an equity it is a row that should have
-- failed to load. Without this constraint the database would permit a state the
-- type system says cannot exist — which is precisely the gap `UNIVERSE.md` §2
-- rejected the "second nullable column" shape to avoid, arriving through a
-- different door.
--
-- **This is NOT Story 2.3's acceptance criterion 3.** That criterion has two
-- halves — every equity has a sector, and every sector PRESENT has a
-- corresponding sector ETF — and the second half is a statement about the whole
-- table rather than about a row. Task 2.2.4 refused to encode it here for that
-- reason, and the refusal still stands: a row-level check can express only the
-- first half and would read as though it enforced the rule. What this expresses
-- is the UNION's own shape, which is a row-level fact, and the table-level half
-- stays Task 2.3.5's loader's.
--
-- Note the `sector is null` half is what makes this stricter than criterion 3's
-- first half: it also refuses an index proxy that arrived carrying a sector.
alter table securities
    add constraint securities_sector_matches_kind
    check (
        (kind = 'index_etf' and sector is null)
        or (kind <> 'index_etf' and sector is not null)
    );

-- ---------------------------------------------------------------------------
-- 5. Provenance: a source and a retrieval timestamp per field GROUP.
-- ---------------------------------------------------------------------------
--
-- Acceptance criterion 6 says the metadata's source is recorded PER FIELD in a
-- way Story 2.14 can display, and invariant 6 says provenance is displayed
-- rather than implied. A single `source` column on the row is already known to
-- be wrong, because the fields do not share a source — `symbol`/`name`/
-- `exchange` plausibly come from a provider, `sector`/`industry` from a curated
-- file, `cik` from Epic 9, and `kind`/`status` from us.
--
-- `SECURITY_FIELD_GROUP` in `packages/shared` is the field-to-group mapping and
-- is total over `keyof Security`, so Story 2.14 reads which group a field on
-- screen belongs to rather than reverse-engineering it. What that story needs
-- from HERE is, for any field: that group's `source` string and its
-- `retrieved_at`.
--
-- **Two groups get columns and two deliberately do not.**
--   * `identity` (`cik`) waits for Epic 9, which is what populates `cik`. A
--     column null in every row in every environment cannot be checked against
--     anything, and would be a schema claiming to record something nothing
--     writes.
--   * `ours` (`kind`, `status`) gets no pair AT ALL. "We decided this" is not a
--     retrieval, and a `retrieved_at` on a judgement would be a timestamp
--     pretending to be evidence.
--
-- **`not null` with no default, and both halves of that are decisions.**
-- `not null` is available only because the table is empty — against a populated
-- table this statement would fail, and the alternative would be a nullable
-- column that never becomes non-null. And there is NO DEFAULT, because a default
-- would be this migration inventing a source: `default 'curated'` would silently
-- attribute every future row, including ones a provider wrote, to a file. The
-- consequence is deliberate and is the enforcement half of criterion 6: Task
-- 2.3.5's loader CANNOT insert a row without saying where the data came from.
--
-- **The `observed_at` question, answered explicitly rather than by omission** —
-- which is what README.md §2 asks of every table and what Task 2.2.4 did for
-- this one. There is still NO `observed_at` here, and the reasoning has not
-- changed: a security's sector is not a fact about the market at an instant,
-- because there is no moment at which "AAPL is in technology" became true the
-- way a price became true. `market_bars` in Story 2.8 remains the first table
-- that exercises the `observed_at` / `recorded_at` pair.
--
-- What HAS changed is that these four columns are the first thing in this schema
-- with a real claim on invariant 5's evidence pair, and they take only half of
-- it. `*_retrieved_at` is invariant 5's RETRIEVAL timestamp — when we asked the
-- source — and there is no event timestamp beside it because there is no event.
-- That is a genuine half-pair rather than an omission, and it is why these are
-- named `retrieved_at` rather than reusing `recorded_at`: `recorded_at` is when
-- we wrote the ROW, and a row can be rewritten from metadata retrieved long
-- before it. Those two really do differ, and a loader run against an unchanged
-- curated file is exactly when they differ most.
alter table securities
    add column profile_source text not null,
    add column profile_retrieved_at timestamptz not null,
    add column classification_source text not null,
    add column classification_retrieved_at timestamptz not null;

-- ---------------------------------------------------------------------------
-- What this migration deliberately does NOT do.
-- ---------------------------------------------------------------------------
--
-- **No foreign key, and therefore no exercise of the naming rule.** README.md §1
-- fixes `<referenced_table_singularised>_id` and Task 2.2.4 recorded it as
-- untested. Both candidates that could have tested it here were closed by Task
-- 2.3.1: the sector-to-ETF mapping went to `packages/shared` as a `Record` total
-- over the taxonomy rather than becoming a `sectors` table, and a separate
-- `security_field_provenance` table was rejected in favour of the columns above.
-- So **the foreign-key naming rule is STILL UNTESTED after the story most likely
-- to have exercised it**, and Story 2.8's `market_bars.security_id` inherits it.
-- Recorded here rather than left silent, because a convention that quietly
-- survives the story that should have tested it is exactly this repository's
-- third class of gap.
--
-- **No index.** README.md's rule is that an index chosen before there is a query
-- to serve is a guess with a write cost, and the one candidate was checked
-- rather than assumed: Task 2.3.5's loader looks rows up by `symbol` on every
-- run, and `symbol` already carries a `unique` constraint with a btree behind it
-- — which Task 2.2.4 verified is a UNIQUE CONSTRAINT rather than a bare index, a
-- distinction that matters to anything reading `pg_constraint`. So the loader
-- needs nothing new. Story 2.9 writes the first read and can size an index
-- against a query that exists.
