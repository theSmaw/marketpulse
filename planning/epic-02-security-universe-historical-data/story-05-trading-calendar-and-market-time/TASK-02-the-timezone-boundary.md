# Task 2.5.2 — The one conversion boundary: UTC in, market time out

**Status:** Not started
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Task 2.5.1

## Objective

Write the module that converts between a UTC instant and market-local time, make it the
**only** place in the workspace that does so, and prove the DST cases rather than reasoning
about them.

This task deliberately does not know what a holiday is. It knows one thing: given an
instant, what is the wall-clock time in `America/New_York`, and given a market date and a
wall-clock time, what instant is that. Sessions are Task 2.5.4's.

## What the user can see when this lands

**Nothing.** No route, no endpoint, no pixel. What exists afterwards is a module in
`packages/shared` with tests, and — worth stating in the write-up — the frontend bundle may
move, because `packages/shared` is inlined into it. Measure it here rather than being
surprised by it at Task 2.5.6.

## Work

- **Write it in the home Task 2.5.1 chose** — expected `packages/shared/src/market-time.ts`
  — and export functions, never a configured formatter object. `Intl.DateTimeFormat` is
  expensive to construct and cheap to reuse, so if one is memoised inside the module, that
  is an implementation detail behind a function rather than an export
- **The four operations, and nothing else yet**: instant → market wall-clock parts; market
  date + wall-clock time → instant; instant → market **date** (which is not the same as the
  UTC date and is the one people get wrong); and the UTC offset in effect at an instant,
  because a chart axis and a log line both eventually want to say `EST` or `EDT`
- **Answer the two DST cases explicitly rather than letting the platform answer them**, and
  put the answer in the return type rather than in a comment:
  - **The spring-forward gap.** 2026-03-08, 02:30 ET does not exist. A function taking a
    market date and a wall-clock time must say what it does — throw, or resolve forward —
    and the honest observation is that **no market session ever starts in the gap**, so the
    cheap correct answer is to refuse and let the caller not ask
  - **The autumn-fold overlap.** 2026-11-01, 01:30 ET happens **twice**, at `-04` and at
    `-05`. `migrations/README.md` already records this as the reason a naive `timestamp`
    column means nothing. Same rule: refuse, or take an explicit which-one, and never
    silently pick
- **Establish criterion 2 as a property rather than an aspiration.** "Nothing outside this
  module converts between UTC and market time" is exactly the shape of Task 2.4.1's seam and
  Task 1.12.2's "one file calls `fetch`" — both of which are held by a grep and a written
  rule, not by the compiler. So: write the rule beside the export list, and **verify it with
  a grep in this task** rather than asserting it
- **There is one existing thing that grep will find and it is a real finding, not a false
  positive.** `apps/frontend/src/components/BackendIndicator/BackendIndicator.tsx` formats
  its "last confirmed" timestamp with `getHours()`/`getMinutes()`/`getSeconds()` — the
  **viewer's local timezone**, unlabelled. Task 1.12.4 chose the hand-rolled formatter over
  `toLocaleTimeString` for a good reason (a locale-dependent string changes width, which
  `tabular-nums` cannot fix) and that reason still stands. What has changed is the context:
  from Task 2.5.5 there is a clock labelled **ET** in the same strip, and an unlabelled local
  time beside it is ambiguous in a way it was not before. **Decide it here and record which**
  — leave it local and label it, or move it to market time — and note that "when this client
  last got an answer" is genuinely a fact about the client rather than about the market, so
  local is defensible. What is not defensible is unlabelled and adjacent
- **Test the parts rather than a rendered string.** A test asserting `"09:30:00"` is
  asserting a formatter; a test asserting `{ hour: 9, minute: 30, offset: "-04:00" }` is
  asserting the conversion. Task 2.5.5 owns the formatter
- **Take the bundle measurement**: build before and after, and record modules, JavaScript
  bytes and hash. If a memoised `Intl.DateTimeFormat` is constructed at module load, that is
  a call expression and Task 2.3.8's finding applies — it will not be tree-shaken out of a
  build that does not use it

## Done when

- The four operations exist, in `packages/shared`, with tests in the **fast** suite — no
  database, no socket, no build
- Both DST transitions are asserted from the named-date list, in both directions, including
  the day either side
- The gap and the fold each have a stated, tested behaviour that is not "whatever the
  platform did"
- A grep proves the conversion happens in one module, and the one pre-existing local-time
  formatter is either moved or labelled with the decision written down
- `pnpm verify` passes with no database running

## Notes

The trap here is `new Date(...)` arithmetic. Adding 24 hours to an instant crosses a DST
boundary twice a year and produces a time one hour off, silently, for exactly the two days
of the year nobody tests. Every "next day" in this module is a **calendar** operation on the
market date, never an arithmetic one on the instant.
