import type {
  Adjustment,
  BarSeries,
  MarketFeed,
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
 * rather than as an intention. ~~Nothing implements it yet: Task 2.6.6 supplies
 * the fixture provider and Story 2.7 the first real client.~~ **Amended
 * 2026-09-07 by Task 2.6.8: the first clause stopped being true one task later.
 * `fixture-provider.ts` implements the whole of it, offline and deterministic,
 * and it is what every test in this story runs against. Story 2.7 is still the
 * first real client, which is the half that matters — see the sentence below,
 * because it is Story 2.7 and not the fixture that tests whether this file
 * succeeded.**
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
 * ## There is deliberately no retry in here, and Task 2.6.5 decided where it goes
 *
 * `api-client.ts`'s stated reason transfers whole: **retry is a property of the
 * caller's policy, and a retry buried in the transport makes the deadline a
 * lie** — a caller's three seconds silently becomes nine. So a provider makes
 * exactly one attempt, which is also what makes a fixture-backed test mean
 * something.
 *
 * **Task 2.6.5 confirms `PROVIDER.md` §8.8's recommendation: retry lives in a
 * wrapper that implements this same interface, composed around a provider.**
 * The two rejected homes, with what each costs:
 *
 * - **Inside each provider implementation** — rejected twice over. It makes the
 *   caller's deadline a lie, as above; and every future provider then
 *   re-implements it slightly differently, so *"how many times did we ask the
 *   vendor"* becomes a question with a different answer per vendor and no
 *   single place to read it.
 * - **At the call site** — rejected for retry and **right for pacing**, which
 *   is the distinction that actually decides this: **per-request retry is the
 *   wrapper's; cross-request pacing across a hundred symbols is Story 2.8's
 *   backfill.** Conflating them is how a backfill ends up retrying a whole
 *   batch — re-fetching ninety-nine symbols that answered perfectly because one
 *   was rate-limited, which is the one thing guaranteed to make a rate limit
 *   worse.
 *
 * The wrapper wins on three properties rather than on taste: it is **testable
 * against the fixture provider with no network at all**, it is **replaceable
 * without touching a provider**, and it keeps a provider a thing that makes
 * exactly one attempt, which is what makes a fixture-backed test mean anything.
 * It also reports the id of the provider it *wraps* — see
 * {@link MarketDataProvider.id} — rather than inventing one, so wrapping is
 * invisible to everything downstream.
 *
 * ## What a retry wrapper is allowed to do — three constraints, no numbers
 *
 * The numbers are Story 2.7's, measured against a vendor documented at 200
 * requests a minute. What is settled here is the shape:
 *
 * 1. **Only retryable causes are retried**, and
 *    {@link isRetryableOutcome} is the source rather than a `switch` the
 *    wrapper writes for itself. A retry on `unauthorised` is a loop against a
 *    wall; a retry on `unknown-symbol` asks a settled question again.
 * 2. **A retry must not outlive the caller's deadline or its abort signal.**
 *    The wrapper receives both, is bounded by both, and gets no budget of its
 *    own — which is the same sentence as *"a retry buried in the transport
 *    makes the deadline a lie"*, applied to the thing that is allowed to retry.
 *    A `rate-limited` hint is a floor inside that bound, never an extension
 *    of it.
 * 3. **A retry policy plus a rate limit is a queue.** A queue has a depth, and
 *    an unbounded one is a memory leak wearing a politeness costume. Whatever
 *    Story 2.7 builds states its depth and what it does when full.
 *
 * **Nothing is built here**, deliberately: there is no provider to wrap, no
 * measured distribution to pick a backoff from, and a wrapper written now would
 * be tested only against itself. Task 2.6.6 supplies the first thing it can be
 * composed around.
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
 * ## Eight outcomes, and each member earns its place by what a caller does
 *
 * `PROVIDER.md` §8.1's table, complete since Task 2.6.5. Three arrived with the
 * interface — a success, and the two ways the deadline and the abort signal
 * defined in {@link BarsRequestOptions} end a call, which are producible with
 * no upstream in existence — and five are facts about the *world*, added by
 * 2.6.5. The addition landed the way the mechanism promised: it was a
 * **`TS2322`/`TS1360` in a file it did not edit**, because the exhaustive
 * `switch` in this module's tests could no longer reach `never`. That is what
 * "the taxonomy arrives later" costs when it is a compile error rather than a
 * hope, and it is why a ninth member is safe to add too.
 *
 * **`API_ERROR_CODES`' rule governs the list, in both directions**: a member
 * exists when a failure can be produced, and two causes merge when nothing
 * branches on the difference. So `unauthorised` is one member covering a
 * missing key, a wrong key and an unentitled one, while `timeout` and
 * `upstream-unavailable` stay apart — the first admits a repair the second does
 * not. **The failure mode this list exists to avoid is a single
 * `ProviderError` with a `message`**, which is what every codebase has until
 * somebody has to render two of them differently, and Story 2.14's whole
 * subject is that *"we have nothing for this symbol"* and *"the feed refused
 * us"* are different sentences. A string cannot be switched on.
 *
 * The retryable third column is {@link isRetryableOutcome} rather than prose,
 * for the reason given there.
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
 * **No member echoes the request back, and Task 2.6.5 settled that as one rule
 * rather than an exception.** The rule it chose is narrower and easier to apply
 * than "may carry the symbol":
 *
 * > **A member carries only what the caller does not already hold.**
 *
 * That is why `timeout` carries `deadlineMs` — a caller that omitted
 * `deadlineMs` does not know which number it was measured against — and why
 * `rate-limited` may carry a hint, which is genuinely new information from the
 * vendor. It is also why `unknown-symbol` does not name the symbol and
 * `range-not-available` does not repeat the range: a request is for exactly one
 * symbol over exactly one window, so echoing either is a second copy that can
 * only ever agree or be wrong. The batch case §8.6 anticipated does not need it
 * either, because a batch returns a `BarsResult` **per symbol**, so the symbol
 * is already beside the cause structurally.
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
  | { readonly outcome: "aborted" }
  /**
   * The request was well-formed and there is no such security.
   *
   * **An answer rather than a failure**, and Story 2.14 renders it as one. This
   * is the member `Ticker`'s brand deliberately does not buy: a well-formed
   * ticker for a security that does not exist — or that this vendor does not
   * carry, which is not the same thing and is indistinguishable from here — is
   * a perfectly valid request with a definite answer.
   *
   * Not retryable: the vendor will say the same thing tomorrow.
   */
  | { readonly outcome: "unknown-symbol" }
  /**
   * The symbol exists and this provider will not serve *this window*: before
   * its history depth, entirely in the future, or wider than it permits.
   *
   * **Not "the range is malformed"**, which is why the member is named for the
   * world rather than for us — `PROVIDER.md` §8.3 struck `bad-range` for
   * exactly that. A reversed, zero-width or invalid-`Date` range cannot reach a
   * provider at all, because `toTimeRange` is the only way to obtain a
   * {@link BarsRequest}'s `range` and it refuses all three naming both ends.
   *
   * **There is deliberately no sub-reason** — no `too-old` / `too-wide` /
   * `in-the-future` discriminator — and the argument is §8.7's rather than
   * economy: a fixture produces this one way, from a range outside its declared
   * coverage window, so a sub-reason would ship members nothing can produce,
   * which §8.7 calls a guess. It would also make every provider map a vendor's
   * prose into our vocabulary, where a mis-mapping is silent. The reversal
   * trigger is a caller that *repairs* the range automatically rather than
   * reporting it; today the caller is a person narrowing a request.
   */
  | { readonly outcome: "range-not-available" }
  /**
   * The vendor refused because we asked too often.
   *
   * Retryable, and **the only member carrying a hint about when** — which is
   * the whole of why it is a member of its own rather than folded into
   * `upstream-unavailable`.
   *
   * `retryAfterMs` is a **duration and not an instant**, deliberately: an
   * absolute time from the vendor has to be reconciled against our clock, and
   * skew in the unlucky direction means retrying *early*, against the service
   * that just asked us to stop. It is also milliseconds like every other
   * duration here, so HTTP `Retry-After`'s two forms — delta-seconds or a date
   * — are Story 2.7's mapping problem and arrive here already resolved.
   *
   * It is **optional because a vendor may not say**, and under
   * `exactOptionalPropertyTypes` that means genuinely absent rather than
   * present-and-`undefined` — so a provider building this branches, the way
   * `apiError()` does:
   *
   * ```ts
   * return hint === undefined
   *   ? { outcome: "rate-limited" }
   *   : { outcome: "rate-limited", retryAfterMs: hint };
   * ```
   *
   * A hint is a **floor and not an instruction**: constraint 2 in the retry
   * note above still binds, so a wrapper waits at least this long and never
   * past the caller's deadline. That is also what makes a nonsensical value
   * harmless without validating one.
   */
  | { readonly outcome: "rate-limited"; readonly retryAfterMs?: number }
  /**
   * The credential was missing, wrong, or not entitled to what was asked for.
   *
   * **A configuration fault, and never retryable** — a retry here is a loop
   * against a wall, which is precisely the shape a naive
   * "retry anything that failed" produces against a service that rate-limits.
   *
   * The three causes are one member on purpose: a caller does the same thing
   * about all of them, which is `API_ERROR_CODES`' own rule for when to merge.
   * They are also not reliably distinguishable from a vendor's response, and a
   * member that is usually wrong is worse than one that is coarse.
   *
   * This is the one member Story 2.7's first deploy will produce for real.
   */
  | { readonly outcome: "unauthorised" }
  /**
   * The vendor is down, unreachable, or answered with something that is not a
   * refusal we can name.
   *
   * Retryable — and read the module note above on the line between a result and
   * a throw before mapping anything here. **This member is where a defect goes
   * to hide.** A response we could not parse is *us*, and laundering it into
   * this member is how a permanent break wears the costume of a transient one
   * and becomes an invisible degradation nobody investigates.
   */
  | { readonly outcome: "upstream-unavailable" };

/**
 * Whether backing off and asking again could plausibly produce a different
 * answer.
 *
 * **This is `PROVIDER.md` §8.1's third column as code, and it is part of the
 * taxonomy rather than part of a policy.** It says nothing about how long to
 * wait, how many times, or whether to wait at all — those are numbers Story 2.7
 * measures and a wrapper applies. What it settles is the half that is a fact
 * about each cause, and it lives here beside the union for the reason
 * `isApiError()` lives beside `ApiError`: a wrapper that re-derives this in a
 * `switch` of its own is a second copy of the taxonomy, and the two disagree
 * the first time a member is added.
 *
 * **It is an exhaustive `switch` rather than a list of retryable outcomes**, and
 * that is the point: a list leaves a new member silently non-retryable, which is
 * the *safe* answer arrived at by silence, and a switch makes classifying it a
 * condition of the build compiling.
 *
 * `aborted` is `false` and it is not really a member of this question at all —
 * the caller tore down, so there is nobody left to retry on behalf of.
 */
export function isRetryableOutcome(result: BarsResult): boolean {
  switch (result.outcome) {
    case "rate-limited":
    case "upstream-unavailable":
    case "timeout":
      return true;
    case "ok":
    case "aborted":
    case "unknown-symbol":
    case "range-not-available":
    case "unauthorised":
      return false;
    default: {
      const unhandled: never = result satisfies never;
      return unhandled;
    }
  }
}

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
   * Which venues are in the numbers this implementation serves — the
   * invariant-6 field, declared **standing** rather than per request.
   *
   * ## Why a provider is the thing that knows this (Task 2.6.7)
   *
   * `MARKET_FEEDS`' own comment is emphatic that provider and feed vary
   * *independently*: one vendor serves a single venue on a free plan and the
   * consolidated tape on a paid one. That is an argument against **inferring**
   * a feed from a provider id, and it is not an argument against a provider
   * **declaring** one — because the thing that holds the credential is exactly
   * the thing that knows which plan it is on. Story 2.7's client is
   * constructed from a key and will declare the feed that key is entitled to.
   *
   * The two rejected homes, both weighed against this:
   *
   *  - **A second environment variable.** Honest about the feed being a
   *    property of the plan rather than of the vendor, and it buys that at the
   *    price of a fourteenth variable and a pair nothing checks — an operator
   *    could set `MARKET_DATA_PROVIDER` and the feed variable to two things
   *    that cannot both be true, and the product would then print the wrong
   *    one. It also duplicates a fact the client already has from its own
   *    configuration.
   *  - **Nothing, and render only the provider until a series exists.** The
   *    narrowest answer and the one that leaves §7.1 unmet in the state that
   *    matters: a deployment reading a single venue would say so nowhere until
   *    somebody opened a chart.
   *
   * ## What this is NOT, and the line is worth keeping
   *
   * This is the **standing claim about what this deployment is configured to
   * read**. `SeriesProvenance` remains the authority for what a *particular*
   * series actually came from, per source, and it is what Story 2.14 renders
   * beside a number. The two agree by construction in an implementation that
   * has one definition of its feed — see `fixture-provider.ts`, where the
   * `BarSource` reads this field rather than repeating a literal.
   *
   * The reversal trigger is a provider that serves **more than one feed**,
   * chosen per request. At that point this field stops being a fact about the
   * implementation and becomes a fact about a call, and it moves onto the
   * request — at which point the chrome renders the *configured* feed from
   * somewhere else, and every series still carries its own.
   */
  readonly feed: MarketFeed;

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
