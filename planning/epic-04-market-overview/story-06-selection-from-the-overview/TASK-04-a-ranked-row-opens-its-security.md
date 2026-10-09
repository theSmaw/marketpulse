# Task 4.6.4 — A ranked row opens its security

**Status:** **Complete — 2026-10-09.** Twenty rows on `/` are destinations, with four roving groups over two regions. Two departures from the contract, both reported: four arrow keys rather than five, and a pad that is handed **no link at all** rather than an inert one. The no-imperative-navigation check's first version — the four directories the brief names — was **green on the file Epic 5 writes**, and the repair is the corpus.
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.3

## Objective

**Twenty-odd more destinations, and the keyboard model for a list that moves.**

## What the user can see when this lands

**Every sector row and every mover row opens its security**, by pointer and by
keyboard. The sector row's ticker opens its **benchmark ETF** — the owner's
Gate 1 decision.

## Work

### The sector region has TWO lists too, and nobody had said so

`RankedList` renders the ranked `<ol>` **and**, when
`quietGroup === "possible"`, a trailing `<ul aria-labelledby={quietHeadingId}>`
under `Not ranked`. **Sectors passes `"possible"`; movers passes
`"impossible"`.** A quiet sector row is still a security with stored bars —
`UNIVERSE.md` §12.2's rule arriving at navigation — so **the quiet rows are
destinations and the sector region is two roving groups exactly as Movers is.**

**So the two-lists-in-one-region mechanism is not a Movers special case; it is
the mechanism at both regions, and one implementation serves both.** The
difference is that the sector region's second group **appears and disappears
with the data**, which is 4.6.5's.

### The shared contract

- The focusable element is the row's **ticker link**, not the `<li>` and not
  the row — `UniverseTable`'s precedent, and the ring geometry (4.6.2 §03).
- **A roving group's members are the real rows only**: `row.held !== true`. A
  pad is `visibility: hidden` + `aria-hidden`, so it is inert for free in CSS,
  **but it must never hold `tabIndex=0`, never be reachable by an arrow and
  never be `End`'s target.**
- **Roving state is `symbol | undefined`, never an index**, derived at render.
  A held index is a second, disagreeing copy of where focus actually is.
- **Arrows move ±1 and clamp; they do not wrap.** This departs from
  `TimeWindowControl` deliberately: that control wraps because _"the set is a
  ring"_, and **a ranking is not a ring** — `#11 → ArrowDown → #1` reads as a
  jump in a structure whose entire meaning is ordinal.
- **Arrows do not cross between the two lists.** Crossing takes a listener from
  `item 5 of 5` to `item 1 of 5` under one key with no spoken boundary.
  `Home`/`End` scope to the list focus is in.
- `Enter` activates — the anchor's own default. **`Space` must not**: an
  `<a href>` does not activate on Space, and a reader inside a `Panel` with
  `overflow: auto` is relying on Space to scroll.
- **`preventDefault()` only after one of the five keys matched.** The arrows
  scroll a page and `Home` jumps it, and these rows are inside a scrollport.
- **Every other key, `Tab` included, is the browser's.** A handler swallowing
  `Tab` traps the group.

### The activation race is unrepresentable, not managed

With `<Link to={securityPath(symbol)}>` the destination is resolved **at
render, from the row's own identity**. There is no handler, no index, no lookup
at activation time, **so no frame can land between the keydown and the
resolution.** The 4.3 hand-off's clause 3 — _every number on screen is right
throughout_ — is a defect this task **cannot express**, as long as it stays a
link.

**Everything that reintroduces it is a handler**, so the guard is a clause the
re-implementer cannot avoid writing: **no `useNavigate`, no `navigate(`, no
`location.assign`, no `location.href`** under `RankedList/`, `Movers/`,
`SectorPerformance/` and `MarketProxyStrip/`. With a break written as **the
file the next story would write** — a `<button onClick={() => navigate(…)}>` —
not as an edit to the file the check was drafted against.

### The treatment

Ground on `.row:hover, .row:focus-within` (`--surface-sunken`, **1.10:1** — a
**locator**, never the only encoding); underline on the **symbol span only**,
never the link box, because the box contains the 8 px mark slot and an
underline would run under the arrival disc. `text-decoration` is painted, never
laid out, **so nothing moves** — which is why it is an underline and not a
border, an inset or a weight change. **No `:active` treatment** — a 26 px row
dropping 1 px on press is a layout shift on a screen built around not having
one. **`:visited` explicitly unstyled** — a security you have opened is not a
different fact about the market.

### Boundaries

Not the empty and degraded states (4.6.5). Not ADR 0039 or the tab-stop spine
(4.6.6). Do not pin membership under the hold — that fires Story 4.5.7's
recorded trigger and is 4.6.5's to decide if it decides it at all.

## Done when

1. Both ranked regions carry ticker links; the sector quiet group's rows are
   destinations too
2. Two roving groups per region, keyed on **symbol**, with no crossing, scoped
   `Home`/`End`, no wrap, and `Space` left to the browser — asserted in a
   browser with a **driven re-order**, not reasoned about
3. A pad holds no stop and is unreachable by arrow, asserted on a padded list
4. The no-imperative-navigation invariant exists with its break and its
   passing-wrongly transcript
5. `pnpm verify` and `pnpm e2e` green

---

## What was done — 2026-10-09

**Twenty rows on `/` are destinations**, by pointer and by keyboard: nine to
eleven sector rows, the sector region's trailing `Not ranked` rows, and up to
ten mover rows. The target is the **ticker cell** on every one of them, built
by `securityPath()` at render.

### The keyboard model as it shipped

One `useRovingStop` per **list**, and a list is the group — so the sector
region has two (the ranked `<ol>` and the quiet `<ul>`) exactly as `Movers`
has two (gainers and losers). The page carries **four** roving groups and the
tab-stop count is unchanged: six region stops, plus one stop per group that is
only reachable from inside the region it is in.

| Clause                    | As shipped                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| state                     | `symbol \| undefined`, written from the list's own `focus` event; `tabIndex` derived at render, falling back to the first real row when the remembered symbol is no longer a member |
| members                   | `row.held !== true`, and a pad is handed **no destination at all** rather than an inert one                                                                                         |
| arrows                    | `ArrowDown` / `ArrowUp`, ±1, **clamped**                                                                                                                                            |
| `Home` / `End`            | first / last of the list focus is in                                                                                                                                                |
| crossing                  | structurally impossible — the handler is on the list element and reads `event.currentTarget`                                                                                        |
| `Enter`                   | the anchor's own default; nothing is added to it                                                                                                                                    |
| `Space`, `Tab`, every key | the browser's; `preventDefault()` runs only after one of the four keys matched                                                                                                      |

**Two departures from the contract as written, both reported rather than taken
quietly.**

1. **Four keys, not five.** The contract says `preventDefault()` only after one
   of _the five keys_ matched. `ArrowLeft` and `ArrowRight` are **not bound**:
   this is a vertical list at every width, and the horizontal arrows are how a
   reader scrolls a panel that declares `overflow: auto`. `TimeWindowControl`
   binds all four arrows because it is a horizontal control. If the fifth key
   was meant to be `Enter`, it is unbound for the reason the contract itself
   gives — it is the anchor's own default.
2. **A pad is handed no link**, where the contract describes one that is inert
   in CSS (_"a pad is `visibility: hidden` + `aria-hidden`, so it is inert for
   free"_). Three of the contract's own requirements — no stop, no arrow, not
   `End`'s target — then hold by **absence** rather than by three CSS
   properties a later edit could change, and `/securities/%C2%A0` is never in
   the markup. This takes half of Task 4.6.5's done-when 1 early; the **other**
   half, the eleven `/securities/<sector-slug>` the reserved rows build, is
   **still there and still 4.6.5's** — see _What is owed_ below.

### The hold is why a driven re-order needs focus to LEAVE first

The browser spec's fifth case failed on the first run with the list refusing to
move, and the cause is the shipped treatment rather than the test: `ORDER HELD`
is scoped to the region through `:focus-within`, so **a reader with their hands
in the list already has a still list**. The window the symbol keying exists for
is therefore exactly the one the story's hand-off named — _focus can leave and
return, and `tabIndex` survives the gap_ — and the spec now produces it: focus
the rank-1 row, blur, send a frame in which the last row becomes the first,
assert the stop is still on the security the reader left and that one press
down from it is the row below it **in the new order**.

### The treatment, and what was looked at

`.tickerLink` is `color: inherit` + `text-decoration: none`; the underline is on
`.symbol` under one `:hover, :focus-visible` rule, never on the link box,
because the box is the ticker cell and contains the 8 px mark slot. The ground
is `--surface-sunken` on `.row:hover, .row:focus-within`. No `:active`. No
`:visited` rule — `color: inherit` covers every link state in one declaration,
which is the mechanism rather than a comment.

**Measured with `pnpm probe / --within "Sector performance"` at 1440**, against
the drawing's §03 arithmetic:

```
  row                    992×27  @41,637
  ticker.tickerLink       52×18  @224,641
  markSlot                  8×8  @258,646
```

`18 + 2 × (2 + 2) = 26` against a **27 px pitch**, as drawn. The link box is
`52×18` — the ticker **cell**, not the glyphs — and the row is 27 px with its
own hairline outside the ring.

**Photographed hovered and focused** on the running pair (a throwaway
Playwright script, deleted): the ground reads as a locator and nothing else, the
underline sits under the symbol only, the ring is one crisp box inside the row,
and no bar, figure or ordinal moves between the two pictures.

### The invariant, and the transcript of its first version passing wrongly

`one-home-for-imperative-navigation` — _one file in the frontend may move the
address in a handler, and it is a route._ Everything else reaches a security
through a `<Link to={securityPath(symbol)}>` resolved at render.

**The first version was the one the brief describes** — the four tokens
(`useNavigate`, `navigate(`, `location.assign`, `location.href`) over the four
directories `RankedList/`, `Movers/`, `SectorPerformance/`,
`MarketProxyStrip/`. The defect was then written as **the file the next story
writes** rather than as an edit to a file the check was drafted against:
`apps/frontend/src/components/UnusualActivity/UnusualActivity.tsx`, Epic 5's
region on this same screen, with a `<button onClick={() => navigate(…)}>`.
Verbatim:

```
$ grep -n "useNavigate\|navigate(" apps/frontend/src/components/UnusualActivity/UnusualActivity.tsx
1:import { useNavigate } from "react-router";
15:  const navigate = useNavigate();
24:              void navigate(securityPath(rows[index]?.symbol ?? row.symbol));
$ node scripts/check-invariants.mjs
49 invariants hold.
exit 0
```

**Green, on the exact defect it forbids** — the fifth time this repository has
recorded a corpus that is a hard-coded list, and the reason it keeps happening
is that **a new region is a new directory by this repository's own
convention**, so the next author's file is outside any list written today.

The repair is the corpus: `shippedSourceFiles()`, the whole three trees, with
**one named allowance** — `routes/SecurityExplorer.tsx`, whose two
`navigate()` calls commit a reader's own submitted answer rather than resolving
a row's identity from a position. With the same file still on disk:

```
  ✗ one-home-for-imperative-navigation
    Imperative navigation in a surface that draws rows:
      apps/frontend/src/components/UnusualActivity/UnusualActivity.tsx — `useNavigate`
      apps/frontend/src/components/UnusualActivity/UnusualActivity.tsx — `navigate(`
1 of 49 invariants failed.
exit 1
```

Deleted, and `49 invariants hold.` again.

**Three anchors, because a ban passes vacuously.** `RankedList.tsx` must still
build a destination with `securityPath()` — a ban on the imperative
alternative over a screen with no links on it refuses nothing — and the
allowance must still be using what it is allowed, or it is a stale exemption
the next author inherits without arguing for it.

**The break is on a fifth surface, deliberately.** `a-row-handler-moves-the-address`
puts a `globalThis.location.href = …` handler in `BreadthLedger.tsx`, which is
in none of the four directories — so the break proves the clause that was
missing rather than the one that was always there:

```
$ pnpm break a-row-handler-moves-the-address
✓ apps/frontend/src/components/BreadthLedger/BreadthLedger.tsx broken → red → restored byte-identical.
  matched: `location.href`
```

### What is owed, and to whom

- **The eleven `/securities/<sector-slug>` hrefs in the reserved state are
  still there.** `SectorPerformanceReservation` draws `RESERVED_SECTORS`, whose
  `symbol` is the sector slug, inside a subtree that is `visibility: hidden`
  **and** `aria-hidden` — so they are not focusable, not hit-tested, not in the
  accessibility tree and not reachable by any key press, and the only exposure
  is eleven wrong hrefs in the markup of the first paint. Repairing it needs
  either a new prop on `RankedList` or a producer-side fact about what a
  destination is, and **Task 4.6.5 owns it by name** in its done-when 1. It is
  recorded here so the next reader does not have to rediscover that it was seen
  and left.
- **Focus when the row holding it leaves the list** is 4.6.5's, untouched here.
  What this task guarantees is only that the **stop** survives: the derivation
  falls back to the first real row, asserted in jsdom.
- **The screen-reader item is unchanged and nothing was added to it**: a link is
  announced as a link and the arrows move focus, which a listener hears from
  the platform. What a listener makes of `list, 9 items, item 2` over two lists
  in one region was already on the standing item from Story 4.5.

### Gates

- `pnpm verify` — **exit 0**. `49 invariants hold.`, `42 components, 42 stories
files.`, `502 documents, 1684 cross-file links, 39 anchor links, 0 broken.`,
  frontend `86 passed (86) / 1383 passed (1383)`, backend `50 / 1025`, shared
  `22 / 437`, `test:process` `2 / 41`. No `Unhandled Errors` block.
- `pnpm e2e` — the whole suite, **`15 skipped`, `220 passed (5.7m)`**, exit 0.
  The six new cases in `overview-ranked-keyboard.spec.ts` are 1.1–1.6 s each and
  were re-run after the last edit.
- `pnpm break a-row-handler-moves-the-address` — red, restored byte-identical.

### One figure the drawing predicted and this measured

`Selection from the overview.dc.html` §04 records the 390 cost as **`64 of
308 px — 21% of the row`**, flagged as the accepted cost of a ticker-sized
target. Measured on the shipped component with `pnpm probe / --within Movers
--widths 390`:

```
  plot.movers           308×134  @41,1576  grid 15 64 137 68
  row                    308×27  @41,1576
  ticker.tickerLink       64×18  @64,1580
```

**64 of 308, to the pixel**, and the row is 27 px — so the 2.5.8-by-spacing
argument holds at the narrowest width, which is the one where it is closest.

## For a stakeholder — a status report, 2026-10-09

**What this was.** Making every ranked row on the landing page open its
security — about twenty of them across `Sector performance` and `Movers` — by
pointer and by keyboard.

**What a person can now do.** Point at a row and the row lights; press the
ticker and the Security Explorer opens on it. By keyboard, tab into a region
and the arrow keys walk the rows one at a time; `Enter` opens. The arrows stop
at the ends rather than looping, and they never jump from one list to the
other, because a ranking is a sequence rather than a ring and the two lists are
two answers.

**The thing that cost the most thought.** These lists re-order under live data.
If the keyboard remembered _the third row_ rather than _the security_, a reader
who looked away for a minute would come back to a different company under their
cursor — and the version that gets that wrong passes every test in the
repository. It is remembered by security, and a browser test drives a real
re-order to prove it.

**What was found that nobody predicted.** The guard written to stop a future
author re-introducing the one dangerous shortcut was **green on exactly the
defect it exists to refuse**, because it looked only in the four folders that
exist today and the next such screen will be a new folder. It now looks
everywhere, with one named exception. That is the fifth time this repository
has recorded the same shape of mistake, and the first time it was caught by
writing the next author's file before shipping the check.
