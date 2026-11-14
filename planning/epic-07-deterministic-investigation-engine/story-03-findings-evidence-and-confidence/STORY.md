# Story 7.3 — Findings, Evidence, & Confidence

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.2
**Epic scope covered:** The `Finding` and `Evidence` domain objects; the
`FINDING_CREATED`/`EVIDENCE_ADDED` events; a minimal, correctly-scoped
inline rendering of a finding.

## Description

**Every tool in Story 7.2 already produces a value; this story is what
turns a value into the object `PRODUCT_SPEC.md` §15 names.** A `Finding`
carries a `type`, a `claim`, a `confidence` level
(`CONFIRMED`/`SUPPORTED`/`POSSIBLE`/`UNKNOWN`) and an array of `Evidence`;
each `Evidence` item records its source, its event timestamp, its
retrieval timestamp, its calculation method where relevant, the security
it concerns, and a raw-data reference — `PRODUCT_SPEC.md` §16's own
required fields, and invariant 5's own domain model rather than prose.

**The rendering this story owns is deliberately narrow, and the boundary
matters.** `PRODUCT_SPEC.md` §15's own vision — findings as cards, a click
focusing an evidence panel — is Epic 8's, confirmed by that epic's own
citation of §15/§16/§8.2. What this story draws instead is the smallest
honest rendering that fits inside the checklist row Story 7.2 already
ships: a one-line claim beside the step it came from, with a confidence
chip. Nothing here opens a panel, focuses anything, or lets a reader "view
evidence" in the sense §16 describes — that interaction is Epic 8's to
build on top of the domain objects this story mints.

**The collision this epic was warned about at its own decomposition has
its first real surface here.** A confidence chip and an anomaly-band chip
are both four-member ordered vocabularies rendered as chips, and from
Epic 8 onward they sit on one screen — `EPIC.md`'s own hand-off states
they must never share a component and confidence must never be rendered
as four amber fills, because the amber ramp is anomaly intensity and a
band says _how unusual_ while confidence says _how well evidenced_. This
story is the first one that has to actually draw a confidence chip beside
a security whose `Abnormal-move indicators` region already draws a band
chip on the same page — the two must be visually and semantically
distinguishable at a glance, not merely by their labels.

**A finding cannot be constructed without its evidence, the same shape
`AnomalyScore` already enforces for a composite score.** `PRODUCT_SPEC.md`
§15/§16 are explicit that a finding's claim must be checkable against what
produced it; this story's own type should make an evidence-less finding a
compile error, not a runtime possibility, mirroring `packages/shared/src/
composite-score.ts`'s own branded-type precedent.

## What the user can see when this story lands

Each completed step in the checklist now shows a one-line finding —
`NVDA's 5-minute return sits at the 94th percentile` — with a confidence
chip that is visibly and structurally distinct from the anomaly-band chip
sitting in the region above it on the same page.

## Acceptance criteria

1. `Finding` and `Evidence` exist as typed domain objects, matching
   `PRODUCT_SPEC.md` §15/§16's own required fields exactly.
2. A `Finding` cannot be constructed without at least one `Evidence`
   item — enforced by the type system, not by convention or a lint rule.
3. Every one of Story 7.2's five tools produces a `Finding` on completion
   (the volume-anomaly tool's own honest refusal becomes a `Finding` with
   `confidence: UNKNOWN`, not a missing finding).
4. `FINDING_CREATED` and `EVIDENCE_ADDED` stream in the correct position
   in the existing event sequence, after the step's own `TOOL_CALL_COMPLETED`.
5. The confidence chip and the anomaly-band chip are visually
   distinguishable with no shared component, confirmed by a check that
   fails the build if the two ever resolve to the same component or the
   same colour channel.
6. The one-line claim rendering fits inside the existing checklist row
   with no layout shift to the rows around it, measured at all four
   widths this product tests.
7. No evidence panel, no finding card, and no click-to-focus interaction
   exists — confirmed as a deliberate boundary in this story's own
   record, not an oversight found at Epic 8's own Gate 1.
8. The breadth tool's group-level finding (Story 7.2 AC 5) renders with
   language that does not imply a verdict on the investigated security
   specifically.

## Out of scope

The evidence panel, finding cards, and click-to-focus interaction —
`PRODUCT_SPEC.md` §8.2, Epic 8's by citation. Rejecting a finding (§34,
needs a human-in-the-loop decision point this epic does not build).
Persisting a finding past the process's own lifetime (Epic 12).
