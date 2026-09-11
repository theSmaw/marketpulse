# CLAUDE.md

Guidance for Claude Code working in this repository.

This file holds **rules, traps and pointers** — things that are true across
sessions and expensive to rediscover. It deliberately does **not** hold
measurements, task histories or figures: those live in `docs/adr/`, in the
subject documents listed under _Where the record lives_, and in the task files
under `planning/`. If you want a number, take it; do not cite one from here.

## What MarketPulse is

An AI-assisted situational-awareness tool for US equities. It detects statistically unusual market behaviour and lets a human or an AI agent investigate it against primary-source evidence. [`planning/PRODUCT_SPEC.md`](planning/PRODUCT_SPEC.md) is the authoritative product definition — read the relevant section before implementing a feature. Each `planning/epic-NN-*/EPIC.md` states that epic's goal, scope, exit criteria and the spec sections behind it; read the current epic's file before starting work on it.

It is explicitly **not** a trading system. It never predicts prices, recommends trades, or produces target prices.

## Non-negotiable architectural invariants

These are the load-bearing decisions. They are cheap to honour up front and very expensive to retrofit — treat a change to any of them as a design discussion, not an implementation detail.

**1. The LLM never calculates.** Every number a user sees comes from deterministic code (an analytical tool or service). The model chooses _what_ to investigate and explains results; it must not produce figures from its own reasoning. If a feature needs a number the tool layer can't produce, add the tool — don't let the model estimate it.

**2. The AI manipulates typed application state, never markup or code.** Agent-driven UI changes are schema-validated `WorkspaceCommand` objects (`focusSymbols`, `openPriceChart`, `compareSymbols`, `setTimeWindow`, `pinEvidence`, …) executed against trusted, pre-existing components. No LLM-generated HTML, JSX, or executable frontend code, ever. Validate → permission-check → execute → record in investigation history.

**3. The product works with the AI switched off.** Every analytical capability must be reachable through direct user interaction. AI accelerates investigation; it is never the only path to a feature.

**4. Temporal isolation is enforced in the data/tool layer, not the prompt.** In replay mode, no component may read data timestamped after the replay clock. This constraint belongs in the data-access and tool implementations so future-information leakage is structurally impossible — never rely on instructing the model to behave. Design data access with this in mind from the first query, even before replay exists.

**5. Confidence and provenance are part of the domain model, not prose.** Findings carry an explicit confidence level — `CONFIRMED` / `SUPPORTED` / `POSSIBLE` / `UNKNOWN`. Evidence records source, event timestamp, retrieval timestamp, calculation method, and a raw-data reference. "Not enough evidence to explain this move" is a correct, first-class outcome, not a failure.

**6. Market-data provenance is displayed, never implied.** The UI must label the feed and must not suggest coverage the plan does not have. (The free Alpaca plan is asymmetric: stored historical bars are consolidated SIP, the live stream is IEX only — so the honest label differs between the two, and Epic 3's live feed must not inherit Epic 2's word.)

**7. Provider abstractions at the edges.** Market data sits behind a provider interface; the LLM sits behind an `AgentProvider` interface (`runInvestigation` / `streamEvents` / `cancel`). No vendor SDK types leak into the domain model.

## Domain model

The core objects, in dependency order — `Investigation` → `Step` → `Finding` → `Evidence`. An **Investigation is a persisted, first-class, long-running object**, not a chat session: it outlives any single AI response and has explicit status (`running` / `awaiting user` / `completed` / `failed` / `cancelled`). Steps have observable status so the UI shows real progress rather than a generic spinner.

The frontend renders investigation state from an ordered stream of typed backend events (`STEP_STARTED`, `TOOL_CALL_COMPLETED`, `FINDING_CREATED`, `WORKSPACE_COMMAND`, `INVESTIGATION_COMPLETED`, …) — never by parsing unstructured model text. This is what makes streaming, cancellation, retries, replay and testing tractable.

Anomaly detection is deterministic and deliberately interpretable: price percentile, volume ratio, relative move vs. sector and market, and breadth, normalised into a 0–100 score. **Every score must carry its explanation.** The score measures "how unusual is this?" — never risk or opportunity.

## Current state

**Epic 1 (Application Foundation) is complete — 13 stories.** A pnpm workspace with three packages plus a browser-test package; a Fastify backend and a React/Vite frontend that both run, build, deploy and are verified in CI; logging with a correlation id, an error contract, configuration, testing at six levels, a CI pipeline, and both halves deployed to Azure.

**Epic 2 (Security Universe & Historical Data) is in progress — Stories 2.1 to 2.8 are complete.** There is a managed PostgreSQL instance, a migration mechanism, a curated tracked universe of 518 securities (S&P 500 plus 15 proxies) rendered at `/securities`, a trading calendar and market-time module, a market-data provider seam, a real Alpaca client, and a bar store holding roughly 48 million real minute bars with a ledger and a nightly catch-up backfill.

**Story 2.9 (Market Data API) is complete.** `GET /market-data/bars` is the wire the bars leave on: a request contract with two window forms, a 10,000-bar cap refused rather than reduced, a live tail stitched to the stored history with the seam labelled, per-series provenance stored on the ledger, caching by validator, and a compressed wire. Its record is `MARKET-DATA-API.md` and ADR 0021.

**Story 2.10 (Frontend Market-Data Layer & Application State) is complete.** How this frontend holds domain state and fetches market data: **no store** and a reason with a trigger, a hand-rolled parsed-series cache bounded twice and with **no clock**, the symbol and window in the URL, a six-member state union in which _partial_ is an answer rather than a failure, cancellation by request identity, eleven recorded response bodies, and a panel that states a real series without drawing it. Its record is `FRONTEND-STATE.md` and ADR 0023.

**Story 2.11 (Security Search & Selection) is complete.** The first interactive control in this product, the address that selection lives at, and the screen four later epics fill: client-side matching over the payload the page already holds, prefix-aware rather than `includes()`, with an untracked security ranked below a tracked one and never omitted; the path naming the security and **no search query in the address, ever**; navigation that is client-side for the first time, which gave module state a lifetime it never had; an input idiom in which a disabled control **stays in the tab order**; the Security Explorer shell placing `PRODUCT_SPEC.md` §8.3's seven contents once, on a grid of spans, every empty region naming the epic that fills it; a band rail and a bulk collapse over 518 rows; and an announcement rate that is **two numbers rather than one**. Its record is `SEARCH-AND-SELECTION.md` and ADR 0024.

**Stories 2.12 to 2.14 remain**: the price chart, the volume chart, and the epic close. Neither chart story _adds_ anything to the security screen — each fills a region that already exists and already names it.

What a user can see today: five routes, a status strip reporting the market feed, backend health and the market clock, and a **Security Explorer** that a person can now use rather than only read. **They can type `nv` and open NVDA** — a search field above the page, matching as they type, ranked, with each result carrying its last close and change and the session those came from; the address becomes `/securities/NVDA` and the link works when somebody else opens it cold. The screen they land on is the full shell: an identity block, then §8.3's seven regions, six of which say in a sentence what they will hold and which epic brings it. Two of those regions hold something today — **one security's real minute bars**, stated as facts rather than drawn, and the tracked universe with its coverage and a real last close for all 518 securities, now grouped into twelve bands with a rail that jumps between them and a control that shuts them all. Every way any of it can fail has an honest sentence, and one `Try again` per screen.

What they still cannot do: **see a chart of anything** (Stories 2.12 and 2.13), change the time window (2.13), or watch a price move — there is still no live data, and the four remaining regions are empty on purpose.

**All of it wears a refreshed design language** (2026-09-10, ADR 0022), **reconciled on 2026-09-11 to the `Component library for MarketPulse` design canvas, which is now the source of truth** (ADR 0026): two self-hosted typefaces in three roles, a crimson identity accent confined to four positions in the chrome, a cool ground, 3px corners, and a six-component building-block layer — `Icon`, `Button`, `Badge`, `Panel`, `PageHeader`, `MetricStrip` — each extracted from something the tree was already doing three times.

For anything more specific than this paragraph — what was measured, what was rejected, what a green check does and does not certify — read the record rather than asking here.

## Where the record lives

This repository documents itself thoroughly, and **that documentation is the source of truth, not this file**. Before designing anything in a subject below, read its document; before re-litigating a decision, read its ADR.

| Subject                                                                                                       | Read                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Every architectural decision, and what each green check certifies                                             | [`docs/adr/README.md`](docs/adr/README.md) — a current index of ADRs 0001–0026                                                                 |
| Hosting, the deployed environment, Azure resources, the database's creation decisions, the credential path    | [`HOSTING.md`](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md)                            |
| The design language, the visual bar, tokens and their rationale                                               | [`VISUAL-LANGUAGE.md`](planning/epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md)       |
| **The source of truth for the design language**, the reconciliation and its one exception                     | [`ADR 0026`](docs/adr/0026-the-design-canvas-as-the-source-of-truth.md) — and the canvas itself, via `DesignSync`                              |
| The browser-test tooling spike and what was rejected                                                          | [`BROWSER-TESTING.md`](planning/epic-01-application-foundation/story-13-end-to-end-browser-testing/BROWSER-TESTING.md)                         |
| Browser-suite rules: what a spec must not assert, the axe decision, what a green run does not certify         | [`e2e/README.md`](e2e/README.md)                                                                                                               |
| Migration and schema conventions, and how to recover from a failed migration                                  | [`apps/backend/migrations/README.md`](apps/backend/migrations/README.md)                                                                       |
| The query layer, the migration tool choice, the temporal seam                                                 | [`DATA-LAYER.md`](planning/epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md)                    |
| What a security is, how the universe is curated, the `status` predicate and its readers                       | [`UNIVERSE.md`](planning/epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)            |
| The trading calendar, market time, the clock seam                                                             | [`CALENDAR.md`](planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md)                      |
| The market-data provider interface, the outcome taxonomy, provenance                                          | [`PROVIDER.md`](planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md)                      |
| Alpaca's measured limits — **dated observations of a third party, re-measure rather than cite**               | [`ALPACA.md`](planning/epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md)                        |
| The bar store, sizing arithmetic, the backfill                                                                | [`BARS.md`](planning/epic-02-security-universe-historical-data/story-08-historical-bar-ingestion-and-storage/BARS.md)                          |
| The market-data wire: the window, the cap, the stitch, provenance's grain, caching, compression               | [`MARKET-DATA-API.md`](planning/epic-02-security-universe-historical-data/story-09-market-data-api/MARKET-DATA-API.md)                         |
| How the frontend holds state and fetches: the store, the cache, the URL, retryable, and what a page announces | [`FRONTEND-STATE.md`](planning/epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md)                |
| Search, selection, the URL rule, the input idiom, the Explorer shell, and the keyboard flow                   | [`SEARCH-AND-SELECTION.md`](planning/epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md) |
| Setup, commands and the running application, for humans                                                       | [`README.md`](README.md)                                                                                                                       |

Every story has a `STORY.md` with acceptance criteria and open decisions, and every task a `TASK-NN-*.md` with what was done and what was found. **Read the STORY.md before starting a story**: several carry open decisions that are deliberately unresolved and should be settled with the user rather than assumed.

## How we work

Work descends epic → story → task, in small iterations. **Do not scaffold ahead of the current step**: build the thin slice asked for, keep it working, then move on. Do not add infrastructure (databases, workers, WebSockets, agent plumbing) before the iteration that needs it.

**Prefer a vertical slice to a layer** wherever the dependency graph allows. A run of stories with no visible change is how a product stops being demonstrable; Story 2.4 was inserted for exactly that reason.

**Every story and task states what the user will be able to see**, and the honest answer is often "nothing". Three rules: say "nothing visible" plainly and name the story that pays it off; describe what is _on the screen_ rather than what was built; and say what the user still cannot do.

**Decisions are recorded with their alternatives and a reversal trigger.** A trigger is a _condition_ ("the first check that fails without a database", "a fifth pinned action"), never a story number — story numbers move, and a trigger written against something that has already happened will never fire.

**Measure rather than cite.** A stated invariant that nothing checks quietly stops being true; re-take a figure rather than carrying one forward, especially one from this file. Corollaries learned the hard way:

- **A break that does not go red is not evidence the check works** — it is equally evidence the break did not land. Verify the substitution.
- **A figure that has moved looks exactly like a figure that was mis-recorded.** Only rebuilding the old commit tells them apart.
- **A sentence duplicated for legibility must be counted with a grep before it is corrected**, and a live claim must be told apart from a historical record. Story files record what was true when they were written; correcting those destroys the record. Amend live claims, leave historical ones.
- **ADRs are never renumbered and their decisions are never rewritten**; a present-tense description of the tree that has become false gets a dated amendment beside it.
- **An applied migration is immutable.** The checksum hashes the whole file, comments included, so editing one — even a comment — makes the next deploy refuse. Applied migrations therefore contain historical claims that are wrong today, and that is the correct state.

**A measurement that falsifies a governing document is swept the same day, not at the story close.** Falsification travels **upward**: a task measures a vendor or the tree, and what it invalidates is a premise in an ADR, an invariant in this file, or `PRODUCT_SPEC.md` — and nothing sweeps upward, because a story close sweeps that story's own documents. Note also that **recording a correction and propagating it are two obligations**, and the mechanism that defers the first — "Task N is the deadline" — routinely covers only the product decision the measurement forces, not the document that was wrong. Grep for the claim, correct the live sites, give an ADR a dated amendment rather than a rewrite, and leave the historical records standing. This has happened: for a day, `ALPACA.md` and ADR 0019 both recorded that `PRODUCT_SPEC.md` §7.1's feed claim was false while §7.1 itself, `README.md`, two other ADRs and invariant 6 here went on asserting it.

**Renumbering a story means remapping every reference in the same change.** A sequence whose numbers do not reflect its order is a trap for every future reader. The technique matters, because the obvious implementation corrupts data: replace only where a `Story`/`Stories` prefix puts it beyond doubt (allowing for the prefix being separated by a newline and a comment marker), **exclude every applied migration**, then read the residue by hand. A blind substitution turns `jiti@2.7.0` into a version that does not exist and `eastus2.5.azurestaticapps.net` into a different hostname.

## The UI bar

**The UI has to be outstanding, and that is a standing instruction rather than a preference.** It must excite the people who see it and must never read as old-fashioned, basic, or like a default admin panel.

This is not in conflict with "dense, sober, institutional" — that describes a category, and the best products in it are exciting because of how well they are made. **Restraint is not the same as plain.** Four tests a stranger can apply to a screenshot: would they believe it is a real funded product; does it look designed rather than defaulted; is there a moment in it worth showing somebody; does it feel alive.

**Visual quality is an acceptance criterion on the story that builds the screen, not polish deferred to a later epic** — polish deferred is polish never, and there is no design-review epic. Correct and accessible is the floor, not the goal.

`VISUAL-LANGUAGE.md` holds the design language and its open questions; it was **rewritten by the 2026 design refresh** (ADR 0022), which gave the product self-hosted typefaces, a crimson identity accent scoped to four positions in the chrome, a cool ground and square corners.

**Since 2026-09-11 that file is no longer the origin of the language** (ADR 0026). The `Component library for MarketPulse` design canvas is the source of truth, reached with the `DesignSync` tool, and the chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**. Where the document and the canvas disagree, the document is wrong; downstream the old rule is unchanged, and a component still may not diverge from the document. There is **one standing exception**: where a canvas value fails a measured accessibility floor, the intent is adopted and the value is not, with the measurement recorded beside the token. It has fired three times — the input boundary, the placeholder ink, and a validated tick the canvas drew in the green this product spends on price-up. Two things from it that are settled and load-bearing: **colour is never the sole encoding of anything** (the price palette differs by 1.04:1 in greyscale, so hue is the entire difference — shape, sign, glyph or word must carry it), and **standing out, like receding, is a job for weight and hierarchy, never for ink outside the contrast floor**. Both have caught real defects.

## Commands

```
corepack enable    # once per machine — pnpm comes from the repo pin, not a global install
pnpm install

pnpm verify        # build → lint → format:check → stories → env:check → links → test → test:process
                   # This is what CI runs, BY NAME. CI defines no step of its own, which is
                   # what keeps one definition of "verified". Runs with no servers, no
                   # database, no network and no credentials — keep it that way.

pnpm build         # tsc -b, THEN the frontend bundle, THEN Storybook. Hardcodes the frontend
                   # package name TWICE — read it whenever a package is added.
pnpm typecheck     # the tsc -b half only; no bundle
pnpm lint          # eslint . over the whole workspace in one process; also lint:fix
pnpm stories       # fails if a component under src/components/ has no stories file
pnpm env:check     # fails if .env.example and CONFIG_VARIABLES have drifted apart
pnpm links         # fails if a relative Markdown link points at nothing. Skips http(s)://
                   # deliberately, so verify never needs the network.
pnpm test          # all packages. Fast by contract: no build, no socket, no database, no network
pnpm test:process  # the backend's process half — spawns dist/index.js. A verify step. ~5s of it
                   # IS the shutdown ceiling elapsing.
pnpm test:database # against a real PostgreSQL server. NOT in verify, NOT in `pnpm test`.
                   # Creates its own database, migrates it, reads it, drops it.
pnpm coverage      # the same tests with --coverage. Not in test, not in verify, gates nothing.

pnpm dev           # all three packages in parallel; all three are real watch loops
pnpm ready         # is the running pair actually up? Three checks. NOT a verify step.
pnpm db            # the local PostgreSQL container. Arguments forwarded: `pnpm db down`,
                   # `pnpm db logs -f`, `pnpm db exec postgres psql …`. `down -v` drops data.
pnpm migrate       # apply pending migrations. Forward-only; REFUSES arguments.
pnpm universe      # load the tracked universe. A seed, not a migration: it converges on the file.
pnpm universe:check # compare the curated universe against the vendor. Changes nothing. Needs network.
pnpm bars          # fetch and print one symbol's bars. Read-only, stores nothing. Metered request.
pnpm backfill      # fetch and STORE bars. Metered, paced, sequential.
pnpm bars:check    # what is missing from the store, and why.
pnpm e2e           # the browser suite against a pair YOU started with `pnpm dev`.
pnpm e2e:deployed  # the same browser against the LIVE environment. Needs both deployed addresses.
pnpm image         # build the backend container image. Pushes nothing.
pnpm clean         # tsc -b --clean, plus the frontend's dist/ and storybook-static/
pnpm format        # prettier --write .   (also format:check)

# Working on one package — the same six verbs mean the same thing in each:
pnpm --filter @marketpulse/shared build      # or typecheck / lint / lint:fix / test / dev
pnpm --filter @marketpulse/shared run clean  # `run` is REQUIRED here — see below
pnpm --filter @marketpulse/backend start     # runs the BUILT output; build first
pnpm --filter @marketpulse/frontend preview  # serves dist/ on :4173; build first
pnpm --filter @marketpulse/frontend storybook       # the workshop — :6006
pnpm --filter @marketpulse/frontend storybook:build

# Running less than everything. The path is relative to the PACKAGE, and nothing needs a `--`:
pnpm --filter @marketpulse/backend test src/config.test.ts    # one file
pnpm --filter @marketpulse/frontend test PriceChange          # any path substring
pnpm --filter @marketpulse/backend test -t "freezes what it returns"  # one test by name
pnpm --filter @marketpulse/frontend exec vitest --watch       # watch mode; --watch is REQUIRED
```

**First run of a clean clone is five steps** — `pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate` → `pnpm universe` — and **the last two have no symptom if skipped**: an unmigrated or empty database ticks in `pnpm ready`, passes `pnpm verify` and serves `pnpm dev`.

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck`, `clean` and they mean the same thing in each. `lint:fix`, `start`, `preview`, `storybook`, `coverage` and the extra test configs are extras, not part of that convention — a package added tomorrow owes the six.

Docker is a prerequisite for `pnpm db` and `pnpm image` and **nothing else**; install, verify, dev and e2e all run without it. The Playwright browser is a separate explicit command, `pnpm exec playwright install chromium`, once per machine — `pnpm install` fetches no browser.

## Repository map

```
.github/workflows/verify.yml   the pipeline: THREE jobs — verify, e2e, database —
                               all three required checks on `main`
.github/workflows/deploy.yml   migrate → load universe → deploy backend → deploy frontend →
                               check-deployed. Separate workflow, keyed on workflow_run.
apps/backend/                  Fastify server
  Dockerfile, ../.dockerignore read by no tool in `pnpm verify`
  migrations/*.sql             forward-only, sequence-numbered, checksummed, immutable once applied
  scripts/dev.sh               the dev loop; read by no tool in `pnpm verify`
  src/index.ts                 the process: listen, signals, crash handlers, the pool, the only exit
  src/config.ts                one of TWO files reading process.env; CONFIG_VARIABLES lives here
  src/entra-token.ts           the other one — deliberately, so a credential never reaches Config
  src/server.ts                buildServer() — the app, without listening
  src/database.ts              the pool; the only place shipped serving code constructs one
  src/migrate.ts               the migration mechanism (the runner script is a thin wrapper)
  src/schema.ts                the database as Kysely sees it; hand-written, not generated
  src/universe.ts              the tracked universe as typechecked data
  src/market-data-provider.ts  the provider seam; deliberately NOT in packages/shared
  src/alpaca-*.ts              the vendor client: mapping (pure) split from transport
  src/fixtures/alpaca/         RAW recorded vendor bodies. Excluded from Prettier and from
                               line-ending normalisation ON PURPOSE — both would rewrite evidence.
  src/routes/                  health, securities, market-data, diagnostics
apps/frontend/                 React + Vite
  .storybook/                  reuses vite.config.ts; both files sit outside every tsconfig
  public/staticwebapp.config.json   the DEPLOYED host's configuration — part of the artefact
  src/api-client.ts            the ONLY file in the application that calls fetch
  src/use-*.ts                 four hooks; three make network requests, one reads the clock
  src/market/                  the FIRST feature module (§26); its index.ts is its API, and a
                               lint rule forbids importing anything else under it
  src/fixtures/                RECORDED bodies of BOTH requests this application makes —
                               GET /market-data/bars and GET /securities — plus the one shared
                               `fetch` stub. Each has a module collapsing its bodies through the
                               REAL transition, so a story holds a state the app can reach rather
                               than one somebody typed. Formatted, unlike the backend's vendor
                               fixtures — .prettierignore says why. Outside src/market/ on purpose
  src/components/<Name>/       <Name>.tsx + .module.css + .stories.tsx, one component per file
  src/styles/                  fonts.css (three self-hosted faces) → tokens.css (achromatic)
                               → brand.css (the identity accent, chrome only) → market.css
                               (market meaning) → base.css, in that order at the mount;
                               plus type/a11y module layers reached only through `composes:`
  src/routes/paths.ts          every path, once
packages/shared/               domain types shared by both apps; consumed as BUILT OUTPUT
  src/market-time.ts           the ONE module converting UTC ↔ market time (enforced by lint)
  src/market-calendar.ts       a checked-in table of exceptions, 2024–2028; refuses outside it
e2e/                           the browser suite — a fourth workspace package, see its README
scripts/*.mjs                  every root script's mechanism, or a thin wrapper over one in src/
docs/adr/                      the decision record
planning/                      PRODUCT_SPEC.md, EPICS.md, epics, stories, tasks
compose.yaml                   the local database; every value required with no default, so a
                               bare `docker compose up` refuses and names `pnpm db`
```

Files not listed are either obvious or documented where they live.

## Conventions and traps

### Workspace and toolchain

- **Node 24.x is required, not recommended.** `engineStrict` is on, so pnpm refuses to install under another major. Node 23 cannot bootstrap the repo at all — its bundled Corepack has a stale npm signing keyset.
- pnpm settings live in `pnpm-workspace.yaml`, **not `.npmrc`** — pnpm 11 silently ignores workspace settings left there.
- **Install scripts are denied unless named in `allowBuilds`.** When it fires, allowlist the specific package; never disable the check. Note it is keyed on a package **name, not a version**, so one entry can admit any number of scripts.
- **Shared tooling lives at the root; packages declare only what they import.** "Does the package's source `import` it?" is the whole test. ESLint, Prettier, TypeScript, Vite and Vitest are root-only; React and `@types/node` are not.
- **TypeScript is pinned below npm's `latest`** because typescript-eslint's peer range has not caught up and this repo relies on type-aware linting. Check the range before raising it. `@eslint/js` does not share a version line with `eslint`.
- **`pnpm clean` is a pnpm built-in** that removes `node_modules`; the root script shadows it. `pnpm --filter <pkg> clean` dispatches to the built-in and fails — **`pnpm --filter <pkg> run clean`** works. Before claiming any new script name, check it against `pnpm help -a`, and validate the detection against a known built-in in the same run.
- Most root scripts do **not** fan out — the reference graph already orders the work. Only `test`, `dev` and `coverage` use `pnpm -r`.
- `.claude/worktrees/` is in both the ESLint ignores and `.prettierignore`. Anything else nesting a checkout here needs the same two entries.

### TypeScript

- Packages are consumed as **project references with built output**, so build before you typecheck.
- **Typecheck with `tsc -b`, never `tsc --noEmit`.** Against a _stale_ `dist`, `--noEmit` reports success while the code is broken. Every `typecheck` script is `tsc -b` for this reason.
- **Relative imports carry `.js` extensions** from `.ts` files (`./ticker.js`, `./App.js` for an `App.tsx`), and every package needs `"type": "module"`. `nodenext` requires the _emitted_ filename. **`tsc` is the only enforcer** — Vite, Rolldown and Vitest all resolve happily without it, so a green build or a green test suite is not evidence the convention was followed.
- **`tsc -b --clean` deletes the output of the sources that _currently_ exist.** Delete a source by hand and its `dist/` files survive every subsequent clean, forever. Clean _before_ deleting. The mirror: deleting `dist/` by hand while leaving `tsconfig.tsbuildinfo` makes `tsc -b` emit **nothing**, because it still believes the output is current — `pnpm clean` is what is needed.
- `tsconfig.base.json` deliberately omits `noUnusedLocals`/`noUnusedParameters`; `@typescript-eslint/no-unused-vars` owns that. Don't add them back. Every option in that file carries a comment saying why — change one, change the comment.
- `apps/frontend` sets `noEmit`, which is what resolves the `dist/` collision between `tsc` and Vite. Safe **only** because it is referenced by nothing; it would be actively wrong for `packages/shared`.
- **`exactOptionalPropertyTypes` is on**, so "absent" and "present as `undefined`" are different types. A constructor with an optional parameter has to branch and build the object two ways. This is the setting behaving correctly, not friction to route around.

### Lint and format

- One `eslint.config.mjs`, and **the block order is load-bearing**: ignores → recommended → type-aware TS → per-package globals → React → Storybook → `disableTypeChecked` **last**. Seven-plus config files depend on that trailing block; without it they are a hard parsing error, not a silent skip.
- Linting is **type-aware**, so `packages/shared` must be built for it to mean anything, and `no-undef` is off for `.ts` (undefined-global errors come from tsc). It _is_ an error in `scripts/*.mjs`, which is why those have a globals block.
- **`--max-warnings 0` is in every lint script.** Plugin rules at `warn` severity would otherwise pass CI with real findings in them.
- Take a plugin's config from **`configs.flat`** / **`configs["flat/recommended"]`**, not the unprefixed one — both exist, the unprefixed is eslintrc-shaped, and ESLint 10 rejects it outright.
- **`eslint-config-prettier` is deliberately not installed** — measured, zero formatting rules are enabled. If a real conflict appears it goes last.
- Every Prettier option is explicit even where it restates a default, so an upgrade cannot quietly restyle the tree. LF is stated in three places (`prettier.config.mjs`, `.editorconfig`, `.gitattributes`) and all three must agree.
- **Four `no-restricted-syntax` rules hold acceptance criteria that used to be prose**: constructing an `Intl.DateTimeFormat` or spelling the market's timezone identifier anywhere but `packages/shared/src/market-time.ts`, and `Date.now()` or a **zero-argument** `new Date()` anywhere in `packages/shared/src`. What they cannot see is a conversion that hard-codes an offset and names no timezone.

### Frontend

- **The browser boundary is a lint rule, not the tsconfig `types` array.** The array stops auto-discovery but cannot stop a `/// <reference types="node" />` inside a declaration file the stories drag in — so `process` typechecks in browser code. `no-restricted-globals` and `no-restricted-imports` over `apps/frontend/src/**` are the only thing standing there. Both things downstream of tsc are silent: `process.env.X` compiles to `{}.X`, and `import "node:path"` **builds at exit 0**.
- **CSS Modules have one idiom: `cx(styles.a, styles.b)`.** Template interpolation is a lint error under `noUncheckedIndexedAccess`, and bracket access is a `dot-notation` error. A single class handed to a component whose `className` accepts a function needs `cx()` too — that is a hard `TS2375`, not a redundancy.
- **A CSS Module class-name typo is completely silent.** It typechecks, lints, builds and renders unstyled. Nothing in `pnpm verify` catches it.
- **Nothing below `pnpm e2e` can see a layout.** jsdom applies no stylesheet and computes no layout, so a grid whose column count or spans are wrong renders identically to a correct one in every unit, component and integration test. The specific trap, measured in Chromium on 2026-09-11: **a `span N` item wider than the explicit grid is not clamped to it — it grows implicit columns.** A `span 3` region in a two-track grid produced `134px 134px 676px`, a visibly broken page at every width under 1184px, with `pnpm verify` and all 54 browser tests green. Every breakpoint that narrows a grid must restate its spans.
- **`composes:` is legal only in a rule whose selector is a single class**, and it fails the _build_ rather than doing nothing. It emits each composed rule exactly once, so never import a `composes:` target from `main.tsx`. **A `composes` change does not reliably hot-reload** — restart the dev server before believing any measurement of a break in one.
- **CSS is the source of truth for design tokens**; `styles/tokens.ts` is a typed cached reader over `getComputedStyle`. Everything reads back as a _string_. It throws at startup if a declared token is missing from the stylesheet — which is the point.
- **No stylesheet is applied in the test environment**, so `getTokens()` throws there and "do not assert on colour" is structural rather than a discipline. A browser is the only level that can see contrast.
- **Focus is the token layer's job**, one global `:focus-visible` rule. A component declaring its own is answering a question already answered.
- The workshop line: a `.tsx` under `src/components/` owes stories, anywhere else does not. The test is _does it have states worth reviewing side by side?_ The rule is enforced in **one direction only** — a stateful component dropped into `src/routes/` escapes silently.
- **axe's scope changes the answer.** The Storybook addon scopes to `#storybook-root`; a whole-document run adds page-level rules a story fragment structurally cannot satisfy. Never compare the two. A permutation grid conflicts with landmark uniqueness only for landmarks with **no accessible name**.
- **Frontend configuration is substituted at build time**, so one artefact cannot be promoted across environments — pointing the app at a different backend is a _rebuild_, not a setting. A `VITE_` prefix is a boundary against accidents, not a permission: prefixing a credential puts it in a file every visitor downloads.
- `base` and `basename` are one input with two readers. Setting only Vite's `base` gives an app that loads perfectly and renders the not-found route at its own address, with every link pointing off the deployment.
- **`vite preview` is not a static host** and neither is the deployed one — three hosts, three behaviours for an unmatched path: `python3 -m http.server` 404s, `vite preview` splits on the `Accept` header, Azure Static Web Apps splits on path. Never write "the SPA fallback" without saying which host you mean.
- **A sticky header occludes focus, and the browser's own scroll-into-view does not know it.** Sequential focus navigation — every press of Tab — scrolls the target to the top of the scrollport and stops, which parks it behind the chrome. Measured 2026-09-11 on `/securities/NVDA`: **one** occluded stop at 1440×900, **four** at 768×800 and **two** at 390×780, and it **worsens as the viewport narrows** because the status strip wraps — so a development machine shows the least of it. jsdom has no layout and axe reads zero violations throughout, because this is a fact about where a scroller stopped rather than about a DOM. The one repair is `scroll-padding-top` on the scroll container, and it cannot be a token: `--app-header-height` is the masthead only and the chrome's real height exists at three values, so `AppHeader` measures the element and publishes `--sticky-chrome-height`. **It does not help a target taller than the viewport** — the browser does not scroll something it already considers in view.
- **A natively `disabled` control is not focusable, so anything `aria-describedby` hangs off it is unreachable.** A description is read when a control is _reached_. This shipped for two tasks: search's unavailable states carried a correct, attached, visible sentence that no key press could get to. `TextField` therefore renders `aria-disabled` + `readOnly` rather than `disabled`, product-wide — **and the consequence has to be followed**: the state stops being inactive, so WCAG 1.4.11's and 1.4.3's exemptions stop covering its border and its ink.
- The React Compiler rules (17 of them, all effectively at error) **first fired on 2026-09-11**, on Story 2.11's combobox — the first component in the tree with real interactive state. Until then they had never fired, which was evidence that nothing had yet written the shape they dislike rather than that the tree satisfied them. Both catches were correct and both repairs were _simpler_ than the code they replaced: `refs` rejected a value written to a ref during render that never needed to survive one, and `set-state-in-effect` rejected clearing a live region from an effect body when the empty state was derivable. Expect them on anything holding state; treat a firing as a design note rather than a rule to route around.

### Backend

- **`config.ts` throws and never exits**, validates on call rather than on import, and reports _every_ bad key rather than the first. `index.ts` is the only thing that exits.
- **The resolved configuration is never logged.** `redact` was rejected as a denylist whose failure mode is the key nobody added.
- **There is no `NODE_ENV` and nothing branches on which environment it is in.** What differs is where _values_ come from. The reversal trigger is the first thing that must _behave_ differently rather than be _configured_ differently.
- **Every route that can fail must declare `500: apiErrorSchema`**, and nothing in `pnpm verify` checks that you did — a test walking the route table does.
- **`fast-json-stringify` strips every property the schema does not declare.** That is the mechanism behind "no internal detail reaches a client", and it means **a leak test that passes may be testing the schema rather than the handler**: adding a field to a handler's response leaves the test green until the field is declared in the schema too.
- Declare a response schema's properties `satisfies Record<keyof TheType, JsonSchemaProperty>`. A field on the interface and not in the schema is then `TS1360` rather than a value that silently vanishes on the wire. **Copy this idiom for every new route.** Two gaps remain: a declared JSON type disagreeing with the TypeScript one is coerced silently — produced twice, and the pair is what makes it land: a `null` under `"string"` reaches the wire as `""`, and a `null` under `"number"` reaches it as **`0`**, a plausible price rather than a visibly empty string, and a `required` property the handler omits is a runtime 500.
- **A 5xx never carries the thrown message.** A message written for a developer is internal detail too.
- **Fastify writes one listening line per bound interface, loopback first**, so the first line reads `127.0.0.1` whatever you set. Check the socket, not the log. At `warn` and above a healthy server is completely **silent** — anything waiting on a startup line hangs rather than fails.
- **CORS is not access control.** With a string origin the server asserts the allowed origin unconditionally and answers 200; the _browser_ compares and refuses. So a wrong allowlist is invisible to `curl` in the status, the body and the log — the one readable trace is that `access-control-allow-origin` echoes the configured value, which an instrument _told the frontend's origin_ can compare. Note `methods` defaults to `GET,HEAD,POST`.
- **`pg` has two dangerous defaults, both absences.** A `Pool` is an `EventEmitter`, and one with no `error` listener _throws_ — so a dropped idle connection becomes an uncaught exception and a crash loop on a liveness-probed platform. And `connectionTimeoutMillis` defaults to **0, meaning wait forever**.
- The database credential is a **function**, not a value, because `pg` calls it once per _connection_ — which is what makes a per-connection minted token work.
- **An `onSend` hook cannot remove `Content-Length`.** Fastify computes it from the payload after every `onSend` hook has run, so a hook that deletes the header gets it back. Measured against a running server, attempted and reverted — it is the sort of thing the next person reaching for a response hook otherwise spends an hour on.
- **`@fastify/compress` attaches its `onSend` per route via `onRoute`, so Fastify runs it after every instance-level hook.** Which means the hook-ordering trap — a compressor registered ahead of a validator strips every `ETag`, with nothing on screen wrong and every `app.inject()` test green — is not reachable through that plugin at all. Worth knowing before designing around it: the order is decided by the attachment mechanism rather than by registration order.
- **An ordering assertion needs a marker on each side of the step it is about, and the marker must travel with the step.** A log line further down the function does not move when the step does, so the break passes.

### Data layer

- **Migrations are forward-only. There is no `down`.** A `down` that has never been executed is a claim rather than a mechanism.
- **Filenames are a four-digit sequence, not a timestamp.** Two branches adding `0002_*` is a merge conflict a human resolves; two timestamps merge cleanly and then apply in an order neither author tested.
- **Never edit a migration that has been applied.** The checksum hashes the whole file including comments, and the deploy refuses.
- **Kysely wraps the whole run in one transaction**, not one per migration — a run of three whose third fails rolls back all three. Its advisory lock is session-level with a one-hour timeout, so a runner that _hangs_ holds it; anything driving `pnpm migrate` needs its own deadline.
- **`migrateToLatest()` resolves rather than throwing.** A runner that does not read `error` and exit non-zero itself is a green migration step that applied nothing.
- **The temporal seam is an arrangement, not a mechanism yet.** Five modules build their own Kysely handle and none exports it, so a call site cannot bypass the seam by importing the raw handle — but Epic 13's plugin that would make invariant 4 _structural_ is still unwritten. See ADR 0015's gap 4. Do not export a handle.
- **Story 2.3's `status` column is this schema's one invisible predicate.** Filter on it when computing over the market we track _now_; never when showing or replaying something we _stored_. Epic 13's replay must not filter.
- **Seed data is not a migration.** A migration runs once and is refused if edited; the universe loader converges on the file, so an edited row is picked up.
- A row and a domain object are different types. What maps between them lives beside the query, **one function per domain type, never a generic mapper** — the mapping is exactly where a nullable column becomes an explicit domain answer, and a generic mapper is where that decision gets skipped.
- **Money is `numeric`, never a float**, and prices are aggregated in SQL rather than in JavaScript. Float addition is not associative, so a sum can disagree with itself between two renders because a query plan changed the order.
- **`timestamptz` always.** A row carries `observed_at` (when it was true in the market) and `recorded_at` (when we wrote it); `observed_at` **never** has a default, because `default now()` silently turns one into the other on the column replay keys on.

### Tests

- **Six levels: unit, integration (`app.inject()`), component (jsdom), process (spawned child), database (real server), browser (real Chromium).** `pnpm test` runs three of them.
- **Tests live in `src/` beside their subject**, `<subject>.test.ts(x)`. This is forced: ESLint's project service only discovers a `tsconfig.json`, so a test outside the package's `include` loses the whole type-aware pass. The price is that two packages emit compiled tests into `dist/` (unreachable through the `exports` map, and subject to the `--clean` orphan rule).
- **One `vitest.config.ts` per package and no root config.** `apps/backend` has three, and their globs are **one decision**: nothing enforces the naming, so a process-style test named `foo.test.ts` runs in the fast suite and a `foo.database.test.ts` in another package runs **nowhere at all**.
- **Scope `test.include` to `src`** — Vitest's default exclude is only `node_modules` and `.git`, so with `dist/` populated every test runs twice, the second copy from the last build.
- **`apps/frontend` needs `setupFiles` calling `afterEach(cleanup)`** because `globals` is off, so Testing Library cannot register its own. The symptom lands in a _later_ test as "found multiple elements".
- **`renderWithContext` passes the router as Testing Library's `wrapper`, and that is load-bearing rather than stylistic.** `rerender(next)` replaces the **root** it was given, so a provider written around `ui` at the call site is thrown away by the second render — the component then throws `Cannot destructure property 'basename'`, from the rerender, several assertions after the one that read correctly. Any provider added there goes in the wrapper for the same reason.
- **The frontend's globs must admit `.tsx`.** A component test under a `.ts`-only glob is silently skipped; a wholly-empty run is loud, a partial one is not.
- **`coverage.include` must be explicit**, or the denominator is "files some test happened to load" and a package reports 100% with an empty table. A single-file coverage run is not that file's coverage.
- **Two 0% entrypoints are in the denominator deliberately.** `index.ts` at 0% means "no runner instruments a spawned child", not "untested" — it is the best-tested file in the backend by behaviour. There is no coverage threshold, and that is argued rather than omitted.
- **What a test must not assert**: colour (structurally impossible); a single element's text where a component splits it (assert the concatenation a screen reader is handed); a `useId()` value or a DOM snapshot containing one; a boundary reset recovering state that lives _above_ the boundary; a throw escaping `fireEvent` from an event handler; the `.js`-extension convention; a CORS rejection through `app.inject()`; an axe pass as accessibility coverage; latency without a large n.
- **Two ways to run tests fail green.** A non-matching `-t` reports skips and exits **0** — read the skipped count, not the exit code. And `pnpm test -- -t "x"` forwards the `--` literally, so the filter is ignored and the _whole_ suite runs, reporting success. Only a non-matching path is loud.
- **A green run certifies internal consistency, not a vendor.** Every fixture-backed test passes against a corpus we wrote.

### CI and deployment

- **The pipeline runs `pnpm verify` by name and defines nothing of its own.** The moment a workflow re-lists the tools, the reversal cost of the CI provider becomes the definition of "verified". `verify.yml` holds three jobs — `verify`, `e2e`, `database`.
- **Three required status checks on `main`: `verify`, `e2e`, `database`.** They live in a repository ruleset, which is invisible in a diff and readable by no tool here — **this file and ADR 0010 are the only durable record**. A reader finding fewer than three should read that as a gate having been removed rather than never set. They key on **job names**, so renaming a job un-requires it silently.
- **The badge keys on the workflow FILE name and the required check on the JOB name.** Renaming the file without moving the badge leaves it frozen green for a window and then a broken image — the wrong signal arrives first.
- **Only the pnpm store is cached. No build output, ever.** A restored `dist/` can carry orphans from a branch where a source was deleted, and the measured prize is smaller than the runner-to-runner spread.
- **`continue-on-error` makes a step's `conclusion` read `success` however it exited** — the real result is `outcome`. Never write a later step's `if:` against a marked step's conclusion, and never read the absence of one as "it was fine". This is what makes "the green tick certifies the chain and not coverage" structural.
- **Actions are pinned to commit SHAs**, which means they do not follow security releases; Dependabot watches `github-actions` only.
- **`deploy.yml` is a separate workflow** keyed on `workflow_run` of `verify`, for three reasons that are all properties of a workflow: the badge must not report a deployment, a cancelled deploy is a half-done rollout, and the required check keys on the job name. It builds nothing of its own — `pnpm build` and `pnpm image` by name.
- **There is no repository secret.** GitHub authenticates to Azure with a federated OIDC credential, and the Static Web Apps token is fetched at the moment of use.
- **The deploy migrates the database and loads the universe before either half of the code rolls.** A deploy that fails afterwards leaves the schema **ahead of** the code, which is survivable only while migrations are additive — a destructive change is two deploys, expand then contract, enforced by nothing.
- **Rollback is asymmetric.** The backend rolls back in seconds by pinning a previous image digest, and is **silently undone by the next merge**; the frontend has no revision history at all, so its rollback is a revert commit through the whole pipeline. `workflow_dispatch` is a re-deploy, not a rollback.
- **The frontend's upload is not atomic.** For roughly two seconds around a deploy that changes the artefact, a cold load can be broken — in two distinct ways, and the window _opens_ at the second the deploy step reports success. Anything checking the deployed page must poll for coherence rather than check once.
- **A deployed check runs after a merge, so it gates nothing** — its output is a rollback decision. Which is also why the axe rule is asymmetric: a **gate** before the merge, a **report** after it.
- **A check that runs from one machine over one link cannot tell its own network from the environment.** Probe more than one host before calling something an outage.

## What `pnpm verify` does not cover

Known, deliberate, and worth re-checking rather than citing — the one-liners are `prettier --file-info <path>` and `eslint <path>`.

1. **Files no tool reads.** `apps/backend/scripts/dev.sh`, the `Dockerfile`, `.dockerignore`, and every `migrations/*.sql` — all report `"inferredParser": null` to Prettier and `File ignored` to ESLint. That last set grows by one per migration. `shellcheck`, `hadolint` and a SQL linter are each declined on a one-file argument.
2. **Shell inside JSON strings.** Three `clean` scripts carry `rm -rf` fragments.
3. **Stated invariants nothing checks.** The largest are: the local Postgres version pin against the deployed server's (a check would need Azure credentials, which `verify` deliberately lacks); the three Vitest globs' naming convention; the absence of a `test` script in `e2e/package.json`, which is the only thing keeping the browser suite out of `pnpm test`; the two `axe-core` pins that must match; and a retry wrapper's deadline precondition, whose failure is invisible because the caller receives the real cause rather than an error saying "I did not try". Three added at Story 2.9's close, all of the same class — a claim that is true today and checked by nothing:
   - **`database.ts` matches `pg-pool`'s connection-timeout MESSAGE STRING**, because that one failure carries no code at all. A driver upgrade that rewords it silently downgrades a timed-out pool from 503 to 500 — a well-formed answer naming the wrong thing. Re-measure: point a backend at a port nothing listens on and read the code in the body (`DATABASE_PORT=59999 node dist/index.js`, then `curl /securities`).
   - **The five-minute ceiling is spelled twice** — `CLOSED_ANSWER_SECONDS`' 300 in the `Cache-Control` header and the derived `CLOSED_ANSWER_TTL_MS` in the cache — and the two agreeing is what makes "five minutes is the ceiling on how long anything in this system serves an invalidated body" true. They are derived from one constant today, so it holds by construction; what nothing checks is that a later edit keeps them derived. Re-measure: `grep -n "CLOSED_ANSWER" apps/backend/src/http-cache.ts`.
   - **Nothing in `verify` negotiates a content coding against a deployed host**, so "the Azure Container Apps ingress passes `Content-Encoding` through untouched and adds none of its own" is checked by one `curl` at one moment. Re-measure: request a large route with `Accept-Encoding: br` and confirm the answer comes back **uncompressed** — an ingress compressing on its own behalf would serve brotli.

   Two added at Task 2.11.7, both properties of a screen rather than of a module:
   - **The Security Explorer's grid has the number of columns it claims.** See the layout trap under _Frontend_ above for how it failed and why nothing in `verify` could see it. `e2e/specs/security-explorer-shell.spec.ts` is the only instrument that can, and its red was verified by restoring the break rather than assumed. Re-measure: delete the `.full` override inside `SecurityExplorer.module.css`'s two-column media query and confirm test 2 of that spec fails.
   - **The six placeholder regions name a plan the roadmap still holds.** An epic that ships without filling its region leaves a sentence that was true when written and is false afterwards, and nothing compares the route's `filledBy` strings against `planning/EPICS.md`. Re-measure: `grep -n 'filledBy="Epic' apps/frontend/src/routes/SecurityExplorer.tsx` and read the epic list beside it.

   Four more at Story 2.10's close, and the first is the most dangerous thing on this list:

   - **The `market` module's `no-restricted-imports` pattern must live inside the browser boundary's own `patterns` array.** ESLint's flat config resolves a rule to the **last** configuration that matched, so a second config object setting `no-restricted-imports` for `apps/frontend/src/**` does not add to the first — it **replaces** it. Reproduced: with the market pattern in a block of its own, `import path from "node:path"` in a frontend source file lints completely clean. The frontend section above records that this rule is the _only_ thing standing where a compile error used to be, so the failure is the browser boundary disappearing with no symptom — and the moment it becomes likely is the obvious, well-meant change, since Epics 3 to 11 add seven more feature modules and the natural way to add the second one's rule is a new block. Re-measure: `import path from "node:path"` in a file that also deep-imports `market/` must produce **two** errors, not one.
   - **`Marker` renders nothing visible unless the row containing it sets `--marker-color`.** The primitive owns the geometry and the silhouette and never the colour. A consumer that forgets renders an **invisible** marker: no error, no warning, correct DOM, green `verify`. It has happened, and it was caught by looking at the page. Six components now set it. Re-measure: delete the custom property from one row and confirm the marker disappears silently.
   - **A live region belongs to a subject and its sentences name it** (`FRONTEND-STATE.md` §7), and nothing at the page level checks that a _new_ asynchronously-filled surface follows the rule. Two polite regions updated in the same moment are queued in an order neither component controls, so an unnamed sentence is a fact with no subject. Enforced by two tests inside `BarSeriesPanel` and by nothing else. Re-measure: add a `role="status"` to any route and confirm nothing goes red.
   - **The recorded response bodies in `apps/frontend/src/fixtures/` must not reach the shipped bundle.** They live under `src/` and are imported by tests and stories only; a fixture pulled into a component by a well-meant import ships a recorded market body to every visitor. Measured 2026-09-10: `dist/` contains none of their bar timestamps. Re-measure: `grep -o "2026-09-04T13:3[0-9]" apps/frontend/dist/assets/*.js` must find nothing. **Amended 2026-09-11 by Task 2.11.6**, which added `fixtures/securities/` — the whole recorded universe, 190,736 bytes of it, by far the largest thing here that must not ship. Re-measure that one by name: `grep -o "Agilent Technologies" apps/frontend/dist/assets/*.js` must find nothing.

   Three added at Task 2.11.9's keyboard walk, all of them properties a green axe run does not touch:

   - **That no tab stop lands behind the sticky chrome.** See the trap under _Frontend_. Held by `e2e/specs/search-keyboard.spec.ts` at **two** viewports and by nothing else, because the 1440 case stays green while 768 goes red. Re-measure: set `scroll-padding-top: 0` in `base.css` and confirm the 768 test fails on three stops.
   - **That every control carrying an explanation is in the tab order.** Nothing compares a component's `aria-describedby` against whether the described element can be focused, and the failing combination — a correct sentence on an unreachable control — renders and lints perfectly. Re-measure: restore `disabled={disabled}` on `TextField`'s input and confirm exactly one browser test fails, at `the search field is not reachable by Tab`.
   - **That a control which changes the page announces that it did.** `aria-expanded` on the universe's bulk toggle is the whole of the feedback a listener gets when 518 rows leave the page, and a name that flips from `Collapse all` to `Expand all` is **not** a substitute — a name is read on arrival at a control. Re-measure: delete the attribute and confirm one component test and one browser test go red.

   Five added at Story 2.11's close, and the first is the one most likely to be undone by accident:

   - **That a navigation between two securities stays CLIENT-SIDE.** Nothing in `pnpm verify` can see it: jsdom has no history and no bundle to reload, so a component test cannot tell a client-side navigation from a document one **at all**, and swapping the table's `Link` for a plain `<a href>` leaves every unit, component and integration test green while the product silently goes back to reloading itself on every symbol. The repair is a one-character import away from happening by accident, and it is held by `e2e/specs/security-navigation.spec.ts` — which does gate a merge — and by nothing else. Re-measure: make that swap and confirm the browser suite goes red on the navigation count while `pnpm verify` stays green.
   - **That a jump lands where a person can see it.** The same class as the grid's column count and a **different mechanism** from the tab-stop entry above: that one is the browser's own scroll-into-view and is fixed by `scroll-padding-top`, this one is a `window.scrollTo`, which ignores `scroll-padding` entirely and must subtract the chrome itself. Held by `e2e/specs/universe-navigation.spec.ts`. Re-measure: delete the `stickyChromeHeight()` subtraction in `jumpToBand` and confirm test 2 of that spec fails.
   - **That two surfaces describing one failure do not use the same words.** Search and the tracked universe render from the same fetch and describe the same event, and nothing refuses a sentence that repeats the other's. It happened **three times in one afternoon**, every time caught by a locator resolving to two nodes rather than by anybody reading the page. Re-measure: give the search's hint the table's own `cause` sentence and watch which tests notice.
   - **That a control is present in every state at all.** The search field was absent from three of its states for two tasks and `pnpm verify` stayed green throughout — a component nobody renders raises nothing. Re-measure: wrap `<SecuritySearch>` in `view.state === "loaded" ?` again and confirm exactly three tests go red.
   - **That the rail's counts sum to every row in the table, and that `initiallyCollapsed` stays unused.** The first is what makes "no band the control cannot reach" true, and is therefore the thing standing between a jump control and the `status` filter `UNIVERSE.md` §12.2 forbids; the second is honest API that no route uses, and a route that started seeding it would reintroduce the collapse-by-default Task 2.11.8 declined, with nothing going red. Re-measure: drop a group from `BandRail`'s `groups.map` and confirm _an untracked security is still reachable through the rail_ fails; and `grep -rn "initiallyCollapsed" apps/frontend/src` must find it in the component and its stories and **nowhere under `src/routes/`**.

   One added at Task 2.12.3, and it is a duplication rather than an absence:

   - **The chart's density breakpoints are spelled twice**, once as a media query in the chart's stylesheet and once in `market/chart-density.ts`, and nothing compares them. It is not avoidable — no stylesheet is applied in the test environment and jsdom computes no layout, so a module reading the breakpoint from CSS could not be tested below `pnpm e2e`. The split is deliberate and is the same one `styles/tokens.ts` already makes: **counts and policies are TypeScript, values are tokens**, so `chartDensity` returns a `compact` flag and the component reads the token pair it selects. The failure is a chart that switches its gutter at one width and its tick count at another — visibly wrong at exactly one region width and nowhere else. Re-measure: move one of the two boundaries and confirm the gutter narrows at a width that still draws five gridlines.

4. **Prose figures.** Documentation publishes numbers nothing regenerates. `pnpm links` closed the _link_ half of this gap; the figures half cannot be closed, because a figure in a sentence has no referent.
5. **Schemas.** `verify.yml`, `deploy.yml`, `dependabot.yml`, `staticwebapp.config.json` and `compose.yaml` are all _formatted_ by Prettier and validated by nothing.
6. **Configuration that exists only on the platform.** The deploy uses `update` and never `create`, so the container app's probes, replica floor, ingress port, `CORS_ORIGIN`, `MARKET_DATA_PROVIDER` and the Alpaca credential exist in **no file in this repository** — as do the database's firewall rules, its Entra administrator, both Postgres roles and their grants, its alerts and its delete lock. `HOSTING.md` is their only durable copy. A diffing script **cannot** be a `verify` step, because `verify` has no credentials; making it one would fork the definition of "verified".

Two of these have caught real defects, so treat the list as live: a stated invariant quietly stopped being true for two stories, and a broken link shipped.

## Intended stack

React + TypeScript, Redux for domain state, RxJS for streaming pipelines and cancellation. Node + TypeScript backend (Fastify). PostgreSQL, optionally TimescaleDB. Sigma.js/WebGL for the market topology, with the graph model kept separate from the renderer.

WebSocket for continuous market data; SSE/streaming HTTP for agent investigation events. These two streams have different semantics and stay separate. Note two ceilings already measured: the inbound HTTP idle timeout means **Epic 10's SSE stream must emit something at least every four minutes**, and the outbound market socket is only safe because the backend runs at a minimum replica count of one — that is a required setting, not a tuning knob.

There is **no state library and no store**, and since Story 2.10 that is a decision with a reversal trigger rather than a deferral (ADR 0023, `FRONTEND-STATE.md` §1): the URL holds the selection, a bounded cache holds parsed series, and state lives in a module as a plain discriminated union whose transition is a pure function — a reducer that has not been told it is one, which is what keeps a later move to a store a re-wiring. The trigger is **the first piece of state two features must agree about that neither owns**. Resist adding libraries before complexity demonstrates the need, and don't introduce a second database in V1 without a measurement justifying it.

## Frontend structure

Feature modules under `app/`: `market`, `topology`, `charts`, `anomalies`, `investigations`, `replay`, `filings`, `shared`. Modules expose domain-level APIs; they do not reach into each other's stores. Create a module when the iteration needs it, not before.

## Delivery order

Fifteen epics, delivered in sequence — see [`planning/EPICS.md`](planning/EPICS.md). Condensed: foundation → historical data → live data → overview → anomaly detection → topology → **deterministic investigations** → evidence workspace → SEC evidence → AI investigations → generative workspace → persistence → replay → performance → portfolio release.

Checkpoints: by end of Epic 8 MarketPulse is a credible non-AI product; Epic 10 makes it agentic; Epic 11 delivers the AI/frontend interaction the portfolio is built around; Epic 13 delivers its signature capability.

**Do not start with the AI.** The investigation engine, its analytical tools, and its event stream must work end-to-end without an LLM first. Only once the Investigation model feels correct should a model be allowed to drive it. This ordering exists specifically to prevent the architecture collapsing into `chat box → LLM → miscellaneous API calls`.

## Failure handling

Agentic failures are normal product states, not exceptions. Degrade incrementally and locally — a failed SEC lookup, analytical tool, or dropped market socket must leave the rest of the workspace and any already-gathered evidence intact and clearly labelled (e.g. "Live feed disconnected — displaying data through 10:42:17"). Never collapse to a global error screen.

## Performance targets

Measured, and published in the repo. Event → application state <250 ms p95 (excluding provider latency); 60 FPS at 500 nodes / 5k edges; >45 FPS in synthetic mode at 5k nodes / 25k edges; no routine main-thread task >50 ms; visible investigation feedback <500 ms after user action, streaming incrementally.

## Out of scope for V1

Brokerage integration, trade execution, portfolios, options, crypto, price predictions, buy/sell recommendations, social sentiment, news aggregation, real authentication, mobile UX, tick-level replay. Don't build toward these.
