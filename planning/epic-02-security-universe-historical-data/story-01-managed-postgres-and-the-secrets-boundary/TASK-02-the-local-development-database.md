# Task 2.1.2 — Give a clean clone a local database, and say what it costs

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Task 2.1.1 (the version, and the authentication decision)
**Amended:** 2026-09-04, after Task 2.1.1 — see _Amended after Task 2.1.1_ below

## Objective

Make a working local database part of what `README.md` gets you, before anything in the backend tries to connect to one — so that every later task in this story can be developed and failed locally, and the deployed environment is where a proven thing is repeated rather than where it is invented.

## Work

- **Choose the mechanism and state the cost to a clean clone.** A container through Docker is the obvious answer and it is not free: Epic 1 needs Docker only for `pnpm image`, which nobody runs on a first day, and this would make it a **prerequisite for the application starting at all**. A native install is cheaper at run time and worse at reproducibility, and it puts a version outside the repository's control on the day after Task 2.1.1 pinned one. Pointing developers at the deployed database is rejected on principle and should be written down as rejected, because somebody will suggest it during the first hour that Docker is broken
- **Match the deployed version exactly, and make that visible.** The whole value of a local database is that it answers the same way; a local 18 against a deployed 17 is a class of bug that appears only in production. The image tag is where that pin lives, and it belongs beside the version decision rather than only in a compose file nobody re-reads
- **Decide where it sits relative to `pnpm dev`.** The three watchers are the loop; a database is a fourth process with a completely different lifecycle — it should survive a Ctrl-C, it holds state, and starting it per `pnpm dev` would mean stopping it per Ctrl-C, which throws away the data you were mid-way through debugging. So the likely shape is a separate long-lived command with `pnpm dev` unchanged, and the cost of that is that "I ran `pnpm dev` and it half-works" becomes a new first-run failure — which is why the next bullet exists
- **`pnpm ready` gets a third check.** It already answers whether the pair is up and it is the documented answer to "is this half-dead", which is exactly the shape a missing database produces: the backend starts, `/health` answers, and nothing that touches data works. Read `scripts/check-ready.mjs`'s existing traps before adding to it — the 2-second per-attempt deadline exists because a socket that accepts and never answers hangs `fetch` forever, and the same is true of a port a database is not listening on. The address comes from the same place the application's does, never a second copy
- **Decide what a developer's database is called and whether it is seeded.** An empty database is the honest answer for this story, since Story 2.2 owns tables; what to avoid is inventing a seeding mechanism here that Story 2.2 then has to unpick
- **Write the first-run narrative into `README.md`, including what it looks like when it is wrong.** That document already lists the seven things a correct first run shows that read as faults; a database adds at least one more, and a developer who has not started theirs needs the symptom named rather than a stack trace to interpret
- **Whatever files this adds are inside or outside `pnpm verify`'s net, and which one has to be stated.** A `compose.yaml` is YAML, so Prettier reads it and nothing validates its schema — the same half-gap the workflows occupy — and that goes in `CLAUDE.md`'s gap list in this task rather than being discovered later

## Done when

- A named mechanism is chosen with the alternatives and their costs recorded, including the rejected one
- The local version is pinned to the deployed version in one place
- A developer following `README.md` from a clean clone reaches a running database, and the instruction was **followed** rather than written
- `pnpm ready` reports the database's state, and was seen to report it correctly when it is down as well as when it is up
- `README.md`'s first-run narrative covers the new failure mode by symptom
- Any new unchecked file is recorded in the gap list with its reason

## Notes

This comes before the pool and before provisioning deliberately. Epic 1's most-cited structural lesson is Task 1.11.2's: the artefact was built and run outside the workspace before any platform saw it, because "a platform failing on an artefact that was never correct is the most expensive failure to read". A connection pool that has never opened a connection is that artefact.

## Amended after Task 2.1.1 (2026-09-04)

- **The version to pin is PostgreSQL 18.** Chosen for the support window (Azure standard support to **14-Nov-2030**, against 17's 2029), GA on Azure since 25-Sep-2025 so not fresh, and with the extension question checked and found not to constrain it — `timescaledb` is 2.24.0 on 15, 16, 17 and 18 alike. The image tag is `18`, and the deployed server is created with `--version 18`.
- **The local database authenticates with a password and the deployed one cannot, and that asymmetry is deliberate rather than an inconsistency to iron out.** Task 2.1.1 chose **Microsoft Entra authentication only** for the managed server, which is a mechanism that structurally cannot exist on a laptop: there is no managed identity to be. So "match the deployed environment" applies to the **engine version** and not to the credential, and this task should say so where a reader would otherwise file it as a bug.
- **That has a consequence for Task 2.1.3 which is worth flagging from here**, because this task is what creates it: the configuration boundary will carry **two shapes of credential**, a literal locally and an identity deployed. Choosing a local connection shape that only a password fits — a single `DATABASE_URL` with the password inside it, say — narrows 2.1.3's options before it gets to choose.
- **`pnpm ready`'s third check is a genuinely different probe from the two it has.** Both existing checks speak HTTP; a Postgres port speaks a binary protocol and will not answer a `fetch` at all. The existing 2-second per-attempt deadline exists because a socket that accepts and never answers hangs `fetch` forever — **a database port does exactly that**, so this is the first check in that script that has to either speak enough of the protocol to get an answer or settle for a TCP connect. Which one it settles for should be a stated decision, because a TCP connect proves a listener and not a database.
