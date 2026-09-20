# Story 3.11 — Cost, Performance, the Sweep & the Epic Close

**Status:** Not started
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

## Open decisions — settle with the user

1. **The budget**, re-decided against a real reading.
2. **Whether the deployed check asserts liveness**, given that it cannot on a
   Sunday. The honest options are a criterion that only asserts out of hours
   what can be asserted out of hours, or a scheduled check inside a session —
   and the second is a new mechanism rather than an assertion.

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
