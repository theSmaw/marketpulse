# Task 3.7.7 — The sweep, the hand-offs and the close

**Status:** **Complete — 2026-09-23. Story 3.7 is closed.** Six criteria, six verdicts, all met. The upward sweep found **five live claims still standing** and amended each with a date — two ADRs, `BARS.md`'s row size and headroom, `LIVE-DATA.md` and `PROVENANCE.md` — and found **one stale comment in shipped code**, orphaned above the wrong declaration since 3.7.4 and carrying a claim 3.7.6 had disproved. The hand-off enumeration: **six recipients, four missing**, all four written. `CLAUDE.md` gained the story's paragraph, `TAPE.md`'s row in the record table, and a correction to its own rehearsal sentence.
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.6

## Objective

Close the story: walk the six criteria against the tree, sweep upward for the
sentences this story falsified, and push its constraints **sideways** into the
stories that write through what it built.

## What the user can see when this lands

**Nothing new.** This story's rehearsal is not a live-session one —
`LIVE-REHEARSAL.md` exempts 3.7 as backend-only by its own scope — and that
exemption should be re-read against what shipped, the way Story 3.5's was.

> **AMENDED 2026-09-23 by Task 3.7.6 — the exemption still holds, and there
> is now a precedent for the form if it ever does not.** Story 3.5's
> exemption fell because two of its tasks were **repairs** that changed a
> surface without appearing in a scope; this story shipped no repair to a
> surface — the only user-visible consequence of anything in it is a served
> answer's `provenance.sources`, which no shipped screen reads until Story
> 3.9. Re-read it against that test rather than against the scope line, and
> if it falls, `LIVE-REHEARSAL.md`'s 2026-09-22 rows are the shape: a
> headless watch recorded as a headless watch, with four notes saying what
> it cannot claim.

## The upward sweep, which this story owes more than most

This story reverses a recorded decision and falsifies sentences in at least
four documents that are **live claims** today:

- **`CLAUDE.md` invariant 6 and _What is settled_**: _the ledger ... is the
  sentence invariant 6 exists for, and **no server this product runs can
  produce it** — all sixteen recorded bar-series bodies carry `sip`, so the
  state is reached through `twoFeedStitchView()`_. After 3.7.5 a server can
  produce it from a store that holds two tapes. Amend, dated.
  **Swept 2026-09-23 by Task 3.7.5's sweep, the same day the read path
  landed**: `CLAUDE.md`'s bullet, `docs/GAPS.md`'s entry and Story 3.9's own
  description all carry a dated amendment — the server produces the list from
  a two-tape store now; no deployed store holds one until 3.8. At the close,
  `grep -rn "no server this product runs"` should find only struck-through or
  amended sites.
- **`0004_market_bars.sql`'s decision and `PROVIDER.md` §2.3**: applied
  migrations are immutable and the ADR is the amendment, but `PROVIDER.md` is
  live and says per-bar provenance is not affordable. It gets a dated
  amendment beside the figure that made it affordable for one field.
- **`BARS.md` §8.3–8.4**: bytes a row and years of headroom move for rows
  written after the column. Re-take the row size on a real row and amend the
  headroom table. **Still owed** — 3.7.1 measured 100 B against 96 B on a
  fresh row and nothing has amended that table.
- **`CLAUDE.md`'s _Data layer_ trap** — the bullet this story wrote said a
  migration on `market_bars` must be metadata-only at deploy time, which is
  true and, after Task 3.7.6, incomplete in a way that misleads: a reader
  concludes _metadata-only is safe_, and an `ALTER TABLE` takes an
  `ACCESS EXCLUSIVE` lock whatever it costs. **Swept 2026-09-23 by Task
  3.7.6's sweep, the same day the rehearsal produced the figures**: the
  bullet now carries the lock half, the 18.16 s / 16.16 s rehearsal and the
  0.09 s baseline. Nothing is owed here at the close beyond checking it
  still reads as one thought.
- **`LIVE-DATA.md`** line ~2670 (_Story 3.7 is the tape column ... rather than
  the trade tape_) stands; check §11 and the two-feed ledger decision for
  anything the read path now answers differently.
- **`PROVENANCE.md`** §on the two-feed sentence, and the `e2e/README.md` and
  `docs/GAPS.md` entries that say the two-tape state is unreachable on any
  server.
- **`MARKET-DATA-API.md` §_What the ledger's one row can and cannot say_ and
  Story 3.8's scope bullet** — both said `recordSeries` refuses a series
  whose source disagrees with the ledger row. **Amended 2026-09-22 by Task
  3.7.4's sweep, the same day**, with a dated note at each: the refusal is
  now three named reasons (`stitched`, `provider`, `overlap`) and a second
  tape extends a window. Check at the close that nothing else repeats the
  old sentence (`grep -rn "source disagrees"`).

## The hand-offs, enumerated rather than remembered

Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:` line,
check each recipient's own file, and **record the count that were missing**.
Known candidates:

- **Story 3.8** — what replaced the refusal (3.7.4), the conflict rule as it
  stands and that it is 3.8's to change, the write path's shape for a socket
  bar, and the three overnight shapes now that both tapes can coexist.
  **Since 3.7.3, in words 3.8 can act on**: `writeBatch` takes the tape as
  its fifth argument from the series' provenance; `MarketBarsTable.feed`'s
  update type is `never`, so whichever overnight shape moves a tape on a
  correction changes that type **on purpose**; the overlap refusal 3.7.4
  leaves standing is the one 3.8 lifts; and `BAR_COLUMNS` sizes the
  multi-row chunk, so a column the socket writer adds goes in that list or
  the chunk-boundary test goes red (it did, in 3.7.3). **Since 3.7.4, in the
  same words**: what 3.8 lifts is `ForeignSourceError`'s `overlap` reason
  and nothing else — `stitched` and `provider` stand; `reason` is a
  discriminant its tests can assert; lifting the overlap is two decisions,
  the per-row conflict rule (`TAPE.md` §6) and what _contribution order_
  means once a tape can occur in two runs (`TAPE.md` §7, 3.7.5's premise);
  and a socket bar is written through `recordSeries` with `alpaca`/`iex`
  provenance, which the store accepts as a contiguous extension of the SIP
  window today — the test _accepts a second tape extending a held window
  contiguously_ is the shape 3.8's write path lands on
  **Since 3.7.5**: contribution order is defined — one source per contiguous
  run, in the order the bars sit — and `market-bars.test.ts` asserts the run
  reading (`iex, sip, iex` for a tape that occurs twice), so a shape of 3.8's
  that wants a different reading changes that test on purpose; the ledger's
  `feed` column is read by nothing and held so by an invariant, so 3.8's
  write path may write it and must not read it.
  **Since 3.7.6, and this is the one that changes a decision rather than
  informing it — written into its `STORY.md` the same day**: a migration on
  `market_bars` queues behind any open transaction on that table and takes
  every reader down with it (18.16 s and 16.16 s measured, `docs/GAPS.md`).
  Today the only writer is a nightly backfill in two cron windows; **3.8
  makes the backend write to that table throughout the session**, so how
  often it opens a transaction and how long it holds one stops being only a
  throughput question and becomes the bound on how long a deploy can stall
  the site. Decide the write's granularity with that in mind, and record the
  transaction's measured duration the way 3.7.6 recorded the backfill's
  (390 rows, 81–137 ms).
- **Story 3.9** — the ledger comes out of the store now; `twoFeedStitchView()`
  has a real sibling; the read-path cost of the grouping. **Since 3.7.4**:
  every stretch of a stored window carries the ledger row's one `provider`,
  so the source note's two-feed sentence names two tapes and one supplier —
  which is the plan's shape, and the day it is not (`fixture` stitched onto
  `alpaca`) the write is refused, not mislabelled
  **Since 3.7.5, written into its `STORY.md` the same day**: the list is
  produced from stored rows and proved on the wire; the grouping's cost is
  not measurable (`TAPE.md` §8's A/B); each stretch carries its **own**
  `retrievedAt`, and the note's `formatRetrieval` already renders two dates
  as a range — 3.9 reads that against a real body rather than assuming it;
  and the real recorded body that retires `twoFeedStitchView()` can be taken
  from a local store the moment 3.8 lands.
- **Story 3.10** — nothing this story changes about a degraded state, said
  rather than assumed
- **Story 3.11** — ~~the deferred validation, if any, as a thing the close
  checks was run~~ — **settled: there is none and there never will be**
  (ADR 0034; `market_bars_feed_check` stays `NOT VALID`, asserted by
  `pg_constraint.convalidated` and `pnpm break the-tape-check-gets-validated`).
  What it inherits instead, **since 3.7.6**: the bytes-a-row figure for the
  bill, still owed by the `BARS.md` item above; and `docs/GAPS.md`'s lock
  entry, whose owner is a condition the epic close is well placed to
  evaluate — _the first migration on `market_bars` that is not two catalogue
  writes, or the first deploy that reports exit 124 with `wait_event:
relation`_
- **Epic 13** — replay reads bars that now carry a tape, and _what was knowable
  at 11:07_ is the IEX bar rather than the SIP correction; the `status`
  predicate rule still applies. **Since 3.7.3**: the tape reaches the replay
  source on `StoredBar.feed` and is **dropped on purpose** in
  `replay-bar-source.ts`, with a comment saying the engine's emission is
  labelled `replay` — that line is where Epic 13 picks it up if _what was
  knowable_ needs the tape rather than the numbers
- **Epic 14** — the row size moved, and the index nobody reads is still there.
  **Since 3.7.6**: there is now a measured performance property of the
  **deploy** rather than of a page — an ordinary chart read behind a queued
  migration cost 16.16 s against a 0.09 s baseline, which is the largest
  single number anywhere in this product's read path and is invisible to
  every instrument Epic 14 owns, because it is a fact about a lock queue
  rather than about a query

## Work

- Six criteria, six verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_

  > **AMENDED 2026-09-23 by Task 3.7.6 — four of the six already have their
  > evidence, and the close should cite rather than re-derive.** Criterion 3
  > (schema and migration agree) is `pnpm test:database`'s column
  > description and `TS1360`; criterion 4 (applies to a store with rows in
  > it, timed against the real table) is the **deployed** migrate step at
  > **1.251 s** inside `timeout 120`, read from the runner's log for
  > `b9772d1`; criterion 5 (no applied migration edited, the migrate step
  > still additive-only) is the checksum test plus the `b9772d1` rehearsal
  > that stored 9,750 bars through the old writer on the new column; and
  > criterion 6 is the gate list. **Criteria 1 and 2 are the story's own** —
  > 3.7.3's per-bar tape and 3.7.5's two sources through the merge — and
  > both are database tests with breaks. So the walk is an assembly, and
  > what it must not do is re-take a figure that has a dated home.

- The upward sweep above, live claims amended and historical records left
  standing
- The hand-off enumeration, with the missing count recorded including if it is
  zero

  > **AMENDED 2026-09-23 by Task 3.7.6 — `docs/GAPS.md` is already written
  > and the close must not write it twice.** Three entries landed with the
  > rehearsal: the lock wait; `bar_coverage.feed` written, described and
  > read by nothing with no contract trigger; and this story's schema
  > evidence living in `pnpm test:database`, a required CI job outside
  > `pnpm verify`. Two further items that earlier tasks predicted for the
  > list **closed instead** and should not reappear: the invariant's
  > one-file scope became an assertion of the ledger's seam
  > (`pnpm break a-second-module-queries-the-ledger`), and
  > `SOURCE_OF_NOTHING` was read against `source-note.ts` and cannot reach a
  > reader, because ADR 0029 is applied per clause. The close's job here is
  > to check the three for accuracy and to add only what the close itself
  > finds.

- `CLAUDE.md`'s _Current state_ and _Where the record lives_ (`TAPE.md` joins
  the table), and the trap under _Data layer_ that this story's migration
  taught
- `LIVE-REHEARSAL.md`'s exemption for 3.7 re-read against what shipped

## Done when

1. Six criteria, six verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is, and every falsified sentence
   above is amended with a date
4. `pnpm verify` passes, `pnpm test:database` passes, and `pnpm links` resolves
   every reference added

---

## What was done — 2026-09-23

### 1. The acceptance walk — six criteria, six verdicts, none of them _probably_

| #   | Criterion                                                                                          | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A socket bar and a backfill bar each record their own tape, readable without a constant            | **MET** (3.7.3). `writeBatch` takes the tape from `singleSourceOf(series)`; `MarketBarsTable.feed` is required on insert so omitting it does not compile; `readBars` answers `StoredBar { bar, feed }`. Three read-backs in `market-bars.database.test.ts` — `sip`, `synthetic`, a hand-inserted `iex` — plus `backfill.database.test.ts` asserting `distinct feed` is `["synthetic"]` for a fixture run of the shipped command. Break: `the-writer-stamps-a-constant`. |
| 2   | A two-tape window produces two sources, in contribution order, through the merge                   | **MET** (3.7.5). One `BarSource` per contiguous run of tape, each with the ledger's provider, the run's count and its oldest write, joined by `mergeSeriesProvenance`. Four database tests building the window through the shipped writer, four unit tests, one wire test through `app.inject()`. Breaks: `the-second-tape-is-folded-into-the-first`, `the-sources-are-written-by-hand`.                                                                                |
| 3   | `schema.ts` and the migration agree, proved by `pnpm test:database` rather than the compiler alone | **MET** (3.7.2). `EXPECTED_MARKET_BARS.feed` compared against `information_schema` both ways; the check parsed back against `MARKET_FEEDS`; `convalidated = false` asserted. The compiler covers the third direction — a column on the interface the test does not describe is `TS1360`, which is how 3.7.2's first typecheck went red.                                                                                                                                 |
| 4   | The migration applies cleanly to a store with rows in it, timed against the real table             | **MET** twice over (3.7.2, 3.7.6). Locally **0.478 s** on 48,797,343 rows against **0.456 s** on none — 22 ms apart, which is the proof it never read the table. On the **deployed B1ms tier** the migrate step took **1.251 s** inside `timeout 120`, read from the runner's log for `b9772d1`.                                                                                                                                                                        |
| 5   | No applied migration was edited, and the deploy's migrate step is still additive-only              | **MET** (3.7.2, 3.7.6). `migrate.database.test.ts`'s checksum test is green. Additive was **demonstrated** rather than asserted: the previous build (`main` at `b9772d1`) was compiled in a worktree and stored 9,750 bars through the migrated nine-column table, every row answering `sip` on the default.                                                                                                                                                            |
| 6   | `pnpm verify` passes, and `pnpm test:database` passes against a real server                        | **MET.** Green at every task's close and at this one; `pnpm test:database` **188/188**, `pnpm invariants` **21 hold**.                                                                                                                                                                                                                                                                                                                                                  |

**The walk is an assembly and re-took nothing**, which is what Task 3.7.6's
amendment asked for. Every figure above has a dated home in a task file or in
`TAPE.md`.

### 2. The upward sweep — five live claims were still standing, and one was in code

The greps the task file names came back with the two it predicted already
amended (`CLAUDE.md`'s _no server this product runs_ and `MARKET-DATA-API.md`'s
_source disagrees_, both swept on the day they were falsified). **Five more were
live and are now amended with a date:**

- **ADR 0020 §8** said the ledger _is now also the answer to "which tape is
  this"_ and that the write refuses a source disagreeing with the row. Both
  halves have moved: the tape is per bar, the ledger's `feed` is read by
  nothing, and the refusal is three named reasons.
- **ADR 0021** carried a **reversal trigger** — _a second feed writing into one
  `(security, timeframe)` series_ — which **fired and was honoured**. Its
  amendment says so, and says which part of its argument is _not_ reversed: the
  wire still carries provenance per series and never per bar.
- **`BARS.md` §8.3 and §8.4** — the row gained 4 bytes, on rows written after
  `0010` and on none of the 48 million already stored. 195 → 199 B/row new,
  8.66 → 8.84 GiB a year, ~2.6 → ~2.55 measured years, and **~2.4 against the
  calendar ceiling either way**. This was the one item the task file still
  listed as owed; it is taken from 3.7.1's measurement rather than re-measured,
  which is the pragmatic reading and is stated as such.
- **`LIVE-DATA.md` §on the two-feed ledger** and **`PROVENANCE.md` §12** both
  said the state has no producer. A server produces it now; no deployed store
  holds two tapes until Story 3.8, and the frontend's sixteen recorded bodies
  are unchanged — so `twoFeedStitchView()` is still how a browser reaches it.

**And one in shipped code, which is the find of this close.**
`ForeignSourceError`'s original doc comment was **orphaned** — since 3.7.4
rewrote the class it sat above `ReplayedSeriesError`'s own comment, attached to
nothing, two `/**` blocks back to back. It still described the ledger as holding
one source per series, and its closing paragraph named a case that **does not
exist**: _`pnpm backfill` under `MARKET_DATA_PROVIDER=fixture` stores invented
prices_ — which Task 3.7.6 disproved by running exactly that and watching it go
to the real vendor, because the command resolves `createAlpacaProvider`
directly. The block is deleted; the one point worth keeping moved onto
`ForeignSourceReason`'s `provider` bullet, with the case that **is** real
(`backfill.database.test.ts` passing the fixture provider as a dependency).

**Why a grep found it and a reader had not:** a doc comment attached to nothing
is invisible to every tool in this repository — it typechecks, lints and
formats, and the editor shows the _other_ comment on hover. Only the string in
it gave it away.

### 3. The hand-offs — six recipients, four were missing

Enumerated by grepping this story's documents for every `Story N.M` and
`Epic N`, then checking each recipient's own file, which is the procedure
`CLAUDE.md` prescribes because a pointer is what a reader follows when they
already know to look.

| Recipient      | Mentions in its own file, before | Verdict                                                                        |
| -------------- | -------------------------------: | ------------------------------------------------------------------------------ |
| **Story 3.8**  |                                8 | **present** — written by 3.7.4's and 3.7.6's sweeps                            |
| **Story 3.9**  |                                5 | **present** — written by 3.7.5's sweep                                         |
| **Story 3.10** |                                0 | **missing** — written now, and it is a **nil** hand-off                        |
| **Story 3.11** |                                0 | **missing** — written now: two figures and one condition                       |
| **Epic 13**    |                                0 | **missing** — written now: the tape is the column replay was waiting for       |
| **Epic 14**    |                                0 | **missing** — written now: a measured cost of the deploy rather than of a page |

**Four of six.** The two that were present are the two whose constraints were
written **on the day they were measured** rather than saved for the close —
which is the argument for the same-day rule, made by this count rather than
asserted.

**Story 3.10's is deliberately nil and says so.** Nothing this story built
changes a degraded state, and writing that down is what stops a later reader
wondering whether it was considered.

### 4. `CLAUDE.md`, and a sentence of its own that had gone stale

_Current state_ gained the story's paragraph — the column, the writers, the
second tape, the sources derived from rows, and that **nothing on a screen reads
it yet**. _Where the record lives_ gained `TAPE.md`'s row beside ADR 0034. The
_Data layer_ trap already carried the lock half, swept by 3.7.6 on the day it
was measured.

**And its rehearsal sentence was false.** _What they still cannot do_ said
`LIVE-REHEARSAL.md`'s rows for 3.4, 3.5 and 3.6 _are empty until somebody opens
the deployed site while the market is open_. They were filled on 2026-09-22 by a
headless watch. The paragraph now strikes that clause and says what was seen,
including the venue-word finding handed to Story 3.10, and leaves _a person
looked_ to the owner. Not this story's measurement, but this story's close was
where the grep ran.

### 5. The rehearsal exemption, re-read against the test that broke Story 3.5's

**It holds.** Story 3.5's exemption fell because two of its tasks were
**repairs** that changed a surface without appearing in a scope. This story
shipped no repair to a surface: the only user-visible consequence of anything in
it is a served answer's `provenance.sources`, which no shipped screen reads
until Story 3.9, and the source note renders no feed clause for an empty series.
`LIVE-REHEARSAL.md` is unchanged and 3.7 stays off the table, as its own rules
require.

### 6. Gates

`pnpm verify` green; `pnpm test:database` **188/188**; `pnpm invariants`
**21 hold**; `pnpm links` **0 broken** over 391 documents and 1,472 cross-file
links. **`pnpm e2e` not run**, and the reason is the same as 3.7.6's: the only
source file this task touches is a deleted comment block, so the browser suite
is out of scope for what it can break; CI runs it on the pull request.

## For a stakeholder — a status report, 2026-09-23

**Story 3.7 is finished.** Over seven tasks the product's database learned to
record which exchange feed every stored price came from, to hold two feeds for
one security side by side, and to tell a chart exactly which stretch of it came
from which — and this last task checked the work against its own promises,
corrected the documents it had made out of date, and handed what it learned to
the teams that need it next.

**All six of the story's acceptance criteria are met**, each with a named test,
a deliberate break, or a measurement with a date. Nothing was recorded as
_probably_.

**What this task itself found.**

- **Five statements elsewhere in our documentation had quietly become wrong** —
  two architectural decision records, the storage sizing notes, and two
  documents about live data, all of which said the product could not do
  something it can now do. Each was corrected with a date beside the original
  rather than rewritten, so the history stays readable.
- **One wrong comment was in the shipped code itself**, and it is the more
  interesting one. It described the old rule, sat above the wrong piece of code
  after an earlier task moved things, and confidently gave an example that the
  previous task had already proved false. Nothing automated could see it: an
  explanation attached to nothing still passes every check we have. It is
  deleted, and the one useful sentence in it was moved somewhere it is true.
- **Four of the six teams who need to know something from this work had not
  been told.** The two that had were told on the day the thing was measured,
  rather than at the end. That is the case for our rule about sweeping the same
  day, made by a count rather than by an argument.

**What the storage costs, since it is the one number a stakeholder may want.**
The new column adds four bytes to prices stored from now on and nothing at all
to the forty-eight million already there. That is about 2% of the annual growth,
and it does not move the plan: we still expect roughly two and a half years
before the database needs attention. A leftover index nobody reads is twenty-five
times more expensive than the entire new column.

**What a user can see today: still nothing**, and that was the story's own
promise from the first line of its description. The two stories that follow are
the payoff, in order: the next one stores the live trading session, so a page
reloaded mid-day shows today; the one after puts a sentence on screen saying
which exchange each part of a chart came from — the sentence this product
promised never to fake, and which until this week no server we run could have
produced honestly.
