# Task 1.11.2 — Produce the backend's deployable artefact and run it outside the workspace

**Status:** Complete (2026-09-03)
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.1

## Objective

Turn `apps/backend` into a thing that starts, serves and stops correctly somewhere that is not this workspace — locally, in exactly the shape the chosen platform will run it — before any platform is involved in the failure.

## Work

- **`pnpm deploy --filter @marketpulse/backend` is the named mechanism and it should be run rather than cited.** Story 1.2 measured why it exists: `dist/` copied on its own dies at import time on `fastify`, and then, once `node_modules` is reachable, on the health route's read of `../../package.json` one directory above `dist/` — both `ERR_MODULE_NOT_FOUND` before `listen`, and **the first error hides the second**, so fixing the obvious half does not produce a working artefact. The package directory works. Confirm the deploy output has that shape
- **Read what actually shipped rather than assuming.** Two things are new since anyone last looked at that directory. `tsc -b` now emits a compiled copy of every test file — **12 files for 3 test files in `apps/backend`** — so check whether they are in the artefact and decide whether that matters (they are inert and unreachable through the `exports` map, so this is a size and tidiness question, not a correctness one). And `@marketpulse/shared` must arrive as **real files rather than a workspace symlink**; nothing in the emitted tree imports it today, so a broken copy would be **latent** and would surface in Story 1.12 as a deployed application failing on an import that works everywhere else. Check it now, when it is cheap
- **Choose the start command deliberately.** `node dist/index.js` and `pnpm start` both work: Story 1.2 measured `pnpm run` forwarding `SIGTERM`, waiting for the child (3.002 s against a 3 s stand-in) and propagating the exit code, so the wrapper is signal-transparent and the choice is a preference rather than a bug avoided. It still adds a package manager and a resolution step to a runtime image for no benefit once the artefact is built. Record which and why
- **The working directory is load-bearing and is easy to get wrong once.** `/health` reads `../../package.json` relative to the module, so the manifest has to be one directory above `dist/` in whatever the platform unpacks. Prove it by requesting `/health` from the artefact and reading the `version` back
- **This runs as a container, so PID 1 is no longer a conditional.** Task 1.11.1 chose Azure Container Apps, which runs container images and nothing else, so the `if` this bullet used to open with is settled and the check is required rather than optional. **PID 1 is the open question Story 1.2 could not close.** Signal handling was proved against a process started directly, which says nothing about a container delivering `SIGTERM` to PID 1: a shell-form `CMD`, or a wrapper script that does not `exec`, swallows it, and **the symptom is a ten-second pause and a `SIGKILL` rather than an error** — a clean-looking deploy with a shutdown that never runs. Send `SIGTERM` to the running container and require exit 0 with the `shutdown complete` record present
- **The image must be `linux/amd64`, and on this machine the default is not.** Container Apps' limitations are explicit — "Linux-based (`linux/amd64`) container images are required" — and the development machine is Apple Silicon, so a plain `docker build` produces `linux/arm64` and the failure surfaces on the platform rather than here. Build for the target architecture explicitly and **record how**, because this is the one thing in this task that a local run will not catch: an arm64 image runs perfectly in the local check this task performs and cannot run at all in Task 1.11.3.
- **Size the image against the Consumption plan's fixed allocations rather than against a preference.** Container Apps does not take arbitrary CPU and memory: the documented Consumption combinations start at **`0.25` vCPU with `0.5Gi`** and step in fixed pairs, and the cost arithmetic in `HOSTING.md` assumes that first pair. So the artefact has to start and serve inside 0.5 GiB. Record its resident memory alongside the size figure below.
- **Tag the image deliberately and never `latest`.** The platform's own guidance is that static tags "can lead to caching problems and can make your app difficult to troubleshoot", and recommends "a Git hash or date and time". A commit SHA is the obvious choice here and it is what makes Task 1.11.6's provenance question answerable at all. Pushing to a registry is **Task 1.11.3's**; this task builds and runs the image locally, which is what keeps it entirely local.
- **Pin the runtime Node the way the toolchain is pinned, and notice that the usual guard is absent here.** `.nvmrc` is 24.20.0 and `engineStrict` makes a wrong major a hard **install** failure — but a runtime image runs no install, so a mismatched runtime major is silent. Say how the image's Node version is tied to `.nvmrc` rather than typed twice
- **The orchestrator's kill timeout is known now, so this is a confirmation rather than a discovery.** `SHUTDOWN_TIMEOUT_MS` is 5 s, chosen to sit inside Docker's 10 s stop grace and Kubernetes' 30 s `terminationGracePeriodSeconds`. Container Apps documents the same number: "When a shutdown starts, the container host sends a SIGTERM message to your container… If your application doesn't respond within 30 seconds to the `SIGTERM` message, then SIGKILL terminates your container." So the ceiling is the smaller number by 25 seconds and the guess Story 1.2 made turned out to be right — **confirm it against the running container rather than inheriting this sentence**, and note that `terminationGracePeriodSeconds` is settable on the app if it ever needs to be. Both ends are already exercised by `pnpm test:process`: a drain finishing inside the ceiling exits 0, one exceeding it exits 1 with a level-50 `shutdown timed out, forcing exit`
- **Record the artefact's size and contents**, so a later change that doubles it is visible. This is the backend's equivalent of the frontend fingerprint the pipeline already prints
- **`HOST` exists so a container can bind `0.0.0.0`, and the log will not tell you whether it did.** Fastify rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, confirmed twice with `lsof`. Check the socket. Setting the value is Task 1.11.3's job; proving the artefact honours it is this one's

## Done when

- The artefact produced by `pnpm deploy --filter` starts, serves `/health` with the right `version`, and exits 0 on `SIGTERM`, from outside the workspace
- What `pnpm deploy` did with the compiled test files and with `@marketpulse/shared` is recorded from the output, not assumed
- The start command is chosen with the alternative named
- `SIGTERM` to the container produces a clean drain and exit 0, and the `CMD` form that would have swallowed it is named
- The image is built for `linux/amd64` with the mechanism recorded, and its resident memory is inside the Consumption plan's `0.5Gi` first step
- The image tag is a commit SHA or equivalent, and is not `latest`
- The runtime Node major is tied to `.nvmrc` by a stated mechanism
- Container Apps' 30 s grace period is confirmed against the running container beside the 5 s ceiling, rather than cited from the documentation
- Binding `0.0.0.0` is confirmed at the socket rather than from the startup line

## Notes

Everything here is reproducible locally, which is the reason it is a separate task: a deployment that fails on a platform because the artefact was never correct is the most expensive kind of failure to read, because the platform's logs describe its own machinery rather than yours.

## Outcome

Done. The backend has a container image, it is built for `linux/amd64` from `.nvmrc`, it starts, serves `/health` and drains on `SIGTERM` as PID 1, and every figure below was taken from a running artefact rather than inherited. Nothing was deployed and no Azure resource exists — that is Task 1.11.3's.

Two files are new — `apps/backend/Dockerfile` and a repository-root `.dockerignore` — plus one root script (`pnpm image`) and a `files` field on two package manifests. No dependency was added, `pnpm-workspace.yaml` is byte-unchanged, `allowBuilds` still has its single `esbuild` entry, and the frontend artefact is byte-identical at 343,658 B / md5 `cba2825c…` and 10,926 B / `f98519e3…`.

### `pnpm deploy` needs `--legacy`, and the alternative would have cost the dev loop

`pnpm deploy --filter @marketpulse/backend --prod <dir>` **fails outright** on this workspace:

```
[ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE] By default, starting from pnpm v10, we only
deploy from workspaces that have "inject-workspace-packages=true" set
```

Two ways out, and the cheap-looking one is the expensive one. Setting `injectWorkspacePackages: true` in `pnpm-workspace.yaml` is the modern path pnpm is steering towards, and it changes **every developer's install**: `@marketpulse/shared` stops being a symlink into `packages/shared` and becomes a hard-linked copy taken at install time, so a `tsc -b --watch` rebuild of shared would no longer reach the backend until the next install. That breaks `pnpm dev`, which is three watchers whose whole point is that a shared edit propagates. `--legacy` is a flag on one command in one file and changes nothing for anyone not deploying, so it is what the Dockerfile uses. Recorded because the warning pnpm prints on every legacy deploy reads like something to fix:

```
[WARN] Shared workspace lockfile detected but configuration forces legacy deploy
implementation.
```

It is not. The reversal trigger is pnpm removing `--legacy`, at which point the injected mode needs a dev-loop answer before it is adopted, not after.

### What `pnpm deploy` actually shipped, before anything was done about it

It copies the **whole package directory**, not the built half. Read from the output rather than assumed:

| Path                                                                                                    | Size | What it is                                                |
| ------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| `node_modules/`                                                                                         | 15 M | the production dependency graph                           |
| `coverage/`                                                                                             | 324K | `pnpm coverage`'s HTML report, gitignored, shipped anyway |
| `dist/`                                                                                                 | 316K | the build, including **16 compiled test files**           |
| `src/`                                                                                                  | 144K | the TypeScript sources                                    |
| `scripts/`                                                                                              | 4.0K | `dev.sh`                                                  |
| `vitest.config.ts`, `vitest.process.config.ts`, `tsconfig.json`, `tsconfig.tsbuildinfo`, `.env.example` | —    | everything else in the directory                          |

**The task's brief said "12 files for 3 test files" and that is now 16 for 4** — Task 1.10.5 added `src/index.process.test.ts` after the brief was written, and `tsc -b` emits `.js`, `.js.map`, `.d.ts` and `.d.ts.map` for each. `packages/shared` arrived the same way: 360K holding its own `src/`, `coverage/`, `tsconfig.tsbuildinfo`, `vitest.config.ts` and **10** compiled-test files.

None of it is a correctness problem — the brief was right that these are inert — but "the deployment ships the coverage report and the test sources" is not a thing to discover in Epic 2.

### The fix is a `files` field, and it is a two-line answer in each manifest

`pnpm deploy` honours npm's `files` field, negations included. Both manifests now carry:

```json
"files": ["dist", "!dist/**/*.test.*"]
```

`package.json` itself is always included whatever `files` says, which matters because `/health` needs it (below). Measured:

|                                       | before                                                    | after                                           |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `apps/backend` deploy root            | `dist src scripts coverage node_modules` + 5 config files | `dist node_modules package.json`                |
| `apps/backend/dist`                   | 316K, 16 test files                                       | 188K, **0** test files                          |
| `@marketpulse/shared` in the artefact | 360K, `src` + `coverage` + configs, 10 test files         | 112K, `dist` + `package.json`, **0** test files |

The `.d.ts` and `.d.ts.map` files are **kept**, and that is a decision with a number under it rather than an oversight: they are 6,739 B of a 96,265 B `dist`, so two more negation rules would buy 7% of the smallest part of the artefact while adding two more chances for a rule to drop something needed. `.js.map` is kept too — Node reads them under `--enable-source-maps` and a stack trace naming a `.ts` line is worth more than 22 KB.

**`files` affects `pnpm deploy` and `pnpm pack` and nothing else.** Confirmed rather than assumed: `apps/backend/node_modules/@marketpulse/shared` is still `-> ../../../../packages/shared`, a workspace symlink, so `pnpm dev` is untouched; `pnpm verify` exits 0; and the frontend bundle is byte-identical.

### `@marketpulse/shared` arrives as real files

The thing that would have been latent until Story 1.12 imported it. In the artefact, `node_modules/@marketpulse/shared` is a **relative** symlink into `node_modules/.pnpm/@marketpulse+shared@file+packages+shared/…`, and that path holds real file content — 1,257 bytes of `dist/index.js`, one link, inside the image. Locally, before the image, the same files are **hard links** to the workspace's own (same inode, `39070211`, link count 2), which is still a real file in the tree and survives a `tar`, a `COPY` and the workspace being deleted.

**One dangling symlink does survive into the image**, and it is worth naming because "the artefact is self-contained" is otherwise not quite true:

```
/app/node_modules/.pnpm/node_modules/@marketpulse/backend -> ../../../../../repo/apps/backend
```

That is the deployed package's own self-reference in pnpm's hoist directory, pointing at the **builder stage's** `/repo`, which the runtime stage does not have. It is inert: nothing resolves `@marketpulse/backend` by name, and the only occurrence of that string anywhere in `dist/` is a comment in `config.js` (line 203). Recorded, not repaired — repairing it would mean deleting a file out of pnpm's own layout on the way past.

### The artefact runs outside the workspace, and both of Story 1.2's failures were re-made rather than cited

From `/tmp` with no workspace in sight, `node dist/index.js`:

```
{"status":"ok","version":"0.0.0","uptimeSeconds":0.229398459}
EXIT CODE: 0
… "signal":"SIGTERM","msg":"signal received, shutting down"
… "msg":"shutdown complete"
```

The `version` comes back, which is the proof the manifest is one directory above `dist/` where `../../package.json` expects it. Both failure halves reproduce, and the first still hides the second:

```
A. dist/ alone            Cannot find package 'fastify' imported from …/dist/server.js
B. dist/ + node_modules   Cannot find module '/private/tmp/…/package.json'
                          imported from …/dist/routes/health.js
```

### The start command is `node dist/index.js`

`pnpm start` was the alternative and it works — Task 1.2.5 measured `pnpm run` forwarding `SIGTERM`, waiting for the child and propagating its exit code, so nothing is being avoided. It is rejected because it puts a package manager, a Corepack fetch and a script-resolution step into a runtime image to run the command it would have run anyway, and it puts a second process between the platform's `SIGTERM` and the server for no gain. The runtime stage therefore has no Corepack and no pnpm at all.

### PID 1: the received wisdom is wrong on this image, and the real failure is narrower

The expected result was that a shell-form `CMD` makes `/bin/sh` PID 1 and swallows `SIGTERM`. **Built and signalled, and it is false here.** Busybox `sh` `exec`s a lone command, and the Node base image's own `docker-entrypoint.sh` ends in `exec "$@"`, so the chain collapses and `node` is PID 1 either way. Three forms, same image, `docker stop -t 15`:

| `sh -c` argument               | PID 1  | exit    | stop took  | drained |
| ------------------------------ | ------ | ------- | ---------- | ------- |
| `node dist/index.js`           | node   | 0       | 0 s        | yes     |
| `node dist/index.js; echo bye` | **sh** | **137** | **15.0 s** | **no**  |
| `exec node dist/index.js`      | node   | 0       | 0 s        | yes     |

The middle row is the real failure and it is exactly the symptom the brief predicted — a full grace period of nothing, then `SIGKILL` (137 = 128 + 9), with no `signal received` and no `shutdown complete`. On Container Apps' 30-second grace that is 30 seconds per replica per revision, reading as slowness rather than as an error. So the shell form here is not correct, it is _accidentally_ correct, and it stops being correct the moment anyone appends a second command or wraps the start in a script that does not `exec`. `CMD ["node", "dist/index.js"]` is right by construction, which is the property worth buying. The whole table is in the Dockerfile beside the line.

With the shipping image, `pid` is **1** in every log record and `/proc/1/cmdline` is node.

### `linux/amd64`, and the mechanism is the one thing a local run cannot catch

`--platform linux/amd64` on the build, which on this Apple Silicon machine runs the builder stage under Rosetta. Verified at the image and inside it rather than from the flag:

```
docker image inspect --format '{{.Os}}/{{.Architecture}}'   linux/amd64
node -p process.version + arch + platform                    v24.20.0 x64 linux
```

`pnpm image` is that command with every argument filled in. It is a root script rather than a shell file so that Prettier at least formats the JSON around it; the command itself is unchecked shell inside a JSON string, which is the same small gap the two `clean` scripts already have.

### Node is tied to `.nvmrc` by a build arg, with `engineStrict` as a backstop

`ARG NODE_VERSION` with **no default**, fed from `.nvmrc` by `pnpm image`, and used by both stages — so the builder and the runtime cannot disagree, and the version is written down once in the repository. A default value here would have been a second copy that silently wins whenever the flag is forgotten, which is the drift the arrangement exists to prevent. Both failure modes were made to happen:

- **No `--build-arg`:** `failed to parse stage name "node:-alpine": invalid reference format`. BuildKit also emits `InvalidDefaultArgInFrom` as a lint warning on every build; that warning is the arrangement working, not a defect.
- **`--build-arg NODE_VERSION=22.20.0`:** `[ERR_PNPM_UNSUPPORTED_ENGINE] … Expected version: >=24.20.0 <25`, at `pnpm install` in the builder, exit 1.

The honest limit: `engineStrict` reads the `engines` **range**, so it catches a wrong major and would not catch `24.21.0`. The build arg is what ties the exact version; `engineStrict` is a backstop, not the tie.

### Size, and what the number is actually made of

|                                                                |                             |
| -------------------------------------------------------------- | --------------------------- |
| Uncompressed rootfs                                            | **188,920 KB (~184.5 MiB)** |
| — `/usr/local` (Node, npm)                                     | 151.6 M                     |
| — `/app` (the artefact)                                        | **16.3 M**                  |
| — `/opt` (yarn, from the base image)                           | 5.1 M                       |
| Compressed, i.e. what a registry stores and the platform pulls | **60,266,496 B (57.5 MB)**  |
| `/app/dist`                                                    | 196 K over **32 files**     |
| `/app` total                                                   | 2,343 files                 |
| Build, cold                                                    | 45.3 s                      |
| Build, cached                                                  | 25.3 s                      |

Our own code is under 0.2% of the image; the base image is the image. A distroless or `npm`-stripped runtime would take ~157 MB off the uncompressed figure and was **not** taken: it forfeits the `node:${NODE_VERSION}-alpine` tag scheme that makes the `.nvmrc` tie a one-line arg, for a pull the platform does once per revision. The reversal trigger is pull time appearing in a deploy measurement.

One reading note, because it cost time: `docker images` reported **254MB** for the first build and **60.3MB** for the second of the same content, and `docker image inspect --format '{{.Size}}'` agreed with neither consistently. With buildx and the containerd store those fields mix compressed and uncompressed views across manifest-list entries. `du -sx /` inside the container and `docker save | wc -c` are the two figures that reproduce; quote those.

### Memory, against the Consumption plan's first step

Run with `--memory 512m --cpus 0.25`, the documented first Container Apps pair:

|                                     | idle                   | after 500 requests     |
| ----------------------------------- | ---------------------- | ---------------------- |
| cgroup working set (`docker stats`) | **61.98 MiB** (12.11%) | **70.59 MiB** (13.79%) |
| `VmRSS` (`/proc/1/status`)          | 112,060 kB             | 121,168 kB             |
| `VmHWM`                             | 112,060 kB             | 129,304 kB             |

The cgroup figure is the one the platform limits and bills against, and at 13.8% of `0.5Gi` there is room. `VmRSS` is higher because it counts shared mappings and, here, Rosetta's translation pages; do not quote it as the requirement. No OOM kill on any run (`OOMKilled=false`).

### The 30-second grace confirmed against the running container, not cited

Both ends, with `docker stop -t 30` standing in for Container Apps' documented grace:

- **Clean stop:** `signal received, shutting down` → `shutdown complete` **4 ms** later, `ExitCode=0`, the whole `docker stop` returning in 1.0 s.
- **Drain held open** by a socket that writes `GET /health HTTP/1.1` and a `Host` header and then stops — the Task 1.10.5 technique, since an idle keep-alive does not delay `close()`: the ceiling fires at **5,004 ms** with the level-**50** `shutdown timed out, forcing exit` and `ExitCode=1`.

So the 5-second ceiling sits **25 seconds inside** the platform's 30, the container exits on its own in both cases, and Story 1.2's guess is confirmed on a real container. `terminationGracePeriodSeconds` is settable on the app if it ever needs to be; it does not.

### `HOST=0.0.0.0` confirmed at the socket, and the startup line is worse than recorded

Inside the container, `/proc/net/tcp`:

```
local_address  st
00000000:0BB8  0A     uid 1000
```

`00000000` is `0.0.0.0`, `0BB8` is 3000, `0A` is LISTEN, uid 1000 is the `node` user. `/proc/net/tcp6` is **empty**, which is this server binding IPv4 only, exactly as recorded.

**And the log said something else.** `CLAUDE.md` records that Fastify rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line. Re-measured, in the container and again natively on macOS, that is half the story: with `HOST=0.0.0.0` Fastify writes **one line per bound interface address**, loopback first —

```
container: Server listening at http://127.0.0.1:3000
           Server listening at http://172.17.0.2:3000     (socket: *:3000)
macOS:     Server listening at http://127.0.0.1:3130
           Server listening at http://192.168.18.6:3130   (socket: *:3130)
```

— while `HOST=127.0.0.1` writes exactly one. So the recorded trap is real and sharper than written: the **first** line reads loopback in both cases, so anything grepping for one line, or reading the first, gets the wrong answer. The line count is a hint and not proof either, since it follows the machine's interfaces. Check the socket.

### What this adds to the `pnpm verify` gaps

`apps/backend/Dockerfile` and `.dockerignore` are both read by nothing, and it is the same signature `scripts/dev.sh` has — `prettier --file-info` reports `"inferredParser": null` for both, and `eslint` reports `File ignored because no matching configuration was supplied`. So the first gap grows from one shell file to three files, one of which now decides what runs in production. `hadolint` is the tool that would close the Dockerfile half and is **declined** on the same one-file argument that declined `shellcheck` and `actionlint`; BuildKit's own linter already runs on every build and its two `InvalidDefaultArgInFrom` warnings are the deliberate no-default `ARG`. Recorded as declined rather than unconsidered, dated 2026-09-03. Note the `.dockerignore` is load-bearing in a way that fails **silently**: `.env` is gitignored, and a build context is assembled from the working tree rather than from git, so without that entry a developer's `.env` would be copied into the builder stage.

### Left for later, deliberately

Pushing to a registry, the resource group, the environment, the ingress, `CORS_ORIGIN`'s real value and the health probe are **Task 1.11.3's**. This task built and ran locally and stopped there, so that when the first deployment fails it has one possible cause.
