# Architecture decision records

Short records of the decisions that would otherwise be re-litigated, or
"fixed" by someone who did not know why they were made. Each one states the
context, the decision, the alternatives that were rejected, and — the part
that earns its keep — the consequences a future reader will otherwise
discover by tripping over them.

They are numbered in the order they were written and never renumbered. A
superseded ADR is not deleted: it gets a `**Superseded by:**` line at the top
and stays, because the reasoning that turned out to be wrong is worth as much
as the reasoning that held.

`PRODUCT_SPEC.md` §39 lists the ADRs the finished repository should carry —
why React, why WebSocket + SSE, why deterministic calculations live outside
the model, why typed generative-UI commands, why event-oriented
investigations, why PostgreSQL/Timescale, why replay time is enforced in the
data layer. Write each one when the decision is actually made, not in advance.

| #                                                                                                          | Title                                                                                        | Status   |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-repository-structure-and-typescript-toolchain.md)                                              | Repository structure and TypeScript toolchain                                                | Accepted |
| [0002](0002-backend-framework-and-server-composition.md)                                                   | Backend framework and server composition                                                     | Accepted |
| [0003](0003-frontend-build-tooling-and-browser-baseline.md)                                                | Frontend build tooling and the browser baseline                                              | Accepted |
| [0004](0004-styling-approach-component-library-and-the-component-workshop.md)                              | Styling approach, component library and the component workshop                               | Accepted |
| [0005](0005-routing-application-layout-and-the-deployable-shape.md)                                        | Routing, the application layout, and the deployable shape                                    | Accepted |
| [0006](0006-configuration-and-the-secrets-boundary.md)                                                     | Configuration, environments, and the secrets boundary                                        | Accepted |
| [0007](0007-logging-the-error-contract-and-failure-containment.md)                                         | Logging, the error contract, and failure containment                                         | Accepted |
| [0008](0008-the-local-development-loop.md)                                                                 | The local development loop: legibility, the browser boundary, ports and readiness            | Accepted |
| [0009](0009-the-test-runner-conventions-and-coverage.md)                                                   | The test runner, where tests live, and coverage on demand                                    | Accepted |
| [0010](0010-continuous-integration-what-the-tick-certifies.md)                                             | Continuous integration: one command, and what the green tick certifies                       | Accepted |
| [0011](0011-deploying-both-halves-and-what-a-green-deploy-certifies.md)                                    | Deploying both halves: two artefacts, two hosts, and what a green deploy certifies           | Accepted |
| [0012](0012-client-side-status-what-a-green-indicator-certifies.md)                                        | Client-side status: two vocabularies, three states, and what a green indicator certifies     | Accepted |
| [0013](0013-browser-testing-two-suites-and-what-a-green-run-certifies.md)                                  | Browser testing: one tool, two suites, and what a green run certifies                        | Accepted |
| [0014](0014-managed-postgres-the-credential-path-and-what-a-reachable-database-certifies.md)               | Managed Postgres, the credential path, and what a reachable database certifies               | Accepted |
| [0015](0015-the-migration-mechanism-the-schema-conventions-and-what-a-green-migration-certifies.md)        | The migration mechanism, the schema conventions, and what a green migration certifies        | Accepted |
| [0016](0016-the-tracked-universe-what-a-green-load-certifies.md)                                           | The security domain model, the tracked universe, and what a green load certifies             | Accepted |
| [0017](0017-the-trading-calendar-market-time-and-what-a-correct-calendar-certifies.md)                     | The trading calendar, market time, the clock seam, and what a correct calendar certifies     | Accepted |
| [0018](0018-the-market-data-seam-provenance-on-screen-and-what-a-fixture-backed-test-certifies.md)         | The market-data seam, provenance on screen, and what a fixture-backed test certifies         | Accepted |
| [0019](0019-the-alpaca-client-a-measured-vendor-and-what-a-recorded-fixture-certifies.md)                  | The Alpaca client, a measured vendor, and what a recorded fixture certifies                  | Accepted |
| [0020](0020-the-bar-store-the-backfill-and-what-a-completed-backfill-certifies.md)                         | The bar store, the backfill, and what a completed backfill certifies                         | Accepted |
| [0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)          | The market-data wire, the grain of provenance, and what a cached response certifies          | Accepted |
| [0022](0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md)    | The design refresh: three typefaces, an identity accent, and what a token change certifies   | Accepted |
| [0023](0023-the-frontend-state-layer-the-cache-with-no-clock-and-what-a-green-frontend-suite-certifies.md) | The frontend state layer: a cache with no clock, and what a green frontend suite certifies   | Accepted |
| [0024](0024-search-selection-and-the-security-explorer-shell.md)                                           | Search, selection, the Security Explorer shell, and what a green interactive suite certifies | Accepted |
| [0025](0025-the-agent-hue-a-second-accent-and-what-authorship-colour-certifies.md)                         | The agent hue: a second accent, and what an authorship colour certifies                      | Accepted |
| [0026](0026-the-design-canvas-as-the-source-of-truth.md)                                                   | The design canvas as the source of truth, and what a reconciled token layer certifies        | Accepted |

**0024 was written on 2026-09-11, out of order, and the gap it filled is worth
remembering.** It was reserved by Story 2.11 and three planning documents cited it by
number while the story was still in flight, so 0025 and 0026 were written into the gap
rather than taking a number another story had already claimed. That is the rule working:
numbers are never reused and never renumbered, and a reserved number is cheaper than a
renumber.
