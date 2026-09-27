# Task 4.3.7 — The honest states, and the guard against the defect where every number is right

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.6

## Objective

**Two things, and the second is the sharpest risk in this story.**

**The honest states.** A sector we have not heard from has **no ranking key at
all** — and ranking it as `0.00%` would report a sector as unmoved when we simply
have not heard, which is ADR 0029's false impression **as a rank position**, a
shape of it this product has not met before. On CI that is all eleven, for ever.

**The permutation.** The frame carries `symbol`; the screen shows `Technology`.
**A one-key error in the ticker → sector map puts XLV's figure on the Financials
row** — and it compiles, lints, renders, satisfies `one-home-for-the-live-change`,
sums correctly, appears in no state grid and survives greyscale. **It is the one
defect class where every individual number is correct.** The owner's whole
argument for the ETF row is that it is checkable by eye against a public quote,
and that only holds if the reader can see **which fund** the row is.

## What the user can see when this lands

**An honest answer for a sector the feed has not mentioned** — its last known
figure with the session it belongs to, in a trailing group with a heading,
**not** ranked and **not** reading as flat. And on a store with nothing in it,
eleven named sectors and one sentence rather than a ranking of nothing.

## Work

- **The trailing group.** Ranked rows carry `1…N`; rows without a rankable figure
  sit **below** them in declared order, with no rank and with their own state
  word. It is a **separate list with its own micro heading, not the tail of the
  `<ol>`** — positions 10 and 11 of an ordered list would be a false claim made
  by markup rather than by prose.
- **So the all-unknown state has no `<ol>` at all**, which is what makes CI's
  permanent state coherent rather than a ranking of nothing. The eleven rows
  **still render** — the set is known from the universe and does not depend on any
  observation, which is the sharpest difference from a mover list.
- **`N of 11 ranked`** in the panel's `meta`, **only when `N < 11`** — a permanent
  `11 of 11` is noise — in reserved room so it costs no height, and not in the
  feed's vocabulary.
- **Words reused, not invented**: `Live price from 12:07` for a quiet row (an age,
  never a verdict — §11.2 measured an ordinary maximum gap of **187 minutes** and
  refused a threshold with that measurement), `None stored` for nothing held, and
  the `No … yet` shape for no frame. **Nothing is added to say a thing is absent**
  — no ghost row, no count of hidden things.
- **The permutation guard**: `one-home-for-the-sector-benchmark-map` — the ticker
  → sector direction is derived from `SECTOR_ETFS` in exactly one module, and no
  shipped file outside it pairs a sector ETF ticker with a sector or a label. A
  **producer walk** over the eleven ticker literals, with each permitted file
  required to still contain the derivation — the anchor clause, because a grep
  that matches nothing looks exactly like a grep that passes.
- **And the comparator's home**: no shipped file both imports the figure type and
  calls `.sort(`/`.toSorted(` outside the one comparator module.
- **Write the offending file first.** The near-certain wrongly-green version of
  the permutation guard is one keyed on the **word** `SECTOR_ETFS` rather than on
  the **ticker literals** — which a hand-written inverse never mentions. Write the
  second literal, run the check, confirm it passes wrongly, then fix it. Four
  consecutive tasks in Story 4.2 shipped a guard green on the exact defect it
  forbade, and every one of them had a break that went red.
- **Each guard owes a break**, and the pairing assertion must use **a distinct
  figure per symbol** — a shared value passes against any permutation.

## Done when

1. Three absence states are **produced** rather than imagined, each rendering
   words that already exist, and none of them occupying a rank position
2. No state renders `0.00%` where the truth is _we have not heard_
3. Eleven rows render on a store with zero bars, with no `<ol>` and one sentence
4. A hand-written second ticker→sector literal fails `pnpm invariants`, proved by
   a break that went red **after** being shown to pass wrongly
5. The label↔ticker↔figure triple is asserted with eleven distinguishable figures
