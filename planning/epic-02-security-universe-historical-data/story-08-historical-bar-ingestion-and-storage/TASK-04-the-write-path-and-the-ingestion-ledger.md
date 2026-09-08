# Task 2.8.4 — The write path, and the ledger that answers "what do I have"

**Status:** Complete (2026-09-08)
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
  **The schema is now built for this rather than merely compatible with it (Task 2.8.3).**
  `MarketBarsTable.recorded_at` is writable on update, deliberately — the first draft of that
  table made it `never`, copying `securities`, which would have made this decision
  _unimplementable_ and was caught by re-reading the downstream tasks before the migration
  reached production. There is no `updated_at`: the only event that rewrites a bar is a
  correction, so `recorded_at` moving **is** the record that one happened, and because a batch
  shares one `recorded_at` a corrected bar is the one whose value sits apart from its session's.
  **That is the mechanism the reversal trigger fires from** — a property of the data rather than
  a counter in a terminal somebody has closed — so the counting below is the report and this is
  the record.
- **Which means this task should be able to SEE one.** A `do nothing` that silently discards a
  changed bar is how the first correction goes unnoticed forever. Prefer a form that can report
  "we already had this bar and it differed" — `do update ... where` on the OHLCV columns being
  distinct, counting the rows it touches — so the trigger above can actually fire. That is
  `load-universe.ts`'s `is distinct from` idiom applied for a different reason: there it keeps
  `updated_at` honest, here it makes an undetectable event detectable.

**Batching.** Postgres's bind-parameter ceiling is 65,535 and this row is ~~9~~ **8** written
columns — `recorded_at` defaults, so a writer supplies `security_id`, `timeframe`,
`observed_at`, the four prices and `volume` — so the chunk is ~~~7,281~~ **~8,191** rows
(counted off the shipped table by Task 2.8.3; re-count it rather than citing it if the write
path ends up setting `recorded_at` explicitly, which takes it back to 9 and ~7,281). `load-universe.ts` chunks at 5,461 for 12 columns and the arithmetic
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
  (`0004` is `market_bars`, applied)
- `schema.ts` gains the story's second table; `migrations/README.md`'s lists updated if anything
  moved — **noting Task 2.8.3 already moved four rows into the checked list**, so the money rule,
  the foreign-key naming rule, `observed_at`-has-no-default and no-unasked-for-index are checks
  now and this table inherits all four
- `market-bars.database.test.ts` — which **already exists** (Task 2.8.3, 35 tests over the
  table's shape), so this extends it rather than creating it, and its `beforeAll` already
  migrates and loads the universe: writing the same series twice writes nothing the second time,
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

---

## What shipped (2026-09-08)

Four files: `apps/backend/migrations/0005_bar_coverage.sql`,
`apps/backend/src/market-bars.ts`, `apps/backend/src/market-bars.test.ts` (the parse, in
the fast suite), and ~28 new tests appended to `market-bars.database.test.ts`.
`schema.ts` gained `BarCoverageTable`. **No dependency, no lockfile change, no new script and
no new `verify` step**, and nothing in `packages/shared` or `apps/frontend` was touched.

### The decisions this task owed, and what was taken

- **`do update … where … is distinct from` rather than `do nothing`.** The brief flagged
  this and it is the single most consequential line in the module. `do nothing` is cheaper,
  it is literally what _"never `UPDATE` a bar in the ordinary case"_ sounds like, and it
  **silently discards a changed bar** — which makes open decision 1's reversal trigger (the
  first observed correction) unfireable forever. With the clause, an unchanged bar is not
  written at all and a changed one is counted and reported.
- **The ledger stores `covered`, and the resume point is not a column.** Both ends of the
  range are already in the row, so a `resume_from` beside them would be a second copy of one
  of them, free to disagree — §5's `deleted_at` shape.
- **One row, one range — and the cost is ENFORCED rather than only written down.** The brief
  asked for the recommendation plus a note that the walk must be monotonic. What shipped
  also refuses a write whose gap from the stored range **contains a trading session**,
  computed from the shipped calendar. That is exact rather than a threshold, and it had to
  be: two adjacent sessions are disjoint as intervals — the overnight, the weekend, a
  holiday — so no interval arithmetic can tell _"the next session back"_ from _"a month
  back"_. The calendar can, and it is already in `packages/shared`.
- **The ledger takes `securities`' `recorded_at` / `updated_at` pair and `market_bars`
  deliberately does not**, using `0004`'s own argument in the other direction: a row
  rewritten routinely needs both, a row rewritten only by a correction does not. `updated_at`
  moves **only on a real change**, which is what makes a no-op re-run leave _both_ tables
  byte-identical — so criterion 2's checksum covers the ledger as well as the bars.
- **There is no "last attempted" column**, refused outright: it would be a date that always
  says today, which `UNIVERSE.md` §11 and `BarSource.retrievedAt` both record as the trap
  that makes a timestamp permanently silent about staleness — and it would make every re-run
  rewrite every row, giving away the property above for nothing.

### Two things the brief did not anticipate

**An empty answer carries no window, and the consequence had to be decided rather than
discovered.** `BarSeries` requires `coverage.covered` to be `null` exactly when there are no
bars, so a session the vendor answered with nothing extends the ledger by nothing. Inferring
the window from `requested` instead is precisely the bug Task 2.7.5 measured. The residual is
bounded and is written into the code: an empty session at the **frontier** of the walk is
re-fetched next run, and one in the **middle** is absorbed by the union the moment the session
beyond it succeeds. One re-fetched session is the safe direction.

**The `is distinct from` clause is derived from one column list rather than written out
twice**, which closes a gap `load-universe.ts` records and could not close. There, the written
columns and the compared columns are two hand-written lists placed one above the other, and a
column added to the first and forgotten in the second silently stops moving `updated_at`. Here
`sql.join(BAR_VALUE_COLUMNS.map(sql.ref))` builds both sides, so a sixth value column cannot
be added without the comparison following it.

### Five deliberate breaks, each seen to fail and reverted

| Break                                                      | What went red                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Bars written outside the transaction that holds the ledger | `rolls the bars back when the LEDGER write is refused`            |
| The resume point taken from `requested.end`                | `stores the covered window and not the requested one`             |
| A chunk boundary that drops the last row of each chunk     | `writes past the bind-parameter chunk boundary without dropping…` |
| The `is distinct from` clause replaced with `true`         | **two** — idempotence, and the part-new count                     |
| The contiguity check reporting no missing sessions, ever   | `refuses a write that would leave it claiming a session…`         |

The first was attempted twice. The obvious form — writing the **ledger** on a second
connection from inside the transaction — **hung rather than failing**, because the outer
handle waits for a connection the transaction is holding. That is a real finding about this
shape (a second connection opened from inside a transaction is a self-deadlock, not a
correctness bug you get to observe), and it is why the break that shipped in the table above
moves the _bars_ out instead.

The transaction is asserted in **both** directions, and the second needed producing rather
than reasoning about: a temporary `check (bar_count < 0)` on `bar_coverage` makes the ledger
write fail _after_ the bars are already inserted in the same transaction, and the assertion is
that zero bars survive.

### Figures

- `pnpm verify` **exit 0 in 34.4 s with a database and 40.3 s with none** — the second is the
  one that matters, and it is the check rather than a formality on the task that adds a table.
- `pnpm test` is **754** (206 + **365** + 183); `pnpm test:process` 14.
- `pnpm test:database` is **124 across 4 files** in 1.8 s, up from 96 — 28 new.
- `pnpm migrate` applied `0005_bar_coverage` in one run and reported `Nothing pending.` on the
  next; the table was read back off the live local server and matches the migration
  column for column, constraint for constraint.
- The chunk is **8,191 rows** at 8 written columns against Postgres's 65,535 bind parameters,
  crossed once by a deliberate 8,300-bar series.
- The frontend artefact is untouched, which is the check rather than a coincidence: this task
  shipped no `apps/frontend` and no `packages/shared` source.

### One operational note worth carrying

A database-suite run killed mid-flight leaves connections that block the **next** run's
`drop database` — `database "marketpulse_vitest" is being accessed by other users`, with every
test reported as _skipped_. The suites self-heal by dropping at the start, and the drop itself
is what fails. `pg_terminate_backend` over `pg_stat_activity where datname = 'marketpulse_vitest'`
clears it. Pre-existing, not introduced here, and it reads like a broken suite.

---

## For the stakeholders — what this actually did, in plain English

**Nothing on screen changed, and that is on purpose.** This is plumbing, and it is the
plumbing everything visible in the next few weeks runs through.

### The problem it solves

MarketPulse's job is to spot unusual market behaviour and let you dig into the evidence
behind it. To do that it needs history — what did this share price do, minute by minute,
over the past year — because "unusual" only means something compared to "usual".

We buy that history from a market-data provider, and we are storing it ourselves rather than
asking them again every time. That decision was taken earlier in this story, for four
reasons, of which the plainest two are: the provider will only answer us about two hundred
times a minute, and when their service is down we want the product to say _"showing data
through 10:42"_ rather than showing an error page.

So we needed two things. **A way to write those price records into our database** — millions
of them, correctly, repeatedly, without ever creating a duplicate or losing one. And **a way
to answer the question "what have we actually got?"** without reading all of it.

### The second one is less obvious and matters more

Imagine a filing cabinet with fifty million pieces of paper in it. Asking "do we have
Apple's prices for last March?" by looking through the cabinet takes minutes. Asking an index
card at the front — _"Apple, minute prices, January through September, 97,000 records"_ —
takes a fraction of a second.

That index card is what we built, and it is a task of its own rather than a footnote because
**it can lie in two directions and both of them look completely healthy.**

- If the card **understates** what we hold, then every night the system re-downloads history
  it already has. Nothing breaks. The download is just slower and more expensive, forever,
  and nobody investigates a job that works.
- If the card **overstates** what we hold, the system skips a window of history permanently.
  Nothing breaks then either — until months later, when a calculation quietly runs over a gap
  and produces a confident, wrong answer.

Neither is detectable by looking at the card. Both are detectable by comparing the card
against the cabinet. So the expensive comparison exists in our test suite, run against every
symbol, as the control for the cheap answer — and nowhere else.

### The decisions worth knowing about

**We made re-running the download completely harmless.** Run it twice and the second run
writes nothing at all — proved not by the program's own report of what it did, but by taking
a fingerprint of the database before and after and checking they are identical. A program
saying "I changed nothing" and a database that is byte-for-byte unchanged are two different
claims, and only the second one is worth having.

**We deliberately did the more expensive thing so that we can notice when a price gets
corrected.** Exchanges occasionally restate a price after the fact. The cheap option is to
tell the database "if you already have this record, ignore me" — which is one word shorter,
and would mean a corrected price is silently thrown away and **we would never know it had
happened**. Instead we compare the numbers and count the ones that moved. We have never seen
a correction; the whole point is that when the first one arrives, something reports it rather
than swallowing it. That matters because how we handle corrections is a known open question
in the design, and a question you cannot see evidence for is a question nobody ever revisits.

**We made it impossible to record history we do not have.** The index card holds one
unbroken span — "January through September" — which is simple and fast, and which quietly
becomes a lie if the download jumps around and skips a month. Rather than just writing a note
telling future developers to be careful, the code checks: if a new batch of prices is
separated from what we already hold by a gap that contains an actual trading day, it refuses
the write and says which days are missing. It works this out from the trading calendar we
built in the previous story, so there is no guessed threshold in it to be wrong. A rule
enforced by a machine survives; a rule written in a document survives until somebody is in a
hurry.

**We were careful about a 16-minute trap.** Our data plan will not serve the most recent
quarter of an hour of market data — it refuses the whole request rather than answering
partially. So the system asks for slightly less than "up to now", and the bookmark it saves
is **what it was actually given**, not what it asked for. Bookmarking what it asked for would
leave a permanent 16-minute hole at the front of the data — renewed every single run, in
exactly the most recent prices every chart opens on. That is a one-word difference in the
code and it was worth a paragraph of argument and a test.

**The price records and the index card are written together or not at all.** If either fails
halfway, both roll back. We proved this in both directions by deliberately breaking each
half and checking the other did not survive.

### Where this leaves the product

The store is built and it is empty. The next tasks fetch many securities in one request, run
the actual download, work out which days are genuinely missing versus simply quiet, and then
— the payoff — **put "how much history do we have for this security" on the Securities page
that already exists**, which is the first thing a person outside the code will be able to see
from all of this.

After that the epic's second half opens up: real price charts, the anomaly scores that make
this product what it is, and eventually the replay feature that lets you wind the clock back
and ask what was knowable at 11:07 on a given morning. Every one of those reads the rows this
task learned how to write.
