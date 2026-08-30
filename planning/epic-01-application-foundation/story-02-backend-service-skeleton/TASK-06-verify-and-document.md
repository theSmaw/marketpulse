# Task 1.2.6 — Verify the story end to end and document

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.5

## Objective

Walk the story's six acceptance criteria as a single pass rather than trusting five tasks' individual claims, and write down what was decided. The same shape as Task 1.1.8, which is what made Story 1.1 trustworthy.

## Work

### Verify

Run all six of the story's acceptance criteria in one sitting, from a build made after `pnpm clean`, and record what was actually executed rather than what should work:

- Server starts locally on a configurable port
- `GET /health` returns 200 with status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on `SIGTERM`/`SIGINT`, closing in-flight requests
- `pnpm verify` passes from the repository root

Also re-run the whole documented command set for this package — the six verbs plus `start` — as Task 1.1.8 did, because two of them (`dev`, and whatever `build` now means) changed meaning during this story.

### Document

- **Write `docs/adr/0002-backend-framework-and-server-composition.md`** and add its row to `docs/adr/README.md`'s index. The framework choice is exactly the kind of decision PRODUCT_SPEC.md §39 wants recorded, and the reasoning is unusually worth keeping: Fastify was chosen over NestJS partly on the spec's "keep the backend relatively small" and partly because NestJS's decorator-and-metadata model fights `verbatimModuleSyntax` and the ESM-only setup, which would have meant relaxing workspace-wide options for one package. Record the rejected alternative and its cost, not just the winner. The `buildServer()` / entrypoint split and the signal-handling placement belong in the same record
- **Update `CLAUDE.md`** — the current-state paragraph (the backend is no longer a skeleton; the two apps are no longer symmetrical), the file tree, and the Commands section. The `dev` placeholder sentence is now wrong for `apps/backend` and must change; `start` needs stating as an extra like `lint:fix`. The "`pnpm test` means no tests exist" warning stays exactly as it is — this story adds no tests
- **Update `README.md`** to match. It carries the same command set for humans and the two must stay in step
- **Update this story's `STORY.md`** — status, the resolved framework decision, and the task table
- **Update `EPIC.md`** — Story 1.2's status, and check whether anything this story learned changes what a later story says. Stories 1.6, 1.7, 1.9, 1.11 and 1.12 all make claims about the backend that were written before it existed

### Then check the downstream stories

Story 1.1's follow-up pass found real corrections in eleven stories. Do the same here, narrowly: 1.6 (configuration replaces this story's two `process.env` reads), 1.7 (error shape, `unhandledRejection`, and the logger this story left at Fastify's default), 1.9 (`app.inject()` against `buildServer()`), 1.11 (`pnpm deploy`, the container host binding, the shutdown timeout inside the orchestrator's kill timeout) and 1.12 (promoting the health type into `packages/shared`). Amend those stories where this story made something concrete that they described speculatively.

## Done when

- Every acceptance criterion has been executed, and the outcome says what command produced what result
- ADR 0002 exists and is indexed
- `CLAUDE.md`, `README.md`, `STORY.md` and `EPIC.md` agree with each other and with the repository
- `pnpm verify` passes from the repository root
- Story 1.2 is marked complete

## Notes

Task 1.1.8's most useful habit was naming what a verification **could not** prove. Do the same: a local run proves nothing about the deployed environment (Story 1.11), and nothing here proves the frontend can reach this endpoint across an origin boundary (Story 1.12) — CORS has not been considered by any task in this story, which is a deliberate deferral and should be recorded as one.
