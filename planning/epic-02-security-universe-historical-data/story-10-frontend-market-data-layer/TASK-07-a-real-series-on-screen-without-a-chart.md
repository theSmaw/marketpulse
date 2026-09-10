# Task 2.10.7 — A real series on screen, and not a chart

**Status:** Not started
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
