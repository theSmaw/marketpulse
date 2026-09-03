# Task 1.11.1 — Choose the hosting for both halves, and settle the database question

**Status:** Not started
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
