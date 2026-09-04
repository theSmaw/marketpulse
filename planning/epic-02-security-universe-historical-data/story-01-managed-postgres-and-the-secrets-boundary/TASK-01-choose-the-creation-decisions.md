# Task 2.1.1 — Choose the four irreversible decisions, and the credential shape, provisioning nothing

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** nothing

## Objective

Settle every decision this story cannot revise later, and record it in the shape `HOSTING.md` uses, before a single `az` command runs. The point is the same as Task 1.11.1's: the first failed provisioning attempt in this repository's history should have one possible cause.

## Work

- **Take the four creation decisions, each with its reason: tier, networking mode, region, Postgres major version.** Two of them are already constrained rather than open — `HOSTING.md` names Burstable **B1MS** to stay inside the free account's 12-month offer, and East US because that is where the backend, the registry and the eventual database were placed — so the work on those two is confirming the constraint still holds and writing down what would break it, not re-opening it. The version is genuinely open and is a **twelve-month decision**: a major upgrade on a flexible server is not free, so read what Azure currently offers and pick the version Story 2.2's migrations and Story 2.7's ingestion will still want in a year
- **Networking mode is the single most expensive decision in this epic and it gets its own argument.** Public access with a firewall rule cannot be converted to VNet integration afterwards, and private access costs the Container Apps environment a custom VNet that cannot be retrofitted under the running environment either — so both directions are one-way. Read the trap the story names rather than trusting the cheap path's price tag: a Consumption-plan Container App's outbound IPs are **not stable**, so "allow this one IP" is not on the menu and the realistic public rule is **"allow Azure services"**, which admits every Azure tenant's compute, not just ours. Write down what that actually allows, what the password then has to be worth, and what would make the VNet worth its cost later
- **Decide authentication: password, or Microsoft Entra with the container's managed identity.** The second is the shape this repository has already chosen twice — `acrPull` on a system-assigned managed identity, and OIDC for the deploy, where the recorded win is that **there is no repository secret at all** — and its payoff here is identical: no secret exists to leak, to rotate, or to keep out of a log. Its costs are real and belong in the record: token acquisition inside the connection path, a token that expires and therefore a pool that has to renew rather than hold one credential forever, and a local-development story that cannot use the same mechanism. Whichever way it goes, **Story 2.6 places the Alpaca key through the path this decision creates**, so the record has to say what that path is for a value that is genuinely a secret and not an identity
- **Decide storage size and backup retention against Story 2.7's arithmetic rather than against the offer's ceiling.** The offer is 32 GB of storage and 32 GB of backup; the number to write down is what daily bars for the tracked universe actually cost, with the assumption stated, so a later reader can see whether growth or a bad estimate spent it. Note whether storage can be grown later and whether it can be shrunk — those are usually different answers
- **Say what a database changes about the cost estimate before it exists.** Epic 1 closed on **$9.21/month at the idle rate and $19.04 at the active rate against a $20 budget with alerts at 50/80/100%** — a budget that already sits _above_ the active-rate total. A B1MS is free under the offer and its storage and backup may not be; write the arithmetic down here as a prediction, so Task 2.1.8 can check it against a real bill rather than re-derive it
- **Record the account facts a future reader cannot recover from the tree** — server name, resource group, admin login (the name, never the value), which identity may connect, and who can delete it — in the same table `HOSTING.md` uses for the Container App, because that table already exists and a second location is how records rot
- **Provision nothing.** No server, no database, no firewall rule, no secret. The output of this task is a document

## Done when

- Tier, networking mode, region and version each have a decision and a stated reason, and the two one-way doors are named as one-way in the text
- The "allow Azure services" allowlist is characterised in words rather than adopted as a default
- The authentication decision is taken, with its cost to the connection path and to local development stated, and with what Story 2.6 inherits written down
- Storage and backup retention are chosen against an ingestion estimate whose assumption is visible
- The cost prediction is written down as a prediction, with the current budget re-read
- Nothing exists on Azure that did not exist before the task started

## Notes

The two decisions the story calls irreversible are the reason this task exists separately at all. Everything after it is implementation; this is the only place a wrong answer is expensive rather than annoying.

`HOSTING.md` is the destination rather than a new file, unless the material genuinely outgrows it — Epic 1's habit is one document per subject with the reasons in it, and a `DATABASE.md` that repeats the account facts is a second copy waiting to disagree with the first.
