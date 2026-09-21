# 0032 — A value that changes on its own announces nothing, and what it costs

**Status:** Accepted
**Date:** 2026-09-21
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](../../planning/epic-03-live-market-data/story-04-motion-vocabulary-and-the-first-moving-price/STORY.md)

## Context

Story 3.4 put this product's **first self-changing value** on a screen — a price
that updates while somebody is looking at it, without anybody asking.

Every live region before it announced the result of something **a user did**: a
fetch they triggered, a search they typed, a window they changed. That
distinction had never mattered, because nothing changed on its own.

**This ADR exists because the next two are not in this epic.**
`PRODUCT_SPEC.md` §11's anomaly scores change on their own as the market moves,
and §33's investigation event stream pushes typed events into the workspace for
as long as an investigation runs. Both are self-changing surfaces; **neither
epic's `EPIC.md` knows this decision exists**, and the natural thing to reach
for — _it changes, so announce it_ — is the thing this decides against.

**Its full statement lives in `FRONTEND-STATE.md` §7**, with `UniverseTable`'s
four mechanical clauses and the one-region-per-subject rule it extends. This ADR
exists because that document is _how the frontend holds state and fetches_, and
an author asking **"should my anomaly score announce itself?"** will not look
there.

## Decision — it announces nothing, and the default is silence rather than politeness

**A value that changes without the user having asked is not announced.** No
`aria-live`, no `role="status"`, no polite region. The identity block's price
has none; the arrival mark is `aria-hidden`; the qualifier is plain text.

**A listener gets the change by reading the surface**, which is navigable and
complete out of context — and in fact gets **more** than a sighted reader
glancing does, because `PriceChange` hides its glyph from the accessibility tree
and exposes the **word** _up_ or _down_.

### Four reasons, three of them measurements

- **A page has a small budget of speakers, and this one is spent.**
  `/securities/NVDA` already carries **three** `role="status"` regions, counted
  on 2026-09-21. A price region would be the fourth on one screen, which is the
  shape `FRONTEND-STATE.md` §7's rule exists to prevent.
- **The rate makes it an interruption rather than an answer.** §11.2 measured a
  security's gap between bars at a **p50 of one minute** and a **maximum of
  187**. A region announcing every arrival speaks roughly **sixty times an
  hour, indefinitely**, against a pacing floor this repository has already
  measured at **1,500 ms** — about a number nobody asked about.
- **The argument that bought this page's third region does not transfer.**
  Search speaks 400 ms after a keystroke, which is an argument from _the user
  just did something_. A self-changing value has no such moment, ever.
- **The information is unprompted, not lost.** Nothing is hidden; it is simply
  not shouted.

### Reversal trigger, as a condition

> **The first surface where a self-changing value is the answer to something the
> user asked for** — an alert they subscribed to, an investigation they started,
> a threshold they set.

**Announcing is an interruption when it is unprompted and an answer when it is
not**, and the same words become correct the moment the second is true. Epic 5's
anomaly alerts and Epic 10's investigation stream are both expected to meet this
trigger rather than the decision — **which is the point of writing it as a
condition rather than as a prohibition.**

## What this does NOT decide

- **Whether the result is pleasant to listen to.** Every judgement here is from
  the accessibility tree, which is not the same thing as hearing it. Owner: a
  person with a screen reader, in `CLAUDE.md`'s listening backlog — which Story
  3.4 grew by two entries, both about this surface.
- **The motion vocabulary**, which is the same story's other decision and is
  deliberately **not** an ADR. Its home is the design canvas by
  [ADR 0026](0026-the-design-canvas-as-the-source-of-truth.md) and
  `VISUAL-LANGUAGE.md` below it, and that document is read by every story that
  builds a screen. **A second home for it here would be the duplication this
  repository fails a build over.** The one-line version, for a reader who
  arrived at the wrong document: _work in progress **loops**, a state
  **persists**, a fact arriving **decays**._
