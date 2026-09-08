# Task 2.8.4 — The write path, and the ledger that answers "what do I have"

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.3

## Objective

Two things, kept in one task because they are one transaction:

1. **The write path** — `apps/backend/src/market-bars.ts`, which turns a `BarSeries` into rows
   and back, batched, idempotent, and never `UPDATE`ing a bar in the ordinary case.
2. **The ledger** — a second table recording what has been ingested per symbol and timeframe,
   so the system can answer "what do I have" **without scanning ten million rows**. That is
   acceptance criterion 5, and its second half is the hard one: the statement must still be
   correct after a partial failure.

## What the user can see when this lands

**Nothing.** There is still no command that runs this — Task 2.8.6 is the command. What exists
after this task is a module with tests and a table with rows a test put there.

## The module, and the seam it has to honour

`apps/backend/src/securities.ts` set the shape at Task 2.4.1 and this is the second instance of
it: **build its own `Kysely` instance, do not export it, export functions returning domain
objects.** That is Epic 13's temporal seam, and this is the first table where it does real work
— `securities` has no `observed_at`, so nothing it does would ever be filtered.

**So the guarantee this module is under is not the same one `securities.ts` is under, and it
should say so:** every query here reads a column Epic 13's plugin will rewrite, and the plugin
does not exist. `DATA-LAYER.md` records that the plugin can rewrite a builder's AST and can
only **refuse** raw `` sql`…` `` — so a raw query in this module is a hole in a guarantee that
has not been built yet, and the rule is to write none.

**One function per domain type, beside the query, never a generic mapper** — `schema.ts`'s rule,
and this is where it earns its keep. `pg` hands a `numeric` and a `bigint` to JavaScript as
**`string`**; `Bar` has `number` prices and a `number` volume. The mapping is a parse, and a
generic mapper is exactly where that decision gets skipped and a price silently becomes
`"189.234500"` on a chart axis.

## Idempotence, which is criterion 2

**`insert ... on conflict (security_id, timeframe, observed_at) do nothing`**, and the `do
nothing` is the decision rather than a default.

`load-universe.ts` upserts with a row comparison, because the universe **converges on a file**.
A bar does not converge on anything: it is a record of what was observed, and the ordinary case
is that a bar we already hold is the same bar. So:

- **`do nothing` in the ordinary case**, which makes a re-run cost the write of nothing and
  makes criterion 2 a property rather than a claim.
- **A correction overwrites**, per open decision 1's stated honest limit: V1 stores one row per
  bar, `recorded_at` moves, and **Epic 13 replays a bar as currently known rather than as known
  at the time**. That is a real gap in the replay guarantee and it is recorded rather than
  papered over. **The reversal trigger is the first observed correction** — not a story number —
  and nobody has seen one.
- **Which means this task should be able to SEE one.** A `do nothing` that silently discards a
  changed bar is how the first correction goes unnoticed forever. Prefer a form that can report
  "we already had this bar and it differed" — `do update ... where` on the OHLCV columns being
  distinct, counting the rows it touches — so the trigger above can actually fire. That is
  `load-universe.ts`'s `is distinct from` idiom applied for a different reason: there it keeps
  `updated_at` honest, here it makes an undetectable event detectable.

**Batching.** Postgres's bind-parameter ceiling is 65,535 and this row is 9 written columns, so
the chunk is ~7,281 rows. `load-universe.ts` chunks at 5,461 for 12 columns and the arithmetic
belongs in a comment beside the constant, as it does there. A regular session for one security
is 390 rows, so a per-session write is one statement — which is the shape Task 2.8.6 uses — and
the chunking exists for the daily backfill, where ~2,500 sessions × N securities is not.

**The whole write of one series is one transaction, with its ledger update inside it.** That is
the reason these two things are one task: a bar written without its ledger row is a system that
under-reports what it holds and re-fetches it forever; a ledger row written without its bars is
one that over-reports and leaves a permanent hole. Both are silent.

## The ledger

A second table — `bar_coverage`, or whatever Task 2.8.1's document settled — keyed on
`(security_id, timeframe)`, recording what has been ingested. It exists because criterion 5 says
the system can state what it holds **and a `select min/max/count` over ten million rows is not
a statement, it is a scan**.

What a row has to carry, and each field is a decision:

- **The covered range**, as two instants. Note this is `SeriesCoverage`'s own distinction
  arriving in the database: what was **requested** and what is **covered** are different, and
  Task 2.7.5 measured that the vendor clamps the second. **The ledger stores `covered`**, and
  storing `requested` instead is the bug that leaves a permanent 16-minute hole on every
  catch-up.
- **A resume point**, which is `covered.end` and never `requested.end`, for the same reason.
  Story 2.7's amendment states it as a design constraint rather than a courtesy.
- **A bar count**, so "how much do I have" is a read rather than a `count(*)`.
- **When the statement was last true**, which is a `recorded_at` and not an `observed_at` —
  this is a fact about us rather than about the market, which is the same reading `securities`
  takes and the reason that table has no `observed_at` either.
- **Deliberately NOT a "complete" flag.** Completeness is Task 2.8.7's and it is a
  computation over the calendar, not a boolean somebody sets. A flag here would be a second
  source of truth that can disagree with the bars, which is the shape `migrations/README.md`
  §5 warns about with `deleted_at`.

**A gap in coverage is a real possibility and the schema has to decide about it.** One row per
`(security_id, timeframe)` can express one contiguous range; a backfill interrupted in the
middle of a symbol's history leaves two. Two options:

- **One row, one range, and the backfill only ever extends it from one end.** Simpler, and it
  makes resumability a property of the walk order rather than of the schema. Recommended, and
  it makes Task 2.8.6's walk direction a **decision** rather than an implementation detail.
- **Many rows, many ranges, merged on write.** More honest and more machinery, and the merge is
  the kind of code that is wrong in a way tests written by its author do not catch.

Take the first and write down what it costs: **the walk must be monotonic**, and a backfill
that jumps around leaves the ledger claiming a range it does not hold.

## Work

- `apps/backend/src/market-bars.ts` — its own `Kysely` instance, unexported; `insertBars`, the
  row→`Bar` parse beside it, and the ledger read/write
- `apps/backend/migrations/0005_bar_coverage.sql`, with the one-range decision in a comment
- `schema.ts` gains the second table; `migrations/README.md`'s lists updated if anything moved
- `market-bars.database.test.ts`: writing the same series twice writes nothing the second time,
  asserted on **row counts and a checksum of the table** rather than on the function's own
  report — Task 2.3.8's rule that idempotence is asserted on the data
- A changed bar is detected and reported, so open decision 1's reversal trigger can fire
- The transaction asserted: a ledger update that fails rolls the bars back with it, and the
  reverse — produced with a deliberate constraint violation, not reasoned about
- Deliberate breaks, each seen to fail and reverted: the ledger written outside the transaction,
  the resume point taken from `requested.end`, and a chunk boundary that drops a row

## Done when

- Writing a series twice leaves the table byte-identical, proved by count and checksum
- The ledger's statement matches a `select min/max/count` over the bars for every symbol in the
  test fixture — the expensive query used **once**, as the control for the cheap one
- An interrupted write leaves neither bars without a ledger row nor a ledger row without bars
- Nothing in this module issues raw SQL, so Epic 13's plugin has an AST to rewrite
- `pnpm verify` is exit 0 with no database; `pnpm test:database` covers everything above

## Notes

The two silent failures this task exists to prevent are worth naming together, because they are
mirror images and both look like a healthy system: **a ledger that under-reports** makes every
catch-up re-fetch history that is already stored, which is a metered API bill and a slow command
that nobody investigates because it works; **a ledger that over-reports** makes the catch-up skip
a window forever, which is a permanent hole in a chart that nobody sees until Epic 5 computes a
baseline over it.

Neither is detectable from the ledger alone. Both are detectable by comparing it against the
bars, which is why the expensive query exists in the test suite and nowhere else.
