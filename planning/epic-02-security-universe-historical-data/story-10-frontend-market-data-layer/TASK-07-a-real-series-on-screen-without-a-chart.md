# Task 2.10.7 — A real series on screen, and not a chart

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.6

## Objective

Put the layer in front of a person. Render one security's real bar series on the
Security Explorer as **stated facts rather than a drawing**, keyed on the URL, so
that everything from Task 2.10.1 to 2.10.6 is proved end to end against the
deployed store — and so that Story 2.12 inherits a working data layer rather than
discovering its defects while also choosing a charting library.

## What the user can see when this lands

**The second real market data this product has ever shown, and the first that is
a series rather than a single number.**

Concretely, on `/securities`: a compact market-data panel for one security that
states, from a real request against real bars — the symbol and timeframe; the
window we asked for and the window we actually hold; the number of bars; the
first and last bar's market timestamps; open, high, low and last close; and the
feed, labelled by the rule that already ships. And **the symbol comes from the
URL**, so the panel is deep-linkable and shareable before search exists.

What a user still cannot do: search for a security (Story 2.11), see any of this
drawn (Story 2.12), or change the window (Story 2.13). Say all three plainly.

## Why this is not Story 2.12's work

Because it draws nothing. Story 2.12 owns **the charting decision** — library or
hand-built, line or candlestick, how the x-axis handles market gaps — and this
task must take none of those. Its job is the opposite one: prove the _data_ is
right while it is still cheap to be wrong about, using the components and
vocabulary that already exist.

The scope fence, and it is a hard one: **no axis, no plotted line, no bars, no
sparkline, no canvas, no SVG series.** If the panel starts wanting one, that is
the signal to stop, because a sparkline added here is Story 2.12's decision taken
by accident on the smallest possible evidence.

## Work

- **The symbol lives in the URL**, in the shape Task 2.10.1 decided. This is
  open decision 3 being _exercised_ rather than only recorded: deep-linking
  already works and Epic 1 proved it against the deployed host, so the link must
  survive a reload, a back button and a share.

  > **Amended 2026-09-10 by Task 2.10.1 — the shape is settled and this task's
  > worked example was the other one.** `FRONTEND-STATE.md` §3 decided **the path
  > names the subject and the query names the view**, so the symbol is a path
  > segment — `/securities/NVDA` — and **not** the `/securities?symbol=NVDA` this
  > task was drafted with. Which means this task **declares the parameterised
  > route**, and that is not scope creep into Story 2.11: `paths.ts` already
  > records `/securities/:symbol` as the intended shape and says the route is
  > deliberately withheld only until there is something behind it, because "an
  > empty route with a parameter is a promise about a data shape this story has
  > no business making". This task is that something, arriving earlier than
  > `paths.ts` predicted. Story 2.11 still owns **search** — how a user gets to a
  > symbol without typing a URL — and owns nothing here beyond it.
  >
  > Read the segment in **one place** regardless. That was the original bullet's
  > real point and it survives the change of shape: a symbol read in five
  > components is five things to fix when Story 2.11 adds search above it.

  **Decide what happens with no symbol and with a symbol that is not tracked**,
  and neither is an error. No symbol is the ordinary case until Story 2.11 —
  choose a default and say, in the panel, that search arrives with Story 2.11,
  following Story 1.5's convention that an empty region names what fills it.
  An unknown symbol is a genuine 404 from the endpoint and gets a sentence, not a
  crash.

- **Reuse the vocabulary that already ships.** `FeedProvenance` and
  `packages/shared/src/market-provenance.ts` hold the shipped words and the rule
  for when a label needs a sentence beside it (ADR 0019 §3: a feed gets a
  sentence when its label cannot stand alone, so `iex` does and
  `ALL US EXCHANGES` does not). `PriceChange` exists. `Region` exists.
  **Story 2.14 owns provenance as a product-wide requirement**, including a
  series that names two feeds at once; this task owes the honest label for the
  one series it renders and must not build 2.14's system.

- **Numbers are set the way this product sets numbers.** Tabular figures and the
  alignment property Story 1.4 measured at a 14.3 px spread; market timestamps
  through `packages/shared/src/market-time.ts`, which is the one module allowed
  to convert them and is enforced by lint. A timestamp rendered in the browser's
  own zone is the same class of defect as a window resolved from the browser's
  clock, and it is just as plausible-looking.

- **This screen is held to the bar.** PRODUCT_SPEC.md §5.6 and
  `VISUAL-LANGUAGE.md`'s _The bar_ are acceptance criteria here, not polish: at
  the end of this task a screenshot has to look like a real, funded product. The
  four tests apply and two are genuinely at risk on a panel of numbers — _is
  there a moment in it worth showing somebody_, and _does it feel alive_. The
  motion tokens Task 2.4.4 defined exist and honour `prefers-reduced-motion`; use
  them for the arrival of the series rather than inventing a second vocabulary,
  and remember the constraint that came with them: **motion must not make a
  number harder to read.**

- **Colour is never the sole encoding.** The price palette differs by 1.05:1 in
  greyscale, so hue is the entire difference and shape, sign, glyph or word must
  carry it. `PriceChange` already obeys this; anything new here does too.

- **Check contrast against the page ground.** Task 1.12.4 found a real 2.09:1
  violation on exactly this kind of secondary label, where 4.5 is the threshold —
  and no test can see colour, because no stylesheet is applied in the test
  environment. A browser is the only instrument for this.

- **Measure the request end to end from the browser**, once, and record it:
  time to first paint of the panel, the transfer size with the coding negotiated,
  and whether a repeat visit revalidates or reuses. §11 predicts a `304` with no
  body on a revalidation and a five-minute reuse with no request at all for an
  absolute window inside closed sessions; this is the first chance to watch that
  happen from a real page rather than from `curl`.

## Done when

- A real series for a real symbol renders from a real request, seen on screen and
  screenshotted
- The URL carries the symbol **as a path segment**, declared in `paths.ts`,
  survives a reload and a share, and is read in one place
- No symbol and an unknown symbol both render sentences rather than failures
- The feed is labelled by the shipped rule, with a sentence where the rule says
  one is owed
- Nothing is drawn — no axis, no line, no sparkline — and the fence is stated in
  the component's header so the next reader does not have to infer it
- The four tests in `VISUAL-LANGUAGE.md`'s _The bar_ are applied and the
  judgement recorded rather than assumed
- Contrast is checked in a browser
- One end-to-end browser measurement is recorded, including whether the second
  visit hit the network
- `pnpm verify` passes

---

## Amended 2026-09-10 by Task 2.10.4 — what the panel is handed, field by field

The state union shipped. The panel takes a `BarSeriesView` **whole** — one prop,
not six — and renders the member it is given.

- **Six members**: `loading`, `loaded`, `partial`, `empty`, `refused`, `failed`.
  `tsc` refuses a `switch` that forgets one, which is the mechanism rather than a
  reminder.
- **Both windows are on `series.coverage`** — `requested` and, on `loaded` and
  `partial`, a non-null `covered`. The types are narrowed on those two members,
  so _"we have data through 15:42"_ needs no null check the reader cannot see the
  reason for. `partial` is the **normal** case for a window reaching towards now,
  not the exceptional one.
- **`refused` carries `message` and nothing else.** Show it verbatim: it is the
  server's own sentence, written for a person, and it names the cap's two
  numbers or the calendar's range. Do not re-word it, do not add a retry control
  beside it, and do not look for a `requestId` on it — there is deliberately
  none, because a refusal is not a failure the user is being told about.
- **`securityStatus` is on all three answer members**, and it is the field §7
  put on the envelope so a series for a security we no longer track can say so.
  The panel is the first thing that can.
- **`failed` carries `requestId`, `retryable` and `retrying`**, spelled exactly
  as `SecuritiesView` spells them, so the copy rule and the control from Task
  2.10.2 transfer unchanged. Two pages disagreeing about what a 503 means is the
  outcome that decision exists to prevent.
- **The feed comes off `series.provenance.sources`**, which is a list because a
  stitched series may truthfully name two feeds. Today both parts report `sip`;
  that is correct and it is not the steady state.

---

## Amended 2026-09-10 by Task 2.10.5 — the hook this task renders, and its two values

`useBarSeries` exists and leaves the module through `market/index.ts`, beside
`BarSeriesSource`. Four things about using it that are decided rather than open:

- **It returns `{ view, retry }`, not a bare union** — `SecuritiesSource`'s
  precedent. The panel takes `view` **whole** as a prop and renders the member it
  is given; the action travels beside it rather than on it, so the state stays
  comparable, serialisable and constructible in a story.
- **The request argument may be a fresh object literal on every render.** The
  hook keys on `barSeriesQuery(request)` rather than on object identity, so a
  route building `{ symbol, timeframe, window }` inline is the intended call
  shape and does not need a `useMemo`.
- **A held series paints in the first commit.** Returning to a security already
  looked at renders `loaded` immediately, with a request still in flight behind
  it. This task should not be surprised by that and should not design around it —
  Task 2.10.8 owns what the screen says about it.
- **Nothing here needs a `try` or an error boundary for a bad answer.** Every
  failure, including a body whose numbers disagree with each other, is already a
  member of the union.

---

## Amended 2026-09-10 by Task 2.10.6 — the fixture backend exists, and your tests should use it rather than invent bodies

There is now one home for recorded response bodies:
`apps/frontend/src/fixtures/`, outside `src/market/` because the module's lint
boundary would make anything inside it unreachable from a component test or a
story. Three things in it are yours:

- **`stubBarSeries(name)`** — installs a `fetch` stub answering every request
  with one of ten recorded bodies. `stubBarSeries("partial")` and render the
  panel is the whole arrangement. Names: `full`, `partial`, `empty`, `stitched`,
  `refusedCap`, `refusedCalendar`, `refusedUnknownSymbol`, `unavailable`,
  `incoherent`, `unknownFeed`.
- **`barSeriesFixtureView(name)`** — the same body as a `BarSeriesView`, built
  through the real `toBarSeriesView`. This is what a story should hold. **Do not
  hand-build a state**: a `partial` whose `covered` disagrees with its bars is a
  state this layer cannot produce, and a panel tuned against it renders the real
  one wrongly.
- **`stubFetch(respond)`** — the general form, whose handler is given
  `{ url, signal, index }`. Four test files were migrated onto it; do not write a
  fifth copy.

Two consequences for this task specifically.

**The panel's facts can be asserted against real numbers.** `full` is 30 bars
over exactly the half-hour asked for; `partial` is 60 bars whose `covered` stops
at a session boundary inside a wider `requested`; `stitched` is 150 bars naming
two provenance sources. Those are real NVDA prices from 2026-09-04 and 2026-09-08,
so _"the window asked for against the window held"_ has something true to be
checked against rather than a shape.

**You no longer clear the series cache in your own test file.**
`src/test-setup.ts` does it in the same `afterEach` as `cleanup()`. A file that
clears it itself protects that file and nothing else, which is exactly the state
`market/use-bar-series.test.ts` was in and no longer is.

One thing the fixture set cannot give you, recorded rather than assumed:
**`stitched.json`'s two sources name the same feed**, because both halves come
from Alpaca's historical API, which is SIP on this plan. A series naming two
_different_ feeds arrives with Epic 3's IEX socket. If this panel's provenance
line is written as though two feeds are the interesting case, it is being written
against something no server has yet sent — Story 2.14 owns that wording.

---

## Amended 2026-09-10 by Task 2.10.6 — the default window, measured against both stores, and what it will actually render

Recording the fixtures meant asking both stores what a default request returns,
and the answer bears directly on this task's _"choose a default and say so"_
bullet. **Measured 2026-09-10, 08:46–09:15 UTC**, `symbol=NVDA&timeframe=1m`:

| Window       | Local store                                  | Deployed store                                 |
| ------------ | -------------------------------------------- | ---------------------------------------------- |
| `sessions=1` | `empty` — `covered: null`                    | `empty` — `covered: null`                      |
| `sessions=2` | `empty` — `covered: null`                    | `empty` — `covered: null`                      |
| `sessions=5` | `partial` — 780 bars, covered to 09-04 close | `partial` — 1,170 bars, covered to 09-08 close |

Three things follow, and the first is a trap rather than a preference.

**A small default renders an empty panel on a store holding 48 million bars.**
`sessions=1` resolves to today's session, which has not opened; `sessions=2`
reaches back one more, which the nightly backfill has not taken yet. Both are
correct 200s and both look exactly like a broken data layer to whoever is
building this panel. If the default is one or two sessions, the first thing this
task puts on screen is the empty state — so **pick a default that has bars in it**,
and know that the reason is the backfill's cadence rather than anything here.

**`partial` is the state this panel will normally be in, and the state a demo
shows.** That is what Task 2.10.4 meant by _"the normal case rather than the
exceptional one"_, now with a number against it. The panel's _"we hold X of the
window you asked for, through T"_ line is not an edge case to be handled — it is
the main line of copy, and it should read as an answer rather than as an apology.

**`loaded` is a narrow condition through a named window, not the ordinary one.**
`requested.end` is always the _current_ session's close, so `covered` can only
equal it once the store holds bars through that close — which is true between the
nightly backfill and the next session's open, and was true at neither store when
this was measured. A screenshot showing `loaded` therefore wants an **absolute**
window ending at or before `covered.end`, which is also the honest thing for a
deep link to carry. Both are legitimate; they are just not the same screen, and
this task should know which one it is showing before it takes the screenshot.

None of this is a reason to resolve a window from the browser's clock — that
remains forbidden, and the server still reports back what it meant in
`coverage.requested`.

---

## What was done — 2026-09-10

**The first price series MarketPulse has ever put on screen.** A real symbol, a
real request against the real store, and no picture at all.

### 1. The URL, and one table for destinations and another for patterns

`/securities/:symbol` is declared in `ROUTE_PATTERNS`, **not** in `PATHS`, and
that split is a decision rather than tidiness. Everything in `PATHS` is a
**destination** — a string you can put in a `<Link to>` or type into an address
bar. `/securities/:symbol` is a **pattern**: it matches destinations and is not
one.

The cost of conflating them was measured rather than guessed. **Six places walk
`PATHS` as a list of real destinations**, and `App.test.tsx` alone does it four
times — once asserting that every route has a **distinct `<h1>`**. A pattern in
that table either fails that assertion, because this route and `/securities`
render the same screen and correctly share a heading, or forces it to be
weakened with a carve-out. Weakening a check that has already caught a real
defect, to admit a value it is not about, is the wrong trade.

`securityPath(symbol)` builds a destination and is the only thing that does.
It `encodeURIComponent`s once, because a ticker is not always the bare
alphanumeric it looks like — the universe holds class shares the vendor spells
with a dot — and a symbol that would otherwise open a second path segment
cannot.

**The segment is read in exactly one place**, `routes/use-security-symbol.ts`,
which is the half of the original instruction that survived the shape changing
from `?symbol=` to a path segment. It owns the two degenerate spellings a
hand-typed URL produces and a route match cannot rule out — an empty segment and
one of only whitespace — and treats both as _the address did not name one_,
because asking the server about `""` gets a 400 about a malformed ticker where
the honest answer is that nothing was asked for.

It deliberately does **not** upper-case or repair a symbol that is merely
unusual: `/securities/nvda` is a real request for a security spelled `nvda`, and
the server answers it — with a 404 naming the input — which is a better answer
than this client silently changing what the reader typed and reporting on
something else.

### 2. No symbol and an unknown symbol, neither an error

**No symbol** resolves to NVDA and the panel says so: _"Showing a default
security. Search arrives with Story 2.11; until then, a security's page is
reachable at `/securities/SYMBOL`."_ NVDA because it is PRODUCT_SPEC.md's own
running example — §12's anomaly, §20's investigation and §38's demo — so the
default is the product's vocabulary rather than a developer's favourite ticker.

**A redirect to `/securities/NVDA` was rejected**: it puts a symbol nobody asked
for into the address bar and therefore into the history, so the back button
leaves the page instead of undoing the redirect.

**An unknown symbol** is a 404 from the endpoint, which this layer treats as a
`refused` — a well-formed answer about the request. The panel renders the
server's own sentence verbatim, offers no retry and shows no correlation id, and
the universe table below it is untouched.

### 3. The default window is five sessions, and it is a measured choice

`DEFAULT_SESSIONS = 5`, named rather than inlined, and Task 2.10.6's measurement
is why. A named window always reaches to the **current** session's close and the
store is caught up nightly, so `sessions=1` and `sessions=2` are both `empty`
with a null covered range — on the local store **and** the deployed one — which
is a correct 200 that looks exactly like a broken data layer. Five reaches back
past the backfill's edge and has bars in it.

**The window is named and never resolved here**, and a browser test asserts that
as an **absence**: no `start=` or `end=` in the URL. A client that computes "the
last five sessions" from its own clock is off by one session for roughly half the
world for several hours of every day, and produces a chart that is plausible and
shifted rather than an error anybody sees.

### 4. What the panel says, and the fence

`components/BarSeriesPanel/` — the union taken **whole** as one prop, an
exhaustive `switch`, and no fetch of its own.

|                 |                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| The headline    | The close at display size, with the move across the held bars beside it                                                        |
| The answer      | _"Holding 780 bars, through 2026-09-04 16:00:00 EDT — less than the window asked for, which runs to 2026-09-10 16:00:00 EDT."_ |
| The four prices | Open, high, low, close as a strip — figure large, label beneath                                                                |
| The windows     | Asked for, held, bars × timeframe, first → last, on one aligned label column                                                   |
| Provenance      | `Market feed · All US exchanges`, from `MARKET_FEED_DESCRIPTIONS`                                                              |

**A complete answer says it holds all of it rather than saying nothing.** Silence
there would make _"we hold all of it"_ and _"nobody checked"_ look identical,
which is the exact distinction this panel exists to make visible.

**The fence is asserted rather than stated**: a component test and a browser test
both check there is no `canvas` and no `svg` in the panel. Story 2.12 owns the
charting decision, and a sparkline added here would be that decision taken by
accident on the smallest possible evidence.

The arithmetic and the formatting live in `series-facts.ts`, tested with exact
numbers against the recorded fixtures. Two things there are decisions rather
than code: `seriesPrices` is a **loop and not `Math.max(...bars.map(…))`**,
because the spread form applies the array as _arguments_ and a cap-sized
10,000-bar series is an argument list long enough to throw
`RangeError: Maximum call stack size exceeded` — a crash whose frequency depends
on the window the reader chose. And the half-open window's end is rendered **as
it is stored**, exclusive, rather than decremented to 15:59:59 to look inclusive:
that would invent a second vocabulary and make two adjacent windows look like
they overlap.

### 5. The visual bar, and the defect measuring it found

**A real contrast violation, found in Chrome and fixed.** The first version put
the synthetic feed's amber on the **word**. `--palette-amber` (`#e2b544`)
measures **1.92:1** against this panel's white ground where 4.5 is the threshold
— the same defect `FeedProvenance` was caught by at 1.73:1 against the page
ground, in the same place, for the same well-meant reason. The intention is
right and ink below the floor is the wrong mechanism for it. It moved to the
marker; the word carries strong-weight primary ink and the sentence carries the
meaning in words. **Getting this wrong means a screenshot of invented prices
circulating as if it were the market**, which is why it is the one colour on this
panel worth a measurement rather than a glance.

Everything else measured in Chrome, on the panel's white ground: symbol, close
and every figure **17.04:1**; every secondary label and sentence **6.66:1**. The
error red is 5.90:1 and would clear the floor as text — it is on the **marker**
anyway, as a judgement rather than a contrast fix: §36 makes a briefly
unavailable service a product state, and a sentence in red at body size reads as
an alarm about the page.

**The `Marker` bug worth recording**, because it is silent: `Marker` reads
`--marker-color` off its inherited context and owns no colour of its own. Every
row holding one has to set it. The first version did not, and the markers
rendered **invisible** — no error, no warning, correct DOM, and nothing in
`pnpm verify` can see it. Four components already do this correctly; this is the
fifth.

The four tests from `VISUAL-LANGUAGE.md`'s _The bar_, judged by a person rather
than asserted:

- **Would a stranger believe it is a real funded product?** Yes. The mono
  figures, the aligned windows and the hairline rules read as a terminal.
- **Designed rather than defaulted?** Yes — the hierarchy carries it: one figure
  at display size, one sentence at body size, everything else dense and quiet.
  No colour, no boxes, no badges.
- **Is there a moment worth showing somebody?** The close and the move, with the
  coverage sentence directly beneath. **"Asked for" against "Held" is the
  distinctive part**: most products would hide the difference, and stating it is
  the whole argument of this layer.
- **Does it feel alive?** The weakest of the four, and the one that needed work.
  The series now enters with `UniverseTable`'s `arrive` — four pixels and a fade,
  once, before anybody is reading. Four reads as content settling and twenty
  reads as a slide transition, which is the first thing a stranger would identify
  as templated. The skeleton's breathe was also **too fast** in the first
  version: it used `--motion-duration-settle` directly where the table derives
  `× 6`, so the two loading states on one page breathed at different rates.
  Both durations resolve to `0ms` under `prefers-reduced-motion` at the token
  layer, so neither file names the media query.

### 6. The end-to-end measurement, and one finding in it

Measured in Chrome against the local pair, `AMD`, `1m`, `sessions=5`:

|                         |                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Identity body           | **87,865 bytes**                                                                                    |
| On the wire             | **15,355 bytes** — `content-encoding: gzip`, 5.7×                                                   |
| `Cache-Control`         | `private, no-cache` — a **named** window gets no lifetime, exactly as `MARKET-DATA-API.md` §11 says |
| `ETag`                  | `W/"8RjZnH7-qyBqgG8y7ln7baQD-xQ"`                                                                   |
| Revalidation            | `If-None-Match` → **304, 0 bytes**                                                                  |
| First request, in-page  | 30.6 ms                                                                                             |
| Repeat request, in-page | 10.4 ms                                                                                             |

**And the finding: the `ETag` is on the wire and is not readable by the page's
JavaScript.** `access-control-expose-headers` names `x-request-id` and nothing
else, so a cross-origin `fetch` reads `null` for it — and `transferSize` reads
`0` for the same reason, since Resource Timing zeroes cross-origin sizes without
`Timing-Allow-Origin`.

That is not a defect and it is worth writing down: it means **no frontend code
could implement its own revalidation over these URLs even if it wanted to.**
`FRONTEND-STATE.md` decided to leave freshness entirely to the browser and the
server's five-minute ceiling; this makes that decision structural rather than a
preference. The browser's own cache operates below CORS and uses the `ETag`
normally — the 304 above is that happening.

**One event observed and chased down rather than dismissed**: the browser's
network log showed a `503` followed by a `200` for the same URL. Twenty
sequential and twelve concurrent requests then produced twenty and twelve 200s,
so it was the dev loop's own backend restart after a file edit catching a request
mid-restart, not a defect. Recorded because a 503 in a market product is the sort
of thing that should never be waved past.

### 7. What else moved, and one sentence that had gone false

- **`SecurityExplorer.test.tsx`'s stub now routes by URL.** The page makes _two_
  requests, and a stub answering every URL with the universe body put the panel
  into `unreadable-body` carrying the same correlation id the table was showing —
  which broke the reference assertion with "found multiple elements", naming
  neither the panel nor the reason. This is the hazard `stub-fetch.ts`'s own
  header warns about, arriving the day after it was written.
- **The universe region's `filledBy` had gone false.** It said _"Prices, volume
  and charts arrive with the live market feed in Epic 3"_ while the table has
  shown a real last close and change since Story 2.9, and now sits under a whole
  series. Corrected to name what is there and what is not; grepped for copies and
  there are none.

### Done when — checked

| Criterion                                                                               | How                                                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A real series for a real symbol, from a real request, seen and screenshotted            | §1–4; NVDA and AMD, 780 real bars, screenshotted                                            |
| The URL carries the symbol as a path segment, declared in `paths.ts`, read in one place | `ROUTE_PATTERNS.security`, `use-security-symbol.ts`; deep link and reload checked in Chrome |
| No symbol and an unknown symbol both render sentences                                   | §2; both checked in Chrome and in the browser suite                                         |
| The feed is labelled by the shipped rule, with a sentence where one is owed             | `MARKET_FEED_DESCRIPTIONS`; `All US exchanges` correctly has none                           |
| Nothing is drawn, and the fence is stated in the component's header                     | §4; stated **and** asserted at two levels                                                   |
| The four `VISUAL-LANGUAGE.md` tests applied, judgement recorded                         | §5                                                                                          |
| Contrast checked in a browser                                                           | §5; a real 1.92:1 violation found and fixed                                                 |
| One end-to-end measurement, including whether the second visit hit the network          | §6                                                                                          |
| `pnpm verify` passes                                                                    | Exit 0 — 237 + 650 + **359** frontend tests, plus 14 process tests                          |

`pnpm e2e` also passes — 35 tests, including the four new ones in
`e2e/specs/security-series.spec.ts` and the three existing axe runs at three
viewports, which now cover this panel.

---

## For the stakeholders — a status report in plain English

### What changed today

**MarketPulse can show you a company's actual price history.** Until this
afternoon it could show you a list of 518 companies and what each one last closed
at. Now you can open one and see what it did across a whole trading window —
opening price, high, low, close, the move in percent, and exactly which minutes
we hold.

You can also **link to it**. `…/securities/AMD` is a real address: send it to a
colleague and they land on AMD.

### What it deliberately does not do

**It does not draw a chart**, and that is a decision rather than an unfinished
job.

The chart is the next story, and it comes with real questions — which drawing
library, line or candlestick, and how the horizontal axis handles the gaps
between trading sessions and over weekends. Those are much easier to answer
against a data layer already known to be correct than while debugging both at
once. So this task proves the _data_ while it is still cheap to be wrong about,
and hands the chart story something it can trust.

The fence is enforced rather than promised: two automated tests fail if anyone
adds so much as a small graphic to this panel.

### The honest number, which is the interesting part

The panel says something most products would hide:

> Holding 780 bars, through 2026-09-04 16:00:00 EDT — less than the window asked
> for, which runs to 2026-09-10 16:00:00 EDT.

We asked for five trading sessions and we have four and a bit. That is normal:
our price history is topped up overnight, and the free data plan withholds the
most recent quarter of an hour. The tempting alternative is to show the four
sessions we have and say nothing — the screen would look cleaner and every number
on it would still be true.

It would also be quietly misleading, and in a product whose whole purpose is to
be trusted about numbers that is the expensive kind of clean. So the panel always
shows both windows: what you asked for, and what we actually have. **A short
answer is presented as an answer, not as an error** — no red, no warning
triangle, just the fact.

### A real defect this task found in itself

The panel marks data that came from a simulator rather than the real market —
that matters, because a screenshot of invented prices circulating as though it
were the market is a genuinely bad outcome. The first version used an amber
colour on the word to flag it.

Measuring it in the browser showed that amber against white is **1.92:1**, where
the accessibility floor is 4.5:1. It was, in practice, hard to read — and this
repository had already made exactly this mistake once before, in the same place,
for the same well-meant reason.

The fix is the one the design language already prescribes: **standing out is a
job for weight and hierarchy, not for faint ink.** The warning now sits in the
shape of the marker, the weight of the word and a plain sentence, with the colour
as a fourth channel on a decorative dot. Three of those four survive being
printed in black and white.

Worth saying plainly: **no automated test can catch this.** Colour is invisible
to the test suite by design. It was found by opening the page in a browser and
measuring it, which is why that is a required step rather than a nice-to-have.

### One thing we now know about our own plumbing

While measuring how much data crosses the wire — 87,865 bytes of prices
compressed to 15,355, and a repeat visit answered with _nothing changed_ and an
empty body — we found that the browser deliberately hides the freshness marker
from the page's own code, for security reasons.

That sounds like a limitation. It is actually a confirmation: it means our
frontend **could not** run its own competing cache over this data even if a
future developer wanted to. The decision to let the browser handle freshness,
taken earlier in this story on judgement, turns out to be enforced by the web
platform itself. Those are the best kind of decisions to discover you have made.

### What you still cannot do

There is no search box — you reach a security by typing its symbol into the
address, or by reading the table underneath. There is no chart. There is no live
price. Those are the next three stories, in that order.
