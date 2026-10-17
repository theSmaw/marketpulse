import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";

import type { MarketSession } from "@marketpulse/shared";
import type { ReturnRefusal } from "./five-minute-return.js";

/**
 * **The closing five-minute return of one completed session, from stored
 * closes** (Task 5.4.5) — the figure the nightly pass ranks so that `/` has
 * something to draw while the market is shut.
 *
 * ## It reads nothing: not a clock, not a socket, not a handle
 *
 * `five-minute-return.ts`' and `return-baseline.ts`' property, for their
 * reason. The session and the closes arrive as **arguments**, so this cannot
 * read anything timestamped after a replay clock because it reads nothing at
 * all — invariant 4 made structural rather than instructed.
 *
 * ## Why it is a SECOND implementation of a walk this product already has, and
 * ## why that is not a second home for the figure
 *
 * `fiveMinuteReturn` walks a `TrailingWindow`'s `LiveObservation[]` — bars with
 * a `BarSource`, oldest first, six or seven of them — and this walks a
 * `ReadonlyMap<epochMs, number>` of ~24,000 `sip` closes the baseline pass is
 * already holding. Handing the map to that function would mean **forging
 * 24,000 `LiveObservation`s with a `BarSource` nobody retrieved**, which is
 * exactly the shape ADR 0031 exists to refuse: a `provider` that is not a claim
 * about a provider and a `retrievedAt` that is a fact about no retrieval.
 *
 * So what is shared is the **rule** rather than the loop, and the rule is
 * stated once in each: *exactly the span apart, never the nearest bar*, and the
 * three refusals are `ReturnRefusal`'s own members — read from that module by
 * type, so a fourth refusal there is a compile error here.
 *
 * ## Which pair of the session, and why it is the newest rather than the grid's
 *
 * The **newest close at or before the session's end**, and the close exactly
 * {@link RETURN_SPAN_MINUTES} minutes before **it**. That is
 * `fiveMinuteReturn`'s own endpoint rule applied to a session that has ended,
 * which is what makes the out-of-hours figure the same *kind* of figure as the
 * live one: the live path's numerator is not grid-aligned either — it is the
 * newest bar and the bar five minutes before it, whatever minute that is.
 *
 * The alternative — the sampler's last grid anchor pair — was rejected because
 * it answers a different question (*the session's last grid window*, which ends
 * four minutes before the bell on a full session) and because grid alignment is
 * a property the **baseline's samples** need in order not to overlap each
 * other, not a property its numerator needs.
 */

/** One endpoint: the bar's own `startsAt`, and its close. */
export interface SessionReturnEndpoint {
  readonly at: Date;
  readonly price: number;
}

/** The closing return, measured. */
export interface MeasuredSessionReturn {
  readonly measured: true;
  /** The signed move, as a percentage. */
  readonly percent: number;
  readonly from: SessionReturnEndpoint;
  readonly to: SessionReturnEndpoint;
  /** How many of the span's minutes we hold a close for, `1`–`spanMinutes`. */
  readonly observed: number;
  readonly spanMinutes: number;
}

/**
 * No figure, and which refusal it was.
 *
 * The vocabulary is {@link ReturnRefusal}'s, which is the point: the counts
 * this pass stores are the same five the live producer tallies, so one sentence
 * covers both bases (Task 5.4.4's footer, out of hours).
 */
export interface RefusedSessionReturn {
  readonly measured: false;
  readonly refusal: ReturnRefusal;
}

export type SessionReturnOutcome = MeasuredSessionReturn | RefusedSessionReturn;

const MS_PER_MINUTE = 60_000;

export interface SessionReturnInput {
  /** The session being scored. Its `close` bounds the newer endpoint. */
  readonly session: MarketSession;
  /**
   * One security's closes over a window that **includes** this session, keyed
   * by the bar's own `startsAt` in epoch milliseconds —
   * `ReturnBaselineStore.readWindowCloses`' answer, read and never re-filtered.
   */
  readonly closes: ReadonlyMap<number, number>;
}

/**
 * **The session's closing return, or the reason there is not one.**
 *
 * The walk is backwards from the session's last minute, which is the direction
 * the answer is in: the newest close is the one endpoint there is, and once it
 * is found the older one is a single lookup rather than a search — *exactly the
 * span apart* is `===` on instants, so a 47-minute pair is not a near miss to
 * be tolerated.
 */
export function sessionClosingReturn(
  input: SessionReturnInput,
): SessionReturnOutcome {
  const { session, closes } = input;

  // The session's minute bars run from its open and the last one **starts** a
  // minute before the close, so the newest instant that can carry a bar is
  // `close − 1 minute`. Derived from the session's own bounds rather than from
  // a 15:59, because a half day closes at 13:00.
  const last = session.close.getTime() - MS_PER_MINUTE;
  const open = session.open.getTime();

  let newerAt: number | undefined;
  for (let at = last; at >= open; at -= MS_PER_MINUTE) {
    if (closes.has(at)) {
      newerAt = at;
      break;
    }
  }

  // **Nothing was observed in this session at all.** On a store with no `sip`
  // history for this security — CI's, and every security on it — this is the
  // answer for all 501.
  if (newerAt === undefined) {
    return { measured: false, refusal: "nothing-observed" };
  }

  const olderAt = newerAt - RETURN_SPAN_MINUTES * MS_PER_MINUTE;
  const newer = closes.get(newerAt);
  const older = closes.get(olderAt);

  // The newer close is present by construction (`has` above); the lookup is
  // narrowed rather than asserted, because a `!` here would be the one line in
  // this module a later edit could make false.
  if (newer === undefined) {
    return { measured: false, refusal: "nothing-observed" };
  }

  if (older === undefined) {
    return { measured: false, refusal: "no-earlier-endpoint" };
  }

  // `changePercent` cannot express this and is not asked to: neither operand is
  // a stored session close, both are minute closes on one tape inside one
  // session. `five-minute-return.ts` carries the same named exemption.
  if (!Number.isFinite(older) || older === 0) {
    return { measured: false, refusal: "no-basis" };
  }

  if (!Number.isFinite(newer)) {
    return { measured: false, refusal: "no-basis" };
  }

  // Counted in the same walk as the endpoints rather than by a second pass over
  // the same map — `fiveMinuteReturn`'s rule: a count taken by a second
  // traversal is a second measurement that can disagree with the first. The
  // newer endpoint is the last of the span's minutes, so the count starts at 1.
  let observed = 1;
  for (let step = 1; step < RETURN_SPAN_MINUTES; step += 1) {
    if (closes.has(newerAt - step * MS_PER_MINUTE)) observed += 1;
  }

  return {
    measured: true,
    percent: ((newer - older) / older) * 100,
    from: { at: new Date(olderAt), price: older },
    to: { at: new Date(newerAt), price: newer },
    observed,
    spanMinutes: RETURN_SPAN_MINUTES,
  };
}
