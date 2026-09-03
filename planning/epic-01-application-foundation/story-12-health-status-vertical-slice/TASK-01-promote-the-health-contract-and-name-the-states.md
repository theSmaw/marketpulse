# Task 1.12.1 — Promote the health contract into `packages/shared` and name the three states

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** nothing in this story

## Objective

Move the health response type into `packages/shared` so both halves compile against one definition, and settle — in types, before anything renders — what "healthy", "degraded" and "unreachable" actually mean. No UI, no client, no state.

## Work

- Move `HealthResponse` and `HealthStatus` from `apps/backend/src/routes/health.ts` into `packages/shared`, and import them back. `apps/backend` already **declares** `@marketpulse/shared` without importing it, so this is what makes that manifest entry honest — do not delete the dependency as dead on the way past
- Keep the field names exactly as they are. The uptime field is **`uptimeSeconds`**, not `uptime`: the unit travels in the name so it survives the wire. `version` reports `"0.0.0"` deliberately — the image tag and the digest answer "what is deployed", and writing a version into `package.json` at build time would dirty the tree the commit-SHA tag rule needs clean. Do not render it to a user and do not "fix" it here
- Keep `HealthStatus` a one-member union `"ok"`. It exists so Epic 3's market-feed state is an addition rather than a breaking change; widening it now would invent a vocabulary before there is anything to hold it to
- Keep the response schema's `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` guard working across the move. That guard is what makes a field added to the interface and not to the schema **TS1360** rather than a field that silently vanishes from the wire, and `JsonSchemaProperty` lives in `apps/backend/src/json-schema.ts` — the schema stays in the backend, only the type moves
- **Name the client-side status vocabulary here, in `packages/shared`, and write down why it is not `HealthStatus`.** The healthy / degraded / unreachable distinction in this story's criteria is **entirely client-side**: "unreachable" is the absence of a response, which no server can report about itself, and "degraded" is a judgement the client makes about a response it did get. So there are two vocabularies and they are different facts — one is what the server said, the other is what the client concluded. Give the second one its own name and its own file
- **Define "degraded" concretely or do not ship the word.** With a one-member union, the only material a client has is: a response that took too long, a response whose shape does not parse, or a non-2xx that is still an answer. Pick from that list, state the threshold, and put the reason next to it. A third state with no producible cause is a state nobody can test
- `packages/shared` is consumed as **built output**, so both apps need a rebuild before they typecheck against the move. `tsc -b` orders it; a bare `tsc --noEmit` in an app passes against the previous shape. Do not read a green `--noEmit` as evidence
- Tests beside the subject, per Story 1.9's conventions. The existing `apps/backend/src/server.test.ts` route-schema audit already covers `/health` and will fail by name if the schema stops declaring `500: apiErrorSchema`

## Done when

- `HealthResponse` and `HealthStatus` are exported from `packages/shared` and imported by `apps/backend`
- The client-side status vocabulary exists as a type with a written definition of each of its three states, including a producible cause for "degraded"
- `/health` answers exactly as it did before, field for field, verified against a running server rather than against the type
- `pnpm verify` passes from the repository root

## Approach note

This is the first real payoff of creating `packages/shared` in Story 1.1 rather than deferring it, and the first place the build-before-typecheck ordering has a genuine consequence.

It also makes a latent deployment problem live. Because nothing imports the package today, the pnpm symlink into `packages/shared` is never followed at runtime — a copied package directory runs despite it. Story 1.11 built the real answer (`pnpm deploy --legacy`, a `files` field on both manifests, and `@marketpulse/shared` arriving in the image as real files at 1,257 bytes of `dist/index.js`), so the mechanism exists; **this task is the first thing that exercises it**. Confirm the deployed backend still starts after this lands, rather than assuming the artefact was already correct.
