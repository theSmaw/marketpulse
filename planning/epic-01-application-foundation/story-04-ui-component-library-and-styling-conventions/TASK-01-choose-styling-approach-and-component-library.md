# Task 1.4.1 — Choose the styling approach and the component library

**Status:** Not started
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
