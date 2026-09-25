# Task 3.11.6 — What a connection does over a week rather than an afternoon

**Status:** **Complete — 2026-09-25. Three questions, three answers, and `LIVE-DATA.md` §12.2's bound is wrong by 9×.** Measured on two consecutive deploys, the first day production's logs existed: the arriving replica is refused `406` and authenticates after **45.8 s and 46.5 s**, against §12.2's claimed **5 s** ceiling. **The deliberate close is working** — the outgoing replica releases the slot 2.9 s before the new one authenticates — but it is not asked to shut down until ~46 s in, because that is the platform's schedule. **The bound is Container Apps' revision-overlap policy, not our shutdown path**, and every deploy costs about **46 seconds of live feed**.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

The three socket questions this story has been holding since Epic 3's spike, all
of which need **elapsed time** rather than effort — which is why they are one
task and why it should start early and finish late.

## What the user can see when this lands

**Nothing**, and the answers govern whether the deployment can hold a socket
safely at all.

## The three, and what is already known about each

### 1. The weekend hold — a run that has already been started once

`STORY.md`'s own section records the trigger as **fired** and a run **under
way** from 2026-09-19: `scripts/weekend-watch.mjs` polling `/diagnostics/feed`
every 60 s through to Monday's open.

**Check what that run produced before starting another.** The section warns that
it is a different instrument from the retired `weekend.mjs` — that one **held**
the socket and this one polls — and that the difference **bounds the
conclusion**. A poll that says the deployment is configured for `alpaca` is not
a socket that stayed up.

### 2. Does a half-open socket lock out its successor?

Handed here by Task 3.2.5. The free plan allows **one** connection, and the
failure mode that matters is a connection that is neither alive nor released.
A developer machine with no local process connected was refused
**`406 connection limit exceeded`** at 23:30 ET, verified with `lsof` against
the resolved address — so the slot is held by production, correctly.

**The question is what happens when production's own socket half-dies.**

### 3. What holds the slot — the same question asked twice

The 2026-09-19 section records this as the overlap window's question in another
form. `STORY.md`'s later table names the interesting case: **refused `406` for
materially longer than the ceiling — the slot is not freed by our close.**

## The measurement that arrived while this story waited

The 2026-09-24 session watch ran **655 minutes overnight** and **420 through a
session**, and recorded: the watcher's own socket closed **38 times in 4h 36m**
overnight, every one code **1006** with `elsewhereReachable: true`; and **twice
in 420 minutes** during the session. Two caveats travel with it and both are
recorded: the watcher runs on a laptop over a domestic link, and an overnight
socket is **idle**, which is the condition an idle timeout fires on.

**That is a second client's experience, not the deployment's own socket.** What
none of it answers is whether the **backend's** upstream connection to Alpaca
behaves the same way — which is exactly what `onLog` would have said and is Task
3.11.3's.

## Work

- The 2026-09-19 run's output found and read, or recorded as lost
- Each of the three questions answered, or narrowed with what was ruled out
- Anything that needs elapsed time **started at the beginning of this story**
  rather than at this task, and said so here
- `LIVE-DATA.md` §9 and §12 amended with what was learned
- `docs/GAPS.md` entry 7 and entry 10 re-verdicted — the contended single
  connection is the constraint every sitting in this epic has paid for

## Done when

1. Three questions, three answers or three recorded narrowings
2. Nothing in this task is waiting on a clock at the point the story closes
3. The single-connection entries in `docs/GAPS.md` say what is now known

## Amended by Task 3.11.1 — 2026-09-25: the first item is DONE, and this task no longer needs a clock

**Question 1 is discharged.** `weekend-watch.mjs`'s run was found and read:
`.capture/weekend/watch-2026-09-19.jsonl`, **1,065 samples over 55 hours**,
2026-09-19T13:56Z → 2026-09-21T20:58Z, **535 `disconnected` / 488 `live` / 1
`stale`**. The feed was down about **forty hours** — Friday's whole session and
the weekend — then **`live` at 05:45Z on the Sunday**, unattended, and up
thereafter. _Monday's open is still at risk_ is answered: **it was not.**

Two caveats travel with it and are in Task 3.11.1's record: the `poll-failed`
stretches are the watching laptop asleep, and this is `/diagnostics/feed`'s own
`status` — the **backend's** view of its socket, not a browser's.

**The consequence for this task is a re-characterisation rather than a
deletion.** It was written as _the one that needs elapsed time rather than
effort_, with an instruction to start it when the story starts. **That is no
longer true.** What remains is questions 2 and 3, and they are the **same
measurement**: one log read on a deploy that rolls a replica while the feed is
connected. Tasks 3.11.2 and 3.11.3 will each cause one.

**So this task is now two cheap observations and can be taken whenever the next
deploy lands during a session** — it does not have to be started early and it
does not have to wait for a weekend.

> **And it inherits one question it did not have.** Nobody can say **what
> recovered the feed** on that Sunday. No restart is recorded in the window,
> and the eight diagnostic events that would have said were not being logged.
> **This task cannot answer it retrospectively** — the evidence does not exist —
> so the honest disposition is that Task 3.11.3 makes the _next_ one
> answerable, and this task records that the previous one is not.

## Amended by Task 3.11.2 — 2026-09-25: one of the three questions has a data point

**Question 1's successor — _does production hold the socket out of hours?_ — has
a reading.** At **2026-09-25T03:13Z**, market shut, the deployed backend
answered:

```json
{
  "provider": "alpaca",
  "feed": "iex",
  "status": "live",
  "observedAt": null,
  "marketOpen": false,
  "checkedAt": "2026-09-25T03:13:29.035Z"
}
```

**`status: "live"` with `marketOpen: false`** — the upstream socket is
authenticated and held with the market shut, which is §9.3's _hold the socket
always_ working.

**That matters because the weekend-hold section says the opposite**, in as many
words: _§9.3's hold the socket always is not what production does._ It was
written **during** the forty-hour outage and was true of that weekend. It is not
true today, and both readings belong in `LIVE-DATA.md` §9 rather than one
replacing the other.

**It is one sample and it is not a week**, which is this task's whole subject —
so it narrows question 1's remainder rather than closing it: what is still
unmeasured is whether the socket is held across a **whole** weekend now, and
that is a poll this task can start whenever it likes and read on Monday.

## Amended by Task 3.11.3 — 2026-09-25: the instrument questions 2 and 3 needed now EXISTS

**This task said its remaining two questions were _one log read on a deploy that
rolls a replica while the feed is connected_. Until today there was nothing in
the log to read.**

`createAlpacaStream`'s events reached production nowhere, so _observe whether
the arriving replica is refused `406`, and for how long before it
authenticates_ was not a log read — it was an impossibility politely worded.
**Task 3.11.3 wired them**, and three of the eleven are precisely the
measurement:

| Line                                                       | What it gives                                    |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `market stream refused: connection limit` with `retryInMs` | **when the `406` began**, and one line per retry |
| `market stream authenticated` with `symbols`               | **when the slot was actually released**          |
| `market stream closed` with `elapsedMs`                    | how long the outgoing socket lived               |

**So the reading is the interval between the first `connection-limit` line and
the `authenticated` line on the arriving replica**, and the number of
`connection-limit` lines between them is the count of 3-second retries it took.

**Read it against the table this task already carries**, which decided what
each outcome means before the data arrived:

- authenticates immediately → the outgoing replica's close released the slot;
  §12.2's claim is an optimisation rather than the bound
- refused, then authenticates within the shutdown ceiling → exactly as §12.2
  predicts, and the bound is real
- refused for materially longer than the ceiling → **the interesting one**: the
  slot is not freed by our close

**The evidence arrives on the next deploy** — which is the deploy of Task
3.11.3 itself, so it should be read before anything else rolls. `az containerapp
logs` or the platform's log stream, filtered to `market stream`.

> **And one caveat this task must not lose.** These lines are the **backend's**
> socket to Alpaca — the connection all three questions are about. Task
> 3.11.2's browser counter measured a **different** connection (a page to our
> gateway) and says nothing here.

## Amended by Task 3.11.5 — 2026-09-25: the COST half of this question is answered, and it is not what §9.2 said

**This task inherits `LIVE-DATA.md` §9 and §12 to amend**, and §9.2's premise has
now been falsified by a bill rather than by an argument.

**§9.2 reasons that a held socket pushes the replica off the Consumption plan's
idle vCPU rate** — ADR 0011 priced that at $19.04/month, the 2026-09-17
amendment at $9.26 with the threshold crossed for 397 seconds a day.

**The bill cannot see the socket.** Across the 2026-09-19 → 09-21 outage — about
**forty hours disconnected**, which is the natural experiment nobody designed —
Container Apps billed `$0.2149` and `$0.2291` a day, **indistinguishable from
the connected days either side**.

**So this task's §9 amendment is not a refinement of 550.6 B/s; it is a note
that the whole per-second-threshold argument measures something the bill does
not charge for.** The traffic figure stays true and stops being load-bearing.

> **What the socket costs is still this task's question**, and the answer has
> moved from _money_ to _the slot_: the free plan allows **one** connection, and
> what a half-open or forgotten one holds is what questions 2 and 3 are about.
> That is unaffected — and it is now the **only** reason the socket's behaviour
> over a week matters, because the other reason turned out to be $0.00.

---

## What was done — 2026-09-25

### The reading, and it took one query

Task 3.11.3 wired the logging on the previous merge; this is the first day there
was anything to read. `ContainerAppConsoleLogs_CL | where Log_s has 'market
stream'` over four hours returned **72 lines across seven revisions**, and the
last two are the measurement:

| Revision  | First `406`  | `authenticated` | Gap        | Retries |
| --------- | ------------ | --------------- | ---------- | ------- |
| `0000349` | 04:25:09.917 | 04:25:55.718    | **45.8 s** | 15      |
| `0000350` | 04:39:48.992 | 04:40:35.528    | **46.5 s** | 16      |

Each `connection-limit` is preceded by a `closed` at **3.6–5.9 ms** — §8.5's
_refused duplicate_ shape, confirmed from the other end for the first time.

> **And the five revisions before them log only `market stream started`**, which
> dates the instrument exactly: `0000344`–`0000348` predate the `onLog` wiring,
> and that one line was always there in `index.ts`. Nothing about the earlier
> deploys was different; **we simply could not see them.**

### §12.2's bound is wrong by 9×, and the mechanism it names is fine

§12.2 says the deliberate close on `SIGTERM` _bounds the every-deploy feed
outage at the existing **5 s** shutdown ceiling instead of at §6.4's measured
4 h 21 min._

**Measured: 45.8 s and 46.5 s.**

**The close is not the problem.** On `0000350` the outgoing replica logged
`market stream closing deliberately` at **04:40:32.620** and the arriving one
authenticated at **04:40:35.528** — **2.9 s later**. The deliberate close does
exactly what §12.2 claims: it releases the slot promptly.

**What nobody checked is when it happens.** The outgoing replica is not asked to
shut down until **~46 s into the new replica's life**, because that is when
Container Apps terminates it. **The bound is the platform's revision-overlap
policy, not our shutdown path.**

> **So the decision stands and the figure does not**, which is the useful shape
> of this finding: closing deliberately is still free, still correct and still
> the fastest path to releasing the slot. It is simply not what bounds the
> window, and §12.2 credited it with something it does not do.
>
> **The consequence is user-facing in one narrow way**: every deploy costs about
> **46 seconds of live feed**, and during a session that is 46 seconds of prices
> this product does not receive. Nothing on screen is wrong — Story 3.10 made
> sure of that — but the data is missing, and Task 3.10.7's gap refill is what
> fills it when the socket returns.

### The three questions, verdicted

**1. The weekend hold** — discharged by Task 3.11.1 from a file nobody had
opened. Forty hours `disconnected`, recovered **unattended** on the Sunday.
_Monday's open is still at risk_ is answered: **it was not.** What cannot be
said is **what recovered it** — that evidence never existed.

**2. Does a half-open socket lock out its successor?** **Not in the ordinary
case, because there is no half-open socket in it.** The incumbent is alive and
holding the slot legitimately, and releases it on `SIGTERM` in 2.9 s. §6.4's
4 h 21 min half-open socket is still unmeasured **from Alpaca's side**, and is
re-owned by a condition: _the first deploy that fails to terminate its
predecessor cleanly_, which is the only way to produce one without staging it.

**3. What holds the slot?** **The outgoing replica, for ~46 s, by the
platform's schedule.** Task 3.2.5's table gave three readings and the answer is
a fourth it did not anticipate: _refused for materially longer than the
ceiling_ **and** _the slot is freed by our close_ — which the table treated as
mutually exclusive, because it assumed the close was the only thing that could
free it.

### The cost half, which Task 3.11.5 answered from the other end

§9.2's premise — a held socket pushes the replica off the idle vCPU rate — is
falsified by the bill: forty disconnected hours cost the same as connected ones.
**The 550.6 B/s figure stays true and stops being load-bearing**, and what the
socket costs is **the slot rather than money**.

### What is still owed, and it is one sample rather than a week

The deployed backend held the socket with the market shut at 2026-09-25T03:13Z,
so §9.3 is what production does **today**. **That is one reading.** Whether the
socket survives a full 56-hour market closure _now_ — as opposed to the weekend
it did not, which was an outage rather than an idle timeout — is unmeasured.

**Deliberately not started.** Task 3.11.1's amendment established that nothing
in this story waits on a clock, and beginning a weekend poll would reintroduce
exactly that. The instrument is a poll anybody can start on a Friday; it is
recorded in `LIVE-DATA.md` §15.4 with what it would settle.

### Gates

Documents only. `pnpm links` and `pnpm invariants` green. `LIVE-DATA.md` §15
carries the readings; `docs/GAPS.md`'s two single-connection entries are
re-verdicted.

## For a stakeholder — a status report, 2026-09-25

### What this was

Three questions about our connection to the market data provider have been open
since the beginning of this phase. All three needed something we did not have:
**a record of what that connection was doing.**

We shipped that record yesterday. This task read it.

### The finding: every deployment costs 46 seconds of market data

Our data plan allows exactly **one** connection. When we ship a new version, the
old copy and the new copy overlap — and during the overlap the new one is
refused, because the old one still holds the connection.

We wrote down, months ago, that this costs **five seconds**, because we
deliberately close the connection when a copy shuts down.

**Measured on two real deployments: forty-six seconds.** Nine times what we
claimed.

**The interesting part is that our fix works perfectly.** When the old copy is
finally told to stop, it releases the connection and the new one is live
**2.9 seconds later**. The problem is that the hosting platform does not tell
the old copy to stop until **forty-six seconds** into the new one's life.

So we credited our own code with something the platform actually controls. The
code is right; the claim about it was wrong.

**What this means in practice**: every time we ship during market hours, we miss
about three-quarters of a minute of prices. Nothing on screen breaks — we spent
an entire story making sure of that — and the gap fills itself when the
connection returns.

### The other two questions

**Does a dead-but-not-closed connection block its replacement?** In the ordinary
case there is no such connection — the old copy is alive and holding it
legitimately. The genuinely pathological version remains unmeasured, and we have
written down the only circumstance that would produce one.

**What holds the connection?** The outgoing copy, for forty-six seconds, on the
platform's schedule. The answer is one nobody had listed as a possibility.

### A note on how this was possible

**Five deployments earlier the same day produced exactly one line of log each.**
Nothing about them was different — we simply could not see them. The record we
added yesterday is why today's two deployments produced seventy-two lines and an
answer to a question that had been open for weeks.

That is the second time this week that adding the ability to see something
immediately answered a question we had been arguing about.

### Where the product stands

**The last story of the live-market phase, six of ten tasks done.** What remains
is one sitting with the market open, the documents and the close.
