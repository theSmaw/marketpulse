# Provenance — what this product claims about its own data, and in whose words

**Subject document for [Story 2.14](STORY.md).** Created 2026-09-14 by
[Task 2.14.1](TASK-01-settle-the-provenance-claims-and-the-two-empty-answers.md),
which settles every claim before a string reaches a screen; finished by
[Task 2.14.10](TASK-10-the-epic-close-cost-adr-documents-and-what-ships-open.md).

This is not a section of
[`PROVIDER.md`](../story-06-market-data-provider-abstraction/PROVIDER.md). That
document is the provider seam and the outcome taxonomy, which is **mechanism**:
what a provider is, what it may return, what it may not retry. This one is what
the product **says on screen about the truth of a number** — which Epic 3 extends
from _which feed_ to _which feed, and is it still connected_, Epic 8 parallels
with a different kind of provenance about a different kind of claim, and Epic 13
constrains with a clock.

Six decisions, each with what was weighed and a reversal trigger that is a
**condition**. Then the one branch that has never executed, and the list Task
2.14.10's sweep is owed rather than has to search for.

---

## 0. What arrives settled, and one rule the six decisions below all turn out to share

Five things are decided elsewhere, and none of them is re-taken here. Where a
decision below is a consequence of one, it says so.

- **The premise this story was planned against is inverted, and the inversion is
  measured.** The free Alpaca plan is **asymmetric**
  ([`ALPACA.md`](../story-07-alpaca-historical-data-integration/ALPACA.md) §2,
  [ADR 0019](../../../docs/adr/0019-the-alpaca-client-a-measured-vendor-and-what-a-recorded-fixture-certifies.md)
  §2): stored historical bars are **SIP, the full consolidated tape**, and the
  live stream is **IEX only**. For everything this epic stores, the honest label
  is the opposite of a disclaimer. The word `disclaimer` does not appear again
  below.
- **A feed gets a sentence when its label cannot stand alone, and not
  otherwise** — ADR 0019 §3, learned by shipping three wrong strings for `sip`
  in a day. `IEX` gets one; `All US exchanges` does not. Inherited, applied
  below to a second vocabulary (§4), and never re-argued.
- **The words are not chosen in a component.** They live beside the vocabulary
  they describe, and the `Record<…>` annotation on that table is what makes a
  member added without words a compile error. A string literal in a renderer
  puts that guarantee back outside the compiler. §9 is the table of where every
  string this story adds lives.
- **Provenance is a field on the data, not a caption on a component**
  (`packages/shared/src/market-provenance.ts`). A series names a **list** of
  sources, which may disagree about feed and may not disagree about adjustment.
  That shape is settled; this story spends it.
- **Colour is never the sole encoding, and nothing here is red or green.** A
  single-venue feed is not a fault — [`PRODUCT_SPEC.md`](../../PRODUCT_SPEC.md)
  §36 makes it a product state — and neither is an unadjusted price or an old
  curated file. The one amber in the existing treatment is `synthetic`, which
  carries a square and a sentence beside it.

### 0.1 The rule the six decisions kept arriving at: **a claim about data requires data**

This was not on the list and it governs three of the six, so it is stated once
here rather than three times below.

`market-bars.ts` exports `SOURCE_OF_NOTHING` — `{ provider: "alpaca", feed:
"sip" }` — for the one case the ledger cannot describe: an answer holding **no
bars at all**, for a pair the ledger has never had a row for. Its own comment is
exact about what it is: _"that source's `barCount` is `0`, so what these two
fields describe is nothing. They are not a claim about data; a claim about data
requires data."_

The domain model therefore hands a renderer a fully-formed, entirely truthful
provenance record **about zero numbers**. A screen that prints it says
`All US exchanges · Unadjusted · retrieved 8 September` under an empty frame —
four accurate words describing nothing, which is a stronger false impression than
silence, because a reader takes them as a claim about the picture.

**So: the source note (§1), the adjustment (§4) and the coverage sentence (§3)
all render nothing when `bars.length === 0`.** The empty state's whole
explanation is `ChartVacancy`'s sentence and §6's correction to it. This is one
rule and it is checkable from one field.

#### Amended 2026-09-14 by Task 2.14.2 — **the rule is per clause, not per note**

Drawing the zero-bar page found one clause the sentence above suppresses that it
should not, and the rule as written is what finds it rather than what hides it:
**a claim about data requires data, and the classification clause's data is not
the bars.**

The feed, the adjustment and the retrieval date are properties of `BarSource`
and `SeriesProvenance`; with no bars they describe nothing, and printing them
under an empty frame reads as a claim about the picture. The classification
clause is a property of the **universe** response, which on a zero-bar page has
resolved — `SecurityIdentity` three centimetres above is still printing
`Technology · Semiconductors · NASDAQ`, still one region above a chart, still on
a market product. Suppressing the only sentence saying those two words are
curated, because a _different_ fetch came back empty, removes a true claim from
the page where least else is competing for attention. It is also the commonest
page in the suite: CI's store is 518 securities and zero bars, so the rule as
first written would suppress that claim on **every page CI renders**.

**So the rule is applied per clause: each clause renders when its own data is
present, and the note renders when at least one clause does.** A series with no
bars therefore draws the classification line alone; a page with no resolved
security, or a failed universe fetch, draws no note at all — which is the
shape §0.1 was reaching for and is unchanged in every case it was written
against. [Task 2.14.3](TASK-03-where-these-numbers-came-from-on-screen.md) and
[2.14.4](TASK-04-the-curated-files-age-and-what-alpaca-did-not-tell-us.md)
implement it; the canvas is `Provenance and the empty answers.dc.html` §04.

---

## 1. Decision 1 — how prominent, and where

### 1.1 What the three surfaces say today, measured rather than assumed

| Surface                               | What it claims                                                      | Where it renders                                                                                                                                                                                  | Visible?                |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `FeedProvenance`, in the masthead     | what **this deployment** reads — `MARKET FEED` / `ALL US EXCHANGES` | all five routes                                                                                                                                                                                   | yes                     |
| `BarSeriesPanel`'s `Provenance`       | what **this series** is made of                                     | **never** — it returns `null` until the sources name two distinct feeds (`BarSeriesPanel.tsx`, and [`VOLUME-AND-WINDOW.md`](../story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md) §74.1) | no                      |
| `chart-alternative.ts`'s `feedClause` | what **this series** is made of                                     | the chart's text alternative                                                                                                                                                                      | to a screen reader only |

So the honest summary of the product on 2026-09-14 is: **the chrome makes a
standing claim about the deployment, the numbers on the Security Explorer carry
none of their own that anybody can see, and the one per-series statement that
exists is audible and invisible.**

That is not an oversight and §74.1 is not wrong. The feed row came off the panel
on the test that nothing was the only home of what it said, and it came off the
same day §75 measured that everything accumulated between the two plots was
distance a reader has to carry a shape across. Both findings stand. **What they
do not address is that three of the four provenance facts have no home at all:**
`adjustment` is on every source of every series, on the wire, in every fixture,
and renders nowhere; `retrievedAt` likewise; and the curated classification's age
is a column Story 2.3 argued for that nothing has ever drawn.

### 1.2 The screenshot argument, taken seriously and found to prove something narrower

The story's stated case for per-series labelling is that **a screenshot of a
chart travels, and a screenshot carries no chrome**. That is true and it is worth
saying what it actually implies, because taken at face value it argues for
something this product has already refused.

Nothing short of a mark **inside the plot frame** survives a crop. A caption
under the chart does not; a line in the panel header does not; a note at the foot
of the page does not. A watermark inside the frame is the only rendering the
argument as stated would justify — and that is exactly what
[ADR 0027](../../../docs/adr/0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md)'s
element budget and §74's decluttering both argue against, at a cost measured in
main-thread milliseconds and in reader attention.

**So the screenshot argument is accepted in the narrower form it can carry: the
claim must be on the page with the number rather than one route away.** The
chrome already satisfies that. What the chrome cannot satisfy is truth, and that
is the real defect: from Epic 3 a stitched series genuinely names two feeds, and
one page-level label is then wrong about half of it.

### 1.3 The decision — a source note, and the rule that keeps it from becoming a footnote pile

**The Security Explorer gains one source note, at the foot of its region group,
in the micro type. Its governing rule is: _the note states what the chrome
cannot, and never repeats what the chrome can._**

That rule is what makes it one line rather than five, and it resolves the
prominence question by answering a different one — not _how loud_, but _what is
this surface for_.

| Fact                                                            | Who states it                                                                                                              | Why                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the deployment's feed                                           | the **chrome**, always                                                                                                     | it is a standing claim about a deployment and cannot change without a deploy and a reload (`FeedProvenance`'s own argument for not being a live region) |
| **this series'** feeds                                          | the **note**, when they number more than one **or** when the single feed is not the one `useMarketFeed` reports configured | both conditions are readable from data the page already holds; see the amendment below for which of them is reachable today                             |
| the adjustment                                                  | the **note**, always (when there are bars)                                                                                 | the chrome can never state it — it is a property of a request, not of a deployment                                                                      |
| when these bars were retrieved                                  | the **note**, always (when there are bars)                                                                                 | likewise                                                                                                                                                |
| where sector and industry came from, and when they were checked | the **note**, always                                                                                                       | §5; likewise, and it is the fact most easily mistaken for market data                                                                                   |

**One note for the screen, not one per region.** The two plots are one series on
one axis stopping at one coverage edge — §13 of `VOLUME-AND-WINDOW.md` is
explicit that this adjacency is the one in `PRODUCT_SPEC.md` §8.3 that is not a
preference — and the identity block is one classification. Three captions for one
fact set is the footnote pile
[Task 2.14.2](TASK-02-the-provenance-surface-on-the-canvas.md) exists to catch on
a canvas rather than in a component, and it is exactly what five correct
additions made one at a time produce.

**At the foot, and not between the plots.** §75 measured what accumulates in that
gap and removed it. A provenance line reinstated there would be that change
undone by a task that had not read it.

**`BarSeriesPanel`'s `Provenance` is not deleted and not extended.** It stays as
it is — the per-series feed row that renders itself the day a second feed
arrives — because its condition is the same condition the note uses and deleting
it would leave the note as the only reader of a fact the panel is better placed
to draw when it is the panel's own series that is mixed. What §74.1 settled about
it is untouched.

#### Amended 2026-09-14 by Task 2.14.3 — **the second condition fires today, on a deployment with no provider**

The table above said _neither can be true today_. Building it found that the
second one can, and the case is the **default one**: `MARKET_DATA_PROVIDER`
defaults to `none`, the chrome then reads `MARKET FEED — NOT CONFIGURED`, and
the store goes on serving bars regardless, because a stored series does not need
a live provider. So the page holds numbers and the chrome makes **no feed claim
at all**.

Suppressing the note there was the alternative, and it is the one that fails
§35: it would leave a screen of prices with no statement anywhere of which
venues are in them, which is _hide data provenance_ reached by the rule meant to
prevent duplication. **So the rule is stated as: suppression requires a positive
match.** The note says nothing about the feed only when the chrome is naming
_this_ feed correctly — `state: "configured"` and the same value — and speaks in
every other case.

Two consequences worth recording:

- **The duplication §1.3 exists to prevent is now structural rather than
  inspected.** The two surfaces cannot both print `All US exchanges`, because the
  note's condition is the negation of the chrome's. The done-when's _put the two
  on one screenshot and check no fact appears twice_ was still performed and it
  passed; what changed is that it can no longer fail by accident.
- **`checking` suppresses without a match**, and that is the one exception. It
  lasts one settle, and a row that appears on the first frame and is taken away
  three hundred milliseconds later is a worse reading than a fact that arrives
  with everything else.

The first condition — more than one feed — is still unreachable and still Epic
3's.

**Alternatives weighed and declined**

- _Put it back under the plot._ Declined: reinstates the distance §75 removed,
  three centimetres below a chart that had just been given its vertical space
  back.
- _Put it in the panel's header-right slot_ (`Panel`'s aside, whose own comment
  describes it as _"a count, a provenance line, a control"_). Declined: that slot
  holds the window control on this panel, and a control and a four-clause
  provenance sentence competing for one cell at 390px is the arrangement §75
  called actively wrong in a neighbouring case.
- _Leave it to the chrome and the text alternative._ Declined: it is the status
  quo, and the status quo has no home at all for adjustment, retrieval or the
  curated file's age. §35 lists _hide data provenance_ among the things this
  product must not do, and three of four facts being audible-only or absent is
  the letter of that.
- _A disclosure — a `Popover` behind an affordance._ Declined for this story: a
  provenance claim that has to be opened is one a screenshot never carries and a
  reader never meets, which is the whole defect. Recorded as the escape hatch if
  the note grows past two lines at 1440.

**Reversal trigger:** **the first screen that shows two securities' series at
once.** Epic 8's comparison chart is the named candidate. At that point one note
per screen stops being one claim — two series can differ in feed, adjustment and
retrieval age — and the note has to move onto each series or onto each row of a
legend.

---

## 2. Decision 2 — the wording when a series' sources disagree

### 2.1 What is open, and what is not

The chrome's standing claim is shipped and settled (ADR 0019 §3). What is open is
the sentence a **series** says when stored SIP bars sit beside a live IEX tail.
The failure mode is named in the task and is the thing to design against: **it
must not collapse into naming whichever feed is first in the list.**

Today's two renderings both come close to that failure without committing it.
`Provenance` renders the distinct feeds as a set of labels; `feedClause` renders
`Market feeds: All US exchanges and IEX.` Both name every feed, and **neither
says which bars are which** — so a reader of a 782-bar chart whose last two bars
are IEX and a reader of one that is half and half are told the same thing.

### 2.2 The decision — name the split, in contribution order, with the counts

**The sentence names each stretch with its bar count, in `sources` order, and is
never sorted and never deduplicated to the first.**

> Stitched: 780 bars from **All US exchanges**, then 30 from **IEX**.
> _Trades reported by the IEX exchange only — not the full US consolidated tape._

Three things about that shape are the decision rather than the illustration:

1. **The counts are what make "whichever is first" visibly wrong rather than
   invisibly wrong.** A reader who is told _780 then 30_ cannot mistake the chart
   for a single-venue chart, and a renderer that dropped a source would produce a
   sentence whose arithmetic does not reach the bar count on the axis.
2. **`barCount` rather than a time range**, because `barCount` is what `BarSource`
   carries. A range is a second fact the wire does not have, and walking the bars
   to compute one in the client is the client deriving provenance rather than
   reading it — which is the mistake `market-provenance.ts`'s whole module
   comment exists to prevent.
3. **The `iex` sentence rides along unchanged.** It is `MARKET_FEED_DESCRIPTIONS`'
   and it is rendered because the label cannot stand alone; that is the inherited
   rule applied, not a new one. This is where invariant 6's fence actually stands
   — not on the acronym, on the sentence under it.

**Where the words live:** a new exported function in
`packages/shared/src/market-provenance.ts`, beside `MARKET_FEED_DESCRIPTIONS`,
returning a **structured description** (the ordered stretches, each with its
label, count and optional sentence) rather than an assembled string. A function
returning one string would force a renderer to choose between markup and plain
text and would put the emphasis in the string; a structure lets the note and the
text alternative render the same facts in their own media, which is the same
one-vocabulary rule that record already holds.

**What is deliberately not done here:** no body is fabricated to demonstrate it.
`stitched.json` is a real recorded body naming two sources, and — verified, not
assumed — **both name `sip`**, because both halves came from Alpaca's historical
API. All sixteen recorded bar-series bodies are `sip`. The two-feed case is not
producible from anything a server has sent.
[Task 2.14.3](TASK-03-where-these-numbers-came-from-on-screen.md) owns how it is
reached from a story without claiming a server sent it; today's precedent is
`BarSeriesPanel.test.tsx`'s one-field change through the real transition, with
the field named in the test so the day a body is recorded it replaces the edit.

### 2.3 One structural condition this wording depends on, found while settling it

[`EPIC.md`](../EPIC.md) records that **`market_bars` will hold two tapes**:
everything stored is SIP, Epic 3's live bars are IEX, and _the row does not say
which_. Provenance is held per `(security, timeframe)` in `bar_coverage`, not per
bar.

So the sentence above is true **only while the IEX tail is stitched at read time
from a provider result**, which is what `serve-series.ts` does now and what makes
two sources appear. The day Epic 3 **stores** an IEX bar into `market_bars`, the
ledger's single provenance row describes it as SIP, `mergeSeriesProvenance` is
never called, and the series reports one feed with complete confidence and is
wrong. That is a defect in the store and not in this wording, it is Epic 3's to
fix, and it is recorded here because this is the document that would otherwise be
blamed for the sentence being false.

**Reversal trigger for the wording:** **the first source whose stretch is not
contiguous.** A count locates a stretch only while each source contributes one
run of bars; the moment one does not, the count stops answering _which part_ and
the wire owes a range.

---

## 3. Decision 3 — "data through …" when the data is simply historical

### 3.1 The three candidates, and what each would cost

`PRODUCT_SPEC.md` §36's shape is _"Live feed disconnected — displaying data
through 10:42:17"_, and that sentence earns its place because something
**stopped**. Nothing has stopped here.

- **Always state the end of coverage.** Cheapest, and it is the padding ADR 0019
  §3 rejected in a neighbouring case: under a `loaded` chart whose axis already
  ends where the data ends, _"data through 16:00"_ restates the picture. Padding
  in a small type teaches a reader that the small type is not worth reading,
  which is the specific harm that argument turned on.
- **State it only when the answer is short of what was asked.** Costs nothing new
  — `coverage.covered` and `coverage.requested` are both on the wire, and
  `partial` is precisely this condition.
- **State it only when it is behind by more than a threshold.** Costs the most
  and answers a different question. `GET /diagnostics/freshness` is the thing
  that knows, and it is a claim about the **store** — sessions behind, per
  timeframe, universe-wide — not about **this series**. Its own comment sets the
  price of reading it: _"Declared here rather than in `packages/shared` by the
  same test... If the status strip ever renders it, that test is what has
  changed"_ — so rendering it moves the type, adds a fetch to `api-client.ts`,
  adds a hook, and puts a per-store number under a per-series chart. And the
  threshold itself would be a figure nobody measured.

### 3.2 The decision — bound to `partial`, and given a visible home rather than only a spoken one

**The sentence appears exactly when the answer is short of the window asked for,
and says how far the answer reaches and how far the window ran.**

The rendering already exists for listeners and is the wording to keep:

> holding 59 bars, **through 15:42**, of a window running to 16:00.

What it does **not** have is a visible half. On the picture, a short answer is
told by the uncovered ground and the coverage edge —
[`CHARTING.md`](../story-12-price-chart/CHARTING.md) §14.1's rule, and it is
enough to say _something is missing_ and _it stops here_. It is not enough to say
**when**, and the instants are exactly what a reader cannot recover from a
session-ordinal axis. That gap is the whole justification for the sentence, and
it is also why it does not apply to `loaded`: there, the axis is the answer.

**Where the words live, and this is the half worth more than the decision:**
`apps/frontend/src/components/BarSeriesPanel/series-facts.ts`, as one function
producing the phrase, **read by both the visible rendering and
`series-announcement.ts`**. Today that sentence is assembled inside
`series-announcement.ts`; a visible copy written separately in
[Task 2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md) would be two
vocabularies for one fact, which is the drift `MARKET_FEED_DESCRIPTIONS` exists
to prevent one layer up. One function, two readers.

> **Placed 2026-09-14 by Task 2.14.2: the rail, and the rail now has a stated
> priority.** The reading strip is declined for two reasons that are one reason —
> it answers _what did this one bar do_ at a reserved height so that pointing at
> the chart never moves a figure under a reader's hand, and it sits below the
> plot, which the constraint in this paragraph forbids. The rail already exists
> to say what became of the window you asked for, and _we answered 59 of the 78
> bars_ is the same genus; it is also the only position on the panel that is
> beside the four prices this sentence qualifies, which are computed over the
> bars we hold rather than over the window we asked for.
>
> The rail holds one line's reserved height and now has three possible
> occupants, so the order is **stated rather than stacked**: the held-window
> sentence first, because until it is said every other sentence about "the
> window" is ambiguous about which one; the coverage sentence second; nothing
> third. They are naturally sequential — when the held sentence clears, the new
> answer's own coverage sentence takes the slot — so nothing is lost, it arrives
> one beat later. **The reservation is re-measured against the longer of the two
> phrases** by [Task 2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md);
> a tolerance is measured, never argued.

**Where it is drawn is `Task 2.14.2`'s to place on the canvas**, under one
constraint this decision does impose: it is a statement about **what the picture
is of**, so §6.3's rule applies and it may not come after the picture. The
headline row's rail and the reading strip are the two candidates; the source note
is **not** one, because the note is about where numbers came from and this is
about how far they reach.

**And it is not a source-note clause**, which is the same distinction stated
positively: §1's note answers _whose numbers are these_, and a reader who asks
_how much of my window did you answer_ is asking about the request.

**Reversal trigger:** **the first reader that has to tell _we hold all of it_
from _we hold all of it that exists so far_.** Epic 3's live tail is the named
candidate: a fully-covered window during a session is complete and still moving,
and at that point `loaded` needs a sentence too and the threshold option comes
back into scope with a real signal behind it.

#### Amended 2026-09-15 by Task 2.14.5, which built it — three things shipping it settled

**1. The instants are written in full, and the canvas drew them short.** §05 of
`Provenance and the empty answers.dc.html` mocked the sentence as _"Holding 59
bars, through 15:42, of a window running to 16:00."_ The shipped sentence is
`formatMarketInstant`'s, dates and zone abbreviation included, and the first
partial answer on a running pair is why: it reads **through 2026-09-11 16:00:00
EDT, of a window running to 2026-09-14 16:00:00 EDT** — two _different days_,
which the short form renders as _"through 16:00, of a window running to
16:00"_, a sentence that says a window was missed by nothing at all. The canvas
is the source of truth for the language and a mock is not a measurement; **§05
has been redrawn to the shipped form** rather than the tree being left to
diverge from it, which is ADR 0026's chain applied in the direction it is meant
to run.

**2. The reservation is 66px, and it was measured rather than compared.** The
rail now holds **two** hidden copies in its one grid cell — the held sentence's
worst case and the coverage sentence — so the row is as tall as the taller _at
this width_, and nothing counts characters. Comparing the two as strings was the
obvious implementation and is exactly the argued tolerance `CLAUDE.md` warns
about: the held sentence's worst case is picked from a closed set of window
phrases, and the coverage sentence's length is a property of an answer. Measured
2026-09-15 against a store four sessions behind: **48px before, 66px after, at
1440 and at 390 alike.** The residue — the bar count's digits, which the hidden
copy takes from the series on screen — is in `docs/GAPS.md` with the probe that
re-takes it.

**3. The rail's static rule is now a shared class, and the class was renamed for
it.** `.heldWindow` became `.railBlock`, because a third occupant arrived that is
not about a held window at all. What the two share is the thing the rule
declares: they are **settled**, so the hairline under them does not travel.
`.refreshing`'s does, and it means _a newer answer is on its way_ — a travelling
rule under a coverage sentence would say work is in progress under a finished
answer, which is the tone failure this task's own notes predicted, arriving
through CSS rather than through copy.

---

## 4. Decision 4 — the adjusted/unadjusted disclosure

### 4.1 Per-series or per-source is already answered, by the type

The task asks it as open. `market-provenance.ts` has already closed it, and the
mechanism is the interesting part: `adjustment` sits on `SeriesProvenance` and
**not** on `BarSource`, `SeriesProvenance` is branded and obtainable only from
`toSeriesProvenance` or `mergeSeriesProvenance`, and the second of those
**refuses** to join two adjustments. A per-source adjustment is unrepresentable
rather than merely discouraged.

So the trap the task names — _on this plan every stored bar is the same
adjustment, so a per-source disclosure is one fact repeated N times until the day
it is not_ — has no day on which it is not. **One value, one statement, per
series.**

### 4.2 What a reader is told

Today every series is `raw`: `market-bars.ts` exports
`STORED_BAR_ADJUSTMENT = "raw"` as a statement about what that table holds, the
stitched tail is requested at the same adjustment because the merge would
otherwise refuse, and all sixteen recorded bodies carry it.

`raw` is a slug and it cannot stand alone. **Unadjusted** is closer and still
cannot: to a reader who has not met the word, it reads as a fault — as though the
prices are missing something they were supposed to get — which is the same misread
ADR 0019 §3 caught with `SIMULATED`. So the inherited rule fires, and a sentence
follows:

| Value            | Label              | Sentence                                                 |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `raw`            | **Unadjusted**     | _Prices as they printed. Not restated for stock splits._ |
| `split-adjusted` | **Split-adjusted** | —                                                        |

**`split-adjusted` deliberately gets none**, and that is the rule doing work
rather than being applied uniformly. `PRODUCT_SPEC.md` §3's persona _"understands
concepts such as price moves, volume, sectors, correlations and filings"_;
`Split-adjusted` states the whole thing in two words, and a sentence under it
could only restate it — which is precisely the three-attempt history `sip` has.

**Where the words live:** `packages/shared/src/market-provenance.ts`, as
`ADJUSTMENT_DESCRIPTIONS`, a `Record<Adjustment, ProvenanceDescription>` — the
same annotation and the same guarantee, so an adjustment added to `ADJUSTMENTS`
without words is a compile error naming the missing member.
`MarketFeedDescription` generalises to `ProvenanceDescription` (label, optional
sentence) with the feed name kept as an alias, so the sentence rule is stated
once for both vocabularies rather than twice.

**And it renders only when there are bars**, by §0.1.

### 4.3 Why this matters more than it currently looks, which is the reason to ship it now

`raw` is invisible in testing and wrong exactly once. `market-provenance.ts`
states the consequence in terms: **a series spanning no corporate action returns
identical numbers in both modes**, which is almost every series almost all the
time. The disclosure is cheap today for the same reason it is nearly pointless
today — and it stops being either the first time an offered window spans a split,
at which point the step in the picture is a real print rather than an artefact
and the note is the only thing on the screen that says so.

**Reversal trigger — and it is a trigger to make the disclosure louder, not to
remove it:** **the first window this product offers that spans a corporate action
in a security it tracks.** The two named candidates are a depth control past `1Y`
on daily bars (the store's daily depth is bounded at 2024-01-01, so the window
vocabulary is the only thing keeping this out of reach) and Epic 5's return
percentiles, where `market-provenance.ts` already records what an unadjusted
10-for-1 does to a distribution: _"a **−90% return** sitting at the 100th
percentile of every distribution it touches, producing a permanent, confident and
entirely false anomaly."_ At that point the disclosure stops being a footnote and
becomes a mark on the chart at the session it happened.

---

## 5. Decision 5 — what the metadata provenance says

### 5.1 What exists, unrendered

`GET /securities` carries `provenance.profile` and `provenance.classification`,
each a `{ source, retrievedAt }` pair. `useSecurities` already parses and holds
them as `SecuritiesProvenance | null`. Nothing draws them.

`SecurityIdentity` draws the line they are about — sector · industry · exchange —
and **that line mixes both groups**: sector and industry are `classification`
(today `s&p-500-gics + curated ETFs`, checked 2026-09-08), exchange and name are
`profile` (today `alpaca-assets + curated ETFs`, checked 2026-09-08). They share a
date by coincidence of one re-curation, not by construction.

### 5.2 Three decisions, and the third is the one nobody would have taken deliberately

**The note names the group, not the source string.** `FieldGroupProvenance.source`
is a free `string` — deliberately, so a provider can replace `curated` later — so
no `Record<…>` guard can ever give it words, and a renderer printing
`s&p-500-gics + curated ETFs` at a reader is printing an internal slug. What a
reader needs is the group's own claim: _this is not a market observation_. The
slug stays in the response for an operator, which is where a free string belongs
and is the same fence that keeps the provider's eight-member error taxonomy off
the wire.

**It states `classification` and not `profile`.** The story's scope names the
concern exactly: _sector and industry did not come from the market-data provider,
and the UI should not imply that they did._ Nobody mistakes a company's name or
its listing exchange for a market observation; a sector, sitting three centimetres
above a price chart on a market product, is precisely the field that can be read
as one. Stating both would be two claims where one is needed, under a three-item
line, which is §1.3's footnote pile arriving by a different road. **The condition
that earns `profile` a line: the first profile field that is a number** — a market
cap, a share count — because at that point it is a figure and §35 applies to it.

**The words:**

> Sector and industry are curated, not from the market feed. Last checked
> 8 September 2026.

### 5.3 What a stale curated file looks like — and the answer is deliberately "old, not alarming"

This is the column Story 2.3 argued for, and the temptation is to give it a
threshold and a colour.

**It gets neither.** The date is the disclosure. A threshold would be a number
nobody measured, and there is nothing to measure it against: this product has no
stated cadence for re-checking the curated file. An amber mark at ninety days
would be a rule invented at the moment of rendering, and — by the rule in §0 —
colour could not carry it alone anyway.

There is also an ordering argument, and it is the one that actually settles it:
`pnpm universe:check` already exists, compares the curated universe against the
vendor, and changes nothing. **The honest path to a staleness mark is to put that
check on a schedule first**, so that _overdue_ means a run that did not happen
rather than a date somebody eyeballed. A mark without a cadence behind it is the
third kind of claim `CLAUDE.md` warns about — one nothing checks, which quietly
stops being true.

**The date is written in full** (`8 September 2026`, not `2026-09-08` and not
`6 days ago`). A relative age would be computed against the browser's clock,
which this repository fences off for market instants for good reasons; an ISO
date in body text is a machine's spelling.

**Reversal trigger:** **the first time two securities on one screen carry
different classification sources.** `SecuritiesResponse.provenance` already
predicts it and already handles it — the field goes absent and the server writes
a `warn` — and at that point the group's claim is not one claim, the note cannot
make it, and `source` has to become a closed vocabulary with words before it can
be named per row.

#### Amended 2026-09-14 by Task 2.14.4, which built it — three things shipping it settled

The three decisions above are unchanged and the words are the words. What
building the clause decided, and one of them is a defect the wording could not
have caught:

- **The curated date is read as UTC and is deliberately not converted to market
  time.** It is the one date on this note that is not a market instant.
  `UNIVERSE_PROVENANCE` holds `checkedOn` as a plain `YYYY-MM-DD` a person types
  and reviews in a diff; the loader parses it as **UTC midnight** so a run in any
  timezone stores the same instant, and `GET /securities` serves it back through
  `toISOString()`. Put `2026-09-08T00:00:00Z` through `marketDateAt` — exactly
  right for the bars' own retrieval, one clause above — and it lands at 20:00 on
  the **7th** in New York, so the screen reads `7 September 2026` against a file,
  an ADR and four documents that all say the 8th, **and nothing on the page looks
  wrong.** The conversion `formatRetrieval` is right to make is the one this
  clause is right to refuse; the formatter is shared and the way the date is
  reached is not. There is a test named for it.
- **It is a term of its own — `Classification` — rather than a second paragraph
  under `Prices`.** §04 of the canvas drew both under one `SOURCES` label and
  already said they were grouped by subject; Task 2.14.3 then built the note as a
  label/value grid with a term per subject, and a term each is that grouping made
  structural. `Prices` answers _where these numbers came from_ and this answers
  _where the words above the numbers came from_, so a reader scanning the label
  column finds the one they want without reading either. It is drawn on the
  canvas as §10.
- **The date sits under the claim rather than beside it, which is the opposite
  of the prices clause and has a reason rather than being an oversight.** That
  line reads `Unadjusted · Retrieved 8 September 2026` because `Unadjusted` comes
  from `ADJUSTMENT_DESCRIPTIONS`, a closed vocabulary. This group has none — its
  `source` is a free string that may never reach a screen — so there is no word
  to hoist, and a whole sentence beside a date is the run Task 2.14.3 measured
  and removed. A label invented in a renderer to look symmetrical would be the
  second vocabulary this story spends its time preventing. What is consistent
  between the two clauses is the thing that matters: each opens with its claim
  and qualifies it on the line beneath.

**And the open tension about a marker is resolved: there is none, in either
state.** Task 2.14.3 left the question open because `SourceNote` is entirely
typographic and _we do not claim_ looked like the one absence that might earn the
first marker on the surface. It does not — because the absence is smaller than
that phrasing suggests. `provenance` goes absent when the rows stop sharing one
pair, **not when they stop being ours**: whatever slug the server would have
named, the universe is still this project's own file rather than a market
observation, so the sentence is still true and the date is the only thing
withdrawn. The clause therefore keeps its claim and swaps the date for _When they
were last checked is not recorded._ A marker on that would rank a missing date
above a stated one, which is the opposite of what the two mean.

---

## 6. Decision 6 — whether the two empty answers go on the wire

### 6.1 The two answers, and the fact that they imply different next actions

`routes/market-data.ts` distinguishes them in a `debug` log and nowhere else,
deliberately — both are the same 200 body:

- **`held === undefined`** — we hold nothing at all for this `(symbol,
timeframe)`. A statement about **our store's completeness**.
- **a ledger row present, no bars in the window** — we hold history for this
  security, just none here. A statement about **the window**.

They are different to a reader because they imply different next actions. The
first: nothing the user can do helps; changing the window changes nothing. The
second: pick a different window, and the control to do it is on screen.

And today's single sentence is **case two's explanation asserted for both**:

> No bars stored for this window. We asked for … and hold nothing in it. A window
> reaching into the current session is usually this: stored history is caught up
> overnight.

_Usually this_ is a guess that is right most of the time and wrong for a security
we hold nothing for — which is the difference between an answer that is plausible
and one that is correct, and is the thing this product exists not to get wrong.

**So the distinction is worth telling.** The remaining question is where it comes
from.

### 6.2 The decision — it does **not** go on the bars wire, because the universe wire already carries it

`SecuritiesResponse.coverage` is _"one record per security that has any"_, and its
own comment states the property this turns on: **a security with no bars is
absent from this array rather than present with a zero** — _"the honest spelling
of the difference between we hold nothing for this and we hold none of this."_

The Security Explorer already fetches `GET /securities` for the identity block.
So **the client can already tell the two apart, today, with no wire change**: a
symbol absent from `coverage` is case one; present is case two.

What that avoids is the cost the task asks to be explicit about, and it is not
small: a new discriminant on a response shape six modules parse, a seventh member
of a union, a new story, and a sentence that must stay true when Epic 3 stitches a
live tail onto both — which is the hardest part, because once a live tail exists
_we have stored nothing_ stops implying _there is nothing to show_.

**What it costs instead**, stated so it is a decision rather than a saving:

- The empty state now depends on **two** requests rather than one. The rule, and
  it is a rule rather than a preference: **when the universe answer is not
  available, the vacancy says the window sentence.** It never guesses about the
  store from an absence it could not read. The failure of one request must not
  produce a confident sentence about the other.
- `SecuritiesResponse.coverage` is **`1m` only**, by Task 2.8.9's stated choice. A
  security holding minute bars and no daily bars reads as case two at `3M` and
  `1Y` when it is case one. The backfill fills both, so the shape is unlikely;
  recorded because it is the seam a reader of this decision would otherwise find
  by surprise.
- The distinction is a property of the **screen**, not of the response. Anything
  that consumes `GET /market-data/bars` without a universe cannot make it.

**Reversal trigger — put it on the wire when this fires:** **the first consumer
of `GET /market-data/bars` that does not also hold the tracked universe.** Epic
10's agent tools are the named candidate: a tool result is read on its own, with
none of a page's other fetches behind it, and _"nothing held"_ against _"nothing
in this window"_ is exactly the kind of distinction a model must not be left to
infer.

### 6.3 The second sentence, and the check it owes

Case one's rendering, in `ChartVacancy`'s module:

> **No history stored for NVDA yet.**
> We hold no bars for this security at this timeframe. Changing the window will
> not help — the store is filled overnight.

Case two keeps today's sentence verbatim.

> **Amended 2026-09-14 by Task 2.14.2: it is four literals, not two.** The
> volume plot is what this section did not count. There are two plots under one
> axis and each names its own subject — that is the shipped convention, because
> two regions saying _no bars_ under one axis reads as one failure repeated — so
> case one needs `No volume stored for NVDA yet.` as well. The alternative is
> worse in a specific way: a price plot saying _no history for NVDA yet_ above a
> volume plot saying _none for this window_ tells a reader two different stories
> about one empty screen. The consequence is a cost rather than a problem, named
> here so it is not discovered inside the implementation: the invariant covers
> **four** literals and `scripts/breaks.mjs` owes **four** entries.
>
> The two answers are otherwise **identical in weight** — same marker, type, ink,
> position and uncovered ground — and what tells them apart is the _subject of
> the headline_. The difference between them is a fact about our store rather
> than a difference in severity, and a second treatment would rank one above the
> other when both are correct 200s.

**`pnpm invariants` has an entry that this change breaks, and it must be extended
in the same commit.** `one-home-for-the-empty-explanation` anchors on the literal
`"No bars stored for this window."` and asserts exactly one source file contains
it. A second vacancy sentence is a second literal with the same hazard — the
browser suite locates a settled answer by these phrases, `e2e/support/app.ts`'s
`readable()` does not filter `aria-hidden`, and CI's store is 518 securities and
**zero bars**, so every chart there is an `empty` and a duplicate is a
strict-mode failure in every spec. The invariant covers both literals, and
`scripts/breaks.mjs` owes an entry for the new one:
**a check you add owes a break.**
[Task 2.14.6](TASK-06-two-empty-answers-told-apart.md) implements this; it did
not get to decide it.

---

## 7. Carried forward, not closed: the `synthetic` branch has never executed

Recorded with its cause, as the task asks, and **no decision is taken about it**.

`BarSeriesPanel`'s `FeedLabel` has a `synthetic` branch — an amber square and
_"Generated test data. Not a market feed."_ — that **no recorded body has ever
run**. Verified rather than assumed: all sixteen recorded bar-series bodies carry
`feed: "sip"`, and the seventeenth, `unknown-feed.json`, carries a deliberate
`darkpool` for the rejection path.

**It is not honestly fake-able**, and the reason is a pairing rather than an
effort: a synthetic feed implies `provider: "fixture"` too, so a hand-edited body
claiming `alpaca`/`synthetic` is a combination no server produces. Producing it
for real means a store backfilled through the fixture provider
(`PROVIDER.md` §5.4).

The visual risk is low — the same treatment is reviewed in `FeedProvenance`'s
stories, where it _is_ reachable — and the branch in _this_ component has never
run. This is the same class of gap as `untracked` was, and it is carried in
[`docs/GAPS.md`](../../../docs/GAPS.md)'s form rather than as a to-do: a claim
nothing mechanical guards, with what it would take to guard it.

---

## 8. The list Task 2.14.10's sweep is owed, so it has a list rather than a search

### 8.1 The scope prose this document contradicts

[`STORY.md`](STORY.md)'s title, description and first scope bullet were written
against the inverted premise — an **IEX disclaimer**. They are already struck
through in place and amended, which is the correct treatment: they are the record
of what was planned. **Nothing in them needs correcting; they need reading as
historical.** What Task 2.14.10 owes is that the story's `Status`, its _What the
user can see_ section and its acceptance criteria describe what landed.

Two specific readings to check at the close:

- **Acceptance criterion 1** — _"A user looking at any market number can see
  which feed it came from, without hovering"_ — is satisfied by the chrome plus
  §1.3's note, and §1.2 records why it is **not** satisfied by a mark inside the
  plot frame and why that is deliberate. Criterion 1 is met; the argument for the
  reading has to be in the close or a future reader will call it unmet.
- **Acceptance criterion 2** — _"No screen states or implies full US-market
  coverage — checked by reading every string the epic added"_ — is **inverted by
  the measurement and must not be applied as written.** Stored bars _are_ the
  full consolidated tape, so `All US exchanges` is the true statement and
  criterion 2 read literally would ask us to remove it.
  [Task 2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md) reads every
  string for coverage claimed **wrongly in either direction** — implied where we
  lack it, and disclaimed where we have it.

### 8.2 The upward sweep has already happened, which is worth recording as a pass

`CLAUDE.md`'s rule is that a measurement falsifying a governing document is swept
the same day, and that the mechanism which defers it is _"Task N is the
deadline"_. That failure did happen once on this exact claim — for a day,
`ALPACA.md` and ADR 0019 recorded that `PRODUCT_SPEC.md` §7.1 was false while
§7.1 itself, `README.md`, two other ADRs and invariant 6 went on asserting it.

**It was repaired, and the repair holds.** Checked on 2026-09-14 by grepping
every Markdown file in the tree for `IEX`:

| Document                  | State                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` invariant 6   | correct — states the asymmetry and warns Epic 3 not to inherit Epic 2's word                                                           |
| `PRODUCT_SPEC.md` §7.1    | correct — carries the measured table, dated, with _re-measure rather than cite_                                                        |
| `README.md`               | correct in both places                                                                                                                 |
| `UNIVERSE.md` §10, rule 4 | superseded in place by its own §16.6, which states the correction and that the rule **lapses for stored data and survives for Epic 3** |
| `EPIC.md`                 | correct, and names this story as the owner                                                                                             |
| Story 2.3's task files    | historical records of what was believed when written. **Leave them.**                                                                  |

**So the sweep Task 2.14.10 performs is a confirmation rather than a repair**, and
that is the finding: the falsification travelled upward the way the rule intends.
What is left for the close is the ordinary half of criterion 7 — `CLAUDE.md` and
`README.md` reflecting what this story lands, which is the note, the two vacancy
sentences and the coverage sentence.

### 8.3 The ADR this story's own decisions need

Criterion 7's first half is stale and `STORY.md`'s 2026-09-13 amendment already
says so: all six ADRs the scope bullet names exist. What this story owes is **one
ADR for the decisions in this document** — §1's _the note states what the chrome
cannot_, §2's split-naming wording, §3's binding to `partial`, §4's second
vocabulary, §5's group-not-source rule, and §6's refusal to put the distinction on
the wire with the condition that reverses it.

---

## 9. Where every string this story adds lives

The task's own done-when: **every wording decision names the module the words will
live in, and none of them is a string in a component.** The rule that produced
this table, stated so it can be applied to the next one: **a vocabulary that
describes a domain value lives in `packages/shared` beside that value; a sentence
that assembles several of them for one screen lives beside the component that
draws it; neither is ever a literal inside JSX.**

| What                                 | Module                                                                  | Guard                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| feed labels and sentences            | `packages/shared/src/market-provenance.ts` — `MARKET_FEED_DESCRIPTIONS` | `Record<MarketFeed, …>`: a feed with no words is a compile error                     |
| the stitched-series description (§2) | same file, a function beside that record                                | returns a structure, not a string, so the note and the text alternative cannot drift |
| adjustment labels and sentences (§4) | same file — `ADJUSTMENT_DESCRIPTIONS`                                   | `Record<Adjustment, …>`, the same guarantee                                          |
| the field-group claim (§5)           | the note's own module, beside the component                             | the group is named; `FieldGroupProvenance.source` never reaches a screen             |
| the source note's assembly (§1)      | `apps/frontend/src/components/SourceNote/source-note.ts`                | a pure function over the two views, unit-testable with no DOM                        |
| the coverage sentence (§3)           | `apps/frontend/src/components/BarSeriesPanel/series-facts.ts`           | one function, read by the visible rendering **and** `series-announcement.ts`         |
| the two vacancy sentences (§6)       | `apps/frontend/src/components/PriceChart/ChartVacancy.tsx`              | `pnpm invariants`, extended to both literals, with a `pnpm break` entry each         |

---

## 10. What the user can see when this task lands

**Nothing.** No new label, no new sentence, no new state. Every decision above is
a document until
[2.14.3](TASK-03-where-these-numbers-came-from-on-screen.md) puts the series'
own provenance on screen,
[2.14.4](TASK-04-the-curated-files-age-and-what-alpaca-did-not-tell-us.md) puts
the curated file's age on it, and
[2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md) puts _through
when_ on it — with
[2.14.2](TASK-02-the-provenance-surface-on-the-canvas.md) drawing all of it at
once first, because five correct additions made one at a time is how a footnote
pile is built.

**What a user still cannot do:** watch a price move. There is no live data, and
the two-feed sentence §2 settles has no producer until there is.

---

## 11. The coverage-honesty pass — 2026-09-15, by Task 2.14.5

Acceptance criterion 2 says _checked by reading every string, not by intent_, so
this is a list of what was read rather than a claim that it was. The document
half of the sweep was already done (§8.2) and is not repeated; this is the
**user-facing string** half, which is a different corpus and had never been
read.

### 11.1 How criterion 2 has to be read, because as written it inverts

The criterion reads _"No screen states or implies full US-market coverage"_. Read
literally, and against the measurement of 2026-09-07, **it asks us to delete a
true label**: stored bars are the consolidated SIP tape, `All US exchanges` is an
exact statement of what is in them, and removing it would be a false disclaimer
rather than an honest hedge.

**It is applied here as _coverage claimed wrongly in either direction_**, and
every string below is judged against both:

- **(a) implying coverage the plan does not have** — the historical failure, and
  the one §7.1 was written for;
- **(b) disclaiming coverage the plan does have** — the failure added
  2026-09-07, and the one a well-meaning reviewer is far more likely to
  introduce.

The next reader should apply it that way rather than as written, which is why
this paragraph is here rather than in a commit message.

### 11.2 How the corpus was enumerated

Mechanically rather than from memory: every non-test, non-story `.ts`/`.tsx`
under `apps/frontend/src`, with comments stripped, reduced to its string
literals, template literals and JSX text nodes; plus `apps/backend/src`'s
refusal messages, `README.md`'s description of what the product shows, and the
one page title. **Every phrase containing the word _market_ was then read
individually**, because that is the word that does the implying and it is in the
product's name.

### 11.3 What was read, and what was decided

| Surface                                                                                                                                                                         | Judgement                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MARKET_FEED_DESCRIPTIONS` — `All US exchanges`, `IEX` + its sentence, `Simulated` + its sentence                                                                               | **Correct in both directions, and now guarded.** The label is exact for SIP; the IEX sentence disclaims the single venue without disclaiming the tape. Made mechanical — see §11.4.                                                                                                                                                    |
| `ADJUSTMENT_DESCRIPTIONS` — `Unadjusted`, `Prices as they printed. Not restated for stock splits.`, `Split-adjusted`                                                            | **Left.** A claim about arithmetic, not about venues. Neither direction applies.                                                                                                                                                                                                                                                       |
| `SourceNote` — `Source` / `Sources`, `N bars`, `Prices`, `Retrieved …`, `Classification`                                                                                        | **Left.** The ledger's counts are what stop a stitched series reading as single-venue, which is (a) answered structurally rather than in words.                                                                                                                                                                                        |
| The classification claim — `Sector and industry are curated, not from the market feed.`, `Last checked 8 September 2026`, `When they were last checked is not recorded.`        | **Read hardest in direction (b), and left.** It is a disclaimer, and the question is whether it disclaims coverage we have. It does not: sector and industry genuinely are ours and genuinely are not from the feed.                                                                                                                   |
| `chart-alternative.ts` — `Market feed: All US exchanges.` and `Stitched: 60 bars from All US exchanges and 90 from IEX.`                                                        | **Left, and it is the one a pass would skip**: spoken only, and a sentence about coverage. It names the split **with counts**, so a listener can tell a 782-bar chart with two IEX bars from one that is half and half.                                                                                                                |
| `VolumeReading` — `No shares changed hands anywhere in the window.`                                                                                                             | **Read, left, and given a trigger.** The one shipped sentence claiming something about **the market** rather than about our store. True while every bar is the consolidated tape; a single venue's silence the moment Epic 3 stitches an IEX tail. In `docs/GAPS.md` with that trigger.                                                |
| `ChartVacancy` — `No bars stored for this window.`, `No volume stored for this window.`, and the two sentences under them                                                       | **Left.** They say what **is stored**, never what the market did — which is the same distinction the row above gets wrong by one word, and worth noting as the pair.                                                                                                                                                                   |
| The rail — `Still showing …`, `Refreshing — …`, and **the sentence this task adds**                                                                                             | **New, and judged.** `Holding 1,560 bars, through 2026-09-11 16:00:00 EDT, of a window running to 2026-09-14 16:00:00 EDT.` claims coverage of **the window**, states the shortfall, and disclaims nothing we hold. Neither direction fires.                                                                                           |
| `SecuritySearch` — `Search covers the 518 securities MarketPulse holds, by symbol and by company name.`                                                                         | **Left, and it is the best string in the product for this criterion**: it answers (a) with a number rather than a hedge.                                                                                                                                                                                                               |
| `UniverseTable` — `securities tracked`, `Market history is stored for all of them.`, `Market proxies`, `Whole-market ETFs, which belong to no sector`                           | **Left.** _all of them_ has _the tracked universe_ as its stated subject one clause earlier; _whole-market_ describes what a market-proxy ETF **is**, not what we cover.                                                                                                                                                               |
| `SecurityIdentity` — `MarketPulse does not track this security…`, `Untracked`, `Market proxy`                                                                                   | **Left.** Disclaims our universe, which is the honest half of (a).                                                                                                                                                                                                                                                                     |
| `AppHeader` — `MarketPulse`, `Market situational awareness`, `Market feed`, `Market clock`                                                                                      | **Left.** _Market_ names the domain in all four. None is a statement about venues.                                                                                                                                                                                                                                                     |
| `FeedProvenance` — `No market-data provider is configured.`, `The market feed could not be read.`, `not configured`                                                             | **Left.** States an absence and claims no feed at all — which is the condition the source note's own suppression rule keys on.                                                                                                                                                                                                         |
| `MarketClock` — `Market time, US Eastern`, `ET`, `Opens at …`, `Closes early at …`                                                                                              | **Left.** The calendar, not coverage.                                                                                                                                                                                                                                                                                                  |
| `SecurityExplorer` — the region headings and their sentences, `The securities MarketPulse follows…`                                                                             | **Left.** The universe is named as ours in the one place it could be mistaken for the market.                                                                                                                                                                                                                                          |
| `MarketOverview` — Story 1.4's render check: `Displaying data through 10:42:17`, `Last update 10:41:58 — slower than expected`, `Peer comparison failed`, and its invented rows | **Read, judged out of criterion 2's scope, flagged.** They imply a live feed rather than market coverage, and the page's own prose calls itself a render check. It is nonetheless the weakest provenance surface in the product — invented figures with no marker, under a masthead reading `NOT CONFIGURED` — and Epic 4 replaces it. |
| `routes/market-data.ts` — `NVDA is not a security this system tracks. The tracked universe is listed at /securities.`, and the cap and calendar refusals                        | **Left.** _this system tracks_ is the disclaimer, in the server's own words, which the client renders verbatim.                                                                                                                                                                                                                        |
| `README.md` — `AI-assisted situational awareness for US equities.`                                                                                                              | **Left.** Names an asset class, not a coverage fraction, and `PRODUCT_SPEC.md` §6 scopes the universe two paragraphs later.                                                                                                                                                                                                            |
| `index.html` — `<title>MarketPulse</title>`                                                                                                                                     | **Left.** The one page title, and it makes no claim.                                                                                                                                                                                                                                                                                   |

**Nothing was changed by the pass.** That is the honest outcome and it is stated
as one rather than dressed up: the vocabulary was decided in one module in Story
2.6 and every surface since has read it rather than writing its own, which is
what a pass over three stories' worth of strings is supposed to find. What the
pass produced is two guards and two recorded triggers.

### 11.4 What became mechanical

Two of the claims above are of the form _no shipped string says X_, so
`CLAUDE.md`'s rule applies and they are `pnpm invariants` steps rather than
prose. Each owes a break, and each was run red:

- **`one-home-for-the-feed-words`** — `All US exchanges` and the IEX sentence are
  written in `market-provenance.ts` and nowhere else in `apps/frontend/src`,
  `apps/backend/src` or `packages/shared/src`. Break: `feed-words-in-a-renderer`,
  a fallback label in `FeedIndicator` for the deployment with no provider
  configured — which reads as defensive and is a coverage claim no vocabulary
  decided.
- **`one-home-for-the-coverage-phrase`** — the sentence this task adds is written
  in `series-facts.ts` and nowhere else, so the drawn copy and the spoken copy
  cannot diverge. Break: `coverage-sentence-twice`, the sentence re-inlined in
  `series-announcement.ts` where it was assembled until this task.

**Both checks read their sources with comments stripped**, and that was forced
rather than chosen: the first version of the coverage check went red on
`chart-alternative.ts`'s doc comment, which quotes the sentence in prose to
explain why its own clause says something different. A check a correct comment
can trip is a check nobody can keep green. The stripper removes block comments
and whole-line `//` comments and never truncates a line of code, which is the
safe direction — the worst it can do is report a match a reader then reads.

### 11.5 What the pass could not make mechanical

Three claims, in `docs/GAPS.md` with a `Re-measure:` naming a file that exists:
the rail's reservation against the coverage sentence at four widths; that the
sentence and the coverage edge never disagree about where the data stops; and
the `No shares changed hands anywhere` trigger above.
