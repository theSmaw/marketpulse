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

The architecture should support expansion without requiring a redesign.

The smaller live universe keeps data costs, browser load and historical processing manageable while we establish the core architecture.

A separate synthetic load-testing mode can simulate thousands of securities and millions of observations.

---

# 7. Data sources

## 7.1 Market data — Alpaca

Initial provider: **Alpaca Market Data API**.

Alpaca provides HTTP historical-market-data APIs as well as WebSocket streams for equities and other instruments. Its free stock-data offering currently includes live IEX data; consolidated SIP data requires a different level of access.

MarketPulse should therefore display provenance explicitly:

> **Market feed: IEX**

We must not imply that IEX represents every US exchange.

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

That establishes the domain model on which almost everything else depends.

Once that works, implement an Investigation as a deterministic workflow.

Only after the Investigation model feels correct should an LLM be allowed to drive it.

This prevents the product architecture from accidentally becoming:

`chat box → LLM → miscellaneous API calls`

and gives us instead:

`market system → analytical tools → investigation model → agent → generative workspace`

That architectural distinction is the heart of MarketPulse.
