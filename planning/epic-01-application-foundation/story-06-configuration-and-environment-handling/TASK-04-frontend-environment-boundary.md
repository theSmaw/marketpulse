# Task 1.6.4 — The frontend's environment boundary

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.3

## Objective

Draw the line between what the browser may see and what it may not, prove the line holds against the built artefact, and adopt as decisions the two things that are currently true only by default.

## Work

- **Verify what is already solved and do not redo it.** `apps/frontend/tsconfig.json` reads `"types": ["vite/client"]` since Task 1.4.2, so `import.meta.env` typechecks — confirm it and move on. The guarantee that matters is the other half and it was re-measured then: a deliberate `process.env` reference in browser code still fails `TS2591`, because what does the work is the list being **explicit**, not the list being empty. Do not weaken it to make a helper convenient, and do not add the entry a second time
- **Adopt `envPrefix` as a decision.** Vite exposes only `VITE_`-prefixed variables to client code, which pre-solves this story's whitelisting criterion by accident. State it in `vite.config.ts` as a choice with the reason beside it, and write down the two things that defeat it: **widening `envPrefix`**, and **`define`**, which injects whatever it is given with no prefix rule at all. Neither is configured today, and the comment should say that a `define` entry is the way this boundary gets breached without anyone noticing
- **Prove the boundary against the artefact rather than the documentation.** Put a non-prefixed variable and a prefixed one in a `.env`, reference both, build, and grep `dist/assets/*.js` for each value. The prefixed one is present and the non-prefixed one is absent — and the second half is the interesting one. This is the same method Task 1.4.5 used to prove no story string reaches the bundle, and it works for the same reason
- **Decide `envDir`, and note there is now a house rule to diverge from.** `.env` files load from the Vite project root — `apps/frontend/` — not the repository root. `.gitignore`'s patterns are unanchored so the new location is already covered (verified in Task 1.3.4's section), but a developer with a repository-root `.env` will find the frontend silently ignoring it. Either point `envDir` at the root or leave it and document the location; both are defensible and the undocumented version is not. **What changed is that the backend answered the same question first:** Task 1.6.3 resolves its file from `import.meta.dirname`, so it is `apps/backend/.env` — package-local, and deliberately not the cwd or the repository root. Leaving `envDir` alone makes the two symmetric, one file per package beside its `package.json`; pointing it at the root makes the frontend the odd one out. That is an argument rather than a decision, but it is no longer a free choice between two equals
- **`vite.config.ts` cannot see a `.env` file, and this is the trap in the bullet below.** Measured, not assumed: with `PROBE_PLAIN` and `VITE_PROBE` both set in `apps/frontend/.env`, `process.env.PROBE_PLAIN` and `process.env.VITE_PROBE` are **both `undefined`** inside `vite.config.ts` during a build. Vite loads env files into `import.meta.env` for client code and does **not** put them on `process.env`; a config file that wants them has to call `loadEnv()` explicitly. So "the frontend's ports read from the environment" and "the frontend's ports read from a `.env` file" are two different pieces of work, and the first one does not imply the second
- **Settle the port asymmetry, because this story is the first one at it.** The backend reads `PORT` and `HOST` from the environment; the frontend's 5173 and 4173 are literals in `vite.config.ts` with no override. Story 1.8 was handed the same question and whichever story arrives first owns it. The distinction that makes this tractable is the one the story warns about conflating: `vite.config.ts` runs in **Vite's Node process**, sits outside the frontend's tsconfig `include`, and already has a Node-globals block in `eslint.config.mjs` — so it **can** read `process.env`, while the client code next door cannot. Note `strictPort: true` means an override that moves the port fails loudly rather than drifting, and that Story 1.12's CORS allowlist is pinned to 5173. Two things Task 1.6.3 adds to this: the backend's ports now come from a `.env` file as well as from the environment, so "symmetric" is a higher bar than it was — and per the bullet above, a `vite.config.ts` reading `process.env` gets the environment but **not** that file, so matching the backend properly means `loadEnv()` and not just `process.env`
- **State the build-time-inlining consequence and hand it on rather than solving it.** Frontend configuration is statically substituted at build time, so "distinct configuration per environment" means a rebuild per environment and **one artefact cannot be promoted across environments**. That is the same shape as ADR 0003's finding about `base`. Inventing a runtime mechanism — a config endpoint, an injected script, a fetched JSON — is a deployment decision as much as a configuration one, and Story 1.11 should be the one to want it. If this task declines to build one, say so as a decision with the trigger that would reverse it

## Done when

- The prefixed/non-prefixed grep against the built bundle is recorded with both results, and the probe variables are removed afterwards
- `envPrefix` and `envDir` are explicit in `vite.config.ts` with their reasons, and `define` is named there as the thing that defeats the boundary
- The port asymmetry is either resolved or deliberately left standing, with the reason and the note that Story 1.8 no longer owns the question
- `process` still fails to typecheck in `apps/frontend/src`, re-verified by a deliberate reference that is then removed
- The artefact is still **three files** and its size delta is recorded against Task 1.5.6's 265 modules / 342.08 kB / 9.82 kB
- `pnpm verify` exits 0

## Notes

Nothing in the frontend reads configuration today — no request, no host, no key. This task builds an empty boundary and proves it, which is the right order: the first real variable arrives in Story 1.12 with the backend's URL, and by then the rules should already exist.

## Outcome

**Done on 2026-08-31.** Two files changed and no line of application code: `envPrefix` and `envDir` are now stated in `vite.config.ts`, and `eslint.config.mjs` grew a frontend block with real rules in it. The artefact is byte-identical — same hashes, 265 modules, 342.00 kB, 9.82 kB, three files.

The task expected to verify a guarantee and move on. The guarantee was gone.

### The finding: `process` typechecks in browser code, and has since Task 1.4.5

The Done-when bullet asked for a deliberate `process` reference to be re-verified as TS2591. It is **exit 0**, and so is every other Node global:

```
$ cat apps/frontend/src/__probe.ts        # temporary, removed
import nodeProcess from "node:process";
import path from "node:path";
export const a = import.meta.env.MODE;
export const b = process.env.SECRET;
export const c = nodeProcess.env.SECRET;
export const d = path.join("a", "b");
export const e = __dirname;
export const f = Buffer.from("x");
$ npx tsc -p tsconfig.json --noEmit ; echo $?
0
```

The probe file was confirmed to be in the program before concluding anything from a silent pass — a deliberate `const zz: number = "x"` in it reports TS2322 at the right line.

`--explainFiles` names the mechanism exactly:

```
@types/node/index.d.ts
  Type library referenced via 'node' from file 'storybook/dist/node-logger/index.d.ts'
  Type library referenced via 'node' from file 'vite/dist/node/index.d.ts'
```

and the chain from our own source is `src/components/*/*.stories.tsx` → `@storybook/react-vite` → `@storybook/builder-vite` → both of those. **An explicit `types` array does not filter a `/// <reference types="node" />` inside an included declaration file.** The array still does the job it was written for — it stops _auto-discovery_ — and Task 1.4.2's TS2591 measurement was correct when it was taken. Task 1.4.5 put `.stories.tsx` under `src/`, which put Storybook's node-side types into the application's program, and nobody re-ran the check. This task is the re-run.

### What is downstream of tsc, measured against the artefact

Neither of the two things that could have caught it does:

| Written in `src/main.tsx`          | Build  | Emitted             | Runtime               |
| ---------------------------------- | ------ | ------------------- | --------------------- |
| `process.env.PROBE_PLAIN`          | exit 0 | `{}.PROBE_PLAIN`    | `undefined`, silently |
| `import nodePath from "node:path"` | exit 0 | externalised import | fails in the browser  |

The first is Vite defining `process.env` as `{}` — safe, in that nothing leaks, and silent, in that nothing says so. The second is the worse one: Rolldown prints `Module "node:path" has been externalized for browser compatibility` on stdout and `vite build` **still exits 0**, so a bundle that cannot run is a green build.

### The replacement: lint, not types

`eslint.config.mjs` gains a block scoped to `apps/frontend/src/**` — `no-restricted-globals` over `process`, `Buffer`, `__dirname`, `__filename`, `global`, `require`, `setImmediate`, `clearImmediate`, and `no-restricted-imports` over the `node:*` pattern. Verified firing rather than assumed:

```
$ npx eslint apps/frontend/src/main.tsx
  64:1   error  'node:path' import is restricted from being used by a pattern...  no-restricted-imports
  65:19  error  Unexpected use of 'process'...                                    no-restricted-globals
  66:19  error  Unexpected use of 'Buffer'...                                     no-restricted-globals
  67:19  error  Unexpected use of '__dirname'...                                  no-restricted-globals
```

Scoped to `src` on purpose: `vite.config.ts` and the two `.storybook/` files are Node processes and legitimately need all of it, and the trailing `disableTypeChecked` block already owns them.

The alternative was giving the stories their own tsconfig project, which would take `@storybook/react-vite` out of the application's program and make this a type error again. That is a fourth project, a `references` entry and a second place the workshop's build lives — more than the finding is worth while a rule says the same thing at the same moment. It is written down in the config as the reversal.

The stale claim in the per-package globals block — "the frontend sets `types: []` so that `process` fails to typecheck there ... where the two disagree, tsc is right" — was wrong on both halves and has been corrected in place rather than deleted, because the history is the point.

### The boundary itself holds, and it is enforced at the reference site

The whole reason the above is a lint finding rather than an incident: `envPrefix` was never the thing that broke. Both probes in `apps/frontend/.env`, both referenced from `main.tsx`, built and grepped:

| Variable      | Value in `.env`       | In `dist/assets/*.js` |
| ------------- | --------------------- | --------------------- |
| `VITE_PROBE`  | `viteprobevalue7c1b`  | present, 1 match      |
| `PROBE_PLAIN` | `plainprobevalue9f2a` | **absent, 0 matches** |

And the second half is stronger than "absent from the string pool" — the reference itself is substituted:

```
console.log(`probe`, `viteprobevalue7c1b`, void 0);
```

`void 0`. A non-prefixed variable is not merely unexposed; the read is compiled away to `undefined`. Both probes and the `.env` were removed afterwards and `git status` is clean of them.

### The decisions this task was asked to take

**`envPrefix: ["VITE_"]` is now a decision.** Same value as the default, stated with its reason, and with the two things that defeat it named beside it: widening the array, and `define`, which substitutes whatever it is given with no prefix rule at all. A `define` entry is the way this boundary gets breached without anyone editing the prefix line.

**`envDir: "."`, so `apps/frontend/.env`.** Vite's default, adopted rather than inherited, and now with an argument behind it that did not exist a task ago: Task 1.6.3 resolves the backend's file from `import.meta.dirname` to `apps/backend/.env`, so the house rule is one env file per package beside its `package.json`, and pointing this at the repository root would make the frontend the odd one out. The cost is stated in the config: a root `.env` is silently ignored by **both** packages, and `.gitignore` covers every location, so being ignored by git is not the signal that the file is in the wrong place. That is Task 1.6.6's problem to document.

**The port asymmetry stands, and Story 1.8 no longer owns the question.** The backend reads `PORT` and `HOST` because they are properties of a deployed process that only Story 1.11's container can set. Neither 5173 nor 4173 survives into a deployment at all — `dist/` is three static files on somebody else's host, and both Vite servers are development tools. So this is two packages having different kinds of port rather than an inconsistency to resolve. Costs, both recorded in `vite.config.ts`: a developer with a busy 5173 edits a line instead of exporting a variable (`strictPort` at least tells them immediately), and Story 1.12's CORS allowlist is pinned to this origin, so a movable port is a second way to break CORS with a symptom naming neither the port nor the cause. The reversal trigger is two people needing two frontends at once, and the shape it takes then is `loadEnv()` — not `process.env`, per the measurement below.

**No runtime configuration mechanism, deliberately.** Frontend configuration is statically substituted at build time — proved above by the literal in the bundle — so "distinct configuration per environment" means a rebuild per environment and **one artefact cannot be promoted across environments**. Same shape as ADR 0003's finding about `base`. A config endpoint, an injected script or a fetched JSON is a deployment decision as much as a configuration one, and nothing in the frontend reads configuration yet, so inventing one here would be a mechanism with no consumer designed against no deployment. Story 1.11 is the story that should want it; the reversal trigger is a deployment that needs the same artefact in two environments, which is a question about the hosting Story 1.11 picks.

### `vite.config.ts` and `.env`, restated because it is the trap in two of the above

Measured before this task started and re-stated in the config: with both probes in `apps/frontend/.env`, `process.env.PROBE_PLAIN` and `process.env.VITE_PROBE` are **both `undefined`** inside `vite.config.ts` during a build. Vite loads env files for client code and does not put them on the process. A config file that wants them calls `loadEnv()`. So "the frontend's ports read from the environment" and "the frontend's ports read from a `.env` file" are two different pieces of work, and the first does not imply the second.

### The artefact, and `pnpm verify`

Exit 0. `dist/` is unchanged in every respect — 265 modules, `index-DUP5HHpy.js` at **342.00 kB** (111.95 kB gzipped), `index-FpotQPsC.css` at **9.82 kB**, still three files, identical content hashes to the pre-task build. That is the expected result: `envPrefix` and `envDir` restate defaults, and lint rules do not ship.

One correction to the figure this task was told to measure against. Task 1.5.6 recorded 342.08 kB; the tree is at 342.00 kB and has been since commit `b244f15`, "Drop Placeholder's single-valued label prop", which landed after Story 1.5 closed. The 0.08 kB is that commit, not this task.
