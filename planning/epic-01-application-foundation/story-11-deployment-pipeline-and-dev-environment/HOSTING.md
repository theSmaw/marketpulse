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

**The service is Azure Database for PostgreSQL flexible server, ~~in East US~~ in the same subscription and resource group as the backend.** **The region was wrong and Task 2.1.1 corrected it to East US 2 on 2026-09-04 — East US is `OfferRestricted` for this subscription and offers no Postgres editions at all** — see _The database — the creation decisions_ below, which supersedes the three bullets in this section. The rest of this paragraph stands, and it is the half that had to be answered here: That is the answer to the provider half, and it is the half that had to be answered here: deferring provisioning is only free because the platform chosen for the backend has a managed Postgres adjacent to it. Had the backend gone to a provider with no database story, Epic 2 would have become a second vendor and a cross-network hop, and the deferral would have been a hidden cost rather than a saving.

**It is not provisioned now**, because this story stores nothing and an instance with no schema and no reader is idle cost with an operational surface. What Epic 2 must do, named here so it is not rediscovered:

- ~~Create the flexible server in **East US**~~ — **East US 2** (Task 2.1.1), in the backend's resource group, on the **Burstable B1MS** tier to stay inside the free offer.
- Choose the networking mode at creation — the quickstart is explicit that you "can't change it after creation". Public access with a firewall rule is the cheap path; private access via VNet integration is the correct one and costs the Container Apps environment a custom VNet. **Decide it in Epic 2 before creating the server, not after.**
- ~~Add the connection string through the platform's configuration, as a **secret** rather than a plain environment variable~~ — **superseded by Task 2.1.1: there is no connection secret.** The backend authenticates as its own managed identity and the `secrets` array stays empty. Extending `CONFIG_VARIABLES` and `apps/backend/.env.example` together so `pnpm env:check` keeps the pair honest is unchanged, and is Task 2.1.3's.

**What would make the deferral painful, stated honestly:** the 12-month free window starts at subscription creation, not at first use, so every month between now and Epic 2 is a month of that offer spent on nothing. That is the cost of deferring and it is accepted — the alternative is an idle database with a public endpoint and an admin password in a repository that has no use for either. **Task 2.1.1 removed half of that sentence's premise: the shipped decision creates no admin password at all.** **The reversal trigger is Epic 2 starting, or any earlier task discovering that the networking decision above forces a change to the Container Apps environment** — because a custom VNet is not something to retrofit under a running environment.

## The database — the creation decisions (Task 2.1.1)

**Decided 2026-09-04 by [Task 2.1.1](../../epic-02-security-universe-historical-data/story-01-managed-postgres-and-the-secrets-boundary/TASK-01-choose-the-creation-decisions.md), which provisions nothing.** No server, no database, no firewall rule, no secret, and no resource provider registration. Everything below is a decision plus the measurement or quotation behind it, taken so that the first failed provisioning attempt in this repository's history has one possible cause.

Every `az` command run for this task was a read. Every platform limit is quoted from vendor documentation dated 2026-09-04 with the source named, and every figure attributed to this subscription was read from it today. **Re-read the source rather than citing this document** — the section above already records one platform fact (East US) that stopped being true between stories.

### The decisions, in one table

| Decision         | Answer                                                             | Reversible after creation?                            |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Region           | **East US 2**                                                      | No, in practice — a server cannot move region         |
| Tier             | **Burstable, `Standard_B1ms`**                                     | **Yes** — `az postgres flexible-server update --tier` |
| Postgres version | **18**                                                             | Forward only, with no automated revert                |
| Networking mode  | **Public access**, firewall rule `0.0.0.0` plus the developer's IP | **No.** The one genuine one-way door                  |
| Authentication   | **Microsoft Entra only; password authentication `Disabled`**       | **Yes** — both flags exist on `update`                |
| Storage          | **32 GiB, autogrow `Disabled`**                                    | Grow only, in 2× steps, never shrink                  |
| Backup retention | **7 days**, geo-redundancy `Disabled`                              | Retention yes, up and down. Geo-redundancy **no**     |

### Region: ~~East US 2~~ North Central US, and the choice was made for us — twice

> **Superseded 2026-09-05 by Task 2.1.5.** East US 2 was itself `OfferRestricted` for this subscription one day after this section was written, and the database is in **North Central US**. The section below is kept because its reasoning is what a future reader needs; only its answer changed. **The instruction it ends with — re-read `list-skus` rather than citing this document — earned itself in 24 hours.**

**Task 1.11.1 recorded East US and Epic 2 inherited it. It is not available.** Read from the capability API today rather than discovered at creation:

```
az postgres flexible-server list-skus --location eastus
→ "reason": "Provisioning is restricted in this region. Please choose a different region.
   For exceptions to this rule please open a support request with Issue type of
   'Service and subscription limits'."
```

East US returns **zero server editions and zero server versions**. The mechanism is named in the response's own feature list: `OfferRestricted` is **`Enabled`** in East US and **`Disabled`** in every other region checked. So this is a property of this subscription's offer in that region, not a general outage, and it is the second time this subscription has been unable to put a resource in East US — Task 1.11.4 found Static Web Apps is not offered there at all.

Eight regions were read, and East US is the only restricted one:

| Region           | Versions offered | Burstable B1MS | `OfferRestricted` |
| ---------------- | ---------------- | -------------- | ----------------- |
| `eastus`         | **none**         | **no**         | **Enabled**       |
| `eastus2`        | 11–18            | yes            | Disabled          |
| `centralus`      | 11–18            | yes            | Disabled          |
| `westus2`        | 11–18            | yes            | Disabled          |
| `westus3`        | 11–18            | yes            | Disabled          |
| `southcentralus` | 11–18            | yes            | Disabled          |
| `northcentralus` | 11–18            | yes            | Disabled          |
| `canadacentral`  | 11–18            | yes            | Disabled          |

**East US 2 is chosen from that list because this subscription already has a resource there and the resource group already spans regions.** `marketpulse-frontend` is in East US 2 inside `rg-marketpulse-dev`, which is itself in East US — read back today, so the arrangement is a measured precedent rather than an assumption about what resource groups permit. A resource group's location fixes where its metadata lives and not where its resources run.

**The price is identical, which is the reason this costs nothing to accept.** Read from the Retail Prices API for both regions on 2026-09-04: B1MS `$0.017`/hour, storage `$0.115`/GB/month, backup LRS `$0.095`/GB/month — the same three numbers in East US and East US 2.

**What it does cost is co-location with the backend**, which stays in East US. Both are Virginia and the hop is intra-geography, but **that latency has not been measured and must not be assumed** — it cannot be, without a server. **Task 2.1.5 owns measuring it** and reporting the round trip of a trivial query from the deployed backend, which is the first number that would justify revisiting this.

Two alternatives were rejected with reasons rather than skipped:

- **Move the backend to East US 2 so both halves share a region.** A Container Apps environment cannot change region, so this means re-creating `cae-marketpulse-dev`, which changes its unique id, which changes the backend FQDN, which is `VITE_API_BASE_URL` in `deploy.yml`, `CORS_ORIGIN` on the app, a frontend rebuild, and both of Task 1.13.5's deployed addresses. That is the whole of the _Reversal cost_ section below, spent on a millisecond.
- **Open the support request the error message offers.** A quota exception on a free account, for a restriction with a free workaround one region away.

### Tier: Burstable B1MS, which the offer decides and which the documentation argues against

**B1MS is not chosen so much as constrained**, and the constraint is the free account's offer: 750 hours of Burstable B1MS, 32 GB storage and 32 GB backup storage, for 12 months. Note the hours are not a real limit — **a 31-day month is 744 hours**, so 750 covers continuous operation in every calendar month with six hours to spare.

**What would break the constraint is written down here rather than discovered**, because the documentation is blunt about this tier and the story that follows this one is a bulk backfill:

> **Burstable** … Uses a CPU credit model: credits accumulate when usage is below baseline and are consumed when usage exceeds it. When credits are exhausted, the VM is restricted to baseline CPU, which under sustained load can cause severe performance degradation, connection timeouts, and delays or transient failures in management operations until credits rebuild. **Not recommended for production workloads.**

and

> Burstable compute is for workloads that stay idle or below baseline most of the time. If CPU runs near or above baseline for long periods, credits deplete and **the server might become unreachable**. This tier … **does not qualify for 24/7 support**, and root cause analysis (RCA) may not be provided.

— [Compute options](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-compute), read 2026-09-04

**So the reversal trigger is named in advance: Story 2.7's backfill depleting CPU credits, or Epic 3's continuous writes.** The mitigation the documentation asks for is an Azure Monitor alert on **CPU Credits Remaining**, which belongs to whichever of Tasks 2.1.5 and 2.1.8 sets alerts.

**And the tier is the least expensive of these decisions to get wrong, which is the correction worth carrying.** `--tier` and `--sku-name` are both arguments of `az postgres flexible-server update`, verified today — so tier is a setting, not a door. Being wrong costs money and a restart, and leaves the offer; it does not cost a rebuild.

Two B1MS numbers are load-bearing for tasks that follow, so they are recorded here rather than rediscovered:

- **Maximum user connections is 35**, not 50. The documented table gives B1ms `max_connections` **50** and maximum _user_ connections **35**, because "an Azure Database for PostgreSQL flexible server reserves 15 connections for physical replication and monitoring". **Task 2.1.4 sizes its pool against 35**, shared with every migration run, every psql session and every replica.
- **There is no PgBouncer.** "Burstable servers currently don't have access to the built-in PgBouncer connection pooler" — so the pooling the documentation recommends when connections are tight is unavailable at this tier, and the application's own pool is the only pool.

B1ms is 1 vCore, 2 GiB memory, 640 maximum IOPS, 10 MiB/sec maximum I/O bandwidth.

### Postgres version: 18

Available versions in East US 2 today are **11, 12, 13, 14, 15, 16, 17, 18**, read from the capability API and matching the quickstart's "Currently supported: 18, 17, 16, 15, 14, 13, 12, 11".

**18 is chosen for the support window, because that is what a twelve-month decision turns on.** From the [version policy](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-version-policy), read 2026-09-04:

| Version | Azure support start | Azure support end |
| ------- | ------------------- | ----------------- |
| 18      | 25-Sep-2025         | **14-Nov-2030**   |
| 17      | 30-Sep-2024         | 8-Nov-2029        |
| 16      | 15-Oct-2023         | 9-Nov-2028        |
| 15      | 15-May-2023         | 11-Nov-2027       |

**The "too new to trust" argument was checked and does not apply**: 18 has been supported on Azure since 25-Sep-2025, which is **eleven months** as of today, so it is not a fresh GA.

**The extension question was checked rather than guessed, and it turned out not to constrain the choice at all** — which is worth recording, because `CLAUDE.md` names "PostgreSQL, optionally TimescaleDB" and this epic stores time series, so it looked like it would decide the version. From the [extensions list](https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions-versions), read 2026-09-04: **`timescaledb` is 2.24.0 on PostgreSQL 15, 16, 17 _and_ 18 alike**, and drops to 2.15.3 only at 14 and below. `pg_partman` is 5.4.3 on 16, 17 and 18 against 4.7.1 on 15. `vector` is 0.8.2 on everything from 14 up. So extensions rule out 14 and below and are silent between 15 and 18.

**A major version upgrade is available and is a one-way door, which is why the version is decided here at all.** In-place upgrade is supported, can skip versions, retains the server name and needs no connection-string change — but:

> After an in-place major version upgrade is successful, there are no automated ways to revert to the earlier version. You can perform a point-in-time recovery (PITR) to a time before the upgrade to restore the previous version on a new server.

and it requires "at least 10-20% free storage available", which on a 32 GiB disk is a real precondition rather than a formality.

**One correction to this task's own brief.** It says "a major upgrade on a flexible server is not free". No fee is charged for an in-place major version upgrade; what it costs is **downtime, a precheck that can block on extensions, and irreversibility**. The decision deserves the care the brief asks for, for those reasons rather than for a line on a bill.

**Handed to Task 2.1.2: the local development database must be PostgreSQL 18**, or the local and deployed servers disagree about the one thing neither of them will tell you they disagree about.

### Networking: public access, and the allowlist named in words rather than adopted

**This is the one genuine one-way door in this story**, and both directions are quoted rather than paraphrased:

> Choose your connectivity method (**you can't change it after creation**).
> — [Quickstart](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/quickstart-create-server)

> **We currently don't support moving in and out of a virtual network.**
> We currently don't support combining public access with deployment in a virtual network.
> — [Limits](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-limits)

**The decision is public access with a firewall rule, and the rule that actually gets used is `0.0.0.0`.** What that admits is Microsoft's own sentence, not a summary of it:

> **Important**
> The **Allow public access from Azure services and resources within Azure** option configures the firewall to allow **all connections from Azure, including connections from the subscriptions of other customers**. When you select this option, make sure that your sign-in and user permissions limit access to only authorized users.
> — [Networking with public access](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-networking-public)

So the network boundary admits every Azure tenant's compute. **The password — if there were one — would be the entire security boundary.** That is the sentence that decides the authentication section below, and the two decisions are one decision read twice.

**"Allow this one IP instead" is not on the menu, and this was measured rather than cited.** The deployed backend's own outbound address list, read from the platform today:

- **321 distinct IPv4 addresses**, across **58 distinct /16 prefixes**, the largest single block being 44 addresses in `40.121.0.0/16`.
- The environment's `staticIp` (`20.253.60.207`) is **not** one of them — it is the inbound virtual IP, so the field that looks like the answer is about the other direction.
- Two readings three minutes apart were **identical, 321 for 321, nothing added and nothing removed**. So the set is not thrashing minute to minute; what makes it unusable as a firewall rule is its size, its spread, and the platform's own statement that it is not a contract:

> **Outbound public IP** — Used as the "from" IP for outbound connections that leave the virtual network. … **Outbound IPs might change over time.** Using Azure NAT Gateway or another proxy for outbound traffic from a Container Apps environment is supported only in a workload profile environment.
> — [Networking in an Azure Container Apps environment](https://learn.microsoft.com/en-us/azure/container-apps/networking)

**The NAT Gateway escape hatch exists on paper and is closed in practice here.** `cae-marketpulse-dev` is a workload profiles environment, so it qualifies — but NAT Gateway integration needs a custom virtual network, and the environment has none (`vnetConfiguration: null`, read today), and:

> After you create an environment with either the default Azure network or an existing virtual network, **you can't change the network type**.

So a stable outbound IP and private access are the _same_ project: re-creating the Container Apps environment. That re-creation changes the environment's unique id, therefore the backend FQDN `marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io`, therefore `VITE_API_BASE_URL`, `CORS_ORIGIN` and both of Task 1.13.5's deployed addresses, and therefore a frontend rebuild. **It is the whole of the Reversal cost section, spent to protect a database that is empty.**

**One cost argument was tempting, is wrong, and is recorded as wrong so nobody reaches for it.** This document already quotes that "private endpoints and planned maintenance are subject to a **Dedicated Plan Management** charge regardless of whether you use the Consumption or Dedicated plans" — re-read on 2026-09-04 and still accurate. It does **not** apply to this comparison: the Postgres private-access path is virtual-network _injection_ of the database into a delegated subnet, not a **Container Apps private endpoint**, so that meter is not what makes private access expensive here. The environment re-creation is.

**Two more consequences of taking the public door, both permanent:**

- **Every restore is public, forever.** "If you configure your source server with a _public access_ network, you can only restore to public access. … You can't perform PITR across public and private access." So the one-way door binds the recovery path too, not only the running server.
- **The database can dial out and cannot be stopped from it.** "Public access database servers can connect to the public internet; for example, through `postgres_fdw`. **You can't restrict this access.**"

**What makes this acceptable is stated as a condition rather than a shrug**, in the shape the _development environment_ section above uses. Nothing in this database is a credential, nothing in it is personal data, and everything in it is **re-derivable from Alpaca by re-running Story 2.7's backfill** — so the loss from a read is a market-data cache somebody else could have fetched themselves, and the loss from a write is a backfill. **The reversal trigger is the first row that is none of those things**: a stored Alpaca key, anything about a user, or Epic 12's investigation history, whose value is the analysis rather than the prices.

**The firewall gets exactly two rules and they are both narrow in the ways available**: `0.0.0.0` for Azure, and the developer's own address for Tasks 2.1.5 and Story 2.2's migrations. Note that "changes to the firewall configuration … can take up to five minutes to take effect", which is a real wait to plan for rather than a failure to debug, and that rules must be IPv4 — "If you specify firewall rules in IPv6 format, you get a validation error."

**TLS needs no decision and gets one anyway, because it is the thing most likely to be quietly turned off later**: "Connection encryption is enforced for your network traffic" applies to both networking modes, so `sslmode=require` at minimum is the platform's floor rather than our choice. What is _our_ choice is whether the client verifies the certificate rather than merely encrypting — the Microsoft sample connection string in the managed-identity documentation carries `Trust Server Certificate=true`, which is verification switched off. **Task 2.1.4 must not copy that**, and Story 2.1's acceptance criterion 2 is about TLS rather than about encryption-if-convenient.

### Authentication: Microsoft Entra only, and the platform ends this story holding no secret at all

**The decision is `--microsoft-entra-auth Enabled --password-auth Disabled`, with no admin username and no admin password created at any point.** The deployed backend authenticates as its own system-assigned managed identity; the operator authenticates as the server's Entra administrator.

**The argument is the previous section's.** With `0.0.0.0` in the firewall, every Azure tenant can reach the endpoint, so the credential is the entire boundary — and the strongest available answer to "what if the credential leaks" is that **there is no credential**. That is the same reasoning that put `acrPull` on a managed identity rather than a registry password, and a federated identity credential rather than a service-principal secret; this is the third time, and it is the first time the alternative would have been genuinely dangerous rather than merely untidy.

**The result is that ADR 0011's "nothing deployed holds a credential" survives this story**, which is not what Epic 2's own framing predicted. `EPIC.md` says this epic "is the first thing that puts a credential on the platform" and that the claim expires here. Measured today, `marketpulse-backend`'s `configuration.secrets` is **`null`** — still empty, as Task 1.11.3 left it — and this decision keeps it that way. **The claim expires in Story 2.6 instead**, for the reason below.

**The mechanism, so that Tasks 2.1.4 to 2.1.6 implement it rather than research it:**

| Piece                     | Value                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Backend identity          | System-assigned, name **`marketpulse-backend`**                                                |
| — principal / object id   | `fe8a2ecd-719c-407e-94d4-629015bd889d`                                                         |
| — client (application) id | `748ccf1c-7f36-441f-aa84-51abb052489c`                                                         |
| Token resource            | `https://ossrdbms-aad.database.windows.net`                                                    |
| Postgres username         | the identity's **name**, `marketpulse-backend`                                                 |
| Postgres password         | the access token, verbatim                                                                     |
| Role creation             | `select * from pgaadauth_create_principal('marketpulse-backend', false, false);`               |
| — run where               | on the **`postgres`** database, connected as the Entra administrator                           |
| Entra administrator       | `bensmawfield_outlook.com#EXT#@bensmawfieldoutlook.onmicrosoft.com`, `8d92279d-…-ba258857457c` |

> After you authenticate against Active Directory, you retrieve a token. **This token is your password for signing in.**
> — [Microsoft Entra authentication](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-azure-ad-authentication)

**The token lifetime is the number Task 2.1.4 needs and it is the favourable one**: "User tokens are valid for up to 1 hour. **Tokens for system-assigned managed identities are valid for up to 24 hours.**" So the deployed pool refreshes at most daily, and the operator's own `psql` session is the one that expires in an hour.

**The single most expensive thing to get wrong here is where the token comes from, and the documentation will send you to the wrong address.** Azure's own managed-identity-for-Postgres page is written for a virtual machine and tells you to `GET http://169.254.169.254/metadata/identity/oauth2/token`. **That is not how a container app gets a token.** Container Apps exposes its own endpoint through two environment variables:

> A container app with a managed identity exposes the identity endpoint by defining two environment variables:
>
> - `IDENTITY_ENDPOINT`: Local URL from which your container app can request tokens.
> - `IDENTITY_HEADER`: A header used to help mitigate server-side request forgery (SSRF) attacks. The value is rotated by the platform.

with `api-version` "2019-08-01" or later and the header sent as `X-IDENTITY-HEADER`. **Copying the Postgres page's recipe produces a request that hangs or is refused inside a container app**, which is exactly the failure Task 2.1.4 would spend an afternoon on. The Azure Identity client library for JavaScript abstracts both, which is the shape to prefer.

**Three costs of this decision, stated rather than discovered:**

1. **Token acquisition sits in the connection path.** Whatever driver Task 2.1.4 chooses must accept a **per-connection credential that can be computed asynchronously**, not a fixed password string — that is now a selection criterion for the driver rather than a detail after it.
2. **Local development cannot use this mechanism at all**, and does not need to: Task 2.1.2's local database is a different server, reached with an ordinary password. So Task 2.1.3's configuration boundary must express **two shapes of credential** — a literal locally, an identity deployed — and that asymmetry is a property of the decision rather than a wart in the configuration module.
3. **There is a manual bootstrap that is in nobody's tree.** Someone has to connect as the Entra administrator and run `pgaadauth_create_principal` once. Like the repository ruleset and the platform-only `CORS_ORIGIN`, it is configuration no file here can hold, so it is written down in this document and nowhere else.

**Two risks, both with named recoveries.**

- **The Entra administrator is a guest account.** The subscription owner is `…#EXT#@bensmawfieldoutlook.onmicrosoft.com` — an external identity in the default directory, read today — and this document should not pretend that a guest principal as the sole database administrator is the well-trodden path. **Task 2.1.5 must connect as the Entra administrator and see it work _before_ it relies on it**, and if it cannot, that is the trigger to fall back to password authentication and record the divergence here with its reason.
- **Lock-out is a control-plane problem, not a database one.** `--microsoft-entra-auth` and `--password-auth` are **both arguments of `az postgres flexible-server update`**, verified today, so password authentication can be switched back on and an admin password set without any database access. **Authentication is therefore the most reversible decision in this section**, which is the opposite of where the brief placed it.

**What Story 2.6 inherits, and it is not what Story 2.1's summary predicts.** Story 2.1 says it hands forward "a credential path that Story 2.6 reuses rather than reinvents". **The path does not transfer as-is, and saying so now is cheaper than discovering it under time pressure.** An Alpaca key is a bearer secret issued by a third party that has no Azure identity behind it; no identity mechanism can hold it, because there is nothing to be an identity _of_. So Story 2.6 genuinely must place a secret, and it is the first thing to do so.

What _does_ transfer is the identity rather than the credential type: the recommended shape for Story 2.6 is a Container App secret **sourced from Azure Key Vault and fetched by this same system-assigned managed identity**, so the thing stored on the platform is a reference and the thing that authorises reading it is the identity this task already relies on. That keeps one credential path in the system. **Story 2.6 owns that decision** — this is a recommendation with a reason, not a decision taken on its behalf.

### Storage and backup: the only free number, and the one setting that can spend it

**Storage is 32 GiB, and there is no decision in the number.** The minimum for a flexible server is 32 GiB and the free offer's ceiling is 32 GB — the floor and the ceiling are the same value. **The trap is the CLI's default, which is `128`**: `--storage-size` reads "Minimum is 32 GiB and max is 16 TiB. **Default: 128.**" A create that omits the flag provisions four times the offer and silently leaves it.

**The real decision is autogrow, and it is `Disabled`.** That is also the CLI default, so this is a default chosen rather than inherited — the reason matters more than the value:

- "Server storage can only be scaled in **2x increments**", so autogrow's smallest possible step is 32 → **64 GiB**.
- 64 GiB leaves the offer, at `$0.115`/GB/month = **`$7.36`/month**, arriving with no prompt and no approval.
- "**Decreasing the server storage size isn't supported.** To decrease the storage size, you need to dump and restore to a new server." So the step cannot be undone.
- "At this time, scaling up the server storage **requires a server restart**."

**What replaces autogrow is an alert, which the documentation itself recommends** — "set alert rules for `storage used` or `storage percent` … For example, you can set an alert if the storage percentage exceeds 80% usage" — and which belongs to whichever of Tasks 2.1.5 and 2.1.8 owns monitoring. The failure autogrow protects against is real and worth naming: at 95% used, **or fewer than 5 GiB free, whichever is more**, "the system automatically switches the server to _read-only mode_". ~~**On a 32 GiB disk the binding clause is the 5 GiB one, so the usable capacity is about 27 GiB, not 32.**~~ **Corrected by Task 2.1.5 on 2026-09-05: it is ~22.5 GiB.** This calculation assumed the disk is empty when the database is empty, and it is not — the created server reads `storage_used` **3.740 GiB** and `storage_free` **27.461 GiB** with 47 MB of databases on it, the rest being filesystem overhead on the formatted P4 volume. Free space starts at 27.46 GiB, not 32, so subtracting the 5 GiB read-only floor leaves **~22.5 GiB**.

**The ingestion arithmetic, with its assumptions visible, because that is what the brief asks for and what makes it checkable later.** Story 2.7 states the shape: ~100 securities × 390 minute bars per session × ~252 sessions, which is **9,828,000 minute-bar rows per year**, and ~25,200 daily-bar rows per year.

Assume the narrowest reasonable row — `security_id int4`, `ts timestamptz`, four `float8` prices, `volume int8` — which is 52 bytes of column data:

| Component                                                          | Bytes per row |
| ------------------------------------------------------------------ | ------------- |
| Column data                                                        | 52            |
| Heap tuple header (23 B) plus alignment                            | 24            |
| Line pointer in the page                                           | 4             |
| One btree index on `(security_id, ts)`, at the default fill factor | ~27           |
| **Assumed total, rounded up for bloat and alignment slack**        | **~120**      |

- **A year of minute bars is ~1.18 GB.** A year of daily bars is ~3 MB and is, as Story 2.7 says, effectively free.
- Against ~~~27 GiB~~ **~22.5 GiB** usable that is roughly ~~**24 years**~~ **~20 years** of minute history for 100 securities — or ~~**~5 years**~~ **~4 years if this estimate is wrong by a factor of five**, which is the number worth remembering, because it is the one that still says "comfortable". (Re-taken by Task 2.1.5 against the created server; the conclusion is unchanged and the arithmetic was ~17% optimistic.)
- **Two things this estimate deliberately does not include**, both of which Story 2.7 must add: WAL, which shares the same volume and which a bulk backfill generates in quantity, and any index beyond the primary key. Story 2.7's instruction to "do this arithmetic with real row sizes measured after loading a sample, not estimated" stands unchanged — **this is the prediction that measurement checks**, not a replacement for it.

**Backup retention is 7 days, and geo-redundancy is `Disabled`.** Three reasons, in order of weight:

- **The included allowance makes the offer's "32 GB backup" almost beside the point**: "Azure Database for PostgreSQL provides **up to 100 percent of your provisioned server storage as backup storage at no extra cost**." With 32 GiB provisioned, 32 GiB of backup is free whether or not the offer applies, and a ~1.2 GB database's daily differentials plus WAL will not approach it in seven days.
- **Retention is the one knob here that moves freely in both directions** after creation, so choosing the default costs nothing and choosing 35 now would buy a recovery window nobody has asked for.
- **Geo-redundancy is a one-way door and is not worth it here**: "You can configure geo-redundant backup **only when you create the server**", and it doubles the backup size with billing "((2 × local backup size) - provisioned storage size)". The contents of this database are re-derivable from Alpaca; a region-loss recovery plan for a market-data cache is protection nobody needs.

One limitation to know before reaching for it: "**The Burstable server compute tier doesn't support the on-demand backup feature.**" So before anything risky, the manual backup is `pg_dump`, not a portal button.

### What is actually irreversible — and the brief's list of four is wrong in both directions

The task names four decisions as "irreversible or expensive-to-change": tier, networking mode, region, version. Checked against the platform today, **exactly one of those four is genuinely irreversible, and three irreversible decisions are missing from the list.**

| Decision                | Actually?                                    | Evidence                                                                  |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Networking mode         | **Irreversible**                             | "We currently don't support moving in and out of a virtual network."      |
| Storage **type**        | **Irreversible** — _not on the brief's list_ | Quickstart, "Can change later: ❌ No"                                     |
| Backup **redundancy**   | **Irreversible** — _not on the brief's list_ | "You can configure geo-redundant backup only when you create the server." |
| Data encryption key     | **Irreversible** — _not on the brief's list_ | Quickstart, "Can change later: ❌ No"                                     |
| Admin **username**      | Irreversible **if one is created**           | `--admin-user`: "Once set, it cannot be changed"                          |
| Region                  | Irreversible in practice                     | No move operation; a new server plus a migration                          |
| Version                 | **Forward only**                             | "no automated ways to revert to the earlier version"                      |
| Storage **size**        | Grow only, in 2× steps                       | "Decreasing the server storage size isn't supported."                     |
| **Tier / SKU**          | **Fully reversible**                         | `--tier` and `--sku-name` are arguments of `update`                       |
| **Authentication mode** | **Fully reversible**                         | `--microsoft-entra-auth` and `--password-auth` are arguments of `update`  |

**The admin-username row disappears entirely under the authentication decision above**: creating no admin user means there is no immutable name to regret. That is a second, unlooked-for benefit of the Entra-only choice and it is recorded because it would otherwise look like an omission at creation.

Two defaults are therefore load-bearing and must be passed explicitly rather than relied on: **storage type** (`Premium_LRS`, the default, and irreversible) and **geo-redundant backup** (`Disabled`, the default, and irreversible). A default that cannot be changed later is not a default; it is a decision somebody did not notice making.

### The prerequisite that would have failed the first create, found before it ran

**`Microsoft.DBforPostgreSQL` is `NotRegistered` on this subscription**, read today. This is Task 1.11.4's failure exactly — the subscription had never registered `Microsoft.Web`, and the first Static Web App create failed while the region query that preceded it succeeded — and **the same asymmetry reproduced here**: the name-availability check for `psql-marketpulse-dev` returned `"nameAvailable": true` from an unregistered provider, so the reassuring call answers before the one that matters fails.

Registering it is a change to the subscription, so **this task did not do it**; it is Task 2.1.5's first command, recorded here as a prerequisite in the shape `ACCOUNT-SETUP.md` records one:

```
az provider register --namespace Microsoft.DBforPostgreSQL --wait
```

**`psql-marketpulse-dev` is available** as a server name, checked today against `checkNameAvailability` in East US 2 — the name is globally unique across Azure, so it is worth re-checking at creation rather than assuming it is still free.

### The cost prediction, written as a prediction

**Inside the offer, the database costs `$0.00`**, and that holds only while all three of these are true: the tier is B1MS, storage is 32 GiB, and the server runs no more than 750 hours in a calendar month — which, at 744 hours in the longest month, is unconditional. The offer runs 12 months from subscription creation, so it expires around **2027-09-03**; the clock started at `2026-09-03T05:32:32Z` whether or not anything used it.

**Outside the offer — after expiry, or the moment any one of those three conditions breaks** — read from the Retail Prices API for East US 2 on 2026-09-04:

| Meter               | Rate                  | Monthly          |
| ------------------- | --------------------- | ---------------- |
| B1MS compute        | `$0.017` / hour       | `$12.41` (730 h) |
| Storage, 32 GiB     | `$0.115` / GB / month | `$3.68`          |
| Backup, within 100% | `$0.095` / GB / month | `$0.00`          |
| **Database total**  |                       | **`$16.09`**     |

Against Epic 1's re-derived totals, and the budget was re-read today rather than cited — `marketpulse-monthly`, **`$20`/month**, actual-cost alerts at **50 / 80 / 100%** to the account owner, all three enabled:

|                            | Epic 1   | Database | Total        | Against a `$20` budget    |
| -------------------------- | -------- | -------- | ------------ | ------------------------- |
| Idle rate, inside offer    | `$9.21`  | `$0.00`  | **`$9.21`**  | 46% — no alert            |
| Active rate, inside offer  | `$19.04` | `$0.00`  | **`$19.04`** | 95% — the 80% alert fires |
| Idle rate, offer expired   | `$9.21`  | `$16.09` | **`$25.30`** | **127% — all three fire** |
| Active rate, offer expired | `$19.04` | `$16.09` | **`$35.13`** | **176% — all three fire** |

**So the budget changes meaning rather than changing value.** Today it sits just _above_ the active-rate total, which this document already records as the wrong side of the number that matters. With the database inside its offer it is unchanged; with the offer expired it is exceeded in every case.

**The recommendation to Task 2.1.8, which owns the budget, is to leave it at `$20`.** Raising it in anticipation is precisely wrong: while the offer holds, the database's true contribution is `$0.00`, so **a budget alert attributable to the database _is_ the signal that one of the three offer conditions broke** — most likely autogrow, or a tier change made to get through a slow backfill. A budget raised to accommodate a cost that should not exist cannot report that cost appearing.

**The falsifiable predictions, for Task 2.1.8 to check against a real bill rather than re-derive:**

1. The database's line on the first bill after provisioning is **`$0.00`**, or a `Compute - Free` meter at zero — a meter of exactly that name exists in the price list for this service at `$0.0`/hour.
2. **No budget alert fires because of the database** during the offer window.
3. The total stays in the **`$9.21`–`$19.04`** band this document already predicts, unchanged by the database's arrival.

**And the cost question Epic 1 could not answer is still unanswered, with its refusal characterised again — the shape has not changed since Task 1.12.7.** `az consumption usage list` for 2026-09-01 to 2026-09-04 returns **`[]` at exit 0**, and the budget reports `currentSpend` of **`0.0` USD** with no forecast. **What has changed is that the lag explanation no longer covers it**: the first resource in this subscription is stamped `2026-09-03T05:32:32Z` and this reading was taken at `2026-09-04T11:20Z`, so the environment is now about **30 hours** old against Azure's documented 8–24 hour cost-data lag. Either the data is late beyond its own stated window or something else refuses it. **Task 2.1.8 still owns it**, and now has a sharper question than "wait longer".

### What each later task inherits from this one

- **2.1.2** — the local database is **PostgreSQL 18**, and it authenticates with a password, because the deployed mechanism structurally cannot be reproduced locally.
- **2.1.3** — the configuration boundary carries **two shapes of credential**, a literal locally and an identity deployed; that is the decision above, not an accident of the module.
- **2.1.4** — the driver must accept an **asynchronously computed per-connection credential**; the pool is sized against **35 user connections** with **no PgBouncer available**; the token comes from `IDENTITY_ENDPOINT`, **not** from `169.254.169.254`; and TLS must **verify** rather than merely encrypt.
- **2.1.5** — run `az provider register --namespace Microsoft.DBforPostgreSQL` first; pass `--storage-size 32` explicitly against a default of 128; pass storage type and geo-redundancy explicitly because their defaults are irreversible; **connect as the Entra administrator before depending on it**; and **measure the East US ↔ East US 2 round trip**, which nothing here has.
- **2.1.6** — the Container App's `secrets` array should still be **empty** when this story closes; if it is not, this decision was reversed and the reversal belongs in this document.
- **2.1.7** — B1MS is a tier the documentation says can become **unreachable** under sustained CPU load, which is a new way for `/health` to be interesting and an argument for keeping the liveness probe away from the database.
- **2.1.8** — the three predictions above, the budget left at `$20` with the reason, and the cost question with its sharper form.
- **Story 2.6** — the credential path does **not** transfer unchanged; see the authentication section.
- **Story 2.7** — the ~120 bytes/row assumption is a prediction to measure, and the usable capacity is **~27 GiB**, not 32.

## The database — the local development database (Task 2.1.2)

**Decided and built 2026-09-04 by [Task 2.1.2](../../epic-02-security-universe-historical-data/story-01-managed-postgres-and-the-secrets-boundary/TASK-02-the-local-development-database.md), which still provisions nothing on Azure.** It is recorded here rather than in a new `DATABASE.md` for the reason this document holds Task 2.1.1's decisions: Epic 1's habit is one document per subject, and a second file about the same subject is a copy waiting to disagree.

### The mechanism: a container through Docker Compose, and what it costs a clean clone

`compose.yaml` at the repository root, one service, started by **`pnpm db`**.

**The cost is stated first because it is the part that is easy to wave through: Docker becomes a prerequisite for a clean clone that it was not before.** Epic 1 needed Docker only for `pnpm image`, which nobody runs on a first day, so a developer could go a long way without it. That is no longer true from the moment anything reads a database. What softens it, and what the README says in those words, is that the prerequisite is **narrow**: `pnpm install`, `pnpm verify`, `pnpm dev` and `pnpm e2e` all still run with no Docker at all, and `scripts/local-database.mjs` reports its absence as that narrow thing rather than as a broken checkout.

Two alternatives, rejected with their reasons rather than skipped:

- **A native install** (Homebrew `postgresql@18`, or the EDB installer) is cheaper at run time — no daemon, no image, less memory — and worse at the one thing this exists for. It puts the engine version outside the repository's control on the day after Task 2.1.1 pinned one, it differs per operating system in a repository whose CI is Linux and whose development machine is macOS, and it has no equivalent of `pnpm db down -v` when a schema experiment goes wrong. It is the standing alternative for anyone who cannot run Docker, and the connection settings are ordinary enough that it works.
- **Pointing developers at the deployed database** is rejected on principle, and it is written down as rejected because somebody will suggest it during the first hour that Docker is broken. It is production, its firewall already admits every Azure tenant, and it would put development traffic behind an identity whose whole justification is that only the deployed backend uses it.

### The version is pinned to the deployed one, in one place

`postgres:18`, from `LOCAL_DATABASE.version` in `scripts/local-database.mjs`, interpolated into `compose.yaml`. The running container reports **PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)**, read out of it rather than assumed.

**The major and not the minor**, deliberately: Azure patches the minor under us — Task 2.1.1 records `--version 18` as the creation argument and nothing finer — so a `18.6` here would be a pin the managed server cannot honour, and it would go stale on the first platform maintenance window.

**Nothing checks that these two numbers still agree.** It is a stated invariant of the third kind, and it is in the gap lists in `README.md` and `CLAUDE.md` for that reason. The failure it guards against is the one this pin exists for: a local 17 against a deployed 18 is a class of bug that only ever appears in production.

### The credential does not match, and that is a decision rather than an inconsistency

The local database authenticates with an ordinary **password**. The deployed one **cannot** — Task 2.1.1 chose Microsoft Entra authentication only, password authentication `Disabled`, with no admin user created at any point, and a managed identity is not a thing a laptop can be.

So **"match the deployed environment" applies to the engine version and not to the credential**, and a reader who files that as a bug should be sent here. Task 2.1.1 already named the consequence and it lands on the next task rather than this one: **Task 2.1.3's configuration boundary has to express two shapes of credential**, a literal locally and an identity deployed. This task deliberately does not narrow that choice — `scripts/local-database.mjs` prints the connection as **parts** rather than as a URL, and adds nothing to `CONFIG_VARIABLES`, precisely so that a single `DATABASE_URL` with a password inside it is not chosen here by accident.

**The password is a fixture and not a secret**, and treating it as one would cost a `.env` file every clean clone has to write before the database starts. It authenticates a container published on **loopback only** — `127.0.0.1:5432:5432` and not the bare `5432:5432` that puts a database on every network the machine is joined to — holding an empty database whose entire future contents are re-derivable from Alpaca.

### Where it sits relative to `pnpm dev`: outside it, and the argument is lifecycle

`pnpm dev` is unchanged. It is still three watchers, and starting the database inside it would mean stopping the database on Ctrl-C, which throws away the data you were part-way through debugging. A database is a fourth process with a completely different lifecycle: it should survive a Ctrl-C, it holds state, and it is started once a week rather than once an hour.

`pnpm db` therefore starts it detached and **waits for it**, with `up --detach --wait` gating on a `pg_isready` healthcheck rather than on the container merely existing. That `--wait` turns out to be load-bearing twice over — see the readiness check below.

Arguments are forwarded to `docker compose` untouched, so `pnpm db down`, `pnpm db logs -f`, `pnpm db ps` and `pnpm db exec postgres psql …` all work as documented. The data survives `pnpm db down`; `pnpm db down -v` is what removes it. There is deliberately **no `restart:` policy**: a database that comes back after a reboot is a listener on 5432 nobody in the room started.

### The database is named `marketpulse` and it is empty

User, password and database name are all `marketpulse`. **Empty is the honest answer for this story** — Story 2.2 owns tables and migrations — and the thing to avoid was inventing a seeding mechanism here that Story 2.2 then has to unpick. There is none.

### `pnpm ready`'s third check speaks the protocol, and the decision was between two bad-looking options

Both existing checks speak HTTP, and a PostgreSQL port answers an HTTP request by **waiting** — so a `fetch` against it reports `NO_RESPONSE`, which is the same answer this script already gives for the squatter case and therefore useless.

**The stated decision is to speak enough of the protocol to get an answer rather than to settle for a TCP connect**, and the difference is what the answer means. A successful connect proves a **listener**, which is precisely what Task 1.8.4's squatter trap looks like. One packet gets past that: an **SSLRequest** — eight bytes, no credentials, no driver, no dependency — which every PostgreSQL server answers with a single byte, `S` or `N`.

Both were made to happen rather than reasoned about:

| What is on 5432                                | A TCP connect would say | This check says                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------- |
| The container                                  | up                      | `✓ PostgreSQL, no TLS offered`                    |
| Nothing                                        | `ECONNREFUSED`          | `ECONNREFUSED — not running; `pnpm db` starts it` |
| A bare `net.createServer()` that never answers | **up**                  | `NO_RESPONSE — something is holding this port`    |
| An HTTP server                                 | **up**                  | `NOT_POSTGRES — it did not answer an SSLRequest`  |

The two bold cells are the argument for the extra eight bytes.

**What it deliberately does not prove**, because a check whose limits are unwritten gets read as proving more than it does: not that the **database** exists, and not that the credentials work — both need a full startup message and a SCRAM exchange, which is a driver, and Task 2.1.4's pool is the right place for it. And not that the server is **ours**: a native PostgreSQL already holding 5432 answers identically, which is worth knowing rather than fixing, since a client cares whether a PostgreSQL answers at the address it will dial, and a conflict is something `pnpm db` reports on its own by failing to bind.

**One thing it reports that is genuinely informative: `no TLS offered`.** The container does not offer TLS and the managed server enforces it — "connection encryption is enforced for your network traffic" — so the line makes a real local-versus-deployed difference visible rather than leaving it to be discovered by Task 2.1.4.

### The third check reports and does not gate, with a named trigger

`pnpm ready` prints the database as `○` rather than `✗` and **its exit code does not change**. The exit code answers _can the application run?_, and today nothing opens a connection to anything: `pnpm verify` has never needed a server, and `pnpm e2e` gates on this very script, so a failing third check would refuse to start a browser suite with no interest in a database — on a laptop and on the runner alike. Making it gating today would be inventing a requirement one task ahead of the code that has it.

**The reversal trigger is a condition rather than a task number**, which is the shape `src/report-error.ts` already uses for the same kind of deferral, and it is **the first check in `pnpm verify` or `pnpm e2e` that fails without a database**. ~~Task 2.1.4, the first thing here that opens a connection.~~ **Corrected on the same day it was written**: that sentence named a task and a condition that are not the same day, and Task 2.1.4's own brief is the proof — it keeps `pnpm verify` passing with no database running and `pnpm test:process` passing both ways, so after it the backend still starts, `/health` still answers, and nothing in either chain fails. Story 2.2's migrations and Story 2.8's routes are the realistic candidates. On that day the line becomes a `✗` and the `e2e` job in `.github/workflows/verify.yml` gains a service — a workflow change with a cache key, a startup wait and a second definition of the database's address in a file that currently defines none of the pair, which is worth knowing in advance rather than in a red CI run. **Task 2.1.4 owns re-taking the decision**, not executing it.

**The database is also checked once with no polling, and that is not the shape of the other two.** They are polled because they are started by the command you run this alongside, so the check has to wait out a cold tree compiling. `pnpm db --wait` does not return until the server is accepting connections, so there is nothing to wait for. The cost of getting that wrong was measured rather than argued: with a five-second poll, `pnpm ready` against a stopped database took **5.1 s** instead of **0.093 s**, and `pnpm e2e` gates on this script — five seconds added to every browser run for a developer who has not started a database, to print a line no exit code depends on.

**`compose.yaml` sets `name: marketpulse`, so two checkouts share one database rather than colliding.** This repository nests git worktrees under `.claude/worktrees/`, and without a fixed project name each one would derive a project from its directory and try to publish a second container on 5432. Confirmed by running `pnpm db` in a clean clone and `pnpm db ps` in the original checkout: one container, one volume, `127.0.0.1:5432->5432/tcp`. One database per machine rather than one per checkout, which is the right grain for a database that holds state.

### Two things measured that no documentation page predicted

**The PostgreSQL 18 image refuses to start with the pre-18 volume mount, and the prediction was wrong in the reassuring direction.** The image moved both its declared volume and its `PGDATA` — read out of it, `PGDATA` is `/var/lib/postgresql/18/docker` and `Config.Volumes` is `{"/var/lib/postgresql":{}}`. Every pre-18 compose snippet mounts `/var/lib/postgresql/data`. The expectation written into `compose.yaml`'s first draft was that this would start and **silently persist nothing**. It does not: with a genuinely fresh volume, on the **very first run**, the container exits with a twenty-line explanation naming the mount, the reason and the fix —

```
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" …
       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data (unused mount/volume)
```

— so it is the good kind of trap, and with `--wait` it is a failed `pnpm db` rather than a database that looks fine until the day somebody needs yesterday's rows. Persistence across `pnpm db down` and `pnpm db up` was then confirmed positively on the shipping mount: a row written, the container removed and recreated, the row still there.

**A bare `docker compose up` refuses, by construction.** Every value `compose.yaml` interpolates is declared required with no default, using Compose's `${VAR:?message}` form, so the file cannot drift from `scripts/local-database.mjs` by quietly falling back to a plausible number. Measured: `docker compose up -d` exits **1** with `required variable MARKETPULSE_DB_USER is missing a value: set by pnpm db - run that rather than docker compose`. This is the same decision `e2e/playwright.config.ts` takes about `E2E_BASE_URL`, for the same reason — and the first draft used `${VAR:-default}`, which is worse than it looks: with a blank port the publish spec becomes `127.0.0.1::5432`, which is **valid** and binds a random one.

### What it cost the tree

**No dependency, no lockfile change, and no `pnpm verify` step.** Two new files — `compose.yaml` and `scripts/local-database.mjs` — one new root script, `pnpm db`, checked against `pnpm help -a`'s built-ins before being claimed (free; the detection was validated in the same run against `clean`, `test`, `start`, `config`, `env` and `deploy`, all correctly identified as built-ins).

`pnpm verify` passes **with no database running**, in 23.08 s, which is criterion 8 met by the chain not changing at all. The browser suite is unaffected — nine journeys green with the database stopped — which is the non-gating decision confirmed rather than assumed. `pnpm ready` is **0.093 s** with the database down and reports it correctly up and down.

## The database — provisioning the managed instance (Task 2.1.5)

**Provisioned 2026-09-05 by [Task 2.1.5](../../epic-02-security-universe-historical-data/story-01-managed-postgres-and-the-secrets-boundary/TASK-05-provision-the-managed-instance.md).** The server, the database, its firewall, its Entra bootstrap, two alerts and a lock exist. **No application code changed, no environment variable on the Container App changed, and no credential entered this repository** — the backend's own connection is Task 2.1.6's.

Every property below was **read back from the platform** after creation rather than taken from the command that set it, which is Task 1.11.3's practice and the reason two of Task 2.1.1's recorded facts are corrected here rather than inherited.

### The region decision was taken away a second time, and East US 2 is gone

Task 2.1.1 chose **East US 2** on 2026-09-04 because East US returns zero Postgres editions for this subscription. Re-read on 2026-09-05, **East US 2 now refuses too**, and the two refusals are not the same sentence:

| Region                                                            | `list-skus` reason                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| East US                                                           | `Provisioning is restricted in this region.`                         |
| **East US 2**                                                     | **`Subscriptions are restricted from provisioning in this region.`** |
| West US 2                                                         | `Subscriptions are restricted from provisioning in this region.`     |
| South Central US                                                  | `Subscriptions are restricted from provisioning in this region.`     |
| Canada East                                                       | `Provisioning is restricted in this region.`                         |
| Central US, North Central US, West US, West US 3, West Central US | none — `OfferRestricted: Disabled`                                   |

So **the recorded region was unavailable within 24 hours of being chosen**, and this is the second time in two stories that a region decision has been made by the platform rather than by us. **Re-read `list-skus` immediately before creating, never from this document** — that instruction was already in Task 2.1.1's section and it earned itself in one day.

**The database is in North Central US**, chosen on two grounds and confirmed against the Retail Prices API rather than assumed:

- **All three price meters are identical to East US 2** — compute `B1MS` `$0.017`/hour, storage `$0.115`/GB/month, backup LRS `$0.095`/GB/month — so the move costs nothing but co-location, which is the same argument Task 2.1.1 used for East US 2.
- **It is the closest unrestricted region to the East US backend.** The alternatives were not free: Central US is `$0.01921`/hour (**+13%**) with backup at `$0.108` (**+14%**), Canada Central `$0.0185`, West Central US `$0.0204`, and West US `$0.022` (**+29%**). **So Task 2.1.1's "the three price meters are identical in both regions" is true of East US and East US 2 specifically and false as a general claim** — regional price variation on this service is real and reaches 29% within the United States.

The backend and the registry stay in East US and the frontend stays in East US 2, so **this subscription now spans three regions**, none of them chosen.

### Two prerequisites, and the first one is a CLI defect worth more than the fix

**`Microsoft.DBforPostgreSQL` was `NotRegistered`**, reproducing Task 2.1.1's reading exactly. `az provider register --namespace Microsoft.DBforPostgreSQL --wait` took **85 s**. This is the third resource provider this subscription has needed registering and the second to be caught before it failed a create.

**The second is new and is the finding: `az postgres flexible-server create` cannot create an Entra-only server, and the REST API can.** The documented flag combination — which is in the CLI's own `--help` examples — fails:

```
az postgres flexible-server create ... --microsoft-entra-auth Enabled --password-auth Disabled \
  --admin-object-id <oid> --admin-display-name <upn> --admin-type User
ERROR: (MissingRequiredParameter) Parameter 'AdministratorLoginPassword' must be specified.
        This parameter cannot be NULL or empty.
```

The obvious reading is that the platform requires a password and Task 2.1.1's "no admin user created at any point" is unachievable. **That reading is wrong.** The same server body sent straight to ARM — `PUT .../flexibleServers/psql-marketpulse-dev?api-version=2024-08-01` with `authConfig: { activeDirectoryAuth: "Enabled", passwordAuth: "Disabled", tenantId }` and no `administratorLogin` — was **accepted without complaint**, and the created server reads back `administratorLogin: null`.

So it is a **CLI defect, not a platform requirement**, and the cost of believing the error message would have been an immutable admin username (`--admin-user`: "once set, it cannot be changed") plus a password existing on the most reversible decision in the story. **Create this server through ARM, not through `az postgres flexible-server create`.** This is the same lesson as Task 1.11.6 reading `static-web-apps-deploy`'s own `action.yml` rather than recalling it: the tool's error message described the tool, not the platform.

### What was created, read back from the platform

Provisioning took **217 s** from accepted PUT to `state: Ready`.

| Property                         | Value read back                                    | Matches the decision?                   |
| -------------------------------- | -------------------------------------------------- | --------------------------------------- |
| `fullyQualifiedDomainName`       | `psql-marketpulse-dev.postgres.database.azure.com` | —                                       |
| `location`                       | **North Central US**                               | changed, see above                      |
| `version` / `minorVersion`       | **18 / 6**                                         | yes                                     |
| `sku`                            | `Standard_B1ms` (`Burstable`)                      | yes                                     |
| `storage.storageSizeGb`          | 32                                                 | yes — against a CLI default of 128      |
| `storage.type`                   | `Premium_LRS`                                      | yes — irreversible                      |
| `storage.autoGrow`               | `Disabled`                                         | yes                                     |
| `storage.tier` / `iops`          | `P4` / **120**                                     | not previously recorded                 |
| `backup.backupRetentionDays`     | 7                                                  | yes                                     |
| `backup.geoRedundantBackup`      | `Disabled`                                         | yes — irreversible                      |
| `network.publicNetworkAccess`    | `Enabled`, `delegatedSubnetResourceId: null`       | yes — irreversible                      |
| `authConfig.activeDirectoryAuth` | `Enabled`                                          | yes                                     |
| `authConfig.passwordAuth`        | **`Disabled`**                                     | yes                                     |
| `administratorLogin`             | **`null`**                                         | yes — no admin user exists              |
| `dataEncryption.type`            | `SystemManaged`                                    | the irreversible decision nobody listed |
| `highAvailability.mode`          | `Disabled`                                         | Burstable cannot do HA                  |

**`storage.iops` is 120, not the 640 the SKU list advertises.** `list-skus` reports `supportedIops: 640` for `Standard_B1ms`, but the provisioned P4 disk delivers 120 — the SKU's ceiling and the disk's entitlement are different numbers, and the disk is what a bulk backfill will meet. Story 2.7 should size against **120**.

**The database is `marketpulse`**, matching `DATABASE_NAME`'s default in `CONFIG_VARIABLES` exactly, UTF8 / `en_US.utf8`, empty. Creating it took 17 s. Note the CLI's `--database-name` on `create` is elastic-cluster-only in 2.90.0, so the database is a separate `db create` call and its flag is `--name`.

**The firewall has exactly the two rules Task 2.1.1 specified** — `AllowAllAzureServicesAndResources` (`0.0.0.0`–`0.0.0.0`, i.e. every Azure tenant's compute) and `developer-laptop` (`122.11.246.19`, a single IPv4 address). Nothing else is admitted. **What is deliberately not enabled** is any broader developer range: one address, changed by `firewall-rule update` when it moves.

### The Entra bootstrap worked, and the guest-administrator risk did not materialise

Task 2.1.1 flagged that the subscription owner is an **external (`#EXT#`) guest** and that a guest as the sole database administrator is not the well-trodden path, with password authentication as the named fallback. **The fallback was not needed.** Connected as the Entra administrator, with `az account get-access-token --resource https://ossrdbms-aad.database.windows.net` used verbatim as the password:

```
select current_user, version();
 bensmawfield_outlook.com#EXT#@bensmawfieldoutlook.onmicrosoft.c | PostgreSQL 18.6 ...
select * from pgaadauth_create_principal('marketpulse-backend', false, false);
 Created role for "marketpulse-backend"
```

**Two things about that output are traps.**

**The administrator's name is truncated to 63 characters and the platform does it silently.** The UPN is 65 characters; the role Postgres holds is `bensmawfield_outlook.com#EXT#@bensmawfieldoutlook.onmicrosoft.c`, losing the final `om`. That is `NAMEDATALEN - 1`, and it is visible in the `administrators` sub-resource's `principalName` as well as in `current_user`. **Connecting still works with the full 65-character UPN as the username** — the gateway maps it — so this is a fact to recognise in `pg_roles` and in error messages rather than something to work around. It also means **an Entra principal whose name exceeds 63 characters cannot be distinguished from another sharing its first 63**, which is a real collision surface for group-based administrators.

**The token was echoed into the terminal**, because `pnpm db exec` runs through pnpm, which prints the script command it is about to run — so `PGPASSWORD=<jwt>` appeared in full in the scrollback. The token is a live bearer credential for up to an hour. **Pass a token to the container with `docker exec -e` directly, never through `pnpm db exec`**, and Task 2.1.6's leak check should treat terminal echo as one of the places a credential lands.

The role now exists: `marketpulse-backend`, `rolcanlogin: t`, `rolsuper: f`, `rolcreatedb: f`. Its **token lifetime is the favourable one** — the operator's user token was measured at **70 minutes**, and Task 2.1.1's quoted 24 hours for system-assigned managed identities is what the deployed pool gets.

### TLS: the server requires it, the client verifies it, and nothing ships to make that true

This is the question Task 2.1.4 handed over — `DATABASE_SSL=verify-full` maps to `pg`'s `{ rejectUnauthorized: true }` with **no `ca` option**, so it rests entirely on Node's bundled root store. **The answer is that it works, and no CA file goes into `apps/backend/Dockerfile`.**

Measured with `pg` 8.23.0 on Node 24.20.0, using the three modes exactly as `apps/backend/src/database.ts` maps them:

| `DATABASE_SSL` | `pg` option                  | Result against the managed server                                                            |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `disable`      | `false`                      | **Refused in 538 ms** — `no pg_hba.conf entry for host "…", no encryption`, SQLSTATE `28000` |
| `require`      | `{rejectUnauthorized:false}` | Connected, TLSv1.3, `TLS_AES_256_GCM_SHA384`                                                 |
| `verify-full`  | `{rejectUnauthorized:true}`  | **Connected**, TLSv1.3, `authorized: true`, no `ca` supplied                                 |

**So the server requires encryption and that is proven rather than quoted** — `disable` is refused by `pg_hba.conf` with the words "no encryption" in the message.

**And the verification is real rather than vacuous, which was made to fail before it was believed:**

- `verify-full` with an unrelated CA as the only trust anchor is **refused** — `self-signed certificate in certificate chain`.
- `verify-full` dialled by IP is **refused** — `Hostname/IP does not match certificate's altnames`. So host-name checking is on, not merely chain checking.

**The chain is why nothing has to ship:**

```
e15a953f5ec4.database.azure.com                 (SAN: psql-marketpulse-dev.postgres.database.azure.com)
  <- Microsoft TLS G2 RSA CA OCSP 16
  <- Microsoft TLS RSA Root G2
  <- DigiCert Global Root G2
```

`DigiCert Global Root G2` is in Node 24.20.0's **118 bundled roots**, read out of `tls.rootCertificates` rather than assumed — and so are **`Microsoft RSA Root Certificate Authority 2017` and `Microsoft ECC Root Certificate Authority 2017`**, which is the pair Azure's published root-CA migration moves toward. So `verify-full` survives that rotation with no change here. The leaf is short-lived — issued `Sep 4 2026`, expiring `Dec 13 2026`, about 100 days — so it rotates on its own and nothing here pins it.

**`verify-full` also succeeds from inside the deployed container**, verified by execing into the running East US replica and completing a TLS handshake with `rejectUnauthorized: true` (`authorized: true`, TLSv1.3). That is the reading that matters, because the laptop and the container are different clients with different trust stores, and only the second one is the application.

**`verify-ca` stays out of the vocabulary.** Task 2.1.3 left it out and made this task confirm or reverse it. `verify-full` works against this certificate, so there is no certificate fact forcing the widening, and the union in `config.ts` is unchanged.

**What happens when TLS is not available, in both directions, and neither is a hang:**

| Case                                                      | Result                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Client requires TLS, server offers none (local container) | **Refused in 1.1–3.6 ms** — `The server does not support SSL connections` |
| Client disables TLS, server requires it (managed)         | **Refused in 538 ms** — `no pg_hba.conf entry … no encryption`            |

Both are immediate, named refusals. That matters because this repository has met the opposite three times — `check-ready.mjs`'s socket that accepts and never answers, and `pg`'s `connectionTimeoutMillis` default of 0 — and a hang inside a startup path is the expensive failure. **TLS misconfiguration is not in that class.**

### The connection ceiling, confirmed rather than discovered — and it came out one higher

Task 2.1.4 sized `POOL_MAX: 10` against a documented 35 usable of 50. Read off the created server: `max_connections` **50**, `superuser_reserved_connections` **10**, `reserved_connections` **5**, so the arithmetic gives **35**.

**Opened empirically as a non-superuser role, 36 connections succeeded and the 37th was refused** with `remaining connection slots are reserved for roles with the SUPERUSER attribute` (SQLSTATE `53300`). The extra one is slack in what Azure's own sessions happen to hold at that moment, so **35 is the number to design against and 36 is what was observed** — do not read the difference as headroom.

The relevant fact for sizing is the one underneath it: **an idle server already holds 7–10 connections that are not ours**, Azure's maintenance and telemetry sessions. So `POOL_MAX: 10` plus a `psql` session plus Story 2.2's migrations sits at roughly 12 of ~25 genuinely available slots. Comfortable, and not as comfortable as 35 sounds. `POOL_MAX` needs no change.

### Latency, taken separately for connect and query as the brief requires

**From the deployed backend's own region (East US) to the database (North Central US)** — measured by execing into the running replica, so this is the hop that matters and the one nothing else in this story measures:

| Measurement                      | Result                                        |
| -------------------------------- | --------------------------------------------- |
| TCP connect (one round trip)     | **19.1 – 27.8 ms** (n=9, median 23.7)         |
| Postgres `SSLRequest` round trip | 28.6 – 53.2 ms (n=9, median 30.9)             |
| TCP + full TLS handshake         | **79.2 – 111.3 ms** warm (188.7 ms cold, n=7) |

**From the development laptop (UK) to the same server**, which is a different question and is included so the two are not confused:

| Measurement                              | Result                                |
| ---------------------------------------- | ------------------------------------- |
| Connect, per new connection (TLS + auth) | **1194 – 1460 ms** (n=6, median 1312) |
| `SELECT 1` on a warm connection          | **224 – 521 ms** (n=30, median 237)   |

**So the 5-second `connectionTimeoutMillis` Task 2.1.4 chose against an unmeasured hop is generous, not tight.** The worst laptop connect used **29.2%** of it; from the container the handshake is ~90 ms, so a full connect is roughly 150–250 ms — under **5%** of the deadline. **The number does not need changing, and Task 2.1.7 now has the figure it was promised**: a `/health` check that reuses a pooled connection pays roughly one round trip (~23 ms from East US), and one that causes a **new** connection pays ~150–250 ms. Both are inside a liveness probe's budget; the risk `/health` carries is the failure mode, not the latency.

### Storage: the usable capacity is ~22.5 GiB, not the ~27 GiB recorded

Task 2.1.1 computed usable capacity as ~27 GiB, from 32 GiB provisioned minus the 5 GiB of free space at which the server switches itself to read-only. **Measured on the created server, that is optimistic by about 5 GiB, because the disk is not empty when it is empty:**

| Metric                | Value on an empty server |
| --------------------- | ------------------------ |
| `storage_used`        | **3.740 GiB**            |
| `storage_free`        | **27.461 GiB**           |
| `storage_percent`     | 11.99%                   |
| `txlogs_storage_used` | 0.080 GiB                |
| `backup_storage_used` | 0.005 GiB                |

All six databases together are **47 MB** (`marketpulse` itself is 7.7 MB), and the WAL is 80 MB — so roughly **3.6 GiB is filesystem overhead** on the formatted P4 volume and is not recoverable. Free space starts at **27.46 GiB**, and read-only mode triggers at **under 5 GiB free**, so:

- **Usable for data: ~22.5 GiB, not ~27 GiB.**
- Against Task 2.1.1's ~1.18 GB/year of minute bars, that is **~20 years** rather than 24 — or **~4 years if the estimate is wrong by a factor of five**.

The conclusion is unchanged and still says "comfortable"; the arithmetic behind it was wrong by ~17% and is corrected here. **Story 2.7's instruction to re-do this with real row sizes measured after loading a sample stands**, and it now has a real starting free-space figure to subtract from rather than the provisioned one.

### Idle behaviour on a Burstable tier, and why the credit alert earns its place

The server does **not** pause, sleep or throttle when idle — there is no auto-pause on this tier, and the separate "a _stopped_ flexible server automatically starts after seven days" limit means it cannot be parked to save money either. Read over 30 minutes at idle:

| Metric                  | Idle value          |
| ----------------------- | ------------------- |
| `cpu_credits_remaining` | **30.00** (the cap) |
| `cpu_credits_consumed`  | 0.00                |
| `cpu_percent`           | **10.5 – 12.1%**    |
| `active_connections`    | 7 – 10              |

**The uncomfortable reading is `cpu_percent`.** A `Standard_B1ms` earns credits below a **10%** baseline and spends them above it, and an _idle_ server with no application attached sits at 10.5–12.1% — on the line, dipping either side of it, with the balance observed moving 29.00 → 29.83 → 30.00 across consecutive five-minute windows. So **this server banks almost nothing at rest**, and the 30-credit ceiling is not a reservoir it arrives at a backfill holding. That makes the CPU-credits alert below more valuable than it looked when Task 2.1.1 asked for it, and it is a real input to Story 2.7: a bulk load starts with roughly the credits it can earn during the load, not with a bank.

### Monitoring: two alerts and a lock, all three of which 2.1.1 left unowned

There were **no action groups and no metric alerts on this subscription** before this task. Created:

| Resource               | What it is                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ag-marketpulse-ops`   | Action group, short name `mpulseops`, one email receiver (the account owner)                                   |
| `psql-storage-80pct`   | `avg storage_percent > 80` over 15 min, evaluated every 5 min, severity 2 — **this is what replaces autogrow** |
| `psql-cpu-credits-low` | `avg cpu_credits_remaining < 5` over 15 min, evaluated every 5 min, severity 2                                 |

Both thresholds are the ones the vendor documentation asks for by name. The storage alert is the one with teeth: autogrow is `Disabled` by decision, so nothing else stands between a filling disk and the server putting itself into read-only mode.

**A `CanNotDelete` lock is set on the server, and the argument for it is not the data.** Everything in this database is re-derivable from Alpaca — that is the whole reason public access was acceptable — so a lock protecting _rows_ would be protecting nothing. What it protects is that **deleting a flexible server deletes its backups irrecoverably**, and that re-creating this one means re-running a provider registration, a region hunt, an ARM-not-CLI create, and a `pgaadauth_create_principal` bootstrap **that exists in no file in this repository**. That bootstrap is the expensive part, and it is exactly the class of thing this document exists to hold.

**The lock was proven live rather than assumed, on something recoverable rather than on the server.** Deleting a firewall rule under it is refused with `ScopeLocked` naming the server — so **the lock inherits to child resources**. Two operational consequences measured in the same pass: **`create` and `update` still work** under the lock, so a moved developer IP is a `firewall-rule update`; and **removing anything, including a mistaken firewall rule, requires lifting the lock first** — `az lock delete` → change → `az lock create`, which was executed to clean up the probe rule and left the server with exactly its two intended rules.

### The cost refusal has changed shape for a third time

Task 1.11.8 recorded `az consumption usage list` refusing with _"doesn't have valid WebDirect/AIRS offer type"_; Task 1.12.7 recorded it returning **`[]` at exit 0**. Today it returns **two records** — the Log Analytics workspace and the container registry — with **every cost field the string `'None'`**: no `pretaxCost`, no `currency`, no `usageStart`. So the question is still unanswerable, in a third distinct way, and the database does not appear at all, which is consistent with it being about an hour old against a documented 8–24 hour lag.

The `marketpulse-monthly` budget was re-read and is unchanged: **$20/month**, actual-cost alerts at **50 / 80 / 100%** to the account owner, `currentSpend` **0.0**. **Task 2.1.8 owns the cost question** and inherits a sharper version of it than Task 2.1.1 handed over.

### What Task 2.1.6 inherits, as values rather than facts

Task 2.1.3 asked for the right-hand side of the seven `DATABASE_*` variables. Recorded verbatim:

| Variable            | Deployed value                                                       |
| ------------------- | -------------------------------------------------------------------- |
| `DATABASE_HOST`     | `psql-marketpulse-dev.postgres.database.azure.com`                   |
| `DATABASE_PORT`     | `5432`                                                               |
| `DATABASE_NAME`     | `marketpulse`                                                        |
| `DATABASE_USER`     | `marketpulse-backend`                                                |
| `DATABASE_AUTH`     | `entra`                                                              |
| `DATABASE_PASSWORD` | **not set at all** — the variable must be absent, not empty          |
| `DATABASE_SSL`      | `verify-full` — confirmed working from inside the container, no `ca` |

Task 2.1.4's hazard stands and is worth repeating where the values are: the two cross-variable checks fire at **startup**, so a revision that sets `DATABASE_AUTH=entra` and forgets `DATABASE_SSL` does not connect insecurely — it fails to start, which on a liveness-probed platform is a crash-loop. **All six go in one `az containerapp update`.**

## The database — the credential on the platform (Task 2.1.6)

The deployed backend connects to the managed database and executes `SELECT 1`
over TLS, authenticating as its own system-assigned managed identity. **The
`secrets` array is still `null`, read back from the platform after the change
rather than assumed** — so the strongest available outcome held: there is no
credential on the platform, and ADR 0011's _"nothing deployed holds a
credential"_ is **confirmed by this task rather than falsified by it**. That
claim expires in Story 2.6, where a third-party bearer token with no Azure
identity behind it genuinely has to be stored, and 2.6 will be doing that for
the first time rather than repeating something proven here — a gap named
deliberately rather than left for that story to discover.

### The six variables, set in one update, read back afterwards

| Variable            | Value                                              |
| ------------------- | -------------------------------------------------- |
| `DATABASE_HOST`     | `psql-marketpulse-dev.postgres.database.azure.com` |
| `DATABASE_PORT`     | `5432`                                             |
| `DATABASE_NAME`     | `marketpulse`                                      |
| `DATABASE_USER`     | `marketpulse-backend`                              |
| `DATABASE_AUTH`     | `entra`                                            |
| `DATABASE_SSL`      | `verify-full`                                      |
| `DATABASE_PASSWORD` | **absent** — not empty                             |

The app now carries **eleven** environment variables and they exist only in the
platform, because `deploy.yml` uses `update` and never `create`. That makes this
the largest instance of the unchecked-invariant class in the project, and this
table is its only durable copy.

**One `az containerapp update`, all six, and the reason is a crash-loop.** Task
2.1.3's cross-variable checks fire at **startup**, so a revision setting
`DATABASE_AUTH=entra` while forgetting `DATABASE_SSL` does not connect
insecurely — it fails to start, on a platform whose liveness probe restarts it.
The failure would be loud and would name the variable, which is a much better
failure than a token on the wire, but it would sit at `Activating` for ten
minutes first.

### The control that was worth taking: the OLD image with the NEW variables

Setting the six variables against the image that still carried Task 2.1.4's
throwing `entra` branch produced revision `0000060`, and it is the cleanest
before-and-after in the story. The replica **started**, served `/health` 200,
and wrote one level-40 record **134 ms after the listening line**:

```
DATABASE_AUTH=entra is not implemented yet: acquiring a Microsoft Entra access
token is Task 2.1.6's. Use DATABASE_AUTH=password against a local database.
```

So the seam Task 2.1.4 designed behaved on the platform exactly as it did on a
laptop: a credential path that does not exist yet is a degraded database and a
healthy server, not a crash.

### The mechanism, and the trap confirmed by measurement rather than by citation

`IDENTITY_ENDPOINT` inside the running container is **`http://localhost:12356/…`**
— read from the replica, and it is a **local sidecar**. `169.254.169.254` does
not appear in it at all. So `HOSTING.md`'s recorded trap is confirmed from the
inside: the virtual-machine recipe every Azure page for managed-identity
PostgreSQL offers would have dialled an address that is not routable from here,
and would have hung rather than failed.

The request is `GET ${IDENTITY_ENDPOINT}?resource=https%3A%2F%2Fossrdbms-aad.database.windows.net&api-version=2019-08-01`
with header **`X-IDENTITY-HEADER`** (not `Metadata: true`). The audience matters
and nothing local can check it: a token for the wrong resource is refused **by
the database gateway**, not by the token endpoint — measured below.

### The measurement that settled the caching question, in the direction of no cache

Six consecutive calls to the identity endpoint from inside the replica:

| Call | Status | Time       | Token length | `expires_on` |
| ---- | ------ | ---------- | ------------ | ------------ |
| 1    | 200    | **461 ms** | 1850         | 1788655549   |
| 2    | 200    | 19 ms      | 1850         | 1788655549   |
| 3    | 200    | 76 ms      | 1850         | 1788655549   |
| 4    | 200    | 5 ms       | 1850         | 1788655549   |
| 5    | 200    | 94 ms      | 1850         | 1788655549   |
| 6    | 200    | 5 ms       | 1850         | 1788655549   |

**`expires_on` is identical across all six, so the platform's identity sidecar
caches the token itself**, and it is **86,549 seconds — 24.0 hours** ahead,
which is Task 2.1.1's "valid up to 24 hours" confirmed rather than repeated. A
cache in `database.ts` would therefore be a second cache in front of one that
already exists, with an expiry rule we would have to get right, in exchange for
5–94 ms. **There is deliberately no cache**, and this table is the measured
reason rather than the assumption Task 2.1.4's brief warned against.

The number to carry is the **first** call of a replica's life, which is the one
the application actually pays: **866 / 889 / 887 ms** across three cold starts,
read off the application's own records. That is 29% of the 3-second token
deadline — generous rather than tight, but nothing like the "tens of
milliseconds" the warm figures suggest.

### What a healthy deployed connection costs, and what it looks like at both ends

From the replica, at `LOG_LEVEL=debug`:

```
level 20  ms=865.901983  tokenLength=1856   minted a Microsoft Entra access token for the database connection
level 30  ms=1023.18     auth=entra ssl=verify-full   database reachable
```

**So the token is 85% of the first connection's cost** — 866 ms of 1023 ms —
and the TCP, TLS and query that Task 2.1.5 measured at 150–250 ms are the rest.

At `LOG_LEVEL=info`, which is what ships, the mint prints **nothing** and a
healthy start is one `database reachable` record at **886.84 ms**.

And from the database side, caught by racing a replica restart against a
`\watch` on `pg_stat_activity`:

```
application_name | usename             | state | ssl | version | cipher                | client_addr
marketpulse-backend | marketpulse-backend | idle | t   | TLSv1.3 | TLS_AES_256_GCM_SHA384 | 40.121.18.106
```

`application_name` is what Task 2.1.4 set it to precisely so this row could be
found rather than guessed, and `usename` is the Entra role — so the row is proof
of the token having been accepted, not merely of a connection.

**It had to be raced, and why is a finding.** The connection is visible for
**exactly ten seconds** (00:45:52 → 00:46:01) and then gone, because `pg`'s
default `idleTimeoutMillis` is 10,000 ms and **nothing in this application
queries the database after the startup probe**. So the deployed backend holds
**zero** connections at rest, and a first attempt to read `pg_stat_activity` four
minutes after a deploy correctly returned `(0 rows)`. Anything in Story 2.8 or
Epic 3 that expects a warm pool should know that today there is not one.

### The leak check — produced rather than read, and clean in all four places

**Five failure classes were produced against the real managed server** and each
error was read **whole** (`JSON.stringify(e, Object.getOwnPropertyNames(e))`),
not by its message, because a driver that leaks connection options leaks them as
attached properties:

| Produced failure                          | `code`    | Message                                                                                   | Leaks? |
| ----------------------------------------- | --------- | ----------------------------------------------------------------------------------------- | ------ |
| Malformed token (JWT-shaped, not a token) | 28000     | `The access token has invalid format…`                                                    | **no** |
| Token for the **wrong audience** (ARM)    | 28000     | `The access token doesn't have a valid audience claim. Acquire a new token for resource…` | **no** |
| Valid token, role that does not exist     | 28P01     | `password authentication failed for user "no-such-role"`                                  | **no** |
| Wrong host                                | ENOTFOUND | `getaddrinfo ENOTFOUND …`                                                                 | **no** |
| Credential **function that throws**       | —         | our own message, verbatim                                                                 | **no** |

Checked for the credential itself, for a real token, for a wrong-audience token
and for the bare prefix `eyJ`. **Nothing.** That extends Task 2.1.4's local
finding — `pg` does not quote a password — to the case that is worth far more,
and it adds the observation that **Azure's gateway messages are unusually
good**: the wrong-audience case names the resource to acquire instead.

The other three places:

- **The repository.** Two `eyJ`-shaped strings, both **deliberate test
  fixtures** in `entra-token.test.ts` and `database.test.ts`. They exist so the
  leak assertions have something to fail against, exactly as the `marketpulse`
  fixture password does, and **they are not findings**. There is no real token,
  no `IDENTITY_HEADER` value, and no `access_token` anywhere else.
- **`apps/frontend/dist` and `apps/frontend/storybook-static`.** Zero for every
  one of `eyJ`, `access_token`, `IDENTITY_ENDPOINT`, `IDENTITY_HEADER`,
  `ossrdbms`, `psql-marketpulse` and `marketpulse-backend`. The database does
  not exist as far as the browser artefacts are concerned.
- **The platform's own log destination.** Log Analytics, queried per revision:
  **zero** occurrences of `eyJ`, `access_token`, `IDENTITY_HEADER`,
  `X-IDENTITY-HEADER`, `Bearer `, `ossrdbms`, or the claim names `upn`, `oid`
  and `tid` — across the healthy revision, the degraded one, and both restarts.

One place worth checking that a grep of the source would have missed: **the
shipping image**. `apps/backend/dist` contains `eyJ` four times — entirely in
the **compiled test files** `tsc -b` emits there — and the image contains
**zero**, because `files: ["dist", "!dist/**/*.test.*"]` keeps them out of
`pnpm deploy`. A leak check that stopped at `dist/` would have reported a
finding that does not ship.

**And a new place, which Task 2.1.5 discovered by leaking into it: terminal
echo.** `pnpm db exec` prints its arguments, so passing a token that way put a
live bearer credential in the scrollback. Every operator query in this task used
`docker exec -e PGPASSWORD` — the form with **no `=value`**, which passes the
variable from the environment rather than putting it on a command line — and the
in-container timing probe was written to print a token's **length** and never
the token.

### An unreachable database does not kill the replica, watched across probe intervals

Produced by pointing `DATABASE_HOST` at **`203.0.113.7`** (RFC 5737 TEST-NET-3,
guaranteed unroutable), which gives a genuine packet-drop timeout rather than a
DNS failure. The replica's own record:

```
level 40  database unreachable, continuing without it
          Connection terminated due to connection timeout
```

Over **3 min 30 s** — seven liveness intervals at 30 s and twenty-one readiness
intervals at 10 s — the replica read `ready: true`, `restartCount: 0`,
`runningState: Running` throughout, `/health` answered **200 on every poll**, and
`uptimeSeconds` rose monotonically 128 → 217 with **no reset**. The criterion is
met and it was watched rather than argued.

**One ordering fact fell out of it**: there is **no token-mint record at all** on
that revision. `pg` calls the credential function only after the socket is up,
so an unreachable database costs no token — which also means a token-endpoint
outage and a database outage are distinguishable in the log rather than being
one symptom.

**The lever is not the one the brief named, and the reason is worth stating.**
The brief suggested the firewall, updated rather than deleted because Task
2.1.5's `CanNotDelete` lock inherits to child resources. That command was
**refused by this environment's own permission policy**, so an app-scoped lever
was used instead. It is arguably the better one: changing `DATABASE_HOST` on the
container app cannot affect any other consumer of the database, does not briefly
firewall the server off from the rest of Azure, and is undone by one command.
What it does **not** exercise is the firewall path itself, and that is stated
here rather than implied.

### Rotation, which is the wrong word, and what replaces it

**There is nothing to rotate.** The credential is minted per connection and
expires in at most 24 hours; no value is stored in this repository, in
`deploy.yml`, in a GitHub secret, or in the app's `secrets` array. So the three
questions worth answering are these.

- **How is it changed without a deploy?** It is not changed; it is re-minted, on
  the next connection, automatically. The only thing that ever "rotates" is
  `IDENTITY_HEADER`, which Azure's own documentation says the **platform**
  rotates, and which this application reads fresh from the environment on every
  acquisition rather than caching at module load — deliberately, because a
  cached header survives a rotation and starts failing.
- **What happens to an open connection when its token expires?** The token is
  validated at connect time and Azure PostgreSQL does not re-validate it, so an
  established connection is expected to outlive it. **That was not verified and
  saying so is the honest answer**: a token lasts 24 hours and `pg` closes an
  idle client after 10 seconds, so **no connection this application makes can
  reach its own token's expiry** — the case is structurally unreachable in this
  configuration rather than untested through neglect. What would make it
  reachable is Epic 3's long-lived writer holding a connection open for a day,
  and that is the task that should measure it.
- **What does revocation look like?** Not changing a value. It is
  `DROP ROLE marketpulse-backend` on the database, or removing the app's
  system-assigned identity — either of which takes effect at the **next**
  connection rather than immediately, for the reason above.

**One security property fell out of the failure testing and is worth recording,
because it is better than expected.** An operator's own Entra token — the one
`az account get-access-token` issues, which any subscription owner can mint —
**cannot authenticate as the `marketpulse-backend` role**:

```
Service principals cannot generate AAD_AUTH_TOKENTYPE_APP_USER tokens for role
"marketpulse-backend".
```

The role was created with `pgaadauth_create_principal('marketpulse-backend',
false, false)`, i.e. as a service-principal role, so only the managed identity's
own token is accepted for it. A leaked operator credential therefore cannot
impersonate the backend, and vice versa.

### Two smaller things measured on the way

- **`libpq` cannot do `verify-full` where Node can**, and the asymmetry is about
  who ships roots. The local Postgres container has no CA trust store (Task
  2.1.2), so `psql` there refuses `sslmode=verify-full` with
  `root certificate file "/root/.postgresql/root.crt" does not exist`, while the
  backend's Node image verifies the identical certificate with **nothing
  shipped**, because Node carries its own 118 roots. Task 2.1.5's "no CA file
  goes into the Dockerfile" is therefore a property of the **runtime** rather
  than of the certificate, and it would not transfer to a `libpq`-based client.
- **`@azure/identity` was measured before being declined**: **32 packages and
  46 MB** for what is one HTTP GET with one header and no cryptography. That is
  the opposite of the `@fastify/cors` decision and for the stated reason — that
  library was taken because a hand-rolled CORS fails _silently and dangerously_,
  where a hand-rolled `fetch` of a documented URL fails loudly at the first
  connection.

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

| Fact                       | Value                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloud                      | Microsoft Azure                                                                                                                                                                                                                                                                                                                                                                                              |
| Subscription id            | `5104e168-b3de-41c2-92a8-c68d28bd4d16`                                                                                                                                                                                                                                                                                                                                                                       |
| Tenant id                  | `6069915b-5bf2-4e36-8b25-8ffb25b5fdd1`                                                                                                                                                                                                                                                                                                                                                                       |
| Subscription type          | Azure free account (12-month offers plus the always-free grants)                                                                                                                                                                                                                                                                                                                                             |
| Region                     | East US for the backend and the registry, **East US 2** for the frontend, **North Central US** for the database. Static Web Apps is not offered in East US; Postgres is `OfferRestricted` there **and, since 2026-09-05, in East US 2 as well** (Task 2.1.5). **This subscription now spans three regions and chose none of them** — re-read `list-skus` before creating anything, never this table          |
| Resource group             | `rg-marketpulse-dev` (East US)                                                                                                                                                                                                                                                                                                                                                                               |
| Container Apps environment | `cae-marketpulse-dev`, unique id **`blackgrass-e682fefb`**, `WorkloadProfiles` mode with a **Consumption profile only**, no VNet                                                                                                                                                                                                                                                                             |
| Backend URL                | **<https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io>**                                                                                                                                                                                                                                                                                                                           |
| Backend identity           | System-assigned, principal `fe8a2ecd-719c-407e-94d4-629015bd889d`, `AcrPull` on the registry, and — since Task 2.1.6 — the **database credential**: it authenticates to PostgreSQL as role `marketpulse-backend` with a token minted per connection. The app's `secrets` array is still `null`                                                                                                               |
| Log destination            | Log Analytics workspace `log-marketpulse-dev`, **30-day retention**, `PerGB2018` — $2.30/GB ingested, $0.10/GB/month retained beyond the included period                                                                                                                                                                                                                                                     |
| Budget                     | `marketpulse-monthly`, **$20/month**, actual-cost alerts at 50 / 80 / 100% to the account owner                                                                                                                                                                                                                                                                                                              |
| Frontend service           | Azure Static Web Apps, **Free** plan, app `marketpulse-frontend` in **East US 2**                                                                                                                                                                                                                                                                                                                            |
| Frontend URL               | **<https://red-smoke-029583a0f.5.azurestaticapps.net>**                                                                                                                                                                                                                                                                                                                                                      |
| Backend service            | Azure Container Apps, **Consumption** plan, `minReplicas: 1`                                                                                                                                                                                                                                                                                                                                                 |
| Database service           | Azure Database for PostgreSQL flexible server, Burstable **B1MS**, **PostgreSQL 18.6**, **North Central US**, 32 GiB `Premium_LRS` (P4, **120 IOPS**) with autogrow off, 7-day backups, geo-redundancy off, public access, **Microsoft Entra authentication only**. **Provisioned 2026-09-05** by Task 2.1.5, in 217 s                                                                                       |
| Database server name       | **`psql-marketpulse-dev`**, FQDN **`psql-marketpulse-dev.postgres.database.azure.com`**. Database **`marketpulse`** (UTF8 / `en_US.utf8`, empty). Firewall: exactly two rules — `AllowAllAzureServicesAndResources` (`0.0.0.0`) and `developer-laptop` (`122.11.246.19`)                                                                                                                                     |
| Database admin             | **No PostgreSQL admin user exists** — `administratorLogin` reads `null` on the created server. The Entra administrator is `bensmawfield_outlook.com#EXT#@bensmawfieldoutlook.onmicrosoft.com` (`8d92279d-ed7d-4127-9884-ba258857457c`), **held by Postgres truncated to 63 characters**, losing the final `om`. Role `marketpulse-backend` exists via `pgaadauth_create_principal`. **No password anywhere** |
| Database creation route    | **ARM `PUT`, not `az postgres flexible-server create`.** The CLI rejects an Entra-only server with `MissingRequiredParameter: 'AdministratorLoginPassword'` even with `--password-auth Disabled`; the REST API accepts the same server. A **CLI defect, not a platform requirement** — believing it would have cost an immutable admin username. `Microsoft.DBforPostgreSQL` was registered in 85 s first    |
| Who can delete it          | The subscription owner — but a **`CanNotDelete` lock named `no-accidental-delete`** is set on the database server (Task 2.1.5), proven live (`ScopeLocked`) and **inherited by child resources**. `create` and `update` still work; any delete needs `az lock delete` first. Nothing else in this subscription is locked                                                                                     |
| Database monitoring        | Action group **`ag-marketpulse-ops`** (email to the account owner) with two metric alerts: **`psql-storage-80pct`** (`storage_percent > 80`, which is what replaces autogrow) and **`psql-cpu-credits-low`** (`cpu_credits_remaining < 5`). Both 15-minute windows, evaluated every 5 minutes. **Before Task 2.1.5 this subscription had no action groups and no metric alerts at all**                      |
| Container registry         | **`crmarketpulse.azurecr.io`** — ACR Basic, East US, $0.1666/day, 10 GB included, **admin user disabled**. Pulled by managed identity with `AcrPull`                                                                                                                                                                                                                                                         |
| Source repository          | `github.com/theSmaw/marketpulse`                                                                                                                                                                                                                                                                                                                                                                             |
| Deploy trigger             | A merge to `main`, gated on `verify` — `.github/workflows/deploy.yml`, automatic since Task 1.11.6                                                                                                                                                                                                                                                                                                           |
| Deploy credential          | Federated identity credential (OIDC) on app registration `marketpulse-github-deploy`, app id **`1bb765eb-fff3-4aed-80f2-90796c2fbcfb`**. **No repository secret exists.** See below                                                                                                                                                                                                                          |

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

| Identity                     | What it is                                                                                                                                                                                    | What it authorises                                                                                    | How to rotate                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub → Azure**           | Federated identity credential (OIDC) on app registration `marketpulse-github-deploy`, app id `1bb765eb-fff3-4aed-80f2-90796c2fbcfb`, service principal `f8b785a8-f6e1-4ca9-a71a-a906e5356d6a` | `AcrPush` on `crmarketpulse`; `Contributor` on the container app; `Contributor` on the static web app | Nothing to rotate — there is no secret. Revoke by deleting the federated credential or the role assignment                                                                                            |
| **Container app → registry** | System-assigned managed identity, principal `fe8a2ecd-719c-407e-94d4-629015bd889d`                                                                                                            | `AcrPull` on `crmarketpulse`                                                                          | Platform-managed; nothing stored                                                                                                                                                                      |
| **Container app → database** | The same system-assigned managed identity. A Microsoft Entra access token minted **per connection** from `IDENTITY_ENDPOINT`, used verbatim as the PostgreSQL password (Task 2.1.6)           | Database role `marketpulse-backend`, created by `pgaadauth_create_principal`                          | Nothing to rotate — the token is re-minted per connection and lasts ≤24 h. Revoke with `DROP ROLE marketpulse-backend`, or by removing the app's identity; either takes effect at the next connection |

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

> **Scoped and superseded 2026-09-04 (Story 1.13).** Two amendments to the paragraph above, and only one of them changes a decision. **The scoping clause:** _structurally incapable_ is too strong. The status, the body and the log genuinely cannot catch a wrong `CORS_ORIGIN`, but `access-control-allow-origin` is a readable copy of `CORS_ORIGIN` — `@fastify/cors` with a string origin asserts the configured value unconditionally — so an instrument **told the frontend's origin** can compare them. That value is what no server-side instrument has, and the comparison is a proxy for the browser's verdict rather than the verdict, saying nothing about failure (2), where the backend is never asked. **The reversal:** the trigger's other half fired. Story 1.12 shipped a client that polls the backend, so the failure became producible, and Task 1.13.5 built the check — `pnpm e2e:deployed`, a `check-deployed` job in `deploy.yml` with `needs: deploy`. Every prediction in the paragraph below held: it polls rather than checking once, and it carries a two-host control for exactly the link-flakiness this bullet names. See ADR 0013 §7.

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
