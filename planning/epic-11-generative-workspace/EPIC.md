# Epic 11 — Generative Workspace

**Status:** Not started
**Sequence:** 11 of 15 — follows Epic 10 (AI-Assisted Investigations)
**Spec references:** PRODUCT_SPEC.md §5.4 (AI manipulates state, not HTML), §18 (generative UI), §19 (workspace history and undo), §34 (human-in-the-loop controls)

## Goal

Allow the AI to change how evidence is presented, rather than only responding with text.

## Outcome

Natural-language intent dynamically changes the analytical workspace.

## Scope

- Typed workspace-command schema
- Command validation
- `focusSymbols`
- `openChart`
- `compareSymbols`
- `setTimeWindow`
- `highlightGraphNodes`
- `setGraphEncoding`
- `pinEvidence`
- AI-generated workspace commands
- Workspace-command history
- Undo/redo
- User-pinned components

## Exit criteria

A request such as:

> Is this really a semiconductor sell-off or mostly the largest companies?

can cause MarketPulse to:

- change the graph;
- create a comparison;
- alter chart contents;
- focus the relevant securities;

while still using only trusted frontend components.

**Milestone:** by the end of this epic MarketPulse demonstrates the AI/frontend interaction the portfolio is built around.
