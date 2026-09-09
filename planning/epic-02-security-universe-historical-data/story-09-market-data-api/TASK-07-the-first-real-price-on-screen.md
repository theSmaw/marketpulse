# Task 2.9.7 — The first real price on screen

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.6

## Objective

Put a real, stored price into the running application — the last close and its
change, on the `/securities` table that already exists — so that a story with a
backend deliverable is not five tasks with nothing to look at.

## What the user can see when this lands

**The first price MarketPulse has ever shown anybody.** The tracked-universe table
gains a last close and its change against the previous session, for 518 real
securities, out of the real store: NVDA with a number beside it rather than a
coverage window. Colour is not the encoding — `PriceChange` already exists,
carries an arrow glyph and a sign, and has **never rendered a real number** in the
application; this is where it stops being a Storybook exhibit.

**What the user still cannot do**: see a chart, choose a window, or search. Those
are Stories 2.11 to 2.13. And the number is **the last stored session's close, not
a live price** — labelled as of its session date, because a stale number presented
as current is precisely the dishonesty invariant 6 exists to prevent.

## Work

- **Serve it on the existing `/securities` response**, beside Task 2.8.9's
  `coverage` record, rather than as a new endpoint the frontend has to learn to
  fetch. That is deliberate on two counts: `useSecurities` already fetches this
  route on this page, so **no new client plumbing is needed and Story 2.10's state
  decision is not pre-empted**; and Task 2.6.7 already found that a fact the page
  needs has to ride on something the page actually requests.

- **Read it at the DAILY timeframe**, two rows per security — the last close and
  the one before it. `readLastBarDates` already establishes the argument and the
  measurement behind it: a `max(observed_at) group by security_id` over daily bars
  is ~345,000 rows and finishes in milliseconds, where the same query over minute
  bars is 48 million. A page that scans `market_bars` at minute resolution to draw
  a list is the thing `bar_coverage` exists to prevent, and §8.6's cross-sectional
  reading (**493 rows, 28.2 ms**, via a PostgreSQL 18 skip scan) is the control to
  re-take rather than cite.

- **The change is arithmetic both sides already have**, so compute the percentage
  where the claim is made — `PriceChange`'s own header draws that line: a band name
  is a decision the backend reports, the direction of a move is arithmetic. What
  the wire carries is prices and a session date.

- **Say what the number is, on the page.** A close from the last complete session,
  with its date, and the feed already named in the chrome. A security holding no
  daily bars shows the absence honestly rather than a zero or a blank — Task
  2.4.2's `""` finding is the shape of that mistake.

- **Extend the contract with the guard, not around it.** The field is added to the
  interface **and** the schema, at every nesting level the `satisfies` guard does
  not reach, and the raw-body assertion is what proves the nullable case survives.
  `routes/securities.ts` applies the guard **four** times today; a field added to
  a nested shape is covered only by that shape's own application.

  **And there is a trap in checking that you did it, found 2026-09-09 by Task
  2.9.3.** `packages/shared` is consumed as **built output**, so adding a field to
  a shared interface and running `pnpm --filter @marketpulse/backend typecheck`
  proves nothing until the shared package is rebuilt — it typechecks against the
  previous `.d.ts`, comes back green, and reads exactly like a guard that is not
  firing. `pnpm --filter @marketpulse/shared build` first, every time, or the
  verification is of the old contract.

- **Re-measure the payload rather than predicting it.** The current response is
  **150,660 bytes, 12,831 gzipped** at 518 securities with coverage (Task 2.8.10),
  and 515 records carrying the same two instants is why it compresses 11.7:1 —
  518 distinct prices will not. Quote what it becomes.

- **Visual quality is an acceptance criterion of this task, not of a later one.**
  Right-aligned `tabular-nums` in the column, the alignment Task 1.4.3's 14.3 px
  measurement was bought for; the sign and glyph carrying direction under
  `grayscale(1)`, where this palette's red and green are **1.05:1** apart; and the
  column earning its place in a table that is already dense rather than being
  wedged into it.

- **`BarCoverage` gained a `source` and this page must not render it — added
  2026-09-09 by Task 2.9.4.** That task put `provider` and `feed` on the ledger
  (`0007_bar_coverage_provenance.sql`), so the coverage record this page already
  reads now carries which feed each security's history came from. It is **not**
  on the `/securities` wire and must not be put there by this task: Task 2.6.7's
  rule is that **no second endpoint may answer "which feed"**, `/market-data`
  answers it for the deployment, and `SeriesProvenance` answers it per series. A
  per-security feed column on the universe table would be a third answer to one
  question, and the trigger for one — a deployment whose securities genuinely
  disagree about their feed — has not fired. The last close is a price, not a
  provenance record.

- **Know, and do NOT fix here: `/securities` can now answer 503 and this page
  renders it as _"unexpected response"_ — found 2026-09-09 by Task 2.9.6.** That
  task added `SERVICE_UNAVAILABLE` and gave `/securities` the 503 as well, so a
  database outage now arrives at the browser as a well-formed `ApiError` saying
  _this is temporary, retry_. `useSecurities` collapses `api-error` and
  `http-error` into one `answered-badly` state and `UniverseTable` renders that as
  **"unexpected response"** — which is now a false sentence for the commonest
  failure this page has. The backend is right and the frontend is one hop behind
  it.
  **It is Story 2.10's**, whose file records the decision this fires, and it is
  named here because this task is the next one to touch this page and would
  otherwise either trip over it or quietly widen its own scope to fix it. Do
  neither: the price column is this task, and a failure-taxonomy change is a
  contract decision with its own tests, its own copy and its own browser spec.

- **Do not build a sparkline, a chart, or a time-window control.** Story 2.12 owns
  the charting decision for the whole product and this task must not settle it by
  accident. If a row wants to be a link to a security's page, that is Story 2.11's.

## Done when

- `/securities` renders a last close and its change for the tracked universe, from
  real stored bars, with the session date visible
- The daily-timeframe read is measured and the minute table is demonstrably not
  scanned
- The absent case renders honestly and is asserted on the raw body
- Component tests cover present, absent and unchanged; the axe pass and keyboard
  behaviour of the existing table are unbroken
- `pnpm verify` and `pnpm e2e` pass

## Notes

This is the story's demonstration, and taking it here rather than in Story 2.12 is
the same delivery decision Task 2.8.9 took: a run of backend tasks with one
visible change is a run nobody outside the code can see. Whether the same number
belongs on Epic 4's overview is Epic 4's question, not this task's.
