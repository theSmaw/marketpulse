# Task 1.13.2 — Install it, and make exactly one journey real against a local pair

**Status:** Not started
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.1

## Objective

Install the chosen tool for real, get one journey passing against a running pair, and — the half that is easy to skip — see it fail for the right reason.

## Work

- Install it where Task 1.13.1 decided, add the `allowBuilds` entry it predicted, and confirm the sweep of the installed tree for `preinstall`/`install`/`postinstall` scripts returns what you expect and nothing else. `esbuild@0.28.2` was the only one for eight stories; say what it is now
- **Reuse `scripts/check-ready.mjs`'s address resolution rather than writing port literals.** It reads the backend's `PORT`/`HOST` from the **built** `dist/config.js` and dials the frontend at the origin `CORS_ORIGIN` names, which is what stops a moved port or a changed allowlist producing a suite that runs against half a system. A harness with its own copy of `5173` has forked the pair's definition on day one
- **Decide what the suite runs against, and it is a real decision with three candidates.** The dev server (fast, but it does not typecheck and it never 404s, so deep-linking is unassertable there); `vite preview` (also never 404s — its SPA fallback answers any unmatched path with `index.html` and a 200, `/assets/nope.js` included); or the built artefact on a dumb static host, which 404s both and is the only one that behaves like production. The third is the only one that can answer Story 1.5's criteria, and it costs a build
- **Decide how the servers get started and torn down**, and prefer the tool's own mechanism over a second supervisor. Two traps from Story 1.8, both measured: a busy 5173 exits 1 and takes everything down, while a busy 3000 leaves the pair **running and looking healthy with nothing exiting non-zero** — a harness that does not treat the second as a failure will run a whole suite against a frontend with no backend. And freeing a port is not enough to recover a `node --watch` loop; it waits for a file change, not for the port
- **Write one journey and no more.** Load the landing route, assert the chrome and the four named region landmarks are there. Assert on roles and accessible names, as every component test here does
- **Make it fail, and make it fail for the right reason.** A check that has never failed is a check that has never been tested — the same argument `pnpm stories` was held to. Move something, watch the failure name what it is, put it back. Confirm the exit code is non-zero and that it propagates through whatever wraps it, because this repository's exit-code propagation has been verified at every layer it has added and this is a new one
- **Record what a failure leaves behind and what it costs.** Screenshots, video, a trace — whether they are on by default, where they land, how large, and whether they are gitignored. They will need a `.gitignore`, `.prettierignore` and `eslint.config.mjs` ignores entry the way `coverage/` did, and a `git status` after a run is how you find out rather than reasoning about it
- **Take the timing figures as a baseline, and label them.** Cold run, warm run, and how much of it is browser startup rather than the assertions — the same split `test:process` needed, where 5 of its 7.6 s is a shutdown ceiling elapsing in wall-clock time and no faster machine can shorten it

## Done when

- One journey passes against a running pair, from a documented command
- The same journey has been seen to fail, naming the cause, at a non-zero exit code
- Nothing the run produces is untracked after it — verified with `git status`, not assumed
- `pnpm test` is unchanged in what it runs and how long it takes, and `pnpm verify` passes

## Approach note

The instruction to write one journey rather than five is the whole point of the task. Everything expensive about a browser suite — how servers start, what it runs against, what a failure leaves behind, how long it takes — is decided by the first test and inherited silently by every one after it. Getting those wrong once and finding out at the fifth spec is the failure this ordering exists to prevent.
