# MarketPulse — Epic Roadmap

## Epic 1 — Application Foundation

### Goal

Establish the development and deployment foundation for MarketPulse.

### Outcome

A working frontend and backend can be run locally and deployed, with shared conventions in place for future development.

### Scope

- React application shell
- TypeScript backend service
- Local development environment
- Basic routing and application layout
- Shared configuration
- Environment handling
- Logging
- Basic error handling
- Unit/integration test foundations
- User-journey test foundations — added 2026-09-03
- Select UI component library and styling conventions — added 2026-08-31
- CI pipeline
- Initial deployment pipeline

### Exit criteria

- Frontend and backend run together locally
- A deployed development environment is accessible
- Automated tests run in CI
- Backend health/status can be viewed from the frontend

**Closed 2026-09-04**, all four criteria re-checked against the running system
rather than against story statuses — see `epic-01-application-foundation/EPIC.md`.
Two items were added to its scope during delivery and are recorded above.

---

# Epic 2 — Security Universe & Historical Market Data

### Goal

Create the basic financial-market domain and allow users to explore historical data.

### Outcome

A user can select one of the tracked securities and inspect its historical price and volume data.

### Scope

- Security domain model
- ~~Initial ~100-security universe~~ — **delivered at 518** (Story 2.8): the
  sizing was re-taken once the WebSocket spike proved minute-bar channels are
  exempt from Alpaca's 30-symbol cap, and the list is now allocated from a
  published index constituent list rather than hand-picked. See `UNIVERSE.md`
  §10
- ETF/sector metadata
- Market-data provider abstraction
- Managed Postgres provisioning — tier and networking mode are irreversible
- Database schema and migration mechanism
- Alpaca credential on the platform — the first secret this system holds
- Alpaca historical-data integration
- Historical market-data persistence — a record of what was observed, not a cache
- Security search/select
- Basic price chart
- Basic volume chart
- Time-window selection
- Market-data provenance display
- Trading calendar and market-time module — added during delivery (Story 2.5)
- Frontend market-data state and fetch layer — added during delivery (Story 2.10)
- Bar-coverage ledger and nightly backfill — added during delivery (Story 2.8)

### Exit criteria

A user can search for a security such as NVDA, open it, and inspect recent historical price and volume data.

**Closed 2026-09-15**, all fourteen stories, the exit criterion walked by a
person on the deployed site at three viewports and asserted on every deploy from
here on — see `epic-02-security-universe-historical-data/EPIC.md`. Three items
were added to its scope during delivery and are recorded above, beside the three
added at the epic's start because Epic 1 named them and owned none of them; one
scope item was delivered at five times the size it was written at. What ships
open, each with a named owner rather than a story number, is in that file's
closing table — and the three that land on a later epic are carried in that
epic's own `EPIC.md` rather than only here.

---

# Epic 3 — Live Market Data

### Goal

Turn MarketPulse from a historical explorer into a live application.

### Outcome

Tracked securities update automatically as live market observations arrive.

### Scope

- Alpaca WebSocket ingestion
- Backend subscription management
- Market-data normalization
- Current market-state model
- Backend-to-browser streaming
- Live connection state
- Reconnection handling
- Stale-data detection
- Live price updates in the UI
- Market timestamp / LIVE indicator
- Continuous-connection cost envelope — the idle-rate estimate does not transfer
- **A tape column on `market_bars`** — added 2026-09-15 from Epic 2's close. The
  store records provenance once per `(security, timeframe)` and a stored IEX bar
  would be described as SIP by a row that cannot say otherwise. A migration, not
  a wording change
- **The two-feed ledger, produced rather than simulated** — the sentence
  invariant 6 exists for, reachable today only through `twoFeedStitchView()`
- **The live feed's own honest label** — the free plan is asymmetric, and
  Epic 2's `All US exchanges` must not be carried onto an IEX tail
- **The motion vocabulary** — design test 4, _does it feel alive_, deferred here
  by name after seven refusals, against real moving numbers

### Exit criteria

The application can maintain a live connection for the tracked universe and update visible market values without page refreshes.

---

# Epic 4 — Market Overview

### Goal

Give users an immediate picture of current market conditions.

### Outcome

MarketPulse has a useful landing page rather than requiring users to start with an individual stock.

### Scope

- Major ETF/index proxy summary
- Sector performance
- Advancers / decliners
- Market breadth
- Top gainers / losers
- Unusual-activity placeholder area
- Security selection from the overview
- Live market status indicators

### Exit criteria

A user opening MarketPulse can quickly understand whether the tracked market is broadly rising, falling, mixed, or concentrated in particular sectors.

---

# Epic 5 — Anomaly Detection

### Goal

Automatically identify market behaviour worth investigating.

### Outcome

MarketPulse continuously assigns explainable anomaly scores to securities.

### Scope

- 5-minute return calculations
- Historical return distributions
- Return percentile calculation
- Intraday volume baseline
- Volume-ratio calculation
- Market-relative movement
- Sector-relative movement
- Composite anomaly score
- Human-readable anomaly explanation
- Unusual-activity ranking

### Exit criteria

MarketPulse can surface securities such as:

> NVDA — Anomaly 91
> Extreme short-term move
>
> **Noted 2026-10-21 by Story 5.6's Gate 1, in the same place and for the same
> reason Story 5.5 noted the line below it: `Extreme` is a BAND NAME.** The four
> bands are `normal · elevated · high · extreme`, so this line uses a
> classification as a factor adjective — a factor clause reading `Extreme` beside
> a security whose own band reads `high` is two verdicts about one security.
> Story 5.6's AC 7 requires factor clauses to carry **figures**, so the shipped
> clause is `99th percentile of 4,620 5-minute returns` and the direction is the
> glyph. `PRODUCT_SPEC.md` §11 carries the full amendment. **Rewriting this
> criterion as a shape is Story 5.7's, not this story's** — recorded here so the
> collision is visible before that rewrite rather than discovered during it.
> Volume 3.8× normal
>
> **Amended 2026-10-29 by Task 5.7.3, and this line is the FOURTH live site of a
> correction that was made on 2026-10-20.** Task 5.5.5 corrected `normal` →
> `typical` in `PRODUCT_SPEC.md` §11 and in Epic 5's own `EPIC.md` and stopped;
> this copy never received it, and **Story 5.6's Gate 1 then amended the line two
> above this one in this same block** without noticing. So the sweep was **3 of
> 4, by the same failure mode, one epic later** — which is why the shape below
> is written into both homes in one change rather than one home at a time. The
> word is **`typical`**: `normal` is also one of this section's own four **band**
> names, so the example collided with the model it was illustrating. And the
> figure is a **rate** — the shipped label is `VOLUME PER MINUTE` and the shipped
> sentence is `4.1× typical`, because `5 × median` is _the typical five-minute
> volume_ and the median of a sum is not five times the median of its parts
> ([ADR 0045](../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md)
> decision 2).
> Underperforming semiconductor peers

Every score can be explained from deterministic calculations.

### The exit criterion as a SHAPE — rewritten 2026-10-29 by Task 5.7.3

**The example above is quoted and left standing as the record of what was asked
for, and FIVE of its five clauses cannot be checked as written.** Story 5.7's
own description said four; that was true when written and became false on
2026-10-21, when Story 5.6's Gate 1 established that `Extreme short-term move`
uses a **band name** as a factor adjective. Only the trailing sentence — _Every
score can be explained from deterministic calculations_ — survives intact.

**One arithmetic fact first, because it is stronger than the reason this rewrite
was originally proposed.** `91` is not merely _not producible on demand_ under
absolute calibration: on the shipped scale it is **unreachable**.
`FACTOR_WEIGHTS` is `price 40 · excess 35 · volume 25` and the volume arm is
`no-distribution` **unconditionally** — `0015` stores a median and a dispersion,
not a distribution, so no security has a rankable volume figure anywhere — which
puts the ceiling at **75**. `PRODUCT_SPEC.md` §9's sketch draws `91`, `84` and
`79`; all three are above it.

**The shape, eight clauses.** A verdict follows each.

**0 — The frame.** _For any tracked security whose recent behaviour is unlike
its own history, the product draws a composite figure with its band and a
complete account of how it was reached; for a security it cannot score, it draws
the same account with one row per factor it lacked, naming the lack._ No
security, no figure and no band is named: a named value is not producible on
demand under absolute calibration, and a named security makes the criterion a
claim about the market on the day it runs.

**1 — The subject.** _A tracked security, identified by its ticker, resolved from
the row's own identity rather than from a search term or a fixture._
**Met.** `anomalyScoreBand` compares the symbol rather than trusting it —
`if (held?.symbol !== symbol) return RESERVED_SCORE;` — and on `/` the
destination is resolved at render from the row's own identity, so the activation
race on a re-ordering surface is unrepresentable rather than managed. Holds on
every store.

**2 — The figure.** _An integer on a stated 0–100 scale, with (a) a band word
drawn from exactly `normal · elevated · high · extreme`, (b) the scale, (c) the
count of factors in the sum, and (d) the maximum those factors could have
produced._
**Met.** `HOW UNUSUAL · NOT A RISK MEASURE`, the figure, `/ 100`, the chip, and
`2 of 3 factors contributing · max 75`. The scale and the maximum are
**deliberately different numbers** — `/ 100` is the scale, `max 75` is what the
present factors can reach — which is (c) and (d) met exactly rather than
collapsed. The band word is the **figure's** classification and appears once.

**3 — The price factor.** _A figure, never an adjective: a percentile ordinal of
the magnitude of the security's own 5-minute return, with the counted sample
size, the span the samples are of, and the pooling stated; direction carried by a
glyph and a sign rather than a word._
**Met.** `99th percentile` beside `of 4,620 5-minute returns · all times of day
pooled`, with `>99th` above the highest order statistic and `100th` never
printed. The original's `Extreme` is gone. **Reachable on a store with bars
only** — CI exercises the refusal path alone.

**4 — The volume factor.** _A rate, stated as a multiple of a typical **minute**,
labelled as a per-minute quantity, with the baseline's lookback in sessions, its
bucket width, its exclusion of today, and the tape of **both** halves named and
the same; or, where the rate cannot be ranked or measured, a named refusal
distinguishing a wait from a gap in our own listening._
**Met in form; the shipped product is the refusal.** `VOLUME PER MINUTE`,
`4.1× typical`, `median minute of 60 sessions · same 5-minute bucket · today
excluded`, `Measured on IEX · baseline on IEX`. `normal → typical` is met and the
rate labelling is met (ADR 0045 decision 2: `5 × median` is _the typical
five-minute volume_, and the median of a sum is not five times the median of its
parts). But the figure draws on **4 of 39,936** `(security, bucket)` pairs —
0.010% — and **has never been drawn for anybody**; what a deployed reader meets
is `Too little history — 80 IEX minutes at this time of day` at **99.990%** of
buckets.

**5 — The relative move.** _`exceeds`, or its shipped antonym pair, plus a figure
in percentage points, plus a **named** reference._
**Met in a different form, and the divergence is stated rather than hidden.**
Three things are refused by name: the adverb `substantially` (an intensity word
where a figure belongs), the uncounted population `related securities`, and any
industry-group reference with no benchmark ETF behind it — semiconductors is 20
members with no ETF, which `UNIVERSE.md` §1 and §7 forbid assuming. The shipped
clause is `behind by 2.20 pts` under the label `Against its sector`, with the
benchmark's ticker on the adjacent row. **`exceeds` is not the shipped verb** —
`ahead` / `behind` / `level` are, from one `directionOf` so the three channels
cannot disagree, and they survive the _ahead while falling_ case that a tinted
cell would get wrong. That is a measurement word too and is strictly better here;
recorded as a divergence rather than smoothed over.

**6 — Breadth.** _Counts with the population they were counted over and the
window they were counted in, stated as context beside the score and never as a
weighted term in it._
**Met.** `Breadth: 312 of 466 advancing, heard from in the last 5 minutes.`,
read off the frame and never spelled, with `measured: 0` drawing `nothing heard
from in the last 5 minutes.` rather than `0 of 0`. It is context, never a term:
the ledger's weight column carries **blank room** rather than a dash for it.
§11's own `82% of semiconductor securities currently negative` is superseded — a
percentage hides its denominator, and the denominator is our reach rather than
the market.

**7 — The account closes.** _Every drawn score carries its explanation on the
same surface, without an interaction; the explanation's contributions re-add to
the figure above them; and the clause set is total over the factors, so a
fully-scored and a fully-refused security produce the same shape._
**Met, and this is the strongest clause in the epic.** A real `<table>` with
`<caption>How this score was reached</caption>`, one row per factor in **every**
state, so `3 of 3` and `0 of 3` are byte-identical in height. The addition closes
by construction — the score **is** the sum of the rounded contributions — and
across the wire `readAnomalyScore` **re-adds the published contributions and
refuses the explanation when the sum is not the score it was sent**, which is
stronger than the type claim it replaces because the brand dies at `JSON.parse`.
No popover and no disclosure: `SecurityRow` was deleted on the argument that §11
requires a score to **carry** its explanation rather than to be able to be asked
for one. The original's surviving sentence is strengthened from _can be
explained_ to _carries its explanation_.

**What no machine and no person has seen.** `high`, `extreme`, any three-factor
score (structurally unreachable while `0015` stores a median and a dispersion),
and a single **ranked row** on `/`. A score **has** been drawn on a real route —
`score 35 · band elevated · max 35`, local store, 2026-10-23 — so the clauses
above are not all paper; the common deployed case `2 of 3 · max 75` is.

---

# Epic 6 — Market Topology

### Goal

Create MarketPulse's distinctive high-performance visual representation of the market.

### Outcome

Users can explore securities as an interactive relationship graph.

### Scope

- Graph domain model
- Sector/industry relationships
- Correlation relationships
- Graph-layout generation
- WebGL renderer
- Node sizing
- Node movement/anomaly encoding
- Edge strength
- Hover/select interactions
- Filtering
- Sector clustering
- Live visual updates

### Exit criteria

The tracked universe can be explored smoothly as an interactive graph, and unusual securities are visually obvious.

---

# Epic 7 — Deterministic Investigation Engine

### Goal

Create the investigation system before introducing an LLM.

### Outcome

Users can launch a structured investigation into an anomalous security and see deterministic analytical steps execute.

### Scope

- Investigation domain model
- Investigation lifecycle
- Investigation steps
- Analytical tool interfaces
- Security snapshot tool
- Return-percentile tool
- Volume-anomaly tool
- Peer-comparison tool
- Market-breadth tool
- Correlation tool
- Investigation orchestration
- Streaming investigation events
- Cancellation
- Partial failure handling

### Exit criteria

Selecting:

> Investigate NVDA

runs a structured workflow such as:

- measure price anomaly;
- measure volume anomaly;
- compare peers;
- compare market;
- calculate breadth;

and streams the results into the UI.

No LLM is involved yet.

---

# Epic 8 — Evidence & Investigation Workspace

### Goal

Turn analytical results into an understandable investigation experience.

### Outcome

Users can inspect the evidence behind an investigation rather than receiving a collection of raw calculations.

### Scope

- Investigation workspace
- Evidence domain model
- Finding domain model
- Evidence cards
- Confidence/evidence-quality states
- Comparison charts
- Investigation timeline
- Investigation-step status
- Evidence provenance
- Evidence-to-chart linking
- Findings-to-evidence linking
- Failed/partial investigation states

### Exit criteria

A deterministic investigation results in an understandable collection of findings such as:

> The move is broader than NVDA but concentrated within semiconductors.

and the user can inspect the exact calculations supporting that statement.

---

# Epic 9 — Corporate Filing Evidence

### Goal

Add primary-source company information to investigations.

### Outcome

MarketPulse can identify whether relevant SEC filings occurred near a market event.

### Scope

- SEC EDGAR integration
- CIK/security mapping
- Recent-filing retrieval
- Filing metadata
- Filing timeline events
- Selected filing types
- Filing viewer/linking
- Filing evidence records
- Investigation filing-check tool
- Filing-source provenance

### Exit criteria

An investigation can reliably state either:

> A new 8-K was published at 10:31 ET.

or:

> No recent SEC filing was found.

with inspectable primary-source evidence.

---

# Epic 10 — AI-Assisted Investigations

### Goal

Allow an LLM to dynamically direct investigations using the existing deterministic analytical system.

### Outcome

Users can investigate market behaviour conversationally without giving the model authority over calculations.

### Scope

- LLM-provider abstraction
- Agent execution service
- Tool-calling protocol
- Agent event protocol
- Investigation context
- Streaming agent activity
- Stream keep-alive inside the platform's 240-second ingress idle timeout
- Findings generated from tool results
- Follow-up questions
- Agent cancellation
- Tool failure handling
- Confidence language
- Guardrails against investment recommendations
- Logging/tracing of agent activity

### Exit criteria

A user can ask:

> Why is NVDA falling?

and the agent chooses appropriate analytical tools, streams its investigation, and produces evidence-backed findings.

The model never directly invents authoritative numerical results.

---

# Epic 11 — Generative Workspace

### Goal

Allow the AI to change how evidence is presented, rather than only responding with text.

### Outcome

Natural-language intent dynamically changes the analytical workspace.

### Scope

- Typed workspace-command schema
- Command validation
- `focusSymbols`
- `openChart`
- `compareSymbols`
- `setTimeWindow`
- `highlightGraphNodes`
- `setGraphEncoding`
- `pinEvidence`
- AI-generated workspace commands
- Workspace-command history
- Undo/redo
- User-pinned components
- **A listening pass with a real screen reader, before this epic starts** —
  added 2026-09-15 from Epic 2's close, which owned it to "a person with a
  screen reader, before Epic 11" against a roadmap whose only accessibility
  review is Epic 15's. It is an entry condition rather than a task: this is
  where a model starts driving a live region a person was driving

### Exit criteria

A request such as:

> Is this really a semiconductor sell-off or mostly the largest companies?

can cause MarketPulse to:

- change the graph;
- create a comparison;
- alter chart contents;
- focus the relevant securities;

while still using only trusted frontend components.

---

# Epic 12 — Investigation Persistence & Branching

### Goal

Make investigations durable rather than ephemeral AI conversations.

### Outcome

Users can leave, return to, continue, and branch previous investigations.

### Scope

- Investigation persistence
- Persisted steps
- Persisted findings/evidence
- Persisted workspace state
- Investigation history
- Resume investigation
- Rename investigation
- Investigation status
- Branch from existing investigation
- Restore workspace
- Investigation audit trail

### Exit criteria

A user can reopen yesterday's investigation, restore its evidence and workspace, and continue investigating from that point.

---

# Epic 13 — Market Replay

### Goal

Introduce historical replay and enforce temporal correctness.

### Outcome

Users can reconstruct a historical market session and investigate it using only information available at that time.

### Scope

- Replay mode
- Global replay clock
- Play/pause
- Replay speed
- Timeline scrubbing
- Historical market-event playback
- Historical anomaly reproduction
- Timestamp-aware analytical tools
- Timestamp-aware SEC queries
- Data-layer future-information prevention
- "Investigate at this moment"
- Agent replay context
- Replay-state visualization

### Exit criteria

The user can select a historical session, stop the clock at a particular time and ask:

> What appears to be happening right now?

MarketPulse cannot access observations or evidence originating after that timestamp.

---

# Epic 14 — Performance & Scale Validation

### Goal

Demonstrate that the architecture can operate beyond the deliberately constrained live-data universe.

### Outcome

MarketPulse contains measurable evidence of frontend and streaming performance.

### Scope

- Synthetic-market generator
- 5,000+ synthetic securities
- 25,000+ graph relationships
- High-frequency update simulation
- Performance instrumentation
- Frame-rate measurement
- Main-thread task measurement
- Streaming-latency measurement
- Web Worker optimization where justified
- Bottleneck analysis
- Published benchmark results

### Exit criteria

Performance targets are reproducible and documented rather than claimed.

### Measured exceptions this epic inherits, rather than re-finds

Recorded here because a finding that lives only in the task file that took it is
a finding somebody measures again from scratch.

- **Every cold load of `/securities` and `/securities/:symbol` spends a
  main-thread task of 50–76 ms**, which exceeds `PRODUCT_SPEC.md` §28's _no
  routine main-thread task >50 ms_ — and it is the **518-row universe table**,
  not the chart. Measured three times in real Chromium against the built
  artefact (2026-09-12, 2026-09-13, 2026-09-15) and attributed from both ends
  every time: the task is present on `/securities` where **no chart exists at
  all**, and absent with a 20-row universe while both plots are still drawn. It
  does not track the bar count. A continuous instrument — the largest gap
  between consecutive `requestAnimationFrame` callbacks — puts every 20-row page
  at **20–33 ms**, which is the floor, and every 518-row page at **66–84 ms**,
  over a 10,385-node document against 848. **§28's target is not amended** — it
  is right, and this is a measured exception to it, handed here by Task 2.14.8
  rather than accepted, because Epic 5 adds a second per-row surface to the same
  screen. This epic's own `EPIC.md` holds the three candidate repairs and the
  re-measure; the trigger is a condition rather than a number — **the first time
  a second surface on this page renders per-row markup at universe scale** — and
  if it fires first, the repair is due then. **It is the same component as the
  entry below and probably the same repair.**
- **`Expand all` on the tracked universe costs 69–87 ms**, which exceeds
  `PRODUCT_SPEC.md` §28's _no routine main-thread task >50 ms_. Taken 2026-09-11
  by Task 2.11.8 against a **production** build in Chromium, four runs; the
  reverse direction (`Collapse all`, 530 rows → 12) is 17–44 ms and the dev build
  is 151–222 ms, which is why the production figures are the ones that count.
  §28's target is **not amended** — it is right, and this is a measured exception
  to it. The argument for accepting it is that the work is neither **new** (the
  same 518 rows are built on every first paint and always have been) nor
  **routine** (a deliberate press, once), and that virtualisation was declined
  with this measurement behind it rather than in ignorance of it. What this epic
  owes it is a re-take on the then-current universe and a decision, not a
  rediscovery.
- **Both re-taken 2026-09-22 by Task 3.6.5 with the feed running, and both
  stand.** Cold load **50–56 ms on seven loads in ten** (from 56–83 on eight)
  and `Expand all` **65–86 ms** (from 80–88 the same day), after a fixed table
  layout from 1024 px up that is not one of the three candidates and does not
  close either. The trigger did **not** fire as worded; a routine per-tick
  breach the live feed introduced was repaired in Story 3.6 instead. The
  epic's own `EPIC.md` carries the table and the verdict.
- **Evaluated a fifth time on 2026-10-09 by Task 4.8.8, unfired, and given a
  SECOND condition — for `/`, because the trigger above is written against
  `/securities` and structurally cannot fire on the landing page.** The clause
  is _the first surface on `/` that renders one element per tracked security_:
  **first** there and **second** on `/securities`, because on `/securities` the
  first such surface already **is** this epic's entry 1 while on `/` it would
  **create** one. Measured with a control: `/` draws **447 nodes and zero
  `<tr>` at 518 securities** and carries **no task over 50 ms in ten cold
  loads**, so **the 518-security payload both routes fetch costs ≈6 ms and the
  518-row markup only one of them draws costs ≈48 ms**. Priced before it fires:
  a 518-element ranked surface takes `/` from **24.7 ms to roughly 60–75 ms** of
  worst frame. The breach above is unchanged and has moved **channel** rather
  than size — `longtask` can no longer see it; the rAF channel reads it on
  **10 of 10** loads. The epic's own `EPIC.md` carries the clause, its price and
  its reversal trigger; `PRODUCT_SPEC.md` §28 carries the method amendment and
  takes **no third exception**.

  **And the UNIT in this section's first bullet is wrong rather than the
  number** (amended 2026-10-12 by Task 4.9.3): the breach is not describable as
  _one main-thread task of 50–76 ms_. Re-taken over 40 interleaved cold loads on
  a production build, every observer proved by a plant on the page that produced
  the figure, it is **one frame of 62.8–77.4 ms** on **10 of 10** loads — script
  26–31 ms, style/layout/paint 34–38 ms — with the worst rAF gap at 50.0–68.5 ms,
  over **10,318 nodes against 765**, against a 20-row control at **0 of 10** and
  an 18.8 ms floor. `CLAUDE.md`, `PRODUCT_SPEC.md` §28 and `docs/GAPS.md` all
  carry this correction; **this file was the one that did not.** The band
  `50–76` stays standing as the dated 2026-09-15 reading it was.

---

# Epic 15 — Portfolio Release

### Goal

Turn the working system into a polished engineering portfolio piece.

### Outcome

Someone encountering MarketPulse for the first time can understand both the product and the engineering behind it.

### Scope

- Production deployment
- Polished demo scenario
- Seeded historical replay
- README
- Architecture diagrams
- Architecture overview
- Agent architecture documentation
- Performance report
- ADRs
- Testing strategy documentation
- End-to-end journey suite — the harness exists, the suite has never had an owner
- Demo walkthrough
- Screenshots/video
- Error-state polish
- Accessibility review
- Final UX polish

### What the accessibility review already has waiting for it

Two observations were measured on 2026-09-11 by Task 2.11.9 and deliberately not
acted on, because both need **a person with VoiceOver or NVDA** rather than an
accessibility tree — which is what this epic's review is and what nothing earlier
in the sequence can be. `e2e/README.md`'s own words: a green axe run is not an
accessibility review. Both are recorded with their reversal triggers in
[`SEARCH-AND-SELECTION.md`](epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
§7.6.

- **Letterspaced micro-labels reach an assistive technology in capitals**, because
  an accessible name is computed from _rendered_ text. Chromium returns
  `FIND A SECURITY`, `COLLAPSE ALL`, `JUMP TO A SECTOR`. Left alone on the
  grounds that no meaning is lost and both available repairs are worse — an
  `aria-label` is a second name nobody reviewing the screen can see. The trigger
  is a name where the capitals change **what** is said rather than how: an
  initialism a reader would spell, or a word a reader would stress.
- **A table with twelve rowgroup headers and zero data rows keeps its seven
  column headings.** With every band collapsed: 13 rows, 12 band headers, 0
  `<td>`s. Whether that reads as a promise of content that is not there depends
  on a real screen reader's table navigation, which an accessibility tree cannot
  answer.

### Exit criteria

A technical interviewer can:

1. understand MarketPulse within a minute;
2. run or access it;
3. see a compelling demo;
4. inspect the architectural decisions behind it;
5. find concrete evidence of performance, agentic UI, real-time architecture and human-in-the-loop design.

---

# Delivery sequence

The intended sequence is:

**1. Foundation**
↓
**2. Historical data**
↓
**3. Live data**
↓
**4. Market overview**
↓
**5. Anomaly detection**
↓
**6. Market topology**
↓
**7. Deterministic investigations**
↓
**8. Evidence workspace**
↓
**9. SEC evidence**
↓
**10. AI investigations**
↓
**11. Generative workspace**
↓
**12. Persistence & branching**
↓
**13. Market replay**
↓
**14. Performance validation**
↓
**15. Portfolio release**

This deliberately puts the LLM relatively late.

By the end of **Epic 8**, MarketPulse should already be a credible non-AI product.

By the end of **Epic 10**, it becomes an agentic product.

By the end of **Epic 11**, it starts demonstrating the particularly interesting AI/frontend interaction we want for the portfolio.

By the end of **Epic 13**, it has its signature capability.

Epics 14–15 then convert the engineering work into demonstrable evidence rather than adding substantial new product scope.
