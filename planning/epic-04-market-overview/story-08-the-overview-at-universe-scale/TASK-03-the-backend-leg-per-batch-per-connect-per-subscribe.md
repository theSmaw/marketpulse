# Task 4.8.3 — The backend leg: per batch, per connect, and per subscribe

**Status:** **Complete — 2026-10-09.** The join is **3.72 ms** a call on the production artefact (tight loop, n = 400 after 300 warm-up, two runs agreeing to 0.1%), and it runs **once per applied batch, once per connect, once per subscribe and once with zero clients attached** — **three per browser opening `/`**, counted off the wire against the real gateway, two even on `/investigations`, which draws no figures at all. So _"the backend cost does not scale with connections"_ is **false of the join** and corrected at **five live sites**. And the task's own largest finding is about the instrument rather than the product: **a fixed-cost control loop with no ICU, no allocation and no strings inflates by 3.3× when it is called once every 250 ms instead of in a tight loop, and the join inflates by 3.5–3.8× beside it** — so every absolute per-batch figure in this epic, including this one, is a tight-loop figure, and nothing in it is a measurement of what this computation costs at the cadence production runs it at.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**The 518 in this story is entirely server-side**, and the join does not run
only where everybody assumed.

## What the user can see when this lands

**Nothing.**

## Work

### The thing nobody had priced: the join runs per connect and per subscribe

`sendSnapshot()` ends with `send(client, overviewMessage())`, and
`overviewMessage()` calls an **unmemoised** `marketOverview()`. `sendSnapshot()`
runs once in the `upgrade` handler **and at the foot of every `message`
listener**, without comparing. So:

- Task 4.2.1 measured **three snapshots on an ordinary cold load** → roughly
  **three full 518-joins per browser opening `/`**. n browsers = 3n joins.
- On `/` there is a **feedback loop**: the movers ranking changes → `symbolKey`
  changes → a resubscribe → the gateway answers with a snapshot **and another
  join** → the observations identity changes → a re-render. The route's own
  comment names _"the point at which the resubscribes overtake the gateway's
  own cadence"_ as a known hazard and nothing measures it.
- **The join also runs with zero clients attached**: `publishObservations`
  evaluates `overviewMessage()` as an **argument** to `broadcast`, before the
  client map is consulted.

**So the inherited claim _"the backend cost does not scale with
connections"_ is false of the join.** It is true of the broadcast encode only.
Correct the hand-off rather than measuring around it.

### What to measure, and the control that makes it attributable

The join per applied batch on a **production build**, with Story 4.5's control
arm — the same pipeline with movers' eligible set emptied — because **that
control reproduced Story 4.4's 3.497 ms baseline to 0.1%**, and that is what
makes a difference attributable rather than merely adjacent. **A/B/A/B per
burst, not arm-then-control**: 4.5's control max moved 3.74 → 25.7 ms between
runs while its median moved 0.23.

Then the joins per cold load, and the joins per minute on an idle backend with
**no browser attached** — which nobody has priced against the idle-rate
condition.

### The branch that decides what tonight's figures even mean

`eligibleMoves` picks its arm from `isMarketOpen(asOf)`, read off the trading
calendar. **Out of hours `sessionMoves` runs, not `observedMoves`** — a
different computation, a different denominator (~503 with a close, not the ~466
heard from in five minutes) and a different grammar on screen. **The 3.4 ms of
`marketDateAt` IS reproduced out of hours**, because it sits in
`buildMarketOverview`'s `changeFromClose` call, upstream of the branch; the
breadth and movers legs are not. **Every figure this task takes tonight is the
session-basis arm and must say so.** There is no seam in `index.ts` that
injects `marketOpen`.

### Report medians and p95, and maxima as unusable

Established on this machine by measurement rather than by taste — see the
control above.

## Done when

1. The join's cost per applied batch on a production build, with the
   interleaved control, medians and p95, n stated, maxima marked unusable
2. The per-connect and per-subscribe joins counted and priced, and the
   resubscribe loop on `/` either measured or recorded as unmeasured with a
   condition
3. The zero-clients case priced
4. Every figure labelled **session basis**, with what the observed-basis arm
   would differ by stated
5. The hand-off's _does not scale with connections_ claim corrected where it
   is live

## What was done — 2026-10-09

### How it was measured, and why the browser harness is only one third of it

Three instruments, all throwaway, all now deleted:

1. **`join-cost.mjs`** — the producer composed exactly as `index.ts`'s
   `marketOverview()` composes it, over the **production artefact's own
   modules** (`apps/backend/dist/*.js` and `packages/shared/dist`, which is
   what the deployed image runs), against an all-518-observed fixture. Seven
   arms, **A/B/A/B per burst** — every arm sampled once per iteration, in
   order, so all arms see the same machine conditions sample for sample — with
   4.8.1's calibrator (2,000,000 `Math.sqrt`, band 1.6×) sampled beside every
   burst and its discard count printed. It takes `readMachineLoad` and the
   heavy-job lock from the shipped harness rather than re-rolling either.
2. **`gateway-joins.mjs`** — the **real** `registerMarketGateway` from `dist`,
   a real listening server, real `ws` clients, and an `overview` callback that
   runs the real join and **counts itself**. So every count below is a count of
   joins that ran, not of frames that imply one.
3. **`cold-load-joins.mjs`** — 4.8.1's harness: the production pair
   (`:4273` / `:3100`, `PRODUCTION BUILD` asserted off the wire) with
   `MARKET_DATA_PROVIDER=none` against **`marketpulse_bare`** — 518 securities,
   **0 bars**, verified — so nothing arrives from a feed and every `overview`
   frame a page receives is a **connect or a subscribe** join. A quiet feed is
   what makes that count unambiguous.

**`marketOpen` is an argument to the instrument, never a seam in `index.ts`.**
The brief's instruction was to prefer measuring the pure function directly, and
that is what makes **both** bases reportable out of hours rather than one
measured and one argued.

### 1. Per applied batch — the join, two runs, A/B/A/B per burst

518 tracked, **518 observed with closes** (Task 4.4.4's worst case; production
hears ~332 in a median minute), `n = 400` timed after **300** warm-up, the
calibrator paired with every burst. **Both runs below are tight loops** — see
finding 6, which is why that sentence is now load-bearing.

| arm                                                | run 1 p50 | run 2 p50 | p95           | max           |
| -------------------------------------------------- | --------- | --------- | ------------- | ------------- |
| **observed basis** — `overviewMessage()` whole     | **3.663** | **3.667** | 3.828 / 4.005 | 11.13 / 14.03 |
| observed control — movers' `moves` emptied         | 3.545     | 3.544     | 3.713 / 3.920 | 19.24 / 17.37 |
| **session basis** — `overviewMessage()` whole      | **3.636** | **3.640** | 3.832 / 3.931 | 25.54 / 8.14  |
| session control — movers' `moves` emptied          | 3.534     | 3.546     | 3.693 / 3.824 | 19.65 / 9.07  |
| the join alone — `buildMarketOverview` over 518    | 3.442     | 3.445     | 3.583 / 3.706 | 7.64 / 15.75  |
| the join alone — **nothing observed** (CI's shape) | **0.013** | **0.013** | 0.016         | 0.055 / 0.041 |
| `overviewMessage()` whole — **nothing observed**   | **0.056** | **0.054** | 0.071 / 0.073 | 0.155 / 0.294 |

Calibrator: reference **1.14 ms** both runs, band **[0.71, 1.82] ms**,
**3 / 400** and **6 / 400** discarded. Load **0.739** and **0.287** of 8 cores,
under the ratio-1.0 ceiling, unraised.

**The maxima are unusable and that is the machine.** The control's max moved
**19.24 → 17.37 → 9.07 → 19.65 ms** across four arms whose medians agree to
0.01 ms, which is Story 4.5's finding reproduced exactly. Medians and p95 are
the figures.

**The control is the attribution.** 3.545 / 3.544 ms against Story 4.4.4's
**3.497 ms** — the baseline reproduced to **1.4%** on a different day, a
different instrument and a different author, which is what makes the
differences below attributable rather than adjacent.

Two differences fall out of it:

- **Movers cost 0.118 and 0.123 ms a batch** (arm − control), against Story
  4.5.4's **0.28–0.41 ms** for the same arm and the same control. The
  difference is the **interleave**: 4.5 ran arm-then-control and this task runs
  A/B/A/B, and about 0.2 ms of 4.5's marginal figure was drift between arms.
  4.5's own hand-off predicted exactly this and it is why the brief asked for
  the interleave.
- **The whole producer is 3.66 ms and the join is 3.44 ms of it** — so breadth,
  the movers' selection, eleven sector ranks, the ladder's rung and the frame's
  JSON encode are **0.22 ms together, 6%**. Task 4.4.4's attribution stands
  unchanged: the cost is **518 `marketDateAt` calls inside `changeFromClose`**,
  and Gate 1 has already measured that as **three `formatToParts` per call,
  1,554 for 518 conversions** — Task 4.8.7's.

**Nothing observed is the figure that explains why no gated machine has ever
seen this cost.** 0.013 ms for the join and 0.056 ms for the whole frame. CI's
store has zero bars, so every entry is `unknown`, `changeFromClose` is never
reached, and the expensive path does not execute. The same is true of a freshly
started process for its first minute.

### 2. Per connect and per subscribe — counted, then priced

**Counted against the real gateway** (`gateway-joins.mjs`, verbatim):

```text
clients attached: 0
1. publishObservations(518) with ZERO clients attached -> joins 1
   publishObservations([]) with zero clients            -> joins 0
2. one connect, no subscribe yet
  joins 1  frames ["snapshot:141","overview:4078"]
3. a subscribe with ZERO symbols (4.8.2's cold `/`)
  joins 1  frames ["snapshot:141","overview:4078"]
4. the real subscribe (~25 symbols)
  joins 1  frames ["snapshot:1840","overview:4078"]
5. one mover substitution -> one resubscribe
  joins 1  frames ["snapshot:1840","overview:4078"]
6. the IDENTICAL subscription re-asserted
  joins 1  frames ["snapshot:1840","overview:4078"]
clients attached: 5
7. one batch, 5 clients -> joins 1, frames per client [["overview:4078","bars:1780"],["overview:4078","bars:60107"],["overview:4078","bars:60107"],["overview:4078","bars:60107"],["overview:4078","bars:60107"]]
```

Six facts in that transcript, and five of them are the claim:

- **One join per connect**, answering a subscription that is structurally empty.
- **One join per readable `subscribe` MESSAGE** — including a subscribe with
  **zero symbols** (4.8.2's cold `/`, confirmed here) and including an
  **identical** subscription re-asserted. The listener does not compare, by
  design, and the reconnect path re-asserts.
- **One join per applied batch, whatever the client count** — 0, 1 and 5
  clients all produce exactly 1. This half of the inherited claim is true and
  survives.
- **One join on an empty batch: zero.** `publishObservations` returns before
  the argument is evaluated.
- **One join with zero clients attached**, which is AC 3.

**And counted off the wire by a real browser** (`cold-load-joins.mjs` against
`marketpulse_bare`, 12 s a route, quiet feed, production build asserted):

```text
/ — 12 s, quiet feed
  sockets by URL: [{"url":"ws://127.0.0.1:3100/market-stream","ours":true}]
  snapshot x3  [{"bytes":149,"n":0,"at":373.6},{"bytes":149,"n":0,"at":379.5},{"bytes":149,"n":0,"at":387.8}]
  overview x3  [{"bytes":928,"n":0,"at":379.2},{"bytes":928,"n":0,"at":379.5},{"bytes":928,"n":0,"at":389.3}]
  => 3 overview frames = 3 full 518-joins per cold load; 3 snapshots

/securities/NVDA — 12 s, quiet feed
  snapshot x3  [{"bytes":149,"n":0,"at":322.3},{"bytes":149,"n":0,"at":325.1},{"bytes":149,"n":0,"at":436.1}]
  overview x3  [{"bytes":928,"n":0,"at":324.8},{"bytes":928,"n":0,"at":325.1},{"bytes":928,"n":0,"at":437.9}]

/investigations — 12 s, quiet feed
  snapshot x2  [{"bytes":149,"n":0,"at":294.9},{"bytes":149,"n":0,"at":298.2}]
  overview x2  [{"bytes":928,"n":0,"at":297.9},{"bytes":928,"n":0,"at":298.2}]
```

**One socket, counted by URL** — 4.8.1's own lesson applied, and the count is
one rather than three.

So, **per cold load**: `/` **3 joins**, `/securities/:symbol` **3**,
`/investigations` **2** — a route that renders no figure at all and subscribes
to nothing pays two full 518-joins, because the connect's join is unconditional
and the empty subscribe is answered without comparison. Priced at the
tight-loop figure on a populated store:

| event                                    | joins | tight-loop price |
| ---------------------------------------- | ----- | ---------------- |
| one applied batch                        | 1     | **3.72 ms**      |
| one cold load of `/`                     | 3     | **11.2 ms**      |
| one cold load of `/securities/:symbol`   | 3     | 11.2 ms          |
| one cold load of `/investigations`       | 2     | 7.4 ms           |
| one reconnect (connect + re-assert)      | 2     | 7.4 ms           |
| one mover substitution → one resubscribe | 1     | 3.72 ms          |
| n browsers opening `/`                   | 3n    | **11.2n ms**     |

**The resubscribe loop on `/` is priced and its RATE is unmeasured, with a
condition.** The gateway half is measured above — one substitution is one
resubscribe is one join, with no comparison anywhere on the path. What is not
measured is **how often the top-ten membership changes in a real session**,
because a provider-less local pair produces no substitutions at all and the
fixture cannot produce a split minute. **Condition: the first instrument that
can set frame composition freely — which is Task 4.8.4's furnished socket**, by
the owner's own Gate 1 decision. The arithmetic it needs is here: at the
measured midday floor of **6.8 batches a minute**, the resubscribes overtake the
gateway's own cadence the moment the membership of either five-row list changes
more than **6.8 times a minute**, and each one costs one join on top of the
batch that caused it.

### 3. The zero-clients case, priced — and the gateway's whole publish

`publishObservations` evaluates `overviewMessage()` as an argument to
`broadcast`, so the join runs before the client map is read. Measured inside
the real gateway, n = 300, tight:

| arm                                                     | p50       | p95   | max   |
| ------------------------------------------------------- | --------- | ----- | ----- |
| `publishObservations(518)`, **ZERO clients**, real join | **3.708** | 3.814 | 4.006 |
| the same with a **cached** overview — the control       | **0.013** | 0.014 | 0.016 |

**3.71 ms, and the control says all of it is the join**: `broadcast` to an
empty map plus the per-client loop plus the early return is **13 µs**. The
agreement between this and `join-cost.mjs`'s 3.66 ms — two instruments, one
through the real gateway and one beside it — is **1.3%**.

**What that costs an idle deployment.** The backend's own socket runs whenever
the market is open whether or not a browser is attached, so on a deployment
with nobody looking the join runs at the feed's cadence: **6.8 batches a minute
at midday → 25 ms of script a minute, 16.1 at the close → 60 ms**, for an
aggregate that is **sent to nobody**. The frame is not built for an empty map
— `broadcast` iterates nothing — but the **computation behind it is**. That is
the one figure in this task with a bill attached to it (§9.1's idle-rate
condition), and the repair is a one-line guard rather than a memo: the same
`clients.size > 0` test the keepalive already makes, twelve lines below.
**Not taken here** — it is a shipped behaviour change on the path the socket
callback runs, and it belongs with whatever disposition Task 4.8.8 takes.

**With browsers attached**, at a 12 ms gap between samples (see finding 6 before
reading these as absolutes), n = 150, order alternated per iteration:

| arm                                              | p50        | p95    |
| ------------------------------------------------ | ---------- | ------ |
| 1 client subscribed to **518**, real join        | **10.071** | 12.681 |
| 1 client subscribed to 518, **cached** join      | **1.589**  | 2.104  |
| 1 client subscribed to **ONE symbol**, real join | **10.171** | 13.061 |
| 1 client subscribed to one symbol, cached join   | **0.113**  | 0.412  |
| 5 clients (four at 518, one at 25), real join    | 9.238      | 10.585 |
| 5 clients, cached join                           | 4.172      | 5.570  |

**This is the inter-frame work 4.8.2 asked to be attributed, and the answer is
that almost none of the browser-observed gap is server work.** 4.8.2 measured
the gateway's inter-frame gap at **4.4–33.1 ms** and named `scopedTo` plus a
58–59 KiB encode per client as the cause. Measured: that work is **1.59 ms** for
one client subscribed to all 518 and **0.113 ms** for one subscribed to one
symbol — so the 58 KiB body costs about **1.5 ms** to scope, encode and hand to
the socket, and **0.67 ms** per additional client. The remaining ~3–31 ms of
4.8.2's gap is not in `publishObservations`; it is the socket write, the browser's
own receive and the scheduling between them, and 4.8.2's attribution should be
read as naming a 1.5 ms term rather than the whole gap.

And the pair at **one symbol** is what closed a 4.6 ms residue that looked like
an interaction: the arm reads the same ~10 ms whether its client wants 518
symbols or one, so the residue is not the fan-out. It is finding 6.

### 4. Session basis, observed basis, and what the label costs

**Every figure above was taken on both arms**, because the instrument passes
`marketOpen` rather than reading the calendar. So this AC is discharged by
measurement rather than by caveat:

| basis    | `overviewMessage()` p50 | frame bytes | breadth                                                    | movers           |
| -------- | ----------------------- | ----------- | ---------------------------------------------------------- | ---------------- |
| observed | 3.663 / 3.667 ms        | **4,078**   | `advancing 239, declining 242, unchanged 22, measured 503` | 5 up, 5 down     |
| session  | 3.636 / 3.640 ms        | **3,142**   | `advancing 503, declining 0, unchanged 0, measured 503`    | 5 up, **0 down** |

**The observed basis is 0.023–0.027 ms dearer — 0.6%, and the two runs' own
medians differ by 0.004.** So the difference is at the edge of what this
instrument can resolve, and **the basis does not change the price**. Which is
the answer the brief asked for: a reader of these figures out of hours loses
**nothing** quantitative to the label. What they must not do is read the
**shape** across the bases — the session arm's fixture makes every equity an
advancer and fills one list, and a one-sided session-basis frame is **936 bytes
smaller** because every mover row is a `stored` figure.

The reason the price does not move is Task 4.4.4's attribution: 93% of the cost
is `changeFromClose`'s `marketDateAt` calls, which sit **upstream** of
`eligibleMoves`' branch and run on both arms. The brief said so and the
measurement confirms it.

**What an observed-basis arm would need to be taken through the shipped path**
rather than through the instrument: an `asOf` inside a regular session, which
means either the market being open or a seam in `index.ts` that injects
`marketOpen`. The second is shipped code with no consumer but a measurement,
and it was not written.

### 5. The frame's bytes, three states and one correction

| state                                                        | bytes       |
| ------------------------------------------------------------ | ----------- |
| CI's shape — nothing observed, no closes (all 518 `unknown`) | **928**     |
| a real mid-session store, partially heard from (4.8.2's)     | 1,648–1,654 |
| nothing observed but 518 closes held                         | 2,042       |
| **all 518 observed, observed basis** — the worst case        | **4,078**   |
| all 518 observed, session basis                              | 3,142       |

The **928** is measured off the wire by the browser arm and agrees with 4.8.2
exactly. The **4,078** is new and is the ceiling: 4.8.2's 1,650 is a frame from
a store where most of the universe had not been heard from, so the frame grows
by a factor of **2.5** between 4.8.2's condition and a fully-heard-from market.
Anything sized against 1,650 — or against ADR 0038's verbatim **431** — is
sized against a partial market. (Task 4.8.2 owns the 431 correction in
`docs/GAPS.md`; it is deliberately not touched here.)

### 6. THE FINDING: a tight loop is not a cadence, and the control proves it is the machine

The gateway arms read **3.71 ms** with no client and **~10 ms** with one, and
the one-symbol pair above showed it was not the fan-out. The only other
difference between those loops is the **gap**: the zero-client loop was tight
and the others had a 12 ms `await` between samples. Production's gap between
batches is **3.7–8.8 seconds**.

So the join was sampled at five gaps, each sample **paired with a calibrator
sample taken after the same gap**, and screened against **that gap's own**
calibrator median — because the first version of this screened gapped samples
against a tight reference and discarded **79 of 80**, publishing an n = 1. The
calibrator is 4.8.1's: 2,000,000 iterations of `Math.sqrt`, no ICU, no
allocation, no strings. Verbatim:

```text
calibrator reference 1.32 ms (band 1.6x), taken tight at the top of the run

gap 0 ms  local calibrator reference 1.228 ms (0.93x the tight reference)  discarded 3 / 200
  join       p50 3.727 p95 4.002 min 3.532 max 5.498 n 197
  calibrator p50 1.227 p95 1.277 min 1.137 max 1.719 n 197

gap 12 ms  local calibrator reference 1.930 ms (1.47x the tight reference)  discarded 27 / 120
  join       p50 7.646 p95 9.116 min 4.035 max 24.127 n 93
  calibrator p50 2.216 p95 2.652 min 1.221 max 2.813 n 93

gap 250 ms  local calibrator reference 4.016 ms (3.05x the tight reference)  discarded 15 / 80
  join       p50 12.971 p95 18.992 min 6.630 max 25.724 n 65
  calibrator p50 4.114 p95 4.894 min 2.633 max 6.184 n 65

gap 1000 ms  local calibrator reference 3.423 ms (2.60x the tight reference)  discarded 2 / 30
  join       p50 14.107 p95 16.828 min 6.213 max 24.936 n 28
  calibrator p50 3.450 p95 4.288 min 2.300 max 4.753 n 28

gap 4000 ms  local calibrator reference 3.142 ms (2.39x the tight reference)  discarded 1 / 12
  join       p50 13.755 p95 53.147 min 7.243 max 53.147 n 11
  calibrator p50 3.032 p95 4.770 min 2.298 max 4.770 n 11

| gap | join p50 | join p95 | calibrator p50 | join / tight | cal / tight |
| 0 ms | 3.727 | 4.002 | 1.227 | x1.00 | x1.00 |
| 12 ms | 7.646 | 9.116 | 2.216 | x2.05 | x1.81 |
| 250 ms | 12.971 | 18.992 | 4.114 | x3.48 | x3.35 |
| 1000 ms | 14.107 | 16.828 | 3.450 | x3.79 | x2.81 |
| 4000 ms | 13.755 | 53.147 | 3.032 | x3.69 | x2.47 |
```

**Run 2, taken immediately after, with its own reference of 1.14 ms** — the
whole table reproduced, including the tight figure:

```text
| gap | join p50 | join p95 | calibrator p50 | join / tight | cal / tight |
| 0 ms | 3.677 | 3.772 | 1.221 | x1.00 | x1.00 |
| 12 ms | 7.534 | 10.305 | 2.441 | x2.05 | x2.00 |
| 250 ms | 13.815 | 18.095 | 3.997 | x3.76 | x3.27 |
| 1000 ms | 14.541 | 18.170 | 4.476 | x3.95 | x3.67 |
| 4000 ms | 15.428 | 27.649 | 4.225 | x4.20 | x3.46 |
```

**The calibrator inflates by 3.27–3.35× where the join inflates by
3.48–3.76×.** A loop
that does nothing but add square roots — no ICU, no allocation, no strings, no
`Intl` — costs **1.23 ms** in a tight loop and **4.11 ms** when it is called
once every 250 ms, and both runs agree. So:

- **The effect is this machine, not this computation.** It is consistent with a
  process that has just woken from idle being scheduled on an efficiency core
  or at a low clock on Apple silicon, but that cause is **not established** here
  — what is established is that a fixed-cost control moves with it.
- **The relative figures in this epic are safe.** 4.4.4's 3.497, 4.5.4's
  marginal 0.28–0.41, this task's 3.72 and 0.118 are all tight-loop figures
  taken against tight-loop controls, and the attributions they carry stand.
- **No absolute figure in this epic is a measurement of production cost.** At
  the gap production actually runs this computation at, the same join reads
  **12.97–14.11 ms** on this machine. Whether a deployed Container App on a
  shared vCPU behaves the same way is **unknown and unmeasurable from here**,
  and it is a question with a 50 ms budget attached to it.
- **The method generalises past this task**: a measurement of anything that runs
  once every few seconds, taken in a tight loop, understates it by a factor this
  machine will not tell you unless a fixed-cost control is sampled at the same
  gap. `pnpm instrument:prove`'s calibrator was built to detect **contention**;
  this is a second thing it detects, and the two look identical in a terminal.

**Handed to Task 4.8.8 as the figure its verdict turns on, and to Task 4.8.10
for §28.** It is not repaired here because there is nothing to repair: the
product is not slower than it was this morning, and what changed is what we
know about the number.

### 7. Three things found in shipped code, reported rather than repaired

**a. `computedAt` is not the instant anybody thinks it is.** The producer is
unmemoised and the gateway reaches it on connect and on subscribe, so the frame
a cold load is answered with is computed **now** over observations that may be
hours old. On a dead feed `OverviewSourceNote`'s `COMPUTED hh:mm` therefore
reads **the minute the reader opened the page**. ADR 0038 anticipated exactly
this — _"it advances whenever somebody opens a tab, with no market data behind
it"_ — and drew the conclusion that it must never reach `feed-liveness.ts`; what
nobody wrote down is that it reaches a **drawn sentence**. Two live docblocks
claimed the figures and the instant were _"frozen between bursts"_ and both are
amended; choosing between a per-frame instant and a _data as of_ instant is a
product decision and is not taken here.

**b. A tab opened at 09:30:01 can set the sector ladder's rung for the
session.** `sectorLadderStep` runs inside the producer, so it runs on every
connect and every subscribe — and before any sector ETF has a live bar, all
eleven are `stored` figures whose `sessionChangePercent` `fitSectorLadder`
reads through `moveRankingKey`. So the new session's rung can be set from **the
previous session's close-to-close moves**, with no market data behind it: the
day after a ±5% session draws its sector bars at the wide rung all morning.
That is a different case from the thin-pre-market one `sector-ladder-ratchet.ts`
argues against, and it was never argued. Noted in that file, handed to Story
4.9.

**c. The server-side ratchet decision is strengthened, not weakened.** Every one
of the extra per-connect computations steps the **same** cell, so the rung stays
one value every reader shares — which is the asymmetry that put the ratchet on
the server in the first place.

### 8. The _does not scale with connections_ claim — five live sites, corrected

Verified with two greps, over `*.md`, `*.ts`, `*.tsx` and `*.mjs`:

```text
grep -rn "scale with connections"                 -> 4 hits (3 of them this story's own task files)
grep -rn -e "once per applied batch" \
        -e "once for every browser" \
        -e "one computation for every browser"     -> 13 hits
```

**Seventeen occurrences, eleven distinct claim sites.** Five were live and are
corrected; six are historical and are left standing, which is `CLAUDE.md`'s own
rule.

| site                                                           | live?         | what was done                                                                                                        |
| -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/market-gateway.ts` — `overviewMessage`       | **live**      | amended: one encode site is not one computation, and the three callers are **three joins**, with the counts          |
| `apps/backend/src/market-overview.ts` — `buildMarketOverview`  | **live**      | amended: one call **site** is not one call; the figures and where they came from                                     |
| `packages/shared/src/market-stream-protocol.ts` — `computedAt` | **live**      | amended: built per batch **and** per connect **and** per subscribe; what the instant means on a dead feed            |
| `apps/frontend/.../overview-source-note.ts` — `COMPUTED`       | **live**      | amended: on a dead feed this line reads when the **reader** opened the page                                          |
| `scripts/check-invariants.mjs` — the invariant's `claim`       | **live**      | reworded: it certifies one **place** the join is written, not one computation                                        |
| `apps/backend/src/sector-ladder-ratchet.ts`                    | **live**      | amended, and the decision it supports **survives** — see 7c                                                          |
| `planning/.../story-08/STORY.md` — Story 4.2's hand-off, #1    | **live**      | the clause struck through with the measurement beside it; Gate 1's falsification 3 cross-referenced                  |
| `docs/adr/0038-...md` — decision 3                             | already right | it already says _"and on connect and on subscribe"_ and makes **no** cost claim. Untouched; ADRs are not rewritten   |
| Story 4.1 `STORY.md`'s decision table, Story 4.3 `TASK-04` ×2  | historical    | left standing                                                                                                        |
| Story 4.4 `STORY.md` #2, Story 4.7 `STORY.md` #2               | historical    | left standing — they are hand-offs to stories that have shipped, and their **live** home is the two code sites above |
| Story 4.2 `TASK-04` AC 6                                       | already right | _"sent once per applied batch, on connect and on subscribe"_ — correct about the frame                               |

**The half of the claim that survives**, stated so the next reader does not
over-correct: the _payload_ is identical for every browser, it is _encoded_
once per batch outside the per-client loop, and the **broadcast** does not scale
with connections. It is the **computation behind it** that does, at 3n joins for
n browsers opening `/`.

### No check was added, and that is a decision

Nothing here is a claim a grep can hold. The counts are facts about a call graph
that `one-producer-of-the-overview-aggregate` already pins to one site, and the
figures are measurements. A guard saying _the producer is memoised_ would be a
guard on a repair nobody has bought; a guard saying _the gateway calls it three
times_ would freeze a defect. **So no `scripts/breaks.mjs` entry is owed**, and
the three instruments are deleted rather than kept, per `ALPACA.md` §11 — with
at least one frame, row or table quoted verbatim above from each of them.

### The gates, and a FOURTH flake found by running them

`pnpm verify` — **green, exit 0**, with no `Unhandled Errors` block:

```text
$ node scripts/check-quiet.mjs && pnpm run build && pnpm run lint && pnpm run format:check && pnpm run stories && pnpm run env:check && pnpm run links && pnpm run invariants && pnpm run coverage:check && pnpm run test && pnpm run test:process
42 components, 42 stories files.
513 documents, 1702 cross-file links, 39 anchor links, 0 broken.
49 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:       Tests  331 passed
apps/backend test:          Tests  1025 passed (1025)
apps/frontend test:         Tests  1392 passed (1392)
apps/backend test:process:  Tests  41 passed (41)
```

**`pnpm test:database` and `pnpm e2e` were not run**, and the reason is in the
diff: nothing in it is executable. All five code changes are docblocks and one
invariant's `claim` **string** — no query, no schema, no layout, no markup, no
behaviour. The gates that could fail on a comment are `build`, `lint`,
`format:check` and `links`, and all four ran.

**And the first `pnpm verify` of this task failed, on a flake nothing in this
repository had recorded.** `index.process.test.ts > says goodbye to a browser
BEFORE closing its socket`:

```text
AssertionError: expected 13 to be greater than 18
 ❯ src/index.process.test.ts:1004:21
    1003|     expect(gateway).toBeGreaterThanOrEqual(0);
    1004|     expect(drained).toBeGreaterThan(gateway);
```

`http drained` at log line **13** and `market gateway closed` at **18** — the
shutdown's two markers in the wrong order. It was taken immediately after this
task's own measurement work, so the machine was warm rather than settled;
**three scoped re-runs and three whole `pnpm verify` runs after it all passed**.
Not attributed, not repaired, and **not** waved away: it is a fourth flake
beside the three Task 4.8.9 is chartered to characterise, it is in
`test:process` rather than in the browser suite, and the assertion it fails is
an **ordering** one on log-line indices — the shape `CLAUDE.md` already warns
about (_"a marker travels with its step"_). **Handed to Task 4.8.9** with the
one figure available: 1 failure in 4 executions of the whole gate, under load.

## Done when

1. **Met.** 3.663 / 3.667 ms a batch, interleaved control 3.545 / 3.544,
   n = 400 after 300 warm-up, two runs, calibrator discards 3 and 6 of 400,
   maxima marked unusable with the 9–19 ms spread that proves it. The control
   reproduces Story 4.4.4's 3.497 ms to 1.4%.
2. **Met.** 1 per connect, 1 per readable subscribe (including a zero-symbol
   one and an identical re-assert), counted against the real gateway **and** off
   the wire by a real browser: **3** per cold load of `/`, 3 of
   `/securities/:symbol`, **2** of `/investigations`. Priced at 11.2 ms, 11.2 ms
   and 7.4 ms. The resubscribe is priced at one join; its **rate** is recorded
   as unmeasured with a condition — Task 4.8.4's furnished socket.
3. **Met.** 3.708 ms p50 with zero clients attached, against a cached-overview
   control of 0.013 ms which says all of it is the join; and 25–60 ms of script
   a minute on an idle deployment with nobody looking.
4. **Met, and exceeded by measuring both arms rather than labelling one.**
   Session basis 3.636 / 3.640 ms against observed 3.663 / 3.667 — the observed
   arm is **0.6% dearer**, inside the run-to-run spread, because 93% of the cost
   is upstream of the branch.
5. **Met.** Five live sites corrected, six historical left standing, counted by
   grep and tabulated above.

## Handed on

**Written into each sibling's own task file, not linked from here** —
`CLAUDE.md`'s sideways-sweep rule: a pointer is what a reader follows when they
already know to look, and the whole failure is that they do not. **Six files
gained a `Handed here by Task 4.8.3` section** (4.8.4, 4.8.5, 4.8.6, 4.8.7,
4.8.8, 4.8.10) and a seventh gained a flake (4.8.9). The summary below is the
index, and each sibling's own file carries the figures it can act on.

- **Task 4.8.4** — the resubscribe rate on `/` is yours; the gateway side costs
  one join (3.72 ms tight) per substitution and the cadence floor to beat is
  6.8 a minute. And **your figures are gap-sensitive**: sample a fixed-cost
  control at the same cadence you drive the socket at, or a slow frame will look
  like the product.
- **Task 4.8.5** — the chart's rebuild is on the `bars` path, and the per-client
  half of `publishObservations` is **1.59 ms** at 518 subscribed and **0.113 ms**
  at one symbol, so the server is not where a per-tick chart cost comes from.
- **Task 4.8.6** — a cold load of `/` costs **three** server joins before the
  first paint, two of them answering questions the browser did not ask with
  content (an empty subscribe and a connect with an empty subscription). On CI's
  bare store each is 0.056 ms, so this is invisible to every gated run.
- **Task 4.8.7** — `marketDateAt` is **93%** of a 3.44 ms join (3.44 against
  0.013 with nothing observed and 0.019 with no closes, Task 4.4.4's figures
  reproduced), and the join runs **3n + batches** times rather than once a
  batch, so the parts-read repair is worth proportionally more than the per-batch
  figure alone suggests.
- **Task 4.8.8** — finding 6 is the one that decides the verdict: the trigger's
  clause B arithmetic (_"~1.29 s of script a minute"_) was computed from a
  tight-loop figure, and at the gap production runs this at the same join reads
  3.5× more on this machine. The idle-deployment join (25–60 ms a minute with
  nobody attached) is a second, cheaper candidate with a one-line guard.
- **Task 4.8.10** — §28's sweep inherits three corrections: the frame's ceiling
  is **4,078 bytes** rather than 1,650; the backend leg per batch is **3.72 ms**
  tight and ~13 ms at cadence; and every absolute figure in this epic needs the
  tight-loop caveat beside it.

## Handed here by Task 4.8.1 — 2026-10-09: the harness exists, is proved, and three of your premises about HOW to run it are now different

**Everything below was measured in Task 4.8.1's own proof run; its transcript
is in that file.**

- **Use `scripts/overview-instrument.mjs`.** `startProductionPair()` builds its
  own artefact (`vite build` is **0.6–0.7 s** on rolldown) into
  `.capture/instrument/dist` and serves it on **:4273** with the backend on
  **:3100**, so it runs **beside a running `pnpm dev`** rather than instead of
  it. It asserts the production fingerprint off the wire and prints
  `PRODUCTION BUILD` with the bundle name and size.
- **The 3.6.4/3.6.5 recipe is unsafe as written.** `MARKET_DATA_PROVIDER=fixture`
  against `DATABASE_NAME=marketpulse` makes Story 3.8's live bar writer store
  **invented minute bars in the developer's own store**, 518 a minute. The
  harness defaults the provider to `none` and **refuses** a stream against
  `marketpulse`; name a scratch store (`pnpm store:bare` builds
  `marketpulse_bare`, which is also CI's shape).
- **The load ceiling is ratio 1.0 and it exits non-zero.** `--ceiling <ratio>`
  raises it and the raise is printed in the transcript. It refused twice for
  real during 4.8.1, because a previous run's planted spinners had not decayed
  out of the one-minute average — allow **60–90 s** between runs.
- **Load average alone is not something a browser can feel.** 24 spinning Node
  processes on 8 cores — Story 4.5's measured 23–33 exactly — moved this page's
  calibrator **not at all** (1.2 ms quiet, 1.2 ms loaded). What moved it was
  eight blocked **renderer** processes. So do not read a quiet load average as
  a quiet machine, and do read the calibrator's discard count.
- **The calibrator discriminates at the tail, not the median**: quiet
  `p50 1.2 / p95 1.3 / max 1.5`, loaded `p50 1.3 / p95 2.6 / max 9.7`. Discards
  were **0 / 120** quiet and **24 / 120** loaded. Report the discard count with
  every figure.
- **Four channels are proved and one is new.** The long-frame observer
  (self-test tagged and excluded, then a 180 ms plant caught in the acceptance
  channel), the continuous rAF-gap recorder, **a script clock per burst** — the
  remainder of the delivering task, via a `MessageChannel`, which is the one
  figure LoAF structurally cannot give because it has no entry below 50 ms —
  and a commit counter on `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`,
  which production React does call (**16 → 27** on a planted route change).
- **The repaint stamp on `/` is `main`, measured.** Six quiet seconds gave
  **6 mutation records on `body` and 0 on `main`** — the masthead clock and the
  status bar are outside `<main>`. There is **no fallback**: an absent target
  reports nothing, and `distribution()` returns `null` rather than zero
  everywhere.
- **`document.visibilityState` is asserted on every page the harness opens**,
  and the socket wrapper carries `wrapperIntact` — if Playwright's own
  `WebSocket` replaces it, the arm reports nothing rather than n = 0.
