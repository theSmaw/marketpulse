# Story 1.12 — Health & Status Vertical Slice

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.5, 1.7, 1.8
**Epic scope covered:** epic exit criterion — backend health/status viewable from the frontend

## Description

The story that closes the epic: prove the whole foundation works end to end by having the frontend display real backend status. Small in scope, but it exercises configuration, routing, layout, the API contract, error handling and deployment together.

It also establishes the connection-state pattern that Epic 3 reuses for the live market feed.

## Acceptance criteria

- The frontend queries backend health and displays it in the application chrome
- Status distinguishes healthy, degraded and unreachable
- When the backend is unreachable the indicator reports it along with the last successful check time, and the rest of the interface remains usable
- Recovery is automatic when the backend returns — no page reload required
- Behaviour is verified against the deployed environment, not only locally
- Polling is deliberate about frequency and does not spam logs

## Notes

This is the first appearance of PRODUCT_SPEC.md §36's core principle: report what is known and when it was known, and degrade locally. The eventual live-feed equivalent is "Live feed disconnected — displaying data through 10:42:17".
