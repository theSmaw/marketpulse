# Task 4.4.5 — Breadth on the landing page

**Status:** **Complete — 2026-10-07. Breadth is on the landing page and NOTHING MOVED at 1440 or 1024 — every region byte-identical, the proxy strip byte-identical at all four widths. The frame could not support the drawing, so it gained one field. And N reaches NO LISTENER: the ladder is `aria-hidden`, so a screen reader gets the counts and never the denominator this story exists to show.**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.3 (the drawing) and 4.4.4 (the frame)

## Objective

**The payoff: a reader can answer whether a 2% index move is everything or five
names**, which is `PRODUCT_SPEC.md` §4's first job in one line of screen.

## What the user can see when this lands

**How broad today's move is.** Three counts — advancing, declining, unchanged —
each with its own bar, and below a rule the count the measurement could not see.
A headline figure above them.

**What they still cannot do:** see which names (4.5), or click through (4.6).

## Work

- **A sibling component on `RankedList`'s geometry**, not a third use of it. It
  owes stories under the `pnpm stories` rule.
- **The denominator is split by grain, which is the resolution of the story's own
  contradiction.** The two amendments are right about two different facts: **the
  count** (`503` / `N` / the remainder) is a figure and lives **in the region**;
  **the window and `computedAt`** are the method and belong as a clause in
  `OverviewSourceNote`. The region prints **no instant and no window sentence** —
  the window goes in the row's **label**, because a label is not a sentence.
- **`Not heard from` is never labelled `unobserved`.** It is `503 − N`, drawn as
  a trailing row below a rule, and the word stays out of the tree entirely.
- **The region must not say**: any connection word (`one-home-for-the-feed-words`
  would fire and would deserve to), any feed or venue, any instant, any percentage
  of 503 without N beside it, and **never _the market_ as a denominator** — the
  503 are the S&P 500 by curation, which is narrower, and that is the same
  over-claim `describeSilence` was repaired for.
- **Nothing in the head's `meta` slot, deliberately.** `N of 11 ranked` already
  occupies that slot one region up; `466 of 503 heard from` there would be a second
  `N of M` badge 200 px away at a different denominator over a different set —
  two correct badges that read as one pattern.
- **A memo boundary**, and the derivation memoised on `overview` identity rather
  than on `liveFeed`, which is a new object every tick.
- **Look at the page before running a suite.** `pnpm probe /` at all four widths,
  before and after, and **report the movement** — the rule that replaced Task
  4.1.4's. **The number to beat is 486**: go over it and rows 2 and 3's shared
  ratio takes `Sector performance` and `Movers` with you, which makes the height a
  page-level decision. At 768 and 390 the rows are untied and filling **will** grow
  the page.

## Done when

1. Three counts and the unheard remainder render at 1440/1024/768/390, with the
   remainder below a rule and never labelled with a fourth word
2. `advancing + declining + unchanged` visibly equals N, and no percentage is
   drawn without N beside it
3. Direction survives `grayscale(1)` — asserted by a produced photograph, not by
   reasoning
4. The region's height is identical across its states at each width, measured
5. `pnpm probe` deltas recorded per width; the proxy strip byte-identical in
   position and size; `pnpm e2e` green

## Amended by Task 4.4.4 — 2026-10-07: the frame is ready, the geometry figure in STORY.md is wrong, and four specs now need a line

**`overview.breadth` exists**, required on the producer and tolerated as absent on
the read side. What you render, and the four things that would otherwise cost you a
round trip:

**1. `Market breadth` is 139 px at 390, not the 121 `STORY.md` records.** Measured
2026-10-07 with `pnpm probe /`. **Measure your delta from 139.** At 1440 and 1024 it
is 486, and the drawing fits in 486 **exactly** — 378 px of content against 389
available, with the 11 px of slack in one declared gap — so **nothing moves at those
two widths**. At 768 and 390 the rows are untied and filling **will** grow the page;
that is yours to measure and report.

**2. Four furnished-frame browser specs now send overview frames with NO breadth**,
which is the legitimate _previous image_ state. **Add breadth to them, or your
region draws reserved inside those specs** and you will read it as a defect. They
are the ones that build an `overview` object by hand.

**3. The shut-market member names ONE session and excludes stragglers.** A security
the nightly backfill missed sits outside both the count and `measured`, so
`measured` can legitimately be **less than 503 with the market shut** — and that is
the honest reading rather than a fault. Do not draw it as one.

**4. With an empty store the section reads `measured: 0` beside the date asked
about** — on a Saturday, a Saturday. **This is CI's state on every run**, so it is
the state your browser spec will meet. `measured: 0` is what says we hold nothing;
the date says which day was asked about. **You may choose to draw the sentence
rather than the date in that state** — that is a rendering decision and it is yours.

### And what the frame does NOT carry

**No percentages.** Counts only, by Gate 1 — three independently-rounded
percentages sum to 99 or 101. If you draw a percentage it is derived in **one**
place from `measured`, and it never replaces a count.

**No instant.** `computedAt` is already on the frame and already drawn by
`OverviewSourceNote` under `Computed`. **The region prints no instant** — the
window travels as `windowMinutes` and belongs in the region's **footer**, which is
the Gate 1 resolution of the two documents that read as though they disagreed.

---

## What was done — 2026-10-07

### The component

`BreadthLedger` — a **sibling** on `RankedList`'s geometry, not a third use of it.

```ts
export interface BreadthLedgerProps {
  readonly view: MarketBreadth;
}
export const BreadthLedger: memo;
export const BreadthLedgerReservation: memo;
```

`MarketBreadth` is `{ rows (3, fixed vocabulary order), measured, tracked, unheard,
net, setHeading, unheardLabel, claim }`. **The band's ink is keyed on `bucket`,
never on a `PriceDirection`** — so there is no second direction table. One
`PriceChange` for the headline; **no glyph anywhere in the ledger**; no motion, no
mark slot, no transition; the unheard row draws **no band**; **zero new tokens**.

### The frame could not support the drawing, so it gained one field

**The remainder is `tracked − measured`, and nothing on 4.4.4's frame carried the
set size.** `equityTickers()` lives only in the backend. The alternatives were to
**type `503` in the browser** — which `STORY.md` forbids in as many words, _one
delisting makes a hard-coded figure a lie with no symptom_ — or to drop done-when 1.

So `WireBreadthCounts.tracked`: **required on the producer, `finite`-checked on the
read side, with a second cross-field check** (`measured > tracked` refuses the whole
section). A gateway from the already-merged 4.4.4 image sends no `tracked`, so
`readBreadth` drops the section and the region draws its _this gateway does not send
breadth_ sentence — **a state it already had.**

**This is 4.4.4's frame being amended by 4.4.5**, and it is recorded as such rather
than folded in silently.

### The probe — nothing moved where it was paid for

| width | `Market breadth`  | delta    | everything else                                                     |
| ----- | ----------------- | -------- | ------------------------------------------------------------------- |
| 1440  | 486 → **486**     | **0**    | **nothing moved** — every region byte-identical; `main` 1646 → 1646 |
| 1024  | 486 → **486**     | **0**    | **nothing moved**; `main` 1646 → 1646                               |
| 768   | 103 → **475**     | **+372** | everything below shifts; `main` 1624 → 1996                         |
| 390   | **139** → **475** | **+336** | everything below shifts; `main` 1884 → 2220                         |

**Exactly the drawing's §13 prediction** — 475, +372, +336 — and measured from
**139**, not the 121 `STORY.md` still records.

**The proxy strip is byte-identical in position and size at all four widths**,
diffed element by element through `strip`, `cell`, `term`, `valueRow`, `markSlot`
and `qualifier`. The only moved boxes in the entire diff are `RankedList`'s eleven
mark slots at 768/390, **which moved because the sector region moved down**, not
because anything inside it changed.

**Resolved tracks — §04's table confirmed rather than argued:**

```
1440  plot 308×378  grid 80 31 173
1024  plot 323×378  grid 80 31 188
768   plot 686×378  grid 80 31 551
390   plot 308×378  grid 80 31 173
```

`80 + 31 + 2×12 = 135` before the band at every width; body **378 px** against the
389 ceiling — **the budget to the pixel.** Owed measurements 2, 3 and 5 from the
drawing's §14 are discharged.

**One honest correction to the drawing**: the 11 px of slack does **not** land in
the declared gap at 1440/1024. `Panel.body` has no `flex: 1`, so the body is
content-height and the 11 px sits at the **foot of the panel** — region 486 @557,
plot 637–1015, bottom 1043, so `16 + 1 + 11`. The `minmax(--space-16, 1fr)` gap row
is in the stylesheet and floors at 16 everywhere, so it degrades correctly if the
body ever stretches. **`Panel` was not changed for 11 px.**

### Greyscale — produced, and looked at

`breadth-greyscale-1440.png`, from `market-breadthledger--in-greyscale`.

**The three bands are one grey, as the drawing predicted, and nothing is lost.**
Direction is carried by **the word in 80 px of fixed track** — `Advancing` /
`Declining` / `Unchanged` — and on the headline by `▲` and the `+` on `+132`: three
channels, all `PriceChange`'s.

A second photograph discharges §14 item 4 — the 2 px band floor against the 1 px
origin rule, at 390: `Unchanged 1` draws a short stub **in front of** the rule, told
apart by being 6 px tall against the rule's full row height and in a price ink
against the rule's neutral. **It reads as a band, not as a gridline.**

### N reaches no listener — and it is this story's own thesis failing

**The denominator is printed once, as the ladder's right endpoint, and the ladder is
`aria-hidden`** — `RankedList`'s decision at its own ladder, inherited correctly.

**So a screen reader gets the three counts, the set heading and the remainder, and
never the denominator.** This story exists to put a denominator on screen; for a
listener it is not on screen, and the counts arrive with nothing to measure them
against — the exact shape `EPIC.md` was written to prevent, arriving by the one
route nobody checked.

**It is not a defect in any file**: the ladder is correctly hidden, the counts are
correctly labelled, nothing is missing from the DOM. It is a fact about what a
listener is handed, **which is why a story close would not sweep it** — and it is
written into Task 4.4.6's file, whose grammar is the only delivery of the
denominator to that audience.

### The boundary with 4.4.6

**In, because the region cannot render without them**: both grammars at a realistic
length, four strings with one home each, and **neither basis can render the
other's**. `Not heard from` is **false about a closed market**, and CI plus ~80% of
the week are on the `session` basis — so shipping only the live grammar would have
been **a hole rather than a deferral**.

**Also in, because ADR 0029 is not negotiable**: the **N = 0 suppression**. Without
it CI draws `Advancing 0 / Declining 0 / Unchanged 0` against a 0–0 scale — a
fully-formed partition over zero observations. The ledger, ladder and headline give
up their content and **keep their room**.

**Out, 4.4.6's**: the designed wording of all four strings, the re-measure of N over
the 503, the `useWaited` silence sentence, the sentence belonging in the room the
suppression holds, the N = 1 percentage rule, and the full look-alike grid.
**Out, 4.4.7's**: the DOM reorder — **this region adds no focusable control**, so
that task's scope does not grow.

**No check added, so no break is owed.** `breadth-is-counted-over-the-equities-alone`
already holds the set, `one-producer-of-the-overview-aggregate` is not widened, and
the headline is a subtraction of two rendered counts **in the component that renders
them** — not a field and not a second call.

### Gates

```
$ pnpm verify    exit 0, no Unhandled Errors
40 components, 40 stories files.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
41 invariants hold.
shared 408 · backend 1010 (49) · frontend 1311 (84) · process 41
```

**`pnpm e2e` — 182 passed, 15 skipped, 7 failed (6.3m), and the mechanism is given
rather than an attribution.** Every failure is `Test timeout of 30000ms exceeded`
on the 518-row `/securities` surface. Re-run scoped: **all seven passed** (21.5 s,
21.0 s, 15.3 s …) **and a different test timed out instead**, which then passed
alone in **7.9 s**. That is the documented signature verbatim — heaviest specs, a
30 s ceiling on a loaded machine, **membership changing run to run**. **All 22
overview and landing tests passed inside the full run.**

**An earlier run reported 98 failures and was an environment fault, not a
finding**: `pnpm verify`'s build raced the dev loop, the backend's `tsc --watch`
died and `node --watch` never rebound — `pnpm ready` said _the backend is not
listening_ and `lsof` showed nothing on :3000. **It is the trap `CLAUDE.md`
describes** and it cost a 7.9-minute run.

`pnpm test:database` not run — `market-breadth.ts` is pure arithmetic over values
handed in. Scoped: `overview-breadth-region.spec.ts` 5/5 in 7.2 s; the four
furnished specs plus `landing-route` 17/17 in 10.8 s.

## For a stakeholder — a status report, 2026-10-07

**The landing page now says how broad the market's move is.** Three counts —
advancing, declining, unchanged — each with a bar, and below a rule the number of
companies the feed could not reach. A headline figure above them.

**Nothing moved on the two widest screens**, which is what the last four tasks were
buying: every region is byte-identical in position and size, and the prices at the
top of the page did not shift by a pixel. On a phone the page grows, which was
expected and is measured.

Two things worth knowing.

**The data the server was sending could not support the drawing.** The region needs
to say _of 503 companies_, and nothing on the wire carried that number — the
alternative was typing `503` into the browser, which this story forbids by name,
because one delisting would make it a lie nothing would catch. So the server now
sends it, with a check that refuses the whole section if the two numbers contradict
each other.

**And the denominator does not reach a screen reader.** It is printed once, as the
label at the end of the bar scale, and that scale is hidden from assistive
technology — correctly, because it is decoration for everyone else. So a listener
gets three counts and nothing to measure them against, which is precisely the
failure this story was written to prevent, arriving by the one route nobody thought
to check. The next task's sentence is the only thing that delivers it to that
audience, which makes its wording load-bearing rather than a tidy-up.
