# ADR 0011 — Deploying both halves: two artefacts, two hosts, and what a green deploy certifies

**Status:** Accepted
**Date:** 2026-09-03
**Delivered by:** Epic 1, Story 1.11 (Tasks 1.11.1–1.11.8, plus the account prerequisite)

## Context

Before this story the repository built two artefacts and deployed neither. ADR
0010 had just put `pnpm verify` on a second machine without creating a second
definition of "verified"; this story had to put the _output_ of that command on
a third machine, which is a harder problem, because a deployment cannot be
`pnpm verify` by name. Something has to know a hostname.

Epic 1's exit criterion is a deployed, verified foundation. The reason it is an
Epic 1 criterion rather than an Epic 15 one is stated in the story: deployment
problems should surface while the system is trivial rather than after the WebGL
topology, the streaming pipeline and the agent services exist. Everything below
is cheaper now than it will ever be again.

Five properties of the workspace shaped the decisions, and only two of them are
about hosting:

- **The two halves share almost nothing as artefacts.** ADR 0003 and Task 1.3.4
  measured the asymmetry: `apps/frontend/dist` is self-contained static files
  with no `package.json` and no `node_modules`, and `apps/backend/dist` is not
  runnable at all on its own — it fails at import time on `fastify`, and then,
  once that is fixed, on the manifest the health route reads. One needs a file
  server; the other needs a process supervisor and a dependency graph.
- **Frontend configuration is statically substituted at build time.** ADR 0006
  §6 recorded this and declined to build a run-time configuration mechanism. It
  means one frontend artefact cannot be promoted across environments, and it is
  the decision most likely to be re-litigated later — so §21 gives it numbers
  rather than a principle.
- **The backend has no secret to hold.** Its entire surface is `GET /health`.
  That is what made a public development environment acceptable, and it stops
  being true the moment Epic 2's Alpaca key exists.
- **Two epics that are nine and eleven stories away are constrained by the
  hosting choice**, through different mechanisms — Epic 3's outbound Alpaca
  socket and Epic 10's inbound SSE stream. Conflating them is the mistake §2
  exists to prevent.
- **`CORS_ORIGIN` was already real.** Story 1.8 chose server-side CORS over a
  Vite proxy, so the browser boundary was enforced by the backend before there
  was a deployed browser to enforce it against.

## Decisions

### 1. Microsoft Azure for both halves, one subscription, two services — and not one service

The frontend is **Azure Static Web Apps** (Free); the backend is **Azure
Container Apps** (Consumption, `minReplicas: 1`). The full record — quoted
platform limits, rejected candidates, the cost envelope and the account facts —
is `planning/epic-01-application-foundation/story-11-.../HOSTING.md`, which is
the input to this ADR rather than a second copy of it.

One provider for both was decided on three grounds: the database coupling (§22),
one identity boundary for the deploy credential, and one free-tier envelope to
reason about. It is deliberately **not one service**, because the artefact
asymmetry above is real and a single service would have to pretend otherwise.

**Rejected, each on a measurement rather than on reputation.** App Service
**Free F1** has three independent disqualifications, any one of them fatal by
Epic 3: **5 web sockets per instance**, 60 CPU-minutes per day, and no Always On
— "In the Free and Shared tiers, an app receives CPU minutes on a shared VM
instance and can't scale out". **Render Free** spins down after "15 minutes
without receiving any inbound traffic", of which an outbound socket to Alpaca is
none, so it fails at exactly the same place F1 does. **Fly.io** is the cheapest
always-on compute at $2.02/month and states the hazard plainly — "The proxy looks
at inbound traffic. It does not look inside the container" — but its managed
Postgres starts at **$38/month**, which the database coupling cannot absorb.
**Cloud Run** was rejected on a hard cap: the request timeout maxes at 60
minutes and "WebSockets streams are HTTP requests, which are still subject to
the request timeout".

The standing alternatives, if this is ever reversed: **App Service Basic B1**
(~$13/month, Always On, 350 web sockets per instance) on Azure, and **Netlify**
for the frontend, which expresses §14's fallback as cleanly as Static Web Apps
does and lost only to the one-provider decision.

### 2. Epic 3 and Epic 10 are constrained by different mechanisms, and `minReplicas: 1` is a requirement rather than a tuning knob

The Alpaca WebSocket is **outbound** — our server dials Alpaca — so the
connection never traverses the ingress proxy in the direction a request timeout
governs, and no ingress limit reaches it. What threatens it is the replica not
existing: Container Apps' documented default with an HTTP trigger is
`minReplicas: 0`, and at that default the socket dies with the replica. So
`minReplicas: 1` is the setting the whole Epic 3 argument rests on, and anyone
"optimising" it to zero breaks a future epic silently.

Epic 10's agent stream is **inbound** SSE, so the ingress limit is exactly what
applies. Default HTTP ingress is "Request time out is 240 seconds", and the
premium-ingress table names the same number as an _idle_ timeout (minimum 4
minutes, maximum 30), which is what establishes it as a ceiling on **silence**
rather than on connection age.

**So Epic 10's SSE stream must emit something at least every four minutes.** One
keep-alive line, cheap because it is written down here before the stream exists,
and otherwise discovered by an agent stream dying in production. Premium ingress
would raise it to 30 minutes and requires a dedicated workload profile at a
minimum of two nodes; recorded and declined.

### 3. The backend artefact is `pnpm deploy --legacy`, and the flag is a decision about every developer's install

`apps/backend/Dockerfile` is two stages: the builder installs, builds and runs
`pnpm deploy --filter @marketpulse/backend --prod --legacy`; the runtime carries
the artefact, a `node` user and nothing else.

Without `--legacy` the command fails outright with
`[ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE]`: pnpm 10 and later only deploy from
workspaces with `inject-workspace-packages=true`. Setting
`injectWorkspacePackages: true` in `pnpm-workspace.yaml` is the path pnpm is
steering towards, and **it changes every developer's install rather than
anything about deployment** — `@marketpulse/shared` stops being a symlink into
`packages/shared` and becomes a hard-linked copy taken at install time, so a
`tsc -b --watch` rebuild of shared would stop reaching the backend until the next
install. That is precisely what `pnpm dev`'s three watchers exist to do.
`--legacy` is a flag on one command in one file and changes nothing for anyone
not deploying.

It prints `[WARN] Shared workspace lockfile detected but configuration forces
legacy deploy implementation.` on every run, which reads like something to fix
and is not. **The reversal trigger is pnpm removing the flag**, at which point
the injected mode needs a dev-loop answer _before_ it is adopted.

`pnpm deploy --filter` is meaningful for the backend and **meaningless for the
frontend**, which is the artefact asymmetry stated as a command: `dist/` has no
dependency graph to prune.

### 4. A `files` field on two manifests, because `pnpm deploy` copies the whole package directory

Read from the output rather than assumed: the first artefact was 16 M holding
`node_modules/` (15 M), the **coverage HTML report** (324 K), `dist/` (316 K),
`src/` (144 K), `scripts/dev.sh`, both Vitest configs, `tsconfig.json`,
`tsconfig.tsbuildinfo` and `.env.example`; `@marketpulse/shared` arrived the same
way at 360 K.

Both manifests now carry `"files": ["dist", "!dist/**/*.test.*"]`, which
`pnpm deploy` honours, negation included: `apps/backend/dist` went **316 K and 16
test files → 188 K and zero**, and shared went **360 K → 112 K**. `package.json`
is included whatever `files` says, which is what `/health` depends on.

The `.d.ts`, `.d.ts.map` and `.js.map` files are **kept**, on a measurement
rather than by omission: 6,739 B of a 96,265 B `dist` for the declarations, and
source maps are worth 22 KB for a stack trace that names a `.ts` line. `files`
affects `pnpm deploy` and `pnpm pack` and nothing else — verified that the
workspace symlink is untouched and the frontend bundle did not move.

### 5. The start command is `node dist/index.js`, and the PID 1 finding is not the folklore

`CMD ["node", "dist/index.js"]`, exec form. `pnpm start` was the named
alternative and **works** — Task 1.2.5 measured `pnpm run` forwarding `SIGTERM`,
waiting for the child and propagating its exit code, so nothing is being avoided
— and it is rejected because it puts a package manager, a Corepack fetch and a
script-resolution step into a runtime image to run the command it would have run
anyway. The runtime stage therefore carries no Corepack and no pnpm.

**The received wisdom about PID 1 is wrong on this image, and it was built and
signalled rather than cited.** The expected finding was that a shell-form `CMD`
makes `/bin/sh` PID 1 and swallows `SIGTERM`. It is false here, because busybox
`sh` `exec`s a lone command and the Node base image's own `docker-entrypoint.sh`
ends in `exec "$@"`, so the chain collapses and `node` is PID 1 either way. What
actually swallows the signal is **a shell with work left after the server**:

| `sh -c` argument               | PID 1  | exit    | `docker stop -t 15` took | drained |
| ------------------------------ | ------ | ------- | ------------------------ | ------- |
| `node dist/index.js`           | node   | 0       | 0 s                      | yes     |
| `node dist/index.js; echo bye` | **sh** | **137** | **15.0 s**               | **no**  |
| `exec node dist/index.js`      | node   | 0       | 0 s                      | yes     |

The middle row is the predicted symptom exactly: a whole grace period of
nothing, then `SIGKILL` (137 = 128 + 9), with no `signal received` and no
`shutdown complete`. On Container Apps' 30-second grace that is 30 seconds per
replica per revision, and it reads as slowness rather than as an error.

So the shell form here is **accidentally right rather than right**, and it stops
being right the moment anyone appends a second command or wraps the start in a
script that does not `exec`. The exec form is right by construction. With the
shipping image `pid` is **1** in every log record, re-confirmed in production in
Task 1.11.8 against a browser-initiated request.

### 6. `linux/amd64` and a build-arg tie to `.nvmrc`, with no default on the arg

Container Apps requires `linux/amd64` and the development machine is Apple
Silicon, so a plain `docker build` produces an `arm64` image that runs perfectly
in every local check and **cannot run on the platform at all**. That is the one
thing about this image a local run cannot catch, so `--platform linux/amd64`
lives in `pnpm image` rather than in anyone's memory, and it was verified at the
image and from inside it rather than from the flag.

`ARG NODE_VERSION` has **no default**, is fed from `.nvmrc` by `pnpm image`, and
is used by **both** stages so builder and runtime cannot disagree. A default
value would be a second copy of the Node version that silently wins whenever the
flag is forgotten, which is the drift the arrangement exists to prevent. The
cost is BuildKit's `InvalidDefaultArgInFrom` warning on every build, which is the
arrangement working.

Both failure modes were made to happen: no `--build-arg` is
`failed to parse stage name "node:-alpine": invalid reference format`, and
`NODE_VERSION=22.20.0` is `[ERR_PNPM_UNSUPPORTED_ENGINE]` at `pnpm install` in
the builder. The honest limit: `engineStrict` reads the `engines` **range**, so
it catches a wrong major and would not catch `24.21.0`.

### 7. Azure Container Registry Basic, on managed identity rather than on price

The container app pulls with its **own system-assigned managed identity** and an
`acrPull` role assignment, so no registry credential exists anywhere — not in the
platform, not in the repository, not in CI. That is what the choice was taken
on.

It was explicitly **not** taken on price, and the measured finding is the
opposite of the intuition: at **$0.1666/day — $5.00/month** the registry costs
_more_ than the **$4.21/month** replica it serves. GHCR is free and arrived as a
candidate one task later; it would have needed a pull credential stored on the
platform, which is a secret this deployment otherwise does not have (§10).

Re-read from the Azure Retail Prices API in Task 1.11.8 rather than cited:
Basic Registry Unit $0.1666 /1/Day, Data Stored $0.10 /GB/Month beyond the 10 GB
included.

### 8. A commit-SHA tag means the tree _is_ that commit, and a dirty tree gets a suffix rather than a refusal

`scripts/build-image.mjs` is `pnpm image`. It exists so the three load-bearing
build arguments cannot be forgotten, and so a tag carries a guarantee: a clean
tree gets the bare short SHA, a **dirty** tree gets `<sha>-dirty` and a warning
not to push it, and `MARKETPULSE_IMAGE_TAG` overrides both.

A suffix rather than a refusal, because refusing would make the recipe unusable
for the thing it is most useful for — building an image of work in progress —
and the failure it guards against is a _pushed_ tag that lies about its commit,
not a local build.

Moving it out of `package.json` also put it inside ESLint's and Prettier's net,
which is the one place this repository's `verify` gap list has ever **shrunk**
(§18).

**What a commit-SHA tag does not mean is one image.** Task 1.11.7 re-ran a failed
deploy and the same commit rebuilt to a **different digest**, so the tag moved
and the digest it left behind became an untagged manifest. The tag names a
commit; it does not name bytes. The digest names bytes.

### 9. The provenance record is the digest the tag resolves to — and the "index digest" claim is true of a local build only

Task 1.11.3 named the OCI **index** digest as the provenance record, because a
local `pnpm image` produces an `application/vnd.oci.image.index.v1+json`
carrying a buildx provenance/SBOM attestation.

**Task 1.11.6 measured that this is not what the pipeline produces**, and Task
1.11.8 re-confirmed it from the registry's own manifest list: the local build
`4a00140` is an OCI index with an OCI image manifest and a 1,131-byte attestation
beneath it, and **every pipeline image is a plain
`application/vnd.docker.distribution.manifest.v2+json` with no attestations**.
The cause is the image store rather than the recipe — `docker build -t` uses the
`docker` exporter, and attestations need one that can carry them, which is
Docker Desktop's containerd store locally and nothing on `ubuntu-latest`. Same
`Dockerfile`, same arguments, same runnable bytes, a different envelope.

**The stated reversal trigger did not fire.** Nothing ever _refused_ an index;
the builder simply never made one. What `deploy.yml` pins and prints is
therefore **the digest the tag resolves to**, which is what the platform pulls in
either shape, and which is stable in a way the tag is not.

Accepted rather than chased: the fixes cost a sixth pinned action plus a
`--push` mode on a recipe whose "this pushes nothing" is a stated property. **The
reversal trigger is anything that actually consumes the attestations.**

### 10. No platform secret was needed, and the mechanism for Epic 2 is identified rather than created

The container app's `secrets` array is **empty**, re-read in Task 1.11.8. Five
environment variables are set from the platform as plain values — `PORT`, `HOST`,
`LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN` — and not one of them is a credential.

The `secretRef` mechanism is identified for Epic 2's Alpaca key and deliberately
**not created for symmetry**. An empty secrets array is a true statement about
this deployment; a secrets array holding a non-secret is a habit that makes the
first real secret unremarkable.

This is also what makes the criterion "environment configuration is managed by
the hosting platform, not committed" true for the backend and structurally false
for the frontend (§21).

### 11. `HOST=0.0.0.0` is a deployment requirement, not a preference — and the log line is not the evidence

`config.ts` defaults `HOST` to `127.0.0.1`, which is right for a laptop and
fatal in a container: it binds the container's **own** loopback, which the
ingress proxy cannot reach, while looking entirely healthy from inside the
container. So `HOST=0.0.0.0` is set from the platform and is a requirement.

**Fastify's startup log is not evidence of the bound interface, and the recorded
version of this understated it.** The claim through Story 1.10 was that Fastify
rewrites `0.0.0.0` to `127.0.0.1` in one line. Re-measured on 5.12.1, in a
container and again natively, it writes **one line per bound interface address,
loopback first** — so the first line reads loopback _whatever you set_, and
anything grepping for one line gets the wrong answer. Check the socket
(`/proc/net/tcp`, or `lsof`), not the log.

### 12. HTTP probes against `/health` replace the platform's TCP defaults, and a TCP probe passes on any process that binds the port

The three probes are configured explicitly and were re-read off the running app
in Task 1.11.8 rather than cited:

| Probe     | Failures | Period | Initial delay | Timeout | Target              |
| --------- | -------- | ------ | ------------- | ------- | ------------------- |
| Startup   | 30       | 2 s    | 1 s           | 3 s     | `GET /health` :3000 |
| Readiness | 3        | 10 s   | 3 s           | 5 s     | `GET /health` :3000 |
| Liveness  | 3        | 30 s   | 5 s           | 5 s     | `GET /health` :3000 |

The platform's defaults are TCP, and **a TCP probe passes on any process that
binds the port** — including a server that binds and then fails every request,
which is the failure this application is most able to have. An HTTP probe
against the route that already exists costs nothing and is the difference
between "something is listening" and "the application answers".

**Two numbers, and quoting the wrong one is the trap.** Readiness moves a
_running_ replica out of rotation in ~30 s. A _failing rollout_ is governed by
the startup probe's 60-second grace and then by the platform's own patience: the
revision sat at `Activating` for **10 min 03 s** before admitting
`ActivationFailed`. Task 1.11.7 was written against the readiness figure and had
to be amended — this repository's citation-rot failure arriving inside a single
story rather than across six.

**The probes pin port 3000 while `PORT` is an environment variable**, so the two
can be made to disagree from the platform panel with nothing in this repository
noticing. That makes a wrong `PORT` a health-check failure rather than a bind
failure, which is a better failure — and it is also §19's largest instance.

### 13. `version` reports `0.0.0` deliberately

`/health` reports `version: "0.0.0"`, which reads like an oversight. The tag and
the digest already answer "what is deployed", and both are printed into every
deploy run's job summary; writing a version into `package.json` at build time
would **dirty the tree the tag rule in §8 needs clean**, so the obvious fix
breaks the mechanism that makes the question answerable at all.

### 14. The fallback is scoped, and a blanket catch-all was refused

`apps/frontend/public/staticwebapp.config.json` carries `navigationFallback`
with `exclude: ["/assets/*"]`. Story 1.5 measured why this is not a detail: on a
dumb static host every deep link is a 404 before React exists, **including the
not-found route**, which only renders if the host served `index.html` for an
address that matched nothing.

A blanket catch-all was refused because it recreates the `vite preview` trap in
production: a missing asset would arrive in the browser as a MIME-type error
rather than as a 404 naming the file. The documentation's table transferred
exactly — all four routes and a made-up path are **200 with `index.html`**, and
`/assets/nope.js` is a **404** — re-run in Task 1.11.8 against the deployed site.

**The `exclude` array's scope is a live limitation rather than a solved
problem.** It is exact today only because Vite puts every hashed asset under
`/assets/`. A file added to `apps/frontend/public/` lands at the artefact's
**root**, outside the exclusion, where a miss is answered with `index.html` and
a 200 — measured, `/favicon.svg` comes back as the document. Anything added to
`public/` needs an `exclude` entry in the same change, and nothing checks that.

The configuration file lives in `public/` because the platform requires it at
the **root of the deployed output** and Vite copies `public/` there untouched.
So unlike the backend, whose host configuration lives in a platform panel, **the
frontend's host configuration is part of its artefact** — a fourth file, and the
first thing in six stories to change that artefact's shape.

### 15. The document's `no-cache` is a `globalHeaders` entry and not a route rule

Cache policy is `no-cache` on the document through `globalHeaders`, and
`public, max-age=31536000, immutable` on `/assets/*` through a route rule.

The ordering trap is the reason this is a decision rather than a setting:
**"Route rules aren't applied on requests that trigger `navigationFallback`"**.
So the obvious shape — hanging the document's cache header on a route rule for
`/` — would have covered `/` and **none of the four routes**, every one of which
is served by the fallback. That is the worst available outcome: configured-looking
and inert.

Confirmed on the deployed site rather than trusted, and re-confirmed in Task
1.11.8: `/` and `/investigations` both carry `Cache-Control: no-cache`, and both
hashed assets carry the immutable year. `/staticwebapp.config.json` itself comes
back as the fallback document rather than as content, so the platform consumes
it rather than publishing it.

### 16. Static Web Apps is not offered in East US, so the two halves are not co-located

The recorded "East US for both halves" was **unachievable**. Static Web Apps
offers Central US, East US 2, West US 2, West Europe and East Asia — and not East
US. The frontend is therefore in **East US 2** and the backend, the registry and
the eventual database are in East US.

This costs nothing, because the production frontend is served from a
geo-distributed CDN regardless of its app region, and it is recorded because the
one-provider decision in §1 never implied one region and should not be read as
having done so.

A related trap from the same task: the subscription had never registered
`Microsoft.Web`, so the first create failed **while the region query that
preceded it succeeded** — an unregistered provider answers questions about
itself perfectly well.

### 17. A Static Web Apps deploy is not atomic, and the window holds two broken states

No documentation page names this. Reproduced on four deploys with a continuous
poll, and it is worse than Task 1.11.4 first recorded:

- The **incoming `index.html` is served while the incoming asset is still a
  404** — the document moves ahead of its own asset.
- Then the **outgoing asset is withdrawn while the outgoing `index.html` is
  still being served** — the document lags behind its own asset.

The window is about **two seconds**, propagation is not even monotonic (the old
asset flicked back to 200 after the new document went live), and **it opens at
the exact second the upload step reports success**. There is no flag that
removes it.

Anyone already on the page is unaffected, and `no-cache` on the document means
their next navigation revalidates. Uploads also **replace rather than merge**, so
a file dropped from the build is gone from the site.

Accepted deliberately. It is the frontend's half of the failed-deployment
criterion and it reads as the opposite of the backend's revision model, where a
failing rollout leaves the previous replica serving. **The timing is what
constrains anything built on top**: any check of the deployed page after a
deploy has to poll rather than check once, which is one of the two reasons §20
declines a smoke check.

### 18. The deploy is a separate workflow, and every build in it is invoked by name

`.github/workflows/deploy.yml` is triggered by `workflow_run` on `verify`
completing, and gated on that **run's** conclusion — never a step's, because
`continue-on-error` makes a step's `conclusion` read `success` however it exited
— plus `event == 'push'` and `head_branch == 'main'`, which together close the
hole a fork pull request from a branch called `main` would otherwise open.

**A separate workflow rather than a job in `verify.yml`, on three arguments that
are all properties of a workflow rather than of a job:**

1. The badge would otherwise report the deployment, which `README.md`'s own
   paragraph explicitly disclaims.
2. A cancelled deploy is worse than a cancelled verify because it is a half-done
   rollout — so it needs `cancel-in-progress` **off** and a queue of its own,
   which is the opposite of `verify`'s decision and was measured rather than
   assumed: two merges 95 s apart produced two runs whose jobs did not overlap,
   the second waiting 75 s in the queue.
3. The required status check keys on the job name `verify`.

Every build is invoked **by name** — `pnpm build` and `pnpm image` — so there is
no `tsc`, no `vite build`, no `docker build` and no `--build-arg` in the file.
**The platform's own generated workflow was declined outright** because it takes
an `app_location` and an `output_location` and **builds the site on the deploy
side**, which is ADR 0010 §2's forbidden shape wearing a different hat.

`pnpm build` builds Storybook too, which is time spent on an artefact this
workflow does not publish, and it was **not** narrowed to `vite build` — because
that would be this file defining its own build.

Both gate behaviours were made to happen. A **red `verify` on `main`** left a
deploy run created and **`skipped`** — a visible record rather than a silence
indistinguishable from a broken trigger.

### 19. There is no repository secret at all, and the official Static Web Apps action was declined on its own `action.yml`

`gh secret list` and `gh variable list` are both empty. GitHub authenticates to
Azure with a **federated identity credential (OIDC)** on app registration
`marketpulse-github-deploy`, holding `AcrPush` on the registry and `Contributor`
on the two apps — scoped per resource rather than to the resource group, which is
tighter than `HOSTING.md` originally intended. The container app still pulls with
its own managed identity (§7), so CI never needs pull credentials at all.

The Static Web Apps **deployment token** is fetched with
`az staticwebapp secrets list` at the moment of use and passed through one
command's environment. That was only reachable because
`Azure/static-web-apps-deploy`'s own `action.yml` was **read rather than
recalled**: it declares `azure_static_web_apps_api_token` as `required: true` and
offers **no** Azure-credential input, so the official action _cannot_ take an
OIDC login. It is declined with a reason rather than adopted because every
example does it.

**The OIDC subject finding will cost the next person a day.** GitHub presents an
ID-qualified subject for this repository —
`repo:theSmaw@429802/marketpulse@1351035456:ref:refs/heads/main` — and **not** the
documented `repo:owner/repo:ref:…`. The first deploy failed at `azure/login` with
`AADSTS700213`, and **the presented subject is readable only from the Azure
rejection**; nothing on the GitHub side prints it. Both credentials are kept, and
the numeric ids are stable across renames, which is the format's point.

The three ids in the workflow are literals on purpose: they are identifiers, not
credentials, all three are already published in a public repository, and none
authorises anything without a token whose claims match the federated subject.

### 20. Rollback is asymmetric, the fast half expires, and the documented mechanism does not exist on this app

**This is the decision Task 1.11.7 had to correct rather than confirm.**

A backend rollback is **not** a revision traffic shift.
`az containerapp ingress traffic set` is refused — _"configured for single
revision. Set revision mode to multiple in order to set ingress traffic"_ — so
traffic splitting and the revision-label FQDNs both require reconfiguring the
app first, during an incident, on the thing that is already misbehaving.

What works is **`az containerapp update --image <the previous digest>`**, which
needs only a digest every deploy run prints into its own summary:

| Half     | Mechanism                                     | Measured     |
| -------- | --------------------------------------------- | ------------ |
| Backend  | `az containerapp update --image <digest>`     | **43 s**     |
| Frontend | revert commit through `verify` and the deploy | **3 m 42 s** |

The asymmetry is ~5× and it runs the **opposite way to the intuition** — and
**the fast half expires**: it creates a new revision rather than reactivating an
old one, and the next merge silently undoes it, watched happening with nothing
warning anywhere. So the backend's rollback buys time and the durable fix is a
revert commit, exactly as the frontend's is. Static Web Apps has no revision
history at all on the Free plan.

**`workflow_dispatch` on `deploy.yml` is a re-deploy and not a rollback** — it
checks out `main`, so pressing it after a bad merge deploys the bad merge again.
And re-running a failed deploy is safe but **not a no-op**: §8's digest finding.

**Two declines, each with its trigger, because a decline is worth nothing
without one.** A **browser-based post-deploy smoke check** is declined: only a
real browser catches a wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL`
(§23), so a `curl` check would _look_ like coverage of that gap and cover none of
it, and a single-shot check would fire inside §17's upload window. The trigger is
a second environment to promote between, or that failure actually shipping.
**Notification** is declined: the run's conclusion and the platform's own state
are where a failure is visible, and the GitHub notifications inbox held nothing
for the failed run, checked. The trigger is a second maintainer, or any deploy
that can fire when nobody is watching.

**And the revision-wait step's failure branch was written blind and was wrong**,
which is the cleanest example in this epic of a check that has never failed being
a check that has never been tested. The pattern matched and the **deadline
expired 4 min 09 s before it could** — 300 seconds against a rollout that sits at
`Activating` for 10 min 03 s. The step now also reads the **replica**, which
carries `ready: false`, a rising `restartCount` and `CrashLoopBackOff` from ~75 s
in, taking a failing deploy to **94 s** naming the cause, with the deadline at
600 s as a backstop. Both branches were executed before the text landed.

### 21. One artefact per environment, and it now has numbers rather than a principle

ADR 0006 §6 declined a run-time configuration mechanism for the frontend. This
story is where that decision met a real second environment, and it holds — with
the cost stated:

| Build                                    | JavaScript            | `index.html`        |
| ---------------------------------------- | --------------------- | ------------------- |
| `pnpm build`                             | 344,537 B `3c886f88…` | 1,101 B `21577235…` |
| `VITE_API_BASE_URL=<backend> pnpm build` | 344,609 B `7654c2e0…` | 1,101 B `e1768b6b…` |

**The divergence is two files, and the second is the one that fools a size
comparison**: `index.html` differs at an **identical 1,101 B**, because it carries
the hashed script filename. Read the hash, on all four files.

So `verify`'s artefact is **not** the deployed artefact, `verify`'s job summary
now says so, and the deploy workflow fingerprints the build it actually ships.
The deployed bundle downloaded back from the CDN is **byte-identical** to a local
macOS build with the variable set — re-verified in Task 1.11.8 on all three
servable files.

**The reversal trigger is a rebuild per environment turning out to be genuinely
painful.** With one environment it is one extra string in one workflow file.

**Preview environments are declined as a consequence of this plus `CORS_ORIGIN`
holding exactly one string.** A preview gets its own origin, and a wildcard
admitting them would admit every Static Web App in the region — so a preview is a
page that loads perfectly and cannot call the backend. Both documented
preview-hostname patterns were also **wrong** and the environment name is
normalised, so a preview origin cannot be derived from a branch name even if one
wanted to allowlist it.

Deploying the frontend only when `apps/frontend` changed was **rejected on
correctness rather than effort**: the bundle inlines `packages/shared`, carries
`VITE_API_BASE_URL` from the workflow file, and is produced by a `vite.config.ts`
and a lockfile that both live outside `apps/frontend`. A path filter naming that
directory would skip deploys that genuinely changed the artefact and leave the
site **silently stale** — an unbounded silent window, against §17's bounded
two-second one.

### 22. The database is named now and provisioned in Epic 2

**Azure Database for PostgreSQL flexible server.** Deferring provisioning is only
free because the backend's platform has a managed Postgres adjacent to it; a
backend chosen with no database in scope would have made Epic 2 a second vendor
and a cross-network hop. That is the third reason §1 is one provider.

The cost of deferring is stated rather than hidden: the new-account offer is 12
months of Burstable **B1MS** at up to 750 hours a month, and **that window starts
at signup**, so every month before Epic 2 spends part of it.

Two things Epic 2 must not rediscover: the tier stays **B1MS** to stay inside the
offer, and the **networking mode has to be decided before creation** because the
service cannot change it afterwards — public access with a firewall rule is the
cheap path, private access via VNet integration is the correct one and costs the
Container Apps environment a custom VNet, which is not something to retrofit
under a running environment.

### 23. What crossed the frontend-to-backend boundary, and what was deliberately left to Story 1.12

**Scope taken from Story 1.12 is one `fetch` and one variable and nothing else.**
`apps/frontend/src/health-probe.ts` calls the deployed `/health` once at startup
from `main.tsx`, outside React entirely, and reports to the console. No client,
no state, no effect, no polling, no component; the body stays `unknown` so
`HealthResponse`'s promotion stays 1.12's payoff, and the file says it is meant
to be deleted.

A deployment story landing a data layer is the failure that decision avoids, and
it is also what leaves the React Compiler rules' first real test to 1.12's
polling effect.

**`exposedHeaders` is load-bearing, and this is the first time anywhere.** The
`x-request-id` the browser reads is the `reqId` in the backend's Log Analytics
records for that request — re-proved end to end in Task 1.11.8 with a real
browser: console reported
`answered 200 x-request-id: 9f678535-0436-46e1-87e8-52a7d0f3d593`, and the
workspace holds exactly two records under that `reqId`, `pid: 1`, `responseTime`
0.488 ms. Under real CORS the safelist is short and `x-request-id` is not on it,
so without `exposedHeaders` the header is simply not there.

**Story 1.8's rejection of a Vite proxy is what preserved that requirement rather
than hiding it.** Through a proxy the response is same-origin, every header is
readable, and the need for `exposedHeaders` would have been invisible until this
exact moment.

Zero `OPTIONS` records, as a simple `GET` predicts — re-counted over three hours
in Task 1.11.8.

**`strictImportMetaEnv` closed a silent-failure class no tool in `verify` could
see.** Vite types `ImportMetaEnv` with an index signature returning `any`, so
`import.meta.env.VITE_TYPO` typechecked and evaluated to `undefined`. Declaring
Vite's own `strictImportMetaEnv` in `apps/frontend/src/vite-env.d.ts` makes a
misspelled name **TS2551** with a suggestion. The stated cost: every variable is
declared in **two** places — `.env.example` and that file — and nothing
reconciles the pair — recorded in `CLAUDE.md`'s `pnpm verify` gap list as a
stated invariant nothing enforces, and deferred to Story 1.12, which brings the
second variable.

### 24. The workshop is not published

`storybook-static/` is 9.3 MB per build of an artefact nothing downstream
consumes. ADR 0010 §15 declined uploading it as a CI artefact and named
publishing it as a site as Story 1.11's question. The answer is no: it is a
second site, a second origin, a second thing to keep from rotting, for a
workshop that is a development tool. The reversal trigger is somebody outside
this repository needing to review components without running it.

A side effect had to be closed for the deploy to be correct at all: Storybook
reuses `vite.config.ts` and therefore inherited its `publicDir`, putting a
**second `staticwebapp.config.json`** in `storybook-static/` that the SWA client
globbed and preferred. `.storybook/main.ts` now sets `publicDir: false` in a
one-key `viteFinal` — a **divergence from that file's own standing "there is
deliberately no `viteFinal`"**, recorded as one. `staticDirs: []` was tried first
and does **not** work.

## Rejected, with reasons

| Rejected                                          | Why                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| One service for both halves                       | The artefact asymmetry is real; a single service pretends otherwise                                                              |
| App Service F1 / Render Free / Fly.io / Cloud Run | 5 sockets, 15-minute idle spin-down, $38/mo Postgres, 60-minute request cap — §1                                                 |
| Cloudflare Pages                                  | `_redirects` supports no 404 status, so its fallback is necessarily blanket — §14                                                |
| Netlify                                           | Expresses the fallback as cleanly; lost only to the one-provider decision. Standing alternative                                  |
| `injectWorkspacePackages: true`                   | Changes every developer's install to fix a deployment problem — §3                                                               |
| `pnpm start` in the image                         | A package manager and a Corepack fetch in a runtime image, to run the same command — §5                                          |
| A default on `ARG NODE_VERSION`                   | A second copy of the Node version that wins silently whenever the flag is forgotten — §6                                         |
| GHCR                                              | Free, and needs a pull credential this deployment otherwise does not have — §7                                                   |
| A `secrets` entry for symmetry                    | A secrets array holding a non-secret makes the first real secret unremarkable — §10                                              |
| The platform's TCP probes                         | Pass on any process that binds the port — §12                                                                                    |
| A blanket `navigationFallback`                    | Recreates the `vite preview` missing-asset trap in production — §14                                                              |
| The document's cache header as a route rule       | Route rules are not applied on fallback-served requests, so it would cover `/` and no route — §15                                |
| A deploy job inside `verify.yml`                  | Three properties of a workflow rather than of a job — §18                                                                        |
| The platform's generated workflow                 | Builds the site on the deploy side — §18                                                                                         |
| `Azure/static-web-apps-deploy`                    | Its `action.yml` declares the token `required: true` and offers no Azure-credential input, so it cannot take an OIDC login — §19 |
| A long-lived service-principal secret             | A federated credential exists and leaves no repository secret at all — §19                                                       |
| Revision traffic shift for rollback               | Refused on a single-revision app; reconfiguring during an incident — §20                                                         |
| A `curl` post-deploy smoke check                  | Looks like coverage of the browser-only gap and covers none of it — §20                                                          |
| Deploy notification                               | The run conclusion and platform state are where a failure is visible — §20                                                       |
| Preview environments                              | Own origin against a one-string allowlist; both documented hostname patterns wrong — §21                                         |
| A path filter on the frontend deploy              | Would skip deploys that genuinely changed the artefact, silently — §21                                                           |
| Publishing `storybook-static/`                    | A second site for a development tool — §24                                                                                       |
| `hadolint` / `actionlint` / `shellcheck`          | One or three small files each, against a root dependency and a `verify` step — see CLAUDE.md's gap list                          |

## Consequences worth stating separately

### What a green deploy certifies, and what it does not

It certifies that `verify` was green on the merge commit, that an image built
from that commit reached the registry, that a revision rolled out and its
replica became ready against an HTTP probe of `/health`, and that the frontend
upload reported success.

It does **not** certify that the deployed page can reach the backend. **A wrong
`CORS_ORIGIN` and a forgotten `VITE_API_BASE_URL` are both green everywhere and
broken only in a browser** — that is the honest limit of everything above. The
proof is Story 1.8's, re-run in production across three revisions: the browser
reported `TypeError: Failed to fetch` while `curl` with the same `Origin` got a
**200 with a full body** and the backend logged `statusCode: 200`. A forgotten
`VITE_API_BASE_URL` is worse, because it does not fail the build — it ships a
page dialling `http://localhost:3000` that an HTTPS page blocks as mixed content.

### Four failure classes, and no request ever returned a non-200

Task 1.11.7 made four classes of failure happen against the live environment,
and **no request returned a non-200 HTTP status through any of them**, with
`uptimeSeconds` never resetting. The failing revision held `trafficWeight: 100`
while `Activating` and the **old revision at weight 0 kept serving** — the fourth
sighting of that property. **Traffic weight is not what serves.**

A **half-deployed merge** was produced deliberately — backend at the merge
commit, frontend a commit behind, both answering, and not broken _only because
`/health`'s contract did not change in that commit_. That is the shape of the
risk rather than a reassurance.

### The image is not bit-reproducible across runs, and the frontend bundle is

Two findings that sit oddly together and are both true. The same commit rebuilt
in the pipeline produced **60,247,138 B against a recorded 60,247,220 B**. The
frontend bundle, by contrast, is byte-identical between a Linux runner and a
macOS laptop, verified by md5 on every file.

Also: there are at least **four** correct sizes for one image — `docker save`
60,266,496 B, the platform manifest 60,239,874 B, the registry read-back
60,247,220 B and the pull event 59,768,832 B. Different boundaries, not different
images. Say which one you mean.

### A check that runs from one machine over one link cannot tell its own network from the environment

A 65-second "outage" observed during Task 1.11.7 was the laptop, proved by a
three-host control and by the backend's own Log Analytics records showing 9
requests per 30 s through the supposed outage against a probe-only idle baseline
of 1–4. Anything Epic 15 builds for monitoring inherits this.

### Repository-invisible configuration is now the largest instance in the project

`deploy.yml` uses `update` and never `create`, and deliberately does not restate
the app's configuration. So **the three probes, `minReplicas: 1`, the ingress
target port, `HOST=0.0.0.0` and `CORS_ORIGIN` exist only in the platform**: no
file here holds them, `pnpm verify` cannot see them, and a future reader finding
them changed cannot tell whether that was deliberate. This ADR and `HOSTING.md`
are the only durable copy, exactly as ADR 0010 §17 is for the required status
check.

A script that reads the deployed configuration back and diffs it against a
recorded expectation is the obvious answer and **cannot be a `verify` step**,
because `verify` runs with no credentials. It is declined for now; the trigger is
a second environment, or one of these values being found changed with nobody
able to say why.

## Measured

### Acceptance criteria, re-run against the deployed environment (2026-09-03)

| Criterion                                                    | Result                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Merging to `main` deploys automatically                      | Re-run by merging this task's own work; `verify` → `deploy` on `workflow_run`                              |
| A development environment is reachable at a documented URL   | Both URLs in `README.md`; all four routes and a made-up path 200 with the 1,101 B document                 |
| Deployed backend `/health` responds successfully             | HTTP/2 200, `x-request-id`, `{"status":"ok","version":"0.0.0",…}`; a made-up path is the `ApiError` shape  |
| The deployed frontend communicates with the deployed backend | Browser console: `answered 200 x-request-id: 9f678535-…`; same id is the `reqId` in two Log Analytics rows |
| Environment configuration is managed by the platform         | Five env values on the app, `secrets` empty — for the backend; the frontend's is build-time (§21)          |
| A failed deployment is visible and does not take it down     | Four failure classes; no non-200 through any of them; old revision served at weight 0                      |
| _(Story 1.5)_ Deep-linking works on the deployed host        | Four routes deep-load cold; `/replay` renders `Market Replay` styled, one navigation entry                 |
| _(Story 1.5)_ The not-found route renders                    | `/no-such-page-1908` renders `No such page` in a browser; `/assets/nope.js` is a 404                       |

### The deployed environment

| Reading                            | Value                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Backend                            | `https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io`            |
| Frontend                           | `https://red-smoke-029583a0f.5.azurestaticapps.net`                                       |
| Resource group / regions           | `rg-marketpulse-dev`; backend, registry East US, frontend East US 2                       |
| Revision mode / scale              | **Single**; `minReplicas: 1`, `maxReplicas: 1`, 0.25 vCPU / 0.5 GiB                       |
| Replica                            | `ready: true`, `restartCount: 0`, `runningState: RunningAtMaxScale`                       |
| Probes                             | startup 30 @ 2 s, readiness 3 @ 10 s, liveness 3 @ 30 s — all `GET /health` on **:3000**  |
| Platform secrets                   | **none** — `secrets` is null; five plain env values                                       |
| Repository secrets / variables     | **none** — federated identity credential (OIDC)                                           |
| Pinned actions, counted from files | **5** distinct across **8** uses; `.github/dependabot.yml` present, `github-actions` only |
| Idle log volume                    | **16 records/minute** — 8 probe requests × 2 records; 345,600 requests/month of 2 M free  |
| `OPTIONS` records in 3 h           | **0**                                                                                     |

### The registry, and the retention arithmetic re-taken

| Reading                             | Value                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| Tags / manifests / untagged         | **10 / 13 / 3** — counting tags undercuts the real figure |
| Sum of `imageSize` across manifests | 602,398,151 B (574.5 MiB) — **not what is stored**        |
| **Actual registry usage**           | **76,112,906 B — 0.71% of the 10 GB included**            |
| Shared layers between two builds    | 4 layers, **58,486,244 B**, identical digests             |
| Per-build increment                 | **~1.75 MB**, not 60 MB                                   |
| Headroom at that rate               | **~6,000 deploy attempts**, not ~170                      |

### Cost, re-read from the Azure Retail Prices API

| Meter                          | Rate              | Note                                              |
| ------------------------------ | ----------------- | ------------------------------------------------- |
| Standard vCPU **Active** Usage | $0.000024 / s     |                                                   |
| Standard vCPU **Idle** Usage   | $0.000003 / s     | 8× discount                                       |
| Standard Memory Active Usage   | $0.000003 / GiB·s | **Identical to idle** — the discount is vCPU-only |
| Standard Memory Idle Usage     | $0.000003 / GiB·s |                                                   |
| Standard Requests              | $0.40 / 1M        | Probe requests are not billable                   |
| ACR Basic Registry Unit        | $0.1666 / day     | **$5.00/month**                                   |
| ACR Data Stored                | $0.10 / GB·month  | Beyond the 10 GB included                         |

Over a 30-day month at 0.25 vCPU / 0.5 GiB with `minReplicas: 1`, against free
grants of 180,000 vCPU-seconds and 360,000 GiB-seconds:

| Scenario               | Replica | Registry | **Total**  |
| ---------------------- | ------- | -------- | ---------- |
| At the **idle** rate   | $4.21   | $5.00    | **$9.21**  |
| At the **active** rate | $14.04  | $5.00    | **$19.04** |

Task 1.11.3's $9.21 estimate **reproduces exactly** from today's rates, and the
registry costing more than the replica it serves is confirmed.

**Whether the idle rate actually applies could not be settled, and the reason is
worth recording rather than hiding.** Both billing APIs refuse this subscription
— `az consumption usage list` and the Cost Management query API each return
_"Given subscription … doesn't have valid WebDirect/AIRS offer type"_ — and the
portal's Cost analysis blade rendered no data either. More decisively, **the
entire environment is under six hours old**: the first resource was created at
`2026-09-03T05:32:32Z` and Azure's cost data lags 8–24 hours, so there is no bill
to read yet. The task brief's premise that "by now there is one" was simply not
true at the time of writing.

So the question stays open with an owner: **Epic 2 re-reads it**, before adding a
database, and Epic 3 must re-take it regardless — a replica holding a live feed
bills at the **active** rate through every market session, which is the $19.04
column, and the free grant is 3.6× exceeded either way. The budget
(`marketpulse-monthly`, **$20**, alerts at 50/80/100% to the account owner) is in
place and was re-read; note that the active-rate total sits just **under** it,
so the budget would not fire on the exact change that matters most.

### Image retention: deferred, with the arithmetic that makes deferring correct

**Decision: no retention policy, and this is a decision rather than an
omission.** The arithmetic that was carried into this task — 60 MB per merge
against 10 GB included, so ~170 merges — is **wrong by a factor of about 35**,
because manifests share layers. Measured above: 13 manifests occupy 76 MB, two
pipeline builds share 58.5 MB of identical layer digests, and each additional
build costs ~1.75 MB. At one deploy attempt per merge that is roughly **6,000
merges** of headroom, and the registry is currently at **0.71%**.

Untagged-manifest retention is a **Premium** feature, so on Basic the only
options are a manual or scheduled purge — real work, for a problem that is three
orders of magnitude away. **The reversal trigger is registry usage passing 5 GB**,
which `az acr show-usage` reports in one line, or a move to Premium for another
reason.

One correction to the count itself: of the 3 untagged manifests, only **one** is a
genuine orphan from Task 1.11.7's re-run. The other two are the OCI image
manifest and the attestation beneath the local build's index (§9) — referenced by
that index, and not orphans at all. Counting untagged manifests as waste
overstates it.

### The laptop, on the shipping tree

| Reading                | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| `pnpm verify`          | **21 s**, exit 0 — seven steps                                                 |
| Tests                  | 118 fast (7 + 49 + 62) + 10 process                                            |
| `dist/`, default build | **4 files, 356,864 B**                                                         |
| `dist/`, deploy build  | **4 files, 356,936 B** — byte-identical to the CDN on all three servable files |

## Related

- ADR 0002 — the shutdown ceiling §5's grace comparison rests on, and
  `buildServer()` not listening
- ADR 0003 — the two artefact shapes §3 and §4 answer differently
- ADR 0005 — the deep-linking constraint §14 finally closes, and the route table
  the fallback has to serve
- ADR 0006 — build-time frontend configuration, which §21 met a second
  environment and kept; and the `.env.example` boundary §23 extends
- ADR 0007 — the `ApiError` shape a made-up deployed path answers in, and the
  correlation id §23 proves end to end
- ADR 0008 — server-side CORS over a Vite proxy, which §23 is the vindication of
- ADR 0010 — `pnpm verify` by name, which §18 does not re-define; the
  `continue-on-error` conclusion trap §18's gate avoids; and the required status
  check §18 keys around
- `HOSTING.md` — the quoted limit tables, rejected candidates and account facts
  this ADR is the reasoning over rather than a copy of
- Story 1.12 — the client, the state and the polling §23 deliberately left, and
  the first real test of the React Compiler rules
