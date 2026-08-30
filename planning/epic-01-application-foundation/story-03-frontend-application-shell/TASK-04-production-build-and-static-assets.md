# Task 1.3.4 — Production build and static assets

**Status:** Not started
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.3

## Objective

Make `build` emit a static bundle that a static host can serve, prove the emitted output actually works rather than merely existing, and make `clean` tell the truth about two producers writing into the build tree.

## Work

- Adopt the `build` shape decided in Task 1.3.1 — the expected answer is `tsc -b && vite build`, so the verb keeps meaning "typecheck and produce this package's artefact" as it does in the other two packages. If it ended up different, this is where the divergence gets written down against the six-verb convention rather than left to be discovered
- **`&&` ordering matters and is the reason this is not `vite build` alone.** Typecheck first so a type error fails the build instead of shipping. This is the same reasoning `verify` uses, one level down
- Run `pnpm build` from the root and inspect what lands: a real `index.html` referencing hashed asset filenames, JS and CSS emitted, `packages/shared` built first by the reference graph
- **Serve the built output and load it in a browser.** "Emits static assets" is not the criterion — the criterion is that they work. Add a `preview` script if that is the convenient way to do it, with **exactly the status `apps/backend`'s `start` has**: an extra, not a seventh verb, no root fan-out, no place in `verify`, and no obligation on the other packages. Like `start`, it serves already-built output and builds nothing itself, so a stale build is a stale page
- **Prove `clean` removes both producers' output.** `tsc -b --clean` only knows about the TypeScript half, and derives even that from the sources that currently exist. Whatever Task 1.3.1 decided about the directory collision, the check is empirical: `pnpm build`, then `pnpm clean`, then look at the tree. Residue here is worse than on the backend, because a stale hashed asset next to a fresh `index.html` is invisible rather than merely untidy
- Note the same orphaning trap in this package's terms: deleting a source file before cleaning leaves its `dist` output behind permanently (measured in Task 1.2.6). With hashed filenames, every build leaves a _new_ name behind, so a `clean` that misses Vite's directory accumulates rather than merely staling
- **Say what the deployable unit is**, in one paragraph, for Story 1.11. The backend's answer was measured and surprising — `dist/` alone is not runnable; the package directory is. The frontend's is likely the opposite and much simpler (a directory of static files, no `node_modules`, no runtime), which makes the two halves of a deployment genuinely different shapes. Record it rather than leaving 1.11 to infer it
- Check whether the built bundle contains anything from `@marketpulse/shared`, and note the mechanism. The bundler inlines what it imports rather than following the symlink at runtime, which is a different relationship from the backend's — and it is the backend's version of that question (Story 1.12's first real import) that is currently latent
- Confirm the build is reproducible from a clean tree: `pnpm clean && pnpm build` from the root, not an incremental build over yesterday's state

## Done when

- `pnpm build` from the root emits a static bundle for `apps/frontend` and still builds the other two packages correctly
- The built output loads and renders in a browser, served as static files
- `pnpm clean` followed by a look at the tree leaves no output from either producer
- The `build` verb still means the same thing in all three packages, or the difference is stated with its reason
- `pnpm verify` passes from the repository root

## Notes

There is one asymmetry worth naming for Story 1.8 and Story 1.12: the frontend's production artefact has no server in it. Whatever serves it in development is the dev server and is not part of what ships, so "it works in `pnpm dev`" and "the build works" are two claims with almost no overlap. That is why this task loads the built output in a browser rather than trusting the build's exit code.
