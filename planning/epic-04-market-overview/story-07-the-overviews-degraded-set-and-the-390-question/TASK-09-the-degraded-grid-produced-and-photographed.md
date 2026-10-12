# Task 4.7.9 — The degraded grid, produced and photographed

**Status:** In progress — 2026-10-12
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

## Handed here by Task 4.7.4 — 2026-10-11: the grid gained an axis and two regions gained 16 px

Written here rather than linked.

**1. `Market breadth` and `Movers` now have TWO footer states, and the
discriminant is not on the screen.** Each states
`Nothing newer than Sep 16 · 14:02 EDT has reached us.` as a trailing sentence
when the frame carries `observedAt`, and **says nothing at all** when it does
not — which is exactly when the aggregate holds no observation (ADR 0029's
defer rule, decided at the producer). So every row of this grid is now two
rows unless the state fixes `observedAt`, and the axis is cheap: `serveFeed`'s
`overview` is where it is decided, one field.

**2. The absent arm is the gated machine's, and it is free.** CI's store holds
518 securities and **zero bars**, so `observedAt` is omitted for ever and the
only footer a gated run can photograph is the silent one. The present arm has
to be served, which this story's harness already does.

**3. Both regions are 16 px taller in every state, at every width.** The claim
reserves **three** lines rather than two, because the age takes a third line at
390 and none at 768 and above — measured at 1440, 1024, 768 and 390 in both
states. The figures moved: `Movers` is **482 content in a 491 px region**
(was 466 / 486) and `Market breadth` reads 491 at all four widths. If a row of
this grid records a region height, take it again rather than citing one from
Story 4.5.

**4. And there is a pair to photograph rather than a region.** On one frame at
1440 the source note's `Observed through Sep 16 · 14:01 EDT` and these footers'
`Nothing newer than Sep 16 · 14:02 EDT` are **one minute apart and both
correct** — the first names the newest bar, the second the instant after which
nothing has reached us. `docs/GAPS.md`'s entry _The landing page now states two
instants about one aggregate, a minute apart_ names **this task's first
photograph of the two together** as its owning condition, which is the point at
which it becomes an owner's call across four surfaces rather than a finding.

---

## Handed here by Task 4.7.5 — 2026-10-11: two new axes, and one premise of this grid's 390 column is false

Written here rather than linked.

**1. A new axis the grid has never had: `GET /securities` in flight.** The
landing page makes one HTTP request beside the socket, and the **movers name
track** is the only thing on the screen that depends on it. It measured 124 ms
against first-frame times of 174–277 ms, so which wins is a property of the
network and **every cold load may paint movers with no names**. Since
2026-10-11 that state draws **blank room** rather than the row's own ticker
(it drew the identifier twice in adjacent tracks, with the price column
dropped at 390, so there was nothing between the copies). The axis is two
values — universe arrived / universe outstanding — and it costs one
`page.route` holding `SECURITIES_ROUTE_PATTERN`; see
`e2e/specs/overview-movers-name-race.spec.ts`, which is the drive. **It is
worth a row at 390 specifically**, because that is the width where the
duplicate had nothing between it and therefore the width where the blank is
widest.

**2. A new axis on every region, and it is a state no aggregate can
produce: the region THREW.** `Region` now suppresses the head's `meta` when
its content boundary trips (Task 4.7.5), so a failed `Movers` no longer reads
`Top 5 each way` or `ORDER HELD` over a box saying the region could not be
displayed. If this grid photographs a failed region at all — and it is the one
degraded state on this screen that is not a state of the feed — the head is
now part of what the picture is of. `Region.stories.tsx`'
`FailedWithAClaimInItsHead` is the state, and it is reachable in the workshop
without a harness.

**3. `the explanation is at the foot of the page` is false at 390, and this
grid's own 390 column is where it would have been recorded.** Task 4.7.5's
brief rests on it; the photograph refutes it. On the terminal no-frame state
at 390 the first viewport holds `Market proxies` with `No prices yet.`, the
top of `Market breadth`, **and the sticky status bar reading `STALE ·
Connected, and no live prices have arrived yet.`** — about 250 px under the
first apology, at every scroll position, because the bar is sticky. The
explanation is never far from any of the four. What is true at 390 is the
opposite of a chorus: the four regions are tall enough that **no two of the
four sentences are ever co-visible**, and the page is **2,735 px**.

**4. The terminal state's verbatim text, at both widths, settled.** `main`'s
`innerText` is byte-identical at 390 and 1440 (the DOM order does not change,
only the grid does), and the footer is identical too. Recorded in full in Task
4.7.5's record so this grid's rows can be compared against it rather than
re-derived.
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

---

## What was done — 2026-10-12

**Thirteen states at four widths, seven surfaces each — 52 rows and 104
photographs — and the grid is a KEPT SPEC rather than a throwaway.**
`e2e/specs/overview-degraded-grid.spec.ts` is the artefact: it produces every
row through the shipped socket path, reads the seven surfaces off each,
`console.log`s the grid, and asserts the collapse as **declared classes**. The
photographs are the same mechanism under `DEGRADED_GRID_PHOTOS=1`, so the
picture and the claim cannot come apart — which is the one thing Task 4.7.2's
producer could not offer, having been deleted.

### Why a kept spec, and the half of the argument that is a measurement

Task 3.10.9's grid lived in `scripts/state-grid.mjs`, which is gone — and with
it went the repair for _the harness answers the browser's own retry_, which
had to be re-derived by hand two epics later by Task 4.7.1. Task 4.7.2's lived
in `degraded-grid-producer.spec.ts`, run twice and deleted, so its 28 rows are
a quotation. Task 4.8.12's lives in `overview-source-note.spec.ts` and **is
still running** — and is the one whose documented collision this task was able
to test, because it was still executable.

The cost of keeping it is **1.2–1.5 minutes across four parallel tests**
(26.9 s / 15.4 s / 21.3 s / 15.6 s), against a 3.3-minute suite on four
workers. The strings are the gate; the 104 PNGs are behind a flag, because
only the first can be asserted and nothing at any level can see _reads as
designed_.

### The grid

Four widths — **1440, 1024, 768, 390**, greyscale at every width. `kind` is
`produced` unless named. Classes as declared; `—` is a row that must be unique.

| #   | state                                                      | kind         | content class                     | chrome class                     | plant                                             |
| --- | ---------------------------------------------------------- | ------------ | --------------------------------- | -------------------------------- | ------------------------------------------------- |
| 01  | no aggregate, **before** the 2,000 ms floor                | produced     | —                                 | —                                | conn 2, overviews 0                               |
| 02  | no aggregate, **after** the floor — terminal               | produced     | —                                 | —                                | conn 2, overviews 0                               |
| 03  | CI's shape: four `unknown`, `measured: 0`, no `observedAt` | produced     | `one-aggregate-the-empty-join`    | —                                | conn 2, overviews 2                               |
| 04  | closes present, nothing observed, no provider              | produced     | `one-aggregate-the-session-basis` | —                                | conn 2, overviews 2                               |
| 05  | a session running                                          | produced     | —                                 | —                                | conn 2, overviews 2                               |
| 06  | the same aggregate, **re-joined after the bell**           | produced     | —                                 | —                                | conn 2, overviews 2                               |
| 07  | a `movers` section the **decoder refuses**                 | produced     | —                                 | —                                | conn 2, overviews 2                               |
| 08  | a rollback: **no `breadth` section**                       | **rollback** | —                                 | —                                | conn 2, overviews 2                               |
| 09  | a **restarted replica** answering the page's own retry     | produced     | `one-aggregate-the-empty-join`    | —                                | conn 3, overviews 3                               |
| 10  | feed stopped and **held**, market open                     | produced     | `one-aggregate-the-session-basis` | `the-session-word-has-one-home…` | conn 3, overviews 2, refusals 1                   |
| 11  | feed stopped and **held**, market shut                     | produced     | `one-aggregate-the-session-basis` | `the-session-word-has-one-home…` | conn 3, overviews 2, refusals 1                   |
| 12  | backend unreachable × feed stopped                         | produced     | `one-aggregate-the-session-basis` | —                                | conn 3, overviews 2, refusals 1, health refused 3 |
| 13  | **`GET /securities` outstanding** — the movers name track  | produced     | —                                 | —                                | conn 2, overviews 2, universe held 2              |

**One row is furnished in the strong sense and it is labelled `rollback`.**
Row 08 omits `breadth`, which `WireMarketOverviewInputs` makes non-optional, so
**no shipped producer can build it**; the read side admits it because a new
bundle meeting a pinned previous image is a reachable pair.

**Row 07 is the row Task 4.7.6 handed over, and it is PRODUCED rather than
furnished.** Rather than omit the section, the frame carries a `movers` list
that is **type-legally out of rank order** — `gainers` is a
`readonly WireOverviewFigure[]` and nothing in the type says it is ordered — so
the shipped encoder serialises it and `readMovers`' own `isRankedByMove` check
refuses it, reaching `MarketOverview` as the absence `readOverview` documents:
_"an unreadable one is the same absence rather than a discarded frame carrying
four true prices"_. The whole path is shipped; what is furnished is only the
**cause**, which in production is deploy skew or a gateway defect, because
`selectMovers` ranks.

### What differs across the four widths — three things, and no more

Measured by diffing every surface of every state against its 1440 row:

| width | surfaces differing from 1440   |
| ----- | ------------------------------ |
| 1024  | `Sector performance` only      |
| 768   | **none**                       |
| 390   | `Sector performance`, `Movers` |

The sector ladder's tick labels and the movers' dropped price column, exactly
as Task 4.7.2 measured; the masthead's descriptor is the third and is excluded
from both keys. **No degraded sentence is longer at 390 than at 1440.** This is
an independent re-take of that finding on thirteen states rather than seven,
and it agrees with it.

### The collision classes, each with the sentence that justifies it

The rule the partition turned out to express, which is better than a list of
exceptions: **a content class is ONE AGGREGATE**, and the rows in it are the
chrome states that aggregate can sit under. `main` is a pure function of the
aggregate, so two rows carrying the same figures _must_ read identically over
the five content surfaces however their connection, service or market session
differ — and ADR 0029's one-home rule is what keeps those three facts in the
chrome, where the second key can see them.

1. **`one-aggregate-the-session-basis`** — rows 04, 10, 11, 12. _Closes present
   with nothing observed, the feed stopped mid-session, the feed stopped with
   the market shut, and the backend unreachable carry one aggregate between
   them. A reader of `main` cannot tell these four apart because there is
   nothing in `main` to tell apart._ Task 4.7.2 measured three of them;
   the fourth is this grid's. They separate on the two footer cells.
2. **`one-aggregate-the-empty-join`** — rows 03, 09. **Found by this grid on
   its first run, in the accidental-collapse direction.** _CI's permanent store
   and a replica restarted mid-session are one picture: four `unknown` figures,
   eleven `unknown` sectors, `measured: 0`, two empty lists, no observation
   instant._ The collision is right, and it is the sharp edge of the half Task
   4.7.3 could not repair: **the screen has no memory, so the state a reader
   ARRIVES in and the state a reader is DROPPED into after a deploy are the
   same seven surfaces** — only the transition differs, which is exactly why a
   memo could not reach it.
3. **`the-session-word-has-one-home-and-it-is-the-masthead`** (chrome key) —
   rows 10, 11. _The market being shut and the feed having stopped are the same
   seven surfaces, at every width._ `marketOpen` rides the `feed` frame and
   reaches no word of the status bar or of `main`; `MarketSessionStatus` owns
   it, from the **wall clock**, in the opposite corner of the viewport. At 390
   a reader must read **both corners**.

### The assertion, and that it fails in both directions

Pairwise, so a failure names the two rows and the direction:
`collide === (declared class shared)`. An accidental collapse goes red, **and a
documented exception that has silently stopped holding goes red** — and both
fired for real during this task rather than being argued:

```text
Error: 03-ci-shape-nothing-at-all and 09-restarted-replica-on-reconnect read
IDENTICALLY over the content surfaces at 1440 and declare no shared class —
an accidental collapse
```

```text
Error: 03-ci-shape-nothing-at-all and 09-restarted-replica-on-reconnect share
the content class one-aggregate-the-empty-join and no longer read identically
at 1440 — the documented exception has stopped holding, which is the direction
a count cannot see
```

### The brief's own third class was refuted by the production

`{session running, hours later}` — Task 4.8.12's documented collision, which
the brief asked this grid to carry forward. **Over the whole screen it is
false.** Produced, rows 05 and 06 differ on one surface:

```text
05  Market proxies : … Sep 16 · 14:01 EDT · change from 2026-09-15's close
06  Market proxies : … Sep 16 · 14:01 EDT · last prices of the session ·
                         change from 2026-09-15's close
```

**It is not a defect.** `market-proxies.ts`' `sessionTiming` reads `computedAt`
and asks the trading calendar about it, deliberately and at length — _there is
no clock in the browser to read_, and `a-second-clock-on-the-landing-page`
refuses one on this route by name. The distinction that survives, and it is the
one the next author needs: an **age** read off the join instant is a lie on a
dead feed; a **question to the calendar** — _is the session these figures
belong to over?_ — is answered correctly by the same field.

So the claim is encoded at the grain it is true at: a **partial collision**,
naming the five surfaces that must be byte-identical and the one that must
differ, with both halves asserted. It cannot rot in either direction either.

### The count form passes wrongly, with a transcript

The brief's argument against `rows.length - 1`, demonstrated rather than
asserted. With the defect `claimOf(breadth, overview?.computedAt)` applied, the
count form is **green**:

```text
COUNT FORM: 12 distinct of 13 rows
  ✓  1 [chromium] › the degraded grid at 1440 › seven surfaces, every state,
       and the declared collisions (30.1s)
  1 passed (33.0s)
```

`12 === 13 - 1` holds, because the pair that collapses is still a pair — it is
simply a **different** pair. The declared-class form on the same tree is red,
and names which. This is the whole of AC 2's argument in two runs.

### The break

`scripts/breaks.mjs` gains **`the-footer-age-reads-the-join-instead-of-the-market`**,
substituting `observedAt` → `computedAt` in `market-breadth.ts`' age clause —
**the defect this product has already made once** (Task 4.8.12 found the source
note doing it) arriving at the clause Task 4.7.4 added four days ago, where an
author has two fields to choose between and one of them is always present.

```text
$ pnpm break the-footer-age-reads-the-join-instead-of-the-market
Breaking apps/frontend/src/market/market-breadth.ts
  $ pnpm e2e overview-degraded-grid.spec.ts --anyway
✓ apps/frontend/src/market/market-breadth.ts broken → red → restored byte-identical.
  matched: the documented exception has stopped holding
```

`md5` `5a1ab161e149c45911e87b5a480e0321` before and after.

**What the grid sees that no single-frame test can.** The two instants are
**equal** in every fixture that holds one frame, because a fixture stamping
them minutes apart is a fixture somebody chose to write that way. This spec
serves the **same aggregate twice** with the join instant moved and the
observation instant fixed — which is what a reconnecting tab genuinely
receives — so the two fields are forced apart by the state set rather than by a
chosen literal.

The registry entry was appended and the module **re-imported to prove it
parses**, per this story's standing rule — and the first attempt **did not**:
a `\n` inside the `replace` string was expanded by the heredoc that wrote it,
leaving a literal newline inside a string literal and turning the registry into
a `SyntaxError: Invalid or unexpected token`. `node --check` named the line.
That is the third time in this story a registry edit has broken the file, and
the first time the check caught it before a merge.

### Two defects in the production, both found by producing rather than reading

**1. A `stored` figure's move is `sessionChangePercent`, and writing
`changePercent` costs a whole region silently.** The first draft of the
session-basis frame put `changePercent` on `stored` rows. **It typechecks** —
the literal is returned from a `.map` callback with no contextual type, so
there is no freshness check and the extra key is structurally harmless. Four
rows of this grid then drew `Movers` as its **reserved** panel, which is
indistinguishable from a rollback. The chain is five links long and silent at
every one: `storedFigureFields` walks the **map's** keys (ADR 0031), so the
undeclared field is dropped on the wire → every row has no move →
`moveRankingKey` has no key → the list is unrankable → `readMovers` refuses the
section → the region defers. `WireStoredFigure`'s docblock warns the **reader**
of that field (_"a renderer that reached for `changePercent` on a stored figure
and found one would print Friday's move as today's"_); what it does not say is
that a **writer** reaching for the wrong one loses a region and is told nothing.

**2. A state released before it is read is a row of a state the grid does not
contain.** Row 13 held `GET /securities` open and released it in the drive's
own `finally` — which runs before the caller reads anything, so the universe
arrived during the 300 ms settle and the row printed five fully-named mover
rows under the id `universe-outstanding`. The only tell was an `(unsettled)`
marker beside it. The teardown now runs after the read and the photograph, and
`Produced.release` carries the reason.

### The settle rule, enforced rather than reported

Task 4.7.2's rule was _two reads 300 ms apart agreeing on every surface_, and
it was **reported** — a row that never settled got a marker. Here an unsettled
row is a **failure**, because a row that could have been either of two strings
makes every collision assertion below it a coin toss. The instrument also names
**which surface moved**, which a bare marker cannot.

Measured: **52 of 52 rows settled on the first comparison** in four
single-width runs at load 3.4–4.7, and **one row in 52 did not settle at all**
on the four-worker photography run with the machine at **9.76** — which is the
run a gated machine most resembles. The budget is therefore eight attempts
rather than four; the loop exits on the first agreement, so the ordinary cost
is one 300 ms wait. Re-run under photography at the new budget: **zero**
unsettled rows but the pre-floor one, which is read once on purpose.

### Looked at, which is the part no assertion covers

Two findings from the photographs, neither mechanical.

**1. In the rollback state, `Market breadth` is drawn exactly like a region
this product has not built yet.** `08-rollback-no-breadth-section-1440` puts the
same hatch, the same muted sentence and the same box around _a gateway that
does not send breadth_ as `Market topology` and `Unusual activity` carry for
_deferred to Epic 6_ — differing only in the **absence** of an `EPIC n` badge,
which is an absence rather than a statement. A reader cannot tell _this gateway
is behind_ from _this is next year's_. It is the inverse of Task 4.7.5's 1440
contrast, which found the unbuilt regions reading as more intentional than the
waiting ones; here a **degraded** region has borrowed the **deferred**
treatment. Routed to UX/Design and the owner, not repaired here: `Panel`'s
`reserved` state is ADR 0029's defer rule as a component and a second variant is
a canvas question.

**2. The `fullPage` artefact is real and reads exactly like a defect**, as Task
4.7.2 predicted it would again. Every one of the 104 photographs shows the
sticky status bar drawn across the middle of the page at roughly one viewport
down. It is `position: sticky` against a full-page capture. The spec's own
`photograph()` says so where somebody meeting the picture will be.

### Entry 13's fourth verdict, in both directions

Written into `docs/GAPS.md`. **First direction — every published row
reachable**: by construction, because the rows are drives rather than
descriptions. **Second direction — every reachable pair has a row**: three
findings, two of them above (`one-aggregate-the-empty-join`, and the refuted
class), and **one reachable pair this grid still does not have, stated rather
than quietly dropped**:

- **CI's shape with the market SHUT and no close anywhere.** Enumerated by Task
  4.7.2 and left out because `market-breadth.ts`' behaviour with a `null`
  session is unchecked; enumerated again here and left out for the same reason.
  Building it by hand risks the harness's standing hazard — _a state the server
  cannot reach, drawn as though it could_. Owed to whoever **produces it from
  the producer**.
- Two more are enumerated in the spec's own `ENUMERATED_AND_NOT_PRODUCED`, with
  their reasons printed by every run: **a region whose content threw** (no
  frame can reach it; owned one layer down by `Region.test.tsx`' exhaustive walk
  and by `Region.stories.tsx`' `FailedWithAClaimInItsHead`) and **the
  masthead's other three market-shut spellings** (the masthead reads the wall
  clock, so which one a row carries is a property of when the suite ran).

### The two-instants entry, photographed and handed to the owner

`docs/GAPS.md`'s _The landing page now states two instants about one aggregate,
a minute apart_ named **this task's first photograph of the two together** as
its owning condition. Taken, at 1440, from one frame on a settled page:

```text
source note    : … OBSERVED THROUGH Sep 16 · 14:01 EDT
Market breadth : … Nothing newer than Sep 16 · 14:02 EDT has reached us.
Movers         : … Nothing newer than Sep 16 · 14:02 EDT has reached us.
```

**And the surface count is four rather than three.** `Market proxies` qualifies
the same figures from **`computedAt`**, the field the other three stopped
reading. So one screen, from one frame, states the instant three ways and
qualifies the session from a fourth field. Not repaired here, for the reason
the entry already gives; what has changed is that the owner now has the picture
and the arithmetic rather than an argument.

### What falsifies a planning document or `CLAUDE.md`

1. **`WireMarketOverview.computedAt`'s own amendment is wrong, and its two
   halves contradict each other four lines apart.** _"Amended 2026-10-10 by
   Task 4.8.12: no drawn sentence reads it any more"_ is followed, four lines
   down, by _"is still what `market-proxies.ts` asks the trading calendar
   about"_ — and what that module does with the answer is **draw a sentence
   clause**. Task 3.4.9's _two true halves, one contradiction_, inside one
   docblock. Given a dated amendment rather than a rewrite, with the
   age-versus-calendar distinction spelled out and the production named.
2. **This task's own brief claims a hand-off section from Task 4.7.8 that is
   not in the file.** The file carries 4.7.1, 4.7.2, 4.7.3 (inside 4.7.1's),
   4.7.4, 4.7.5 and 4.7.6, and **nothing from 4.7.8** — whose `TASK-08` is
   still `Status: Not started` on this branch. `CLAUDE.md`'s rule that _a
   hand-off sweeps SIDEWAYS and a story close does not reach it_ caught this
   from the other end: the figures reached this task through the **prompt**
   rather than through the file, so a later reader of the file would not have
   them. See the sideways hand-off below.
3. **Story 4.5's region figures are stale and were not re-taken here** — Task
   4.7.4 already said so. No row of this grid records a region height, by
   decision: the one quantity Task 4.7.2 measured that moves with the state is
   the sticky bar's own box, and nothing in this task changed it.

Nothing here falsifies an ADR, an invariant or `PRODUCT_SPEC.md`.

### Handed sideways, written into the siblings' own files

- **Task 4.7.8** — its own hand-off section is **missing from this file**, and
  its `Done when` 3 asks that every sticky-edge figure it moves be re-taken. The
  104 photographs here were produced on a branch that does **not** carry its
  repair, so their masthead descriptor is the pre-repair 11px/16px. Nothing
  captured or compared depends on it — the masthead is excluded from both keys
  and the descriptor is absent at 390 — so the grid's strings stand; only the
  **pictures'** chrome is of the defect, and re-taking them is one flagged run.
- **Task 4.7.11** — the sweep inherits the `computedAt` amendment correction and
  the fourth surface in the two-instants family.

### The gates

```text
$ pnpm verify
42 components, 42 stories files.
527 documents, 1719 cross-file links, 39 anchor links, 0 broken.
53 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:  Test Files  22 passed (22)   Tests   440 passed (440)
apps/backend  test:    Test Files  50 passed (50)   Tests  1031 passed (1031)
apps/frontend test:    Test Files  86 passed (86)   Tests  1413 passed (1413)
apps/backend test:process:  Test Files  2 passed (2)   Tests  49 passed (49)
VERIFY EXIT=0
```

`Unhandled Errors` grepped across the whole log: **zero occurrences**, rather
than inferred from the exit code.

The **first** `pnpm verify` exited 1, on `format:check` alone —
`[warn] docs/GAPS.md` — recorded rather than hidden. `prettier --write`, then
the run above.

```text
$ pnpm e2e overview --anyway
  1 skipped
  83 passed (1.5m)
```

All nineteen `overview-*` specs, against 69 passed / 1 skipped at Task 4.7.1's
close.

`pnpm test:database` was **not** run and is out of scope: the change touches
`e2e/`, one docblock in `packages/shared`, `scripts/breaks.mjs`, `docs/GAPS.md`
and two Markdown files, with no migration, query, schema or repository in it.

### Load, either side of every arm

Task 4.8.1's protocol, and every arm waited for the one-minute average to fall
below 6 before producing a row.

| arm                      | before | after |
| ------------------------ | ------ | ----- |
| first 1440 walk          | 4.67   | 6.77  |
| 1440, declared classes   | 4.47   | 4.40  |
| all four widths          | 4.57   | 10.91 |
| the defect, weaker draft | 5.25   | 10.29 |
| the defect, count form   | 9.02†  | 10.33 |
| `pnpm break`             | 4.75   | 7.09  |
| photographs ×104         | 5.75   | 9.76  |
| 390 ×3, settle check     | 4.68   | 3.58  |
| four widths ×2, enforced | 3.44   | 5.31  |
| photographs, re-taken    | 5.62   | 3.76  |
| `pnpm verify`            | 3.95   | 9.02  |
| `pnpm e2e overview`      | 5.72   | 7.31  |

† the one arm that started above 6: it followed the preceding arm directly and
the machine had not come back down. It is a **green** run of a check expected
to be green, so a slow machine cannot have produced the result; it is recorded
rather than re-taken.

## Done when — verdict

1. **Met.** Thirteen states, every one produced through the shipped socket
   path; one labelled `rollback` and named as the shape no producer can build;
   the row Task 4.7.6 handed over produced through the **decoder** rather than
   furnished; three more enumerated and not produced, each with its reason,
   printed by every run.
2. **Met.** Seven surfaces — four regions, the source note and **both** footer
   cells — captured and compared separately, with `null` for _nothing drawn_
   rather than `""`, and the masthead recorded and excluded.
3. **Met.** Three declared classes plus one declared partial collision, each
   with its justifying sentence printed beside the grid; the assertion is
   partition-by-string equals partition-by-class, pairwise, and **both
   directions fired for real** during the task. The count form was shown green
   on the same defect.
4. **Met.** 1440 / 1024 / 768 / 390, greyscale at every width, 104 photographs
   at `.capture/overview-degraded-grid/` with four `readings-<width>.json`
   beside them. No two states read identically outside a declared class, at any
   width.
5. **Met.** `docs/GAPS.md` entry 13 has its fourth verdict in both directions,
   including a reachable pair found with no row and one still owed.

## Status

**Complete — 2026-10-12.**
