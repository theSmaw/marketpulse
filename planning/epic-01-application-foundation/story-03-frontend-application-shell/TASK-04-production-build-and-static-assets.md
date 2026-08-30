# Task 1.3.4 — Production build and static assets

**Status:** Not started
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.3

## Objective

Make `build` emit a static bundle that a static host can serve, prove the emitted output actually works rather than merely existing, and make `clean` tell the truth about two producers writing into the build tree.

## Work

- The `build` shape is **already adopted** — Task 1.3.1 settled it as `tsc -b && vite build`, so the verb still means "typecheck and produce this package's artefact" as it does in the other two packages. `&&` and that order are the point: a type error must fail the build rather than ship, which is `verify`'s reasoning one level down. Nothing to decide here; what is left is exercising it on output that is no longer trivial
- **Check the root `build` script specifically, because Task 1.3.1 had to change it and the change is easy to regress.** Root `build` is a direct `tsc -b` over the solution rather than a `pnpm -r` fan-out, so it would have typechecked the frontend and emitted no bundle at all — `pnpm verify` would have passed without the bundler ever running. It is now `tsc -b && pnpm --filter @marketpulse/frontend exec vite build`, which hardcodes one package's name at the root. Confirm that root `pnpm build` really is what produces the artefact CI will publish, since root `build` and the frontend's own `build` are now two different command strings that must not drift
- Run `pnpm build` from the root and inspect what lands: a real `index.html` referencing hashed asset filenames, JS and CSS emitted, `packages/shared` built first by the reference graph
- **Serve the built output and load it in a browser.** "Emits static assets" is not the criterion — the criterion is that they work. Add a `preview` script if that is the convenient way to do it, with **exactly the status `apps/backend`'s `start` has**: an extra, not a seventh verb, no root fan-out, no place in `verify`, and no obligation on the other packages. Like `start`, it serves already-built output and builds nothing itself, so a stale build is a stale page
- **Re-prove `clean` on output that can actually accumulate.** Task 1.3.1 resolved the directory collision by removing a producer — the frontend's TypeScript half is `noEmit`, so Vite owns `dist/` alone — and verified that both root `clean` (`tsc -b --clean && rm -rf apps/frontend/dist`) and the package's own (`tsc -b --clean && rm -rf dist`) leave no residue. But it proved that against a **single trivial build**, which is the one case where accumulation cannot show up. The check that still matters: build, edit a source so the content hash changes, build again, then `clean` — and look at the tree. A stale hashed asset sitting next to a fresh `index.html` is invisible rather than merely untidy, and hashed filenames mean a `clean` that misses the directory **accumulates** rather than merely going stale
- The orphaning trap from Task 1.2.6 lands differently here and is worth restating in this package's terms: `tsc -b --clean` derives its deletions from the sources that currently exist, but it now deletes nothing in this package anyway. The `rm -rf` half is what does the work, and it is content-blind — which makes it more robust against orphaning and completely dependent on the directory being right. If Vite's `build.outDir` is ever changed, both `clean` scripts are silently wrong
- **Say what the deployable unit is**, in one paragraph, for Story 1.11. The backend's answer was measured and surprising — `dist/` alone is not runnable; the package directory is. The frontend's is likely the opposite and much simpler (a directory of static files, no `node_modules`, no runtime), which makes the two halves of a deployment genuinely different shapes. Record it rather than leaving 1.11 to infer it
- Task 1.3.1 already observed that the bundler **inlines** `@marketpulse/shared` rather than following the symlink at runtime — six modules transformed into a single 1.03 kB chunk. What is worth confirming here is the consequence rather than the mechanism: because the shared code is copied into the bundle at build time, a rebuild of `packages/shared` does not reach a built frontend, and the workspace symlink is not part of the artefact. That is a different relationship from the backend's, where the package directory carries `node_modules` and resolves at runtime — and it is the backend's version of that question (Story 1.12's first real import) that is currently latent
- Confirm the build is reproducible from a clean tree: `pnpm clean && pnpm build` from the root, not an incremental build over yesterday's state

## Done when

- `pnpm build` from the root emits a static bundle for `apps/frontend` and still builds the other two packages correctly
- The built output loads and renders in a browser, served as static files
- `pnpm clean` followed by a look at the tree leaves no output from either producer
- The `build` verb still means the same thing in all three packages, or the difference is stated with its reason
- `pnpm verify` passes from the repository root

## Notes

There is one asymmetry worth naming for Story 1.8 and Story 1.12: the frontend's production artefact has no server in it. Whatever serves it in development is the dev server and is not part of what ships, so "it works in `pnpm dev`" and "the build works" are two claims with almost no overlap. That is why this task loads the built output in a browser rather than trusting the build's exit code.
