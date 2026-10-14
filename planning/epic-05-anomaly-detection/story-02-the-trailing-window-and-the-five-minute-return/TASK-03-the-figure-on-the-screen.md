# Task 5.2.3 — The Figure on the Screen

**Status:** Complete — 2026-10-14 — the region draws. The frame is **298 B rather than the 221 B this task estimated**, `pnpm probe` found two defects nothing else could, and the degraded-set spec went red for a reason that was not the outage: it could not tell _the feed died_ from _two seconds passed_
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.2

## Objective

**`Abnormal-move indicators` stops being a hatched panel.** This is the first
figure Epic 5 puts in the region the epic is named for, and the second of the
three reserved rail regions to fill.

## What the user can see when this lands

**On `/securities/:symbol`, the region draws a 5-minute return** — the figure,
the two instants it was measured between, and how much of the window was
observed.

## Work

- **A fifth market-stream frame type, scoped to ONE symbol** — the owner's Gate
  1 decision, taken on a measured ratio: a field on every observation costs
  **+54,525 B per frame** at 516 subscribed (**+82%**, measured as 66,327 B
  against a real article of 58,187–59,475 B), which at **6.8–16.1 batches a
  minute** is **+371–878 KiB a minute per attached browser** for one figure
  about one security. The symbol-scoped frame is **221 B**. A factor of **247**.
  - **`MARKET_STREAM_MESSAGE_TYPES` is commented _"The four message types,
    closed"_**, so this is a deliberate re-opening with a version decision, not
    an addition. Record what the version becomes and why.
  - **The subscription semantics are the part to get right**: a browser
    subscribes to ~516 symbols on this route (its own, plus every row of the
    table below). The frame is about **the security the page is about**, which
    is not a concept the gateway currently has. Decide it and write it down.
  - **ADR 0038's reversal trigger** — _the first overview region whose cadence
    must differ from the applied-batch cadence_ — is crossed **sideways** by
    this. Evaluate it in writing.
- **The band, in three lines**, in the column Story 5.1 set the idiom for:
  - a micro label, `5-MINUTE RETURN`, **spelled rather than composed** (a
    `composes:` does not give the composing rule the last word, and this
    product shipped `2026-09-11 · CLOSING PRICES` for a day because of it);
  - the figure through `PriceChange` — glyph, sign and tint, the glyph
    `aria-hidden`, because colour is never the sole encoding;
  - the qualifier: `14:01 EDT → 14:06 EDT · observed 3 of 5 minutes`.
- **Oldest endpoint first, and both printed.** AC 4 requires the older; the
  span is the entire defence against the 47-minute figure, and one instant
  leaves the reader doing arithmetic the product already did.
- **Both instants are bars' own `startsAt` and neither gets
  `OBSERVATION_INTERVAL_MS` added.** `describeMeasuredReach` adds it because it
  claims _reach_; adding it here prints a **six**-minute span for a five-minute
  return and contradicts AC 3's own definition. Spell them with
  `formatBarInstant`, the one home.
- **It dates the observation, never the computation** (AC 5). `computedAt`,
  `sentAt` and `Date.now()` appear nowhere in this band. This product drew
  `COMPUTED · Oct 9 · 21:42 EDT` under four-week-old closes and repaired it.
- **One grammar for k, with no special case at five** — `observed 5 of 5
minutes`, never _all five_. A second grammar at the complete end is two
  sentences for one fact and destroys the scan between two securities.
- **No dash in the figure slot, ever.** `—` is `unchanged` in `PriceChange`, so
  a dash there asserts a zero return. A refusal is a **stated word**.
- **It says nothing about the feed** (AC 6): no threshold, no connection word,
  no second staleness sentence. `a-second-staleness-sentence` and
  `one-home-for-the-strip-staleness-sentence` hold it — and **their corpus must
  see this new module**, because Story 4.6 found the first version of a check
  like this green on the file Epic 5 writes.
- **Invariant 6: the region says which tape it is.** Every bar in the window is
  `iex`, and the chart a few centimetres away says `All US exchanges`. One
  short source line for the region, the way `/` has one for the screen — never
  a second copy of the chart's.
- **Delete the `filledBy` placeholder sentence** rather than amending it — the
  fourth time on this screen, after Price, Volume and `Relative performance`.
- **Reserve this story's own band properly and NOT one pixel for the score.**
  5.3, 5.5 and 5.6 add figures to this region. Reserving for an unbuilt score is
  a guess 5.6 both re-measures **and** steps, paying twice — and an empty
  reserved band is the picture Story 4.7 routed as a defect, where _a gateway
  that is behind_ and _this is next year's_ are one picture. **The accepted cost
  is one step per story that adds a band**, recorded as a probed figure per
  width so 5.3/5.5/5.6 amend a measurement rather than inherit a guess.

## Done when

1. The region draws the return, both endpoint instants and `observed k of 5`,
   from a frame **this product's own server produced**.
2. The frame is symbol-scoped and **221 B or thereabouts, measured**, with the
   wire version decision and the subscription semantics written down.
3. ADR 0038's reversal trigger is evaluated in writing.
4. No `computedAt`, `sentAt` or `Date.now()` anywhere in the band; both instants
   are bars' own `startsAt` with no interval added.
5. The region names its tape, and no second connection word or staleness
   sentence appears — the existing invariants' corpora see the new module.
6. The `filledBy` placeholder is **deleted**.
7. `pnpm verify` green; `pnpm probe /securities/NVDA --all` run and the
   screenshots looked at, with the region's height recorded per width.

---

## What was done — 2026-10-14

**`Abnormal-move indicators` draws a figure.** On `/securities/:symbol` the
region now holds one band — `5-MINUTE RETURN`, the figure through
`PriceChange`, `Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5
minutes`, and `Measured on IEX` — computed in the backend over the trailing
window and carried on a **fifth market-stream frame type**.

### The wire decision, and the subscription semantics

**The version is unchanged at `1`, deliberately.** `MARKET_STREAM_PROTOCOL_VERSION`
is checked **before** the type, so a bump makes a stale tab reject _every_
frame rather than ignore one — losing its prices, its feed word and its
snapshot — and the deploy rolls the backend first. `DecodedMessage`'s
`unsupported` member already makes an unknown named type free for an old
bundle: uncounted, unreported, and it leaves `LiveFeedView.unreadable` alone.
This is Task 4.2.4's recorded reasoning applied a second time, unchanged.

**Which symbol the frame is about: the browser declares a FOCUS on the
subscription.** `SubscribeMessage.focus?: string` — optional, omitted rather
than `null`. A browser on this route subscribes to ~516 symbols (its own plus
every row of the table below it), so the subscription cannot say which one the
page is _about_, and the gateway had no such concept. The page declares it,
which is the shape `onLiveSymbols` already established, through
`onLiveFocus` → `App`'s `liveFocus` → `useLiveFeed({ focus })` →
`connection.subscribe(symbols, focus)`.

- _Rejected:_ **`symbols[0]` is the focus.** Free, and a load-bearing ordering
  convention inside a `string[]` that nothing can check and every future caller
  can break. The route happens to build the list that way today, which is
  exactly what makes it dangerous.
- _Rejected:_ **a second client message type.** It doubles the client union for
  a field that changes only when the subscription does, and it is a second
  thing to re-assert on every reconnect — Task 3.5.5's recorded failure.
- _Rejected:_ **one `onLiveSymbols(symbols, focus)` callback.** `App` passes two
  `useState` setters, both stable for the life of the application; a combined
  callback would be a fresh closure per render in the route's effect dependency
  list, which is 516 symbols re-subscribed on every render.

**The symbol is on the frame as well as on the subscription**, because a reader
moving between two securities has one subscribe round trip in which the
gateway's last answer is about the previous one. `fiveMinuteReturnBand` compares
and draws the held state rather than NVDA's return under AMD's name.

**When it is sent:** beside the snapshot (on connect and on every subscribe),
and from `publishObservations` **only when the focused security's own bar
arrived in that batch** — the window only moves when something is recorded into
it, so any other batch would re-send a byte-identical figure at 6.8–16.1 frames
a minute. Two browsers on one security cost **one** call to the producer; the
process suite asserts that by counting.

### ADR 0038's reversal trigger — evaluated, and it did not fire

The trigger is _the first overview region whose cadence must differ from the
applied-batch cadence_. This frame rides **exactly** the applied-batch cadence:
the same two paths the aggregate uses (`publishObservations` and
`sendSnapshot`), and it is refused on the keepalive for the same reason. What
differs from the aggregate is the **scope** — one security rather than the
universe — and nothing in that trigger is about scope. It is also not an
overview region: it draws on `/securities/:symbol`, not on `/`. Recorded in
`market-gateway.ts` beside `returnMessage`.

### The frame's measured size — 298 B, not 221

`packages/shared/src/market-stream-protocol.test.ts` asserts it, so it cannot
drift unrecorded:

```
measured 298 B
  {"type":"return","version":1,"sentAt":"2026-10-14T18:06:00.000Z","symbol":"NVDA","return":{"measured":true,"percent":0.4201680672268908,"from":{"at":"2026-10-14T18:01:00.000Z","price":119,"feed":"iex"},"to":{"at":"2026-10-14T18:06:00.000Z","price":119.5,"feed":"iex"},"observed":3,"spanMinutes":5}}
refused 141 B
  {"type":"return","version":1,"sentAt":"2026-10-14T18:06:00.000Z","symbol":"NVDA","return":{"measured":false,"refusal":"no-earlier-endpoint"}}
```

**The 221 B in this task's brief was an estimate and is 35% low**: it did not
carry two endpoints' `feed`, nor a full-precision percentage. The decision is
unaffected and the ratio against the rejected alternative is **183×** rather
than 247× (54,525 ÷ 298). The refusal arm — which is every frame on a gated
machine and every frame for a process's first five minutes — is 141 B.

### The region's height, probed per width

**106 px in all eight states at all four widths**, measured with
`pnpm probe --story market-abnormalmove--*` and on the route itself:

| Width | Region content box | Band   |
| ----- | ------------------ | ------ |
| 1440  | 419 px             | 106 px |
| 1024  | 446 px             | 106 px |
| 768   | 318 px             | 106 px |
| 390   | 308 px             | 106 px |

**5.3, 5.5 and 5.6 amend this measurement rather than inherit a guess.** The
band reserves itself and **not one pixel for the score**: 16 + 4 + 26 + 8 + 32

- 4 + 16. The accepted cost is one step per story that adds a band.

**Two defects found by the probe and by nothing else**, both invisible to
jsdom, to all 1,480 frontend tests and to a screenshot of any single state:

1. **A 3 px step between the measured states and the refusals** — 122 px against
   125 px, at every width, in the one region that must not step. The cause is
   baseline alignment: the paragraph's strut is a 20px font on a 26px line box
   and the refusal sentence inside it is 11px, so the line box is the **union**
   of two differently-placed baselines. Repaired by blockifying the child
   (`display: flex` on `.figure`).
2. **The qualifier was reserved at three lines and needs two** — argued from the
   390 column rather than measured in it, which left 32 px of empty room under
   the clause at 1440. The probe's screenshot is what showed it. **One reserve
   at every width rather than a media query**, because this screen's columns do
   not narrow with the viewport: 419 / 446 / **318** / 308, so a `37rem` query
   would give the second line to 390 and withhold it from 768, which needs it
   just as much.

### The two existing checks' corpora DO see the new modules — proved by a plant

`a-second-staleness-sentence` is the **break**, not a second invariant; the
check is `one-home-for-the-strip-staleness-sentence`, and its corpus is a
directory walk of `apps/frontend/src`, `apps/backend/src` and
`packages/shared/src`, not a file list. Rather than read it, the plant was
written and run — `last prices of the session` in `five-minute-return.ts` and
`All US exchanges` in `AbnormalMove.tsx`:

```
  ✗ one-home-for-the-feed-words
      apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx
  ✗ the-consolidated-word-has-one-producer
      apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx
  ✗ one-home-for-the-strip-staleness-sentence
      apps/frontend/src/market/five-minute-return.ts
3 of 58 invariants failed.
```

Three checks see the new files, the plant was reverted, and **no widening and no
new break is owed**. Nothing in this task adds a grep-style check.

### Other decisions worth finding later

- **`toWireSymbolReturn` is its own module**, `five-minute-return-wire.ts`. Task
  5.2.2's suite asserts that `five-minute-return.ts` exports **exactly one
  function**, and the honest answer to a guard in the way is to satisfy it
  rather than widen it — and the pure function reads no clock, no socket and no
  protocol, which is what makes invariant 4 structural in it.
- **Both instants are spelled in full by `formatBarInstant`**, so the clause
  repeats the date: `Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT`. The brief's
  example (`14:01 EDT → 14:06 EDT`) is **not producible by that function**,
  which prints the date, the time and the zone at `1m` — so the brief's own
  _spell them with `formatBarInstant`, the one home_ and its example string
  disagree. The one home won: a time-only second endpoint is a second spelling
  of an instant, and the first endpoint's date is load-bearing, because a
  process quiet since Friday holds a valid pair whose instants are days old.
- **The label is sentence case in the DOM and uppercase on screen.** The four
  micro properties are **spelled**, not composed; a listener is read `5-minute
return` rather than five shouted words.
- **Five sentences**, none with a terminal stop except the region's own:
  `No bars observed yet`, `No bar five minutes back`, `No basis for a
percentage`, and `No return yet.` — the **sixth** honest-nothing noun.
- **No tape line on a refusal** (ADR 0029): no number, so nothing whose
  provenance could be claimed.
- **The `filledBy` sentence is deleted, not amended** — the fourth time on this
  screen. It had a second reason to go: it promised a score out of 100, which is
  Story 5.6's and is deliberately absent from the figure underneath it.

### What nobody has seen

**No gated machine and no person has seen a measured 5-minute return.** CI's
store is 516 securities and zero bars and there is no store-backed fill, so the
trailing window is empty for ever there and every `return` frame on a gated
machine carries `nothing-observed`. The local pair draws the same state for the
same reason (`MARKET_DATA_PROVIDER` is not configured). What **has** been seen
from this product's own server is the refusal arm, on `/securities/NVDA`, drawn
from a real frame.

### Owed by Task 5.2.5

- `VISUAL-LANGUAGE.md`'s _The rail, and the anchored comparison track_ gains the
  band's geometry and the 106 px figure, beside `Relative performance`'s
  240 / 240 / 240 / 302.
- `e2e` is Task 5.2.4's, by this task's brief.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm stories`,
`pnpm invariants` and `pnpm test:process` all green; `pnpm e2e`, `pnpm verify`
and `pnpm test:database` were **not run** — out of scope by the brief, and
nothing here touches the data layer.

## The orchestrator's half — 2026-10-14

### The frame, measured rather than estimated

**298 B, not the 221 B this task's own Work section predicted** — 35% low,
because the estimate carried neither endpoint's `feed` nor a full-precision
percentage. The refusal arm is **141 B**, and the size is asserted in the
protocol test so it cannot drift. **The decision is unaffected and the ratio is
still what decides it: 183× rather than 247×**, against the +54,525 B a frame a
field on every observation would cost.

### Two defects `pnpm probe` found and nothing else could

- **A 3 px step between the measured and refused states** at every width — 122
  against 125 — from the baseline union of a 20 px strut and an 11 px sentence
  sharing one line box. Repaired with `display: flex` on `.figure`. **A
  three-pixel step is invisible in a screenshot and fatal to the one-height
  claim**, which is the whole reason that claim is measured rather than argued.
- **The qualifier was reserved at three lines and needs two.** The reserve was
  argued from the 390 column rather than measured in it, leaving **32 px of dead
  room at 1440**. One reserve at all widths, because the region's content boxes
  are 419 / 446 / **318** / 308 — a `37rem` query would serve 390 and starve 768.

Final: **106 px in every state at every width**, across eight states.

### A false claim in a merged record, corrected

Task 5.1.4's record says _"No `min-height` anywhere"_ and
`RelativePerformance.module.css` holds **three** — lines 42, 236 and 312. It has
been false since the day it was written, and Story 5.2's hand-off inherited the
absolute wording from it.

**The rule it was trying to state is true and is now stated properly**: a
`min-height` that pins the **region** to a number is a second home for four
figures nothing below `pnpm e2e` can check; a band reserving its own room as
`calc(2 * var(--line-height-micro))` is **derived from a token** and is the
shipped idiom. Corrected in both places, with 5.1.4's record amended rather than
rewritten.

### The degraded set went red, and the spec was the fault

`security-feed-degraded.spec.ts`'s _killing the feed leaves the page exactly as
it was_ compares `main`'s text either side of the outage. It failed on
`No return yet.` appearing — **and killing the feed had nothing to do with it**.
That sentence arrives at `useWaited`'s 2,000 ms floor; `settledText` waited for
_two consecutive equal reads_, settled at ~200 ms, and the floor fired
afterwards.

**`settledText` catches everything still ARRIVING and was blind to anything
LATENT.** Its own docblock says so without realising it — _"a page with anything
still arriving fails that"_ — and a sentence on a timer is not arriving. So the
spec could not distinguish _the feed died_ from _two seconds passed_, which is
the one thing it exists to distinguish. **Three regions now carry that floor and
more will.**

The baseline now requires the text to have been unchanged for longer than any
deferral on the page. **A bound rather than a copy of the floor, deliberately**:
this package may import only `@marketpulse/shared` and the floor lives in the
frontend, so writing `2_000` here would be a second copy of a timing number.
`3_000` asserts _longer than any deferral_ — correct if the floor falls, and
**red rather than silent** if it ever rises past three seconds, which is the
direction a wrong bound should fail in.

### And the shell spec's placeholder counts moved again

`Filled by /` **4 → 3** and `Filled by Epic 5` **2 → 1**. That is the spec
working: a placeholder that survives the thing it was waiting for is a screen
holding a plan while holding the plan's output. The comment now also records
that the last of Epic 5's three is `Anomaly history`, which **no story in this
epic fills**.

### Gates

- `pnpm verify` — **exit 0** at load 5.01, `58 invariants hold.`, **3,069 tests**
  (451 + 1,079 + 1,480 + 59).
- `pnpm e2e` — **254 passed, 16 skipped**, 6.2m, after the two spec repairs. The
  socket-path specs were run first on their own: 16 passed.
- `pnpm probe` — the story's eight states at four widths, and the route; the
  screenshots were looked at.

### One design note left open for Task 5.2.4

The qualifier prints `Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT`, repeating the
date, because `formatBarInstant` is the one home for an instant and has no
time-only form. The developer's reasoning is sound — a time-only second endpoint
is a second spelling, and the first endpoint's date is load-bearing, since a
process quiet since Friday holds a valid pair days old. **It is still a
repetition a reader notices**, and the task that owns this region's copy is
5.2.4. Recorded there rather than changed here.

## For a stakeholder — a status report, 2026-10-14

**`Abnormal-move indicators` draws a figure.** Open a security and the region
says what it has moved over the last five minutes, between which two instants,
how much of those five minutes we actually heard, and which market feed the
number came from. It is the first figure Epic 5 has put on a screen in the
region the epic is named for, and the second of that page's three reserved
panels to fill.

The figure travels on **a new, deliberately tiny message** — 298 bytes about one
security, against the roughly 54,000 bytes a frame it would have cost to put the
same number beside every security the page is subscribed to. That was the
decision taken before any of it was built, and the measurement came out 35%
above the estimate without changing it.

Two problems were found by **looking at the page**, which nothing automated
could have caught: a three-pixel jump between two states of the same region, and
a reserved space a third too tall at desktop width because it had been argued
from the phone layout rather than measured at either.

And a browser test that has guarded this page since Epic 3 turned out to be
unable to tell **the feed dying** from **two seconds passing** — it took its
"before" picture faster than one of our own honest-nothing sentences appears.
The test now waits long enough to mean what it says, and fails loudly rather
than quietly if that ever stops being long enough.
