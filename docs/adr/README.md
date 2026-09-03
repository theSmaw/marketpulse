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

| #                                                                             | Title                                                                              | Status   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| [0001](0001-repository-structure-and-typescript-toolchain.md)                 | Repository structure and TypeScript toolchain                                      | Accepted |
| [0002](0002-backend-framework-and-server-composition.md)                      | Backend framework and server composition                                           | Accepted |
| [0003](0003-frontend-build-tooling-and-browser-baseline.md)                   | Frontend build tooling and the browser baseline                                    | Accepted |
| [0004](0004-styling-approach-component-library-and-the-component-workshop.md) | Styling approach, component library and the component workshop                     | Accepted |
| [0005](0005-routing-application-layout-and-the-deployable-shape.md)           | Routing, the application layout, and the deployable shape                          | Accepted |
| [0006](0006-configuration-and-the-secrets-boundary.md)                        | Configuration, environments, and the secrets boundary                              | Accepted |
| [0007](0007-logging-the-error-contract-and-failure-containment.md)            | Logging, the error contract, and failure containment                               | Accepted |
| [0008](0008-the-local-development-loop.md)                                    | The local development loop: legibility, the browser boundary, ports and readiness  | Accepted |
| [0009](0009-the-test-runner-conventions-and-coverage.md)                      | The test runner, where tests live, and coverage on demand                          | Accepted |
| [0010](0010-continuous-integration-what-the-tick-certifies.md)                | Continuous integration: one command, and what the green tick certifies             | Accepted |
| [0011](0011-deploying-both-halves-and-what-a-green-deploy-certifies.md)       | Deploying both halves: two artefacts, two hosts, and what a green deploy certifies | Accepted |
