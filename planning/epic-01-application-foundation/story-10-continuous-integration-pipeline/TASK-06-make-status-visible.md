# Task 1.10.6 — Make the status visible from the repository

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Tasks 1.10.2, 1.10.4

## Objective

Meet the story's "status is visible from the repository" criterion, and make sure what the tick claims is exactly what the pipeline checked.

## Work

- **A badge in `README.md`, pointing at the workflow rather than at a branch's last run.** Put it where a portfolio reader looks first — the top — and make the link go to the workflow's run history, so a red badge is one click from the reason. This is the repository's only outward-facing signal that it is maintained rather than a snapshot, which is the criterion's actual purpose
- **Name the workflow for what it certifies.** The name shows up in the badge, in the checks list on a pull request and in the run history. `verify` is honest and matches the command; `CI` is generic; anything containing "tests" or "coverage" is not honest, because the chain is six steps of which `test` is one, and coverage is deliberately not gated. The story is explicit that a placeholder must not read as coverage — that hazard is gone now that 103 real tests exist, but the wording rule that came with it stands
- **Say, next to the badge, what green means.** One line, and it is a claim this repository can defend: `pnpm verify` passed from a clean environment — build (both bundlers), lint, format, stories, `env:check`, and 103 tests. And one clause for what it does not mean: not coverage, which is `pnpm coverage` and which reports three separate figures with both entrypoints deliberately at 0%. The general form Story 1.6 handed this story belongs here too — **a green pipeline means every check passed, not that every claim holds** — and Task 1.10.7 is where the unchecked claims get listed
- **Decide whether the check is required on `main`.** Story 1.1 was delivered through pull requests and this repository's convention is that every changeset ends at one, so a required status check is the setting that turns the pipeline from advisory into binding. It is a repository setting rather than a file, which means it is invisible in a diff and easy to lose — so if it is set, say so in the ADR, and name the check exactly as the workflow names its job, because a rename silently un-requires it. If it is deliberately not set, say that too, with the reason (a solo repository where a required check is a self-imposed gate is a real position, not an oversight)
- **Decide what a pull request shows beyond pass or fail.** The cheap and honest option is the job summary: the per-step timings and the three coverage figures, written once per run, where a reviewer sees them without opening logs. The expensive options — inline annotations, a comment bot, a coverage diff service — each add a token or a dependency and none of them is warranted by a repository with three packages and no external contributors. Pick the cheap one or none, and say which
- **Check the badge actually renders and links correctly**, from a logged-out browser. A badge URL with the wrong branch or a renamed workflow file renders as an unhelpful "no status" image, and it is the one thing in this story that is broken _for the audience it exists for_ while looking fine to the person who added it

## Done when

- The badge is in `README.md`, renders logged-out, and links to the workflow's runs
- The workflow's name does not claim more than the chain checks
- One sentence beside the badge states what green certifies and one clause states what it does not
- The required-check question is answered either way and recorded in the ADR
- The pull-request reporting decision is recorded, including the options declined

## Notes

This is the story's only user-visible deliverable. Everything else in the pipeline is infrastructure that succeeds by being unremarkable; the badge is the part a portfolio reader actually sees, and it is also the part most able to overstate what the repository has.
