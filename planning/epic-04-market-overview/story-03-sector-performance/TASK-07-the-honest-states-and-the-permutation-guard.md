# Task 4.3.7 — The honest states, and the guard against the defect where every number is right

**Status:** **Complete — 2026-09-28. Two checks were REFUSED rather than written — one a strict duplicate, one red against correct code — and the permutation is caught by a test instead. `2026-09-25 close` was being ellipsised at three widths of four with every test green. The region is 486, not 461: the quiet group's heading has to be reserved in every state and there was no slack to absorb it.**
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

## Amended by Task 4.3.5 — 2026-09-27: the minimum shipped, and exactly what is left for you

**The region could not render at all without something in the figure column for a
keyless row, and CI's entire state is keyless** — 518 securities, zero bars, so all
eleven are `unknown` there for ever. So 4.3.5 shipped the minimum rather than
leaving a hole, and drew the boundary explicitly.

**Shipped, and produced in ONE place (`market/sector-performance.ts`) — review the
wording, do not re-home it:**

- an **em-dash rank** for a keyless row;
- **`2026-09-25 close`** for a stored figure with no prior close — the proxy
  strip's own spelling, reused rather than invented;
- **`None stored`** for `unknown` — the proxy strip's words;
- **`No stored close`** for an observed price with no basis. **This is the one
  genuinely new string in the region** and it is the one to read hardest: it
  describes a state where a price arrived and the thing to measure it against did
  not, which no other surface in this product has had to say.

**Still yours, in full:**

1. **The trailing quiet group** with its `--rule-control` divider — keyless rows
   below the rule in symbol order, **bar cell empty rather than zero-length**
   (a zero-length bar is a claim of no movement; an absent bar is not), and the
   em-dash rank. `The ranked list.dc.html` §05 state 3.
2. **The first-paint state** — `visibility: hidden`, the shipped `FirstPaint`
   idiom. §05 state 6.
3. **The wording review of all three absence strings above.**
4. **The permutation guard**, which is the defect class where **every number is
   right**: the frame carries `symbol` and the screen shows `Technology`, so one
   wrong key in the inverse map puts XLV's figure on the Financials row —
   invisible to every guard, every test and every greyscale pass. The ticker is on
   the row for this reason. Note `one-pairing-of-a-sector-and-its-benchmark`
   already forbids a **second** pairing table; what it cannot see is the map being
   read correctly and **applied** to the wrong row.

**And the height is settled, so your states must not move it.** The region is
**461 px at 1440/1024/768 and 437 at 390**, measured, with the footer reserving two
lines at every width precisely so the rung's own width cannot change it. Done-when
4 of 4.3.5 is already asserted in `overview-sector-region.spec.ts` — _the region is
the same height with eleven figures and with none_ — so **that test is what tells
you if a state you add breaks it.**

---

## What was done — 2026-09-28

### Two checks refused, and that is the finding

**Done-when 4 was already satisfied, and adding the invariant it asks for would
have been a strict duplicate.** Task 4.3.4's
`one-pairing-of-a-sector-and-its-benchmark` **is** the producer walk this task
specifies: it derives the eleven tickers from `SECTOR_ETFS`' own literal, carries
the anchor clause, and scans **words** on comment-stripped text — so bare
identifier keys are caught, which is the form its own first version missed.

**Proved rather than read.** The file a re-implementer of _this_ task would write —
`components/RankedList/sector-label.ts`, `Record<string,string>` with eleven **bare
keys and not one string literal**:

```
✗ one-pairing-of-a-sector-and-its-benchmark
  1 shipped file(s) name more than one sector benchmark ticker:
    apps/frontend/src/components/RankedList/sector-label.ts (XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY)
1 of 38 invariants failed.
```

Story 4.2 left a strict duplicate behind and its disposition is still open; a
second one was not added.

**And the comparator guard was refused, because as worded it is RED AGAINST CORRECT
CODE.** The clause — _no shipped file both imports the figure type and calls
`.sort(` outside the comparator module_ — fires on `sector-performance.ts` today,
which imports `WireOverviewFigure` and calls `held.sort(…)`: **Task 4.3.6's hold,
which sorts by a reader's pinned position and reads no figure.** Both ways of
making it green fail this repository's own rules — **exempting that file by name
exempts the likeliest site of the defect**, and a window-match on the comparator
body is the shape that rots into matching nothing. A file-level clause also flags
`UniverseTable.tsx`, where `changePercent` is an imported **function** rather than
the wire field.

**A check that is red against correct code is worse than no check**, so it is a
`docs/GAPS.md` entry with a re-measure and an owner condition — **the first story
that ranks anything server-side other than the eleven**, which is Story 4.5.

### The permutation is caught by a TEST, and the old spec passed against it

`one-pairing-…` forbids a second pairing **table**. It structurally **cannot see
the map being read correctly and APPLIED to the wrong row** — a correct
`SECTOR_ETFS`, a correct derived inverse, and a render putting the right label
beside the wrong figure.

**The defect injected**: rows 5 and 6 exchange figures, labels and tickers
untouched. **The spec Task 4.3.5 shipped, against it:**

```
  ✓  1 … takes the height eleven rows need, and does not scroll them (1.3s)
  ✓  2 … the same height with eleven figures and with none (1.9s)
  ✓  3 … drawn in the order the frame sent, each with a rank and a ticker (1.0s)
  3 passed (4.8s)
```

**The new assertion, same defect** — an assertion failure with the other five
still collecting and passing:

```
  ✘  4 … each with its OWN label, ticker and figure (1.1s)
    Expected substring: "+0.31%"
    Received string:    "5\nFinancials\nXLF\n▲\nup\n+0.12%"
  6 tests: 5 passed, 1 failed
```

`sector-performance.ts` restored byte-identical — `md5
014f8e06a02598e409066d9fd55beb7d` either side.

**Done-when 5's shape**: `expect(new Set(figures).size).toBe(11)` **first** — a
shared value passes against any permutation — then per row the ordinal, the full
label, the ticker, the figure, **and that the row contains no other row's
figure**, which is the clause that catches a two-row swap. **The formatter is
written out in the spec rather than imported**: importing it would assert that the
application agrees with itself.

The eleven distinct figures: `+1.84, +0.96, +0.63, +0.41, +0.31, +0.12, 0.00,
−0.18, −0.44, −0.87, −1.27` — distinct at the two decimals the screen prints.

**Two breaks kept, because they prove different halves.**
`two-sectors-swap-their-benchmarks` transposes `health_care`/`financials` in
`SECTOR_ETFS` and produced `5 / Health Care / XLF / ▲ up / +0.31%` — **rank, ticker
and figure all correct, the word wrong** — and was run by the harness on a clean
file:

```
✓ packages/shared/src/security.ts broken → red → restored byte-identical.
  matched: OWN label, ticker and figure
```

That one **also** goes red against the 4.3.5 spec, so it does not prove the figure
clause. `a-figure-lands-on-the-wrong-row` does.

### The honest states, produced

| frame state                         | renders            | rank                           |
| ----------------------------------- | ------------------ | ------------------------------ |
| `unknown`                           | `None stored`      | none; the row is in the `<ul>` |
| `observed`, no `changePercent`      | `No stored close`  | none                           |
| `stored`, no `sessionChangePercent` | `2026-09-25 close` | none                           |

**None occupies a rank position, asserted three ways**: `rank === undefined` for
all three, **no digit anywhere on a quiet row**, and no `%` anywhere in the quiet
group.

**The trailing group is a separate `<ul>` with its own `<h3>`, not the tail of the
`<ol>`** — positions 10 and 11 of an ordered list would be **a false claim made by
markup rather than by prose**, and a screen reader would announce a rank the
product is refusing to assert. **So the all-unknown state has no `<ol>` at all**,
which is what makes CI's permanent state coherent rather than a ranking of nothing.
The eleven rows still render: **the set is known from the universe and depends on
no observation**, the sharpest difference from a movers list.

### `2026-09-25 close` was being ellipsised, and only the picture said so

It measures **82 px against the figure column's fixed 78**, and rendered as
**`2026-09-25 cl…`** at 1440, 1024 **and** 768 — fitting only at 390, where that
column takes the row's slack. **Every test was green.**

> **CORRECTED 2026-10-07 by Task 4.3.8's state grid — the repair's reach is the
> INVERSE of what this record claims.** Photographed at all four widths: the
> sentence renders **in full at 1440, 1024 and 768, and is clipped at 390**. The
> mechanism is the repair's own shape — `grid-column: 4 / -1` spans the quiet
> row's figure cell into the **bar column**, and **at 390 there is no bar column**
> (`2ch 144px 44px minmax(68px, 1fr)`), so `4 / -1` resolves to **column 4
> alone**. The repair buys nothing precisely where the column is narrowest.
>
> The sentence above describes the state **before** the repair and reads as a
> description of the state after it. **Accepted by the owner rather than
> repaired** — the date survives and the date is the information — with the
> alternatives in `docs/GAPS.md`. Found by **photographing** the state, which is
> the only instrument that can see a CSS clip over a complete DOM.

The repair uses room that already exists rather than widening a column all eleven
rows pay for: **a quiet row has no bar by construction**, so its figure cell spans
to the end of the row and the words are **left-aligned** — flush right would park
them 1,040 px from the ticker they belong to. **A reserved column sized for a
figure is not sized for a sentence**, and the absence strings are sentences.

### 461 → 486, and there was no slack to absorb it

The quiet group's heading must be **reserved in every state** — `8 padding + 16
micro line + 1 rule` = **25 px** — because without it the region is **461 with
eleven figures and 486 with none**, and `overview-sector-region.spec.ts` asserts it
is _the same height with eleven figures and with none_.

**Measured rather than assumed: 461 was `min-content`, not a share of the `1fr`.**
So the choice was **one height always at +25 px** against **two heights and a 25 px
step the first time a sector goes quiet mid-session** — the movement this story
spent three tasks designing out, and one that would be **invisible in every test
and every screenshot until it happened live**. **The owner took the reserve.**

Shipped: **486 / 486 / 486 / 462**. `Movers`, `Market breadth` and `Current
investigations` moved with it at 1440 and 1024, being tied to the same rows —
**their stories' files were swept the same day and now say 486.**

### Two further ADR 0029 consequences, taken rather than noticed

**No printed ladder and no axis where no bar was drawn**, and **the scale clause
hidden** in the footer with its room kept so the wrap cannot change. A ladder over
nothing is a scale for a comparison the screen is not making.

**And the head's count reads `N of 11 ranked` only when `0 < N < 11`.** A permanent
`11 of 11` is noise. It shares **one slot** with `ORDER HELD`, mutually exclusive,
in the 100 px reserve Task 4.3.6 had to measure after its own badge moved all
eleven rows 4 px.

**First paint** now holds the full region with eleven named sectors in reserved
room rather than showing the hatched `awaiting` panel for a few hundred
milliseconds — **removing a ~316 px jump at 390 on every load**. The owner
confirmed it; the proxy strip took the same trade in Story 4.2, and naming the
eleven is honest rather than speculative because the set does not depend on an
observation.

**`Not ranked`** is the only new drawn word, confirmed by the owner: it mirrors the
head's own vocabulary and says what is true of the group **without implying why** —
the rows carry the reason.

### Gates

```
$ pnpm verify    EXIT=0
39 components, 39 stories files.
479 documents, 1661 cross-file links, 39 anchor links, 0 broken.
38 invariants hold.
packages/shared 385 · apps/backend 990 · apps/frontend 1282 · process 41
```

`Unhandled Errors` grep: **0**.

**`pnpm e2e` — three full runs, all three reported:**

1. `1 failed / 179 passed` — **this task's own regression**:
   `overview-sector-order.spec.ts` located the head slot by the **count text**,
   which is now deliberately absent with all eleven ranked. Repaired to measure the
   region's **name**, which is what a growing slot would actually push.
2. `1 failed / 179 passed` — `securities-route.spec.ts:855`, **timeout of
   30000 ms**, in a spec that renders no sector code at all. Scoped
   `--repeat-each=6`: **6 passed at 19.8 / 19.9 / 19.9 / 20.0 / 11.3 / 11.6 s**.
   **A test at two-thirds of its own timeout, not a regression** — recorded in
   `docs/GAPS.md` as a second flake source with a different mechanism.
3. Final tree: **180 passed, 15 skipped, 0 failed (4.6m).**

`pnpm test:database` not run — no data-layer file touched.

## For a stakeholder — a status report, 2026-09-28

**The sector region is now honest about what it does not know.** A sector the feed
has not mentioned sits below the ranked ones under a `Not ranked` heading, with its
last known figure and the session it belongs to — **not ranked, and not reading as
flat**. On a machine with no market data stored, all eleven still appear by name
with one sentence, because the list of sectors is known from our own universe and
does not depend on the market saying anything.

**The most valuable thing here is two checks that were not written.** One would
have duplicated a check added three tasks earlier — proved by writing the offending
file and watching the existing one catch it. The other, as specified, **would have
failed against correct code**, because a feature added last task legitimately does
the thing the check forbids. A check that goes red on correct code is worse than no
check: it gets weakened, and a weakened check is one nobody trusts. It is recorded
as a known gap with a named condition for when it becomes writable.

The defect it was meant to catch — **the right sector name beside the wrong
sector's figure**, where every individual number on screen is correct — is caught
by a test instead, and that test was proved by deliberately introducing the fault
and confirming the previous task's tests **all passed against it**.

Two things were found by looking rather than by testing. **One of the region's own
sentences was being cut off** at three of the four screen widths with every test
green. And the region grew 25 pixels, which was checked rather than accepted: there
was no spare room to absorb the new heading, so the choice was a slightly taller
region always, or one that jumps the first time a sector goes quiet during a
trading day. The jump would have been invisible until it happened in front of
someone.
