// The first read of this database (Task 2.4.1): the query, the mapping from a
// `securities` row to the `Security` domain object, and the module arrangement
// Epic 13's temporal isolation depends on.
//
// Those three are in ascending order of how expensive they are to get wrong,
// which is the reverse of how interesting they are. The query is four lines.
// The mapping is where a nullable column becomes an explicit domain answer. The
// **arrangement** is the one thing here that cannot be repaired from the
// outside later, so it is the one to read first.
//
// ## The seam, and why it is established here of all places
//
// `CLAUDE.md` records that the first `selectFrom` owns "the module whose export
// list is the whole guarantee". Invariant 4 says replay's temporal isolation is
// enforced in the data layer so that future-information leakage is
// *structurally impossible* rather than merely instructed. Task 2.2.1 measured
// how that is done with this query builder: Kysely exposes the query AST to a
// plugin, so a temporal plugin can rewrite a call site that asked for no time
// filter at all into one that carries `observed_at <= $replayClock`, and can
// **refuse** the raw `` sql`…` `` it cannot rewrite.
//
// The mechanism has one hole and it is not in the plugin. `withPlugin` returns
// a **different object** — the plugged handle and the raw one are two values —
// so the guarantee is worth exactly nothing if there is an unplugged handle
// somebody can import. Hence: **this module builds its `Kysely` instance and
// does not export it.** What leaves here is a small set of functions that
// return domain objects. `migrate.ts` and `load-universe.ts` already have that
// shape, but incidentally — they build a handle because they need one, and
// nobody was ever going to import it. This is the first module in the
// repository whose *job* is to be read from, so it is the first place the
// arrangement is load-bearing.
//
// **The cost of getting it right here is zero, and that is exactly why it is
// dangerous.** `securities` has no `observed_at` and is not a temporal table
// (`migrations/README.md` §2 names `market_bars`, Story 2.8's, as the first
// table that has one). So nothing this module does would be filtered by that
// plugin even once it exists, and a version of this file that exported the
// handle would pass every check anybody can write today. The seam is
// established against a case where breaking it has **no symptom at all** —
// which is the argument for doing it now rather than in Story 2.8, where the
// symptom would be a replay quietly showing a user the future.
//
// The practical rule for anything added below: a new read is a new **function**
// on the interface. If a caller ever needs something no function here provides,
// the answer is a function, never an exported handle.

import { Kysely, PostgresDialect } from "kysely";
import type pg from "pg";

import {
  isSecurity,
  type SecuritiesProvenance,
  type Security,
} from "@marketpulse/shared";

import type { Database, SecuritiesTable } from "./schema.js";

/**
 * The columns a {@link Security} is made of, and nothing else.
 *
 * An explicit list rather than `selectAll()`, for three reasons in ascending
 * order of weight. It does not fetch `id`, `recorded_at`, `updated_at` or the
 * four provenance columns, none of which the domain object has. A column added
 * to the table in a later migration does not silently start arriving here. And
 * — the one that is a check rather than a tidiness — because
 * {@link toSecurity} builds its candidate from exactly these names, a field
 * added to `Security` in `packages/shared` and forgotten here is a **compile
 * error** in the mapper rather than a field that is quietly `undefined` on the
 * wire.
 */
const SECURITY_COLUMNS = [
  "symbol",
  "name",
  "exchange",
  "kind",
  "sector",
  "industry",
  "status",
  "cik",
] as const satisfies readonly (keyof SecuritiesTable)[];

/**
 * The provenance columns, which are deliberately **not** in
 * {@link SECURITY_COLUMNS}.
 *
 * `Security` carries no provenance — its own header lists it among what is
 * absent — so these are read by a second function rather than widened into the
 * first. Only the two field groups that have a source: `identity` (`cik`) is
 * Epic 9's and has no stored pair, and `ours` (`kind`, `status`) is a judgement
 * rather than a retrieval, so a `retrieved_at` on it would be a timestamp
 * pretending to be evidence.
 */
const PROVENANCE_COLUMNS = [
  "profile_source",
  "profile_retrieved_at",
  "classification_source",
  "classification_retrieved_at",
] as const satisfies readonly (keyof SecuritiesTable)[];

/**
 * A `securities` row, narrowed to the columns {@link SECURITY_COLUMNS} selects.
 *
 * Deliberately not `Selectable<SecuritiesTable>`: that is the whole row, and
 * this type is the thing the mapper is handed, so it should say what was
 * actually fetched.
 */
export type SecurityRow = {
  [Column in (typeof SECURITY_COLUMNS)[number]]: SecuritiesTable[Column];
};

/**
 * A row came back that is not a security.
 *
 * **What happens to a row that does not map was decided rather than defaulted,
 * and the decision is: fail the whole read, loudly.** The alternative — skip
 * the row and return the rest — is worse in the way that matters here, because
 * a universe list that is silently one security short is indistinguishable from
 * a universe that is one security smaller, and *that* is a claim this product
 * makes on screen ("518 securities · 11 sectors"). Dropping a row turns a
 * malformed database into a wrong number, which is precisely the failure
 * PRODUCT_SPEC.md §35's "manufacture missing observations" prohibits. A read
 * that fails is a page that says the service could not be reached, which Story
 * 2.4 already has a rendering for.
 *
 * **It cannot happen, and that is not a reason to leave it undefined.** Every
 * field this could fail on is backed by a `check` constraint — `kind`,
 * `sector`, `status`, and the cross-column `securities_sector_matches_kind` —
 * so the database refuses these rows. The honest question is what the code does
 * if one arrives anyway, and the answers available were "throw a `TypeError`
 * from inside a request handler with no symbol in it" or this.
 */
export class SecurityMappingError extends Error {
  /** The offending row's symbol, as it was stored — unvalidated by definition. */
  readonly symbol: string;

  constructor(symbol: string) {
    super(
      `The securities row for ${symbol} is not a well-formed security: its symbol, kind, status or sector is outside the vocabulary in \`packages/shared\`, which the database's own check constraints should have refused.`,
    );
    this.name = "SecurityMappingError";
    this.symbol = symbol;
  }
}

/**
 * One row → one {@link Security}.
 *
 * **One function per domain type, beside the query, and never a generic
 * row-to-object mapper.** `migrations/README.md` §6 fixes that and gives the
 * reason; here the reason is concrete rather than principled. The row has one
 * nullable `sector` column and `Security` is a **discriminated union in which a
 * null sector means two different things**: on an index proxy it is the
 * complete and correct answer, and on an equity it is a row that should never
 * have loaded. A generic mapper copies the column across and the distinction is
 * gone. This is the place they separate again, and it is the only place.
 *
 * It is exported so the **fast** suite can drive it — the mapping is a pure
 * function over a row and needs no socket to check, which keeps the expensive
 * database suite for claims only a database can settle.
 *
 * ## Why the validation is `isSecurity` rather than written out here
 *
 * `isSecurity` ships beside the shape it checks in `packages/shared`, for the
 * reason `isHealthResponse` and `isApiError` do: a validator written anywhere
 * else is the copy that drifts. It already enforces every rule this mapper
 * needs, including the kind-to-sector agreement, and it is where the ticker is
 * validated. Re-implementing it here would be a second set of rules to keep in
 * step with the constraints.
 *
 * The `unknown` widening is the same one `validateUniverse` uses and it is the
 * honest statement of what is being checked: Kysely types `kind` as
 * `SecurityKind` because the *column* is declared that way, but that is a claim
 * about the database rather than an observation of the bytes that arrived. A
 * predicate applied to a value the compiler already believes narrows its
 * negative branch to `never`, so the check could not report what it found.
 */
export function toSecurity(row: SecurityRow): Security {
  // Built field by field rather than spread, so the column-to-field mapping is
  // written down. It is one-to-one today and the day it stops being — Story
  // 2.7 receiving a provider's spelling, Epic 9 filling `cik` — this is where
  // the translation goes, without the shape of the file changing.
  const candidate: unknown = {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    kind: row.kind,
    sector: row.sector,
    industry: row.industry,
    status: row.status,
    cik: row.cik,
  };

  if (!isSecurity(candidate)) throw new SecurityMappingError(row.symbol);

  return candidate;
}

/**
 * Reading securities out of Postgres.
 *
 * An interface rather than a class because what a caller depends on is the set
 * of questions it can ask, and Story 2.4's route needs to be buildable in a
 * test without a database — the same argument that keeps the pool out of
 * `buildServer()`.
 */
export interface SecuritiesRepository {
  /**
   * Every security in the table, ordered by symbol.
   *
   * **This does not filter on `status`, and that is a decision rather than an
   * omission.** `status` is this schema's one invisible predicate — a reader
   * that forgets it shows untracked securities — so `UNIVERSE.md` §12.2 names
   * every reader and which way each goes, and puts this one on the *do not
   * filter* side along with search, the Security Explorer and replay. The rule
   * in one sentence: filter when computing over **the market we track now**
   * (ingestion, breadth, topology, anomaly detection) and never when showing or
   * replaying **something we stored**. This is showing.
   *
   * The consequence a caller owes: `securities.length` is the number of rows we
   * hold, which from the first removal onward is **not** the number of
   * securities we track. Both are legitimate numbers and a page that reports
   * one has to say which. Filter on `status === "active"` in the caller if the
   * tracked count is what is wanted; do not push it down here, because the row
   * that would disappear is exactly the row Story 2.4 renders as untracked.
   */
  listSecurities(): Promise<readonly Security[]>;

  /**
   * The **distinct** provenance records across the whole table — where these
   * securities came from and when we asked.
   *
   * A set rather than a value, and that is the whole design. The wire contract
   * puts provenance on the envelope, which is a claim about *every* security in
   * the response; that claim is true exactly when this returns one element.
   * Zero means an empty table and nothing to attribute. More than one means the
   * rows disagree — which is not a fault, it is **Story 2.7 arriving**, filling
   * the profile fields from Alpaca while classification stays curated — and the
   * caller's job then is to stop making a claim it cannot support rather than to
   * pick a row. Collapsing that here, into a "the" provenance, would hide the
   * one condition anybody needs to see.
   *
   * **It is a second query and not a widening of {@link listSecurities}**, and
   * the cost of that is stated rather than hidden: the two run outside a
   * transaction, and Postgres gives each statement its own snapshot under READ
   * COMMITTED, so a `pnpm universe` landing between them could pair a list with
   * the previous load's dates. The window is milliseconds, the values are
   * per-load dates that move about once a quarter, and the alternative is
   * `REPEATABLE READ` around a page's footnote. Recorded, accepted.
   */
  listSecuritiesProvenance(): Promise<readonly SecuritiesProvenance[]>;
}

/**
 * Build the repository over an existing pool.
 *
 * **It takes a pool rather than opening one**, unlike `loadUniverse` and
 * `runMigrations`, and the difference is lifecycle rather than taste:
 * those two are programs that run and end, and this serves requests for as long
 * as the process lives. `index.ts` owns the pool, creates it once and closes it
 * inside the drain, and this handle rides on it.
 *
 * **So there is deliberately no `destroy()` here.** Kysely's `destroy()` ends
 * the underlying pool, which would take down a resource this module does not
 * own — the mirror of the note in `loadUniverse`, where the handle *does* own
 * its pool and `closeDatabasePool` must therefore not also be called. A
 * repository that could be destroyed would be a second way to close the
 * application's pool, half-way through a request.
 *
 * **This is where Epic 13 attaches its temporal plugin** — one `.withPlugin()`
 * on the line below, in the one place a handle is constructed, which is what
 * the seam described at the top of this file buys.
 */
export function createSecuritiesRepository(
  pool: pg.Pool,
): SecuritiesRepository {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async listSecurities() {
      const rows = await db
        .selectFrom("securities")
        .select(SECURITY_COLUMNS)
        // Postgres guarantees no order without one, so a list rendered in
        // whatever order the plan happened to produce would be stable until it
        // was not. By symbol because it is the domain identity and the only
        // column with a unique index behind it, which makes the order total —
        // ordering by sector would leave rows within a sector unordered and
        // reintroduce the same problem one level down. Grouping for the page is
        // presentation and belongs to the page.
        .orderBy("symbol")
        .execute();

      return rows.map(toSecurity);
    },

    async listSecuritiesProvenance() {
      const rows = await db
        .selectFrom("securities")
        .select(PROVENANCE_COLUMNS)
        // `distinct` over the four columns rather than a `group by`, because the
        // question is "how many different answers are there", not "how many rows
        // give each". One round trip either way; this one says what it means.
        .distinct()
        // Total, so a table that does disagree hands its caller a stable order
        // to report rather than whatever the plan produced. It cannot matter
        // while there is one row and it costs nothing.
        .orderBy("profile_source")
        .orderBy("profile_retrieved_at")
        .orderBy("classification_source")
        .orderBy("classification_retrieved_at")
        .execute();

      // `Date` to an ISO 8601 instant here rather than at the route, because
      // this is the boundary where a driver's representation becomes a domain
      // one — the same job `toSecurity` does for a row. JSON has no date type,
      // and epoch milliseconds is a number nobody can read in a response body.
      return rows.map((row) => ({
        profile: {
          source: row.profile_source,
          retrievedAt: row.profile_retrieved_at.toISOString(),
        },
        classification: {
          source: row.classification_source,
          retrievedAt: row.classification_retrieved_at.toISOString(),
        },
      }));
    },
  };
}
