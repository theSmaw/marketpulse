# Task 1.10.1 — Choose the provider and prove the toolchain pins on Linux

**Status:** Complete
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** nothing

## Objective

Settle the story's one open decision, and get a workflow that does nothing but `install` running green on a Linux runner — before any verification step exists to confuse a toolchain failure with a code failure.

## Work

- **Take the decision explicitly.** The story lists exactly one open decision — the CI provider — with GitHub Actions as the default assumption, and the prerequisite that made it an assumption is gone: `origin` is `github.com/theSmaw/marketpulse` and Story 1.1 was delivered through pull requests against it. Record it as a decision with the alternative named (a provider-agnostic runner script, or GitLab/Circle), not as a thing that happened by default. The durable half is what the choice costs to reverse, and the answer here is "one YAML file", because the next task makes the pipeline run `pnpm verify` and nothing else
- **This task installs and stops.** No `verify`, no build, no tests. The point is that the first red run in this repository has exactly one possible cause. Four things are under test and all four are Story 1.1 decisions that have never run anywhere but a Mac:
  - **Node comes from `.nvmrc` (24.20.0)**, not from a version literal in the workflow. `engines` plus `engineStrict` makes pnpm refuse a different major rather than warn, so a wrong Node is a hard install failure — which is the good case, and it should be seen once rather than assumed
  - **pnpm comes from `packageManager` via `corepack enable`.** Do **not** add a separate pnpm install step, and do not use an action that installs pnpm for you: the pin is the point, and a workflow that installs pnpm 11.24.0 by hand is a second place the version lives. Note the ordering trap — `actions/setup-node`'s `cache: pnpm` needs pnpm on the PATH **before** setup-node runs, which is the usual reason people reach for a separate install action; this task does no caching at all (Task 1.10.3 owns it), so the ordering question can be answered on its merits there rather than under pressure
  - **`--frozen-lockfile`** is CI's default and is what keeps the platform-binding question honest. Assert it rather than relying on the default being detected: a runner that silently updates the lockfile is a runner testing a different dependency tree from the one in the repository
  - **`allowBuilds` has exactly one entry and it has to run here.** `esbuild@0.28.2` is the only package in the installed tree with an install script, and that script fetches a platform binary — so the Linux runner is the first place it fetches a _different_ binary. If the install-script policy is going to bite, it bites here
- **Rolldown is the specific thing to watch and the story says so.** This repository's first platform-specific native binding resolves `@rolldown/binding-darwin-arm64` locally and `@rolldown/binding-linux-x64-gnu` on the runner, recorded in the lockfile as one of fifteen optional dependencies. It should just work. Confirm it did — read the installed binding by name out of the runner's tree rather than inferring it from a green install — because if the first pipeline failure in this repository's history is an install or a `vite build` that has never failed locally, this is the first place to look and a recorded name saves the search
- **Pin the actions themselves.** `actions/checkout` and `actions/setup-node` are third-party code running with the repository checked out. Decide between a major tag and a commit SHA, say which and why, and note that a SHA pin costs a manual bump. This is the same supply-chain position `allowBuilds` takes one layer down; taking a different one here needs a sentence
- **Record the install figures from the runner, not from the laptop.** Task 1.9.7's clean clone is **398 packages in 3.13 s** with a warm-ish local network. The runner's cold number is the one this story's caching task will be measured against, so take it now, uncached, and take it twice — a single reading of a network-bound install is not a baseline
- **Name the workflow file and the job for what they are.** `.github/workflows/` is a new directory in this repository. Prettier and ESLint do not read YAML, so this file joins the list of things `pnpm verify` does not check — which Task 1.10.7 re-dates and which is worth noticing on the day it becomes true rather than three tasks later

## Done when

- One workflow file exists, runs on a branch push, and is green
- Node came from `.nvmrc` and pnpm from `packageManager`, with no separate pnpm install anywhere in the file
- `--frozen-lockfile` is explicit, and a deliberate lockfile mismatch was seen to fail (make it fail once; a check that has never failed has never been tested)
- The Linux Rolldown binding is confirmed by name from the runner's installed tree
- `esbuild`'s install script ran under the existing `allowBuilds` entry, with no new entry needed
- The cold install time on the runner is recorded, from at least two runs

## Notes

The story's framing is that this pipeline "runs `pnpm verify` and defines nothing of its own". That is exactly right and it is why this task exists separately: everything genuinely new is in the ten lines above `pnpm verify`, and those ten lines are the only part of CI that can be wrong in a way a developer's machine cannot reproduce.
