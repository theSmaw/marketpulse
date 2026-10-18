import { toTimeRange } from "@marketpulse/shared";

import { baselineWindowEndingAt } from "./return-baseline.js";

import type {
  BaselineSubject,
  BaselineTapeCounts,
  ReturnBaselineStore,
} from "./return-baseline-store.js";

/**
 * **The window's end, per TAPE — and the repair of a defect that fired in
 * production on 2026-10-15** (Task 5.5.1).
 *
 * ## The defect, which needed no job to fail
 *
 * `bar_coverage` is **tape-blind**: it has no `feed` column (dropped at Task
 * 3.7.5), `extendCoverage` moves `covered_end` with
 * `greatest(…, excluded.covered_end)`, and `live-bar-writer.ts` reaches it
 * through `recordSeries` with `feed: "iex"` bars — including the pre-market and
 * after-hours minutes the backfill never asks for. So `max(covered_end)` is
 * *the frontier the IEX socket reached*, which is not the frontier **the
 * consolidated tape** reached, and `baselineWindowEndingAt` was being handed
 * the first while every read under it filters on the second.
 *
 * Two transcripts, both from `backfill.yml`'s own logs:
 *
 *   - run 38739602430, **2026-10-15T13:04Z** — 09:04 ET, twenty-six minutes
 *     before the opening bell: `return baselines for 2026-10-15 — 60 sessions`,
 *     `window … 2026-10-15T20:00:00.000Z`. The generation was stamped with an
 *     `observed_at` **four hours in the future**, labelled 60 sessions, over a
 *     window whose newest session had not happened. Every morning run lands in
 *     pre-market and the live writer's first bars arrive from ~08:43 ET
 *     (`LIVE-DATA.md` §7.7), so this is the ordinary case rather than a race.
 *   - run 38823003136, 2026-10-15T23:23Z — the same evening, the `1m` fill
 *     printed `0 fetches, 0 sessions fetched, 10 already held`. The ledger said
 *     2026-10-15 was held **because the live writer had said so**, so the
 *     consolidated tape for that session was never fetched and the evening
 *     re-run could not repair the generation either. `NVDA` holds **318 `iex`
 *     bars and zero `sip` bars** for 2026-10-15 on the deployed store today.
 *
 * ## What the window end MEANS now, and the maximum is kept
 *
 * **The newest session that at least one tracked security holds a bar of the
 * baseline's own tape in, no newer than the fill's own frontier.**
 *
 * `readCoveredEnd`'s **maximum over active securities** is kept, unchanged, for
 * its own recorded reason: the minimum is `commonCoverage`'s intersection,
 * which is dragged permanently backwards by late-listing constituents —
 * `backfill.yml` names three — so one security that will never hold older
 * history would hold the whole universe's baseline a year behind, and a
 * security that is itself behind simply contributes fewer grid pairs to its own
 * counted `n`. What changes is only **what the maximum is taken over**: a
 * session the tape is *present* in, rather than a ledger row the IEX writer
 * also advances. Those were the same instant until 2026-09-23 and have differed
 * by design ever since.
 *
 * **`> 0` rather than a fraction of the session, and the alternative is the
 * reason.** A coverage floor would be a number nobody can derive — stored
 * per-symbol minute presence has a median of 82.8%, so any fraction is chosen
 * — while `> 0` makes exactly the thing Story 5.5's AC 1 names *impossible*: a
 * window whose newest session holds no bar of the tape. A newest session that
 * is thin rather than absent costs the pass **samples**, and `n` is counted
 * (`return-baseline.ts` property 3), so it is reported rather than hidden.
 *
 * ## The cost, and the bound on the retreat
 *
 * One `tapeCounts` call in the ordinary case: the walk asks the newest
 * candidate session first and stops at the first security that holds it, and
 * `activeSubjects` is ordered by symbol. Each call is the **index-only** shape
 * `tapeCounts` already documents — `market_bars_unique_bar` is
 * `(security_id, timeframe, observed_at, feed)` and all four columns are in the
 * predicate or the aggregate, so no heap block is touched.
 *
 * **The retreat is bounded by the candidate window itself, and it spells no
 * count.** The sessions it walks are `baselineWindowEndingAt(ledgerEnd).sessions`
 * — the very window the tape-blind code would have computed over — so the bound
 * is `BASELINE_LOOKBACK_SESSIONS` **by construction** rather than by a second
 * reading of it, the off-by-one on an exclusive `covered_end` exists in one
 * place, and `one-home-for-the-observation-window`'s fourth conjunct stays
 * answerable: a second `lastMarketSessions` call fixing a count here would be a
 * second answer to *how far back does this product look*, and this file does
 * not make one. (It fired on the first draft of this module, which did.)
 *
 * That bound is also the derivation of the refusal: a store holding no bar of
 * this tape anywhere in the newest possible window has no baseline to compute
 * at any depth, so the honest answer is the same `undefined` an empty ledger
 * gives and the pass prints its existing *run `pnpm backfill` first* line. The
 * worst case is `sessions × subjects` index probes rather than a walk off the
 * end of the calendar.
 *
 * **It is not in `return-baseline.ts`.** That module reads nothing by
 * construction, which is invariant 4 made structural; this one asks a store a
 * question. It takes the ledger's frontier as an **argument** for the same
 * reason `closesAsOf` does, so nothing here reads a clock either.
 */

/**
 * What the walk needs of the store, and nothing else.
 *
 * A `Pick` rather than a hand-written port — `readBaselineCost`'s idiom — so a
 * change to either method's signature is a compile error here instead of a
 * second description of it.
 */
export type TapeFrontierPort = Pick<
  ReturnBaselineStore,
  "activeSubjects" | "tapeCounts"
>;

/**
 * The newest session at or before `ledgerCoveredEnd` holding a `sip` bar for
 * any tracked security, as **that session's close** — which is exclusive, and
 * therefore the same shape `bar_coverage.covered_end` has and the same shape
 * `baselineWindowEndingAt` takes.
 *
 * `undefined` when no session in the lookback holds one, which is CI's store
 * (516 securities, zero bars) reached by a different route than the empty
 * ledger.
 */
export async function baselineTapeFrontier(
  port: TapeFrontierPort,
  ledgerCoveredEnd: Date,
): Promise<Date | undefined> {
  // **The candidates ARE the window the tape-blind code would have used.**
  // `baselineWindowEndingAt` already takes the millisecond off an exclusive
  // `covered_end` and already walks the calendar `BASELINE_LOOKBACK_SESSIONS`
  // back; asking it is what keeps that arithmetic, and that count, in one
  // place. See the header.
  const candidates = baselineWindowEndingAt(ledgerCoveredEnd).sessions;

  const subjects = await port.activeSubjects();

  // Newest first. `lastMarketSessions` answers oldest-first because every other
  // caller walks a window forwards; this one is a retreat.
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const session = candidates[index];
    /* c8 ignore next -- `lastMarketSessions` never returns a hole. */
    if (session === undefined) continue;

    if (await anySubjectHoldsTheTape(port, subjects, session)) {
      return session.close;
    }
  }

  return undefined;
}

/**
 * Whether one session holds a bar of the baseline's tape for anybody.
 *
 * **Short-circuited in JavaScript rather than in SQL**, and that is a measured
 * constraint rather than a preference: the one index on `market_bars` leads
 * with `security_id`, so a single statement over the whole universe for one
 * session cannot range-scan at all — it is a full index scan of ~48 M entries,
 * which `HOSTING.md`'s 10 MiB/s turns into minutes. Keyed on one id apiece it
 * is a handful of index pages, and the loop stops at the first security that
 * answers.
 */
async function anySubjectHoldsTheTape(
  port: TapeFrontierPort,
  subjects: readonly BaselineSubject[],
  session: { readonly open: Date; readonly close: Date },
): Promise<boolean> {
  const range = toTimeRange(session.open, session.close);

  for (const subject of subjects) {
    const counts: BaselineTapeCounts = await port.tapeCounts(subject, range);
    // **The `sip` count and never the total.** The `iex` count beside it is
    // the whole reason this function exists: it is what the ledger was
    // answering with, and it is free here because one index scan produces both.
    if (counts.sip > 0) return true;
  }

  return false;
}
