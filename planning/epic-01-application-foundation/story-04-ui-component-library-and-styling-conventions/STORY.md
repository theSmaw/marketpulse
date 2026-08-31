# Story 1.4 — UI Component Library & Styling Conventions

**Status:** In progress — Tasks 1.4.1, 1.4.2, 1.4.3 and 1.4.4 complete (2026-08-31)
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.3
**Epic scope covered:** select UI component library and styling conventions

## Description

Choose the component library and styling approach, and define the design tokens the rest of the application builds on. This decision is load-bearing: it constrains every screen from Epic 4 onward, and it is expensive to reverse once dozens of components exist.

## Visual direction

Settled 2026-08-31 and recorded in full in **[`VISUAL-LANGUAGE.md`](VISUAL-LANGUAGE.md)**, which is the design input to Tasks 1.4.3–1.4.6 and carries the measured values, the structural idioms and the contrast numbers.

MarketPulse should read as an **internal application at a large financial institution** — dense, sober, desktop analyst tooling — rather than as a consumer product. Four decisions, each settled with the user rather than assumed:

- **Light theme only in V1**, built directly. The theming mechanism ships so a second palette is a values-only swap; the second palette does not. This reversed the dark-primary constraint below
- **Neutral chrome, no brand accent.** Black, white and warm greys. **Colour appears only where it carries market meaning** — which is Task 1.4.4's entire subject, now doing more work than it would in a colourful interface rather than less
- **System font stack, no webfont.** No font files ship and none are fetched
- **Colour is never the sole encoding of anything.** Promoted out of Task 1.4.4's brief to here, because the decision above makes it structural

The consequence worth reading before Task 1.4.3 begins: with no brand hue and no distinctive typeface, **the identity is carried entirely by structure** — a warm `#f4f3ee` ground against white surfaces, 1px near-black hairlines, a 2px radius, a 4px spacing grid, uppercase letterspaced micro-labels, and right-aligned tabular numerals. The values are less forgiving than a token set usually is, and `VISUAL-LANGUAGE.md` is specific for that reason.

## Selection constraints

The chosen library must suit this specific product, not general web apps:

- **Dense, numeric, desktop-first UI** — analyst tooling, substantial screen real estate (PRODUCT_SPEC.md §3)
- **Must coexist with a WebGL canvas and charting libraries** without fighting them for layout or theming
- **A light theme is the only theme in V1**, built directly rather than derived from a dark one. This bullet said "dark theme is the primary theme for a market-monitoring surface, not an afterthought" and was **reversed on 2026-08-31**, before Task 1.4.3 started — see [Visual direction](#visual-direction) below and `VISUAL-LANGUAGE.md`. It is a constraint on the component library only in the weak sense that a library shipping an opinionated dark stylesheet is now less interesting, not more
- **Fast at high update rates** — live prices change continuously (Epic 3); heavy runtime-CSS-in-JS is a risk
- **Accessible primitives** — Epic 15 includes an accessibility review

## Open decisions

Both are now **settled**, together, in [Task 1.4.1](TASK-01-choose-styling-approach-and-component-library.md), from a spike on the real toolchain rather than from reputation. They were always one decision; the task's Outcome carries the measurements, the four rejected alternatives and their reasons, and the reversal triggers.

- **Component library — Base UI (`@base-ui/react`).** Headless primitives plus own styling. **This reversed a Radix decision on 2026-08-31**, and not on the measurements: Radix is lighter, by +37 kB for one primitive and +46 kB for three, both measured the same day against the same component. It was reversed on a constraint no spike could produce — an existing shared component library used at the author's work is built on Base UI, and plugging it into MarketPulse later is a real intention. Re-authoring every component at that point costs far more than 46 kB does. The assumption doing the work is that the shared library's interfaces resemble Base UI's; that is likely but not automatic, so **Task 1.4.5 keeps every Base UI usage behind our own thin wrapper components** and the shared library's actual exports get read before then. Radix and react-aria-components are both standing alternatives if Epic 15's accessibility review finds against Base UI. Task 1.4.1's Outcome carries the tables and the reversal triggers
- **Styling approach — CSS Modules plus CSS custom properties.** Static stylesheet, zero build-tool additions, and tokens in the only form Epic 2's charts and Epic 6's WebGL canvas can read. MUI + emotion emitted **no CSS asset at all** — styles computed during render, which is §28's risk made visible in the artefact — and Mantine shipped 231 kB of stylesheet for one table
- Charting library selection is **not** part of this story; it belongs to Epic 2. The choice above constrains it — a chart will need to read the same tokens Task 1.4.3 defines, and it cannot read a CSS class

Two costs the choice carries, both measured and both landing on Task 1.4.2 rather than being discovered later. A CSS Modules class name is typed as a loose record by `vite/client`, so **a typo is silent** and renders unstyled, with nothing in `pnpm verify` to catch it. And `noUncheckedIndexedAccess` types every `styles.x` as `string | undefined`, so the idiomatic `` `${a} ${b}` `` composition is four `restrict-template-expressions` errors on a single row component — a three-line `cx()` helper makes it green, and that helper is real code Task 1.4.2 owes rather than a convention. **Task 1.4.2 delivered it as `apps/frontend/src/cx.ts` and found a third constraint the spike had missed:** `styles["row"]` is a `@typescript-eslint/dot-notation` error, so bracket access is not an escape hatch either. The house idiom is `cx(styles.row, styles.negative)` — dot access, composed through the helper — and both halves are needed.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- **Prettier is root-only and there is one `prettier.config.mjs`.** A styling choice that wants a Prettier plugin — `prettier-plugin-tailwindcss` is the obvious one — adds it there and at the root, not per package. Every option in that file is explicit on purpose, so an addition is a deliberate edit rather than a silently inherited default
- **Formatting is Prettier's and correctness is ESLint's, and they do not overlap today** — measured at zero conflicting rules, twice, which is why `eslint-config-prettier` is not installed. A styling approach that brings its own lint rules should be checked against that with `eslint --print-config` rather than assumed compatible. If a genuine conflict appears, `eslint-config-prettier` goes last in the flat config array
- A CSS-in-JS choice interacts with `verbatimModuleSyntax` and `isolatedModules`, both of which are on so that `tsc` and the bundler cannot disagree about what a file means — and the bundler is **Rolldown/oxc, not esbuild**, because Vite 8 is the Rolldown release (ADR 0003 §1). Libraries relying on whole-program type information at build time will feel that

### What Story 1.3 hands this story

Three things, now measured rather than expected.

- ~~**There is a React application to style, and it emits no CSS at all.**~~ **No longer true as of Task 1.4.2 (2026-08-31)**, which is what that bullet asked for: the build is now 18 modules across three files, with a 0.07 kB stylesheet linked absolutely from `index.html`. The original wording follows because the numbers in it are still the baseline the change is measured against. **There is a React application to style, and it emits no CSS at all.** `apps/frontend/src/App.tsx` is a single stateless component; the production build is 190.80 kB across 17 modules and contains **no stylesheet**, because nothing imports one. This story is what makes a CSS asset appear in `dist/assets/` for the first time, which is worth watching: it is the first change to the shape of the deployable artefact
- **The styling approach needed no library at all, which is the one thing this section did not anticipate.** CSS Modules and plain CSS are Vite features; Task 1.4.2 added no dependency to either the package or the root and left `pnpm-lock.yaml` untouched. The rule below is still the rule and Task 1.4.5 is where it first applies, when Base UI arrives in `apps/frontend`.
- **A styling library is a dependency of `apps/frontend`, not of the root** — it is imported by that package's code. A Prettier or ESLint _plugin_ that comes with it is a tool and goes to the root, next to the config it extends. Task 1.3.2 drew that line the same way for React (package) and `eslint-plugin-react-hooks` (root)
- **The React Compiler rule set is already in force and has never met real code.** `eslint-plugin-react-hooks`'s `recommended` is 17 rules, 15 at `error`, most of them Rules of React — `purity`, `immutability`, `set-state-in-render` — rather than hook ordering, and `lint` now runs with `--max-warnings 0`. This story writes the first components those rules will actually see. A CSS-in-JS approach that computes styles during render is the likely first collision, and it will surface as a lint error rather than a runtime problem

## Acceptance criteria

- Component library and styling approach chosen, installed, and rendering
- Design tokens defined for colour, spacing, typography and elevation, with a light theme — matching the language captured in [`VISUAL-LANGUAGE.md`](VISUAL-LANGUAGE.md), not merely using its hex values
- Semantic tokens exist for market-specific meaning — positive/negative price movement, anomaly intensity, stale/disconnected data
- At least one representative component built to demonstrate the conventions
- Conventions documented, and the decision captured as an ADR in `docs/adr/` (PRODUCT_SPEC.md §39) **numbered with the next free number at the time — not a number fixed in advance.** This criterion said "ADR 0002" and was written before Story 1.2 took that number for the backend framework and Story 1.3 took 0003 for the frontend build; following it as written would force exactly the renumbering the convention forbids. The next free number is **0004** as of 2026-08-30, so check `docs/adr/` rather than trusting that. The convention is in `docs/adr/README.md`: numbered in the order written, never renumbered, superseded records kept with a `**Superseded by:**` line rather than deleted. Follow 0001's shape — context, decision, rejected alternatives, and consequences a future reader would otherwise discover by tripping over them. This is the ADR where "expensive to reverse once dozens of components exist" earns the record

## Tasks

Tackled in order. The story is complete when all six are done.

| #     | Task                                                                                                                         | Status      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1.4.1 | [Choose the styling approach and the component library](TASK-01-choose-styling-approach-and-component-library.md)            | Complete    |
| 1.4.2 | [Install the styling approach and get the first stylesheet into the build](TASK-02-styling-pipeline-and-first-stylesheet.md) | Complete    |
| 1.4.3 | [Design tokens and the theme](TASK-03-design-tokens-and-theme.md)                                                            | Complete    |
| 1.4.4 | [Semantic market tokens](TASK-04-semantic-market-tokens.md)                                                                  | Complete    |
| 1.4.5 | [Component primitives and the representative component](TASK-05-component-primitives-and-representative-component.md)        | Not started |
| 1.4.6 | [Verify, document the conventions and write ADR 0004](TASK-06-verify-document-and-adr.md)                                    | Not started |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, so the tree is never broken between tasks — the same rule Stories 1.1, 1.2 and 1.3 followed.

The split is **decision first, pipeline second, design third**. Task 1.4.1 installs nothing permanent and throws its spike away, because this story's two open decisions are entangled and expensive to reverse, and deciding them from a working spike costs a day where reversing them costs an epic. Task 1.4.2 then makes the pipeline real with deliberately disposable styles, so that when a token in Task 1.4.3 does not apply, "the CSS never reached the browser" is already ruled out — the same reason Story 1.3 separated rendering React from hot-reloading it.

Tokens split into two tasks for a different reason: Task 1.4.3's are structural and Task 1.4.4's are the product's vocabulary. The second layer is where the accessibility constraint bites and where `packages/shared` becomes tempting and is mostly wrong, and neither question is visible while the argument is still about spacing scales.

Task 1.4.5 is the only one that would plausibly split further — installing primitives and building a component are two mechanisms — but the primitive alone renders nothing worth keeping, so the checkpoint sits inside the task instead of between two of them.

## Notes

Positive/negative colour choices need to survive an accessibility review — red/green alone is insufficient as the sole encoding. One measurement was taken here and handed to Task 1.4.4: the reference palette's positive green (`#498100`) is **4.27:1 on the warm page ground** and so fails AA there, while passing at 4.75 on white surfaces. That was a decision for 1.4.4 to make explicitly — darken the green, or constrain positive values to white surfaces — rather than something to inherit silently.

**Task 1.4.4 resolved it on 2026-08-31: the green darkens.** `#427400` — the same hue at 90% brightness — measures 5.07 on the page ground, 5.63 on white and 5.34 on sunken, chosen with margin rather than at the first passing value and deliberately close to the negative red's 5.31 so neither direction shouts louder. Constraining positive values to white surfaces was rejected as a rule nothing can enforce. The accessibility half of this paragraph was also settled and measured rather than argued: under `grayscale(1)` the positive and negative figures differ by **1.05:1**, which is no difference at all, so the arrow glyph and the sign carry the direction and the colour is the redundancy. Task 1.4.4's Outcome carries the simulations.
