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
 * shipped universe rather than estimated: 101 securities serialise to **17,299
 * bytes**, and **2,591 bytes gzipped** — so §6's 500 is ~86 kB on the wire
 * uncompressed and ~13 kB compressed, against a frontend bundle of 348 kB. The
 * whole universe is 4% of the JavaScript the browser already downloads to
 * render it.
 *
 * The reversal trigger is a payload big enough to matter — a universe past §6's
 * 500, or a response this endpoint cannot serve in one piece — at which point
 * the envelope gains the keys a bare array had nowhere to put, which is the
 * whole argument for the envelope above.
 */

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
}
