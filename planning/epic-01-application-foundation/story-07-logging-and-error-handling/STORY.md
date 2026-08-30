# Story 1.7 — Logging & Error Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.2
**Epic scope covered:** logging, basic error handling

## Description

Structured logging and a consistent error contract across the stack. PRODUCT_SPEC.md §36 requires that failures degrade locally rather than collapsing the application, so the error handling established here sets the pattern for every later partial-failure state.

## Acceptance criteria

- Backend emits structured (JSON) logs with configurable levels
- Every request is logged with a correlation id, method, path, status and duration
- The correlation id is returned to the client so a user-visible error can be traced to a log entry
- API errors use a single consistent shape
- Unhandled errors and promise rejections are caught and logged rather than crashing the process silently
- Stack traces and internal detail are not exposed to clients in production
- The frontend has an error boundary that contains a failure to the affected region and offers recovery, rather than replacing the whole screen

## Notes

Later epics extend this pattern rather than replacing it — failed analytical tools (Epic 7), SEC unavailability (Epic 9) and agent failures (Epic 10) are all _product states_, not exceptions.
