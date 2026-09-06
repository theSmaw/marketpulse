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
`packages/shared` with tests, and — worth stating in the write-up — the frontend bundle is
inlined from `packages/shared`, so it is a thing to measure here rather than be surprised by
at Task 2.5.6. ~~The bundle may move~~ **Task 2.5.1 predicts it does not: 0 bytes, hash
unchanged** (`CALENDAR.md` §4.3), because nothing in the frontend imports this module yet.
**If it moves, the module-load `Intl.DateTimeFormat` is what did it** — see the Work section.

## Work

- **Write it in the home Task 2.5.1 chose** — `packages/shared/src/market-time.ts`,
  confirmed — and export functions, never a configured formatter object. `Intl.DateTimeFormat`
  is expensive to construct and cheap to reuse: measured on this machine, **30.98 µs to
  construct against 2.19 µs to reuse, a 14.2× ratio** over 20,000 iterations. So memoise it —
  but **construct it lazily, inside the function, on first use, never at module load.** That
  is an instruction rather than a preference: a module-load `const FMT = new
Intl.DateTimeFormat(...)` is a call expression, which is exactly `SECTOR_ETFS`'s shape from
  Task 2.3.8, and it will be retained in a frontend bundle that never uses it. Either way the
  formatter is an implementation detail behind a function rather than an export
- **The four operations, and nothing else yet**: instant → market wall-clock parts; market
  date + wall-clock time → instant; instant → market **date** (which is not the same as the
  UTC date and is the one people get wrong); and the UTC offset in effect at an instant,
  because a chart axis and a log line both eventually want to say `EST` or `EDT`
- **Answer the two DST cases explicitly rather than letting the platform answer them**, and
  put the answer in the return type rather than in a comment:
  **Task 2.5.1 measured what the platform does today, and both fail silently** — so this
  is a behaviour to replace rather than one to discover (`CALENDAR.md` §6.3):
  - **The spring-forward gap.** 2026-03-08, 02:30 ET does not exist. Measured, the natural
    two-pass resolution returns `2026-03-08T06:30:00Z`, which formats back as **01:30** — a
    different time from the one asked for, **with no error**. A function taking a market date
    and a wall-clock time must say what it does — throw, or resolve forward
  - **The autumn-fold overlap.** 2026-11-01, 01:30 ET happens **twice**, at `-04` and at
    `-05`. Measured, asking for it returns `2026-11-01T05:30:00Z`, the **first** of the two,
    **chosen with no error and no signal that a choice was made**.
    `migrations/README.md` already records this as the reason a naive `timestamp` column
    means nothing. Same rule: refuse, or take an explicit which-one, and never silently pick
  - **Refusing is provably safe here, and the argument is stronger than this file first
    stated.** ~~No market session ever starts in the gap~~ — **no trading session ever
    begins in, ends in, or contains _either_ transition**, because every US DST transition is
    a Sunday (`CALENDAR.md` §6.3 tabulates all ten across the covered range). So refusing is
    not merely the cheap correct answer; it is an answer no legitimate caller in this
    application can be forced to want. **Note also that no library fixes this** — luxon and
    `@date-fns/tz` resolve the gap and the fold with the same silent defaults, which is part
    of why Task 2.5.1 added no dependency
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
- **Three mechanical findings from Task 2.5.1's probes, so they are not re-discovered.**
  Use **`hour12: false` or `hourCycle: "h23"`, never `"h24"`** — ET midnight formats as `00`
  under the first two and **`24:00`** under the third, which is a plausible-looking choice
  that yields an hour outside 0–23. Getting a market date + wall-clock time back to an instant
  needs a **two-pass offset resolution** (resolve with the offset at a first guess, then
  re-resolve if the offset at the resulting instant differs), which is what the gap and the
  fold above are the failure cases of. And **`Intl` does not return the offset in the shape
  this file's own example asserts**: `timeZoneName: "longOffset"` gives `GMT-05:00` and
  `"shortOffset"` gives `GMT-5`, neither of which is `-05:00` — so decide the module's own
  offset representation and normalise to it, rather than passing `Intl`'s string through
- **Test the parts rather than a rendered string.** A test asserting `"09:30:00"` is
  asserting a formatter; a test asserting `{ hour: 9, minute: 30, offset: "-04:00" }` is
  asserting the conversion. Task 2.5.5 owns the formatter
- **Take the bundle measurement against Task 2.5.1's stated prediction**: build before and
  after, and record modules, JavaScript bytes and hash. **The prediction is 0 bytes and an
  unchanged hash**, and an unchanged bundle is therefore _evidence the lazy construction
  worked_ rather than a null result. A bundle that moved means the formatter is constructed at
  module load — Task 2.3.8's finding — and the fix is one line

## Done when

- The four operations exist, in `packages/shared`, with tests in the **fast** suite — no
  database, no socket, no build
- Both DST transitions are asserted from the named-date list (`CALENDAR.md` §7.1), in both
  directions, including the day either side — note the transition days themselves are where
  the **gap and fold** are tested, because they carry no session; the **sessions** either side
  are Task 2.5.4's cases 9–11
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
