# Task 3.7.4 — What replaces the ledger's refusal of a second source

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.3

## Objective

`recordSeries` **refuses** a series whose source disagrees with the ledger row
it would extend, and refuses a series that names two sources for one window —
`ForeignSourceError`, whose own message says _if a second feed now writes
here, this is the trigger `0004_market_bars.sql` records for a per-bar feed
column_. The trigger has fired. **Decide what the ledger row means once the
bars carry their own tape, and replace the refusal with that**, rather than
leaving Story 3.8 to weaken it in passing.

## What the user can see when this lands

**Nothing.** The store accepts something it used to refuse, and nothing yet
sends it.

## The decision, and the candidates

`bar_coverage` holds one row per `(security, timeframe)`: a contiguous window,
a bar count, and since `0007` a single `provider`/`feed`. Once
`market_bars.feed` exists, that single pair is either:

1. **Redundant, and withdrawn from the read path.** The ledger keeps the
   window and the count — coverage — and provenance comes from the bars.
   The columns stay (contract is a second deploy; `README.md` §"expand, then
   contract") but nothing reads them, and the refusal becomes a check that
   the _window_ is extended contiguously rather than that the _tape_ matches.
2. **The dominant tape**, kept honest by a rule: the ledger names the tape
   holding most of the window, and a read that finds a second tape in the bars
   overrides it. Two sources of truth that agree most of the time — the shape
   `CLAUDE.md`'s _one fact has one home_ exists to refuse.
3. **One ledger row per tape per series**, the window-grain candidate from
   3.7.1 arriving through the write path instead of the schema. Only if 3.7.1
   chose it.

**Candidate 1 is the recommendation and the task should say if it disagrees.**
What must survive whichever is chosen: `MissingCoverageError` — a store whose
ledger disagrees with its bars — still fires for a window with no ledger row,
because the ledger is still what makes _we have nothing here_ sayable; and
`ReplayedSeriesError` is untouched, because a replay's bars are real and its
instants are not (ADR 0030 decision 7).

> **AMENDED 2026-09-22 by Task 3.7.3 — two things the row that shipped
> forces on candidate 1, and both narrow it rather than reopen it.**
>
> **The ledger keeps its `provider` as a READ, and withdraws only its
> `feed`.** The row carries the tape and nothing else — ADR 0034's reversal
> trigger is _the first per-bar field beyond the tape_, so a per-bar
> `provider` is not on the table — and a `BarSource` needs a provider as well
> as a feed. The only place a stretch's provider can come from without a
> constant is the ledger row, which is fine because a series has one
> provider even when it has two tapes (the plan's `sip` and `iex` are both
> Alpaca; the fixture's `synthetic` is never stitched onto either). So the
> refusal that stands is narrower than _contiguity only_: **a series naming a
> different `provider` from the ledger row is still refused**, a series
> naming a different `feed` is what this task starts accepting, and `TAPE.md`
> §on the ledger says the columns mean _the window, the count, the provider_
> and that `feed` is read by nothing. Task 3.7.5 takes the provider per
> stretch from here.
>
> **An OVERLAPPING series from another tape is refused until Story 3.8, on
> purpose.** Today an overlapping series is the idempotent re-run
> (`recordSeries` checks for a gap, never for an overlap) and
> `ForeignSourceError` is the only thing standing between a second tape and
> the bar-level conflict. 3.7.3 kept that conflict's rule as it was and
> asserted it — _the existing row's tape wins, and different numbers move
> the numbers and leave the tape_ — as **Story 3.8's decision**, with the
> `never` update type on `MarketBarsTable.feed` making it a compile-time
> rule. Dropping the whole refusal here would make that branch reachable
> from the shipped writer one story early: an IEX series re-stored over SIP
> bars would move the numbers under a `sip` label. So the accepted case is a
> **contiguous extension** from another tape — the window grows, the count
> grows, `readBars` answers both tapes — and an extension that overlaps the
> held window from a different tape keeps a refusal (a narrowed
> `ForeignSourceError`, or a sibling named for overlap) whose message says
> it is Story 3.8's to lift. Add the test: _an IEX series overlapping SIP
> bars is refused, and the refused write leaves every row's tape as it was_.
>
> **And the error's own message is false since 3.7.3.** `ForeignSourceError`
> says _`market_bars` stores no per-bar provenance, so the two would be
> indistinguishable afterwards_ — the column exists and the read
> distinguishes them. Whatever survives of the class gets a message written
> against the tree as it is.

## Work

- Replace `ForeignSourceError`'s two refusals with the chosen rule; keep the
  error class only if some case still needs it, and delete it otherwise
- The ledger row's write: what `provider`/`feed` are set to on a second-tape
  extension under the chosen candidate, and a comment on `BarCoverageTable`
  saying what the columns now mean
- `market-bars.database.test.ts`: a SIP window extended by an IEX series is
  **accepted**, the window and count update, the bars carry both tapes (read
  back through `readBars`, whose `StoredBar.feed` is the per-row tape since
  3.7.3); a non-contiguous extension is still refused by whatever rule
  replaces it; an extension naming a different **provider** is still refused;
  an **overlapping** series from another tape is still refused and touches no
  row (the amendment above)
- The `on conflict` clause on `bar_coverage` (`market-bars.ts` line ~45's
  comment) re-read against the new meaning
- `TAPE.md` §on the ledger: what a row claims now, and what it no longer claims

## Done when

1. A series from a second tape extends an existing window without a throw, and
   the refusal that stands is the one about contiguity
2. The ledger's columns have one stated meaning, in `schema.ts` and `TAPE.md`
3. `pnpm test:database` passes; `pnpm verify` passes
