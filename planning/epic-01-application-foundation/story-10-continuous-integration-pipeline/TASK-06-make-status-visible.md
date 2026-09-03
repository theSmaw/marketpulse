# Task 1.10.6 — Make the status visible from the repository

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Tasks 1.10.2, 1.10.4 — read 1.10.2's hand-off in [STORY.md](STORY.md#what-task-1102-hands-the-remaining-tasks) first

## Objective

Meet the story's "status is visible from the repository" criterion, and make sure what the tick claims is exactly what the pipeline checked.

## Work

- **A badge in `README.md`, pointing at the workflow rather than at a branch's last run.** Put it where a portfolio reader looks first — the top — and make the link go to the workflow's run history, so a red badge is one click from the reason. This is the repository's only outward-facing signal that it is maintained rather than a snapshot, which is the criterion's actual purpose
- ~~**Name the workflow for what it certifies.**~~ **Settled in Task 1.10.2 rather than here: the workflow is `verify` and so is its job**, on the reasoning this bullet argued — `CI` is generic and anything containing "tests" or "coverage" is not honest, because the chain is six steps of which `test` is one and coverage is deliberately not gated. It moved a task earlier because a badge and a required status check are both keyed on those names and a rename silently un-requires a check. **This task points a badge at a stable name; it does not choose one, and it must not rename either.** A pull request's checks list shows the pair as `verify / verify`
- **There is a name mismatch left over and it is this task's to settle: the file is still `.github/workflows/ci.yml` while the workflow is `verify`.** This matters here and nowhere else, because **a badge URL is keyed on the file name** (`/actions/workflows/ci.yml/badge.svg`) while a required status check is keyed on the **job** name. So the two identifiers are independent: renaming the file to `verify.yml` makes the repository self-consistent and costs a badge URL that has to be written against the new name — cheap now, and a broken badge image later if it is done after the badge exists. Renaming it after a badge is published is the failure this task's last bullet describes, and it looks fine to whoever did it. Decide it here, before the badge, and say which was chosen
- **Say, next to the badge, what green means.** One line, and it is a claim this repository can defend: `pnpm verify` passed from a clean environment — build (both bundlers), lint, format, stories, `env:check`, and 103 tests. And one clause for what it does not mean: not coverage, which is `pnpm coverage` and which reports three separate figures with both entrypoints deliberately at 0%. The general form Story 1.6 handed this story belongs here too — **a green pipeline means every check passed, not that every claim holds** — and Task 1.10.7 is where the unchecked claims get listed
- **Decide whether the check is required on `main`.** Story 1.1 was delivered through pull requests and this repository's convention is that every changeset ends at one, so a required status check is the setting that turns the pipeline from advisory into binding. It is a repository setting rather than a file, which means it is invisible in a diff and easy to lose — so if it is set, say so in the ADR, and name the check exactly as the workflow names its job, because a rename silently un-requires it. If it is deliberately not set, say that too, with the reason (a solo repository where a required check is a self-imposed gate is a real position, not an oversight)
- **Decide what a pull request shows beyond pass or fail — and the cheap option is now cheaper than this bullet assumed.** The per-step timings already exist: Task 1.10.2's `Verify` step prints a derived split, whose step names are read out of pnpm's own announcement lines rather than written in the workflow. Promoting it to `$GITHUB_STEP_SUMMARY` is a redirect of output that already exists, not new reporting code — and it inherits the property that matters, that a step added to `verify` appears without a workflow edit. **Whatever is written there must keep that property**: a summary that hand-lists the six steps is the fork this story exists to prevent, wearing a nicer typeface. The per-runner spread belongs beside any timing shown to a reviewer, and Task 1.10.3 made it wider rather than narrower: **18,589–32,210 ms for the same tree over nine runs, a 13.6 s spread**, against an install the store cache moves by ~1.6 s. Without that beside it, a summary invites a normal run to be read as a regression — and invites the cache to be blamed for a slow one. The expensive options — inline annotations, a comment bot, a coverage diff service — each add a token or a dependency and none of them is warranted by a repository with three packages and no external contributors. Pick the cheap one or none, and say which
- **Check the badge actually renders and links correctly**, from a logged-out browser. A badge URL with the wrong branch or a renamed workflow file renders as an unhelpful "no status" image — and note the default branch it reports is `main`, which is the one branch `push` still triggers on after Task 1.10.2, so the badge tracks merged state rather than any open pull request, and it is the one thing in this story that is broken _for the audience it exists for_ while looking fine to the person who added it

## Done when

- The badge is in `README.md`, renders logged-out, and links to the workflow's runs
- The workflow's name is left as Task 1.10.2 set it, and the `ci.yml` / `verify` file-name mismatch is decided before the badge exists
- One sentence beside the badge states what green certifies and one clause states what it does not
- The required-check question is answered either way and recorded in the ADR
- The pull-request reporting decision is recorded, including the options declined

## Notes

This is the story's only user-visible deliverable. Everything else in the pipeline is infrastructure that succeeds by being unremarkable; the badge is the part a portfolio reader actually sees, and it is also the part most able to overstate what the repository has.
