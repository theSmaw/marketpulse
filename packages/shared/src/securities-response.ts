/**
 * The wire contract for `GET /securities` (Task 2.4.2).
 *
 * Here rather than in `apps/backend` for Story 1.6's test — shared means both
 * sides depend on the same fact — and this one has two sides from the moment it
 * exists: the backend serialises it and Task 2.4.3's frontend parses it. It
 * sits beside `security.ts` rather than inside it because the two answer
 * different questions. That file says what a security **is**, and Epics 4 to 9
 * read it without caring how one arrives; this file says what one **response**
 * looks like, which is a fact about this API's transport and nothing else. The
 * same separation `health.ts` already has from the route that serves it.
 *
 * ## Why an envelope rather than a bare array
 *
 * A bare `Security[]` is the smaller thing and it was rejected, because it has
 * nowhere to put anything that is true of the **list** rather than of a row —
 * and there is already one such thing, which is where the list came from. The
 * envelope costs one level of nesting once and is the shape Story 2.9's series
 * endpoint inherits, which needs provenance in the payload for the same reason.
 *
 * The general rule the choice rests on: a response shape that can only grow by
 * changing its own type is a response shape that gets versioned. This one grows
 * by gaining a key.
 *
 * ## What it deliberately does not carry
 *
 * **A `count`.** Without pagination `securities.length` *is* the count, so a
 * field beside it would be a second copy of a fact — and the only interesting
 * thing it could do is disagree. Story 2.4's page reports two numbers, rows held
 * and securities tracked, and both are computed from this array: the second is
 * the rows whose {@link Security.status} is `active`. That distinction belongs to
 * whoever is making the claim on screen, not to the transport.
 *
 * **A page, a limit, an offset or a cursor.** See the pagination note below.
 *
 * **A search or filter parameter.** Story 2.11 owns search and has an open
 * decision about whether matching happens in the client or the server; a `?q=`
 * added here would settle it by accident.
 *
 * ## Pagination: there is none, deliberately, and the reason is a number
 *
 * The whole universe comes back in one response. `UNIVERSE.md` §8 warns that a
 * hard-coded 100 could hide in "an API default page size", and the answer that
 * reaches §6's 500 without an edit is not a bigger page size — it is **no page
 * size at all**, because there is then no number to change. Measured on the
 * shipped universe rather than estimated, and **re-measured at Task 2.8.9
 * rather than cited**, because that task both grew the payload and is the first
 * thing that could have made this argument wrong:
 *
 *   - 101 securities were **17,299 B**, gzipped **2,591 B**;
 *   - 518 securities, with coverage, were **150,660 B**, gzipped **12,831 B**;
 *   - 518 securities, with coverage **and** last closes, are **190,736 B**,
 *     gzipped **19,526 B** (Task 2.9.7, `gzip -9`; the 2,591 above is Task
 *     2.4.2's reading and the two were not taken with the same tool, so compare
 *     the ratios rather than subtracting).
 *
 * So the universe grew five-fold and the envelope gained two more keys, and
 * the thing that
 * actually crosses the wire is **19.5 kB** — against a frontend bundle of
 * 373 kB that the browser downloads before it can render any of it. The
 * uncompressed figure is the one that looks alarming and is not the one being
 * transferred; quote the gzipped one.
 *
 * **That instruction was measured false on 2026-09-10 and made true again the
 * same day, and both halves are recorded because the second is not a
 * restoration of the first.** Task 2.9.9 found that *nothing on this path
 * compressed* — neither the application nor the deployed ingress — so for as
 * long as that held, the 190,736 was the wire and "quote the gzipped one" was
 * advice to quote a number nobody received. Task 2.9.10 registered
 * `@fastify/compress`, and the gzipped figure is the wire again. **The number
 * is 20,072 B, not the 19,526 above**: that reading was `gzip -9` and the
 * plugin runs zlib's default level. Quote 20,072, and take it with `curl`'s
 * `%{size_download}` rather than off a `content-length` — a compressed response
 * from this server is chunked and carries none.
 *
 * The compression ratio is the interesting half, and Task 2.9.7 is the first
 * key to make it **worse**: 6.7:1 at 101 securities, **11.7:1** with coverage,
 * **9.8:1** now. The reason was predicted before the key was added and the
 * measurement confirmed it — 515 of 518 coverage records carry the same two
 * instants and gzip is very good at that, where 518 distinct prices are 518
 * distinct strings. So the rule survives the exception: measure the
 * *compressed* payload rather than the array length, and expect a key of
 * genuinely per-row values to cost what it looks like.
 *
 * **The stated reversal trigger has half fired and is restated rather than
 * quietly ignored.** It read "a universe past §6's 500", and Task 2.8.2's
 * re-curation took the universe to **518** — so the count crossed and the
 * reason behind it did not, because the argument was never really about the
 * count. It is restated as the thing that would actually hurt: **a compressed
 * payload past roughly 100 kB, or a response this endpoint cannot serve in one
 * piece.** At that point the envelope gains the keys a bare array had nowhere
 * to put, which is the whole argument for the envelope above.
 *
 * **Since 2026-09-10 that trigger is a wire figure rather than a hypothetical
 * one** — the payload is compressed in transit, so "a compressed payload past
 * roughly 100 kB" is now something a `curl` can read directly. It stands at
 * 20,072 B, a fifth of the way there.
 */

import { TIMEFRAMES } from "./bar.js";
import type { Timeframe } from "./bar.js";
import { isMarketDate } from "./market-time.js";
import type { MarketDate } from "./market-time.js";
import { isSecurity } from "./security.js";
import type { Security, SecurityFieldGroup } from "./security.js";

/**
 * Where a group of fields came from, and when we asked.
 *
 * The pair invariant 5 requires of evidence — a source and a retrieval
 * timestamp — for one of `SECURITY_FIELD_GROUPS`. `retrievedAt` is an ISO 8601
 * instant because JSON has no date type and a string with a stated format is
 * the honest spelling; the alternative, epoch milliseconds, is a number nobody
 * can read in a response body.
 */
export interface FieldGroupProvenance {
  /** Where the values came from — `"curated"` today, a provider later. */
  readonly source: string;

  /** When they were retrieved, as an ISO 8601 instant. */
  readonly retrievedAt: string;
}

/**
 * Where this response's securities came from.
 *
 * **Keyed by field group and not by field**, and only the two groups that have
 * a source: `SECURITY_FIELD_GROUP` in `security.ts` records that `identity` is
 * Epic 9's and gets no pair until then, and that `ours` — `kind` and `status` —
 * is a judgement rather than a retrieval, so a `retrievedAt` on it would be a
 * timestamp pretending to be evidence. The `Extract` is what keeps this honest
 * when a group is added: it names the two rather than defaulting to all four,
 * and `apps/backend/src/universe.ts`'s own `UNIVERSE_PROVENANCE` is written the
 * same way, so the file and the wire agree about which groups exist by
 * construction.
 */
export type SecuritiesProvenance = Readonly<
  Record<
    Extract<SecurityFieldGroup, "profile" | "classification">,
    FieldGroupProvenance
  >
>;

/**
 * How much market history we hold for one security, at one timeframe.
 *
 * **The ledger's statement rather than a count of bars** (Task 2.8.9). The
 * backend reads `bar_coverage`, which is a few hundred rows however many bars
 * exist; a page that `count(*)`s fifty million rows to draw a list is the thing
 * that table was built to prevent.
 *
 * ## What it carries, and the one thing it deliberately does not
 *
 * The window and the size, and **not** `bar_coverage.updated_at`. That column
 * means *when what we hold last changed* rather than when a backfill last ran —
 * Task 2.8.4 refused a last-attempt column precisely so it could mean that —
 * and it is a real signal about staleness now that Task 2.8.8 shipped a nightly
 * catch-up that GitHub will silently disable after 60 quiet days. It is
 * withheld here because nothing renders it, under the rule
 * {@link SecuritiesResponse} already follows and `API_ERROR_CODES` states: a
 * field arrives with its reader. The reader, if one comes, is a single
 * statement about the whole store rather than a column nobody scans.
 *
 * ## Why the instants are half-open and stated as such
 *
 * `start` is the first instant we are answered for and `end` is the first
 * instant we are **not**, which is `TimeRange`'s convention one layer down and
 * is what lets adjacent windows tile without a bar at the seam belonging to
 * both. A consumer rendering "through when" therefore reports the session
 * containing `end − 1ms`, not `end`.
 *
 * They are ISO 8601 instants for {@link FieldGroupProvenance.retrievedAt}'s
 * reason — JSON has no date type, and epoch milliseconds is a number nobody can
 * read in a response body. **They are instants and not market dates**, so the
 * conversion to a trading day happens in `market-time.ts`, which is the one
 * module in this workspace permitted to do it. A `YYYY-MM-DD` on the wire would
 * be that conversion performed by the server and asserted by the client, with
 * no way for either to check the other.
 */
export interface SecurityCoverage {
  /** The security this is about — a {@link Security.symbol}. */
  readonly symbol: string;

  /**
   * Which series. `1m` today and `1d` is real too; see
   * {@link SecuritiesResponse.coverage} for why only one is sent.
   */
  readonly timeframe: Timeframe;

  /** The first instant covered, inclusive, as an ISO 8601 instant. */
  readonly start: string;

  /** The first instant **not** covered, as an ISO 8601 instant. */
  readonly end: string;

  /**
   * How many bars lie inside the window.
   *
   * **A scale claim rather than a per-row fact**, and it is sent for exactly
   * one reader: the summary line's total. Task 2.8.5 measured a mean of 364.3
   * bars per security-session against a nominal 390, so a per-row percentage
   * against a session's bar count reads ~93% for a completely healthy store —
   * that figure is *liquidity* and not completeness, and rendering it beside a
   * security would be a wrong number wearing the shape of a right one.
   */
  readonly barCount: number;
}

/**
 * The last close we hold for one security, and the one before it.
 *
 * **The first price this product puts in front of anybody** (Task 2.9.7), and
 * the whole shape follows from what that sentence has to survive: a number on a
 * screen with no chart around it and no live feed behind it has to say *which
 * moment it is about*, or it reads as "now" and is a lie by default.
 *
 * ## Two prices and no percentage, which is the same line `PriceChange` draws
 *
 * The wire carries `close` and `previousClose`; it does not carry the change,
 * the percentage, or a direction. `PriceChange`'s own header states the rule
 * and it is invariant 1 read the right way round: **a band name is a decision
 * the backend reports, the direction of a move is arithmetic on a number both
 * sides already have.** A percentage computed here would be a third
 * representation of two numbers that are already on the wire — one more thing
 * to disagree with itself, and one the client would still have to format.
 *
 * That is *not* a licence to let a model or a view invent figures: the two
 * prices are read from stored bars and nothing derives them. Invariant 1 is
 * about where a number comes from, and a subtraction whose inputs are both on
 * screen is not a number this product had to look up.
 *
 * ## `session` is a market DATE and not an instant, unlike {@link
 * SecurityCoverage}
 *
 * `SecurityCoverage` sends instants and argues that the conversion to a trading
 * day belongs in `market-time.ts` on whichever side is displaying it. That
 * argument does not transfer, because a close is not an observation at an
 * instant — it is **the last print of a session**, and a session is a date. So
 * this follows the second of Story 2.5's two wire rules rather than the first
 * (ADR 0017): an instant is a UTC ISO 8601 string, and a market date is a
 * `YYYY-MM-DD` string, because sending a date as an instant is how "which
 * session is this?" becomes a timezone question at every call site.
 *
 * The conversion still happens exactly once and still in `market-time.ts` —
 * `marketDateAt`, called by the route's mapper — which is the module a lint
 * rule reserves for it. What it converts is a daily bar's `observed_at`, which
 * the vendor labels at market midnight; the branded {@link MarketDate} is what
 * carries the fact that the conversion happened.
 *
 * ## `previousClose` is nullable and the null is not an error
 *
 * A security we hold exactly one daily bar for has a close and no comparison,
 * which is §36's "partial answer" one field wide: a real, correct state that
 * must not be spelled as a zero. A zero previous close would render as a
 * `+∞%` move, which is the single most alarming wrong number this page could
 * produce.
 *
 * A security we hold **no** daily bars for is absent from the array entirely,
 * which is {@link SecuritiesResponse.coverage}'s spelling of the same idea and
 * for the same reason: absent is *we hold nothing for this*, and a record with
 * a null price would be *we hold a bar whose close is unknown*, which cannot
 * happen — `market_bars.close` is `not null`.
 *
 * ## What it deliberately does not carry
 *
 * **The previous session's date.** Nothing renders it: the change is a
 * comparison against "the session before", and naming that session on a list
 * row is a second date in a cell that already has one. The reader, if one
 * comes, is a per-security page — Story 2.11's — where there is room for it.
 *
 * **A feed or a provider.** The close is a price, not a provenance record, and
 * Task 2.6.7's rule is that no second endpoint may answer *which feed*.
 * `/market-data` answers it for the deployment and `SeriesProvenance` answers
 * it per series; a per-security feed here would be a third answer to one
 * question, and the trigger for one — a deployment whose securities genuinely
 * disagree about their feed — has not fired.
 */
export interface SecurityLastClose {
  /** The security this is about — a {@link Security.symbol}. */
  readonly symbol: string;

  /**
   * The trading session the close belongs to, as `YYYY-MM-DD` market-local.
   *
   * **The last session we hold a daily bar for, which is not necessarily the
   * last session that traded.** The store holds complete sessions only and the
   * nightly catch-up runs before the open, so this date is behind the calendar
   * during a live session and stays behind it until the next catch-up. That is
   * exactly why it is on the wire: a stale price presented as current is what
   * invariant 6 exists to prevent, and the date is what stops it being one.
   */
  readonly session: MarketDate;

  /** The session's closing price. */
  readonly close: number;

  /**
   * The close of the session before it, or `null` when we hold only one.
   *
   * Read from the store rather than computed: it is the second row of the same
   * two-row read, so it is the *stored* previous session and never "the day
   * before" by arithmetic on a calendar.
   */
  readonly previousClose: number | null;
}

/**
 * The body of `GET /securities`.
 */
export interface SecuritiesResponse {
  /**
   * Every security we hold, ordered by symbol.
   *
   * **Including the ones we no longer track.** `status` is this schema's one
   * invisible predicate and `UNIVERSE.md` §12.2 puts this reader on the *do not
   * filter* side: a security removed from the curated file is marked
   * `untracked` and kept, because bars will hang off it and Epic 13 replays a
   * date on which it was tracked. So a consumer counting "securities we track"
   * filters on `status === "active"` itself, and one rendering the list shows
   * the row with its status rather than omitting it.
   */
  readonly securities: readonly Security[];

  /**
   * Where every security above came from — **when they all came from the same
   * place**.
   *
   * Optional, and the absence means one of exactly two things: the response is
   * empty, so there is nothing to attribute; or the rows no longer agree, so
   * the claim this field makes about the whole list is not true and it is
   * therefore not made. The server writes a `warn` record in the second case
   * naming the request, because it is the signal that provenance has to move
   * onto the row.
   *
   * **Provenance is on the envelope rather than on each security, and that is a
   * decision with a stated expiry.** Today every row in the table shares one
   * `profile` pair and one `classification` pair, because one curated file
   * wrote all of them in one load — so per-row provenance would be 101 copies
   * of two values, and `Security` deliberately carries none of it (see that
   * interface's own header). What breaks it is **Story 2.7**, which fills the
   * profile fields from Alpaca while classification stays curated: at that
   * point rows retrieved on different days stop sharing a `profile` pair, this
   * field starts being absent, and the payload has to carry provenance per row
   * — which is exactly what `SECURITY_FIELD_GROUP` exists to make expressible.
   */
  readonly provenance?: SecuritiesProvenance;

  /**
   * How much market history we hold, one record per security that has any.
   *
   * **A security with no bars is absent from this array rather than present
   * with a zero**, which is the honest spelling of the difference between *we
   * hold nothing for this* and *we hold none of this*. A zero-length window
   * would also be a `TimeRange` the domain type refuses to construct.
   *
   * ## Minute bars only, and that is a choice rather than an omission
   *
   * The ledger holds one row per `(security, timeframe)` — **1,036 rows for 518
   * securities** once both series are filled — and this endpoint sends the `1m`
   * half. The minute series is what every chart in Epics 4, 5 and 12 reads; the
   * daily series is a different and deeper window (2024-01-01), and putting both
   * on one row of a list makes a row nobody can scan. Task 2.8.9 states the
   * choice rather than leaving it implied, which is why {@link
   * SecurityCoverage.timeframe} is on the wire at all: a field whose value is
   * always the same is worth sending when the alternative is a client assuming
   * it. The daily depth belongs beside the chart that uses it, which is Story
   * 2.11's per-security route.
   *
   * ## Required, unlike `provenance`, and the reason is that it cannot be
   * unknown
   *
   * `provenance` is optional because its absence *means* something — the rows
   * no longer share one source, so the claim is not made. There is no
   * equivalent here: the ledger either has rows or it does not, and an empty
   * array says *we hold nothing yet*, which is exactly what a migrated database
   * with no backfill should say. An optional field would give that state two
   * spellings and force every reader to decide they are the same thing.
   *
   * The version-skew risk that usually argues for optionality does not apply:
   * `deploy.yml` ships both halves from one commit and deploys the **backend
   * first**, so a frontend strict about this field never meets a backend
   * without it. That ordering was read rather than assumed.
   */
  readonly coverage: readonly SecurityCoverage[];

  /**
   * The last stored close for each security that has one, and the close before
   * it (Task 2.9.7).
   *
   * **A fourth key rather than a fourth endpoint, and rather than a field on
   * `Security`.** Task 2.6.7 found the rule this follows: a fact a page needs
   * has to ride on something that page actually requests. `useSecurities`
   * fetches this route and nothing else on `/securities`, so a `/prices`
   * endpoint would be new client plumbing built to answer a question this
   * response is already being sent to answer — and it would pre-empt Story
   * 2.10's decision about how this application holds domain state, which is
   * exactly the decision a second fetch would be evidence for.
   *
   * It is not a field on {@link Security} for {@link SecurityCoverage}'s
   * reason: a security is a thing the universe file describes, and a price is
   * something the market did. Epics 4 to 9 read `Security` without wanting
   * either.
   *
   * ## Read at the DAILY timeframe, and that is a cost decision with a number
   *
   * `market_bars` holds 47,682,213 minute bars and 345,559 daily ones, and the
   * two closes per security come off the daily half through the existing
   * `(security_id, timeframe, observed_at)` index — a lateral scan per
   * security, two rows each. Measured local, 2026-09-09: **1,036 rows in
   * 4.8–8.2 ms** warm from Node, 21.4 ms cold, against **182–279 ms** warm for
   * the obvious `row_number()` window over the same daily rows. A page that
   * reaches minute resolution to draw a list is the thing `bar_coverage` exists
   * to prevent, and this is the same rule applied to a different question;
   * `apps/backend/src/market-bars.ts`'s `readLastCloses` carries the plan.
   *
   * ## Minute coverage and a daily close, in one response, deliberately
   *
   * {@link coverage} reports the **minute** series and this reports the
   * **daily** one, which looks like an inconsistency and is the honest answer
   * to two different questions. "How much history do we hold?" is about the
   * series every chart in Epics 4, 5 and 12 reads, which is the minute one.
   * "What did this last trade at?" is a session's official close, which only
   * the daily series carries — a close derived from single-venue minute bars
   * may simply not contain the auction print (see `Timeframe` in `bar.js`), so
   * it would be a different and worse number rather than the same one computed
   * twice.
   *
   * ## Required, empty-when-nothing, for {@link coverage}'s reasons
   *
   * An empty array is *we hold no daily bars yet*, which is what a migrated
   * database with no backfill should say; an optional field would give that
   * state two spellings. `deploy.yml` ships both halves from one commit and
   * deploys the backend first, so a frontend strict about this never meets a
   * backend without it.
   */
  readonly lastCloses: readonly SecurityLastClose[];
}

/**
 * Is `value` a {@link FieldGroupProvenance}?
 *
 * Not exported: nothing outside this module has a bare provenance record to
 * check, and an exported predicate with no caller is a second definition
 * waiting to disagree with the one below it.
 */
function isFieldGroupProvenance(value: unknown): value is FieldGroupProvenance {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.source === "string" &&
    typeof candidate.retrievedAt === "string"
  );
}

/**
 * Is `value` a {@link SecuritiesResponse}?
 *
 * **This ships here, beside the shape, and it ships now rather than with the
 * contract** — Task 1.7.3's rule is that a predicate arrives with its first
 * reader, and Task 2.4.3's frontend is that reader. The reason it is not
 * written at the call site is the reason `isHealthResponse` and `isApiError`
 * are not: a validator written where it is used is a second description of the
 * same judgement, and it is the copy that drifts when the interface moves.
 *
 * It is {@link isSecurity}'s customer rather than its competitor. That
 * predicate is already total over the row — it checks the ticker's form, both
 * nullable fields, and `kind`, `sector` and `status` against their const arrays,
 * including the rule that only an `index_etf` may have a null sector — so there
 * is nothing about a security to re-validate here. What is left is the
 * envelope.
 *
 * ## `provenance` being absent is not a malformed body, and getting that wrong
 * breaks the empty state
 *
 * The field is optional and its absence carries meaning (see
 * {@link SecuritiesResponse.provenance}): the list is empty, or the rows no
 * longer share one source. **A predicate that required it would make an empty
 * universe fail**, and `api-client.ts` maps a 2xx whose body fails its
 * predicate to `unreadable-body` — which the frontend renders as *something
 * answered here and it was not this service*. So a perfectly healthy backend
 * over a migrated-but-unseeded database would read as broken, which is exactly
 * the state Story 2.4 exists to render honestly. The cheapest way to produce it
 * is `{"securities": []}`.
 *
 * ## What it deliberately tolerates
 *
 * Unknown extra keys on the envelope, for the reason `isHealthResponse` accepts
 * them: a newer server is a version skew rather than a broken one, and a client
 * that refuses a field it has not been taught cannot be deployed before the
 * backend that adds one. What it refuses is a missing `securities`, a
 * `securities` that is not an array, any element that is not a security, a
 * missing or malformed `coverage` or `lastCloses` (see those fields for why
 * they are required where `provenance` is not), and a `provenance` that is
 * present and malformed.
 */
export function isSecuritiesResponse(
  value: unknown,
): value is SecuritiesResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.securities)) return false;
  if (!candidate.securities.every(isSecurity)) return false;

  if (!Array.isArray(candidate.coverage)) return false;
  if (!candidate.coverage.every(isSecurityCoverage)) return false;

  if (!Array.isArray(candidate.lastCloses)) return false;
  if (!candidate.lastCloses.every(isSecurityLastClose)) return false;

  // Absent is valid; present-and-wrong is not. A JSON body cannot carry an
  // explicit `undefined`, so the `undefined` check is precisely "the key is
  // missing" — which is also the shape `exactOptionalPropertyTypes` gives the
  // interface above.
  return (
    candidate.provenance === undefined ||
    isSecuritiesProvenance(candidate.provenance)
  );
}

/**
 * Is `value` a {@link SecurityCoverage}?
 *
 * Not exported, for {@link isFieldGroupProvenance}'s reason: nothing outside
 * this module holds a bare coverage record to check.
 *
 * `timeframe` is checked against `TIMEFRAMES` where `symbol`, `start` and `end`
 * are checked only for being strings, and the asymmetry is `isApiError`'s
 * rather than an oversight — a **discriminator a caller switches on** is not
 * the same kind of thing as a value it renders. A timeframe this bundle has no
 * word for cannot be rendered honestly; an instant it cannot parse renders as
 * nothing, locally, which is `Invalid Date`'s one virtue.
 */
function isSecurityCoverage(value: unknown): value is SecurityCoverage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.symbol === "string" &&
    typeof candidate.start === "string" &&
    typeof candidate.end === "string" &&
    typeof candidate.barCount === "number" &&
    TIMEFRAMES.some((timeframe) => timeframe === candidate.timeframe)
  );
}

/**
 * Is `value` a {@link SecurityLastClose}?
 *
 * Not exported, for {@link isSecurityCoverage}'s reason: nothing outside this
 * module holds a bare close record to check.
 *
 * **`session` is checked against `isMarketDate` where `symbol` is only checked
 * for being a string**, and the asymmetry is the same one `isSecurityCoverage`
 * makes about `timeframe`. `MarketDate` is a *branded* type: the brand asserts
 * that a check happened, so a cast here would be this module claiming a
 * judgement it never made, and every consumer downstream would inherit the
 * claim. A malformed date also has a real consequence — it is rendered as the
 * session a price belongs to, which is the one thing on the wire stopping a
 * stale number from reading as a live one.
 *
 * `previousClose` accepts `null` and refuses `undefined`, because the null
 * carries meaning (we hold one session) and an absent key would be a body from
 * a server that does not know about this field at all.
 */
function isSecurityLastClose(value: unknown): value is SecurityLastClose {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.symbol === "string" &&
    typeof candidate.session === "string" &&
    isMarketDate(candidate.session) &&
    typeof candidate.close === "number" &&
    (candidate.previousClose === null ||
      typeof candidate.previousClose === "number")
  );
}

/** The two field groups the envelope attributes, checked as a pair. */
function isSecuritiesProvenance(value: unknown): value is SecuritiesProvenance {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isFieldGroupProvenance(candidate.profile) &&
    isFieldGroupProvenance(candidate.classification)
  );
}
