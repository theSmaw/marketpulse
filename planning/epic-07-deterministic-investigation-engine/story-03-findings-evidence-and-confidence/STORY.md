# Story 7.3 — Findings, Evidence, & Confidence

**Status:** Decomposed into four tasks at Gate 1 — 2026-11-21, after six
parallel shaping passes (business-analyst, technical-analyst, ux-architect,
information-architect, designer, technical-architect) plus one tester pass.
See "Resolved at Gate 1" below for every decision taken; nothing there is
open.
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

**Rewritten at Gate 1, 2026-11-21 — six shaping passes plus a tester pass
converged on real corrections to the drafted eight, and the Product Owner
settled four genuine product calls among them. Nothing below is the
original wording; see "Resolved at Gate 1" for the argument behind each
change.**

1. `Finding` and `Evidence` exist as typed domain objects. `Evidence`'s
   event timestamp is present only where an observation exists and
   **absent** (never `undefined`, never fabricated) for a refusal or
   inapplicability — ADR 0029's rule arriving at this type. Only the two
   `Evidence` kinds this story can actually produce
   (`market_observation`, `calculated_metric`) are minted; the other six
   §16 names stay undeclared, with the condition for each named in the
   type's own docblock.
2. An **evidenced** `Finding` cannot be constructed without at least one
   `Evidence` item — a non-empty tuple, enforced by the type system. A
   **refused** outcome's `Finding` is a *structurally different type*
   with no `evidence` member at all (never `evidence: []`), carrying
   instead the refusal word it answered with. Both are minted at exactly
   two sites, held by an invariant mirroring
   `two-mint-sites-for-an-anomaly-score`.
3. Every one of the **six** steps (the snapshot plus Story 7.2's five)
   produces **exactly one** `Finding` on completion, with one exception:
   an **`inapplicable`** outcome produces **no** `Finding` at all — the
   row shows the inapplicability's own sentence with no confidence mark,
   because "the question does not arise" is a different fact from "not
   enough evidence" and the two must not collapse onto one `UNKNOWN`. A
   **`refused`** outcome (including the volume-anomaly tool's permanent
   one) always produces a `Finding` with `confidence: UNKNOWN`.
4. `FINDING_CREATED` carries its `Finding` **with its evidence inline**,
   emitted after the step's own `TOOL_CALL_COMPLETED` and before
   `STEP_COMPLETED`. `EVIDENCE_ADDED` is **not emitted by this story** —
   `PRODUCT_SPEC.md` §33's literal event-by-event ordering is
   incompatible with AC 2's guarantee (a finding would have to exist
   before, or reference, evidence not yet sent), and the event is
   reserved for a later story where evidence can be pinned without an
   attached finding. §33 carries a dated amendment recording the
   deviation, not a rewrite of its sequence.
5. **Split into two, because only half of it is a build check.**
   **5a (mechanical):** no file imports both the confidence mark and
   `AnomalyBadge`, and the confidence mark's own stylesheet declares no
   colour literal and reads no token from the anomaly ramp — both held by
   `pnpm invariants` entries with their own breaks.
   **5b (measured by a person, recorded):** the two are distinguishable
   under `grayscale(1)` by shape or glyph, not by hue — photographed at
   four widths once both exist on one screen, with the figures and a
   `docs/GAPS.md` entry naming the re-measure condition (the first screen
   that draws both in one row, which is Epic 8's).
6. The claim string is bounded by a character ceiling fixed at the mint
   (mirroring the composite ledger's ≤24-character absence reason), with
   the actual number taken from `pnpm probe` against a **zero-bar store**
   at all four widths — refusal claims are the longest sentences this
   product draws, so the empty store is the measurement's worst case, not
   an edge case. No truncation and no narrow-width hiding; the panel's own
   390px fit-budget was already withdrawn as a target (see the dated note
   below) in anticipation of exactly this.
7. No evidence panel, no finding card, and no click-to-focus interaction
   exists, confirmed as a **component-level assertion** (the finding
   rendering adds zero focusable elements and zero click handlers to a
   row) rather than only as a sentence in this story's record.
8. The breadth `Finding` carries **no `security` field at all** —
   structurally, at the type level, mirroring `MarketBreadthReading`'s own
   shape — so a per-security verdict is a compile error rather than a
   wording review. Its claim opens with the tracked population, never
   with a ticker.
9. No claim fabricates an event timestamp, a raw-data reference, or any
   figure for an outcome that observed nothing — a refusal's or
   inapplicability's `Evidence`/sentence names the read that refused and
   carries nothing it did not actually read.
10. Each tool's claim-minting function is tested across every
    `ToolOutcome` arm it can reach, asserting the claims and confidence
    levels produced are **pairwise distinct** — closing the risk that a
    claim is templated from the tool's name rather than from its actual
    outcome, which no gated machine's zero-bar store could ever reveal on
    its own.
11. A second press of `Investigate` after a terminal run does not blank
    the six claims already on screen — each row's existing claim persists
    (dimmed) until that row's own re-completion replaces it. (Today's
    checklist resets to six blank rows on every press; after this story
    that would blank six real findings, which ADR 0028 forbids by name.)
12. The terminal live-region announcement is a **summary** (a count by
    confidence level), not only the last-completed step's sentence — six
    claims landing in one sub-second run currently coalesce onto one
    spoken sentence, and a summary is what a live region should carry
    rather than a transcript. The checklist's rows become a `<ul>`/`<li>`
    structure so a browse-mode screen-reader can reach all six claims
    individually. (Owed to, and recorded against, the still-pending real
    screen-reader pass named in `docs/GAPS.md`.)
13. A new `pnpm invariants` entry asserts every event type the backend's
    serialiser gives a payload to has a matching case in the frontend's
    decoder — the sibling check `the-tool-outcome-decoder-branches-on-
every-kind` does not cover (a new *event type* reaching an un-updated
    decoder is a different failure shape from a new `ToolOutcome` *kind*
    doing so), with its own `pnpm break`.

## Out of scope

The evidence panel, finding cards, and click-to-focus interaction —
`PRODUCT_SPEC.md` §8.2, Epic 8's by citation. Rejecting a finding (§34,
needs a human-in-the-loop decision point this epic does not build).
Persisting a finding past the process's own lifetime (Epic 12).

## A constraint Story 7.2 measured for this story, 2026-11-20

**Read AC 6 against the budget Story 7.2 actually left you, not the one its
own text assumes.** By the time this story starts, `Abnormal-move
indicators` is already **603 px before any press at all** at 390×780,
against a 613 px scroll-padding box — the checklist's six rows alone,
before this story adds a single claim or chip, already push the pressed
panel to 781 px. Three progressively tighter row treatments were measured
and none closed the gap; the Product Owner decided the same day to
**withdraw the 605 px/390×780 fit-budget as a target** rather than chase
it, adopting `search-keyboard.spec.ts`'s `focusIsObscured` predicate (an
element at least as tall as the viewport is not "obscured") as the real
rule. So **"no layout shift to the rows around it" in AC 6 cannot mean
"stays inside the old budget"** — that budget no longer exists as a
target, for this region, at 390 and 768. Measure AC 6 against the shipped
predicate instead, and expect this story's own one-line claims to push the
panel further past 780 px rather than toward it. `docs/GAPS.md` carries
the figures and the decision; `InvestigationChecklist.tsx`'s own docblock
is the live site.

## Resolved at Gate 1 — 2026-11-21

Six parallel shaping passes (business-analyst, technical-analyst,
ux-architect, information-architect, designer, technical-architect) plus
one tester pass, followed by six Product-Owner decisions. Nothing below
is open; this is the record.

### The four decisions put to the Product Owner

- **`inapplicable` produces no `Finding`.** Settled over the
  business-analyst's alternative (mint one with `UNKNOWN`) on the
  information-architect's and ux-architect's shared argument: `UNKNOWN`
  means "not enough evidence," and "the question does not arise" is a
  different, permanent fact that must not collapse onto it. The row draws
  the inapplicability's own sentence with no confidence mark at all.
- **`FINDING_CREATED` carries its evidence inline; `EVIDENCE_ADDED` is not
  emitted this story.** The technical-analyst escalated this as a wire-
  format decision: §33's literal order (`FINDING_CREATED` before
  `EVIDENCE_ADDED`) cannot coexist with AC 2's guarantee. Taken over the
  alternative (`EVIDENCE_ADDED` first, `FINDING_CREATED` referencing by
  id) because it keeps AC 2 at full strength and needs only a dated
  amendment to §33 rather than a rewrite of it. `EVIDENCE_ADDED` stays
  reserved for a later story where evidence can be pinned with no
  attached finding.
- **`Evidence.retrievedAt` is stamped by the orchestrator at event
  emission, never read inside a tool.** The technical-architect escalated
  three options; taken: the orchestrator's own `now()` seam (already
  legitimate there) stamps the instant when it emits `FINDING_CREATED`,
  leaving `a-tool-reads-no-clock` at full strength and every tool
  signature untouched. The field means "when this process recorded the
  claim," bounded by the step's own already-published `durationMs` —
  honest and checkable rather than falsely precise. Rejected: `retrievedAt
  = asOf` (lies in replay — it would claim a past figure was retrieved on
  the day it happened) and a second `ToolContext` field (widens the
  clock guard and needs an ADR for no benefit this story has a use for).
- **Claims omit the investigated ticker.** The security is already named
  by the page's identity block and the route; the information-architect's
  argument that this also lets the breadth claim signal "group fact"
  purely by naming a population rather than a security (no second visual
  marker needed) was the deciding point. `STORY.md`'s own "What the user
  can see" example above is corrected from the drafted
  `NVDA's 5-minute return sits at the 94th percentile` accordingly — the
  shipped claim reads close to `−4.2% over 5 min — 94th of 4,620`,
  anchored to its own window per the business-analyst's R2 (every claim
  is past tense and names the span it was measured over).

Two further Product-Owner calls, folded into the acceptance criteria
above rather than argued twice: the second-press behaviour (AC 11) and
shipping all four confidence levels now with `CONFIRMED` carrying no
producer until Epic 9's filings exist, documented in the type's own
docblock exactly as `INVESTIGATION_STATUSES`' `awaiting_user` already is.

### The domain types and the mint-site pattern

`Finding`/`Evidence` live in a new `packages/shared/src/finding.ts` (not
inside `investigation.ts`, which already holds three vocabularies and is
~850 lines). `Finding` is a two-arm union — `EvidencedFinding` (a
non-empty-tuple `evidence` field) and `UnevidencedFinding` (a `because`
field carrying the refusal word, no `evidence` member at all, never
`evidence: []`) — mirroring `AnomalyScore`/`UnscoredAnomaly`'s own
precedent exactly, including the real-`Symbol` brand (never `declare
const brand`) and exactly two exported mint sites, held by a new
invariant (`two-mint-sites-for-a-finding`) with its own break. The
technical-architect recommends this brand/non-empty-tuple pattern — now
at seven sites in three variants — be documented as a named convention in
`CLAUDE.md`'s TypeScript section in about six lines, pointing at
`composite-score.ts`'s own fuller argument rather than restating it; this
is folded into Task 7.3.1.

`RunnableTool.run`'s return type widens from `ToolOutcome<Output>` to a
pair carrying the minted `Finding` alongside it — a real, structural
contract change (unlike Story 7.2's own additions, which only ever
widened an existing union), forced by `analytical-tool.ts`'s deliberate
erasure of `Input`/`Output` to `JsonValue` at the orchestrator boundary.
Six call sites in `index.ts` change; `a-tool-takes-no-channel-to-another-
step` is unaffected (it greps only `run`'s parameter list).

### The vocabulary

Six `FindingType` values, one per step (the finding type names *the
question asked*; it is not 1:1 with `Step.tool` for ever, and the
docblock says so): `PRICE_MOVE`, `VOLUME_RATE`, `RELATIVE_MOVE` (reused
verbatim from `PRODUCT_SPEC.md` §15's own worked example, rather than a
synonym), `MARKET_BREADTH`, `RETURN_CORRELATION` (the shipped word for
this arithmetic — the topology edge kind, the `return_correlations`
table — never a new spelling), and a sixth for the snapshot step (name
settled at Task 7.3.1, between `PRICE_OBSERVATION` and `LATEST_PRICE`).
A `satisfies Record<ToolName, FindingType>` map makes a seventh tool's
arrival a compile error until it declares its own claim kind — Task
7.2.7's guard going blind at the fifth tool is the precedent this is
written against.

Confidence is a **stated function of the reading's own counted
evidence**, never a per-tool judgement: `refused` → `UNKNOWN` always;
`ok` below a tool's own stated sufficiency floor (`significant: false`,
`measured: 0`) → `POSSIBLE`; `ok` above it → `SUPPORTED`; `CONFIRMED`
reserved, no producer in this epic. Floors are read from each tool's own
shipped constant (`CORRELATION_MINIMUM_OVERLAP` etc.), never re-chosen
here.

Claim voice, settled across the business-analyst and information-
architect passes: one clause, no terminal stop, past tense, the figure
and its denominator stated and no verdict adjective — reusing the
ledger's own shipped formatters (`describeMeasuredSet`,
`percentileOrdinal`) rather than a second spelling of the same figure,
which is where this repository's own `ALPACA.md`/ADR 0029 "one fact, one
home" rule is most easily broken by accident.

### The confidence mark

Designer and ux-architect converged independently on the same shape:
**no filled chip.** `AnomalyBadge` is a filled, centred lozenge; the
confidence mark is unboxed `microLabel` text with a short leading rule
whose **stroke style** (solid → dashed → dotted, weight-graded) carries
the four levels — reusing this product's own existing "dashed means we
don't know" vocabulary (the chart's coverage edge, this very checklist's
own queued glyph) rather than inventing a fifth meaning for a shape.
**Zero colour tokens spent.** Named `ConfidenceMark` (not `Chip`/`Badge`),
in its own component directory, importing nothing from `AnomalyBadge` and
composing nothing from its stylesheet. The label carries its own word
("Confidence: SUPPORTED" in the accessible string) because the two chips
sit roughly 12px apart on screen — closer than either shaping pass
initially assumed — and a listener meets them as one stream with no
spatial separation at all.

### The row, the live region, and the list structure

A second line inside the existing row (glyph/description/duration stay
exactly where they are), spanning the description and duration columns so
the duration's reserved width is reclaimed on that second line — a CSS
grid, not nested flex, with the two-line binding (`row-gap` tighter
between a row's own two lines than between rows) checked by `pnpm probe`
before being believed, per the ux-architect's own flagged risk that a
flex→grid change can silently shift the glyph's baseline. The claim's
arrival gets the existing `--motion-duration-decay` settle (a fact
arriving, per this product's `LOOPS`/`PERSISTS`/`DECAYS` rule) — no new
token, and it is `0ms` under `prefers-reduced-motion` already.

The checklist's rows become a `<ul>`/`<li>` structure (AC 12) and the
terminal live-region announcement becomes a confidence-count summary
rather than the last-completed step's sentence alone — both fixes for the
same finding: today a sub-second six-step run speaks only its last claim,
and the other five are never announced to anyone not reading the screen.
Both changes are reasoning from structure; no real screen-reader pass has
ever been taken on this product, and `docs/GAPS.md` already carries that
as an owned, dated gap this does not discharge.

### What was found and routed rather than decided here

**The same figure can legitimately read differently twelve inches apart,
and that is not a bug this story can fix.** `Abnormal-move indicators`
already draws a factor ledger ~100px above the checklist, and four of
this story's claims restate figures that ledger already states — from a
**different instant** in two cases (the ledger reads the live frame; the
price and peer-comparison tools read at `context.asOf`). Mitigated by
reusing the ledger's own formatters so the *spelling* cannot drift and by
having every claim name its own `n`/span so a reader can see why two
correct figures differ; photographed together at 1440 as part of this
story's own record rather than argued away.

**The snapshot row (step 1 of six) needs a claim-slot word of its own.**
Its finding type and claim text are settled at Task 7.3.1 rather than
left implicit, closing the risk that row 1 reads as a step whose finding
silently failed to render once rows 2–6 each grow one.
