# Story 6.4 — Hover, Select, & the Way Out

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.3
**Epic scope covered:** Hover/select interactions

## Description

**A graph nobody can interrogate is a picture.** This story makes the topology a
place a reader _leaves from_, which is the thing Story 4.6 established for the
landing page's other regions: `/` holds **twenty-four destinations** today, and
after this story it holds those plus every node.

**The hard part is the keyboard, and it has no precedent here.** ADR 0039 makes
every region a tab stop **unconditionally**, and this product's other dense
surface — the chart — is deliberately **one** tab stop with a reading driven by
arrow keys, because the alternative was 1,950 stops. A graph of 516 nodes has the
same arithmetic and **no axis to walk along**: the chart's arrows move through
time, and a cluster has no order a reader can predict.

## What the user can see when this story lands

**Hover a node and it tells you what it is**; select it and the graph focuses;
press Enter and the security page opens. By keyboard as well as by pointer.

## Acceptance criteria

1. **A hover reads the node**: ticker, name, sector, and its band — the same
   facts `Unusual activity`'s row carries, in the same words, from the same
   builders. A second vocabulary for one fact is what ADR 0029's one-home rule
   refuses.
2. **The way out is the security page**, resolved **at render from the node's own
   identity** rather than from a search term or an index, so on a surface whose
   nodes move the activation race is unrepresentable rather than managed.
   `one-home-for-imperative-navigation` holds the corpus over **every shipped
   source file in three trees**, because a new region is a new directory by this
   repository's convention and that check's first version was green on the file
   Epic 5 would write.
3. **The keyboard answer is designed rather than defaulted**, and it is stated as
   a decision with its alternatives. The region is one tab stop by ADR 0039;
   what arrow keys do inside a graph is this story's question. **A ranking is not
   a ring** — the landing page's four roving groups clamp rather than wrap, keyed
   on **symbol** rather than on an index, because a held index is a second and
   disagreeing copy of where focus is.
4. **Focus is visible on a canvas**, which the global `:focus-visible` rule
   cannot do for a node. Whatever draws it is measured against the contrast floor
   and is not hue alone.
5. **The accessible path is not the canvas.** A WebGL node is not in the
   accessibility tree, so the reader who cannot see the graph needs a real
   answer — and `Region` already focuses its own `<section>` when the element
   that last held focus inside it is removed while `document.activeElement` is
   the body, which a canvas losing focusable children inherits as a backstop.
6. **No `Investigate` affordance on a node.** Epic 5's Gate 1 refused it on a
   list row in any form — _a row has one activatable thing and a second is two
   answers to what does Enter do_ — and that reasoning transfers exactly.
   Epic 7 owns the control and the surface it belongs on.
7. **A browser spec drives the pointer and the keyboard**, and asserts where
   focus landed — the one thing this level can see that no other can.

## Open decisions — for the Product Owner

1. **What do arrow keys do in a graph?** Options with different costs: walk the
   nodes of one cluster in a declared order (band, then ticker); walk between
   clusters; or nothing, with selection reached only through a list. The third is
   the honest minimum and the least exciting.
2. **Does selecting a node change the rest of `/`?** A selection that filtered
   `Unusual activity` or the movers would be the first cross-region interaction
   in this product, and ADR 0023's reversal trigger is _the first piece of state
   two features must agree about that neither owns_. Worth taking deliberately.

## Design work

The hover surface, the selected state, and the focus treatment on a canvas. All
three are new; none has a page.

## Out of scope

Filtering (6.8) — selecting a node is not filtering the graph.
