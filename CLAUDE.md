# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Epic 1, Story 1.1 complete — all 8 tasks.** The pnpm workspace root, the shared TypeScript baseline and all three workspace packages exist, and the whole thing was verified from a clean clone with an empty pnpm store (Task 1.1.8). The two apps are typed skeletons that import from `@marketpulse/shared` and nothing more — there is no server and no React application yet. Story 1.2 (backend skeleton) and Story 1.3 (frontend shell) are next and can run in parallel.

`README.md` is the human-facing setup and command reference; `docs/adr/0001-*` records why the toolchain is shaped the way it is. Both were written in Task 1.1.8 from the facts below, so a change here usually needs a change there.

```
README.md                          prerequisites, setup, commands — for humans
docs/
  adr/                             architecture decision records (PRODUCT_SPEC §39)
    0001-repository-structure-and-typescript-toolchain.md
package.json                       private workspace root; pins Node and pnpm;
                                   holds every root script and all shared tooling
pnpm-workspace.yaml                workspace globs (apps/*, packages/*) and pnpm settings
tsconfig.base.json                 the one place shared compiler options live
tsconfig.json                      solution file: no sources, just references —
                                   the entry point for root `tsc -b`
eslint.config.mjs                  the one lint config; ESLint is a root-only dependency
prettier.config.mjs                the one format config; Prettier is root-only too
.prettierignore                    build output, lockfile, tsbuildinfo
.editorconfig                      charset, indentation, line endings, final newline
.gitattributes                     `* text=auto eol=lf`; marks the lockfile generated
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

pnpm verify        # build → lint → format:check → test. What CI will run (Story 1.10)

pnpm build         # tsc -b over the solution; builds shared first
pnpm typecheck     # the same command as build, deliberately — see below
pnpm lint          # eslint . over the whole workspace in one process; also lint:fix
pnpm test          # placeholders until Story 1.9
pnpm dev           # per-package, in parallel; only shared's is real today
pnpm clean         # tsc -b --clean; leaves the dist/ directories in place, empty
pnpm format        # prettier --write .  — the whole tree
pnpm format:check  # prettier --check .

# Working on one package — the same six verbs, meaning the same thing:
pnpm --filter @marketpulse/shared build       # or typecheck / lint / lint:fix / test / clean
pnpm --filter @marketpulse/shared dev         # tsc -b --watch
```

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck`, `clean` and they mean the same thing in each. `lint:fix` is an extra, not part of the convention — a local convenience with no root fan-out and no place in `verify`. `test` and the two apps' `dev` are `echo` placeholders until Stories 1.9, 1.2 and 1.3 respectively; `packages/shared`'s `dev` is really `tsc -b --watch`.

**A green `pnpm test` means "no tests exist", not "tests pass".** All three placeholders exit 0, and Story 1.10 will put that tick in CI where it looks exactly like coverage. Don't describe it as passing tests anywhere — not in a commit message, not in a PR, not in this file. Same for `pnpm dev`: it prints two placeholder lines and then sits in shared's `tsc -b --watch`, which is correct today and looks like a hang without this sentence.

Every command in this section was executed from a clean clone in Task 1.1.8 and behaves as written. `README.md` carries the same set for humans; keep the two in step.

**Most root scripts do not fan out, and that is deliberate.** `build`/`typecheck` are a single `tsc -b` over the root solution `tsconfig.json`, because the reference graph already orders the work — `pnpm -r run build` would build `packages/shared` three times. `lint` is a single root `eslint .` because each package's `eslint .` resolves the same root config, so a fan-out starts three ESLint processes each building its own typescript-eslint project service over the same solution. Only `test` and `dev` are genuinely per-package and use `pnpm -r`. Keep the per-package scripts for working on one package; the root ones are the direct call.

The root `tsconfig.json` is a solution file — `files: []` plus three `references`, compiling nothing itself. It does **not** extend `tsconfig.base.json`, and should not: inheriting compiler options would imply it has sources.

**`typecheck` and `build` are the same command on purpose.** Consumers compile against `packages/shared/dist/*.d.ts`, so typechecking this workspace _is_ building it; there is no cheaper correct pass, and a per-package `--noEmit` fan-out is exactly the thing that passes against stale declarations. Both names are kept because they can diverge later without a rename. `packages/shared`'s `typecheck` was `tsc --noEmit -p tsconfig.json` until Task 1.1.7 and is now `tsc -b` like everything else.

`verify` chains with `&&`, so the first failure is the exit code, and a failing package script propagates up through `pnpm -r` (verified: a package `test` exiting 3 gives root exit 3).

`.claude/worktrees/` is in both `eslint.config.mjs`'s ignores and `.prettierignore`. It holds git worktrees — whole second checkouts nested inside the repo — which root-level `eslint .`/`prettier .` otherwise walk into and report on. Anything else nesting a checkout here needs the same two entries.

**Node 24.x is required, not merely recommended.** `engineStrict` is on, so pnpm refuses to install under another major rather than warning. Node 23 additionally cannot bootstrap the repo at all: the Corepack it bundles (0.29.4) has a stale npm signing keyset and fails to fetch the pinned pnpm.

pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc` — pnpm 10+ moved them, and pnpm 11 silently ignores workspace settings left in `.npmrc`.

Dependencies may not run install scripts unless named in `allowBuilds` in `pnpm-workspace.yaml`; an un-allowlisted one fails the install outright. This is deliberate. When it fires, allowlist the specific package — never disable the check.

**Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are all root-only devDependencies — no package declares any of them. pnpm puts the root's `node_modules/.bin` on the PATH of every workspace package script, so `eslint .` and `tsc -b` resolve from a package directory (verified: `pnpm exec tsc --version` reports the pinned 6.0.3 from a package that declares nothing). ESLint's flat config is found by searching upward. `@types/node` is the counter-example and stays in `apps/backend`, because it is a type dependency of that package's code rather than a tool.

Task 1.1.7 considered a pnpm catalog instead — `"typescript": "catalog:"` in each package, version in `pnpm-workspace.yaml` — and rejected it: packages stay self-describing but the workspace ends up with two conventions. One rule is worth more here. Apply the same rule to the next tool.

There is one `eslint.config.mjs` and there should stay one. `.mjs` because the root `package.json` has no `"type": "module"`.

Linting is **type-aware** (`strictTypeChecked` + `stylisticTypeChecked`, via typescript-eslint's project service). Two consequences: `packages/shared` must be built before lint is meaningful, same as typecheck; and `no-undef` is off for `.ts` files, so the per-package `globals` in the lint config change nothing on TypeScript today — they exist for the JS tooling files to come, and the comment there says so. Undefined-global errors in `.ts` come from tsc, not ESLint.

`tsconfig.base.json` deliberately omits `noUnusedLocals`/`noUnusedParameters`: `@typescript-eslint/no-unused-vars` owns that, so one problem is not reported by two tools with different escape hatches. Don't add them back.

**TypeScript is held at 6.0.3 while npm's `latest` is 7.x**, in the root `package.json` and nowhere else — raising the pin is a one-line edit. TS 7 is the native compiler; `typescript-eslint` does not support it yet (peer range `<6.1.0`), and this repo relies on type-aware linting. Don't raise the pin until typescript-eslint's peer range admits TS 7 — check it, don't assume it. Last checked 2026-08-30: still `>=4.8.4 <6.1.0` at typescript-eslint 8.68.0. Note `@eslint/js` does _not_ share a version line with `eslint` (10.0.1 vs 10.9.1) — don't pin them in lockstep.

Packages are consumed as **TypeScript project references with built output**, not raw source. So a consumer can only be typechecked after `packages/shared/dist/*.d.ts` exists — build before you typecheck. `tsc -b` handles the ordering itself.

**Typecheck a consumer with `tsc -b`, never `tsc --noEmit`.** Because consumers compile against emitted declarations, editing `packages/shared/src` changes nothing for an app until shared is rebuilt, and `--noEmit` reports success against the stale `.d.ts`. Verified: renaming a shared export leaves `--noEmit` at exit 0 in `apps/backend` while `tsc -b` correctly fails. This is why every package's `typecheck` script — and the root's — is `tsc -b`. Note the precise failure mode: the silent pass needs a _stale_ `dist`, not a missing one. On a tree with no `dist` at all, `--noEmit` does report the cross-package error; `tsc -b` is right in both cases, which is why it is the one wired up.

The apps override exactly four compiler options between them, and each is load-bearing: the backend sets `types: ["node"]` (with `@types/node` pinned to the runtime major, 24.x — not npm's `latest`), and the frontend sets `types: []` plus `target`/`lib` with `"dom"`. The frontend's empty `types` array is not redundant: without it TypeScript auto-discovers every reachable `@types` package, and pnpm's linking puts `@types/node` in reach, so `process` would typecheck in browser code.

Relative imports inside a package carry explicit `.js` extensions from `.ts` files (`./ticker.js`). It looks wrong; `nodenext` resolution requires the _emitted_ filename and errors (TS2835) without it. Every package also needs `"type": "module"`.

Every shared compiler option lives in `tsconfig.base.json` and nowhere else. Packages extend it and add only `include`, `outDir`/`rootDir`, project `references`, and the frontend's `target`/`lib`. Each option in that file carries a comment explaining why it is there — if you change one, change the comment. `lib` is intentionally unset so it follows `target`.

Prettier follows the root-only tooling rule above, and there is one `prettier.config.mjs`. `.mjs` rather than `.prettierrc.json` so each option carries the reason it is set. Every option in it is explicit even where it restates a Prettier default — a Prettier upgrade must not quietly restyle the tree.

**Formatting is Prettier's, correctness is ESLint's, and the two do not overlap.** `eslint-config-prettier` is deliberately **not** installed: of the 138 rules the lint config enables on a `.ts` file, zero are formatting rules, and the only `eslint-config-prettier` "special rule" enabled is `no-unexpected-multiline`, which guards hand-written code rather than fighting Prettier's output. Measured with `eslint --print-config`, not assumed — re-run it rather than trusting this paragraph, and if a real conflict ever appears, `eslint-config-prettier` goes **last** in the flat config array.

`tsconfig.base.json` has no Prettier `overrides` entry and does not need one. Prettier infers the plain `json` parser for it (the `.base.` infix misses Prettier's JSONC filename list), and that parser preserves comments anyway — verified. Don't add one.

LF is stated in three places and all three must agree: `endOfLine: "lf"` in the Prettier config, `end_of_line = lf` in `.editorconfig`, and `* text=auto eol=lf` in `.gitattributes`. `.editorconfig` binds editors only — git still normalises on checkout by its own rules, so `.gitattributes` is what actually prevents CRLF diffs.

Prettier owns the Markdown in `planning/` too, not just code — the docs were normalised in Task 1.1.6 (`*` bullets to `-`, `*emphasis*` to `_emphasis_`, padded tables). Write prose however you like and let `pnpm format` settle it; `format:check` covers those files.

WebStorm needs no per-machine setup: `.idea/prettier.xml` is checked in with `AUTOMATIC` mode plus format-on-save and format-on-reformat, so WebStorm resolves the same `prettier` package and the same config file the CLI does.

All of the above was verified from a clean clone in Task 1.1.8 — fresh `git clone`, empty pnpm store, empty Corepack home — where `pnpm install` then `pnpm verify` exits 0 in about four seconds. The reasoning behind each decision is collected in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`; this file is the operational summary and that one is the record of _why_. Two things a fresh checkout deliberately does **not** prove: the stale-`dist` trap above (a clean clone has no stale `dist` — the evidence is in Tasks 1.1.4 and 1.1.7), and the nested-worktree problem (a clean clone has no worktrees).

Still missing here, and it should be added the moment it exists: how to run a **single** test. Story 1.9 picks the runner.

## What MarketPulse is

An AI-assisted situational-awareness tool for US equities. It detects statistically unusual market behaviour and lets a human or an AI agent investigate it against primary-source evidence. `planning/PRODUCT_SPEC.md` is the authoritative product definition — read the relevant section before implementing a feature. Each `planning/epic-NN-*/EPIC.md` states that epic's goal, scope, exit criteria and the spec sections behind it; read the current epic's file before starting work on it.

It is explicitly **not** a trading system. It never predicts prices, recommends trades, or produces target prices.

## Non-negotiable architectural invariants

These are the load-bearing decisions. They are cheap to honour up front and very expensive to retrofit — treat a change to any of them as a design discussion, not an implementation detail.

**1. The LLM never calculates.** Every number a user sees comes from deterministic code (an analytical tool or service). The model chooses _what_ to investigate and explains results; it must not produce figures from its own reasoning. If a feature needs a number the tool layer can't produce, add the tool — don't let the model estimate it.

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
