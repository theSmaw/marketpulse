# Task 3.7.4 — What replaces the ledger's refusal of a second source

**Status:** **Complete — 2026-09-22.** Candidate 1, narrowed as the 3.7.3 amendment asked: the ledger keeps its window, count and **provider**, and withdraws its `feed`. `ForeignSourceError` survives with three named reasons — `stitched`, `provider`, `overlap` — and the refusal of a second **tape** is gone: a SIP window extended by an IEX session is accepted and reads back as both tapes in order. Five tests, two breaks red and restored, `pnpm test:database` 184/184, `pnpm verify` green.
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

---

## What was done — 2026-09-22

### 1. The decision: candidate 1, with `provider` kept as a read

The ledger row now claims **the window, the count and the provider**, and
its `feed` column claims only the tape the window was opened with. That is
candidate 1 narrowed by the thing 3.7.3's row forces: `market_bars` carries
the tape and nothing else (ADR 0034's reversal trigger is the first per-bar
field beyond it), and a `BarSource` needs a provider, so the ledger is the
only place a window's provider can be written without a constant — and a
window has one provider even with two tapes, since the plan's `sip` and
`iex` are both Alpaca. `TAPE.md` §7 carries the four-column table: what each
claims, who reads it, what enforces it.

Candidates 2 and 3 were not taken, for the reasons the task file gave: a
dominant tape is two sources of truth that agree most of the time, and a row
per tape is 3.7.1's window-grain candidate, which 3.7.1 did not choose.

### 2. The refusals that stand, and the one that went

`ForeignSourceError` survives, because two of its cases still need it and a
third was added — but it now carries a **`reason`** discriminant so a caller
and a test can tell them apart, and each message is written against the tree
as it is rather than saying _`market_bars` stores no per-bar provenance_:

- **`stitched`** — a series naming two sources is still refused as one
  write. A source says how many bars it has but not which, so the honest
  store of a stitch is each part against the window it covers. Unchanged.
- **`provider`** — a series naming a different provider from the ledger
  row's is refused before a row is touched. New as a named case; it was half
  of the old refusal.
- **`overlap`** — a series whose window overlaps the held one is refused if
  the stored bars **in the overlap** carry another tape. The check is one
  indexed `select distinct feed` over the overlapping range, read from the
  rows and never from the ledger's `feed`. It is the guard in front of the
  per-row conflict rule 3.7.3 kept as Story 3.8's decision: without it an
  IEX series re-stored over SIP bars would give every row IEX's numbers
  under a `sip` label. A same-tape overlap is what it always was.

**What went:** the refusal of a second tape. A SIP window extended by an IEX
session from the same provider is accepted — the window grows to the union,
the count to the sum, and `readBars` answers `sip, sip, sip, iex, iex`.

The `held` read in `recordSeries` no longer selects the ledger's `feed`; the
provider check reads `provider` alone; `extendCoverage` still writes `feed`
on insert (required, so the default stays unreachable; never blank) and
still leaves both columns out of the `on conflict` set — the comment there
was re-read against the new meaning, as the task asked, and says _withdrawn_
rather than _does not change_.

### 3. The ledger's columns have one stated meaning, in three places

`schema.ts`'s `BarCoverageTable` comment is rewritten: `provider` is a read
and a rule; `feed` is withdrawn from every decision, holds the opening tape,
is read by `readSeries` only until 3.7.5, and stays because a contract is a
second deploy. `BarCoverage.source`'s domain comment says the same in the
repository's words, and `toStoredSeries`'s comment names itself as the
column's last reader. `serve-series.ts`'s header — a live claim that
`recordSeries` refuses a stitched tail because the store holds one source
per window — gained a dated amendment: still refused, for the `stitched`
reason, and what keeps the tail out is now that it overlaps nothing and is
Story 3.8's to store.

### 4. Tests — five, replacing one

_Refuses a second source for a series it already holds_ became five, all in
`market-bars.database.test.ts`:

- **accepts a second tape extending a held window contiguously** — the
  trigger's payoff: `inserted: 2`, window = union, count = 5, provider
  `alpaca`, tapes `sip ×3, iex ×2` in order through `readBars`, and the
  ledger's `feed` still `sip` — asserted as _the opening tape_, not the
  truth about the window;
- **still refuses a second tape that leaves a session unfetched** —
  `CoverageGapError`, the refusal that stands is contiguity;
- **refuses a second provider, writing nothing** — reason `provider`, held
  `alpaca`; the bars' fingerprint, the ledger's source and its count
  unchanged;
- **refuses a second tape OVERLAPPING stored bars, and leaves every row's
  tape as it was** — reason `overlap`, `heldTapes: ["sip"]`; the fingerprint
  unchanged, every tape `sip`, every number the original;
- **still accepts a same-tape overlap** — the re-run reports `unchanged: 3`
  and the nudged re-run `corrected: 3`.

The stitched test now also asserts `reason: { kind: "stitched" }`.

### 5. Two breaks, both red

| Break                                | What it changes                         | Test that went red                              |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------- |
| `a-second-tape-overwrites-the-first` | the overlap guard's `> 0` becomes `< 0` | _refuses a second tape OVERLAPPING stored bars_ |
| `a-second-provider-is-relabelled`    | the provider check gains `&& false`     | _refuses a second provider_                     |

Both need a database and live outside `verify`.

### 6. Gates

`tsc -b` clean; `pnpm test:database` **184/184**; both breaks red and
restored; `pnpm verify` green; `pnpm links` 0 broken. No browser spec is in
reach: nothing on the wire changed and no shipped writer sends a second tape
yet.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** Every stored price now says which tape it came
from (the previous task). This task makes the store **willing to hold two
tapes for one security** — the thing it used to refuse outright, and the
thing the next story needs before a page reloaded during the trading day can
show today's prices from the live feed on top of yesterday's from the
consolidated tape.

**What was built.** The store's ledger — a one-line summary per security of
what we hold — used to insist that everything for a security came from one
tape, and rejected anything else. That was the right rule when the prices
themselves could not say where they came from. Now that each price can, the
rule is replaced with three narrower ones:

- **Two tapes, one supplier: accepted.** Yesterday's consolidated-tape prices
  followed by today's from the IEX exchange are stored side by side, and
  reading them back gives each price with its own label.
- **A different supplier: still refused.** The ledger is the one place that
  records who supplied a security's history, and it records one name. This
  costs nothing today, because our two tapes both come from the same
  supplier.
- **Overwriting one tape's prices with another's for the same minutes: still
  refused, deliberately.** What should happen when the live feed and the
  consolidated tape both have a price for 10:31 is a real product decision —
  the next story's — and a rule that quietly kept one tape's label on the
  other tape's numbers would have made it in passing. So the store refuses
  that write, says exactly why in the error, and leaves the stored prices
  untouched.

**Why these decisions.** Each one follows from a fact rather than a
preference: the price row records its tape but not its supplier, so the
supplier has to live in the ledger; the database key for a price does not
include the tape, so two tapes on one minute collide, and a collision is a
decision rather than a default. We wrote the decision down as the next
story's, and put a test in front of it so nobody takes it by accident.

**What we checked rather than trusted.** Five automated tests against a real
database: the accepted case reads back both tapes in the right order; the
two refusals leave the database byte-for-byte as it was; the ordinary nightly
re-run and correction behave exactly as before. And we deliberately broke
each new rule in the code to prove its test goes red, then restored the code
automatically.

**What a user can see today: nothing.** The store accepts something it used
to refuse, and nothing yet sends it. What this unlocks: the next task makes
a chart's source note able to say, from real stored data, _the first 390
bars are the consolidated tape and the last 12 are IEX_ — and the story
after that is the first one a user can feel, a page reloaded mid-session
that still shows today.
