# Task 1.9.1 — Choose the test runner

**Status:** Not started
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** nothing

## Objective

Pick the runner, on this workspace's constraints rather than on popularity, and write down what it was measured against. Nothing ships from this task except a decision and the evidence behind it — the same shape as Task 1.4.1, which chose a component library and installed nothing.

## Work

- **Test the module setup first, not last.** The story says this is the constraint most likely to bite and it is the one that disqualifies candidates: `"type": "module"` in all three packages, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. A runner that resolves `./foo.js` differently from Node, or that assumes CommonJS anywhere in its transform pipeline, fights all of it. Write one throwaway test importing `./something.js` from a `.ts` file in a scratch tree and see what each candidate does with it — this is a five-minute measurement and it is the whole decision for at least one candidate
- **Measure at least three, and name them.** `vitest`, Node's built-in `node:test` with `--experimental-strip-types` (or `tsx`), and one of `jest` / `bun test` as the control. The comparison table should carry: does it need a transform step at all; does it honour `nodenext` extension resolution; what does it cost in packages and install size; does it trip `allowBuilds`; and can one runner serve all three packages or does the frontend need a second
- **Vite being here is an argument, and it is not the same argument as "Vitest is already downloaded".** State them separately. The real one is that Vitest reuses `vite.config.ts`, so the resolver that builds the frontend is the resolver that runs its tests — which matters more than usual because ADR 0003 records that `tsc` and Rolldown reach the `.js`-extension convention by **different routes** and disagree on the negative case. A third resolver is a third opinion about what `./App.js` means. The weak one is that `@vitest/expect`, `@vitest/spy`, `@testing-library/dom`, `@testing-library/jest-dom` and `@testing-library/user-event` are already in the lockfile as Storybook 10 transitives — cheap, and the story says explicitly that "it is already downloaded" is the weakest criterion available
- **Decide how the runner resolves `@marketpulse/shared`, and treat it as a decision rather than a default.** Two options with different failure modes: through the package's `exports` (built output — correct, matches what ships, and needs a build before a bare `pnpm test`), or through a source alias (fast, no build ordering, and quietly diverges from the artefact). `verify` builds first either way; a developer running `pnpm test` after editing shared does not. Whichever is chosen, say what the other one's symptom looks like
- **Check `allowBuilds` before installing anything.** `esbuild` is currently the only entry and the only package in the tree with an install script. A candidate that adds a second is not disqualified, but the policy fails the install outright and pnpm rewrites `pnpm-workspace.yaml` when it fires — know that before it happens rather than during
- **Note what each candidate does about the two things this story cannot test by injection.** The backend's process half (signals, exit codes, the 5-second shutdown ceiling, the second-signal path) needs a real child process against a **built** tree; the frontend needs a DOM environment that is a _package_ dependency under ADR 0001 §6. Neither settles the choice; both are cheaper under some candidates than others
- **Look at what a decision for Vitest would make available, and do not treat availability as a reason.** `@storybook/addon-vitest` would turn the five components' existing stories into smoke tests and give the a11y addon a way to fail rather than report. That is Task 1.9.4's to adopt or reject; this task only needs to record whether the runner choice forecloses it
- **Do not install the winner into the workspace here.** Spike in a scratch tree or a worktree and throw it away. Task 1.9.2 is where it lands, so the install and its cost are attributable to the task that made it

## Done when

- One runner is chosen, and the write-up names the alternatives it beat and why — package count, install size, resolver behaviour under `nodenext`, and the `.js`-extension result specifically
- The `@marketpulse/shared` resolution question is answered, with the rejected option's failure mode written down
- Whether one runner covers all three packages is answered rather than assumed
- The workspace is unchanged — no dependency added, no config file, no script edited
- `pnpm verify` still exits 0, trivially, because nothing moved

## Notes

Two of this repository's decisions went the other way after a spike — Story 1.6 built full Zod and Valibot implementations before throwing both away, and Task 1.7.6 built `react-error-boundary` before rejecting it on +932 B. Building the losing option is normal here and is what makes the recorded cost real. Task 1.8.3's inversion is the one to keep in mind: the finding that settled it was not the argument the task was written around.
