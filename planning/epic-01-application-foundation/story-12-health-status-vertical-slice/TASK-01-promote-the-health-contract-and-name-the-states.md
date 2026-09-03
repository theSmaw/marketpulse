# Task 1.12.1 — Promote the health contract into `packages/shared` and name the three states

**Status:** Complete (2026-09-03)
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

## Outcome — 2026-09-03

**The health contract lives in `packages/shared`, `apps/backend` imports it, and there are now two status vocabularies rather than one widened union.** Four files changed and four are new; nothing renders, no client exists, and no React was touched.

- **`HealthResponse` and `HealthStatus` moved to `packages/shared/src/health.ts`** and are imported back by `apps/backend/src/routes/health.ts`. Field names are unchanged — `status`, `version`, `uptimeSeconds` — and so is the wire, checked against a running server rather than against the type: `{"status":"ok","version":"0.0.0","uptimeSeconds":2.016877417}`, 61 bytes, key order unchanged, with `x-request-id` and `access-control-expose-headers` beside it. `version` still reports `"0.0.0"` deliberately.
- **`HealthStatus` is still `"ok"` and is now a `const` array behind it.** `HEALTH_STATUSES` exists so the schema declares `enum: HEALTH_STATUSES` instead of a second literal `["ok"]` — the shape `apiErrorSchema` already has with `API_ERROR_CODES`, so the union is enforced by the serialiser and the compiler from one source and Epic 3 widening it reaches the wire without an edit in the backend.
- **The `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` guard survives the move and was made to fire across the package boundary**, not asserted: a temporary `probe: string` on the interface in `packages/shared` produced `apps/backend/src/routes/health.ts(94,3): error TS1360` naming the missing property, plus two `TS2741`s at the construction sites. The schema and `JsonSchemaProperty` stayed in the backend; only the type moved.
- **The client-side vocabulary is `BackendStatus` in `packages/shared/src/backend-status.ts`** — `healthy` / `degraded` / `unreachable` — with the reason it is not `HealthStatus` written at the top of the file: they are two different facts. `unreachable` is the absence of a response, which no server can report about itself, and `degraded` is a judgement a client makes about an answer it did get. A test asserts the two unions **share no member**, which is the guard against somebody later "unifying" them.
- **`degraded` has a definition and two producible causes**, as `BACKEND_DEGRADED_CAUSES`: `not-ok-status` (something answered at that address and it was not health — a proxy's own 502, or `VITE_API_BASE_URL` pointing at another HTTP server) and `unreadable-body` (a 2xx whose body is not a health report — a static host answering `index.html` at 200, which is the `vite preview` and `navigationFallback` behaviour this repository has already measured twice).
- **`pnpm verify` passes from the repository root**, exit 0. Tests went **118 → 137**: `packages/shared` 7 → 26 across 4 files, the other two packages unchanged at 49 and 62, plus the 10 process tests.

### Three things worth carrying forward

1. **Latency was considered as the meaning of "degraded" and rejected, with a reversal trigger.** It needs a second threshold strictly below the client's request deadline and nothing would keep the two ordered — invert them by accident and `degraded` becomes unreachable code, silently. And there is nothing to set it from: `/health` reads `process.uptime()` and returns, so a slow answer today measures the network rather than the server. The trigger is a `/health` that does real work — a database or a provider check — at which point it gets a threshold taken from a real distribution. **Consequence to know before debugging one: a timeout is `unreachable`, not `degraded`, because nothing arrived**, so the request deadline is the boundary between those two states and it is Task 1.12.2's to own.
2. **`isHealthResponse(value: unknown)` ships with the interface, because a definition a client cannot execute is prose.** It lives beside the shape it validates so it cannot drift from it. It deliberately **accepts** a `status` member this client has not been taught and **accepts** unknown extra fields: a newer server is a version skew rather than a broken one, and rejecting either here would quietly undo the whole reason `HealthStatus` is a union that can grow. What it rejects is a missing field, a wrong primitive type, and a non-object — the string body a static host returns being the measured case.
3. **The latent deployment problem is closed rather than assumed, and it was closed by running the image.** Nothing imported `@marketpulse/shared` at runtime before this task, so the pnpm symlink into `packages/shared` had never been followed by a running process. `pnpm image` plus `docker run` answers `/health` 200 from the container with `pid` 1: inside it, `node_modules/@marketpulse/shared` is the relative symlink into `.pnpm/@marketpulse+shared@file+packages+shared/…` and it resolves to real files — `dist/index.js` is now **2,121 B** against Story 1.11's recorded 1,257, and `dist/health.js` (4,308 B) is there beside it. So `pnpm deploy --legacy` and the `files` field do what Task 1.11.2 said they did, now demonstrated by the first thing that actually needed them.
