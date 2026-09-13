# Volume and the time window — what this product offers, and what it is spelled in

**Subject document for [Story 2.13](STORY.md).** Created 2026-09-12 by Task
2.13.1, which settles what the window control offers before anything is drawn;
finished by Task 2.13.10.

This is not a section of
[`CHARTING.md`](../story-12-price-chart/CHARTING.md). That document is how this
product **draws**, and half of what is settled here is a window vocabulary that
Epic 8 reuses, Epic 11 pushes with `setTimeWindow`, and Epic 13 deliberately
distinguishes its own scrubber from. Where the chart layer itself learns
something, `CHARTING.md` gains an amendment.

---

## 0. What was already decided, and is restated only so nobody goes looking

Four rules arrive here settled, each recorded with its argument somewhere else.
They are not re-taken below; where a decision here is a consequence of one, it
says so.

- **The window lives in the URL and the address is never rewritten into a
  different form** —
  [`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  §3. `?sessions=5` means _the last five sessions_ when somebody opens the link
  tomorrow. The **strings** are §4's; the rule is not.
- **The window is never resolved from the browser's clock.** `sessions=N` goes
  on the wire and the server resolves it against the market date, because a
  browser in Singapore at 09:00 local is on the previous market date in New
  York. `bar-series-query.ts`'s header carries the argument, and `SeriesWindow`'s
  shape — a union whose named member holds no instants — is what enforces it.
- **A window change is the same event as a symbol change** to the fetch layer: it
  changes `barSeriesQuery(request)`, which is both the cache key and the request.
  `useBarSeries` already supersedes the request in flight, resets to the new
  key's held entry or to `loading`, and never paints the previous window's series
  under the new window's label. **This story writes no cancellation code.**
- **The cap is 10,000 bars and it is refused rather than reduced**, with a 400
  naming the number. The refusal already has a rendering which carries the
  server's sentence verbatim and correctly offers **no retry**.

---

## 1. Decision 1 — which windows, and what each one costs

### 1.1 The four costs, taken rather than cited

The story names a defensible set — 1 day, 5 days, 1 month, 3 months, 1 year —
and the task's instruction was to check each against four things before
accepting it. Here they are, in one table, for a market date of **2026-09-11**
(a Friday, after the close). The session counts and minute-bar counts were
**re-taken on 2026-09-12** through `lastMarketSessions` and the sessions' own
`minuteBars`, not read off another document.

| Window      | Sessions |  `1m` bars | `1d` bars | Against the 10,000 cap |
| ----------- | -------: | ---------: | --------: | ---------------------- |
| 1 day       |        1 |        390 |         1 | inside                 |
| 5 days      |        5 |      1,950 |         5 | inside                 |
| 1 month     |       21 |  **8,190** |        21 | inside, 1,810 to spare |
| — 25        |       25 |      9,750 |        25 | inside, 250 to spare   |
| — **26**    |       26 | **10,140** |        26 | **refused at `1m`**    |
| 3 months    |       63 |     24,570 |        63 | **refused at `1m`**    |
| 1 year      |      252 |     97,920 |       252 | **refused at `1m`**    |
| whole depth |      672 |          — |       672 | inside at `1d`         |

**So the `1m` cap is 25 sessions, and 26 is the first refusal.** That reproduces
[`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md)'s
arithmetic from the other end, and it is the number the timeframe mapping in §2
is built around.

**What is actually stored**
([`BARS.md`](../story-08-historical-bar-ingestion-and-storage/BARS.md) §2 and
§8.16): `1m` for **one year — 251 sessions, 47,682,213 rows**; `1d` for **672
sessions**, bounded at 2024-01-01 by the calendar. That bound is option A of
BARS §2, taken deliberately, and it **grows on its own** as the calendar's range
is walked forward. There is no third timeframe and `PROVIDER.md` §9.4 forbids
deriving one from the other, because a vendor's daily bar is the official
session OHLC including auction prints and a daily bar summed from our minute
bars would be _a different and worse number_.

**What each window costs on the wire**, from `MARKET-DATA-API.md` §12.8's
deployed, gzipped readings:

| Access pattern               |     Wire | Miss         |
| ---------------------------- | -------: | ------------ |
| `1m`, one session            |   7.4 kB | 333 ms       |
| `1m`, five sessions          |  29.1 kB | 399 ms       |
| `1m`, one month              | 154.5 kB | **1,210 ms** |
| `1d`, the whole stored depth |  16.4 kB | 456 ms       |

**What each window costs to draw.** `timeAxis` walks the trading calendar day by
day and `PriceChart` calls it twice per render (`CHARTING.md` §15.3, §16.5).
Re-taken 2026-09-12 in this repository's own frontend runner, 200 iterations
after 50 warm-up calls, at the windows **this** document proposes rather than at
the ones §16.5 sampled:

| Window                   | Sessions | Timeframe | Per call      | **Per render (×2)** |
| ------------------------ | -------: | --------- | ------------- | ------------------- |
| 1 day                    |        1 | `1m`      | 0.058 ms      | 0.1 ms              |
| 5 days — today's default |        5 | `1m`      | 0.222 ms      | 0.4 ms              |
| 1 month                  |       21 | `1m`      | 0.735 ms      | 1.5 ms              |
| **3 months**             |       63 | `1d`      | **2.858 ms**  | **5.7 ms**          |
| **1 year**               |      252 | `1d`      | **8.500 ms**  | **17.0 ms**         |
| whole depth              |      676 | `1d`      | **22.764 ms** | **45.5 ms**         |

**This is an independent re-take and it corroborates §16.5 to within 4%** —
0.222 against 0.202 at five sessions, 8.500 against 8.762 at a year, 22.764
against 23.051 at the depth. Three measurements of one algorithm on two
machines in two runtimes now agree, which is what makes it a property of the
walk rather than of a laptop.

### 1.2 Decided: **1D, 5D, 1M, 3M, 1Y. Five windows, and no "max".**

Each is justified by the rows above rather than by taste.

- **5D stays the default** and is unchanged from what `SecurityExplorer.tsx`
  already sends. 1,950 bars, 29 kB, 0.4 ms of calendar. Nothing about it is
  reopened.
- **1M is the widest window at minute resolution, and it is deliberately not the
  widest window the cap permits.** 21 sessions is 8,190 bars with 1,810 to
  spare; 25 sessions is 9,750, which is 97.5% of the cap. A window sized to the
  cap is a window that starts being refused the first time the cap moves, a
  session's minute count is revised, or the store begins holding an extended
  session. 21 is also simply what "one month" means in sessions. The cost is the
  wire — **1,210 ms and 154 kB** — which makes 1M the window Task 2.13.2's
  transition design is actually about.
- **3M and 1Y are `1d` windows because they cannot be anything else.** 63
  sessions of minute bars is 24,570 and 252 is 97,920; both are refused. This is
  not a preference expressed as a mapping, it is the cap expressed as one.
- **1Y is the window that fires `CHARTING.md` §16.5's trigger** — _the first
  window control offering a range wider than three months at `1d`_ — at 17.0 ms
  per render, a third of §28's 50 ms budget, before a pixel. **So Task 2.13.3's
  memoisation of the walk in `packages/shared` is a precondition of shipping 1Y,
  not an optimisation to follow it.** It pays three callers, including the
  server's 20.6 ms on every cache hit, and it is explicitly not a `useMemo` in a
  component, which would fix one caller of three.

  > **Landed 2026-09-13 by Task 2.13.3, and the precondition is met.** The walk
  > is memoised in `packages/shared` — on a **market date** inside
  > `marketSessionOn` rather than on a window, because
  > `MARKET-DATA-API.md` §12.4 had already attributed the cost to constructing
  > each session's two instants rather than to walking the days, and a per-date
  > memo therefore pays every walker in both applications. **1Y is 0.8 ms per
  > render instead of 17.0, and the server's cap check is 0.9 ms on a cache hit
  > instead of 20.6.** The figures are re-taken in full in the task file and in
  > `CHARTING.md` §16.5's dated amendment; the one qualification worth carrying
  > here is that the **first** walk of a set of dates still costs what it always
  > did (~9.5 ms for a year, once per process), so what the repair removed is the
  > repetition rather than the walk.

**"Max" is declined, and for three reasons rather than one.**

1. **It has no honest label.** 672 sessions of `1d` and 251 of `1m` are
   different maxima and neither is "everything" — the `1d` store stops at
   2024-01-01 because the calendar does, and the `1m` store holds one year. A
   control that says "max" and means "as far back as a checked-in holiday table
   happens to reach" is teaching the reader something false about the product.
2. **Its meaning changes nightly.** The `1d` depth grows on its own as the
   calendar is walked forward, so "max" is a label whose span is different every
   morning. §4's rule is that the label says the approximation and the sentence
   says the fact; "max" has no approximation to say.
3. **It costs 45.5 ms of a 50 ms budget per render and 20.6 ms on the server per
   cache hit.** After 2.13.3 the client half of that is paid once per window
   rather than per render and per resize tick — so this is the weakest of the
   three reasons and it is listed last deliberately. The first two do not
   improve with a memo.

**Reversal trigger for the set:** the first feature that needs more than a year
of one security on screen at once. Epic 5's baseline is 60 trading days and
§11's percentile is 60 trading days of five-minute returns — both inside 3M — so
the likely first is Epic 13's replay session picker, which is a different
control with a different meaning and should not become this one.

### 1.3 The interesting one: **1D, which today is reliably `empty`**

This is the window the task asked to be explicit about, and the honest statement
is uncomfortable enough to be worth making plainly.

A named window always reaches to the **current** session's close. The store is
backfilled nightly, the free Alpaca plan refuses the most recent ~15 minutes,
and there is no live tail until Epic 3. So `sessions=1` resolves to today's
session, of which the store holds nothing between the opening bell and that
night's backfill — a correct `200` with `bars: []`, which is exactly why
`DEFAULT_SESSIONS` is 5 and why the argument for it is written at
`SecurityExplorer.tsx`'s call site.

Three options were weighed:

- **Redefine 1D as "the most recent session with data."** Rejected outright. The
  client cannot know which session has data without asking, so this is either a
  clock read (forbidden, §0) or a second round trip; and it makes the control's
  own vocabulary lie — "1 day" would name a different date depending on the hour
  and on whether a backfill had run, while the address said the same thing.
- **Withhold 1D until Epic 3.** Defensible, and its cost is that the product's
  narrowest offer would be a week, which is wrong for an application whose
  anomaly model is built on five-minute returns, and that a control which grows
  a button between epics is a control whose muscle memory changes under the user.
- **Offer it, and let it be `empty`.** Chosen.

**Decided: 1D is offered, is never the default and is never preselected.** The
reasons are that `empty` is a first-class correct answer this product has
already built and argued for rather than a failure; that the empty rendering is
`CHARTING.md` §14's treatment at coverage zero, which already states the window
that was asked for and shows the whole frame as uncovered; and that Epic 3 turns
1D from the emptiest window into the most-used one with no change to this
control at all.

**Reversal trigger, and it is a condition somebody has to actually look at:** if
Task 2.13.7's rendering of `empty` at 1D reads as a broken product rather than
as an honest one **when a person looks at the screen**, 1D is withdrawn until
Epic 3's live feed lands. That judgement is deferred to the task that can see
it, not taken here, and it is written down so that it is a decision rather than
an oversight. `CHARTING.md` §12.6's lesson applies directly: a simulation passed
against a chart a person could see was wrong.

---

## 2. Decision 2 — the timeframe is derived, not chosen

**Decided: the user never picks a timeframe. The window picks it, and the
mapping has one home.**

Two things make this less of a coin-flip than the story's framing suggests.

**The timeframe is already user-visible, so "expose it" is not the question.**
The panel's stated facts name it and `chart-alternative.ts` speaks it aloud. The
open question was only ever whether it is a **control**, and a second control is
a different thing from a visible fact.

**A timeframe control would ship a pair of controls whose combinations are
mostly 400s.** Five windows × two timeframes is ten combinations, and **three of
them are refused** — 3M, 1Y and anything wider at `1m` are 24,570, 97,920 and up.
The cap's refusal exists to report a request the product could not have known
was too large; making it the routine outcome of a normal click on a control the
product itself drew is the opposite of that. An analyst does want resolution
control, and the honest way to give it is a richer vocabulary of _windows_,
not a second axis that mostly refuses.

### 2.1 The mapping, and the property it buys

> **`sessions ≤ 21 → 1m`. `sessions > 21 → 1d`.**

Check the boundary against the cap rather than trusting it: 21 × 390 = **8,190**,
and that is an upper bound in the only direction that matters, because a half
day is **210** minute bars rather than 390 — a window containing one is
_smaller_, never larger. Above the boundary every window is one bar per session,
and the whole calendar is about 1,258 sessions against a cap of 10,000.

**So no value of `sessions`, from any source, can produce a `too-large`
refusal.** That is the interesting consequence and it is worth stating as a
property rather than leaving to be noticed: the derivation is not only a product
convenience, it is the thing that makes the cap structurally unreachable through
the named window form. §6 records what remains reachable and how.

### 2.2 Where it lives

**One function, in `apps/frontend/src/market/time-window.ts`** — a new module
holding the window list, the labels, the query spelling and this mapping
together, exported through `market/index.ts` and importing `SeriesWindow` from
`../bar-series-query.js` exactly as `use-bar-series.ts` already does. Not a `?:`
at a call site, and not two copies: a mapping spelled at the control and again
at the request is the pair that disagrees the day a boundary moves.

It is deliberately **not** in `packages/shared` today. Nothing outside the
frontend reads it, and `CLAUDE.md`'s rule is not to scaffold ahead of the
iteration that needs it. **Reversal trigger: the first non-frontend caller** —
almost certainly Epic 11's `setTimeWindow`, which is schema-validated on the
backend — at which point the module moves to `packages/shared` whole rather than
being copied.

Task 2.13.3 confirms the placement when it writes the module; if `market/`'s
lint boundary makes it awkward, the decision that matters is _one home_, not
_this path_.

### 2.3 The obligation this creates, and it is a real one

**`chart-alternative.ts` carries two `1d` branches that have never executed.**
`intervalWord` yields _"trading session"_ and `slotWord` yields _"sessions"_, and
all fourteen recorded bodies are `1m`, so nothing in this repository has ever
read either aloud (`CHARTING.md` §17.5 item 5). **The day 3M ships, the product
starts speaking sentences nobody has heard.**

So this decision carries a deliverable rather than only a mapping: **record a
`1d` response body as a fixture** and put a story in the workshop that renders
it, for the reason 2.12.5 recorded `dense` and 2.12.7 recorded `uncovered` — a
state a story cannot render is a state nobody reviews. That belongs to Task
2.13.4 or 2.13.7, and it is named here so it is inherited rather than
discovered.

---

## 3. Decision 3 — the window means what it says, and the store answers with what it has

The story asks whether an intraday window shows a partial current session. On
this store the question is nearly moot and saying so plainly is more useful than
inventing an answer: there is no live tail until Epic 3, the plan refuses the
most recent ~15 minutes, and the backfill runs nightly. So the real question is
**what a window reaching into today means when the store does not hold today.**

**Decided: nothing special. The window always means the last N sessions to the
current session's close, and a shortfall is reported by the machinery that
already reports shortfalls.**

That machinery exists and is not being built here. `coverage.requested` says what
the window meant; `coverage.covered` says what was answered; `CHARTING.md` §14's
rule draws the difference — _a mark derived from the window runs the full frame;
a mark derived from the bars stops at the coverage edge_ — so the uncovered
ground, the coverage edge and the sentence beneath the chart all already say
"this window is not fully held", without a clock and without new copy.

The alternatives and why they lost:

- **Shorten the window client-side to the last session with data.** Needs the
  market date, which the browser cannot supply correctly (§0), and it makes the
  address lie: a link saying `?sessions=5` would mean four sessions on the
  sender's screen and five on the recipient's.
- **Add a wire form meaning "the last N sessions that have data".** A new window
  form, on the wire, for a condition Epic 3 removes — and one whose shared link
  means a different span depending both on when it is opened and on whether a
  backfill has run. That is two moving targets in one address.

**The two stores photograph differently and both are correct**, which
`CHARTING.md` already records and which this decision inherits rather than
repairs: the deployed store is backfilled nightly and answered the default
window in full at the close, while a developer's answers it four-fifths short.
The deployed environment is therefore the one place the coverage treatment is
_not_ under observation, and a screenshot from either is a true picture of that
store.

**§36's "Live feed disconnected — displaying data through 10:42:17" is Epic 3's
sentence and Story 2.14's rendering, and this story must not invent it.** What
this story owns is that the coverage sentence already says the same thing
without naming a clock.

**Reversal trigger: the first live tail on this chart.** At that point "a
partial current session" stops being an artefact of when the backfill last ran
and becomes a real, moving product state with a real edge — and it acquires the
sentence above, from Story 2.14 and Epic 3 rather than from here.

---

## 4. Decision 4 — the vocabulary, in three places at once

A window is named on a control, in an address and in a sentence read aloud. The
three must agree, and the cheapest way to make them agree is to write them down
together, once.

| Window   | Control label | Accessible name | Address         | Spoken in the alternative       | Timeframe | Sessions |
| -------- | ------------- | --------------- | --------------- | ------------------------------- | --------- | -------: |
| 1 day    | `1D`          | "1 day"         | `?sessions=1`   | "the last trading session"      | `1m`      |        1 |
| 5 days   | `5D`          | "5 days"        | **absent**      | "the last 5 trading sessions"   | `1m`      |        5 |
| 1 month  | `1M`          | "1 month"       | `?sessions=21`  | "the last 21 trading sessions"  | `1m`      |       21 |
| 3 months | `3M`          | "3 months"      | `?sessions=63`  | "the last 63 trading sessions"  | `1d`      |       63 |
| 1 year   | `1Y`          | "1 year"        | `?sessions=252` | "the last 252 trading sessions" | `1d`      |      252 |

Six decisions are inside that table.

**(a) The parameter is `sessions` and it carries a count, not a name.** The
alternative was a named vocabulary — `?window=1M` — which reads better in an
address bar and was rejected anyway. `sessions` is already the **wire's** own
parameter, in `bar-series-query.ts` and `series-request.ts`; `?window=1M` would
be a second vocabulary that the address holds and the request does not, needing a
translation table at the URL layer and producing addresses the server could not
be handed. `?sessions=21` _is_ the request, spelled in the address. It also
composes with the absolute form the same module already supports, which is the
form Epic 13's scrubber produces.

**(b) The control offers five windows; the address admits any count the server
accepts.** This is the non-obvious half of (a) and it is a decision rather than
an accident. `?sessions=7` is a well-formed request and the product answers it —
and so does an agent's `setTimeWindow` asking for thirty sessions, which is
exactly what Epic 11 will do. When the address names a count that is not one of
the five, **the control shows no selection and does not snap to the nearest**:
snapping would rewrite the user's address into a different window, which §0's
first rule forbids, and it would silently answer a different question from the
one asked.

**(c) The default window writes no parameter.** `/securities/NVDA` **is** the
five-session view; the application never writes `?sessions=5`. Inherited from
`FRONTEND-STATE.md` §3 — _an absent parameter means the default, and the
application never writes a parameter it did not need_. Two consequences worth
stating rather than discovering: the `5D` control, pressed from another window,
**removes** the parameter rather than setting it; and a hand-typed or shared
`?sessions=5` is **honoured and left alone**, because the application does not
rewrite an address into a different form. So one view has two addresses. That is
accepted, and it is the same shape as every other default in a query string.

**(d) The visible label abbreviates and the accessible name does not.** `1D`,
`5D`, `1M`, `3M`, `1Y` is the analyst-tool convention and a row of five spelled
out words is a paragraph rather than a control. But a screen reader must not
read "one dee": each control's accessible name is the spelled-out form. The
mechanism — visible text plus an `aria-label`, or a visually-hidden span — is
Task 2.13.2's on the canvas and 2.13.6's in the tree; the **rule** is here.

**(e) The spoken sentence counts sessions, never months.**
`chart-alternative.ts` already says _the last N trading sessions_, and the N it
speaks is the **resolved** session count — so `1M` is spoken as "21 trading
sessions" and `1Y` as "252". That is more honest than "one month", which is not
a month, and it is the number the axis is actually divided into. **The label
says the approximation; the sentence says the fact**, and the control's own
label therefore never appears in the text alternative. Two vocabularies for one
window, one of which rounds, is how a sighted reader and a listener end up
disagreeing about what they were shown.

**(f) `1M` and `1m` are different things and they never appear adjacent.** The
control labels are uppercase and name calendar spans; the timeframes are
lowercase and name bar intervals. It is a genuine collision inside one document
and one module, it is resolved by case alone, and it is written down so the next
reader does not assume a typo.

---

## 5. Decision 5 — what a volume figure is allowed to say

Volume abbreviates. Abbreviation is rounding, and a rounding on a screen that
exists to make evidence inspectable needs a rule.

**(a) Abbreviate on the axis and in summaries; never in the reading.** Task
2.12.6 established the readout strip as the place the picture's roundings are
undone — the crosshair states the bar's four prices exactly while the value scale
is sampled and niced. Volume inherits that whole: **the value scale and any
headline figure abbreviate, and the readout states the exact integer.** So the
answer to "where does the exact figure still exist" is always _one pointer move
or one arrow key away_, on the same screen, and never "in the API".

**(b) The abbreviation is fixed-width in practice and right-aligned in
principle.** `base.css` sets `font-variant-numeric: tabular-nums`, which is what
makes Story 1.4's columns line up — but `M` and `B` are **letters**, and letters
are not tabular. So the alignment rule is: the suffix is part of the string, the
strings are right-aligned on their trailing edge, and the significant digits are
held constant (`9.81M`, `104M`, `1.04B`) so the widths stay within a character of
each other. Aligning on the decimal point instead is what breaks the moment a
column mixes `M` and `B`. Task 2.13.3 implements the formatter; the rule is
this document's.

**(c) A volume from one venue presented as the market's volume is a false
claim — and it is a worse one than the equivalent claim about price.** Every bar
this store holds is consolidated SIP, so today's figure genuinely is the
market's. Epic 3's live tail is **IEX only**, one exchange, and an IEX volume is
a small fraction of consolidated volume rather than a sample of it. An IEX
_price_ is approximately the market's price; an IEX _volume_ is not
approximately the market's volume at all. A stitched series therefore has a step
change at the seam that is an artefact of the feed rather than an event in the
market, and it would read as a collapse in trading.

**The seam is Story 2.14's and this story does not draw it.** The stitch is
already on the wire with per-series provenance
([`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md), ADR 0021) and costs under 20 ms. What this story owes is to not make the seam
_unsayable_: **the volume plot reads `provenance.sources` and not a single feed
label**, so that 2.14 has somewhere to put a mark. A plot built against one feed
string is a plot that has to be rebuilt to tell the truth.

This is invariant 6 and `PRODUCT_SPEC.md` §7.1 arriving in the one place they
bite hardest, and it is why the shipped vocabulary lives in
`packages/shared/src/market-provenance.ts` rather than in a renderer.

---

## 6. Decision 6 — the window that cannot be asked for

Two refusals are reachable in this area, and **neither is a user error**.

### 6.1 Off the calendar

`lastMarketSessions` refuses rather than returning fewer sessions than asked for
(ADR 0017 decision 9, and
[`CALENDAR.md`](../story-05-trading-calendar-and-market-time/CALENDAR.md)) — a
short list of sessions is a wrong answer wearing the shape of a right one. The
calendar covers **2024-01-01 to 2028-12-31**, and the refusal becomes a `400`
with `reason: "calendar-range"`.

**Can the control reach it? No, and the margin was measured rather than
assumed.** From a market date of 2026-09-11, **676 sessions** are reachable
before the calendar refuses. The widest window this control offers is **252**.

That margin shrinks by one session every trading day, so it is worth stating as
arithmetic rather than as comfort: 676 − 252 = **424 sessions of headroom, about
twenty months**, against a `MARKET_CALENDAR_PROVENANCE.nextEditDue` of
**2028-01-01**. The calendar's own editing obligation therefore falls due well
before the control's widest window can reach its floor. **A control that offers
only windows inside the calendar cannot reach this refusal, and that is a better
answer than rendering it.**

### 6.2 Over the cap

10,000 bars, refused rather than reduced, with a `400` naming the number.
**Unreachable through the named window form, by construction** — §2.1's mapping
is what makes it so, for any `sessions` value from any source: the control's, a
hand-typed address's, or an agent's.

**It remains reachable through the absolute form**, which the same request type
supports and Epic 13 will produce: `?start=…&end=…` spanning a year of minute
bars is 97,920 bars and is refused. So the `refused` state is still a state this
product can be in, still needs its rendering, and still must not be quietly
dropped because the control cannot cause it.

### 6.3 Where they sit in §36's state list — **this story adds no state**

The six-member union is unchanged: `loading`, `loaded`, `partial`, `empty`,
`refused`, `failed`, with `stale` as a rail above the body rather than a seventh
member. Every window-driven outcome lands in one of them.

| What happened                                  | State     | Retry?                         |
| ---------------------------------------------- | --------- | ------------------------------ |
| 1D during a session, store backfilled nightly  | `empty`   | no — it is an answer           |
| 5D against a store four-fifths caught up       | `partial` | no — it is an answer           |
| A window off the calendar (address or command) | `refused` | **no** — waiting never helps   |
| A window over the cap (absolute form only)     | `refused` | **no** — waiting never helps   |
| The network, the server, a corrupt body        | `failed`  | yes, and the rendering says so |

The two refusals belong **beside** `empty` and `partly covered` as normal
product states, exactly as the story asks. They carry the server's sentence
verbatim and no retry, because a refusal is a fact about the request rather than
about the moment.

**One tension is named here and resolved by Task 2.13.7 rather than by this
document.** `refused` and `failed` currently draw **no frame at all**, and
deliberately: neither carries a series, so neither carries a window, and a frame
under either would have to invent one (`CHARTING.md` §14). Acceptance criterion
4 asks that a failed window change leave the previous data visible and labelled.
Those are compatible — a refusal is an answer about the **new** window, and the
previous window's series is still a true picture of the **previous** window — but
only if the label above it says which window is on screen. **That labelling is
2.13.7's to design, and it is written down here so it is inherited rather than
discovered halfway through.** Do not write copy around a bar count while doing
it: every number on that surface comes from the response, and a sentence built
around a specific figure is wrong for every window except one.

---

## 7. What this document hands the rest of the story

- **2.13.2** designs the control for **five** members with the labels in §4, and
  designs the transition against the window that actually costs something — 1M
  at **1,210 ms and 154 kB**, not the 399 ms default.
- **2.13.3** builds `time-window.ts` (§2.2), the volume formatter (§5b), and
  **memoises the calendar walk in `packages/shared` before 1Y is reachable**
  (§1.2). Not a `useMemo` in a component.
- **2.13.4** draws volume as a second plot on the **same** x-domain, stopping at
  the same coverage edge as the price line above it (`CHARTING.md` §17.5 item 4),
  reading `provenance.sources` rather than one feed label (§5c).
- **2.13.5** puts the exact volume in the readout (§5a).
- **2.13.6** puts the control on screen, writes the first occupant of the query
  string, and honours §4(b) and §4(c).
- **2.13.7** renders every state in §6.3, resolves the labelling tension there,
  and **looks at 1D's `empty` and decides whether §1.3's trigger has fired**.
- **2.13.8** walks the vocabulary with a keyboard and a screen reader, and reads
  the `1d` sentences §2.3 says nobody has heard.

Six decisions, each with its alternatives and a reversal trigger that is a
condition. Nothing was added to `apps/frontend/src`; the benchmark that produced
§1.1's second table was written, run and deleted in the same task.

---

# Part two — the instrument, added 2026-09-13 by Task 2.13.2

§§1–6 settled **what the product offers**. §§8–16 settle **what it looks like**,
on the `Component library for MarketPulse` canvas that has been the source of
truth since [ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md),
with the tokens landed in the chain the ADR fixes: canvas → `VISUAL-LANGUAGE.md`
→ `tokens.css` → components.

The canvas file is **`Volume and window.dc.html`**, added for the scope reason
rather than the mechanical one — the main canvas cannot be read-modify-written
past 256 KiB, but this would have been its own file anyway: it is a different
question about a different surface. The specimens in it are **drawn rather than
described**, and the two series in them are **real** — NVDA's 1,950 stored
minute bars from 2026-08-31 to 2026-09-04, the default window, at the measured
1,019 px region. Two things were corrected by drawing them and both are recorded
below where they were found.

**Nothing was drawn in the application, and the fence held.** There is no volume
plot, no window control and no change to any route. `SecurityExplorer.tsx`'s
Volume region still holds its placeholder naming this story, and Task 2.13.4 is
still the first volume in MarketPulse.

---

## 8. The window control

### 8.1 A segmented control, and the two alternatives it beat

**Decided: one bordered box at `--control-height`, five cells, hairline
separators.** The labels are this language's existing micro-label idiom —
uppercase, letterspaced, 11 px, monospace — and **no new idiom was invented**,
which is what makes the control read as an instrument rather than as five web
buttons.

- **Five separate buttons** were rejected: they read as five unrelated actions
  and put four gaps where a reader is trying to see one axis of choice.
- **A `<select>`** was rejected: it hides a five-member vocabulary that fits in
  230 px behind a click, and it is the single most default-looking control a
  browser ships.

### 8.2 Selection is three channels and none of them is hue

A **2 px near-black bar** along the bottom of the cell, the label at
`--font-weight-strong`, and the ink stepping `--ink-secondary` →
`--ink-primary`.

That is `VISUAL-LANGUAGE.md`'s existing tab idiom — _a selected tab is an
underline, never a filled pill, paired with a weight change_ — transposed, with
one substitution: **the bar is near-black rather than crimson**. The identity
accent has four sanctioned positions in the chrome, none of them is a control
that changes a datum, and a fifth is a decision to escalate rather than a detail
to slip in.

**This control needed no greyscale measurement, because it spends no colour.**
The bar is a shape, the weight is a weight, and the two inks differ by luminance.
`grayscale(1)` changes nothing about it, and the canvas shows that as a pair
rather than asserting it.

**The selected cell takes no ground; hover owns the ground.** Two states that a
person using a mouse and a keyboard together can have on screen at the same
moment must differ by more than a shade — the lesson
[`SEARCH-AND-SELECTION.md`](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)'s
combobox already paid for with its hovered row and its active row.

### 8.3 Two things drawing it corrected

Both would have shipped, and neither was reachable by reasoning about tokens.

1. **Hover is `--surface-sunken`, not `--surface-page`.** The page ground is
   **1.02:1 against white**. On a row inside a floating result surface it works,
   because the surface is raised above a page that is already that colour. On a
   control standing on a raised panel it is simply not there — drawn, the
   hovered cell was indistinguishable from its neighbours.
2. **The readout sits outside the bordered box.** It was drawn inside first, as
   a sixth cell on a sunken ground, and it read as a sixth **button** — and it
   competed with hover for the one ground a cell can take. Outside, in the
   micro-label idiom, it is unmistakably a readout, and it is the same
   `LABEL · value` shape the status strip already uses for the market feed.

### 8.4 The readout, and the state it makes ordinary

§4(b) decided that the address admits any session count the server accepts and
that the control **shows no selection rather than snapping to the nearest**. So
"nothing selected" is a real, reachable, permanent state — the first thing a
stranger sees if they edit the address, and the routine outcome of Epic 11's
`setTimeWindow` asking for thirty sessions.

**Decided: it is answered by adding a readout rather than by drawing a sixth
state.** The control always carries a static micro-label beside it giving the
**resolved session count** of whatever is on screen:

| On screen      | Control  | Readout       |
| -------------- | -------- | ------------- |
| the default    | `5D` set | `5 SESSIONS`  |
| `?sessions=21` | `1M` set | `21 SESSIONS` |
| `?sessions=7`  | none set | `7 SESSIONS`  |

Two things follow, and the second is the one that makes this a good answer rather
than a decoration:

- **The no-selection state stops being special-cased.** It is the same control
  with no bar, beside a sentence that explains exactly why. Five empty buttons
  read as broken; five empty buttons beside `7 SESSIONS` read as a product that
  understood the address.
- **It is §4(e) made visible.** _The label says the approximation; the readout
  says the fact._ `1M` is not a month — it is twenty-one trading sessions, which
  is the number the axis is divided into and the number
  `chart-alternative.ts` speaks aloud. A control whose visible vocabulary and
  whose spoken vocabulary disagree is how a sighted reader and a listener end up
  describing different windows.

**Reversal trigger:** the first window whose resolved count is not a fact worth
printing — an absolute range from Epic 13's scrubber has no session count that
means anything to a reader, and at that point the readout needs a second form or
needs to be absent rather than wrong.

### 8.5 What is not drawn, because it cannot occur

**There is no disabled, greyed or unavailable window**, and that follows from §6
rather than from a preference: 424 sessions of calendar headroom against a
widest offer of 252, and the timeframe mapping forecloses the 10,000-bar cap for
every session count from every source.

Two consequences worth stating so they are inherited rather than rediscovered:
Task 2.13.6 does **not** need `TextField`'s `aria-disabled` + `readOnly` idiom
here, and the WCAG consequence that idiom drags with it — that an inactive
control's border and ink stop being exempt from 1.4.11 and 1.4.3 — does not
arise.

### 8.6 Where it sits

**Right-aligned on the Price region's heading row, over the panel's near-black
rule.**

The honest statement of the reason is not that the window belongs to price — it
belongs to the **screen**, and it moves the volume plot in a different region.
It is that this product has no page-level control bar, and inventing one for a
single control is chrome arriving before its second occupant.

**Reversal trigger: the second screen-level control.** That is almost certainly
Epic 8's comparison picker, at which point both belong in a bar above the
regions rather than one in each panel.

At 342 px of region the control wraps to its own full-width row beneath the
heading and the cells flex. It never truncates a label and never drops the
readout, which is the half that explains the other five.

---

## 9. The proportion of the pair, and it is a number with a reason

### 9.1 The pair is **aligned** rather than adjacent

Price and Volume are **two `Region` panels**, not one chart with two plots.
Story 2.11's shell placed `PRODUCT_SPEC.md` §8.3's seven contents as seven
regions and this inherits that rather than reopening it; what separates the two
plots on screen is a panel heading.

**So the alignment is structural rather than visual**, and it is worth being
precise about what guarantees it: both regions declare the same span on the same
grid, both plots are measured the same way, and **both spend the same
`--chart-gutter`**. That is why the gutter is a token — `tokens.css` already
says _two charts that disagree about where their value scale starts cannot be
stacked_ — and it is why **volume keeps the full 56 px gutter for a single label
it does not need.** Alignment outranks tightness.

One thing the grid does that is worth knowing before reading 2.13.4's e2e specs:
at three columns and at two, Price and Volume are vertically adjacent at the
same width, with the Abnormal-move region beside Price rather than between them.
**At one column they are separated**, by that region and by the price panel's
own eight stated facts — and that is unavoidable in any DOM order, because the
price panel alone is taller than a phone. §11 is the design consequence.

### 9.2 **88 px against 280, and 68 against 220**

Decided against the reading the plot has to support rather than by eye.
`PRODUCT_SPEC.md` §11's volume anomaly and §38's demo line are both a
**multiple** — _"Volume 3.8× normal"_ — and Epic 5 draws that claim on this
plot. With the domain running zero to the window's peak, a window whose peak is
3.8× its typical bar draws that typical bar at one 3.8th of the height:

| Volume plot         | The ordinary bar at 3.8× peak | Verdict                                                        |
| ------------------- | ----------------------------: | -------------------------------------------------------------- |
| 70 px — a quarter   |                         18 px | The step from typical to slightly elevated stops being legible |
| **88 px — taken**   |                     **23 px** | Reads                                                          |
| 140 px — a half     |                         37 px | No longer a supporting series                                  |
| **68 px — compact** |                     **18 px** | The floor, and it is why the compact pair keeps the ratio      |

88 : 280 is **3.18 : 1** and 68 : 220 is **3.24 : 1**, so **the compact pair
keeps the ratio rather than keeping the height** — which is the only way the
arithmetic above survives a narrow region.

**Reversal trigger:** the first window whose peak is more than about six times
its typical bar as a routine matter. At that ratio the ordinary bar is 15 px at
88 and the plot has stopped being readable at the bottom of its own domain, and
the repair is a domain that is not linear rather than a taller plot.

### 9.3 The volume domain is **zero to the window's peak, unpadded**

Volume has a true zero, so there is nothing to pad at the bottom, and the peak
is a fact worth touching the ceiling rather than a maximum to be given room. It
is also what makes §9.2's arithmetic true and Epic 5's baseline free: a 3.8×
spike puts the normal-volume rule at 26% of the height by construction, so that
mark displaces nothing.

### 9.4 What volume keeps of price's chrome, and what it does not

| Mark                               | Volume    | Why                                                                                                                                                                                                                               |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The axis rule                      | **yes**   | Here it is a **true zero** and the columns grow from it — the one place the two plots are honestly different                                                                                                                      |
| Session seams, full height         | **yes**   | They are the shared axis made visible, and they are what a reader lines the two plots up by across a panel boundary                                                                                                               |
| Uncovered ground and coverage edge | **yes**   | §10                                                                                                                                                                                                                               |
| Value scale                        | one label | The window's peak, abbreviated (§5a), **top-aligned to the plot rather than centred on its edge** — centred, it collides with the price scale's lowest label above it. A volume domain's zero is the axis rule and needs no label |
| Gridlines                          | **no**    | Volume is read comparatively — this bar against its neighbours — not off a scale. A second set of horizontal rules doubles the chrome for the supporting series                                                                   |
| Intraday times                     | **no**    | See below                                                                                                                                                                                                                         |
| The directional wash               | **no**    | §12                                                                                                                                                                                                                               |
| The reference rule                 | **no**    | Reserved for Epic 5's baseline (§13)                                                                                                                                                                                              |

**The time labels are the first and last session date only** — which is
`sessionLabels: "ends"`, a policy value `chart-density.ts` already defines for
narrow regions, **reused rather than invented and with no viewport branch of its
own**. It is enough to anchor the plot where §9.1 says it will be read alone,
and visibly less than the six labels above it. A media query choosing between
"no labels" and "the price chart's" was the obvious alternative and is exactly
the second copy of a breakpoint `CHARTING.md` §11.1 spent a task removing.

**The seams are drawn under the bars.** A 1.70:1 dashed rule crossing a 3.50:1
filled column is the column's pixel: the mark carrying data wins every pixel it
shares with the mark carrying chrome. On the price plot the two never overlap,
because a line is a line.

---

## 10. The volume mark, at both ends of a 130× range

### 10.1 One `<path>`, always

These are the first marks on this axis that are **per bar**, and `CHARTING.md`
§1 forbids the obvious implementation outright: one element per bar at the cap is
**9,790 plot elements and main-thread tasks of 137–254 ms**. So the visual
question and the rendering question are one question, and the answer has to hold
from **11.5 px per bar to 0.089 px per bar**.

**Decided: the columns are butt-capped stems on a single stroked path whose
`stroke-width` is the column width.** One element at every window, exactly as the
price line is one element at every window.

### 10.2 Three regimes, and the threshold is the device rather than a taste

The rule is _does a bar have a pixel of its own_:

| Slot     | Mark                        | Stems         |
| -------- | --------------------------- | ------------- |
| ≥ 2 px   | Columns with a **1 px gap** | one per bar   |
| 1 – 2 px | Columns, **no gap**         | one per bar   |
| < 1 px   | **A silhouette**            | one per pixel |

The gap is what makes columns read as columns rather than as a filled area; below
2 px there is no room for a 1 px gap and a 1 px column, and the column wins.

**The third regime is the one worth arguing for.** Below a pixel per bar the
stems overlap completely, so **only the tallest in each pixel column can be
seen** — drawing the other ten is overdraw, not detail. Taking the column's
maximum paints _exactly the same picture_ and bounds the cost by the plot's width
instead of by the bar count.

### 10.3 What that is worth, measured

Taken 2026-09-13 from `fixtures/bar-series/dense.json` — 1,950 real NVDA minute
bars — on a 726 px plot. The 1M row is those bars tiled to the 8,190 that window
holds.

| Window |  Bars | Slot     | Column | Stems              | Path `d` |
| ------ | ----: | -------- | ------ | ------------------ | -------: |
| 1D     |   390 | 1.862 px | 1.862  | 390, one per bar   |   9.0 kB |
| 5D     | 1,950 | 0.372 px | 1      | **726, per pixel** |  16.8 kB |
| 1M     | 8,190 | 0.089 px | 1      | **726, per pixel** |  16.8 kB |
| 3M     |    63 | 11.52 px | 10.52  | 63, one per bar    |   1.5 kB |
| 1Y     |  ~252 | 2.98 px  | 1.98   | 244, one per bar   |   5.6 kB |

**One stem per bar at 1M would be 8,190 stems and a 158 kB `d` attribute.** The
per-pixel rule costs 16.8 kB and does not grow again — a **9.4× reduction that
is also a ceiling**, because it is bounded by a plot that is never wider than
about a thousand pixels.

> **Amended 2026-09-13 by Task 2.13.3, which built it: the `Slot` column divides
> by the wrong one of two numbers, and the byte figure is better than predicted.**
>
> **The gap.** The table's `slot` is `width / bars`, which is a bar's share of the
> plot — but `scaleSlot` puts the first bar at x = 0 and the last at x = width, so
> the **pitch** between drawn stems is `width / (bars − 1)`. Taking the column as
> `slot − 1` therefore leaves a **2.0 px** gap at a 30-bar window and a **1.22 px**
> one at 3M's 63 bars, against §10.2's stated 1 px. The gap is the load-bearing
> half of that decision — it is what makes columns read as columns rather than as a
> filled area — so the geometry measures it against the **pitch**, and the rows
> above stand as a description of density rather than as an input. Above a few
> hundred bars the two agree to three decimal places, which is why the 5D and 1M
> rows are unaffected.
>
> **The bytes.** 726 stems come out at **10.6 kB** rather than 16.8, because a stem
> is `M<x> <baseline>V<top>` — a vertical-line command carries one coordinate where
> a line-to carries two. The 9.4× reduction is therefore about 15×, and the ceiling
> property, which is the point, is unchanged.
>
> **And one thing the artboard could not show**: a column centred on x = 0 or on
> x = width has **half of itself outside the plot**, so the first and last columns
> render half-width. Invisible at 1,950 bars, two visibly narrow columns at thirty.
> The price line has the same property and it does not show, because a line has no
> width. Task 2.13.4 owns the judgement, and the only fix that keeps the shared
> axis insets **both** plots.

### 10.4 And it raises a cost nothing has measured — handed to 2.13.9

§1's constraint is an **element count**. This is a different axis of the same
problem: a single element whose attribute is six figures long. By the same
arithmetic **the price line at 1M is 8,190 points and about 103 kB of path
string**, against 24.5 kB at today's default — and a line **cannot** take the
per-pixel repair without first deciding what a downsampled line means.

Nothing in this repository has measured the parse or memory cost of a path
attribute of that size, and 1M is the window this story makes reachable. It is
raised rather than absorbed: **Task 2.13.9 owes the measurement**, and the
condition to watch is 1M rather than the cap, because 1M is the widest window at
minute resolution and 3M and 1Y are two orders of magnitude smaller in points.

### 10.5 The picture is per pixel and the reading is per bar

The silhouette regime changes what is **drawn** and changes nothing about what is
**read**. The crosshair still resolves to a bar, the readout still states that
bar's exact integer volume (§5a), and the arrow keys still step bars.

That split already exists on the price plot at 0.47 px per bar and is not new.
What is new is that the drawing now says so explicitly rather than relying on
overdraw to hide it — which is the better state to be in, because a reader who
notices that two bars share a pixel is noticing something true.

### 10.6 The 1 px gap is a component constant and not a token

Against this repository's usual rule, and deliberately. It participates in
arithmetic that produces a coordinate, and `PriceChart.module.css` already
records that coordinates come from the geometry module because **a computed
pixel is data rather than design**. A `--chart-volume-gap: 1px` in CSS with a
`slot >= 2` threshold in a module would be one number in two homes with nothing
comparing them, which is the trap `CHARTING.md` §10.3 spent a task closing and
`CLAUDE.md`'s gap list still carries as a live hazard.

---

## 11. The ink, measured against every ground a column can stand on

**`--chart-volume: #848995`**, and it is **the one chart ink with a measured
contrast _floor_ rather than a measured contrast _cost_**.

The distinction decides the value. The directional wash is decorative — the
geometry carries direction and the tint repeats it — so it has no floor to fail,
which is why ADR 0026's exception did not fire for it. Volume columns are **not**
decorative: they are the only thing on their plot carrying the magnitude, so
WCAG 1.4.11's 3:1 for _a graphical object required to understand the content_
applies squarely. And it applies against **four grounds rather than one**,
because the uncovered treatment and Epic 8's future overlays put a fill behind
the bars.

| Against                             | Ratio      |
| ----------------------------------- | ---------- |
| `#ffffff` — the panel               | **3.50:1** |
| `#f2f3f9` — `--chart-uncovered`     | **3.16:1** |
| `#e6f2ec` — `--price-positive-wash` | **3.05:1** |
| `#fbeae9` — `--price-negative-wash` | **3.01:1** |

`#848995` is the lowest-contrast value in this language's cool-grey family that
clears 3:1 on the worst of the four, and **the bound is real in both
directions**: lighter fails on the uncovered ground, and darker starts to make a
filled area outweigh a 1.5 px line. It reads at 3.50:1 where `--chart-series`
reads at **17.08:1**, which is what "supporting series" means here, said as a
number rather than as an adjective.

Achromatic in effect — `grayscale(1)` takes it to `#898989` and nothing on the
plot changes — and the same cool-grey family as `--chart-seam` and
`--chart-reference`, so the volume plot is visibly part of one instrument rather
than a second palette.

**ADR 0026's exception did not fire and has still fired three times.** No canvas
value was overridden: this token had no canvas predecessor, and it was taken on
the canvas against the floor rather than adopted and then corrected.

**And this is the mark `CHARTING.md` §14.5 was warning about.** A fill is opaque
where every mark before it was a stroke, which is how a one-pixel measurement
error painted the uncovered ground over the axis rule and stayed invisible for
three tasks. The correction is now mechanical — `e2e/specs/security-price-chart.spec.ts`
asserts the ground's painted box ends above the plot's own bottom edge — and
Task 2.13.4 must confirm the same assertion covers the volume plot, which is the
second fill this axis carries.

---

## 12. Volume does not encode direction

**Decided: no, and it is the strongest form of the standing rule rather than an
exception to it.**

A volume bar coloured by its own bar's direction is a mark whose meaning vanishes
under a greyscale filter — `--price-positive` and `--price-negative` differ by
**1.04:1** as inks and **1.009:1** as washes there. The price plot answered that
by making **geometry** the first channel: the side of a dashed rule the line
finishes on. **A column has no geometry left.** It has one end on the baseline
and one end at its own height, and its height already means something else. The
second channel would have to be invented — a hatch, an outline, a split column —
at 0.089 px wide, where none of them exists.

And it would be answering a question nothing asked. **Volume is a magnitude.**
`PRODUCT_SPEC.md` §11's volume anomaly is _current volume against the historical
median for the same time of day_ — a ratio, with no sign in it. Nothing in the
anomaly model, the flagship demo line or the agent toolset asks for which way a
bar closed **and** how much traded as one figure. The price line above already
says which way the window went, the split wash says which way it was at any
point, and the reading says what one bar did; a fourth statement of direction, on
the one mark that cannot carry it honestly, is the definition of colour used as
decoration.

**Reversal trigger:** a feature that needs buying and selling pressure told
apart. That is a different datum, needing trade-side data this product does not
hold, rather than a colour on a bar it already draws.

`CHARTING.md` §12.6 is the precedent and it is a strong one: four greyscale
simulations passed against a chart that was wrong, and a person looking at a
screenshot found it. **The lesson taken here is not "simulate harder" — it is
that a mark which never spends hue cannot fail that way.**

---

## 13. Two plots, one coverage edge — and the room reserved for later

### 13.1 The coverage rule, applied twice

`CHARTING.md` §17.5 item 4 names this as the item most likely to be got wrong by
a second plot, and the canvas draws it rather than asserting it. **Two plots
sharing one x-domain must stop at the same pixel** — the price line, the two
washes, the reference rule, the volume columns and the volume baseline. The
uncovered ground is drawn **once per plot**, never once per region: it is a
statement about a frame, and there are two frames.

What does **not** stop is everything derived from the window: the axis rule, the
seams and the tick labels run the full width in both plots. That is §14's one
rule, applied twice rather than re-decided.

### 13.2 Room reserved, stated as what displaces what

- **Epic 5's volume baseline.** The demo's _"Volume 3.8× normal"_ is drawn on the
  volume plot, as a dashed horizontal `--chart-reference` rule at the normal
  level with the multiple stated at its right-hand end. **It displaces nothing**
  (§9.3), and it needs **no new token** — the reference rule and its `2 4` rhythm
  already exist and mean exactly this on the plot above.
- **Epic 8's comparison series does not reach the volume plot at all.** It stays
  **single-series, always**: columns cannot overlay, grouped or stacked at
  0.089 px per slot is not drawable, and at 11.5 px it is a different chart. When
  a comparison arrives, volume shows the **subject's** volume only and the
  comparison is price-only. That is a real cost decided now rather than
  discovered inside Epic 8, and it is the second thing that epic loses on this
  screen — it already displaces the directional wash.
- **Epic 9's filing lane is unchanged in size and moved in place.** The 14 px
  `--chart-filing-lane` now sits below the **volume** baseline rather than the
  price one, because it is a lane on the shared time axis and volume is what is
  above it. Each plot keeps its own lane so a marker can appear under either; the
  token is what stops the two disagreeing.

### 13.3 The high–low extent band is **not** decided here

Task 2.12.5 declined it at `1m` — a bar's high and low sit within a few
hundredths of a percent of its close — and named **Story 2.13's `1d` windows** as
when it returns. It cannot be settled on an artboard: **no `1d` response body has
been recorded** (§2.3 owes one), so there is nothing to draw it against, and its
whole question is whether a session's range is thick enough to see.

**It stays Task 2.13.4's, with a measurement rather than a judgement:** draw it
at 3M and at 1Y against a real `1d` body and read the band's height in pixels.
`--price-unchanged-wash` is still reserved for it and still has no application
consumer.

---

## 14. The transition, and the four tests

### 14.1 What the chart adds between one window and the next: **nothing**

Stated plainly, because the task asked for it plainly — and it is a decision with
an argument rather than a third deferral.

**Stale-while-loading is inherited whole** (`FRONTEND-STATE.md` §2's amendment):
a held answer for the same request paints in the first commit, marked by a rail
above the body — a dashed marker, a sentence, a travelling dashed hairline — and
**no number is touched**; the settle wash plays only if a figure actually moved.

**The chart adds nothing to it, because two windows have no interpolable
intermediate.** A chart tweening from five sessions to twenty-one passes through
frames that are charts of windows nobody asked for, on an axis that is not a
continuum — it is session-ordinal, and the number of ordinals is what changed.
Animating it would be drawing four false pictures to soften the arrival of a true
one.

No dim, no blur, no fade and no second style on a held series, which keeps §2's
stated reversal trigger — _a chart that redraws a held series in a second style_
— unfired.

**What is alive instead is latency rather than motion, and it is answered.** The
address is the source of truth, so the selection moves in the frame the press
lands, before any request resolves: the control has no pending state, no spinner
and no disabled window. The frame does not move either — heights, gutter, axis
and readout are computable from the box alone — so a window change **re-labels
rather than re-lays-out**.

The full vocabulary stays Epic 3's, against numbers that actually change. A
window change is a **dataset swap** and is the easy case, which is exactly the
case a motion vocabulary should not be designed against.

### 14.2 The four tests, applied to the pictures

Written now so that Task 2.13.10 is not the first time anybody applies them, and
written against the artboard rather than against a shipped screen, which is a
different and later question.

| Test                                 | Verdict | Why                                                                                                                                                                                                                                      |
| ------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — a real funded product?           | **yes** | A minute-resolution volume profile under a five-session price line, with session boundaries lining up across both, is a picture that only exists if somebody actually holds 48 million bars                                              |
| 2 — designed rather than defaulted?  | **yes** | Every default was declined and the declines are visible: no box around either plot, no gridlines on volume, no second time axis, no second gutter width, a value scale of exactly one label, and a selected state with no fill in it     |
| 3 — a moment worth showing somebody? | **yes** | The 1M silhouette. Eight thousand minute bars resolved to the plot's own pixels, reading as the month's trading intensity. It is also the moment that _proves_ the rendering decision, which is rarer than a moment that only looks good |
| 4 — does it feel alive?              | **no**  | And for the third time. See below                                                                                                                                                                                                        |

**Test 4 is answered "not yet, and not from here" for the third consecutive
story, and that is now a pattern rather than a deferral.** The half that is
latency is answered above. The half that is motion has been deferred by name to
Epic 3 by Task 2.4.4, by Story 2.12's close and now by this task — each time for
the same correct reason, that the hard question is what happens when a **price**
changes and that has to be answered against real moving numbers.

**What is worth flagging rather than repeating a fourth time:** three deferrals
of one criterion is the shape of a criterion that never gets met. Epic 3 is the
next epic and it does have the moving numbers, so the trigger is met by the
calendar rather than by a condition — but **Story 2.14's close should record the
count**, so that if Epic 3 ships without a motion vocabulary the deferral is
visible as a debt rather than as a habit.

---

## 15. One reading, two strips

The shared reading is Task 2.13.5's. What is decided here is its **layout**, and
one decision in it is load-bearing enough to take now.

**Decided: each plot carries its own readout strip, under its own axis, stating
its own subject.**

A single strip under the price chart was the obvious shape and it fails on §9.1's
one-column arrangement, where the two regions are unavoidably a screen apart:
somebody pointing at a volume bar would get the answer off screen. Two strips is
**not** duplication — it is the rule this product already keeps for live regions,
that **a readout belongs to a subject and its sentences name it**
([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§7). Two strips that said the same thing would be the two-surfaces-one-sentence
defect; two strips that say different things are two subjects.

| Strip  | Under the pointer                                                                                                    | At rest                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Price  | The bar's market instant, its four prices with the close emphasised, its change labelled `BAR` — unchanged           | The invitation, which is the only thing on the page saying the keyboard path exists      |
| Volume | The same instant and the **exact integer** — abbreviation is for the axis and summaries, never for the reading (§5a) | The window's peak and when it happened — the figure Epic 5 later qualifies as a multiple |

The volume strip's rest state is a decision rather than a mirror. A second copy
of the invitation is noise, and an empty reserved row is a hole; the peak is a
fact the plot's own scale already states half of, it names its subject, and it is
the figure this plot exists to make checkable.

**The reservation is a hidden reading, not a height.** `CHARTING.md` §15.4 found
that no single reserved height is correct at more than one width — a reading
wraps where the invitation does not, and the exact figures below moved 14 to
32 px at every viewport but 1440 while `pnpm verify` and all 96 browser tests
stayed green. The volume strip inherits the **mechanism**: a hidden reading of the
last bar in the same grid cell, measured at the real width.
`--chart-readout-height` stays the row's floor. **A second `min-height` token
would be re-taking a decision that has already been paid for once.**

### 15.1 The constraint this hands to 2.13.5

One read position now drives marks in **two regions**, and that is not free.

Task 2.12.6 took a structural repair — the read position lives in a sibling, so
the frame's owner does not re-render — and `PriceChart.test.tsx` counts **zero**
frame recomputations across forty arrow presses, with its own counter verified
live in the same test. `CLAUDE.md` records that lifting that state back up costs
**17× the CPU on the pointer path** and produces no long task at all, so §28's
own criterion cannot see the regression.

Lifting it to `SecurityExplorer` would be worse than that: it would re-render the
**518-row universe table** on every pointer move, on a page already spending
50–66 ms of main thread on a cold load because of that table.

**The shape that survives is the same one, generalised:** the state lives in a
wrapper that renders its `children` through unchanged, so React re-renders only
the context consumers — which are the two reading overlays and neither frame
owner. The existing zero-recomputation test is the instrument and needs
**re-pointing at the pair, not replacing**.

---

## 16. The tokens, in the chain and in order

Three new, each in `VISUAL-LANGUAGE.md` first, then the stylesheet, then
`styles/tokens.ts`'s declared set.

| Token                           | Value     | File                                                                     |
| ------------------------------- | --------- | ------------------------------------------------------------------------ |
| `--chart-volume`                | `#848995` | `tokens.css` theme block — it is ink, and a dark palette would change it |
| `--chart-volume-height`         | `88px`    | `tokens.css` geometry block — a dark palette would change nothing        |
| `--chart-volume-height-compact` | `68px`    | as above                                                                 |

**None of them carries market meaning**, so none is in `market.css`: a plot's
magnitude scale says nothing about the market, and the one thing that would have
put a volume token there — direction — was declined in §12.

**They have no application consumer until Task 2.13.4, and that is expected for
one task.** What stops them being invisible is `Foundations/Chart tokens`, which
`CHARTING.md` §17.4 kept deliberately as the place a chart mark is reviewed as a
**language** before it is drawn anywhere. Two stories were added to it: the
volume column at its three densities, drawn at **exactly 480 CSS pixels** because
the subject is a threshold measured in pixels and a stretched specimen shows a
gap the regime it is labelled with does not have; and the column on all four
grounds, as rendered and under `grayscale(1)`.

**And one omission was found while landing them.** `--chart-filing-lane` was
declared in `tokens.css` by Task 2.12.4 and **never added to
`styles/tokens.ts`'s declared set** — so the one mechanism this repository has
for making a missing token a startup throw naming itself did not cover the token
reserving Epic 9's lane. Story 2.12's close recorded that all sixteen `--chart-*`
tokens had an application consumer and did not check that all sixteen were
_declared_. Added here.

---

## 17. What Part two hands the rest of the story

- **2.13.3** builds the volume formatter (§5b) and the shared axis. It does
  **not** own the 1 px gap or the density threshold — §10.6 puts those with the
  geometry, beside the coordinates they produce.
- **2.13.4** draws one path, three regimes, `#848995` on four grounds, no
  gridlines, `sessionLabels: "ends"`, and the coverage edge at the same pixel as
  the price plot's. It also **confirms §11's fill assertion covers the second
  plot**, and it takes §13.3's extent-band measurement against a real `1d` body.
- **2.13.5** lays out two readout strips rather than one (§15), inherits
  2.12.8's hidden-sizer **mechanism** and not a `min-height` token, and must keep
  the read position out of both frame owners (§15.1) —
  `PriceChart.test.tsx`'s zero-recomputation guard needs re-pointing at the pair
  rather than replacing.
- **2.13.6** builds the control in §8: five cells, a 2 px near-black bar, a
  readout that always states the resolved session count, no disabled state, and
  a selection that moves in the frame the press lands.
- **2.13.9** owes §10.4 — the path-string cost at 1M, which is a different axis
  from `CHARTING.md` §1's element count and is unmeasured.
- **2.13.10** applies §14.2's four tests to the deployed page and records the
  **count** of test-4 deferrals rather than only the verdict.

---

# Part three — the rendering, added 2026-09-13 by Task 2.13.4

Part two designed the volume plot on the canvas and Task 2.13.3 built its
arithmetic. This is what changed when it was drawn on a real page, and it is
**four corrections and one decision** rather than a restatement.

## 18. The axis is one object at run time, not only in the type system

§13.1's rule — _two plots sharing one x-domain must stop at the same pixel_ — was
half structural after 2.13.3: neither `priceFrame` nor `volumeFrame` can build an
axis, because neither is handed a window. The other half is that **`timeFrame` is
called once**, and that needed a place to live.

It is `components/PriceChart/ChartAxis.tsx`, a component wrapping the Security
Explorer's grid and rendering `children` through unchanged. Two things about the
shape were forced rather than chosen:

- **A context and not a common parent.** `PRODUCT_SPEC.md` §8.3's reading order
  puts the Abnormal-move region between Price and Volume in the DOM — §9.1 already
  records that at one column they are a screen apart — so a component rendering
  both as siblings would reorder the page to suit itself.
- **Only the width is shared.** Each plot measures its own box and draws at
  `frame.width` with its own height. That is the load-bearing half: two
  equal-width elements measured a frame apart are two different numbers for one
  render, and a chart one pixel out for one frame on every resize is exactly the
  defect nothing below a browser can see.

`useChartAxis` **throws** outside a provider. A fallback to a private frame would
be a second home for the composition 2.13.3 spent a task taking apart, and its
failure mode is the quiet one.

**§15.1's wrapper therefore exists now**, one task early and by design: 2.13.5
adds the read position to this same component, and React then re-renders the two
reading overlays and neither frame owner.

## 19. Four corrections to Part two, found by drawing it

### 19.1 The end columns paint outside the plot — a defect, not a trade-off

§10.3's amendment described the first and last columns as rendering half-width.
They do not, unassisted: `.canvas` declares `overflow: visible` — which the tick
labels and the crosshair need — so the half of an end column outside the frame is
**painted into the panel's padding**, up to 14 px of it at a thirty-bar window.

The columns are clipped to the plot box, which is what produces the half-width
rendering the amendment predicted. Two clips on two elements, because an element
takes one `clip-path` and the path already spends its own on the coverage span.

### 19.2 The half-width end columns are accepted, looked at rather than argued

§10.3 handed this task the judgement and named 3M as where to look. 3M is not
reachable until 2.13.6, so it was taken at the density §10.3 itself says the
effect is visible at — **thirty bars**, in `Market/VolumeChart → Wide` and at the
compact width.

**Accepted.** Three reasons: the height is the datum and the height is exact; a
column clipped by the frame it sits on the edge of is the ordinary convention for
this chart rather than an artefact; and the only repair that keeps the shared axis
insets **both** plots, which moves the price chart's first and last points off the
frame's edges and makes the coverage edge stop somewhere other than where the
window does — a real change to a shipped chart, to round two columns.

**Re-look at 2.13.6's 3M and 1Y**, where the column is 12.8 px rather than 28.9
and the proportion of it that is lost changes.

### 19.3 The marks both plots draw need one home in CSS as well as one in the geometry

§13.1 is a rule about arithmetic and it has a stylesheet half nobody had stated.
The seam's `3 3`, the coverage edge's `6 3` and the reference rule's `2 4` are a
**system that has to stay distinct**, and `CHARTING.md` §14 is explicit that the
edge is legible because it differs from the seam it coincides with on most
answers. Copied into two stylesheets with nothing comparing them, that is
`CLAUDE.md`'s two-homes trap with a dash rhythm in it instead of a breakpoint.

`components/PriceChart/chart-marks.module.css` holds them, and both chart
stylesheets `composes:` from it. What is **not** shared is each plot's own box:
the two heights are two tokens and the bottom rule means different things — the
frame's one rule above, a **true zero** below — so a shared `.plot` would have
been one class meaning two things.

### 19.4 A workshop fixture is a live claim

`RegionPlaceholder.stories.tsx` used the Volume region's `filledBy` sentence as
fixture text **and** carried `filledBy="Story 2.13 — Volume Chart"`. Filling the
region would have left a workshop page saying the product plans something it has
shipped — the same live claim `CLAUDE.md` says to amend, on a screen a designer
reads rather than a user. The Volume entry was removed rather than edited.

## 20. What the running page measures

2026-09-13, Chromium at 1440×1000, against a developer's store — which answers the
default window four-fifths short, so §6.2's coverage treatment is under
observation here in a way the deployed store does not show (§11.3: both
photographs are correct).

| Property                         | Price plot                        | Volume plot       |
| -------------------------------- | --------------------------------- | ----------------- |
| SVG x / width                    | 104 / 928.66                      | **104 / 928.66**  |
| Uncovered ground x / width       | 289.8 / 742.9                     | **289.8 / 742.9** |
| Vertical marks, x                | 185.8, 371.7, 557.5, 743.3, 185.8 | **identical**     |
| Ground's bottom vs plot's bottom | 1 px                              | **1 px**          |

**186 stems for 390 held bars**, which is the silhouette regime and is right: the
axis carries the window's 1,950 slots, so the pitch is 0.48 px and the plot draws
one stem per covered pixel. §10.3's table predicted 726 stems at a full five
sessions; a four-fifths-short answer covers 186 pixels and fills 186 of them.
**The window this product opens at is the regime that proves the rendering
decision**, not one that avoids the question.

## 21. What Part three hands on

- **2.13.5** inherits the wrapper built rather than specified. The read position
  goes into `ChartAxis`; `PriceChart.test.tsx`'s zero-recomputation counter was
  **re-pointed at `timeFrame` and `priceFrame`** by this task rather than
  replaced, and is ready to count the pair.
- **2.13.6** owes **two** things now: the `1d` response body (§2.3), and
  therefore §13.3's high–low extent-band measurement, handed to it by name rather
  than left to fall between the two tasks. It also owes a second look at §19.2's
  end columns at 3M.
- **2.13.9** still owes §10.4 — the path-string cost at 1M.
- **2.13.10** still owes §14.2's four tests against the deployed page, and the
  **count** of test-4 deferrals.

---

# Part four — the reading, added 2026-09-13 by Task 2.13.5

§15 decided the **layout** of the shared reading and left three things open: the
mark on the volume plot, what its strip says at rest, and how one read position
reaches two regions without re-rendering either frame owner. All three are
settled here, and the first two were taken on the canvas —
**`Volume reading.dc.html`** in the `Component library for MarketPulse`
project ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)),
six numbered sections, with the specimens drawn from the same 1,950 stored NVDA
minute bars Part two used.

**No new token.** Nothing here needed one, and that is a result rather than an
absence: the marks are the price chart's marks and the strip is the price
strip's idiom.

---

## 22. Decision — **one crosshair per plot, at one pixel, from one read position**

§15 left this open and the Work section of
[`TASK-05`](TASK-05-one-reading-two-series.md) named the two candidates: one
vertical rule spanning both plots, or one per plot at the same x. The structural
requirement was the only thing fixed — _not two marks that can disagree_.

**A rule spanning both plots cannot be drawn.** The two are separate `Region`
panels with a heading, a border and — at one column — the Abnormal-move region
between them, so a single rule would have to be painted over the page's chrome.
That is not a trade-off; there is no version of it that is the product's layout.

So: **one mark, drawn twice, from one index.** What makes it one rather than two
that agree is below.

### 22.1 The read position is an **index**, and that is the load-bearing choice

`ChartAxis` holds `{ index, source }`. Both plots place their bars with the same
`placeBars(axis, bars)` on the same bars, so their `readings` arrays are the same
bars in the same order and **one index addresses one bar in both**.

The two alternatives were considered and both are worse:

- **A slot** would be resolved to a bar twice, by two components, with two
  chances to resolve it differently at the ends — which is exactly where a
  pointer spends its time.
- **A `Bar`** would be an object identity travelling through a context, and a
  plot that had rebuilt its bars would hold one matching nothing.

The property is asserted rather than assumed:
`chart-geometry.test.ts`'s _addresses the same bar from one index in both plots,
at the same x_ takes it at the **dense** window, where the volume plot draws a
silhouette and the two arrays genuinely could have diverged — the drawing is one
stem per pixel column there and the reading is still one entry per bar.
Break-verified by reversing one array.

### 22.2 The disc, and what it means on a plot with no line

**Decided: the same hollow disc as the price plot, at the bar's own volume.**
Three candidates were drawn (`Volume reading.dc.html` §02) against a real
specimen — the pixel column under the pointer carries **1,162,113** and the bar
the crosshair snapped to traded **333,250**, 29% of it:

| Candidate                | Why not / why                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rule only**            | Honest and mute. The rule says _here_ and the strip says _333,250_, and nothing in the picture connects them — a reader comparing the strip to the column under the rule is comparing two different facts with no sign that they are different |
| **Repaint the column**   | States value and position in one mark, and spends the plot's one encoding — height — on a second ink. At 0.37 px per bar the repaint is a 1 px sliver nobody sees. The right mark for a window with columns; not one mark for every window     |
| **The disc** — **taken** | One vocabulary across both plots, one mark at every density, and the only place in the picture the snapped bar's **own** volume appears at all                                                                                                 |

**That the disc sits below the silhouette is the point, not a defect.** §10.5
says the picture is per pixel below a pixel per bar and the reading is always per
bar; until now that was a sentence in this document. The disc is the picture
admitting what it rounded, and the strip's instant is what makes it legible.

**Reversal trigger:** a reader reporting that the disc looks _misaligned_ rather
than informative. The repair is not the repaint — it is a disc drawn only where a
bar has a pixel of its own, which the geometry already knows — and its cost is a
mark that appears and disappears with the window, which is a second thing to
explain.

---

## 23. Decision — the volume strip's two states, and what is **not** in them

| State             | Content                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Under the pointer | The bar's instant, then `Volume` and the **exact grouped integer**                                              |
| At rest           | `Peak`, the exact integer, then the instant in the secondary ink                                                |
| Nothing traded    | _No shares changed hands anywhere in the window._ — `chart-alternative.ts`'s words, because it is the same fact |

Three things about it are decisions rather than consequences.

**The instant is the joint.** It is the only thing both strips say, spelled by
the same `formatBarInstant`, and it is what makes two answers legible as one
reading. At rest it steps back — secondary ink, regular weight — because there it
is a footnote on a figure rather than the thing being asked about. That is the
whole of how a reader tells the two states apart at a glance.

**The figure is exact, and the label keeps its word.** §5a: abbreviate on the
axis and in summaries, never in a reading — so the gutter says `3.13M` and the
strip says `3,131,031`, from `formatVolumeExact`. `O H L C` is the one place this
product abbreviates a label and it earns that by being the notation of the thing
itself; `V` is not notation anybody knows, so volume keeps its word for the same
reason the bar's change does.

**No invitation, and no second copy of anything.** The price strip's sentence is
about a keyboard path belonging to the plot above; repeating it would be two
surfaces saying one thing, which is the defect two strips exist to avoid rather
than to commit.

### 23.1 The strip is **not in the accessibility tree**, and that follows from the rest

`aria-hidden`, exactly like the plot, its one gutter label and its two dates.
Three reasons, and the third is the one that decides it:

- Every other mark in this region is hidden for the same reason — they are
  labels on a picture.
- The region's accessible content is **one sentence**, `volumeAlternative`, and
  it already states the peak and when it happened. An exposed strip would state
  the same fact in the same breath, which is the two-surfaces defect with the
  peak in it.
- A listener is not short of the figure: it arrives as a clause in the spoken
  reading (§24).

---

## 24. Decision — **one sentence, one more clause**, and the subject moved

A listener meets **one** live region where a sighted reader meets two surfaces in
the same instant. So the spoken reading carries what the two strips carry between
them — `Volume 4.06 million.` appended to the existing sentence — rather than a
second announcement. A fifth polite region on this page would be queued against
the other four in an order no component controls
([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§7).

**Spoken and written are the same figure and not the same string.** The strip
writes `4,061,234` and the sentence says `4.06 million`. That is not a
disagreement: nine digits of precision in a sentence somebody hears once is not
how a number is said, and `volume-format.ts` decides both forms in one module so
they cannot drift. The exact figure stays on screen, which is where an exact
figure is read rather than heard.

**The subject moved from `price chart` to `chart reading`**, and the second
reason makes it a repair rather than a preference:

- Since 2.13.4 the two plots are one instrument on one axis, and this sentence
  now states a fact from each.
- `chart-alternative.ts` already opens the price chart's text alternative with
  the words _NVDA price chart_. The old subject was **two surfaces opening with
  one phrase** — the defect `CLAUDE.md` records happening three times in one
  afternoon on the search screen, shipped quietly here since Task 2.12.6.

The `role="img"` name on the tab stop is unchanged: that element **is** the price
plot.

---

## 25. Decision — the volume plot adds **no tab stop**

`Tab` lands on the price plot and opens on the last bar; the arrows step bars;
`Home`, `End` and `Escape` are unchanged. The volume plot answers a pointer and
is not focusable.

This is not a gap in the keyboard path, and the test it has to pass is _is
anything unreachable without a pointer?_ Nothing is: the same read position
drives both strips, so arrowing along the price plot moves the volume crosshair
and fills the volume strip, and the spoken sentence carries the figure. A second
stop would be the same reading at twice the cost, against the bar this chart is
held to — **one tab stop and never one per bar**.

Held by `VolumeReading.test.tsx`'s _adds no tab stop, so the pair is still one_
and by `e2e/specs/security-price-chart.spec.ts`'s _the keyboard path drives both
plots, and adds no second tab stop_, which also checks that the next `Tab` leaves
the pair entirely rather than landing inside the Volume region.

---

## 26. The reservation, applied completely — **and it found a live gap in the price strip**

`CHARTING.md` §15.4's mechanism is a hidden reading of the last bar in the same
grid cell, so the row is as tall as a reading _at this width_. The volume strip
inherits the mechanism and needed **one more copy of it**, and following that
through found something already shipped.

**Both of the volume strip's states are content** — a reading and a peak, two
figures — so both are laid out hidden and the row is the taller of them at every
width. With only one hidden state the row would be `max(reading, whatever is
live)`, which drops by a line whenever the _other_ state is the taller one.

**That is exactly the price strip's shape today**, and it had not been noticed:
one hidden reading, an invitation that is live at rest, and therefore a strip
that is `max(reading, invitation)` at rest and `max(reading, reading)` with a
reading on screen. A width at which the invitation wraps further than a reading
drops the four exact prices by a line under the reader's hand — §15.4's defect
from the other direction, never measured at three viewports. The price strip now
hides the invitation too.

**Both specs run at all three viewports**, and the middle one is the instrument.

---

## 27. The constraint §15.1 handed over, and the shape that answers it

**Two contexts in one component, not one value with both in it.** This is the
whole of the risk in the task and it is invisible on screen: a read position
added to `ChartAxisValue` would be handed to every `useChartAxis()` caller, and
**both frame owners are callers** — so a pointer move would rebuild a
1,950-point path string and a 726-stem silhouette to move one vertical rule. The
page would look perfect. `CLAUDE.md` records the same regression at **17× the CPU
on the pointer path with no long task at all**, which is to say invisible to
`PRODUCT_SPEC.md` §28's own criterion.

So `ChartAxis` holds two pieces of state and memoises two values. React
re-renders a context consumer only when that context's value changes by identity;
`children` is the same element tree it was handed, so the subtree between the
provider and the plots does not render at all — which is what keeps this route's
518-row universe table out of the pointer path.

**The guard is finished rather than re-pointed.** `PriceChart.test.tsx` now counts
`timeFrame`, `priceFrame` **and** `volumeFrame`, renders **both** plots inside one
`ChartAxis`, still reports zero across forty arrow presses, and still verifies its
own counter live in the same test. The break was performed: putting the read
position on `ChartAxisValue` takes it to **120** recomputations — three builders
× forty presses — which is the number that says both plots were on screen and all
three were counted.

**And this is not a store.**
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§1's reversal trigger is _the first piece of state two features must agree about
that neither owns_; this is two components inside one feature on one route, and a
wrapper answers it. Said here and in `ChartAxis.tsx` so that a later reader does
not read a second context as the trigger having fired quietly.

---

## 28. One derivation the strip and the sentence share

`volumePeakBar(bars)` joins `volumePeak` in `chart-volume-axis.ts`. It was a
`find` inside `chart-alternative.ts`'s `peakClause` and would have been a second
`find` in the strip — two sites deriving one fact, which is how a strip and a
sentence come to name two different busiest minutes with neither obviously
wrong. The first bar of a tie wins, deliberately: a tie is two minutes that
traded the same number of shares, and the earlier one is what _when did the
window get busy_ is asking about.

---

## 28.1 And one instrument that was measuring the wrong thing

`e2e/specs/security-price-chart.spec.ts`'s _a pointer over the plot reads the bar
under it_ asserted that the readout contains **some** clock time. Its `readout`
helper resolves to the invitation or, failing that, to the first `EDT` in the
Price region — and the panel's own live sentence is _NVDA: holding 390 bars,
through 2026-09-04 16:00:00 EDT…_, which satisfies it. The assertion was
therefore green against a chart nobody had pointed at, and had been since Task
2.12.6.

It was found because this task's cross-plot test asks the two strips for **the
same specific minute** and could not be made to pass. Both assertions now run
against the row the `BAR` label sits in. The same shape caught the volume test a
second time: a `mouse.move` to an un-scrolled `boundingBox()` lands outside the
window, the strip keeps its resting state — which states a _different_ instant
and a _different_ grouped integer — and a loosely written assertion passes
against it. Both new tests scroll first, and both assert the resting state is
**gone**.

---

## 29. What Part four hands on

- **2.13.6 / 2.13.7** own the fence this task stops at: **what a reading does
  when the window changes underneath it.** The series is replaced, so the read
  position must clear or re-anchor — a state question rather than an interaction
  one. Nothing here handles it, and today no control can change the window.
- **2.13.8**'s walk inherits a page with **two** readout strips, one of which is
  deliberately absent from the accessibility tree. That is the claim to walk
  rather than to re-read: is the volume figure genuinely reachable without a
  pointer, in a real screen reader, through the price plot's one tab stop?
- **Epic 5** owns the clause this strip does not have. _"Volume 3.8× normal"_
  belongs here eventually and the baseline that computes it does not exist; a
  readout comparing this bar to anything is a number this product is not yet
  entitled to state.
- **Epic 3** owns a reading over a series that is still moving. Everything here
  assumes the bar under the crosshair is finished.

---

# Part five — the control on screen, added 2026-09-13 by Task 2.13.6

Everything in Parts one to four was arithmetic, vocabulary and drawing. This is
the part where a person can change the window, which is the first thing in
MarketPulse that changes **what the data says** rather than how it is drawn.

Four decisions were left open and are taken here — the ARIA pattern, what the
address does with a value that is not a count, whether a window change pushes
history, and whether a change of security carries the window. Two things the
canvas had settled were **corrected by building them**. And the `1d` body this
task was told to record turned out to be carrying a defect that nothing in the
repository could have found by reading.

---

## 30. The `1d` window, and the two things recording a body found

§2.3 put the recorded `1d` body in this task and gave a reason: two branches of
`chart-alternative.ts` were unverified English, and five surfaces printed a time
of day for a bar that at `1d` is a whole session. Both were right. Neither was
the interesting half.

**Two bodies are recorded**, not one, and both came off the **deployed** store
rather than a developer's — `daily.json` (NVDA, 63 sessions, the `3M` window) and
`daily-year.json` (252 sessions, `1Y`). The deployed store is backfilled nightly
at both timeframes; a local one holds whatever it was last handed, so recording
there would have produced two bodies whose shortfall was a laptop rather than the
market. `fixtures/bar-series.ts` carries both commands.

### 30.1 A daily bar is stamped at midnight, and the chart drew nothing

`2026-06-12T04:00:00.000Z` is **00:00 EDT**. Nobody in this repository had seen a
`1d` bar, which is exactly why the decision was deferred to a recording.

The consequence nobody predicted: **`positionOfInstant` placed every daily bar
between two sessions**, because midnight is earlier than any session's open, so
`placeBars` dropped all 63 of them. `3M` rendered a **correct axis, a correct
headline, a correct coverage sentence and no line at all** — a blank frame that
looked like a security that had not traded for three months. Nothing anywhere was
red: all fourteen recorded bodies were `1m`, so no test in the repository could
reach the branch.

**The repair is a rule rather than a special case.** On a daily axis a slot _is_ a
session, so an instant is placed by **the session it belongs to** rather than by
where it falls inside one — its market date against the axis's session dates, with
the fraction through that session's trading hours kept so that a **coverage edge**
at Friday's close still marks Friday as covered. An instant on no session's date —
a weekend, a holiday, the hours past the last session — falls through to the same
boundary arithmetic a `1m` axis uses, which was already the right answer for it.

Four tests in `chart-time-axis.test.ts` hold it and the break was performed:
deleting the branch takes three of them red and leaves the other 810 green.

### 30.2 Six surfaces printed an hour nothing traded in, and one was not on the list

`formatBarInstant` was unconditional, so a daily bar read `Jun 12 · 00:00 EDT`.
2.13.5's amendment listed five call sites. There are **six**: the sixth is
`BarSeriesPanel`'s `First → last` row, which is two **bars** sitting between two
rows that are **windows**, and it was found by looking at a `1d` window on the
running page rather than by reading the list.

**Fixed in the one function all six already called**, which takes a `Timeframe`:
`1m` keeps `Sep 4 · 09:30 EDT` and `1d` becomes `Jun 12`. The zone goes with the
time rather than surviving it — `Jun 12 EDT` asserts a zone about a _date_, which
is not a thing a date has, and the session date is already a market date resolved
in the market's own zone.

**What keeps `formatMarketInstant`**: every instant that belongs to a **window**
— both coverage ranges, the panel's two window rows, the announcement's
sentences. A window genuinely has a second in it, and at `1d` it genuinely runs
midnight to midnight. The split is _bar_ against _window_, not precise against
rounded.

### 30.3 The high–low extent band, drawn and declined a second time

2.13.4's amendment handed this task a **measurement**: draw the band at 3M and at
1Y against a real `1d` body and decide from the number. Done, and the number
overturns `CHARTING.md` §12.2's stated reason rather than confirming it.

| Window | Median session range, as pixels of a 280 px plot |
| ------ | -----------------------------------------------: |
| 3M     |                                           **31** |
| 1Y     |                                           **18** |

It is legible. `1m`'s hairline argument does not apply, so this is a genuine
re-decision.

**Decided: no band, and what declines it is collision rather than size.** The
plot already spends its area on a decided encoding — the directional wash split
at the price the window opened at — and the band wants the same pixels. Four
arrangements were drawn against the real body and looked at:

- **Over the wash** — a grey fringe eating into the green; reads as a printing
  misregistration rather than as an encoding.
- **Under the wash** — visible only where it exceeds the line; reads as a drop
  shadow.
- **At 18% alpha** — the same two problems, softer.
- **Instead of the wash** — a clean high-low-close picture, and the chart stops
  saying which way the window went at one timeframe and not the others. A chart
  that means different things at different windows is worse than one that says
  less.

And the information is not lost: each session's high and low are stated
**exactly** in the readout under the pointer or the arrow keys, and the window's
in the metric strip below. The four drawings are on the canvas (§13) so the next
person to propose it can see what it looks like rather than re-deriving it.

**Reversal trigger — a condition:** the first plot that stops spending its area
on a directional wash. Epic 8's comparison view draws several series and cannot
wash any of them; that is the plot where an extent band has the area to itself.
`CHARTING.md` §12.2 has a dated amendment and `--price-unchanged-wash` now has
**no** future consumer named against it.

### 30.4 And the end columns, looked at again

§19.2 asked for a second look when 3M first drew. Looked at: the clipped half is
**6.4 px of 12.8 at 3M** and **1.8 of 3.7 at 1Y**. **Accepted again**, argument
unchanged — the repair is insetting the x-domain in _both_ plots, which moves the
price line's endpoints off the frame's edges to fix an artefact at the edge of the
supporting series. Trigger: the first time an end column has to carry a mark of
its own, which is Epic 5's overlay rather than anything in this story.

---

## 31. The address, and the four decisions in it

`?sessions=…` is the **first occupant of this product's query string**, which
`SEARCH-AND-SELECTION.md` §3 left empty on purpose.

**Read in one place and built in one place**, which is the symbol's arrangement
applied to the view: `routes/use-time-window.ts` decodes and `paths.ts`'s
`securityPath(symbol, sessions?)` builds. The parser is **not** in
`market/time-window.ts` and that is 2.13.3's decision standing: parsing is where
the open question lived, and the open question is about a URL rather than about
the vocabulary.

### 31.1 A value that is not a count is **asked for anyway**

The four cases §4 left open reduce to one rule, inherited from
`use-security-symbol.ts`: **this client refuses nothing; it asks, and renders the
answer.**

| In the address   | Asked for | What a reader sees                              |
| ---------------- | --------- | ----------------------------------------------- |
| absent           | 5         | the default, and no parameter is ever written   |
| `?sessions=7`    | 7         | a real answer; the control shows no selection   |
| `?sessions=0`    | 0         | the server's _"a window of zero sessions…"_     |
| `?sessions=-5`   | −5        | the server's refusal, naming `-5`               |
| `?sessions=1000` | 1000      | the server's refusal, naming the calendar bound |
| `?sessions=abc`  | `NaN`     | the server's refusal, naming `NaN`              |

Two decisions are inside that table.

**A value that is not a count goes on the wire as `NaN`.** The alternative —
treating it as absent and showing the default — is the snapping §4(b) forbids
wearing a different hat: it answers a question nobody asked and leaves an address
in the bar that disagrees with the chart under it. The cost is one recorded
imprecision: the server's sentence names `NaN` rather than the `abc` that was
typed, because `BarSeriesRequest`'s named window carries a `number`. Carrying the
raw text to the wire would fix the wording and widen a type every layer between
the address and `series-request.ts` reads. Not worth it; the sentence is still
_about_ the right thing and still states the rule the reader needs.

**A count is only read as a count when this application would spell it the same
way.** `?sessions=0x10` is a well-formed hex literal that `Number` reads as 16,
and asking for sixteen sessions while the address says `0x10` is precisely the
failure this module exists to refuse. So the test is a round trip:
`String(Number(raw)) === raw`. It admits `7`, `-5`, `0` and `3.5` exactly as
written and sends everything else as `NaN`.

An empty or whitespace-only value is **"the address did not name one"** —
`use-security-symbol.ts` already treats a whitespace-only path segment that way.

### 31.2 A window change **pushes** history

Back undoes it. Pressing a window is a deliberate act and the address it writes is
one a person can send, so the browser's own undo should reach it.

This is what forces manual activation on the keyboard (§32): with
selection-following-focus, arrowing from `1D` to `1Y` would push four addresses
for one intention.

### 31.3 A change of **security** does not carry the window

`/securities/NVDA?sessions=252` → clicking AMD in the table opens
`/securities/AMD`, at the default.

The argument is not that it would be wrong to carry it — it is that the table's
518 links would each have to carry the current window, and search's would too, and
an address built by something that did not know about the window is how the two
come to disagree. Carrying it in one of the two places and not the other is worse
than carrying it in neither. **Reversal trigger: the first surface that needs two
securities on one window** — Epic 8's comparison, where the window is genuinely a
property of the comparison rather than of a reading.

---

## 32. The ARIA pattern: a radio group with **manual** activation

§8 deliberately took no position on this and it is decided here.

`role="radiogroup"` with five `role="radio"` cells is what a closed set of
mutually exclusive options **is**, so the semantics were never in question. What
was open is whether selection follows focus, and the answer is **no**, against the
APG's default for radios:

- **The arrows move focus. `Space` or `Enter` commits.** One press is one window
  is one request is one history entry.
- Selection following focus makes arrowing from `1D` to `1Y` **four** window
  changes: four requests of up to 154 kB, four addresses pushed into history, and
  four answers announced. That is the expensive-commit case the APG's own guidance
  on automatic selection names.
- It costs one thing worth naming: a keyboard user arrows to `1Y` and nothing
  moves until they press. What tells them so is the radio itself — _"1 year, radio
  button, not checked, 5 of 5"_ — which is why this beat a `toolbar` of toggle
  buttons, where nothing in the announcement says a press is pending.

**One tab stop for five cells, held by the checked one.** So tabbing out of a
half-arrowed control and back returns to the window actually on screen rather than
to a cell somebody walked past — and that fell out of the control holding **no
state at all** rather than being arranged. The arrows wrap, because a five-member
set is a ring and `1Y → → → 1D` should not be four presses back.

**The arrows are `preventDefault`ed and `Tab` is not.** This control sits on a
`Region`'s heading row and a `Region` declares `overflow: auto`, so an unprevented
arrow scrolls the panel under the hand of the person operating the control; a
swallowed `Tab` would take the one stop out of the tab order it is in.

**What announces the change is the radio.** No live region was added, and that is
deliberate: this page already carries four, `FRONTEND-STATE.md` §7's rule is that
a region belongs to a subject, and the panel's own region announces the new answer
when it arrives. The window itself is stated in the chart's text alternative,
which already says _"the last N trading sessions"_ and now says a different N.

---

## 33. Two things building it corrected on the canvas

Both were drawn, both were wrong, and neither was reachable by reasoning about
tokens. They are corrected **in the canvas** rather than annotated in the code,
because ADR 0026 makes the canvas the source of truth and a canvas that disagrees
with the product is the failure it exists to prevent.

**The focus ring is on the cell, not the group.** §8's artboard drew it around the
bordered box, which is right for a control with one focusable thing in it and
wrong for this one: with manual activation, focus moves between five cells and the
ring is the only thing saying which one `Space` will commit. A ring around the
group names the control and hides the target. So it is the ordinary global
`:focus-visible` rule doing its job — and `a11y.module.css`'s `focusRingHost`
idiom, which was written with _this control_ named as its second consumer, is
**not** needed here.

**The readout has a second form.** §8.4 gives it one shape, `N SESSIONS`. If the
address admits any count the server accepts it also admits `?sessions=abc`, and
`NaN SESSIONS` is exactly the kind of figure this product must never print. So
there are two, and the second says what is wrong rather than guessing a number:
`NOT A SESSION COUNT`. It deliberately does not _explain_ — the sentence a reader
acts on is the server's refusal in the chart's own region, naming what was asked,
and a second explanation beside the control would be the
two-surfaces-describing-one-failure defect this product has already paid for three
times in one afternoon.

The readout is also the group's `aria-describedby`, which §8.4 did not settle. It
is drawn as a static micro-label and that is what it looks like; what a _listener_
needs is the same fact on arrival, because five unchecked radios announced with no
explanation is a control that sounds broken.

---

## 34. What this task did **not** need to write

Three of them, each because an earlier task built the thing properly.

- **No cancellation code.** A window change changes `barSeriesQuery(request)`,
  which is the cache key and the request; `useBarSeries` already supersedes the
  in-flight request and resets the view. The task file said _"if you find
  yourself writing some, something is being keyed differently"_ — nothing was.
- **No timeframe mapping.** `timeframeForSessions` is one call in the route, and
  the Done-when item about one home is a grep rather than a build.
- **No cap arithmetic and no pre-emptive size check.** §2.1's mapping forecloses
  the 10,000-bar cap for every session count from every source.

And one thing it deliberately did not do: **no `useMemo` anywhere.** 1Y draws at
252 sessions against a memoised calendar walk (2.13.3); if a wide window ever
feels slow, §16.5's figures are the place to start rather than a component.

---

## 35. What Part five hands on

- **2.13.7** owns every state of a window change — the held answer, the stale
  rail, a refusal over a previous window, and the labelling tension §6.3 names. It
  also inherits the one property this task could not close: **the control is the
  cheapest way in the product to observe a superseded answer in a real browser**,
  and that is still asserted in jsdom by request identity alone.
- **2.13.8**'s walk inherits a new tab stop, a radio group with manual activation,
  and a `1d` vocabulary nobody has heard in a real screen reader. The two `1d`
  sentences were read aloud here; what has not been done is hearing them in
  sequence with the six instants §30.2 changed.
- **2.13.9** inherits a measurable question this task did not take: the `1d`
  placement branch calls `marketDateAt` once per bar, which is **504 calls per
  frame build** at 1Y across the two plots. It is bounded and it is not on the
  pointer path, but nothing has measured it.
- **Epic 8** inherits the control itself. Its props are the vocabulary of a
  window — a list, a current value, a change callback — and it knows nothing about
  `useBarSeries`, the address or a security, so a comparison view drives it by
  passing a different list.
