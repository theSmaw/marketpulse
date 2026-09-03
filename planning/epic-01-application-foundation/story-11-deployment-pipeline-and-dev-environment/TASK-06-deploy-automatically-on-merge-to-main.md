# Task 1.11.6 — Deploy automatically on a merge to `main`, gated on `verify`

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Tasks 1.11.3, 1.11.4

## Objective

Turn the two manual deploys into one automatic consequence of merging, without giving the repository a second definition of what "verified" means.

## Work

- **Decide where the deploy lives: a job in `verify.yml` or a separate workflow keyed on `workflow_run`.** Both have consequences worth stating rather than discovering. A job in `verify.yml` reuses the checkout, the toolchain and — if it is the same job — the build that just ran, and it is one file; but the workflow's name is what the badge reports, so a failed deploy turns the tick red for something the tick's paragraph in `README.md` says it does not certify, and the required status check keys on the **job** name, so a new job is not the required one unless the ruleset is edited. A separate workflow is a second file with its own triggers and its own concurrency group, and it has to be told what to check out. Take one, name the other
- **Nothing here may re-define the build.** The pipeline runs `pnpm verify` by name and defines nothing of its own, which is the whole of Story 1.10's argument and the reason its reversal cost is one file. A deploy step that runs its own `tsc` and its own `vite build` is a second definition of the artefact; a platform that builds from source on its own side is the same problem wearing a different hat. Decide explicitly whether the deployed artefact is the one CI built or a rebuild, and if it is a rebuild, say what makes the two the same — the frontend's three-file fingerprint is already printed into every job summary and is the ready-made comparison
- **A red `verify` must not deploy, and this needs to be seen once.** Say what enforces it: job `needs:`, a `workflow_run` conclusion check, or an `if:`. If the mechanism is a step condition, remember the `continue-on-error` trap Story 1.10 recorded — a step marked that way reports `conclusion: success` however it exited, and the real result is in `outcome`. Never write a deploy gate against a `continue-on-error` step's `conclusion`
- **Push is restricted to `main` and a pull request is verified through its own event**, which is already the trigger shape here. A deploy on `pull_request` would publish an unmerged branch to the development environment; a deploy on `push` to `main` is what the criterion asks for. If preview deployments per pull request are wanted, that is a decision with its own cost — more environments, more origins in an allowlist that takes exactly one — and it should be taken deliberately or declined here
- **Concurrency is not the same question it was for `verify`.** Superseded runs are cancelled everywhere except `main`, deliberately, because a cancelled run leaves a commit on `main` with no verdict. A cancelled _deploy_ is worse than that: two merges in quick succession must not interleave two uploads or two rollouts, so the deploy needs a concurrency group of its own with cancellation off, or the platform's own queueing has to be shown to serialise them
- **Secrets are repository secrets and nothing else.** A platform token never enters the tree and never enters a frontend build — the substitution rule means anything the frontend build can see is downloadable. Record which secrets exist, what they authorise, and how to rotate them; that is another piece of configuration no file here can hold
- **Pin any new action to a commit SHA, and re-count the pins.** There are four today — checkout, setup-node, cache and upload-artifact — and that count has been wrong once, so **count them out of the file** rather than copying this sentence. Every one is bumped by hand, because a SHA does not follow security releases, and Dependabot is declined for now with a fifth action as its stated reversal trigger. A deploy action would be the fifth
- **If a deploy job should gate a merge, it has to be added to the ruleset.** Ruleset `main`, id 22160620, requires a pull request and the `verify` check on the default branch, with admin bypass retained. Nothing in the tree records it and nothing will show its absence. Most likely a deploy should _not_ gate a merge, since it runs after one — say so either way

## Done when

- A merge to `main` deploys both halves with no human action, observed on a real merge
- A red `verify` was seen not to deploy, made to happen rather than reasoned about
- The deployed artefact's provenance is decided and stated: CI's build, or a rebuild with a stated equivalence
- The deploy has its own concurrency behaviour, and two rapid merges were shown not to interleave
- Secrets are named, scoped and rotatable, and none is in the tree
- The action pins are re-counted from the file and any new one is on a SHA
- Whether the deploy participates in the merge gate is recorded either way

## Notes

The rule this task is most likely to break is the one Story 1.10 spent eight tasks protecting: **the pipeline runs `pnpm verify` by name and defines nothing of its own.** A deploy is the first thing that legitimately has to do something the chain does not — the correct shape is a step that consumes what the chain produced, not one that reproduces it.
