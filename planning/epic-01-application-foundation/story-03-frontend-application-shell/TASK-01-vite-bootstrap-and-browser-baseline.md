# Task 1.3.1 — Vite bootstrap and the browser baseline

**Status:** Complete
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** nothing (Story 1.1 is complete)

## Objective

Turn `apps/frontend` from a typed skeleton into a package a bundler serves and builds — no React yet. This task settles the two open decisions the story carries (the build tool, and what the six verbs mean once a bundler exists), the browser baseline that `target`/`lib` encode, and the output-directory collision between `tsc` and Vite. Everything after this task is application code; this one is the ground it stands on.

## Work

- **Settle the build tool.** Vite is the story's default assumption. Record it as a decision with its rejected alternatives rather than installing it silently — Task 1.3.5 writes the ADR, and it can only do that from what this task decided
- Install Vite as a **root** devDependency. It is a tool, so the Task 1.1.7 rule puts it at the workspace root alongside ESLint, Prettier and TypeScript. Nothing about the frontend's `package.json` changes except its scripts
- **The install-script policy fires here for the first time.** `allowBuilds` in `pnpm-workspace.yaml` is an allowlist and an un-allowlisted install script is a hard `pnpm install` failure (exit 1), not a warning. esbuild is the predicted trip. Allowlist the specific package that fails, by name, and never disable the check. Note what actually fired — the prediction is from Task 1.1.1 and has never been tested
- Add `apps/frontend/index.html` — Vite's real entry point, at the package root rather than in `src/`, referencing `src/main.ts` as a module script. It is not inside any tsconfig `include` and does not need to be
- Rename/replace `src/index.ts` with `src/main.ts` so the entry name matches what `index.html` loads. **`tsc -b --clean` before deleting the old file**, or `dist/index.js` is orphaned permanently — the trap measured in Task 1.2.6
- Keep the `@marketpulse/shared` import alive in whatever the entry becomes. It is the only thing proving the workspace dependency resolves through a bundler as well as through `tsc`, and it costs one line
- **Settle the output directories, which collide.** `tsc -b` emits to `apps/frontend/dist`; Vite's default `build.outDir` is also `dist`. Two producers, one directory, and `tsc -b --clean` knows about only one of them. Decide deliberately between giving `tsc` its own directory, giving Vite one, or making the TypeScript half emit-free — noting that the frontend is a **composite project referenced by nothing**, so unlike `packages/shared` nobody compiles against its declarations. Whichever way it goes, `clean` must remove both outputs; say so here and prove it in Task 1.3.4
- **Settle what the six verbs mean.** `typecheck` stays `tsc -b` — that half is not in question. `build` is the decision: `vite build` emits the right artefact and typechecks nothing, `tsc -b` typechecks and emits the wrong artefact, and the usual answer is `tsc -b && vite build`. Adopt one and state why; Task 1.3.4 is where the production half of it gets exercised
- Replace the `dev` script's `echo` with `vite`. Task 1.3.3 owns making that loop behave under the root parallel fan-out; this task only needs it to serve the page
- Add `vite.config.ts` **only if this task needs one**, and if so, extend `eslint.config.mjs`'s trailing block so it gets `tseslint.configs.disableTypeChecked` — the same treatment `eslint.config.mjs` already gives itself, for the same reason: the file sits outside every package's tsconfig, so type-aware rules cannot run on it and error if asked to. That block is also where the frontend `globals` entry stops being inert (ADR 0001 §8), because this is the repository's first per-package JS/TS tooling file
- Keep `vite.config.ts` free of Node APIs (`path`, `process`, `__dirname`). Reaching for one wants `@types/node` in `apps/frontend`, which is exactly what `types: []` exists to prevent. If the config genuinely needs a path, say how it was avoided or what was accepted instead
- **Settle the browser baseline and update `target`/`lib` to match it.** PRODUCT_SPEC.md §3 is desktop-first. Task 1.1.4 left `target: "es2024"` and `lib: ["es2024", "dom", "dom.iterable"]` as a provisional pair whose only job was making a browser-targeted file typecheck, and explicitly expected this story to revisit both. Note that `target` now has a second reader: `tsc` uses it for the language level, and Vite's own `build.target` governs the downlevelling that actually ships. Do not let the two disagree silently
- Confirm `dist/` and `*.tsbuildinfo` are already covered by `.gitignore` and `.prettierignore`, and add whatever the chosen output directories need if they are not
- Prettier now owns `index.html` and any new config file. Run `pnpm format` and let it settle them rather than hand-formatting

## Done when

- `pnpm install` succeeds with the new dependency, and the allowlist entry names exactly the package that needed it
- `pnpm --filter @marketpulse/frontend dev` serves a page in a browser that executes `src/main.ts` and shows evidence of the `@marketpulse/shared` import having run
- `pnpm build` and `pnpm typecheck` both still pass from the root, and neither producer's output is sitting in the other's directory
- `pnpm verify` passes from the repository root
- The browser baseline is written down with its reasoning, not just changed
- No React, no JSX, no `.tsx` file exists yet

## Notes

The point of stopping before React is that every failure in this task is a toolchain failure. Once `.tsx` files exist, a broken build has two candidate causes, and this repository's history says the toolchain is where the surprises live.

One asymmetry worth carrying into the next tasks: **the dev server does not typecheck.** esbuild strips types without checking them, so a type error runs happily in the browser and is caught only by `tsc -b` — which is to say by `pnpm verify`, or by the editor. That is the opposite of the backend's loop, where `tsc` is what produces the runnable output in the first place.

## Outcome

`apps/frontend` is a package Vite serves and builds. `pnpm --filter @marketpulse/frontend dev` serves a page that executes `src/main.ts` and renders text produced by `toTicker` from `@marketpulse/shared`, so the workspace dependency resolves through the bundler as well as through `tsc` — two entirely different resolvers, and the only reason that import is still in the entry file. No React, no JSX, no `.tsx`.

### The install-script prediction was wrong, and that is the finding

Task 1.1.1 predicted esbuild, arriving with Vite, would be the first dependency to trip `allowBuilds`. **It did not fire, and esbuild is not installed at all.** Vite 8 uses Rolldown, which is Rust and ships as prebuilt per-platform optional dependencies (`@rolldown/binding-darwin-arm64` here) rather than as a binary a postinstall script downloads. A sweep of every installed package for `preinstall`/`install`/`postinstall` found **zero** across the whole tree.

So `allowBuilds` in `pnpm-workspace.yaml` is still empty and still untested after the story that was supposed to test it. The policy is not wrong — it is just that the specific mechanism it was aimed at has been designed out of this toolchain. It remains a hard install failure whenever something does bring a script, and the entry to add then is the package that failed, by name.

One consequence worth carrying to Story 1.10: the native binding is platform-specific, so CI on Linux resolves a different optional dependency than a Mac does. That is the lockfile's job and pnpm records all platforms, but it is the first dependency in this repo where "works on my machine" has a real mechanism behind it.

### The output-directory collision, resolved by removing a producer

`tsc -b` and Vite both default to `apps/frontend/dist`, and `tsc -b --clean` only knows about the half tsc produced. Rather than separate the two directories, **the frontend's TypeScript half is now emit-free** — `"noEmit": true` in `apps/frontend/tsconfig.json`. With one producer there is no half to miss.

This is safe here specifically because the frontend is a **composite project referenced by nothing**: no consumer ever compiles against its declarations, so tsc's JavaScript was dead output that nobody imported and nobody shipped. It would be wrong for `packages/shared`, where the emitted `.d.ts` is the entire contract.

`composite` and `noEmit` together were an error in older TypeScript. **Verified against the pinned 6.0.3:** `tsc -b` accepts the pair, emits nothing, and still reports type errors — checked by introducing a `TS2322` and watching it fail. Worth re-checking on a TypeScript upgrade rather than assuming.

The cost is that `clean` can no longer be `tsc -b --clean` alone, because that command now has nothing to delete in this package:

- `apps/frontend`'s `clean` is `tsc -b --clean && rm -rf dist`
- the root's is `tsc -b --clean && rm -rf apps/frontend/dist`

Both verified to leave no residue from either producer, `tsconfig.tsbuildinfo` included. One small asymmetry against the other two packages: the frontend's `clean` removes `dist/` outright, where `tsc -b --clean` leaves an empty directory behind.

### What the six verbs mean now

- **`typecheck`** — `tsc -b`. Unchanged, and now the _only_ thing tsc does for this package.
- **`build`** — `tsc -b && vite build`. `&&` and that order: a type error must fail the build rather than ship, which is `verify`'s reasoning one level down. The verb still means "typecheck this package and produce its artefact" in all three packages; only the artefact differs.
- **`dev`** — `vite`. The last `echo` placeholder among the non-`test` verbs is gone. Task 1.3.3 owns making it behave under the root parallel fan-out.

**The root `build` script had to change too**, and this is the part that is easy to miss. Root `build` is a direct `tsc -b` over the solution rather than a `pnpm -r` fan-out, so it would have typechecked the frontend and emitted no bundle at all — `pnpm verify` would have passed without ever running the bundler. It is now `tsc -b && pnpm --filter @marketpulse/frontend exec vite build`: one pass over the reference graph, then one bundler pass, with no duplicated `tsc`. Root `verify` from a fully clean tree is **4.5s**, against roughly four before, so the non-fan-out rule survives intact.

### The browser baseline

Desktop-first per PRODUCT_SPEC.md §3, evergreen, and **ES2024** — the language level current Chrome, Edge, Firefox and Safari have all shared since about March 2024, with Safari 17.4 the binding constraint. That is roughly two years of headroom rather than a bet on something new. `target: "es2024"` and `lib: ["es2024", "dom", "dom.iterable"]` are now a decision rather than the provisional pair Task 1.1.4 left behind, and the comment in the tsconfig says why.

**`target` has a second reader, and its default disagreed.** Vite 8's `build.target` defaults to `baseline-widely-available`, which is _lower_ than es2024 — so leaving it unset is not neutral: tsc would permit syntax the bundler then silently rewrites for browsers we never agreed to support. `vite.config.ts` sets `build.target: "es2024"` explicitly, and the two must be changed together.

### `vite.config.ts`, and the lint block that stops being theoretical

The config file exists for `build.target` alone today. It is a `.ts` file in a package whose tsconfig `include` is `src/**/*`, so the typescript-eslint project service has no program for it — **verified by removing it from the config block**, which produces `Parsing error: ... was not found by the project service`, a hard failure rather than a silent skip. It is now named alongside `eslint.config.mjs` in the trailing `disableTypeChecked` block, which must stay last because flat config is order-sensitive.

That block also hands it `globals.node` rather than the `globals.browser` the `apps/frontend/**/*.ts` block above would give it, because it runs in Vite's process and not in a page. This is the first time the per-package globals split from Task 1.1.5 has corrected anything — though still only in principle, since `no-undef` remains off for `.ts` files (ADR 0001 §8). It becomes real when a `.js` tooling file appears.

Also confirmed the file is genuinely being linted rather than skipped: an unused variable in it is reported as `@typescript-eslint/no-unused-vars`.

The config uses no Node APIs. Nothing here needed a path, because Vite resolves `root`, `publicDir` and `build.outDir` relative to the config file's own directory — so `@types/node` stayed out of `apps/frontend` and `types: []` is untouched.

### The asymmetry to carry forward: the dev server does not typecheck

Verified, not assumed. With `const wrong: number = "definitely not a number"` in `src/main.ts`:

- `tsc -b` — **fails**, `TS2322`.
- the dev server — **serves it happily**, having stripped the annotation without checking it.

This is the exact opposite of the backend loop, where `tsc` produces the runnable output and a type error stops the restart. On the frontend a type error reaches the browser and is caught only by the editor or by `pnpm verify`. Anyone working in both loops should expect them to behave differently.

### Also observed

- **The dev server picked its own port.** 5173 was already in use, and Vite printed `Port 5173 is in use, trying another one...` and bound 5174. It carried on rather than failing, which is the opposite of the backend's behaviour — Task 1.2.1 made a busy `PORT` exit 1 with the `EADDRINUSE` record intact. **Task 1.3.3 owns deciding whether the frontend should be equally loud**, and this is a live observation rather than a hypothetical.
- The old `src/index.ts` was cleaned **before** being renamed, per the orphaning trap measured in Task 1.2.6. `dist/` was verified empty first, so nothing was left behind.
- `dist/` and `*.tsbuildinfo` were already covered by `.gitignore` and `.prettierignore`; the chosen layout needed no new entries in either.
- The production build emits `dist/index.html` plus one hashed asset, and `@marketpulse/shared` is inlined into the bundle rather than resolved at runtime — 6 modules transformed for a 1.03 kB chunk. Task 1.3.4 owns actually serving that output and checking it renders; nothing here proves it does.
- Vite is pinned exactly (`8.2.2`), matching how every other dependency in this repo is pinned. `pnpm add` writes a caret range and it has to be corrected by hand.
