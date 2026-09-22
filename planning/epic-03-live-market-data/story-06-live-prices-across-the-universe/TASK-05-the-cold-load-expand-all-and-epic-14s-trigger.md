# Task 3.6.5 — §28's cold load, `Expand all`, and Epic 14's trigger evaluated rather than assumed

**Status:** **Complete — 2026-09-22.** All three figures re-taken on a production build with the feed running, each against what it is comparable to; Epic 14's trigger evaluated in writing — **as worded it did not fire, and a condition it did not anticipate did**: a _routine_ task over 50 ms on this page, once a minute for ever, which §28's own word puts ahead of a once-per-load one. That breach is **repaired here** — two memo boundaries and a fixed table layout from 1024 up — and re-measured: **no task over 50 ms in the steady state**, the health poll's 40 ms re-render gone, the frame's script down from 46–49 ms to 37–40 ms with every row changing. The cold load and `Expand all` **stay Epic 14's**, with their figures re-taken (**50–56 ms on seven loads in ten**, was 56–83 on eight; **65–86 ms**, was 80–88) and the upward sweep done.
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.2, 3.6.3

## Objective

Criterion 4: **§28 re-measured on this page with the feed running** — the cold
load, the steady state and the frame cost — **against the three dated readings
already recorded**, with Epic 14's trigger **explicitly evaluated rather than
assumed not to have fired**.

## What the user can see when this lands

**Nothing**, unless the trigger fired — in which case a page that was spending
one main-thread task of 50–76 ms on every cold load stops doing so, and the
`Expand all` control stops costing 69–87 ms.

## The breach this story sits directly on top of

`PRODUCT_SPEC.md` §28 is **amended with a measured breach the product knowingly
carries**, and it is this page:

| What                                                 | Figure                 | When                               |
| ---------------------------------------------------- | ---------------------- | ---------------------------------- |
| Cold load of `/securities` and `/securities/:symbol` | **50–76 ms**, one task | 2026-09-12, 2026-09-13, 2026-09-15 |
| `Expand all` on this table, production build         | **69–87 ms**           | 2026-09-11                         |

**It is the 518-row universe table rather than the chart**, attributed from both
ends each time. It is owned by **Epic 14** by name, with its figures and three
candidate repairs.

## The trigger, and why this task cannot wave at it

> **The first time a second surface on that page renders per-row markup at
> universe scale.**

It is **a condition rather than an epic number, and it outranks the epic** — if
it fires, the repair is due **here** rather than in Epic 14.

**The story's own reading before the work started** was that it does not fire:
this story adds no second surface, it makes the existing one **re-render on a
live feed**, which is the same cost paid repeatedly rather than once.

**That reading is now questionable and must be re-taken rather than inherited.**
Task 3.6.2 may have put **a mark on every row** — which is per-row markup at
universe scale, added by this story, on this page. Whether that is "a second
surface" is exactly the judgement the trigger exists to force, and **the answer
has to be given in this task, in writing, either way.**

## What to measure, and the traps in measuring it

- **Cold load**, against the three dated readings. A figure that has moved looks
  exactly like a figure that was mis-recorded — only rebuilding the old commit
  tells them apart.
- **Steady state with the feed running**, which none of the three readings
  covers, because there was no feed when they were taken.
- **The frame cost** — and Task 3.4.8's method: a `PerformanceObserver` on
  `longtask`, **unbuffered**. **Buffered returns the cold load**, which on this
  exact page is the 50–76 ms breach arriving inside a measurement about
  something else and reading as a regression this story caused.
- **A production build.** The virtualisation figures on
  `Universe navigation.dc.html` — 100, 66, 51, 44, 48 ms — are explicitly the
  **dev build**, unminified, with the profiler's thumb on the scale, and are a
  pessimistic bound rather than a reading.
- **`Expand all`**, which is the same component and named beside the cold-load
  breach as probably the same repair.

## Work

- The three figures, each with its method beside it, against a production build
- The trigger evaluated in writing, with the reasoning, whichever way it goes
- If it fired: the repair, here, and `PRODUCT_SPEC.md` §28's amendment and
  Epic 14's `EPIC.md` both updated — **falsification travels upward and nothing
  sweeps upward on its own**
- If it did not: say so with the figures, and leave Epic 14's ownership standing
  rather than silently re-taking it

## Done when

1. Cold load, steady state and frame cost measured on a production build with
   the feed running, each against what it is comparable to
2. Epic 14's trigger evaluated **in writing** with a verdict, not an assumption
3. Whatever the verdict implies is done, including the upward sweep if the
   figures falsify a published claim
4. `pnpm verify` passes

---

## Handed here by Task 3.6.2 — 2026-09-21: §28 is already breached on this page, and it is not the cold load

**Measured on the running table, against a live fixture feed, with a
`PerformanceObserver` on `longtask` and `buffered: false`** — so this is not
Epic 14's known 50–76 ms cold-load task arriving inside a measurement about
something else. It is the **steady state**, repeating every tick.

| Arm                              | Long tasks recorded (ms)   |
| -------------------------------- | -------------------------- |
| Arrival mark rendered            | **249, 265, 98, 117**      |
| Mark element not rendered at all | **216, 83, 102, 196, 195** |

**Attributed from both ends on the same machine, the same feed, minutes
apart** — which is this repository's standard and the only thing that could
have told these two apart. **The mark is not the cost.** The cost is
re-rendering 518 rows on every tick, which arrived with Task 3.6.1 and which no
measurement had yet covered: 3.6.1 was verified for correctness, not for what
it costs once a minute forever.

### What this task now owes that it did not before

- **Re-take both arms on a production build.** These are **dev-build** figures
  — unminified, with a profiler attached — and this canvas already carries the
  same caveat against the virtualisation numbers. They are a **pessimistic
  bound**, not a verdict.
- **But do not treat the question as open.** Something on this page exceeds
  50 ms on a repeating schedule, and the disposition is this task's whichever
  way the production figure falls.
- **Evaluate Epic 14's trigger against this rather than only against the
  markup.** The trigger is _the first time a second surface on that page
  renders per-row markup at universe scale_. Task 3.6.2 added a mark element
  per live row — which is per-row markup at universe scale — **and measured
  that it is not what costs.** That is the awkward case the trigger did not
  anticipate: the condition arguably fired, and the thing it was written to
  catch is not the thing that is slow. **Say which, in writing.**

---

## What was done — 2026-09-22

**Conditions, once, for every figure below.** Production bundle (`vite build`,
minified React) served by `vite preview` on `:4173`; backend `dist/index.js` on
`:3000` with `CORS_ORIGIN` pointed at the preview; `MARKET_DATA_PROVIDER=fixture`,
`NON_LIVE_MARKET_DATA=permitted` — the replay had no session to start from on
this machine's store (Task 3.6.4 §6), and the fixture is the **harsher** feed
for everything measured here because it changes **all 518** rows every minute
where §7.6 measured the real feed at ~65%. Chromium via Playwright at
1440×900, `document.visibilityState === "visible"` checked on every page.
macOS 14 / arm64, load average under 6 throughout. Instruments installed from
an `addInitScript`, **before** navigation.

### 1. The three figures, before the repair, each against what it is comparable to

**Cold load — against the three dated readings.** Ten loads of `/securities`
in fresh contexts, a `longtask` observer and an rAF-gap recorder, and the
Epic 14 method's control: the same route with the universe response trimmed
to twenty rows at the API origin.

| Load                             | Tasks over 50 ms                                | Worst rAF gap |
| -------------------------------- | ----------------------------------------------- | ------------- |
| `/securities`, 518 rows, ×10     | **8 of 10** — 83+56, 63, 58, 62, 63, 61, 59, 57 | 49–87 ms      |
| `/securities/NVDA`, 518 rows, ×6 | **6 of 6** — 52, 58, 55, 55, 56, 55             | 54–60 ms      |
| `/securities`, **20 rows**, ×6   | **1 of 6** — 66 on the first launch, then none  | 29–45 ms      |

**Comparable to 50–76 ms and the same attribution holds**: the task is present
at 518 rows on a route with no chart, absent at twenty. It is at the top of the
band rather than inside it — 83 ms once, 57–63 ms typically — which a machine
seven days further into an uptime can account for and which the re-take below
does not have to explain, because the same instrument on the same day took
both.

**`Expand all` — against 69–87 ms.** Five runs, `Collapse all` first (12 rows),
then `Expand all` (530 rows), `longtask` cleared between: **80, 83, 85, 80,
88 ms**. `Collapse all` recorded nothing. Comparable to the 2026-09-11 figure,
at its upper edge.

**Steady state with the feed running — which no earlier reading covers.** Six
minutes, seven frames of 518 observations, three instruments at once:

- **`longtask`, unbuffered:** during the steady state — after the cold load's
  three — **66, 56, 52 ms**, one on three of the seven frames.
- **A CDP trace** (`devtools.timeline`), every main-thread task of 30 ms or
  more split into what ran inside it. **Eighteen script tasks** of 36–66 ms in
  six minutes against seven frames — **more than two per frame** — and eight
  rendering tasks of 37–51 ms, each **style 7–9 ms, layout 11–15 ms, paint
  19–29 ms**.
- **`long-animation-frame`**, which names the invoker: every frame produced
  **one** long animation frame of **73–82 ms** — `MessagePort.onmessage`, the
  React scheduler, **46–49 ms of script**, then 25–34 ms of style, layout and
  paint.

**Where the extra script tasks came from, which took a third instrument.** A
counter on React's DevTools hook — which production React still calls on every
commit — showed the route committing **once a second** (the header's clock,
cheap) and **once every thirty seconds** with the whole route re-rendered:
`useBackendHealth`'s poll sets state in `App`, and nothing below `App` was
memoised, so 518 rows re-rendered with **nothing on the page changed** —
**~40 ms of script every 30 s**, which is the two extra tasks a minute. Task
3.6.3 had written the mechanism down (_the feed state lives in `App` and
nothing below it is memoised_); this is what it costs when the feed is quiet.

### 2. The trigger, evaluated in writing

> **The first time a second surface on that page renders per-row markup at
> universe scale.**

**As worded, it did not fire.** The arrival mark is per-row markup at universe
scale, and it is not a second surface: it is a child of the price cell on the
one surface that already existed, keyed on the observation the cell already
renders, and Task 3.6.2 measured both arms — mark rendered, mark not rendered —
and found **no difference that survives the noise**. The trigger was written
for Epic 5's anomaly score: a second column of per-row computation and markup,
which would double the cold load's 10,000-node build. Nothing here is that.

**A condition the trigger did not anticipate did fire, and §28's own wording
decides what it outranks.** §28 says _no **routine** main-thread task over
50 ms_. The cold load is one task per visit; `Expand all` is a deliberate press.
The steady state is **once a minute for ever, on the page the persona leaves
open**, and it crossed 50 ms on three frames in seven with the feed at 100%
arrival — and cost 40 ms every 30 s with the feed doing nothing. That is the
word _routine_ exactly, and it is a breach this story **introduced** (Task
3.6.1) rather than inherited, so its repair is due here on ownership grounds
before it is due on the trigger's.

**So the verdict is two-part, and both parts are owned:**

- **The steady state is this task's, and is repaired below.** Its lever is
  render work, not DOM size, and the three candidate repairs in
  `SEARCH-AND-SELECTION.md` §10 are all about DOM size.
- **The cold load and `Expand all` stay Epic 14's**, with their figures
  re-taken here. Their lever _is_ DOM size — 530 rows built on every load —
  and the three candidates stand. One further lever was taken here for the
  cold load because it fell out of the steady-state work and cost nothing
  visible, and it is stated as such rather than as the repair.

### 3. The repair — two memo boundaries and a fixed layout, with what each measured

**A row is now two components.** `RowIdentity` — the symbol and its `Link`,
the name, the industry and the kind — is `memo`ised on `security`, one object
for the life of the loaded view. `SecurityTableRow` and `HistoryCell` are
`memo`ised on their inputs, and `groupUniverse` is `useMemo`ised on
`securities`. A re-render from `App` with nothing changed now stops at the
table; a tick re-renders a changed row's **two live cells** and leaves its four
static ones — including the `Link`, the costliest thing in a row — alone.

**This tree had no `memo` before and did not want one by default.** The
component says so, and `CLAUDE.md`'s rule is that a mechanism follows a figure:
the figure is §1 above.

**`table-layout: fixed`, from 1024 px up.** The `<col>` proportions already
decided every width, so the automatic algorithm was measuring 518 rows to
confirm an answer it had been given. **Measured, and the expectation was half
right**: the tick's layout stayed at 11–15 ms with or without it — a price's
text change was not re-laying the table, or not measurably — but the **cold
load** moved, below. **The width gate is a photograph rather than a guess**:
at 390 the same line crushed seven columns into 308 px, where the automatic
algorithm had been letting the table outgrow its scroller — the one thing a
table is permitted to do — and at 768 the history column's `1y from
2025-09-08` no longer fit its 14%. Below 1024 the table keeps the algorithm it
always had; `pnpm probe` at 1440 and the screenshots at 1024, 768 and 390
were looked at before anything was re-measured.

### 4. The three figures, after

| Figure                            | Before                                 | After                                            |
| --------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Steady state, tasks over 50 ms    | 66, 56, 52 in 6 min (3 of 7 frames)    | **none** in 2.5 min (0 of 3 frames)              |
| Frame's long animation frame      | 73–82 ms = 46–49 script + 25–34 render | **69–76 ms = 37–40 script + 31–35 render**       |
| Script tasks ≥ 30 ms per minute   | ~3 — the frame and two health polls    | **~1 — the frame**; the health poll's are gone   |
| Worst rAF gap in the steady state | 80 ms                                  | **54 ms**                                        |
| Cold load `/securities`, 518, ×10 | 8 of 10 over 50 ms — 56–83             | **7 of 10 — 50, 55, 52, 52, 53, 51, 56**; 3 none |
| `Expand all`, ×5                  | 80–88 ms                               | **65, 76, 86, 82, 82 ms**                        |

**Read the first row against §28's wording.** _No routine main-thread task over
50 ms_ is met in the steady state on a production build with **every** row
changing every minute — the case the real feed never produces. The frame is
still a long **animation frame** of ~70 ms, because React's ~38 ms task and the
engine's ~33 ms rendering task follow each other inside one frame; §28 counts
tasks, and neither is over the line. With the real feed's ~65% arrival the memo
boundary skips about a third of the rows the fixture re-renders, so the
production figure is bounded from above by this one.

**Read the cold-load row honestly.** Seven loads in ten still carry a task
over 50 ms; they are 50–56 ms rather than 56–83, and three loads carry none.
That is the fixed layout's doing — a mount is not a re-render, so the memo
boundaries cannot touch it — and it is an **improvement to a breach that
stands**, not a closure. `Expand all` moved by about the same and for the same
reason. Both remain Epic 14's, and the three candidate repairs remain the
repairs.

### 5. What now checks it, and what still cannot

**Below a browser, the mechanism rather than the duration.**
`UniverseTable.render-cost.test.tsx` wraps the router's `Link` in a counter and
asserts that **a price arriving re-renders no symbol link**, and that a
re-render with nothing changed re-renders no row at all. `pnpm break
a-price-re-renders-every-symbol-link` removes the memo and proves it goes red
— it did, and restored byte-identical. It lives in a file of its own because
`vi.mock` is file-wide.

**In a browser, nothing mechanical — and that is `docs/GAPS.md` entry 14.**
jsdom has no layout, CI's store has zero bars and no socket, and a duration on
a shared runner is noise. The re-measure is written into the entry: a
`long-animation-frame` observer on `/securities` against the fixture feed on a
production build, and read the script figure against 50.

### 6. The record swept upward, because nothing sweeps upward on its own

- **`PRODUCT_SPEC.md` §28** — the cold-load and `Expand all` exceptions carry
  re-taken figures and dates; the steady state is recorded as a **third
  exception that was breached and repaired in the same task**, with the
  after-figure.
- **Epic 14's `EPIC.md` and `planning/EPICS.md`** — both entries re-taken, the
  fixed-layout lever recorded as taken with its measured effect, ownership
  unchanged, and the trigger's verdict written where the trigger is.
- **`SEARCH-AND-SELECTION.md` §10** — a dated section: the three candidates
  stand for the cold load; a fourth lever was taken for a different breach;
  and the steady-state instrument, which that section's re-measure did not
  have.
- **`CLAUDE.md`** — the owned item under _What is open_ carries the re-taken
  figure and the steady-state repair.
- **Story 3.11** — told, in its own file, what the steady-state figures are
  and how to re-take them with the real feed.

### 7. Found while running the gates: a subscription after a close blanked the whole page

**Three tests in `market-reconnect.spec.ts` failed on this machine with the
page blank**, and bisecting against `main`'s copies of the two table files
showed the failure there too — a defect this task found rather than made, and
one CI had not shown. The dev server's log named it:

```text
[marketpulse] render error (uncaught) Error: WebSocket is already in CLOSING or CLOSED state.
    at App (http://localhost:5173/src/App.tsx?t=1790063439373:153:40)
```

**The mechanism.** `market-stream-client.ts` sent a subscription whenever it
had one, gated on an `opened` flag set on `open` and never cleared. After the
gateway closed the socket — the spec's `1001 going away` — the flag still
read `true`, and a subscription change landing in the 500 ms before the retry
dialled called `send` on a socket in the `CLOSING` state. **`WebSocket.send`
throws for that**, the call came from a React effect, an effect's throw is a
render error, and the root has no boundary above `App` — so the page went
blank until a reload. What flips the subscription inside that window on this
machine and not on CI was not pinned down and did not need to be: the guard
is wrong whenever it is reached.

**The repair.** The send is gated on the socket's own `readyState` rather than
a flag; a subscription that arrives while the socket is not open stays in
`wanted`, and the next socket re-asserts it on `open`, which is what the retry
already relied on. Two unit tests in `market-stream-client.test.ts` — buffered
until open, and **no throw after a close** — with `pnpm break
a-subscription-after-a-close-throws` proving the second goes red. The four
reconnect tests then passed in 5.6 s, and the full suite in 2.7 minutes with
nothing failed. `STREAM-SEAM.md` §8.6 carries the dated note and `CLAUDE.md`
the trap.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** The securities page shows 518 live prices that update
once a minute, marked as they arrive, and the last three tasks settled how the
table behaves at scale and how fast a price reaches the screen. **This task
asked whether that page is as smooth as we said it would be** — our standard
is that nothing routine should freeze the browser for longer than a twentieth
of a second — and had two known exceptions to re-check and one suspected new
one.

**What we found, in order of importance.**

- **The new one was real, and it was ours.** Since prices started moving, the
  browser was rebuilding all 518 rows every minute, and — the part nobody had
  spotted — rebuilding them **every thirty seconds as well**, when a routine
  health check of our server ran and the page re-drew itself with nothing
  changed. On the real production build that was over the twentieth-of-a-second
  line on about half the minutes. It is the worst kind of cost: not a one-off
  on arrival, but a tax paid for ever on the page an analyst leaves open.
- **The two old ones are still there and slightly better.** The page's first
  draw and the "expand every sector" button both still take just over the line,
  as they did last week. They are owned by a later phase of the project that is
  specifically about performance at scale, and this task re-measured them
  rather than re-discovered them.

**What we did.** The fix for the new problem is a rule the browser can follow:
**only redraw what changed.** A row is now split into the part that never
changes once loaded — the ticker, the name, the industry — and the two cells
that carry a live price. When a price arrives, only those two cells redraw; when
nothing arrives, nothing redraws. We also told the browser that the table's
column widths are decided in advance, so it stops re-measuring every row to
check — which took a little off the first-draw time too.

**The result, measured on the real build.** In steady state there is now **no
freeze over the line at all**, even with every one of the 518 prices changing
at once, which the real market never does. The thirty-second redraw is gone
entirely. The first draw improved from "over the line on eight loads in ten,
by up to a third" to "just over on seven in ten, by a whisker". Those last two
are honest improvements to problems that still stand, and we said so rather
than claiming them closed.

**Why we made the decisions we did.**

- **We measured before touching anything, three different ways.** The obvious
  suspect — the little dot that marks an arriving price on every row — had
  already been shown innocent. The real culprit only appeared with an instrument
  that counts how often the page redraws, and it was the thirty-second health
  check, which no one had thought to look at.
- **We kept the fix narrow.** The project's rule is not to add machinery until a
  number demands it. Until today this table had none of this caching; now it has
  exactly the two boundaries the numbers pointed at, with the numbers written
  beside them.
- **We looked before we shipped.** The column-width change was tried at every
  screen size we support. At phone width it squashed the table into an
  unreadable mess — so it applies only at desktop widths, where our users work
  and where the cost is paid, and the phone layout is exactly what it was.
- **We answered a written question in writing.** An earlier phase left a
  tripwire: _if a second thing ever draws something on every row of this
  table, the big fix is due now rather than later._ We concluded it had not
  tripped — the dot is not a second thing — but that a different tripwire, one
  nobody had written, had: a cost that repeats for ever outranks a cost paid
  once. That reasoning is in the record so the next person does not have to
  redo it.

**And one bug we did not go looking for.** While running the browser tests
for this change, three of them failed with a completely blank page. It turned
out to be an existing fault, not a new one: if our server drops the connection
for a moment — which happens on every deploy — and the page happens to change
what it is asking for during the half-second before it reconnects, it tried to
speak down a line that was already hung up, and the browser treated that as a
fatal error and cleared the screen. The fix is a one-line check that asks the
connection whether it is open before speaking, and the case now has its own
test. A reader on a page during a deploy could have seen it go blank; now they
see the feed word change and come back.

**What a user can see today: nothing new**, and that is the point — a page
that was about to start feeling sticky once a minute now does not, and the
page's first draw is a little quicker. What it unlocks is that the live table
can stay open all day on an analyst's second screen without the browser
labouring, which is the way this product is meant to be used, and that the
performance phase later on inherits two smaller, well-measured problems
rather than three.
