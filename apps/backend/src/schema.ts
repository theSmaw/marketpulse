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
// generic mapper is where that decision gets skipped. Story 2.8 writes the
// first read and owns it. There is deliberately nothing of the kind here yet.
//
// **Its only consumer is a test, and that is the point rather than a loose
// end.** `migrate.ts` deliberately does not consume it (see below), and Story
// 2.8 writes the first `selectFrom`. What Task 2.2.5 added is
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

import type { SecurityKind } from "@marketpulse/shared";

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
   * The union, not `string` — this is the one column whose vocabulary is
   * settled, by PRODUCT_SPEC.md §6, and the database carries the matching
   * `check (kind in ('equity', 'etf'))`.
   *
   * **Nothing compares the two.** Adding a member to `SECURITY_KINDS` without
   * the corresponding migration gives a value the compiler permits and the
   * database refuses at run time. Task 2.2.5 can close this by reading the
   * constraint's own text out of `information_schema`.
   */
  kind: SecurityKind;

  /** Null for an index proxy, which has neither. */
  sector: string | null;
  industry: string | null;

  /**
   * `string` and deliberately not a union: Story 2.3 owns this vocabulary, the
   * database carries no `check` on it for the same reason, and a union invented
   * here would be a vocabulary that story has to migrate rather than choose.
   * It narrows when `Security` arrives.
   */
  status: string;

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
 * ours; Kysely uses them verbatim in the SQL it builds. Story 2.8's mapping
 * layer is where they become domain vocabulary.
 */
export interface Database {
  securities: SecuritiesTable;
}
