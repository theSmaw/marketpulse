# Story 3.7 — The Tape on the Bar

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.1
**Epic scope covered:** a tape column on `market_bars` — added to this epic's scope on 2026-09-15 from Epic 2's close

## Description

**A defect in the store rather than in the wording, and the repair is a
migration.**

`market_bars` has no column saying which tape a bar came from. Provenance lives
**one row per `(security, timeframe)`** in `bar_coverage`, which carries a single
`feed`. Everything stored today is consolidated SIP, so one row per pair is both
sufficient and honest, and `0007_bar_coverage_provenance.sql` took that shape
deliberately — ~1,036 ledger rows rather than forty-eight million bar rows,
after the cheap alternative was **measured false**.

**The day this product stores an IEX bar, it stops being either.** That single
row describes the whole series as SIP; `mergeSeriesProvenance` is never called
because there is only ever one provenance record to merge; and the series reports
one feed with complete confidence and is **wrong**. The two-feed sentence
Story 3.9 ships is true only because that stitch happens **at read time** and
touches nothing stored.

So this is a schema change **before the first stored live bar**, and its deadline
is Story 3.8 rather than any date. The roadmap's Epic 3 scope had no data-layer
item at all until Epic 2's close found this.

## What the user can see when this story lands

**Nothing.** A column, and a read path that can distinguish two tapes inside one
stored window.

**The payoff is Story 3.8**, which is the next story, and through it Story 3.10
and every cold load of a page during a session.

What the user still cannot do: anything they could not do before it. The store
holds exactly what it held.

## Why it sits here in the sequence

**As late as it can be and as early as it must be.** It touches the schema and
nothing Stories 3.3–3.6 and 3.9 touch, so it is the one place in this epic where
parallel work is genuinely available — and it blocks Story 3.8 completely, so it
cannot slip past it.

Taking it _after_ Story 3.9 also means it is designed against a ledger that has
actually been produced once, rather than against a prediction of one.

## Scope

- **The migration.** Read the rules before writing it: **forward-only, no
  `down`, a four-digit sequence rather than a timestamp, and immutable once
  applied** — the checksum hashes the whole file including comments, so editing
  one after a deploy makes the next deploy refuse. Two branches adding `0011_*`
  is a merge conflict a human resolves; two timestamps merge cleanly and then
  apply in an order neither author tested.
- **The column's shape, and the decision under it.** A per-bar tape column on a
  forty-eight-million-row table is a real cost, and `PROVIDER.md` §2.3 already
  rejected per-bar provenance as _never wrong and not affordable_. What is
  needed is narrower than that rejection: **which of two tapes**, on rows this
  product writes from a socket, defaulting to the tape everything already stored
  came from. Candidates — a nullable column meaning _see the ledger_, a
  not-null column with a backfilled default, or a second ledger grain that keys
  on a window rather than on a pair — and the choice is a measurement against
  the real table rather than an argument.
- **Backfilling the existing rows**, or deliberately not, with the cost of each
  measured on the real row count rather than estimated. Note that an additive
  change is what makes the deploy order survivable at all: **the deploy migrates
  before either half of the code rolls**, so the schema is briefly ahead of the
  code, and a destructive change is two deploys — expand then contract — enforced
  by nothing.
- **The read path**, which is where the column earns its keep: a stored window
  spanning two tapes must produce **two** `BarSource` records and go through
  `mergeSeriesProvenance` rather than around it. That function is the only route
  to a multi-source record and the adjustment check fires whether or not anybody
  read the rule — which is the difference between a correction to a downstream
  file and a correction the type system delivers.
- **`recordSeries`'s existing refusal, re-examined.** It currently **refuses** a
  series whose source disagrees with the ledger row it would extend, or which
  names two sources for one window. That refusal is correct today and is
  precisely what Story 3.8 has to write through, so this story decides what
  replaces it rather than leaving 3.9 to weaken it in passing.
- **`pnpm test:database`**, which is what holds the interface and the schema
  together: a column added to `schema.ts` and not to the migration typechecks,
  lints and builds, and is a red database test. It is **not** in `pnpm verify`
  and not in `pnpm test`, so it has to be run on purpose.

## Out of scope, and who owns it

- Writing a live bar — Story 3.8
- Anything the user sees — Stories 3.8 and 3.10
- Corporate actions, adjustment on read, and the split cliff — still Epic 13's
  and still out of V1's read path, which serves raw and says so

## Open decisions — settle with the user

1. **Whether existing rows are backfilled.** Forty-eight million rows is a real
   operation on a managed instance with a real bill attached, and _everything
   before this migration is SIP_ is a fact a nullable column can express for
   free. The argument against free is that it makes every reader carry the rule.

## Acceptance criteria

1. A bar stored from the socket records its tape, and a bar stored by the
   backfill records its own — both readable without consulting a constant
2. A stored window spanning two tapes produces two sources, in contribution
   order, through `mergeSeriesProvenance`
3. `schema.ts` and the migration agree, proved by `pnpm test:database` rather
   than by the compiler alone
4. The migration applies cleanly to a store with rows in it, and the timing is
   measured against the real table rather than against an empty one
5. No applied migration was edited, and the deploy's migrate step is still
   additive-only
6. `pnpm verify` passes, and `pnpm test:database` passes against a real server

## What this story hands forward

A store that can tell two tapes apart, which is the precondition for Story 3.8
writing to it at all.

---

## Re-numbered 2026-09-21: this story was 3.8 and is now 3.7

**Nothing about this story changed. Its position did.**

The epic re-ordered so that the store precedes the chart (Story 3.5 shipped a
latest-only current-market-state, so the chart has no session to draw without
the store). This story's deadline was never a number — it is **before the first
stored live bar** — and that bar is now written by **Story 3.8**, immediately
after this one.

**So the deadline is tighter in sequence and identical in substance**, and the
argument for placing it here is if anything stronger: it is still the one place
in this epic where parallel work is genuinely available, because it touches the
schema and nothing the screen stories touch.
