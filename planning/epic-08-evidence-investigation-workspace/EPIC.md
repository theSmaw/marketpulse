# Epic 8 — Evidence & Investigation Workspace

**Status:** Not started
**Sequence:** 8 of 15 — follows Epic 7 (Deterministic Investigation Engine)
**Spec references:** PRODUCT_SPEC.md §5.2 (evidence before explanation), §5.3 (visible uncertainty), §8.2 (Investigation Workspace), §15 (findings), §16 (evidence), §36 (failure/partial states)

## Goal

Turn analytical results into an understandable investigation experience.

## Outcome

Users can inspect the evidence behind an investigation rather than receiving a collection of raw calculations.

## Scope

- Investigation workspace
- Evidence domain model
- Finding domain model
- Evidence cards
- Confidence/evidence-quality states
- Comparison charts
- Investigation timeline
- Investigation-step status
- Evidence provenance
- Evidence-to-chart linking
- Findings-to-evidence linking
- Failed/partial investigation states

## Exit criteria

A deterministic investigation results in an understandable collection of findings such as:

> The move is broader than NVDA but concentrated within semiconductors.

and the user can inspect the exact calculations supporting that statement.

**Milestone:** by the end of this epic MarketPulse should already be a credible non-AI product.

## Handed here by Story 3.9's close — 2026-09-24: a comparison chart shares a frame that now grows

**The security page's price and volume plots extend during a session** (Story
3.9), on a single `ChartAxis` frame that both read. A comparison series hung on
that same axis inherits two things:

- **The frame's last slot arrives on its own**, so a comparison drawn inside
  `ChartAxis`'s provider grows with it and one drawn outside does not. ADR
  0023's reversal trigger — _the first piece of state two features must agree
  about that neither owns_ — was evaluated by Task 3.9.5 and has **not** fired,
  and the sharpened condition names **a comparison chart** as one of the three
  things that would fire it.
- **A pinned reading is a reading of a bar, not of _now_.** Task 3.9.6 decided
  that a reading **holds its instant** when a newer bar arrives and **updates in
  place** when the bar it names is revised. Its recorded reversal trigger is
  yours by name: _the first surface that shows a reading the reader did not
  place_ — an agent's `pinEvidence`, or a replay cursor. A reading nobody
  pointed at has no instant to hold, and that is the case to decide rather than
  inherit.
