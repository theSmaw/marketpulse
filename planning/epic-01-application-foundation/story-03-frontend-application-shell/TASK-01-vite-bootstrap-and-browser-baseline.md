# Task 1.3.1 — Vite bootstrap and the browser baseline

**Status:** Not started
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
