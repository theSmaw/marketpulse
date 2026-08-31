# Task 1.4.1 — Choose the styling approach and the component library

**Status:** Complete (2026-08-30)
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Story 1.3 (complete)

## Objective

Settle both of the story's open decisions — styling approach and component library — as one decision, against this product's constraints rather than against general web-application advice. Nothing here ships: this task produces a recorded decision and a discarded spike, and Task 1.4.2 is the first one that installs anything permanently.

## Why the two decisions are one

The story lists them separately and they are not separable. "Headless primitives plus own styling" presupposes a styling approach worth writing components in; a full opinionated library largely picks the styling approach for you and makes a second one dead weight. Deciding them apart is how a workspace ends up with two conventions — the same failure Task 1.1.7 rejected a pnpm catalog to avoid.

## Work

- Evaluate against the story's **selection constraints**, which are the actual decision criteria — dense numeric desktop-first UI, coexistence with a WebGL canvas and charting libraries, dark theme as the primary theme, high update rates, accessible primitives. A candidate that is excellent for content sites and merely adequate here loses
- **Weigh runtime cost honestly against Epic 3 rather than in the abstract.** PRODUCT_SPEC.md §28 sets event → application state at <250 ms p95 and no routine main-thread task over 50 ms, with prices changing continuously. Styles computed during render on every tick are the specific risk; build-time or static CSS is the specific mitigation. Say which side the choice lands on
- **Check the choice against `verbatimModuleSyntax` and `isolatedModules`, both on, and against Rolldown/oxc — not esbuild.** Vite 8 is the Rolldown release (ADR 0003 §1), so a library whose Vite integration is documented against esbuild, or which relies on whole-program type information at transform time, is making an assumption this toolchain does not satisfy. Verify the library actually publishes a Rolldown-era Vite plugin rather than inferring it from "works with Vite"
- **Check the install-script policy before choosing, not after.** `allowBuilds` in `pnpm-workspace.yaml` is empty and an un-allowlisted install script is a **hard install failure**, not a warning. This has never fired — Story 1.3 predicted esbuild would trip it and was wrong. Tailwind v4's oxide engine and several component libraries ship native bindings, so this is a plausible first trip; if it fires, allowlist the specific package and record that the policy finally has a data point. Never disable the check
- **Spike, do not reason.** Build each serious candidate far enough to render one dense numeric row in a dark theme, and throw it away. The decision this story makes is the one PRODUCT_SPEC.md calls expensive to reverse once dozens of components exist, and the cheapest evidence available is a working spike on the actual toolchain. Do the spike in a scratch directory or on a throwaway branch — **the tree this task leaves behind must be byte-identical to the one it started from** apart from this file and the story
- Write the decision into this task's Outcome with its rejected alternatives and their reasons. The ADR is Task 1.4.6's, and it will be written from this record — so record the reasoning at the time it is live, not reconstructed six tasks later
- **Record what would make this decision wrong**, explicitly. "Expensive to reverse" is only useful if the reversal trigger is written down: a measured frame budget blown by style recalculation, an accessibility finding in Epic 15, or a library that cannot coexist with Sigma.js in Epic 6 are the three plausible ones

## Done when

- One decision covering both open questions, written down with the alternatives that lost and why
- The decision is argued from the selection constraints and from at least one thing that was actually run, not from reputation
- The Rolldown, `verbatimModuleSyntax` and `allowBuilds` checks are each answered with an observation
- The spike is gone: `git status` is clean apart from planning files, and no dependency has been added to any `package.json`
- `pnpm verify` still passes — trivially, since nothing changed, but confirm rather than assume the spike left nothing behind

## Notes

Charting library selection is explicitly **not** part of this story (it belongs to Epic 2), but the choice made here constrains it — a charting library will need to read the same tokens Task 1.4.3 defines. Note the interface, do not design it.

## Outcome

**Decision: CSS Modules plus CSS custom properties for styling, and Base UI for component behaviour.** **The component-library half was reversed on 2026-08-31** — see _Reversed to Base UI_ at the end of this record for why, and read the two sections above it as the reasoning that was correct on the evidence available at the time. The styling half is unchanged. Original wording follows, because everything it says about the styling decision still holds.

**Decision: CSS Modules plus CSS custom properties for styling, and Radix Primitives for component behaviour.** Headless primitives plus own styling, in the story's terms. Settled with the user rather than assumed, per the standing rule on this story's open decisions, and settled from measurement rather than reputation.

### What was actually run

A throwaway git worktree on the real toolchain — Vite 8.2.2 (Rolldown), React 19.2.8, `strictTypeChecked` + `stylisticTypeChecked` linting, `noUncheckedIndexedAccess` on. Six candidates, each built far enough to render the same dense numeric row in a dark theme: ticker, price, signed change, an anomaly score, and a popover carrying the score's explanation. The worktree and its branch were deleted afterwards.

The baseline to read every number against is the tree as Story 1.3 left it: **17 modules, 190.80 kB, no CSS asset**, md5 `e3fa3b5e0fed04b01b859b2df6228fb9` — reproduced exactly in the spike worktree before anything was installed, which is the check that the spike measured this repository rather than a generic Vite app.

| Candidate                           | Modules | JS        | CSS asset |
| ----------------------------------- | ------- | --------- | --------- |
| _baseline — nothing installed_      | 17      | 190.80 kB | none      |
| CSS Modules + Radix                 | 81      | 255.74 kB | 0.56 kB   |
| Tailwind v4 + Radix                 | 81      | 255.90 kB | 7.14 kB   |
| vanilla-extract + Radix             | 83      | 255.62 kB | 0.82 kB   |
| CSS Modules + react-aria-components | 79      | 276.44 kB | 0.30 kB   |
| Mantine 9.5.2 (full library)        | 814     | 309.48 kB | 231.11 kB |
| MUI 9.4.0 + emotion (full library)  | 902     | 322.74 kB | **none**  |

### Why this one

- **It adds nothing to the build.** CSS Modules are Vite's, so the styling half of this decision costs zero dependencies, zero plugins and zero native bindings. Every other candidate adds a build-time mechanism, and two of them add one the toolchain has deliberately shed
- **The stylesheet is static and the smallest measured.** Styles are resolved at build time and shipped as a file; nothing is computed during render. That is the direct answer to PRODUCT_SPEC.md §28 with prices ticking continuously
- **Tokens end up as plain CSS custom properties, which is the only form the rest of the product can read.** Epic 6's Sigma.js/WebGL canvas and Epic 2's charts cannot read a CSS class. They can read a custom property. This does not solve Task 1.4.3's source-of-truth question — `getComputedStyle` is still a main-thread layout read — but it leaves that question answerable rather than foreclosed
- **Radix over react-aria-components on measured weight for identical behaviour.** The same popover costs **+65 kB** through Radix and **+86 kB** through react-aria-components, because Radix publishes one package per primitive and react-aria ships a monolith. Both linted clean. If Epic 15's accessibility review finds Radix wanting, react-aria is the swap, and it is a swap rather than a rewrite because both are headless

### The costs, stated rather than discovered later

- **A CSS Modules class name is not typed, and a typo is silent.** `vite/client` types the default export as a loose record, so `styles.tickerTypoThatDoesNotExist` compiles cleanly and renders unstyled. Measured directly. There is no enforcer for this in `pnpm verify` — the same shape of gap as `apps/backend/scripts/dev.sh`. A `.d.ts` generator would close it and is a Task 1.4.2 decision, not something to assume
- **`noUncheckedIndexedAccess` makes the idiomatic class composition a lint error.** `styles.cell` is `string | undefined`, so ``className={`${styles.cell} ${styles.ticker}`}`` fails `@typescript-eslint/restrict-template-expressions` — **four errors on one row component**, and `lint` runs `--max-warnings 0`. A three-line `cx()` helper that filters `undefined` and joins makes it green, verified. This cost is specific to CSS Modules: Tailwind's class strings are literals and vanilla-extract's exports are typed `string`, so neither has it. It is small, permanent, and belongs in Task 1.4.2 as a real piece of code rather than a convention nobody wrote down

### Rejected, with reasons

- **MUI + emotion** — 902 modules, 322.74 kB, and **no CSS asset in `dist/` at all**. That absence is the finding: emotion computes and injects rules during render, so the cost moves from the artefact into the main thread, which is exactly what §28 budgets. Also drags a `@mui/material-pigment-css` peer and is the candidate most likely to collide with the React Compiler's `purity` rules once components do real work
- **Mantine** — 814 modules and **231.11 kB of CSS shipped whole** for one table and one popover. Its stylesheet is a single import and is not tree-shaken. Good dark-theme support and genuinely dense components, but a full opinionated library also picks the styling approach for you, and this one picks "ship all of it"
- **vanilla-extract** — the closest loss, and it lost on the install rather than on the styling. Typed tokens in TypeScript answer Task 1.4.3's hardest question directly and its class exports are typed `string`, so it has neither of CSS Modules' costs. But see the `allowBuilds` finding below: it reintroduces esbuild, a bundler this toolchain deliberately does not have. Worth revisiting if Task 1.4.3's token duplication turns out worse than expected
- **Tailwind v4** — closer than the numbers suggest, and it clears every check: `@tailwindcss/vite` 4.3.3 declares `vite ^8` in its peers so it is genuinely a Rolldown-era plugin, the oxide native binding ships prebuilt with **no install script**, `prettier-plugin-tailwindcss` 0.8.1 installs cleanly against Prettier 3.9.6, and it lints green with no helper. It lost on being a second vocabulary the product does not need: 6.5 kB of the 7.14 kB stylesheet is preflight, and utility classes do not reach the WebGL canvas or the charts, which is where a large share of this product's colour actually lives
- **react-aria-components** — see above; lost to Radix on weight for identical behaviour, not on quality

### The three checks the task demanded, each with an observation

**Rolldown, not esbuild.** Vite 8.2.2's own manifest is the record: its `dependencies` are `lightningcss, picomatch, postcss, rolldown, tinyglobby`, and **`esbuild` appears only in `peerDependenciesMeta` as `optional: true`**. So esbuild is absent from this tree unless a plugin supplies it — verified from a clean `node_modules` in both directions. That is the precise mechanism behind Story 1.3's wrong prediction, and it is now written down rather than inferred.

**`verbatimModuleSyntax` and `isolatedModules`.** No candidate tripped either. CSS Modules' `import styles from "./Row.module.css"` is a real runtime import and survives verbatim, which is correct. Note the `.js` extension convention does **not** apply to CSS imports — the specifier is the actual filename.

**`allowBuilds` — it fired, and this is its first real data point.** Adding `@vanilla-extract/vite-plugin` produced:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2
```

and `pnpm install` **exited 1**, confirming CLAUDE.md's "fails the install outright" rather than warning. The chain is `@vanilla-extract/vite-plugin` → `@vanilla-extract/compiler` → `@vanilla-extract/integration` → `esbuild`, which then satisfies Vite's optional `esbuild` peer. Three things worth carrying forward:

- **Story 1.3's prediction was right about the package and wrong about the route.** esbuild is the first trip after all; it just arrives through a styling plugin rather than through Vite
- **pnpm mutates `pnpm-workspace.yaml` when this happens.** It writes a stub — `allowBuilds:` / `esbuild: set this to true or false` — which is itself invalid until a human edits it, and it rewrites the stub on every subsequent failed install. The tracked workspace file changing under you is part of the failure mode, so a `git status` after a failed install is not evidence of your own edit
- **Tailwind was the suspected trip and is not one.** A clean-room install with `tailwindcss` and `@tailwindcss/vite` and nothing else exits 0 with no esbuild in the tree; oxide's platform binding is prebuilt, and a full sweep of `preinstall`/`install`/`postinstall` scripts across the installed tree found none

The chosen stack does **not** trip it. `allowBuilds` stays empty and stays untested in the shipping tree — but the policy now has a confirmed failure signature, which is the thing four previous sweeps could not supply.

### What would make this decision wrong

Written down now, because "expensive to reverse" is only useful with a reversal trigger.

- **A measured frame budget blown by style recalculation.** Static CSS moves cost out of render, but a token architecture that ends up reading `getComputedStyle` on the hot path puts it straight back. The trigger is a main-thread task over 50 ms attributable to style, not a feeling — Epic 14 owns the measurement, and Epic 3 is where it would first appear
- **An accessibility finding against Radix in Epic 15.** The swap is react-aria-components at roughly +21 kB for the same behaviour. Both are headless, so component markup changes and styling does not
- **A Sigma.js coexistence failure in Epic 6.** This is the one the styling half is least exposed to — CSS Modules do not fight a canvas for layout or theming, which is a large part of why they won — but if the token bridge to WebGL turns out to need typed tokens badly enough, vanilla-extract is the reversal, and it costs an `allowBuilds` entry for esbuild
- **The unstyled-class typo going from annoyance to defect.** If silent class-name typos start causing real bugs, the fix is a `.d.ts` generator rather than a change of approach

### Interface noted for Epic 2, not designed

A charting library will need to read the same tokens Task 1.4.3 defines, and so will Epic 6's renderer. Neither can read a CSS class. The interface is therefore "resolved token values, readable from JavaScript without a layout read" — noted here so Task 1.4.3 designs for two consumers rather than one, and left undesigned as the task instructs.

### State of the tree

The spike worktree and its branch are deleted. `git status` shows only the untracked `.claude/` and the modified `notes.txt` it started with; no dependency was added to any `package.json`; `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `apps/frontend/tsconfig.json` are unchanged. `pnpm verify` exits 0.

### One measurement handed to Task 1.4.2

`apps/frontend`'s `types: []` makes a CSS import a hard failure — `error TS2307: Cannot find module './Row.module.css' or its corresponding type declarations` — and `"types": ["vite/client"]` fixes it. Verified in the same run that **`process` still does not typecheck afterwards** (`TS2591`), so the guarantee holds: an explicit list is what keeps auto-discovery off, and the list's contents are not what does the work. This is the same tsconfig entry Story 1.6 was handed for `import.meta.env`; whichever lands first owns it, and on this evidence it will be Task 1.4.2.

### Re-evaluated against Base UI (2026-08-31) — decision unchanged _on weight, and then reversed anyway_

Asked directly whether the component-library half should pivot to **Base UI** before Task 1.4.5 installs anything. It should not, and the reason is measurement rather than reluctance. Nothing is installed yet, so this was the cheapest possible moment to ask and the pivot would have cost one planning edit; the numbers are what stopped it.

Run the same way as the original spike — a throwaway worktree on the real toolchain, the same dense numeric row, built and linted — but with one improvement on the first run: **both libraries were measured on the same day against the same component**, rather than Base UI being compared to a number recorded a day earlier. The baseline is the tree as Task 1.4.2 left it (18 modules, 190.80 kB, 0.07 kB CSS).

| Candidate                             | Modules | JS        | Δ baseline | gzip      |
| ------------------------------------- | ------- | --------- | ---------- | --------- |
| _baseline — nothing installed_        | 18      | 190.80 kB | —          | 60.16 kB  |
| Radix, one primitive (popover)        | 83      | 255.36 kB | +64.56 kB  | 82.46 kB  |
| Radix, three (popover/dialog/tooltip) | 86      | 267.34 kB | +76.54 kB  | 85.41 kB  |
| Base UI, one primitive (popover)      | 179     | 292.67 kB | +101.87 kB | 94.80 kB  |
| Base UI, three                        | 215     | 313.51 kB | +122.71 kB | 100.37 kB |

Both linted clean under `strictTypeChecked` and `--max-warnings 0`, both installed at exit 0, and neither tripped `allowBuilds`.

**Base UI loses on the exact axis that decided this choice in the first place, and by more than the candidate it already beat.** react-aria-components cost +86 kB for the same popover and was rejected for it; Base UI costs **+101.87 kB**. Reversing to Base UI would therefore mean overturning the original comparison rather than extending it.

**The marginal cost is the more interesting half, because a real product uses many primitives and a first-primitive number can mislead.** Going from one primitive to three costs Radix **+11.98 kB and three modules** — the popover has already pulled in nearly all the shared internals, so dialog and tooltip are close to free. The same step costs Base UI **+20.84 kB and thirty-six modules**. Radix's per-package publishing was the reason it won on weight, and the amortisation argument that might have rescued Base UI runs the wrong way.

**The premise that usually motivates this pivot does not hold.** Base UI is worth asking about mainly because Radix is widely assumed to have stalled. It has not: `@radix-ui/react-popover` shipped **five stable releases in July 2026 alone**, latest 1.1.23 on 2026-07-24, with a 1.2.0 release-candidate line still publishing on 2026-07-31. Checked on the registry rather than recalled.

What is genuinely in Base UI's favour, recorded so this is not a one-sided note: it is a **stable 1.7.0** (2026-08-04) against Radix's per-package 1.1.x; it is one package with nine transitive dependencies where three Radix primitives pull thirty; it is built by a team including the original Radix authors; and it ships primitives Radix does not, of which `NumberField` is the one this product would plausibly want. None of those outweigh 46 kB on the axis the story's own selection constraints name.

**A package-name trap worth writing down.** `@base-ui-components/react` — the name in most existing documentation — is frozen at `1.0.0-rc.0` (2025-12-04) and is _not_ the live package. Base UI moved scope at 1.0; the maintained package is **`@base-ui/react`**, at 1.7.0. Installing the documented name gets a nine-month-old release candidate with no error.

Two smaller observations. Base UI depends on `@babel/runtime`, which nothing else in this tree does. And its popover has one more required layer than Radix's — `Root / Trigger / Portal / Positioner / Popup` against `Root / Trigger / Portal / Content` — which is a markup difference rather than a cost, and confirms the "swap, not rewrite" property still holds in both directions.

**Base UI now joins react-aria-components as a standing alternative rather than a rejected one.** The reversal trigger below is unchanged and still accessibility-led; if it fires, both should be re-measured, because a 46 kB gap is a decision and not a law.

### State of the tree after this re-evaluation

The spike worktree and its branch are deleted. No dependency was added to any `package.json`; `pnpm-lock.yaml` and `pnpm-workspace.yaml` are unchanged. `git status` shows only the untracked `.claude/` and the modified `notes.txt` it started with.

### Reversed to Base UI (2026-08-31)

**The component library is Base UI (`@base-ui/react`).** The section above is correct and its numbers stand; it was answering the wrong question, because it only had the evidence a spike can produce.

**The deciding constraint was not available to either spike: an existing shared component library, used at the author's work, is built on Base UI, and plugging it into MarketPulse later is a real intention rather than a hypothetical.** That outranks bundle weight and it is not close. The measured gap is 46 kB uncompressed and about 15 kB gzipped on a desktop analyst tool; the alternative cost is re-authoring every component in the application at the point the shared library arrives. This is exactly the "expensive to reverse once dozens of components exist" property PRODUCT_SPEC.md §39 asks this story to take seriously — and the cheap moment to act on it is now, before Task 1.4.5 installs anything.

**One assumption in that reasoning needs stating rather than inheriting, because it is doing real work.** The expectation is that the shared library's interfaces resemble Base UI's, making the later swap easy. That is likely but not automatic: if the shared library _wraps_ Base UI, its public API is the wrapper's API, not Base UI's, and matching the underlying primitive buys less than it appears to. Two things make the bet pay regardless, and both are Task 1.4.5's to implement:

- **Shared behavioural and composition idioms.** Base UI's part structure — `Root / Trigger / Portal / Positioner / Popup` — is distinctive, and a library built on it almost certainly exposes the same shape of composition, the same controlled/uncontrolled conventions and the same rendering-into-a-portal assumptions. Those are the expensive things to change later; prop names are not
- **Every Base UI usage sits behind our own thin wrapper component**, so a later swap is a change to a handful of wrapper bodies rather than to every call site. This is a convention Task 1.4.5 must establish rather than a hope, and it is worth its small cost even if the shared library never arrives

**Verify the assumption before Task 1.4.5 rather than after.** Read the shared library's actual exports and check whether it re-exports Base UI parts, wraps them, or only borrows the idiom. That check is cheap now and changes what the wrapper layer should look like.

### What this costs, recorded so it is not rediscovered

Measured, not estimated — the table above is the source.

- **+37.31 kB of JavaScript for the first primitive** (+101.87 kB against baseline, where Radix was +64.56 kB), and **+46.17 kB at three primitives**. In gzip terms, about +15 kB
- **A higher marginal cost per primitive.** Two further primitives cost Base UI +20.84 kB and 36 modules against Radix's +11.98 kB and 3. A product that ends up using many primitives pays this repeatedly, so **watch it rather than assuming the first number is the whole cost** — re-measure when the component set grows, and put the figure next to Epic 14's budget rather than in a commit message
- **A `@babel/runtime` dependency**, which nothing else in this tree has

Accepted deliberately. None of it touches PRODUCT_SPEC.md §28's actual constraint, which is about work done during render rather than bytes shipped: Base UI is headless and the styling half is still static CSS, so the "no styles computed on the hot path" property that decided the styling approach is untouched.

### What was already confirmed about Base UI on this toolchain

From the 2026-08-31 spike, so Task 1.4.5 starts from facts rather than a fresh investigation:

- **The package is `@base-ui/react`, at 1.7.0 (2026-08-04).** `@base-ui-components/react` — the name in most existing documentation — is frozen at `1.0.0-rc.0` from 2025-12-04 and is **not** the live package. Installing the documented name silently gets a nine-month-old release candidate
- **It installs at exit 0** and adds nine packages. **`allowBuilds` does not fire** — no install scripts in the tree it brings
- **It lints clean** under `strictTypeChecked` + `stylisticTypeChecked` with `--max-warnings 0`, including through the `cx()` helper, and builds on Vite 8/Rolldown with `verbatimModuleSyntax` and `isolatedModules` on
- **Import from the subpath**, `@base-ui/react/popover`, not the package root
- **`date-fns` and `@date-fns/tz` are peer dependencies but are `optional: true`**, so they can be left uninstalled until something needs them

### The reversal trigger, restated for the new decision

The accessibility trigger is unchanged and now has two candidates behind it rather than one: **Radix** at roughly −46 kB for the same three primitives, and **react-aria-components**. Both are headless, so a swap changes component markup and leaves styling alone — measured in both directions on 2026-08-31, where the only structural difference was Base UI requiring one more layer (`Positioner`) than Radix's `Content`.

A second trigger now exists that did not before: **if the shared component library is not adopted after all _and_ bundle weight becomes a measured problem**, the reason for this reversal has evaporated and Radix is the swap back. That is two conditions, not one — the weight alone was already judged acceptable.
