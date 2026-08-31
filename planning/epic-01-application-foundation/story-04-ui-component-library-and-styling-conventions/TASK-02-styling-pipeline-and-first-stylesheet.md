# Task 1.4.2 — Install the styling approach and get the first stylesheet into the build

**Status:** Complete (2026-08-31)
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

## Outcome

The pipeline is real, and the headline is that it cost **no dependency at all**. CSS Modules and plain CSS are Vite features, not packages — Task 1.4.1 chose the one option in the field whose install step is empty. Nothing was added to `apps/frontend`, nothing to the root, and `pnpm-lock.yaml` is untouched. The Prettier-plugin and ESLint-plugin paragraphs in the Work section above describe a Tailwind-shaped choice that was not made; they are correctly written and simply did not apply.

Radix is not here either. It is behaviour rather than styling, and Task 1.4.5 installs it — that is the first dependency this story adds.

### What changed

Three files, two of them new.

- `apps/frontend/tsconfig.json` — `types: []` becomes `types: ["vite/client"]`, with a comment naming **both** readers
- `apps/frontend/src/throwaway.css` — four declarations on `body`. The whole of Task 1.4.3 overwrites it
- `apps/frontend/src/cx.ts` — the class-composition helper Story 1.4's Open decisions section says this task owes. Unused until Task 1.4.5, and that is stated at the top of the file

### The artefact changed shape, as predicted

|                     | before    | after                 |
| ------------------- | --------- | --------------------- |
| modules transformed | 17        | 18                    |
| `dist/` files       | 2         | **3**                 |
| JS                  | 190.80 kB | 190.80 kB (unchanged) |
| CSS                 | none      | 0.07 kB               |

`dist/index.html` gained `<link rel="stylesheet" crossorigin href="/assets/index-CdvJ7Eir.css">` — **absolute**, as ADR 0003 says, so a subpath deployment is still a `base` change and a rebuild. Story 1.11 inherits a three-file artefact rather than a two-file one.

`cx.ts` is in neither number. Nothing imports it, so it is not in the module graph — the 18th module is the stylesheet.

The emitted CSS is `body{color:#e6edf3;background:#101418;font-family:system-ui,sans-serif}`. Note the declaration order is not the source's: lightningcss minifies and reorders. Harmless for four properties on one selector, and worth knowing before someone diffs a token file against its output in Task 1.4.3.

### The four checks the task demanded

**1. `tsc` and the CSS import — the predicted error code was wrong, and usefully so.** The task expected `TS2307: Cannot find module`. A **side-effect** import gives a different one:

```
src/main.tsx(11,8): error TS2882: Cannot find module or type declarations for
side-effect import of './throwaway.css'.
```

`TS2307` is what a _default_ import of a `.module.css` gives. Both are fixed by the same entry, so the fix in the task text is right and only the code was misremembered — but a future reader grepping for TS2307 and finding TS2882 would reasonably wonder whether they had a different problem.

**2. The empty-`types` guarantee survives, verified rather than asserted.** With `["vite/client"]` in place, a deliberate `process.env["NODE_ENV"]` in `main.tsx` still fails:

```
src/main.tsx(36,13): error TS2591: Cannot find name 'process'. Do you need to
install type definitions for node? ...
```

Reference added, measured, removed. The explicit list is what does the work, not its emptiness — as the task said, and as the tsconfig comment now records for whoever is next tempted to add an entry for an _imported_ library.

**3. The conflict surface, re-measured — third time, same answer.** `eslint --print-config apps/frontend/src/App.tsx` enables **155** rules (the previous 138 was a `.ts` file; the extra 17 are the React block). `eslint-config-prettier@10.1.8`, unpacked into a scratch directory rather than installed, turns off 358. The intersection is **1**: `no-unexpected-multiline`, which is one of that package's "special" rules — it guards hand-written code rather than fighting Prettier's output, and is the same single hit both previous measurements found. **Zero genuine conflicts.** `eslint-config-prettier` stays uninstalled, and the trailing `disableTypeChecked` block keeps its position at the end of the flat config array.

Prettier does format `.css`, and the new stylesheet passes `format:check` unmodified after `pnpm format`.

**4. CSS hot-reload, measured — and it is comfortably inside the component baseline.** Six edits to `throwaway.css`, wall-clock from file write to the `<style>` element mutating:

```
162  58  42  143  39  145   ms   (6/6, median ~100 ms)
```

Against Task 1.3.3's ~100–140 ms warm HMR figure, so at or below it as the task predicted. Two mechanism notes:

- **In dev the stylesheet is a `<style>` element; in the build it is a `<link>`.** The measurement watches the dev shape, which is why a `MutationObserver` on `document.head` is the right instrument
- **The page never reloaded.** The observer and its results array were installed once and survived all six updates — a full reload would have destroyed both. That is the actual evidence that a CSS update does not re-execute the module graph, and it is stronger than watching a heading change

Two things that cost time and are worth writing down. Vite 8's dev log says `[vite] (client) hmr update /src/throwaway.css`, **not** the `css hot updated` string that older documentation and muscle memory reach for — a `grep` for the latter reports zero and reads exactly like a broken pipeline. And the first attempt at this measurement used `requestAnimationFrame` polling and recorded **nothing at all**, because the automated tab is backgrounded (`document.hidden === true`) and rAF is throttled to a stop there. `MutationObserver` is not. The number above is therefore measured on a hidden tab, which is fine for the transport but is not a paint-to-glass figure.

### CSS Modules: proven by probe, then removed

The task asked for exactly one stylesheet from `main.tsx`, and that is what shipped. But a global stylesheet does not exercise the half of the pipeline Task 1.4.5 actually depends on, so a `probe.module.css` plus a probe component were built, measured through a real `vite build`, and deleted. Four findings, all of which land on Task 1.4.5:

- **Scoping works and the names are hashed.** `.probeRow` / `.probeNegative` emitted as `._probeRow_1ec8l_1` / `._probeNegative_1ec8l_2` — Vite's default `generateScopedName`, and readable enough to debug in devtools without configuration
- **A class-name typo is silent, exactly as Task 1.4.1 warned.** `styles["nonExistentClassName"]` typechecks, lints and builds; it renders unstyled. `vite/client` declares a module as `{ readonly [key: string]: string }`, so there is no key set to check against. Nothing in `pnpm verify` will ever catch this. **Task 1.4.5 should assume it will happen.** Per-file generated types are the only real fix and are a build step plus a `.gitignore` entry — deliberately not taken here for one throwaway file, and a legitimate thing to revisit once there are twenty stylesheets
- **`cx()` earns its place, and the measurement is exact.** The idiomatic template composition is two `@typescript-eslint/restrict-template-expressions` errors on a two-class component (Task 1.4.1 measured four on a four-class one). With `cx()` the same component lints clean. Under `--max-warnings 0` that is the difference between a passing and a failing `verify`
- **A finding neither earlier task had: use dot notation.** `styles["probeRow"]` is a `@typescript-eslint/dot-notation` error, so bracket access is not an available workaround for anything. The house idiom is `cx(styles.probeRow, styles.probeNegative)` — dot access, composed through the helper. Both halves are required; either alone fails lint

### Static host

`python3 -m http.server` over `dist/`, and the check went past "it 200s" to what actually renders:

```
GET /                        -> 200
GET /assets/index-*.css      -> 200  text/css  72 bytes
GET /assets/nope.css         -> 404          (a real host, not the SPA fallback)
computed body background     -> rgb(16, 20, 24)
computed body color          -> rgb(230, 237, 243)
document.styleSheets[0].href -> .../assets/index-CdvJ7Eir.css
```

The computed values are the point: a `<link>` that 200s proves the file is reachable, not that the browser applied it. `vite preview` was not used, for the reason in the Done-when — its fallback answers `/assets/nope.css` with `index.html` and a 200.

### State of the tree

`pnpm verify` exits 0. No dependency added, `pnpm-lock.yaml` untouched, `dist/` is three files, and the only styling left is four declarations that Task 1.4.3 will overwrite.
