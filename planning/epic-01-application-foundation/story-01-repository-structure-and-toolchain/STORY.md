# Story 1.1 — Repository Structure & TypeScript Toolchain

**Status:** In progress — 5 of 8 tasks complete
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** nothing
**Epic scope covered:** shared configuration

## Description

Establish how the repository is laid out and how TypeScript, linting and formatting work across it, before any application code exists. Frontend and backend share a language and will share domain types (security identifiers, market events, investigation objects), so the layout needs to make that sharing cheap from the start.

## Decisions

Resolved 2026-08-29:

* **Layout** — single repository, `apps/frontend` + `apps/backend` + `packages/shared`
* **Workspace tooling** — pnpm workspaces, for faster installs and strict dependency resolution that catches undeclared imports. Costs a prerequisite: pnpm must be available, pinned via Corepack.
* **Shared package** — created now rather than deferred to Epic 2, so cross-package imports, build ordering and typechecking are proven while the repository is trivial
* **Cross-package builds** — TypeScript project references with built output (see Task 1.1.3 for the trade-off and fallback). Settled in practice by Task 1.1.3: the only friction is one ordering constraint — `packages/shared` must be built before a consumer can be typechecked — and `tsc -b` handles it.
* **TypeScript 6.0.3, not 7.x** — TS 7 (the native compiler) is `latest`, but no `typescript-eslint` release supports it yet, and Task 1.1.5 needs type-aware linting. 6.0.3 is the newest version inside typescript-eslint's peer range and shares TS 7's semantics. Revisit when that range widens (Task 1.1.2)
* **Type-aware linting** — enabled from the start rather than deferred (Task 1.1.5). One root flat config, ESLint installed only at the workspace root, `strictTypeChecked` + `stylisticTypeChecked`. Re-checked 2026-08-30: typescript-eslint's peer range is unchanged at `<6.1.0`, so the TypeScript pin above still holds

```
marketpulse/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── apps/
│   ├── frontend/
│   └── backend/
└── packages/
    └── shared/
```

## Acceptance criteria

* A clean checkout installs with a single documented command
* Typecheck and lint run from the repository root across every package
* A shared base `tsconfig` exists and each package extends it
* Formatting is enforced consistently and does not fight the editor
* Script names are consistent across packages (`dev`, `build`, `test`, `lint`, `typecheck`, `clean`)

## Tasks

Tackled in order. The story is complete when all eight are done.

| # | Task | Status |
|---|------|--------|
| 1.1.1 | [Initialise the pnpm workspace root](TASK-01-initialise-pnpm-workspace.md) | Complete |
| 1.1.2 | [Shared TypeScript configuration](TASK-02-shared-typescript-configuration.md) | Complete |
| 1.1.3 | [Create the shared package](TASK-03-create-shared-package.md) | Complete |
| 1.1.4 | [Create the app package skeletons](TASK-04-create-app-package-skeletons.md) | Complete |
| 1.1.5 | [ESLint configuration](TASK-05-eslint-configuration.md) | Complete |
| 1.1.6 | [Prettier and editor conventions](TASK-06-prettier-and-editor-conventions.md) | Not started |
| 1.1.7 | [Root script orchestration](TASK-07-root-script-orchestration.md) | Not started |
| 1.1.8 | [Verify from a clean checkout and document](TASK-08-verify-clean-checkout-and-document.md) | Not started |

Each task builds on the previous one, so the tree stays installable and typechecking throughout rather than being broken until the end.

## Notes

Strict TypeScript from the outset — this project's value depends on typed domain boundaries (workspace commands, agent events, evidence records) and retrofitting strictness later is painful.
