# Task 3.11.9 — The ADRs, and the document that outlives the epic

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.4, 3.11.5, 3.11.6

## Objective

Criterion 5. **`LIVE-DATA.md` closed as the maintained account of how a live
observation reaches a screen**, and the decisions that outlive their tasks
written where a later reader looks first.

## What the user can see when this lands

**Nothing.** What a future reader gets is one document that wins rather than
eleven task files that disagree.

## The rule that makes this worth a task

> Where `LIVE-DATA.md` and any task file in this epic disagree, **it wins.**

That is the whole point of a subject document, and Epic 2 produced nine ADRs and
seven subject documents on the same principle. A task file is a **record of what
was true when it was written**; a subject document is a **claim about now**, and
the two need different maintenance.

## What has already been written, and must not be duplicated

**This epic has already produced six ADRs** — 0030 through 0035 — which is more
than the story's own list anticipated:

| ADR  | Subject                                                                    |
| ---- | -------------------------------------------------------------------------- |
| 0030 | replaying our own bars, and the mechanisms that stop the live feed rotting |
| 0031 | the stream seam and what a fixture-backed stream certifies                 |
| 0033 | a send instant on the wire, for measurement only                           |
| 0034 | the tape on the bar                                                        |
| 0035 | both tapes are kept, and what a record is                                  |

Plus **0026–0029** amended by this epic's work, and **ADR 0029 amended on
2026-09-24** with the rule for a claim that _stops_ being true.

**So the question is not _write the ADRs_ — it is _which decisions of this epic
still have no home_.** Candidates, each to be checked rather than assumed:

- **The motion vocabulary** and what a green suite certifies about it — nothing
  below a browser can see motion, and **nothing at all can see whether it
  helps**. `VISUAL-LANGUAGE.md` and the canvas carry it; an ADR may be the right
  home and may be redundant
- **The two thresholds on two clocks** — 165 s monotonic, 60 s wall — and
  `worseFeedStatus`, which are load-bearing and currently live in a module
- **One home for a changing claim**, which ADR 0029's amendment may already
  cover

## The seven subject documents this epic touched

`LIVE-DATA.md`, `STREAM-SEAM.md`, `TAPE.md`, `LIVE-SESSION.md`,
`LIVE-REHEARSAL.md`, `CHARTING.md` §18, `PROVENANCE.md` §13–§14. **Each needs a
verdict on whether it is finished**, and `LIVE-DATA.md` needs the explicit
statement that it is the maintained one.

## Work

- Each candidate decision checked for an existing home; an ADR written **only**
  where there is none
- `LIVE-DATA.md` closed: §0 rewritten as _if you read one section_, the
  precedence rule stated, and every figure in it dated
- The other six documents each given a one-line verdict in `LIVE-DATA.md`'s own
  map, so a reader finds them from one place
- `CLAUDE.md`'s _Where the record lives_ table checked against what exists
- **ADRs are never renumbered and their decisions are never rewritten** — a
  present-tense description that has become false gets a dated amendment beside
  it

## Done when

1. Every decision of this epic has exactly one home, named
2. `LIVE-DATA.md` states that it wins, and is true as of the day it says so
3. `CLAUDE.md` points at every subject document this epic produced
