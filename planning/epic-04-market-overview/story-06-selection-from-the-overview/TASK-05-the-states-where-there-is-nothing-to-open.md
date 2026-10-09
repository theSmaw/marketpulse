# Task 4.6.5 — The states where there is nothing to open

**Status:** **Complete — 2026-10-09.** The two shipped non-symbols are refused by one producer-side fact, and the slug half needed **two** repairs rather than the one the brief names — `RankedList`'s quiet group was hard-coding `held={undefined}`, so the producer's answer was thrown away one file downstream. The one-query rule is a browser query rather than a grep, with the transcript of it catching a stranger's file. The composition defect is repaired and produced in Chromium. One finding handed on: **the un-pinnable window closes the moment focus MOVES inside the region**, because `focusin`/`focusout` bubble.
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.4

## Objective

**The two traps that would ship on the first naive implementation, and the
composition defects nobody designed.**

## What the user can see when this lands

**Honest behaviour in every state** — including the one CI is permanently in.

## Work

### Two shipped non-symbols that a naive `securityPath(row.symbol)` turns into live links

- **`sector-performance.ts:444` — `symbol: sector`.** The eleven reserved rows
  carry the **slug**, so a naive call builds **`/securities/technology` ×11**,
  on **every first paint**.
- **`movers.ts:487` — `symbol: NBSP.repeat(slot + 1)`.** The held pads carry
  non-breaking spaces, so a naive call builds **`/securities/%C2%A0` ×10** —
  in **CI's permanent state, most of a weekend, and the first minute of every
  session.**

`moverSymbols`' own comment already scopes itself _"to drawn rows, so the held
pads' non-breaking spaces can never reach"_ the wire. **The link owes the same
test.**

### The one rule the whole thing reduces to, and it is one query

> Every `<a>` on `/` whose href matches `/securities/` has, as its accessible
> name, exactly a ticker that
> `moverSymbols(overview) ∪ overview.figures ∪ overview.sectors` contains.

That clause refuses the slugs and the pads **by construction**, refuses a label
link, refuses a figure link, and goes red the day somebody links a pad.

### The composition defect: a focused row can vanish under the hold

**Two individually correct decisions compose into a dropped focus.** The hold
pins **order**; Task 4.5.7 deliberately let **membership** move beneath it. So
at 0.21–0.44 membership changes a minute the `<li>` unmounts, **focus drops to
`<body>`, and the reader's next Tab restarts at the top of the document.**

**Recommended, and it discharges three states with one mechanism:** when the
element holding the roving stop unmounts, **move focus to the row now at that
rank in the same list**; if no real rows remain, to the region's section. Focus
is never lost; no false membership claim is made; the arrows keep working from
where the reader was looking. **Focus moving is acceptable; activating is
not** — 4.6.4 made that unrepresentable.

Rejected: **pinning membership while focus is inside** (fires 4.5.7's recorded
trigger, and means the region can name a security that is no longer a mover
while its figure updates — ADR 0029 refuses it because the licence expires when
the producer stops selecting it); and **leaving focus on `<body>`**, which is
what shipping nothing does.

### A keyboard reader can enter the un-pinnable hold state

`use-order-hold.ts` documents it as _a pointer resting over the region before
the first frame_. **Tabbing in during the same window has the identical
outcome** — `latest.current` is still empty, `pinned` stays `undefined`, there
is no hold — and nothing said so. The list then does re-order, and **focus
follows the security for free** because React keys the `<li>` on `symbol`. That
is exactly what the symbol-keyed roving index is protecting: it must **agree**
with where focus actually went.

### The states, each with what is focusable and what is announced

First paint; a refused section; both mover lists empty (**CI's permanent
state** — ten pads, two `<ol>`s reporting **0 items**, not 5); a one-sided
market; the sector quiet group appearing and disappearing; an `unknown` proxy
figure; the universe unreachable (names empty — **the link is unaffected**,
because the accessible name is the ticker); a tripped `ErrorBoundary` (**the
section keeps its name, its landmark and its stop; the roving stops vanish with
the content**); and the feed stale or disconnected (**nothing becomes
non-activatable because a feed stopped** — a stale figure does not make a
security unopenable).

**`Enter` on a region section must do nothing.** No "activate the first row"
shortcut — an undiscoverable navigation from a container.

### Boundaries

Not the journey spec or the grid (4.6.7). Not ADR 0039 (4.6.6).

## Done when

1. Zero `<a>` in the reserved, refused, empty and first-paint states —
   asserted, including the slug rows and the NBSP pads by name
2. The one-query rule is a `pnpm invariants` clause or a browser assertion,
   with a break
3. A focused row whose security leaves the list does not drop focus to `<body>`
   — produced in a browser, not reasoned about
4. The un-pinnable hold state is reached by **keyboard** and the symbol-keyed
   stop agrees with where focus went
5. `pnpm verify` and `pnpm e2e` green

---

## What was done — 2026-10-09

**Nothing on `/` is a destination unless the frame named it**, in every state
the page has: the first paint, a refused section, both mover lists empty, a
one-sided market, the quiet group appearing and disappearing, and the furnished
page. And **a reader whose row is taken out from under them keeps their focus.**

### The slug half was TWO sites, not one, and the second was downstream

The brief names `sector-performance.ts:444` — `symbol: sector` — and the line
number is right. The repair is **producer-side rather than a new prop on
`RankedList`**: every row of `RESERVED_SECTORS` is now `held: true`, which is
the predicate `withHeldRows`' pads already use and which Task 4.6.4 made the
one answer to _is this row a place a reader can go_. One concept, two
producers, and `RankedList` learns nothing new.

**It did not work, and the reason is the finding.** `RESERVED_SECTORS`' rows
all have `rank: undefined`, so all eleven are drawn in the **trailing quiet
group** — and that group passed `held={undefined}` as a hard-coded constant,
with a comment that was _correct reasoning about a wrong constant_:

```
/* A quiet row is a row we are refusing to rank, which is the
   opposite of a row that is not there. */
held={undefined}
```

Which was true of every quiet row that existed when it was written, and false
the moment a producer one file away needed a reservation. The row knows; the
list now asks it. Both sites have their own break, because either one alone
resurrects the eleven hrefs with the other file unchanged.

**The pad half was already discharged by Task 4.6.4** — a pad is handed no
link at all rather than an inert one — and this task asserts it rather than
building it: `/securities/%C2%A0` and `/securities/\u00a0` are both absent from
the markup of the two-empty-lists state.

### The one query is a browser query, and the transcript is of it catching a stranger

`pnpm invariants` is a grep over source and cannot evaluate an accessible name,
so the rule is `overview-nothing-to-open.spec.ts`:

> Every `<a>` on `/` whose href matches `/securities/` has, as its accessible
> name, exactly a ticker that `movers ∪ figures ∪ sectors` contains.

**That shape has no corpus to be wrong about**, which is the direct answer to
4.6.4's expensive lesson: its first invariant was green on
`components/UnusualActivity/` because the clause was four directory names and a
new region is a new directory. A query over the rendered page cannot miss the
next author's file, because the next author's region is on the page.

**Written as the file somebody else writes**, per `CLAUDE.md`: a
`<Link to={securityPath("advancing")}>Advancing</Link>` in
`BreadthLedger.tsx` — a fifth surface on the same screen, in neither ranked
directory. It went red, and the **first** run's diagnostic is why the test was
then re-ordered:

```
  Expected length: 22
  Received length: 23
```

True, and it says nothing about which link or why. The per-link clause now runs
**before** the count:

```
  Error: /securities/advancing is named "Advancing", which the frame never sent
```

`BreadthLedger.tsx` restored byte-identical (`git diff` empty).

### The composition defect, and the three states one mechanism discharges

Implemented as the brief recommends. `useRovingStop` remembers the anchor that
last held focus in the list; on every commit, if that element is **no longer
connected** and `document.activeElement` is `<body>`, focus moves to the link
now at the departed row's **rank** in the same list — or, if no real row
remains, to the region's own `<section>`, which `Region` makes focusable
because it scrolls.

Three decisions inside it that are not obvious:

- **The trigger is `isConnected`, not a blur.** Removing a focused element does
  not reliably fire `blur` or `focusout`, so a `within` boolean kept by those
  two events is a guess about something the DOM can be asked directly.
- **`document.activeElement === document.body` is the whole of the third
  condition**, and getting it wrong is invisible: `<body>` is not `null`, so
  `if (active !== null) return;` reads exactly like a guard and disables the
  recovery entirely. That is the shape `a-dropped-row-drops-the-focus` breaks.
- **The `<section>` is captured at focus time, not found at recovery time.**
  Found by the no-rows-remain test: `RankedList` draws **no `<ol>` at all**
  when nothing is ranked, so at the moment the last real row leaves, the list
  element is already detached and `closest()` on a detached node reaches
  nothing. It read as the recovery not firing.

### How done-when 3 and 4 were produced in a browser, given the hold

**Done-when 3 needed no trick, and that is the point.** Task 4.6.4's own
re-order case had to **blur first**, because `ORDER HELD` is scoped through
`:focus-within` and a reader with their hands in the list has a still list.
This case is the opposite: the hold pins **order** and Story 4.5.7 deliberately
left **membership** moving under it, so the `<li>` unmounts with the reader's
hands still on it and no blur is needed. The spec focuses `NVDA` at rank 3 of
five gainers and sends a frame without it; `META` is a newcomer that outranks
`AMD`, so `rowsInPinnedOrder` draws it **where `NVDA` was** rather than at the
bottom of the pinned block — and focus lands on it. Verbatim, with the
recovery disabled:

```
  Expected: "META"
  Received: "<body>"
```

**Done-when 4 was produced by Tab and is reported with a limit.** The spec
presses `Tab` (bounded at 40) until the `Sector performance` section is
`document.activeElement` **before any overview frame has been sent**, then
sends two frames. The list re-orders — `XLE` to the top — and `Order held`
never appears, which is `use-order-hold.ts`' un-pinnable state reached by
keyboard rather than by a resting pointer. The stop is then on `XLE`, and one
`Tab` puts focus on `XLE`: derived and actual agree.

**What this found and did not repair: the un-pinnable window closes the moment
focus MOVES inside the region.** `Region` listens for `focusin`/`focusout` on
its own box and **both bubble**, so moving focus from the section to a row
inside it fires `focusout` (`report(false)`) and then `focusin`
(`report(true)`) — a second `onReaderWithin(true)`, by which time
`latest.current` is populated, so it pins. So a keyboard reader **cannot reach
a row while un-pinnable**: the state is entered at the section and ends at the
first press that leaves it. That is why done-when 4's agreement is asserted at
the section-then-Tab boundary rather than under a row. Two consequences worth
someone's attention, neither in this task's scope:

- Every arrow press inside a ranked region **releases and re-takes the pin**
  (`setPinned(undefined)` then `setPinned(latest.current)`), so the pinned
  order is refreshed to whatever the last frame drew. It is invisible today
  because the two orders agree within a frame, and it is a real re-order under
  a reader's hands when they do not.
- `useOrderHold`'s _"the first of the two sources to fire owns the pin"_ holds
  for a hover-then-tab arrival and **not** for a move within the region, which
  releases first.

Raised for the owner rather than fixed: it changes shipped hold behaviour, and
Story 4.5.7 settled that with measurements.

### Also asserted, because the brief names them

`Enter` on a region's `<section>` does nothing — the URL stays `/` and focus
stays on the section. There is no _activate the first row_ shortcut and none
was added. The **refused** state offers the four proxy links and nothing from
either ranked region. The universe-unreachable state is unaffected by
construction, because the accessible name is the ticker and never the company
name.

### Files

- `apps/frontend/src/market/sector-performance.ts` — `RESERVED_SECTORS` rows
  are `held: true`; the header gains the section saying why; `SectorRow.held`'s
  _"the eleven sector rows, which can never be held"_ clause carries a dated
  amendment, because this task falsified it.
- `apps/frontend/src/components/RankedList/RankedList.tsx` — the quiet group
  passes `held={row.held}`; `useRovingStop` gains the focus recovery and its
  three refs.
- `apps/frontend/src/components/RankedList/RankedList.test.tsx` — the three
  recovery cases at the component level (the rank, the section, and _the reader
  had already moved on_), and the old _falls back to the first real row_ case
  rewritten to the state it is actually about: **nobody was in the list**.
- `apps/frontend/src/components/SectorPerformance/SectorPerformance.test.tsx` —
  the reservation holds no `<a>`, with three slugs named.
- `e2e/specs/overview-nothing-to-open.spec.ts` — new, eight tests.
- `scripts/breaks.mjs` — three entries.

### Gates

- `pnpm verify` — see the report; `49 invariants hold.`, `42 components, 42
stories files.`, `502 documents, 1684 cross-file links, 39 anchor links, 0
broken.`, frontend `86 passed (86) / 1392 passed (1392)`, backend
  `50 / 1025`, shared `22 / 437`. No `Unhandled Errors` block anywhere in the
  run.
- `pnpm e2e` — see the report.
- `pnpm break the-reservation-links-its-slugs`,
  `pnpm break the-quiet-group-forgets-a-held-row`,
  `pnpm break a-dropped-row-drops-the-focus` — all three red and restored
  byte-identical.

### What is owed

- **ADR 0039 (Task 4.6.6)** should carry the one-query rule as the thing that
  makes _the figure is never the link_ checkable, and the reason it is a
  browser query rather than an invariant: **a corpus-free check cannot be green
  on the next author's file.** It should also carry `held` having become the
  one predicate for _is this a destination_, which is now read at two producers
  and one renderer.
- **Task 4.6.7** inherits the un-pinnable/re-pin finding above and the
  observation that `Region`'s two bubbling events make _a reader is within this
  region_ a property that flickers on every internal focus move.
- Nothing is owed to the screen-reader standing item that was not already on
  it: a recovered focus is a focus move, which a listener hears from the
  platform.
