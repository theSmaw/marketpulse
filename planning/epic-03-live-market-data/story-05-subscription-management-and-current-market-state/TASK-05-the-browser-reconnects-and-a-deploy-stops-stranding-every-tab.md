# Task 3.5.5 — The browser reconnects, and a deploy stops stranding every open tab

**Status:** **Complete — 2026-09-21.** A tab survives a deploy. The chrome adds **no fourth word** — `DISCONNECTED` is true for every second of a retry — and the design deliverable is that §03's state set is unchanged. Three browser assertions, eight component tests, one `pnpm break`.
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

---

## Design artifact

**`The tab that repairs itself.dc.html`**, published to the canvas 2026-09-21.

**A companion to `Live in the chrome` rather than an amendment to it**, and the
reason is the deliverable: that document owns the feed cell's six states and
**this task changes none of them**. Putting the reconnect inside it would imply
the chrome changed. It reuses the language verbatim — same tokens, same strip
markup, same panels, **no new primitives** — and answers two items from that
document's own _What this did not decide_.

### The decision: no fourth word

| Considered            | Verdict                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `reconnecting` word | **Rejected.** A fourth member of a union §11.2 keeps at three, describing **our effort rather than the reader's situation** — from where they sit, _reconnecting_ and _disconnected_ are the same fact. It would also need a fourth marker silhouette, because colour is never the sole encoding of anything. |
| Motion on the word    | **Rejected.** A retry **is** work in progress, so a spinner would be grammatically correct and still wrong. §07 already refused a breathing `LIVE` chip; a breathing `DISCONNECTED` is the same defaulted answer with worse news, and the reader cannot act on it.                                            |
| The existing sentence | **Chosen.** _The live feed is not connected. Prices shown are the last known. Showing data through 14:02:00 EDT._ — already correct, already carrying §05's instant. **The retry is invisible because it is ours, not theirs.**                                                                               |

**And the recovery narrates itself.** `DISCONNECTED → LIVE` without a reload is
already in the vocabulary as a **state that persists**. That matters more than
it looks: a reconnect can change many numbers at once and Task 3.5.4's rule
means it marks none of them — **the chrome narrates the gap so the figures do
not have to.**

## What was built

### The close code, and why it is not a reversal of §8.5

§8.5 measured five causes of an **upstream** close all producing `1006` with an
empty reason — a code carrying no intent. **Our own gateway is not a third
party**: §12.2 has it send `1001 going away` on shutdown, deliberately.

So `LiveFeedEvent`'s `closed` gained an optional `code`, **absent for an
`error` event** — which fires without a close and therefore has no code. That
is the shape rather than an omission: a transport failure is exactly the case
with no intent behind it.

### The policy is a pure function

`reconnect-policy.ts` is arithmetic over an attempt count and a close code; the
hook owns the timer and the visibility. Two schedules, because one would have to
be pessimistic enough for a dead network — making every deploy feel like an
outage — or optimistic enough for a deploy, hammering a server that is gone.

- `1001` → **500 ms** first, doubling
- anything else → **2 s** first, doubling
- ceiling **30 s**, and it is a ceiling rather than a give-up: a tab left open
  overnight should be working in the morning
- **no jitter**, deliberately — it exists to stop a thundering herd
  re-synchronising, and this deployment's realistic audience is a handful of
  tabs. Reversal trigger: the first time a simultaneous reconnect is visible in
  the backend's own load.

### Two details that are decisions rather than mechanics

**The backoff resets on a MESSAGE, not on `opened`.** A socket that opens and is
closed immediately — a server refusing during a rollout — would otherwise reset
the count every time and retry forever at 500 ms.

**A hidden tab does not retry, and a returning one retries at once** rather than
waiting out a backoff that was never running. Both are the judgement
`useBackendHealth` already makes about polling, which is the second time this
chrome has reached for visibility rather than the first.

### The mirror of §10 was already closed, for free

§10 found that a lost socket left the strip saying _feed broken, service
healthy_ for up to 30 s, and repaired it by making the health check run now. The
**recovery** direction is the same defect reversed.

**It needs no repair**, and the reason is worth recording: `recheckOn` is a
**dependency** rather than an event handler, so it re-runs whenever the value
_changes_ — in both directions. The symmetry was free because the repair was
written as a value rather than as a callback.

## What the tests cost to get right

**Two fixtures were wrong before the code was.**

1. **The chrome read `stale`, not `live`.** §11.2 runs staleness only while the
   market is open, and a recorded 14:01 bar read at any later instant is stale
   with the gate on — **correctly**. Pinned `marketOpen: false`, which is the
   canvas's own row: at 03:00 the strip reads `IEX · LIVE` beside a masthead
   saying `CLOSED`, because the word is a claim about the **connection**.
2. **`connections()` was 2 before anything was dropped.** React's `StrictMode`
   double-invokes the effect in development — which `use-live-feed.ts` already
   documents, because that same double-invoke is how Task 3.3.6 found a teardown
   writing into the next mount's state. The assertion is now that the count
   **grows**, not that it starts at one.

Neither was a product defect. Both would have been read as one.

## What this task did NOT close, and the sweep closed afterwards

**Task 3.5.4 handed this task one thing to check and it was not checked.** The
amendment above says a reconnect snapshot may carry **fewer** symbols than the
previous one, that the behaviour is _believed correct and untested_, and that
nothing before this task could reconnect.

The reconnect shipped without that assertion. Worse, the sweep then found that
`fromSnapshot` had **no store-level test at all** — the rule was exercised only
through `SecurityIdentity` and a browser spec, so a change to it would have
surfaced two layers from its cause.

**Closed in the sweep rather than handed on**, because it was this task's
obligation rather than a future one's: four assertions in `live-feed.test.ts`
covering the baseline set, the partial clear on a `bars` message, the
fewer-symbols reconnect, and the reference-stability the render gate depends on.
The fewer-symbols case behaves exactly as 3.5.4 predicted — the held price
survives and the flag does not.

**The lesson is the ordering.** An inherited _check this_ is easy to read as
context rather than as work, especially when the amendment that carries it also
says the mechanism is already correct.

## Evidence

- `pnpm break a-deploy-strands-every-open-tab` — red, restored byte-identical
- 8 component tests: the retry fires, `1001` is faster than abnormal, backoff
  doubles and is bounded, resets on a message, hidden tabs do not retry,
  returning retries at once, unmount stops it
- 5 policy tests, including that it never gives up and never returns zero
- 4 store tests added by the sweep, closing 3.5.4's handed-forward case
- 3 browser assertions in `market-reconnect.spec.ts` — **the only level that can
  lose a socket and then get another one**
- `pnpm verify` green: 16 invariants, 921 backend, **1050** frontend, 24 process

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**A browser tab now survives us releasing an update.**

### What was wrong

Every time we deployed a change — which is every time any work merges — **every
browser tab anyone had open silently stopped updating.** The prices froze, the
status said _disconnected_, and it stayed that way until the person happened to
reload the page.

Nobody had to do anything wrong for this to happen. It was the normal cost of
shipping, paid by whoever had the product open at the time.

This is the failure a stakeholder is most likely to have already hit by
accident, without necessarily realising what they were looking at.

### How it works now

The page notices the connection has gone and quietly dials again. If it fails,
it waits a little longer and tries again, backing off up to thirty seconds — and
**it never gives up**, because a tab left open overnight should be working in
the morning.

It also reads a signal the server was already sending and nobody was listening
to. When we shut a server down deliberately, it says so on the way out —
_going away_ — which is different from a connection that simply died. So a
deploy is retried within half a second, because we know we are coming straight
back, while a genuinely dead network is given longer. That signal has been on
the wire since we built the connection; this is the first thing to read it.

And a tab you have left in the background **does not** retry. It waits until you
come back to it, then reconnects immediately. A backgrounded tab quietly dialling
a server every few seconds is somebody's battery and our hosting bill.

### The design decision: we added nothing

This was the part that took the thinking.

The obvious move is to tell the reader what is happening — a _reconnecting…_
label, or a little spinner. We deliberately did neither, and the reasoning is
worth sharing because it will come up again:

**From the reader's side, _reconnecting_ and _disconnected_ are the same fact.**
Data is not arriving, and the numbers on screen are the last ones we got. That is
what the status already says, and it says it accurately for every second of the
retry. A second word describing _our_ effort would be about us, not about them.

And a spinner would have been actively wrong. In this product, **movement means
work is in progress** and nothing else is allowed to borrow it. A retry genuinely
is work in progress — so a spinner would be grammatically correct and still the
wrong call, because it puts motion in the corner of someone's eye, on every
deploy, about something they cannot act on.

**The recovery announces itself anyway.** The status goes from _disconnected_
back to _live_ on its own, in the place this product puts facts about the feed.
That matters because a reconnect can change several prices at once — they moved
while you were disconnected — and we deliberately do not flag those individually.
The status bar has already told the reader there was a gap, so the numbers do not
have to.

### Something worth flagging about how we tested it

Two of our own tests were wrong before the code was, and both would have looked
like product bugs.

The first expected the status to read _live_ while using a price from a past
trading session — but the product correctly calls that _stale_, because the
market was open and nothing new had arrived. The rule was right; our test data
was misleading.

The second expected exactly one connection when the page loads, and found two.
That is React's development mode deliberately doing everything twice to surface
exactly this class of bug — and it is documented in our own code, because it
caught a real defect for us two days ago.

We mention these because the useful version of "the tests pass" is knowing which
failures were real. Neither of these was.

### What you would see today

**Nothing, when it works** — which is the point. Leave a tab open, we ship an
update, and a few seconds later it is still live with the prices it missed
already filled in. No reload, no message, no action.

**Next:** each browser receiving only the securities it is actually showing
rather than all 518, and then the screen this whole run of work is for — **live
prices across all 518 companies at once.**
