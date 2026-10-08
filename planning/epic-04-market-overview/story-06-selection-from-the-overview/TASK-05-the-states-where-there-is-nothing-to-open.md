# Task 4.6.5 — The states where there is nothing to open

**Status:** Not started
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
