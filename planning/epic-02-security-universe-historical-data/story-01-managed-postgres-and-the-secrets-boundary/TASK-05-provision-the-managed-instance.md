# Task 2.1.5 — Provision the managed instance, and reach it over TLS from outside the application

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Task 2.1.1

## Objective

Spend Task 2.1.1's decisions: create the server, the database and its networking, and prove a client can connect to it over TLS and execute a query. No application code is involved, so a failure here has one possible cause.

## Work

- **Create it with the decisions as written, and read the created resource back rather than trusting the command.** Task 1.11.3's practice is the model: every property that matters was re-read from the platform afterwards, and that is how the `HOST=0.0.0.0` requirement and the empty `secrets` array became facts rather than assumptions. Confirm tier, version, region, storage, backup retention and networking mode from the server as created
- **Do the networking half deliberately and record what it admits.** Whichever mode Task 2.1.1 chose, the firewall or the VNet configuration is the thing an attacker meets first, and "allow Azure services" — if that is the path — should be recorded as what it actually is. Also record what is _not_ enabled: public access from a developer's laptop is a rule somebody will want during Story 2.2 and it should be a decision rather than something that quietly stays on
- **Prove TLS rather than assume it.** Postgres will happily negotiate a plaintext connection if the server permits one, so the two things to establish are that the server **requires** encryption and that the client is verifying rather than merely encrypting — those are different, and the second is where a "TLS is on" claim usually turns out to be trust-on-first-use. Record which certificate authority the client validates against and whether anything has to ship with the application to do it, because that is a file in the image if the answer is yes
- **Answer what happens when TLS is not available**, which the story's scope names explicitly. Try it: a client configured to require it against a server that will not, and the reverse. The useful record is the shape of the failure — whether it is a clear refusal or a hang, because a hang at connection time inside a startup path is the same class of problem as the `fetch` that never returns
- **Take the figures somebody will otherwise guess.** Connection time from a laptop and, later, from the runner or the container; whether the server pauses, sleeps or throttles when idle on a Burstable tier; what the maximum connection count is, because that is the ceiling a pool size has to sit under and a B1MS's is small enough to matter
- **Create the database itself, and decide the name.** An empty database with a chosen name, no schema, no extensions unless Story 2.2's plan already needs one named at creation
- **Nothing in this repository connects to it in this task.** The client is `psql` or equivalent, run by hand. Application configuration pointing at it is Task 2.1.6's, and doing it here would merge the "does the server work" question with the "does the credential path work" question

## Done when

- The server and an empty database exist, with every creation property re-read from the platform and recorded
- The networking configuration is recorded in terms of what it admits, not just what it is called
- A client connects over TLS, executes a query, and the verification mode is known and stated
- The no-TLS case was attempted and its failure shape recorded
- The connection ceiling, idle behaviour and connection latency are measured
- No application code, no environment variable on the Container App, and no credential in this repository has changed

## Notes

This is the deploy half of the local/deployed split this story uses throughout, and it is deliberately narrow: the previous three tasks proved the application against a database it could see, and this one proves a database with no application in front of it. Task 2.1.6 is the only place both halves are unknown at once, which is why it comes after both.
