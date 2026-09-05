/**
 * What a security **is** in this product, and the vocabularies that describe
 * one.
 *
 * Story 2.3's acceptance criterion 1 is that this is defined **once**, and the
 * decisions behind every name below were taken by Task 2.3.1 and recorded in
 * `planning/epic-02-security-universe-historical-data/story-03-.../UNIVERSE.md`,
 * which is this story's one document about the subject. That file is the
 * argument; this file is the vocabulary. Where they disagree, the file with the
 * rejected alternatives in it is the one that was thought about.
 *
 * ## Why this is not `SecuritiesTable`
 *
 * `apps/backend/src/schema.ts` holds a row type for the same table and the two
 * are deliberately different types in different packages —
 * `apps/backend/migrations/README.md` §6 gives the three reasons and none of
 * them has changed. The differences are visible rather than theoretical, and
 * they are the point:
 *
 * - **The row has `id`, `recorded_at` and `updated_at`; this has none of
 *   them.** Those are facts about our storage rather than about the security,
 *   and the practical test is that `apps/backend/src/universe.ts` — the curated
 *   list, Task 2.3.4's — has to satisfy this interface, and a file checked into
 *   a repository cannot know a surrogate key or the instant a row was written.
 *   The domain identity here is {@link SecurityBase.symbol}.
 * - **The row's `sector` is nullable; this makes an explicit answer.** See the
 *   three-variant union below: on an equity and on a sector proxy a sector is
 *   *required*, and on an index proxy it is *structurally absent*. That is
 *   acceptance criterion 3's first half held by the compiler rather than by the
 *   loader, which is precisely what `UNIVERSE.md` §6 promised when it chose a
 *   `.ts` module over a data file.
 * - **The row's `kind` and `status` are the database's `text` columns; these
 *   are unions.** The constraint is the backstop and the union is the source of
 *   truth, which is the arrangement `migrations/README.md` requires of every
 *   closed set.
 *
 * The mapping between the two is **Story 2.4's**, one function per domain type
 * and never a generic row-to-object mapper, because the mapping is exactly
 * where a nullable column becomes an explicit answer. Nothing of the kind is
 * here, and the reflex to make one type derive from the other is the thing
 * `migrations/README.md` §6 already refused.
 *
 * ## What is deliberately absent
 *
 * No price, no bar, no filing, no market capitalisation, no anomaly score. The
 * test is whether the field is a fact about the security or a fact about
 * something that happened to it: Story 2.8 owns the second kind and Epic 9 owns
 * filings. {@link SecurityBase.cik} is the one identifier that stays, because
 * it is a name for *this company* rather than an event — and it is null for
 * every row until Epic 9 populates it.
 */

import { isTicker, toTicker } from "./ticker.js";
import type { Ticker } from "./ticker.js";

/**
 * What kind of thing a tracked security is.
 *
 * **Three members and not two**, widened from `equity | etf` by Task 2.3.1.
 * `SPY`, `QQQ`, `DIA` and `IWM` are what "the market" means; the eleven sector
 * SPDRs are what "the sector" means; Epic 4's sector rows and Epic 5's
 * relative-move need to tell them apart, and a screen that mixed them would
 * compare a thing to itself.
 *
 * Two shapes were rejected for it, and the second is the trap. A **second
 * nullable column** (`kind` stays `equity | etf`, plus an `etf_role` that must
 * be non-null exactly when `kind = 'etf'`) is expressible as a cross-column
 * check in the database and expressible nowhere in TypeScript, so the type
 * system would permit a state the database refuses at run time — the one gap
 * this vocabulary already has once and should not have twice. **Inferring it
 * from whether `sector` is set** needs no schema change at all and reads an
 * *absence* as a positive claim: a rule nobody wrote down, correct only for as
 * long as a different rule is enforced somewhere else.
 *
 * Task 2.2.4 chose `text` + `check` over a Postgres `enum` specifically so this
 * widening is writeable in one migration — inside a transaction, which is what
 * a migration is here, adding an enum value *and using it* is refused with
 * `unsafe use of new value "etf" of enum type`. **This is the first time that
 * argument pays**, and Task 2.3.3 writes the migration.
 *
 * ~~Until it does, this array and `0002_securities.sql`'s
 * `check (kind in ('equity', 'etf'))` deliberately disagree.~~ **Task 2.3.3
 * landed and they agree again**, held by `securities_kind_check` in
 * `0003_security_vocabulary.sql`. The struck-through sentence is kept because
 * the gap it describes was real for exactly one commit and is the only evidence
 * this repository has that the check works: `pnpm test:database` reported
 * `1 failed | 22 passed` naming both sides, which is what that suite is for.
 *
 * A `const` array rather than a bare `type`, the shape {@link HEALTH_STATUSES},
 * `FEED_STATUSES`, `ANOMALY_BANDS` and `API_ERROR_CODES` already have, so the
 * members are readable at run time by anything comparing them against the
 * database.
 */
export const SECURITY_KINDS = ["equity", "sector_etf", "index_etf"] as const;

/** One of {@link SECURITY_KINDS}. */
export type SecurityKind = (typeof SECURITY_KINDS)[number];

/**
 * The kinds that are an ETF.
 *
 * This is the single stated cost of widening {@link SECURITY_KINDS} to three
 * members: "is this an ETF" stops being an equality and becomes a membership
 * test. It lives here beside the vocabulary rather than at each call site for
 * the reason `isHealthResponse` and `isApiError` live beside the shapes they
 * check — a derivation written anywhere else is the copy that drifts, and this
 * one would drift the moment a fourth kind arrives.
 *
 * It is an array as well as {@link isEtf} because the two do different jobs: a
 * caller holding a whole {@link Security} wants the narrowing predicate, and a
 * caller building a query or filtering a list of kinds wants the set. Epic 4 is
 * the first real reader of either.
 */
export const ETF_KINDS = ["sector_etf", "index_etf"] as const;

/** One of {@link ETF_KINDS}. A strict subset of {@link SecurityKind}. */
export type EtfKind = (typeof ETF_KINDS)[number];

/**
 * The sector taxonomy: eleven members, chosen **against the ETFs rather than
 * against familiarity**.
 *
 * Epic 5 compares a security to *its sector ETF*, so a taxonomy whose members
 * do not map one-to-one onto the SPDR set produces a security with a sector and
 * no benchmark — acceptance criterion 3 failing structurally rather than by
 * data entry. {@link SECTOR_ETFS} is that mapping and it is total over this
 * union by construction, so the criterion can only be broken by adding a
 * twelfth sector, and there is nowhere to add one without also naming its ETF.
 *
 * **These are GICS-*shaped* names and carry no GICS data.** GICS is the
 * vocabulary people recognise and it is proprietary — S&P and MSCI license the
 * classification and its constituent assignments. What is free is the
 * eleven-sector shape, which is what the sector SPDRs already imply. So these
 * are ordinary English sector names, with no GICS constituent list and no
 * licence.
 *
 * **Machine-readable members with a separate label**, which is a decision
 * rather than a default: every other vocabulary in this package is lowercase
 * and punctuation-free, these values reach URLs, database columns and
 * agent-facing text, and {@link SECTOR_LABELS} carries the display string so
 * nobody derives one by string transform. `"Health Care"` and `"Healthcare"`
 * are the same slug and different words, and a transform picks one silently.
 *
 * Two limitations to carry, both from `UNIVERSE.md` §1 and both stated rather
 * than discovered later. **The sector SPDRs hold S&P 500 constituents only**,
 * so a tracked equity outside the index has a sector, has a benchmark, and is
 * not a constituent of it — fine for a relative-move comparison and wrong for
 * anything treating the ETF as the sector's complete membership. And **the
 * technology / communication services / consumer discretionary boundary is
 * genuinely arguable**, which is the boundary the flagship demo runs through;
 * whatever Task 2.3.4 assigns is a recorded claim with a provenance of
 * `curated`, not a fact, which is exactly why provenance is per field group.
 */
export const SECTORS = [
  "technology",
  "health_care",
  "financials",
  "consumer_discretionary",
  "communication_services",
  "industrials",
  "consumer_staples",
  "energy",
  "utilities",
  "real_estate",
  "materials",
] as const;

/** One of {@link SECTORS}. */
export type Sector = (typeof SECTORS)[number];

/**
 * Each sector's benchmark ETF — the thing Epic 5 measures a security against.
 *
 * **Domain vocabulary rather than data, and that was argued rather than
 * assumed.** It is a table of strings that changes when the ETF set changes,
 * which is the case for treating it as data and putting it in the universe
 * file. It is here instead because Epic 5's relative-move and Epic 4's sector
 * rows both read it, so it is a fact both sides depend on rather than a fact
 * about our particular list — the same test {@link HealthResponse} passes and
 * Story 1.6's configuration type failed.
 *
 * A `Record` keyed by the {@link Sector} union rather than a lookup array, so
 * it is **total by construction**: a sector added without its ETF is a compile
 * error. That is acceptance criterion 3's second half expressed at compile
 * time, where the loader's version of it (Task 2.3.5) is a run-time check over
 * the actual list.
 *
 * **The cost, stated:** the eleven `sector_etf` rows in the universe file are
 * derivable from this table — a `sector_etf` row's sector is precisely the key
 * it is the value of — so hand-typing them there would create a second copy of
 * this table in the same commit as the first. Task 2.3.4 generates them from
 * here, and Task 2.3.5's set-level validation compares the two.
 *
 * The values go through {@link toTicker} rather than being bare strings, so a
 * typo is a throw at module load rather than a symbol nothing matches. That is
 * the same startup-assertion shape `getTokens()` has in `apps/frontend`, and it
 * is the first real job the {@link Ticker} brand has had.
 */
export const SECTOR_ETFS: Record<Sector, Ticker> = {
  technology: toTicker("XLK"),
  health_care: toTicker("XLV"),
  financials: toTicker("XLF"),
  consumer_discretionary: toTicker("XLY"),
  communication_services: toTicker("XLC"),
  industrials: toTicker("XLI"),
  consumer_staples: toTicker("XLP"),
  energy: toTicker("XLE"),
  utilities: toTicker("XLU"),
  real_estate: toTicker("XLRE"),
  materials: toTicker("XLB"),
};

/**
 * How each sector is written when a human reads it.
 *
 * Here rather than in `apps/frontend` for the reason {@link SECTORS} is: the
 * sector name is user-visible from Epic 4 onward, in chart axes, URLs and
 * agent-facing text, and this story's own Design surface note records that
 * renaming it later is expensive. Eleven display strings retyped in Epic 4 and
 * again in Epic 6 are eleven strings that will eventually differ.
 *
 * This is a **name and not a colour**, which is the line `ANOMALY_BANDS`
 * already draws: the words are domain, the `--anomaly-*` and `--price-*` tokens
 * that present them are not and have no business in a package a Fastify server
 * consumes.
 *
 * Total over {@link Sector} for the same reason {@link SECTOR_ETFS} is.
 */
export const SECTOR_LABELS: Record<Sector, string> = {
  technology: "Technology",
  health_care: "Health Care",
  financials: "Financials",
  consumer_discretionary: "Consumer Discretionary",
  communication_services: "Communication Services",
  industrials: "Industrials",
  consumer_staples: "Consumer Staples",
  energy: "Energy",
  utilities: "Utilities",
  real_estate: "Real Estate",
  materials: "Materials",
};

/**
 * Whether we are currently tracking a security.
 *
 * **Two members, and this is what replaces a soft delete.** Nothing here is
 * `deleted_at`-ed, per `migrations/README.md` §5: a security's bars are still
 * what happened, and Epic 13 replays a date on which it was in the universe.
 *
 * - **`active`** — it is in the universe file; we track it and we store bars
 *   against it.
 * - **`untracked`** — it was removed from the universe file. **The row stays
 *   and so do its bars.** Task 2.3.6 chose this over a `DELETE` and over
 *   refusing the load, and produced both alternatives rather than arguing them:
 *   under a `DELETE` a removed-then-re-added symbol comes back on a **new**
 *   `id`, orphaning everything filed against the old one. The loader writes it
 *   — see `untrackAbsent` in `apps/backend/src/load-universe.ts`.
 *
 * **What every reader of this column owes it, because it is an invisible
 * predicate.** `migrations/README.md` §5's argument is that one is a design and
 * two is a bug waiting for whoever forgets, and this is the one. The rule, and
 * the seven readers it was derived against, are in `UNIVERSE.md` §12.2: filter
 * on `status` when computing over *the market we track now* — ingestion,
 * breadth, sector performance, topology, anomaly detection — and **never** when
 * showing or replaying *something we stored*. Epic 13 is the one that matters:
 * a security untracked today was tracked on the date being replayed, so a
 * replay that filtered on today's `status` would silently rewrite history,
 * which is invariant 4's failure arriving through a column rather than through
 * a timestamp.
 *
 * **`delisted` is deliberately not a member, and this is the decision most
 * likely to be questioned.** It is a genuinely different event — one is a fact
 * about the market and the other a fact about us — and conflating them is cheap
 * now and a migration later. It is absent because **nothing in this story can
 * produce it**, which is this repository's own stated rule for adding a member
 * to a vocabulary and has been applied twice already: `UNSUPPORTED_MEDIA_TYPE`
 * was refused because no request produces a 415, and `SERVICE_UNAVAILABLE` was
 * designed and left unadded until the story that can return it. A member with
 * no producer means "this has never happened", which is indistinguishable in
 * the data from "this cannot happen". **Its producer is Story 2.7**, which
 * carries it in its own scope rather than only being named here.
 *
 * A single collapsed `inactive` member is rejected outright: it is cheaper than
 * either and it destroys the distinction permanently, because a symbol we
 * stopped tracking is **reversible** and a delisted one is not.
 *
 * ## What every later reader owes this field
 *
 * `status` is an **invisible predicate** — a reader that forgets to filter on
 * it shows untracked securities — and `migrations/README.md` §5's own argument
 * is that one invisible predicate is a design and two is a bug waiting for
 * whoever forgets. This is the one. The rule Task 2.3.1 fixed: **`status` is
 * displayed rather than filtered away wherever a human is looking at a
 * security**, because "we stopped tracking this on 2026-11-04" is information,
 * and silently vanishing rows is the failure a soft delete would have caused.
 */
export const SECURITY_STATUSES = ["active", "untracked"] as const;

/** One of {@link SECURITY_STATUSES}. */
export type SecurityStatus = (typeof SECURITY_STATUSES)[number];

/**
 * The fields every security has whatever kind it is.
 *
 * Not exported as a usable type on its own — {@link Security} is the type
 * callers hold — because the whole point of the three-variant union below is
 * that a security is never merely "a base with a kind attached".
 */
interface SecurityBase {
  /**
   * The domain identity: the ticker, validated.
   *
   * A {@link Ticker} rather than a `string`, which is what that branded type
   * has been waiting for since Story 1.1 — its own comment says whether a
   * ticker is *listed* is a question for the security universe, and this is it.
   * The brand is erased at run time; what it buys is that a raw string cannot
   * reach a function expecting a validated symbol without passing through
   * {@link toTicker} or {@link isTicker}.
   *
   * **This is the identity and it is not stable.** `FB` became `META`, and the
   * database's surrogate `id` exists for exactly that case. Nothing here can
   * join old rows to a new name, and **Task 2.3.6 recorded that as a gap with
   * an owner rather than building a mechanism against no instance** — produced,
   * not assumed: renaming a symbol in the universe file gives **two rows, two
   * ids and nothing joining them**, the old one correctly `untracked` with its
   * history and the new one empty. **The owner is Story 2.7**, the first thing
   * here with any opinion about a symbol's lifecycle. Until then a rename loses
   * the link between the old bars and the new symbol. `UNIVERSE.md` §12.6.
   */
  symbol: Ticker;

  /** The company or fund name, as a human reads it. */
  name: string;

  /**
   * The listing venue — `NASDAQ`, `NYSE`, `ARCA`.
   *
   * A plain `string` and deliberately not a union: unlike {@link SecurityKind}
   * and {@link SecurityStatus}, nothing in this product branches on it, the set
   * is the market's rather than ours, and Story 2.7 is the first thing that
   * will receive it from a provider with its own spelling. A union invented
   * here would be a vocabulary that story has to migrate rather than adopt —
   * the same reason Task 2.2.4 left `status` unconstrained for this story to
   * choose.
   */
  exchange: string;

  /**
   * The finer classification — `Semiconductors`, `Biotechnology`.
   *
   * **It has no benchmark and Epic 5 must not assume one.** {@link Sector} is
   * the level with an ETF against it; this is where the fine grain lives, and a
   * finer taxonomy with one ETF per member does not exist for free, which is
   * the measurement that fixed the taxonomy at eleven.
   *
   * Nullable, unlike {@link Security}'s sector, and the asymmetry is
   * deliberate: acceptance criterion 3 is about sector, and requiring an
   * industry would be this task inventing a rule the story did not state.
   * PRODUCT_SPEC.md §11's "82% of semiconductor securities" and §38's
   * "semiconductor weakness is broad" are both *industry*-level claims, so the
   * selection rule requires at least one deep industry group — a coverage rule
   * over the list, not a constraint on a row.
   */
  industry: string | null;

  /** See {@link SECURITY_STATUSES}. Read the invisible-predicate note there. */
  status: SecurityStatus;

  /**
   * The SEC's Central Index Key, which is how Epic 9 maps this security to its
   * filings.
   *
   * `string` and not a number, because its leading zeros are part of it
   * (`0001045810`). **Null for every security today**, and null forever for an
   * ETF, which does not file. Epic 9 populates it — and Task 2.3.4 leaves it
   * null rather than guessing, because a guessed identifier is worse than an
   * absent one: Epic 9 will trust it.
   */
  cik: string | null;
}

/**
 * A tracked company. Its {@link sector} is **required**, which is acceptance
 * criterion 3's first half held by the compiler: a row in the universe file
 * that omits it, or names something outside {@link SECTORS}, does not compile.
 */
export interface EquitySecurity extends SecurityBase {
  kind: "equity";
  sector: Sector;
}

/**
 * A sector proxy — one of the eleven SPDRs. Its {@link sector} is the sector it
 * proxies, so {@link SECTOR_ETFS} maps that key back to this security's own
 * symbol, and Task 2.3.4 derives these rows from that table rather than typing
 * them twice.
 */
export interface SectorEtfSecurity extends SecurityBase {
  kind: "sector_etf";
  sector: Sector;
}

/**
 * A market proxy — `SPY`, `QQQ`, `DIA`, `IWM`. Its {@link sector} is `null` and
 * the type says so, which is the difference between "we do not know" and "there
 * is no answer": an index proxy does not belong to a sector, and reading its
 * null sector as unclassified is the inference Task 2.3.1 rejected.
 */
export interface IndexEtfSecurity extends SecurityBase {
  kind: "index_etf";
  sector: null;
}

/** Either kind of ETF. See {@link isEtf}. */
export type EtfSecurity = SectorEtfSecurity | IndexEtfSecurity;

/**
 * A security MarketPulse tracks.
 *
 * A discriminated union on {@link SecurityKind} rather than one interface with
 * a nullable sector, because the nullability has **two distinct meanings** and
 * the discriminant is what tells them apart: on an index proxy a null sector is
 * the correct and complete answer, and on an equity it is a row that should
 * have failed to load. A flat `sector: Sector | null` would make acceptance
 * criterion 3 a run-time check everywhere; this makes it a compile error in the
 * universe file and leaves the loader the cross-row rules a type cannot express.
 */
export type Security = EquitySecurity | SectorEtfSecurity | IndexEtfSecurity;

/**
 * Is this security an ETF rather than a company?
 *
 * The narrowing half of {@link ETF_KINDS}: after this returns true, `sector`
 * still needs discriminating, because a sector proxy has one and an index proxy
 * does not.
 */
export function isEtf(security: Security): security is EtfSecurity {
  return ETF_KINDS.some((kind) => kind === security.kind);
}

/**
 * The provenance groups acceptance criterion 6 records a source against.
 *
 * **A single `source` on the row is already known to be wrong**, which is why
 * this exists at all: the fields have genuinely different sources, so one
 * column would be a claim that is true of some of them.
 *
 * - **`profile`** — `symbol`, `name`, `exchange`. The curated file today;
 *   plausibly Alpaca's assets endpoint from Story 2.7.
 * - **`classification`** — `sector`, `industry`. The curated file, and the
 *   group whose staleness is recorded as a gap: Alpaca carries neither, so
 *   there is nothing to reconcile it against.
 * - **`identity`** — `cik`. Epic 9's, and it gets no stored source/timestamp
 *   pair until then, because a column null in every row in every environment
 *   cannot be checked against anything.
 * - **`ours`** — `kind`, `status`. A judgement rather than a retrieval, so it
 *   gets no pair at all: a `retrieved_at` on it would be a timestamp pretending
 *   to be evidence.
 *
 * What is stored is Task 2.3.3's — two columns per group that has a source, and
 * the `observed_at` question answered explicitly there. What is *here* is the
 * vocabulary and the field-to-group mapping, so the loader and Story 2.14's
 * renderer agree about which group a field on screen belongs to rather than
 * each deciding.
 */
export const SECURITY_FIELD_GROUPS = [
  "profile",
  "classification",
  "identity",
  "ours",
] as const;

/** One of {@link SECURITY_FIELD_GROUPS}. */
export type SecurityFieldGroup = (typeof SECURITY_FIELD_GROUPS)[number];

/**
 * Which provenance group each field of a {@link Security} belongs to.
 *
 * `Record<keyof Security, …>` and not a loose object, so it is **total by
 * construction**: a field added to the interface without a group is a compile
 * error, which is the same guarantee the response schemas get from
 * `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` and the same
 * `TS1360` when it fails. Acceptance criterion 6 says the source is recorded
 * *per field*; this is the half of that the compiler can hold.
 *
 * `keyof Security` over a union is the keys the three variants share, which is
 * all of them — the variants differ in their field *types*, never in which
 * fields exist. If a variant ever gains a field of its own, this stops covering
 * it silently, and that is worth knowing before adding one.
 */
export const SECURITY_FIELD_GROUP: Record<keyof Security, SecurityFieldGroup> =
  {
    symbol: "profile",
    name: "profile",
    exchange: "profile",
    sector: "classification",
    industry: "classification",
    cik: "identity",
    kind: "ours",
    status: "ours",
  };

/**
 * Is this parsed JSON a {@link Security}?
 *
 * It ships beside the interface for the reason {@link isHealthResponse} and
 * {@link isApiError} do — a validator written anywhere but beside its shape is
 * the copy that drifts — and unlike those two it has **two** readers rather
 * than one: Task 2.3.5's loader, which has to reject a malformed row, and
 * Story 2.10's frontend, which receives these over the wire from Story 2.9's API
 * and is in exactly the position `api-client.ts` is in for `/health`.
 *
 * **It is the {@link isApiError} case and not the {@link isHealthResponse}
 * case**, which is the asymmetry those two already record and which has to be
 * decided rather than copied. It **does** check `kind`, `sector` and `status`
 * against their const arrays. All three are switched on rather than rendered:
 * Epic 4 branches on `kind`, Epic 5 keys the benchmark lookup on `sector`, and
 * every reader filters on `status`. An unrecognised sector is not a version
 * skew a client can still display — it is a security with no benchmark, which
 * is the exact failure acceptance criterion 3 exists to prevent, and admitting
 * it into the union would push that failure to whatever indexes
 * {@link SECTOR_ETFS} with it.
 *
 * It also enforces the kind-to-sector agreement the union encodes, because a
 * predicate that accepted an index proxy carrying a sector would be claiming a
 * value the type system says cannot exist.
 */
export function isSecurity(value: unknown): value is Security {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.symbol !== "string" ||
    !isTicker(candidate.symbol) ||
    typeof candidate.name !== "string" ||
    typeof candidate.exchange !== "string"
  ) {
    return false;
  }

  if (!(
    candidate.industry === null || typeof candidate.industry === "string"
  )) {
    return false;
  }

  if (!(candidate.cik === null || typeof candidate.cik === "string")) {
    return false;
  }

  if (!SECURITY_STATUSES.some((status) => status === candidate.status)) {
    return false;
  }

  if (!SECURITY_KINDS.some((kind) => kind === candidate.kind)) return false;

  // The discriminant decides what `sector` is allowed to be. An index proxy
  // does not belong to a sector, so a null there is the whole answer; anything
  // else has to name a member of the taxonomy.
  return candidate.kind === "index_etf"
    ? candidate.sector === null
    : SECTORS.some((sector) => sector === candidate.sector);
}
