// The database as Kysely sees it (Task 2.2.4): one interface per table, and one
// `Database` interface naming them.
//
// **Why this is hand-written.** Task 2.2.1 measured the alternatives and
// rejected all of them on one criterion: `kysely-codegen`, `drizzle-kit pull`
// and `prisma migrate dev` each introspect a **live** database, and Story 2.2's
// acceptance criterion 7 is that `pnpm verify` passes with no database running.
// Nothing is generated, no build step was added, and the schema — the `.sql`
// files next door — is the source of truth this file follows.
//
// **Why it lives in `apps/backend` rather than `packages/shared`**, decided by
// Task 2.2.3 and written out in `../migrations/README.md` §6. A row is not a
// domain object: this describes one process's transport, with `string` where
// Postgres has `numeric` and `bigint`, `Date` where it has `timestamptz`, and
// `null` where a column is nullable. `Security` — the domain type, with a
// sector rather than a `sector_id` and no nulls a caller has to think about —
// is Story 2.3's and goes in `packages/shared`. Two further reasons the row
// type does not: it carries Kysely's `ColumnType` helpers into whatever imports
// it, which would put the query builder in the frontend's type graph; and
// `packages/shared` is consumed as built output, so a column rename would mean
// rebuilding it before either app typechecks, for a type the frontend must
// never import.
//
// **What maps between the two lives beside the query**, one function per domain
// type and never a generic row-to-object mapper — because the mapping is
// exactly where a nullable column becomes an explicit domain answer, and a
// generic mapper is where that decision gets skipped. Story 2.4 writes the
// first read and owns it. There is deliberately nothing of the kind here yet.
//
// **Its only consumer is a test, and that is the point rather than a loose
// end.** `migrate.ts` deliberately does not consume it (see below), and Story
// 2.4 writes the first `selectFrom`. What Task 2.2.5 added is
// `migrate.database.test.ts`, which declares its column expectation
// `satisfies Record<keyof SecuritiesTable, ExpectedColumn>` and then compares
// that expectation against `information_schema`. So the two directions are held
// by two different things: the compiler holds interface → spec (a column added
// here and not described there is `TS1360`), and `pnpm test:database` holds
// spec → database. A column renamed in a migration and not here still
// typechecks, lints and builds — and it is now a red `pnpm test:database`
// rather than a run-time failure.
//
// **Why `migrate.ts` stays on `Kysely<unknown>`.** The obvious tidy-up is to
// give the migrator `Kysely<Database>` now that there is something to name, and
// it is wrong for three reasons. This interface describes the schema **after**
// every migration has run, so a migrator typed with it claims a shape that is
// false for the entire duration of the thing it is doing — during `0002` there
// is no `securities` table. It would buy nothing, because migration bodies go
// through `sql.raw()` and no `selectFrom` exists in that file. And it would
// make the migrator depend at compile time on the description of its own
// output, so a migration that dropped a table would break the compilation of
// the runner that has to apply it. The generic stays `unknown`, and the comment
// there says so.

import type { ColumnType, Generated, GeneratedAlways } from "kysely";

import type { Sector, SecurityKind, SecurityStatus } from "@marketpulse/shared";

/**
 * `securities` — the tracked universe. See `../migrations/0002_securities.sql`,
 * which is the source of truth this mirrors.
 *
 * Read the column types against `../migrations/README.md` §4: `pg` hands a
 * `bigint` to JavaScript as a **string**, deliberately, because a JavaScript
 * `number` is a double and would stop round-tripping above 2^53. That is not a
 * thing to "fix" with a type parser.
 */
export interface SecuritiesTable {
  /**
   * `bigint generated always as identity`.
   *
   * `GeneratedAlways` rather than `Generated`, and the distinction is real
   * rather than cosmetic: it is `ColumnType<S, never, never>`, so an insert
   * that supplies an `id` is a **compile error**, which is precisely what the
   * column does at run time (`cannot insert a non-DEFAULT value into column
   * "id"`, produced). `Generated` would permit it and let the database refuse
   * it later. The two halves agree by construction here, which is rare enough
   * in this file to be worth the note.
   *
   * `string` because it is a `bigint`.
   */
  id: GeneratedAlways<string>;

  /** The natural key, `unique` in the database. Format is unvalidated here and there. */
  symbol: string;

  name: string;
  exchange: string;

  /**
   * The union, not `string`. Three members since `0003` —
   * `equity | sector_etf | index_etf` — because a sector proxy and an index
   * proxy are what Epic 4 and Epic 5 have to tell apart.
   *
   * The two halves agree and **something checks that they do**, which was not
   * true when Task 2.2.4 wrote this comment: `pnpm test:database` parses
   * `securities_kind_check` out of `pg_constraint` and compares it against
   * `SECURITY_KINDS`. It is the check that caught this column and the
   * constraint disagreeing between Tasks 2.3.2 and 2.3.3, which is the only
   * evidence worth having that it works.
   */
  kind: SecurityKind;

  /**
   * The taxonomy union rather than `string` since `0003`, backed by
   * `securities_sector_check`.
   *
   * **Null exactly when {@link kind} is `index_etf`**, which the database holds
   * as `securities_sector_matches_kind` and which `Security` in
   * `packages/shared` holds as a discriminated union. This row type cannot
   * express it — a row is one interface with one nullable column, which is the
   * whole reason the domain type is a different type — so here the two meanings
   * of `null` are indistinguishable and the mapping Story 2.4 writes is where
   * they separate again.
   */
  sector: Sector | null;

  /**
   * Deliberately still an open `string` with no `check`, unlike {@link sector}.
   * There is no ETF per industry, therefore no benchmark, therefore no closed
   * set to be a source of truth for — and a constraint over a list nobody
   * maintains refuses correct data.
   */
  industry: string | null;

  /**
   * The union since `0003`, backed by `securities_status_check`. It was
   * `string` from Task 2.2.4 until then, deliberately, because Story 2.3 owned
   * the vocabulary and one invented earlier would have been a vocabulary that
   * story had to migrate rather than choose.
   *
   * Two members, `active` and `untracked`. It is what replaces a soft delete,
   * and it is an **invisible predicate**: a reader that forgets to filter on it
   * shows untracked securities.
   */
  status: SecurityStatus;

  /** The SEC's Central Index Key. Text, because its leading zeros are part of it. */
  cik: string | null;

  /**
   * When we wrote the row: `timestamptz not null default now()`.
   *
   * The three type parameters are each doing something, and writing it out
   * long-hand rather than as `Generated<Date>` is the point. **Select** is a
   * `Date` — never `timestamp`, because `pg` hands a naive one back as a `Date`
   * silently reinterpreted in the *reading process's* timezone, an error of
   * that process's UTC offset with nothing failing. **Insert** is optional,
   * because the column has a default. And **update is `never`**, which is this
   * type expressing the one thing `../migrations/README.md` §2 says about the
   * column that SQL cannot: "when we wrote it" is not a fact that changes, so
   * an `update` touching it is a bug, and here it is a compile error. The
   * database would happily allow it.
   */
  recorded_at: ColumnType<Date, Date | undefined, never>;

  /**
   * Where `symbol`, `name` and `exchange` came from, and when we asked.
   *
   * `not null` with **no default**, so a writer cannot insert a row without
   * saying where the data came from — which is acceptance criterion 6's
   * enforcement half rather than a schema that merely has somewhere to put it.
   * A `default 'curated'` would silently attribute a provider's row to a file.
   *
   * Plain `string` and `Date` rather than a `ColumnType`: both are supplied on
   * insert and both are updatable, because re-running the loader against a
   * newer source is exactly when they should change. Contrast
   * {@link recorded_at}, whose update parameter is `never`.
   *
   * `SECURITY_FIELD_GROUP` in `packages/shared` maps a field to its group, so
   * Story 2.14 can render "where did this come from" beside any field without
   * reverse-engineering which pair to read.
   */
  profile_source: string;
  profile_retrieved_at: Date;

  /**
   * Where `sector` and `industry` came from, and when we asked.
   *
   * The group whose staleness is a recorded gap: the curated file goes out of
   * date silently, and a sector reclassification has **no symptom at all** — it
   * simply benchmarks a security against the wrong ETF, indefinitely and
   * correctly-looking. This timestamp is the mitigation, and a weak one: it
   * makes the file's age visible on screen through Story 2.14 rather than only
   * in git history.
   */
  classification_source: string;
  classification_retrieved_at: Date;

  /**
   * When it last changed. `Generated<Date>` — defaulted on insert and, unlike
   * {@link recorded_at}, **updatable**, which is the whole distinction between
   * the two columns rendered in the type system.
   *
   * That it is *actually* maintained is the writer's obligation and not this
   * type's: there is deliberately no trigger, so a writer that updates a row
   * and forgets this column leaves a stale value. Nothing catches that — it is
   * the "nothing can confirm a writer put the right value in the right column"
   * case the conventions document names, arriving on the first table.
   */
  updated_at: Generated<Date>;
}

/**
 * Every table, by the name Postgres knows it by.
 *
 * `snake_case` keys because these are the database's identifiers rather than
 * ours; Kysely uses them verbatim in the SQL it builds. Story 2.9's mapping
 * layer is where they become domain vocabulary.
 */
export interface Database {
  securities: SecuritiesTable;
}
