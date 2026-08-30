# Story 1.9 — Automated Testing Foundations

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** unit/integration test foundations

## Description

Establish the testing stack and the conventions later epics follow. PRODUCT_SPEC.md §40 lists "testing non-deterministic systems" as something an interviewer should find a credible answer to, so the foundation needs to be deliberate rather than incidental.

## What Story 1.1 already decided for this story

- **The `test` verb exists and is wired; this story makes it real.** All three packages have a `test` script that is an `echo` placeholder exiting 0, root `test` is `pnpm -r run test` — one of only two root scripts that deliberately fan out — and `verify` already runs it last. So this story replaces three placeholders. It does not introduce a script name or a root wiring, and it should not invent a second command that means "run the tests"
- **A green `pnpm test` currently means "no tests exist".** Story 1.10 will put that tick in CI. Removing that ambiguity is this story's real deliverable, not a side effect
- **The runner is a tool, so it is declared at the workspace root** — same rule as ESLint, Prettier and TypeScript, settled in Task 1.1.7: shared tooling lives at the root; packages declare only what they actually import. pnpm puts the root's `node_modules/.bin` on every package script's PATH, so `vitest run` resolves from a package directory without that package declaring it. The counter-example still applies — anything a test _imports_ (a DOM environment package, a matcher library) is a dependency of that package's code and belongs in that package
- **The runner has to survive the module setup**, and this is the constraint most likely to bite: `module: nodenext`, `"type": "module"` in every package, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. A runner that assumes CommonJS, or that resolves `./foo.js` differently from Node, will fight all of it. Check this before choosing, not after writing the first test
- **`packages/shared` is consumed as built output**, so a test in either app that touches shared types is testing `dist/*.d.ts`. `verify` builds first; a bare `pnpm test` after editing shared does not. Decide deliberately whether the runner resolves shared through its `exports` (built, correct, needs a build) or through a source alias (fast, and quietly diverges from what ships)
- `coverage/` is already in `.gitignore`, `.prettierignore` and `eslint.config.mjs`'s ignores. Emitting coverage anywhere else means adding it to all three

## Acceptance criteria

- Unit test runner configured for **all three** packages — `apps/backend`, `apps/frontend` and `packages/shared` — running from the repository root. The original wording said "both packages" and predates `packages/shared`
- Backend integration tests exercise the real HTTP layer, including `/health`
- Frontend component tests render through the real component tree
- Example tests of each kind exist and pass
- Running a single test file, and a single test by name, is documented
- Coverage reporting is available on demand
- Test conventions documented — naming, location, what belongs at each level

## Notes

The commands established here go into `CLAUDE.md`'s Commands section and `README.md`'s command table — both of which now exist and are current, so this is an edit rather than a fill-in. The note here used to say the Commands section was a placeholder; Task 1.1.7 wrote it and Task 1.1.8 verified every command in it from a clean clone.

One item in it is explicitly outstanding and named as this story's to close: **how to run a single test file, and a single test by name.** `CLAUDE.md` says so at the end of its Commands section. It is also an acceptance criterion above.

Both files carry the "a green `pnpm test` means no tests exist" warning, as does ADR 0001 §5. When this story lands, all three sentences become false and must be removed in the same change — leaving a stale warning is as misleading as the thing it was warning about.
