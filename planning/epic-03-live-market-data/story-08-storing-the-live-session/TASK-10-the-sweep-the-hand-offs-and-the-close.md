# Task 3.8.10 — The sweep, the hand-offs and the close

**Status:** Not started
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
