# Task 3.8.10 — The sweep, the hand-offs and the close

**Status:** **Complete — 2026-09-24.** Nine criteria, nine verdicts, and **one of them is _met in the tree and unwitnessed in production_** rather than a clean yes. The upward sweep corrected four live sites that still quoted the stored feed's coverage for the live stream — the third time this epic has paid for a correction that was recorded and not propagated — and amended six documents the story falsified. Six recipients were enumerated and all six needed something written. `pnpm store:bare` now truncates rather than refusing at the end, and `prepare-indexes.ts`'s silent half is an invariant with a break behind it. **And the story's own headline was read off production**: the overnight reconciliation ran for real on 2026-09-23 and the served answer names one source, exactly as the rehearsal predicted — which also means the two-feed note is a **mid-session** state on a deployed store, a narrowing nobody had written down.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.9

## Objective

Close the story: walk the nine criteria against the tree, sweep upward for the
sentences this story falsified, and push its constraints **sideways** into the
stories that read what it wrote.

## What the user can see when this lands

**Nothing new.** But this story **does** owe a `LIVE-REHEARSAL.md` row — it is
on the ledger's list and its scope changes what a user sees — so the close is
where that row gets written or where the reason it cannot be is recorded.

**Two things that row owes specifically, named 2026-09-23 by Task 3.8.3**,
because that task proved both against a store rather than against production
and the difference is the whole point of a rehearsal:

- **A reload during a real session, on the deployed site**, keeping today's
  chart. 3.8.3 confirmed criterion 2 in a browser against CI's bare store with
  the **fixture** feed, which the task sanctioned because the market was shut
  at 23:18 EDT when it landed. The deployed version of that is one sitting
  with the market open, and it is the story's headline.
- **A photograph of the two-feed source note from a DEPLOYED store.** 3.8.3
  produced it locally — `5,460 bars All US exchanges` / `30 bars IEX` with the
  one-venue sentence — but the `iex` bars behind it were written by an
  instrument and removed afterwards. On production the same sentence arrives on
  its own, the first session after the writer deploys, with real IEX prices in
  it. It is the most showable artefact this story has and nothing else owns
  taking it.

## The upward sweep, which this story owes a lot of

Story 3.7's close found five live claims still standing and one stale comment in
shipped code, and the lesson it recorded is that the two hand-offs which were
**not** missing were the two written on the day they were measured. Sweep as you
go; this list is what remains at the close.

Known candidates, each to be checked rather than assumed:

- **`CLAUDE.md`'s _What a user can see today_** — the paragraph about the store
  and the one about what they still cannot do. A reload keeping today is a
  visible change and belongs there.
- **`LIVE-DATA.md` §10.3** — _the backend holds only the last bar per security,
  not today's bars, because Story 3.8 is about to hold them durably._ That
  sentence becomes past tense; check it says so.
- **`MARKET-DATA-API.md` §5 and §11**, if Task **3.8.6** did not already amend
  them — corrected 2026-09-23, this read _3.8.4_, which owns the read path's
  duplicate-minute repair and never touches those sections. 3.8.6 is the task
  told to re-read them.
- **`BARS.md` §8.3–8.4** — a live session adds rows every day the market is
  open. Story 3.7's close amended the row size for the tape column and left the
  ~2.4-year plan standing; a second writer is a **rate** change rather than a
  size change, and Story 3.11 is told to expect a figure.
- **`PROVENANCE.md` and `docs/GAPS.md`** — the entries saying the two-tape state
  has no producer on a **deployed** store. The moment production stores an IEX
  bar into a SIP window, that becomes false.
- **`0004_market_bars.sql`'s uniqueness decision** is immutable; the ADR from
  3.8.1 is its amendment. Check the ADR index lists it.
- ~~**`migrations/README.md` §9 and `CLAUDE.md`'s _Data layer_ trap**~~ —
  **done by Task 3.8.3 on the day, 2026-09-23**, which is the shape Story 3.7's
  close said works. Both now say the deployed backend writes bars inside the
  deploy window, in the image about to be replaced, and that the writer is
  caught-and-logged rather than loud. **Check rather than redo**: what this
  close owes is a read of whether anything else in the tree still assumes the
  backfill is the only writer.
- **The live IEX coverage figure, which was still wrong in three places on
  2026-09-23.** `ALPACA.md` §5.2's **82.8% / 43.1%** measures the _stored_
  `feed=iex` REST endpoint; `LIVE-DATA.md` §7.6 measured the _live stream_ at
  **65.1% / 2.1%** and struck the old pair for it on 2026-09-16. The strike did
  not propagate: two live sites in `LIVE-DATA.md` itself, one in
  `epic-04-market-overview/EPIC.md` and one inherited into Task 3.8.9 were all
  corrected on 2026-09-23. Epic 2's own records keep 82.8% and are **right** —
  they are about the historical endpoint. **At the close, grep `82.8` again and
  check each hit says _stored_.** This is the third time this epic has paid for
  a correction that was recorded and not propagated.
- **The reads that assume one row a minute, and whether the list is finished.**
  Two were found by being met rather than by looking — `readSeries` (a 500,
  Task 3.8.4) and `readLastCloses` (a fabricated +49.8% move, Task 3.8.5). Task
  3.8.5 audits the rest and records the answer; at the close, **check that the
  audit was written down rather than performed**, because an audit whose result
  lives only in a diff is one the next person repeats.
- **`TAPE.md` §8 and ADR 0035**, both of which describe a window's sources as
  derived from the stored rows. Since Task 3.8.4 they are derived from the rows
  **the answer contains**, which is a narrower and more accurate claim. Check
  each says so, and that neither still implies a served window names every tape
  the store holds for it.
- **`docs/GAPS.md`'s stale-store entry**, amended twice on 2026-09-23 — once
  wrongly, then corrected. Check it still reads as _the procedure stands, the
  example was repaired_, and that no other entry describes the 90 px panel jump
  as a live defect.
- **`BARS.md` §8.5 and ADR 0035's cost section** — amended by Task 3.8.2's
  sweep on the day the figures moved (the key gained a column, the index shrank
  658 MB, the table fell to 8,439 MB). Check at the close that no other site
  still quotes the three-column key or the 2,915 MB figure.

## The hand-offs, enumerated rather than remembered

Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:` line,
check each recipient's own file, and **record the count that were missing** —
including if it is zero. Known candidates:

- **Story 3.9** — today's bars come from the store now, which is the dependency
  `LIVE-DATA.md` §10.3 created; and the two-feed sentence it was to produce from
  the read-time stitch may already be on screen from real data (Task 3.8.3), so
  its scope needs re-reading rather than assuming. **And one question it was
  handed has come back**: which row a chart draws when a minute holds two was
  given to 3.9 by ADR 0035 and reclaimed by Task 3.8.4, because without a rule
  the read **throws** rather than choosing badly. What is left for 3.9 is the
  **live edge** — the minute in progress, where only one tape can have a bar
- **Story 3.10** — the gap a disconnection leaves is its own, and this story
  makes it reachable: a ledger extended across a gap claims a window it does not
  hold. Say exactly what shape that takes now
- **Story 3.11** — what a live session costs a day, in rows and bytes, against
  `BARS.md` §8.4's plan; and whether Task 3.7.6's lock condition is now worth
  buying the bound for, which that entry names as its owner condition
- **Epic 13** — the rows it replays now include the IEX bar that was observable
  live, which is the point of 3.8.1's decision. Its `EPIC.md` already carries a
  section from Story 3.7's close; extend rather than duplicate it
- **Epic 5** — anomaly detection computes over stored minute bars, and after
  this story some of them are a single venue's

## Work

- Nine criteria, nine verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_
- **One residue candidate this story created, to add to `docs/GAPS.md` or to
  mechanise** (raised 2026-09-23 by Task 3.8.2): `prepare-indexes.ts`'s
  `PREPARED` list names the migration that adopts each index (`adoptedBy`), and
  **nothing checks that the migration exists** — an entry whose adopter was
  renamed or never written would build an index forever with nothing to adopt
  it, and an adopter with no entry fails a deploy once and loudly. The first is
  silent, which is the one worth a grep. It is a single `existsSync` away from
  being an invariant.
- The upward sweep above, live claims amended with a date and historical records
  left standing
- The hand-off enumeration, with the count
- `CLAUDE.md`'s _Current state_ and _Where the record lives_ (`LIVE-SESSION.md`
  joins the table)
- `LIVE-REHEARSAL.md`'s row for 3.8, or the recorded reason there is none
- **`pnpm store:bare` leaves an existing store's bars in place**, found by Task
  3.8.3 at the cost of two confusing browser-suite runs. The command reports
  _already there — bringing it up to date_ and converges the **universe**
  only, so a store the fixture feed has written to is no longer CI's shape and
  the next spec run fails against a store that looks bare and is not. It is a
  documented tool whose one promise is _518 securities and ZERO bars_. Either
  make it truncate or make it say what it did not do.

## Done when

1. Nine criteria, nine verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is
4. `pnpm verify`, `pnpm test:database` and `pnpm links` pass

## What was done — 2026-09-24

### The nine criteria, nine verdicts

| #   | Criterion                                                                           | Verdict                                        | What says so                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A minute bar is stored with its tape, ledger agreeing                               | **Met in the tree, unwitnessed in production** | `market-bars.database.test.ts`, _stores a socket bar with its tape, and the ledger agrees — criterion 1_ (Task 3.8.3), against a real store. See the caveat below — nothing observable from outside proves a row landed on the deployed store. |
| 2   | A cold load during a session serves today from the store                            | **Met, in a browser, against a fixture feed**  | Task 3.8.3's browser assertion; the deployed version is the rehearsal row.                                                                                                                                                                     |
| 3   | The same bar twice is one row and no error                                          | **Met**                                        | `market-bars.database.test.ts`, _stores the same bar twice as one row and no error — criterion 3_.                                                                                                                                             |
| 4   | A bar for the minute in progress is not recorded as complete                        | **Met**                                        | `live-bar-writer.test.ts`, _holds back a bar whose minute has not ended, and counts it_.                                                                                                                                                       |
| 5   | The overnight reconciliation behaves as decided, proved by running both paths       | **Met, and then seen for real**                | Task 3.8.9's rehearsal in `backfill.database.test.ts` — requests 1, inserted 390, live rows 40, minutes held twice 40, **one** source named. Production agreed on 2026-09-23.                                                                  |
| 6   | `observed_at` is supplied by every writer and nothing defaults it                   | **Met**                                        | The column has no default and `market-bars.database.test.ts` reads `column_default` out of `information_schema`; `live-bar-writer.test.ts`'s first test asserts the writer supplies the **bar's own** instant rather than the stream's.        |
| 7   | A growing session is not served stale from a validator written for an immutable one | **Met**                                        | Task 3.8.6's `liveAnswerTtlMs`, which expires at the next minute boundary rather than five minutes later; `pnpm break a-live-answer-is-held-across-the-minute-it-changes`.                                                                     |
| 8   | `pnpm test:database` and `pnpm verify` pass                                         | **Met**                                        | Both green at this close; figures at the foot.                                                                                                                                                                                                 |
| 9   | `pnpm bars:check` still tells the truth now that two writers fill the table         | **Met, after a repair**                        | It did **not**: `bar_count` counts rows, so a correctly reconciled security tripped the tool's loudest line. `MAX_ROWS_PER_MINUTE = 2` (Task 3.8.9), with `pnpm break bars-check-calls-a-reconciled-session-a-fault`.                          |

**Criterion 1's verdict is the only one that is not a plain yes, and the reason
is worth the paragraph.** The writer is shipped, tested against a real store,
and deployed since 2026-09-23 ~03:15 ET. What cannot be seen from outside is
whether it has actually written a row on the deployed store, because **every
regular-session minute it could have written is shadowed by the consolidated
bar** the read prefers. A window reaching into 2026-09-23's extended hours was
asked, since the backfill never covers those minutes: it returned **no
pre-market bars at all**, and its after-hours bars came from the read-time
stitch (`retrievedAt` at the moment of asking) rather than from the store. That
is a question rather than a finding — it is one `group by feed` on the deployed
store — and it is written into `LIVE-REHEARSAL.md` beside the 3.8 row, because
that is where somebody with access will be looking.

### What production said, which is better evidence than the rehearsal and arrived free

Read off the deployed backend on 2026-09-23 at 23:48 UTC, after that night's
backfill:

```text
GET /market-data/bars?symbol=NVDA&timeframe=1m&sessions=1
  390 bars, 13:30 → 19:59
  provenance.sources: [ { provider: alpaca, feed: sip, barCount: 390 } ]   ← ONE
```

**That is Task 3.8.9's rehearsal, in production, on the first night both writers
ran.** The rehearsal predicted `sourcesNamed: [["sip", 390]]` and explained why
one source is the _right_ answer — every live minute had a consolidated version,
so nothing of the live tape survives into the answer. It did.

**And it carries a narrowing nobody had written down.** Task 3.8.3 photographed
the two-feed source note and the story treated it as a standing state. It is
not. A served window's `sources` describe **the rows the answer contains**; the
read prefers `sip` where a minute holds both (Task 3.8.4); and the backfill
covers every regular-session minute. So on a deployed store:

| When a reader looks                                   | What the note says                   |
| ----------------------------------------------------- | ------------------------------------ |
| a window whose last session is **today, market open** | two stretches, in contribution order |
| the same window **after that night's backfill**       | **one** stretch, `sip`               |

The stretches that survive the night are **extended hours**, which the writer
keeps and the session fetch never asks for. Propagated to `TAPE.md` §8, ADR
0035, `PROVENANCE.md`, `docs/GAPS.md`, `CLAUDE.md`, Story 3.9 and
`LIVE-REHEARSAL.md`, because the instruction _photograph the two-feed note from
a deployed store_ is unachievable as written without it.

### The upward sweep — eleven candidates, six amendments

| Candidate                                                   | Found                                                                                                           | Done                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` _What a user can see today_                     | Still said nothing on screen reads the tape and no deployed store holds two tapes                               | **Amended** — a new paragraph on the writer, both tapes, and the mid-session window; plus the open-items entry lower down |
| `CLAUDE.md` _Where the record lives_                        | `LIVE-SESSION.md` absent                                                                                        | **Added**, beside ADR 0035                                                                                                |
| `LIVE-DATA.md` §10.3                                        | Future tense — _a thing Story 3.8 is about to store durably_                                                    | **Amended** to past tense; the obligation is discharged                                                                   |
| `MARKET-DATA-API.md` §5 and §11                             | Already amended by Task 3.8.6 on the day                                                                        | **Checked, not redone**                                                                                                   |
| `BARS.md` §8.3–8.4                                          | The tape column's +4 bytes was there; the **second writer** was not                                             | **Amended** — a rate change, ADR 0035's +69%/+6.1 GiB/~1.5 years, and it is a ceiling rather than a measurement           |
| `BARS.md` §8.5, ADR 0035's cost                             | Already amended by Task 3.8.2; `2,915 MB` and the three-column key survive only in the amended historical table | **Checked, not redone**                                                                                                   |
| `PROVENANCE.md` / `docs/GAPS.md` two-tape producer          | Both still said no deployed store produces it                                                                   | **Amended**, with the production reading                                                                                  |
| `0004_market_bars.sql` / the ADR index                      | Migration immutable; index lists 0035                                                                           | **Checked**                                                                                                               |
| `migrations/README.md` §9 and `CLAUDE.md`'s data-layer trap | Done by Task 3.8.3 on the day                                                                                   | **Checked**; nothing else in the tree still assumes the backfill is the only writer                                       |
| The live IEX coverage figure                                | **Four live sites still quoting the stored 82.8% for the live stream**                                          | **Amended** — see below                                                                                                   |
| The one-row-a-minute read audit                             | Task 3.8.5 wrote it down rather than only performing it                                                         | **Checked**                                                                                                               |
| `TAPE.md` §8 and ADR 0035                                   | Both implied a served window's sources come from the stored rows                                                | **Amended** — from the rows the **answer** contains                                                                       |
| `docs/GAPS.md` stale-store entry                            | Correct — _keeps its procedure, loses its example_                                                              | **Checked**; and one **other** entry still described the 90 px as live — amended                                          |

**The coverage figure, for the third time.** `ALPACA.md` §5.2's **82.8% /
43.1%** is the **stored** `feed=iex` endpoint; `LIVE-DATA.md` §7.6 measured the
**live stream** first-hand at **65.1% / 2.1%** and struck the old pair on
2026-09-16. Grepped again at this close: **21 files**, of which Epic 2's records
are right (they are about the historical endpoint) and the live-stream sites
split three ways — corrected already (`LIVE-DATA.md`, `epic-04`, Task 3.8.9),
carrying an in-file correction (Stories 3.6, 3.9, 3.10), and **four with no
correction anywhere in the file**: `LIVE-REHEARSAL.md`, `epic-13/EPIC.md`,
`epic-05/EPIC.md` and **`epic-03/EPIC.md` — this epic's own file**. All four
amended, each with the date and the reason the two figures are both correct
about different subjects.

The lesson is the one already written down and paid for a third time: **a
correction recorded is not a correction propagated.** The cheap mechanical form
of this would be an invariant asserting that `82.8` never appears within N lines
of the word `live` — not written, because the false-positive rate on a
repository that discusses both figures deliberately would be the whole list.

### The hand-offs — six recipients, six edits, none of them already complete

Enumerated by grepping this story's documents for every `Story N.M`, `Epic N`
and `Owner:` line and checking each recipient's **own** file — the sideways
sweep `CLAUDE.md` says a close does not reach by itself.

| Recipient      | Carried already                                        | Written in                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story 3.9**  | References to 3.8 throughout, and Task 3.8.4's reclaim | Today comes from the store; the two-feed note is already drawn from real data; **and it is a mid-session state**, with the table above                                                                                                          |
| **Story 3.10** | One line — _recovering it needs the store_             | The exact shape a gap now takes: the ledger is extended to the **last bar seen**, so a disconnection leaves minutes **inside a covered window with no rows**, indistinguishable from a quiet security. Three consequences, all its own          |
| **Story 3.11** | Task 3.7.6's lock condition                            | The figure nobody has taken: a real day's rows and bytes by `feed`, the duplicate fraction, and the extended-hours residue — against §8.4's arithmetic, which is a ceiling                                                                      |
| **Epic 5**     | Story 3.8's store and the unfiltered-read asymmetry    | **Some stored minute bars are now a single venue's** — so the two-tape comparison trap can happen entirely inside the store, not only across a live tail                                                                                        |
| **Epic 13**    | Task 3.8.1's and 3.8.8's sections                      | `SERVED_TAPE_RANK` **shipped** and is the opposite of replay's: a replay reading through `readSeries` gets the bar that arrived overnight, which is future information reaching a replayed instant through a helper nobody thinks of as a clock |
| **Epic 14**    | The tape column's row-size note                        | `market_bars_pkey` is now the **named funder of a shipped decision**, so not spending it makes ADR 0035's reversal trigger fire sooner                                                                                                          |

**Count: six checked, six incomplete, zero already correct.** Three carried a
sentence from an earlier task and were extended rather than duplicated
(3.11, Epic 13, Epic 14), and three had only a passing reference (3.9, 3.10,
Epic 5). That is a worse ratio than Story 3.7's close and for a legible reason:
Story 3.7 wrote its hand-offs on the days they were measured, and this story
took most of its measurements in the last three tasks.

### The residue, mechanised rather than listed

`prepare-indexes.ts`'s `PREPARED` list names the migration that adopts each
index and **nothing checked that the migration exists**. The two failure modes
are asymmetric: an adopter with no entry fails a deploy once and loudly; an
**entry with no adopter is silent** — `pnpm index:prepare` builds the index on
every deploy and reports `waiting for <migration>` for ever, which reads as
progress. It is now `pnpm invariants`' `every-prepared-index-has-its-adopter`
(one `existsSync`, **23 invariants**), with
`pnpm break a-prepared-index-loses-its-adopter` behind it — verified red for
`name a migration that does not exist` and restored byte-identical.

### `pnpm store:bare` now empties the bar tables

Its one promise is _518 securities and zero bars_, and it ran `pnpm migrate`
and `pnpm universe` — neither of which removes a bar. It **did** refuse at the
end and name the `drop database` to type, but that arrived after two screens of
migration output, which is how Task 3.8.3 lost two browser-suite runs to it. It
now truncates `market_bars` **and** `bar_coverage` (a ledger row claiming a
window whose bars have gone is a worse shape than either) and says how many rows
it removed. Safe by construction: the target is the bare store **by name**, a
database whose entire purpose is to hold none, and the developer's own store is
never opened. The refusal stays, with a new message — reaching it now means
something is writing faster than the script empties it.

### `LIVE-REHEARSAL.md`

**The 3.8 row is empty and owed, not waived**, with a sharper instruction than
the story wrote for itself: both items must be taken **while the market is
open**, and the two-feed photograph's window closes when that night's backfill
runs. The note beneath the ledger carries the production reading, the exact
query that would settle criterion 1 on the deployed store, and the fact that the
market was shut when this close was written.

### Gates

- `pnpm verify` — green, including `pnpm invariants` at **23 of 23** (one new)
  and `every-break-can-still-land`, which is what proves the markdown reflow in
  this change did not rot an anchor
- `pnpm links` — 403 documents, 0 broken
- `pnpm test:database` — **211 passed**
- `pnpm break a-prepared-index-loses-its-adopter` — red for
  `name a migration that does not exist`, restored byte-identical
- **Not re-run: `pnpm e2e`.** Nothing in this change touches the frontend, a
  route, or anything the browser suite loads — it is documentation, two
  developer scripts and one invariant. It was green on both store shapes at
  Task 3.8.9, eight hours earlier.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The last task in a story is the one where you check that the story is true.**
Not that the code works — the tests said that — but that every document
describing this product still describes the product we now have, and that the
things we learned get to the people who need them.

Unglamorous, and it caught three things worth having.

### The good news first: it worked for real, overnight, unattended

Yesterday we taught the product to write down the trading day as it happens.
Last night, for the first time, that new writer and our existing overnight job
both ran over the same trading session — which is the moment we had been
building towards and the one we could only simulate until it happened.

We asked the live system this morning what it holds for a typical security.
**It gave exactly the answer the simulation predicted**: a complete 390-minute
session, all of it from the full US consolidated feed. The live data our own
feed captured during the day is still there, underneath, preserved as a record
of what was knowable at the time — but the better version won where both exist,
which is what we decided and what the user should see.

**The thing worth appreciating**: a week ago this would have been a prediction.
This morning it is an observation.

### The finding: one of our best features has a much narrower window than we thought

Our charts tell you where their data came from. When a chart is built from two
different sources — our own live feed and the full market tape — it says so,
listing each stretch with its size. That is a genuine trust feature and the
thing our own product rules exist to protect.

Two days ago we showed it working for the first time and recorded it as a
milestone. **This task found that it only appears while the market is open.**

The reason is simple once you see it. Our overnight job fetches the full,
better version of every minute of the trading day. Once it has run, there is a
better version of every minute — so there is only one source to name, and the
two-source display correctly collapses to one. The split display is a
_during-the-day_ state, not a permanent one.

**Nothing is broken and no decision changes.** What changes is what we tell
people to expect, and when somebody has to be looking to photograph it. That
instruction is now written into five documents, including the one that tracks
what a human still needs to go and watch. A milestone nobody can reproduce
later is a milestone that quietly becomes a dispute.

### The correction we have now paid for three times

Our live feed covers about **65%** of a typical company's trading minutes. An
older, different measurement — of a _stored history_ service, not the live
feed — says **83%**. Both numbers are correct about their own subject and we
struck the wrong one for live use a week ago.

The correction did not travel. This task found **four more documents** still
quoting the optimistic figure when reasoning about the live feed, including the
planning document for this very piece of work, and two epics' worth of future
design decisions built on it. All four are corrected and dated.

That is the third time. We are recording it plainly because the pattern is the
useful part: **writing a correction down and propagating it are two separate
jobs, and doing the first feels like doing both.** We considered automating a
check for it and decided against — the two numbers appear legitimately
side-by-side in this repository often enough that the check would cry wolf.

### Two small tools that were quietly lying

- A command that builds a _replica of what our test servers see_ — deliberately
  a store with no price data — did not remove price data that had got in. It
  refused at the end and told you what to type, but only after two screens of
  output. It cost a colleague two confusing test runs. **It now empties the
  tables itself and says how much it removed.**
- A two-step database procedure — build an index in one step, adopt it in the
  next — had no check that the second step exists. If the second file were ever
  renamed, the first would rebuild the index on **every deployment, for ever**,
  printing a message that reads like progress. **That is now an automatic check
  with a test proving the check fails when it should.**

Both are the same shape of problem, and it is the one this project keeps
naming: **a failure that looks like success.** Those are the expensive ones.

### What the product can do now that it could not a week ago

**Remember today.** Open a security at half past two, reload the page, and the
chart still reaches half past two. Before this story, reloading dropped you back
to a fifteen-minute-old cliff and stayed there until that night's job ran. Out
of hours, today's completed session is drawn in full before the overnight job
has touched it.

**And it remembers honestly.** When our live feed and the full market tape both
saw the same minute, we keep **both** — not the better one. That is a deliberate
cost (roughly 69% more rows, and it takes our storage runway from about two and
a half years to about one and a half) bought for one reason: the product's
headline future feature is replaying a day as it actually unfolded, and you
cannot do that from a tidied-up record.

### What you still cannot see, honestly

**Nobody has watched any of this against the real market.** Everything above is
either a test, a simulation, or a query we ran after the market closed. The
product's own rules say a story is not truly finished until a person has looked
at it during a trading session, and that sitting is owed — by this story and by
two others, all waiting on the same thing: our data plan allows **one** live
connection, and the deployed site has it.

That sitting now has a much better brief than it would have had yesterday,
including the one-line database query that would settle the last open question
on the list.

### Where the story stands

**Ten of ten tasks. Story 3.8 is closed**, with nine acceptance criteria and
nine written verdicts — eight plain yes, and one honest _met in the code,
unwitnessed in production_. Next is the live chart edge and the two-feed
ledger, which inherits a store that already holds today.
