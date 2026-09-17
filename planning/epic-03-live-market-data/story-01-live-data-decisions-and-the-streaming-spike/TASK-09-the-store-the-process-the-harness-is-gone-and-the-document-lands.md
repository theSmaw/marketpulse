# Task 3.1.9 — Decisions 7 and 8, the harness is gone, and the document becomes the epic's

**Status:** **Open on one line — 2026-09-17.** Decisions 7 and 8 are settled, the document is finished and named in `CLAUDE.md`, the credential checks ran clean, the sweep ran and the hand-offs are delivered. **What is deliberately not done is the deletion**, and the owner chose that on 2026-09-17: `~/marketpulse-live-spike/` survives until the weekend hold (Friday 2026-09-18 20:00 ET → Monday 2026-09-21 04:00 ET) and until tonight's session capture answers 3.1.5's two inherited measurements. **Three measurements are owed and this task owns them** — see _What is still open_ at the foot.
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.8. **Carries two measurements handed here by Task 3.1.5 on 2026-09-16**, both of which need a live session the shut-market fault pass could not have — see _Two session measurements inherited from 3.1.5_ under Work.

## Objective

Take the last two decisions — **whether the frontend gains a store**, and **the
socket's relationship to the process** — then close the story: delete the
harness, prove no credential reached the repository, finish `LIVE-DATA.md`, put
it in `CLAUDE.md`'s _Where the record lives_ table, and hand the next ten stories
a file they cite instead of re-deciding.

## What the user can see when this lands

**Nothing**, and the story ends as it began: the application is a historical
explorer on the day this closes. **Story 3.3 is the payoff and it is two stories
away** — which is the shape Story 2.4 had to be inserted to produce and this
epic builds in from the start. Say that plainly when reporting the close.

## What is already decided and must not be re-taken

- **`FRONTEND-STATE.md` §1's three reversal triggers are conditions**: the first
  piece of state **two sibling surfaces both write**; the first
  `WorkspaceCommand` that must be applied to state no URL can carry; the first
  requirement for undo, redo or a replayable command log. And what is
  deliberately **not** a trigger: bundle size, a third hook, or a component tree
  deep enough to be annoying to prop-drill.
- **The bundle arithmetic is already measured** and must not be re-taken:
  RTK + react-redux **+8.43 kB gzipped**, react-query **+9.54 kB**, RTK Query
  **+25.27 kB**, a hand-rolled bounded `Map` cache **+0.13 kB**. Redux itself is
  the cheap half; what is expensive is a data-fetching layer bolted to it.
- **The shape that keeps the migration cheap is already in the tree** — state in
  a module as a plain discriminated union whose transition is a pure function, a
  reducer that has not been told it is one. A store arriving later is a
  re-wiring, and that is the whole reason this can be answered honestly rather
  than defensively.
- **`minReplicas: 1` is required** (ADR 0011), and Task 3.1.6's person already
  answered whether the socket is held open outside market hours. Decision 8
  executes that answer; it does not re-open it.
- **`deploy.yml` rolls the backend**, and Task 3.1.5 measured what a duplicate
  connection does on a one-connection plan. Whatever that measurement said is
  binding on decision 8. **It said this, on 2026-09-16 —
  [`LIVE-DATA.md`](LIVE-DATA.md) §8.2: the INCUMBENT wins.** The arriving
  connection is told `{"T":"error","code":406,"msg":"connection limit exceeded"}`
  233 ms after authenticating and is closed 9,964 ms later; the incumbent keeps
  its socket **and all 518 subscriptions** and does not notice.

  So decision 8 is not choosing a policy against an unknown — it is executing
  against a **guaranteed, every-deploy behaviour**: the newly-rolled replica has
  no feed until the outgoing one's socket is actually gone. Three things follow
  and decision 8 owns the first two:

  - **What the starting process does when refused.** Retry with what cadence,
    for how long, and what it reports meanwhile. §8.7 measured that reconnecting
    immediately is not penalised, so the cadence is a politeness decision rather
    than a penalty-avoidance one — say so, because a backoff justified by a
    penalty that does not exist is a number nobody can revisit.
  - **What the stopping process does with its socket**, and whether it closes it
    deliberately on `SIGTERM` rather than letting the replica's death close it.
    §6.4 and §8.8 are the reason this matters more than it looks: a **half-open**
    socket holds the one permitted connection with nothing alive behind it, so a
    process that dies without closing can lock its own successor out for as long
    as the upstream takes to notice — which §6.4 measured at over four hours.
  - **Whether the overlap window is bounded at all** is Story 3.11's, and it is
    named there rather than here.

- **One logging decision reverses here.** Task 1.12.6 declined `ignore:
"reqId,pid"` on pino-pretty after measuring 51 adjacent request pairs, and
  named its reversal trigger as **this epic's socket, or anything else that puts
  more than one request in the backend's log at a time**. The lever is worth
  156 → 101 columns.

## Work

> **Added 2026-09-17 by Task 3.1.6 — one answer settles decision 8's premise
> and the other may have fired decision 7's trigger.**
>
> **Decision 8's answer is given** ([`LIVE-DATA.md`](LIVE-DATA.md) §9.3):
> **the socket is held open always** — one connection, opened at boot, never
> deliberately closed. Not on cost, which was measured away twice, but because
> both alternatives buy a **calendar-driven scheduled transition**, and
> `CALENDAR.md`'s exception table exists because that is where half-days and
> holidays break. Decision 8 executes this; it does not re-open it.
>
> **Decision 7's walk has changed, and this is the part worth doing carefully.**
> §9.5's answer is that a browser subscribes to the **whole universe**, so the
> frontend holds live state for **518 securities** consumed by a table, a chart
> and — in Epic 6 — a topology. `FRONTEND-STATE.md`'s first trigger is _the
> first piece of state two features must agree about that neither owns_, and
> 518 live prices read by three surfaces is exactly that shape.
>
> **It is not automatically fired**, and the distinction is the one this task
> already insists on: **two readers is prop-drilling; two writers is a store.**
> Live prices have one writer — the socket — and many readers, so the trigger
> may still not fire. Walk it against the whole-universe answer rather than
> against today's tree, and **record which of the two it turned out to be**,
> because a reader in six weeks will see 518 shared prices and assume the
> question was never asked.

> **Added 2026-09-17 by Task 3.1.7 — one fact for each decision.**
>
> **Decision 7's walk gets sharper, not easier.** §10.3 settles that the
> current-state object has **exactly one writer — the socket — and many
> readers**. That is now a measured property of the design rather than an
> expectation, and it cuts toward _no store_: this task's own rule is that two
> readers is prop-drilling and two **writers** is a store. Walk it anyway,
> because §10.2's whole-universe answer puts 518 live prices in front of three
> surfaces, and record which side it landed on.
>
> **Decision 8 gains its reconnect path, and it is trivial.** §10.2: the upstream
> subscription is a **constant** — always the same 518 — because §8.7 measured
> that the server remembers nothing across a reconnect. So the reconnect path
> re-sends a constant; **there is no subscription state to restore**, and the
> only check afterwards is _does the `bars` key hold 518 entries?_ A decision 8
> that designs a resubscription protocol is designing for a problem this epic
> does not have.

> **Added 2026-09-17 by Task 3.1.8 — decision 7 gains two more points, and
> decision 8 gains a second audience.**
>
> **Decision 7: the walk now has three facts, not one, and all three point the
> same way.** §10.3 gave it one writer and many readers. [`LIVE-DATA.md`](LIVE-DATA.md)
> §11.1 adds a second — the browser protocol is **a snapshot then deltas**, so on
> the frontend there is exactly **one message handler** applying everything, which
> is one writer again rather than two surfaces racing. And §11.2 adds a third:
> a security's **age is derived** from its instant and the reader's own clock, so
> it is not state at all and cannot be state two features disagree about.
>
> **Walk it anyway and record the outcome either way** — this task's own rule —
> but the honest expectation is now _no store_, and the walk should say so
> plainly rather than arriving there apologetically.
>
> **Decision 8 has a second audience it did not have.** The task asks how the
> socket's state is _observable to an operator_. §11.1 makes it observable to a
> **user** as well: the upstream feed's state travels to browsers as a **`feed`
> message**, and §11.2 gives it concrete numbers — `disconnected` at **165 s**,
> `stale` at **60 s** while the market is open. So decision 8 settles one state
> with two renderings, not two states, and _our socket is fine and the market
> feed behind it is dead_ has to be sayable in both.
>
> **And the sweep has one specified-but-unbuilt item to confirm rather than
> find.** §11.3: `replay` is a `ProviderId` **and** a `MarketFeed` in ADR 0030
> §3, and neither union holds it — `PROVIDER_IDS` is `["fixture", "alpaca"]`,
> `MARKET_FEEDS` is `["iex", "sip", "synthetic"]`, and no replay provider exists
> in `apps/backend/src/`. **Owner: Story 3.2**, which builds the replay stream.
> That is the correct state for an ADR whose implementer is a story ahead; the
> sweep's job is to confirm the owner is still named rather than to raise it as
> new.

**Decision 7 — whether the frontend gains a store.** Answer it with the
condition in hand. The question is not _will this epic be annoying without one_;
it is **does a trigger fire**. Walk the three explicitly against what
Stories 3.3–3.7 will actually do — a connection state read by the chrome, live
prices read by a table and a chart, a subscription the page declares — and say
for each whether two surfaces **write** it or merely read it. Two readers is
prop-drilling; two writers is a store. Record the answer either way, with the
walk, so that Story 3.6 does not re-take it when the prop-drilling starts to
chafe.

**Decision 8 — the socket's relationship to the process.** One replica, one
socket. Settle: where the socket's lifecycle sits relative to the process
lifecycle and the existing signal handling in `index.ts`; what happens on a
deploy given Task 3.1.5's duplicate-connection measurement, and whether an
overlap window needs handling or merely documenting; what a shutdown owes a
connected browser; and how the socket's state is observable to an operator —
naming the pino reversal above, which fires here.

**Then close.**

- **The harness is gone — but not before the weekend window, which this task now
  holds.** Deleted, and the tree byte-identical outside `planning/`. Check it
  rather than assert it. **Added 2026-09-15 by Task 3.1.3**: of that task's four
  windows, the **weekend** could not be taken — the next one closes at 20:00 ET
  on Friday 2026-09-18 and opens at 04:00 ET on Monday 2026-09-21 — and it is
  parked here as a **constraint on the deletion** rather than as a new task,
  deliberately. A task whose trigger is a date is a task that never fires; this
  repository has the scar, in the design test deferred seven times because "its
  trigger is the calendar rather than a condition, so nothing fires". A
  constraint on a task that **cannot complete without discharging it** does
  fire. So: **do not delete `~/marketpulse-live-spike/` until either the weekend
  hold has been taken and written into `LIVE-DATA.md` §6, or this story has
  closed and recorded the weekend as unmeasured with Epic 3 named as owner.**
  The hold is unattended — the capture writes itself to disk every sixty seconds
  — so it costs somebody a command on Saturday morning, not a morning.
- **No credential appears anywhere in the repository**, checked rather than
  assumed — grep the tree for the key's own bytes and for the shape of one, and
  record that the check ran and what it covered. Acceptance criterion 4 is
  satisfied by the check, not by the intention. **The tooling exists since Task
  3.1.2**: the harness's `verify-captures.mjs` sweeps every capture
  independently of the writer, and a repo-wide `git grep` over four credential
  forms ran clean on 2026-09-15. **Re-run both before deleting**, because the
  captures written by 3.1.3–3.1.5 have not been through the second check yet.
- **Finish `LIVE-DATA.md`.** All eight decisions present with alternatives, a
  measurement where one exists, and a reversal trigger that is a **condition**.
  Every figure dated and naming the instrument that produced it. A short opening
  section for someone who reads one section, in the shape of `ALPACA.md` §0. And
  a `What was NOT measured, and why` section in the shape of `ALPACA.md` §10 —
  stated rather than quietly omitted, including the n=1 caveat on every rate
  figure.
- **Add `LIVE-DATA.md` to `CLAUDE.md`'s _Where the record lives_ table**, with a
  one-line subject description, and check the surrounding rows are still true.
- **Sweep upward.** A measurement that falsifies a governing document is swept
  the same day. This story measures a vendor, and what it may invalidate is a
  premise elsewhere: check §7.1's feed table, `ALPACA.md` §10's statement about
  what was not measured, and every sibling `STORY.md` in this epic that cites a
  figure this story has now taken for real. Correct the live claims, give any
  ADR a **dated amendment** rather than a rewrite, and leave historical records
  standing.
- **Hand Story 3.2 the three constraints this story measured but does not own.**
  All three are in [`LIVE-DATA.md`](LIVE-DATA.md) and none is one of the eight
  decisions, which is exactly how a measured constraint gets lost. **Amended
  2026-09-15 by Task 3.1.3: there are three rather than two, and the first has
  been promoted rather than restated.**
  - **The server heartbeats every 54 seconds** (§6.3), on a socket subscribed to
    nothing as much as on one subscribed to all 518. That is the signal that
    tells a quiet feed from a dead one out of hours, and it means this product
    does **not** need a keepalive of its own.
  - **Node's built-in `WebSocket` cannot see a ping or a pong** (§4.6). In Task
    3.1.2 this was a note about why the instrument used `ws@8`. After §6.3 it is
    **load-bearing for the product**: a client on the global can neither observe
    the heartbeat nor answer it, so it forfeits the only liveness signal
    available at 3am and falls into Task 3.1.5's rude-client case by
    construction. Do not let this reach Story 3.2 as trivia; it decides the
    library.
  - **The close code carries no intent** — a clean close reads `1006` — so the
    client must carry its own (§4.2).
  - **A connection can die with no event at all, and `readyState` will not say
    so** (§6.4). **Amended 2026-09-15 — there are four, and this is the one with
    a user-visible failure behind it.** A capture in this story held a dead
    socket for **4h21m** with `readyState` reporting `OPEN`, no error and no
    close; the close it eventually requested took **30,016 ms** to time out
    against **243 ms** for a live one. So Story 3.2's client owes a **liveness
    watchdog on inbound frames** — not on `readyState`, and not on data, which
    is legitimately absent for hours — firing at three missed heartbeats
    (**165 s**, from a measured 53.96–54.85 s interval). And `FeedStatus.live`
    must never be derived from "the socket object is open": on 2026-09-15 that
    predicate was true for four hours of a connection to nothing.
  - **`dailyBars` re-sends an unchanged aggregate every minute out of hours**
    (§6.7), which is both a cost trap at universe scale and the reason a
    staleness rule must key on the **observation's timestamp** rather than on a
    frame having arrived.

  Name all five in the close so Story 3.2 meets them in a hand-off rather than
  in a debugging session.

- **Name Story 3.11's owed re-measure as a condition.** Every latency figure in
  this story was taken from a machine in Asia/Singapore against an `eastus2` deployment,
  so the provider's share of `PRODUCT_SPEC.md` §28 is an **upper bound** rather
  than a number. Trigger: **the first time a real socket runs in the deployed
  backend.**
- **Check the design canvas is reachable, and record the result.** EPIC.md warns
  that the `Component library for MarketPulse` canvas was **not reachable** from
  the session that planned this epic, and Story 3.4 owes a sync before it
  designs anything. Establishing reachability costs minutes here and is the
  difference between Story 3.4 designing forwards and Story 3.4 discovering a
  broken chain on the day. **This task decides nothing about design** — it
  answers one yes/no and writes it down.
- **`pnpm verify` passes**, which for a story that changes no application code
  means the `links` and `invariants` steps over the new document.

### Two session measurements inherited from 3.1.5 — added 2026-09-16

Task 3.1.5 produced its fault taxonomy against a **shut** market, which is the
right place to inject faults and the wrong place to observe bars. Two of its
items need bars flowing, and the owner chose on 2026-09-17 to hand them here
rather than spend a second night on them. **This task already needs a window for
the weekend hold, so they cost it a subscription rather than a night.**

- **What is missed while away.** Reconnect after a gap of known length **during a
  session** and establish whether the bars for those minutes are ever delivered,
  replayed, or simply gone. [`LIVE-DATA.md`](LIVE-DATA.md) §8.7 establishes the
  server holds **no** subscription state across a reconnect, which makes _gone_
  overwhelmingly likely — **and overwhelmingly likely is not measured.** Story
  3.10's gap-filling scope is written from the answer: if the bars are gone, the
  repair is an HTTP backfill rather than a socket feature, and that is a
  different story from one that can ask the socket to catch up.
- **The `updatedBars` revision rate at 518 symbols.** §7.11's **reversal trigger
  on a decision the owner has already taken** — the product subscribes
  `updatedBars`, on a rate of 0.36% measured on ten liquid names. Subscribe `u`
  for the whole universe for one session-length window and record the per-symbol
  rate, the fraction that change the close rather than only volume, and the lag
  against 3.1.4's +28.6–29.8 s. **State the trigger as fired or not fired**, in
  those words, because a trigger quietly not evaluated is a decision nobody
  revisited.

**If this task's window cannot produce a session either, neither item may be
dropped silently** — record each as unmeasured with a named owner in
`ALPACA.md` §10's shape, which is the same constraint this task already carries
for the weekend window.

## Done when

- Decisions 7 and 8 are settled in `LIVE-DATA.md` with the trigger walk shown.
- The harness is deleted and the tree is byte-identical outside `planning/` —
  **and the weekend window was either taken first or recorded as unmeasured with
  a named owner**, per the constraint above.
- The credential check ran, and what it covered is recorded.
- `LIVE-DATA.md` carries all eight decisions, an opening summary, a
  not-measured section, and dated instrument-named figures throughout.
- `CLAUDE.md`'s table names it.
- The upward sweep ran, with a list of what was corrected and what was found
  already true.
- Canvas reachability is answered yes or no and recorded for Story 3.4.
- **3.1.5's two inherited session measurements are taken, or each is recorded as
  unmeasured with a named owner** — what is missed while away, and the
  `updatedBars` revision rate at 518. Where the second is taken, §7.11's
  reversal trigger is **stated as fired or not fired** in those words.
- `pnpm verify` passes.

## Notes

The half of the close most likely to be skipped is the sweep, and the reason is
recorded in `CLAUDE.md`: **recording a correction and propagating it are two
obligations**, and the mechanism that defers the first routinely covers only the
product decision the measurement forced, not the document that was wrong. It has
happened here before — for a day, `ALPACA.md` and ADR 0019 both recorded that
§7.1's feed claim was false while §7.1 itself, `README.md`, two other ADRs and
invariant 6 went on asserting it.

---

## What was found — the index

Every figure is in [`LIVE-DATA.md`](LIVE-DATA.md); this is the map, not a second
copy of it.

| Finding                                                                                    | Where |
| ------------------------------------------------------------------------------------------ | ----- |
| **Decision 7 — the frontend gains NO store**, with the three triggers walked one at a time | §12.1 |
| The walk's three facts: one writer, one message handler, age is derived rather than held   | §12.1 |
| **Decision 8 — the socket's lifecycle IS the process's**, opened at boot, never scheduled  | §12.2 |
| The deliberate `SIGTERM` close, and why it is the whole repair                             | §12.2 |
| Why the pino `ignore: "reqId,pid"` trigger does **not** fire, and who re-checks it         | §12.2 |
| The opening summary, for a reader who reads one section                                    | §0    |
| **What was NOT measured, and why** — including the n=1 caveat on every rate figure         | §13   |
| The design canvas is **NOT reachable**                                                     | §13.5 |

## The upward sweep — what was corrected, and what was found already true

**Corrected**, each as a dated amendment beside the original rather than a
rewrite of it:

- **`planning/PRODUCT_SPEC.md` §7.1** — the table's `409 insufficient
subscription` is true and its **shape** was misleading. The socket to `/v2/sip`
  opens, the server greets the client identically, and the refusal arrives at
  **authentication as a frame**, after which the server leaves the socket open.
  A note now says so, because a reader who takes "refused" to mean the
  connection fails writes exactly the client §4.5 warns about.
- **`ALPACA.md` §10** — its 2026-09-15 amendment ended _"still unmeasured: a bar
  consumed from the socket, and every reconnection behaviour — Tasks 3.1.3 to
  3.1.5."_ All three are now taken; a second dated amendment points at
  `LIVE-DATA.md` §6, §7 and §8 and restates that **no streaming figure belongs in
  that document**.
- **`planning/epic-03-live-market-data/EPIC.md`** — two live claims. Its cost
  paragraph asserted this epic moves the replica to the active rate all session
  ($19.04) and that the $20 budget would not fire; Task 3.1.6 measured **6.6
  minutes a day** above the threshold and **$9.26/month**, and the re-decision
  the paragraph asked for was taken (leave the budget alone). And its pino
  paragraph named a trigger that this task evaluated and found **does not fire**.
- **`HOSTING.md`** — the same falsified consequence, in the document
  `CLAUDE.md` sends a reader to for cost. Its second consequence (the offer
  expiring around 2027-09-03) is untouched.
- **`docs/adr/0011`** — already amended by Task 3.1.6 on the same day; checked
  rather than re-amended.

**Found already true, and that is worth recording because "we looked" is a
different state from "nobody looked":**

- **`PRODUCT_SPEC.md` line 264 already carries the 30-symbol cap** and already
  scopes it to trades and quotes. Nothing to correct.
- **Story 3.11 already holds the latency re-measure as a condition** — _the
  first time a real socket runs in the deployed backend_ — rather than as a
  story number, and already measures against **$9.26 rather than $19.04**.
- **Every other `$19.04` in the tree is a historical record** — Epic 1 and Epic 2
  task files and `STORY.md`s recording what was true when they were written.
  `CLAUDE.md`'s rule is explicit that correcting those destroys the record, and
  they are left standing.

## The hand-offs delivered

- **Story 3.2 has all five constraints in one place**, appended to its
  `STORY.md`: the 54 s heartbeat, `ws@8` over the built-in `WebSocket` with §8.6's
  measured cost of not ponging (closed after 5,999 ms, so **every 61 seconds for
  ever**), the close code carrying nothing while the close **latency** carries
  everything, the socket that held `OPEN` for 4 h 21 min while dead and the
  165 s watchdog it owes, and `dailyBars` re-sending an unchanged aggregate every
  minute out of hours. Plus the one thing that is Story 3.2's to **build**:
  `replay` is a `ProviderId` and a `MarketFeed` in ADR 0030 §3 and neither union
  holds it.
- **Story 3.4 has the canvas answer**, appended to its `STORY.md` with the two
  honest options — restore access, or design forward from `VISUAL-LANGUAGE.md`
  and record the divergence as ADR 0026's deliberate exception rather than let
  the chain quietly stop being followed.

## What is still open — three measurements, owned here

**This task is deliberately not closed**, and the reason is the constraint it has
carried since Task 3.1.3 wrote it: the harness may not be deleted until the
weekend hold is taken or recorded as unmeasured with an owner. The owner chose on
2026-09-17 to **take it** rather than record it, so `~/marketpulse-live-spike/`
stands.

1. **The weekend hold** — Friday 2026-09-18 20:00 ET → Monday 2026-09-21 04:00 ET.
   Unattended; the capture writes to disk every sixty seconds. It costs a command
   on Saturday morning, not a morning.
2. **What is missed while away** — a reconnect after a gap of known length
   **during a session**, to establish whether those minutes' bars are ever
   delivered. Story 3.10's gap-filling scope is written from the answer.
3. **The `updatedBars` revision rate at 518 symbols** — §7.11's reversal trigger,
   to be **stated as fired or not fired** in those words.

Items 2 and 3 are in flight: a capture is scheduled for 09:25–15:30 ET with a
deliberate 3-minute gap at 11:00 ET. **The deletion, and this task's close, wait
on all three.**

## For a stakeholder — what this task actually did, in plain terms

**Two questions, and then the tidying-up that stops a fortnight of measurement
from evaporating.**

**The first question was whether the front end needs a "store".** In a web
application a store is a central box that every part of the screen reads from and
writes to. It is a genuinely useful thing and it is also a well-known way to add a
large amount of machinery you never needed. We had written down, months ago, the
exact condition under which we would add one: **when two different parts of the
screen both need to change the same piece of information.** Not _read_ it —
change it. Reading is easy to pass around; two things writing to one place is what
gets tangled.

We walked the condition rather than argued about it, and the answer is **no
store**. Live prices have exactly one thing that writes them — the connection to
the market — and any number of things that read them. And the one piece of
information that looked most like shared state, _how old is this price_, turns out
not to be state at all: it is worked out on the spot from the price's own
timestamp and the clock. You cannot disagree about a number nobody is storing.
**So we are not adding the machinery, and we have written down the walk**, so that
in six weeks somebody who sees 518 shared prices does not assume the question was
never asked.

**The second question was what happens to the market connection when the server
restarts** — which happens every time we deploy. The market provider's free plan
allows exactly **one** connection, and we had already measured what happens when a
second one arrives: the **existing** connection wins and the new one is turned
away. So on every deploy, the new server has no market data until the old one's
connection is genuinely gone. The dangerous version of this is the one we measured
in an earlier task: a connection can die **without anything noticing** — we watched
one sit there looking perfectly healthy for **four hours and twenty-one minutes**
with nothing behind it. A server that vanishes without hanging up could therefore
lock its own replacement out for hours.

**The fix is small and it is the whole point:** the server now hangs up
deliberately on its way out. That turns a potential multi-hour outage on every
deploy into one bounded by a shutdown limit we already have — five seconds.

**The rest of the task is the unglamorous half, and it is the half that usually
gets skipped.** We finished the record so it can be read by somebody who was not
here, checked — rather than assumed — that no credential ever reached the
repository, and swept **upward**: when a measurement proves that something written
down elsewhere is wrong, the correction has to travel to wherever that wrong thing
is still being asserted. That caught four documents still repeating a monthly cost
we had already disproved, and the plan's own specification describing a rejection
in a way that would lead a developer to write the wrong code. We also handed the
next story its **five** inherited constraints in one place, so it meets them in a
hand-over rather than discovering them at 3am.

**One honest yes/no we owed and can now answer: the design canvas is not
reachable.** That is a broken link in a chain the product depends on, it is
written down where the story that needs it will see it, and it has two clearly
stated options rather than a silent workaround.

**What a user can see today: nothing.** The application is still a historical
explorer. **Story 3.3 is the payoff and it is two stories away** — and that is the
shape this epic was planned to have, not a slip.

**And the task is deliberately left open on one line.** The harness that took
every measurement in this story is not deleted yet, because one window has not
happened: the market closes on Friday night and reopens on Monday, and nobody has
watched what the connection does across that. Deleting the instrument first would
mean rebuilding it to ask. Three measurements are owed, they are named, they have
this task's name on them, and two of them are already scheduled.
