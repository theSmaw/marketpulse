# Task 3.7.3 — Every writer stamps the tape, and no reader consults a constant

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.2

## Objective

Criterion 1: **a bar stored from the socket records its tape, and a bar stored
by the backfill records its own — both readable without consulting a
constant.**

Today `recordSeries` writes six fields per bar and the tape lives one row per
series in the ledger. After this task the bar carries its own, taken from the
series' provenance rather than from anywhere else, and `SOURCE_OF_NOTHING` —
the `alpaca`/`sip` constant the read path falls back to — stops being reachable
from a row that exists.

## What the user can see when this lands

**Nothing.** The store holds the same bars with one more true fact on each.

## What makes this a task and not a line

- **There is more than one writer.** The backfill (`backfill.ts`) writes SIP
  series; `backfill.database.test.ts` drives the shipped `runBackfill` with the
  **fixture** provider into a real database, so a `synthetic` bar is a thing
  this repository stores on purpose; and Story 3.8 will write `iex` from the
  socket. **The value comes from the series' `provenance.sources`**, never
  from the provider's name and never from a default, which is the rule `0007`
  already set for the ledger.
- **`recordSeries`'s `on conflict` clause is about to mean something.** The
  unique key is `(security_id, timeframe, observed_at)` and does not include
  the tape, so a bar re-stored from a different tape is a **conflict**, and
  what happens then is Story 3.8's decision (its three shapes). **This task
  keeps today's behaviour** — the existing row wins — and writes that down as
  the thing 3.8 replaces, rather than deciding it in passing.
- **`toBar` and every read of a row** must carry the tape out with the bar,
  or the column is write-only and criterion 1's _readable_ is false. Decide
  whether `Bar` itself grows a field or the read path returns the tape beside
  it — `Bar` is shared by the wire and the chart, and a field on it reaches
  every `WireObservation` (Task 3.6.4's constraint 4 is the precedent for
  refusing that).

## Work

- `recordSeries` writes the tape per bar from the series' source
- The read of a row (`toBar` or a sibling) exposes it, in the shape decided
  above, and the `SOURCE_OF_NOTHING` fallback is confined to the genuinely
  empty case with a comment saying so
- `market-bars.database.test.ts`: a `sip` series stored by the backfill path,
  a `synthetic` series stored by the fixture path, and a hand-inserted `iex`
  row, each read back with its own tape; a re-store of the same instant from
  another tape leaves the existing row (today's behaviour, named as 3.8's to
  change)
- A `pnpm break` entry that writes a constant instead of the series' source
  and proves the database test goes red
- `TAPE.md` §on writers: who writes, what each stamps, and the conflict rule
  as it stands today

## Done when

1. Criterion 1 holds for the backfill's bars and for a socket-shaped bar, proved
   in `pnpm test:database`
2. The conflict behaviour is unchanged and recorded as Story 3.8's decision
3. `pnpm verify` and `pnpm test:database` pass
