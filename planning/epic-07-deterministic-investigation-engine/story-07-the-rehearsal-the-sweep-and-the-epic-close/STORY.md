# Story 7.7 — The Rehearsal, the Sweep, & Epic 7's Close

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
**Epic scope covered:** the close

## Description

**Three epics have now closed this way, and each found something the one
before it missed.** Epic 4 shipped with no subject document and wrote one
only at its own close; Epic 5 did exactly the same thing and opened its
own subject document by recording that it was the second consecutive
epic caught at the same point; Epic 6 broke the pattern by writing
`TOPOLOGY.md` from Story 6.1, and closed having compiled all 63 of its
own acceptance criteria into one table rather than leaving a third of
them unverdicted the way Epic 5 did for 33 of its 59. `INVESTIGATIONS.md`
should already exist by the time this story opens, amended by each of
Stories 7.1–7.6 as they land — if it does not, that is this story's own
first finding, not a surprise.

**This epic's six real stories carry 50 acceptance criteria between them
(10+8+8+8+8+8)** — compile every one into a verdict table, citing each
story's own closing evidence rather than re-measuring it, the same
discipline Epic 6's own Task 6.9.3 used.

**This epic's own exit criterion is more checkable than Epic 6's was, and
less checkable than it looks.** "Selecting `Investigate NVDA` runs a
structured workflow... and streams the results into the UI. No LLM is
involved yet" has no half that needs a person's judgement the way
"visually obvious" did — every clause is mechanically verifiable: the
workflow runs, the steps are the five named, the results stream, no LLM
is imported anywhere in this epic's own backend tool modules. **Confirm
that last clause with a real check** — an invariant walking this epic's
own source tree for any LLM/model-SDK import, mirroring
`no-renderer-type-in-the-graph-model`'s own corpus-walk shape, rather than
taking "no LLM is involved" on faith.

**`PRODUCT_SPEC.md` §28's investigation performance target —
sub-500-ms-to-visible-start, incremental streaming — was taken fresh at
Stories 7.1 and 7.2's own closes. Re-take it once more here, on the final
tree, with the full six-story feature set assembled**, the same reason
Epic 6's own Task 6.9.4 re-ran every gate once on its final tree rather
than trusting each task's own in-flight figure.

**Register this epic in the rehearsal ledger from this story, not after
discovering the gate cannot see it — a lesson Epic 6 learned the hard
way.** `scripts/check-invariants.mjs`'s `REHEARSAL_LEDGER_EPICS` will not
know Epic 7 exists until this story adds it; do that in the same change
that writes this epic's own `LIVE-REHEARSAL.md` rows, not as an
afterthought found by a future epic's own close.

**And whether a person needs to watch this epic work is a genuinely open
question, not a default yes.** Every other epic's own rehearsal row
exists because some part of its own claim — "feels alive," "visually
obvious," "reads as careful rather than broken" — had no instrument.
This epic's own exit criterion, as argued above, may have no such half.
**Decide at this story's own Gate 1 whether a rehearsal row is owed at
all**, rather than writing one by reflex because every prior epic had
one — and if the answer is no, record that decision with its own
reasoning, because a reader of this file five epics later should be able
to tell "decided unnecessary" apart from "forgotten."

## What the user can see when this story lands

Nothing new — the record this epic leaves behind, and (if genuinely
owed) a verdict on whether a real investigation ran against real,
measured figures rather than a demonstration.

## Acceptance criteria

1. Every acceptance criterion in Stories 7.1–7.6 has a verdict with an
   instrument named, split between re-takes and dated readings, and
   which store/environment each was taken against.
2. `PRODUCT_SPEC.md` §28's investigation target is measured and
   published against the final, assembled six-story feature set.
3. A mechanical check confirms no LLM or model-SDK import exists
   anywhere in this epic's own backend tool/orchestration modules, with
   its own `pnpm break`.
4. The upward sweep: grep `PRODUCT_SPEC.md` for every claim this epic's
   own stories measured or falsified (starting with the tool-name
   reconciliation this epic's own `EPIC.md` already performed at
   decomposition) and correct what is stale, leaving historical records
   standing.
5. The sideways hand-off run and its count recorded — continuing the
   sequence `1, 6, 3, 6, 2, 8, 10, 1` with this epic's own ninth data
   point. Known recipients, named at this epic's own decomposition and
   confirmed or corrected here: Epic 8 (findings/evidence become a real
   UI on top of this epic's domain objects), Epic 9 (the filing tools
   this epic explicitly declined), Epic 10 (the real `AgentProvider`
   replaces this epic's scripted one, against the same contract), Epic
   12 (persistence and branching, where this epic's in-memory-only
   investigations currently end).
6. `docs/GAPS.md` updated, with anything mechanisable made mechanical
   and a `pnpm break` for every check added.
7. Whether a rehearsal row is owed is decided explicitly, with reasoning
   recorded either way; if owed, it is taken (or, failing that, waived
   as a dated, owned decision following Epic 6's own precedent) before
   this story closes.
8. `pnpm verify`, `pnpm test:database` and `pnpm e2e` green with their
   real numbers, taken once on the final tree, with the load read before
   each run.
9. Epic 7 closed, its exit criterion verdicted clause by clause, and
   everything shipping open carrying an owner and a condition rather
   than an epic number.

## Design work

Confirm the canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components
chain holds for every token this epic introduced (the checklist's own
status glyphs, the confidence chip, any new control) — the same walk
Epic 6's own Task 6.9.2 performed, not a re-audit of the whole design
system.

## Out of scope

Epic 8's evidence panel and finding cards. Epic 9's filing tools. Epic
10's real, model-backed `AgentProvider`. Epic 12's persistence and
branching.
