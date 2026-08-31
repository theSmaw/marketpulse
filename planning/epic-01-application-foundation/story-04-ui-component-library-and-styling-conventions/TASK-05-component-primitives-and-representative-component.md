# Task 1.4.5 — Component primitives, the representative component and the Storybook workshop

**Status:** Complete (2026-08-31)
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.4

## Objective

Install the component library chosen in Task 1.4.1 and build the story's representative component with it — the one that demonstrates the conventions well enough that the next twenty components can be written by copying it.

**And stand up the workshop those components are developed in.** Added to this task on 2026-08-31 at the user's request: components must be viewable, developable and verifiable in isolation, and every component must have stories for all of its permutations. It belongs here rather than in a task of its own for the same reason the two halves above are not split — a workshop with nothing in it proves nothing, and a component built outside the workshop has to be retrofitted into it.

## Work

- Install the component library in **`apps/frontend`** — it is imported by that package's code. Any build-time plugin it brings goes to the root
- **The library is Base UI, and the package name is `@base-ui/react`** — not `@base-ui-components/react`, which is frozen at a 2025 release candidate and installs without an error. Import from the subpath (`@base-ui/react/popover`). Confirmed on this toolchain on 2026-08-31: installs at exit 0, does not trip `allowBuilds`, lints clean under `--max-warnings 0`, builds on Vite 8/Rolldown. Its `date-fns` peers are `optional: true` and can be left uninstalled
- **Put every Base UI usage behind our own thin wrapper component, and treat that as this task's most important convention.** Base UI was chosen over a lighter alternative specifically so an existing shared component library can be swapped in later (Task 1.4.1's reversal record). That swap is only cheap if call sites import our wrapper rather than the primitive — otherwise the reason for the choice is paid for and not collected. Keep the wrappers thin: they exist to own the seam, not to add behaviour
- **Read the shared library's actual exports before building the wrappers**, and record what was found. The bet is that its interfaces resemble Base UI's; if it wraps rather than re-exports, its public API is the wrapper's and the seam should be shaped to that instead. This is a cheap check now and an expensive discovery later
- **Take the primitive as far as rendering before styling it.** Render one unstyled primitive, confirm it works, then apply tokens. Two mechanisms, two chances to fail; Story 1.3 separated rendering from hot reloading for the same reason. This is the whole justification for not splitting these into two tasks — the checkpoint is inside the task instead
- **Pick a representative component that is representative of _this_ product.** A button demonstrates nothing that is hard here. Something dense and numeric — a security row carrying a ticker, a price, a signed change and an anomaly score — exercises tabular figures, the price-direction tokens, the anomaly ramp, the redundant non-colour encoding from Task 1.4.4 and a stale state, all at once. The story asks for at least one; one that touches everything is worth more than three that touch a corner each
- **This is the first real code the React Compiler rule set has ever seen.** `eslint-plugin-react-hooks`'s `recommended` is 17 rules, 15 at `error`, and most of them are Rules of React — `purity`, `immutability`, `set-state-in-render` — rather than hook ordering. `lint` runs with `--max-warnings 0`, so a `warn` fails `verify` too. Expect the first genuine finding here, and treat it as information: a rule firing on the first real component is either a real defect or evidence that a rule adopted wholesale in Task 1.3.2 does not suit this codebase. Decide which, in writing, rather than reaching for a disable comment
- **A styling approach that computes styles during render collides with those rules specifically**, which is the collision Story 1.4's inherited notes predicted. If it happens, it surfaces as a lint error rather than a runtime problem — that is the rule set doing its job, not an obstruction
- Establish and demonstrate the conventions the next components will copy: where components live under `src/`, how a component receives its styles, how variants are expressed, how props are typed, and how a component that must be composable exposes that. Write them as a component that answers the questions, not as a paragraph promising to
- **Accessibility is a selection constraint, so exercise it.** The chosen primitives claim accessible behaviour; confirm at least keyboard focus and visible focus styling actually work in the browser. A focus ring is a token decision that only reveals itself as missing when someone tabs
- **Do not build a component library.** One representative component and whatever primitives it needs. Story 1.5 builds the chrome, Epic 4 builds the overview, and a speculative set of twenty components built before either exists is scaffolding ahead of the step — which this repository explicitly does not do
- Relative imports between the new files carry `.js` extensions from `.ts`/`.tsx` sources. This is the rule most often forgotten in a task that adds several small files at once, and it has exactly one enforcer: `tsc -b` fails with TS2835 while `vite build` resolves `./Row` to `Row.tsx` and emits a **byte-identical** bundle. Neither the dev server nor the bundler will tell you

### The workshop

- **Storybook, installed by hand rather than by `storybook init`.** That command scaffolds an example `stories/` directory, rewrites `package.json` and picks addons by its own judgement; none of it survives review here
- **Placement follows the house rule and gives a counter-intuitive answer.** "Does the package's source import it?" — story files under `src/` import `Meta` and `StoryObj`, so `storybook`, `@storybook/react-vite` and `@storybook/addon-a11y` are **`apps/frontend` devDependencies**, not root tooling. `eslint-plugin-storybook` is an ESLint plugin and goes to the root beside the config it extends, exactly as `eslint-plugin-react-hooks` did
- **Expect `allowBuilds` to fire, and allowlist the specific package.** `storybook` depends on `esbuild` directly, so the install exits 1 with `[ERR_PNPM_IGNORED_BUILDS]` and pnpm rewrites `pnpm-workspace.yaml` with a stub. That is the documented failure mode from Task 1.4.1's spike, arriving for real
- **The workshop must load the same cascade the application does**, in the same order, and make the same `getTokens()` startup assertion. A component that renders correctly in the workshop and wrongly in the application is a cascade problem, and it should not be possible to have one without seeing it
- **`.storybook/main.ts` and `.storybook/preview.ts` sit outside the frontend tsconfig's `include`**, so they hit the `vite.config.ts` trap exactly. They join the trailing `disableTypeChecked` block; widening `include` is the wrong fix
- **Every component gets one story per discrete state, plus an `AllPermutations` story** rendering the cartesian product of its variant props in a labelled grid. Where the product is unbounded, use representative **extremes** rather than plausible examples — the longest ticker, the widest digits, a negative sign — because those are what break a tabular column
- **Put a real check behind the rule.** A convention with nothing behind it is the same green-tick-that-means-nothing problem as the placeholder `test` scripts. The check belongs in `pnpm verify`, and its own file must state what it does not prove
- **Do not adopt a test runner.** Storybook 10 brings Vitest and Testing Library into the lockfile. Story 1.9 picks the runner, and taking that decision here would be scaffolding ahead of the step

## Done when

- The component library is installed in the right package and its primitive renders
- One representative component exists, built from the tokens, exercising price direction, anomaly intensity and a stale state
- Keyboard focus works and is visible
- Every component is viewable in isolation and has stories for all of its permutations, with a check in `pnpm verify` that fails when a component has no stories file — and the check has been seen to fail
- The static Storybook build renders from a dumb static host, not only from Storybook's own server
- The application bundle is unchanged in shape: three files, with no story code in it
- `pnpm verify` passes, including `lint` with `--max-warnings 0`
- Any React Compiler rule that fired is resolved by changing the code or by a recorded decision about the rule — not by an inline disable added without one
- No component exists that nothing renders

## Notes

The test of this task is not that the component looks right. It is that Story 1.5 can build persistent chrome by following it without asking a question this task should have answered.

## Outcome

Complete. `pnpm verify` exits 0 in ~8.3s, the application still builds to three files that render from a dumb static host, and every claim below was measured in the browser rather than read off the source.

### What changed

| File                                               |                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/Popover/*`                         | New. The Base UI seam — wrapper, stylesheet, stories                              |
| `src/components/PriceChange/*`                     | New. Signed figure, direction glyph, screen-reader word                           |
| `src/components/AnomalyBadge/*`                    | New. The band chip, with its name inside the fill                                 |
| `src/components/FeedIndicator/*`                   | New. Marker shape plus word, optional detail                                      |
| `src/components/SecurityRow/*`                     | New. The representative component, composing the four above                       |
| `src/components/stories.module.css`                | New. Workshop furniture — the permutation grid. Never in the app bundle           |
| `src/App.tsx`, `src/App.module.css`                | Rebuilt on the components. The stylesheet got **shorter**, which is the shape     |
| `.storybook/main.ts`, `.storybook/preview.ts`      | New. Hand-written; `storybook init` was not run                                   |
| `scripts/check-stories.mjs`                        | New. The first plain-JavaScript file in this workspace                            |
| `eslint.config.mjs`                                | Storybook rules, two more `disableTypeChecked` files, Node globals for `scripts/` |
| `pnpm-workspace.yaml`                              | `allowBuilds: esbuild: true` — the policy's first entry ever                      |
| `package.json` ×2, `.gitignore`, `.prettierignore` | The `stories` step, the Storybook scripts, `storybook-static/`                    |

### The finding: the tooltip was the wrong primitive, and Base UI says so

This task's brief said to exercise accessibility rather than assume it, and doing so changed a component.

The wrapper was written as a **Tooltip** over `@base-ui/react/tooltip`. Measured against the built workshop, its popup carries **no `role="tooltip"`**, the trigger carries **no `aria-describedby`**, and the only ancestor with a role has `role="presentation"`. The content is visual only.

That is deliberate, and Base UI's own documentation is explicit: tooltips "are not a reliable way to deliver important information to touch users or assistive technologies. If the description is important to understanding the element, don't hide it behind a tooltip — use inline text or Popover if space is limited."

The first thing this product puts behind that seam is an anomaly score's explanation, and PRODUCT_SPEC.md §11 requires every score to carry one. That makes it important by definition. So the wrapper is a **Popover**. Re-measured after the swap:

| Property                       | Tooltip      | Popover                     |
| ------------------------------ | ------------ | --------------------------- |
| Popup role                     | none         | `dialog`                    |
| `aria-labelledby` on the popup | no           | yes (`Popover.Title`)       |
| `aria-describedby`             | no           | yes (`Popover.Description`) |
| Opens on                       | hover, focus | click, Enter, Space         |

The cost, stated rather than hidden: an explanation is now a deliberate click where it was a glance. In a dense table that is the right trade for something the spec requires and the wrong one for a hint, so a hint — if one is ever needed — should arrive as a **second** wrapper rather than as a looser version of this one.

This is not a finding against Base UI. The behaviour is correct for what a tooltip is, and the library documents it. What it is evidence for is that "accessible primitives" is a property of each primitive rather than of a library, which is what Epic 15's review should inherit.

### Keyboard focus, measured

On the built workshop served from `python3 -m http.server`: `Tab` reaches the trigger, which is a real `<button>`; `:focus-visible` matches; the computed outline is `rgb(28, 28, 28) solid 2px` at `outline-offset: 2px` — the token decision from Task 1.4.3 meeting a real control for the first time. `Enter` opens the popup. No component declares a focus style of its own; the one global rule in `base.css` does the work.

### The accessibility addon

`@storybook/addon-a11y` runs axe against each story and reports in a panel. On `SecurityRow`'s 36-row permutation grid: **0 violations, 17 passes, 1 inconclusive**. It reports and does not fail a build — the addon's `test` parameter drives Storybook's Vitest integration, which this task deliberately did not adopt.

### The permutation convention, and what the check actually proves

Every component ships one story per discrete state plus an `AllPermutations` story. `SecurityRow`'s is the largest: three directions × four bands × three feed states = **36 rows**, confirmed as 36 in the DOM.

`scripts/check-stories.mjs` runs in `verify` between `format:check` and `test`. **It was seen to fail**: with `Popover.stories.tsx` moved aside it exits 1 naming the file and the expected path. Its header states the two things it does not prove — that the stories inside cover the permutations, and that a component declared inside another component's file has any. The one-component-per-file convention is what makes the second harmless.

### The bundle, and the one number that moved

The application artefact is still **three files**. The stylesheet grew 6.22 kB → 7.05 kB. The JavaScript grew 196.36 kB → **293.06 kB**, and essentially all of that is Base UI's popover: Task 1.4.1 measured Radix as lighter by 37 kB for one primitive, and this is the other side of that trade being paid. It was a reversal taken knowingly and on a different constraint; the number is recorded here so nobody has to re-derive it.

No story code reached the bundle — `AllPermutations`, `Market/SecurityRow`, `storybook` and the workshop stylesheet's class names all return zero matches in the emitted JavaScript and CSS. Stories are inside `tsc -b`'s program and unreachable from `index.html`, which is exactly the shape wanted.

### Tabular alignment survived the refactor

Measured on the built application: all three `last` figures render at **60.023 px**, the same figure Task 1.4.3 recorded before any of this was a component, and each numeric column has a single right edge (310 and 444) — so the fixed-width arrow box still does not disturb the column.

### The React Compiler rules, still unexercised

Five components, none of them stateful, no hooks anywhere. The 17 rules adopted wholesale in Task 1.3.2 have still never fired. The prediction that this task would produce the first finding was wrong, and the reason is worth keeping: the styling approach computes nothing during render, which was the collision the story predicted. Epic 2 or Story 1.5 will be the first real test.

### `allowBuilds` fired, exactly as recorded

`[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2`, `pnpm install` at exit 1, and pnpm rewriting `pnpm-workspace.yaml` with an `esbuild: set this to true or false` stub — the signature Task 1.4.1's spike documented, arriving through Storybook rather than through a styling library. esbuild is allowlisted with the reason written beside it, and a sweep of the installed tree found **it is the only package in the workspace with an install script**.

### Two things the toolchain caught that a looser one would not

- **`exactOptionalPropertyTypes`.** A permutation grid mapping over `[label, title]` pairs has to pass `title: undefined` for the no-title case, which is a different type from omitting it. The grid is written out as four cells instead — the compiler making the same distinction the component's API does.
- **TS2883 on an inferred `Meta`.** A decorator written inline makes `meta`'s inferred type unnameable ("cannot be named without a reference to `PartialStoryFn` … this is likely not portable"). Naming the decorator `const withTable: Decorator` fixes it. Worth knowing before the next story file with a decorator.

### What was deliberately left out

- **No test runner.** Storybook 10 puts `@vitest/expect`, `@vitest/spy` and three Testing Library packages in the lockfile. No `storybook test`, no `@storybook/addon-vitest`, no interaction tests. Story 1.9 picks the runner and has been given a note saying this is evidence rather than a decision
- **No `@storybook/addon-docs`.** Autodocs with nothing written in it is a tab that says nothing
- **Storybook is not in root `pnpm dev`.** That is already three loops and eight processes in one terminal; a fourth watcher is noise. `pnpm --filter @marketpulse/frontend storybook` is the command
- **No `Popover.Backdrop` and no `Popover.Close`.** Neither has a caller
- **No component library.** Five components, four of which the fifth uses

### One thing this task owed and did not deliver

**The shared component library's actual exports were not read.** That bullet asks for a check that cannot be made from inside this repository — the library is external to it. The bet Task 1.4.1 made is therefore still a bet: that its interfaces resemble Base UI's closely enough that the swap is cheap. What this task did instead is make the bet as cheap to lose as possible — there is exactly **one** file importing `@base-ui/react`, and it is 30 lines of assembly with no behaviour. The check is still owed, and it is owed **before Story 1.5 adds more wrappers**, not after.
