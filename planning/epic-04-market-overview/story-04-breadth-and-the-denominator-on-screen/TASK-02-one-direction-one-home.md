# Task 4.4.2 — One direction, one home

**Status:** **Complete — 2026-10-07. The check's FIRST DRAFT passed wrongly on the one identifier an author is likeliest to use — `percent` — and BOTH its breaks went red anyway, so a break could never have found it. Widening the return type also exposed TWO SILENT HOLES where a non-finite move would have been spoken as "down".**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** nothing — runs beside 4.4.1

## Objective

**Breadth is counted on the backend and the rule for which bucket a figure falls
into lives in the frontend.** `directionOf` and `PRICE_DIRECTIONS` are in
`apps/frontend/src/market/price-format.ts`, unreachable from a backend producer —
so without this task the classification gets written a second time, and the second
one is the one that drifts.

**This is the `changeFromClose` precedent firing exactly as recorded.**
`price-format.ts`'s own note says `PriceDirection` is _"not in
`@marketpulse/shared` … the direction of a move is arithmetic on a number both
sides already hold"_ — **that sentence expires here**, and the task is to retire
it rather than work around it.

**And the rounding expression already has two homes.**
`Number(percent.toFixed(PERCENT_DISPLAY_DECIMALS))` appears in `directionOf` and
in `displayedPercent`. Breadth would be the third. One helper, one home.

## What the user can see when this lands

**Nothing.** A move with no behaviour change, proved by the suite staying green.
Task 4.4.5 is the payoff.

## Work

- **Move `PRICE_DIRECTIONS`, `PriceDirection` and `directionOf` to
  `packages/shared`**, beside `displayedPercent`, and collapse the duplicated
  rounding into one helper both call.
- **`price-format.ts` re-exports or imports** so no component changes — the
  frontend's public surface is unchanged and `PriceChange` keeps its own spoken
  words.
- **The classification is keyed on the DISPLAYED figure**, not the raw sign, and
  this is the decision to preserve rather than rediscover: a `+0.004%` move prints
  `0.00%`, and an up arrow beside it is _three channels disagreeing with each
  other_ — `price-format.ts`'s own words. A breadth count on the raw sign would
  call that security an advancer while the sector row prints `0.00%`.
- **A non-finite move is not classifiable.** `directionOf(NaN)` returns
  `"unchanged"` today, because `NaN > 0` and `NaN < 0` are both false — so a
  naive breadth count **silently counts non-finite figures as unchanged**.
  `sectorRankingKey` closes exactly this gap in-process and says why; close it
  here, once, rather than in each caller.
- **A check that there is one classifier**, because the existing three cannot see
  a second one: `one-producer-of-the-overview-aggregate` counts join call sites,
  and `one-home-for-the-live-change`'s third clause keys on **a division by a
  close** — a count classifies by **comparison**, so it has no division to match.
  **A check owes a break**, and write the file the next author would write first.

## Done when

1. One module exports the direction vocabulary and one function decides it, with
   no second rounding expression anywhere
2. `directionOf(NaN)`, `directionOf(Infinity)` and `directionOf(-Infinity)` are
   not `"unchanged"` — asserted
3. A check fails when a second classifier is written, proved by writing one
4. `pnpm verify` is green with no component changed

---

## What was done — 2026-10-07

### The shared home

`packages/shared/src/price-direction.ts` — `PRICE_DIRECTIONS`, `PriceDirection`,
`displayedPercent` (moved here from `sector-ranking.ts`) and `directionOf`:

```ts
export function directionOf(percent: number): PriceDirection | undefined {
  if (!Number.isFinite(percent)) return undefined;
  const shownPercent = displayedPercent(percent);
  if (shownPercent > 0) return "positive";
  if (shownPercent < 0) return "negative";
  return "unchanged";
}
```

**`displayedPercent` is now the one `Number(percent.toFixed(PERCENT_DISPLAY_DECIMALS))`
in the workspace** — it had two homes and breadth would have been the third.
`directionOf` and `compareSectorFigures` both call it.

`price-format.ts` re-exports the three names, and **`formatChangePercent` no longer
contains `percent > 0`** — it asks `directionOf`. That rewrite is what lets the new
check need **no exemption list**: there is no legitimate second site to exempt.

### Non-finite returns `undefined`, and that choice found two silent holes

Three options were weighed. A **fourth `PRICE_DIRECTIONS` member** forces every
total `Record<PriceDirection, …>` in `PriceChange` to render a value nothing can
draw. A **throw** blanks the page from a React render path. **`undefined`** is the
only one that is _not a direction_, needs no fourth word, and is the shape breadth
needs — a figure left out of every bucket rather than placed in one. It matches
`sectorRankingKey`'s own absent-key precedent.

**Widening the return type produced 10 type errors and 2 SILENT HOLES.** The ten
were caught by the compiler because `PriceChange.direction` is required and
`exactOptionalPropertyTypes` is on. The two that were not:

```
chart-alternative.ts:403   if (direction === "unchanged") …
series-announcement.ts:288 if (direction === "unchanged") …
```

Both then do `direction === "positive" ? "up" : "down"` — so **`undefined` would
have fallen through and been spoken as "down"**, in two announcement strings.
**That is the one shape where widening a return type is a silent wrong answer**,
and it was found by the widening rather than by any test. Both rewritten to
`direction !== "positive" && direction !== "negative"`.

### The check's first draft passed wrongly, and no break could have found it

The file the next author writes — `apps/backend/src/market-breadth.ts` with
`if (percent > 0) advancing += 1; else if (percent < 0) declining += 1; else unchanged += 1;`

**(a) With the three existing checks and no new one:**

```
$ node scripts/check-invariants.mjs
39 invariants hold.
```

**(b) With the FIRST DRAFT of the new check in place, same file still present:**

```
$ node scripts/check-invariants.mjs
40 invariants hold.
```

**Green on the exact defect it was written to forbid.** The draft's pattern
required **at least one character before the word** —
`/\b[A-Za-z_$][\w$]*(?:percent|change|move)[\w$]*/iu` — so it matched
`changePercent` and `sessionChangePercent` and **missed `percent`**, which is the
one identifier an author is likeliest to use.

**And both of its breaks would have gone red anyway**, because both name a
_property_ rather than a bare `percent`. **So a break could never have found
this.** That is `CLAUDE.md`'s _write the defect somebody ELSE will write_ doing the
thing a break structurally cannot, and the transcript and the cause are recorded in
the check itself.

**(c) After the fix, same file:**

```
  ✗ one-classifier-for-the-direction-of-a-move
    1 shipped file(s) classify a move by comparing it against zero:
      apps/backend/src/market-breadth.ts
1 of 40 invariants failed.
```

**(d) Clause three, proved separately** — the probe rewritten as the author who
_has_ read `price-direction.ts` writes it (`const shown = displayedPercent(...); if (shown > 0) …`),
which clause two cannot see:

```
    1 shipped file(s) round a percentage to the displayed precision and then
    compare it against zero: apps/backend/src/market-breadth.ts
    That is `directionOf` written out with the guard left off.
```

### A corpus finding worth keeping

The corpus originally included `e2e/specs`, and the first red named
`overview-sector-region.spec.ts:294` — a `shown()` helper spelling a figure from
`percent > 0` **under a docblock reading _"written out here rather than imported …
importing it would assert that the application agrees with itself."_**

**A browser spec's job is to restate independently**, so the corpus is the three
shipped source roots. **A second PRODUCER drifts; a second ASSERTION is the
point.**

### Two breaks, one per clause

```
$ pnpm break breadth-counted-on-the-raw-sign
✓ apps/backend/src/market-overview.ts broken → red → restored byte-identical.
  matched: classify a move by comparing it against zero
```

`breadth-rounded-then-counted` targets a file this task had edited, so the harness
would refuse. **Performed by hand with the registry's own substitution and a
checksum either side**, asserting the `find` matched exactly once:

```
BEFORE:   5c258586179053612f685d3808e05c4dd378ad597872945e72d8b7beded770a7
BROKEN:   c627cce15da18a6ac40ae7d2c2b9a6df700c83c103a111b30f5005e0d4f1603f
RESTORED: 5c258586179053612f685d3808e05c4dd378ad597872945e72d8b7beded770a7
```

### No component's output changed — proved over 401,012 values

A throwaway sweep ran the **old** `directionOf` and `formatChangePercent` bodies,
copied verbatim, against the shipped ones: ±200% at 0.001% steps, ±0.0005% at 1e-6
steps, plus `±1e-308`, `±0.004999`, `±0.005`, `0`, `-0`.

```
finite sweep: n=401012  direction diffs=0  format diffs=0
non-finite:
  NaN:       "unchanged" -> undefined
  Infinity:  "positive"  -> undefined
  -Infinity: "negative"  -> undefined
```

**Zero difference on every finite input**, which is every input a surface can reach
— `changePercent` and `changeFromClose` both answer `null` rather than dividing by
a zero close. **Note `Infinity` was already `positive` and `-Infinity` already
`negative`**: only `NaN` was the `"unchanged"` defect, and the other two were
directional-but-unrenderable.

**Two behaviour changes, both unreachable from a surface and both recorded rather
than discovered later**: `formatChangePercent(±Infinity)` loses its sign, and at the
eight fallback sites a `±Infinity` percent would now draw an em dash where it drew
an arrow.

### The eight `?? "unchanged"` fallbacks, and why they stay

The developer asked for a second opinion: eight explicit fallbacks at renderers,
against widening `PriceChange.direction` to accept `undefined`.

**The fallbacks stay.** An explicit `?? "unchanged"` at the call site is **a
decision a reader can see**; widening the prop makes `undefined` representable at
every call site and lets a real one render as _unchanged_ **silently**, which is
the defect this task just closed one layer down. The shared docblock carries the
rule: **a renderer may fall back and a count must never.**

### Gates

```
$ pnpm verify    EXIT 0,  no Unhandled Errors (grepped twice)
40 invariants hold.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
shared 401 (22 files) · backend 990 · frontend 1279 · process 41
$ pnpm e2e       184 passed, 15 skipped (3.1m), EXIT 0
```

**Build ran before typecheck both times** — a cross-package move against a stale
`dist` is the case `--noEmit` reports green on. No characterised flake was drawn;
`securities-route:855` passed at **18.4 s** against its 30 s ceiling.

### Two live claims falsified upward and swept the same day

- `live-change.ts` — _"No formatting, no colour and no direction … `directionOf`
  are the frontend's … and stay there."_
- `PriceChange.tsx` — _"The three directions … are deliberately not in
  `@marketpulse/shared`."_

Both get a dated amendment beside the original rather than a rewrite, and the half
that **still holds** is named explicitly: the colour, the glyph and the spoken word
remain that component's.

## For a stakeholder — a status report, 2026-10-07

**Nothing changed on screen, proved over 401,012 values.** The rule deciding
whether a price move counts as up, down or unchanged moved into the package both
halves of the product share — because the next task counts those buckets on the
server, where the old location was unreachable, and the alternative was writing the
rule a second time.

Three things were found by doing it.

**A move of exactly nothing was being classified as "unchanged" when it was
actually unmeasurable.** A non-finite figure answered _unchanged_ because the
comparisons it fails are the same ones a zero fails. On one row that is a wrong
arrow; in a **count** it is the sentence _"503 unchanged, 0 advancing, 0
declining"_.

**Two places would have started saying "down" about it.** Widening the rule's
return type produced ten compiler errors and two it could not see — both in spoken
announcements, where an unmeasurable move would have been read aloud as a fall.

**And the new guard passed green on the exact file it forbids.** Its first draft
looked for the word inside a longer name and missed the plain one an author is
likeliest to type. Both of its break tests went red regardless, so **the break
could never have caught it** — only writing the offending file first did. That is
now the eighth time in three stories that step has paid for itself.
