# Task 2.11.4 — Search on screen: the combobox, and opening a security

**Status:** Not started
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

- **The matched substring** gets whatever treatment the design settled on. The
  accent is unavailable; a background wash on a datum is a colour-on-data
  decision that needed an argument, and if it did not get one, bolding is the
  conventional answer.

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

- **The live region rate.** Implement 2.11.1's rule: either the settled debounce
  interval, or silence while typing and one sentence when results settle. Every
  sentence names its subject, because this page already has two polite regions
  and a screen reader queues them in an order neither component controls
  (`FRONTEND-STATE.md` §7). And a live region whose text does not change
  announces nothing — if the result count returns to where it started, there has
  to be a distinct in-between text or the announcement is silent.

## Done when

- Typing a symbol or a name produces ranked results, and choosing one opens that
  security at `/securities/:symbol`
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
