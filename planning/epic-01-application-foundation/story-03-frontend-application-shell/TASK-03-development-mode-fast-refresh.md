# Task 1.3.3 — Development mode: fast refresh and the root dev loop

**Status:** Not started
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.2

## Objective

Make the frontend's development loop real — hot module replacement that preserves component state — and make it behave when it runs in parallel with the backend's loop and the shared package's watcher under root `pnpm dev`. This is the last placeholder `dev` script in the workspace.

## Work

- Note that one piece of the React tooling is **already in place**: Task 1.3.2 adopted `eslint-plugin-react-hooks@7.1.1` and wired `configs.flat["recommended-latest"]` into the flat config, scoped to `apps/frontend/src/**`. That is the lint half and it is done. `@vitejs/plugin-react` is the runtime half and is unrelated to it — do not read one as having settled the other
- Install `@vitejs/plugin-react` and wire it into `vite.config.ts`. Plain Vite already replaces modules on save; **React Fast Refresh — the part that keeps component state across an edit — is the plugin's**, and the difference is only visible in a component holding state. Give the placeholder shell something stateful enough to tell them apart, even if it is a counter that gets deleted afterwards
- **Which plugin is a real decision on Vite 8, and the obvious-looking answer is wrong.** Checked at the registry while amending this task: `@vitejs/plugin-react` is at 6.1.1 and peers on `vite ^8.0.0`; `@vitejs/plugin-react-swc` (4.3.3) allows `^4 || ^5 || ^6 || ^7 || ^8`; but **`@vitejs/plugin-react-oxc` (0.4.3) peers on `^6.3.0 || ^7.0.0` and does not admit Vite 8** — which is the trap, because Vite 8 is the Rolldown/oxc release and that plugin's name makes it look like the native fit. Take `@vitejs/plugin-react` unless something argues otherwise, and re-check the ranges rather than trusting this bullet
- Note that `@vitejs/plugin-react@6` declares `oxc-transform-react`, `@rolldown/plugin-babel` and `babel-plugin-react-compiler` as peers, **all three `optional: true`**. So the plugin installs and works alone, and the transformer behind Fast Refresh is an opt-in rather than something inherited by accident. If one of them gets added, that is a decision to state, not a dependency to acquire quietly
- The plugin is a tool, so it is a root devDependency under the Task 1.1.7 rule. It may bring the workspace's first install script — **neither Task 1.3.1 nor Task 1.3.2 did**, contrary to what this story predicted: Vite 8 ships Rolldown as prebuilt per-platform binaries and nothing in the tree has a `preinstall`/`install`/`postinstall` at all, so `allowBuilds` is still empty and still untested. If it fires here, the answer is unchanged: allowlist the specific package by name, never disable the check
- **Set `clearScreen: false`** in the `vite.config.ts` Task 1.3.1 created — the file already exists, so this is an addition to it rather than a new file and needs no further lint-config work. This is the exact lesson `--preserveWatchOutput` taught on the TypeScript side, in a new costume: under `pnpm -r --parallel run dev` a process that clears the terminal takes every other package's output with it, including the backend server's JSON log lines. Vite clears by default. Verify it by running root `pnpm dev` and editing a frontend file while watching the backend's output survive
- **Settle the dev-server port and how it is configured**, and check it against the backend's 3000. Vite defaults to 5173, so there is no conflict with the backend; the question is what happens when 5173 itself is taken. **This is no longer hypothetical — Task 1.3.1 hit it on the first run**: 5173 was already in use by something else on the machine, and Vite printed `Port 5173 is in use, trying another one...` and quietly bound 5174. That is the opposite of the backend's behaviour, where Task 1.2.1 made a busy `PORT` exit 1 with the `EADDRINUSE` record intact, and it means the URL in the terminal is the only reliable statement of where the app is. Decide whether the frontend should be equally loud (`strictPort`), and note it either way: Story 1.8's "ports are configurable and conflicts produce a clear message" criterion is recorded as half-met on the backend, and this is the other half
- Run the full root `pnpm dev` and check the properties Task 1.2.6 checked for the backend, because they are exactly the ones that break under a parallel fan-out:
  - Ctrl-C stops everything and leaves **no orphaned process and no held port** — check the Vite process specifically, not just that the shell prompt returned
  - Output is legible: three packages' streams interleaved and prefixed, nobody clearing anyone
  - `packages/shared`'s watcher still runs alongside both apps
- **Adopt `StrictMode` here, or record why not.** Task 1.3.2 deliberately left it out of `main.tsx` — it is in every Vite React template, so its absence looks like an oversight and is not. It double-invokes render and effects in development, which is exactly the signal this task reads when it asks whether component state survived a fast refresh. Take the measurement below on the plain tree first, then add `StrictMode` and note whether the reading changes; adopting it before measuring makes a double-render and a lost-state bug look alike
- **Measure the edit-to-visible-update time and write it down**, in the habit Task 1.2.4 established for the backend's ~1.1s restart. A baseline is what makes a later regression visible, and "HMR feels fast" is not one. Note whether component state survived, because a full page reload and a fast refresh look similar and mean different things
- Confirm what happens on a **type error** while the dev server is running. **Task 1.3.1 already established this for a plain `.ts` entry** — `tsc -b` failed with TS2322 while the dev server stripped the annotation and served the file happily — so what is left here is narrower and still worth checking: whether the same holds for a `.tsx` file going through the React plugin's transform, and whether an HMR update carrying a type error is applied silently or surfaces anything in the browser. Note that the stripping is Rolldown/oxc's, not esbuild's; Vite 8 does not use esbuild, which this story assumed throughout and Task 1.3.1 disproved

## Done when

- Editing a component updates the browser without a full reload, and component state survives
- Root `pnpm dev` runs the frontend, the backend and the shared watcher together, legibly, with no package clearing another's output
- Ctrl-C leaves no orphaned `node`/`vite`/`tsc` process and no held port
- The edit-to-update time has a recorded baseline
- The port behaviour on a conflict is decided and documented
- `pnpm verify` passes from the repository root

## Notes

`apps/frontend`'s `dev` was the last `echo` placeholder among the six verbs' real implementations; after this task the only remaining placeholders in the workspace are the three `test` scripts, which Story 1.9 owns.

The backend's loop is a pattern to match, not to redesign — Story 1.8 says so explicitly. What that story then owns is making the pair legible _together_; what this task owns is making the frontend half worth pairing with.
