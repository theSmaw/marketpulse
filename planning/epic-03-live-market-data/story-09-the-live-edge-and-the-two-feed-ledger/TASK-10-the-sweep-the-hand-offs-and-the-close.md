# Task 3.9.10 — The sweep, the hand-offs and the close

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.9

## Objective

Close the story: nine criteria, nine verdicts; sweep **upward** for the
sentences this story falsified; push its constraints **sideways** into the
stories that read what it drew.

## What the user can see when this lands

**Nothing new.**

## The upward sweep — known candidates, each to be checked rather than assumed

- **`CLAUDE.md`'s _What a user can see today_.** A chart that reaches now is the
  most visible change in this epic and the paragraph does not mention it. The
  _What they still cannot do_ paragraph almost certainly moves too
- **`CLAUDE.md`'s open item: _two shipped sentences are correct today and become
  false the first time an IEX tail is stitched on_.** This story answers one of
  them (Task 3.9.8) and the entry has been amended three times without being
  closed. Close the half that is closed and say which half is not
- **`CHARTING.md`** — the coverage rule, the states, and the figures. A live
  edge is the coverage edge moving, which that document anticipated and has
  never seen
- **`VOLUME-AND-WINDOW.md`** — the answer that stays on screen while a request
  is in flight was designed against a **fetch**. A series that grows without a
  request is a third case
- **`PROVENANCE.md` and `docs/GAPS.md`** — the entries about the two-feed
  state's producer, amended at Story 3.8's close to say it is a **mid-session**
  state. If this story photographs it from production, that changes again
- **`FRONTEND-STATE.md`** — the store, the cache and what a page announces. A
  series that changes without a fetch touches all three
- **ADR 0023's reversal trigger**, evaluated in writing by Task 3.9.5. Record
  the verdict where the ADR is, not only in the task
- **ADR 0027 and ADR 0028** — the renderer and the window vocabulary. Neither
  contemplated a frame whose last slot arrives on its own

## The hand-offs, enumerated rather than remembered

Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:` line,
check each recipient's **own** file, and **record the count that were missing**,
including if it is zero. Story 3.8's close found six recipients and six
incomplete; Story 3.7's found five constraints for one story and missed a story
its own findings document named in as many words.

Known candidates:

- **Story 3.10** — what the plot does when the feed stops mid-session with half
  a session drawn is explicitly its own, and this story builds the thing that
  stops. Say exactly what shape a stopped edge takes now
- **Story 3.11** — the deployed re-take of every figure this story measures, and
  §28's p95 against the **deployed** gateway rather than a loopback
- **Epic 5** — anomaly marks have room reserved on this chart, and the series
  they compute over now ends at a moving edge
- **Epics 8 and 9** — the comparison series and the filing lane, same frame
- **Epic 13** — a replayed session's chart is this chart with a different clock,
  and `SERVED_TAPE_RANK` is a serving preference that replay must not inherit

## Work

- Nine criteria, nine verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_
- The upward sweep, live claims amended with a date and historical records left
  standing
- The hand-off enumeration, with the count
- `CLAUDE.md`'s _Current state_ and _Where the record lives_
- `LIVE-REHEARSAL.md`'s row for 3.9, or the recorded reason there is none
- Delete `scripts/session-watch.mjs` if its findings are recorded — _run it,
  record the findings, delete it_ — and check the findings quote at least one
  frame, body or row **verbatim** before deleting the thing that produced them

## Done when

1. Nine criteria, nine verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is
4. `pnpm verify`, `pnpm test:database` and `pnpm links` pass
