# Task 3.8.9 — The sweep, the hand-offs and the close

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.8

## Objective

Close the story: walk the nine criteria against the tree, sweep upward for the
sentences this story falsified, and push its constraints **sideways** into the
stories that read what it wrote.

## What the user can see when this lands

**Nothing new.** But this story **does** owe a `LIVE-REHEARSAL.md` row — it is
on the ledger's list and its scope changes what a user sees — so the close is
where that row gets written or where the reason it cannot be is recorded.

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
- **`MARKET-DATA-API.md` §5 and §11**, if Task 3.8.4 did not already amend them.
- **`BARS.md` §8.3–8.4** — a live session adds rows every day the market is
  open. Story 3.7's close amended the row size for the tape column and left the
  ~2.4-year plan standing; a second writer is a **rate** change rather than a
  size change, and Story 3.11 is told to expect a figure.
- **`PROVENANCE.md` and `docs/GAPS.md`** — the entries saying the two-tape state
  has no producer on a **deployed** store. The moment production stores an IEX
  bar into a SIP window, that becomes false.
- **`0004_market_bars.sql`'s uniqueness decision** is immutable; the ADR from
  3.8.1 is its amendment. Check the ADR index lists it.

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
- The upward sweep above, live claims amended with a date and historical records
  left standing
- The hand-off enumeration, with the count
- `CLAUDE.md`'s _Current state_ and _Where the record lives_ (`LIVE-SESSION.md`
  joins the table)
- `LIVE-REHEARSAL.md`'s row for 3.8, or the recorded reason there is none

## Done when

1. Nine criteria, nine verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is
4. `pnpm verify`, `pnpm test:database` and `pnpm links` pass
