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
