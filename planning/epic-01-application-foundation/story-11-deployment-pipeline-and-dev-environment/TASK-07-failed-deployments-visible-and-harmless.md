# Task 1.11.7 — Make a failed deployment visible, and prove it does not take the environment down

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.6

## Objective

Meet the criterion that a failed deployment is visible and leaves the running environment intact, by making deployments fail on purpose in more than one way rather than by reading the platform's description of itself.

## Work

- **Fail it at least three ways, because they fail at different points and only one of them is the interesting case.** A **build failure**, which never produces an artefact and so never reaches the environment at all — the easy case, and worth doing first to confirm the gate. A **deployment that builds and does not start**: the cheapest real one is an invalid required value, since `config.ts` reports every bad key, throws, and `index.ts` writes a plain stderr line and exits 1 — an out-of-range `PORT` does it. And a **deployment that starts and fails its health check**, which is the case that distinguishes a platform that keeps the old version from one that has already replaced it
- **The running environment must survive all of them, and that is checked by request during and after, not inferred.** Poll the deployed `/health` and the deployed frontend throughout each failed deploy, and record what the old version was doing at the moment the new one failed. A platform that swaps first and checks afterwards will produce a window in which the criterion is false, and that window is worth knowing about even if it is accepted
- **The frontend's failure mode is a different shape and is worse.** A partial upload is not a failed deploy — it is a **broken application with no failure anywhere**: `index.html` referencing a hashed asset that was not uploaded. This is exactly why the fallback must not be a catch-all, because a blanket rewrite answers the missing asset with HTML and the browser reports a MIME-type error naming nothing. Say whether the host's upload is atomic; if it is not, say what stands in for atomicity
- **Name where a failure is visible, and to whom.** Three candidates and they are not equivalent: the workflow run's own conclusion, which is only visible to somebody looking at the repository; the platform's own deployment status; and an actual notification. Take the decision explicitly — for a repository with one maintainer, "the run is red and the platform shows the failed deployment" may well be enough, and Story 1.10 declined comment bots and reporting services on exactly that argument. Declining is fine; not deciding is not
- **Roll back once, for real.** Document the path and then execute it, because a documented rollback that has never been run is the same class of claim as a check that has never failed. Record how long it took and whether it needed the repository at all — a rollback that requires a green pipeline is not a rollback
- **State what is still not covered.** Nothing checks the deployed application _after_ the deploy step returns successfully, unless a post-deploy smoke check is added; decide whether to add one and what it would assert. Note the honest limit if it is declined: a deploy that succeeds and produces a working-looking environment with, say, a wrong `CORS_ORIGIN` is green everywhere and broken in a browser, which is the exact failure shape Task 1.11.5 measured
- **Record the platform's own restart behaviour beside this**, because it blurs the boundary: an instance that crash-loops after a successful deploy is a failed environment produced by a successful deployment, and whether that is visible anywhere is the same question one step later

## Done when

- Three failure modes were made to happen: no artefact, artefact that will not start, and instance that starts and fails its health check
- The previously running environment answered `/health` and served the frontend throughout each, checked by request
- The frontend host's upload atomicity is recorded, with a mitigation if it has none
- A rollback was executed rather than described, and its duration and prerequisites recorded
- Where a failure is visible is decided, including a deliberate decision not to notify if that is the answer
- Whatever remains unchecked after a green deploy is written down

## Notes

Story 1.10's habit is the one to copy here: it made four failure classes happen on the runner rather than reasoning about exit codes, and one of them taught something the plan had not anticipated — a chain reports its first failure and nothing after it, so a probe has to be surgical or it proves the wrong step. Expect the same here, and expect the ordering of a deploy's steps to matter for the same reason.
