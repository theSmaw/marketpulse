import type {
  Adjustment,
  BarSeries,
  ProviderId,
  Ticker,
  Timeframe,
  TimeRange,
} from "@marketpulse/shared";

/**
 * The seam every market-data provider is read through (Task 2.6.4).
 *
 * This is invariant 7 — *"no vendor SDK types leak into the domain model"* —
 * and §7.1's requirement that the vendor sit behind an interface, as a file
 * rather than as an intention. Nothing implements it yet: Task 2.6.6 supplies
 * the fixture provider and Story 2.7 the first real client.
 *
 * ## Why it is written before the client and not extracted from one
 *
 * **An interface extracted from a working client is a description of that
 * client; an interface written first is a constraint on it.** The test of
 * whether this file succeeded is not whether Story 2.7 *can* implement it —
 * anything can be implemented — it is whether Story 2.7 finds itself wanting to
 * change it. Any such pressure belongs in Story 2.7's own record rather than in
 * a quiet widening here.
 *
 * ## Why it lives in `apps/backend` when the types it speaks live in shared
 *
 * `PROVIDER.md` §1 draws the line and it is worth carrying rather than
 * re-deriving: **the frontend may know the NAME of a provider, because it
 * renders it, and may not know the SHAPE of one.** `Bar`, `BarSeries`,
 * `Timeframe`, `TimeRange` and the whole provenance vocabulary are in
 * `packages/shared`, because Story 2.12's chart axis and Story 2.8's ingestion
 * are on opposite sides of the wire and two copies of those is how they
 * disagree. This interface is not, because it describes a thing that holds a
 * credential and makes authenticated vendor network calls — and putting that in
 * the browser's type graph is how somebody eventually implements one there,
 * which is the failure ADR 0006's credential boundary exists to prevent,
 * arriving as a plausible-looking import.
 *
 * ## One method, and the two that were argued rather than assumed
 *
 * - **A multi-symbol fetch.** Story 2.8 backfills ~100 securities and the
 *   vendor supports it, so the reflex is to add it now. It is declined because
 *   its shape is genuinely *different* rather than wider: **partial success
 *   across symbols is a real outcome** — three symbols answered, one rate
 *   limited — and a single {@link BarsResult} cannot express it, so adding the
 *   method today means guessing that shape with no caller to check it against.
 *   **The shape it will need is already available without a rewrite here**: a
 *   batch method returns a `BarsResult` *per symbol*, so every member of this
 *   union is reused unchanged and nothing about a single fetch has to move.
 *   That is the property this note exists to record. Owner: Story 2.8.
 * - **A latest-price call.** Epic 3's, and `PROVIDER.md` §12 settles that it is
 *   a **sibling interface** rather than a method here: a fetch is a request
 *   with a deadline and a result, a subscription is long-lived with connection
 *   state, backpressure and reconnection, and folding them makes every
 *   historical provider ship a `subscribe()` that throws. What the two share is
 *   the data and its provenance, not their shape.
 *
 * ## There is deliberately no retry in here
 *
 * `api-client.ts`'s stated reason transfers whole: **retry is a property of the
 * caller's policy, and a retry buried in the transport makes the deadline a
 * lie** — a caller's three seconds silently becomes nine. So a provider makes
 * exactly one attempt, which is also what makes a fixture-backed test mean
 * something.
 *
 * `PROVIDER.md` §8.8 recommends a **wrapper implementing this same interface**
 * as retry's home, and Task 2.6.5 takes the final call. The distinction that
 * decides it is worth having here beside the method it constrains:
 * **per-request retry is the wrapper's; cross-request pacing across a hundred
 * symbols is Story 2.8's backfill**, and conflating them is how a backfill ends
 * up retrying a whole batch.
 *
 * ## And deliberately no caching
 *
 * **The provider fetches; it does not store.** Story 2.8 owns the record, and
 * the argument for keeping it out is mechanical rather than tidy: a provider
 * that quietly memoises behaves differently on the second call than on the
 * first, which is exactly what stops a fixture-backed test meaning anything —
 * and it puts a second, invisible store beside the one Epic 13's replay has to
 * read as-of a past instant.
 */

/**
 * How long a fetch may take before a provider stops waiting, when the caller
 * does not say.
 *
 * **A per-request parameter with a default rather than a single module
 * constant, and that is a decision** (`PROVIDER.md`, *What this task
 * deliberately did not decide*). The two callers this seam already has want
 * different numbers: a Story 2.9 route is answering a browser that has already
 * started its own five-second clock, while Story 2.8's backfill is behind no
 * route at all and may legitimately wait longer for one symbol out of a
 * hundred. A single constant would have to be the smaller of the two, and the
 * backfill would then fail requests that were merely slow.
 *
 * ## The coupled pair, named — and it is the first one here that cannot be
 * checked
 *
 * This repository has three coupled-constant pairs and all three are asserted
 * by a test, because the thing being checked is reachable from code:
 * `API_TIMEOUT_MS` below `HEALTH_POLL_INTERVAL_MS`, `TOKEN_TIMEOUT_MS` below
 * `CONNECT_TIMEOUT_MS`, `DIAGNOSTIC_CACHE_TTL_MS` below
 * `POOL_IDLE_TIMEOUT_MS`. This is the fourth and **it spans the wire**:
 *
 * > Any deadline used behind a Story 2.9 route must sit strictly below the
 * > frontend's `API_TIMEOUT_MS` (5,000 ms) minus a round trip, or the browser
 * > gives up first and the backend's patience is unobservable — the request is
 * > still in flight, still costing an upstream call, and nothing will ever read
 * > its answer.
 *
 * The two numbers are in `apps/frontend` and `apps/backend` with **no shared
 * module between them**, which is what makes this one prose where the other
 * three are checks. Moving `API_TIMEOUT_MS` into `packages/shared` to make it
 * assertable is a change to shipped code for a test's convenience and is
 * declined for Task 1.10.5's reason — the same call that refused to widen
 * `config.ts`'s port range so a test could bind port 0. **Owner: Story 2.9**,
 * which is the story that first puts a provider behind a route.
 *
 * ## Why three seconds
 *
 * The arithmetic, so the number can be re-derived rather than inherited. The
 * browser's budget is 5,000 ms end to end. A deployed round trip to the backend
 * measured 250–768 ms (Task 1.12.7), so the backend's own budget is at most
 * ~4,200 ms in the worst case. Three seconds leaves ~1.2 s of headroom for the
 * response, the serialisation and the poll's own scheduling, and it is
 * comfortably above a single-symbol page of bars from a vendor documented at
 * 200 requests a minute. It is also the number `TOKEN_TIMEOUT_MS` already uses
 * for the same shape of reason, one dependency over.
 *
 * The reversal trigger is a measured distribution: Story 2.7 is the first task
 * that can time a real upstream, and a p99 anywhere near this number means the
 * default is wrong rather than that the vendor is slow.
 */
export const DEFAULT_BARS_DEADLINE_MS = 3_000;

/**
 * What is being asked for.
 *
 * **Separate from {@link BarsRequestOptions}, and the split is not cosmetic.**
 * This type is the *question* — it is a value worth logging, worth using as a
 * cache key in Story 2.8, and worth holding in an array while a backfill works
 * through it. The options are *how this one invocation behaves*, and an
 * `AbortSignal` is emphatically none of those things: a signal in a cache key
 * makes every key unique, and a signal in a logged object is a live object
 * graph in a log line.
 */
export interface BarsRequest {
  /**
   * Which security.
   *
   * The branded `Ticker` rather than a `string`, which is that type's second
   * real job after Task 2.3.2's. Note what it does **not** buy, so nobody
   * mistakes it for a guarantee: a well-formed ticker for a security this
   * product does not track is a perfectly valid request, and answering it is
   * the error taxonomy's problem (Task 2.6.5's `unknown-symbol`).
   */
  readonly symbol: Ticker;

  /**
   * The window, half-open — `[start, end)`.
   *
   * One branded type rather than two `Date` parameters, which is the whole of
   * `time-range.ts`'s argument: two instants passed positionally can be swapped
   * and nothing notices, and a bare `{ start, end }` interface fixes only that
   * half because a caller writes the literal and the constructor is never
   * reached. `toTimeRange` is the only way to obtain one and it refuses a
   * reversed, zero-width or invalid-`Date` range naming both ends.
   *
   * The consequence for every construction site, including every test: build
   * ranges with `toTimeRange`, never with a literal. A range that arrived as
   * JSON is **not** a `TimeRange` and has to be re-validated — which is what
   * Story 2.9's route will have to do at its own boundary, and is correct
   * rather than friction, because a range from outside this process has been
   * checked by nothing.
   */
  readonly range: TimeRange;

  /**
   * The interval each bar covers. `1m` or `1d`; aggregation is deliberately not
   * expressible, and `bar.ts` records why.
   */
  readonly timeframe: Timeframe;

  /**
   * What should have been done to the prices — **required, with no default,
   * which is Story 2.6's acceptance criterion 5.**
   *
   * There is no safe value to default to here, only a value whose wrongness is
   * deferred, and `market-provenance.ts` states the reason this is the one
   * field that gets no convenience: **a series spanning no corporate action
   * returns identical numbers in both modes**, which is almost every series
   * almost all the time. So a wrong adjustment is invisible in testing and
   * wrong exactly once, on the one name and the one week somebody is looking at
   * — and an unadjusted 10-for-1 split is a −90% return sitting at the 100th
   * percentile of every distribution Epic 5 computes.
   *
   * The omission is locked in by a `@ts-expect-error` in this module's tests
   * rather than described here: if this field ever stops being required, that
   * directive goes unused and `tsc -b` fails the build with **TS2578**. That is
   * stronger than a comment and cheaper than a lint rule.
   */
  readonly adjustment: Adjustment;
}

/**
 * How one invocation behaves. Both fields are optional and neither is part of
 * the question being asked.
 */
export interface BarsRequestOptions {
  /**
   * Override {@link DEFAULT_BARS_DEADLINE_MS} for this call.
   *
   * Story 2.8's backfill is the reader that makes this a parameter rather than
   * a constant — see the constant's own note.
   */
  readonly deadlineMs?: number;

  /**
   * The caller's own signal, **composed with the deadline rather than
   * replacing it**.
   *
   * `api-client.ts`'s arrangement, and an implementation should reuse it whole:
   * `AbortSignal.any([AbortSignal.timeout(deadlineMs), signal])`, and then read
   * **which** signal fired off the signals themselves rather than off the
   * rejection. A `DOMException` name is a string comparison against a value
   * from another realm; the two flags are facts the implementation owns.
   *
   * That is not incidental, because the two produce **different members** of
   * {@link BarsResult}: `timeout` is a joint fact about the upstream and our
   * own patience, and `aborted` is not a fact about the world at all.
   */
  readonly signal?: AbortSignal;
}

/**
 * What a fetch produced. **Never a thrown error, in any modelled branch.**
 *
 * The shape is `api-client.ts`'s and so is the reason, which Task 1.12.2
 * recorded and Task 1.12.3 then found the second half of: **a caller cannot
 * forget a case the compiler makes it handle, and a thrown error is a case the
 * compiler cannot see.** The payoff is not only tidiness — because nothing
 * throws, `use-backend-health.ts` has no `try`/`catch` in its polling loop at
 * all, and a failure state therefore cannot accidentally reach an error
 * boundary. Story 2.8's backfill inherits exactly that.
 *
 * ## A bug is still allowed to throw, and that is the line
 *
 * > **A cause is a union member when it is a fact about the world. It is a
 * > thrown defect when it is a fact about our code.**
 *
 * A rate limit is the world. A mapping function that received a shape it did
 * not expect is us — and laundering that into a tidy `upstream-unavailable` is
 * how a permanent break wears the costume of a transient one and becomes an
 * invisible degradation nobody investigates. So **"a call that cannot throw"
 * means no modelled failure throws; it does not mean the implementation is
 * wrapped in a `try` that swallows bugs. Do not add one.** Task 2.6.5 owns
 * where each cause falls; this union is the shape that makes the line
 * expressible.
 *
 * The consequence Story 2.8 inherits: a backfill must **let a defect
 * propagate** rather than counting it as a failed symbol, or a vendor shape
 * change presents as a hundred symbols mysteriously having no data.
 *
 * ## Three members here, five more in Task 2.6.5, and the split is principled
 *
 * `PROVIDER.md` §8.1 settles **eight outcomes**. The three below are the ones
 * that follow from *this* file's own request shape — a success, and the two
 * ways the deadline and the abort signal defined in
 * {@link BarsRequestOptions} end a call — and they are producible with no
 * upstream and no implementation in existence. The remaining five are facts
 * about a *world* this task has not described yet: `unknown-symbol`,
 * `range-not-available`, `rate-limited`, `unauthorised` and
 * `upstream-unavailable`. They are added to this union by Task 2.6.5, which is
 * an addition rather than a rewrite; every exhaustive `switch` over this type
 * fails to compile until it handles them, which is the property that makes the
 * addition safe.
 *
 * ## The one member that is settled here and is NOT in that list
 *
 * **"No data for this range" is not an error.** A symbol that exists, a valid
 * range and a market that was shut is a *successful empty answer* — `bars: []`
 * with `coverage.covered: null` — and so is a thinly traded name with no prints
 * in the requested minutes. Treating it as a failure is how Story 2.12 shows an
 * error screen on a public holiday, and it is the single most likely thing to
 * be got wrong by whoever writes the first `if (bars.length === 0)`.
 *
 * ## What a member may carry
 *
 * A member carries what a caller can act on and **never the upstream's response
 * body or its message**. The reason is measured rather than principled: Task
 * 1.7.4 found Fastify's default 500 passing a thrown message straight through
 * and answering a request with `connection to postgres at 10.0.0.4:5432
 * refused`. **A message written for a developer is internal detail too, and it
 * is the half that looks harmless.** The detail goes to the log, at the
 * provider, under the request's correlation id — the arrangement `errors.ts`
 * ships and `/diagnostics/database` already reuses, where the body says
 * *whether* and the log says *why* and `x-request-id` makes it one
 * investigation.
 *
 * Neither failure member below echoes the request back, because the caller
 * holds it. Task 2.6.5 decides that for its own members, where a batch caller
 * may genuinely need the symbol beside the cause.
 */
export type BarsResult =
  /**
   * The fetch answered. The series carries its own provenance and its own
   * coverage — see `bar-series.ts` — so there is nothing else on this member:
   * a `feed` or a `retrievedAt` here would be a second copy of a fact the
   * series already cannot exist without.
   *
   * **This member does not promise the series is non-empty**, and see the
   * empty-answer note above before adding a member that would.
   */
  | { readonly outcome: "ok"; readonly series: BarSeries }
  /**
   * The deadline expired and nothing arrived.
   *
   * Kept apart from `upstream-unavailable` (Task 2.6.5's) because it is the
   * only outcome that is a joint fact about the upstream **and our own
   * patience**: *"we gave up after N ms"* admits a repair — raise N — that
   * *"they are down"* does not. That is why it carries the number.
   */
  | { readonly outcome: "timeout"; readonly deadlineMs: number }
  /**
   * The **caller** tore down: a superseded request, or an unmounted effect one
   * layer up.
   *
   * Not a fact about the upstream or the vendor at all, which is why it is its
   * own member and carries nothing. Task 1.12.3 found the payoff — mapping
   * `aborted` to *no state at all* is what closed the "resolved after unmount"
   * bug at the one place it can be closed — and every consumer here inherits
   * the same obligation: **never render an `aborted` as a market-data state.**
   */
  | { readonly outcome: "aborted" };

/**
 * A source of historical bars.
 *
 * One method, deliberately. Read the module comment above before adding a
 * second: the two obvious candidates are argued there, and the batch one is
 * declined with the note that its shape arrives without a rewrite of
 * {@link BarsResult}.
 */
export interface MarketDataProvider {
  /**
   * Which implementation this is — `packages/shared`'s `ProviderId`, our name
   * for whoever sold us the data rather than a vendor's marketing name.
   *
   * A property rather than a method because it is a constant fact about the
   * implementation, and it is on the interface rather than left inside each
   * `fetchBars` because a wrapper (retry, rate limiting — `PROVIDER.md` §8.8)
   * has to report the id of the thing it *wraps* rather than inventing one of
   * its own, and because Task 2.6.7's *"which provider is configured"* is a
   * question asked of a provider that has not been called.
   */
  readonly id: ProviderId;

  /**
   * Fetch bars for one symbol.
   *
   * **Returns; it does not reject** for any modelled failure — see
   * {@link BarsResult}, including the paragraph on the bug that is still
   * allowed to throw.
   *
   * Exactly one attempt. No retry, no backoff, no caching; all three are
   * argued in the module comment.
   */
  fetchBars(
    request: BarsRequest,
    options?: BarsRequestOptions,
  ): Promise<BarsResult>;
}
