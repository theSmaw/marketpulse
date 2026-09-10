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

- **The symbol lives in the URL**, in whatever shape Task 2.10.1 decided. This is
  open decision 3 being _exercised_ rather than only recorded: deep-linking
  already works and Epic 1 proved it against the deployed host, so a link to
  `/securities?symbol=NVDA` (or the decided shape) must survive a reload, a
  back button and a share. Story 2.11 replaces typing it with search and may move
  it to a path segment; that is a change to one module if this task keeps the
  read in one place, and a change to five if it does not.

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
- The URL carries the symbol, survives a reload and a share, and is read in one
  place
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
