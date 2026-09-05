# Task 2.4.3 — Real data on screen: the frontend read path and the plainest honest list

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.2

## Objective

Get the 101 real securities onto the `/securities` route. **This is the task the whole story
exists for**, and it is deliberately the plainest version of it — the presentation work is
Task 2.4.4's, and separating them is what stops "make it look right" from delaying "make it
true".

## What the user can see when this lands

**The first real data this product has ever shown.** `/securities` stops being a placeholder
and lists every tracked security — symbol, name, sector, kind — read from the database
through the API. A stakeholder can open the deployed site, click Securities, and see that
MarketPulse tracks NVDA, AMD, XLK and SPY, and what each of those things is.

It will look plain. That is intended and worth saying out loud when demonstrating it: this
task proves the data is real and the path works end to end, and Task 2.4.4 makes it look
like the product. Shipping the plain version first is what makes the next task's changes
visible as a design improvement rather than lost inside a fix.

## Work

- **Fetch through `apps/frontend/src/api-client.ts` and nowhere else.** It is currently the
  only file in the application that calls `fetch`, Story 1.12 proved that by grep rather
  than by assertion, and it is worth keeping — it owns the base URL, the deadline, the abort
  signal, the `ApiError` parse and the correlation id, and a second caller would have to
  reimplement all five
- **Add the outcome to the client's vocabulary rather than beside it.** The client already
  returns **seven outcomes and never throws** — `ok`, `unreadable-body`, `api-error`,
  `http-error`, `timeout`, `unreachable`, `aborted` — and a second request shape should
  reuse that arrangement rather than inventing a parallel one. Note `aborted` is not a fact
  about the backend and must not be rendered as one, which Story 1.12 already learned the
  hard way
- **The states are types, not booleans.** Story 1.12's `BackendStatus` is the precedent and
  the argument is the same: name the states, make the impossible ones unrepresentable, and
  let the component render a state rather than infer one from three booleans that can
  contradict each other. There are four here and the fourth is the one nobody plans for —
  loading, loaded, failed, and **loaded-but-empty**, which is exactly what a migrated but
  unseeded database looks like and is not an error
- **Do not add a store.** Story 2.10 owns that decision and this story's open decision 2
  recommends leaving it there: one static list is the weakest possible evidence on which to
  decide how this application holds domain state, and deciding it here anchors it against a
  shape nothing like a streaming bar series. A hook beside `useBackendHealth` is the shape
  that costs nothing to replace
- **Render the plainest honest table**, inside the existing `Region` component so it
  inherits the landmark, the heading and the error boundary. Four columns, no grouping, no
  sorting control, no search. Tabular numerals are already set globally
- **Say on screen that there are no prices yet**, using Story 1.5's convention that an empty
  region names the epic that fills it. A page of securities with no prices looks broken
  unless it says why it is not
- **Fetch once, not on a poll.** `useBackendHealth` polls every 30 seconds because a health
  state changes; the universe changes a handful of times a year, and a poll would be
  standing billable traffic against the Consumption plan's idle condition for no benefit

## Done when

- `/securities` renders every tracked security from the database, seen in a browser
- The four states exist as types and the component renders a state rather than inferring one
- `api-client.ts` is still the only file that calls `fetch`, verified by grep
- No store, no poll, no search
- Tests at the level each thing belongs to, and `pnpm verify` passes with no database

## Notes

The temptation is to do this task and Task 2.4.4 together, because a plain table feels
unfinished. Resist it: the two failures they catch are different — this one catches "the
data is not what we thought", and that one catches "the page does not read as a product" —
and merging them means a single large change where neither is clearly the cause of the other.
