# Task 1.10.4 — Coverage as its own step, the threshold decision, and what CI publishes

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2

## Objective

Run `pnpm coverage` in the pipeline without letting it become part of the acceptance chain, decide whether a threshold gates anything, and decide what the pipeline keeps after a run.

## Work

- **`pnpm coverage` runs as its own step and never inside `verify`.** Story 1.9 put it outside the chain deliberately — nothing gates on the number, and instrumenting every run costs every developer for a figure nobody reads. Running it as a separate CI step is exactly what the baseline exists for. If it is allowed to fail the job, that is the threshold decision below and it needs arguing; if it is not, mark the step `continue-on-error` or run it in its own job so a coverage hiccup does not read as a broken build
- **Decide the threshold, and record the decision either way.** This is the first story that _could_ set one. The baseline is **30.00% / 64.33% / 68.25%** of statements for `packages/shared`, `apps/backend` and `apps/frontend` — three separate reports, not one merged number, because the three packages share no code. Two constraints on any threshold that gets set:
  - **`apps/backend/src/index.ts` and `apps/frontend/src/main.tsx` are at 0% by decision** and are deliberately left in the denominator so the untestable process half is visible as a figure. **A threshold met by excluding them measures less than no threshold at all.** If Task 1.10.5 lands its process suite, the backend's number moves for a real reason and a threshold set before it would have been set against a stale denominator — which is an argument for sequencing this decision after 1.10.5, or for taking the baseline again afterwards
  - **A per-package threshold, not a global one.** Vitest configures coverage per package and there is no root config; a single number over three suites that drive three different things is an average of unrelated quantities
- **The green tick certifies 103 tests and not coverage, and the pipeline must not blur that.** `README.md` and `CLAUDE.md` both say so; whatever CI reports has to keep it true. A badge or a job named in a way that reads as coverage is the exact failure Story 1.1 spent three documents warning about when `test` was an `echo`
- **Decide what is uploaded and for how long.** Three candidates, each with a different answer:
  - **The three `coverage/` directories** — HTML plus whatever text summary the run printed. Useful on a red run, near-useless on a green one. Note the reading trap that comes with them: the terminal table lists only files that are **not** fully covered, so it is not the denominator; `<package>/coverage/index.html` is
  - **`storybook-static/`** — 299 modules, 59 files, 9.3 MB on disk, produced by `pnpm build` on every run whether anyone wants it or not. The story says this story owns whether it is published. Publishing it _as a site_ is Story 1.11's; uploading it as a build artefact is this task's, and 9.3 MB per run has a real storage cost for a portfolio repository. Decide, with the number in the sentence
  - **`apps/frontend/dist/`** — three files, 343,658 B of JavaScript and 10,926 B of CSS, md5 `cba2825c…`, byte-identical from a clean clone for five stories running. Cheap, and it makes "the artefact did not move" a thing CI can show rather than a thing a task re-measures by hand. Whether that is worth an upload step is the decision
- **Set retention deliberately.** The default is 90 days and this repository produces a ~9.3 MB candidate on every push. Say the number
- **Do not add a coverage-reporting service.** A third-party uploader is a token, a second definition of the number and an external dependency for a repository whose whole coverage story is three local HTML reports. If one is ever wanted, the reversal trigger is a reviewer needing per-PR diff coverage, and that belongs to whoever asks for it

## Done when

- `pnpm coverage` runs in the pipeline, outside `verify`, and its ability to fail the job is a stated decision
- The threshold question is answered in writing — including, if the answer is "none", why a number invented now would be met by testing what is easy
- Both 0% entrypoints are confirmed still in the denominator
- Every upload has a decision, a size and a retention period beside it, and the ones declined are recorded as declined rather than omitted
- Nothing in the pipeline's output invites coverage to be read off the green tick

## Notes

If Task 1.10.5 lands first, take the coverage baseline again before deciding the threshold — the backend's 64.33% is a figure about a tree where the process half is unreachable, and that task's whole purpose is to make it reachable.
