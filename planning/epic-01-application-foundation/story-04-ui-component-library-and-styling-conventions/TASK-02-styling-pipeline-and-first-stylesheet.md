# Task 1.4.2 — Install the styling approach and get the first stylesheet into the build

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.1

## Objective

Make the styling approach real in `apps/frontend` — installed, wired into Vite, typechecking, linting, formatting, and producing a CSS asset in the build. No tokens, no components, no design work. This task exists so that when Task 1.4.3 defines a colour and the colour is wrong, the pipeline is not a candidate cause.

## Work

- Install the styling dependencies in **`apps/frontend`**, and any Prettier or ESLint plugin that comes with them **at the root**. Task 1.3.2 drew that line the same way — React in the package, `eslint-plugin-react-hooks` at the root — and this task is where it is most tempting to blur, because a Tailwind-shaped choice brings both halves at once
- Add exactly one stylesheet and import it from `src/main.tsx`, containing something trivially visible and nothing worth keeping. **This is the first CSS in the repository**: the current production build is 190.80 kB across 17 modules and contains **no stylesheet at all**, because nothing imports one
- **Watch what this does to the deployable artefact, because it changes its shape.** `dist/` is two files today — `index.html` and one hashed `assets/*.js`. A CSS asset makes it three, with an absolute path (`base` defaults to `/`, ADR 0003), and adds a `<link>` to the emitted `index.html`. That is Story 1.11's problem to inherit and this task's to record. `build.emptyOutDir` defaults to true, so hashed CSS will not accumulate across builds — a default rather than a guarantee
- **Expect `tsc` not to know what a `.css` import is.** `apps/frontend` sets `types: []`, so `import "./x.css"` is likely `TS2307: Cannot find module`. The standard fix is `"types": ["vite/client"]`, and it **does not weaken the guarantee** the empty array exists for: an explicit list is precisely what keeps TypeScript from auto-discovering every reachable `@types` package, so `process` must still fail to typecheck in browser code afterwards. **Verify that with a deliberate `process` reference, then remove it** — do not take this paragraph's word for it
- **That entry is shared with Story 1.6, and whichever task lands first owns it.** Story 1.6 was handed the same `"types": ["vite/client"]` change for `import.meta.env` (`TS2339` today, measured). Adding it here means Story 1.6 inherits a solved problem; adding it there means this task does. Add it once, comment it with both reasons, and say so in the other story rather than letting two tasks each believe they introduced it
- **CSS Modules, if chosen, need typed module declarations and `vite/client` supplies them** — `*.module.css` resolving to a `Record<string, string>` rather than a precise key set. If the chosen approach wants per-file generated types, that is a build step and a `.gitignore` entry, and it belongs in this task rather than being discovered in Task 1.4.5
- **`.js` import extensions do not apply to CSS.** The convention rewrites relative imports between `.ts`/`.tsx` files; `import "./tokens.css"` is the real filename and stays as written. Worth stating because the rule has exactly one enforcer here (`tsc`, via TS2835) and it is easy to over-apply it to the first non-TypeScript import the repository has ever had
- **Re-measure the ESLint/Prettier conflict surface rather than assuming it survived.** It has been measured at zero conflicting rules twice, which is why `eslint-config-prettier` is not installed. Run `eslint --print-config` on a frontend file after the plugins are in and compare. If a genuine conflict has appeared, `eslint-config-prettier` goes **last** in the flat config array — after the `disableTypeChecked` block, which is the current occupant of that position and whose reason for being last is unchanged
- If a Prettier plugin is added, add it to `prettier.config.mjs` **with a comment saying why**, like every other option in that file. Every option there is explicit on purpose so that an upgrade cannot quietly restyle the tree, and a plugin that reorders class names is exactly the kind of thing that would
- Run `pnpm format` and let it settle the new files. This must not become an argument
- **Check the dev server actually hot-reloads CSS**, and know which mechanism you are looking at: a stylesheet update is applied without re-executing the module graph, so component state survives for a different reason than a component edit does. The warm HMR baseline is ~100–140 ms (Task 1.3.3); a CSS edit should be at or below it

## Done when

- `pnpm verify` passes from the repository root
- `pnpm build` emits a CSS asset into `apps/frontend/dist/assets/` and `dist/index.html` links it — checked by listing the directory, not by trusting the bundler
- The built output still renders from a dumb static host (`python3 -m http.server`), styles included. **Not `vite preview`** — its SPA fallback answers a missing asset with `index.html` and a 200, so a broken stylesheet arrives as a MIME-type error rather than a 404 naming the file
- `types` in `apps/frontend/tsconfig.json` is still an explicit non-empty list, and a reference to `process` in frontend code still fails to typecheck
- The ESLint/Prettier conflict surface is re-measured, with a number
- The throwaway styles are gone or reduced to whatever Task 1.4.3 will overwrite

## Notes

Deliberately separate from Task 1.4.3. Installing a styling pipeline and designing a token system are different kinds of work with different failure modes, and a token that does not apply should never be ambiguous between "the design is wrong" and "the CSS never reached the browser".
