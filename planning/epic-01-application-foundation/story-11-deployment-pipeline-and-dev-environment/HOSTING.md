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

| Limit                              | Free plan   | Our position                                           |
| ---------------------------------- | ----------- | ------------------------------------------------------ |
| Included bandwidth (per month)     | 100 GB      | The artefact is **356,936 B over four files** (1.11.8) |
| Overage bandwidth                  | Unavailable | So the failure mode is a **cut-off**, not a bill       |
| Apps (per subscription)            | 10          | One                                                    |
| Preview environments               | 3           | **Declined** by Task 1.11.6 — see ADR 0011 §21         |
| Storage (single environment)       | 250 MB      | **356,936 B — 0.14% of it**                            |
| File count                         | 15,000      | **Four**                                               |
| Custom domains                     | 2           | None planned in this story                             |
| Private endpoint / IP restrictions | Unavailable | **The environment is public.** See _Protection_ below  |

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

| Fact                       | Value                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud                      | Microsoft Azure                                                                                                                                                                     |
| Subscription id            | `5104e168-b3de-41c2-92a8-c68d28bd4d16`                                                                                                                                              |
| Tenant id                  | `6069915b-5bf2-4e36-8b25-8ffb25b5fdd1`                                                                                                                                              |
| Subscription type          | Azure free account (12-month offers plus the always-free grants)                                                                                                                    |
| Region                     | East US for the backend, the registry and the eventual database. **The frontend is East US 2** — see below; Static Web Apps is not offered in East US                               |
| Resource group             | `rg-marketpulse-dev` (East US)                                                                                                                                                      |
| Container Apps environment | `cae-marketpulse-dev`, unique id **`blackgrass-e682fefb`**, `WorkloadProfiles` mode with a **Consumption profile only**, no VNet                                                    |
| Backend URL                | **<https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io>**                                                                                                  |
| Backend identity           | System-assigned, principal `fe8a2ecd-719c-407e-94d4-629015bd889d`, `AcrPull` on the registry                                                                                        |
| Log destination            | Log Analytics workspace `log-marketpulse-dev`, **30-day retention**, `PerGB2018` — $2.30/GB ingested, $0.10/GB/month retained beyond the included period                            |
| Budget                     | `marketpulse-monthly`, **$20/month**, actual-cost alerts at 50 / 80 / 100% to the account owner                                                                                     |
| Frontend service           | Azure Static Web Apps, **Free** plan, app `marketpulse-frontend` in **East US 2**                                                                                                   |
| Frontend URL               | **<https://red-smoke-029583a0f.5.azurestaticapps.net>**                                                                                                                             |
| Backend service            | Azure Container Apps, **Consumption** plan, `minReplicas: 1`                                                                                                                        |
| Database service           | Azure Database for PostgreSQL flexible server, Burstable B1MS — **not yet provisioned**                                                                                             |
| Container registry         | **`crmarketpulse.azurecr.io`** — ACR Basic, East US, $0.1666/day, 10 GB included, **admin user disabled**. Pulled by managed identity with `AcrPull`                                |
| Source repository          | `github.com/theSmaw/marketpulse`                                                                                                                                                    |
| Deploy trigger             | A merge to `main`, gated on `verify` — `.github/workflows/deploy.yml`, automatic since Task 1.11.6                                                                                  |
| Deploy credential          | Federated identity credential (OIDC) on app registration `marketpulse-github-deploy`, app id **`1bb765eb-fff3-4aed-80f2-90796c2fbcfb`**. **No repository secret exists.** See below |

**Why East US.** Alpaca's market data endpoints are US-hosted, and Epic 3's WebSocket is the latency that matters; the frontend is a geo-distributed CDN on the production environment regardless of the app's region, so co-locating it costs nothing. The trade accepted is portal and log latency for a UK-based maintainer, which is a human cost paid once per session rather than per market tick.

**Deploy credential — the intended shape, decided here and created in Task 1.11.3.** A **federated identity credential** (OpenID Connect) scoped to this repository, with a role assignment on the resource group, rather than a long-lived service-principal secret or a per-service deployment token. The reasoning is the one this repository already applies to third-party actions: a credential that cannot be replayed is worth more than one that is merely rotated, and Story 1.10 already pins every action to a commit SHA on the same principle. Static Web Apps' default GitHub integration issues a long-lived **deployment token** instead; if that is what Task 1.11.4 ends up using, it must be recorded here as a divergence with its reason, not adopted silently because it was the default the portal offered.

**It is, and here is the divergence with its reason (Task 1.11.4, 2026-09-03).** The frontend's first deploy used the app's **deployment token**, read at the moment of use with `az staticwebapp secrets list` and passed to the CLI through `SWA_CLI_DEPLOYMENT_TOKEN` in the environment of a single command. Two things make that acceptable here and neither generalises. It is **not stored**: nothing was written to a file, to a keychain (`--no-use-keychain` is passed for exactly that reason) or to a repository secret, so there is no long-lived copy to leak or rotate — the token is the app's, it is fetched by the operator's own Azure credential, and each deploy fetches it again. And it is **a hand deploy, not the pipeline**: Task 1.11.6 is where a credential is genuinely persisted, and the federated identity credential above is still what that task owes. The trap this leaves is worth naming — the default advice everywhere is to paste this token into `AZURE_STATIC_WEB_APPS_API_TOKEN` as a repository secret, which is precisely the long-lived-secret shape this document has now declined three times. **Task 1.11.6 must not take that path by default**; if it does, it is a second divergence needing its own reason here.

**It did not, and the divergence is now closed rather than repeated (Task 1.11.6, 2026-09-03).** The pipeline authenticates with a **federated identity credential** and holds **no repository secret at all** — not a deployment token, not a service-principal password, not even a client secret. What is in `deploy.yml` is three identifiers as literals; the deployment token is fetched with `az staticwebapp secrets list` **at the moment of use** under that federated login and passed to one command's environment, exactly as Task 1.11.4's hand deploy did, with the operator's credential replaced by the workflow's own. Nothing is stored anywhere.

**And the "does the deploy action accept OIDC" question was established rather than assumed, which is what made that possible.** `Azure/static-web-apps-deploy`'s own `action.yml`, read from the repository rather than recalled, declares `azure_static_web_apps_api_token` as **`required: true`** and offers **no** Azure-credential input of any kind. So the action genuinely cannot take an OIDC login, and using it would have meant creating `AZURE_STATIC_WEB_APPS_API_TOKEN` — the fourth time this document would have declined that shape and the first time it would have lost. The CLI can be handed a token the workflow mints for itself, so the CLI is what the pipeline uses and the **action is declined with a reason**. That also disposes of the platform's generated workflow entirely: it takes an `app_location` and an `output_location` and builds the site on the deploy side, which is a second definition of the artefact; `swa deploy <dir>` uploads a directory and builds nothing, so `skip_app_build` has no equivalent here — there is no build to skip.

**Rollback. ~~Container Apps keeps revisions, so a rollback is shifting traffic to the previous revision rather than re-running a deploy.~~ Task 1.11.7 tried to prove that and it is wrong for this app: `az containerapp ingress traffic set` is refused outright** — _"Containerapp 'marketpulse-backend' is configured for single revision. Set revision mode to multiple in order to set ingress traffic."_ Traffic splitting is a property of **multiple** revision mode, and this app is deliberately in **single** mode, so the mechanism this paragraph named is unavailable without first changing the app's configuration. What actually rolls the backend back is **`az containerapp update --image <the previous digest>`**, which needs no repository, no build and no pipeline — only a digest, which every deploy run prints into its own summary — and which was executed in **43 seconds**. It creates a _new_ revision rather than reactivating the old one. **And it is undone by the next merge, silently**: that was executed too, one minute later. Static Web Apps has no revision history at all on the Free plan, so the frontend's rollback is **a revert commit through `verify` and the pipeline**, measured at **3 min 42 s** from pressing merge. The asymmetry is the thing to carry: the half that looks trivially recoverable is ~5x slower, and the fast half expires. See _What making the deployment fail measured (Task 1.11.7)_ below.

**The table above is filled in and nothing in it is owed.** Task 1.11.3 deployed the backend, Task 1.11.4 the frontend and Task 1.11.6 automated both, all on 2026-09-03. The federated credential's subject — the one row that was still owed — is in the identities section below, and it is **not** the subject the documentation predicts.

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

`CORS_ORIGIN` was set to **`https://placeholder.invalid`**, deliberately: it is explicitly not the `http://localhost:5173` default (which would let somebody's local dev server call the deployment), and `.invalid` is reserved by RFC 2606 so it can never resolve. ~~**Task 1.11.5 replaces it with the real frontend origin.**~~ **It did, on 2026-09-03**: it is now `https://red-smoke-029583a0f.5.azurestaticapps.net`, on revision `0000007`.

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

## What the frontend deploy measured (Task 1.11.4)

Everything here was read back from the deployed site by request rather than from the command that produced it, and four of the readings correct something this document or `CLAUDE.md` already said.

### Static Web Apps is not offered in East US, so the two halves are not co-located

The provider's own region list for `Microsoft.Web/staticSites` is **Central US, East US 2, West US 2, West Europe, East Asia** — read from `az provider show` rather than from a pricing page. East US is not on it, so "East US, for both halves" was never achievable and the table above has been corrected. The app is in **East US 2**.

It costs nothing that matters, and saying why is better than saying it is fine: the production environment is served from a geo-distributed CDN regardless of the app's region, so a US user's latency is a property of the edge and not of East US 2. What the region does decide is where **preview environments** live, and those are documented as _not_ geo-distributed — so a preview environment is genuinely an East US 2 origin. The backend, the registry and the eventual database are unaffected and stay in East US, which is where the Alpaca latency argument actually applies.

**One prerequisite that is invisible until it fires:** the subscription had never used `Microsoft.Web`, so the first `az staticwebapp create` failed with `MissingSubscriptionRegistration`. `az provider register -n Microsoft.Web --wait` is the fix and it is a one-time, subscription-wide action. Note the region list above answered _before_ registration — provider metadata is readable while the namespace is unregistered, so a successful region query is not evidence that a create will succeed.

### Both hostname patterns in this document were wrong, and the preview one mangles its own input

Measured, against the documented forms quoted above:

| Environment         | Documented form                                             | What was actually issued                                            |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Production          | the app's default hostname                                  | `red-smoke-029583a0f.5.azurestaticapps.net` — **no region segment** |
| Preview / named env | `<DEFAULT_HOST_NAME>-<NAME>.<LOCATION>.azurestaticapps.net` | `red-smoke-029583a0f-previewprobe.eastus2.5.azurestaticapps.net`    |

Three things follow. There is an undocumented **`.5.`** segment in both. The **location appears in the preview hostname and not in the production one**, which is the opposite of what the single documented pattern implies. And the environment name is **normalised** — a probe environment deployed as `preview-probe` came back as `previewprobe`, with the hyphen removed — so a preview origin **cannot be derived from a branch name by substitution**. Anything that needs to know a preview origin in advance has to read it back from `az staticwebapp environment list`, which reports `name` and `hostname` per environment. The probe environment was deleted afterwards; only `default` remains.

**The consequence for `CORS_ORIGIN` is now concrete rather than predicted.** The backend takes exactly one origin, the production origin is `https://red-smoke-029583a0f.5.azurestaticapps.net`, and every preview environment is a different origin — so **every preview environment fails cross-origin against the deployed backend, by construction.** That is not a bug and the fix is not to widen the allowlist: an allowlist that admits `*-*.eastus2.5.azurestaticapps.net` admits every Static Web App anybody deploys in that region. Task 1.11.6 decides whether preview environments are wanted at all, and this is the cost it weighs; the Free plan allows 3 of them, and `stagingEnvironmentPolicy` is `Enabled` on this app today.

### The fallback behaves exactly as the documentation's table promised, and the check that separates it from a catch-all passes

`apps/frontend/public/staticwebapp.config.json` is `navigationFallback` with `rewrite: "/index.html"` and `exclude: ["/assets/*"]`. Read from the deployed site:

| Request                       | Status  | Body                             |
| ----------------------------- | ------- | -------------------------------- |
| `/`                           | 200     | `index.html`, 1,101 B            |
| `/investigations`             | 200     | `index.html`, 1,101 B            |
| `/securities`                 | 200     | `index.html`, 1,101 B            |
| `/replay`                     | 200     | `index.html`, 1,101 B            |
| `/a-path-that-does-not-exist` | 200     | `index.html`, 1,101 B            |
| `/assets/nope.js`             | **404** | the platform's 404 page, 2,400 B |

**200 and not a redirect** on every route — checked without `-L`, so a 302 would have shown as a 302. And the two Story 1.5 criteria were closed in a **browser** rather than by inference: all four routes deep-load cold and render their real content, and `/a-path-that-does-not-exist` renders the application's own `NotFound` — "No such page … That address does not match anything in MarketPulse" — with an empty console. Serving `index.html` with a 200 is what the host does; `NotFound` rendering is what proves the router got the chance to.

**`/staticwebapp.config.json` is not served.** Requesting it returns the fallback's `index.html` at 200, so the configuration file is consumed by the platform rather than published as content — which is worth knowing before anybody concludes the artefact leaks its own routing rules.

**The `exclude` covers `/assets/*` and nothing else, and that is a real limitation rather than a tidy default.** Vite emits every hashed asset under `/assets/`, so today the scope is exact. But a file added to `apps/frontend/public/` lands at the **root** of the artefact, outside the exclude — measured by probing paths that do not exist there: `/favicon.svg` and `/nunito-sans-regular.woff2` both come back as `index.html` at 200 rather than as a 404. That is the `vite preview` trap, alive at the root of a production deployment. **Anything added to `public/` needs an `exclude` entry in the same change**, and this paragraph is the only thing that says so. It was left at one entry rather than pre-emptively widened because a pattern with no file behind it is scaffolding, and a wrong guess about the eventual filenames is worse than an entry that is added when the file is.

### The cache policy is two mechanisms, and the ordering trap was confirmed in the direction that matters

`globalHeaders` sets `Cache-Control: no-cache` and a route rule on `/assets/*` sets `public, max-age=31536000, immutable`. Read back:

| Path                                           | `Cache-Control`                       |
| ---------------------------------------------- | ------------------------------------- |
| `/`                                            | `no-cache`                            |
| `/investigations` (**served by the fallback**) | `no-cache`                            |
| `/assets/index-C-Puqfnm.js`                    | `public, max-age=31536000, immutable` |
| `/assets/index-DFxUCjbx.css`                   | `public, max-age=31536000, immutable` |

The second row is the whole reason the document default is a `globalHeaders` entry rather than a route rule: **"Route rules aren't applied on requests that trigger `navigationFallback`"**, so a `Cache-Control` hung on a route would have applied to `/` and to nothing else — configured-looking and inert on four of the five addresses a user can land on. It is the right way round here, checked rather than reasoned about.

`no-cache` rather than `no-store`: the document is 1,101 B and the platform serves an `ETag`, so revalidation is a conditional request rather than a re-download, and a returning user still gets the new build the moment one is deployed. The hashed assets can be immutable precisely because the filename changes when the bytes do — get these two backwards and a deploy is invisible for a year.

### HTTPS, compression, and the byte figure that is easy to quote wrongly

`http://` answers **301** to the `https://` origin, and every response carries `strict-transport-security: max-age=10886400; includeSubDomains; preload` along with `x-content-type-options: nosniff` and `referrer-policy: same-origin` — none of which this repository configured. TLS and the redirect are the platform's, not ours.

Compression is negotiated and **brotli is preferred**: the 343,658 B bundle arrives as **111,753 B** with `Accept-Encoding: br` and **140,890 B** with `gzip` alone, `vary: Accept-Encoding` on both. That is the figure to be careful with. `CLAUDE.md` records "about 111 kB gzipped" from Vite's own build report, and the number the wire actually produces for gzip is 140,890 B — the coincidence is that the host's **brotli** happens to land where Vite's gzip did. **A build-report compression figure is not a wire figure**, because the encoder and its level belong to the host. Quote 343,658 B, which is what both agree on.

### Uploads are not atomic, and the window is long enough to break a cold load

**Scoped by Task 1.12.7 (2026-09-04): the window is a property of the artefact _changing_, not of deploying.** 174 consecutive CDN samples at 0.4 s across a whole `Deploy the frontend` step of a docs-only merge showed **zero** broken states — a byte-identical Linux rebuild keeps the hashed filenames, so there was no incoming asset to be missing and no outgoing one to withdraw. A mechanism explaining an observation and **not a re-test**: the window is real on a changing artefact and was not re-measured there.

This was the one item on the task's list that could only be answered by making it happen, so it was made to happen twice. A synthetic second artefact was built by renaming both hashed assets and rewriting `index.html` to match, then deployed while the site was polled continuously for three things: which asset `index.html` referenced, and the status of the old and new asset URLs.

Both runs showed the same ordering, and it is the wrong way round:

| Run | Old asset gone, old `index.html` still served | Broken window |
| --- | --------------------------------------------- | ------------- |
| 1   | observed                                      | ~1–2 s        |
| 2   | 14:12:00.5 → 14:12:02.0                       | **~1.5 s**    |

So the new asset appears first (harmless), then **the old asset is withdrawn while the old `index.html` is still being served** — a document whose `<script>` is a 404 — and only then does the new `index.html` appear. Run 2 also showed the old asset flicking back to 200 _after_ the new document was live, so propagation is not even monotonic across edges.

Three things follow. **A deploy has a ~1.5-second window in which a cold load is broken**, and the failure is the `/assets/nope.js` 404 arriving as a missing script rather than as anything a user could interpret. Nobody already on the page is affected — the assets they hold are already fetched, and `no-cache` on the document means their next navigation revalidates. And **this is a property of the host, not of the deploy command**: there is no flag here to make it atomic, so the honest mitigations are to deploy rarely and off-hours, or to accept it, which is what a development environment does. Task 1.11.7 owns "a failed deployment does not take the environment down" and should read this as the shape of the answer for the frontend half: the backend has revisions and a traffic weight, and the frontend has a directory that is replaced in place.

**Uploads replace rather than merge**, which is the other half of the same measurement: after redeploying the real artefact, the synthetic assets 404 and only the three real files remain. A deploy is not additive, so a file deleted from the build is gone from the site.

### The deployed files are byte-identical to a local build

`index.html` 1,101 B / `eab270a4…`, `assets/index-C-Puqfnm.js` 343,658 B / `cba2825c…`, `assets/index-DFxUCjbx.css` 10,926 B / `f98519e3…` — downloaded from the site and hashed, matching `apps/frontend/dist` exactly. The frontend artefact's identity, unchanged since Task 1.7.7 across two clean clones and both platforms, now also holds through a CDN.

**And the artefact is four files now, not three** — `staticwebapp.config.json` at 300 B takes it to **355,985 B over four files**. The three original files did not move; the artefact gained one. That is the concrete cost this document predicted: unlike the backend, whose configuration lives in a platform panel, the frontend's host configuration is part of what ships.

### The configuration file reaches two artefacts, and the CLI found the wrong one

It lives in `apps/frontend/public/`, which Vite copies to the root of `dist/` untouched. **Storybook's build copies it too** — `apps/frontend/storybook-static/staticwebapp.config.json` exists after `pnpm build`, because `.storybook/main.ts` deliberately reuses `vite.config.ts` and therefore inherits its `publicDir`. That was not anticipated and it had a visible consequence on the very first deploy: the SWA CLI printed `Found configuration file: .../apps/frontend/storybook-static/staticwebapp.config.json` — it globs the working directory and picked the **workshop's** copy, not the one in the directory being deployed. Harmless here only because the two are the same bytes. If the workshop is ever published with a different configuration, or if `public/` gains a file the workshop should not carry, this is where it bites. The platform reads the copy inside the deployed directory; the CLI's line is about the CLI. **Task 1.11.6 closed it** — `publicDir: false` in `.storybook/main.ts`, so the workshop copies nothing and the client now reports finding `apps/frontend/public/staticwebapp.config.json`, the source of truth. `staticDirs: []` was tried first and does not work.

Unlike `apps/backend/Dockerfile` and the root `.dockerignore`, this file **is** inside `pnpm verify`'s net: `prettier --file-info` reports `"inferredParser": "json"` for it, so a malformed edit fails `format:check`. Formatting only — nothing validates the schema, so a misspelled `navigationFallback` or an `exclude` that matches nothing is green locally and silent in production, in the same class as the workflow's unchecked schema.

### The workshop is not published, and that is a decision

Story 1.10 declined `storybook-static/` as a CI artefact and explicitly left "is the workshop a published site" to this story. The answer is **no**, taken in one place so it is not re-opened by default. The Free plan allows 10 apps per subscription and 9.3 MB is nothing against a 250 MB cap, so this is not a cost decision: it is a second URL, a second deploy job, a second thing that goes stale silently, and — per the paragraph above — a second artefact carrying a routing configuration written for the application rather than for it. Nobody outside this repository reviews components today, and anybody inside it can run `pnpm --filter @marketpulse/frontend storybook`. **The reversal trigger is a reviewer without a checkout** — Epic 15's accessibility review is the likely one — at which point it is a second Static Web App and this paragraph is the record that it was considered rather than forgotten.

### The Static Web Apps CLI emulator was not used, and the reason is that it was not needed

The task asked whether `swa` emulates `navigationFallback` locally, because that would move the line between its blocked and unblocked halves. The account exists, so the question is moot in the direction that matters: **a local pass would have been evidence about the configuration file and never about the host**, which is exactly the distinction Task 1.5.5 drew when it refused to tick a criterion against `vite preview`. Everything above was read from the deployed site. The CLI was used only as a **deploy** client, pinned at `@azure/static-web-apps-cli@2.0.10` and run through `npx` — it is deliberately not a dependency of this workspace, because nothing in `pnpm verify` needs it. ~~Task 1.11.6 will use a pinned GitHub Action instead.~~ **It does not** — the official action cannot take an OIDC login, so the pipeline runs this same pinned `npx` invocation under a federated credential. See Task 1.11.6's section below.

The deploy, in full, so it is reproducible and so Task 1.11.6 has the shape it is automating:

```sh
pnpm build
TOKEN=$(az staticwebapp secrets list \
  --name marketpulse-frontend --resource-group rg-marketpulse-dev \
  --query "properties.apiKey" -o tsv)
SWA_CLI_DEPLOYMENT_TOKEN="$TOKEN" npx -y @azure/static-web-apps-cli@2.0.10 \
  deploy apps/frontend/dist --env production --no-use-keychain
```

`--env production` is the decision in that command: the default is a preview environment, so omitting it deploys somewhere nobody is looking. `--no-use-keychain` is what keeps the token out of the operator's keychain, which is the whole basis on which the divergence above is acceptable.

## What making the two halves talk measured (Task 1.11.5)

The deployed frontend now calls the deployed backend. What crossed the boundary is deliberately one `fetch` and not Story 1.12's API client — see the scope note at the end — and everything below was read from a browser and from the log destination rather than from a command's own output.

### The end-to-end loop, and the correlation id closing it

Loading the deployed page writes one line to the browser console:

```
[health-probe] https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io/health
  answered 200  x-request-id: c22c9b0b-46a1-497e-a010-aded7a7999f0  {status: 'ok', version: '0.0.0', …}
```

and that id is in the backend's own log, queried out of Log Analytics rather than inferred:

```json
{"level":30,"reqId":"c22c9b0b-46a1-497e-a010-aded7a7999f0","req":{"method":"GET","url":"/health"},"msg":"incoming request"}
{"level":30,"reqId":"c22c9b0b-46a1-497e-a010-aded7a7999f0","res":{"statusCode":200},"responseTime":0.5633,"msg":"request completed"}
```

**That is the first time `exposedHeaders` has been load-bearing anywhere, and it is why Story 1.8 rejected a Vite proxy.** The CORS-safelisted response headers are a short list and `x-request-id` is not on it, so cross-origin JavaScript cannot read it unless the server names it in `access-control-expose-headers` — which `apps/backend/src/cors.ts` does. A same-origin setup, or a proxy, exposes every header and would have hidden that requirement completely until production.

**No preflight, as predicted.** A simple `GET` is not preflighted, and a grep of the log across the whole exercise found **zero** `OPTIONS` records. So the healthy case is one request and one pair of log lines, and an `OPTIONS` appearing later means something made the request non-simple.

### The allowlist was made to fail, and both halves were observed together

`CORS_ORIGIN` was pointed at `https://not-the-frontend.example`, the page reloaded, and then it was put back. The pairing is the whole diagnostic:

| Observer                               | What it saw                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| The browser, on the deployed page      | `TypeError: Failed to fetch` — naming neither CORS nor the origin                            |
| `curl`, same URL, same `Origin` header | **`HTTP/2 200`**, `access-control-allow-origin: https://not-the-frontend.example`, full body |
| The backend's log, same request        | `{"res":{"statusCode":200},"responseTime":0.3856,"msg":"request completed"}`                 |

**The server never sees the check fail.** With a string origin `@fastify/cors` asserts `access-control-allow-origin` unconditionally, so the request was made, answered and then discarded by the browser — and every piece of server-side evidence says the system is healthy. This is why `curl` cannot test any of it, and why the probe's own failure message names the cross-origin check explicitly rather than letting a bare `Failed to fetch` send somebody to look at the backend.

**Recovery took a revision, both ways.** Environment variables live in the app's `template`, so each change is a rollout: `0000005` set the real origin, `0000006` broke it, `0000007` restored it. Each took **20–25 seconds** to start serving, `/health` answered **200 on every poll throughout**, and — Task 1.11.3's finding reproducing for the third time — the old revision kept answering with the _old_ value until the new one actually took over. A configuration change is not instant and is not atomic from a client's point of view.

### Preview environments, restated as a consequence rather than a prediction

The allowlist holds exactly one string and it is now the production origin. Every preview environment has a different hostname, so **a page served from one cannot call this backend**, and the symptom is precisely the `TypeError: Failed to fetch` above with a healthy 200 in the log — indistinguishable, from the browser, from the misconfiguration this task existed to prevent. Widening the allowlist is not the fix: a pattern admitting `*-*.eastus2.5.azurestaticapps.net` admits every Static Web App anybody deploys in that region.

### The frontend's first environment variable, and the per-environment build

`VITE_API_BASE_URL` is the first `.env` variable this frontend has ever read, and it arrived one story earlier than Story 1.6 predicted, because Story 1.11's criterion cannot be met without an address.

**It is substituted into the bundle at build time, so the deployed artefact and a local build are genuinely different artefacts.** Read out of the emitted JavaScript rather than assumed — the call site compiles to `Td("https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io")`, a string literal:

| Build                                     | JavaScript    | md5         | Total     |
| ----------------------------------------- | ------------- | ----------- | --------- |
| No variable (a clean clone, and **CI's**) | 344,537 B     | `3c886f88…` | 356,864 B |
| `VITE_API_BASE_URL` set (**deployed**)    | **344,609 B** | `7654c2e0…` | 356,936 B |

**That is a 72-byte difference and it is a real problem for Task 1.11.6**, which has to decide whether the deployed artefact is the one CI built or a rebuild. Today it can only be a rebuild, because CI does not set the variable — so the fingerprint the pipeline prints into every job summary describes an artefact that is _not_ what is deployed. Either the deploy job sets the variable and the fingerprint becomes the deployed one, or the asymmetry gets written down. It cannot be ignored: this is exactly the "say what makes the two the same" question Story 1.10's rule asks.

The deploy recipe is therefore:

```sh
VITE_API_BASE_URL=https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io pnpm build
SWA_CLI_DEPLOYMENT_TOKEN="$TOKEN" npx -y @azure/static-web-apps-cli@2.0.10 \
  deploy apps/frontend/dist --env production --no-use-keychain
```

**A build that forgets the variable does not fail — it ships a page that dials `http://localhost:3000`**, which from an HTTPS page is blocked as mixed content and reads as an unreachable backend. That is the failure mode to watch for, and it is why the variable belongs in the deploy job rather than in somebody's shell history.

### The default is a matched pair with `CORS_ORIGIN`, and a clean clone still works

`VITE_API_BASE_URL` is optional and falls back to `http://localhost:3000` — `apps/backend`'s own default port and host. Verified on a tree with **no `.env` file of any kind**: `pnpm dev`, `pnpm ready` green, and the page at `http://localhost:5173` logging `http://localhost:3000/health answered 200` with the correlation id read back. 5173 → 3000 is cross-origin, so the local loop exercises `exposedHeaders` too rather than only the deployed one.

Those two defaults are a **matched pair**: `VITE_API_BASE_URL`'s `http://localhost:3000` and `CORS_ORIGIN`'s `http://localhost:5173` point at each other, and changing one without the other breaks the local loop in a browser while every server log stays green. `localhost` rather than `127.0.0.1` on the frontend side is deliberate — only a browser reads that string, and a browser tries both address families while the backend binds IPv4 only.

One measurable side effect on the development loop: **a page load now costs the shared `pnpm dev` terminal two rendered lines**, where before this task the frontend made no request at all and cost none. That is Story 1.8's measured floor of 2 for a simple `GET`, now actually being paid.

### A silent-failure class was closed on the way, and it was not in the brief

Vite types `ImportMetaEnv` with an index signature returning `any`, so `import.meta.env.VITE_ANYTHING` typechecks and evaluates to `undefined` at run time. That is the exact failure `apps/frontend/.env.example` warns about — a misspelled or non-prefixed name is substituted to `void 0` and **silently never arrives** — and no tool in `pnpm verify` could see it.

`apps/frontend/src/vite-env.d.ts` declares Vite's own `strictImportMetaEnv`, which removes the fallback index signature, and declares each name explicitly. Measured rather than assumed: reading `import.meta.env.VITE_API_BASE_URLL` is now **TS2551 at exit 2**, with tsc suggesting the correct name. So the frontend's environment boundary has three enforcers now rather than two — `envPrefix` at build time, `pnpm env:check` on the example file, and the compiler on the reading site.

**Its cost is stated rather than discovered**: every variable now has to be declared in two places, and _nothing checks that pair_. `scripts/check-env-example.mjs` reads `.env.example` and not the declaration file. Story 1.12 brings the second variable and is where a pair becomes a set.

### What was taken from Story 1.12, and what was left

Taken, and only this: **one `fetch` at startup, reported to the console** — `apps/frontend/src/health-probe.ts`, called from `main.tsx` and not from React at all — plus the `VITE_API_BASE_URL` variable and its resolver, and 15 tests over the two.

Left to Story 1.12, deliberately and completely:

- **The API client.** This is one `fetch` with no retry, no timeout, no abort and no shared transport.
- **`HealthResponse` in `packages/shared`.** The probe types its body as `unknown` and logs it. Promoting that type is Story 1.12's stated payoff for having created the package in Story 1.1, and doing it here would spend it.
- **All state, every effect, the polling, and the status indicator** — including the vocabulary decision Story 1.4 posed and Story 1.5 sharpened, of whether a backend-status indicator is a second `FeedIndicator` or a widened one. Nothing rendered changed in this task.
- **The `ApiError` seam and how much of a `requestId` a user should ever see.** The probe shows a developer an id in a console; it shows a user nothing.
- **The React Compiler rules' first real test.** Keeping the probe out of React is what leaves that to 1.12's polling effect rather than spending it on code that is going to be deleted.

**`main.tsx`'s `void probeBackendHealth();` and the module behind it are meant to be deleted by Story 1.12**, and both say so in their own comments.

## What automating the deploy measured (Task 1.11.6)

**A merge to `main` now deploys both halves with no human action.** `.github/workflows/deploy.yml` is triggered by `workflow_run` on `verify` completing, and it was observed on real merges rather than reasoned about: PR #127 merged at 08:01, `verify` ran on `main`, the deploy fired on its own and put a new revision and a new bundle live. Everything below was read back from the running system.

### Where the deploy lives, and why it is not a job in `verify.yml`

A separate workflow, on three arguments in order of weight.

**The badge.** `README.md`'s badge paragraph says in as many words that green certifies the chain and **not** coverage. A deploy job inside `verify` would make the badge report the deployment too, so a registry outage, an expired credential or a platform incident would turn the tick red for something the paragraph beside it disclaims. The badge keys on the **workflow** name, so this is a property of the file rather than of the job — it cannot be arranged any other way.

**Concurrency.** `verify` cancels superseded runs everywhere except `main`, because a cancelled run leaves a commit with no verdict. A cancelled **deploy** is worse than no verdict: it is a half-done rollout. This needs cancellation off and a queue of its own, and concurrency is a property of the workflow.

**The gate.** The required status check keys on the **job** name `verify`. Adding a job to that workflow leaves the gate keyed on a job that no longer describes the whole run, and the obvious "fix" — adding the deploy job to the ruleset — would make a deploy gate a merge, which is backwards, since the deploy happens after one.

The cost is stated rather than discovered: `workflow_run` does not check anything out, so the workflow has to be told which commit it is deploying, and it repeats the toolchain and install steps. It reads the **same** pnpm store cache `verify` writes, so the install is warm.

### The gate, and it was made to go red

`github.event.workflow_run.conclusion == 'success'`. That is a **workflow run's** conclusion and never a step's, because Story 1.10 recorded that a step marked `continue-on-error` reports `conclusion: success` however it exited — a deploy gate written against a step would be a gate against nothing. The coverage step cannot turn `verify` red, which is exactly the property that makes this gate honest.

Two further clauses close a hole the branch filter does not. `branches: [main]` filters on the **triggering** run's head branch, and a pull request from a fork whose source branch is called `main` produces a `verify` run with `head_branch: main`. `event == 'push'` is what closes it, because `verify`'s own `push` trigger is restricted to this repository's `main`.

**It was made to happen.** A deliberately unformatted Markdown file was merged to `main` with admin bypass (PR #128), `verify` run **33732058463** failed at `format:check`, and deploy run **33732126041** was created and **`skipped`** — nothing was built, nothing was pushed, nothing was rolled out. The probe was reverted immediately (PR #129).

**The detail worth knowing is that it is a `skipped` run and not an absent one.** The deploy workflow is triggered by every `verify` completion and the job's `if:` is what declines; so the deploy history carries a visible record of the gate firing, rather than a silence that is indistinguishable from a trigger that never worked. That is the better failure shape and it was not designed for — it is how `workflow_run` plus a job-level `if:` behaves.

### Two rapid merges do not interleave, and the queue was measured

`concurrency: { group: deploy, cancel-in-progress: false }` — a literal group rather than one keyed on the ref, because every run of this workflow targets the same two live resources and they all belong in one queue.

PR #129 and PR #130 were merged 95 seconds apart. The timings, read from the API:

| Run             | Created    | Job started    | Job completed |
| --------------- | ---------- | -------------- | ------------- |
| **33732556392** | `08:17:27` | `08:17:30`     | `08:20:14`    |
| **33732695554** | `08:19:02` | **`08:20:17`** | `08:22:5x`    |

The second run was created while the first was still rolling out and its job **did not start for 75 seconds**, beginning three seconds after the first finished. Two uploads and two rollouts did not overlap, and neither run was cancelled.

### Nothing here re-defines the build, and the 72-byte divergence is closed — it was two files

Every build is invoked **by name**: `pnpm build` for the frontend and `pnpm image` for the backend, exactly as a developer runs them. There is no `tsc`, no `vite build`, no `docker build` and no `--build-arg` anywhere in `deploy.yml`.

The deployed artefact is a **rebuild**, and what makes it the same thing is now a measurement rather than an argument. `VITE_API_BASE_URL` is set in the workflow file, the deploy fingerprints **that** build, and the bundle downloaded back from the CDN is **344,609 B / `7654c2e097fa03d738e488da88e265d8`** — byte-identical to the artefact Task 1.11.5 deployed by hand from a Mac. So the pipeline's build on Linux reproduces the hand deploy exactly.

**The divergence Task 1.11.5 measured is two files, not one, and the second one is invisible to a size comparison.** For one commit, on two runners, in the same minute:

| File                        | `verify`'s build                   | The deployed build                     |
| --------------------------- | ---------------------------------- | -------------------------------------- |
| `assets/index-*.js`         | 344,537 B `3c886f88…` (`_IZTTvsJ`) | **344,609 B** `7654c2e0…` (`BuDdAKpl`) |
| `index.html`                | 1,101 B **`21577235…`**            | 1,101 B **`e1768b6b…`**                |
| `assets/index-DFxUCjbx.css` | 10,926 B `f98519e3…`               | identical                              |
| `staticwebapp.config.json`  | 300 B `fce10675…`                  | identical                              |

`index.html` carries the hashed script filename, so it changes with the bundle **at exactly the same length**. Task 1.11.5 recorded the 72-byte JavaScript difference and stopped there; a reader comparing file sizes would have concluded the document was the same file, and it is not. Read the hash.

Both ends are now honest. The deploy prints the deployed fingerprint, and **`verify`'s own fingerprint step says in its summary that what it describes is not the deployed artefact** — the cheap half, and the half that stops a reader being misled by a table under a green tick.

### The image is tagged from the commit, and a `-dirty` tag cannot arise

`MARKETPULSE_IMAGE_TAG` is set from the checked-out commit's short SHA — the door `scripts/build-image.mjs` opened in Task 1.11.3 — rather than from whatever `HEAD` resolves to inside a checkout step. No second rule was invented.

Two belts for one brace, because the failure is silent: the workflow **asserts the checkout is clean before any build runs**, so a `-dirty` tag cannot be produced at all, and the push step refuses a `-dirty` tag anyway. On a clean CI checkout neither can fire, which is the point — one appearing means a step wrote into the working tree, and that is a different bug from anything this workflow is about.

### The pipeline's image is NOT an OCI index, and this contradicts what was recorded

Read back from the registry rather than inferred from a green push. The first pipeline image resolves to **`application/vnd.docker.distribution.manifest.v2+json`** with **zero** child manifests and **no attestations**, where the section above records a local `pnpm image` producing an OCI index carrying the `linux/amd64` manifest plus a buildx provenance/SBOM attestation at `unknown/unknown`.

**The cause is the image store, not the recipe.** `pnpm image` runs `docker build -t`, which uses the `docker` exporter; attestations need an exporter that can carry them, which on the development machine is Docker Desktop's containerd image store and on `ubuntu-latest` is not available. Same `Dockerfile`, same three build arguments, same runnable bytes — a different envelope around them.

**The stated reversal trigger did not fire and this is a different case.** That trigger was "any tool in the deploy path refusing the index"; nothing refused one. The builder never made one. So the honest statement is narrower than the one recorded above: **the index digest is the provenance record of a local build, and a pipeline image has no attestations to record.** What `deploy.yml` pins and prints is therefore _the digest the tag resolves to_ — which is what the platform pulls in either shape — with the platform manifest digest printed beside it when there is an index.

Accepted rather than chased, and the alternatives are priced: a sixth pinned action (`docker/setup-buildx-action`) plus a `--push` mode on a recipe whose "this pushes nothing" is a stated property, or reconfiguring the runner's Docker daemon to use the containerd store. **The reversal trigger is anything that actually consumes the attestations** — a policy check, a signature requirement, an SBOM scan.

### The backend has a fingerprint now, and it is a record rather than a check

The asymmetry Task 1.11.6 was asked to close: the frontend has had a four-file fingerprint in every job summary since Task 1.10.4, and the backend's equivalent figures existed only as prose in a task write-up. From deploy run 33732695554, commit `de943a2`:

|                                              |                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Tag                                          | `de943a2`                                                                 |
| Digest the tag resolves to                   | `sha256:870df0e180a32abcaed1e0a1e5fa7edd58fd0a00e3e65918fc5b2f8f08f978e0` |
| Media type                                   | `application/vnd.docker.distribution.manifest.v2+json`                    |
| Manifests in the index                       | 0                                                                         |
| Layers + config, as the registry stores them | 60,247,220 B                                                              |
| `/app` inside the image                      | 16,700 KB                                                                 |
| `/app/dist` files                            | 32                                                                        |

That is a **fourth** correct size for one image, beside the three the section above already warns about — `docker save` 60,266,496 B, the platform manifest 60,239,874 B and the platform's own pull event 59,768,832 B. Different boundaries, not different images. Quote which one you mean, and this one means "layer blobs plus the config, as the registry accounts for them".

Nothing asserts a digest. The image is supposed to change, and a pinned hash would be a check that fails for the right reason — the same argument the frontend's fingerprint carries.

Both fingerprints and the deployed record are `tee`d into the log as well as the job summary. The first run wrote them to the summary only, which is not greppable across runs, and being greppable across runs is the entire argument for having a fingerprint.

### The app is updated, never re-created, and pulls with its own identity

`az containerapp update --image <ref>` and nothing else. The ingress, the probes, the scale rule, the environment variables and the managed identity are all already set on this app and are deliberately **not** re-specified: a deploy step that restated them would be a second definition of the app's configuration, which is the same failure Story 1.10 forbids for the build.

**By digest rather than by tag.** A tag is a pointer that can be moved; a digest is the thing. The tag is still pushed and still means "the tree is exactly that commit" — it is how a human finds the image — but what the revision records is the digest.

**The registry decision was not silently reversed.** The container app pulls with its own **system-assigned managed identity** holding `AcrPull`; its `secrets` array is still empty and its registry entry still carries `"identity": "system"` with an empty `passwordSecretRef`. No admin-user password, no stored PAT. The workflow's own identity holds **`AcrPush`** on the registry and nothing else there — **CI never needs pull credentials at all**, which is the payoff of choosing ACR over the free GHCR in Task 1.11.3, arriving one task later than the decision.

`az containerapp update` returning is not the deploy being live — Task 1.11.5 measured a 20–25-second rollout during which the **old** revision serves the old bytes. The workflow waits for the new revision to be running, bounded at 300 s. It is deliberately **not** a smoke check; Task 1.11.7 owns whether the deployed thing works.

**One thing measured while writing that wait, which would otherwise have cost a five-minute timeout on a perfectly good deploy: `runningState` on a healthy replica at `minReplicas: 1` reads `RunningAtMaxScale`, not `Running`.** Read off the live app. Match the family, not the word.

### Two identities, named

| Identity                     | What it is                                                                                                                                                                                    | What it authorises                                                                                    | How to rotate                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **GitHub → Azure**           | Federated identity credential (OIDC) on app registration `marketpulse-github-deploy`, app id `1bb765eb-fff3-4aed-80f2-90796c2fbcfb`, service principal `f8b785a8-f6e1-4ca9-a71a-a906e5356d6a` | `AcrPush` on `crmarketpulse`; `Contributor` on the container app; `Contributor` on the static web app | Nothing to rotate — there is no secret. Revoke by deleting the federated credential or the role assignment |
| **Container app → registry** | System-assigned managed identity, principal `fe8a2ecd-719c-407e-94d4-629015bd889d`                                                                                                            | `AcrPull` on `crmarketpulse`                                                                          | Platform-managed; nothing stored                                                                           |

**The role assignments are scoped per resource rather than to the resource group**, which is tighter than the "role assignment on the resource group" this document originally intended. Three assignments instead of one, and the deploy credential cannot touch the Log Analytics workspace, the Container Apps environment or the database Epic 2 will create.

### The federated credential's subject is not the documented one, and this was a real failure

The first deploy run failed at `azure/login` with:

> `AADSTS700213: No matching federated identity record found for presented assertion subject 'repo:theSmaw@429802/marketpulse@1351035456:ref:refs/heads/main'`

The credential had been created with the documented form, `repo:theSmaw/marketpulse:ref:refs/heads/main`. **What GitHub actually presents for this repository is an ID-qualified subject** — `owner@<ownerId>/repo@<repoId>` — which no amount of reading the documented pattern would have produced. A second federated credential matching the presented subject verbatim is what fixed it; **both are kept**, because the ID-qualified form is what is presented today and the plain form is what the documentation describes.

Two things follow, and the second is the transferable one. The numeric ids are **stable** — they are GitHub's internal owner and repository ids — so a rename of either does not break this, which is the point of the format. And **the failure is only diagnosable from the error message**: the presented subject is not printed anywhere on the GitHub side, so an OIDC credential that will not exchange has to be read out of the Azure rejection. Read the subject the assertion carried; do not re-check the one you typed.

### Secrets: there are none, and that is the record

**No repository secret exists.** `gh secret list` is empty and so is `gh variable list`. Three identifiers are literals in `deploy.yml` — the application id, the tenant id and the subscription id — and they are identifiers rather than credentials: all three are already published in this document, in a public repository, and none authorises anything without a token whose OIDC claims match the federated subject. GitHub masks the client id in logs anyway, because `azure/login` registers it.

The Static Web Apps **deployment token** is fetched at the moment of use and lives only in one command's environment, with `--no-use-keychain` so the CLI stores nothing. It is never written to a file, a keychain or a repository secret. If it ever needs rotating that is `az staticwebapp secrets reset-api-key`, and nothing in this repository has to change.

**Epic 2's Alpaca key is the first real secret**, and it does not go here: it goes into the container app's `secrets` array referenced by `secretRef`, which Task 1.11.3 identified. Nothing in a frontend build may ever hold one — the substitution rule means anything the frontend build can see is downloadable.

### Preview environments are declined, as an action rather than a default

Nothing in `deploy.yml` creates one, and the deploy only ever runs on a push to `main`. The reason is measured rather than aesthetic: every preview environment gets its own origin, `CORS_ORIGIN` holds exactly one string, and a wildcard that admitted them would admit every Static Web App anybody deploys in that region. So a preview environment is a page that loads perfectly and cannot call the backend, failing with a `TypeError: Failed to fetch` that names neither CORS nor the origin.

### The frontend's transient now happens once per merge, and that is accepted

Task 1.11.4 measured a **~1.5-second window** on each frontend deploy in which the outgoing `index.html` is still served while its hashed asset has already been withdrawn, so a cold load in that window is broken. There is no flag on this platform that removes it. Automating the deploy turns that from a window somebody chose to open into one per merge to `main`.

**Deploying the frontend only when `apps/frontend` changed was the alternative and it was rejected on correctness, not on effort.** The bundle inlines `packages/shared` at build time, carries `VITE_API_BASE_URL` from this workflow file, and is produced by a `vite.config.ts` and a lockfile that both live outside `apps/frontend`. A path filter that named only `apps/frontend` would skip deploys that genuinely changed the artefact and leave the site quietly stale — a worse failure than a 1.5-second window, because it is silent and unbounded. Accepted, and recorded so it is a decision rather than an oversight.

### The workshop's stray host configuration, fixed on the Storybook side

The Static Web Apps client **globs the working directory** for `staticwebapp.config.json`, and in the pipeline it reported finding `apps/frontend/storybook-static/staticwebapp.config.json` — the workshop's copy, a build artefact of a different application — rather than the one in the directory being deployed. Task 1.11.4 saw the same thing by hand.

It was harmless because the two files were byte-identical, and that is a property of today rather than of the arrangement: the day somebody edits `apps/frontend/public/staticwebapp.config.json` and the workshop has not been rebuilt, the deploy takes a stale routing and cache policy from a directory nobody was thinking about, silently.

Fixed where the task said it should be — on the Storybook side. **`staticDirs: []` is the narrow fix and it does not work**, measured rather than assumed: the file still lands, because Storybook honours vite's own `publicDir`, which it inherits along with the rest of `vite.config.ts`. **`publicDir: false` in a one-key `viteFinal` does.** That file's standing "there is deliberately no `viteFinal`" is now a divergence with its reason written beside it, which is what that comment asked for. Confirmed on the next deploy: the client reports finding `apps/frontend/public/staticwebapp.config.json`, the source of truth.

### Dependabot, and the action pins re-counted from the files

**Five distinct actions, eight uses, every one on a commit SHA** — counted out of `.github/workflows/` rather than copied from a sentence, which is the instruction because this number has been wrong once:

| Action                    | Pin                  | Used in  |
| ------------------------- | -------------------- | -------- |
| `actions/checkout`        | `3d3c42e5…` (v7.0.1) | both     |
| `actions/setup-node`      | `82076278…` (v7.0.0) | both     |
| `actions/cache`           | `55cc8345…` (v6.1.0) | both     |
| `actions/upload-artifact` | `043fb46d…` (v7.0.1) | `verify` |
| `azure/login`             | `7ddb5af1…` (v3.0.2) | `deploy` |

Task 1.10.7 declined Dependabot on a one-file argument and stated the reversal trigger explicitly: **a fifth action**. `azure/login` is the fifth, so the trigger fired, and the decision is **taken** rather than left to drift past its own trigger unremarked. `.github/dependabot.yml` enables `github-actions` updates weekly; it opens pull requests and merges none, every bump still goes through `verify` and a human, and the SHA pinning is unchanged because Dependabot rewrites the SHA and its `# vX.Y.Z` comment together.

**npm is deliberately not enabled.** The pnpm workspace is a different question with a lockfile, an `allowBuilds` policy and a TypeScript pin held back on purpose against typescript-eslint's peer range. A bot opening pull requests against that is a decision Story 1.10 did not take and Task 1.11.6 is not the place to take it. The reversal trigger is a dependency here gaining a published advisory.

One thing worth knowing: it is a **file** and not the repository setting Task 1.10.7 assumed, so unlike the ruleset it is visible in a diff. It started work within a minute of landing on `main`.

### The deploy does not gate a merge, and that is recorded either way

Ruleset `main` (id 22160620) is **unchanged**: it requires a pull request and the `verify` check, and nothing was added to it. The deploy runs **after** a merge, so requiring it would be a gate on a thing that cannot have happened yet — and `workflow_run` runs are not attributable to a pull request as checks in the first place. A future reader finding the deploy job absent from the ruleset should read that as the decision, not as an omission.

### What this cost, in wall clock

The whole deploy is **~2 min 50 s** on the runner: run 33731233275 took 151 s and 33732695554 about 165 s, including a warm install from the cache `verify` wrote, a native `linux/amd64` image build (no emulation, unlike the 45.3 s Apple Silicon figure Task 1.11.2 measured as an upper bound), the registry push, a 20–25-second rollout wait, a full `pnpm build` and the upload. It runs after `verify`, so a merge is green in ~90 s and live in ~4 min 20 s.

`pnpm build` builds Storybook too, which is time spent on an artefact this workflow does not publish. It was **not** narrowed to `vite build`: that would be this file defining its own build, which is the one rule it exists not to break.

## What making the deployment fail measured (Task 1.11.7)

Four failure classes were made to happen against the live environment on 2026-09-03, the running pair was polled by request throughout each, and both rollbacks were executed rather than described. The headline is that **the one step written to catch a failing deployment had never run its failure branch, and running it changed the step**.

### The probes, read off the deployed app rather than from memory

| Probe     | Path      | Failures | Period | Grace                                   |
| --------- | --------- | -------- | ------ | --------------------------------------- |
| Startup   | `/health` | 30       | 2 s    | **60 s** before the container is killed |
| Readiness | `/health` | 3        | 10 s   | 30 s                                    |
| Liveness  | `/health` | 3        | 30 s   | 90 s                                    |

All three are HTTP against **port 3000**, pinned in the probe definition rather than derived from `PORT`. That is what makes the third failure mode cheap to produce: set `PORT=3001` and the server starts perfectly and answers nothing the platform asks.

### A failing rollout sits at `Activating` for ten minutes, and the wait step gave up four minutes too early

This is the measurement the task called its most valuable, and it is the one that changed shipped code. `deploy.yml`'s revision-wait step was written in Task 1.11.6 with a failure pattern of `*Failed*|Degraded|Stopped` and a 300-second deadline, and **only its success branch had ever executed**.

Deploying `PORT=3001`, watched off the live app:

|                                                                              |                                           |
| ---------------------------------------------------------------------------- | ----------------------------------------- |
| `az containerapp update` returned                                            | 09:08:58                                  |
| Replica reports `ready: false`, rising `restartCount`, `CrashLoopBackOff`    | from ~09:10:1x                            |
| Old wait step gave up on its 300 s deadline                                  | **09:14:52**                              |
| Revision left `Activating` for `ActivationFailed` / `healthState: Unhealthy` | **09:19:01 — 10 m 03 s after the update** |

So **the pattern was right and the deadline was wrong.** `ActivationFailed` matches `*Failed*`, and the step expired **4 min 09 s before it could ever match** — going red for the right reason by accident, with a message that said `still Activating after 300 s` rather than naming a health-check failure. The platform's own event stream is unambiguous meanwhile: `Probe of StartUp failed` every 2 s to a count of 120, then `Container marketpulse-backend failed startup probe, will be restarted` and `Container 'marketpulse-backend' was terminated with exit code '' and reason 'ProbeFailure'`.

**The replica knows first and knows why, and that is now what the step checks.** While the revision says `Activating`, the replica already carries the truth. The step now fails on any container that has restarted during a rollout — a healthy one reaches `RunningAtMaxScale` in 20–25 s having never restarted — and both branches were executed against the live app before the text landed in the file:

| Failure                                      | Old step                     | New step                              |
| -------------------------------------------- | ---------------------------- | ------------------------------------- |
| Starts, fails its health check (`PORT=3001`) | 300 s timeout, wrong message | **94 s**, names the restart           |
| Will not start at all (`PORT=0`)             | —                            | **36 s**, names `CrashLoopBackOff`    |
| Healthy rollout                              | success in 20–30 s           | success in 20–30 s, no false positive |

The deadline is now 600 s rather than 300 so `ActivationFailed` stays reachable as a backstop; it should never be what fires. One more thing that only appears by running it: **`runningState` returned an empty string on one poll of an otherwise healthy rollout**, so the loop prints `<empty>` and treats an unknown state as "keep waiting" rather than as a failure.

### The environment survived every one of them, and proving that needed a control

Across five rollouts — three failing, two healthy — **no request ever returned a non-200 HTTP status**, and the serving process's `uptimeSeconds` never reset.

That sentence took three attempts to be able to write honestly. Polling from a laptop produced runs of complete timeouts (curl exit 28), including one contiguous **65-second** run during a failing rollout, which reads exactly like the platform dropping traffic. Two controls settle it. A probe of **three hosts at the same instant on a steady system with nothing deploying** reproduced the same drops, twice hitting the backend and the frontend — two different Azure services in two different regions — in the same second. And decisively, the backend's own Log Analytics records show it answering **9 requests per 30 s during the window the laptop saw as a blackout**, against a probe-only idle baseline of ~~1–4~~ **a precise and explainable 4** per 30 s — liveness at `periodSeconds: 30` is 1 and readiness at `10` is 3 (refined by Task 1.12.7, 2026-09-04). The server never went quiet; the measuring path did.

**The lesson is worth more than the numbers: a deployment check that runs from one machine over one link cannot distinguish its own network from the environment it is checking, and the server-side record is the only tiebreak.** It is also a measured argument against a naive post-deploy smoke check — see below.

### Traffic weight is not what serves, for the fourth time, and there is a better field

The failing revision held **`trafficWeight: 100` while still `Activating`**, with the old revision at **weight 0** actually serving. A check written against traffic weight reports the opposite of the truth. Two fields do not lie: **`healthState`** reads `Healthy` on the serving revision and `None` (then `Unhealthy`) on the failing one, and **`/health`'s own `uptimeSeconds`** identifies the serving process from outside the platform entirely — it read 1,499 s while the new revision had existed for ten minutes.

### A half-deployed merge, and both questions it raises

The backend is deployed before the frontend deliberately, so a failure between them leaves a green `verify`, a red deploy and a site that works. Made to happen with a step that exits 1 between the halves (PR #134, deploy run 33743757931, red at 10:22:29):

- The backend image **moved** (`55d64495…` → `549b0888…`); the frontend did not deploy at all.
- `main` no longer contained the probe marker and **the served bundle still did** — the frontend was a commit behind, visibly.
- **Both halves answered 200. The environment was not broken** — and that is a property of _this commit_, not of the arrangement: `/health`'s contract did not change, so a page built against the old one still worked. A commit that changes the contract in the direction the page depends on would break it.

**Re-running the failed deploy is safe but is not a no-op, which is the opposite of what "idempotent update" suggests.** 202 probes across the re-run, all 200, no downtime. But the same commit through the same `pnpm image` invocation produced a **different digest** — `549b0888…` became `bf2007d5…`, layer bytes 60,247,138 against the 60,247,220 recorded in Task 1.11.6 — so the image is **not bit-reproducible across runs**, `az containerapp update` saw a genuine template change, and a **new revision was rolled out**. The consequence to carry: **the commit-SHA tag has now pointed at two different digests.** It still means "the tree is that commit", which is all `scripts/build-image.mjs` ever claimed; it does not mean "these exact bytes".

### The frontend's upload is still not atomic, and there is a second broken state nobody had recorded

**Scoped by Task 1.12.7 (2026-09-04): the window is a property of the artefact _changing_, not of deploying.** 174 consecutive CDN samples at 0.4 s across a whole `Deploy the frontend` step of a docs-only merge showed **zero** broken states — a byte-identical Linux rebuild keeps the hashed filenames, so there was no incoming asset to be missing and no outgoing one to withdraw. A mechanism explaining an observation and **not a re-test**: the window is real on a changing artefact and was not re-measured there.

Re-confirmed on the shipping pipeline, on a deploy whose hashed asset actually changed (deploy run 33743081928 — a deploy of identical bytes uploads the same filenames and withdraws nothing, which is why this needed a deliberate bundle change):

```
10:15:42  doc=200  asset=/assets/index-BuDdAKpl.js:200     <- old document, old asset
10:15:43  doc=200  asset=/assets/index-D8nQYqQm.js:404     <- NEW document, new asset MISSING
10:15:44  doc=200  asset=/assets/index-BuDdAKpl.js:200     <- old document again (non-monotonic)
10:15:44  doc=200  asset=/assets/index-BuDdAKpl.js:404     <- old document, old asset WITHDRAWN
10:15:45  doc=200  asset=/assets/index-D8nQYqQm.js:200     <- settled
```

About **two seconds**, and it contains **two distinct broken states rather than one**. Task 1.11.4 recorded the second — the outgoing asset withdrawn while the outgoing document is still served. The first is new: **the incoming document is served before the incoming asset exists.** Both hand a cold load a document whose `<script>` is a 404, which is exactly the failure `exclude: ["/assets/*"]` turns into a 404 naming the file rather than a MIME-type error naming nothing. Non-monotonic propagation is confirmed a third time and now in both directions. It reproduced again on the rollback deploy at 10:33:24.

**The timing is the part that matters for anything built on top of this: the window begins at the exact second the `Deploy the frontend` step reports success.** The step completed at 10:15:43 and the first broken observation is 10:15:43.

**What stands in for atomicity is a deliberate acceptance, not a mechanism.** There is no flag. Nobody already on the page is affected — their assets are fetched, and `no-cache` on the document means their next navigation revalidates. Only a cold load landing inside the window is broken, once per merge to `main`, for about two seconds. Deploying the frontend only when `apps/frontend` changed was already rejected in Task 1.11.6 on correctness, and that argument is unchanged: a bounded two-second window beats an unbounded silent staleness.

### Both rollbacks, executed — and the intuition is backwards twice over

**The backend's documented rollback does not exist on this app.** `az containerapp ingress traffic set` is refused: _"Containerapp 'marketpulse-backend' is configured for single revision. Set revision mode to multiple in order to set ingress traffic."_ Traffic splitting belongs to multiple revision mode. So the revision-label FQDNs this document offered as the mechanism are not reachable either without changing the app's configuration first — which is a change, made during an incident, to the thing that is already misbehaving.

What actually works, and was executed:

| Rollback | Mechanism                                          | Needs                                             | Measured                             |
| -------- | -------------------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| Backend  | `az containerapp update --image <previous digest>` | a digest, from any past deploy run's summary      | **43 s** (10:26:37 → 10:27:20)       |
| Frontend | a revert commit through `verify` and the pipeline  | the repository, a green chain, ~3 min of pipeline | **3 min 42 s** (10:29:42 → 10:33:24) |

**Two traps, both executed rather than asserted.** The backend's rollback creates a _new_ revision rather than reactivating the old one — and **the next merge silently undoes it**: the image went from the rolled-back `55d64495…` to the merge's `28432d57…` with nothing warning anywhere. It buys time; the durable fix is a revert commit through the pipeline, exactly as the frontend's is. And **`workflow_dispatch` on `deploy.yml` is a re-deploy, not a rollback** — it checks out `main`, so pressing it after a bad merge deploys the bad merge again. It exists for the frontend's genuine use, re-uploading an unchanged `main` after a partial upload, and it is exactly the button somebody will press in an incident.

The asymmetry to carry: **the half with no revision history at all recovers ~5x slower, and the fast half expires at the next merge.**

### Where a failure is visible, decided

**Adopted: the workflow run's conclusion and the platform's own state. No notification.** A failed deploy is a red run in the Actions tab, in `gh run list`, and — because the gate leaves a `skipped` run rather than a silence — even a deploy that never started has a visible record. The platform holds the other half: a failed revision is `ActivationFailed`/`Unhealthy` with the probe events beside it.

**What that costs, stated rather than glossed:** it is visible only to somebody looking at the repository. Checked rather than assumed — **the GitHub notifications inbox held no entry for the failed deploy run.** The badge cannot report it either, and that is by construction: `deploy` is a separate workflow precisely so the badge keeps certifying the chain and not the deployment. For a repository with one maintainer, where the deploy runs seconds after that maintainer pressed merge, that is enough — and it is the same argument Story 1.10 used to decline comment bots and coverage services. **The reversal trigger is a second maintainer, or any deploy that can fire when nobody is watching** (a schedule, a dependency bot merging on its own).

### The post-deploy smoke check: declined, with the gap named precisely

Nothing checks that the deployed application _works_ after the deploy step returns. The deploy asserts that the **revision is running**, which is the platform's view, and nothing anywhere loads the page.

Two measured shapes go straight through that gap, and both are green everywhere:

1. **A wrong `CORS_ORIGIN`** (Task 1.11.5): the browser gets `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a **200 with a full body** and the server logs `statusCode: 200`.
2. **A frontend build with no `VITE_API_BASE_URL`** (Task 1.11.6): no warning, no failure, and a page dialling `http://localhost:3000` that an HTTPS page blocks as mixed content.

**So the only check that would catch either is one that loads the deployed page in a real browser and asserts the cross-origin call succeeded.** A status code cannot do it and `curl` is structurally incapable of it — that is the whole finding of Task 1.11.5's allowlist experiment. A `curl`-based smoke check would therefore be a step that _looks_ like coverage of this gap and covers none of it, which is the shape this repository has now declined three times.

**Declined**, for a headless browser plus its download in every deploy, against a two-page application whose entire backend surface is `GET /health`. And this task adds two arguments the decision did not previously have, both measured here:

- **It would have to poll, not check.** The frontend's broken window opens at the exact second the upload step succeeds, and a backend rollout takes 20–25 s. A check that fires once immediately after the deploy step is red for reasons that are not faults.
- **Single-shot checks are flaky for reasons that have nothing to do with the deployment.** ~1% of requests from one machine over one link timed out with nothing deploying at all.

**The reversal trigger is a second environment to promote between, or this failure actually shipping** — a deploy that is green everywhere and broken in a browser, found by a person rather than by a task. If it is ever built, it belongs as a final step in `deploy.yml` after the upload, it polls with retries, and it asserts the cross-origin call rather than a status code.

### The fourth failure mode, named rather than reproduced

Task 1.11.2 measured what a start command that does not `exec` does: PID 1 is a shell, `SIGTERM` is swallowed, the platform waits out its **30-second** grace and then `SIGKILL`s, with no `signal received` and no `shutdown complete`. That is a successful-looking deploy whose every revision change costs 30 seconds per replica and reads as slowness rather than as an error — the same shape as the frontend's partial upload, a failure with no failure anywhere. It cannot arise from the current `Dockerfile`, whose `CMD` is the exec form. **It is the regression to watch for**, and the symptom to recognise is a rollout that suddenly takes 30 s longer per revision with nothing in the log.

### The platform's own restart behaviour, recorded beside all of this

An instance that crash-loops **after** a successful deploy is a failed environment produced by a successful deployment, and it is visible in exactly the places above and nowhere else: the replica's `restartCount` and `runningStateDetails`, the revision's `healthState`, and the platform's probe events. No workflow run is red, because none is running. That is the same gap the smoke-check decision leaves open, one step later in time, and the same reversal trigger applies.

### A configuration failure is visible, and unstructured — re-confirmed

Re-run here rather than cited. `PORT=0` exits before the logger exists and writes a plain stderr line, and Container Apps collects stdout and stderr together, so `PORT must be an integer between 1 and 65535, received "0"` **does** reach Log Analytics — as a bare `Log_s` string rather than as a structured record. Visible; not queryable as data.

## What Task 1.11.1 did not do — kept as its own record

**This section describes the state on 2026-09-03 _before_ the deploy above, and is kept rather than deleted because its argument is the reason the deploy went the way it did.**

**Task 1.11.1 deployed nothing and produced no artefact.** No Azure resource existed, no account was linked to the repository, no credential was created and no file outside `planning/` was touched. That was the point, and it is the same shape as Task 1.10.1 installing and stopping: when Task 1.11.3's first deploy failed, the platform choice would not be one of the candidate causes.

**It paid off, and the honest reckoning is that the first deploy had no platform surprises at all.** Every limit quoted in this document held. What did bite came from elsewhere: a `HOST` default of `127.0.0.1` that is correct everywhere except inside a container, a `consumption budget` CLI command that rejects its own valid input, and a first request that hung rather than failed. None of those is a hosting choice.
