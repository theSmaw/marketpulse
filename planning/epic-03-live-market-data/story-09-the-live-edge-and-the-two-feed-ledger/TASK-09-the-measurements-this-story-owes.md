# Task 3.9.9 — The measurements this story owes

**Status:** **Complete on criterion 1, PARTIAL on criteria 2 and 3 — 2026-09-24, and the partials are the market being shut rather than work not done.** A burst costs **7.2–8.1 ms of script at the default window and 12.3–13.2 ms at 6,630 bars**, net of a control, with **zero** frames over 50 ms across 160 bursts on a production build — §28's _routine_ line met with an order of magnitude to spare, and 3.4× the bars costing 1.8× the script is ADR 0027's silhouette regime paying out. Four viewports probed, and the probe found the one real layout figure this story owed. The rehearsal is **not** taken and the reason is written down: the session opens six hours after this task ran.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.5, 3.9.6 (3.9.4 deleted 2026-09-24)

## Inherited from Task 3.9.3 — 2026-09-24

**Task 3.9.4 is deleted and its one real obligation is yours**: `pnpm probe` at
all four viewports with the feed running, which this task already owns. Nothing
was drawn, so there is no treatment to photograph — what the probe is looking at
is a chart extending with no vocabulary on it.

**And one figure is already taken**, so do not re-derive it: an arriving minute
buys **0.4 px** at the default five-session window, **2.1 px** on a single
session, and **14.1 px** on a 57-bar answer, with **0.00 px** of horizontal
movement in every existing point. A new extreme re-scales the value axis and
moves every point vertically — median **2.4 px**, largest **4.9 px** at the
default window. Those are geometry rather than cost; §28's _routine_ line is
still unmeasured and still yours.

## Objective

Criteria 6 and 8. **A chart that extends is `PRODUCT_SPEC.md` §28's word
_routine_ in its purest form**, and Task 3.6.5 paid for learning what that costs:
the universe table re-rendered 518 rows once a minute for ever and crossed 50 ms
on three frames in seven on a production build, while the cold load — once per
visit — was allowed to stand.

## What the user can see when this lands

**Nothing new, and ideally nothing different.** The output is figures and,
if anything breaches, a repair.

## What to measure, and the traps in each

**The per-burst cost, at the default window and at the cap.** `CHARTING.md`'s
own figures are the baseline: one element per bar at the **9,750-bar cap** is
9,790 plot elements and main-thread tasks of **137–254 ms**, and none at the
default window. A redraw that rebuilds the whole path every minute inherits the
first number, not the second.

- **Measure on a production build.** A development build's figures are a
  different product.
- **The instrument is a `long-animation-frame` observer naming the invoker**,
  which is what let Task 3.6.5 attribute a breach to the health poll rather than
  to the feed. It is in that task.
- **The lever is render work rather than data work** — memo boundaries so a
  burst touches only what changed. The table's first two are the precedent.
- **A figure that has moved looks exactly like a figure that was mis-recorded.**
  Only rebuilding the old commit tells them apart.

**`pnpm probe` at all four viewports with the market open** — 1440, 1024, 768, 390. Criterion 8, and it is a different thing from a browser assertion: it is
where a tolerance's number comes from, and this repository's record says five
times over that a defect found by a person opening the page was invisible to
everything mechanical.

**And the rehearsal, which is the half no instrument can take.** Criterion 8
also says _a person watched the chart extend during a live session before the
suite ran_. That needs the deployed site with the market open, and
`LIVE-REHEARSAL.md` is where the row goes. Three stories are already waiting on
that window (`docs/GAPS.md` entry 10 — the free plan holds **one** Alpaca
connection and the deployment has it), so take this story's items in the same
sitting and say so in the ledger rather than spending the scarce thing twice.
`scripts/session-watch.mjs` exists and takes five of the combined items
unattended.

## Work

- Per-burst cost at the default window and at the cap, on a production build,
  attributed from both ends
- Any breach repaired here rather than handed on, unless it is Epic 14's by the
  standing trigger — in which case say so in writing
- `pnpm probe` at four viewports with the feed running
- The `LIVE-REHEARSAL.md` row, or the recorded reason there is none
- Every figure written where a later reader will find it, with its date

## Done when

1. No **routine** main-thread task over 50 ms while the chart extends, measured
   at both densities, or a breach with a named owner and a written argument
2. Four viewports probed with the market open
3. The rehearsal row is written, or its absence is explained

---

## What was done — 2026-09-24

### Criterion 1 — met, at both densities this machine can reach

On a production build (`vite preview` over `apps/frontend/dist`) at 1440×900,
40 bursts per density, two live samples each:

| On screen                       | Script/burst     | Layout  | Style   | Longest frame | Over 50 ms |
| ------------------------------- | ---------------- | ------- | ------- | ------------- | ---------- |
| **1,950 bars** (default window) | **7.2–8.1 ms**   | 1.49 ms | 1.89 ms | 18.3 ms       | **0**      |
| **6,630 bars** (25 sessions)    | **12.3–13.2 ms** | 1.24 ms | 1.80 ms | 20.1 ms       | **0**      |

The figures live in [`CHARTING.md`](../../../planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md)
§18, dated, because that is where a later reader looking for _how this product
draws_ will go.

**Script is net of a control run** — the same instrument with the socket send
suppressed. That control cost 3.0–3.2 ms a cycle and grew the chart by **0**
bars, which is what makes it a control rather than a second measurement.

**3.4× the bars costs 1.8× the script**, and the reason is a count: the plot is
**13 drawn elements at 6,590 bars**. ADR 0027 chose one path over one element
per bar against a cold-load argument, and this is the same decision paying a
dividend it was not bought for — an arriving minute re-walks a path rather than
touching a DOM proportional to the window.

### The instrument, and the two bugs it had before it was believed

`scripts/burst-cost.mjs`, run and deleted. Three things in it are worth keeping
because each was a wrong answer first:

**1. `long-animation-frame` only exists for frames over 50 ms**, so "zero
observed" and "observer dead" are the same output. A 120 ms block was added as
a self-test — and it reported **0 frames**, because the first version blocked
**outside** an animation frame on an idle page, where no frame is produced at
all. Inside a `requestAnimationFrame` with a mutation after it, it reports 1
every time. `CLAUDE.md`'s rule about a check that has never fired, met by an
instrument that had to be broken on purpose before its silence meant anything.

**2. The first run reported a chart that never grew** — `1950 → 1950` at the
default window — and reported it beside plausible timings. The pushed bar was
invented one minute past the body's last, which is **past
`coverage.requested`**, where `withLiveBars` correctly drops it. The repair is
`security-live-edge.spec.ts`'s arrangement: serve the body **short by 40 bars**
and push those 40 recorded bars. Every arriving minute in these figures is one
a server really sent.

**3. A frame-to-frame delta cannot see work React schedules off the animation
frame.** So the headline figure is Chromium's own `ScriptDuration` counter
through CDP, and the rAF deltas are the cross-check rather than the answer.
They agree: bursts land inside a single 16.7 ms display frame.

> **The verbatim frame**, because a conclusion outlives its instrument and the
> evidence does not:
>
> ```json
> {
>   "type": "bars",
>   "version": 1,
>   "sentAt": "2026-09-24T07:11:08.246Z",
>   "observations": {
>     "NVDA": {
>       "startsAt": "2026-09-04T19:20:00.000Z",
>       "open": 230.11,
>       "high": 230.12,
>       "low": 230.03,
>       "close": 230.075,
>       "volume": 169935
>     }
>   }
> }
> ```

### Criterion 2 — four viewports probed, and the probe earned its keep

`pnpm probe /securities/NVDA?sessions=25 --within Volume` at 1440, 1024, 768
and 390. The readout strip is **35 px** at the three narrow widths with 22 px
lines.

**It answered the question Task 3.9.8's canvas §07 handed forward**, which was
whether the new silent-window sentence breaks §04's reservation. Measured at
the real font:

| Strip width | _No shares changed hands on either feed in the window._ |
| ----------- | ------------------------------------------------------- |
| 358 px      | one line, 22 px                                         |
| **342 px**  | one line, 22 px                                         |
| **308 px**  | **two lines, 40 px**                                    |

**308 px is the readout's real width at the 390 viewport.** So the sentence
does wrap in the product — and **nothing jumps**, because the flat state is
itself one of the reserved sizers: `Readout` lays `PeakFigures` out hidden, and
in a silent window that _is_ the sentence, so the row reserves 40 px and every
state inside it fits. A silent window's Volume region is 18 px taller than a
trading one, which is a property of the window rather than of an interaction.

**§07's warning was right to be written and wrong about the consequence**, and
that is the probe doing what this repository says five times over it does.

### Criterion 3 — NOT met, and the reason is the clock

**The market was shut.** This task ran 02:40–03:30 ET; the session opens at
09:30 ET. Criterion 8's _a person watched the chart extend during a live
session_ needs the deployed site with the market open, so
`LIVE-REHEARSAL.md`'s 3.9 row is **left blank rather than filled from an
instrument** — that file's own first rule.

What is written there instead is the state: `scripts/session-watch.mjs` has
been running against the deployed gateway since 22:42 ET on 2026-09-23 for
1,000 minutes, which covers the whole session. At 07:17 UTC it held **377 feed
samples over 4h 36m**, **376** reading `live` / `iex` with `marketOpen: false`.

### One observation that is not this story's, handed on rather than kept

**The watcher's socket closed 38 times in 4h 36m** — every one code **1006**,
every one with `elsewhereReachable: true`, so the backend answered HTTP
throughout. About one drop every seven minutes, and the feed cell stayed `live`
in 376 of 377 samples, so **Task 3.5.5's reconnect absorbed all but one**.

Two caveats keep it an observation: the watcher runs on a laptop over a
domestic link to Azure, so the drops may be this end's; and an overnight socket
is idle, which is the condition an idle timeout fires on. **Owner: Story
3.10**, written into `LIVE-REHEARSAL.md` beside the row rather than left here.

### What is NOT measured, stated so it is not read as measured

- **The 9,750-bar cap itself.** This machine's store ends 2026-09-11, so the
  densest real body it can serve is 6,630 bars — **68% of the cap**. Backfilling
  to reach it is a metered vendor write and was not run. The trend is sub-linear
  and the cap would have to behave very differently to breach 50 ms, but that is
  an argument, not a measurement.
- **The wire leg**, measured separately by Task 3.6.4 (`sentAt`, p95 6 ms).
- **A real gateway.** The socket is served by the instrument with the shipped
  encoder, so these are the browser's costs rather than the deployment's.

### Gates

`pnpm verify` and `pnpm links` green. No product code changed in this task —
the only files touched are documents and a throwaway instrument that has been
deleted.

## For a stakeholder — a status report, 2026-09-24

### What this was

**We made the charts update themselves. This task asked the obvious follow-up
question: what does that cost the person watching?**

It matters because of _how often_ it happens. A chart is drawn once when you
open a page — expensive is survivable. A chart that extends does its work
**every minute, for as long as you leave the tab open**. Our own performance
rule draws exactly that distinction, and we have been bitten by it before: a
few weeks ago the securities table was re-drawing all 518 rows once a minute
and quietly went over budget.

### The answer

**A minute arriving costs about 7–8 milliseconds** on the default chart, and
**12–13 milliseconds** on a chart with three and a half times as much data on
it. Our budget is **50 milliseconds**. We are inside it by roughly a factor of
six, and the browser never dropped a single frame across 160 arriving minutes.

To put 8 milliseconds in perspective: a screen refreshes every 17. The work of
adding a minute to the chart finishes comfortably inside one refresh, so there
is nothing for a person to see.

### The part that is genuinely good news

**Three and a half times the data costs less than twice the work.**

That is a decision from two epics ago paying out. When we built the charts we
chose to draw the whole price line as **one shape** rather than one shape per
minute — a choice made to survive very large windows on first load. It turns
out to also be why _extending_ is cheap: adding a minute redraws one line
rather than touching thousands of separate pieces. The chart at 6,630 minutes
is made of **13 drawn elements**.

### Why you should trust the number

Because we tried hard to make the measurement wrong first, and it was, twice.

**Our first run said the chart never grew** — and reported perfectly plausible
timings next to that fact. We had been adding a minute _past the end of the
window being displayed_, where the product correctly ignores it. So we were
measuring the cost of doing nothing. The fix was to hold back the last 40
minutes of a **real recorded session** and deliver those, so every arriving
minute in the final figures is one a server genuinely sent.

**Our detector for "was anything too slow?" reported nothing — because it was
switched off.** That tool only reports things over 50 milliseconds, so silence
and a broken instrument look identical. We deliberately jammed the page for 120
milliseconds to check it would complain. It did not. Once fixed, it caught the
jam every single time — and still reported nothing for the real bursts. Only
then was "nothing was too slow" worth writing down.

We also ran a **control**: the identical procedure with the data delivery
switched off, to measure what our own measuring cost. It was 3 milliseconds,
and the published figures have it subtracted.

### What we looked at with our eyes

We photographed the chart at four screen sizes, and it answered a question we
had left open two days ago.

Yesterday's work added a sentence for charts where nothing traded. We had noted
it was now the longest line of text that strip can hold, and wondered whether
it would overflow on a phone. **It does wrap onto two lines at phone width** —
and it turns out that is fine, because the layout already reserves room for
whichever state is tallest. Nothing shifts under the reader. The region is
simply slightly taller on a silent chart, which is a property of that chart
rather than something moving while you look at it.

That is a case where the worry was worth writing down and the answer was
reassuring — which we would not have known without going and measuring.

### What we could not do, and why

**Nobody has yet watched this work on the live site during trading hours.** We
ran at 3am; the market opens at 9:30. That is a real gap and we have not papered
over it — the rehearsal record for this story is deliberately **left blank**
rather than filled in from an automated run, because our own rule is that a
machine watching is not a person watching.

An automated watcher **is** running against the live site and has been since
10:40pm, covering the whole of today's session. In four and a half hours it has
confirmed the live feed reporting healthy in 376 of 377 checks.

It also turned up something we have handed to a later piece of work: our
watcher's own connection dropped **38 times overnight** and silently recovered
every time but one. That may well be our office internet rather than the
product — but the reconnection logic visibly did its job, and the team that
owns "what the page says when the feed stops" now has it in writing.

### Where the product stands

**Eight of nine tasks done.** The charts extend live, are readable at any point
by mouse or keyboard, tell the truth about which data came from where, and now
have a measured cost that sits well inside budget.

**What is left:** the sweep and close — plus the one thing that needs a human at
a keyboard while the market is open, which is now the only item standing between
this story and finished.
