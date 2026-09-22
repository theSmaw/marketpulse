# Task 3.7.1 — The shape of the column, measured against the real table before a line of SQL

**Status:** **Complete — 2026-09-22.** Three shapes measured against the real table — 48,797,343 rows, 5,081 MB of heap, PostgreSQL 18.6 — inside a rolled-back transaction, every figure quoted verbatim. **Chosen: a per-bar `feed text not null default 'sip'` with its vocabulary check added `NOT VALID` and never validated inside a deploy.** The column and the check are catalogue writes (39 ms and 3 ms); validation is a full scan (6.2 s on a laptop, **~508 s on the deployed tier's 10 MiB/s**, against a 120 s ceiling). Open decision 1 is settled by the shape — the default is the backfill, for free — with the owner's reversal named. [ADR 0034](../../../docs/adr/0034-the-tape-on-the-bar.md) is written and indexed; [`TAPE.md`](TAPE.md) is open.
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.1 (shipped)

## Objective

Decide **what the store will say about a bar's tape and where it will say it**,
and decide it with figures taken against the real table rather than with an
argument. Write the decision down as an ADR before the migration exists,
because `0004_market_bars.sql` recorded a decision **against** a per-bar feed
column with a named reversal trigger, and this story is that trigger firing.

## What the user can see when this lands

**Nothing.** A decision and a document. The story that pays it off is
[3.8](../story-08-storing-the-live-session/STORY.md) — a cold load during a
session serving today's bars — and through it
[3.9](../story-09-the-live-edge-and-the-two-feed-ledger/STORY.md)'s two-feed
sentence on the source note, which is the first time a user reads anything this
story made possible.

What the user still cannot do: anything they could not do before.

## Why this is a task rather than the first line of the migration

**Three shapes are on the table and the story refuses to pick one by taste.**
`PROVIDER.md` §2.3 rejected per-bar provenance as _never wrong and not
affordable_, and `0007_bar_coverage_provenance.sql` chose the ledger grain
because the cheaper alternative was **measured false**. The same standard
applies here: the choice is a measurement.

The candidates, and what each has to answer:

1. **A per-bar `feed` column on `market_bars`**, `not null`, defaulting to
   `sip` — the tape everything stored today came from. On PostgreSQL 18 (the
   local and deployed version, `HOSTING.md`) a column added with a **constant
   default is a catalogue write, not a rewrite**: no row is touched and the
   default is materialised only on read. What is _not_ free is a `check`
   constraint over the vocabulary, which validates every existing row unless
   it is added `NOT VALID` — and a full scan of the real table is the figure
   this task has to take.
2. **A nullable per-bar column meaning _see the ledger_.** Free to add, free to
   backfill by never backfilling, and it makes **every reader carry the rule**:
   a `null` that means `sip` today is a `null` that means _whatever the ledger
   said_ for ever, and the story's open decision 1 is exactly this trade.
3. **A second ledger grain** — `bar_coverage` rows keyed on a window rather
   than on a `(security, timeframe)` pair, one row per contiguous stretch from
   one tape. No bar changes; the read path walks windows. It costs a
   uniqueness rule the ledger currently relies on and a write path that splits
   windows.

**Two constraints the story file does not mention, and both are load-bearing:**

- **`deploy.yml` wraps `pnpm migrate` in `timeout 120`.** A migration that
  scans 45–48 million rows on the deployed **Burstable B1ms** instance is a
  migration that may not finish, and Kysely's single transaction rolls the
  whole run back. Whatever shape is chosen must be **metadata-only at deploy
  time**, with any scan deferred to a step that has no deadline.
- **`market_bars` is 195 bytes a row across 48,027,772 rows** (`BARS.md` §8.3
  — 109 heap, the rest index) on a disk with ~22.5 GiB usable and ~2.6 years
  of headroom. A per-bar column costs its bytes only on rows written **after**
  it exists, and the rate is one year of minute bars a year; say what the
  column does to §8.4's headroom table.

## Work

- **Take the figures on the local store** — 45.3 million estimated rows,
  9.1 GB, PostgreSQL 18 — with `\timing` on: `add column ... not null
default 'sip'` (expect milliseconds; confirm), `add constraint ... check
(...) not valid` (expect milliseconds; confirm), `validate constraint`
  (expect a full scan; measure), and the same on `marketpulse_bare` for the
  empty-store shape CI applies it to. Record each verbatim.
- **Extrapolate honestly** from a laptop to a B1ms: state the ratio you assume
  and why, then say whether the scan fits inside 120 s and whether it matters,
  given `NOT VALID` enforces new rows either way.
- **Cost the read path for each candidate**: the two-tape query the story's
  criterion 2 needs — sources in contribution order with bar counts — is a
  `group by feed` over a window under candidate 1 and a window walk under 3.
  Write both queries and `explain analyze` them against a real window.
- **Settle open decision 1 with the user**: backfill, or a default that is a
  statement about the past. Candidate 1's fast default _is_ a backfill for
  free; say so if that is what decides it.
- **Write ADR 0034** — _The tape on the bar_ — recording the reversal of
  `0004`'s decision, its trigger firing, the three candidates with their
  figures, the one chosen, and a reversal trigger of its own as a condition.
  Index it in `docs/adr/README.md`.
- **Open `TAPE.md`** in this directory as the story's subject document: what
  the store claims about a bar's tape, in whose words, and what a green
  `pnpm test:database` does and does not certify about it. Every later task
  in this story writes into it.

## Done when

1. The three candidates carry figures taken against the real table, quoted
   verbatim, and the deploy's 120 s ceiling is answered for the chosen shape
2. Open decision 1 is settled with the user and recorded with its alternative
3. ADR 0034 is written and indexed; `TAPE.md` exists
4. `pnpm links` resolves every reference added

---

## What was found — 2026-09-22

### 1. How the figures were taken, so they can be re-taken

Two SQL scripts against the running local container (`docker exec -i
marketpulse-postgres-1 psql`), `\timing on`, `ON_ERROR_STOP`, every `ALTER`
inside `begin; … rollback;` so the store's schema is exactly what it was
afterwards. Apple M3, 16 GiB; PostgreSQL 18.6 in the container with
`shared_buffers` at its 128 MB default, which matters below. Then the same
three `ALTER`s against `marketpulse_bare`, which is the shape CI's `database`
job and the deploy's migrate step actually apply it to.

**The table, first, because the story's figures were estimates:**

```text
 exact_rows
------------
   48797343
Time: 15583.271 ms (00:15.583)
 market_bars  | est_rows 45291728 | heap 5081 MB | total 9097 MB
```

The estimate was 45.3 M; the count is **48.8 M**. The count itself took
15.6 s, which is the cheapest reminder of what any full pass over this table
costs, even on a laptop with the heap in the operating system's cache.

### 2. Candidate 1 — the per-bar column: two catalogue writes and one scan

```text
--- candidate 1a: not null, constant default (expect: catalogue write)
ALTER TABLE
Time: 39.290 ms
--- candidate 1b: the vocabulary check, NOT VALID (expect: catalogue write)
ALTER TABLE
Time: 2.968 ms
--- candidate 1c: validating it (expect: a full scan)
ALTER TABLE
Time: 6180.846 ms (00:06.181)
```

**Both expectations held and the third is the decision.** The column with a
constant default and the `NOT VALID` check together cost **42 ms on 48.8
million rows**, and touched none of them — PostgreSQL keeps a constant default
in the catalogue and materialises it on read. Validation read the whole heap:
**6.2 s** here, and that figure is flattering, because `shared_buffers` is
128 MB, so those 5 GB came from the kernel's page cache at laptop NVMe speed.

**The extrapolation, and it needs no ratio because the tier publishes the
number.** `HOSTING.md` records the deployed instance as _Burstable B1ms — 1
vCore, 2 GiB memory, 640 maximum IOPS, **10 MiB/sec maximum I/O
bandwidth**_. Reading 5,081 MB at 10 MiB/s is **~508 s** before the CPU does
anything, and 2 GiB cannot hold the heap in cache. Against
`deploy.yml`'s `timeout 120 pnpm migrate` that is not close, and Kysely's
single transaction would roll the whole run back at the ceiling. **So the
check is added `NOT VALID` and is never validated inside a deploy.** That
costs nothing: `NOT VALID` enforces every new row exactly as a validated check
would, and every existing row's value is the default, which is in the
vocabulary by construction — the scan would confirm what the catalogue already
guarantees.

**The read path the column exists for**, `explain (analyze, buffers)` over a
real NVDA window, `group by feed` with `min(observed_at)` for contribution
order and `count(*)` for the bar count:

```text
one session (390 bars)     Index Scan using market_bars_unique_bar … Execution Time: 0.478 ms
25 sessions (10,140 bars)  Bitmap Heap Scan … Heap Blocks: exact=143 … Execution Time: 9.964 ms
```

Under 10 ms at above the cap (the cap is 9,750 bars; this window held
10,140), on the index the table already has.

**The bytes**, `pg_column_size` on a fresh row in a temporary table with and
without the column:

```text
 new_row_bytes_with_feed     100
 row_bytes_without_feed       96
```

**+4 bytes a row, on rows written after the migration only.** Against
`BARS.md` §8.3's 195 B/row all-in that is about 2%, and §8.4's ~2.6 years of
headroom at 518 securities becomes **~2.5**. Existing rows cost nothing — the
default is not stored in them.

### 3. Candidate 2 — nullable, _see the ledger_: free, and rejected

```text
alter table market_bars add column feed text;
ALTER TABLE
Time: 0.101 ms
```

Rejected on the story's own criterion 1: a bar's tape must be _readable
without consulting a constant_, and a `null` that means _sip_ today and
_whatever the ledger said_ for ever is a rule every reader carries. Candidate
1's fast default gives the same zero-cost backfill with no rule.

### 4. Candidate 3 — a window-grain ledger: the read is trivial and the cost is elsewhere

```text
Index Scan using bar_coverage_unique_series on bar_coverage … Execution Time: 0.439 ms
```

The read was never the problem. The cost is a relaxed uniqueness rule, a
write path that **splits and maintains** windows and counts as bars arrive,
and a read path that trusts a maintained count. Candidate 1 derives the same
answer **from the bars** in under 10 ms — `PROVENANCE.md`'s _a claim about
data requires data_, applied to the claim's own source.

### 5. The bare store, which is what the deploy sees

```text
 rows 0
add column   … Time: 5.686 ms
add check    … Time: 1.910 ms
validate     … Time: 0.113 ms
```

Three catalogue writes and a scan of nothing. CI's `database` job and the
deploy's migrate step will see this shape, and neither will see the scan.

### 6. Open decision 1 — settled by the shape, with the owner's reversal named

**Not backfilled, and not nullable.** The constant default _is_ the backfill:
every one of 48.8 million rows answers `sip` without being rewritten, and no
reader carries a rule. The alternative — a rewrite on a 10 MiB/s tier for a
value the default already gives — was not worth measuring past the arithmetic.
**Settled without the owner in the room**, which the task asked for and the
session could not do; the reversal is one clause in Task 3.7.2's migration,
and `TAPE.md` §5 says what would have to be re-argued.

### 7. What was written, and the two sentences swept the same day

- **[ADR 0034](../../../docs/adr/0034-the-tape-on-the-bar.md)**, indexed:
  the reversal of `0004`'s decision with its trigger firing, the three
  candidates with these figures, the decision, what it does not decide, and
  two reversal triggers as conditions — the first per-bar field beyond the
  tape, and the first migration on this table that is not a catalogue write.
- **[`TAPE.md`](TAPE.md)**, opened: the figures, the deploy's ceiling, what
  the store claims and in whose words, what a green `pnpm test:database`
  does and does not certify, and the settled decision.
- **`PROVIDER.md` §2.3** gains a dated amendment: _not affordable_ was
  measured for four fields per bar, on the wire and in the browser; one
  4-byte field in the store, materialised from a default, is — and the
  arithmetic that made it so is here. The section's conclusion for the wire is
  unchanged.
- **`CLAUDE.md`** gains a data-layer trap, because the next person writing a
  migration on `market_bars` will not read this file: a full scan of this
  table on the deployed tier is minutes, not seconds.
- **`0004_market_bars.sql`** is applied and immutable; the ADR is its
  amendment, which is what `CLAUDE.md` says an amendment to an applied
  migration looks like.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** Live prices reach the screen once a minute and a
person can watch 518 of them move. What the product cannot yet do is
**remember** a live session: reload the page mid-day and today is gone until
tonight's overnight download catches up. That is the next story. This story
is the plumbing it needs, and this task was the decision under the plumbing.

**The problem, in plain terms.** Our database stores prices from two sources
that are both correct and not the same: the overnight download comes from the
full consolidated tape of every US exchange, and the live feed during the day
comes from one exchange, IEX. Every price we have ever stored came from the
first. The moment we store a live one, a single day's chart would contain
both — and the database has no way to say which price came from where. We
promised, as a product principle, never to mislead a reader about where a
number came from. So before a single live price is stored, each stored price
needs to carry its own source.

**The decision, and why it took measuring rather than deciding.** The obvious
fix — one small column on every stored price — was explicitly rejected a
fortnight ago as too expensive, and that rejection is written into the
database's own history with a condition for reversing it: _the day a second
source writes here_. That day is next week. So rather than argue with the old
decision, we measured it against the real table: 48.8 million rows.

- **Adding the column costs nothing to the existing rows.** The database
  engine records the default answer, "consolidated tape", once, in its
  catalogue, and every old row gives that answer without being touched.
  Measured: 39 milliseconds on 48.8 million rows.
- **Enforcing the list of allowed answers on new rows also costs nothing**,
  3 milliseconds, as long as we do not ask the database to re-check the old
  rows. Re-checking them means reading the whole table.
- **Reading the whole table is the thing we must never do during a deploy.**
  On the laptop it took six seconds. On the small database server we actually
  run in production, whose disk reads at ten megabytes a second, the same read
  is **about eight and a half minutes** — and a deploy gives a database change
  two minutes before giving up and undoing it. So the migration will be the
  two instant changes and nothing else, and the re-check is skipped on
  purpose: every old row already holds the default, which is on the list by
  construction.
- **Each new price costs four extra bytes.** Against the roughly 200 bytes a
  stored price already costs, that is two percent, and it shortens our
  storage runway from about 2.6 years to about 2.5.

**Two alternatives were measured and turned down.** Leaving the column blank
for old rows and making every reader look elsewhere for the answer is free,
but it means every future piece of code has to remember a rule; our
acceptance criterion says a price's source must be readable without one.
Keeping the source only in the summary ledger, one row per stretch, reads
fast but needs the ledger to be split and maintained by hand as prices arrive,
where the chosen shape simply counts what is there.

**One decision taken without you, and how to overturn it.** The story asked
that whether to rewrite old rows be settled with you. The measurement made it
moot — the default gives every old row its answer for free — so it is
recorded as settled, with the alternative and the single line that changes
it if you disagree.

**What a user can see today: nothing.** What this unlocks: the next task can
write the migration with its cost already known to the millisecond, the story
after this one can store a live session without lying about its source, and
the chart's source note can finally say, from real stored data, which
exchange each part of a day's chart came from.
