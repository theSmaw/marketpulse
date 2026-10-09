# Task 4.8.4 — The browser leg on `/`, at a cadence that is set rather than assumed

**Status:** **Complete — 2026-10-09.** **3.7–5.1 ms of main-thread work a batch on `/`**, net of a quiet control driven at the same cadence, of which the aggregate is **2.8–3.9 ms** — **25–82 ms a minute** at the measured 6.8–16.1 batches a minute, with **zero `longtask` entries and no dropped animation frame in any of seven arms**, so §28's routine 50 ms line is met with a factor of twenty to spare. The MDE was stated before the arms ran and **beaten in the conservative direction**, because Task 4.8.3's idle-wake inflation — the floor that set it — **does not reproduce in a visible renderer**: the same calibrator reads **×1.00** at gaps of 3.7 s and 8.8 s where it reads ×2.4–3.5 in Node. The frame is **3,990–4,002 B** in a browser against 4.8.3's 4,078 B ceiling; `431 bytes`, `6.9 KiB/min` and `12% on top` are corrected at three live sites with one historical site left standing. Two instrument defects produced and one repaired in the shared harness.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1, 4.8.2

## Objective

**The cost this story owns is ~16 whole-tree renders a minute, and no feed this
repository can run offline produces that cadence.**

## What the user can see when this lands

**Nothing, and the absence of a stutter once a minute is the point.**

## Work

### Why the obvious recipe measures 1/16 of the effect

The fixture ticks at `tickEveryMs = 60_000`; the replay _"emits one slice per
minute across every symbol"_ and **cannot express a split minute at all**, by
its own comment. The real feed is **8.8–16.1 batches a minute**. So a reader
following Task 3.6.5's recipe gets a comfortable green at **one sixteenth** of
the real render count — the exact inverse of 3.6.4's _the fixture is the harsher
feed_, which was true of payload and is false of cadence.

### The owner's Gate 1 decision: the furnished socket, local only

`serveFeed` / Playwright's `routeWebSocket` is **the only mechanism that can
set cadence AND composition freely**, and the only one that gives a true
control arm — `bars` only against `bars` + `overview` — without editing shipped
code. It certifies stages 9 and 10 (decode, render, paint) exactly and the
backend not at all, which is 4.8.3's job.

**It runs locally and never against a deployed page.** The standing rule is
that replayed or synthetic data must never reach the deployed site, and
`e2e:deployed` plus `routeWebSocket` would put furnished frames in front of a
deployed page in one browser context — honest for a measurement, and exactly
the shape a reader mistakes for a product state in a screenshot. **Do not take
that arm.**

### A browser on `/` subscribes to ~25 symbols, not 518

`symbolKey` is four proxies + eleven sectors + ten movers. **So "the whole
universe arriving" is not a state this route has**, and the arm must say what
it actually drives: one 431-byte-plus `overview` frame and a `bars` frame
scoped to ~25 observations, at the stated cadence.

### State the minimum detectable effect BEFORE running an arm

Task 4.5.8 measured the whole movers tick at **p50 0.3 ms of script, worst
frame 18.6 ms, zero `longtask` entries in both arms**, and recorded that it
**cannot see a regression smaller than a millisecond**. A proved LoAF observer
on `/` will correctly report zero and certify nothing. **If the MDE exceeds the
effect sought, say the measurement cannot answer the question** — that is the
honest close, and 4.5.8 set the precedent.

### Also take the frame's real size

`431 bytes` is the **four-proxy** frame. It has since gained eleven sectors,
breadth (+6–8 bytes) and movers (**1,243 bytes measured**). The
`6.9 KiB/min` and `12% on top` figures in this story and in `docs/GAPS.md` are
arithmetic on the 431. Re-take it.

## Done when

1. Per-tick script and worst animation frame on `/`, production build, at a
   **stated, driven** cadence with the control arm beside it
2. The MDE stated before the arm ran, and compared with the effect sought
3. The overview frame's real size measured, and the two derived byte figures
   corrected where they are live
4. The cadence's provenance recorded: what drove it, and that no offline feed
   reproduces it

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

## Handed here by Task 4.8.3 — 2026-10-09

**The resubscribe rate on `/` is yours, and the gateway side is already
priced.** One mover substitution is one resubscribe is **one full 518-join** —
the listener does not compare, so an _identical_ subscription re-asserted costs
one too, measured against the real gateway. At the tight-loop figure that is
**3.72 ms** each, on top of the batch that caused it, and the cadence to beat is
the measured midday floor of **6.8 batches a minute**: the route's own comment
names _"the point at which the resubscribes overtake the gateway's own cadence"_
and that point is 6.8 membership changes a minute across the two five-row lists.
Task 4.8.3 could not produce a substitution at all without a feed; **your
furnished socket is the first instrument that can**, so the rate is yours by
condition rather than by preference.

**And a warning about your own figures that is bigger than the product.** Task
4.8.3 measured the same computation at **3.73 ms** in a tight loop and
**12.97–15.43 ms** when called once every 250 ms or more — and a fixed-cost
control loop with no ICU, no allocation and no strings moved by the **same
factor** (×3.3 against the join's ×3.5–3.8), so the effect is this machine
waking from idle rather than the computation. **Sample a fixed-cost control at
the cadence you drive the socket at**, or a frame that arrives once every four
seconds will read three times its tight-loop cost and look like a regression.
The paired-calibrator shape that catches it is in 4.8.3's finding 6: take the
band at the gap, not at the top of the run, or you will discard 79 of 80 honest
samples.

---

## The minimum detectable effect, STATED BEFORE THE ARMS RAN — 2026-10-09

**Written down and committed to before a single arm was driven**, which is
Done-when 2 and 4.5.8's precedent. Everything in this section is a prediction;
the section after it is the reading.

### Four floors, each from somebody's measurement rather than from argument

1. **Quantisation: 0.1 ms.** `performance.now()` is clamped to 100 µs in a page
   that is not cross-origin-isolated, so a sub-0.1 ms effect is unreadable at
   any n. Task 4.8.1 met this from the other side when a 200,000-iteration
   calibrator read `{p50 0.2, p95 0.3, max 0.4, min 0}`.
2. **Gap-driven inflation: ~1.5 ms.** Task 4.8.3's finding 6 sampled a
   fixed-cost `Math.sqrt` loop — no ICU, no allocation, no strings — at five
   gaps in two runs: `1.14–1.32 ms` tight against **3.03–4.48 ms** at gaps of
   250–4,000 ms. The two runs' own medians at one nominal gap differ by
   **1.45 ms**. **This cadence is a frame every 3,727–8,824 ms, which is past
   the far end of that curve**, so 1.45 ms is the floor on any _absolute_
   per-batch figure here, and it is a floor the n cannot buy down because it is
   a property of the machine's state rather than of the sample.
3. **n: 8 batches at midday, 14 at the close**, per arm — set by the cadence
   and a run that has to fit in one sitting. At that spread the median's
   resolution is ~0.5 ms **if the samples were independent**, which the effect
   in (2) says they are not.
4. **The two frame channels are structurally coarse.** The rAF-gap recorder
   resolves one frame quantum, **16.7 ms**; `longtask` has **no entry below
   50 ms**, which is 4.8.1's founding sentence and the reason zero-observed and
   observer-broken are one output.

### So the MDE, stated

| question                                      | MDE                                                         |
| --------------------------------------------- | ----------------------------------------------------------- |
| per-batch script, **absolute**                | **±1.5 ms**                                                 |
| per-batch script, **one arm against another** | **~1.5 ms**                                                 |
| a dropped animation frame                     | **16.7 ms**                                                 |
| a main-thread task over §28's routine line    | **50 ms**, and it is the question the channel was built for |

### And the effect sought, beside it

The effect sought is **the overview frame's own cost in a browser, per batch**.
The prior is Task 4.5.8: the whole movers tick on this screen measured **p50
0.3 ms of script with zero `longtask` entries in both arms**, and that task
recorded that it cannot see a regression smaller than a millisecond. A 4 KiB
JSON parse plus a reducer plus a whole-tree render over ~25 rows should land
somewhere in **0.3–3 ms**.

**Prediction, recorded in advance:** the MDE **straddles** the effect. This
measurement will be able to answer _does the tick on `/` breach §28's routine
50 ms line_ with two orders of magnitude of headroom, and will **not** be able
to resolve the overview frame's marginal cost against the `bars`-only control
to better than ~1.5 ms. If the arms come back inside that band, the honest
close is that the measurement cannot answer the question — which is 4.5.8's
close, and it is not a failure of the instrument.

---

## What was done — 2026-10-09

**Status:** Complete. **No shipped code changed.** One throwaway instrument
written, run and **deleted** (`scripts/browser-leg.mjs`); one defect repaired in
the shared harness; one byte figure re-taken and corrected at three live sites
with one historical site left standing by decision.

### The answer, in one table

Per batch on `/`, 1440×900, production build, furnished socket, **net of a
quiet control arm driven at the same cadence** — which is what makes these the
batch's own cost rather than the batch plus `useMarketClock`.

| cadence                  | batches | quiet (background) | `bars` only | `overview`+`bars` | **the batch's own cost** | the overview's marginal share |
| ------------------------ | ------- | ------------------ | ----------- | ----------------- | ------------------------ | ----------------------------- |
| **6.8/min** (midday)     | 8       | 2.8 ms             | 4.0 ms      | **7.9 ms**        | **5.1 ms**               | **3.9 ms**                    |
| **16.1/min** (the close) | 14      | 1.2 ms             | 2.1 ms      | **4.9 ms**        | **3.7 ms**               | **2.8 ms**                    |

**The two cadences agree to within 1.4 ms, which is inside the 1.5 ms MDE
stated before either ran.** So the reading is **3.7–5.1 ms of main-thread work
a batch**, of which the aggregate is **2.8–3.9 ms** — and at the cadence,
**25–82 ms a minute**.

**And §28's line is met with a factor of twenty to spare.** §28's word is
_task_, not _minute_:

| channel                         | every arm, including the substitution arm                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| `longtask` entries (acceptance) | **0**, in all seven arms                                                    |
| worst rAF gap                   | **17.7–17.8 ms**, against a 16.7 ms quantum — **no dropped frame anywhere** |
| rAF gaps sampled                | 3,335–3,999 per arm, p50 **16.7**, p95 17.2–17.5                            |
| largest single React task       | **2.5 ms** (`renderTaskMs.perTask.max`)                                     |
| largest single delivery task    | **4.5 ms**                                                                  |

**The calibrator ratio beside every figure is ×1.00** — see the finding below,
which is the one that matters more than the figures.

### The decomposition, and one residue left unattributed

Three channels read the same batch and they do not sum, which is the honest
part:

| leg                                          | midday      | the close | channel                          |
| -------------------------------------------- | ----------- | --------- | -------------------------------- |
| decode + reducer, the **`overview`** frame   | 0.4 ms      | 0.3 ms    | 3 (script clock, per burst)      |
| decode + reducer, the **`bars`** frame alone | 0.2 ms      | 0.1 ms    | 3, in the `bars`-only arm        |
| React render + commit, per batch             | ~0.3–1.2 ms | ~0.8 ms   | this file's own, proved at 70 ms |
| **residue**                                  | **~2–3 ms** | **~2 ms** | the difference                   |

**The residue appears only when the DOM changes**, and that is the evidence for
what it is. In the `bars`-only arm `main`'s text is **unchanged byte for byte**
over the whole arm (`mainChanged: false`, both cadences) and the `bars` frame's
own delivery figure is **0.1–0.2 ms**; in the `overview`+`bars` arm the same
`bars` frame reads **2.4–3.4 ms**. Channel 3 measures the **elapsed** time from
a frame's arrival to its `MessageChannel` message running, so any work the
browser does in between lands in it — and the work available is the style,
layout and paint of the aggregate's own commit, which the `bars`-only arm never
triggers. **It is reported as a residue with its evidence and not as a proved
attribution**, which is 4.8.2's rule for its fourth commit.

**So `scriptPerBatchMs` in the transcript is per-batch MAIN-THREAD WORK, not
script**, and it double-counts anything that elapsed between the two frames.
Named rather than corrected, because the figure it feeds — is there a task over
50 ms — is answered by two channels that cannot double-count: `longtask` (zero)
and the rAF gap (never a dropped frame).

### `/` draws NOTHING from the `bars` frames it subscribes to

**Measured, and it was not expected.** On both cadences, an arm that sent only
`bars` frames to 25 subscribed symbols — with prices that moved every batch —
left `<main>`'s text **identical**, while the `overview` arm's first difference
is `SPY 764.29 +1.52%` → `SPY 764.90 +1.60%`. Every figure on this screen comes
from the aggregate; the subscription exists so that the arrival mark can fire.

That has a consequence for Story 4.9 and for 4.8.6: the route's **~25-symbol
subscription costs 0.9–1.2 ms a batch in the browser and one `bars` frame of
~3,000 B**, and the only thing it buys is the mark. It is not a repair
recommendation — the mark is a shipped design decision with a canvas section
behind it — it is the price of it, measured for the first time.

### The resubscribe rate, which Task 4.8.3 handed here

**One mover substitution a batch, at the close's cadence, driven through the
shipped path** — a membership change in `symbolKey`, the effect resubscribing,
and the gateway's own answer of a snapshot **and** another aggregate
(`sendSnapshot`'s two sends, with no `await` between them). The arm's own
counters prove it ran: **15 subscribes** for 14 batches, and **28 `overview`
frames** for 14 driven ones.

| at 16.1 batches a minute      | script/batch p50 | commits/interval |
| ----------------------------- | ---------------- | ---------------- |
| `overview`+`bars`             | 4.9 ms           | 5                |
| the same, **+1 substitution** | **7.6 ms**       | **7**            |

**+2.7 ms and +2 commits per substitution, in the browser** — and the +2
reproduces Task 4.8.2's count exactly, from a different instrument. At the
measured membership rate of **0.21–0.45 a minute** (`MarketOverview.tsx`'s own
three-session instrument) that is **0.6–1.2 ms a minute**, against the
3.72 ms-per-substitution the gateway pays. **The route's reversal trigger is
nowhere near**: it fires at ~4 membership changes a minute sustained, and this
arm drove **16.1 a minute** — 38× the measured rate — and still cost 7.6 ms a
batch with zero long tasks and no dropped frames.

### THE FINDING: Task 4.8.3's idle-wake inflation does NOT reproduce in a renderer

**This is the one to carry forward, because it was handed here as a warning and
it is false of this arm.** Task 4.8.3 measured a fixed-cost `Math.sqrt` loop —
no ICU, no allocation, no strings — at **1.23 ms tight and 4.11 ms at a 250 ms
gap** in a **Node** process, reproduced across two runs, and handed this task
the instruction to sample a control at the cadence or publish a figure three
times its true cost.

**Sampled at the cadence in a Chromium renderer, the same calibrator does not
move at all.** 2,000,000 iterations, JIT-warmed 12 times, one sample beside
every burst so the sampling gap **is** the batch gap:

| arm                         | gap      | tight p50 | at-the-gap p50 | ratio     | discarded  |
| --------------------------- | -------- | --------- | -------------- | --------- | ---------- |
| midday / `overview`+`bars`  | 8,824 ms | 1.2 ms    | 1.2 ms         | **×1.00** | 1 / 8      |
| midday / `bars` only        | 8,824 ms | 1.2 ms    | 1.3 ms         | ×1.08     | 2 / 8      |
| close / `overview`+`bars`   | 3,727 ms | 1.2 ms    | 1.2 ms         | **×1.00** | 2 / 14     |
| close / `bars` only         | 3,727 ms | 1.2 ms    | 1.2 ms         | ×1.00     | 3 / 14     |
| close / with a substitution | 3,727 ms | 1.2 ms    | 1.2 ms         | ×1.00     | **0 / 14** |

**At gaps twice to thirty-five times the gap that inflated the Node figure
3.3×, the renderer's figure is unchanged.** That is consistent with Task
4.8.1's other finding — macOS keeps scheduling a foreground renderer at
user-interactive QoS whatever a terminal's children are doing — and the two
findings now bracket the effect: **it is a property of a Node process waking
from idle, not of this machine, and not of a browser tab that is visible.**

**What that changes:** 4.8.3's caveat _"no absolute figure in this epic is a
measurement of production cost"_ holds for every **backend** figure and should
**not** be carried onto the browser ones. The browser figures in this task are
absolute, on this machine, with a flat control beside each of them.

**And it is why this measurement could answer the question the pre-registered
MDE said it could not.** The ±1.5 ms floor was built from 4.8.3's run-to-run
calibrator spread at a gap; with the ratio at ×1.00 that floor does not apply
here, the MDE collapses to the 0.1 ms quantisation and the n, and a 2.8–3.9 ms
marginal effect is comfortably above it. **The prediction was wrong in the
conservative direction and the reason is a measurement rather than a
rationalisation** — which is the only acceptable way for a pre-registered MDE
to be beaten.

### The cadence's provenance, and that no offline feed reproduces it

Done-when 4, stated rather than implied.

- **The figures are `LIVE-DATA.md` §9.5/§10.2**: 332 bars in **8.8 frames a
  minute** at the open, 284 in **6.8** at midday, 450 in **16.1** at the close,
  read off a real IEX socket. Both ends of the range were driven here; the task
  brief's own `8.8` was the wrong floor and the floor is **6.8**, which Task
  4.8.2 corrected at three live sites.
- **What drove it here**: `page.routeWebSocket`, with the send scheduled to a
  wall-clock phase of **400 ms** at intervals of **8,824 ms** and **3,727 ms**
  — Gate 1's decision, and the only mechanism offline that can set cadence and
  composition and still give a true `bars`-only control arm.
- **No offline feed reproduces it.** `createFixtureStream` ticks at
  `tickEveryMs = 60_000`; the replay _"emits one slice per minute across every
  symbol"_ and **cannot express a split minute at all**, by its own comment. A
  reader following Task 3.6.5's recipe measures **one sixteenth** of the render
  count — and would also have measured the quiet control's background as part
  of the batch, because at one batch a minute the two are inseparable.
- **Local only, and no deployed arm was taken.** Furnished frames must never
  reach a deployed page.
- **What it does NOT certify**: the inter-frame gap. 4.8.2 measured
  **0.4–6.6 ms** here against the real gateway's **4.4–33.1 ms**, and the gap
  is what decides whether React coalesces the two `setView` calls. So every
  **commit count** in this task's transcript is the furnished socket's and not
  the product's; 4.8.2 owns that figure (**2** per batch) and this task's
  `commitsPerBatch` column is reported as an interval total — it covers the
  whole 3.7 s or 8.8 s since the previous drain, so most of it is
  `useMarketClock` at 1 Hz, which is exactly what the quiet arm prices.

### The frame's real size, re-taken

| state                                                             | bytes           | instrument                                                   |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| CI's shape — nothing observed, no closes (518 `unknown`)          | **928**         | 4.8.2 and 4.8.3, off the wire                                |
| a partially-heard-from store (4.8.2's)                            | 1,648–1,654     | 4.8.2, the real gateway                                      |
| 518 closes held, nothing observed                                 | 2,042           | 4.8.3, the real producer                                     |
| all 518 observed, **session** basis                               | 3,142           | 4.8.3                                                        |
| **all 518 observed, observed basis — the ceiling**                | **4,078**       | 4.8.3                                                        |
| the same composition, built with the shipped encoder in a browser | **3,990–4,002** | **this task**, read off the page's own socket wrapper by URL |

**The browser's reading corroborates the ceiling to within 2%**, and the 2% is
accounted for: the real store's prices and sessions carry digits a fixture does
not.

**One byte finding came out of building it.** The first furnished frame read
**3,652 B** and the only difference was that its percentages were rounded to
two decimals. `changePercent` in `packages/shared/src/live-change.ts` is
`((close − previous) / previous) × 100` and **nothing rounds it**, so a real
figure carries a 16-digit float — `1.6244720133889459` — where a fixture
carries `1.62`. That is **~13 bytes a figure and ~350 bytes a frame, 9% of
it**, and it means **any frame sized from a hand-written fixture is small**.
It is also a live candidate: rounding the wire figure to the
`PERCENT_DISPLAY_DECIMALS` the screen draws would take ~350 B off every
aggregate and every `bars`-adjacent figure, which is a **wire change and a
product decision** (a consumer that re-ranks needs the precision), so it is
**recorded and not taken** — handed to Story 4.9 beside the frame-composition
question.

**And the `bars` frame on `/` is ~3,000 B at 25 subscribed** (2,998–3,001
measured, 1,828 at the 15 the page falls back to when the movers section is
dropped), against 4.8.2's 1,762–1,811 at 15. So a full batch on `/` is
**~7.1 KiB**, and the aggregate is the **larger half** of it.

### The three live sites corrected, and the one left standing

| file                                       | what it said                                                                           | what it says now                                                                                                                                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/GAPS.md`                             | `431 bytes × ~16 a minute ≈ 6.9 KiB/min`, `12% on top`, `3× a one-symbol page`         | struck; the five measured states, **27.1 KiB/min** at 6.8 and **64.1 KiB/min** at 16.1, **6.9%** on top of a 518-subscribed client, and the one-symbol comparison withdrawn for having no subject                                                    |
| `.../story-08-…/STORY.md`                  | the same sentence                                                                      | struck and corrected, pointing at `docs/GAPS.md`                                                                                                                                                                                                     |
| `docs/adr/0038-…md`                        | _"Verbatim off the local gateway against the real store, **431 bytes**"_               | **unchanged, with a dated amendment beside it** — an ADR's verbatim record is not rewritten, and the amendment says the figure must not be used to size anything                                                                                     |
| `.../story-03-sector-performance/STORY.md` | a frame-grain table whose first row is `proxies (today) 431 B → 6.9 KiB/min, measured` | **left standing, by decision.** It is shaping text addressed to a story that has shipped, and it was **true when written** — the four-proxy frame really was 431 B and the cadence really was ~16 a minute. Amend live claims, leave historical ones |

**The 12% was wrong for a reason worth keeping:** it divided a **per-batch**
aggregate by `56.9 KiB`, which is the universe `bars` payload **a minute** —
i.e. Gate 1's falsified premise 2 (the fixture's one-batch-a-minute cadence)
hiding inside an arithmetic. The `56.9 KiB`-a-minute family is **eleven
places** by Task 3.5.8's own count and is deliberately still uncorrected; it is
named for Task 4.8.10's sweep.

### Two defects produced by this task's own instruments

Both are the shape `CLAUDE.md` warns about — a mechanism that reads identically
whether it is working or not.

**1. An own `onmessage` accessor silently disables the port.** This file's
scheduler probe wrapped `MessageChannel` and defined an own `onmessage`
property on each port, storing the handler in a closure. An own accessor
**shadows `MessagePort.prototype`'s**, so the handler never reached the port's
native sink: **React's scheduler never ran, the page rendered nothing, and no
error was raised anywhere.** The arm sat waiting 25 s for a subscription that
could not come, with `pageErrors: []`. The repair is to forward to the
prototype's own setter. The transferable rule: **wrapping an event-handler
property means forwarding to the native descriptor, never storing the
handler.**

**2. A signal handler that re-raises must remove itself first — repaired in
`scripts/overview-instrument.mjs`.** `startProductionPair`'s teardown does
`process.kill(process.pid, signal)` with the listener still installed, which
re-enters the handler, which re-raises. A single `SIGTERM` to a harness run
produced a process **spinning at 100% of a core that only `SIGKILL` could
end**, still holding both child ports — so the next run refused its own
addresses and read as a configuration fault. Found by sending one. The
handler now calls `process.off` before re-raising. **Every task after 4.8.1
uses this harness**, which is why it was repaired rather than reported.

**And one shipped guard caught a bad fixture, which is the happy version of the
same lesson.** The first run read `subscribes: [0, 25, 15, 25, 15, 25]` — the
page flapping between 25 symbols and 15 (four proxies plus eleven sectors, no
movers). The cause was in the fixture: a flat ±0.40 price wobble on a $24.93
close is **1.6 percentage points**, so `PFE` and `INTC` swapped rank on 5 of 15
steps, `isRankedByMove(losers, true)` refused the list, and `readMovers`
dropped **the whole section** — exactly as designed. Read off the shipped
decoder rather than guessed at, with a `--dump` mode. The wobble is now
proportional to the price, and all 15 steps keep every section.

### What falsifies a planning document

1. **Task 4.8.3's gap-sensitivity caveat does not transfer to a browser arm**
   — measured ×1.00 at 3.7 s and 8.8 s gaps, five arms, against the ×2.4–3.5 it
   reads in Node. 4.8.3's sentence _"no absolute figure in this epic is a
   measurement of production cost"_ is **true of the backend legs and false of
   this one**; this task's `Handed here by Task 4.8.3` section is left standing
   as the warning it was and the reading is recorded above. Carried into
   4.8.3's own hand-off list is **not** done here — the sentence is that task's
   record of what it measured, and what is being corrected is the
   **generalisation**, which lives in this file and in Task 4.8.10's sweep.
2. **This task's brief said the cadence floor is 8.8 batches a minute**; it is
   **6.8**, at midday. Already corrected at three live sites by Task 4.8.2 and
   driven at both ends here.
3. **`docs/GAPS.md`'s and this story's byte arithmetic** — three figures, all
   wrong, corrected above.
4. **`/` draws nothing from its own `bars` frames.** Nothing in any document
   says otherwise, and nothing says this either; it is recorded because two
   later tasks will reason about that subscription.

### Done when

1. **Met.** Per-tick main-thread work and worst animation frame on `/`, on a
   production build, at **6.8 and 16.1 batches a minute driven**, with a
   `bars`-only control **and** a quiet control at each cadence, and a
   calibrator ratio and discard count beside every figure.
2. **Met.** The MDE is in the section above this one, written before any arm
   ran, and it was **beaten in the conservative direction** — with the
   measurement that explains why.
3. **Met.** The frame re-taken at **3,990–4,002 B** in a browser against
   4.8.3's **4,078 B** ceiling, the derived figures corrected at three live
   sites, one historical site left standing with the argument, and a byte
   finding (the unrounded percentage) recorded.
4. **Met.** The cadence's provenance, what drove it, what it does not certify,
   and that no offline feed reproduces it.

### The transcript, verbatim

```text

The browser leg on / — Task 4.8.4

  Load average 6.13 across 8 cores (ratio 0.766) against a ceiling of 1.00.
  built .capture/instrument/dist in 0.8 s (VITE_API_BASE_URL=http://127.0.0.1:3100)
  pair up — PRODUCTION BUILD
    frontend http://localhost:4273 (vite preview, index-BnqVOSWf.js, 398 KiB)
    backend  http://127.0.0.1:3100 (dist/index.js, provider=none, store=marketpulse_bare, CORS_ORIGIN=http://localhost:4273)

```

Two of the seven arms in full — the close's `overview`+`bars` beside the quiet
control it is read against:

```json
{
  "arm": "close / overview+bars",
  "cadence": "16.1/min, every 3727 ms",
  "composition": "overview + bars",
  "batches": 14,
  "subscribes": [0, 25],
  "subscribedWhenMeasured": 25,
  "observerProved": true,
  "wrapperIntact": true,
  "repaintTarget": "main",
  "visibility": "visible",
  "mainChanged": true,
  "pageErrors": [],
  "firstDifference": {
    "at": 41,
    "was": "arket proxies\n\nSPY\n\n764.29\n\u25b2\nup\n+1.52%\n\nQQQ\n\n715.34\n\u25b2\nup",
    "now": "arket proxies\n\nSPY\n\n764.90\n\u25b2\nup\n+1.60%\n\nQQQ\n\n715.92\n\u25b2\nup"
  },
  "channelProof": {
    "plantedMs": 70,
    "caught": [70],
    "channelTasksSeen": 15
  },
  "deliverMs": {
    "overview": {
      "n": 14,
      "p50": 0.3,
      "p95": 0.5,
      "max": 0.5,
      "min": 0.2
    },
    "bars": {
      "n": 14,
      "p50": 2.4,
      "p95": 3.6,
      "max": 3.6,
      "min": 2.2
    },
    "perBatch": {
      "n": 14,
      "p50": 2.7,
      "p95": 3.9,
      "max": 3.9,
      "min": 2.4
    }
  },
  "renderTaskMs": {
    "perTask": {
      "n": 73,
      "p50": 0.3,
      "p95": 1,
      "max": 1.4,
      "min": 0.1
    },
    "perBatch": {
      "n": 14,
      "p50": 2,
      "p95": 2.5,
      "max": 2.5,
      "min": 1.5
    },
    "tasksPerBatch": 5.21
  },
  "scriptPerBatchMs": {
    "n": 14,
    "p50": 4.9,
    "p95": 5.9,
    "max": 5.9,
    "min": 4.2
  },
  "commitsPerBatch": [4, 5, 6, 5, 5, 5, 6, 6, 5, 5, 5, 5, 6, 5],
  "rafGapMs": {
    "n": 3335,
    "p50": 16.7,
    "p95": 17.2,
    "max": 17.7,
    "min": 15.6
  },
  "longEntries": [],
  "frameBytes": {
    "overview": {
      "n": 14,
      "p50": 3997,
      "p95": 4002,
      "max": 4002,
      "min": 3990
    },
    "bars": {
      "n": 14,
      "p50": 2999,
      "p95": 3001,
      "max": 3001,
      "min": 2998
    }
  },
  "calibrator": {
    "tight": {
      "n": 25,
      "p50": 1.2,
      "p95": 1.3,
      "max": 1.3,
      "min": 1.1
    },
    "atTheGap": {
      "n": 14,
      "p50": 1.2,
      "p95": 2.7,
      "max": 2.7,
      "min": 1.1
    },
    "ratioToTight": 1,
    "screenedAtTheGap": {
      "band": [0.75, 1.92],
      "reference": 1.2,
      "kept": 12,
      "discarded": 2,
      "discardedSamples": [
        {
          "index": 6,
          "sample": 2
        },
        {
          "index": 7,
          "sample": 2.7
        }
      ]
    }
  }
}
```

```json
{
  "arm": "close / quiet",
  "cadence": "16.1/min, every 3727 ms",
  "composition": "NOTHING SENT (the background control: the clock and the health poll)",
  "batches": 14,
  "subscribes": [0, 25],
  "subscribedWhenMeasured": 25,
  "observerProved": true,
  "wrapperIntact": true,
  "repaintTarget": "main",
  "visibility": "visible",
  "mainChanged": false,
  "pageErrors": [],
  "firstDifference": null,
  "channelProof": {
    "plantedMs": 70,
    "caught": [70],
    "channelTasksSeen": 15
  },
  "deliverMs": {
    "overview": null,
    "bars": null,
    "perBatch": {
      "n": 14,
      "p50": 0,
      "p95": 0,
      "max": 0,
      "min": 0
    }
  },
  "renderTaskMs": {
    "perTask": {
      "n": 57,
      "p50": 0.3,
      "p95": 0.5,
      "max": 1.4,
      "min": 0.1
    },
    "perBatch": {
      "n": 14,
      "p50": 1.2,
      "p95": 2.3,
      "max": 2.3,
      "min": 0.8
    },
    "tasksPerBatch": 4.07
  },
  "scriptPerBatchMs": {
    "n": 14,
    "p50": 1.2,
    "p95": 2.3,
    "max": 2.3,
    "min": 0.8
  },
  "commitsPerBatch": [4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4],
  "rafGapMs": {
    "n": 3336,
    "p50": 16.7,
    "p95": 17.2,
    "max": 17.7,
    "min": 15.6
  },
  "longEntries": [],
  "frameBytes": {
    "overview": null,
    "bars": null
  },
  "calibrator": {
    "tight": {
      "n": 25,
      "p50": 1.2,
      "p95": 1.3,
      "max": 1.3,
      "min": 1.1
    },
    "atTheGap": null,
    "ratioToTight": null,
    "screenedAtTheGap": null
  }
}
```

And the summary, verbatim:

```text
=== summary
midday / overview+bars                 script/batch p50 7.9 p95 8.6 | deliver 3.8 | render 4 | worst rAF 17.8 | long 0 | cal x1 (1/8 discarded) | overview 3997 B bars 3001 B
midday / bars only                     script/batch p50 4 p95 5.1 | deliver 0.2 | render 3.7 | worst rAF 17.7 | long 0 | cal x1.08 (2/8 discarded) | overview — B bars 3001 B
midday / quiet                         script/batch p50 2.8 p95 5.2 | deliver 0 | render 2.8 | worst rAF 17.7 | long 0 | cal x— (—/— discarded) | overview — B bars — B
close / overview+bars                  script/batch p50 4.9 p95 5.9 | deliver 2.7 | render 2 | worst rAF 17.7 | long 0 | cal x1 (2/14 discarded) | overview 3997 B bars 2999 B
close / bars only                      script/batch p50 2.1 p95 3.8 | deliver 0.1 | render 2 | worst rAF 17.8 | long 0 | cal x1 (3/14 discarded) | overview — B bars 2999 B
close / quiet                          script/batch p50 1.2 p95 2.3 | deliver 0 | render 1.2 | worst rAF 17.7 | long 0 | cal x— (—/— discarded) | overview — B bars — B
close / overview+bars + substitution   script/batch p50 7.6 p95 9.9 | deliver 4.6 | render 3 | worst rAF 17.7 | long 0 | cal x1 (0/14 discarded) | overview 3996 B bars 2998 B

Load 6.13 before, 3.2 after (ceiling 1, 8 cores).
```

One frame of each type, verbatim, built with the **shipped**
`encodeMarketStreamMessage` so a protocol change would have broken the
instrument rather than producing a frame the gateway cannot send. The aggregate
is step 3 of the run above, **3,997 bytes**; the `bars` frame is cut to the four
proxies for legibility and the measured one carries 25 symbols at
2,998–3,001 B.

```text
{"type":"overview","version":1,"sentAt":"2026-10-09T09:43:46.893Z","overview":{"computedAt":"2026-10-09T09:43:46.894Z","feeds":["iex"],"figures":[{"state":"observed","symbol":"SPY","at":"2026-10-08T17:33:00.000Z","price":765.09,"changePercent":1.6244720133889459,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"QQQ","at":"2026-10-08T17:33:00.000Z","price":716.1,"changePercent":1.587436694046056,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"DIA","at":"2026-10-08T17:33:00.000Z","price":525.95,"changePercent":1.3332562664971337,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"IWM","at":"2026-10-08T17:33:00.000Z","price":289.16,"changePercent":1.292605177426699,"changeBasis":"2026-10-08"}],"sectors":[{"state":"observed","symbol":"XLK","at":"2026-10-08T17:33:00.000Z","price":274.42,"changePercent":2.1249674370138947,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLV","at":"2026-10-08T17:33:00.000Z","price":148.87,"changePercent":2.014664565202493,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLF","at":"2026-10-08T17:33:00.000Z","price":53.49,"changePercent":1.7306960821605246,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLY","at":"2026-10-08T17:33:00.000Z","price":228.03,"changePercent":1.6312341222088498,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLC","at":"2026-10-08T17:33:00.000Z","price":113.12,"changePercent":1.5622194289818723,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLI","at":"2026-10-08T17:33:00.000Z","price":151.11,"changePercent":1.2598003082490277,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLP","at":"2026-10-08T17:33:00.000Z","price":79.33,"changePercent":1.1991325424161214,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLE","at":"2026-10-08T17:33:00.000Z","price":92.49,"changePercent":1.1040664626147692,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLU","at":"2026-10-08T17:33:00.000Z","price":84.72,"changePercent":0.8091385054735752,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLRE","at":"2026-10-08T17:33:00.000Z","price":41.66,"changePercent":0.7253384912959312,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"XLB","at":"2026-10-08T17:33:00.000Z","price":92.31,"changePercent":0.6432621020497202,"changeBasis":"2026-10-08"}],"breadth":{"basis":"observed","advancing":242,"declining":239,"unchanged":22,"measured":503,"tracked":503,"windowMinutes":5},"movers":{"basis":"observed","gainers":[{"state":"observed","symbol":"NVDA","at":"2026-10-08T17:33:00.000Z","price":187.63,"changePercent":9.52658922421341,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"SMCI","at":"2026-10-08T17:33:00.000Z","price":42.24,"changePercent":8.474576271186454,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"FSLR","at":"2026-10-08T17:33:00.000Z","price":232.03,"changePercent":6.886861986364469,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"AMD","at":"2026-10-08T17:33:00.000Z","price":164.44,"changePercent":4.7922508284476235,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"TSLA","at":"2026-10-08T17:33:00.000Z","price":439.45,"changePercent":3.4900972611449954,"changeBasis":"2026-10-08"}],"losers":[{"state":"observed","symbol":"ALB","at":"2026-10-08T17:33:00.000Z","price":93.51,"changePercent":-9.107698289269042,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"MRNA","at":"2026-10-08T17:33:00.000Z","price":27.73,"changePercent":-7.996018579960186,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"PFE","at":"2026-10-08T17:33:00.000Z","price":24.94,"changePercent":-3.108003108003097,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"INTC","at":"2026-10-08T17:33:00.000Z","price":36.2,"changePercent":-2.399568616877866,"changeBasis":"2026-10-08"},{"state":"observed","symbol":"MU","at":"2026-10-08T17:33:00.000Z","price":182.83,"changePercent":-0.9641947890146801,"changeBasis":"2026-10-08"}],"eligible":503,"tracked":503,"windowMinutes":5}}}

{"type":"bars","version":1,"sentAt":"2026-10-09T09:43:46.895Z","observations":{"SPY":{"startsAt":"2026-10-08T17:33:00.000Z","open":103.3,"high":103.72,"low":102.93,"close":103.3,"volume":10411},"QQQ":{"startsAt":"2026-10-08T17:33:00.000Z","open":110.71,"high":111.13,"low":110.34,"close":110.71,"volume":10422},"DIA":{"startsAt":"2026-10-08T17:33:00.000Z","open":118.12,"high":118.54,"low":117.75,"close":118.12,"volume":10433},"IWM":{"startsAt":"2026-10-08T17:33:00.000Z","open":125.53,"high":125.95,"low":125.16,"close":125.53,"volume":10444}}}
```
