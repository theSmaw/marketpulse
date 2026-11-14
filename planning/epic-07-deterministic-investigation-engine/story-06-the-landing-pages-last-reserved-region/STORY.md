# Story 7.6 — The Landing Page's Last Reserved Region

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.3, 7.5
**Epic scope covered:** `/`'s `Current investigations` region.

## Description

**`/` has drawn this region's placeholder since Epic 4's own close, and
this is the story that fills it — the same pattern every other epic that
touched this landing page has followed, now completing the set.**
`apps/frontend/src/routes/MarketOverview.tsx` already draws `Region
name="Current investigations" awaiting="Epic 7" filledBy="Investigations
in flight — running, awaiting input and completed. Epic 10 lets the agent
start them."` — this story replaces that reserved state with real
content, the same mechanical trigger every prior region's own story fired
on (`Region`'s reserved state is keyed structurally on `children ===
undefined`, so passing any children at all is what flips it).

**This is sequenced after findings and failure handling rather than
before them, deliberately.** A list of investigations with no findings to
summarise and no way to show one has failed would be a region that looks
filled and reads as broken the first time a reader opens it during a
real investigation — exactly the kind of regression-dressed-as-progress
this epic's own "Why this order" reasoning was written to avoid.

**The region is a cross-security list, not a second place to run an
investigation from.** Each row names the security under investigation,
the investigation's own status (running / completed / failed /
cancelled — `awaiting user` has no producer in this epic, per Story 7.1's
own stated boundary, and will not appear here unless a later epic
produces it), and opens that security's own page, where the real
checklist and findings already live. **This region is a destination list,
not a duplicate of the checklist** — nothing here re-implements the
step-by-step UI Stories 7.1–7.5 already built.

**Every constraint `EPIC.md`'s own hand-off from Epic 4's close named for
this region applies here, unchanged.** It is a tab stop unconditionally
(ADR 0039); it sits on grid row 3, which has a content floor and must not
scroll at any of the thirteen measured width/height pairs; the screen
must not grow a second clock or a second connection word
(`one-caller-of-the-market-clock`/`one-home-for-the-feed-words`); and a
row with nothing behind it must not be a link at all — every destination
here resolves through `<Link to={…}>` at render, never through
`navigate()` in a handler, matching `one-home-for-imperative-navigation`'s
own corpus-walk over every shipped source file in three trees.

**And this region re-renders at the market feed's own cadence whether or
not any investigation changed**, per `EPIC.md`'s own measured cost
hand-off (`/` commits 2 renders per applied batch at 6.8–16.1 batches a
minute) — this story measures what holding live investigation state in
this region actually costs on top of that existing rate, rather than
assuming it is free.

## What the user can see when this story lands

`/`'s `Current investigations` region draws a real, ranked list of
investigations in flight, awaiting input or recently completed, each
naming its security and its status, each opening that security's own
page.

## Acceptance criteria

1. The region renders real content, replacing `Panel`'s `reserved` state
   — confirmed by the mechanical trigger (`children !== undefined`)
   rather than a new prop.
2. Each row names its security, its investigation's status, and opens
   that security's page via `<Link to={…}>` resolved at render — no
   `navigate()` call anywhere in this region's own source files.
3. The region is a tab stop unconditionally, at every width, in every
   content state (including zero investigations in flight).
4. No row renders as a link with nothing behind it; a row with no
   destination (if any such state exists) renders as text, matching the
   established `Movers`/`Sector performance` precedent.
5. The region holds the same height across its own states (zero, one,
   many investigations) at all four widths this product tests, measured
   rather than argued.
6. No second clock and no second connection word appear anywhere in this
   region, confirmed by the two existing invariants continuing to pass
   unmodified.
7. The region's own re-render cost, on top of the existing 6.8–16.1
   batches-a-minute market cadence, is measured and reported — not
   assumed to be negligible.
8. Closing or completing an investigation on its own security page is
   reflected in this region without a reload, and vice versa — the two
   surfaces read one underlying state rather than two copies of it.

## Out of scope

Starting an investigation from this region (every investigation starts
from a security page, per Story 7.1's own settled decision). Any AI
starting an investigation on its own (Epic 10, per the placeholder's own
retired sentence — "Epic 10 lets the agent start them").
