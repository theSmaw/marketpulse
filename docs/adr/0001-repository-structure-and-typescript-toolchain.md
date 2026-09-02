# ADR 0001 — Repository structure and TypeScript toolchain

**Status:** Accepted
**Date:** 2026-08-30
**Delivered by:** Epic 1, Story 1.1 (Tasks 1.1.1–1.1.8)

## Context

MarketPulse is a React frontend and a Node backend that will share a
substantial domain model — security identifiers, market events, anomaly
scores, investigations, findings, evidence. Those types are the product's
load-bearing abstraction, and the architecture depends on them being enforced
at the boundary rather than agreed by convention.

That is the whole reason this decision came first, before any application
code. A repository layout that makes cross-package type sharing cheap is
almost free to establish on an empty tree and expensive to retrofit onto two
applications that have already grown their own copies of the same types.

Everything below was settled while the repository was trivial, and every
non-obvious claim in it was measured rather than assumed. Where a measurement
contradicted the plan, the plan changed; those cases are called out.

## Decisions

### 1. One repository, `apps/*` + `packages/*`, pnpm workspaces

`apps/frontend`, `apps/backend` and `packages/shared`, in a single repository,
wired together with pnpm workspaces.

pnpm over npm and yarn for two reasons that matter here: installs are faster,
and its strict linking refuses to resolve a package that a `package.json` does
not declare. The second is the real argument — undeclared imports are exactly
the kind of accidental coupling that a shared domain model attracts, and pnpm
turns them into an error at install time instead of a mystery at deploy time.

pnpm is pinned through Corepack's `packageManager` field rather than installed
globally, so every machine and every CI run uses the same pnpm.

**Consequence:** a prerequisite. `corepack enable` is a genuine setup step, and
Node 24.x is required rather than recommended — `engineStrict: true` makes
pnpm refuse to install under another major. Node 23 cannot bootstrap the repo
at all: the Corepack it bundles (0.29.4) carries a stale npm signing keyset and
fails to fetch the pinned pnpm with `Cannot find matching keyid`.

**Consequence:** pnpm's settings live in `pnpm-workspace.yaml`, not `.npmrc`.
pnpm 10 moved them and pnpm 11 silently ignores workspace settings left behind
in `.npmrc` — a failure mode with no error message.

### 2. `packages/shared` exists now, not in Epic 2

The shared package was created while it had one type in it, rather than being
deferred until there was real domain code to put in it.

The point was never the code. It was to prove cross-package imports, build
ordering and typechecking on a tree small enough that getting them wrong costs
an afternoon. Most of the sharp edges recorded in this document surfaced
because of that decision, months before they could have blocked a feature.

### 3. Packages are consumed as project references with built output

`apps/*` reference `packages/shared` as TypeScript project references, and
compile against its emitted `dist/*.d.ts` — not against its raw `.ts` source.

The rejected alternative was exporting source directly and letting each
consumer compile it. That is simpler and needs no build step, but it makes
every consumer responsible for the shared package's compiler settings and
loses the guarantee that what the backend typechecks against is what the
frontend gets. The fallback is recorded here deliberately: this was chosen
against a real alternative, not by default.

**Consequence — the one ordering constraint in the whole toolchain:**
`packages/shared` must be built before anything that imports it can be
typechecked. `tsc -b` handles the ordering itself; nothing else has to know.

### 4. `typecheck` and `build` are the same command

Both are `tsc -b` — at the root and in all three packages. This looks like a
copy-paste error and is not.

Because consumers compile against emitted declarations (decision 3),
typechecking this workspace _is_ building it. There is no cheaper correct pass
available. Both names are kept anyway: `typecheck` is what a developer reaches
for and what CI calls, and the two can diverge later without a rename.

The instrument that looks cheaper — a per-package `tsc --noEmit` fan-out — is
wrong, and precisely wrong in the direction that hurts. Measured in Task 1.1.4:
renaming a shared export left `tsc --noEmit` in `apps/backend` at **exit 0**
against the stale declarations still sitting in `dist/`, while `tsc -b`
correctly failed.

Be exact about the failure mode, because an over-broad version of this claim
was written down first and then disproved in Task 1.1.7: the silent pass needs
a **stale** `dist`, not a missing one. On a tree with no `dist` at all,
`--noEmit` _does_ report the cross-package error. `tsc -b` is right in both
cases, which is why it is the one wired up — and why a fresh checkout cannot
be used to demonstrate the trap.

**Consequence:** the root `tsconfig.json` is a _solution file_ — `files: []`
plus three `references`, compiling nothing itself. It deliberately does not
extend `tsconfig.base.json`: inheriting compiler options would imply it has
sources.

### 5. Most root scripts run their tool once; only `test` and `dev` fan out

| Root script    | Command                      | Why                                                  |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| `build`        | `tsc -b`                     | The reference graph already orders the work          |
| `typecheck`    | `tsc -b`                     | Same command as `build` — decision 4                 |
| `lint`         | `eslint .`                   | One process, one typescript-eslint project service   |
| `format:check` | `prettier --check .`         | Prettier's unit of work is the tree                  |
| `test`         | `pnpm -r run test`           | Genuinely per-package                                |
| `dev`          | `pnpm -r --parallel run dev` | Genuinely per-package, and meant to run concurrently |

`pnpm -r run build` would build `packages/shared` three times, once for each
project that references it. `pnpm -r run lint` would start three ESLint
processes that each construct their own typescript-eslint project service over
the same solution — three times the setup for identical findings.

This is recorded because the fan-out is the thing that looks consistent.
Without this table, adding `pnpm -r` to `build` or `lint` later reads as an
improvement.

The per-package scripts stay, for working on one package. Six verbs — `dev`,
`build`, `test`, `lint`, `typecheck`, `clean` — mean the same thing in every
package. `lint:fix` is an extra rather than part of the convention: a local
convenience with no root fan-out and no place in `verify`.

`verify` is `build && lint && format:check && stories && test`, chained with `&&` so the
first failure is the exit code, and building first so that lint and test see
current declarations.

**Consequence, as recorded when this ADR was written (2026-08-29):** `pnpm test`
and both apps' `pnpm dev` were `echo` placeholders that exited 0, so **a green
`pnpm test` meant "no tests exist", not "tests pass"** — and Story 1.10 was
about to put that green tick in CI where it would look like coverage.

**Amended 2026-09-02, Story 1.9.** That is no longer true and the warning has
been removed from `README.md` and `CLAUDE.md` in the same change. Every
package's `dev` became real in Stories 1.2 and 1.3, and every package's `test`
became real across Tasks 1.9.2, 1.9.3 and 1.9.4 — 103 tests in total. The
record of what was true then is kept above rather than rewritten; what changed
is that the green tick now means precisely what it says, and no more. It is
still not a coverage claim: the backend's process half is unreachable by any
runner in this workspace, and Story 1.10 owns it.

### 6. Shared tooling lives at the workspace root; packages declare only what they import

ESLint, Prettier and TypeScript are devDependencies of the workspace root and
of no package — yet every package's `lint`, `build` and `typecheck` scripts
call `eslint` and `tsc` directly.

That works because pnpm puts the workspace root's `node_modules/.bin` on the
PATH of every workspace package script. Verified in Task 1.1.5 with a
throwaway package declaring nothing, and again in 1.1.7 and 1.1.8 with the
real ones: `pnpm exec tsc --version` reports the pinned 6.0.3 from
`apps/frontend` and `packages/shared`, neither of which declares TypeScript.

The rejected alternative was a pnpm catalog — `"typescript": "catalog:"` in
each package with the version in `pnpm-workspace.yaml`. It keeps packages
self-describing, which is a real benefit, but at the cost of a second
convention sitting alongside the root-only tools. One rule is worth more here
than partial self-description. Do not re-propose it for the next tool; apply
the rule instead.

**The counter-example matters as much as the rule**, because the rule is easy
to over-apply: `@types/node` stays in `apps/backend`. It is a type dependency
of that package's code, not a tool.

### 7. TypeScript is pinned to 6.0.3, below `latest`

npm's `latest` is TypeScript 7.x — the native compiler. This repository stays
on 6.0.3.

`typescript-eslint` does not support TS 7 yet: its peer range is
`>=4.8.4 <6.1.0` as of 8.68.0, and this repository relies on type-aware
linting (decision 8). 6.0.3 is the newest version inside that range and shares
TS 7's semantics.

**This pin has a documented expiry, not an indefinite one:** raise it when
typescript-eslint's peer range admits TS 7. Treat that as a _repeatable
check_, not a fact with a date — re-run `pnpm view typescript-eslint@latest
peerDependencies` rather than trusting this paragraph. Last checked
2026-08-30: still `>=4.8.4 <6.1.0` at typescript-eslint 8.68.0, with
TypeScript `latest` at 7.0.2. The gate has not opened.

**Consequence, and the concrete payoff of decision 6:** the pin lives in the
root `package.json` and nowhere else, so acting on that expiry is a one-line
edit. It was previously in four places, which is the kind of edit that gets
done partially.

One adjacent trap: **`@eslint/js` no longer shares a version line with
`eslint`** — 10.0.1 against eslint's 10.9.1. Pinning the two in lockstep fails
the install outright. It looks like a lockfile typo and is not one.

### 8. Linting is type-aware from the start, in one flat config

One root `eslint.config.mjs`, `strictTypeChecked` + `stylisticTypeChecked`,
using typescript-eslint's project service rather than a hand-maintained list
of `project` paths.

The slower pass is the point. The mistakes this codebase will actually make —
a floating promise in a streaming pipeline, an `any` leaking across the tool
boundary into the domain model — are invisible to syntax-only rules. Adopting
type-aware linting later means fixing them all at once, in code that already
shipped.

**Consequence:** lint reads the same project graph as `tsc`, so it too wants
`packages/shared` built. It does _not_ share typecheck's silent-staleness
failure, though — measured in Task 1.1.5, with `packages/shared/dist` deleted
entirely, lint returned identical findings, and an unresolved cross-package
type surfaces as a `no-unsafe-*` error rather than a false pass. Lint on an
unbuilt tree errs toward noise, which is the safe direction. `verify` still
builds first, so that noise never buries a real finding.

**Consequence — the ESLint `globals` blocks currently change nothing, and are
kept anyway.** The per-package `globals` mirror the tsconfig `types` split, but
`no-undef` — the only rule they feed — is switched off for `.ts` files by
typescript-eslint, because the compiler does that job better. On today's
all-TypeScript tree they are inert: `process` in the frontend is caught by
`tsc`, not by ESLint. They exist for the per-package JS tooling files Stories
1.2 and 1.3 will bring, and adding the split _after_ a config file has been
written against the wrong environment is the expensive order to do it in.
Without this written down the blocks read as either dead config to delete or
working protection to rely on, and they are neither yet.

### 9. Formatting is Prettier's, correctness is ESLint's, and they do not overlap

One root `prettier.config.mjs`, every option explicit — including the ones that
restate a Prettier default, so an upgrade cannot quietly restyle the tree.
`.mjs` rather than `.prettierrc.json` so each option carries its reasoning.

**`eslint-config-prettier` is deliberately not installed.** The usual argument
for it is a conflict surface that was measured here rather than assumed: of
the 138 rules this config enables on a TypeScript file, zero are formatting
rules. The only rule on `eslint-config-prettier`'s list that is enabled is
`no-unexpected-multiline`, which guards hand-written code rather than fighting
Prettier's output. Re-measured in Task 1.1.8 with `eslint --print-config`:
still 138, still only that one. Re-run it rather than trusting this paragraph;
if a genuine conflict ever appears, `eslint-config-prettier` goes **last** in
the flat config array.

Prettier owns the Markdown in `planning/` and `docs/` too, not just code.
Write prose however you like and let `pnpm format` settle it.

**Consequence:** LF is stated in three places and all three must agree —
`endOfLine: "lf"` in the Prettier config, `end_of_line = lf` in
`.editorconfig`, and `* text=auto eol=lf` in `.gitattributes`. `.editorconfig`
binds editors only; git normalises on checkout by its own rules, so
`.gitattributes` is what actually prevents CRLF diffs.

### 10. Strictness settings, and the two that are not just `strict: true`

Every shared compiler option lives in `tsconfig.base.json` and each one
carries a comment explaining why. Beyond `strict`, two are worth an ADR line
because they cost real friction and were chosen for this domain specifically:

- **`noUncheckedIndexedAccess`** — indexing returns `T | undefined`. Much of
  this codebase indexes into arrays of bars, quotes and time-series points,
  where an out-of-range access is a real bug rather than a theoretical one.
- **`exactOptionalPropertyTypes`** — distinguishes "property absent" from
  "property present and undefined". `Evidence` and `Finding` treat a missing
  field and an explicitly unknown one as different states, so the type system
  should too.

`isolatedModules` and `verbatimModuleSyntax` are there because the frontend
will be built by esbuild via Vite, which transpiles file-by-file with no
cross-file type information. They reject the constructs only a whole-program
compiler can resolve, so `tsc` and the bundler cannot disagree about what a
file means.

`tsconfig.base.json` deliberately omits `noUnusedLocals` and
`noUnusedParameters`: `@typescript-eslint/no-unused-vars` owns that, and one
problem should not be reported by two tools with different escape hatches.

### 11. `module: nodenext`, with its two surprising consequences

`nodenext` tracks Node's current ESM/CJS interop rules, including
`require(esm)`, which the pinned Node 24 supports and the fixed `node20`
setting does not model. The trade is that it is a floating target whose
meaning can shift on a TypeScript upgrade; acceptable while every package is
ESM-only, and `node20` is the stable fallback if it starts producing surprises.

Two consequences look like mistakes on first encounter and belong here rather
than in tribal memory:

- Every package needs `"type": "module"`.
- **Relative imports carry `.js` extensions from `.ts` files** — `./ticker.js`,
  importing `./ticker.ts`. `nodenext` resolution requires the _emitted_
  filename and errors with TS2835 without it.

### 12. The apps override exactly four compiler options, and each is load-bearing

`apps/backend` sets `types: ["node"]`. `apps/frontend` sets `types: []` plus
`target`/`lib` including `"dom"`.

**The frontend's empty `types` array is not redundant.** Without it TypeScript
auto-discovers every reachable `@types` package, and pnpm's linking puts
`@types/node` in reach — so `process` would typecheck in browser code. The
empty array is what makes that a compile error.

`@types/node` is pinned to the runtime major (24.x), not npm's `latest`, which
types a Node this project does not run.

### 13. Dependencies do not execute code at install time unless named

pnpm runs a dependency's install scripts only if it is listed in `allowBuilds`
in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard install
failure (exit 1)**, not a warning — verified in Task 1.1.1. The setting
replaces pnpm 10's `onlyBuiltDependencies`, which pnpm 11 still accepts in
config but no longer acts on.

Nothing installed so far has an install script, so `allowBuilds` does not yet
exist in the file. The first dependency to trip it is likely esbuild, arriving
with Vite in Story 1.3, where it will fail CI as readily as it fails locally.

This is a deliberate supply-chain position, recorded here so that the next
person to hit it allowlists the specific package rather than reaching for a
blanket disable. It will present as an obstruction. It is the feature working.

## Consequences worth stating separately

### Root-level tooling walks into anything nested in the repository

`eslint .` and `prettier .` at the root are a cost the per-package scripts did
not have. Task 1.1.7's first `verify` run reported eight errors from a git
worktree under `.claude/worktrees/` — an entire second checkout of this
repository, on another branch, with an unbuilt `dist/`. A `pnpm format` would
have rewritten that branch's files.

`.claude/worktrees/` is now in both `eslint.config.mjs`'s ignores and
`.prettierignore`, and each comments the other. **The two lists must be
changed together.** Anything else that nests a checkout inside the repository
needs the same pair of entries.

A fresh checkout has no worktrees, so this does not reproduce during the
story's own verification. That is exactly why it is written down.

### What a fresh checkout does and does not prove

Verified from a clean clone with an empty pnpm store (Task 1.1.8): `pnpm
install` then `pnpm verify` exits 0 in a few seconds; every command in the
README runs from there; every one of the six verbs exits 0 in all three
packages.

What it does **not** prove is decision 4's staleness trap, which needs a stale
`dist` that a clean clone cannot have. That evidence lives in Tasks 1.1.4 and
1.1.7; do not expect a green fresh checkout to re-demonstrate it.

## Related

- [Story 1.1](../../planning/epic-01-application-foundation/story-01-repository-structure-and-toolchain/STORY.md)
  and its eight task records, which carry the measurements behind each claim
- `PRODUCT_SPEC.md` §39, which asks for these records
