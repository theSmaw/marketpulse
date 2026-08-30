# Task 1.3.5 — Verify the story end to end and document

**Status:** Not started
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.4

## Objective

Execute all five acceptance criteria together, from a clean build, rather than inheriting each task's own claim about itself. Then write down what was learned, in the three places that carry it: the ADR, `README.md`, and `CLAUDE.md`. This is the task Story 1.1 and Story 1.2 both ended with, for the reason both found useful — the tasks that made a thing work are not the ones best placed to say whether it still works together.

## Work

### Verify

Run all five acceptance criteria in one sitting, from `pnpm clean` and a fresh install, recording the actual output rather than "passed":

- Development server runs with hot module replacement
- The application renders a placeholder shell in the browser
- The production build emits static assets — and they serve and render
- `pnpm verify` passes from the repository root
- The browser target is documented and `target`/`lib` match it

Then the checks that only make sense once everything is in place:

- Root `pnpm dev` with all three packages, including Ctrl-C leaving nothing behind
- A **clean clone** into an empty directory, following `README.md`'s written words rather than the working tree — the method Task 1.1.8 established. This is not Story 1.8's criterion (which requires a running _pair_ reached from the README) but it is the frontend half of it, and finding out here is cheaper
- The `.js`-extension import resolving through both `tsc` and the bundler, since that is the one convention this story stresses in a way the backend never did

### Document

- **Write the ADR.** It records the build tool choice, what `build` means once a bundler exists, the output-directory decision, and the browser baseline — each with its rejected alternative, which is the part that makes an ADR worth writing. Number it the **next free number in `docs/adr/`**, which is `0003`, and follow the convention in `docs/adr/README.md`: numbered in the order written, never renumbered
- Two of those four have answers that are not the obvious ones and need their reasoning preserved, because a future reader will otherwise "fix" them. **The output-directory decision was made by removing a producer** — `noEmit` on the frontend's TypeScript half — which is only safe because it is a composite project referenced by nothing, and would be actively wrong for `packages/shared`. And **`build` at the root is not the same string as `build` in the package**: the root's is `tsc -b && pnpm --filter @marketpulse/frontend exec vite build`, because a plain root `tsc -b` would have let `pnpm verify` pass without ever running the bundler. The rejected alternative there was a `pnpm -r run build` fan-out, which the root scripts deliberately avoid
- **Fix the stale reference in Story 1.4.** Its final acceptance criterion says the styling decision will be captured "as ADR 0002", which was written before Story 1.2 took that number for the backend framework. Following it as written would force exactly the renumbering the ADR convention forbids. Correct it to name the next free number at the time, not a fixed one
- **Update `README.md`'s "What exists today" section.** It names itself as the first thing to change when the repository reaches a running application, and this story is what makes that true. The command table gains whatever this story added, and the install-script policy section — which predicts esbuild in Story 1.3 — gets replaced with what actually happened: **it did not fire.** Vite 8 uses Rolldown, shipped as prebuilt per-platform binaries, and a sweep of the whole tree in Task 1.3.1 found zero install scripts. `allowBuilds` is still empty and still untested, which is worth saying plainly rather than leaving the prediction standing as though it had been confirmed
- **Update `CLAUDE.md`** — the current-state paragraph, the layout tree, the commands section, and every claim this story falsified. Specifically: `apps/frontend` is no longer a skeleton; `dev` is no longer a placeholder anywhere; **the four-compiler-option claim is now six** (`noEmit` from Task 1.3.1, `jsx` from Task 1.3.2, both in `apps/frontend`), and the file's assertion that each of the four is load-bearing needs the same treatment for the new two; **`clean` is no longer `tsc -b --clean` in either the root or `apps/frontend`**, and the paragraph explaining the `tsc -b --clean` orphaning trap needs a note that the frontend's `rm -rf` half is content-blind and immune to it; **root `build` is no longer a bare `tsc -b`**, which contradicts the "most root scripts do not fan out" paragraph unless that paragraph is amended to describe what it now does; and the "esbuild will probably be the first install script" prediction resolves as wrong
- Add the layout entries this story created: `apps/frontend/index.html` (Vite's real entry, at the package root and inside no tsconfig), `apps/frontend/vite.config.ts`, and `apps/frontend/src/main.ts`/`main.tsx`. `vite.config.ts` is also the second file to need the trailing `disableTypeChecked` block in `eslint.config.mjs`, and the first that is not `eslint.config.mjs` itself — the note there about that block having to stay last is now protecting two files
- **Record the two development-loop asymmetries between the apps**, since a person working in both will otherwise be surprised by each in turn: the frontend's dev server does not typecheck (Rolldown strips types, so a type error reaches the browser and is caught only by the editor or `pnpm verify`), and the frontend's dev server picks a different port rather than failing when its own is busy, where the backend exits 1 with `EADDRINUSE` intact
- **Amend the downstream stories this story changes**, in the habit Task 1.2.6 established — Story 1.2's amendments to Stories 1.6 through 1.12 are the model. At minimum: Story 1.8 (its `pnpm dev` criterion is now fully in scope rather than half-met, and the frontend port question is settled), Story 1.9 (a component test needs a DOM environment, which is a different runner decision from the backend's `app.inject()`), Story 1.11 (two artefacts of different shapes, per Task 1.3.4), and Story 1.12 (the frontend can now call something; CORS and the shared `HealthResponse` land on this shell)
- **Story 1.10 gains a specific new note.** The frontend toolchain is the first dependency in this repository with a **platform-specific native binding** — Rolldown resolves `@rolldown/binding-darwin-arm64` locally and something else on Linux CI. pnpm records every platform's optional dependency in the lockfile, so this should just work, but it is the first time "works on my machine" has a real mechanism behind it in this repo and CI is where it would surface. Story 1.10 also still carries the note that `pnpm verify` covers no shell script; `apps/frontend`'s `clean` now contains an `rm -rf`, which is a second unchecked shell fragment and belongs in the same dated paragraph
- **Name what the verification could not prove**, the way Story 1.2's own section does. Candidates: nothing here proves cross-origin access to the backend, nothing tests any of this (Story 1.9), nothing has been served by a real static host, and the browser baseline is a decision rather than a measurement — no browser matrix was exercised

## Done when

- All five acceptance criteria are recorded with their actual results, from a clean build
- ADR 0003 exists and follows the numbering convention
- `README.md` and `CLAUDE.md` describe the repository as it now is, with no claim in either falsified by this story
- Story 1.4's stale ADR reference is corrected, and the downstream stories carry their amendments
- Story 1.3's `STORY.md` is marked complete with its task table filled in
- `pnpm verify` passes from the repository root, including on the Markdown this task writes

## Notes

Two documentation habits from earlier stories are worth keeping rather than rediscovering. Measure before writing — Task 1.2.6 found that a guess written down confidently (the `tsc -b --clean` mechanism) survived two tasks before being checked and turned out to be backwards. And date the deliberate gaps: a known choice with a date is a decision, while the same gap unwritten is an oversight, and the two are indistinguishable six weeks later.
