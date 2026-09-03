# Account setup — the manual prerequisite

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Owner:** the maintainer, at a browser. This is the one piece of Story 1.11 that cannot be done from this repository.
**Blocks:** the deploy half of [Task 1.11.3](TASK-03-deploy-the-backend-and-its-readiness-check.md), and Tasks 1.11.4–1.11.8 entirely.

This exists because Task 1.11.3 stopped on it. [Task 1.11.1](TASK-01-choose-hosting-and-the-database-question.md) chose Azure and deliberately created nothing — no account, no resource, no credential — and Task 1.11.3 assumed a subscription existed. Nothing between them owned creating one, so it hid in the gap until something ran into it.

It is deliberately **short**. Almost everything about the deployment is `az` CLI work that can be driven from this repository once a login exists, so the useful thing is not a thirty-step portal walkthrough — it is the smallest set of actions that genuinely need a human, and a clear hand-back point.

## Before you start — this costs money

**About $9.21 a month at the current design**, from [`HOSTING.md`](HOSTING.md)'s measured figures: roughly $4.21 for an always-on Container Apps replica and $5.00 for the container registry. Two things to know before spending it.

**The registry is 54% of that, and it is the half you can still avoid.** Azure Container Registry Basic was chosen over the free GitHub Container Registry on the authentication mechanism — managed identity with `acrPull`, so there is no pull password stored anywhere — and that argument is unchanged. But nothing has been created yet, so it is still a live choice, and it is worth taking knowingly rather than by momentum. If the answer is GHCR, say so and the registry section of `HOSTING.md` gets amended rather than quietly contradicted.

**Epic 3 invalidates the estimate on purpose.** A replica holding a live Alpaca feed stops meeting the idle conditions during market hours and bills at the active rate — up to about $14/month if it were never idle. That is recorded, expected, and to be re-measured there rather than assumed now.

## What only you can do

### 1. Create the Azure account

<https://azure.microsoft.com/free/> — it needs a payment card and a phone verification. The card is for identity; the free grants and offers apply on top.

**Check the current signup credit and its window at the point you sign up rather than trusting any figure written here.** New-account credit has changed more than once and it decides whether the first month is free or billed. Note what it actually says.

### 2. Note two things from the portal

Once the subscription exists:

- the **subscription id**
- the **tenant id** (Microsoft Entra ID → Overview)

Both go into [`HOSTING.md`](HOSTING.md)'s account-facts table. Neither is a secret — they identify a tenant, they do not authorise anything — so they are fine in the repository, and the table is the durable copy for exactly this reason.

### 3. Install the CLI and log in

```sh
brew install azure-cli
az login
az account show
```

`az login` opens a browser. That is the step that needs you rather than me.

### 4. Confirm the region and hand back

Everything is East US, both halves and the eventual database — see `HOSTING.md` for why (Alpaca's endpoints are US-hosted and Epic 3's WebSocket is the latency that matters).

Then say so, and the rest proceeds from here.

## What I do once you have logged in

Listed so the split is clear, and so nothing in it lands on you by accident:

- **The budget and the cost alert, before any billable resource exists** — `az consumption budget create`, verified by reading it back. If the CLI refuses on a brand-new subscription, this is the one item that may bounce back to the portal, and it will be flagged rather than skipped.
- The resource group, in East US.
- The container registry, and the image pushed to it — including the one question the offline half could not settle: **whether the registry accepts an OCI image index**, which is what `pnpm image` produces.
- The Container Apps environment and the app, at **`minReplicas: 1`** — the setting the whole Epic 3 argument rests on, read back from the deployed app rather than from the command that set it.
- The managed identity and its `acrPull` role assignment, which is the argument that chose this registry.
- The HTTP health probe against `/health`, replacing the platform's default TCP probe — which passes on any process that binds the port, and so cannot distinguish the case `/health` exists for.
- The log destination, and retrieving a record from the deployed instance.
- Filling in `HOSTING.md`'s account-facts table, which currently carries a paragraph saying that finding it still there means the work was not done.

The federated identity credential for GitHub Actions is [Task 1.11.6](TASK-06-deploy-automatically-on-merge-to-main.md)'s, not this one's — it may need a portal step, and it will be called out there.

## Two things not to do

**Do not create a virtual network for the Container Apps environment.** Public access is the deliberate choice for this story, and `HOSTING.md` records the reason it is not merely the cheap one: Task 1.11.5's cross-origin check can only be made in a browser, so anything standing between a browser and the deployment makes that criterion unverifiable. A custom VNet is also not something to retrofit under a running environment, which is why Epic 2 is told to decide the database's networking mode **before** creating the server. The reversal trigger is Epic 2's Alpaca key reaching the platform, at which point "nothing deployed holds a credential" stops being true.

**Do not create the PostgreSQL server.** It is named now and provisioned in Epic 2, on purpose — an instance with no schema and no reader is idle cost with an operational surface. Its 12-month free window starts at subscription creation either way, and that cost is accepted and recorded.

## Done when

- The subscription exists, and its id and tenant id are in `HOSTING.md`'s account-facts table
- `az account show` succeeds locally
- The region is confirmed as East US
- The registry decision is confirmed or reversed knowingly, now that its share of the bill is known
- The signup credit and its window are recorded as they actually read at signup
