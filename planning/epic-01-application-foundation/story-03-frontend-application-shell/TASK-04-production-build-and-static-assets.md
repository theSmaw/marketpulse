# Task 1.3.4 — Production build and static assets

**Status:** Complete
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.3

## Objective

Make `build` emit a static bundle that a static host can serve, prove the emitted output actually works rather than merely existing, and make `clean` tell the truth about two producers writing into the build tree.

## Work

- The `build` shape is **already adopted** — Task 1.3.1 settled it as `tsc -b && vite build`, so the verb still means "typecheck and produce this package's artefact" as it does in the other two packages. `&&` and that order are the point: a type error must fail the build rather than ship, which is `verify`'s reasoning one level down. Nothing to decide here; what is left is exercising it on output that is no longer trivial
- **Check the root `build` script specifically, because Task 1.3.1 had to change it and the change is easy to regress.** Root `build` is a direct `tsc -b` over the solution rather than a `pnpm -r` fan-out, so it would have typechecked the frontend and emitted no bundle at all — `pnpm verify` would have passed without the bundler ever running. It is now `tsc -b && pnpm --filter @marketpulse/frontend exec vite build`, which hardcodes one package's name at the root. Confirm that root `pnpm build` really is what produces the artefact CI will publish, since root `build` and the frontend's own `build` are now two different command strings that must not drift
- Run `pnpm build` from the root and inspect what lands: a real `index.html` referencing hashed asset filenames, JS emitted, `packages/shared` built first by the reference graph. **Do not expect CSS.** Nothing in the tree has a stylesheet — Story 1.4 owns styling — so a build with no `.css` asset is correct here, not a misconfiguration. Checking for one and finding nothing is exactly the kind of false alarm that gets "fixed" by adding a CSS pipeline this story does not want
- **There is a size baseline to compare against now.** The current figure, after Task 1.3.3, is **190.80 kB (60.16 kB gzipped) across 17 modules** — Task 1.3.2 measured 190.76 kB before `StrictMode`, and the pre-React figure was 1.03 kB across 6. Two things that figure tells you before you go looking: the +0.04 kB is `StrictMode`, and **`@vitejs/plugin-react` contributes nothing at all** — Fast Refresh is development-only, so a production build that grew is not the plugin and looking there wastes the search. If this task's build lands far from 190.80 kB without React's version changing, something is being pulled in that nobody asked for. This is also the first point at which a size budget is a real question rather than a hypothetical one; note whether it is worth one, and leave it to ~~Story 1.14~~ **Epic 14 (Performance & Scale Validation)** if not — this bullet named a story that does not exist, since Epic 1 has twelve
- **Serve the built output and load it in a browser.** "Emits static assets" is not the criterion — the criterion is that they work. Add a `preview` script if that is the convenient way to do it, with **exactly the status `apps/backend`'s `start` has**: an extra, not a seventh verb, no root fan-out, no place in `verify`, and no obligation on the other packages. Like `start`, it serves already-built output and builds nothing itself, so a stale build is a stale page
- **`vite preview` is a third port, and Task 1.3.3's port decision already reached it — half of it.** Measured both ways rather than inferred: `preview` **inherits `server.strictPort`** but **not `server.port`**. So with the config as 1.3.3 left it, a second preview against a busy **4173** exits 1 with `Error: Port 4173 is already in use`, and with `strictPort` removed the same command quietly binds 4174. Two consequences: **do not add a `preview.strictPort`** believing it is missing — it is inherited, and a second copy is one more place for the two to disagree; and the workspace now has three ports to keep straight (backend 3000, dev server 5173, preview 4173), of which only the first two are anyone's decision so far. Decide whether 4173 should be stated explicitly the way 5173 now is, or left as Vite's default
- **Re-prove `clean` on output that can actually accumulate.** Task 1.3.1 resolved the directory collision by removing a producer — the frontend's TypeScript half is `noEmit`, so Vite owns `dist/` alone — and verified that both root `clean` (`tsc -b --clean && rm -rf apps/frontend/dist`) and the package's own (`tsc -b --clean && rm -rf dist`) leave no residue. But it proved that against a **single trivial build**, which is the one case where accumulation cannot show up. The check that still matters: build, edit a source so the content hash changes, build again, then `clean` — and look at the tree. A stale hashed asset sitting next to a fresh `index.html` is invisible rather than merely untidy, and hashed filenames mean a `clean` that misses the directory **accumulates** rather than merely going stale
- The orphaning trap from Task 1.2.6 lands differently here and is worth restating in this package's terms: `tsc -b --clean` derives its deletions from the sources that currently exist, but it now deletes nothing in this package anyway. The `rm -rf` half is what does the work, and it is content-blind — which makes it more robust against orphaning and completely dependent on the directory being right. If Vite's `build.outDir` is ever changed, both `clean` scripts are silently wrong
- **Say what the deployable unit is**, in one paragraph, for Story 1.11. The backend's answer was measured and surprising — `dist/` alone is not runnable; the package directory is. The frontend's is likely the opposite and much simpler (a directory of static files, no `node_modules`, no runtime), which makes the two halves of a deployment genuinely different shapes. Record it rather than leaving 1.11 to infer it
- Task 1.3.1 already observed that the bundler **inlines** `@marketpulse/shared` rather than following the symlink at runtime — six modules into a single 1.03 kB chunk then, 17 modules into 190.80 kB after Tasks 1.3.2 and 1.3.3, still a single chunk. What is worth confirming here is the consequence rather than the mechanism: because the shared code is copied into the bundle at build time, a rebuild of `packages/shared` does not reach a built frontend, and the workspace symlink is not part of the artefact. That is a different relationship from the backend's, where the package directory carries `node_modules` and resolves at runtime — and it is the backend's version of that question (Story 1.12's first real import) that is currently latent
- Confirm the build is reproducible from a clean tree: `pnpm clean && pnpm build` from the root, not an incremental build over yesterday's state

## Done when

- `pnpm build` from the root emits a static bundle for `apps/frontend` and still builds the other two packages correctly
- The built output loads and renders in a browser, served as static files
- `pnpm clean` followed by a look at the tree leaves no output from either producer
- The `build` verb still means the same thing in all three packages, or the difference is stated with its reason
- `pnpm verify` passes from the repository root

## Notes

There is one asymmetry worth naming for Story 1.8 and Story 1.12: the frontend's production artefact has no server in it. Whatever serves it in development is the dev server and is not part of what ships, so "it works in `pnpm dev`" and "the build works" are two claims with almost no overlap. That is why this task loads the built output in a browser rather than trusting the build's exit code.

## Outcome

Everything below was executed, not reasoned about. Two of this task's own premises turned out to be wrong, and both are recorded as wrong rather than quietly dropped.

### The build, and what it emits

Root `pnpm build` from a clean tree (`pnpm clean` first, so this is not an incremental build over yesterday's state):

```
$ tsc -b && pnpm --filter @marketpulse/frontend exec vite build
vite v8.2.2 building client environment for production...
✓ 17 modules transformed.
dist/index.html                  0.56 kB │ gzip:  0.37 kB
dist/assets/index-Dv4miNH4.js  190.80 kB │ gzip: 60.16 kB
✓ built in 52ms
```

**190.80 kB across 17 modules — exactly the predicted figure**, so nothing has been pulled in that nobody asked for. Two builds from two separate `pnpm clean`s produced the _same content hash_ (`index-Dv4miNH4.js`), so the build is reproducible in the sense that matters for a hashed asset: a rebuild that changes nothing changes no filename.

**No CSS asset, and that is correct.** Nothing in the tree has a stylesheet; Story 1.4 owns styling. Emitted `index.html` rewrites the source's `<script src="/src/main.tsx">` into `<script type="module" crossorigin src="/assets/index-Dv4miNH4.js">` and is otherwise the source file, comment included.

**The asset path is absolute — `/assets/…`, not `./assets/…`.** That is Vite's `base: "/"` default and it means the artefact assumes it is served from a domain root. Serving it from a subpath is a `base` change and a rebuild, not a hosting configuration. Story 1.11 should know that before it picks a host.

**The root `build` script does what it claims.** Checked the way that can fail rather than by reading it: a deliberate type error in `apps/frontend/src/App.tsx` made root `pnpm build` exit 1 at `tsc -b` with `error TS2322`, and `apps/frontend/dist` was byte-for-byte untouched — the bundler never ran. So the `&&` and its order hold at the root, and root `build` really is the command that produces the artefact rather than a typecheck that happens to be followed by one.

### The accumulation premise was wrong — Vite empties `outDir`

This task predicted that hashed filenames make a missed `clean` _accumulate_ rather than merely go stale. **Measured, and it does not.** Build, edit a source so the content hash changes, build again:

```
after build 1:  index-Dv4miNH4.js
after build 2:  index-CL6U_1qt.js      <- one file, not two
```

Vite's `build.emptyOutDir` defaults to true when `outDir` is inside the project root, so every build clears the directory first. The stale-asset-beside-a-fresh-`index.html` failure mode this task went looking for cannot happen here without someone turning that default off. Worth keeping written down precisely _because_ it is the reassuring answer: the reasoning that produced the prediction was sound, and the default is what makes it moot, so a future `emptyOutDir: false` reintroduces the whole problem.

`clean` was re-proved anyway, on a real build rather than 1.3.1's trivial one. Root `pnpm clean` and `pnpm --filter @marketpulse/frontend run clean` both leave `apps/frontend/dist` **absent**, no stray `*.tsbuildinfo` anywhere. Note the asymmetry between the two halves of that command, which is visible in the tree afterwards: `tsc -b --clean` empties `apps/backend/dist` and `packages/shared/dist` but leaves the directories, while `rm -rf` removes the frontend's outright. Both are correct; they just look different in a `find`.

### The deployable unit — and it is the opposite of the backend's

Copied `dist/` alone — **two files, 191 kB, no `package.json`, no `node_modules`** — to a directory outside the workspace and served it with `python3 -m http.server`. It loads and renders in Chrome: heading, paragraph, and `AAPL` resolved through the shared package. The bundle contains **zero** bare imports and no mention of `@marketpulse/shared`; there is nothing left to resolve at runtime.

That is the exact inverse of the backend, where `dist/` alone is _not_ runnable and the package directory is (Task 1.2.6). The two halves of a deployment are genuinely different shapes: one is a directory of static files a CDN can hold, the other is a Node package that needs its dependencies present. Story 1.11 should not look for one answer.

The inlining consequence, confirmed rather than assumed: changed a string in `packages/shared/src/ticker.ts`, ran `pnpm --filter @marketpulse/shared build`, and the built frontend was **untouched** — same file list, same md5, still carrying the old string. A built frontend is a snapshot taken at bundle time; the workspace symlink is not part of the artefact and rebuilding shared does not reach it. The backend's relationship is the other one, and it is still latent until Story 1.12's first real import.

### `preview`

`apps/frontend` gains `"preview": "vite preview"`, with **exactly the status `apps/backend`'s `start` has**: an extra, not a seventh verb, no root fan-out, no place in `verify`, no obligation on the other two packages. It serves already-built output and builds nothing, so a stale `dist/` is a stale page. Signal behaviour checked to the same standard `start` was held to: `SIGTERM` to the `pnpm preview` wrapper exits 143, releases 4173 and leaves no orphaned `vite` process.

**The port question is settled by stating 4173 explicitly**, and `vite.config.ts` carries the reasoning. `preview` inherits `server.strictPort` but _not_ `server.port`, so a config that named only 5173 would read as though it covered both servers while actually leaving one at a default. `preview.strictPort` is deliberately **not** set — it is inherited, and a second copy is one more place for the two to disagree. Re-verified after the change: preview binds `[::1]:4173`, and a second `pnpm preview` exits 1 with `Error: Port 4173 is already in use`.

### `vite preview` is not a static host, and the difference is a trap

The one finding here that was not on the list. `vite preview` has SPA fallback on by default, and it is broader than "unknown routes get `index.html`":

| request               | `vite preview` | `python3 -m http.server` |
| --------------------- | -------------- | ------------------------ |
| `/`                   | 200 html       | 200 html                 |
| `/assets/<hashed>.js` | 200 js         | 200 js                   |
| `/no-such-route`      | **200 html**   | **404**                  |
| `/assets/nope.js`     | **200 html**   | 404                      |

The last row is the one with teeth: a **missing asset is served as HTML with a 200**, which reaches the browser as a module MIME-type error rather than as a 404 naming the file. So "it works in `vite preview`" is a weaker claim than it looks — it is why this task loaded the output on a plain static server too, and why Story 1.11 must state whether the chosen host does SPA fallback rather than discovering it from a blank page once Story 1.4 adds a router.

### Size budget: not yet

Not worth one at this point, and the reason is that the number carries no information yet. 190.80 kB is React and nothing else — the application code is under a kilobyte of it — so a budget set today would be a budget on a dependency's size, and the first real component would blow through it for entirely legitimate reasons. **Deferred to Epic 14 (Performance & Scale Validation)**, which is where a budget can be set against measured page behaviour rather than against a placeholder. Decided 2026-08-30; a deliberate gap with a date, not an oversight.

The destination had to be corrected on the way: this task's Work section deferred to "Story 1.14 (performance)", and **there is no Story 1.14** — Epic 1 has twelve stories and performance is Epic 14. A deferral pointing at a story that does not exist is a deferral nobody ever picks up, which is the failure mode dating the decision was supposed to prevent. Worth a glance at any other forward reference written the same way.

### For Task 1.3.5

- `pnpm verify` passes from the root in **4.2s** from a clean tree
- The command table in `README.md` gains `preview` — with `start`'s status, and the third port (4173)
- `CLAUDE.md`'s port list is now three: backend 3000, dev server 5173, preview 4173. Only the first two are anyone's decision; 4173 is Vite's default written down
- Two predictions to record as **resolved wrong**, alongside the install-script one this story has already failed three times: the hashed-asset accumulation premise above, and — from Task 1.3.1 — nothing about `emptyOutDir` was known when the two-producer collision was resolved by removing a producer
- The `base: "/"` absolute-path note and the `vite preview` fallback table both belong in the Story 1.11 amendment rather than in `CLAUDE.md`
