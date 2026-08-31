# Task 1.4.5 — Component primitives and the representative component

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.4

## Objective

Install the component library chosen in Task 1.4.1 and build the story's representative component with it — the one that demonstrates the conventions well enough that the next twenty components can be written by copying it.

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

## Done when

- The component library is installed in the right package and its primitive renders
- One representative component exists, built from the tokens, exercising price direction, anomaly intensity and a stale state
- Keyboard focus works and is visible
- `pnpm verify` passes, including `lint` with `--max-warnings 0`
- Any React Compiler rule that fired is resolved by changing the code or by a recorded decision about the rule — not by an inline disable added without one
- No component exists that nothing renders

## Notes

The test of this task is not that the component looks right. It is that Story 1.5 can build persistent chrome by following it without asking a question this task should have answered.
