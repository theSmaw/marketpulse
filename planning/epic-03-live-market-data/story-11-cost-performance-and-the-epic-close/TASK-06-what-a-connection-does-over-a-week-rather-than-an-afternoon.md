# Task 3.11.6 — What a connection does over a week rather than an afternoon

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

The three socket questions this story has been holding since Epic 3's spike, all
of which need **elapsed time** rather than effort — which is why they are one
task and why it should start early and finish late.

## What the user can see when this lands

**Nothing**, and the answers govern whether the deployment can hold a socket
safely at all.

## The three, and what is already known about each

### 1. The weekend hold — a run that has already been started once

`STORY.md`'s own section records the trigger as **fired** and a run **under
way** from 2026-09-19: `scripts/weekend-watch.mjs` polling `/diagnostics/feed`
every 60 s through to Monday's open.

**Check what that run produced before starting another.** The section warns that
it is a different instrument from the retired `weekend.mjs` — that one **held**
the socket and this one polls — and that the difference **bounds the
conclusion**. A poll that says the deployment is configured for `alpaca` is not
a socket that stayed up.

### 2. Does a half-open socket lock out its successor?

Handed here by Task 3.2.5. The free plan allows **one** connection, and the
failure mode that matters is a connection that is neither alive nor released.
A developer machine with no local process connected was refused
**`406 connection limit exceeded`** at 23:30 ET, verified with `lsof` against
the resolved address — so the slot is held by production, correctly.

**The question is what happens when production's own socket half-dies.**

### 3. What holds the slot — the same question asked twice

The 2026-09-19 section records this as the overlap window's question in another
form. `STORY.md`'s later table names the interesting case: **refused `406` for
materially longer than the ceiling — the slot is not freed by our close.**

## The measurement that arrived while this story waited

The 2026-09-24 session watch ran **655 minutes overnight** and **420 through a
session**, and recorded: the watcher's own socket closed **38 times in 4h 36m**
overnight, every one code **1006** with `elsewhereReachable: true`; and **twice
in 420 minutes** during the session. Two caveats travel with it and both are
recorded: the watcher runs on a laptop over a domestic link, and an overnight
socket is **idle**, which is the condition an idle timeout fires on.

**That is a second client's experience, not the deployment's own socket.** What
none of it answers is whether the **backend's** upstream connection to Alpaca
behaves the same way — which is exactly what `onLog` would have said and is Task
3.11.3's.

## Work

- The 2026-09-19 run's output found and read, or recorded as lost
- Each of the three questions answered, or narrowed with what was ruled out
- Anything that needs elapsed time **started at the beginning of this story**
  rather than at this task, and said so here
- `LIVE-DATA.md` §9 and §12 amended with what was learned
- `docs/GAPS.md` entry 7 and entry 10 re-verdicted — the contended single
  connection is the constraint every sitting in this epic has paid for

## Done when

1. Three questions, three answers or three recorded narrowings
2. Nothing in this task is waiting on a clock at the point the story closes
3. The single-connection entries in `docs/GAPS.md` say what is now known

## Amended by Task 3.11.1 — 2026-09-25: the first item is DONE, and this task no longer needs a clock

**Question 1 is discharged.** `weekend-watch.mjs`'s run was found and read:
`.capture/weekend/watch-2026-09-19.jsonl`, **1,065 samples over 55 hours**,
2026-09-19T13:56Z → 2026-09-21T20:58Z, **535 `disconnected` / 488 `live` / 1
`stale`**. The feed was down about **forty hours** — Friday's whole session and
the weekend — then **`live` at 05:45Z on the Sunday**, unattended, and up
thereafter. _Monday's open is still at risk_ is answered: **it was not.**

Two caveats travel with it and are in Task 3.11.1's record: the `poll-failed`
stretches are the watching laptop asleep, and this is `/diagnostics/feed`'s own
`status` — the **backend's** view of its socket, not a browser's.

**The consequence for this task is a re-characterisation rather than a
deletion.** It was written as _the one that needs elapsed time rather than
effort_, with an instruction to start it when the story starts. **That is no
longer true.** What remains is questions 2 and 3, and they are the **same
measurement**: one log read on a deploy that rolls a replica while the feed is
connected. Tasks 3.11.2 and 3.11.3 will each cause one.

**So this task is now two cheap observations and can be taken whenever the next
deploy lands during a session** — it does not have to be started early and it
does not have to wait for a weekend.

> **And it inherits one question it did not have.** Nobody can say **what
> recovered the feed** on that Sunday. No restart is recorded in the window,
> and the eight diagnostic events that would have said were not being logged.
> **This task cannot answer it retrospectively** — the evidence does not exist —
> so the honest disposition is that Task 3.11.3 makes the _next_ one
> answerable, and this task records that the previous one is not.
