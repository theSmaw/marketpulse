# Story 1.10 — Continuous Integration Pipeline

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.9
**Epic scope covered:** CI pipeline

## Description

Automated verification on every change, so the repository stays green and the portfolio audience sees a maintained project rather than a snapshot.

## Prerequisite

The repository currently has no remote. A hosted origin must exist before this story can be delivered.

## Acceptance criteria

- Pipeline runs on push and on pull request
- Pipeline installs, typechecks, lints, tests and builds both packages
- A failure in any stage fails the pipeline visibly
- Dependency and build caching keep runtimes reasonable
- Status is visible from the repository
- The pipeline runs from a clean environment, catching anything that only works locally

## Open decisions

- CI provider — GitHub Actions is the default assumption
