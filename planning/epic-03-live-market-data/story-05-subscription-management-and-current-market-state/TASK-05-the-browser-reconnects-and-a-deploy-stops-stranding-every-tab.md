# Task 3.5.5 — The browser reconnects, and a deploy stops stranding every open tab

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.4

## Objective

Give the browser's socket a retry. **This is a live defect, not a feature.**

Story 3.3 shipped the browser's WebSocket with no reconnection, so **every
backend deploy leaves every open tab reading `DISCONNECTED` until somebody
reloads** — and deploys happen on every merge to `main`. Moved here from Story
3.10 on 2026-09-19 by that story's close.

## What the user can see when this lands

**The second visible change of this story, and the one with the widest reach:
the application stops needing to be reloaded.**

A tab left open across a deploy — which is every tab, on every merge — currently
sits reading `DISCONNECTED` forever with stale numbers beside it. After this it
goes away for a few seconds and comes back **with the prices it missed**,
because the snapshot built in 3.5.4 is exactly the catch-up mechanism.

This is worth showing a stakeholder precisely because it is the failure they are
most likely to have already hit by accident.

## Why it belongs here rather than at Story 3.10

Two reasons, both from 3.10's own close:

- **This story owns the snapshot**, which is what a reconnecting browser needs
  to catch up with what it missed. A reconnect without one produces a tab that
  is connected and blank.
- **The browser's socket shares none of the constraints 3.10 argues reconnection
  against** — no vendor connection limit, no fifteen-minute embargo, no rate
  limiter. Those are facts about the **upstream** socket, which stays 3.10's.

## The signal that already exists and that nothing reads

The gateway sends **`1001 going away`** on shutdown (§12.2). §8.5 measured that
an **abnormal** close carries no such information.

So the browser can **tell a deploy from a network failure before deciding how
eagerly to retry** — a `1001` is _we are coming back in a few seconds_, and a
socket that simply died is _back off_. The signal is on the wire today and
nothing looks at it. Using it is the difference between a considered reconnect
and a retry loop.

## Work

- Retry the browser socket, with backoff, distinguishing `1001` from an abnormal
  close
- **Stop retrying when the page is hidden**, and resume on visibility — a
  backgrounded tab reconnecting on a schedule is a battery and a bill
- On reconnect, the snapshot replaces what the page holds; nothing clears in
  between, because §36's _displaying data through 10:42:17_ means the numbers
  **stay on screen** while the connection is gone
- The chrome's connection word must move `DISCONNECTED` → `LIVE` **without a
  reload**, which is the assertion this task exists for
- **The arrival mark must not fire on the reconnect snapshot**, for 3.5.4's
  reason — a reconnect is not 518 bars arriving

## Done when

1. Killing and restarting the backend under a loaded page brings the page back
   **by itself**, with no reload, asserted in a browser spec
2. A `1001` close retries sooner than an abnormal close, and both are bounded
3. A hidden tab does not retry on a schedule
4. Numbers, regions and the venue stay exactly as they were **while**
   disconnected — the existing Story 3.3 assertion must still pass
5. The reconnect snapshot fires no arrival marks
6. `pnpm break` proves the reconnect assertion goes red without the retry
7. `pnpm verify` passes

## What this task must NOT do

**Fill the gap.** What is missed while away is **gone** — measured 2026-09-17 by
Task 3.1.9 — and recovering it needs the store, which is Story 3.9's, and a
gap-fill policy, which is Story 3.10's. A reconnect that silently invents the
missing minutes is worse than one that plainly resumes.

**Reversal trigger, as a condition:** the first surface where a gap in the
middle of a series is visibly wrong rather than merely absent — a chart that
draws a straight line across four missing minutes as though nothing happened.

---

## Amended by Task 3.5.4 — 2026-09-21: the hard half of this task is already done

### The arrival mark on a reconnect is handled, and you inherit it

This task's own work list says _the arrival mark must not fire on the reconnect
snapshot — a reconnect is not 518 bars arriving._ **That is already true**, and
not by luck.

3.5.4 added the rule the whole vocabulary now rests on — **a snapshot is not an
arrival** — and implemented it on **delivery rather than content**:
`LiveFeedConnection.fromSnapshot` records which symbols are sitting on a
snapshot baseline, and a `snapshot` message **replaces** that set wholesale.

So a reconnect sends a snapshot, every symbol it carries becomes a baseline
again, and nothing marks. **Verify it rather than assume it**, but expect to
write an assertion rather than a mechanism.

### What this task must NOT do to that rule

- **Do not mark the reconnect itself.** The temptation is a one-off flourish
  saying _we are back_. The chrome's connection word already owns _is data
  arriving_ (§11.2), and a fourth motion behaviour costs the vocabulary the
  legibility that is its whole value.
- **Do not clear `observations` on disconnect.** §36's _displaying data through
  10:42:17_ is the standing decision, and a reconnect that blanked first would
  make the returning snapshot look like 518 arrivals however the rule is
  written.
- **Do not reconstruct the distinction from the observation.** _Ignore whichever
  observation arrives first after a reconnect_ fails for the same reason 3.5.4
  rejected it on first load: a thin security whose genuine first bar lands
  moments after the reconnect is a real arrival. §7.6 measured **2.1%** minute
  coverage for `ERIE`.

### One thing to check that 3.5.4 could not

A reconnect snapshot may carry **fewer** symbols than the previous one — the
server may have restarted and observed less. The held observation for a dropped
symbol survives in `observations` but leaves `fromSnapshot`, so the next bar for
it **will** mark. That is believed correct and is **untested**, because nothing
before this task could reconnect.
