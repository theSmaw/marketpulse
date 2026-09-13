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
