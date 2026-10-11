# Task 4.7.6 — The stops that vanish when an aggregate empties

**Status:** **Complete — 2026-10-11. The aggregate emptying was already covered — focus lands on the region's `<section>`, produced in Chromium — and the state next door was not: when the movers SECTION goes away, Task 4.6.5's recovery unmounts with the component that holds it and focus went to `<body>`. The backstop is in `Region`, which is the one element ADR 0039 makes a stop in every state, and the first draft of it was green on its own defect for the fourth time in this story. The arrow press is measured against a control: one `ArrowDown` re-orders all five rows and moves the reader one row UP the screen, with `ORDER HELD` on throughout — and the focus recovery is a second trigger that needs no key at all. Two shipped claims falsified and amended; the hold itself is the owner's.**
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.3

## Objective

**ADR 0039's own rejected shape, applied to rows rather than regions** — and
nobody considered it there.

## What the user can see when this lands

**Nothing, unless they are using a keyboard when a feed stops**, in which case
their focus stops being thrown to the top of the document.

## Work

### The decision this reopens, in ADR 0039's own words

> It was never _does this region scroll_. It is **can a tab stop appear and
> disappear under a reader**, and the answer must be no.

The **seven region stops** satisfy that. **The twenty ranked ticker stops do
not**: when the eligibility window empties, the rows unmount and a held pad is
handed **no link at all** (Task 4.6.4's deliberate departure), so a keyboard
reader focused on a mover row is dropped to `<body>` **on a timer nobody
controls** — the exact wording ADR 0039 used to reject the alternative it
rejected.

Task 4.6.5 built a recovery for the case where **one row** leaves the list:
focus moves to the row now at that rank, or to the region's section if no real
rows remain. **Check whether that recovery covers this case**, where the whole
list empties at once — and note `RankedList` draws **no `<ol>` at all** when
nothing is ranked, so the list element is already detached and the `<section>`
has to have been captured at **focus** time rather than at recovery time.

### And a degradation can re-order a list under an arrow press

Story 4.6 handed over the `focusin`/`focusout` bubbling defect: **every arrow
press inside a ranked region releases the order pin and retakes it against the
last frame drawn.** In the steady state that frame is the one on screen; **in a
degraded state it is the emptied one.** So the hold, which exists precisely to
stop a list moving under a reader, cannot protect against the one transition
that moves it most.

It was left unrepaired deliberately — **but its consequence in a degraded state
was not part of that decision.** Measure it, then recommend; do not repair the
hold here without saying so.

### Produced rather than reasoned

Task 4.7.1's harness can serve a poorer aggregate on reconnect, which is
exactly this transition. **Drive it with focus on a row** and read where focus
went — not what the DOM contains.

## Done when

1. A keyboard reader focused on a ranked row when its aggregate empties keeps
   a focus position that is not `<body>` — produced in a browser
2. Whether Task 4.6.5's recovery covers a whole-list empty is answered by
   driving it, and the answer recorded either way
3. The arrow-press-re-orders-under-a-degradation consequence is measured, with
   a recommendation rather than an unannounced repair
4. `pnpm verify` and the overview keyboard specs green

---

## Handed here by Task 4.7.1 — 2026-10-10: the transition you need is one option, and it is driven once already

**`serveFeed(page, { overview: RICH, overviewOnReconnect: POOR })` then
`feed.drop()`** is the whole drive — the page's own retry is answered with the
emptier aggregate and the rows unmount under whatever has focus. Produced and
green in `e2e/specs/overview-held-outage.spec.ts`' third test, with four
`unknown` figures standing in for an empty eligibility window; swap in a
movers section with two empty lists for your own case.

**Two things to carry across.** The behaviours key on **`drop()`** rather than
on a connection count, because a cold page opens more than one socket before
anything is dropped (`StrictMode`'s open/close pair) — so a count served the
poorer aggregate on the first paint and drew a plausible wrong screen. And
`feed.overviews()` is the channel that says the emptier frame was actually
sent: focus landing on `<body>` because the frame arrived and focus landing on
`<body>` for some other reason are the same reading without it.

---

## What was done — 2026-10-11

**A keyboard reader keeps a focus position through every degradation this
screen can draw — and the one state where they did not was not the one the
brief named.** The aggregate emptying was already covered, by a mechanism
Task 4.6.5 built for one row leaving a list; the **movers section going away**
was not, because that recovery lives inside the component that unmounts. The
arrow-press consequence is measured, has a second trigger nobody knew about,
and falsifies two shipped claims.

### Done-when 1 and 2, produced rather than reasoned

Driven through `serveFeed(page, { overview: RICH, overviewOnReconnect: … })` and
`feed.drop()` — the page's own retry answered with a poorer aggregate, which
since Task 4.7.3 models the **deploy** state. Every reading is
`document.activeElement`, in one string: `row:NVDA`, `section:Movers`,
`<body>`. Verbatim from the throwaway that took them, before any repair:

```text
A before drop:    row:NVDA
A held badge before: 1
A after empty:    section:Movers
A gainers li count: 5
A held badge after: 0
A connections: 3 overviews: 3

B before drop:    row:XLY
B after empty:    section:Sector performance

C after rollback: <body>
```

**So Task 4.6.5's recovery DOES cover a whole-list empty, and the answer is
`section:Movers`.** Its third arm — _the list ran out of real rows_ — fires, and
the `<section>` it lands on is the one captured at **focus** time, which is what
the brief predicted matters: in the sector case (B) the ranked `<ol>` is **gone**
rather than empty, so `closest()` at recovery time would have reached nothing.
In the movers case (A) the `<ol>` survives with five held pads and no anchor,
which is why `linksIn` returns `[]` and the section arm is reached by a second
route.

Two things fell out of B that are only visible in a DOM. The reader's own
security is **still a destination 100 px below**, in the trailing quiet group —
a sector with nothing to rank is still a security with stored bars — and focus
lands on the section rather than on it, because a roving group is a **list** and
the ranked group cannot reach into the quiet one. Asserted as the shipped
behaviour rather than repaired: landing on the reader's own ticker in a
different list would be a focus move across two accessible names with no
ordinal relationship, and the section is the honest _you are still here_.

### The state that was NOT covered, and the repair

**C is the defect**: `movers === undefined` with `overview` present. The route
draws no `Movers` at all, so the component holding `useRovingStop` unmounts with
the rows and its layout effect never runs again. It is **not only a rollback** —
`market-stream-protocol.ts`' `readOverview` says in as many words that _"an
unreadable one is the same absence rather than a discarded frame carrying four
true prices"_, so any movers section failing `readMovers`' consistency checks
reaches the route as this exact state from a healthy gateway. A tripped
`ErrorBoundary` is the same shape, and Task 4.6.5 enumerated that state with
nothing covering it.

So the catch moved to **the one element that is a tab stop in every state**,
which is the one ADR 0039 is about. `Region` remembers the element that last
held focus inside it and, on any commit where that element is disconnected while
`document.activeElement` is the body, focuses its own `<section>`. Three
properties:

- **It composes rather than replaces.** Child effects run before parents', so
  `useRovingStop`'s better landing — the row now at that rank — still wins, and
  this sees `activeElement !== body` and returns.
- **The trigger is `isConnected`, not a blur**, for `useRovingStop`'s reason:
  removing a focused element does not reliably fire `blur` or `focusout`.
- **`<body>` is not `null`.** `if (active !== null) return;` reads exactly like
  a guard against stealing focus from another region and disables the whole
  thing; that is the registered break.

### The defect written FIRST was green, and it is the fourth in this story

`CLAUDE.md`'s 2026-09-26 rule, met rather than quoted. `Region` **already
listens for `focusin` on this box**, inside the `onReaderWithin` effect — so the
obvious draft remembers the target there and saves a listener. That effect is
gated on `onReaderWithin`, **which six of the seven landing regions do not
pass**, so the recovery would exist only for the two that hold an order. All
five tests passed against it:

```text
Running 5 tests using 1 worker

  ✓  1 … › a reader on a MOVER row when the aggregate empties keeps a focus position that is not the body (3.8s)
  ✓  2 … › a reader on a ranked SECTOR row keeps one too, even though the whole ordered list detaches (3.4s)
  ✓  3 … › a reader on a mover row when the movers SECTION goes away keeps a focus position too (3.4s)
  ✓  4 … › ONE arrow press re-orders every row under the reader, while the head still says ORDER HELD (579ms)
  ✓  5 … › and the FOCUS RECOVERY is itself such a move, so a degradation re-pins with no key pressed (578ms)

  5 passed (12.4s)
```

**It passes because the only region that can reach the state today is one of the
two that do hold an order.** That substitution therefore cannot be made red and
is **not** registered as a break; the listener is unconditional with the reason
written above it, and this transcript is the record. It is the fourth first
draft in this story to be green on its own defect.

### The break, performed by hand

`scripts/breaks.mjs` gains `a-region-does-not-catch-its-dropped-focus`, whose
substitution is the `<body>`-is-not-`null` guard. `pnpm break` refuses on an
uncommitted target and this change is uncommitted, so it was performed by hand
with the registry's exact `find`/`replace` and the file checksummed either side:
**`c31e98744e6283011962a19ce862c5a8`** before, `2616f83467c066a60f2fe2aec3ae9684`
broken, **`c31e98744e6283011962a19ce862c5a8`** restored.

```text
  ✓  1 … › a reader on a MOVER row when the aggregate empties keeps a focus position that is not the body (3.9s)
  ✓  2 … › a reader on a ranked SECTOR row keeps one too, even though the whole ordered list detaches (3.5s)
  ✘  3 … › a reader on a mover row when the movers SECTION goes away keeps a focus position too (3.7s)
  ✓  4 … › ONE arrow press re-orders every row under the reader, while the head still says ORDER HELD (615ms)
  ✓  5 … › and the FOCUS RECOVERY is itself such a move, so a degradation re-pins with no key pressed (628ms)

    Expected: "section:Movers"
    Received: "<body>"

  1 failed
  4 passed (13.4s)
```

**One assertion failure with four tests still collecting and passing**, which is
the only red that proves a check works. The same substitution was run against
the two jsdom tests added to `Region.test.tsx`, which fail the same way —
`1 failed | 10 passed` — so the cheap half is held in `pnpm test` as well.

### Done-when 3: the arrow press, measured, with a trigger that needs no arrow

`Region` combines non-bubbling `pointerenter`/`pointerleave` with **bubbling**
`focusin`/`focusout`, so a focus move inside a ranked region fires `focusout`
(`setPinned(undefined)`) and then `focusin`, which pins `latest.current` afresh —
_the last frame drawn_. Measured with the five gainers' **membership held
still**, so the pin is the only thing that can move a row. A control arm (no
focus move, same re-ranking frame) is what makes the other two mean anything:

| Drive                                        | Order drawn                     | Badge        |
| -------------------------------------------- | ------------------------------- | ------------ |
| control: a re-ranking frame, nothing pressed | `SMCI FSLR NVDA AMD TSLA` (pin) | `ORDER HELD` |
| one `ArrowDown`                              | `TSLA AMD NVDA FSLR SMCI`       | `ORDER HELD` |
| no key at all, membership 5 → 1 → 5          | `TSLA AMD NVDA FSLR SMCI`       | `ORDER HELD` |

```text
G after reorder, order: SMCI,FSLR,NVDA,AMD,TSLA     (control: the hold works)
G badge: 1

E after reorder frame: SMCI,FSLR,NVDA,AMD,TSLA
E after ONE arrow:     TSLA,AMD,NVDA,FSLR,SMCI
E focus: row:AMD
E badge: 1

F recovered to:  row:SMCI
F after return:  TSLA,AMD,NVDA,FSLR,SMCI
F badge: 1
F focus: row:SMCI
```

Three findings.

**A press of `ArrowDown` moved the reader one row UP the screen.** The key
handler reads the DOM order at the moment the key goes down and lands on the row
that _was_ below; the re-pin then draws that row **above** the one they came
from. Rank 3 → `AMD`, which the new order puts at rank 2.

**There is a second trigger and it needs no reader input at all** — Task 4.6.5's
focus recovery is itself a focus move inside the region (F). So a degradation
that empties a list re-pins against the **emptied** frame, and every row moves
when the feed returns, under a reader who pressed nothing and never left. That
half did not exist when Story 4.6 decided to leave the first half standing.

**Two shipped claims are falsified**, and both now carry a dated amendment
rather than a rewrite: `use-order-hold.ts`' _"there is no state in which the
badge is on and the order is moving"_ and `MoversMeta.held`'s _"there is no
state in which the head says `ORDER HELD` over a region that is re-ordering"_.
Both are true of one value being unable to disagree with itself and neither
covers the value being **re-taken**. Grepped: two live sites, both amended;
Story 4.5's and 4.6's task records left standing as historical records.

**Recommended, not taken**: release the pin on `focusout` only when focus has
actually **left** the region — one condition in `Region`'s `blurred` handler,
off the event's own `relatedTarget`, which also makes `useOrderHold`'s _"the
first of the two sources to fire owns the pin"_ true of a move within the region
as it already is of a hover-then-tab arrival. What it costs is that a reader who
never leaves never sees a newer order, which is Task 4.5.7's judgement and the
owner's. In `docs/GAPS.md` with the costing and handed to Task 4.7.11 for Gate 2.

### Files

- `apps/frontend/src/components/Region/Region.tsx` — the backstop: one
  unconditional `focusin` listener writing a ref, one layout effect with the
  three conditions, and the reason the listener is not folded into the hold's
  effect.
- `apps/frontend/src/components/Region/Region.test.tsx` — two jsdom cases: the
  content unmounting, and _the reader had already moved on_.
- `apps/frontend/src/components/OrderHeldBadge/use-order-hold.ts`,
  `apps/frontend/src/components/Movers/Movers.tsx` — the two dated amendments.
- `e2e/specs/overview-degraded-stops.spec.ts` — new, five tests.
- `docs/adr/0039-*.md` — a dated amendment: the rejected alternative already
  ships one level down, two of its three removals were answered by Task 4.6.5
  and the third is this task's.
- `docs/GAPS.md` — one entry, with a `Re-measure:` naming the two spec arms.
- `scripts/breaks.mjs` — one entry.
- `planning/…/TASK-09`, `TASK-11` — the sideways hand-offs.

### What this does NOT establish

A listener hears a focus move from the platform, so nothing here is new to the
standing screen-reader item — but **whether landing on a region's `<section>` is
intelligible** is a listener's. Its name is announced and the thing the reader
was reading is not; an entry was not added, because the existing item already
covers _whether a region stop is announced usefully_ (ADR 0039's own _what a
green run does not certify_).

And no gated machine can reach any of this with a real gateway: CI's store is
518 securities and zero bars, so the frame there carries `eligible: 0` and two
empty lists for ever, which is why every byte is served from the spec.

## Done when — verdict

1. **Met for the aggregate emptying by shipped code** (`section:Movers`,
   `section:Sector performance`), and **met by repair for the state next door** —
   the movers section going away, which was `<body>` and is reachable from a
   healthy gateway.
2. **Answered by driving it: yes.** Task 4.6.5's recovery covers a whole-list
   empty through its _no real rows remain_ arm, and the `<section>` captured at
   focus time is what makes the sector case work at all. It does **not** cover
   the component unmounting, which is why the backstop is in `Region`.
3. **Measured, with a control arm and a second trigger**, and recommended
   rather than repaired. In `docs/GAPS.md` and in Gate 2's list.
4. See the gate output below.

### Gates

**`pnpm verify` — `EXIT=0`, and the `Unhandled Errors` grep returns zero.**

```text
All matched files use Prettier code style!
42 components, 42 stories files.
16 backend variables documented, frontend example clean.
527 documents, 1719 cross-file links, 39 anchor links, 0 broken.
52 invariants hold.
packages/shared test:  Test Files  22 passed (22)
packages/shared test:       Tests  440 passed (440)
apps/backend test:  Test Files  50 passed (50)
apps/backend test:       Tests  1031 passed (1031)
apps/frontend test:  Test Files  86 passed (86)
apps/frontend test:       Tests  1398 passed (1398)
apps/backend test:process:  Test Files  2 passed (2)
apps/backend test:process:       Tests  49 passed (49)
```

**The overview keyboard specs — all eighteen `overview-*` files, one run:
`75 passed, 1 skipped (1.6m)`.** That includes
`overview-nothing-to-open.spec.ts`' three focus cases, `overview-ranked-
keyboard.spec.ts`, `overview-region-order.spec.ts`'
`expectEveryRegionIsATabStop` at 768 and 390, and the five new ones.

**This task's own spec at `--repeat-each=6`: `30 passed (30.8s)`**, taken at a
load average of 25 across 8 cores — so it is not a figure that needs a quiet
machine to hold.

### What the full `pnpm e2e` did, and the control that settles it

**It is not green on this machine and it is not this change**, established by
the control `CLAUDE.md` prescribes rather than by argument. Four full runs:

| Run                                  | Load at start | Result                          |
| ------------------------------------ | ------------- | ------------------------------- |
| with the repair                      | 27.99         | 5 failed, 237 passed            |
| with the repair                      | 10.13         | 5 failed (a **different** five) |
| **control — `Region.tsx` at `HEAD`** | 2.98          | 3 failed, 239 passed            |
| with the repair, healthy pair        | 4.37          | 11 failed, 231 passed           |

**The control's three are the finding.** One is
`overview-degraded-stops.spec.ts:353` — this task's own check, red because the
repair is absent, which is the guard working. **The other two —
`overview-source-note.spec.ts:250` and `securities-route.spec.ts:107` — failed
with no code of this task in the tree**, and neither had failed in either run
that did have it. Four runs, four different failing sets, same tree.

Two causes were found rather than inferred. **The backend had died** between
runs — `node --watch dist/index.js` alive with no child, so the loop was waiting
for an emit — which is why one run refused to start at all and is the likeliest
reason `renders from the real pair` and nine `element(s) not found` timeouts
appear and disappear. And the suite **drives the load itself**: four Chromium
workers take an 8-core machine from 3 to 28, so a run is its own contention.
Every failing spec was re-run scoped at a load under 4 and passed —
`securities-route`, `security-explorer-shell`, `security-holiday-week`,
`security-navigation`: `38 passed (46.2s)`.

**One of them is worth a sibling's attention and is not contention.**
`overview-nothing-to-open.spec.ts:545` — _the UN-PINNABLE hold state is reached
by keyboard_ — failed **1 of 48** at `--repeat-each=6`, with the ranked list
read as empty one line after `send()`:

```text
    - Expected  - 11
    + Received  +  1
    - Array [ "XLK", "XLC", "XLY", … ]
    + Array []
```

`expect(await tickersIn(ranked)).toEqual([…])` is a plain `expect` over an
`evaluateAll`, so it does **not** retry: it races the frame being applied. It is
structurally outside this change — that test Tabs to the **section** before any
frame arrives, and `Region` stores `null` for its own box, so the backstop
cannot run in it — and the repair is `expect.poll` or an `await expect(…)
.toHaveAttribute` on the first row. Not taken here because it is Task 4.6.5's
spec and a one-line timing change to somebody else's assertion is exactly the
sort of edit that should be made by whoever next reads it.
