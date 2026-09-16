# Task 3.1.4 — What arrives during a live session, how fast, and which end of the minute `t` marks

**Status:** Instrument built, dry-run and recorded (2026-09-16). **The capture itself is outstanding** — it needs a live session on a machine that stays awake, and the window has not been given to it yet. See _Where this stands_ at the foot of this file.
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.2 for the instrument. **Amended 2026-09-15:** 3.1.3's
_short_ windows should be taken first where the calendar allows, exactly as
STORY.md argues — but 3.1.3's overnight and weekend **holds** do not block this
task. A weekend is five days out and a session is today; a linear dependency
would park the story's most consequential measurement behind a window that has
not opened yet.

## Objective

The measurement this whole story exists for, and the one that needs a market
session running: **what actually arrives on
`wss://stream.data.alpaca.markets/v2/iex` for 518 symbols, at what rate, how far
behind, and what a minute bar's `t` means.**

Every later story in this epic is currently sized against numbers that do not
exist. This task produces them.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3, and everything this task measures is
consumed by Decisions 1, 3, 4 and 5 in Tasks 3.1.6–3.1.8.

## What is already decided and must not be re-taken

- **Minute-bar channels are exempt from the 30-symbol cap**: 1,500 symbols
  accepted in 305 ms, 5,000 in 867 ms (`ALPACA.md` §1). Subscribing 518 is not
  in question; what they then **send** is.
- **`t` marks the START of the interval on the HTTP API** (`ALPACA.md` §5.3).
  That is a finding about a different instrument and this task checks it rather
  than inheriting it. **A stream that disagreed would put every live bar a
  minute out, silently** — which is a defect no test in this repository could
  see, because both answers produce a plausible chart.
- **`PRODUCT_SPEC.md` §28: event → application state <250 ms p95, excluding
  upstream-provider latency.** That target is meaningless until the provider's
  own share is known, and **nothing in this repository has ever measured where
  upstream ends**. This task draws that line.
- **IEX coverage is thin and it is measured — on stored history.** 82.8% median,
  43.1% worst case (`ALPACA.md` §5.2). The live stream is the case that figure
  was always about.

**Added 2026-09-15 by Task 3.1.2** — [`LIVE-DATA.md`](LIVE-DATA.md) §4.7, and
both of these change how figure 8 must be _quoted_ rather than how it is taken:

- **Subtract the offset recorded in this task's OWN capture header, not a cited
  one.** The harness re-takes the clock offset at the top of every run. On
  2026-09-15 this machine was **≈257 ms slow** against three agreeing NTP
  references — larger than the whole of §28's 250 ms budget, and in the
  flattering direction. **Quote the corrected and the uncorrected figure side by
  side**, with the NTP spread, so a later reader can see the correction was
  applied rather than trust that it was.
- **The vendor's own clock could not be pinned down**, and figure 8 carries that
  sentence rather than omitting it: Alpaca's `Date` header is one-second granular
  against a 769–1,288 ms round trip, which bounds the offset between −570 ms and
  +420 ms and measures nothing. If Alpaca's bar timestamps are not NTP-accurate,
  **no instrument in this story can tell.**
- **The vantage point is wrong for §28 and saying so is this task's job.** Every
  figure here is taken from a machine in **Asia/Singapore** — round trip to
  Alpaca measured **271–311 ms** (§4.6) — while the deployment is Azure
  `eastus2`. §28's target
  is about the moment **our server** receives an event, and this measurement
  adds most of the way around the world that the production path does not have. So the provider's
  share of §28 is an **upper bound from this vantage**, labelled as such, and
  the re-measure is handed to **Story 3.11** (whose name carries _Performance_)
  under a condition: **the first time a real socket runs in the deployed
  backend.** Do not let a later story quote this figure as _the_ number.
- **The universe is 518** — the S&P 500 as published plus eleven sector SPDRs
  and four market proxies. Size against the real figure, never against §6's
  "roughly 100".

**Added 2026-09-15 by Task 3.1.3**, which took the shut-market windows and
handed this task two things it did not previously carry —
[`LIVE-DATA.md`](LIVE-DATA.md) §6:

- **This capture runs to 16:30 ET at the earliest, not to the bell.** Task 3.1.3
  could not take **after hours** or the **close boundary** without holding the
  single permitted connection across the whole session, which is exactly what
  its own placement note promised not to do. So they are this task's, and they
  cost it half an hour rather than a window: the close boundary to the second,
  what the channels do between 16:00 and 16:30, and the last bar's instant, all
  in the same file as the session they follow. **A capture that stops at 16:00
  answers none of them** and there is no second chance until tomorrow.
- **Check that nothing else is holding the socket before starting.** The free
  plan allows exactly one connection — `LIVE-DATA.md` §5 records that measuring
  a duplicate by accident "is how three of these figures would be wrong". That
  was a note about sequencing two short runs; it is now a real hazard, because
  Task 3.1.3 may have an **unattended multi-hour hold** running (its weekend
  window, per §6.9). An overlap corrupts both captures and neither says so.
  **Added again 2026-09-15, after Task 3.1.3's capture died in flight** — the
  first two of these change when this capture must **start**, and the third is
  the reason its window cannot be trusted to survive on its own:

- **This capture starts at 07:00 ET, and it inherits the OPEN boundary.** Task
  3.1.3's socket stopped receiving frames at 05:31:07 ET and its end did not
  notice for 4h21m, so the open was never photographed (§6.4, §6.5). It is not
  re-taken as its own vigil: this task must hold a capture across the boundary
  anyway to measure the open burst, so the instant costs it nothing, where a
  second overnight hold costs a whole night. **Record when traffic starts
  relative to 09:30:00 ET, to the second**, by our clock with this capture's own
  offset applied.
- **The same run answers the extended-hours question, which 3.1.3 could only
  half-answer.** Early pre-market (04:14–05:31 ET) produced nothing at all on
  nine channels; **07:00–09:30 is where pre-market volume is** and it is
  unmeasured. Do pre-market bars arrive on `b`, and is anything on the frame
  marking them as extended-hours? If they arrive unmarked, every chart in
  Stories 3.6, 3.7 and 3.9 silently gains a thin tail, and **that is a product
  decision that belongs beside this measurement rather than in the story that
  trips over it**.
- **A dead socket looks exactly like a quiet market, and this task has the most
  to lose from it.** Use the harness's watchdog: it now records the instant of
  every inbound frame and ends a hold when nothing of any kind has arrived for
  **165 s** — three missed 54 s heartbeats (§6.3, §6.4). Do not remove it, do
  not raise it, and if it fires mid-session, **the capture is bounded at the last
  inbound instant and the rest of the file is not a measurement of the market**.
- **The machine must stay awake with its lid open for the whole window.** The
  connection dies with the network, and a 2026-09-15 clamshell sleep is why the
  broken capture never recovered. `caffeinate` prevents idle sleep and **does
  not prevent lid-close sleep**.
- **`dailyBars` is not a quiet channel out of hours and it carries no new
  information** (§6.7). Ten symbols re-sent a byte-identical daily bar every
  minute after the close — 21.6 B/s for ten, which **extrapolates past ADR
  0011's 1,000 B/s idle condition at universe scale**. If this capture
  subscribes `dailyBars` for anything wider than a handful, record its share of
  the byte rate **separately**, because Decision 1 may well drop the channel and
  a blended figure cannot be un-blended afterwards.

- **A `trades` subscription silently attaches `corrections` and `cancelErrors`**
  for the same symbols, unrequested (§6.8). This task already records "every
  control, status, correction, cancel or subscription frame the server emits
  unprompted" — expect those two, and note that their shapes need a real
  correction or cancellation to appear at all, so absence here is not evidence.

## Work

Hold a connection across a full regular session with the whole universe
subscribed, and record:

- **Every message type that arrives**, with a verbatim example of each — `b`,
  `t`, `q`, and every control, status, correction, cancel or subscription frame
  the server emits unprompted. The story's position is that `t` and `q` are
  almost certainly out of scope at 30 symbols, but **the shapes are worth
  recording once**, because Epic 7's analytical tools and Epic 13's replay will
  both ask what a trade looks like and neither wants to reopen a socket to find
  out.
- **The rate, at three points in the session**: the open, midday, and the close.
  Messages per second for 518 symbols, as a distribution rather than an average
  — the open and the close are the cases that size the browser payload and they
  are the ones an average hides. Record bytes per second alongside, because
  Story 3.11's cost envelope needs it and because ADR 0011's idle-vCPU condition
  is **1,000 bytes per second** and this is the measurement that says by how far
  the condition is broken.
- **The p50 and p95 gap between a bar's `t` and its arrival by our clock**, with
  Task 3.1.2's offset applied or declared. This is the provider's share of §28's
  250 ms, and the number every later performance claim in this epic is measured
  against.
- **Which end of the minute `t` marks, with a control.** The check that makes it
  a measurement rather than an assertion: take a symbol's live bars for a window
  and compare them against the **same window fetched from the historical API
  afterwards**, once the 15-minute embargo has passed. Two series of the same
  minutes from two instruments is a control; one series and an argument is not.
- **Whether IEX bars arrive for thin names at all.** Take the coverage across
  the whole universe for the session — how many of 518 produced a bar in a given
  minute, and the per-symbol distribution across the session. Name the worst
  cases. `ALPACA.md` §5.2's 43.1% was `CCI`; whether the live stream agrees is
  the question, and the answer decides whether Story 3.6's table has 518 moving
  numbers or 300 moving and 218 sitting still — **which is a product problem
  with a product answer, not a bug**.
- **What a bar for a symbol with no trades looks like** — absent, zero-volume,
  or repeated. Three different answers, three different charts, and Story 3.7
  inherits whichever is true.

Write all of it into `LIVE-DATA.md`, every figure dated and naming the
instrument, in the shape that lets it be re-taken.

## Done when

- Every observed message type has a verbatim example and a one-line description.
- The rate is recorded at the open, midday and the close, as a distribution, in
  both messages and bytes per second.
- The p50/p95 arrival gap is recorded **both corrected and uncorrected**, with
  the capture's own clock offset and the NTP spread beside it, and §28's upstream
  boundary is stated in a sentence a later story can quote — **a sentence that
  says _upper bound from Asia/Singapore_ and names Story 3.11's re-measure**.
- The `t` question is answered **with a control**, and the answer is compared
  explicitly against `ALPACA.md` §5.3 — agreement or disagreement, said plainly.
- Live IEX coverage across 518 symbols is recorded with its distribution and its
  worst cases, and compared against the 82.8%/43.1% stored figures.
- Anything a single session could not answer is listed as unmeasured with the
  reason, in the shape of `ALPACA.md` §10.
- **The open boundary is recorded to the second** — when traffic starts relative
  to 09:30:00 ET, with this capture's own offset applied. Delegated here by Task
  3.1.3, whose socket was dead by the time the bell rang.
- **The extended-hours question is answered with frames**: whether `b` carries
  pre-market bars between 07:00 and 09:30 ET, whether anything on the frame
  distinguishes them from a regular-session bar, and what that means for the
  charts in Stories 3.6, 3.7 and 3.9 — named, not left implied.
- **The close boundary is recorded to the second** — when traffic stops relative
  to 16:00 ET, by our clock with this capture's own offset applied — and the
  16:00–16:30 stretch is described. This is Task 3.1.3's fourth window,
  delegated here.
- `pnpm verify` passes. No credential written.

## Notes

Two traps, both of which have already cost this repository something. The first
is **n=1**: one session is one sample, and a Monday in September is not a
Friday in December — say so beside every rate figure rather than letting a
later story quote it as a constant. The second is the script's own verdict:
`ALPACA.md` §11 records an automated conclusion that was **wrong**, caught only
because 391 > 390 is impossible. Read the numbers.

---

## Where this stands — 2026-09-16

**Nothing in `LIVE-DATA.md` §3's register is struck by this entry.** Figures 1,
2, 4, 5, 6, 7, 8, 12 and 13 do not exist, the `t` question is unanswered, and
both session boundaries are unmeasured. What exists is the instrument that takes
them, proven against a shut market, and two findings that did not need a
session.

### What was built

Four things, all in the throwaway harness outside the tree (`LIVE-DATA.md` §5,
which now records them):

- **`session.mjs`** — one connection held across a whole trading day, the 518
  bar channels plus the eight narrow ones, the 165 s watchdog, an incremental
  snapshot, and a scheduler that waits for the **next** occurrence of a market
  time rather than a number of seconds into its own day.
- **`analyse-session.mjs`** — streams the capture back and prints every figure
  the Done-when asks for. It concludes nothing, per §5.
- **`historical-control.mjs`** — the control the `t` question needs. Refetches
  the same minutes over HTTP after the embargo and matches them **unshifted and
  shifted ±1 minute**; the shifted rows going to zero is what makes it a
  measurement.
- **A change to the capture format**, argued in `LIVE-DATA.md` §4.8: frames
  stream to a swept line-per-frame sidecar. Re-serialising a session-sized frame
  array every 60 s blocks the event loop for seconds as the file grows, and the
  field a block delays is `at` — **the arrival instant that is figure 8**. The
  instrument would have inflated the one number the task exists to produce, and
  the output would have looked like a measurement.

Verified end to end against the shut market on 2026-09-16 at 21:48–21:51 ET:
handshake, 518-symbol acknowledgement, the `d` rebroadcast §6.7 predicts, the
sidecar, the analyser and the independent sweep. **15 captures + 1 sidecar, 0
problems.**

### Two findings that did not need a session

- **The clock offset moved 202 ms overnight on the same machine** — `+257 ms`
  (2026-09-15) to `+55.3 ms` (2026-09-16), three samples each, spreads 2.8 ms
  and 0.27 ms. Written into `LIVE-DATA.md` §4.7 as a dated amendment. This is
  §4.7's own rule earning its keep on its first use: a capture that had cited
  yesterday's figure rather than re-taking it would have over-corrected every
  arrival gap by four-fifths of §28's entire budget, in the direction that makes
  the provider look **slower** than it is.
- **Nothing in this repository opens an Alpaca WebSocket**, checked rather than
  assumed. Story 3.2's client is unwritten and the provider, `pnpm bars` and
  `pnpm backfill` are all HTTP. So the single-connection constraint collides only
  with **another spike run** — it does not block ordinary development while a
  capture is held, which is the opposite of what it looks like.

### What the capture still needs, and what it costs

One command, and a machine that stays awake with **the lid open** — the
connection dies with the network and a clamshell sleep is why Task 3.1.3 lost
the open boundary (§6.4):

```
~/marketpulse-live-spike/run-session.sh      # waits for 07:00 ET, holds to 16:30 ET
```

**Check nothing else is holding the socket first.** The free plan allows one.

A truncated capture is **not** a lost one: every frame is on disk as it arrives
and the header is re-snapshotted every 120 s, so a machine that dies mid-window
yields everything up to that instant, bounded and labelled. That is the defect
§6.4 had no defence against, and it is the reason a partial run is worth
starting.

**Running it elsewhere was considered and declined by the owner on
2026-09-16.** A throwaway VM in `eastus` — the deployment's own region — was
priced at about **$1.70** for the whole window and would have made figure 8 a
materially better number: §4.7 currently has to label it an _upper bound from
Asia/Singapore_ against a 271–311 ms round trip the production path does not
have. It would **not** have discharged the re-measure §4.7 hands to Story 3.11,
whose condition is _a real socket in the deployed backend_, and it would have
made §4.3's handshake latencies non-comparable. Recorded here rather than
forgotten, because **the option and its price are the same next time**, and the
condition that would make it worth re-proposing is a **second** window being
lost to a machine that slept.

### Who holds the window

**This task, unchanged**, and it does not move again. §6.5 and §6.9 delegated the
open boundary, liquid pre-market, after hours and the close boundary here on the
argument that one capture gets all four for nothing extra, and that argument is
still right. **The trigger is a trading day the owner is willing to leave a
machine awake through** — a condition rather than a date, because this repository
has the scar on exactly that: the fourth design test has now been deferred seven
times behind a trigger that was a calendar.

---

## What this task did, for somebody who does not read code

**Short version: we built the measuring instrument, proved it works, and found
out that the thing we were about to measure with would have lied to us. The
measurement itself still needs a live trading day.**

MarketPulse is a tool for spotting unusual behaviour in the US stock market and
investigating it against real evidence. Everything shipped so far is
**historical** — you can look up a company, see its price and volume history, and
the screen tells you honestly where those numbers came from. What it cannot yet
do is show you a price **moving**. That is this epic, and this task is the piece
of homework the whole epic is standing on.

**Why homework rather than features.** Our data provider sends live prices down a
permanently open connection, and nobody here has ever actually listened to it.
Every plan in this epic — how often the screen updates, how much data reaches
your browser, how quickly a price change reaches you, whether a quiet stock looks
broken or merely quiet — is currently sized against numbers **we have guessed**.
This task's job is to open that connection for one full trading day and write
down what really comes out of it.

**What we built today.** A recorder that can sit on that connection from before
the opening bell to after the closing bell, capture every message, and work out
afterwards how fast, how much, and how complete it all was. Alongside it, a
second instrument that goes back afterwards and fetches the _same_ minutes
through a completely different route, so we can check the live feed against an
independent source rather than take its word for it. Checking one thing against
another is the difference between a measurement and an assumption, and this
repository has been bitten before by the difference.

**The bug we caught before it cost us anything.** The recorder's first design
saved its work to disk every minute by rewriting the whole file. Over a full
trading day that file becomes very large, and rewriting it would freeze the
recorder for several seconds at a time. The thing those freezes would have
delayed is the _timestamp of when each price arrived_ — which is precisely the
number this whole exercise exists to produce. We would have produced a figure
that looked perfectly respectable and was wrong, making our data provider appear
slower than it really is, and every performance decision in this epic would have
been built on it. The recorder now writes each message as it arrives instead.

**The second thing we found is about trusting our own clock.** Measuring "how
long did this take" means comparing our computer's clock to the provider's, so if
our clock is wrong, every figure is wrong by the same hidden amount. Yesterday
this machine was a quarter of a second behind true time. Today, with nothing
changed, it is a twentieth of a second behind. The clock corrected itself
overnight. Had we reused yesterday's figure — the obvious, convenient thing to do
— every timing in this epic would have been out by roughly four-fifths of our
entire performance budget. So the instrument now re-checks the clock against
three independent time servers at the start of every single run, and writes the
answer into the recording itself. It is a small discipline that just paid for
itself before its first real use.

**We also cleared up a misunderstanding worth money.** Our provider's free plan
allows exactly one live connection at a time, and it looked as though running
this measurement would lock the developer out of working on the product all day.
We checked: nothing in the product opens that connection yet, so it does not. The
measurement and ordinary development can happen side by side.

**What this unlocks.** Nothing on screen — deliberately, and this task's parent
story says so on every line of its plan. What it unlocks is that the next several
pieces of work are **implementations rather than arguments**. Once the
measurement is taken, we will know how stale a "live" price can honestly be, how
much data it is reasonable to push to a browser, what to say on screen when a
thinly-traded company simply has not traded for ten minutes, and how to tell a
genuinely dead connection from a quiet market — a distinction that already cost
us one lost measurement and is the difference between the product saying "live"
honestly and saying it wrongly at three in the morning.

**What still cannot be done.** The measurement needs one full trading day with
the laptop awake and its lid open, and that day has not been given to it yet. We
priced running it on a cloud machine instead — about $1.70, and it would actually
have produced a _better_ number, because it would have been measured from the
same part of the world our servers live in — and the owner chose not to. So the
instrument sits ready, it takes one command, and it will survive the machine
dying halfway through: whatever it has captured by that point is kept and clearly
labelled as a partial day. The product remains, today, a historical explorer.
