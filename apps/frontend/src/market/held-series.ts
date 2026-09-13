import type { ApiResult } from "../api-client.js";
import type { BarSeriesRequest } from "../bar-series-query.js";
import type { BarSeriesResponse } from "@marketpulse/shared";

import type { BarSeriesView } from "./bar-series-view.js";
import { toBarSeriesView, toRetryingBarSeriesView } from "./bar-series-view.js";
import type { CacheableBarSeriesView } from "./series-cache.js";
import { isCacheableBarSeriesView } from "./series-cache.js";

// **What is on screen, as opposed to what came back** (Task 2.13.7).
//
// This module exists because Story 2.13's acceptance criterion 4 asks a
// question the six-member union cannot answer, and the reason it cannot is
// structural rather than an omission.
//
// `BarSeriesView` is a total answer to *what came back for the request we are
// making now*. Until Task 2.13.6 that was also a total answer to *what is on
// screen*, because the only thing that changed the request was a change of
// **security** — and a held NVDA series under an AMD heading is the one thing
// this layer is most careful about, so on a change of symbol the honest screen
// really is `loading`.
//
// A window change is different, and it is the first thing in the product that
// makes the difference visible. The security has not moved. The series on
// screen is still a **true picture of its own window**, and it stops being true
// only if the label above it claims to be about the new one
// (`VOLUME-AND-WINDOW.md` §6.3, which named this tension and deliberately left
// it here).
//
// So one thing is added and it is **not a seventh state**:
//
// > The last *answer* this page painted is kept, together with the request it
// > answers, until a newer answer replaces it. It is cleared when the security
// > changes, and never otherwise.
//
// Three consequences worth stating, because each one was a candidate design:
//
//  1. **`stale` is not this.** That flag means *the same request, one request
//     old*, and it is set at the two cache reads. A held answer to a
//     **different** window is not a stale answer to this one — the numbers in
//     it are not about to be replaced by better numbers for the same question,
//     they are about to be replaced by an answer to another question. Both
//     marks exist and they say different sentences (`BarSeriesPanel`).
//  2. **It is not a member of `BarSeriesView`.** A seventh member would land in
//     every consumer's `switch` for ever and each would have to re-derive which
//     answer it is holding — which is the answer members with a boolean,
//     spelled longer. It is also, precisely, a fact about *two* requests, and
//     a union member describes one.
//  3. **It fixes a second blanking nobody had reported.** A cached answer
//     painted on mount, followed by a refetch that fails, used to replace a
//     correct chart with a failure. It is the same shape as the window case —
//     an answer on screen being thrown away by a state that has no picture —
//     and the same rule covers it, because the rule is about the last answer
//     rather than about the window.

/** An answer that is still on screen, and the request it is an answer to. */
export interface HeldSeries {
  /** Only ever one of the three answers. Never a `refused` or a `failed`. */
  readonly view: CacheableBarSeriesView;

  /**
   * The request it answers — the symbol, the timeframe and the window.
   *
   * The whole request rather than the window alone, and the symbol is why: it
   * is what {@link toRequestedBarSeriesState} compares to decide whether this
   * answer may stay on screen at all.
   */
  readonly request: BarSeriesRequest;
}

/** Everything `useBarSeries` holds: the answer to now, and the last answer. */
export interface BarSeriesState {
  readonly view: BarSeriesView;
  readonly held: HeldSeries | null;
}

/**
 * **Everything one screen is showing, as one value.**
 *
 * Four fields rather than two props, and that is a fence rather than a
 * convenience: a component handed *the answer* and *the picture* separately can
 * be handed two that disagree — a `failed` beside a drawn series that is
 * actually this window's answer, say — and that is a screen the application
 * cannot reach and a reviewer cannot tell from one it can. There is one
 * producer, {@link barSeriesScreen}, and no other way to obtain one.
 */
export interface BarSeriesScreen {
  /**
   * What came back for the request being made **now**.
   *
   * What the panel *reports on*: whether the window that was asked for was
   * answered, refused or failed.
   */
  readonly view: BarSeriesView;

  /**
   * What is actually **drawn** — `view`, unless it carries no picture and a
   * previous answer is being held.
   *
   * Every surface that renders a series reads this: the panel's figures, the
   * price plot, the volume plot in another region, and the shared axis all
   * three hang on. They take it from one place so they cannot disagree about
   * what is on screen.
   */
  readonly shown: BarSeriesView;

  /** The request being made now — the one the address describes. */
  readonly asked: BarSeriesRequest;

  /**
   * The request {@link BarSeriesScreen.shown} answers, **when it is not the one
   * being asked**, and `null` when the picture is the answer to the current
   * request.
   *
   * Non-null is exactly the condition for the rail that names which window is
   * on screen. It carries the request rather than a phrase, because the words
   * are `time-window.ts`'s and a formatter that lived here would be a second
   * vocabulary for the same window.
   */
  readonly previous: BarSeriesRequest | null;
}

/**
 * The state a request change lands in.
 *
 * `view` is what the caller already decided to paint for the new key — a held
 * entry from the cache, marked stale, or `loading`. It is passed in rather than
 * read here because reading the cache is a side effect and this is a pure
 * transition; `use-bar-series.ts` owns that read and owns the rule that every
 * read of the cache is accompanied by a request.
 *
 * **The symbol comparison is the whole of the safety here.** A held answer
 * survives a change of *window* and never a change of *security*: the second
 * would put one security's bars under another's heading, which is plausible and
 * wrong rather than visibly broken, and is the failure this layer exists to
 * prevent. The comparison is against the **held** request rather than the
 * outgoing view's, because they are the same symbol by construction and the
 * held one is the one that would actually stay on screen.
 */
export function toRequestedBarSeriesState(
  previous: BarSeriesState,
  request: BarSeriesRequest,
  view: BarSeriesView,
): BarSeriesState {
  // A cache hit for the new key is itself an answer, and it is the answer to
  // the request being made — so it becomes the held one and there is no
  // previous window on screen to name.
  if (isCacheableBarSeriesView(view)) return { view, held: { view, request } };

  const sameSecurity = previous.held?.request.symbol === request.symbol;

  return { view, held: sameSecurity ? previous.held : null };
}

/**
 * The state one settled request lands in.
 *
 * Wraps {@link toBarSeriesView} and adds one line: an answer becomes the held
 * one, and anything else leaves the held one alone. That is what keeps a chart
 * on screen through a refusal and through a failure.
 *
 * `aborted` is covered without a branch of its own, which is worth knowing
 * rather than rediscovering: `toBarSeriesView` returns the previous view
 * untouched for it, so a superseded answer changes neither field here.
 */
export function toBarSeriesState(
  previous: BarSeriesState,
  request: BarSeriesRequest,
  result: ApiResult<BarSeriesResponse>,
): BarSeriesState {
  const view = toBarSeriesView(previous.view, result);

  return {
    view,
    held: isCacheableBarSeriesView(view) ? { view, request } : previous.held,
  };
}

/** A retry the user asked for. The held answer is untouched by definition. */
export function toRetryingBarSeriesState(
  previous: BarSeriesState,
): BarSeriesState {
  return { ...previous, view: toRetryingBarSeriesView(previous.view) };
}

/**
 * Which answer is the picture, and what it is an answer to.
 *
 * The one rule, in one place, so that the panel, the two plots and the shared
 * axis cannot disagree about what is being drawn:
 *
 * > A state that carries no picture of its own shows the held answer, if there
 * > is one.
 *
 * `loading`, `refused` and `failed` are the three that carry none, and they are
 * spelled as a `switch` rather than as a negation so that a seventh member is a
 * compile error here — *does the new state have a picture?* is a question whose
 * default answer must not be "silently no".
 *
 * Note the asymmetry with `chartSubject`, which is the same three members for a
 * different reason. That function asks *is there a window to draw*; this one
 * asks *is there anything on screen*. They agree today and are not one
 * function: `loading` draws a frame and has no picture, which is exactly the
 * distinction the rail is about.
 */
export function barSeriesScreen(
  state: BarSeriesState,
  asked: BarSeriesRequest,
): BarSeriesScreen {
  const base = { view: state.view, asked } as const;

  switch (state.view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return { ...base, shown: state.view, previous: null };

    case "loading":
    case "refused":
    case "failed":
      return state.held === null
        ? { ...base, shown: state.view, previous: null }
        : { ...base, shown: state.held.view, previous: state.held.request };
  }
}
