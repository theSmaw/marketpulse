import {
  type BarsRequest,
  type BarsRequestOptions,
  type BarsResult,
  DEFAULT_BARS_DEADLINE_MS,
  isRetryableOutcome,
  type MarketDataProvider,
} from "./market-data-provider.js";

/**
 * Retry, as a provider that wraps a provider (Task 2.7.7).
 *
 * `PROVIDER.md` §8.8 settled the shape, Task 2.6.5 confirmed it unchanged, and
 * the module comment above `MarketDataProvider` says it where the next person
 * to reach for a retry will be reading. **This file does not re-decide it.**
 * The two rejected homes and their costs are recorded there; what was left open
 * — deliberately, because there was no provider to wrap and no measured
 * distribution to pick a backoff from — is the *numbers*, and every number here
 * carries its derivation.
 *
 * ## The three constraints, and how each is held
 *
 * **1. Only retryable causes are retried, and `isRetryableOutcome()` is the
 * only classifier.** There is no `switch` in this file. A second copy of that
 * table is how a ninth member ends up silently non-retryable — the safe answer
 * arrived at by omission, which §8.1's exhaustive switch exists to prevent.
 *
 * **2. A retry is bounded by the caller's deadline and the caller's signal, and
 * gets no budget of its own.** This is *"a retry buried in the transport makes
 * the deadline a lie"* applied to the one thing allowed to retry. Two
 * mechanisms rather than one:
 *
 * - Each attempt is delegated with the **remaining** budget as its
 *   `deadlineMs`, never with the caller's original figure. Passing the original
 *   to every attempt is the obvious implementation and it silently multiplies
 *   the caller's deadline by the attempt count — the first of this task's two
 *   deliberate breaks.
 * - We **never sleep past the deadline**. If the delay plus one plausible
 *   attempt does not fit in what is left, this gives up *now* and returns the
 *   real cause, rather than waiting out the budget and reporting a `timeout` we
 *   manufactured ourselves. A caller told `rate-limited` can act; a caller told
 *   `timeout` by its own retry wrapper has been told nothing.
 *
 * **3. There is no queue, and that is a decision rather than an omission** —
 * see the block below.
 *
 * ## The stopping rule is elapsed time. There is no attempt count.
 *
 * There is deliberately no `maxAttempts` constant, because a count is the wrong
 * bound and would be reached second anyway. How many attempts fit is a function
 * of how long an attempt costs, and Task 2.7.6 measured both ends of that:
 *
 * - **A refused connection fails in ~1 ms.** `upstream-unavailable` covers
 *   transport failures and a host that is not there answers instantly, so the
 *   *cheapest* failure is the one a naive policy retries *fastest*.
 * - **A hung host costs the whole remaining budget**, because our own
 *   `AbortSignal.timeout` is what ends it.
 *
 * Those bracket everything between, and neither is a number this wrapper can
 * know in advance — so elapsed wall clock against the caller's deadline is the
 * only bound that is correct for both. The attempt counter chooses the *shape*
 * of the delay, which is what exponential backoff is; it decides nothing about
 * whether there is another attempt.
 *
 * **A consequence worth stating rather than discovering: `timeout` is
 * retryable in the taxonomy and unreachable through this wrapper.** A hung
 * attempt consumes the entire remaining budget by definition, so there is
 * nothing left to retry with. That is not a contradiction — `isRetryableOutcome`
 * classifies a *cause*, and this wrapper is bounded by a *budget*. Slicing the
 * caller's deadline into per-attempt portions would make a hang retryable and
 * was rejected: it invents a second timeout the caller cannot see, and a caller
 * that wants two 5-second attempts can ask for them, where a caller that asked
 * for five seconds cannot be given fifteen.
 *
 * ## There is no queue, and what that means for Story 2.8
 *
 * §8.8's third constraint says a retry policy plus a rate limit is a queue, a
 * queue has a depth, and an unbounded one is a memory leak wearing a politeness
 * costume. **The answer for V1 is that there is no queue at all: a retry is a
 * delay inside one call, and concurrency is the caller's problem.** Depth is
 * therefore exactly the caller's own in-flight count — memory this wrapper adds
 * is one timer and one closure per call already in flight, which the caller was
 * already holding.
 *
 * That is materially cheaper than a shared queue and it hands Story 2.8 a real
 * obligation rather than a hidden one, so here is the arithmetic it needs:
 *
 * - **At the cap, one caller retries at 1 request per `RETRY_MAX_DELAY_MS`** —
 *   0.5/s — against a measured refill of 3.23/s. One retrying caller cannot
 *   trip the limit.
 * - **A hundred concurrent callers do not recover from a rate limit — they
 *   compete for the same refill and pay for the privilege.** Measured rather
 *   than reasoned about (ALPACA.md §6b): 320 concurrent calls through this
 *   wrapper at a 20-second deadline sustained **73 requests a second against a
 *   3.23/s refill, 22× the limit**, turned 91 answers into 263, and still left
 *   57 refused. The first 286 extra requests bought 115 extra answers; the next
 *   867 bought 57.
 *
 * Nothing here prevents that, and nothing here should: §8.8 draws the line that
 * **per-request retry is this wrapper's and cross-request pacing is Story 2.8's
 * backfill**, because a backfill that retries a whole batch re-fetches
 * ninety-nine symbols that answered perfectly. The reversal trigger is a second
 * caller as concurrent as the backfill, at which point the pacing belongs
 * somewhere both can see it rather than inside this file.
 * - Story 2.8's own measurement makes this cheap to honour: the rate limit is
 *   **per request, not per symbol** (ALPACA.md §6), so the whole universe is one
 *   request per window and a batched backfill has few enough callers for the
 *   first figure to be the relevant one.
 *
 * ## What a retry actually re-spends, now that one call is a WALK
 *
 * This wrapper composes around the **interface**, so a retry re-runs
 * `fetchBars` — which since Task 2.7.5 is up to five HTTP requests, and a retry
 * re-runs the walk **from page 1**, discarding pages that succeeded. On the
 * measured five-page month that is five requests spent to recover from a
 * failure on the fifth.
 *
 * **That is accepted, and it is the cheap answer that is also the only coherent
 * one.** A resumed walk needs a resume point, and Task 2.7.5 rejected exposing
 * one precisely because a clipped `covered` is indistinguishable from *"the
 * vendor had nothing after this point"* — so a resumable retry would trade a
 * wasted request for a series that lies about its own coverage. The rejected
 * alternative is fixing it by moving retry *inside* the walk, which is a retry
 * in the transport that §8.8 refuses and which would multiply an already-shared
 * budget across pages *and* attempts.
 *
 * The number Story 2.8 inherits: **a retried symbol costs its page count
 * again**, so a hundred symbols retried once is not a hundred extra requests,
 * it is a hundred times the page count.
 *
 * ## What the vendor does after a `429`, which is less than everyone assumes
 *
 * Measured 2026-09-07 (ALPACA.md §6b): **the limiter is a token bucket
 * refilling at 3.23 requests a second, not a punished sixty-second window.**
 * The request immediately after a drained burst answered `200`. So a `429`
 * means *one request refused*, and a backoff only has to outlast a **token**
 * — about 310 ms — rather than a window. That is why the numbers above are
 * hundreds of milliseconds and not seconds, and it is the single reason this
 * policy is cheap enough to apply to every call.
 *
 * ## The wrapper is invisible downstream
 *
 * It reports the `id` and the `feed` of the provider it wraps rather than
 * inventing its own, so provenance on a retried series is identical to
 * provenance on a first-attempt one. That is what lets Story 2.8 compose freely,
 * and it is asserted rather than assumed.
 */
export function withRetry(
  provider: MarketDataProvider,
  policy: RetryPolicy = {},
): MarketDataProvider {
  const resolved: ResolvedPolicy = {
    baseDelayMs: policy.baseDelayMs ?? RETRY_BASE_DELAY_MS,
    maxDelayMs: policy.maxDelayMs ?? RETRY_MAX_DELAY_MS,
    random: policy.random ?? Math.random,
  };

  return {
    // Delegated, never invented. See the comment above.
    id: provider.id,
    feed: provider.feed,
    fetchBars: (request, options) =>
      fetchWithRetry(provider, resolved, request, options ?? {}),
  };
}

/**
 * The first delay, and **two independent measurements land on the same number**,
 * which is why it is 300 rather than a round 250 or 500.
 *
 * - ALPACA.md §6 measured a request at **~280 ms**. A delay shorter than a
 *   round trip is retry pressure without a pause — it asks again before the
 *   service has had as long as one ordinary request to recover.
 * - Task 2.7.7 measured the limiter itself and found it is a **token bucket
 *   refilling continuously at 3.23 requests a second**, not a punished window.
 *   One token is therefore **~310 ms**, and a delay of about one token is the
 *   shortest wait that can actually have changed the answer.
 *
 * Equal jitter halves this, so the real first wait is 150–300 ms — under one
 * token on its own, which is correct: the *second* delay doubles, and a first
 * attempt that lost a race for a token deserves a quick second look before the
 * schedule backs off in earnest.
 */
export const RETRY_BASE_DELAY_MS = 300;

/**
 * The ceiling on a single delay, derived from `DEFAULT_BARS_DEADLINE_MS` rather
 * than chosen: a delay larger than the whole default budget could never be
 * slept, so it would only ever produce a give-up. 2,000 sits below 3,000 with
 * room for the attempt that follows it.
 *
 * It is also what converts Task 2.7.6's *"the cheapest failure retries
 * fastest"* into a bounded rate — a caller against a dead host settles at one
 * request per this figure, whatever its deadline.
 */
export const RETRY_MAX_DELAY_MS = 2_000;

/**
 * How much budget an attempt needs for the wrapper to consider making one.
 *
 * ALPACA.md §6's ~280 ms round trip, rounded up. Below this a further attempt
 * is not an attempt, it is a `timeout` we scheduled ourselves — the failure
 * that replaces a real, actionable cause with an artefact of our own policy.
 *
 * It coincides with {@link RETRY_BASE_DELAY_MS} and is deliberately a second
 * constant: one is *how long to wait* and the other is *how much room an
 * attempt needs*, and they move for different reasons — a slower vendor moves
 * this one, a stingier limiter moves that one.
 */
export const MIN_ATTEMPT_BUDGET_MS = 300;

/** Every number is optional; the defaults above are the shipped policy. */
export interface RetryPolicy {
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  /**
   * The jitter source, so a test can make a delay deterministic. Production
   * never passes one.
   */
  readonly random?: () => number;
}

interface ResolvedPolicy {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly random: () => number;
}

async function fetchWithRetry(
  provider: MarketDataProvider,
  policy: ResolvedPolicy,
  request: BarsRequest,
  options: BarsRequestOptions,
): Promise<BarsResult> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_BARS_DEADLINE_MS;
  const startedAt = Date.now();
  const remaining = (): number => deadlineMs - (Date.now() - startedAt);

  const callerSignal = options.signal;
  const signalPart = callerSignal === undefined ? {} : { signal: callerSignal };

  let result = await provider.fetchBars(request, {
    deadlineMs,
    ...signalPart,
  });

  for (let attempt = 1; ; attempt += 1) {
    if (!isRetryableOutcome(result)) return result;

    // The caller's teardown is a fact about the caller and not about the
    // backend, so it is reported as `aborted` rather than as whatever the last
    // attempt happened to say — Task 1.12.2's rule, which is why the frontend
    // maps `aborted` to no state at all.
    if (callerSignal?.aborted === true) return { outcome: "aborted" };

    const delayMs = delayFor(attempt, result, policy);

    // Constraint 2's second mechanism. Note this returns the REAL cause: a
    // give-up here is not a timeout, and reporting one would hide the reason a
    // caller could act on behind an artefact of this wrapper's own schedule.
    if (delayMs + MIN_ATTEMPT_BUDGET_MS > remaining()) return result;

    if ((await sleep(delayMs, callerSignal)) === "aborted") {
      return { outcome: "aborted" };
    }

    // The remaining budget, recomputed — so an attempt's own `timeout` member
    // carries the number it was genuinely measured against, which is what
    // §8.6 says that field is for.
    result = await provider.fetchBars(request, {
      deadlineMs: remaining(),
      ...signalPart,
    });
  }
}

/**
 * Exponential with **equal jitter**, and a `rate-limited` hint as a floor.
 *
 * The jitter is not decoration. Story 2.8 fires a hundred requests, they hit a
 * rate limit together, and a jitter-free backoff retries them together — a
 * thundering herd against the service that just asked for less traffic.
 *
 * **Equal jitter rather than full jitter**, which is the more commonly cited
 * form: full jitter draws uniformly from `[0, scheduled]` and so can return
 * approximately zero, i.e. come straight back at the service that just refused
 * us. Half fixed and half random keeps a floor while still spreading a hundred
 * callers across the window.
 *
 * **The `retryAfterMs` hint is a floor inside the caller's bound, never an
 * extension of it** (§8.6). A vendor asking for sixty seconds inside a
 * three-second deadline means giving up, not waiting sixty seconds — which is
 * what happens, because the caller's own give-up check reads this number.
 *
 * **Measured 2026-09-07: Alpaca never sends one.** Its `429` carries no
 * `Retry-After` and no `x-ratelimit-*` headers at all, confirmed across three
 * bursts. This branch is real code the live vendor will not exercise, kept
 * because a vendor adding the header is silent, and tested against the fixture
 * provider, which can produce the member with a hint attached.
 */
function delayFor(
  attempt: number,
  result: BarsResult,
  policy: ResolvedPolicy,
): number {
  const scheduled = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** (attempt - 1),
  );
  const jittered = scheduled / 2 + policy.random() * (scheduled / 2);

  const hint =
    result.outcome === "rate-limited" ? result.retryAfterMs : undefined;

  return hint === undefined ? jittered : Math.max(jittered, hint);
}

/**
 * A wait the caller's signal cancels **immediately** rather than after it
 * elapses, which is the difference between a wrapper that honours an abort and
 * one that merely notices it afterwards.
 */
function sleep(
  ms: number,
  signal: AbortSignal | undefined,
): Promise<"slept" | "aborted"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      finish("slept");
    }, ms);

    const onAbort = (): void => {
      finish("aborted");
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    function finish(how: "slept" | "aborted"): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(how);
    }
  });
}
