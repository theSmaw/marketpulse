# Story 7.5 — Cancellation & Partial Failure

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.2
**Epic scope covered:** Cancellation; partial failure handling; the
`cancelled` and `failed` lifecycle states made reachable; `INVESTIGATION_FAILED`.

## Description

**Two of `Investigation.status`'s five states have existed as types since
Story 7.1 and have never been reachable — this story is what makes them
real.** `cancel()` has sat on the `AgentProvider` interface since 7.1 as a
stub; this story gives it a body. A tool throwing has, until now, been an
unhandled error; this story is what makes it a first-class, informative
outcome instead.

**Partial failure follows a pattern this product has already proven,
rather than inventing a new one.** `PRODUCT_SPEC.md` §36's own examples —
"Filing search unavailable. Market-data investigation continues,"
"Peer comparison failed. Retry?" — are the literal shape this story
ships, and `CLAUDE.md`'s own standing rule for degradation ("leave the
rest of the workspace and any already-gathered evidence intact and
clearly labelled," never collapse to a global error screen) is exactly
the discipline Story 3.10 already proved out for the live market feed.
**One tool failing does not fail the investigation** — the remaining
steps still run, each independently, and the checklist shows the failed
step's own honest sentence beside the others' real answers.

**Cancellation is a reader's action, not a timeout.** A `Stop` control
beside the running checklist calls `AgentProvider.cancel()`; steps already
complete keep their findings exactly as drawn, the running step stops
where it is (never rolled back, never hidden), and queued steps never
start. `PRODUCT_SPEC.md` §34 names "stop an investigation" as a standing
human-in-the-loop control this epic can claim without needing a model —
unlike "ask a follow-up" or "reject a finding," which need a question to
answer back to and are explicitly later epics' by name, stopping needs
nothing but the orchestrator this epic already owns.

**A retry is offered where `PRODUCT_SPEC.md` §36 names one explicitly**
("Peer comparison failed. Retry?") and nowhere else — this story does not
invent a general retry affordance, only the one the spec's own example
states, scoped to re-running the single failed step rather than the whole
investigation.

## What the user can see when this story lands

A `Stop` control that actually stops a running investigation, leaving
whatever has already completed exactly as it was. A tool that fails shows
an honest sentence in its own row — `Peer comparison failed. Retry?` —
while every other step keeps running and completing normally.

## Acceptance criteria

1. `AgentProvider.cancel()` stops the orchestrator before its next
   queued step starts; a step already running is allowed to finish or
   fail on its own rather than being interrupted mid-call.
2. `Investigation.status` transitions to `cancelled` on a successful
   stop, and to `failed` only when every step has either completed or
   failed (never on one failed step alone, per the next criterion).
3. A single tool throwing marks that step `failed` with an honest,
   specific sentence; every other step continues independently and the
   investigation as a whole completes normally if the rest succeed.
4. `INVESTIGATION_FAILED` is emitted only when the investigation genuinely
   cannot produce a usable result (e.g. the security itself cannot be
   found) — not merely because one of several tools failed.
5. A failed step's sentence offers `Retry?` only where `PRODUCT_SPEC.md`
   §36 names that exact pattern; retrying re-runs only that one step,
   not the whole investigation, and does not duplicate already-gathered
   findings from the steps that succeeded.
6. Already-rendered findings and the graph highlight (Story 7.4) survive
   a cancellation or a partial failure untouched — nothing already drawn
   disappears or is marked invalid.
7. The `Stop` control is reachable by keyboard and disappears (or
   becomes inert, consistent with this epic's own established pattern
   for a control with nothing to act on) once the investigation is no
   longer running.
8. A cancelled or partially-failed investigation's final state is
   rendered with no ambiguity about which steps succeeded, which failed,
   and which never ran — distinguishable from each other at a glance.

## Out of scope

Retrying a cancelled investigation as a whole (re-pressing `Investigate`
starts a new one; this story does not special-case resuming an old one —
Epic 12's branching is the real mechanism for that). A reader asking why
a tool failed beyond the sentence shown (Epic 8's evidence/debugging
surface, if any).
