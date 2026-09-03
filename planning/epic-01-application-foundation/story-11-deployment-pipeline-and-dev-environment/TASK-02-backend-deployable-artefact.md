# Task 1.11.2 — Produce the backend's deployable artefact and run it outside the workspace

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.1

## Objective

Turn `apps/backend` into a thing that starts, serves and stops correctly somewhere that is not this workspace — locally, in exactly the shape the chosen platform will run it — before any platform is involved in the failure.

## Work

- **`pnpm deploy --filter @marketpulse/backend` is the named mechanism and it should be run rather than cited.** Story 1.2 measured why it exists: `dist/` copied on its own dies at import time on `fastify`, and then, once `node_modules` is reachable, on the health route's read of `../../package.json` one directory above `dist/` — both `ERR_MODULE_NOT_FOUND` before `listen`, and **the first error hides the second**, so fixing the obvious half does not produce a working artefact. The package directory works. Confirm the deploy output has that shape
- **Read what actually shipped rather than assuming.** Two things are new since anyone last looked at that directory. `tsc -b` now emits a compiled copy of every test file — **12 files for 3 test files in `apps/backend`** — so check whether they are in the artefact and decide whether that matters (they are inert and unreachable through the `exports` map, so this is a size and tidiness question, not a correctness one). And `@marketpulse/shared` must arrive as **real files rather than a workspace symlink**; nothing in the emitted tree imports it today, so a broken copy would be **latent** and would surface in Story 1.12 as a deployed application failing on an import that works everywhere else. Check it now, when it is cheap
- **Choose the start command deliberately.** `node dist/index.js` and `pnpm start` both work: Story 1.2 measured `pnpm run` forwarding `SIGTERM`, waiting for the child (3.002 s against a 3 s stand-in) and propagating the exit code, so the wrapper is signal-transparent and the choice is a preference rather than a bug avoided. It still adds a package manager and a resolution step to a runtime image for no benefit once the artefact is built. Record which and why
- **The working directory is load-bearing and is easy to get wrong once.** `/health` reads `../../package.json` relative to the module, so the manifest has to be one directory above `dist/` in whatever the platform unpacks. Prove it by requesting `/health` from the artefact and reading the `version` back
- **If this runs as a container, PID 1 is the open question Story 1.2 could not close.** Signal handling was proved against a process started directly, which says nothing about a container delivering `SIGTERM` to PID 1: a shell-form `CMD`, or a wrapper script that does not `exec`, swallows it, and **the symptom is a ten-second pause and a `SIGKILL` rather than an error** — a clean-looking deploy with a shutdown that never runs. Send `SIGTERM` to the running container and require exit 0 with the `shutdown complete` record present
- **Pin the runtime Node the way the toolchain is pinned, and notice that the usual guard is absent here.** `.nvmrc` is 24.20.0 and `engineStrict` makes a wrong major a hard **install** failure — but a runtime image runs no install, so a mismatched runtime major is silent. Say how the image's Node version is tied to `.nvmrc` rather than typed twice
- **Compare the shutdown ceiling against the orchestrator's kill timeout, which is the comparison this story owns.** `SHUTDOWN_TIMEOUT_MS` is 5 s, chosen to sit inside Docker's 10 s stop grace and Kubernetes' 30 s `terminationGracePeriodSeconds`. Whatever the chosen platform's grace period is, record it beside the ceiling and confirm the ceiling is the smaller number. Both ends are already exercised by `pnpm test:process`: a drain finishing inside the ceiling exits 0, one exceeding it exits 1 with a level-50 `shutdown timed out, forcing exit`
- **Record the artefact's size and contents**, so a later change that doubles it is visible. This is the backend's equivalent of the frontend fingerprint the pipeline already prints
- **`HOST` exists so a container can bind `0.0.0.0`, and the log will not tell you whether it did.** Fastify rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, confirmed twice with `lsof`. Check the socket. Setting the value is Task 1.11.3's job; proving the artefact honours it is this one's

## Done when

- The artefact produced by `pnpm deploy --filter` starts, serves `/health` with the right `version`, and exits 0 on `SIGTERM`, from outside the workspace
- What `pnpm deploy` did with the compiled test files and with `@marketpulse/shared` is recorded from the output, not assumed
- The start command is chosen with the alternative named
- If containerised: `SIGTERM` to the container produces a clean drain and exit 0, and the `CMD` form that would have swallowed it is named
- The runtime Node major is tied to `.nvmrc` by a stated mechanism
- The platform's kill timeout is recorded beside the 5 s ceiling, with the ceiling the smaller of the two
- Binding `0.0.0.0` is confirmed at the socket rather than from the startup line

## Notes

Everything here is reproducible locally, which is the reason it is a separate task: a deployment that fails on a platform because the artefact was never correct is the most expensive kind of failure to read, because the platform's logs describe its own machinery rather than yours.
