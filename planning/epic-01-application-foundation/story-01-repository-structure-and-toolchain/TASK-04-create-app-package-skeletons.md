# Task 1.1.4 — Create the app package skeletons

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.3

## Objective

Create `apps/backend` and `apps/frontend` as minimal typed packages that consume the shared package. Placeholders only — the real server and React application are Stories 1.2 and 1.3.

## Work

* Create both packages with private `package.json` files
* Extend `tsconfig.base.json` in each, adding a project reference to `packages/shared`
* Apply package-appropriate overrides — Node types and module resolution for the backend, DOM library for the frontend
* Add a minimal `src/index.ts` to each that imports a type from `@marketpulse/shared`, proving the dependency resolves
* Declare the dependency using pnpm's `workspace:` protocol

## Done when

* Both packages typecheck, including the cross-package import
* `pnpm install` links the workspace dependency without network resolution
* Changing a type in `packages/shared` produces a type error in a consuming app when it should
* Neither package contains framework code yet

## Notes

That last check is the point of this task: it verifies the wiring end to end, which is exactly what silently breaks later if never tested while trivial.
