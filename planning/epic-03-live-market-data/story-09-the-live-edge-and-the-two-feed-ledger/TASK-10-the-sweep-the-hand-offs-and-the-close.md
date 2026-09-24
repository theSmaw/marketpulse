# Task 3.9.10 — The sweep, the hand-offs and the close

**Status:** **Complete — 2026-09-24. The story does NOT close**, and the reason is one criterion and one clock: criterion 8 needs a person on the deployed site with the market open, and this task ran six hours before the bell. **Eight of nine met, one honestly not.** Six recipients enumerated and **three were missing** — Story 3.11, Epic 5 and Epic 8 — all three now written into their own files. `CLAUDE.md` describes a chart that extends. `scripts/session-watch.mjs` is **deliberately not deleted**, and that is argued rather than skipped.
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

---

## What was done — 2026-09-24

### Nine criteria, nine verdicts, none of them _probably_

| #   | Criterion                                                                   | Verdict                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reaches the current minute, and **extends**                                 | **MET.** First half by Task 3.8.3, second by Task 3.9.2. `security-live-edge.spec.ts` — _the line is longer a minute later, with no reload_, asserting the **sentence and the drawn point count**                    |
| 2   | Two-feed series names both stretches, in order, with counts                 | **MET.** `market-data.test.ts` on the stored path and `serve-series.test.ts` on the stitch, both named in Task 3.9.7. The **deployed photograph** is still owed and is Task 3.8.10's                                 |
| 3   | The live stretch names a single venue, with the sentence                    | **MET**, and its harder half is now a check: `the-consolidated-word-has-one-producer` (Task 3.9.7), with `pnpm break a-live-stretch-gets-epic-2s-word`                                                               |
| 4   | `twoFeedStitchView()` gone, state from a recorded body                      | **MET.** `two-feed.json`, `sip` ×60 then `iex` ×30, read off this product's own server. `the-two-feed-state-comes-from-a-recorded-body` + `pnpm break the-two-feed-state-is-typed-again`                             |
| 5   | The market-claim sentence repaired, one home, a second copy fails the build | **MET**, and it was **two** sentences. `describeSilence`; `the-market-claiming-sentence-has-one-home` + `pnpm break the-market-claiming-sentence-gets-a-second-home` (Task 3.9.8)                                    |
| 6   | No routine main-thread task over 50 ms while extending                      | **MET at both densities reachable here** — 7.2–8.1 ms and 12.3–13.2 ms of script a burst, **zero** frames over 50 ms across 160 bursts (`CHARTING.md` §18). **The 9,750-bar cap is unmeasured**, and is Story 3.11's |
| 7   | Reading strip, crosshair and keyboard walk at the edge                      | **MET**, in the harder form the premise change produced: a reading **holds its instant** and **updates in place** on a revision, both asserted in `security-live-edge.spec.ts` (Task 3.9.6)                          |
| 8   | Four viewports probed; **a person watched** during a live session           | **NOT MET.** The probe half is done, with the market **shut**. The person half needs the bell, and this task ran at 03:30 ET                                                                                         |
| 9   | `pnpm verify` passes                                                        | **MET.** Green at every task, and at this one, with **26 invariants**                                                                                                                                                |

**So the story does not close.** One criterion, one clock, and no amount of
effort tonight changes it — which is exactly the case `LIVE-REHEARSAL.md`'s
first rule exists for.

### The hand-offs — six recipients enumerated, THREE were missing

Enumerated by grepping this story's ten files for every `Story N.M`, `Epic N`
and `Owner:` line, then checking each **recipient's own** file rather than this
one. Past stories (3.2, 3.4–3.8) were swept as each task landed and are not
re-counted here.

| Recipient  | Carried it already?                                              | Action                                                                |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| Story 3.10 | **Partly** — §1 named Story 3.9 as _the surface that will exist_ | Amended: the surface exists, and its stopped shape is a straight line |
| Story 3.11 | **No**                                                           | Four figures to re-take, and the method note about the observer       |
| Epic 5     | **No**                                                           | The series ends at a moving edge; three constraints                   |
| Epic 8     | **No**                                                           | The comparison shares a frame that grows; ADR 0023's named trigger    |
| Epic 13    | **Yes** — names `SERVED_TAPE_RANK` and the read decision in full | None                                                                  |
| Epic 14    | **N/A** — its trigger is a condition and did **not** fire        | Recorded below rather than written there                              |

**Three of six were missing.** Story 3.8's close found six of six incomplete
and Story 3.7's missed a story its own findings named; three of six is better
and is not good. The pattern holds in the same direction every time: the
recipients that get missed are the ones **furthest away** — an epic rather than
the next story.

> **Epic 14's trigger, evaluated in writing because a trigger nobody evaluates
> never fires.** The condition is _the first time a second surface on this page
> renders per-row markup at universe scale_. **It did not fire.** The chart is a
> second surface on the security page, and it renders **13 drawn elements at
> 6,630 bars** — the opposite of per-row markup, and the reason the per-burst
> cost is 7–13 ms rather than the table's. The trigger stands unchanged.

### ADR 0023's verdict, recorded where the ADR is

Task 3.9.5 evaluated the reversal trigger — _the first piece of state two
features must agree about that neither owns_ — and it has **not** fired: the
axis is state **one** component owns and two consume through its context, so a
disagreement is unrepresentable rather than prevented. **The live edge is
evidence _for_ the no-store position**: the thing the task was written to watch
for happened, and produced no coordination problem at all.

That verdict is now in **Epic 5's and Epic 8's own files**, naming each of them
as what would fire it, rather than only in a task nobody downstream reads.

### `scripts/session-watch.mjs` is NOT deleted, and that is the decision

The task says _delete it if its findings are recorded_. **Its findings are not
finished being produced.** It has been running against the deployed gateway
since 22:42 ET on 2026-09-23 for 1,000 minutes, which covers the whole of the
2026-09-24 session — the session that criterion 8, Task 3.8.10's photograph,
Task 3.8.7's correction count and Task 3.5.8's five vendor figures are all
waiting on.

**Deleting the instrument tonight would spend the scarce thing twice**, which
is the exact failure `LIVE-REHEARSAL.md`'s one-sitting list exists to prevent.
It goes when the sitting is recorded — **owned by Task 3.8.10**, which owns the
row it is filling.

What it has already produced **is** recorded, with a row quoted verbatim, in
`LIVE-REHEARSAL.md` beside the empty 3.9 row: 377 feed samples over 4 h 36 m,
376 reading `live` / `iex`, and 38 socket closes at code 1006.

### The upward sweep

| Document                        | Swept?                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md` _Current state_     | **Yes** — a chart that extends, the three noes, the reading's two directions, and the 7–13 ms                                        |
| `CLAUDE.md` open item           | **Yes** — _two shipped sentences_ closed on **both** halves after three amendments that closed neither; what remains is a photograph |
| `CLAUDE.md` record table        | **Yes** — `CHARTING.md`'s row names §18                                                                                              |
| `CHARTING.md`                   | **Yes** — §18, added by Task 3.9.9                                                                                                   |
| `PROVENANCE.md`, `docs/GAPS.md` | **Yes**, by Task 3.9.8 on the day it falsified them                                                                                  |
| ADR 0029                        | **Yes**, by Task 3.9.8 — a dated amendment beside a prediction that came true twice                                                  |
| ADR 0023                        | **Yes** — verdict carried into Epics 5 and 8 rather than left in a task                                                              |
| `VOLUME-AND-WINDOW.md`          | **No, and deliberately** — the canvas holds it: `Volume and window.dc.html` §14 (Task 3.9.5) is the source of truth under ADR 0026   |
| `FRONTEND-STATE.md`             | **No, and deliberately** — ADR 0023's trigger did not fire, so the store, the cache and the URL are unchanged by this story          |
| ADR 0027, ADR 0028              | **No, and deliberately** — neither decision moved. §18 is a figure about the renderer, not a change to it                            |

### Gates

`pnpm verify` green (**26 invariants**, 2,398 tests), `pnpm test:database`
green (**211 tests**), `pnpm links` green (1,527 links). No product code
changed in this task.

> **One flake, reported rather than swallowed.** The first `pnpm verify` of
> this task failed **one** process test — `market-gateway.process.test.ts` —
> against a tree in which nothing but Markdown had changed. It passed in
> isolation immediately and passed in a full re-run after the leftover
> `vite preview` from Task 3.9.9 was killed; load average was **11.0** at the
> failure with a dev pair, a preview server, Storybook and the session
> watcher's headless browser all running. **This machine's contention has
> produced exactly this shape twice in this epic** — a process or browser test
> failing on timing while the change under test cannot reach it. Recorded
> because a flake nobody writes down is a flake somebody later reads as a
> regression.
