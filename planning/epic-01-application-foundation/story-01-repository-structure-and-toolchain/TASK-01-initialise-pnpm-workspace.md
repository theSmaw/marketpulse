# Task 1.1.1 — Initialise the pnpm workspace root

**Status:** Complete — 2026-08-29
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** nothing

## Objective

Create the workspace root so `pnpm install` succeeds from a clean checkout, before any package exists inside it.

## Work

* Pin the Node version (`.nvmrc` or equivalent) and record it in `engines`
* Enable Corepack so the pnpm version is pinned by the repository rather than by whatever is installed globally — set `packageManager` in the root `package.json`
* Create the root `package.json` as private, with no dependencies yet
* Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
* Add `.npmrc` if any non-default resolution behaviour is wanted

## Done when

* `pnpm install` completes at the root with no packages present
* The pnpm version is pinned by the repo and does not depend on a global install
* The root package is private and cannot be published by accident
* `pnpm-lock.yaml` is committed

## Notes

Pinning both Node and pnpm matters here — Task 1.1.8 verifies a clean checkout, and Story 1.10 runs the same install in CI. Version drift between the two is a common source of "works locally" failures.

## Outcome

Files created: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `pnpm-lock.yaml`.

* **Node 24.20.0** — current active LTS at time of writing. Recorded in `.nvmrc` and as `engines.node: ">=24.20.0 <25"`.
* **pnpm 11.24.0** — pinned by `packageManager` with its sha512 integrity hash, written by `corepack use`. Verified that `pnpm --version` inside the repo resolves to 11.24.0 while a different pnpm is installed globally, so the pin is genuinely load-bearing.
* **No `.npmrc`.** pnpm 10+ moved workspace settings out of `.npmrc` and into `pnpm-workspace.yaml`; `engine-strict` in `.npmrc` is silently ignored by pnpm 11. Settings that need to apply to the workspace belong in `pnpm-workspace.yaml`.
* **`engineStrict: true`** set in `pnpm-workspace.yaml`. Without it `engines.node` only produces a warning, which makes the pin decorative. Confirmed it hard-fails on a mismatched Node major. It also enforces dependency `engines` declarations, which can occasionally require an override once real dependencies arrive — the escape hatch is to drop the setting, not to weaken the Node pin.

### Prerequisite this surfaced

Node 23.x cannot bootstrap this repository. The Corepack bundled with Node 23.2.0 (0.29.4) carries a stale npm signing keyset and fails to install any recent pnpm with `Cannot find matching keyid`. Node 24.20.0 ships Corepack 0.35.0, which works. Node 23 is also end-of-life. This is the prerequisite Task 1.1.8 must document:

```
node -v            # must be 24.x
corepack enable    # once per machine
pnpm install
```
