# Hosting — MarketPulse

**Status:** Settled 2026-09-03
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Decided by:** [Task 1.11.1](TASK-01-choose-hosting-and-the-database-question.md), which deploys nothing
**Consumed by:** Tasks 1.11.2–1.11.8, and every deployment from Epic 2 onward

This is the platform decision, taken before anything is deployed so that the first failed deployment in this repository's history has one possible cause. It is the durable copy of facts that no file in this tree can hold — an account, a credential, a quota, a documented limit on somebody else's platform — in the same class as Story 1.10's repository ruleset.

**Every platform limit below is a quotation from vendor documentation, dated 2026-09-03, with the source named.** That is deliberate: the failure mode this task exists to prevent is a platform chosen on marketing and discovered on its limits three epics later, and a paraphrase of a limit is not evidence of one. **Re-read the source rather than citing this document** when a number decides something — the repository's own habit, and these numbers are on somebody else's release schedule.

## The decision, in one paragraph

Both halves are on **Microsoft Azure**, in **East US**, in one subscription. The frontend is **Azure Static Web Apps** on the Free plan; the backend is **Azure Container Apps** on the Consumption plan with a minimum replica count of **1**; the database is **Azure Database for PostgreSQL flexible server**, named now and **provisioned in Epic 2**. One provider serving both is a **decision and not a coincidence** — see below, because the two halves genuinely do not share a service and the argument for sharing a bill had to be made rather than assumed.

## One provider, two services — why that is a choice

Story 1.3 measured the asymmetry and it is the reason this section exists. The frontend's deployable unit is `dist/` alone — three files, 355,685 B, no `package.json`, no `node_modules`, no runtime — and the backend's is the **package directory**, which needs a Node runtime and a dependency tree. One needs a file server; the other needs a process supervisor. **No single Azure service serves both**, so "one provider" was never going to mean "one service", and the honest question was whether one _bill_ and one _identity boundary_ are worth anything.

They are, for three reasons that are specific rather than tidy-minded:

1. **The database is the real coupling.** Epic 2 needs managed PostgreSQL adjacent to the backend. A backend on one vendor and a database on another is a cross-network hop, a second credential and a public endpoint where a private one would do. Choosing the backend's host is therefore choosing the database's, and this is the whole content of the "answer the database question either way" instruction.
2. **One identity boundary for the deploy credential.** Both deploys are driven from the same GitHub Actions workflow (Task 1.11.6). One subscription means one federated identity rather than two vendors' tokens in the same repository's secrets.
3. **One free-tier envelope to reason about.** Two vendors' free tiers is two sets of quotas that expire on two schedules. The costs and limits below are one table.

What it is **not** chosen for: the two services share no networking, no configuration mechanism and no deployment shape, and pretending otherwise is how Task 1.11.3 and Task 1.11.4 would get written as one task. They are separate for the reason STORY.md gives.

## The frontend — Azure Static Web Apps, Free plan

### Why, and what it beat

The deciding property is not price, CDN or build integration — every candidate has those. It is that **Static Web Apps can express Story 1.5's fallback constraint and the alternatives cannot.**

Story 1.5 requires three things of a history-API fallback: `index.html` with a **200** rather than a redirect; **not** a blanket catch-all, because one that answers a missing asset with `index.html` reproduces the `vite preview` trap in production and a partial upload then looks like a broken application with no error naming the file; and a made-up path still reaching `NotFound`. Static Web Apps' `navigationFallback` has an `exclude` array, and the documentation carries a worked table of exactly this behaviour:

> ```json
> {
>   "navigationFallback": {
>     "rewrite": "/index.html",
>     "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
>   }
> }
> ```
>
> | Requests to…                                                                                           | returns…                | with the status… |
> | ------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------- |
> | _/about/_                                                                                              | The _/index.html_ file. | `200`            |
> | _/images/unknown.png_                                                                                  | File not found error.   | `404`            |
> | _/css/unknown.css_                                                                                     | File not found error.   | `404`            |
> | Any other path outside the _/images_ or _/css_ folders that doesn't match the path to a deployed file. | The _/index.html_ file. | `200`            |
>
> — [Configure Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration), _Fallback routes_

That table is Story 1.5's three constraints and Task 1.6.5's hand-built fallback, as a supported product feature. `exclude: ["/assets/*"]` is the whole configuration, and Task 1.11.4 owns writing and **verifying** it — including against a made-up asset, which is the check that distinguishes this from a catch-all.

**And it costs the artefact its three-file shape, which is the one concrete consequence of this decision that reaches the repository.** The file's location is not optional: "if there's a build step, you must ensure that the build step outputs the file to the root of the output\_location". So `staticwebapp.config.json` is a **fourth file in `dist/`**, and the 355,685 B / three-file / md5 `cba2825c…` fingerprint that has reproduced byte-for-byte since Task 1.7.7 — across two clean clones, both platforms and five stories — stops being true the moment Task 1.11.4 lands. Unlike the backend, whose configuration lives in a platform panel, **the frontend's host configuration is part of its artefact**. That figure is quoted in `README.md`, in `CLAUDE.md` and in several planning documents, so Task 1.11.8 owes a `grep` for it rather than a memory of where it appears.

The rejected alternatives were rejected on that one property, having been checked rather than assumed:

- **Azure Storage static website hosting** — a different product from Static Web Apps, and its `404` document is a single global setting with no notion of excluding a path. Blanket or nothing.
- **App Service serving the static files** — a Node process to serve three files, a second thing to keep running, and the fallback becomes application code.
- **Netlify** — the one non-Azure host that expresses it as cleanly (`/assets/* /404.html 404` above `/* /index.html 200`, with existing files shadowing rules). Rejected on the one-provider decision above, not on capability. It is the standing alternative if Static Web Apps ever fails this story.
- **Cloudflare Pages** — `_redirects` supports only 301/302/303/307/308 plus a 200 rewrite. **No 404 status**, so the fallback is necessarily a blanket catch-all. Rejected on the constraint.

### What the Free plan gives, quoted

From [Quotas in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas), Free plan column:

| Limit                              | Free plan   | Our position                                          |
| ---------------------------------- | ----------- | ----------------------------------------------------- |
| Included bandwidth (per month)     | 100 GB      | The artefact is 355,685 B over three files            |
| Overage bandwidth                  | Unavailable | So the failure mode is a **cut-off**, not a bill      |
| Apps (per subscription)            | 10          | One                                                   |
| Preview environments               | 3           | Task 1.11.6 decides whether to use them               |
| Storage (single environment)       | 250 MB      | 355,685 B — 0.14% of it                               |
| File count                         | 15,000      | Three                                                 |
| Custom domains                     | 2           | None planned in this story                            |
| Private endpoint / IP restrictions | Unavailable | **The environment is public.** See _Protection_ below |

"Overage bandwidth: Unavailable" on Free is the one to know: the Free plan does not bill for excess, so exceeding 100 GB stops service rather than producing an invoice. At 355 KB per cold load that is not a near-term risk, and it is written down because it is a _different_ failure shape from the paid plans.

**The Standard plan is $9/app/month** and buys IP restrictions, private endpoints, 10 preview environments and an SLA. Not taken: the Free plan's caps are three orders of magnitude above this artefact, and an SLA on a development environment is a purchase with no claim behind it.

### Cache policy is expressible, and it is Task 1.11.4's

Story 1.3 left cache policy untouched and named the shape it wants: the JS and CSS filenames are content-hashed and `index.html` is not, so `assets/` wants immutable caching and `index.html` wants none. Both are configuration rather than code — `globalHeaders` for the document default, and a per-route `headers` block for the hashed assets, which the documentation demonstrates directly:

> ```json
> {
>   "route": "/images/thumbnails/*.{png,jpg,gif}",
>   "headers": {
>     "Cache-Control": "public, max-age=604800, immutable"
>   }
> }
> ```

Note the ordering trap Task 1.11.4 has to respect, stated in the same document: **"Route rules aren't applied on requests that trigger `navigationFallback`."** So a route rule and the fallback are two mechanisms, not one, and a cache header hung on a route that the fallback answers will not apply.

## The backend — Azure Container Apps, Consumption, minimum replicas 1

### Weighed against Epic 3 and Epic 10, not against today's `/health`

Every candidate serves a `/health` route perfectly, so that comparison decides nothing. The two requirements that break a wrong choice are a **persistent WebSocket connection to Alpaca** (Epic 3) and **long-running agent execution** streamed to the browser (Epic 10). Read against the documented limits, those two turn out to be constrained by **different mechanisms**, and conflating them is the mistake this section exists to prevent.

**The Alpaca WebSocket is outbound, so no ingress limit applies to it.** This is the correction worth carrying: the reflex is to read a platform's request-timeout number and conclude the market feed will be cut every N minutes, and it is wrong, because our server _dials_ Alpaca — the connection never traverses the ingress proxy in the inbound direction the timeout governs. What actually threatens it is the **replica not existing**, and that is a scaling setting rather than a timeout.

**Epic 10's agent stream is inbound, so the ingress limit is exactly what applies to it.** PRODUCT_SPEC's intended stack puts agent investigation events on SSE/streaming HTTP, which is an inbound request held open — squarely inside the timeout.

### The documented numbers

**Scale to zero is the default and must be turned off.** From [Scaling in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/scale-app):

> | Scale limit                             | Default value | Min value | Max value |
> | --------------------------------------- | ------------- | --------- | --------- |
> | Minimum number of replicas per revision | 0             | 0         | 1,000     |
>
> "If you want to ensure that an instance of your revision is always running, set the minimum number of replicas to 1 or higher."

and the default rule if none is configured:

> | Trigger | Min replicas | Max replicas |
> | ------- | ------------ | ------------ |
> | HTTP    | 0            | 10           |

So **`minReplicas: 1` is a required setting, not a tuning knob** — left at the default the backend scales to zero, the Alpaca socket dies with the replica, and the cold start is charged to whoever loads the page next. Task 1.11.3 owns setting it and Task 1.11.8 owns confirming it is still set.

**The inbound request timeout is 240 seconds on the default ingress.** From [Ingress in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview), listing what HTTP ingress provides:

> - Support for WebSocket and gRPC
> - …
> - Request time out is 240 seconds

Two things follow, and the second is the useful one. WebSocket and gRPC are supported at all, which not every serverless container platform can say. And the premium-ingress settings table names the same number as an **idle** timeout, which is what tells us the 240 s is a ceiling on silence rather than on connection age — from [Configure ingress in an Azure Container Apps environment](https://learn.microsoft.com/en-us/azure/container-apps/ingress-environment-configuration):

> | Setting                  | Description                                                                                                                  | Minimum | Maximum | Default |
> | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ------- |
> | Termination grace period | The amount of time (in seconds) for the container app to finish processing requests before they're canceled during shutdown. | 0       | 3,600   | 500     |
> | Idle request timeout     | Idle request timeouts in minutes.                                                                                            | 4       | 30      | 4       |

The premium minimum of 4 minutes **is** the default's 240 seconds, named as idle. **Epic 10's constraint, stated now rather than discovered then: an SSE stream must emit something at least every four minutes or the ingress will close it.** That is a keep-alive comment on the stream — a line of code — and it is a cheap constraint precisely because it was written down before the stream existed. The expensive alternative is on record too: premium ingress raises the idle timeout to 30 minutes, but requires a **dedicated workload profile** (D4–D32, "The minimum number of node instances is two", billed at the profile rate), which is a large bill for a development environment. Not taken; recorded so nobody re-derives it.

**The shutdown ceiling fits, and the number is quoted rather than asserted.** Story 1.2 chose a 5-second `SHUTDOWN_TIMEOUT_MS` to sit inside Docker's 10 s stop grace and Kubernetes' 30 s `terminationGracePeriodSeconds`, and this story owed the comparison against the orchestrator actually chosen. From [Application lifecycle management in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/application-lifecycle-management):

> When a shutdown starts, the container host sends a SIGTERM message to your container. The code in the container can respond to this operating system-level message to handle termination.
>
> If your application doesn't respond within 30 seconds to the `SIGTERM` message, then SIGKILL terminates your container.

So the 5 s ceiling and the ten tests behind it (Task 1.10.5) sit inside it with 25 seconds to spare, and Story 1.2's guess about a plausible orchestrator turned out to be exactly right. (**This paragraph originally asserted the 30 seconds without a source** — correct, but a citation-shaped claim in a document whose whole premise is quotation. Re-read and quoted 2026-09-03, in the same change that amended Tasks 1.11.2–1.11.8.) **Task 1.11.2 owns confirming the container gets `SIGTERM` as PID 1** — the one container question Story 1.2 could not close — and this platform choice does not close it either.

**Three container constraints that follow from the platform and are easy to meet only if known in advance.** The image must be `linux/amd64` — "Linux-based (`linux/amd64`) container images are required" — and the development machine is Apple Silicon, so the default local build is the wrong architecture and **runs perfectly in every local check before failing on the platform**. The Consumption plan takes fixed CPU/memory pairs rather than arbitrary values, starting at **`0.25` vCPU with `0.5Gi`**, which is the pair the cost arithmetic below assumes and the envelope the server has to start inside. And **Container Apps runs images from a registry and nothing else**, so a registry is a prerequisite of the first deploy: the choice was Azure Container Registry against GitHub Container Registry, and **Task 1.11.3 took ACR Basic** on the managed-identity argument — see _The container registry_ below, which carries the measured rates, the finding that the registry costs more than the compute it serves, and the image, digest and tag rules that go with it.

**The platform's default health probes are TCP and never touch `/health`.** With ingress enabled the defaults are a Startup probe (TCP on the ingress target port, timeout 3 s, period 1 s, initial delay 1 s, failure threshold 240), a Liveness probe (TCP, same port) and a Readiness probe (TCP, timeout 5 s, period 5 s, initial delay 3 s, failure threshold 48). **A TCP probe passes on any process that binds the port**, which is exactly the case `/health` exists to distinguish, so configuring an HTTP probe is an action Task 1.11.3 has to take rather than a default it inherits. The readiness numbers matter again in Task 1.11.7: 48 failures at a 5-second period is about **four minutes** before a bad revision is declared unhealthy, and what the previous revision serves during that window is what the "a failed deployment does not take the environment down" criterion is actually about.

### What it beat, on Azure

- **App Service, Free F1** — three separate disqualifications, any one of which is fatal, all from [App Service limits](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits): **web sockets per instance is 5**; CPU time is capped at **60 minutes per day**; and, from [Azure App Service plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans), "In the Free and Shared tiers, an app receives CPU minutes on a shared VM instance and can't scale out" — there is no Always On, so the app unloads when idle. Free F1 is not a cheaper version of this decision; it is a platform that cannot hold Epic 3 at all.
- **App Service, Basic B1 (~$13/mo)** — genuinely viable: Always On is available from Basic up, and the limits table gives Basic **350 web sockets per instance** (Standard and Premium: unlimited). Rejected on shape and price rather than capability. It is a VM-shaped model, so it wants a second artefact shape beside the container Task 1.11.2 has to build anyway, and it is roughly 3–4× the Container Apps figure below for a development environment. **It is the standing alternative** if Container Apps' 240 s idle timeout ever becomes the binding constraint — App Service's own idle timeout is raisable to 1800 s via `WEBSITES_CONTAINER_IDLE_TIMEOUT`, and web sockets must be explicitly enabled there (`WEBSOCKETS_ENABLED`), which is a trap worth having written down before anyone migrates.
- **App Service, Standard S1 (~$70/mo)** — unlimited web sockets and deployment slots. Far more than a development environment with one route needs; revisit at Epic 15, not here.
- **Azure Functions** — a per-invocation model for a process whose defining requirement is that it stays up holding a socket. Structurally wrong, not merely expensive.

### What it beat, off Azure — recorded because the alternatives were measured before Azure was chosen

The shortlist that existed before the one-provider decision, kept so the grounds are on record rather than implied:

- **Render** — Free spins down after "15 minutes without receiving any inbound traffic", and an _outbound_ socket to Alpaca is not inbound traffic, so Free is fatal at Epic 3 exactly as F1 is; paid Starter is $7/mo and does not spin down, and Render's WebSocket documentation is the most explicit of any candidate (no fixed idle timeout, no maximum connection duration). The best non-Azure answer.
- **Fly.io** — cheapest always-on compute (`shared-cpu-1x` at $2.02/mo for 256 MB, $3.32 for 512 MB) and autostop can be disabled outright. Its own long-running-tasks blueprint states the hazard plainly — "The proxy looks at inbound traffic. It does not look inside the container" — and its managed Postgres starts at **$38/mo**, which is what removes it: the database coupling above cuts against it hardest.
- **Google Cloud Run** — rejected on a documented hard cap rather than a preference: the request timeout maxes at "60 minutes (3600 seconds)", and "WebSockets streams are HTTP requests, which are still subject to the request timeout configured for your Cloud Run service."

## Cost, and the free-tier envelope

The subscription is a **new Azure free account**, so two distinct things are in play and they expire on different schedules: the always-free service grants, and the 12-month offers.

**Container Apps, Consumption plan** — from [Billing in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/billing):

> The following resources are free during each calendar month, per subscription:
>
> - The first 180,000 vCPU-seconds
> - The first 360,000 GiB-seconds
> - The first 2 million HTTP requests

**An always-on replica exceeds that grant, and the arithmetic is why this is not a free deployment.** A 30-day month is 2,592,000 seconds; the smallest sensible replica at 0.25 vCPU / 0.5 GiB therefore consumes 648,000 vCPU-seconds and 1,296,000 GiB-seconds — 3.6× the vCPU grant. What keeps the bill small is the **idle rate**, which this configuration is specifically eligible for:

> To be eligible for idle charges, a revision must be:
>
> - Configured with a minimum replica count greater than zero
> - Scaled to the minimum replica count
>
> …A replica is considered idle when _all_ of the following conditions are true:
>
> - The replica is running in a revision that is currently eligible for idle charges.
> - All of the containers in the replica have started and are running.
> - The replica isn't processing any HTTP requests.
> - The replica is using less than 0.01 vCPU cores.
> - The replica is receiving less than 1,000 bytes per second of network traffic.

**Task 1.11.3 did the arithmetic, and it corrects the framing above in one respect that matters.** Rates from the Azure Retail Prices API, East US, USD, 2026-09-03:

| Meter                      | Rate                       |
| -------------------------- | -------------------------- |
| Standard vCPU Active Usage | $0.000024 / vCPU-second    |
| Standard vCPU Idle Usage   | $0.000003 / vCPU-second    |
| Standard Memory Active     | $0.000003 / GiB-second     |
| Standard Memory Idle       | **$0.000003 / GiB-second** |
| Standard Requests          | $0.40 / million            |

**The idle rate is a vCPU discount and nothing else — memory bills at the same rate idle or active.** That is read off the price list rather than inferred, and it is the correction: the section above reads as though the idle rate is what keeps the whole bill small, and it keeps _part_ of it small. Over a 30-day month a 0.25 vCPU / 0.5 GiB replica is 648,000 vCPU-seconds and 1,296,000 GiB-seconds; net of the 180,000 and 360,000 free grants that is 468,000 and 936,000 billable:

|                         | vCPU   | Memory | Total      |
| ----------------------- | ------ | ------ | ---------- |
| Always-on, fully idle   | $1.40  | $2.81  | **$4.21**  |
| Always-on, fully active | $11.23 | $2.81  | **$14.04** |

So idling saves **$9.83/month, not the bill** — and memory is the larger half of the idle figure. With ACR Basic at $5.00 the expected total is about **$9.21/month**, of which the registry is 54%.

**One charge that would dwarf all of it does not apply, and it is worth naming because the meter exists and looks alarming.** There is an `Environment Management Hour` meter at $0.10/hour — $73/month — and it is not charged here: "You aren't billed any plan management charges unless you use a Dedicated workload profile in your environment." The same doc adds that **private endpoints and planned maintenance trigger that charge regardless of plan**, which is a second reason beyond the Free plan's limits not to reach for a private endpoint on this environment.

So the expected bill for this story is a **few dollars a month**, and the estimate carries a stated expiry: **Epic 3 breaks the idle conditions on purpose.** A replica holding a live Alpaca feed is processing traffic during market hours and will not meet "less than 1,000 bytes per second", so it bills at the active rate for part of every weekday. **Do not carry this figure into Epic 3 — re-take it there.** That is the same rule this repository applies to every other measurement, and it is easier to obey when the trigger is named in advance. Health probe requests are not billable, which matters because Task 1.11.3 adds one.

**Static Web Apps** — Free, with the caps in the table above and no overage billing.

**Azure Database for PostgreSQL flexible server** — free for 12 months on a free account, at "up to 750 hours of Burstable B1MS instance", plus "32 GB storage and 32 GB backup storage". 750 hours is continuous operation for a month.

**The bill to watch is Container Apps, and the trigger to re-take it is Epic 3.** A budget and a cost alert on the subscription are the mitigation; Task 1.11.3 is where they get set, because that is the first task that creates a billable resource.

## The container registry — Azure Container Registry, Basic

**Decided 2026-09-03 by Task 1.11.3, which created nothing.** Container Apps runs images from a registry and nothing else, so this is a prerequisite of the first deploy rather than a detail of it.

**The choice is ACR Basic over GitHub Container Registry, and it was taken on the authentication mechanism rather than on price — which is just as well, because on price it loses.** ACR authenticates from Container Apps by **managed identity with the `acrPull` role**: there is no password, no token and nothing in the app's `secrets` array, and a credential that cannot be replayed is worth more than one that is merely rotated. That is the same principle that pins every GitHub Action to a commit SHA (Story 1.10) and that chose a federated identity credential over a service-principal secret above. GHCR is free for this repository and sits beside the source, and Container Apps would pull from it with a **stored personal access token** — a long-lived secret in the app's configuration, which is the shape this repository has now declined three times.

**Docker Hub is disqualified rather than merely rejected**, and the documentation warns it off by name: rate limits are enforced against anonymous pulls, and "When the limit is reached, containers in your app fail to start". That is a failure that arrives on a scale-out or a restart, long after the deploy that introduced it went green — the worst available shape.

### What it costs, and the finding is that the registry outweighs the thing it serves

Every figure below is read from the **Azure Retail Prices API** (`prices.azure.com/api/retail/prices`, `armRegionName eq 'eastus'`, USD, 2026-09-03) rather than from the pricing page, which renders its numbers in JavaScript and shows `$-` to a fetch. That is the difference between a quotation and a citation, which is this document's whole premise.

| Meter                      | Rate               |
| -------------------------- | ------------------ |
| Basic Registry Unit        | **$0.1666 / day**  |
| Data Stored (beyond 10 GB) | $0.10 / GB / month |

So the registry is **$5.00 in a 30-day month**, and the 60,266,496 B compressed image Task 1.11.2 produced uses 0.6% of the included 10 GB — storage will not be the variable.

**Put beside the compute it exists to serve, that is 54% of the bill for the least interesting resource in the deployment.** The arithmetic is in the cost section above and comes to $4.21/month for the always-on replica. **This was not known when the choice was made, and it is recorded here rather than quietly reversed**: the managed-identity argument is still the argument, and $5/month is a defensible price for removing a long-lived secret from the platform. **The reversal trigger is the bill mattering** — if the subscription's total becomes a reason to economise, GHCR is the first thing to move, it is free, and the cost of moving is one image reference and one pull secret.

### The image is an index, not a manifest, and the provenance record is the index digest

Read out of the image Task 1.11.2 built rather than assumed. `index.json` holds one `application/vnd.oci.image.index.v1+json`, and inside it are **two** manifests:

| Manifest                                 | Media type                                              | Platform          |
| ---------------------------------------- | ------------------------------------------------------- | ----------------- |
| the real image                           | `application/vnd.oci.image.manifest.v1+json`            | `linux/amd64`     |
| a buildx attestation (provenance + SBOM) | same, `vnd.docker.reference.type: attestation-manifest` | `unknown/unknown` |

Three things follow, and the third is the one Task 1.11.6 needs settled.

**The attestations are kept, deliberately.** `--provenance=false --sbom=false` is the alternative shape and produces a plain single-platform manifest with no `unknown/unknown` entry; it was not taken, because the attestations are what make a provenance claim mean anything and they cost a manifest nobody reads. The `unknown/unknown` entry is what older tooling chokes on, and **the reversal trigger is any tool in the deploy path refusing the index** — at which point the two flags are the fix and the claim gets weaker.

**Whether ACR accepts an index is not confirmed.** The documentation says so and this task could not test it, because no registry exists. **The deploy half of Task 1.11.3 is where that gets proved, and a future reader finding this sentence still here should read it as untested.**

**The provenance record is the _index_ digest, not the platform image's.** There are two, and "pin the digest" is ambiguous without this sentence. The index digest is what a `repo@sha256:...` reference resolves, so it is what the platform actually pulls; it is the only one of the two that **covers the attestations**, so pinning the platform manifest would pin the image while discarding the provenance it is supposed to evidence; and the platform digest stays reachable from the index, so pinning the index loses nothing. The cost is stated rather than hidden: **the index digest moves when the attestation content moves even if the image bytes do not**, so it identifies the build rather than only the runnable artefact. That is the right thing to pin for provenance and the wrong thing to compare two builds' outputs with — for that, read the platform manifest digest.

### What a commit-SHA tag is allowed to mean

**A commit-SHA tag means the tree is exactly that commit.** Nothing else may wear one.

The rule exists because it was already broken once. Task 1.11.2 built its image before committing, so it is tagged `03a3b63` — the **parent** commit — while the tree inside it is `de960ce`. The tag names a commit that does not describe the image, which is precisely the one question a registry tag exists to answer.

`scripts/build-image.mjs` is what enforces it, and `pnpm image` is now that script rather than a one-line recipe in `package.json` — which also puts the logic inside ESLint's and Prettier's net, unlike `apps/backend/Dockerfile` and the root `.dockerignore`, which no tool in `pnpm verify` reads. Three behaviours, all exercised rather than described:

- **Clean tree** → the bare short SHA (`b103e6c`).
- **Dirty tree** → the same SHA with a **`-dirty`** suffix (`b103e6c-dirty`), plus a line saying the tag names a tree that is not any commit and must not be pushed. Refusing outright was the alternative and was rejected on what it costs: iterating on a `Dockerfile` from a work-in-progress tree is the normal case, and a recipe that blocks it teaches people to bypass the recipe. A suffix is loud where it matters and absent where it does not.
- **`MARKETPULSE_IMAGE_TAG` set** → that tag verbatim. This is Task 1.11.6's door: a pipeline knows the commit it was triggered for and should tag from that rather than from whatever `HEAD` resolves to inside a checkout step — usually the same, and **not** the same for a `pull_request` run, which checks out the merge commit.

**The one hole in that rule was looked for and is closed by something else, which is worth knowing because it is what keeps the rule sound rather than merely plausible.** The dirty check keys on git's view of the tree and the build context keys on `.dockerignore`'s, and **those are not the same list** — `.gitignore` alone carries `tmp/`, `.tmp/` and `temp/`, so a file there is invisible to the tag and would, in principle, be a change to the image that the tag does not name. It cannot be, because **`apps/backend/Dockerfile` copies named paths rather than the context**: four root files, `packages/shared` and `apps/backend`, and nothing else. Everything gitignored _inside_ those paths — `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `.env` — is dockerignored too. So the selective `COPY` is load-bearing for the tag's honesty as well as for the build, and replacing it with a `COPY . .` would quietly reopen this.

(Found by tripping over it: a throwaway `git rev-parse --git-path info/exclude` written while testing the clean-tree branch resolved to the **common** git directory rather than the linked worktree's, so a test-setup line landed in the main repository's `.git/info/exclude` and made a new source file invisible to `git status`. Harmless and reverted, and a fair demonstration of the class — an exclude mechanism that hides a file from git hides it from this check too.)

**What counts as dirty is the working tree, not the index**, and this is the half that is easy to get wrong. A build context is assembled from the working tree rather than from git — the same property that makes the root `.dockerignore`'s `.env` entry load-bearing — so an **untracked** file is as much a part of what got built as a modified tracked one. `git status --porcelain` reports both and honours `.gitignore`, which is why it is the check rather than `git diff --quiet`.

## The database — named now, provisioned in Epic 2

**The service is Azure Database for PostgreSQL flexible server, in East US, in the same subscription and resource group as the backend.** That is the answer to the provider half, and it is the half that had to be answered here: deferring provisioning is only free because the platform chosen for the backend has a managed Postgres adjacent to it. Had the backend gone to a provider with no database story, Epic 2 would have become a second vendor and a cross-network hop, and the deferral would have been a hidden cost rather than a saving.

**It is not provisioned now**, because this story stores nothing and an instance with no schema and no reader is idle cost with an operational surface. What Epic 2 must do, named here so it is not rediscovered:

- Create the flexible server in **East US**, in the backend's resource group, on the **Burstable B1MS** tier to stay inside the free offer.
- Choose the networking mode at creation — the quickstart is explicit that you "can't change it after creation". Public access with a firewall rule is the cheap path; private access via VNet integration is the correct one and costs the Container Apps environment a custom VNet. **Decide it in Epic 2 before creating the server, not after.**
- Add the connection string through the platform's configuration, as a **secret** rather than a plain environment variable, and extend `CONFIG_VARIABLES` and `apps/backend/.env.example` together so `pnpm env:check` keeps the pair honest.

**What would make the deferral painful, stated honestly:** the 12-month free window starts at subscription creation, not at first use, so every month between now and Epic 2 is a month of that offer spent on nothing. That is the cost of deferring and it is accepted — the alternative is an idle database with a public endpoint and an admin password in a repository that has no use for either. **The reversal trigger is Epic 2 starting, or any earlier task discovering that the networking decision above forces a change to the Container Apps environment** — because a custom VNet is not something to retrofit under a running environment.

## Reversal cost — and it is not one file

Story 1.10 recorded CI's reversal cost as "one YAML file", and that is only true because the pipeline runs `pnpm verify` by name and defines nothing of its own. **Deployment cannot be that cheap, and saying so precisely is this section's job.** Moving hosts means changing all of:

1. **A container definition** — the `Dockerfile` (or equivalent) Task 1.11.2 produces from `pnpm deploy --filter`, plus its base image and working directory. This is the most portable piece; a container runs elsewhere.
2. **Two platform configurations** — the Container App's ingress, scale, probe and secret settings, and `staticwebapp.config.json`. **The second is the least portable thing here**: `navigationFallback`, `globalHeaders` and the route `headers` are Static Web Apps' own vocabulary, and every candidate host spells the same three intentions differently. It lives in the repository, so it moves _with_ the repository and still has to be rewritten.
3. **The deploy jobs in `.github/workflows/`** — two of them, with two different actions and two different credentials.
4. **The federated credential and the subscription's role assignment**, neither of which is in this tree.
5. **`CORS_ORIGIN`**, because it names the frontend's origin and the frontend's origin is the host's.
6. **A rebuild of the frontend**, because `VITE_API_BASE_URL` is statically substituted at build time — so the artefact is bound to the backend's address and cannot be promoted, only rebuilt.
7. **Two published URLs**, which is the item with no engineering cost and the longest tail.

**Item 6 is the one that surprises people**, and it is Story 1.6's finding arriving in production: one artefact cannot be promoted across environments, so "point the frontend at the new backend" is a build, not a setting.

## The development environment — URL, protection, stability

The acceptance criterion asks for a development environment reachable at a documented URL. Both halves have a stable default hostname and neither needs a custom domain for this story.

**Backend.** From [Communicate between container apps](https://learn.microsoft.com/en-us/azure/container-apps/connect-apps), an externally-visible app's FQDN is:

> `<APP_NAME>.<ENVIRONMENT_UNIQUE_ID>.<REGION>.azurecontainerapps.io`

resembling `myapp.happyhill-70162bb9.canadacentral.azurecontainerapps.io`. The environment identifier is a property of the **environment**, so the hostname is stable across revisions and deploys and changes only if the app or the environment is recreated. Revisions can additionally be addressed individually via label FQDNs (`<APP_NAME>---<LABEL>.…`), which is the mechanism Task 1.11.7 should look at for proving a failed deployment does not take the environment down.

**Frontend.** The production environment is served from the app's default hostname; preview environments take the documented form:

> `<DEFAULT_HOST_NAME>-<BRANCH_OR_ENVIRONMENT_NAME>.<LOCATION>.azurestaticapps.net`

with a pull request's temporary environment suffixed by its PR number, and branch and named environments getting stable URLs. Two documented limitations to carry into Task 1.11.4: **"Custom domains do not work with preview environments"**, and **"Pre-production environments aren't geo-distributed."**

**Protection: there is none, and that is deliberate.** IP restrictions and private endpoints are marked "Unavailable" on the Static Web Apps Free plan, and Container Apps' IP restrictions would block a browser as readily as anything else. The environment is public. That is the right answer for this story for a reason beyond cost: **Task 1.11.5's cross-origin check cannot be done with `curl`** — Story 1.8 measured that with a string origin the server asserts `access-control-allow-origin` unconditionally and the browser is the only party that compares — so anything standing between a browser and the deployed frontend makes that criterion unverifiable. What makes public acceptable is the shape of what is deployed: no authentication, no user data, no credentials, and a backend whose entire surface is `GET /health`. **That stops being true the moment Epic 2's Alpaca key is on the platform**, and this paragraph is the record of when to revisit it.

## Account facts — the durable copy

This is the class of fact Story 1.10 recorded for its repository ruleset: real configuration that no file here can hold, where the write-up is the only copy a future reader gets.

| Fact                       | Value                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud                      | Microsoft Azure                                                                                                                                          |
| Subscription id            | `5104e168-b3de-41c2-92a8-c68d28bd4d16`                                                                                                                   |
| Tenant id                  | `6069915b-5bf2-4e36-8b25-8ffb25b5fdd1`                                                                                                                   |
| Subscription type          | Azure free account (12-month offers plus the always-free grants)                                                                                         |
| Region                     | East US, for both halves and the eventual database                                                                                                       |
| Resource group             | `rg-marketpulse-dev` (East US)                                                                                                                           |
| Container Apps environment | `cae-marketpulse-dev`, unique id **`blackgrass-e682fefb`**, `WorkloadProfiles` mode with a **Consumption profile only**, no VNet                         |
| Backend URL                | **<https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io>**                                                                       |
| Backend identity           | System-assigned, principal `fe8a2ecd-719c-407e-94d4-629015bd889d`, `AcrPull` on the registry                                                             |
| Log destination            | Log Analytics workspace `log-marketpulse-dev`, **30-day retention**, `PerGB2018` — $2.30/GB ingested, $0.10/GB/month retained beyond the included period |
| Budget                     | `marketpulse-monthly`, **$20/month**, actual-cost alerts at 50 / 80 / 100% to the account owner                                                          |
| Frontend service           | Azure Static Web Apps, **Free** plan                                                                                                                     |
| Backend service            | Azure Container Apps, **Consumption** plan, `minReplicas: 1`                                                                                             |
| Database service           | Azure Database for PostgreSQL flexible server, Burstable B1MS — **not yet provisioned**                                                                  |
| Container registry         | **`crmarketpulse.azurecr.io`** — ACR Basic, East US, $0.1666/day, 10 GB included, **admin user disabled**. Pulled by managed identity with `AcrPull`     |
| Source repository          | `github.com/theSmaw/marketpulse`                                                                                                                         |
| Deploy trigger             | A merge to `main`, through the existing `verify` workflow's gate (Task 1.11.6)                                                                           |

**Why East US.** Alpaca's market data endpoints are US-hosted, and Epic 3's WebSocket is the latency that matters; the frontend is a geo-distributed CDN on the production environment regardless of the app's region, so co-locating it costs nothing. The trade accepted is portal and log latency for a UK-based maintainer, which is a human cost paid once per session rather than per market tick.

**Deploy credential — the intended shape, decided here and created in Task 1.11.3.** A **federated identity credential** (OpenID Connect) scoped to this repository, with a role assignment on the resource group, rather than a long-lived service-principal secret or a per-service deployment token. The reasoning is the one this repository already applies to third-party actions: a credential that cannot be replayed is worth more than one that is merely rotated, and Story 1.10 already pins every action to a commit SHA on the same principle. Static Web Apps' default GitHub integration issues a long-lived **deployment token** instead; if that is what Task 1.11.4 ends up using, it must be recorded here as a divergence with its reason, not adopted silently because it was the default the portal offered.

**Rollback.** Container Apps keeps revisions, so a rollback is shifting traffic to the previous revision rather than re-running a deploy — Task 1.11.7 owns proving it. Static Web Apps has no equivalent revision history on the Free plan, so the frontend's rollback is **re-running the deploy from the previous commit**, which makes the frontend the slower half to recover and is worth knowing before it is needed.

**The table above is filled in, and Task 1.11.3's deploy half is done (2026-09-03).** What is still owed is the **frontend URL** (Task 1.11.4) and the **federated credential's subject** (Task 1.11.6), neither of which exists yet.

## What the first deploy measured

Everything here was read back from the deployed resource rather than from the command that created it, which is the instruction and which caught nothing wrong this time — but the readings themselves corrected three things.

**The one open question from the offline half is closed: ACR accepts an OCI image index.** The pushed tag resolves to `application/vnd.oci.image.index.v1+json` holding both manifests, the `unknown/unknown` attestation included. The registry lists all three:

|                                   | Digest                                                                    | Size         |
| --------------------------------- | ------------------------------------------------------------------------- | ------------ |
| **Index — the provenance record** | `sha256:bcd83645388dbf2ea21358bd74edf935f4ed90291af6d93a94fbf0a546779f40` | —            |
| Platform image, `linux/amd64`     | `sha256:c8db64672c4cdff27c87fbdf45aefb4e07935c48d1654f7bc59bc402f14c21d4` | 60,239,874 B |
| Attestation, `unknown/unknown`    | `sha256:fd7f90dffb6c59e05cc6eeaeeafd16fbfdd1ca740b639647e355475dd7756a95` | 1,131 B      |

**There are now three different sizes for one image and they are all correct**, which is worth writing down before somebody treats a mismatch as a fault: `docker save` gives 60,266,496 B, the registry's platform manifest reports 60,239,874 B, and the platform's own pull event reports `Image size: 59768832 bytes`. Different boundaries, not different images. Quote which one you mean.

**`HOST=0.0.0.0` is mandatory and its absence would be a silent, total failure.** `config.ts` defaults `HOST` to `127.0.0.1`, which inside a container binds the loopback interface of the container's own namespace — the ingress proxy could never reach it, and the app would look perfectly healthy from inside. It is set explicitly on the app.

**The listening-line trap is confirmed in production, and it is the sharper version.** The deployed replica logs **two** lines — `Server listening at http://127.0.0.1:3000` **and** `http://100.100.198.132:3000` — loopback first, with `HOST=0.0.0.0` set. So anything reading the first line, or grepping for one line, concludes the server is loopback-only. Check the socket, never the log.

**`pid` is 1 in every record**, so the exec-form `CMD` holds on the real platform and `SIGTERM` reaches Node directly. Task 1.11.2 measured this in a local container; this is the same finding on the thing that will actually send the signal.

### No secret was needed, and that is the answer rather than an omission

The app's `secrets` array is **empty** and its registry entry carries `"identity": "system"` with an empty `passwordSecretRef`. `PORT`, `HOST`, `LOG_LEVEL`, `LOG_FORMAT` and `CORS_ORIGIN` are all plain `value` entries because none of them is a credential. **The mechanism is identified for Epic 2's Alpaca key** — a `secrets` entry referenced by `secretRef` — so that is not the occasion for learning where secrets go.

`CORS_ORIGIN` is set to **`https://placeholder.invalid`**, deliberately: it is explicitly not the `http://localhost:5173` default (which would let somebody's local dev server call the deployment), and `.invalid` is reserved by RFC 2606 so it can never resolve. **Task 1.11.5 replaces it with the real frontend origin.**

### The probes are HTTP against `/health`, and the defaults they replaced were implicit

A CLI-created app has `probes: null` — the documented TCP defaults are applied by the platform rather than written into the resource, so there was nothing to read back. What is configured now:

| Probe     | Path      | Delay | Period | Timeout | Failures | Grace    |
| --------- | --------- | ----- | ------ | ------- | -------- | -------- |
| Startup   | `/health` | 1 s   | 2 s    | 3 s     | 30       | **60 s** |
| Readiness | `/health` | 3 s   | 10 s   | 5 s     | 3        | —        |
| Liveness  | `/health` | 5 s   | 30 s   | 5 s     | 3        | —        |

The 60-second startup grace is well above the observed start, which is sub-second. **A TCP probe passes on any process that binds the port**, which is exactly the case `/health` exists to distinguish, so this is an action rather than a default.

**One consequence nobody costed: the probes are the only traffic an idle deployment has, and they are its entire log volume.** Readiness and liveness together write about 16 records a minute — roughly 5 MB a day, 160 MB a month at the observed record size. That is comfortably inside Log Analytics' free allowance and it is not zero, and it is the reason the log bill will be non-zero before a single user exists. **Whether continuous probing also breaks the idle billing condition is not settled here** — the condition requires the replica not be processing requests, and a probe every few seconds is very nearly that. The bill is the arbiter; re-take it rather than assuming either way.

### Zero downtime was tested rather than cited

An invalid `PORT=0` was deployed on purpose and the environment was polled by request throughout. The result, which is Task 1.11.7's criterion arriving early:

- The new revision took **`trafficWeight: 100` while still `Activating`**, and the old revision — at `trafficWeight: 0` — kept answering. **Traffic weight is not what serves.** That is the mechanism behind the zero-downtime claim and it reads backwards from the API.
- `/health` returned **200 on every one of 19 polls** across the failed deploy and the recovery.
- The bad revision crash-looped: `Container 'marketpulse-backend' was terminated with exit code '1' and reason 'ProcessExited'`, and was deprovisioned without ever taking traffic.

**And the prediction about the logs was half wrong, in the useful direction.** The worry was that a configuration failure exits before the logger exists and so writes zero structured records, leaving the most likely first failure invisible at the log destination. The first half is confirmed — the record is a bare line, not JSON. But it **is** collected: `F PORT must be an integer between 1 and 65535, received "0"` appears in the console log stream, because Container Apps captures **stdout and stderr together**. So the answer to "collect both anyway, or write down why not" is that the platform already does. The failure is visible; it is simply not queryable as structured data.

### `version` reports `0.0.0`, and it is left that way deliberately

`/health` returns the deployed manifest's version, every package here is `0.0.0`, and nothing sets it. Leaving it is a decision with a reason rather than an omission: **the image tag and the index digest already answer "what is deployed", precisely and immutably**, and the obvious fix conflicts with the mechanism that makes them trustworthy — writing a version into `package.json` at build time dirties the working tree, which is exactly what `scripts/build-image.mjs` refuses to tag as a clean commit. Any future version reporting therefore has to come through a build argument that does not mutate a tracked file. The reversal trigger is a second deployed environment, where "which build is this" stops being answerable from the one URL.

## What Task 1.11.1 did not do — kept as its own record

**This section describes the state on 2026-09-03 _before_ the deploy above, and is kept rather than deleted because its argument is the reason the deploy went the way it did.**

**Task 1.11.1 deployed nothing and produced no artefact.** No Azure resource existed, no account was linked to the repository, no credential was created and no file outside `planning/` was touched. That was the point, and it is the same shape as Task 1.10.1 installing and stopping: when Task 1.11.3's first deploy failed, the platform choice would not be one of the candidate causes.

**It paid off, and the honest reckoning is that the first deploy had no platform surprises at all.** Every limit quoted in this document held. What did bite came from elsewhere: a `HOST` default of `127.0.0.1` that is correct everywhere except inside a container, a `consumption budget` CLI command that rejects its own valid input, and a first request that hung rather than failed. None of those is a hosting choice.
