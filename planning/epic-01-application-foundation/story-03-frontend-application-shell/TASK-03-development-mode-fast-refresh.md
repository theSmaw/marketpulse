# Task 1.3.3 — Development mode: fast refresh and the root dev loop

**Status:** Complete
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.2

## Objective

Make the frontend's development loop real — hot module replacement that preserves component state — and make it behave when it runs in parallel with the backend's loop and the shared package's watcher under root `pnpm dev`. This is the last placeholder `dev` script in the workspace.

## Work

- Note that one piece of the React tooling is **already in place**: Task 1.3.2 adopted `eslint-plugin-react-hooks@7.1.1` and wired `configs.flat["recommended-latest"]` into the flat config, scoped to `apps/frontend/src/**`. That is the lint half and it is done. `@vitejs/plugin-react` is the runtime half and is unrelated to it — do not read one as having settled the other
- Install `@vitejs/plugin-react` and wire it into `vite.config.ts`. Plain Vite already replaces modules on save; **React Fast Refresh — the part that keeps component state across an edit — is the plugin's**, and the difference is only visible in a component holding state. Give the placeholder shell something stateful enough to tell them apart, even if it is a counter that gets deleted afterwards
- **That throwaway counter is now governed by 17 lint rules, which is not what "throwaway" usually implies.** Task 1.3.2's `eslint-plugin-react-hooks` block covers `apps/frontend/src/**`, and most of its rules are the React Compiler's Rules of React at `error` — `set-state-in-effect`, `set-state-in-render`, `purity`, `immutability`. A counter written the quick way, especially one driven from a `useEffect`, can fail `pnpm verify` while working perfectly in the browser. Write it as a plain `useState` and an event handler
- **`exhaustive-deps` now fails the build rather than warning**, because Task 1.3.2 added `--max-warnings 0` to every `lint` script. It ships at `warn` and there is no longer any such thing here. If this task reaches for a `useEffect` to drive the HMR probe, an incomplete dependency array is a hard failure — worth knowing before it looks like a mystery
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

## Outcome

Fast refresh works, and the throwaway counter earned its keep — it caught the
thing this task exists to distinguish. `pnpm verify` passes from a clean tree in
**4.8s**. Every claim below was measured; two of the measurements changed what
got written.

### Fast refresh, and the negative control that makes the number mean something

`@vitejs/plugin-react@6.1.1`, as the task predicted, and the peer ranges were
re-checked rather than trusted: `@vitejs/plugin-react-oxc@0.4.3` still peers on
`^6.3.0 || ^7.0.0` and **does not admit Vite 8**, despite Vite 8 being the
Rolldown/oxc release its name points at. The trap is real and still set.

Edit-to-visible-update, measured by stamping the write and having a
`MutationObserver` in the page stamp the DOM change:

| Edit | With plugin, no StrictMode | With plugin + StrictMode |
| ---- | -------------------------- | ------------------------ |
| 1    | 858 ms (cold)              | 142 ms                   |
| 2    | 257 ms                     | 115 ms                   |
| 3    | 94 ms                      | 138 ms                   |
| 4    | 113 ms                     | —                        |

**Warm baseline: ~100–140 ms.** The first edit after a server start is ~850 ms
and is not the number to regress against. For comparison the backend's
edit-to-new-listener is ~1.1s, so the frontend loop is roughly an order of
magnitude tighter — different mechanisms (a module swap against a process
restart), and worth knowing which one a slow loop is.

The measurement that matters more than the timings: **the same edit was run with
the plugin removed.** The heading updated either way. What differed is that the
counter reset from 5 to 0 and a `window.__probe` marker set before the edit was
gone — a full page reload. That is the whole point of the plugin, and it is
invisible if you only watch the text you edited change. Anyone checking "does
HMR work?" by editing a heading is not testing what they think they are.

### Two settings, both verified rather than assumed

- **`clearScreen: false`** — verified under a real pty, because a redirected log
  file proves nothing here: Vite only clears on a TTY, so the first check
  (`pnpm dev > file`) showed no clearing with the setting _either way_ and was
  worthless. Driving it through `pty.openpty()` gives **3 clear sequences with
  `clearScreen: true` and 0 with `false`**. Note also what the sequence is:
  `ESC[1;1H ESC[0J` (cursor home, erase to end of display), **not** the `ESC[2J`
  a grep would reach for first — grepping for `ESC[2J` reports zero in both
  configurations and looks like a passing test. And it clears on **every HMR
  update**, not only on restart, so under root `pnpm dev` an unset `clearScreen`
  would wipe the backend's log lines on every frontend save rather than
  occasionally.
- **`strictPort: true`** — adopted, and the decision is recorded in the config
  with its reason. A second dev server against a busy 5173 now exits **1** with
  `Error: Port 5173 is already in use`, matching the backend's `EADDRINUSE`
  behaviour from Task 1.2.1 instead of quietly binding 5174. **This closes the
  other half of Story 1.8's "ports are configurable and conflicts produce a
  clear message" criterion**, which was recorded as half-met on the backend.

  The larger reason is not symmetry: Story 1.12 configures CORS against this
  origin, and a frontend that silently moves to 5174 fails an allowlist pinned
  to 5173 as a browser CORS error — a symptom naming neither the port nor the
  cause.

  Worth recording for whoever tests this next: a squatter bound to
  `127.0.0.1:5173` does **not** conflict with Vite, which binds `::1`. The first
  attempt at this test passed for that reason and proved nothing.

### StrictMode adopted, after the measurement rather than before

Added to `main.tsx`, in the order the task required — the fast-refresh reading
was taken on the plain tree first, then retaken with StrictMode on. **The
reading is unchanged**: state survived, timings in the same band. Adopting it
first would have made a double-render and a lost-state bug look alike, which is
exactly why 1.3.2 deferred it. It costs +0.04 kB in the production bundle
(190.76 → 190.80 kB); React strips it in production.

### The dev server still does not typecheck, now confirmed for `.tsx`

Task 1.3.1 established this for a plain `.ts` entry. Re-checked here through the
React plugin's transform, which is the part that was open: a `const wrong:
number = "..."` in `App.tsx` produced `error TS2322` from `tsc -b` (exit 1),
while the dev server applied it as **an ordinary HMR update** — no error
overlay, no console error, component state preserved, page working. A type error
reaches the browser silently and is caught only by the editor or `pnpm verify`.

A **syntax** error behaves completely differently, observed by accident when a
bad regex ate a closing tag: the oxc transform fails loudly, the dev server logs
a full parse error with source context, the browser console gets
`[vite] Failed to reload /src/App.tsx`, and **the page keeps the last good
render**. So the two failure modes are opposites — syntax is loud and blocking,
types are silent and applied — which is worth knowing before diagnosing "my edit
didn't take".

### Root `pnpm dev` with all three packages

All three run together, output prefixed and interleaved, nobody clearing anyone.
Ctrl-C (SIGINT to the process group) took down **all seven processes** — the
pnpm supervisor, `scripts/dev.sh`, the vite server, both `tsc -b --watch`
watchers, `node --watch`, and the `node dist/index.js` grandchild — and released
both 5173 and 3000. Checked the grandchild specifically, per Task 1.2.6's
method, rather than trusting the prompt returning.

### The counter was removed

`App.tsx` is byte-identical to its Task 1.3.2 state. The probe was scaffolding
and the shell is meant to be boring; leaving a "Fast-refresh probe: 0" button in
a product shell would have made Story 1.4 inherit it and shipped it in the
bundle. Re-creating it is four lines, and doing so is the way to re-check this
task's claim:

```tsx
const [clicks, setClicks] = useState(0);
// ...
<button
  type="button"
  onClick={() => {
    setClicks((n) => n + 1);
  }}
>
  {clicks}
</button>;
```

Written as `useState` plus an event handler deliberately — as this task warned,
a `useEffect`-driven counter trips `set-state-in-effect` and fails `pnpm verify`
while working perfectly in the browser.

### Also observed

- **No install scripts, for the third task running.** `@vitejs/plugin-react`
  brought none, and a fresh sweep of the whole tree still finds zero
  `preinstall`/`install`/`postinstall`. `allowBuilds` remains empty and
  untested — the prediction has now failed three times and should probably stop
  being repeated as an expectation.
- **None of the three optional peers is installed.** `oxc-transform-react`,
  `@rolldown/plugin-babel` and `babel-plugin-react-compiler` are all absent and
  the plugin works alone, exactly as the `optional: true` in its manifest
  implies. Adding one is a decision to state.
- **The plugin costs nothing in the production bundle** — 190.80 kB against
  190.76 kB, and the 0.04 kB is StrictMode, not the plugin. Fast Refresh is
  development-only.
- `apps/frontend`'s `dev` was the last `echo` placeholder among the six verbs.
  The only placeholders left in the workspace are the three `test` scripts.

### For Task 1.3.5

Beyond what that task already carries: the **warm ~100–140 ms HMR baseline** and
that the first edit after a start is ~850 ms; the **`strictPort` decision**,
which settles Story 1.8's port criterion and needs amending there; the
**`ESC[1;1H ESC[0J` detail**, because the obvious way to verify `clearScreen`
reports a false pass; the **StrictMode adoption** as a dated decision; and the
**silent-type-error / loud-syntax-error asymmetry**, which belongs next to the
existing note that the frontend dev server does not typecheck.
