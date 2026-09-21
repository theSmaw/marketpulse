# Story 3.10 — Disconnection, Staleness & Every Degraded State

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.8, 3.9
**Epic scope covered:** reconnection handling, stale-data detection, live connection state — as a complete set rather than one state at a time

## Description

**A live feed's failure states are product states, and this is the story that
treats them as a set.**

`PRODUCT_SPEC.md` §36 names the sentence this whole epic has been walking
towards — _Live feed disconnected — displaying data through 10:42:17_ — and the
rule around it: degrade incrementally and locally, never collapse into a global
error screen. `FeedStatus` has shipped `live | stale | disconnected` since
Story 1.5 with the two non-live members argued and unreachable, because there
was nothing to disconnect from.

The method matters as much as the subject, and it is borrowed from Task 2.14.7,
which enumerated **every** failure and partial state in Epic 2 and photographed
them together. What that pass found is the reason to repeat it here: **four
defects, and none of them was visible one state at a time.** A state is
correct on its own and wrong beside its neighbour — two empty answers that read
identically while implying different next actions, a confident sentence about
data nobody had read, a region that says nothing when its subject is missing.

## What the user can see when this story lands

**An application that is honest when its feed is not.** The strip stops claiming
`LIVE` and says what it is showing and as of when; prices stop pretending to be
current without disappearing; the chart keeps the session it has drawn and marks
where it stopped; and none of it collapses a page.

And when the feed comes back: the gap filled rather than jumped, so a chart does
not carry a hole from a thirty-second dropout for the rest of the day.

What the user still cannot do — nothing, from this epic. This is the last
feature story; Story 3.11 measures and closes.

## Why it sits here in the sequence

**Last, because a set cannot be enumerated until its members exist.** Every
surface this epic builds has degraded states, and taking them one story at a
time produces five locally-correct answers that disagree with each other — which
is precisely what the Epic 2 pass found when it finally looked at them together.

## Scope

- **Reconnection — the UPSTREAM one, and that narrowing happened on 2026-09-19
  at this story's own close.** This bullet used to mean both sockets. The
  browser's reconnection **moved to Story 3.5**, because it shares none of the
  constraints below — no vendor limit, no embargo, no rate limiter — and because
  the snapshot that lets a browser catch up is 3.5's. Leaving it here scheduled
  a cheap fix seven stories after the defect it fixes: **every backend deploy
  leaves every open tab reading `DISCONNECTED` until somebody reloads.**

  What stays here is the socket this bullet's measurements are actually about,
  with backoff, against a vendor that allows **one concurrent
  connection** — so a reconnect racing a connection that has not finished dying
  is a real failure mode rather than a hypothetical, and the spike recorded what
  a duplicate connection actually does.

- **The gap.** A reconnection leaves a hole between the last observation and the
  first new one. Filling it is a **historical** fetch against a fifteen-minute
  embargo and a rate limiter that is a refilling bucket at ~3.3/s with **no
  `Retry-After` on a `429`** — so the repair for a two-minute dropout and the
  repair for a two-hour one are different repairs.
- **Staleness, with its number.** A feed that is connected and silent is
  `stale`, and on IEX an absent minute is **ordinary** — median coverage 82.8%,
  worst case 43.1%. A threshold tuned as if silence were alarming will cry wolf
  on thin names all day; one tuned as if it were nothing will show an hour-old
  price as current.
- **The distinction the vocabulary already holds and that this story must not
  collapse**: `FeedStatus` is about the **connection**, `MarketSessionStatus` is
  about the **session**, and they are deliberately separate — the market being
  open does not mean data is flowing, and the market being shut is not a feed
  failure. A quiet socket at 02:00 is correct and must not read as broken.
- **The three-fact strip.** _Which venues are in these numbers_, _is data
  arriving_, and _what time does the market think it is_ fail independently,
  which is the argument that has kept them separate through four stories.
- **The per-datum question, which is the hard one.** A price that was live and
  is now forty minutes old is not the same as a price that was never live. Every
  surface has to answer it: the table's 518 rows, the identity block, the
  chart's edge, and the source note. **The rule that already governs is the one
  to apply**: a claim about data requires data, and a surface that owns nothing
  defers in one line rather than saying nothing.
- **The live row in the provenance ledger, which is already reserved.**
  `VISUAL-LANGUAGE.md` holds room for it by name: the §36 sentence is _a
  provenance claim that changes while somebody is watching_, and it belongs **as
  a first row above the stretches, carrying a marker of its own.** Reserved on
  the reasoning that three retrofits cost more than three sentences — this is
  the story that spends it.
- **The whole set, enumerated and photographed**, in the shape Task 2.14.7 used:
  every state reachable, listed, produced, and looked at together at four
  viewports. **Producing them is most of the work** — a browser suite cannot
  disconnect a vendor, so the states have to be reachable through the fixture
  stream and through a recorded frame rather than by waiting for an outage.
- **The backend's own honesty.** `GET /diagnostics/freshness` answers _how many
  trading sessions behind is the store_, computed on request so it has no
  schedule to miss, and `check-deployed.mjs` fails on it after a merge. A live
  feed is a second freshness claim and the same question applies to it.

## Out of scope, and who owns it

- The cost of holding a socket through a bad week — Story 3.11
- Anything about an agent's failure states — Epic 10, which has its own §36 list
- A listening pass with a real screen reader. A live region that changes on
  disconnection is exactly the case this repository has an unshipped repair for,
  and this story adds to that backlog with its eyes open rather than claiming to
  have discharged it

## Open decisions — settle with the user

1. **The staleness threshold**, in seconds, and whether it differs by security.
   A number that is right for NVDA and wrong for a thin name is the likely first
   answer and it is worth knowing that before shipping one number.
2. **How far back a reconnection fills**, and what it does when the gap is
   larger than the free plan will answer for.
3. **Whether a stale price keeps its last change figure or drops it.** Both are
   defensible and they make different promises.

## The design bar

**A degraded state is where a product's design is actually tested**, and the
failure mode here is specific: five surfaces each inventing their own way to
look sad. The vocabulary exists — `FeedIndicator`'s shapes, the rail, the source
note's clauses — and the work is applying it once rather than five times.

Two standing rules carry unusual weight in this story. **None of these three
states is an error**, and rendering stale or disconnected as a failure pushes
the interface toward exactly the global error screen §36 forbids — which is why
only `stale` takes a colour and why `live` and `disconnected` are the same grey,
told apart by silhouette. And **motion in this product means work in progress**:
a reconnecting feed may move, a disconnected one may not, and a stale price
certainly may not.

## Acceptance criteria

1. Every state in the set is enumerated, reachable in the suite, and
   photographed at 1440, 1024, 768 and 390
2. Two states that imply different next actions do not read identically — the
   defect the Epic 2 pass found twice
3. Killing the feed mid-session leaves every number on screen, labelled with the
   instant it was correct as of, and collapses nothing
4. Restoring the feed fills the gap rather than resuming beside it, and the
   chart shows no hole afterwards
5. A quiet socket outside market hours reads as correct rather than as broken
6. A thin name with no trade for nine minutes during a live session is not
   reported as a feed failure
7. The `LIVE` claim is false exactly when it should be — asserted against a
   produced disconnection rather than a simulated one
8. `pnpm verify` passes, and the browser assertions are written against what
   **CI's store and CI's absent credential** can actually answer

## What this story hands forward

An epic whose feature work is complete, and a set of states Epic 4's overview
and Epic 5's scores inherit rather than re-invent.

---

## Handed here by Story 3.3's close — 2026-09-19, and one of these is now yours to decide rather than build

**The hand-off audit found this file mentioning Story 3.3 zero times**, which is
the shape `CLAUDE.md` warns about: a constraint one story measured for another
lives in a document the owning story does not own, and a close sweeps only the
documents the story wrote.

**1. There is deliberately no reconnection anywhere, and it says so in the
code.** `market-stream-client.ts` reports a closed socket honestly and stops,
with a comment naming this story — because _a transport is exactly where
somebody adds a retry loop without noticing it is a policy_. Two measured facts
are waiting for you and neither is actionable until there is a policy to hang
them on: **§8.2's `406 connection limit exceeded`** on a duplicate connection,
and **§8.7's measurement that an immediate reconnect carries no penalty.**

**2. The thresholds moved, and a third consumer is the test of whether that was
right.** §11.2's 165 s and 60 s now live in
`packages/shared/src/feed-liveness.ts` with the rule that applies them, because
two sockets ask it (ADR 0031, decision 2). Adding a reconnection policy means a
third reader of the same numbers — **if that costs anything, decision 2 was
wrong and this is where it shows.**

**3. The two indicators are coupled by a PROMPT and must stay that way.** A lost
socket makes the health check **run**; what it reports is its own HTTP result
(ADR 0031, decision 3). A reconnection policy is the obvious place to start
telling the backend indicator what to think — _one indicator may tell another
when to look; it may not tell it what it sees._

**4. `docs/GAPS.md` entry 7 is now yours, and it is a DECISION rather than a
wait.** The `updatedBars` capture has been re-pointed three times on the
assumption that it needed a trading session. Task 3.3.7 found the real blocker:
**the free plan allows one connection, the deployed backend runs
`provider: alpaca`, and §9.3 chose to hold the socket always** — so a clean
developer machine is refused `406` at any hour. `node scripts/capture-u-frame.mjs`
exists and its handshake path is proven; what it needs is somebody deciding
which of the two consumers gives up the connection. **You own it because you are
the first story that has to reason about that single connection as a contended
resource rather than as a given.**

## Handed here by Task 3.1.4 — 2026-09-17

**The silence thresholds are measured, both halves** ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§7.9 and §6.6). Inside a session the longest silence of any inbound frame across
518 bar channels was **8.6 seconds**; outside one it is 54.85 s of any frame,
60.1 s with `dailyBars` attached, and ≥76 minutes on bar channels alone. **Nine
seconds of silence inside a session is already unusual; sixty outside one is
evidence of nothing.** The server's ping is every 54 s in both cases, so it is
the floor on silence and the only thing that distinguishes quiet from dead.

**A revised bar is not a gap, and this story's gap-filling would not catch it.**
The owner decided on 2026-09-17 that the product subscribes `updatedBars`
(§7.11): a bar for a minute that already has one arrives about thirty seconds
later and **changes it**. Gap-filling asks _which minutes are missing_; this is a
minute that is present and wrong, which none of that machinery sees.

---

## Handed here by Task 3.1.8 — 2026-09-17

**The thresholds are set and measured** ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2):
`disconnected` at **165 s** of no inbound frame of any kind — three missed
heartbeats, from 53.96–54.85 s across 82 intervals — and `stale` at **60 s** with
no observation while the market is open, which is **seven times** the longest
in-session silence ever measured (8.6 s, §7.9).

**Two things about them that are not obvious:**

- **`stale` is gated on the market clock.** Out of hours the same socket is
  legitimately silent for 76 minutes (§6.6), so an ungated 60 s rule reports a
  healthy overnight feed as stale every minute of every night.
- **Staleness is keyed on the observation's own timestamp, never on "a frame
  arrived".** §6.7 measured `dailyBars` re-sending a **byte-identical** aggregate
  every minute out of hours — a rule keyed on arrival would call that liveness.

**A security gets no status word at all, and that is this story's largest
inherited constraint.** §11.2 measured the gap between one security's bars at a
p50 of 1 minute, a p95 of 4, and a **maximum of 187** — `ERIE` at 187, `AIZ` at
146, against a median symbol at 4. **No threshold separates a quiet security from
a broken one.** A security carries an age; the degraded-state vocabulary applies
to the **feed** and only the feed.

**And two sockets means two states** (§11.1): the browser's own connection is the
browser's to observe, while the upstream feed's state arrives as a **`feed`
message** carrying the status and the instant of the last upstream observation.
_Our socket is fine and the market feed behind it is dead_ is a real state and
needs a way to be said — conflating them is the defect this story exists to
prevent.

---

## What is missed while away is GONE — measured 2026-09-17 by Task 3.1.9

This story's gap-filling scope was written from an unanswered question. **It is
answered**, in [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §14.2, and the answer narrows this story
rather than widening it.

A deliberate 3-minute disconnection during a live session, with five liquid
control symbols checked frame by frame against the HTTP API over the same
window: **fifteen bars existed over HTTP and zero were delivered on the socket**
— then or later. No replay, no catch-up, no backfill frame, and no `u` standing
in for a missed `b`. The subscription resumed cleanly at 518 and carried on from
the present.

**Three consequences, and the first is the scope decision:**

1. **Gap-filling is an HTTP backfill and cannot be a socket feature.** There is
   nothing to ask the socket for. This is the third independent route to that
   conclusion — §8.2's every-deploy overlap and §6.4's half-open death already
   created gaps no replay could fill.
2. **The gap's extent is arithmetic, not a diff.** A bar's `t` is its interval
   **start** and the flush is +60 s, so _what am I missing_ is computable from
   the disconnection instants alone. No reconciliation query against the vendor
   is needed to know **what** to ask for.
3. **A revision is not a gap, and the window is bounded.** §14.1 measured every
   revision arriving **29.1–30.1 s** after the bar it corrects, so a bar is not
   final for thirty seconds. Gap-filling that runs inside that window will see a
   bar it is about to be sent a correction for.

**The trap this story will meet, recorded because the analyser walked into it
first.** The question _was this bar missed?_ keys on when the bar was
**flushed**, never on its own timestamp. A naive `gapStart <= t < gapEnd` test
counts a normally-delivered bar as recovered: one stamped `15:03:00Z` begins
inside the gap and is flushed at `15:04:00Z`, after the reconnection. A first
pass over this capture reported 343 "recovered" bars on exactly that error.

---

## The two thresholds are on two different clocks — delivered 2026-09-18 by Task 3.2.6

**A constraint this story consumes, written here rather than left in
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2, because a pointer is what a reader follows when they
already know to look.**

| Threshold                  | What it measures                            | Clock                                                                                                                                                       |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **165 s** — `disconnected` | Elapsed time since _any_ frame arrived      | **Monotonic** (`performance.now()`). It must not move when the machine sleeps or NTP corrects the clock, or a suspended laptop manufactures a disconnection |
| **60 s** — `stale`         | How old an **observation's own instant** is | **Wall clock** (`Date.now()`). An instant carried on a bar only has meaning against a calendar                                                              |

**Using one clock for both is not a simplification, it is a silent failure.** A
monotonic reading is near zero and an epoch millisecond is about `1.76e12`, so
the subtraction is hugely negative and the 60 s comparison **can never fire**:
the feed reports `live` or `disconnected` for ever and **never `stale`**, with
every test green. That shipped in Task 3.2.5 and was caught by 3.2.6's fixture
stream — the first implementation to generate an observation against a real
calendar while reporting a synthetic monotonic clock.

**`FeedStatusInputs` already carries both** (`now` and `wallNow`) and the
compiler names every call site that forgets one. **Anything in this story that
computes a status or an age takes both rather than reading either.**

---

## Handed here by Story 3.4's close — 2026-09-21: a still price is now two different things, and one of them is yours

**Story 3.4 put a moving price on the screen, and in doing so it made _stillness_
ambiguous in a way it was not before.**

A price that is not changing now means either:

- **the market is shut**, which Story 3.4 stubbed honestly and named as your
  subject; or
- **the feed is degraded**, which is the rest of your subject; or
- **the security is simply quiet** — §7.6 measured IEX covering **65.1% of
  minutes for a median symbol and 2.1% for `ERIE`**, and §11.2 measured a p50
  gap of one minute with a **maximum of 187**.

**The third is the feed working correctly and must not be dressed as a fault.**
§11.2's refusal to give a security a status word is the standing decision, and
Story 3.4 respected it: the arrival mark makes **no threshold judgement**, it
marks an event and says nothing about what silence means.

**Three things you inherit rather than decide:**

- **Nothing clears the prices on a degraded feed.** §36's _displaying data
  through 10:42:17_ is your sentence, and Story 3.4 deliberately keeps the
  numbers on screen through `disconnected` — blanking them would be the product
  removing true information because a socket died.
- **The arrival mark simply stops.** There is no _stopped_ state in the
  vocabulary and there should not be one: the chrome's connection word already
  owns _is data arriving_, and a fourth motion behaviour would cost the set the
  legibility that is its whole value (`VISUAL-LANGUAGE.md`'s Motion section).
- **A reader with `prefers-reduced-motion` never saw the mark anyway**, so
  whatever you do about degradation must be legible **without** it. Story 3.4's
  answer for a quiet minute was the qualifier's own instant, asserted in
  `security-price-motion.spec.ts`; a degraded feed is the case where that
  instant **stops advancing**, which is information you can use.

## The production crash loop — isolated AND fixed on 2026-09-21, before this story started

**Read this as something you inherit working rather than something you owe.**
It was taken out of sequence because it was blocking every deploy on `main`,
not because it belonged to Task 3.4.10.

### What was wrong

Story 3.11's record names the symptom — `level: 60`,
`WebSocket is not open: readyState 0 (CONNECTING)`, six fatal exits between
02:00Z and 06:00Z on 2026-09-19 — and says only _something calls `send()`
before the socket has opened_. It was the `406` retry path, and it took three
facts in `apps/backend/src/alpaca-stream.ts` together:

1. **`socket` was a single mutable reference.** `open()` did `socket = opened`,
   the only assignment.
2. **`scheduleRetry()` never closed the incumbent.** The `406` branch scheduled
   and returned; 3 s later `open()` **overwrote** `socket` with a new,
   `CONNECTING` one while the old socket was still live with its listeners
   attached.
3. **`authenticate()` and `subscribe()` wrote to `socket`, not to the socket
   the frame arrived on.** `opened.on("message", …)` closed over `opened`, but
   the handshake reached for the shared reference.

So a frame delivered by socket **A** after `socket` had been repointed at **B**
called `B.send()` at `readyState 0`, and `ws` throws **synchronously** — out of
a `message` listener, past nothing, into the process crash handler. It
reproduced every 3 s for as long as the `406` held, which is why the container
sat in `CrashLoopBackOff` and the deploy step's own guard refused every rollout:

```text
marketpulse-backend--0000273 has a container that has already restarted; the rollout is failing
restart 1: Container is waiting with reason: CrashLoopBackOff on legion.
```

**Three merges failed to reach production that way** — Tasks 3.4.8, 3.4.9 and
3.4.10.

### What was done

- **The handshake writes to the socket that spoke.** `authenticate` and
  `subscribe` take the socket as an argument, threaded from the `message`
  listener through `handleMessage` and `toStreamEvent`. This alone removes the
  crash.
- **A retry closes the incumbent first.** The old behaviour was also a _cause_
  of the `406` it retried: §8.2's limit is one connection and we held two — our
  own refused socket competing with our own replacement.
- **`sendTo` refuses a socket that is not `OPEN`, and swallows a throw.** The
  same line `requestClose` already takes from `PROVIDER.md` §8.5 — nothing a
  vendor's socket does justifies ending our process.

`SOCKET_OPEN = 1` is spelled in the file rather than imported from `ws`,
because the seam this client writes through is `WebSocketLike` and a test
furnishes a plain object.

### The break, verified

Two tests in `alpaca-stream.test.ts`, and **`FakeSocket.send` now throws when
`readyState !== 1`, with `ws`'s exact message** — a fake that swallowed the
write could not have reproduced this. Both were proven red against the
unrepaired file before being left green:

```text
× closes the refused socket before asking for its replacement
× a frame on a SUPERSEDED socket does not write to its replacement
  AssertionError: expected [Function] to not throw an error but
  'Error: WebSocket is not open: readyState 0 (CONNECTING)' was thrown
```

### What is STILL yours, and it is the half that matters more

**Nothing would have told anybody.** `market-stream.ts` never references
`onLog`, so the Alpaca client's eight diagnostic events — `authenticated`,
`subscribed`, `credentials-refused`, `frame-rejected`, **`connection-limit`**,
`unexpected-error-frame`, **`liveness-watchdog-fired`**, `closed` — reach
production nowhere. That is why a dead feed ran for nineteen hours unseen, and
it is **Story 3.11's** by assignment. It is left undone deliberately: wiring it
needs a logger threaded into `createMarketStream`, which is a design decision
about level and shape rather than a repair.

**Until it is wired, the only way to know whether this fix worked is to poll
`GET /diagnostics/feed` and read `observedAt`.**

### The trigger this leaves standing

**A mutable reference driven by callbacks bound to a _previous_ instance of the
thing it points at.** That is the shape, and it is not specific to sockets.

## Handed here by Story 3.5's close — 2026-09-21: three things the reconnect left you

The browser's reconnection moved to Story 3.5 and **shipped** there (Task
3.5.5). Three consequences land here, and none is a pointer back.

### 1. The gap a reconnect leaves is yours, and it is deliberately unfilled

**A reconnect resumes; it does not fill.** What is missed while away is
**gone** — measured 2026-09-17 — and recovering it needs the store (Story 3.8)
plus a gap-fill **policy**, which is yours.

3.5.5 refused to invent the missing minutes on the grounds that _a reconnect
that silently invents them is worse than one that plainly resumes_. **The
reversal trigger it recorded is a condition you will meet:** the first surface
where a gap in the middle of a series is visibly wrong rather than merely
absent — a chart drawing a straight line across four missing minutes. Story 3.9
is that surface.

### 2. The close code is now load-bearing, and one value is forbidden

`reconnect-policy.ts` reads the code the gateway closes with:

| Close code                             | First retry                             | What the browser concludes               |
| -------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `MARKET_STREAM_CLOSE.goingAway` (1001) | **500 ms**                              | they are redeploying; come straight back |
| anything else                          | **2 s**, doubling to a **30 s** ceiling | no intent; back off                      |

**Both ends read `MARKET_STREAM_CLOSE` in `packages/shared`**, which exists
because they were two literals in two packages — the shape of a protocol
disagreement no test on either side could see.

**So any new close code you add must not be `goingAway` unless you mean it.**
Task 3.5.7 hit this: dropping a slow client with `1001` produces a tight loop —
back in half a second, still slow, dropped again. It uses `1013` for that
reason.

### 3. A dropped-for-backpressure client cycles rather than gives up, and that was chosen

**The browser never stops retrying.** A client dropped for being slow comes
back as slow as it was, so backoff bounds the rate without changing the
outcome — but §36 wants a reader whose connection **improves** to recover
without a reload, and a browser that had given up could not.

**Cycling at the 30 s ceiling is the degraded state**, chosen rather than
inherited. If you decide that is wrong, the alternative is having the browser
recognise _dropped for backpressure_ and stop — which buys a quieter log at the
cost of a reader who must notice and refresh.

**The threshold behind it:** 1 MiB of outbound buffer, measured against a
client that stops reading — unbounded growth of one payload per tick, **33.6 MB
after 600 batches**, and the kernel absorbs ~557 KiB before the figure moves at
all.

---

## Corrected 2026-09-21 by Story 3.5's close: this file's coverage figures are the wrong ones

**Two live claims in the scope above are stale, and the correction has been
sitting in a sibling's file since 2026-09-17.**

The staleness bullet and criterion 6 reason from **median coverage 82.8%, worst
case 43.1%**. Those are `ALPACA.md` §5.2's figures and they came from **stored
history**. The **live stream** was measured by Task 3.1.4 and is worse:

| Figure                            | This file said | `LIVE-DATA.md` §7.6, measured 2026-09-17 |
| --------------------------------- | -------------- | ---------------------------------------- |
| Median per-symbol minute coverage | 82.8%          | **65.1%**                                |
| Worst case                        | 43.1%          | **2.1%** (`ERIE`)                        |
| Longest observed gap              | —              | **187 minutes** (§11.2)                  |

**Story 3.6's file carries the correction and this one does not**, which is the
sideways-sweep failure with the arrow turned once more: Story 3.1's close wrote
the constraint into the story that renders **rows** and not into the story that
sets the **threshold** — which is the one the figure actually governs.

**It sharpens this story's argument rather than weakening it.** A threshold tuned
as if silence were alarming does not merely cry wolf on thin names: at 2.1%
coverage `ERIE` is silent for most of the session, and a 187-minute gap is an
**ordinary** observation on this feed. **Open decision 1 — whether the threshold
differs by security — is now the likely answer rather than a caution**, and
criterion 6's _nine minutes_ sits well inside the ordinary.

**Re-measure rather than cite**: both sets are dated observations of a third
party, and `LIVE-DATA.md`'s own header says to re-take them.

---

## Handed here by Story 3.5's close — 2026-09-21: a degraded state that did not exist when this file's set was written

Criterion 1 asks for **every** state in the set, enumerated and photographed.
**Task 3.5.7 added one after that sentence was written**, and it is invisible
from any screen: a browser dropped for **backpressure** — 1 MiB of outbound
buffer against a client that stopped reading — **reconnects, is still slow, and
is dropped again**, cycling at the 30 s ceiling.

It is a real degraded state with a real reader behind it, it is reachable only
through a **paused socket** rather than through a fixture, and **nothing on
screen says it is happening**. Whether it gets a word, or is deliberately silent,
is this story's to decide; the decision to cycle rather than give up is recorded
in the hand-off above.

---

## Handed here by Task 3.6.2 — 2026-09-21: the table now has a fourth state, and it is the one with no word

**Your scope already names this in as many words** — _a price that was live and
is now forty minutes old is not the same as a price that was never live. Every
surface has to answer it: the table's 518 rows, the identity block, the chart's
edge, and the source note._ Task 3.6.2 went looking for it deliberately and
found that **Task 3.6.1 made it worse before you got here.**

### The four states a row can be in, and only three of them read correctly

| #   | The row holds                               | What it draws                                | Reads correctly?        |
| --- | ------------------------------------------- | -------------------------------------------- | ----------------------- |
| 1   | A live observation from this minute         | the figure, **no date**, `Live price` spoken | **Yes**                 |
| 2   | Only a stored close                         | the figure **with its session date**         | **Yes**                 |
| 3   | Nothing at all                              | an em dash, `No close yet` spoken            | **Yes**                 |
| 4   | A live observation from **three hours ago** | the figure, **no date**, `Live price` spoken | **No — identical to 1** |

**State 4 is ordinary rather than exotic.** `currentMarketState` keeps the
latest observation per security and **never expires it**; §11.2 measured a gap
between one security's consecutive bars with a p50 of one minute and a
**maximum of 187**; §7.6 measured `ERIE` at **2.1%** minute coverage.

**And the table is currently more careful about the day-old number than the
three-hour-old one.** State 2 carries a date and state 4 carries nothing. That
is the wrong way round, and it arrived with Task 3.6.1's decision to date the
stored rows — which was right for the reason it was taken and has this as its
shadow.

### Why Task 3.6.2 did not fix it

**Because the repair is a threshold, and §11.2 refused one with a
measurement.** _Materially old_ needs a number of seconds, and no number
separates a quiet security from a broken one when the ordinary maximum gap is
187 minutes. Choosing one on the surface that has to apply it **518 times** —
inside a design pass about a disc — would be taking this epic's hardest
decision as a side effect.

### What the arrival mark does about it, and exactly where it stops

Task 3.6.2 kept the mark unchanged, and **it is the only per-security recency
signal the product has**. A reader watching the page sees which rows are being
fed — as an event, never as a judgement, which is what keeps it clear of
§11.2's refusal.

**Its limit is the part you need.** A reader who has _just arrived_ sees no
marks at all, because nothing has arrived yet. The mark answers _is this row
being fed_ for somebody watching, and says **nothing** to somebody who has just
looked. **That gap is precisely state 4.**

### And one figure that bears on whatever you choose

Task 3.6.2 measured, on a running table with the feed going and the long-task
observer **unbuffered**, that **§28's _no routine main-thread task > 50 ms_ is
already breached on this page during a session** — and that it is the 518-row
re-render rather than the mark, attributed by measuring with the mark rendered
and not rendered on the same machine and feed. **Anything you add per row lands
on top of that.** Task 3.6.5 owns the figure and re-takes it on a production
build.
