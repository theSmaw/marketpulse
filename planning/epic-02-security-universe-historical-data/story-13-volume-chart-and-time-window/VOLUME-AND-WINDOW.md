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

**Amended 2026-09-13 (§71): it is no longer on the heading row.** It sits on a
row of its own at the top of the panel, sharing that row with the held-window
rail. The reason above still stands — this is not a page-level control bar, it
is one row inside one panel — and what it did not weigh is that a control on a
heading row makes _that_ region's heading taller than every other region's on the
screen, and that the rail had nowhere to go but into the flow above the chart.
The reversal trigger is unchanged.

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

---

# Part six — every state of a window change, added 2026-09-13 by Task 2.13.7

§§1–6 settled what the product offers, §§8–16 what it looks like, §§18–21 the
rendering, §§22–29 the reading and §§30–35 the control. What is decided **here**
is the thing none of them could express: **what is on screen while the answer to
a different question is in flight, and what stays there when that question is
refused.**

Two of the four decisions below are overrides of a behaviour that already
existed rather than choices between blank options, which is the shape this
story's later tasks keep taking — and one of them was found by looking at the
running page.

---

## 36. Decision — **the last answer stays on screen, and the rail names it**

§6.3 named a tension and left it here. `refused` and `failed` draw **no frame at
all**, deliberately, because neither carries a window a frame could be built
from; acceptance criterion 4 asks that a failed window change leave the previous
data visible. Both are right, and exactly one thing makes them readable
together.

**Decided: the last _answer_ this page painted stays on screen until a newer
answer replaces it, and the label above it says which window it is of.**

```
The last answer this page painted is kept, together with the request it
answers, until a newer answer replaces it. It is cleared when the security
changes, and never otherwise.
```

### 36.1 It is **not** a seventh state, and the reasons are three

`held-series.ts` carries them in full; in short:

- **`stale` is not this.** That flag means _the same request, one request old_.
  A held answer to a **different** window is not a stale answer to this one: the
  numbers in it are not about to be replaced by better numbers for the same
  question, they are about to be replaced by an answer to another question. The
  two marks both exist and they say different sentences.
- **A union member describes one request and this is a fact about two.** A
  seventh member would land in every consumer's `switch` for ever and each would
  have to re-derive which answer it was holding — which is the answer members
  with a boolean, spelled longer.
- **`FRONTEND-STATE.md` §2's reversal trigger stays unfired.** That trigger is
  _a chart that redraws a held series in a second style_. Nothing here redraws
  anything: the held series is the same series, drawn the same way, and the only
  difference is a rail above it.

### 36.2 The fence is the **security**, and it is the whole of the safety

A held answer survives a change of _window_ and never a change of _security_. A
held NVDA series under an AMD heading is plausible and wrong rather than visibly
broken, which is the failure this layer has been careful about since Story 2.10;
so on a symbol change the panel returns to `loading` exactly as it did before,
and the browser suite asserts it.

### 36.3 It repaired a second blanking nobody had reported

The rule is about **the last answer**, not about the window, which means it also
covers a case that is not a window change at all: a cached answer paints on
mount and the refetch behind it fails. Before this task, a correct chart was
replaced by a failure with no window in it. Same shape, same rule, no extra
code.

### 36.4 What it is spelled as

One value, `BarSeriesScreen`, with four fields — the answer to the request being
made, the answer being **drawn**, the request being asked, and the request the
picture answers when it is not that one. **One producer and no other way to
obtain one**, which is a fence rather than a convenience: a component handed _the
answer_ and _the picture_ as two props can be handed two that disagree, and that
is a screen the application cannot reach and a reviewer cannot tell from one it
can.

---

## 37. Decision — one rail, four sentences, and only one of them is new copy

The stale rail has existed since Task 2.10.8 and says _Refreshing — showing the
held answer while a newer one is read._ That sentence is correct only when the
held answer answers the **same** window. A window change is the first thing in
the product that makes it false, so the rail gains a subject rather than a
sibling.

| What happened                 | The rail says                                                                    | Carries                        |
| ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| Same window, refreshing       | _Refreshing — showing the held answer while a newer one is read._                | a travelling dashed rule       |
| A different window, in flight | _Still showing the 5-session window while the 21-session window is read._        | a travelling dashed rule       |
| The new window was refused    | _Still showing the 5-session window. The 1,000-session window was not answered._ | the server's sentence          |
| The new window failed         | _Still showing the 5-session window. The 21-session window could not be read._   | one `Try again`, one reference |

Four things about those are decisions rather than wording.

**The marker is the same dashed silhouette in all four**, because none of them
is a fault in the figures underneath. No red, no amber, no box.

**The window is named as a session count** — `the 21-session window`, never
`1M`. The count is the fact and the label is the approximation (§4e), an address
may name a window the control does not offer and that window has no label at
all, and the rail sits a few centimetres from a readout already saying
`21 SESSIONS`. `describeSessionCount` is now the one spelling and the control's
readout reads it too. A window that cannot be named as a count — an absolute
range, or `?sessions=abc` — gets _the window asked for_, and **no number is
invented**.

**Only the in-flight form marches.** Motion means work in progress and nothing
else here; a travelling rule under a refusal would say a newer answer is on its
way when none is. The **dashes** stay in all four, which is where the meaning
lives, and under `prefers-reduced-motion` all four are the static rule.

**The screen's one `Try again` is on the rail**, not in the body. The body
beneath is a correct answer to a window that did not fail; a retry sitting under
those figures would offer to re-read something that worked.

### 37.1 One correction, taken from the running page

The rail was first drawn with the rule on its **first line**, which is where
`.refreshing` carries it. With a refusal's second sentence and a failure's
control below that line, the mark that was meant to group them sat in the middle
of the group, and the whole rail read as body copy between the symbol and the
price. **The rule belongs to the block it closes**, and it moved there.

---

## 38. Decision — the reading **re-anchors by instant**, and clears only outside

The task brief asked whether a reading _clears or re-anchors_ across a window
change. That was written before the read position existed. It exists, it has a
behaviour, and the behaviour is neither of those two — so this is an **override
of a built default**.

### 38.1 The default, precisely

The read position is an index into `readings`. A window change replaces the
series, rebuilds both arrays and does not touch the index. So:

| The new window is     | What the reader gets                                     |
| --------------------- | -------------------------------------------------------- |
| **shorter**           | no reading — the index is out of range                   |
| **as long or longer** | a reading of a **different bar**, silently and plausibly |

The second row is the one that matters. Index 900 of five sessions of minute
bars and index 900 of a year of sessions are not adjacent facts; they are
different years. The crosshair lands somewhere real, both strips state a real
instant and a real volume, and nothing is wrong on screen except the answer.

### 38.2 Why it has not been seen, and why that is not a reason to leave it

Both input paths clear the reading on the way to the control: a pointer
travelling upward fires `onPointerLeave`, a keyboard user tabbing to it blurs the
plot. **That is a coincidence of layout, and a coincidence of layout is not a
decision.** Epic 11's `setTimeWindow` changes the window with nobody touching
anything, and a rapid sequence of presses lands a second change while the first
answer is in flight.

### 38.3 Decided: keep the instant, find the nearest placed bar, clear outside

`ChartRead` gains `at` — the bar's market instant in epoch milliseconds — and
`resolveRead` is the one function both overlays call. The fast path is the index
still addressing its own bar, which is what runs on every pointer move; the
search runs once, on the frame a window change lands.

**Clearing on every change was the cheap alternative and was declined**, because
four of the five windows overlap in time: the instant a reader was looking at is
usually still in the new picture, and throwing it away answers a question nobody
asked. Crossing from `1m` to `1d` re-anchors to the **session containing the
minute**, which is the same day at the granularity the new window has.

**Outside is `null` rather than clamped.** 1Y → 1D would otherwise answer with
the earliest bar of a single session, presented as the one the reader was
looking at.

**And nothing here touches focus**, which is the other half of the decision: a
reading cleared by a window change leaves focus exactly where a reading cleared
by `Escape` does. `ChartReading.test.tsx` drives all of it from the keyboard,
with no pointer anywhere, which is the case that is hard to reach.

---

## 39. §1.3's trigger, answered: **1D stays**

§1.3 offered 1D knowing it would be `empty` until Epic 3, and wrote a reversal
trigger that needs a person: _if the empty rendering at 1D reads as a broken
product rather than as an honest one when somebody looks at the screen, 1D is
withdrawn._ It was looked at, at 1440 in a real browser, on both stores.

**The trigger did not fire. 1D stays.** Three things carry it, and none of them
is the absence of a line:

1. **The frame is real.** Gridlines and the session's own date are drawn from
   the window that was asked for, so the axis is a picture of a real trading day
   rather than a placeholder.
2. **The whole plot is uncovered ground** — the same mark a partial answer uses
   for its short tail, so a reader who has seen one has already learned this one.
3. **The sentence names the window, the fact and the schedule**: _We asked for
   2026-09-11 09:30 → 2026-09-11 16:00 EDT and hold nothing in it. A window
   reaching into the current session is usually this: stored history is caught up
   overnight._

What would have made it read as broken is a bare empty box, or a frame with no
labels on it. Neither is what it draws.

### 39.1 And a correction to §1.3's premise, from the deployed store

§1.3 says 1D is **reliably** empty. That is true only _during_ a session. Looked
at on the deployed page on **2026-09-13, a Saturday**, `?sessions=1` resolved to
Thursday's session, which the nightly backfill holds in full: a complete
intraday line, 218.19 at −1.38%, no uncovered ground anywhere. So the honest
statement is that **1D is empty during a session and complete outside one** —
which is weaker than the premise the trigger was written against, and weaker in
the direction that makes withdrawing it harder to justify rather than easier.

---

## 40. One defect this task found by looking, and it is older than the task

**A chart whose first commit has no frame was never measured again for the life
of that mount.**

Both plots return `null` before they have a window to draw. `usePlotBox`'s effect
ran against `[report, role]`, neither of which ever changes — so on a mount that
begins in `refused` or `failed` the refs were empty when the effect ran, the
`ResizeObserver` was never created, and **nothing re-ran the effect to create
one.** Pressing a window with bars then rendered a real frame with a zero
measurement in it: an `<svg>` at 0 × 0 inside a plot 939 px wide, the compact
density class at a 985 px region, and a panel of correct figures under an empty
box.

**It was reachable the moment Task 2.13.6 put the window in the address**, by
exactly one route and a short one: a cold link to `/securities/NVDA?sessions=1000`,
then any window with bars. The navigation is client-side, so the component never
remounts.

The repair is that the two elements are **state rather than refs**. A ref does
not notify anything when it is filled; state does, and the effect's dependencies
then include the elements themselves.

Two things about finding it are worth keeping.

**Nothing below `pnpm e2e` could see it.** jsdom implements no `ResizeObserver`
and computes no layout, so the measurement is zero there with the repair and
without it. `e2e/specs/security-window-change.spec.ts`'s _a chart that arrives
after a refusal is measured, and draws_ is the only instrument, and the break was
performed: restoring the refs takes exactly that test red.

**And the first attempt to verify it in a browser was measuring the wrong
thing.** A tab driven over CDP reports `document.visibilityState === "hidden"`,
which pauses `requestAnimationFrame` — and `ResizeObserver` delivery with it. A
freshly constructed observer on a laid-out 939 × 221 element fired **zero times
in 500 ms**. Every chart in that tab measured zero whether the repair was present
or not, which looks exactly like the defect and is not it. The lesson generalises
past this task: **an automated browser that is not painting cannot be used to
judge anything that depends on layout delivery**, and Playwright's page — which
is visible — can.

---

## 41. What Part six hands on

- **2.13.8**'s walk inherits a rail with four sentences, a spoken clause that
  names which window is still on screen, and a reading that can now survive a
  window change — so the screen-reader walk has a state nobody has heard: a
  crosshair re-anchored by an agent rather than by a hand.
- **2.13.9** inherits `resolveRead`'s search, which is a binary search over
  `readings` and runs once per window change rather than on the pointer path.
  Nothing has measured it and nothing needs to until something calls it per
  move.
- **2.13.10** inherits §39's answer as a settled decision rather than an open
  trigger, and inherits the fourth consecutive deferral of design test 4 — which
  §14.2 already asked Story 2.14's close to record as a count.
- **Story 2.14** inherits the one fence this task did not move: a held answer is
  a series like any other, so a stitched series naming two feeds carries its
  provenance line beneath the chart exactly as a fresh one does. What this task
  owes it is only that the rail sits **above** that line rather than in its
  place, and it does.

---

# Part seven — the walk (Task 2.13.8)

## 42. Acceptance criterion 3, and why it could not be proved through the control

> **"5 days" is five trading sessions across a week containing a holiday.**

The task's instruction was to prove this **through the control**. That
instruction predates §4(a) and is not satisfiable as written, which is worth
stating plainly rather than working around quietly.

The week is `2026-11-23 … 2026-11-30`. **It is in the future.** The address
carries `?sessions=N` — a **count**, resolved by the server against the market
date it is answering on — and there is no absolute form in it at all:
`bar-series-query.ts` supports one, `paths.ts` does not write one and
`use-time-window.ts` does not read one. Epic 13's scrubber introduces one, and
adding it here to satisfy a test would be scope creep into another epic's
vocabulary. So no press of any cell and no hand-typed URL reaches November from
September.

What was done instead is the 2.13.6 amendment's options **(1) and (2) together**,
which between them cover everything the instruction was after.

### 42.1 The request and the resolution, at the layer that owns them

`apps/backend/src/routes/market-data.test.ts` drives the **shipped route**
through `app.inject()` with its clock seam pinned to `2026-11-30T21:05:00.000Z`
— 16:05 ET on the Monday after Thanksgiving — and asks it for `?sessions=5`.
It answers:

| Field                      | Value                                              |
| -------------------------- | -------------------------------------------------- |
| `coverage.requested.start` | `2026-11-23T14:30:00.000Z`                         |
| `coverage.requested.end`   | `2026-11-30T21:00:00.000Z`                         |
| Span                       | **7.27 calendar days**, for **5 trading sessions** |

**14:30Z and 21:00Z rather than 13:30Z and 20:00Z**, because that week is on EST
rather than EDT — an instant the calendar converted, not a constant anybody
typed. The span assertion is the one that says _sessions and not days_.

### 42.2 The picture, from a body this product's own server produced

`apps/frontend/src/fixtures/bar-series/holiday-week.json` — **1,770 bars,
357 KB, the largest thing in that directory** — was generated by the
arrangement above over rows built from `lastMarketSessions(5, "2026-11-30")`,
one per trading minute of each session. The counts come out as the calendar
dictates and not as anybody chose:

| Session      | Bars    |
| ------------ | ------- |
| `2026-11-23` | 390     |
| `2026-11-24` | 390     |
| `2026-11-25` | 390     |
| `2026-11-26` | **—**   |
| `2026-11-27` | **210** |
| `2026-11-30` | 390     |

**This is a departure from the fixture rule and it is argued rather than
slipped in.** Every other recorded body came off a real store; this one could
not, because the store cannot hold a week that has not happened. What makes it
admissible is the split between what is generated and what is real: the
**instants, the session boundaries, the bar counts, the coverage and the whole
response envelope** come from the checked-in calendar and from the shipped
route, through the real `toStoredSeries` and the real response schema. Only the
**prices and volumes** are invented, and no assertion anywhere reads one — what
this body is for is _where the bars fall on an axis_. `fixtures/bar-series.ts`
carries the recording procedure.

`e2e/specs/security-holiday-week.spec.ts` serves it by intercepting
`GET /market-data/bars` and asserts **the rendering**, which is the half nothing
below a browser holds. The axis, the seams, the ticks and the coverage are all
computed client-side from `coverage.requested`, so the picture under test is
entirely real even though Playwright handed over the response.

The load-bearing assertion is the **band widths**. Four seams, not five — a
naive window would put one between Wednesday and Friday for a Thursday that
never opened — and the fourth band is `210 / 390` of the others:

```
Nov 23 |----390----| Nov 24 |----390----| Nov 25 |----390----| Nov 27 |--210--| Nov 30 |----390----|
   0.000            0.2203              0.4407              0.6610      0.7797            1.000
```

That **is** "no empty 13:00–16:00 band", stated as geometry. **Break-verified**:
forcing `timeAxis` to give every `1m` session 390 slots puts the seams at
0.2/0.4/0.6/0.8 and takes exactly that test red.

What is deliberately **not** re-derived here: `chart-geometry.test.ts` already
holds the week at the axis level, including the assertion that actually rules
out an empty afternoon — 14:00 ET on the half day answers `boundary`, the same
answer the axis gives a night or a weekend.

## 43. What the walk found

Five things, and four of them are repaired in this task. The task's Notes said
to budget for the finding rather than for the confirmation; that was right
again.

### 43.1 The volume plot's spoken sentence did not agree with its own subject

> The columns cover the first 780 of 990 trading minutes in the window and
> **stops** at 16:00.

`Mark` (§24's vocabulary) parameterised the subject and the first two verbs and
left the third singular. It shipped in Task 2.13.4 and was heard for the first
time here, and the reason nothing saw it is the reason it is worth writing down:
**`volumeAlternative` had no unit test at all.** `chartAlternative`'s suite reads
the same clause through `LINE`, where every verb is singular and the sentence is
correct; the browser suite asserts that the volume sentence **exists**, not what
it says.

Repaired by adding `stop` to `Mark`, and the hole behind it is closed by a
`volumeAlternative` describe block that reads the same shapes through the other
mark. **A vocabulary with two members has to be read in both.**

### 43.2 A daily window said _the bars stop at_ an instant no bar is at

> …the window asked for runs to 2026-09-14 00:00:00 EDT and **the bars stop at**
> 2026-09-13 00:04:11 EDT.

Both instants there belong to a **window** rather than to a bar, which §30.2
settled and which is right. What was wrong is the noun: `daily.json`'s covered
range ends at `Sep 13 00:04:11` — the moment a backfill finished — and its last
bar is `Sep 11`. The clause was false by two sessions on every daily window, and
true by coincidence on every minute one, because a minute series' covered range
ends at a session close.

Now **"what is stored reaches only to"**. `CHARTING.md` §15.3 carries a dated
amendment beside the Story 2.12 quote rather than a rewrite of it.

### 43.3 A half day's midday tick was drawn on top of the next session's date

The holiday week's own rendering, read off the screen:

> `Nov 27    12:00Nov 30    12:00`

A midday tick is placed at 12:00 in each session and a session normally runs to
16:00, so it lands 240 slots of 1,950 — 12% of the axis — before the next date.
On `2026-11-27`, which closes at 13:00, it lands **60 slots of 1,770**, which is
3.4% and at the wide region is **32 px**. `12:00` is about 34 px in the data face
and `Nov 30` about 44 px, both centred on their slot, so the two need roughly
47 px and had 32.

Repaired with a floor on the gap — `MIN_TICK_SEPARATION = 0.05` of the axis —
applied in `timeTicks`, where both kinds of tick exist. **The tick that loses is
always the time**: §7.1's answer 9 is that a session boundary carries the date
and everything between carries the time, and the date is the thing the ordinal
axis took away. Break-verified at the unit level, and looked at.

It is deliberately a rule about a **gap** rather than a branch about half days: a
window clipped mid-session produces the same collision from the other direction,
and neither case is worth its own code.

### 43.4 The window control's readout was attached to something no key press reaches

This is the one Task 2.13.6's amendment told this walk to **check rather than
assume**, with the note that the control is focusable so it passes. It does not.

The readout — the only thing on screen that says `1M` means twenty-one trading
sessions, and the only thing that explains an address naming a count the control
does not offer — was wired with `aria-describedby` on the
**`div[role="radiogroup"]`**. This is a roving-tabindex group: the tab stop is
the checked **cell**, the container has no `tabindex` and is never focused, and
a description on a container is not part of a child's accessible description.
So the sentence was computed correctly, attached correctly, visible on screen
and **unreachable by any key press**.

That is `TextField`'s two-task defect exactly, reached by a different route.
`CLAUDE.md` already carries the class — _nothing compares an `aria-describedby`
against whether the described element can be focused_ — and it caught a second
instance the first time somebody walked a new control.

It hangs off **every cell** now. A listener arriving hears _"1 month, radio
button, 3 of 5, 21 sessions"_; arrowing to `3M` under manual activation they
hear _"3 months, radio button, 4 of 5, 21 sessions"_ — the readout still naming
the window **on screen**, which is exactly what a sighted reader sees for the
same press, because arrowing has not committed anything. **Parity between the
two channels was the test applied**, rather than what reads best alone.

Held by `e2e/specs/security-window-control.spec.ts`'s _the window on screen is
described at the stop focus lands on_, which walks to the stop and reads the
description **off the element focus actually landed on**. Break-verified by
moving the attribute back.

### 43.5 A gap-list entry that was over-stated, found by running its own re-measure

Task 2.13.4's entry says the three dash rhythms — the seam's `3 3`, the coverage
edge's `6 3` and the reference rule's `2 4` — live once in
`chart-marks.module.css`, and hands over a `grep` to prove it. Run here, the
`grep` finds one in `PriceChart.module.css`.

**The tree is right and the entry was wrong.** The seam and the edge have **two**
consumers each and are shared; the reference rule has **one**, because volume
declines it deliberately (§12), and a rhythm with one consumer needs no shared
home. What is genuinely unchecked is the thing the entry was _about_ — that the
three stay **distinct from each other**, wherever they live — and nothing
compares them. `CLAUDE.md` now carries that, with a re-measure that counts three
declarations and looks for a fourth.

It is a small thing and it is recorded because of what it demonstrates: a
re-measure command that has never been run is a claim, not a check.

### 43.6 And one finding that is a measurement rather than a repair — see §45

## 44. The walk itself, recorded

Conducted in **Playwright-driven Chromium**, `document.visibilityState` read as
`visible` before every observation that depends on layout. 2.13.7's amendment is
the reason that is stated: a tab driven over CDP reports `hidden`, which pauses
`requestAnimationFrame` and `ResizeObserver` delivery with it, and every chart in
such a tab measures zero — indistinguishable on inspection from a real defect.

### 44.1 The tab order, per state, at four widths

Counted from the top of the document to the tracked-universe panel, at 1440,
1024, 768 and 390. **The count is a property of the state, not of the page**,
which is what the task asked for:

| State                        | Stops | The eighth stop            |
| ---------------------------- | ----- | -------------------------- |
| `loaded` / `partial`         | 15    | the chart's one tab stop   |
| `refused` (`?sessions=1000`) | 14    | — (no chart, no retry)     |
| `refused` (`?sessions=abc`)  | 14    | —                          |
| `failed` (503 on the bars)   | 15    | the rail's **`Try again`** |

The pair adds no stop (§25) and the control adds exactly one, roving, held by
the checked cell — so the delta against Task 2.11.9's count is attributable
rather than a bisection. The pleasing fact is the last column: **the rail's
retry occupies the position the chart's stop had**, because both sit inside the
Price region between the control and the next panel.

**Zero stops land behind the sticky chrome, at any of the four widths.** The
chrome measures 132 px at 1440 and 1024, 180 px at 768 and 208 px at 390 — it
widens as the viewport narrows, because the status strip wraps — and
`--sticky-chrome-height` and `scroll-padding-top` agree with the header's own
rendered height at every one of them.

**And an instrument note, because it cost time and will cost it again.** A walk
taken 1,800 ms after navigation reported an occluded stop at 1024 that is not
there; the same walk at 2,500 ms, run three times, reports none. The page is
still settling — the charts measure, the panels reflow — and a stop measured
mid-reflow is measured against a layout that no longer exists. **Wait for the
answer before counting**, which is what `search-keyboard.spec.ts` already does
and what an ad-hoc script forgets.

### 44.2 axe, at three viewports and six states

Clean in all **eighteen** combinations: `loaded`, both reachable refusals, the
`1M` window, the `3M` window (`1d` bars) and a stubbed 503, each at 1440×1000,
1024×900 and 390×780, whole-document.

**And it certifies none of the four findings above.** It read zero violations
across every one of them: it cannot see a plural subject with a singular verb,
it cannot see a clause that is false by two sessions, it cannot see two labels
drawn on top of each other, and it cannot see that a description is attached to
an element focus never reaches. That last is the one worth naming, because it is
the closest to something a checker ought to catch: `aria-describedby` **resolved**
to a real element with real text, which is all axe asks.

### 44.3 Greyscale and deuteranopia, over the pair

§12 and §8.2 decided before anything was drawn that the volume columns carry no
direction and that the control's selected state spends no hue. Task 2.13.2's
amendment therefore made this a **confirmation**, and 2.13.4's amendment noted
the instrument was missing: `PriceChart.stories.tsx` has carried simulations
since Task 2.12.5 and the pair had none.

`Market/ChartAxis → Greyscale` and `→ Deuteranopia` now render four windows —
the dense default, an hour, the coverage edge and a **`1d`** window, which
neither simulation had ever been run over — and they were looked at:

- **The volume columns are one ink at every window**, in colour, in greyscale
  and under the deuteranopia matrix. Nothing on that plot was ever distinguished
  by hue, and nothing is.
- **The price chart's direction still reads**, from the line's position against
  the dashed reference rule. Top to bottom: up, up, up-and-stopped-early, and a
  `1d` window that **dips below the rule in the middle and finishes above it** —
  which is the one row where both washes are on screen at once and the reason
  the split was worth having. In grey they are the same grey (1.009:1) and the
  geometry says everything.
- **The coverage edge and the uncovered ground never had a hue**, and the two
  frames still stop at the same x under both filters.
- **The crosshair's disc is findable**, which was 2.13.5's amendment's question
  and is the one thing here that reasoning could not answer. Under `grayscale(1)`
  on the dense window it sits at `400,104` inside a silhouette column whose ink
  reaches `3.13M` — visibly below the ink above it. That is the picture admitting
  what it rounded, with the hue removed.

The apparatus moved to `src/story-simulation.tsx` so the filter and its eleven
matrix numbers have **one home** rather than a second copy in a second
stylesheet. It sits outside `src/components/` because `pnpm stories` asks every
`.tsx` there for a stories file and a hidden filter definition has no states
worth reviewing side by side.

`TimeWindowControl.stories.tsx`'s `AllPermutations` was read rather than written:
seven states and the same seven under `grayscale(1)`, and the selected cell's
2 px bar, weight step and ink step are identical in both halves. The two states
with **no** selection — `7 SESSIONS` and `NOT A SESSION COUNT` — read as
deliberate in grey, which is §8.4's whole argument.

### 44.4 The text alternative, extended for a window the reader chose

Both sentences gained one clause: **"The frame is drawn across 5 trading
sessions."**

Until Task 2.13.6 there was one window and nobody had picked it, so naming its
two instants named everything there was to name. Now the window is a choice, and
this sentence was the only surface describing the picture that never said which
of the five it was describing — a `1m` frame stated its width in **trading
minutes**, so a listener on `1M` heard _8,190 trading minutes_ and had to do the
division, and a completely covered `1d` frame stated no count at all.

Three things about it are load-bearing:

1. **The count comes off `axis.sessions`**, so it is the **resolved** one.
   `?sessions=7` is an address this product honours, an agent's `setTimeWindow`
   may ask for thirty, and Thanksgiving week is five sessions over seven
   calendar days. It is the number the picture is actually divided into.
2. **It is `timeAxis` again rather than a second derivation.** `CLAUDE.md`'s gap
   list carries the hazard: the sentence and the wash agree only because both
   count the same axis. A clause computed from elapsed days would report
   **eight** on the holiday week — one for the holiday and two for the weekend,
   none of which this axis gives any width to.
3. **"Drawn across" rather than "N sessions wide"**, which is a smaller word and
   a real difference. An absolute window can ask for one hour of one session —
   `flat.json` is exactly that, and Epic 13's scrubber will produce them
   routinely — and a frame holding sixty minutes is drawn _across_ one session
   without being one session wide. The named form the control sends is always
   whole sessions, so the two readings diverge only where the address cannot go
   today; the wording that stays true in both costs nothing.

One vocabulary with the control and the rail: **sessions**, never `1M`.

### 44.5 The `1d` English, heard in sequence

2.13.6 owed _"somebody read the two `1d` sentences aloud"_ and paid it against a
recorded body. What was still owed was hearing them **in sequence with the six
instants §30.2 changed**. Read off the running page at `?sessions=63` and
`?sessions=252`:

> NVDA price chart: a line of 59 closing prices, **one per trading session**,
> opening at 204.86 and ending at 230.36, up 12.45% across the window. **The
> frame is drawn across 63 trading sessions.** … The line covers the first **59
> of 63 sessions** in the window…

> NVDA volume chart: 59 columns of traded volume, one per trading session,
> measured from a baseline of zero to **the window's busiest session**. … The
> tallest column is 300 million, **at Aug 27.**

> NVDA chart reading: **Sep 3**, close 228.45, up 1.08% on the bar. Open 226.02,
> high 230.40, low 224.75. Volume 135 million.

`intervalWord`, `slotWord`, `slotUnit` and `formatBarInstant` all read correctly
at `1d`, and no bar instant carries a clock. The **one** midnight a listener
still hears is `00:00:00 EDT` on the two **window** instants, which is §30.2's
decision heard rather than re-opened: a daily window genuinely runs midnight to
midnight, and the split this product keeps is _bar against window_.

## 45. The listener's half — what was verified here, and what a person still owes

> **Amended 2026-09-13 by Task 2.13.10.** These three questions were handed to
> Story 2.14's close, moved back to Task 2.13.10 the same day, and **2.13.10
> could not answer the one that decides the other two.** Whether a polite region
> changing every 477 ms queues or replaces is a property of a specific screen
> reader on a specific platform; it is not readable from the DOM, from a timing,
> or by an agent. §65 records what was done, what was not, and who owns the rest
> — a person with a screen reader, before Epic 11 hands this surface to an agent.
> The repair is designed and unshipped rather than deferred by accident.

**Three of this walk's questions are about a real screen reader and nothing else
can answer them.** What was done instead of claiming otherwise: the live regions
were instrumented with a `MutationObserver` and the actual sequences were driven
and timed. That is strictly more than a test asserting a string exists, and it
is strictly less than listening.

### 45.1 A bar's traded volume does reach a listener, and the clause is last

2.13.5's amendment asked one question: _can somebody who cannot see the screen
get a bar's traded volume?_ The path is `Tab` to the price plot, arrow to a bar,
hear the sentence. Driven, and the region says:

> NVDA chart reading: Sep 4 · 15:58 EDT, close 230.28, down 0.05% on the bar.
> Open 230.40, high 230.58, low 230.25. **Volume 882 thousand.**

So the mechanism works and the figure is there. **The concern is the length.**
That sentence is 25 words; at a default rate of roughly 180 wpm it takes about
**8 seconds** to speak, and `READING_ANNOUNCEMENT_MIN_GAP_MS` is **1,500** —
chosen in Task 2.12.6 as "roughly how long a screen reader takes to read one of
these sentences", **before Task 2.13.5 added the volume clause**. Measured here,
two arrow presses produced announcements 477 ms and 1,981 ms after the start: the
floor is honoured, and it is about four times faster than the sentence can be
spoken.

Whether that produces a **queue** or a **replacement** is reader-dependent and is
precisely what cannot be settled from here. If it queues, the volume clause is
the first thing lost, because it is last.

**Owed to Task 2.13.10, with the repair already named** — reassigned there the
same day, because this story built the sentence and `CLAUDE.md`'s rule is that a
screen's quality is an acceptance criterion on the story that builds it: if a
listener
stepping along bars cannot get to the volume, split the sentence — instant,
close and direction while stepping, and the four prices and the volume on a
pause — rather than raising the floor, which would make a fast walk silent.

### 45.2 The held-window clause arrives, and it is also last

Driven with a real 503 on a real window change:

> NVDA: the series could not be read. This is usually temporary. Try again in a
> moment. **The 21-session window is still on screen.**

It is appended after the state's own sentence, as §37 designed. Same class of
question as above and the same owner: it is the clause that tells a listener
_the page kept the previous answer_ rather than _the page went blank_, and it is
the part of the sentence most likely to be cut short.

`describeSessionCount` is spoken in two places and they were compared as one
vocabulary rather than by grep: the control's description says `21 sessions` and
the rail says `the 21-session window`. Same noun, same number, an attributive
compound in one and a count in the other — which is English rather than two
vocabularies.

### 45.3 A window change does **not** announce that the crosshair moved

Driven: arrow to a bar, then press a window cell. The crosshair re-anchors — the
strip shows a real bar in the new window — and **nothing is announced about it**.
The only thing spoken is the panel's own sentence about the new answer.

That is the built behaviour rather than a defect, and the reason is §24's: a
**pointer** reading is never spoken, and a keyboard user reaching a window change
has gone `→ → Space`, which leaves focus in the control with the plot blurred
and no reading live. So **the re-anchor is mouse- and agent-facing**, exactly as
2.13.7's amendment predicted, and a later reader should not conclude it was
built for a path it does not serve.

It matters because **Epic 11's `setTimeWindow` puts this case in front of every
user**: an agent changes the window, the crosshair moves under a reading the user
did not move. Whether that wants an announcement is that epic's decision, and it
inherits a mechanism that already re-anchors correctly.

### 45.4 Manual activation, unheard

§32 chose manual activation on the claim that the radio's own announcement —
_"1 year, radio button, not checked, 5 of 5"_ — tells a listener a press is
pending. **That is a claim about a real screen reader.** The tree is right: the
cells are `role="radio"` with `aria-checked`, one roving stop, and since §43.4
every one of them carries the readout as its description. Whether _"not checked"_
is enough for somebody arrowing across five cells to understand that nothing has
happened yet is not answerable from here.

**Owed to Task 2.13.10.** If a listener cannot tell, the repair is either
selection-following-focus with a `replace`d address — which costs four addresses
and four requests for one intention, which is why §32 declined it — or an
explicit hint in the group's description.

## 46. What Part seven hands on

- **2.13.9** inherits a fixture with 1,770 bars in it, which is the first
  recorded body between the default window's 1,950 and the `1M` window's 8,190,
  and an axis whose sessions are not all the same width — a case its density
  arithmetic has never been measured against.
- **2.13.10** inherits four repairs to describe and one measurement (§45.1's
  sentence length against its own floor) that is a candidate for the story's
  close rather than for its own task.
- **2.13.10** also inherits the three questions that need a person and a pair of
  headphones (§45.1, §45.2, §45.4), each with its repair already named. They were
  handed to Story 2.14's close first and **moved back the same day**: all three
  surfaces are this story's, and `CLAUDE.md`'s rule is that the quality of a
  screen is an acceptance criterion on the story that builds it. Deferring an
  accessibility question across a story boundary is the same mistake as deferring
  polish across an epic one.
- **Story 2.14** inherits the one thing this task deliberately did not touch: the
  feed label's wording, read exactly as it was found.
- **Epic 11** inherits §45.3 as a stated behaviour rather than as an omission.

---

# Part eight — measured, added 2026-09-13 by Task 2.13.9

## 47. How every figure below was taken, and the instrument checked first

**Every number in Part eight was measured on 2026-09-13, on an Apple M-series
laptop (macOS/Darwin 23.6.0, Node 24.20.0), and is a dated observation of a
machine rather than a property of the code. Re-take rather than cite.**
[`CHARTING.md`](../story-12-price-chart/CHARTING.md) §0's method note applies
unchanged, and §16's is the one this part is comparable to.

Two runners, and which one a figure came from decides what it means:

- **The frontend's own vitest runner**, Node 24 / V8, **200 iterations after 50
  warm-up calls**. This is 2.12.9's and 2.13.3's method and the only reason the
  columns below are comparable to theirs. It sees pure functions and nothing
  else — no layout, no paint, no React.
- **Real Chromium at 1440×900 through Playwright 1.62.1** — the version
  `pnpm e2e` pins, so the browser binary is the one the suite uses — against the
  **built artefact** (`vite build`, served by `vite preview`), with **every
  backend response fulfilled from a recorded body**, so a figure is the
  renderer's and not the network's or the store's. `PerformanceObserver` on
  `longtask` reports **only** tasks over 50 ms and is therefore
  `PRODUCT_SPEC.md` §28's criterion directly rather than a proxy for it.

### 47.1 The instrument was checked before anything was measured with it

§40's warning is not a nuisance for this part, it invalidates it: **a browser tab
driven over CDP reports `document.visibilityState === "hidden"`, which pauses
`requestAnimationFrame` and `ResizeObserver` delivery with it**, and every figure
here is either a frame time, a resize tick or a paint. A resize storm in a
non-painting tab is no storm at all, and the numbers would be small, plausible
and meaningless.

So the first measurement taken was of the harness, on the real page:

| Checked                                                    | Read           |
| ---------------------------------------------------------- | -------------- |
| `document.visibilityState`                                 | **`visible`**  |
| `requestAnimationFrame` callbacks in 500 ms                | **31** (60 Hz) |
| `ResizeObserver` fires on a laid-out **833 × 280** `<svg>` | **1**          |

For contrast, the same three taken through a devtools-driven tab on 2026-09-13
read `hidden`, **0** and **0** on a laid-out 939 × 221 element. Playwright's page
paints; that one does not. **Every browser figure in Part eight was taken in a
visible, painting page**, and the resize figures corroborate it from the other
end — frame builders appear in those profiles, which they cannot do if no
observer fired.

### 47.2 A second instrument, because `longtask` cannot see below its own floor

`longtask` reports nothing at 49 ms and everything at 51 ms, which makes it
exactly §28's criterion and a poor way to tell _comfortably inside budget_ from
_one millisecond inside it_. So every cold-load run also records the **largest
gap between consecutive `requestAnimationFrame` callbacks**, which is continuous
and bounds the largest task from below.

Read it this way: **~16.7 ms is one frame and 33.3 ms is two** — a page that
reports 33 ms is at the floor and doing nothing, not at a third of the budget.

### 47.3 The bodies, and the two that are not checked in

Fourteen recorded bodies in `apps/frontend/src/fixtures/bar-series/` plus five
recorded for this task against the local store, of which **two are the ones that
matter and neither is checked in**: `month-full` (**8,190 bars** — the `1M`
window on a caught-up store) and `cap-full` (**9,750 bars** — the `1m` cap).
Both were recorded through the absolute window form over dates the developer's
store covers completely, because the named form on a store four sessions behind
answers `1M` with 6,630 bars and `partial`. That figure is in §51's table too,
because it is what a developer actually sees.

---

## 48. The answer, in one line each

- **Criterion 5 holds for everything this story built.** No main-thread task over
  50 ms is attributable to either plot or to the window control — cold at the
  9,750-bar cap, under 120 continuous pointer moves, under a 40-tick resize
  storm, on a single window change, or on a rapid sequence of three.
- **The page still breaches §28, it is still the 518-row table, and this story
  did not make it worse.** Re-taken with the volume plot and the control on the
  same page: the task is present on `/securities` where no chart exists and
  **gone with a 20-row universe while a 9,750-bar chart is still drawn**. §49
  reports it separately and does not fold it into any figure here.
- **The silhouette's ceiling is real and is measured in the DOM.** The volume
  mark's `d` attribute is **12,215 characters at 1,950 bars, 12,239 at 8,190 and
  12,223 at 9,750** — 833 stems on an 833 px plot at every one of them. The price
  line has no such ceiling: **23,803 → 100,427 → 118,086 characters** over the
  same three.
- **And the parse cost of both is nothing.** 118,086 characters parse in
  **0.330 ms**; the silhouette in **0.040 ms**. The fourth candidate (§10.4) is
  discharged with a figure rather than left open.
- **The two fan-outs are told apart in a profile, and one of them is empty.** A
  resize tick rebuilds both frames and costs **0.35 / 0.65 / 1.04 ms** at 5D, 1M
  and 1Y. A pointer move touches **no chart function at all** — across 120 moves
  at every window, not one frame builder, `timeAxis` or `resolveRead` drew a
  single sample.
- **A rapid sequence is a held frame plus _n_ superseded fetches, exactly as
  2.13.7's amendment predicted**: three presses inside one answer's flight spend
  **0.3 ms** in frame builders in total. And the keyboard path spends **one
  request where the pointer path spends three**, which is §32's manual activation
  showing up as a measured number.
- **The cold calendar walk is ~10 ms in Chromium and it does not land in the
  table's task.** `timeAxis` totals **9.7–10.9 ms** on a cold 1Y load, of which
  **8.0–9.1 ms is `marketSessionOn` and 7.3–8.3 ms is `instantFromMarketTime`** —
  the timezone conversion, which is 2.13.3's named and untaken repair.
- **`marketDateAt` at `1d` costs 1.8 ms per plot at 1Y and the branch is safe
  only because it is bounded by sessions.** The same call per bar at `1m` would
  be **59.3 ms at 8,190 bars** — over budget on its own. The sixth candidate is
  under budget and the reason is worth writing down.
- **The eighth candidate is 1.865 ms per render of the pair at 1Y**, and it is
  **not** collapsed here. §55.2 argues why.
- **Story 2.13 costs 5,733 B gzipped**, 3.7% of the artefact: the volume plot
  2,581, the window control 604, and 2,548 for the shared axis, the reading
  context, the two frame builders' growth and the calendar memo.
- **The break was performed and it did _not_ produce a long task** — which is the
  most useful thing in this part. One `<line>` per bar puts **9,810 elements** in
  the two plots and costs **10.7× the JS on the resize path**, with
  `PerformanceObserver` reporting **nothing** in either build. §56.

---

## 49. The universe table, re-taken — and reported separately, not absorbed

`CHARTING.md` §16.1 found one task of **50–66 ms on every cold load** of both
`/securities` and `/securities/:symbol`, attributed it to the 518-row tracked
universe rather than to the chart, and
[`SEARCH-AND-SELECTION.md`](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
§10 raised it with three repair options and a trigger. This story adds **a second
plot and a control to the same page**, so the task's own brief asks for that
figure to be re-taken and stated on its own rather than rolled into a new number.

**Ten cold loads of each, 1440×900, `longtask` plus the frame-gap floor:**

| What was loaded                                        | Tasks over 50 ms, ten loads       | Worst frame gap p50 / max | Document nodes |
| ------------------------------------------------------ | --------------------------------- | ------------------------: | -------------: |
| `/` — neither table nor chart                          | **none**                          |            20.8 / 50.0 ms |            173 |
| `/securities` — the table, **no chart at all**         | 5 — 53, 75, 52, 52, 66 ms         |           83.3 / 100.0 ms |         10,387 |
| `/securities/NVDA` — 5D, 1,950 bars, **both plots**    | 5 — 60, 66, 66, 52, 70 ms         |           83.6 / 115.8 ms |         10,385 |
| `/securities/NVDA?sessions=21` — 1M, 8,190 bars        | 6 — 107, 58, 52, 50, 63, 50 ms    |           67.7 / 149.2 ms |         10,416 |
| `/securities/NVDA?sessions=25` — the cap, 9,750 bars   | 4 — 53, 51, 72, 78 ms             |           67.7 / 100.1 ms |         10,425 |
| `/securities/NVDA?sessions=252` — 1Y, 248 bars of `1d` | 7 — 53, 53, 50, 52, 50, 51, 50 ms |           83.3 / 100.0 ms |         10,389 |
| **`/securities`, 20-row universe**                     | **none**                          |        **32.6 / 33.4 ms** |            851 |
| **the cap-sized chart, 20-row universe**               | **none**                          |        **32.3 / 34.4 ms** |            889 |
| **1M, 20-row universe**                                | **none**                          |        **33.3 / 34.4 ms** |            880 |
| **1Y, 20-row universe**                                | **none**                          |        **33.3 / 33.4 ms** |            853 |

**Three things this says, and only the first is about the table.**

**One: the attribution is unchanged and the second plot did not move it.** The
task is there with no chart at all and gone with a 20-row universe while the
cap-sized chart is still drawn — which is the same pair of ends §16.1 used, taken
again with a second plot on the page. It does not track the bar count: 1,950,
8,190 and 9,750 produce the same figure, and so does zero.

**Two: the frame-gap column is what §16.1 could not say.** The four 20-row rows
sit at **32–34 ms**, which is two frames and is the instrument's floor rather
than a cost. So those pages are not _just under_ 50 ms; they are doing nothing
measurable, with both plots and up to 9,750 bars drawn. Every 518-row row is at
**67–84 ms** on the same instrument.

**Three: the 107 ms and 149 ms outliers are the table too.** They appear on the
1M row and vanish on the 1M-with-20-rows row, and the 20-row build draws the
larger chart. A ten-load sample on a laptop with a browser, a database and three
preview servers running has a long tail; the median is the figure and the tail is
recorded rather than smoothed away.

**Nothing changes about the disposition.** It is raised, not repaired, for the
reason `CLAUDE.md` gives and 2.12.9 followed: a measurement task that quietly
rebuilds another story's component is a task whose scope has stopped meaning
anything. `SEARCH-AND-SELECTION.md` §10 keeps the repair options and the trigger;
Story 2.14's close still owes the answer. This section is the second dated
measurement of the same defect, which is the point of taking it again.

---

## 50. Volume's own cost, attributed from both ends

2.12.9's method is what made its conclusion trustworthy — the long task was found
**with no chart at all** and gone **with a trimmed universe while a cap-sized
chart was still drawn** — and this task's brief asks for the same shape for
volume: the page with the volume plot removed, and the volume plot at the cap
with the universe trimmed.

**The "volume removed" build is not a hand-edit.** It is
[the Story 2.12 close commit](../story-12-price-chart/CHARTING.md) — `6adef2f`,
the product with one plot on the page — rebuilt from source in a worktree and
served beside the shipped build. That build reproduced §16.6's bundle figures to
the byte (441,731 / 140,370 JS and 45,242 / 8,982 CSS, 353 modules), which is
what tells a figure that moved from a figure that was mis-recorded and is why the
two columns below are comparable at all.

**Both served by `vite preview`, 20-row universe so the figure is the chart's,
cold p50 of seven loads.** `cold` is navigation-commit to two
`requestAnimationFrame`s after a series `<path>` is in the DOM — a **different
definition from §16.2's**, which counted from navigation start, so read the
difference between rows rather than the absolute:

| Build                        | Body                 | Cold p50 | Plot elements | `path` / `line` / `rect` / `use` |
| ---------------------------- | -------------------- | -------: | ------------: | -------------------------------- |
| **Story 2.12 close** (price) | 5D, 1,950 bars       |  63.1 ms |            45 | 31 / 10 / 2 / 2                  |
| **Story 2.12 close** (price) | 1M, 8,190 bars       |  62.3 ms |            59 | 31 / 24 / 2 / 2                  |
| **Story 2.12 close** (price) | cap, 9,750 bars      |  63.5 ms |            64 | 31 / 29 / 2 / 2                  |
| **As shipped** (the pair)    | 5D, 1,950 bars       |  68.7 ms |            51 | 32 / 14 / 3 / 2                  |
| **As shipped** (the pair)    | 1M, 8,190 bars       |  66.7 ms |            81 | 32 / 44 / 3 / 2                  |
| **As shipped** (the pair)    | cap, 9,750 bars      |  63.1 ms |            90 | 32 / 53 / 3 / 2                  |
| **As shipped** (the pair)    | 3M, 59 bars of `1d`  |  64.5 ms |            49 | 32 / 8 / 7 / 2                   |
| **As shipped** (the pair)    | 1Y, 248 bars of `1d` |  65.3 ms |            49 | 32 / 8 / 7 / 2                   |

**The whole second plot costs one `<path>`, one `<rect>` and one `<line>` per
session.** The counts above are page-wide and include the chrome's icons, so read
the deltas: **+1 path** (the silhouette, at every density), **+1 rect** (its
clip), and **+4 / +20 / +24 lines** at 5, 21 and 25 sessions — which is
`sessions − 1`, because the volume plot draws its own session seams. Nothing in
it scales with the bar count, and the `1d` rows prove the same thing from the
other direction: 59 bars and 248 bars produce **identical** counts.

**And the cold-load delta is 0 to 6 ms.** A second plot on the same axis costs
about five milliseconds of a load that is already spending sixty booting the
application, and at the cap the two builds are inside each other's noise. That is
what a shared axis buys arithmetically — `ChartAxis` calls `timeAxis` once and
hands the frame through, so the second plot pays for its own scale and its own
path and for no part of the axis.

### 50.1 The frame builders, timed as pure functions

The frontend runner, 200 iterations after 50 warm-up calls, at a 928.66 px plot —
the width `/securities/NVDA` measures at 1440. This is the arithmetic with no
React and no paint in it:

| Window                | `timeFrame` | `priceFrame` | `volumeFrame` | **The pair, per render** |
| --------------------- | ----------: | -----------: | ------------: | -----------------------: |
| 5D — 1,950 bars       |    0.107 ms |     0.532 ms |      0.496 ms |             **1.135 ms** |
| 1M — 8,190 bars       |    0.049 ms |     2.196 ms |      1.330 ms |             **3.575 ms** |
| the cap — 9,750 bars  |    0.052 ms |     2.636 ms |      1.557 ms |             **4.245 ms** |
| 3M — 59 bars of `1d`  |    0.128 ms |     0.437 ms |      0.439 ms |             **1.004 ms** |
| 1Y — 248 bars of `1d` |    0.399 ms |     1.965 ms |      2.029 ms |             **4.392 ms** |

Two things worth reading off it. **`volumeFrame` is cheaper than `priceFrame` at
every `1m` window and dearer at every `1d` one** — because below a pixel per bar
the silhouette walks the bars once and emits one stem per pixel column, while
above it each bar gets its own stem and `1d` is where that happens. And **the
widest window is not the most expensive**: 1Y at 248 bars costs about what the
cap costs at 9,750, because at `1d` the cost is the calendar and the per-session
placement rather than the points. §55 is about that.

---

## 51. The path-string candidate — the ceiling measured, and the line that has none

§10.4 raised this as a fourth candidate none of the other three would catch:
`CHARTING.md` §1's constraint is a **count of elements**, and this is a **single
element whose attribute is six figures long**. 2.13.3's amendment predicted the
silhouette at **10.6 kB** by construction and left the price line — the one
without a ceiling — to this task.

**Measured off the built geometry**, frontend runner, 928.66 px plot:

| Body                          |  Bars | Price line `d` | Volume `d` | Stems |
| ----------------------------- | ----: | -------------: | ---------: | ----: |
| 5D — `dense`, the default     | 1,950 |     23,808 ch. | 13,639 ch. |   929 |
| 5D — `holiday-week`, complete | 1,770 |     21,531 ch. | 13,423 ch. |   929 |
| **1M — complete**             | 8,190 |    **100,520** | **13,659** |   929 |
| 1M — a developer's store      | 6,630 |         80,856 |     11,020 |   752 |
| **the cap**                   | 9,750 |    **118,205** | **13,647** |   929 |
| 3M — `1d`                     |    59 |            726 |        843 |    59 |
| 1Y — `1d`                     |   248 |          3,040 |      3,576 |   248 |

**The ceiling is exactly what it was claimed to be.** 929 stems at a 929 px plot,
at 1,770 bars, at 8,190 and at 9,750 — the silhouette's cost is bounded by the
plot's width and is **flat in the bar count across a 5.5× range**. The measured
13.6 kB is between 2.13.2's 16.8 kB prediction and 2.13.3's 10.6 kB one; both
were arithmetic on a 726 px plot and this is a measurement on a 929 px one, which
is the whole of the difference. The 6,630-bar row is the same property seen
sideways: a `partial` answer covers 752 pixel columns and emits 752 stems.

**The price line's figure is 4.2× the default at 1M and has no ceiling**, which
is what §10.4 said and is now a number: 100,520 characters at the window this
story made reachable, and 118,205 at the cap — corroborating §16.2's 118,086 for
9,750 bars on a different body to within 0.1%.

### 51.1 And the browser's half: the cost of a `d` that size is nothing

The amendment asks for parse or paint attributed, not only a byte count. Measured
**on the marks the real page drew**, in Chromium, at an 833 px plot:
`setAttribute("d", …)` followed by `getTotalLength()`, which forces the geometry
to be parsed and built rather than merely stored — median of 60 after three
warm-ups.

| Body                | Price line `d` |     Parse | Volume `d`, stems |    Parse |
| ------------------- | -------------: | --------: | ----------------: | -------: |
| 5D — 1,950 bars     |     23,803 ch. |  0.082 ms |   12,215 ch., 833 | 0.055 ms |
| **1M — 8,190**      |    **100,427** | **0.232** |   12,239 ch., 833 |    0.038 |
| **the cap — 9,750** |    **118,086** | **0.330** |   12,223 ch., 833 |    0.040 |
| 3M — 59 of `1d`     |            846 |     0.030 |                 — |        — |
| 1Y — 248 of `1d`    |          3,573 |     0.018 |                 — |        — |

**It is under budget by two orders of magnitude and the figure is stated rather
than the absence of a problem.** A hundred kilobytes of path data costs a quarter
of a millisecond to parse; the browser is very good at this and the candidate is
discharged. What the number is _for_ is the next window control: the line grows
linearly and the knee is not inside the offered set, so an author adding a wider
`1m` window can multiply 0.232 ms rather than guess.

**One thing this does not measure and should not be read as measuring:** paint.
`getTotalLength()` is parse and geometry; what the compositor does with a
100 kB path is not separable from the rest of the frame with this instrument.
What stands in for it is §49's frame-gap column — the 20-row rows sit at the
two-frame floor at every one of these densities — and §52's pointer figures,
which hold 60 FPS with both paths on screen.

---

## 52. The two fan-outs, told apart — and one of them is empty

2.13.5's amendment is precise that these are two different fan-outs with two
different causes and asks for them measured separately, with the profile saying
which one touched a frame builder. Both were profiled on an **unminified build of
the same source**, so a function in a profile has the name it has in the source.

### 52.1 The pointer path: no chart function drew a sample

120 continuous pointer moves across the price plot, with the crosshair and both
readouts confirmed live in the same run (three grouped-integer readouts on
screen, so the volume strip was showing a bar's exact volume rather than the
window's peak):

| Window                | Frame interval p50 / p95 | Move → paint p50 / p95 | >50 ms tasks | JS self time, 120 moves |
| --------------------- | ------------------------ | ---------------------- | ------------ | ----------------------- |
| 5D — 1,950 bars       | 16.7 / 17.7 ms           | 16.8 / 17.8 ms         | **none**     | 7.6 ms                  |
| 1M — 8,190 bars       | 16.7 / 17.7 ms           | 16.8 / 17.8 ms         | **none**     | 5.4 ms                  |
| the cap — 9,750 bars  | 16.7 / 17.7 ms           | 16.7 / 17.9 ms         | **none**     | 5.4 ms                  |
| 1Y — 248 bars of `1d` | 16.7 / 17.6 ms           | 16.7 / 17.8 ms         | **none**     | 6.8 ms                  |

**16.7 ms is one frame at 60 Hz.** The crosshair holds 60 FPS with two plots and
two overlays at the cap, and a move is answered in the next frame — §16.3's
figures for one plot, unchanged by the second.

**And the profile is the stronger statement.** At every window, across 120 moves,
**not one of `timeFrame`, `priceFrame`, `volumeFrame`, `timeAxis`,
`marketSessionOn`, `placeBars`, `resolveRead`, `silhouette` or `linePath` drew a
single sample** at a 100 µs sampling interval. The whole JS self time is 5–8 ms
for 120 moves — about **0.05 ms a move** — which is two overlays re-rendering and
nothing else.

That answers 2.13.7's seventh candidate directly: **`resolveRead`'s fast path is
an index hit and an integer comparison, confirmed by its absence from the
profile** rather than by reading the code. If `readings` were being rebuilt per
move it would be the largest thing in this table.

### 52.2 The resize path: both frames rebuild, and it is about a millisecond a tick

40 viewport resizes with both plots on screen, named build, 20-row universe:

| Window                | JS self, 40 ticks | **Per tick** | >50 ms tasks | The named frames in it                                                                                |
| --------------------- | ----------------: | -----------: | ------------ | ----------------------------------------------------------------------------------------------------- |
| 5D — 1,950 bars       |           14.0 ms |  **0.35 ms** | **none**     | `positionOfInstant` 1.0, `volumeFrame` 1.0, `linePath` 0.2, `scaleSlot` 0.2, `placeBars` 0.2          |
| 1M — 8,190 bars       |           26.1 ms |  **0.65 ms** | **none**     | `scaleSlot` 4.5, `silhouette` 1.5, `volumeFrame` 0.9, `priceFrame` 0.8, `linePath` 0.8                |
| 1Y — 248 bars of `1d` |           41.4 ms |  **1.04 ms** | **none**     | `positionOfInstant` 2.9, `marketSessionOn` 0.9, `timeAxis` 0.6, `timeTicks` 0.4, `describeSeries` 0.3 |

**The fifth candidate is answered and it is small.** A resize tick fans out to
both frame owners and, through them, to both reading overlays, and it costs about
a millisecond at the widest window. The whole 40-tick storm at 1Y is 41 ms of JS —
less than one budget's worth spread over forty ticks — and no tick came close to
50 ms.

**The attribution the amendment asked for, between the calendar walk and the
provider's fan-out:** at 1Y the named calendar functions are `marketSessionOn`
0.9 ms and `timeAxis` 0.6 ms of a 41.4 ms total, so **the walk is about 4% of a
resize storm and the other 96% is React re-rendering two plots and two
overlays**. That is the memo working. Before it, 2.13.3 measured a single
`timeAxis` call over a year at **8.4 ms**; forty ticks would have been 336 ms of
calendar alone.

**The two profiles differ in exactly the way the design says they should.** The
resize profile is full of frame builders; the pointer profile contains none. One
value lives in `ChartAxis`'s measurement state and one lives in a second context
whose consumers are the two overlays, and that distinction is visible in a trace
rather than only in a comment.

---

## 53. The window change, and the two rapid sequences

### 53.1 One change

Unminified build, 20-row universe, bodies fulfilled from recorded files, so the
elapsed time excludes network and server entirely and is a **render** figure:

| Change                                      | Press → new line on screen | >50 ms tasks | JS self time over the change |
| ------------------------------------------- | -------------------------: | ------------ | ---------------------------: |
| **Same timeframe** — 5D → 1M, 1,950 → 8,190 |                 **127 ms** | **none**     |                      37.4 ms |
| **Cross timeframe** — 1M → 1Y, `1m` → `1d`  |                 **130 ms** | **none**     |                      45.1 ms |
| **Cross timeframe** — 5D → 3M, `1m` → `1d`  |                      72 ms | **none**     |                      25.6 ms |
| Widest cold — 5D → 1Y                       |                      85 ms | **none**     |                      35.9 ms |

2.13.6's amendment asked for the same-timeframe change to be separated from the
`1m` → `1d` one, on the grounds that the second replaces the silhouette with
per-session columns and the intraday ticks with dates. **It was, and the
separation turns out not to be where the cost is.** 5D → 1M and 1M → 1Y are
127 and 130 ms; 5D → 3M is 72. What predicts the figure is **how many bars the
change is leaving**, not whether the timeframe changed: the two expensive rows
are the two that unmount an eight-thousand-bar frame, and the cheap one starts
from 1,950. So the honest statement is that a cross-timeframe change is not a
distinguishable cost at this story's windows, and the pair of figures is recorded
so a later reader does not have to take that on trust.

Every one of them is comfortably inside a `PRODUCT_SPEC.md` §28 budget and none
produced a task over 50 ms. §4's 500 ms feedback rule is satisfied by the frame
rather than by the answer, and the frame is never taken away at all since 2.13.7.

### 53.2 Three windows inside one answer's flight

Each answer stalled 900 ms deliberately, which is `e2e/specs/security-window-change.spec.ts`'s
own harness rather than a race:

| Driven by                  | Requests issued | Previous window drawn throughout | First press → settled | >50 ms tasks | JS self | of which **frame builders** | Address ended at |
| -------------------------- | --------------: | -------------------------------- | --------------------: | ------------ | ------: | --------------------------: | ---------------- |
| **Pointer** — 1M, 3M, 1Y   |           **3** | **yes**                          |              1,097 ms | **none**     | 51.2 ms |                  **0.3 ms** | `?sessions=252`  |
| **Keyboard** — → → `Space` |           **1** | **yes**                          |                947 ms | **none**     | 35.5 ms |                  **0.5 ms** | `?sessions=252`  |

**This is 2.13.7's shape confirmed as a number, and it is the opposite of what
the task brief was written expecting.** The bullet asked for the CPU of _n_ frame
builds; what a rapid sequence actually costs is **a held frame plus _n_
superseded fetches** — the frame builders total **0.3 ms across the whole
sequence**, because the picture on screen never changed until the last answer
landed. Everything else in the 51 ms is the rail's four sentences and React.

**And the keyboard path spends one request where the pointer path spends three.**
That is §32's manual activation — arrows move focus, `Space` commits — arriving
as a measured request count rather than as an argument. It was chosen so that one
intention would not spend four addresses and four requests; it spends one, and
the pointer-driven sequence spends three because three deliberate presses are
three intentions. Both settle on the last and both leave `?sessions=252` in the
address.

---

## 54. The cold walk in a browser, and where the ten milliseconds land

2.13.3's amendment left three things a vitest runner cannot see, and the first is
**the cold walk, in a browser, at first paint**. It measured 9.5 ms in Node for
one cold `timeAxis` call over a year of `1d`, and asked whether that lands inside
the 518-row table's task.

**Total time (self **and** children) attributed through a CPU profile of one cold
load, 50 µs sampling:**

| Cold load            |                `timeAxis` | `marketSessionOn` | `instantFromMarketTime` | `timeFrame` | `priceFrame` | `volumeFrame` |
| -------------------- | ------------------------: | ----------------: | ----------------------: | ----------: | -----------: | ------------: |
| 1Y, **518-row** page |               **10.9 ms** |            9.1 ms |                  8.3 ms |     10.0 ms |       2.4 ms |        2.0 ms |
| 1Y, 20-row page      |                    9.7 ms |            8.0 ms |                  7.3 ms |      8.7 ms |       2.5 ms |        2.0 ms |
| 3M, 20-row page      |                    3.1 ms |            2.6 ms |                  2.0 ms |      2.9 ms |       0.7 ms |        0.7 ms |
| 1M, 20-row page      |                    1.3 ms |            1.1 ms |                  0.8 ms |      1.4 ms |       3.5 ms |        3.3 ms |
| 5D, 20-row page      |                    0.8 ms |            0.5 ms |                  0.3 ms |      1.6 ms |       1.6 ms |        1.8 ms |
| 1Y again, three runs | 10.2 / 10.8 / **22.3 ms** |                   |                         |             |              |               |

**Chromium agrees with Node to within 15%**, which is the corroboration this
section exists for: 2.13.3's 9.5 ms cold and this 9.7–10.9 ms are the same
measurement in two runtimes. The 22.3 ms third run is the same outlier 2.13.3
recorded at 21.5 ms and for the same reason — the first call anywhere also builds
the `Intl` formatters and the calendar index.

**And the attribution is the useful half.** Of `timeAxis`'s 9.7 ms at 1Y,
**8.0 ms is `marketSessionOn` and 7.3 ms of _that_ is `instantFromMarketTime`**.
So the cold cost is almost entirely the timezone conversion — which is exactly
what `MARKET-DATA-API.md` §12.4's attribution said and why the memo was placed on
the market date rather than on the window. 2.13.3 named the remaining repair
(`instantFromMarketTime` probes the zone twice per call) and declined it with a
trigger; **this measurement neither takes it nor moves it**, and the trigger is
unchanged: _the first window whose first paint is measurably late because of it_.

**Does it land in the table's task? No.** Five instrumented cold loads at 1Y and
1M on the real 518-row page: the frame in which the series path first entered the
DOM was **not inside a task over 50 ms** in any of them. It cannot be — the bars
arrive on a fetch, so the chart's first frame is necessarily a later task than
the initial render the table is in — and §49's 20-row rows say the same thing
from the other side: with the chart's whole cold cost and no table, the worst
frame gap is 33 ms.

**The second of 2.13.3's three is answered by §52.2** (a resize tick's calendar
cost at 1Y is 0.9 + 0.6 ms of a 41 ms storm) **and the third by §53.2** (a rapid
sequence spends 0.3 ms in frame builders, so the warm/cold question does not
arise there at all).

---

## 55. Two candidates priced, and neither is repaired here

### 55.1 The sixth: `marketDateAt`, once per bar, at `1d`

On a daily axis a slot **is** a session, so `positionOfInstant` resolves an
instant by its market date and `placeBars` calls it once per bar. Both plots
place their own bars, so a 1Y frame build is 2 × 248 calls. Frontend runner, 200
iterations after 50 warm-ups:

| Window                | `placeBars` | `positionOfInstant` × bars | `marketDateAt` × bars |
| --------------------- | ----------: | -------------------------: | --------------------: |
| 1Y — 248 bars of `1d` |    2.072 ms |                   2.582 ms |          **1.812 ms** |
| 3M — 59 bars of `1d`  |    0.436 ms |                   0.442 ms |              0.424 ms |
| 5D — 1,950 bars, `1m` |    0.036 ms |                   0.049 ms |         **15.942 ms** |
| 1M — 8,190 bars, `1m` |    0.211 ms |                   0.263 ms |         **59.331 ms** |

**Under budget, at 1.8 ms per plot and 3.6 ms per pair at the widest window** —
and it is bounded by the **session** count, which is the opposite shape from
every other candidate in this part: 248 at the widest window and 5 at the
default. In the browser it is invisible: `marketDateAt` drew 0.1 ms of a 41 ms
resize storm at 1Y (§52.2) and 0.27 ms of a cold 1M load.

**The last two rows are the reason to write this down rather than to note it is
fine.** They are the counterfactual: `marketDateAt` called once per bar on a
`1m` window would cost **15.9 ms at the default and 59.3 ms at 1M** — over §28's
whole budget, on its own, before anything is drawn. The `1m` branch does not
reach it, and that is not a happy accident: a slot is a minute there, so the
instant answers by arithmetic. **The rule the next per-bar placement should
inherit is that a per-bar call into the timezone layer is only safe where the
answer is per session**, and this table is what makes that a measurement rather
than an intuition.

### 55.2 The eighth: the text alternative's second walk, and why it stays

2.13.8's amendment counted the calls — **two per render of the pair before
`frameClause`, four after** — and estimated +0.85 ms at 1Y against 2.13.3's warm
figure. Measured, frontend runner, same method:

| Window                | `chartAlternative` | `volumeAlternative` | **The pair, per render** | Words spoken |
| --------------------- | -----------------: | ------------------: | -----------------------: | -----------: |
| 5D — 1,950 bars, `1m` |           0.081 ms |            0.081 ms |             **0.162 ms** |        68/68 |
| 1M — 8,190 bars, `1m` |           0.170 ms |            0.143 ms |             **0.313 ms** |        68/68 |
| 3M — 59 bars, `1d`    |           0.265 ms |            0.267 ms |             **0.531 ms** |        84/80 |
| 1Y — 248 bars, `1d`   |           1.036 ms |            0.829 ms |             **1.865 ms** |        84/80 |

**The estimate was right: about 0.9 ms of the 1.865 is the second call.** At the
default window the whole pair of sentences is 0.16 ms, which is nothing, and even
at 1Y it is 3.7% of the budget on a path that also spends 41 ms of React over
forty resize ticks.

**It is deliberately not collapsed, and the amendment permitted either.** Three
reasons, in the order they decided it:

1. **This task's own fence.** Its Notes say repairing what a measurement merely
   reveals is how a measurement task stops producing comparable figures, and a
   figure taken after an unmeasured optimisation cannot be read against the one
   before it. The collapse is six lines and it will still be six lines tomorrow.
2. **2.12.9 answered the identical question the identical way** and its argument
   holds unchanged: removing the second call buys tenths of a millisecond and
   spends `CHARTING.md` §15.3's separation, which is the coupling the second call
   exists to avoid.
3. **The number is 27× under the budget it would be measured against.**

**Trigger — a condition, not a story number: the first window at `1d` wider than
a year, or the first third sentence on this axis.** Either doubles the count
again, and at that point `frameClause` and `axisSpan` should be handed one axis
per sentence rather than each building their own. The repair is named here so
that whoever fires it does not have to rediscover it: both call sites are in
`chart-alternative.ts`, six lines apart.

---

## 56. The break performed — and the most useful finding here is that §28 could not see it

`CHARTING.md` §1 chose hand-built SVG on one constraint above all: **SVG does not
scale to one element per bar.** 2.12.9 performed that break on the price chart
and measured **9,790 plot elements and five tasks of 137–254 ms**. This task owes
the same for the volume plot, whose marks are the first on this axis that are
**per bar** by nature.

**The break, faithfully:** one `<line className={styles.columns}>` per bar,
running from the baseline to the bar's own volume with the real stroke width —
which is what the plot would draw if `silhouette()` did not exist, not a token
mark that proves nothing.

**The unit guard goes red immediately.** `VolumeChart.test.tsx`'s _draws no
element per bar, at sixty-five times the bars_ fails at
**`expected 1951 to be 31`**, the figure 2.13.4 recorded, and two other tests in
the file fail with it. That is the guard confirmed live in this task rather than
cited from the one that wrote it.

**In a browser, 20-row universe, five cold loads each:**

| Build            | Body            | Plot elements | >50 ms tasks | Worst frame gap p50 |
| ---------------- | --------------- | ------------: | ------------ | ------------------: |
| As shipped       | 5D, 1,950 bars  |        **22** | 1 — 60 ms    |             21.9 ms |
| As shipped       | 1M, 8,190 bars  |        **52** | none         |             21.4 ms |
| As shipped       | cap, 9,750 bars |        **61** | none         |             19.4 ms |
| One line per bar | 5D, 1,950 bars  |     **1,971** | none         |             21.5 ms |
| One line per bar | 1M, 8,190 bars  |     **8,241** | none         |             33.3 ms |
| One line per bar | cap, 9,750 bars |     **9,810** | none         |             33.3 ms |

**Nine thousand eight hundred and ten elements in the two plots, and
`PerformanceObserver` reports nothing.** Neither does a 30-tick resize storm or a
120-move pointer sweep in the broken build. **§28's own criterion cannot see this
regression at all** — which is the same shape as §16.4's finding that undoing the
reading's structural repair costs 17× on the pointer path and produces no long
task, and it is worth stating plainly twice.

**So it was priced instead**, CPU profiles of both builds over the same
interactions:

| Build            | Body      | 30 resizes: JS self | engine |   GC | 120 pointer moves: JS self |
| ---------------- | --------- | ------------------: | -----: | ---: | -------------------------: |
| As shipped       | 5D 1,950  |             11.4 ms |   69.8 |  6.4 |                     2.8 ms |
| As shipped       | 1M 8,190  |             29.7 ms |  100.6 | 11.1 |                     3.0 ms |
| As shipped       | cap 9,750 |             31.3 ms |  103.8 |  4.1 |                     3.3 ms |
| One line per bar | 5D 1,950  |             31.4 ms |   94.8 |  6.3 |                     4.5 ms |
| One line per bar | 1M 8,190  |        **323.5 ms** |  239.3 | 28.0 |                     4.8 ms |
| One line per bar | cap 9,750 |        **333.5 ms** |  235.3 | 24.7 |                     3.5 ms |

**10.7× the JavaScript and 2.3× the engine's own time on the resize path at the
cap**, plus six times the garbage collection — and eleven milliseconds a tick
against one. Why no long task: forty resize ticks are forty separate tasks, and
11 ms of JS plus its share of the engine's 235 ms is about 19 ms a tick. A third
of the budget, every tick, invisible to the instrument the budget is written
against.

**The pointer column is the control that makes the rest of it readable.** It
barely moves — 3.3 → 3.5 ms at the cap — because the read position lives in a
second context and neither frame owner consumes it, so nine thousand extra
elements are not re-created on a pointer move. The break lands on the resize path
and nowhere else, which is exactly where the design says it should.

**Neither guard is a wall-clock assertion, and none was added.** What holds this
in `pnpm test` is a **shape**: identical element counts at 30 bars and at 1,950
with the path strings proved to differ. `CLAUDE.md`'s gap list gains the residue —
that the shape guard's justification is a cost curve `longtask` cannot see.

---

## 57. What Story 2.13 costs to download

Three builds of the real application on 2026-09-13, `vite build`, sizes in bytes,
gzip at **level 9** — which is what `CHARTING.md` §16.6's figures were, and the
baseline row is that commit **rebuilt from source in a worktree** rather than
quoted. It reproduced to the byte, which is what tells a figure that moved from a
figure that was mis-recorded:

| Build                                       | Modules |      JS | **JS gzip** |    CSS | CSS gzip |
| ------------------------------------------- | ------: | ------: | ----------: | -----: | -------: |
| **Story 2.12's close** (`6adef2f`), rebuilt |     353 | 441,731 | **140,370** | 45,242 |    8,982 |
| The window control removed as well          |     363 | 449,146 |     142,821 | 45,910 |    9,079 |
| The volume plot removed                     |     365 | 450,682 |     143,273 | 47,014 |    9,231 |
| **As shipped**                              | **369** | 459,052 | **145,747** | 48,020 |    9,338 |

**Story 2.13 costs 5,733 B gzipped — 5,377 of JavaScript and 356 of CSS, which is
3.7% of the 155,085 B artefact**, for sixteen modules. Attributed:

| Part                            | Modules | JS gzip | CSS gzip | **Total gzip** |
| ------------------------------- | ------: | ------: | -------: | -------------: |
| The volume plot and its readout |       4 |   2,474 |      107 |      **2,581** |
| The window control              |       2 |     452 |      152 |        **604** |
| Everything else                 |      10 |   2,451 |       97 |      **2,548** |

That last row is the shared axis, the read-position context, the two frame
builders' growth, the alternative's volume sentence and `frameClause`, the `1d`
placement repair, the volume formatter and the calendar memo in
`packages/shared` — the parts with no name on the screen.

**Per module, raw minified bytes through the build's own sourcemap**, which is
§16.6's method. The _before_ column comes from the rebuilt 2.12 artefact and
reproduces §16.6's table exactly at all nine of its shared rows:

| Module                                  | Before | After | Delta      |
| --------------------------------------- | -----: | ----: | ---------- |
| `VolumeReading.tsx`                     |      — | 2,758 | **new**    |
| `VolumeChart.tsx`                       |      — | 2,098 | **new**    |
| `TimeWindowControl.tsx`                 |      — | 1,692 | **new**    |
| `chart-reading-context.ts`              |      — | 1,458 | **new**    |
| `volume-format.ts`                      |      — |   889 | **new**    |
| `time-window.ts`                        |      — |   624 | **new**    |
| `use-plot-box.ts`                       |      — |   615 | **new**    |
| `ChartAxis.tsx`                         |      — |   578 | **new**    |
| `chart-subject.ts`                      |      — |   382 | **new**    |
| `use-time-window.ts`                    |      — |   267 | **new**    |
| `chart-volume-axis.ts`                  |      — |   252 | **new**    |
| `chart-axis-context.ts`                 |      — |   217 | **new**    |
| `chart-alternative.ts`                  |  2,602 | 3,929 | **+1,327** |
| `chart-geometry.ts`                     |  2,329 | 3,048 | +719       |
| `ChartReading.tsx`                      |  3,822 | 4,226 | +404       |
| `market-session.js` (`packages/shared`) |  1,033 | 1,381 | +348       |
| `chart-time-axis.ts`                    |  3,251 | 3,557 | +306       |
| `chart-reading.ts`                      |    654 |   700 | +46        |
| **`PriceChart.tsx`**                    |  3,741 | 2,850 | **−891**   |

**The last row is the shared axis paying for itself in bytes as well as in
correctness.** `PriceChart.tsx` got a fifth smaller because the axis left it for
`ChartAxis.tsx` (578) and `chart-axis-context.ts` (217) — 795 bytes of new module
against 891 removed from the component, so extracting the axis was net **−96 B**
before either consumer used it. That is not why it was done, and it is a pleasant
thing to be able to say.

**And §1's comparison is untouched.** The rejected charting library was
**+94,809 B gzipped on its own**. The whole chart layer including two plots, two
readouts, a window control, a keyboard path, two text alternatives and all the
arithmetic is now **12,285 B gzipped** — 13% of what Recharts would have cost
before drawing anything.

---

## 58. What is raised, what is repaired, and what nothing checks

**Nothing was repaired here, and that is the decision rather than the outcome.**
Nothing this story built exceeded the budget, so there was nothing to fix; the
two things over the line or near it belong to other surfaces and are named with
conditions.

| Finding                                           | Disposition               | Trigger — a condition                                                                |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| The 518-row table's 50–107 ms cold task           | **Raised, second dating** | The first time a second surface renders per-row markup at universe scale (unchanged) |
| `instantFromMarketTime`'s ~8 ms cold walk         | **Raised, unchanged**     | The first window whose first paint is measurably late because of it (2.13.3's)       |
| The alternative's four `timeAxis` calls, 1.865 ms | **Measured, left**        | The first `1d` window wider than a year, or a third sentence on this axis            |
| `marketDateAt` per bar at `1d`, 1.8 ms per plot   | **Measured, left**        | The first per-bar call into the timezone layer on a `1m` axis                        |
| The silhouette's cost ceiling                     | **Held by a shape guard** | —                                                                                    |

**Three things nothing in `pnpm verify` can see**, added to `CLAUDE.md`'s list:

1. **The silhouette's justification is a cost curve `longtask` cannot see.**
   §56's break is 10.7× the JS on the resize path and produces no long task, so
   the only instrument standing there is `VolumeChart.test.tsx`'s element-count
   shape guard. Re-measure: draw one `<line>` per bar and confirm the guard goes
   red at `expected 1951 to be 31` while a browser reports nothing.
2. **The read position must stay off the frame owners**, which §52.1's empty
   pointer profile demonstrates and `PriceChart.test.tsx`'s zero-recomputation
   guard is the only mechanical check of. That entry is already on the list; what
   this task adds is the browser figure it stands for.
3. **A per-bar call into the timezone layer is only safe on a `1d` axis.**
   §55.1's last two rows are the counterfactual and nothing anywhere compares a
   placement rule against the timeframe it will run on.

### 58.1 The guards, confirmed rather than re-derived

2.13.5's amendment reduced one of this task's items to a grep, and it is
confirmed:

- **`PriceChart.test.tsx`'s zero-recomputation guard counts all three builders** —
  `timeFrame`, `priceFrame` and `volumeFrame` are all three in the module mock —
  **and its harness renders the pair**: `<Pair>` puts `<PriceChart>` and
  `<VolumeChart>` inside one `<ChartAxis>`. It verifies its own counter live in
  the same test, which is the half a zero cannot demonstrate on its own.
- **Both element-count guards exist and one was broken here.** The price chart's
  was break-verified by 2.12.9 at `expected 1952 to be 32`; the volume plot's was
  break-verified by 2.13.4 and again by this task at `expected 1951 to be 31`.
- **No timing assertion was added to `pnpm verify`, anywhere.** A wall-clock gate
  in `pnpm test` measures the runner, and a flaky performance gate is how a suite
  stops being believed.

---

## 59. What Part eight hands on

- **2.13.10** inherits a story with no performance work outstanding, and one
  sentence for its close: nothing this story built exceeds §28, and the page it
  sits on still does for a reason Story 2.14 owns.
- **Story 2.14** inherits §49 — the same table, measured a second time with more
  on the page, still over budget, still raised.
- **Epic 5** inherits §55.1's rule before it writes an anomaly marker with a
  per-bar placement, and §49's trigger, which its per-security score is the most
  likely thing to fire.
- **Epic 8** inherits §50's arithmetic: a third plot on this axis costs one path,
  one rect and one line per session, and the axis itself is already paid for.
- **Epic 11** inherits §53.1 — a `setTimeWindow` command costs 72–130 ms of
  render and no long task, so the agent can move the window without the workspace
  stuttering.

---

# Part nine — the close (Task 2.13.10)

Added 2026-09-13. **Everything below was taken against the deployed site**, which
is a different store from every figure in Parts one to eight, and that difference
is the point of the part rather than a caveat on it.

## 60. The instrument, which had to be replaced before anything could be looked at

The first attempt to look at the deployed page used the browser-automation tools
this agent has to hand, and **it produced a page whose two charts were 0 × 0** —
the exact picture a broken chart makes.

It was the instrument. §47.1's warning, re-confirmed against the deployed site at
this close:

| Probe                      | Claude-in-Chrome tab | Playwright page |
| -------------------------- | -------------------- | --------------- |
| `document.visibilityState` | **`hidden`**         | `visible`       |
| `requestAnimationFrame`    | never fires          | fires           |
| Both chart `<svg>` boxes   | **0 × 0**            | real            |

A tab driven over CDP reports `hidden`, which pauses `requestAnimationFrame` and
with it `ResizeObserver` delivery; both plots return `null` before they have a
frame, so they measure zero for ever. `CLAUDE.md` already carries this as a
gap-list entry from 2.13.7 — it is repeated here only because **it fired again,
immediately, on the first thing this task tried to do**, and because the failure
presents as a product defect rather than as a tool limitation. Every figure and
every screenshot below is Playwright's.

## 61. What the deployed store actually answers, and it is not what a developer's does

Both timeframes are **zero sessions behind** through the 2026-09-11 session
(`/diagnostics/freshness`, 2026-09-13). That makes the deployed environment the
one place this story's own coverage treatment is _not_ under observation, and it
changes the picture in a way worth stating as a table rather than a sentence:

| Deployed, `/securities/NVDA…` |          Bars | Asked for vs held                          |
| ----------------------------- | ------------: | ------------------------------------------ |
| default (5D)                  |     **1,950** | identical — Sep 4 09:30 → Sep 11 16:00 ET  |
| `?sessions=21` (1M)           |     **8,190** | identical — Aug 13 09:30 → Sep 11 16:00    |
| `?sessions=1` (1D)            |       **390** | identical — the whole of Sep 11            |
| `?sessions=63` (3M)           |  **63** daily | short by a span the axis gives no width to |
| `?sessions=252` (1Y)          | **252** daily | the same                                   |

**The two `1m` windows are answered in full**, which a developer's store — four
sessions behind — cannot do. **The two `1d` windows are nominally short and the
sentence says why**, in the clause 2.13.8 added: _"the window asked for runs to
2026-09-14 00:00:00 EDT and what is stored reaches only to 2026-09-13 00:04:11
EDT. What is missing falls outside trading hours — a night, a weekend or a
holiday — which this axis gives no width to."_ That is the right answer and it is
the one §43.2 exists for: the picture is complete, the window is not, and the
sentence is the only channel that can say both.

### 61.1 The two plots, measured on the deployed page at three viewports

| Viewport   | Price `x` / `w` | Volume `x` / `w` | Price `h` | Volume `h` |
| ---------- | --------------- | ---------------- | --------: | ---------: |
| 1440 × 900 | 41 / **832.66** | 41 / **832.66**  |       280 |         88 |
| 1024 × 800 | 41 / **400**    | 41 / **400**     |       220 |         68 |
| 390 × 780  | 41 / **262**    | 41 / **262**     |       220 |         68 |

**Identical `x` and identical width at all three**, which is §18's shared axis
observed on a different machine, a different store and a different build from the
one it was built on. The heights are §9.2's 88-against-280 and 68-against-220
unchanged.

### 61.2 And the silhouette's ceiling holds against bodies nobody recorded

§51 measured the path strings against fixtures. The deployed store produced them
from real requests:

| Deployed window |  Bars | Volume `d` | Price line `d` | Volume seam lines |
| --------------- | ----: | ---------: | -------------: | ----------------: |
| 5D              | 1,950 | **12,205** |         23,933 |         4 (= 5−1) |
| 1M              | 8,190 | **12,203** |    **100,085** |       20 (= 21−1) |

**Volume's string moved by two characters across a 4.2× change in bars while the
price line's grew 4.2×.** That is the per-pixel rule's whole claim, taken from
the other end of the wire, and the price figure lands within 0.35% of §51's
100,427 on a body four days later. The seam count is §50's arithmetic confirmed:
a second plot costs `sessions − 1` lines and nothing that scales with bars.

## 62. The deep links, and which host answered them

Five cold loads of `/securities/NVDA?sessions=N` against **Azure Static Web Apps**
— which is the host whose `navigationFallback` is part of the artefact, and is
one of the three hosts `CLAUDE.md` says behave differently for an unmatched path.
`vite preview` and a dumb static host were not tested and would not have proved
this.

| Address          | Cold ms | What the page did                                                                       |
| ---------------- | ------: | --------------------------------------------------------------------------------------- |
| `?sessions=1`    |   2,680 | 1D selected, `1 SESSION`, a complete intraday line at −1.38%                            |
| `?sessions=21`   |   4,356 | 1M selected, `21 SESSIONS`, 8,190 bars                                                  |
| `?sessions=63`   |   2,525 | 3M selected, `63 SESSIONS`, daily bars, +6.56%                                          |
| `?sessions=252`  |   2,654 | 1Y selected, `252 SESSIONS`, daily bars, +21.49%                                        |
| `?sessions=1000` |   2,659 | **no radio checked**, `1,000 SESSIONS`, **no frame at all**, the calendar's own refusal |

The last row is three separate decisions verified in one load, on a real host,
from cold: **§4(b)'s no-snapping rule** (the control shows no selection rather
than moving the reader to 1Y), **§31.1's refuse-nothing rule** (the client asked
for it anyway and the server's sentence is what a reader sees — _"That window
reaches 2023-12-31, outside the trading calendar this system covers"_), and
**`CHARTING.md` §14's rule that `refused` draws no frame**, because it carries no
series and therefore no window. The readout still says `1,000 SESSIONS`, which is
the address being reported back rather than a number the product invented.

### 62.1 The held answer, on the deployed store

Pressing `1Y` from the default window and reading the price path **120 ms later**
returns a string byte-identical to the one before the press. That is §36 on the
deployed store, and it is the version that matters: the deployed store answers
both windows in full, so the transition a stranger sees is between **two complete
pictures**, not between a complete one and a four-fifths-short one.

## 63. The four tests, applied to the deployed page

Applied to two screenshots, both at **1440 × 900**: `?sessions=21` (the 1M
window, 8,190 bars, the largest thing this product draws) for the price half, and
the same page scrolled to the pair for the volume half. Naming the window is
2.13.4's requirement and it matters — the silhouette is what the default renders
and it is what 1M renders, but the _reason_ differs, and the end-column regime
§19.2 accepted is not visible at either.

**1. Would a stranger believe this is a real funded product?** Yes. The strongest
evidence is not the chart, it is the row above it: `225.12 OPEN / 234.76 HIGH /
207.25 LOW / 218.19 CLOSE`, then `Asked for` and `Held` printed as two separate
timestamped ranges, then `Bars 8,190 × 1m`, then `MARKET FEED ● All US
exchanges`. No demo prints the difference between what was asked for and what is
held. That block is what a stranger reads as a system that knows where its
numbers came from.

**2. Does it look designed rather than defaulted?** Yes, and the volume plot is
the clearest case in the product so far, because almost all of the design in it is
**subtraction**: no gridlines, no intraday times, no wash, no reference rule, one
label in the whole gutter (`9.22M`), columns with no direction. Beneath it,
`PEAK 9,216,907  Aug 21 · 09:30 EDT` — the exact integer under the abbreviation
the axis shows. A defaulted chart library gives you the opposite of every one of
those choices.

**3. Is there a moment in it worth showing somebody?** Yes, and it is a different
one from Story 2.12's. 2.12's moment was the split wash. This story's is
**pressing `1M` and watching 1,950 bars become 8,190 without the page moving** —
the panel does not blank, the frame does not resize, the heading re-labels, and
the readout underneath changes from `5 SESSIONS` to `21 SESSIONS`. The second
candidate is the 1M silhouette itself: 8,190 minutes of traded volume rendered as
833 stems, where the opening spike of every one of twenty-one sessions is legible
as a separate event.

**4. Does it feel alive?** **No — and this is the fourth deferral.**

The count is the finding. _Does it feel alive_ has now been answered "not yet, and
not from here" by Task 2.4.4 when the motion section was written, by Story 2.12's
close, by Task 2.13.2 against the artboard, and by this close. Four deferrals of
one criterion is the shape of a criterion that never gets met, and the count is
the only thing that makes it visible as a debt rather than as a habit.

The reason is unchanged and remains correct: the hard version of the question is
what happens when a **price** changes, and there are no live prices. What would
change it is Epic 3's motion vocabulary against real moving numbers. **Epic 3 is
the next epic, so the trigger is the calendar rather than a condition — which is
precisely why it needs writing down: nothing fires.** Story 2.14's close inherits
the count.

### 63.1 The latency half, answered separately, and it is a yes

2.13.2's amendment asked for the half that is latency rather than motion to be
answered on its own. It is, with figures (§53, §52, §47):

| What                                       | Measured                                                       |
| ------------------------------------------ | -------------------------------------------------------------- |
| Press a window → the new line is on screen | **72–130 ms**, no task over 50 ms                              |
| The crosshair, two plots, at the cap       | **16.7 ms** frame interval p50 — one frame at 60 Hz            |
| Three presses inside one answer's flight   | Previous window drawn **throughout**; 0.3 ms in frame builders |
| A resize tick with both plots on screen    | **0.35–1.04 ms**                                               |

Observed on the deployed page rather than only inferred from those figures: the
selection moves in the frame the press lands, because the control holds no state
— it reads the address; the frame re-labels rather than re-lays-out; and no figure
moves while it is being read.

**Nothing here is slow, nothing stutters, nothing blanks, and if the deployed
page reads as dead it is not because a frame was dropped.** That is the whole of
what the latency half can claim, and it is deliberately not offered as an answer
to test 4.

## 64. §1.3's trigger is settled, and one photograph is still owed

**Settled: 1D stays** (§39). That is a decision now, not an open trigger, and it
is not re-taken here.

**What is still owed is the weekday photograph, and it could not be taken
today.** 2026-09-13 is a Saturday; the deployed store holds Friday 2026-09-11 in
full, so `?sessions=1` renders **a complete intraday line at −1.38% with no
uncovered ground anywhere** — the best picture the control offers rather than the
emptiest. The weekend half of the pair is therefore taken twice and the weekday
half is taken not at all.

The honest record is that **1D's emptiness is a fact about the free plan's
fifteen-minute embargo and is only observable during a session**, and that no
address, no fixture and no pinned clock can produce it against the deployed store
— unlike acceptance criterion 3, which §42 could pin because the calendar is
checked in and the embargo is not. **Owner: the next person to open
`/securities/NVDA?sessions=1` on the deployed site during market hours.** The
condition is that concrete; naming a story would be naming something that has
already happened by the time anybody reads this.

## 65. The listener's half — what this task could and could not do

§45's three questions were moved here by 2.13.8's amendment, correctly: whether a
surface can be **used** is an acceptance criterion on the story that builds it.

**Two of the three were answerable and are answered in §45.1–45.4** — the volume
clause does reach the live region, the held-window clause does arrive, and both
are last in their sentences by design. **The third is not answerable by any
instrument in this repository, and it is the one that decides the other two.**

Whether a polite live region that changes every 477 ms **queues or replaces** is a
property of a specific screen reader on a specific platform. It cannot be
measured from the DOM, it cannot be measured from a timing, and it cannot be
measured by an agent: it requires a person, a pair of ears, and VoiceOver or NVDA
running against the deployed page.

**So it is raised rather than answered, and the attribution 2.13.8 corrected is
corrected again to match what actually happened**: §45's questions were moved to
this task, this task performed the measurement half and could not perform the
listening half.

| Question                                          | Status here                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Can a listener hear a bar's traded volume?        | The clause is present and last. **Whether it survives is unanswered.** |
| Is the held-window clause reachable in practice?  | Present and last. Same dependency.                                     |
| Is manual activation discoverable from the radio? | The tree is correct; every cell carries the readout. **Unanswered.**   |

**The repair is already decided and does not need the answer to be designed —
only to be scheduled.** §45.1: split the sentence, so the instant, close and
direction are spoken while stepping and the four prices and the volume arrive on
a pause. **Not** a higher floor, which would make a fast walk silent. It is a
change to `chart-reading.ts`'s `readingAnnouncement` and its two tests, and it is
not taken speculatively here because it is a design change that trades a
listener's completeness for their pace, and taking it blind could make the
current behaviour worse if a reader turns out to replace rather than queue.

**Owner: a person with a screen reader, before Epic 11 hands this surface to an
agent.** Epic 11 is the first epic where nobody is touching the page and the
spoken channel is the only one some readers have. Recording "nobody checked" is
worth something; recording "it was checked and it was fine" would have been worth
more, and this task could not produce it.

## 66. What a green run certifies here, and what it does not

- **`pnpm verify`, `pnpm e2e` (135 tests, 17 spec files) and `pnpm e2e:deployed`
  (16 tests, 3 spec files) all pass**, and the third covers **none** of this
  story. The deployed suite is routing, the tracked universe and the two halves
  being wired together. Nothing in it drives the window control, the rail, either
  plot or the crosshair. A green `e2e:deployed` after this story means exactly
  what it meant before it.
- **`pnpm test:database` was not run and is not in scope.** This story touched no
  file in the data path.
- **Every figure in Part nine is one machine, one store, on 2026-09-13**, taken
  through Playwright against the deployed artefact. Nothing re-takes them, and
  the two stores photograph differently on purpose.
- **The count of "a green check that was checking nothing" found during this
  story stands at one** (§28.1 — a shipped assertion with an `.or()` fallback
  that the panel's own live sentence satisfied), against three across two stories
  in total. That is the figure §14.2's four tests should be read against.
- **One gap-list entry could not be made mechanical, and the reason is
  measured.** §55.1's `marketDateAt`-per-bar rule was to become a spy asserting
  zero calls over a recorded `1m` body. `vi.mock` does not reach
  `@marketpulse/shared`, which the frontend consumes as **built output**: the
  mock intercepts the test file's own import and the module under test keeps the
  real function, so both halves of the guard read zero and the "break-verified"
  half would have been green against the break. It was built, probed, found
  green-against-nothing, and deleted rather than shipped — which is `CLAUDE.md`'s
  own rule (_a break that does not go red is equally evidence the break did not
  land_) catching a test this task nearly added. The entry stays prose.

## 67. What Story 2.14 inherits, in one place

The list `CHARTING.md` §17.5 gave this story at its start, in the same form.

1. **The window vocabulary** (§4) — the label, the accessible name, the address,
   the spoken sentence, the timeframe and the session count, in one table, now
   also ADR 0028's first decision. §4(b) is the item with the longest reach:
   the address admits any count the control does not offer.
2. **The timeframe mapping's home** is `apps/frontend/src/market/time-window.ts`,
   one function, and the property it buys — that no `sessions` value can produce
   a `too-large` refusal — is a claim to re-check if the cap or the boundary
   moves.
3. **The feed label is 2.14's and this story did not touch it.** Both plots'
   alternatives end _"Market feed: All US exchanges"_, which is Epic 2's wording
   for a stored series; the asymmetry invariant 6 records — stored bars are
   consolidated SIP, the live stream is IEX only — is 2.14's to state and Epic
   3's to inherit. A stitched series naming two sources is likewise 2.14's.
4. **The curated universe file's age** is untouched here and unchanged.
5. **Five new recorded bodies** are on `CLAUDE.md`'s must-not-ship list with
   their own greps: `dense`, `uncovered`, `holiday-week` (357 kB, the largest),
   `daily` and `daily-year`. **All seven greps on that list were re-run at this
   close against a freshly built `dist/` and all seven find nothing** — the two
   from Story 2.11 and 2.12 included, because the list is one property rather
   than five. They are still not run against the _deploy_ build, which is a
   different invocation of the same command on a different machine; 2.13.8 asked
   for that and it remains the thing a deploy could in principle differ on.
6. **Test 4's deferral count is four**, and Story 2.14 inherits it in writing
   (§63). Epic 3 owns the answer and nothing fires.
7. **The listening pass is open** (§65), with its repair already designed and its
   owner a person rather than a story.
8. **The weekday 1D photograph is owed** (§64), with a condition rather than a
   deadline.
9. **The 518-row universe table's long task is unchanged and still raised** —
   `SEARCH-AND-SELECTION.md` §10, twice dated, three candidate repairs, and
   Story 2.14's close owes the disposition. It is the one published-target breach
   this epic ships with.
10. **`pnpm e2e:deployed` covers none of Story 2.13**, and extending it is a
    decision 2.14 may take or decline — but should not inherit silently.

## 68. The honest caveat

In the shape 2.12.10 used, because it is still true.

A green run here certifies the chain and not coverage. The figures are one
machine on one day against one store, and nothing re-takes them. What is
mechanical is said to be mechanical — the element-count guards, the
zero-recomputation guard, the byte-identical held path, the description-on-the-
focused-stop assertion — and everything else in this document is prose with a
date on it. Two things this story owes are open and named with owners rather than
closed quietly: the listening pass and the weekday 1D photograph. One thing it
tried to make mechanical could not be made mechanical, and that is recorded with
the reason rather than as a silent omission.

---

# Part ten — after the close (2026-09-13)

## 69. The rail took its height out of the flow, and the chart jumped 30px

Reported by a person using the page: **press a window and the price chart drops
down**, then rises again when the answer lands.

The cause is §6.3's rail and nothing else. It is rendered above the picture,
exactly and only while a request is unanswered — which is to say **at the moment
somebody presses a window** — and it took its height out of the normal flow. So
the sequence a reader gets for one press is: chart in place, chart 30px lower,
chart in place. The picture is the thing they are looking at and, on a machine
with a pointer, the thing their hand is on.

Measured rather than estimated: with the repair reverted,
`e2e/specs/security-window-change.spec.ts` reports **30** where it requires under

1. That figure is one dense line of sentence plus the rail block's twelve pixels
   of padding above its own hairline, which is the rail's whole height — the panel's
   16px gap is spent either way.

### 69.1 Why it is a reservation rather than a move

Three repairs were available and two were rejected:

- **Move the rail below the chart.** Rejected: §6.3 is explicit that the label
  saying _which window the picture is of_ has to be **above** the picture,
  because a reader's first question about a screen that did not change when they
  pressed something is _what am I looking at_. A sentence under the chart answers
  it after the chart has already been misread.
- **Overlay the rail on the chart.** Rejected for the reason the stale rail was
  put beside the numbers rather than on them in the first place: nothing in this
  panel is allowed to make a figure harder to read while somebody is reading it.
- **Reserve the slot.** Taken.

### 69.2 The reservation is a measurement, not a length

`CHARTING.md` §15.4's finding applies here unchanged, and it is the reason this
is not a `min-height` token: **no single reserved height is correct at more than
one width.** The rail's sentence — _Still showing the 5-session window while the
21-session window is read._ — is one line at 1440 and **two** at 390.

So the slot is one grid cell with every state of the rail placed in it, the live
one visible and a hidden copy of the in-flight sentence laid out beside it. The
row is therefore as tall as the tallest of them _at this width_. The hidden copy
is `aria-hidden` and `visibility: hidden` — present in layout, absent from
everything else — and has nothing focusable in it, so it is out of the tab order
by construction.

The phrase it is measured against is the **longest** of the five windows the
control offers, plus the two this screen is actually holding and asking for. That
last part matters: an address naming a count the control does not offer sizes the
slot for itself rather than being clipped by a vocabulary that never saw it.

### 69.3 What the break-verification says, and it says the expected thing twice

Two substitutions were performed rather than assumed:

1. **The sizer deleted.** `pressing a window does not move the chart` goes red at
   **30** against a tolerance of 1, and the component test asserting the
   reservation is present goes red with it. `pnpm verify` stays entirely green
   throughout, which is this file's standing point about layout: jsdom computes
   no layout, so the defect and the repair render identically below `pnpm e2e`.
2. **The sizer replaced by a 30px `height`** — the obvious wrong repair, a
   measurement of one viewport declared as a constant. **Desktop stays green and
   tablet and phone go red.** That is §15.4's shape reproduced exactly, and it is
   why the new test runs at three viewports rather than at the one a developer
   is looking at.

### 69.4 What is deliberately not reserved

The extra content the **refused** and **failed** rails bring — the server's own
sentence, the retry, the reference. Those are settled outcomes that no press of a
window can produce: the control emits only the five counts and every one of them
is answerable, so a refusal needs a hand-typed address and a failure needs a
broken network. Reserving the tallest of them permanently would put a failure's
worth of empty space above every chart in the product, on every screen, for ever.

The residue is honest: **a window change that fails still moves the chart**, by
whatever the failure's own rail is taller than one sentence. It moves once, to a
settled state, rather than twice under a pointer.

### 69.5 One number, and it is a fraction of a token

`.rail` gives back half the panel's gap at each end (`margin-block: calc(-1 *
var(--space-8))`). Without it the slot spends a full gap above **and** below a
region that is empty in the steady state, and the result reads as a missing
element between the ticker and the price rather than as breathing room around the
display figure. Eight pixels either side is what the rail needs to sit clear of
both when it _is_ occupied, and it already carries twelve below its sentence
before its hairline.

### 69.6 Two locators learned that a hidden copy is in the DOM

Both are the same correction made twice, and both are the query telling the
truth rather than a nuisance:

- `BarSeriesPanel.test.tsx`'s `VISIBLE` now ignores `aria-hidden` subtrees, as it
  already ignored `role="status"`. Same rule: a text query that does not say
  which channel it means resolves to every channel.
- `e2e/support/app.ts`'s `readable` now requires `:visible`. Note this is the one
  exclusion that could not be written as an attribute selector — the hidden
  element is a wrapper and the text is in a child. It covers the two
  `chart-readout.module.css` sizers too, which were only ever missed because
  nothing had yet queried their text.

## 70. Twenty-one dead stories, since Task 2.13.4

Found by opening the workshop to review §69: **every story on
`Market/BarSeriesPanel` was an error screen**, and had been since the task that
put the chart inside the panel.

`useChartAxis` throws outside a `ChartAxis` on purpose — §15.1's mechanism, and
the thing that stops a second plot building its own axis — so from the moment
`BarSeriesPanel` rendered a `PriceChart`, its stories needed the provider the
route and the component test both give it. Every chart story in
`components/PriceChart/` wraps correctly. The one file that needed a decorator
was the one file that did not have one.

**Nothing caught it and nothing could have.** `pnpm stories` fails if a component
has no stories _file_; it does not open one. Storybook's build compiles a story
rather than rendering it, so twenty-one throwing stories build clean. `pnpm
verify` was green throughout, and so was the browser suite, which drives the
product rather than the workshop.

The repair is one decorator on `meta`, built from `screen.shown` rather than
`screen.view` — the axis is the window of the picture that is **on screen**,
which on a window change is not the window that was asked for — plus one
`ChartAxis` per panel inside `AllPermutations`, because an axis is a window and
that story holds thirteen.

It is worth recording as a **class** rather than as a bug: a story is reviewed by
a person, and the gap between _builds_ and _renders_ is invisible to every gate
this repository has. `CLAUDE.md`'s gap list carries the re-measure.

## 71. The row above the picture, and the region heading given back

§69 reserved a slot for the rail and paid for it in height: a band above the
chart that is empty in the steady state. Looked at on the running page, that band
was **the wrong shape of repair** — it bought a still picture with permanent
white space, and it was noticed immediately.

What replaced it costs nothing, and the move is three changes that only work
together.

### 71.1 The control comes off the region's heading row

§8.6 put it there and gave the honest reason: this product has no page-level
control bar, and inventing one for a single control is chrome arriving before its
second occupant. That reason still stands — what is below is **one row inside one
panel**, not a control bar — and two things it did not weigh are visible the
moment the page is looked at:

1. **It makes the Price region's heading taller than every other region's.** Four
   regions on that screen have a heading of one line; one has a heading sized by
   a 36px control. Nothing about the window is a property of _this_ region's
   name.
2. **It leaves the rail nowhere to go.** The rail has to sit above the picture
   (§6.3), it exists only while a request is unanswered, and everything above the
   picture in this panel is in the normal flow.

### 71.2 The rail and the control share one row

The control is permanent, so the row is permanent. The rail takes the space to
its left, which is dead at every width where the two fit on one line. The rail
therefore costs **nothing** at those widths: the row's height is the control's,
and the reservation §69 built is absorbed by it.

Measured on the running page at 1440: the chart's top is identical either side of
a press, and the row above it is the same height it was with no rail in it.

Where they do not fit — 768px and 390px of _region_, which is where the control
alone already wraps — the rail takes a line of its own and §69's reservation is
what stops that line appearing under the reader's hand. So the reservation
survives, and it is free exactly where the space was expensive.

### 71.3 The `filledBy` sentence goes

_"One security's closes over the window you choose, drawn — with the exact figures
the picture rounds stated beneath it."_

It earned its place when this region held a **fence** — Story 1.5's convention was
that a region says what it holds and what it deliberately does not, and a panel of
numbers where a reader expects a chart looks unfinished unless it says the chart
is a story away. Task 2.12.4 drew the chart and amended the sentence; Task 2.13.6
shipped the control and amended it again. What was left was a caption for a
picture immediately below it, above a control that says the same thing in less
space, costing the drawing a paragraph of height at every width.

So it is **deleted rather than amended a third time**, and `Region`'s prop is
optional rather than this one call site passing an empty string. `SecurityExplorer
.test.tsx`'s assertion moved with the sentence, as it did both previous times —
the region's _name_ and its landmark are unchanged and still asserted.

`Region`'s `control` prop is removed in the same change. It had one consumer, and
an honest-but-unused slot on a shared component is the `initiallyCollapsed`
hazard `SEARCH-AND-SELECTION.md` records: the next author to reach for it would be
re-introducing the taller heading with nothing going red.

### 71.4 The defect this uncovered, which was the same defect one layer down

With the rail reserved, the tablet viewport **still moved 24px** — and the rail
was not the cause. The control's own readout is what moved: `5 SESSIONS` fitted
beside the five cells at 318px of region and `21 SESSIONS` did not, so pressing
`1M` wrapped the readout onto a second line and made the control 24px taller.

It is the same rule as §69 one layer down, and it had been there since Task
2.13.6 — invisible while the control sat on a heading row with nothing under it
that a reader was looking at. The repair is the same idiom for the third time:
the readout is a one-cell grid holding its value and a hidden copy of the
**widest count this control could be asked to show** — the five it offers, plus
whatever the address named, because a `1,000-session` address is a routine input
here. Its `aria-describedby` target moved to the value itself, so the description
every cell points at is the sentence a reader sees rather than that sentence with
a measurement in front of it.

**Break-verified**: deleting that copy takes `pressing a window does not move the
chart at tablet` red at **24**, and leaves desktop and phone green. Which is the
third time in two days that the middle viewport is the instrument.

### 71.5 What this cost, honestly

At 768px and 390px of region the reserved rail line is still a band of white
above the control in the steady state, and the control is now permanently two
lines at those widths rather than sometimes one. Both are the price of a picture
that does not move. It is strictly less than what was there before this change,
which was a taller heading, a three-line paragraph **and** the reserved band.

### 71.6 One instrument corrected

`plotTop` measured the plot against the **document** and was flaky at 390px in a
full parallel run — 82px, with nothing in the panel having changed. The cause is
worth recording because it is not this change: the identity block above the grid
is filled by the **universe** request, and under load that can land after the bars
do, moving the whole region down the page. The assertion is now the plot's
position **inside its own region**, which is the property the rail can actually
affect.
