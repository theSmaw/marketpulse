# Task 3.7.3 — Every writer stamps the tape, and no reader consults a constant

**Status:** **Complete — 2026-09-22.** `writeBatch` takes the tape from the series' own provenance and stamps it on every bar; `MarketBarsTable.feed` is narrowed to required on insert; `readBars` answers each bar **beside** its tape as `StoredBar`; the conflict rule is unchanged and asserted as Story 3.8's to replace. Five new database tests plus one on the shipped backfill command, one break red and restored, `pnpm test:database` 180/180, `pnpm verify` green.
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

- **Narrow `MarketBarsTable.feed` to `ColumnType<MarketFeed, MarketFeed,
never>`** — Task 3.7.2 shipped it as `MarketFeed | undefined` on insert for
  exactly one task, so the shipped writer could omit it and the default could
  answer `sip`; this task is the one the comment on the column names, and the
  narrowing is what makes a writer that omits the tape a compile error
  (`0007`'s arrangement for the ledger, repeated here). The raw-SQL test
  _answers `sip` for a writer that does not know the column exists_ stays as
  it is — it inserts around the type on purpose, because it is about the
  deploy window's writer, not a shipped one.
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

---

## What was done — 2026-09-22

### 1. The writer stamps the tape, and the compiler holds it to that

`writeBatch(trx, securityId, timeframe, bars, feed)` gained a fifth argument
and `recordSeries` passes `source.feed` — where `source` is
`singleSourceOf(series)`, the series' `provenance.sources` — so every bar in
a chunk is inserted with the tape the series says it was observed on. The
provider's name is not consulted, the ledger is not consulted, and no
literal is written. `MarketBarsTable.feed` is now `ColumnType<MarketFeed,
MarketFeed, never>`: the insert side dropped its `| undefined`, so a writer
that omits the column is a compile error and the database's `'sip'` default
is unreachable from shipped code — `0007`'s arrangement for the ledger,
repeated here as Task 3.7.2's comment on the column said it would be. The
raw-SQL test _answers `sip` for a writer that does not know the column
exists_ stays exactly as it was; it inserts around the type on purpose,
because it is about the deploy window's writer.

### 2. The read carries the tape out beside the bar

`readBars` selects `market_bars.feed` beside the six bar columns and answers
`readonly StoredBar[]`, where `StoredBar` is `{ bar: Bar; feed: MarketFeed }`.
The task file left the shape open — a field on `Bar`, or the tape beside it —
and the answer is **beside**, for the reason the file names: `Bar` is
`packages/shared`'s, and a field on it reaches the wire, the chart and every
`WireObservation`. Task 3.6.4's constraint 4 refused a field on `Bar` for the
send instant and the tape is the same kind of fact — the store's, true of a
row, already said elsewhere by the wire's own `feed` message and the series'
provenance. Two callers changed: the replay source maps `.bar` and drops the
tape on purpose, with a comment saying its emission is labelled `replay` by
the engine whatever tape the bar came from; and `self-driving-streams.test.ts`'s
in-memory fake answers the new shape. `readSeries` is untouched — its
series-level `feed` is still the ledger's until Task 3.7.5 derives sources
from the rows.

`SOURCE_OF_NOTHING` is **confined rather than removed**. Its comment now says
what still reaches it — a read with no ledger row, which through the shipped
writers is the same as no bars, since `recordSeries` writes the ledger in the
transaction that writes the rows — and names 3.7.5 as the task after which
only an empty answer reaches it.

### 3. The conflict rule, kept and written down

The unique key does not include the tape, so a bar re-stored from another
tape is a conflict. This task **kept today's behaviour and asserted it**
rather than deciding it: `feed` is absent from the `on conflict … do update
set` and from the `is distinct from` comparison, so in both branches the
existing row's tape wins — the same numbers write nothing, different numbers
move the numbers and `recorded_at` and leave the tape. The second branch
means a corrected row carries one tape's numbers under another tape's label,
and that is recorded as the honest description of the rule and as Story
3.8's to replace, not as a claim that it is right. Through the shipped
writers it is unreachable anyway (`ForeignSourceError` fires before a row is
touched). The update type being `never` makes _the tape does not move on a
correction_ a compile-time rule; whichever of its three shapes 3.8 takes has
to change that type on purpose. `TAPE.md` §6 carries the whole of it.

### 4. The tests — six new assertions, one of them on the shipped command

In `market-bars.database.test.ts`, a new describe, every assertion reading
the tape back through `readBars` and none through the ledger:

- a series recorded with `alpaca`/`sip` provenance → `sip` on all five bars;
- one recorded with `fixture`/`synthetic` provenance → `synthetic` on all
  five (`seriesFor` gained a `source` option for it);
- a hand-inserted `iex` row → `[{ feed: "iex", bar: {…} }]`, the bar's six
  values asserted beside the tape;
- a re-store of the same instant from another tape, same numbers →
  `unchanged: 1` and the row untouched, tape included;
- the same, different numbers → `corrected: 1`, the numbers moved, the tape
  left.

And in `backfill.database.test.ts`, on the shipped `runBackfill` driven by the
fixture provider: `select distinct feed from market_bars` answers
`["synthetic"]` and nothing else — `distinct` rather than a count, so a single
`sip` among the rows, which is what a writer falling back to a constant would
leave, shows up as a second value. That is criterion 1 on the command a
stakeholder actually runs rather than on the repository alone.

### 5. The break — red, restored

`pnpm break the-writer-stamps-a-constant` replaces `source.feed` in the
`writeBatch(...)` call with a literal `"sip"` and runs the table's database
suite; _reads back with `synthetic` on every bar_ went red and the file came
back byte-identical. The literal is the plausible wrong answer — it is true of
every bar the backfill writes today — which is why the test that catches it
had to be about a tape other than `sip`. It needs a database and lives
outside `verify`, as every `test:database` break does.

### 6. What was found: the chunk size, and the test that checks the list

The multi-row insert's chunk size is derived from `BAR_COLUMNS.length` so
that adding a column cannot leave a hard-coded batch stale. Adding `feed` to
the insert **without adding it to that list** produced exactly the stale
size the derivation exists to prevent:

```text
× writes past the bind-parameter chunk boundary without dropping a row
error: bind message has 8183 parameter formats but 0 parameters
```

8,191 rows × 9 columns is 73,719 parameters against a 65,535 ceiling. The
derivation is only as good as the list, and the existing chunk-boundary test
is what checks the list against the statement — it was red within a minute
of the first run. The list now carries `feed`, its comment says _nine, not
ten_ and records this, and the chunk is **7,281 rows** from 8,191; the test's
own comment and the figure in `market-bars.ts`'s `recorded_at` argument were
corrected with it.

### 7. Gates

`pnpm --filter @marketpulse/backend exec tsc -b` clean; `pnpm test:database`
**180/180** (six files); `pnpm break the-writer-stamps-a-constant` red and
restored; `pnpm verify` green; `pnpm e2e` green against `marketpulse_bare`.
No browser spec touches this — nothing on the wire changed — and the suite
was run because the change is in the backend the pair serves.

**One browser failure that was the store's, proved rather than assumed.**
Against the developer store — six sessions behind — _pressing a window does
not move the chart_ went red at tablet and phone by exactly 90 px, twice in
a row. Main's own backend sources, overlaid on the running pair, failed it
identically, so the branch was not the cause: the default five-session
window is `empty` on a store that stale, `1 month` is not, and the press
reveals a figures row above the picture. The spec now says so in its own
comment, and the full suite was re-run against `pnpm store:bare` — CI's
shape, where the window is `empty` either side of the press — for the green
above.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** Live prices reach the screen and move on their
own. The next story lets the product remember a live session, so a page
reloaded mid-day still shows today. For that, every stored price has to say
which source it came from. The task before this one gave the database the
column; this one makes the software fill it in.

**What was built.** Every price the product stores now carries the name of
the tape it was observed on, taken from the data's own paperwork rather than
from an assumption. There is exactly one place in the code that writes
prices, and it can no longer write one without saying where it came from —
if a developer forgets, the code does not compile. And when a price is read
back, its source comes back with it, so the answer to "where did this bar
come from?" is read off the row rather than looked up or guessed.

**What we checked rather than trusted.**

- **Three sources, each read back correctly.** Prices from our normal
  nightly load come back labelled as the consolidated tape; prices from our
  test-data generator come back labelled as synthetic; a price shaped like
  the one the live feed will write comes back labelled as that exchange.
  Each is read from the stored row itself.
- **The real loading command was tested, not just the library under it.**
  We ran the actual backfill against a real database with the generator
  behind it and asked the database which sources it now holds. It held one
  answer — the right one — and nothing else.
- **We proved the test can fail.** We deliberately changed the writer to
  stamp a fixed value instead of the real source. The right test went red
  and the change was reverted automatically.
- **A mistake was made and the safety net caught it in under a minute.**
  Adding a column to the write meant a batch-size calculation elsewhere was
  out of date. An existing test written for exactly that day went red on the
  first run, the fix was one line, and the record says so.

**One rule we left alone on purpose.** If a price for the same minute
arrives from a different source, today the stored row keeps its original
source label — even when the numbers change. That is not the final answer;
it is the next story's decision to make, and we wrote it down and pinned it
with a test rather than deciding it in passing.

**What a user can see today: nothing.** The store holds the same prices with
one more true fact on each. What this unlocks: the next task lets the store
accept a second source at all, and the one after can tell a reader — from
real stored data — which exchange each stretch of a chart came from.
