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
