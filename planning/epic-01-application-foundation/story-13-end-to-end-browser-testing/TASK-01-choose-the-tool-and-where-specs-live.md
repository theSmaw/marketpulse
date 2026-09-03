# Task 1.13.1 — Choose the browser tool and decide where the specs live

**Status:** Not started
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** nothing in this story

## Objective

Choose between Playwright and Cypress on measurement, and answer the question this workspace has never had to answer: where does a TypeScript file live when it belongs to no application package? Install nothing permanent and write no test.

## Work

- **Spike both, and measure the same four things Story 1.9 measured** so the numbers are comparable: **store entries** (not pnpm's `+N -1` install summary, which counts links — this repository quotes the virtual-store count), `node_modules` size, lockfile lines, and whether `pnpm-workspace.yaml` is byte-unchanged afterwards. Revert each spike before starting the next
- **Expect `allowBuilds` to fire and record exactly how.** `esbuild` has been its only entry since Task 1.4.5 and this is the second time the policy will have fired in the shipping tree. An un-allowlisted install script **fails the install outright** at exit 1, and **pnpm rewrites `pnpm-workspace.yaml` when it does**, appending a stub that is itself invalid until edited — so a tracked file changing under you is part of the failure mode. Allowlist the specific package; never disable the check
- **Measure the browser binaries separately from the packages**, because they are the real cost and they do not live in `node_modules`: where they are downloaded, how large, how many, and whether the download can be scoped to one engine. That number is what Task 1.13.4 has to cache or re-download on every CI run
- **Decide where the specs live, and treat it as the harder half of this task.** A `.ts` file outside a package's tsconfig `include` is a hard `was not found by the project service` parse error in ESLint, not a silent skip — which is why Story 1.9's tests live in `src/`. The candidates are a **fourth workspace package** (which needs a `pnpm-workspace.yaml` glob, since `apps/*` and `packages/*` match neither an `e2e/` nor a `tests/` at the root), or a root-level directory with its own tsconfig wired into the solution file. Build enough of the chosen one to prove ESLint and Prettier both read it
- **Work out what a fourth package silently joins before creating one.** Root `test`, `dev` and `coverage` are `pnpm -r` fan-outs, so a package with a `test` script joins the fast suite — which must not become conditional on a build or able to bind a port, the exact argument that gave `test:process` its own command. Root `build` hardcodes package names twice and needs reading. Decide which of the six verbs this package genuinely owes and say why the others are absent
- **Name the command now, and check it against `pnpm help -a` before claiming it.** `clean`, `env`, `config`, `start` and `test` are all real pnpm built-ins; `clean` is the one that bites, because the built-in deletes `node_modules` from every project and only a root script shadows it. `coverage`, `ready`, `image` and `stories` were each checked this way before being used
- **While each spike has a browser open, read `document.visibilityState` in it — one line, and it decides whether two later tasks are writable (2026-09-04).** Task 1.12.3 shipped a poll that **stops entirely while the tab is hidden** and resumes on `visibilitychange`, so a driven browser reporting `hidden` makes a page that loads perfectly and then never calls the backend again — and Tasks 1.13.3 and 1.13.5 both wait on that poll. This repository has an existing recorded observation that an **automated tab reports `hidden` and throttles React's scheduler**, which is why every component timing here is measured hidden against hidden; whether that transfers to a headless runner is **unknown and must not be assumed in either direction**. Record what each candidate actually reports, and if one is hidden, record whether the tool can make it visible — that is a capability difference worth weighing in the choice, not a detail to discover in Task 1.13.5 against a deployed environment
- **State the decision against the alternative rather than for the winner.** Cypress and Playwright differ in more than ergonomics — the runner model, what a spec can reach, how many browsers are real rather than nominal, how a failure is reproduced afterwards, and whether the tool wants its own TypeScript configuration. Record what the loser was better at; ADR 0013 needs it

## Done when

- One tool is chosen, with both spikes' figures recorded side by side and the rejected tool's advantages stated
- The specs' home is decided, with ESLint and Prettier proven to read a file there rather than assumed to
- The `pnpm -r` fan-out consequences of that home are worked out and written down
- The command's name is checked against `pnpm help -a`
- `document.visibilityState` has been read in each candidate's browser and the reading recorded, along with whether the tool can change it
- The tree is back to where it started — nothing installed, `pnpm-workspace.yaml` byte-unchanged, `pnpm verify` passing

## Approach note

This is Task 1.10.1's shape and Task 1.11.1's: choose, prove the toolchain, and stop. The reason is the same one both of those gave — when the first browser test in this repository's history fails, it should have one possible cause.
