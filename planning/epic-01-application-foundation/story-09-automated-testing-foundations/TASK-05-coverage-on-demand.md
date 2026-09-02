# Task 1.9.5 — Coverage reporting on demand

**Status:** Not started
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** Tasks 1.9.3, 1.9.4

## Objective

Make coverage available as one command, across all three packages, and decide what it is allowed to mean — before Story 1.10 puts a number on a pull request.

## Work

- **"On demand" is the criterion's wording and it is a constraint, not a hedge.** Coverage does not run in `pnpm test` and it does not become a seventh `verify` step: `verify` is the acceptance command and adding an instrumentation pass to it costs every developer and every CI run for a number nobody is gating on yet. One extra root script, in the shape the other seven already have
- **Name it against pnpm's built-ins before claiming it.** `clean`, `env`, `config`, `start` and `test` are all real pnpm 11 commands and a root script shadows a built-in repository-wide — which was right for `clean`, whose built-in deletes `node_modules`, and wrong for two useful commands. Check `pnpm help -a` rather than assuming, as Task 1.8.4 did for `ready`
- **Decide whether coverage fans out or runs once.** Only `test` and `dev` use `pnpm -r` today, and everything else runs its tool once from the root because the reference graph or the project service already covers the workspace in one pass. Three packages with possibly two environments is the case where a fan-out may genuinely be right — and a fan-out produces three reports that then have to be merged or read separately. Say which, and say what a reader does with the output
- **Check the provider's install cost.** With Vitest chosen in Task 1.9.1 this is a concrete choice between `@vitest/coverage-v8` and `@vitest/coverage-istanbul`, neither of which ships with the runner — so it is a real install to measure and an `allowBuilds` check to run, not a flag. The two differ in accuracy and in what they do with transformed sources. Under `nodenext` with a transform step in the middle, source maps are the thing that goes wrong: confirm the report points at `.ts` lines and not at generated output, on a real file, before recording the number
- **Emit into `coverage/` and nowhere else.** That path is already in `.gitignore`, `.prettierignore` and `eslint.config.mjs`'s ignores; anywhere else means adding three entries, and the third is the one that gets forgotten and shows up as lint findings in generated HTML
- **Record the first numbers, and record what they exclude.** Take the figure per package. Then say plainly what is _not_ in it: the backend's whole process half — signals, exit codes, the shutdown ceiling, both crash handlers — which injection cannot reach at all; `scripts/*.mjs`, which no test imports; and `apps/backend/scripts/dev.sh`, which is read by no tool in the workspace at all. A coverage percentage that silently omits the parts with no runner is exactly the "green tick that means nothing" this story exists to remove
- **Do not set a threshold.** A minimum on a tree with nine components, one route, one config module and no state is a number invented before there is anything to hold it to, and it will be met by testing what is easy. If Story 1.10 wants a gate, it can set one against a measured baseline this task provides. Say so explicitly rather than leaving the absence to be read as an oversight
- **Configure the exclusions honestly.** Stories files, `main.tsx`, config files and type-only modules are the usual candidates. Every exclusion inflates the number, so each one needs a reason in the config beside it, the way `tsconfig.base.json` comments every option

## Done when

- One documented root command produces coverage for all three packages, and it is not part of `test` or `verify`
- The command name is checked against pnpm's built-ins
- The report points at TypeScript sources, verified on a real file rather than assumed
- Output lands in `coverage/` and nothing new needed a `.gitignore` entry
- The first per-package figures are recorded, together with what they structurally exclude
- No threshold is set, and the write-up says why and who could set one

## Notes

This repository's habit is to record a measurement and its method, not a target. The coverage number's only job in this story is to be honest about what is untested — which currently includes an entire half of the backend that no runner in the workspace can reach.
