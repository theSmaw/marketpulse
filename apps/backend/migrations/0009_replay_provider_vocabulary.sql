-- Widen `bar_coverage`'s PROVIDER vocabulary to admit `replay`.
--
-- The companion to `0008`, which widened the FEED check. They are separate
-- because the two unions were widened in separate tasks, and that ordering was
-- a rule rather than an accident: `market-provenance.test.ts` holds that **a
-- provider id is a member only when something can produce it** (precedent:
-- `SECURITY_STATUSES`' `delisted`, which still waits for the code that can set
-- it). `MARKET_FEEDS` is a label vocabulary and could be widened early;
-- `PROVIDER_IDS` is operator-settable configuration and had to wait for
-- `createReplayStream`, which Task 3.2.7 is.
--
-- WHY IT IS NOT OPTIONAL. `market-bars.database.test.ts` ties
-- `bar_coverage_provider_check` to `PROVIDER_IDS` and asserts **set equality**
-- — not a subset. Widening the union without this turns `pnpm test:database`,
-- one of the three required checks on `main`, red. ADR 0030 §3 records that
-- coupling as verified rather than assumed and rejects weakening the test,
-- because its whole value is that the union and the database are one
-- vocabulary.
--
-- THE WINDOW THIS OPENS, STATED RATHER THAN LEFT TO BE DISCOVERED. Widening
-- `PROVIDER_IDS` widens `schema.ts`'s insert types, so **the compiler stops
-- preventing a replayed write at the same moment this check starts permitting
-- the value.** That window is open from this migration until Task 3.2.8 lands
-- the runtime guard in `recordSeries`, with the `pnpm break` entry that proves
-- it goes red.
--
-- It is deliberate rather than an oversight. The alternative is a vocabulary
-- the application knows and the database refuses, which fails the required
-- check above and buys nothing: a `check` constraint is not where this product
-- wants its provenance policy, because the policy is **never write one** rather
-- than **this column may not hold one**.
--
-- Forward-only, and additive: dropping and re-adding a `check` rewrites no rows
-- and holds no lock worth naming at this table's size.

alter table bar_coverage
    drop constraint bar_coverage_provider_check;

alter table bar_coverage
    add constraint bar_coverage_provider_check
        check (provider in ('fixture', 'alpaca', 'replay'));
