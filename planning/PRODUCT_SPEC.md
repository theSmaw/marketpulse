# MarketPulse — Product Specification

**Version:** 0.1
**Status:** Proposed
**Product type:** AI-assisted financial-market situational awareness and investigation platform
**Initial market:** US equities
**Primary objective:** Portfolio project demonstrating Staff-level frontend architecture, high-performance visualization, real-time data handling, agentic AI, generative UI, and human-in-the-loop interaction.

---

# 1. Product vision

MarketPulse helps a market analyst answer three questions:

> **What is happening?**
> **What is unusual?**
> **What evidence might explain it?**

The system continuously observes market activity, detects statistically unusual behaviour, and allows a user or AI agent to investigate those events.

MarketPulse is not intended to predict prices or recommend trades.

Its purpose is to turn a large, fast-moving collection of prices, volumes, relationships, filings, and other events into an interactive evidence-based workspace.

The defining product characteristic is that the AI does not merely respond in a chat window.

It can:

- investigate anomalies;
- invoke deterministic analytical tools;
- alter the visual workspace;
- create comparisons;
- focus visualizations;
- surface primary-source evidence;
- maintain a long-running investigation;
- expose uncertainty;
- allow the human to redirect, approve, reject, or inspect its reasoning.

---

# 2. Product thesis

Traditional market dashboards make the user decide:

1. what securities to inspect;
2. which charts to open;
3. which time periods to compare;
4. which relationships might matter;
5. which external events to investigate.

Conversational AI systems solve a different problem: they answer questions, but generally remove the user from the underlying evidence.

MarketPulse combines the two.

The AI behaves as an **investigative interface to a deterministic analytical system**.

The model determines:

> "What should I investigate?"

Code determines:

> "What are the numbers?"

The UI determines:

> "How should the evidence be presented?"

The human determines:

> "Do I believe this explanation, and what should we investigate next?"

---

# 3. Target user

## Primary persona

**Market analyst / research analyst**

The initial persona:

- follows US equity markets;
- understands concepts such as price moves, volume, sectors, correlations and filings;
- regularly asks why something moved;
- needs to distinguish meaningful events from market noise;
- wants access to source evidence;
- works primarily on desktop with substantial screen real estate.

The product does not assume quantitative-finance expertise.

---

# 4. Core jobs to be done

### Job 1 — Understand the market

> "Tell me where unusual activity is happening right now."

### Job 2 — Investigate an event

> "NVDA just dropped sharply. Help me understand what's happening."

### Job 3 — Compare explanations

> "Is this stock-specific, sector-wide, or part of a broader market move?"

### Job 4 — Inspect evidence

> "Show me the data underlying that conclusion."

### Job 5 — Reconstruct an event

> "Take me back to 11:07 AM and show me what was knowable at that moment."

The fifth workflow will eventually become MarketPulse's signature feature.

---

# 5. Product principles

## 5.1 AI proposes; deterministic systems calculate

The LLM must not perform authoritative numerical calculations itself.

If the user asks:

> "Was this move unusually large?"

the AI calls an analytical tool.

For example:

`calculate_return_percentile(NVDA, 5m, 60 trading days)`

The analytics service might respond:

`98.4th percentile`

The AI can explain the result but cannot invent it.

> **Amended 2026-10-14 by Task 5.3.3, on the precision rather than on the
> point.** This example's subject is _who calculates_, and that is unchanged.
> The **value** is not what ships: §11's amendment of the same date records why
> a printed percentile is an **integer** — the binomial standard error at the
> 99th of n = 4,620 is 0.146 points — so the shipped figure is `98th
percentile`, and `100th` is never printed at all.

---

## 5.2 Evidence before explanation

An AI explanation should be linked to observable evidence.

Possible evidence includes:

- market prices;
- volume;
- correlations;
- sector behaviour;
- market breadth;
- SEC filings;
- timestamps;
- macroeconomic observations.

The interface should make it easier to inspect the evidence than to trust the prose.

---

## 5.3 Uncertainty should be visible

Market movements often have no objectively knowable cause.

MarketPulse must distinguish between:

**Confirmed**

There is direct primary-source evidence.

**Supported**

Multiple observations support an explanation, but causality is not established.

**Possible**

An explanation is plausible but evidence is weak.

**Unknown**

There is insufficient evidence.

The system should be comfortable saying:

> "I don't currently have enough evidence to explain this move."

That is a successful outcome.

---

## 5.4 AI manipulates application state, not HTML

The LLM must never generate executable frontend code or arbitrary UI markup.

Instead it produces typed workspace commands.

Examples:

- `focusSymbols`
- `setTimeWindow`
- `openPriceChart`
- `compareSymbols`
- `highlightGraphCluster`
- `showVolumeProfile`
- `pinEvidence`
- `annotateTimeline`
- `openFiling`
- `setGraphEncoding`

Commands are schema validated before being executed.

This creates a safe, deterministic boundary between generative AI and the application.

---

## 5.5 The application must work without AI

All underlying market exploration and analytical functions should remain usable directly by the user.

AI accelerates investigation rather than becoming a dependency for basic product functionality.

---

## 5.6 The interface must be exceptional, not merely correct

MarketPulse is a product people are meant to be shown.

§38 is built around a five-minute demonstration and §40's success criterion is a first-time viewer understanding the product in about a minute. Both fail if the interface looks generic, however good the engineering behind it is.

So visual quality is a **product requirement**, not polish:

- It must look like a real, funded product rather than a scaffold with data in it.
- It must look designed rather than defaulted. No framework's or component library's out-of-the-box appearance should survive contact with a decision.
- It must feel **alive**. This is a market application; a screen that updates by silently swapping text is technically correct and feels dead.
- It must never read as old-fashioned or basic.

This is not in tension with the dense, sober, analyst-facing character described in §3. The best products of that kind are compelling precisely because of how well they are made. **Restraint is not the same as plain.**

The consequence for delivery: the story that builds a screen owns how that screen looks, and correct-and-accessible is the floor rather than the goal. Polish deferred to a later phase is polish that does not happen.

---

# 6. Initial market universe

V1 will cover approximately:

**100–500 liquid US-listed equities**

plus a small number of useful ETFs such as:

- SPY
- QQQ
- DIA
- IWM
- major sector ETFs

We should begin development with roughly 100 securities.

**Amended 2026-09-15, after Epic 2.** That instruction was honoured and is now
discharged: Story 2.3 shipped **101** securities, and Story 2.8 re-took the
sizing at **518** once Story 2.7's WebSocket spike had measured that Alpaca's
"limited to 30 symbols" applies to trades and quotes and **not to minute-bar
channels** — 1,500 symbols were accepted in 305 ms. The number above stays as
the instruction the work started from; **the universe is 518 — the S&P 500 as
published (503 equities) plus eleven sector SPDRs and four market proxies.**
That is three equities past this section's own `100–500` band, and the band is
not amended: the overshoot is the index's published membership rather than a
choice, and re-deciding it would mean dropping three constituents by hand. The
reasoning, and the sector floors and ceilings the list is built to, are in
[`UNIVERSE.md`](epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)
§10. Anything sizing work against "roughly 100" — a per-row surface, a breadth
denominator, a payload — should size against the real figure and re-read it
rather than cite this line.

> **Amended again 2026-10-12 by Task 2.3.9 — the universe is 516, and 501 of
> them are equities.** `pnpm universe:check` was run over the whole list
> against the vendor for the first time since the file was curated and found
> that **`PSKY` and `WBD` are unknown to the vendor entirely**; the owner's
> decision was to stop tracking both. They were deleted from
> `apps/backend/src/universe.ts`, which is how `untracked` is expressed — the
> rows and their bars are kept, per `UNIVERSE.md` §12.1 — so the universe is
> **516 securities: 501 equities, eleven sector SPDRs and four market
> proxies**. The band in this section's own instruction is now met rather than
> overshot by three. `KHC`'s listing venue was corrected to `NYSE` in the same
> change.
>
> **Two stores now disagree, and both are right.** A store built into an empty
> database — which is how CI builds one, and what `pnpm store:bare`
> reproduces — never inserts the two symbols at all and holds **516 rows, all
> active**. The deployed store already held them, so it holds **518 rows of
> which 516 are `active`**. Every figure in the dated amendments below is a
> record of what was measured on its own date and is left standing; this is
> the live one.

The architecture should support expansion without requiring a redesign.

The smaller live universe keeps data costs, browser load and historical processing manageable while we establish the core architecture.

A separate synthetic load-testing mode can simulate thousands of securities and millions of observations.

---

# 7. Data sources

## 7.1 Market data — Alpaca

Initial provider: **Alpaca Market Data API**.

Alpaca provides HTTP historical-market-data APIs as well as WebSocket streams for equities and other instruments.

**The free plan is asymmetric, and that was measured rather than read off a pricing page** (2026-09-07 — the record is `planning/epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md`, and a vendor's plan is a dated observation, so re-measure rather than cite this table):

|                     | Feed                                    | Caveat                                                           |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| **Historical bars** | **SIP** — the full US consolidated tape | Not the most recent ~15 minutes, which the plan refuses outright |
| **Live stream**     | **IEX only**                            | A SIP stream is refused, `409 insufficient subscription`         |

**The live half of that table was re-taken first-hand on 2026-09-15** (Task 3.1.2, `LIVE-DATA.md` §4.5), and the refusal is real but is **not shaped like an HTTP refusal**: the socket to `/v2/sip` **opens**, the server greets the client exactly as the working endpoint does, and the `409` arrives at **authentication, as a frame**, after which the server leaves the socket open. A client whose connected state keys off the socket being open would report a healthy SIP connection indefinitely. Connection state is driven by the **authenticated** frame, never by `onopen`.

MarketPulse must therefore display provenance explicitly, and **per series rather than once for the product**: there is no single true answer to "which feed is this?", and a chart stitched from stored bars and a live stream carries two.

The requirement is that a reader is not misled about coverage — which is a stronger thing than printing an acronym, and is not satisfied by printing one:

> **Market feed: All US exchanges**

for the consolidated tape, and for the live stream a label that says what a single venue is, because **we must not imply that IEX represents every US exchange** and three letters teach a non-specialist nothing:

> **Market feed: IEX** — trades reported by the IEX exchange only, not the full US consolidated tape.

The shipped vocabulary and the rule for when a label needs a sentence beside it live in `packages/shared/src/market-provenance.ts`.

Initial data:

- trades;
- minute bars;
- latest prices;
- volume;
- historical bars.

The backend should isolate Alpaca behind a market-data provider interface so another provider can be introduced later.

---

## 7.2 Corporate events — SEC EDGAR

The SEC's `data.sec.gov` APIs expose company submission histories and XBRL financial data without API authentication. Submission data is updated throughout the day as filings are disseminated.

Initial filing types:

- 8-K;
- 10-Q;
- 10-K;
- selected 6-K filings where relevant.

V1 should focus mainly on detecting that a filing occurred and allowing the user to inspect it.

Later versions can extract specific facts and material events.

EDGAR is particularly valuable because it gives MarketPulse **primary-source evidence**.

---

## 7.3 Macro data — FRED

FRED provides extensive economic time-series data through its API.

This is **V1.1 rather than initial MVP scope**.

Useful later data includes:

- Treasury rates;
- Federal Funds Rate;
- inflation;
- unemployment;
- credit spreads;
- economic releases.

The FRED API requires an API key.

---

# 8. Main information architecture

MarketPulse contains four primary experiences.

## 8.1 Market Overview

Answers:

> "What is happening?"

Contains:

- major index / ETF summary;
- unusual activity feed;
- market topology visualization;
- market breadth;
- sector/industry performance;
- current investigations.

This is the application's landing screen.

> **Amended 2026-10-09 by Story 4.6 — this screen is now a place you LEAVE
> from, which is what makes the question above answerable.**
>
> _"What is happening?"_ was shipped as six regions that could only be read.
> Since 2026-10-09 the landing screen holds **twenty-four destinations**: the
> four index proxies' tickers, and every ranked sector and mover row, each
> opening its security page by pointer and by keyboard. A sector row opens its
> **benchmark ETF**, which is the only row on the screen whose destination is
> not the thing the row is named after.
>
> Three properties of that are decisions rather than implementation, and they
> are argued in
> [ADR 0039](../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md) and in
> Story 4.6's task files:
>
> - **The figure is never the link.** Only the ticker token is activatable —
>   the price and the change are not, because a reader dragging to select a
>   number must not navigate.
> - **The destination is resolved at render from the row's own identity**, so
>   on a screen where every row re-orders under a live feed, no frame can land
>   between the key press and the resolution. The activation race is
>   unrepresentable rather than managed.
> - **A row with nothing behind it is not a link at all** — the eleven reserved
>   sectors before the first aggregate, and the held pads that keep the Movers
>   region at one height, carry no `<a>` rather than an inert one.
>
> What a gated machine has never done is **click a mover**: CI's store has
> 518 securities and zero bars, so the frame carries `eligible: 0` and both
> mover lists are empty for ever. The last clause of the epic's own journey
> criterion — _read a figure on the destination_ — is unreachable on any gate
> and is owed to a person on the deployed site, mid-session. Story 4.9 owns it.
>
> **§9's breadth sketch needed nothing from this story and was checked rather
> than assumed**: nothing Story 4.6 shipped touches a denominator or a
> percentage, and §9's own dated amendment from Story 4.4 still stands as
> written.

---

## 8.2 Investigation Workspace

Answers:

> "Why might this be happening?"

Contains:

- AI investigation stream;
- evidence panel;
- dynamically generated charts;
- event timeline;
- security comparisons;
- market graph;
- filing evidence;
- investigation history.

This is the core product.

---

## 8.3 Security Explorer

Answers:

> "What is happening with this security?"

Contains:

- price chart;
- volume;
- abnormal-move indicators;
- relative performance;
- connected securities;
- relevant filings;
- historical anomaly history.

---

## 8.4 Market Replay

Answers:

> "What was knowable at this moment?"

Allows the user to select a historical trading session and replay market events through time.

All product data becomes constrained by the replay clock.

---

# 9. Market Overview

The desktop layout should approximately consist of:

```text
┌───────────────────────────────────────────────────────────────┐
│ MarketPulse                 LIVE       10:42:16 ET           │
├──────────────────────────────────────┬────────────────────────┤
│                                      │ Unusual Activity       │
│                                      │                        │
│          MARKET TOPOLOGY             │ NVDA   91              │
│                                      │ AMD    84              │
│                                      │ TSLA   79              │
│                                      │                        │
│                                      │ [Investigate]          │
├──────────────────────────────────────┼────────────────────────┤
│ Market Breadth                       │ Investigations         │
│                                      │                        │
│ Advancing       42%                  │ ● Semiconductors       │
│ Declining       56%                  │ ◌ Tesla movement       │
│ Unchanged        2%                  │                        │
└──────────────────────────────────────┴────────────────────────┘
```

The visualization should be the product's visual centre of gravity.

> **Amended 2026-10-07 by Story 4.4 — the breadth sketch above draws three
> percentages and no denominator, and the shipped region draws neither.**
>
> **Percentages were refused because the sketch's own arithmetic cannot be made
> honest.** Three independently-rounded percentages sum to 99 or 101 — at a
> measured N of 466 with an even split, `33.3 + 33.3 + 33.5 = 100.1` — and the
> sketch's `42 / 56 / 2` sums to 100 only because it was drawn without the
> rounding in mind. **Counts make the story's own acceptance criterion** — _the
> three figures never sum to something a reader can see is wrong at any
> rounding_ — **true by construction**, with nothing to round.
>
> **And the sketch has no denominator, which is the thing `EPIC.md` was mostly
> written about.** `Advancing 42%` of _what_ is the question the live feed makes
> unavoidable: IEX observes about two-thirds of the universe in a given minute,
> so a percentage with no stated population is a claim the data does not
> support. The shipped region states it — **_Of the 503 companies we track, 451
> were heard from in the last 5 minutes_** — and draws the remainder as a row of
> its own, below a rule, rather than leaving it to arithmetic the reader must do.
>
> **The set is the 503 equities, not all 518 tracked securities.** A count that
> included `SPY` and the eleven sector SPDRs alongside their own constituents
> would make this region and `Market proxies` non-independent.
>
> **What survives the sketch unchanged**: the three buckets and their names —
> `Advancing`, `Declining`, `Unchanged` — and the region's position. What is
> added is the fourth figure the sketch has no row for, and the sentence.

> **Amended 2026-10-08 by Story 4.5 — the sketch has no movers region at all,
> and §8.1 does not list one either.**
>
> **This is an addition rather than a correction.** The sketch above draws four
> regions and `Movers` is not among them — the slot where it would sit is
> `Unusual Activity`, which is Epic 5's. §8.1's _Contains_ list names six
> things and gainers and losers are not among those either. The only place the
> capability appears in the planning record is `EPIC.md`'s scope line, **Top
> gainers / losers**, so the shipped region implements an epic's scope item
> that this section never drew.
>
> **What shipped**: two ranked lists in one region — `GAINERS` and `LOSERS`,
> **five rows each** — over the **503 equities**, the same set and the same
> single eligibility pass `Market breadth` counts. Each row carries its rank,
> its ticker, its company name, its price and its change. **Each list holds
> only rows whose direction matches it**, so a one-sided market draws one full
> list and one short or empty one rather than five gains under a heading
> saying `LOSERS`.
>
> **The ranking is computed server-side and the frame ships the answer, not its
> input** — a top-N in a browser means shipping 503 figures to every tab
> (measured: the section is **1,243 bytes**, 124.3 a row, against a
> 60,636-byte flood). ADR 0038 carries that rule and its dated amendment.
>
> **And the region states its own denominator**, for the reason this epic was
> mostly written about: a top ten computed over the ~466 names heard from may
> show ten securities that are **not** the ten biggest movers, and **a ranked
> list looks exactly as confident whether its input was complete or not**. It
> reads _"Of the 503 companies we track, 466 were heard from in the last 5
> minutes. Both lists are ranked over those."_, in two grammars keyed on the
> basis the wire sent, from the same builder breadth's footer uses.
>
> **What a reader still cannot do is click a mover through to its security
> page.** That is Story 4.6, deliberately next: a list of names nobody can open
> is a list that invites the wrong repair.

> **Amended 2026-09-25 by Story 4.1 — what was built, and the three ways it
> differs from this sketch.** The screen at `/` now draws **seven** named
> regions: `Market proxies`, `Market topology`, `Sector performance`, `Movers`,
> `Unusual activity`, `Market breadth` and `Current investigations`. All seven
> are in place; the ones with no data yet say so in the product's own words
> rather than showing a spinner that never resolves (ADR 0029's defer rule).
>
> **The first name was `Market summary` until 2026-09-26**, when Task 4.2.5 put
> figures in it and renamed it. `Market proxies` is already this product's word
> for exactly these four — the `/securities` group heading, and `Market proxy`
> on the security page's classification line — and on a screen where three
> later regions summarise all 518, `Market summary` promised the broadest view
> and delivered the narrowest.
>
> **1. Two regions this sketch does not draw are in Epic 4's scope and are
> built**: `Market proxies` (the index proxies) and `Sector performance`, both
> from §8.1. A reader working only from this picture would miss them.
>
> **2. `LIVE` and `10:42:16 ET` are in the masthead, and they are the
> APPLICATION's, not this route's.** Both shipped in Epic 2 and gained the
> connection word in Epic 3. A reader building from this sketch reaches for a
> clock in the route, and `pnpm invariants` now refuses one by name —
> `one-caller-of-the-market-clock`. The connection has one home and the landing
> route is not it.
>
> **3. The topology is not yet the centre of gravity, deliberately.** It is a
> reserved band under an explicitly **interim** layout, and the end state —
> this sketch's proportions — is drawn on the design canvas and reverts to it
> on a condition: the first commit that renders a graph node. Epic 6 has been
> told, in its own `EPIC.md`.

---

# 10. Market topology visualization

Rather than geographic coordinates, MarketPulse visualizes **relationships between securities**.

Each security is represented as a node.

## Node properties

Possible visual encodings:

**Size**

Market capitalization or liquidity proxy.

**Intensity**

Current price movement.

**Shape/icon**

Security type.

**Border**

Anomaly strength.

**Cluster**

Industry/sector.

## Edge properties

Edges represent meaningful relationships.

Initial relationships:

- common industry;
- strong historical return correlation;
- ETF/index relationship.

Later:

- supply chain;
- ownership;
- fundamental similarity.

To avoid an unreadable graph, the system should retain only the strongest N relationships per node.

---

# 11. Unusual activity detection

Anomaly detection is deterministic.

The initial model should deliberately be interpretable rather than sophisticated.

For each tracked security calculate:

## Price anomaly

Compare current 5-minute return to historical 5-minute returns for that security.

Calculate percentile or normalized score.

Example:

> Current 5-minute return: -2.1%
> Historical percentile: 99.1%

---

## Volume anomaly

Compare current interval volume against the historical median volume for the same approximate time of day.

Example:

> Current volume: 4.1× typical

---

## Relative move

Compare the security against:

- broad market;
- relevant industry/sector proxy.

Example:

> NVDA: -4.2%
> Semiconductor group: -2.0%
> SPY: -0.6%

---

## Breadth

Determine whether related securities are moving in the same direction.

Example:

> 82% of semiconductor securities currently negative.

---

## Composite anomaly score

Normalize the preceding factors into an explainable score:

`0–100`

The score should not represent risk or investment opportunity.

It represents:

> **"How unusual is current observed behaviour?"**

Every score should have an explanation.

For example:

> **Anomaly 91**
>
> Extreme 5-minute price move
> Volume 3.8× normal
> Move substantially exceeds related securities

> **Amended 2026-10-13 by Story 5.1 — four readings this section leaves
> ambiguous, taken at the epic's first gate rather than in the story that
> builds each factor.** Nothing above is rewritten; each clause below says
> which sentence it reads and how.
>
> **1. The price percentile is a percentile of `|return|`, and the prose above
> is signed.** _"Compare current 5-minute return to historical 5-minute
> returns"_ reads as a signed comparison, but **this section's own example is
> arithmetically consistent only with a magnitude percentile**: a `-2.1%`
> return sits near the _first_ percentile of a signed distribution, not the
> **99.1st**. The signed reading is refused on a stronger ground than
> consistency. A one-tailed signed percentile scores a crash ≈ 1 and a rally
> ≈ 99, which is a **directional judgement inside a number this section says
> in terms must not represent risk or investment opportunity**. So the figure
> answers _how far from normal_, and **direction lives in the explanation** —
> where `Extreme 5-minute price move` above already puts it.
>
> **2. The distribution is POOLED across the session, not bucketed by time of
> day — and the cost is stated here rather than discovered later.** The
> _Volume anomaly_ clause above says _"the same approximate time of day"_, and
> reading that across onto the price factor gives **60 samples** over a 60-day
> window: the finest percentile a 60-sample distribution can express is
> **1.7%**, so this section's own `99.1%` could not be said at all and the
> 99th percentile _would be_ the maximum. Pooling the session gives ~~**4,680**~~ **4,620
> samples** per security and 0.02% granularity.
>
> **The known cost: the open is structurally the fattest-tailed bucket.** Pooled
> against the whole session, a market open reads as more unusual than it is —
> the first minutes carry the overnight gap, the auction imbalance and the
> widest spreads of the day, and a pooled percentile has no way to know which
> bucket a sample came from. **So the explanation must say so**, which is this
> section's own requirement (_every score should have an explanation_) rather
> than a new one. The reversal trigger is a condition: **the first time the open
> is over-represented in a ranked list often enough for a reader to notice**,
> at which point the repair is a per-bucket distribution with a sample count
> large enough to express the percentile it prints — which means more than 60
> days of history, not a different arithmetic.
>
> **3. Breadth is a stated CLAUSE in the explanation, not a weighted factor in
> the score.** _"Normalize the preceding factors"_ reads over all four
> preceding clauses; the shipped score is **three** scored factors — price
> percentile, volume ratio, relative move — with breadth stated beside them.
> The reason is structural rather than a preference: **breadth is a property of
> a group, so it is identical for every member of that group.** It cannot order
> securities within a sector, and weighting it correlates the whole group's
> scores — so a ranked list fills with one industry on a day that industry
> moved together, which is close to the opposite of _unusual for this
> security_. Breadth keeps its place as this section draws it, in the words of
> the example: **`82% of semiconductor securities currently negative`** is
> context that makes a score interpretable, and that is what it ships as.
>
> This is the same refusal §9 carries from Story 4.4 — a figure that reads as
> confident over a population it cannot discriminate — reached from the other
> end.
>
> **4. The score is ABSOLUTELY calibrated against each security's own
> history**, never a cross-sectional rank against today's universe. `0–100` is
> silent about which, and the cross-sectional reading is the cheaper one to
> build. It is refused because **a cross-sectional rank guarantees a 91 exists
> every day, including a dead one** — a confident claim of extreme
> unusualness over nothing, which is [ADR
> 0029](../docs/adr/0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md)'s
> false impression landing in the one number this section is about — and
> because it makes the figure **incomparable between days**: 91 would mean
> _busiest of the 503 we track_ rather than _far outside this security's own
> history_, so today's 91 and yesterday's 91 would describe different amounts
> of unusualness.
>
> **The honest cost is this section's own example.** `Anomaly 91` is **not
> producible on demand** under absolute calibration — on a quiet day the
> highest score in the universe may be 40, and that is the correct answer.
> Epic 5's exit criterion is rewritten as a **shape** rather than a number for
> this reason.

> **Amended 2026-10-14 by Task 5.3.3 — the printed percentile is an INTEGER,
> and `99.1%` above is a precision the sample cannot resolve.** The example
> stands as the specification's illustration of the _idea_; what ships beside
> the figure is `99th percentile`, and two things changed it. **The precision**:
> the binomial standard error at the 99th percentile of n = 4,620 is **0.146
> points**, so the first decimal of a `99.1` is below the resolving power of
> the largest sample this universe produces — and the measured range of `n` is
> **737 to 4,620**, which makes the first decimal worse than meaningless on
> most securities. **The ceiling**: `100th` is never printed, because above the
> highest order statistic there is **no sample** — a `100th` would assert a
> strict maximum over a distribution that deliberately excludes the window
> being scored (AC 4), which no reader can falsify. A magnitude strictly above
> every sample draws **`>99th`**, which says the stronger and more useful
> thing.
>
> And the shipped figure is spelled **`99th percentile`, never `99.1%`** —
> amendment 1 above makes it a percentile of `|return|` and a `%` beside a
> figure formatted by the same decimals as a price change is two numbers of
> visibly the same kind, only one of which is a move. The precedent is §9,
> which carries Story 4.4's refusal of percentages for the neighbouring reason:
> a percentage hides its denominator. This one states it — `of 4,620 5-minute
returns · all times of day pooled` — which is also where amendment 2's
> **known cost** reaches a screen: in the opening thirty minutes the clause
> becomes `opening 30 minutes, the fattest-tailed bucket — pooled, this reads
high`, conditional on the **figure's own instants** rather than on a clock.

---

# 12. Primary workflow: investigate an anomaly

The user sees:

> **NVDA — anomaly 91**

and selects **Investigate**.

MarketPulse creates an Investigation.

The AI receives:

- the triggering anomaly;
- current application time;
- security metadata;
- available analytical tools.

The interface immediately shows:

```text
Investigating NVDA

✓ Measure abnormal price movement
◌ Compare semiconductor peers
◌ Check broad-market behaviour
◌ Check recent SEC filings
```

Tool calls run independently where possible.

Results stream into the workspace.

---

# 13. Investigation model

An investigation is a first-class persisted domain object.

```text
Investigation

id
title
createdAt
mode
status
subjectSymbols[]
currentTime
steps[]
findings[]
evidence[]
workspaceState
messages[]
```

Possible statuses:

- running;
- awaiting user;
- completed;
- failed;
- cancelled.

An investigation can remain alive independently of an individual AI response.

This is important.

The product models a **long-running agent workflow**, not just request/response chat.

---

# 14. Investigation steps

Each step has observable state:

```text
Step

id
description
status
startedAt
completedAt
tool
resultReference
error
```

Statuses:

- queued;
- running;
- completed;
- failed;
- cancelled.

The user can therefore observe what the agent is doing.

Example:

```text
✓ Measure move              120 ms
✓ Compare peers             184 ms
✓ Check market breadth       91 ms
◌ Search SEC filings
```

This is preferable to a generic "AI is thinking…" spinner.

---

# 15. Findings

The agent converts evidence into typed findings.

Example:

```text
Finding

type: RELATIVE_MOVE
claim:
  "The decline is broader than NVDA but
   concentrated in semiconductor stocks."

confidence: SUPPORTED

evidence:
  - semiconductorBreadth: 82%
  - NVDA: -4.2%
  - semiconductorMedian: -2.0%
  - SPY: -0.6%
```

Findings should appear as cards in the investigation.

Selecting a finding focuses the relevant evidence.

---

# 16. Evidence

Evidence should be a first-class domain concept.

Types might include:

- market observation;
- time series;
- calculated metric;
- filing;
- filing excerpt;
- relationship;
- anomaly;
- external observation.

Every evidence item records:

- source;
- timestamp;
- retrieval timestamp;
- calculation method where relevant;
- security;
- raw-data reference.

The UI should allow the user to select:

**View evidence**

from every substantive AI finding.

---

# 17. Agent toolset

The AI receives constrained tools rather than database access.

Initial tools:

```text
get_security_snapshot

get_price_series

calculate_return

calculate_return_percentile

calculate_volume_ratio

compare_securities

get_related_securities

get_market_breadth

calculate_rolling_correlation

get_recent_filings

get_filing_metadata

focus_symbols

open_chart

compare_on_chart

highlight_graph_nodes

set_graph_encoding

set_time_window

pin_evidence
```

Later:

```text
search_filing

extract_filing_fact

get_macro_series

find_similar_historical_events

compare_historical_events
```

Every analytical tool returns structured data.

---

# 18. Generative UI

Generative UI is a central portfolio feature.

The agent can manipulate the workspace through a constrained command protocol.

Example:

```text
WorkspaceCommand

type: OPEN_COMPARISON_CHART

symbols:
  - NVDA
  - AMD
  - AVGO
  - SPY

metric: NORMALIZED_RETURN

window:
  start: 10:00
  end: NOW
```

The command is:

1. generated by the model;
2. schema validated;
3. permission checked;
4. executed by the frontend;
5. recorded in investigation history.

The frontend renders only trusted application components.

The model cannot generate arbitrary components.

---

# 19. Workspace history and undo

AI-controlled interfaces create an important UX problem:

> What if the AI changes the workspace in an unhelpful way?

Every workspace command must therefore be recorded.

Users can:

- undo;
- redo;
- return to a prior investigation state;
- pin elements so the AI cannot remove them.

This gives the human explicit control over the generative interface.

---

# 20. Investigation example

User:

> Why is NVDA falling?

System:

```text
Investigating...

✓ NVDA down 4.2% since open
✓ Move is in 99th percentile
✓ Semiconductor median down 2.0%
✓ 82% of semiconductor group negative
✓ SPY down 0.6%
✓ No recent NVDA filing detected
```

AI finding:

> **The move appears partly sector-wide, although NVDA is materially underperforming its semiconductor peers.**
>
> I found no recent SEC filing that would currently provide direct company-specific evidence.
>
> **Evidence quality: Supported**

The agent then generates:

- NVDA/AMD/AVGO/SPY comparison chart;
- highlighted semiconductor cluster;
- intraday timeline;
- volume comparison.

The user asks:

> Is the weakness mostly the biggest companies?

The agent calculates equal-weighted versus weighted behaviour and updates the UI.

The conversation has therefore become an **interactive investigation**, not a sequence of prose answers.

---

# 21. Market Replay

Replay should ultimately become MarketPulse's showcase feature.

The user chooses:

**Date**

and optionally:

**Starting time**

The application enters:

> REPLAY MODE

A global simulation clock controls all information.

```text
09:30 ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━ 16:00
                11:07
```

The user can:

- play;
- pause;
- change speed;
- drag the clock;
- jump to detected events.

---

# 22. Temporal consistency

Replay mode imposes an absolute constraint:

> No system component may use information from after the replay timestamp.

If replay time is:

**11:07:00 ET**

the agent may only access:

- price observations ≤ 11:07;
- volume observations ≤ 11:07;
- filings available ≤ 11:07;
- calculated metrics using data ≤ 11:07.

This should be enforced at the tool/data layer rather than merely included in the LLM prompt.

That prevents accidental future-information leakage.

---

# 23. "What did the market know?"

Replay contains a prominent action:

> **Investigate at this moment**

For example:

```text
NVDA falls 3.1%
13:37 → 13:44
```

MarketPulse investigates using only information available at that timestamp.

Possible result:

> **No confirmed company-specific trigger found.**
>
> Semiconductor stocks are broadly lower and NVDA's trading volume is unusually high.
>
> No new SEC filing was available at this point in the session.
>
> A company-specific explanation cannot currently be established.

This behaviour is intentionally conservative.

---

# 24. Replay architecture

Raw observations should be stored as append-only timestamped events.

Examples:

```text
MarketBarReceived
TradeReceived
FilingPublished
AnomalyDetected
InvestigationCreated
AgentToolCalled
WorkspaceCommandApplied
```

This naturally supports:

- replay;
- debugging;
- reproducibility;
- auditability.

We do not need a pure event-sourced architecture for the entire system.

But adopting event-log principles around temporal market data and investigations will make replay substantially easier.

---

# 25. Frontend architecture

Recommended frontend:

**React + TypeScript**

Reasons:

- demonstrates current React expertise;
- well suited to large structured applications;
- strong typing;
- mature routing/forms/testing;
- signals work well for derived application state;
- RxJS remains particularly appropriate for streaming external data.

Recommended approach:

**Redux**

for domain/application state.

**RxJS**

for WebSocket streams, asynchronous pipelines and cancellation.

Avoid introducing heavyweight global state libraries until application complexity demonstrates the need.

---

# 26. Frontend domain boundaries

Suggested feature architecture:

```text
app/

  market/
    data
    models
    state

  topology/
    renderer
    layout
    interaction

  charts/
    price
    comparison
    volume

  anomalies/
    models
    detection-ui

  investigations/
    agent-stream
    findings
    evidence
    timeline
    workspace

  replay/
    clock
    controls
    state

  filings/
    browser
    evidence

  shared/
    ui
    formatting
    infrastructure
```

Feature modules should expose domain-level APIs rather than reaching into one another's internal stores.

---

# 27. High-performance rendering

The market topology should intentionally exercise WebGL.

A good candidate is a WebGL graph renderer such as Sigma.js, with the graph model kept separate from rendering.

**This section governs the topology and not the 2-D chart layer — amended 2026-09-12 by Story 2.12.** There are two rendering decisions in this product, taken against different problems. Price, volume, comparison and anything else hung on a time axis are **hand-built SVG behind a wrapper, with no charting library**: see [ADR 0027](../docs/adr/0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md) and [`CHARTING.md`](epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md). Nothing here reopens that, and nothing there reopens this.

Target initial visualization:

- 500 nodes;
- several thousand edges;
- live node updates.

Synthetic performance mode:

- 5,000+ nodes;
- 25,000+ edges;
- high-frequency synthetic updates.

The performance benchmark exists to demonstrate architectural scalability beyond the size of the live free-data universe.

---

# 28. Performance targets

Targets should be measured and published in the repository.

### Market updates

Server-received event → application state:

**<250 ms p95**, excluding upstream-provider latency.

**Amended 2026-09-22 by Task 3.6.4 — measured for the first time, and the
target stands.** For four days this line was an acceptance criterion three
stories carried and none could take, because no frame on the market-stream
wire said when the server had sent it. Every frame now carries `sentAt`, the
gateway's clock at the send ([ADR 0033](../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)),
and the journey was taken on `/securities` at **518 subscribed securities** on
a production build: **p95 68.1 ms from gateway send to the universe
table repainted**, of which the wire leg is **p95 6 ms**, over
60 frames each carrying every security. _Repainted_ is later than
_application state_, so the figure bounds this target from above. **It is a
loopback figure** — server and browser on one machine, one clock — and Story
3.11 re-takes it against the deployed gateway during a session; the record,
its ends, its n and its skew caveat are in
[Task 3.6.4](epic-03-live-market-data/story-06-live-prices-across-the-universe/TASK-04-the-instant-the-wire-does-not-carry.md)
and `STREAM-SEAM.md` §8.9.

### Market topology

500 nodes / 5,000 edges:

**60 FPS during normal interaction on a representative laptop.**

### Synthetic topology

5,000 nodes / 25,000 edges:

**>45 FPS during pan/zoom.**

### UI responsiveness

Long tasks:

**No routine main-thread task >50 ms.**

Heavy transformations should move to Web Workers where beneficial.

**Amended 2026-09-15 by Task 2.14.8 — the target is unchanged and the product
knowingly misses it in two places, both the same component.** A published target
a product misses without annotating it is how a stated invariant quietly stops
being true, so the exceptions are named here rather than only in the epic that
found them:

- **Every cold load of `/securities` and `/securities/:symbol`** spends one
  main-thread task of **50–76 ms**, and it is the **518-row tracked-universe
  table** rather than the chart. Measured in real Chromium on 2026-09-12,
  2026-09-13 and 2026-09-15, attributed from both ends each time.
- **`Expand all` on that table costs 69–87 ms** in a production build
  (2026-09-11).

**Neither amends this target — it is right.** Both are measured exceptions with
a named owner: **Epic 14**, whose `EPIC.md` holds the figures, the three
candidate repairs and the re-measure. The reversal trigger is a condition rather
than an epic number — **the first time a second surface on that page renders
per-row markup at universe scale** — and if it fires first, the repair is due
then. Nothing else in this section is known to be breached, and the chart layer
specifically is not: it produces no task over 50 ms at any density the API can
serve.

**Amended 2026-09-22 by Task 3.6.5 — both exceptions re-taken with the feed
running, a third found and repaired in the same task, and the ownership
unchanged.** On a production build at 1440 the cold load of `/securities` is
**50–56 ms on seven loads in ten** (none on three) after a fixed table layout
from 1024 px up, from 56–83 ms on eight in ten before it; `Expand all` is
**65–86 ms** from 80–88 ms the same day. Both **stand as exceptions and stay
Epic 14's**. The third was this epic's own: since Task 3.6.1 the live feed
re-rendered all 518 rows once a minute, and the backend health poll re-rendered
them every 30 s with nothing changed — **routine**, in this section's own word,
where the two above are once per visit — and it crossed 50 ms on three frames
in seven. Two memo boundaries repaired it: **no task over 50 ms in the steady
state** on a production build with every row changing every minute, the frame's
script down from 46–49 ms to 37–40 ms, the health poll's 40 ms gone. The
figures, the instruments and the trigger's written verdict are in
[Task 3.6.5](epic-03-live-market-data/story-06-live-prices-across-the-universe/TASK-05-the-cold-load-expand-all-and-epic-14s-trigger.md).

**Amended 2026-10-09 by Task 4.8.8 — no third exception, the number is
unchanged, and what is amended is the METHOD and one UNIT.** Story 4.8 measured
the landing page `/` against the same line with a control, and it is **not** in
breach: **no task over 50 ms in 10 of 10 cold loads and one 50.9 ms frame in
ten**, worst rAF gap **p50 24.7 / p95 34.7 ms**, over **447 nodes and zero
`<tr>` at 518 securities, identical at 20** — against `/securities`
interleaved on the same artefact at **62.8–77.4 ms on 10 of 10** over 10,318
nodes. Per-batch work on `/` while the feed runs is **3.7–5.1 ms**, largest
single task **4.5 ms**. Three things follow, and the first is the one that
generalises:

- **This target is measured on THREE channels, and each must be proved by a
  plant on the page that produced the figure.** `longtask`,
  `long-animation-frame`, and a `requestAnimationFrame`-gap recorder. The three
  disagree, legitimately: run verbatim today, the `longtask` channel reports
  **nothing** on `/securities`, where on 2026-09-22 it read 50–56 ms on 7 of 10
  — because the work is no longer a single task over the line but a 63–77 ms
  **frame** whose largest task is not. **A channel going quiet and a cost going
  away produce the same output.** A 120 ms plant was caught by both observers on
  all 40 loads of the session that took the figures above, after each
  measurement window; without that, a zero certifies nothing. Check
  `document.visibilityState` first — a tab driven over CDP reports `hidden`,
  which pauses `requestAnimationFrame` and makes every figure small, plausible
  and meaningless.
- **The first exception's UNIT is corrected and its number is not.** _One
  main-thread task of 50–76 ms_ is no longer a description of the breach: it is
  **one frame over the line on every cold load**, of which script is 26–31 ms
  and style, layout and paint 34–38 ms. The band and the ownership stand
  exactly as above; what changed is which instrument can see it.
- **The reversal trigger gains a SECOND condition, for `/`, because the one
  above is written against `/securities` and structurally cannot fire on the
  landing page** — _the first surface on `/` that renders one element per
  tracked security_. **First** there and **second** here, because on
  `/securities` the first such surface already **is** the breach while on `/` it
  would **create** one: the 518-security payload both routes fetch costs ≈6 ms
  and is already paid, and the 518-row markup costs ≈48 ms and is not. Priced
  before it fires: a 518-element ranked surface takes `/` from **24.7 ms to
  roughly 60–75 ms** of worst frame. Epic 14's `EPIC.md` holds the verdict (its
  **fifth** evaluation, unfired), the clause, and the clause's own reversal
  trigger.

### Investigation

Visible indication that an investigation has begun:

**<500 ms after user action.**

Results stream incrementally.

The UI must never wait for the complete agent answer before becoming useful.

---

# 29. Backend architecture

Keep the backend relatively small.

Recommended:

**TypeScript + Node.js**

using a lightweight server framework such as Fastify or NestJS.

Conceptual services:

```text
                   Alpaca WebSocket
                          │
                          ▼
                 Market Ingestion
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          Current State         Time-series DB
                │                   │
                └─────────┬─────────┘
                          ▼
                    Analytics
                          │
                          ▼
Browser ◄──────── API / Streaming Gateway
   │                      │
   │                      ▼
   └────────────── Agent Service
                          │
                          ▼
                    SEC / later FRED
```

---

# 30. Storage

Recommended initial database:

**PostgreSQL**

optionally using **TimescaleDB** for time-series storage.

Core tables/collections:

- securities;
- market_bars;
- anomalies;
- relationships;
- filings;
- investigations;
- investigation_steps;
- findings;
- evidence;
- workspace_events.

Do not introduce multiple databases in V1 unless measurements demonstrate a need.

---

# 31. Streaming protocols

Use:

**WebSocket**

for continuous market updates.

Use:

**Server-Sent Events or streaming HTTP**

for AI investigation events.

The two streams have different semantics and should remain separate.

Market data is continuous and bidirectional subscription management is useful.

Agent execution is naturally modelled as an ordered stream of server-generated events.

---

# 32. Agent architecture

The agent should be provider-agnostic.

Define an internal abstraction:

```text
AgentProvider

runInvestigation(context, tools)
streamEvents()
cancel()
```

This prevents the application's domain model from depending directly on a particular LLM vendor.

The most important design work is therefore the tool and event protocol, not the model SDK.

---

# 33. Agent event protocol

The backend streams typed events:

```text
INVESTIGATION_STARTED

STEP_STARTED

TOOL_CALL_STARTED

TOOL_CALL_COMPLETED

FINDING_CREATED

EVIDENCE_ADDED

WORKSPACE_COMMAND

STEP_COMPLETED

INVESTIGATION_COMPLETED

INVESTIGATION_FAILED
```

The frontend renders state from these events.

This makes:

- streaming;
- retries;
- cancellations;
- replay;
- debugging;
- testing

much easier than parsing a stream of unstructured AI text.

---

# 34. Human-in-the-loop controls

The user must always be able to:

- stop an investigation;
- ask a follow-up;
- reject a finding;
- inspect evidence;
- change the analysis window;
- change comparison securities;
- undo workspace changes;
- pin charts;
- restart an investigation;
- branch an investigation.

A later version can allow the user to mark:

> Helpful

> Incorrect

> Unsupported

Those signals can become part of the investigation log.

---

# 35. AI safety / trust requirements

MarketPulse should not:

- recommend buying or selling;
- produce target prices;
- present unsupported causal statements as fact;
- hide data provenance;
- manufacture missing observations;
- silently use information outside replay time;
- perform numerical analysis solely in model reasoning.

Every generated conclusion should be distinguishable from an observed fact.

---

# 36. Loading, failure and partial states

Because this is an agentic application, failures are normal product states.

Examples:

**SEC unavailable**

> Filing search unavailable. Market-data investigation continues.

**Analytical tool failure**

> Peer comparison failed. Retry?

**Agent fails**

The charts and successfully gathered evidence remain visible.

**Market WebSocket disconnects**

> Live feed disconnected — displaying data through 10:42:17.

The product should degrade incrementally rather than collapsing into one global error screen.

**Amended 2026-09-24 by Story 3.10 — this shipped, and the wording differs from the line above in three ways that are each a decision.** What a reader sees is:

> **DISCONNECTED** — The live feed is not connected. Prices shown are the last known. Showing data through Sep 24 · 05:05 EDT.

**The word is a state rather than a sentence fragment**, because `live | stale | disconnected` is a shipped vocabulary with one home and three members, and `stale` — connected and silent — is a state this section does not name but the product needs: on IEX a silent minute is ordinary (65.1% median per-symbol coverage), so _not connected_ and _connected and quiet_ are different claims. **The instant carries a date and a timezone** rather than a bare `10:42:17`, because a page left open overnight would otherwise say `10:42:17` about yesterday. And **`Prices shown are the last known` is stated** rather than implied, because the line above describes what the product does and this sentence has to say it to the person reading it.

**The rule under it is met as written and is stronger than it reads.** Killing the feed leaves `main`'s text **byte-identical** — asserted, not argued — and no page error is raised in any of nine produced states. What moved is that the connection has exactly **one** home: the status bar. Every other surface stays quiet by decision, each taken with a measurement behind it, because a page where six surfaces announce one fact is how two of them come to disagree.

---

# 37. V1 scope

V1 should contain only what is necessary to demonstrate the concept convincingly.

## Include

- tracked equity universe;
- live IEX market feed;
- historical minute bars;
- market overview;
- WebGL topology;
- price/volume visualizations;
- deterministic anomaly detection;
- manual security exploration;
- SEC filing detection;
- AI investigation;
- typed agent tool calls;
- streaming investigation state;
- evidence-linked findings;
- generative workspace commands;
- investigation persistence;
- basic historical replay;
- temporal isolation during replay;
- synthetic performance mode.

## Explicitly exclude

- brokerage integration;
- trade execution;
- portfolios;
- options;
- crypto;
- price predictions;
- buy/sell recommendations;
- social sentiment;
- comprehensive news aggregation;
- authentication beyond simple development/demo needs;
- mobile UX;
- complex fundamental valuation;
- full tick-level replay;
- thousands of live securities.

---

# 38. V1 flagship demo

The entire V1 should be designed around one polished five-minute demonstration.

### Scene 1 — Observe

Open MarketPulse.

The market graph is live.

Several securities are moving.

NVDA develops a high anomaly score.

### Scene 2 — Investigate

Select:

> Investigate

The investigation begins immediately.

Steps execute visibly.

The graph re-focuses.

Charts appear.

Evidence streams in.

### Scene 3 — Reason

MarketPulse concludes:

> Semiconductor weakness is broad, although NVDA is underperforming peers.

The user opens the evidence.

### Scene 4 — Challenge

User asks:

> Is this actually a semiconductor move, or mostly the biggest names?

The agent invokes deterministic calculations and modifies the comparison.

### Scene 5 — Replay

Switch to a historical session.

Move the clock backward.

Select:

> Investigate at this moment

The application reproduces the analysis using only information available at that timestamp.

That is the portfolio story.

---

# 39. Portfolio narrative

The repository should make the engineering decisions as visible as the application.

Documentation should include:

### Architecture overview

How real-time data travels through the system.

### Agent architecture

Why LLM reasoning is separated from deterministic analytics.

### Generative UI

How typed workspace commands safely allow AI-controlled interfaces.

### Temporal correctness

How replay prevents future-information leakage.

### Performance

Benchmarks for the WebGL visualization and streaming pipeline.

### Failure handling

How partial agent failures are represented.

### ADRs

Short architecture decision records covering important choices.

Possible ADRs:

- Why React;
- Why WebSocket + SSE;
- Why deterministic calculations live outside the model;
- Why typed generative UI commands;
- Why event-oriented investigations;
- Why PostgreSQL/Timescale;
- Why replay time is enforced in the data layer.

---

# 40. Success criteria

MarketPulse V1 is successful when a first-time viewer can understand within approximately one minute:

> "This system identifies unusual market behaviour and uses an AI agent to investigate it."

A technical interviewer should then be able to explore deeper and find credible engineering answers to questions about:

- streaming state;
- rendering performance;
- asynchronous agent workflows;
- cancellation;
- failure recovery;
- testing non-deterministic systems;
- human/AI boundaries;
- provenance;
- temporal correctness;
- frontend architecture;
- performance optimization.

The project succeeds as a portfolio project even if the financial analysis itself remains intentionally simple.

---

# 41. Proposed delivery phases

## Phase 0 — Product skeleton

Build:

- React application shell;
- backend;
- market-data provider interface;
- security universe;
- historical chart.

Outcome:

> Select a security and explore its historical data.

---

## Phase 1 — Live Market

Build:

- Alpaca WebSocket ingestion;
- browser streaming;
- current market state;
- anomaly calculations;
- topology visualization.

Outcome:

> MarketPulse becomes a live market application.

---

## Phase 2 — Investigation Engine

Build:

- Investigation domain model;
- deterministic analytical tools;
- investigation event stream;
- evidence model;
- investigation workspace.

Initially run investigations without an LLM.

Outcome:

> The entire analytical system works deterministically.

This is important.

---

## Phase 3 — AI Agent

Add:

- LLM provider;
- tool calling;
- streaming agent steps;
- findings;
- follow-up questions;
- typed workspace commands.

Outcome:

> The AI can conduct an evidence-backed investigation.

---

## Phase 4 — Generative Workspace

Add:

- charts created by agent commands;
- graph focusing;
- comparisons;
- pin/undo;
- investigation branching.

Outcome:

> AI interaction visibly changes the analytical workspace.

---

## Phase 5 — Market Replay

Add:

- replay clock;
- event playback;
- historical anomaly reproduction;
- time-constrained analytical tools;
- time-constrained agent.

Outcome:

> "What did the market know at this moment?"

This becomes the flagship feature.

---

## Phase 6 — Portfolio polish

Add:

- synthetic load-test mode;
- performance telemetry;
- architecture documentation;
- ADRs;
- polished demo dataset/session;
- E2E tests;
- deployment;
- README walkthrough.

Outcome:

> A project designed to be discussed in a Staff Engineer interview rather than merely linked from a CV.

---

# 42. The first implementation milestone

Do **not** begin with AI.

The first vertical slice should be:

> **Display 100 securities, receive live price updates, calculate an explainable anomaly score, and click a security to inspect the underlying price/volume evidence.**

**Amended 2026-09-15, after Epic 2.** Two of the four clauses are done and the
number is stale. The universe is **516** rather than 100 (§6 carries the
re-sizing, and its 2026-10-12 amendment the two securities that left it), securities are displayed, and a security can be clicked to inspect
its price and volume evidence — Epic 2's exit criterion, walked on the deployed
site. ~~**Live price updates are Epic 3** and~~ — **amended 2026-09-25 at Epic 3's
close: live price updates are DONE.** Three of the four clauses now hold. On
the deployed site during a session, 518 securities carry a live price that
updates without a refresh, a security's price and volume charts extend minute
by minute, and the chrome says whether the feed is arriving — watched working
by a person on 2026-09-24 and recorded in
[`LIVE-REHEARSAL.md`](epic-03-live-market-data/LIVE-REHEARSAL.md). **The
explainable anomaly score is Epic 5**, and the milestone's real content — that
this slice comes before any AI — is unchanged and still the ordering the
roadmap follows.

That establishes the domain model on which almost everything else depends.

Once that works, implement an Investigation as a deterministic workflow.

Only after the Investigation model feels correct should an LLM be allowed to drive it.

This prevents the product architecture from accidentally becoming:

`chat box → LLM → miscellaneous API calls`

and gives us instead:

`market system → analytical tools → investigation model → agent → generative workspace`

That architectural distinction is the heart of MarketPulse.
