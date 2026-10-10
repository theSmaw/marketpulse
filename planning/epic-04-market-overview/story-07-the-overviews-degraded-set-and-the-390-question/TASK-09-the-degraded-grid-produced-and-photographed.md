# Task 4.7.9 — The degraded grid, produced and photographed

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.2, 4.7.3, 4.7.4, 4.7.5, 4.7.6, 4.7.8

## Objective

**ACs 1 and 2, and they are production rather than the extension this story
assumed.**

## What the user can see when this lands

**Nothing.** It is the pass that keeps finding what no single screen shows.

## Work

### The premise this story inherited is false, and it was checked

Story 4.2's grid is **81 rows across 16 state ids** at
`.capture/proxy-states/readings.json`, and **not one of them is a connection
state** — they are `01-no-frame-before-the-floor` … `16-no-provider-configured`,
every one a **data or basis** state. No drop, no stale, no reconnect. And
**zero** specs that visit `/` have ever degraded a feed.

**So the method is inherited and the grid is produced.** Six more regions, 24
destinations, two age statements and a footer have landed since.

### What "produced" means here, stated rather than implied

In this repository the phrase has been used for `routeWebSocket` grids where
the spec authors the frame with the **shipped encoder**. The honest distinction
is two-level and the grid must say which per axis:

- **Produced** — the transition: the socket, the connect sequence, the decoder,
  the gate, the renderer, the reconnect, the close code.
- **Furnished** — the content: which figures the frame carries.

**No state is reached by setting a component's props or a view object's
fields.** And **the rollback shape is necessarily furnished and labelled so**,
because `WireMarketOverviewInputs.breadth` and `.movers` are non-optional and no
shipped producer can build it.

### Compare per surface, not per page

The 4.2 grid captured three surfaces. This screen has **seven regions, four
with figures, 24 destinations and a footer**, so: **the proxy strip, the sector
ladder, the breadth ledger, the movers pair, the source note, and the footer's
feed cell — captured separately and compared separately**, each as the
concatenation a screen reader is handed. One whole-`main` string per state is
strictly weaker: two states differing only in a breadth footer are "distinct"
while a reader of the sector region cannot tell them apart.

### AC 2's deliberate collapse, expressed as a class rather than a count

`rows.length - 1` is a magic number that says _one of these may collide_ and not
**which**. **Declare the collapse in the data**: each row carries the class it
may collide within, and the assertion is that **the partition of rows by drawn
string equals the partition by declared class.** That fails in both directions —
an accidental collapse goes red, **and a documented exception that has silently
stopped holding also goes red**, which today nobody would notice.

This grid has at least three declared classes already: `{overview undefined,
figures: []}`, `{all-stored-one-session, no-provider-configured}` — told apart
**by the chrome alone** — and `{session running, hours later}`. As a count that
is `rows.length - 3` and nobody can see why.

**And a captured surface that is `""` must not make two states distinct**: an
explicit _nothing drawn_ rather than an empty string, which
`overview-source-note.spec.ts` already does right.

### Entry 13 is owed a fourth verdict, in both directions

`docs/GAPS.md`'s condition is _the next story that publishes a state grid_.
Both directions: **every row produced**, and **every reachable pair having a
row** — the second is what found two missing states last time.

## Done when

1. Every state in the set produced through the shipped socket path, with the
   furnished rows **labelled** and the one unreachable-by-any-producer row named
2. Six surfaces captured and compared **separately**, per state, per width
3. The collapse expressed as **declared classes**, failing in both directions,
   with each exception's justification beside it
4. Four widths, **greyscale at every width**, and no two states reading
   identically within a class
5. `docs/GAPS.md` entry 13 given its fourth verdict in both directions
