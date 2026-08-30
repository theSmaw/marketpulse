# Task 1.2.2 — Development mode: watch and restart

**Status:** Complete — 2026-08-30
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

## Outcome

**Approach B, and A was disqualified on the first test rather than on preference.**

`node --watch src/index.ts` fails immediately:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/…/apps/backend/src/server.js' imported from /…/apps/backend/src/index.ts
```

Node 24's type stripping does not remap a `.js` specifier to the `.ts` file beside it. That is not a bug to work around — `nodenext` requires the emitted extension, and this repository's import style is documented, workspace-wide and not negotiable for one package.

Checked the obvious escape before giving up on A: Node resolves an explicit `./dep.ts` specifier perfectly well (verified in a scratch package — it printed the imported value), so TypeScript's `rewriteRelativeImportExtensions` would let source be written `./server.ts` and still emit `./server.js`. **Rejected.** It buys a marginally simpler dev loop at the price of two relative-import conventions in one workspace, and it means `apps/backend` alone reads differently from `packages/shared`. That is the trade Task 1.1.7 already refused for tooling versions, for the same reason: one rule is worth more than a local optimum.

Because A lost, `erasableSyntaxOnly` is **not** being set. The constraint it enforces only exists if the dev loop strips types, and this one compiles. Nothing here forbids an `enum` in `apps/backend` today.

### What was built

`apps/backend/scripts/dev.sh`, run by `"dev": "sh scripts/dev.sh"`. A file rather than a one-line composition in `package.json`, because five separate decisions needed a reason attached and a JSON string cannot carry one. `sh scripts/dev.sh` rather than an executable shebang so there is no exec-bit to lose in a checkout.

It does four things, in order: `tsc -b` once, `tsc -b --watch --preserveWatchOutput` in the background, a `trap` that reaps the watcher, and `node --watch dist/index.js` in the foreground.

- **The initial `tsc -b`** exists because `pnpm clean` leaves `dist/` empty, and starting the loop there opened with a `MODULE_NOT_FOUND` stack trace. Node recovered on its own a second later when the first emit landed, so it was cosmetic — but it reads as a broken setup, and the fix is an incremental build that costs nothing on a warm tree. It is `|| true`: a type error must not stop the dev server starting, which is exactly when you want it running
- **`--preserveWatchOutput`** because tsc otherwise clears the screen on every rebuild, wiping the server log you started the loop to read
- **The `trap`** covers the case where `node --watch` dies and the shell would otherwise leave tsc orphaned. Verified by `kill -9` on the node supervisor: tsc was reaped and the script exited. It is worth knowing that the trap does **not** fire on a `SIGTERM` sent to the script shell alone — POSIX `sh` defers traps while it waits on a foreground command — so this is insurance for one specific case, not general signal handling
- **No concurrency helper.** `concurrently` would give prefixed output and kill-others semantics for one root devDependency. Two processes with a verified-clean Ctrl-C do not demonstrate the need, and pnpm already prefixes output in the root fan-out

### Where type errors surface, which is the part worth remembering

**They surface in the dev loop, and this is the main thing approach B bought.** Type stripping does not typecheck; `tsc -b --watch` does, on every edit. Verified by appending `const broken: number = "not a number";` — the loop printed `src/index.ts(79,7): error TS2322` and **still restarted the server**, because `noEmitOnError` is not set. That combination is the right one: the error is loud, and the server you are debugging does not vanish because of an unrelated type mistake.

### Verified

| Check                            | Result                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restart on source edit           | Two successive edits, each visible in the server's own log after `Restarting 'dist/index.js'`                                                                 |
| Cold start from an empty `dist/` | `pnpm clean` then `dev`: no stack trace, server listening in ~8s                                                                                              |
| Self-triggered restart loop      | None — restart count unchanged over 12 idle seconds. `node` watches `dist/`, `tsc` writes it; neither watches its own output                                  |
| Root `pnpm dev`                  | Runs backend loop, shared watcher and the frontend placeholder; output legible, pnpm prefixes every line with its package                                     |
| Ctrl-C leaves no orphan          | Process-group `SIGINT` against the four processes (`sh`, `tsc`, `node --watch`, and the `node dist/index.js` child) left nothing behind and released the port |
| `pnpm verify` from the root      | Exit 0                                                                                                                                                        |

The Ctrl-C check needed care to be worth anything: `pgrep -f "node --watch"` does not match the actual server, which runs as `node dist/index.js` under the watch supervisor. An earlier run of this check looked clean while a real orphan sat holding port 4214. The honest test is `lsof` on the port plus a pattern that matches the child.

### Two findings

**`packages/shared`'s `dev` script was changed too** — `tsc -b --watch` to `tsc -b --watch --preserveWatchOutput`. Under root `pnpm dev` it was emitting raw `ESC[2J ESC[3J ESC[H` into the shared output stream, which clears the terminal and takes every other package's output with it. The task asked whether the parallel output was legible; it was not, and this was why. One word, same reasoning as the backend's.

**Root `pnpm dev` builds `packages/shared` twice.** Shared's own watcher and the backend's `tsc -b --watch` both follow the project reference, so an edit to shared logs `File change detected` under both package prefixes and both write the same `dist/`. It is redundant rather than harmful — identical inputs, identical output — but it is two processes writing one directory, and if it ever produces a garbled `.tsbuildinfo` this paragraph is the first place to look.

### What the single-package loop does not cover

`pnpm --filter @marketpulse/backend dev` restarts on a change to `apps/backend/src` only. `node --watch` restarts on any file the process actually loaded — confirmed generically in a scratch package, where editing a module in a sibling directory restarted the entry point — so once `apps/backend` imports `@marketpulse/shared` again, an edit to shared will rebuild through the project reference and restart the server through the pnpm symlink. That path is **unverified**, because nothing in `apps/backend/src` imports shared today (see Task 1.2.5), and inventing an import to test it is the thing that task says not to do.

## Notes

Task 1.2.4 adds signal handling, and `node --watch` restarts by sending the child a `SIGTERM`. So after that task the restart path runs the graceful-shutdown code on every edit — a shutdown handler that hangs will show up here as a dev server that stops restarting. That is a useful accident: it means the shutdown path is exercised constantly rather than only on deploy.
