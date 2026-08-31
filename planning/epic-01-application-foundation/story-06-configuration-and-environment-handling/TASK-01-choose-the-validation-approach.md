# Task 1.6.1 — Choose the validation approach

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Story 1.5 (complete)

## Objective

Settle this story's one genuinely open decision — schema library or hand-rolled — from a measurement rather than from reputation, and do it before any configuration module exists to be rewritten.

## Work

- **Start from what already works, because the bar is not "typed".** `apps/backend/src/index.ts` reads `PORT` and `HOST` with about forty lines of hand-rolled code, and Task 1.2.1 got three things right in it that a schema must not regress: a range check that rejects anything that is not an integer in 1–65535, `Number()` rather than `parseInt()` so `"3000nonsense"` is not silently accepted as 3000, and a failure path that runs **before the logger exists** and writes `PORT must be an integer between 1 and 65535, received "nonsense"` to stderr as a plain line. Reproduce that message quality with each candidate and quote the actual output; a library whose default error is `Expected number, received nan` at path `PORT` is a regression wearing a schema
- **Candidates, and the null option is real.** Zod is the default assumption; Valibot is the serious alternative and its pitch is bundle size; a third option is **no library at all** — a `readString`/`readInt`/`readEnum` trio in one file, which is what exists today generalised. With six or so variables in the whole application there is a real question whether a dependency earns its place, and Task 1.4.3 already rejected a generated token pipeline on exactly that reasoning. Whatever wins, the losing options and their reasons go in the Outcome
- **Measure the bundle cost, and measure it in the place it can hurt.** The backend does not ship bytes to anyone, so its cost is install size and nothing else. The frontend does: this application is 265 modules and 342.08 kB (Task 1.5.6's baseline). If the chosen library is intended to validate the frontend's environment too, build with it and record the delta before adopting it. A validator that is only ever used on the server should be a dependency of `apps/backend` only, and the house rule makes that automatic — "does the package's source `import` it?"
- **Check it against this toolchain rather than its README.** `strictTypeChecked` plus `stylisticTypeChecked` with `--max-warnings 0`, `verbatimModuleSyntax`, `isolatedModules`, `module: nodenext` and `exactOptionalPropertyTypes`. The last one is the interesting one: a schema producing `{ host?: string }` from an optional field is a different type from `{ host: string | undefined }`, and Task 1.4.5 already found that distinction breaks the obvious code. Write one schema with an optional value and a default and confirm the inferred type is usable, rather than assuming inference works
- **Check the peer and engine ranges before installing.** TypeScript is pinned at 6.0.3 because typescript-eslint caps at `<6.1.0`; Node is 24.20.0 with `engineStrict` on. A candidate ruled out by a range is a finding, not a silent switch to the other one
- **Decide where the types live, and default to "not `packages/shared`".** Configuration types belong in `packages/shared` only if both apps genuinely import them, and today the two halves share no variable at all — the backend's `PORT` is meaningless in a browser. Putting them there anyway buys a rebuild ordering constraint for nothing. If a shared type does turn out to be needed, that is a finding to record, not a default to take
- Install the winner into the package or packages that import it and leave the tree passing `pnpm verify` **with no configuration module yet**. The module is Task 1.6.2's

## Done when

- The decision is closed with its measurements, the rejected options and the reason each lost
- The error-message comparison is recorded as literal output from each candidate, against the existing hand-rolled message as the baseline
- The reversal trigger is stated: what would make this the wrong choice, and what it would cost to change once Epic 2's Alpaca credentials and Epic 10's LLM credentials are in the schema
- Any new dependency sits in the package that imports it, not at the root — a validator is imported by application code, so the root-only tooling rule does not apply, and the Outcome should say so explicitly because it is the rule most likely to be misapplied here
- `pnpm verify` exits 0, and the frontend artefact is re-measured if anything reached it

## Notes

Task 1.5.1's shape is the model: spike, measure, throw the spike away, install once. Keep it small — this is a decision about six variables, and the cost of getting it wrong is one file.
