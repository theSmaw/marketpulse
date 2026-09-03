# Task 1.11.1 — Choose the hosting for both halves, and settle the database question

**Status:** Complete
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** nothing

## Objective

Settle both of this story's open decisions before anything is deployed, so that every later task is implementation against a chosen platform rather than a platform choice made under the pressure of a half-working deploy.

## Work

- **Choose the two halves separately, and say whether one provider serving both is a decision or a coincidence.** Story 1.3 measured the asymmetry and it is the useful part: the frontend's deployable unit is `dist/` alone — three files, no `package.json`, no `node_modules`, no runtime — and the backend's is the **package directory**, which needs a Node runtime and a dependency tree. One needs a file server, the other needs a process supervisor. A single provider is fine and may well be right; it should be recorded as a choice with a reason rather than as the shape the first signup happened to have
- **Weigh the backend host against Epic 3 and Epic 10, not against today's `/health`.** The story says so and it is the bullet most likely to be skipped, because everything on the shortlist will serve a health endpoint perfectly. The two requirements that will break a wrong choice are a **persistent WebSocket connection to Alpaca** (Epic 3) and **long-running agent execution** (Epic 10). So read the platform's documented limits rather than its marketing: does it sleep or scale an idle instance to zero, does it cap request or connection duration, does it terminate a connection at a fixed idle timeout, does work started by a request survive after the response, and how many concurrent connections does the cheapest tier allow. **Quote the documented numbers into the decision record** — an instance that sleeps after 15 minutes is not a defect until Epic 3, at which point it is the whole product
- **Answer the database question either way, with a trigger.** Provisioning a managed PostgreSQL instance now is an idle cost for a story that stores nothing; deferring it to Epic 2 is only free if the platform chosen here has a managed Postgres adjacent to it — a provider picked with no database in scope may make Epic 2 a second vendor and a cross-network hop. So the decision is really _does this platform have a database story I would take in Epic 2_, and the answer belongs here whichever way it goes. If it is deferred, name what Epic 2 must do and what would make it painful
- **State the reversal cost honestly.** Story 1.10 recorded CI's as "one YAML file", and that is only true because the pipeline runs `pnpm verify` by name and defines nothing of its own. Deployment cannot be that cheap: expect a container definition or a build recipe, a platform configuration, a set of secrets, and a name somebody has published. Write down what would have to change to move hosts, so the number is known before it is needed rather than discovered during an outage
- **Decide what "a development environment" means on this platform.** The acceptance criterion asks for one reachable at a documented URL, and Story 1.11 is deliberately not a production release. Does the platform have a first-class environment or preview concept, is the URL stable across deploys, and is it public or protected? Note that anything protected has to stay reachable by a browser, because Task 1.11.5's cross-origin check cannot be done with `curl`
- **Record the account facts a future reader cannot recover from the tree.** Which account or organisation owns the projects, where the deploy credential lives, who can roll back, and what the free-tier limits are. This is the same class as Story 1.10's repository ruleset: real configuration that no file here can hold, so the write-up is the only durable copy
- **Deploy nothing in this task.** The point is that the first failed deployment in this repository's history has one possible cause, in the same spirit as Task 1.10.1 installing and stopping

## Done when

- Both halves have a named host, with the rejected alternatives named and the grounds for rejection stated
- The WebSocket and long-running-execution limits are recorded as quoted platform documentation rather than as an assumption
- The database decision is recorded either way, with what it costs and what would reverse it
- The reversal cost of the hosting choice is written down
- The environment's URL shape, its protection (if any) and its stability across deploys are known
- Nothing has been deployed and no artefact has been produced

## Notes

Story 1.10's provider decision is the model: the answer was the obvious one, and it was still taken explicitly with the alternative named, because "we ended up on GitHub Actions" and "we chose GitHub Actions" are different records to inherit. The same applies here with more force, because this decision has a cost per month attached to it and a migration path that is not one file.

## Outcome

**Settled 2026-09-03 and recorded in full in [`HOSTING.md`](HOSTING.md).** Nothing was deployed, no Azure resource exists, no credential was created, and no file outside `planning/` was touched.

- **Microsoft Azure, East US, one subscription.** Frontend on **Azure Static Web Apps** (Free plan); backend on **Azure Container Apps** (Consumption, `minReplicas: 1`). One provider serving both is a decision with three stated reasons — the database coupling, one identity boundary for the deploy credential, one free-tier envelope — and explicitly not one service, because the two halves share none.
- **The frontend host was chosen on Story 1.5's fallback constraint, not on price or CDN.** Static Web Apps' `navigationFallback.exclude` is the non-catch-all fallback as a product feature, and the documentation carries the worked table: an unmatched path returns `index.html` with a `200` while a missing file under an excluded folder returns `404`. Cloudflare Pages was rejected because `_redirects` supports no 404 status, so its fallback is necessarily blanket; Netlify expresses it as cleanly and lost only to the one-provider decision.
- **The two Epic requirements are constrained by different mechanisms, and conflating them is the trap.** The Alpaca socket is **outbound** — no ingress timeout reaches it, and what threatens it is scale-to-zero, which is the platform default and which `minReplicas: 1` turns off. Epic 10's SSE stream is **inbound**, so the documented 240-second idle request timeout applies: **the stream must emit inside four minutes.** Premium ingress raises that to 30 minutes and needs a dedicated workload profile at a minimum of two nodes; recorded and declined.
- **Cost is a few dollars a month and the figure has a stated expiry.** The Consumption free grant is 180,000 vCPU-seconds and 360,000 GiB-seconds per subscription per month; an always-on 0.25 vCPU replica needs 648,000, so this is not a free deployment and what keeps it small is the idle rate. **Epic 3 breaks the idle conditions on purpose** — a replica holding a live feed fails "less than 1,000 bytes per second" during market hours — so the figure must be re-taken there rather than carried.
- **The database is named and deferred.** Azure Database for PostgreSQL flexible server, Burstable B1MS, provisioned in Epic 2. The networking mode must be decided before creation because it cannot be changed after, and the cost of deferring is stated: the free account's 12-month offer starts at signup.
- **The reversal cost is seven items, not one file**, and the two worth knowing are that `staticwebapp.config.json` is the least portable thing here — every host spells the same three intentions differently — and that repointing the frontend at a new backend is a **rebuild**, because `VITE_API_BASE_URL` is substituted at build time.
- **The environment is public, deliberately.** IP restrictions are unavailable on the Static Web Apps Free plan, and anything standing between a browser and the frontend would make Task 1.11.5's cross-origin check unverifiable, since `curl` structurally cannot perform it. What makes that acceptable is that nothing deployed holds a credential — which stops being true when Epic 2's Alpaca key arrives.
- **Owed by Task 1.11.3:** the subscription and tenant ids, the resource group and environment names, both published URLs, and the federated credential's subject. `HOSTING.md` names the table they go in and says that finding the paragraph still there means the work was not done.
