# Task 1.2.2 — Development mode: watch and restart

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.1

## Objective

Replace `apps/backend`'s `echo` placeholder `dev` script with a real watch-and-restart loop, so the remaining tasks in this story are worked on with a running server rather than a manual rebuild between every edit.

## The decision to make

Two candidate approaches. Both are dependency-free; pick with a measurement, not a preference.

**A — Node runs the TypeScript directly:** `node --watch src/index.ts`. Node 24 strips types natively, so there is no build step in the loop and one process to reason about. **Verify before committing to it** that Node resolves the repository's `./thing.js` specifiers to their `.ts` files under type stripping — Task 1.2.1 made this concrete: `src/index.ts` imports `./server.js`, and this repository's import style is not optional, so an approach that cannot resolve it is disqualified on the spot.

Two things Task 1.2.1 added to what A has to clear:

- **Type stripping only erases; it does not transform.** Choosing A makes _erasable syntax only_ a standing constraint on `apps/backend` — no `enum`, no parameter properties, no `namespace`, no non-`type` re-export forms. Today's two files satisfy it accidentally rather than by design. If A is chosen, set `erasableSyntaxOnly` in `apps/backend/tsconfig.json` so `tsc` enforces the constraint the dev loop silently depends on, and say so in the outcome; a violation otherwise surfaces as a dev server that will not start while `pnpm build` stays green
- **`src/index.ts` uses top-level `await`** for `app.listen`. Harmless under both approaches, but it means the entrypoint is unambiguously ESM and cannot be run through anything that expects CommonJS

The `@marketpulse/shared` resolution check that used to sit here **cannot be run any more**: Task 1.2.1 deleted the placeholder that was the backend's only import of it, so there is nothing in `apps/backend/src` to resolve. Do not invent an import to test it — see the note in Task 1.2.5. Nothing about type stripping changes how a workspace dependency resolves, and Epic 2 will exercise it for real.

**B — Two watchers:** `tsc -b --watch` emitting to `dist/`, and `node --watch dist/index.js` restarting on the emit. Certain to work, at the cost of two processes and a helper to run them concurrently — and a concurrency helper is root tooling by the workspace rule, so B is the option that adds a dependency.

Prefer A if it verifies. Record which was chosen and why in the task outcome; if it is B, say plainly why A failed.

**Whichever is chosen, state in the outcome where type errors surface.** Under A they do not surface in the dev loop at all — type stripping does not typecheck. That is acceptable only because `pnpm typecheck`, the editor and `pnpm verify` all still do, and it is exactly the kind of thing that is obvious now and mystifying in three months.

## Work

- Replace `apps/backend`'s `dev` script. The verb keeps its meaning — "run this package in development" — which is the convention Story 1.1 set
- Keep `packages/shared` in mind: it is consumed as **built output**, so editing shared does not affect a running backend until shared is rebuilt. `pnpm dev` from the root runs shared's `tsc -b --watch` alongside this, which covers it — note that the single-package `pnpm --filter @marketpulse/backend dev` does not
- Root `pnpm dev` already fans out with `pnpm -r`. After this task it starts a real backend and shared's watcher; `apps/frontend` stays a placeholder until Story 1.3. Check the parallel output is legible rather than interleaved nonsense, and say so if it is not
- Confirm the watcher does not restart on its own output — a loop that rebuilds into a directory it is watching spins forever

## Done when

- `pnpm --filter @marketpulse/backend dev` starts the server and restarts it on a source edit, with the change visibly live
- Root `pnpm dev` runs it alongside `packages/shared`'s watcher
- Ctrl-C ends it cleanly and leaves no orphaned process — check with `pgrep -f node` after
- `pnpm verify` passes from the repository root

## Notes

Task 1.2.4 adds signal handling, and `node --watch` restarts by sending the child a `SIGTERM`. So after that task the restart path runs the graceful-shutdown code on every edit — a shutdown handler that hangs will show up here as a dev server that stops restarting. That is a useful accident: it means the shutdown path is exercised constantly rather than only on deploy.
