# Task 1.10.4 — Coverage as its own step, the threshold decision, and what CI publishes

**Status:** Complete
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2 — read its hand-off in [STORY.md](STORY.md#what-task-1102-hands-the-remaining-tasks) first

## Objective

Run `pnpm coverage` in the pipeline without letting it become part of the acceptance chain, decide whether a threshold gates anything, and decide what the pipeline keeps after a run.

## Work

- **`pnpm coverage` runs as its own step and never inside `verify`.** Story 1.9 put it outside the chain deliberately — nothing gates on the number, and instrumenting every run costs every developer for a figure nobody reads. Running it as a separate CI step is exactly what the baseline exists for. If it is allowed to fail the job, that is the threshold decision below and it needs arguing; if it is not, mark the step `continue-on-error` or run it in its own job so a coverage hiccup does not read as a broken build
- **A second job, never a second workflow — and Task 1.10.2 is why.** The triggers and the concurrency group are both properties of the workflow: `push` restricted to `main`, `pull_request`, and `${{ github.workflow }}-${{ github.ref }}` with `main` exempt from cancellation. A second workflow file duplicates all of that, which is a second place the trigger set lives and a second concurrency group that does not cancel with the first — the same forking failure this story exists to prevent, one level up from the chain. A second **job** inherits both for free and runs in parallel with `verify`, which matters because of the figure below
- **Know what a second fan-out costs on this runner before choosing where it goes — and Task 1.10.3 corrected the cheap half of this bullet.** `pnpm coverage` is 2.92 s locally, and Task 1.10.2 measured the runner at **2.2–3.5× the laptop per step**. The spread is now measured over nine runs rather than two and it is **wider**: chain totals of 18,589–32,210 ms on the same tree, a **13.6 s spread**. So coverage appended as a step to the `verify` job lengthens the answer everyone waits for by less than two runners already differ by. **What is wrong is "in its own job it costs wall-clock nothing".** A second job is a second runner: its own checkout, its own `actions/setup-node`, its own Corepack, its own cache restore and its own install (3,895–4,597 ms on a cache hit) — and then, unavoidably, **its own `pnpm build`**, because `packages/shared` is consumed as built output and Story 1.9 measured what `pnpm test` does without one (16 passed with `dist` missing, 13 silent failures with it stale). `build` is the most expensive step in the chain on the runner, 5,204–8,527 ms. So a parallel coverage job is close to a duplicate of the `verify` job minus lint and Prettier, and **it must not close that gap by caching `dist/`** — Task 1.10.3 wrote that rule into the workflow with the number that decides it. The honest framing: a parallel job costs no wall clock on the _answer_ and roughly a whole second job in runner minutes, and it needs a build step of its own written out. Decide with that in the sentence
- **Decide the threshold, and record the decision either way.** This is the first story that _could_ set one. The baseline is **30.00% / 64.33% / 68.25%** of statements for `packages/shared`, `apps/backend` and `apps/frontend` — three separate reports, not one merged number, because the three packages share no code. Two constraints on any threshold that gets set:
  - **`apps/backend/src/index.ts` and `apps/frontend/src/main.tsx` are at 0% by decision** and are deliberately left in the denominator so the untestable process half is visible as a figure. **A threshold met by excluding them measures less than no threshold at all.** If Task 1.10.5 lands its process suite, the backend's number moves for a real reason and a threshold set before it would have been set against a stale denominator — which is an argument for sequencing this decision after 1.10.5, or for taking the baseline again afterwards
  - **A per-package threshold, not a global one.** Vitest configures coverage per package and there is no root config; a single number over three suites that drive three different things is an average of unrelated quantities
- **The green tick certifies 103 tests and not coverage, and the pipeline must not blur that.** `README.md` and `CLAUDE.md` both say so; whatever CI reports has to keep it true. A badge or a job named in a way that reads as coverage is the exact failure Story 1.1 spent three documents warning about when `test` was an `echo`
- **Decide what is uploaded and for how long.** Three candidates, each with a different answer:
  - **The three `coverage/` directories** — HTML plus whatever text summary the run printed. Useful on a red run, near-useless on a green one. Note the reading trap that comes with them: the terminal table lists only files that are **not** fully covered, so it is not the denominator; `<package>/coverage/index.html` is
  - **`storybook-static/`** — 299 modules, 59 files, 9.3 MB on disk, produced by `pnpm build` on every run whether anyone wants it or not. The story says this story owns whether it is published. Publishing it _as a site_ is Story 1.11's; uploading it as a build artefact is this task's, and 9.3 MB per run has a real storage cost for a portfolio repository. Decide, with the number in the sentence
  - **`apps/frontend/dist/`** — three files, 343,658 B of JavaScript and 10,926 B of CSS, md5 `cba2825c…`, byte-identical from a clean clone for five stories running. Cheap, and it makes "the artefact did not move" a thing CI can show rather than a thing a task re-measures by hand. Whether that is worth an upload step is the decision
- **If coverage figures are reported anywhere, reuse the mechanism rather than inventing one.** Task 1.10.2's per-step split is derived from the chain's own output — the names are read out of pnpm's first announcement line and nothing in the workflow names a step. Whatever this task prints, in a log or a summary, keeps that property: it reports what the command emitted, and it never carries a hand-written list of packages or steps that can drift from the ones that ran
- **Set retention deliberately.** The default is 90 days and this repository produces a ~9.3 MB candidate on every push. Say the number
- **The store cache is already there and a second job inherits it for free.** Task 1.10.3's key is `pnpm-store-v1-<runner.os>-node<major>-<lockfile hash>`; a second job in the same workflow restores the same entry, so the install half of a coverage job is the cheap half. Two things not to undo: `cache-hit: false` covers both a restore-key hit and a total miss (`actions/cache` declares `cache-hit` and nothing else), so read pnpm's `reused`/`downloaded` counts; and the cache is **scoped to the ref**, so a `workflow_dispatch` probe of a coverage job starts cold relative to a `pull_request` run
- **Do not add a coverage-reporting service.** A third-party uploader is a token, a second definition of the number and an external dependency for a repository whose whole coverage story is three local HTML reports. If one is ever wanted, the reversal trigger is a reviewer needing per-PR diff coverage, and that belongs to whoever asks for it

## Done when

- `pnpm coverage` runs in the pipeline, outside `verify`, and its ability to fail the job is a stated decision
- The threshold question is answered in writing — including, if the answer is "none", why a number invented now would be met by testing what is easy
- Both 0% entrypoints are confirmed still in the denominator
- Every upload has a decision, a size and a retention period beside it, and the ones declined are recorded as declined rather than omitted
- Nothing in the pipeline's output invites coverage to be read off the green tick

## Notes

If Task 1.10.5 lands first, take the coverage baseline again before deciding the threshold — the backend's 64.33% is a figure about a tree where the process half is unreachable, and that task's whole purpose is to make it reachable.

## Outcome

`pnpm coverage` runs as a step in the `verify` job, after `Verify`, marked `continue-on-error`. Every decision is written in the workflow beside the step it governs; this section records the measurements behind them.

**Where it runs, and why not a second job.** A step, reusing the build `verify` just did. A second job is a second runner — its own checkout, setup-node, Corepack, cache restore, install and then, unavoidably, its own `pnpm build`, because `packages/shared` is consumed as built output. A second _workflow_ was never a candidate: the triggers and the concurrency group are properties of the workflow, so a second file forks both. As a step, coverage cost **8,279 ms on the runner** against **2.60–3.06 s locally (n=3)** — 2.7–3.2×, squarely inside Task 1.10.2's 2.2–3.5× band, and well under the 13.6 s spread two runners already show on identical work.

**It cannot fail the job, and that was made to happen rather than assumed.** A throwaway commit added `src/index.ts` to the backend's `coverage.exclude` — the exact violation the assertion exists for. Three things happened at once, all on run `33705215225`: the backend's statements went **64.33% → 91.08%**, which is the flattering number the threshold argument predicts; the assertion fired with `apps/backend/coverage/src/index.ts.html is missing — the entrypoint has left the coverage denominator`; and the **run conclusion was still `success`**. The commit was reverted and dropped from the branch.

**How a failure here actually shows, which is not what it looks like.** The run carries two `failure` annotations — the step's own `::error::` naming the file, and `Process completed with exit code 1`. The step's `conclusion` reads **`success`** in the API and the UI, because `continue-on-error` swallows it; the real result lives in `steps.<id>.outcome`. So a later step's `if:` written against this step's `conclusion` would be `success` whatever happened, and the annotation is the evidence.

**No threshold**, argued in the workflow in three parts: a number invented over nine components and no application state is met by testing what is easy; Task 1.10.5 is about to move the backend's denominator for a real reason, so a threshold set now would be set against a stale one; and the cheapest way to meet any threshold here is the exclusion just measured at +26.75 points. The reversal trigger is a number somebody would defend — after 1.10.5, against a denominator that includes the process half, and per package.

**Both 0% entrypoints confirmed in the denominator**, on the runner and locally: `apps/backend/src/index.ts` (0% of 24–232) and `apps/frontend/src/main.tsx` (0% of 39–79). The assertion checks **presence in the report** rather than a percentage of 0, on purpose — an assertion pinned to 0% would fail on the very task that makes `index.ts` reachable.

**Derived, never declared.** The per-package table comes out of `pnpm -r`'s own line prefixes, the same property Task 1.10.2's per-step split has. The runner reproduced the laptop's figures to the digit: `packages/shared` 30 / 50 / 33.33 / 30, `apps/backend` 64.33 / 75 / 72.72 / 63.82, `apps/frontend` 68.25 / 70.83 / 80.64 / 67.21.

**What is uploaded, with a size and a retention beside it.**

| Candidate                         | Decision                     | Size                                     | Retention             |
| --------------------------------- | ---------------------------- | ---------------------------------------- | --------------------- |
| the three `coverage/` directories | **uploaded**                 | 956 KB, 73 files, **211,427 B** uploaded | **7 days**, confirmed |
| `apps/frontend/storybook-static/` | **declined**                 | 9.3 MB on disk, 59 files, per push       | —                     |
| `apps/frontend/dist/`             | **declined** — fingerprinted | 3 files, 355,685 B                       | —                     |

Seven days rather than the 90-day default: a coverage report is read within days of the run that produced it or it is not read at all. Confirmed on the runner — the artefact's `expires_at` is exactly seven days after upload. `storybook-static/` is declined as an _upload_; publishing it as a site is Story 1.11's question. `apps/frontend/dist/` is declined in favour of the fingerprint step, which answers the question an upload would be downloaded to answer.

**The fingerprint found something the upload would not have.** It prints every file in `dist/` with its size and md5 into the job summary, and the Linux runner produced `index-C-Puqfnm.js` at **343,658 B**, md5 **`cba2825c87721779927b2f385df406e9`** — **byte-identical to the laptop's**, along with the 10,926 B stylesheet and the 1,101 B `index.html`, 355,685 B over three files. That identity has been re-measured across macOS clean clones for five stories and had **never** been checked across platforms; it now is, and it is checkable on every run without downloading anything. It is deliberately a record and not a check: nothing asserts the hash, because the artefact is supposed to change when the frontend changes.

**Declined outright:** a coverage-reporting service. A third-party uploader is a token, a second definition of the number and an external dependency for a repository whose whole coverage story is three local HTML reports. The reversal trigger is a reviewer needing per-PR diff coverage.

**The green run for the record:** `33705030662`, cache-hit `true`, `reused 397, downloaded 0`, install 5,081 ms, chain 32,795 ms — build 8,846 / lint 8,863 / `format:check` 6,391 / `stories` 488 / `env:check` 504 / `test` 6,757 — coverage 8,279 ms, artefact 211,427 B.
