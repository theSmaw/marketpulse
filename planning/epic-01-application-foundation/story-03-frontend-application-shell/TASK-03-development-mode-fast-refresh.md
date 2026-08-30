# Task 1.3.3 — Development mode: fast refresh and the root dev loop

**Status:** Not started
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.2

## Objective

Make the frontend's development loop real — hot module replacement that preserves component state — and make it behave when it runs in parallel with the backend's loop and the shared package's watcher under root `pnpm dev`. This is the last placeholder `dev` script in the workspace.

## Work

- Install `@vitejs/plugin-react` (or the chosen equivalent) and wire it into `vite.config.ts`. Plain Vite already replaces modules on save; **React Fast Refresh — the part that keeps component state across an edit — is the plugin's**, and the difference is only visible in a component holding state. Give the placeholder shell something stateful enough to tell them apart, even if it is a counter that gets deleted afterwards
- The plugin is a tool, so it is a root devDependency under the Task 1.1.7 rule. Expect a second `allowBuilds` decision if it brings an install script; the answer is the same as Task 1.3.1's — allowlist the specific package
- **Set `clearScreen: false`.** This is the exact lesson `--preserveWatchOutput` taught on the TypeScript side, in a new costume: under `pnpm -r --parallel run dev` a process that clears the terminal takes every other package's output with it, including the backend server's JSON log lines. Vite clears by default. Verify it by running root `pnpm dev` and editing a frontend file while watching the backend's output survive
- **Settle the dev-server port and how it is configured**, and check it against the backend's 3000. Vite defaults to 5173, so there is no conflict today; the question is what happens when there is one. Vite's default is to pick the next free port silently, which is the opposite of the backend's behaviour — Task 1.2.1 made a busy `PORT` exit 1 with `EADDRINUSE` intact. Decide whether the frontend should be equally loud (`strictPort`), and note it either way: Story 1.8's "ports are configurable and conflicts produce a clear message" criterion is recorded as half-met on the backend, and this is the other half
- Run the full root `pnpm dev` and check the properties Task 1.2.6 checked for the backend, because they are exactly the ones that break under a parallel fan-out:
  - Ctrl-C stops everything and leaves **no orphaned process and no held port** — check the Vite process specifically, not just that the shell prompt returned
  - Output is legible: three packages' streams interleaved and prefixed, nobody clearing anyone
  - `packages/shared`'s watcher still runs alongside both apps
- **Measure the edit-to-visible-update time and write it down**, in the habit Task 1.2.4 established for the backend's ~1.1s restart. A baseline is what makes a later regression visible, and "HMR feels fast" is not one. Note whether component state survived, because a full page reload and a fast refresh look similar and mean different things
- Confirm what happens on a **type error** while the dev server is running. esbuild strips types without checking them, so the expectation is that the browser keeps working and only `tsc -b` complains. That is a real difference from the backend loop, where `tsc` produces the artefact and a type error stops the restart — worth stating plainly for whoever works in both

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
