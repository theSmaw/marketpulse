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

**Three container constraints that follow from the platform and are easy to meet only if known in advance.** The image must be `linux/amd64` — "Linux-based (`linux/amd64`) container images are required" — and the development machine is Apple Silicon, so the default local build is the wrong architecture and **runs perfectly in every local check before failing on the platform**. The Consumption plan takes fixed CPU/memory pairs rather than arbitrary values, starting at **`0.25` vCPU with `0.5Gi`**, which is the pair the cost arithmetic below assumes and the envelope the server has to start inside. And **Container Apps runs images from a registry and nothing else**, so a registry is a prerequisite of the first deploy: the choice is Azure Container Registry (Basic, roughly $0.167/day with 10 GiB included) against GitHub Container Registry, which is free for this repository — **Task 1.11.3 owns taking it**, with the note that ACR authenticates by managed identity and `acrPull` rather than by a stored password, and that Docker Hub is warned off by name on rate limits.

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

So the expected bill for this story is a **few dollars a month**, and the estimate carries a stated expiry: **Epic 3 breaks the idle conditions on purpose.** A replica holding a live Alpaca feed is processing traffic during market hours and will not meet "less than 1,000 bytes per second", so it bills at the active rate for part of every weekday. **Do not carry this figure into Epic 3 — re-take it there.** That is the same rule this repository applies to every other measurement, and it is easier to obey when the trigger is named in advance. Health probe requests are not billable, which matters because Task 1.11.3 adds one.

**Static Web Apps** — Free, with the caps in the table above and no overage billing.

**Azure Database for PostgreSQL flexible server** — free for 12 months on a free account, at "up to 750 hours of Burstable B1MS instance", plus "32 GB storage and 32 GB backup storage". 750 hours is continuous operation for a month.

**The bill to watch is Container Apps, and the trigger to re-take it is Epic 3.** A budget and a cost alert on the subscription are the mitigation; Task 1.11.3 is where they get set, because that is the first task that creates a billable resource.

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

| Fact               | Value                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Cloud              | Microsoft Azure                                                                                  |
| Subscription type  | Azure free account (12-month offers plus the always-free grants)                                 |
| Region             | East US, for both halves and the eventual database                                               |
| Frontend service   | Azure Static Web Apps, **Free** plan                                                             |
| Backend service    | Azure Container Apps, **Consumption** plan, `minReplicas: 1`                                     |
| Database service   | Azure Database for PostgreSQL flexible server, Burstable B1MS — **not yet provisioned**          |
| Container registry | **Open — Task 1.11.3 decides.** ACR Basic (~$0.167/day) or GitHub Container Registry (free here) |
| Source repository  | `github.com/theSmaw/marketpulse`                                                                 |
| Deploy trigger     | A merge to `main`, through the existing `verify` workflow's gate (Task 1.11.6)                   |

**Why East US.** Alpaca's market data endpoints are US-hosted, and Epic 3's WebSocket is the latency that matters; the frontend is a geo-distributed CDN on the production environment regardless of the app's region, so co-locating it costs nothing. The trade accepted is portal and log latency for a UK-based maintainer, which is a human cost paid once per session rather than per market tick.

**Deploy credential — the intended shape, decided here and created in Task 1.11.3.** A **federated identity credential** (OpenID Connect) scoped to this repository, with a role assignment on the resource group, rather than a long-lived service-principal secret or a per-service deployment token. The reasoning is the one this repository already applies to third-party actions: a credential that cannot be replayed is worth more than one that is merely rotated, and Story 1.10 already pins every action to a commit SHA on the same principle. Static Web Apps' default GitHub integration issues a long-lived **deployment token** instead; if that is what Task 1.11.4 ends up using, it must be recorded here as a divergence with its reason, not adopted silently because it was the default the portal offered.

**Rollback.** Container Apps keeps revisions, so a rollback is shifting traffic to the previous revision rather than re-running a deploy — Task 1.11.7 owns proving it. Static Web Apps has no equivalent revision history on the Free plan, so the frontend's rollback is **re-running the deploy from the previous commit**, which makes the frontend the slower half to recover and is worth knowing before it is needed.

**Owed by Task 1.11.3, and this table is where they go.** The subscription id, the tenant id, the resource group name, the Container Apps environment name and its unique identifier, **the container registry and its authentication method**, both published URLs, and the federated credential's subject — none of which exist yet, because this task deploys nothing. **A future reader finding this section still carrying this paragraph should read it as work not done rather than as facts that were never knowable.**

## What this task did not do

**Nothing was deployed and no artefact was produced.** No Azure resource exists, no account was linked to the repository, no credential was created and no file outside `planning/` was touched. That is the point, and it is the same shape as Task 1.10.1 installing and stopping: when Task 1.11.3's first deploy fails, the platform choice is not one of the candidate causes.
