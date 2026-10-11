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

---

## Handed here by Task 4.7.1 — 2026-10-10: the eleventh inline copy is unnecessary, and three states are now producible

**1. Build no `type: "overview"` frame.** `serveFeed` owns the gateway's
connect sequence now: `overview` is sent beside the snapshot, `sendOverview`
broadcasts a later one, and both come from the shipped encoder. Ten specs under
`e2e/specs/` still carry an inline copy and were left alone deliberately — see
Task 4.7.1's record for the count and the reason, one of which is a shipped
invariant that keys on an inline frame.

**2. Three connection states on `/` are now producible, and were not.**

| State                    | Produced by                                     |
| ------------------------ | ----------------------------------------------- |
| `disconnected`, **held** | `reconnect: "refused"` then `drop()`            |
| reconnected, poorer      | `overviewOnReconnect` then `drop()`             |
| reconnected, unchanged   | `drop()` with the default `reconnect: "served"` |

The first is the one that did not exist: a produced `disconnected` used to heal
itself ~2 s after `drop()`, so any photograph of it was a race.
`e2e/specs/overview-held-outage.spec.ts` is the worked example.

**3. Label the rollback row furnished.** An aggregate with no `breadth` or no
`movers` is the shape no shipped producer can build —
`WireMarketOverviewInputs` has both non-optional — and `FURNISHED_BREADTH` is
the section to paste in when the rollback is _not_ what a row meant to model.
Three tests in the held-outage spec use it for exactly that reason.

**4. Record how many sockets each photographed page opened.** `connections()`
counts by **URL**; a dev page is one plus `StrictMode`'s open/close pair and a
deployed page is one. A row that assumes one socket is a row that was taken on
the wrong machine, and keying anything on the count produced a plausible wrong
screen during this task — see Task 4.7.1's findings.

**5. A `/\blive\b/iu` negative on the footer cannot hold in a dropped state**:
`The live feed is not connected.` contains the word. Compare whole surfaces.

**6. The reload-during-an-outage row changed on 2026-10-10, and so did what
`overviewOnReconnect` models** (Task 4.7.3). The gateway serves a reconnecting
or subscribing browser its **last broadcast** aggregate, so the shipped state
to photograph is `serveFeed` with `overview` and **no**
`overviewOnReconnect` — the figures and the denominator survive the reconnect
together, asserted in `overview-held-outage.spec.ts`' fourth test. `overviewOnReconnect` still has a subject and it is a **different** one:
a replica restarted mid-session, which has no last broadcast and no market
state, and whose thin aggregate this repair does not reach (`docs/GAPS.md`, _A
replica restarted mid-session still serves its first browser a thin
aggregate_). If the grid photographs that row, label it as the **deploy** state
rather than as the outage state — they used to be the same picture and are not
any more.
---

## Handed here by Task 4.7.2 — 2026-10-10: seven states are already photographed, and the collision assertion you own must be written over SEVEN surfaces rather than five

Written here rather than linked.

**1. Seven states exist at four widths with greyscale at every width — 56
photographs at `.capture/overview-degraded/`**, with `readings.json` carrying
**seven** surfaces per row (the four regions, the source note, **and both
footer cells**). They are the no-aggregate state either side of the 2,000 ms
floor, CI's shape, closes-with-nothing-observed, the session basis,
`market shut × feed stopped`, and the backend unreachable. Every one was
produced through `serveFeed` and the shipped encoder, each with its plant
proved per channel. `.capture/` is gitignored, so the strings are quoted in
Task 4.7.2's record.

**2. Three states are byte-identical over the five CONTENT surfaces, at every
width** — `closes-present-nothing-observed`, `market shut × feed stopped` and
`backend unreachable × feed stopped`. They separate only on the two footer
cells. So the claim to encode is **no two states collide across the chrome and
the content**; an assertion written over the regions and the source note alone
goes red on a triple that is ADR 0029's one-home rule working correctly. Task
4.2.8 found the same shape as a pair of data states; what is new is that this
triple is mostly **connection** states.

**3. Two states need no second production.** The row `market shut × feed
stopped` **cannot be re-taken after Monday 2026-10-12 09:30 ET** — the masthead
reads the real wall clock — so inherit the 2026-10-10 photographs and its
recorded masthead string rather than re-driving it. And the pre-floor row is
the only one that must be read inside 2,000 ms of mount, which means a fresh
load per width.

**4. Two rules the production established.** A settled read is two reads
300 ms apart agreeing on every surface; on that rule two complete runs were
**byte-identical across all 28 rows and all five footer heights**, so a
harness-driven page does not re-render under you. And a `fullPage` screenshot
draws the sticky status bar across the middle of the page — an artefact of
`position: sticky`, not a defect, and one that reads exactly like one.

**5. One state was enumerated and deliberately NOT produced**: CI's shape with
the market **shut**, where breadth and movers fall to the session basis with
nothing behind it. Building it by hand risks the harness's standing hazard — a
state the server cannot reach, drawn as though it could — because the
producer's behaviour with **no close anywhere** (`market-breadth.ts`'s `null`
session) was not checked. Produce it from the producer, or leave it out and say
so.

---

## Handed here by Task 4.7.6 — 2026-10-11: a state for the grid, and a focus ring that moves in two of your rows

Written here rather than linked.

**1. There is a tenth-ish degraded state you may not have, and it is cheap to
reach**: `overview` present with **no movers section**. `WireMarketOverviewInputs
.movers` is non-optional so no producer can build it, but
`market-stream-protocol.ts`' `readOverview` turns an **unreadable** section into
the same absence on purpose — _"an unreadable one is the same absence rather than
a discarded frame carrying four true prices"_ — so it is reachable from a
healthy gateway as well as from a rollback. The route then draws `Movers` as a
`filledBy` sentence with no rows at all, which is a different picture from the
two-empty-lists state your grid will already have. `serveFeed(page, { overview:
RICH, overviewOnReconnect: ROLLBACK })` with `drop()` is the whole drive —
`overview-degraded-stops.spec.ts` builds exactly that frame and labels it.

**2. In two of your rows the focus ring will be on a region's `<section>` and
not where you left it.** Since this task, `Region` catches the focus its own
content drops: when a ranked row holding focus unmounts and the component
holding Task 4.6.5's recovery unmounts with it, focus lands on the region's own
box. So a photograph taken with a keyboard-focused row, across a degradation,
shows the **region** ringed afterwards. That is the shipped behaviour and it is
asserted; it is here so it does not read as a defect in a contact sheet.

**3. And `ORDER HELD` can be on over a list that just re-ordered**, which is
`docs/GAPS.md`'s new entry. If any row of your grid holds a pointer or a focus
inside a ranked region, the badge in that picture is not evidence the order
stood still.
