# Story 3.11 — Cost, Performance, the Sweep & the Epic Close

**Status:** **Split into ten tasks — 2026-09-25.** The order is unusual for a close and deliberately so: **the two tasks that change what a user can see come second and third**, not ninth, because this is otherwise a story of measurements and documents and a stakeholder should not wait to the end of an epic for the last thing they see. The first task **builds nothing** — this file has accumulated hand-offs from **eleven** sources over ten days and several have been superseded by the story that wrote them, which is the shape Story 3.10's equivalent task exploited to remove most of two tasks.
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.10
**Epic scope covered:** the continuous-connection cost envelope, the epic's exit criterion, and everything this epic falsified upstream

## Description

The close, in the shape Epic 2's worked: re-take every acceptance criterion
against the thing it is about rather than citing it, finish the subject
document, write the ADRs, **sweep upward**, and hand what ships open to a named
owner rather than to a story number.

It carries one measurement no other story can take, because it needs a month
rather than an afternoon.

## The cost envelope, which is a re-measurement and not a confirmation

**Epic 1's recorded figure is an idle figure and this epic breaks the condition
it rests on.** The Consumption plan's idle vCPU rate requires the replica to
receive **less than 1,000 bytes per second** of network traffic. A replica
holding a live feed exceeds that through every market session, so the estimate
moves from **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month
with ACR Basic. Memory bills the same either way; the discount is on vCPU alone.

**And the alert that matters would not fire.** The `$20` budget with its
50/80/100% alerts sits just _above_ the active-rate total, so the single change
most likely to move this bill is the one the thresholds cannot see.

Epic 1 could not take a real reading at all — both billing APIs refused, then
answered `[]` and `429` — so **this is a re-measurement rather than a
confirmation**, and the budget threshold is re-decided against what it reads.
Storage is the second half: a live session adds rows every day, and what a month
of them costs is arithmetic nobody has done.

## What the user can see when this story lands

**Nothing new, and the epic's exit criterion walked on the deployed site by a
person** — a live connection maintained for the tracked universe, visible market
values updating without a page refresh, at three viewports.

Epic 2 ended by making its exit criterion **run on every deploy** rather than be
walked once. This epic's criterion is harder: it needs a live session, and a
deploy at 21:00 on a Sunday cannot prove it. That is a real constraint on what
the deployed check can assert and it should be stated rather than worked around.

## Why it sits here in the sequence

Because a close re-takes rather than cites, and there is nothing to re-take
until the last feature story has shipped.

## Scope

- **The cost reading**, above, with the budget re-decided and `HOSTING.md`
  amended. Note what is being measured: the change is the **socket**, not the
  traffic to browsers, and the two are separable in the reading.
- **The performance figures, at universe scale with the feed running**:
  §28's _event → application state <250 ms p95_ excluding provider latency;
  _no routine main-thread task >50 ms_; and the one breach this product already
  carries with a named owner — **50–76 ms on every cold load of `/securities`
  and `/securities/:symbol`, from the 518-row table rather than from the chart**,
  measured three times and attributed from both ends each time. Its trigger is a
  condition that outranks Epic 14, and Story 3.6 will have evaluated it; this
  story records the verdict either way.
- **The subject document finished** — `LIVE-DATA.md`, from Story 3.1, as the
  maintained account of how a live observation reaches a screen, with the rule
  that where it and any task file in this epic disagree, **it wins**.
- **The ADRs.** Epic 2 produced nine; this epic's candidates are the streaming
  seam and what a fixture-backed stream certifies; the motion vocabulary and
  what a green suite certifies about it (nothing below a browser can see
  motion, and nothing at all can see whether it helps); and the two-tape store.
  **ADRs are never renumbered**, so these start at **0030**.
- **The upward sweep, which is the obligation most likely to be skipped.**
  Falsification travels **upward**: a task measures a vendor or the tree, and
  what it invalidates is a premise in an ADR, an invariant in `CLAUDE.md`, or
  `PRODUCT_SPEC.md` — and **nothing sweeps upward**, because a story close
  sweeps that story's own documents. This has already happened once in this
  repository: for a day, `ALPACA.md` and ADR 0019 both recorded that §7.1's feed
  claim was false while §7.1 itself, `README.md`, two other ADRs and invariant 6
  went on asserting it. The known candidates before the work starts:
  - **`PRODUCT_SPEC.md` §42's milestone**, whose _live price updates_ clause is
    this epic's and is explicitly marked as such
  - **§7.1's asymmetry table**, which is a dated observation of a third party
    and will have been re-measured by the spike
  - **`CLAUDE.md`'s invariant 6**, whose parenthesis — _Epic 3's live feed must
    not inherit Epic 2's word_ — becomes a statement about shipped code
  - **`CLAUDE.md`'s "Current state"** section, including _what they still cannot
    do: watch a price move_, which this epic makes false
  - **`FeedIndicator`'s and `feed-status.ts`'s own comments**, which describe a
    component that is not in the chrome and a type waiting for this epic
  - **`VISUAL-LANGUAGE.md`'s Motion section**, whose deferral is discharged
  - **`PROVIDER.md` §12**, which sketched this epic's seam and can now record
    what shipped against what was predicted
- **`docs/GAPS.md`.** Add what this epic leaves standing, each with a
  `Re-measure:` line — and take the standing instruction seriously: **an entry
  that can be made mechanical should be**, because a prose entry with a
  re-measure command is a check nobody runs. A live feed generates exactly the
  kind of claim that rots silently.
- **`pnpm break` entries** for every check this epic added, and a run of each.
- **What ships open**, each with an **owner and a condition** rather than a
  story number.

## Out of scope, and who owns it

- Aggregations over the live universe — Epic 4
- Anomaly scores — Epic 5
- Any repair to the §28 cold-load breach beyond evaluating its trigger —
  Epic 14, unless Story 3.6's measurement fired it

## Open decisions — ANSWERED 2026-09-25 by Task 3.11.1

1. ~~**The budget**, re-decided against a real reading.~~ → **decide it after
   the reading.** $20 at 50/80/100% stands until Task 3.11.5 has a bill, and
   §9.6's `$12`trigger stands. Lowering to $15 now would put the first alert
**below** the $9.26 estimate, so it would fire every month. **If no bill can
be read** — and Epic 1 could not, twice — the fallback is **60/80/100**,
which makes the first alert the`$12` trigger exactly.
2. ~~**Whether the deployed check asserts liveness**~~ → **only what holds at
   any hour.** Provider configured, **never replaying** (ADR 0030, 7c), and a
   last-observation instant once Task 3.11.3 ships it. **Never** `status:
live`. A scheduled in-session check was rejected as a new mechanism with its
   own silence; the instant narrows the same gap and reads correctly at 3am.
3. **Whether CI holds a credential** → **no, and recorded why.** The binding
   constraint is the **single connection**, not the quota: the deployment holds
   it and a developer is already refused `406` (`docs/GAPS.md` entry 7), so a
   CI credential would be a third claimant that takes **production's** socket
   down rather than merely failing a test. The two measured consequences stand
   unrepaired — a spec asserting an absence that passed for four days, and no
   browser test in this epic having watched a real vendor frame reach a screen.
4. **What _watched_ means in the exit criterion** → **NOT MET.** Six rows, none
   watched by a person. Task 3.11.8 takes one sitting with a human, at three
   viewports including a real phone. Amending the criterion's word was
   rejected: _a headless browser did not notice_ is not _a person did not
   notice_, and the 390 question needs the second.

## Acceptance criteria

1. Every acceptance criterion in Stories 3.1–3.10 re-taken against the thing it
   is about, with the instrument named and the reading quoted — and the split
   stated between the ones that re-take from a clean clone and the ones that are
   **dated readings against a populated store and a live session**
2. The exit criterion walked by a person on the deployed site during a live
   session, at three viewports
3. A real billing reading, the budget re-decided, `HOSTING.md` amended
4. §28's figures re-taken with the feed running
5. The ADRs written; `LIVE-DATA.md` closed as the maintained document
6. The upward sweep performed against the list above **and against a grep**,
   with live claims amended, historical records left standing, and ADRs given
   dated amendments rather than rewrites
7. `docs/GAPS.md` updated, with anything mechanisable made mechanical
8. `pnpm verify`, `pnpm test:database` and `pnpm e2e` all green, and every new
   check's break performed
9. **[`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md) is complete** — a dated row for
   every visible story, each watched against the real IEX socket during a real
   session, with its `What was wrong` column filled in honestly. Added
   2026-09-16 with [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md):
   this epic can be built at any hour against a replay of our own bars, and
   criterion 2 above is the only other thing standing between that convenience
   and an epic that closes without anyone having watched the live feed work.
   **A missing row is closed by taking the rehearsal, never by deleting the
   row** — and a `pnpm invariants` entry asserts every story `EPIC.md` marks
   complete has one, so this criterion is checked rather than remembered
10. **The replay's guards re-broken rather than assumed**: that a replay refuses
    to start while the market is open, and that a replayed series cannot reach
    `market_bars`. Both are the mechanisms ADR 0030 rests on, and a check that
    has not gone red this epic has not been tested this epic
11. **The deployed site confirmed never to have replayed** — `check-deployed.mjs`
    asserts it after every merge at any hour (ADR 0030, 7c), and this close
    checks the assertion exists and has run rather than trusting that it does.
    Production has real users and must only ever tell the absolute truth about
    the real market; that is the one claim in this epic where a missed check is
    a user being misled rather than a developer being inconvenienced

## Tasks

**Where the incremental progress is, stated plainly.** Eight of these ten tasks
produce no visible change, because a close is measurement, documents and
verdicts. **Two do**, and they are taken early rather than late:

- **3.11.2** repairs a page that opens **three sockets in twelve seconds** —
  nothing on screen is wrong today, which is exactly why it went unseen for the
  whole epic
- **3.11.3** makes a feed that has stopped **visible without opening a page**,
  which is the failure that let a dead feed run for **nineteen hours**

And one produces the only thing in this epic that has never happened at all:
**3.11.8 is a person watching the product work.**

| #   | Task                                                                                                                                                                               | Visible?                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | [What this epic already measured, and the decisions this close cannot start without](TASK-01-what-this-epic-already-measured-and-the-decisions-this-close-cannot-start-without.md) | no — and it removes work             |
| 2   | [The socket that reopens three times in twelve seconds](TASK-02-the-socket-that-reopens-three-times-in-twelve-seconds.md)                                                          | **yes**                              |
| 3   | [The dead feed that ran for nineteen hours](TASK-03-the-dead-feed-that-ran-for-nineteen-hours.md)                                                                                  | **yes, to an operator**              |
| 4   | [Every figure re-taken against the real gateway, in one sitting](TASK-04-every-figure-re-taken-against-the-real-gateway.md)                                                        | only if one comes back over the line |
| 5   | [The bill, read rather than estimated](TASK-05-the-bill-read-rather-than-estimated.md)                                                                                             | no                                   |
| 6   | [What a connection does over a week rather than an afternoon](TASK-06-what-a-connection-does-over-a-week-rather-than-an-afternoon.md)                                              | no                                   |
| 7   | [The replay's guards, re-broken rather than assumed](TASK-07-the-replays-guards-re-broken-rather-than-assumed.md)                                                                  | no                                   |
| 8   | [The sitting a person actually takes, and the ledger completed](TASK-08-the-sitting-a-person-actually-takes.md)                                                                    | **the product, watched**             |
| 9   | [The ADRs, and the document that outlives the epic](TASK-09-the-adrs-and-the-document-that-outlives-the-epic.md)                                                                   | no                                   |
| 10  | [Every break this epic added, performed](TASK-10-every-break-this-epic-added-performed.md)                                                                                         | no                                   |
| 11  | [The re-take, the upward sweep, and Epic 3's close](TASK-11-the-re-take-the-upward-sweep-and-epic-3s-close.md)                                                                     | no                                   |

**Two tasks share one window and must be taken together** — 3.11.4's
performance pass and 3.11.8's sitting both need the market open, and the scarce
thing is the free plan's **one** Alpaca connection rather than anybody's
attention (`docs/GAPS.md` entry 10). A sitting taken for one and not the other
spends it twice.

> **And the dependency between them was circular until 2026-09-25.** 3.11.8
> declared `Depends on: 3.11.4` while five of 3.11.4's nine figures could only
> be taken at 3.11.8's sitting. Corrected: **3.11.8 depends on 3.11.1 alone**,
> and the two are **concurrent**. 3.11.4 is already _partly taken_ — everything
> that needed the deployment rather than the socket was done with the market
> shut, which is the opposite of a prerequisite.

~~**And 3.11.6 is the one that needs elapsed time rather than effort.** Whatever
it has to watch should be started when this story starts, not when that task
comes up.~~ — **no longer true, 2026-09-25.** Task 3.11.1 found that the run
3.11.6's first question needed **had already been taken** and its output had
been sitting unread for four days. What remains there is two questions that are
**one log read on a deploy during a session**, and Tasks 3.11.2 and 3.11.3 will
each cause one. **Nothing in this story is now waiting on a clock.**

## What this story hands forward

A live application, and an epic whose figures can be re-taken rather than cited.

## Handed here by Story 3.3's close — 2026-09-19: should CI hold a credential?

Nothing in this epic has asked, and Story 3.3 is where the cost of not asking
became visible.

CI has no credential, so `MARKET_DATA_PROVIDER` is `none` and **the live states
never appear on a runner**. Two consequences, both measured rather than
supposed:

- **A spec asserting an ABSENCE passes for free.** `market-feed.spec.ts` held a
  list of words that _"must never render again"_ for four days after Task 3.3.5
  deliberately made them real, and it did not go red — because those words
  happen not to appear on an unconfigured deployment.
- **`market-connection.spec.ts` closed the instance by furnishing the states
  from inside the browser**, which needs no credential and is the right answer
  for a page-level assertion. **It is not the same claim as _the product works
  against Alpaca_.** No browser test here has ever watched a real vendor frame
  reach a screen.

**The decision is yours because it is a cost decision as much as a testing
one**, and because the epic's close is the first place the whole picture is
visible: a credential in CI is quota spent on every push, against a free plan
whose **single connection is already contended** between the deployment and any
developer trying to capture a frame (`docs/GAPS.md` entry 7, now Story 3.10's).
Decide it, or record that it stays as it is and why.

## Handed here by Task 3.1.6 — 2026-09-17, and the premise halved

**This story owns the only real cost measurement anybody will ever take**, and
the estimate it is measuring against changed by a factor of two on 2026-09-17.

[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§9.1–§9.2: ADR 0011 put a live-feed replica at the **active** vCPU rate through
every session — **$19.04/month**. Measured against a real 7.77-hour capture, a
**bars-only** subscription to all 518 symbols averages **550.6 B/s** against the
1,000 B/s condition and crosses it for **397 seconds a day**. The blended total
is **$9.26** — five cents above a replica doing nothing.

**The error was a premise rather than a calculation**: minute bars arrive as a
**burst once a minute** — 243 ms of traffic, 59 seconds of silence — and a
per-second threshold barely notices that. ADR 0011 carries a dated amendment and
its tables are untouched.

**What this story is therefore measuring against is $9.26, not $19.04**, and
three things follow:

- **The budget was left unchanged deliberately** (§9.6). `marketpulse-monthly`,
  $20, alerts at 50/80/100%. At $9.26 the 50% alert at $10 sits eight percent
  above the measured total, so it is already primed. **The reversal trigger is
  the first month whose actual bill exceeds $12** — above §9.2's realistic worst
  case, so reaching it means an assumption in §9.2 is wrong.
- **The envelope is inbound-from-Alpaca only.** It does not cost the fan-out to
  browsers, and §9.5's answer makes that the **whole universe** — 38 kB/min per
  browser. Whether Azure's condition counts egress, and what concurrent browsers
  add, is **this story's to measure** and nobody else's.
- **It is n=1** — one Wednesday in September — and it is arithmetic over a rate
  card. Epic 1 could read no bill at all; both billing APIs refused the
  subscription. **This story is the first that can read one.**

**And §28's performance target is in the same position.** §7.4 measured the
provider's own share of the 250 ms budget at **901 ms p95 corrected** — but from
Asia/Singapore, over a 271–311 ms round trip production does not have. That does
not falsify §28; it makes it **unevaluable until the same figure is taken from
`eastus2`**. The condition is **the first time a real socket runs in the deployed
backend**, and that is this story's too.

---

## The weekend hold — handed here 2026-09-18 by Task 3.1.9

> **THE TRIGGER FIRED, AND THE RUN IS UNDER WAY — started 2026-09-19 09:56 ET.**
>
> The condition was _the first time a real socket runs in the deployed
> backend_. It has: the deployment answers
> `{"provider":"alpaca","feed":"iex",…}`, which is also why a developer machine
> is refused `406` (`docs/GAPS.md` entry 7). `scripts/weekend-watch.mjs` is
> polling `/diagnostics/feed` every 60 s through to Monday's open.
>
> **RESULT READ 2026-09-25 by Task 3.11.1 — four days after the run finished,
> from a file nobody had opened.** `.capture/weekend/watch-2026-09-19.jsonl`
> holds **1,065 samples over 55 hours**, 2026-09-19T13:56Z → 2026-09-21T20:58Z:
> **535 `disconnected`, 488 `live`, 1 `stale`**.
>
> | Stretch                      | Reading                                                                    |
> | ---------------------------- | -------------------------------------------------------------------------- |
> | 09-19 13:56Z → 09-21 ~05:44Z | **`disconnected`**, ~40 h, spanning Friday's whole session and the weekend |
> | 09-21 **05:45Z**             | **`live`** — 01:45 ET, Sunday                                              |
> | → 20:58Z                     | **`live`**, nine single-sample blips and one `stale`                       |
>
> **So _Monday's open is still at risk_ is answered: it was not.** The feed
> recovered about forty hours in, **unattended**, and stayed up.
>
> **What the file cannot say is what recovered it** — no restart is recorded in
> the window, and the eight diagnostic events that would have said were not
> being logged. **An outage that ends on its own is worse than one that needs a
> restart**, because nothing learned anything. That is Task 3.11.3's.
>
> Two caveats bound it: the `poll-failed` stretches — one of 5.68 h on the
> Saturday morning — are the watching laptop asleep rather than the product,
> and this is `/diagnostics/feed`'s own `status`, the **backend's** view of its
> socket, which is the right instrument here and is not a browser's.
>
> **And the file is gitignored**, so it exists on one machine. Anything this
> story concludes from it is quoted here rather than referenced.
>
> **It is a different instrument from the retired `weekend.mjs`, and the
> difference bounds the conclusion.** That one **held** the socket; this
> **watches the one production already holds**, over HTTP — which is the only
> reason it can run at all, since the single permitted connection is taken. So
> it can see **whether the hold survives 56 hours and when it breaks**, to
> within one poll plus §11.2's 165 s. It **cannot** see the close code, the
> close latency (§8.5's discriminator) or the error frame, and a write-up must
> not imply otherwise. It **can** see one thing the held version could not:
> whether the backend recovers on its own, because it watches across a death
> rather than dying with it.
>
> Both of `weekend.mjs`'s sentinels are kept — a monotonic-vs-wall tick so a
> suspended laptop is a recorded fact with a duration, and a reachability probe
> fired at any failure, because over HTTP _this observer's own network dying_
> looks exactly like the thing it is watching for.
>
> **THE INCIDENT SHAPE, OBSERVED — 2026-09-19 10:00 ET.** This section
> predicted it and named it _the outcome that actually matters_:
>
> > _"The incident shape is a drop that **also holds the connection slot**. If a
> > weekend drop leaves the slot held, Monday's pre-market opens with no feed
> > and no obvious cause."_
>
> **Both halves were observed within four minutes of starting the watch**, and
> they are independent measurements:
>
> ```text
> the backend's own view   {"provider":"alpaca","feed":"iex","status":"disconnected",…}
> a fresh connection       [{"T":"error","code":406,"msg":"connection limit exceeded"}]
> ```
>
> **The backend believes it has no feed, and Alpaca refuses a new connection
> because the single slot is occupied.** §6.4 measured exactly this: a dead
> socket holding the slot for **4 h 21 min** with `readyState` reporting `OPEN`.
>
> **The alternative explanation was ruled out rather than assumed.** If the
> socket were healthy and the _status_ were lying, the cause would be the
> heartbeat not reaching the watchdog — §6.3's ping is a **WebSocket control
> frame**, which `ws` answers automatically and which a naive client never sees.
> `alpaca-stream.ts` handles it: `opened.on("ping", …)` feeds a `heartbeat`
> event to the state machine _"so the heartbeat reaches the state machine as
> evidence of life."_ A healthy socket would therefore read `live`. It does not.
>
> **What is not yet distinguished**, and needs the deployed logs rather than a
> probe: whether the socket died and was never retried (there is **no
> reconnection policy beyond `406`** — Story 3.10 owns backoff), or whether a
> **rolling deploy** left a previous replica holding the slot while the new one
> was refused. The second is the more interesting: the client _does_ retry on
> `406`, so a backend stuck reporting `disconnected` while something else holds
> the slot is a race between two of our own replicas.
>
> **Either way the consequence is the one this section feared**, and it is live
> now rather than hypothetical.
>
> ## THE WEEKEND HOLD FOUND A LIVE PRODUCTION OUTAGE — 2026-09-20, and the restart did not fix it
>
> The measurement was supposed to answer _does a 56-hour idle socket survive_.
> **It never got to ask**, because the deployed feed was already dead when the
> watch started, and the investigation found why.
>
> ### 1. Six fatal crashes, and the error names the bug
>
> ```text
> {"level":60,…,"err":{"type":"Error","message":"WebSocket is not open: readyState 0 (CONNECTING)"}}
> ```
>
> **`level: 60` is fatal** — the process died. Six times between 02:00Z and
> 06:00Z on 2026-09-19, each followed by a Container Apps restart backing off
> 12 s → 21 s → 41 s → 81 s. **Something calls `send()` before the socket has
> opened**, and `ws` throws synchronously when `readyState` is `CONNECTING`.
> None since 05:48Z, so the process stabilised — with no feed.
>
> #### AMENDED 2026-09-21 — the bug in §1 is found and fixed; §2 is still yours
>
> _Something calls `send()` before the socket has opened_ is now specific: the
> `406` retry path overwrote a single mutable `socket` reference while the old
> socket's listeners were still attached, and the handshake wrote to the shared
> reference rather than to the socket the frame arrived on. Repaired in
> `alpaca-stream.ts`, with two break-verified tests. **The full account is in
> Story 3.10's `STORY.md`**, which owns retry.
>
> **Nothing below this line is repaired.** §2's finding is the reason the crash
> ran unseen, and wiring `onLog` is still Story 3.11's.
>
> ### 2. The feed has been dead for nineteen hours with no log line about it
>
> 85 samples over 10.5 hours: **zero `live`**. And the reason nobody could have
> known is the finding that matters most:
>
> **`market-stream.ts` never references `onLog`.** The Alpaca client emits
> **eight** diagnostic events — `authenticated`, `subscribed`,
> `credentials-refused`, `frame-rejected`, **`connection-limit`**,
> `unexpected-error-frame`, **`liveness-watchdog-fired`**, `closed` — and **not
> one of them is logged in production.** A socket that authenticates, a
> credential that is refused, a watchdog that fires, a `406` retried every
> `REFUSED_RETRY_MS = 3_000` for nineteen hours: all silent.
>
> **That is why this was found by probing from outside rather than by reading a
> log**, and it is why a green `check-deployed` says nothing about it.
>
> ### 3. The restart was clean and changed nothing
>
> `az containerapp revision restart` at 01:26:08Z. New replica up, old one
> `SIGTERM`ed and `shutdown complete` at 01:26:15Z, **no fatal this time** — and
> **still `disconnected` eight minutes later**, with no logs at all after
> `market stream started`.
>
> **And the connection slot is still held**: an independent handshake is refused
> `406 connection limit exceeded` after the restart, exactly as before it. So
> the backend is almost certainly in a **silent three-second 406 retry loop**
> against a slot held by something that is serving nobody — §6.4's dead socket
> holding the slot, at nineteen hours rather than 4 h 21 min.
>
> ### What this means for the epic
>
> - **§9.3's _hold the socket always_ is not what production does**, and the gap
>   is not the vendor's tolerance of a long idle — it is our own client.
> - **The observability defect outranks the crash.** A product whose market feed
>   can be dead for nineteen hours without emitting a line is one where every
>   future incident costs what this one did.
> - **Monday's open is still at risk**, and the restart is not the remedy.
>
> **Owner: Story 3.10** for the crash and the retry, **this story** for the
> logging — it is a cost-and-operability finding and the epic close is where the
> deployed backend is meant to be run in anger.
>
> **INTERIM RESULT — 10.5 hours, 85 samples, 2026-09-19 10:00 → 2026-09-19
> 20:26 ET.**
>
> |                     |       |
> | ------------------- | ----- |
> | `live`              | **0** |
> | `disconnected`      | 82    |
> | poll failed         | 3     |
> | machine suspensions | 0     |
>
> **Not one `live` sample in ten and a half hours.** The socket has not
> recovered on its own, which confirms in production what the client says about
> itself: _no reconnection policy beyond `406`_. A drop that is not a `406` is
> permanent until the container restarts.
>
> **The three gaps were neither the feed nor the observer's network, and the
> sentinel is what says so.** A reachability probe fired at each failure:
>
> ```text
> TimeoutError  probe={"alpaca": 401, "azure": 404}
> ```
>
> Both hosts **answered** — 401 and 404 are HTTP responses, so DNS resolved,
> TLS completed and the servers replied. The local link was fine and Alpaca was
> fine. What failed was **the deployed backend not answering its own
> `/diagnostics/feed` within 20 s**, three times in ten hours, each an isolated
> single sample.
>
> That is a third finding rather than noise, and it is worth pairing with the
> rolling-deploy hypothesis above: a replica being recycled would look exactly
> like this. **What it does not explain is why the feed never returns** — a
> restarted replica connects at boot, so a restart should produce either `live`
> or a `406` it then retries out of.
>
> **And the first sample is already a finding.** At 09:54 ET on a Saturday the
> deployed feed reported **`status: "disconnected"`** — no inbound frame of any
> kind for 165 s (§11.2). With the market shut, `b` frames are legitimately
> absent for 56 hours (§6.2), but the **54 s heartbeat is not** (§6.3), so this
> says the socket is not there rather than that the market is quiet. Whether it
> never re-established after a deploy, died overnight, or lost a race with the
> `406` a capture attempt provoked at 23:30 ET, is what the run is for. **§9.3
> claims the socket is held always; the first observation of a weekend says it
> is not.**

**This story owns a measurement Story 3.1 built the instrument for and chose not
to run.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§13.4 has the full account; this is what this story has to do about it.

**The question.** §9.3 decided the socket is held **always** — one connection,
opened at boot, never deliberately closed. The longest hold ever achieved is
**7.77 hours**. A weekend is **56+**. So _always_ is validated to less than a
seventh of the interval it claims, and whether Alpaca tolerates a multi-day idle
connection, keeps heartbeating across it, or drops it, is **unmeasured**.

**Why it is yours rather than 3.1's.** It needs 56 hours of a machine that
cannot close its lid, and this story is **already the one that runs a real
socket in the deployed backend** — §7.4's latency re-measure is parked here on
exactly that condition. There, the hold costs a container that is running
anyway. The same trigger serves both: **the first time a real socket runs in the
deployed backend.**

**What to watch for, so this is a measurement rather than an observation:**

- **The heartbeat, not the data.** `b` is legitimately silent for 56 hours with
  the market shut (§6.2), so anything keying on data reports a healthy socket as
  dead. The server's **54 s** ping (§6.3) is the only liveness signal.
- **Do NOT subscribe `dailyBars`.** §6.7 measured it re-sending an unchanged
  aggregate every minute out of hours, which would keep the connection warm and
  answer a different question. Production's real subscription is `bars` +
  `updatedBars` for the 518 (§10.2), and that is what should be held.
- **The elapsed time at death, the close code and the close latency.** §8.5 is
  the discriminator: ~1 ms means our own link went, ~6 s the server closing a
  rude client, ~30 s `ws@8` timing out on a corpse.

**The outcome that actually matters, and it is not "did it survive".** A drop is
handled by machinery this epic builds anyway — Story 3.2's watchdog and
reconnect exist for §6.4, §8.2 and §8.8 regardless. **The incident shape is a
drop that also holds the connection slot.** §6.4 measured a dead socket
occupying the single permitted connection for **4 h 21 min** with `readyState`
reporting `OPEN`. If a weekend drop leaves the slot held, **Monday's pre-market
opens with no feed and no obvious cause** — so the thing to measure is not only
whether the socket dies but **whether a fresh connection is accepted
immediately afterwards**.

**The instrument existed and was proved before it was retired.** `weekend.mjs`
held a real socket, acknowledged 518 on both production channels and caught the
heartbeat at **54.03 s**, with sentinels that distinguish a suspended laptop and
a dropped local link from a vendor drop. It went with the harness; the design is
recorded here so it does not have to be re-derived — **two sentinels: a
monotonic-vs-wall-clock tick that makes a machine suspension a recorded fact
with a duration, and a DNS + HTTPS reachability probe fired at the moment of
death, because a death with a clean network and no clock jump is the finding and
anything else is an artefact.**

---

## Does a half-open socket lock out its successor? — handed here 2026-09-18 by Task 3.2.5

**One observation settles a claim the epic currently leans on, and this story is
the only one positioned to take it.**

**The claim.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §12.2 justifies closing the market socket
deliberately on `SIGTERM` with: _a process that exits without closing can lock
its own successor out of the market feed for as long as Alpaca takes to notice,
and §6.4 says that can be most of a trading day._

**Why it needs taking.** §6.4 measured **our client's** view — `readyState`
reporting `OPEN` for **4 h 21 min** with nothing behind it — and is scrupulous
that _"what killed it is not determined"_. **Nobody has measured Alpaca's slot
accounting**: whether a new connection is refused while a half-open one sits
unacknowledged. The justification is a reasonable inference resting on a
measurement of the other end of the problem.

**The decision is not in question** — closing deliberately is free, correct, and
the fastest path to releasing the slot. What is in question is what it should be
**credited with**, and there are two ways the answer changes this epic's story
about itself:

- **A crashing process still sends `FIN`.** On a healthy network path the slot
  frees at process exit whether or not we closed deliberately — so the deliberate
  close would be an optimisation rather than the thing bounding the outage, and
  the genuinely unbounded case is a **broken network path** rather than a skipped
  close.
- **In §6.4's own scenario the deliberate close bounds nothing.** A close frame
  on a dead socket reaches nobody — §6.4 watched one time out after
  **30,016 ms**. So what limits exposure there is Task 3.2.5's **165 s
  watchdog**, not the shutdown path.

**The measurement, and it is cheap.** **Trigger, as a condition: the first deploy
that rolls a replica while the feed is connected.** Observe whether the arriving
replica is refused `406 connection limit exceeded`, and **for how long** before
it authenticates. That is one log read on a deploy this story will be doing
anyway.

**What each outcome means**, so the reading is decided before the data arrives:

| Observation                                                   | Reading                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arriving replica authenticates immediately                    | The outgoing replica's close (or its `FIN`) released the slot promptly — §12.2's mechanism works, and the deliberate close is doing its job                                                                                            |
| Refused `406`, then authenticates within the shutdown ceiling | Exactly as §12.2 predicts. The bound is real                                                                                                                                                                                           |
| Refused `406` for materially longer than the ceiling          | **The interesting one.** The slot is not freed by our close, and §12.2's ≤ 5 s row is wrong — which makes every deploy a feed outage of unknown length and is a finding for Story 3.10's reconnection policy as much as for this story |

Also recorded in `docs/GAPS.md` as entry 8.

---

## What holds the slot — the same question as the overlap window, asked twice (2026-09-19)

**[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §8.2's duplicate-connection behaviour reproduced
unplanned on 2026-09-18**, and the incumbent was a **stale process of our own**:
a two-minute dry-run that never exited, still holding a TLS connection to Alpaca
**thirty-four hours later**, having outlived the directory containing its own
source.

Measured without anyone trying to produce it: **1,149 ms to the `406`, 9,498 ms
to the close** — against §8.2's 233 ms and ~9,964 ms, and landing exactly where
§8.5 puts _a refused duplicate_.

**Why it is yours, and why it is one measurement rather than two.** This story
already owns _whether a half-open socket locks out its successor_ (added
2026-09-18 by Task 3.2.5) and _whether the overlap window is bounded at all_
(§8.2's third consequence). **Both are the same question — what holds the slot,
and for how long** — and the reproduction above supplies a third instance of it:
a process that is alive but forgotten.

**Three occupants, one slot, and the deployed measurement answers all three:**

| Occupant                                    | How long it holds                                                      | Status                      |
| ------------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| A stopping replica that closed deliberately | ≤ `SHUTDOWN_TIMEOUT_MS`                                                | §12.2's claim, **inferred** |
| A half-open socket behind a dead process    | §6.4 measured **4 h 21 min** from _our_ side; Alpaca's view unmeasured | **Open**                    |
| A live process nobody remembered            | Indefinitely                                                           | Observed 2026-09-18         |

**The practical repair, which is not a measurement.** Anything that opens this
socket should **first establish that nothing else already holds one, and refuse
rather than wait**. The spike's `supervise-session.sh` had exactly that check
and never hit this; the dry-run that caused it did not. **A one-connection plan
makes every instrument a potential incumbent**, and a process that forgets to
exit is indistinguishable from a deploy.

---

## Handed here by Task 3.4.8 — 2026-09-21: §28's headline figure has never been taken, and today it cannot be

**`PRODUCT_SPEC.md` §28 publishes _event → application state under 250 ms p95_,
and its clock is explicit about both ends: server-received → application
state.** Story 3.4 measured **one of them**.

On a production build, under §7.4's real burst shape — **20 bursts of 332 bars,
6,640 observations** — _frame delivered to the page → price on screen_ came out
at **p95 52 ms and 51.7 ms** across two runs, with **zero** long-task entries at
any length. That is a genuine figure and **it is not the figure §28 publishes**:
the gateway, the socket and the network are not in it.

### The other half is not missing through neglect — it is unmeasurable

**No message on the market-stream wire carries a server-side instant.**
`WireObservation` carries the bar's own `startsAt`, which is §7.3's **interval
start** — a fact about the market, not about when we sent anything — and
`WireFeedState` carries `status`, `feed` and `marketOpen`. **There is nothing to
subtract from**, so a browser cannot time a journey whose start was never
stamped.

**And the rehearsal cannot close it either.** Story 3.4's live rehearsal watches
a real session against the real feed, which supplies real latency and still no
timestamp to measure it against.

### What this story owes, and the cost that comes with it

- **Decide whether §28's own figure is worth a field on the wire.** It is a
  protocol change rather than a test somebody forgot: a stamp the gateway writes
  and the browser subtracts, on **332 frames a minute**. Cheap per frame,
  unbounded in aggregate, and this story's subject is exactly that trade.
- **If yes, take the whole figure and publish it with both ends named.** If no,
  **amend §28** to say which half this product measures, rather than leaving a
  target that reads as met.
- **Either way, stop the browser half being quoted as the whole.** 52 ms against
  250 ms reads as _a fifth of the budget_ to anybody who does not have this
  paragraph — `docs/GAPS.md` entry 12 exists so it travels with the number.

**The good news the figure does buy you**: the half this product controls
end-to-end has **200 ms of headroom**, so whatever the other half costs, it is
not competing with a browser that is already busy.

## Handed here by Story 3.5's close — 2026-09-21: two things measured, and one still unwired

### 1. §28's 250 ms p95 is STILL unmeasurable, and Story 3.5 did not change it

Task 3.5.8 checked this rather than assuming it, by enumerating **every field
on the wire**. The only instant a browser receives is
`WireObservation.startsAt` — **the minute the bar covers**, not when the server
received or sent it. Task 3.5.6 added a `subscribe` message and it carries no
timestamp either.

`docs/GAPS.md` entry 12 **stands unchanged** — but **it stopped being yours on
2026-09-21, four days after this section was written.** Making it measurable
needs a **protocol change** — a server-stamped instant on the wire — which is a
decision about the wire rather than a measurement, and nothing in Epic 3 had
been willing to take it.

**It moved to Story 3.6, Task 3.6.4**, because the sweep after Task 3.6.1 found
that _three_ stories were carrying the same unmeasurable sentence — 3.4's
criterion 5, 3.6's criterion 5 and **this story's criterion 4** — and none of
them owned it. A criterion three stories cannot meet and none owns is the shape
`CLAUDE.md` records against _does it feel alive_, deferred seven times. Story
3.6 is already opening the wire format for the universe table, so it takes the
stamp.

**What this story keeps is the re-take, not the mechanism.** Criterion 4 asks
for §28's figures with the feed running; by the time it runs, the instrument
should exist. **If it does not, that is a finding rather than a reason to build
it here** — and the constraints that travel with the stamp are in entry 12: a
**new** field rather than a second meaning for `startsAt`, a **third** clock
reading that must not reach `feed-liveness.ts`, and a figure that is honest only
as a distribution because a server clock and a browser clock disagree.

**The browser half is already measured**: Task 3.4.8 took frame → price on
screen at **52 ms p95**. What is missing is the server-side leg, and §28
excludes upstream-provider latency, so `startsAt` cannot substitute for it.

### 2. The logging lever was evaluated and NOT pulled — do not re-open it blind

Task 1.12.6's `ignore: "reqId,pid"` reversal trigger was evaluated at universe
scale by Task 3.5.8, **and the task had the trigger backwards**. 1.12.6 kept
`reqId` _because_ interleaving was expected, and said to pull the lever only if
it never arrived.

Measured both ways:

| What was run                               | Result                                               |
| ------------------------------------------ | ---------------------------------------------------- |
| 16 **sequential** requests, socket running | every `incoming`/`completed` pair **adjacent**       |
| 12 **concurrent** requests                 | two opened, **ten others completed**, then those two |

**An ordinary page load is concurrent**, so interleaving is real and `reqId` is
doing exactly its job. The lever is worth **156 → 101 columns** and is not worth
taking. `pid` alone is 8 of those 55.

**The socket did not bring interleaving** — its records are a startup burst and
then near-silence. If you re-open this, re-open it on _concurrency_, not on the
feed.

### 3. `market-stream.ts` still never references `onLog`

**Unchanged, and still yours.** The Alpaca client emits eight diagnostic
events — `authenticated`, `subscribed`, `credentials-refused`,
`frame-rejected`, **`connection-limit`**, `unexpected-error-frame`,
**`liveness-watchdog-fired`**, `closed` — and **not one reaches production**.

That is why a dead feed ran for nineteen hours unseen on 2026-09-19, and it is
why `GET /diagnostics/feed` is still the only instrument. Story 3.5 added a
`subscription-shortfall` event to that list (Task 3.5.3) and a
`dropped a browser that stopped reading` warning that **does** log (Task 3.5.7,
through Fastify's logger rather than `onLog`) — so the split is now visible:
**the gateway logs, the vendor client does not.**

---

## Handed here by Task 3.6.4 — 2026-09-22: the instrument exists, so criterion 4 is a re-take with a recipe

**§28's headline figure has now been taken once, and the mechanism is on the
wire for good.** Every frame the gateway sends carries `sentAt`, the server's
wall-clock instant at the send
([ADR 0033](../../../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)).
Task 3.6.4 subtracted it in a browser at two ends — _frame in the page_ and
_universe table DOM updated_ — at 518 subscribed securities on a production
build, and published the distribution with its n, its ends and its skew caveat
in
[`TASK-04`](../story-06-live-prices-across-the-universe/TASK-04-the-instant-the-wire-does-not-carry.md).
`STREAM-SEAM.md` §8.9 is the standing account.

**What this story owes is the re-take, and here is what the first take could
not do, in words this story can act on:**

- **It was taken against the fixture stream on loopback, not the deployed
  gateway during a session.** The store on the measuring machine was six
  sessions behind, so ADR 0030's replay had no session to start from and
  emitted nothing (recorded in the task file as a finding); the fixture
  produces the same frame shape — one `bars` frame of 518 observations a
  minute — so the wire leg is real, but the network leg is a loopback socket.
  **Criterion 4 re-takes this against the deployed site, with the real IEX
  socket, during a session**, which is the only place the network and the
  ingress are in the number.
- **The recipe is four lines and is recorded in the task file.** Wrap
  `window.WebSocket` from an `addInitScript` **without** `routeWebSocket`,
  stamp `Date.now()` in the `message` listener, subtract the frame's `sentAt`,
  and stamp the table's first mutation after it through a `MutationObserver`.
  Two pages double n at no cost in wall time.
- **Read the deployed figure as a distribution and expect skew.** On loopback
  the server and the browser share one clock and a negative sample is
  impossible; against the deployed gateway they do not, and a negative p50
  means the viewer's clock is ahead of the server's rather than that a frame
  arrived before it was sent. Publish p50 / p95 / max with n and say which
  machine's clock is which. **Do not correct for skew by subtracting the
  minimum** — that assumes the fastest frame was instantaneous.
- **Re-take the payload beside it.** The stamp cost **36 bytes a frame**, read
  off the wire; the universe frame's size is in the task file. The eleven
  places that say `56.9 KiB` were deliberately not rewritten (Task 3.5.8's
  amendment); this story's cost envelope should cite the re-measured figure
  rather than either.

**`docs/GAPS.md` entry 12 is closed.** What stays open here is only criterion
4's own clause — _with the feed running_ — and it now has an instrument.

## Handed here by Task 3.6.5 — 2026-09-22: §28's steady state on the universe table, and how to re-take it with the real feed

**Criterion 4's re-take now has a third figure to re-take, and it is the one
the real feed changes most.** Task 3.6.5 measured the universe table's steady
state on a production build against the fixture feed — **every** row changing
every minute, which §7.6 says the real feed never does (~65% median) — and
after its repair the frame's script is **37–40 ms** with **no task over
50 ms**. Against the real feed the memo boundary skips every row whose bar did
not arrive, so the deployed figure should be **lower**; if it is not, something
is re-rendering rows the feed did not touch, and the counter below finds it.

**Two instruments, both in Task 3.6.5's record and neither needing a build of
its own:** a `PerformanceObserver` on `long-animation-frame` from an
`addInitScript`, whose `scripts[].invoker` names the React scheduler
(`MessagePort.onmessage`) and whose `scripts[].duration` is the figure; and a
counter on `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`, which
production React still calls on every commit, to count commits per frame — the
route commits once a second (the clock, cheap) and should commit **once** per
`bars` frame and **not** on the 30 s health poll any more.

**The cold load and `Expand all` are re-taken and still Epic 14's** (50–56 ms
on seven loads in ten; 65–86 ms). Quote them from the epic's `EPIC.md` rather
than re-taking them here unless the table changed.

## Handed here by Story 3.7's close — 2026-09-23: two figures for the bill, and one condition to evaluate

- **The tape column costs ~2% of the store's headroom, and the plan does not
  move.** `0010` added 4 bytes to every row written after 2026-09-22 and **zero**
  to the 48 million already there — a constant default on PostgreSQL 18 is a
  catalogue entry, not a rewrite. `BARS.md` §8.3 and §8.4 carry the amendment:
  195 → 199 B/row on new rows, 8.66 → 8.84 GiB a year at 518 symbols, ~2.6 → ~2.55
  measured years to read-only, and **~2.4 against the calendar ceiling either
  way**. Quote those rather than re-taking them. The number worth your attention
  is not this one: `market_bars_pkey` is **1,029 MB with zero scans**, which is
  25× the tape column's whole annual cost.
- **There is no deferred validation to check was run, and there never will be.**
  `market_bars_feed_check` is `NOT VALID` permanently — validating it is a full
  heap scan, ~508 s on the B1ms tier against `deploy.yml`'s 120 s — and
  `pg_constraint.convalidated = false` is asserted by `pnpm test:database` with
  `pnpm break the-tape-check-gets-validated` behind it (ADR 0034).
- **One `docs/GAPS.md` condition you are well placed to evaluate.** _A migration
  on `market_bars` waits for as long as the longest open transaction_ — measured
  at 18.16 s for the migration and 16.16 s for an ordinary chart read queued
  behind it, against a 0.09 s baseline. Its owner is a condition rather than a
  story: the first migration on that table that is not two catalogue writes, or
  the first deploy reporting exit 124 with `wait_event: relation`. An epic close
  that reviews cost and performance is the natural place to ask whether Story
  3.8's live writer has made that condition worth buying the bound for.

---

## Handed here by Story 3.8's close — 2026-09-24: a figure nobody has taken, with the arithmetic it has to beat

**`BARS.md` §8.4 is now a two-writer plan on one writer's measurements, and this
story owns the re-take.**

Story 3.8 decided that **both tapes are kept**, and ADR 0035 priced it **before
a row was written**: **+69% rows a year**, **+6.1 GiB a year**, headroom from
~2.6 years down to **~1.5**. That is a ceiling computed as if the live feed
produced a bar for every minute of every session.

**It does not.** IEX's median per-symbol minute coverage is **65.1%**, worst
case **2.1%** (`ERIE`), measured first-hand in `LIVE-DATA.md` §7.6 — so the real
duplicate set is smaller, and **by how much has never been measured on a real
day**. What this story owes:

- **One trading day's rows and bytes on the deployed store**, split by `feed`,
  against §8.4's arithmetic. It is one query, and until somebody runs it the
  headroom figure in `BARS.md` is a prediction wearing a table's clothes.
- **How many of those rows are duplicates** — minutes holding both tapes — which
  is the number ADR 0035's 69% actually estimated, and the input to its reversal
  trigger (_the first month in which the live session's rows outgrow the
  backfill's_).
- **What the extended-hours residue costs.** The writer keeps pre- and
  after-hours bars and the backfill asks per **session**, so those minutes are
  the live tape's for ever — a permanent, single-tape addition rather than a
  duplicate. It is the one stretch that survives the night.

## Handed here by Story 3.9's close — 2026-09-24: four figures to re-take against the deployed gateway

Every figure below was taken on a **developer's machine** against a socket an
instrument served. They are honest about what they measure and none of them is
the deployment. This story is the deployed re-take.

| Figure                                      | Taken                                 | Why it must be re-taken                                                      |
| ------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| **7.2–8.1 ms** script a burst, 1,950 bars   | production build, instrument's socket | no gateway, no network, one machine's CPU                                    |
| **12.3–13.2 ms** script a burst, 6,630 bars | same                                  | and 6,630 bars is **68% of the cap**, not the cap                            |
| **zero** frames over 50 ms, 160 bursts      | same                                  | the acceptance figure, and the one worth defending in front of a stranger    |
| §28's **p95 68.1 ms** gateway→repaint       | Task 3.6.4, **loopback**              | server and browser on one machine, one clock — already named as your re-take |

`CHARTING.md` §18 carries the first three with their method and their caveats.

**The cap is the gap worth closing.** Task 3.9.9 could not reach 9,750 bars
because that machine's store ended 2026-09-11, and backfilling to reach it is a
metered vendor write. The deployed store is backfilled nightly, so **a deployed
re-take reaches the cap for free** — ask for 25 sessions of `1m` on a liquid
name and the answer is the cap. The trend measured was sub-linear (3.4× the
bars for 1.8× the script), so the expectation is comfortable; the point is that
expectation is not measurement.

**And one method note worth inheriting rather than rediscovering.** A
`long-animation-frame` entry only exists for a frame **over 50 ms**, so "zero
observed" and "the observer is broken" are the same output. Task 3.9.9's first
self-test reported zero because it blocked **outside** an animation frame on an
idle page. Block inside a `requestAnimationFrame`, with a mutation after it, and
confirm the observer complains **before** believing any silence it reports.

## Handed here by Story 3.10's close — 2026-09-24

This story already names Story 3.10 for backoff and retry. What follows is
**new** and is not covered by that.

- **The deployed re-take of this story's figures.** Task 3.10.4 measured the
  per-row cost of dating a stale row on a **production build against a local
  pair** — **36.75–36.83 ms of script a tick** at the worst case (every one of
  517 rows behind, every instant drawn), against §28's 50 ms. It is a loopback
  figure like every other in this epic. Re-take it against the deployed
  gateway during a session, with the rest.
- **The transition's own cost, which is UNMEASURED and was not taken.** A feed
  dying changes one field on one view and re-renders every surface at once —
  a burst with a different shape from a bar arriving. Story 3.10 declined to
  measure it and said why: §28's word is **routine**, and a disconnection is a
  one-off, so it falls where the cold load falls rather than where the tick
  does. **That is an argument and not a measurement**, and this story is where
  arguments of that kind get numbers.
- **Eight diagnostic events that reach production nowhere.** `market-stream.ts`
  never references `onLog`, which is why a dead feed ran for **nineteen hours**
  unseen. Story 3.10 did not repair it — it is a cost-and-observability
  question rather than a degraded-state one.
- ~~**`docs/GAPS.md`'s socket-churn entry**, added 2026-09-24~~ — **WITHDRAWN
  2026-09-25 by Task 3.11.2.** The counter counted **Vite's HMR socket** as two
  of its three. The deployed page opens **one and holds it**; the dev page
  opens one plus a `StrictMode` open/close pair. There is no churn, there is
  nothing to re-measure in the deployed pass, and what replaced the entry is
  the rule — **count by URL, never by event** — with a spec behind it.
