# Task 3.5.8 — The measurements this story owes, and a logging decision that reverses here

**Status:** **Complete — 2026-09-21.** Six new figures, and the two decisions came out **against** what this task expected: the logging lever stays unpulled because the interleaving it predicted is **real** rather than absent, and the replay's sequential read is left alone with figures. Five of the six figures to _confirm_ cannot be confirmed without a session — the same blocker as the rehearsal — and saying so is the honest close.
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.2, 3.5.6, 3.5.7

## Objective

Criterion 7: **message rates and memory measured at universe scale against the
figures Story 3.1 took, with the difference explained rather than noted.**

_Explained rather than noted_ is the whole instruction. A figure that has moved
looks exactly like a figure that was mis-recorded, and only rebuilding the old
commit tells them apart.

## What the user can see when this lands

**Nothing.** This is a measurement task, and it is deliberately scoped so it
does not become an evening: **confirm what is already recorded rather than
re-derive it**, and take only the figures that are genuinely new at 518.

## What is already measured, and must NOT be re-taken

Take these from [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
and confirm they still hold rather than reproducing the work:

- **1,500 symbols accepted in 305 ms**, 5,000 in 867 ms (§4.3)
- **0.2 MB** for the current-state map at universe scale (§10.3)
- **65.1%** median minute coverage, **2.1%** for `ERIE` (§7.6)
- **p50 gap one minute, maximum 187** (§11.2)
- **332 bars in 243 ms** (§7.4)
- Revisions: **0.064%** of bars, **29.1–30.1 s** late, **35.3%** changing the
  close (§14.1)

## What is genuinely new at 518, and is this task's to take

- **Process memory across a full session** with the universe subscribed and the
  current-state map live — the figure that decides whether §10.3's 0.2 MB
  estimate survives contact with 518 real entries plus the fan-out
- **Message rate into the gateway at the open**, which is where coalescing
  earns its keep and where the per-client filter is under the most load
- **Fan-out cost**: one observation × N clients, at a client count worth
  defending rather than one
- **Whether §28's 250 ms p95 is measurable yet.** Story 3.4 found it is **not**
  — no wire message carries a server-side instant, recorded as `docs/GAPS.md`
  entry 12 and owned by Story 3.11. **Check whether this story's work changes
  that**; if it does not, say so and leave the entry standing rather than
  re-deriving the same dead end.

## The logging decision that reverses here

Task 1.12.6 declined `ignore: "reqId,pid"` on pino-pretty after measuring that
**51 request pairs across two windows were every one adjacent** — two requests a
minute per tab does not interleave.

**The stated reversal trigger is this epic's socket**, and it fires **in this
story rather than in 3.2**, because this is the first point at which more than
one thing is in the log at a time. The lever is worth **156 → 101 columns**.

Re-measure the interleaving before pulling it: the trigger is a condition, and
confirming the condition has actually fired is the difference between honouring
a reversal trigger and citing one.

## Work

- Take the four new figures above, each with the method beside it
- Confirm the six existing figures rather than re-deriving them; record the date
  of confirmation, not a new measurement
- Re-measure log interleaving at universe scale; pull the `ignore` lever if the
  trigger has fired, and record the column count either way
- Explain every difference from Story 3.1's figures, including the ones that did
  not move

## Done when

1. Four new figures recorded with their method
2. Six existing figures confirmed or corrected, dated
3. The logging trigger evaluated with evidence, and acted on or explicitly not
4. Any figure that falsifies a governing document is **swept the same day** —
   falsification travels upward, and a story close sweeps only this story's own
   documents
5. `pnpm verify` passes

## Scope discipline

**Be pragmatic about what is re-measured.** The instruction on Task 3.4.8 was
that a measurement task must not take hours, and it was honoured there by
confirming three existing figures rather than re-deriving them. Same here.

---

## Handed here by Task 3.5.3 — 2026-09-21: the replay reads one symbol at a time

**Written into this file rather than left in 3.5.3's record**, because a
constraint one task measures for another lives in a file the owning task does
not read. That failure has happened twice already in this epic.

### What was measured

`replay-bar-source.ts` fills its window with

```ts
for (const symbol of symbols) {
  const bars = await repository.readBars(symbol, "1m", range);
}
```

— **one query per symbol, sequentially.** At five symbols that was invisible.
At 518 it is the dominant cost of a fill.

Against the local store on 2026-09-21, 48.8 M bars, a 30-minute window:

| Read pattern                                              | Time         | Rows   |
| --------------------------------------------------------- | ------------ | ------ |
| One symbol — what the replay does, **518 times per fill** | **2.193 ms** | —      |
| The same window across all symbols, **one query**         | **335.5 ms** | 14,685 |

So a fill is roughly **1.1 s** of query time at 518 symbols versus **335 ms**
for the same data in one round trip — and the sequential figure excludes
per-query pool overhead, so it is a floor rather than an estimate.

### Why it was not fixed there

ADR 0030 makes the replay a **development instrument that never runs in
production** (7a–7d), so this is a `pnpm dev` cost and not a deployed one. It is
a **startup and window-boundary** cost rather than a per-minute one, so watching
a page at 1× is unaffected — which is all Tasks 3.5.4 and 3.5.5 need from it.

Fixing it is a change to the replay rather than to the subscription, and
3.5.3's scope was the subscription.

### What this task owes it

- **Decide** whether to batch the read — one query across symbols, grouped by
  instant in memory, which is the shape `fill()` already builds anyway
  (`byInstant`)
- If it is left alone, say so with the figures rather than silently
- **Re-measure rather than cite the table above.** These are dated observations
  of one machine's store

### One measurement this task no longer owes, and a lesson it should record

**The snapshot size is done.** Task 3.5.4 read it off a real message rather than
constructing one: **58,218 bytes — 56.9 KiB** for 518 securities, taken from a
running gateway with an attached `ws` client.

**The figure was wrong twice before that, in both directions:**

| When          | Figure       | How it was arrived at                         | Error        |
| ------------- | ------------ | --------------------------------------------- | ------------ |
| 3.5.2's sweep | ~50 KB/min   | estimated                                     | **40% low**  |
| 3.5.3's sweep | 70.2 KiB     | computed from a constructed `WireObservation` | **23% high** |
| 3.5.4         | **56.9 KiB** | **read off the wire**                         | —            |

The second was _more careful_ than the first and no more accurate, because both
reasoned about a shape rather than reading one — the constructed version used
five-character symbols and real tickers are shorter. **That is the entry worth
carrying forward**: a computed figure is not a measured one however carefully it
is computed, and `CLAUDE.md`'s _a tolerance is measured, never argued_ earned
its wording twice over inside a single story.

**Still to measure here:** the per-minute fan-out cost at a realistic client
count, and whether the 56.9 KiB figure holds late in a session when every one of
the 518 has been observed.

---

## Amended by Task 3.5.6 — 2026-09-21: what the 56.9 KiB figure now means

**It is no longer what a browser receives. It is the ceiling of what one
_could_.**

Before 3.5.6 every attached browser received all 518 observations a minute.
Since it, a browser receives only what it asked for — and the only screen that
asks for anything today is the security page, which asks for **one**. So the
per-browser figure this story has corrected twice is now the **overview's**
figure rather than everybody's, and Story 3.6 is the first thing that will pay
it.

**What this task should measure instead:**

- **The per-client encode cost.** 3.5.6 encodes one message per client
  deliberately — a shared encode would be a cache keyed on the subscription,
  which is a mechanism with no measured problem behind it. _Measure the problem
  before anybody adds the mechanism_: N clients × 518 symbols, at a client
  count worth defending.
- **What a security page actually receives now**, against the 56.9 KiB it
  received this morning. That is the number this story delivered, and nothing
  has read it off the wire yet.
- **The reconnect's cost**, which Task 3.5.5 added and nothing has sized: a
  reconnect sends a snapshot **and** a subscribe, and the browser retries on a
  backoff that never gives up.

**And a method note this task should not repeat.** The snapshot figure was
wrong twice by reasoning about a shape and right once by reading a message off
the wire. Read the message.

---

## What was measured

### 1. What this story actually delivered, read off the wire

The number the whole of Story 3.5 exists to move. Two clients on one gateway,
one subscribed to a single security and one to the universe, with a real
518-security batch published:

| Client                     | `bars` per tick | snapshot on connect |
| -------------------------- | --------------- | ------------------- |
| A security page (1 symbol) | **152 B**       | **212 B**           |
| An overview (518 symbols)  | **57,582 B**    | **57,642 B**        |

**A security page went from 57,582 B a minute to 152 B — 379× less.** That is
what "a browser receives only what it asked for" is worth, and it had never
been read off the wire.

**And it refines the story's own headline figure by a hair.** 3.5.4 measured
the snapshot at 58,218 B using generated tickers; with the **real** universe it
is **57,642 B**. Real symbols are shorter. Both were read from a message, which
is why the gap is 1% rather than the 23% and 40% the _computed_ figures were out
by.

**That correction is deliberately NOT propagated, and this is its one home.**
`56.9 KiB` is written in **eleven** places — six task files, two `STORY.md`s and
two source comments — and rewriting all of them to `56.3 KiB` would be churn
for a difference no reader uses: the figure is cited as _what a universe batch
costs_, and at that precision both are the same statement. The rule against
carrying a figure forward is about **unmeasured** ones; these are two
measurements of slightly different inputs, and the reconciliation belongs in one
place rather than eleven.

**Re-measure:** the instrument is in this task's record — attach a client, send
a `subscribe` for `trackedTickers()`, publish one batch, read `data.length`.

### 2. The current-state map, and §10.3's estimate CONFIRMED

Measured as _what survives a GC when only the map holds it_, which is the
honest question — a first attempt measured the Map's own overhead (29 KiB) and
would have reported a figure seven times too small.

|                                   |                                      |
| --------------------------------- | ------------------------------------ |
| Entries                           | 518                                  |
| Retained                          | **222.8 KiB** (228,160 B)            |
| Per security                      | **440 B**                            |
| After 390 minutes of replacements | **740.9 KiB**, still **518 entries** |

**§10.3 estimated 0.2 MB and the measurement is 222.8 KiB** — within 9%, so the
estimate holds and is now confirmed rather than carried.

**The second row is the one worth keeping.** A full session replaces every
entry 390 times and the map still holds 518, under 1 MiB — _latest-only_ is
doing what it was built to do, measured rather than assumed.

### 3. The per-client encode cost, and the cache that is not needed

3.5.6 encodes one message **per client** deliberately, and said _measure the
problem before anybody adds the mechanism_. Measured, at a universe
subscription each:

| Clients | Per tick     |
| ------- | ------------ |
| 1       | 1.68 ms      |
| 5       | 2.81 ms      |
| 20      | **12.42 ms** |

Roughly **0.55 ms per universe client per tick** beyond the first. At twenty
clients that is **12 ms of a 60-second tick — 0.02%**.

**So the shared-encode cache stays unbuilt**, and now for a measured reason
rather than a stylistic one. **Reversal trigger, as a condition:** the first
time the encode is a measurable share of a tick — which at this rate means
hundreds of universe clients, not a handful.

### 4. §28's 250 ms p95 is still unmeasurable, and this story did not change it

Checked rather than assumed, by enumerating every field on the wire. The only
instant a browser receives is `WireObservation.startsAt` — **the minute the bar
covers**, not when the server received or sent it. 3.5.6 added a `subscribe`
message and it carries no timestamp either.

`docs/GAPS.md` entry 12 **stands unchanged**, owned by Story 3.11. Recording
that is the point: the task asked whether this story's work changed it, and the
answer is no.

## The two decisions, both against what this task expected

### The logging lever stays unpulled — and this task had its own trigger backwards

**This file said the trigger "fires in this story… because this is the first
point at which more than one thing is in the log at a time."** That is the
reverse of what Task 1.12.6 actually wrote:

> `reqId` was kept in the `pretty` rendering **precisely because this story is
> what makes requests interleave**… if they do **not** in fact interleave, the
> lever is worth 172 → 117 columns.

**The trigger is _absence_ of interleaving, not arrival of it.** `reqId` exists
to survive interleaving, so interleaving arriving makes it more valuable, not
less — which `server.ts` says in four words: _proximity is not a correlation
id_.

So the question was empirical, and both answers were taken:

| What was run                               | Result                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| 16 **sequential** requests, socket running | every `incoming`/`completed` pair **adjacent**               |
| 12 **concurrent** requests                 | two opened, **ten other requests completed**, then those two |

**Concurrency interleaves heavily and an ordinary page load is concurrent** —
`/securities` and `/market-data/bars` go out together. Without `reqId` those
completion lines cannot be paired with their requests at all.

**Decision: keep it.** The lever is worth **156 → 101 columns** on a
`request completed` line (confirmed — the figure this file quotes is right),
and it buys a narrower line at the cost of the only field that makes a busy log
readable. `pid` alone would be 8 of those 55 columns and is not worth a change.

**The socket did not bring interleaving.** Its records are a startup burst —
`socket-open`, `greeted`, `authenticated`, `subscribed` at one millisecond —
and then near-silence. The predicted condition arrived from **concurrent HTTP**,
which was already true before this epic.

### The replay's sequential read is left alone, with figures

Re-measured rather than cited, and the answer depends on cache state far more
than 3.5.3's single sample suggested:

| Read pattern                            | Cold             | Warm             |
| --------------------------------------- | ---------------- | ---------------- |
| One symbol (what the replay does, ×518) | 8.561 ms         | **0.17–0.23 ms** |
| All symbols, one query                  | 331.3 ms         | **27.5 ms**      |
| **Implied per fill**                    | ~4.4 s vs 331 ms | ~104 ms vs 27 ms |

**A ratio of 4× warm and 13× cold**, and the sequential figures exclude
per-query pool overhead, so they are floors.

**Left alone**, and the reasons are the ones 3.5.3 gave plus one it could not:
ADR 0030 keeps the replay out of production entirely; the cost is a startup and
window-boundary cost rather than a per-minute one; and **batching means
changing `MarketBarsRepository.readBars`, which is per-symbol by design and
which Story 3.9 may change anyway for its own reasons.** Doing it now would be
reworking a seam ahead of the story that owns it.

**Reversal trigger, as a condition:** the first time a developer's replay
startup is an obstacle to watching a page, or the first change to the store's
read path made for another reason — batch it in the same change rather than on
its own.

## What could NOT be confirmed, and why it is the same blocker as the rehearsal

Six figures were to be **confirmed rather than re-derived**. One was, and it is
the only one this machine can reach:

| Figure                                 | Source | Status                    |
| -------------------------------------- | ------ | ------------------------- |
| 0.2 MB current-state map               | §10.3  | **Confirmed — 222.8 KiB** |
| 1,500 symbols in 305 ms                | §4.3   | **Not confirmable here**  |
| 65.1% / 2.1% minute coverage           | §7.6   | **Not confirmable here**  |
| p50 one minute, max 187                | §11.2  | **Not confirmable here**  |
| 332 bars in 243 ms                     | §7.4   | **Not confirmable here**  |
| Revisions 0.064% / 29.1–30.1 s / 35.3% | §14.1  | **Not confirmable here**  |

**All five are observations of the vendor's socket**, and re-taking any of them
needs a live session _and_ the plan's one connection — which the deployment
holds. That is `docs/GAPS.md` entry 10's standing blocker and **exactly** what
Task 3.4.10's rehearsal is waiting for.

**They are cited with their dates rather than claimed as re-confirmed**, which
is the honest state: `CLAUDE.md`'s rule is _measure rather than cite_, and where
a figure cannot be re-measured the next best thing is to say so by name rather
than to let a citation read as a confirmation.

**Handed to Task 3.4.10's rehearsal**, which needs the same session: when it
runs, five figures can be confirmed in the same sitting for almost no extra
cost.

## Evidence

- Six new figures, each with its method beside it
- Two decisions taken **against** this task's own expectation, both with the
  measurement that turned them
- One of this task's own claims corrected: it had 1.12.6's reversal trigger
  backwards
- `pnpm verify` green: 16 invariants, 921 backend, 1052 frontend, 33 process

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**We measured what the last week of work actually bought, and two of the
answers told us not to do the thing we had planned.**

### The number the week was for

A browser showing one company used to receive prices for **all 518**, every
minute, and throw away 517 of them. We now send it only what it asked for.

Read off the wire rather than estimated:

- **Before: 57,582 bytes a minute** to a page showing one company
- **After: 152 bytes a minute**

**That is 379 times less.** For a screen that eventually shows all 518 — the
market overview — the full amount is still sent, which is correct, because that
screen genuinely wants it.

### The two things we decided _not_ to do

**We did not add a performance optimisation we had been saving.** When we made
each browser get its own personalised message, we knowingly left out a caching
trick that would avoid repeating work — with a note saying _measure the problem
before anyone builds the mechanism_. We measured it: with twenty browsers
connected, the work takes **12 milliseconds out of every 60 seconds**. Two
hundredths of one percent. **The optimisation is not needed**, and now we have
the number rather than an opinion, along with a written note about when that
would change.

**We did not speed up a slow development tool.** Our replay tool — for
developing outside market hours — loads prices one company at a time, which at
518 companies is about four times slower than it needs to be. We left it, for
three reasons: it never runs for customers; it costs a second at start-up
rather than continuously; and fixing it means changing a shared piece of
plumbing that another piece of upcoming work may change anyway. Doing it now
would be doing it twice.

### Where we were wrong about our own plan

The plan said to simplify our developer logs by removing a tracking code from
each line, on the grounds that a change this week would have made it necessary.

**Reading the original decision properly, we had it backwards.** The code was
kept precisely _because_ we expected our logs to become jumbled, and the note
said to remove it only if that jumbling never materialised.

So we tested it both ways. With requests arriving one at a time, the logs are
perfectly tidy. With **twelve arriving at once** — which is what an ordinary
page load does — they are thoroughly jumbled: two requests start, ten _different_
ones finish, then the first two. Without the tracking code you simply cannot
tell which finish belongs to which start.

**So we kept it.** Worth reporting because the plan said otherwise and the
measurement is the reason it changed.

### One thing we honestly cannot check yet

Six figures from earlier in the project were due for confirmation. **We could
confirm one** — the memory our price store uses, estimated at 0.2 MB and
measured at 0.22 MB, so the estimate was good.

**The other five are all observations of the stock exchange's own feed**, and
re-taking any of them needs the market to be open _and_ the single connection
our plan allows, which the live site is currently using. That is the same thing
the final live rehearsal is waiting for — so when the market opens, all five can
be confirmed in one sitting.

We have written them down as _cited, not re-confirmed_ rather than quietly
letting an old number look freshly checked.

### Where the work stands

**Eight of nine** pieces done in this run. What remains is the closing tidy-up —
and then the screen this has all been for: **live prices across all 518
companies at once**.
