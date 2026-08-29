# Story 1.5 — Application Layout & Routing

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.4
**Epic scope covered:** basic routing and application layout

## Description

Establish navigation and the persistent application chrome. Routes correspond to the four primary experiences in PRODUCT_SPEC.md §8, each rendering a placeholder until its epic delivers it.

## Acceptance criteria

* Routes exist for Market Overview (landing), Investigation Workspace, Security Explorer and Market Replay
* Each route renders an identifiable placeholder
* Persistent application chrome — product name, market clock area, connection status area — survives navigation
* An unknown route renders a not-found state rather than a blank screen
* Layout uses desktop-first regions consistent with the PRODUCT_SPEC.md §9 sketch
* Deep-linking to a route works on page reload

## Open decisions

* Router library — React Router is the default assumption

## Notes

The status and clock areas are placeholders here; Story 1.12 fills the status area, and Epic 3 supplies the live market clock.
