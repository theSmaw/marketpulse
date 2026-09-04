# Task 2.1.6 — Put the credential on the platform, connect the deployed backend, and prove nothing leaked

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.4, 2.1.5
**Amended:** 2026-09-04, after Task 2.1.1 settled the credential shape — see _Amended after Task 2.1.1_ below

## Objective

Make the deployed backend execute a query against the managed database over TLS, through whichever credential path Task 2.1.1 chose — and establish the secrets mechanism Story 2.6 will reuse for the Alpaca key, including the leak check that proves it holds.

## Work

- **Fill the `secrets` array, or prove you did not need to.** Task 1.11.3 measured it **empty** and named the mechanism for exactly this arrival. If the decision was a password, this is where the Container App's secret and its `secretRef` on an environment variable land; if it was managed identity, this is where the role assignment and the token acquisition land and the array stays empty — which is the stronger outcome and should be stated as such. Either way, read the deployed configuration back afterwards: `deploy.yml` uses `update` and never `create`, so **the app's environment exists only in the platform**, which is already the largest unchecked-invariant instance in the project and this task makes it larger
- **Nothing new goes in `deploy.yml` as a literal.** That file holds `VITE_API_BASE_URL` as a literal and this file's own record calls that the most dangerous line in it. A database credential is not that shape, and a repository secret is a step backwards from "there is no repository secret at all" — which is the property Task 1.11.6 achieved and which this task must either keep or knowingly spend, in writing
- **Deploy, and prove the query from the deployed environment rather than from a laptop.** The story's second criterion says so explicitly. The evidence that matters is the same shape Task 1.11.5's was: something observed at both ends — the query's result visible from the deployed backend, and the connection visible on the database side — rather than a 200 that could mean anything
- **Now do the leak check, and do it by producing a failure rather than by reading code.** The criterion names four places: the repository, `dist/`, `storybook-static/`, and any log record. The first three are greps — and Story 1.6's measurement is the precedent, where a secret placed in `apps/frontend/.env` was absent from the bundle by name _and_ by value, and where `storybook-static/` was checked because `pnpm build` produces it too. The fourth is the one that needs work: **make a connection fail** — wrong password, wrong host, refused TLS — and read every record the process wrote, in both `json` and `pretty`, including the level-50 and level-60 paths, because a driver that helpfully includes the connection string in an error message is the failure this criterion exists to catch and it only appears when something goes wrong
- **Check the same thing on the platform's own log destination.** Container Apps collects stdout and stderr together — Task 1.11.3 found that a bare configuration-failure line _is_ visible there — so a credential that never reaches our log lines can still reach Log Analytics through a line we did not format. Read the actual records
- **State what the deployed backend does when the database is unreachable**, now against the real one: it must not exit, because the liveness probe restarts a replica that dies and a database blip would become a crash-loop. Produce it — the firewall is the cheapest lever — and watch what the replica does across at least one probe interval
- **Write down the rotation story even if nothing rotates today.** Story 2.6 inherits this path for a key that will eventually need replacing, and "how is this changed without a deploy, and what happens to open connections when it is" is the question that is free to answer now and expensive later

## Done when

- The credential path exists on the platform, was read back from it, and its shape (`secrets` array or managed identity) is recorded with the reason
- The deployed backend executes a query against the managed database over TLS, evidenced from the deployed environment and observed at both ends
- Greps of the repository, `dist/` and `storybook-static/` return nothing, by value and by name
- A connection failure was **produced** and every resulting log record read in both formats and at the platform's destination, with nothing sensitive in any of them
- An unreachable database does not kill the replica, watched across probe intervals
- The rotation procedure is written down
- ~~ADR 0011's "nothing deployed holds a credential" is amended wherever it is stated, rather than left standing as a false claim~~ — **reversed by Task 2.1.1: that claim stays TRUE through this story and must not be amended.** What this task must do instead is _confirm_ it, by reading the deployed `secrets` array back and finding it still empty. See below

## Notes

This is the task that makes two of Epic 1's standing claims stop being true, and the repository's own rule is that a recorded claim which has stopped being true is corrected in every place it stands — Task 1.13.6 found sixteen occurrences of one such sentence across thirteen files and read every one. Budget for that grep here rather than discovering it in Task 2.1.8.

## Amended after Task 2.1.1 (2026-09-04)

Task 2.1.1 chose **Microsoft Entra authentication only, with password authentication `Disabled` and no admin user created at all**, so several of the branches above have collapsed to one and one instruction had become actively wrong.

- **The `secrets` array stays empty, and this task's job is to prove that rather than to fill it.** The "if it was a password" branch above is dead; the "if it was managed identity" branch is the one that runs. Read the deployed configuration back and record the array as still `null`.
- **ADR 0011's "nothing deployed holds a credential" is NOT falsified by this story and must not be swept.** `EPIC.md` predicted that it expires here; it expires in **Story 2.6**, where a third-party bearer token with no Azure identity behind it genuinely has to be stored. Leaving the original "Done when" item in place would have driven a change that made a true claim false — which is the exact failure mode the repository's sweep habit exists to prevent, arriving from the other direction.
- **The leak check's target changed and it is sharper, not softer.** There is no password to grep for, but **the Entra access token is a bearer credential** — it is used verbatim as the password field, it is valid for up to 24 hours, and anything holding it can connect. So the connection-failure log reading must look for **a JWT**, not for a password: a driver that includes the credential in an error message leaks a live token. Produce the failure with an **expired or malformed token** as well as with a wrong host, because those are different code paths in every driver.
- **Token acquisition is written here, not in Task 2.1.4.** 2.1.4 is local and uses a password, so this is the first task in which the application asks for a token at all. The trap is recorded in `HOSTING.md`: Azure's own managed-identity-for-Postgres page is written for a VM and sends you to `http://169.254.169.254/...`, which **is not how a container app gets a token** — Container Apps uses `IDENTITY_ENDPOINT` with an `X-IDENTITY-HEADER` and `api-version` 2019-08-01 or later.
- **The rotation story is reframed rather than dropped.** There is nothing to rotate: the credential is minted per connection and expires in at most 24 hours. What this task should write down instead is what _replaces_ rotation — what happens to open connections when a token expires (the token is validated at connect time, so an established connection is expected to survive its own token's expiry; **verify that rather than assume it**), and what revocation looks like, which is deleting the database role or the identity rather than changing a value.
- **The `secrets`-array mechanism Story 2.6 needs is therefore NOT exercised by this story.** That is a gap this task should name explicitly rather than let Story 2.6 discover: 2.6 is the first task in the project to put a secret on the platform, and it will be doing it for the first time rather than repeating something proven here.
