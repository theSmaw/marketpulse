# Task 2.11.4 — Search on screen: the combobox, and opening a security

**Status:** Complete — 2026-09-11
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.2, 2.11.3

## Objective

Put the field, the matcher and a result list together into the product's first
interactive control, in the place Task 2.11.1 decided it lives, and make
selecting a result **open that security**.

This is the story's payoff and the epic's exit criterion in one sentence
somebody can demonstrate: **type NVDA, open it.** Everything shipped so far is a
page that loads, states something true and sits still.

## What the user can see when this lands

**Search working.** Typing `nvda`, `NVDA` or `nvid` produces matching securities
— symbol, name, sector and the equity/ETF distinction — and choosing one opens
that security's page at its own address, which can be bookmarked and shared.

**The first thing in this product that moves in response to a person.** Results
appearing is squarely inside the motion vocabulary that already exists — 240ms
for content arriving, one asymmetric easing, `prefers-reduced-motion` answered
once at the token layer. The constraint that outranks it: **motion must never
make a number harder to read.**

What a user still cannot do afterwards: see a chart. That is Stories 2.12 and
2.13.

## Work

- **The matcher is built and this is its shipped API — added 2026-09-11 by Task
  2.11.2.** Import it from `market/index.ts`; nothing here re-implements a rule
  it already holds.

  ```ts
  matchSecurities(universe, query, limit = SECURITY_MATCH_LIMIT)
    => { matches: readonly { security: Security; tier: MatchTier }[]; total: number }
  ```

  Four consequences this task inherits rather than decides:
  - **`SECURITY_MATCH_LIMIT` is ten**, and it is exported. Do not spell a second
    cap here — the surface's footer and the spoken sentence both read the `total`
    that travels with the slice, which is what stops either from lying.
  - **An empty or whitespace-only query matches nothing**, deliberately, so the
    resting state's surface cannot be "whatever the matcher returns". Whatever
    that state shows comes from somewhere else or it shows nothing; 2.11.6 owns
    producing it either way.
  - **`tier` says which field matched** — `symbol-exact`, `symbol-prefix`,
    `name-prefix`, `name-word-prefix` — which is what a row needs before it
    decides where to put any emphasis. See the highlighting bullet below.
  - **The order is total** (tier, then status, then symbol), so the top match is
    deterministic and "NVDA first" in §4's sentence is a fact rather than a
    coincidence of array order.

- **The combobox, built to the pattern rather than to a resemblance of it.**
  `role="combobox"` on the input, a listbox of options, `aria-expanded`,
  `aria-controls`, and active-descendant rather than moving DOM focus into the
  list. The keyboard set is 2.11.9's to walk and prove end-to-end, but it is
  implemented here: Down and Up move the active option, Enter opens it, Escape
  closes the list without losing the query, and a second Escape clears.

  **Enter with exactly one match must open it** — acceptance criterion 1 — and
  Enter with zero matches must do nothing rather than navigate somewhere
  plausible.

- **The result row: four facts without becoming a second table.** Symbol, name,
  sector, and the equity/ETF distinction — that last one matters to a person
  rather than to the schema, because it is why SPY behaves differently from
  NVDA, so it has to read at a glance. Whether `Badge` is the vehicle and whether
  a row carries a price were settled by the design deliverable in Task 2.11.1;
  implement that, and if a price is carried it carries its session date or a
  qualifier, because the last close is the last session we hold a bar for and is
  behind the calendar during a live session.

  **Amended 2026-09-11 by Task 2.11.1: it is five facts, not four, and the fifth
  brings work this task did not previously own.** The user settled it — the row
  carries **a close and its change** — so:
  - **The close comes from a join this task has to write.** `lastCloses` is a
    **separate array** in the `GET /securities` body, one entry per security with
    `symbol`, `session`, `close` and `previousClose`. The universe array carries no
    price at all, so a result row is a join by symbol rather than a field read.
    Measured 2026-09-11: 518 of 518 securities have an entry, and every entry's
    session is `2026-09-04` — one distinct value. Neither of those is guaranteed
    by a type, so the join has to answer what a **missing** entry renders as.
  - **The qualifier is on the surface, once, and on a row only when it differs.**
    The result surface names the session beside the cap
    (`Closes as of 4 Sep · showing 10 of 24`); a row whose own `session` is
    **earlier** than that carries its own date. That costs nothing in the uniform
    case measured above and cannot be a lie in the case that ends it.
  - **The number is a close, and the column says so.** Nothing in a result row is
    labelled "price" while the live feed does not exist — that is invariant 6 in
    the small.
  - **The change keeps `PriceChange`'s glyph and sign.** A percentage
    distinguished only by hue differs by 1.04:1 in greyscale.
  - **The equity/ETF distinction is a derived grouping, not a field.** `kind` has
    **three** values — measured 503 `equity`, 11 `sector_etf`, 4 `index_etf` — and
    the distinction a person needs maps two of them onto one word. Rendering `kind`
    verbatim produces `SECTOR ETF` beside `INDEX ETF` as though that difference
    were the point, which it is not.

- **The matched substring** gets whatever treatment the design settled on. The
  accent is unavailable; a background wash on a datum is a colour-on-data
  decision that needed an argument, and if it did not get one, bolding is the
  conventional answer.

  **Amended 2026-09-11 by Task 2.11.2, and this is a measured defect rather than
  a caution: the offset to emphasise must come from the matcher, and a
  `name.indexOf(query)` in the row highlights the wrong characters.** The matcher
  matches at a **word boundary**; `indexOf` finds the first occurrence anywhere.
  Measured over the real universe across 1,718 plausible queries, the two
  disagree on **67** matched rows. Typing `he` matches `HSY` through
  **He**rshey and a naive highlighter bolds the `he` of **T-h-e**; typing `co`
  matches `SYY` through **Co**rporation and a naive highlighter bolds the `co` of
  Sys**co**. Both look deliberate and neither is the reason the row is in the
  list.

  So: **add the offset to `SecurityMatch` in `security-match.ts`** — it is one
  field on a value the matcher already computes — rather than re-deriving the
  word-boundary rule in a component. Re-deriving it is precisely what Task
  2.11.2 exists to prevent, and a second implementation of a rule is the thing
  that drifts. A symbol-tier match emphasises in the symbol; a name-tier match
  emphasises in the name at that offset. There is a test to write either way.

- **Selection is a navigation to `securityPath(symbol)`, and nothing else.** The
  route pattern exists in `ROUTE_PATTERNS`, `securityPath()` is the only thing
  that builds a destination from it, and `use-security-symbol.ts` is the one
  place the segment is read. This click-through adds no third spelling of that
  path.

- **Whether the query goes in the address** is Task 2.11.1's decision;
  implement it exactly, including what the back button does. Nothing here writes
  a parameter that was not needed — `FRONTEND-STATE.md` §3's rule.

- **No new fetch.** If Task 2.11.1 settled on client-side matching, this control
  reads the universe `useSecurities` already fetches on this page. What it does
  while that fetch is in flight is a state, not an afterthought — see 2.11.6,
  which produces every state; this task ships the happy path plus whatever the
  control cannot render without.

- **The live region rate. Restated 2026-09-11 by Task 2.11.1, because the
  either/or above is no longer the instruction and following it literally builds
  the wrong thing.** The rule is not one of two options; it is both halves,
  settled differently, and the distinction is the whole point
  (`SEARCH-AND-SELECTION.md` §4):
  - **The visible result list updates on every keystroke. It is not debounced.**
    There is no request to debounce — matching is a **0.101 ms** synchronous scan
    over data the page already holds (re-measured 2026-09-11 by Task 2.11.2 over
    the real 518 under the shipped rules; §0's 0.295 ms was the naive scan, and
    the rules are cheaper because a symbol prefix answers before the name is
    touched) — and debouncing it would make the list lag behind a person's typing
    for nothing. This is the likely defect: an
    "announcement debounce" implemented one layer too low.
  - **Only the spoken sentence waits, and it waits 400 ms** after the last
    keystroke. One named constant with one reader, not a magic number in a hook.
  - **This IS a third polite region on this page**, and 2.11.1 fired and answered
    §7's reversal trigger rather than leaving it to a layout: it cannot queue
    against the other two, because they speak on arrival and on navigation while
    this one is definitionally silent then. So the count in this file's old
    sentence — "two polite regions" — is now **three**.
  - **The sentence quotes the query**, which is what makes the in-between text
    problem go away: a count can return to where it started, but the query cannot,
    because the query is what the person just changed. The shape is subject first,
    then the quoted query, then the count, then the top match named — because a
    listener about to press Enter needs to know what Enter opens. §4 has the four
    worked sentences.
  - Every sentence names its subject, and a screen reader queues regions in an
    order neither component controls (`FRONTEND-STATE.md` §7).

## Done when

- Typing a symbol or a name produces ranked results, and choosing one opens that
  security at `/securities/:symbol`
- A result row carries its close and change, joined from `lastCloses` by symbol,
  with the session qualified on the surface and on any row that differs — and the
  visible list updates per keystroke while only the announcement waits 400 ms
- Any emphasis on a matched substring is drawn at the matcher's offset, not at
  an `indexOf` — 67 real rows distinguish the two
- Enter with one match opens it; Enter with none does nothing
- The control is a real combobox: roles, `aria-expanded`, active descendant, and
  Escape behaviour
- Components live under `src/components/<Name>/` with stories, so `pnpm stories`
  passes
- Component tests cover: a match by symbol, a match by name, case tolerance,
  Enter with one match navigating, Escape, and that the sentence a live region
  speaks names its subject
- The axe gate reads zero violations
- `pnpm verify` passes

## Notes

Two fences. **Every failure and empty state is 2.11.6's**, deliberately, so that
this task is about the control working and that one is about it being honest —
they are different kinds of work and combining them is how the second half gets
shortened. And **the Security Explorer's layout is 2.11.7's**: this task puts
search where 2.11.1 said it goes and does not rearrange the page around it.

If the field turns out to need something the primitive from 2.11.3 does not
have, change the primitive rather than special-casing it here. It has one
consumer today and three more coming, and the moment to keep it a primitive is
now.

---

## What was done, and what was found — 2026-09-11

**It works: type `nvid`, press Enter, land on `/securities/NVDA`.** The epic's
exit criterion, demonstrated in a browser against the real 518 and the real
stored closes for session `2026-09-04`.

### What shipped

| Where                           | What                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `market/security-match.ts`      | `MatchEmphasis` — `field`, `offset`, `length` — carried on every `SecurityMatch`                                |
| `market/search-announcement.ts` | The four sentences and `SEARCH_ANNOUNCEMENT_DELAY_MS`, with one reader                                          |
| `components/SecuritySearch/`    | The combobox, its result surface, the row, the footer and the live region — plus stories and 23 component tests |
| `routes/SecurityExplorer.tsx`   | The control, in the page's heading block, navigating with `securityPath()`                                      |
| Canvas `03.1 · Security search` | Seven artboards, drawn before the code and corrected to match it afterwards                                     |
| `VISUAL-LANGUAGE.md`            | The combobox's language: the welded surface, the two row states, the emphasis rule, and one recorded divergence |

### Five things found that were not in this file

1. **`field` has to travel with the offset, not just the offset.** This file
   asked for "one field on a value the matcher already computes". One is not
   enough: a row also needs to know _which_ string to index into, and deriving
   that from the tier in the component is the same mistake one level up — it
   puts a matching rule inside a renderer. `MatchEmphasis` carries all three.

2. **Emphasis inside a symbol needs the unmatched part to recede.** The obvious
   implementation advances the match to weight 700, which against a symbol
   already set at `--ink-primary` 600 is invisible at 13px. The tail drops to
   `--ink-secondary` 500 instead. A name is already secondary, so there the mark
   alone works — the two fields need opposite treatments for the same effect.

3. **The React Compiler rules fired for the first time on shipped code, twice,
   and both were right.** `CLAUDE.md` records that they had never fired and that
   this was "evidence nothing has yet written the shape they dislike". The
   announcement hook wrote a ref during render, then cleared the region with a
   `setState` in an effect body; both were rejected. The repair in each case was
   simpler than the thing it replaced — the sentence is derived every render and
   only _saying_ it is deferred. **That paragraph in `CLAUDE.md` is now out of
   date** and is the one thing here that sweeps upward.

4. **The `composes:` trap is real and cost a build.** `.absent .price,
.noChange { composes: … }` is a grouped descendant selector, which fails the
   **build** rather than doing nothing, exactly as documented. Caught by
   `pnpm verify`, not by tests.

5. **The browser suite caught the tab order changing, which is the point of
   it.** `securities-route.spec.ts` asserted the fifth stop was the table's
   `SECTION`; it is now the search `INPUT`. The spec was updated to assert the
   new order **as an assertion rather than an incidental** — a control over both
   surfaces has to precede them, and if search ever moved inside the table's
   `Region` this is what would notice.

### One claim this task falsified, and swept the same day

`BarSeriesPanel`'s defaulted-security sentence read _"Search arrives with Story
2.11; until then, a security's page is reachable at `/securities/SYMBOL`"_.
Search has arrived. The sentence now reads _"Search for another one above, or
open one directly at `/securities/SYMBOL`"_, and the three tests asserting the
old wording were moved onto the surviving half of it.

### What a reader should not conclude from a green run

- **No e2e spec drives the combobox.** The keyboard and screen-reader journey
  end-to-end is [Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)'s
  by design. What the browser suite certifies today is that the field exists, is
  in the tab order in the right place, and that axe reads zero violations on the
  route — not that search works in a browser. That was verified by hand.
- **Every state other than the happy path is still missing**, and is
  [Task 2.11.6](TASK-06-every-search-state-produced.md)'s. The control renders
  only when the universe has loaded; loading, unreachable and answered-badly
  show nothing where the field is.
- **`last-close.ts` now has two consumers and a near-duplicate.**
  `UniverseTable/last-close.ts` and `BarSeriesPanel/series-facts.ts` both export
  `formatPrice`, `changePercent`, `directionOf` and `formatChangePercent`, and
  this component imports the first. That is two implementations of one idea with
  a third consumer attached, and the extraction into `market/` is the obvious
  next move. It was **not** done here because it would touch two components,
  their tests and a story to relocate working code, and this task had a user in
  it. The trigger is the next consumer.
