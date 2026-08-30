# Task 1.2.5 — Production build and run

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.4

## Objective

Prove the acceptance criterion "production build emits runnable output" against a clean build, and give the built output a documented way to be started.

## Work

- `pnpm clean` then `pnpm build`, then run the emitted entrypoint directly with `node` and no flags, no loader, no transpiler. If it needs a flag, that is a finding worth recording, not a flag worth adding quietly
- Run it with `NODE_ENV=production` set and confirm nothing changes that should not. Fastify reads very little from `NODE_ENV`; the point is to notice now if something does
- Add a **`start`** script to `apps/backend` that runs the built entrypoint. This is an **extra, not a seventh verb** — the same status `lint:fix` has. It gets no root fan-out and no place in `verify`, and `apps/frontend` is not obliged to have one. Say so where it is added. Keep it a plain `node dist/index.js` in `package.json`: Task 1.2.2 put `dev` in `scripts/dev.sh` because four composed commands each needed a reason attached, and that is a precedent for _explaining_ complexity, not for moving one-line scripts into files
- Check the dependency split is honest: `fastify` is a `dependency`, `@types/node` is a `devDependency`, and nothing the built output needs at runtime is declared as dev-only. The test is not reading `package.json` — it is running the thing
- Confirm the emitted output is ESM, matching the package's `"type": "module"`, and that nothing in the build produced CommonJS by accident. This one has been quietly true since Task 1.2.2 — the dev loop runs `dist/index.js` under plain `node`, top-level `await` and all, and has done so on every restart — so treat it as a confirmation rather than a discovery. Task 1.2.3 added a second ESM-only construct to the emitted output, an **import attribute** (`with { type: "json" }`); it ran under plain `node` with no flag and no warning, but it is the newest syntax in the built tree and so the most likely thing to object to an older runtime than the pinned 24.x
- **`apps/backend/scripts/` is new, and is not build output.** Task 1.2.2 added `scripts/dev.sh`. It is a development-only file: `start` must not reference it, and nothing in `dist/` depends on it. Worth one sentence in the outcome, because it is the first non-`src` directory in a package and Story 1.11 will have to decide whether a deployed artifact carries it (it should not)

## The dependency `apps/backend` no longer imports

Task 1.2.1 deleted the placeholder `src/index.ts`, which was the only file in `apps/backend` that imported `@marketpulse/shared`. The package still declares `"@marketpulse/shared": "workspace:*"` and still carries the TypeScript project reference to it, and **nothing in the toolchain notices** — `tsc -b` builds the reference regardless, and ESLint has no view on unused manifest entries.

That is a live exception to the workspace rule that packages declare only what they actually import, so it needs a decision rather than a silence.

**Keep it, and record why.** Story 1.12 promotes the health response type into `packages/shared`, and Epic 2 imports domain types in earnest; removing the dependency and the project reference now means putting both back within two stories, and the reference is what makes `tsc -b` order the build correctly the moment an import returns. Removing it would also be a real regression in one specific way — the stale-`dist` trap in `CLAUDE.md` depends on the backend compiling against shared's emitted declarations.

What this task should do is verify the removal-free claim honestly: confirm the built output runs with the dependency present and unimported, and note in the outcome that the manifest entry is deliberate and dated rather than left over. If Story 1.12 has not restored an import, this is the note that stops someone deleting it in the meantime.

## The workspace symlink, and what it hides

`@marketpulse/shared` is a `workspace:*` dependency, so at runtime it resolves through a pnpm symlink into `packages/shared/dist`. That works here and would not survive being copied to a server on its own.

**Do not fix that in this task.** `pnpm deploy --filter @marketpulse/backend` is the mechanism, and Story 1.11 owns it — that story already names it. What this task should do is _verify the claim_: run the built server, confirm it works in the workspace, and record that `apps/backend/dist` is not a self-contained artifact. A sentence written now saves Story 1.11 from discovering it during a failing deploy.

## `dist/` now reaches outside itself, which is a simpler version of the same problem

Task 1.2.3 reads the health endpoint's `version` from `apps/backend/package.json`, and does it with a plain JSON import that survives compilation verbatim — `dist/routes/health.js` contains the literal specifier `import manifest from "../../package.json" with { type: "json" }`. Confirm that by reading the emitted file, since it is one grep and it is the whole point.

So `apps/backend/dist` was already not self-contained because of the workspace symlink, and is now not self-contained for a much more basic reason: **copy `dist/` alone to a server and the process does not start at all**, because the manifest one directory above it is missing. That failure is loud (`ERR_MODULE_NOT_FOUND` at import time, before `listen`), which is the good version of this problem, but it happens at startup rather than at the first request.

Two things follow, and both belong in the outcome for Story 1.11 rather than being fixed here:

- The deployable unit is the **package directory**, not `dist/`. `pnpm deploy` produces exactly that, so the mechanism Story 1.11 already names is the right one — this just adds a second, independent reason it is required
- Whatever `version` the deployed manifest carries is what `/health` reports. That is free version reporting if the release process sets it, and a permanently `0.0.0` health endpoint if it does not. Story 1.11's decision, but it should be made rather than defaulted into

While the server is running from `dist/`, curl `/health` and confirm the version matches `apps/backend/package.json`. That single call proves the manifest resolved from the built tree, which is the one resolution case that can actually occur.

## Done when

- From a clean `pnpm build`, `node apps/backend/dist/index.js` starts, serves `/health`, and shuts down on `SIGTERM` — the whole story's behaviour, from built output
- `pnpm --filter @marketpulse/backend start` does the same
- The run works with a `NODE_ENV=production` environment
- The non-self-contained-artifact finding is written down for Story 1.11 — **both** halves of it: the workspace symlink into `packages/shared/dist`, and the health route's runtime read of `../../package.json`
- `pnpm verify` passes from the repository root

## Notes

`tsc -b --clean` leaves the `dist/` directories in place but empty — noted in Task 1.1.8. So "clean build" here means empty, not absent; if a stale file survives a clean, that is worth chasing.
