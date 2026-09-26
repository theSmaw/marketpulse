import type { MarketDate, SecurityLastClose } from "@marketpulse/shared";

// What a *response* of stored closes shares, beside the table that renders it
// (Task 2.9.7).
//
// ## This file used to hold the change arithmetic, and no longer does
//
// `changeFromClose`, `changePercent` and `LiveChange` moved to
// `packages/shared/src/live-change.ts` on **2026-09-26** (Task 4.2.3), which
// is the condition this file wrote down for itself being met for the second
// time: `formatPrice`, `formatChangePercent` and `directionOf` left on
// 2026-09-11 when Task 2.12.3's value axis became their third consumer, and
// Story 4.2's **backend** join is the third consumer of the arithmetic. The
// second half of the reason is that the third consumer is a different
// process — see that module for the invariant-1 argument, which now reaches
// across the wire rather than staying inside one bundle.
//
// The two arguments this file made for keeping its own arithmetic are
// unchanged and travelled with it: no currency symbol, and no absolute
// change.
//
// ## What is left, and why it stayed
//
// One question, and it is about a **response** rather than about a figure:
// whether 518 rows share a session, so a heading can state the date once
// instead of every cell repeating it. That is a fact about one view of one
// fetch. The backend joining a live bar to a close has no use for it, and a
// function nobody outside this component tree calls does not earn a place in
// a shared package.

/**
 * The session every close in this response belongs to, or `null` when they
 * disagree.
 *
 * **This is what lets the date be stated once instead of 518 times.** The store
 * is filled by a backfill that walks every security over the same sessions, so
 * in practice every row shares one date — measured on the local store at full
 * depth, all **518 of 518** securities last closed on the same session. A date
 * repeated down every row under a heading that could carry it is furniture,
 * which is the argument that took the sector column out of this table.
 *
 * It returns `null` rather than a majority, and the caller then puts each row's
 * own date in its cell. That asymmetry is deliberate and it is `coverage.ts`'s:
 * the shared claim is made only when it is true of everything, and the moment
 * it is not, the page stops making it rather than making it approximately.
 *
 * An empty map is `null` too — there is no session to name — which the caller
 * renders as a heading with no date under it, because there are no prices under
 * it either.
 */
export function commonSession(
  closes: ReadonlyMap<string, SecurityLastClose>,
): MarketDate | null {
  let session: MarketDate | null = null;

  for (const close of closes.values()) {
    if (session === null) session = close.session;
    else if (session !== close.session) return null;
  }

  return session;
}
