/**
 * What kind of thing a tracked security is.
 *
 * `equity` and `etf` are not two flavours of one thing: PRODUCT_SPEC.md §6 asks
 * for equities *plus* a small set of ETFs, and Epic 4 treats them differently —
 * a sector ETF is what an equity's move is measured *against*, so a screen that
 * mixed them would compare a thing to itself. That is why the schema carries a
 * column rather than a boolean.
 *
 * **This is deliberately not `Security`.** Story 2.3 owns that interface and
 * the rest of its vocabulary — name, exchange, sector, industry, `status`, and
 * the identifiers that reach a CIK — along with the taxonomy and the selection
 * rule. What is here is the one member of that vocabulary the product spec has
 * already fixed, and it is here rather than in `apps/backend` because
 * `apps/backend/migrations/0002_securities.sql` declares
 * `check (kind in ('equity', 'etf'))` and this repository's migration
 * conventions require a closed set's source of truth to be a TypeScript union
 * rather than the constraint itself — see `apps/backend/migrations/README.md`.
 * A check constraint with no source of truth is two vocabularies pretending to
 * be one.
 *
 * A `const` array rather than a bare `type`, the shape {@link HEALTH_STATUSES}
 * and {@link FEED_STATUSES} already have, so the members are readable at run
 * time by anything that has to compare them against the database.
 *
 * **This list and that constraint are checked against each other by
 * `pnpm test:database`** (Task 2.2.5). They are in two files that no single
 * tool reads — a `.sql` file is read by nothing in this repository at all — and
 * the failure was silent in the direction that matters: adding a member here
 * and not there means a row the type system permits and the database refuses,
 * at run time, in whatever writes it. The check reads the constraint's own text
 * back out of `pg_constraint` and parses it, which it has to, because Postgres
 * **rewrites** `check (kind in (…))` into `CHECK ((kind = ANY (ARRAY[…])))` —
 * so a string match against the migration would never have worked.
 */
export const SECURITY_KINDS = ["equity", "etf"] as const;

/** One of {@link SECURITY_KINDS}. */
export type SecurityKind = (typeof SECURITY_KINDS)[number];
