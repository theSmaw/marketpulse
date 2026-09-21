# Task 3.1.3 — What the socket says when the market is shut

**Status:** Complete (2026-09-15) — with **two Done-when criteria short and delegated by name** to Task 3.1.4, the open boundary and the liquid half of the extended-hours question. The audit below says so rather than rounding up
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.2

## Objective

Measure what arrives on the IEX stream **outside a regular session** — pre-market,
after hours, overnight, a weekend and a holiday — and establish whether a
connection that is up says anything at all when the market is not.

This is placed before the in-session task on purpose, and the ordering is
Epic 2's lesson inverted. Task 2.7.1 ran on Labor Day and lost a measurement to
a shut market; **what it got wrong was not the day but the question.** So this
task takes every measurement a shut market can give, deliberately and first,
leaving Task 3.1.4 a session window it does not have to share.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3, and the specific thing this task buys is
that Story 3.10's degraded states are designed against a measured quiet socket
rather than an imagined one.

## What is already decided and must not be re-taken

- **`CALENDAR.md` owns _is the market open_.** This task owns _does the socket
  say anything_, and the two are different questions — the whole point of
  measuring it is that the answers may not line up.
- **`FeedStatus` and `MarketSessionStatus` are separate vocabularies**,
  deliberately, for exactly this reason: the market being open does not mean
  data is flowing, and a socket being up does not mean the market is open.
- **An absent bar is ordinary on IEX.** `ALPACA.md` §5.2 measured **82.8%**
  median minute coverage on IEX against **99.7%** on SIP, worst case **43.1%**
  (`CCI`) — on _stored_ IEX history. Silence is therefore not evidence of a
  broken socket, and this task is where that stops being a guess.

**Added 2026-09-15 by Task 3.1.2, which has now read the socket** —
[`LIVE-DATA.md`](LIVE-DATA.md) §4:

- **The recorder's control-frame path is proven, so silence in a capture is
  readable.** The server answers a client ping with the payload echoed (§4.6).
  Without that, "no keepalive observed" would have been indistinguishable from a
  recorder that structurally cannot see one — and Node's built-in `WebSocket`
  is exactly such a recorder, which is why the harness uses `ws@8`.
- **Figure 16 is already bounded from below: no server-initiated ping in 30 s of
  quiet.** This task owns the long idle and must not re-take the short one.
- **A clean client-initiated close is observed as `1006` with an empty reason**
  (§4.2), because Alpaca never echoes a close frame. So a `1006` seen at the end
  of an idle hold is **not** evidence the server closed us — the harness must
  record whether it asked for the close before the code means anything.
- **An error is a frame, not a closure.** Nine deliberately bad requests, nine
  frames, the socket never closed once (§4.4). A quiet socket that is still open
  is the expected shape here, not a surprise.

## Work

Run the harness across the boundaries and record, per window, what arrived.

- **The four windows**, each named with its market-time range: pre-market
  (04:00–09:30 ET), the open boundary itself, after hours (16:00–20:00 ET), and
  a period with no session at all — overnight, a weekend, or the next holiday
  the calendar table carries.
- **Per window, per channel**: does anything arrive on `b`; does anything arrive
  on `t` and `q` for a small symbol set; and is there any traffic at all —
  keep-alives, control frames, or nothing whatsoever. **Nothing whatsoever is a
  finding**, and it is the one that decides whether Story 3.10's staleness
  detection can ever distinguish _quiet_ from _dead_ without a heartbeat of our
  own.
- **Do extended-hours bars arrive on `b`, and are they marked?** If pre-market
  and after-hours bars come through the same channel with nothing distinguishing
  them, that is a product decision landing in Story 3.6 and 3.9 — a chart that
  silently gains a thin pre-market tail is a different drawing — and it must be
  written down here rather than discovered there.
- **The idle behaviour of a connection nobody is talking to.** Hold it open
  across a long quiet period and record what happens: whether the server sends
  anything, whether it closes, and after how long. Record the **longest observed
  silence** and the instant it started and ended — that figure is the input to
  Decision 5's staleness thresholds and to the heartbeat question above.
- **The boundary instants.** When does traffic start relative to 09:30 ET, and
  when does it stop relative to 16:00 ET? Both to the second, both by our clock
  with Task 3.1.2's offset applied or declared. A feed that starts at 09:30:00
  and one that starts at 09:30:47 produce different first-paint behaviour on
  every screen this epic builds.

Write the findings into `LIVE-DATA.md` with the window, the instant, the counts
and the verbatim frames, in the capture format Task 3.1.2 fixed. State clearly
what was **not** covered — a holiday that did not occur inside this story's
window is an unmeasured case, and saying so is worth more than inferring it.

## Done when

- Every one of the four windows has a dated, instrument-named record, or is
  explicitly listed as unmeasured with the reason. **A window listed as
  unmeasured gets a named owner and a condition, not just a reason** — the
  weekend is five days from this story's start and "unmeasured" with nobody
  holding it is how a window is never taken at all.
- The longest observed silence is recorded with its instants.
- The extended-hours question is answered, with frames, and its consequence for
  Stories 3.6, 3.8 and 3.9 is named.
- The open and close boundary instants are recorded to the second.
- `pnpm verify` passes. No code changed and no credential written.

## Notes

The trap here is treating an empty capture as a failed run. An empty capture
that is **recorded, timed and bounded** is a measurement: it is what tells
Story 3.10 that a quiet socket is indistinguishable from a dead one, which is
precisely the finding that forces a heartbeat into the design rather than into a
bug report.

## What was done (2026-09-15)

The record is [`LIVE-DATA.md`](LIVE-DATA.md) §6, in the capture format Task
3.1.2 fixed. Five captures, all swept clean: two shut-market holds, two watchdog
runs and one window after the extended session ends.

### What the market being shut actually sounds like

**Nothing, on nine channels at once, for 76 minutes** — 518 bar channels plus
trades, quotes, statuses, daily bars and updated bars for ten of the most liquid
names in the market, from 04:14:56 to 05:31:07 ET. The control was stated before
the run and is what makes the silence readable: had bars been silent while
trades were not, the silence would have been about the **channel** rather than
the **session**, and an instrument subscribed to bars alone could not have told
those apart.

**But "shut" is not one state, and the socket is not equally quiet in all of
them.** After the closing bell the `dailyBars` channel re-sends a **byte-identical
daily bar every minute** — same volume, same close, same trade count — for every
symbol subscribed. Ten symbols cost 21.6 B/s of it. That single finding does
more damage to a later story's assumptions than the silence does, and §6.7 has
the arithmetic.

### The heartbeat, and the figure it strikes

**The server pings every 54 seconds** — 53.96–54.04 s on a socket subscribed to
nothing (n=12), 53.96–54.85 s on one subscribed to all 518 plus eight other
channels (n=70). It is a property of the connection rather than of the
subscription, and it **strikes figure 16**.

It inverts what this task expected. The Notes argued that a quiet socket would
prove indistinguishable from a dead one and that the finding would "force a
heartbeat into the design". It does not: **Story 3.10 can tell quiet from dead
without this product inventing a keepalive.** It also corrects §4.6's reading of
its own 30-second result — 30 s is _shorter than the interval_, so that capture
was structurally incapable of seeing the thing it reported not seeing.

### The finding this task did not plan, and the one it will be remembered for

**The capture that was meant to photograph the opening bell photographed a dead
connection instead, for four hours and twenty-one minutes, and the instrument
did not notice.** The last inbound frame of any kind arrived at 05:31:07 ET.
`readyState` stayed `OPEN`. No error, no close frame, no reset. When we finally
asked to close at 09:52:16, the close took **30,016 ms** — ws@8's timeout
elapsing — against **243 ms** for a live socket measured the same evening.

**What killed it is not determined and is not guessed at.** The lid was open and
the machine awake until 05:51 ET, twenty minutes _after_ the last heartbeat, so
the obvious explanation does not fit; the retained system logs carry no network
event at that instant. Two candidates survive — an upstream drop and a local
network interruption — and this instrument cannot separate them. **It does not
matter to the product**: the finding is not "Alpaca dropped us", it is that a
connection can stop existing with no event to say so, and this epic now has that
first-hand in its own record rather than as folklore.

It cost the open boundary, which moves to Task 3.1.4 (§6.5), and it bought three
things no argument would have won: Story 3.2's client must watch **inbound
frames** rather than `readyState`; `FeedStatus.live` must never be derived from
"the socket object is open", because that predicate was true for 4h21m of a
connection to nothing; and reconnection is the ordinary consequence of holding a
socket open all day rather than an edge case.

### The instrument was repaired the same day, and the repair was broken on purpose

`harness.mjs` records the instant of every inbound frame and exposes
`silentForMs()`; `quiet-window.mjs` ends a hold, names the last live instant and
marks the capture `endedOnWatchdog` when nothing has arrived for **165 s** —
three missed heartbeats, derived from the measured 53.96–54.85 s interval rather
than rounded to a minute.

Then it was **proved to fire**, per this repository's rule that a check which has
never gone red has never been tested: run with the threshold set below the
heartbeat interval, against a demonstrably healthy socket, it must go off — and
it did, at 10 s, naming the last inbound frame. A control at the real threshold
across three heartbeats did not fire. This is not tidiness. Tasks 3.1.4 and
3.1.5 get one window each, and an instrument that cannot tell a dead socket from
a quiet market would have spent one of them exactly as this task spent its own.

### Against this task's own Done-when, plainly

| Criterion                                            | Met?                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Four windows, each dated or explicitly unmeasured    | **Yes** — §6.1 and §6.9, each unmeasured one with an owner **and** a condition          |
| The longest observed silence, with its instants      | **Yes** — §6.6, two numbers rather than one, because the two kinds are different claims |
| The extended-hours question answered, with frames    | **Half.** Early pre-market: nothing arrives. 07:00–09:30 unmeasured, owned by 3.1.4     |
| The open and close boundary instants, to the second  | **No.** The close was already 3.1.4's; the open is now too, and §6.5 says why           |
| `pnpm verify` passes, no code changed, no credential | **Yes** — five captures, swept twice each, clean                                        |

**Two of five are short, and neither is hidden.** A task that reports "done" with
a window it did not take is how a later story inherits a number nobody measured.

### The trap this task warned about, and the one that actually bit

The Notes warned against **treating an empty capture as a failed run**. The
failure was the mirror image: **treating a failed run as an empty capture**. For
four hours the harness recorded a perfectly well-formed, incrementally written,
credential-swept capture of absolutely nothing, and every property of that file
said it was working. The distinguishing evidence existed the whole time — the
54-second heartbeat had stopped — and nothing was looking at it. **An empty
capture is a measurement only when something independent proves the instrument
was still attached to its subject**, and that sentence is now a property of the
harness rather than of this paragraph.

### Swept upward

- `LIVE-DATA.md` **figures 10 and 16 struck** in §3's register, with their
  measurements rather than a pointer.
- **§4.6 amended, not rewritten** — its 30-second ping result was a bound, and a
  dated line now says why the caution was the difference between a bound and a
  wrong inference.
- **§2.8 amended** — the out-of-hours cost objection it was waiting on is
  measured and does not exist for a bar-only subscription, and the question it
  leaves behind is about the _meaning_ of `LIVE` at 3am rather than about money.
  The `dailyBars` arithmetic is recorded beside it, because it is the one
  subscription shape that would put the objection back.
- **Task 3.1.4 gained the open boundary, a 07:00 ET start, the extended-hours
  question, the watchdog requirement and the awake-machine constraint.**
- **STORY.md and this file** carry honest statuses rather than `Not started`.

## What the user can see

**Nothing, and nothing is running that could be seen** — as the task said. No
code shipped, no route, no pixel. The payoff is Story 3.3.

**What the user still cannot do:** everything this epic promises. The
application is a historical explorer today and will be on the day this story
closes.

---

## For the stakeholders — a plain-English status report

**Where the product is.** MarketPulse today is a working market explorer: search
518 US companies, open one, and read its real price and volume history with an
honest note saying where the numbers came from. What it cannot do is show you
anything happening _now_. Epic 3 makes the application live, and this story is
the homework before the building — nine small pieces of groundwork, of which
this was the third.

**What this task set out to do.** Find out what our market-data provider's live
feed says when the market is **closed**. That sounds like the least interesting
question in the epic, and it was chosen on purpose: the previous epic lost a
measurement by discovering, on a public holiday, that it had planned the wrong
question for the day it had. So this time we deliberately took everything a shut
market can tell us _while it was shut_, leaving the precious open-market hours
for the task that genuinely needs them.

**The straightforward answer.** When the market is properly closed, the feed
says nothing at all. We asked for price updates on all 518 companies we track,
plus trades, quotes and trading-status alerts on ten of the biggest names, and
for well over an hour not one message arrived. That is the _correct_ behaviour,
and knowing it is worth real money in avoided confusion later: when our product
one day shows a silent screen at 4am, we now know that is the market being shut
rather than something broken.

**The useful surprise.** The feed does send a small signal every 54 seconds, like
a ship's sonar ping, purely to say the line is still up. Before this task we
assumed we would have to build that ourselves. We do not — and that saves a
piece of engineering in a later story. It matters more than it sounds, because
it is the only way to tell "the market is quiet" apart from "the connection is
broken", and those two look identical on a screen.

**The expensive surprise, and the most valuable thing we learned all day.** The
recording that was supposed to capture the opening bell instead captured a
connection that had **silently died four hours earlier**. Every indicator our
software had said the line was fine. No error, no warning, no disconnection —
just a line that had quietly stopped existing while the program sat happily
listening to nothing.

That is precisely the failure that would have embarrassed us in front of an
audience: the product showing the word **LIVE**, a price frozen at yesterday's
number, and no error anywhere, because as far as the software was concerned
everything was working. We found it in a disposable test tool on a Tuesday
instead of in a demonstration, and we found it because we had just learned about
the 54-second ping and could go back and see the exact moment they stopped —
with twenty minutes of warning sitting in the recording that nobody had
collected.

**What we did about it, and why we did it that way.** We taught the tool to
watch for that heartbeat and declare the connection dead after three of them go
missing — 165 seconds. We picked that number from the measurements rather than
choosing a round one: the gap between heartbeats was between 53.96 and 54.85
seconds across eighty-two of them, so anything under a minute would cry wolf on
a healthy connection, and anything much over three minutes means telling a user
a dead feed is live. Then we deliberately broke the alarm to prove it actually
goes off, because a safety check that has never once fired is not a safety check,
it is a hope. It fired.

**The cost, stated plainly.** We lost the measurement of what happens at the
opening bell — the instant prices start flowing at 9:30 in the morning, New York
time. We have not scheduled a second overnight vigil to recover it. Instead it
moves to the very next task, which has to sit through a whole trading day
anyway, so it gets that moment for free rather than for another night. That is a
day's delay on one number and no delay at all to the epic.

**One more thing we found by accident, which will save money.** After the closing
bell, one of the provider's channels re-sends the same daily summary every single
minute — identical numbers, over and over, telling us nothing new. Ten companies'
worth of that costs more bandwidth than our hosting plan's "idle" allowance would
tolerate if we did it for all 518. We now know to simply not subscribe to that
channel, a decision that takes one line of code and would otherwise have shown
up as an unexplained hosting bill in three months' time.

**What you still cannot do.** Everything this epic promises. Nothing on screen
has changed. The word `LIVE` appears in the application's header at **Story
3.3**, two stories away, and the first price that actually moves in front of you
arrives at **Story 3.4**. The sequence was built so the wait is short — the last
epic made users wait seven stories for something visible, and we are not
repeating that.

**The honest summary.** This task was scheduled to produce a boring confirmation
and instead produced the single most useful bug-in-waiting we have found in the
epic so far, three weeks before there is any code for it to hide in.

---
