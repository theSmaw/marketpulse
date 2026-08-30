# Task 1.1.5 — ESLint configuration

**Status:** Complete — 2026-08-30
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.4

## Objective

One lint configuration for the whole workspace, with the minimum necessary per-package variation.

## Work

- Install ESLint with TypeScript support and configure it using flat config. Root-level devDependencies need `pnpm add -Dw` — pnpm deliberately refuses a bare `pnpm add` at a workspace root.
- Check `typescript-eslint`'s `typescript` peer range before installing. Task 1.1.2 pinned **TypeScript 6.0.3** precisely because `typescript-eslint@8.68.0` caps at `<6.1.0`; if a newer typescript-eslint has since widened to TS 7, say so and raise the TypeScript pin as a separate change rather than silently mixing the two decisions.
- Leave `noUnusedLocals`/`noUnusedParameters` to ESLint — Task 1.1.2 deliberately omitted them from `tsconfig.base.json` so one problem is not reported by two tools with different escape hatches.
- Define a shared root configuration covering all packages
- Enable type-aware linting, wired to the project references from Task 1.1.4. Prefer typescript-eslint's project service over an explicit list of `tsconfig.json` paths — with references, a hand-maintained list drifts every time a package is added
- Check the branded-type pattern in `packages/shared/src/ticker.ts` survives the chosen rule set. `declare const brand: unique symbol` is referenced only inside a type, which is exactly the shape unused-variable and `no-unused-private-class-members`-style rules get wrong. If a rule flags it, that is a signal to reconsider the rule, not the type — the brand is load-bearing
- Add only the per-package variation genuinely required — browser globals and React rules for the frontend, Node globals for the backend. **This split has to mirror the tsconfig `types` split from Task 1.1.4 exactly**, or the two tools disagree: the frontend sets `types: []` specifically so `process` fails to typecheck there (`TS2591`), and an ESLint config that hands the frontend Node globals would report the same code as clean. Where they disagree, tsc is right
- Add a `lint` script to each package. `packages/shared` already has a **placeholder** — `echo "lint: no linter yet — Task 1.1.5"` — which must be replaced, not appended to. The apps will have the same placeholder from Task 1.1.4
- Add an ignore configuration covering build output and generated files — `dist/` and `*.tsbuildinfo` at minimum. Linting emitted `.d.ts`/`.js` is both slow and noisy, and the tsbuildinfo sits beside each package's tsconfig rather than inside `dist/`

## Done when

- Lint runs across every package and passes on the current tree — but note this is a weak signal on its own. After Task 1.1.4 the tree is `ticker.ts` plus two placeholder `index.ts` files, so a rule set can pass by never firing. Pair it with the deliberate-violation check below rather than treating a green run as evidence
- Type-aware rules work (verified by a deliberate violation that gets caught, then removed)
- A rule set is chosen deliberately, not copied wholesale without review
- Lint is fast enough to run before every commit without being irritating

## Notes

Type-aware linting is slower but catches the class of mistake this project cares about — floating promises in the streaming and agent code, and unsafe `any` propagation across the tool boundary. Worth enabling now while the tree is small enough to tune.

## Outcome

One flat config at the repository root — `eslint.config.mjs` — covering all
three packages, with type-aware linting on from the start. Each package's `lint`
placeholder is replaced by `eslint .`, and `lint:fix` added beside it.

### The TypeScript pin holds

Checked before installing, as the task required: `typescript-eslint@8.68.0` is
still `latest` and its `typescript` peer range is still `>=4.8.4 <6.1.0`. It has
not widened to TS 7, so the 6.0.3 pin from Task 1.1.2 stays and no separate
change is needed. **This is the check to repeat, not the conclusion to cache.**

ESLint is at 10.9.1, inside typescript-eslint's `^10.0.0` peer range. One
surprise worth recording: `@eslint/js` no longer shares a version line with
`eslint` — its latest is **10.0.1** against eslint's 10.9.1, so `@eslint/js@10.9.1`
does not exist. Pinning them in lockstep fails the install.

### ESLint is installed once, not per package

`eslint`, `@eslint/js`, `typescript-eslint` and `globals` are root-only
devDependencies. A package's `lint` script still finds the binary, because pnpm
puts the workspace root's `node_modules/.bin` on the PATH of every workspace
package script — verified directly (`command -v eslint` from
`packages/shared` resolves to the root `.bin`). Flat config is located by
searching upward from the working directory, so `eslint .` inside a package
finds the root config, and its `files` globs resolve relative to the config's
own directory rather than the cwd.

That matters beyond tidiness. It means the four-place dependency duplication
recorded against Task 1.1.7 for `typescript` was **not** repeated here — and on
review it disproves that item's stated reasoning. Task 1.1.7 asserted each
package genuinely needs its own `typescript` because pnpm's strict linking puts
`tsc` on a package's path only if it depends on it. Tested directly with a
throwaway workspace package declaring no `typescript` at all: `tsc` resolved
from the root `.bin` at 6.0.3. The premise is false, so root-only is a live
option there alongside a catalog. Not changed here — that is 1.1.7's call, and
its bullet has been rewritten to present both.

### The rule set, and why

`js.configs.recommended`, then typescript-eslint's `strictTypeChecked` and
`stylisticTypeChecked` on `**/*.ts`. Chosen rather than copied: the strict tier
earns its place because the two failure classes this codebase is heading for —
floating promises in streaming/agent pipelines, and `any` propagating across the
tool boundary into the domain model — are precisely what it catches, and both
were confirmed against a deliberate violation:

- `no-floating-promises` — caught an unawaited call.
- `no-unsafe-return`, `no-unsafe-member-access`, `no-explicit-any` — caught an
  `any` being dereferenced and returned.

Nothing needed disabling to make the tree pass. In particular the **branded-type
pattern survives untouched**: `declare const brand: unique symbol` in
`packages/shared/src/ticker.ts`, referenced only inside a type, is not flagged.
That was the shape most likely to force a bad trade, and it did not.

The project service (`projectService: true`) is used rather than an explicit
`project` list, so adding a package does not require editing the lint config.

### The unused-vars handoff is intact

Task 1.1.2 deliberately left `noUnusedLocals`/`noUnusedParameters` out of
`tsconfig.base.json` so ESLint would own that check. Verified that the promise is
actually kept: `@typescript-eslint/no-unused-vars` catches both an unused local
and an unused parameter. Nothing falls between the two tools.

### The globals split is correct but currently inert — say so

The per-package globals mirror the tsconfig `types` split exactly (backend Node,
frontend browser, `packages/shared` neither — it is consumed by both, so any
platform global reachable there is a bug in waiting).

But it changes no result on today's tree, and the config says so rather than
implying otherwise. `no-undef` — the rule globals feed — is switched **off** for
TypeScript files by typescript-eslint, because the compiler does it better;
confirmed with `--print-config` (`no-undef: [0]` for `.ts`, `[2]` for `.mjs`).
So a frontend file using `process` is rejected by tsc (`TS2591`) and by the
type-aware rules ("Unsafe member access `.env` on a type that cannot be
resolved") — never by `no-undef`. Both tools agree, via different routes.

The split is kept because `no-undef` _is_ live for plain JS, and per-package JS
tooling files are coming. Adding the split after a config file has been written
against the wrong environment is the expensive ordering.

### Verified

- `eslint .` from each of the three packages: exit 0, and correctly **scoped** —
  an `any` planted in `apps/backend/src` fails the backend's lint while the
  frontend's and shared's still pass. A green run alone was treated as weak
  evidence throughout, exactly as the Done-when warns.
- Five files linted (`packages/shared/src/{index,ticker}.ts`,
  `apps/{backend,frontend}/src/index.ts`, `eslint.config.mjs`); `dist/` present
  at the time and contributing **zero** linted files.
- Full pass after `clean`: build, typecheck and lint green across all three
  packages, with no probe files left behind.
- Warm run over the workspace: **~0.85 s** wall. Comfortably pre-commit speed,
  and worth re-measuring once real source exists.

### Left for Task 1.1.7

No root-level `lint` script. Root script orchestration is 1.1.7's, and adding a
half of it here is how the two drift. `lint` and `lint:fix` are consistent across
all three packages, so the fan-out is straightforward when it lands.
