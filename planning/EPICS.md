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
- Initial ~100-security universe
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

### Exit criteria

A user can search for a security such as NVDA, open it, and inspect recent historical price and volume data.

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
> Volume 3.8× normal
> Underperforming semiconductor peers

Every score can be explained from deterministic calculations.

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
