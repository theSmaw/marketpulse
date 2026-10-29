# Epic 12 — Investigation Persistence & Branching

**Status:** Not started
**Sequence:** 12 of 15 — follows Epic 11 (Generative Workspace)
**Spec references:** PRODUCT_SPEC.md §13 (investigation model), §19 (workspace history), §30 (storage), §34 (human-in-the-loop controls)

## Goal

Make investigations durable rather than ephemeral AI conversations.

## Outcome

Users can leave, return to, continue, and branch previous investigations.

## Scope

- Investigation persistence
- Persisted steps
- Persisted findings/evidence
- Persisted workspace state
- Investigation history
- Resume investigation
- Rename investigation
- Investigation status
- Branch from existing investigation
- Restore workspace
- Investigation audit trail

## Exit criteria

A user can reopen yesterday's investigation, restore its evidence and workspace, and continue investigating from that point.

## Handed here by Epic 5's close — 2026-10-29 (Task 5.7.5): five derived tables now exist, and they are a CACHE OF A POLICY rather than a record of an observation

This epic persists investigations. Epic 5 added **five** tables to this schema
and they do not behave like the ones that came before, which is worth knowing
before anything here is designed around them.

`0013_return_baselines`, `0014_session_return_percentiles`,
`0015_volume_baselines`, `0016_excess_move_baselines` and
`0017_session_composite_scores` are **derived aggregates computed nightly and
keyed by the session they are FOR**
([ADR 0044](../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
Three consequences:

- **A stored score is a cache of a POLICY, not a record of an observation.**
  When a factor's definition changes, every stored row silently means something
  else. Epic 5 proved this the expensive way: a live defect in the excess factor
  left **485 persisted rows** carrying a figure computed the wrong way, and the
  repair had to be proved **persisted** rather than merely fixed. Anything in
  this epic that pins, branches or reproduces an investigation will want to know
  _which policy produced this number_, and **no row records that**.
- **One of the five keys on the TAPE as well as the session.**
  `0015_volume_baselines` is `unique (security_id, observed_at, feed)`, the only
  one in the family that does, because a tape choice carrying a reversal trigger
  can flip and a flip against a session-only key would rewrite what every row
  means with nothing recording the change.
- **A refused security gets NO ROW**, which is why `0014` and `0017` are each
  paired with a pass table: the populations a surface states have to come from
  somewhere when the per-security rows are absent. A persistence layer that
  joins only the row table will under-report and look correct.
