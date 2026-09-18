# Task 3.2.4 — The pure mapping, and the revision that is a replacement rather than a duplicate

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.3

## Objective

Map a vendor frame to the `Bar` and `BarSource` that already exist — **pure
functions only, no socket, no transport** — including `u`, which is the case
this product decided to carry and is the one a naive client gets wrong.

## What the user can see when this lands

**Nothing.**

## What is already decided and must not be re-taken

- **Split pure mapping from transport.** `alpaca-mapping.ts` /
  `alpaca-provider.ts` already established the arrangement, and it is the reason
  the historical client's mapping is testable at all.
- **A streamed bar is the same `Bar` a fetched bar is** — six fields,
  `startsAt` marking the interval's **start**, `number` prices. Acceptance
  criterion 3 requires it checked against a **recorded frame**, not a
  hand-written object.
- **`t` marks the START of the interval on the stream** — [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §7.3 confirmed it with an HTTP control, agreeing with `ALPACA.md` §5.3.
  `Bar.startsAt` maps from `t` **with no shift**. A stream that disagreed would
  put every live bar a minute out, silently, on every surface at once.
- **`feed` is `iex` and nothing in the mapping may produce `sip`** —
  acceptance criterion 4. The free plan refuses a SIP socket, so **a code path
  that could claim one is a code path that lies.** Make it structurally
  impossible rather than merely absent.
- **The product subscribes `updatedBars`** — §7.11, decided by the owner on
  2026-09-17, and the trigger that could have reversed it was **evaluated and
  not fired** on 2026-09-17 (§14.1). It stands.

## Work

- **Map `b` to `Bar` + `BarSource`**, against a fixture rather than a literal.
- **Map `u` to the same shape, and make the REPLACEMENT semantics explicit in
  the type rather than in a comment.** The handed-forward note is blunt: a client
  that maps `u` like `b` and appends produces **two bars for one minute**; one
  that ignores `u` is **quietly wrong for ever**. Neither is what was decided.
  The mapping layer should make the third option the easy one — for example by
  the mapped result carrying whether it supersedes a `(symbol, minute)` rather
  than leaving every caller to know.
- **Do not build a store to hold the replacement.** Where the superseding
  actually happens is Story 3.5's current-state model; this task's job is that
  the information survives the mapping. Building the store here is the
  scaffolding `CLAUDE.md` forbids.
- **Carry the measured numbers as test cases, not as prose**: a revision arrives
  **29.1–30.1 s** after the bar it corrects (§14.1, n=68), **35.3%** change the
  close, and **none change nothing**.
- **Reject rather than coerce.** `fast-json-stringify`'s lesson transfers: a
  `null` under a numeric field reaches the wire as `0`, _a plausible price_. A
  frame that cannot be mapped is an outcome value, never a silently defaulted
  `Bar`.
- **Zero-volume bars are real** (§7.2) and are not an error.

## Done when

- `b` and `u` both map, from **fixtures**, with `startsAt` taking `t` unshifted
- A test proves a streamed bar and a fetched bar of the same minute produce
  **the same `Bar`**
- `sip` is unreachable from the stream mapping — by construction, and a test
  says so
- The `u` result expresses _supersedes_ rather than _another bar_, and a test
  pairs a `b` and a `u` for one `(symbol, minute)`
- An unmappable frame is a value, not a throw and not a defaulted `Bar`
- No module in this task opens a socket or reads the wall clock
- `pnpm verify` passes

## Notes

**The `u` case is the one place in this story where doing nothing is actively
wrong**, which is rarer than it sounds — most omissions produce an absence
somebody notices. This one produces a number that looks right and is stale by a
few cents, for ever, with no way to know which. That is the exact failure Epic
2's whole provenance surface exists to prevent.
