# Task 3.5.9 — The sweep, the hand-offs and the close

**Status:** **Complete — 2026-09-21.**
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.8

## Objective

Close the story: confirm every acceptance criterion against the tree rather than
against memory, sweep the documents this story wrote, and **push its constraints
sideways into the stories that will need them.**

## What the user can see when this lands

**Nothing**, and the honest summary of the whole story is that a user sees two
things from it: the identity block is correct on first paint (3.5.4), and a tab
survives a deploy (3.5.5). Everything else is the model
[3.6](../story-06-live-prices-across-the-universe/STORY.md) spends.

## The criteria, each checked against the tree

Walk all eight from [`STORY.md`](STORY.md) and state where each is proven — a
test name, a break entry, a measurement, or an honest _not met_. Two are worth
flagging in advance:

- **Criterion 7's "explained rather than noted"** is the one most likely to be
  claimed rather than done
- **Criterion 3's "at a size where the difference is visible"** is not satisfied
  by a three-symbol test, for Task 3.5.6's reason

## The hand-offs, which are the part a close routinely misses

**A hand-off sweeps SIDEWAYS, and a story close does not reach it.** A close
sweeps the documents the story **wrote**; a constraint one story measured for
another lives in a document the **owning** story does not own. Nothing about a
close naturally crosses that boundary.

So: write each constraint **into the sibling's `STORY.md`, in words that story
can act on** — never a link back, because a pointer is what a reader follows
when they already know to look, and the whole failure is that they do not.

**Enumerate mechanically rather than from memory.** Grep this story's documents
for every `Story N.M` and `Owner:` line, check each against that story's own
file, and **record the count that were missing.** This has happened twice in
this epic already: Story 3.1's close gathered five constraints for one story and
missed a story its own findings document named in as many words — having written
down, in that same close, that this is _"exactly how a measured constraint gets
lost"_.

Known candidates, to be confirmed rather than trusted:

- **Story 3.6** — the fan-out shape and the per-client subscription protocol it
  is about to spend, and whatever Task 3.5.8 measured about fan-out cost
- **Story 3.9** — whether today's bars are held in memory or assembled, because
  the chart's shape depends on the answer
- **Story 3.8** — that the current-state map is `status`-**filtered** and its own
  read path deliberately is not
- **Story 3.10** — the gap a reconnect leaves, which Task 3.5.5 explicitly did
  not fill, and the backpressure close code's interaction with retry
- **Story 3.11** — anything Task 3.5.8 could not measure, especially §28's p95
  if it is still unmeasurable
- **Epics 4, 5 and 7** — the three readers outside this epic that want the
  latest observation per security and none of which wants to open a socket.
  These are the reason the object exists at all, and they are the most likely to
  be missed because they are not in this epic's table

## Work

- The eight criteria, each with its evidence
- The hand-off enumeration, with the missing count recorded
- Sweep `LIVE-DATA.md` and `STREAM-SEAM.md` for claims this story falsified
- Add to `docs/GAPS.md` anything true, load-bearing and guarded by nothing — the
  candidate already identified is **an empty default that is also a true answer
  hides a design event until the day it stops being empty** (Task 3.5.4)
- Update `CLAUDE.md`'s _Current state_ — what a user can see, and what they
  still cannot
- Confirm `LIVE-REHEARSAL.md` owes this story nothing, since it is an invisible
  story; if 3.5.4 or 3.5.5 changed a visible surface, **it owes a dated row**

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. The hand-off count is recorded, including if it is zero
3. `CLAUDE.md` describes the tree as it now is
4. `docs/GAPS.md` has gained whatever this story left standing
5. `pnpm verify` passes, and `pnpm links` resolves every reference added

---

## Amended by Task 3.5.1 — 2026-09-21: one hand-off is now concrete rather than anticipated

**Story 3.8 owns a correction this story deliberately drops.**

3.5.1 decided that the current market state **ignores a revision for a minute
already passed** — it does not change what the _latest_ observation is, and
applying it would walk the object backwards in time. The reasoning is sound and
the consequence must be written into the sibling that can act on it:

> **A revision for a superseded minute is discarded by the live path entirely.**
> §14.1 measured revisions at 0.064% of bars, **35.3% of them changing the
> close**, so these are materially wrong numbers rather than noise. The only
> place they can be applied is the **store**, and the store is Story 3.8's. If
> 3.9 does not apply them, this product's stored history is permanently and
> knowably wrong for a small fraction of bars — and nothing will ever report it,
> because the frame that would have corrected it was dropped a story earlier.

**Write that into `story-08-storing-the-live-session/STORY.md` in words that
story can act on**, not as a link back. It is exactly the shape of constraint
this epic has already lost twice.

**Re-check the hand-off enumeration against the re-ordering.** Tasks 3.5.2–3.5.7
were renumbered on 2026-09-21 after 3.5.1; a hand-off written against an old
number is a pointer to the wrong task, which is worse than no pointer.

---

## Amended by Task 3.5.4 — 2026-09-21: two `docs/GAPS.md` entries, drafted rather than described

3.5.4's own note asked this sweep to decide whether its finding deserved an
entry. It does, and so does a second one the task produced. **Both are drafted
here so the decision is whether to keep them rather than what to write.**

### 1. An empty default that is also a true answer hides a design event

`snapshot: () => new Map()` was **correct** — §11.1 makes `{}` the true answer
after a restart rather than a degraded one — and it was also the cause of the
largest undesigned visual change in the product, on every page load, for four
days. Nothing was wrong with the code, so nothing could have flagged it.

**The general shape:** a placeholder that is indistinguishable from a legitimate
value **cannot be found by reading the code**, because there is nothing to find.
It surfaces only when the value stops being empty — and by then whatever was
built on top of it has a behaviour nobody chose.

**Re-measure:** for each `() => new Map()`, `?? []`, `?? {}` or equivalent in a
seam, ask _is this also a legitimate runtime value?_ If yes, the surface above
it has a state nobody has designed. `grep -rn "() => new Map()\|?? \[\]\|?? {}" apps/*/src`
and read each hit against the surface that consumes it.

### 2. The flash being gone is guarded by nothing

**It was verified by a person watching a page load, and that is still the only
thing that can see it.** `pnpm verify` is green either way; the browser suite
does not assert it, and cannot easily: CI's store has 518 securities and **zero
bars**, and no live provider, so the identity block there is a correct `empty`.

The mechanism is guarded — `pnpm break the-snapshot-marks-every-security-as-arriving`
proves the arrival rule — but _the block is correct on first paint_ is not.

**Re-measure:** run the pair against a stream that has observed
(`MARKET_DATA_PROVIDER=fixture NON_LIVE_MARKET_DATA=permitted pnpm dev`), load
`/securities/NVDA`, and read the first frame. It must say `LATEST PRICE` and
carry no arrival disc. **Owner: the first story whose browser suite runs against
a server with live observations** — a condition rather than a story number.

### And re-check the hand-off enumeration

Two figures were corrected across tasks during this story (the snapshot size,
twice) and the task numbers moved once. A hand-off written against an old number
or a stale figure is worse than none.

---

## Amended by Task 3.5.6 — 2026-09-21: a third GAPS entry, and one hand-off already written

### 3. A developer's own store can make a browser spec fail as a product defect

**Drafted like the other two, so the decision is whether to keep it.**

`CLAUDE.md` already says _before asserting on a number in a browser spec, ask
whether CI has the data_, and ships `pnpm store:bare`. What it does not say is
the shape of the failure when you forget — and Task 3.5.6 produced it:

A store ten days stale answers `5D` **empty** and `1M` **populated**. The
readout strip is absent in one state and present in the other, so pressing a
window moves the chart **90 px** — and `security-window-change.spec.ts` asserts
it does not. The failure reads as a **layout defect in the product**, complete
with a screenshot showing a chart in the wrong place.

**It was mis-diagnosed three times in one session**: as machine load, then as a
regression bisected to a specific task (on the strength of a `main` run that
happened to pass), and only correctly on the third pass. A suite that fails a
_different set each time_ looks like contention and is not.

**Re-measure:** run any browser suite against `DATABASE_NAME=marketpulse_bare`
before believing a failure that looks like layout or a missing figure. If it
passes there and fails against your own store, the store is the subject.

**Owner: a condition** — the first browser spec that asserts on a figure whose
presence depends on a window having data.

### And one hand-off is already written rather than listed

**Story 3.6's `STORY.md` has it**, added 2026-09-21: it is the first screen that
has to _ask_ for anything, the mechanism is a page-declared subscription rather
than an address-derived one, and it inherits the three properties it does not
have to build. Written into that file in words it can act on rather than left
as a pointer — which is what this task's own enumeration exists to force.

**Still to check at the close:** every `Story N.M` and `Owner:` line in this
story's documents against that story's own file, with the missing count
recorded.

---

## What was done — 2026-09-21

### 1. The hand-off enumeration, run mechanically, and the count

Every `Story N.M` and `Owner:` line in this story's nine task files and its
`STORY.md` was grepped, the recipients tallied, and **each one checked against
that story's own file** rather than against the tally.

| Recipient  | Times named in 3.5's documents | Carried the constraint beforehand?                                  |
| ---------- | ------------------------------ | ------------------------------------------------------------------- |
| Story 3.6  | 8                              | **Yes** — written by Task 3.5.6                                     |
| Story 3.8  | 10                             | **Partial** — 2 pre-existing lines, neither the revision constraint |
| Story 3.9  | 3                              | **No** — 0 mentions                                                 |
| Story 3.10 | 8                              | **Partial** — 1 line                                                |
| Story 3.11 | 3                              | **No** — 0 mentions                                                 |
| Epic 4     | named in `STORY.md`'s opening  | **No** — 0 mentions                                                 |
| Epic 5     | named in `STORY.md`'s opening  | **No** — 0 mentions                                                 |
| Epic 7     | named in `STORY.md`'s opening  | **No** — 0 mentions                                                 |

**Seven of eight recipients were missing their constraint** — four of the five
siblings inside this epic, and **all three** of the epics outside it.

**The three outside were the ones this task warned about in advance**, and they
were missing by the widest margin: zero mentions each, in the three epics that
are _the reason the current market state exists at all_. `STORY.md`'s second
paragraph says so in as many words — _Epic 4's overview, Epic 5's anomaly
scores and Epic 7's analytical tools all want the latest observation per
security, and none of them wants to subscribe to a socket to get it_ — and none
of those three files knew. **A recipient outside the epic's own table is not
merely likelier to be missed; in this sweep it was missed every time.**

What was written, in each recipient's own file and in words it can act on:

- **3.9** — _the live edge has no series to draw_: the state is latest-only, so
  today's session must be assembled from the store plus the socket. 3.9 is also
  the surface that fires Task 3.5.5's reversal trigger for gap-filling.
- **3.8** — _a correction the live path throws away_: a revision for a
  superseded minute is discarded entirely (0.064% of bars, **35.3% changing the
  close**); the store is the only place it can be applied. Plus the `status`
  filter asymmetry, which must not be "fixed".
- **3.10** — the gap a reconnect leaves and why it is deliberately unfilled; the
  close code is now load-bearing and `1001` is forbidden for backpressure; and
  a dropped-for-backpressure client **cycling at the 30 s ceiling** is a chosen
  degraded state rather than an inherited one.
- **3.11** — §28's p95 is still unmeasurable and needs a **protocol** change;
  the logging lever was measured and deliberately not pulled, with the figures,
  so 3.11 must not re-open it blind; `market-stream.ts` still never references
  `onLog`.
- **Epics 4, 5 and 7** — the five properties of the object that shape what is
  built on it (latest-only, `status`-filtered, absence is normal at 65.1%
  median coverage, empty after a restart is a _legitimate_ value, and it never
  walks backwards), plus the IEX-versus-consolidated provenance split, and one
  paragraph each on what bites that epic specifically: the **denominator** for
  breadth (4), **how much of the window was observed** inside every score (5),
  and `UNKNOWN` as a correct tool outcome (7).

### 2. The eight criteria, with evidence

| #   | Criterion                                                                                | Verdict | Evidence                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Universe subscribed, **accepted list counted**                                           | **Met** | `alpaca-stream.ts` reconciles the ack per channel; `alpaca-stream.test.ts` — _reports a shortfall when the server holds fewer than we asked for_ and _refuses to send an EMPTY subscription rather than asking the vendor_. Break: `pnpm break the-upstream-set-stops-being-the-universe`                                                                        |
| 2   | Current state readable by symbol, with instant, source and age                           | **Met** | `current-market-state.test.ts` — _reads a price and its instant in the same call_, _says how old an observation is, computed on read rather than stored_, _answers `nothing observed` for a symbol it has not seen_                                                                                                                                              |
| 3   | A browser receives only what it asked for, **at a size where the difference is visible** | **Met** | `market-gateway.process.test.ts` — _sends one client its symbol while another gets the universe, at once_, over a **real socket** at **200 symbols**. Deliberately not three: a three-symbol test passes against a `broadcast()` that ignores the filter entirely                                                                                                |
| 4   | A slow browser grows no queue and is dropped                                             | **Met** | `market-gateway.process.test.ts` — _drops a client that stops reading_, _leaves a HEALTHY client on the same process untouched_, _closes with a code that is NOT `going away`_, _has a threshold clear of what the kernel absorbs on its own_. The threshold is 1 MiB against a measured **33.6 MB after 600 batches**, with the kernel absorbing ~557 KiB first |
| 5   | `SIGTERM` closes the socket and the process exits inside the ceiling                     | **Met** | `index.process.test.ts` asserts the exit for both signals; `registerMarketStreamCloser` is what makes the socket part of it. Asserted by the suite rather than by a log line, as the criterion requires                                                                                                                                                          |
| 6   | `status` is filtered here                                                                | **Met** | `current-market-state.test.ts` — _holds nothing for a symbol outside the tracked universe_, _defaults to the tracked universe rather than to everything_; one definition in `universe.ts` read by both ends. Break: `pnpm break the-current-state-holds-an-untracked-security`. The asymmetry with Story 3.8's read path is now **written into 3.9's own file**  |
| 7   | Rates and memory measured at universe scale, **difference explained rather than noted**  | **Met** | Task 3.5.8. Every figure either re-read off the wire or confirmed with a date, and the differences argued — including the snapshot figure, which was wrong **twice by computation** before being right once by reading a message. The one thing it could **not** measure (§28's p95) is stated as unmeasurable with the reason, not noted                        |
| 8   | `pnpm verify` passes                                                                     | **Met** | Green on this branch, 17 invariants                                                                                                                                                                                                                                                                                                                              |

**Eight verdicts, none of them _probably_**, and none of them _not met_ — which
is itself worth flagging rather than celebrating: this story's two hardest
criteria (3 and 7) were the two most likely to be claimed, and both were
answered by a task that went and produced a number.

### 3. The sweep, and the claim it falsified

`LIVE-DATA.md` and `STREAM-SEAM.md` were swept for claims this story falsified.
Nothing in either needed correcting: this story **spent** their measurements
rather than contradicting them, and where a figure moved (the snapshot size) it
moved inside this story's own documents, which Task 3.5.8 already settled.

**What the sweep did falsify was in a third file, and it was a claim about a
mechanism.** `LIVE-REHEARSAL.md`'s rules said:

> **Story 3.11 cannot close with a missing row**, and that is checkable rather
> than promised: `pnpm invariants` asserts every story marked complete in
> `EPIC.md` has a row here.

**Nothing asserted anything.** `grep -i rehearsal scripts/` returns nothing, and
the sentence names a **completion marking in `EPIC.md` that does not exist** —
that table's fourth column marks _visibility_.

This is the sharpest shape on the list, because **a claim about a mechanism
reads exactly the same whether the mechanism is there or not**, and this one was
more convincing than prose would have been: it named the command. It was found
by grepping for the subject rather than by reading the sentence, which is the
only way this class is ever found.

**Made true rather than corrected**, per `CLAUDE.md`'s rule that an entry which
can be made mechanical should be. `pnpm invariants` gained
`the-epic-close-cannot-outrun-the-rehearsal-ledger`, and it owes and has a
break: `pnpm break the-close-outruns-the-rehearsal`, verified red and restored
byte-identical.

**The check is narrowed to what the file can actually support**, and the
narrowing is the honest part. A per-story check would go red **today** on Story
3.3, which closed on 2026-09-19 with an empty row for a reason the epic
accepted — the deployed backend holds the free plan's one Alpaca connection, so
no developer machine can watch a live session at all. **A check that goes red on
a constraint nobody can clear is a check that gets deleted.** So it keys on the
**epic close**, which is where the file itself puts the deadline.

### 4. `LIVE-REHEARSAL.md` owes this story a row after all

The task asked this to be confirmed rather than assumed, and the assumption was
wrong. **3.5 was on the exempt list and should not have been.**

Its scope says _nothing new visible_ and its `EPIC.md` row says `No`. Both are
true about **capability** — and two of its nine tasks changed what a reader
sees, because both were **repairs** rather than features: 3.5.4 deleted the
three-line flash on every security page load, and 3.5.5 stopped every deploy
stranding every open tab.

**A story exempted on the strength of its scope line is exempted on the
strength of what it meant to change**, and a repair is precisely the thing that
changes a surface without appearing in a scope. The ledger is now seven rows.

**The row is empty and the rehearsal is owed rather than waived.** The market
next opens **Monday 2026-09-22 09:30 ET**, and three of the five items can be
taken against the **deployed** site — which is where Task 3.4.10's blocked list
already sits, so the two rehearsals are one sitting.

### 5. `docs/GAPS.md` gained three entries

All three were drafted in this file by the tasks that produced them, so the
decision here was **whether to keep them** rather than what to write. All three
kept, verbatim in substance:

1. **An empty default that is also a true answer hides a design event until the
   day it stops being empty** — `snapshot: () => new Map()` was _correct_ and
   was simultaneously the cause of the largest undesigned visual change in the
   product, for four days. Nothing was wrong with the code, so nothing could
   have flagged it.
2. **The identity block being correct on first paint is guarded by nothing** —
   verified by a person watching a page load, which is still the only thing that
   can see it. CI's store has zero bars.
3. **A developer's own store can make a browser spec fail as a product defect,
   with a screenshot** — mis-diagnosed three times in one session, twice
   confidently.

### 6. What this story did NOT do, stated plainly

- **The rehearsal.** Blocked on a session, dated above.
- **§28's 250 ms p95.** Still unmeasurable; `docs/GAPS.md` entry 12 stands and
  3.11 now knows why.
- **The replay's one-query-per-symbol read.** Left alone with the figures
  (2.193 ms × 518 sequential against 335.5 ms for one query), because ADR 0030
  makes the replay a development instrument that never runs in production.
- **The logging lever.** Measured and deliberately not pulled.

---

## For the stakeholders — what this task actually did, in plain words

**Short version: this was the tidying-up job at the end of a big piece of
plumbing work, and it found one thing that genuinely mattered.**

### What the last few weeks built, and what you can see of it

Story 3.5 rebuilt the part of MarketPulse that receives live prices. Before it,
the system watched five companies and pushed everything it heard at every open
browser tab. Now it watches **all 518 companies we track**, keeps a running
picture of _the latest price for each one_, and sends each open tab only the
handful it is actually showing.

**Almost none of that is visible**, and we said so up front. It is the engine
room for the next story, which puts live prices for the whole market on screen.

**Two things are visible, and both are repairs rather than features:**

1. **Open a company's page and the price is simply right.** It used to flicker
   through three different states in the first second — "no live price", then
   yesterday's number, then today's — with a little "something arrived" marker
   firing on a company that had done nothing at all. Gone.
2. **Deploying an update no longer breaks every open tab.** Anyone with the site
   open used to be left staring at `DISCONNECTED` until they reloaded, every
   time we shipped. Now the browser quietly reconnects — fast when it can tell
   we were deploying, more cautiously when it cannot tell why the connection
   went.

### What this particular task was for

Two jobs, both unglamorous and both about the work not leaking away.

**The first: prove it, rather than remember it.** This story made eight
promises. This task walked all eight and wrote down, beside each, the specific
test or measurement that proves it — **eight verdicts, none of them "probably"**.
Two were flagged in advance as the ones most likely to be _claimed_ rather than
_done_, and both held up: the filtering is proven against 200 companies over a
real connection, not three companies in a simulation, because a three-company
test passes even if the filtering is broken.

**The second: push what we learned sideways, into the teams that will need it.**

This is the part that keeps costing us, so it is worth explaining. When one
piece of work measures something that constrains a _different_ piece of work,
that finding lives in the first team's notes — and the second team never reads
them, because they do not know to look. We have lost findings this way twice
already in this epic.

So this task went looking mechanically rather than from memory: it listed every
other part of the product our notes referred to, then checked each of those
parts' _own_ files to see whether the constraint had actually arrived.

**Seven of the eight had not.** And the three that were missing by the widest
margin — nothing at all — were the three furthest away: the Market Overview, the
Anomaly Detection and the Investigation Engine. **Those three are the reason
this whole piece of plumbing exists.** Our own story document says so in its
second paragraph. They just did not know.

All seven have now been written into, in their own files, in words they can act
on — not a link back, because a link is something you follow once you already
know to look, and not knowing is the entire problem.

### The one real find

`LIVE-REHEARSAL.md` is a small file whose whole purpose is to stop us shipping a
live-data feature that nobody ever watched working live. It said, confidently,
that this was **automatically enforced** — that our checks would refuse to let
the epic finish with a missing entry.

**They did not. Nothing was checking anything.** The sentence named a mechanism
that had never been built, and it named a specific command, which made it _more_
convincing than a vague promise would have been.

This is a nasty category, and worth stakeholders understanding: **a written
claim that something is automatically checked reads exactly the same whether it
is true or not.** You cannot spot it by reading carefully. It was found only by
going and looking for the machinery and finding an empty room.

**We built the check rather than softening the sentence**, and we then
deliberately broke it to confirm it goes red — because a check that has never
failed has never been tested.

We also narrowed it honestly. The obvious version would fail _today_, on an
earlier story that closed with a blank entry for a reason we accepted: our free
market-data plan allows exactly one connection at a time, our live site holds
it, and so no developer machine can watch a live session at all right now. **A
check that fails on something nobody can fix is a check somebody deletes.** So
it fires at the end of the epic, where the problem has to be solved or
consciously waived.

### What we are still honest about not having

- **Nobody has yet watched this work during real trading hours.** The market
  next opens Monday morning. This task found that Story 3.5 had been _wrongly
  excused_ from that obligation — excused because its plan said "nothing
  visible", when two of its nine pieces of work changed the screen anyway. Both
  were repairs, and **a repair is exactly the thing that changes what people see
  without ever appearing in a plan.** The obligation has been put back.
- **We still cannot measure one of our published speed targets** (price arrives
  → on screen within a quarter of a second). Our own messages do not carry a
  server timestamp, so there is nothing to measure _from_. That is a deliberate
  change to the message format, not a measurement, and it has been handed to the
  epic that owns cost and performance — with the reasoning, so nobody spends a
  day rediscovering the dead end.
- **We chose not to pull one tuning lever** that would have made our logs
  narrower, because we measured it and the assumption behind it turned out to be
  backwards. Recorded with the numbers, so it is not re-litigated blind.

### Why this matters commercially

None of this adds a feature. What it does is stop the next three months of work
being built on things we believe rather than things we know — and it closes a
gap where **seven of eight** downstream teams were about to start work without a
constraint that had already been measured for them. That is the difference
between paying for a measurement once and paying for it three times.

---

## Re-numbered by the sweep that followed this task — 2026-09-21

**Every story number above refers to the epic as it was when this task ran.**
The sweep that followed it re-ordered three stories, and the references in this
file have been remapped in the same change rather than left pointing at the
wrong story:

| Story                                            | Was | Now     |
| ------------------------------------------------ | --- | ------- |
| The Tape on the Bar                              | 3.8 | **3.7** |
| Storing the Live Session                         | 3.9 | **3.8** |
| The Live Edge on the Chart & the Two-Feed Ledger | 3.7 | **3.9** |

**The re-order is downstream of this story's own implementation**, which is why
it is recorded here: Task 3.5.1 made `currentMarketState` **latest-only**, and
the hand-off this task wrote into the live-edge story turned that from an open
design question into a fact — with today's earlier minutes held nowhere, the
chart has to read them from the store, so the store now precedes it.
