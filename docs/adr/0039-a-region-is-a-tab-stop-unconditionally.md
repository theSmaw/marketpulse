# 0039 — A region is a tab stop unconditionally, and the guard axe can no longer give

**Status:** Accepted
**Date:** 2026-10-09
**Story:** [4.6 Selection From the Overview](../../planning/epic-04-market-overview/story-06-selection-from-the-overview/STORY.md), Task 4.6.6

## Context

`Region` renders a `Panel` with `scrollable`, which is one prop setting two
things on one element: `overflow: auto` **and** `tabIndex={0}`. It has been that
way since Task 1.13.4, and it was put there by a tool rather than by a reading —
the first run of this product's browser suite on a Linux runner reported axe's
`scrollable-region-focusable` on `Current investigations`, a real WCAG 2.1.1
failure standing since Story 1.5, invisible on the development machine because
the window was 160 px taller.

**The question declined twice is whether it should be conditional.** Task 4.3.1
measured every panel on `/` at four viewports, found none that scrolled, and
deferred the question to the story that owns the focus order; Story 4.4 did not
take it; Story 4.6's own file says it was _"explicitly declined twice rather than
forgotten."_ Three declines is how a question stops being decidable, so it is
taken here.

**Two things make this the moment rather than a tidy-up.** The first is that
Story 4.6 makes rows inside three of the landing route's regions into links,
which **destroys the only mechanism holding the property** — see Decision 2. The
second is that the question had been argued the whole time at the wrong grain.

## Decision 1 — it stays unconditional, and the question is not about scrolling

**`Region` passes `scrollable` for every region, on every route, in every
state.**

**The reframing is the load-bearing part.** The question was never _does this
region scroll_. It is **can a tab stop appear and disappear under a reader**,
and the answer must be no. Both candidate conditions fail, and they fail for
different reasons.

### Why "conditional on actual overflow" fails

Overflow is a function of **height**, and the measurement behind the premise —
_no region on `/` scrolls at any of the four widths_ — is **four width/height
pairs, not four widths**. Task 4.3.1's instrument ran at 1440×900 … 390×780.

Re-taken on 2026-10-09 with a throwaway that compared `clientHeight` against
`scrollHeight` for every named section at thirteen width/height pairs on both
routes that draw regions. Verbatim, the rows that matter:

```
=== / 1440x700
  -> 0 of 7 scroll
=== / 1440x680
  Unusual activity         client  117  scroll  121  SCROLLS +4
  -> 1 of 7 scroll
=== / 1440x600
  Unusual activity         client  102  scroll  121  SCROLLS +19
  -> 1 of 7 scroll
=== / 1440x500
  Market topology          client   82  scroll   85  SCROLLS +3
  Unusual activity         client   82  scroll  121  SCROLLS +39
  -> 2 of 7 scroll
=== / 1280x480
  Market topology          client   79  scroll   85  SCROLLS +6
  Unusual activity         client   79  scroll  121  SCROLLS +42
  -> 2 of 7 scroll
=== / 1024x560
  Market topology          client   94  scroll  103  SCROLLS +9
  Unusual activity         client   94  scroll  121  SCROLLS +27
  -> 2 of 7 scroll
```

**So regions on `/` do scroll, and the first height at which one does is between
681 and 700 at 1440** — an ordinary laptop viewport, not a pathological one. The
premise was true of the four pairs it was taken at and false of five of the
nine pairs added. Which region it is, is derivable from the stylesheet rather
than surprising: row 1 of `.regions` is
`calc((82vh - 2 * var(--space-24)) * 7 / 30)`, a **length** that shrinks with the
viewport and has no content floor, while rows 2 and 3 are
`minmax(min-content, 1fr)` and do have one. `Market topology` and `Unusual
activity` sit on row 1.

A condition keyed on actual overflow would therefore be a boolean recomputed on
every window resize, and `Region.tsx`'s own Task 1.13.4 comment already said so:
_"making it conditional would be a guess re-taken on every window resize."_ It
would also be wrong in a direction no measurement can close — font size, text
zoom and whatever Epics 5 and 6 put in those two regions all move the content
side of the comparison, and the numbers above are a snapshot of a page where
three of seven regions are still hatched.

**The same re-take is the evidence for one other thing**: on `/securities`,
**0 of 8 regions scroll at any of the thirteen pairs**, including `Tracked
universe` at 18,893–31,823 px — which is the fact `SEARCH-AND-SELECTION.md`
already records as _a tab stop on a panel 18,895px tall that never scrolls_. The
long table makes the **page** scroll, not the region. So the route with the
original defect's shape is the route where the rule is least triggered, and the
route with no table is where it fires.

### Why "conditional on content being focusable" fails

This is the better condition. It is **statically knowable** — no resize
listener, no measurement — and it is **correct about 2.1.1**, because the rule
exists so that a pointer user cannot see content a keyboard user cannot reach,
and a region with a reachable control inside it is reachable. It fails on a
different axis.

**The stop would appear and disappear under a reader.** Three of the landing
route's regions hold content whose focusability is a function of the **frame**:
`Sector performance`, `Movers` and `Market breadth` draw rows with links where
an aggregate has landed and an honest sentence where one has not. So that stop
would exist at paint, **vanish when the first aggregate arrives**, and come back
on a rollback, a refused section, an empty answer or a tripped error boundary. A
reader focused on the region at that instant has focus dropped to `<body>`, on a
timer nobody controls.

**And the state is reached by focus, not only by paint.** `Region` already
listens for `focusin`/`focusout` on its own box — both of which bubble, which
Task 4.6.5 confirmed — because the section is the region's only tab stop and
that is where `ORDER HELD` is scoped. A region whose box stopped being a stop
would be a region whose hold a keyboard reader can no longer engage, which is a
second behaviour riding on the same element.

Nothing below `pnpm e2e` can see any of this: jsdom computes no layout and
applies no stylesheet, and a focus drop to `<body>` is a fact about where a
browser's focus went.

### Why `tabIndex` cannot be decoupled from `overflow`

`overflow: auto` is load-bearing in **both** grids that draw regions, and each
stylesheet says so in its own words. `MarketOverview.module.css`: a WebGL
renderer needs a resolved box, so _"the grid takes one, and each region scrolls
its own overflow instead of pushing its neighbours."_
`SecurityExplorer.module.css`: _"`Region` already declares `overflow: auto`;
this is what lets it do its job."_ So a change that made only `tabIndex`
conditional would leave `overflow: auto` in place and produce **precisely** the
2.1.1 failure Task 1.13.4 repaired. The pair is one prop for that reason and
stays one prop.

## Decision 2 — the guard moves from axe to a browser assertion on both routes

**`scrollable-region-focusable` does not fire while a scrolling box contains
something focusable.** That is why the original defect stood for five stories —
`Market topology` holds Story 1.4's render check, which holds a popover trigger
— and it is written into `Region.tsx`, `e2e/README.md` and
[ADR 0013](0013-browser-testing-two-suites-and-what-a-green-run-certifies.md).

**Story 4.6 made rows in three of the landing route's regions into links. From
here axe can never report those regions again**, whatever `scrollable` does. The
claim _every region is reachable by keyboard_ would then read identically
whether the mechanism were there or not — a comment and a line in
`docs/GAPS.md` — which is exactly the failure `CLAUDE.md` records twice: _a
claim about a mechanism reads identically whether the mechanism is there or not,
so a document describing a guard owes something mechanical that fails when the
guard goes._

So the guard is `expectEveryRegionIsATabStop` in `e2e/support/app.ts`, called
from two specs:

- `overview-region-order.spec.ts`, at **768 and 390**, beside the order
  assertion it already makes — because an order is only a keyboard reader's
  route through the screen while the stops exist.
- `securities-route.spec.ts`, at **1280×480**, which is the route with the long
  table and the original defect's shape, at the short viewport that route's axe
  loop already uses for the same reason.

Three properties of it are deliberate.

**The population is every named section, not a list of names.** `Panel` is the
only `<section>` in this application and `Region` is its only production
consumer, so `section[aria-labelledby]` **is** the set of regions by
construction. A name list would make the corpus a hard-coded file list, and the
next region to ship — Epic 5's unusual activity, Epic 6's topology — would be
filtered out of its own check.

**It reads `HTMLElement.tabIndex`, not the attribute.** `scrollable={false}`
leaves no attribute at all and `tabIndex` reports `-1` for it, which is the
state this exists to tell apart from `0`. It also collapses the absent attribute
and an explicit `tabindex="-1"` into one answer, which is right: both are _not a
stop_.

**There is a floor on the count, because an empty population satisfies every
per-element assertion over a collection.** Seven on `/` (six in the grid plus
`Market proxies`, which sits outside it) and eight on `/securities`. It is a
guard against a selector that stops matching, not a census — a route that grows
a region stays green, which is the point.

## Decision 3 — the blast radius is recorded as measured, because it was assumed wrong

Story 4.6's own hand-off said the change was product-wide across five routes.
Re-taken on 2026-10-09:

- **`Panel` has exactly one production consumer.** `grep -rln 'Panel/Panel.js'
apps/frontend/src e2e` returns `Region.tsx` and nothing else.
- **`Region` is on two routes, not five.** `MarketOverview.tsx` and
  `SecurityExplorer.tsx` — the latter serving both `/securities` and
  `/securities/:symbol` — plus five `*.stories.tsx` and two test files.
- **Twenty live files carry a claim that depends on the current behaviour**, in
  54 lines: six under `apps/frontend/src/components/{Region,Panel,RankedList}`,
  four route files and stylesheets, nine specs under `e2e/specs/`,
  `e2e/README.md`, `docs/GAPS.md` and ADR 0013. Planning task records carry many
  more and are historical; they are not swept.

**That is small enough that the decision was never about cost**, which is worth
writing down, because _it is a product-wide change to a shared component_ was
one of the two reasons the question was declined. The surviving reason is the
one in Decision 1.

## Alternatives considered

- **Conditional on actual overflow.** Rejected in Decision 1, on a measurement
  that says the premise behind it is false below about 700 px of viewport
  height.
- **Conditional on content being focusable.** Rejected in Decision 1, on focus
  being dropped to `<body>` by a frame arriving. It is the better condition and
  would be the right one on a screen whose regions did not change shape.
- **Decouple `tabIndex` from `overflow` and make only the first conditional.**
  Rejected in Decision 1: it reintroduces the exact 2.1.1 failure, because both
  grids need the overflow.
- **Give each region a focusable heading instead, and drop the section's stop.**
  Not costed, and worth naming so it is not re-invented as cheap: it adds a stop
  per region rather than removing one, moves the `:focus-within` hold onto a
  child of the box it is scoped to, and leaves the scroll container itself
  unreachable, which is what 2.1.1 is about.
- **Keep the axe rule and accept that it no longer covers three regions.**
  Rejected because it is indistinguishable from having a guard. Axe stays —
  it still covers everything else on both routes — it just no longer certifies
  this.
- **A unit or component assertion on `tabIndex` instead of a browser one.**
  Cheaper and would hold the current state. Rejected because the failure this
  protects against is a reader unable to reach content a pointer can see, and
  jsdom has no layout, no scrollport and no focus ring; a browser is also where
  the population can be read off the rendered page rather than off a fixture.

## Consequences

- **Fifteen tab stops exist today whose scrolling rule fires at two of them, at
  heights under 700 px.** That is accepted, with its argument above. It also
  means the stops are doing a second job — they are the only element at which a
  keyboard reader can be said to be _in_ a region, which is what `ORDER HELD`
  and `onReaderWithin` are scoped to.
- **The claim is now mechanical and owes a break**:
  `pnpm break a-region-stops-being-a-tab-stop` deletes the prop and proves three
  tests red. The defect the next author would actually write —
  `scrollable={children !== undefined}` — was tried first per `CLAUDE.md`'s
  2026-09-26 rule, and the finding is recorded in `scripts/breaks.mjs`: it goes
  red on `/` at both widths and **passes wrongly on `/securities`**, because all
  eight of that route's regions have content. The landing route is the only
  surface in this product that draws a `reserved` region and therefore the only
  one that can see the condition a re-implementer reaches for.
- **A region added by Epic 5, 6 or 7 is in the population by construction**, and
  will be a tab stop or go red. A route that draws regions and is not visited by
  either spec is **not** covered, and `/investigations` and `/replay` draw none
  today.
- **`docs/GAPS.md`'s ≥861 focus-order entry keeps its subject and loses its
  unguarded premise.** That entry's _six tab stops_ are now asserted rather than
  described; whether a column-major focus order at 1440 is experienced as a
  defect is still nobody's check and still a person's.
- **What a green run does not certify.** That a keyboard reader can reach the
  content inside a region once they are at the stop — arrow-key navigation into
  the ranked lists is Story 4.5's and 4.6's, held by their own specs. That the
  stop is announced usefully: the landing route hands a listener six region
  names in one order and whether that explains the screen is the standing
  screen-reader item's. And that no region scrolls at a viewport nobody
  measured, which is the whole reason this decision is unconditional.

## Reversal trigger, as a condition

**The first region on this screen whose content holds a keyboard stop in _every_
state it can be in** — including no frame at all, a refused section, an empty
answer and a tripped error boundary. At that point the condition _conditional on
content being focusable_ stops dropping focus to `<body>`, because the stop
inside the region never goes away, and the region's own stop becomes a
redundant one.

Nothing on this screen is close. `Sector performance`, `Movers` and `Market
breadth` each draw a sentence and no control in at least three of their states,
and the three `reserved` regions draw a heading and a tag.

**Narrower, and it would fire first: the first region whose content is a
scrollport of its own.** Story 4.5's hand-off already forbids that in as many
words — _one scrollport per region_ — because a nested scrolling box that cannot
be focused is this same failure one level down, where axe is equally blind to it
and `expectEveryRegionIsATabStop` does not look. At that point the check's
population is the wrong population and must be widened to every scroll container
rather than every named section.
