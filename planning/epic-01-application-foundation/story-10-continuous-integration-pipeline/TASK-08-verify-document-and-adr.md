# Task 1.10.8 — Verify the pipeline end to end, document it, and record the decisions as ADR 0010

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Tasks 1.10.1–1.10.7

## Objective

Re-run every claim this story made rather than reading the task write-ups, take the figures again, write `docs/adr/0010-*`, and close the story.

## Work

- **Re-execute, do not cite.** This is the rule every closing task in this epic has followed and it has caught something every time: Task 1.7.7 rebuilt four commits to find that two earlier "corrections" were themselves wrong, and Task 1.9.7 found the "a green `pnpm test` means no tests exist" warning standing in **thirteen** places rather than the three that were recorded. Re-run all eight acceptance criteria against the shipped pipeline, and re-take every number this story wrote down — install cold and warm, the per-step split on the runner, the coverage figures, the artefact sizes
- **Prove the pipeline red as well as green, once more on the shipping workflow.** Task 1.10.2 made each failure class fail against a work-in-progress file; do it again against the final one. A workflow edited four more times since the last red run is a workflow whose failure path is untested
- **Take the artefact figures from the runner.** `apps/frontend/dist` has been 271 modules / 343,658 B / 10,926 B / three files / md5 `cba2825c…` from a clean clone for five stories running, always on macOS. **A Linux runner building it is the first cross-platform reading this repository has ever taken**, and a byte-identical result there is a genuinely new fact worth recording; a difference is worth understanding before it is written off. One cross-platform difference is already known and is not a fault: the runner installs **397 packages against macOS's 398**, the one package being `fsevents` (`os: [darwin]`, via Vite). Expect the package counts to differ and the artefact not to
- **Update the documentation, in the three places that have to agree.** `README.md` gains the badge and the CI section; `CLAUDE.md`'s Current state and Commands sections gain the pipeline and lose nothing that is still true; the ADR carries the reasoning. Keep the split this repository already uses — `CLAUDE.md` is the operational summary, the ADR is the record of _why_ — and remember Prettier owns Markdown, so an unformatted document fails the very pipeline this task is closing
- **Write `docs/adr/0010-*` from the facts, not from the task files.** It follows 0001–0009 and the numbering convention in `docs/adr/README.md`. The decisions worth a numbered section, each with its rejected alternative and its consequence:
  - The provider, and the one-file cost of reversing it
  - **The pipeline runs `pnpm verify` and defines nothing of its own** — the story's central decision, and the one most likely to be "improved" by someone splitting it into steps
  - Toolchain pinning: `.nvmrc` plus `packageManager` via Corepack, with `engineStrict` making a wrong Node a hard failure, and no separate pnpm install
  - Caching the store and **not** the build, with the stale-`dist` measurement as the reason
  - Coverage outside the chain, and the threshold decision either way
  - `pnpm ready` deliberately not a step, and why the obvious instinct is backwards
  - The process-test suite: what it covers, where it runs, and the port strategy
  - What is published, at what size and for how long
  - The five things `pnpm verify` does not cover — the fifth being a half-gap, since Prettier formats the workflow file and nothing checks its schema
  - **What a workflow assertion can and cannot catch.** Task 1.10.1's wrong-Node probe went green through `setup-node` _and_ through the workflow's own version assertion, because `.nvmrc` and the installed Node agreed with each other; `engineStrict` is what failed the install. An assertion catches a runner that disagrees with the pin, never a pin that is wrong — which is the toolchain-level form of this story's own "a green run means every check passed, not that every claim holds"
- **Do the epic pass.** Every story since 1.4 has ended by reading the remaining stories against what actually landed. Two remain — **1.11**, which depends on this one and inherits the most (a clean-environment build that works on Linux, the artefact figures, `CORS_ORIGIN` needing to be set explicitly, and the readiness rules that apply to a container probe exactly as they do to CI), and **1.12**. Add or extend a `What Story 1.10 hands this story` section in both, correct anything this story falsified, and state plainly whether a story was added, deleted or re-ordered — the answer has been "no" every time, and the value is in having asked
- **Check the verbatim `Conventions from Story 1.1` block.** It is restated identically in eleven stories and in `EPIC.md`, and it has drifted twice — both times caught by a sweep rather than by a diff. If this story changes nothing in it, say so after grepping rather than after remembering
- **Mark Story 1.10 complete** in its STORY.md and in `EPIC.md`'s story index, and tick the epic exit criterion this story completes: _automated tests run in CI_, whose first half Story 1.9 met

## Done when

- All eight acceptance criteria were re-run against the shipped pipeline, not read
- Each failure class was seen red on the final workflow
- The frontend artefact was built on Linux and compared byte-for-byte with the recorded macOS figure
- `README.md`, `CLAUDE.md` and `docs/adr/0010-*` agree, and `pnpm verify` passes on all three
- Stories 1.11 and 1.12 have been read against what landed, with the add/delete/re-order question answered explicitly
- Story 1.10 is marked complete in STORY.md and in `EPIC.md`

## Notes

This story is unusual in that its acceptance test _is_ the deliverable: the pipeline verifies itself every time it runs. What that hides is everything the pipeline does not check, which is why Task 1.10.7 comes before this one and why its list belongs in the ADR rather than in a task file that stops being read once the story closes.
