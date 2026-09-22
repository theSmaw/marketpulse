# Task 3.4.8 — The measurements this story owes

**Status:** **Complete — 2026-09-21.** Every figure taken in **one pass** against a **production bundle**: p95 **52 ms** and **51.7 ms** across two runs, against §28's 250 ms; **zero** long tasks of any length across 6,640 observations; the two block heights confirmed at **72 px / 88 px**; the mark's rate recorded and handed to Story 3.6. The timing instrument is deleted; the layout assertion stays and is break-verified.
**Amended:** 2026-09-21 after Task 3.4.7 — there is now an instrument that makes a price **arrive** inside a browser, which is what every figure here needed and nothing had.
**Amended:** 2026-09-21 after Task 3.4.6 — the identity block now has **two heights** at 390 and only one has been photographed.
**Amended:** 2026-09-21 after Task 3.4.4 — the layout figure is already taken and only needs a production re-take; the mark's firing RATE is a new measurement, because the reversal trigger's second clause is a number.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.7

## Objective

Three figures, each of which is an acceptance criterion and none of which any
existing check produces.

## What the user can see when this lands

**Nothing.** Numbers in a document.

## What is already decided and must not be re-taken

- **§28: event → application state under 250 ms p95**, excluding provider
  latency, **measured rather than assumed**. That clock starts at
  _server-received_ and ends at _application state_ — so it spans the gateway,
  the wire and the browser's reducer, and it is not the same thing as a render.
- **§28: no routine main-thread task over 50 ms.** The product knowingly misses
  this in two places and both are the 518-row universe table, owned by Epic 14.
  **This story must not add a third.**
- **A value that changes width must not move anything around it.** The numerals
  are tabular for this reason and **the reason is now load-bearing** rather than
  typographic.
- **Amended 2026-09-21 by Task 3.4.6 — the block now has TWO heights and the
  difference is a session state rather than a size.** _A value that changes
  width must not move anything around it_ is still true and still asserted; what
  is new is that **the block itself is a line taller when the price came from
  outside the session**, which is a legitimate wrap rather than thrash — the
  chrome's own answer from `Live in the chrome` §04. Measure both; a figure
  taken against only the regular-session case is a figure about one of the two
  states this surface has.
- **Amended 2026-09-21 by Task 3.4.4 — one figure is already taken and this
  task CONFIRMS rather than derives it.** The mark sits in space the figure's own
  box already occupies, and was measured at **0 layout shift and no horizontal
  overflow at 1440, 1024, 768 and 390**, with 26 px of room to the left of the
  digits at the narrowest. That was taken in the workshop against a development
  build, so **the production re-take is the only part still owed** — the
  arithmetic does not need redoing.
- **And there is now a rate to measure rather than assume.** The mark fires on
  **every bar arrival**, so on this surface that is once a minute per security —
  but the reversal trigger's second clause is a **measurable**: _the first
  surface where it fires more than once a second._ Record the rate this story
  produces, so Story 3.6 has a figure to compare 518 rows against rather than an
  argument.

## Two ways to take these figures wrong, both already paid for once

- **A development build is not the product.** Task 3.3.5's sweep measured 141 ms
  long tasks twice against `pnpm dev` and **zero** against a production build —
  Vite's unminified React, not the feature. §28's figures are production ones
  and a dev number is not comparable to them. **Build first.**
- **`buffered: true` on a `longtask` observer measures the COLD LOAD.** The same
  sweep's first run returned `[76, 118, 117, 120]`, every one of them predating
  the observer and belonging to Epic 14's known breach — arriving inside a
  measurement about something else entirely.

## The instrument you did not have until 2026-09-21

**Task 3.4.7 built a way to make a price arrive inside a browser**, and it is
the thing standing between this task and every figure it owes.

`security-price-motion.spec.ts`'s `serveFeed` answers the market socket
**entirely from the test** and hands back a `push` that sends a `bars` frame on
demand. CI has no credential, so before it there was no way for a runner to
reach a state where a price exists at all, let alone **changes**.

**Copy it rather than re-derive it**, and copy the limits with it:

- **It furnishes the wire, so it measures the browser's half and not the
  server's.** §28's clock starts at _server-received_; this instrument starts at
  _frame delivered to the page_. Say which half each figure is, because a number
  labelled as §28's when it is missing a gateway and a socket is worse than no
  number.
- **The burst IS reachable through it** — §7.4's **332 bars inside 243 ms** is a
  single `push` with 332 entries, which is the case that matters and the one a
  figure taken against one observation at a time says nothing about.
- **`[data-arrival]` is the handle** for the mark, and the mark's own cost is on
  the list below.

## Work

- **Instrument the p95 end to end**, at the two ends §28 names. The burst is the
  case that matters: **332 bars inside 243 ms**, once a minute (§7.4) — a figure
  taken against one observation at a time is a figure taken against the case
  that does not occur.
- **Long tasks and layout**, on a **production** build, with the observer
  unbuffered. The layout half is the one nothing else can see: assert that the
  price's box does not move when its digits change.
- **Record every figure with what it was taken against** — build, provider,
  speed multiplier, viewport. A figure without those is not re-measurable, and
  this repository's rule is _measure rather than cite_.

## Done when

- **250 ms p95 event → application state**, measured under a burst, recorded
  with its conditions
- **No routine main-thread task over 50 ms** attributable to this story, on a
  production build
- **No layout thrash**: the price's neighbours do not move when it changes **or
  when the mark fires**, asserted in a browser because nothing below one can see
  it — confirming Task 3.4.4's figure on a production build. **`[data-arrival]`
  is the handle**, and Task 3.4.5 measured the mark clearing the block's left
  edge by **142px** at all four widths against a development build
- **Both block heights are photographed**: since Task 3.4.6 the identity block
  is **88px** at 390 for an extended-hours price against **72px** for a
  regular-session one, because the word takes the qualifier to a second line.
  Only one of those has ever been through `pnpm probe`
- **The mark's rate is recorded**, so the reversal trigger's second clause has a
  number behind it rather than an argument
- **The animation's own cost is attributed**, on a production build. It is an
  `opacity` animation on an absolutely-positioned 8px element, so the expected
  answer is _nothing measurable_ — record it as a measurement rather than as an
  assumption, because _expected to be free_ is how a cost gets inherited by five
  stories
- Every figure carries what it was taken against
- `pnpm verify` passes

---

## What was measured

**Conditions, because a figure without them is not re-measurable.** Production
build (`pnpm build`, minified React), frontend served by `vite preview` on
`:4173`, backend `dist/index.js` on `:3000` with `CORS_ORIGIN` pointed at the
preview origin. Chromium via Playwright, one worker, 1280×720 unless stated.
Feed furnished from the test, **not** the gateway. macOS 14 / arm64,
2026-09-21.

### 1. Frame → price on screen, under the burst that actually happens

**20 bursts of 332 bars each — 6,640 observations** — which is §7.4's measured
shape rather than one observation at a time.

|           | p50     | p95         | max     |
| --------- | ------- | ----------- | ------- |
| **run A** | 35 ms   | **52 ms**   | 52 ms   |
| **run B** | 39.6 ms | **51.7 ms** | 51.7 ms |

Run A's twenty samples, verbatim:

```text
30.4, 30.6, 32.5, 32.7, 33.2, 33.4, 33.4, 33.4, 33.7, 33.7,
35, 35.4, 37.4, 38.1, 38.3, 38.8, 42.1, 45.6, 47.2, 52
```

**Against §28's 250 ms p95 this is a fifth of the budget** — and the figure is
an **upper bound** twice over: the `evaluate` round trip that stamps the send
sits on the _before_ side, and the whole thing is a cold-ish page under an
automation driver.

**Say which half it is.** §28's clock starts at **server-received**; this one
starts at **frame delivered to the page**. The gateway, the socket and the
network are **not in it**. What it does cover is the half this story built —
decode, reduce, gate, render — and that half has **200 ms of headroom** before
the other half needs to be cheap.

### 2. Long tasks: none, at any length

```text
"longTasks": [], "longTasksOver50": []
```

**Zero entries** from an **unbuffered** `longtask` observer across the whole
run. Not "none over 50 ms" — the observer's own floor is 50 ms, so an empty
array is the strongest thing it can say. §28's _no routine main-thread task over
50 ms_ is met and **this story adds no third exception** to the two Epic 14
owns.

**Unbuffered mattered.** Task 3.3.5's sweep recorded that `buffered: true`
returns the cold load, and its first run reported `[76, 118, 117, 120]` — all of
them Epic 14's known breach, arriving inside a measurement about something else.

### 3. Layout: nothing moves, and it is now a test rather than a figure

```text
"price":     [1083, 183,  99, 32]
"qualifier": [ 925, 219, 331, 16]
"label":     [1176, 163,  80, 16]
"block":     [ 925, 163, 331, 72]
"markPresent": true
```

Task 3.4.4 measured 0 shift at four widths in the workshop; this confirms it on
a production build with the mark **present**.

**The figure was replaced by an assertion**, which is the part worth keeping:
`an arrival moves nothing around the price` captures the four boxes, pushes a
new price **and** a new minute **and** the mark together — the only version
worth asserting, because that is what actually happens — and compares. A figure
says what was true once; this says what stays true.

### 4. Both block heights, on production

| At 390          | Height    |
| --------------- | --------- |
| regular session | **72 px** |
| extended hours  | **88 px** |

**Identical to Task 3.4.6's workshop figures**, which is the useful outcome: the
development build was not lying about this one.

### 5. The mark's rate, and the number Story 3.6 needs

**This surface: 1 mark per minute.** One security, one mark per bar arrival, and
§10.1 makes a bar a minute. That is arithmetic rather than a measurement and it
is recorded as such.

**The reversal trigger's second clause is _the first surface where it fires more
than once a second_.** Story 3.6 renders **518 rows**:

```text
518 rows × 1 arrival/minute ÷ 60 = 8.63 marks per second
```

**That is 8.6× past the trigger**, and it is now a number in that story's file
rather than an argument.

## Two things found while measuring, both worth more than the figures

### `routeWebSocket` replaces the page's `WebSocket`, so you cannot wrap it

The second draft of the instrument wrapped `window.WebSocket` from an
`addInitScript` to stamp frame delivery. **It never fired** — `delivered: 0`
beside `painted: 20`. Playwright's `routeWebSocket` installs its own
`WebSocket` in the page, **after** init scripts run, so the wrap is replaced
before the application constructs one.

Recorded because the next person measuring a socket will reach for exactly that.

### The layout break did NOT go red the first time

`CLAUDE.md`'s rule catching itself: _a break that does not go red is not evidence
the check works — it is equally evidence the break did not land._

The first version swapped the mark's `position: absolute` for `static`, which
leaves an **inline** `<span>` — and `width` and `height` **do not apply to a
non-replaced inline box**, so the mark collapsed to nothing and shifted nothing.
The test passed and proved nothing. `display: inline-block` is the version that
actually takes the 8 px, and it goes red.

## What was NOT re-measured, and why

**The task said to be pragmatic.** Three figures were already taken and none was
re-derived:

- **0 layout shift at four widths** (Task 3.4.4, workshop) — confirmed on
  production at one viewport plus the two 390 heights, rather than re-walked.
- **142 px / 169–226 px clearance** (Tasks 3.4.5, 3.4.6) — arithmetic about an
  absolutely-positioned box that cannot have changed, and the assertion now
  covers the property those figures were evidence for.
- **The animation's own cost** — the long-task run covers it. An `opacity`
  animation on an 8 px composited element inside 6,640 observations that
  produced **zero** long-task entries is the measurement; a separate one would
  have been the same empty array with a different title.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A price moves on its own, a dot says a fresh one
landed, a word says when it came from outside trading hours, and the two readers
who could have been excluded by all that are covered. **This task asked whether
any of it is slow.** It is not.

**The headline, in one line: we are using a fifth of our speed budget.**

We set ourselves a target early on — from a price arriving to the screen showing
it, under a quarter of a second. Measured against the **real production build**,
under the heaviest realistic load, it is **52 milliseconds**. Two separate runs
agreed.

**"Heaviest realistic load" is the part that makes the number worth having.** A
measurement taken with one price arriving at a time would have been a
measurement of the situation that never happens. Our data provider sends about
**332 prices in a quarter of a second, once a minute** — so that is what we sent
it, twenty times over: **6,640 price updates**.

**And the browser never stuttered once.** There is a standard way of asking a
browser "did anything block you for more than a twentieth of a second?", and
across the whole run the answer came back **completely empty**. Not "nothing
serious" — **nothing at all**.

**One honesty note we wrote into the record.** Our 52 milliseconds covers the
browser's half of the journey: from the price arriving at the page to the number
changing on screen. It does not include our server or the network. We said so
explicitly rather than let a good number be quoted as if it covered more than it
does — and the useful part is that the half we just built leaves **200
milliseconds of room** for the half we have not measured yet.

**We also stopped measuring something and started testing it instead.** We had a
figure saying the layout does not jump when a price changes. A figure says what
was true on a Monday. We replaced it with a test that pushes a new price, a new
minute and the dot all at once — what actually happens — and fails if anything
around the number moves by a pixel. That one is now permanent.

**Two mistakes worth reporting, because both were caught rather than shipped.**

The first: our first attempt at breaking the layout test on purpose — to check
the test actually catches a problem — **did not break anything**, because of a
quirk in how browsers size certain elements. A test that passes against a broken
version is worse than no test, so we found the version that really does break
it and confirmed the test goes red.

The second: an attempt to measure the timing more precisely **silently recorded
nothing at all** for a while, because our testing tool replaces a piece of
browser machinery we were trying to listen to. We noticed because the number of
recordings was zero, and wrote down why for whoever measures a live connection
next.

**One number handed forward.** The dot fires once a minute for one company. The
next piece of work puts prices on a table of **518 companies** — which is
**8.6 dots per second across one page**. We already had a written condition for
changing our minds about the dot: _the first surface where it fires more than
once a second_. That condition is now met with a number behind it, sitting in
that story's own notes rather than in an argument.

**What a user can see today: nothing new.** Numbers in a document, which is what
this task said it would produce.

---

## Amended by Task 3.6.2 — 2026-09-21: §5's figure was arithmetic wearing a measurement's clothes

**The number this task handed forward was wrong, and the way it was wrong is
the thing worth keeping.**

§5 said:

> `518 rows × 1 arrival/minute ÷ 60 = 8.63 marks per second`
>
> **That is 8.6× past the trigger**, and it is now a number in that story's file
> rather than an argument.

**It is an argument.** The division assumes a minute's arrivals are spread
across the minute, and they are not: **§7.4 measured 332 bars landing inside a
243 ms burst**, once a minute. So at 518 rows the mark fires **once a minute**
and paints for 900 ms of it — the page is **still for 59.7 seconds** and then
everything that traded marks together.

Task 3.6.2 took the duty cycle on the running table against a fixture stream
that marks **all 518 at once**, which is harsher than the real feed's ~62%: any
mark visible in **2 of 39 sampled seconds**.

### Why this task could not have caught it, and what it could have caught

**The arithmetic is not the error.** 518 arrivals a minute really is 8.63 a
second _on average_, and this task only ever had one row to watch — it could
not have seen the burst on its own surface.

**What it could have done is not called it a number.** The sentence that ages
worst is _it is now a number in that story's file rather than an argument_: a
division over a measured input is still a derivation, and this file's own
opening warns twice about figures taken the wrong way. **A derived figure
carries the assumptions of its denominator**, and the denominator here — _per
second_ — was the assumption that did the damage.

**The downstream cost was almost exactly what it was meant to prevent.** The
figure arrived in Story 3.6 as a written instruction to _read the trigger as
having fired unless you can show it has not_ — so the design pass started from
a presumption of guilt built on a division. It survived only because 3.6.2 went
back to §7.4 rather than to this line.

### What is unchanged, and it is most of the file

Every **measured** figure here stands: p95 **52 ms** and **51.7 ms** across two
production runs, **zero** long tasks across 6,640 observations, the block
heights at **72 px / 88 px**. §5's first sentence — _this surface: 1 mark per
minute_ — is also correct and is labelled as arithmetic, which is how §5's
second half should have been labelled too.

**One inference from those figures does not travel, and Task 3.6.2 found that
the hard way.** _Zero long tasks across 6,640 observations_ was taken on the
**security page**, which renders **one** row. On the universe table, with the
same reducer and 518 rows, Task 3.6.2 measured long tasks of **249, 265, 98,
117 ms** — and, with the mark not rendered at all, **216, 83, 102, 196,
195 ms**. The reducer is still not the cost; **the rendering is**, and that is a
property of the surface rather than of the stream.

---

## Amended by Task 3.6.3 — 2026-09-22: this task's figure turned out to be half of a controlled experiment

**The amendment above said one inference from these figures does not travel.**
Task 3.6.3 ran the other arm, and the pair now **isolates the variable** — which
is a better outcome for this task's record than the amendment it replaces,
because the figure stops being _a measurement that did not generalise_ and
becomes _half of a result_.

| Measurement                      | Observations per tick | Rows rendered | Long tasks             |
| -------------------------------- | --------------------- | ------------- | ---------------------- |
| **This task** (production build) | **332**               | **1**         | **none — empty array** |
| Task 3.6.3, arm B (dev build)    | **8**                 | **518**       | 127, 162, 172, 203 ms  |
| Task 3.6.3, arm A (dev build)    | ~518                  | **518**       | 263, 259, 237 ms       |

**Read the first two rows against each other.** Forty times the observations,
into one row, cost nothing an observer with a 50 ms floor could see. Eight
observations into 518 rows cost 166 ms. **The driver is rows, not
observations** — and that is the thing neither measurement could say alone.

**Arms A and B pin down how much is which**, and they share a build so the
comparison is clean: going from 8 observations to 518, with the row count
fixed, costs about **90 ms**. So roughly a third of the tick scales with the
data and the rest is fixed per tick, whatever arrived.

### The caveat, which is this task's own rule turned on itself

**The two builds are not comparable and this file says so twice.** _A
development build is not the product_ is one of the two ways it records for
taking these figures wrong — Task 3.3.5 measured 141 ms long tasks against
`pnpm dev` and **zero** against production.

So the cross-build row above is **suggestive rather than decisive**, and the
within-build pair is the load-bearing one. **Task 3.6.5 owns re-taking both
arms on a production build**, and until it does, _rows dominate_ is a finding
with a named weakness rather than a conclusion.

### And one number in this file's own words is now stale

> §28's _no routine main-thread task over 50 ms_ is met and **this story adds
> no third exception** to the two Epic 14 owns.

**The first half stands** — this story's surface is the security page, it was
measured on a production build, and it added nothing. **The second half is a
count of the world rather than a claim about this story**, and the world has
moved: the universe table's live re-render is a candidate third exception,
created by Story 3.6 rather than by this one.

It is **not** written into `PRODUCT_SPEC.md` §28 yet, and should not be on a
dev-build figure. Task 3.6.5 owes that decision and its own file already says
so.
