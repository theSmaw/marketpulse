# Task 1.6.4 — The frontend's environment boundary

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.3

## Objective

Draw the line between what the browser may see and what it may not, prove the line holds against the built artefact, and adopt as decisions the two things that are currently true only by default.

## Work

- **Verify what is already solved and do not redo it.** `apps/frontend/tsconfig.json` reads `"types": ["vite/client"]` since Task 1.4.2, so `import.meta.env` typechecks — confirm it and move on. The guarantee that matters is the other half and it was re-measured then: a deliberate `process.env` reference in browser code still fails `TS2591`, because what does the work is the list being **explicit**, not the list being empty. Do not weaken it to make a helper convenient, and do not add the entry a second time
- **Adopt `envPrefix` as a decision.** Vite exposes only `VITE_`-prefixed variables to client code, which pre-solves this story's whitelisting criterion by accident. State it in `vite.config.ts` as a choice with the reason beside it, and write down the two things that defeat it: **widening `envPrefix`**, and **`define`**, which injects whatever it is given with no prefix rule at all. Neither is configured today, and the comment should say that a `define` entry is the way this boundary gets breached without anyone noticing
- **Prove the boundary against the artefact rather than the documentation.** Put a non-prefixed variable and a prefixed one in a `.env`, reference both, build, and grep `dist/assets/*.js` for each value. The prefixed one is present and the non-prefixed one is absent — and the second half is the interesting one. This is the same method Task 1.4.5 used to prove no story string reaches the bundle, and it works for the same reason
- **Decide `envDir`.** `.env` files load from the Vite project root — `apps/frontend/` — not the repository root. `.gitignore`'s patterns are unanchored so the new location is already covered (verified in Task 1.3.4's section), but a developer with a repository-root `.env` will find the frontend silently ignoring it. Either point `envDir` at the root or leave it and document the location; both are defensible and the undocumented version is not
- **Settle the port asymmetry, because this story is the first one at it.** The backend reads `PORT` and `HOST` from the environment; the frontend's 5173 and 4173 are literals in `vite.config.ts` with no override. Story 1.8 was handed the same question and whichever story arrives first owns it. The distinction that makes this tractable is the one the story warns about conflating: `vite.config.ts` runs in **Vite's Node process**, sits outside the frontend's tsconfig `include`, and already has a Node-globals block in `eslint.config.mjs` — so it **can** read `process.env`, while the client code next door cannot. Note `strictPort: true` means an override that moves the port fails loudly rather than drifting, and that Story 1.12's CORS allowlist is pinned to 5173
- **State the build-time-inlining consequence and hand it on rather than solving it.** Frontend configuration is statically substituted at build time, so "distinct configuration per environment" means a rebuild per environment and **one artefact cannot be promoted across environments**. That is the same shape as ADR 0003's finding about `base`. Inventing a runtime mechanism — a config endpoint, an injected script, a fetched JSON — is a deployment decision as much as a configuration one, and Story 1.11 should be the one to want it. If this task declines to build one, say so as a decision with the trigger that would reverse it

## Done when

- The prefixed/non-prefixed grep against the built bundle is recorded with both results, and the probe variables are removed afterwards
- `envPrefix` and `envDir` are explicit in `vite.config.ts` with their reasons, and `define` is named there as the thing that defeats the boundary
- The port asymmetry is either resolved or deliberately left standing, with the reason and the note that Story 1.8 no longer owns the question
- `process` still fails to typecheck in `apps/frontend/src`, re-verified by a deliberate reference that is then removed
- The artefact is still **three files** and its size delta is recorded against Task 1.5.6's 265 modules / 342.08 kB / 9.82 kB
- `pnpm verify` exits 0

## Notes

Nothing in the frontend reads configuration today — no request, no host, no key. This task builds an empty boundary and proves it, which is the right order: the first real variable arrives in Story 1.12 with the backend's URL, and by then the rules should already exist.
