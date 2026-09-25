# Story 4.7 — The Overview's Degraded Set, & the 390 Question Answered

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.6
**Epic scope covered:** live market status indicators, on the screen where they matter most

## Description

**Epic 3 enumerated the degraded set once, produced rather than imagined —
nine states, four widths, six surfaces compared by string. This story inherits
it rather than re-inventing it**, which is what this epic's `EPIC.md` says in
as many words.

**Three rules travel with it**, each somebody's measured defect: `FeedStatus`
is about the **connection** and `MarketSessionStatus` about the **session**,
and they must not be collapsed; **a quiet security is not a broken feed**; and
**the connection has one home** — the status bar — with every other surface
quiet by decision.

**But this screen is different from a security page in one way that matters.**
A security page showing a stale price is wrong about one name. **An overview
showing stale aggregates is wrong about the market**, and its whole claim is
_right now_. So the question this story answers is not _does the chrome say
the feed stopped_ — that is settled — but **what should four regions of
aggregates do when the thing they aggregate has stopped arriving?**

> **And the item `EPIC.md` says is owed a person BEFORE this epic ships a
> screen**: at 390 the status bar is the only surface that tells _the feed
> stopped_ apart from _the market is shut_, and it is at the foot of the
> viewport. Story 4.1 asked the question; **this story answers it**, with a
> real phone during a session, and repairs it if the answer is that nobody
> notices.

## What the user can see when this story lands

**A landing page that is honest when its data is not arriving**, in the
product's established words: the figures that were true stay on screen with the
instant they were true at, nothing pretends to be current, and no region
becomes an error message because a feed dropped.

**And on a phone, a reader can tell the difference between a quiet market and a
broken feed** — which today they cannot, and nothing mechanical can see it.

## Why it sits here in the sequence

**After the screen is complete and before anybody rehearses it.** The degraded
set is produced by walking a finished screen through its states; doing it
earlier means doing it twice, and doing it later means shipping a screen whose
worst states nobody has seen.

## Acceptance criteria

1. The overview's degraded states are **produced** — through the shipped socket
   path, not furnished — and photographed at 1440, 1024, 768 and 390, including
   in greyscale
2. **No two states read identically**, compared by string rather than by eye
3. Killing the feed changes no figure and raises no page error; every region
   keeps what it had with the instant it belongs to
4. The connection still has **one home**, and this screen adds no second
   connection word — or, if it must, the decision is recorded against ADR
   0029's fourth rule with a measurement behind it
5. **The 390 question has an answer from a real phone during a session**, and
   either a repair or a written statement of why the current shape is right
6. `pnpm break` entries for anything this story adds, run and red

## Design work

Inherit `Degraded states.dc.html` and `Failure and partial states.dc.html`
rather than starting a new vocabulary; **add only the states the overview has
that a security page does not** — chiefly a region whose aggregate is over a
map that has stopped growing.

## Out of scope

Changing the thresholds (165 s monotonic, 60 s wall — ADR 0036), and the
connection's home.

## Amended by Task 4.1.7 — 2026-09-25: the 390 question is answered, and it turned into a different one this story owns

**The question this story inherited was _does a reader notice the status bar
change at 390_. Measured on the deployed site, the answer is that for the first
165 seconds there is nothing to notice.**

### The measurement

A client at 390 × 780 with its network removed — airplane mode, a lift, a
tunnel — keeps reading **`LIVE`**:

```text
t=0s   connected: LIVE
t=20s  LIVE   … t=160s LIVE
t=165s DISCONNECTED
```

**Exactly 165 s, and the mechanism is not a mystery.** `DISCONNECTED_AFTER_MS`
is the monotonic watchdog — _no inbound frame of any kind for 165 s_
(`LIVE-DATA.md` §11.2, ADR 0036) — and it governs the **browser's** view as
well as the backend's. The socket closing does **not** flip the word: the
client detects that immediately and uses it only to start reconnecting.

**Two things the same run established, and both make the fold story weaker:**

- **The status bar is sticky**, so it is on screen at 390 whatever the scroll —
  Task 3.11.8 measured that and this confirms it.
- **When it does flip it GROWS**, four wrapped lines to six, and
  `BACKEND SERVICE` goes `UNREACHABLE` beside it. That is a size change that
  moves the page, which is a **stronger** peripheral signal than a word change.

### The decision this story owes

**165 s is defensible and it was derived for a different socket.** The number
comes from Alpaca's upstream heartbeat — 53.96–54.85 s across 82 intervals,
three missed — and it protects against flapping during a deploy, which
Task 3.11.6 measured at **~46 s** of feed outage. Both of those are about the
**backend's** connection.

**The browser's socket has its own heartbeat and its own failure mode.** Task
4.1.6 measured the gateway sending a `feed` frame every **20–50 s**, unchanged,
precisely so a quiet market still produces inbound traffic — which means the
browser could detect a dead gateway socket **far sooner than 165 s** and still
not cry wolf on a 46 s deploy.

**The alternatives, priced:**

|                               | Says `DISCONNECTED` after | Flaps on a 46 s deploy? |
| ----------------------------- | ------------------------- | ----------------------- |
| today                         | **165 s**                 | no                      |
| a shorter browser threshold   | ~75 s                     | no                      |
| retries failing for N seconds | ~60 s                     | no, if N > 46           |
| the socket closing            | immediately               | **yes**                 |

> **Whatever is chosen, it is a decision about a shipped vocabulary with one
> home**, so it carries ADR 0036's rule: the two-clock shape is the durable
> half and **the numbers are dated observations that get re-derived, not
> tuned.** A browser-side threshold is a _third_ number and needs its own
> derivation from the gateway's heartbeat rather than a fraction of this one.

### And what is still a person's

**The sitting is booked for the session of 2026-09-25**, on `/securities`
rather than on `/`: the landing page has no moving figures until Story 4.2, and
_do you notice it while reading a figure_ needs a figure. Task 4.1.7 carries the
protocol.

### One data point for the table above, taken overnight — 2026-09-25

**A browser's experience of a deploy is nothing like the backend's.** Across the
rollout of 2026-09-25T12:34Z, a page on the deployed site read:

```text
12:28:13  LIVE
12:37:40  DISCONNECTED
12:37:45  LIVE
```

**Five seconds**, against the **45.8 s / 46.5 s** the backend's upstream socket
was refused. They are different quantities and the difference is the point: the
gateway's new replica serves browsers long before its own feed is connected, and
the browser's reconnect is **500 ms on `1001 going away`** by design (Task
3.5.5).

> **It is a coarse reading and it is labelled as one**: the word was sampled
> every five seconds, so `≤ 5 s` is the resolution rather than the measurement,
> and the frame log that would have given the exact inter-frame gap was
> **broken at the time** by the drain defect found the same night. The fixed
> instrument is running and the next deploy gives the precise figure.

**What it already changes about the options**: the row that says _the socket
closing → flaps on a deploy_ is the one to re-examine. If a deploy costs a
browser five seconds rather than forty-six, then reporting on the socket's own
state may not flap at all — and the threshold conversation is about a phone in
a tunnel rather than about our rollouts.

### And the figure the table was missing — 2026-09-25, overnight

**On an idle connection out of hours, a browser's longest silence between
inbound frames is 54.0 s.** Measured over 5.5 minutes on the deployed site with
a fixed instrument: **17 frames — 3 snapshots, 12 `feed` heartbeats and 2
`bars`** (extended-hours prints), longest gap **54.0 s**.

**That 54 s is not a coincidence.** It is the upstream Alpaca heartbeat —
53.96–54.85 s across 82 intervals, `LIVE-DATA.md` §6.3 — arriving at the
browser as a `feed` frame. **The gateway's quiet-market traffic is paced by the
vendor's heartbeat**, so the browser's floor is the same number the 165 s
threshold was derived from, seen from one hop further away.

**So the three numbers the decision needs now exist:**

|                                                 | Measured                 |
| ----------------------------------------------- | ------------------------ |
| longest browser silence, **idle, out of hours** | **54.0 s** (n = 5.5 min) |
| browser's visible outage **across a deploy**    | **≤ 5 s**                |
| the watchdog                                    | **165 s**                |

> **165 s is a 3× margin over the worst thing a healthy browser does**, and the
> deploy it was protecting against costs a browser five seconds rather than
> forty-six. A browser-side threshold around **90 s** would keep a 1.6× margin
> on the idle gap and still not flap — and would halve the window in which a
> phone in a tunnel is told its prices are live.
>
> **This is one 5.5-minute sample and it says so.** ADR 0036's rule is that
> these numbers are dated observations to be re-derived rather than tuned, so
> the decision owes a longer idle sample — and the instrument that takes it now
> works, which it did not this morning.
