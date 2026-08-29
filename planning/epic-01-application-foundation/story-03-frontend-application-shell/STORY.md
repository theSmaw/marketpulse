# Story 1.3 — Frontend Application Shell

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** React application shell

## Description

A React + TypeScript application that builds, runs in development with fast refresh, and renders a placeholder shell. No routing, no styling system, no state management yet — those arrive in Stories 1.4, 1.5 and Epic 2.

## Open decisions

* Build tool — Vite is the default assumption unless there is a reason to differ

## Acceptance criteria

* Development server runs with hot module replacement
* Application renders a placeholder shell in the browser
* Production build emits static assets
* Typecheck and lint pass for the frontend package
* Browser target is documented (desktop-first per PRODUCT_SPEC.md §3)

## Notes

Redux and RxJS are deliberately *not* introduced here. Per PRODUCT_SPEC.md §25, add them when there is state and streaming to justify them — Epics 2 and 3.
