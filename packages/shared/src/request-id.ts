/**
 * The name of the correlation-id header, spelled once for both apps.
 *
 * Task 1.7.2 introduced this as a constant in `apps/backend/src/request-id.ts`
 * and deliberately left its home open, because moving a lone string here would
 * have pre-empted how Task 1.7.3 structured the wire contract. Now there is a
 * contract, and this is the same kind of fact as {@link ApiError}: something
 * the server writes and a client reads, where two copies is how they stop
 * matching. So it moved.
 *
 * **Only the name moved.** Generating an id and deciding whether to honour an
 * inbound one are server behaviour with a threat model behind them — an inbound
 * id is attacker-controlled text on its way into a log line — and a client has
 * no business doing either. `apps/backend/src/request-id.ts` still owns the
 * generator and the validation pattern, and imports this.
 *
 * What this is for: Story 1.12's frontend reads the header off a response to
 * pair a failure with its log record, and Epic 10 sends one so an
 * investigation's several requests share a trace. Both must import this rather
 * than writing the string out again — a header-name typo is a compile error
 * nowhere, silently disabling correlation on the path it was added to, which is
 * the same class of failure as a misspelled CSS Module class.
 *
 * Lower case because Node lower-cases inbound header names before they reach
 * `request.headers`, so this value is usable as a lookup key directly; HTTP
 * itself is case-insensitive here and a response header set with this spelling
 * is the same header whatever a proxy renders it as.
 */
export const REQUEST_ID_HEADER = "x-request-id";
