# Story 1.9 — Automated Testing Foundations

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** unit/integration test foundations

## Description

Establish the testing stack and the conventions later epics follow. PRODUCT_SPEC.md §40 lists "testing non-deterministic systems" as something an interviewer should find a credible answer to, so the foundation needs to be deliberate rather than incidental.

## Acceptance criteria

- Unit test runner configured for both packages, running from the repository root
- Backend integration tests exercise the real HTTP layer, including `/health`
- Frontend component tests render through the real component tree
- Example tests of each kind exist and pass
- Running a single test file, and a single test by name, is documented
- Coverage reporting is available on demand
- Test conventions documented — naming, location, what belongs at each level

## Notes

The commands established here should be added to the Commands section of `CLAUDE.md`, which is currently a placeholder.
