# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Epic 1, Story 1.1, task 4 of 8 done.** The pnpm workspace root, the shared TypeScript baseline and all three workspace packages exist. The two apps are typed skeletons that import from `@marketpulse/shared` and nothing more — there is no server and no React application yet.

```
package.json                       private workspace root; pins Node and pnpm
pnpm-workspace.yaml                workspace globs (apps/*, packages/*) and pnpm settings
tsconfig.base.json                 the one place shared compiler options live
.nvmrc                             Node 24.20.0
apps/
  backend/                         @marketpulse/backend — skeleton until Story 1.2;
                                   Node types, no server
  frontend/                        @marketpulse/frontend — skeleton until Story 1.3;
                                   DOM lib, no React
packages/
  shared/                          @marketpulse/shared — domain types shared by
                                   backend and frontend; builds to dist/ and is
                                   consumed as a TypeScript project reference
planning/
  PRODUCT_SPEC.md                  authoritative product definition
  EPICS.md                         epic roadmap and delivery sequence
  epic-NN-<slug>/
    EPIC.md                        goal, scope, exit criteria, story index
    story-NN-<slug>/
      STORY.md                     description, acceptance criteria,
                                   open decisions; tasks live alongside it
```

Work descends epic → story → task. Read the STORY.md before starting on a story: several carry **open decisions** (framework, UI library, hosting) that are deliberately unresolved and should be settled with the user rather than assumed.

We are building this in **small iterations**. Do not scaffold ahead of the current step: build the thin slice that is asked for, keep it working, then move on. Do not add infrastructure (databases, workers, WebSockets, agent plumbing) before the iteration that needs it.

Keep this section, and the Commands section, updated as things actually land.

## Commands

```
corepack enable    # once per machine — pnpm comes from the repo pin, not a global install
pnpm install

pnpm --filter @marketpulse/shared build       # tsc -b, emits dist/
pnpm --filter @marketpulse/backend build      # builds shared first, then the app
pnpm --filter @marketpulse/frontend build
```

There is no root-level build/typecheck/lint yet — that is Task 1.1.7. Until then, drive packages with `--filter`.

**Node 24.x is required, not merely recommended.** `engineStrict` is on, so pnpm refuses to install under another major rather than warning. Node 23 additionally cannot bootstrap the repo at all: the Corepack it bundles (0.29.4) has a stale npm signing keyset and fails to fetch the pinned pnpm.

pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc` — pnpm 10+ moved them, and pnpm 11 silently ignores workspace settings left in `.npmrc`.

Dependencies may not run install scripts unless named in `allowBuilds` in `pnpm-workspace.yaml`; an un-allowlisted one fails the install outright. This is deliberate. When it fires, allowlist the specific package — never disable the check.

**TypeScript is held at 6.0.3 while npm's `latest` is 7.x.** TS 7 is the native compiler; `typescript-eslint` does not support it yet (peer range `<6.1.0`), and this repo relies on type-aware linting. Don't raise the pin until typescript-eslint's peer range admits TS 7 — check it, don't assume it.

Packages are consumed as **TypeScript project references with built output**, not raw source. So a consumer can only be typechecked after `packages/shared/dist/*.d.ts` exists — build before you typecheck. `tsc -b` handles the ordering itself.

**Typecheck a consumer with `tsc -b`, never `tsc --noEmit`.** Because consumers compile against emitted declarations, editing `packages/shared/src` changes nothing for an app until shared is rebuilt, and `--noEmit` reports success against the stale `.d.ts`. Verified: renaming a shared export leaves `--noEmit` at exit 0 in `apps/backend` while `tsc -b` correctly fails. This is why both apps' `typecheck` script is `tsc -b`.

The apps override exactly four compiler options between them, and each is load-bearing: the backend sets `types: ["node"]` (with `@types/node` pinned to the runtime major, 24.x — not npm's `latest`), and the frontend sets `types: []` plus `target`/`lib` with `"dom"`. The frontend's empty `types` array is not redundant: without it TypeScript auto-discovers every reachable `@types` package, and pnpm's linking puts `@types/node` in reach, so `process` would typecheck in browser code.

Relative imports inside a package carry explicit `.js` extensions from `.ts` files (`./ticker.js`). It looks wrong; `nodenext` resolution requires the *emitted* filename and errors (TS2835) without it. Every package also needs `"type": "module"`.

Every shared compiler option lives in `tsconfig.base.json` and nowhere else. Packages extend it and add only `include`, `outDir`/`rootDir`, project `references`, and the frontend's `target`/`lib`. Each option in that file carries a comment explaining why it is there — if you change one, change the comment. `lib` is intentionally unset so it follows `target`.

Build/test/lint/dev commands land in Task 1.1.7 (root script orchestration); Task 1.1.8 fills in this section properly, including how to run a single test.

## What MarketPulse is

An AI-assisted situational-awareness tool for US equities. It detects statistically unusual market behaviour and lets a human or an AI agent investigate it against primary-source evidence. `planning/PRODUCT_SPEC.md` is the authoritative product definition — read the relevant section before implementing a feature. Each `planning/epic-NN-*/EPIC.md` states that epic's goal, scope, exit criteria and the spec sections behind it; read the current epic's file before starting work on it.

It is explicitly **not** a trading system. It never predicts prices, recommends trades, or produces target prices.

## Non-negotiable architectural invariants

These are the load-bearing decisions. They are cheap to honour up front and very expensive to retrofit — treat a change to any of them as a design discussion, not an implementation detail.

**1. The LLM never calculates.** Every number a user sees comes from deterministic code (an analytical tool or service). The model chooses *what* to investigate and explains results; it must not produce figures from its own reasoning. If a feature needs a number the tool layer can't produce, add the tool — don't let the model estimate it.

**2. The AI manipulates typed application state, never markup or code.** Agent-driven UI changes are schema-validated `WorkspaceCommand` objects (`focusSymbols`, `openPriceChart`, `compareSymbols`, `setTimeWindow`, `pinEvidence`, …) executed against trusted, pre-existing components. No LLM-generated HTML, JSX, or executable frontend code, ever. Validate → permission-check → execute → record in investigation history.

**3. The product works with the AI switched off.** Every analytical capability must be reachable through direct user interaction. AI accelerates investigation; it is never the only path to a feature.

**4. Temporal isolation is enforced in the data/tool layer, not the prompt.** In replay mode, no component may read data timestamped after the replay clock. This constraint belongs in the data-access and tool implementations so future-information leakage is structurally impossible — never rely on instructing the model to behave. Design data access with this in mind from the first query, even before replay exists.

**5. Confidence and provenance are part of the domain model, not prose.** Findings carry an explicit confidence level — `CONFIRMED` / `SUPPORTED` / `POSSIBLE` / `UNKNOWN`. Evidence records source, event timestamp, retrieval timestamp, calculation method, and a raw-data reference. "Not enough evidence to explain this move" is a correct, first-class outcome, not a failure.

**6. Market-data provenance is displayed, never implied.** Alpaca's free tier is IEX, not consolidated SIP. The UI must label the feed (e.g. `Market feed: IEX`) and must not suggest full US-market coverage.

**7. Provider abstractions at the edges.** Market data sits behind a provider interface; the LLM sits behind an `AgentProvider` interface (`runInvestigation` / `streamEvents` / `cancel`). No vendor SDK types leak into the domain model.

## Domain model

The core objects, in dependency order — `Investigation` → `Step` → `Finding` → `Evidence`. An **Investigation is a persisted, first-class, long-running object**, not a chat session: it outlives any single AI response and has explicit status (`running` / `awaiting user` / `completed` / `failed` / `cancelled`). Steps have observable status so the UI shows real progress rather than a generic spinner.

The frontend renders investigation state from an ordered stream of typed backend events (`STEP_STARTED`, `TOOL_CALL_COMPLETED`, `FINDING_CREATED`, `WORKSPACE_COMMAND`, `INVESTIGATION_COMPLETED`, …) — never by parsing unstructured model text. This is what makes streaming, cancellation, retries, replay and testing tractable.

Anomaly detection is deterministic and deliberately interpretable: price percentile, volume ratio, relative move vs. sector and market, and breadth, normalised into a 0–100 score. **Every score must carry its explanation.** The score measures "how unusual is this?" — never risk or opportunity.

## Intended stack

React + TypeScript, Redux for domain state, RxJS for streaming pipelines and cancellation. Node + TypeScript backend (Fastify or NestJS). PostgreSQL, optionally TimescaleDB. Sigma.js/WebGL for the market topology, with the graph model kept separate from the renderer.

WebSocket for continuous market data; SSE/streaming HTTP for agent investigation events. These two streams have different semantics and stay separate.

Resist adding libraries before complexity demonstrates the need, and don't introduce a second database in V1 without a measurement justifying it.

## Frontend structure

Feature modules under `app/`: `market`, `topology`, `charts`, `anomalies`, `investigations`, `replay`, `filings`, `shared`. Modules expose domain-level APIs; they do not reach into each other's stores. Create a module when the iteration needs it, not before.

## Delivery order

Fifteen epics, delivered in sequence — see `planning/EPICS.md`. Condensed: foundation → historical data → live data → overview → anomaly detection → topology → **deterministic investigations** → evidence workspace → SEC evidence → AI investigations → generative workspace → persistence → replay → performance → portfolio release.

Checkpoints: by end of Epic 8 MarketPulse is a credible non-AI product; Epic 10 makes it agentic; Epic 11 delivers the AI/frontend interaction the portfolio is built around; Epic 13 delivers its signature capability.

**Do not start with the AI.** The investigation engine, its analytical tools, and its event stream must work end-to-end without an LLM first. Only once the Investigation model feels correct should a model be allowed to drive it. This ordering exists specifically to prevent the architecture collapsing into `chat box → LLM → miscellaneous API calls`.

First milestone: display ~100 securities, receive live price updates, calculate an explainable anomaly score, click through to underlying price/volume evidence.

## Failure handling

Agentic failures are normal product states, not exceptions. Degrade incrementally and locally — a failed SEC lookup, analytical tool, or dropped market socket must leave the rest of the workspace and any already-gathered evidence intact and clearly labelled (e.g. "Live feed disconnected — displaying data through 10:42:17"). Never collapse to a global error screen.

## Performance targets

Measured, and published in the repo. Event → application state <250 ms p95 (excluding provider latency); 60 FPS at 500 nodes / 5k edges; >45 FPS in synthetic mode at 5k nodes / 25k edges; no routine main-thread task >50 ms; visible investigation feedback <500 ms after user action, streaming incrementally.

## Out of scope for V1

Brokerage integration, trade execution, portfolios, options, crypto, price predictions, buy/sell recommendations, social sentiment, news aggregation, real authentication, mobile UX, tick-level replay. Don't build toward these.
